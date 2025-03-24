---
layout: post
title: "Core REST API Changes in Apicurio Registry 3.0"
date: 2025-03-24 14:57:00
author: eric
categories: registry rest_api
---

The release of Apicurio Registry 3.0 marks a significant milestone in our journey to provide
the best possible Registry experience. With this major version update, we've taken the
opportunity to implement several breaking changes to the Core REST API that both add powerful
new functionality and streamline existing features.

---

# Why These Changes Matter

Before diving into the specific changes, it's worth understanding the philosophy behind this
update. Our goal was to create a more consistent, logical, and powerful API surface that better
aligns with how users actually interact with the registry. These changes reflect feedback from
the community and our own experience supporting users and Red Hat customers over time.

You can find the new core REST API here:

```
https://registry.example.org/apis/registry/v3
```

# Key Architectural Changes

## Separation of Artifact and Version Concepts

Perhaps the most fundamental change is the clear separation between artifacts and their versions:

- Artifacts now have their own metadata, separate from version metadata
- Artifacts can exist without any versions (empty artifacts)
- Content is now exclusively managed through version endpoints
- Only versions have state (artifacts no longer have state)

This distinction allows for more granular control and creates a clearer mental model of the registry
structure.

## Empty Artifacts: Configure First, Create Later
One of the new capabilities in Apicurio Registry 3.0 is the ability to create empty artifacts without
immediately providing content for a first version. This seemingly small change enables important new
workflows, particularly around governance and validation.

With empty artifacts, you can now:

* Configure content rules before any versions exist
* Set up metadata, labels, and ownership for an artifact before content development begins
* Establish the artifact's place in your organization's taxonomy in advance
* Create placeholder artifacts as part of planning activities

This feature is especially valuable for teams implementing strict governance processes. For example,
you can now:

1. Create an empty artifact with appropriate metadata
2. Configure validation rules that enforce your organization's standards
3. Set up branch structures in anticipation of development
4. Only then begin creating versions with content that must comply with the pre-established rules

This "configure first, create later" approach helps prevent non-compliant content from entering the
registry in the first place, rather than discovering compliance issues after content has been created.

## Hierarchical Rules System
Apicurio Registry 3.0 expands the hierarchical rules system with the implementation of the
`/groups/:groupId/rules` endpoint. Rules can now be configured at three distinct levels in the registry,
creating a powerful inheritance model for content governance:

1. **Global Rules** - Apply to all artifacts across the entire registry
2. **Group Rules** - Apply to all artifacts within a specific group
3. **Artifact Rules** - Apply to a specific artifact only

Rules are evaluated with a clear precedence order: **Artifact** rules override **Group** rules, which override
**Global** rules. This hierarchy allows for a sophisticated governance approach where broad standards can
be established at the global level, group-specific requirements added at the group level, and
artifact-specific customizations made at the individual artifact level.

For example, you might implement:

* **Global** rules that enforce basic structural validation across all artifacts
* **Group** rules that enforce naming conventions specific to a business unit
* **Artifact** rules that implement specialized compatibility checks for critical APIs

This multi-tiered approach provides both consistency where needed and flexibility where required. It
significantly reduces rule management overhead by allowing you to define common rules at higher levels
while maintaining the ability to customize validation for specific artifacts.

The Group Rules API follows a familiar pattern using standard HTTP methods:

* _GET_ `/groups/:groupId/rules` - List all rules for a group
* _POST_ `/groups/:groupId/rules` - Create a new rule for a group
* _DELETE_ `/groups/:groupId/rules` - Delete all rules for a group

## Introduction of Branches

A major new feature is the addition of branches, which provide:

- Multiple development paths for artifacts
- More flexible versioning strategies
- Improved organization for complex artifact evolution

New branch endpoints provide comprehensive management capabilities including creation, updating
metadata, managing versions within branches, and branch deletion.

# Detailed API Changes

## Endpoint Reorganization

Several endpoints have been moved or renamed for consistency:

- `/admin/artifactsType` → `/admin/config/artifactTypes`
- Version metadata management now happens at `/groups/:groupId/artifacts/:artifactId/versions/:versionExpression` (previously, this endpoint managed content)
- Version content is now accessed at `/groups/:groupId/artifacts/:artifactId/versions/:versionExpression/content`

## Enhanced Group Management

Groups have received significant enhancements:

- Added support for labels on groups
- New `PUT` operation to update group metadata (description, labels, owner)
- Implemented group rules endpoints at `/groups/:groupId/rules`
- Added pagination to group-related endpoints
- Changed "createdBy" to "owner" for improved clarity

## Metadata Simplification

We've simplified the metadata structure throughout the API:

- Combined "labels" and "properties" into a single "labels" concept (name/value pairs)
- Changed "type" to "ruleType" for consistency with "artifactType"
- Renamed parameters for clarity where appropriate

## Improved Search Capabilities

Search functionality has been enhanced:

- Added GET `/search/groups` for searching groups with filtering and pagination
- Added GET `/search/versions` to search/filter all versions
- Added POST `/search/versions` to search by version content

## Content Management Changes

Content handling has been significantly revised:

- Removed POST `/groups/:groupId/artifacts` for raw artifact content
- Changed content-type requirements for artifact creation
- Added a `dryRun` query parameter to several endpoints (replaces the old "/test" endpoint)
- All content creation operations now require an explicit **Content-Type** header

## Removed Endpoints

Several endpoints have been removed as their functionality has been integrated elsewhere:

- `/groups/:groupId/artifacts/:artifactId/meta` (metadata is now managed at the artifact endpoint)
- `/groups/:groupId/artifacts/:artifactId/state` (state now only exists on versions)
- `/groups/:groupId/artifacts/:artifactId/owner` (owner now part of editable metadata)
- `/groups/:groupId/artifacts/:artifactId/test` (replaced by `dryRun` query parameter)

# Migration Considerations

If you're upgrading from Apicurio Registry 2.x to 3.0, you'll need to update your client applications
to accommodate these changes. Here are some key migration points:

1. Update your client code to use the new endpoint paths
2. Revise your content management workflow to use the new version-focused approach
3. Take advantage of the new branch feature if you need multiple development paths
4. Consolidate your use of properties and labels into the unified labels concept
5. Update any automation that depends on artifact state (now only versions have state)

## Core API Backwards Compatibility

It's worth noting that, while we encourage users to migrate to v3 of the API as soon as possible,
we will continue to support the v2 API (now deprecated) - presumably until v4!

What that means is that the old v2 API endpoint should still work:

```
https://registry.example.org/apis/registry/v2
```

# What's Next?

These changes lay the groundwork for even more powerful features in future releases. The clearer
separation of artifacts, versions, and branches opens up possibilities for more sophisticated
governance, improved collaboration workflows, and enhanced content validation.

We're excited to see how the community embraces these changes and builds on them. As always, we
welcome your feedback and contributions to make Apicurio Registry even better.