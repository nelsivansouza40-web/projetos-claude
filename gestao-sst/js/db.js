/*
 * Persistência local (IndexedDB). Tudo é gravado no momento em que o usuário
 * salva — não existe botão "salvar planilha". Cada empresa tem seus próprios
 * registros, separados pelo campo "emp".
 *
 * Stores:
 *   empresas  { id, nome, cnpj, ..., logo }
 *   rec       { id, emp, mod, ...campos }   índice emp_mod
 *   cfg       { key: "<emp>:<nome>", value }
 *   sys       { key, value }                (dados do sistema, ex.: atalho do arquivo de backup)
 */
const DB = (() => {
  const NAME = 'gestao_sst';
  const VERSION = 1;
  let dbp = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('empresas')) db.createObjectStore('empresas', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('rec')) {
          const s = db.createObjectStore('rec', { keyPath: 'id' });
          s.createIndex('emp_mod', ['emp', 'mod']);
          s.createIndex('emp', 'emp');
        }
        if (!db.objectStoreNames.contains('cfg')) db.createObjectStore('cfg', { keyPath: 'key' });
        if (!db.objectStoreNames.contains('sys')) db.createObjectStore('sys', { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('Feche outras abas do sistema e recarregue.'));
    });
    return dbp;
  }

  const p = (req) => new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  async function store(name, mode = 'readonly') {
    const db = await open();
    return db.transaction(name, mode).objectStore(name);
  }

  async function txDone(names, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(names, 'readwrite');
      fn(tx);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Transação cancelada'));
    });
  }

  return {
    open,
    async all(name) { return p((await store(name)).getAll()); },
    async get(name, key) { return p((await store(name)).get(key)); },
    async put(name, obj) { return p((await store(name, 'readwrite')).put(obj)); },
    async del(name, key) { return p((await store(name, 'readwrite')).delete(key)); },
    async recsDaEmpresa(emp) {
      const s = await store('rec');
      return p(s.index('emp').getAll(emp));
    },
    async putMany(name, list) {
      await txDone([name], (tx) => { const s = tx.objectStore(name); list.forEach((o) => s.put(o)); });
    },
    async apagarEmpresa(emp) {
      const recs = await this.recsDaEmpresa(emp);
      const cfgs = (await this.all('cfg')).filter((c) => c.key.startsWith(emp + ':'));
      await txDone(['rec', 'cfg', 'empresas'], (tx) => {
        recs.forEach((r) => tx.objectStore('rec').delete(r.id));
        cfgs.forEach((c) => tx.objectStore('cfg').delete(c.key));
        tx.objectStore('empresas').delete(emp);
      });
    },
    async limparModulos(emp, mods) {
      const recs = (await this.recsDaEmpresa(emp)).filter((r) => mods.includes(r.mod));
      await txDone(['rec'], (tx) => recs.forEach((r) => tx.objectStore('rec').delete(r.id)));
    }
  };
})();

/** Pede ao navegador para não apagar os dados automaticamente quando faltar espaço. */
async function pedirArmazenamentoPersistente() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const ja = await navigator.storage.persisted();
      return ja || await navigator.storage.persist();
    }
  } catch (e) { /* navegador sem suporte */ }
  return false;
}
