// Screen router, toast and confirm dialog. Auth decides the first screen.
import { auth, onAuthStateChanged, signOut } from './firebase.js';
import { loadSettings, DEFAULTS } from './settings.js';
import * as login from './screens/login.js';
import * as library from './screens/library.js';
import * as settings from './screens/settings.js';
import * as play from './screens/play.js';

const denied = {
  mount(root) {
    root.innerHTML = `<section class="center-screen">
      <h1 class="wordmark">gbc-to-go</h1>
      <p class="lede">This account is not the owner of this site.</p>
      <button class="primary" type="button">Sign out</button></section>`;
    root.querySelector('button').onclick = () => signOut(auth);
  },
};
const screens = { login, library, settings, play, denied };
const root = document.getElementById('root');
const ctx = { settings: { ...DEFAULTS }, show, toast, confirmDialog };
let current = null;
let nav = Promise.resolve();
const fail = (e) => { console.error(e); toast(e.message || String(e)); };

// params: screen input, e.g. { rom } for play. Navigations run one after another so unmount (which may save) finishes first.
export function show(id, params = {}) {
  nav = nav.then(async () => {
    await current?.unmount?.();
    current = screens[id];
    document.body.dataset.screen = id;
    root.replaceChildren();
    // Not awaited: a mount that waits on the network must not block the next navigation.
    Promise.resolve(current.mount(root, { ...ctx, params })).catch(fail);
  }).catch(fail);
  return nav;
}

let toastTimer = 0;
export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3500);
}

export function confirmDialog(msg, okLabel = 'OK') {
  const d = document.getElementById('confirm');
  document.getElementById('confirm-msg').textContent = msg;
  document.getElementById('confirm-ok').textContent = okLabel;
  if (d.open) return Promise.resolve(false);
  d.returnValue = '';
  d.showModal();
  return new Promise((resolve) => d.addEventListener('close', () => resolve(d.returnValue === 'ok'), { once: true }));
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return show('login');
  try {
    ctx.settings = await loadSettings();
  } catch (e) {
    if (e.code === 'permission-denied') return show('denied');
    console.error(e);
    ctx.settings = { ...DEFAULTS };
    toast('Could not load settings. Using defaults.');
  }
  show('library');
});
