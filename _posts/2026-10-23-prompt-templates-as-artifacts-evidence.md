---
layout: post
title: "Beyond Git: Releasing and Rolling Back Runtime Prompt Templates"
date: 2026-10-23 12:00:00
author: carles
categories: registry engineering
published: false
---

*Draft for editorial review. Verification status and limitations are included below.*

## A revert is not an observed rollback

Git records authorship and review. A service that cached a prompt may continue using its selected version after source history changes. The useful runtime question is which artifact version produced a response, not merely which commit is newest. A prompt registry can distribute artifacts, but consumer policy controls when changes take effect.

## Separate candidate checks

Changing a required template variable can break rendering before a model is invoked. An instruction-only change can preserve that interface while changing output quality. The first needs a structural check; the second needs a fixed evaluation set with criteria and model configuration recorded before results are judged. Passing one is not evidence for the other.

## Make selection observable

The deterministic Python lab selects version 1, changes the selection to 2 and shows the cached consumer still rendering version 1 until reload. The same sequence in reverse models rollback. Its tests also reject a structurally incompatible candidate and missing input. It is intentionally a small model, not a substitute for exercising the Java consumer against Registry and a real model.

## Choose the simpler release path when sufficient

If prompts always change with the application, bundling them in the application release may be enough. Independent distribution earns its extra dependency only when consumers need independent selection. Before publishing a complete walkthrough, the remaining integration work is to expose selected-version provenance, test refresh behavior and record real evaluation outcomes. No model-quality improvement is claimed here.

## Try the companion material

The [companion repository](https://github.com/carlesarnal/apicurio-registry-support-chat/tree/talk/evidence-2026-10-23) contains the presentation, speaker guide and evidence ledger.

```sh
python3 talk/release_demo.py
```

Three deterministic release-selection tests prepared; real Registry-backed consumer refresh and LLM evaluation remain unverified. The release lab is a model of selection/cache behavior, not a claim that the existing Java app implements it.

## Before applying this to your system

Start with one representative operation and state the result you expect to observe. Keep version and environment assumptions with the result. A successful narrow check is useful precisely because its boundary is visible; it is not proof of every deployment, workload or failure mode.
