import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, mergeSettings } from './settings-logic.js';

test('mergeSettings drops unknown, fixes wrong types', () => {
  assert.deepEqual(mergeSettings({ sound: false, bogus: 1, touchPad: 5 }), { ...DEFAULTS, sound: false });
  assert.deepEqual(mergeSettings(null), DEFAULTS);
});
