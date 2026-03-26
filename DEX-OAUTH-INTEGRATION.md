# Integrating Apicurio Registry with Any OAuth Provider via Dex IdP

This guide documents how to deploy [Dex](https://dexidp.io/) as a federated OIDC identity provider in front of non-OIDC-compliant OAuth servers (such as OpenShift's built-in OAuth), enabling full Apicurio Registry functionality including UI login, principal identity, and owner-based authorization.

Related issue: https://github.com/Apicurio/apicurio-registry/issues/7648

## Why Dex?

Apicurio Registry uses Quarkus OIDC and the `oidc-client-ts` JavaScript library, both of which require a fully OIDC-compliant identity provider. Many OAuth servers (OpenShift, some LDAP gateways, legacy SAML providers) are **not** OIDC-compliant:

| Requirement | Standard OIDC | OpenShift OAuth |
|-------------|:---:|:---:|
| `/.well-known/openid-configuration` | Yes | No |
| JWT access tokens | Yes | No (opaque `sha256~...`) |
| JWKS endpoint | Yes | No |
| Token introspection (RFC 7662) | Yes | No |
| Flat userinfo response | Yes | No (username nested in `metadata.name`) |

When connecting directly to a non-compliant provider, three Apicurio features break:

1. **UI login** — `oidc-client-ts` cannot perform OIDC discovery
2. **Principal identity** — username cannot be extracted from nested JSON
3. **Owner-based authorization** — depends on principal identity

**Dex solves all three** by sitting between Apicurio and the upstream provider, translating non-standard protocols into standard OIDC:

```
                     OIDC (standard)              Upstream protocol
User ──► Apicurio ──────────────────► Dex ──────────────────────────► OpenShift / LDAP / GitHub / etc.
              │                         │
              │  /.well-known/...  ✓    │  Connector handles
              │  JWT tokens        ✓    │  protocol translation
              │  JWKS              ✓    │
              │  Flat claims       ✓    │
```

## Prerequisites

- A Kubernetes or OpenShift cluster
- `kubectl` / `oc` CLI configured with cluster access
- The Apicurio Registry Operator installed (v3.1.x+)
- Helm (for Dex installation) or ability to apply raw manifests

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  Kubernetes / OpenShift Cluster                                     │
│                                                                     │
│  ┌─────────────┐     ┌──────────┐     ┌──────────────────────────┐ │
│  │  Apicurio    │────►│   Dex    │────►│  Upstream IdP            │ │
│  │  Registry    │     │  (OIDC)  │     │  (OpenShift / LDAP /     │ │
│  │  App + UI    │     │          │     │   GitHub / SAML / etc.)  │ │
│  └─────────────┘     └──────────┘     └──────────────────────────┘ │
│                                                                     │
│  ┌─────────────┐                                                    │
│  │  PostgreSQL  │  (Registry storage)                               │
│  └─────────────┘                                                    │
└─────────────────────────────────────────────────────────────────────┘
```

## Step 1: Deploy Dex

### Option A: Helm (Recommended)

```bash
helm repo add dex https://charts.dexidp.io
helm repo update

kubectl create namespace dex
```

Create a `dex-values.yaml` file (connector-specific sections are covered in Step 2):

```yaml
# dex-values.yaml
config:
  issuer: https://dex.<cluster-domain>

  storage:
    type: kubernetes
    config:
      inCluster: true

  web:
    http: 0.0.0.0:5556

  # OAuth2 settings
  oauth2:
    # Return refresh tokens
    skipApprovalScreen: true
    responseTypes:
      - code
      - token
      - id_token

  # Apicurio Registry as a static client
  staticClients:
    - id: apicurio-registry
      name: Apicurio Registry
      secret: <GENERATE_A_SECURE_SECRET>
      redirectURIs:
        - "https://<registry-ui-route>/"
        - "http://<registry-ui-route>/"

  # Connector configuration — see Step 2
  connectors: []

ingress:
  enabled: true
  hosts:
    - host: dex.<cluster-domain>
      paths:
        - path: /
          pathType: Prefix

# For OpenShift, use a Route instead of Ingress:
# ingress:
#   enabled: false
# Then create a Route manually (see below)
```

Install:

```bash
helm install dex dex/dex -n dex -f dex-values.yaml
```

For OpenShift, create a Route:

```bash
oc create route edge dex \
  --service=dex \
  --hostname=dex.<cluster-domain> \
  --namespace=dex
```

### Option B: Raw Manifests

<details>
<summary>Click to expand raw manifest deployment</summary>

```yaml
---
apiVersion: v1
kind: Namespace
metadata:
  name: dex
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: dex
  namespace: dex
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: dex
rules:
  - apiGroups: ["dex.coreos.com"]
    resources: ["*"]
    verbs: ["*"]
  - apiGroups: ["apiextensions.k8s.io"]
    resources: ["customresourcedefinitions"]
    verbs: ["create"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: dex
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: dex
subjects:
  - kind: ServiceAccount
    name: dex
    namespace: dex
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: dex-config
  namespace: dex
data:
  config.yaml: |
    issuer: https://dex.<cluster-domain>
    storage:
      type: kubernetes
      config:
        inCluster: true
    web:
      http: 0.0.0.0:5556
    oauth2:
      skipApprovalScreen: true
      responseTypes: ["code", "token", "id_token"]
    staticClients:
      - id: apicurio-registry
        name: Apicurio Registry
        secret: <GENERATE_A_SECURE_SECRET>
        redirectURIs:
          - "https://<registry-ui-route>/"
    connectors: []   # See Step 2
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dex
  namespace: dex
spec:
  replicas: 1
  selector:
    matchLabels:
      app: dex
  template:
    metadata:
      labels:
        app: dex
    spec:
      serviceAccountName: dex
      containers:
        - name: dex
          image: ghcr.io/dexidp/dex:v2.41.1
          command: ["dex", "serve", "/etc/dex/config.yaml"]
          ports:
            - containerPort: 5556
          volumeMounts:
            - name: config
              mountPath: /etc/dex
      volumes:
        - name: config
          configMap:
            name: dex-config
---
apiVersion: v1
kind: Service
metadata:
  name: dex
  namespace: dex
spec:
  selector:
    app: dex
  ports:
    - port: 5556
      targetPort: 5556
```

</details>

### Verify Dex is Running

```bash
kubectl get pods -n dex
# Expected: dex-xxx 1/1 Running

# Test OIDC discovery
curl -sk https://dex.<cluster-domain>/.well-known/openid-configuration | jq .
# Expected: JSON with authorization_endpoint, token_endpoint, jwks_uri, etc.
```

## Step 2: Configure a Dex Connector

Dex supports [many connectors](https://dexidp.io/docs/connectors/). Below are configurations for the most common scenarios.

### Connector A: OpenShift

Use this when Apicurio Registry runs on OpenShift and you want to authenticate against the platform's built-in OAuth server.

First, create an OAuthClient in OpenShift for Dex (not for Apicurio — Dex is the OAuth client now):

```bash
CLIENT_SECRET=$(openssl rand -base64 32 | tr -d '=' | head -c 32)
echo "Dex OAuth client secret: $CLIENT_SECRET"

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

Then add the connector to `dex-values.yaml`:

```yaml
connectors:
  - type: openshift
    id: openshift
    name: OpenShift
    config:
      issuer: https://api.<cluster-domain>:6443
      clientID: dex
      clientSecret: "<CLIENT_SECRET_FROM_ABOVE>"
      redirectURI: https://dex.<cluster-domain>/callback
      # Only sync specific groups (optional, recommended)
      groups:
        - registry-admins
        - registry-developers
        - registry-readers
      # Skip TLS verification if using self-signed certs
      insecureCA: true
```

Create OpenShift groups and assign users:

```bash
oc adm groups new registry-admins
oc adm groups new registry-developers
oc adm groups new registry-readers

oc adm groups add-users registry-admins <admin-user>
oc adm groups add-users registry-developers <dev-user>
oc adm groups add-users registry-readers <reader-user>
```

### Connector B: LDAP

```yaml
connectors:
  - type: ldap
    id: ldap
    name: LDAP
    config:
      host: ldap.example.com:636
      insecureNoSSL: false
      insecureSkipVerify: false
      rootCA: /etc/dex/ldap-ca.crt
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

### Connector C: GitHub

```yaml
connectors:
  - type: github
    id: github
    name: GitHub
    config:
      clientID: <github-oauth-app-client-id>
      clientSecret: <github-oauth-app-client-secret>
      redirectURI: https://dex.<cluster-domain>/callback
      # Map GitHub org/team membership to groups
      orgs:
        - name: Apicurio
          teams:
            - registry-admins
            - registry-developers
```

### Connector D: SAML 2.0

```yaml
connectors:
  - type: saml
    id: saml
    name: Corporate SSO
    config:
      ssoURL: https://idp.example.com/sso
      ca: /etc/dex/saml-ca.crt
      redirectURI: https://dex.<cluster-domain>/callback
      entityIssuer: https://dex.<cluster-domain>/callback
      usernameAttr: name
      emailAttr: email
      groupsAttr: groups
```

### Connector E: Microsoft / Azure AD (OIDC)

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
        - registry-readers-group-uuid
```

After updating the connector configuration, upgrade the Helm release:

```bash
helm upgrade dex dex/dex -n dex -f dex-values.yaml
```

## Step 3: Configure Dex to Pass Groups as Claims

Dex includes group membership in the `id_token` by default when the `groups` scope is requested. Ensure your static client requests the correct scopes. The Apicurio Registry operator adds the `openid` scope by default; you need `groups` as well.

In the Dex config, the static client should work as-is. On the Apicurio side, add the `groups` scope (covered in Step 4).

## Step 4: Deploy Apicurio Registry with Dex as OIDC Provider

Create the registry namespace:

```bash
kubectl create namespace apicurio-registry
```

Apply the ApicurioRegistry3 CR:

```yaml
# apicurio-registry.yaml
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
      authServerUrl: "https://dex.<cluster-domain>"
      anonymousReadsEnabled: true
      tls:
        # Set to "none" if Dex uses self-signed certs,
        # or configure a truststore for production
        tlsVerificationType: "none"
      authz:
        enabled: true
        readAccessEnabled: true
        ownerOnlyEnabled: true       # WORKS with Dex (principal is available)
        groupAccessEnabled: false
        roles:
          source: token
          # These must match the group names from your upstream provider
          admin: "registry-admins"
          developer: "registry-developers"
          readOnly: "registry-readers"
        adminOverride:
          enabled: true
          from: token
          type: role
          role: "registry-admins"
    env:
      # Request the 'groups' scope so Dex includes group claims in the token
      - name: QUARKUS_OIDC_AUTHENTICATION_SCOPES
        value: "openid,email,profile,groups"

      # Tell Quarkus where to find roles in the JWT
      # Dex puts groups in the "groups" claim of the id_token
      - name: QUARKUS_OIDC_ROLES_ROLE_CLAIM_PATH
        value: "groups"

      # Use the token role claim as the source for roles
      - name: QUARKUS_OIDC_TOKEN_PRINCIPAL_CLAIM
        value: "email"
  ui:
    host: apicurio-registry-ui-apicurio-registry.apps.<cluster-domain>
```

```bash
kubectl apply -f apicurio-registry.yaml
```

Wait for the pods to be ready:

```bash
kubectl get pods -n apicurio-registry -w
# Wait until both app and ui pods show 1/1 Running
```

## Step 5: Verify the Integration

### 5.1 — OIDC Discovery (Dex)

```bash
curl -sk https://dex.<cluster-domain>/.well-known/openid-configuration | jq .issuer
# Expected: "https://dex.<cluster-domain>"
```

### 5.2 — Anonymous Read Access

```bash
curl -sk https://apicurio-registry-app-apicurio-registry.apps.<cluster-domain>/apis/registry/v3/system/info
# Expected: 200 with registry info
```

### 5.3 — UI Login

Open `https://apicurio-registry-ui-apicurio-registry.apps.<cluster-domain>` in a browser. You should see the Apicurio Registry UI with a **Login** button. Clicking it should redirect to Dex, which shows buttons for each configured connector (e.g., "Log in with OpenShift"). After authenticating with your upstream provider, you should be redirected back to the Registry UI, logged in.

### 5.4 — Token-Based API Access

Obtain a token via Dex's token endpoint (example using the Resource Owner Password grant, if enabled, or via browser flow):

```bash
# For OpenShift connector: log in via oc, then exchange for a Dex token
# The simplest way is to use the UI login flow and extract the token from the browser

# Or use curl with the authorization code flow:
# 1. Open in browser: https://dex.<cluster-domain>/auth?client_id=apicurio-registry&response_type=code&redirect_uri=https://<ui-route>/&scope=openid+email+profile+groups
# 2. Authenticate with your upstream provider
# 3. Copy the 'code' parameter from the redirect URL
# 4. Exchange the code for tokens:

TOKEN_RESPONSE=$(curl -sk -X POST https://dex.<cluster-domain>/token \
  -d "grant_type=authorization_code" \
  -d "code=<AUTH_CODE>" \
  -d "client_id=apicurio-registry" \
  -d "client_secret=<CLIENT_SECRET>" \
  -d "redirect_uri=https://<ui-route>/")

ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | jq -r .id_token)
```

### 5.5 — Admin Write Access

```bash
curl -sk -X POST \
  https://apicurio-registry-app-apicurio-registry.apps.<cluster-domain>/apis/registry/v3/groups \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"groupId": "dex-admin-test", "description": "Created by admin via Dex"}' \
  -w "\nHTTP: %{http_code}\n"
# Expected: 200 — group created with owner field populated
```

### 5.6 — Principal Identity and Ownership

```bash
# Verify the artifact has an owner (principal identity works)
curl -sk \
  https://apicurio-registry-app-apicurio-registry.apps.<cluster-domain>/apis/registry/v3/groups/dex-admin-test \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .owner
# Expected: the email or username of the authenticated user (NOT empty)
```

### 5.7 — Reader Denied on Write

```bash
# Authenticate as a user in the registry-readers group
# Then attempt a write operation
curl -sk -X POST \
  https://apicurio-registry-app-apicurio-registry.apps.<cluster-domain>/apis/registry/v3/groups \
  -H "Authorization: Bearer $READER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"groupId": "reader-should-fail"}' \
  -w "\nHTTP: %{http_code}\n"
# Expected: 403 Forbidden
```

## Feature Comparison: Direct OAuth vs Dex

| Feature | Direct OpenShift OAuth | Via Dex |
|---------|:---:|:---:|
| Token validation | Yes | Yes |
| Anonymous reads | Yes | Yes |
| Role-based authorization | Yes | Yes |
| **UI login flow** | **No** | **Yes** |
| **Principal identity** | **No** (empty) | **Yes** |
| **Owner-based authorization** | **No** | **Yes** |
| **Group-based access** | **No** | **Yes** |
| Multi-provider federation | No | Yes |
| Standard OIDC compliance | No | Yes |

## Group-to-Role Mapping Reference

The mapping between upstream provider groups and Apicurio Registry roles is configured in two places:

1. **Dex connector** — which upstream groups to sync (optional filter)
2. **Apicurio CR `authz.roles`** — which group names map to which Registry role

Example mapping:

| Upstream Group | Dex Passes As | CR Role Config | Registry Role |
|----------------|---------------|----------------|---------------|
| `registry-admins` | `registry-admins` | `admin: registry-admins` | Admin |
| `registry-developers` | `registry-developers` | `developer: registry-developers` | Developer |
| `registry-readers` | `registry-readers` | `readOnly: registry-readers` | Read-Only |

For providers that use UUIDs as group identifiers (e.g., Azure AD), the Apicurio CR supports comma-separated role mappings:

```yaml
roles:
  admin: "registry-admins,a1b2c3d4-uuid-of-azure-group"
  developer: "registry-developers,e5f6g7h8-uuid"
```

## Production Considerations

### TLS

In production, configure proper TLS:

- Dex should serve HTTPS (via Ingress TLS termination or its own cert)
- Configure the Apicurio CR's `tls` section with a truststore if using private CA:

```yaml
tls:
  tlsVerificationType: "VERIFY_PEER"
  truststoreSecretRef:
    name: dex-ca-truststore
    key: truststore.p12
  truststorePasswordSecretRef:
    name: dex-ca-truststore
    key: password
```

### High Availability

For production, run multiple Dex replicas:

```yaml
# In Helm values
replicaCount: 3

config:
  storage:
    type: kubernetes  # or postgres for better HA
```

### Token Lifetimes

Configure token expiry in Dex:

```yaml
config:
  expiry:
    idTokens: "1h"
    refreshTokens:
      validIfNotUsedFor: "168h"  # 7 days
      absoluteLifetime: "720h"    # 30 days
```

### Network Policies

Restrict access so only Apicurio Registry pods can reach Dex:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: dex-allow-registry
  namespace: dex
spec:
  podSelector:
    matchLabels:
      app: dex
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: apicurio-registry
      ports:
        - port: 5556
    # Also allow ingress controller
    - from:
        - namespaceSelector:
            matchLabels:
              network.openshift.io/policy-group: ingress
```

## Troubleshooting

### Dex returns "Invalid client ID" or "Invalid redirect URI"

Ensure the `staticClients` in Dex config matches exactly:
- `id` must match `appClientId` / `uiClientId` in the Apicurio CR
- `redirectURIs` must include the exact UI route URL (with trailing slash if the browser adds one)

### Groups not appearing in token

1. Verify the scope includes `groups`: check `QUARKUS_OIDC_AUTHENTICATION_SCOPES` includes `groups`
2. Verify the Dex connector is configured to sync groups
3. Decode the JWT to inspect claims: `echo $TOKEN | cut -d. -f2 | base64 -d | jq .`

### UI redirects to Dex but gets an error

Check Dex logs: `kubectl logs -n dex deploy/dex`

Common causes:
- Connector misconfiguration (wrong client ID/secret for upstream provider)
- Redirect URI mismatch
- Upstream provider unreachable from Dex pod

### Owner field is still empty

Verify `QUARKUS_OIDC_TOKEN_PRINCIPAL_CLAIM` is set to a claim that Dex populates (e.g., `email`, `name`, or `sub`). Decode the JWT to see which claims are present.

### "OIDC Server is not available" on Registry startup

The Registry app pod must be able to reach `https://dex.<cluster-domain>` to fetch OIDC discovery. Check:
- DNS resolution from the pod
- Network policies
- TLS certificate trust

## Cleanup

```bash
# Delete the registry instance
kubectl delete apicurioregistries3 apicurio-registry -n apicurio-registry
kubectl delete namespace apicurio-registry

# Delete Dex
helm uninstall dex -n dex
kubectl delete namespace dex

# Delete the OAuthClient (if using OpenShift connector)
kubectl delete oauthclient dex

# Delete OpenShift groups (if created)
oc delete group registry-admins registry-developers registry-readers
```

## References

- [Dex Documentation](https://dexidp.io/docs/)
- [Dex Connectors](https://dexidp.io/docs/connectors/)
- [Dex OpenShift Connector](https://dexidp.io/docs/connectors/openshift/)
- [Apicurio Registry Documentation](https://www.apicur.io/registry/docs/)
- [OpenShift OAuth Direct Integration Guide](OPENSHIFT-OAUTH-INTEGRATION.md) — documents limitations without Dex
- [Quarkus OIDC Documentation](https://quarkus.io/guides/security-oidc-bearer-token-authentication)
