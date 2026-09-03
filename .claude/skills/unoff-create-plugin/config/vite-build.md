---
name: vite-build
description: Dual Vite build with IS_PLUGIN switch — IIFE Canvas bundle (plugin.js) and viteSingleFile UI HTML (index.html). Covers excludeUnwantedCssPlugin (strips platform-specific CSS at build time for Figma/Penpot/Sketch/Framer), React-to-Preact aliasing, and VITE_* environment variable handling. Use when modifying the build pipeline, adding Vite plugins, adding env vars, understanding how platform CSS is excluded, or debugging build output.
---

# Vite Build Configuration

## Overview

Both builds are orchestrated from a single `vite.config.ts` with the `IS_PLUGIN` environment variable as the switch. See [core.md](../core.md) for the dual-build rule and why the output shape must not change; this file covers the concrete configuration.

## Build Commands

| Script | Command | Purpose |
|---|---|---|
| `build` | `cross-env npx vite build --mode development & cross-env IS_PLUGIN=true npx vite build --mode development` | Dev build (parallel, both targets) |
| `build:prod` | `cross-env npx vite build --mode production && cross-env IS_PLUGIN=true npx vite build --mode production` | Prod build (sequential, both targets) |
| `start:dev` | `npm run build & vite preview` | Dev build + preview server |

`typecheck` / `lint` / `format` scripts and their rule config are in [code-quality.md](./code-quality.md).

### Build Flow

```
npm run build:prod
  ├── vite build --mode production        → dist/index.html  (UI)
  └── IS_PLUGIN=true vite build --mode production → dist/plugin.js   (Canvas)

manifest.json references:
  "main": "./dist/plugin.js"
  "ui": "./dist/index.html"
```

## Dual Build Architecture

### IS_PLUGIN Switch

```typescript
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isDev = mode === 'development'
  const isPlugin = process.env.IS_PLUGIN === 'true'

  return {
    build: {
      ...(isPlugin
        ? {
            // Canvas build config
            lib: {
              entry: path.resolve(__dirname, './src/index.ts'),
              name: 'FigmaPlugin',
              fileName: () => 'plugin.js',
              formats: ['iife' as const],
            },
          }
        : {
            // UI build config
            rollupOptions: {
              input: path.resolve(__dirname, './index.html'),
              output: {
                dir: path.resolve(__dirname, 'dist'),
                entryFileNames: 'ui.js',
                assetFileNames: 'assets/[name].[hash][extname]',
              },
            },
          }),
    },
  }
})
```

### Canvas Build (IS_PLUGIN=true)

| Setting | Value | Why |
|---|---|---|
| Entry | `src/index.ts` | Canvas entry point |
| Format | `iife` | Figma requires a self-executing function |
| Output | `dist/plugin.js` | Referenced by `manifest.json` `"main"` |
| Name | `FigmaPlugin` | IIFE global name |

The Canvas bundle runs in Figma's sandbox with no DOM access. It cannot import UI dependencies.

### UI Build (IS_PLUGIN not set)

| Setting | Value | Why |
|---|---|---|
| Entry | `index.html` | Standard Vite HTML entry |
| Output | `dist/index.html` | Inlined by viteSingleFile |
| JS output | `ui.js` | Bundled JavaScript |
| Plugin | `viteSingleFile()` | Inlines all JS/CSS into one HTML |

Figma loads the UI from a single HTML file — all JS, CSS, and assets must be inlined via `vite-plugin-singlefile`.

## Vite Plugins

### 1. @preact/preset-vite

```typescript
import preact from '@preact/preset-vite'

plugins: [preact()]
```

Enables Preact JSX transform and dev tools. Combined with the `resolve.alias` configuration, this makes React-compatible libraries work with Preact.

### 2. vite-plugin-singlefile

```typescript
import { viteSingleFile } from 'vite-plugin-singlefile'

plugins: [viteSingleFile()]
```

Inlines all JavaScript, CSS, and small assets into a single HTML file. Required because Figma's plugin UI iframe loads from a single HTML string.

### 3. @sentry/vite-plugin (production only)

```typescript
import { sentryVitePlugin } from '@sentry/vite-plugin'

plugins: [
  ...(!isDev
    ? [
        sentryVitePlugin({
          org: 'yelbolt',
          project: 'ui-color-palette',
          authToken: env.SENTRY_AUTH_TOKEN,
          sourcemaps: {
            assets: './dist/**',
            filesToDeleteAfterUpload: isDev ? undefined : '**/*.map',
          },
          release: {
            name: env.VITE_APP_VERSION,
            setCommits: { auto: true },
            finalize: true,
            deploy: { env: 'production' },
          },
          telemetry: false,
        }),
      ]
    : []),
]
```

- Uploads source maps to Sentry for error deobfuscation
- Deletes `.map` files after upload (not shipped to users)
- Creates a release tagged with the app version
- Auto-links commits for release tracking

### 4. excludeUnwantedCssPlugin (custom)

```typescript
const excludeUnwantedCssPlugin = (): Plugin => {
  const excludePattern =
    /figma-colors|penpot-colors|penpot-types|sketch-colors|sketch-types\.css$/

  return {
    name: 'exclude-unwanted-css',
    enforce: 'pre',
    resolveId(id, importer) {
      if (id.endsWith('.css')) {
        const testPath = importer
          ? path.resolve(path.dirname(importer), id)
          : id
        if (excludePattern.test(testPath))
          return { id: '\0empty-module', external: false }
      }
      return null
    },
    load(id) {
      if (id === '\0empty-module')
        return { code: 'export default ""', map: null }
      return null
    },
    transformIndexHtml(html) {
      return html.replace(/<style[^>]*>\s*<\/style>/g, '')
    },
  }
}
```

The `@unoff/ui` library ships CSS for multiple platforms. This custom plugin intercepts CSS imports matching other platforms (penpot, sketch) and replaces them with empty modules, keeping the bundle size minimal.

## Resolve Aliases

```typescript
resolve: {
  alias: {
    react: 'preact/compat',
    'react-dom': 'preact/compat',
    'react/jsx-runtime': 'preact/jsx-runtime',
    '@ui-lib': path.resolve(__dirname, './packages/ui-ui-color-palette/src'),
  },
},
```

Combined with `tsconfig.json` paths:

```jsonc
"paths": {
  "react": ["./node_modules/preact/compat/"],
  "react/jsx-runtime": ["./node_modules/preact/jsx-runtime"],
  "react-dom": ["./node_modules/preact/compat/"],
  "react-dom/*": ["./node_modules/preact/compat/*"]
}
```

And `package.json` dependency aliasing:

```json
"react": "npm:@preact/compat",
"react-dom": "npm:@preact/compat"
```

**Three-layer aliasing** (Vite resolve + TSConfig paths + npm alias) ensures React-compatible libraries like `@sentry/react` and `@tolgee/react` transparently use Preact.

## Build Settings

```typescript
build: {
  commonjsOptions: {
    include: [/node_modules/],
    transformMixedEsModules: true,
  },
  target: 'es2015',
  sourcemap: true,
  minify: !isDev,
  outDir: path.resolve(__dirname, 'dist'),
  watch: isDev ? {} : null,
  emptyOutDir: false,
}
```

| Setting | Dev | Prod | Why |
|---|---|---|---|
| `target` | `es2015` | `es2015` | Figma's runtime compatibility |
| `sourcemap` | `true` | `true` | Always generated; uploaded to Sentry in prod |
| `minify` | `false` | `true` | Faster dev builds, smaller prod bundles |
| `watch` | `{}` (enabled) | `null` (off) | File watching for dev mode |
| `emptyOutDir` | `false` | `false` | Both builds write to same `dist/`, cannot clear between |

## Preview Server

```typescript
preview: {
  port: 4400,
  watch: {
    usePolling: false,
    ignored: ['**/node_modules/**', '!**/node_modules/@a_ng_d/**'],
  },
  hmr: {
    protocol: 'ws',
    host: 'localhost',
    port: 4400,
    clientPort: 4400,
    timeout: 20000,
    overlay: true,
    preserveState: false,
  },
  headers: {
    'Access-Control-Allow-Origin': '*',
  },
},
```

- Port 4400 for local development
- Watches `@a_ng_d/*` packages for local library development
- CORS headers for cross-origin access
- HMR via WebSocket (used during `start:dev`)

## Environment Variables

### Compile-Time

```typescript
define: {
  __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
},
```

`__APP_VERSION__` is replaced at build time with the version from `package.json`.

### Runtime (via loadEnv)

```typescript
const env = loadEnv(mode, process.cwd(), '')
```

Variables prefixed with `VITE_` are exposed to client code via `import.meta.env`:

| Variable | Used in |
|---|---|
| `VITE_SUPABASE_ANON_KEY` | Supabase client init |
| `VITE_SENTRY_DSN` | Sentry init |
| `VITE_MIXPANEL_TOKEN` | Mixpanel init |
| `VITE_TOLGEE_URL` | Tolgee init |
| `VITE_TOLGEE_API_KEY` | Tolgee API key |
| `VITE_APP_VERSION` | Sentry release name |
| `SENTRY_AUTH_TOKEN` | Sentry plugin (build-time only, not shipped) |

### Type Declarations

```typescript
// env.d.ts — asset module declarations
declare module '*.webp' { const value: string; export = value }
declare module '*.gif' { const value: string; export = value }

// vite-env.d.ts
/// <reference types="vite/client" />
```

## manifest.json

```json
{
  "name": "{{ pluginName }}",
  "id": "{{ pluginId }}",
  "api": "1.0.0",
  "editorType": ["figma", "figjam", "dev", "buzz"],
  "capabilities": ["inspect", "vscode"],
  "permissions": ["payments", "currentuser"],
  "documentAccess": "dynamic-page",
  "networkAccess": {
    "allowedDomains": [
      "https://*.supabase.co",
      "https://*.yelbolt.workers.dev",
      "https://*.mixpanel.com",
      "https://*.sentry.io",
      "https://fonts.googleapis.com",
      // ... more domains
    ]
  },
  "main": "./dist/plugin.js",
  "ui": "./dist/index.html"
}
```

Key fields:
- `editorType` — Must match the `Editor` type in `app.ts`
- `capabilities` — `inspect` enables Dev Mode, `vscode` enables VS Code extension
- `permissions` — `payments` for LemonSqueezy, `currentuser` for identity
- `documentAccess: "dynamic-page"` — Access current page only (performance)
- `networkAccess.allowedDomains` — Whitelist for external service calls

## TypeScript Configuration

```jsonc
{
  "compilerOptions": {
    "target": "ES2015",
    "lib": ["ES2019", "DOM", "ES6", "DOM.Iterable", "ScriptHost"],
    "moduleResolution": "node",
    "module": "ESNext",
    "strict": true,
    "jsx": "react",
    "typeRoots": [
      "./node_modules/@types",
      "./node_modules/@figma"
    ]
  }
}
```

- `strict: true` — Enables all strict checks
- `jsx: "react"` — Required for Preact compat (preact/preset-vite handles the transform)
- `typeRoots` includes `@figma` for Figma Plugin API types

## Code Quality Tools

ESLint and Prettier configuration, rule tables, and the test setup are covered in [code-quality.md](./code-quality.md) — not repeated here.

## Best Practices

✅ Run `build:prod` before publishing — it includes Sentry source maps  
✅ Keep both builds in sync — same `dist/` directory, `emptyOutDir: false`  
✅ Add new allowed domains to `manifest.json` when integrating new services  
✅ Prefix client-exposed env vars with `VITE_`  
✅ Follow the import ordering enforced by ESLint  

## What to Avoid

❌ Don't import UI code in the Canvas entry (`src/index.ts`) — the IIFE build has no DOM  
❌ Don't remove `viteSingleFile()` — Figma requires a single HTML file  
❌ Don't set `emptyOutDir: true` — it would delete the other build's output  
❌ Don't ship `.map` files — let Sentry plugin upload and delete them  
❌ Don't add env variables without `VITE_` prefix if they need client access  
