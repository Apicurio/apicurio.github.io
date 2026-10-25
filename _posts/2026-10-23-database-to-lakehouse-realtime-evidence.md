---
layout: post
title: "The Sink Says RUNNING. Where Is My Data? Following CDC into Iceberg"
date: 2026-10-23 12:00:00
updated: 2026-10-25
author: carles
categories: registry kafka iceberg debezium
---


A Kafka Connect task reports `RUNNING`, PostgreSQL keeps accepting writes, and the analytical table does not change. Which component should you investigate first?

I encountered this while assembling a PostgreSQL-to-Iceberg pipeline. The sink's control consumer could not maintain its group membership, and its coordinator reported commits to zero tables. The task's lifecycle status was accurate: it was running. It simply was not making data available to the query engine.

This article follows the evidence needed to distinguish those two states. Apicurio Registry is part of the pipeline as the Avro schema service; the Iceberg catalog has a separate responsibility.

## Map the data path before reading every log

```text
PostgreSQL -> Debezium -> Kafka -> Iceberg sink -> object storage
                 |                  |                  |
                 +-- Avro schemas --+             data files
                          |                            |
                   Apicurio Registry         Iceberg REST catalog
                                                     |
                                                   Trino
```

Debezium emits changes, Kafka retains them, the sink writes data and commits table metadata, and Trino queries a committed table view. A success at one boundary is not proof that the next boundary succeeded.

The maintained Kubernetes lab uses Registry 3.3.3, the Apache Iceberg Kafka Connect sink 1.11.0 and a separate Iceberg REST catalog fixture. An older version of the repository described Registry as the catalog; that is **not** the architecture reproduced by this lab.

## Follow one key

Start with a known source change rather than a cluster-wide dashboard. The companion `progress-ledger.txt` organizes the investigation:

| Question | Evidence |
|---|---|
| Did the source commit the change? | Table, primary key, operation and source position |
| Did Debezium emit it? | Matching event and Kafka topic/partition/offset |
| Did the sink consume it? | Progress for the relevant task and partition |
| Did a table commit include it? | Iceberg snapshot and committed data |
| Can Trino see it? | A query result for the expected key |
| Does the query represent current state? | Explicit ordering and delete handling |

An offset is meaningful in its partition. Comparing the largest offset across unrelated partitions does not establish a global progress boundary.

Registry lookup is another boundary to inspect when deserialization fails. A readable Kafka record does not imply the sink has the schema or references it needs. Conversely, successful schema resolution does not imply that an Iceberg commit completed.

## The control consumer was the useful clue

The failed setup logged `UNKNOWN_MEMBER_ID` during the sink control consumer's classic group-protocol interaction. Commit attempts timed out with `committed to 0 table(s)` even while the task reported `RUNNING`.

In this setup, changing the sink's Kafka group protocol restored commits:

```yaml
iceberg.kafka.group.protocol: consumer
```

That is an observed recovery, not a universal repair instruction. The underlying interaction was not isolated far enough to claim a root cause for every occurrence of that error. The portable lesson is where to look: the sink has coordination and commit work beyond consuming the data topic.

## A commit interval is not a freshness guarantee

Two recorded local runs made an inserted row queryable after **33 seconds** and **42 seconds**, despite this setting:

```yaml
iceberg.control.commit.interval-ms: 10000
```

The measurements include polling and query overhead. They do not isolate the time spent in capture, consumption, coordination, commit or query visibility. Treating the ten-second setting as an end-to-end guarantee would hide precisely the delays we need to understand.

Likewise, initial snapshot ingestion includes table creation and startup work. Its timing is not directly comparable with a single change flowing through a warmed pipeline. Keep startup and steady-state observations separate before drawing conclusions about freshness.

## The table is a changelog, not automatically a mirror

The example sink appends flattened change events and a `_cdc` structure. After an update, the table contains both the original insert and the update event. Seeing the update in a snapshot is different from having a query that returns only the current row.

The example uses a latest-event-per-key query:

```sql
SELECT id, first_name, last_name, phone
FROM (
  SELECT *,
         row_number() OVER (
           PARTITION BY id ORDER BY _cdc.offset DESC
         ) AS rn
  FROM iceberg.inventory.customers
)
WHERE rn = 1 AND _cdc.op <> 'D';
```

The ordering expression must match the semantics of your connector's position field and the events being compared. Do not generalize it into a global order across arbitrary partitions or sources. For larger workloads, an append-only changelog also raises questions about compaction, snapshot retention and whether to materialize current state rather than reconstruct it on every query.

## Try the pipeline

The [maintained repository branch](https://github.com/carlesarnal/database-to-lakehouse-demo/tree/talk/evidence-2026-10-23) contains the Kubernetes implementation under `talk/lab/`. Use a disposable cluster and review its README for the pinned component versions and local image-loading assumptions.

```bash
git clone --branch talk/evidence-2026-10-23 \
  https://github.com/carlesarnal/database-to-lakehouse-demo.git
cd database-to-lakehouse-demo/talk/lab
./connect-image/build.sh
./scripts/01-deploy.sh
./scripts/run-demo.sh
./scripts/99-teardown.sh
```

The teardown deletes the lab namespace. The recorded runs used minikube on macOS ARM64; the catalog fixture and single-node services are development infrastructure, not a production availability design.

## Monitor the outcome users depend on

Process health, ingestion progress and query freshness answer different questions. Keep all three, but do not let the first stand in for the others.

When the next pipeline stalls, select one key and identify the last boundary with convincing evidence. That gives you a smaller investigation than “Kafka Connect is green but analytics is broken,” and a much better starting point for an alert that reflects what users actually experience.
