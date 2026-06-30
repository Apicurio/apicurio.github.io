---
layout: post
title: "Apicurio Registry Joins the Cloud Native Computing Foundation"
date: 2026-06-18 12:00:00
author: carles
categories: registry cncf announcement
---

We are thrilled to announce that **Apicurio Registry has been accepted into the Cloud Native Computing Foundation (CNCF) as a Sandbox project**! This is a major milestone for the project and the community, and we couldn't be more excited about what it means for the future of open-source schema and API registry management.

---

# What This Means

Joining the CNCF means that Apicurio Registry now has a **vendor-neutral home** under one of the most respected foundations in the cloud-native ecosystem. The CNCF hosts projects like Kubernetes, Prometheus, Envoy, and many others that have become the backbone of modern infrastructure.

For Apicurio Registry, CNCF membership brings:

- **Vendor-neutral governance** — ensuring the project's long-term independence and community-driven evolution
- **Greater visibility** — making it easier for organizations evaluating open-source alternatives to proprietary registries to discover and adopt Apicurio
- **Community growth** — leveraging CNCF's infrastructure and reach to expand the contributor base beyond its current roots
- **Ecosystem alignment** — deepening integration with the broader cloud-native landscape

# Why CNCF?

Apicurio Registry already integrates with several CNCF projects:

- **Strimzi** (Incubating) — serving as a schema registry for Apache Kafka and using Kafka as a storage backend
- **Kubernetes** (Graduated) — with a dedicated operator and ConfigMap-based storage via KubernetesOps
- **xRegistry** (Sandbox) — working toward alignment with the xRegistry specification as a production-grade implementation
- **gRPC** (Incubating) — managing Protocol Buffer schemas
- **CloudEvents** (Graduated) — through extensible artifact type support
- **Argo CD / Flux** — enabling GitOps workflows through KubernetesOps storage

The CNCF is the natural home for a project that sits at the intersection of API governance, data streaming, and cloud-native infrastructure.

# The Journey

This acceptance is the result of years of work from the Apicurio community. Some highlights since the project's previous application in 2023:

- **Apicurio Registry 3.0 GA** shipped in June 2024, bringing a redesigned data model, new REST API, and rewritten KafkaSQL storage
- **Apicurio Studio was deprecated and merged** into Registry 3.1.0, consolidating the project into a single focused product
- **AI-native capabilities** were introduced, including A2A Agent Cards, MCP Server integration, and LLM artifact types
- **Custom artifact type extensibility** allows users to define their own artifact types
- The project now has **768+ GitHub stars**, **312 forks**, and **114 contributors from 30+ organizations**
- Production deployments power **IBM Event Streams** and **Red Hat Application Foundations**
- Contributors from organizations like Bloomberg, Amazon, Volvo, Axual, and Riot Games have helped shape the project

# Filling a Gap in the CNCF Landscape

There is currently no other production-grade, multi-format schema and API registry among CNCF projects. Apicurio Registry fills that gap by providing:

- Support for **all major schema formats** — OpenAPI, AsyncAPI, GraphQL, Avro, Protobuf, JSON Schema, and more
- **Pluggable storage backends** — PostgreSQL, Apache Kafka, GitOps, and KubernetesOps
- **Confluent Schema Registry API compatibility** — enabling drop-in replacement of proprietary alternatives
- **Client libraries** with serializer/deserializer support for Kafka, Pulsar, and NATS, plus SDKs in Java, Go, TypeScript, and Python
- A **governance engine** with hierarchical rules for validity and compatibility enforcement
- A **Kubernetes operator** for lifecycle management
- A **web-based UI** for artifact management

All of this under the **Apache License 2.0**.

# What's Next

Joining the CNCF is a beginning, not a destination. Our roadmap includes:

- **xRegistry specification alignment** — becoming a production-grade reference implementation
- **Expanded AI agent ecosystem** — building on our A2A, MCP, and LLM artifact support
- **Performance and scalability improvements** — caching, OpenTelemetry tracing, and optimization
- **MySQL storage support**
- **Continued SDK and CLI development**

# Get Involved

Now is the perfect time to get involved with Apicurio Registry:

- Check out the [CNCF Sandbox application](https://github.com/cncf/sandbox/issues/461) for the full story
- Follow the [onboarding process](https://github.com/cncf/sandbox/issues/495)
- Star the project on [GitHub](https://github.com/Apicurio/apicurio-registry)
- Try it out with `docker run -it -p 8080:8080 quay.io/apicurio/apicurio-registry:latest`
- Join the conversation and contribute

We want to thank everyone who has contributed to Apicurio Registry over the years — the maintainers, the contributors, the users, and the organizations that have trusted the project in production. This milestone belongs to the entire community.

Welcome to the CNCF, Apicurio Registry!
