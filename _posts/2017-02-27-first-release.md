---
layout: post
title: "Introducing API Design Studio!"
date:   2017-02-28 02:00:00
author: eric_wittmann
categories: introduction overview
---

Hello everyone and welcome to our new API Design Studio project (brought to you
by the folks who created [apiman](http://www.apiman.io/)).  In this blog post
I'll give an overview of the project, why it exists, and where we're going.
Thanks for reading!

---

Overview
===
While working on the [apiman](http://www.apiman.io/) project, we'd often run into the
Swagger (now [OpenAPI](https://www.openapis.org/)) specification in a variety of 
places.  Within the API Management space, this was typically needed purely for
documentation purposes and located on the Developer Portal.  API documentation is
obviously very useful to customers of your APIs so that they can figure out how
to invoke them.

What quickly became clear is that there was not a high quality, fully open source
designer for creating (or modifying) OpenAPI API definitions.  In fact, most of
the solutions out there (open and closed source) are simply text editors with a 
live-preview pane.  These solutions are often very well done, but they do require
that the user know how to write an API spec using the OpenAPI format.

To address this (hopefully useful) problem space, we created the API Design 
Studio project.  This project is intended to provide a standalone API design 
solution, allowing users to collaboratively create, manage, and edit OpenAPI
definitions without necessarily needing to know the syntax/format.

What we have now
===
As of this writing, we're just about to release a tech preview (first release!)
of the project.  This release is intended to solicit early feedback from anyone
interested.  As always, feedback is welcome - and the earlier in the process
you can make a suggestion, the more likely it is to see the light of day (major
changes/suggestions in particular).

See the [API Design Studio](http://www.apidesigner.org) for more information
about how to download and evaluate the project.  It's already super easy to
download and try!

The Future
===
Over the next few days/weeks, we'll be adding more content to this project site
while at the same time improving the Studio itself.  We're working on putting
together a sensible roadmap, capturing requirements, and designing new 
functionality.  All of that will be rolled out on a hopefully continual basis,
either on the project site (e.g. roadmap) or in GitHub (new features).

Because this project is fully open source, we always love feedback and (even 
better) contributions.  Please give the project a try and let us know what you
think!


