---
layout: post
title: "Why Are Predictions Late? Diagnosing Streaming Inference on Kubernetes"
date: 2026-10-23 12:00:00
author: carles
categories: registry engineering
published: false
---

A prediction endpoint can return HTTP 200 while serving results for events that arrived minutes ago. Adding API replicas will not help if the delay sits upstream in a Spark micro-batch or a growing Kafka backlog. Where should an application team measure before changing capacity?

Building on my streaming-classification application presented at OCX, this session isolates Spark Structured Streaming in a reproducible experiment. A fixed four-text classifier processes twelve timestamped events per case: sustainable input, overload with a labeled injected delay, and the same nominal input rate after removing that delay. The lab uses a file source and collected results to isolate processing; Kafka and HTTP serving overhead are outside the measurement.

In the local run, baseline input drained without backlog. Removing the injected delay reduced median prediction age from about 8.4 to 5.8 seconds, but eleven events were still pending when input stopped: the one-file-per-trigger cap remained. We inspect event timelines and batch progress to explain why eliminating one delay did not eliminate the next bottleneck. These are single-run fixture observations, not production performance claims.


## What actually ran

Actual Spark 3.5.3 Structured Streaming experiment passed with a fitted CountVectorizer/MultinomialNB fixture and twelve events per case. Baseline had no pending events when input stopped. Injected overload had median age about 8.4 seconds; removing the injected delay reduced it to about 5.8 seconds but retained eleven pending events because the source still admitted one file per trigger.

## Reproduce the observation

[Companion implementation](https://github.com/carlesarnal/reddit-realtime-classification/tree/talk/evidence-2026-10-23).

```sh
docker build -t talk-stream-experiment:local experiment
docker run --rm --cpus 2 --memory 3g -v "$PWD/experiment:/lab" talk-stream-experiment:local
```

## What the result establishes

Single run, four training texts, file source, driver-side classifier in foreachBatch, local[2], two-CPU/3GB container. Injected delay is a labeled intervention, not measured model inference cost. Result visibility is collection into the callback output, not a Quarkus endpoint. Kafka, Kubernetes and production ML quality are outside this isolation experiment.

The machine-readable result and the executable assertions are kept together. A failed candidate is an observation to preserve, not a reason to revise acceptance criteria after seeing the answer. These tests are evidence for the stated mechanism, not a promise of production scale or universal correctness.
