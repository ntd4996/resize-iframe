import type { NextPage } from 'next';
import Head from 'next/head';
import EditableIframeItem from '../components/EditableIframeItem';

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Auto Iframe Demo</title>
        <meta name="description" content="Demo iframe tự động điều chỉnh chiều cao" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '2rem', fontSize: '2rem' }}>
          🎯 Demo Auto Iframe
        </h1>
        <p style={{ marginBottom: '2rem', color: '#666' }}>
          Click vào nút "⚙️ Sửa" để chỉnh sửa link và width cho từng iframe
        </p>

        <EditableIframeItem
          id="iframe-1"
          title="Ví dụ 1: Yokohama FC Embed"
          initialSrc="https://yokohamafc.com/2020/10/27/202010271802/embed"
          initialWidth="100%"
        />


        <EditableIframeItem
          id="iframe-2"
          title="Ví dụ 2: Social Embed"
          initialSrc="https://twitter.com/yokohama_fc/status/1676104040634253312?s=20"
          initialWidth={550}
        />
      </main>
    </>
  );
};

export default Home;

