import { defineConfig } from 'vite'

/**
 * Vite 配置
 * @see https://vitejs.dev/config/
 */
export default defineConfig({
  plugins: [],
  server: {
    port: 5173,
    open: false,
    // 反向代理配置（用于本地开发联调后端）
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})
