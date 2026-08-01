// === COSPECTRA MAIN FRAME DETECTION ===
// This script runs in ALL frames (main + iframes) via Tauri's initialization_script_for_all_frames.
// Only iframes (not the main Cospectra app) should run the inspector logic.

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

    // Inject a crosshair cursor style that we can toggle
    var cursorStyle = document.createElement('style');
    cursorStyle.id = '__cospectra_cursor_style';
    cursorStyle.textContent = '';
    document.documentElement.appendChild(cursorStyle);

    // Listen for inspect mode toggle from parent (Cospectra Vue app)
    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'COSPECTRA_SET_INSPECT') {
        inspectEnabled = e.data.enabled;
        // Toggle crosshair cursor on ALL elements inside the iframe
        if (inspectEnabled) {
          cursorStyle.textContent = '*, *::before, *::after { cursor: crosshair !important; }';
        } else {
          cursorStyle.textContent = '';
          // Remove any existing highlight overlay
          var existing = document.getElementById('__cospectra_hover_overlay');
          if (existing) existing.style.display = 'none';
        }
      }
    });

    // Create a highlight overlay element inside the iframe
    var overlay = document.createElement('div');
    overlay.id = '__cospectra_hover_overlay';
    overlay.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;border:2px solid #358ef1;background:rgba(53,142,241,0.12);display:none;transition:top 0.06s ease-out,left 0.06s ease-out,width 0.06s ease-out,height 0.06s ease-out;';
    document.documentElement.appendChild(overlay);

    // Create a tooltip label for hovered element
    var tooltip = document.createElement('div');
    tooltip.id = '__cospectra_hover_tooltip';
    tooltip.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;background:#1e1e2e;color:#58a6ff;font-family:monospace;font-size:11px;font-weight:600;padding:3px 8px;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:none;white-space:nowrap;';
    document.documentElement.appendChild(tooltip);

    // Hover handler: highlight element and send rect to parent
    document.addEventListener('mousemove', function(e) {
      if (!inspectEnabled) return;
      var target = e.target;
      if (!target || target === overlay || target === tooltip || target === document.body || target === document.documentElement) return;

      var r = target.getBoundingClientRect();
      overlay.style.display = 'block';
      overlay.style.top = r.top + 'px';
      overlay.style.left = r.left + 'px';
      overlay.style.width = r.width + 'px';
      overlay.style.height = r.height + 'px';

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
        rect: { top: r.top, left: r.left, width: r.width, height: r.height },
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
