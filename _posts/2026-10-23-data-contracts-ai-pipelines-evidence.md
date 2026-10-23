---
layout: post
title: "Your Model Didn't Change, Your Input Did: Data Contracts for Streaming AI Pipelines"
date: 2026-10-23 12:00:00
author: carles
categories: registry engineering
published: false
---

*Draft for editorial review. Verification status and limitations are included below.*

## One number, two contracts

A producer changes duration from 30 seconds to 30,000 milliseconds. The Avro long field can still deserialize perfectly. A consumer interpreting it as seconds receives a value a thousand times larger. The structural contract and the semantic feature contract answer different questions.

## Exercise the actual Registry API

The lab creates a unique group and an Avro Duration artifact in Registry 3.3.3, enables BACKWARD compatibility, accepts a defaulted optional addition, then attempts to add a required string without a default. The real API returns HTTP 400 for incompatibility. The script verifies the rejected version is absent and the accepted version content is unchanged.

## Test the semantic invariant separately

A deterministic normalization function requires an explicit unit. Both 30 s and 30000 ms must yield 30 seconds. The tests reject unknown units, negative/non-finite values and booleans. This catches an omitted conversion at the model-input boundary without pretending to measure a model-accuracy change. The same fixture can become a CI contract test.

## Do not turn publication checks into broker claims

BACKWARD compatibility means a new reader can read old data; it does not guarantee every old reader accepts new writes. A Registry rule governs schema publication, not all bytes sent to Kafka. The demo deliberately has no Kafka producer or model service, so its evidence is limited to real publication behavior and deterministic input semantics. Group deletion is enabled only for the disposable lab cleanup.

## Try the companion material

The [companion repository](https://github.com/carlesarnal/data-contracts-ai-demo/tree/main) contains the presentation, speaker guide and evidence ledger.

```sh
python3 -m unittest -v && python3 demo.py
```

Fresh checks passed: three semantic unit tests; real Registry 3.3.3 compatible publication; HTTP 400 incompatible publication; rejected version absent; accepted content preserved; group cleanup passed after enabling deletion in the disposable lab.

## Before applying this to your system

Start with one representative operation and state the result you expect to observe. Keep version and environment assumptions with the result. A successful narrow check is useful precisely because its boundary is visible; it is not proof of every deployment, workload or failure mode.
