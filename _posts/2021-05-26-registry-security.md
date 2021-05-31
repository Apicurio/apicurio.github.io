---
layout: post
title: "Securing Apicurio Registry 2.0 using Keycloak"
date:   2021-05-28 12:00:00
author: carles
categories: blog registry security
---


Hey everyone, in Apicurio Registry 2.0.0.Final we've introduced support for some security concepts. In this blog post, I will try to explain them and show you how to configure them.

Core Features
===
Essentially in this blog post, we will cover the following:

* **Authentication based on Keycloak** - optionally protect the registry such that the API requires users to authenticate (BASIC and OAuth supported)
* **Role based authorization** - when authentication is enabled, you can also enable this feature, and users will need to have at least one role of (sr-admin, sr-developer, sr-readonly)
* **Creator-only authorization option** - option to prevent changes to artifacts unless the authenticated user is the user who originally created the artifact


Keycloak Configuration
===

### Authentication based on Keycloak
In order to secure Apicurio Registry you will need a Keycloak server up and running along with some specific configuration.
Essentially, you will need to create a Realm, two clients, and some roles if you want to use them. For the realm, by default Apicurio Registry expects the name `registry`.
As for the clients, by default when security is enabled, Apicurio Registry will expect two with names `registry-api` and `apicurio-registry` but don't worry, you will be able to customize everything by using environment variables.
Below you have the required configuration for the clients.

![Configure Apicurio Registry API_Client](/images/guides/registry-auth-client-api-config.png)

![Configure Apicurio Registry_UI Client](/images/guides/registry-auth-client-ui-config.png)

You will need to pay attention to the configuration, especially, to the access types and the configuration URLs. 
For the API client, make sure to configure it as bearer-only. For the UI one, you will need to configure it as public, to allow users to connect to your UI. 
You will also need to configure Web Origins, you can use `+` to allow Web Origins coming from the redirect URL.    

Now, you will need to tweak a bit the Apicurio Registry configuration to get this to work.

![Configure Apicurio Registry Auth_Properties](/images/guides/registry-auth-properties-config.png)

The first property that you will need to use is `AUTH_ENABLED`. The second one, will be the server url `KEYCLOAK_URL` You will need to set it to true to enable the integration.
We provide some sensible defaults for most of the configuration, but please, note that you can customize most of them by using environment variables.

### Role based authorization

To enable roles, you need to use `ROLES_ENABLED`. 

![Configure Apicurio Registry Auth_Properties](/images/guides/registry-auth-http-paths-config.png)

Of course, if you enable roles in Apicurio Registry, you will also need to create them in Keycloak. 
You need to create them as Realm roles. The default roles expected by Apicurio Registry are `sr-admin`, `sr-developer`, and `sr-readonly`.
When you enable roles, this will result in some HTTP paths and operations available just for certain roles. 
You have the full configuration in the image above but, essentially, there will be some operations like those around rules, logs levels etc that are restricted to the admin role. 
The developer role will be able to perform most of the operations and, obviously, the read-only role will be able just to read artifacts. 

### Creator-only authorization option

Finally, you also have the option to restrict certain operation just to the creator of the artifact. To do so, you need to set to true the environment variable `AUTHZ_ENABLED`. 



Last, but not least, as always, we still have a lot of things to do!  As always, you can see the
stuff we're tracking by viewing the [GitHub issues](https://github.com/Apicurio/apicurio-registry/issues) for the project.

If you find bugs or want to request a new feature, that's a great place to start!