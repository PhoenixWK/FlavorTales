/**
 * AWS Signature V4 for Cloudflare R2 (S3-compatible API).
 * Used ONLY in Next.js server-side API routes — NOT in client-side code.
 *
 * Background: the backend stores file URLs using the private S3 storage
 * endpoint  (e.g. https://{accountId}.r2.cloudflarestorage.com/{objectKey}).
 * Direct browser access to this endpoint is blocked without valid AWS
 * credentials.  The Next.js proxy signs each request using SigV4 so the
 * backend credentials never leave the server.
 */
import { createHmac, createHash } from "crypto";

// ── R2 credentials (server-side only, never exposed to the browser) ────────────
const R2_ACCOUNT_ID =
  process.env.R2_ACCOUNT_ID ?? "aabcd676fd13ede206644019086ca8d1";
const R2_ACCESS_KEY =
  process.env.R2_ACCESS_KEY_ID ?? "a9696023c62be72b4cdb3a6916f78c6c";
const R2_SECRET_KEY =
  process.env.R2_SECRET_ACCESS_KEY ??
  "e614ddaf8b82cfaf7a6b2e2f883e41c63ddffda1a1d9ad0aee86968085764e06";
const R2_BUCKET = process.env.R2_BUCKET_NAME ?? "flavortales";

// The private S3-compatible hostname: {accountId}.r2.cloudflarestorage.com
export const R2_STORAGE_HOST = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

// ── Helpers ────────────────────────────────────────────────────────────────────

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest() as Buffer;
}

function sha256Hex(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

function deriveSigningKey(
  secret: string,
  date: string,
  region: string,
  service: string
): Buffer {
  return hmac(
    hmac(hmac(hmac("AWS4" + secret, date), region), service),
    "aws4_request"
  );
}

/**
 * Percent-encode a single URI path segment per RFC 3986 / SigV4 S3 rules.
 * Decodes first to normalise any existing encoding, then re-encodes cleanly.
 */
function encodeSegment(s: string): string {
  return encodeURIComponent(decodeURIComponent(s)).replace(
    /[!'()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

function toCanonicalUri(path: string): string {
  return path
    .split("/")
    .map((seg) => (seg === "" ? "" : encodeSegment(seg)))
    .join("/");
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Returns true when the URL's hostname is the private R2 storage endpoint.
 * In that case the request needs AWS Signature V4 to succeed.
 */
export function isPrivateR2Url(rawUrl: string): boolean {
  try {
    const { hostname } = new URL(rawUrl);
    return hostname.toLowerCase() === R2_STORAGE_HOST;
  } catch {
    return false;
  }
}

/**
 * Build the correct S3-path URL and signed headers for a GET request
 * against an object identified by its stored URL from the database.
 *
 * Stored URL format (no bucket in path):
 *   https://{accountId}.r2.cloudflarestorage.com/{objectKey}
 *
 * S3 API format (bucket in path):
 *   https://{accountId}.r2.cloudflarestorage.com/{bucket}/{objectKey}
 */
export function buildSignedR2Request(
  storedUrl: string,
  rangeHeader?: string
): { url: string; headers: Record<string, string> } {
  const parsed = new URL(storedUrl);
  // Prepend bucket to path: "/{objectKey}" → "/{bucket}/{objectKey}"
  const s3Path = `/${R2_BUCKET}${parsed.pathname}`;
  const s3Url = `https://${R2_STORAGE_HOST}${s3Path}`;

  const region = "auto"; // Cloudflare R2 uses "auto"
  const service = "s3";

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const datetime =
    now.getUTCFullYear() +
    pad(now.getUTCMonth() + 1) +
    pad(now.getUTCDate()) +
    "T" +
    pad(now.getUTCHours()) +
    pad(now.getUTCMinutes()) +
    pad(now.getUTCSeconds()) +
    "Z";
  const date = datetime.slice(0, 8);
  const payloadHash = sha256Hex(""); // empty body for GET

  // Build canonical headers (must be sorted lexicographically)
  const signHeaders: Record<string, string> = {
    host: R2_STORAGE_HOST,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": datetime,
  };
  if (rangeHeader) signHeaders["range"] = rangeHeader;

  const sortedNames = Object.keys(signHeaders).sort();
  const canonicalHeaders =
    sortedNames.map((k) => `${k}:${signHeaders[k]}`).join("\n") + "\n";
  const signedHeadersStr = sortedNames.join(";");

  const canonicalRequest = [
    "GET",
    toCanonicalUri(s3Path),
    "", // no query string
    canonicalHeaders,
    signedHeadersStr,
    payloadHash,
  ].join("\n");

  const credentialScope = `${date}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    datetime,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = deriveSigningKey(R2_SECRET_KEY, date, region, service);
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign, "utf8")
    .digest("hex");

  const authHeader = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeadersStr}, Signature=${signature}`;

  // fetch() headers — "host" is managed by Node.js fetch automatically
  const fetchHeaders: Record<string, string> = {
    Authorization: authHeader,
    "x-amz-date": datetime,
    "x-amz-content-sha256": payloadHash,
  };
  if (rangeHeader) fetchHeaders["range"] = rangeHeader;

  return { url: s3Url, headers: fetchHeaders };
}
