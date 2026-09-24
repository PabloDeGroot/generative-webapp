#!/usr/bin/env node
// Build the functions, then start the Firebase emulators. Emulator state is exported to
// ./emulator-data on exit and imported from there on the next start (when present).
// Cross-platform replacement for a shell one-liner; run with `npm run emulate`.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

// npm and firebase are .cmd shims on Windows, which only run through a shell.
const shell = process.platform === 'win32';

const build = spawnSync('npm', ['--prefix', 'functions', 'run', 'build'], { stdio: 'inherit', shell });
if (build.status !== 0) process.exit(build.status ?? 1);

const DATA_DIR = 'emulator-data';
// The app itself is served by `npm run dev`, so the hosting emulator (which needs the
// webframeworks experiment) and the unused extensions emulator are left out.
const args = ['emulators:start', '--only', 'auth,functions,firestore,storage', '--export-on-exit', DATA_DIR];
if (existsSync(join(DATA_DIR, 'firebase-export-metadata.json'))) {
    args.push('--import', DATA_DIR);
} else {
    console.log(`No saved emulator data in ./${DATA_DIR}; starting empty.`);
}

// firebase.json configures a web-framework hosting target, which the CLI refuses to load
// unless the webframeworks experiment is on (even when hosting isn't emulated).
const experiments = [process.env.FIREBASE_CLI_EXPERIMENTS, 'webframeworks'].filter(Boolean).join(',');
const env = { ...process.env, FIREBASE_CLI_EXPERIMENTS: experiments };

const emulators = spawn('firebase', args, { stdio: 'inherit', shell, env });
emulators.on('error', () => {
    console.error('Could not start the Firebase CLI. Install it with `npm i -g firebase-tools`.');
    process.exit(1);
});
emulators.on('exit', (code) => process.exit(code ?? 0));

// Ctrl+C reaches the emulators directly; let them export their data before we exit.
process.on('SIGINT', () => {});
