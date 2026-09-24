import { env } from '$env/dynamic/private';
import { KNOWN_TOOLKIT_IDS } from '$lib/toolkit';

// The toolkit is picked from the first label of the hostname: travel.groots.es -> "travel",
// travel.localhost -> "travel". Any other host uses TOOLKIT_ID (default "dictionary"), the same
// variable the functions use for requests that name no toolkit.
export function defaultToolkitId(): string {
    return env.TOOLKIT_ID?.trim() || 'dictionary';
}

export function resolveToolkitId(request: Request, url: URL): string {
    // Behind Firebase Hosting the visitor's host may only survive in X-Forwarded-Host.
    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
    const hostname = (forwardedHost || url.hostname).split(':')[0].toLowerCase();
    const label = hostname.split('.')[0];
    if (hostname.includes('.') && (KNOWN_TOOLKIT_IDS as readonly string[]).includes(label)) {
        return label;
    }
    return defaultToolkitId();
}

// Lets code that only receives the Request (PageGenerator) find the toolkit hooks.server.ts
// resolved for it, without threading the id through every call.
const requestToolkits = new WeakMap<Request, string>();

export function setRequestToolkit(request: Request, toolkitId: string): void {
    requestToolkits.set(request, toolkitId);
}

export function getRequestToolkit(request: Request): string {
    return requestToolkits.get(request) ?? defaultToolkitId();
}
