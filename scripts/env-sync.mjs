#!/usr/bin/env node
// Manage API keys in Google Secret Manager and the local .secret.local files.
//
//   npm run secrets:pull          write .secret.local and functions/.secret.local from Secret Manager
//                                 (add `-- --force` to overwrite existing files)
//   npm run secrets:push          upload every key in the local .secret.local files
//   npm run secrets:set -- NAME   prompt for a value (hidden) and upload it as NAME
//   npm run secrets:setup         prompt for every key in turn, then pull
//
// Each key is one secret, named like its environment variable. Deployed code reads the
// same secrets: functions via defineSecret (functions/src/secrets.ts), the SvelteKit
// server via frameworksBackend.secrets in firebase.json.
// Non-secret config lives in the committed .env files. Values are never printed.
// Requires `gcloud auth login`. Project defaults to .firebaserc; override with GCP_PROJECT.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

const PROJECT = process.env.GCP_PROJECT || JSON.parse(readFileSync('.firebaserc', 'utf8')).projects.default;

// Keys each local secrets file needs. Keep in sync with firebase.json and functions/src/secrets.ts.
const FILES = {
    '.secret.local': ['CEREBRAS_API_KEY', 'GEMINI_API_KEY', 'RUNWARE_API_KEY', 'GA_API_SECRET'],
    'functions/.secret.local': ['CEREBRAS_API_KEY', 'GEMINI_API_KEY', 'OPENAI_API_KEY'],
};
const ALL_KEYS = [...new Set(Object.values(FILES).flat())];

// gcloud is a .cmd shim on Windows, which only runs through a shell. Arguments here are
// plain names; secret values only ever travel through stdin/stdout, never the command line.
function gcloud(args, input) {
    const result = spawnSync('gcloud', [...args, '--project', PROJECT], {
        input,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: process.platform === 'win32',
    });
    if (result.error) {
        console.error('Could not run gcloud. Install the Google Cloud CLI and run `gcloud auth login`.');
        process.exit(1);
    }
    return { ok: result.status === 0, stdout: result.stdout };
}

function hasSecret(name) {
    return gcloud(['secrets', 'versions', 'describe', 'latest', `--secret=${name}`]).ok;
}

function upload(name, value) {
    if (!gcloud(['secrets', 'describe', name]).ok) {
        if (!gcloud(['secrets', 'create', name, '--replication-policy=automatic']).ok) {
            throw new Error(`could not create secret ${name}`);
        }
    }
    if (!gcloud(['secrets', 'versions', 'add', name, '--data-file=-'], value).ok) {
        throw new Error(`could not upload secret ${name}`);
    }
    console.log(`pushed ${name}`);
}

function pullFile(file, keys, force) {
    if (existsSync(file) && !force) {
        console.log(`skip   ${file} (exists; rerun with \`npm run secrets:pull -- --force\` to overwrite)`);
        return;
    }
    const lines = ['# Local secrets fetched from Secret Manager by scripts/env-sync.mjs. Never commit.'];
    const missing = [];
    for (const name of keys) {
        const { ok, stdout } = gcloud(['secrets', 'versions', 'access', 'latest', `--secret=${name}`]);
        if (ok) lines.push(`${name}=${stdout}`);
        else missing.push(name);
    }
    const tmp = `${file}.tmp`;
    writeFileSync(tmp, lines.join('\n') + '\n', { mode: 0o600 });
    renameSync(tmp, file);
    console.log(`pulled ${file}${missing.length ? ` (missing in Secret Manager: ${missing.join(' ')})` : ''}`);
}

function pushFile(file) {
    if (!existsSync(file)) {
        console.log(`skip   ${file} (not found)`);
        return;
    }
    for (const [name, value] of Object.entries(parseEnv(readFileSync(file, 'utf8')))) {
        upload(name, value);
    }
}

// Reads a line without echoing it to the terminal.
function askHidden(prompt) {
    return new Promise((resolve) => {
        const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
        process.stdout.write(prompt);
        rl._writeToOutput = () => {};
        rl.question('', (answer) => {
            rl.close();
            process.stdout.write('\n');
            resolve(answer.trim());
        });
    });
}

function pull(force) {
    for (const [file, keys] of Object.entries(FILES)) pullFile(file, keys, force);
}

const [command, name] = process.argv.slice(2);
switch (command) {
    case 'pull':
        pull(name === '--force');
        break;
    case 'push':
        for (const file of Object.keys(FILES)) pushFile(file);
        break;
    case 'set': {
        if (!name) {
            console.error('usage: npm run secrets:set -- NAME');
            process.exit(1);
        }
        const value = await askHidden(`Value for ${name}: `);
        if (value) upload(name, value);
        break;
    }
    case 'setup':
        // Prompt for every key in turn; an empty value keeps the current one.
        for (const key of ALL_KEYS) {
            const status = hasSecret(key) ? 'set; Enter to keep' : 'missing; Enter to skip';
            const value = await askHidden(`${key} (${status}): `);
            if (value) upload(key, value);
        }
        pull(true);
        break;
    default:
        console.error('usage: node scripts/env-sync.mjs pull|push|set NAME|setup');
        process.exit(1);
}
