import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import adapter from '@sveltejs/adapter-auto';

export default {
  // Consult https://svelte.dev/docs#compile-time-svelte-preprocess
  // for more information about preprocessors
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    alias: {
      // Dependency-free toolkit files the server shares with the functions (e.g. image-proxy.ts).
      $toolkits: 'functions/src/toolkits',
      // Dependency-free shared definitions (e.g. pipeline-steps.ts).
      $functions: 'functions/src'
    }
  },
  compilerOptions: {
    sourcemap: true,
    customElement: true
  },
}
