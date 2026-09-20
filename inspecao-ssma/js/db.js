/* Camada de persistência local (IndexedDB). Funciona 100% offline. */
const DB_NAME = 'ssma_inspecoes_db';
const DB_VERSION = 7;
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
      if (!db.objectStoreNames.contains('dds')) {
        db.createObjectStore('dds', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('diagnosticos')) {
        db.createObjectStore('diagnosticos', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cipaGestoes')) {
        db.createObjectStore('cipaGestoes', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cipaReunioes')) {
        db.createObjectStore('cipaReunioes', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('ptapr')) {
        db.createObjectStore('ptapr', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('certificados')) {
        db.createObjectStore('certificados', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pet')) {
        db.createObjectStore('pet', { keyPath: 'id' });
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
  async putDDS(dds) {
    const store = await storeTx('dds', 'readwrite');
    await reqToPromise(store.put(dds));
    return dds;
  },
  async getDDS(id) {
    const store = await storeTx('dds', 'readonly');
    return reqToPromise(store.get(id));
  },
  async getAllDDS() {
    const store = await storeTx('dds', 'readonly');
    const all = await reqToPromise(store.getAll());
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  },
  async deleteDDS(id) {
    const store = await storeTx('dds', 'readwrite');
    return reqToPromise(store.delete(id));
  },
  async putDiagnostico(diag) {
    const store = await storeTx('diagnosticos', 'readwrite');
    await reqToPromise(store.put(diag));
    return diag;
  },
  async getDiagnostico(id) {
    const store = await storeTx('diagnosticos', 'readonly');
    return reqToPromise(store.get(id));
  },
  async getAllDiagnosticos() {
    const store = await storeTx('diagnosticos', 'readonly');
    const all = await reqToPromise(store.getAll());
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  },
  async deleteDiagnostico(id) {
    const store = await storeTx('diagnosticos', 'readwrite');
    return reqToPromise(store.delete(id));
  },
  async putCipaGestao(gestao) {
    const store = await storeTx('cipaGestoes', 'readwrite');
    await reqToPromise(store.put(gestao));
    return gestao;
  },
  async getCipaGestao(id) {
    const store = await storeTx('cipaGestoes', 'readonly');
    return reqToPromise(store.get(id));
  },
  async getAllCipaGestoes() {
    const store = await storeTx('cipaGestoes', 'readonly');
    const all = await reqToPromise(store.getAll());
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  },
  async deleteCipaGestao(id) {
    const store = await storeTx('cipaGestoes', 'readwrite');
    return reqToPromise(store.delete(id));
  },
  async putCipaReuniao(reuniao) {
    const store = await storeTx('cipaReunioes', 'readwrite');
    await reqToPromise(store.put(reuniao));
    return reuniao;
  },
  async getCipaReuniao(id) {
    const store = await storeTx('cipaReunioes', 'readonly');
    return reqToPromise(store.get(id));
  },
  async getAllCipaReunioes() {
    const store = await storeTx('cipaReunioes', 'readonly');
    const all = await reqToPromise(store.getAll());
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  },
  async deleteCipaReuniao(id) {
    const store = await storeTx('cipaReunioes', 'readwrite');
    return reqToPromise(store.delete(id));
  },
  async putPTAPR(pt) {
    const store = await storeTx('ptapr', 'readwrite');
    await reqToPromise(store.put(pt));
    return pt;
  },
  async getPTAPR(id) {
    const store = await storeTx('ptapr', 'readonly');
    return reqToPromise(store.get(id));
  },
  async getAllPTAPR() {
    const store = await storeTx('ptapr', 'readonly');
    const all = await reqToPromise(store.getAll());
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  },
  async deletePTAPR(id) {
    const store = await storeTx('ptapr', 'readwrite');
    return reqToPromise(store.delete(id));
  },
  async putCertificado(cert) {
    const store = await storeTx('certificados', 'readwrite');
    await reqToPromise(store.put(cert));
    return cert;
  },
  async getCertificado(id) {
    const store = await storeTx('certificados', 'readonly');
    return reqToPromise(store.get(id));
  },
  async getAllCertificados() {
    const store = await storeTx('certificados', 'readonly');
    const all = await reqToPromise(store.getAll());
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  },
  async deleteCertificado(id) {
    const store = await storeTx('certificados', 'readwrite');
    return reqToPromise(store.delete(id));
  },
  async putPET(pet) {
    const store = await storeTx('pet', 'readwrite');
    await reqToPromise(store.put(pet));
    return pet;
  },
  async getPET(id) {
    const store = await storeTx('pet', 'readonly');
    return reqToPromise(store.get(id));
  },
  async getAllPET() {
    const store = await storeTx('pet', 'readonly');
    const all = await reqToPromise(store.getAll());
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  },
  async deletePET(id) {
    const store = await storeTx('pet', 'readwrite');
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
