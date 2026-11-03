import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig({
  plugins: [
    react(),
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
