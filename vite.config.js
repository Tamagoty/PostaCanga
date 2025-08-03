// src/vite.config.js
// CORREÇÃO: Adicionada configuração explícita do 'clientPort' no HMR
// para resolver o bug de conexão do WebSocket de forma mais robusta.

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      clientPort: 5173,
    },
  },
})

