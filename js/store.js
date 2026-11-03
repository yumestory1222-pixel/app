// 찍은 사진을 IndexedDB에 저장 (실패하면 메모리에만 보관)
const DB = 'gudo-camera';
const STORE = 'photos';
let dbp = null;
const mem = [];
let memId = 1;

function open() {
  if (!dbp) {
    dbp = new Promise((res, rej) => {
      try {
        const r = indexedDB.open(DB, 1);
        r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      } catch (e) { rej(e); }
    }).catch(() => null);
  }
  return dbp;
}

function tx(db, mode, fn) {
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => res(req && req.result);
    t.onerror = () => rej(t.error);
  });
}

export async function add(blob) {
  const item = { blob, time: Date.now() };
  const db = await open();
  if (db) {
    try { item.id = await tx(db, 'readwrite', (s) => s.add(item)); return item; } catch { /* 메모리로 */ }
  }
  item.id = memId++;
  mem.push(item);
  return item;
}

export async function all() {
  const db = await open();
  let list = [];
  if (db) { try { list = await tx(db, 'readonly', (s) => s.getAll()); } catch { list = []; } }
  return [...list, ...mem].sort((a, b) => b.time - a.time);
}

export async function remove(id) {
  const i = mem.findIndex((m) => m.id === id);
  if (i >= 0) { mem.splice(i, 1); return; }
  const db = await open();
  if (db) await tx(db, 'readwrite', (s) => s.delete(id));
}
