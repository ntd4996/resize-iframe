import { useEffect, useRef, useState, type RefObject } from 'react';

/** Live pixel size of an element, read from the DOM so the figures on the page are the real ones. */
export function useMeasured<T extends HTMLElement>(): [RefObject<T | null>, { width: number; height: number }] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const box = entry.target.getBoundingClientRect();
      setSize({ width: Math.round(box.width), height: Math.round(box.height) });
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}

/** Adds `is-in` once the element scrolls into view. Without script the content simply stays visible. */
export function useReveal<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.classList.add('reveal');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.classList.add('is-in');
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return ref;
}

export interface LoggedMessage {
  id: number;
  height: number;
  at: number;
}

/** Every `iframe-resize` message this page receives. */
export function useResizeLog(limit: number): LoggedMessage[] {
  const [log, setLog] = useState<LoggedMessage[]>([]);

  useEffect(() => {
    let id = 0;
    const handle = (event: MessageEvent) => {
      if (event.data?.type !== 'iframe-resize' || typeof event.data.height !== 'number') return;
      const entry = { id: ++id, height: event.data.height, at: Math.round(performance.now()) };
      setLog((current) => [entry, ...current].slice(0, limit));
    };
    window.addEventListener('message', handle);
    return () => window.removeEventListener('message', handle);
  }, [limit]);

  return log;
}
