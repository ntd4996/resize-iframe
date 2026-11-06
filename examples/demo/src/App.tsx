import { AutoIframe, SmartEmbed } from 'embed-react';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { useInView, useMeasured, useResizeLog, useReveal } from './hooks';

const SAMPLES = [
  { id: 'tower', name: 'Lighthouse', src: 'samples/tower.html', hint: 'Add floors and the frame gets taller with them.' },
  { id: 'chat', name: 'Live chat', src: 'samples/chat.html', hint: 'Messages keep arriving, then the chat clears and the frame shrinks.' },
  { id: 'faq', name: 'Accordion', src: 'samples/faq.html', hint: 'Open and close the answers, inside the frame.' },
  { id: 'form', name: 'Form', src: 'samples/form.html', hint: 'Submit it empty, or tick the group box.' },
  { id: 'article', name: 'Article', src: 'samples/lighthouse.html', hint: 'Drag the yellow handle and the text wraps again.' },
];
const CHAT_PAUSED = 'samples/chat.html?paused';
const INSTALL = 'npm install embed-react react-social-media-embed';
const REPO = 'https://github.com/ntd4996/resize-iframe';
const NPM = 'https://www.npmjs.com/package/embed-react';

function CopyButton({ text, children = 'Copy' }: { text: string; children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <button
      type="button"
      className="copy"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(false), 1600);
      }}
    >
      <span aria-live="polite">{copied ? 'Copied' : children}</span>
    </button>
  );
}

function Code({ children }: { children: string }) {
  return (
    <div className="code">
      <pre>
        <code>{children}</code>
      </pre>
      <CopyButton text={children} />
    </div>
  );
}

function Ruler({ height }: { height: number }) {
  const marks = Math.min(Math.floor(height / 100), 120);
  return (
    <div className="ruler" data-ui aria-hidden="true">
      {Array.from({ length: marks }, (_, index) => (
        <span key={index} style={{ top: (index + 1) * 100 }}>
          {(index + 1) % 2 === 0 ? (index + 1) * 100 : ''}
        </span>
      ))}
    </div>
  );
}

const MIN_WIDTH = 280;

function Hero() {
  const [stageRef, stage] = useMeasured<HTMLDivElement>();
  const [frameRef, frame] = useMeasured<HTMLDivElement>();
  const log = useResizeLog(frameRef, 3);
  const [sample, setSample] = useState(0);
  const [requested, setRequested] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const available = Math.max(stage.width, MIN_WIDTH);
  const width = Math.min(requested ?? available, available);

  const dragTo = (event: PointerEvent<HTMLElement>) => {
    const left = stageRef.current?.getBoundingClientRect().left ?? 0;
    setRequested(Math.max(MIN_WIDTH, Math.round(event.clientX - left)));
  };
  const nudge = (event: KeyboardEvent<HTMLElement>) => {
    const step = event.key === 'ArrowRight' ? 20 : event.key === 'ArrowLeft' ? -20 : 0;
    if (!step) return;
    event.preventDefault();
    setRequested(Math.max(MIN_WIDTH, Math.min(available, width + step)));
  };

  return (
    <header className="hero">
      <nav className="bar">
        <a className="wordmark" href={REPO}>
          embed-react
        </a>
        <a className="button" href={REPO}>
          View on GitHub
        </a>
      </nav>

      <div className="hero-top">
        <div>
          <h1 className="masked">
            <span><span>An iframe as tall</span></span>
            <span><span>as its page</span></span>
          </h1>
          <p className="lead">
            embed-react is a React component that resizes an iframe to fit the page inside it. Play with the page below
            and watch the number.
          </p>
          <div className="install">
            <code>{INSTALL}</code>
            <CopyButton text={INSTALL} />
          </div>
        </div>
        <div className="readout">
          <div className="ticker" data-ui aria-hidden="true">
            {log.map((entry) => (
              <code key={entry.id}>{`height: ${entry.height}`}</code>
            ))}
          </div>
          <span className="figure">{frame.height || 400}</span>
          <span className="unit">px tall at {width}px wide</span>
        </div>
      </div>

      <div className="tabs" role="group" aria-label="Sample page">
        {SAMPLES.map((item, index) => (
          <button key={item.id} type="button" aria-pressed={index === sample} onClick={() => setSample(index)}>
            {item.name}
          </button>
        ))}
        <p className="hint">{SAMPLES[sample].hint}</p>
      </div>

      <div className="stage-wrap">
        <Ruler height={frame.height} />
        <div ref={stageRef} className="stage">
          <div className={dragging ? 'playground is-dragging' : 'playground'} style={{ width }}>
            <div ref={frameRef} className="frame" data-ui>
              <AutoIframe src={SAMPLES[sample].src} title={`Sample page: ${SAMPLES[sample].name}`} useProxy={false} initialHeight={400} />
            </div>
            <div
              className="handle"
              data-ui
              role="slider"
              tabIndex={0}
              aria-label="Frame width"
              aria-valuemin={MIN_WIDTH}
              aria-valuemax={available}
              aria-valuenow={width}
              onKeyDown={nudge}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                setDragging(true);
              }}
              onPointerMove={(event) => {
                if (dragging) dragTo(event);
              }}
              onPointerUp={() => setDragging(false)}
              onPointerCancel={() => setDragging(false)}
            >
              <span>Drag</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function Compare() {
  const frames = useRef<HTMLDivElement>(null);
  const setPlaying = useCallback((on: boolean) => {
    frames.current?.querySelectorAll('iframe').forEach((frame) => {
      frame.contentWindow?.postMessage({ demo: 'play', on }, window.location.origin);
    });
  }, []);
  const ref = useInView<HTMLElement>(setPlaying);
  const [autoRef, auto] = useMeasured<HTMLDivElement>();
  const gridRef = useReveal<HTMLDivElement>();

  return (
    <section ref={ref} className="compare" id="compare">
      <h2>Same chat, two iframes</h2>
      <p className="section-lead">
        An iframe with no height set is 150px tall, whatever is inside it. Both of these are running the same page.
      </p>
      <div ref={gridRef}>
      <div ref={frames} className="compare-grid">
        <figure>
          <figcaption>Plain iframe: new messages land out of sight</figcaption>
          <div className="frame" data-ui>
            <iframe src={CHAT_PAUSED} title="The chat in a plain iframe" className="plain" onLoad={() => setPlaying(true)} />
          </div>
          <p className="still">
            <strong>150</strong>
            <span>px, whatever the page does</span>
          </p>
          <Code>{`<iframe src="/chat.html" />`}</Code>
        </figure>
        <figure>
          <figcaption>AutoIframe: {auto.height}px and making room for each message</figcaption>
          <div ref={autoRef} className="frame" data-ui>
            <AutoIframe src={CHAT_PAUSED} title="The chat in AutoIframe" useProxy={false} initialHeight={150} />
          </div>
          <Code>{`<AutoIframe src="/chat.html" />`}</Code>
        </figure>
      </div>
      </div>
    </section>
  );
}

const SETUPS = [
  {
    page: 'Social link',
    setup: 'Nothing',
    result: 'Provider embed',
    detail: 'X, Instagram, Facebook, TikTok, YouTube and LinkedIn links render with the provider\'s own embed, which sizes itself.',
    code: `<SmartEmbed src="https://x.com/jack/status/20" />`,
  },
  {
    page: 'Same origin as your site',
    setup: 'Nothing',
    result: 'Resizes',
    detail: 'The component can reach into the frame, so it adds the script by itself. Every sample on this site works this way.',
    code: `<AutoIframe src="/page.html" />`,
  },
  {
    page: 'Another origin',
    setup: 'Proxy route',
    result: 'Resizes',
    detail: 'The route downloads the page, adds the script and serves it in a sandbox. It refuses private addresses, and allowedHosts limits it to the sites you embed.',
    code: `export default createPagesEmbedProxy({
  allowedHosts: ['example.com'],
});`,
  },
  {
    page: 'Another origin you control',
    setup: 'One line in that page',
    result: 'Resizes',
    detail: 'A page that sends the message itself needs no proxy, and it can send it again whenever its height changes.',
    code: `window.parent.postMessage(
  { type: 'iframe-resize', height: document.documentElement.offsetHeight },
  '*',
);`,
  },
  {
    page: 'Another origin, no proxy',
    setup: 'Nothing',
    result: 'Scrolls',
    detail: 'Browsers do not let a page measure a cross-origin frame. It keeps its initial height and stays scrollable, so nothing is cut off.',
    code: `<AutoIframe src="https://example.com" useProxy={false} />`,
  },
];

function Board() {
  const [open, setOpen] = useState(2);
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref} className="board-section" id="setup">
      <h2>What each page needs</h2>
      <ul className="board" data-ui>
        {SETUPS.map((row, index) => (
          <li key={row.page} className={index === open ? 'row is-open' : 'row'}>
            <button type="button" aria-expanded={index === open} onClick={() => setOpen(index)}>
              <span className="row-page">{row.page}</span>
              <span className="row-setup">{row.setup}</span>
              <span className={`row-result result-${row.result.split(' ')[0].toLowerCase()}`}>{row.result}</span>
            </button>
            {index === open && (
              <div className="row-detail">
                <p>{row.detail}</p>
                <pre>
                  <code>{row.code}</code>
                </pre>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Start() {
  const ref = useReveal<HTMLElement>();

  return (
    <section ref={ref} className="start" id="start">
      <h2>Three steps</h2>
      <div className="steps">
        <div className="exchange">
          <h3>First, install it.</h3>
          <Code>{INSTALL}</Code>
          <p className="response">Ships ES modules, CommonJS and TypeScript types. Works with React 18 and newer.</p>
        </div>
        <div className="exchange">
          <h3>Then render it.</h3>
          <Code>{`import { AutoIframe } from 'embed-react';

<AutoIframe src="/page.html" title="Page" />`}</Code>
          <p className="response">Same-origin pages, like every sample on this site, need nothing else.</p>
        </div>
        <div className="exchange">
          <h3>For other sites, add the proxy.</h3>
          <Code>{`// pages/api/embed.ts
import { createPagesEmbedProxy } from 'embed-react/server';

export default createPagesEmbedProxy({
  allowedHosts: ['example.com'],
});`}</Code>
          <p className="response">It adds the same script to the page and refuses private addresses.</p>
        </div>
      </div>
    </section>
  );
}

const SOCIAL = [
  { name: 'X', url: 'https://x.com/jack/status/20', width: 500 },
  { name: 'YouTube', url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw', width: 560 },
];

function Social() {
  const ref = useReveal<HTMLElement>();
  const [active, setActive] = useState<number | null>(null);

  return (
    <section ref={ref} className="social" id="social">
      <div>
        <h2>Social links need no setup</h2>
        <p className="section-lead">
          SmartEmbed reads the URL and picks the embed, so the link is all you pass. Loading one contacts that provider,
          so here it waits for your click.
        </p>
        <div className="choices" role="group" aria-label="Load an embed">
          {SOCIAL.map((item, index) => (
            <button
              key={item.name}
              type="button"
              className="button"
              aria-pressed={active === index}
              onClick={() => setActive(index)}
            >
              Load {item.name}
            </button>
          ))}
        </div>
      </div>
      <div className="social-frame">
        {active === null ? (
          <p className="social-empty">Nothing has loaded from a third party yet.</p>
        ) : (
          <SmartEmbed key={SOCIAL[active].url} src={SOCIAL[active].url} width={SOCIAL[active].width} />
        )}
      </div>
    </section>
  );
}

function Closing() {
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref} className="closing">
      <div className="closing-grid">
        <figure>
          <img src="samples/img/lupton-8296.jpg" width={1400} height={1044} loading="lazy" alt="Engraving of the Eddystone Lighthouse in a rough sea" />
          <figcaption>The Eddystone Lighthouse, engraving by Thomas Goff Lupton. The article sample tells its story.</figcaption>
        </figure>
        <div>
          <h2>Install it in one line</h2>
          <div className="install install-large">
            <code>{INSTALL}</code>
            <CopyButton text={INSTALL} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="tiles">
      <div className="tile tile-statement">
        <p>Free and open source under the MIT licence.</p>
        <p className="credits">
          Pictures in the article sample: The Eddystone Lighthouse by Thomas Goff Lupton (
          <a href="https://commons.wikimedia.org/w/index.php?curid=113277123">Wikimedia Commons</a>, CC0) and Eddystone
          Lighthouse by Mary Altha Nims (<a href="https://commons.wikimedia.org/w/index.php?curid=77195562">Wikimedia Commons</a>, CC0).
        </p>
      </div>
      <ul className="tile tile-links">
        <li><a href={REPO}>GitHub</a></li>
        <li><a href={NPM}>npm</a></li>
        <li><a href={`${REPO}#api`}>API reference</a></li>
        <li><a href={`${REPO}/blob/main/CHANGELOG.md`}>Changelog</a></li>
      </ul>
      <div className="tile tile-word">embed-react</div>
      <a className="tile tile-action" href={`${REPO}#quick-start`}>
        Read the quick start
      </a>
    </footer>
  );
}

export default function App() {
  return (
    <>
      <Hero />
      <main>
        <Compare />
        <Board />
        <Start />
        <Social />
        <Closing />
      </main>
      <Footer />
    </>
  );
}
