---
layout: post
title: "Apicurio Registry 3.0.0.Final Migration Guide"
date: 2025-03-30 12:00:00
author: carles
categories: registry guide
---

# Migrating Apicurio Registry Configuration from 2.x to 3.x

With the release of Apicurio Registry 3.0.0.Final, we've significantly redesigned the configuration model to improve consistency and maintainability. If you're upgrading from Registry 2.x, you'll need to update your application properties to match the new format.

This guide provides a comprehensive walkthrough of all the changes and offers clear examples to ensure a smooth migration process.

## Key Migration Concepts

Before diving into the specifics, here are the fundamental changes you should be aware of:

- **New namespace**: Most configuration keys now use the `apicurio.` prefix instead of `registry.`
- **Consistent naming**: Property names follow a more structured and logical pattern
- **Database configuration**: Datasource properties have moved from the Quarkus namespace to Apicurio's namespace
- **Better organization**: Related properties are now grouped under common prefixes

## 1. Naming Convention Changes

In Apicurio Registry 3.x, configuration properties now follow a standardized namespace structure under `apicurio.`.

### Example Configuration Changes

| Registry 2.x | Registry 3.x |
|--------------|--------------|
| `registry.auth.enabled` | `quarkus.oidc.enabled` |
| `registry.auth.roles.admin` | `apicurio.auth.roles.admin` |
| `registry.events.kafka.topic` | `apicurio.events.kafka.topic` |
| `registry.rest.artifact.deletion.enabled` | `apicurio.rest.deletion.artifact.enabled` |

### Migration Steps

1. Review all configuration files (`application.properties`, `application.yaml`, deployment files)
2. Replace the `registry.` prefix with `apicurio.` for most properties
3. Note any property name changes beyond just the prefix (like the artifact deletion example above)

## 2. Authentication & Authorization Configuration

Authentication settings in Registry 3.x maintain the same functionality but follow the new naming convention.

### Key Authentication Changes

| Registry 2.x | Registry 3.x |
|--------------|--------------|
| `registry.auth.enabled` | `quarkus.oidc.enabled` |
| `registry.auth.role-source` | `apicurio.auth.role-source` |
| `registry.auth.roles.admin` | `apicurio.auth.roles.admin` |
| `registry.auth.roles.developer` | `apicurio.auth.roles.developer` |
| `registry.auth.roles.readonly` | `apicurio.auth.roles.readonly` |
| `registry.auth.anonymous-read-access.enabled` | `apicurio.auth.anonymous-read-access.enabled` |

### OIDC Configuration Updates

| Registry 2.x | Registry 3.x                   |
|--------------|--------------------------------|
| `registry.auth.oidc.client-id` | `quarkus.oidc.client-id`       |
| `registry.auth.oidc.client-secret` | *Removed*                      |
| `registry.auth.oidc.token-endpoint` | `quarkus.oidc.token-path`      |
| `registry.auth.oidc.auth-server-url` | `quarkus.oidc.auth-server-url` |

### Example: Updating OIDC Authentication Properties

```properties
# Old (Registry 2.x)
registry.auth.enabled=true
registry.auth.role-source=token
registry.auth.roles.admin=admin
registry.auth.oidc.client-id=my-client
registry.auth.oidc.client-secret=secret

# New (Registry 3.x)
quarkus.oidc.enabled=true
apicurio.auth.role-source=token
apicurio.auth.roles.admin=admin
quarkus.oidc.client-id=my-client
quarkus.oidc.client-secret=secret
```

## 3. Kafka & Eventing Configuration

If you're using Kafka-based storage or event notification in your Registry installation, update the following configurations:

### Event Notification Settings

| Registry 2.x | Registry 3.x                  |
|--------------|-------------------------------|
| `registry.events.kafka.topic` | `apicurio.events.kafka.topic` |
| `registry.events.kafka.topic-partition` | *Removed*                     |
| `registry.events.ksink` | *Removed*                     |

### KafkaSQL Storage Settings

| Registry 2.x | Registry 3.x |
|--------------|--------------|
| `registry.kafkasql.bootstrap.servers` | `apicurio.kafkasql.bootstrap.servers` |
| `registry.kafkasql.topic` | `apicurio.kafkasql.topic` |
| `registry.kafkasql.topic.auto-create` | `apicurio.kafkasql.topic.auto-create` |

### Example: Updating Kafka Event Configuration

```properties
# Old (Registry 2.x)
registry.events.kafka.topic=my-registry-events
registry.events.kafka.topic-partition=5

# New (Registry 3.x)
apicurio.events.kafka.topic=my-registry-events
```

### Example: Updating KafkaSQL Storage Configuration

```properties
# Old (Registry 2.x)
registry.kafkasql.bootstrap.servers=kafka:9092
registry.kafkasql.topic=my-registry-storage
registry.kafkasql.topic.auto-create=true

# New (Registry 3.x)
apicurio.kafkasql.bootstrap.servers=kafka:9092
apicurio.kafkasql.topic=my-registry-storage
apicurio.kafkasql.topic.auto-create=true
```

### Kafka Security Configuration

If you're using SASL/SSL for Kafka security:

```properties
# Old (Registry 2.x)
registry.kafkasql.security.protocol=SASL_SSL
registry.kafkasql.security.sasl.mechanism=PLAIN
registry.kafkasql.security.sasl.client-id=my-client
registry.kafkasql.security.sasl.client-secret=my-secret
registry.kafkasql.security.sasl.token.endpoint=http://localhost:8090

# New (Registry 3.x)
apicurio.kafkasql.security.protocol=SASL_SSL
apicurio.kafkasql.security.sasl.mechanism=PLAIN
apicurio.kafkasql.security.sasl.client-id=my-client
apicurio.kafkasql.security.sasl.client-secret=my-secret
apicurio.kafkasql.security.sasl.token.endpoint=http://localhost:8090
```

## 4. UI & API Configuration

The UI and API settings have been reorganized in Registry 3.x for better clarity.

### UI Configuration Updates

| Registry 2.x | Registry 3.x |
|--------------|--------------|
| `registry.ui.contextPath` | `apicurio.ui.contextPath` |
| `registry.ui.features.readOnly` | `apicurio.ui.features.read-only.enabled` |
| `registry.ui.apisUrl` | `apicurio.ui.config.apiUrl` |

### UI Authentication Settings

| Registry 2.x | Registry 3.x                         |
|--------------|--------------------------------------|
| `registry.ui.auth.type` | *Removed, OIDC is always used*       |
| `registry.ui.auth.oidc.client-id` | `apicurio.ui.auth.oidc.client-id`    |
| `registry.ui.auth.oidc.redirect-url` | `apicurio.ui.auth.oidc.redirect-uri` |
| `registry.ui.auth.oidc.scope` | `apicurio.ui.auth.oidc.scope`        |
| `registry.ui.auth.oidc.url` | `apicurio.ui.auth.oidc.url`          |

### API Configuration Changes

| Registry 2.x | Registry 3.x |
|--------------|--------------|
| `registry.api.errors.include-stack-in-response` | `apicurio.api.errors.include-stack-in-response` |

### Example: Updating UI Configuration

```properties
# Old (Registry 2.x)
registry.ui.contextPath=/my-ui
registry.ui.features.readOnly=true

# New (Registry 3.x)
apicurio.ui.contextPath=/my-ui
apicurio.ui.features.read-only.enabled=true
```

### Example: Updating UI Authentication

```properties
# Old (Registry 2.x)
registry.ui.auth.oidc.client-id=my-client
registry.ui.auth.oidc.redirect-url=https://example.com/callback
registry.ui.auth.oidc.scope=openid profile
registry.ui.auth.oidc.url=https://auth.example.com
registry.ui.auth.type=oidc

# New (Registry 3.x)
apicurio.ui.auth.oidc.client-id=my-client
apicurio.ui.auth.oidc.redirect-uri=https://example.com/callback
apicurio.ui.auth.oidc.scope=openid profile
apicurio.ui.auth.oidc.url=https://auth.example.com
apicurio.ui.auth.type=oidc
```

## 5. Storage & Database Configuration

One of the most significant changes in Registry 3.x is the migration of database configuration from the Quarkus namespace to the Apicurio namespace.

### SQL Database Configuration

| Registry 2.x | Registry 3.x |
|--------------|--------------|
| `quarkus.datasource.jdbc.url` | `apicurio.datasource.url` |
| `quarkus.datasource.username` | `apicurio.datasource.username` |
| `quarkus.datasource.password` | `apicurio.datasource.password` |
| `registry.sql.init` | `apicurio.sql.init` |

### Storage Type Configuration

| Registry 2.x | Registry 3.x |
|--------------|--------------|
| `registry.storage.kind` | `apicurio.storage.kind` |

### GitOps Storage Configuration

| Registry 2.x | Registry 3.x |
|--------------|--------------|
| `registry.gitops.repo.origin.uri` | `apicurio.gitops.repo.origin.uri` |
| `registry.gitops.workdir` | `apicurio.gitops.workdir` |

### Example: Updating SQL Database Configuration

```properties
# Old (Registry 2.x)
quarkus.datasource.jdbc.url=jdbc:postgresql://db/registry
quarkus.datasource.username=registry
quarkus.datasource.password=registry
registry.sql.init=true

# New (Registry 3.x)
apicurio.datasource.url=jdbc:postgresql://db/registry
apicurio.datasource.username=registry
apicurio.datasource.password=registry
apicurio.sql.init=true
```

### Example: Updating GitOps Storage Configuration

```properties
# Old (Registry 2.x)
registry.gitops.repo.origin.uri=https://github.com/my-org/registry-data.git
registry.gitops.workdir=/tmp/registry-gitops

# New (Registry 3.x)
apicurio.gitops.repo.origin.uri=https://github.com/my-org/registry-data.git
apicurio.gitops.workdir=/tmp/registry-gitops
```

## Migration Checklist

Follow these steps to ensure a successful migration:

1. **Inventory**: Create a list of all your current Registry 2.x configuration properties
2. **Map**: Match each property to its Registry 3.x equivalent using this guide
3. **Update**: Modify all configuration files with the new property names
4. **Validate**: Check for any remaining or custom properties that might need special handling
5. **Test**: Start Registry 3.x with updated properties in a non-production environment first
6. **Monitor**: Check logs for any warnings about deprecated or invalid properties
7. **Verify**: Ensure all artifacts and configurations load correctly

## Common Migration Issues and Solutions

### Issue: Missing Properties After Migration

**Solution**: Some properties have been renamed beyond just changing the prefix. Review the tables in this guide carefully for exact naming changes. It's also important to check the latest version documentation.

### Issue: Authentication Failures After Migration

**Solution**: Double-check all auth-related properties, especially:
- The role mappings under `apicurio.auth.roles.*`
- OIDC configuration parameters, particularly the redirect URI

### Issue: Database Connection Problems

**Solution**: Ensure all database properties have been migrated from the Quarkus namespace to the Apicurio namespace. Check database logs for specific connection errors.

### Issue: Kafka Configuration Issues

**Solution**: Verify that all Kafka-related properties have been updated, especially security settings if you're using authentication.

## Conclusion

Migrating to Apicurio Registry 3.x involves a significant configuration update, but the new structure provides better organization and consistency. By following this guide, you should be able to migrate your Registry instance with minimal downtime.

If you encounter any issues not covered here, please check the [official documentation](https://www.apicur.io/registry/docs/apicurio-registry/3.0.x/index.html) or reach out to the Apicurio community on [GitHub](https://github.com/Apicurio/apicurio-registry/issues).

Happy migrating!
