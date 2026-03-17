---
layout: post
title: "Integrating Apicurio Registry with OpenShift's Built-in OAuth Server"
date: 2026-03-17 12:00:00
author: carlesarnal
categories: registry openshift oauth authentication authorization
---

If you're running Apicurio Registry on OpenShift, you might be wondering: can I use OpenShift's built-in OAuth server for authentication instead of deploying a separate identity provider like Keycloak? The answer is **yes** — with some caveats. In this post, I'll walk you through how we got it working, what the limitations are, and the technical details behind the integration.

---

# The Challenge

OpenShift ships with a built-in OAuth server that handles user authentication for the platform. However, it is **not a standard OpenID Connect (OIDC) provider**:

- It does **not** expose `/.well-known/openid-configuration`
- It issues **opaque tokens** (`sha256~...`), not JWTs
- It has **no JWKS endpoint** and **no RFC 7662 token introspection endpoint**

Apicurio Registry uses Quarkus OIDC for authentication, which normally expects a fully OIDC-compliant server. So how do we bridge the gap?

# The Solution: verify-access-token-with-user-info

The trick is to combine three components:

1. **JWKS from the Kubernetes API server** — The K8s API server exposes a JWKS endpoint at `/openid/v1/jwks`. Quarkus OIDC requires either a JWKS or introspection path to initialize. We point it to the K8s JWKS purely to satisfy this startup requirement.

2. **OpenShift's User API** (`/apis/user.openshift.io/v1/users/~`) — When called with a valid Bearer token, this endpoint returns the authenticated user's identity including their OpenShift groups. When called with an invalid token, it returns 401.

3. **Quarkus `verify-access-token-with-user-info=true`** — This tells Quarkus to validate opaque access tokens by sending a GET request with the Bearer token to the userinfo endpoint. If the endpoint returns 200, the token is valid; otherwise, it's rejected.

Here's the flow:

```
                          +----------------------+
   Client Request         |  Apicurio Registry   |
   with Bearer token ---> |  (Quarkus OIDC)      |
                          |                      |
                          |  1. Sends GET with    |
                          |     Bearer token to   |
                          |     userinfo endpoint  |
                          +----------+-----------+
                                     |
                                     v
                          +----------------------+
                          |  K8s API Server       |
                          |  /apis/user.openshift |
                          |  .io/v1/users/~       |
                          |                      |
                          |  Valid token -> 200   |
                          |  + user info (with    |
                          |    groups array)      |
                          |                      |
                          |  Invalid token -> 401 |
                          +----------------------+
```

The User API response includes an OpenShift `groups` array at the top level. By creating OpenShift groups that match Apicurio role names, we map group membership directly to Registry roles.

# Step-by-Step Setup

## 1. Install the Apicurio Registry Operator

First, deploy the operator to your cluster:

```bash
kubectl create namespace apicurio-registry-operator
kubectl apply -f apicurio-registry-operator.yaml -n apicurio-registry-operator
kubectl wait --for=condition=available deployment/apicurio-registry-operator \
  -n apicurio-registry-operator --timeout=300s
```

## 2. Grant Anonymous Access to the JWKS Endpoint

The K8s API server JWKS endpoint is restricted by default. Since Quarkus OIDC fetches JWKS without authentication, we need to open it up. The JWKS contains only public keys, so there's no security risk:

```bash
kubectl apply -f - <<'EOF'
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: apicurio-jwks-anonymous-access
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:service-account-issuer-discovery
subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: Group
  name: system:unauthenticated
EOF
```

## 3. Create an OAuthClient Resource

Register Apicurio Registry as a client of OpenShift's OAuth server:

```bash
CLIENT_SECRET=$(openssl rand -base64 32 | tr -d '=' | head -c 32)
echo "Client secret: $CLIENT_SECRET"
```

```yaml
apiVersion: oauth.openshift.io/v1
kind: OAuthClient
metadata:
  name: apicurio-registry
grantMethod: auto
secret: "<CLIENT_SECRET>"
redirectURIs:
  - "https://<registry-app-route>"
  - "https://<registry-ui-route>"
  - "http://<registry-app-route>"
  - "http://<registry-ui-route>"
```

**Tip:** Include both `http://` and `https://` variants in `redirectURIs` to avoid 400 errors during OAuth flows.

## 4. Create OpenShift Groups for Role-Based Authorization

Create groups that map to Apicurio Registry roles:

```bash
oc adm groups new registry-admins
oc adm groups new registry-developers
oc adm groups new registry-readers

oc adm groups add-users registry-admins <admin-username>
oc adm groups add-users registry-developers <developer-username>
oc adm groups add-users registry-readers <reader-username>
```

## 5. Deploy the Registry

This is where it all comes together. The CR configures Quarkus OIDC to work with OpenShift's non-OIDC-compliant OAuth server:

```yaml
apiVersion: registry.apicur.io/v1
kind: ApicurioRegistry3
metadata:
  name: apicurio-registry
  namespace: apicurio-registry
spec:
  app:
    host: apicurio-registry-app-apicurio-registry.apps.<cluster-domain>
    auth:
      enabled: true
      appClientId: apicurio-registry
      uiClientId: apicurio-registry
      authServerUrl: "https://oauth-openshift.apps.<cluster-domain>"
      anonymousReadsEnabled: true
      tls:
        tlsVerificationType: "none"
      authz:
        enabled: true
        readAccessEnabled: true
        ownerOnlyEnabled: false
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
      # Disable OIDC auto-discovery
      - name: QUARKUS_OIDC_DISCOVERY_ENABLED
        value: "false"

      # OAuth endpoints on the OpenShift OAuth server
      - name: QUARKUS_OIDC_AUTHORIZATION_PATH
        value: "/oauth/authorize"
      - name: QUARKUS_OIDC_TOKEN_PATH
        value: "/oauth/token"

      # K8s API server JWKS (only for Quarkus startup initialization)
      - name: QUARKUS_OIDC_JWKS_PATH
        value: "https://api.<cluster-domain>:6443/openid/v1/jwks"

      # OpenShift User API as the userinfo endpoint
      - name: QUARKUS_OIDC_USER_INFO_PATH
        value: "https://api.<cluster-domain>:6443/apis/user.openshift.io/v1/users/~"

      # KEY SETTING: validate opaque tokens via the userinfo endpoint
      - name: QUARKUS_OIDC_TOKEN_VERIFY_ACCESS_TOKEN_WITH_USER_INFO
        value: "true"

      # Extract OpenShift groups as roles
      - name: QUARKUS_OIDC_ROLES_ROLE_CLAIM_PATH
        value: "groups"

      # Client credentials
      - name: QUARKUS_OIDC_CREDENTIALS_SECRET
        value: "<CLIENT_SECRET>"
  ui:
    host: apicurio-registry-ui-apicurio-registry.apps.<cluster-domain>
```

**Important:** The `tls` section under `auth` is required when auth is enabled. Omitting it causes a NullPointerException in the operator.

## 6. Verify It Works

Once the pods are running, you can test the full authorization matrix:

```bash
# Anonymous read (should work)
curl -sk http://<registry-app-route>/apis/registry/v3/system/info

# Unauthenticated write (should return 401)
curl -sk -X POST http://<registry-app-route>/apis/registry/v3/groups \
  -H "Content-Type: application/json" -d '{"groupId": "test"}'

# Admin write (should return 200)
oc login -u testadmin -p testadmin123
TOKEN=$(oc whoami --show-token)
curl -sk -X POST http://<registry-app-route>/apis/registry/v3/groups \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"groupId": "admin-test"}'

# Reader write (should return 403)
oc login -u testreader -p testreader123
TOKEN=$(oc whoami --show-token)
curl -sk -X POST http://<registry-app-route>/apis/registry/v3/groups \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"groupId": "reader-test"}'
```

# What Works and What Doesn't

**Authentication and role-based authorization work. Owner-based authorization and UI login do not.**

| Feature | Status | Notes |
|---------|--------|-------|
| Token validation | Works | Valid OpenShift OAuth tokens accepted, invalid tokens rejected |
| Anonymous reads | Works | When `anonymousReadsEnabled: true` |
| Auth enforcement | Works | Unauthenticated writes are blocked with 401 |
| Role-based authorization | Works | OpenShift groups mapped to Apicurio roles |
| Admin override | Works | Users in `registry-admins` get full admin access |
| Principal identity | Broken | Username is in `metadata.name` (nested), but Quarkus only reads top-level fields |
| Owner-based authorization | Broken | Depends on principal identity |
| UI login flow | Broken | UI requires OIDC discovery, which OpenShift OAuth doesn't support |

# Why Principal Identity Doesn't Work

This is worth explaining in detail because it reveals an interesting limitation in Quarkus OIDC.

The K8s User API returns the username nested inside `metadata.name`:

```json
{
  "kind": "User",
  "metadata": { "name": "testadmin" },
  "groups": ["registry-admins", "system:authenticated"]
}
```

For opaque tokens validated via UserInfo, Quarkus extracts the principal with a flat JSON lookup:

```java
userName = userInfo.getString(resolvedContext.oidcConfig().token().principalClaim().get());
```

This means `getString("metadata/name")` returns `null` — there's no top-level key with that name. Interestingly, the `findClaimValue()` method used for **role** extraction supports `/`-separated path traversal, but this method is not used for principal extraction from UserInfo.

We tested every alternative:
- `metadata/name` — empty (path not traversed)
- `metadata.name` — empty (not a valid key)
- `metadata` — 500 error (JsonObject can't cast to JsonString)
- `kind` — returns "User" (proves top-level strings work, but useless)

The only top-level string fields in the response are `kind` and `apiVersion`, neither of which contains the username.

# Troubleshooting Tips

If you run into issues, here are the most common problems:

- **"Either 'jwks-path' or 'introspection-path' must be set"** — Add the `QUARKUS_OIDC_JWKS_PATH` env var pointing to the K8s JWKS endpoint.
- **"Introspection path and verifyAccessTokenWithUserInfo are mutually exclusive"** — Use `jwks-path` instead of `introspection-path`. It's only needed for initialization.
- **NullPointerException on TLS** — Always include the `tls` section under `auth` when auth is enabled.
- **JWKS 403** — Create the ClusterRoleBinding for anonymous JWKS access.
- **OAuth 400 Bad Request** — Ensure redirect URIs match exactly, including protocol scheme.
- **Users don't get the expected role** — Verify group membership with `oc get groups` and re-authenticate to get a new token.

# Alternative: /oauth/info Endpoint

If you only need pure authentication without role-based authorization, there's a simpler option. OpenShift's OAuth server exposes `/oauth/info`, which validates Bearer tokens and returns basic token metadata — but no user identity or groups. Set `QUARKUS_OIDC_USER_INFO_PATH` to `/oauth/info` and skip the K8s User API entirely.

# Wrapping Up

While this integration has limitations (no principal identity, no UI login, no owner-based authz), it provides a solid foundation for **API-level authentication and role-based authorization** using only OpenShift's built-in infrastructure — no external identity provider required. For teams that primarily interact with Apicurio Registry through REST APIs and want to leverage their existing OpenShift user and group management, this is a practical solution.

We'd love to hear from you if you try this out or have ideas for improving the integration. The Quarkus OIDC limitation around nested principal claims is something we're looking into upstream as well.

Happy registering!
