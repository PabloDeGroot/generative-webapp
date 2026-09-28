// Real images a toolkit serves from the site's own origin, through the SvelteKit route
// src/routes/__media/[source]/[...path]: /__media/<source>/<path> is fetched from base + path.
// A toolkit declares its sources in toolkits/<id>/image-proxy.ts (export const IMAGE_SOURCES),
// which the SvelteKit server imports too, so that file (and this one) must stay dependency-free.

/** URL prefix of the proxy route: /__media/<source>/<path>. */
export const IMAGE_PROXY_PREFIX = "/__media/";

export interface ImageProxySource {
    /** Upstream URL prefix; the request path is appended to it. */
    base: string;
    /** Allowlist for the (still percent-encoded) path after /__media/<source>/. */
    path: RegExp;
    /** Extra headers for the server-side fetch. */
    headers?: Record<string, string>;
    /**
     * In production, answer with a redirect to the upstream URL instead of fetching it: for hosts
     * that block datacenter IPs but let browsers through.
     */
    redirectInProduction?: boolean;
}

export type ImageProxySources = Record<string, ImageProxySource>;
