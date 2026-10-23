---
layout: post
title: "Validate Before Kafka: What Happens When a Proxy Enforces Your Schemas"
date: 2026-10-23 12:00:00
author: carles
categories: registry engineering
published: false
---

*Draft for editorial review. Verification status and limitations are included below.*

## The error class is not the diagnosis

The local test uses Kroxylicious 0.24.0, Apicurio Registry 3.3.3 and Kafka 3.9.1. A valid JSON order reaches the broker. A negative amount is rejected, as is the valid record sharing its batch. The script then reads the topic: success is a broker observation, not merely an absence of console errors.

## A schema registry becomes part of the write path

Stopping Registry causes a valid record to be rejected with SCHEMA_RESOLUTION_ERROR inside InvalidRecordException. Treating that exception as proof of bad input would send a valid business event down the wrong recovery path. Inspect the constraint or resolution context and the dependency before deciding whether to repair, quarantine or retry.

## The recovery test found another boundary

Our demonstration Registry uses ephemeral storage. Restarting its container restored HTTP availability but not the registered schema. The first recovery assertion failed with ContentNotFoundException. The corrected lab re-registers the schema and verifies its content ID before retrying. This is a laboratory restoration step, not a substitute for production Registry persistence and backup.

## Enforcement and delivery are separate decisions

An invalid event sent directly to the broker bypasses the filter. Deployment controls must enforce the proxy path. Likewise, a rejected mixed batch does not give an application a universal selective-resend algorithm: preserve its ordering and duplicate-handling requirements. My merged Avro/Protobuf contribution explains the implementation background; this particular lab exercises JSON Schema.

## Try the companion material

The [companion repository](https://github.com/carlesarnal/kroxylicious-schema-validation/tree/talk/evidence-2026-10-23) contains the presentation, speaker guide and evidence ledger.

```sh
python3 talk/demo.py
```

Fresh integration check passed: valid, invalid, mixed batch, bypass, registry outage and recovery; broker contents asserted. The ephemeral Registry schema was restored after restart before retrying. No performance benchmark.

## Before applying this to your system

Start with one representative operation and state the result you expect to observe. Keep version and environment assumptions with the result. A successful narrow check is useful precisely because its boundary is visible; it is not proof of every deployment, workload or failure mode.
