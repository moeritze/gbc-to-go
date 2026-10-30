// Time to schedule the next audio chunk on the AudioContext clock, or null to drop it.
export function nextStart(audioStart, now, { latency, maxAhead }) {
  if (!audioStart || audioStart < now) return now + latency;
  return audioStart - now > maxAhead ? null : audioStart;
}
