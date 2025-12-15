import { defineConfig } from 'vite'

const PAGES_BASE = '/WORKSMARTNOTHARD-WEB-PROJECT/'

export default defineConfig(({ command, mode }) => {
  // Use repo sub-path only for production build (GitHub Pages).
  // Keep dev/preview on '/'.
  const isBuild = command === 'build'
  const isPages = mode === 'production' || process.env.GITHUB_ACTIONS === 'true'

  return {
    base: isBuild && isPages ? PAGES_BASE : '/',
  }
})
