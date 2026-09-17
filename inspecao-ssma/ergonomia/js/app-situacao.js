/* Situação de trabalho: caracterização (prescrito, real, evidências) e AEPs vinculadas. */

async function obterEstabIdDaAtividade(atividadeId) {
  const atividade = await DB.atividades.get(atividadeId);
  const funcao = await DB.funcoes.get(atividade.funcaoId);
  const setor = await DB.setores.get(funcao.setorId);
  const processo = await DB.processos.get(setor.processoId);
  return processo.estabelecimentoId;
}

async function renderSituacoesLista(atividadeId, orgId, estabId) {
  if (!estabId) estabId = await obterEstabIdDaAtividade(atividadeId);
  state.screen = 'situacoes-lista';
  SCREEN_RENDERERS['situacoes-lista'] = () => renderSituacoesLista(atividadeId, orgId, estabId);
  const atividade = await DB.atividades.get(atividadeId);
  const situacoes = await DB.situacoes.byIndex('atividadeId', atividadeId);
  view.innerHTML = `
    ${menuTopo(orgId)}
    <div class="screen-header"><button id="btn-voltar" class="btn-link">← Voltar</button><h1>${escapeHtml(atividade.descricao)}</h1></div>
    <div class="screen-header"><h2>Situações de trabalho</h2><button id="btn-nova-situacao" class="btn-primary">+ Nova situação</button></div>
    <ul class="insp-list">${situacoes.length ? situacoes.map((s) => `
      <li class="insp-card" data-id="${s.id}">
        <div class="insp-card-main"><div class="insp-card-title">${escapeHtml(s.cargo || 'Situação de trabalho')}</div><div class="insp-card-sub">${escapeHtml(s.local || '')}</div></div>
      </li>`).join('') : '<li class="empty-state">Nenhuma situação registrada.</li>'}</ul>`;
  ligarMenuTopo();
  document.getElementById('btn-voltar').addEventListener('click', () => renderEstrutura(estabId, orgId));
  document.getElementById('btn-nova-situacao').addEventListener('click', () => renderSituacaoForm(atividadeId, orgId, null, estabId));
  view.querySelectorAll('.insp-card').forEach((el) => el.addEventListener('click', () => renderSituacaoDetalhe(el.dataset.id, orgId, estabId)));
}

const SITUACAO_SCHEMA_ID = [
  { name: 'local', label: 'Local', required: true },
  { name: 'cargo', label: 'Cargo', required: true },
  { name: 'numTrabalhadores', label: 'Número de trabalhadores', type: 'number' },
  { name: 'caracteristicasAntropometricas', label: 'Características relevantes (sem dados pessoais sensíveis)', type: 'textarea' },
  { name: 'jornada', label: 'Jornada' },
  { name: 'turnos', label: 'Turnos' },
  { name: 'tempoNaFuncao', label: 'Tempo na função' },
  { name: 'tempoDiarioExposicao', label: 'Tempo diário de exposição' }
];
const SITUACAO_SCHEMA_PRESCRITO = [
  { name: 'procedimentos', label: 'Procedimentos', type: 'textarea' },
  { name: 'metas', label: 'Metas e regras', type: 'textarea' },
  { name: 'sequenciaPrevista', label: 'Sequência prevista', type: 'textarea' },
  { name: 'equipamentosObrigatorios', label: 'Equipamentos obrigatórios', type: 'textarea' },
  { name: 'tempoPlanejado', label: 'Tempo planejado' }
];
const SITUACAO_SCHEMA_REAL = [
  { name: 'comoExecutadoRealmente', label: 'Como a atividade é realmente executada', type: 'textarea' },
  { name: 'variacoesProducao', label: 'Variações da produção', type: 'textarea' },
  { name: 'dificuldades', label: 'Dificuldades / interrupções / retrabalhos', type: 'textarea' },
  { name: 'improvisacoes', label: 'Improvisações e falhas de equipamento', type: 'textarea' },
  { name: 'estrategiasTrabalhadores', label: 'Estratégias utilizadas pelos trabalhadores', type: 'textarea' },
  { name: 'diferencasTurnos', label: 'Diferenças entre turnos', type: 'textarea' }
];
const SITUACAO_SCHEMA_PARTICIPACAO = [
  { name: 'trabalhadoresParticiparam', label: 'Os trabalhadores foram ouvidos nesta avaliação?', type: 'radio', options: ['Sim', 'Não'], required: true, hint: 'Exigido pela NR-17, item 17.3.8' },
  { name: 'entrevistasManifestacoes', label: 'Entrevistas / manifestações dos trabalhadores', type: 'textarea' },
  { name: 'croquisMedicoes', label: 'Croquis e medições realizadas', type: 'textarea' }
];

async function renderSituacaoForm(atividadeId, orgId, situacao, estabId) {
  if (!estabId) estabId = await obterEstabIdDaAtividade(atividadeId);
  state.screen = 'situacao-form';
  view.innerHTML = `
    ${menuTopo(orgId)}
    <div class="screen-header"><button id="btn-voltar" class="btn-link">← Voltar</button><h1>${situacao ? 'Editar' : 'Nova'} situação de trabalho</h1></div>
    <form id="form-situacao" class="form-section">
      <h3>Identificação</h3>${renderFormFields(SITUACAO_SCHEMA_ID, situacao)}
      <h3>Trabalho prescrito</h3>${renderFormFields(SITUACAO_SCHEMA_PRESCRITO, situacao)}
      <h3>Trabalho real</h3>${renderFormFields(SITUACAO_SCHEMA_REAL, situacao)}
      <h3>Participação e evidências</h3>${renderFormFields(SITUACAO_SCHEMA_PARTICIPACAO, situacao)}
      <label class="file-label">Adicionar fotos / evidências<input type="file" accept="image/*" multiple id="input-foto-situacao"></label>
      <div class="thumbs" id="thumbs-situacao"></div>
      <div class="form-actions"><button type="submit" class="btn-primary">Salvar situação</button></div>
    </form>`;
  ligarMenuTopo();
  const fotoIds = (situacao && situacao.fotoIds) ? situacao.fotoIds.slice() : [];
  renderThumbsGaleria(document.getElementById('thumbs-situacao'), fotoIds);
  document.getElementById('btn-voltar').addEventListener('click', () => renderSituacoesLista(atividadeId, orgId, estabId));
  document.getElementById('input-foto-situacao').addEventListener('change', async (e) => {
    await adicionarFotos('situacao', situacao ? situacao.id : 'temp', fotoIds, e.target.files);
    renderThumbsGaleria(document.getElementById('thumbs-situacao'), fotoIds);
  });
  document.getElementById('form-situacao').addEventListener('submit', async (e) => {
    e.preventDefault();
    const todosSchemas = [...SITUACAO_SCHEMA_ID, ...SITUACAO_SCHEMA_PRESCRITO, ...SITUACAO_SCHEMA_REAL, ...SITUACAO_SCHEMA_PARTICIPACAO];
    const dados = lerFormFields(e.target, todosSchemas);
    const id = situacao ? situacao.id : uuid();
    if (!situacao) {
      for (const fid of fotoIds) {
        const f = await DB.fotos.get(fid);
        if (f && f.refId === 'temp') { f.refId = id; await DB.fotos.put(f); }
      }
    }
    const registro = Object.assign({}, situacao, dados, {
      id, atividadeId, fotoIds, synced: false,
      createdAt: situacao ? situacao.createdAt : Date.now(), updatedAt: Date.now()
    });
    await DB.situacoes.put(registro);
    await registrarAuditoria('situacao', id, situacao ? 'edicao' : 'criacao', registro.cargo);
    Sync.syncAll().catch(() => {});
    renderSituacaoDetalhe(id, orgId, estabId);
  });
}

async function renderSituacaoDetalhe(situacaoId, orgId, estabId) {
  state.screen = 'situacao-detalhe';
  SCREEN_RENDERERS['situacao-detalhe'] = () => renderSituacaoDetalhe(situacaoId, orgId, estabId);
  const situacao = await DB.situacoes.get(situacaoId);
  const aeps = await DB.aep.byIndex('situacaoId', situacaoId);

  view.innerHTML = `
    ${menuTopo(orgId)}
    <div class="screen-header"><button id="btn-voltar" class="btn-link">← Voltar</button><h1>${escapeHtml(situacao.cargo)} — ${escapeHtml(situacao.local)}</h1></div>
    <div class="detail-block">
      <p>Trabalhadores: ${escapeHtml(situacao.numTrabalhadores || '—')} · Jornada: ${escapeHtml(situacao.jornada || '—')} · Turnos: ${escapeHtml(situacao.turnos || '—')}</p>
      <p>Trabalhadores ouvidos na avaliação: <strong>${escapeHtml(situacao.trabalhadoresParticiparam || '—')}</strong></p>
    </div>
    <div class="form-actions">
      <button id="btn-editar-situacao" class="btn-secondary">Editar situação</button>
    </div>
    <div class="screen-header"><h2>Avaliações Ergonômicas Preliminares (AEP)</h2><button id="btn-nova-aep" class="btn-primary">+ Nova AEP</button></div>
    <ul class="insp-list">${aeps.length ? aeps.map((a) => `
      <li class="insp-card" data-id="${a.id}">
        <div class="insp-card-main"><div class="insp-card-title">AEP de ${fmtDataHora(a.createdAt)}</div><div class="insp-card-sub">${a.fatores ? a.fatores.length : 0} fator(es) identificado(s)${a.necessitaAET ? ' · Necessita AET' : ''}</div></div>
        <div class="insp-card-side"><span class="badge ${a.necessitaAET ? 'badge-erro' : 'badge-ok'}">${a.necessitaAET ? 'AET necessária' : 'Concluída'}</span></div>
      </li>`).join('') : '<li class="empty-state">Nenhuma AEP realizada ainda para esta situação.</li>'}</ul>`;
  ligarMenuTopo();
  document.getElementById('btn-voltar').addEventListener('click', () => renderSituacoesLista(situacao.atividadeId, orgId, estabId));
  document.getElementById('btn-editar-situacao').addEventListener('click', () => renderSituacaoForm(situacao.atividadeId, orgId, situacao, estabId));
  document.getElementById('btn-nova-aep').addEventListener('click', () => iniciarNovaAEP(situacaoId, orgId));
  view.querySelectorAll('.insp-card').forEach((el) => el.addEventListener('click', () => renderAepResultado(el.dataset.id, orgId)));
}
