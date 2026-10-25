---
layout: post
title: "A2A or MCP? Compare the Caller Contract, Not the Label"
date: 2026-10-23 12:00:00
updated: 2026-10-25
author: carles
categories: agents mcp interoperability
---


Suppose you have a service that summarizes text. Should you expose it as an MCP tool or an A2A agent?

The words alone do not decide. An MCP tool can invoke a sophisticated model, and an A2A agent can perform deterministic work. What matters is the contract presented to the caller: discovery, input and output, progress, failure and cancellation.

To compare those contracts, I built a small application that exposes exactly the same function through the official Python SDKs. Removing model variability lets us see the protocol behavior rather than debate two different generated summaries.

## Hold the underlying work constant

Our summarizer is intentionally simple:

```python
def summarize(text):
    if not text.strip():
        raise ValueError("text must not be blank")
    return " ".join(text.split()[:8])
```

Both interfaces receive:

```text
One implementation can expose multiple interfaces without changing the underlying work.
```

Both must return:

```text
One implementation can expose multiple interfaces without changing
```

This is not a language-quality test. It gives us a stable oracle for the transport and lifecycle comparison. Once those behaviors are understood, a real model can replace the fixture without changing the questions we ask of its interface.

## Start both servers and run the comparison

The example pins A2A SDK `0.3.22`, MCP SDK `1.26.0`, Uvicorn `0.40.0` and HTTPX `0.28.1`. Use Python 3.13 and `uv` to match the tested client environment:

```bash
git clone https://github.com/carlesarnal/a2a-mcp-comparison.git
cd a2a-mcp-comparison
uv venv .venv
uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/python integration.py
.venv/bin/python compare.py --require-observed
```

The integration runner starts loopback servers on ports `18201` and `18202`, makes real HTTP calls, records observations and stops both processes. A2A advertises protocol `0.3.0`; the MCP session negotiates `2025-11-25` in the recorded run.

## Discovery exposes different application surfaces

The A2A server publishes an Agent Card with a `summary` skill. The test fetches `/.well-known/agent-card.json` and verifies that declaration before sending a message.

The MCP client initializes a session and calls `list_tools()`. Its `summary` tool exposes typed arguments, including text and an optional delay used to make progress observable.

Neither discovery response proves the function works. We still invoke the capability and compare its result with the expected eight-word string. This is also where Registry-backed discovery fits: a registry can help locate and govern metadata, but it does not replace the protocol's invocation contract.

## Failure is part of the interface

Send blank text and the shared function raises `ValueError`. The two adapters communicate that failure differently:

| Requirement | A2A example | MCP example |
|---|---|---|
| Find the capability | Agent Card skill | Tool listing and input schema |
| Successful result | Artifact on a completed task | Successful tool result |
| Blank input | Task reaches `failed` | Tool result has `isError` |
| Observe progress | `working` state through `tasks/get` | Progress notifications |
| Cancel | Canceled task record | Client request cancellation |

These are observations of the supplied implementations, not a complete feature comparison between the standards. In particular, the MCP example does not implement a durable task store, and the A2A example uses an in-memory task store.

## Cancellation needs an observable boundary

For A2A, the runner starts delayed work in nonblocking mode, polls until the task is working and sends `tasks/cancel`. It then checks for a canceled state and no result artifact. The executor cooperatively observes a stop event.

For MCP, the client starts a delayed tool call and waits for progress before cancelling its pending operation. It observes client-side cancellation and proves that another tool call on the session still works.

Those are not equivalent guarantees. A canceled client operation does not, on its own, prove that server-side computation stopped. Neither example proves recovery after the server process dies. Keeping these boundaries explicit is more useful than declaring that both protocols “support cancellation” and leaving callers to discover what that means.

## Choose from caller requirements

Before choosing an interface, write down what the caller needs:

* Is a typed request/result tool sufficient, or does the application need a task it can address later?
* How will progress reach the caller?
* What should a timeout or cancellation mean for work already in progress?
* Which implementation features are advertised, and which have actually been exercised?
* What state must survive a process restart?

Exposing both interfaces can be reasonable, but it adds two contracts to maintain. Shared business logic does not remove adapter-specific errors, authentication or lifecycle tests.

The [repository](https://github.com/carlesarnal/a2a-mcp-comparison) keeps the implementation, `observations.json` and comparison table together. The useful output is not a winner. It is a vocabulary for choosing an interface whose observable behavior matches the application you are building.
