import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';

export default defineConfig({
  plugins: [
    TanStackRouterVite({
      routesDirectory: './src/app',
      generatedRouteTree: './src/routeTree.gen.ts',
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
    alias: [
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
      {
        find: /^@glimpse\/hooks$/,
        replacement: path.resolve(__dirname, '../../packages/hooks/src/index.ts'),
      },
      {
        find: /^@glimpse\/hooks\/(.*)$/,
        replacement: `${path.resolve(__dirname, '../../packages/hooks/src')}/$1`,
      },
      {
        find: /^@glimpse\/features$/,
        replacement: path.resolve(__dirname, '../../packages/features/src/index.ts'),
      },
      {
        find: /^@glimpse\/features\/(.*)$/,
        replacement: `${path.resolve(__dirname, '../../packages/features/src')}/$1`,
      },
      {
        find: '@',
        replacement: path.resolve(__dirname, './src'),
      },
    ],
  },
  server: {
    port: 1420,
    strictPort: true,
  },
  clearScreen: false,
});
