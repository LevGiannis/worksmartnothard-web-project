import { defineConfig } from 'vite'

export default defineConfig({
  // For GitHub Pages we set BASE_PATH in the workflow to "/<repo-name>/"
  base: process.env.BASE_PATH ?? '/',
})
