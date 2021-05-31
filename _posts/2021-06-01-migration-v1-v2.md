---
layout: post
title: "Apicurio Registry 2.0.0.Final Migration Guide"
date:   2021-06-01 12:00:00
author: fabian
categories: registry guide
---

Apicurio Registry 2.x release is our latest and greatest release to date. It has plenty new features but it also comes with some breaking changes from the previous
1.3.X release. In this document we explore the process to migrate to Apicurio Registry 2.X

---

# Apicurio Registry 2.0.0.Final Migration Guide

Apicurio Registry 2.x release is our latest and greatest release to date. It has plenty new features but it also comes with some breaking changes from the previous
1.3.X release.

Because of the breaking changes there is no automatic upgrade and instead a migration process is required, but no worries, the process is not hard.

## Breaking changes

There are three major changes in this release that need to be taken into account in order to proceed with a migration. 

New storage options, this impacts your current Apicurio Registry deployment. In Apicurio Registry 1.3.X we had 3 storage options (streams, jpa and infinispan), now in
Apicurio Registry 2.X we droped all of them but provided new and improved alternatives that we believe will be better for the project in the long term, allowing to have more robust and performant deployments while at the same time being reasonabily maintainable. The new storage options are (sql and kafkasql), there is a third one (mem) that is not suitable for production workloads. This document will not cover the process of deploying Apicurio Registry 2.X, you can find more information [here](https://www.apicur.io/registry/docs/apicurio-registry/2.0.0.Final/getting-started/assembly-installing-registry-storage-openshift.html)

New REST API, we changed the REST API layout to ensure better long term maintainability and because we refactored our API to have support for artifact groupings. Apicurio Registry still supports the original REST API now known as `v1` and the various compatibility APIs we already support (confluent compat, ibm compat) and a new API that implements the Schema Registry spec provided within CNCF Cloud Events spec.

Refactored SerDes libraries, now available as three different maven modules (one for each data format)

## Migration

The migration from Apicurio Registry 1.3.X to 2.X requires you to move the data from one registry to another along with a review of your applications that interact with the registry in order to update the configuration of your applications to accomadate to the new requirements.

### Data Migration

The process of data migration to Apicurio Registry 2.X will require you to export all the data from your 1.3.X deployment and import it to the new 2.X based deployment.

Data migration is a critical step in the migration to Apicurio Registry 2.X if you are using the registry as a schema registry for Kafka applications and if you are using our Kafka SerDes libraries, every kafka message carries the global identifier for the schema stored in Apicurio Registry. It's critical that this identifier is kept between registry upgrades and data migrations.

For that purpose Apicurio Registry 2.X provides a new import/export API to bulk import or export all the data from your registry deployment. This API guarantees that all the identifiers are kept when importing the data from your old registry. The export API works by downloading a custom zip file containing all the information of your artifacts. The import API accepts that zip file.

Apicurio Registry 1.3.X does not provide an import/export API but with the 2.X release we provided a export tool compatible with Apicurio Registry 1.3.X that allows you to export a zip file which then can be imported to your 2.X registry.

This export tool can be found [here](https://github.com/Apicurio/apicurio-registry/tree/2.0.x/utils/exportV1). It is a java application meant to be invoked from the command line.

The migration steps for moving all your data from one version to another would be like this:

**Pre-requisites**: having both a running Apicurio Registry instance for the version 1.3.X and 2.X.

1 - Export all the data from Apicurio Registry 1.3.X using the `exportV1` tool. This will generate a `registry-export.zip` file in your current directory.

```
java -jar apicurio-registry-utils-exportV1-2.0.0-SNAPSHOT-runner.jar http://old-registry.my-company.com/api
```

2 - Import the zip file to Apicurio Registry 2.X using the import API. Extended documentation on this API can be found [here](https://www.apicur.io/registry/docs/apicurio-registry/2.0.0.Final/getting-started/assembly-managing-registry-artifacts-api.html#exporting-importing-using-rest-api)

```
curl -X POST "http://new-registry.my-company.com/apis/registry/v2/admin/import" \
  -H "Accept: application/json" -H "Content-Type: application/zip" \
  --data-binary @registry-export.zip
```

3 - Check the all the artifacts are now imported to the newest registry. Run this two commands and compare the count field.

```
curl "http://old-registry.my-company.com/api/search/artifacts"
```

```
curl "http://new-registry.my-company.com/apis/registry/v2/search/artifacts"
```


### Application Migration

TL.DR. if you are using the SerDes libraries, you need to change the maven dependencies

In Apicurio Registry 1.3.X the SerDes libraries were provided all with just one maven dependency
```
<dependency>
    <groupId>io.apicurio</groupId>
    <artifactId>apicurio-registry-utils-serde</artifactId>
    <version>1.3.2.Final</version>
</dependency>
```

In Apicurio Registry 2.X this has been changed, and the SerDes libraries have been splitted in three maven dependencies, one for each supported data format: `avro`, `protobuf` and `json schema`.

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

You have to take into account this changes in the maven dependencies, and update your applications accordingly.

The refactored SerDes libraries also include some changes in the configuration properties, you can find more information [here](https://www.apicur.io/registry/docs/apicurio-registry/2.0.0.Final/getting-started/assembly-using-kafka-client-serdes.html) , and you can find plenty of examples using Apicurio Registry 2.0.0.Final SerDes libraries [here](https://github.com/Apicurio/apicurio-registry-examples/tree/2.0.x)

But the most important thing you have to change is the registry url config property, you have to change from pointing to the old API path to the new one. Example:

Old:
```
props.putIfAbsent(AbstractKafkaSerDe.REGISTRY_URL_CONFIG_PARAM, "http://localhost:8080/api");
```

New:
```
props.putIfAbsent(SerdeConfig.REGISTRY_URL, "http://localhost:8080/apis/registry/v2");
```

---

This is the most important things to take into account when doing the update to Apicurio Registry 2.0.0.Final. The process is not complex but there are some critical steps that, thanks to our APIs and tooling, should be no problem.

As always, if you have any suggestions or encounter any problem feel free to contact the team by [filling an issue in GitHub](https://github.com/Apicurio/apicurio-registry/issues)