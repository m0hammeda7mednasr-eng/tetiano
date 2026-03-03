import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig, mergeConfig } from 'vite';
import frontendConfig from './frontend/vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(__dirname, 'frontend');

export default defineConfig(
  mergeConfig(frontendConfig, {
    root: frontendRoot,
    build: {
      outDir: resolve(__dirname, 'dist'),
      emptyOutDir: true,
    },
  })
);
