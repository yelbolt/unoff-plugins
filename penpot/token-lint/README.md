![GitHub package.json version](https://img.shields.io/github/package-json/v/yelbolt/unoff-plugins?filename=penpot%2Ftoken-lint%2Fpackage.json&color=informational) ![GitHub last commit](https://img.shields.io/github/last-commit/yelbolt/unoff-plugins?path=penpot%2Ftoken-lint&color=informational) ![GitHub](https://img.shields.io/github/license/yelbolt/unoff-plugins?color=informational)

# Token Lint

Token Lint audits a Penpot file against its own active design tokens and
tells you exactly where it drifted — a hard-coded color, a nudged spacing, an
overridden instance — then fixes it in one action instead of forcing a
layer-by-layer hunt.

Design tokens answer *what the system says values should be*. Token Lint
answers the two questions token creation/import plugins don't: **where is
that system not applied?** and **how do I fix that without going shape by
shape?**

## Features

- **Audit** a selection, page, or the whole document, scoped to the
  categories you pick (color, spacing, radius, typography, dimension).
  Returns a coverage rate and a deviation list grouped by value — never
  layer by layer — and prioritized as exact match, near match, or orphan.
- **Select on canvas** the layers behind any deviation group directly from
  the report.
- **Apply** a proposed token to a single occurrence, a whole group, or every
  exact match in scope in one action — with a report of what changed and
  what was skipped, and why.
- **Automatic matching** for near/orphan groups, using perceptual color
  distance rather than raw RGB distance. It only ever suggests — nothing is
  written without validating each suggestion individually.
- **Create a token from a deviation** that has no match, into whichever
  active token set you choose, without touching token-set management beyond
  that one action.

Token refactoring (renaming/swapping a token across every reference) and set
hygiene (unused tokens, broken aliases, duplicates) are out of scope for this
plugin — that's Design Token Manager's territory.

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
- From the monorepo root: `npm run dev -- token-lint` to build in watch mode,
  then `npm run serve` in another terminal. Go to Penpot, then `Plugins`,
  and enter `http://localhost:4400/penpot/token-lint/manifest.json`
- Or, from this folder directly: `npm run start:dev`, then the URL is
  `http://localhost:4400/manifest.json` instead (no path prefix — this
  serves only this plugin, not the shared monorepo dist tree)
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
- Click `Run workflow`, select a branch, enter `token-lint` (or `penpot/token-lint`) as the plugin, and confirm
- Wait a minute, and once finished, download the `plugin-penpot-token-lint` artifact (a ZIP file containing the plugin, unzipped flat — `manifest.json` at its root)
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
