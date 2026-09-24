// In dev, component scripts are served through a same-origin proxy route
// (src/routes/__dev-storage/[bucket]/[...path]/+server.ts) that reads them from the
// Storage emulator with firebase-admin. The emulator enforces storage.rules, which deny
// all reads; production sidesteps the rules with signed URLs, which the emulator can't mint.
export const DEV_STORAGE_PREFIX = '/__dev-storage';

export function devStorageUrl(bucket: string, objectPath: string): string {
    const encodedPath = objectPath.split('/').map(encodeURIComponent).join('/');
    return `${DEV_STORAGE_PREFIX}/${encodeURIComponent(bucket)}/${encodedPath}`;
}
