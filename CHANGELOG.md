# Changelog

## 2.6.2 - Unreleased

### Fixed

- X links crashed the whole React tree in ES module bundles such as Vite, because the third-party embed calls `require` at runtime. `SmartEmbed` now uses X's widgets script directly and falls back to a plain link when it cannot load.
- Frames came up a few pixels short when the page ended in an element whose bottom margin collapses through its parent.

## 2.6.1 - 2026-11-06

Same code as 2.6.0, published again because of a version bump during release.

## 2.6.0 - 2026-11-06

### Security

The proxy snippet in earlier READMEs and `createProxyEndpoint` fetched any URL they were given. Anyone who could reach the route could read internal addresses such as cloud metadata endpoints, and proxied pages ran on the host site's origin with access to its cookies. If you copied that code, replace it with `createPagesEmbedProxy` or `createEmbedProxy` from `embed-react/server`.

- Add `embed-react/server`, a proxy that refuses private and link-local addresses, checks every redirect, limits size and time, and serves pages in a sandbox with an opaque origin.
- Refuse `javascript:` and other non-http(s) iframe sources.

### Fixed

- Auto-resize never worked with the documented proxy, because the component required an `id` the proxy did not send. Messages are now matched by the frame they come from, so proxies copied from older READMEs start working too.
- Proxy auto-detection failed against proxies that reject `HEAD` with a 405.
- Frames could not shrink after their content got shorter.
- Hosts that merely contain a provider name, such as `netflix.com` for `x.com`, were treated as social links.
- Frames that never report a height are scrollable instead of cut off at 600px.
- Relative links in proxied pages now resolve against the original site.
- `main` pointed at ES module code, and `module` pointed at a file that was not published. Both ES modules and CommonJS now work.

### Added

- `AutoIframe` and `SmartEmbed` are exported.
- `AutoIframe` accepts `title`, `initialHeight` and `maxHeight`.
- The edit form validates the URL and width.
- Source code, tests and CI now live in this repository.

### Changed

- Paths inside `dist/` can no longer be imported directly. Use `embed-react` and `embed-react/server`.
- The default look of the edit controls is more neutral. All existing props still work.
- README claims about a client-side blob URL fallback were removed, because no such code exists.
