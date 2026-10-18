/*
 * Motor de sincronização — mesmo princípio do app de Inspeções SSMA:
 * tudo é salvo localmente primeiro; quando há conexão, cada entidade
 * pendente é enviada individualmente (genérico por "tipo"), e cada
 * foto é enviada separadamente para tolerar quedas de conexão.
 */

const ENTIDADES_SYNC = [
  'organizacoes', 'estabelecimentos', 'processos', 'setores', 'funcoes',
  'atividades', 'situacoes', 'riscos', 'aep', 'aet', 'planos'
];

const Sync = {
  running: false,
  listeners: [],
  onChange(fn) { this.listeners.push(fn); },
  notify() { this.listeners.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } }); },

  async getEndpoint() { return DB.getSetting('endpointUrl'); },
  async setEndpoint(url) { return DB.setSetting('endpointUrl', url); },
  isOnline() { return navigator.onLine; },

  async syncAll() {
    if (this.running || !this.isOnline()) return;
    const endpoint = await this.getEndpoint();
    if (!endpoint) return;
    this.running = true;
    this.notify();
    try {
      for (const tipo of ENTIDADES_SYNC) {
        const todos = await DB[tipo].getAll();
        for (const item of todos) {
          if (item.synced) continue;
          try {
            const resp = await postJson(endpoint, { action: 'upsertEntidade', tipo, dados: item });
            if (resp && resp.ok) {
              item.synced = true;
              item.remoteRef = resp.remoteRef || item.remoteRef || null;
              await DB[tipo].put(item);
              this.notify();
            }
          } catch (e) { console.warn('Falha ao sincronizar', tipo, item.id, e); }
        }
      }
      const fotos = await DB.fotos.getAll();
      for (const foto of fotos) {
        if (foto.synced) continue;
        try {
          const base64 = await blobToBase64(foto.blob);
          const resp = await postJson(endpoint, {
            action: 'uploadPhoto',
            photo: { id: foto.id, refType: foto.refType, refId: foto.refId, mimeType: foto.mimeType, fileName: foto.fileName, base64 }
          });
          if (resp && resp.ok) {
            foto.synced = true;
            foto.remoteUrl = resp.fileUrl || null;
            await DB.fotos.put(foto);
            this.notify();
          }
        } catch (e) { console.warn('Falha ao sincronizar foto', foto.id, e); }
      }
    } finally {
      this.running = false;
      this.notify();
    }
  }
};

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.substring(reader.result.indexOf(',') + 1));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function postJson(url, payload) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  if (!resp.ok) throw new Error('Erro HTTP ' + resp.status + ' ao contatar o servidor.');
  return resp.json();
}

window.addEventListener('online', () => { Sync.syncAll().catch(() => {}); });
