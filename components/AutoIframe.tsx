'use client';

import { useEffect, useRef, useState } from 'react';

interface AutoIframeProps {
  src: string;
  width?: string | number; // Có thể là "100%", "500px", hoặc số như 800
  className?: string;
  style?: React.CSSProperties;
}

export default function AutoIframe({ src, width = '100%', className, style }: AutoIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState<number>(600);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastHeightRef = useRef<number>(600);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveUpdatesRef = useRef<number>(0);
  const MAX_CONSECUTIVE_UPDATES = 10; // Giới hạn số lần update liên tục

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Kiểm tra message có phải từ iframe của component này không
      if (
        event.data?.type === 'iframe-resize' && 
        typeof event.data.height === 'number' &&
        event.data.height > 0 &&
        event.data.height < 10000 // Giới hạn max height
      ) {
        // Thêm một chút padding để tránh bị cắt
        const newHeight = event.data.height + 10;
        
        // Chỉ update nếu height thay đổi đáng kể (tránh update liên tục)
        const heightDiff = Math.abs(newHeight - lastHeightRef.current);
        
        if (heightDiff > 10) { // Tăng tolerance lên 10px
          // Kiểm tra nếu đang update liên tục
          consecutiveUpdatesRef.current++;
          
          if (consecutiveUpdatesRef.current > MAX_CONSECUTIVE_UPDATES) {
            // Nếu update quá nhiều lần liên tục, dừng lại
            console.warn('Too many consecutive updates, stopping auto-resize');
            return;
          }
          
          // Debounce update
          if (updateTimerRef.current) {
            clearTimeout(updateTimerRef.current);
          }
          
          updateTimerRef.current = setTimeout(() => {
            lastHeightRef.current = newHeight;
            setHeight(newHeight);
            
            // Reset counter sau khi update thành công
            setTimeout(() => {
              consecutiveUpdatesRef.current = 0;
            }, 1000);
          }, 100);
        } else {
          // Reset counter nếu không có thay đổi đáng kể
          consecutiveUpdatesRef.current = 0;
        }
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
    };
  }, []);

  // Reset height khi src thay đổi
  useEffect(() => {
    setHeight(600);
    lastHeightRef.current = 600;
    consecutiveUpdatesRef.current = 0;
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
    }
  }, [src]);

  // Trigger resize khi width thay đổi
  useEffect(() => {
    // Reset height và trigger resize khi width thay đổi
    setHeight(600);
    lastHeightRef.current = 600;
    consecutiveUpdatesRef.current = 0;
    
    // Chờ DOM update và iframe render với width mới
    const timer1 = setTimeout(() => {
      if (iframeRef.current?.contentWindow) {
        try {
          iframeRef.current.contentWindow.postMessage(
            { type: 'trigger-resize' },
            '*'
          );
        } catch (e) {
          // Ignore cross-origin errors
        }
      }
    }, 300);
    
    // Trigger lại sau một chút để đảm bảo content đã adjust theo width mới
    const timer2 = setTimeout(() => {
      if (iframeRef.current?.contentWindow) {
        try {
          iframeRef.current.contentWindow.postMessage(
            { type: 'trigger-resize' },
            '*'
          );
        } catch (e) {
          // Ignore cross-origin errors
        }
      }
    }, 800);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [width]);

  // Twitter/X.com URLs phải load trực tiếp từ browser (không qua proxy)
  // Vì Twitter phát hiện và chặn server-side requests
  // Khi load trực tiếp, browser có cookies/session nên Twitter cho phép
  const isTwitter = /twitter\.com|x\.com/i.test(src);
  const iframeSrc = isTwitter ? src : `/api/embed?url=${encodeURIComponent(src)}`;
  
  // Chuyển đổi width thành string format
  const widthValue = typeof width === 'number' ? `${width}px` : width;
  
  // Container width - nếu là 100% thì giữ nguyên, nếu không thì dùng widthValue
  // Khi ở trong container có padding, nên để container fit 100% và iframe cũng 100%
  const containerWidth = width === '100%' ? '100%' : '100%';
  const containerMaxWidth = width === '100%' ? '100%' : widthValue;

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: containerWidth,
        maxWidth: containerMaxWidth,
        overflow: 'hidden', 
        margin: 0,
        boxSizing: 'border-box',
        transition: 'max-width 0.3s ease'
      }}
    >
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        width={width === '100%' ? '100%' : '100%'}
        height={height}
        className={className}
        style={{
          border: 'none',
          transition: 'height 0.3s ease',
          display: 'block',
          width: '100%',
          maxWidth: '100%',
          ...style,
        }}
        scrolling="no"
        onLoad={() => {
          // Reset khi iframe load lại
          consecutiveUpdatesRef.current = 0;
          // Trigger resize sau khi iframe load xong (chỉ một lần)
          // Lưu ý: Twitter có thể không cho phép postMessage từ cross-origin
          setTimeout(() => {
            if (iframeRef.current?.contentWindow) {
              try {
                iframeRef.current.contentWindow.postMessage(
                  { type: 'trigger-resize' },
                  '*'
                );
              } catch (e) {
                // Ignore cross-origin errors
              }
            }
          }, 500);
        }}
      />
    </div>
  );
}

