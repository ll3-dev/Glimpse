import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: 'react-native',
        replacement: 'react-native-web',
      },
      {
        find: /^@glimpse\/core$/,
        replacement: path.resolve(__dirname, '../../packages/core/src/index.ts'),
      },
      {
        find: /^@glimpse\/core\/(.*)$/,
        replacement: `${path.resolve(__dirname, '../../packages/core/src')}/$1`,
      },
      {
        find: /^@glimpse\/shared$/,
        replacement: path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      },
      {
        find: /^@glimpse\/shared\/(.*)$/,
        replacement: `${path.resolve(__dirname, '../../packages/shared/src')}/$1`,
      },
    ],
  },
  server: {
    port: 1420,
    strictPort: true,
  },
  clearScreen: false,
});
