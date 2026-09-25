#!/usr/bin/env node
// Hand-defined starter components, kept in starter-components/<toolkit>/ (see its README).
//
//   npm run components:install -- <toolkit> [ids...] [--overwrite] [--emulator]
//       Installs the toolkit's starter kit (or just the given ids) into its component library.
//       Existing components are skipped unless --overwrite.
//   npm run components:pull -- <toolkit> [ids...] [--overwrite] [--emulator]
//       Copies components from the library into the starter kit so they can be kept and edited.
//       Existing files are kept unless --overwrite.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { callFunction, repoRoot } from './lib/functions-client.mjs';

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const [command, toolkit, ...ids] = args.filter((a) => !a.startsWith('--'));
const emulator = flags.has('--emulator');
const overwrite = flags.has('--overwrite');

if (!['install', 'pull'].includes(command) || !toolkit) {
    console.error('usage: npm run components:install|components:pull -- <toolkit> [ids...] [--overwrite] [--emulator]');
    process.exit(1);
}

const kitDir = join(repoRoot, 'starter-components', toolkit);

async function call(name, data) {
    const { status, body } = await callFunction(name, { toolkit, ...data }, { emulator });
    if (status !== 200) {
        console.error(`${name} failed (HTTP ${status}): ${typeof body === 'string' ? body.slice(0, 300) : JSON.stringify(body.error ?? body)}`);
        process.exit(1);
    }
    return body.result;
}

async function install() {
    if (!existsSync(kitDir)) {
        console.error(`No starter kit at starter-components/${toolkit}/.`);
        process.exit(1);
    }
    const wanted = new Set(ids);
    const components = readdirSync(kitDir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.slice(0, -'.json'.length))
        .filter((id) => wanted.size === 0 || wanted.has(id))
        .sort()
        .map((id) => {
            const { prompt, ...spec } = JSON.parse(readFileSync(join(kitDir, `${id}.json`), 'utf8'));
            if (spec.id && spec.id !== id) throw new Error(`${id}.json declares id '${spec.id}'; the file name must match.`);
            const codeFile = join(kitDir, `${id}.js`);
            return { spec: { ...spec, id }, prompt, code: existsSync(codeFile) ? readFileSync(codeFile, 'utf8') : undefined };
        });
    const missing = [...wanted].filter((id) => !components.some((c) => c.spec.id === id));
    if (missing.length) console.warn(`not in the starter kit: ${missing.join(', ')}`);
    if (!components.length) return console.log('Nothing to install.');

    const handWritten = components.filter((c) => c.code).length;
    console.log(`Installing ${components.length} component(s) into '${toolkit}' (${handWritten} hand-written, ${components.length - handWritten} generated from their spec)…`);
    const { results } = await call('installComponents', { components, overwrite });
    for (const r of results) {
        const how = r.status === 'installed' ? (r.generated ? ' (generated from spec)' : ' (hand-written)') : '';
        console.log(`  ${r.status.padEnd(9)} ${r.id}${how}${r.reason ? ` — ${r.reason}` : ''}`);
    }
    if (results.some((r) => r.status === 'rejected')) process.exit(1);
}

async function pull() {
    const { components } = await call('exportComponents', ids.length ? { ids } : {});
    if (!components.length) return console.log('No matching components in the library.');
    mkdirSync(kitDir, { recursive: true });
    for (const c of components) {
        if (!c.spec) {
            console.log(`  skipped   (no spec stored for this component)`);
            continue;
        }
        const jsonFile = join(kitDir, `${c.spec.id}.json`);
        if (existsSync(jsonFile) && !overwrite) {
            console.log(`  kept      ${c.spec.id} (already in the kit; --overwrite to replace)`);
            continue;
        }
        writeFileSync(jsonFile, JSON.stringify({ prompt: c.prompt, ...c.spec }, null, 2) + '\n');
        writeFileSync(join(kitDir, `${c.spec.id}.js`), c.code.trimStart());
        console.log(`  pulled    ${c.spec.id} (${c.origin})`);
    }
}

try {
    await (command === 'install' ? install() : pull());
} catch (error) {
    console.error(error.message);
    process.exit(1);
}
