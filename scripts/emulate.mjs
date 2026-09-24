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
const args = ['emulators:start', '--export-on-exit', DATA_DIR];
if (existsSync(join(DATA_DIR, 'firebase-export-metadata.json'))) {
    args.push('--import', DATA_DIR);
} else {
    console.log(`No saved emulator data in ./${DATA_DIR}; starting empty.`);
}

const emulators = spawn('firebase', args, { stdio: 'inherit', shell });
emulators.on('error', () => {
    console.error('Could not start the Firebase CLI. Install it with `npm i -g firebase-tools`.');
    process.exit(1);
});
emulators.on('exit', (code) => process.exit(code ?? 0));

// Ctrl+C reaches the emulators directly; let them export their data before we exit.
process.on('SIGINT', () => {});
