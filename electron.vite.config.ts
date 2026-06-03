import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        external: ['node-pty', 'keytar']
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        input: './src/renderer/index.html'
      }
    }
  }
})
