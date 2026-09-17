/* Avaliação Ergonômica Preliminar (AEP): blocos, fatores e motor de decisão de AET. */

const FATOR_SCHEMA_BASE = [
  { name: 'descricao', label: 'Descrição do fator identificado', type: 'textarea', required: true },
  { name: 'fonteCircunstancia', label: 'Fonte ou circunstância' },
  { name: 'exigenciaAtividade', label: 'Exigência da atividade', type: 'textarea' },
  { name: 'frequencia', label: 'Frequência' },
  { name: 'duracao', label: 'Duração' },
  { name: 'grupoExposto', label: 'Grupo exposto' },
  { name: 'numTrabalhadores', label: 'Número de trabalhadores expostos', type: 'number' },
  { name: 'possiveisDanos', label: 'Possíveis danos', type: 'textarea' },
  { name: 'medidasExistentes', label: 'Medidas existentes', type: 'textarea' },
  { name: 'eficaciaObservada', label: 'Eficácia observada', type: 'select', options: ['Eficaz', 'Parcialmente eficaz', 'Ineficaz', 'Não há medida'] },
  { name: 'severidade', label: 'Severidade', type: 'select', options: [] },
  { name: 'probabilidade', label: 'Probabilidade', type: 'select', options: [] },
  { name: 'medidaRecomendada', label: 'Medida recomendada', type: 'textarea' }
];

const CONDICOES_AET = [
  { name: 'dadosInsuficientes', label: 'Os dados coletados são insuficientes para conclusão' },
  { name: 'medidaImplantadaSemEficacia', label: 'Medida já implantada não se mostrou eficaz' },
  { name: 'indicacaoPCMSO', label: 'Dados coletivos do PCMSO indicam possível relação' },
  { name: 'acidenteDoencaRelacionado', label: 'Acidente ou doença analisada aponta fator ergonômico' },
  { name: 'contradicaoMetodoObservacao', label: 'Há contradição entre método aplicado e observação real' },
  { name: 'riscoEvidenteAcaoImediata', label: 'Situação de risco evidente — necessita ação imediata' }
];

async function iniciarNovaAEP(situacaoId, orgId) {
  const perfil = await getPerfilAtual();
  const aep = {
    id: uuid(), situacaoId, avaliador: perfil.nome || '', data: new Date().toISOString().slice(0, 10),
    fatores: [], necessitaAET: false, status: 'rascunho', synced: false, createdAt: Date.now(), updatedAt: Date.now()
  };
  await DB.aep.put(aep);
  renderAepForm(aep.id, orgId);
}
function renderAepForm(aepId, orgId) { window.__aepFormRoute = { aepId, orgId }; _renderAepForm(aepId, orgId); }

async function _renderAepForm(aepId, orgId) {
  state.screen = 'aep-form';
  SCREEN_RENDERERS['aep-form'] = () => _renderAepForm(aepId, orgId);
  const aep = await DB.aep.get(aepId);
  const situacao = await DB.situacoes.get(aep.situacaoId);

  view.innerHTML = `
    ${menuTopo(orgId)}
    <div class="screen-header"><button id="btn-voltar" class="btn-link">← Voltar</button><h1>AEP — ${escapeHtml(situacao.cargo)}</h1></div>
    <label>Avaliador<input type="text" id="input-avaliador" value="${escapeHtml(aep.avaliador)}"></label>
    <div id="blocos-aep"></div>
    <div class="form-actions"><button id="btn-concluir-aep" class="btn-primary">Concluir AEP</button></div>`;
  ligarMenuTopo();
  document.getElementById('btn-voltar').addEventListener('click', () => renderSituacaoDetalhe(aep.situacaoId, orgId));
  document.getElementById('input-avaliador').addEventListener('blur', async (e) => {
    aep.avaliador = e.target.value; await DB.aep.put(aep);
  });

  const blocosEl = document.getElementById('blocos-aep');
  blocosEl.innerHTML = BLOCOS_AEP.map((b) => `
    <div class="checklist-card">
      <div class="checklist-question">${escapeHtml(b.titulo)}</div>
      ${b.aviso ? `<p class="rep-hint">${escapeHtml(b.aviso)}</p>` : ''}
      <div class="chips">${b.sugestoes.map((s) => `<span class="chip" data-bloco="${b.chave}">${escapeHtml(s)}</span>`).join('')}</div>
      <ul class="lista-fatores" data-bloco="${b.chave}"></ul>
      <button type="button" class="btn-secondary btn-add-fator" data-bloco="${b.chave}">+ Adicionar fator identificado</button>
    </div>`).join('');

  for (const b of BLOCOS_AEP) {
    const ul = blocosEl.querySelector(`.lista-fatores[data-bloco="${b.chave}"]`);
    const fatores = aep.fatores.filter((f) => f.bloco === b.chave);
    ul.innerHTML = fatores.length ? fatores.map((f) => `
      <li class="detail-item" data-fator="${f.id}">
        <strong>${escapeHtml(f.descricao)}</strong>
        <span class="badge ${badgeClassificacao(f.classificacao)}">${escapeHtml(f.classificacao || '—')}</span>
        ${f.decisaoAET && f.decisaoAET.necessitaAET ? '<span class="badge badge-erro">Necessita AET</span>' : ''}
        <div class="form-actions"><button type="button" class="btn-link btn-editar-fator" data-fator="${f.id}" data-bloco="${b.chave}">Editar</button>
        <button type="button" class="btn-link btn-excluir-fator" data-fator="${f.id}">Excluir</button></div>
      </li>`).join('') : '<li class="empty-state">Nenhum fator registrado neste bloco.</li>';
  }

  blocosEl.querySelectorAll('.chip').forEach((chip) => chip.addEventListener('click', () => renderAepFatorForm(aepId, chip.dataset.bloco, orgId, null, chip.textContent)));
  blocosEl.querySelectorAll('.btn-add-fator').forEach((btn) => btn.addEventListener('click', () => renderAepFatorForm(aepId, btn.dataset.bloco, orgId, null)));
  blocosEl.querySelectorAll('.btn-editar-fator').forEach((btn) => btn.addEventListener('click', () => renderAepFatorForm(aepId, btn.dataset.bloco, orgId, btn.dataset.fator)));
  blocosEl.querySelectorAll('.btn-excluir-fator').forEach((btn) => btn.addEventListener('click', async () => {
    if (!confirm('Excluir este fator?')) return;
    aep.fatores = aep.fatores.filter((f) => f.id !== btn.dataset.fator);
    await DB.aep.put(aep);
    _renderAepForm(aepId, orgId);
  }));

  document.getElementById('btn-concluir-aep').addEventListener('click', async () => {
    if (!aep.fatores.length && !confirm('Nenhum fator foi registrado. Concluir mesmo assim?')) return;
    aep.necessitaAET = aep.fatores.some((f) => f.decisaoAET && f.decisaoAET.necessitaAET);
    aep.alertaAcaoImediata = aep.fatores.some((f) => f.decisaoAET && f.decisaoAET.alertaAcaoImediata);
    aep.status = 'concluida';
    aep.updatedAt = Date.now();
    await DB.aep.put(aep);
    await registrarAuditoria('aep', aepId, 'conclusao', `${aep.fatores.length} fator(es)`);
    Sync.syncAll().catch(() => {});
    renderAepResultado(aepId, orgId);
  });
}

async function renderAepFatorForm(aepId, bloco, orgId, fatorId, sugestaoTexto) {
  state.screen = 'aep-fator-form';
  const aep = await DB.aep.get(aepId);
  const fator = fatorId ? aep.fatores.find((f) => f.id === fatorId) : { descricao: sugestaoTexto || '' };
  const schema = await schemaComMatriz(FATOR_SCHEMA_BASE);
  const blocoInfo = BLOCOS_AEP.find((b) => b.chave === bloco);

  view.innerHTML = `
    ${menuTopo(orgId)}
    <div class="screen-header"><button id="btn-voltar" class="btn-link">← Voltar</button><h1>${escapeHtml(blocoInfo.titulo)}</h1></div>
    <form id="form-fator" class="form-section">
      ${renderFormFields(schema, fator)}
      <div class="foto-botoes">
        <label class="file-label">📷 Tirar foto<input type="file" accept="image/*" capture="environment" id="input-foto-fator-camera"></label>
        <label class="file-label">🖼️ Da galeria<input type="file" accept="image/*" multiple id="input-foto-fator-galeria"></label>
      </div>
      <div class="thumbs" id="thumbs-fator"></div>
      <h3>Necessidade de AET (NR-17, item 17.3.2)</h3>
      ${CONDICOES_AET.map((c) => `<label class="check-linha"><input type="checkbox" name="${c.name}" ${fator[c.name] ? 'checked' : ''}> ${escapeHtml(c.label)}</label>`).join('')}
      <div class="form-actions"><button type="submit" class="btn-primary">Salvar fator</button></div>
    </form>`;
  ligarMenuTopo();
  const fotoIds = (fator.fotoIds || []).slice();
  renderThumbsGaleria(document.getElementById('thumbs-fator'), fotoIds);
  document.getElementById('btn-voltar').addEventListener('click', () => renderAepForm(aepId, orgId));
  ['input-foto-fator-camera', 'input-foto-fator-galeria'].forEach((elId) => {
    document.getElementById(elId).addEventListener('change', async (e) => {
      await adicionarFotos('fator-aep', fatorId || 'temp', fotoIds, e.target.files);
      renderThumbsGaleria(document.getElementById('thumbs-fator'), fotoIds);
    });
  });

  document.getElementById('form-fator').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = lerFormFields(e.target, schema);
    const fd = new FormData(e.target);
    const condicoes = {};
    CONDICOES_AET.forEach((c) => { condicoes[c.name] = fd.get(c.name) === 'on'; });
    const decisaoAET = avaliarNecessidadeAET(condicoes);
    const { classificacao } = dados.severidade && dados.probabilidade ? await classificarRisco(dados.severidade, dados.probabilidade) : { classificacao: null };

    const id = fatorId || uuid();
    for (const fid of fotoIds) {
      const f = await DB.fotos.get(fid);
      if (f && f.refId === 'temp') { f.refId = id; await DB.fotos.put(f); }
    }
    const registro = Object.assign({}, fator, dados, condicoes, { id, bloco, classificacao, decisaoAET, fotoIds, correlacionado: false });

    const aepAtual = await DB.aep.get(aepId);
    const idx = aepAtual.fatores.findIndex((f) => f.id === id);
    if (idx >= 0) aepAtual.fatores[idx] = registro; else aepAtual.fatores.push(registro);
    aepAtual.updatedAt = Date.now();
    await DB.aep.put(aepAtual);
    renderAepForm(aepId, orgId);
  });
}

async function renderAepResultado(aepId, orgId) {
  state.screen = 'aep-resultado';
  SCREEN_RENDERERS['aep-resultado'] = () => renderAepResultado(aepId, orgId);
  const aep = await DB.aep.get(aepId);
  const situacao = await DB.situacoes.get(aep.situacaoId);
  const aetsExistentes = await DB.aet.byIndex('situacaoId', aep.situacaoId);
  const aetDaAep = aetsExistentes.find((a) => a.aepId === aepId);

  view.innerHTML = `
    ${menuTopo(orgId)}
    <div class="screen-header"><button id="btn-voltar" class="btn-link">← Voltar</button><h1>Resultado da AEP</h1></div>
    <div class="resumo">
      <p>${escapeHtml(situacao.cargo)} — ${escapeHtml(situacao.local)} · Avaliador: ${escapeHtml(aep.avaliador || '—')} · ${fmtData(aep.data)}</p>
      <ul class="resumo-stats">
        <li>Fatores identificados: ${aep.fatores.length}</li>
        <li class="nc">${aep.fatores.filter((f) => f.decisaoAET && f.decisaoAET.necessitaAET).length} indicam necessidade de AET</li>
      </ul>
      ${aep.alertaAcaoImediata ? '<p class="erro-msg"><strong>Alerta:</strong> situação de risco evidente identificada — ação imediata recomendada.</p>' : ''}
    </div>
    <table class="rep-table">
      <thead><tr><th>Bloco</th><th>Fator</th><th>Classificação</th><th>AET?</th></tr></thead>
      <tbody>${aep.fatores.map((f) => `
        <tr><td>${escapeHtml((BLOCOS_AEP.find((b) => b.chave === f.bloco) || {}).titulo || '')}</td>
        <td>${escapeHtml(f.descricao)}</td>
        <td><span class="badge ${badgeClassificacao(f.classificacao)}">${escapeHtml(f.classificacao || '—')}</span></td>
        <td>${f.decisaoAET && f.decisaoAET.necessitaAET ? 'Sim' : 'Não'}</td></tr>`).join('')}
      </tbody>
    </table>
    <div class="form-actions">
      ${aep.necessitaAET ? (aetDaAep
        ? `<button id="btn-abrir-aet" class="btn-primary">Abrir AET em andamento</button>`
        : `<button id="btn-abrir-aet" class="btn-primary">Iniciar AET</button>`)
        : '<p class="hint">Conclusão: risco compreendido, sem necessidade de AET. Encaminhar ao PGR.</p>'}
      <button id="btn-correlacionar" class="btn-secondary">Correlacionar com o PGR</button>
      <button id="btn-relatorio-aep" class="btn-secondary">Gerar relatório da AEP</button>
    </div>`;
  ligarMenuTopo();
  document.getElementById('btn-voltar').addEventListener('click', () => renderSituacaoDetalhe(aep.situacaoId, orgId));
  document.getElementById('btn-correlacionar').addEventListener('click', () => renderCorrelacaoLista(orgId, aepId));
  document.getElementById('btn-relatorio-aep').addEventListener('click', () => renderRelatorioAEP(aepId, orgId));
  const btnAet = document.getElementById('btn-abrir-aet');
  if (btnAet) btnAet.addEventListener('click', async () => {
    if (aetDaAep) return renderAetForm(aetDaAep.id, orgId);
    const aet = await iniciarNovaAET(aep, situacao, orgId);
    renderAetForm(aet.id, orgId);
  });
}
