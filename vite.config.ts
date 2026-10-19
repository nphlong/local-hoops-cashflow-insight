import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      react: path.resolve(root, 'node_modules/react'),
      'react-dom': path.resolve(root, 'node_modules/react-dom'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand'],
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
  base: process.env.GITHUB_PAGES === '1' ? '/local-hoops-cashflow-insight/' : '/',
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: true,
  },
})
