---
layout: post
title: "Red Hat middleware team transitioning to IBM"
date:   2025-03-03 15:00:00
author: eric
categories: apicurio ibm redhat
---

Hey everyone - I would like to provide an update to the Apicurio community regarding
the recent announcement from Red Hat:

* [Evolving our middleware strategy](https://www.redhat.com/en/blog/evolving-our-middleware-strategy)

In this post I will try to provide some context and explain how this change might 
impact us.

---

# Evolving middleware strategy at IBM/Red Hat (tldr)
As some of you may know, the Apicurio community is sponsored by Red Hat.  Most
of the core contributors are Red Hat employees, starting from long before we
were acquired by IBM back in 2019.

_(I myself have been a Red Hat employee since 2012)_

Red Hat has multiple engineering teams, including (but not limited to):

* Operating System (Red Hat Enterprise Linux)
* Kubernetes (Red Hat OpenShift)
* Ansible (Red Hat Ansible Automation Platform)
* Middleware (JBoss, Quarkus, OpenJDK)

**The team responsible for the middleware projects (such as JBoss, Quarkus, OpenJDK,
Kafka, Camel) is being transitioned from Red Hat to IBM.**

## Why the change?
Both Red Hat and IBM have made investments in Java middleware.  This transition is an 
opportunity to join forces, especially at a time when much attention is being directed 
toward AI and other strategic initiatives.

Given its more limited resources, Red Hat has not been able to focus as much on
expanding our middleware products as much as they deserve.  Moving these teams to
IBM will allow us to refocus, grow, and collaborate more effectively.

## What does this mean for Apicurio?
We don't expect any changes, and I'm guessing that if I didn't post anything here
most of the Apicurio community would never know about the transition at all.  I am
sharing this because I believe transparency is important.

The good news for Apicurio is that there are no competing IBM products.
In fact, Apicurio Registry is already included as part of the IBM Event Streams
product.  My **expectation** is that Apicurio Registry will continue as normal.
My **hope** is that we can revitalize the Apicurio Studio project by finding it 
a new home within IBM’s broader portfolio.

## What's next?
We're working to release **Red Hat build of Apicurio Registry 3.0 GA** before
the transition.  This means a **3.0.7 release** of `apicurio-registry` upstream.  After
that we'll continue evolving both Registry and Studio in exciting new ways!

We highly value our community's contributions.  If you have any questions or
concerns, please chat with us on Zulip or open a discussion on GitHub.

**Cheers!**
