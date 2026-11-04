---
layout: post
title: "Schema Compatibility Modes Explained: BACKWARD, FORWARD, FULL and Transitive"
description: "What BACKWARD, FORWARD, FULL and the transitive compatibility modes mean, which changes each one allows for Avro, JSON Schema and Protobuf, and how to configure them in Apicurio Registry."
author: carlesarnal
categories: registry schemas compatibility avro protobuf jsonschema
---

A schema registry's most useful job is saying "no": rejecting a schema change before it reaches a producer and
breaks a consumer. Compatibility modes decide what gets rejected. This post explains each mode, shows which common
changes pass or fail, and covers how to configure them in Apicurio Registry.

---

# The modes

Every mode answers one question: who must be able to read what?

| Mode | Guarantee | Checked against |
|---|---|---|
| `BACKWARD` | Consumers using the **new** schema can read data written with the previous one. | Latest version |
| `FORWARD` | Consumers using the **previous** schema can read data written with the new one. | Latest version |
| `FULL` | Both of the above. | Latest version |
| `BACKWARD_TRANSITIVE` | Like `BACKWARD`, against **every** earlier version. | All versions |
| `FORWARD_TRANSITIVE` | Like `FORWARD`, against every earlier version. | All versions |
| `FULL_TRANSITIVE` | Like `FULL`, against every earlier version. The strictest mode. | All versions |
| `NONE` | No checks. | — |

A rule of thumb: upgrade consumers first? Use `BACKWARD`. Upgrade producers first? Use `FORWARD`. Can't control the
order? Use `FULL`.

# Why "transitive" matters

Non-transitive modes compare a new schema only with the latest version. That can let a sequence of individually
safe changes add up to an unsafe one. With Avro:

1. Version 1: `name: string`
2. Version 2: adds `email: string` with default `""`
3. Version 3: removes the default from `email`

Version 3 is backward compatible with version 2, because all version 2 data has `email`. It is not backward compatible
with version 1, whose data has no `email` and now no default to fall back on. So version 3 passes `BACKWARD` and fails
`BACKWARD_TRANSITIVE`. If old data stays in your topics (long retention, compacted topics, replays), use a transitive mode.

# Which changes pass

## Avro

| Change | Backward | Forward |
|---|:---:|:---:|
| Add a field with a default | Yes | Yes |
| Add a field without a default | No | Yes |
| Remove a field that has a default | Yes | Yes |
| Remove a field without a default | Yes | No |
| Add a type to a union | Yes | No |
| Remove a type from a union | No | Yes |
| Rename a field without an alias | No | No |
| Change a field's type | No | No |

The pattern: give new fields defaults, and you can evolve in both directions.

## JSON Schema

JSON Schema is constraint-based, so the question is whether the new schema is **more permissive** (backward
compatible) or **stricter** (forward compatible). Adding an optional property, removing a property from `required`,
adding an `enum` value or relaxing a `minLength` are backward compatible. Adding a `required` property, removing an
`enum` value, adding a `pattern`, or switching `additionalProperties` from `true` to `false` are not.

## Protobuf

Protobuf identifies fields on the wire by tag number, so tags are what you protect. Adding a field with a new tag, a new
message type or a new RPC method is backward compatible. Changing a tag or a field type, or removing a field without
reserving it, is not. Reserve both the number and the name when you remove a field:

```protobuf
message Person {
  reserved 2, 3;
  reserved "email", "phone";
  int32 id = 1;
  string name = 4;
}
```

Apicurio Registry also flags renaming a field as incompatible. It is safe on the binary wire format, but it breaks JSON
encoding and generated code.

OpenAPI and XSD have their own compatibility checks too; see the documentation linked below.

# Configuring compatibility in Apicurio Registry

Compatibility is one of three content rules, alongside validity and integrity. You can set it at three levels, and the
most specific one wins: **artifact**, then **group**, then **global**. To switch off a rule inherited from a higher
level, set it to `NONE` at the lower level.

Set a global default with the v3 REST API:

```bash
curl -X POST http://localhost:8080/apis/registry/v3/admin/rules \
  -H "Content-Type: application/json" \
  -d '{"ruleType": "COMPATIBILITY", "config": "BACKWARD"}'
```

Then tighten it for a group whose topics are replayed from the beginning:

```bash
curl -X POST http://localhost:8080/apis/registry/v3/groups/payments/rules \
  -H "Content-Type: application/json" \
  -d '{"ruleType": "COMPATIBILITY", "config": "FULL_TRANSITIVE"}'
```

If you use Confluent clients through the compatibility API, note that the compatibility *check* endpoint defaults to
`BACKWARD` when no rule is configured, but registration only enforces a rule that you have actually set.

# Further reading

- [Schema compatibility modes](/registry/docs/apicurio-registry/3.3.x/getting-started/assembly-registry-compatibility-modes.html), with the full tables for every format
- [Content rule reference](/registry/docs/apicurio-registry/3.3.x/getting-started/assembly-rule-reference.html)
