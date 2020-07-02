---
title: "Integrate Microcks for mocking your API"
layout: guide
permalink: /studio/docs/integrate-microcks-for-mocking-your-api
slug: "integrate-microcks-for-mocking-your-api"
excerpt: "This article describes how to configure Apicurio Studio for integrated publication of API mocks onto Microcks."
hidden: false
guide: true
createdAt: "2019-01-31T13:42:32.080Z"
updatedAt: "2019-10-23T17:07:23.804Z"
---
Apicurio Studio integrates with several other systems to perform certain specific tasks. One of these systems is Microcks, allowing users to transform their API Designs and Examples into live mocks. This operation is called Mocking and is very handy to allow potential consumers of the API to give it a try before it has been fully implemented.

[Microcks](https://microcks.github.io) is an Open Source platform for easily **exposing API and WebServices mocks** using examples coming from different types of assets (OpenAPI specifications, SoapUI projects, Postman collections). It is also able to reuse those assets for doing **contract testing** ; tests that may be included into your CI/CD process.
 
This article assumes you have a running instance of Microcks ([setup](https://microcks.github.io/using/index.html) can be done in many ways depending on your target platform), and focuses on the Apicurio Studio configuration steps necessary to accomplish integration with Microcks.

Before delving into the details, you may want to have a look at this 1min demonstration video.

<figure class="video_container">
  <iframe width="640px" height="480" src="https://www.youtube.com/embed/trU2-CUouYU" frameborder="0" allowfullscreen="true"> </iframe>
</figure>

## 1. Configure Apicurio Studio Backend
Configuring Apicurio Studio for use with a Microcks installation is just a matter of adding some properties to your Apicurio Studio configuration. Apicurio Studio performs all operations via the Microcks API, which is located at a specific endpoint URL. Microcks API is also secured using OpenID and you will need to have a specific service account `clientId` and `clientSecret` in order for Apicurio Studio to access it. By default, Microcks provides a `microcks-serviceaccount` into its Keycloak realm. You'll need to ask your admin for the corresponding secret.

Once you have this information, you'll need to configure the appropriate properties (either as system properties or as environment variables) in Apicurio Studio. Microcks related properties have the `apicurio.hub.microcks` prefix. Here are the 3 properties you'll need to set:

```
-Dapicurio.hub.microcks.api=http://microcks.example.com/api
-Dapicurio.hub.microcks.clientId=microcks-serviceaccount
-Dapicurio.hub.microcks.clientSecret=7deb71e8-8c80-4376-95ad-00a399ee3ca1
```

Alternatively you can configure these three settings via environment variables instead of system properties:

```
$ export APICURIO_MICROCKS_API_URL=http://microcks.example.com/api
$ export APICURIO_MICROCKS_CLIENT_ID=microcks-serviceaccount
$ export APICURIO_MICROCKS_CLIENT_SECRET=7deb71e8-8c80-4376-95ad-00a399ee3ca1
```

> **Customize the URL**
>
> The example settings above assume that your Microcks installation can be found at **microcks.example.com** - obviously you must replace that domain name with the location of your actual installation.

## 2. Configure Apicurio Studio Frontend
In order to have the **API Mocking** panel appear on your API summary page, you'll also need to activate the `microcks` feature for the frontend. This is also done via either system property or environment variable configuration.

To enable Microcks in the UI, set the following system property:

```
-Dapicurio-ui.feature.microcks=true
```

Alternatively you can configure this option by setting the following environment variable:

```
$ export APICURIO_UI_FEATURE_MICROCKS=true
```

> **Restart Apicurio**
>
> In both cases (front end and back end) you will need to restart the Apicurio Studio server for these settings to take effect.
