---
layout: post
title: "Apicurio Studio Fully Deprecated: Functionality Integrated into Apicurio Registry 3.1.0"
date:   2025-10-23 03:01:00
author: eric
categories: announcement studio registry
---

We have an important announcement to make regarding the future of Apicurio Studio and how we plan to continue
supporting our users who rely on its capabilities.

As of today, **Apicurio Studio is fully deprecated**. However, before you panic, let me explain what this means
and how we're ensuring that Studio's valuable functionality remains available to you through Apicurio Registry.

---

# The Challenge: Limited Bandwidth, Two Projects

The Apicurio team has come to an important realization: we simply do not have the bandwidth to author and maintain
both Apicurio Studio and Apicurio Registry as separate projects. Between feature development, bug fixes, security
updates, and community support, maintaining two distinct codebases has stretched our resources too thin.

After careful consideration, we've decided to continue our primary focus on Apicurio Registry, which has become the
cornerstone of schema and API management for many organizations and is the foundation for multiple Red Hat products.

But here's the critical part: **we recognize that Studio is a popular and useful project**, and we didn't want to
abandon the users who find it helpful. This commitment to supporting our Studio users has driven us to find a better
solution.

# The Solution: Studio Features Built into Registry 3.1.0

Rather than leaving Studio users without a path forward, we've directly incorporated Studio's editing capabilities
into the Apicurio Registry user experience. Starting with **Apicurio Registry 3.1.0**, all of the core Studio
functionality is available as an opt-in feature within Registry itself.

This means you get the best of both worlds:
- The robust schema/API management capabilities of Registry
- The intuitive editing experience of Studio
- A single project to install, configure, and maintain
- Unified lifecycle management for your API designs

# How It Works: The New "Drafts" Feature

The Studio functionality in Registry is built on top of a powerful new feature called **Drafts**. Let me explain how
this works.

## Understanding Draft State

In Apicurio Registry 3.1.0, we've introduced a new artifact version state: `DRAFT`. This state fundamentally changes
one of Registry's core behaviors.

Normally, artifact version content in Registry is immutable - once created, it cannot be changed. This immutability
is crucial for production schema registries where consistency and reliability are paramount. However, during the
design and development phase, you need the flexibility to iteratively edit and refine your API specifications.

The `DRAFT` state solves this problem. When an artifact version is in the `DRAFT` state **and** the content
mutability feature is enabled, you can update the content of that version as many times as needed. Once you're
satisfied with your design, you can transition it out of draft state, at which point it becomes immutable like any
other Registry artifact version.

## Enabling Studio Features

To enable the Draft Mutability feature, and unlock Studio functionality in Registry, you need to set one 
configuration property:

```
apicurio.rest.mutability.artifact-version-content.enabled=true
```

When this feature is enabled, several new capabilities appear in the Registry UI:

### 1. Drafts Section

A new "Drafts" section becomes available in the UI, providing:

- **Easy searching** for drafts that can be edited
- **Easy creation** of new drafts, including from pre-defined templates
- **Draft version creation** from existing artifact versions (whether they're drafts or published versions)

This gives you a centralized place to manage all your in-progress Schema and API designs.

### 2. Edit Draft Button

When viewing any artifact version that is in `DRAFT` state, you'll see a new "Edit Draft" button. Clicking this
button launches the familiar Apicurio Studio editor experience, where you can:

- Visually edit OpenAPI and AsyncAPI specifications
- Make changes using the intuitive Studio interface
- Save your changes directly back to Registry, updating the version content
- Iterate on your design as many times as needed before finalizing

# Try It Out: Quick Evaluation

Want to see this in action? Here's the fastest way to evaluate the new Studio features in Registry:

## Using Docker Compose

We've created a pre-configured Docker Compose setup that runs Registry with Studio features enabled. Here's how to
use it:

1. **Download the docker-compose.yml file:**
   ```bash
   curl -o docker-compose.yml \
     https://raw.githubusercontent.com/Apicurio/apicurio-registry/main/distro/docker-compose/in-memory-with-studio/docker-compose.yml
   ```

2. **Start the services:**
   ```bash
   docker compose up
   ```

   This will start two containers:
   - Apicurio Registry API (on port 8080)
   - Apicurio Registry UI (on port 8888)

3. **Access the UI:**
   Open your browser to `http://localhost:8888`

The docker-compose configuration automatically enables the content mutability feature with this environment
variable:
```yaml
apicurio.rest.mutability.artifact-version-content.enabled: "true"
```

## Using Individual Docker Containers

If you prefer to run the containers separately:

1. **Start the Registry backend:**
   ```bash
   docker run -it -p 8080:8080 \
     -e apicurio.rest.mutability.artifact-version-content.enabled=true \
     apicurio/apicurio-registry:3.1.0
   ```

2. **Start the Registry UI:**
   ```bash
   docker run -it -p 8888:8080 \
     apicurio/apicurio-registry-ui:3.1.0
   ```

3. **Access the UI:**
   Open your browser to `http://localhost:8888`

Note that this configuration uses in-memory storage, which is perfect for evaluation but not suitable for production
use.

# What This Means for Studio Users

If you're currently using Apicurio Studio, here's what you need to know:

- **No panic needed:** All core editing functionality has been preserved in Registry
- **Migration path:** You can import your existing API designs into Registry as draft artifacts
- **Improved workflow:** You now get both editing capabilities and full schema registry features in one platform
- **Continued support:** By consolidating into Registry, we can provide better support and more frequent updates

# Looking Forward

This integration represents a significant step forward for the Apicurio ecosystem. By combining Studio's editing
capabilities with Registry's robust schema management, we're creating a more comprehensive solution for API-first
development.

We're committed to continuing to improve and enhance these capabilities. As we move forward, you can expect:

- Regular updates and improvements to the editing experience
- Better integration between draft editing and Registry's other features
- Continued support for the API design workflows you rely on

We believe this consolidation will allow us to deliver more value to our users while being more sustainable for our
development team.

Thank you for your understanding, your patience, and most importantly, your continued use of Apicurio projects.
We're excited about this new direction and look forward to your feedback!

---

For more information:
- [Apicurio Registry Getting Started Guide](https://www.apicur.io/registry/getting-started/)
- [Apicurio Registry GitHub Repository](https://github.com/Apicurio/apicurio-registry)
- [Apicurio Community on Zulip](https://apicurio.zulipchat.com/)
