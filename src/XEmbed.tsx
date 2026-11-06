import { useEffect, useRef, useState } from 'react';

const WIDGETS_URL = 'https://platform.twitter.com/widgets.js';

interface TwitterWidgets {
  widgets: {
    createTweet(id: string, element: HTMLElement, options?: { width?: number; dnt?: boolean }): Promise<HTMLElement | undefined>;
  };
  ready(callback: (twttr: TwitterWidgets) => void): void;
}

const globals = () => window as unknown as { twttr?: TwitterWidgets };

let widgets: Promise<TwitterWidgets> | undefined;

function loadWidgets(): Promise<TwitterWidgets> {
  const loaded = globals().twttr;
  if (loaded?.widgets) return Promise.resolve(loaded);
  widgets ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = WIDGETS_URL;
    script.async = true;
    script.onerror = () => {
      widgets = undefined;
      reject(new Error('Could not load the X widgets script'));
    };
    script.onload = () => globals().twttr?.ready(resolve);
    document.head.appendChild(script);
  });
  return widgets;
}

export function tweetIdFromUrl(url: string): string | null {
  return /\/status\/(\d+)/.exec(url)?.[1] ?? null;
}

/**
 * Renders a post with X's widgets script directly. The third-party TwitterEmbed calls `require`
 * at runtime, which throws in ES module bundles such as Vite's and takes the whole React tree down.
 */
export default function XEmbed({ url, width }: { url: string; width?: string | number }) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const id = tweetIdFromUrl(url);
  const pixelWidth = typeof width === 'number' ? width : Number(/^(\d+)px$/.exec(width ?? '')?.[1]) || undefined;

  useEffect(() => {
    const element = container.current;
    if (!element || !id) return;
    let active = true;
    setFailed(false);
    loadWidgets()
      .then((twttr) => {
        if (!active) return undefined;
        return twttr.widgets.createTweet(id, element, { width: pixelWidth, dnt: true }).then((tweet) => {
          if (active && !tweet) setFailed(true);
        });
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      element.replaceChildren();
    };
  }, [id, pixelWidth]);

  if (failed || !id) return <a href={url}>View this post on X</a>;
  return <div ref={container} style={{ width: '100%' }} />;
}
