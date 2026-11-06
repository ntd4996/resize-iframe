import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { gzipSync } from 'node:zlib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { isPublicAddress } from '../src/server/address';
import { createEmbedProxy, createPagesEmbedProxy, injectResizeScript } from '../src/server';

let server: Server;
let origin: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    switch (req.url) {
      case '/page':
        res.setHeader('Content-Type', 'text/html');
        res.end('<html><head><title>t</title></head><body><img src="a.png"></body></html>');
        break;
      case '/gzip':
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Encoding', 'gzip');
        res.end(gzipSync('<p>compressed</p>'));
        break;
      case '/redirect':
        res.writeHead(302, { Location: '/page' });
        res.end();
        break;
      case '/loop':
        res.writeHead(302, { Location: '/loop' });
        res.end();
        break;
      case '/to-file':
        res.writeHead(302, { Location: 'file:///etc/passwd' });
        res.end();
        break;
      case '/to-localhost':
        res.writeHead(302, { Location: origin.replace('127.0.0.1', 'localhost') });
        res.end();
        break;
      case '/json':
        res.setHeader('Content-Type', 'application/json');
        res.end('{}');
        break;
      case '/huge':
        res.setHeader('Content-Type', 'text/html');
        res.end('x'.repeat(2048));
        break;
      case '/slow':
        break;
      default:
        res.statusCode = 404;
        res.end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.closeAllConnections();
  server.close();
});

const proxyGet = (handler: (request: Request) => Promise<Response>, target: string) =>
  handler(new Request(`http://host.test/api/embed?url=${encodeURIComponent(target)}`));

describe('isPublicAddress', () => {
  it.each(['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '0.0.0.0', '::1', '::', 'fe80::1', 'fd00::1', '::ffff:127.0.0.1', '::ffff:169.254.169.254', '64:ff9b::7f00:1'])(
    'blocks %s',
    (address) => {
      expect(isPublicAddress(address)).toBe(false);
    },
  );

  it.each(['1.1.1.1', '8.8.8.8', '2606:4700:4700::1111'])('allows %s', (address) => {
    expect(isPublicAddress(address)).toBe(true);
  });
});

describe('createEmbedProxy with default rules', () => {
  const proxy = createEmbedProxy();

  it.each(['http://127.0.0.1/', 'http://localhost/', 'http://[::1]/', 'http://169.254.169.254/latest/meta-data/', 'http://2130706433/', 'http://0x7f.1/'])(
    'refuses %s',
    async (target) => {
      const response = await proxyGet(proxy, target);
      expect(response.status).toBe(403);
    },
  );

  it('refuses non-http schemes and a missing url', async () => {
    expect((await proxyGet(proxy, 'file:///etc/passwd')).status).toBe(400);
    expect((await proxy(new Request('http://host.test/api/embed'))).status).toBe(400);
  });

  it('answers HEAD without loading a page and rejects other methods', async () => {
    expect((await proxy(new Request('http://host.test/api/embed', { method: 'HEAD' }))).status).toBe(200);
    const post = await proxy(new Request('http://host.test/api/embed', { method: 'POST' }));
    expect(post.status).toBe(405);
    expect(post.headers.get('allow')).toBe('GET, HEAD');
  });
});

describe('createEmbedProxy with a reachable page', () => {
  const proxy = createEmbedProxy({ allowPrivateNetwork: true, maxBytes: 1024, timeoutMs: 300 });

  it('injects the script and base url and sandboxes the response', async () => {
    const response = await proxyGet(proxy, `${origin}/page`);
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-security-policy')).toContain('sandbox allow-scripts');
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(html).toContain(`<base href="${origin}/page">`);
    expect(html).toContain('iframe-resize');
  });

  it('follows redirects and uses the final address as the base', async () => {
    const html = await (await proxyGet(proxy, `${origin}/redirect`)).text();
    expect(html).toContain(`<base href="${origin}/page">`);
  });

  it('decodes compressed pages', async () => {
    expect(await (await proxyGet(proxy, `${origin}/gzip`)).text()).toContain('compressed');
  });

  it.each([
    ['/loop', 502],
    ['/to-file', 502],
    ['/missing', 502],
    ['/json', 415],
    ['/huge', 413],
    ['/slow', 504],
  ])('maps %s to status %i', async (path, status) => {
    expect((await proxyGet(proxy, `${origin}${path}`)).status).toBe(status);
  });

  it('applies allowedHosts', async () => {
    const restricted = createEmbedProxy({ allowPrivateNetwork: true, allowedHosts: ['example.com'] });
    expect((await proxyGet(restricted, `${origin}/page`)).status).toBe(403);
  });
});

describe('redirects', () => {
  it('applies the access rules to every hop', async () => {
    const proxy = createEmbedProxy({ allowPrivateNetwork: true, allowedHosts: ['127.0.0.1'] });
    expect((await proxyGet(proxy, `${origin}/to-localhost`)).status).toBe(403);
  });
});

describe('createPagesEmbedProxy', () => {
  it('writes the result through the Next.js response object', async () => {
    const headers: Record<string, string> = {};
    let status = 0;
    let body = '';
    await createPagesEmbedProxy()(
      { method: 'GET', query: {} },
      {
        setHeader: (name, value) => (headers[name] = value),
        status: (code) => {
          status = code;
          return { send: (text) => (body = text) };
        },
      },
    );
    expect(status).toBe(400);
    expect(JSON.parse(body).error).toBeTruthy();
    expect(headers['Content-Type']).toBe('application/json');
  });
});

describe('injectResizeScript', () => {
  it('keeps a base tag the page already has', () => {
    const html = injectResizeScript('<head><base href="/x/"></head><body></body>', 'https://a.test/');
    expect(html).not.toContain('https://a.test/');
  });

  it('guards the history API before any script of the page runs', () => {
    const html = injectResizeScript('<head><script src="app.js"></script></head><body></body>', 'https://a.test/');
    expect(html.indexOf('replaceState')).toBeGreaterThan(-1);
    expect(html.indexOf('replaceState')).toBeLessThan(html.indexOf('app.js'));
  });

  it('escapes the base url', () => {
    const html = injectResizeScript('<p>x</p>', 'https://a.test/"><script>alert(1)</script>');
    expect(html).not.toContain('"><script>alert');
  });
});
