import path from 'path'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { defineConfig, loadEnv } from 'vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import preact from '@preact/preset-vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isDev = mode === 'development'
  const isPlugin = process.env.IS_PLUGIN === 'true'

  return {
    plugins: [
      preact(),
      viteSingleFile(),
      ...(!isDev
        ? [
            sentryVitePlugin({
              org: env.SENTRY_ORG,
              project: env.SENTRY_PROJECT,
              authToken: env.SENTRY_AUTH_TOKEN,
              sourcemaps: {
                assets: './dist/**',
                filesToDeleteAfterUpload: isDev ? undefined : '**/*.map',
              },
              release: {
                name: env.VITE_APP_VERSION,
                setCommits: {
                  auto: true,
                },
                finalize: true,
                deploy: {
                  env: 'production',
                },
              },
              telemetry: false,
            }),
          ]
        : []),
    ],

    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    },

    resolve: {
      alias: {
        react: 'preact/compat',
        'react-dom': 'preact/compat',
        'react/jsx-runtime': 'preact/jsx-runtime',
        '@ui-lib': path.resolve(
          __dirname,
          './packages/ui-ui-color-palette/src'
        ),
      },
    },

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
      ...(isPlugin
        ? {
            lib: {
              entry: path.resolve(__dirname, './src/index.ts'),
              name: 'FigmaPlugin',
              fileName: () => 'plugin.js',
              formats: ['iife' as const],
            },
          }
        : {
            rollupOptions: {
              input: path.resolve(__dirname, './index.html'),
              output: {
                dir: path.resolve(__dirname, 'dist'),
                entryFileNames: 'ui.js',
                assetFileNames: 'assets/[name].[hash][extname]',
                sourcemapExcludeSources: false,
              },
            },
          }),
    },

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
  }
})
