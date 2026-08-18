import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The production image serves the build through nginx, which proxies /api and
// /recipes to the backend (see nginx.conf). `vite dev` has no nginx in front of
// it, so mirror that proxy here to keep relative API paths working locally.
const backend = process.env.BACKEND_ORIGIN || 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': backend,
      '/recipes': backend,
    },
  },
})
