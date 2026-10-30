const NAME = 'gbc-to-go';
let dbp;
function open() {
  return (dbp ??= new Promise((res, rej) => {
    const r = indexedDB.open(NAME, 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('roms'); r.result.createObjectStore('saves'); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => { dbp = null; rej(r.error); };
  }));
}
async function run(store, mode, fn) {
  const d = await open();
  return new Promise((res, rej) => {
    const t = d.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => res(req.result);
    t.onerror = t.onabort = () => rej(t.error);
  });
}
export const idbGet = (store, key) => run(store, 'readonly', (s) => s.get(key));
export const idbPut = (store, key, value) => run(store, 'readwrite', (s) => s.put(value, key));
export const idbDel = (store, key) => run(store, 'readwrite', (s) => s.delete(key));
