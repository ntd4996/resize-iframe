/**
 * Runs inside the embedded document and reports its content height to the parent page.
 *
 * Height comes from the bottom edge of the body's children rather than `scrollHeight`,
 * because `scrollHeight` never drops below the iframe's current height and would stop
 * the frame from shrinking. Timers are used instead of requestAnimationFrame, which
 * browsers pause in off-screen cross-origin frames.
 */
export const RESIZE_SCRIPT = `(function () {
  'use strict';
  if (window.__iframeResizeHandler || window.parent === window) return;
  window.__iframeResizeHandler = true;

  var lastHeight = 0;
  var timer = null;

  function px(value) {
    return parseFloat(value) || 0;
  }

  function measure() {
    var body = document.body;
    if (!body) return 0;
    var bottom = 0;
    var range = document.createRange();
    for (var i = 0; i < body.childNodes.length; i++) {
      var node = body.childNodes[i];
      var edge = 0;
      if (node.nodeType === 1) {
        var style = getComputedStyle(node);
        if (style.position === 'fixed' || style.display === 'none') continue;
        edge = node.getBoundingClientRect().bottom + px(style.marginBottom);
      } else if (node.nodeType === 3 && node.nodeValue.trim()) {
        range.selectNode(node);
        edge = range.getBoundingClientRect().bottom;
      }
      if (edge > bottom) bottom = edge;
    }
    if (!bottom) return document.documentElement.scrollHeight;
    var bodyStyle = getComputedStyle(body);
    return Math.ceil(
      bottom + (window.pageYOffset || 0) + px(bodyStyle.paddingBottom) + px(bodyStyle.borderBottomWidth) + px(bodyStyle.marginBottom)
    );
  }

  function report() {
    timer = null;
    var height = measure();
    if (height > 0 && height !== lastHeight) {
      lastHeight = height;
      window.parent.postMessage({ type: 'iframe-resize', height: height }, '*');
    }
  }

  function schedule() {
    if (timer === null) timer = setTimeout(report, 50);
  }

  window.addEventListener('message', function (event) {
    if (event.source === window.parent && event.data && event.data.type === 'trigger-resize') {
      lastHeight = 0;
      schedule();
    }
  });
  window.addEventListener('load', schedule);
  window.addEventListener('resize', schedule);
  ['load', 'error', 'transitionend', 'animationend', 'toggle'].forEach(function (name) {
    document.addEventListener(name, schedule, true);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);

  function observe() {
    new MutationObserver(schedule).observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'open', 'hidden']
    });
    if (window.ResizeObserver) {
      var observer = new ResizeObserver(schedule);
      observer.observe(document.documentElement);
      if (document.body) observer.observe(document.body);
    }
    schedule();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observe);
  } else {
    observe();
  }
})();`;
