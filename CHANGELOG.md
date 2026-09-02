# Changelog

Changes to the monorepo itself — tooling, CI, and shared infrastructure. Each
plugin's own product changes are tracked in its own `CHANGELOG.md`
(`penpot/<name>/CHANGELOG.md`), extracted automatically into its GitHub
release notes on deploy.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]
### Added
- npm workspaces monorepo structure, organized by platform (`penpot/`, with
  `figma/`, `framer/`, `sketch/` ready for future plugins); each plugin keeps
  its own `package.json` and build scripts unchanged.
- Shared `dist/<platform>/<name>/` build output — every plugin's
  `vite.config.ts` resolves its `outDir` there — mirroring the path-based
  hosting URL so what's tested locally (`npm run serve`) matches GitHub
  Pages exactly.
- `scripts/build.mjs`, a single build/dev entrypoint resolving one optional
  target: the whole monorepo, one platform, or one plugin by bare name
  (`npm run build -- token-lint`).
- Root GitHub Actions workflows (`build.yml`, `release.yml`) with automatic
  changed-plugin detection (`.github/actions/detect-plugins`), replacing
  per-plugin duplicated CI — adding a new plugin needs no new workflow file.
- A GitHub Environment per plugin (`penpot-token-lint`,
  `penpot-calendar-and-schedule-generator`) for secrets that must diverge
  per plugin (Sentry, Mixpanel, LemonSqueezy...), falling back to shared
  repository secrets for genuinely common infrastructure (auth/CORS worker
  URLs, Notion, Tolgee).
- `scripts/changelog.mjs`, extracting each plugin's `[Unreleased]`
  CHANGELOG.md section into its GitHub release notes and bumping the file
  afterwards.

### Changed
- GitHub Pages deployment via `peaceiris/actions-gh-pages` with
  `keep_files: true`, so releasing one plugin never wipes another already
  published there.
