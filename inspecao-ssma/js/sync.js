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
      const gestoesCipa = await DB.getAllCipaGestoes();
      for (const gestao of gestoesCipa) {
        if (gestao.syncStatus === 'synced') continue;
        await this.syncCipaGestao(gestao.id, endpoint);
      }
      const reunioesCipa = await DB.getAllCipaReunioes();
      for (const reuniao of reunioesCipa) {
        if (reuniao.syncStatus === 'synced') continue;
        await this.syncCipaReuniao(reuniao.id, endpoint);
      }
      const registrosPTAPR = await DB.getAllPTAPR();
      for (const pt of registrosPTAPR) {
        if (pt.syncStatus === 'synced') continue;
        await this.syncPTAPR(pt.id, endpoint);
      }
      const registrosCert = await DB.getAllCertificados();
      for (const cert of registrosCert) {
        if (cert.syncStatus === 'synced') continue;
        await this.syncCertificado(cert.id, endpoint);
      }
      const registrosPET = await DB.getAllPET();
      for (const pet of registrosPET) {
        if (pet.syncStatus === 'synced') continue;
        await this.syncPET(pet.id, endpoint);
      }
      const registrosInvestigacao = await DB.getAllInvestigacoes();
      for (const inv of registrosInvestigacao) {
        if (inv.syncStatus === 'synced') continue;
        await this.syncInvestigacao(inv.id, endpoint);
      }
      const registrosEPI = await DB.getAllFichasEPI();
      for (const ficha of registrosEPI) {
        if (ficha.syncStatus === 'synced') continue;
        await this.syncFichaEPI(ficha.id, endpoint);
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
  },

  async syncCipaGestao(gestaoId, endpointOverride) {
    const endpoint = endpointOverride || (await this.getEndpoint());
    if (!endpoint) throw new Error('Endereço de sincronização não configurado.');
    if (!this.isOnline()) throw new Error('Sem conexão com a internet.');

    let gestao = await DB.getCipaGestao(gestaoId);
    if (!gestao) return;

    gestao.syncStatus = 'sincronizando';
    gestao.syncError = '';
    await DB.putCipaGestao(gestao);
    this.notify();

    try {
      const payload = {
        action: 'upsertCipaGestao',
        gestao: buildCipaGestaoMetaPayload(gestao)
      };
      const resp = await postJson(endpoint, payload);
      if (!resp || resp.ok !== true) {
        throw new Error((resp && resp.error) || 'Falha ao enviar dados da gestão de CIPA.');
      }
      gestao.metaSynced = true;
      gestao.remoteRef = resp.remoteRef || gestao.remoteRef || null;
      gestao.syncStatus = 'synced';
      gestao.syncError = '';
      gestao.updatedAt = Date.now();
      await DB.putCipaGestao(gestao);
    } catch (err) {
      gestao = await DB.getCipaGestao(gestaoId);
      gestao.syncStatus = 'erro';
      gestao.syncError = err.message || String(err);
      await DB.putCipaGestao(gestao);
      this.notify();
      throw err;
    }
    this.notify();
  },

  async syncCipaReuniao(reuniaoId, endpointOverride) {
    const endpoint = endpointOverride || (await this.getEndpoint());
    if (!endpoint) throw new Error('Endereço de sincronização não configurado.');
    if (!this.isOnline()) throw new Error('Sem conexão com a internet.');

    let reuniao = await DB.getCipaReuniao(reuniaoId);
    if (!reuniao) return;

    reuniao.syncStatus = 'sincronizando';
    reuniao.syncError = '';
    await DB.putCipaReuniao(reuniao);
    this.notify();

    try {
      // 1) Envia os dados (texto) da reunião, sem fotos.
      if (!reuniao.metaSynced) {
        const payload = {
          action: 'upsertCipaReuniao',
          reuniao: buildCipaReuniaoMetaPayload(reuniao)
        };
        const resp = await postJson(endpoint, payload);
        if (!resp || resp.ok !== true) {
          throw new Error((resp && resp.error) || 'Falha ao enviar dados da reunião de CIPA.');
        }
        reuniao.metaSynced = true;
        reuniao.remoteRef = resp.remoteRef || reuniao.remoteRef || null;
        await DB.putCipaReuniao(reuniao);
      }

      // 2) Envia cada foto pendente, individualmente.
      const photos = await DB.getPhotosByInspection(reuniaoId);
      const pendentes = photos.filter((p) => !p.synced);

      for (const foto of pendentes) {
        const base64 = await blobToBase64(foto.blob);
        const payload = {
          action: 'uploadPhoto',
          inspectionId: reuniao.id,
          photo: {
            id: foto.id,
            questionRef: foto.questionRef,
            mimeType: foto.mimeType,
            fileName: foto.fileName,
            base64: base64,
            remoteRef: reuniao.remoteRef || null
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
      const todasFotos = await DB.getPhotosByInspection(reuniaoId);
      const tudoSincronizado = reuniao.metaSynced && todasFotos.every((p) => p.synced);
      reuniao.syncStatus = tudoSincronizado ? 'synced' : 'pendente';
      reuniao.syncError = '';
      reuniao.updatedAt = Date.now();
      await DB.putCipaReuniao(reuniao);
    } catch (err) {
      reuniao = await DB.getCipaReuniao(reuniaoId);
      reuniao.syncStatus = 'erro';
      reuniao.syncError = err.message || String(err);
      await DB.putCipaReuniao(reuniao);
      this.notify();
      throw err;
    }
    this.notify();
  },

  async syncPTAPR(ptId, endpointOverride) {
    const endpoint = endpointOverride || (await this.getEndpoint());
    if (!endpoint) throw new Error('Endereço de sincronização não configurado.');
    if (!this.isOnline()) throw new Error('Sem conexão com a internet.');

    let pt = await DB.getPTAPR(ptId);
    if (!pt) return;

    pt.syncStatus = 'sincronizando';
    pt.syncError = '';
    await DB.putPTAPR(pt);
    this.notify();

    try {
      // 1) Envia os dados (texto) da PT/APR, sem fotos.
      if (!pt.metaSynced) {
        const payload = {
          action: 'upsertPTAPR',
          ptapr: buildPTAPRMetaPayload(pt)
        };
        const resp = await postJson(endpoint, payload);
        if (!resp || resp.ok !== true) {
          throw new Error((resp && resp.error) || 'Falha ao enviar dados da PT/APR.');
        }
        pt.metaSynced = true;
        pt.remoteRef = resp.remoteRef || pt.remoteRef || null;
        await DB.putPTAPR(pt);
      }

      // 2) Envia cada foto pendente, individualmente.
      const photos = await DB.getPhotosByInspection(ptId);
      const pendentes = photos.filter((p) => !p.synced);

      for (const foto of pendentes) {
        const base64 = await blobToBase64(foto.blob);
        const payload = {
          action: 'uploadPhoto',
          inspectionId: pt.id,
          photo: {
            id: foto.id,
            questionRef: foto.questionRef,
            mimeType: foto.mimeType,
            fileName: foto.fileName,
            base64: base64,
            remoteRef: pt.remoteRef || null
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
      const todasFotos = await DB.getPhotosByInspection(ptId);
      const tudoSincronizado = pt.metaSynced && todasFotos.every((p) => p.synced);
      pt.syncStatus = tudoSincronizado ? 'synced' : 'pendente';
      pt.syncError = '';
      pt.updatedAt = Date.now();
      await DB.putPTAPR(pt);
    } catch (err) {
      pt = await DB.getPTAPR(ptId);
      pt.syncStatus = 'erro';
      pt.syncError = err.message || String(err);
      await DB.putPTAPR(pt);
      this.notify();
      throw err;
    }
    this.notify();
  },

  async syncCertificado(certId, endpointOverride) {
    const endpoint = endpointOverride || (await this.getEndpoint());
    if (!endpoint) throw new Error('Endereço de sincronização não configurado.');
    if (!this.isOnline()) throw new Error('Sem conexão com a internet.');

    let cert = await DB.getCertificado(certId);
    if (!cert) return;

    cert.syncStatus = 'sincronizando';
    cert.syncError = '';
    await DB.putCertificado(cert);
    this.notify();

    try {
      // 1) Envia os dados (texto) do certificado, sem fotos.
      if (!cert.metaSynced) {
        const payload = {
          action: 'upsertCertificado',
          certificado: buildCertificadoMetaPayload(cert)
        };
        const resp = await postJson(endpoint, payload);
        if (!resp || resp.ok !== true) {
          throw new Error((resp && resp.error) || 'Falha ao enviar dados do certificado.');
        }
        cert.metaSynced = true;
        cert.remoteRef = resp.remoteRef || cert.remoteRef || null;
        await DB.putCertificado(cert);
      }

      // 2) Envia cada foto pendente, individualmente.
      const photos = await DB.getPhotosByInspection(certId);
      const pendentes = photos.filter((p) => !p.synced);

      for (const foto of pendentes) {
        const base64 = await blobToBase64(foto.blob);
        const payload = {
          action: 'uploadPhoto',
          inspectionId: cert.id,
          photo: {
            id: foto.id,
            questionRef: foto.questionRef,
            mimeType: foto.mimeType,
            fileName: foto.fileName,
            base64: base64,
            remoteRef: cert.remoteRef || null
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
      const todasFotos = await DB.getPhotosByInspection(certId);
      const tudoSincronizado = cert.metaSynced && todasFotos.every((p) => p.synced);
      cert.syncStatus = tudoSincronizado ? 'synced' : 'pendente';
      cert.syncError = '';
      cert.updatedAt = Date.now();
      await DB.putCertificado(cert);
    } catch (err) {
      cert = await DB.getCertificado(certId);
      cert.syncStatus = 'erro';
      cert.syncError = err.message || String(err);
      await DB.putCertificado(cert);
      this.notify();
      throw err;
    }
    this.notify();
  },

  async syncPET(petId, endpointOverride) {
    const endpoint = endpointOverride || (await this.getEndpoint());
    if (!endpoint) throw new Error('Endereço de sincronização não configurado.');
    if (!this.isOnline()) throw new Error('Sem conexão com a internet.');

    let pet = await DB.getPET(petId);
    if (!pet) return;

    pet.syncStatus = 'sincronizando';
    pet.syncError = '';
    await DB.putPET(pet);
    this.notify();

    try {
      // 1) Envia os dados (texto) da PET, sem fotos.
      if (!pet.metaSynced) {
        const payload = {
          action: 'upsertPET',
          pet: buildPETMetaPayload(pet)
        };
        const resp = await postJson(endpoint, payload);
        if (!resp || resp.ok !== true) {
          throw new Error((resp && resp.error) || 'Falha ao enviar dados da PET.');
        }
        pet.metaSynced = true;
        pet.remoteRef = resp.remoteRef || pet.remoteRef || null;
        await DB.putPET(pet);
      }

      // 2) Envia cada foto pendente, individualmente.
      const photos = await DB.getPhotosByInspection(petId);
      const pendentes = photos.filter((p) => !p.synced);

      for (const foto of pendentes) {
        const base64 = await blobToBase64(foto.blob);
        const payload = {
          action: 'uploadPhoto',
          inspectionId: pet.id,
          photo: {
            id: foto.id,
            questionRef: foto.questionRef,
            mimeType: foto.mimeType,
            fileName: foto.fileName,
            base64: base64,
            remoteRef: pet.remoteRef || null
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
      const todasFotos = await DB.getPhotosByInspection(petId);
      const tudoSincronizado = pet.metaSynced && todasFotos.every((p) => p.synced);
      pet.syncStatus = tudoSincronizado ? 'synced' : 'pendente';
      pet.syncError = '';
      pet.updatedAt = Date.now();
      await DB.putPET(pet);
    } catch (err) {
      pet = await DB.getPET(petId);
      pet.syncStatus = 'erro';
      pet.syncError = err.message || String(err);
      await DB.putPET(pet);
      this.notify();
      throw err;
    }
    this.notify();
  },

  async syncInvestigacao(invId, endpointOverride) {
    const endpoint = endpointOverride || (await this.getEndpoint());
    if (!endpoint) throw new Error('Endereço de sincronização não configurado.');
    if (!this.isOnline()) throw new Error('Sem conexão com a internet.');

    let inv = await DB.getInvestigacao(invId);
    if (!inv) return;

    inv.syncStatus = 'sincronizando';
    inv.syncError = '';
    await DB.putInvestigacao(inv);
    this.notify();

    try {
      // 1) Envia os dados (texto) da investigação, sem fotos.
      if (!inv.metaSynced) {
        const payload = {
          action: 'upsertInvestigacao',
          investigacao: buildInvestigacaoMetaPayload(inv)
        };
        const resp = await postJson(endpoint, payload);
        if (!resp || resp.ok !== true) {
          throw new Error((resp && resp.error) || 'Falha ao enviar dados da investigação.');
        }
        inv.metaSynced = true;
        inv.remoteRef = resp.remoteRef || inv.remoteRef || null;
        await DB.putInvestigacao(inv);
      }

      // 2) Envia cada foto pendente, individualmente.
      const photos = await DB.getPhotosByInspection(invId);
      const pendentes = photos.filter((p) => !p.synced);

      for (const foto of pendentes) {
        const base64 = await blobToBase64(foto.blob);
        const payload = {
          action: 'uploadPhoto',
          inspectionId: inv.id,
          photo: {
            id: foto.id,
            questionRef: foto.questionRef,
            mimeType: foto.mimeType,
            fileName: foto.fileName,
            base64: base64,
            remoteRef: inv.remoteRef || null
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
      const todasFotos = await DB.getPhotosByInspection(invId);
      const tudoSincronizado = inv.metaSynced && todasFotos.every((p) => p.synced);
      inv.syncStatus = tudoSincronizado ? 'synced' : 'pendente';
      inv.syncError = '';
      inv.updatedAt = Date.now();
      await DB.putInvestigacao(inv);
    } catch (err) {
      inv = await DB.getInvestigacao(invId);
      inv.syncStatus = 'erro';
      inv.syncError = err.message || String(err);
      await DB.putInvestigacao(inv);
      this.notify();
      throw err;
    }
    this.notify();
  },

  async syncFichaEPI(fichaId, endpointOverride) {
    const endpoint = endpointOverride || (await this.getEndpoint());
    if (!endpoint) throw new Error('Endereço de sincronização não configurado.');
    if (!this.isOnline()) throw new Error('Sem conexão com a internet.');

    let ficha = await DB.getFichaEPI(fichaId);
    if (!ficha) return;

    ficha.syncStatus = 'sincronizando';
    ficha.syncError = '';
    await DB.putFichaEPI(ficha);
    this.notify();

    try {
      const payload = {
        action: 'upsertFichaEPI',
        ficha: buildFichaEPIMetaPayload(ficha)
      };
      const resp = await postJson(endpoint, payload);
      if (!resp || resp.ok !== true) {
        throw new Error((resp && resp.error) || 'Falha ao enviar dados da ficha de EPI.');
      }
      ficha.metaSynced = true;
      ficha.remoteRef = resp.remoteRef || ficha.remoteRef || null;
      ficha.syncStatus = 'synced';
      ficha.syncError = '';
      ficha.updatedAt = Date.now();
      await DB.putFichaEPI(ficha);
    } catch (err) {
      ficha = await DB.getFichaEPI(fichaId);
      ficha.syncStatus = 'erro';
      ficha.syncError = err.message || String(err);
      await DB.putFichaEPI(ficha);
      this.notify();
      throw err;
    }
    this.notify();
  }
};

function buildFichaEPIMetaPayload(ficha) {
  return {
    id: ficha.id,
    createdAt: ficha.createdAt,
    updatedAt: ficha.updatedAt,
    colaborador: ficha.data.colaborador,
    funcao: ficha.data.funcao,
    setor: ficha.data.setor,
    entregas: ficha.data.entregas.map((e) => ({
      id: e.id,
      epi: e.epi,
      ca: e.ca,
      dataEntrega: e.dataEntrega,
      quantidade: e.quantidade,
      motivo: e.motivo,
      assinado: !!e.assinatura
    }))
  };
}

function buildInvestigacaoMetaPayload(inv) {
  return {
    id: inv.id,
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt,
    acidente: inv.data.acidente,
    acidentado: inv.data.acidentado,
    descricao: inv.data.descricao,
    testemunhas: inv.data.testemunhas,
    perguntas: inv.data.perguntas.map((item) => ({
      id: item.id,
      texto: item.texto,
      resposta: item.resposta,
      observacao: item.observacao
    })),
    causasImediatas: inv.data.causasImediatas,
    causasBasicas: inv.data.causasBasicas,
    investigador: inv.data.investigador,
    planoAcao: inv.data.planoAcao.map((a) => ({
      id: a.id,
      descricao: a.descricao,
      responsavel: a.responsavel,
      prazo: a.prazo,
      status: a.status
    }))
  };
}

function buildPETMetaPayload(pet) {
  return {
    id: pet.id,
    createdAt: pet.createdAt,
    updatedAt: pet.updatedAt,
    identificacao: pet.data.identificacao,
    checklist: pet.data.checklist.map((item) => ({
      id: item.id,
      texto: item.texto,
      resposta: item.resposta,
      observacao: item.observacao
    })),
    leituras: pet.data.leituras.map((l) => ({
      id: l.id,
      horario: l.horario,
      oxigenio: l.oxigenio,
      explosividade: l.explosividade,
      monoxido: l.monoxido,
      sulfidrico: l.sulfidrico,
      responsavel: l.responsavel,
      observacao: l.observacao
    })),
    equipe: pet.data.equipe.map((p) => ({
      id: p.id,
      nome: p.nome,
      funcao: p.funcao,
      assinado: !!p.assinatura
    })),
    encerramento: pet.data.encerramento
  };
}

function buildCertificadoMetaPayload(cert) {
  return {
    id: cert.id,
    createdAt: cert.createdAt,
    updatedAt: cert.updatedAt,
    colaborador: cert.data.colaborador,
    funcao: cert.data.funcao,
    setor: cert.data.setor,
    tipo: descricaoTipoCertificado(cert),
    instituicao: cert.data.instituicao,
    cargaHoraria: cert.data.cargaHoraria,
    numeroCertificado: cert.data.numeroCertificado,
    dataEmissao: cert.data.dataEmissao,
    dataValidade: cert.data.dataValidade,
    observacoes: cert.data.observacoes
  };
}

function buildPTAPRMetaPayload(pt) {
  return {
    id: pt.id,
    createdAt: pt.createdAt,
    updatedAt: pt.updatedAt,
    identificacao: pt.data.identificacao,
    tiposTrabalho: pt.data.tiposTrabalho,
    checklist: pt.data.checklist.map((item) => ({
      id: item.id,
      texto: item.texto,
      resposta: item.resposta,
      observacao: item.observacao
    })),
    medidasControle: pt.data.medidasControle,
    equipe: pt.data.equipe.map((p) => ({
      id: p.id,
      nome: p.nome,
      funcao: p.funcao,
      assinado: !!p.assinatura
    })),
    encerramento: pt.data.encerramento
  };
}

function buildCipaGestaoMetaPayload(gestao) {
  return {
    id: gestao.id,
    createdAt: gestao.createdAt,
    updatedAt: gestao.updatedAt,
    empresa: gestao.data.empresa,
    unidade: gestao.data.unidade,
    mandatoInicio: gestao.data.mandatoInicio,
    mandatoFim: gestao.data.mandatoFim,
    membros: gestao.data.membros.map((m) => ({
      id: m.id,
      nome: m.nome,
      funcao: m.funcao,
      representacao: m.representacao,
      tipo: m.tipo,
      setor: m.setor
    }))
  };
}

function buildCipaReuniaoMetaPayload(reuniao) {
  return {
    id: reuniao.id,
    createdAt: reuniao.createdAt,
    updatedAt: reuniao.updatedAt,
    identificacao: reuniao.data.identificacao,
    pauta: reuniao.data.pauta,
    deliberacoes: reuniao.data.deliberacoes,
    participantes: reuniao.data.participantes.map((p) => ({
      id: p.id,
      nome: p.nome,
      funcao: p.funcao,
      assinado: !!p.assinatura
    }))
  };
}

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
