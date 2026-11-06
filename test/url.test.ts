import { describe, expect, it } from 'vitest';
import { detectSocialProvider, parseHttpUrl } from '../src/url';
import { tweetIdFromUrl } from '../src/XEmbed';

describe('parseHttpUrl', () => {
  it('rejects schemes that would run script in an iframe', () => {
    expect(parseHttpUrl('javascript:alert(1)')).toBeNull();
    expect(parseHttpUrl('data:text/html,<script>1</script>')).toBeNull();
  });

  it('resolves relative links against the base', () => {
    expect(parseHttpUrl('/widget', 'https://example.com/a')?.href).toBe('https://example.com/widget');
  });
});

describe('detectSocialProvider', () => {
  it.each([
    ['https://twitter.com/user/status/123', 'twitter'],
    ['https://x.com/user/status/123?s=20', 'twitter'],
    ['https://www.instagram.com/p/abc/', 'instagram'],
    ['https://www.facebook.com/page/posts/1', 'facebook'],
    ['https://www.tiktok.com/@user/video/1', 'tiktok'],
    ['https://www.youtube.com/watch?v=abc', 'youtube'],
    ['https://youtu.be/abc', 'youtube'],
    ['https://www.linkedin.com/embed/feed/update/urn:li:share:1', 'linkedin'],
  ])('detects %s', (url, provider) => {
    expect(detectSocialProvider(url)).toBe(provider);
  });

  it.each([
    'https://netflix.com/user/status/123',
    'https://notfacebook.com/post',
    'https://example.com/?u=https://youtu.be/abc',
    'https://x.com/user',
    'https://www.youtube.com/feed/trending',
  ])('leaves %s to the iframe', (url) => {
    expect(detectSocialProvider(url)).toBeNull();
  });
});

describe('tweetIdFromUrl', () => {
  it('reads the post id', () => {
    expect(tweetIdFromUrl('https://x.com/jack/status/20?s=20')).toBe('20');
    expect(tweetIdFromUrl('https://x.com/jack')).toBeNull();
  });
});
