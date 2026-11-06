# embed-react

[![npm](https://img.shields.io/npm/v/embed-react)](https://www.npmjs.com/package/embed-react)
[![CI](https://github.com/ntd4996/resize-iframe/actions/workflows/ci.yml/badge.svg)](https://github.com/ntd4996/resize-iframe/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/embed-react)](./LICENSE)

React iframe that takes the height of its content, for any page you can route through a small server proxy. Links to X, Instagram, Facebook, TikTok, YouTube and LinkedIn render with the provider's own embed instead.

## Install

```bash
npm install embed-react react-social-media-embed
```

Requires React 18 or newer. The proxy requires Node.js 18.17 or newer.

## Usage

```tsx
import { SmartEmbed } from 'embed-react';

<SmartEmbed src="https://example.com/article" title="Article" />;
```

A browser does not let a page measure a cross-origin iframe. To resize, the embedded page has to report its own height, so it needs to load through the proxy below. Without a proxy the frame still works: it keeps its initial height and scrolls.

### Add the proxy

Pages Router, in `pages/api/embed.ts`:

```ts
import { createPagesEmbedProxy } from 'embed-react/server';

export default createPagesEmbedProxy({ allowedHosts: ['example.com'] });
```

App Router, in `app/api/embed/route.ts`:

```ts
import { createEmbedProxy } from 'embed-react/server';

const proxy = createEmbedProxy({ allowedHosts: ['example.com'] });

export const GET = proxy;
export const HEAD = proxy;
```

The component looks for the route at `/api/embed` and uses it when it exists. If your host answers unknown paths with a 200, as single-page app fallbacks do, set `useProxy` explicitly.

### Pages that already report their height

Same-origin pages are measured directly and need no proxy. A page you control on another origin can send the message itself:

```js
window.parent.postMessage({ type: 'iframe-resize', height: document.documentElement.offsetHeight }, '*');
```

## Components

### `AutoIframe`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `src` | `string` | required | Page to embed. Only http(s) URLs render. |
| `title` | `string` | `"Embedded content"` | Accessible name of the frame. |
| `width` | `string \| number` | `"100%"` | Numbers are pixels. |
| `initialHeight` | `number` | `600` | Height until the page reports its own. |
| `maxHeight` | `number` | `10000` | Upper limit for the reported height. |
| `apiEndpoint` | `string` | `"/api/embed"` | Proxy route. |
| `useProxy` | `boolean` | detected | `true` always uses the proxy, `false` never does. |
| `className`, `style` | | | Applied to the iframe. |

### `SmartEmbed`

Takes the same props as `AutoIframe` and picks the provider's embed for social links.

### `EditableIframeItem`

`SmartEmbed` with a title, a frame around it and an optional form for changing the URL and width.

| Prop | Type | Default |
| --- | --- | --- |
| `id` | `string` | required |
| `initialSrc` | `string` | required |
| `title` | `string` | |
| `initialWidth` | `string \| number` | `"100%"` |
| `enabledEdit` | `boolean` | `true` |
| `border` | `string \| boolean` | `"1px solid rgb(221, 221, 221)"` |
| `padding` | `string \| number` | `"1rem"` |
| `marginBottom` | `string \| number` | `"3rem"` |
| `backgroundColor` | `string` | `"rgb(249, 249, 249)"` |
| `apiEndpoint` | `string` | `"/api/embed"` |
| `useProxy` | `boolean` | detected |

## Proxy options

| Option | Default | Description |
| --- | --- | --- |
| `allowedHosts` | any public host | Domains the proxy may load, subdomains included. |
| `allowPrivateNetwork` | `false` | Allows loopback and private addresses. For local development only. |
| `maxBytes` | 5 MB | Limit for the decoded HTML. |
| `timeoutMs` | 10000 | Limit for the whole request, redirects included. |

## Security

Set `allowedHosts` in production. Without it, anyone can use your server to load any public page, and the traffic comes from your IP address.

The proxy always:

- refuses loopback, private and link-local addresses, checked when the connection opens and again on every redirect, so cloud metadata endpoints stay out of reach
- serves pages with `Content-Security-Policy: sandbox`, which gives them an opaque origin with no access to your site's cookies or storage

If you copied the proxy code from a README older than 2.6.1, replace it. That code has neither protection. See the [changelog](./CHANGELOG.md).

## Limitations

- Sandboxed pages cannot use cookies or `localStorage`. A page that requires them may fail to load correctly through the proxy.
- Sites that need a login, or that build their content from the current URL, may render differently than they do on their own domain.
- The proxy needs the Node.js runtime and does not run on Edge.
- Embedding pages you do not own may be restricted by their terms. Check before you ship.

## Development

```bash
npm install
npm run check   # typecheck, tests and build
npm run dev     # example app at http://localhost:3000
```

The example lives in [`examples/nextjs`](./examples/nextjs).

## License

[MIT](./LICENSE)
