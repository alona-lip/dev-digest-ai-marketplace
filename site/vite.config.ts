import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset paths work under https://<owner>.github.io/<repo>/ without hardcoding the repo name.
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
