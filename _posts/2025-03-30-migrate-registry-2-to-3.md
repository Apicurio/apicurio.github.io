---
layout: post
title: "Apicurio Registry 3.0.0.Final Migration Guide"
date:   2025-03-030 12:00:00
author: carles
categories: registry guide
---

Apicurio Registry 3.x is our latest and greatest release to date. It has plenty of new features but it also comes with some breaking changes from the previous 2.6.x release. In this post we will explore the process to migrate data from Apicurio Registry 2.6.x to Apicurio Registry 3.x.

Because of the breaking changes between 2.6.x and 3.x, there is no automatic upgrade and instead a migration process is required.  But don't worry!  We promise the process is not hard.

---

# Breaking changes

As outlined in the Apicurio Registry 3 announcement, there are three major changes in this release:

## Data model changes
There are some significant core data model changes in 3.0.  Some of these changes
include (but are not limited to):

* Artifacts have their own metaData
* Artifacts can be empty (have no versions)
* Groups can now have labels
* User can define and maintain custom branches
* "Latest" is now a branch

## REST API changes
* Full group management, with metaData
* Streamlined artifact and version creation
* Search for groups at `/search/groups`
* Search for versions at `/search/versions`
* A new `dryRun` query param replaces the `/test` endpoint(s)
* Brand new Branch API

## Kafka storage variant
We have completely rewritten the KafkaSQL layer to improve its
stability and to make it easier for us to maintain.  This will be the subject of
a separate blog post soon, but know that the new implementation should be much
easier to keep updated and should result in far fewer unexpected bugs.  Spoiler:
we are also introducing a "snapshotting" feature that will help address the slow
startup times that can result from larger deployments (deployments with lots of
artifacts).

# **Migrating from Apicurio Registry 2.x to 3.x**

Apart from the major breaking changes mentioned, Apicurio Registry 3.x introduces several improvements over 2.x, including performance optimizations and better maintainability. If you are currently using **Apicurio Registry 2.x**, you need to migrate your existing artifacts, rules, and metadata to the new version.

This guide will walk you through the **migration process** step by step.

---
## **Step 1: Export Data from Apicurio Registry 2.x**
Before migrating, you need to **export** your existing data from **Apicurio Registry 2.x**. The export process generates a **ZIP file** that contains all artifacts, rules, and metadata.

To export the data, use the **admin export API**:

```bash
curl -X GET http://<registry-v2-url>/apis/registry/v2/admin/export -o registry-export.zip
```

## **Step 2: Import the Exported Data into Apicurio Registry 3.x**
Once your Registry 3.x instance is running, you can import the exported ZIP file.

Use the following command to send the data to the import API:

```bash
curl -X POST http://<registry-v3-url>/apis/registry/v2/admin/import \
-H "Content-Type: application/zip" \
--data-binary @registry-export.zip
```

### What Happens During Import?
All artifacts, rules, and metadata from Registry 2.x are restored.
Global are retained.
Artifact references are maintained.
- Note: This process does not automatically clean up the old Registry 2.x instance. If needed, remove the old instance manually after validating the migration.

## **Step 3: Validate the Migration**
Once the import is complete, it is essential to verify that all data has been migrated successfully.

List the available artifacts in the default group in Registry 3.x:

```bash
curl -X GET http://<registry-v3-url>/apis/registry/v3/groups/default/artifacts
```

Ensure that any previously defined global rules (e.g., compatibility settings) are still in place:

```bash
curl -X GET http://<registry-v3-url>/apis/registry/v3/admin/rules
```

## **Step 4: Update Client Applications**

Once you have Apicurio Registry 3.x running, you should update your client applications to ensure compatibility with the new version.

If you're using Apicurio Registry Client Libraries, update them to versions compatible with Registry 3.x.

For example, update your Maven dependency:

```xml 
<dependency>
    <groupId>io.apicurio</groupId>
    <artifactId>apicurio-registry-java-sdk</artifactId>
    <version>3.0.6</version> <!-- Replace with the latest version -->
</dependency>
```

## **Final Thoughts**
Migrating from Apicurio Registry 2.x to 3.x is a straightforward process when following these steps:

- Export data from Registry 2.x.
- Start a new Registry 3.x instance.
- Import the exported data into Registry 3.x.
- Validate the migration to ensure all artifacts and rules were successfully transferred.
- Update client applications to work with Registry 3.x.

By completing these steps, you’ll benefit from the improved performance and features of Apicurio Registry 3.x.

---
For more details, check the official Apicurio documentation or reach out to the Apicurio community.
