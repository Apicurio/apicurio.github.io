---
layout: post
title: "Extend Apicurio Registry with Custom Artifact Types at Deployment Time"
date:   2025-10-27 02:13:00
author: eric
categories: announcement registry features
---

One of the most exciting new features in **Apicurio Registry 3.1.0** is the ability to extend the registry
with custom artifact types at deployment time, without rebuilding the project. This capability opens up
Registry to support any schema or API definition format your organization uses, even if it's not natively
supported out of the box.

---

# The Challenge: Supporting Custom Schema Formats

Apicurio Registry natively supports many popular schema and API definition formats:
- OpenAPI
- AsyncAPI
- Apache Avro
- JSON Schema
- Google Protocol Buffers
- GraphQL
- WSDL
- XML Schema (XSD)

But what if your organization uses other formats like RAML, Schematron, WADL, API Blueprint, or a
completely custom schema format? Previously, you would have to fork the Registry project, implement
support for your format, and maintain your own custom build.

Starting with Registry 3.1.0, that's no longer necessary.

# The Solution: Custom Artifact Types Configuration

The new custom artifact types feature allows you to configure Registry to support additional artifact
types by providing a JSON configuration file at deployment time. You can implement the (optional)
type-specific logic in two different ways:

1. **Java classes** - Implement Java interfaces for maximum performance (**requires a custom build
   of Registry**)
2. **Webhooks** - Deploy HTTP endpoints for ultimate flexibility and language independence

Let's explore how this works.

# Configuration Overview

To add a custom artifact type, you create a JSON configuration file and point Registry to it using the
`apicurio.artifact-types.config-file` configuration property.

Here's the structure of the configuration file:

```json
{
  "includeStandardArtifactTypes": true,
  "artifactTypes": [
    {
      "artifactType": "RAML",
      "name": "RAML",
      "description": "The simplest way to model APIs",
      "contentTypes": [
        "application/json",
        "application/x-yaml"
      ],
      "contentAccepter": {
        "type": "webhook",
        "url": "http://custom-validator-service:8080/accepts"
      },
      "contentValidator": {
        "type": "webhook",
        "url": "http://custom-validator-service:8080/validate"
      },
      "compatibilityChecker": {
        "type": "webhook",
        "url": "http://custom-validator-service:8080/compatibility"
      },
      "contentCanonicalizer": {
        "type": "webhook",
        "url": "http://custom-validator-service:8080/canonicalize"
      },
      "contentDereferencer": {
        "type": "webhook",
        "url": "http://custom-validator-service:8080/dereference"
      },
      "referenceFinder": {
        "type": "webhook",
        "url": "http://custom-validator-service:8080/references"
      }
    }
  ]
}
```

## Configuration Properties

Let's break down what each property does:

### Top-Level Properties

- **includeStandardArtifactTypes**: Set to `true` to include all built-in types (OpenAPI, Avro, etc.)
  alongside your custom types, or `false` to use only your custom types

### Artifact Type Properties

- **artifactType**: The unique identifier for your artifact type (e.g., "RAML", "SCHEMATRON")
- **name**: Display name shown in e.g. logs
- **description**: Human-readable description of the artifact type
- **contentTypes**: List of MIME types for this artifact type's content (e.g., "application/x-yaml")

### Provider Components

Each artifact type can implement these optional components to customize Registry behavior:

- **contentAccepter**: Detects if content belongs to this artifact type (enables auto-detection)
- **contentValidator**: Validates content syntax and structure
- **compatibilityChecker**: Determines if new versions are compatible with existing ones
- **contentCanonicalizer**: Normalizes content for consistent comparison
- **contentDereferencer**: Resolves references to other artifacts
- **referenceFinder**: Discovers external references in content

Each provider component specifies a `type` which can be `java` or `webhook`. Any component that
is omitted from the configuration will default to a no-op implementation, meaning Registry will
simply skip that behavior for the custom artifact type. For example, if you only need content
validation and acceptance, you can omit the other components and they will be no-ops.

# Implementation Approach 1: Java Classes

For maximum performance and full access to the Java ecosystem, you can implement custom artifact types
using Java classes.

## Configuration for Java

```json
{
  "artifactType": "RAML",
  "contentValidator": {
    "type": "java",
    "classname": "com.example.raml.RamlContentValidator"
  }
}
```

Your Java class would implement the `ContentValidator` interface:

```java
package com.example.raml;

import io.apicurio.registry.rules.validity.ContentValidator;
import io.apicurio.registry.content.TypedContent;

public class RamlContentValidator implements ContentValidator {

    @Override
    public void validate(ValidityLevel level, TypedContent content,
                        Map<String, TypedContent> resolvedReferences) {
        String contentStr = content.getContent();

        if (!contentStr.startsWith("#%RAML 1.0")) {
            throw new RuleViolationException(
                "Missing '#%RAML 1.0' content header"
            );
        }

        // Additional validation logic here
    }
}
```

The Java class needs to be available on the Registry classpath, typically by creating your own build of Apicurio
Registry (out of scope for this blog post).

# Implementation Approach 2: Webhooks

The webhook approach provides ultimate flexibility by allowing you to implement the logic in any
language and deploy it as a separate service.

## Configuration for Webhooks

```json
{
  "artifactType": "RAML",
  "contentValidator": {
    "type": "webhook",
    "url": "http://custom-validator-service:8080/validate"
  }
}
```

## Webhook API Contract

Registry will POST a JSON request to your webhook endpoint and expect a JSON response. For example, the
content validator webhook receives:

```json
{
  "level": "SYNTAX_ONLY",
  "function": "validate",
  "content": {
    "content": "THE_ACTUAL_RAML_CONTENT",
    "contentType": "application/x-yaml"
  },
  "resolvedReferences": []
}
```

And should return:

```json
{
  "ruleViolations": [
    {
      "description": "Missing '#%RAML 1.0' header",
      "context": null
    }
  ]
}
```

The complete webhook API specification is defined in an OpenAPI document included with Registry at
`META-INF/artifact-type-webhooks.json`.

# Use Cases

This feature is particularly valuable for organizations that:

1. **Use proprietary schema formats** - Internal schema definition languages can now be managed in
   Registry
2. **Need RAML support** - RAML users can add full Registry support for their API definitions
3. **Work with legacy formats** - Support for older standards like WADL or WSDL 1.1
4. **Have domain-specific schemas** - Schematron for healthcare, custom XML schemas for finance, etc.
5. **Want to experiment** - Try out emerging schema formats without waiting for official Registry
   support

# Component Reference

Each custom artifact type can implement the following optional components. Below are the contracts for each
implementation approach.

## Content Accepter

Auto-detects if content belongs to this artifact type (enables automatic type detection when no
explicit type is provided).

**Webhook:** POST to configured URL
```json
// Request
{ "typedContent": { "content": "...", "contentType": "application/x-yaml" } }

// Response
{ "accepted": true }
```

**Java:** Implement [`ContentAccepter`](https://github.com/Apicurio/apicurio-registry/blob/main/schema-util/common/src/main/java/io/apicurio/registry/content/ContentAccepter.java) interface
```java
boolean accepts(TypedContent content);
```

## Content Validator

Validates content syntax and structure according to the artifact type's rules.

**Webhook:** POST to configured URL
```json
// Request
{
  "level": "SYNTAX_ONLY",
  "function": "validate",
  "content": { "content": "...", "contentType": "..." },
  "resolvedReferences": []
}

// Response
{
  "ruleViolations": [
    { "description": "Error message", "context": "/path/to/error" }
  ]
}
```

**Java:** Implement [`ContentValidator`](https://github.com/Apicurio/apicurio-registry/blob/main/schema-util/common/src/main/java/io/apicurio/registry/rules/validity/ContentValidator.java) interface
```java
void validate(ValidityLevel level, TypedContent content,
              Map<String, TypedContent> resolvedReferences)
    throws RuleViolationException;
```

## Compatibility Checker

Determines if a new version is compatible with existing versions according to the configured
compatibility level.

**Webhook:** POST to configured URL
```json
// Request
{
  "level": "BACKWARD",
  "existingArtifacts": [ { "content": "...", "contentType": "..." } ],
  "proposedArtifact": { "content": "...", "contentType": "..." },
  "resolvedReferences": []
}

// Response
{
  "incompatibleDifferences": [
    { "description": "Incompatibility", "context": "/" }
  ]
}
```

**Java:** Implement [`CompatibilityChecker`](https://github.com/Apicurio/apicurio-registry/blob/main/schema-util/common/src/main/java/io/apicurio/registry/rules/compatibility/CompatibilityChecker.java) interface
```java
CompatibilityExecutionResult testCompatibility(CompatibilityLevel level,
    List<TypedContent> existingArtifacts, TypedContent proposedArtifact,
    Map<String, TypedContent> resolvedReferences);
```

## Content Canonicalizer

Normalizes content to a canonical form for consistent comparison and duplicate detection.

**Webhook:** POST to configured URL
```json
// Request
{
  "content": { "content": "...", "contentType": "..." },
  "resolvedReferences": []
}

// Response
{
  "typedContent": { "content": "canonical content", "contentType": "..." }
}
```

**Java:** Implement [`ContentCanonicalizer`](https://github.com/Apicurio/apicurio-registry/blob/main/schema-util/common/src/main/java/io/apicurio/registry/content/canon/ContentCanonicalizer.java) interface
```java
TypedContent canonicalize(TypedContent content,
    Map<String, TypedContent> resolvedReferences);
```

## Content Dereferencer

Resolves references to other artifacts, either by inlining referenced content (dereference) or
rewriting references to URLs (rewriteReferences).

**Webhook:** POST to configured URL
```json
// Request (dereference)
{
  "content": { "content": "...", "contentType": "..." },
  "function": "dereference",
  "resolvedReferences": [
    { "name": "ref.json", "content": "...", "contentType": "..." }
  ]
}

// Request (rewriteReferences)
{
  "content": { "content": "...", "contentType": "..." },
  "function": "rewriteReferences",
  "resolvedReferenceUrls": [
    { "name": "ref.json", "url": "http://registry/..." }
  ]
}

// Response
{
  "typedContent": { "content": "dereferenced content", "contentType": "..." }
}
```

**Java:** Implement [`ContentDereferencer`](https://github.com/Apicurio/apicurio-registry/blob/main/schema-util/common/src/main/java/io/apicurio/registry/content/dereference/ContentDereferencer.java) interface
```java
TypedContent dereference(TypedContent content,
    Map<String, TypedContent> resolvedReferences);

TypedContent rewriteReferences(TypedContent content,
    Map<String, String> resolvedReferenceUrls);
```

## Reference Finder

Discovers external references within content (used by tooling like the Maven plugin for automatic
reference resolution).

**Webhook:** POST to configured URL
```json
// Request
{
  "typedContent": { "content": "...", "contentType": "..." }
}

// Response
{
  "externalReferences": [
    { "fullReference": "ref.json#/Schema", "resource": "ref.json", "component": "/Schema" }
  ]
}
```

**Java:** Implement [`ReferenceFinder`](https://github.com/Apicurio/apicurio-registry/blob/main/schema-util/common/src/main/java/io/apicurio/registry/content/refs/ReferenceFinder.java) interface
```java
Set<ExternalReference> findExternalReferences(TypedContent content);
```

# Deployment Example

Here's how to deploy Registry with a custom RAML artifact type using Docker:

## 1. Create your configuration file (`raml-config.json`):

```json
{
  "includeStandardArtifactTypes": true,
  "artifactTypes": [
    {
      "artifactType": "RAML",
      "name": "RAML",
      "description": "RESTful API Modeling Language",
      "contentTypes": ["application/x-yaml"],
      "contentAccepter": {
        "type": "webhook",
        "url": "http://raml-service:8081/accepts"
      },
      "contentValidator": {
        "type": "webhook",
        "url": "http://raml-service:8081/validate"
      },
      "compatibilityChecker": {
        "type": "webhook",
        "url": "http://raml-service:8081/compatibility"
      }
    }
  ]
}
```

## 2. Deploy your webhook service (e.g., `raml-service`) that implements the webhook API contract

## 3. Deploy with Docker:

```bash
docker run -it -p 8080:8080 \
  -v $(pwd)/raml-config.json:/config/artifact-types.json \
  -e apicurio.artifact-types.config-file=/config/artifact-types.json \
  apicurio/apicurio-registry:3.1.0
```

## 4. Verify it works:

```bash
curl http://localhost:8080/apis/registry/v3/admin/config/artifactTypes
```

You should see your custom RAML type in the response along with all the standard types.

# Performance Considerations

When choosing an implementation approach, consider:

- **Java classes** - Fastest performance, no serialization overhead, but requires a custom build
  of Registry
- **Webhooks** - Most flexible, language-agnostic, but adds network latency

For high-throughput scenarios, Java classes offer the best performance. For maximum flexibility or
when integrating with existing services, webhooks are ideal.

# Limitations

A few things to keep in mind:

1. Webhook endpoints must be accessible from the Registry deployment
2. Java classes must be compatible with the Registry's Quarkus version
3. Content extraction is not yet supported for custom types

# Looking Forward

This feature represents a significant step toward making Apicurio Registry truly universal. We're
excited to see what artifact types the community will add support for.

Some ideas we've heard interest in:
- RAML 0.8 and 1.0
- API Blueprint
- Schematron
- XACML
- Custom DSLs for various domains

We'd love to hear about your use cases! If you implement support for a custom artifact type, consider
sharing it with the community as a reusable module.

---

# Get Started

Ready to try it out? Here are your next steps:

1. **Check out the working example** - See a complete custom artifact type implementation in the
   [custom-artifact-type example](https://github.com/Apicurio/apicurio-registry/tree/main/examples/custom-artifact-type)
2. **Read the documentation** for more details about deploying Apicurio Registry
3. **Try a simple implementation** using the webhook approach
4. **Join the discussion** on our [Zulip chat](https://apicurio.zulipchat.com/)

For more information:
- [Custom Artifact Type Example](https://github.com/Apicurio/apicurio-registry/tree/main/examples/custom-artifact-type) -
  Complete working example
- [Apicurio Registry GitHub Repository](https://github.com/Apicurio/apicurio-registry)
- [Apicurio Registry Documentation](https://www.apicur.io/registry/docs/)
- [Webhook API Specification](https://github.com/Apicurio/apicurio-registry/blob/main/common/src/main/resources/META-INF/artifact-type-webhooks.json)

We can't wait to see what you build with this new capability!
