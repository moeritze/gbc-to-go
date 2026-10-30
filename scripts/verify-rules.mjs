#!/usr/bin/env node
// Live rules check. Run before disabling sign-ups: it creates and deletes a throwaway user.
// OWNER_EMAIL=<email> OWNER_PASSWORD=<password> node scripts/verify-rules.mjs
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, deleteDoc, Bytes } from 'firebase/firestore';
import { firebaseConfig } from '../web/firebase-config.js';

try {
  for (const l of readFileSync(new URL('../.env.test.local', import.meta.url), 'utf8').split('\n')) {
    const m = l.match(/^\s*(\w+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
} catch {}
const { OWNER_EMAIL, OWNER_PASSWORD } = process.env;
if (!OWNER_EMAIL || !OWNER_PASSWORD) { console.error('Set OWNER_EMAIL and OWNER_PASSWORD'); process.exit(2); }

let fails = 0;
const ok = (name, cond) => { console.log(`${cond ? 'PASS' : 'FAIL'} ${name}`); if (!cond) fails++; };
const denied = (p) => p.then(() => false, (e) => /permission|unauthenticated/i.test(`${e.code} ${e.message}`));
const allowed = (p) => p.then(() => true, () => false);
const bytes = (n) => Bytes.fromUint8Array(new Uint8Array(n));

const ownerApp = initializeApp(firebaseConfig, 'owner');
await signInWithEmailAndPassword(getAuth(ownerApp), OWNER_EMAIL, OWNER_PASSWORD);
const db = getFirestore(ownerApp);

// settings/main
const settings = doc(db, 'settings', 'main');
const prev = await getDoc(settings);
ok('owner can write settings/main', await allowed(setDoc(settings, { rulecheck: Date.now() })));
ok('owner can read settings/main', (await getDoc(settings).catch(() => null))?.data()?.rulecheck !== undefined);
await (prev.exists() ? setDoc(settings, prev.data()) : deleteDoc(settings));

// chunk size limits
const chunk = doc(db, 'roms', '__rulecheck', 'chunks', '0');
ok('owner can write 921600 B chunk', await allowed(setDoc(chunk, { data: bytes(921600) })));
ok('owner denied 921601 B chunk', await denied(setDoc(chunk, { data: bytes(921601) })));
await deleteDoc(chunk);

// saves
const save = doc(db, 'saves', '__rulecheck');
ok('owner denied 131137 B sram', await denied(setDoc(save, { sram: bytes(131137) })));
ok('owner can write 8192 B sram', await allowed(setDoc(save, { sram: bytes(8192) })));
await deleteDoc(save);

// states
ok('owner denied 1000000 B state', await denied(setDoc(doc(db, 'states', '__rulecheck'), { state: bytes(1000000) })));

// throwaway user
const otherApp = initializeApp(firebaseConfig, 'other');
const auth = getAuth(otherApp);
const user = (await createUserWithEmailAndPassword(auth, `rulecheck-${Date.now()}@example.com`,
  'rc-' + crypto.randomUUID())).user;
const odb = getFirestore(otherApp);
try {
  for (const p of [['roms', 'x'], ['roms', 'x', 'chunks', '0'], ['saves', 'x'], ['states', 'x'], ['settings', 'main'], ['zzrandom', 'x']]) {
    const r = doc(odb, ...p);
    ok(`other user denied read ${p.join('/')}`, await denied(getDoc(r)));
    ok(`other user denied write ${p.join('/')}`, await denied(setDoc(r, { data: bytes(1), sram: bytes(1), state: bytes(1) })));
  }
} finally {
  await deleteUser(user);
  console.log('throwaway user deleted');
}

// unauthenticated
const anonApp = initializeApp(firebaseConfig, 'anon');
ok('unauthenticated denied read settings/main', await denied(getDoc(doc(getFirestore(anonApp), 'settings', 'main'))));

console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);
