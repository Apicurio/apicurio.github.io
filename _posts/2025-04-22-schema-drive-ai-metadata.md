---
layout: post
title: "Schema-Driven AI Metadata with Apicurio Registry and MCP"
date: 2025-05-2 12:00:00
author: carles
categories: ai use-case
---

# Schema-Driven AI Metadata: Validating Model Context Protocol with Apicurio Registry

In modern AI systems, model metadata plays a crucial role in enabling discovery, governance, and interoperability. This Model metadata demo defines a standard way to describe machine learning models—what inputs they expect, what outputs they produce, and contextual metadata like authorship, framework, or creation date.

But how do we ensure the metadata is valid and consistent across systems? How do we prevent malformed or incomplete descriptions from entering the pipeline?

This is where schema validation comes into play. In this blog post, we’ll show how to use Apicurio Registry to store and validate model metadata using JSON Schema.

## Why Schema Validation for model metadata?

In general, model metadata, is flexible and extensible, however, without validation:

- Teams might omit required fields (like modelId or inputSchema).
- Different components may interpret metadata inconsistently.
- Automation pipelines may break due to incompatible metadata changes.
- Schema validation provides a contract—a shared understanding enforced at runtime.

## What We’ll Build

✅ A JSON Schema that describes valid model metadata.

🏗 A Java/Quarkus app to validate JSON documents against the schema using Apicurio Registry.

📁 Example valid and invalid model metadata documents.

🌐 An Model metadata REST API server that exposes endpoints to submit, validate, and retrieve model metadata.

## Defining the model metadata schema

Here’s a simplified version of the model-context-schema.json:

```
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ModelContext",
  "type": "object",
  "required": ["modelId", "version", "inputSchema", "outputSchema", "metadata"],
  "properties": {
    "modelId": { "type": "string" },
    "version": { "type": "string" },
    "inputSchema": { "type": "object" },
    "outputSchema": { "type": "object" },
    "metadata": {
      "type": "object",
      "properties": {
        "author": { "type": "string" },
        "created": { "type": "string", "format": "date-time" },
        "framework": { "type": "string" },
        "description": { "type": "string" }
      }
    }
  }
}
```

## Registering the Schema in Apicurio

Start Apicurio Registry locally or use a hosted instance.

You can start the application using:

```
docker run -it -p 8080:8080 apicurio/apicurio-registry:latest-release
```

Then register the model metadata schema:

```
curl -X POST http://localhost:8080/apis/registry/v3/groups/mcp-models/artifacts -H "Content-Type: application/json" -d @./model-context-schema.json
```

You can also enable schema compatibility checks (e.g., BACKWARD):

```
curl -X POST http://localhost:8080/apis/registry/v3/groups/mcp-models/artifacts/model-context-schema/rules -H "Content-Type: application/json" -d @./rule.json
```

## Validating Metadata with Java (Quarkus)

To make this even more practical, we extended the demo with a Quarkus-based Model Metadata Server. This server exposes REST endpoints to submit and retrieve model metadata, while validating each submission using Apicurio.

```
REST Endpoints:

POST /models — Accepts and validates MCP metadata

GET /models — Lists all registered models

GET /models/{id} — Retrieves model metadata by ID
```

This server could act as a model metadata layer in front of other services—such as the Quarkus Superheroes demo app—where each superhero could have an associated prediction or simulation model validated by the Model Metadata layer.

This shows how schema governance isn’t just a backend concern—it can be integrated into microservice architectures to promote validation, documentation, and trust.

## Validating Metadata Submissions

When a user submits a model metadata document, the server validates it against the registered schema. If the document is valid, it’s stored in the model metadata server. If not, an error response is returned.

To start the server, run:

```
mvn quarkus:dev -Dquarkus.http.port=8081
```

Then, you can submit a valid model metadata document:

```
curl -X POST http://localhost:8081/models -H "Content-Type: application/json" -d @sample-model-contexts/valid-context.json
```

And you'll see an output like:

```
{"modelId":"customer-churn-predictor"}
```

Indicating a successful model submission.

If you try to submit an invalid document:

```
curl -X POST http://localhost:8081/models -H "Content-Type: application/json" -d @sample-model-contexts/invalid-context.json
```

You'll get a validation error response:

```
{"details":[{"description":"$.artifactUri: integer found, string expected","context":"1029"},{"description":"$.metrics.accuracy: string found, number expected","context":"1029"},{"description":"$: required property 'version' not found","context":"1028"}],"error":"Model validation failed"}
```


# Real-World Applications

This pattern can be used for:

- 🔁 Validating model metadata in CI/CD before pushing to model registry.

- 📜 Enforcing internal standards for all model submissions.

- 🤖 Automated documentation and discovery pipelines.

- ✅ Ensuring input/output schemas remain compatible over time.

Try It Yourself

We’ve open-sourced the demo on GitHub: https://github.com/carlesarnal/model-metadata

To run it locally:

- Start Apicurio
  `docker run -it --rm -p 8080:8080 apicurio/apicurio-registry:latest`

- Register the schema
  `curl -X POST http://localhost:8080/apis/registry/v3/groups/mcp-models/artifacts -H "Content-Type: application/json" -d @./model-context-schema.json`

- Start the model metadata server (Quarkus)
  `mvn quarkus:dev`

- Submit a model document
  `curl -X POST http://localhost:8081/models -H "Content-Type: application/json" -d @sample-model-contexts/valid-context.json`

# Final Thoughts

Schemas aren’t just for APIs anymore. In the world of AI and MLOps, they’re critical for ensuring that metadata—just like data—is consistent, complete, and trustworthy.

Using Apicurio Registry to manage and validate model metadata gives your AI workflows a strong backbone of governance, validation, and extensibility.

Try the model metadata server integration with your own microservices—or the Quarkus Superheroes demo—and see schema validation in action.

Feel free to reach out or contribute to the demo repo. Happy validating! 🚀