---
title: "Using Curl with Apicurio Studio"
layout: guide
permalink: /studio/docs/using-curl-with-apicurio-studio
slug: "using-curl-with-apicurio-studio"
excerpt: "Instructions on how to use curl to make authenticated REST calls to the Apicurio Studio back-end API.  This article is intended for developers wishing to contribute features to or integrate with Apicurio Studio."
hidden: false
guide: true
createdAt: "2021-01-22T09:49:02.721Z"
updatedAt: "2021-01-22T09:49:02.341Z"
---
If you are a developer trying to either contribute new back-end features to, or integrate another application with Apicurio Studio, you may find a need to use the `curl` command to send REST requests to the Apicurio Studio back-end API.  However, the Apicurio Studio API requires that all REST calls made to it be authenticated.  By default, the quickstart is protected by Keycloak and does not allow simple BASIC authentication.  Instead, an OAuth Access Token is required.  This article explains how  to retrieve this access token and include it in the REST request.

## Getting Set Up
This article assumes you have the Apicurio Studio quickstart downloaded and running on your localhost.  If you haven't done that yet, go to the [Apicurio Studio Download](http://www.apicur.io/download/) page and grab (and install and run) the latest quickstart.

Additionally, this article assumes you already familiar with the `curl` command usage. The rest of this article deals with how to use `curl` to make authenticated REST calls to Apicurio Studio.

## First Request (System Status)

Let's start by creating a new request to retrieve the Apicurio Studio's system status.  This is a convenient endpoint to use because, like all endpoints, it requires authentication information to work and it simply returns some basic system status information.

The endpoint we're going to use is:

**http://localhost:8080/api-hub/system/status**

By executing the command below you will reach the status API.

```
curl --location --request GET 'http://localhost:8080/api-hub/system/status'
```

Make sure you receive an "Unauthorized" error message from the server.  This of course will occur because we haven't included any authentication credentials in the request!


## Make an Authenticated Request

With the command below the command line will prompt a bearer token you can use in order to authenticate:

```
curl --location --request POST 'http://${KEYCLOAK_URL}}/auth/realms/${KEYCLOAK_REALM}}/protocol/openid-connect/token' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--data-urlencode 'grant_type=password' \
--data-urlencode 'client_id=${KEYCLOAK_CLIENT_ID}' \
--data-urlencode 'username=${KEYCLOAK_USERNAME}' \
--data-urlencode 'password=${KEYCLOAK_PASSWORD}' | jq -r '.access_token'
```

In the table below you can see the default values for the environment variables present in the above command when running the quickstart.

| Key | Value |
|------------|-------|
| KEYCLOAK_URL | https://studio-auth.apicur.io
| KEYCLOAK_CLIENT_ID | apicurio-studio |
| KEYCLOAK_REALM | apicurio-local
| KEYCLOAK_USERNAME | <empty> |
| KEYCLOAK_PASSWORD | <empty> |

Note that you will need to create a user in order to be able to fetch an access token.

## Make an Authenticated Request
Now that you have a valid access token, it's time to apply it to the *system status* request by adding it as a header to the previous command: 

```
curl --location --request GET 'http://localhost:8080/api-hub/system/status' --header 'Authorization: Bearer {BEARER_TOKEN}'
```


## Create Design Example

With the command below you will be able to create a new design using the command line. Note that the API will expect the ${DESIGN_CONTENT} variable value to be a base64 encoded containing the design as a JSON.

```
curl --location --request PUT 'http://localhost:8080/api-hub/designs' \
--header 'Authorization: Bearer ${BEARER_TOKEN}' \
--header 'Content-Type: application/json' \
--data-raw '{"data": "${DESIGN_CONTENT}"}'
```

It is also possible to import a design from a given api using the same endpoint but populating the field `url` instead of `data` with the location of the API design:

```
curl --location --request PUT 'http://localhost:8080/api-hub/designs' \
--header 'Authorization: Bearer ${BEARER_TOKEN} \
--header 'Content-Type: application/json' \
--data-raw '{"url":"https://petstore.swagger.io/v2/swagger.json"}'
```


> **Access Token Longevity**
>
> Note that access tokens are only valid for a few minutes, so you will need to Delete and then re-add the access token when it expires.

