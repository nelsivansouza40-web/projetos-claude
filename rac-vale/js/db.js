/* Camada de persistência local (IndexedDB). Funciona 100% offline. */
const DB_NAME = 'rac_campo_db';
const DB_VERSION = 1;
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('auditorias')) {
        db.createObjectStore('auditorias', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('fotos')) {
        const st = db.createObjectStore('fotos', { keyPath: 'id' });
        st.createIndex('auditoriaId', 'auditoriaId', { unique: false });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
  return dbPromise;
}

async function storeTx(storeName, mode) {
  const db = await openDB();
  return db.transaction(storeName, mode).objectStore(storeName);
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const DB = {
  async put(store, obj) {
    const st = await storeTx(store, 'readwrite');
    await reqToPromise(st.put(obj));
    return obj;
  },
  async get(store, id) {
    const st = await storeTx(store, 'readonly');
    return reqToPromise(st.get(id));
  },
  async getAll(store) {
    const st = await storeTx(store, 'readonly');
    const all = await reqToPromise(st.getAll());
    return all.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  },
  async del(store, id) {
    const st = await storeTx(store, 'readwrite');
    return reqToPromise(st.delete(id));
  },
  async fotosDaAuditoria(auditoriaId) {
    const st = await storeTx('fotos', 'readonly');
    return reqToPromise(st.index('auditoriaId').getAll(auditoriaId));
  },
  async excluirAuditoria(id) {
    const fotos = await DB.fotosDaAuditoria(id);
    for (const f of fotos) await DB.del('fotos', f.id);
    await DB.del('auditorias', id);
  },
  async getSetting(key, padrao) {
    const r = await DB.get('settings', key);
    return r ? r.value : padrao;
  },
  async setSetting(key, value) {
    return DB.put('settings', { key, value });
  }
};
