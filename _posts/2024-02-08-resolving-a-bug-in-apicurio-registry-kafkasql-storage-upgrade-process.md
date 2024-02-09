---
layout: post
title: "Resolving a bug in Apicurio Registry KafkaSQL storage upgrade process"
date:   2024-02-08 12:00:00
author: jakub
categories: blog registry kafkasql
---

KafkaSQL is a popular storage option for Apicurio Registry, introduced in version `2.0.0.Final`. It has become very reliable, despite its higher complexity compared to the SQL storage option. Sadly, no software is immune to bugs, and KafkaSQL is no exception. On the other hand, bugs can be interesting, and the debugging process can provide a great opportunity to learn about Apicurio Registry and KafkaSQL internals. I've described one such bug in my previous blog post, titled [Resolving a bug in KafkaSQL storage for Apicurio Registry](https://www.apicur.io/blog/2021/12/09/kafkasql-storage-and-security).

A few days ago <a id="note-1-back"></a> [\[1\]](#note-1), an Apicurio Registry user reported that some of their Protobuf artifacts went missing after an upgrade from version `2.4.4.Final` to `2.5.5.Final`. They are using the KafkaSQL storage option, and after some investigation it turned out that other storage options are not affected. I've decided to write this article to explain the details, but if you are using KafkaSQL storage, please first jump to the [Summary](#summary) section to see if you might be at risk, and then read the [Mitigation](#mitigation) section for a list of actions you should take to mitigate the problem until we release a fixed version.

---

To help the investigation, the user gave us two important pieces of information:

1. Firstly, they noticed the following suspicious log message:
  ```
  2024-01-29T15:24:18.157902803Z 2024-01-29 15:24:18 WARN <_> [io.apicurio.registry.storage.impl.kafkasql.sql.KafkaSqlStore] (KSQL Kafka Consumer Thread) update content canonicalHash, no row match contentId 13 contentHash 6f93522739b215fdd88db69fa59c8c2f70d97e195c6813d89ee6e151840fd5b7
  ```
  which pointed me to focus my investigation on the source of that log message, the [`KafkaSqlProtobufCanonicalizerUpgrader`](https://github.com/Apicurio/apicurio-registry/blob/2.5.8.Final/storage/kafkasql/src/main/java/io/apicurio/registry/storage/impl/kafkasql/KafkaSqlProtobufCanonicalizerUpgrader.java) class. This class is responsible for upgrading the *canonical content hash* of Protobuf artifacts to the correct value.  This is needed because we have updated the algorithm we use to compute the hash. Because this class is specific to Protobuf, runs during an upgrade process, and only for KafkaSQL storage, it is our prime suspect.
2. Secondly, the user was able to provide us with a dump of the `kafkasql-journal` topic, which was very helpful in discovering how the data went missing <a id="note-2-back"></a> [\[2\]](#note-2).

Before I explain what happened, let me first review a few relevant features of Apicurio Registry.

## Content Hashes

In Apicurio Registry, artifact content can be addressed by several identifiers, most commonly:

- *group ID*, *artifact ID*, and *version* triple (GAV)
- *global ID*, which is unique for every artifact version
- *content ID*, which is unique for every piece of content (sequence of bytes).

In some situations, however, these identifiers are not known up front. For example, the user might want to determine whether a piece of content already exists in Apicurio Registry and find out its identifiers, or create a new artifact version **only if** the content does not already exist. Therefore, it's useful to have a way of asking Apicurio Registry about the **content itself** (sequence of bytes).

To support this feature, Apicurio Registry stores a *content hash*, which is a SHA-256 hash of the content, in addition to the content bytes. Users can then retrieve the information about a piece of content using only its hash.

However, the *content hash* does not take the structure of the content into account. The following two Protobuf schemas are semantically equivalent:

```protobuf
syntax = "proto3";

message Error {
  string message = 1;
  uint32 error_code = 2;
}
```

```protobuf
syntax = "proto3";

message Error {  
  string message = 1;  
  // Error code must be between 100 and 999 (inclusive). 
  uint32 error_code = 2;
}
```

but they do not result in the same SHA-256 hash. To support searching for content that is equivalent to the input, but not necessarily equal, Apicurio Registry also stores a *canonical content hash*, which is a SHA-256 hash of the content after it has been converted to a canonical form.

The extended list of identifiers for artifact content in Apicurio Registry is therefore:

- *group ID*, *artifact ID*, and *version* triple (GAV)
- *global ID*
- *content ID*
- *content hash*
- *canonical content hash*.

<a id="protobuf-canonical-content-hash-upgrader"></a> The support for content hashes has evolved across Apicurio Registry versions. For example, in version `2.1.2.Final`, we have implemented a canonicalizer for Protobuf artifacts. Before this version, the *content hash* and *canonical content hash* were computed using the same algorithm. These kinds of changes require careful consideration and implementation of a special process that executes during Apicurio Registry version upgrades. In the case of the KafkaSQL storage option, this upgrade process is performed by the `KafkaSqlProtobufCanonicalizerUpgrader` class.

## Artifact References

Apicurio Registry supports many schema types, and some of them allow specifying references to other schemas. For example, Protobuf supports an `import` statement:

```protobuf
syntax = "proto3";

import "google/protobuf/any.proto";

message Error {
  string message = 1;
  repeated google.protobuf.Any details = 2;
}
```

and JSON Schema has the `$ref` keyword:

```json
{
  "$id": "https://example.com/schemas/error",
  "type": "object",
  "properties": {
    "message": {
      "type": "string"
    },
    "details": {
      "type": "array",
      "items": {
        "$ref": "/schemas/error_detail"
      }
    }
  }
}
```

We have implemented initial support for artifact references in Apicurio Registry version `2.2.2.Final`. This feature allows users to specify a mapping between *reference name* and another artifact version that it points to.

As an example, let's consider the Protobuf schema above. The import statement value `google/protobuf/any.proto` is the *reference name*. If we have already registered the Protobuf file that describes `google.protobuf.Any` under *group ID = `default`*, *artifact ID = `any.proto`*, and *version = `2`*, we can then register a Protobuf file that references it by:

- Making the following *POST* request to `apis/registry/v2/groups/default/artifacts`:
  ```json
  {
    "content": "syntax = \"proto3\";\n\nimport \"google/protobuf/any.proto\";\n\n(...)",
    "references": [
      {
        "name": "google/protobuf/any.proto",
        "groupId": "default",
        "artifactId": "any.proto",
        "version": "2"
      }
    ]
  }
  ```
  with a special content type header `Content-Type: application/create.extended+json`, or
- using Apicurio Registry client library:
  <div class="language-java highlighter-rouge">
  <div class="highlight">
  <pre class="highlight">
  <code class="wide">
  // io.apicurio:apicurio-registry-client:2.5.8.Final
  var meta = client.createArtifact("default", "error.proto", "syntax = \"proto3\";\n\nimport \"google/protobuf/any.proto\";\n\n(...)", List.of(    
      ArtifactReference.builder()
        .name("google/protobuf/any.proto")
        .groupId("default")
        .artifactId("any.proto")
        .version("2")
        .build()
  ));
  </code>
  </pre>
  </div>
  </div>

## Content Hashes and Artifact References

As a result of implementing support for artifact references, we wanted to consider two pieces of artifact content that have the same sequence of bytes, but different references as **not** equivalent. Therefore, we had to change how content hashes are computed. Before version `2.4.2.Final`, the following **legacy** algorithm was used:

```
content_hash = sha256(content)
canonical_content_hash = sha256(canonicalize(content))
```

that has changed to the **current** algorithm:

```
content_hash = sha256(content ++ references)
canonical_content_hash = sha256(canonicalize(content, dependencies) ++ references)
```

Similarly to the [situation when Protobuf canonicalizer was implemented](#protobuf-canonical-content-hash-upgrader), these changes also require careful implementation of an upgrade process. The process is currently performed by the [`ReferencesContentHashUpgrader`](https://github.com/Apicurio/apicurio-registry/blob/2.5.8.Final/app/src/main/java/io/apicurio/registry/storage/impl/sql/upgrader/ReferencesContentHashUpgrader.java) and [`ReferencesCanonicalContentHashUpgrader`](https://github.com/Apicurio/apicurio-registry/blob/2.5.8.Final/app/src/main/java/io/apicurio/registry/storage/impl/sql/upgrader/ReferencesCanonicalHashUpgrader.java) classes. However, they have not been added in the same Apicurio Registry version. More detailed version timeline is described later.

## How KafkaSQL Stores Artifact Content

KafkaSQL storage consists of two main components. Every Apicurio Registry instance has its own in-memory H2 database, and connects to a shared Kafka topic named `kafkasql-journal`. This topic is then used to replicate the state of each in-memory database across instances, and to provide persistence.

When Apicurio Registry is restarted, it consumes all messages in the topic to load the persisted data and bring the instance into sync with any other active Apicurio Registry instances. For more details, see the [Resolving a bug in KafkaSQL storage for Apicurio Registry](https://www.apicur.io/blog/2021/12/09/kafkasql-storage-and-security) blog post.

For this bug analysis, we will focus on the Kafka messages responsible for replicating artifact content data.

When new content is inserted into Apicurio Registry, KafkaSQL storage produces a new *content message* on the `kafkasql-journal` topic. The message has the following structure <a id="note-3-back"></a> [\[3\]](#note-3):

```
key = {content_id, content_hash} // partition_key = content_hash
value = {operation, canonical_content_hash, content, references}
```

where `operation` is one of:
- `CREATE`, which is used when the content is inserted into Apicurio Registry,
- `UPDATE`, which is currently only used by `KafkaSqlProtobufCanonicalizerUpgrader`, or
- `IMPORT`, which is used by the export-import feature.

Structure of the *content message key* is important for determining which Kafka messages can be safely compacted. When [Kafka log compaction](https://kafka.apache.org/documentation/#compaction) runs, only the last message with a given key is preserved, and previous messages are deleted. This has the advantage of reducing the size of the topic by removing stale messages, but has the potential of causing problems in case of a bug, as we'll see later. Apicurio Registry automatically creates the `kafkasql-journal` topic if it **does not** already exist, and it configures the topic with **log compaction enabled** by default.

## Version History

Because we suspect that the issue is caused by a bug in the upgrade process for KafkaSQL storage, specifically the `KafkaSqlProtobufCanonicalizerUpgrader`, we need to analyze Apicurio Registry versions that contain relevant changes. This helps us understand how the bug was introduced and which versions are affected.

### **Version 2.1.2.Final**

In this version, we implemented the content canonicalizer for Protobuf artifacts <a id="note-4-back"></a> [\[4\]](#note-4). Before this change, *canonical content hash* for Protobuf artifacts was the same as *content hash*:

```
content_hash = sha256(content)
canonical_content_hash = sha256(content)
```

Protobuf content hashes are now computed using the following algorithm:

```
content_hash = sha256(content)
canonical_content_hash = sha256(canonicalize(content))
```

Let's call these *legacy content hash* and *legacy canonical content hash* to differentiate between the current hash algorithm implemented in version `2.4.2.Final`.

### **Version 2.1.3.Final**

In this version, `KafkaSqlProtobufCanonicalizerUpgrader` is implemented <a id="note-5-back"></a> [\[5\]](#note-5), which is responsible for computing *legacy canonical content hash* for Protobuf artifacts. The upgrader is executed for both SQL and KafkaSQL storage options.

### **Version 2.2.2.Final**

In this version, artifact references are implemented <a id="note-6-back"></a> [\[6\]](#note-6). The algorithm for computing content hashes does not change.

### **Version 2.4.2.Final**

This version changes how content hashes are computed <a id="note-7-back"></a> [\[7\]](#note-7), in order to take artifact references into account:

```
content_hash = sha256(content ++ references)
canonical_content_hash = sha256(canonicalize(content, dependencies) ++ references)
```

Let's call these *current content hash* and *current canonical content hash* to differentiate between the legacy hash algorithm implemented in version `2.1.2.Final` for Protobuf artifacts.

By mistake, `KafkaSqlProtobufCanonicalizerUpgrader` was not updated, so it still attempts to change the *canonical content hash* to the legacy value during Apicurio Registry restart.

[`ReferencesContentHashUpgrader`](https://github.com/Apicurio/apicurio-registry/blob/2.4.2.Final/app/src/main/java/io/apicurio/registry/storage/impl/sql/upgrader/ReferencesContentHashUpgrader.java) is implemented to upgrade the *legacy content hash* to the *current content hash* in the in-memory database. It's not executed for KafkaSQL storage option by mistake.

### **Version 2.4.3.Final**

User reports an [issue related to content hashes in KafkaSQL](https://github.com/Apicurio/apicurio-registry/issues/3414). This is fixed in the next version.

This version also fixes a bug in `KafkaSqlProtobufCanonicalizerUpgrader` <a id="note-8-back"></a> [\[8\]](#note-8), that resulted in an SQL error when the *canonical content hash* change was being applied:

```
2024-02-07 13:54:26 DEBUG <> [io.apicurio.registry.storage.impl.kafkasql.sql.KafkaSqlSink] (KSQL Kafka Consumer Thread) Registry exception detected: io.apicurio.registry.storage.impl.sql.jdb.RuntimeSqlException: org.h2.jdbc.JdbcSQLDataException: Parameter "#4" is not set [90012-214]
```

resulting in the operation failing, and in-memory database containing the same *canonical content hash* as before.

### **Version: 2.4.4.Final**

[`ReferencesCanonicalHashUpgrader`](https://github.com/Apicurio/apicurio-registry/blob/2.4.4.Final/app/src/main/java/io/apicurio/registry/storage/impl/sql/upgrader/ReferencesCanonicalHashUpgrader.java) is implemented <a id="note-9-back"></a> [\[9\]](#note-9) to upgrade the *legacy canonical content hash* to the *current canonical content hash* in the in-memory database.

Both `References*` upgraders are now executed for the KafkaSQL storage option.

## Hypothesis

When examining the Kafka topic dump <a id="note-10-back"></a> [\[10\]](#note-10), I've noticed that for some *content ID*s, in this case *content ID = `2`*, the only message present is:

<div class="language-json highlighter-rouge">
<div class="highlight">
<pre class="highlight">
<code class="wide">
{
  "offset": 10,
  "key": "\u0002{\"tenantId\":\"_\",\"contentHash\":\"b5f276336ecbb160556c114fe22e7cebd8353f0bc11127eb0f69a4aad32648ea\",\"contentId\":2}",
  "payload": "\u0002\u0002\u0000\u0000\u0000@59e286281876629c2715b06c8ef294a1d4a713f5e4249d7a3e386bb734f7db90\u0000\u0000\u0000\u0000\u0000\u0000\u0000V[{\"groupId\":null,\"artifactId\":\"any\",\"version\":\"1\",\"name\":\"google/protobuf/any.proto\"}]"
}
</code>
</pre>
</div>
</div>

which is missing the content bytes (the four bytes `\u0000\u0000\u0000\u0000` encode the length of the content, which is zero). This means that the previous *content messages* must have been compacted. How is the message above produced? It is produced by `KafkaSqlProtobufCanonicalizerUpgrader`.

We now have the information I needed to formulate a hypothesis about what happened. There are two related bugs:

1. `KafkaSqlProtobufCanonicalizerUpgrader` [was not updated to use the *current canonical content hash* algorithm](https://github.com/Apicurio/apicurio-registry/blob/2.5.8.Final/storage/kafkasql/src/main/java/io/apicurio/registry/storage/impl/kafkasql/KafkaSqlProtobufCanonicalizerUpgrader.java#L83-L91), so it always attempts to change any Protobuf content that uses *current canonical content hash* back to *legacy canonical content hash* after each Apicurio Registry restart. Since the hashes are equal for Protobuf content without references, only Protobuf content with references is affected.
1. `KafkaSqlProtobufCanonicalizerUpgrader` performs the hash change [using the following Kafka *content message*](https://github.com/Apicurio/apicurio-registry/blob/2.5.8.Final/storage/kafkasql/src/main/java/io/apicurio/registry/storage/impl/kafkasql/KafkaSqlProtobufCanonicalizerUpgrader.java#L80):

   ```
   key = {content_id = (unchanged), content_hash = (unchanged)}
   value = {operation = UPDATE, canonical_content_hash = (legacy value), content = null, references = (unchanged)}
   ```

   Which has the same *content message key* as the Kafka message that was used to insert the content. The previous *content message* might become compacted and the content lost.

## Reproducer Scenario

This is a more detailed list of steps that I think should reproduce the problem:

1. User starts with Apicurio Registry version `2.2.2.Final-2.4.1.Final` (inclusive), using KafkaSQL storage.

1. User adds some Protobuf artifacts with references, let's call them **set A**. The content hashes for these artifacts are computed using the legacy algorithm. Therefore, the *content message keys* contain *legacy content hash*, and *content message values* contain *legacy canonical content hash*. The in-memory database contains the same.

1. User upgrades Apicurio Registry to version `2.4.2.Final-2.4.3.Final` (inclusive).

    1. The `KafkaSqlProtobufCanonicalizerUpgrader` is executed. For each Protobuf artifact in the database, it computes the  *legacy canonical content hash*, which is equal to the canonical content hash of **set A**, so nothing changes. The `Reference*` upgraders are not executed for KafkaSQL in this version.

1. User adds some more Protobuf artifacts with references, let's call them **set B**. The content hashes for these artifacts are computed using the current algorithm. Therefore, the *content message keys* contain *current content hash*, and *content message values* contain *current canonical content hash*.

1. User restarts their Apicurio Registry instance.
 
   1. `KafkaSqlProtobufCanonicalizerUpgrader` is executed again. It's not necessary to upgrade Apicurio Registry to a later version, because KafkaSQL upgraders are executed every time Apicurio Registry starts. For each Protobuf artifact in the database, it computes the *legacy canonical content hash*, which equals to the *canonical content hash* of **set A**, but **not set B**. Therefore, it changes the *canonical content hash* of **set B** to the legacy value, by sending a *content message value* that is missing the content by mistake.

1. Some time later, Kafka compaction runs, which effectively deletes the content of **set B**. The missing data is only noticed after another restart of Apicurio Registry, when the in-memory database is loaded from the Kafka topic.

1. User upgrades Apicurio Registry to version `2.4.4.Final-2.5.8.Final` (inclusive) <a id="note-11-back"></a> [\[11\]](#note-11).

    1. The `KafkaSqlProtobufCanonicalizerUpgrader` is executed again.
    1. The `ReferencesContentHashUpgrader` is executed, which updates any *legacy content hash* it finds to *current content hash*, but only in the in-memory database. This currently does not cause any problems, but since *content hash* is part of the *content message key*, there is a risk of a potential bug in the future. See [Additional bug risk](#additional-bug-risk) section for more details.
    1. The `ReferencesCanonicalHashUpgrader` is executed, which updates any *legacy canonical content hash* it finds to *current canonical content hash*, but only in the in-memory database. This currently does not cause any problems.

## Reproducer

To confirm my hypothesis, I will follow the reproducer scenario above. We can skip steps 1, 2, and 3.1., starting with an empty Apicurio Registry version `2.4.2.Final`. We will configure the `kafkasql-journal` topic with an aggressive log compaction <a id="note-12-back"></a> [\[12\]](#note-12).

We will add two Protobuf artifacts, [`any.proto`](https://github.com/protocolbuffers/protobuf/blob/main/src/google/protobuf/any.proto), and `error.proto`. The second artifact references the first one.

The following shows abbreviated contents of the `CONTENT` table in the in-memory database:

<div class="language-plaintext highlighter-rouge">
<div class="highlight">
<pre class="highlight">
<code class="wide">
+--------+---------+----------------------------------------------------------------+----------------------------------------------------------------+-----------------------------------+--------------------------------------------------------------------------------------+
|TENANTID|CONTENTID|CANONICALHASH                                                   |CONTENTHASH                                                     |CONTENT                            |ARTIFACTREFERENCES                                                                    |
+--------+---------+----------------------------------------------------------------+----------------------------------------------------------------+-----------------------------------+--------------------------------------------------------------------------------------+
|_       |1        |628ccecee09bcc0bcfdc95adce7041e998bb82a7377c600d7dbbba4f70dcae04|bfd6f785126a85ec181c41bc29680b394627c32b7ef0c3e4cef3ced86e463e7d|syntax = "proto3";                 |null                                                                                  |
|        |         |                                                                |                                                                |                                   |                                                                                      |
|        |         |                                                                |                                                                |package google.protobuf;           |                                                                                      |
|        |         |                                                                |                                                                |[...]                              |                                                                                      |
+--------+---------+----------------------------------------------------------------+----------------------------------------------------------------+-----------------------------------+--------------------------------------------------------------------------------------+
|_       |2        |b5a276ddf3fc1724dbe206cbc6da60adf8e32af5613ef0fe52fb1dde8da6b67a|b5f276336ecbb160556c114fe22e7cebd8353f0bc11127eb0f69a4aad32648ea|syntax = "proto3";                 |[{"groupId":null,"artifactId":"any","version":"1","name":"google/protobuf/any.proto"}]|
|        |         |                                                                |                                                                |                                   |                                                                                      |
|        |         |                                                                |                                                                |import "google/protobuf/any.proto";|                                                                                      |
|        |         |                                                                |                                                                |                                   |                                                                                      |
|        |         |                                                                |                                                                |message Error {                    |                                                                                      |
|        |         |                                                                |                                                                |[...]                              |                                                                                      |
+--------+---------+----------------------------------------------------------------+----------------------------------------------------------------+-----------------------------------+--------------------------------------------------------------------------------------+
</code>
</pre>
</div>
</div>

Notice that the *canonical content hash* value in the second row is `b5a276ddf3fc1724dbe206cbc6da60adf8e32af5613ef0fe52fb1dde8da6b67a`. This is the correct value that was computed using the current hash algorithm when the content was inserted.

We restart Apicurio Registry, and see the following message in the log, which means that the `KafkaSqlProtobufCanonicalizerUpgrader` has been executed:

```
2024-02-07 12:29:47 DEBUG <> [io.apicurio.registry.storage.impl.kafkasql.KafkaSqlProtobufCanonicalizerUpgrader] (KSQL Kafka Consumer Thread) Protobuf content canonicalHash outdated value detected, updating contentId 2
```

The `CONTENT` table now shows that the `KafkaSqlProtobufCanonicalizerUpgrader` updated the *canonical content hash* to the incorrect legacy value:

<div class="language-plaintext highlighter-rouge">
<div class="highlight">
<pre class="highlight">
<code class="wide">
+--------+---------+----------------------------------------------------------------+----------------------------------------------------------------+-----------------------------------+--------------------------------------------------------------------------------------+
|TENANTID|CONTENTID|CANONICALHASH                                                   |CONTENTHASH                                                     |CONTENT                            |ARTIFACTREFERENCES                                                                    |
+--------+---------+----------------------------------------------------------------+----------------------------------------------------------------+-----------------------------------+--------------------------------------------------------------------------------------+
|_       |1        |628ccecee09bcc0bcfdc95adce7041e998bb82a7377c600d7dbbba4f70dcae04|bfd6f785126a85ec181c41bc29680b394627c32b7ef0c3e4cef3ced86e463e7d|syntax = "proto3";                 |null                                                                                  |
|        |         |                                                                |                                                                |                                   |                                                                                      |
|        |         |                                                                |                                                                |package google.protobuf;           |                                                                                      |
|        |         |                                                                |                                                                |[...]                              |                                                                                      |
+--------+---------+----------------------------------------------------------------+----------------------------------------------------------------+-----------------------------------+--------------------------------------------------------------------------------------+
|_       |2        |59e286281876629c2715b06c8ef294a1d4a713f5e4249d7a3e386bb734f7db90|b5f276336ecbb160556c114fe22e7cebd8353f0bc11127eb0f69a4aad32648ea|syntax = "proto3";                 |[{"groupId":null,"artifactId":"any","version":"1","name":"google/protobuf/any.proto"}]|
|        |         |                                                                |                                                                |                                   |                                                                                      |
|        |         |                                                                |                                                                |import "google/protobuf/any.proto";|                                                                                      |
|        |         |                                                                |                                                                |                                   |                                                                                      |
|        |         |                                                                |                                                                |message Error {                    |                                                                                      |
|        |         |                                                                |                                                                |[...]                              |                                                                                      |
+--------+---------+----------------------------------------------------------------+----------------------------------------------------------------+-----------------------------------+--------------------------------------------------------------------------------------+
</code>
</pre>
</div>
</div>

At this moment, the `kafkasql-journal` topic contains the following messages:

<div class="language-json highlighter-rouge">
<div class="highlight">
<pre class="highlight">
<code class="wide">
[
  {
    "offset": 0,
    "key": "\u0000{\"bootstrapId\":\"c613911c-2f32-4a2a-9d79-fffa321f9548\"}",
    "payload": null
  },
  {
    "offset": 1,
    "key": "\t{\"tenantId\":\"_\",\"uuid\":\"c6758a4e-1c7c-4c68-ad17-0dc99f1cb374\"}",
    "payload": "\t{\"action\":1}"
  },
  {
    "offset": 2,
    "key": "\u0002{\"tenantId\":\"_\",\"contentHash\":\"bfd6f785126a85ec181c41bc29680b394627c32b7ef0c3e4cef3ced86e463e7d\",\"contentId\":1}",
    "payload": "\u0002\u0001\u0000\u0000\u0000@628ccecee09bcc0bcfdc95adce7041e998bb82a7377c600d7dbbba4f70dcae04\u0000\u0000\u0001\u0087syntax = \"proto3\";\n\npackage google.protobuf;\n\noption go_package = \"google.golang.org/protobuf/types/known/anypb\";\noption java_package = \"com.google.protobuf\";\noption java_outer_classname = \"AnyProto\";\noption java_multiple_files = true;\noption objc_class_prefix = \"GPB\";\noption csharp_namespace = \"Google.Protobuf.WellKnownTypes\";\n\nmessage Any {\n\n  string type_url = 1;\n\n  bytes value = 2;\n}\n\u0000\u0000\u0000\u0000"
  },
  {
    "offset": 3,
    "key": "\b{\"tenantId\":\"_\",\"uuid\":\"ea335c14-7f1b-40ee-8beb-94ef0b02890d\"}",
    "payload": "\b{\"action\":1}"
  },
  {
    "offset": 4,
    "key": "\u0003{\"tenantId\":\"_\",\"artifactId\":\"any\",\"uuid\":\"ecb0a768-617c-4b3d-af1a-3d340c4f2f44\"}",
    "payload": "\u0003{\"action\":1,\"metaData\":{},\"globalId\":1,\"artifactType\":\"PROTOBUF\",\"contentHash\":\"bfd6f785126a85ec181c41bc29680b394627c32b7ef0c3e4cef3ced86e463e7d\",\"createdBy\":\"\",\"createdOn\":1707303731203}"
  },
  {
    "offset": 5,
    "key": "\t{\"tenantId\":\"_\",\"uuid\":\"35a22e8e-f826-4568-8bd8-9d8722a5f25f\"}",
    "payload": "\t{\"action\":1}"
  },
  {
    "offset": 6,
    "key": "\u0002{\"tenantId\":\"_\",\"contentHash\":\"b5f276336ecbb160556c114fe22e7cebd8353f0bc11127eb0f69a4aad32648ea\",\"contentId\":2}",
    "payload": "\u0002\u0001\u0000\u0000\u0000@b5a276ddf3fc1724dbe206cbc6da60adf8e32af5613ef0fe52fb1dde8da6b67a\u0000\u0000\u0000\u008dsyntax = \"proto3\";\n\nimport \"google/protobuf/any.proto\";\n\nmessage Error {\n  string message = 1;\n  repeated google.protobuf.Any details = 2;\n}\n\u0000\u0000\u0000V[{\"groupId\":null,\"artifactId\":\"any\",\"version\":\"1\",\"name\":\"google/protobuf/any.proto\"}]"
  },
  {
    "offset": 7,
    "key": "\b{\"tenantId\":\"_\",\"uuid\":\"e57510fa-f204-4277-bb5d-7424987737af\"}",
    "payload": "\b{\"action\":1}"
  },
  {
    "offset": 8,
    "key": "\u0003{\"tenantId\":\"_\",\"artifactId\":\"error\",\"uuid\":\"b51ca026-3c39-44fd-b22b-6b29478d4477\"}",
    "payload": "\u0003{\"action\":1,\"metaData\":{},\"globalId\":2,\"artifactType\":\"PROTOBUF\",\"contentHash\":\"b5f276336ecbb160556c114fe22e7cebd8353f0bc11127eb0f69a4aad32648ea\",\"createdBy\":\"\",\"createdOn\":1707303731454}"
  },
  {
    "offset": 9,
    "key": "\u0000{\"bootstrapId\":\"d58884b2-6552-4330-9cd3-f3f294a54e4b\"}",
    "payload": null
  },
  {
    "offset": 10,
    "key": "\u0002{\"tenantId\":\"_\",\"contentHash\":\"b5f276336ecbb160556c114fe22e7cebd8353f0bc11127eb0f69a4aad32648ea\",\"contentId\":2}",
    "payload": "\u0002\u0002\u0000\u0000\u0000@59e286281876629c2715b06c8ef294a1d4a713f5e4249d7a3e386bb734f7db90\u0000\u0000\u0000\u0000\u0000\u0000\u0000V[{\"groupId\":null,\"artifactId\":\"any\",\"version\":\"1\",\"name\":\"google/protobuf/any.proto\"}]"
  }
]
</code>
</pre>
</div>
</div>

Notice that message `9` is a bootstrap message marking the point where Apicurio Registry was restarted. Message `10` is produced by the `KafkaSqlProtobufCanonicalizerUpgrader`.

We will wait for Kafka log compaction to run, and observe the contents of the `kafkasql-journal` topic again:

<div class="language-json highlighter-rouge">
<div class="highlight">
<pre class="highlight">
<code class="wide">
[
  {
    "offset": 1,
    "key": "\t{\"tenantId\":\"_\",\"uuid\":\"4c039a9a-62b5-459a-b6da-fc771345de31\"}",
    "payload": "\t{\"action\":1}"
  },
  {
    "offset": 2,
    "key": "\u0002{\"tenantId\":\"_\",\"contentHash\":\"bfd6f785126a85ec181c41bc29680b394627c32b7ef0c3e4cef3ced86e463e7d\",\"contentId\":1}",
    "payload": "\u0002\u0001\u0000\u0000\u0000@628ccecee09bcc0bcfdc95adce7041e998bb82a7377c600d7dbbba4f70dcae04\u0000\u0000\u0001\u0087syntax = \"proto3\";\n\npackage google.protobuf;\n\noption go_package = \"google.golang.org/protobuf/types/known/anypb\";\noption java_package = \"com.google.protobuf\";\noption java_outer_classname = \"AnyProto\";\noption java_multiple_files = true;\noption objc_class_prefix = \"GPB\";\noption csharp_namespace = \"Google.Protobuf.WellKnownTypes\";\n\nmessage Any {\n\n  string type_url = 1;\n\n  bytes value = 2;\n}\n\u0000\u0000\u0000\u0000"
  },
  {
    "offset": 3,
    "key": "\b{\"tenantId\":\"_\",\"uuid\":\"59fb1cc2-5779-4e39-b089-3272ad8c3b10\"}",
    "payload": "\b{\"action\":1}"
  },
  {
    "offset": 4,
    "key": "\u0003{\"tenantId\":\"_\",\"artifactId\":\"any\",\"uuid\":\"7a77789f-d882-4578-b965-1b5050335b05\"}",
    "payload": "\u0003{\"action\":1,\"metaData\":{},\"globalId\":1,\"artifactType\":\"PROTOBUF\",\"contentHash\":\"bfd6f785126a85ec181c41bc29680b394627c32b7ef0c3e4cef3ced86e463e7d\",\"createdBy\":\"\",\"createdOn\":1707305198467}"
  },
  {
    "offset": 5,
    "key": "\t{\"tenantId\":\"_\",\"uuid\":\"33711009-be5c-4491-86e2-d085ba9a39f5\"}",
    "payload": "\t{\"action\":1}"
  },
  {
    "offset": 7,
    "key": "\b{\"tenantId\":\"_\",\"uuid\":\"3dd98144-215b-45cf-92f0-e34f09a08a4e\"}",
    "payload": "\b{\"action\":1}"
  },
  {
    "offset": 8,
    "key": "\u0003{\"tenantId\":\"_\",\"artifactId\":\"error\",\"uuid\":\"07cc6743-ce36-4258-9fbd-c9c6ec8028d9\"}",
    "payload": "\u0003{\"action\":1,\"metaData\":{},\"globalId\":2,\"artifactType\":\"PROTOBUF\",\"contentHash\":\"b5f276336ecbb160556c114fe22e7cebd8353f0bc11127eb0f69a4aad32648ea\",\"createdBy\":\"\",\"createdOn\":1707305199277}"
  },
  {
    "offset": 10,
    "key": "\u0002{\"tenantId\":\"_\",\"contentHash\":\"b5f276336ecbb160556c114fe22e7cebd8353f0bc11127eb0f69a4aad32648ea\",\"contentId\":2}",
    "payload": "\u0002\u0002\u0000\u0000\u0000@59e286281876629c2715b06c8ef294a1d4a713f5e4249d7a3e386bb734f7db90\u0000\u0000\u0000\u0000\u0000\u0000\u0000V[{\"groupId\":null,\"artifactId\":\"any\",\"version\":\"1\",\"name\":\"google/protobuf/any.proto\"}]"
  }
]
</code>
</pre>
</div>
</div>

Notice that the bootstrap messages at offset `0` and `9` have been deleted, because they are empty (this is on purpose). However, message `6` has also been deleted because it shares the key with message `10`. This was not intended and is the bug we need to fix.

After another restart, the Protobuf content with references is missing in the `CONTENT` table:

<div class="language-plaintext highlighter-rouge">
<div class="highlight">
<pre class="highlight">
<code class="wide">
+--------+---------+----------------------------------------------------------------+----------------------------------------------------------------+-----------------------------------+--------------------------------------------------------------------------------------+
|TENANTID|CONTENTID|CANONICALHASH                                                   |CONTENTHASH                                                     |CONTENT                            |ARTIFACTREFERENCES                                                                    |
+--------+---------+----------------------------------------------------------------+----------------------------------------------------------------+-----------------------------------+--------------------------------------------------------------------------------------+
|_       |1        |628ccecee09bcc0bcfdc95adce7041e998bb82a7377c600d7dbbba4f70dcae04|bfd6f785126a85ec181c41bc29680b394627c32b7ef0c3e4cef3ced86e463e7d|syntax = "proto3";                 |null                                                                                  |
|        |         |                                                                |                                                                |                                   |                                                                                      |
|        |         |                                                                |                                                                |package google.protobuf;           |                                                                                      |
|        |         |                                                                |                                                                |[...]                              |                                                                                      |
+--------+---------+----------------------------------------------------------------+----------------------------------------------------------------+-----------------------------------+--------------------------------------------------------------------------------------+
</code>
</pre>
</div>
</div>

<span class="big">&#x220e;</span>

## <a id="additional-bug-risk"></a> Additional Bug Risk

Because the `ReferencesContentHashUpgrader` does not write the updated content hashes to the Kafka topic in step 7.2., there might be a mismatch between the content hash value in the `kafkasql-journal` topic and the in-memory database. If Apicurio Registry produced a new *content message* for a given *content ID* (for example, to upgrade the canonical content hash, content, or references), the *content message key* that would be used is different from the one present in the topic, because the key would contain a *content hash* that has changed.

Currently, the only operation that updates content via *content message* is the one that `KafkaSqlProtobufCanonicalizerUpgrader` uses. This operation is always executed **before** the `Reference*` upgraders, so it does not cause issues, but it is still a potential bug. To fix this, we would need to change the format of the *content message key*.

## <a id="summary"></a> Summary

The problem is caused by two bugs in the Apicurio Registry upgrade process that is specific to the KafkaSQL storage option.

You are affected if:

1. You are using Apicurio Registry `2.4.2.Final` or later, **and**
1. you are using KafkaSQL storage, **and**
1. you have created Protobuf artifacts with references, **and**
1. you restart the Apicurio Registry instance (for example during version upgrade).

Symptoms are different based on your Kafka log compaction configuration:

- If Kafka compaction runs, some Protobuf artifacts with references **might be deleted**, and disappear from Apicurio Registry after restart.
- If Kafka compaction is disabled, data is **not** lost, but some Protobuf artifacts with references might have their *canonical content hash* updated to the **legacy** version. If you are on version `2.4.2.Final`, because of a different bug, the hash change fails to be applied to the in-memory database, so the side effect is avoided at the cost of `Reference*` upgraders not being present in this version.

## <a id="mitigation"></a> Mitigation

If you are affected, you can mitigate the bug using the following steps:

1. Back up your Apicurio Registry data by either backing up the `kafkasql-journal` topic directly, or by using the export-import feature.
1. Disable compaction of `kafkasql-journal` topic.
1. Avoid using features that rely on *canonical content hash*, such as:
    - Searching for artifacts using canonical content (*POST* to `/search/artifacts` with `canonical=true` query parameter),
    - Searching artifact metadata by canonical content (*POST* to `/groups/{groupId}/artifacts/{artifactId}/meta` with `canonical=true`), or
    - Skipping updating of an artifact on duplicate content (*POST* to `/groups/{groupId}/artifacts`, with `ifExists=RETURN_OR_UPDATE` and `canonical=true`);

   with Protobuf artifacts that have references, unless your Apicurio Registry version is `2.4.2.Final`.
1. Do not restart or upgrade Apicurio Registry (if possible), until a fixed version is released [\[11\]](#note-11), and then upgrade directly to the fixed version, skipping any intermediate versions.

## Solution

We are working on a fix at the moment. I will update this article when it is available.  

## Notes

<a id="note-1"></a> **[1]** As of the writing of this article, latest Apicurio Registry version is `2.5.8.Final`. [\[Go back\]](#note-1-back)

<a id="note-2"></a> **[2]** If you come across a bug that you suspect is related to KafkaSQL, I have written a [guide on how to generate a `kafkasql-journal` topic dump](https://www.apicur.io/registry/docs/apicurio-registry/2.5.x/getting-started/guide-exporting-registry-kafka-topic-data.html) that could help us during investigation. [\[Go back\]](#note-2-back)

<a id="note-3"></a> **[3]** Ignoring multitenancy for simplicity. [\[Go back\]](#note-3-back)

<a id="note-4"></a> **[4]** Commit `42b30af2c4`, PR #1973. [\[Go back\]](#note-4-back)

<a id="note-5"></a> **[5]** Commit `03654bb492`, PR #2005. [\[Go back\]](#note-5-back)

<a id="note-6"></a> **[6]** Commit `dd885c3aae`, PR #2366. [\[Go back\]](#note-6-back)

<a id="note-7"></a> **[7]** Commit `9628c43b45`, PR #3228. [\[Go back\]](#note-7-back)

<a id="note-8"></a> **[8]** Commit `6dac98fc8a`, PR #3300. [\[Go back\]](#note-8-back)

<a id="note-9"></a> **[9]** Commit `67065bfc53`, PR #3423. [\[Go back\]](#note-9-back)

<a id="note-10"></a> **[10]** This is an illustrative example, not the actual topic dump provided by the user. [\[Go back\]](#note-10-back)

<a id="note-11"></a> **[11]** Expected fixed version is `2.5.9.Final`. [\[Go back\]](#note-11-back)

<a id="note-12"></a> **[12]** To do this, we create the topic manually before starting Apicurio Registry, using the following command:

```
bin/kafka-topics.sh --bootstrap-server localhost:9092 \
    --create --topic kafkasql-journal --partitions 1 --replication-factor 1 \
    --config min.cleanable.dirty.ratio=0.000001 --config cleanup.policy=compact \
    --config segment.ms=100 --config delete.retention.ms=100
```

If the topic is small, we might also need to add additional messages to the topic, since active segments are not eligible for compaction. [\[Go back\]](#note-12-back)

---

Thank you for using and supporting Apicurio projects! As always, if you have any suggestions or encounter any problem, feel free to contact the team by [filing an issue in GitHub](https://github.com/Apicurio/apicurio-registry/issues).
