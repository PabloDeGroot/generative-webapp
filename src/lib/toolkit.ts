// Site domains ("toolkits") the app can serve. Keep in sync with the registry in
// functions/src/toolkits/registry.ts.
export const KNOWN_TOOLKIT_IDS = ['dictionary', 'travel', 'community', 'demo'] as const;

// Each toolkit has its own component library (see functions/src/component-manager.ts):
// shared components, plus per-user overrides.
export function sharedLibraryPath(toolkitId: string): string {
    return `toolkits/${toolkitId}/components`;
}

export function userLibraryPath(userId: string, toolkitId: string): string {
    return `users/${userId}/toolkits/${toolkitId}/components`;
}

// Browser-side: the server stamps the request's toolkit on <html data-toolkit> (hooks.server.ts).
export function pageToolkitId(): string {
    return document.documentElement.dataset.toolkit ?? '';
}
