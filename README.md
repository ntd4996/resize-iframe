# embed-react

[![npm version](https://img.shields.io/npm/v/embed-react)](https://www.npmjs.com/package/embed-react)
[![npm downloads](https://img.shields.io/npm/dm/embed-react)](https://www.npmjs.com/package/embed-react)
[![CI](https://github.com/ntd4996/resize-iframe/actions/workflows/ci.yml/badge.svg)](https://github.com/ntd4996/resize-iframe/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/embed-react)](./LICENSE)

A React iframe that takes the height of the page inside it, so embedded content never gets its own scrollbar or a block of empty space below it.

**[Try the live demo](https://ntd4996.github.io/resize-iframe/)**

Links to X, Instagram, Facebook, TikTok, YouTube and LinkedIn render with the provider's own embed. Any other page loads through a small proxy route that you add to your Next.js app.

## Contents

- [Installation](#installation)
- [Quick start](#quick-start)
- [How it works](#how-it-works)
- [API](#api)
- [Security](#security)
- [Limitations](#limitations)
- [Troubleshooting](#troubleshooting)
- [Upgrading from 2.5 or earlier](#upgrading-from-25-or-earlier)
- [Development](#development)

## Installation

```bash
npm install embed-react react-social-media-embed
```

Requires React 18 or newer. The proxy requires Node.js 18.17 or newer.

## Quick start

**1. Render the component.**

```tsx
import { SmartEmbed } from 'embed-react';

export function Article() {
  return <SmartEmbed src="https://example.com/article" title="Article" />;
}
```

**2. Add the proxy route.** Social links work without it. Other pages need it to resize.

With the Pages Router, in `pages/api/embed.ts`:

```ts
import { createPagesEmbedProxy } from 'embed-react/server';

export default createPagesEmbedProxy({ allowedHosts: ['example.com'] });
```

With the App Router, in `app/api/embed/route.ts`:

```ts
import { createEmbedProxy } from 'embed-react/server';

const proxy = createEmbedProxy({ allowedHosts: ['example.com'] });

export const GET = proxy;
export const HEAD = proxy;
```

The component finds the route at `/api/embed` on its own. A working example is in [`examples/nextjs`](./examples/nextjs).

## How it works

Browsers do not let a page measure the content of a cross-origin iframe, so the embedded page has to report its own height. The proxy downloads the page, adds a small script that sends the height to the parent with `postMessage`, and serves the result inside a sandbox. The script keeps reporting as images load and content changes.

What you get depends on where the page comes from:

| Page | Setup | Result |
| --- | --- | --- |
| Social link | None | Provider's embed, sized by the provider |
| Same origin as your site | None | Resizes |
| Another origin, through the proxy | Proxy route | Resizes |
| Another origin, you control its code | Add the snippet below | Resizes |
| Another origin, no proxy | None | Keeps `initialHeight` and scrolls |

For a page you control, sending the message yourself avoids the proxy:

```js
window.parent.postMessage({ type: 'iframe-resize', height: document.documentElement.offsetHeight }, '*');
```

## API

### `<AutoIframe>`

The resizing iframe, without social link detection.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `src` | `string` | required | Page to embed. Only http and https URLs render. |
| `title` | `string` | `"Embedded content"` | Accessible name of the frame. |
| `width` | `string \| number` | `"100%"` | Numbers are pixels. |
| `initialHeight` | `number` | `600` | Height until the page reports its own. |
| `maxHeight` | `number` | `10000` | Upper limit for the reported height. |
| `apiEndpoint` | `string` | `"/api/embed"` | Path of the proxy route. |
| `useProxy` | `boolean` | detected | `true` always uses the proxy, `false` never does. |
| `className` | `string` | | Applied to the iframe. |
| `style` | `CSSProperties` | | Applied to the iframe. |

### `<SmartEmbed>`

Takes the same props as `AutoIframe`. Renders the provider's embed for social links and `AutoIframe` for everything else.

### `<EditableIframeItem>`

`SmartEmbed` with a title, a frame around it and an optional form for changing the URL and width.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `id` | `string` | required | Links the form's labels to its inputs. |
| `initialSrc` | `string` | required | Page to embed. |
| `title` | `string` | | Heading above the frame. |
| `initialWidth` | `string \| number` | `"100%"` | Numbers are pixels. |
| `enabledEdit` | `boolean` | `true` | Shows the Edit button. |
| `border` | `string \| boolean` | `"1px solid rgb(221, 221, 221)"` | `false` removes it. |
| `padding` | `string \| number` | `"1rem"` | |
| `marginBottom` | `string \| number` | `"3rem"` | |
| `backgroundColor` | `string` | `"rgb(249, 249, 249)"` | |
| `apiEndpoint` | `string` | `"/api/embed"` | Path of the proxy route. |
| `useProxy` | `boolean` | detected | `true` always uses the proxy, `false` never does. |

### `embed-react/server`

`createPagesEmbedProxy(options)` returns a Pages Router API handler. `createEmbedProxy(options)` returns a handler that takes a `Request` and returns a `Response`, for the App Router and other Node.js runtimes.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `allowedHosts` | `string[]` | any public host | Domains the proxy may load, subdomains included. |
| `allowPrivateNetwork` | `boolean` | `false` | Allows loopback and private addresses. For local development only. |
| `maxBytes` | `number` | 5 MB | Limit for the decoded HTML. |
| `timeoutMs` | `number` | `10000` | Limit for the whole request, redirects included. |

## Security

Set `allowedHosts` in production. Without it, anyone who can reach the route can use your server to load any public page, and the traffic comes from your IP address.

The proxy refuses loopback, private and link-local addresses, including cloud metadata endpoints. It checks them when the connection opens and again on every redirect, which also covers DNS records that change after the first lookup.

Pages are served with `Content-Security-Policy: sandbox`. That gives them an opaque origin, so they cannot read your site's cookies or storage.

## Limitations

- Sandboxed pages cannot use cookies or `localStorage`, so a page that depends on them may not load correctly through the proxy.
- Pages behind a login, and apps that choose content from the current URL, may render differently than on their own domain.
- The proxy needs the Node.js runtime and does not run on Edge.
- The terms of a site you do not own may restrict embedding its pages.

## Troubleshooting

**The frame stays at 600px and scrolls.** The page is not reporting a height. Open `/api/embed?url=<encoded page URL>` in the browser: a 404 means the route is missing, and a JSON error gives the reason the page was refused.

**The frame shows your own app.** Your host answers unknown paths with a 200, as single-page app fallbacks do, so the route looks like it exists. Set `useProxy={false}`.

**The proxy answers 403.** The host is outside `allowedHosts`, or it resolves to a private address. Use `allowPrivateNetwork` to test against a local server.

**The frame grows up to `maxHeight`.** The page sizes itself relative to the viewport, for example with `height: 110vh`, so each resize makes it taller. Lower `maxHeight`.

## Upgrading from 2.5 or earlier

If you copied a proxy from an older README, replace it. That code can load internal addresses and runs pages on your site's origin.

```diff
- // about 50 lines of fetch and cheerio code
+ import { createPagesEmbedProxy } from 'embed-react/server';
+
+ export default createPagesEmbedProxy({ allowedHosts: ['example.com'] });
```

Component props are unchanged. Imports from paths inside `dist/` no longer resolve, so import from `embed-react` and `embed-react/server`. The [changelog](./CHANGELOG.md) has the full list.

## Development

```bash
npm install
npm run check   # typecheck, tests and build
npm run dev     # example app at http://localhost:3000
```

Issues and pull requests are welcome. Run `npm run check` before opening a pull request.

## License

[MIT](./LICENSE)
