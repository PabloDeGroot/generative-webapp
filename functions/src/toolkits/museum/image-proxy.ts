import type { ImageProxySources } from "../shared/image-proxy";

// The museum's real images, served as same-origin /__media/<source>/... URLs (see shared/image-proxy.ts).
// Imported by the SvelteKit server as well as by sources.ts: keep this file dependency-free.
//   /__media/aic/<image_id>/full/843,/0/default.jpg   Art Institute of Chicago IIIF
//   /__media/met/<path>                               Met Museum (images.metmuseum.org/CRDImages/…)
//   /__media/wiki/<path>                              Wikimedia (upload.wikimedia.org/wikipedia/…)
// AIC's image server sits behind a Cloudflare bot challenge that only lets through requests with an
// https Referer, and it also blocks the datacenter IPs production runs on. So AIC images are
// fetched server-side only in dev (museum.localhost pages send no https Referer); in production
// the proxy redirects, and the browser fetches the image itself with the page's https Referer.
export const IMAGE_SOURCES: ImageProxySources = {
    aic: {
        base: "https://www.artic.edu/iiif/2/",
        path: /^[0-9a-f-]{36}\/(full|square|\d+,\d+,\d+,\d+)\/(full|max|\d*,\d*|!\d+,\d+)\/0\/default\.jpg$/,
        headers: { Referer: "https://groots.es/" },
        redirectInProduction: true
    },
    met: { base: "https://images.metmuseum.org/CRDImages/", path: /^[\w\-./%]+\.(jpe?g|png)$/i },
    wiki: { base: "https://upload.wikimedia.org/wikipedia/", path: /^[\w\-./%(),'!~]+\.(jpe?g|png|gif|webp|svg)(\/[\w\-.%(),'!~]+)?$/i }
};
