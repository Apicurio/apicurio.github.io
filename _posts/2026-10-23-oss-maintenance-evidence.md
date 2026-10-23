---
layout: post
title: "Beyond the First Pull Request: Making Contribution Work Sustainable"
date: 2026-10-23 12:00:00
author: carles
categories: registry engineering
published: false
---

*Draft for editorial review. Verification status and limitations are included below.*

## Quiet does not mean abandoned

A contribution can be silent because the author owes a change, because no maintainer has reviewed it, or because both are blocked. A generic inactivity timer can ask the wrong person to act. Apicurio’s published lifecycle makes these states visible instead of treating every delay as contributor inactivity.

## Separate status from authority

A reviewer suggestion identifies a candidate, not proof of available time. Approval and a fast check are separate from the full verification gate. Public PR #10409 records a suggested reviewer, my approval, bot comments about the remaining full suite and a later merge. The sequence illustrates responsibilities; one example does not establish a time-saving benchmark.

## Make policy trade-offs explicit

The documented process does not auto-close a PR blocked only on a maintainer. It adds an overdue signal. When both author and maintainer are blocked, the contributor timer takes precedence. That detail belongs in the discussion: an ownership-aware policy can still have contested choices and needs maintainers to keep it accurate.

## Start smaller than a bot

The hand-off worksheet asks for current owner, evidence needed, next action and escalation if the owner is unavailable. A documented convention may be sufficient before automation is justified. The goal is a process a small team can sustain, not a claim that automation eliminates overload or proves community growth. Review waiting time and repeat participation are signals to investigate, not causal conclusions.

## Try the companion material

The [companion repository](https://github.com/carlesarnal/oss-maintainer-playbook/tree/main) contains the presentation, speaker guide and evidence ledger.

```sh
Read handoff.md and trace public PR #10409
```

Public PR lifecycle and Carles review on #10409 inspected. Workshop/state table prepared. Automation effectiveness and contributor-retention outcomes were not measured.

## Before applying this to your system

Start with one representative operation and state the result you expect to observe. Keep version and environment assumptions with the result. A successful narrow check is useful precisely because its boundary is visible; it is not proof of every deployment, workload or failure mode.
