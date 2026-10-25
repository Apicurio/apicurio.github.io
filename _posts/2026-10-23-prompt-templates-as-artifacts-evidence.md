---
layout: post
title: "A Git Revert Is Not a Prompt Rollback: Version Selection with Apicurio Registry"
date: 2026-10-23 12:00:00
updated: 2026-10-25
author: carles
categories: registry prompts ai releases
---


You revert a prompt in Git, but the application continues producing responses with the newer instructions. Nothing is necessarily wrong with Git: the running consumer may still have that template in memory.

Once prompt releases are independent of application releases, we need to distinguish three things: the source revision, the registered artifact version and the version a consumer actually selected. This article follows those identities through a working Registry and Ollama example, including an evaluation that refused to promote any candidate.

## Start with a small artifact

The laboratory stores prompt documents as versioned **JSON artifacts** in Apicurio Registry 3.3.3:

```json
{
  "template": "Reply with ANSWER: followed by one sentence, at most 30 words. No other text. Question: $question",
  "required": ["question"],
  "source_revision": "fixture-v1"
}
```

`source_revision` is a fixture label here; a release pipeline can populate it with the actual source commit. Registry supplies artifact storage and version retrieval. The consumer owns the required-variable check and rendering policy. This example does not depend on a built-in `PROMPT_TEMPLATE` compatibility rule.

That distinction keeps the experiment easy to inspect. We can test the release behavior without assuming that storing a prompt automatically validates its instructions or generated answers.

## Run the release workflow

You need Python 3, Docker Compose and a running Ollama instance with the model installed:

```bash
git clone --branch talk/evidence-2026-10-23 \
  https://github.com/carlesarnal/apicurio-registry-support-chat.git
cd apicurio-registry-support-chat
ollama pull qwen2.5:1.5b
docker compose -f compose.yaml -p prompt-release-lab up -d --wait
python3 release_lab.py --ollama http://localhost:11434 --model qwen2.5:1.5b
docker compose -f compose.yaml -p prompt-release-lab down -v
```

Despite the repository's historical name, this branch now contains a focused Python release lab, not the previous Java RAG chatbot. Omitting `--ollama` runs the real Registry selection/reload checks without evaluating model output; that is also the boundary exercised in CI.

## Selection and loading are different operations

The consumer first selects version 1 and loads it into its cache. Changing the selection to version 2 does not immediately replace that cache:

```python
consumer.select("1")
consumer.reload()

consumer.select("2")
assert consumer.render("test")["artifact_version"] == "1"

consumer.reload()
assert consumer.render("test")["artifact_version"] == "2"
```

This explicit-reload policy is one choice, not a universal Registry behavior. Startup-only loading, time-based refresh or per-request fetching would have different latency, availability and rollout characteristics.

The returned rendering includes the selected artifact version, source label and SHA-256 of the rendered prompt. These fields make a response traceable to what the consumer used. Observing only the release pointer would miss a stale cache.

## A failed reload must not discard the accepted prompt

The example publishes a fourth candidate that requires `$context` instead of `$question`. Selection can find the artifact, but the consumer's rendering-contract check rejects loading it.

The test then renders another request and verifies that version 1 is still cached. Fetching a candidate, checking it and replacing active state should be ordered so failure does not leave the application with a partially updated configuration.

Structural acceptance still says nothing about the quality of an instruction-only change. Versions 1, 2 and 3 retain the same required input while asking the model for different output.

## Decide evaluation criteria before running candidates

The evaluation uses three questions about a schema registry, a Kafka topic and a database index. Its deliberately narrow criteria are:

```python
passed = answer.startswith("ANSWER:") and 1 <= len(answer.split()) <= 40
```

Model options are recorded: temperature `0`, seed `42` and `num_predict` `96`. The result file includes the model digest, each rendered prompt, output, token count and observed duration.

In the recorded `qwen2.5:1.5b` run, **none of the three candidate versions passed all questions**. Some responses omitted the required prefix. One answer interpreted Kafka as the author rather than the messaging system. The intentionally unsuitable third candidate returned “BANANA.”

The first implementation of the runner asserted that its baseline must pass. That was the wrong expectation: an evaluation is allowed to discover that the baseline is inadequate. The corrected gate records an empty accepted-candidate list and blocks promotion instead of changing the criteria to produce a green result.

The Kafka response also shows why formatting is not factual evaluation. A response could satisfy the prefix and word limit while remaining wrong. A real acceptance set needs domain-specific checks, representative inputs and a separate development set to avoid tuning solely to the release test.

## Test rollback separately from promotion

Rejecting a candidate before it becomes active is not the same as rolling back an active version. The lab exercises both selection directions, verifies the cached version before reload and checks the earlier version after reload.

Restoring a previous prompt does not undo answers already sent or actions already performed. It changes future rendering according to the consumer's refresh policy. That is the operational boundary to document for users of the release mechanism.

## When independent prompt releases are worthwhile

If prompts always change with application code, bundling them in the application may be simpler. A runtime registry becomes useful when consumers need explicit, independent version selection and a shared distribution mechanism.

Keep the release record complete: source revision, artifact version, rendering contract, model configuration, evaluation criteria and observed consumer version. The [companion implementation and results](https://github.com/carlesarnal/apicurio-registry-support-chat/tree/talk/evidence-2026-10-23) show how those pieces fit together. The goal is not to make every candidate pass. It is to know what was selected, what was checked and what actually changed at runtime.
