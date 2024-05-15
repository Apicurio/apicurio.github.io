---
layout: post
title: "Apicurio Registry - JSON Schema dereference"
date:   2024-05-14 16:00:00
author: carles
categories: registry openapi jsonchema asyncapi avro
---

As it can be seen in the [documentation](https://www.apicur.io/registry/docs/apicurio-registry/2.5.x/getting-started/assembly-managing-registry-artifacts-api.html), Apicurio Registry allows to manage artifacts with references.
One of the cool features we've added on top of this is the possibility of using a dereference parameter for certain API endpoints that, when used, allows you to fetch the full content of an artifact with all the references inlined within the same content.
This is especially useful in certain contexts to reduce the number of HTTP requests, like, as we will see in this blog, in the Kafka Serializers and Deserializers.

---

Intro
===

The code example used for this blog post can be found in the Apicurio Registry [examples](https://github.com/Apicurio/apicurio-registry/blob/2.6.x/examples/serdes-with-references/src/main/java/io/apicurio/registry/examples/references/JsonSerdeReferencesDereferencedExample.java).

One of the limitations of the JSON Schema format is that, given some data that adheres to a particular schema it does not allow to discover the full schema from that content. That's the main reason why, for this serde, the schema being used has to be registered upfront, and that's what you see
in the code example from line [57 to line 132](https://github.com/Apicurio/apicurio-registry/blob/2.6.x/examples/serdes-with-references/src/main/java/io/apicurio/registry/examples/references/JsonSerdeReferencesDereferencedExample.java#L57-L132).
Where the main schema _city.json_ is registered with all the references in the hierarchy. Along those lines, a full hierarchy of schemas is registered in Apicurio Registry. The hierarchy can be described as follows and represented as a tree:

```
                          cityzen
     |          |                     |                   |
    city   qualification        sample.address     citizenIdentifier
     |                                                     |
 qualification                                       qualification
    
```

As you may notice, there are three different files with the same name. This is done on purpose to demonstrate that you can have different schemas with the same name within the same hierarchy.
When they're registered in the code example, they're registered under the same group but using different artifact ids, so they can be referenced from their main schema.

Since an image is way better than trying to describe it, this is the structure in the file system:

![Registry (before)](/images/posts/registry-dereference/file-system.png)

In the code example there are also [java classes](https://github.com/Apicurio/apicurio-registry/tree/2.6.x/examples/serdes-with-references/src/main/java/io/apicurio/registry/examples/references/model) that represent each of the objects we have in the structure, so we can use them when producing Kafka messages. There is one Java class per each JSON Schema file.

---
JSON Schema dereference
===

By default, the endpoints that return the content of a particular artifact fetch just the main content, and then you must get the links to the references and,
one by one, do a full scan of the hierarchy to fetch any other sub-schema needed. For instance, the content of the _city.json_ schema is the following:

```json
{
  "$id": "https://example.com/citizen.json",
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Citizen",
  "type": "object",
  "properties": {
    "firstName": {
      "type": "string",
      "description": "The citizen's first name."
    },
    "lastName": {
      "type": "string",
      "description": "The citizen's last name."
    },
    "age": {
      "description": "Age in years which must be equal to or greater than zero.",
      "type": "integer",
      "minimum": 0
    },
    "city": {
      "$ref": "types/city/city.json"
    },
    "identifier": {
      "$ref": "types/identifier/citizenIdentifier.json"
    },
    "qualifications": {
      "type": "array",
      "items": {
        "$ref": "qualification.json"
      }
    }
  },
  "required": [
    "city"
  ]
}
```

Without dereferencing in order to be able to produce Kafka messages to adhere to this schema, that is already registered in Apicurio Registry, we would need to fetch all the nested references with multiple HTTP requests and then parse all of them while, when dereferencing is used, this is what you get:

```json
{
  "$schema" : "http://json-schema.org/draft-07/schema#",
  "title" : "Citizen",
  "type" : "object",
  "properties" : {
    "firstName" : {
      "description" : "The citizen's first name.",
      "type" : "string"
    },
    "lastName" : {
      "description" : "The citizen's last name.",
      "type" : "string"
    },
    "identifier" : {
      "title" : "Identifier",
      "type" : "object",
      "properties" : {
        "identifier" : {
          "description" : "The citizen identifier.",
          "type" : "integer",
          "minimum" : 0
        },
        "qualification" : {
          "title" : "Qualification",
          "type" : "object",
          "properties" : {
            "qualification" : {
              "description" : "The identifier qualification",
              "type" : "integer",
              "minimum" : 20
            },
            "name" : {
              "description" : "The subject's name",
              "type" : "string"
            }
          }
        }
      }
    },
    "qualifications" : {
      "type" : "array",
      "items" : {
        "title" : "Qualification",
        "type" : "object",
        "properties" : {
          "qualification" : {
            "description" : "The qualification.",
            "type" : "integer",
            "minimum" : 0
          },
          "name" : {
            "description" : "The subject's name",
            "type" : "string"
          }
        }
      }
    },
    "city" : {
      "title" : "City",
      "type" : "object",
      "properties" : {
        "zipCode" : {
          "description" : "The zip code.",
          "type" : "integer",
          "minimum" : 0
        },
        "qualification" : {
          "title" : "Qualification",
          "type" : "object",
          "properties" : {
            "qualification" : {
              "description" : "The city qualification",
              "type" : "integer",
              "minimum" : 10
            },
            "name" : {
              "description" : "The subject's name",
              "type" : "string"
            }
          }
        },
        "name" : {
          "description" : "The city's name.",
          "type" : "string"
        }
      }
    },
    "age" : {
      "description" : "Age in years which must be equal to or greater than zero.",
      "type" : "integer",
      "minimum" : 0
    }
  },
  "required" : [ "city" ],
  "$id" : "https://example.com/citizen.json"
}
```
As you can see, that's the content of the full hierarchy, not just the schema of the _citizen_ element alone. There are two endpoints where you can get the content dereferenced, with the following curl commands:

```
curl --location 'http://localhost:8080/apis/registry/v2/ids/globalIds/7?dereference=true'
curl --location 'http://localhost:8080/apis/registry/v2/groups/default/artifacts/JsonSerdeReferencesExample?dereference=true'
curl --location 'http://localhost:8080/apis/registry/v2/groups/default/artifacts/JsonSerdeReferencesExample/versions/1?dereference=true'
```

JSON Schema Kafka Serde dereference
===

Now, in order to make good use of all of this, we can use a Kafka producer. For this example, in the Kafka Producer there is one extremely important property we must set, the schema resolver configuration option _SERIALIZER_DEREFERENCE_SCHEMA_. This is the option that will instruct the Schema Resolver to use the dereference parameter in the globalIds endpoint above (since that is the endpoint used by default to resolve the schema).

```java
Properties props = new Properties();

// Configure kafka settings
props.putIfAbsent(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, SERVERS);
props.putIfAbsent(ProducerConfig.CLIENT_ID_CONFIG, "Producer-" + TOPIC_NAME);
props.putIfAbsent(ProducerConfig.ACKS_CONFIG, "all");
props.putIfAbsent(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
props.putIfAbsent(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSchemaKafkaSerializer.class.getName());
props.putIfAbsent(SerdeConfig.ARTIFACT_RESOLVER_STRATEGY, SimpleTopicIdStrategy.class.getName());
props.putIfAbsent(SerdeConfig.EXPLICIT_ARTIFACT_GROUP_ID, "default");
props.putIfAbsent(SerdeConfig.REGISTRY_URL, REGISTRY_URL);

//This is the most important configuration for this particular example.
props.putIfAbsent(SchemaResolverConfig.SERIALIZER_DEREFERENCE_SCHEMA, true);


// Create the Kafka producer
Producer<Object, Object> producer = new KafkaProducer<>(props);
```

With this producer we can then send messages to Kafka that adhere to the _citizen_ schema as follows:

```java
for(int idx = 0; idx < 5; idx++) {
    City city=new City("New York",10001);
    city.setQualification(new CityQualification("city_qualification",11));

    CitizenIdentifier identifier=new CitizenIdentifier(123456789);
    identifier.setIdentifierQualification(new IdentifierQualification("test_subject",20));
    Citizen citizen=new Citizen("Carles","Arnal",23,city,identifier,List.of(new Qualification(UUID.randomUUID().toString(),6),new Qualification(UUID.randomUUID().toString(),7),new Qualification(UUID.randomUUID().toString(),8)));

    // Send/produce the message on the Kafka Producer
    ProducerRecord<Object, Object> producedRecord = new ProducerRecord<>(topicName, SUBJECT_NAME, citizen);
    producer.send(producedRecord);
}
```

And consume them with a consumer that is created as follows, instructing the deserializer to use the schema dereferenced with the following configuration property _DESERIALIZER_DEREFERENCE_SCHEMA_:

```java
Properties props = new Properties();

props.putIfAbsent(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, SERVERS);
props.putIfAbsent(ConsumerConfig.GROUP_ID_CONFIG, "Consumer-" + TOPIC_NAME);
props.putIfAbsent(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, true);
props.putIfAbsent(ConsumerConfig.AUTO_COMMIT_INTERVAL_MS_CONFIG, "1000");
props.putIfAbsent(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
props.putIfAbsent(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
props.putIfAbsent(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, JsonSchemaKafkaDeserializer.class.getName());
props.putIfAbsent(SerdeConfig.ARTIFACT_RESOLVER_STRATEGY, SimpleTopicIdStrategy.class.getName());
props.putIfAbsent(SerdeConfig.EXPLICIT_ARTIFACT_GROUP_ID, "default");
props.putIfAbsent(SerdeConfig.VALIDATION_ENABLED, true);

//This is the most important configuration for this example, that instructs the deserializer to fetch the dereferenced schema.
props.putIfAbsent(SchemaResolverConfig.DESERIALIZER_DEREFERENCE_SCHEMA, true);

// Configure Service Registry location
props.putIfAbsent(SerdeConfig.REGISTRY_URL, REGISTRY_URL);
// No other configuration needed for the deserializer, because the globalId of the schema
// the deserializer should use is sent as part of the payload.  So the deserializer simply
// extracts that globalId and uses it to look up the Schema from the registry.

// Create the Kafka Consumer
KafkaConsumer<Long, Citizen> consumer = new KafkaConsumer<>(props);
```

And then consume the messages with the consumer configured above like this:

```java
while (messageCount < 5) {
    final ConsumerRecords<Long, Citizen> records = consumer.poll(Duration.ofSeconds(1));
    messageCount += records.count();
    if (records.count() == 0) {
        // Do nothing - no messages waiting.
        System.out.println("No messages waiting...");
    } else records.forEach(record -> {
        Citizen msg = record.value();
        System.out.println("Consumed a message: " + msg + " @ " + msg.getCity());
    });
}
```


With all of this, instead of doing an HTTP request to get the _citizen schema_, another one to fetch the pointers to the references, and, in this case (this process grows with the hierarchy size), another nine HTTP requests to discover the full hierarchy, a single HTTP request is made that gets the full content of the hierarchy and then uses it to produce/consume messages.

