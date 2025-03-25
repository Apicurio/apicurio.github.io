---
layout: post
title: "Apicurio Registry 3.0.0 - Evolving Our Serialization and Deserialization Modules"
date: 2025-04-03 12:00:00
author: carles
categories: registry guide
---

# Apicurio Registry 3.x: Evolving Our Serialization and Deserialization Modules
Serialization and deserialization (SerDes) are critical functionalities within Apicurio Registry, enabling users to seamlessly manage schema evolution and compatibility. With the release of Apicurio Registry 3.x, we've significantly evolved our SerDes modules, focusing on flexibility, reusability, and broader integration.

## What's Changed?

### 1. Reusable, Generic Codebase
   Previously, in Apicurio Registry 2.6.x, our serializers and deserializers were independently organized by format—Avro, JSON Schema, and Protobuf—each housed within its separate module. This resulted in duplicated efforts and increased complexity when adding support for new messaging platforms.

In Apicurio Registry 3.x, we've adopted a modular design to improve reuse:

A new generic module now hosts all common, format-agnostic serialization logic.

Specific messaging system implementations (Kafka, Pulsar, NATS) reuse this generic codebase.

This approach significantly reduces duplication, simplifies maintenance, and streamlines contributions from the community.

### 2. Multi-Platform Support
With Apicurio Registry 2.6.x, our SerDes primarily focused on Kafka support. However, users increasingly require schema management in diverse messaging environments.

With version 3.x, we've expanded our support beyond Kafka:

- Apache Pulsar: Dedicated SerDes leveraging generic functionality to seamlessly integrate Apicurio Registry with Pulsar.

- NATS: Specific Avro support tailored for integration with NATS messaging systems.

This addition enables users to utilize Apicurio Registry in a broader range of architectures.

### 3. Improved Code Maintainability and Extensibility
By restructuring our SerDes modules, we've created a solid foundation for future enhancements. Developers can now:

- Easily implement SerDes for additional messaging platforms.
- Share common serialization/deserialization logic without duplication.
- Enjoy streamlined maintenance due to a centralized and modular architecture.

## Directory Structure Comparison
Here's a concise before-and-after illustration of our SerDes directory structures:

```
Apicurio Registry 2.6.x

serdes/
├── avro-serde
├── jsonschema-serde
├── protobuf-serde
└── serde-common

Apicurio Registry 3.x
serdes/
├── generic
│   └── serde-common-avro
│   └── serde-common-protobuf
│   └── serde-common-jsonschema
├── kafka
│   └── avro-serde
│   └── protobuf-serde
│   └── jsonschema-serde
├── pulsar
│   └── avro-serde
│   └── protobuf-serde
│   └── jsonschema-serde
└── nats
│   └── avro-serde
│   └── protobuf-serde
│   └── jsonschema-serde
```

The refined structure clearly separates common logic (generic) from system-specific code (kafka, pulsar, nats), emphasizing the new modular and reusable approach.

## Configuration Simplification and Improvements
With Apicurio Registry 3.x, the configuration of serializers and deserializers has also been streamlined, reflecting the modular nature of the updated architecture. Here's what's changed:

### 1. Unified Configuration Properties
In Apicurio Registry 2.6.x, each SerDes module required individual configuration properties, leading to redundancy and complexity. Users needed to repeat similar settings across multiple format-specific serializers and deserializers.

In Apicurio Registry 3.x, configuration properties have been unified and centralized, greatly simplifying setup. For instance:

Common properties (registry URL, schema retrieval strategy, caching, compatibility checks) are now standardized and shared across different formats and platforms.

Messaging platform-specific properties (e.g., Kafka, Pulsar, NATS) are clearly isolated, making it easy to manage configurations tailored to each platform.

### 2. Improved Clarity and Documentation
With unified and modular configurations, it's easier to understand and configure the SerDes for your specific needs. Users benefit from:

- Clearer property names and structured organization.
- Improved documentation that simplifies the onboarding and troubleshooting process.

### 3. Easier Extensibility
The new configuration model provides a clearer path for adding support for future messaging systems or serialization formats:

- Developers extending SerDes functionality benefit from standardized conventions.
- Less boilerplate configuration means faster development and lower risk of misconfiguration.

## Conclusion
The reorganization of our SerDes modules marks a significant step forward for Apicurio Registry, enabling broader messaging platform support, better maintainability, and increased flexibility. We look forward to seeing how this improved architecture benefits your projects and workflows.

We encourage the community to explore these changes, provide feedback, and contribute. Together, let's continue evolving Apicurio Registry to meet our shared vision of efficient, robust, and versatile schema management.