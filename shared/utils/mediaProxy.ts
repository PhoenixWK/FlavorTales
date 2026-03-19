/**
 * Client-side helpers that route R2 media URLs through Next.js server-side
 * proxy routes, avoiding direct browser requests that hit the private R2
 * storage endpoint (which requires AWS SigV4 signing).
 */

/** Proxy an R2 image/file URL through /api/file/serve */
export function proxyFileUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return `/api/file/serve?url=${encodeURIComponent(url)}`;
}

/** Proxy an R2 audio URL through /api/audio/serve */
export function proxyAudioUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return `/api/audio/serve?url=${encodeURIComponent(url)}`;
}
