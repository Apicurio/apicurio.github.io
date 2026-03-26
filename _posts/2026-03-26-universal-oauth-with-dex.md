---
layout: post
title: "Beyond OpenShift: Making Apicurio Registry Work with Any OAuth Provider via Dex"
date: 2026-03-26 12:00:00
author: carlesarnal
categories: registry authentication oauth dex oidc
---

In a [previous post]({% post_url 2026-03-17-openshift-oauth-integration %}), we showed how to connect Apicurio Registry directly to OpenShift's built-in OAuth server. It worked for API-level authentication and role-based authorization, but three important features were broken: UI login, principal identity (artifact ownership), and owner-based authorization. And it only worked on OpenShift.

We wanted to do better. We wanted a solution that works with **any** OAuth provider — OpenShift, LDAP, GitHub, Azure AD, SAML, you name it — while unlocking the full set of Apicurio Registry features. This post covers how we got there using [Dex](https://dexidp.io/).

---

# Where We Left Off

The direct OpenShift integration was a clever hack: we pointed Quarkus OIDC's userinfo endpoint at the Kubernetes User API, which validated opaque tokens and returned group membership. But OpenShift's OAuth server is not OIDC-compliant, and that caused three hard problems:

| Feature | Direct Integration | Why It Breaks |
|---------|:---:|---|
| UI login | No | `oidc-client-ts` requires `/.well-known/openid-configuration`, which OpenShift doesn't serve |
| Principal identity | No | Username is nested in `metadata.name`; Quarkus only reads top-level fields from UserInfo |
| Owner-based authz | No | Depends on principal identity |

These aren't minor gaps. Without UI login, your users can't access the Registry through a browser. Without principal identity, every artifact shows `owner: ""` — you can't track who created what. And without owner-based authorization, you can't enforce policies like "only the creator can modify this artifact."

We needed a different approach.

# Enter Dex: A Federated OIDC Bridge

[Dex](https://dexidp.io/) is an identity service that speaks standard OIDC on the front end and connects to upstream identity providers via pluggable **connectors**. It acts as a protocol translator — your application talks to Dex using standard OIDC, and Dex handles the quirks of whatever identity provider you actually have.

```
                     OIDC (standard)              Upstream protocol
User --> Apicurio ----------------------> Dex --------------------------> OpenShift / LDAP / GitHub / etc.
              |                            |
              |  /.well-known/...    OK    |  Connector handles
              |  JWT tokens          OK    |  protocol translation
              |  JWKS                OK    |
              |  Flat claims         OK    |
```

This is the key insight: **instead of trying to make Apicurio Registry speak every non-standard OAuth dialect, we put a standards-compliant OIDC layer in front of whatever you already have.** Dex handles the translation, and Apicurio just talks OIDC like it was designed to.

# What This Unlocks

With Dex in the middle, here's what changes:

| Feature | Direct OpenShift OAuth | Via Dex |
|---------|:---:|:---:|
| Token validation | Yes | Yes |
| Anonymous reads | Yes | Yes |
| Role-based authorization | Yes | Yes |
| **UI login flow** | **No** | **Yes** |
| **Principal identity** | **No** | **Yes** |
| **Owner-based authorization** | **No** | **Yes** |
| Multi-provider federation | No | Yes |
| Standard OIDC compliance | No | Yes |
| **Client credentials grant (M2M)** | **N/A** | **Partial** (no groups) |

Every user-facing feature that was broken now works. And as a bonus, you get multi-provider federation — Dex can authenticate against multiple upstream providers simultaneously.

# How to Set It Up

## Deploy Dex

The fastest way is via Helm:

```bash
helm repo add dex https://charts.dexidp.io
helm repo update
kubectl create namespace dex
```

Create a `dex-values.yaml` with your configuration:

```yaml
config:
  issuer: https://dex.<cluster-domain>

  storage:
    type: kubernetes
    config:
      inCluster: true

  web:
    http: 0.0.0.0:5556
    # CORS: Required so the Apicurio UI (oidc-client-ts) can fetch
    # /.well-known/openid-configuration from a different origin.
    allowedOrigins:
      - "https://<registry-ui-route>"

  oauth2:
    skipApprovalScreen: true
    responseTypes: [code, token, id_token]

  # Two clients are needed:
  # - A PUBLIC client for the browser UI (oidc-client-ts cannot hold secrets)
  # - A CONFIDENTIAL client for CLI/API token exchange
  staticClients:
    - id: apicurio-registry-ui
      name: Apicurio Registry UI
      public: true
      redirectURIs:
        - "https://<registry-ui-route>/"
        - "https://<registry-ui-route>/dashboard"
    - id: apicurio-registry
      name: Apicurio Registry API
      secret: <GENERATE_A_SECURE_SECRET>
      redirectURIs:
        - "https://<registry-ui-route>/"
        - "https://<registry-app-route>/"

  connectors: []  # We'll configure these next

ingress:
  enabled: true
  hosts:
    - host: dex.<cluster-domain>
      paths:
        - path: /
          pathType: Prefix
```

```bash
helm install dex dex/dex -n dex -f dex-values.yaml
```

On OpenShift, create a Route instead of using Ingress:

```bash
oc create route edge dex --service=dex --port=5556 --hostname=dex.<cluster-domain> --namespace=dex
```

Verify OIDC discovery works:

```bash
curl -sk https://dex.<cluster-domain>/.well-known/openid-configuration | jq .issuer
# Expected: "https://dex.<cluster-domain>"
```

## Configure a Connector

This is where Dex becomes powerful — you pick the connector that matches your identity provider. Here are the most common options:

### OpenShift

First, create an OAuthClient for Dex (not for Apicurio — Dex is the OAuth client now):

```bash
CLIENT_SECRET=$(openssl rand -base64 32 | tr -d '=' | head -c 32)

cat <<EOF | kubectl apply -f -
apiVersion: oauth.openshift.io/v1
kind: OAuthClient
metadata:
  name: dex
grantMethod: auto
secret: "$CLIENT_SECRET"
redirectURIs:
  - "https://dex.<cluster-domain>/callback"
EOF
```

Then add the connector:

```yaml
connectors:
  - type: openshift
    id: openshift
    name: OpenShift
    config:
      issuer: https://api.<cluster-domain>:6443
      clientID: dex
      clientSecret: "<CLIENT_SECRET>"
      redirectURI: https://dex.<cluster-domain>/callback
      groups:
        - registry-admins
        - registry-developers
        - registry-readers
      insecureCA: true
```

### LDAP

```yaml
connectors:
  - type: ldap
    id: ldap
    name: LDAP
    config:
      host: ldap.example.com:636
      bindDN: cn=admin,dc=example,dc=com
      bindPW: <bind-password>
      userSearch:
        baseDN: ou=users,dc=example,dc=com
        filter: "(objectClass=person)"
        username: uid
        idAttr: uid
        emailAttr: mail
        nameAttr: cn
      groupSearch:
        baseDN: ou=groups,dc=example,dc=com
        filter: "(objectClass=groupOfNames)"
        userMatchers:
          - userAttr: DN
            groupAttr: member
        nameAttr: cn
```

### GitHub

```yaml
connectors:
  - type: github
    id: github
    name: GitHub
    config:
      clientID: <github-oauth-app-client-id>
      clientSecret: <github-oauth-app-client-secret>
      redirectURI: https://dex.<cluster-domain>/callback
      orgs:
        - name: Apicurio
          teams:
            - registry-admins
            - registry-developers
```

### Microsoft / Azure AD

```yaml
connectors:
  - type: microsoft
    id: microsoft
    name: Microsoft
    config:
      clientID: <azure-app-client-id>
      clientSecret: <azure-app-client-secret>
      redirectURI: https://dex.<cluster-domain>/callback
      tenant: <azure-tenant-id>
      groups:
        - registry-admins-group-uuid
        - registry-developers-group-uuid
```

### SAML 2.0

```yaml
connectors:
  - type: saml
    id: saml
    name: Corporate SSO
    config:
      ssoURL: https://idp.example.com/sso
      ca: /etc/dex/saml-ca.crt
      redirectURI: https://dex.<cluster-domain>/callback
      usernameAttr: name
      emailAttr: email
      groupsAttr: groups
```

After adding your connector, upgrade the release:

```bash
helm upgrade dex dex/dex -n dex -f dex-values.yaml
```

## Deploy Apicurio Registry

Now the Registry CR becomes much simpler — no more OIDC workarounds, just a standard OIDC configuration pointing at Dex:

```yaml
apiVersion: registry.apicur.io/v1
kind: ApicurioRegistry3
metadata:
  name: apicurio-registry
  namespace: apicurio-registry
spec:
  app:
    ingress:
      host: apicurio-registry-app-apicurio-registry.apps.<cluster-domain>
      # On OpenShift, this annotation enables edge TLS termination on the Route,
      # so the app is served over HTTPS with automatic HTTP -> HTTPS redirect.
      annotations:
        route.openshift.io/termination: edge
    auth:
      enabled: true
      # Both must point to the PUBLIC Dex client so the backend accepts
      # tokens with aud=apicurio-registry-ui issued by the browser flow.
      appClientId: apicurio-registry-ui
      uiClientId: apicurio-registry-ui
      authServerUrl: "https://dex.<cluster-domain>"
      # Explicit redirect URI prevents oidc-client-ts from using the current
      # page URL (which may contain stale ?code=...&state=... query params),
      # fixing silent token refresh failures.
      redirectUri: "https://<registry-ui-route>/"
      anonymousReadsEnabled: true
      tls:
        tlsVerificationType: "none"
      authz:
        enabled: true
        readAccessEnabled: true
        ownerOnlyEnabled: true       # This WORKS now!
        groupAccessEnabled: false
        roles:
          source: token
          admin: "registry-admins"
          developer: "registry-developers"
          readOnly: "registry-readers"
        adminOverride:
          enabled: true
          from: token
          type: role
          role: "registry-admins"
    env:
      - name: QUARKUS_OIDC_AUTHENTICATION_SCOPES
        value: "openid,email,profile,groups"
      - name: QUARKUS_OIDC_ROLES_ROLE_CLAIM_PATH
        value: "groups"
      - name: QUARKUS_OIDC_TOKEN_PRINCIPAL_CLAIM
        value: "email"
      # The UI scope defaults to "openid profile email" which does NOT include
      # groups. Without this, Dex won't include group membership in the token
      # and RBAC will deny all write operations.
      - name: APICURIO_UI_AUTH_OIDC_SCOPE
        value: "openid profile email groups"
  ui:
    ingress:
      host: apicurio-registry-ui-apicurio-registry.apps.<cluster-domain>
      annotations:
        route.openshift.io/termination: edge
    env:
      # The operator hardcodes http:// for REGISTRY_API_URL.
      # Override it to use HTTPS since we enabled edge TLS on the app route.
      - name: REGISTRY_API_URL
        value: "https://apicurio-registry-app-apicurio-registry.apps.<cluster-domain>/apis/registry/v3"
```

There are a few important details in this CR worth calling out:

**Two-client architecture** — Both `appClientId` and `uiClientId` are set to `apicurio-registry-ui` (the public Dex client). The browser-based UI uses `oidc-client-ts`, which cannot securely hold a client secret. If you use a confidential client for the UI, the token exchange will fail with `Invalid client credentials`. The backend validates JWT signatures via the JWKS endpoint and doesn't need a client secret. The separate confidential client (`apicurio-registry`) is kept for CLI/API token exchange via curl or scripts.

**UI scope with `groups`** — The `APICURIO_UI_AUTH_OIDC_SCOPE` env var adds `groups` to the scope the UI requests from Dex. Without this, the default scope (`openid profile email`) doesn't include groups, and Dex won't put group membership in the token. RBAC then denies all write operations because it can't determine the user's role.

**Explicit `redirectUri`** — Without this, `oidc-client-ts` uses `window.location.href` as the redirect URI for silent token refresh. After the initial login, the URL may still contain `?code=...&state=...` query parameters, which don't match any registered redirect URI in Dex, causing a 400 error.

Notice what's **not** here compared to the direct OpenShift integration: no `QUARKUS_OIDC_DISCOVERY_ENABLED=false`, no `QUARKUS_OIDC_JWKS_PATH` pointing at the K8s API server, no `QUARKUS_OIDC_TOKEN_VERIFY_ACCESS_TOKEN_WITH_USER_INFO`. All of those workarounds are gone because Dex is a proper OIDC provider that supports standard discovery.

And notice what's **new**: `ownerOnlyEnabled: true` — owner-based authorization is enabled because principal identity works. The `QUARKUS_OIDC_TOKEN_PRINCIPAL_CLAIM` is set to `email`, which Dex populates as a flat top-level claim in the JWT. No more nested JSON issues.

## Verify Everything Works

```bash
# OIDC discovery
curl -sk https://dex.<cluster-domain>/.well-known/openid-configuration | jq .issuer

# Anonymous read
curl -sk https://<registry-app-route>/apis/registry/v3/system/info

# UI login — open in browser, click Login, authenticate via your upstream provider
# https://<registry-ui-route>

# Check that artifacts have an owner (principal identity works!)
curl -sk https://<registry-app-route>/apis/registry/v3/groups/my-group \
  -H "Authorization: Bearer $TOKEN" | jq .owner
# Expected: the user's email — NOT empty
```

# Machine-to-Machine (M2M) Access and Kafka SerDes

So far we've focused on the browser-based UI flow, but what about CI/CD pipelines, Kafka SerDes, and services that need to interact with the Registry API without a browser?

This is a critical question because **the Apicurio SerDes libraries only support `client_credentials` grant** — they hardcode `grant_type=client_credentials` with no alternative. Every Kafka producer or consumer using Apicurio SerDes to fetch or register schemas needs this grant type to work.

## Dex Now Supports `client_credentials` (Opt-In)

As of March 2026 ([PR #4583](https://github.com/dexidp/dex/pull/4583)), Dex supports `client_credentials` behind a feature flag. Enable it by setting an environment variable on the Dex deployment:

```yaml
# In the Dex Deployment spec
env:
  - name: DEX_CLIENT_CREDENTIAL_GRANT_ENABLED_BY_DEFAULT
    value: "true"
```

Then use the confidential client:

```bash
TOKEN_RESPONSE=$(curl -s -X POST "https://dex.<cluster-domain>/token" \
  --data-urlencode "grant_type=client_credentials" \
  --data-urlencode "client_id=apicurio-registry" \
  --data-urlencode "client_secret=<CLIENT_SECRET>" \
  --data-urlencode "scope=openid profile")

ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | jq -r .access_token)
```

## The Catch: No Groups in Client Credentials Tokens

Here's the problem: Dex's `client_credentials` tokens **do not include `groups` claims**. Since Apicurio Registry uses `groups` for RBAC (determining admin/developer/reader roles), M2M clients authenticating via `client_credentials` will have **no assigned role**.

What this means in practice:

| Scenario | Works? | Why |
|----------|:---:|-----|
| SerDes **reading** schemas (with `anonymousReadsEnabled: true`) | Yes | Anonymous reads bypass auth entirely |
| SerDes **registering** schemas | **No** | No role in token = write denied |
| CI/CD creating artifacts | **No** | No role in token = write denied |

## What Actually Works for Kafka SerDes

For the most common Kafka use case — **consumers fetching schemas** — you don't need `client_credentials` at all. Set `anonymousReadsEnabled: true` in the Apicurio CR and the SerDes can read schemas without any token. This is the recommended approach for read-heavy workloads.

For **schema registration** (typically done by developers or CI/CD, not by Kafka producers at runtime), use the authorization code flow with the confidential client and a service user that has the right groups:

```bash
# Non-interactive token acquisition using OpenShift challenge-based auth
# (See the full guide for the complete 6-step script)
TOKEN_RESPONSE=$(curl -s -X POST "https://dex.<cluster-domain>/token" \
  --data-urlencode "grant_type=authorization_code" \
  --data-urlencode "code=${DEX_CODE}" \
  --data-urlencode "client_id=apicurio-registry" \
  --data-urlencode "client_secret=<CLIENT_SECRET>" \
  --data-urlencode "redirect_uri=https://<registry-ui-route>/")

# This token WILL have groups because it went through the full user auth flow
ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | jq -r .access_token)
```

## When to Use Keycloak Instead

If your deployment requires M2M **write access** with proper RBAC — for example, if Kafka producers register schemas at runtime, or if you have many CI/CD pipelines that need different permission levels — **use Keycloak (or Auth0, Azure AD) instead of Dex**. These providers support service account roles natively, so `client_credentials` tokens include all the claims Apicurio needs.

Dex is the right choice when:
- Your upstream IdP is non-OIDC-compliant (OpenShift OAuth, LDAP, SAML)
- You primarily need user-facing auth (UI login, principal identity, owner-based authz)
- M2M workloads are read-only (SerDes consumers with anonymous reads)

# Group-to-Role Mapping

The mapping between upstream provider groups and Apicurio Registry roles flows through two layers:

| Upstream Group | Dex Passes As | CR Role Config | Registry Role |
|----------------|---------------|----------------|---------------|
| `registry-admins` | `registry-admins` | `admin: registry-admins` | Admin |
| `registry-developers` | `registry-developers` | `developer: registry-developers` | Developer |
| `registry-readers` | `registry-readers` | `readOnly: registry-readers` | Read-Only |

For providers that use UUIDs as group identifiers (like Azure AD), the CR supports comma-separated values:

```yaml
roles:
  admin: "registry-admins,a1b2c3d4-uuid-of-azure-group"
```

# Production Considerations

A few things to keep in mind when running this in production:

**TLS** — Configure Dex with proper TLS via Ingress termination or its own certificate. Set `tlsVerificationType: "VERIFY_PEER"` in the Apicurio CR and provide a truststore if using a private CA.

**High availability** — Run multiple Dex replicas. For better HA, switch Dex's storage from Kubernetes CRDs to PostgreSQL.

**Token lifetimes** — Configure sensible expiry in Dex:

```yaml
config:
  expiry:
    idTokens: "1h"
    refreshTokens:
      validIfNotUsedFor: "168h"   # 7 days
      absoluteLifetime: "720h"     # 30 days
```

**Network policies** — Restrict access so only Apicurio Registry pods and the ingress controller can reach Dex.

# Troubleshooting

- **"Invalid client credentials" on UI login** — The UI (`oidc-client-ts`) runs in the browser and cannot send a client secret. Use a **public** Dex client (`public: true`, no secret) for the UI. A confidential client will always fail.
- **403 Forbidden on API calls after UI login** — Two common causes: (1) **Audience mismatch** — the UI gets tokens with `aud: "apicurio-registry-ui"` but the backend expects `aud: "apicurio-registry"`. Fix: set both `appClientId` and `uiClientId` to the same public client ID. (2) **Missing `groups` scope** — the default UI scope doesn't include `groups`. Fix: set `APICURIO_UI_AUTH_OIDC_SCOPE` to `openid profile email groups`.
- **Groups not appearing in the token** — Verify both `QUARKUS_OIDC_AUTHENTICATION_SCOPES` (backend) and `APICURIO_UI_AUTH_OIDC_SCOPE` (UI) include `groups`. Decode the JWT to inspect: `echo $TOKEN | cut -d. -f2 | base64 -d | jq .`
- **"Unregistered redirect_uri" on page refresh** — The UI redirects to `/dashboard` after login. Add `https://<registry-ui-route>/dashboard` to the Dex client's redirect URIs.
- **Silent token refresh returns 400** — `oidc-client-ts` uses the current page URL (with stale `?code=...&state=...` params) as the redirect URI. Fix: set `redirectUri` explicitly in the Apicurio CR auth config.
- **"No end session endpoint" on logout** — Dex does not implement OIDC RP-Initiated Logout. The local session is still cleared, but `signoutRedirect` fails. This is a known Dex limitation — the error is non-blocking.
- **CORS errors in browser console** — The UI can't fetch `/.well-known/openid-configuration` from Dex. Add the UI route origin to `web.allowedOrigins` in the Dex config.
- **`InvalidJwtSignatureException` after Dex restart** — Dex generates new signing keys on restart. Old tokens become invalid. Users must re-authenticate. For production, configure persistent signing keys.
- **`invalid_client` when exchanging authorization code** — If the client secret contains special characters (`+`, `/`, `=`), use `--data-urlencode` instead of `-d` in curl.
- **Owner field is still empty** — Check that `QUARKUS_OIDC_TOKEN_PRINCIPAL_CLAIM` is set to a claim Dex actually populates (`email`, `name`, or `sub`).
- **UI redirects to Dex but gets an error** — Check Dex logs (`kubectl logs -n dex deploy/dex`). Usually a redirect URI mismatch or connector misconfiguration.
- **"OIDC Server is not available"** — The Registry pod can't reach Dex. Check DNS resolution, network policies, and TLS trust.

# The Bigger Picture

This approach isn't just about fixing the three broken features from the direct OpenShift integration. It's about **decoupling Apicurio Registry from any specific identity provider**.

With Dex as an OIDC bridge, your Registry deployment is portable:
- Moving from OpenShift to vanilla Kubernetes? Swap the connector, keep everything else.
- Migrating from LDAP to Azure AD? Same.
- Need to support multiple identity providers during a transition? Dex handles federation natively.

The Registry doesn't need to know or care what's behind Dex. It just talks OIDC.

If you're interested in the direct OpenShift approach (without Dex), check out the [previous post]({% post_url 2026-03-17-openshift-oauth-integration %}) — it's still a valid option if you only need API-level auth and role-based authorization. But if you want the full feature set, Dex is the way to go.

Happy registering!
