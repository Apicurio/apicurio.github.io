---
title: "Running Apicurio Studio on OpenShift (or Docker?)"
layout: guide
permalink: /studio/docs/running-apicurio-on-openshift-or-docker
slug: "running-apicurio-on-openshift-or-docker"
excerpt: "This article discusses how to deploy and run Apicurio Studio in an environment like OpenShift.  This is also a good place to go for an explanation of the architecture of the application."
hidden: false
guide: true
createdAt: "2018-09-19T18:21:00.924Z"
updatedAt: "2019-04-11T11:04:03.347Z"
---
The fastest way to get started with Apicurio Studio is to download the official Quickstart and simply fire it up.  However, if you're serious about running a local instance of Apicurio Studio you're likely going to want to run it in some sort of container based platform like OpenShift.  For that, you'll want a better understanding of the architecture and how to split things up in a way that makes sense for a production deployment.

## What's Wrong With the Quickstart?
So you may be asking why you can't just deploy the full Quickstart as a pod in OpenShift and call it a day.  I guess there's no reason that wouldn't work, but the Apicurio Studio Quickstart is very much designed as an evaluation deployment, not really intended for deployment in production.  It would probably work, but it's not a very good unit of scaling, which is an important consideration when deploying in a container environment.

## Apicurio Studio Architecture Explained
This section attempts to provide a good overview of the architecture of the application from a devops perspective.

There are three runtime components in Apicurio Studio and one Keycloak authentication server.  This article will focus on the three core Apicurio Studio components and will assume that you have a Keycloak server running somewhere with appropriate external access (has a public route).  

### The (3) Apicurio Studio components

  * **apicurio-studio-api** - the RESTful API used by the user interface when performing **most** functions.
  * **apicurio-studio-ws** - a WebSocket based API used only by the Apicurio Studio Editor to provide real-time collaboration with other users.
  * **apicurio-studio-ui** - the Angular 5+ based Apicurio Studio user interface.  Requires authentication but otherwise basically just serves the UI application's HTML, JS, and CSS.

### Other Components/Requirements

* **SQL Database** - the Apicurio Studio API and WebSocket components both must be connected to the same SQL database instance.  Apicurio Studio supports H2, Postgresql, and MySQL.
* **Keycloak Authentication Server** - the Apicurio Studio API and UI components must both be configured to use the same Keycloak authentication server.  The Apicurio Studio WebSocket component does not share this requirement

### Component Interactions

Each of the components interacts with zero or more of the others in a variety of ways.  Let's explore these interactions.

* **SQL Database** - must be accessible by Apicurio Studio API and Apicurio Studio WS (but **not** UI).  It does not need to be accessible externally.
* **Keycloak Authentication Server** - must be accessible externally (by the user's browser).  Additionally it must be configured with the public route for Apicurio Studio UI.  Explaining the configuration of Keycloak is out of scope for this article.
* **apicurio-studio-api** - must be accessible externally by the user's browser and also must be accessible by the Apicurio Studio UI server component (the UI component will occasionally need to make HTTP requests directly to the API component).  The API component will also need to make direct HTTP calls to Keycloak.  And of course the API must be able to access the SQL database.
* **apicurio-studio-ws** - needs to be able to access the SQL database. Must be accessible by the user's browser.
* **apicurio-studio-ui** - must be accessible by the user's browser.  Must be configured with the public URLs of the API and WebSocket components.  Must be able to directly **access** the API component via HTTP.

### Component Docker Images

You may be wondering where you can find Docker images for each of the Apicurio Studio components.  Here are some helpful links to Docker Hub:

* [Apicurio Studio API](https://hub.docker.com/r/apicurio/apicurio-studio-api/)
* [Apicurio Studio WebSocket](https://hub.docker.com/r/apicurio/apicurio-studio-ws/)
* [Apicurio Studio UI](https://hub.docker.com/r/apicurio/apicurio-studio-ui/)

> **Docker Image Documentation**
>
> Usage and startup options are (hopefully) well documented in Docker Hub for each of the images listed above.  Have a look at each image to learn more about how to configure it and start it up.

*Starting up a docker image for the SQL database and Keycloak authentication servers are topics that are out of scope for this article.* 

## Architecture Diagram
They say that a picture is worth a thousand words, so let's give an architecture diagram a shot.

![Architecture Diagram](/images/guides/arch-diagram.png)

## Installing in OpenShift
Now that you have an understanding of all the pieces, let's explore how to install Apicurio Studio in OpenShift.  Fortunately, we have a template file that can hopefully act as a starting point for this.  It is recommended that you [download the OpenShift Template](https://github.com/Apicurio/apicurio-studio/blob/master/distro/openshift/apicurio-template.yml) and then modify it to suit your environment.

Anatomy of the OpenShift Template
---

The Apicurio Studio OpenShift template contains the following entities/objects:

### Image Streams
* Apicurio Studio Auth (Keycloak)
* Apicurio Studio API
* Apicurio Studio WebSocket
* Apicurio Studio UI

### Persistent Volumes
* Keycloak Data Storage
* PostgreSQL Data Storage

### Secrets
* PostgreSQL username/password
* Keycloak username/password

### Services
* PostgreSQL Service (5432)
* Apicurio Studio API Service (8080)
* Apicurio Studio WebSocket Service (8080)
* Apicurio Studio UI Service (8080)

### Deployment Configurations
* PostgreSQL
* Apicurio Studio Auth (Keycloak)
* Apicurio Studio API
* Apicurio Studio WebSocket
* Apicurio Studio UI

### Routes
* Apicurio Studio Auth (Keycloak) Route
* Apicurio Studio API Route
* Apicurio Studio WebSocket Route
* Apicurio Studio UI Route

The template includes a number of parameters that can be filled out when installing it in OpenShift.  Check the end of the template file to see a list of these parameters.

Production Considerations
---
All of the objects/entities found in the template are necessary for Apicurio Studio to properly function, and using the template as-is **should** result in a functioning application.  However, there are some changes that you will likely want to make when designing a production deployment of Apicurio.

### Keycloak
The Apicurio Studio OpenShift template includes a custom-configured version of Keycloak because it is required for Apicurio Studio to function.  However, this version of Keycloak is a convenience only - and you should check with the Keycloak project if you want a truly production quality Keycloak instance deployed to OpenShift.

### SQL Database(s)
Apicurio Studio's API and WebSocket components require a shared SQL database.  The template provides a PostgreSQL database for this purpose, but it is not necessarily one that is configured to hold up well in production.  You may want to stand up a PostgreSQL (or MySQL) database using best practices defined within the database and/or OpenShift community.

Also note that when deployed in production, the Keycloak server will need its own SQL database instance.  A Keycloak SQL database is **not** currently installed as part of the Apicurio Studio OpenShift template.  Instead, Keycloak is configured to work with an embedded H2 database - another reason you should be diligent about deploying Keycloak properly in production.

### External Routes
It is very important that all of the main components (Auth, API, WS, and UI) have external routes so that the user can access each component separately from a browser.