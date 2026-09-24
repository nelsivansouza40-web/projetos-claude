/* Módulo de PGR (Programa de Gerenciamento de Riscos), alinhado ao GRO da
 * NR-01. Assim como a Ficha de EPI e a Gestão de CIPA, é um documento
 * contínuo por empresa/unidade: a cada perigo identificado, registra-se
 * severidade x probabilidade (risco antes das medidas), as medidas de
 * controle e a severidade x probabilidade residual (risco depois das
 * medidas), com uma matriz visual 5x5 para cada avaliação. */

function novoPerigoPGR() {
  return {
    id: uuid(),
    setor: '',
    funcao: '',
    perigo: '',
    fonte: '',
    tipoRisco: TIPOS_RISCO_PGR[0],
    severidade: '',
    probabilidade: '',
    medidasExistentes: '',
    medidasPropostas: '',
    severidadeResidual: '',
    probabilidadeResidual: '',
    responsavel: '',
    prazo: '',
    status: 'Pendente'
  };
}

function novoPGRVazio() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return {
    id: uuid(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    completo: true,
    syncStatus: 'pendente',
    syncError: '',
    metaSynced: false,
    remoteRef: null,
    data: {
      empresa: '',
      unidade: '',
      responsavelPGR: '',
      dataElaboracao: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      perigos: [],
      assinaturas: {
        responsavelPGR: ''
      }
    }
  };
}

async function salvarPGR(p) {
  p.updatedAt = Date.now();
  p.metaSynced = false;
  p.syncStatus = 'pendente';
  await DB.putPGR(p);
}

function matrizRiscoMini(severidade, probabilidade) {
  const sev = Number(severidade) || 0;
  const prob = Number(probabilidade) || 0;
  const corPorClasse = { 'badge-ok': '#d1e7dd', 'badge-pendente': '#fff3cd', 'badge-alto': '#ffe0b2', 'badge-erro': '#f8d7da', 'badge-rascunho': '#e7edf3' };
  let linhas = '';
  for (let s = 5; s >= 1; s--) {
    let celulas = '';
    for (let p = 1; p <= 5; p++) {
      const c = classificarRiscoPGR(s, p);
      const ativa = s === sev && p === prob;
      celulas += `<div class="matriz-celula ${ativa ? 'matriz-celula-ativa' : ''}" style="background:${corPorClasse[c.cls]}">${s * p}</div>`;
    }
    linhas += `<div class="matriz-linha">${celulas}</div>`;
  }
  return `<div class="matriz-risco-mini">${linhas}</div>`;
}

function opcoesNiveisPGR(niveis, selecionado) {
  return `<option value="">Selecione…</option>` + niveis.map((n) =>
    `<option value="${n.valor}" ${String(selecionado) === String(n.valor) ? 'selected' : ''}>${n.valor} — ${escapeHtml(n.label)}</option>`
  ).join('');
}

/* ---------------- HOME DO MÓDULO ---------------- */

async function renderPGRHome() {
  state.screen = 'pgr-home';
  setActiveTab('pgr');
  const registros = await DB.getAllPGR();

  const itemsHtml = registros.length
    ? registros.map((p) => {
        const s = statusLabel(p);
        const criticos = p.data.perigos.filter((h) => classificarRiscoPGR(h.severidade, h.probabilidade).nivel === 'Crítico').length;
        const altos = p.data.perigos.filter((h) => classificarRiscoPGR(h.severidade, h.probabilidade).nivel === 'Alto').length;
        return `
          <li class="insp-card" data-id="${p.id}">
            <div class="insp-card-main">
              <div class="insp-card-title">${escapeHtml(p.data.empresa || 'Sem nome')}</div>
              <div class="insp-card-sub">${escapeHtml(p.data.unidade || '')}</div>
              <div class="insp-card-sub">${p.data.perigos.length} perigo(s) mapeado(s)</div>
            </div>
            <div class="insp-card-side">
              ${criticos ? `<span class="badge badge-erro">${criticos} crítico(s)</span>` : ''}
              ${altos ? `<span class="badge badge-alto">${altos} alto(s)</span>` : ''}
              <span class="badge ${s.cls}">${s.text}</span>
              <button type="button" class="btn-excluir-card" data-id="${p.id}" title="Excluir">🗑</button>
            </div>
          </li>
        `;
      }).join('')
    : '<li class="empty-state">Nenhum PGR cadastrado ainda. Toque em "Novo PGR" para começar.</li>';

  view.innerHTML = `
    <div class="screen-header">
      <h1>PGR — Gerenciamento de Riscos</h1>
      <button id="btn-new-pgr" class="btn-primary">+ Novo PGR</button>
    </div>
    <ul class="insp-list">${itemsHtml}</ul>
  `;

  document.getElementById('btn-new-pgr').addEventListener('click', startNewPGR);
  view.querySelectorAll('.insp-card').forEach((el) => {
    el.addEventListener('click', () => renderPGRDetail(el.dataset.id));
  });
  view.querySelectorAll('.btn-excluir-card').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      excluirPGR(btn.dataset.id);
    });
  });
}

async function excluirPGR(id) {
  const p = await DB.getPGR(id);
  if (!p) return;
  if (!confirm('Excluir este PGR do dispositivo? Esta ação não pode ser desfeita.')) return;
  await DB.deletePGR(id);
  renderPGRHome();
  updateSyncBar();
}

async function startNewPGR() {
  const p = novoPGRVazio();
  await DB.putPGR(p);
  renderPGRDetail(p.id);
}

/* ---------------- DETALHE (também é a tela de edição) ---------------- */

async function renderPGRDetail(id) {
  state.screen = 'pgr-detail';
  state.pgrId = id;
  const p = await DB.getPGR(id);
  if (!p) return renderPGRHome();
  const s = statusLabel(p);

  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-pgr-home" class="btn-link">← Voltar</button>
      <h1>${escapeHtml(p.data.empresa || 'PGR')}</h1>
    </div>
    <span class="badge ${s.cls}">${s.text}</span>
    ${p.syncError ? `<p class="erro-msg">${escapeHtml(p.syncError)}</p>` : ''}

    <div class="form-section">
      <label>Empresa / Contratada *
        <input type="text" id="pgr-empresa" value="${escapeHtml(p.data.empresa)}">
      </label>
      <label>Unidade / Projeto
        <input type="text" id="pgr-unidade" value="${escapeHtml(p.data.unidade)}">
      </label>
      <label>Responsável técnico pelo PGR
        <input type="text" id="pgr-responsavel" value="${escapeHtml(p.data.responsavelPGR)}">
      </label>
      <label>Data de elaboração / última revisão
        <input type="date" id="pgr-data-elaboracao" value="${escapeHtml(p.data.dataElaboracao)}">
      </label>
    </div>

    <div class="lista-participantes">
      <h3>Perigos identificados</h3>
      <p class="hint">Para cada perigo, avalie a severidade e a probabilidade antes das medidas de controle e, depois de definir as medidas propostas, avalie novamente o risco residual.</p>
      <div id="pgr-perigos-container"></div>
      <button type="button" id="btn-add-perigo-pgr" class="btn-secondary">+ Adicionar perigo</button>
    </div>

    <div class="form-actions">
      <button id="btn-relatorio-pgr" class="btn-secondary">Gerar PGR (PDF)</button>
    </div>
    <div class="form-actions">
      ${p.syncStatus !== 'synced' ? '<button id="btn-sync-one-pgr" class="btn-primary">Sincronizar este PGR</button>' : ''}
      <button id="btn-excluir-pgr-detail" class="btn-danger">Excluir PGR</button>
    </div>
  `;

  document.getElementById('btn-back-pgr-home').addEventListener('click', renderPGRHome);

  const inputEmpresa = document.getElementById('pgr-empresa');
  const inputUnidade = document.getElementById('pgr-unidade');
  const inputResponsavel = document.getElementById('pgr-responsavel');
  const inputData = document.getElementById('pgr-data-elaboracao');
  inputEmpresa.addEventListener('blur', async () => { p.data.empresa = inputEmpresa.value.trim(); await salvarPGR(p); });
  inputUnidade.addEventListener('blur', async () => { p.data.unidade = inputUnidade.value.trim(); await salvarPGR(p); });
  inputResponsavel.addEventListener('blur', async () => { p.data.responsavelPGR = inputResponsavel.value.trim(); await salvarPGR(p); });
  inputData.addEventListener('change', async () => { p.data.dataElaboracao = inputData.value; await salvarPGR(p); });

  const perigosContainer = document.getElementById('pgr-perigos-container');
  renderPerigosPGR(perigosContainer, p);

  document.getElementById('btn-add-perigo-pgr').addEventListener('click', async () => {
    p.data.perigos.push(novoPerigoPGR());
    await salvarPGR(p);
    renderPerigosPGR(perigosContainer, p);
  });

  document.getElementById('btn-relatorio-pgr').addEventListener('click', () => {
    const problemas = validarPGRParaRelatorio(p);
    if (problemas.length) {
      alert('Não é possível gerar o PGR ainda:\n\n- ' + problemas.join('\n- '));
      return;
    }
    renderPGRReport(id);
  });

  const btnSyncOne = document.getElementById('btn-sync-one-pgr');
  if (btnSyncOne) btnSyncOne.addEventListener('click', async () => {
    btnSyncOne.disabled = true;
    btnSyncOne.textContent = 'Sincronizando…';
    try {
      await Sync.syncPGR(id);
    } catch (e) {
      alert('Não foi possível sincronizar agora: ' + e.message);
    }
    renderPGRDetail(id);
    updateSyncBar();
  });

  document.getElementById('btn-excluir-pgr-detail').addEventListener('click', async () => {
    if (!confirm('Excluir este PGR do dispositivo? Esta ação não pode ser desfeita.')) return;
    await DB.deletePGR(id);
    renderPGRHome();
    updateSyncBar();
  });
}

function renderPerigoPGR(item, idx) {
  const antes = classificarRiscoPGR(item.severidade, item.probabilidade);
  const depois = classificarRiscoPGR(item.severidadeResidual, item.probabilidadeResidual);
  return `
    <div class="leitura-card" data-idx="${idx}">
      <div class="participante-linha">
        <label class="campo-leitura">Setor
          <input type="text" class="in-setor" value="${escapeHtml(item.setor)}">
        </label>
        <label class="campo-leitura">Função
          <input type="text" class="in-funcao" value="${escapeHtml(item.funcao)}">
        </label>
        <button type="button" class="btn-remover-item btn-remover-perigo" title="Remover perigo">✕</button>
      </div>
      <label>Perigo / Risco identificado *
        <input type="text" class="in-perigo" placeholder="Ex.: Queda de altura ao subir em telhado sem proteção coletiva" value="${escapeHtml(item.perigo)}">
      </label>
      <div class="participante-linha">
        <label class="campo-leitura">Fonte / Causa
          <input type="text" class="in-fonte" value="${escapeHtml(item.fonte)}">
        </label>
        <label class="campo-leitura">Tipo de risco
          <select class="in-tipo-risco">${TIPOS_RISCO_PGR.map((t) => `<option ${item.tipoRisco === t ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('')}</select>
        </label>
      </div>

      <h4>Avaliação do risco (antes das medidas)</h4>
      <div class="participante-linha">
        <label class="campo-leitura">Severidade
          <select class="in-severidade">${opcoesNiveisPGR(NIVEIS_SEVERIDADE_PGR, item.severidade)}</select>
        </label>
        <label class="campo-leitura">Probabilidade
          <select class="in-probabilidade">${opcoesNiveisPGR(NIVEIS_PROBABILIDADE_PGR, item.probabilidade)}</select>
        </label>
        <span class="badge ${antes.cls}">${antes.nivel}${antes.valor ? ' (' + antes.valor + ')' : ''}</span>
      </div>
      ${matrizRiscoMini(item.severidade, item.probabilidade)}

      <label>Medidas de controle existentes
        <textarea class="in-medidas-existentes" rows="2">${escapeHtml(item.medidasExistentes)}</textarea>
      </label>
      <label>Medidas de controle propostas
        <textarea class="in-medidas-propostas" rows="2">${escapeHtml(item.medidasPropostas)}</textarea>
      </label>

      <h4>Risco residual (depois das medidas propostas)</h4>
      <div class="participante-linha">
        <label class="campo-leitura">Severidade residual
          <select class="in-severidade-residual">${opcoesNiveisPGR(NIVEIS_SEVERIDADE_PGR, item.severidadeResidual)}</select>
        </label>
        <label class="campo-leitura">Probabilidade residual
          <select class="in-probabilidade-residual">${opcoesNiveisPGR(NIVEIS_PROBABILIDADE_PGR, item.probabilidadeResidual)}</select>
        </label>
        <span class="badge ${depois.cls}">${depois.nivel}${depois.valor ? ' (' + depois.valor + ')' : ''}</span>
      </div>
      ${matrizRiscoMini(item.severidadeResidual, item.probabilidadeResidual)}

      <div class="participante-linha">
        <label class="campo-leitura">Responsável pela ação
          <input type="text" class="in-responsavel-perigo" value="${escapeHtml(item.responsavel)}">
        </label>
        <label class="campo-leitura">Prazo
          <input type="date" class="in-prazo-perigo" value="${escapeHtml(item.prazo)}">
        </label>
        <label class="campo-leitura">Status
          <select class="in-status-perigo">
            <option ${item.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
            <option ${item.status === 'Em andamento' ? 'selected' : ''}>Em andamento</option>
            <option ${item.status === 'Concluída' ? 'selected' : ''}>Concluída</option>
          </select>
        </label>
      </div>
    </div>
  `;
}

function renderPerigosPGR(container, p) {
  const perigos = p.data.perigos;
  container.innerHTML = perigos.length
    ? perigos.map((item, idx) => renderPerigoPGR(item, idx)).join('')
    : '<p class="empty-state">Nenhum perigo cadastrado ainda.</p>';

  perigos.forEach((item, idx) => {
    const card = container.querySelector(`.leitura-card[data-idx="${idx}"]`);
    if (!card) return;

    const camposTexto = [
      ['.in-setor', 'setor'], ['.in-funcao', 'funcao'], ['.in-perigo', 'perigo'], ['.in-fonte', 'fonte'],
      ['.in-medidas-existentes', 'medidasExistentes'], ['.in-medidas-propostas', 'medidasPropostas'],
      ['.in-responsavel-perigo', 'responsavel']
    ];
    camposTexto.forEach(([seletor, campo]) => {
      const el = card.querySelector(seletor);
      if (!el) return;
      el.addEventListener('blur', async () => {
        item[campo] = el.value.trim ? el.value.trim() : el.value;
        await salvarPGR(p);
      });
    });

    card.querySelector('.in-tipo-risco').addEventListener('change', async (e) => {
      item.tipoRisco = e.target.value;
      await salvarPGR(p);
    });
    card.querySelector('.in-severidade').addEventListener('change', async (e) => {
      item.severidade = e.target.value;
      await salvarPGR(p);
      renderPerigosPGR(container, p);
    });
    card.querySelector('.in-probabilidade').addEventListener('change', async (e) => {
      item.probabilidade = e.target.value;
      await salvarPGR(p);
      renderPerigosPGR(container, p);
    });
    card.querySelector('.in-severidade-residual').addEventListener('change', async (e) => {
      item.severidadeResidual = e.target.value;
      await salvarPGR(p);
      renderPerigosPGR(container, p);
    });
    card.querySelector('.in-probabilidade-residual').addEventListener('change', async (e) => {
      item.probabilidadeResidual = e.target.value;
      await salvarPGR(p);
      renderPerigosPGR(container, p);
    });
    card.querySelector('.in-prazo-perigo').addEventListener('change', async (e) => {
      item.prazo = e.target.value;
      await salvarPGR(p);
    });
    card.querySelector('.in-status-perigo').addEventListener('change', async (e) => {
      item.status = e.target.value;
      await salvarPGR(p);
    });

    card.querySelector('.btn-remover-perigo').addEventListener('click', async () => {
      if (!confirm('Remover este perigo do PGR?')) return;
      p.data.perigos.splice(idx, 1);
      await salvarPGR(p);
      renderPerigosPGR(container, p);
    });
  });
}

/* ---------------- VALIDAÇÃO PARA O RELATÓRIO ---------------- */

function validarPGRParaRelatorio(p) {
  const problemas = [];
  if (!p.data.empresa) {
    problemas.push('O nome da empresa não foi informado.');
  }
  if (!p.data.perigos.length) {
    problemas.push('Nenhum perigo foi cadastrado.');
  }
  p.data.perigos.forEach((item, idx) => {
    const num = idx + 1;
    if (!item.perigo) problemas.push(`Perigo ${num} está sem descrição.`);
    if (!item.severidade || !item.probabilidade) problemas.push(`Perigo ${num} ("${item.perigo || 'sem descrição'}") está sem avaliação de severidade/probabilidade.`);
  });
  return problemas;
}

/* ---------------- RELATÓRIO (impressão / PDF) ---------------- */

function gerarCodigoPGR(p) {
  const curto = p.id.split('-')[0].toUpperCase();
  return `PGR-${curto}`;
}

function montarResumoRiscosPGR(perigos) {
  const contagem = { Baixo: 0, Moderado: 0, Alto: 0, Crítico: 0 };
  perigos.forEach((item) => {
    const c = classificarRiscoPGR(item.severidade, item.probabilidade);
    if (contagem[c.nivel] !== undefined) contagem[c.nivel]++;
  });
  return `
    <ul class="resumo-stats">
      <li><span class="badge badge-ok">Baixo: ${contagem.Baixo}</span></li>
      <li><span class="badge badge-pendente">Moderado: ${contagem.Moderado}</span></li>
      <li><span class="badge badge-alto">Alto: ${contagem.Alto}</span></li>
      <li><span class="badge badge-erro">Crítico: ${contagem.Crítico}</span></li>
    </ul>
  `;
}

function montarInventarioRiscosPGR(perigos) {
  if (!perigos.length) return '<p class="rep-hint">Nenhum perigo cadastrado.</p>';
  const linhas = perigos.map((item, idx) => {
    const antes = classificarRiscoPGR(item.severidade, item.probabilidade);
    const depois = classificarRiscoPGR(item.severidadeResidual, item.probabilidadeResidual);
    return `
      <tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(item.perigo)}</td>
        <td>${escapeHtml(item.tipoRisco)}</td>
        <td>${escapeHtml(item.setor || '—')}${item.funcao ? ' / ' + escapeHtml(item.funcao) : ''}</td>
        <td>${escapeHtml(item.medidasExistentes || '—')}</td>
        <td class="rep-td-status rep-status-${antes.cls === 'badge-ok' ? 'ok' : antes.cls === 'badge-pendente' ? 'na' : 'nc'}">${antes.nivel}${antes.valor ? ' (' + antes.valor + ')' : ''}</td>
        <td class="rep-td-status rep-status-${depois.cls === 'badge-ok' ? 'ok' : depois.cls === 'badge-pendente' ? 'na' : 'nc'}">${depois.nivel}${depois.valor ? ' (' + depois.valor + ')' : ''}</td>
      </tr>
    `;
  }).join('');
  return `
    <table class="rep-table">
      <thead><tr><th>Nº</th><th>Perigo / Risco</th><th>Tipo</th><th>Setor / Função</th><th>Medidas de controle existentes</th><th>Risco inicial</th><th>Risco residual</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
  `;
}

function montarPlanoAcaoPGR(perigos) {
  const comAcao = perigos
    .map((item, idx) => ({ item, numero: idx + 1 }))
    .filter(({ item }) => item.medidasPropostas || item.responsavel || item.prazo);
  if (!comAcao.length) return '<p class="rep-hint">Nenhuma ação corretiva ou preventiva registrada.</p>';
  const linhas = comAcao.map(({ item, numero }) => `
    <tr>
      <td>${numero}</td>
      <td>${escapeHtml(item.medidasPropostas || '—')}</td>
      <td>${escapeHtml(item.responsavel || '—')}</td>
      <td>${item.prazo ? formatarDataBR(item.prazo) : '—'}</td>
      <td>${escapeHtml(item.status || '—')}</td>
    </tr>
  `).join('');
  return `
    <table class="rep-table">
      <thead><tr><th>Nº</th><th>Ação corretiva / preventiva</th><th>Responsável</th><th>Prazo</th><th>Status</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
    <p class="rep-hint">O número da ação corresponde ao número do perigo no Inventário de Riscos.</p>
  `;
}

function ligarAssinaturasPGR(p, id) {
  view.querySelectorAll('.btn-assinar').forEach((btn) => {
    btn.addEventListener('click', () => {
      const campo = btn.dataset.campo;
      const pad = view.querySelector(`.rep-assinatura-pad[data-campo="${campo}"]`);
      pad.hidden = false;
      btn.closest('.rep-assinatura-controles').hidden = true;
      iniciarCanvasAssinaturaRelatorio(pad.querySelector('canvas'));
    });
  });
  view.querySelectorAll('.btn-cancelar-pad').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pad = btn.closest('.rep-assinatura-pad');
      pad.hidden = true;
      pad.previousElementSibling.hidden = false;
    });
  });
  view.querySelectorAll('.btn-limpar-pad').forEach((btn) => {
    btn.addEventListener('click', () => {
      iniciarCanvasAssinaturaRelatorio(btn.closest('.rep-assinatura-pad').querySelector('canvas'));
    });
  });
  view.querySelectorAll('.btn-confirmar-pad').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const pad = btn.closest('.rep-assinatura-pad');
      const canvas = pad.querySelector('canvas');
      const campo = pad.dataset.campo;
      if (!canvas.dataset.assinado) {
        alert('Desenhe a assinatura no quadro antes de confirmar.');
        return;
      }
      const dataUrl = canvas.toDataURL('image/png');
      p.data.assinaturas = p.data.assinaturas || {};
      p.data.assinaturas[campo] = dataUrl;
      await salvarPGR(p);
      renderPGRReport(id);
    });
  });
}

async function renderPGRReport(id) {
  state.screen = 'pgr-report';
  const p = await DB.getPGR(id);
  if (!p) return renderPGRHome();
  p.data.assinaturas = p.data.assinaturas || {};

  const codigo = gerarCodigoPGR(p);
  const geradoEm = new Date().toLocaleString('pt-BR');
  const inventarioHtml = montarInventarioRiscosPGR(p.data.perigos);
  const planoAcaoHtml = montarPlanoAcaoPGR(p.data.perigos);

  view.innerHTML = `
    <div class="screen-header no-print">
      <button id="btn-back-pgr-detail" class="btn-link">← Voltar</button>
      <h1>Programa de Gerenciamento de Riscos</h1>
    </div>
    <div class="form-actions no-print" style="margin-bottom:12px;">
      <button id="btn-imprimir-pgr" class="btn-primary">Imprimir / Salvar PDF</button>
    </div>

    <article class="rep-doc">
      <header class="rep-cabecalho">
        <div class="rep-titulo">
          <img src="icons/icon-192.png" alt="" class="rep-logo">
          <div>
            <h2>PROGRAMA DE GERENCIAMENTO DE RISCOS (PGR)</h2>
            <p>${escapeHtml(p.data.empresa)}</p>
          </div>
        </div>
        <table class="rep-controle">
          <tr><th>Código</th><td>${codigo}</td></tr>
          <tr><th>Emitido em</th><td>${geradoEm}</td></tr>
        </table>
      </header>

      <section class="rep-secao">
        <h3>1. Identificação</h3>
        <table class="rep-tabela-ident">
          <tr><th>Empresa</th><td>${escapeHtml(p.data.empresa)}</td><th>Unidade</th><td>${escapeHtml(p.data.unidade || '—')}</td></tr>
          <tr><th>Responsável técnico</th><td>${escapeHtml(p.data.responsavelPGR || '—')}</td><th>Data de elaboração</th><td>${p.data.dataElaboracao ? formatarDataBR(p.data.dataElaboracao) : '—'}</td></tr>
        </table>
      </section>

      <section class="rep-secao">
        <h3>2. Resumo dos riscos mapeados</h3>
        ${montarResumoRiscosPGR(p.data.perigos)}
      </section>

      <section class="rep-secao rep-quebra">
        <h3>3. Inventário de Riscos</h3>
        ${inventarioHtml}
      </section>

      <section class="rep-secao rep-quebra">
        <h3>4. Plano de Ação</h3>
        ${planoAcaoHtml}
      </section>

      <section class="rep-secao rep-assinaturas">
        <h3>5. Responsável técnico</h3>
        <div class="rep-assinatura-grid">
          ${blocoAssinatura(p, 'responsavelPGR', 'Responsável técnico pelo PGR', p.data.responsavelPGR)}
        </div>
      </section>

      <footer class="rep-rodape">
        Documento ${codigo} — gerado automaticamente pelo aplicativo Inspeções SSMA em ${geradoEm}.
      </footer>
    </article>
  `;

  document.getElementById('btn-back-pgr-detail').addEventListener('click', () => renderPGRDetail(id));
  document.getElementById('btn-imprimir-pgr').addEventListener('click', () => window.print());
  ligarAssinaturasPGR(p, id);
}
