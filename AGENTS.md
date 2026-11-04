# AGENTS.md

Guidance for AI coding agents (and humans) working on the www.apicur.io website.

## What this repository is

The Jekyll source for https://www.apicur.io, the website of Apicurio Registry, a CNCF Sandbox project.
It is published with GitHub Pages from the `main` branch. The `CNAME` is `www.apicur.io`.

## Build and preview

- `./_serve.sh` builds and serves the site in a container at http://localhost:8180.
- Without the script: `docker run --rm -v "$PWD":/srv -w /srv ruby:2.7 sh -c "gem install bundler:2.1.4 && bundle install && bundle exec jekyll build"`.
- Only plugins in the `plugins` list of `_config.yml` are available. GitHub Pages does not run custom Ruby plugins.

## Layout

| Path | Contents | Edit by hand? |
|---|---|---|
| `_pages/` | Site pages (homepage, `/registry/`, `/registry/ai/`, contact, blog index) | Yes |
| `_posts/` | Blog posts, `YYYY-MM-DD-slug.md`, `author` must exist in `_data/authors.json` | Yes |
| `_includes/`, `_layouts/`, `_sass/`, `js/` | Templates, styles and scripts | Yes |
| `registry/docs/` | Antora documentation, published by `apicurio-ci` from the apicurio-registry repo | **No**, changes are overwritten |
| `registry/maven-plugin/` | Generated Maven plugin sites, published by `apicurio-ci` | **No** |
| `_data/registry/`, `_data/registry-v2/` | Release metadata, updated by `apicurio-ci` | **No** |

Fix documentation content, titles, descriptions and canonicals in the
[apicurio-registry](https://github.com/Apicurio/apicurio-registry) repository instead.

## Conventions

- Link to Registry docs through `_includes/registry/_docs-version.html`, which derives the docs branch
  (for example `3.3.x`) from the latest release, rather than hard-coding a version.
- Put styles in `_sass/` rather than inline `style=` attributes.
- Images must be served from `/images/`. The Content Security Policy in `_includes/head.html` only allows
  images from `'self'` and `www.cncf.io`; update it if you add an external origin.
- Scripts in `_includes/head.html` are loaded with `defer`. Do not add inline scripts that use jQuery before it loads.
- Pages that redirect use `redirect_to` and `sitemap: false` in front matter, with no body.
- Every page needs a unique `title` and `description` in front matter; they feed `jekyll-seo-tag`.
- Structured data that `jekyll-seo-tag` does not emit lives in `_includes/structured-data.html`
  (`software_application: true` and `breadcrumbs` front matter).
- Apicurio Studio is deprecated; Data Models, Codegen and Apicurito moved to https://www.apitomy.io.

## Contributing

Every commit needs a DCO sign-off (`git commit -s`). Open a pull request against `main`.
