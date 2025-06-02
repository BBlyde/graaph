import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import dotenv from 'dotenv'

// Loading .env
dotenv.config()

const username = process.env.VITE_API_USERNAME
const password = process.env.VITE_API_PASSWORD
const basicAuth = Buffer.from(username + ':' + password).toString('base64')

export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://paceman.gg',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '/stats/aa/api')
      },
      '/secure-api': {
        target: 'https://mcsrapi.totorewa.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/secure-api/, ''),
        headers: {
          Authorization: `Basic ${basicAuth}`
        }
      }
    }
  }
})
