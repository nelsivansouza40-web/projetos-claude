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

  inspecoes.filter((i) => i.completo).forEach((insp) => {
    const id = insp.data.identificacao;
    const f = insp.data.fechamento;
    const contexto = `${disciplinaDaInspecao(insp)} · ${insp.data.tipoInspecao || 'Inspeção'} · ${formatarDataBR(id.data)}`;
    const descricaoFechamento = f.medidaDefinitiva || f.medidaImediata;
    if (descricaoFechamento) {
      acoes.push({
        chave: `insp:${insp.id}:fechamento`, origem: 'Inspeção', registroId: insp.id, ref: 'fechamento',
        descricao: descricaoFechamento, contexto, empresa: id.empresa, area: id.area,
        responsavel: f.responsavelAcao, prazo: f.prazo, status: f.statusAcao || 'Pendente'
      });
    }
    insp.data.checklist.forEach((item) => {
      if (item.resposta !== 'Não Conforme' || !item.medida) return;
      acoes.push({
        chave: `insp:${insp.id}:${item.id}`, origem: 'Inspeção', registroId: insp.id, ref: item.id,
        descricao: item.medida, contexto: `${contexto} · NC: ${item.texto}`, empresa: id.empresa, area: id.area,
        responsavel: item.responsavelAcao || f.responsavelAcao, prazo: item.prazoAcao || f.prazo,
        status: item.statusAcao || 'Pendente'
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
        empresa: ac.empresa, area: ac.local, responsavel: a.responsavel, prazo: a.prazo, status: a.status || 'Pendente'
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
        empresa: d.empresa, area: d.unidade, responsavel: p.responsavel, prazo: p.prazo, status: p.status || 'Pendente'
      });
    });
  });

  relatos.filter((r) => r.completo).forEach((r) => {
    const t = r.data.tratamento;
    if (!t.acaoCorretiva) return;
    acoes.push({
      chave: `rel:${r.id}`, origem: 'Relato', registroId: r.id, ref: 'tratamento',
      descricao: t.acaoCorretiva, contexto: `${r.data.tipo} · ${formatarDataBR(r.data.data)} · ${r.data.local || r.data.area}`,
      empresa: r.data.empresa, area: r.data.area, responsavel: t.responsavel, prazo: t.prazo, status: t.status || 'Pendente'
    });
  });

  observacoes.filter((o) => o.completo).forEach((o) => {
    const t = o.data.tratamento;
    if (!t || !t.acaoCorretiva) return;
    acoes.push({
      chave: `obs:${o.id}`, origem: 'Observação', registroId: o.id, ref: 'tratamento',
      descricao: t.acaoCorretiva, contexto: `Observação comportamental · ${formatarDataBR(o.data.data)} · ${o.data.atividade}`,
      empresa: o.data.empresa, area: o.data.area, responsavel: t.responsavel, prazo: t.prazo, status: t.status || 'Pendente'
    });
  });

  avulsas.forEach((a) => {
    acoes.push({
      chave: `av:${a.id}`, origem: 'Avulsa', registroId: a.id, ref: '',
      descricao: a.descricao, contexto: a.origemTexto && a.origemTexto !== 'Avulsa' ? a.origemTexto : (a.observacao || 'Ação avulsa'), empresa: a.empresa, area: a.area,
      responsavel: a.responsavel, prazo: a.prazo, status: a.status || 'Pendente'
    });
  });

  return acoes;
}

/** Grava a alteração de responsável, prazo ou status no registro de origem. */
async function atualizarAcaoNaOrigem(acao, campos) {
  const marcarPendente = (r) => {
    r.updatedAt = Date.now();
    if (r.completo) {
      r.metaSynced = false;
      r.syncStatus = 'pendente';
    }
  };

  if (acao.origem === 'Inspeção') {
    const insp = await DB.getInspection(acao.registroId);
    if (!insp) return;
    const f = insp.data.fechamento;
    if (acao.ref === 'fechamento') {
      if ('responsavel' in campos) f.responsavelAcao = campos.responsavel;
      if ('prazo' in campos) f.prazo = campos.prazo;
      if ('status' in campos) f.statusAcao = campos.status;
    } else {
      const item = insp.data.checklist.find((i) => i.id === acao.ref);
      if (!item) return;
      if ('responsavel' in campos) item.responsavelAcao = campos.responsavel;
      if ('prazo' in campos) item.prazoAcao = campos.prazo;
      if ('status' in campos) item.statusAcao = campos.status;
    }
    marcarPendente(insp);
    await DB.putInspection(insp);
  } else if (acao.origem === 'Investigação') {
    const inv = await DB.getInvestigacao(acao.registroId);
    const a = inv && inv.data.planoAcao.find((x) => x.id === acao.ref);
    if (!a) return;
    Object.assign(a, campos);
    marcarPendente(inv);
    await DB.putInvestigacao(inv);
  } else if (acao.origem === 'PGR') {
    const pgr = await DB.getPGR(acao.registroId);
    const p = pgr && pgr.data.perigos.find((x) => x.id === acao.ref);
    if (!p) return;
    Object.assign(p, campos);
    marcarPendente(pgr);
    await DB.putPGR(pgr);
  } else if (acao.origem === 'Relato') {
    const r = await DB.getRelato(acao.registroId);
    if (!r) return;
    Object.assign(r.data.tratamento, campos);
    marcarPendente(r);
    await DB.putRelato(r);
  } else if (acao.origem === 'Observação') {
    const o = await DB.getItem('observacoes', acao.registroId);
    if (!o) return;
    Object.assign(o.data.tratamento, campos);
    marcarPendente(o);
    o.updatedAt = Date.now();
    await DB.putItem('observacoes', o);
  } else if (acao.origem === 'Avulsa') {
    const a = await DB.getAcao(acao.registroId);
    if (!a) return;
    Object.assign(a, campos);
    a.updatedAt = Date.now();
    a.syncStatus = 'pendente';
    await DB.putAcao(a);
  }
  Object.assign(acao, campos);
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
    if (filtro.origem && filtro.origem !== 'Todas' && a.origem !== filtro.origem) return false;
    if (termo) {
      const alvo = [a.descricao, a.contexto, a.responsavel, a.empresa, a.area].join(' ').toLowerCase();
      if (!alvo.includes(termo)) return false;
    }
    return true;
  }).sort((x, y) => {
    const ox = ORDEM_SITUACAO[situacaoAcao(x).chave];
    const oy = ORDEM_SITUACAO[situacaoAcao(y).chave];
    if (ox !== oy) return ox - oy;
    return (x.prazo || '9999').localeCompare(y.prazo || '9999');
  });
}

/* ---------------- TELA PRINCIPAL ---------------- */

const LIMITE_ACOES_TELA = 150;

async function renderAcoesHome() {
  state.screen = 'acoes-home';
  setActiveTab('acoes');
  if (!state.filtroAcoes) state.filtroAcoes = { situacao: 'abertas', origem: 'Todas', busca: '' };
  const filtro = state.filtroAcoes;
  const todas = await coletarAcoes();

  const conta = (chave) => todas.filter((a) => situacaoAcao(a).chave === chave).length;
  const abertas = todas.filter((a) => a.status !== 'Concluída').length;
  const origens = ['Todas', 'Inspeção', 'Investigação', 'PGR', 'Relato', 'Observação', 'Avulsa'];

  view.innerHTML = `
    <div class="screen-header">
      <h1>Central de ações</h1>
      <button id="btn-nova-acao" class="btn-primary">+ Nova ação</button>
    </div>
    <div class="kpi-grid kpi-grid-4">
      <button type="button" class="kpi kpi-clicavel" data-sit="abertas"><span class="kpi-valor">${abertas}</span><span class="kpi-rotulo">Abertas</span></button>
      <button type="button" class="kpi kpi-clicavel kpi-alerta" data-sit="atrasadas"><span class="kpi-valor">${conta('atrasada')}</span><span class="kpi-rotulo">Atrasadas</span></button>
      <button type="button" class="kpi kpi-clicavel kpi-atencao" data-sit="embreve"><span class="kpi-valor">${conta('embreve')}</span><span class="kpi-rotulo">Vencem em 7 dias</span></button>
      <button type="button" class="kpi kpi-clicavel kpi-ok" data-sit="concluidas"><span class="kpi-valor">${conta('concluida')}</span><span class="kpi-rotulo">Concluídas</span></button>
    </div>
    <div class="filtros-acoes">
      <select id="filtro-situacao">
        <option value="abertas" ${filtro.situacao === 'abertas' ? 'selected' : ''}>Abertas</option>
        <option value="atrasadas" ${filtro.situacao === 'atrasadas' ? 'selected' : ''}>Atrasadas</option>
        <option value="embreve" ${filtro.situacao === 'embreve' ? 'selected' : ''}>Vencem em 7 dias</option>
        <option value="concluidas" ${filtro.situacao === 'concluidas' ? 'selected' : ''}>Concluídas</option>
        <option value="todas" ${filtro.situacao === 'todas' ? 'selected' : ''}>Todas</option>
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
         <ul class="insp-list">${mostradas.map((a, idx) => cardAcao(a, idx)).join('')}</ul>`
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
      card.querySelector('.in-acao-status').addEventListener('change', (e) => salvar({ status: e.target.value }));
      card.querySelector('.btn-abrir-origem').addEventListener('click', () => abrirOrigemAcao(a));
    });
  }
  desenharLista();

  document.getElementById('btn-nova-acao').addEventListener('click', () => renderAcaoAvulsaForm(null));
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

function cardAcao(a, idx) {
  const sit = situacaoAcao(a);
  return `
    <li class="acao-card" data-idx="${idx}">
      <div class="acao-topo">
        <span class="badge badge-origem">${escapeHtml(a.origem)}</span>
        <span class="badge ${sit.cls}">${sit.text}</span>
      </div>
      <div class="insp-card-title">${escapeHtml(a.descricao)}</div>
      <div class="insp-card-sub">${escapeHtml(a.contexto)}</div>
      <div class="participante-linha">
        <label class="campo-leitura">Responsável
          <input type="text" class="in-acao-responsavel" value="${escapeHtml(a.responsavel || '')}">
        </label>
        <label class="campo-leitura">Prazo
          <input type="date" class="in-acao-prazo" value="${escapeHtml(a.prazo || '')}">
        </label>
        <label class="campo-leitura">Status
          <select class="in-acao-status">${STATUS_ACAO.map((s) => `<option ${a.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
        </label>
      </div>
      <button type="button" class="btn-link btn-abrir-origem">Abrir ${a.origem === 'Avulsa' ? 'ação' : 'registro de origem'} →</button>
    </li>
  `;
}

/** Texto curto, pronto para colar no WhatsApp ou no e-mail. */
function textoListaAcoes(acoes) {
  const LIMITE = 40;
  const linhas = acoes.slice(0, LIMITE).map((a, i) => {
    const sit = situacaoAcao(a);
    const prazo = a.prazo ? formatarDataBR(a.prazo) : 'sem prazo';
    return `${i + 1}. ${a.descricao}\n   Origem: ${a.origem} — ${a.contexto}\n   Responsável: ${a.responsavel || 'não definido'} · Prazo: ${prazo} · ${sit.text}`;
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
