import type { ImageProxySources } from '$toolkits/shared/image-proxy';

// Each toolkit declares the real-image hosts it proxies in functions/src/toolkits/<id>/image-proxy.ts
// (dependency-free, so it bundles here too); the /__media route serves only the request's toolkit's.
const modules = import.meta.glob<ImageProxySources>([
    '$toolkits/*/image-proxy.ts',
    '!$toolkits/shared/image-proxy.ts'
], {
    eager: true,
    import: 'IMAGE_SOURCES'
});

const byToolkit = new Map<string, ImageProxySources>(
    Object.entries(modules).map(([file, sources]) => [file.split('/').at(-2)!, sources])
);

export function imageSourcesFor(toolkitId: string): ImageProxySources {
    return byToolkit.get(toolkitId) ?? {};
}
