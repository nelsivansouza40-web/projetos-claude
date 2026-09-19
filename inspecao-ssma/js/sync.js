/*
 * Motor de sincronização.
 * A inspeção é sempre salva localmente primeiro (offline-first).
 * Quando há conexão, os dados (texto) e depois as fotos são enviados,
 * cada foto de forma independente, para tolerar quedas de conexão no meio
 * do envio. O status é reavaliado a cada tentativa.
 */

const Sync = {
  running: false,
  listeners: [],

  onChange(fn) {
    this.listeners.push(fn);
  },

  notify() {
    this.listeners.forEach((fn) => {
      try { fn(); } catch (e) { console.error(e); }
    });
  },

  async getEndpoint() {
    return DB.getSetting('endpointUrl');
  },

  async setEndpoint(url) {
    return DB.setSetting('endpointUrl', url);
  },

  isOnline() {
    return navigator.onLine;
  },

  async syncAll() {
    if (this.running) return;
    if (!this.isOnline()) return;
    const endpoint = await this.getEndpoint();
    if (!endpoint) return;

    this.running = true;
    this.notify();
    try {
      const inspections = await DB.getAllInspections();
      for (const insp of inspections) {
        if (insp.syncStatus === 'synced') continue;
        await this.syncInspection(insp.id, endpoint);
      }
      const registrosDDS = await DB.getAllDDS();
      for (const dds of registrosDDS) {
        if (dds.syncStatus === 'synced') continue;
        await this.syncDDS(dds.id, endpoint);
      }
      const registrosDiag = await DB.getAllDiagnosticos();
      for (const diag of registrosDiag) {
        if (diag.syncStatus === 'synced') continue;
        await this.syncDiagnostico(diag.id, endpoint);
      }
    } finally {
      this.running = false;
      this.notify();
    }
  },

  async syncInspection(inspectionId, endpointOverride) {
    const endpoint = endpointOverride || (await this.getEndpoint());
    if (!endpoint) throw new Error('Endereço de sincronização não configurado.');
    if (!this.isOnline()) throw new Error('Sem conexão com a internet.');

    let insp = await DB.getInspection(inspectionId);
    if (!insp) return;

    insp.syncStatus = 'sincronizando';
    insp.syncError = '';
    await DB.putInspection(insp);
    this.notify();

    try {
      // 1) Envia os dados (texto) da inspeção, sem fotos.
      if (!insp.metaSynced) {
        const payload = {
          action: 'upsertInspection',
          inspection: buildInspectionMetaPayload(insp)
        };
        const resp = await postJson(endpoint, payload);
        if (!resp || resp.ok !== true) {
          throw new Error((resp && resp.error) || 'Falha ao enviar dados da inspeção.');
        }
        insp.metaSynced = true;
        insp.remoteRef = resp.remoteRef || insp.remoteRef || null;
        await DB.putInspection(insp);
      }

      // 2) Envia cada foto pendente, individualmente.
      const photos = await DB.getPhotosByInspection(inspectionId);
      const pendentes = photos.filter((p) => !p.synced);

      for (const foto of pendentes) {
        const base64 = await blobToBase64(foto.blob);
        const payload = {
          action: 'uploadPhoto',
          inspectionId: insp.id,
          photo: {
            id: foto.id,
            questionRef: foto.questionRef,
            mimeType: foto.mimeType,
            fileName: foto.fileName,
            base64: base64,
            remoteRef: insp.remoteRef || null
          }
        };
        const resp = await postJson(endpoint, payload);
        if (!resp || resp.ok !== true) {
          throw new Error((resp && resp.error) || 'Falha ao enviar uma foto.');
        }
        foto.synced = true;
        foto.remoteUrl = resp.fileUrl || null;
        await DB.putPhoto(foto);
        this.notify();
      }

      // 3) Reavalia status final.
      const todasFotos = await DB.getPhotosByInspection(inspectionId);
      const tudoSincronizado = insp.metaSynced && todasFotos.every((p) => p.synced);
      insp.syncStatus = tudoSincronizado ? 'synced' : 'pendente';
      insp.syncError = '';
      insp.updatedAt = Date.now();
      await DB.putInspection(insp);
    } catch (err) {
      insp = await DB.getInspection(inspectionId);
      insp.syncStatus = 'erro';
      insp.syncError = err.message || String(err);
      await DB.putInspection(insp);
      this.notify();
      throw err;
    }
    this.notify();
  },

  async syncDDS(ddsId, endpointOverride) {
    const endpoint = endpointOverride || (await this.getEndpoint());
    if (!endpoint) throw new Error('Endereço de sincronização não configurado.');
    if (!this.isOnline()) throw new Error('Sem conexão com a internet.');

    let dds = await DB.getDDS(ddsId);
    if (!dds) return;

    dds.syncStatus = 'sincronizando';
    dds.syncError = '';
    await DB.putDDS(dds);
    this.notify();

    try {
      // 1) Envia os dados (texto) do DDS, sem fotos.
      if (!dds.metaSynced) {
        const payload = {
          action: 'upsertDDS',
          dds: buildDDSMetaPayload(dds)
        };
        const resp = await postJson(endpoint, payload);
        if (!resp || resp.ok !== true) {
          throw new Error((resp && resp.error) || 'Falha ao enviar dados do DDS.');
        }
        dds.metaSynced = true;
        dds.remoteRef = resp.remoteRef || dds.remoteRef || null;
        await DB.putDDS(dds);
      }

      // 2) Envia cada foto pendente, individualmente.
      const photos = await DB.getPhotosByInspection(ddsId);
      const pendentes = photos.filter((p) => !p.synced);

      for (const foto of pendentes) {
        const base64 = await blobToBase64(foto.blob);
        const payload = {
          action: 'uploadPhoto',
          inspectionId: dds.id,
          photo: {
            id: foto.id,
            questionRef: foto.questionRef,
            mimeType: foto.mimeType,
            fileName: foto.fileName,
            base64: base64,
            remoteRef: dds.remoteRef || null
          }
        };
        const resp = await postJson(endpoint, payload);
        if (!resp || resp.ok !== true) {
          throw new Error((resp && resp.error) || 'Falha ao enviar uma foto.');
        }
        foto.synced = true;
        foto.remoteUrl = resp.fileUrl || null;
        await DB.putPhoto(foto);
        this.notify();
      }

      // 3) Reavalia status final.
      const todasFotos = await DB.getPhotosByInspection(ddsId);
      const tudoSincronizado = dds.metaSynced && todasFotos.every((p) => p.synced);
      dds.syncStatus = tudoSincronizado ? 'synced' : 'pendente';
      dds.syncError = '';
      dds.updatedAt = Date.now();
      await DB.putDDS(dds);
    } catch (err) {
      dds = await DB.getDDS(ddsId);
      dds.syncStatus = 'erro';
      dds.syncError = err.message || String(err);
      await DB.putDDS(dds);
      this.notify();
      throw err;
    }
    this.notify();
  },

  async syncDiagnostico(diagId, endpointOverride) {
    const endpoint = endpointOverride || (await this.getEndpoint());
    if (!endpoint) throw new Error('Endereço de sincronização não configurado.');
    if (!this.isOnline()) throw new Error('Sem conexão com a internet.');

    let diag = await DB.getDiagnostico(diagId);
    if (!diag) return;

    diag.syncStatus = 'sincronizando';
    diag.syncError = '';
    await DB.putDiagnostico(diag);
    this.notify();

    try {
      // 1) Envia os dados (texto) do diagnóstico, sem fotos.
      if (!diag.metaSynced) {
        const payload = {
          action: 'upsertDiagnostico',
          diagnostico: buildDiagnosticoMetaPayload(diag)
        };
        const resp = await postJson(endpoint, payload);
        if (!resp || resp.ok !== true) {
          throw new Error((resp && resp.error) || 'Falha ao enviar dados do diagnóstico.');
        }
        diag.metaSynced = true;
        diag.remoteRef = resp.remoteRef || diag.remoteRef || null;
        await DB.putDiagnostico(diag);
      }

      // 2) Envia cada foto pendente, individualmente.
      const photos = await DB.getPhotosByInspection(diagId);
      const pendentes = photos.filter((p) => !p.synced);

      for (const foto of pendentes) {
        const base64 = await blobToBase64(foto.blob);
        const payload = {
          action: 'uploadPhoto',
          inspectionId: diag.id,
          photo: {
            id: foto.id,
            questionRef: foto.questionRef,
            mimeType: foto.mimeType,
            fileName: foto.fileName,
            base64: base64,
            remoteRef: diag.remoteRef || null
          }
        };
        const resp = await postJson(endpoint, payload);
        if (!resp || resp.ok !== true) {
          throw new Error((resp && resp.error) || 'Falha ao enviar uma foto.');
        }
        foto.synced = true;
        foto.remoteUrl = resp.fileUrl || null;
        await DB.putPhoto(foto);
        this.notify();
      }

      // 3) Reavalia status final.
      const todasFotos = await DB.getPhotosByInspection(diagId);
      const tudoSincronizado = diag.metaSynced && todasFotos.every((p) => p.synced);
      diag.syncStatus = tudoSincronizado ? 'synced' : 'pendente';
      diag.syncError = '';
      diag.updatedAt = Date.now();
      await DB.putDiagnostico(diag);
    } catch (err) {
      diag = await DB.getDiagnostico(diagId);
      diag.syncStatus = 'erro';
      diag.syncError = err.message || String(err);
      await DB.putDiagnostico(diag);
      this.notify();
      throw err;
    }
    this.notify();
  }
};

function buildDiagnosticoMetaPayload(diag) {
  return {
    id: diag.id,
    createdAt: diag.createdAt,
    updatedAt: diag.updatedAt,
    identificacao: diag.data.identificacao,
    planoAcao: diag.data.planoAcao,
    observacoesFinais: diag.data.observacoesFinais,
    scoreGeral: calcularScoreGeral(diag.data.categorias),
    categorias: diag.data.categorias.map((cat) => ({
      nome: cat.nome,
      score: calcularScoreCategoria(cat.itens),
      itens: cat.itens.map((item) => ({
        id: item.id,
        texto: item.texto,
        resposta: item.resposta,
        observacao: item.observacao
      }))
    }))
  };
}

function buildDDSMetaPayload(dds) {
  return {
    id: dds.id,
    createdAt: dds.createdAt,
    updatedAt: dds.updatedAt,
    identificacao: dds.data.identificacao,
    tema: dds.data.tema,
    conteudo: dds.data.conteudo,
    duracaoMinutos: dds.data.duracaoMinutos,
    observacoes: dds.data.observacoes,
    participantes: dds.data.participantes.map((p) => ({
      id: p.id,
      nome: p.nome,
      funcao: p.funcao,
      assinado: !!p.assinatura
    }))
  };
}

function buildInspectionMetaPayload(insp) {
  return {
    id: insp.id,
    createdAt: insp.createdAt,
    updatedAt: insp.updatedAt,
    identificacao: insp.data.identificacao,
    tipoInspecao: insp.data.tipoInspecao,
    checklist: insp.data.checklist.map((item) => ({
      id: item.id,
      texto: item.texto,
      resposta: item.resposta,
      observacao: item.observacao,
      medida: item.medida,
      personalizado: !!item.personalizado
    })),
    fechamento: insp.data.fechamento
  };
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      const base64 = result.substring(result.indexOf(',') + 1);
      resolve(base64);
    };
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
  if (!resp.ok) {
    throw new Error('Erro HTTP ' + resp.status + ' ao contatar o servidor.');
  }
  return resp.json();
}

window.addEventListener('online', () => {
  Sync.syncAll().catch((e) => console.warn('Falha na sincronização automática:', e));
});
