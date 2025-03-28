---
layout: post
title: "Apicurio Registry 3.0: Generated API SDKs (by Kiota)"
date: 2025-03-25 16:39:00
author: eric,jakub
categories: registry rest_api sdk
---

In the world of API management, developer experience is paramount. Apicurio Registry 3.0 has
taken a significant leap forward by implementing Kiota for automated SDK generation, making it
easier than ever for developers to interact with the Registry's Core REST API across multiple
programming languages.

---

## What is Kiota?

Kiota is a groundbreaking SDK generation tool developed by Microsoft that simplifies the process
of creating type-safe, lightweight SDKs for REST APIs. Unlike traditional code generation methods,
Kiota focuses on creating lean, efficient client libraries that streamline API interactions.

## Supported Languages in Apicurio Registry 3.0

With the introduction of Kiota, Apicurio Registry now provides automatic SDK generation for four
major programming languages:

1. **Java**: Enabling robust, type-safe API interactions for enterprise and Android applications
2. **TypeScript**: Providing seamless integration for web and Node.js projects
3. **Python**: Supporting data science, automation, and general-purpose application development
4. **Golang**: Offering high-performance SDK generation for cloud-native and systems programming

## Intuitive API Structure: Mirroring the REST API Specification

One of the most powerful features of Kiota-generated SDKs is their intuitive, hierarchical structure
that directly reflects the OpenAPI specification of the Apicurio Registry REST API. This design means
that navigating and using the SDK becomes incredibly straightforward and predictable across all
supported languages.

### **Endpoint Navigation Made Simple**

The SDK's structure allows developers to navigate to specific endpoints using a chained method
approach that closely mirrors the REST API's path structure. This approach provides an incredibly
natural and consistent way of interacting with the API, regardless of the programming language.

Let's look at how you might invoke different endpoints across languages:

1. **Searching Artifacts** - Invoke **GET** on the `/search/artifacts` endpoint
   ```java
   // Java
   List<ArtifactMetaData> results = client.search().artifacts().get();
   ```
   ```typescript
   // TypeScript
   const results = await client.search.artifacts.get();
   ```
   ```go
   // Go
   results, err := client.Search().Artifacts().Get(context.Background(), nil)
   ```

2. **Creating an Artifact** - Invoke **POST** on the `/groups/:groupId/artifacts` endpoint
   ```java
   // Java
   ArtifactMetaData newArtifact = client.groups().byGroupId("my-group").artifacts().post(artifactData);
   ```
   ```typescript
   // TypeScript
   const newArtifact = await client.groups.byGroupId('my-group').artifacts.post(artifactData);
   ```
   ```go
   // Go
   artifactData := models.NewCreateArtifact()
   // Set fields of artifactData...
	newArtifact, err := client.Groups().ByGroupId("my-group").Artifacts().Post(context.Background(), artifactData, nil)
   ```

## Benefits of Kiota-Generated SDKs

### **Consistency Across Languages**
Kiota ensures that the SDK behavior remains consistent across all supported languages, reducing
cognitive overhead for developers working in multi-language environments.

### **Type Safety**
Each generated SDK provides strong type checking, which helps catch potential errors during
compile-time and improves overall code quality.

### **Minimal Dependencies**
Kiota-generated SDKs are designed to be lightweight, with minimal external dependencies, resulting
in faster build times and smaller application footprints.

### **Automatic Updates**
As the Apicurio Registry API evolves, the Kiota-generated SDKs can be quickly regenerated to reflect
the latest API specification.

## Getting Started

To use the new Kiota-generated SDKs, simply:

1. Choose your preferred language
2. Install the SDK via your language's package manager
3. Import the Apicurio Registry client
4. Start interacting with the Registry API immediately

### **Example: Java SDK**

To use the Apicurio Registry Java SDK, first add the dependency to your Maven `pom.xml`:

```xml
<dependency>
    <groupId>io.apicurio</groupId>
    <artifactId>apicurio-registry-java-sdk</artifactId>
    <version>3.0.6</version>
</dependency>
```

Then, you can interact with the Registry API:

```java
import io.apicurio.registry.rest.client.RegistryClient;
import io.apicurio.registry.rest.client.models.SystemInfo;
import io.kiota.http.vertx.VertXRequestAdapter;
import io.vertx.core.Vertx;

public class BlogExampleApp {

    public static void main(String[] args) {
        // URL of the Apicurio Registry server.
        String registryUrl = "http://localhost:8080/apis/registry/v3";

        // The java SDK uses a Vertx based Kiota request adapter.
        Vertx vertx = Vertx.vertx();
        VertXRequestAdapter vertXRequestAdapter = new VertXRequestAdapter(vertx);
        vertXRequestAdapter.setBaseUrl(registryUrl);
        
        // Create the registry client.
        RegistryClient client = new RegistryClient(vertXRequestAdapter);

        // Use the client to get the registry's system info.
        SystemInfo systemInfo = client.system().info().get();
        System.out.println(systemInfo.getName());
        System.out.println(systemInfo.getDescription());
        System.out.println("Version " + systemInfo.getVersion());

        // The vertx instance must be closed.
        vertx.close();
    }

}
```

### **Example: TypeScript SDK**

Install the SDK using npm (or include it in your `package.json`):

```bash
npm install @apicurio/apicurio-registry-sdk
```

Then use it in your TypeScript or JavaScript project:

```typescript
import { ApicurioRegistryClient } from "@sdk/lib/generated-client/apicurioRegistryClient.ts";
import { RegistryClientFactory } from "@sdk/lib/sdk";
import { SystemInfo } from "@sdk/lib/generated-client/models";

async function main() {
    // URL of the registry's v3 REST API
    const apiUrl: string = "http://localhost:8080/apis/registry/v3";
    
    // Create an instance of the client
    const client: ApicurioRegistryClient = RegistryClientFactory.createRegistryClient(apiUrl);
    
    // Get and print the system info from the "/system/info" endpoint
    const info: SystemInfo | undefined = await client.system.info.get();
    console.info(info?.name);
    console.info(info?.description);
    console.info("Version " + info?.version);
}

main();
```

### **Example: Python SDK**

Install the SDK using pip:

```bash
pip install apicurioregistrysdk
```

Use the SDK in your Python project:

```python
import asyncio
from kiota_abstractions.authentication.anonymous_authentication_provider import (
    AnonymousAuthenticationProvider
)
from kiota_http.httpx_request_adapter import HttpxRequestAdapter
from apicurioregistrysdk.client.registry_client import RegistryClient

async def main():
    auth_provider = AnonymousAuthenticationProvider()

    # Create a standard request adapter and set the API URL
    request_adapter = HttpxRequestAdapter(auth_provider)
    request_adapter.base_url = "http://localhost:8080/apis/registry/v3"

    # Create the client
    client = RegistryClient(request_adapter)

    # Get and print the system info from the "/system/info" endpoint
    systemInfo = await client.system.info.get()
    print(systemInfo.name)
    print(systemInfo.description)
    print("Version " + systemInfo.version)

if __name__ == "__main__":
    asyncio.run(main())
```

### **Example: Go SDK**

To use the Apicurio Registry Go SDK, add the dependency to your `go.mod` file:

```
module example

go 1.23.0

toolchain go1.24.1

require (
	github.com/apicurio/apicurio-registry/go-sdk v0.0.0-20241211181742-779f0994a1de // v3.0.6
	github.com/microsoft/kiota-abstractions-go v1.9.1
	github.com/microsoft/kiota-http-go v1.5.1
)

require (
    // Indirect dependencies...
)
```

Then use it in your Go project:

```go
package main

import (
   "context"
   "fmt"
   registry3 "github.com/apicurio/apicurio-registry/go-sdk/pkg/registryclient-v3"
   "github.com/apicurio/apicurio-registry/go-sdk/pkg/registryclient-v3/models"
   kiotaAuth "github.com/microsoft/kiota-abstractions-go/authentication"
   kiotaHttp "github.com/microsoft/kiota-http-go"
)

func initClient(registryUrl *string) *registry3.ApiClient {
   // Compression is not currently supported by the Apicurio Registry server.
   httpClient := kiotaHttp.GetDefaultClient(
      kiotaHttp.NewRetryHandler(),
      kiotaHttp.NewRedirectHandler(),
      kiotaHttp.NewParametersNameDecodingHandler(),
      kiotaHttp.NewCompressionHandlerWithOptions(kiotaHttp.NewCompressionOptions(false)),
      kiotaHttp.NewUserAgentHandler(),
      kiotaHttp.NewHeadersInspectionHandler(),
   )
   adapter, err := kiotaHttp.NewNetHttpRequestAdapterWithParseNodeFactoryAndSerializationWriterFactoryAndHttpClient(
      &kiotaAuth.AnonymousAuthenticationProvider{}, nil, nil, httpClient)
   if err != nil {
      panic("Unexpected error: " + err.Error())
   }
   adapter.SetBaseUrl(*registryUrl)
   return registry3.NewApiClient(adapter)
}

func getServerInfo(client *registry3.ApiClient) {
   res, err := client.System().Info().Get(context.Background(), nil)
   if res != nil {
      fmt.Printf("Server name: %s\n", *res.GetName())
      fmt.Printf("Server version: %s\n", *res.GetVersion())
   } else {
      handleError(err)
   }
}

func handleError(err error) {
   if err == nil {
      panic("No error value")
   }
   if details, ok := err.(*models.ProblemDetails); ok {
      fmt.Printf("Server error: %s\n", *details.GetDetail())
   } else {
      fmt.Printf("Unknown error: %s\n", err.Error())
   }
}

func main() {
   registryUrl := "http://localhost:8080/apis/registry/v3"
   client := initClient(&registryUrl)
   getServerInfo(client)
}
```

See the [full code of the example in our Apicurio Registry repository](https://github.com/Apicurio/apicurio-registry/tree/main/examples/sdk/go-sdk).

## Conclusion

Apicurio Registry 3.0's adoption of Kiota represents a significant advancement in API SDK generation. By providing consistent, type-safe, and easily maintainable SDKs across Java, TypeScript, Python, and Golang, the project has dramatically improved the developer experience.

## Resources

- [Apicurio Registry Documentation](https://www.apicur.io/registry/)
- [Kiota GitHub Repository](https://github.com/microsoft/kiota)

*Stay tuned for more updates and improvements in Apicurio Registry!*
