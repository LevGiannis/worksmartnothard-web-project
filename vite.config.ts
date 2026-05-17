import { defineConfig } from 'vitest/config'

const PAGES_BASE = '/worksmartnothard-web-project/'

export default defineConfig(({ command, mode }) => {
  // Use repo sub-path only for production build (GitHub Pages).
  // Keep dev/preview on '/'.
  const isBuild = command === 'build'
  const isPages = mode === 'production' || process.env.GITHUB_ACTIONS === 'true'
  const isElectron = process.env.ELECTRON === 'true'
  const isPortable = mode === 'portable' || process.env.PORTABLE === 'true'

  return {
    base: isBuild && (isElectron || isPortable) ? './' : isBuild && isPages ? PAGES_BASE : '/',
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  }
})
