---
layout: post
title: "Preparing a CNCF Sandbox Application: A Maintainer's View from Apicurio Registry"
date: 2026-10-23 12:00:00
author: carles
categories: registry engineering
published: false
---

*Draft for editorial review. Verification status and limitations are included below.*

## A decision to defer is part of the story

In January 2024, I closed Apicurio Registry’s earlier Sandbox application while branding questions were resolved and the project explored its relationship with xRegistry. The public comment is useful because it records a decision, not a retrospective invented to make acceptance look inevitable.

## Explain scope in terms outsiders can verify

The renewed application identifies repository scope and describes the consolidation of Studio functionality. It distinguishes a runtime implementation from a neighboring specification and describes alignment work. These are application statements: a reader should not turn intended conformance or ecosystem positioning into independently verified technical guarantees.

## A passed vote is not the end of onboarding

The March 2026 vote passed. A later comment explicitly required the contribution agreement before onboarding, and issue #495 lists project and foundation tasks. Keeping those stages distinct helps maintainers assign work realistically. The public record does not establish that I personally completed every task or that a particular code change caused acceptance.

## Use the worksheet on your project

For each application question, write the claim, a public reference, what it actually proves, the remaining gap and an owner. Recheck current requirements before applying. The durable takeaway is evidence organization and stewardship, rather than a permanent checklist of foundation rules or a promise that membership creates a contributor community.

## Try the companion material

The [companion repository](https://github.com/carlesarnal/cncf-sandbox-journey/tree/main) contains the presentation, speaker guide and evidence ledger.

```sh
Read worksheet.md alongside the linked public application records
```

Public application #72, renewed application #461 and onboarding #495 inspected. No software execution needed. Historical decisions are evidence; no causal claim about acceptance or contributor growth.

## Before applying this to your system

Start with one representative operation and state the result you expect to observe. Keep version and environment assumptions with the result. A successful narrow check is useful precisely because its boundary is visible; it is not proof of every deployment, workload or failure mode.
