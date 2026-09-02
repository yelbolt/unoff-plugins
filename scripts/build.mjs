#!/usr/bin/env node
// Builds one plugin, every plugin under one platform, or every plugin in the
// monorepo, resolved from a single optional target so one entrypoint covers
// all local dev workflows. Each plugin's own vite.config.ts already resolves
// its outDir to <repo-root>/dist/<platform>/<name>/, so `build`/`dev` only
// need to trigger the right build script per matched workspace — they never
// reimplement what a plugin's own package.json already does.
//
// `start` is different: it doesn't build anything itself, it just runs one
// plugin's own `start:dev` script (build watch + its own `vite preview`
// server) — a pure pass-through, since that's already the plugin's own dev
// loop. It needs exactly one plugin (its preview server owns a fixed port,
// so running it for several plugins at once would collide).
//
// Usage:
//   node scripts/build.mjs <development|production> [target]
//   node scripts/build.mjs start <plugin>
//
//   target omitted                -> every plugin, every platform
//   target = "penpot"             -> every plugin under penpot/
//   target = "token-lint"         -> the plugin named token-lint, wherever it lives
//   target = "penpot/token-lint"  -> that exact plugin

import { spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const [, , mode, target] = process.argv

if (mode !== 'development' && mode !== 'production' && mode !== 'start') {
  console.error(
    'Usage: node scripts/build.mjs <development|production> [target]\n' +
      '       node scripts/build.mjs start <plugin>'
  )
  process.exit(1)
}

const root = process.cwd()
const IGNORED_DIRS = new Set(['node_modules', 'dist', 'scripts'])

const isPluginDir = (dir) => existsSync(join(dir, 'package.json'))

const listPlatforms = () =>
  readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith('.') && !IGNORED_DIRS.has(name))

const listPluginsOfPlatform = (platform) => {
  const platformDir = join(root, platform)
  if (!existsSync(platformDir)) return []
  return readdirSync(platformDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => isPluginDir(join(platformDir, name)))
    .map((name) => `${platform}/${name}`)
}

const listAllPlugins = () => listPlatforms().flatMap(listPluginsOfPlatform)

function resolveTarget(target) {
  if (!target) return listAllPlugins()

  if (target.includes('/')) {
    if (!isPluginDir(join(root, target))) {
      console.error(
        `'${target}' is not a known plugin workspace (missing package.json)`
      )
      process.exit(1)
    }
    return [target]
  }

  if (listPlatforms().includes(target)) {
    return listPluginsOfPlatform(target)
  }

  const matches = listAllPlugins().filter(
    (plugin) => plugin.split('/')[1] === target
  )
  if (matches.length === 0) {
    console.error(`No plugin or platform named '${target}' found`)
    process.exit(1)
  }
  if (matches.length > 1) {
    console.error(
      `'${target}' is ambiguous across platforms (${matches.join(', ')}). Use "platform/name" instead.`
    )
    process.exit(1)
  }
  return matches
}

if (mode === 'start') {
  if (!target) {
    console.error(
      'start requires exactly one plugin, e.g. node scripts/build.mjs start token-lint'
    )
    process.exit(1)
  }
  const plugins = resolveTarget(target)
  if (plugins.length !== 1) {
    console.error(
      `start requires exactly one plugin; '${target}' resolved to ${plugins.length}: ${plugins.join(', ')}`
    )
    process.exit(1)
  }
  const [plugin] = plugins
  console.log(`Starting ${plugin} (its own start:dev — build watch + preview)`)
  const child = spawn('npm', ['run', 'start:dev'], {
    cwd: join(root, plugin),
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  process.on('SIGINT', () => {
    child.kill('SIGINT')
    process.exit(0)
  })
  child.on('close', (code) => process.exit(code ?? 0))
} else {
  const plugins = resolveTarget(target)

  if (plugins.length === 0) {
    console.error(
      `No plugin workspace found${target ? ` for '${target}'` : ''}`
    )
    process.exit(1)
  }

  const script = mode === 'development' ? 'build' : 'build:prod'
  const isDev = mode === 'development'

  console.log(
    `${isDev ? 'Watching' : 'Building'} ${plugins.length} plugin(s) in ${mode} mode: ${plugins.join(', ')}`
  )

  const children = plugins.map((plugin) => {
    const child = spawn('npm', ['run', script], {
      cwd: join(root, plugin),
      stdio: 'inherit',
      shell: process.platform === 'win32',
    })
    child.pluginName = plugin
    return child
  })

  if (isDev) {
    // The underlying `vite build --mode development` runs in watch mode
    // (see build.watch in vite.config.ts), so these processes stay alive
    // until interrupted.
    process.on('SIGINT', () => {
      children.forEach((child) => child.kill('SIGINT'))
      process.exit(0)
    })
  } else {
    let exitCode = 0
    await Promise.all(
      children.map(
        (child) =>
          new Promise((resolve) => {
            child.on('close', (code) => {
              if (code) {
                exitCode = code
                console.error(`✗ ${child.pluginName} exited with code ${code}`)
              }
              resolve()
            })
          })
      )
    )
    process.exit(exitCode)
  }
}
