---
layout: post
title: "Semantic Versioning Support in Apicurio Registry 3.0"
date: 2025-03-21 16:17:00
author: eric
categories: registry semantic_versioning
---

Apicurio Registry 3.0 introduces a powerful new feature: (preliminary) support for semantic
versioning. This enhancement brings automatic branch management based on semantic versioning
patterns, making it easier to organize, track, and access different versions of your schema
artifacts. Let's explore how this feature works and why it's valuable for API governance.

---

## Understanding Semantic Versioning
Before diving into Apicurio's implementation, let's quickly review semantic versioning. 
Often abbreviated as "SemVer," semantic versioning follows a pattern of `MAJOR.MINOR.PATCH`:

* **MAJOR** version increases represent incompatible API changes
* **MINOR** version increases add functionality in a backward-compatible manner
* **PATCH** version increases represent bug fixes

This structured approach to versioning makes it clear to users how a new version might impact
their existing implementations.

## How Semantic Versioning Works in Apicurio Registry 3.0
Apicurio Registry now automatically creates and manages branch hierarchies based on semantic
version numbers. When you add artifacts with semantic version numbers, the registry intelligently
organizes them into appropriate branches.

## Automatic Branch Creation
Whenever versions are created with semantic versioning patterns, Apicurio Registry automatically
creates corresponding branches at different levels of specificity:

1. Major version branches (e.g., `1.x`, `2.x`, `3.x`)
2. Minor version branches (e.g., `1.0.x`, `1.1.x`, `2.5.x`)
3. A `latest` branch that always points to the most recent version

For example, when creating versions like `1.0.0`, `1.0.1`, and `2.5.2`, the registry automatically
creates branches such as `1.x`, `2.x`, `1.0.x`, and `2.5.x` without any additional configuration.

## Branch Behavior and Characteristics
The test code reveals several important aspects of these semantic versioning branches:

1. **System-defined branches**: These branches are created and managed by the system, not manually created by users.
2. **Protection from deletion**: System-generated branches cannot be deleted, ensuring the integrity of the version hierarchy.
3. **Automatic content management**: Each branch automatically contains the relevant versions that match its pattern.
4. **Latest version awareness**: Each branch knows which version is the latest within its scope.

## Example Workflow
Let's walk through an example scenario based on the test case:

Create an artifact with version: `1.0.0`

Add subsequent versions: `1.0.1`, `1.0.2`, `1.0.3`, `1.1.0`, `1.1.1`, `2.5.1`, `2.5.2`, `3.0.0`

After these operations, Apicurio Registry automatically creates these branches:

* `latest` (containing all 9 versions, with `3.0.0` as the latest)
* `1.x` (containing all versions starting with `1.`, with `1.1.1` as the latest)
* `1.0.x` (containing all `1.0.` versions, with `1.0.3` as the latest)
* `1.1.x` (containing all `1.1.` versions, with `1.1.1` as the latest)
* `2.x` (containing all versions starting with `2.`, with `2.5.2` as the latest)
* `2.5.x` (containing all `2.5.` versions, with `2.5.2` as the latest)
* `3.x` (containing all versions starting with `3.`, with `3.0.0` as the latest)
* `3.0.x` (containing all `3.0.` versions, with `3.0.0` as the latest)

## Configuring Semantic Versioning in Apicurio Registry
It's important to note that semantic versioning support in Apicurio Registry 3.0 is disabled
by default. To take advantage of this feature, you need to explicitly enable it through
configuration settings.

### Enabling Semantic Versioning
You can enable semantic versioning in Apicurio Registry 3.0 by setting the appropriate 
environment variable.

#### Environment Variable
When deploying Apicurio Registry, set the following environment variable:
```
APICURIO_SEMVER_BRANCHING_ENABLED=true
```

#### Configuring via Docker
```bash
docker run -p 8080:8080 -e APICURIO_SEMVER_BRANCHING_ENABLED=true apicurio/apicurio-registry:latest-release
```

### Verifying the Configuration
You can verify that semantic versioning is enabled by checking the registry's API documentation
or by creating an artifact with a semantic version and confirming that the expected branches are
automatically created.

## Benefits of Semantic Versioning in Apicurio Registry
The implementation of semantic versioning in Apicurio Registry 3.0 brings several significant benefits:
1. **Simplified Version Navigation**
   With automatically created branches, you can easily access specific version families. Need the latest stable version in the 1.x series? Simply reference the 1.x branch. This eliminates the need to manually search through all versions to find the one you need.
2. **Predictable Version Management**
   The semantic versioning pattern creates a predictable structure for managing artifact versions. API consumers can rely on established conventions for understanding compatibility implications when upgrading to newer versions.
3. **Improved API Governance**
   The automatic branch management supports better API governance by making it easier to maintain multiple version lines simultaneously. Teams can easily support older major versions for backward compatibility while continuing to develop newer versions.
4. **Reduced Manual Configuration**
   Since branches are automatically created and managed by the system based on semantic version patterns, users don't need to manually create and maintain branch structures.

## Using Semantic Versioning in Practice
To use semantic versioning in Apicurio Registry 3.0 with curl commands, follow these examples
that demonstrate how to create and work with semantically versioned artifacts:

### Create a Group
First, let's create a group to organize our artifacts:
```bash
curl -X POST "http://localhost:8080/apis/registry/v3/groups" \
     -H "Content-Type: application/json" \
     -d '{"groupId": "my-semver-group"}'
```

### Creating an Artifact with Initial Semantic Version
Now, let's create an artifact with an initial semantic version (`1.0.0`):

```bash
curl -X POST "http://localhost:8080/apis/registry/v3/groups/my-semver-group/artifacts" \
     -H "Content-Type: application/json" \
     -d '{
       "artifactId": "my-semver-artifact",
       "artifactType": "JSON",
       "firstVersion": {
         "version": "1.0.0",
         "content": {
            "content": "{\"type\":\"record\",\"name\":\"ExampleType\",\"fields\":[{\"name\":\"foo\",\"type\":\"string\"}]}",
            "contentType": "application/json"
         }
       }
     }'
```
This creates the artifact with an explicitly specified semantic version `1.0.0` rather than
using the default version numbering scheme for a new artifact version, which in this case
would result in `1`.

### Adding Additional Semantic Versions
To add a new version to the artifact following the semantic versioning pattern:

```bash
curl -X POST "http://localhost:8080/apis/registry/v3/groups/my-semver-group/artifacts/my-semver-artifact/versions" \
     -H "Content-Type: application/json" \
     -d '{
       "version": "1.0.1",
       "content": {
         "content": "{\"type\":\"record\",\"name\":\"ExampleType\",\"fields\":[{\"name\":\"foo-2\",\"type\":\"string\"}]}",
         "contentType": "application/json"
       }
     }'
```

You could then continue to add more versions with additional semantic versions:

```bash
# Adding version 1.1.0
curl -X POST "http://localhost:8080/apis/registry/v3/groups/my-semver-group/artifacts/my-semver-artifact/versions" \
     -H "Content-Type: application/json" \
     -d '{
       "version": "1.1.0",
       "content": {
         "content": "{\"type\":\"record\",\"name\":\"ExampleType\",\"fields\":[{\"name\":\"foo-3\",\"type\":\"string\"}]}",
         "contentType": "application/json"
       }
     }'

# Adding version 2.0.0
curl -X POST "http://localhost:8080/apis/registry/v3/groups/my-semver-group/artifacts/my-semver-artifact/versions" \
     -H "Content-Type: application/json" \
     -d '{
       "version": "2.0.0",
       "content": {
         "content": "{\"type\":\"record\",\"name\":\"ExampleType\",\"fields\":[{\"name\":\"foo-4\",\"type\":\"string\"}]}",
         "contentType": "application/json"
       }
     }'
```

### Accessing Branches
Once you've created several versions with semantic versioning, you can access the automatically
generated branches:

```bash
echo "List all branches for the artifact"
curl "http://localhost:8080/apis/registry/v3/groups/my-semver-group/artifacts/my-semver-artifact/branches" | jq
```

The response will include all automatically created branches based on the semantic versioning
structure, such as `latest`, `1.x`, `1.0.x`, `1.1.x`, and `2.x`.

### Accessing Versions Within a Specific Branch
To retrieve all versions within a specific branch, such as the `1.x` branch:

```bash
curl "http://localhost:8080/apis/registry/v3/groups/my-semver-group/artifacts/my-semver-artifact/branches/1.x/versions" | jq
```

This will return all versions that match the `1.x` pattern, with the latest version in that
branch listed first.

### Getting the Latest Version in a Branch
To access the latest version's content or metadata from a specific branch:

**Metadata**
```bash
curl "http://localhost:8080/apis/registry/v3/groups/my-semver-group/artifacts/my-semver-artifact/versions/branch=1.x" | jq
```

This will return the metadata for version `1.1.0`, because that is the most recent version
on the `1.x` branch.

**Content**
```bash
curl "http://localhost:8080/apis/registry/v3/groups/my-semver-group/artifacts/my-semver-artifact/versions/branch=1.x/content" | jq
```

This will return the content for version `1.1.0`, because that is the most recent version
on the `1.x` branch.

## Conclusion
Semantic versioning support in Apicurio Registry 3.0 represents a significant enhancement for
managing schema evolution. The automatic creation and management of version-based branches
simplifies navigation, improves governance, and provides a more intuitive way to work with
multiple versions of your artifacts.

By leveraging this feature, teams can more effectively manage their API lifecycle, ensuring
that consumers can reliably access the appropriate versions while maintaining clear expectations
around compatibility and change.

If you're working with evolving schemas or APIs, Apicurio Registry's semantic versioning support
provides a powerful framework for maintaining order in what could otherwise become a complex
version management challenge. Remember to explicitly enable this feature in your deployment
configuration to take advantage of its benefits.

## Bonus Content
There are two additional optional features that can be enabled to improve the functionality
of the semantic versioning support in Apicurio Registry 3.0.

### Version Validation
Apicurio Registry can validate that every artifact version you add conforms to the SemVer
format, or else it will be rejected. This feature can be enabled by setting the following
environment variable:

```bash
APICURIO_SEMVER_VALIDATION_ENABLED=true
```

### Version Coercion
**Note**: wonderful name for a feature.  Just say that out loud and delight in it.

Apicurio Registry can be configured to automatically coerce invalid versions into
valid Semantic Versioning 2.0 compatible versions (when possible).  For example, when this
feature is enabled and you create a new version `2.0`, the version will be coerced into
`2.0.0`. This feature can be enabled by setting the following environment variable:

```bash
APICURIO_SEMVER_BRANCHING_COERCE=true
```