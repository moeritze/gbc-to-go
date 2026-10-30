// Chunk ops first, meta op last: meta is the commit marker inside one batch.
export function uploadPlan(meta, chunks) {
  const ops = chunks.map((data, n) => ({ path: ['roms', meta.id, 'chunks', String(n)], data: { data } }));
  ops.push({ path: ['roms', meta.id], data: meta });
  return ops;
}

// No Firestore orderBy: it drops docs missing the field.
export function sortRoms(roms) {
  return [...roms].sort((a, b) => {
    const x = a.lastPlayedAt, y = b.lastPlayedAt;
    if (x != null && y != null && x !== y) return y - x;
    if ((x == null) !== (y == null)) return x == null ? 1 : -1;
    return a.title.localeCompare(b.title);
  });
}
