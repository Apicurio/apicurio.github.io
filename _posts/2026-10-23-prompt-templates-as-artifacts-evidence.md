---
layout: post
title: "Beyond Git: Releasing and Rolling Back Runtime Prompt Templates"
date: 2026-10-23 12:00:00
author: carles
categories: registry engineering
published: false
---

The prompt was reverted in Git. A running service is still using the newer template. When prompts are released independently of applications, source history does not answer the operational question: which version produced this response, and when will a rollback reach its consumers?

This session runs a release lab against Apicurio Registry and Ollama. Versioned JSON prompt artifacts carry source labels; a Python consumer explicitly selects and caches them. Application checks reject a changed required-variable contract without replacing the accepted cache. A three-question evaluation then tests instruction-only changes against predeclared format criteria, recording prompt hashes, model digest, outputs and results. In the recorded run, all candidates failed those criteria and promotion was blocked.

We separately exercise selecting an earlier artifact after a version change: the cached consumer keeps its current template until reload. The returned artifact version makes that distinction observable. The small evaluation checks format, not general answer quality; structural checks belong to the application rather than a claimed built-in prompt rule. We finish with a release checklist and when bundling prompts with application code is sufficient.


## What actually ran

Real Registry 3.3.3 publication, selection, cached version transitions and rollback passed. Invalid structural reload retained the known-good cached artifact. Nine actual Ollama responses were recorded. All three candidate versions failed the predeclared ANSWER-prefix/word-count check; promotion was blocked.

## Reproduce the observation

[Companion implementation](https://github.com/carlesarnal/apicurio-registry-support-chat/tree/talk/evidence-2026-10-23).

```sh
docker compose -f compose.yaml -p prompt-release-lab up -d --wait
python3 release_lab.py --ollama http://localhost:11434 --model qwen2.5:1.5b
docker compose -f compose.yaml -p prompt-release-lab down -v
```

## What the result establishes

The maintained implementation is Python, replacing the incomplete Java/RAG scaffold. Artifacts use JSON; required-variable validation belongs to the application, not an asserted built-in PROMPT_TEMPLATE rule. Source revisions are labeled fixtures. Format checks do not establish factual answer quality. Explicit reload is the implemented refresh policy.

The machine-readable result and the executable assertions are kept together. A failed candidate is an observation to preserve, not a reason to revise acceptance criteria after seeing the answer. These tests are evidence for the stated mechanism, not a promise of production scale or universal correctness.
