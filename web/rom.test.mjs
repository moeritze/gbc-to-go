import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHUNK, parseHeader, splitChunks, joinChunks, sha1Hex } from './rom.js';

function fakeRom(size, { title = 'POKEMON', cgbFlag = 0 } = {}) {
  const b = new Uint8Array(size);
  b.set(new TextEncoder().encode(title), 0x134);
  b[0x143] = cgbFlag;
  let x = 0;
  for (let i = 0x134; i <= 0x14c; i++) x = (x - b[i] - 1) & 0xff;
  b[0x14d] = x;
  return b;
}

test('parseHeader title and cgb flag', () => {
  assert.deepEqual(parseHeader(fakeRom(0x8000)), { title: 'POKEMON', cgb: false });
  assert.equal(parseHeader(fakeRom(0x8000, { cgbFlag: 0x80 })).cgb, true);
  assert.equal(parseHeader(fakeRom(0x8000, { cgbFlag: 0xc0 })).cgb, true);
  assert.equal(parseHeader(fakeRom(0x8000, { title: '' })).title, 'Untitled');
});

test('parseHeader rejects non-ROMs', () => {
  const bad = fakeRom(0x8000);
  bad[0x14d] ^= 1;
  const rnd = new Uint8Array(100).map((_, i) => (i * 37 + 11) & 0xff);
  for (const b of [rnd, bad, fakeRom(3 * 0x8000), fakeRom(16 * 1024 * 1024)]) {
    assert.throws(() => parseHeader(b), /Not a Game Boy ROM/);
  }
});

test('split/join round-trip at chunk boundaries', () => {
  for (const [size, n] of [[0x8000, 1], [921600, 1], [1843200, 2], [8 * 1024 * 1024, 10]]) {
    const x = fakeRom(size).map((v, i) => (v + i) & 0xff);
    const chunks = splitChunks(x);
    assert.equal(chunks.length, n);
    assert.ok(chunks.every((c) => c.length <= CHUNK));
    assert.deepEqual(joinChunks(chunks), x);
  }
});

test('sha1Hex', async () => {
  assert.equal(await sha1Hex(new TextEncoder().encode('abc')), 'a9993e364706816aba3e25717850c26c9cd0d89d');
});
