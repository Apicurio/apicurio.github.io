---
layout: post
title: "Who Owes the Next Action? Making Pull Request Hand-offs Explicit"
date: 2026-10-23 12:00:00
updated: 2026-10-25
author: carles
categories: registry community contributing
---


A pull request has been quiet for two weeks. Is the author inactive, or are they waiting for a maintainer? A generic stale message cannot answer that question, but it can easily ask the wrong person to act.

Maintaining an open-source project involves more than deciding whether a patch is correct. Contributors need to know who owns the next step, what evidence is missing and what happens when that person is unavailable. The project's limited review capacity needs to be visible too.

Apicurio Registry's published PR lifecycle provides a concrete example of making those hand-offs explicit. Let's look at its state model and one public review, then extract the parts another project can use without adopting the same automation.

## Inactivity needs an owner

The [documented lifecycle](https://github.com/Apicurio/apicurio-registry/blob/main/.github/PR_LIFECYCLE.md) distinguishes `waiting-on-author` from `waiting-on-maintainer`. That difference affects escalation: a PR blocked only on a maintainer does not become stale and get automatically closed for contributor inactivity. Instead, it can receive a `review-overdue` signal.

That policy asks a better question than “when was this PR last updated?” Bots and CI can update a PR without a human moving the review forward. Conversely, an author may have nothing useful to add while waiting for an assigned reviewer.

The documented process also has an explicit trade-off: if both the author and maintainer are blocked, the contributor timer takes precedence. An ownership-aware process still needs decisions about ambiguous states; it does not make them disappear.

## Separate the hand-offs

Here is a simplified view of the responsibilities:

| State | Next owner | Evidence or action needed |
|---|---|---|
| Ready for review | Maintainer | Scope, test evidence and an available reviewer |
| Changes requested | Contributor | A specific actionable request |
| Approved, verification pending | CI and maintainer | Valid approval and checks for the current commit |
| Checks failed | Assigned investigator | Diagnosis of patch failure versus infrastructure failure |
| Waiting on maintainer | Maintainer | Review, reassignment or escalation |
| Both sides blocked | Explicit policy | Identify which action unblocks the other |

The table is not a replacement for the actual repository rules. It is a way to inspect whether every state has a meaningful next action.

For instance, a suggested reviewer is not proof that the person has accepted ownership. A successful quick check is not a successful full verification suite. “Approved” is not necessarily “ready to merge now” if required checks are still running or a newer commit invalidated the review.

## A real approval-to-verification sequence

[PR #10409](https://github.com/Apicurio/apicurio-registry/pull/10409) fixed a pagination test that could include agent records created by other tests. The change scoped fixtures with a unique label and checked that the combined pages contained the expected agents, rather than assuming an ordering not guaranteed by the API.

The public record shows a reviewer suggestion, my approval on October 7, 2026, and bot comments distinguishing the passed quick check from the remaining full-suite gate. The PR merged later that day.

This is useful because each transition is inspectable. It does not prove that automation reduced review time or increased contributor retention. It shows how the contributor and maintainer can tell which decision or check remains outstanding.

It also illustrates why source changes and workflow state need different explanations. A contributor should understand the technical fix from the PR description and the next operational step from the lifecycle feedback, without reverse-engineering several CI dashboards.

## Assignment is a policy, not just a notification

The documented reviewer-assignment approach considers ownership, interest and load. These signals represent different things: experience with the changed code, willingness to review an area and recent assignment pressure.

None is a perfect measure of availability. A specialist may appear lightly loaded because they cover fewer areas, not because they have spare capacity. A person who wrote much of the code may become a bottleneck if ownership dominates every assignment.

This is why an assignment system needs an explanation and a manual correction path. Contributors need a person to act; maintainers need to understand why that person was selected and how to change the policy when its assumptions stop fitting the team.

## Start with the convention before the bot

You can use the [hand-off worksheet](https://github.com/carlesarnal/oss-maintainer-playbook/blob/main/handoff.md) without deploying any automation. Pick one delayed contribution and answer:

1. Who owns the next action?
2. What specific evidence or decision is required?
3. How can the contributor see that state?
4. Who can take over if the owner is unavailable?
5. What event makes the current status obsolete?

If these answers are unclear, automating a reminder will not clarify them. First agree on a small convention; then automate the repetitive parts that the team can realistically maintain.

Automation itself becomes project code. Labels can be stale, commands can race with new commits and a workflow can report the wrong state. Keep the authoritative checks tied to the relevant commit and expose enough context for people to recover from a mistaken automated message.

## Measure what the process actually changes

Review waiting time and repeat participation are useful signals to investigate. They are not interchangeable with causality. A change in contribution volume, release timing or team availability can affect those numbers independently of a new lifecycle policy.

Start with a concrete outcome: fewer PRs where nobody knows the owner, fewer author-directed reminders while a maintainer is blocking progress, or a clearer path from approval to required verification. Then inspect whether the policy produces that outcome.

The goal is not a perfectly automated contribution pipeline. It is a process people can understand, correct and sustain. Making the next action explicit is a small improvement with value on both sides of the review.
