'use client';

import {
  TwitterEmbed,
  InstagramEmbed,
  FacebookEmbed,
  TikTokEmbed,
  YouTubeEmbed,
  LinkedInEmbed,
} from 'react-social-media-embed';
import AutoIframe from './AutoIframe';

interface SmartEmbedProps {
  src: string;
  width?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export default function SmartEmbed({ src, width = '100%', className, style }: SmartEmbedProps) {
  const widthValue = typeof width === 'number' ? `${width}px` : width;
  const containerStyle: React.CSSProperties = {
    width: widthValue,
    maxWidth: '100%',
    display: 'flex',
    justifyContent: 'flex-start',
    ...style,
  };

  // Detect Twitter/X
  const twitterMatch = src.match(/(?:twitter\.com|x\.com)\/(\w+)\/status\/(\d+)/i);
  if (twitterMatch) {
    return (
      <div style={containerStyle} className={className}>
        <TwitterEmbed url={src} width={widthValue} />
      </div>
    );
  }

  // Detect Instagram
  if (/instagram\.com\/p\//i.test(src) || /instagram\.com\/reel\//i.test(src)) {
    return (
      <div style={containerStyle} className={className}>
        <InstagramEmbed url={src} width={widthValue} />
      </div>
    );
  }

  // Detect Facebook
  if (/facebook\.com/i.test(src)) {
    return (
      <div style={containerStyle} className={className}>
        <FacebookEmbed url={src} width={widthValue} />
      </div>
    );
  }

  // Detect TikTok
  if (/tiktok\.com/i.test(src)) {
    return (
      <div style={containerStyle} className={className}>
        <TikTokEmbed url={src} width={widthValue} />
      </div>
    );
  }

  // Detect YouTube
  const youtubeMatch = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/i);
  if (youtubeMatch) {
    return (
      <div style={containerStyle} className={className}>
        <YouTubeEmbed url={src} width={widthValue} />
      </div>
    );
  }

  // Detect LinkedIn
  if (/linkedin\.com/i.test(src)) {
    return (
      <div style={containerStyle} className={className}>
        <LinkedInEmbed url={src} width={widthValue} />
      </div>
    );
  }

  // Fallback: sử dụng AutoIframe cho các URLs khác
  return <AutoIframe src={src} width={width} className={className} style={style} />;
}

