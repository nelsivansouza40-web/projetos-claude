/*
 * Motor de sincronização.
 * A inspeção é sempre salva localmente primeiro (offline-first).
 * Quando há conexão, os dados (texto) e depois as fotos são enviados,
 * cada foto de forma independente, para tolerar quedas de conexão no meio
 * do envio. O status é reavaliado a cada tentativa.
 */

const Sync = {
  running: false,
  ultimaComFalha: false,
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

  /**
   * Uma vez por dia, pergunta ao servidor se ele está protegido (chave de
   * acesso ou usuários cadastrados). Sem proteção, qualquer pessoa com o
   * endereço consegue gravar na planilha: o app avisa o gestor.
   */
  async verificarProtecaoServidor(endpoint) {
    const ultima = await DB.getSetting('protecaoVerificadaEm');
    if (ultima && Date.now() - ultima < 24 * 60 * 60 * 1000) return;
    const resp = await postJson(endpoint, { action: 'ping' });
    if (!resp || !resp.ok) return;
    if ('protegido' in resp) await DB.setSetting('servidorProtegido', resp.protegido);
    await DB.setSetting('protecaoVerificadaEm', Date.now());
  },

  async syncAll() {
    if (this.running) return;
    if (!this.isOnline()) return;
    const endpoint = await this.getEndpoint();
    if (!endpoint) return;
    // PIN recusado pela planilha: não envia nada até a pessoa entrar de novo.
    // Cada envio com PIN errado conta para o bloqueio de 15 minutos.
    if (await DB.getSetting('loginRecusado')) {
      loginRecusado = true;
      this.ultimaComFalha = false;
      throw new Error(MSG_LOGIN_RECUSADO);
    }

    this.running = true;
    this.notify();
    try { await this.verificarProtecaoServidor(endpoint); } catch (e) { /* sem resposta: tenta de novo na próxima */ }
    // Um registro com erro não pode travar a fila: cada um é tentado
    // separadamente, e o erro fica gravado no próprio registro.
    let falhas = 0;
    try {
      const inspections = await DB.getAllInspections();
      for (const insp of inspections) {
        if (!insp.completo || insp.syncStatus === 'synced') continue;
        try { await this.syncInspection(insp.id, endpoint); } catch (e) { falhas++; }
      }
      const registrosDDS = await DB.getAllDDS();
      for (const dds of registrosDDS) {
        if (!dds.completo || dds.syncStatus === 'synced') continue;
        try { await this.syncDDS(dds.id, endpoint); } catch (e) { falhas++; }
      }
      const registrosDiag = await DB.getAllDiagnosticos();
      for (const diag of registrosDiag) {
        if (!diag.completo || diag.syncStatus === 'synced') continue;
        try { await this.syncDiagnostico(diag.id, endpoint); } catch (e) { falhas++; }
      }
      const gestoesCipa = await DB.getAllCipaGestoes();
      for (const gestao of gestoesCipa) {
        if (!gestao.completo || gestao.syncStatus === 'synced') continue;
        try { await this.syncCipaGestao(gestao.id, endpoint); } catch (e) { falhas++; }
      }
      const reunioesCipa = await DB.getAllCipaReunioes();
      for (const reuniao of reunioesCipa) {
        if (!reuniao.completo || reuniao.syncStatus === 'synced') continue;
        try { await this.syncCipaReuniao(reuniao.id, endpoint); } catch (e) { falhas++; }
      }
      const registrosPTAPR = await DB.getAllPTAPR();
      for (const pt of registrosPTAPR) {
        if (!pt.completo || pt.syncStatus === 'synced') continue;
        try { await this.syncPTAPR(pt.id, endpoint); } catch (e) { falhas++; }
      }
      const registrosCert = await DB.getAllCertificados();
      for (const cert of registrosCert) {
        if (!cert.completo || cert.syncStatus === 'synced') continue;
        try { await this.syncCertificado(cert.id, endpoint); } catch (e) { falhas++; }
      }
      const registrosPET = await DB.getAllPET();
      for (const pet of registrosPET) {
        if (!pet.completo || pet.syncStatus === 'synced') continue;
        try { await this.syncPET(pet.id, endpoint); } catch (e) { falhas++; }
      }
      const registrosInvestigacao = await DB.getAllInvestigacoes();
      for (const inv of registrosInvestigacao) {
        if (!inv.completo || inv.syncStatus === 'synced') continue;
        try { await this.syncInvestigacao(inv.id, endpoint); } catch (e) { falhas++; }
      }
      const registrosEPI = await DB.getAllFichasEPI();
      for (const ficha of registrosEPI) {
        if (!ficha.completo || ficha.syncStatus === 'synced') continue;
        try { await this.syncFichaEPI(ficha.id, endpoint); } catch (e) { falhas++; }
      }
      const registrosVeiculo = await DB.getAllVeiculos();
      for (const veic of registrosVeiculo) {
        if (!veic.completo || veic.syncStatus === 'synced') continue;
        try { await this.syncVeiculo(veic.id, endpoint); } catch (e) { falhas++; }
      }
      const registrosPGR = await DB.getAllPGR();
      for (const pgr of registrosPGR) {
        if (!pgr.completo || pgr.syncStatus === 'synced') continue;
        try { await this.syncPGR(pgr.id, endpoint); } catch (e) { falhas++; }
      }
      const registrosRelatos = await DB.getAllRelatos();
      for (const relato of registrosRelatos) {
        if (!relato.completo || relato.syncStatus === 'synced') continue;
        try { await this.syncRelato(relato.id, endpoint); } catch (e) { falhas++; }
      }
      const observacoes = await DB.getAllItems('observacoes');
      for (const obs of observacoes) {
        if (!obs.completo || obs.syncStatus === 'synced') continue;
        try { await this.syncObservacao(obs.id, endpoint); } catch (e) { falhas++; }
      }
      const acoesAvulsas = await DB.getAllAcoes();
      for (const acao of acoesAvulsas) {
        if (acao.syncStatus === 'synced') continue;
        try { await this.syncAcao(acao.id, endpoint); } catch (e) { falhas++; }
      }
      // Lista consolidada de ações deste aparelho (painel do gestor / Looker Studio).
      try { await this.syncAcoesConsolidadas(endpoint); } catch (e) { falhas++; }
    } finally {
      this.running = false;
      this.notify();
    }
    // Com falha (sinal fraco, servidor ocupado), tenta de novo sozinho em alguns minutos.
    this.ultimaComFalha = falhas > 0 && !loginRecusado;
    if (falhas && loginRecusado) throw new Error(MSG_LOGIN_RECUSADO);
    if (falhas) throw new Error(`${falhas} registro(s) não sincronizaram. Abra cada um para ver o motivo.`);
  },

  async syncRelato(relatoId, endpointOverride) {
    const endpoint = endpointOverride || (await this.getEndpoint());
    if (!endpoint) throw new Error('Endereço de sincronização não configurado.');
    if (!this.isOnline()) throw new Error('Sem conexão com a internet.');

    let relato = await DB.getRelato(relatoId);
    if (!relato) return;

    relato.syncStatus = 'sincronizando';
    relato.syncError = '';
    await DB.putRelato(relato);
    this.notify();

    try {
      if (!relato.metaSynced) {
        const resp = await postJson(endpoint, { action: 'upsertRelato', relato: buildRelatoMetaPayload(relato) });
        if (!resp || resp.ok !== true) {
          throw new Error((resp && resp.error) || 'Falha ao enviar dados do relato.');
        }
        relato.metaSynced = true;
        relato.remoteRef = resp.remoteRef || relato.remoteRef || null;
        await DB.putRelato(relato);
      }

      const photos = await DB.getPhotosByInspection(relatoId);
      for (const foto of photos.filter((p) => !p.synced)) {
        const resp = await postJson(endpoint, {
          action: 'uploadPhoto',
          inspectionId: relato.id,
          photo: {
            id: foto.id,
            questionRef: foto.questionRef,
            mimeType: foto.mimeType,
            fileName: foto.fileName,
            base64: await blobToBase64(foto.blob),
            remoteRef: relato.remoteRef || null
          }
        });
        if (!resp || resp.ok !== true) {
          throw new Error((resp && resp.error) || 'Falha ao enviar uma foto.');
        }
        foto.synced = true;
        foto.remoteUrl = resp.fileUrl || null;
        await DB.putPhoto(foto);
        this.notify();
      }

      const todasFotos = await DB.getPhotosByInspection(relatoId);
      relato.syncStatus = relato.metaSynced && todasFotos.every((p) => p.synced) ? 'synced' : 'pendente';
      relato.syncError = '';
      await DB.putRelato(relato);
    } catch (err) {
      relato = await DB.getRelato(relatoId);
      relato.syncStatus = 'erro';
      relato.syncError = err.message || String(err);
      await DB.putRelato(relato);
      this.notify();
      throw err;
    }
    this.notify();
  },

  async syncObservacao(obsId, endpointOverride) {
    const endpoint = endpointOverride || (await this.getEndpoint());
    if (!endpoint) throw new Error('Endereço de sincronização não configurado.');
    if (!this.isOnline()) throw new Error('Sem conexão com a internet.');
    let obs = await DB.getItem('observacoes', obsId);
    if (!obs) return;
    obs.syncStatus = 'sincronizando';
    obs.syncError = '';
    await DB.putItem('observacoes', obs);
    this.notify();
    try {
      if (!obs.metaSynced) {
        const resp = await postJson(endpoint, { action: 'upsertObservacao', observacao: buildObservacaoMetaPayload(obs) });
        if (!resp || resp.ok !== true) throw new Error((resp && resp.error) || 'Falha ao enviar a observação.');
        obs.metaSynced = true;
        obs.remoteRef = resp.remoteRef || obs.remoteRef || null;
        await DB.putItem('observacoes', obs);
      }
      const photos = await DB.getPhotosByInspection(obsId);
      for (const foto of photos.filter((p) => !p.synced)) {
        const resp = await postJson(endpoint, {
          action: 'uploadPhoto',
          inspectionId: obs.id,
          photo: { id: foto.id, questionRef: foto.questionRef, mimeType: foto.mimeType, fileName: foto.fileName, base64: await blobToBase64(foto.blob), remoteRef: obs.remoteRef || null }
        });
        if (!resp || resp.ok !== true) throw new Error((resp && resp.error) || 'Falha ao enviar uma foto.');
        foto.synced = true;
        foto.remoteUrl = resp.fileUrl || null;
        await DB.putPhoto(foto);
      }
      const todas = await DB.getPhotosByInspection(obsId);
      obs.syncStatus = obs.metaSynced && todas.every((p) => p.synced) ? 'synced' : 'pendente';
      obs.syncError = '';
      await DB.putItem('observacoes', obs);
    } catch (err) {
      obs = await DB.getItem('observacoes', obsId);
      obs.syncStatus = 'erro';
      obs.syncError = err.message || String(err);
      await DB.putItem('observacoes', obs);
      this.notify();
      throw err;
    }
    this.notify();
  },

  /**
   * Ações compartilhadas com a equipe, em quatro passos:
   * 1) envia as alterações feitas aqui em ações de outros aparelhos;
   * 2) dá data nova às alterações feitas nos formulários (fora da Central);
   * 3) baixa as ações da equipe e aplica aqui as alterações mais novas;
   * 4) envia a lista deste aparelho (só quando mudou).
   * Em cada ação, vale a alteração mais recente, venha de onde vier.
   */
  async syncAcoesConsolidadas(endpoint) {
    await this.enviarFilaAcoesEquipe(endpoint);

    for (const a of await coletarAcoes()) {
      if (a.acaoSync && a.acaoSync !== assinaturaAcompanhamento(a)) {
        const loc = await localizarAcao(a);
        if (loc) { loc.holder.acaoAtualizadaEm = Date.now(); await loc.salvar(); }
      }
    }

    const lista = await postJson(endpoint, { action: 'listarAcoes' });
    if (lista && lista.ok && Array.isArray(lista.acoes)) {
      const locais = new Map((await coletarAcoes()).map((a) => [a.chave, a]));
      for (const r of lista.acoes) {
        const local = locais.get(r.chave);
        if (!local || (Number(r.atualizadoEm) || 0) <= (Number(local.atualizadoEm) || 0)) continue;
        await atualizarAcaoNaOrigem(local, {
          responsavel: r.responsavel, prazo: r.prazo, status: r.status, concluidaEm: r.concluidaEm, acomp: r.acomp || {}
        }, { atualizadoEm: Number(r.atualizadoEm) });
      }
      // Alterações locais ainda não enviadas continuam valendo na cópia da equipe.
      const fila = (await DB.getSetting('filaAcoesEquipe')) || [];
      const anteriores = await lerAcoesEquipe();
      const equipe = lista.acoes.map((r) => (fila.includes(r.chave) ? anteriores.find((x) => x.chave === r.chave) || r : r));
      await DB.setSetting('acoesEquipe', equipe);
      await DB.setSetting('acoesEquipeEm', Date.now());
    } else if (lista && lista.error && !/desconhecida/i.test(lista.error)) {
      throw new Error(lista.error);
    }

    const coletadas = await coletarAcoes();
    // Fotos de evidência de conclusão: vão para a pasta do registro de origem no Drive.
    const linksEvidencia = {};
    for (const a of coletadas) {
      linksEvidencia[a.chave] = await this.enviarFotosEvidencia(endpoint, a.registroId, a.acomp || {});
    }
    const acoes = coletadas.map((a) => ({
      chave: a.chave, origem: a.origem, descricao: a.descricao, contexto: a.contexto,
      empresa: a.empresa || '', area: a.area || '', criticidade: a.criticidade || '', reincidente: a.reincidente ? 'Sim' : 'Não',
      ...camposPlanilhaAcao(a, linksEvidencia[a.chave]), atualizadoEm: a.atualizadoEm || 0
    }));
    // A situação ("Atrasada 3 dias") muda com o tempo: entra no controle uma vez por dia.
    const assinatura = hojeISO() + JSON.stringify(acoes);
    if ((await DB.getSetting('acoesConsolidadasEnviadas')) !== assinatura) {
      const usuario = (await DB.getSetting('nomeUsuario')) || '';
      for (let i = 0; i < acoes.length || i === 0; i += 200) {
        const resp = await postJson(endpoint, { action: 'upsertAcoesConsolidadas', usuario, acoes: acoes.slice(i, i + 200) });
        if (!resp || resp.ok !== true) throw new Error((resp && resp.error) || 'Falha ao enviar a lista de ações.');
        if (!acoes.length) break;
      }
      await DB.setSetting('acoesConsolidadasEnviadas', assinatura);
    }

    // Guarda como ficou cada ação nesta sincronização (base do passo 2 da próxima).
    for (const a of coletadas) {
      const assin = assinaturaAcompanhamento(a);
      if (a.acaoSync === assin) continue;
      const loc = await localizarAcao(a);
      if (loc) { loc.holder.acaoSync = assin; await loc.salvar(); }
    }
  },

  /** Envia as fotos de evidência (atuais e do histórico) e devolve os links do Drive. */
  async enviarFotosEvidencia(endpoint, registroId, ac) {
    const ids = [...(ac.evidenciaFotos || []), ...(ac.historico || []).flatMap((h) => h.evidenciaFotos || [])];
    const links = [...(ac.evidenciaLinks || [])];
    for (const pid of ids) {
      const foto = await DB.getPhoto(pid);
      if (!foto) continue;
      if (!foto.synced) {
        const resp = await postJson(endpoint, {
          action: 'uploadPhoto',
          inspectionId: registroId,
          photo: { id: foto.id, questionRef: 'evidencia_acao', mimeType: foto.mimeType, fileName: foto.fileName, base64: await blobToBase64(foto.blob), remoteRef: null }
        });
        if (!resp || resp.ok !== true) throw new Error((resp && resp.error) || 'Falha ao enviar foto de evidência.');
        foto.synced = true;
        foto.remoteUrl = resp.fileUrl || null;
        await DB.putPhoto(foto);
      }
      if (foto.remoteUrl && !links.includes(foto.remoteUrl)) links.push(foto.remoteUrl);
    }
    return links;
  },

  /** Alterações feitas aqui em ações registradas por outros aparelhos. */
  async enviarFilaAcoesEquipe(endpoint) {
    const fila = (await DB.getSetting('filaAcoesEquipe')) || [];
    if (!fila.length) return;
    const lista = await lerAcoesEquipe();
    const restantes = [];
    let erro = null;
    for (const chave of fila) {
      const item = lista.find((x) => x.chave === chave);
      if (!item) continue;
      try {
        const acao = acaoDaEquipe(item);
        const links = await this.enviarFotosEvidencia(endpoint, acao.registroId, item.acomp || {});
        item.acomp = { ...(item.acomp || {}), evidenciaLinks: links };
        const resp = await postJson(endpoint, {
          action: 'atualizarAcao',
          acao: { chave, ...camposPlanilhaAcao({ ...acao, acomp: item.acomp }, links), atualizadoEm: item.atualizadoEm }
        });
        if (!resp || resp.ok !== true) {
          const msg = (resp && resp.error) || 'Falha ao enviar a alteração da ação.';
          throw new Error(/desconhecida/i.test(msg) ? 'O servidor da planilha está desatualizado: cole o Code.gs novo no Apps Script.' : msg);
        }
      } catch (e) {
        restantes.push(chave);
        erro = e;
      }
    }
    await DB.setSetting('acoesEquipe', lista);
    await DB.setSetting('filaAcoesEquipe', restantes);
    if (erro) throw erro;
  },

  async syncAcao(acaoId, endpointOverride) {
    const endpoint = endpointOverride || (await this.getEndpoint());
    if (!endpoint) throw new Error('Endereço de sincronização não configurado.');
    if (!this.isOnline()) throw new Error('Sem conexão com a internet.');

    let acao = await DB.getAcao(acaoId);
    if (!acao) return;
    try {
      const resp = await postJson(endpoint, { action: 'upsertAcao', acao: buildAcaoMetaPayload(acao) });
      if (!resp || resp.ok !== true) {
        throw new Error((resp && resp.error) || 'Falha ao enviar a ação.');
      }
      acao.syncStatus = 'synced';
      acao.syncError = '';
      await DB.putAcao(acao);
    } catch (err) {
      acao = await DB.getAcao(acaoId);
      acao.syncStatus = 'erro';
      acao.syncError = err.message || String(err);
      await DB.putAcao(acao);
      this.notify();
      throw err;
    }
    this.notify();
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
          inspection: {
            ...buildInspectionMetaPayload(insp, analisarReincidencias(await DB.getAllInspections()).porItem),
            usuario: (await DB.getSetting('nomeUsuario')) || ''
          }
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
  },

  async syncVeiculo(veiculoId, endpointOverride) {
    const endpoint = endpointOverride || (await this.getEndpoint());
    if (!endpoint) throw new Error('Endereço de sincronização não configurado.');
    if (!this.isOnline()) throw new Error('Sem conexão com a internet.');

    let v = await DB.getVeiculo(veiculoId);
    if (!v) return;

    v.syncStatus = 'sincronizando';
    v.syncError = '';
    await DB.putVeiculo(v);
    this.notify();

    try {
      // 1) Envia os dados (texto) da vistoria, sem fotos.
      if (!v.metaSynced) {
        const payload = {
          action: 'upsertVeiculo',
          veiculo: buildVeiculoMetaPayload(v)
        };
        const resp = await postJson(endpoint, payload);
        if (!resp || resp.ok !== true) {
          throw new Error((resp && resp.error) || 'Falha ao enviar dados da vistoria de veículo.');
        }
        v.metaSynced = true;
        v.remoteRef = resp.remoteRef || v.remoteRef || null;
        await DB.putVeiculo(v);
      }

      // 2) Envia cada foto pendente, individualmente.
      const photos = await DB.getPhotosByInspection(veiculoId);
      const pendentes = photos.filter((p) => !p.synced);

      for (const foto of pendentes) {
        const base64 = await blobToBase64(foto.blob);
        const payload = {
          action: 'uploadPhoto',
          inspectionId: v.id,
          photo: {
            id: foto.id,
            questionRef: foto.questionRef,
            mimeType: foto.mimeType,
            fileName: foto.fileName,
            base64: base64,
            remoteRef: v.remoteRef || null
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
      const todasFotos = await DB.getPhotosByInspection(veiculoId);
      const tudoSincronizado = v.metaSynced && todasFotos.every((p) => p.synced);
      v.syncStatus = tudoSincronizado ? 'synced' : 'pendente';
      v.syncError = '';
      v.updatedAt = Date.now();
      await DB.putVeiculo(v);
    } catch (err) {
      v = await DB.getVeiculo(veiculoId);
      v.syncStatus = 'erro';
      v.syncError = err.message || String(err);
      await DB.putVeiculo(v);
      this.notify();
      throw err;
    }
    this.notify();
  },

  async syncPGR(pgrId, endpointOverride) {
    const endpoint = endpointOverride || (await this.getEndpoint());
    if (!endpoint) throw new Error('Endereço de sincronização não configurado.');
    if (!this.isOnline()) throw new Error('Sem conexão com a internet.');

    let p = await DB.getPGR(pgrId);
    if (!p) return;

    p.syncStatus = 'sincronizando';
    p.syncError = '';
    await DB.putPGR(p);
    this.notify();

    try {
      if (!p.metaSynced) {
        const payload = {
          action: 'upsertPGR',
          pgr: buildPGRMetaPayload(p)
        };
        const resp = await postJson(endpoint, payload);
        if (!resp || resp.ok !== true) {
          throw new Error((resp && resp.error) || 'Falha ao enviar dados do PGR.');
        }
        p.metaSynced = true;
        p.remoteRef = resp.remoteRef || p.remoteRef || null;
        await DB.putPGR(p);
      }

      // Envia as evidências fotográficas dos exercícios simulados de emergência.
      const photos = await DB.getPhotosByInspection(pgrId);
      const pendentes = photos.filter((foto) => !foto.synced);

      for (const foto of pendentes) {
        const base64 = await blobToBase64(foto.blob);
        const payload = {
          action: 'uploadPhoto',
          inspectionId: p.id,
          photo: {
            id: foto.id,
            questionRef: foto.questionRef,
            mimeType: foto.mimeType,
            fileName: foto.fileName,
            base64: base64,
            remoteRef: p.remoteRef || null
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

      const todasFotos = await DB.getPhotosByInspection(pgrId);
      const tudoSincronizado = p.metaSynced && todasFotos.every((foto) => foto.synced);
      p.syncStatus = tudoSincronizado ? 'synced' : 'pendente';
      p.syncError = '';
      p.updatedAt = Date.now();
      await DB.putPGR(p);
    } catch (err) {
      p = await DB.getPGR(pgrId);
      p.syncStatus = 'erro';
      p.syncError = err.message || String(err);
      await DB.putPGR(p);
      this.notify();
      throw err;
    }
    this.notify();
  }
};

function buildRelatoMetaPayload(r) {
  const d = r.data;
  return {
    id: r.id,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    tipo: d.tipo,
    data: d.data,
    hora: d.hora,
    empresa: d.empresa,
    area: d.area,
    local: d.local,
    descricao: d.descricao,
    potencial: d.potencial,
    acaoImediata: d.acaoImediata,
    anonimo: !!d.anonimo,
    relator: d.anonimo ? 'Anônimo' : d.relator,
    funcaoRelator: d.anonimo ? '' : d.funcaoRelator,
    tratamento: d.tratamento,
    localizacao: d.localizacao,
    qtdFotos: d.fotosIds.length
  };
}

function buildObservacaoMetaPayload(o) {
  const d = o.data;
  const k = indiceSeguro(o);
  return {
    id: o.id,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    data: d.data,
    hora: d.hora,
    empresa: d.empresa,
    area: d.area,
    atividade: d.atividade,
    observador: d.observador,
    numObservados: d.numObservados,
    seguros: k.seguro,
    deRisco: k.risco,
    percentualSeguro: k.pct,
    itensDeRisco: d.itens.filter((i) => i.resultado === 'De risco').map((i) => `${i.categoria}: ${i.texto}`).join(' | '),
    comportamentosRisco: d.comportamentosRisco,
    reconhecimento: d.reconhecimento,
    feedbackRealizado: d.feedbackRealizado,
    compromisso: d.compromisso,
    tratamento: d.tratamento,
    qtdFotos: d.fotosIds.length
  };
}

function buildAcaoMetaPayload(a) {
  return {
    id: a.id,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    descricao: a.descricao,
    origem: a.origemTexto || 'Avulsa',
    empresa: a.empresa,
    area: a.area,
    responsavel: a.responsavel,
    prazo: a.prazo,
    status: a.status,
    observacao: a.observacao
  };
}

function buildPGRMetaPayload(p) {
  const ghes = p.data.ghes || [];
  return {
    id: p.id,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    empresa: p.data.empresa,
    unidade: p.data.unidade,
    responsavelPGR: p.data.responsavelPGR,
    dataElaboracao: p.data.dataElaboracao,
    proximaRevisao: p.data.proximaRevisao,
    caracterizacaoAmbiente: p.data.caracterizacaoAmbiente,
    cnpj: p.data.cnpj || '',
    cnae: p.data.cnae || '',
    atividadePrincipal: p.data.atividadePrincipal || '',
    grauRisco: p.data.grauRisco || '',
    endereco: p.data.endereco || '',
    regimeTrabalho: p.data.regimeTrabalho || '',
    consultaTrabalhadores: p.data.consultaTrabalhadores || '',
    requisitosEspecificos: p.data.requisitosEspecificos || '',
    revisoes: (p.data.revisoes || []).map((r) => `Rev. ${r.revisao} (${r.data || 's/ data'}): ${r.motivo || ''}`).join(' | '),
    ghes: ghes.map((g) => ({
      id: g.id,
      nome: g.nome,
      setor: g.setor,
      funcao: g.funcao,
      numTrabalhadores: g.numTrabalhadores,
      descricaoAtividades: g.descricaoAtividades || ''
    })),
    perigos: p.data.perigos.map((item) => ({
      id: item.id,
      ghe: nomeGHEPGR(ghes, item.gheId),
      perigo: item.perigo,
      lesaoAgravo: item.lesaoAgravo,
      fonte: item.fonte,
      tipoExposicao: item.tipoExposicao,
      tempoExposicao: item.tempoExposicao,
      tipoRisco: item.tipoRisco,
      severidade: item.severidade,
      probabilidade: item.probabilidade,
      nivelRisco: classificarRiscoPGR(item.severidade, item.probabilidade).nivel,
      medidasExistentes: item.medidasExistentes,
      medidasPropostas: item.medidasPropostas,
      severidadeResidual: item.severidadeResidual,
      probabilidadeResidual: item.probabilidadeResidual,
      nivelRiscoResidual: classificarRiscoPGR(item.severidadeResidual, item.probabilidadeResidual).nivel,
      responsavel: item.responsavel,
      prazo: item.prazo,
      status: item.status,
      referencia: item.referencia || '',
      tipoAvaliacao: item.tipoAvaliacao || '',
      resultadoAvaliacao: item.resultadoAvaliacao || '',
      tipoMedida: item.tipoMedida || '',
      acompanhamento: item.acompanhamento || ''
    })),
    treinamentos: (p.data.treinamentos || []).map((item) => ({
      id: item.id,
      nome: item.nome,
      ghe: nomeGHEPGR(ghes, item.gheId) || 'Todos os GHEs',
      cargaHoraria: item.cargaHoraria,
      periodicidade: item.periodicidade,
      responsavel: item.responsavel,
      dataPrevista: item.dataPrevista,
      status: item.status
    })),
    emergencia: p.data.emergencia || {},
    exerciciosSimulados: (p.data.exerciciosSimulados || []).map((item) => ({
      id: item.id,
      data: item.data,
      descricao: item.descricao,
      participantes: item.participantes,
      qtdFotos: (item.fotosIds || []).length
    }))
  };
}

function buildVeiculoMetaPayload(v) {
  return {
    id: v.id,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
    identificacao: v.data.identificacao,
    checklist: v.data.checklist.map((item) => ({
      id: item.id,
      texto: item.texto,
      resposta: item.resposta,
      observacao: item.observacao
    })),
    avarias: v.data.avarias.map((a) => ({
      id: a.id,
      x: a.x,
      y: a.y,
      tipo: a.tipo,
      descricao: a.descricao
    })),
    fechamento: v.data.fechamento
  };
}

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
    cincoPorques: garantirAnaliseCausa(inv.data).cincoPorques,
    ishikawa: inv.data.ishikawa,
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

function buildInspectionMetaPayload(insp, reincidencia = new Map()) {
  const ncs = insp.data.checklist.filter((i) => i.resposta === 'Não Conforme');
  const ehReincidente = (item) => !!(reincidencia.get(`${insp.id}:${item.id}`) || {}).reincidente;
  return {
    id: insp.id,
    createdAt: insp.createdAt,
    updatedAt: insp.updatedAt,
    identificacao: insp.data.identificacao,
    disciplina: disciplinaDaInspecao(insp),
    conformidade: (() => {
      const c = insp.data.checklist.filter((i) => i.resposta === 'Conforme').length;
      const nc = insp.data.checklist.filter((i) => i.resposta === 'Não Conforme').length;
      return c + nc ? Math.round((c / (c + nc)) * 100) : '';
    })(),
    qtdNC: ncs.length,
    qtdNCAltasCriticas: ncs.filter((i) => ehCriticidadeAlta(i.criticidade)).length,
    qtdNCReincidentes: ncs.filter(ehReincidente).length,
    duracaoMin: insp.data.concluidoEm ? Math.max(1, Math.round((insp.data.concluidoEm - insp.createdAt) / 60000)) : '',
    equipamento: insp.data.equipamento ? `${insp.data.equipamento.codigo} — ${insp.data.equipamento.nome}` : '',
    tipoInspecao: insp.data.tipoInspecao,
    checklist: insp.data.checklist.map((item) => ({
      id: item.id,
      texto: item.texto,
      resposta: item.resposta,
      observacao: item.observacao,
      medida: item.medida,
      responsavelAcao: item.responsavelAcao || '',
      prazoAcao: item.prazoAcao || '',
      statusAcao: item.statusAcao || '',
      criticidade: item.resposta === 'Não Conforme' ? (item.criticidade || '') : '',
      reincidente: item.resposta === 'Não Conforme' && ehReincidente(item),
      personalizado: !!item.personalizado
    })),
    fechamento: insp.data.fechamento
  };
}

/**
 * Fotos de celular costumam ter 3 a 6 MB, o que torna o envio lento e sujeito
 * a queda em rede móvel. Fotos JPEG grandes são reduzidas para no máximo
 * 1600 px no lado maior (qualidade suficiente para relatório): já na captura
 * (adicionarFotos) e de novo antes do envio, para fotos guardadas antes disso.
 */
async function reduzirFotoParaEnvio(blob) {
  try {
    if (!blob || !/jpe?g/i.test(blob.type || '') || blob.size < 700 * 1024 || !window.createImageBitmap) return blob;
    const img = await createImageBitmap(blob);
    const escala = Math.min(1, 1600 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * escala);
    canvas.height = Math.round(img.height * escala);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    const menor = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.82));
    return menor && menor.size < blob.size ? menor : blob;
  } catch (e) {
    return blob;
  }
}

async function blobToBase64(blobOriginal) {
  const blob = await reduzirFotoParaEnvio(blobOriginal);
  return blobParaBase64(blob);
}

function blobParaBase64(blob) {
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

/** Colunas de acompanhamento da ação na planilha (iguais para o dono e para a equipe). */
function camposPlanilhaAcao(a, links = []) {
  const ac = a.acomp || {};
  const etapa = etapaEficacia(a);
  return {
    responsavel: a.responsavel || '', prazo: a.prazo || '', status: a.status || 'Pendente',
    situacao: situacaoAcao(a).text, concluidaEm: a.concluidaEm || '',
    evidencia: ac.evidencia || '', fotosEvidencia: links.join(' '),
    verificarEm: ac.verificarEm || '', eficacia: etapa ? etapa.text : '',
    eficaciaEm: ac.eficaciaEm || '', eficaciaPor: ac.eficaciaPor || '', reaberturas: (ac.historico || []).length,
    acomp: { ...ac, evidenciaLinks: links.length ? links : (ac.evidenciaLinks || []) }
  };
}

let loginRecusado = false;
const MSG_LOGIN_RECUSADO = 'A planilha recusou o usuário ou PIN: entre de novo em Configurações → Acesso do usuário. Até lá, nada é enviado.';

/** Tempo máximo de espera pela resposta do servidor (fotos levam mais). */
const TEMPO_LIMITE_ENVIO_MS = 90 * 1000;
const TEMPO_LIMITE_FOTO_MS = 180 * 1000;
/** Intervalo entre novas tentativas automáticas depois de uma sincronização com falha. */
const INTERVALO_NOVA_TENTATIVA_MS = 5 * 60 * 1000;

/** Aviso para o gestor quando a planilha aceita dados de qualquer pessoa com o endereço. */
async function htmlAvisoServidorDesprotegido() {
  if ((await DB.getSetting('servidorProtegido')) !== false) return '';
  return `<p class="aviso-backup"><strong>Planilha sem proteção:</strong> qualquer pessoa que tenha o endereço de sincronização
    consegue gravar dados nela. Defina a CHAVE_ACESSO no Apps Script (e a mesma chave em Configurações) ou cadastre os
    usuários na aba Usuarios. Passo a passo no guia do gestor, item 1.</p>`;
}

async function postJson(url, payload) {
  const chave = await DB.getSetting('chaveAcesso');
  if (chave) payload = { ...payload, chave };
  // Login por usuário e PIN (quando a planilha tem a aba Usuarios preenchida).
  if (!('usuarioLogin' in payload)) {
    const usuarioLogin = await DB.getSetting('usuarioLogin');
    if (usuarioLogin) payload = { ...payload, usuarioLogin, pin: (await DB.getSetting('pinUsuario')) || '' };
  }
  // Depois de uma recusa de PIN, o resto da sincronização não insiste.
  if (loginRecusado && payload.action !== 'login' && payload.action !== 'ping') throw new Error(MSG_LOGIN_RECUSADO);
  // Sem tempo limite, um envio em sinal fraco podia ficar pendurado e travar
  // a sincronização em "Sincronizando" até o app ser fechado.
  const limite = payload.action === 'uploadPhoto' ? TEMPO_LIMITE_FOTO_MS : TEMPO_LIMITE_ENVIO_MS;
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), limite);
  let dados;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      signal: controle.signal
    });
    if (!resp.ok) {
      throw new Error('Erro HTTP ' + resp.status + ' ao contatar o servidor.');
    }
    dados = await resp.json();
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new Error(`O servidor não respondeu em ${limite / 1000} segundos (sinal fraco?). O envio será tentado de novo.`);
    }
    throw e;
  } finally {
    clearTimeout(relogio);
  }
  if (dados && dados.loginInvalido) {
    loginRecusado = true;
    await DB.setSetting('loginRecusado', true);
  }
  return dados;
}

window.addEventListener('online', () => {
  Sync.syncAll().catch((e) => console.warn('Falha na sincronização automática:', e));
});

// Nova tentativa automática: se a última sincronização teve falha, tenta de
// novo a cada 5 minutos com o app aberto e quando ele volta para a tela.
// Sem falha pendente, não faz nada (não gasta dados nem bateria).
function tentarDeNovoSeFalhou() {
  if (!Sync.ultimaComFalha || document.visibilityState !== 'visible') return;
  Sync.syncAll().catch((e) => console.warn('Nova tentativa de sincronização falhou:', e));
}
setInterval(tentarDeNovoSeFalhou, INTERVALO_NOVA_TENTATIVA_MS);
document.addEventListener('visibilitychange', tentarDeNovoSeFalhou);
