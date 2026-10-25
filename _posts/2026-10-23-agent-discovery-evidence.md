---
layout: post
title: "Discovering Agents Is Only Half the Job: A Connected MCP and A2A Workflow"
date: 2026-10-23 12:00:00
updated: 2026-10-25
author: carles
categories: registry agents quarkus mcp
---


An endpoint tells you where to send a request. It does not tell you whether the service still offers the capability your application expects. That distinction becomes important when agents and tools are published independently: discovery needs useful metadata, and changes to that metadata need a reviewable lifecycle.

Let's make this concrete with a small Quarkus application. An MCP weather tool returns data, an A2A summarizer turns it into a briefing, and an A2A translator translates that briefing. Apicurio Registry supplies the endpoint metadata. Application code supplies the sequence.

## Two paths through the system

```text
Metadata:   publishers -> Apicurio Registry -> application discovery

Execution:  application -> MCP weather -> A2A summary -> A2A translation
```

The Registry is not forwarding the weather result or choosing the next agent. The application asks for the required roles, resolves their endpoints and passes each actual result to the next step. This is deliberately a fixed workflow: its value is making the integration boundaries visible, not demonstrating autonomous planning.

The weather is fictional fixture data. The protocol calls, Registry requests and model invocations execute for real. That combination lets us inspect the plumbing without relying on a live weather provider.

## Run the connected example

The companion repository wraps a pinned Quarkus LangChain4j sample. You need Git, Python 3.9+, Docker Compose, Java 25 to match the recorded environment, and a running host Ollama instance.

```bash
git clone --branch talk/evidence-2026-10-23 \
  https://github.com/carlesarnal/agent-discovery-demo.git
cd agent-discovery-demo
ollama pull qwen2.5:7b
python3 scripts/workflow.py prepare
bash scripts/paris-2026-demo.sh
```

Open `http://localhost:11020/`. The dashboard shows the briefing stages and the Registry versions observed before execution. In another terminal, run:

```bash
python3 scripts/workflow.py governance
```

The wrapper fetches commit `682928b714574e1ca8f0405c4319b36cd244dc0e` from the sample associated with [PR #2932](https://github.com/quarkiverse/quarkus-langchain4j/pull/2932). That PR was open when the example was checked. The pin is important: the sample builds its extensions from source, so it is not claiming that this workflow is available in every released extension version.

## Remove a capability and inspect the result

The governance sequence starts with a successful briefing. It then attempts to publish a translator Agent Card with the translation skill removed.

Under the configured compatibility rule, Registry rejects the update. A useful test does more than assert an error response:

| Assertion | Why it matters |
|---|---|
| The rejection identifies the removed skill | An unrelated validation error would not prove the intended rule ran |
| The proposed version is absent | The failed request must not leave an accepted new contract |
| Accepted content, version and global ID are unchanged | Existing discovery metadata must remain available |
| The complete briefing still runs | The accepted configuration is still usable by this application |

A compatible addition follows the rejection. It creates a registered version and the application runs the briefing again. Testing both paths avoids turning governance into a demonstration where every update is simply forbidden.

## Fresh metadata needs correct publication

There is another failure mode before compatibility checking even begins: an agent restarts with a changed card but the publisher leaves the old card in Registry.

I addressed that in [Quarkus LangChain4j PR #2897](https://github.com/quarkiverse/quarkus-langchain4j/pull/2897), merged on September 30, 2026. The change uses find-or-create version behavior, handles changed card content when the declared agent version is unchanged, and updates artifact labels. It includes a regression test against Registry.

Publication freshness and compatibility are separate responsibilities. A compatibility rule cannot inspect a change that was never submitted. Conversely, publishing current metadata does not establish that the remote implementation behaves correctly.

## Where the guarantees stop

The successful rerun uses an unchanged running translator after a rejected metadata update. It does **not** prove that Registry prevents someone from deploying incompatible translator code. Connecting those controls requires deployment and behavioral tests owned by the application team.

Similarly, the versions displayed by the dashboard are observations, not transactional deployment pins. The local example has no deprecation-routing gate and no production authentication setup. The MCP registration is explicit in the runner, while A2A publication uses the extension's publisher.

| Responsibility | Owner in this example |
|---|---|
| Describe and publish capabilities | Agent/tool publisher |
| Store versions and check publication | Apicurio Registry |
| Select roles and sequence the work | Application code |
| Verify handoffs and remote behavior | Integration tests |
| Control which implementation is deployed | Deployment process |

## When a registry earns its place

If three services are released together by one team, configured URLs may be enough. A Registry becomes more useful when teams publish independently and callers need a shared place to inspect capabilities and their evolution.

The [implementation](https://github.com/carlesarnal/agent-discovery-demo/tree/talk/evidence-2026-10-23) includes the interactive flow and separate `test` and `smoke` commands. Stop the interactive runner before starting the smoke test; it creates its own services. The goal is not to remove application responsibility. It is to make the responsibility for discovery, publication and execution explicit enough to test.
