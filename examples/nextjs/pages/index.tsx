import { EditableIframeItem } from 'embed-react';
import type { NextPage } from 'next';
import Head from 'next/head';

const Home: NextPage = () => (
  <>
    <Head>
      <title>embed-react example</title>
      <meta name="description" content="Iframes that resize to their content, with social media embeds." />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </Head>

    <main>
      <h1>embed-react</h1>
      <p className="intro">
        The first frame loads through the proxy at <code>/api/embed</code> and takes the height of its content. The
        second uses the provider&apos;s own embed. Use Edit to try another URL or width.
      </p>

      <EditableIframeItem
        id="page"
        title="Page through the proxy"
        initialSrc="https://example.com/"
      />
      <EditableIframeItem
        id="post"
        title="Social post"
        initialSrc="https://twitter.com/yokohama_fc/status/1676104040634253312?s=20"
        initialWidth={550}
      />
    </main>
  </>
);

export default Home;
