import type { NextApiRequest, NextApiResponse } from 'next';
import { load } from 'cheerio';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    // Xử lý đặc biệt cho Twitter URLs
    const isTwitter = /twitter\.com|^x\.com/i.test(url);
    let targetUrl = url;
    
    if (isTwitter) {
      // Giữ nguyên URL Twitter nhưng thêm các query params để hiển thị embed
      const urlObj = new URL(url);
      urlObj.searchParams.set('embed', 'true');
      if (!urlObj.searchParams.has('s')) {
        urlObj.searchParams.set('s', '20');
      }
      targetUrl = urlObj.toString();
    }

    // Fetch HTML từ URL gốc
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://twitter.com/',
        'Origin': 'https://twitter.com',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch URL' });
    }

    let html = await response.text();
    let $ = load(html);

    // Xử lý đặc biệt cho Twitter: remove các meta tags chặn iframe
    if (isTwitter) {
      // Remove X-Frame-Options meta tags
      $('meta[http-equiv="X-Frame-Options"]').remove();
      $('meta[http-equiv="x-frame-options"]').remove();
      // Remove CSP headers có thể chặn iframe
      $('meta[http-equiv="Content-Security-Policy"]').each((_, el) => {
        const content = $(el).attr('content') || '';
        if (content.includes('frame-ancestors')) {
          $(el).remove();
        }
      });
      
      // Reload HTML sau khi remove
      html = $.html();
      $ = load(html);
    }

    // Đảm bảo body tồn tại
    if ($('body').length === 0) {
      $('html').append('<body></body>');
    }

    // Inject script vào cuối body hoặc trước </body>
    // Sử dụng IIFE và đặt tên không trùng với các biến global khác
    const resizeScript = `
      <script>
        (function() {
          'use strict';
          
          // Đảm bảo không override các hàm global hiện có
          if (window.__iframeResizeHandler) {
            return; // Đã được inject rồi
          }
          
          let lastHeight = 0;
          let isUpdating = false;
          let updateTimer = null;
          let stableCount = 0;
          let observer = null;
          const TOLERANCE = 10; // Tăng tolerance để giảm số lần update
          const MAX_STABLE_COUNT = 3; // Sau 3 lần stable thì tắt MutationObserver
          const MAX_HEIGHT = 10000; // Giới hạn max height để tránh loop
          
          function getActualHeight() {
            const body = document.body;
            const html = document.documentElement;
            
            if (!body || !html) {
              return 0;
            }
            
            // Lấy giá trị height chính xác nhất
            const height = Math.max(
              body.scrollHeight || 0,
              body.offsetHeight || 0,
              html.scrollHeight || 0,
              html.offsetHeight || 0
            );
            
            return Math.ceil(Math.min(height, MAX_HEIGHT));
          }
          
          function sendHeight(height) {
            // Kiểm tra nếu height không hợp lệ hoặc quá lớn
            if (height <= 0 || height > MAX_HEIGHT) {
              return;
            }
            
            const heightDiff = Math.abs(height - lastHeight);
            
            // Chỉ gửi nếu thay đổi đáng kể
            if (!isUpdating && heightDiff > TOLERANCE) {
              lastHeight = height;
              isUpdating = true;
              
              if (window.parent && window.parent !== window) {
                window.parent.postMessage({ 
                  type: 'iframe-resize', 
                  height: height 
                }, '*');
              }
              
              // Reset flag sau một chút
              setTimeout(function() {
                isUpdating = false;
              }, 200);
              
              stableCount = 0; // Reset stable count khi có thay đổi
            } else if (heightDiff <= TOLERANCE) {
              stableCount++;
              // Nếu đã stable nhiều lần, disconnect observer để tránh loop
              if (stableCount >= MAX_STABLE_COUNT && observer) {
                observer.disconnect();
                observer = null;
              }
            }
          }
          
          function updateHeight() {
            // Debounce: chỉ chạy sau 200ms (tăng từ 50ms)
            if (updateTimer) {
              clearTimeout(updateTimer);
            }
            
            updateTimer = setTimeout(function() {
              requestAnimationFrame(function() {
                const height = getActualHeight();
                sendHeight(height);
              });
            }, 200);
          }
          
          // Chạy ngay khi script được inject
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
              setTimeout(updateHeight, 300);
            });
          } else {
            setTimeout(updateHeight, 300);
          }
          
          // Chỉ trigger một vài lần sau load
          window.addEventListener('load', function() {
            setTimeout(updateHeight, 500);
            setTimeout(updateHeight, 2000);
          }, { once: true });
          
          // Throttle resize event
          let resizeTimer = null;
          window.addEventListener('resize', function() {
            if (resizeTimer) {
              clearTimeout(resizeTimer);
            }
            resizeTimer = setTimeout(updateHeight, 500);
          });
          
          // Listen cho trigger message từ parent
          window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'trigger-resize') {
              updateHeight();
            }
          });
          
          // MutationObserver với debounce - chỉ bật khi cần
          if (window.MutationObserver && !observer) {
            observer = new MutationObserver(function() {
              updateHeight();
            });
            
            // Chỉ observe khi body đã sẵn sàng
            if (document.body) {
              observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: false,
                characterData: false
              });
              
              // Tự động disconnect sau 10 giây để tránh loop
              setTimeout(function() {
                if (observer) {
                  observer.disconnect();
                  observer = null;
                }
              }, 10000);
            }
          }
          
          // Theo dõi thay đổi hình ảnh (chỉ một lần)
          function setupImageListeners() {
            const images = document.querySelectorAll('img');
            images.forEach(function(img) {
              if (!img.complete) {
                img.addEventListener('load', updateHeight, { once: true });
                img.addEventListener('error', updateHeight, { once: true });
              }
            });
          }
          
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupImageListeners);
          } else {
            setupImageListeners();
          }
          
          // Theo dõi thay đổi của iframe con (chỉ một lần)
          function setupIframeListeners() {
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(function(iframe) {
              try {
                iframe.addEventListener('load', updateHeight, { once: true });
              } catch (e) {
                // Ignore cross-origin errors
              }
            });
          }
          
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupIframeListeners);
          } else {
            setupIframeListeners();
          }
          
          // Đánh dấu đã inject
          window.__iframeResizeHandler = true;
        })();
      </script>
    `;

    // Inject script vào cuối body
    const body = $('body');
    if (body.length > 0) {
      body.append(resizeScript);
    } else {
      // Nếu không có body, inject vào cuối html
      $('html').append(resizeScript);
    }

    // Set headers để cho phép CORS và trả về HTML
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    // Bỏ X-Frame-Options để cho phép embed
    // res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    return res.status(200).send($.html());
  } catch (error) {
    console.error('Error fetching URL:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

