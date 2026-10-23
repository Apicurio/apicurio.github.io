---
layout: post
title: "One Keycloak Realm, Separate Trust Boundaries: Securing Kafka and Its Schema Registry"
date: 2026-10-23 12:00:00
author: carles
categories: registry engineering
published: false
---

A service can have permission to publish Kafka records without having permission to change their schemas. Another can present a valid token and still be denied a topic. How do you distinguish an identity problem from an authorization decision without broadening permissions until the request works?

We exercise Keycloak, a Kafka broker using Strimzi's OAuth libraries and Apicurio Registry in a reproducible local integration lab. An invalid token returns 401; a read-only identity can fetch a schema but receives 403 when publishing a version, with accepted content unchanged. Kafka accepts an authorized producer and rejects another authenticated identity with TopicAuthorizationException; broker reads verify which record actually arrived.

The configuration walkthrough connects issuer and audience checks to principal mapping, Kafka ACLs and registry authorization. The lab exposed an outdated auth setting that left Registry authentication disabled, showing why negative controls matter. We map these findings to Kubernetes deployment responsibilities while labeling the local plaintext/admin listener as lab-only. The takeaway is a tested diagnostic method, not a production security template.


## What actually ran

Real Keycloak 26.0, Registry 3.3.3 and Strimzi Kafka OAuth integration passed. Invalid token: 401. Read-only schema lookup: success. Read-only mutation: 403, accepted content unchanged, new version absent. Authorized Kafka producer observed in broker; reader got TopicAuthorizationException and its record was absent.

## Reproduce the observation

[Companion implementation](https://github.com/carlesarnal/keycloak-strimzi-apicurio-security/tree/talk/evidence-2026-10-23).

```sh
python3 verify.py
```

## What the result establishes

Compose integration uses Strimzi Kafka image 0.45.0/Kafka 3.9.0 and OAuth libraries, not a Strimzi operator deployment. Plaintext and an internal anonymous admin listener are deliberate lab fixtures. Tokens and real credentials are not recorded. Fixed local-lab credentials are disposable. TLS, rotation and Kubernetes routing are not established by this test.

The machine-readable result and the executable assertions are kept together. A failed candidate is an observation to preserve, not a reason to revise acceptance criteria after seeing the answer. These tests are evidence for the stated mechanism, not a promise of production scale or universal correctness.
