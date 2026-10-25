---
layout: post
title: "Why Are Predictions Late? Isolating Backlog in Spark Structured Streaming"
date: 2026-10-23 12:00:00
updated: 2026-10-25
author: carles
categories: streaming performance machine-learning
---


An API can return successful responses while its predictions describe events that arrived several seconds or minutes ago. Adding API replicas does not help if the delay sits upstream in a processing queue.

My earlier classification application connected Kafka, Spark and a Quarkus results service. To investigate processing behavior without mixing every stage together, I built a smaller experiment that isolates Spark Structured Streaming. It uses timestamped file input, one small classifier and a deliberately visible admission limit.

The interesting result was not merely that slow processing creates backlog. Removing the injected delay improved prediction age, but did not clear the next bottleneck.

## Define the measurement boundary

The experiment runs Spark 3.5.3 in `local[2]` inside a container limited to two CPUs and 3 GB of memory. Its model is a `CountVectorizer` and `MultinomialNB` pipeline trained on four explicit fixture texts:

```python
TEXTS = [
    "database query schema",
    "football match goal",
    "database table index",
    "football team stadium"
]
LABELS = ["technology", "sport", "technology", "sport"]
```

This classifier supplies actual prediction work, but its training set is intentionally tiny. Correct labels for these fixtures demonstrate pipeline execution, not useful generalization or production model quality.

Each input carries an event ID and a new ingress timestamp. The measured age ends when the `foreachBatch` callback records the prediction. It includes Spark scheduling and collection plus the classifier and any injected delay; it does **not** include Kafka ingestion, Registry lookups or HTTP query visibility.

## Run the comparison

```bash
git clone --branch talk/evidence-2026-10-23 \
  https://github.com/carlesarnal/reddit-realtime-classification.git
cd reddit-realtime-classification
docker build -t talk-stream-experiment:local experiment
docker run --rm --cpus 2 --memory 3g \
  -v "$PWD/experiment:/lab" talk-stream-experiment:local
```

The image contains Spark and scikit-learn 1.3.2. The runner writes per-event and per-batch observations to `experiment/results.json`. The current branch is the focused experiment; the earlier live-feed application remains in repository history.

## Make admission visible

The source has a deliberately restrictive configuration:

```python
stream = (
    spark.readStream.schema(schema)
    .option("maxFilesPerTrigger", 1)
    .json(str(source))
)
```

The query uses a one-second processing-time trigger. Each file contains one event. A warm-up event runs before measurement, then twelve events are offered in each case:

1. **Baseline:** a nominal 1.2 seconds between events, no injected delay.
2. **Overload:** a nominal 0.1 seconds between events, with 1.2 seconds of injected work per record.
3. **Delay removed:** the same nominal 0.1-second input interval, with the injected work removed.

The actual offered rate is measured, not assumed from `sleep()`. File creation, scheduling and system load make the real rate differ from the nominal interval.

## Read the observations together

One local run produced:

| Case | Actual offered events/s | Pending when input stopped | Median age | Maximum age |
|---|---:|---:|---:|---:|
| Baseline | 0.80 | 0 | 0.65 s | 0.99 s |
| Injected overload | 6.45 | 11 | 8.40 s | 14.97 s |
| Delay removed | 7.25 | 11 | 5.84 s | 10.54 s |

Removing the delay improved age, but it did not make the workload sustainable. The query still admitted only one file per trigger, while files arrived much faster. The pending count at the end of input is a snapshot, not the final loss count: the runner subsequently drains all available input and asserts that all twelve IDs were processed.

These are single-run observations, not a performance benchmark with confidence intervals. The input rates differ somewhat, and the slow case uses an artificial delay rather than claiming that the real classifier takes 1.2 seconds. Those qualifications are essential to interpreting the comparison correctly.

## Avoid measuring the wrong age

A replay dataset may carry old source timestamps. Reusing them as “ingress time” would make every prediction look old even if processing were immediate. Keep source-event age and time spent in the current pipeline as separate metrics.

The runner records:

```text
event ID -> ingress -> batch processing start -> result recorded
```

It also records batch duration and event count. These fields let us inspect whether delay accumulated before processing or during the batch. Because `frame.collect()` brings records to the driver and the classifier runs there, this particular experiment does not measure distributed executor-side inference throughput.

## Extend the experiment one boundary at a time

For a production diagnosis, repeat runs with representative input and resource limits. Then include the other stages: Kafka arrival, schema resolution if applicable, model completion, output publication and the application's queryable result.

Changing a micro-batch interval, raising a source-admission cap and adding inference capacity solve different problems. Raising the cap can improve admission but create larger batches or exceed downstream capacity. More API pods may have no effect on any of those limits.

Schema governance and observability complement each other here. A Registry can help preserve the shape and meaning of exchanged data; progress measurements tell us whether that data arrives in time to be useful. Neither a valid schema nor a healthy endpoint establishes freshness.

The [source and raw results](https://github.com/carlesarnal/reddit-realtime-classification/tree/talk/evidence-2026-10-23/experiment) make the example reproducible. Use the same discipline on your own pipeline: state the measurement boundary, change one controllable cause, and look for the next limiting stage before adding capacity.
