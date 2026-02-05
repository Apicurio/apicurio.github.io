---
layout: post
title: "Apicurio Registry goes AI-Native: Introducing Agent Registry, MCP Server, and LLM artifact support"
date: 2026-02-05 12:00:00
author: carlesarnal
categories: apicurio registry ai agents mcp a2a llm
---

The world of software is undergoing a fundamental shift. AI agents are no longer experimental curiosities—they're becoming the backbone of modern enterprise workflows. From customer service automation to complex data analysis pipelines, organizations are deploying fleets of specialized AI agents that need to discover each other, communicate reliably, and evolve without breaking.

Today, we're excited to announce that **Apicurio Registry is evolving into an AI-native platform**, becoming the first open-source registry to offer comprehensive support for the AI agent ecosystem.

---

# Why Apicurio Registry for AI?

For years, Apicurio Registry has been the trusted solution for managing API schemas—OpenAPI, AsyncAPI, Avro, Protobuf, JSON Schema, and more. Organizations rely on it for schema validation, versioning, compatibility enforcement, and governance.

It turns out these same principles apply directly to AI agents:

| Traditional Schema Registry | AI Agent Registry          |
|-----------------------------|----------------------------|
| API contracts               | Agent capabilities         |
| Schema validation           | Prompt/response validation |
| Version compatibility       | Agent evolution            |
| Service discovery           | Agent discovery            |
| Governance & audit          | Compliance & traceability  |

Rather than building something new, we extended what we already do best. Apicurio Registry now treats AI artifacts—Agent Cards, prompts, and model schemas—as first-class citizens alongside traditional schemas.

# What's new: Phase 1 complete

We're launching with three major capabilities that are fully implemented and production-ready:

### 1. Agent card Registry (A2A protocol support)

The [A2A (Agent-to-Agent) protocol](https://a2a-protocol.org/) defines a standard way for AI agents to describe themselves and discover each other. Apicurio Registry now supports `AGENT_CARD` as a native artifact type.

**What you can do:**
- Store and version Agent Cards with full JSON Schema validation
- Discover agents via `/.well-known/agent.json` endpoints
- Search agents by capability, skill, or mode
- Enforce compatibility rules as agents evolve
- Track changes for compliance and auditing

```bash
# Register an agent card
curl -X POST http://registry:8080/apis/registry/v3/groups/my-agents/artifacts \
  -H "Content-Type: application/json" \
  -H "X-Registry-ArtifactType: AGENT_CARD" \
  -d @my-agent-card.json

# Discover agents via A2A protocol
curl http://registry:8080/.well-known/agent.json
```

### 2. MCP server integration

The [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) is becoming the standard for LLMs to interact with external tools and data. Apicurio Registry now includes a built-in MCP Server that lets AI models directly access the registry.

**What your AI agents can do:**
- Discover schemas by name, type, or capability
- Retrieve schema content for validation
- Create and update schemas programmatically
- Validate data against registered schemas
- Manage groups and versions

**Claude Desktop integration** is already documented—simply add Apicurio Registry as an MCP tool and your AI assistant can query schemas, validate payloads, and register new artifacts directly through natural language.

```json
{
  "mcpServers": {
    "apicurio-registry": {
      "command": "java",
      "args": ["-jar", "apicurio-registry-mcp.jar"],
      "env": {
        "REGISTRY_URL": "http://localhost:8080"
      }
    }
  }
}
```

### 3. LLM artifact types

Managing prompts and model schemas is one of the biggest operational challenges in production AI systems. Apicurio Registry introduces two new artifact types designed specifically for LLM workflows:

**PROMPT_TEMPLATE**
- Store version-controlled prompt templates with `{{variable}}` placeholders
- Define input variables with types, defaults, and validation rules
- Render prompts with values via the registry API
- A/B test prompt variations without code changes
- Rollback instantly when a prompt underperforms

**MODEL_SCHEMA**
- Define input/output schemas for LLM agents
- Validate agent responses against expected formats
- Catch schema mismatches before runtime
- Track schema evolution with compatibility checking

```json
{
  "$schema": "https://registry.apicur.io/schemas/prompt-template.json",
  "name": "customer-response-generator",
  "template": "You are a helpful support agent. The customer said: {{message}}. Their sentiment is {{sentiment}}. Generate an empathetic response.",
  "variables": {
    "message": { "type": "string", "required": true },
    "sentiment": { "type": "string", "enum": ["positive", "neutral", "negative"] }
  },
  "metadata": {
    "model": "gpt-4",
    "temperature": 0.7
  }
}
```

**SDKs are ready** for both Python (LangChain, LlamaIndex) and Java (LangChain4j, Quarkus), making integration straightforward.

# See it in Action: Multi-Agent context chaining

To demonstrate these capabilities working together, we've created a comprehensive example: [A2A Real-World Integration Demo](https://github.com/Apicurio/apicurio-registry/tree/main/examples/a2a-real-world-integration).

This demo shows a real-world scenario: processing customer complaints through a pipeline of specialized AI agents:

```
Customer Complaint
       │
       ▼
┌──────────────────┐
│  Sentiment Agent │  Analyzes emotional tone
│  Input: message  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Analyzer Agent  │  Extracts issues, priority
│  Input: message  │
│       + sentiment│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Response Agent  │  Generates empathetic reply
│  Input: message  │
│       + sentiment│
│       + analysis │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Translation Agent│  Translates to Spanish
│  Input: response │
└──────────────────┘
```

**The key innovation: context chaining.** Each agent receives not just the original message, but the outputs of all previous agents. The Response Agent knows the customer's sentiment AND the analyzed issues, enabling truly contextual responses.

All agents are registered in Apicurio Registry with:
- **AGENT_CARD** artifacts describing their capabilities
- **PROMPT_TEMPLATE** artifacts for their system prompts
- **MODEL_SCHEMA** artifacts validating their inputs and outputs

Running the demo is simple:

```bash
cd examples/a2a-real-world-integration
docker-compose up -d
mvn clean compile exec:java
open http://localhost:9000  # Web UI
```

You'll see agents discover each other through the registry, validate their communications against registered schemas, and pass accumulated context through the pipeline.

# What's coming next

This is just the beginning. Our roadmap includes:

**Phase 2: Advanced A2A Features**
- DID and Verifiable Credentials for federated trust
- Auto-generate Agent Cards from OpenAPI `x-agent-*` extensions
- JSON-LD and `potentialAction` discovery

**Phase 3: Agent Ecosystem Expansion**
- Agent lifecycle management (health monitoring, status tracking)
- MCP Tool Definition artifact type
- Agent Workflow Definition artifact type
- Semantic search for natural language agent discovery
- Agent deployment pipeline integration

# Get started today

Apicurio Registry with AI support is available now:

1. **Try the demo**: Clone the repository and run the [A2A real-world integration example](https://github.com/Apicurio/apicurio-registry/tree/main/examples/a2a-real-world-integration)

2. **Deploy the registry**: Use our [container images](https://quay.io/repository/apicurio/apicurio-registry) or [Operator](https://github.com/Apicurio/apicurio-registry-operator)

3. **Read the docs**: Check the [MCP Server README](https://github.com/Apicurio/apicurio-registry/tree/main/mcp) for integration details

4. **Join the discussion**: Follow [the epic](https://github.com/Apicurio/apicurio-registry/issues/6991) to track progress and contribute ideas

# A natural evolution

What makes this evolution "natural" is that we didn't bolt on AI support as an afterthought. The same principles that make Apicurio Registry valuable for API governance—versioning, validation, compatibility, discovery, audit—apply directly to managing AI agents at scale.

As AI agents become essential infrastructure, they need the same level of governance that APIs have today. Apicurio Registry is ready to provide it.

---

*The Apicurio team is committed to making schema and artifact management seamless for the AI era. We'd love to hear your feedback and use cases—open an issue or join us in the discussions.*
