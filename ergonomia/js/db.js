/*
 * Camada de persistência local (IndexedDB) do app de Gestão Ergonômica
 * integrada ao PGR. Genérica: um wrapper de "store" cobre todas as
 * entidades (organização, estrutura operacional, PGR, AEP, AET, plano
 * de ação, fotos e auditoria), evitando repetir CRUD entidade por
 * entidade. Funciona 100% offline.
 */
const DB_NAME = 'ergonomia_pgr_db';
const DB_VERSION = 1;

const STORES = [
  'organizacoes', 'estabelecimentos', 'processos', 'setores', 'funcoes',
  'atividades', 'situacoes', 'riscos', 'aep', 'aet', 'planos',
  'fotos', 'auditoria', 'settings'
];

const INDEXES = {
  estabelecimentos: ['organizacaoId'],
  processos: ['estabelecimentoId'],
  setores: ['estabelecimentoId', 'processoId'],
  funcoes: ['setorId'],
  atividades: ['funcaoId'],
  situacoes: ['atividadeId'],
  riscos: ['organizacaoId'],
  aep: ['situacaoId'],
  aet: ['situacaoId'],
  planos: ['organizacaoId', 'riscoId', 'situacaoId', 'status'],
  fotos: ['refType', 'refId'],
  auditoria: ['entidade']
};

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      STORES.forEach((name) => {
        if (db.objectStoreNames.contains(name)) return;
        const keyPath = name === 'settings' ? 'key' : 'id';
        const store = db.createObjectStore(name, { keyPath });
        (INDEXES[name] || []).forEach((idx) => store.createIndex(idx, idx, { unique: false }));
      });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
  return dbPromise;
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(storeName, mode) {
  const db = await openDB();
  return db.transaction(storeName, mode).objectStore(storeName);
}

const Store = (name) => ({
  async put(obj) {
    const store = await tx(name, 'readwrite');
    await reqToPromise(store.put(obj));
    return obj;
  },
  async get(id) {
    const store = await tx(name, 'readonly');
    return reqToPromise(store.get(id));
  },
  async getAll() {
    const store = await tx(name, 'readonly');
    return reqToPromise(store.getAll());
  },
  async byIndex(indexName, value) {
    const store = await tx(name, 'readonly');
    return reqToPromise(store.index(indexName).getAll(value));
  },
  async delete(id) {
    const store = await tx(name, 'readwrite');
    return reqToPromise(store.delete(id));
  }
});

const DB = {};
STORES.forEach((name) => { DB[name] = Store(name); });

DB.getSetting = async (key) => {
  const row = await DB.settings.get(key);
  return row ? row.value : undefined;
};
DB.setSetting = (key, value) => DB.settings.put({ key, value });

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function registrarAuditoria(entidade, entidadeId, acao, detalhes) {
  const usuario = (await DB.getSetting('perfilAtual')) || {};
  await DB.auditoria.put({
    id: uuid(),
    entidade, entidadeId, acao,
    usuario: usuario.nome || 'Não identificado',
    papel: usuario.papel || '',
    timestamp: Date.now(),
    detalhes: detalhes || ''
  });
}
