import { AutoIframe, SmartEmbed } from 'embed-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useMeasured, useResizeLog, useReveal } from './hooks';

const SAMPLE = 'samples/lighthouse.html';
const NOTE = 'samples/note.html';
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

function Hero() {
  const [stageRef, stage] = useMeasured<HTMLDivElement>();
  const [frameRef, frame] = useMeasured<HTMLDivElement>();
  const [share, setShare] = useState(100);
  const minWidth = 280;
  const width = stage.width ? Math.round(minWidth + (Math.max(stage.width - minWidth, 0) * share) / 100) : 0;

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
            embed-react is a React component that resizes an iframe to fit the page inside it. Drag the width and the
            frame keeps up.
          </p>
          <div className="install">
            <code>{INSTALL}</code>
            <CopyButton text={INSTALL} />
          </div>
        </div>
        <output className="readout" htmlFor="width" aria-live="off">
          <span className="figure">{frame.height || 600}</span>
          <span className="unit">px tall at {width || '100%'}px wide</span>
        </output>
      </div>

      <label className="slider" htmlFor="width">
        <span>Width</span>
        <input
          id="width"
          type="range"
          min={0}
          max={100}
          value={share}
          onChange={(event) => setShare(Number(event.target.value))}
        />
      </label>

      <div ref={stageRef} className="stage">
        <div ref={frameRef} className="frame" data-ui>
          <AutoIframe src={SAMPLE} title="Sample article about the Eddystone lighthouses" width={width || '100%'} useProxy={false} />
        </div>
      </div>
    </header>
  );
}

function Compare() {
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref} className="compare" id="compare">
      <h2>Same page, two iframes</h2>
      <p className="section-lead">
        An iframe with no height set is 150px tall, whatever is inside it. Both frames below load the same article.
      </p>
      <div className="compare-grid">
        <figure>
          <figcaption>Plain iframe, 150px, its own scrollbar</figcaption>
          <div className="frame" data-ui>
            <iframe src={SAMPLE} title="The article in a plain iframe" className="plain" />
          </div>
          <Code>{`<iframe src="/article.html" />`}</Code>
        </figure>
        <figure>
          <figcaption>AutoIframe, the whole article</figcaption>
          <div className="frame" data-ui>
            <AutoIframe src={SAMPLE} title="The article in AutoIframe" useProxy={false} initialHeight={150} />
          </div>
          <Code>{`<AutoIframe src="/article.html" />`}</Code>
        </figure>
      </div>
    </section>
  );
}

const CHANGES = [
  {
    id: 'late',
    sentence: 'Content arrives after the page has loaded.',
    note: 'Adds a section and a large picture to the article.',
  },
  {
    id: 'collapse',
    sentence: 'A section closes and the page gets shorter.',
    note: 'Hides a section. A frame measured by scrollHeight could not shrink here.',
  },
  {
    id: 'type',
    sentence: 'The reader asks for larger type.',
    note: 'Every paragraph wraps again at 22px.',
  },
];

function Follow() {
  const ref = useReveal<HTMLElement>();
  const [frameRef, frame] = useMeasured<HTMLDivElement>();
  const [state, setState] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => {
    const on = !state[id];
    setState({ ...state, [id]: on });
    frameRef.current?.querySelector('iframe')?.contentWindow?.postMessage({ demo: id, on }, window.location.origin);
  };

  return (
    <section ref={ref} className="follow" id="follow">
      <div className="follow-text">
        <h2>It follows the page as it changes</h2>
        <p className="section-lead">
          The script in the frame watches the page and reports whenever its height moves, so nothing polls. These
          switches change the article in the frame.
        </p>
        <ul className="switches">
          {CHANGES.map((change) => (
            <li key={change.id} className={state[change.id] ? 'is-on' : undefined}>
              <button type="button" role="switch" aria-checked={!!state[change.id]} onClick={() => toggle(change.id)}>
                <span className="switch-text">
                  <span className="sentence">{change.sentence}</span>
                  <span className="note">{change.note}</span>
                </span>
                <span className="toggle" data-ui aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        <p className="current">
          Frame height now: <strong>{frame.height}px</strong>
        </p>
      </div>
      <div className="follow-frame">
        <div ref={frameRef} className="frame" data-ui>
          <AutoIframe src={SAMPLE} title="The article the switches change" useProxy={false} />
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
    detail: 'The component can reach into the frame, so it adds the script by itself. Every frame on this page works this way.',
    code: `<AutoIframe src="/article.html" />`,
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
  return (
    <section className="board-section" id="setup">
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
  const log = useResizeLog(5);
  const [noteRef, note] = useMeasured<HTMLDivElement>();

  return (
    <section ref={ref} className="start" id="start">
      <h2>Three steps</h2>
      <div className="exchange">
        <h3>First, install it.</h3>
        <Code>{INSTALL}</Code>
        <p className="response">Ships ES modules, CommonJS and TypeScript types. Works with React 18 and newer.</p>
      </div>
      <div className="exchange">
        <h3>Then render it.</h3>
        <Code>{`import { AutoIframe } from 'embed-react';

<AutoIframe src="/note.html" title="Note" />`}</Code>
        <div ref={noteRef} className="response frame" data-ui>
          <AutoIframe src={NOTE} title="A one-line note" useProxy={false} initialHeight={150} />
        </div>
        <p className="response caption">A one-line page gets a {note.height}px frame.</p>
      </div>
      <div className="exchange">
        <h3>For other sites, add the proxy.</h3>
        <Code>{`// pages/api/embed.ts
import { createPagesEmbedProxy } from 'embed-react/server';

export default createPagesEmbedProxy({
  allowedHosts: ['example.com'],
});`}</Code>
        <p className="response">
          This site is static, so its frames skip the proxy. The message is the same either way, and these are the
          latest ones this page received:
        </p>
        <ol className="log" data-ui aria-label="Latest resize messages" reversed>
          {log.length === 0 && <li>Move a slider or a switch above.</li>}
          {log.map((entry) => (
            <li key={entry.id}>
              <code>{`{ type: 'iframe-resize', height: ${entry.height} }`}</code>
              <span>{(entry.at / 1000).toFixed(1)}s</span>
            </li>
          ))}
        </ol>
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
  return (
    <section className="closing">
      <h2>Install it in one line</h2>
      <div className="install install-large">
        <code>{INSTALL}</code>
        <CopyButton text={INSTALL} />
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
          Article pictures: The Eddystone Lighthouse by Thomas Goff Lupton (
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
        <Follow />
        <Board />
        <Start />
        <Social />
        <Closing />
      </main>
      <Footer />
    </>
  );
}
