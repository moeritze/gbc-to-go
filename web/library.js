import { db, doc, collection, getDoc, getDocs, writeBatch, updateDoc, Bytes } from './firebase.js';
import { parseHeader, splitChunks, joinChunks, sha1Hex } from './rom.js';
import { idbGet, idbPut, idbDel } from './idb.js';
import { uploadPlan, sortRoms } from './library-logic.js';

const ref = (path) => doc(db, ...path);
// 500 ops per Firestore batch; an 8 MiB ROM is 10 chunks + meta, well under.
export async function uploadRom(file, onProgress) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { title, cgb } = parseHeader(bytes);
  const id = await sha1Hex(bytes);
  const existing = await getDoc(ref(['roms', id]));
  if (existing.exists()) return { meta: existing.data(), existed: true };
  const chunks = splitChunks(bytes);
  const meta = { id, title, cgb, size: bytes.length, chunks: chunks.length, uploadedAt: Date.now(), lastPlayedAt: null };
  const batch = writeBatch(db);
  for (const op of uploadPlan(meta, chunks)) {
    const data = op.data.data instanceof Uint8Array ? { data: Bytes.fromUint8Array(op.data.data) } : op.data;
    batch.set(ref(op.path), data);
  }
  onProgress?.(0);
  await batch.commit();
  onProgress?.(1);
  await idbPut('roms', id, bytes);
  return { meta, existed: false };
}

export async function listRoms() {
  const snap = await getDocs(collection(db, 'roms'));
  return sortRoms(snap.docs.map((d) => d.data()));
}

export async function loadRomBytes(id) {
  const cached = await idbGet('roms', id);
  if (cached) return cached;
  const snap = await getDocs(collection(db, 'roms', id, 'chunks'));
  const parts = snap.docs.sort((a, b) => Number(a.id) - Number(b.id)).map((d) => d.data().data.toUint8Array());
  const bytes = joinChunks(parts);
  await idbPut('roms', id, bytes);
  return bytes;
}

export async function markPlayed(id) {
  await updateDoc(ref(['roms', id]), { lastPlayedAt: Date.now() });
}

export async function deleteRom(id) {
  const chunks = await getDocs(collection(db, 'roms', id, 'chunks'));
  const batch = writeBatch(db);
  chunks.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(ref(['saves', id]));
  batch.delete(ref(['states', id]));
  batch.delete(ref(['roms', id]));
  await batch.commit();
  await Promise.all([idbDel('roms', id), idbDel('saves', id)]);
}
