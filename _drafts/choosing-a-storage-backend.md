---
layout: post
title: "Choosing a Storage Backend for Apicurio Registry: PostgreSQL, Kafka, GitOps or KubernetesOps"
description: "Apicurio Registry 3.x runs every storage variant from one image. Compare PostgreSQL, KafkaSQL, in-memory H2, GitOps and KubernetesOps storage, and pick the right one for production."
author: carlesarnal
categories: registry storage postgresql kafka gitops
---

In Apicurio Registry 3.x, every storage option ships in the same container image, `apicurio/apicurio-registry`.
Choosing one is a matter of configuration. This post compares the options and gives a short decision guide.

---

# The options

| Storage | Writes | Use it for |
|---|---|---|
| **In-memory H2** (default) | Read/write | Development and tests only. Data is lost on restart. |
| **PostgreSQL** | Read/write | Production. The recommended option. |
| **Kafka (KafkaSQL)** | Read/write | Production, when Kafka is your operational platform and a database is not. |
| **GitOps** (experimental) | Read-only | Registry content managed through Git pull requests. |
| **KubernetesOps** (experimental) | Read-only | Registry content managed as Kubernetes ConfigMaps with kubectl, Argo CD or Flux. |

# PostgreSQL: the default choice for production

PostgreSQL is the recommended production storage for performance, stability and data management: you back it up,
restore it and monitor it with tools your team already has.

```bash
docker run -it -p 8080:8080 \
  -e APICURIO_STORAGE_KIND=sql \
  -e APICURIO_STORAGE_SQL_KIND=postgresql \
  -e APICURIO_DATASOURCE_URL=jdbc:postgresql://postgres/apicurio-registry \
  -e APICURIO_DATASOURCE_USERNAME=apicurio-registry \
  -e APICURIO_DATASOURCE_PASSWORD_FILE=/run/secrets/db-password \
  apicurio/apicurio-registry:latest-release
```

Note the `_FILE` suffix: any configuration property can be read from a file instead of an environment variable, which
keeps the password out of process listings and `docker inspect`.

# Kafka: when there is no database team

KafkaSQL stores the registry's data in a Kafka topic, so the only infrastructure you need is the Kafka cluster you
already run. It is aimed at environments where database expertise is not available, or where keeping everything in
Kafka is a requirement. It also makes cross-cluster replication possible with Kafka's own replication tools.

```bash
docker run -it -p 8080:8080 \
  -e APICURIO_STORAGE_KIND=kafkasql \
  -e APICURIO_KAFKASQL_BOOTSTRAP_SERVERS=kafka:9092 \
  apicurio/apicurio-registry:latest-release
```

See [Apicurio Registry 3.0 - KafkaSQL Storage](/blog/2024/06/21/registry-3-kafkasql) for how it works.

# GitOps and KubernetesOps: the registry as a deployment artifact

Both are read-only. The registry loads its content from a source you control, validates it, and switches to the new
data atomically; if a load fails, it keeps serving the last good state. Writes through the REST API are rejected.

- **GitOps** reads a local clone of a Git repository that a sidecar or external process keeps up to date. Every schema
  change is a commit, so it gets pull-request review, CI checks and history for free, and no database is needed.
- **KubernetesOps** reads labelled ConfigMaps from the Kubernetes API. It fits teams that already deliver everything
  through Argo CD or Flux, and needs nothing outside the cluster.

Both are experimental and need `APICURIO_FEATURES_EXPERIMENTAL_ENABLED=true`. See
[GitOps for Apicurio Registry](/blog/2026/06/19/registry-gitops) for a full example.

# Decision guide

1. Trying it out? Use the default H2 storage.
2. Need writes through the API or the console in production? Use **PostgreSQL**, or **Kafka** if a database is not an
   option.
3. Want every change reviewed in Git and a registry that is never edited by hand? Use **GitOps**, or **KubernetesOps** if
   your source of truth is the cluster.

# Further reading

- [Installing Apicurio Registry using Docker](/registry/docs/apicurio-registry/3.3.x/getting-started/assembly-installing-registry-docker.html)
- [Configuring GitOps storage](/registry/docs/apicurio-registry/3.3.x/getting-started/assembly-configuring-gitops-storage.html)
- [Configuring KubernetesOps storage](/registry/docs/apicurio-registry/3.3.x/getting-started/assembly-configuring-kubernetesops-storage.html)
