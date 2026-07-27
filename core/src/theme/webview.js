document.documentElement.classList.add('scroll-container');

const style = document.createElement('style');

style.innerHTML = `__INJECT_CSS__`;

document.documentElement.appendChild(style)

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

const EDGE = 4;

let wasNearEdge = false;

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
      wasNearEdge = false;
      return;
    }

    if (wasNearEdge) {
      return;
    }

    wasNearEdge = true;

    document.dispatchEvent(
      new MouseEvent('mousemove', {
        view: window, 
        bubbles: true, 
        cancelable: true,
      })
    );
    triggerLeave();
  }, 
  true
);

const triggerLeaveOnce = () => {
  if (wasNearEdge) {
    return;
  }
  wasNearEdge = true;
  triggerLeave();
};

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

window.addEventListener(
  'message', 
  (e) => {
    if (e.data !== 'hide-cursor') {
      return;
    }
    triggerLeaveOnce();
  }
);
