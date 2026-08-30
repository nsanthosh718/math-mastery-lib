import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative asset paths, so the same build works at a domain root, under a
  // GitHub Pages project subpath (/math-mastery-lib/), or opened from a file.
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{js,jsx}'],
    environmentMatchGlobs: [['tests/**/*.dom.test.jsx', 'jsdom']],
  },
});
