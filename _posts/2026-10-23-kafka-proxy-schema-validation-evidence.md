---
layout: post
title: "Validating Before Kafka: What a Schema-Checking Proxy Changes for Producers"
date: 2026-10-23 12:00:00
updated: 2026-10-25
author: carles
categories: registry kafka schemas kroxylicious
---


Client-side schema validation is useful until a producer does not use it. A legacy application, a third-party integration or a configuration mistake can send data that consumers cannot interpret. Putting validation between the producer and the broker gives us another enforcement point—but it also creates a new failure contract for producers.

I contributed Avro and Protobuf support to the [Kroxylicious Record Validation filter](https://github.com/kroxylicious/kroxylicious/pull/3498). In this article, we'll use its JSON Schema support with Apicurio Registry to examine that failure contract. We'll reject invalid records, inspect a mixed batch, bypass the proxy, stop Registry and recover the write path.

## Where validation happens

```text
Producer ──produce request──> Kroxylicious ──accepted records──> Kafka
                                   |
                                   └──schema lookup──> Apicurio Registry
```

The producer still speaks the Kafka protocol. Kroxylicious inspects record values before forwarding them, and Registry supplies the schema identified by the proxy configuration.

This example uses Kroxylicious **0.24.0**, Registry **3.3.3** and Kafka **3.9.1**. The Record Validation filter is a Preview feature in the referenced implementation; use the versioned behavior shown here rather than assuming identical error or caching behavior across releases.

## Try the complete sequence

You need Python 3 and Docker Compose:

```bash
git clone --branch talk/evidence-2026-10-23 \
  https://github.com/carlesarnal/kroxylicious-schema-validation.git
cd kroxylicious-schema-validation
python3 talk/demo.py
```

The runner starts a dedicated Compose project, registers the schema, generates the proxy configuration and runs six cases. It reads the broker after the important writes and removes its containers when finished. Producer output is saved under `talk/target/producer-results.json`.

## Register a deliberately small contract

The order schema requires an identifier and a nonnegative amount:

```json
{
  "type": "object",
  "required": ["orderId", "amount"],
  "properties": {
    "orderId": {"type": "string"},
    "amount": {"type": "number", "minimum": 0}
  }
}
```

Registry returns a `contentId` when this artifact is created. The runner substitutes that value into the filter configuration:

```yaml
filterDefinitions:
  - name: order-validation
    type: RecordValidation
    config:
      rules:
        - topicNames: [orders]
          valueRule:
            schemaValidationConfig:
              apicurioRegistryUrl: http://registry:8080
              apicurioId: __ID__
              schemaType: JSON_SCHEMA
defaultFilters: [order-validation]
```

`__ID__` is a generation placeholder, not a value to send to the proxy. This example pins the filter to registered content; it is not a demonstration of automatically selecting the latest schema version.

## One bad record can affect good records

A valid order reaches Kafka. An order with a negative amount produces `InvalidRecordException` and is absent from the topic.

Next, the runner submits a valid order and an invalid order in a batch, using a single-partition topic and producer settings that allow them to batch together. In the tested setup, **both records are rejected**. Reading Kafka confirms that the valid member of the failed batch did not arrive either.

This matters for application error handling. “Retry the valid record” may be the right next step for this known rejected batch, but it is not a complete general recovery algorithm. Producers must account for ordering requirements, ambiguous outcomes and duplicate handling. A broker timeout, for example, must not automatically be interpreted as the same definite rejection demonstrated by this test.

## A proxy only protects its path

The next case sends an invalid record directly to Kafka's internal broker endpoint. Kafka stores it because that request did not pass through the validation filter.

There is no contradiction: the broker has not become schema-aware merely because a proxy exists. If proxy validation is a required control, broker access and network policy must enforce the path. Keep client-side validation too when possible; it can give the application faster, more contextual feedback before a network call.

## A Registry outage looks different from invalid input

Stopping Registry creates a more subtle case. We send a valid order through the proxy and receive an `InvalidRecordException` containing:

```text
context=SCHEMA_RESOLUTION_ERROR
```

The record is rejected because its schema cannot be resolved, not because its amount violates the schema. The exception class alone therefore cannot decide whether an application should correct its input or investigate an infrastructure dependency.

| Case | Producer observation | Broker observation | First action |
|---|---|---|---|
| Valid order | No validation rejection | Record present | Normal acknowledgement handling |
| Invalid amount | Constraint failure | Record absent | Correct or quarantine input |
| Mixed batch | Batch rejection | Both new records absent | Evaluate batch-level recovery |
| Direct broker bypass | No proxy check | Invalid record present | Fix the enforcement path |
| Registry unavailable | Schema resolution error | Valid record absent | Restore schema availability |

## Recovery means restoring the schema, too

The recovery test initially failed even after the Registry container came back. Our local Registry uses ephemeral storage: restarting the process restored HTTP availability but lost the schema. The proxy then reported `ContentNotFoundException` for its configured content ID.

The corrected laboratory sequence re-registers the schema and checks that the restored `contentId` matches the proxy's configuration before sending a new record. That record reaches Kafka. In a durable deployment, the corresponding responsibility is preserving and restoring Registry data, not hoping that a healthy process has the same content as before.

This recovery is intentionally narrow. It demonstrates restoring the dependency and successfully sending a new record. It does not claim a general exactly-once resend strategy.

## Design the failure contract before enabling enforcement

The proxy adds useful protection, particularly when producers cannot all be changed together. Its operational cost is that schema resolution, batching and routing now participate in write behavior.

Before enabling it, decide how producers distinguish constraint errors from resolution errors, how failed batches are handled, and how direct access is controlled. The [runnable example](https://github.com/carlesarnal/kroxylicious-schema-validation/tree/talk/evidence-2026-10-23) turns those questions into assertions against actual broker contents. That is the useful test of an enforcement point: not only whether it reports an error, but what it allows to be stored.
