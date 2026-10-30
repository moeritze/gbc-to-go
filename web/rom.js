export const CHUNK = 921600;
export const MAX_ROM = 8 * 1024 * 1024;

export function parseHeader(bytes) {
  const n = bytes.length;
  if (n < 0x8000 || n > MAX_ROM || (n & (n - 1)) !== 0) throw new Error('Not a Game Boy ROM');
  let x = 0;
  for (let i = 0x134; i <= 0x14c; i++) x = (x - bytes[i] - 1) & 0xff;
  if (x !== bytes[0x14d]) throw new Error('Not a Game Boy ROM');
  const cgb = bytes[0x143] === 0x80 || bytes[0x143] === 0xc0;
  const end = cgb ? 0x13f : 0x144;
  let title = '';
  for (let i = 0x134; i < end && bytes[i] !== 0; i++) title += String.fromCharCode(bytes[i]);
  return { title: title.trim() || 'Untitled', cgb };
}

export function splitChunks(bytes, size = CHUNK) {
  const out = [];
  for (let i = 0; i < bytes.length; i += size) out.push(bytes.subarray(i, i + size));
  return out;
}

export function joinChunks(chunks) {
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

export async function sha1Hex(bytes) {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-1', bytes));
  return Array.from(d, (b) => b.toString(16).padStart(2, '0')).join('');
}
