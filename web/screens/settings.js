import { auth, signOut } from '../firebase.js';
import { saveSettings } from '../settings.js';

const TOGGLES = [
  ['cloudSaves', 'Cloud in-game saves', 'Off: saves stay on this device only.'],
  ['saveStates', 'Save states', 'Shows Save state and Load state while playing.'],
  ['autoStateOnExit', 'Auto save state on exit', 'Saves a state when you leave a game or switch apps.'],
  ['sound', 'Sound', ''],
];

export function mount(root, ctx) {
  const s = ctx.settings;
  root.innerHTML = `<header class="bar">
      <button class="back" type="button">‹ Library</button>
      <h1 class="bar-title">Settings</h1>
    </header>
    <form class="settings">
      ${TOGGLES.map(([k, label, hint]) => `<label class="setting">
        <span><span class="setting-name">${label}</span>${hint ? `<span class="muted">${hint}</span>` : ''}</span>
        <input type="checkbox" role="switch" name="${k}" ${s[k] ? 'checked' : ''}></label>`).join('')}
      <fieldset class="setting">
        <legend class="setting-name">Touch pad</legend>
        <span class="segmented">${['auto', 'on', 'off'].map((v) => `<label><input type="radio" name="touchPad" value="${v}" ${s.touchPad === v ? 'checked' : ''}><span>${v[0].toUpperCase() + v.slice(1)}</span></label>`).join('')}</span>
      </fieldset>
      <button class="ghost signout" type="button">Sign out</button>
    </form>`;
  const form = root.querySelector('form');
  root.querySelector('.back').onclick = () => ctx.show('library');
  root.querySelector('.signout').onclick = () => signOut(auth);
  form.onchange = async (ev) => {
    const el = ev.target;
    const prev = { ...s };
    s[el.name] = el.type === 'checkbox' ? el.checked : el.value;
    try {
      await saveSettings({ ...s });
    } catch (e) {
      console.error(e);
      Object.assign(s, prev);
      if (el.type === 'checkbox') el.checked = prev[el.name];
      else form.querySelector(`[name=touchPad][value="${prev.touchPad}"]`).checked = true;
      ctx.toast('Could not save settings. Check your connection.');
    }
  };
}
