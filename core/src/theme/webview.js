document.documentElement.classList.add('scroll-container');

const style = document.createElement('style');

style.innerHTML = `__INJECT_CSS__`;

document.documentElement.appendChild(style)

const EDGE = 4;

let wasNearEdge = false;

const triggerLeave = () => {
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

const triggerLeaveOnce = () => {
  if (wasNearEdge) {
    return;
  }
  wasNearEdge = true;
  triggerLeave();
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

    if (isNearEdge) {
      return triggerLeaveOnce();
    }

    wasNearEdge = false;
  }, 
  true
);

document.addEventListener(
  'mouseleave', 
  (e) => {
    if (!e.isTrusted) {
      return;
    }
    triggerLeaveOnce();
  }, 
  true
);

document.addEventListener(
  'mouseenter',
  () => {
    wasNearEdge = false;
  },
  true
);

window.addEventListener(
  'message', 
  (e) => {
    if (e.data !== 'hide-cursor') {
      return;
    }
    triggerLeaveOnce();
  }
);
