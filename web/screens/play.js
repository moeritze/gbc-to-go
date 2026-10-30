import * as emu from '../emulator.js';
import { attachTouch } from '../touch.js';
import { loadRomBytes, markPlayed } from '../library.js';
import { loadSram, writeSram, loadState, writeState, hasState } from '../saves.js';

let leave = null; // set by mount; unmount awaits it

export async function mount(root, ctx) {
  const { rom } = ctx.params;
  const s = ctx.settings;
  const touch = s.touchPad === 'on' || (s.touchPad === 'auto' && matchMedia('(pointer: coarse)').matches);
  document.body.classList.toggle('touch', touch);
  root.innerHTML = `<section class="play">
    <header class="bar play-bar">
      <button class="back" type="button">‹ Menu</button>
      <span class="status pill" role="status">Loading…</span>
    </header>
    <div class="console">
      <div class="screen-wrap"><canvas width="160" height="144" aria-label="Game screen: ${rom.title.replace(/"/g, '')}"></canvas></div>
      <div class="state-row" ${s.saveStates ? '' : 'hidden'}>
        <button class="ghost" type="button" data-save disabled>Save state</button>
        <button class="ghost" type="button" data-load disabled>Load state</button>
      </div>
      <div class="gamepad" ${touch ? '' : 'hidden'}>
        <div class="dpad" data-dpad role="group" aria-label="D-pad"><span></span></div>
        <div class="ab">
          <button type="button" data-btn="B" class="round" aria-label="B">B</button>
          <button type="button" data-btn="A" class="round" aria-label="A">A</button>
        </div>
        <div class="meta">
          <button type="button" data-btn="select" class="meta-btn">Select</button>
          <button type="button" data-btn="start" class="meta-btn">Start</button>
        </div>
      </div>
      <p class="keys muted" ${touch ? 'hidden' : ''}>Arrows move. X is A, Z is B, Enter is Start, Shift is Select.</p>
    </div></section>`;
  const status = root.querySelector('.status');
  const saveBtn = root.querySelector('[data-save]');
  const loadBtn = root.querySelector('[data-load]');
  const setStatus = (t) => { status.textContent = t; };
  const cloud = s.cloudSaves;
  root.querySelector('.back').onclick = () => ctx.show('library');

  let gone = false, running = null, release = () => {}, sram = null, offline = false;

  const savedText = () => (cloud && !navigator.onLine ? 'Offline, saved on this device' : 'Saved ✓');
  // Writes the newest SRAM. Called with bytes already read, so it also works after the emulator stopped.
  const writeBytes = async (bytes) => {
    setStatus(cloud && !navigator.onLine ? 'Offline, saved on this device' : 'Saving…');
    try {
      await writeSram(rom.id, bytes, { cloud });
      setStatus(savedText());
    } catch (e) {
      console.error(e);
      setStatus('Save failed');
      ctx.toast('Could not save the game. Keep playing; it retries on the next save.');
    }
  };
  // Writes SRAM changed since the emulator's last once-per-second callback.
  const flushSram = () => running?.flushDirty();
  const autoState = () => (s.saveStates && s.autoStateOnExit && running
    ? writeState(rom.id, running.getState()).catch((e) => { console.error(e); ctx.toast('Could not save the state.'); })
    : null);
  const onVis = () => {
    if (!document.hidden) return;
    release();
    flushSram();
    autoState();
  };

  leave = async () => {
    gone = true;
    document.removeEventListener('visibilitychange', onVis);
    document.body.classList.remove('touch');
    release();
    // Read everything from the emulator before stopping it, then wait for the writes.
    const writes = [flushSram(), autoState()];
    emu.stop();
    // Offline, a cloud write may only resolve once synced: do not block navigation on it (it stays queued).
    await Promise.race([Promise.all(writes), new Promise((r) => setTimeout(r, 3000))]);
  };

  try {
    const [bytes, saved] = await Promise.all([loadRomBytes(rom.id), loadSram(rom.id, { cloud })]);
    ({ sram, offline } = saved);
    if (gone) return;
    running = await emu.start(bytes, {
      canvas: root.querySelector('canvas'),
      sram,
      sound: s.sound,
      // The emulator already throttles this to once per second: write straight away.
      onSramDirty: (getSram) => writeBytes(getSram()),
    });
    if (gone) { running.stop(); running = null; return; }
  } catch (e) {
    console.error(e);
    setStatus('Not started');
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = `Could not start ${rom.title}. ${e.message || ''}`;
    root.querySelector('.console').replaceChildren(p);
    return;
  }
  setStatus(offline ? "Using this device's save" : savedText());
  document.addEventListener('visibilitychange', onVis);
  if (touch) release = attachTouch(root.querySelector('.gamepad'), running.press);
  Promise.resolve(markPlayed(rom.id)).catch((e) => console.error(e));

  if (s.saveStates) {
    saveBtn.disabled = false;
    hasState(rom.id).then((has) => { loadBtn.disabled = !has; }).catch((e) => console.error(e));
    saveBtn.onclick = async () => {
      saveBtn.blur(); // keep keyboard focus off the button so arrows/Enter reach the game
      saveBtn.disabled = true;
      try {
        await writeState(rom.id, running.getState());
        loadBtn.disabled = false;
        ctx.toast('State saved');
      } catch (e) {
        console.error(e);
        ctx.toast('Could not save the state. Check your connection.');
      } finally {
        saveBtn.disabled = gone;
      }
    };
    loadBtn.onclick = async () => {
      loadBtn.blur();
      if (!(await ctx.confirmDialog('Load the saved state? Progress since then is lost.', 'Load state')) || gone) return;
      try {
        const bytes = await loadState(rom.id);
        if (!bytes) return ctx.toast('No saved state for this game.');
        running.loadState(bytes);
        ctx.toast('State loaded');
      } catch (e) {
        console.error(e);
        ctx.toast(e.message || 'Could not load the state.');
      }
    };
  }
}

export async function unmount() {
  const l = leave;
  leave = null;
  await l?.();
}
