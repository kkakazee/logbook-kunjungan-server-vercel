import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Baca .env dari root project (hanya variabel berawalan VITE_ yang
  // masuk ke frontend — rahasia seperti DB_PASSWORD tidak ikut terbawa).
  envDir: '..',
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
