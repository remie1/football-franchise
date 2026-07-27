/**
 * The network seam.
 *
 * Everything above this file is offline-testable: sources, parsers, manifests and the cache all
 * take a `Fetcher`. `httpFetcher` is the only thing in the package that opens a socket, and
 * `fixtureFetcher` substitutes for it in every test.
 *
 * Retries use fixed exponential backoff with no jitter — deliberately no randomness, so nothing
 * here needs the contracts PRNG and nothing here can drift.
 */

import { get as httpsGet } from "node:https";
import { gunzipSync } from "node:zlib";

export interface FetchResponse {
  /** The URL that finally served the bytes (after redirects). */
  readonly url: string;
  readonly status: number;
  readonly body: Uint8Array;
}

export interface Fetcher {
  fetch(url: string): Promise<FetchResponse>;
}

export class FetchError extends Error {
  readonly url: string;
  readonly status: number | null;
  constructor(url: string, status: number | null, message: string) {
    super(`fetch ${url} failed${status === null ? "" : ` (HTTP ${status})`}: ${message}`);
    this.name = "FetchError";
    this.url = url;
    this.status = status;
  }
}

export interface HttpFetcherOptions {
  readonly timeoutMs?: number;
  readonly maxRedirects?: number;
  readonly retries?: number;
  readonly backoffMs?: number;
  readonly userAgent?: string;
  /** Injectable so retry tests do not actually sleep. */
  readonly sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export function httpFetcher(options: HttpFetcherOptions = {}): Fetcher {
  const timeoutMs = options.timeoutMs ?? 120_000;
  const maxRedirects = options.maxRedirects ?? 5;
  const retries = options.retries ?? 3;
  const backoffMs = options.backoffMs ?? 1_000;
  const userAgent = options.userAgent ?? "ff-calibration/0.1 (+nflverse ingest)";
  const sleep = options.sleep ?? defaultSleep;

  async function once(url: string, redirectsLeft: number): Promise<FetchResponse> {
    return new Promise<FetchResponse>((resolve, reject) => {
      const req = httpsGet(
        url,
        { headers: { "user-agent": userAgent, accept: "*/*" }, timeout: timeoutMs },
        (res) => {
          const status = res.statusCode ?? 0;
          const location = res.headers.location;
          if (status >= 300 && status < 400 && typeof location === "string") {
            res.resume();
            if (redirectsLeft <= 0) {
              reject(new FetchError(url, status, "too many redirects"));
              return;
            }
            once(new URL(location, url).toString(), redirectsLeft - 1).then(resolve, reject);
            return;
          }
          if (status < 200 || status >= 300) {
            res.resume();
            reject(new FetchError(url, status, res.statusMessage ?? "non-2xx"));
            return;
          }
          const chunks: Buffer[] = [];
          res.on("data", (c: Buffer) => chunks.push(c));
          res.on("error", (e: Error) => reject(new FetchError(url, status, e.message)));
          res.on("end", () => resolve({ url, status, body: Buffer.concat(chunks) }));
        },
      );
      req.on("timeout", () => {
        req.destroy();
        reject(new FetchError(url, null, `timed out after ${timeoutMs}ms`));
      });
      req.on("error", (e: Error) => reject(new FetchError(url, null, e.message)));
    });
  }

  return {
    async fetch(url: string): Promise<FetchResponse> {
      let lastError: unknown;
      for (let attempt = 0; attempt <= retries; attempt++) {
        if (attempt > 0) await sleep(backoffMs * 2 ** (attempt - 1));
        try {
          return await once(url, maxRedirects);
        } catch (e) {
          lastError = e;
          // 4xx other than 429 will not become true on retry
          if (e instanceof FetchError && e.status !== null && e.status >= 400 && e.status < 500 && e.status !== 429) {
            throw e;
          }
        }
      }
      throw lastError instanceof Error ? lastError : new FetchError(url, null, String(lastError));
    },
  };
}

/**
 * Serves bytes from an in-memory map. The substitute used by every test, and the fallback that
 * lets the whole ingestion layer be exercised end to end with no network at all.
 */
export function fixtureFetcher(files: Readonly<Record<string, string | Uint8Array>>): Fetcher {
  return {
    async fetch(url: string): Promise<FetchResponse> {
      const hit = files[url];
      if (hit === undefined) {
        throw new FetchError(url, 404, `no fixture registered (have ${Object.keys(files).length})`);
      }
      const body = typeof hit === "string" ? new TextEncoder().encode(hit) : hit;
      return { url, status: 200, body };
    },
  };
}

/** Counts calls; useful for asserting cache hits avoid the network. */
export function countingFetcher(inner: Fetcher): Fetcher & { readonly calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async fetch(url: string): Promise<FetchResponse> {
      calls.push(url);
      return inner.fetch(url);
    },
  };
}

/** gzip magic number. */
export function isGzip(body: Uint8Array): boolean {
  return body.length >= 2 && body[0] === 0x1f && body[1] === 0x8b;
}

/**
 * Decode a fetched payload to text, gunzipping when the bytes say so (rather than trusting the
 * file extension — nflverse serves both, and a `.csv` that is actually gzipped would otherwise
 * parse as one enormous garbage header).
 */
export function decodeText(body: Uint8Array): string {
  const bytes = isGzip(body) ? gunzipSync(body) : body;
  return new TextDecoder("utf-8").decode(bytes);
}
