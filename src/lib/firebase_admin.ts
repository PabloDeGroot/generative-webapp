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

// Reuse the default app when this module is evaluated again (Vite re-runs server modules on
// hot reload). Only the default app counts: in production the firebase-frameworks runtime
// initializes its own named app first, and getAuth()/getFirestore() need the default one.
const app = getApps().find((a) => a.name === '[DEFAULT]') ?? initializeApp({
    credential: applicationDefault(),
    projectId: PUBLIC_FIREBASE_PROJECT_ID
});
export default app;
