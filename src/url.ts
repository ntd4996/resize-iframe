export type SocialProvider = 'twitter' | 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'linkedin';

/** Parses a URL and accepts only http(s), which rules out `javascript:` and `data:` iframe sources. */
export function parseHttpUrl(value: string, base?: string): URL | null {
  try {
    const url = new URL(value.trim(), base);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

/** True when `host` is `domain` or one of its subdomains. */
export function hostMatches(host: string, domain: string): boolean {
  const normalized = domain.toLowerCase();
  return host === normalized || host.endsWith(`.${normalized}`);
}

export function detectSocialProvider(src: string): SocialProvider | null {
  const url = parseHttpUrl(src);
  if (!url) return null;

  const host = url.hostname.toLowerCase();
  const path = url.pathname;

  if ((hostMatches(host, 'twitter.com') || hostMatches(host, 'x.com')) && /^\/\w+\/status\/\d+/.test(path)) {
    return 'twitter';
  }
  if (hostMatches(host, 'instagram.com') && /^\/(p|reel)\//.test(path)) return 'instagram';
  if (hostMatches(host, 'facebook.com')) return 'facebook';
  if (hostMatches(host, 'tiktok.com')) return 'tiktok';
  if (hostMatches(host, 'linkedin.com')) return 'linkedin';
  if (hostMatches(host, 'youtu.be') && path.length > 1) return 'youtube';
  if (hostMatches(host, 'youtube.com') && ((path === '/watch' && url.searchParams.has('v')) || path.startsWith('/embed/'))) {
    return 'youtube';
  }
  return null;
}

export function toCssSize(value: string | number): string {
  return typeof value === 'number' ? `${value}px` : value;
}
