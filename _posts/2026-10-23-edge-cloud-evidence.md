---
layout: post
title: "Rebuilding a Search Index While the Database Keeps Changing"
date: 2026-10-23 12:00:00
author: carles
categories: registry engineering
published: false
---

Your search index is disposable only if you can replace it correctly. While a replacement loads, a customer record changes twice and another is deleted. A successful bulk load says little about whether searches will return the right state after cutover.

This session runs PostgreSQL, Debezium, Kafka and Elasticsearch through that sequence. Two snapshot records form the baseline; two updates, a delete and an insert arrive while the replacement loads. We replay the complete ordered history again, assert the same document contents, switch the read alias and verify another source update after cutover. The seven captured events make the recovery evidence inspectable.

The tested example uses one partition and complete retained history. We explain why that is sufficient for this trace, and what changes when required history has expired or multiple partitions are involved. A new-snapshot recovery path is a separate design discussion, not a demonstrated result. Attendees get an executable rebuild trace and explicit cutover checks rather than a guarantee of instantaneous equality with the database.


## What actually ran

Real PostgreSQL 16.4 -> Debezium 3.0.0.Final -> Kafka 3.9.1 -> Elasticsearch 8.17.0 integration passed. Two baseline records, two updates, a delete, an insert and a post-cutover update were captured. Full replay converged; alias reads showed the expected documents and continued updating after cutover.

## Reproduce the observation

[Companion implementation](https://github.com/carlesarnal/debezium-ocp-etc-demo/tree/talk/evidence-2026-10-23).

```sh
python3 recovery.py
```

## What the result establishes

One topic partition and retained complete history. The runner reads real Kafka events then applies them in order; it is not a continuously deployed sink connector. Expired-history recovery and distributed partition barriers remain separate design problems. No Registry involvement is claimed in this JSON-envelope recovery fixture.

The machine-readable result and the executable assertions are kept together. A failed candidate is an observation to preserve, not a reason to revise acceptance criteria after seeing the answer. These tests are evidence for the stated mechanism, not a promise of production scale or universal correctness.
