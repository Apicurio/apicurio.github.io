---
layout: post
title: "Apicurio Studio - Account Linking (with Keycloak)"
date:   2017-08-14 12:30:00
author: eric_wittmann
categories: authentication keycloak
---

Today marks the release of [version 0.1.8](https://github.com/Apicurio/apicurio-studio/releases/tag/v0.1.8)
of Apicurio Studio!   The primary accomplishments with this latest release are 
the switch to using [Keycloak](http://www.keycloak.org/) for authentication and 
the addition of Linked Accounts with the application.

---

Keycloak Authentication
===

Previous versions of Apicurio Studio required users to log in to the application
using their GitHub credentials.  This was always meant to be a temporary measure
until we had proper account linking.  The latter is of course necessary so that
we can (eventually) support multiple source platforms such as GitLab and Bitbucket.

Of course, using Keycloak for authentication isn't just a simple switch from
GitHub OAuth - it's really much more useful than that.  Keycloak comes with
a number of features out of the box that can be leveraged to provide an extremely
good authentication experience.  In particular, it supports a variety of social
login options, such as Google, GitHub, and Facebook.  Additionally it is possible
to integrate Keycloak with your company's local LDAP or database authentication
scheme.  This **should** be the final change to Apicurio Studio authentication...

Account Linking
===

Of course, since we're no longer using GitHub to log in, we need some other way
to obtain a GitHub access token that we can use to store the API in a GitHub
repository.  That's where Account Linking comes in.

A new section of the UI has been created called Settings.  Within the Settings
area is an option for Account Linking.  You must go there in order to link 
your GitHub account to your Apicurio Studio account.  Doing this grants 
Apicurio Studio the ability to invoke GitHub APIs on your behalf, including 
storing API designs in GitHub repositories.

This Account Linking process is controlled by Keycloak, but ultimately uses
a standard OAuth flow that results in the creation of a link between Apicurio
Studio and GitHub.  This must be done before any APIs can be created or 
edited and saved.

Conclusion
===

One last thing to note is that the Quickstart is actually much easier to use
now that this change has been made.  There is a Keycloak server available in
the cloud that the Quickstart is configured to use.  As long as you run the
Quickstart on **localhost** and you have an internet connection, you should
be able to simply start up the quickstart and login.  See the Download page
on the Apicurio site for details.  Of course, as always, you can also just
use the [live version](https://release-apistudio.rhcloud.com/studio/).

Other links of note:

* [Project Site](http://www.apicur.io/)
* [Github Org](https://github.com/Apicurio)

As always, happy Designing!
