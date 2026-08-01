document.documentElement.classList.add('cospectra-scrollbar-hidden');

const style = document.createElement('style');

style.innerHTML = `__INJECT_CSS__`;

document.documentElement.appendChild(style)

const EDGE = 15;

const hideCursor = () => {
  document.dispatchEvent(
    new MouseEvent('mouseleave', { 
      view: window, 
      bubbles: true, 
      cancelable: true 
    })
  );
  window.dispatchEvent(
    new MouseEvent('mouseout', { 
      view: window, 
      bubbles: true, 
      cancelable: true, 
      relatedTarget: null
    })
  );
};

window.addEventListener(
  'mousemove', 
  (e) => {
  
    if (!e.isTrusted) {
      return;
    }

    const isNearEdge = [
      e.clientX,
      e.clientY,
      window.innerWidth - e.clientX,
      window.innerHeight - e.clientY,
    ].some(distance => distance <= EDGE);

    if (!isNearEdge) {
      return;
    }

    hideCursor();
    e.stopPropagation();
  }, 
  true
);

document.addEventListener(
  'mouseleave', 
  (e) => {
    if (!e.isTrusted) {
      return;
    }
    hideCursor();
  }, 
  true
);

window.addEventListener(
  'message', 
  (e) => {
    if (e.data !== 'hide-cursor') {
      return;
    }
    hideCursor();
  }
);

// === COSPECTRA IFRAME INSPECTOR ===
// Only activate inside iframes (not the main Cospectra app window).
// The main window has the Vue app; iframes have the target website.
if (window !== window.top) {
  (function() {
    let inspectEnabled = false;
    var hiddenCursorElements = [];

    // === REAL-TIME URL CHANGE MONITORING ===
    var lastReportedUrl = '';
    function checkAndReportUrlChange() {
      try {
        var currentHref = window.location.href;
        if (currentHref && currentHref !== lastReportedUrl && currentHref !== 'about:blank') {
          lastReportedUrl = currentHref;
          window.parent.postMessage({
            type: 'COSPECTRA_URL_CHANGED',
            url: currentHref
          }, '*');
        }
      } catch (err) {}
    }

    checkAndReportUrlChange();
    window.addEventListener('popstate', checkAndReportUrlChange);
    window.addEventListener('hashchange', checkAndReportUrlChange);
    document.addEventListener('DOMContentLoaded', checkAndReportUrlChange);

    // Patch history.pushState and history.replaceState for SPA navigation
    try {
      var origPushState = history.pushState;
      if (origPushState) {
        history.pushState = function() {
          origPushState.apply(this, arguments);
          setTimeout(checkAndReportUrlChange, 50);
        };
      }
      var origReplaceState = history.replaceState;
      if (origReplaceState) {
        history.replaceState = function() {
          origReplaceState.apply(this, arguments);
          setTimeout(checkAndReportUrlChange, 50);
        };
      }
    } catch (err) {}

    // Polling backup to guarantee real-time sync
    setInterval(checkAndReportUrlChange, 400);

    // Detect and hide custom cursor elements programmatically
    // These are typically position:fixed, pointer-events:none, small divs with high z-index
    function hideCustomCursorElements() {
      hiddenCursorElements = [];
      var allEls = document.querySelectorAll('*');
      for (var i = 0; i < allEls.length; i++) {
        var el = allEls[i];
        // Skip our own elements
        if (el.id && el.id.startsWith('__cospectra_')) continue;
        var cs = window.getComputedStyle(el);
        var isFixed = cs.position === 'fixed';
        var noPointer = cs.pointerEvents === 'none';
        var rect = el.getBoundingClientRect();
        var isSmall = rect.width <= 80 && rect.height <= 80 && rect.width > 0 && rect.height > 0;
        var zVal = parseInt(cs.zIndex);
        var hasHighZ = zVal > 900 || cs.zIndex === 'auto';

        if (isFixed && noPointer && isSmall && hasHighZ) {
          hiddenCursorElements.push({ el: el, prevVis: el.style.visibility, prevOp: el.style.opacity });
          el.style.setProperty('visibility', 'hidden', 'important');
          el.style.setProperty('opacity', '0', 'important');
        }
      }
    }

    // Restore hidden custom cursor elements
    function restoreCustomCursorElements() {
      for (var i = 0; i < hiddenCursorElements.length; i++) {
        var item = hiddenCursorElements[i];
        item.el.style.visibility = item.prevVis || '';
        item.el.style.opacity = item.prevOp || '';
      }
      hiddenCursorElements = [];
    }

    // Listen for inspect mode toggle from parent (Cospectra Vue app)
    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'COSPECTRA_SET_INSPECT') {
        inspectEnabled = e.data.enabled;
        if (inspectEnabled) {
          // Toggle class that activates crosshair cursor + hides CSS-detectable cursor elements
          document.documentElement.classList.add('cospectra-inspect-active');
          // Also programmatically hide cursor elements that CSS selectors can't catch
          hideCustomCursorElements();
        } else {
          document.documentElement.classList.remove('cospectra-inspect-active');
          restoreCustomCursorElements();
          // Hide overlay and tooltip
          var overlay = document.getElementById('__cospectra_hover_overlay');
          if (overlay) overlay.style.display = 'none';
          var tip = document.getElementById('__cospectra_hover_tooltip');
          if (tip) tip.style.display = 'none';
        }
      }
    });

    // Create highlight overlay element (styles defined in webview.css)
    var overlay = document.createElement('div');
    overlay.id = '__cospectra_hover_overlay';
    document.documentElement.appendChild(overlay);

    // Create tooltip label (styles defined in webview.css)
    var tooltip = document.createElement('div');
    tooltip.id = '__cospectra_hover_tooltip';
    document.documentElement.appendChild(tooltip);

    // Calculate effective border-radius taking into account:
    // 1) Direct element border-radius
    // 2) Parent container border-radius & clipping (when child touches parent corner)
    // 3) Webview window frame rounded corners (14px = 0.875rem) when element touches iframe boundaries
    function getEffectiveBorderRadius(target, r) {
      var comp = window.getComputedStyle(target);
      
      var tl = parseFloat(comp.borderTopLeftRadius) || 0;
      var tr = parseFloat(comp.borderTopRightRadius) || 0;
      var br = parseFloat(comp.borderBottomRightRadius) || 0;
      var bl = parseFloat(comp.borderBottomLeftRadius) || 0;

      // Check parent tree for containers with rounded corners
      var curr = target.parentElement;
      while (curr && curr !== document.documentElement && curr !== document.body) {
        var pComp = window.getComputedStyle(curr);
        var pR = curr.getBoundingClientRect();
        
        var pTl = parseFloat(pComp.borderTopLeftRadius) || 0;
        var pTr = parseFloat(pComp.borderTopRightRadius) || 0;
        var pBr = parseFloat(pComp.borderBottomRightRadius) || 0;
        var pBl = parseFloat(pComp.borderBottomLeftRadius) || 0;

        if (pTl > 0 || pTr > 0 || pBr > 0 || pBl > 0) {
          // If child touches parent's top-left corner
          if (Math.abs(r.top - pR.top) <= 5 && Math.abs(r.left - pR.left) <= 5) {
            tl = Math.max(tl, pTl);
          }
          // If child touches parent's top-right corner
          if (Math.abs(r.top - pR.top) <= 5 && Math.abs(r.right - pR.right) <= 5) {
            tr = Math.max(tr, pTr);
          }
          // If child touches parent's bottom-right corner
          if (Math.abs(r.bottom - pR.bottom) <= 5 && Math.abs(r.right - pR.right) <= 5) {
            br = Math.max(br, pBr);
          }
          // If child touches parent's bottom-left corner
          if (Math.abs(r.bottom - pR.bottom) <= 5 && Math.abs(r.left - pR.left) <= 5) {
            bl = Math.max(bl, pBl);
          }
        }
        curr = curr.parentElement;
      }

      // Check Webview Frame Viewport Edges (web frame radius is 0.875rem = 14px)
      var FRAME_RADIUS = 14;
      var winW = window.innerWidth;
      var winH = window.innerHeight;

      if (r.top <= 5 && r.left <= 5) {
        tl = Math.max(tl, FRAME_RADIUS);
      }
      if (r.top <= 5 && r.right >= winW - 5) {
        tr = Math.max(tr, FRAME_RADIUS);
      }
      if (r.bottom >= winH - 5 && r.right >= winW - 5) {
        br = Math.max(br, FRAME_RADIUS);
      }
      if (r.bottom >= winH - 5 && r.left <= 5) {
        bl = Math.max(bl, FRAME_RADIUS);
      }

      return tl + 'px ' + tr + 'px ' + br + 'px ' + bl + 'px';
    }

    // Hover handler: highlight element and send rect to parent
    document.addEventListener('mousemove', function(e) {
      if (!inspectEnabled) return;
      var target = e.target;
      if (!target || target === overlay || target === tooltip || target === document.body || target === document.documentElement) return;
      if (target.id && target.id.startsWith('__cospectra_')) return;

      var r = target.getBoundingClientRect();

      overlay.style.display = 'block';
      overlay.style.top = r.top + 'px';
      overlay.style.left = r.left + 'px';
      overlay.style.width = r.width + 'px';
      overlay.style.height = r.height + 'px';
      overlay.style.borderRadius = getEffectiveBorderRadius(target, r);

      var tag = target.tagName.toLowerCase();
      var idName = target.id || '';
      var className = target.className && typeof target.className === 'string' ? target.className : '';
      var label = tag + (idName ? '#' + idName : '') + (className ? '.' + className.split(' ')[0] : '');
      var dims = Math.round(r.width) + ' × ' + Math.round(r.height);

      // Position tooltip above the element
      tooltip.textContent = label + '  ' + dims;
      tooltip.style.display = 'block';
      var tooltipTop = r.top - 28;
      if (tooltipTop < 4) tooltipTop = r.bottom + 4;
      tooltip.style.top = tooltipTop + 'px';
      tooltip.style.left = Math.max(4, r.left) + 'px';

      window.parent.postMessage({
        type: 'COSPECTRA_INSPECT_DATA',
        action: 'hover',
        rect: { top: r.top, left: r.left, width: r.width, height: r.height },
        label: label + ' (' + dims + ')'
      }, '*');
    }, true);

    // Click handler: capture element info and send to parent
    document.addEventListener('click', function(e) {
      if (!inspectEnabled) return;
      var target = e.target;
      if (!target || target === overlay || target === tooltip) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      var r = target.getBoundingClientRect();
      var comp = window.getComputedStyle(target);
      var tag = target.tagName.toLowerCase();
      var idName = target.id || '';
      var className = target.className && typeof target.className === 'string' ? target.className : '';
      var label = tag + (idName ? '#' + idName : '') + (className ? '.' + className.split(' ')[0] : '') + ' (' + Math.round(r.width) + ' × ' + Math.round(r.height) + ')';
      
      // Get clean outerHTML (limit size for very large elements)
      var code = target.outerHTML || ('<' + tag + '>' + (target.innerText || '').substring(0, 500) + '</' + tag + '>');
      if (code.length > 5000) {
        code = code.substring(0, 5000) + '\n<!-- truncated -->';
      }

      // Collect comprehensive computed styles grouped by category
      var layoutStyles = {
        'display': comp.display,
        'position': comp.position,
        'top': comp.top,
        'right': comp.right,
        'bottom': comp.bottom,
        'left': comp.left,
        'z-index': comp.zIndex,
        'float': comp.cssFloat,
        'clear': comp.clear,
        'overflow': comp.overflow,
      };
      var boxStyles = {
        'width': Math.round(r.width) + 'px',
        'height': Math.round(r.height) + 'px',
        'margin': comp.margin,
        'padding': comp.padding,
        'border': comp.border,
        'border-radius': comp.borderRadius,
        'box-sizing': comp.boxSizing,
      };
      var typoStyles = {
        'font-family': comp.fontFamily,
        'font-size': comp.fontSize,
        'font-weight': comp.fontWeight,
        'line-height': comp.lineHeight,
        'letter-spacing': comp.letterSpacing,
        'text-align': comp.textAlign,
        'text-decoration': comp.textDecoration,
        'text-transform': comp.textTransform,
        'color': comp.color,
      };
      var visualStyles = {
        'background': comp.background,
        'background-color': comp.backgroundColor,
        'box-shadow': comp.boxShadow,
        'opacity': comp.opacity,
        'visibility': comp.visibility,
        'cursor': comp.cursor,
        'transition': comp.transition,
        'transform': comp.transform,
      };
      var flexGridStyles = {
        'flex-direction': comp.flexDirection,
        'flex-wrap': comp.flexWrap,
        'justify-content': comp.justifyContent,
        'align-items': comp.alignItems,
        'gap': comp.gap,
        'flex': comp.flex,
        'grid-template-columns': comp.gridTemplateColumns,
        'grid-template-rows': comp.gridTemplateRows,
      };

      // Hide overlay and tooltip on selection
      overlay.style.display = 'none';
      tooltip.style.display = 'none';

      window.parent.postMessage({
        type: 'COSPECTRA_INSPECT_DATA',
        action: 'click',
        rect: { 
          top: r.top, 
          left: r.left, width: r.width, height: r.height },
        tag: tag,
        idName: idName,
        className: className,
        label: label,
        codeSnippet: code.trim(),
        styleGroups: {
          'Layout': layoutStyles,
          'Box Model': boxStyles,
          'Typography': typoStyles,
          'Visual': visualStyles,
          'Flex & Grid': flexGridStyles,
        }
      }, '*');
    }, true);
  })();
}
