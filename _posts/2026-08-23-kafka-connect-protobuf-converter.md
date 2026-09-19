---
layout: post
title: "Protobuf in Kafka Connect: Building a Converter for Apicurio Registry"
date: 2026-08-24 12:00:00
author: kartikangiras
categories: registry kafka-connect protobuf converter serdes
---

If you run Debezium or any other Kafka Connect pipeline on Protobuf, you have had to make a choice: give up on Protobuf and fall back to Avro, or give up on Apicurio Registry's native API and route Confluent's converter through the compatibility endpoint. Apicurio Registry shipped Connect converters for Avro and JSON Schema, but never one for Protobuf. `ProtobufConverter` closes that gap, with a data-model bridge built to round-trip Connect schemas without losing type information.

---

# The Problem

Kafka Connect converters translate between Connect's internal data model (a `Schema` plus a `Struct`) and the bytes on a Kafka topic. Apicurio Registry's `utils/converter` module had two:

| Format | Converter | Status before |
|---|---|:---:|
| Avro | `io.apicurio.registry.utils.converter.AvroConverter` | Available |
| JSON Schema | `io.apicurio.registry.utils.converter.ExtJsonConverter` | Available |
| Protobuf | — | Missing |

The Protobuf SerDes existed and worked. `ProtobufKafkaSerializer` already resolved schemas through the registry, wrote the schema coordinates into the payload, and added the `Headers`-based message-type metadata. What was missing was the layer above: something that turns a Connect `Struct` into a `com.google.protobuf.Message`, and back again without losing anything.

The request was filed as [#3061](https://github.com/Apicurio/apicurio-registry/issues/3061) in December 2022. The answer at the time was to use the compatibility API with Confluent's converter, which works but means pulling a third-party jar onto your workers and talking to Apicurio through a compatibility shim rather than its own API.

# What Landed

[PR #9218](https://github.com/Apicurio/apicurio-registry/pull/9218) adds `ProtobufConverter` to the `utils/converter` module. It ships in 3.3.2.

```
encode:  Connect Struct + Schema ──► ProtobufData ──► DynamicMessage ──► ProtobufKafkaSerializer ──► bytes
decode:  bytes ──► ProtobufKafkaDeserializer ──► Message ──► ProtobufData ──► Connect Struct + Schema
```

Schema registration and lookup happen in the SerDes layer, which already knew how to talk to the registry. `ProtobufData` is the new part.

The converter class is 57 lines, and only two of them do anything Protobuf-specific: Connect to `Message` on the way out, `Message` back to Connect on the way in.

```java
@Override
protected T applySchema(Schema schema, Object value) {
    return (T) protobufData.fromConnectData(schema, value);
}

@Override
protected SchemaAndValue toSchemaAndValue(T result) {
    return protobufData.toConnectData(result);
}
```

The rest is the class declaration, two methods returning `ProtobufKafkaSerializer.class` and `ProtobufKafkaDeserializer.class`, and a `configure()` that seeds those two as defaults before delegating upward. `SerdeBasedConverter`, which `AvroConverter` and `ExtJsonConverter` also extend, handles everything else:

- instantiating the serializer and deserializer (or accepting pre-built ones via `apicurio.registry.converter.serializer` / `.deserializer`),
- sharing one `SchemaResolver` between the serializer and the deserializer, so a single converter instance keeps one schema cache rather than two,
- returning `SchemaAndValue.NULL` for null payloads so Kafka tombstones don't blow up,
- closing whatever it created.

# How It Works

Connect's type system and proto3's are close enough to look interchangeable and different enough to lose data quietly. Six mismatches had to be resolved:

| Connect | proto3 | Problem |
|---|---|---|
| `INT8` / `INT16` | nearest is `int32` | the declared width is gone on the way back |
| optional scalar | no field presence by default | `null` decodes as `0` / `""` / `false` / empty bytes |
| field name `user-id`, `event.type` | identifiers are `[A-Za-z_][A-Za-z0-9_]*` | names must be sanitised, and sanitising is lossy |
| `array<array<T>>` | `repeated` cannot nest | not directly expressible |
| `map<string, array<T>>` | a map value cannot be `repeated` | not directly expressible |
| `map<string, map<K,V>>` | not expressible at all | must be rejected |

Each of the first four is solved; the last two are rejected loudly.

## Narrow integers

`INT8` and `INT16` both encode as `int32` on the wire, and there is no alternative in proto3. But the declared type is still recoverable, because a `FieldDescriptorProto` carries a `json_name` option that nothing else in this pipeline uses. The encoder stamps a prefix onto it:

```java
static final String JSON_NAME_INT8_PREFIX = "__int8:";
static final String JSON_NAME_INT16_PREFIX = "__int16:";
```

and the decoder reads it back:

```java
case INT:
    String jsonName = field.toProto().getJsonName();
    if (jsonName.startsWith(JSON_NAME_INT8_PREFIX)) {
        return Schema.INT8_SCHEMA;
    }
    if (jsonName.startsWith(JSON_NAME_INT16_PREFIX)) {
        return Schema.INT16_SCHEMA;
    }
    return Schema.INT32_SCHEMA;
```

The decoded value is narrowed to match. Neither the wire encoding nor the proto field name changes, so a consumer outside this converter reads an ordinary `int32`.

## `null` versus the proto3 default

Without explicit presence, proto3 cannot distinguish "field absent" from "field set to zero". In a CDC pipeline, `NULL` and `0` are different rows.

The fix is `proto3_optional`, applied whenever the Connect field is optional:

```java
field.setLabel(DescriptorProtos.FieldDescriptorProto.Label.LABEL_OPTIONAL);
if (schema.isOptional()) {
    field.setProto3Optional(true);
}
```

and honoured on decode, where an unset optional field is skipped rather than read as its type default:

```java
if (!protoField.isRepeated() && protoField.toProto().getProto3Optional()) {
    if (!message.hasField(protoField)) {
        continue;
    }
}
```

## Field names Protobuf will not accept

Connect field names are free-form strings, and Debezium emits names like `user-id` and `event.type` regularly. Protobuf identifiers cannot contain `-` or `.`.

Sanitising replaces every non-`[A-Za-z0-9_]` character with `_`, which gets a valid descriptor but is lossy: `user-id` and `user.id` both become `user_id`. So the raw name rides along in `json_name` under its own prefix, `__raw:`. Prefixes compose, giving four cases:

| `json_name` | Meaning |
|---|---|
| *(not set)* | regular field, name unchanged |
| `__raw:user-id` | regular field, name was sanitised |
| `__int8:user_id` | `INT8` field, name unchanged |
| `__int8:__raw:count-val` | `INT8` field, and name was sanitised |

Decoding strips the type prefix first, then the raw prefix, and falls back to the proto field name when neither is present:

```java
private String extractConnectFieldName(Descriptors.FieldDescriptor protoField) {
    String jsonName = protoField.toProto().getJsonName();
    if (jsonName.startsWith(JSON_NAME_INT8_PREFIX)) {
        jsonName = jsonName.substring(JSON_NAME_INT8_PREFIX.length());
    } else if (jsonName.startsWith(JSON_NAME_INT16_PREFIX)) {
        jsonName = jsonName.substring(JSON_NAME_INT16_PREFIX.length());
    }
    if (jsonName.startsWith(JSON_NAME_RAW_PREFIX)) {
        return jsonName.substring(JSON_NAME_RAW_PREFIX.length());
    }
    return protoField.getName();
}
```

After a round trip, `resultStruct.get("user-id")` works.

## Nested collections

`repeated repeated string` is not a thing in Protobuf, and neither is a `repeated` map value. Both shapes are common in Connect: a matrix field, or `map<string, array<string>>` for tags-by-group.

The encoder synthesises a wrapper message with exactly one repeated field named `items`, so `array<array<string>>` becomes a `repeated Wrapper` where each `Wrapper` holds `repeated string items = 1`. The decoder recognises a wrapper by that signature and unwraps it transparently, so `map<string, array<string>>` decodes back as a `MAP` whose value schema is an `ARRAY`, not as `struct{items:[...]}`.

Wrapper names are tracked separately from struct names. Struct messages are deduped by Connect `Schema` so two fields sharing a schema produce one proto message; wrapper names only need to be unique. Mixing the two would let a sibling struct field resolve to a wrapper message instead of its own type, which is exactly what one of the regression tests pins down.

## What gets rejected

Two shapes are not supported, and the converter says so at descriptor-build time rather than producing something that silently fails to round-trip:

```java
private static final String NESTED_MAP_UNSUPPORTED =
        "Nested map-in-collection is not supported. Wrap the inner map in a struct field.";
```

That covers both `map<string, map<K,V>>` and `array<map<K,V>>`. Non-string map keys are rejected separately, with `Only string map keys are supported by the Protobuf converter`.

## Descriptor caching

Connect calls `fromConnectData` once per record, and building a `FileDescriptorProto` for every record would be brutal. The descriptor and the raw-to-sanitised name map are memoised together, keyed by the top-level Connect `Schema`:

```java
private record CachedSchema(Descriptors.Descriptor descriptor, Map<String, String> nameMap) {
}

private final ConcurrentHashMap<Schema, CachedSchema> schemaCache = new ConcurrentHashMap<>();
```

They are cached as one record rather than two maps because both come out of a single descriptor build and are only meaningful together. A name map paired with a stale descriptor would look up sanitised names that don't exist. One `computeIfAbsent` on one key makes a torn update impossible.

The decode direction needs no cache, because the descriptor arrives with the message.

# Why This Is Useful

Protobuf CDC pipelines work end to end now. A Debezium source connector emits Protobuf, the schema lands in Apicurio Registry, and a sink connector reads it back. Before this, the practical answer was to use Avro.

It also takes a jar off your workers. The compatibility-API route meant deploying Confluent's `ProtobufConverter` and pointing it at Apicurio's compatibility endpoint; this is Apicurio's own converter talking to Apicurio's own v3 API. Schemas register as native `PROTOBUF` artifacts, so the registry treats them like any other: validity and compatibility rules, versions, branches, and the same UI and REST surface Avro already gets.

The round-trip fidelity is what makes it usable for existing CDC topics rather than only greenfield ones. A `Struct` that leaves a source connector comes back field-for-field identical at the sink, including `INT8` and `INT16` widths, nulls in optional fields, hyphenated field names, and nested collections.

Configuration is unchanged from Avro. The properties are the standard schema-resolver ones, so switching an existing pipeline is a converter class name swap.

# Walkthrough

The repo's [event-driven-architecture example](https://github.com/Apicurio/apicurio-registry/tree/main/examples/event-driven-architecture) brings up Kafka, Kafka Connect, Postgres, and Apicurio Registry, with Debezium watching the Registry's own database. It ships wired for Avro. Switching it to Protobuf is a converter swap.

## 1. Start the stack

```bash
git clone https://github.com/Apicurio/apicurio-registry.git
cd apicurio-registry/examples/event-driven-architecture
docker compose up -d
```

The Registry API comes up on `http://localhost:8080`, Kafka Connect on `http://localhost:8083`, and the Registry UI on `http://localhost:8888`.

## 2. Switch the connector to Protobuf

Edit `studio-connector.json` and change the four converter lines. This is the file that matters: a connector's own `key.converter` and `value.converter` override whatever the worker has as its default, so editing only the Compose environment will leave you on Avro.

```json
{
  "name": "Test",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "apicurio-db",
    "database.dbname": "apicuriodb",
    "topic.prefix": "postgre-changes",
    "schema.include.list": "public",

    "key.converter": "io.apicurio.registry.utils.converter.ProtobufConverter",
    "key.converter.apicurio.registry.url": "http://schema-registry:8080/apis/registry/v3",
    "key.converter.apicurio.registry.auto-register": "true",
    "value.converter": "io.apicurio.registry.utils.converter.ProtobufConverter",
    "value.converter.apicurio.registry.url": "http://schema-registry:8080/apis/registry/v3",
    "value.converter.apicurio.registry.auto-register": "true"
  }
}
```

Debezium emits keys as structs (the primary key), so `ProtobufConverter` works on both sides here. In pipelines where keys are plain strings, use `StringConverter` for the key: this converter requires a struct at the top level.

One caveat on the image. `ENABLE_APICURIO_CONVERTERS: "true"` makes the Debezium container use the Apicurio converter jars it bundles, and those will only contain `ProtobufConverter` once Debezium picks up Apicurio Registry 3.3.2 or later. Until then, build the converter distribution and mount it:

```bash
./mvnw package -pl distro/connect-converter -am -DskipTests
# produces apicurio-kafka-connect-converter-<version>.tar.gz
# unpack it into a directory on the worker's plugin.path
```

## 3. Create the connector

```bash
curl http://localhost:8083/connectors \
  -H 'Content-Type: application/json' \
  -d @studio-connector.json
```

Connect finds the converter through the service-loader file, so there is no registration step beyond naming the class:

```
io.apicurio.registry.utils.converter.AvroConverter
io.apicurio.registry.utils.converter.ExtJsonConverter
io.apicurio.registry.utils.converter.ProtobufConverter
io.apicurio.registry.utils.converter.SerdeBasedConverter
```

## 4. Generate a change event

The connector is watching the Registry's own Postgres database, so creating an artifact in the Registry produces CDC events on the `artifacts` table:

```bash
curl -X POST "http://localhost:8080/apis/registry/v3/groups/default/artifacts" \
  -H 'Content-Type: application/json' \
  -d '{
        "artifactId": "hello-schema",
        "artifactType": "JSON",
        "firstVersion": {"content": {"content": "{\"type\":\"object\"}", "contentType": "application/json"}}
      }'
```

Debezium publishes that to `postgre-changes.public.artifacts`, and the converter registers the value schema under `<topic>-value`.

## 5. Read the generated `.proto`

```bash
curl -s "http://localhost:8080/apis/registry/v3/search/artifacts?artifactType=PROTOBUF" \
  | jq '.artifacts[].artifactId'
# "postgre-changes.public.artifacts-key"
# "postgre-changes.public.artifacts-value"

curl -s "http://localhost:8080/apis/registry/v3/groups/default/artifacts/postgre-changes.public.artifacts-value/versions/branch=latest/content"
```

In the `.proto` you should see `optional` on every nullable column, and `json_name` carrying a `__raw:` prefix on any column whose name needed sanitising. Debezium's envelope nests the row under `before` and `after` structs, so those appear as nested messages.

## 6. Verify the round trip

Point a sink connector at `postgre-changes.public.artifacts` with the same `value.converter` settings. The Connect `Struct` it receives should match what the source produced, field name for field name, including nulls in optional columns rather than empty strings and zeros. Worth checking against your own schemas before you rely on it.

# Limitations

- **Map keys must be `STRING`.** Protobuf permits integral keys; this converter does not, for now.
- **Map-in-collection is unsupported.** Wrap the inner map in a struct field.
- **Connect logical types are not mapped to well-known types.** `Decimal`, `Date`, `Time`, and `Timestamp` flow through as their underlying primitives (`bytes`, `int32`, `int64`). Semantic type information is not preserved. `AvroConverter` has richer logical-type handling here.
- **Protobuf enums decode as `STRING`.** There is no Connect enum type to decode into.
- **Collection fields always decode as optional.** Array and map schemas are built with `.optional()` unconditionally, so a required array encodes fine but comes back optional.
- **Schema names are sanitised.** A Connect schema named `io.apicurio.my-app.Event` becomes `io.apicurio.my_app.Event` on the way back. Field names are preserved via `__raw:`; the schema name is not.
- **Fidelity is guaranteed Connect to Connect.** An external Protobuf consumer sees plain `int32` fields, sanitised field names, and `Wrapper` messages. That is valid Protobuf; it is not the Connect shape. Only this converter reads the `json_name` annotations that close the gap.

# Troubleshooting

- `Top-level Protobuf converter schema must be a struct`: the converter was handed a primitive. Almost always `key.converter` set to `ProtobufConverter` while keys are plain strings. Use `StringConverter` for keys.
- `Nested map-in-collection is not supported. Wrap the inner map in a struct field.`: your Connect schema has `map<string, map<...>>` or `array<map<...>>`. Introduce a struct level.
- `Only string map keys are supported by the Protobuf converter`: change the map key schema to `STRING`, or restructure as an array of key/value structs.
- `Invalid Protobuf schema generated from Connect schema`: a wrapped `DescriptorValidationException`. The usual cause is two Connect field names that sanitise to the same proto identifier (`user-id` and `user.id` both become `user_id`). Check the cause chain for the exact conflict.
- **Converter class not found at startup**: the distribution tarball isn't unpacked under a directory on `plugin.path`, or it's on the worker classpath instead. Connect discovers converters via `ServiceLoader` inside plugin directories.
- **An optional field comes back as `0` or `""` instead of `null`**: the Connect schema didn't declare the field optional, so `proto3_optional` was never set.
- **`INT8` arrives as `INT32`**: the message was produced by something other than this converter, so there is no `__int8:` annotation to read. Expected; the type hint only exists on schemas this converter generated.
- **Schema not appearing in the registry**: check `apicurio.registry.auto-register` is `true` on the converter prefix (`value.converter.apicurio.registry.auto-register`), not the bare property.

# What's Next

Logical types are the obvious next gap. `Decimal`, `Date`, `Time`, and `Timestamp` currently flow through as raw primitives, and mapping them onto the Protobuf well-known types would bring parity with `AvroConverter`. Integral map keys are the other one.

The converter ships with 40 tests covering the round-trip cases that would otherwise regress silently: `Byte` and `Short` boundary values including inside optionals, maps, and array-of-array; `NaN` and both infinities; empty collections; the wrapper-versus-struct collision; and both rejected nested-map shapes.

If you hit a schema shape that doesn't round-trip, open an issue on [GitHub](https://github.com/Apicurio/apicurio-registry/issues) with the Connect schema that reproduces it.

# Try It Out

```bash
git clone https://github.com/Apicurio/apicurio-registry.git
cd apicurio-registry/examples/event-driven-architecture
docker compose up -d
```

Swap the converter class as above, and check the [converter source](https://github.com/Apicurio/apicurio-registry/tree/main/utils/converter) if you want to see how the round-tripping is implemented.
