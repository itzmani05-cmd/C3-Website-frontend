import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Every browser that runs this app supports woff2, so keep only that source in KaTeX's @font-face rules.
// This stops ~60 redundant .woff/.ttf files from being emitted into the build.
const katexWoff2Only = (): Plugin => ({
  name: 'katex-woff2-only',
  enforce: 'pre',
  transform(code, id) {
    if (!id.endsWith('katex.min.css')) return null;
    return code.replace(/,url\([^)]*\.woff\)\s*format\("woff"\)/g, '').replace(/,url\([^)]*\.ttf\)\s*format\("truetype"\)/g, '');
  },
});

export default defineConfig({
  plugins: [react(), tailwindcss(), katexWoff2Only()],
  build: {
    outDir: 'build',
    target: 'es2020',
    cssMinify: 'lightningcss',
    rollupOptions: {
      output: {
        // Stable vendor chunks so an app-only deploy doesn't invalidate the cached React/router code.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react';
          if (/node_modules\/(react-router|react-router-dom|@remix-run)\//.test(id)) return 'router';
          if (/node_modules\/(framer-motion|motion-dom|motion-utils)\//.test(id)) return 'motion';
          return undefined;
        },
      },
    },
  },
});
