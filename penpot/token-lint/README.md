![GitHub package.json version](https://img.shields.io/github/package-json/v/a-ng-d/unoff-plugins?filename=penpot%2Ftoken-lint%2Fpackage.json&color=informational) ![GitHub last commit](https://img.shields.io/github/last-commit/a-ng-d/unoff-plugins?path=penpot%2Ftoken-lint&color=informational) ![GitHub](https://img.shields.io/github/license/a-ng-d/unoff-plugins?color=informational)

# Token Lint

<!-- Describe what your plugin does in 2-3 sentences -->
Token Lint is a Penpot plugin that helps you...

<!-- Optional: Add context about why you built this plugin -->
<!-- The idea behind this plugin comes from... -->

## Features

<!-- List the main features of your plugin -->
This plugin allows you to:
- Feature 1 description
- Feature 2 description
- Feature 3 description
- Feature 4 description
- Feature 5 description

## Documentation

<!-- If you have documentation, add the link here -->
<!-- The full documentation is available at [your-docs-url.com](https://your-docs-url.com) -->

## Contribution

### Community
<!-- Optional: Add your community/feedback link -->
<!-- Ask questions, submit your ideas or requests on [your-feedback-platform](https://your-feedback-url) -->

### Issues
Have you encountered a bug? Could a feature be improved?
Go to the `Issues` section and browse the existing tickets or create a new one.

### Development
- Clone this repository (or fork it)
- Install dependencies with `npm install`
- Run `npm run start:dev` to watch in development mode
- Run `npm run start:ext` to run the external services such as the workers ansd the auth lobby
- Go to Penpot, then `Plugins`, type this url: `http://localhost:4400/manifest.json` and validate
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
- Go to the `Actions` sections and access the `Build and Download UI Color Palette` tab
- Click `Run workflow`, then select a branch and confirm
- Wait a minute, and once finished, download the artifact (which is a ZIP file containing the plugin)
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

<!-- Optional: Add support/sponsor links -->
<!-- ## Support
- [Follow on LinkedIn](https://linkedin.com/...)
- [Support the author](https://ko-fi.com/...)
-->
