import { load } from 'cheerio';
import { RESIZE_SCRIPT } from '../resize-script';
import { EmbedProxyError, fetchPage, type FetchPageOptions } from './fetch-page';

export { EmbedProxyError, type FetchPageOptions as EmbedProxyOptions };

interface ProxyResult {
  status: number;
  headers: Record<string, string>;
  body: string;
}

// The sandbox gives proxied pages an opaque origin, so they cannot read the host site's cookies or storage.
const SECURITY_HEADERS = {
  'Content-Security-Policy': 'sandbox allow-scripts allow-popups allow-forms',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
};

// Client-side routers build history URLs from the base URL, which browsers reject as cross-origin
// and which would crash the page. Runs before the page's own scripts.
const HISTORY_GUARD = `(function () {
  ['pushState', 'replaceState'].forEach(function (name) {
    var original = history[name];
    history[name] = function () {
      try {
        return original.apply(history, arguments);
      } catch (error) {
        if (error.name !== 'SecurityError') throw error;
      }
    };
  });
})();`;

/** Adds the resize script, and a base URL so the page's relative links keep pointing at its own site. */
export function injectResizeScript(html: string, baseUrl: string): string {
  const $ = load(html);
  if ($('base[href]').length === 0) {
    $('head').prepend($('<base>').attr('href', baseUrl));
  }
  $('head').prepend(`<script>${HISTORY_GUARD}</script>`);
  $('body').append(`<script>${RESIZE_SCRIPT}</script>`);
  return $.html();
}

function jsonError(status: number, message: string, extraHeaders: Record<string, string> = {}): ProxyResult {
  return {
    status,
    headers: { ...SECURITY_HEADERS, 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify({ error: message }),
  };
}

async function handle(method: string | undefined, url: string | null, options: FetchPageOptions): Promise<ProxyResult> {
  // HEAD lets the component detect the route without loading a page.
  if (method === 'HEAD') return { status: 200, headers: SECURITY_HEADERS, body: '' };
  if (method !== 'GET') return jsonError(405, 'Method not allowed', { Allow: 'GET, HEAD' });
  if (!url) return jsonError(400, 'The url query parameter is required');

  try {
    const page = await fetchPage(url, options);
    return {
      status: 200,
      headers: { ...SECURITY_HEADERS, 'Content-Type': 'text/html; charset=utf-8' },
      body: injectResizeScript(page.html, page.finalUrl),
    };
  } catch (error) {
    if (error instanceof EmbedProxyError) return jsonError(error.status, error.message);
    throw error;
  }
}

/** Route handler for the Next.js App Router and other Web-standard runtimes on Node.js. */
export function createEmbedProxy(options: FetchPageOptions = {}) {
  return async function embedProxy(request: Request): Promise<Response> {
    const url = new URL(request.url).searchParams.get('url');
    const result = await handle(request.method, url, options);
    return new Response(request.method === 'HEAD' ? null : result.body, {
      status: result.status,
      headers: result.headers,
    });
  };
}

interface PagesRequest {
  method?: string;
  query: Partial<Record<string, string | string[]>>;
}

interface PagesResponse {
  setHeader(name: string, value: string): unknown;
  status(code: number): { send(body: string): unknown };
}

/** API route handler for the Next.js Pages Router. */
export function createPagesEmbedProxy(options: FetchPageOptions = {}) {
  return async function embedProxy(req: PagesRequest, res: PagesResponse): Promise<void> {
    const { url } = req.query;
    const result = await handle(req.method, typeof url === 'string' ? url : null, options);
    for (const [name, value] of Object.entries(result.headers)) {
      res.setHeader(name, value);
    }
    res.status(result.status).send(result.body);
  };
}
