export function pickNewer(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  return b.updatedAt > a.updatedAt ? b : a;
}
