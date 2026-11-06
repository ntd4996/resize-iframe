import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { RESIZE_SCRIPT } from './resize-script';
import { parseHttpUrl, toCssSize } from './url';

export interface AutoIframeProps {
  /** Page to embed. Only http(s) URLs are rendered. */
  src: string;
  /** Accessible name of the frame. */
  title?: string;
  width?: string | number;
  /** Height used until the embedded page reports its own. */
  initialHeight?: number;
  /** Upper limit for the reported height, which guards against pages sized in `vh`. */
  maxHeight?: number;
  /** Proxy route created with `embed-react/server`. */
  apiEndpoint?: string;
  /** `true` always uses the proxy, `false` never does, unset detects whether the route exists. */
  useProxy?: boolean;
  className?: string;
  style?: CSSProperties;
}

const proxyChecks = new Map<string, Promise<boolean>>();

function isProxyAvailable(endpoint: string): Promise<boolean> {
  let check = proxyChecks.get(endpoint);
  if (!check) {
    // Any answer other than "not found" means the route exists: older proxies reject HEAD with a 405.
    check = fetch(endpoint, { method: 'HEAD' }).then(
      (response) => response.status !== 404 && response.status < 500,
      () => false,
    );
    proxyChecks.set(endpoint, check);
  }
  return check;
}

function useResolvedProxy(endpoint: string, useProxy: boolean | undefined): boolean | null {
  const [detected, setDetected] = useState<boolean | null>(null);

  useEffect(() => {
    if (useProxy !== undefined) return;
    let active = true;
    setDetected(null);
    isProxyAvailable(endpoint).then((available) => {
      if (active) setDetected(available);
    });
    return () => {
      active = false;
    };
  }, [endpoint, useProxy]);

  return useProxy ?? detected;
}

export default function AutoIframe({
  src,
  title = 'Embedded content',
  width = '100%',
  initialHeight = 600,
  maxHeight = 10000,
  apiEndpoint = '/api/embed',
  useProxy,
  className,
  style,
}: AutoIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(initialHeight);
  const [hasReported, setHasReported] = useState(false);
  const proxied = useResolvedProxy(apiEndpoint, useProxy);

  const target = parseHttpUrl(src, typeof window === 'undefined' ? 'http://localhost' : window.location.href);

  useEffect(() => {
    setHeight(initialHeight);
    setHasReported(false);
  }, [src, initialHeight]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source === null || event.source !== iframeRef.current?.contentWindow) return;
      const reported = event.data?.height;
      if (event.data?.type !== 'iframe-resize' || typeof reported !== 'number' || !(reported > 0)) return;
      setHeight(Math.min(Math.ceil(reported), maxHeight));
      setHasReported(true);
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [maxHeight]);

  const handleLoad = () => {
    const frame = iframeRef.current;
    if (!frame) return;
    try {
      // Same-origin pages reached without the proxy can be measured directly.
      const doc = frame.contentDocument;
      if (doc?.body) {
        const script = doc.createElement('script');
        script.textContent = RESIZE_SCRIPT;
        doc.body.appendChild(script);
      }
    } catch {
      // A cross-origin document is not readable, and only reports its height through the proxy.
    }
    frame.contentWindow?.postMessage({ type: 'trigger-resize' }, '*');
  };

  if (!target) {
    return <p role="alert">Cannot embed this URL: only http and https links are supported.</p>;
  }
  if (proxied === null) {
    return <div style={{ width: toCssSize(width), maxWidth: '100%', height: initialHeight }} />;
  }

  return (
    <div style={{ width: toCssSize(width), maxWidth: '100%' }}>
      <iframe
        ref={iframeRef}
        src={proxied ? `${apiEndpoint}?url=${encodeURIComponent(target.href)}` : target.href}
        title={title}
        height={height}
        className={className}
        // A page that never reports its height has to stay scrollable, or its content would be cut off.
        scrolling={hasReported ? 'no' : 'auto'}
        onLoad={handleLoad}
        style={{ display: 'block', width: '100%', border: 'none', transition: 'height 0.2s ease', ...style }}
      />
    </div>
  );
}
