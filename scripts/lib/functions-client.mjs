// Calls a callable-format Cloud Function as the project operator. Used by call-function.mjs and
// components.mjs. In production the request carries a Google identity token for your gcloud
// account (`gcloud auth login`; project owners may invoke the private operator functions) in
// X-Serverless-Authorization, which Cloud Run checks and strips. With emulator: true it goes to
// the local Functions emulator, which doesn't enforce IAM.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REGION = 'europe-southwest1';
export const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function projectId() {
    return process.env.GCP_PROJECT || JSON.parse(readFileSync(join(repoRoot, '.firebaserc'), 'utf8')).projects.default;
}

function identityToken() {
    // gcloud is a .cmd shim on Windows, which only runs through a shell.
    const result = spawnSync('gcloud', ['auth', 'print-identity-token'], {
        encoding: 'utf8',
        shell: process.platform === 'win32'
    });
    if (result.status !== 0 || !result.stdout.trim()) {
        throw new Error('Could not get an identity token. Run `gcloud auth login` first.');
    }
    return result.stdout.trim();
}

/** Resolves to { status, body } (body parsed as JSON when possible). No client-side timeout. */
export function callFunction(name, data, { emulator = false } = {}) {
    const project = projectId();
    const url = new URL(emulator
        ? `http://127.0.0.1:5001/${project}/${REGION}/${name}`
        : `https://${REGION}-${project}.cloudfunctions.net/${name}`);
    const headers = { 'Content-Type': 'application/json' };
    if (!emulator) headers['X-Serverless-Authorization'] = `Bearer ${identityToken()}`;

    // node:http has no response timeout by default; some operator functions run for an hour.
    const client = url.protocol === 'https:' ? https : http;
    return new Promise((resolve, reject) => {
        const req = client.request(url, { method: 'POST', headers }, (res) => {
            let text = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => (text += chunk));
            res.on('end', () => {
                let body = text;
                try {
                    body = JSON.parse(text);
                } catch {
                    // keep raw text (e.g. an HTML error page)
                }
                resolve({ status: res.statusCode ?? 0, body });
            });
        });
        req.on('error', reject);
        req.end(JSON.stringify({ data }));
    });
}
