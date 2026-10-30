import { db, doc, getDoc, getDocFromServer, setDoc, Bytes } from './firebase.js';
import { idbGet, idbPut } from './idb.js';
import { pickNewer } from './saves-logic.js';

export async function loadSram(id, { cloud } = {}) {
  const local = (await idbGet('saves', id)) || null;
  if (!cloud) return { sram: local?.sram ?? null };
  let remote = null, offline = false;
  try {
    const s = await getDocFromServer(doc(db, 'saves', id));
    if (s.exists()) remote = { sram: s.data().sram.toUint8Array(), updatedAt: s.data().updatedAt };
  } catch { offline = true; /* fall back to local */ }
  return { sram: pickNewer(local, remote)?.sram ?? null, offline };
}

export async function writeSram(id, bytes, { cloud } = {}) {
  const updatedAt = Date.now();
  await idbPut('saves', id, { sram: bytes, updatedAt });
  if (cloud) await setDoc(doc(db, 'saves', id), { sram: Bytes.fromUint8Array(bytes), updatedAt });
}

export async function loadState(id) {
  const s = await getDoc(doc(db, 'states', id));
  return s.exists() ? s.data().state.toUint8Array() : null;
}

export const writeState = (id, bytes) =>
  setDoc(doc(db, 'states', id), { state: Bytes.fromUint8Array(bytes), updatedAt: Date.now() });

export async function hasState(id) {
  return (await getDoc(doc(db, 'states', id))).exists();
}
