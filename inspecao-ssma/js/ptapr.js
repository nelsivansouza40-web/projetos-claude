/* Módulo PT/APR (Permissão de Trabalho / Análise Preliminar de Risco).
 * Documento emitido antes de atividades críticas (altura, espaço confinado,
 * trabalho a quente, elétrico etc.), com verificação das condições de
 * segurança, equipe executante ciente dos riscos (com assinatura) e
 * encerramento ao final da atividade. Segue os mesmos padrões offline-first,
 * fotos e assinatura já usados nos demais módulos. */

const PTAPR_STEPS = ['Identificação', 'Análise de Riscos', 'Equipe e Encerramento', 'Revisão'];

function novoItemPTAPR(texto) {
  return { id: uuid(), texto, resposta: '', observacao: '', personalizado: false };
}

function gerarChecklistPTAPR() {
  return CHECKLIST_PTAPR.map((texto) => novoItemPTAPR(texto));
}

function novaPTAPRVazia() {
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
        area: '',
        localEspecifico: '',
        atividade: '',
        emitente: '',
        supervisorArea: '',
        responsavelAtividade: '',
        sesmt: ''
      },
      tiposTrabalho: [],
      checklist: gerarChecklistPTAPR(),
      medidasControle: '',
      equipe: [],
      fotosIds: [],
      encerramento: {
        data: '',
        hora: '',
        areaOrganizada: '',
        observacoes: ''
      },
      assinaturas: {
        emitente: '',
        supervisorArea: '',
        responsavelAtividade: '',
        sesmt: ''
      },
      localizacao: null
    }
  };
}

async function salvarRascunhoPTAPR(pt) {
  pt.updatedAt = Date.now();
  await DB.putPTAPR(pt);
}

/* ---------------- HOME DO MÓDULO ---------------- */

async function renderPTAPRHome() {
  state.screen = 'ptapr-home';
  setActiveTab('ptapr');
  const registros = await DB.getAllPTAPR();

  const itemsHtml = registros.length
    ? registros.map((pt) => {
        const s = statusLabel(pt);
        const ident = pt.data.identificacao;
        return `
          <li class="insp-card" data-id="${pt.id}">
            <div class="insp-card-main">
              <div class="insp-card-title">${escapeHtml(ident.atividade || 'PT/APR')}</div>
              <div class="insp-card-sub">${escapeHtml(ident.empresa || '')} · ${escapeHtml(ident.area || '')}</div>
              <div class="insp-card-sub">${escapeHtml(ident.data || '')} ${escapeHtml(ident.hora || '')}</div>
            </div>
            <div class="insp-card-side">
              <span class="badge ${s.cls}">${s.text}</span>
              <button type="button" class="btn-excluir-card" data-id="${pt.id}" title="Excluir">🗑</button>
            </div>
          </li>
        `;
      }).join('')
    : '<li class="empty-state">Nenhuma PT/APR registrada ainda. Toque em "Nova PT/APR" para começar.</li>';

  view.innerHTML = `
    <div class="screen-header">
      <h1>PT/APR</h1>
      <button id="btn-new-ptapr" class="btn-primary">+ Nova PT/APR</button>
    </div>
    <ul class="insp-list">${itemsHtml}</ul>
  `;

  document.getElementById('btn-new-ptapr').addEventListener('click', startNewPTAPR);
  view.querySelectorAll('.insp-card').forEach((el) => {
    el.addEventListener('click', () => openPTAPR(el.dataset.id));
  });
  view.querySelectorAll('.btn-excluir-card').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      excluirPTAPR(btn.dataset.id);
    });
  });
}

async function excluirPTAPR(id) {
  const pt = await DB.getPTAPR(id);
  if (!pt) return;
  const rotulo = pt.completo ? 'esta PT/APR' : 'este rascunho de PT/APR';
  if (!confirm(`Excluir ${rotulo} e todas as suas fotos do dispositivo? Esta ação não pode ser desfeita.`)) return;
  const photos = await DB.getPhotosByInspection(id);
  for (const p of photos) await DB.deletePhoto(p.id);
  await DB.deletePTAPR(id);
  renderPTAPRHome();
  updateSyncBar();
}

async function openPTAPR(id) {
  const pt = await DB.getPTAPR(id);
  if (!pt.completo) {
    state.ptaprId = id;
    state.step = 0;
    renderPTAPRForm();
  } else {
    renderPTAPRDetail(id);
  }
}

async function startNewPTAPR() {
  const pt = novaPTAPRVazia();
  await DB.putPTAPR(pt);
  state.ptaprId = pt.id;
  state.step = 0;
  renderPTAPRForm();
  localizacoesPendentes[pt.id] = capturarLocalizacao();
}

/* ---------------- FORMULÁRIO (MULTI-ETAPAS) ---------------- */

async function renderPTAPRForm() {
  state.screen = 'ptapr-form';
  const pt = await DB.getPTAPR(state.ptaprId);

  const stepsNav = PTAPR_STEPS.map((label, idx) => `
    <div class="step-dot ${idx === state.step ? 'active' : ''} ${idx < state.step ? 'done' : ''}">${idx + 1}</div>
  `).join('');

  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-ptapr-home" class="btn-link">← Voltar</button>
      <h1>${escapeHtml(pt.data.identificacao.atividade || 'Nova PT/APR')}</h1>
    </div>
    <div class="steps-nav">${stepsNav}</div>
    <div id="ptapr-step-content"></div>
  `;

  document.getElementById('btn-back-ptapr-home').addEventListener('click', async () => {
    await salvarRascunhoPTAPR(pt);
    renderPTAPRHome();
  });

  const content = document.getElementById('ptapr-step-content');
  if (state.step === 0) renderPTAPRStepIdentificacao(content, pt);
  else if (state.step === 1) renderPTAPRStepChecklist(content, pt);
  else if (state.step === 2) renderPTAPRStepEquipe(content, pt);
  else renderPTAPRStepRevisao(content, pt);
}

/* ---- Passo 1: Identificação ---- */
function renderPTAPRStepIdentificacao(content, pt) {
  const id = pt.data.identificacao;
  const tiposHtml = TIPOS_TRABALHO_PTAPR.map((t) => `
    <label class="checkbox-pill">
      <input type="checkbox" name="tipoTrabalho" value="${escapeHtml(t)}" ${pt.data.tiposTrabalho.includes(t) ? 'checked' : ''}>
      ${escapeHtml(t)}
    </label>
  `).join('');

  content.innerHTML = `
    <form id="form-ptapr-ident" class="form-section">
      <label>Data *
        <input type="date" name="data" required value="${escapeHtml(id.data)}">
      </label>
      <label>Hora de início *
        <input type="time" name="hora" required value="${escapeHtml(id.hora)}">
      </label>
      <label>Empresa / Contratada *
        <input type="text" name="empresa" required value="${escapeHtml(id.empresa)}">
      </label>
      <label>Unidade / Projeto
        <input type="text" name="unidade" value="${escapeHtml(id.unidade)}">
      </label>
      <label>Área / Setor *
        <input type="text" name="area" required value="${escapeHtml(id.area)}">
      </label>
      <label>Local específico da atividade
        <input type="text" name="localEspecifico" value="${escapeHtml(id.localEspecifico)}">
      </label>
      <label>Descrição da atividade a ser realizada *
        <textarea name="atividade" rows="2" required>${escapeHtml(id.atividade)}</textarea>
      </label>
      <label>Emitente da PT (responsável SSMA/supervisor) *
        <input type="text" name="emitente" required value="${escapeHtml(id.emitente)}">
      </label>
      <label>Supervisor / Responsável pela área
        <input type="text" name="supervisorArea" value="${escapeHtml(id.supervisorArea)}">
      </label>
      <label>Responsável pela atividade
        <input type="text" name="responsavelAtividade" value="${escapeHtml(id.responsavelAtividade)}">
      </label>
      <label>SESMT
        <input type="text" name="sesmt" value="${escapeHtml(id.sesmt)}">
      </label>
      <label>Tipo(s) de trabalho *</label>
      <div class="tipos-trabalho-grid">${tiposHtml}</div>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Avançar →</button>
      </div>
    </form>
  `;

  const form = document.getElementById('form-ptapr-ident');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const tiposSelecionados = fd.getAll('tipoTrabalho');
    if (tiposSelecionados.length === 0) {
      alert('Selecione ao menos um tipo de trabalho.');
      return;
    }
    pt.data.identificacao = {
      data: fd.get('data'),
      hora: fd.get('hora'),
      empresa: fd.get('empresa').trim(),
      unidade: (fd.get('unidade') || '').trim(),
      area: fd.get('area').trim(),
      localEspecifico: (fd.get('localEspecifico') || '').trim(),
      atividade: fd.get('atividade').trim(),
      emitente: fd.get('emitente').trim(),
      supervisorArea: (fd.get('supervisorArea') || '').trim(),
      responsavelAtividade: (fd.get('responsavelAtividade') || '').trim(),
      sesmt: (fd.get('sesmt') || '').trim()
    };
    pt.data.tiposTrabalho = tiposSelecionados;
    await salvarRascunhoPTAPR(pt);
    state.step = 1;
    renderPTAPRForm();
  });
}

/* ---- Passo 2: Análise de Riscos (checklist) ---- */
function renderPTAPRStepChecklist(content, pt) {
  content.innerHTML = `
    <div class="checklist" id="ptapr-checklist-container"></div>
    <label>Medidas de controle adicionais
      <textarea id="ptapr-medidas-controle" rows="3">${escapeHtml(pt.data.medidasControle)}</textarea>
    </label>
    <div class="form-actions">
      <button id="btn-ptapr-checklist-back" class="btn-link">← Voltar</button>
      <button id="btn-ptapr-checklist-next" class="btn-primary">Avançar →</button>
    </div>
  `;

  const container = document.getElementById('ptapr-checklist-container');
  renderPTAPRChecklistItems(container, pt);

  const medidas = document.getElementById('ptapr-medidas-controle');
  medidas.addEventListener('blur', async () => {
    pt.data.medidasControle = medidas.value;
    await salvarRascunhoPTAPR(pt);
  });

  document.getElementById('btn-ptapr-checklist-back').addEventListener('click', async () => {
    pt.data.medidasControle = medidas.value;
    await salvarRascunhoPTAPR(pt);
    state.step = 0;
    renderPTAPRForm();
  });

  document.getElementById('btn-ptapr-checklist-next').addEventListener('click', async () => {
    pt.data.medidasControle = medidas.value;
    await salvarRascunhoPTAPR(pt);
    state.step = 2;
    renderPTAPRForm();
  });
}

function renderPTAPRItem(item, idx) {
  const respostas = ['Conforme', 'Não Conforme', 'Não se Aplica'];
  const radiosHtml = respostas.map((r) => `
    <label class="radio-pill radio-${r === 'Conforme' ? 'ok' : r === 'Não Conforme' ? 'nc' : 'na'}">
      <input type="radio" name="ptapr-resp-${idx}" value="${r}" ${item.resposta === r ? 'checked' : ''}>
      ${r}
    </label>
  `).join('');

  const destacar = item.resposta === 'Não Conforme';

  return `
    <div class="checklist-card ${destacar ? 'destaque-nc' : ''}" data-idx="${idx}">
      <div class="checklist-question">Item ${String(idx + 1).padStart(2, '0')} — ${escapeHtml(item.texto)}</div>
      <div class="radio-group">${radiosHtml}</div>
      <div class="checklist-details">
        <label>Observação
          <textarea class="txt-observacao" rows="2">${escapeHtml(item.observacao)}</textarea>
        </label>
      </div>
    </div>
  `;
}

function renderPTAPRChecklistItems(container, pt) {
  container.innerHTML = pt.data.checklist.map((item, idx) => renderPTAPRItem(item, idx)).join('');

  pt.data.checklist.forEach((item, idx) => {
    const card = container.querySelector(`.checklist-card[data-idx="${idx}"]`);
    if (!card) return;

    card.querySelectorAll('input[type=radio]').forEach((radio) => {
      radio.addEventListener('change', async () => {
        item.resposta = radio.value;
        await salvarRascunhoPTAPR(pt);
        renderPTAPRChecklistItems(container, pt);
      });
    });

    const obs = card.querySelector('.txt-observacao');
    if (obs) obs.addEventListener('blur', async () => {
      item.observacao = obs.value;
      await salvarRascunhoPTAPR(pt);
    });
  });
}

/* ---- Passo 3: Equipe executante e encerramento ---- */
function renderPTAPRStepEquipe(content, pt) {
  const enc = pt.data.encerramento;

  content.innerHTML = `
    <div class="lista-participantes">
      <h3>Participantes / Executantes</h3>
      <p class="hint">Cada participante/executante deve assinar confirmando ciência dos riscos e das medidas de controle desta PT/APR.</p>
      <div id="ptapr-equipe-container"></div>
      <button type="button" id="btn-add-equipe-ptapr" class="btn-secondary">+ Adicionar membro da equipe</button>
    </div>

    <label>Evidência fotográfica</label>
    <div class="foto-botoes">
      <label class="file-label">📷 Tirar foto
        <input type="file" accept="image/*" capture="environment" id="input-foto-ptapr-camera">
      </label>
      <label class="file-label">🖼️ Da galeria
        <input type="file" accept="image/*" multiple id="input-foto-ptapr-galeria">
      </label>
    </div>
    <div class="thumbs" id="thumbs-ptapr"></div>

    <div class="form-section" style="margin-top:16px;">
      <h3>Encerramento da PT/APR</h3>
      <p class="hint">Preencha ao final da atividade, quando o trabalho for concluído. Pode ser feito depois, tocando em "Editar".</p>
      <label>Data de encerramento
        <input type="date" id="ptapr-enc-data" value="${escapeHtml(enc.data)}">
      </label>
      <label>Hora de encerramento
        <input type="time" id="ptapr-enc-hora" value="${escapeHtml(enc.hora)}">
      </label>
      <fieldset>
        <legend>Área ficou limpa e organizada ao final?</legend>
        <label class="radio-inline"><input type="radio" name="areaOrganizada" value="Sim" ${enc.areaOrganizada === 'Sim' ? 'checked' : ''}> Sim</label>
        <label class="radio-inline"><input type="radio" name="areaOrganizada" value="Não" ${enc.areaOrganizada === 'Não' ? 'checked' : ''}> Não</label>
      </fieldset>
      <label>Observações do encerramento
        <textarea id="ptapr-enc-obs" rows="2">${escapeHtml(enc.observacoes)}</textarea>
      </label>
    </div>

    <div class="form-actions">
      <button id="btn-ptapr-equipe-back" class="btn-link">← Voltar</button>
      <button id="btn-ptapr-equipe-next" class="btn-primary">Avançar →</button>
    </div>
  `;

  const equipeContainer = document.getElementById('ptapr-equipe-container');
  renderEquipePTAPR(equipeContainer, pt);

  document.getElementById('btn-add-equipe-ptapr').addEventListener('click', async () => {
    const nome = prompt('Nome completo do membro da equipe:');
    if (!nome || !nome.trim()) return;
    pt.data.equipe.push(novoParticipante(nome.trim()));
    await salvarRascunhoPTAPR(pt);
    renderEquipePTAPR(equipeContainer, pt);
  });

  async function refreshThumbsPTAPR() {
    const el = document.getElementById('thumbs-ptapr');
    await renderThumbnails(el, pt.data.fotosIds);
    el.querySelectorAll('.btn-remover-foto').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const photoId = btn.dataset.photoId;
        await DB.deletePhoto(photoId);
        pt.data.fotosIds = pt.data.fotosIds.filter((pid) => pid !== photoId);
        await salvarRascunhoPTAPR(pt);
        refreshThumbsPTAPR();
      });
    });
  }
  refreshThumbsPTAPR();

  ['input-foto-ptapr-camera', 'input-foto-ptapr-galeria'].forEach((elId) => {
    document.getElementById(elId).addEventListener('change', async (e) => {
      await adicionarFotos(pt, pt.data.fotosIds, e.target.files, 'ptapr');
      await salvarRascunhoPTAPR(pt);
      refreshThumbsPTAPR();
    });
  });

  function coletarEncerramento() {
    pt.data.encerramento.data = document.getElementById('ptapr-enc-data').value;
    pt.data.encerramento.hora = document.getElementById('ptapr-enc-hora').value;
    const radioMarcado = content.querySelector('input[name="areaOrganizada"]:checked');
    pt.data.encerramento.areaOrganizada = radioMarcado ? radioMarcado.value : '';
    pt.data.encerramento.observacoes = document.getElementById('ptapr-enc-obs').value;
  }

  document.getElementById('btn-ptapr-equipe-back').addEventListener('click', async () => {
    coletarEncerramento();
    await salvarRascunhoPTAPR(pt);
    state.step = 1;
    renderPTAPRForm();
  });

  document.getElementById('btn-ptapr-equipe-next').addEventListener('click', async () => {
    coletarEncerramento();
    await salvarRascunhoPTAPR(pt);
    state.step = 3;
    renderPTAPRForm();
  });
}

function renderEquipePTAPR(container, pt) {
  const equipe = pt.data.equipe;
  container.innerHTML = equipe.length
    ? equipe.map((p, idx) => blocoAssinaturaParticipante(p, idx)).join('')
    : '<p class="empty-state">Nenhum membro adicionado ainda.</p>';

  equipe.forEach((p, idx) => {
    const card = container.querySelector(`[data-idx="${idx}"]`);
    if (!card) return;

    card.querySelector('.txt-participante-nome').addEventListener('blur', async (e) => {
      p.nome = e.target.value.trim();
      await salvarRascunhoPTAPR(pt);
    });
    card.querySelector('.txt-participante-funcao').addEventListener('blur', async (e) => {
      p.funcao = e.target.value.trim();
      await salvarRascunhoPTAPR(pt);
    });
    card.querySelector('.btn-remover-participante').addEventListener('click', async () => {
      if (!confirm('Remover este membro da equipe?')) return;
      pt.data.equipe.splice(idx, 1);
      await salvarRascunhoPTAPR(pt);
      renderEquipePTAPR(container, pt);
    });

    const btnAssinar = card.querySelector('.btn-assinar-participante');
    const pad = card.querySelector('.rep-assinatura-pad');
    btnAssinar.addEventListener('click', () => {
      pad.hidden = false;
      pad.previousElementSibling.hidden = true;
      iniciarCanvasAssinaturaRelatorio(pad.querySelector('canvas'));
    });
    pad.querySelector('.btn-cancelar-pad').addEventListener('click', () => {
      pad.hidden = true;
      pad.previousElementSibling.hidden = false;
    });
    pad.querySelector('.btn-limpar-pad').addEventListener('click', () => {
      iniciarCanvasAssinaturaRelatorio(pad.querySelector('canvas'));
    });
    pad.querySelector('.btn-confirmar-pad').addEventListener('click', async () => {
      const canvas = pad.querySelector('canvas');
      if (!canvas.dataset.assinado) {
        alert('Desenhe a assinatura no quadro antes de confirmar.');
        return;
      }
      p.assinatura = canvas.toDataURL('image/png');
      await salvarRascunhoPTAPR(pt);
      renderEquipePTAPR(container, pt);
    });
  });
}

/* ---- Passo 4: Revisão e salvar ---- */
function renderPTAPRStepRevisao(content, pt) {
  const totalItens = pt.data.checklist.length;
  const nc = pt.data.checklist.filter((i) => i.resposta === 'Não Conforme').length;
  const semResposta = pt.data.checklist.filter((i) => !i.resposta).length;

  content.innerHTML = `
    <div class="resumo">
      <h2>Resumo da PT/APR</h2>
      <p><strong>${escapeHtml(pt.data.identificacao.atividade)}</strong></p>
      <p>${escapeHtml(pt.data.identificacao.empresa)} · ${escapeHtml(pt.data.identificacao.area)}</p>
      <p>${escapeHtml(pt.data.identificacao.data)} ${escapeHtml(pt.data.identificacao.hora)}</p>
      <p>Tipo(s) de trabalho: ${pt.data.tiposTrabalho.map((t) => escapeHtml(t)).join(', ') || '—'}</p>
      <ul class="resumo-stats">
        <li>Itens verificados: ${totalItens}</li>
        <li class="nc">Não conformes: ${nc}</li>
        ${semResposta ? `<li class="alerta">${semResposta} item(ns) sem resposta</li>` : ''}
        <li>Equipe: ${pt.data.equipe.length} membro(s)</li>
      </ul>
    </div>
    <div class="form-actions">
      <button id="btn-ptapr-revisao-back" class="btn-link">← Voltar</button>
      <button id="btn-ptapr-concluir" class="btn-primary">Concluir e salvar</button>
    </div>
    <p class="hint">A PT/APR fica salva no aparelho mesmo sem internet. Assim que houver conexão, é enviada automaticamente.</p>
  `;

  document.getElementById('btn-ptapr-revisao-back').addEventListener('click', () => {
    state.step = 2;
    renderPTAPRForm();
  });

  document.getElementById('btn-ptapr-concluir').addEventListener('click', async () => {
    if (semResposta > 0 && !confirm(`Existem ${semResposta} item(ns) sem resposta. Deseja concluir mesmo assim?`)) {
      return;
    }
    await aplicarLocalizacaoPendente(pt);
    pt.completo = true;
    pt.syncStatus = 'pendente';
    await salvarRascunhoPTAPR(pt);
    await refreshChrome();
    renderPTAPRHome();
    Sync.syncAll().catch(() => {});
  });
}

/* ---------------- VALIDAÇÃO PARA O RELATÓRIO ---------------- */

function validarPTAPRParaRelatorio(pt) {
  const problemas = [];
  pt.data.checklist.forEach((item, idx) => {
    const num = String(idx + 1).padStart(2, '0');
    if (!item.resposta) {
      problemas.push(`Item ${num} ("${item.texto}") está sem resposta.`);
    } else if (item.resposta === 'Não Conforme' && !item.observacao) {
      problemas.push(`Item ${num} ("${item.texto}") está Não Conforme, mas não tem observação.`);
    }
  });
  if (!pt.data.equipe.length) {
    problemas.push('Nenhum membro da equipe executante foi registrado.');
  }
  pt.data.equipe.forEach((p) => {
    if (!p.assinatura) problemas.push(`Membro da equipe "${p.nome || 'sem nome'}" ainda não assinou.`);
  });
  return problemas;
}

/* ---------------- DETALHE ---------------- */

async function renderPTAPRDetail(id) {
  state.screen = 'ptapr-detail';
  state.ptaprId = id;
  const pt = await DB.getPTAPR(id);
  const photos = await DB.getPhotosByInspection(id);
  const s = statusLabel(pt);
  const ident = pt.data.identificacao;

  const checklistHtml = pt.data.checklist.map((item, idx) => `
    <div class="detail-item">
      <div><strong>Item ${String(idx + 1).padStart(2, '0')}.</strong> ${escapeHtml(item.texto)}</div>
      <div class="detail-resposta resposta-${item.resposta === 'Conforme' ? 'ok' : item.resposta === 'Não Conforme' ? 'nc' : 'na'}">${escapeHtml(item.resposta || 'Sem resposta')}</div>
      ${item.observacao ? `<div class="detail-obs">Obs.: ${escapeHtml(item.observacao)}</div>` : ''}
    </div>
  `).join('');

  const equipeHtml = pt.data.equipe.length
    ? `<ul class="lista-presenca">${pt.data.equipe.map((p) => `
        <li>${escapeHtml(p.nome)}${p.funcao ? ' — ' + escapeHtml(p.funcao) : ''}
          <span class="badge ${p.assinatura ? 'badge-ok' : 'badge-pendente'}">${p.assinatura ? 'Assinado' : 'Sem assinatura'}</span>
        </li>
      `).join('')}</ul>`
    : '<p class="empty-state">Nenhum membro registrado.</p>';

  const enc = pt.data.encerramento;

  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-ptapr-home" class="btn-link">← Voltar</button>
      <h1>${escapeHtml(ident.atividade)}</h1>
    </div>
    <span class="badge ${s.cls}">${s.text}</span>
    ${pt.syncError ? `<p class="erro-msg">${escapeHtml(pt.syncError)}</p>` : ''}
    <div class="detail-block">
      <p>${escapeHtml(ident.empresa)} · ${escapeHtml(ident.unidade)} · ${escapeHtml(ident.area)}</p>
      <p>${escapeHtml(ident.data)} ${escapeHtml(ident.hora)} · Emitente: ${escapeHtml(ident.emitente)}</p>
      <p>Tipo(s) de trabalho: ${pt.data.tiposTrabalho.map((t) => escapeHtml(t)).join(', ') || '—'}</p>
    </div>
    <h3>Análise de Riscos</h3>
    ${checklistHtml}
    ${pt.data.medidasControle ? `<h3>Medidas de controle adicionais</h3><div class="detail-block"><p>${escapeHtml(pt.data.medidasControle)}</p></div>` : ''}
    ${photos.length ? `<h3>Evidência fotográfica</h3><div class="thumbs">${photos.map((p) => `<div class="thumb"><img src="${URL.createObjectURL(p.blob)}"><span class="thumb-sync ${p.synced ? 'ok' : ''}">${p.synced ? '✓' : '⏳'}</span></div>`).join('')}</div>` : ''}
    <h3>Participantes / Executantes (${pt.data.equipe.length})</h3>
    ${equipeHtml}
    <h3>Encerramento</h3>
    ${enc.data
      ? `<div class="detail-block"><p>${formatarDataBR(enc.data)} ${escapeHtml(enc.hora || '')} · Área organizada: ${escapeHtml(enc.areaOrganizada || '—')}</p>${enc.observacoes ? `<p>${escapeHtml(enc.observacoes)}</p>` : ''}</div>`
      : '<p class="hint">PT/APR ainda não foi encerrada.</p>'}
    <div class="form-actions">
      <button id="btn-editar-ptapr" class="btn-secondary">✏️ Editar PT/APR</button>
      <button id="btn-relatorio-ptapr" class="btn-secondary">Gerar relatório (PDF)</button>
    </div>
    <div class="form-actions">
      ${pt.syncStatus !== 'synced' ? '<button id="btn-sync-one-ptapr" class="btn-primary">Sincronizar esta PT/APR</button>' : ''}
      <button id="btn-excluir-ptapr" class="btn-danger">Excluir PT/APR</button>
    </div>
  `;

  document.getElementById('btn-back-ptapr-home').addEventListener('click', renderPTAPRHome);
  document.getElementById('btn-relatorio-ptapr').addEventListener('click', () => {
    const problemas = validarPTAPRParaRelatorio(pt);
    if (problemas.length) {
      alert('Não é possível gerar o relatório ainda:\n\n- ' + problemas.join('\n- ') + '\n\nToque em "Editar PT/APR" para corrigir.');
      return;
    }
    renderPTAPRReport(id);
  });
  document.getElementById('btn-editar-ptapr').addEventListener('click', async () => {
    pt.metaSynced = false;
    pt.syncStatus = 'pendente';
    await salvarRascunhoPTAPR(pt);
    state.ptaprId = id;
    state.step = 0;
    renderPTAPRForm();
  });

  const btnSyncOne = document.getElementById('btn-sync-one-ptapr');
  if (btnSyncOne) btnSyncOne.addEventListener('click', async () => {
    btnSyncOne.disabled = true;
    btnSyncOne.textContent = 'Sincronizando…';
    try {
      await Sync.syncPTAPR(id);
    } catch (e) {
      alert('Não foi possível sincronizar agora: ' + e.message);
    }
    renderPTAPRDetail(id);
    updateSyncBar();
  });

  document.getElementById('btn-excluir-ptapr').addEventListener('click', async () => {
    if (!confirm('Excluir esta PT/APR e todas as suas fotos do dispositivo? Esta ação não pode ser desfeita.')) return;
    for (const p of photos) await DB.deletePhoto(p.id);
    await DB.deletePTAPR(id);
    renderPTAPRHome();
    updateSyncBar();
  });
}

/* ---------------- RELATÓRIO (impressão / PDF) ---------------- */

function gerarCodigoPTAPR(pt) {
  const data = (pt.data.identificacao.data || '').replace(/-/g, '');
  const curto = pt.id.split('-')[0].toUpperCase();
  return `PT-${data || 'SDATA'}-${curto}`;
}

async function montarFotosPTAPR(fotosIds) {
  if (!fotosIds || !fotosIds.length) {
    return '<p class="rep-hint">Nenhuma evidência fotográfica anexada.</p>';
  }
  const fotosHtml = (await Promise.all(fotosIds.map(montarBlocoFoto))).join('');
  return `<div class="rep-fotos-grid">${fotosHtml}</div>`;
}

function montarTabelaChecklistPTAPR(checklist) {
  const linhas = checklist.map((item, idx) => `
    <tr>
      <td>${String(idx + 1).padStart(2, '0')}</td>
      <td>${escapeHtml(item.texto)}</td>
      <td class="rep-td-status rep-status-${item.resposta === 'Conforme' ? 'ok' : item.resposta === 'Não Conforme' ? 'nc' : 'na'}">${escapeHtml(item.resposta || '—')}</td>
      <td>${escapeHtml(item.observacao || '—')}</td>
    </tr>
  `).join('');
  return `
    <table class="rep-table">
      <thead><tr><th>Nº</th><th>Item verificado</th><th>Resultado</th><th>Observação</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
  `;
}

function montarEquipePTAPR(equipe) {
  if (!equipe.length) return '<p class="rep-hint">Nenhum membro registrado.</p>';
  const linhas = equipe.map((p, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${escapeHtml(p.nome)}</td>
      <td>${escapeHtml(p.funcao || '—')}</td>
      <td class="rep-td-assinatura">${p.assinatura
        ? `<img src="${p.assinatura}" class="rep-assinatura-mini" alt="Assinatura">`
        : '<div class="rep-linha-assinatura-mini"></div>'}</td>
    </tr>
  `).join('');
  return `
    <table class="rep-table rep-table-presenca">
      <thead><tr><th>Nº</th><th>Nome</th><th>Função</th><th>Ciente (assinatura)</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
  `;
}

function ligarAssinaturasPTAPR(pt, id) {
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
      pt.data.assinaturas = pt.data.assinaturas || {};
      pt.data.assinaturas[campo] = dataUrl;
      await salvarRascunhoPTAPR(pt);
      renderPTAPRReport(id);
    });
  });
}

async function renderPTAPRReport(id) {
  state.screen = 'ptapr-report';
  const pt = await DB.getPTAPR(id);
  if (!pt) return renderPTAPRHome();
  pt.data.assinaturas = pt.data.assinaturas || {};

  const ident = pt.data.identificacao;
  const codigo = gerarCodigoPTAPR(pt);
  const geradoEm = new Date().toLocaleString('pt-BR');
  const fotosHtml = await montarFotosPTAPR(pt.data.fotosIds);
  const enc = pt.data.encerramento;
  const encerrada = !!enc.data;

  view.innerHTML = `
    <div class="screen-header no-print">
      <button id="btn-back-ptapr-detail" class="btn-link">← Voltar</button>
      <h1>Relatório de PT/APR</h1>
    </div>
    <div class="form-actions no-print" style="margin-bottom:12px;">
      <button id="btn-imprimir-ptapr" class="btn-primary">Imprimir / Salvar PDF</button>
    </div>

    <article class="rep-doc">
      <header class="rep-cabecalho">
        <div class="rep-titulo">
          <img src="icons/icon-192.png" alt="" class="rep-logo">
          <div>
            <h2>PERMISSÃO DE TRABALHO / APR</h2>
            <p>${escapeHtml(ident.atividade)}</p>
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
          <tr><th>Área / Setor</th><td>${escapeHtml(ident.area)}</td><th>Local específico</th><td>${escapeHtml(ident.localEspecifico || '—')}</td></tr>
          <tr><th>Data</th><td>${formatarDataBR(ident.data)}</td><th>Hora de início</th><td>${escapeHtml(ident.hora)}</td></tr>
          <tr><th>Emitente</th><td>${escapeHtml(ident.emitente)}</td><th>Supervisor da área</th><td>${escapeHtml(ident.supervisorArea || '—')}</td></tr>
          <tr><th>Responsável pela atividade</th><td>${escapeHtml(ident.responsavelAtividade || '—')}</td><th>SESMT</th><td>${escapeHtml(ident.sesmt || '—')}</td></tr>
          <tr><th>Tipo(s) de trabalho</th><td colspan="3">${pt.data.tiposTrabalho.map((t) => escapeHtml(t)).join(', ') || '—'}</td></tr>
        </table>
        ${montarLocalizacaoRelatorio(pt.data.localizacao)}
      </section>

      <section class="rep-secao rep-quebra">
        <h3>2. Análise Preliminar de Riscos</h3>
        ${montarTabelaChecklistPTAPR(pt.data.checklist)}
        ${pt.data.medidasControle ? `<p><strong>Medidas de controle adicionais:</strong> ${escapeHtml(pt.data.medidasControle)}</p>` : ''}
      </section>

      <section class="rep-secao rep-quebra">
        <h3>3. Evidência fotográfica</h3>
        ${fotosHtml}
      </section>

      <section class="rep-secao rep-quebra">
        <h3>4. Participantes / Executantes — ciência dos riscos</h3>
        ${montarEquipePTAPR(pt.data.equipe)}
      </section>

      <section class="rep-secao rep-assinaturas">
        <h3>5. Liberação do trabalho</h3>
        <div class="rep-assinatura-grid">
          ${blocoAssinatura(pt, 'emitente', 'Emitente da PT', ident.emitente)}
          ${blocoAssinatura(pt, 'supervisorArea', 'Supervisor da área', ident.supervisorArea)}
          ${blocoAssinatura(pt, 'responsavelAtividade', 'Responsável pela atividade', ident.responsavelAtividade)}
          ${blocoAssinatura(pt, 'sesmt', 'SESMT', ident.sesmt)}
        </div>
      </section>

      <section class="rep-secao">
        <h3>6. Encerramento</h3>
        ${encerrada
          ? `<table class="rep-tabela-ident">
              <tr><th>Data</th><td>${formatarDataBR(enc.data)}</td><th>Hora</th><td>${escapeHtml(enc.hora || '—')}</td></tr>
              <tr><th>Área organizada</th><td colspan="3">${escapeHtml(enc.areaOrganizada || '—')}</td></tr>
            </table>
            ${enc.observacoes ? `<p>${escapeHtml(enc.observacoes)}</p>` : ''}`
          : '<p class="rep-hint">PT/APR ainda não foi encerrada.</p>'}
      </section>

      <footer class="rep-rodape">
        Documento ${codigo} — gerado automaticamente pelo aplicativo Inspeções SSMA em ${geradoEm}.
      </footer>
    </article>
  `;

  document.getElementById('btn-back-ptapr-detail').addEventListener('click', () => renderPTAPRDetail(id));
  document.getElementById('btn-imprimir-ptapr').addEventListener('click', () => window.print());
  ligarAssinaturasPTAPR(pt, id);
}
