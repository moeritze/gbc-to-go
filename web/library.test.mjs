import test from 'node:test';
import assert from 'node:assert/strict';
import { uploadPlan, sortRoms } from './library-logic.js';

test('uploadPlan: chunks first, meta last', () => {
  const meta = { id: 'abc', title: 'T' };
  const ops = uploadPlan(meta, [new Uint8Array(1), new Uint8Array(2)]);
  assert.equal(ops.length, 3);
  assert.deepEqual(ops[0].path, ['roms', 'abc', 'chunks', '0']);
  assert.deepEqual(ops[1].path, ['roms', 'abc', 'chunks', '1']);
  assert.deepEqual(ops[2].path, ['roms', 'abc']);
});

test('sortRoms: lastPlayedAt desc, null last, then title', () => {
  const r = [{ title: 'b', lastPlayedAt: null }, { title: 'a', lastPlayedAt: null }, { title: 'z', lastPlayedAt: 5 }, { title: 'y', lastPlayedAt: 9 }];
  assert.deepEqual(sortRoms(r).map((x) => x.title), ['y', 'z', 'a', 'b']);
});
