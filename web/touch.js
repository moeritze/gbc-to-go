// On-screen gamepad: multi-touch via pointer events. Each pointer holds a set of buttons;
// fingers may slide between buttons and around the D-pad (8 directions incl. diagonals).
export function attachTouch(root, press) {
  const dpad = root.querySelector('[data-dpad]');
  const held = new Map(); // pointerId -> Set of buttons
  const count = {};

  const buttonsAt = (x, y) => {
    const el = document.elementFromPoint(x, y);
    const btn = el?.closest('[data-btn]');
    if (btn && root.contains(btn)) return [btn.dataset.btn];
    const r = dpad.getBoundingClientRect();
    const dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2);
    // Accept slightly outside the cross so a sliding thumb keeps steering; ignore the dead centre.
    if (Math.hypot(dx, dy) < r.width * 0.12 || Math.hypot(dx, dy) > r.width * 0.9) return [];
    const a = (Math.atan2(dy, dx) * 180) / Math.PI; // 0 = right, 90 = down
    const out = [];
    if (a > -67.5 && a < 67.5) out.push('right');
    if (a > 112.5 || a < -112.5) out.push('left');
    if (a > 22.5 && a < 157.5) out.push('down');
    if (a < -22.5 && a > -157.5) out.push('up');
    return out;
  };

  const render = () => {
    root.querySelectorAll('[data-btn]').forEach((b) => b.classList.toggle('on', count[b.dataset.btn] > 0));
    dpad.dataset.dir = ['up', 'down', 'left', 'right'].filter((d) => count[d] > 0).join(' ');
  };

  const update = (id, next) => {
    const prev = held.get(id) || new Set();
    for (const k of prev) if (!next.has(k) && --count[k] === 0) press(k, false);
    for (const k of next) if (!prev.has(k) && (count[k] = (count[k] || 0) + 1) === 1) { press(k, true); navigator.vibrate?.(8); }
    held.set(id, next);
    render();
  };

  const move = (ev) => { if (held.has(ev.pointerId) || ev.type === 'pointerdown') update(ev.pointerId, new Set(buttonsAt(ev.clientX, ev.clientY))); };
  const end = (ev) => { update(ev.pointerId, new Set()); held.delete(ev.pointerId); };
  root.addEventListener('pointerdown', (ev) => { ev.preventDefault(); ev.target.setPointerCapture?.(ev.pointerId); move(ev); });
  root.addEventListener('pointermove', move);
  root.addEventListener('pointerup', end);
  root.addEventListener('pointercancel', end);
  root.addEventListener('lostpointercapture', end);
  root.addEventListener('contextmenu', (ev) => ev.preventDefault());
  // Release everything when the game stops or the page hides.
  return () => { for (const id of [...held.keys()]) { update(id, new Set()); held.delete(id); } };
}
