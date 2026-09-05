---
layout: post
title: "Introducing Form-Based Authentication in Apicurio Registry"
date: 2026-08-18 05:00:00 -0700
author: arjav
categories: registry security authentication
---

Securing your API schemas and event definitions is a critical part of managing any Apicurio Registry deployment. For enterprise environments, Apicurio has always provided robust integrations with Identity Providers (IdPs) like Keycloak via OIDC.

However, for smaller deployments, testing environments, or teams that prefer a simpler setup without the overhead of maintaining an external IdP, Apicurio Registry offers a built-in "Basic" authentication mechanism.

While functional, HTTP Basic Authentication has historically relied on the browser's native credential popup. Today, I am excited to share that starting with version 3.3.1 (via [PR #8614](https://github.com/Apicurio/apicurio-registry/pull/8614)), Apicurio Registry now officially supports Form-Based Authentication!

---

## The Problem with Basic Auth Popups

If you have used the basic authentication mode in the past, you are likely familiar with the unstyled browser popup asking for a username and password. While this gets the job done, it comes with a few significant drawbacks:

1. **Poor User Experience:** The native browser popup feels disconnected from the rest of the application.
2. **Password Manager Issues:** Modern password managers (like 1Password, Bitwarden, or browser auto-fill) often struggle to interact reliably with native HTTP Basic Auth dialogs.

## The Solution: Form-Based Authentication

To solve these issues, we integrated Form-Based Authentication into the registry's pluggable auth chain. Instead of a harsh browser popup, users are greeted with an HTML login form.

### Why is this better?

* **Frictionless Password Management:** HTML `<input>` fields mean your favorite password managers will seamlessly detect and auto-fill your credentials.
* **Cookie-Based Flows:** Form authentication utilizes cookie-based sessions natively through Quarkus, providing a much smoother web experience than traditional Basic Auth headers.

## How It Works Under the Hood

Apicurio Registry is built on top of [Quarkus](https://quarkus.io/), which provides a highly extensible security architecture.

Instead of writing custom browser-detection logic or UI files, this feature wires Quarkus's built-in `FormAuthenticationMechanism` directly into Apicurio Registry's pluggable authentication chain.

The implementation builds an ordered chain of authentication strategies from a configurable priority list and seamlessly iterates through them. By adding Form Authentication as a link in this chain, Apicurio can now securely fall back to an HTML form for credential collection when configured to do so.

## How to Configure It

Enabling this feature requires configuring Quarkus's form authentication alongside a backing `IdentityProvider`.

First, enable the form auth and set the mechanism priority in your configuration:

```properties
quarkus.http.auth.form.enabled=true
apicurio.authn.mechanism.priority=form
```

Next, you must configure a backing Quarkus `IdentityProvider` so the registry knows how to verify the credentials. For example, to use embedded properties-based users for a quick development setup:

```properties
quarkus.security.users.embedded.enabled=true
quarkus.security.users.embedded.users.alice=alice123
quarkus.security.users.embedded.roles.alice=sr-admin
```

*(Note: You can also back this with a JDBC or LDAP realm for production environments).*

## Conclusion

Contributing this feature to Apicurio Registry was an incredible experience. Diving into the Quarkus security layer and figuring out how to perfectly wire the `FormAuthenticationMechanism` into the registry's authentication chain was a fun architectural challenge.

A huge thank you to **Eric Wittmann**, **Carles Arnal**, **Paolo Antinori**, and **Jakub Senko** for their incredibly helpful reviews, guidance, and for helping get this feature merged!

If you want to dive into the code and see exactly how we implemented this, you can check out the pull request here: [PR #8614](https://github.com/Apicurio/apicurio-registry/pull/8614).

Happy coding!
