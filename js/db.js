/* Camada de persistência local (IndexedDB). Funciona 100% offline. */
const DB_NAME = 'ssma_inspecoes_db';
const DB_VERSION = 1;
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('inspections')) {
        db.createObjectStore('inspections', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('photos')) {
        const store = db.createObjectStore('photos', { keyPath: 'id' });
        store.createIndex('inspectionId', 'inspectionId', { unique: false });
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
  async putInspection(insp) {
    const store = await storeTx('inspections', 'readwrite');
    await reqToPromise(store.put(insp));
    return insp;
  },
  async getInspection(id) {
    const store = await storeTx('inspections', 'readonly');
    return reqToPromise(store.get(id));
  },
  async getAllInspections() {
    const store = await storeTx('inspections', 'readonly');
    const all = await reqToPromise(store.getAll());
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  },
  async deleteInspection(id) {
    const store = await storeTx('inspections', 'readwrite');
    return reqToPromise(store.delete(id));
  },
  async putPhoto(photo) {
    const store = await storeTx('photos', 'readwrite');
    await reqToPromise(store.put(photo));
    return photo;
  },
  async getPhoto(id) {
    const store = await storeTx('photos', 'readonly');
    return reqToPromise(store.get(id));
  },
  async getPhotosByInspection(inspectionId) {
    const store = await storeTx('photos', 'readonly');
    const idx = store.index('inspectionId');
    return reqToPromise(idx.getAll(inspectionId));
  },
  async deletePhoto(id) {
    const store = await storeTx('photos', 'readwrite');
    return reqToPromise(store.delete(id));
  },
  async getSetting(key) {
    const store = await storeTx('settings', 'readonly');
    const r = await reqToPromise(store.get(key));
    return r ? r.value : undefined;
  },
  async setSetting(key, value) {
    const store = await storeTx('settings', 'readwrite');
    return reqToPromise(store.put({ key, value }));
  }
};

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
