---
layout: post
title: "Why Are Predictions Late? Diagnosing Streaming Inference on Kubernetes"
date: 2026-10-23 12:00:00
author: carles
categories: registry engineering
published: false
---

*Draft for editorial review. Verification status and limitations are included below.*

## Availability is not freshness

The existing classification pipeline connects Kafka, Spark inference and a Quarkus results API. An available API can serve predictions about old inputs. Adding replicas to that API does not necessarily improve upstream processing. Apicurio Registry supports schema integration, but a schema cannot establish that a prediction is timely.

## Give every event a timeline

Record ingress time, processing start, processing end and query visibility with a stable event identity. The new CSV analyzer calculates queue, processing and visibility intervals and their sum. It rejects empty observations, duplicate IDs, naive timestamps and reversed boundaries. Its unit fixtures prove arithmetic and validation only, not a measured throughput or latency figure.

## Control the replay

Use fixed inputs and stamp their current ingress time; historical source timestamps are a different age metric. Keep model, resources and input distribution comparable. Run a sustainable baseline, then overload, then change a single processing setting. Separate warm-up and observation windows. A micro-batch interval can add scheduling delay, but reducing it does not create inference capacity.

## What remains to measure

The earlier OCX presentation supports the application and speaker background. It is not a recording of this new controlled experiment. The repository now contains the measurement contract and analyzer, while actual replay/load measurements remain pending. Report observed input/processing rates and backlog alongside per-event age before recommending a capacity change.

## Try the companion material

The [companion repository](https://github.com/carlesarnal/reddit-realtime-classification/tree/talk/evidence-2026-10-23) contains the presentation, speaker guide and evidence ledger.

```sh
python3 -m unittest discover -s talk -p "test_*.py" -v
```

Timestamp analyzer and unit fixtures prepared. Fixtures are synthetic correctness inputs, not performance results. The fixed-replay Spark load experiment and fresh Kubernetes execution remain pending.

## Before applying this to your system

Start with one representative operation and state the result you expect to observe. Keep version and environment assumptions with the result. A successful narrow check is useful precisely because its boundary is visible; it is not proof of every deployment, workload or failure mode.
