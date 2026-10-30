import test from 'node:test';
import assert from 'node:assert/strict';
import { pickNewer } from './saves-logic.js';

test('pickNewer', () => {
  const a = { updatedAt: 1 }, b = { updatedAt: 2 };
  assert.equal(pickNewer(a, b), b);
  assert.equal(pickNewer(b, a), b);
  assert.equal(pickNewer(null, b), b);
  assert.equal(pickNewer(a, null), a);
  assert.equal(pickNewer(null, null), null);
});
