# Unoff Plugins

Monorepo of plugins built with the [Unoff](https://unoff.dev) framework, organized by design tool platform.

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

## Plugins

| Plugin | Platform | Status |
| --- | --- | --- |
| [Token Lint](penpot/token-lint) | Penpot | 🧪 Testing |
| [Calendar and Schedule Generator](penpot/calendar-and-schedule-generator) | Penpot | 🚧 Work in progress |

**This monorepo is specific to this project.** Unoff as a framework scaffolds
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

Three contexts, each a pure pass-through to what a plugin's own
`package.json` already defines — nothing root-level reimplements a plugin's
build or dev logic:

- **`npm run start -- <plugin>`** — build (dev mode, watching) *and* serve,
  together. Delegates entirely to that plugin's own `start:dev` (build watch
  + its own `vite preview` server on `:4400`) — identical to running it from
  inside `penpot/<plugin>/` directly. Takes exactly one plugin: its preview
  server owns a fixed port, so more than one at once would collide.
- **`npm run dev [-- target]`** — build only, dev mode (watches for
  changes), no server. Runs that plugin's own `build` script.
- **`npm run build [-- target]`** — build only, production mode. Runs that
  plugin's own `build:prod` script.

`dev` and `build` take an optional target after `--` — a flag choosing which
plugin(s) to apply to. Pass one, or omit it entirely:
- omitted → every plugin, every platform
- a platform name (`penpot`) → every plugin under that platform
- a bare plugin name (`token-lint`) → just that plugin, resolved automatically
  wherever it lives
- an explicit `platform/name` → same, disambiguated (only needed if a bare
  name exists under more than one platform)

`start` only ever takes a single plugin — there's no "every plugin" form,
since it starts a server.

```bash
npm run build                        # production build, every plugin
npm run build -- penpot              # production build, every plugin under penpot/
npm run build -- token-lint          # production build, just that plugin
npm run build -- penpot/token-lint   # same, explicit path

npm run dev -- token-lint            # same targeting, development mode

npm run build:penpot / dev:penpot    # shorthands for `-- penpot`

npm run start -- token-lint          # build (dev) + serve, one plugin
```

Whichever way a build is invoked, it lands in the same
`dist/<platform>/<name>/` tree — each plugin's `vite.config.ts` resolves its
own `outDir` there — also exactly the shape CI deploys to GitHub Pages.

Each plugin's own scripts (`build:prod`, `start:dev`, `typecheck`, `lint`,
`format`, ...) still work unchanged from inside its own folder.

## Adding a new plugin

1. Scaffold it under the right platform folder with `npx @unoff/cli create ...`.
2. If it's the first plugin on a brand new platform, add that platform's
   glob to `workspaces` in the root `package.json`.

Nothing else — CI (`build.yml`, `release.yml`) auto-detects any plugin
folder with a `package.json`, and its build output lands in the shared
`dist/` tree automatically.

## CI and releases

- **`build.yml`** validates every plugin touched by a push or PR to `dev` —
  no release, just a build.
- **`release.yml`** is what actually ships a plugin. See below for the
  process, and [Secrets and variables](#secrets-and-variables) for how it's
  configured per plugin.

### Releasing a plugin

1. Work on a branch, adding entries to that plugin's own `CHANGELOG.md`
   under `[Unreleased]` as you go (see [Changelog](#changelog)), and get it
   merged into `dev`.
2. From the repo root, run the release script with the plugin and the new
   version:

   ```sh
   npm run release -- token-lint minor          # or patch / major
   npm run release -- penpot/token-lint 0.5.0   # or an explicit version
   ```

   The plugin is a bare name (`token-lint`) or `platform/name` when the same
   name exists on several platforms. `patch`/`minor`/`major` are computed
   from the version currently on `origin/dev`. The script:
   - checks that the working tree is clean, that the version is newer than
     the one on `origin/dev`, that the tag doesn't exist yet, and that
     `[Unreleased]` isn't empty;
   - creates `release/<plugin>-<version>` from `origin/dev` (or reuses it if
     it already exists), e.g. `release/token-lint-0.5.0`;
   - sets the version in the plugin's `package.json` and in `package-lock.json`;
   - moves `[Unreleased]` to `[<version>] - <date>` in the plugin's
     `CHANGELOG.md`;
   - commits it as `chore(release): <platform>/<plugin> v<version>`.

   Options: `--dry-run` prints the plan and changes nothing, `--push` also
   pushes the branch and opens the PR into `dev` (needs the `gh` CLI), and
   `--force` allows an empty `[Unreleased]`. One run releases one plugin: to
   release several, run it once per plugin and merge each PR.
3. Merge the PR into `dev` (if you didn't use `--push`, push the branch and
   open it yourself; the `release/` prefix is what `release.yml`'s trigger
   checks for). `release.yml` fires, detects which plugin(s) changed in that
   PR, and for each one:
   - builds it in production mode
   - takes the `[<version>]` section of its `CHANGELOG.md` and creates a
     GitHub Release tagged `<platform>-<name>-v<version>`, using that
     section as the release notes
   - uploads the build as a zip release asset
   - deploys the build to GitHub Pages at `/<platform>/<name>/` — the
     static files that URL serves are now updated, without touching any
     other plugin already published there

The changelog is bumped in the release PR itself, so what gets reviewed is
what gets released and CI never commits back to `dev`.

`release.yml` can also be triggered manually (`workflow_dispatch`, same
plugin/platform/bare-name targeting as the local commands) to release
outside the branch/PR flow. If that plugin's changelog was never bumped, the
notes fall back to its `[Unreleased]` section.

### Secrets and variables

Every plugin's own GitHub Environment (Settings → Environments →
`penpot-token-lint`, `penpot-calendar-and-schedule-generator`, ...) holds
everything that plugin's build needs — there's nothing at the repository
level. Each plugin's config is fully self-contained instead of partly
depending on shared repo state, even where two plugins currently happen to
use the same value.

Within an environment, split by kind:
- **Secrets** (masked in logs, `secrets.*` in the workflow) — keys and
  tokens: `VITE_SUPABASE_PUBLIC_ANON_KEY`, `VITE_MIXPANEL_TOKEN`,
  `VITE_NOTION_API_KEY`, `VITE_LEMONSQUEEZY_API_KEY`,
  `VITE_TOLGEE_API_KEY`, `SENTRY_AUTH_TOKEN`.
- **Variables** (plain text, `vars.*`) — everything else: URLs, IDs,
  org/project names (`VITE_SUPABASE_URL`, `VITE_SENTRY_DSN`,
  `VITE_AUTH_WORKER_URL`, `VITE_AUTH_URL`, `VITE_ANNOUNCEMENTS_WORKER_URL`,
  `VITE_CORS_WORKER_URL`, `VITE_NOTION_ANNOUNCEMENTS_ID`,
  `VITE_NOTION_ONBOARDING_ID`, `VITE_LEMONSQUEEZY_URL`, `VITE_TOLGEE_URL`,
  `SENTRY_ORG`, `SENTRY_PROJECT`).

## Changelog

Add entries to a plugin's `[Unreleased]` section in its own `CHANGELOG.md` as
you work. `npm run release` turns that section into `[<version>] - <date>`
(leaving an empty `[Unreleased]` above it) in the release PR, and
`release.yml` uses the version's section as the GitHub release notes. The
root itself is just where commands are run from, not a released thing — it
has no changelog of its own.

## Support

- [Follow on LinkedIn](https://uno.ylb.lt/network)
- [Support the author](https://uno.ylb.lt/author)
