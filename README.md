# unoff-plugins

Monorepo of plugins built with the [UNOFF](https://unoff.dev) framework, organized by design tool platform.

```
unoff-plugins/
├── penpot/
│   ├── token-lint/
│   └── calendar-and-schedule-generator/
├── figma/    (ready, empty until the first plugin lands)
├── framer/   (ready, empty)
├── sketch/   (ready, empty)
├── scripts/  build.mjs, changelog.mjs — the tooling behind the commands below
└── dist/     shared build output: dist/<platform>/<name>/ (gitignored)
```

Each plugin is a normal npm workspace: its own `package.json`, its own build
scripts, its own `README.md` with plugin-specific setup. This root README only
covers what's common across all of them.

**This monorepo is specific to this project.** UNOFF as a framework scaffolds
one plugin per its own standalone repo, each with its own independent release
lifecycle — that's still the default `@unoff/cli` produces. Bundling several
plugins into one repo with a shared build/CI setup is a deliberate choice made
here, not how the framework works in general.

## Getting started

```bash
npm install                 # installs every plugin's dependencies from the root
```

Each plugin also needs its own `.env.local` and `.env.sentry-build-plugin` for
local development — see that plugin's own README for which keys it expects.

## Commands

Run from the repo root. Every one takes the same optional target after `--` —
think of it as a flag choosing which plugin(s) the command applies to. Pass
one, or omit it entirely:
- omitted → every plugin, every platform
- a platform name (`penpot`) → every plugin under that platform
- a bare plugin name (`token-lint`) → just that plugin, resolved automatically
  wherever it lives
- an explicit `platform/name` → same, disambiguated (only needed if a bare
  name exists under more than one platform)

```bash
npm run build                        # production build, every plugin
npm run build -- penpot              # production build, every plugin under penpot/
npm run build -- token-lint          # production build, just that plugin
npm run build -- penpot/token-lint   # same, explicit path

npm run dev -- token-lint            # same targeting, but development mode (watches for changes)

npm run serve                        # serves dist/ on :4400 with CORS, so
                                      # http://localhost:4400/penpot/token-lint/manifest.json
                                      # resolves exactly like it will on GitHub Pages

npm run build:penpot / dev:penpot    # shorthands for `-- penpot`
npm run start:penpot                 # dev:penpot + serve together
```

Every build — whichever way it's invoked — lands in the same
`dist/<platform>/<name>/` tree; each plugin's `vite.config.ts` resolves its
own `outDir` there. That's also exactly the shape the CI deploys to GitHub
Pages, so what you test locally with `npm run serve` is what ships.

Each plugin's own scripts (`build:prod`, `typecheck`, `lint`, `format`, ...)
still work unchanged from inside its own folder — the root commands are a
thin pass-through, not a replacement.

## Adding a new plugin

1. Scaffold it under the right platform folder with `npx @unoff/cli create ...`.
2. If it's the first plugin on a brand new platform, add that platform's
   glob to `workspaces` in the root `package.json`.

Nothing else — CI (`build.yml`, `release.yml`) auto-detects any plugin
folder with a `package.json`, and its build output lands in the shared
`dist/` tree automatically.

## CI and releases

- **`build.yml`** validates every plugin touched by a push or PR to `dev`.
- **`release.yml`** runs when a `release//...` branch's PR merges into `dev`
  (or manually via `workflow_dispatch`). For each plugin it built: creates a
  GitHub Release (its notes pulled from that plugin's own `CHANGELOG.md`,
  see below) and deploys to GitHub Pages under `/<platform>/<name>/`,
  without touching any other plugin already published there.
- Secrets shared by every plugin (auth/CORS worker URLs, Notion, Tolgee...)
  are repository-level secrets. Secrets that differ per plugin (Sentry,
  Mixpanel, LemonSqueezy...) live in that plugin's own GitHub Environment
  (`penpot-token-lint`, `penpot-calendar-and-schedule-generator`, ...),
  which overrides the repository-level value of the same name.

## Changelog

Add entries to a plugin's `[Unreleased]` section in its own `CHANGELOG.md` as
you work — `release.yml` pulls that section into the GitHub release notes and
bumps the file automatically when the plugin ships. The root itself is just
where commands are run from, not a released thing — it has no changelog of
its own.

## Support

- [Follow on LinkedIn](https://uno.ylb.lt/network)
- [Support the author](https://uno.ylb.lt/author)
