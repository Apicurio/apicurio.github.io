---
layout: post
title: "Rebuilding a Search Index While PostgreSQL Keeps Changing"
date: 2026-10-23 12:00:00
updated: 2026-10-25
author: carles
categories: kafka debezium data recovery
---


A search index is often described as disposable because the database remains the source of truth. That description is only useful if we know how to rebuild the index while the source continues accepting changes.

Consider a customer record that changes twice during a rebuild, and another that is deleted. A successful bulk load can still leave the replacement index with an old value or a resurrected document. We need a baseline, the subsequent changes, an ordering rule and a controlled cutover.

The example below makes those requirements visible using real PostgreSQL, Debezium, Kafka and Elasticsearch services. It complements schema-governance work: Registry can describe the records, but schema validity cannot prove that a derived view is complete.

## Keep the first recovery experiment small

Our lab uses PostgreSQL 16.4, Debezium 3.0.0.Final, Kafka 3.9.1 and Elasticsearch 8.17.0. It captures one table into a **single-partition** topic, retaining its complete history. A Python runner reads actual Kafka events and applies them to Elasticsearch in order.

```text
PostgreSQL --WAL--> Debezium --events--> Kafka partition 0
                                             |
                                      ordered replay
                                             |
                              customers-old / customers-new
                                             |
                                      customers alias
```

This is an explicit replay implementation, not an Elasticsearch sink connector configured behind the scenes. The small scope lets the test assert exact contents at each stage.

## Run it

Install Python 3 and Docker Compose, then use the maintained branch:

```bash
git clone --branch talk/evidence-2026-10-23 \
  https://github.com/carlesarnal/debezium-ocp-etc-demo.git
cd debezium-ocp-etc-demo
python3 recovery.py
```

The runner starts a dedicated Compose project, executes the recovery sequence, writes `results.json` and removes its containers and volumes. The services use local, disposable configuration; do not reuse these credentials or exposed development settings for production.

## Establish the baseline

The source table begins with two rows:

```sql
CREATE TABLE customers(id integer PRIMARY KEY, name text);
ALTER TABLE customers REPLICA IDENTITY FULL;
INSERT INTO customers VALUES (1, 'before'), (2, 'delete-me');
```

Debezium snapshots them as two `r` events. The runner verifies that both arrived before it proceeds. That precondition matters: a recovery test that starts from an empty stream can pass while exercising almost none of the intended behavior.

Both rows are applied to `customers-old`, and the `customers` read alias initially points there. A separate `customers-new` index is created for the rebuild.

## Change the source while the replacement loads

After loading only the first baseline event into the replacement, the runner performs these writes:

```sql
UPDATE customers SET name = 'middle' WHERE id = 1;
UPDATE customers SET name = 'after' WHERE id = 1;
DELETE FROM customers WHERE id = 2;
INSERT INTO customers VALUES (3, 'new');
```

It finishes loading the baseline and waits for all four changes. The captured operation sequence is now:

```text
r, r, u, u, d, c
```

Record identity is the table's primary key. Inserts and updates use Elasticsearch document `PUT`; deletes use document `DELETE`. Replaying the changes in partition order yields:

```json
{"1": "after", "3": "new"}
```

The deleted key must be absent. A row count alone would not establish correctness: two wrong documents could still produce the expected count.

## Replay again, then switch the alias

The runner applies the complete retained history again and checks the same final contents. This demonstrates convergence for **complete, ordered replay** in this fixture. It does not show that arbitrary out-of-order updates are safe: an older `PUT` after a newer one could overwrite it without an additional version guard.

Once the replacement passes its content checks, the alias changes in one Elasticsearch request:

```json
{
  "actions": [
    {"remove": {"index": "customers-old", "alias": "customers"}},
    {"add": {"index": "customers-new", "alias": "customers"}}
  ]
}
```

The test queries the alias rather than just the physical index. It then updates customer 3 again in PostgreSQL, captures the seventh event and applies it to the replacement. The alias must now return `after-cutover` for that customer. Cutover is not finished if later writes still go only to the old index.

## Where a production recovery plan needs more detail

The complete-history assumption is central. If required events have expired, replay cannot invent the missing baseline. A new snapshot must be coordinated with subsequent changes so neither gaps nor incorrectly ordered updates appear.

For multiple partitions, define progress per partition and the consistency the view requires. Do not compare unrelated offsets as one global clock. Also decide how deletion information survives retention or compaction, how replay resumes after a crash, and whether reads can tolerate remaining lag at cutover.

The fixture does not demonstrate these more complex paths, and it does not make the source and index instantaneously equal while writes continue. It provides a concrete starting point for testing them: known source changes, observed events, exact document assertions and a read-path switch.

## Make “disposable” an executable claim

A useful rebuild runbook should answer four questions: where the baseline comes from, how later changes are ordered, what proves the replacement is ready, and where new changes go afterward.

The [implementation and recorded result](https://github.com/carlesarnal/debezium-ocp-etc-demo/tree/talk/evidence-2026-10-23) turn those questions into a seven-event integration test. The same reasoning applies to other derived views: recovery is a behavior to exercise, not a property obtained simply by calling a store a cache or an index.
