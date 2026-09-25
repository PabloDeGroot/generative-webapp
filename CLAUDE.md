# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is an AI-powered webpage generator built on two separate runtimes that communicate:

**SvelteKit frontend (`src/`)** — deployed as a server-rendered app. Every URL hit triggers `src/routes/[...slug]/+page.server.ts`, which calls `PageGenerator.ts` to run a two-phase pipeline:
1. **Page Designer** — an LLM agent that reads the URL route, queries the MCP server for available components, and emits a JSON `PageSpec` describing page sections.
2. **HTML Generator** — a single-shot LLM call that turns the `PageSpec` into raw HTML.

The resulting HTML is injected into the page via `{@html}` in `+page.svelte`. Component `<script>` tags point at the same-origin `/__components/<storage path>` route (`src/routes/__components/[...path]/+server.ts`, URLs from `$lib/component-url.ts`), which reads them from Firebase Storage with firebase-admin, in dev and production. Don't link to Storage directly: `storage.rules` deny client reads, the server's service account can't sign URLs, and cross-origin module scripts would need bucket CORS. The route only serves component paths from the project bucket, and a user's overrides only to that user.

**Firebase Functions (`functions/src/`)** — runs the backend agents and exposes an MCP server. Key exports from `index.ts`:
- `mcp` — stateless MCP endpoint that the page designer connects to for component CRUD tools.
- `generateContent` / `createScene` — callable functions for text and Three.js scene generation.
- `evaluateFeedback` — routes user free-form feedback into per-user component overrides or stored preferences (via `SaveUserPreference` / `UpdateComponent`).
- `initializeComponents` / `updateComponents` / `resetComponents` — operator-only functions for seeding, curating and clearing a toolkit's shared component library.
- `installComponents` / `exportComponents` — operator-only: install hand-defined starter components from `starter-components/<toolkit>/` and export library components back to it (driven by `npm run components:install` / `components:pull`, `scripts/components.mjs`; format in `starter-components/README.md`).

Access control (IAM invoker settings are applied on deploy; the emulator ignores them):
- Operator functions are built with `operatorFunction()`: private `onRequest` functions that speak the callable wire format. Don't make them `onCall` — Firebase ignores `invoker` on callable functions and always deploys them public. Call them with `npm run call -- NAME '<json data>'` (`scripts/call-function.mjs`), which sends your gcloud identity token in `X-Serverless-Authorization`; add `--emulator` to call the local emulator.
- `mcp` only accepts the SvelteKit server's service account (`MCP_INVOKER_SERVICE_ACCOUNT` in `functions/.env`). In production `PageGenerator.ts` sends a Google ID token in `X-Serverless-Authorization`; `Authorization` carries the visitor's Firebase ID token.
- `generateContent`, `createScene` and `evaluateFeedback` require a signed-in Firebase user (`requireSignedIn`; the emulator falls back to `emulator-user` when no user is sent).
- **Auth gate** (`AUTH_GATE=true` in `.env` and `functions/.env`, keep them in sync): only Google sign-ins count (`sign_in_provider === "google.com"`, checked server-side). In `hooks.server.ts`, visitors without one may only load pages and use `/__session-auth`; everything else (images, actions, other routes) gets 401. `+layout.server.ts` then reports `authRequired`, the layout shows a sign-in screen, and no page is generated. After sign-in, `GoogleLogin` fires `session-auth-synced` once the cookie is set and the layout reloads.
- **Cookies:** Firebase Hosting forwards only the cookie named `__session` to the SSR function and strips every other cookie. The server keeps everything in it as URL-encoded fields (`auth` = Firebase ID token, `appCheck` = App Check token); always go through `src/lib/server/session-cookie.ts`, never set other cookies for the server to read. With the gate off, pages fall back to the App Check token check.

**Component system** — reusable components are AI-generated JavaScript web components (native `HTMLElement` subclasses, always wrapped with Twind for Tailwind CSS). They are stored in Firestore and Firebase Storage. Each toolkit has its own library, in two scopes (Storage objects use the same paths plus `.js`):
- Shared scope (`toolkits/{toolkitId}/components/`) — written only by `CreateComponent` and `updateComponents`.
- User scope (`users/{uid}/toolkits/{toolkitId}/components/`) — per-user overrides written by `UpdateComponent` when called with a `userId`.

**Domain toolkits** (`functions/src/toolkits/`) — a toolkit is a site domain: a description plus MCP tools (the `DomainToolkit` interface in `types.ts`). Tools can wrap APIs, compute things, and keep state in Firestore via `shared/state.ts` (server-only): per-user with `userCollection()` → `toolkits/{toolkitId}/users/{uid}/…`, or shared by all users with `toolkitCollection()` → `toolkits/{toolkitId}/…` (`components` and `users` are reserved). `shared/http.ts` provides `fetchJson` (timeout, TTL cache, per-host rate limiting); API keys go in the toolkit's `secrets` (bound to `mcp`). Toolkits are listed in `registry.ts` and in `KNOWN_TOOLKIT_IDS` (`src/lib/toolkit.ts`) — keep both in sync. Current toolkits: `dictionary`, `travel` (public APIs + per-user trips), `community` (multi-user board, pure Firestore), `demo`.
- **User-generated text must be stored HTML-escaped** (see `escapeText` in `toolkits/community/forum.ts`) and the toolkit description must tell the page designer not to unescape it: pages are LLM-written HTML inserted with `{@html}`, so raw user input would be stored XSS.
- **Selection per request:** `src/lib/server/toolkit.ts` picks the toolkit from the hostname's first label (`travel.groots.es`, `travel.localhost:5173` → `travel`); other hosts use `TOOLKIT_ID` (default `dictionary`, set in both `.env` files). The page generator sends it to `mcp` as `X-Toolkit-Id`; the browser reads it from `<html data-toolkit>`; `evaluateFeedback` and the operator functions take `data.toolkit`.
- **In the functions**, entry points wrap their work in `runWithToolkit()` (`toolkits/context.ts`, AsyncLocalStorage) and everything below reads `currentToolkit()`; it throws when no toolkit is set rather than falling back.
- **Adding a toolkit:** create `toolkits/<id>/`, register it in both lists, seed its library with `npm run call -- initializeComponents '{"toolkit":"<id>","prompt":"..."}'`, and add `<id>.groots.es` as a Hosting custom domain plus a Firebase Auth authorized domain.

**Model routing** — all models are identified by string IDs from environment variables. `resolveLanguageModel()` (in both `src/lib/AI/model-provider.ts` and `functions/src/ai-model-provider.ts`) dispatches to Google Gemini if the model ID contains `gemini`, otherwise to Cerebras.

**Prompts** are `.md` files loaded at startup via `?raw` imports (SvelteKit) or `loadPrompt()` (functions). The six function-side prompts are in `functions/prompts/`; the five SvelteKit-side prompts are in `prompts/`.

**Built-in components** (`google-login`, `feedback-fab`) are Svelte custom elements compiled into the page bundle from `src/Components/`. They are registered in `BUILT_IN_COMPONENTS` in `component-manager.ts` and `BUILT_IN_COMPONENT_IDS` in `component-loader.ts` — both must be kept in sync. The component loader skips them so no dynamic `<script>` is injected.

## Commands

### SvelteKit app
```bash
npm run dev          # start dev server (Vite)
npm run build        # production build
npm run check        # svelte-check type checking
npm run check:watch  # type checking in watch mode
```

### Firebase Functions
```bash
cd functions
npm run build        # compile TypeScript
npm run build:watch  # compile in watch mode
```

### Full local emulation
```bash
npm run emulate      # builds functions, starts Firebase emulators with local data
```
Runs `scripts/emulate.mjs`. Requires the Firebase CLI (`npm i -g firebase-tools`), Java, and `gcloud auth application-default login`. Imports `./emulator-data/` when it holds a previous export and exports back to it on exit; with no data it starts empty.

Scripts must run on both Windows and Linux: write tooling as Node scripts (`scripts/*.mjs`) rather than shell scripts, and pass `shell: process.platform === 'win32'` when spawning `npm`, `firebase` or `gcloud`.

`npm run dev` always talks to the emulators, never to production: the client SDK clients (`db`, `auth`, `functions` exported from `src/lib/firebase.ts`) connect to them when `dev` is true, `src/lib/firebase_admin.ts` sets the `*_EMULATOR_HOST` variables for firebase-admin, the MCP URL defaults to the emulated `mcp` function, and `/__components` reads component scripts from the Storage emulator. Use the shared clients from `$lib/firebase` rather than calling `getAuth`/`getFunctions` in components. Emulator ports come from `firebase.json`.

### Deploy functions only
```bash
cd functions && npm run deploy
```

## Environment Variables

Config and secrets are split:

- **Non-secret config** lives in the committed `.env` (SvelteKit) and `functions/.env` (functions). Never put API keys there.
- **API keys** live in Google Secret Manager, one secret per key, named like the env var. Deployed functions bind them with `defineSecret` (`functions/src/secrets.ts`, attached per function via `secrets:`); the deployed SvelteKit server binds them via `hosting.frameworksBackend.secrets` in `firebase.json`. SvelteKit code must read secrets from `$env/dynamic/private` (not `static`), since they only exist at runtime.
- **Locally**, `npm run secrets:pull` writes the keys into gitignored `.secret.local` (loaded by `vite.config.ts` for `vite dev` only) and `functions/.secret.local` (read by the Functions emulator). `npm run secrets:set -- NAME` adds or rotates a key; `npm run secrets:setup` prompts for every key in turn (both in `scripts/env-sync.mjs`).
- Adding a secret means updating `secrets.ts` or `firebase.json`, and the key lists in `scripts/env-sync.mjs`.
- Don't use root `.env.*` files for secrets: the frameworks deploy uploads every root `.env.*` file with the SSR function.

Key variables:

- Firebase config: `PUBLIC_FIREBASE_*` (SvelteKit public env)
- Secrets: `CEREBRAS_API_KEY`, `GEMINI_API_KEY`, `RUNWARE_API_KEY` (image generation), `GA_API_SECRET`, `OPENAI_API_KEY` (functions: model-search embeddings)
- Per-prompt model selection: `PAGE_DESIGNER_MODEL`, `HTML_GENERATOR_MODEL`, `ACTION_RUNNER_MODEL`, `IMAGE_DESCRIPTION_MODEL`, `IMAGE_GENERATION_MODEL` (SvelteKit side)
- `COMPONENT_DESIGNER_MODEL`, `COMPONENT_CODEGEN_MODEL`, `COMPONENT_EVALUATOR_MODEL`, `FEEDBACK_EVALUATOR_MODEL`, `COMPONENT_INITIALIZER_MODEL`, `COMPONENT_CURATOR_MODEL` (functions side)
- `MCP_ENDPOINT` — optional override for the MCP URL (defaults to the Firebase Function URL derived from `PUBLIC_FIREBASE_PROJECT_ID`)

## Component Generation Pipeline

When `CreateComponent` or `UpdateComponent` is called, it runs three sequential LLM phases in `component-manager.ts`:
1. **Designer** (agentic, with component library tools) → outputs `ComponentSpec` JSON
2. **Codegen** (single-shot) → outputs raw JavaScript for a `HTMLElement` subclass
3. **Evaluator** — first a deterministic lint (`lintComponentCode`: no props stored on reflected built-in element properties like `this.title`, which recurse through `attributeChangedCallback`), then a single-shot LLM review; on failure, codegen retries once with the feedback, and a remaining lint clash is fixed by renaming to a private field (`this._title`)

The final JS is patched by `ensureTwind()` to add Twind imports and extend `withTwind(HTMLElement)`, then saved to Firebase Storage with a `gs://` path recorded in Firestore.

**Starter components** skip this pipeline partly: `InstallStarterComponent` stores hand-written code as-is (after the lint and `ensureTwind`), or runs only codegen + evaluator on a hand-written spec (no designer). Their Firestore docs carry `origin: "starter-code" | "starter-spec"`. Install starters before `initializeComponents`, which reads the existing library and matches its visual language.
