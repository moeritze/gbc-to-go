export const DEFAULTS = { cloudSaves: true, saveStates: true, autoStateOnExit: false, touchPad: 'auto', sound: true };

export function mergeSettings(stored) {
  const s = stored && typeof stored === 'object' ? stored : {};
  const out = {};
  for (const k of Object.keys(DEFAULTS)) out[k] = typeof s[k] === typeof DEFAULTS[k] ? s[k] : DEFAULTS[k];
  return out;
}
