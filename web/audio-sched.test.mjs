import test from 'node:test';
import assert from 'node:assert/strict';
import { nextStart } from './audio-sched.js';

const opt = { latency: 0.1, maxAhead: 0.25 };

test('nextStart: audioStart 0 resyncs to now + latency', () => {
  assert.equal(nextStart(0, 5, opt), 5.1);
});

test('nextStart: behind now resyncs to now + latency', () => {
  assert.equal(nextStart(4, 5, opt), 5.1);
});

test('nextStart: slightly ahead is unchanged', () => {
  assert.equal(nextStart(5.15, 5, opt), 5.15);
});

test('nextStart: far ahead drops the chunk', () => {
  assert.equal(nextStart(7, 5, opt), null);
});

test('nextStart: frozen clock (iOS suspended) never builds a backlog', () => {
  const chunk = 4096 / 48000, now = 5;
  let audioStart = 0;
  for (let i = 0; i < 30; i++) {
    const start = nextStart(audioStart, now, opt);
    if (start === null) continue;
    audioStart = start + chunk;
    assert.ok(audioStart - now <= opt.maxAhead + chunk + 1e-9);
  }
});
