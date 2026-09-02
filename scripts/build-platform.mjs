#!/usr/bin/env node
// Builds every plugin workspace under <repo-root>/<platform>/ so the shared
// <repo-root>/dist/<platform>/<name>/ tree stays in sync with what's on disk.
// Each plugin's own vite.config.ts already resolves its outDir there, so
// this script only needs to trigger the right build script per workspace.
//
// Usage: node scripts/build-platform.mjs <platform> [development|production]

import { spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const [, , platform, mode = 'production'] = process.argv

if (!platform) {
  console.error(
    'Usage: node scripts/build-platform.mjs <platform> [development|production]'
  )
  process.exit(1)
}

const platformDir = join(process.cwd(), platform)

if (!existsSync(platformDir)) {
  console.error(`No such platform folder: ${platform}/`)
  process.exit(1)
}

const plugins = readdirSync(platformDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((name) => existsSync(join(platformDir, name, 'package.json')))

if (plugins.length === 0) {
  console.error(`No plugin workspace found under ${platform}/`)
  process.exit(1)
}

const script = mode === 'development' ? 'build' : 'build:prod'
const isDev = mode === 'development'

console.log(
  `Building ${plugins.length} ${platform} plugin(s) in ${mode} mode: ${plugins.join(', ')}`
)

const children = plugins.map((name) => {
  const child = spawn('npm', ['run', script], {
    cwd: join(platformDir, name),
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  child.pluginName = name
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
