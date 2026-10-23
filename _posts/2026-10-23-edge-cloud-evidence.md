---
layout: post
title: "Rebuilding a Search Index While the Database Keeps Changing"
date: 2026-10-23 12:00:00
author: carles
categories: registry engineering
published: false
---

*Draft for editorial review. Verification status and limitations are included below.*

## A completed bulk load is not enough

During a search-index rebuild, source rows can change or disappear. Copying a snapshot without coordinating later changes can resurrect a deleted document or overwrite a new value with an old one. The recovery design needs a baseline, subsequent events and an explicit point at which the replacement becomes eligible for reads.

## Make the invariant executable

The companion model stores the last revision for each key, including tombstones. Older events cannot replace newer state, duplicate events are harmless, and conflicting content at the same key/revision is rejected. Tests include two updates during catch-up and a late update arriving after a delete. These are algorithmic fixtures, not a claim that a connector automatically provides the required revision contract.

## Know whether history is sufficient

If retained Kafka events include the required baseline and changes, replay can reconstruct the view. Otherwise a fresh source snapshot must be coordinated with the stream. Compaction and tombstone retention affect what is recoverable. Per-key or per-partition order is not a global source transaction order; choose the guarantee the view actually requires.

## Cut over with evidence

Track progress, check known insert/update/delete fixtures and declare acceptable remaining lag before switching an Elasticsearch read alias. New writes must continue reaching the replacement afterward. The historical CDC repository supplies deployment context, while the new full snapshot/catch-up/alias exercise is still pending. Apicurio handles schema information; it does not establish rebuild completeness.

## Try the companion material

The [companion repository](https://github.com/carlesarnal/debezium-ocp-etc-demo/tree/talk/evidence-2026-10-23) contains the presentation, speaker guide and evidence ledger.

```sh
python3 talk/rebuild_model.py
```

Three executable replay-invariant tests prepared. They model per-key revision behavior; real Debezium snapshot coordination, Kafka retention and Elasticsearch alias cutover are not integration-tested in this pass.

## Before applying this to your system

Start with one representative operation and state the result you expect to observe. Keep version and environment assumptions with the result. A successful narrow check is useful precisely because its boundary is visible; it is not proof of every deployment, workload or failure mode.
