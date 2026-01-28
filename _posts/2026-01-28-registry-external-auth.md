---
layout: post
title: "Externalizing Authentication and Authorization in Apicurio Registry"
date:   2026-01-28 16:00:00
author: eric
categories: registry authentication security
---

Hey everyone - I wanted to share something we've been working on that I think some of you might find
interesting. We've created a proof of concept showing how to externalize authentication and authorization
for Apicurio Registry using a reverse proxy pattern with Envoy and Open Policy Agent (OPA).

If you've ever thought "I wish I could handle auth at the gateway layer instead of in the application,"
then read on!

---

# Why externalize auth?
Great question! Apicurio Registry currently has built-in authentication and authorization support. It
works, but there are some limitations from an enterprise architecture perspective. The implementation
is tightly coupled to the application code, and while both authentication and authorization can be
disabled, you're stuck with the patterns we've implemented.

What if you want to:

* Use a standard API gateway for all your services, not just Registry?
* Centralize authentication and authorization policies across multiple applications?
* Leverage existing infrastructure like Envoy, Istio, or other service meshes?
* Keep your application layer focused on business logic, not auth concerns?
* Implement authorization patterns/rules that Apicurio Registry simply does not support?

That's where this example comes in!

# What did we build?
We created a complete Docker Compose environment that demonstrates the reverse proxy pattern for
externalized auth. Here's what's in the box:

* **Envoy Proxy** - Acts as the Policy Enforcement Point (PEP), handling JWT validation and routing
* **Open Policy Agent (OPA)** - Acts as the Policy Decision Point (PDP), enforcing authorization policies
* **Keycloak** - Acts as the Identity Provider (IdP), issuing JWT tokens
* **Apicurio Registry** - Running with auth disabled, trusting identity headers from Envoy
* **Apicurio UI** - Configured to authenticate via Keycloak OIDC

The cool part is that Apicurio Registry doesn't do any authentication or authorization itself. It just
trusts the identity headers that Envoy injects after validating the JWT and checking with OPA.  Of
course, if you were to use this in production you would need to ensure trust between Envoy and Apicurio
Registry (e.g. via network security or mTLS).

# How does it work?
The request flow looks like this:

1. Client authenticates with Keycloak and gets a JWT (bearer token)
2. Client sends request to Registry via Envoy with `Authorization: Bearer <JWT>`
3. Envoy validates the JWT against Keycloak's public keys (JWKS endpoint)
4. Envoy extracts claims from the JWT and injects identity headers:
   * `X-Forwarded-User` - username from the JWT
   * `X-Forwarded-Email` - email from the JWT
   * `X-Forwarded-Groups` - roles from the JWT (converted to comma-separated string)
5. Envoy calls OPA to check if the request should be authorized
6. OPA evaluates its policies based on the user's roles and the request details
7. If authorized, Envoy forwards the request to Registry with the identity headers
8. Registry processes the request, trusting the headers from Envoy

```
                    ┌──────────────────────────────────────────────────────────┐
                    │                                                          │
    ┌────────┐      │    ┌───────────┐      ┌───────────┐      ┌──────────┐    │
    │        │ (1)  │    │           │ (3)  │           │ (4)  │          │    │
    │ Client │──────┼───>│ Keycloak  │<────>│   Envoy   │<────>│   OPA    │    │
    │        │<─────┼────│   (IdP)   │   ┌─>│   (PEP)   │      │  (PDP)   │    │
    └────────┘  JWT │    └───────────┘   │  └─────┬─────┘      └──────────┘    │
         └──────────┼────────────────────┘        │                            │
                    │        (2)                  │ (5)                        │
                    │      Request                │ Forward with               │
                    │       + JWT                 │ identity headers           │
                    │                             ▼                            │
                    │                      ┌─────────────┐                     │
                    │                      │  Apicurio   │                     │
                    │                      │  Registry   │                     │
                    │                      └─────────────┘                     │
                    │                                                          │
                    └──────────────────────────────────────────────────────────┘
                                  Docker Compose Environment

Flow:
 (1) Client authenticates with Keycloak and receives JWT token
 (2) Client sends request to Envoy with Authorization: Bearer <JWT>
 (3) Envoy validates JWT against Keycloak's JWKS endpoint
 (4) Envoy queries OPA for authorization decision
 (5) Envoy forwards request to Registry with X-Forwarded-* headers
```

The OPA policies implement role-based access control (RBAC) with three roles:

* `sr-admin` - Full access to everything
* `sr-developer` - Read and write access
* `sr-readonly` - Read-only access (GET requests only)

We also added support for anonymous access to system endpoints like `/apis/registry/v3/system/info`,
which is important for things like health checks and the UI configuration endpoint.

Essentially this mimics the existing RBAC support found in Registry.  The benefit, of
course, is that the OPA policies can be modified to be whatever you want them to be!

# Show me the code!
The POC is available in the Registry repository at:

```
https://github.com/Apicurio/apicurio-registry/tree/main/distro/docker-compose/in-memory-with-envoy-opa
```

You can try it out right now (if you have `apicurio-registry` cloned locally):

```bash
cd $APICURIO_REGISTRY_HOME/distro/docker-compose/in-memory-with-envoy-opa
docker compose up -d
```

Wait about a minute for everything to start up, then:

* **Keycloak**: http://localhost:8080/admin (admin/admin)
* **Registry API** (via Envoy): http://localhost:8081/apis/registry/v3
* **Registry UI**: http://localhost:8888 (admin/admin)

We've even included an automated test suite (`test.sh`) that validates all the authentication and
authorization scenarios. Running the tests gives you 25+ passing test cases covering everything from
anonymous access to role-based permissions.

# What about CORS?
One interesting challenge we ran into was getting the UI to work with this setup. The UI runs on
`localhost:8888` and makes API calls to `localhost:8081`, which triggers the browser's CORS policy.

We solved this by adding CORS configuration to Envoy that allows requests from the UI origin and
properly handles preflight requests. The UI is configured to use OIDC authentication directly with
Keycloak, and it includes the JWT token in the `Authorization` header for all API requests.

It all works seamlessly.

# OPA policies in action
Here's what one of the OPA authorization rules looks like:

```rego
# Admin users can do anything
allowed if {
    has_role("sr-admin")
}

# Read-only users can only GET
allowed if {
    has_role("sr-readonly")
    http_method == "GET"
}
```

Pretty straightforward! The policies are written in Rego (OPA's policy language) and are stored in a
separate `policy.rego` file. You can modify the policies and restart OPA to test different
authorization scenarios without touching any application code.

# What about owner-based authorization?
Good question! We had an interesting discussion about this. OPA does support making HTTP calls to
external services during policy evaluation using the `http.send` function. So theoretically, OPA could
query the Registry API to check if a user owns a particular artifact before authorizing a request.

However, this creates some challenges:

* **Latency** - Every request would require an additional HTTP call
* **Load** - Doubles the load on the Registry API
* **Complexity** - Ownership data changes frequently and requires database access

A future evolution of this example will likely explore this area further, assuming we receive any
feedback from interested parties!  Come and open a discussion about this topic if you like:

https://github.com/Apicurio/apicurio-registry/discussions

# Is this production ready?
This is a proof of concept, not a production-ready solution (at least not yet). There are a few things
you'd want to add for production use:

* **TLS/HTTPS** - Enable TLS for all external communication
* **Network isolation** - Deploy Registry in a private network, only accessible from Envoy
* **High availability** - Run multiple instances of each component
* **Monitoring** - Add Prometheus metrics, distributed tracing, and logging
* **Secret management** - Use proper secret management tools for credentials
* **Policy management** - Use GitOps for managing OPA policies

But the foundation is solid, and the pattern is proven. If you're interested in deploying Registry
with externalized auth, this POC gives you a great starting point!

# Try it out!
If this sounds interesting to you, I encourage you to check out the POC in the Registry repository.
The README in the `in-memory-with-envoy-opa` directory has detailed instructions on how to run it,
test it, and customize it for your needs.

And as always, feedback is welcome! If you try this out and run into issues, or if you have ideas
for improvements, please let us know on GitHub or Zulip.

Thanks for reading, and happy registering!
