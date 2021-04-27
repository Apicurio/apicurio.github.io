---
layout: post
title: "Release Announcement:  Apicurio Registry 2.0.0.Final"
date:   2021-04-22 12:00:00
author: eric
categories: announcement registry
---

OMG we've released a new major version of Apicurio Registry!  This post will
provide an overview of what's new in this latest release.  Read on for details!

---

Thanks to everyone involved!
===
First I just want to thank everyone who contributed to this latest major release
of Apicurio Registry.  Of course we have our core set of developers on the project
including:

* Jakub Senko (Compatibility Rules, Operator, Health Checks)
* Carles Arnal Castello (Security, REST Client, Quarkus)
* Fabian Martinez Gonzalez (SerDes, Events, Testing!, Tenant Management)
* Rishab Prasad (CI, Workflows)
* Me (Storage, Import/Export, Moral Support)

In addition to the core team I want to thank Ales Justin for all his Kafka 
expertise and his bonus (unexpected by me) contribution of an Apicurio Registry
CLI!!

And of course to the community in general.  It's super helpful to have community
members reporting issues, requesting features, and in a few cases even contributing
pull requests (this is the best).  So thanks to everyone for your interest in the
project and for helping us move it forward.  I hope everyone is excited for this
major release and the new stuff it brings!

What's in the release.
===

Core Features
---
This is a major version release, which means there's a ton of cool new stuff and some breaking changes.
Here is a high level list of what's new, in no order and certainly not comprehensive.

* **Authentication based on Keycloak** - optionally protect the registry such that the API requires users to authenticate (BASIC and OAuth supported)
* **Role based authorization** - when authentication is enabled, users must have at least one role of (sr-admin, sr-developer, sr-readonly)
* **Creator-only authorization option** - option to prevent changes to artifacts unless the authenticated user is the user who originally created the artifact
* **Artifact Groups** - ability to organize artifacts into custom named logical groupings
* **Renovated serdes classes** - significant update to the Serdes layer to address ease of use, consistency, and functionality
* **New SQL based storage** - brand new SQL storage implementation with support for PostgreSQL
* **New Kafka based storage** - new hybrid storage using Kafka to store artifact data and an embedded SQL database to represent it in memory
* **Optional custom versioning** - users can optionally provide a custom version number when creating or updating artifacts
* **Better artifact searching** - updates to the REST API to allow improved searching of artifacts
* **Event Sourcing (registry changes can fire events)** - option to configure the registry to fire events whenever a change is made
* **Import/Export API** - updates to the REST API with operations to export and import registry data (as ZIP format)
* **Support for the CNCF Schema Registry API** - implementation of the CNCF Schema Registry API

NOTE: You can also assume we've fixed a bunch of bugs....and introduced some new ones.

CLI
---
A major new component available in 2.0 is the Apicurio Registry CLI.  The CLI can be downloaded
for each new release.  Just go to the release in GitHub and you can download the binary for your
preferred platform.

For your convenience, here are some direct links for 2.0.0.Final:

* [Linux](https://github.com/Apicurio/apicurio-registry/releases/download/2.0.0.Final/apicurio-registry-cli-2.0.0.Final-linux)
* [Mac](https://github.com/Apicurio/apicurio-registry/releases/download/2.0.0.Final/apicurio-registry-cli-2.0.0.Final-macos)
* [Windows](https://github.com/Apicurio/apicurio-registry/releases/download/2.0.0.Final/apicurio-registry-cli-2.0.0.Final-win64.exe)

For future releases, the CLI executables will available attached to the GitHub release.  For example,
you can find them for 2.0.0.Final by going to the [Apicurio 2.0.0.Final GitHub Release](https://github.com/Apicurio/apicurio-registry/releases/tag/2.0.0.Final).

What's next?
===
This post is just an announcement of some of the cool stuff we've done for this latest major 
release.  Now that this blog is back in action, we plan to dive deeper into some of the features
above to provide more details.  So you can look forward to that.

As for the project itself, we still have a lot of things to do!  As always, you can see the
stuff we're tracking by viewing the [GitHub issues](https://github.com/Apicurio/apicurio-registry/issues) for the project.

If you find bugs or want to request a new feature, that's a great place to start!