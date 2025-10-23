---
title: "Apicurio Codegen Documentation"
permalink: /codegen/docs/
layout: codegen_guide
---

# Apicurio Codegen Documentation

Complete documentation for Apicurio Codegen, including configuration options, templates, and customization.

## Maven Plugin Configuration

### Basic Configuration

```xml
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
                <template>jax-rs</template>
            </configuration>
        </execution>
    </executions>
</plugin>
```

### Configuration Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `spec` | Path to the OpenAPI specification file | Required |
| `output` | Output directory for generated code | `${project.build.directory}/generated-sources/apicurio` |
| `template` | Code generation template to use | `jax-rs` |
| `packageName` | Java package for generated classes | Derived from spec |
| `includePatterns` | Comma-separated list of paths to include | All paths |
| `excludePatterns` | Comma-separated list of paths to exclude | None |

## Generated Code

Apicurio Codegen produces the following types of artifacts:

### JAX-RS Resources

- JAX-RS resource interfaces with proper annotations
- Implementation stubs for business logic
- Request/response handling

### Data Models

- POJOs for all schema definitions
- Jackson annotations for JSON serialization
- Bean Validation annotations
- Proper type mappings from OpenAPI to Java

### Quarkus Integration

When used in a Quarkus application:
- Quarkus resource classes with CDI support
- Native compilation compatibility
- SmallRye OpenAPI integration
- Automatic health checks

## OpenAPI Extensions {#extensions}

Apicurio Codegen supports OpenAPI specification extensions to customize generated code.

### `x-codegen` Extension

The `x-codegen` extension can be defined at the root level of the OpenAPI document:

```yaml
x-codegen:
  bean-annotations:
    - "@lombok.ToString"
    - annotation: "@lombok.EqualsAndHashCode"
      excludeEnums: true
  contextRoot: "/api/v1"
  suppress-date-time-formatting: false
```

### Bean Annotations

Add custom annotations to generated bean classes:

```yaml
x-codegen:
  bean-annotations:
    - "@lombok.Data"
    - "@lombok.Builder"
```

### Context Root

Set a base path for all JAX-RS resources:

```yaml
x-codegen:
  contextRoot: "/api/v1"
```

This generates:

```java
@Path("/api/v1/users")
public class UserResource {
    // ...
}
```

### Date/Time Formatting

Control how date-time properties are formatted:

```yaml
x-codegen:
  suppress-date-time-formatting: true
```

By default, Apicurio Codegen adds `@JsonFormat` annotations to date-time fields. Set this to `true` to suppress that behavior.

## Customization {#customization}

### Custom Templates

You can create custom templates for code generation. See the [template development guide]({{ site.github_codegen_url }}/blob/main/docs/templates.md)
for details.

### Code Generation Hooks

Implement custom logic during code generation using hooks:

```java
public class MyCodegenHook implements CodegenHook {
    @Override
    public void beforeGeneration(OpenAPI spec) {
        // Custom logic before generation
    }

    @Override
    public void afterGeneration(List<GeneratedFile> files) {
        // Custom logic after generation
    }
}
```

## Integration with Build Tools

### CI/CD Pipelines

Integrate Apicurio Codegen in your CI/CD pipeline by running the Maven plugin during your build:

```yaml
# GitHub Actions example
- name: Build with Maven
  run: mvn clean compile
```

The Maven plugin will automatically run during the build process and generate code as configured in your `pom.xml`.

## Troubleshooting

### Common Issues

**Issue**: Generated code doesn't compile

**Solution**: Ensure your OpenAPI spec is valid and includes all required schema definitions.

---

**Issue**: Custom annotations not appearing in generated code

**Solution**: Verify the `x-codegen.bean-annotations` extension is at the root level of your OpenAPI document.

---

**Issue**: Maven plugin not generating code

**Solution**: Check that the `generate` goal is bound to a lifecycle phase (default is `generate-sources`).

## Additional Resources

- [GitHub Repository]({{ site.github_codegen_url }})
- [Issue Tracker]({{ site.github_codegen_url }}/issues)
- [Example Projects]({{ site.github_codegen_url }}/tree/main/examples)
- [Contributing Guide]({{ site.github_codegen_url }}/blob/main/CONTRIBUTING.md)
