---
layout: post
title: "Bringing Canonical Protobuf Parsing to the JVM: Why We Migrated to protobuf4j"
date: 2025-12-10 12:00:00
author: carles
categories: registry protobuf
---

We have successfully migrated Apicurio Registry's Protobuf implementation from wire-schema to protobuf4j. This shift eliminates third-party "re-implementations" of the Protobuf spec in favor of the canonical C++ implementation compiled to WebAssembly (Wasm) and running safely on the JVM.

This move solves a long-standing engineering dilemma: how to get 100% spec compliance without the operational nightmare of JNI (Java Native Interface).

---

## The Problem: The "Re-implementation" Gap

For years, managing Protobuf schemas in a pure Java environment has required a compromise. We essentially had two options:

**Option 1: Use protoc via JNI/CLI**

This gives us the "official" behavior but introduces massive operational complexity:
- Managing platform-specific binaries
- Security risks from native code execution
- Potential JVM crashes due to native errors

**Option 2: Use a Java re-implementation (e.g., wire-schema)**

This keeps the application "Pure Java" and operationally simple, but it relies on a third-party library to manually mimic the behavior of the official Google protoc compiler.

In Apicurio Registry, we relied on wire-schema. While excellent, it is ultimately a re-implementation. As the Protobuf spec evolves, any lag or subtle discrepancy between the canonical C++ parser and the Java re-implementation creates a "compatibility gap" that can break edge cases for our users.

---

## The Solution: protobuf4j (Wasm on JVM)

We have replaced wire-schema with **protobuf4j**.

### What is protobuf4j?

protobuf4j is **not a rewrite**. It is the official Google Protobuf C++ source code, compiled to WebAssembly (Wasm), and executed on the JVM using [Chicory](https://github.com/nicopolyptic/chicory) (a zero-dependency Wasm runtime for Java).

This approach gives us the "Holy Grail" of parsing:

| Benefit | Description |
|---------|-------------|
| **100% Reliability** | We are running the actual upstream code. If it parses in protoc, it parses in Apicurio. There is no "translation loss." |
| **100% Feasibility** | It runs as pure Java bytecode. No JNI. No native libraries. No sidecars. |

---

## Why This Matters

### 1. Unmatched Reliability (The "Correctness" Pitch)

By switching to protobuf4j, we eliminate an entire class of bugs related to "parser drift." We no longer need to audit whether our Java library interprets a complex nested `oneof` field exactly the same way the C++ compiler does. **We are running the same logic.**

This drastically reduces the risk of corruption or rejection of valid schemas—a critical requirement for a central registry service.

### 2. Operational Feasibility (The "No-Headache" Pitch)

For SREs and users, this change is invisible but powerful:

- **No Native Dependencies**: We don't need to ship different binaries for Linux (x86/ARM), macOS, or Windows. The artifact remains a standard JAR.

- **Sandboxed Execution**: Unlike JNI, which allows native code to access (and crash) the entire JVM memory space, Wasm execution is memory-safe and sandboxed. If the parser fails, it throws a Java exception, not a segfault.

### 3. Future-Proofing

Updating our Protobuf support no longer requires waiting for a third-party team to port new features to Java. We simply recompile the updated upstream C++ source to Wasm. This significantly accelerates our time-to-market for supporting new Protobuf versions (e.g., Editions).

---

## Performance Results

We ran an apples-to-apples benchmark comparing both implementations using the same operation: `FileDescriptorUtils.protoFileToFileDescriptor()` which parses a schema string and produces a fully resolved `FileDescriptor`.

| Schema Type | Old (Wire v3.1.2) | New (protobuf4j) | Difference |
|-------------|-------------------|------------------|------------|
| Simple (UUID) | 3.417 ms/op | 3.156 ms/op | **protobuf4j 8% faster** |
| Complex (Order) | 2.897 ms/op | 2.880 ms/op | **protobuf4j 0.6% faster** |

**Key Finding: protobuf4j matches or beats Wire performance while providing 100% spec compliance.**

The results show that running the canonical C++ protoc via WebAssembly is competitive with a pure Java re-implementation. The WASM boundary crossing overhead is minimal thanks to:

1. **Chicory's AOT compilation** - WASM bytecode is compiled to JVM bytecode for near-native performance
2. **Efficient memory management** - protobuf4j optimizes WASM memory operations
3. **No serialization overhead** - strings are passed directly via WASM memory

---

## Verification & Migration Strategy

To ensure this wasn't just theoretical, we've prepared a rigorous migration plan (detailed in [PR #6926](https://github.com/Apicurio/apicurio-registry/pull/6926)):

### Backward Compatibility Testing
We built a dedicated compatibility module that shades the old wire-schema serializer. We ran extensive integration tests to prove that schemas registered with the old engine are bit-for-bit compatible with the new protobuf4j engine.

### What's Included

- **Updated serializers/deserializers** for Kafka, Pulsar, and NATS
- **Backward compatibility infrastructure** ensuring a smooth transition
- **~50% reduction in dependencies** by removing Wire-schema libraries

---

## Conclusion

Moving to protobuf4j represents a maturity milestone for Apicurio Registry. We are moving away from "mimicking" standard behaviors to "embedding" them. This ensures that as we scale, our foundation is as reliable as the Protocol Buffers spec itself.

The result: **100% spec compliance with equal or better performance, and zero operational headaches**.

We encourage the community to explore these changes, provide feedback, and contribute. For more details, check out the [pull request on GitHub](https://github.com/Apicurio/apicurio-registry/pull/6926).
