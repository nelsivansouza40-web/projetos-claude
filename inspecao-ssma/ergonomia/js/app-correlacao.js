/* Correlação AEP/AET x inventário PGR, e aprovações do responsável PGR. */

async function obterOrgIdDaSituacao(situacaoId) {
  const situacao = await DB.situacoes.get(situacaoId);
  if (!situacao) return null;
  const atividade = await DB.atividades.get(situacao.atividadeId);
  const funcao = await DB.funcoes.get(atividade.funcaoId);
  const setor = await DB.setores.get(funcao.setorId);
  const processo = await DB.processos.get(setor.processoId);
  const estab = await DB.estabelecimentos.get(processo.estabelecimentoId);
  return estab ? estab.organizacaoId : null;
}

async function listarItensParaCorrelacionar(orgId) {
  const itens = [];
  const aeps = await DB.aep.getAll();
  for (const aep of aeps) {
    const orgDaAep = await obterOrgIdDaSituacao(aep.situacaoId);
    if (orgDaAep !== orgId) continue;
    (aep.fatores || []).forEach((f) => {
      if (!f.correlacionado) itens.push({ tipo: 'fator', origem: 'AEP', aepId: aep.id, situacaoId: aep.situacaoId, item: f });
    });
  }
  const aets = await DB.aet.getAll();
  for (const aet of aets) {
    const orgDoAet = await obterOrgIdDaSituacao(aet.situacaoId);
    if (orgDoAet !== orgId) continue;
    (aet.recomendacoes || []).forEach((r) => {
      if (!r.correlacionado) itens.push({ tipo: 'recomendacao', origem: 'AET', aetId: aet.id, situacaoId: aet.situacaoId, item: r });
    });
  }
  return itens;
}

async function renderCorrelacaoLista(orgId, aepIdFiltro) {
  state.screen = 'correlacao-lista';
  SCREEN_RENDERERS['correlacao-lista'] = () => renderCorrelacaoLista(orgId, aepIdFiltro);
  let itens = await listarItensParaCorrelacionar(orgId);
  if (aepIdFiltro) itens = itens.filter((i) => i.aepId === aepIdFiltro);

  view.innerHTML = `
    ${menuTopo(orgId)}
    <div class="screen-header"><button id="btn-voltar" class="btn-link">← Voltar</button><h1>Correlação com o PGR</h1></div>
    <p class="hint">Cada fator da AEP e recomendação da AET precisa ser vinculado (ou não) a um risco do inventário. Nada é alterado no PGR sem aprovação do responsável.</p>
    <ul class="insp-list">${itens.length ? itens.map((it, idx) => `
      <li class="insp-card" data-idx="${idx}">
        <div class="insp-card-main"><div class="insp-card-title">${escapeHtml(it.item.descricao || it.item.medida)}</div><div class="insp-card-sub">Origem: ${it.origem}</div></div>
        <div class="insp-card-side">${it.item.classificacao ? `<span class="badge ${badgeClassificacao(it.item.classificacao)}">${escapeHtml(it.item.classificacao)}</span>` : ''}</div>
      </li>`).join('') : '<li class="empty-state">Nada pendente de correlação.</li>'}</ul>`;
  ligarMenuTopo();
  document.getElementById('btn-voltar').addEventListener('click', () => renderOrgPainel(orgId));
  view.querySelectorAll('.insp-card').forEach((el) => el.addEventListener('click', () => renderCorrelacaoForm(orgId, itens[Number(el.dataset.idx)])));
}

async function renderCorrelacaoForm(orgId, corr) {
  state.screen = 'correlacao-form';
  const riscosOrg = await DB.riscos.byIndex('organizacaoId', orgId);
  const riscosAprovados = riscosOrg.filter((r) => r.status !== 'pendente_aprovacao');

  view.innerHTML = `
    ${menuTopo(orgId)}
    <div class="screen-header"><button id="btn-voltar" class="btn-link">← Voltar</button><h1>Correlacionar com o PGR</h1></div>
    <div class="resumo"><p><strong>${escapeHtml(corr.item.descricao || corr.item.medida)}</strong></p>
      ${corr.item.classificacao ? `<p>Classificação apurada: <span class="badge ${badgeClassificacao(corr.item.classificacao)}">${escapeHtml(corr.item.classificacao)}</span></p>` : ''}
    </div>
    <label>Vincular a um risco já existente no inventário (ou deixe em branco para propor novo registro)
      <select id="select-risco"><option value="">— Nenhum, propor novo registro —</option>
        ${riscosAprovados.map((r) => `<option value="${r.id}">${escapeHtml(r.codigo)} — ${escapeHtml(r.perigo)}</option>`).join('')}
      </select>
    </label>
    <div class="form-actions"><button id="btn-gerar-proposta" class="btn-primary">Gerar proposta de correlação</button></div>
    <div id="resultado-correlacao"></div>`;
  ligarMenuTopo();
  document.getElementById('btn-voltar').addEventListener('click', () => renderCorrelacaoLista(orgId));

  document.getElementById('btn-gerar-proposta').addEventListener('click', async () => {
    const riscoId = document.getElementById('select-risco').value;
    const riscoExistente = riscoId ? riscosAprovados.find((r) => r.id === riscoId) : null;
    const comparacao = compararComRiscoExistente(corr.item, riscoExistente);

    const proposta = {
      id: uuid(), organizacaoId: orgId, status: 'pendente_aprovacao', tipoProposta: comparacao.resultado,
      riscoRefId: riscoExistente ? riscoExistente.id : null,
      codigo: riscoExistente ? riscoExistente.codigo : `PGR-PROP-${Date.now().toString(36).toUpperCase()}`,
      perigo: corr.item.descricao || corr.item.medida,
      fonte: corr.item.fonteCircunstancia || '', possiveisLesoes: corr.item.possiveisDanos || '',
      grupoExposto: corr.item.grupoExposto || '', caracterizacaoExposicao: corr.item.exigenciaAtividade || '',
      medidasExistentes: corr.item.medidasExistentes || corr.item.recursos || '',
      eficaciaMedidas: corr.item.eficaciaObservada || '',
      severidade: corr.item.severidade || '', probabilidade: corr.item.probabilidade || '',
      classificacao: corr.item.classificacao || '',
      origemTipo: corr.tipo, origemId: corr.item.id, origemDescricaoResultado: comparacao.descricao,
      versao: riscoExistente ? (riscoExistente.versao || 1) + 1 : 1,
      dataAtualizacao: Date.now(), synced: false
    };
    await DB.riscos.put(proposta);

    if (corr.tipo === 'fator') {
      const aep = await DB.aep.get(corr.aepId);
      const f = aep.fatores.find((x) => x.id === corr.item.id);
      f.correlacionado = true;
      await DB.aep.put(aep);
    } else {
      const aet = await DB.aet.get(corr.aetId);
      const r = aet.recomendacoes.find((x) => x.id === corr.item.id);
      r.correlacionado = true;
      await DB.aet.put(aet);
    }
    await registrarAuditoria('risco', proposta.id, 'proposta_correlacao', comparacao.resultado);
    document.getElementById('resultado-correlacao').innerHTML = `<div class="resumo"><p><strong>Resultado:</strong> ${escapeHtml(comparacao.descricao)}</p><p>A proposta foi enviada para aprovação do responsável pelo PGR.</p></div>`;
    Sync.syncAll().catch(() => {});
    setTimeout(() => renderCorrelacaoLista(orgId), 1200);
  });
}

async function renderAprovacoes(orgId) {
  state.screen = 'aprovacoes';
  SCREEN_RENDERERS.aprovacoes = () => renderAprovacoes(orgId);
  const propostas = (await DB.riscos.byIndex('organizacaoId', orgId)).filter((r) => r.status === 'pendente_aprovacao');
  view.innerHTML = `
    ${menuTopo(orgId)}
    <div class="screen-header"><button id="btn-voltar" class="btn-link">← Voltar</button><h1>Aprovações pendentes (PGR)</h1></div>
    <ul class="insp-list">${propostas.length ? propostas.map((p) => `
      <li class="insp-card" data-id="${p.id}">
        <div class="insp-card-main"><div class="insp-card-title">${escapeHtml(p.perigo)}</div><div class="insp-card-sub">${escapeHtml(p.origemDescricaoResultado || '')}</div></div>
        <div class="insp-card-side">
          <button type="button" class="btn-primary btn-aprovar" data-id="${p.id}">Aprovar</button>
          <button type="button" class="btn-danger btn-rejeitar" data-id="${p.id}">Rejeitar</button>
        </div>
      </li>`).join('') : '<li class="empty-state">Nenhuma proposta pendente.</li>'}</ul>`;
  ligarMenuTopo();
  document.getElementById('btn-voltar').addEventListener('click', () => renderOrgPainel(orgId));

  view.querySelectorAll('.btn-aprovar').forEach((btn) => btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    await aprovarProposta(btn.dataset.id);
    renderAprovacoes(orgId);
  }));
  view.querySelectorAll('.btn-rejeitar').forEach((btn) => btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!confirm('Rejeitar esta proposta de correlação?')) return;
    const p = await DB.riscos.get(btn.dataset.id);
    await registrarAuditoria('risco', p.id, 'rejeicao_proposta', p.perigo);
    await DB.riscos.delete(btn.dataset.id);
    renderAprovacoes(orgId);
  }));
}

async function aprovarProposta(propostaId) {
  const proposta = await DB.riscos.get(propostaId);
  const perfil = await getPerfilAtual();
  if (proposta.tipoProposta === 'novo') {
    proposta.status = 'aprovado';
    proposta.aprovadoPor = perfil.nome; proposta.aprovadoEm = Date.now();
    await DB.riscos.put(proposta);
  } else if (proposta.riscoRefId) {
    const riscoAlvo = await DB.riscos.get(proposta.riscoRefId);
    Object.assign(riscoAlvo, {
      fonte: proposta.fonte || riscoAlvo.fonte, possiveisLesoes: proposta.possiveisLesoes || riscoAlvo.possiveisLesoes,
      grupoExposto: proposta.grupoExposto || riscoAlvo.grupoExposto, medidasExistentes: proposta.medidasExistentes || riscoAlvo.medidasExistentes,
      eficaciaMedidas: proposta.eficaciaMedidas || riscoAlvo.eficaciaMedidas, severidade: proposta.severidade || riscoAlvo.severidade,
      probabilidade: proposta.probabilidade || riscoAlvo.probabilidade, classificacao: proposta.classificacao || riscoAlvo.classificacao,
      versao: (riscoAlvo.versao || 1) + 1, dataAtualizacao: Date.now(), synced: false
    });
    await DB.riscos.put(riscoAlvo);
    await DB.riscos.delete(propostaId);
  }
  await registrarAuditoria('risco', propostaId, 'aprovacao', proposta.tipoProposta);
  Sync.syncAll().catch(() => {});
}

async function criarPlanoDeRecomendacao(rec, aet, situacao, orgId) {
  const plano = {
    id: uuid(), organizacaoId: orgId, situacaoId: situacao.id, origem: 'AET', aetId: aet.id,
    descricaoMedida: rec.medida, hierarquiaControle: '', prioridade: rec.prioridade || 'Média',
    responsavel: rec.responsavel || '', prazo: rec.prazo || '', recursos: rec.recursos || '',
    indicador: rec.indicadorEficacia || '', status: 'Aberta', percentualExecucao: 0,
    dataAbertura: new Date().toISOString().slice(0, 10), synced: false, createdAt: Date.now(), updatedAt: Date.now()
  };
  await DB.planos.put(plano);
  await registrarAuditoria('plano', plano.id, 'criacao', 'origem AET');
  Sync.syncAll().catch(() => {});
  return plano;
}
