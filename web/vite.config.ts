import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

// Where the WhatsApp API (NestJS) is running
const API_URL = process.env.API_URL || 'http://localhost:3000'

export default defineConfig({
  plugins: [react()],
  // The build is served by the API at /app (see src/app.module.ts)
  base: '/app/',
  server: {
    port: 5173,
    proxy: {
      '/api': {target: API_URL, changeOrigin: true},
    },
  },
})
