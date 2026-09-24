#!/usr/bin/env node
// Call a callable Cloud Function as the project operator, e.g. the IAM-private
// initializeComponents / updateComponents / resetComponents.
//
//   npm run call -- resetComponents '{"confirm":"..."}'
//   npm run call -- initializeComponents '{"prompt":"..."}' --emulator
//
// In production the request carries a Google identity token for your gcloud account
// (`gcloud auth login`; project owners may invoke private functions) in
// X-Serverless-Authorization, which Cloud Run checks and strips. With --emulator it goes
// to the local Functions emulator, which doesn't enforce IAM.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REGION = 'europe-southwest1';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const project = process.env.GCP_PROJECT || JSON.parse(readFileSync(join(root, '.firebaserc'), 'utf8')).projects.default;

const args = process.argv.slice(2);
const emulator = args.includes('--emulator');
const [name, rawData = '{}'] = args.filter((a) => a !== '--emulator');
if (!name) {
    console.error('usage: npm run call -- FUNCTION_NAME [JSON_DATA] [--emulator]');
    process.exit(1);
}

let data;
try {
    data = JSON.parse(rawData);
} catch {
    console.error('JSON_DATA must be valid JSON.');
    process.exit(1);
}

const url = new URL(emulator
    ? `http://127.0.0.1:5001/${project}/${REGION}/${name}`
    : `https://${REGION}-${project}.cloudfunctions.net/${name}`);

const headers = { 'Content-Type': 'application/json' };
if (!emulator) {
    // gcloud is a .cmd shim on Windows, which only runs through a shell.
    const token = spawnSync('gcloud', ['auth', 'print-identity-token'], {
        encoding: 'utf8',
        shell: process.platform === 'win32'
    });
    if (token.status !== 0 || !token.stdout.trim()) {
        console.error('Could not get an identity token. Run `gcloud auth login` first.');
        process.exit(1);
    }
    headers['X-Serverless-Authorization'] = `Bearer ${token.stdout.trim()}`;
}

// node:http has no response timeout by default; some operator functions run for over an hour.
const client = url.protocol === 'https:' ? https : http;
const req = client.request(url, { method: 'POST', headers }, (res) => {
    let body = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => (body += chunk));
    res.on('end', () => {
        console.log(`HTTP ${res.statusCode}`);
        console.log(body);
        process.exit(res.statusCode === 200 ? 0 : 1);
    });
});
req.on('error', (error) => {
    console.error(`Request failed: ${error.message}`);
    process.exit(1);
});
req.end(JSON.stringify({ data }));
