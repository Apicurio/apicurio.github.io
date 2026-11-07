---
layout: post
title: "Apicurio Registry 3.4 Preview: An MCP Registry API for MCP Servers"
description: "Apicurio Registry 3.4 adds a Developer Preview of the MCP Registry API v0.1: publish, list and version MCP server definitions with the same rules and governance as your schemas."
author: carlesarnal
categories: registry ai mcp
---

The Model Context Protocol community has defined a registry API for publishing and finding MCP servers. Apicurio
Registry 3.4 implements it as a Developer Preview at `/apis/mcp-registry/v0.1`. If you already run Apicurio Registry
for schemas, you can now keep your MCP server catalog in the same place, with the same versioning, rules and access
control.

---

# Three MCP features, not one

Apicurio Registry now has three MCP-related features, and they are easy to mix up:

| Feature | What it does |
|---|---|
| **MCP server** | A separate container that exposes Apicurio Registry *to* LLM clients as MCP tools. |
| **MCP tool definitions** | `MCP_TOOL` artifacts with validation and breaking-change detection on tool input schemas, served at `/.well-known/mcp-tools`. |
| **MCP Registry API** (new) | The upstream MCP Registry API, storing each server's manifest as an `MCP_SERVER` artifact. |

This post is about the third one. See [What is an MCP registry?](/registry/ai/mcp-registry/) for how they fit together.

# Enabling it

The API is experimental. Enable experimental features and the API itself:

```properties
apicurio.features.experimental.enabled=true
apicurio.mcp-registry.enabled=true
```

or, as container environment variables, `APICURIO_FEATURES_EXPERIMENTAL_ENABLED=true` and
`APICURIO_MCP_REGISTRY_ENABLED=true`.

# How servers map to artifacts

MCP server names are reverse-DNS, such as `io.github.example/weather`. Apicurio Registry maps the part before the
slash to a group and the rest to an artifact ID, so this server becomes artifact `weather` in group
`io.github.example`, of type `MCP_SERVER`. Each published version is an artifact version.

That mapping is the point of the feature. Because servers are artifacts, everything that already works for artifacts
works for them: the web console, labels, the native v3 REST API, and rules. A compatibility rule, for example, treats
removing or changing an existing connection option as a breaking change, while still allowing package version and
hash upgrades.

# Publishing and reading

Publish a server with `POST /apis/mcp-registry/v0.1/publish`. The manifest is validated against the upstream
server schema (the 2025-12-11 version bundled with the registry) and against any rules you have configured.
Manifests are limited to 1 MiB.

Read one version:

```bash
curl 'http://localhost:8080/apis/mcp-registry/v0.1/servers/io.github.example%2Fweather/versions/1.0.0'
```

```json
{
  "server": {
    "name": "io.github.example/weather",
    "version": "1.0.0",
    "description": "Weather forecasts"
  },
  "_meta": {
    "io.modelcontextprotocol.registry/official": {
      "status": "active",
      "isLatest": true
    }
  }
}
```

The server definition and the registry's own metadata are kept apart: `server` is what you published, `_meta` is
what the registry knows about it.

List servers with `GET /apis/mcp-registry/v0.1/servers`. Useful filters:

- `version=latest` returns only the newest version of each server;
- `search` matches names and descriptions;
- `updated_since` takes an RFC 3339 timestamp, for incremental sync;
- `include_deleted=true` includes deleted records.

Page through results with `metadata.nextCursor`.

# Things to know

- **Deletion is soft.** `DELETE` marks a version deleted and keeps its content and history; you can restore it by
  changing its status. Permanent deletion only happens through the native v3 API, and only if that is enabled.
- **Versions are immutable.** `PUT` returns 501, as the upstream API allows; publish a new version instead.
- **Publishing doesn't contact the server.** The registry stores the manifest; it does not connect to the server or
  import its tools.
- **Read-only storage stays read-only.** With GitOps or KubernetesOps storage, writes return 501.

# Try it and tell us

This is a Developer Preview, and the upstream API is itself at v0.1, so details will change. The
[MCP Registry API documentation](/registry/docs/apicurio-registry/3.4.x/getting-started/assembly-mcp-registry-api.html)
has the full reference. Feedback is welcome on [CNCF Slack](https://cloud-native.slack.com/archives/C0BDWTC1DTM)
or in [GitHub Discussions](https://github.com/Apicurio/apicurio-registry/discussions).
