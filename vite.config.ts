import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { glob } from 'glob'
import path from 'path'
import fs from 'fs'

/**
 * Vite plugin to serve AudioWorklet files during development.
 * Intercepts /worklets/*.js and compiles TS source on-the-fly with esbuild.
 */
function workletDevPlugin() {
  return {
    name: 'worklet-dev-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const match = req.url?.match(/^\/worklets\/(.+)\.js(\?.*)?$/)
        if (match) {
          const workletName = match[1]
          const sourcePath = path.resolve(__dirname, `src/worklets/${workletName}.worklet.ts`)

          if (fs.existsSync(sourcePath)) {
            try {
              const { build } = await import('esbuild')
              const result = await build({
                entryPoints: [sourcePath],
                bundle: true,
                write: false,
                format: 'iife',
                minify: false,
              })

              res.setHeader('Content-Type', 'application/javascript')
              res.end(result.outputFiles[0].text)
              return
            } catch (error) {
              console.error(`Failed to compile worklet ${workletName}:`, error)
            }
          }
        }
        next()
      })
    }
  }
}

// Find all worklet files for production build
const workletFiles = glob.sync('src/worklets/**/*.worklet.ts')
const workletEntries = workletFiles.reduce((acc, file) => {
  const name = path.basename(file, '.worklet.ts')
  acc[`worklets/${name}`] = path.resolve(__dirname, file)
  return acc
}, {} as Record<string, string>)

export default defineConfig({
  plugins: [react(), workletDevPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        sleep_tapes: path.resolve(__dirname, 'sleep-tapes.html'),
        ...workletEntries,
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name.startsWith('worklets/')) {
            return '[name].js'
          }
          return 'assets/[name]-[hash].js'
        },
      },
    },
  },
})
