import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Importante para o Electron carregar os assets corretamente
  build: {
    chunkSizeWarningLimit: 1600, // Aumenta limite para evitar avisos (padrão é 500)
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', '@mui/material', '@emotion/react', '@emotion/styled'],
        },
      },
    },
  },
})