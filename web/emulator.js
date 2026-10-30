// Minimal binjgb wrapper with save states, adapted from binjgb docs/simple.js (MIT). Needs vendor/binjgb.js (global Binjgb).
// Adapted from binjgb docs/simple.js, MIT, Copyright (c) 2016 Ben Smith. See vendor/LICENSE.
const AUDIO_FRAMES = 4096, LATENCY = 0.1, TICKS_PER_SEC = 4194304, MAX_STEP_SEC = 5 / 60;
const EV_FRAME = 1, EV_AUDIO = 2, EV_TICKS = 4;
const KEYS = {
  ArrowDown: 'down', ArrowUp: 'up', ArrowLeft: 'left', ArrowRight: 'right',
  KeyZ: 'B', KeyX: 'A', Enter: 'start',
  ShiftLeft: 'select', ShiftRight: 'select', Backspace: 'select',
};
let actx;
let running = null;

// Starts the ROM on `canvas`. sram: Uint8Array to load into cartridge RAM (or null). sound: false mutes audio.
// onSramDirty(getSram) is called at most once per second while the game writes cartridge RAM;
// Running.flushDirty() calls it now (if dirty) and returns its result, for leaving the game.
export async function start(romBytes, { canvas, sram, sound = true, onSramDirty }) {
  stop();
  actx ||= new AudioContext();
  const m = await Binjgb();
  const size = (romBytes.byteLength + 0x7fff) & ~0x7fff;
  const romPtr = m._malloc(size);
  new Uint8Array(m.HEAP8.buffer, romPtr, size).fill(0).set(romBytes);
  const e = m._emulator_new_simple(romPtr, size, actx.sampleRate, AUDIO_FRAMES, 2);
  if (!e) throw new Error('Invalid ROM');
  const joypad = m._joypad_new();
  m._emulator_set_default_joypad_callback(e, joypad);

  const withFile = (cb) => {
    const ptr = m._ext_ram_file_data_new(e);
    const buf = new Uint8Array(m.HEAP8.buffer, m._get_file_data_ptr(ptr), m._get_file_data_size(ptr));
    const r = cb(ptr, buf);
    m._file_data_delete(ptr);
    return r;
  };
  const getSram = () => withFile((ptr, buf) => { m._emulator_write_ext_ram(e, ptr); return new Uint8Array(buf); });
  const stateFile = (cb) => {
    const ptr = m._state_file_data_new(e);
    const buf = new Uint8Array(m.HEAP8.buffer, m._get_file_data_ptr(ptr), m._get_file_data_size(ptr));
    try { return cb(ptr, buf); } finally { m._file_data_delete(ptr); }
  };
  const getState = () => stateFile((ptr, buf) => { m._emulator_write_state(e, ptr); return new Uint8Array(buf); });
  const loadState = (bytes) => stateFile((ptr, buf) => {
    if (bytes.byteLength !== buf.byteLength) throw new Error('State does not match this ROM');
    buf.set(bytes);
    if (m._emulator_read_state(e, ptr) !== 0) throw new Error('State does not match this ROM');
    dirty = true; // the state carries cartridge RAM
  });
  // A save of the wrong size is skipped, never thrown: the caller keeps its (cloud) copy.
  if (sram) {
    let ok = false;
    withFile((ptr, buf) => {
      ok = buf.byteLength === sram.byteLength;
      if (ok) { buf.set(sram); m._emulator_read_ext_ram(e, ptr); }
      else console.warn(`save size ${sram.byteLength} != ${buf.byteLength}; starting without the save`);
    });
  }

  let dirty = false;
  const timer = setInterval(() => { if (dirty) { dirty = false; onSramDirty?.(getSram); } }, 1000);

  const audioBuf = new Uint8Array(m.HEAP8.buffer, m._get_audio_buffer_ptr(e), m._get_audio_buffer_capacity(e));
  const frameBuf = new Uint8ClampedArray(m.HEAP8.buffer, m._get_frame_buffer_ptr(e), m._get_frame_buffer_size(e));
  const ctx2d = canvas.getContext('2d');
  const img = new ImageData(160, 144);
  let audioStart = 0, left = 0, last = 0, raf = 0, audioOn = false, soundOn = sound;

  const pushAudio = () => {
    if (!audioOn || !soundOn) return;
    const now = actx.currentTime;
    audioStart ||= now + LATENCY;
    if (audioStart < now) { audioStart = now + LATENCY; return; }
    const b = actx.createBuffer(2, AUDIO_FRAMES, actx.sampleRate);
    const c0 = b.getChannelData(0), c1 = b.getChannelData(1);
    for (let i = 0; i < AUDIO_FRAMES; i++) {
      c0[i] = audioBuf[2 * i] * 0.5 / 255;
      c1[i] = audioBuf[2 * i + 1] * 0.5 / 255;
    }
    const src = actx.createBufferSource();
    src.buffer = b;
    src.connect(actx.destination);
    src.start(audioStart);
    audioStart += AUDIO_FRAMES / actx.sampleRate;
  };

  const frame = (ms) => {
    raf = requestAnimationFrame(frame);
    const sec = ms / 1000;
    const dt = Math.min(Math.max(sec - (last || sec), 0), MAX_STEP_SEC);
    last = sec;
    const until = m._emulator_get_ticks_f64(e) + dt * TICKS_PER_SEC - left;
    for (;;) {
      const ev = m._emulator_run_until_f64(e, until);
      if (ev & EV_FRAME) img.data.set(frameBuf);
      if (ev & EV_AUDIO) pushAudio();
      if (ev & EV_TICKS) break;
    }
    left = (m._emulator_get_ticks_f64(e) - until) | 0;
    if (m._emulator_was_ext_ram_updated(e)) dirty = true;
    ctx2d.putImageData(img, 0, 0);
  };

  const wake = () => { audioOn = true; if (actx.state !== 'running') actx.resume(); };
  const press = (k, down) => { wake(); m['_set_joyp_' + k](e, down); };
  const key = (down) => (ev) => {
    const k = KEYS[ev.code];
    // Game keys only when no control has focus: Enter/Space on a button or field must keep working.
    if (!k || ev.target.closest?.('button, input, select, textarea, a, dialog')) return;
    press(k, down);
    ev.preventDefault();
  };
  const kd = key(true), ku = key(false);
  // Keys held while the tab loses focus never get a keyup: release them all.
  const releaseAll = () => { for (const k of new Set(Object.values(KEYS))) m['_set_joyp_' + k](e, false); };
  const onVis = () => document.hidden && releaseAll();
  addEventListener('keydown', kd);
  addEventListener('keyup', ku);
  addEventListener('pointerdown', wake);
  addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', onVis);

  raf = requestAnimationFrame(frame);
  let stopped = false;
  const self = {
    press, getSram, getState, loadState,
    setSound(on) { soundOn = on; },
    flushDirty() { if (!dirty) return null; dirty = false; return onSramDirty?.(getSram); },
    // Idempotent: a second call (instance or module stop) must not free WASM memory twice.
    stop() {
      if (stopped) return;
      stopped = true;
      if (running === self) running = null;
      cancelAnimationFrame(raf); clearInterval(timer);
      removeEventListener('keydown', kd); removeEventListener('keyup', ku); removeEventListener('pointerdown', wake);
      removeEventListener('blur', releaseAll); document.removeEventListener('visibilitychange', onVis);
      m._emulator_delete(e); m._joypad_delete(joypad); m._free(romPtr);
    },
  };
  running = self;
  return self;
}

export function stop() {
  running?.stop();
  running = null;
}
