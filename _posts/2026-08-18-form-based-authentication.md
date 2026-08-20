---
layout: post
title: "Introducing Form-Based Authentication in Apicurio Registry"
date: 2026-08-18 05:00:00 -0700
author: Arjav Jain
categories: registry security authentication
---

Securing your API schemas and event definitions is a critical part of managing any Apicurio Registry deployment. For enterprise environments, Apicurio has always provided robust integrations with Identity Providers (IdPs) like Keycloak via OIDC. 

However, for smaller deployments, testing environments, or teams that prefer a simpler setup without the overhead of maintaining an external IdP, Apicurio Registry offers a built-in "Basic" authentication mechanism. 

While functional, HTTP Basic Authentication has historically relied on the browser's native credential popup. Today, I am excited to share that starting with recent updates (via [PR #8614](https://github.com/Apicurio/apicurio-registry/pull/8614)), Apicurio Registry now officially supports **Form-Based Authentication** for the UI!

---

## The Problem with Basic Auth Popups

If you have used the basic authentication mode in the past, you are likely familiar with the grey, unstyled browser popup asking for a username and password. While this gets the job done, it comes with a few significant drawbacks:

1. **Poor User Experience:** The native browser popup cannot be styled or branded. It feels disconnected from the rest of the polished Apicurio Registry UI.
2. **Password Manager Issues:** Modern password managers (like 1Password, Bitwarden, or browser auto-fill) often struggle to interact reliably with native HTTP Basic Auth dialogs.
3. **No True "Logout":** Because of how browsers cache basic auth credentials, implementing a secure, reliable "Logout" button is notoriously difficult. Users often have to close their entire browser session to log out.

## The Solution: A Native Login Experience

To solve these issues, we implemented a custom Form-Based Authentication flow. Instead of a harsh browser popup, users are now greeted with a clean, branded HTML login page integrated directly into the Apicurio Registry UI.

<img src="/images/posts/Form-Based%20Authentication/Form-Based%20Authentication.png" alt="Apicurio Registry Form-Based Login" style="max-width: 800px; width: 100%; height: auto; border: 1px solid #ccc; border-radius: 4px; margin: 20px 0;" />

### Why is this better?

* **Seamless UI:** The login screen matches the look and feel of the rest of the application.
* **Frictionless Password Management:** HTML `<input>` fields mean your favorite password managers will seamlessly detect and auto-fill your credentials.
* **True Session Management:** By utilizing cookie-based sessions for UI interactions, users can now securely log out of the registry with a simple click, invalidating the session immediately.

## How It Works Under the Hood

Apicurio Registry is built on top of [Quarkus](https://quarkus.io/), which provides a highly extensible security architecture. 

To make this work without breaking existing API clients (which still need to use standard HTTP Basic Auth headers), we implemented a custom `AppAuthenticationMechanism`. 

When an unauthenticated request hits the server, the mechanism inspects the request headers:
* If the request is an automated API call (e.g., from a CI/CD pipeline or a Kafka client), it responds with a standard `401 Unauthorized` and a `WWW-Authenticate: Basic` challenge.
* If the request is originating from a web browser navigating to the UI, the mechanism intelligently intercepts the request and **redirects the user to the new `/ui/login` page**.

This dual-approach ensures backward compatibility for all automated tooling while massively upgrading the experience for human users.

## How to use it

The best part? You don't have to change anything complex to use it. When you enable the basic authentication profile in your Apicurio Registry configuration, the UI will automatically route unauthenticated users to the new form-based login page. 

## Conclusion

Contributing this feature to Apicurio Registry was an incredible experience. Diving into the Quarkus security layer and figuring out how to perfectly balance API backward compatibility with UI improvements was a fun architectural challenge.

A huge thank you to **Eric Wittmann**, **Carles Arnal**, and **Paolo Antinori** for their incredibly helpful reviews, guidance, and for helping get this feature merged!

If you want to dive into the code and see exactly how we implemented the custom authentication mechanism, you can check out the pull request here: [PR #8614](https://github.com/Apicurio/apicurio-registry/pull/8614).

Happy coding!
