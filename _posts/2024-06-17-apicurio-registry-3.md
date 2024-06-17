---
layout: post
title: "Apicurio Registry 3.0"
date:   2024-06-17 16:00:00
author: eric
categories: registry release 3.0
---

Hey everyone - just dropping a quick blog post to let you know that we have released
Apicurio Registry 3.0.0.M3.  We're working hard to get this new major release of
Registry stable.  This milestone 3 release is a huge step towards that goal.  Very
soon you can expect a 3.0.0.Final release, but please consider getting your feet 
wet now.  We think 3.0 is ready for evaluation!  (more below the fold)

---

# Why a new major version?
Apicurio Registry 2.x has been around since April of 2021 (!!) and was a marked
improvement over 1.x.  It has served us well, but it was time to address some
core design decisions as well as some accrued technical debt.

In particular, we wanted the freedom to change the data model (aka the database
schema) and the REST API without needing to maintain compatibility.  That should
really only be done in a major version release.

# What's new in Registry 3.0?
We plan to dig into some of these topics in greater detail in a few future blog
posts, but here are some of the highlights of version 3:

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
Somewhat surprising to us is that a majority of our users have deployed registry
using Kafka as the storage.  We do still recommend a database for persistence,
but of course we recognize the convenience and familiarity of using Kafka instead
for many users.  Rest assured we have no plans to stop supporting it!

On the contrary - we have completely rewritten the KafkaSQL layer to improve its
stability and to make it easier for us to maintain.  This will be the subject of
a separate blog post soon, but know that the new implementation should be much
easier to keep updated and should result in far fewer unexpected bugs.  Spoiler:
we are also introducing a "snapshotting" feature that will help address the slow
startup times that can result from larger deployments (deployments with lots of
artifacts).

# Try it out now!
We haven't yet updated the web site with new documentation and getting started 
instructions, and we probably won't do that until 3.0.0.Final is out.  So until
then, you can easily try it out using docker or podman:

### Pull the images
```
docker pull quay.io/apicurio/apicurio-registry:3.0.0.M3
docker pull quay.io/apicurio/apicurio-registry-ui:3.0.0.M3
```

### Run both `apicurio-registry` and `apicurio-registry-ui`
```
docker run -it -p 8080:8080 quay.io/apicurio/apicurio-registry:3.0.0.M3
```
```
docker run -it -p 8888:8080 quay.io/apicurio/apicurio-registry-ui:3.0.0.M3
```

The UI will be available here:  http://localhost:8888

And the APIs will be available:  http://localhost:8080/apis
