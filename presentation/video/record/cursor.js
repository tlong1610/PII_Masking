// Injected into every recorded page: Playwright videos do not show the OS cursor,
// so draw one that follows real mouse events, plus a ripple on mousedown.
(() => {
  const install = () => {
    if (document.getElementById('__rec_cursor')) return;
    const style = document.createElement('style');
    style.textContent = `
      #__rec_cursor { position: fixed; left: 0; top: 0; width: 26px; height: 26px; z-index: 2147483647;
        pointer-events: none; transform: translate(-4px, -2px); transition: transform 40ms linear; }
      .__rec_ripple { position: fixed; z-index: 2147483646; pointer-events: none; width: 44px; height: 44px;
        margin: -22px 0 0 -22px; border-radius: 50%; border: 3px solid rgba(27, 81, 164, 0.85);
        background: rgba(27, 81, 164, 0.18); animation: __rec_r 520ms ease-out forwards; }
      @keyframes __rec_r { from { transform: scale(0.35); opacity: 1; } to { transform: scale(1.6); opacity: 0; } }`;
    document.head.appendChild(style);
    const c = document.createElement('div');
    c.id = '__rec_cursor';
    c.innerHTML =
      '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 2l15 11.5-6.6.9 3.9 7.4-2.9 1.5-3.9-7.5L4 20z" fill="#111827" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.body.appendChild(c);
    const pos = window.__recPos || { x: -40, y: -40 };
    c.style.left = pos.x + 'px';
    c.style.top = pos.y + 'px';
    window.addEventListener('mousemove', (e) => {
      window.__recPos = { x: e.clientX, y: e.clientY };
      c.style.left = e.clientX + 'px';
      c.style.top = e.clientY + 'px';
    }, true);
    window.addEventListener('mousedown', (e) => {
      const r = document.createElement('div');
      r.className = '__rec_ripple';
      r.style.left = e.clientX + 'px';
      r.style.top = e.clientY + 'px';
      document.body.appendChild(r);
      setTimeout(() => r.remove(), 600);
    }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
