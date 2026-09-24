/* Módulo Diagnóstico de Gestão de SSMA. Avalia, por categoria, o grau de
 * implementação do sistema de gestão (documentação, saúde ocupacional,
 * treinamentos, EPI/EPC, riscos, CIPA, emergência, acidentes), calculando
 * um percentual de conformidade por categoria e um índice geral — segue os
 * mesmos padrões offline-first, fotos e assinatura já usados nos módulos
 * de Inspeções e DDS. */

const DIAG_STEPS = ['Identificação', 'Diagnóstico', 'Fechamento', 'Revisão'];
const PESO_RESPOSTA_DIAG = { 'Atende': 1, 'Atende Parcialmente': 0.5, 'Não Atende': 0 };

function novoItemDiagnostico(texto) {
  return { id: uuid(), texto, resposta: '', observacao: '', personalizado: false };
}

function gerarCategoriasDiagnostico() {
  return DIAGNOSTICO_CATEGORIAS.map((cat) => ({
    id: uuid(),
    nome: cat.nome,
    itens: cat.itens.map((texto) => novoItemDiagnostico(texto))
  }));
}

function novoDiagnosticoVazio() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return {
    id: uuid(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    completo: false,
    syncStatus: 'pendente',
    syncError: '',
    metaSynced: false,
    remoteRef: null,
    data: {
      identificacao: {
        data: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
        hora: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
        empresa: '',
        unidade: '',
        escopo: '',
        responsavelDiagnostico: '',
        responsavelArea: ''
      },
      categorias: gerarCategoriasDiagnostico(),
      planoAcao: '',
      observacoesFinais: '',
      fotosComplementaresIds: [],
      assinaturas: {
        responsavelDiagnostico: '',
        responsavelArea: ''
      },
      localizacao: null
    }
  };
}

async function salvarRascunhoDiagnostico(diag) {
  diag.updatedAt = Date.now();
  await DB.putDiagnostico(diag);
}

/* ---------------- CÁLCULO DE SCORE ---------------- */

function calcularScoreCategoria(itens) {
  const aplicaveis = itens.filter((i) => i.resposta && i.resposta !== 'Não se Aplica');
  if (!aplicaveis.length) return null;
  const soma = aplicaveis.reduce((s, i) => s + (PESO_RESPOSTA_DIAG[i.resposta] ?? 0), 0);
  return Math.round((soma / aplicaveis.length) * 100);
}

function calcularScoreGeral(categorias) {
  const scores = categorias.map((c) => calcularScoreCategoria(c.itens)).filter((s) => s !== null);
  if (!scores.length) return null;
  return Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
}

function classificarScore(score) {
  if (score === null) return { text: 'Sem dados', cls: 'badge-rascunho' };
  if (score >= 80) return { text: score + '% — Adequado', cls: 'badge-ok' };
  if (score >= 50) return { text: score + '% — Requer atenção', cls: 'badge-pendente' };
  return { text: score + '% — Crítico', cls: 'badge-erro' };
}

/* ---------------- HOME DO MÓDULO ---------------- */

async function renderDiagHome() {
  state.screen = 'diag-home';
  setActiveTab('diagnostico');
  const registros = await DB.getAllDiagnosticos();

  const itemsHtml = registros.length
    ? registros.map((d) => {
        const s = statusLabel(d);
        const ident = d.data.identificacao;
        const classificacao = d.completo ? classificarScore(calcularScoreGeral(d.data.categorias)) : null;
        return `
          <li class="insp-card" data-id="${d.id}">
            <div class="insp-card-main">
              <div class="insp-card-title">${escapeHtml(ident.escopo || 'Diagnóstico de SSMA')}</div>
              <div class="insp-card-sub">${escapeHtml(ident.empresa || '')} · ${escapeHtml(ident.unidade || '')}</div>
              <div class="insp-card-sub">${escapeHtml(ident.data || '')} ${escapeHtml(ident.hora || '')}</div>
            </div>
            <div class="insp-card-side">
              <span class="badge ${s.cls}">${s.text}</span>
              ${classificacao ? `<span class="badge ${classificacao.cls}">${classificacao.text}</span>` : ''}
              <button type="button" class="btn-excluir-card" data-id="${d.id}" title="Excluir">🗑</button>
            </div>
          </li>
        `;
      }).join('')
    : '<li class="empty-state">Nenhum diagnóstico registrado ainda. Toque em "Novo diagnóstico" para começar.</li>';

  view.innerHTML = `
    <div class="screen-header">
      <h1>Diagnóstico de Gestão SSMA</h1>
      <button id="btn-new-diag" class="btn-primary">+ Novo diagnóstico</button>
    </div>
    <ul class="insp-list">${itemsHtml}</ul>
  `;

  document.getElementById('btn-new-diag').addEventListener('click', startNewDiagnostico);
  view.querySelectorAll('.insp-card').forEach((el) => {
    el.addEventListener('click', () => openDiagnostico(el.dataset.id));
  });
  view.querySelectorAll('.btn-excluir-card').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      excluirDiagnostico(btn.dataset.id);
    });
  });
}

async function excluirDiagnostico(id) {
  const diag = await DB.getDiagnostico(id);
  if (!diag) return;
  const rotulo = diag.completo ? 'este diagnóstico' : 'este rascunho de diagnóstico';
  if (!confirm(`Excluir ${rotulo} e todas as suas fotos do dispositivo? Esta ação não pode ser desfeita.`)) return;
  const photos = await DB.getPhotosByInspection(id);
  for (const p of photos) await DB.deletePhoto(p.id);
  await DB.deleteDiagnostico(id);
  renderDiagHome();
  updateSyncBar();
}

async function openDiagnostico(id) {
  const diag = await DB.getDiagnostico(id);
  if (!diag.completo) {
    state.diagId = id;
    state.step = 0;
    renderDiagForm();
  } else {
    renderDiagDetail(id);
  }
}

async function startNewDiagnostico() {
  const diag = novoDiagnosticoVazio();
  await DB.putDiagnostico(diag);
  state.diagId = diag.id;
  state.step = 0;
  renderDiagForm();
  localizacoesPendentes[diag.id] = capturarLocalizacao();
}

/* ---------------- FORMULÁRIO (MULTI-ETAPAS) ---------------- */

async function renderDiagForm() {
  state.screen = 'diag-form';
  const diag = await DB.getDiagnostico(state.diagId);

  const stepsNav = DIAG_STEPS.map((label, idx) => `
    <div class="step-dot ${idx === state.step ? 'active' : ''} ${idx < state.step ? 'done' : ''}">${idx + 1}</div>
  `).join('');

  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-diag-home" class="btn-link">← Voltar</button>
      <h1>Diagnóstico de SSMA</h1>
    </div>
    <div class="steps-nav">${stepsNav}</div>
    <div id="diag-step-content"></div>
  `;

  document.getElementById('btn-back-diag-home').addEventListener('click', async () => {
    await salvarRascunhoDiagnostico(diag);
    renderDiagHome();
  });

  const content = document.getElementById('diag-step-content');
  if (state.step === 0) renderDiagStepIdentificacao(content, diag);
  else if (state.step === 1) renderDiagStepChecklist(content, diag);
  else if (state.step === 2) renderDiagStepFechamento(content, diag);
  else renderDiagStepRevisao(content, diag);
}

/* ---- Passo 1: Identificação ---- */
function renderDiagStepIdentificacao(content, diag) {
  const id = diag.data.identificacao;
  content.innerHTML = `
    <form id="form-diag-ident" class="form-section">
      <label>Data *
        <input type="date" name="data" required value="${escapeHtml(id.data)}">
      </label>
      <label>Hora *
        <input type="time" name="hora" required value="${escapeHtml(id.hora)}">
      </label>
      <label>Empresa / Contratada *
        <input type="text" name="empresa" required value="${escapeHtml(id.empresa)}">
      </label>
      <label>Unidade / Projeto / Contrato
        <input type="text" name="unidade" value="${escapeHtml(id.unidade)}">
      </label>
      <label>Escopo do diagnóstico *
        <input type="text" name="escopo" required placeholder="Ex.: Toda a unidade, obra X, setor Y" value="${escapeHtml(id.escopo)}">
      </label>
      <label>Responsável pelo diagnóstico *
        <input type="text" name="responsavelDiagnostico" required value="${escapeHtml(id.responsavelDiagnostico)}">
      </label>
      <label>Responsável pela área
        <input type="text" name="responsavelArea" value="${escapeHtml(id.responsavelArea)}">
      </label>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Avançar →</button>
      </div>
    </form>
  `;

  const form = document.getElementById('form-diag-ident');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    diag.data.identificacao = {
      data: fd.get('data'),
      hora: fd.get('hora'),
      empresa: fd.get('empresa').trim(),
      unidade: (fd.get('unidade') || '').trim(),
      escopo: fd.get('escopo').trim(),
      responsavelDiagnostico: fd.get('responsavelDiagnostico').trim(),
      responsavelArea: (fd.get('responsavelArea') || '').trim()
    };
    await salvarRascunhoDiagnostico(diag);
    state.step = 1;
    renderDiagForm();
  });
}

/* ---- Passo 2: Diagnóstico (categorias) ---- */
function renderDiagStepChecklist(content, diag) {
  content.innerHTML = `
    <div id="diag-categorias"></div>
    <div class="form-actions">
      <button id="btn-diag-checklist-back" class="btn-link">← Voltar</button>
      <button id="btn-diag-checklist-next" class="btn-primary">Avançar →</button>
    </div>
  `;

  const container = document.getElementById('diag-categorias');
  renderDiagCategorias(container, diag);

  document.getElementById('btn-diag-checklist-back').addEventListener('click', async () => {
    await salvarRascunhoDiagnostico(diag);
    state.step = 0;
    renderDiagForm();
  });

  document.getElementById('btn-diag-checklist-next').addEventListener('click', async () => {
    await salvarRascunhoDiagnostico(diag);
    state.step = 2;
    renderDiagForm();
  });
}

function renderDiagItem(item, catIdx, itemIdx) {
  const respostas = ['Atende', 'Atende Parcialmente', 'Não Atende', 'Não se Aplica'];
  const classeMap = { 'Atende': 'ok', 'Atende Parcialmente': 'parcial', 'Não Atende': 'nc', 'Não se Aplica': 'na' };
  const radiosHtml = respostas.map((r) => `
    <label class="radio-pill radio-${classeMap[r]}">
      <input type="radio" name="diag-resp-${catIdx}-${itemIdx}" value="${r}" ${item.resposta === r ? 'checked' : ''}>
      ${r}
    </label>
  `).join('');

  const destacar = item.resposta === 'Não Atende';

  return `
    <div class="checklist-card ${destacar ? 'destaque-nc' : ''}" data-cat="${catIdx}" data-idx="${itemIdx}">
      <div class="checklist-question">${escapeHtml(item.texto)}</div>
      <div class="radio-group">${radiosHtml}</div>
      <div class="checklist-details">
        <label>Observação
          <textarea class="txt-observacao" rows="2">${escapeHtml(item.observacao)}</textarea>
        </label>
      </div>
    </div>
  `;
}

function renderDiagCategorias(container, diag) {
  container.innerHTML = diag.data.categorias.map((cat, catIdx) => {
    const score = calcularScoreCategoria(cat.itens);
    return `
      <div class="diag-categoria">
        <div class="diag-categoria-header">
          <h3>${escapeHtml(cat.nome)}</h3>
          ${score !== null ? `<span class="diag-score-mini">${score}%</span>` : ''}
        </div>
        <div class="checklist">
          ${cat.itens.map((item, itemIdx) => renderDiagItem(item, catIdx, itemIdx)).join('')}
        </div>
      </div>
    `;
  }).join('');

  diag.data.categorias.forEach((cat, catIdx) => {
    cat.itens.forEach((item, itemIdx) => {
      const card = container.querySelector(`.checklist-card[data-cat="${catIdx}"][data-idx="${itemIdx}"]`);
      if (!card) return;

      card.querySelectorAll('input[type=radio]').forEach((radio) => {
        radio.addEventListener('change', async () => {
          item.resposta = radio.value;
          await salvarRascunhoDiagnostico(diag);
          renderDiagCategorias(container, diag);
        });
      });

      const obs = card.querySelector('.txt-observacao');
      if (obs) obs.addEventListener('blur', async () => {
        item.observacao = obs.value;
        await salvarRascunhoDiagnostico(diag);
      });
    });
  });
}

/* ---- Passo 3: Fechamento ---- */
function renderDiagStepFechamento(content, diag) {
  const d = diag.data;
  content.innerHTML = `
    <form id="form-diag-fechamento" class="form-section">
      <label>Plano de ação para os pontos não atendidos
        <textarea name="planoAcao" rows="4">${escapeHtml(d.planoAcao)}</textarea>
      </label>
      <label>Observações finais
        <textarea name="observacoesFinais" rows="3">${escapeHtml(d.observacoesFinais)}</textarea>
      </label>

      <label>Evidência fotográfica complementar</label>
      <div class="foto-botoes">
        <label class="file-label">📷 Tirar foto
          <input type="file" accept="image/*" capture="environment" id="input-foto-diag-camera">
        </label>
        <label class="file-label">🖼️ Da galeria
          <input type="file" accept="image/*" multiple id="input-foto-diag-galeria">
        </label>
      </div>
      <div class="thumbs" id="thumbs-diag"></div>

      <div class="form-actions">
        <button type="button" id="btn-diag-fechamento-back" class="btn-link">← Voltar</button>
        <button type="submit" class="btn-primary">Avançar →</button>
      </div>
    </form>
  `;

  async function refreshThumbsDiag() {
    const el = document.getElementById('thumbs-diag');
    await renderThumbnails(el, d.fotosComplementaresIds);
    el.querySelectorAll('.btn-remover-foto').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const photoId = btn.dataset.photoId;
        await DB.deletePhoto(photoId);
        d.fotosComplementaresIds = d.fotosComplementaresIds.filter((pid) => pid !== photoId);
        await salvarRascunhoDiagnostico(diag);
        refreshThumbsDiag();
      });
    });
  }
  refreshThumbsDiag();

  ['input-foto-diag-camera', 'input-foto-diag-galeria'].forEach((elId) => {
    document.getElementById(elId).addEventListener('change', async (e) => {
      await adicionarFotos(diag, d.fotosComplementaresIds, e.target.files, 'diagnostico');
      await salvarRascunhoDiagnostico(diag);
      refreshThumbsDiag();
    });
  });

  const form = document.getElementById('form-diag-fechamento');
  function coletarCampos() {
    const fd = new FormData(form);
    d.planoAcao = fd.get('planoAcao') || '';
    d.observacoesFinais = fd.get('observacoesFinais') || '';
  }

  document.getElementById('btn-diag-fechamento-back').addEventListener('click', async () => {
    coletarCampos();
    await salvarRascunhoDiagnostico(diag);
    state.step = 1;
    renderDiagForm();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    coletarCampos();
    await salvarRascunhoDiagnostico(diag);
    state.step = 3;
    renderDiagForm();
  });
}

/* ---- Passo 4: Revisão e salvar ---- */
function renderDiagStepRevisao(content, diag) {
  const categorias = diag.data.categorias;
  const scoreGeral = calcularScoreGeral(categorias);
  const classificacao = classificarScore(scoreGeral);
  const totalItens = categorias.reduce((s, c) => s + c.itens.length, 0);
  const naoAtende = categorias.reduce((s, c) => s + c.itens.filter((i) => i.resposta === 'Não Atende').length, 0);
  const semResposta = categorias.reduce((s, c) => s + c.itens.filter((i) => !i.resposta).length, 0);

  const categoriasHtml = categorias.map((c) => {
    const score = calcularScoreCategoria(c.itens);
    return `<li>${escapeHtml(c.nome)}: <strong>${score !== null ? score + '%' : 'Sem dados'}</strong></li>`;
  }).join('');

  content.innerHTML = `
    <div class="resumo">
      <h2>Resumo do diagnóstico</h2>
      <p>${escapeHtml(diag.data.identificacao.empresa)} · ${escapeHtml(diag.data.identificacao.escopo)}</p>
      <p>${escapeHtml(diag.data.identificacao.data)} ${escapeHtml(diag.data.identificacao.hora)}</p>
      <p>Índice geral de conformidade: <span class="badge ${classificacao.cls}">${classificacao.text}</span></p>
      <ul class="resumo-stats">
        <li>Itens avaliados: ${totalItens}</li>
        <li class="nc">Não atende: ${naoAtende}</li>
        ${semResposta ? `<li class="alerta">${semResposta} item(ns) sem resposta</li>` : ''}
      </ul>
      <ul class="resumo-categorias">${categoriasHtml}</ul>
    </div>
    <div class="form-actions">
      <button id="btn-diag-revisao-back" class="btn-link">← Voltar</button>
      <button id="btn-diag-concluir" class="btn-primary">Concluir e salvar</button>
    </div>
    <p class="hint">O diagnóstico fica salvo no aparelho mesmo sem internet. Assim que houver conexão, é enviado automaticamente.</p>
  `;

  document.getElementById('btn-diag-revisao-back').addEventListener('click', () => {
    state.step = 2;
    renderDiagForm();
  });

  document.getElementById('btn-diag-concluir').addEventListener('click', async () => {
    if (semResposta > 0 && !confirm(`Existem ${semResposta} item(ns) sem resposta. Deseja concluir mesmo assim?`)) {
      return;
    }
    await aplicarLocalizacaoPendente(diag);
    diag.completo = true;
    diag.syncStatus = 'pendente';
    await salvarRascunhoDiagnostico(diag);
    await refreshChrome();
    renderDiagHome();
    Sync.syncAll().catch(() => {});
  });
}

function validarDiagParaRelatorio(diag) {
  const problemas = [];
  diag.data.categorias.forEach((cat) => {
    cat.itens.forEach((item, idx) => {
      const num = idx + 1;
      if (!item.resposta) {
        problemas.push(`"${cat.nome}", item ${num}: está sem resposta.`);
      } else if (item.resposta === 'Não Atende' && !item.observacao) {
        problemas.push(`"${cat.nome}", item ${num}: está Não Atende, mas não tem observação.`);
      }
    });
  });
  return problemas;
}

/* ---------------- DETALHE ---------------- */

async function renderDiagDetail(id) {
  state.screen = 'diag-detail';
  state.diagId = id;
  const diag = await DB.getDiagnostico(id);
  const photos = await DB.getPhotosByInspection(id);
  const s = statusLabel(diag);
  const ident = diag.data.identificacao;
  const classificacao = classificarScore(calcularScoreGeral(diag.data.categorias));

  const categoriasHtml = diag.data.categorias.map((cat) => {
    const score = calcularScoreCategoria(cat.itens);
    const critScore = classificarScore(score);
    const naoAtende = cat.itens.filter((i) => i.resposta === 'Não Atende');
    return `
      <div class="detail-block">
        <div class="diag-categoria-header">
          <strong>${escapeHtml(cat.nome)}</strong>
          <span class="badge ${critScore.cls}">${score !== null ? score + '%' : 'Sem dados'}</span>
        </div>
        ${naoAtende.length ? `<p class="detail-obs">Pontos críticos: ${naoAtende.map((i) => escapeHtml(i.texto)).join('; ')}</p>` : ''}
      </div>
    `;
  }).join('');

  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-diag-home" class="btn-link">← Voltar</button>
      <h1>Diagnóstico de SSMA</h1>
    </div>
    <span class="badge ${s.cls}">${s.text}</span>
    <span class="badge ${classificacao.cls}">${classificacao.text}</span>
    ${diag.syncError ? `<p class="erro-msg">${escapeHtml(diag.syncError)}</p>` : ''}
    <div class="detail-block">
      <p>${escapeHtml(ident.empresa)} · ${escapeHtml(ident.unidade)} · ${escapeHtml(ident.escopo)}</p>
      <p>${escapeHtml(ident.data)} ${escapeHtml(ident.hora)} · Responsável: ${escapeHtml(ident.responsavelDiagnostico)}</p>
    </div>
    <h3>Categorias avaliadas</h3>
    ${categoriasHtml}
    ${diag.data.planoAcao ? `<h3>Plano de ação</h3><div class="detail-block"><p>${escapeHtml(diag.data.planoAcao)}</p></div>` : ''}
    ${diag.data.observacoesFinais ? `<h3>Observações</h3><div class="detail-block"><p>${escapeHtml(diag.data.observacoesFinais)}</p></div>` : ''}
    ${photos.length ? `<h3>Evidência fotográfica</h3><div class="thumbs">${photos.map((p) => `<div class="thumb"><img src="${URL.createObjectURL(p.blob)}"><span class="thumb-sync ${p.synced ? 'ok' : ''}">${p.synced ? '✓' : '⏳'}</span></div>`).join('')}</div>` : ''}
    <div class="form-actions">
      <button id="btn-editar-diag" class="btn-secondary">✏️ Editar diagnóstico</button>
      <button id="btn-relatorio-diag" class="btn-secondary">Gerar relatório (PDF)</button>
    </div>
    <div class="form-actions">
      ${diag.syncStatus !== 'synced' ? '<button id="btn-sync-one-diag" class="btn-primary">Sincronizar este diagnóstico</button>' : ''}
      <button id="btn-excluir-diag" class="btn-danger">Excluir diagnóstico</button>
    </div>
  `;

  document.getElementById('btn-back-diag-home').addEventListener('click', renderDiagHome);
  document.getElementById('btn-relatorio-diag').addEventListener('click', () => {
    const problemas = validarDiagParaRelatorio(diag);
    if (problemas.length) {
      alert('Não é possível gerar o relatório ainda:\n\n- ' + problemas.join('\n- ') + '\n\nToque em "Editar diagnóstico" para corrigir.');
      return;
    }
    renderDiagReport(id);
  });
  document.getElementById('btn-editar-diag').addEventListener('click', async () => {
    diag.metaSynced = false;
    diag.syncStatus = 'pendente';
    await salvarRascunhoDiagnostico(diag);
    state.diagId = id;
    state.step = 0;
    renderDiagForm();
  });

  const btnSyncOne = document.getElementById('btn-sync-one-diag');
  if (btnSyncOne) btnSyncOne.addEventListener('click', async () => {
    btnSyncOne.disabled = true;
    btnSyncOne.textContent = 'Sincronizando…';
    try {
      await Sync.syncDiagnostico(id);
    } catch (e) {
      alert('Não foi possível sincronizar agora: ' + e.message);
    }
    renderDiagDetail(id);
    updateSyncBar();
  });

  document.getElementById('btn-excluir-diag').addEventListener('click', async () => {
    if (!confirm('Excluir este diagnóstico e todas as suas fotos do dispositivo? Esta ação não pode ser desfeita.')) return;
    for (const p of photos) await DB.deletePhoto(p.id);
    await DB.deleteDiagnostico(id);
    renderDiagHome();
    updateSyncBar();
  });
}

/* ---------------- RELATÓRIO (impressão / PDF) ---------------- */

function gerarCodigoDocumentoDiag(diag) {
  const data = (diag.data.identificacao.data || '').replace(/-/g, '');
  const curto = diag.id.split('-')[0].toUpperCase();
  return `DIAG-${data || 'SDATA'}-${curto}`;
}

async function montarFotosDiag(fotosIds) {
  if (!fotosIds || !fotosIds.length) {
    return '<p class="rep-hint">Nenhuma evidência fotográfica anexada.</p>';
  }
  const fotosHtml = (await Promise.all(fotosIds.map(montarBlocoFoto))).join('');
  return `<div class="rep-fotos-grid">${fotosHtml}</div>`;
}

function montarResumoCategoriasDiag(categorias) {
  const linhas = categorias.map((cat) => {
    const score = calcularScoreCategoria(cat.itens);
    const cls = score === null ? '' : score >= 80 ? 'rep-status-ok' : score >= 50 ? '' : 'rep-status-nc';
    return `
      <tr>
        <td>${escapeHtml(cat.nome)}</td>
        <td class="rep-td-status ${cls}">${score !== null ? score + '%' : '—'}</td>
      </tr>
    `;
  }).join('');
  return `
    <table class="rep-table">
      <thead><tr><th>Categoria</th><th>Conformidade</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
  `;
}

function montarGapsDiag(categorias) {
  const gaps = [];
  categorias.forEach((cat) => {
    cat.itens.forEach((item) => {
      if (item.resposta === 'Não Atende' || item.resposta === 'Atende Parcialmente') {
        gaps.push({ categoria: cat.nome, item });
      }
    });
  });
  if (!gaps.length) {
    return '<p class="rep-hint">Nenhum ponto crítico ou parcial identificado nesta avaliação.</p>';
  }
  const linhas = gaps.map((g) => `
    <tr>
      <td>${escapeHtml(g.categoria)}</td>
      <td>${escapeHtml(g.item.texto)}</td>
      <td class="rep-td-status ${g.item.resposta === 'Não Atende' ? 'rep-status-nc' : ''}">${escapeHtml(g.item.resposta)}</td>
      <td>${escapeHtml(g.item.observacao || '—')}</td>
    </tr>
  `).join('');
  return `
    <table class="rep-table">
      <thead><tr><th>Categoria</th><th>Item</th><th>Situação</th><th>Observação</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
  `;
}

function ligarAssinaturasDiag(diag, id) {
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
      const pad = btn.closest('.rep-assinatura-pad');
      iniciarCanvasAssinaturaRelatorio(pad.querySelector('canvas'));
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
      diag.data.assinaturas = diag.data.assinaturas || {};
      diag.data.assinaturas[campo] = dataUrl;
      await salvarRascunhoDiagnostico(diag);
      renderDiagReport(id);
    });
  });
}

async function renderDiagReport(id) {
  state.screen = 'diag-report';
  const diag = await DB.getDiagnostico(id);
  if (!diag) return renderDiagHome();
  diag.data.assinaturas = diag.data.assinaturas || {};

  const ident = diag.data.identificacao;
  const codigo = gerarCodigoDocumentoDiag(diag);
  const geradoEm = new Date().toLocaleString('pt-BR');
  const scoreGeral = calcularScoreGeral(diag.data.categorias);
  const classificacao = classificarScore(scoreGeral);
  const fotosHtml = await montarFotosDiag(diag.data.fotosComplementaresIds);

  let numSecao = 4;
  const numPlano = diag.data.planoAcao ? numSecao++ : null;
  const numFotos = numSecao++;
  const numObs = diag.data.observacoesFinais ? numSecao++ : null;

  view.innerHTML = `
    <div class="screen-header no-print">
      <button id="btn-back-diag-detail" class="btn-link">← Voltar</button>
      <h1>Relatório de Diagnóstico</h1>
    </div>
    <div class="form-actions no-print" style="margin-bottom:12px;">
      <button id="btn-imprimir-diag" class="btn-primary">Imprimir / Salvar PDF</button>
    </div>

    <article class="rep-doc">
      <header class="rep-cabecalho">
        <div class="rep-titulo">
          <img src="icons/icon-192.png" alt="" class="rep-logo">
          <div>
            <h2>DIAGNÓSTICO DE GESTÃO SSMA</h2>
            <p>${escapeHtml(ident.escopo)}</p>
          </div>
        </div>
        <table class="rep-controle">
          <tr><th>Código</th><td>${codigo}</td></tr>
          <tr><th>Revisão</th><td>00</td></tr>
          <tr><th>Emitido em</th><td>${geradoEm}</td></tr>
        </table>
      </header>

      <section class="rep-secao">
        <h3>1. Identificação</h3>
        <table class="rep-tabela-ident">
          <tr><th>Empresa / Contratada</th><td>${escapeHtml(ident.empresa)}</td><th>Unidade / Projeto</th><td>${escapeHtml(ident.unidade || '—')}</td></tr>
          <tr><th>Escopo</th><td colspan="3">${escapeHtml(ident.escopo)}</td></tr>
          <tr><th>Data</th><td>${formatarDataBR(ident.data)}</td><th>Hora</th><td>${escapeHtml(ident.hora)}</td></tr>
          <tr><th>Responsável pelo diagnóstico</th><td>${escapeHtml(ident.responsavelDiagnostico)}</td><th>Responsável da área</th><td>${escapeHtml(ident.responsavelArea || '—')}</td></tr>
        </table>
        ${montarLocalizacaoRelatorio(diag.data.localizacao)}
      </section>

      <section class="rep-secao">
        <h3>2. Resultado geral</h3>
        <p>Índice geral de conformidade: <span class="badge ${classificacao.cls}">${classificacao.text}</span></p>
        ${montarResumoCategoriasDiag(diag.data.categorias)}
      </section>

      <section class="rep-secao rep-quebra">
        <h3>3. Pontos de atenção e não conformidades</h3>
        ${montarGapsDiag(diag.data.categorias)}
      </section>

      ${numPlano ? `
      <section class="rep-secao">
        <h3>${numPlano}. Plano de ação</h3>
        <p class="rep-parecer">${escapeHtml(diag.data.planoAcao)}</p>
      </section>` : ''}

      <section class="rep-secao rep-quebra">
        <h3>${numFotos}. Evidência fotográfica</h3>
        ${fotosHtml}
      </section>

      ${numObs ? `
      <section class="rep-secao">
        <h3>${numObs}. Observações finais</h3>
        <p class="rep-parecer">${escapeHtml(diag.data.observacoesFinais)}</p>
      </section>` : ''}

      <section class="rep-secao rep-assinaturas">
        <h3>Encerramento</h3>
        <div class="rep-assinatura-grid">
          ${blocoAssinatura(diag, 'responsavelDiagnostico', 'Responsável pelo diagnóstico', ident.responsavelDiagnostico)}
          ${blocoAssinatura(diag, 'responsavelArea', 'Responsável da área', ident.responsavelArea)}
        </div>
      </section>

      <footer class="rep-rodape">
        Documento ${codigo} — gerado automaticamente pelo aplicativo Inspeções SSMA em ${geradoEm}.
      </footer>
    </article>
  `;

  document.getElementById('btn-back-diag-detail').addEventListener('click', () => renderDiagDetail(id));
  document.getElementById('btn-imprimir-diag').addEventListener('click', () => window.print());
  ligarAssinaturasDiag(diag, id);
}
