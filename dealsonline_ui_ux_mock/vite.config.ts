import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

/**
 * Sub-path deploys (GitHub Pages project sites at /<repo>/) need every asset URL
 * rewritten. Set BASE_PATH at build time; the default suits a domain root:
 *
 *   BASE_PATH=/dealsonline/ npm run build
 *
 * demoSource.ts reads import.meta.env.BASE_URL, so the fixture paths follow
 * automatically, and postbuild.mjs rewrites the 404.html redirect to match.
 */
const BASE = process.env.BASE_PATH || '/'

export default defineConfig({
  base: BASE,
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:10000',
        changeOrigin: true,
        secure: false,
      },
      '/static': {
        target: 'http://localhost:10000',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
