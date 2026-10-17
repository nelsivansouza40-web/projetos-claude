/* Central de ações: reúne, numa lista só, todas as ações corretivas e
 * preventivas abertas no app — fechamento e itens não conformes das
 * inspeções, plano de ação das investigações, plano de ação do PGR,
 * tratamento dos relatos e ações avulsas. Responsável, prazo e status podem
 * ser alterados aqui mesmo; a alteração é gravada no registro de origem e
 * volta para a fila de sincronização. */

function novaAcaoAvulsa() {
  return {
    id: uuid(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    syncStatus: 'pendente',
    syncError: '',
    descricao: '',
    origemTexto: 'Avulsa',
    empresa: '',
    area: '',
    responsavel: '',
    prazo: '',
    status: 'Pendente',
    criticidade: '',
    observacao: ''
  };
}

function hojeISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function diasAte(iso) {
  if (!iso) return null;
  const [a, m, d] = iso.split('-').map(Number);
  const alvo = new Date(a, m - 1, d);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((alvo - hoje) / 86400000);
}

/** Situação de uma ação: Concluída, Atrasada, Vence em breve, No prazo ou Sem prazo. */
function situacaoAcao(a) {
  if (a.status === 'Concluída') return { chave: 'concluida', text: 'Concluída', cls: 'badge-ok' };
  const dias = diasAte(a.prazo);
  if (dias === null) return { chave: 'semprazo', text: 'Sem prazo', cls: 'badge-rascunho' };
  if (dias < 0) return { chave: 'atrasada', text: `Atrasada ${-dias} dia(s)`, cls: 'badge-erro' };
  if (dias <= 7) return { chave: 'embreve', text: dias === 0 ? 'Vence hoje' : `Vence em ${dias} dia(s)`, cls: 'badge-pendente' };
  return { chave: 'noprazo', text: 'No prazo', cls: 'badge-sync' };
}

/** Lê todos os módulos e devolve a lista unificada de ações. */
async function coletarAcoes() {
  const [inspecoes, investigacoes, pgrs, relatos, avulsas, observacoes] = await Promise.all([
    DB.getAllInspections(), DB.getAllInvestigacoes(), DB.getAllPGR(), DB.getAllRelatos(), DB.getAllAcoes(), DB.getAllItems('observacoes')
  ]);
  const acoes = [];
  const reincidencia = analisarReincidencias(inspecoes).porItem;

  inspecoes.filter((i) => i.completo).forEach((insp) => {
    const id = insp.data.identificacao;
    const f = insp.data.fechamento;
    const criticidadeInspecao = maiorCriticidade(insp.data.checklist.filter((i) => i.resposta === 'Não Conforme').map((i) => i.criticidade));
    const contexto = `${disciplinaDaInspecao(insp)} · ${insp.data.tipoInspecao || 'Inspeção'} · ${formatarDataBR(id.data)}`;
    const descricaoFechamento = f.medidaDefinitiva || f.medidaImediata;
    if (descricaoFechamento) {
      acoes.push({
        chave: `insp:${insp.id}:fechamento`, origem: 'Inspeção', registroId: insp.id, ref: 'fechamento',
        descricao: descricaoFechamento, contexto, empresa: id.empresa, area: id.area,
        responsavel: f.responsavelAcao, prazo: f.prazo, status: f.statusAcao || 'Pendente', concluidaEm: f.concluidaEmAcao || '',
        criticidade: criticidadeInspecao, reincidente: false, acomp: f.acompAcao || {}, atualizadoEm: f.acaoAtualizadaEm || 0, acaoSync: f.acaoSync || ''
      });
    }
    insp.data.checklist.forEach((item) => {
      if (item.resposta !== 'Não Conforme' || !item.medida) return;
      acoes.push({
        chave: `insp:${insp.id}:${item.id}`, origem: 'Inspeção', registroId: insp.id, ref: item.id,
        descricao: item.medida, contexto: `${contexto} · NC: ${item.texto}`, empresa: id.empresa, area: id.area,
        responsavel: item.responsavelAcao || f.responsavelAcao, prazo: item.prazoAcao || f.prazo,
        status: item.statusAcao || 'Pendente', concluidaEm: item.concluidaEmAcao || '',
        criticidade: item.criticidade || '', reincidente: !!(reincidencia.get(`${insp.id}:${item.id}`) || {}).reincidente,
        acomp: item.acompAcao || {}, atualizadoEm: item.acaoAtualizadaEm || 0, acaoSync: item.acaoSync || ''
      });
    });
  });

  investigacoes.filter((i) => i.completo).forEach((inv) => {
    const ac = inv.data.acidente;
    inv.data.planoAcao.forEach((a) => {
      if (!a.descricao) return;
      acoes.push({
        chave: `inv:${inv.id}:${a.id}`, origem: 'Investigação', registroId: inv.id, ref: a.id,
        descricao: a.descricao, contexto: `Acidente ${formatarDataBR(ac.data)} · ${ac.local || ''}`,
        empresa: ac.empresa, area: ac.local, responsavel: a.responsavel, prazo: a.prazo, status: a.status || 'Pendente', concluidaEm: a.concluidaEm || '',
        criticidade: criticidadeDaGravidade(ac.gravidade), reincidente: false, acomp: a.acomp || {}, atualizadoEm: a.acaoAtualizadaEm || 0, acaoSync: a.acaoSync || ''
      });
    });
  });

  pgrs.forEach((pgr) => {
    const d = pgr.data;
    d.perigos.forEach((p) => {
      if (p.tipoMedida === 'Manter' || !p.medidasPropostas) return;
      acoes.push({
        chave: `pgr:${pgr.id}:${p.id}`, origem: 'PGR', registroId: pgr.id, ref: p.id,
        descricao: p.medidasPropostas, contexto: `PGR ${d.empresa || ''} · ${nomeGHEPGR(d.ghes, p.gheId) || 'sem GHE'} · ${p.perigo}`,
        empresa: d.empresa, area: d.unidade, responsavel: p.responsavel, prazo: p.prazo, status: p.status || 'Pendente', concluidaEm: p.concluidaEm || '',
        criticidade: criticidadeDoNivelPGR(classificarRiscoPGR(p.severidade, p.probabilidade).nivel), reincidente: false, acomp: p.acomp || {}, atualizadoEm: p.acaoAtualizadaEm || 0, acaoSync: p.acaoSync || ''
      });
    });
  });

  relatos.filter((r) => r.completo).forEach((r) => {
    const t = r.data.tratamento;
    if (!t.acaoCorretiva) return;
    acoes.push({
      chave: `rel:${r.id}`, origem: 'Relato', registroId: r.id, ref: 'tratamento',
      descricao: t.acaoCorretiva, contexto: `${r.data.tipo} · ${formatarDataBR(r.data.data)} · ${r.data.local || r.data.area}`,
      empresa: r.data.empresa, area: r.data.area, responsavel: t.responsavel, prazo: t.prazo, status: t.status || 'Pendente', concluidaEm: t.concluidaEm || '',
      criticidade: criticidadeDoPotencialRelato(r.data.potencial), reincidente: false, acomp: t.acomp || {}, atualizadoEm: t.acaoAtualizadaEm || 0, acaoSync: t.acaoSync || ''
    });
  });

  observacoes.filter((o) => o.completo).forEach((o) => {
    const t = o.data.tratamento;
    if (!t || !t.acaoCorretiva) return;
    acoes.push({
      chave: `obs:${o.id}`, origem: 'Observação', registroId: o.id, ref: 'tratamento',
      descricao: t.acaoCorretiva, contexto: `Observação comportamental · ${formatarDataBR(o.data.data)} · ${o.data.atividade}`,
      empresa: o.data.empresa, area: o.data.area, responsavel: t.responsavel, prazo: t.prazo, status: t.status || 'Pendente', concluidaEm: t.concluidaEm || '',
      criticidade: t.criticidade || '', reincidente: false, acomp: t.acomp || {}, atualizadoEm: t.acaoAtualizadaEm || 0, acaoSync: t.acaoSync || ''
    });
  });

  avulsas.forEach((a) => {
    acoes.push({
      chave: `av:${a.id}`, origem: 'Avulsa', registroId: a.id, ref: '',
      descricao: a.descricao, contexto: a.origemTexto && a.origemTexto !== 'Avulsa' ? a.origemTexto : (a.observacao || 'Ação avulsa'), empresa: a.empresa, area: a.area,
      responsavel: a.responsavel, prazo: a.prazo, status: a.status || 'Pendente', concluidaEm: a.concluidaEm || '',
      criticidade: a.criticidade || '', reincidente: false, acomp: a.acomp || {}, atualizadoEm: a.acaoAtualizadaEm || 0, acaoSync: a.acaoSync || ''
    });
  });

  return acoes;
}

/**
 * Localiza o objeto que guarda a ação dentro do registro de origem.
 * Retorna { registro, holder, campo(nome), salvar() } ou null.
 */
async function localizarAcao(acao) {
  const mapaInspecao = {
    responsavel: 'responsavelAcao', prazo: acao.ref === 'fechamento' ? 'prazo' : 'prazoAcao',
    status: 'statusAcao', concluidaEm: 'concluidaEmAcao', acomp: 'acompAcao'
  };
  const direto = (c) => c;
  if (acao.origem === 'Inspeção') {
    const r = await DB.getInspection(acao.registroId);
    const h = r && (acao.ref === 'fechamento' ? r.data.fechamento : r.data.checklist.find((i) => i.id === acao.ref));
    return h ? { registro: r, holder: h, campo: (c) => mapaInspecao[c] || c, salvar: () => DB.putInspection(r) } : null;
  }
  if (acao.origem === 'Investigação') {
    const r = await DB.getInvestigacao(acao.registroId);
    const h = r && r.data.planoAcao.find((x) => x.id === acao.ref);
    return h ? { registro: r, holder: h, campo: direto, salvar: () => DB.putInvestigacao(r) } : null;
  }
  if (acao.origem === 'PGR') {
    const r = await DB.getPGR(acao.registroId);
    const h = r && r.data.perigos.find((x) => x.id === acao.ref);
    return h ? { registro: r, holder: h, campo: direto, salvar: () => DB.putPGR(r) } : null;
  }
  if (acao.origem === 'Relato') {
    const r = await DB.getRelato(acao.registroId);
    return r ? { registro: r, holder: r.data.tratamento, campo: direto, salvar: () => DB.putRelato(r) } : null;
  }
  if (acao.origem === 'Observação') {
    const r = await DB.getItem('observacoes', acao.registroId);
    return r ? { registro: r, holder: r.data.tratamento, campo: direto, salvar: () => DB.putItem('observacoes', r) } : null;
  }
  if (acao.origem === 'Avulsa') {
    const r = await DB.getAcao(acao.registroId);
    return r ? { registro: r, holder: r, campo: direto, salvar: () => DB.putAcao(r), avulsa: true } : null;
  }
  return null;
}

/** Marca o registro de origem para reenvio à planilha. */
function marcarRegistroPendente(loc) {
  const r = loc.registro;
  r.updatedAt = Date.now();
  if (loc.avulsa) { r.syncStatus = 'pendente'; return; }
  if (r.completo) {
    r.metaSynced = false;
    r.syncStatus = 'pendente';
  }
}

/** Assinatura do acompanhamento: detecta alteração feita fora da Central (nos formulários). */
function assinaturaAcompanhamento(a) {
  return JSON.stringify([a.responsavel || '', a.prazo || '', a.status || 'Pendente', a.acomp || {}]);
}

/**
 * Grava a alteração de responsável, prazo, status ou acompanhamento.
 * Ação deste aparelho: grava no registro de origem. Ação de outro aparelho
 * (remota): grava na cópia local da equipe e entra na fila de envio.
 * opcoes.atualizadoEm: usado ao aplicar uma alteração vinda da planilha.
 */
async function atualizarAcaoNaOrigem(acao, campos, opcoes = {}) {
  // Data de conclusão: base do indicador "ações concluídas no prazo".
  if ('status' in campos && !('concluidaEm' in campos)) campos = { ...campos, concluidaEm: campos.status === 'Concluída' ? hojeISO() : '' };
  const quando = opcoes.atualizadoEm || Date.now();

  if (acao.remoto) {
    await atualizarAcaoEquipe(acao.chave, campos, quando);
    Object.assign(acao, campos, { atualizadoEm: quando });
    return;
  }

  const loc = await localizarAcao(acao);
  if (!loc) return;
  Object.entries(campos).forEach(([c, v]) => { loc.holder[loc.campo(c)] = v; });
  loc.holder.acaoAtualizadaEm = quando;
  if (opcoes.atualizadoEm) {
    // Veio da planilha: já está igual lá, não precisa voltar como alteração.
    const atual = { ...acao, ...campos };
    loc.holder.acaoSync = assinaturaAcompanhamento(atual);
  }
  marcarRegistroPendente(loc);
  await loc.salvar();
  Object.assign(acao, campos, { atualizadoEm: quando });
}

/* ---------------- AÇÕES DA EQUIPE (OUTROS APARELHOS) ---------------- */

/** Cópia local das ações de toda a equipe, baixada da planilha na sincronização. */
async function lerAcoesEquipe() {
  return (await DB.getSetting('acoesEquipe')) || [];
}

async function atualizarAcaoEquipe(chave, campos, quando) {
  const lista = await lerAcoesEquipe();
  const item = lista.find((x) => x.chave === chave);
  if (!item) return;
  Object.assign(item, campos, { atualizadoEm: quando });
  await DB.setSetting('acoesEquipe', lista);
  const fila = (await DB.getSetting('filaAcoesEquipe')) || [];
  if (!fila.includes(chave)) fila.push(chave);
  await DB.setSetting('filaAcoesEquipe', fila);
}

/** Converte uma linha da planilha em ação da Central (registro de outro aparelho). */
function acaoDaEquipe(x) {
  const partes = String(x.chave).split(':');
  return {
    ...x, remoto: true, registroId: partes[1] || '', ref: partes[2] || '',
    acomp: x.acomp || {}, status: x.status || 'Pendente',
    contexto: `${x.contexto || ''}${x.registradoPor ? ` · registrado por ${x.registradoPor}` : ''}`
  };
}

/** Ações deste aparelho mais as da equipe que não estão neste aparelho. */
async function coletarAcoesComEquipe() {
  const locais = await coletarAcoes();
  const chaves = new Set(locais.map((a) => a.chave));
  const equipe = (await lerAcoesEquipe()).filter((x) => !chaves.has(x.chave)).map(acaoDaEquipe);
  return [...locais, ...equipe];
}

/** O usuário deste aparelho é o responsável pela ação? */
function ehMinhaAcao(a, nome) {
  return !!nome && normalizarTexto(a.responsavel) === normalizarTexto(nome);
}

function abrirOrigemAcao(acao) {
  switch (acao.origem) {
    case 'Inspeção': return renderDetail(acao.registroId);
    case 'Investigação': return renderInvestigacaoDetail(acao.registroId);
    case 'PGR': return renderPGRDetail(acao.registroId);
    case 'Relato': return renderRelatoDetail(acao.registroId);
    case 'Observação': return renderObservacaoDetail(acao.registroId);
    case 'Avulsa': return renderAcaoAvulsaForm(acao.registroId);
  }
}

const ORDEM_SITUACAO = { atrasada: 0, embreve: 1, noprazo: 2, semprazo: 3, concluida: 4 };

function filtrarAcoes(acoes, filtro) {
  const termo = (filtro.busca || '').trim().toLowerCase();
  return acoes.filter((a) => {
    const sit = situacaoAcao(a).chave;
    if (filtro.situacao === 'abertas' && sit === 'concluida') return false;
    if (filtro.situacao === 'atrasadas' && sit !== 'atrasada') return false;
    if (filtro.situacao === 'embreve' && sit !== 'embreve') return false;
    if (filtro.situacao === 'concluidas' && sit !== 'concluida') return false;
    const etapa = etapaEficacia(a);
    if (filtro.situacao === 'verificar' && !(etapa && etapa.chave === 'verificar')) return false;
    if (filtro.situacao === 'semevidencia' && !(etapa && etapa.chave === 'semevidencia')) return false;
    if (filtro.situacao === 'criticas' && (sit === 'concluida' || !ehCriticidadeAlta(a.criticidade))) return false;
    if (filtro.situacao === 'reincidentes' && !a.reincidente) return false;
    if (filtro.origem && filtro.origem !== 'Todas' && a.origem !== filtro.origem) return false;
    if (filtro.minhas && !ehMinhaAcao(a, filtro.nome)) return false;
    if (termo) {
      const alvo = [a.descricao, a.contexto, a.responsavel, a.empresa, a.area].join(' ').toLowerCase();
      if (!alvo.includes(termo)) return false;
    }
    return true;
  }).sort((x, y) => {
    const ox = ORDEM_SITUACAO[situacaoAcao(x).chave];
    const oy = ORDEM_SITUACAO[situacaoAcao(y).chave];
    if (ox !== oy) return ox - oy;
    const cx = PESO_CRITICIDADE[x.criticidade] || 0;
    const cy = PESO_CRITICIDADE[y.criticidade] || 0;
    if (cx !== cy) return cy - cx;
    return (x.prazo || '9999').localeCompare(y.prazo || '9999');
  });
}

/* ---------------- TELA PRINCIPAL ---------------- */

const LIMITE_ACOES_TELA = 150;

async function renderAcoesHome() {
  state.screen = 'acoes-home';
  setActiveTab('acoes');
  const responsavel = PERFIL_ATUAL === 'Responsável';
  if (!state.filtroAcoes) state.filtroAcoes = { situacao: 'abertas', origem: 'Todas', busca: '', minhas: responsavel };
  const filtro = state.filtroAcoes;
  filtro.nome = (await DB.getSetting('nomeUsuario')) || '';
  if (!filtro.nome) filtro.minhas = false;
  const todas = await coletarAcoesComEquipe();
  const daEquipe = todas.filter((a) => a.remoto).length;
  const sincronizadoEm = await DB.getSetting('acoesEquipeEm');

  // Os números do topo seguem o filtro "só as minhas".
  const base = filtro.minhas ? todas.filter((a) => ehMinhaAcao(a, filtro.nome)) : todas;
  const conta = (chave) => base.filter((a) => situacaoAcao(a).chave === chave).length;
  const abertas = base.filter((a) => a.status !== 'Concluída').length;
  const contaEtapa = (chave) => base.filter((a) => { const e = etapaEficacia(a); return e && e.chave === chave; }).length;
  const criticasAbertas = base.filter((a) => a.status !== 'Concluída' && ehCriticidadeAlta(a.criticidade)).length;
  const opcoesSituacao = [
    ['abertas', 'Abertas'], ['atrasadas', 'Atrasadas'], ['embreve', 'Vencem em 7 dias'],
    ['criticas', 'Altas e críticas abertas'], ['reincidentes', 'Reincidentes'],
    ['verificar', 'Verificar eficácia'], ['semevidencia', 'Concluídas sem evidência'],
    ['concluidas', 'Concluídas'], ['todas', 'Todas']
  ];
  const origens = ['Todas', 'Inspeção', 'Investigação', 'PGR', 'Relato', 'Observação', 'Avulsa'];

  view.innerHTML = `
    <div class="screen-header">
      <h1>Central de ações</h1>
      ${responsavel ? '' : '<button id="btn-nova-acao" class="btn-primary">+ Nova ação</button>'}
    </div>
    <div class="equipe-barra">
      <label class="check-inline"><input type="checkbox" id="filtro-minhas" ${filtro.minhas ? 'checked' : ''} ${filtro.nome ? '' : 'disabled'}> Só as minhas ações${filtro.nome ? ` (${escapeHtml(filtro.nome)})` : ' (informe seu nome em Configurações)'}</label>
      <button type="button" id="btn-atualizar-equipe" class="btn-link">Atualizar com a equipe</button>
      <span class="hint">${daEquipe ? `${daEquipe} ação(ões) de outros aparelhos. ` : ''}${sincronizadoEm ? `Lista da equipe de ${new Date(sincronizadoEm).toLocaleString('pt-BR')}.` : 'Lista da equipe ainda não baixada.'}</span>
    </div>
    <div class="kpi-grid kpi-grid-acoes">
      <button type="button" class="kpi kpi-clicavel" data-sit="abertas"><span class="kpi-valor">${abertas}</span><span class="kpi-rotulo">Abertas</span></button>
      <button type="button" class="kpi kpi-clicavel kpi-alerta" data-sit="atrasadas"><span class="kpi-valor">${conta('atrasada')}</span><span class="kpi-rotulo">Atrasadas</span></button>
      <button type="button" class="kpi kpi-clicavel kpi-atencao" data-sit="embreve"><span class="kpi-valor">${conta('embreve')}</span><span class="kpi-rotulo">Vencem em 7 dias</span></button>
      <button type="button" class="kpi kpi-clicavel ${criticasAbertas ? 'kpi-alerta' : 'kpi-ok'}" data-sit="criticas"><span class="kpi-valor">${criticasAbertas}</span><span class="kpi-rotulo">Altas e críticas abertas</span></button>
      <button type="button" class="kpi kpi-clicavel ${contaEtapa('verificar') ? 'kpi-atencao' : ''}" data-sit="verificar"><span class="kpi-valor">${contaEtapa('verificar')}</span><span class="kpi-rotulo">Verificar eficácia</span></button>
      <button type="button" class="kpi kpi-clicavel kpi-ok" data-sit="concluidas"><span class="kpi-valor">${conta('concluida')}</span><span class="kpi-rotulo">Concluídas</span></button>
    </div>
    <div class="filtros-acoes">
      <select id="filtro-situacao">
        ${opcoesSituacao.map(([v, r]) => `<option value="${v}" ${filtro.situacao === v ? 'selected' : ''}>${r}</option>`).join('')}
      </select>
      <select id="filtro-origem">
        ${origens.map((o) => `<option ${filtro.origem === o ? 'selected' : ''}>${o}</option>`).join('')}
      </select>
      <input type="search" id="filtro-busca" placeholder="Buscar por ação, responsável, área…" value="${escapeHtml(filtro.busca)}">
    </div>
    <div class="form-actions acoes-envio">
      <button type="button" id="btn-acoes-whatsapp" class="btn-secondary">Enviar lista pelo WhatsApp</button>
      <button type="button" id="btn-acoes-email" class="btn-secondary">Enviar lista por e-mail</button>
    </div>
    <div id="lista-acoes"></div>
  `;

  const listaEl = document.getElementById('lista-acoes');

  function desenharLista() {
    const visiveis = filtrarAcoes(todas, filtro);
    const mostradas = visiveis.slice(0, LIMITE_ACOES_TELA);
    listaEl.innerHTML = visiveis.length
      ? `<p class="hint">${visiveis.length} ação(ões) encontrada(s)${visiveis.length > LIMITE_ACOES_TELA ? ` — mostrando as ${LIMITE_ACOES_TELA} primeiras; use a busca para refinar` : ''}.</p>
         <ul class="insp-list">${mostradas.map((a, idx) => cardAcao(a, idx, responsavel && !!filtro.nome && !ehMinhaAcao(a, filtro.nome))).join('')}</ul>`
      : '<p class="empty-state">Nenhuma ação encontrada com estes filtros.</p>';

    mostradas.forEach((a, idx) => {
      const card = listaEl.querySelector(`.acao-card[data-idx="${idx}"]`);
      if (!card) return;
      const salvar = async (campos) => {
        await atualizarAcaoNaOrigem(a, campos);
        updateSyncBar();
        renderAcoesHome();
      };
      card.querySelector('.in-acao-responsavel').addEventListener('change', (e) => salvar({ responsavel: e.target.value.trim() }));
      card.querySelector('.in-acao-prazo').addEventListener('change', (e) => salvar({ prazo: e.target.value }));
      card.querySelector('.in-acao-status').addEventListener('change', (e) => {
        // Concluir exige a evidência do que foi feito; cancelar volta ao status anterior.
        if (e.target.value === 'Concluída') abrirDialogoConclusao(a, true);
        else salvar({ status: e.target.value });
      });
      const btnOrigem = card.querySelector('.btn-abrir-origem');
      if (btnOrigem) btnOrigem.addEventListener('click', () => abrirOrigemAcao(a));
      const btnEvid = card.querySelector('.btn-registrar-evidencia');
      if (btnEvid) btnEvid.addEventListener('click', () => abrirDialogoConclusao(a, false));
      const btnVerif = card.querySelector('.btn-verificar-eficacia');
      if (btnVerif) btnVerif.addEventListener('click', () => abrirDialogoEficacia(a));
    });
  }
  desenharLista();

  const btnNova = document.getElementById('btn-nova-acao');
  if (btnNova) btnNova.addEventListener('click', () => renderAcaoAvulsaForm(null));
  document.getElementById('filtro-minhas').addEventListener('change', (e) => { filtro.minhas = e.target.checked; renderAcoesHome(); });
  document.getElementById('btn-atualizar-equipe').addEventListener('click', async (e) => {
    const btn = e.target;
    btn.disabled = true;
    btn.textContent = 'Atualizando…';
    try { await Sync.syncAll(); } catch (err) { alert('Não foi possível atualizar agora: ' + err.message); }
    renderAcoesHome();
  });
  view.querySelectorAll('.kpi-clicavel').forEach((btn) => {
    btn.addEventListener('click', () => {
      filtro.situacao = btn.dataset.sit;
      renderAcoesHome();
    });
  });
  document.getElementById('filtro-situacao').addEventListener('change', (e) => { filtro.situacao = e.target.value; desenharLista(); });
  document.getElementById('filtro-origem').addEventListener('change', (e) => { filtro.origem = e.target.value; desenharLista(); });
  document.getElementById('filtro-busca').addEventListener('input', (e) => { filtro.busca = e.target.value; desenharLista(); });

  document.getElementById('btn-acoes-whatsapp').addEventListener('click', () => {
    const texto = textoListaAcoes(filtrarAcoes(todas, filtro));
    window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank');
  });
  document.getElementById('btn-acoes-email').addEventListener('click', () => {
    const texto = textoListaAcoes(filtrarAcoes(todas, filtro));
    location.href = 'mailto:?subject=' + encodeURIComponent('Ações de SSMA — situação em ' + new Date().toLocaleDateString('pt-BR')) +
      '&body=' + encodeURIComponent(texto);
  });
}

/** somenteLeitura: perfil Responsável vendo ação de outra pessoa (o servidor também recusa a alteração). */
function cardAcao(a, idx, somenteLeitura) {
  const sit = situacaoAcao(a);
  const etapa = etapaEficacia(a);
  const ac = a.acomp || {};
  const ultimaFalha = (ac.historico || []).slice(-1)[0];
  let acompanhamento = '';
  const responsavel = PERFIL_ATUAL === 'Responsável';
  const links = [...new Set([...(ac.evidenciaLinks || []), ...String(a.fotosEvidencia || '').split(' ').filter(Boolean)])];
  if (a.status === 'Concluída' && ac.evidencia) {
    acompanhamento = `<p class="acao-evidencia"><strong>Evidência:</strong> ${escapeHtml(ac.evidencia)}${(ac.evidenciaFotos || []).length ? ` · ${ac.evidenciaFotos.length} foto(s)` : ''}
      ${links.map((l, i) => `<a href="${escapeHtml(l)}" target="_blank" rel="noopener">foto ${i + 1}</a>`).join(' ')}</p>`;
    // A verificação de eficácia é feita por SSMA, não por quem executou a ação.
    if (ac.eficacia !== 'Eficaz' && !responsavel) acompanhamento += '<button type="button" class="btn-secondary btn-verificar-eficacia">Verificar eficácia</button>';
    else if (ac.eficaciaObs) acompanhamento += `<p class="acao-evidencia"><strong>Verificação:</strong> ${escapeHtml(ac.eficaciaObs)}</p>`;
  } else if (a.status === 'Concluída' && !somenteLeitura) {
    acompanhamento = '<button type="button" class="btn-secondary btn-registrar-evidencia">Registrar evidência</button>';
  } else if (ultimaFalha) {
    acompanhamento = `<p class="acao-evidencia acao-falha"><strong>Não eficaz em ${formatarDataBR(ultimaFalha.verificadaEm)}:</strong> ${escapeHtml(ultimaFalha.observacao)}</p>`;
  }
  return `
    <li class="acao-card" data-idx="${idx}">
      <div class="acao-topo">
        <span class="badge badge-origem">${escapeHtml(a.origem)}</span>
        ${a.remoto ? '<span class="badge badge-sync">Equipe</span>' : ''}
        <span class="badge ${sit.cls}">${sit.text}</span>
        ${a.criticidade ? `<span class="badge ${classeCriticidade(a.criticidade)}">Criticidade ${escapeHtml(a.criticidade)}</span>` : ''}
        ${a.reincidente ? '<span class="badge badge-erro">Reincidente</span>' : ''}
        ${etapa ? `<span class="badge ${etapa.cls}">${escapeHtml(etapa.text)}</span>` : ''}
      </div>
      <div class="insp-card-title">${escapeHtml(a.descricao)}</div>
      <div class="insp-card-sub">${escapeHtml(a.contexto)}</div>
      <div class="participante-linha">
        <label class="campo-leitura">Responsável
          <input type="text" class="in-acao-responsavel" value="${escapeHtml(a.responsavel || '')}" ${responsavel ? 'disabled' : ''}>
        </label>
        <label class="campo-leitura">Prazo
          <input type="date" class="in-acao-prazo" value="${escapeHtml(a.prazo || '')}" ${responsavel ? 'disabled' : ''}>
        </label>
        <label class="campo-leitura">Status
          <select class="in-acao-status" ${somenteLeitura ? 'disabled' : ''}>${STATUS_ACAO.map((s) => `<option ${a.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
        </label>
      </div>
      ${somenteLeitura ? '<p class="hint">Ação em nome de outra pessoa: só o responsável por ela ou a equipe de SSMA podem alterá-la.</p>' : ''}
      ${acompanhamento}
      ${a.remoto
        ? '<p class="hint">Registro de outro aparelho: as alterações seguem para a planilha da equipe na próxima sincronização.</p>'
        : `<button type="button" class="btn-link btn-abrir-origem">Abrir ${a.origem === 'Avulsa' ? 'ação' : 'registro de origem'} →</button>`}
    </li>
  `;
}

/* ---------------- EVIDÊNCIA E EFICÁCIA ---------------- */

function abrirDialogo(html) {
  const fundo = document.createElement('div');
  fundo.className = 'dialogo-fundo no-print';
  fundo.innerHTML = `<div class="dialogo-caixa" role="dialog">${html}</div>`;
  document.body.appendChild(fundo);
  return fundo;
}

/** Concluir a ação (ou completar a evidência de uma ação já concluída). */
async function abrirDialogoConclusao(acao, mudarStatus) {
  const ac = acao.acomp || {};
  const fotos = [...(ac.evidenciaFotos || [])];
  const novas = [];
  const dlg = abrirDialogo(`
    <h2>${mudarStatus ? 'Concluir ação' : 'Registrar evidência'}</h2>
    <p class="hint">${escapeHtml(acao.descricao)}</p>
    <form id="form-conclusao" class="form-section">
      <label>O que foi feito e onde está a evidência? *
        <textarea name="evidencia" rows="3" required placeholder="Ex.: guarda-corpo instalado no mezanino; ordem de serviço 1234">${escapeHtml(ac.evidencia || '')}</textarea>
      </label>
      <label>Fotos da evidência</label>
      <div class="foto-botoes">
        <label class="file-label">📷 Tirar foto<input type="file" accept="image/*" capture="environment" class="input-foto-evid"></label>
        <label class="file-label">🖼️ Da galeria<input type="file" accept="image/*" multiple class="input-foto-evid"></label>
      </div>
      <div class="thumbs" id="thumbs-evid"></div>
      <label>Verificar a eficácia em *
        <input type="date" name="verificarEm" required value="${escapeHtml(ac.verificarEm || somarDias(hojeISO(), DIAS_PADRAO_VERIFICACAO))}">
        <small>Data para voltar ao local e confirmar se o risco foi eliminado ou reduzido.</small>
      </label>
      <div class="form-actions">
        <button type="button" class="btn-link" data-cancelar>Cancelar</button>
        <button type="submit" class="btn-primary">${mudarStatus ? 'Concluir ação' : 'Salvar evidência'}</button>
      </div>
    </form>`);
  const thumbs = dlg.querySelector('#thumbs-evid');
  async function desenharFotos() {
    await renderThumbnails(thumbs, fotos);
    thumbs.querySelectorAll('.btn-remover-foto').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const pid = btn.dataset.photoId;
        fotos.splice(fotos.indexOf(pid), 1);
        if (novas.includes(pid)) await DB.deletePhoto(pid);
        desenharFotos();
      });
    });
  }
  desenharFotos();
  dlg.querySelectorAll('.input-foto-evid').forEach((input) => {
    input.addEventListener('change', async (e) => {
      const antes = fotos.length;
      await adicionarFotos({ id: `acao:${acao.chave}` }, fotos, e.target.files, 'evidencia');
      novas.push(...fotos.slice(antes));
      e.target.value = '';
      desenharFotos();
    });
  });
  dlg.querySelector('[data-cancelar]').addEventListener('click', async () => {
    for (const pid of novas) await DB.deletePhoto(pid);
    dlg.remove();
    renderAcoesHome();
  });
  dlg.querySelector('#form-conclusao').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const evidencia = (fd.get('evidencia') || '').trim();
    if (!evidencia) return;
    const campos = {
      acomp: {
        ...ac, evidencia, evidenciaFotos: fotos, verificarEm: fd.get('verificarEm') || '',
        eficacia: '', eficaciaEm: '', eficaciaPor: '', eficaciaObs: ''
      }
    };
    if (mudarStatus) campos.status = 'Concluída';
    await atualizarAcaoNaOrigem(acao, campos);
    dlg.remove();
    updateSyncBar();
    renderAcoesHome();
  });
}

/** Verificação de eficácia: eficaz encerra; não eficaz reabre com novo prazo. */
async function abrirDialogoEficacia(acao) {
  const ac = acao.acomp || {};
  const nome = (await DB.getSetting('nomeUsuario')) || '';
  const dlg = abrirDialogo(`
    <h2>Verificar eficácia</h2>
    <p class="hint">${escapeHtml(acao.descricao)}</p>
    <p><strong>Evidência registrada:</strong> ${escapeHtml(ac.evidencia || '—')}</p>
    <div class="thumbs" id="thumbs-verif"></div>
    <form id="form-eficacia" class="form-section">
      <fieldset>
        <legend>No local, a ação eliminou ou reduziu o risco? *</legend>
        <div class="radio-group">
          <label class="radio-pill radio-ok"><input type="radio" name="resultado" value="Eficaz" required> Eficaz</label>
          <label class="radio-pill radio-nc"><input type="radio" name="resultado" value="Não eficaz"> Não eficaz</label>
        </div>
      </fieldset>
      <label>O que foi observado na verificação <span id="obs-obrigatoria" hidden>*</span>
        <textarea name="observacao" rows="3"></textarea>
      </label>
      <label>Verificado por *
        <input type="text" name="verificador" required value="${escapeHtml(nome)}">
      </label>
      <label id="campo-novo-prazo" hidden>Novo prazo para corrigir *
        <input type="date" name="novoPrazo" value="${somarDias(hojeISO(), 15)}">
      </label>
      <div class="form-actions">
        <button type="button" class="btn-link" data-cancelar>Cancelar</button>
        <button type="submit" class="btn-primary">Registrar verificação</button>
      </div>
    </form>`);
  renderThumbnails(dlg.querySelector('#thumbs-verif'), ac.evidenciaFotos || []).then(() => {
    dlg.querySelectorAll('#thumbs-verif .btn-remover-foto').forEach((b) => b.remove());
  });
  const form = dlg.querySelector('#form-eficacia');
  form.querySelectorAll('input[name=resultado]').forEach((r) => r.addEventListener('change', () => {
    const naoEficaz = form.resultado.value === 'Não eficaz';
    dlg.querySelector('#campo-novo-prazo').hidden = !naoEficaz;
    dlg.querySelector('#obs-obrigatoria').hidden = !naoEficaz;
    form.observacao.required = naoEficaz;
    form.novoPrazo.required = naoEficaz;
  }));
  dlg.querySelector('[data-cancelar]').addEventListener('click', () => dlg.remove());
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const resultado = fd.get('resultado');
    const observacao = (fd.get('observacao') || '').trim();
    const verificador = (fd.get('verificador') || '').trim();
    if (resultado === 'Eficaz') {
      await atualizarAcaoNaOrigem(acao, {
        acomp: { ...ac, eficacia: 'Eficaz', eficaciaEm: hojeISO(), eficaciaPor: verificador, eficaciaObs: observacao }
      });
    } else {
      const historico = [...(ac.historico || []), {
        concluidaEm: acao.concluidaEm || '', evidencia: ac.evidencia || '', evidenciaFotos: ac.evidenciaFotos || [],
        verificadaEm: hojeISO(), verificadaPor: verificador, observacao
      }];
      await atualizarAcaoNaOrigem(acao, { status: 'Em andamento', prazo: fd.get('novoPrazo') || acao.prazo, acomp: { historico } });
    }
    dlg.remove();
    updateSyncBar();
    renderAcoesHome();
  });
}

/** Texto curto, pronto para colar no WhatsApp ou no e-mail. */
function textoListaAcoes(acoes) {
  const LIMITE = 40;
  const linhas = acoes.slice(0, LIMITE).map((a, i) => {
    const sit = situacaoAcao(a);
    const prazo = a.prazo ? formatarDataBR(a.prazo) : 'sem prazo';
    const extras = [a.criticidade ? `Criticidade: ${a.criticidade}` : '', a.reincidente ? 'Reincidente' : ''].filter(Boolean).join(' · ');
    return `${i + 1}. ${a.descricao}\n   Origem: ${a.origem} — ${a.contexto}${extras ? `\n   ${extras}` : ''}\n   Responsável: ${a.responsavel || 'não definido'} · Prazo: ${prazo} · ${sit.text}`;
  });
  const extra = acoes.length > LIMITE ? `\n\n…e mais ${acoes.length - LIMITE} ação(ões). Consulte a Central de ações no app.` : '';
  return `*Ações de SSMA — ${new Date().toLocaleDateString('pt-BR')}*\n${acoes.length} ação(ões) na lista.\n\n${linhas.join('\n\n')}${extra}`;
}

/* ---------------- AÇÃO AVULSA ---------------- */

async function renderAcaoAvulsaForm(id) {
  state.screen = 'acoes-form';
  const a = id ? await DB.getAcao(id) : novaAcaoAvulsa();
  if (!a) return renderAcoesHome();

  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-acoes" class="btn-link">← Voltar</button>
      <h1>${id ? 'Ação avulsa' : 'Nova ação'}</h1>
    </div>
    <p class="hint">Use para ações que não nasceram de uma inspeção, investigação, PGR ou relato — por exemplo, pedidos de auditoria, reunião ou cliente.</p>
    <form id="form-acao" class="form-section">
      <label>O que deve ser feito? *
        <textarea name="descricao" rows="3" required>${escapeHtml(a.descricao)}</textarea>
      </label>
      <label>Origem / motivo
        <input type="text" name="origemTexto" placeholder="Ex.: auditoria interna, reunião da CIPA" value="${escapeHtml(a.origemTexto === 'Avulsa' ? '' : a.origemTexto)}">
      </label>
      <label>Empresa
        <input type="text" name="empresa" value="${escapeHtml(a.empresa)}">
      </label>
      <label>Área / Setor
        <input type="text" name="area" value="${escapeHtml(a.area)}">
      </label>
      <label>Criticidade
        <select name="criticidade">
          <option value="">Não classificada</option>
          ${CRITICIDADES.map((c) => `<option ${a.criticidade === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </label>
      <div class="participante-linha">
        <label class="campo-leitura">Responsável *
          <input type="text" name="responsavel" required value="${escapeHtml(a.responsavel)}">
        </label>
        <label class="campo-leitura">Prazo *
          <input type="date" name="prazo" required value="${escapeHtml(a.prazo)}">
        </label>
        <label class="campo-leitura">Status
          <select name="status">${STATUS_ACAO.map((s) => `<option ${a.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
        </label>
      </div>
      <label>Observação
        <textarea name="observacao" rows="2">${escapeHtml(a.observacao)}</textarea>
      </label>
      <div class="form-actions">
        ${id ? '<button type="button" id="btn-excluir-acao" class="btn-danger">Excluir</button>' : ''}
        <button type="submit" class="btn-primary">Salvar ação</button>
      </div>
    </form>
  `;

  document.getElementById('btn-back-acoes').addEventListener('click', renderAcoesHome);
  document.getElementById('form-acao').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    a.descricao = (fd.get('descricao') || '').trim();
    a.origemTexto = (fd.get('origemTexto') || '').trim() || 'Avulsa';
    a.empresa = (fd.get('empresa') || '').trim();
    a.area = (fd.get('area') || '').trim();
    a.criticidade = fd.get('criticidade') || '';
    a.responsavel = (fd.get('responsavel') || '').trim();
    a.prazo = fd.get('prazo') || '';
    a.status = fd.get('status') || 'Pendente';
    a.observacao = (fd.get('observacao') || '').trim();
    a.updatedAt = Date.now();
    a.syncStatus = 'pendente';
    await DB.putAcao(a);
    await refreshChrome();
    renderAcoesHome();
    Sync.syncAll().catch(() => {});
  });
  const btnExcluir = document.getElementById('btn-excluir-acao');
  if (btnExcluir) btnExcluir.addEventListener('click', async () => {
    if (!confirm('Excluir esta ação?')) return;
    await DB.deleteAcao(a.id);
    updateSyncBar();
    renderAcoesHome();
  });
}
