---
layout: post
title: "Before and After the Sandbox Vote: Preparing an Open-Source Project for CNCF"
date: 2026-10-23 12:00:00
updated: 2026-10-25
author: carles
categories: registry cncf community
---


In January 2024, I closed Apicurio Registry's earlier CNCF Sandbox application. We had branding questions to resolve and were exploring our relationship with the xRegistry effort. In March 2026, the renewed application passed its Technical Oversight Committee vote.

Between those two moments was work that is easy to leave out of an acceptance announcement: defining the project boundary, explaining its relationship to neighboring work, and assigning responsibility for what happens after the vote. This post uses the public application record to make that work useful to other maintainers.

## An application is a description that other people must evaluate

Maintainers already know what their software does. People reviewing a contribution to a foundation do not share all of that context. They need to understand which repositories are involved, how decisions are made and why the project fits the ecosystem.

The [earlier application](https://github.com/cncf/sandbox/issues/72) contains a good example. A question about using Apicurio with the Kubernetes API required clarification: deploying Registry through an operator, managing Registry artifacts through Kubernetes, and using Registry to describe another API are different integrations.

The lesson is not that every application must implement all of them. It is that an answer like “we integrate with Kubernetes” is too broad to tell a reader which capability actually exists.

## Defining the boundary came before continuing

My [January 23, 2024 comment](https://github.com/cncf/sandbox/issues/72#issuecomment-1906355967) recorded the decision to defer over branding questions and engagement with the Discovery API/xRegistry effort. It was a decision to clarify the contribution, not evidence that the software had stopped being useful.

The [renewed application](https://github.com/cncf/sandbox/issues/461) explicitly identifies the Registry repository in scope and describes the consolidation of Studio functionality. It also explains the intended relationship between a registry implementation and the xRegistry specification.

That distinction matters in an application just as it does in technical documentation. Implementing a specification, intending to implement it and participating in its community are related but different claims. A reviewer should be able to tell which one the project is making and what evidence supports it.

## The vote and onboarding are separate milestones

The renewed application's vote passed on March 12, 2026. A subsequent message required the contribution agreement before official onboarding could begin. The [onboarding issue](https://github.com/cncf/sandbox/issues/495) then listed work spanning project and foundation responsibilities.

Examples include licensing and trademark arrangements, repository hosting, governance and security documentation, community channels and project services. These are not all engineering tasks, and they are not all tasks a maintainer can complete alone.

It is tempting to compress that sequence into “the project was accepted.” For planning, the distinction is more useful:

```text
Define the contribution
        ↓
Substantiate the application
        ↓
Review and vote
        ↓
Agreements and onboarding
        ↓
Ongoing project stewardship
```

The public record establishes that these steps occurred. It does not establish that one feature caused acceptance, or that I personally completed every onboarding task. Those would be different claims requiring different evidence.

## Turn broad claims into a worksheet

The [companion worksheet](https://github.com/carlesarnal/cncf-sandbox-journey/blob/main/worksheet.md) uses a simple structure:

| Field | What to write |
|---|---|
| Question | What does the application or reviewer need to know? |
| Claim | What are we saying about the project? |
| Public evidence | A document, code path or decision record, with its revision/date |
| Remaining gap | What is missing or still ambiguous? |
| Owner | Who will take the next action? |

For example, “we have open governance” should lead to a public decision process, named responsibilities and a path for an outside contributor to participate. “We fit this standard” should identify implemented behavior or explicitly say that alignment is planned.

Evidence should also be maintainable. A link to a changing `main` branch may be sufficient for exploration, but a historical account benefits from a dated reference. Record what the evidence established at the time instead of treating the current state of a repository as a perfect reconstruction of the past.

## Carry ownership beyond acceptance

Foundation participation does not remove the daily work of reviewing changes, maintaining releases or responding to users. An application can reveal gaps that remain relevant long after admission: unclear ownership, contribution instructions that assume internal knowledge, or security documentation nobody has responsibility to update.

Use the same worksheet after the milestone. Which promises require continuing work? Which documents need periodic review? Which services now have a foundation contact as well as a project owner?

There is no universal formula here. Requirements evolve, and another project's situation may differ from Apicurio's. Check the [current CNCF project process](https://github.com/cncf/toc/tree/main/process) before applying. The reusable practice is to connect each claim to something another person can inspect and each gap to someone who can act on it.

## Share the decisions, not only the announcement

The [acceptance announcement](https://www.apicur.io/blog/2026/06/18/apicurio-registry-joins-cncf) records an important milestone for Apicurio Registry. The earlier deferral and onboarding record provide a different kind of value: they show the questions a maintainer team needed to resolve.

If you are preparing your own project, begin there. Define the contribution, distinguish current capability from intent, and make the remaining work visible. That produces a clearer application—and a clearer project for contributors and users, regardless of the outcome of a foundation review.
