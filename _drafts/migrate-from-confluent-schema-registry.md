---
layout: post
title: "Migrating from Confluent Schema Registry to Apicurio Registry Without Changing Your Clients"
description: "A step-by-step migration from Confluent Schema Registry to Apicurio Registry: export your schemas, point Confluent serializers at the ccompat API, and check the IDs, defaults and features that differ."
author: carlesarnal
categories: registry confluent kafka migration
---

Apicurio Registry implements the Confluent Schema Registry REST API, so the serializers, Kafka Connect converters and
tools you already use with Confluent keep working when you change one URL. This post is a checklist for doing that
migration safely: move the data, switch the clients, and know in advance where the two registries differ.

---

# 1. Move the schemas

Use the [Confluent export tool](/blog/2025/03/20/export-from-confluent) to export every subject and version from
Confluent Schema Registry into a ZIP file in Apicurio Registry's import format, then import it:

```bash
curl -X POST "http://<registry-url>/apis/registry/v3/admin/import" \
  -H "Accept: application/json" -H "Content-Type: application/zip" \
  --data-binary @confluent-schema-registry-export.zip
```

You can also import the ZIP from the **Explore** tab of the web console.

# 2. Point clients at the compatibility API

Apicurio Registry serves the Confluent API under `/apis/ccompat/v7` and `/apis/ccompat/v8`. Both are fully supported.
For a Java producer, the change is the URL:

```java
// Before: Confluent Schema Registry
props.put("schema.registry.url", "http://confluent-registry:8081");

// After: Apicurio Registry
props.put("schema.registry.url", "http://apicurio-registry:8080/apis/ccompat/v7");
```

The same applies to Kafka Connect workers and any tool that takes a schema registry URL. Avro, JSON Schema and
Protobuf are all supported, and so are the schemas, subjects, compatibility, config and mode APIs.

# 3. Check the five differences that matter

**Schema IDs.** Confluent has one incrementing schema ID. Apicurio Registry has a `contentId` (per unique content) and
a `globalId` (per version). By default the Confluent ID maps to `contentId`, which matches Confluent: the same schema
registered under two subjects gets the same ID. If your application relies on a unique ID for every registration, set
`apicurio.ccompat.legacy-id-mode.enabled=true` to map to `globalId` instead. Decide this *before* producers write
data with the new IDs.

**Default compatibility.** With no rule configured, the compatibility *check* endpoint defaults to `BACKWARD`, like
Confluent. Registration, however, only enforces compatibility once a rule exists. Set one explicitly:

```bash
curl -X PUT http://apicurio-registry:8080/apis/ccompat/v7/config \
  -H "Content-Type: application/json" -d '{"compatibility": "BACKWARD"}'
```

**Avro formatting.** The ccompat API returns Avro schemas in compact canonical form, as Confluent does. If your code
compares schema strings, compare parsed schemas instead. The native v3 API returns schemas exactly as submitted.

**Config response field names.** `PUT /config` returns `compatibility`, while `GET /config` returns
`compatibilityLevel`. This also matches Confluent, but it trips up hand-written clients.

**Authentication.** Apicurio Registry uses OpenID Connect. Update the client security settings to match your identity
provider.

# 4. Know what is not there

A few Confluent features have no ccompat equivalent:

| Confluent feature | In Apicurio Registry | Alternative |
|---|---|---|
| Schema Linking / exporters | `GET /exporters` returns an empty list | Import/export API, Kafka storage replication, or GitOps |
| Client-side field level encryption (KEKs, DEKs) | Endpoints return 404 | Encrypt at the application layer |
| Cluster metadata API | Not present | Apicurio Registry system API |
| Data contract `metadata` and `ruleSet` | Accepted but not stored or enforced | Native data contracts (`apicurio.contracts.enabled=true`) |

If you depend on one of these, plan the alternative before you switch.

# 5. Optionally, go native

The compatibility API is a bridge, not a requirement to stay. Moving clients to the Apicurio Registry SerDes and
the v3 API gives you groups, branches, labels and the full rule set. You can do that one application at a time,
because both APIs read the same data.

# Further reading

- [Confluent Schema Registry compatibility API documentation](/registry/docs/apicurio-registry/3.3.x/getting-started/assembly-confluent-schema-registry-compatibility.html)
- [Apicurio Registry vs. Confluent Schema Registry](/registry/apicurio-vs-confluent-schema-registry/)
