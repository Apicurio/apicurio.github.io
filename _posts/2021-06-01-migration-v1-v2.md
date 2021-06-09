---
layout: post
title: "Apicurio Registry 2.0.0.Final Migration Guide"
date:   2021-06-01 12:00:00
author: fabian
categories: registry guide
---

Apicurio Registry 2.x release is our latest and greatest release to date. It has plenty of new features but it also comes with some breaking changes from the previous 1.3.x release. In this post we will explore the process to migrate data from Apicurio Registry 1.3.x to Apicurio Registry 2.x.

---

# Apicurio Registry 2.0.0.Final Migration Guide

Because of the breaking changes between 1.3.x and 2.x, there is no automatic upgrade and instead a migration process is required.  But don't worry!  We promise the process is not hard.

## Breaking changes

There are three major changes in this release that need to be taken into account in order to proceed with a migration.

### New storage options
This impacts your current Apicurio Registry deployment. In Apicurio Registry 1.3.x we had 3 storage options (`streams`, `jpa` and `infinispan`).  Now in
Apicurio Registry 2.x we dropped all of them but provided new and improved alternatives that we believe will be better for the project in the long term.  These new storages allow for more robust and performant deployments while at the same time being more maintainable. The new storage options are `sql` and `kafkasql`).  There is a third one `mem` that is not suitable for production workloads. This document will not cover the process of deploying Apicurio Registry 2.x, you can find more details in the [Apicurio Registry user documentation](https://www.apicur.io/registry/docs/apicurio-registry/2.0.0.Final/getting-started/assembly-installing-registry-storage-openshift.html)

### New REST API
We changed the REST API layout to ensure better long term maintainability and because we refactored our API to have support for artifact groupings. Apicurio Registry still supports the original REST API (now known as `v1`) and the various compatibility APIs we already supported (for example, Confluent and IBM schema registry APIs).  Additionally, Apicurio Registry now also implements the Schema Registry spec provided within the CNCF Cloud Events spec.

### Refactored SerDes libraries
The Serializer and Deserializer classes are now available as three different Maven modules (one for each data format). This makes it possible to use just the one you want without pulling in a bunch of transitive dependencies that you don't care about.

## Migration

The migration from Apicurio Registry 1.3.x to 2.x requires you to move the data in your existing registry to a new registry. You must also review your applications that interact with the registry and update their configuration to meet the new requirements.

### Data Migration

The process of data migration to Apicurio Registry 2.x will require you to export all the data from your 1.3.x deployment and import it to the new 2.x based deployment.

Data migration is a critical step in the migration to Apicurio Registry 2.x if you are using the registry as a schema registry for Kafka applications, because every Kafka message carries the global identifier for the schema stored in Apicurio Registry. It is critical that this identifier is kept between registry upgrades via data migration.

For that purpose Apicurio Registry 2.x provides a new import/export API to bulk import or export all the data from your registry deployment. This API guarantees that all the identifiers are kept when importing the data from your existing registry. The export API works by downloading a custom zip file containing all the information of your artifacts. The import API accepts that zip file, loading all of the artifacts into the registry in a single batch.

Apicurio Registry 1.3.x does not provide an import/export API, but with the 2.x release we provided an export tool compatible with Apicurio Registry 1.3.x that allows you to export a compatible zip file, which can be imported to your 2.x registry. This special export tool uses common existing APIs to export all of the content in the registry. It is less performant than the built-in export API we have introduced in 2.x, and so should only be used when exporting from a 1.3.x registry.

This export tool is available from the [Apicurio Registry GitHub release](https://github.com/Apicurio/apicurio-registry/releases/download/2.0.0.Final/apicurio-registry-utils-exportV1-2.0.0.Final.jar). It is a java application meant to be invoked from the command line.

The migration steps for moving all your data from one version to another:

**Prerequisites**: Have running Apicurio Registry instances for both the version 1.3.x server (exporting from) and the new 2.x server (importing to).

1. Export all the data from Apicurio Registry 1.3.x using the `exportV1` tool. This will generate a `registry-export.zip` file in your current directory.
```
java -jar apicurio-registry-utils-exportV1-2.0.0.Final.jar http://old-registry.my-company.com/api
```
2. Import the zip file to Apicurio Registry 2.x using the import API. You can find more details in the [Apicurio Registry user documentation](https://www.apicur.io/registry/docs/apicurio-registry/2.0.0.Final/getting-started/assembly-managing-registry-artifacts-api.html#exporting-importing-using-rest-api)
```
curl -X POST "http://new-registry.my-company.com/apis/registry/v2/admin/import" \
  -H "Accept: application/json" -H "Content-Type: application/zip" \
  --data-binary @registry-export.zip
```
3. Check that all the artifacts are now imported to the new 2.x registry. Run these two commands and compare the count field.
```
curl "http://old-registry.my-company.com/api/search/artifacts"
```
```
curl "http://new-registry.my-company.com/apis/registry/v2/search/artifacts"
```


### Application Migration

If you are using the Apicurio Registry SerDes libraries, you need to change the Maven dependencies you are using, as we have repackaged these classes.

In Apicurio Registry 1.3.x the SerDes libraries were provided all with just one Maven dependency:
```
<dependency>
    <groupId>io.apicurio</groupId>
    <artifactId>apicurio-registry-utils-serde</artifactId>
    <version>1.3.2.Final</version>
</dependency>
```

In Apicurio Registry 2.x this has been changed, and the SerDes libraries have been split into three Maven dependencies, one for each supported data format: `avro`, `protobuf` and `json schema`.

```
<dependency>
    <groupId>io.apicurio</groupId>
    <artifactId>apicurio-registry-serdes-avro-serde</artifactId>
    <version>2.0.0.Final</version>
</dependency>
<dependency>
    <groupId>io.apicurio</groupId>
    <artifactId>apicurio-registry-serdes-protobuf-serde</artifactId>
    <version>2.0.0.Final</version>
</dependency>
<dependency>
    <groupId>io.apicurio</groupId>
    <artifactId>apicurio-registry-serdes-jsonschema-serde</artifactId>
    <version>2.0.0.Final</version>
</dependency>
```

You must take into account these changes to Maven dependencies, and update your applications accordingly.

The refactored SerDes libraries also include some changes in the configuration properties. You can find more details in the [Apicurio Registry user documentation](https://www.apicur.io/registry/docs/apicurio-registry/2.0.0.Final/getting-started/assembly-using-kafka-client-serdes.html) , and you can find plenty of examples using Apicurio Registry 2.0.0.Final SerDes libraries [here](https://github.com/Apicurio/apicurio-registry-examples/tree/2.0.x)

But the most important thing you must change is the registry URL configuration, which you must change from pointing to the existing API path to the new one. For example:

Old:
```
props.putIfAbsent(AbstractKafkaSerDe.REGISTRY_URL_CONFIG_PARAM, "http://localhost:8080/api");
```

New:
```
props.putIfAbsent(SerdeConfig.REGISTRY_URL, "http://localhost:8080/apis/registry/v2");
```

---

These are the most important things to take into account when doing the update to Apicurio Registry 2.0.0.Final. The process is not complex but there are some critical steps that, thanks to our APIs and tooling, should be no problem.

As always, if you have any suggestions or encounter any problem feel free to contact the team by [filling an issue in GitHub](https://github.com/Apicurio/apicurio-registry/issues)
