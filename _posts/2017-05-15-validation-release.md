---
layout: post
title: "Apicurio Studio - Beta Release and Project Naming"
date:   2017-05-15 07:15:00
author: eric_wittmann
categories: release validation
---

Good morning!  I'm pleased to announce a minor Beta release (actually done
Friday of last week).  The new release is:
 
 * [Beta 2 (0.1.1)](https://github.com/Apicurio/apicurio-studio/releases/tag/v0.1.1)

---

Demo Server
----

As with every release, the Live version of the app has been updated, so
you can try out the new functionality straight away.  Simply go here to 
give the new release a try:

* [Try It Live](https://release-apistudio.rhcloud.com/)

New Functionality
----

So what's new in this release?  In addition to a few bug fixes, the primary
new feature is validation of the spec.  As you make changes to the API,
the editor will automatically validate it against the set of rules defined
in the [OpenAPI specification](https://www.openapis.org/).

Any validation problems that are found will be listed in a new section
(automatically hidden) in the master area on the left of the editor.  To
see the list of problems, click on the icon next to the Search field.
Each problem can be selected for more details.

Unfortunately there is currently no connection between a problem and
**where** in the document it came from.  The following features will be
implemented in the next version:

* Highlight the offending item(s) when a problem is selected
* Add a "Go To Node" button in the Problem Detail page that will select the offending item
* Add a "Quick Fix" button in the Problem Detail page when possible

Learn More
----

As always, you can learn more about this (and every other) release on the
project web site and on GitHub.  Here are some links:

* [Project Site](http://www.apicur.io/)
* [Release Notes](https://github.com/Apicurio/apicurio-studio/releases/tag/v0.1.1)
* [Roadmap](http://www.apicur.io/roadmap)
* [Github Org](https://github.com/Apicurio)

As always, happy Designing!
