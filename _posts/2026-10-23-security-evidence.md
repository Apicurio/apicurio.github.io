---
layout: post
title: "One Keycloak Realm, Two Permission Models: Kafka and Apicurio Registry"
date: 2026-10-23 12:00:00
updated: 2026-10-25
author: carles
categories: registry authentication security kafka
---


An application can have permission to publish Kafka records without having permission to change their schemas. That sounds straightforward, but connecting both Kafka and Apicurio Registry to the same identity provider can obscure where those two decisions happen.

In this post, we'll connect Keycloak, Kafka's Strimzi OAuth libraries, and Apicurio Registry, then test the boundaries. We'll use successful requests as controls, deliberately deny operations, and inspect the resulting state. Along the way, we'll see why acquiring a token is not enough to prove that authentication is enabled.

## Two requests, two decisions

A Registry-aware Kafka producer has two separate connections to consider:

```text
                      Keycloak
                      /      \
             access token    access token
                    /          \
          Schema lookup         Kafka produce
                 |                    |
        Apicurio Registry         Kafka broker
        token checks + RBAC       token checks + ACLs
```

Registry evaluates access to groups, artifacts and versions. Kafka evaluates operations on topics, consumer groups and other broker resources. Sharing a realm does not combine these permission models, and it does not make an access token appropriate for every service.

Our example uses two service accounts, `publisher` and `reader`. Registry maps their realm roles to `sr-admin` and `sr-readonly`. Kafka separately grants topic write access to `service-account-publisher`. The administrator role is convenient for preparing the local example; a production schema publisher should receive only the permissions it actually needs.

## Run the example

You need Python 3 and Docker with Compose. The example starts Keycloak 26.0, Registry 3.3.3, and Kafka 3.9.0 from the Strimzi 0.45.0 image.

```bash
git clone --branch talk/evidence-2026-10-23 \
  https://github.com/carlesarnal/keycloak-strimzi-apicurio-security.git
cd keycloak-strimzi-apicurio-security
python3 verify.py
```

The runner starts its own Compose project, performs the checks and removes the project's containers afterward. Its fixed credentials, plaintext connections and internal administrative broker listener are for this disposable local environment. The administrative listener is not exposed as a host port; it must not become an alternative route for production clients to bypass OAuth.

## Enable the Registry OIDC tenant

The important Registry settings in this example are:

```yaml
environment:
  QUARKUS_OIDC_TENANT_ENABLED: "true"
  QUARKUS_OIDC_AUTH_SERVER_URL: http://keycloak:8080/realms/lab
  QUARKUS_OIDC_CLIENT_ID: registry
  QUARKUS_OIDC_TOKEN_ISSUER: http://localhost:18230/realms/lab
  QUARKUS_OIDC_TOKEN_AUDIENCE: registry
  APICURIO_AUTH_ROLE_BASED_AUTHORIZATION: "true"
```

The addresses differ for a reason. Registry discovers keys through the Compose-network address, while the host-side client obtains its token through `localhost:18230`. The issuer check must match the issuer in that token. The Keycloak clients also have an audience mapper that includes `registry` in their access tokens.

An earlier configuration used `APICURIO_AUTH_ENABLED`. In this Registry 3.3.3 setup, that did not enable the OIDC tenant: a request carrying an invalid token still returned `200`. Setting `QUARKUS_OIDC_TENANT_ENABLED` corrected the configuration, and the same negative check returned `401`.

That is why the test begins with an invalid credential, rather than simply demonstrating that a valid credential works. A successful authenticated-looking request can also succeed when authentication is disabled.

## Verify read access without granting mutation access

After the publisher creates an artifact, the reader fetches its version content. The reader then attempts to create another version.

| Operation | Identity | Observed result |
|---|---|---|
| List groups | Invalid token | `401` |
| Fetch version 1 | Reader | `200` |
| Publish version 2 | Reader | `403` |
| Fetch version 1 again | Reader | Original content |
| Look up version 2 | Administrator | `404` |

The last two checks are important. They establish the resource outcome, not just the response code: the accepted version remains unchanged and the denied version does not exist.

These checks also separate three diagnoses. A `401` points toward authentication. A `403` with a valid identity points toward authorization. A successful lookup followed by a denied mutation shows that the resource and connection are working while the operation is forbidden.

## Grant Kafka access independently

The broker validates tokens through Strimzi's OAuth callbacks and maps `preferred_username` to the Kafka principal. The example grants these operations:

```bash
kafka-acls.sh --bootstrap-server kafka:9092 \
  --add --allow-principal User:service-account-publisher \
  --operation Write --operation Describe --topic orders
```

The runner executes this command inside the disposable broker container using the internal administration listener. Application clients use the OAuth listener instead.

The publisher's record arrives in `orders`. The reader obtains a valid token but receives `TopicAuthorizationException` when attempting to produce. A broker read then confirms that only the publisher's record is present. A console producer can log an asynchronous send failure without making its process exit status a sufficient assertion, so checking the actual record matters.

## Apply the diagnostic method to your deployment

When an application fails to access a Kafka platform, follow the specific connection before changing permissions:

1. Identify whether the failure came from the broker or the serializer's Registry request.
2. Check the intended issuer, audience and mapped principal at that service.
3. Compare the failing operation with a successful control using the same path.
4. Inspect the smallest relevant permission: a Kafka ACL and a Registry role are different controls.
5. Verify the resulting state, especially after a denied write.

The Compose example exercises the real token and authorization machinery. Kubernetes networking, TLS, token renewal and signing-key rotation add further deployment concerns; they do not change the need to test these boundaries separately.

The complete configuration and assertions are in the [example repository](https://github.com/carlesarnal/keycloak-strimzi-apicurio-security/tree/talk/evidence-2026-10-23). For a different enforcement model, our earlier [Envoy and OPA article](https://www.apicur.io/blog/2026/01/28/registry-external-auth) moves authentication and authorization to a proxy. In either design, the useful question is the same: which component made this decision, and what evidence shows that it enforced it?
