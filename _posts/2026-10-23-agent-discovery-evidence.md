---
layout: post
title: "Agent Sprawl Is the New Microservice Sprawl: Discovery and Governance for Multi-Agent AI"
date: 2026-10-23 12:00:00
author: carles
categories: registry engineering
published: false
---

*Draft for editorial review. Verification status and limitations are included below.*

## Run one connected workflow

The example creates a briefing: a fictional weather result from an MCP tool feeds an A2A summarizer, and that summary feeds an A2A translator. The calls and handoffs are real; the weather is fixture data. Application code chooses the roles and order. Registry discovery supplies endpoint metadata rather than planning the workflow.

## Inspect the rejected publication

Removing the translation skill from an Agent Card must be rejected by the configured Registry rule. The checks inspect more than an HTTP error: the rejected version must be absent, the accepted content/version/globalId must remain unchanged, and the workflow must still run. A compatible addition then exercises the accepted path.

## Keep the publisher honest too

My merged Quarkus LangChain4j change #2897 handles changed cards after an agent restart even when the declared agent version did not change. That is a distinct concern from rejecting incompatible publication: discovery is only useful when metadata is refreshed correctly. The fix includes a republishing regression test. The connected sample is separately pinned from open PR #2932.

## Understand what the test does not prove

A rejected card does not stop an independently deployed implementation from breaking callers. Registry versions observed before execution are not deployment pins or a transactional fleet snapshot. Static URLs may be sufficient for a small jointly deployed application. Use the responsibility matrix to decide what belongs in publication, deployment checks and runtime testing.

## Try the companion material

The [companion repository](https://github.com/carlesarnal/agent-discovery-demo/tree/talk/evidence-2026-10-23) contains the presentation, speaker guide and evidence ledger.

```sh
python3 scripts/workflow.py test
```

Nine sample tests and live MCP/A2A smoke were recorded October 23 in the existing Paris branch. Those tests were not rerun by this packaging step. PR #2932 is open at the pinned revision; publisher fix #2897 is merged, release inclusion unchecked.

## Before applying this to your system

Start with one representative operation and state the result you expect to observe. Keep version and environment assumptions with the result. A successful narrow check is useful precisely because its boundary is visible; it is not proof of every deployment, workload or failure mode.
