document.documentElement.classList.add('scrollbar-hidden');

const style = document.createElement('style');

style.innerHTML = `__INJECT_CSS__`;

document.documentElement.appendChild(style);

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
