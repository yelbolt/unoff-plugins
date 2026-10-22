![GitHub package.json version](https://img.shields.io/github/package-json/v/yelbolt/unoff-plugins?filename=penpot%2Fcomponent-handoff%2Fpackage.json&color=informational) ![GitHub last commit](https://img.shields.io/github/last-commit/yelbolt/unoff-plugins?path=penpot%2Fcomponent-handoff&color=informational) ![GitHub](https://img.shields.io/github/license/yelbolt/unoff-plugins?color=informational)

# Component Handoff

Component Handoff documents a Penpot component, or a whole family of variants,
for the developers who will build it: the annotations (redlines, numbered
parts, an exploded view, layout symbols) and the specs that go with them
(tables of values, tokens and styles), drawn straight onto the canvas instead
of leaving engineers to open every layer and read the inspect panel.

A handoff is usually a screenshot with a few hand-drawn redlines, re-edited
every time a value moves. Component Handoff answers the two questions a
screenshot doesn't: **what are the exact values of this component?** and **has
it changed since it was documented?**

## Features

- **Document** a component or a whole family of variants. Select a main
  component, a copy, a board or a variant container and get a documentation
  board beside the design, laid out as a grid of native, editable cards. It
  lives on its own layer, outside the documented board, so it never ends up in
  that board's export.
- **Variants** — every variant of a family with its own property values, one
  card each, optionally narrowed to the variants matching the property values
  you tick. The filter applies to every view.
- **Anatomy** — the component with its numbered parts, then the parts pulled
  apart. One anatomy covers the whole family and lists where each part
  appears. Number only the direct layers or every nested one.
- **Measurements** — size, padding, gap, radius and layout, each on its own
  annotated specimen with a table of values. Layout covers flex and grid
  containers and how each part is sized — **fix**, **fill** or **fit** — shown
  with distinct symbols.
- **Colors & references** — fills, strokes, typography and effects of every
  part, naming the **token** applied, otherwise the **style**, otherwise the
  raw value (token names are read from the file's tokens, Penpot 2.14 and
  later). A value that changes across variants is keyed by the property that
  drives it (`Size: sm 32 · md 40 · lg 48`), never compared with a reference
  variant.
- **Stay up to date** — outdated documentations are flagged when the plugin
  opens and after each save, and updated when you decide to, one by one or all
  at once. Re-generating never creates a duplicate, and the *Generated* tab
  lists and locates every documentation of the page.
- **Annotation style** — color, text size, unit (px or rem), label placement
  and a scale mode: *Design scale* draws at 100%, *Viewport* at the size that
  reads the same on screen at the zoom you had when generating. Changes apply
  as you make them and are saved with the document.

Exporting a PDF and generating code are out of scope, and so are comments —
Penpot already handles those natively.

## Documentation

The full architecture documentation is free and open to everyone:
[uno.ylb.lt/docs](https://uno.ylb.lt/docs).

## Contribution

### Community
<!-- Optional: Add your community/feedback link -->
<!-- Ask questions, submit your ideas or requests on [your-feedback-platform](https://your-feedback-url) -->

### Issues
Have you encountered a bug? Could a feature be improved?
Go to the `Issues` section and browse the existing tickets or create a new one.

### Development
This plugin lives in the [unoff-plugins](https://github.com/yelbolt/unoff-plugins)
monorepo — see its root README for the full picture. The short version:
- Clone the monorepo (or fork it) and run `npm install` at its root
- From the monorepo root: `npm run start -- component-handoff` (delegates to this
  plugin's own `start:dev` below). Go to Penpot, then `Plugins`, and enter
  `http://localhost:4400/manifest.json`
- Or, from this folder directly: `npm run start:dev` — same thing
- Create a `Branch` and open a `Pull Request`
- _Let's do this_

### Building with AI

The architecture of this template is documented as **skills** — free, open source, and read by your AI assistant. What they do not know is your product, and that is what **specs** are for.

```bash
unoff ai            # install skills, rules and agents for your assistant
unoff add specs     # describe a feature: what it does, its rules, the layers it touches
unoff sync specs    # rebuild specs/INDEX.md and point every assistant file at it
```

A spec declares the `layers` it touches (`canvas`, `bridge`, `ui`, `config`, `externals`), which is how your assistant knows which skill files to read before writing a line. Write the spec first, then let it build.

The full architecture documentation is free and open to everyone: [uno.ylb.lt/docs](https://uno.ylb.lt/docs). Guidance tailored to your own plugin — monitoring, analytics, licensing — is the part you unlock: [see what it takes](https://uno.ylb.lt/start).

### Beta test
- Go to the `Actions` section of the monorepo and open the `Build plugins` workflow
- Click `Run workflow`, select a branch, enter `component-handoff` (or `penpot/component-handoff`) as the plugin, and confirm
- Wait a minute, and once finished, download the `plugin-penpot-component-handoff` artifact (a ZIP file containing the plugin, unzipped flat — `manifest.json` at its root)
- You can use a third-party tool to create a local server from the unzipped artifact, such as MAMP, WAMP, LAMP, etc
- Go to Penpot, then `Plugins`, type this url: `http://localhost:{customPort}/manifest.json` and validate
- _Enjoy!_

---

## Built with Unoff

This plugin was built using [Unoff](https://unoff.dev), a powerful framework for creating production-ready Penpot plugins with enterprise-grade features.

Scaffolded with [`@unoff/cli`](https://github.com/yelbolt/unoff-cli) — `npx @unoff/cli create penpot-plugin`

### Technologies & Packages

**UI & Components**
- [@unoff/ui](https://github.com/a-ng-d/unoff-ui) - Pre-built UI components designed for Penpot plugins

**Authentication & Database**
- [Supabase](https://supabase.com) - Backend as a Service for authentication and database

**Licensing & Payments**
- [LemonSqueezy](https://lemonsqueezy.com) - License management and payments

**Monitoring & Analytics**
- [Sentry](https://sentry.io) - Error tracking and performance monitoring
- [Mixpanel](https://mixpanel.com) - Product analytics and user behavior tracking

**Content & Communication**
- [Notion](https://notion.so) - CMS for announcements and onboarding
- Cloudflare Workers - Proxy layer for Notion API (auth + CORS)

**Localization**
- [Tolgee](https://tolgee.io) - Translation management and i18n

**Privacy**
- Cookie consent management for Mixpanel tracking

---

<!-- Optional: Add attribution to libraries or inspirations -->
<!-- ## Attribution
- Technology/Library used thanks to [author](link)
-->

## Support

- [Follow on LinkedIn](https://uno.ylb.lt/network)
- [Support the author](https://uno.ylb.lt/author)
