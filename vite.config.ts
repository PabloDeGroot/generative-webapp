import { existsSync } from 'node:fs';
import { defineConfig } from 'vite'
import { sveltekit } from '@sveltejs/kit/vite';

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  // Local dev secrets (fetched with `npm run secrets:pull`). Only loaded for the dev
  // server so they can never be baked into a build; deployed code gets them from
  // Secret Manager via firebase.json `frameworksBackend.secrets`.
  if (command === 'serve' && existsSync('.secret.local')) {
    process.loadEnvFile('.secret.local');
  }

  return {
    plugins: [
      sveltekit(),
    ],

    build: {
      sourcemap: true,

    },
  };
})
