/* App de Gestão Ergonômica integrada ao PGR — interface e navegação. */

const state = { screen: 'home' };
const view = document.getElementById('view');
const connStatusEl = document.getElementById('conn-status');
const syncBarEl = document.getElementById('sync-bar');

function updateConnBadge() {
  const online = navigator.onLine;
  connStatusEl.textContent = online ? 'Online' : 'Offline';
  connStatusEl.className = online ? 'conn conn-online' : 'conn conn-offline';
}

async function contarPendentesSync() {
  let n = 0;
  for (const tipo of ENTIDADES_SYNC) {
    const all = await DB[tipo].getAll();
    n += all.filter((i) => !i.synced).length;
  }
  const fotos = await DB.fotos.getAll();
  n += fotos.filter((f) => !f.synced).length;
  return n;
}

async function updateSyncBar() {
  const n = await contarPendentesSync();
  if (n === 0) { syncBarEl.hidden = true; return; }
  syncBarEl.hidden = false;
  const online = navigator.onLine;
  syncBarEl.innerHTML = `<span>${n} registro(s) aguardando sincronização${online ? '' : ' (offline)'}</span>
    <button id="btn-sync-now" ${online ? '' : 'disabled'}>Sincronizar agora</button>`;
  const btn = document.getElementById('btn-sync-now');
  if (btn) btn.addEventListener('click', async () => {
    btn.disabled = true; btn.textContent = 'Sincronizando…';
    try { await Sync.syncAll(); } catch (e) {}
    await refreshChrome();
    rerenderCurrentScreen();
  });
}

async function refreshChrome() { updateConnBadge(); await updateSyncBar(); }
window.addEventListener('online', refreshChrome);
window.addEventListener('offline', refreshChrome);
Sync.onChange(refreshChrome);

function rerenderCurrentScreen() {
  const fn = SCREEN_RENDERERS[state.screen];
  if (fn) fn();
}

const SCREEN_RENDERERS = {};

/* ---------------- Perfil / cabeçalho ---------------- */

async function getPerfilAtual() {
  return (await DB.getSetting('perfilAtual')) || { nome: '', papel: 'Avaliador ergonômico' };
}

function menuTopo(ativoOrgId) {
  return `
    <nav class="menu-topo no-print">
      <button class="mt-item" data-nav="home">Organizações</button>
      ${ativoOrgId ? `
        <button class="mt-item" data-nav="pgr-lista" data-org="${ativoOrgId}">PGR</button>
        <button class="mt-item" data-nav="planos-lista" data-org="${ativoOrgId}">Plano de ação</button>
        <button class="mt-item" data-nav="correlacao-lista" data-org="${ativoOrgId}">Correlação</button>
        <button class="mt-item" data-nav="aprovacoes" data-org="${ativoOrgId}">Aprovações</button>
      ` : ''}
      <button class="mt-item" data-nav="config">Configurações</button>
      <button class="mt-item" data-nav="auditoria">Auditoria</button>
    </nav>`;
}

function ligarMenuTopo() {
  document.querySelectorAll('.mt-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nav = btn.dataset.nav;
      const org = btn.dataset.org;
      if (nav === 'home') renderHome();
      else if (nav === 'config') renderConfig();
      else if (nav === 'auditoria') renderAuditoria();
      else if (nav === 'pgr-lista') renderPgrLista(org);
      else if (nav === 'planos-lista') renderPlanosLista(org);
      else if (nav === 'correlacao-lista') renderCorrelacaoLista(org);
      else if (nav === 'aprovacoes') renderAprovacoes(org);
    });
  });
}

/* ==================================================================
   HOME — Organizações
   ================================================================== */

async function renderHome() {
  state.screen = 'home'; state.orgId = null;
  SCREEN_RENDERERS.home = renderHome;
  const orgs = await DB.organizacoes.getAll();
  view.innerHTML = `
    ${menuTopo(null)}
    <div class="screen-header">
      <h1>Organizações</h1>
      <button id="btn-nova-org" class="btn-primary">+ Nova organização</button>
    </div>
    <ul class="insp-list">
      ${orgs.length ? orgs.map((o) => `
        <li class="insp-card" data-id="${o.id}">
          <div class="insp-card-main">
            <div class="insp-card-title">${escapeHtml(o.razaoSocial)}</div>
            <div class="insp-card-sub">${escapeHtml(o.cnpj || '')} · Responsável PGR: ${escapeHtml(o.responsavelPGR || '—')}</div>
          </div>
          <div class="insp-card-side"><button type="button" class="btn-excluir-card" data-id="${o.id}" title="Excluir">🗑</button></div>
        </li>`).join('') : '<li class="empty-state">Nenhuma organização cadastrada. Toque em "+ Nova organização".</li>'}
    </ul>`;
  ligarMenuTopo();
  document.getElementById('btn-nova-org').addEventListener('click', () => renderOrgForm());
  view.querySelectorAll('.insp-card').forEach((el) => el.addEventListener('click', (e) => {
    if (e.target.closest('.btn-excluir-card')) return;
    renderOrgPainel(el.dataset.id);
  }));
  view.querySelectorAll('.btn-excluir-card').forEach((btn) => btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!confirm('Excluir esta organização e toda a sua estrutura (estabelecimentos, PGR, AEP, AET, planos)? Esta ação não pode ser desfeita.')) return;
    await excluirOrganizacaoCompleta(btn.dataset.id);
    renderHome();
  }));
}
SCREEN_RENDERERS.home = renderHome;

async function excluirOrganizacaoCompleta(orgId) {
  const estabs = await DB.estabelecimentos.byIndex('organizacaoId', orgId);
  for (const e of estabs) await DB.estabelecimentos.delete(e.id);
  const riscos = await DB.riscos.byIndex('organizacaoId', orgId);
  for (const r of riscos) await DB.riscos.delete(r.id);
  const planos = await DB.planos.byIndex('organizacaoId', orgId);
  for (const p of planos) await DB.planos.delete(p.id);
  await DB.organizacoes.delete(orgId);
  await registrarAuditoria('organizacao', orgId, 'exclusao', '');
}

const ORG_SCHEMA = [
  { name: 'razaoSocial', label: 'Razão social', required: true },
  { name: 'nomeFantasia', label: 'Nome fantasia' },
  { name: 'cnpj', label: 'CNPJ', required: true },
  { name: 'cnaePrincipal', label: 'CNAE principal' },
  { name: 'cnaesSecundarios', label: 'CNAEs secundários', hint: 'separe por vírgula' },
  { name: 'grauRisco', label: 'Grau de risco', type: 'select', options: ['1', '2', '3', '4'] },
  { name: 'numTrabalhadores', label: 'Número de trabalhadores', type: 'number' },
  { name: 'turnosJornadas', label: 'Turnos e jornadas' },
  { name: 'responsavelLegal', label: 'Responsável legal' },
  { name: 'responsavelPGR', label: 'Responsável pelo PGR', required: true },
  { name: 'responsavelTecnico', label: 'Responsável técnico pela avaliação' },
  { name: 'profissionaisParticipantes', label: 'Profissionais participantes', type: 'textarea' },
  { name: 'temCipa', label: 'Possui CIPA?', type: 'radio', options: ['Sim', 'Não'] },
  { name: 'empresasContratadas', label: 'Empresas contratadas que atuam no local', type: 'textarea' }
];

function renderOrgForm(org) {
  state.screen = 'org-form';
  view.innerHTML = `
    ${menuTopo(null)}
    <div class="screen-header"><button id="btn-voltar" class="btn-link">← Voltar</button><h1>${org ? 'Editar' : 'Nova'} organização</h1></div>
    <form id="form-org" class="form-section">
      ${renderFormFields(ORG_SCHEMA, org)}
      <div class="form-actions"><button type="submit" class="btn-primary">Salvar</button></div>
    </form>`;
  ligarMenuTopo();
  document.getElementById('btn-voltar').addEventListener('click', renderHome);
  document.getElementById('form-org').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = lerFormFields(e.target, ORG_SCHEMA);
    const registro = Object.assign({}, org, dados, {
      id: org ? org.id : uuid(),
      synced: false,
      createdAt: org ? org.createdAt : Date.now(),
      updatedAt: Date.now()
    });
    await DB.organizacoes.put(registro);
    await registrarAuditoria('organizacao', registro.id, org ? 'edicao' : 'criacao', registro.razaoSocial);
    Sync.syncAll().catch(() => {});
    renderOrgPainel(registro.id);
  });
}

async function renderOrgPainel(orgId) {
  state.screen = 'org-painel'; state.orgId = orgId;
  SCREEN_RENDERERS['org-painel'] = () => renderOrgPainel(orgId);
  const org = await DB.organizacoes.get(orgId);
  const estabs = await DB.estabelecimentos.byIndex('organizacaoId', orgId);
  const riscos = await DB.riscos.byIndex('organizacaoId', orgId);
  const planos = await DB.planos.byIndex('organizacaoId', orgId);
  const planosAbertos = planos.filter((p) => p.status !== 'Concluída' && p.status !== 'Verificada').length;

  view.innerHTML = `
    ${menuTopo(orgId)}
    <div class="screen-header"><button id="btn-voltar" class="btn-link">← Voltar</button><h1>${escapeHtml(org.razaoSocial)}</h1></div>
    <div class="resumo">
      <p>${escapeHtml(org.cnpj || '')} · Grau de risco ${escapeHtml(org.grauRisco || '—')} · Responsável PGR: ${escapeHtml(org.responsavelPGR || '—')}</p>
      <ul class="resumo-stats">
        <li>Estabelecimentos: ${estabs.length}</li>
        <li>Riscos no inventário PGR: ${riscos.length}</li>
        <li>Planos de ação em aberto: ${planosAbertos}</li>
      </ul>
    </div>
    <div class="form-actions">
      <button id="btn-editar-org" class="btn-secondary">Editar dados</button>
      <button id="btn-relatorios" class="btn-secondary">Relatórios</button>
    </div>
    <div class="screen-header"><h2>Estabelecimentos</h2><button id="btn-novo-estab" class="btn-primary">+ Novo estabelecimento</button></div>
    <ul class="insp-list">
      ${estabs.length ? estabs.map((e) => `
        <li class="insp-card" data-id="${e.id}">
          <div class="insp-card-main"><div class="insp-card-title">${escapeHtml(e.nome)}</div><div class="insp-card-sub">${escapeHtml(e.endereco || '')}</div></div>
        </li>`).join('') : '<li class="empty-state">Nenhum estabelecimento cadastrado.</li>'}
    </ul>`;
  ligarMenuTopo();
  document.getElementById('btn-voltar').addEventListener('click', renderHome);
  document.getElementById('btn-editar-org').addEventListener('click', () => renderOrgForm(org));
  document.getElementById('btn-relatorios').addEventListener('click', () => renderRelatorios(orgId));
  document.getElementById('btn-novo-estab').addEventListener('click', () => renderEstabForm(orgId));
  view.querySelectorAll('.insp-card').forEach((el) => el.addEventListener('click', () => renderEstrutura(el.dataset.id, orgId)));
}

const ESTAB_SCHEMA = [
  { name: 'nome', label: 'Nome do estabelecimento / unidade', required: true },
  { name: 'endereco', label: 'Endereço' },
  { name: 'numTrabalhadores', label: 'Número de trabalhadores', type: 'number' },
  { name: 'turnos', label: 'Turnos' }
];

function renderEstabForm(orgId, estab) {
  state.screen = 'estab-form';
  view.innerHTML = `
    ${menuTopo(orgId)}
    <div class="screen-header"><button id="btn-voltar" class="btn-link">← Voltar</button><h1>${estab ? 'Editar' : 'Novo'} estabelecimento</h1></div>
    <form id="form-estab" class="form-section">
      ${renderFormFields(ESTAB_SCHEMA, estab)}
      <div class="form-actions"><button type="submit" class="btn-primary">Salvar</button></div>
    </form>`;
  ligarMenuTopo();
  document.getElementById('btn-voltar').addEventListener('click', () => renderOrgPainel(orgId));
  document.getElementById('form-estab').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = lerFormFields(e.target, ESTAB_SCHEMA);
    const registro = Object.assign({}, estab, dados, {
      id: estab ? estab.id : uuid(), organizacaoId: orgId, synced: false,
      createdAt: estab ? estab.createdAt : Date.now(), updatedAt: Date.now()
    });
    await DB.estabelecimentos.put(registro);
    await registrarAuditoria('estabelecimento', registro.id, estab ? 'edicao' : 'criacao', registro.nome);
    Sync.syncAll().catch(() => {});
    renderEstrutura(registro.id, orgId);
  });
}

/* ==================================================================
   ESTRUTURA OPERACIONAL — Processo > Setor > Função > Atividade
   ================================================================== */

async function renderEstrutura(estabId, orgId) {
  state.screen = 'estrutura';
  SCREEN_RENDERERS.estrutura = () => renderEstrutura(estabId, orgId);
  const estab = await DB.estabelecimentos.get(estabId);
  const processos = await DB.processos.byIndex('estabelecimentoId', estabId);

  view.innerHTML = `
    ${menuTopo(orgId)}
    <div class="screen-header"><button id="btn-voltar" class="btn-link">← Voltar</button><h1>${escapeHtml(estab.nome)}</h1></div>
    <p class="hint">Estrutura operacional: processo → setor → função → atividade → situação de trabalho.</p>
    <div id="col-processos"></div>`;
  ligarMenuTopo();
  document.getElementById('btn-voltar').addEventListener('click', () => renderOrgPainel(orgId));

  renderNivelEstrutura({
    container: document.getElementById('col-processos'),
    titulo: 'Processos', singular: 'processo', store: 'processos', parentField: 'estabelecimentoId', parentId: estabId,
    itens: processos,
    onSelecionar: (processo) => renderNivelSetor(processo, orgId, estabId)
  });
}

function cardNivel(item, nomeCampo) {
  return `<li class="insp-card" data-id="${item.id}"><div class="insp-card-main"><div class="insp-card-title">${escapeHtml(item[nomeCampo])}</div></div>
    <div class="insp-card-side"><button type="button" class="btn-excluir-card" data-id="${item.id}" title="Excluir">🗑</button></div></li>`;
}

function renderNivelEstrutura(cfg) {
  const { container, titulo, singular, store, parentField, parentId, itens, onSelecionar, campo = 'nome' } = cfg;
  container.innerHTML = `
    <div class="screen-header"><h2>${titulo}</h2><button class="btn-secondary btn-add-nivel">+ Adicionar</button></div>
    <ul class="insp-list">${itens.length ? itens.map((i) => cardNivel(i, campo)).join('') : '<li class="empty-state">Nenhum registrado.</li>'}</ul>
    <div id="sub-nivel"></div>`;

  container.querySelector('.btn-add-nivel').addEventListener('click', async () => {
    const nome = prompt(`Nome ${singular || titulo.slice(0, -1).toLowerCase()}:`);
    if (!nome || !nome.trim()) return;
    const registro = { id: uuid(), [parentField]: parentId, [campo]: nome.trim(), synced: false, createdAt: Date.now() };
    await DB[store].put(registro);
    await registrarAuditoria(store, registro.id, 'criacao', nome.trim());
    Sync.syncAll().catch(() => {});
    const atualizados = await DB[store].byIndex(parentField, parentId);
    renderNivelEstrutura(Object.assign({}, cfg, { itens: atualizados }));
  });

  container.querySelectorAll('.btn-excluir-card').forEach((btn) => btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!confirm('Excluir este item e tudo que está abaixo dele na estrutura?')) return;
    await DB[store].delete(btn.dataset.id);
    const atualizados = await DB[store].byIndex(parentField, parentId);
    renderNivelEstrutura(Object.assign({}, cfg, { itens: atualizados }));
  }));

  container.querySelectorAll('.insp-card').forEach((el) => el.addEventListener('click', (e) => {
    if (e.target.closest('.btn-excluir-card')) return;
    const item = itens.find((i) => i.id === el.dataset.id);
    onSelecionar(item);
  }));
}

async function renderNivelSetor(processo, orgId, estabId) {
  const sub = document.getElementById('sub-nivel');
  const setores = await DB.setores.byIndex('processoId', processo.id);
  sub.innerHTML = '<div id="col-setores"></div>';
  renderNivelEstrutura({
    container: document.getElementById('col-setores'),
    titulo: 'Setores', singular: 'setor', store: 'setores', parentField: 'processoId', parentId: processo.id,
    itens: setores,
    onSelecionar: (setor) => renderNivelFuncao(setor, orgId, estabId)
  });
}

async function renderNivelFuncao(setor, orgId, estabId) {
  const sub = document.querySelector('#col-setores #sub-nivel');
  const funcoes = await DB.funcoes.byIndex('setorId', setor.id);
  sub.innerHTML = '<div id="col-funcoes"></div>';
  renderNivelEstrutura({
    container: document.getElementById('col-funcoes'),
    titulo: 'Funções', singular: 'função', store: 'funcoes', parentField: 'setorId', parentId: setor.id,
    itens: funcoes,
    onSelecionar: (funcao) => renderNivelAtividade(funcao, orgId, estabId)
  });
}

async function renderNivelAtividade(funcao, orgId, estabId) {
  const sub = document.querySelector('#col-funcoes #sub-nivel');
  const atividades = await DB.atividades.byIndex('funcaoId', funcao.id);
  sub.innerHTML = '<div id="col-atividades"></div>';
  renderNivelEstrutura({
    container: document.getElementById('col-atividades'),
    titulo: 'Atividades', singular: 'atividade', store: 'atividades', parentField: 'funcaoId', parentId: funcao.id, campo: 'descricao',
    itens: atividades,
    onSelecionar: (atividade) => renderSituacoesLista(atividade.id, orgId, estabId)
  });
}

/* Continua em app-aep.js, app-aet.js, app-plano.js, app-pgr.js */
