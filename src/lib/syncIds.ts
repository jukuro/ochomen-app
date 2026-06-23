const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PREFIXED_UUID =
  /^(entry|todo|child|draft|member|doc|page)_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/** ローカルID → Supabase（uuid列でも text列でも通る） */
export function toSyncId(localId: string): string {
  const prefixed = localId.match(PREFIXED_UUID);
  if (prefixed) return prefixed[2];

  if (UUID_RE.test(localId)) return localId;

  // c1 / manual など短いIDは決定的UUIDに変換
  return hashToUuid(`ochomen:${localId}`);
}

export function toLocalEntryId(syncId: string, knownIds: string[] = []): string {
  for (const id of knownIds) {
    if (toSyncId(id) === syncId) return id;
  }
  for (const demo of ["c1", "c2"]) {
    if (toSyncId(demo) === syncId) return demo;
  }
  if (syncId.startsWith("entry_")) return syncId;
  return `entry_${syncId}`;
}

export function toLocalTodoId(syncId: string, knownIds: string[] = []): string {
  for (const id of knownIds) {
    if (toSyncId(id) === syncId) return id;
  }
  if (syncId.startsWith("todo_")) return syncId;
  return `todo_${syncId}`;
}

export function toLocalChildId(syncId: string, knownIds: string[] = []): string {
  for (const id of knownIds) {
    if (toSyncId(id) === syncId) return id;
  }
  for (const demo of ["c1", "c2"]) {
    if (toSyncId(demo) === syncId) return demo;
  }
  if (syncId.startsWith("child_")) return syncId;
  return UUID_RE.test(syncId) ? `child_${syncId}` : syncId;
}

function hashToUuid(input: string): string {
  const bytes = new Uint8Array(16);
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
    bytes[i % 16] ^= h & 0xff;
    h = Math.imul(h, 0x9e3779b1);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
