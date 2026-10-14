---
layout: post
title: "Introducing Form-Based Authentication in Apicurio Registry"
date: 2026-08-18 05:00:00 -0700
author: arjav
categories: registry security authentication
---

Securing your API schemas and event definitions is a critical part of managing any Apicurio Registry deployment. Historically, securing the registry required integrating with an external OpenID Connect (OIDC) Identity Provider (IdP) such as Keycloak. Even HTTP Basic authentication (`apicurio.authn.basic-client-credentials.enabled`) operated by exchanging client credentials with an upstream OIDC server.

For development environments, testing deployments, or teams seeking a lightweight architecture without the operational overhead of an external IdP, this posed a barrier to entry.

Starting with **version 3.3.2** (via [PR #8614](https://github.com/Apicurio/apicurio-registry/pull/8614)), Apicurio Registry introduces support for **Form-Based Authentication**. Paired with a Quarkus identity provider (such as embedded users, JDBC, or LDAP), form auth provides a way to secure Apicurio Registry in a completely standalone deployment without Keycloak or an external OIDC server.

---

## How It Works Under the Hood

Apicurio Registry runs on [Quarkus](https://quarkus.io/), which features an extensible security architecture.

Instead of introducing custom authentication handling, this feature integrates Quarkus's built-in `FormAuthenticationMechanism` directly into Apicurio Registry's configurable authentication chain.

The registry constructs an ordered chain of authentication strategies from a priority list and evaluates incoming requests strictly in that sequence. When configured, form authentication handles credential verification via standard HTML forms and issues cookie-backed session tokens.

> **Note on Evaluation Order:** The authentication chain executes strictly in the sequence configured by `apicurio.authn.mechanism.priority`; there is no automatic fallback. Furthermore, if `quarkus.http.auth.form.enabled=true` but `form` is not included in the priority list, the registry logs a **"silent lockout"** warning at startup and form authentication will not function.

---

## Operator Requirement: Providing the Login Form

It is important to note that **Apicurio Registry does not ship with a built-in HTML login form or UI form-login screen**. The registry web console currently supports `none` and `oidc` authentication flows.

When form authentication is enabled, Quarkus redirects unauthenticated browser requests to a login page (defaulting to `/login.html`). Operators must provide and serve their own static HTML login, error, and landing pages (for example, by placing them in the application's static resources or serving them via an upstream reverse proxy). If these files are not present, users will receive a `404 Not Found` response.

Quarkus allows configuring these paths:

```properties
quarkus.http.auth.form.login-page=/login.html
quarkus.http.auth.form.error-page=/error.html
quarkus.http.auth.form.landing-page=/index.html
```

---

## How to Configure It

Enabling form authentication involves configuring the mechanism priority, providing an identity provider, and enabling role-based authorization.

### 1. Enable Form Authentication & Set Priority

```properties
quarkus.http.auth.form.enabled=true

# Specify the mechanism priority. Note that setting this property replaces the
# default chain ("basic,proxy-header,oidc"). Combine mechanisms as needed:
apicurio.authn.mechanism.priority=form,oidc
```

### 2. Configure a Backing Identity Provider

The registry requires an identity provider to validate credentials. For testing and development, you can use Quarkus's embedded properties-based realm. Note that `plain-text=true` is required when using unhashed passwords:

```properties
quarkus.security.users.embedded.enabled=true
quarkus.security.users.embedded.plain-text=true
quarkus.security.users.embedded.users.alice=alice123
quarkus.security.users.embedded.roles.alice=sr-admin
```

### 3. Enable Role-Based Authorization

To enforce permissions based on assigned roles (such as `sr-admin`), enable authorization and configure the role source:

```properties
apicurio.auth.role-based-authorization=true
apicurio.auth.role-source=token
```

---

## Security Considerations

While form-based authentication simplifies standalone deployments, session cookies introduce security implications that must be planned for in production:

> **Important Security Considerations:**
>
> 1. **CSRF Exposure:** Form authentication with session cookies introduces CSRF exposure for state-changing requests. Production deployments must configure CSRF protection as documented in the [Quarkus CSRF Prevention Guide](https://quarkus.io/guides/security-csrf-prevention).
> 2. **Cookie Hardening:** Ensure session cookies are appropriately hardened using Quarkus's form-auth cookie configuration properties. In particular, enable the `HttpOnly` setting and ensure the session cookie is appropriately configured for HTTPS deployments.
> 3. **Production Credentials:** Embedded plain-text passwords (`alice123`) should only be used for local development and testing. Production environments should back authentication with an external Identity Provider, LDAP, or a database realm via JDBC.

---

## Conclusion

Form-based authentication provides a lightweight, standalone security alternative for Apicurio Registry deployments where running an external OIDC provider is unnecessary.

A huge thank you to **Eric Wittmann**, **Carles Arnal**, **Paolo Antinori**, and **Jakub Senko** for their guidance, reviews, and architectural support.

To explore the implementation details, check out the merged pull request: [PR #8614](https://github.com/Apicurio/apicurio-registry/pull/8614).

Happy coding!
