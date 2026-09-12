/* Plano de ação: lista, formulário completo e acompanhamento de eficácia. */

const PLANO_SCHEMA = [
  { name: 'descricaoMedida', label: 'Descrição da medida', type: 'textarea', required: true },
  { name: 'hierarquiaControle', label: 'Hierarquia do controle', type: 'select', options: HIERARQUIA_CONTROLE.map((h) => h.nome) },
  { name: 'prioridade', label: 'Prioridade', type: 'select', options: ['Baixa', 'Média', 'Alta', 'Crítica'] },
  { name: 'trabalhadoresAtingidos', label: 'Trabalhadores possivelmente atingidos', type: 'number' },
  { name: 'responsavel', label: 'Responsável' },
  { name: 'setorResponsavel', label: 'Setor responsável' },
  { name: 'dataAbertura', label: 'Data de abertura', type: 'date' },
  { name: 'dataInicio', label: 'Data de início', type: 'date' },
  { name: 'prazo', label: 'Prazo', type: 'date' },
  { name: 'recursos', label: 'Recursos necessários', type: 'textarea' },
  { name: 'indicador', label: 'Indicador de acompanhamento' },
  { name: 'status', label: 'Status', type: 'select', options: ['Aberta', 'Em andamento', 'Concluída', 'Verificada'] },
  { name: 'percentualExecucao', label: '% de execução', type: 'number' },
  { name: 'dataConclusao', label: 'Data de conclusão', type: 'date' },
  { name: 'responsavelVerificacao', label: 'Responsável pela verificação' },
  { name: 'avaliacaoEficacia', label: 'Avaliação de eficácia', type: 'select', options: ['A avaliar', 'Eficaz', 'Parcialmente eficaz', 'Ineficaz'] },
  { name: 'riscoResidual', label: 'Risco residual', type: 'select', options: [] },
  { name: 'necessidadeNovaAvaliacao', label: 'Necessita nova avaliação?', type: 'radio', options: ['Sim', 'Não'] }
];

function statusPlanoBadge(plano) {
  if (plano.status === 'Concluída' || plano.status === 'Verificada') return 'badge-ok';
  if (plano.prazo && plano.prazo < new Date().toISOString().slice(0, 10)) return 'badge-erro';
  return 'badge-pendente';
}
function statusPlanoTexto(plano) {
  if (plano.status === 'Concluída' || plano.status === 'Verificada') return plano.status;
  if (plano.prazo && plano.prazo < new Date().toISOString().slice(0, 10)) return 'Em atraso';
  return plano.status || 'Aberta';
}

async function renderPlanosLista(orgId) {
  state.screen = 'planos-lista';
  SCREEN_RENDERERS['planos-lista'] = () => renderPlanosLista(orgId);
  const planos = await DB.planos.byIndex('organizacaoId', orgId);
  view.innerHTML = `
    ${menuTopo(orgId)}
    <div class="screen-header"><button id="btn-voltar" class="btn-link">← Voltar</button><h1>Plano de ação</h1></div>
    <div class="form-actions"><button id="btn-novo-plano" class="btn-primary">+ Nova ação</button></div>
    <table class="rep-table">
      <thead><tr><th>Medida</th><th>Prioridade</th><th>Responsável</th><th>Prazo</th><th>Status</th></tr></thead>
      <tbody>${planos.length ? planos.map((p) => `
        <tr data-id="${p.id}" class="linha-clicavel">
          <td>${escapeHtml((p.descricaoMedida || '').slice(0, 60))}</td>
          <td>${escapeHtml(p.prioridade || '—')}</td>
          <td>${escapeHtml(p.responsavel || '—')}</td>
          <td>${p.prazo ? fmtData(p.prazo) : '—'}</td>
          <td><span class="badge ${statusPlanoBadge(p)}">${escapeHtml(statusPlanoTexto(p))}</span></td>
        </tr>`).join('') : '<tr><td colspan="5" class="empty-state">Nenhuma ação registrada.</td></tr>'}</tbody>
    </table>`;
  ligarMenuTopo();
  document.getElementById('btn-voltar').addEventListener('click', () => renderOrgPainel(orgId));
  document.getElementById('btn-novo-plano').addEventListener('click', () => renderPlanoForm(orgId));
  view.querySelectorAll('tr[data-id]').forEach((tr) => tr.addEventListener('click', () => renderPlanoForm(orgId, planos.find((p) => p.id === tr.dataset.id))));
}

async function renderPlanoForm(orgId, plano) {
  state.screen = 'plano-form';
  const matriz = await getMatrizRisco();
  const schema = PLANO_SCHEMA.map((f) => f.name === 'riscoResidual' ? Object.assign({}, f, { options: matriz.faixas.map((fx) => fx.classificacao) }) : f);
  const codigo = (plano && plano.codigo) || `PA-${Date.now().toString(36).toUpperCase()}`;

  view.innerHTML = `
    ${menuTopo(orgId)}
    <div class="screen-header"><button id="btn-voltar" class="btn-link">← Voltar</button><h1>${plano ? 'Editar' : 'Nova'} ação — ${escapeHtml(codigo)}</h1></div>
    <form id="form-plano" class="form-section">
      ${renderFormFields(schema, plano)}
      <label class="file-label">Evidências<input type="file" accept="image/*" capture="environment" multiple id="input-foto-plano"></label>
      <div class="thumbs" id="thumbs-plano"></div>
      <div class="form-actions"><button type="submit" class="btn-primary">Salvar</button></div>
    </form>`;
  ligarMenuTopo();
  const fotoIds = (plano && plano.fotoIds) ? plano.fotoIds.slice() : [];
  renderThumbsGaleria(document.getElementById('thumbs-plano'), fotoIds);
  document.getElementById('btn-voltar').addEventListener('click', () => renderPlanosLista(orgId));
  document.getElementById('input-foto-plano').addEventListener('change', async (e) => {
    await adicionarFotos('plano', plano ? plano.id : 'temp', fotoIds, e.target.files);
    renderThumbsGaleria(document.getElementById('thumbs-plano'), fotoIds);
  });
  document.getElementById('form-plano').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = lerFormFields(e.target, schema);
    const id = plano ? plano.id : uuid();
    for (const fid of fotoIds) { const f = await DB.fotos.get(fid); if (f && f.refId === 'temp') { f.refId = id; await DB.fotos.put(f); } }
    const registro = Object.assign({}, plano, dados, { id, organizacaoId: orgId, codigo, fotoIds, synced: false, createdAt: plano ? plano.createdAt : Date.now(), updatedAt: Date.now() });
    await DB.planos.put(registro);
    await registrarAuditoria('plano', id, plano ? 'edicao' : 'criacao', registro.descricaoMedida);
    Sync.syncAll().catch(() => {});
    renderPlanosLista(orgId);
  });
}
