/* Central de relatórios: PDF (impressão) para AEP/AET e exportação CSV. */

async function renderRelatorios(orgId) {
  state.screen = 'relatorios';
  SCREEN_RENDERERS.relatorios = () => renderRelatorios(orgId);
  const org = await DB.organizacoes.get(orgId);
  const aeps = [];
  const aets = [];
  const estabs = await DB.estabelecimentos.byIndex('organizacaoId', orgId);
  for (const estab of estabs) {
    const processos = await DB.processos.byIndex('estabelecimentoId', estab.id);
    for (const p of processos) {
      const setores = await DB.setores.byIndex('processoId', p.id);
      for (const s of setores) {
        const funcoes = await DB.funcoes.byIndex('setorId', s.id);
        for (const f of funcoes) {
          const atividades = await DB.atividades.byIndex('funcaoId', f.id);
          for (const a of atividades) {
            const situacoes = await DB.situacoes.byIndex('atividadeId', a.id);
            for (const sit of situacoes) {
              const aepsSit = await DB.aep.byIndex('situacaoId', sit.id);
              aepsSit.forEach((x) => aeps.push(Object.assign({ situacao: sit }, x)));
              const aetsSit = await DB.aet.byIndex('situacaoId', sit.id);
              aetsSit.forEach((x) => aets.push(Object.assign({ situacao: sit }, x)));
            }
          }
        }
      }
    }
  }

  view.innerHTML = `
    ${menuTopo(orgId)}
    <div class="screen-header"><button id="btn-voltar" class="btn-link">← Voltar</button><h1>Relatórios — ${escapeHtml(org.razaoSocial)}</h1></div>
    <div class="form-section">
      <h3>Exportação em planilha (CSV)</h3>
      <div class="form-actions">
        <button id="btn-csv-pgr" class="btn-secondary">Inventário PGR</button>
        <button id="btn-csv-planos" class="btn-secondary">Plano de ação</button>
      </div>
    </div>
    <div class="form-section">
      <h3>Relatórios de AEP</h3>
      <ul class="insp-list">${aeps.length ? aeps.map((a) => `<li class="insp-card" data-tipo="aep" data-id="${a.id}"><div class="insp-card-main"><div class="insp-card-title">${escapeHtml(a.situacao.cargo)}</div><div class="insp-card-sub">${fmtDataHora(a.createdAt)}</div></div></li>`).join('') : '<li class="empty-state">Nenhuma AEP registrada.</li>'}</ul>
    </div>
    <div class="form-section">
      <h3>Relatórios de AET</h3>
      <ul class="insp-list">${aets.length ? aets.map((a) => `<li class="insp-card" data-tipo="aet" data-id="${a.id}"><div class="insp-card-main"><div class="insp-card-title">${escapeHtml(a.situacao.cargo)}</div><div class="insp-card-sub">${fmtDataHora(a.createdAt)} · ${escapeHtml(a.status)}</div></div></li>`).join('') : '<li class="empty-state">Nenhuma AET registrada.</li>'}</ul>
    </div>`;
  ligarMenuTopo();
  document.getElementById('btn-voltar').addEventListener('click', () => renderOrgPainel(orgId));
  document.getElementById('btn-csv-pgr').addEventListener('click', () => exportarCsvPGR(orgId));
  document.getElementById('btn-csv-planos').addEventListener('click', () => exportarCsvPlanos(orgId));
  view.querySelectorAll('[data-tipo="aep"]').forEach((el) => el.addEventListener('click', () => renderRelatorioAEP(el.dataset.id, orgId)));
  view.querySelectorAll('[data-tipo="aet"]').forEach((el) => el.addEventListener('click', () => renderRelatorioAET(el.dataset.id, orgId)));
}

function baixarCsv(nomeArquivo, colunas, linhas) {
  const escapeCsv = (v) => `"${String(v === undefined || v === null ? '' : v).replace(/"/g, '""')}"`;
  const conteudo = [colunas.join(';')].concat(linhas.map((l) => colunas.map((c) => escapeCsv(l[c])).join(';'))).join('\r\n');
  const blob = new Blob(['﻿' + conteudo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nomeArquivo;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function exportarCsvPGR(orgId) {
  const riscos = await DB.riscos.byIndex('organizacaoId', orgId);
  const colunas = ['codigo', 'status', 'processo', 'atividade', 'perigo', 'fonte', 'possiveisLesoes', 'grupoExposto', 'medidasExistentes', 'eficaciaMedidas', 'severidade', 'probabilidade', 'classificacao', 'necessidadeAcao', 'versao'];
  baixarCsv('inventario_pgr.csv', colunas, riscos);
}
async function exportarCsvPlanos(orgId) {
  const planos = await DB.planos.byIndex('organizacaoId', orgId);
  const colunas = ['codigo', 'descricaoMedida', 'hierarquiaControle', 'prioridade', 'trabalhadoresAtingidos', 'responsavel', 'setorResponsavel', 'dataAbertura', 'prazo', 'status', 'percentualExecucao', 'avaliacaoEficacia', 'riscoResidual'];
  baixarCsv('plano_de_acao.csv', colunas, planos);
}

async function renderRelatorioAEP(aepId, orgId) {
  state.screen = 'relatorio-aep';
  const aep = await DB.aep.get(aepId);
  const situacao = await DB.situacoes.get(aep.situacaoId);
  const org = await DB.organizacoes.get(orgId);

  const fotosFatoresHtml = (await Promise.all(aep.fatores.map(async (f) => {
    const fotos = (await Promise.all((f.fotoIds || []).map(async (id) => {
      const foto = await DB.fotos.get(id);
      return foto ? `<img src="${URL.createObjectURL(foto.blob)}" class="rep-foto">` : '';
    }))).join('');
    return `<div class="rep-foto-bloco ${f.decisaoAET && f.decisaoAET.necessitaAET ? 'rep-nc' : 'rep-ok'}">
      <div class="rep-foto-header"><strong>${escapeHtml((BLOCOS_AEP.find((b) => b.chave === f.bloco) || {}).titulo)}</strong>
        <span class="rep-status-pill">${escapeHtml(f.classificacao || '—')}</span></div>
      <p>${escapeHtml(f.descricao)}</p>
      ${fotos ? `<div class="rep-fotos-grid">${fotos}</div>` : ''}
      ${f.medidaRecomendada ? `<p><strong>Medida recomendada:</strong> ${escapeHtml(f.medidaRecomendada)}</p>` : ''}
      ${f.decisaoAET ? `<p><strong>Necessidade de AET:</strong> ${f.decisaoAET.necessitaAET ? 'Sim' : 'Não'} — ${f.decisaoAET.motivos.map(escapeHtml).join(' ')}</p>` : ''}
    </div>`;
  }))).join('');

  view.innerHTML = `
    <div class="screen-header no-print"><button id="btn-voltar" class="btn-link">← Voltar</button><h1>Relatório da AEP</h1></div>
    <div class="form-actions no-print"><button id="btn-imprimir" class="btn-primary">Imprimir / Salvar PDF</button></div>
    <article class="rep-doc">
      <header class="rep-cabecalho">
        <div class="rep-titulo"><img src="../icons/icon-192.png" class="rep-logo"><div><h2>REGISTRO DE AVALIAÇÃO ERGONÔMICA PRELIMINAR (AEP)</h2><p>${escapeHtml(org.razaoSocial)}</p></div></div>
        <table class="rep-controle"><tr><th>Situação</th><td>${escapeHtml(situacao.cargo)}</td></tr><tr><th>Data</th><td>${fmtData(aep.data)}</td></tr><tr><th>Avaliador</th><td>${escapeHtml(aep.avaliador || '—')}</td></tr></table>
      </header>
      <section class="rep-secao"><h3>Fatores identificados</h3>${fotosFatoresHtml || '<p class="rep-hint">Nenhum fator identificado.</p>'}</section>
      <section class="rep-secao"><h3>Conclusão</h3><p class="rep-parecer">${aep.necessitaAET ? 'A AEP indicou necessidade de Análise Ergonômica do Trabalho (AET) aprofundada.' : 'A AEP concluiu que o risco está compreendido, com medida de controle simples definida, sem necessidade de AET.'}</p></section>
      <footer class="rep-rodape">Documento gerado pelo aplicativo de Gestão Ergonômica em ${fmtDataHora(Date.now())}. Registro preservado permanentemente.</footer>
    </article>`;
  document.getElementById('btn-voltar').addEventListener('click', () => renderAepResultado(aepId, orgId));
  document.getElementById('btn-imprimir').addEventListener('click', () => window.print());
}

async function renderRelatorioAET(aetId, orgId) {
  state.screen = 'relatorio-aet';
  const aet = await DB.aet.get(aetId);
  const situacao = await DB.situacoes.get(aet.situacaoId);
  const org = await DB.organizacoes.get(orgId);

  view.innerHTML = `
    <div class="screen-header no-print"><button id="btn-voltar" class="btn-link">← Voltar</button><h1>Relatório da AET</h1></div>
    <div class="form-actions no-print"><button id="btn-imprimir" class="btn-primary">Imprimir / Salvar PDF</button></div>
    <article class="rep-doc">
      <header class="rep-cabecalho">
        <div class="rep-titulo"><img src="../icons/icon-192.png" class="rep-logo"><div><h2>ANÁLISE ERGONÔMICA DO TRABALHO (AET)</h2><p>${escapeHtml(org.razaoSocial)} — ${escapeHtml(situacao.cargo)}</p></div></div>
        <table class="rep-controle"><tr><th>Responsável técnico</th><td>${escapeHtml(aet.responsavelTecnico || '—')}</td></tr><tr><th>Status</th><td>${escapeHtml(aet.status)}</td></tr><tr><th>Retenção</th><td>20 anos (NR-17)</td></tr></table>
      </header>
      <section class="rep-secao"><h3>1. Análise da demanda</h3>${objetoParaParagrafos(aet.analiseDemanda)}</section>
      <section class="rep-secao"><h3>2. Análise da organização e da atividade</h3>${objetoParaParagrafos(aet.analiseAtividade)}</section>
      <section class="rep-secao"><h3>3. Métodos aplicados</h3>${aet.metodosAplicados.length ? aet.metodosAplicados.map((m) => `<p><strong>${escapeHtml(m.metodo)}:</strong> ${escapeHtml(m.resultado ? JSON.stringify(m.resultado) : (m.resultadoLivre || ''))}</p>`).join('') : '<p class="rep-hint">Nenhum método registrado.</p>'}</section>
      <section class="rep-secao"><h3>4. Diagnóstico</h3>${objetoParaParagrafos(aet.diagnostico)}</section>
      <section class="rep-secao"><h3>5. Recomendações</h3>${aet.recomendacoes.length ? `<table class="rep-table"><thead><tr><th>Medida</th><th>Prioridade</th><th>Responsável</th><th>Prazo</th></tr></thead><tbody>${aet.recomendacoes.map((r) => `<tr><td>${escapeHtml(r.medida)}</td><td>${escapeHtml(r.prioridade || '')}</td><td>${escapeHtml(r.responsavel || '')}</td><td>${r.prazo ? fmtData(r.prazo) : ''}</td></tr>`).join('')}</tbody></table>` : '<p class="rep-hint">Nenhuma recomendação registrada.</p>'}</section>
      <section class="rep-secao"><h3>6. Restituição e validação</h3>${objetoParaParagrafos(aet.restituicao)}</section>
      <footer class="rep-rodape">Documento gerado pelo aplicativo de Gestão Ergonômica em ${fmtDataHora(Date.now())}. Retenção mínima de 20 anos conforme NR-17, item 17.3.7.</footer>
    </article>`;
  document.getElementById('btn-voltar').addEventListener('click', () => renderAetForm(aetId, orgId));
  document.getElementById('btn-imprimir').addEventListener('click', () => window.print());
}

function objetoParaParagrafos(obj) {
  const entradas = Object.entries(obj || {}).filter(([, v]) => v);
  if (!entradas.length) return '<p class="rep-hint">Não preenchido.</p>';
  return entradas.map(([k, v]) => `<p><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</p>`).join('');
}
