import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'admin-dev-rewrite',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/' || req.url === '/admin' || req.url?.startsWith('/admin?')) {
            req.url = '/admin.html';
          }
          next();
        });
      }
    },
    {
      name: 'rename-admin-html-to-index',
      closeBundle() {
        const outDir = resolve(__dirname, 'dist-admin');
        const adminHtmlPath = resolve(outDir, 'admin.html');
        const indexHtmlPath = resolve(outDir, 'index.html');
        if (fs.existsSync(adminHtmlPath)) {
          fs.copyFileSync(adminHtmlPath, indexHtmlPath);
        }
        const binPath = resolve(outDir, 'ghartakkart.bin');
        if (fs.existsSync(binPath)) {
          fs.unlinkSync(binPath);
        }
        const apkPath = resolve(outDir, 'ghartakkart.apk');
        if (fs.existsSync(apkPath)) {
          fs.unlinkSync(apkPath);
        }
      }
    }
  ],
  server: {
    port: 3001,
    host: true,
    open: true
  },
  build: {
    outDir: 'dist-admin',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        admin: resolve(__dirname, 'admin.html')
      }
    }
  }
});
