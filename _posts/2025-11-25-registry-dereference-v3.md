---
layout: post
title: "Apicurio Registry - JSON Schema dereference"
date:   2025-11-25 16:00:00
author: carles
categories: registry openapi jsonchema asyncapi avro
---

Apicurio Registry allows to manage artifacts with references as shown in the [documentation](https://www.apicur.io/registry/docs/apicurio-registry/3.0.x/getting-started/assembly-managing-registry-artifacts-api.html).
One of the cool features we've added on top of this is the possibility of using a dereference parameter for certain API endpoints that optionally allows you to fetch the full content of an artifact with all the references inlined within the same content.
This is especially useful in certain contexts to reduce the number of HTTP requests in the Kafka Serializers and Deserializers, as you will see in this blog.

---

Intro
===

The code example used for this blog post can be found in the Apicurio Registry [examples](https://github.com/Apicurio/apicurio-registry/blob/main/examples/serdes-with-references/src/main/java/io/apicurio/registry/examples/references/JsonSerdeReferencesExample.java).

One of the limitations of the JSON Schema format is that you cannot discover the full schema from some data that adheres to the schema. That's the main reason why, for this serde, the schema being used has to be registered upfront, and that's what you see
in the code example from line [52 to line 93](https://github.com/Apicurio/apicurio-registry/blob/main/examples/serdes-with-references/src/main/java/io/apicurio/registry/examples/references/JsonSerdeReferencesExample.java#L52-L93).
where the main schema _citizen.json_ is registered with all the references in the hierarchy. Along those lines, a full hierarchy of schemas is registered in Apicurio Registry. The hierarchy can be described as follows and represented as a tree:

```
    citizen
       |
      city
```

Since an image is way better than trying to describe it, this is the structure in the file system:

![Registry (before)](/images/posts/registry-dereference/file-system.png)

In the code example there are
also [java classes](https://github.com/Apicurio/apicurio-registry/tree/main/examples/serdes-with-references/src/main/java/io/apicurio/registry/examples/references/model)
that represent each of the objects we have in the structure, so we can use them when producing Kafka messages. There is
one Java class per each JSON Schema file.

Using the REST API
====

Although the example above uses the Apicurio Registry Java client to register the full hierarchy of schemas, it's also
possible to use the REST API. Note that, in Apicurio Registry v3, when an artifact with references is created, the request body follows a new structured format with `artifactId`, `artifactType`, and `firstVersion` containing the content and references. Here's a set of Curl commands that delivers this result:

First we must start creating the leaves, in this case, the city schema:
```
//Creates the city schema
curl -X POST 'http://localhost:8080/apis/registry/v3/groups/default/artifacts' \
-H 'Content-Type: application/json' \
-d '{
  "artifactId": "city",
  "artifactType": "JSON",
  "firstVersion": {
    "content": {
      "content": "{\"$id\":\"https://example.com/city.schema.json\",\"$schema\":\"http://json-schema.org/draft-07/schema#\",\"title\":\"City\",\"type\":\"object\",\"properties\":{\"name\":{\"type\":\"string\",\"description\":\"The city'\''s name.\"},\"zipCode\":{\"type\":\"integer\",\"description\":\"The zip code.\",\"minimum\":0}}}",
      "contentType": "application/json"
    }
  }
}'
```

Once the city schema is created, we can create the citizen schema that references it:

```
//Creates the citizen schema with reference to city
curl -X POST 'http://localhost:8080/apis/registry/v3/groups/default/artifacts' \
-H 'Content-Type: application/json' \
-d '{
  "artifactId": "citizen",
  "artifactType": "JSON",
  "firstVersion": {
    "content": {
      "content": "{\"$id\":\"https://example.com/citizen.schema.json\",\"$schema\":\"http://json-schema.org/draft-07/schema#\",\"title\":\"Citizen\",\"type\":\"object\",\"properties\":{\"firstName\":{\"type\":\"string\",\"description\":\"The citizen'\''s first name.\"},\"lastName\":{\"type\":\"string\",\"description\":\"The citizen'\''s last name.\"},\"age\":{\"description\":\"Age in years which must be equal to or greater than zero.\",\"type\":\"integer\",\"minimum\":0},\"city\":{\"$ref\":\"city.json\"}}}",
      "contentType": "application/json",
      "references": [
        {
          "name": "city.json",
          "groupId": "default",
          "artifactId": "city",
          "version": "1"
        }
      ]
    }
  }
}'
```

JSON Schema dereference
===

By default, the endpoints that return the content of a particular artifact fetch just the main content, and then you must get the links to the references and,
one by one, do a full scan of the hierarchy to fetch any other sub-schema needed. For instance, the content of the _citizen.json_ schema is the following:

```json
{
  "$id": "https://example.com/citizen.schema.json",
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
      "$ref": "city.json"
    }
  }
}
```

Without dereferencing in order to be able to produce Kafka messages to adhere to this schema, that is already registered in Apicurio Registry, we would need to fetch all the nested references with multiple HTTP requests and then parse all of them while, when dereferencing is used, this is what you get:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Citizen",
  "type": "object",
  "properties": {
    "firstName": {
      "description": "The citizen's first name.",
      "type": "string"
    },
    "lastName": {
      "description": "The citizen's last name.",
      "type": "string"
    },
    "age": {
      "description": "Age in years which must be equal to or greater than zero.",
      "type": "integer",
      "minimum": 0
    },
    "city": {
      "title": "City",
      "type": "object",
      "properties": {
        "zipCode": {
          "description": "The zip code.",
          "type": "integer",
          "minimum": 0
        },
        "name": {
          "description": "The city's name.",
          "type": "string"
        }
      }
    }
  },
  "$id": "https://example.com/citizen.schema.json"
}
```
As you can see, that's the content of the full hierarchy, not just the schema of the _citizen_ element alone. In Apicurio Registry v3, you can get the content dereferenced using the `references=DEREFERENCE` query parameter with the following curl commands:

```
curl 'http://localhost:8080/apis/registry/v3/ids/globalIds/2?references=DEREFERENCE'
curl 'http://localhost:8080/apis/registry/v3/groups/default/artifacts/citizen/versions/1/content?references=DEREFERENCE'
```

---
Referencing options
===

Note that, even though referencing a whole schema definition is the most common use case, it's also possible to reference a single object definition defined in a json file with multiple schemas. For example, we might have the following schema definition:

```json
{
  "$id": "https://example.com/types/all-types.json",
  "$schema": "http://json-schema.org/draft-07/schema#",
  "definitions": {
    "City": {
      "title": "City",
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "description": "The city's name."
        },
        "zipCode": {
          "type": "integer",
          "description": "The zip code.",
          "minimum": 0
        }
      }
    },
    "Identifier": {
      "title": "Identifier",
      "type": "object",
      "properties": {
        "identifier": {
          "type": "integer",
          "description": "The citizen identifier.",
          "minimum": 0
        }
      }
    }
  }
}
```
With definitions for both an identifier and the city objects. Then we might decide that we want to have a separate schema that points to an entire definition, like the one below:

```
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
      "$ref": "types/all-types.json#/definitions/City"
    },
    "identifier": {
      "$ref": "types/all-types.json#/definitions/Identifier"
    }
  },
  "required": [
    "city"
  ]
}
```

Or we might decide to just reference a single property inside a schema definition, like the schema below does:

```
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
      "$ref": "types/all-types.json#/definitions/City/properties/name"
    },
    "identifier": {
      "$ref": "types/all-types.json#/definitions/Identifier"
    }
  },
  "required": [
    "city"
  ]
}
```

The three options work exactly the same way when it comes to registering those schemas using the REST API as if we were registering a schema that references another. First we must register the schema that will be referenced, in this case, the one with the definitions:

```json
curl -X POST 'http://localhost:8080/apis/registry/v3/groups/default/artifacts' \
-H 'Content-Type: application/json' \
-d '{
  "artifactId": "all-types",
  "artifactType": "JSON",
  "firstVersion": {
    "content": {
      "content": "{\"$id\":\"https://example.com/types/all-types.json\",\"$schema\":\"http://json-schema.org/draft-07/schema#\",\"definitions\":{\"City\":{\"title\":\"City\",\"type\":\"object\",\"properties\":{\"name\":{\"type\":\"string\",\"description\":\"The city'\''s name.\"},\"zipCode\":{\"type\":\"integer\",\"description\":\"The zip code.\",\"minimum\":0}}},\"Identifier\":{\"title\":\"Identifier\",\"type\":\"object\",\"properties\":{\"identifier\":{\"type\":\"integer\",\"description\":\"The citizen identifier.\",\"minimum\":0}}}}}",
      "contentType": "application/json"
    }
  }
}'
```

Once this schema has been registered, we can now decide to register two separate schemas, the first one referencing the entire city object:

```
curl -X POST 'http://localhost:8080/apis/registry/v3/groups/default/artifacts' \
-H 'Content-Type: application/json' \
-d '{
  "artifactId": "citizen-object-level",
  "artifactType": "JSON",
  "firstVersion": {
    "content": {
      "content": "{\"$id\":\"https://example.com/citizen.json\",\"$schema\":\"http://json-schema.org/draft-07/schema#\",\"title\":\"Citizen\",\"type\":\"object\",\"properties\":{\"firstName\":{\"type\":\"string\",\"description\":\"The citizen'\''s first name.\"},\"lastName\":{\"type\":\"string\",\"description\":\"The citizen'\''s last name.\"},\"age\":{\"description\":\"Age in years which must be equal to or greater than zero.\",\"type\":\"integer\",\"minimum\":0},\"city\":{\"$ref\":\"types/all-types.json#/definitions/City\"},\"identifier\":{\"$ref\":\"types/all-types.json#/definitions/Identifier\"}},\"required\":[\"city\"]}",
      "contentType": "application/json",
      "references": [
        {
          "name": "types/all-types.json#/definitions/City",
          "groupId": "default",
          "artifactId": "all-types",
          "version": "1"
        },
        {
          "name": "types/all-types.json#/definitions/Identifier",
          "groupId": "default",
          "artifactId": "all-types",
          "version": "1"
        }
      ]
    }
  }
}'
```

And then register the second schema, where just the city name property is referenced:

```
curl -X POST 'http://localhost:8080/apis/registry/v3/groups/default/artifacts' \
-H 'Content-Type: application/json' \
-d '{
  "artifactId": "citizen-property-level",
  "artifactType": "JSON",
  "firstVersion": {
    "content": {
      "content": "{\"$id\":\"https://example.com/citizen.json\",\"$schema\":\"http://json-schema.org/draft-07/schema#\",\"title\":\"Citizen\",\"type\":\"object\",\"properties\":{\"firstName\":{\"type\":\"string\",\"description\":\"The citizen'\''s first name.\"},\"lastName\":{\"type\":\"string\",\"description\":\"The citizen'\''s last name.\"},\"age\":{\"description\":\"Age in years which must be equal to or greater than zero.\",\"type\":\"integer\",\"minimum\":0},\"city\":{\"$ref\":\"types/all-types.json#/definitions/City/properties/name\"},\"identifier\":{\"$ref\":\"types/all-types.json#/definitions/Identifier\"}},\"required\":[\"city\"]}",
      "contentType": "application/json",
      "references": [
        {
          "name": "types/all-types.json#/definitions/City/properties/name",
          "groupId": "default",
          "artifactId": "all-types",
          "version": "1"
        },
        {
          "name": "types/all-types.json#/definitions/Identifier",
          "groupId": "default",
          "artifactId": "all-types",
          "version": "1"
        }
      ]
    }
  }
}'
```

The most relevant part here is the name of the reference (apart from the content itself, of course). The name of the reference is what's going to determine the part of the schema to be used to fill the reference in the main content. In the first case, in the object scenario, the reference name is ``types/all-types.json#/definitions/City`` creating a reference to the ``all-types.json`` file in general, and to the city definition in particular. In the second scenario, the property path is used for the reference name ``types/all-types.json#/definitions/City/properties/name``, creating a reference to the all-types.json file in general, and to the city name in particular.

This is especially important for dereferencing content, since the final result will be different for each schema. In the object scenario, the city object will be inlined within the main schema as follows:

```json
{
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "Citizen",
    "type": "object",
    "properties": {
        "firstName": {
            "description": "The citizen's first name.",
            "type": "string"
        },
        "lastName": {
            "description": "The citizen's last name.",
            "type": "string"
        },
        "identifier": {
            "title": "Identifier",
            "type": "object",
            "properties": {
                "identifier": {
                    "description": "The citizen identifier.",
                    "type": "integer",
                    "minimum": 0
                }
            }
        },
        "city": {
            "title": "City",
            "type": "object",
            "properties": {
                "zipCode": {
                    "description": "The zip code.",
                    "type": "integer",
                    "minimum": 0
                },
                "name": {
                    "description": "The city's name.",
                    "type": "string"
                }
            }
        },
        "age": {
            "description": "Age in years which must be equal to or greater than zero.",
            "type": "integer",
            "minimum": 0
        }
    },
    "required": [
        "city"
    ],
    "$id": "https://example.com/citizen.json"
}
```

Whereas in the second scenario, the property one, just the city name will be inlined:

```
{
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "Citizen",
    "type": "object",
    "properties": {
        "firstName": {
            "description": "The citizen's first name.",
            "type": "string"
        },
        "lastName": {
            "description": "The citizen's last name.",
            "type": "string"
        },
        "identifier": {
            "title": "Identifier",
            "type": "object",
            "properties": {
                "identifier": {
                    "description": "The citizen identifier.",
                    "type": "integer",
                    "minimum": 0
                }
            }
        },
        "city": {
            "description": "The city's name.",
            "type": "string"
        },
        "age": {
            "description": "Age in years which must be equal to or greater than zero.",
            "type": "integer",
            "minimum": 0
        }
    },
    "required": [
        "city"
    ],
    "$id": "https://example.com/citizen.json"
}
```

JSON Schema Kafka Serde dereference
===

Now, in order to make good use of all of this, we can use a Kafka producer. For this example, in the Kafka Producer there is one extremely important property we must set, the schema resolver configuration option _DEREFERENCE_SCHEMA_. This is the option that will instruct the Schema Resolver to use the dereference parameter when fetching the schema from the registry.

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
props.putIfAbsent(SerdeConfig.DEREFERENCE_SCHEMA, true);


// Create the Kafka producer
Producer<Object, Object> producer = new KafkaProducer<>(props);
```

With this producer we can then send messages to Kafka that adhere to the _citizen_ schema as follows:

```java
for (int idx = 0; idx < 5; idx++) {
    // Create the message to send
    Citizen citizen = new Citizen();
    City city = new City();
    city.setZipCode(45676);
    city.setName(UUID.randomUUID().toString());
    citizen.setCity(city);
    citizen.setAge(idx + 20);
    citizen.setFirstName(UUID.randomUUID().toString());
    citizen.setLastName(UUID.randomUUID().toString());

    // Send/produce the message on the Kafka Producer
    ProducerRecord<Object, Object> producedRecord = new ProducerRecord<>(topicName, SUBJECT_NAME, citizen);
    producer.send(producedRecord);
}
```

And consume them with a consumer that is created as follows, instructing the deserializer to use the schema dereferenced with the following configuration property _DEREFERENCE_SCHEMA_:

```java
Properties props = new Properties();

props.putIfAbsent(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, SERVERS);
props.putIfAbsent(ConsumerConfig.GROUP_ID_CONFIG, "Consumer-" + TOPIC_NAME);
props.putIfAbsent(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "true");
props.putIfAbsent(ConsumerConfig.AUTO_COMMIT_INTERVAL_MS_CONFIG, "1000");
props.putIfAbsent(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
props.putIfAbsent(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
props.putIfAbsent(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, JsonSchemaKafkaDeserializer.class.getName());
props.putIfAbsent(SerdeConfig.ARTIFACT_RESOLVER_STRATEGY, SimpleTopicIdStrategy.class.getName());
props.putIfAbsent(SerdeConfig.EXPLICIT_ARTIFACT_GROUP_ID, "default");
props.putIfAbsent(SerdeConfig.VALIDATION_ENABLED, true);

//This is the most important configuration for this example, that instructs the deserializer to fetch the dereferenced schema.
props.putIfAbsent(SerdeConfig.DEREFERENCE_SCHEMA, true);

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


Instead of doing an HTTP request to get the _citizen schema_, another request to fetch the pointers to the references, and additional requests to discover the full hierarchy, a single HTTP request gets the full content of the hierarchy and then uses it to produce/consume messages.

