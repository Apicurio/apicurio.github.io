---
layout: post
title: "A2A or MCP? Choosing an Interface for the Same Capability"
date: 2026-10-23 12:00:00
author: carles
categories: registry engineering
published: false
---

*Draft for editorial review. Verification status and limitations are included below.*

## Compare a requirement, not a label

The same summarization work can be exposed as an MCP tool or an A2A agent. Choosing an interface from the words tool and agent alone hides the questions the caller must answer: how to discover inputs, represent progress, cancel work and interpret a failed invocation. Apicurio can store discovery metadata, but that does not make these interfaces interchangeable.

## Control the experiment

Begin with one deterministic summarization fixture and the same input on both paths. Pin the protocol and SDK versions and record the actual messages. Introduce a model only after transport behavior is understood, otherwise different generated summaries can obscure an interface-level comparison. The existing connected briefing uses different capabilities and is not evidence of parity.

## Use four evidence states

For each requirement, record specification support, advertised implementation support, observed behavior and unsupported behavior. Untested is not synonymous with unsupported. The repository includes a small validator and a delivery gate that refuses an evidence table with untested rows. It currently fails that delivery gate because the paired implementation is still preparation work.

## A design method, not a finished benchmark

This article presents the comparison method and its evidence requirements. It does not claim an implemented cross-protocol benchmark or a universal recommendation. Exposing both interfaces adds contract tests and lifecycle obligations. Choose that extra surface only when distinct callers need it, rather than because both protocols are fashionable.

## Try the companion material

The [companion repository](https://github.com/carlesarnal/a2a-mcp-comparison/tree/main) contains the presentation, speaker guide and evidence ledger.

```sh
python3 compare.py
```

Evidence-table validator passes. Paired A2A/MCP transport implementation is not complete. The --require-observed delivery gate deliberately fails; no interface-parity result is claimed.

## Before applying this to your system

Start with one representative operation and state the result you expect to observe. Keep version and environment assumptions with the result. A successful narrow check is useful precisely because its boundary is visible; it is not proof of every deployment, workload or failure mode.
