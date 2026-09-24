import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { dev } from '$app/environment';
import { PUBLIC_FIREBASE_PROJECT_ID } from '$env/static/public';

// In dev, point firebase-admin at the local emulators (ports from firebase.json).
// The SDK reads these variables itself; an explicitly set value wins.
if (dev) {
    process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:5003';
    process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
    process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= '127.0.0.1:9199';
}

let app = initializeApp({
    credential: applicationDefault(),
    projectId: PUBLIC_FIREBASE_PROJECT_ID
});
export default app;
