// Component scripts are served from the site itself by src/routes/__components/[...path]/+server.ts,
// which reads them from Firebase Storage with firebase-admin. That sidesteps everything that
// breaks direct Storage URLs: storage.rules deny client reads, the server's service account
// can't sign URLs, and module scripts from another origin would need bucket CORS.
export const COMPONENT_SOURCE_PREFIX = '/__components';

/** Same-origin URL for a component stored at gs://<bucket>/<path>; null if gsPath isn't one. */
export function componentSourceUrl(gsPath: string): string | null {
    const match = gsPath.match(/^gs:\/\/[^/]+\/(.+)$/);
    if (!match) return null;
    return `${COMPONENT_SOURCE_PREFIX}/${match[1].split('/').map(encodeURIComponent).join('/')}`;
}
