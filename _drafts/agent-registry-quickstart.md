---
layout: post
title: "Build an Agent Registry in Five Minutes with Apicurio Registry"
description: "Run Apicurio Registry as an A2A agent registry with Docker Compose: register an agent card, discover agents by skill, and connect Claude Desktop through MCP."
author: carlesarnal
categories: registry ai agents a2a mcp
---
{%- include registry/_docs-version.html -%}

Once you have more than a handful of AI agents, something has to answer the question "which agent can do this?".
That is the job of an [agent registry](/registry/ai/agent-registry/). This post walks through running Apicurio
Registry as one: start it with A2A support, register an agent card, find it by skill, and then point Claude Desktop at
the registry through MCP.

---

# What you get

Apicurio Registry plays two roles here. It is an **agent registry**: it stores A2A agent cards as `AGENT_CARD`
artifacts and serves them from `/.well-known/agents`. It is also an **A2A agent** itself, with its own card at
`/.well-known/agent.json` advertising skills such as schema validation and compatibility checking.

Because agent cards are ordinary artifacts, they get everything other artifacts get: versions, labels, rules, the web
console and access control.

A2A support is experimental, so it is off by default. You turn it on with two flags.

# 1. Start the registry

Create a `docker-compose.yml`:

```yaml
services:
  apicurio-registry:
    image: quay.io/apicurio/apicurio-registry:latest
    ports:
      - "8080:8080"
    environment:
      APICURIO_FEATURES_EXPERIMENTAL_ENABLED: "true"
      APICURIO_A2A_ENABLED: "true"
  apicurio-registry-ui:
    image: quay.io/apicurio/apicurio-registry-ui:latest
    ports:
      - "8888:8080"
    environment:
      REGISTRY_API_URL: "http://localhost:8080/apis/registry/v3"
```

Start it and check that the A2A endpoint answers:

```bash
docker compose up -d
curl http://localhost:8080/.well-known/agent.json
```

The response is the registry's own agent card, listing its built-in skills: `schema-validation`, `schema-search`,
`artifact-management`, `compatibility-check` and `agent-discovery`.

# 2. Register an agent card

Create a group for your agents, then register a card in it:

```bash
curl -X POST http://localhost:8080/apis/registry/v3/groups \
  -H "Content-Type: application/json" \
  -d '{"groupId": "ai-agents", "description": "AI agent cards"}'

curl -X POST http://localhost:8080/apis/registry/v3/groups/ai-agents/artifacts \
  -H "Content-Type: application/json" \
  -d '{
    "artifactId": "customer-support-agent",
    "artifactType": "AGENT_CARD",
    "firstVersion": {
      "version": "1.0.0",
      "content": {
        "contentType": "application/json",
        "content": "{\"name\": \"Customer Support Agent\", \"description\": \"Handles customer inquiries\", \"version\": \"1.0.0\", \"supportedInterfaces\": [{\"url\": \"http://support-agent:9001\", \"protocolBinding\": \"http+json\", \"protocolVersion\": \"1.0\"}], \"provider\": {\"organization\": \"Acme Corp\", \"url\": \"https://acme.example.com\"}, \"skills\": [{\"id\": \"sentiment-analysis\", \"name\": \"Sentiment Analysis\", \"description\": \"Analyzes customer message sentiment\"}], \"capabilities\": {\"streaming\": false, \"pushNotifications\": false}, \"defaultInputModes\": [\"text\"], \"defaultOutputModes\": [\"text\"]}"
      }
    }
  }'
```

The card is validated on the way in, like any other artifact. When the agent gains a skill, publish a new version of
the same artifact rather than a new artifact, and the history stays in one place.

# 3. Discover agents

An orchestrator does not need to know group or artifact IDs. It asks for what it needs:

```bash
# by skill
curl "http://localhost:8080/.well-known/agents?skill=sentiment-analysis"

# by name
curl "http://localhost:8080/.well-known/agents?name=Customer"

# a specific card
curl "http://localhost:8080/.well-known/agents/ai-agents/customer-support-agent"
```

You can also filter by `capability` (for example `streaming:true`), `inputMode` and `outputMode`, and page with
`offset` and `limit`. The web console at `http://localhost:8888` shows the same cards.

# 4. Connect Claude Desktop

The Apicurio Registry MCP server lets an LLM client work with the registry directly. In Claude Desktop, open
**Settings > Developer > Edit Config** and add:

```json
{
  "mcpServers": {
    "Apicurio Registry": {
      "command": "docker",
      "args": ["run", "-i", "--rm",
               "-e", "REGISTRY_URL=http://host.docker.internal:8080",
               "quay.io/apicurio/apicurio-registry-mcp-server:latest"]
    }
  }
}
```

`host.docker.internal` lets the MCP server container reach the registry on your machine with Docker Desktop; on
other setups, use whatever URL reaches the registry from inside a container. Restart Claude Desktop and ask "What
groups are present in Apicurio Registry?". The MCP server starts in safe mode (`APICURIO_MCP_SAFE_MODE`); see the
[MCP server documentation](/registry/docs/apicurio-registry/{{ registry_docs_version }}/getting-started/assembly-mcp-server-integration.html)
for what it allows.

# Where to go next

- [A2A protocol features](/registry/docs/apicurio-registry/{{ registry_docs_version }}/getting-started/assembly-a2a-features.html), including the visibility labels that control who can see which cards
- [Agent discovery and multi-agent orchestration](/registry/docs/apicurio-registry/{{ registry_docs_version }}/getting-started/assembly-agent-discovery-patterns.html)
- [Apicurio Registry for AI agents](/registry/ai/)
