import type { ComponentType } from 'react';
import {
  FacebookEmbed,
  InstagramEmbed,
  LinkedInEmbed,
  TikTokEmbed,
  YouTubeEmbed,
} from 'react-social-media-embed';
import AutoIframe, { type AutoIframeProps } from './AutoIframe';
import { detectSocialProvider, toCssSize, type SocialProvider } from './url';
import XEmbed from './XEmbed';

const SOCIAL_EMBEDS: Record<SocialProvider, ComponentType<{ url: string; width?: string | number }>> = {
  twitter: XEmbed,
  instagram: InstagramEmbed,
  facebook: FacebookEmbed,
  tiktok: TikTokEmbed,
  youtube: YouTubeEmbed,
  linkedin: LinkedInEmbed,
};

/** Renders the provider's own embed for social links and an `AutoIframe` for everything else. */
export default function SmartEmbed(props: AutoIframeProps) {
  const { src, width = '100%', className, style } = props;
  const provider = detectSocialProvider(src);

  if (!provider) return <AutoIframe {...props} />;

  const Embed = SOCIAL_EMBEDS[provider];
  const cssWidth = toCssSize(width);
  return (
    <div className={className} style={{ display: 'flex', width: cssWidth, maxWidth: '100%', ...style }}>
      <Embed url={src} width={cssWidth} />
    </div>
  );
}
