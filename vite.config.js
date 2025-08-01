// src/vite.config.js
// CORREÇÃO: Adicionada configuração explícita do 'clientPort' no HMR
// para resolver o bug de conexão do WebSocket de forma mais robusta.

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Define explicitamente as configurações do servidor de desenvolvimento
  server: {
    port: 5173, // Garante que o servidor sempre rode nesta porta
    hmr: {
      // Define explicitamente a porta para o cliente HMR (Hot Module Replacement) se conectar.
      // Isto resolve bugs em alguns ambientes onde a porta não é inferida corretamente no refresh.
      clientPort: 5173,
    },
  },
})
