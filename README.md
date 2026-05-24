# AI 101 Guide

A lightweight static guide to modern AI concepts, tuned for Kindle and e-ink reading while still working well in modern browsers.

## Project Structure

- `index.html` — table of contents and landing page
- `chapters/` — chapter pages and the Doom bonus page
- `style.css` — shared layout, reading, theme, Kindle, and accessibility styles
- `app.js` — theme, Kindle mode, and font scaling controls
- `doom.js` — canvas raycasting game logic
- `genz/` — generated static Gen Z version of the site
- `scripts/generate-genz.mjs` — regenerates static Gen Z pages from the canonical HTML
- `scripts/validate-site.mjs` — local smoke checks for HTML, links, sources, and common markup regressions

## Local Development

Run the site from the project root:

```sh
npm run serve
```

Then open `http://localhost:8000`.

Run the validation checks:

```sh
npm run validate
```

The validation script regenerates the static Gen Z pages first. It uses only Node's standard library and does not require installing dependencies.

## Content Guidelines

- Use plain HTML, not Markdown syntax, inside chapter files.
- Add `Last reviewed: Month YYYY` metadata to technical chapters.
- Keep source lists compact and prefer primary papers, official docs, or official research announcements.
- Preserve Kindle mode: high contrast, no required network assets, large touch targets, and readable serif text.
- Treat the root pages as canonical. Run `npm run generate:genz` after editing content so `genz/` stays in sync.
