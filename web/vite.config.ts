/// <reference types="vite/client" />
import { defineConfig } from 'vite'

export default defineConfig({
  root: 'web',
  build: {
    outDir: '../dist',
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    reportCompressedSize: false,
    cssMinify: 'esbuild',
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        entryFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
  esbuild: { legalComments: 'none' },
})
