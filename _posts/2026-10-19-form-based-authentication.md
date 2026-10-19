---
layout: post
title: "Introducing Form-Based Authentication in Apicurio Registry"
date: 2026-10-19 05:00:00 -0700
author: arjav
categories: registry security authentication
---

Securing your API schemas and event definitions is a critical part of managing any Apicurio Registry deployment. Until now, every built-in way to require a username and password depended on infrastructure outside the registry: OpenID Connect (OIDC) needs an identity provider such as Keycloak, HTTP Basic authentication (`apicurio.authn.basic-client-credentials.enabled`) exchanges client credentials with that same OIDC server, and proxy-header authentication relies on an authenticating reverse proxy in front of the registry.

Starting with **version 3.3.2** (via [PR #8614](https://github.com/Apicurio/apicurio-registry/pull/8614)), Apicurio Registry supports **Form-Based Authentication**. Paired with a Quarkus identity provider (embedded users, JDBC, or LDAP), form auth lets you put a username/password login in front of the registry without Keycloak, another OIDC server, or an authenticating proxy.

---

## How It Works Under the Hood

Apicurio Registry runs on [Quarkus](https://quarkus.io/), which has an extensible security architecture. Rather than introducing custom authentication handling, this feature wires Quarkus's built-in `FormAuthenticationMechanism` into the registry's configurable authentication chain.

The registry builds an ordered chain of authentication mechanisms from `apicurio.authn.mechanism.priority` and tries each enabled mechanism, in that order, until one of them authenticates the request. Mechanisms that are listed but not enabled are skipped. With form authentication, the browser posts credentials from an HTML form, and Quarkus validates them against the configured identity provider and issues an encrypted session cookie.

Two details of the chain matter when you configure it:

- **The challenge comes from the last mechanism in the chain.** When an unauthenticated request arrives, the registry asks the *last* enabled mechanism in the priority list to issue the challenge. For browsers to be redirected to your login page, `form` must be the last enabled mechanism.
- **There is no implicit fallback.** If `quarkus.http.auth.form.enabled=true` but `form` is not in the priority list, the registry logs a "silent lockout" warning at startup and nobody will be able to log in with a form.

## Operator Requirement: Providing the Login Form

**Apicurio Registry does not ship a login page.** The registry web console supports only the `none` and `oidc` authentication flows, so it has no form-login screen of its own.

When form authentication is enabled, Quarkus redirects unauthenticated requests to a login page (by default `/login.html`). You must provide that page, along with an error page, and serve them on the same origin as the registry, for example from the reverse proxy or ingress in front of it. If the pages are missing, users are redirected to a `404 Not Found`.

Quarkus lets you configure these paths:

```properties
quarkus.http.auth.form.login-page=/login.html
quarkus.http.auth.form.error-page=/error.html
quarkus.http.auth.form.landing-page=/
```

The login form must `POST` to `j_security_check` using the `j_username` and `j_password` field names (the Quarkus defaults). A minimal page looks like this:

```html
<form method="post" action="/j_security_check">
  <label>Username <input type="text" name="j_username" autocomplete="username"></label>
  <label>Password <input type="password" name="j_password" autocomplete="current-password"></label>
  <button type="submit">Log in</button>
</form>
```

See the [Quarkus form authentication guide](https://quarkus.io/guides/security-authentication-mechanisms#form-auth) for the full set of options.

## How to Configure It

Enabling form authentication involves enabling the mechanism, setting the mechanism priority, providing an identity provider, and enabling role-based authorization.

### 1. Enable Form Authentication and Set the Priority

```properties
quarkus.http.auth.form.enabled=true

# Setting this property replaces the default chain ("basic,proxy-header,oidc").
# For a standalone deployment, form should be the only (and therefore last) mechanism.
apicurio.authn.mechanism.priority=form
```

### 2. Configure a Backing Identity Provider

The registry needs an identity provider to validate credentials. For development and testing you can use Quarkus's embedded properties-based realm. `plain-text=true` is required when the passwords are not hashed:

```properties
quarkus.security.users.embedded.enabled=true
quarkus.security.users.embedded.plain-text=true
quarkus.security.users.embedded.users.alice=alice123
quarkus.security.users.embedded.roles.alice=sr-admin
```

### 3. Enable Role-Based Authorization

To enforce permissions based on the roles assigned by the identity provider (such as `sr-admin`), enable role-based authorization. The roles come from the authenticated identity, which is what the default `token` role source uses:

```properties
apicurio.auth.role-based-authorization=true
# Optional: "token" is already the default
apicurio.auth.role-source=token
```

## Limitations: Browsers, Not API Clients

Form authentication is designed for people using a browser. When `form` is the last mechanism in the chain, an unauthenticated REST request receives a redirect to the login page rather than a `401 Unauthorized`. Programmatic clients such as the registry SDKs, the CLI, and the Kafka SerDes have no practical way to complete a form login. Basic authentication is not an alternative here either, because it still exchanges credentials with an OIDC server.

If your deployment needs authenticated machine-to-machine access, use OIDC (or Kubernetes authentication, when running in a cluster) for those clients.

## Security Considerations

Session cookies come with trade-offs you need to plan for before using form authentication in production:

> 1. **CSRF exposure:** Cookie-based sessions reintroduce CSRF exposure for state-changing requests. Production deployments must configure CSRF protection, as described in the [Quarkus CSRF Prevention guide](https://quarkus.io/guides/security-csrf-prevention).
> 2. **Cookie hardening:** Serve the registry over HTTPS and harden the session cookie using the `quarkus.http.auth.form.*` cookie properties, such as `http-only-cookie`, `cookie-same-site`, and `cookie-name`. See the [Quarkus form authentication guide](https://quarkus.io/guides/security-authentication-mechanisms#form-auth) for details.
> 3. **Production credentials:** Plain-text embedded passwords like `alice123` are for local development and testing only. In production, back form authentication with an LDAP or JDBC realm.

## Conclusion

Form-based authentication gives Apicurio Registry a lightweight, standalone way to require a login for browser users in deployments where running an external OIDC provider is unnecessary.

A huge thank you to **Eric Wittmann**, **Carles Arnal**, **Paolo Antinori**, and **Jakub Senko** for their guidance, reviews, and architectural support.

To explore the implementation details, check out the merged pull request: [PR #8614](https://github.com/Apicurio/apicurio-registry/pull/8614).

Happy coding!
