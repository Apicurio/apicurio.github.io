---
layout: post
title: "Securing Apicurio Registry 2.4.x using Azure Active Directory"
date:   2023-07-13 12:00:00
author: carles
categories: blog registry security
---

Hey everyone, in recent Apicurio Registry versions we've introduced support for securing the application using different OIDC servers, and not just Keycloak. In this blog post, I will explain how to configure the application to secure it using Azure Active Directory.

Core Features
===
Essentially in this blog post, we will cover the following:

* **Authentication based on Azure Active Directory** - optionally protect the registry such that the registry API and web console requires users to authenticate (OAuth and Authorization Code Flow supported)


Azure Active Directory Configuration
===

### Authentication based on Azure AD
In order to secure Apicurio Registry you will need a valid directory in Azure and some specific configuration (described below).
Essentially, you must register the Apicurio Registry application in the Azure portal. Log in to the [Azure Portal](https://portal.azure.com). You can use your personal email address or your GitHub account to log in.
After logging in, navigate to the Azure Active Directory control panel by using the menu in the top-left corner. It should look like this:

![Azure AD Portal](/images/guides/azure-ad-portal.png)

Let's dig into the Azure AD configuration for your Apicurio Registry deployment. Navigate to Manage/App registrations in the menu on the left. Select New registration, and fill inn the form. Use apicurio-registry-example as the application name. We'll also allow users from any organizational directory to log in.

![Azure AD App Registration](/images/guides/azure-ad-register-application.png)

Important: Register the host of the server hosting your Apicurio Registry application as a redirect URI. As part of the logon process, users will be redirected from our application to Azure AD for authentication. We want to send them back to our application afterwards. Azure AD will not allow any redirect URLs that are not registered. We'll come back to this later.

Click register. You should now be able to find the app registration by navigating to Manage/App registrations in the menu on the left.

![Azure AD App Registered](/images/guides/azure-ad-app-registered.png)

We can now find the parameters we need to set up Apicurio Registry with Azure AD OIDC. Click on apicurio-registry-example to display its details:

![Azure AD App Details](/images/guides/azure-ad-app-details.png)

Navigate to the Manage/Authentication to configure the application with the redirect URLs and token as follows:

![Azure AD App Details](/images/guides/azure-ad-app-configuration.png)

Essentially, for configuring Apicurio Registry with Azure AD you must configure the following environment variables in Apicurio Registry using the Azure AD Application ID and the Azure AD Directory ID (among a few Apicurio Registry specific configurations):

```
REGISTRY_AUTH_ENABLED=true
KEYCLOAK_API_CLIENT_ID=459569e9-c5f7-410a-a6e7-8db28d7e3647 #Azure AD > Admin > App registrations > Your app > Application (client) ID
REGISTRY_UI_AUTH_TYPE=oidc
REGISTRY_AUTH_URL_CONFIGURED=https://login.microsoftonline.com/6f8ef45b-456d-49e3-b5ba-1f6fe4c0fb78/v2.0 #Azure AD > Admin > App registrations > Your app > Directory (tenant) ID
REGISTRY_OIDC_UI_CLIENT_ID=459569e9-c5f7-410a-a6e7-8db28d7e3647 #Azure AD > Admin > App registrations > Your app > Application (client) ID
CORS_ALLOWED_ORIGINS=https://test-registry.com #The host for your Apicurio Registry deployment
REGISTRY_OIDC_UI_REDIRECT_URL=https://test-registry.com/ui/ #The host for your Apicurio Registry console
ROLE_BASED_AUTHZ_ENABLED=true
QUARKUS_OIDC_ROLES_ROLE_CLAIM_PATH=roles
```

### Role based authorization

To enable roles, you need to set the `ROLE_BASED_AUTHZ_ENABLED` property to `true`.

Of course, if you enable roles in Apicurio Registry, you will also need to create them in Azure AD.
You must create them as Application roles. The default roles expected by Apicurio Registry are `sr-admin`, `sr-developer`, and `sr-readonly`.

Another extremely important configuration is `QUARKUS_OIDC_ROLES_ROLE_CLAIM_PATH=true` since Azure AD stores the roles in a claim called `roles`.

Last, but not least, we still have a lot of things to do!  As always, you can see the
stuff we're tracking by viewing the [GitHub issues](https://github.com/Apicurio/apicurio-registry/issues) for the project.

If you find bugs or want to request a new feature, that's a great place to start!
