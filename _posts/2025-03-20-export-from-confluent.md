---
layout: post
title: "Exporting from Confluent Schema Registry to Apicurio Registry"
date: 2025-03-20 13:22:00
author: eric
categories: apicurio confluent migration
---

If you're using Confluent Schema Registry and looking to migrate your schemas to **Apicurio Registry**, you're
in luck! The [Confluent Export Tool](https://github.com/Apicurio/apicurio-registry/tree/main/utils/exportConfluent)
provides a simple way to export all schemas from a **Confluent Schema Registry** in a format that is directly
importable into **Apicurio Registry**.

In this blog post, we'll walk through what the tool does, how to use it, and some key considerations for a smooth 
migration.

---

## What is the Confluent Export Tool?

The **Confluent Export Tool** is a utility designed to extract all content from a Confluent Schema Registry instance
and save it into a format that is compatible with Apicurio Registry. The exported data can then be seamlessly imported
into Apicurio using its import capabilities.

### Key Features:
- **Full Export**: Captures all schemas from Confluent Schema Registry.
- **Apicurio Registry Compatible Format**: Structures data to match Apicurio Registry’s import requirements.
- **Easy to Use**: A simple command-line tool requiring minimal setup.

## How to Use the Confluent Export Tool

### Prerequisites
Before using the tool, ensure you have:
- A running **Confluent Schema Registry** instance.
- Java installed (Java 17 or later recommended).
- Network access to the Confluent Schema Registry API.

### Steps to Export Data

1. **Clone the Apicurio Registry Repository**:
   ```bash
   git clone https://github.com/Apicurio/apicurio-registry.git
   cd apicurio-registry
   ```

2. **Build the Tool**:
   Build the project using Maven:
   ```bash
   mvn clean package -DskipTests  -pl utils/exportConfluent -am
   ```

3. **Run the Export Tool**:
   ```bash
   cd utils/exportConfluent
   java -jar target/apicurio-registry-utils-exportConfluent-*-runner.jar <schema-registry-url>
   ```
   Replace `<schema-registry-url>` with the actual URL of your Confluent Schema Registry (e.g., `http://localhost:8081`).

   When complete, a new file called `confluent-schema-registry-export.zip` will be created in the current working directory.

## Importing into Apicurio Registry

Once you have the exported ZIP file, you can import it into Apicurio Registry using the **Apicurio Import API**:

```bash
curl -X POST "http://<registry-url>/apis/registry/v3/admin/import" \
  -H "Accept: application/json" -H "Content-Type: application/zip" \
  --data-binary @confluent-schema-registry-export.zip
```

Alternatively, you could log into the Apicurio Registry UI and import the file using the "*Import from .ZIP*"
option found on the **Explore** tab.

## Considerations and Best Practices

- **Backup Your Data**: Before migration, always make a backup of your Confluent Schema Registry.
- **Confluent Authentication**: If your Confluent Schema Registry requires authentication, configure appropriate credentials for the export tool.
- **Apicurio Authentication**: If your Apicurio Registry instance requires authentication, configure appropriate credentials in the `curl` command, or simply use the Registry UI.

## Conclusion

The **Confluent Export Tool** simplifies migration from **Confluent Schema Registry** to **Apicurio Registry**, making
it easier for organizations to adopt Apicurio’s open-source schema management platform. By following the steps above,
you can efficiently transition your schemas and continue managing them in Apicurio.

For more details, check out the [official GitHub repository](https://github.com/Apicurio/apicurio-registry/tree/main/utils/exportConfluent)
and start your migration today!
