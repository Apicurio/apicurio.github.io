---
layout: post
title: "A2A or MCP? Choosing an Interface for the Same Capability"
date: 2026-10-23 12:00:00
author: carles
categories: registry engineering
published: false
---

You have a summarization service and two plausible interfaces: expose an MCP tool or publish an A2A agent. Both can accept text and return a summary. The useful comparison starts when the caller needs to understand task progress, cancel work, or respond to a failed invocation.

This session holds a deterministic summarization capability constant and invokes it over real HTTP through the official Python A2A and MCP SDKs. Both return the same eight-word result. A blank input becomes a failed A2A task and an MCP error result; progress appears as queryable A2A task state or MCP progress notifications. We then cancel a request and inspect what each client can actually observe.

The versioned observations distinguish A2A's canceled task record from MCP's canceled client request and subsequent usable session. Neither local implementation supplies durable restart recovery or production authentication. A decision table ties those limits to caller requirements rather than labels: an A2A endpoint need not contain a reasoning loop, and an MCP tool need not perform simple work.


## What actually ran

Official SDK loopback integration passed. Both interfaces returned the same eight-word fixture. Blank input produced a failed A2A task and an MCP error result. A2A exposed working/canceled task states; MCP exposed progress notifications and client-request cancellation with a usable subsequent session.

## Reproduce the observation

[Companion implementation](https://github.com/carlesarnal/a2a-mcp-comparison/tree/main).

```sh
uv venv .venv
uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/python integration.py
.venv/bin/python compare.py --require-observed
```

## What the result establishes

A2A SDK 0.3.22 / protocol 0.3.0; MCP SDK 1.26.0 / protocol 2025-11-25. Python implementation, not the previously proposed Quarkus comparison. MCP server-side compute cessation is not proven by client cancellation; neither implementation persists tasks across restart. No auth or production inference benchmark.

The machine-readable result and the executable assertions are kept together. A failed candidate is an observation to preserve, not a reason to revise acceptance criteria after seeing the answer. These tests are evidence for the stated mechanism, not a promise of production scale or universal correctness.
