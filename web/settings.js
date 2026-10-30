import { db, doc, getDoc, setDoc } from './firebase.js';
import { DEFAULTS, mergeSettings } from './settings-logic.js';

export { DEFAULTS, mergeSettings };

export async function loadSettings() {
  const s = await getDoc(doc(db, 'settings', 'main'));
  return mergeSettings(s.exists() ? s.data() : null);
}

export const saveSettings = (s) => setDoc(doc(db, 'settings', 'main'), mergeSettings(s));
