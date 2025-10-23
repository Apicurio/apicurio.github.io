---
title: "Getting Started with Apicurio Codegen"
permalink: /codegen/getting-started/
layout: codegen_guide
---

This guide will help you get started with Apicurio Codegen and generate your first Java code from an OpenAPI specification.

## Prerequisites

Before you begin, ensure you have:

- Java 11 or later installed
- Maven 3.6+ (if using the Maven plugin)
- An OpenAPI 3.x specification file

## Using the Maven Plugin

The primary way to use Apicurio Codegen is through the Maven plugin. Add the following to your `pom.xml`:

```xml
<build>
    <plugins>
        <plugin>
            <groupId>io.apicurio</groupId>
            <artifactId>apicurio-codegen-maven-plugin</artifactId>
            <version>${apicurio-codegen.version}</version>
            <executions>
                <execution>
                    <goals>
                        <goal>generate</goal>
                    </goals>
                    <configuration>
                        <spec>${project.basedir}/src/main/resources/openapi.yaml</spec>
                        <output>${project.build.directory}/generated-sources/apicurio</output>
                    </configuration>
                </execution>
            </executions>
        </plugin>
    </plugins>
</build>
```

Then run:

```bash
mvn clean compile
```

The generated code will be available in `target/generated-sources/apicurio`.

## Configuration Options

You can customize the code generation through various configuration options in the plugin:

- **spec**: Path to your OpenAPI specification file (required)
- **output**: Output directory for generated code
- **packageName**: Java package name for generated classes
- **includePatterns**: Comma-separated list of API paths to include
- **excludePatterns**: Comma-separated list of API paths to exclude

## Next Steps

- Learn about [customizing generated code](/codegen/docs#customization)
- Explore [OpenAPI extensions](/codegen/docs#extensions) for advanced configuration
- Check out the [full documentation](/codegen/docs)

## Example Project

For a complete working example, check out the [sample project]({{ site.github_codegen_url }}/tree/main/examples)
in the Apicurio Codegen repository.
