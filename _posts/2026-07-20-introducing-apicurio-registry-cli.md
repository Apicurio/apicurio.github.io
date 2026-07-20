---
layout: post
title: "Introducing the Apicurio Registry CLI"
date: 2026-07-20 12:00:00
author: vandanayadav
categories: registry cli authentication
---

Managing schemas and APIs from a web UI works great for browsing and one-off edits, but when you need to automate workflows, integrate with CI/CD pipelines, or just move fast from the terminal, you need a command-line tool. **Apicurio Registry CLI** (`acr`) brings the full power of Apicurio Registry to your terminal — artifact management, version control, content validation rules, search, authentication, and role-based access control, all from a single native binary.

---

# Getting Started

The CLI ships as a **GraalVM native executable** — no JVM required. Download the ZIP for your platform from [GitHub Releases](https://github.com/Apicurio/apicurio-registry/releases), extract it, and run the installer:

```bash
unzip apicurio-registry-cli-*.zip
cd apicurio-registry-cli-*
./acr install
```

The installer copies the binary to `~/.apicurio/apicurio-registry-cli`, adds it to your `PATH`, and sets up **shell completions** for bash (Linux) and zsh (macOS). Restart your terminal, then verify:

```bash
acr version
```

The CLI also **auto-updates** — it checks for new versions once a day and notifies you when one is available. You can update manually with `acr update`, check without installing with `acr update --check`, or postpone notifications with `acr update --postpone`.

# Connecting to a Registry

Start a local Apicurio Registry instance:

```bash
docker run -d -p 8080:8080 quay.io/apicurio/apicurio-registry:latest
```

Create a **context** — a named connection to a registry instance:

```bash
acr context create local http://localhost:8080
```

Contexts store the registry URL, optional default group and artifact IDs, and authentication settings. You can manage multiple registries — dev, staging, production — and switch between them:

```bash
acr context create staging https://registry.staging.example.com
acr context create production https://registry.prod.example.com

acr context use staging
acr context
```

The last command lists all contexts, marking the active one with `*`.

# Managing Groups

**Groups** organize related artifacts — think of them as folders or namespaces. Every artifact belongs to a group (the `default` group is used when none is specified).

```bash
acr group create payments --description "Payment service schemas"

acr group
```

Update a group's metadata or labels:

```bash
acr group update payments --description "Payment and billing schemas" --set-label team=platform

acr group get payments
```

# Working with Artifacts

Create an Avro schema file:

```bash
cat > order.avsc << 'EOF'
{
  "type": "record",
  "name": "Order",
  "namespace": "com.example",
  "fields": [
    {"name": "orderId", "type": "string"},
    {"name": "customerId", "type": "string"},
    {"name": "amount", "type": "double"},
    {"name": "status", "type": {"type": "enum", "name": "Status", "symbols": ["PENDING", "CONFIRMED", "SHIPPED"]}}
  ]
}
EOF
```

Register it:

```bash
acr artifact create order-schema -g payments --type AVRO -f order.avsc
```

The CLI **auto-detects content type** from the file extension — `.json` and `.avsc` map to `application/json`, `.proto` to `application/x-protobuf`, `.yaml` to `application/x-yaml`, `.graphql` to `application/graphql`. You can also pipe content from stdin:

```bash
cat order.avsc | acr artifact create order-schema -g payments --type AVRO -f -
```

List, get, and update artifacts:

```bash
acr artifact -g payments

acr artifact get order-schema -g payments

acr artifact update order-schema -g payments --name "Order Schema" --description "Order event format" --set-label env=prod
```

# Version Management

Artifacts support multiple **versions**. Each time you register new content for an artifact, a new version is created:

```bash
acr artifact version create -a order-schema -g payments -f order-v2.avsc --name "v2" --description "Added shipping address"
```

List and inspect versions:

```bash
acr artifact version -a order-schema -g payments

acr artifact version get 1 -a order-schema -g payments
```

Update version metadata and manage **state transitions** — mark versions as deprecated or disabled to signal consumers:

```bash
acr artifact version update 1 -a order-schema -g payments --state DEPRECATED
```

You can also create **draft versions** that allow content updates before being finalized:

```bash
acr artifact version create -a order-schema -g payments -f draft.avsc --draft
```

# Content Validation Rules

Rules enforce content quality at three levels: **global** (all artifacts), **group** (all artifacts in a group), and **artifact** (a single artifact).

Set a validity rule to reject malformed schemas:

```bash
acr rule create VALIDITY -c FULL
```

Now any attempt to register invalid content will fail with a clear error. You can also enforce **compatibility rules** to prevent breaking changes between versions:

```bash
acr artifact rule create COMPATIBILITY -c BACKWARD -g payments -a order-schema
```

Manage rules at any level:

```bash
acr rule                                                    # list global rules
acr group rule -g payments                                  # list group rules
acr artifact rule -g payments -a order-schema               # list artifact rules
```

# Search

Find artifacts across your registry using filters:

```bash
acr search artifact --name "order*"

acr search artifact --label env=prod

acr search artifact --type AVRO -g payments
```

Search for versions by state:

```bash
acr search version --state DEPRECATED -a order-schema -g payments
```

Search by content — find which artifact matches a given schema file:

```bash
acr search content -f order.avsc --type AVRO
```

All search commands support **JSON output** for scripting:

```bash
acr search artifact --name "order*" -o json | jq '.[].artifactId'
```

# Authentication

When the CLI was first introduced, it could only connect to **unsecured** registry instances. That's fine for local development, but production registries require authentication. The CLI now supports two authentication methods: **Basic Auth** and **OAuth2 Client Credentials**.

## Basic Auth

With Basic Auth, your username and password are sent with **every request** as a Base64-encoded `Authorization` header. The registry delegates credential validation to **Keycloak**.

```bash
acr login --username admin --password secret
```

The login flow stores the username and auth type in `config.json`, and the password in your **OS Keychain** (macOS Keychain or Linux Secret Service) — never in plain text config files.

On every subsequent request, the CLI reads the username from config, retrieves the password from the Keychain, and sends the `Authorization: Basic` header. The registry forwards credentials to Keycloak for validation and returns either the requested data or `401 Unauthorized`.

Basic Auth is simple to set up and ideal for **development and testing**.

## OAuth2 Client Credentials

Unlike Basic Auth, your credentials are sent to Keycloak **only once** — to obtain a short-lived access token (5 minutes by default). Every request after that carries just the token. When it expires, the Apicurio Java SDK **refreshes it automatically**.

```bash
acr login \
  --token-endpoint http://localhost:8180/realms/registry/protocol/openid-connect/token \
  --client-id registry-api \
  --client-secret <secret>
```

The login flow stores the client ID and token endpoint in `config.json`, and the client secret in the OS Keychain. On each request, the CLI obtains a token from Keycloak (cached until expiry), then sends it as a `Authorization: Bearer` header. The registry verifies the token directly — no Keycloak call needed per request.

OAuth2 Client Credentials is recommended for **production and CI/CD**.

## Choosing Between Them

|                      | Basic Auth                           | OAuth2 Client Credentials         |
|----------------------|--------------------------------------|-----------------------------------|
| What's sent          | Username + password on every request | Token (obtained once)             |
| Who authenticates    | A person                             | An application                    |
| Credential exposure  | Every request                        | Only the first request            |
| Token expiry         | N/A — password is long-lived         | 5 min default, auto-refreshed    |
| Best for             | Development, testing                 | Production, CI/CD                 |

## Credential Storage Without OS Keychain

CI/CD pipelines, containers, and remote SSH sessions don't have an OS Keychain. Without a fallback, the CLI would be unusable in these environments. The `--allow-unsafe-credential-storage` flag enables **file-based storage**:

```bash
acr login --username admin --password secret --allow-unsafe-credential-storage
```

Credentials are stored in `credentials.json` with **0600 Unix permissions** (owner read/write only). The flag is saved in config, so subsequent commands don't need it again. If a keychain *is* available, it is always preferred — the flag is a fallback, not a force.

## Logout

To clear credentials and disconnect:

```bash
acr logout
```

This deletes secrets from the Keychain (or `credentials.json`), clears auth config from `config.json`, and resets the SDK client. Any subsequent registry command will connect without authentication.

## RBAC Role Mapping

**Role-Based Access Control** lets you define what each user can do:

| Role        | What they can do                                    |
|-------------|-----------------------------------------------------|
| ADMIN       | Everything — artifacts, rules, role mappings, config |
| DEVELOPER   | Create and modify artifacts and versions             |
| READ_ONLY   | View only — no create, update, or delete             |

The first admin is configured in Keycloak. Use `acr role` to manage additional users:

```bash
acr role create alice DEVELOPER --name "Alice Smith"

acr role                            # list all
acr role get alice                  # details
acr role update alice --role ADMIN  # change role
acr role delete alice               # remove
```

# Tips and Tricks

**JSON output for scripting** — every command supports `-o json`:

```bash
acr artifact -g payments -o json | jq '.[].artifactId'
```

**Column selection** — show only the columns you care about:

```bash
acr artifact -g payments --columns artifactId,name,artifactType
```

**Context defaults** — set a default group and artifact so you don't have to type them every time:

```bash
acr context update --group payments --artifact order-schema
acr artifact get    # uses payments/order-schema automatically
```

**Version comments** — annotate versions with review notes:

```bash
acr artifact version comment create -a order-schema -g payments -v 1 -m "Reviewed and approved for production"
```

**Export and import** — back up or migrate your entire registry:

```bash
acr admin export -f registry-backup.zip
acr admin import -f registry-backup.zip
```

# What's Next

The CLI is currently in **dev-preview** — it's fully functional but its interface may change as we stabilize it. We're actively developing new features as part of the [CLI Phase 2 epic](https://github.com/Apicurio/apicurio-registry/issues/7162).

We welcome feedback and contributions. If you run into issues or have feature requests, open an issue on [GitHub](https://github.com/Apicurio/apicurio-registry/issues).

# Try It Out

Start a registry and try the CLI in under a minute:

```bash
docker run -d -p 8080:8080 quay.io/apicurio/apicurio-registry:latest
```

Download the CLI from [GitHub Releases](https://github.com/Apicurio/apicurio-registry/releases) and check out the [CLI README](https://github.com/Apicurio/apicurio-registry/blob/main/cli/README.md) for the full command reference.
