import { defineConfig } from 'vite'
import { resolve } from 'path'

/**
 * Separate build for the content script.
 *
 * Content scripts are injected as classic scripts, not ES modules, so they
 * cannot be part of the main (ESM, code-split) build. This produces a single
 * self-contained IIFE at dist/content.js, which is what manifest.json
 * references. emptyOutDir is false so it does not wipe the popup build that
 * ran first.
 */
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/content/index.ts'),
      name: 'ApplyBuddyContent',
      formats: ['iife'],
      fileName: () => 'content.js',
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(
      process.env.VITE_API_URL || 'http://localhost:8000'
    ),
  },
})
