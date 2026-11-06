// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AutoIframe from '../src/AutoIframe';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function sendMessage(source: Window | null, data: unknown) {
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { data, source }));
  });
}

const frame = (title: string) => screen.getByTitle(title) as HTMLIFrameElement;

describe('AutoIframe', () => {
  it('only accepts height messages from its own frame', () => {
    render(
      <>
        <AutoIframe src="https://a.test/" title="a" useProxy={false} />
        <AutoIframe src="https://b.test/" title="b" useProxy={false} />
      </>,
    );

    sendMessage(frame('a').contentWindow, { type: 'iframe-resize', height: 320 });

    expect(frame('a').getAttribute('height')).toBe('320');
    expect(frame('b').getAttribute('height')).toBe('600');
  });

  it('accepts the message sent by proxies copied from older READMEs, which has no id', () => {
    render(<AutoIframe src="https://a.test/" title="a" useProxy={false} />);
    sendMessage(frame('a').contentWindow, { type: 'iframe-resize', height: 300 });
    expect(frame('a').getAttribute('height')).toBe('300');
  });

  it('ignores invalid heights and caps large ones', () => {
    render(<AutoIframe src="https://a.test/" title="a" useProxy={false} maxHeight={1000} />);
    const source = frame('a').contentWindow;

    sendMessage(source, { type: 'iframe-resize', height: -5 });
    sendMessage(source, { type: 'iframe-resize', height: '400' });
    sendMessage(source, { type: 'other', height: 400 });
    expect(frame('a').getAttribute('height')).toBe('600');

    sendMessage(source, { type: 'iframe-resize', height: 99999 });
    expect(frame('a').getAttribute('height')).toBe('1000');
  });

  it('keeps the frame scrollable until a height arrives', () => {
    render(<AutoIframe src="https://a.test/" title="a" useProxy={false} />);
    expect(frame('a').getAttribute('scrolling')).toBe('auto');
    sendMessage(frame('a').contentWindow, { type: 'iframe-resize', height: 300 });
    expect(frame('a').getAttribute('scrolling')).toBe('no');
  });

  it('refuses to render unsafe sources', () => {
    render(<AutoIframe src="javascript:alert(1)" useProxy={false} />);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('routes through the proxy when asked to', () => {
    render(<AutoIframe src="https://a.test/x?y=1" title="a" useProxy apiEndpoint="/embed" />);
    expect(frame('a').getAttribute('src')).toBe('/embed?url=https%3A%2F%2Fa.test%2Fx%3Fy%3D1');
  });

  it.each([
    [200, true],
    [405, true],
    [404, false],
  ])('treats a HEAD status of %i as proxy available: %s', async (status, expected) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status })));
    render(<AutoIframe src="https://a.test/" title="a" apiEndpoint={`/detect-${status}`} />);
    const iframe = (await screen.findByTitle('a')) as HTMLIFrameElement;
    expect(iframe.getAttribute('src')?.startsWith(`/detect-${status}`)).toBe(expected);
  });
});
