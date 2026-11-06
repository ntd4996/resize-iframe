import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import type { LookupFunction } from 'node:net';
import { isIP } from 'node:net';
import type { Readable } from 'node:stream';
import zlib from 'node:zlib';
import { hostMatches, parseHttpUrl } from '../url';
import { isPublicAddress } from './address';

export class EmbedProxyError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'EmbedProxyError';
  }
}

export interface FetchPageOptions {
  /** Domains the proxy may load, subdomains included. Unset allows any public host. */
  allowedHosts?: string[];
  /** Allows loopback and private addresses. Meant for local development only. */
  allowPrivateNetwork?: boolean;
  /** Limit for the decoded HTML. Defaults to 5 MB. */
  maxBytes?: number;
  /** Limit for the whole request, redirects included. Defaults to 10 seconds. */
  timeoutMs?: number;
}

export interface FetchedPage {
  html: string;
  /** Address after redirects, which relative links in the page resolve against. */
  finalUrl: string;
}

const MAX_REDIRECTS = 5;
const USER_AGENT = 'Mozilla/5.0 (compatible; embed-react; +https://github.com/ntd4996/resize-iframe)';

/**
 * Validates addresses when the socket connects, not in a separate earlier lookup,
 * so a DNS record that changes between the check and the request cannot get through.
 */
const publicOnlyLookup: LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) {
      callback(error, '', 0);
      return;
    }
    if (addresses.length === 0 || !addresses.every(({ address }) => isPublicAddress(address))) {
      callback(new EmbedProxyError(403, 'This host is not allowed'), '', 0);
      return;
    }
    if (options.all) {
      (callback as unknown as (err: null, list: dns.LookupAddress[]) => void)(null, addresses);
    } else {
      callback(null, addresses[0].address, addresses[0].family);
    }
  });
};

function assertAllowed(url: URL, options: FetchPageOptions): void {
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const { allowedHosts, allowPrivateNetwork } = options;
  if (allowedHosts && !allowedHosts.some((domain) => hostMatches(host, domain))) {
    throw new EmbedProxyError(403, 'This host is not allowed');
  }
  if (!allowPrivateNetwork && isIP(host) !== 0 && !isPublicAddress(host)) {
    throw new EmbedProxyError(403, 'This host is not allowed');
  }
}

function request(url: URL, options: FetchPageOptions, signal: AbortSignal): Promise<http.IncomingMessage> {
  const send = url.protocol === 'https:' ? https.request : http.request;
  return new Promise((resolve, reject) => {
    send(
      url,
      {
        signal,
        agent: false,
        lookup: options.allowPrivateNetwork ? undefined : publicOnlyLookup,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
        },
      },
      resolve,
    )
      .on('error', reject)
      .end();
  });
}

function decodedBody(response: http.IncomingMessage): Readable {
  switch (response.headers['content-encoding']) {
    case 'gzip':
      return response.pipe(zlib.createGunzip());
    case 'deflate':
      return response.pipe(zlib.createInflate());
    case 'br':
      return response.pipe(zlib.createBrotliDecompress());
    default:
      return response;
  }
}

async function readHtml(response: http.IncomingMessage, maxBytes: number): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of decodedBody(response)) {
    size += (chunk as Buffer).length;
    if (size > maxBytes) {
      response.destroy();
      throw new EmbedProxyError(413, 'The page is too large to embed');
    }
    chunks.push(chunk as Buffer);
  }
  const charset = /charset=["']?([\w-]+)/i.exec(response.headers['content-type'] ?? '')?.[1];
  try {
    return new TextDecoder(charset).decode(Buffer.concat(chunks));
  } catch {
    return Buffer.concat(chunks).toString('utf8');
  }
}

/** Downloads an HTML page, applying the access rules to every redirect hop. */
export async function fetchPage(rawUrl: string, options: FetchPageOptions = {}): Promise<FetchedPage> {
  const { maxBytes = 5 * 1024 * 1024, timeoutMs = 10_000 } = options;
  const signal = AbortSignal.timeout(timeoutMs);
  let url = parseHttpUrl(rawUrl);
  if (!url) throw new EmbedProxyError(400, 'A valid http or https URL is required');

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      assertAllowed(url, options);
      const response = await request(url, options, signal);
      const status = response.statusCode ?? 502;

      if (status >= 300 && status < 400 && response.headers.location) {
        response.destroy();
        const next: URL | null = parseHttpUrl(response.headers.location, url.href);
        if (!next) throw new EmbedProxyError(502, 'The page redirected to an unsupported address');
        url = next;
        continue;
      }
      if (status < 200 || status >= 300) {
        response.destroy();
        throw new EmbedProxyError(502, `The page responded with status ${status}`);
      }
      if (!/\b(text\/html|application\/xhtml\+xml)\b/i.test(response.headers['content-type'] ?? 'text/html')) {
        response.destroy();
        throw new EmbedProxyError(415, 'The URL does not point to an HTML page');
      }
      return { html: await readHtml(response, maxBytes), finalUrl: url.href };
    }
    throw new EmbedProxyError(502, 'The page redirected too many times');
  } catch (error) {
    if (error instanceof EmbedProxyError) throw error;
    if (signal.aborted) throw new EmbedProxyError(504, 'The page took too long to respond');
    throw new EmbedProxyError(502, 'The page could not be loaded');
  }
}
