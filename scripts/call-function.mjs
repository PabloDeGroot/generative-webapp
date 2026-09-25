#!/usr/bin/env node
// Call a callable-format Cloud Function as the project operator, e.g. the IAM-private
// initializeComponents / updateComponents / resetComponents.
//
//   npm run call -- resetComponents '{"toolkit":"travel","confirm":"RESET"}'
//   npm run call -- initializeComponents '{"toolkit":"travel","prompt":"..."}' --emulator
//
// See scripts/lib/functions-client.mjs for how the request is authenticated.
import { callFunction } from './lib/functions-client.mjs';

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

try {
    const { status, body } = await callFunction(name, data, { emulator });
    console.log(`HTTP ${status}`);
    console.log(typeof body === 'string' ? body : JSON.stringify(body));
    process.exit(status === 200 ? 0 : 1);
} catch (error) {
    console.error(`Request failed: ${error.message}`);
    process.exit(1);
}
