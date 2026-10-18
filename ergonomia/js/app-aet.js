/* Análise Ergonômica do Trabalho (AET) — 6 etapas da NR-17 + métodos ergonômicos. */

async function iniciarNovaAET(aep, situacao, orgId) {
  const perfil = await getPerfilAtual();
  const aet = {
    id: uuid(), aepId: aep.id, situacaoId: situacao.id,
    analiseDemanda: {}, analiseAtividade: {}, metodosAplicados: [], diagnostico: {}, recomendacoes: [], restituicao: {},
    responsavelTecnico: perfil.nome || '', status: 'em_andamento', synced: false, createdAt: Date.now(), updatedAt: Date.now()
  };
  await DB.aet.put(aet);
  await registrarAuditoria('aet', aet.id, 'criacao', `origem AEP ${aep.id}`);
  return aet;
}

const AET_SCHEMA_DEMANDA = [
  { name: 'origem', label: 'Origem da demanda' },
  { name: 'solicitante', label: 'Quem solicitou' },
  { name: 'problemaRelatado', label: 'Problema inicialmente relatado', type: 'textarea' },
  { name: 'dadosSaude', label: 'Dados de saúde coletivos', type: 'textarea' },
  { name: 'acidentes', label: 'Acidentes relacionados', type: 'textarea' },
  { name: 'queixas', label: 'Queixas / afastamentos', type: 'textarea' },
  { name: 'mudancasRealizadas', label: 'Mudanças já realizadas', type: 'textarea' },
  { name: 'reformulacaoDemanda', label: 'Reformulação da demanda (se necessária)', type: 'textarea' }
];
const AET_SCHEMA_ATIVIDADE = [
  { name: 'funcionamentoOrganizacao', label: 'Funcionamento da organização / processo produtivo', type: 'textarea' },
  { name: 'exigenciasFisicas', label: 'Exigências físicas', type: 'textarea' },
  { name: 'exigenciasCognitivas', label: 'Exigências cognitivas', type: 'textarea' },
  { name: 'exigenciasOrganizacionais', label: 'Exigências organizacionais', type: 'textarea' },
  { name: 'exigenciasAmbientais', label: 'Exigências ambientais', type: 'textarea' },
  { name: 'exigenciasPsicossociais', label: 'Exigências psicossociais relacionadas ao trabalho', type: 'textarea' }
];
const AET_SCHEMA_DIAGNOSTICO = [
  { name: 'situacaoAnalisada', label: 'Situação analisada', type: 'textarea' },
  { name: 'fatoresDeterminantes', label: 'Fatores determinantes', type: 'textarea' },
  { name: 'insuficienciasPosto', label: 'Insuficiências do posto', type: 'textarea' },
  { name: 'insuficienciasOrganizacionais', label: 'Insuficiências organizacionais', type: 'textarea' },
  { name: 'populacaoAtingida', label: 'População atingida' },
  { name: 'consequenciasPotenciais', label: 'Consequências potenciais', type: 'textarea' },
  { name: 'conclusaoTecnica', label: 'Conclusão técnica', type: 'textarea' }
];
const AET_SCHEMA_RESTITUICAO = [
  { name: 'participantes', label: 'Participantes da restituição' },
  { name: 'manifestacoes', label: 'Manifestações / concordâncias e divergências', type: 'textarea' },
  { name: 'testesSolucoes', label: 'Testes das soluções propostas', type: 'textarea' },
  { name: 'avaliacaoPosImplantacao', label: 'Avaliação após implantação', type: 'textarea' },
  { name: 'revisaoIntervencao', label: 'Revisão da intervenção', type: 'textarea' }
];
const RECOMENDACAO_SCHEMA = [
  { name: 'medida', label: 'Medida proposta', type: 'textarea', required: true },
  { name: 'justificativa', label: 'Justificativa', type: 'textarea' },
  { name: 'prioridade', label: 'Prioridade', type: 'select', options: ['Baixa', 'Média', 'Alta', 'Crítica'] },
  { name: 'abrangencia', label: 'Abrangência' },
  { name: 'responsavel', label: 'Responsável' },
  { name: 'prazo', label: 'Prazo', type: 'date' },
  { name: 'recursos', label: 'Recursos necessários', type: 'textarea' },
  { name: 'resultadoEsperado', label: 'Resultado esperado', type: 'textarea' },
  { name: 'indicadorEficacia', label: 'Indicador de eficácia' }
];

function renderAetForm(aetId, orgId) { _renderAetForm(aetId, orgId); }

async function _renderAetForm(aetId, orgId) {
  state.screen = 'aet-form';
  SCREEN_RENDERERS['aet-form'] = () => _renderAetForm(aetId, orgId);
  const aet = await DB.aet.get(aetId);
  const situacao = await DB.situacoes.get(aet.situacaoId);

  view.innerHTML = `
    ${menuTopo(orgId)}
    <div class="screen-header"><button id="btn-voltar" class="btn-link">← Voltar</button><h1>AET — ${escapeHtml(situacao.cargo)}</h1></div>
    <form id="form-aet-1" class="form-section"><h3>1. Análise da demanda</h3>${renderFormFields(AET_SCHEMA_DEMANDA, aet.analiseDemanda)}<div class="form-actions"><button type="submit" class="btn-secondary">Salvar</button></div></form>
    <form id="form-aet-2" class="form-section"><h3>2. Análise da organização e da atividade</h3>${renderFormFields(AET_SCHEMA_ATIVIDADE, aet.analiseAtividade)}<div class="form-actions"><button type="submit" class="btn-secondary">Salvar</button></div></form>
    <div class="form-section">
      <h3>3. Métodos aplicados</h3>
      <select id="select-metodo">${METODOS_AET_REFERENCIA.map((m) => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('')}</select>
      <button type="button" id="btn-add-metodo" class="btn-secondary">+ Adicionar método</button>
      <div id="lista-metodos"></div>
    </div>
    <form id="form-aet-4" class="form-section"><h3>4. Diagnóstico</h3>${renderFormFields(AET_SCHEMA_DIAGNOSTICO, aet.diagnostico)}<div class="form-actions"><button type="submit" class="btn-secondary">Salvar</button></div></form>
    <div class="form-section">
      <h3>5. Recomendações</h3>
      <div id="lista-recomendacoes"></div>
      <button type="button" id="btn-add-recomendacao" class="btn-secondary">+ Adicionar recomendação</button>
    </div>
    <form id="form-aet-6" class="form-section"><h3>6. Restituição e validação</h3>${renderFormFields(AET_SCHEMA_RESTITUICAO, aet.restituicao)}<div class="form-actions"><button type="submit" class="btn-secondary">Salvar</button></div></form>
    <div class="form-actions">
      <button id="btn-concluir-aet" class="btn-primary">Concluir AET</button>
      <button id="btn-relatorio-aet" class="btn-secondary">Gerar relatório da AET</button>
    </div>`;
  ligarMenuTopo();
  document.getElementById('btn-voltar').addEventListener('click', () => renderAepResultado(aet.aepId, orgId));

  document.getElementById('form-aet-1').addEventListener('submit', async (e) => { e.preventDefault(); aet.analiseDemanda = lerFormFields(e.target, AET_SCHEMA_DEMANDA); await salvarAet(aet); });
  document.getElementById('form-aet-2').addEventListener('submit', async (e) => { e.preventDefault(); aet.analiseAtividade = lerFormFields(e.target, AET_SCHEMA_ATIVIDADE); await salvarAet(aet); });
  document.getElementById('form-aet-4').addEventListener('submit', async (e) => { e.preventDefault(); aet.diagnostico = lerFormFields(e.target, AET_SCHEMA_DIAGNOSTICO); await salvarAet(aet); });
  document.getElementById('form-aet-6').addEventListener('submit', async (e) => { e.preventDefault(); aet.restituicao = lerFormFields(e.target, AET_SCHEMA_RESTITUICAO); await salvarAet(aet); });

  renderListaMetodos();
  document.getElementById('btn-add-metodo').addEventListener('click', () => {
    const metodo = document.getElementById('select-metodo').value;
    renderMetodoForm(aetId, orgId, metodo, null);
  });

  function renderListaMetodos() {
    const el = document.getElementById('lista-metodos');
    el.innerHTML = aet.metodosAplicados.length ? aet.metodosAplicados.map((m) => `
      <div class="detail-item">
        <strong>${escapeHtml(m.metodo)}</strong> — ${escapeHtml(m.resultado ? JSON.stringify(m.resultado).slice(0, 0) : '')}
        ${renderResumoResultadoMetodo(m.resultado)}
        <div class="form-actions"><button type="button" class="btn-link btn-ver-metodo" data-id="${m.id}">Ver / editar</button><button type="button" class="btn-link btn-del-metodo" data-id="${m.id}">Excluir</button></div>
      </div>`).join('') : '<p class="empty-state">Nenhum método aplicado ainda.</p>';
    el.querySelectorAll('.btn-ver-metodo').forEach((b) => b.addEventListener('click', () => {
      const m = aet.metodosAplicados.find((x) => x.id === b.dataset.id);
      renderMetodoForm(aetId, orgId, m.metodo, m.id);
    }));
    el.querySelectorAll('.btn-del-metodo').forEach((b) => b.addEventListener('click', async () => {
      aet.metodosAplicados = aet.metodosAplicados.filter((x) => x.id !== b.dataset.id);
      await salvarAet(aet, false);
      renderListaMetodos();
    }));
  }

  const listaRec = document.getElementById('lista-recomendacoes');
  function renderListaRecomendacoes() {
    listaRec.innerHTML = aet.recomendacoes.length ? aet.recomendacoes.map((r) => `
      <div class="detail-item">
        <strong>${escapeHtml(r.medida)}</strong> <span class="badge badge-pendente">${escapeHtml(r.prioridade || '—')}</span>
        <p>Responsável: ${escapeHtml(r.responsavel || '—')} · Prazo: ${r.prazo ? fmtData(r.prazo) : '—'}</p>
        <div class="form-actions"><button type="button" class="btn-link btn-editar-rec" data-id="${r.id}">Editar</button><button type="button" class="btn-link btn-excluir-rec" data-id="${r.id}">Excluir</button>
        <button type="button" class="btn-link btn-gerar-plano" data-id="${r.id}">Gerar plano de ação</button></div>
      </div>`).join('') : '<p class="empty-state">Nenhuma recomendação registrada.</p>';
    listaRec.querySelectorAll('.btn-editar-rec').forEach((b) => b.addEventListener('click', () => renderRecomendacaoForm(aetId, orgId, b.dataset.id)));
    listaRec.querySelectorAll('.btn-excluir-rec').forEach((b) => b.addEventListener('click', async () => {
      aet.recomendacoes = aet.recomendacoes.filter((r) => r.id !== b.dataset.id);
      await salvarAet(aet, false);
      renderListaRecomendacoes();
    }));
    listaRec.querySelectorAll('.btn-gerar-plano').forEach((b) => b.addEventListener('click', async () => {
      const rec = aet.recomendacoes.find((r) => r.id === b.dataset.id);
      const plano = await criarPlanoDeRecomendacao(rec, aet, situacao, orgId);
      renderPlanoForm(orgId, plano);
    }));
  }
  renderListaRecomendacoes();
  document.getElementById('btn-add-recomendacao').addEventListener('click', () => renderRecomendacaoForm(aetId, orgId, null));

  document.getElementById('btn-concluir-aet').addEventListener('click', async () => {
    aet.status = 'concluida';
    await salvarAet(aet);
    await registrarAuditoria('aet', aetId, 'conclusao', '');
    alert('AET concluída. Fica disponível permanentemente (retenção mínima de 20 anos conforme NR-17).');
    rerenderCurrentScreen();
  });
  document.getElementById('btn-relatorio-aet').addEventListener('click', () => renderRelatorioAET(aetId, orgId));
}

function renderResumoResultadoMetodo(resultado) {
  if (!resultado) return '<p class="rep-hint">Sem resultado calculado (registro descritivo).</p>';
  const chaves = Object.keys(resultado).filter((k) => k !== 'aviso' && k !== 'metodo');
  return `<p>${chaves.map((k) => `${k}: <strong>${escapeHtml(JSON.stringify(resultado[k]))}</strong>`).join(' · ')}</p><p class="rep-hint">${escapeHtml(resultado.aviso || '')}</p>`;
}

async function salvarAet(aet, sync) {
  aet.updatedAt = Date.now();
  aet.synced = false;
  await DB.aet.put(aet);
  if (sync !== false) Sync.syncAll().catch(() => {});
}

/* ---- Formulário de método (calculável ou descritivo) ---- */

const METODO_SCHEMAS = {
  'RULA': {
    numericos: ['upperArm', 'lowerArm', 'wrist', 'wristTwist', 'neck', 'trunk', 'legs', 'musculoA', 'forcaA', 'musculoB', 'forcaB'],
    schema: [
      { name: 'upperArm', label: 'Braço superior (1 a 6)', type: 'select', options: ['1', '2', '3', '4', '5', '6'] },
      { name: 'lowerArm', label: 'Antebraço (1 a 3)', type: 'select', options: ['1', '2', '3'] },
      { name: 'wrist', label: 'Punho (1 a 4)', type: 'select', options: ['1', '2', '3', '4'] },
      { name: 'wristTwist', label: 'Torção do punho', type: 'select', options: [{ value: '1', label: 'Neutro' }, { value: '2', label: 'Torcido' }] },
      { name: 'neck', label: 'Pescoço (1 a 6)', type: 'select', options: ['1', '2', '3', '4', '5', '6'] },
      { name: 'trunk', label: 'Tronco (1 a 6)', type: 'select', options: ['1', '2', '3', '4', '5', '6'] },
      { name: 'legs', label: 'Pernas', type: 'select', options: [{ value: '1', label: 'Apoiadas/equilibradas' }, { value: '2', label: 'Não apoiadas' }] },
      { name: 'musculoA', label: 'Postura estática/repetitiva (braço)', type: 'select', options: [{ value: '0', label: 'Não' }, { value: '1', label: 'Sim' }] },
      { name: 'forcaA', label: 'Carga/força (braço)', type: 'select', options: [{ value: '0', label: '<2kg intermitente' }, { value: '1', label: '2-10kg intermitente' }, { value: '2', label: '2-10kg estático/repetitivo' }, { value: '3', label: '>10kg ou choques' }] },
      { name: 'musculoB', label: 'Postura estática/repetitiva (tronco)', type: 'select', options: [{ value: '0', label: 'Não' }, { value: '1', label: 'Sim' }] },
      { name: 'forcaB', label: 'Carga/força (tronco)', type: 'select', options: [{ value: '0', label: '<2kg intermitente' }, { value: '1', label: '2-10kg intermitente' }, { value: '2', label: '2-10kg estático/repetitivo' }, { value: '3', label: '>10kg ou choques' }] }
    ],
    calc: calcularRULA
  },
  'REBA': {
    numericos: ['trunk', 'neck', 'legs', 'cargaForca', 'upperArm', 'lowerArm', 'wrist', 'pegaAcoplamento', 'atividade'],
    schema: [
      { name: 'trunk', label: 'Tronco (1 a 5)', type: 'select', options: ['1', '2', '3', '4', '5'] },
      { name: 'neck', label: 'Pescoço (1 a 3)', type: 'select', options: ['1', '2', '3'] },
      { name: 'legs', label: 'Pernas (1 a 4)', type: 'select', options: ['1', '2', '3', '4'] },
      { name: 'cargaForca', label: 'Carga/força', type: 'select', options: [{ value: '0', label: '<5kg' }, { value: '1', label: '5-10kg' }, { value: '2', label: '>10kg ou choque' }] },
      { name: 'upperArm', label: 'Braço superior (1 a 6)', type: 'select', options: ['1', '2', '3', '4', '5', '6'] },
      { name: 'lowerArm', label: 'Antebraço (1 a 2)', type: 'select', options: ['1', '2'] },
      { name: 'wrist', label: 'Punho (1 a 3)', type: 'select', options: ['1', '2', '3'] },
      { name: 'pegaAcoplamento', label: 'Pega/acoplamento', type: 'select', options: [{ value: '0', label: 'Boa' }, { value: '1', label: 'Regular' }, { value: '2', label: 'Ruim' }, { value: '3', label: 'Inaceitável' }] },
      { name: 'atividade', label: 'Pontuação de atividade (0 a 3)', type: 'select', options: ['0', '1', '2', '3'] }
    ],
    calc: calcularREBA
  },
  'Equação Revisada de NIOSH': {
    numericos: ['H', 'V', 'D', 'A', 'frequenciaPorMin', 'pesoReal'],
    schema: [
      { name: 'H', label: 'Distância horizontal da carga (cm)', type: 'number' },
      { name: 'V', label: 'Altura de pega em relação ao piso (cm)', type: 'number' },
      { name: 'D', label: 'Distância vertical de deslocamento (cm)', type: 'number' },
      { name: 'A', label: 'Ângulo de assimetria (graus)', type: 'number' },
      { name: 'frequenciaPorMin', label: 'Frequência (levantamentos/min)', type: 'number' },
      { name: 'duracao', label: 'Duração da tarefa', type: 'select', options: [{ value: 'curta', label: 'Curta (≤1h)' }, { value: 'moderada', label: 'Moderada (1-2h)' }, { value: 'longa', label: 'Longa (2-8h)' }] },
      { name: 'acoplamento', label: 'Qualidade da pega', type: 'select', options: ['boa', 'regular', 'ruim'] },
      { name: 'pesoReal', label: 'Peso real levantado (kg)', type: 'number' }
    ],
    calc: calcularNIOSH
  },
  'Strain Index': {
    numericos: [],
    schema: [
      { name: 'intensidadeEsforco', label: 'Intensidade do esforço', type: 'select', options: [{ value: 'leve', label: 'Leve' }, { value: 'algo_dificil', label: 'Um pouco difícil' }, { value: 'dificil', label: 'Difícil' }, { value: 'muito_dificil', label: 'Muito difícil' }, { value: 'quase_maximo', label: 'Próximo do máximo' }] },
      { name: 'duracaoEsforcoPct', label: 'Duração do esforço (% do ciclo)', type: 'select', options: ['<10', '10-29', '30-49', '50-79', '>=80'] },
      { name: 'esforcosPorMinuto', label: 'Esforços por minuto', type: 'select', options: ['<4', '4-8', '9-14', '15-19', '>=20'] },
      { name: 'posturaMao', label: 'Postura da mão/punho', type: 'select', options: [{ value: 'muito_boa', label: 'Muito boa' }, { value: 'boa', label: 'Boa' }, { value: 'regular', label: 'Regular' }, { value: 'ruim', label: 'Ruim' }, { value: 'muito_ruim', label: 'Muito ruim' }] },
      { name: 'velocidadeTrabalho', label: 'Velocidade de trabalho', type: 'select', options: [{ value: 'muito_lenta', label: 'Muito lenta' }, { value: 'lenta', label: 'Lenta' }, { value: 'media', label: 'Média' }, { value: 'rapida', label: 'Rápida' }, { value: 'muito_rapida', label: 'Muito rápida' }] },
      { name: 'duracaoTarefaHoras', label: 'Duração da tarefa por dia', type: 'select', options: [{ value: '<=1', label: 'Até 1h' }, { value: '1-2', label: '1 a 2h' }, { value: '2-4', label: '2 a 4h' }, { value: '4-8', label: '4 a 8h' }, { value: '>8', label: 'Mais de 8h' }] }
    ],
    calc: calcularStrainIndex
  },
  'OWAS': {
    numericos: ['costas', 'bracos', 'pernas', 'carga'],
    schema: [
      { name: 'costas', label: 'Costas (1 a 4)', type: 'select', options: ['1', '2', '3', '4'] },
      { name: 'bracos', label: 'Braços (1 a 3)', type: 'select', options: ['1', '2', '3'] },
      { name: 'pernas', label: 'Pernas (1 a 7)', type: 'select', options: ['1', '2', '3', '4', '5', '6', '7'] },
      { name: 'carga', label: 'Carga/força (1 a 3)', type: 'select', options: ['1', '2', '3'] }
    ],
    calc: calcularOWAS
  },
  'QEC': {
    numericos: ['costas', 'ombroBraco', 'punhoMao', 'pescoco'],
    schema: [
      { name: 'costas', label: 'Exposição — costas (0 a 4)', type: 'select', options: ['0', '1', '2', '3', '4'] },
      { name: 'ombroBraco', label: 'Exposição — ombro/braço (0 a 4)', type: 'select', options: ['0', '1', '2', '3', '4'] },
      { name: 'punhoMao', label: 'Exposição — punho/mão (0 a 4)', type: 'select', options: ['0', '1', '2', '3', '4'] },
      { name: 'pescoco', label: 'Exposição — pescoço (0 a 4)', type: 'select', options: ['0', '1', '2', '3', '4'] }
    ],
    calc: calcularQEC
  },
  'OCRA': {
    numericos: ['recuperacao', 'frequencia', 'forca', 'postura', 'fatoresAdicionais', 'duracaoMinutos'],
    schema: [
      { name: 'recuperacao', label: 'Fator de recuperação (pontos)', type: 'number' },
      { name: 'frequencia', label: 'Fator de frequência (pontos)', type: 'number' },
      { name: 'forca', label: 'Fator de força (pontos)', type: 'number' },
      { name: 'postura', label: 'Fator de postura (pontos)', type: 'number' },
      { name: 'fatoresAdicionais', label: 'Fatores adicionais (pontos)', type: 'number' },
      { name: 'duracaoMinutos', label: 'Duração da tarefa repetitiva (minutos)', type: 'number', default: 480 }
    ],
    calc: calcularOCRAChecklist
  }
};

async function renderMetodoForm(aetId, orgId, metodoNome, metodoId) {
  state.screen = 'aet-metodo';
  const aet = await DB.aet.get(aetId);
  const existente = metodoId ? aet.metodosAplicados.find((m) => m.id === metodoId) : null;
  const def = METODO_SCHEMAS[metodoNome];

  view.innerHTML = `
    ${menuTopo(orgId)}
    <div class="screen-header"><button id="btn-voltar" class="btn-link">← Voltar</button><h1>${escapeHtml(metodoNome)}</h1></div>
    <form id="form-metodo" class="form-section">
      ${def ? renderFormFields(def.schema, existente ? existente.inputs : {}) : `<label>Resultado / interpretação<textarea name="resultadoLivre" rows="4">${escapeHtml(existente ? existente.resultadoLivre : '')}</textarea></label>`}
      <label>Memória de cálculo / observações<textarea name="memoriaCalculo" rows="3">${escapeHtml(existente ? existente.memoriaCalculo : '')}</textarea></label>
      <div class="form-actions"><button type="submit" class="btn-primary">${def ? 'Calcular e salvar' : 'Salvar'}</button></div>
    </form>
    <div id="resultado-metodo"></div>`;
  ligarMenuTopo();
  document.getElementById('btn-voltar').addEventListener('click', () => renderAetForm(aetId, orgId));

  document.getElementById('form-metodo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const memoriaCalculo = new FormData(e.target).get('memoriaCalculo');
    let inputs = null, resultado = null, resultadoLivre = null;
    if (def) {
      inputs = lerFormFields(e.target, def.schema);
      def.numericos.forEach((k) => { inputs[k] = Number(inputs[k]); });
      resultado = def.calc(inputs);
      document.getElementById('resultado-metodo').innerHTML = `<div class="resumo"><pre>${escapeHtml(JSON.stringify(resultado, null, 2))}</pre></div>`;
    } else {
      resultadoLivre = new FormData(e.target).get('resultadoLivre');
    }
    const id = metodoId || uuid();
    const registro = { id, metodo: metodoNome, inputs, resultado, resultadoLivre, memoriaCalculo, interpretacao: resultado ? resultado.interpretacao || resultado.recomendacao : '' };
    const idx = aet.metodosAplicados.findIndex((m) => m.id === id);
    if (idx >= 0) aet.metodosAplicados[idx] = registro; else aet.metodosAplicados.push(registro);
    await salvarAet(aet);
    setTimeout(() => renderAetForm(aetId, orgId), def ? 900 : 0);
  });
}

async function renderRecomendacaoForm(aetId, orgId, recId) {
  state.screen = 'aet-recomendacao';
  const aet = await DB.aet.get(aetId);
  const rec = recId ? aet.recomendacoes.find((r) => r.id === recId) : null;
  view.innerHTML = `
    ${menuTopo(orgId)}
    <div class="screen-header"><button id="btn-voltar" class="btn-link">← Voltar</button><h1>${rec ? 'Editar' : 'Nova'} recomendação</h1></div>
    <form id="form-rec" class="form-section">${renderFormFields(RECOMENDACAO_SCHEMA, rec)}<div class="form-actions"><button type="submit" class="btn-primary">Salvar</button></div></form>`;
  ligarMenuTopo();
  document.getElementById('btn-voltar').addEventListener('click', () => renderAetForm(aetId, orgId));
  document.getElementById('form-rec').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = lerFormFields(e.target, RECOMENDACAO_SCHEMA);
    const id = recId || uuid();
    const registro = Object.assign({}, rec, dados, { id });
    const idx = aet.recomendacoes.findIndex((r) => r.id === id);
    if (idx >= 0) aet.recomendacoes[idx] = registro; else aet.recomendacoes.push(registro);
    await salvarAet(aet);
    renderAetForm(aetId, orgId);
  });
}
