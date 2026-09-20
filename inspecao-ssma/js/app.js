/* Lógica de interface do aplicativo. Sem dependências externas. */

// Sobe este número a cada publicação, para conseguir identificar pelo próprio
// app (tela de Configurações) se um aparelho já recebeu a versão mais nova ou
// ainda está com uma cópia antiga presa no cache do navegador.
const APP_VERSION = 'v21';

const state = {
  screen: 'home',
  inspectionId: null,
  step: 0
};

const STEPS = ['Identificação', 'Checklist', 'Fechamento', 'Revisão'];

function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString('pt-BR');
}

function statusLabel(insp) {
  if (!insp.completo) return { text: 'Rascunho', cls: 'badge-rascunho' };
  switch (insp.syncStatus) {
    case 'synced': return { text: 'Sincronizado', cls: 'badge-ok' };
    case 'sincronizando': return { text: 'Sincronizando…', cls: 'badge-sync' };
    case 'erro': return { text: 'Erro na sincronização', cls: 'badge-erro' };
    default: return { text: 'Aguardando sincronização', cls: 'badge-pendente' };
  }
}

const view = document.getElementById('view');
const connStatusEl = document.getElementById('conn-status');
const syncBarEl = document.getElementById('sync-bar');

function updateConnBadge() {
  const online = navigator.onLine;
  connStatusEl.textContent = online ? 'Online' : 'Offline';
  connStatusEl.className = online ? 'conn conn-online' : 'conn conn-offline';
}

async function updateSyncBar() {
  const inspections = await DB.getAllInspections();
  const registrosDDS = await DB.getAllDDS();
  const registrosDiag = await DB.getAllDiagnosticos();
  const registrosCipaReunioes = await DB.getAllCipaReunioes();
  const registrosPTAPR = await DB.getAllPTAPR();
  const registrosCert = await DB.getAllCertificados();
  const registrosPET = await DB.getAllPET();
  const pendentesInsp = inspections.filter((i) => i.completo && i.syncStatus !== 'synced');
  const pendentesDDS = registrosDDS.filter((d) => d.completo && d.syncStatus !== 'synced');
  const pendentesDiag = registrosDiag.filter((d) => d.completo && d.syncStatus !== 'synced');
  const pendentesCipa = registrosCipaReunioes.filter((r) => r.completo && r.syncStatus !== 'synced');
  const pendentesPTAPR = registrosPTAPR.filter((p) => p.completo && p.syncStatus !== 'synced');
  const pendentesCert = registrosCert.filter((c) => c.completo && c.syncStatus !== 'synced');
  const pendentesPET = registrosPET.filter((p) => p.completo && p.syncStatus !== 'synced');
  const totalPendentes = pendentesInsp.length + pendentesDDS.length + pendentesDiag.length + pendentesCipa.length + pendentesPTAPR.length + pendentesCert.length + pendentesPET.length;
  if (totalPendentes === 0) {
    syncBarEl.hidden = true;
    return;
  }
  syncBarEl.hidden = false;
  const online = navigator.onLine;
  const partes = [];
  if (pendentesInsp.length) partes.push(`${pendentesInsp.length} inspeção(ões)`);
  if (pendentesPTAPR.length) partes.push(`${pendentesPTAPR.length} PT/APR`);
  if (pendentesPET.length) partes.push(`${pendentesPET.length} PET`);
  if (pendentesDDS.length) partes.push(`${pendentesDDS.length} DDS`);
  if (pendentesDiag.length) partes.push(`${pendentesDiag.length} diagnóstico(s)`);
  if (pendentesCipa.length) partes.push(`${pendentesCipa.length} reunião(ões) de CIPA`);
  if (pendentesCert.length) partes.push(`${pendentesCert.length} certificado(s)`);
  syncBarEl.innerHTML = `
    <span>${partes.join(' e ')} aguardando sincronização${online ? '' : ' (offline)'}</span>
    <button id="btn-sync-now" ${online ? '' : 'disabled'}>Sincronizar agora</button>
  `;
  const btn = document.getElementById('btn-sync-now');
  if (btn) {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'Sincronizando…';
      try {
        await Sync.syncAll();
      } catch (e) {
        alert('Não foi possível concluir a sincronização agora. Os dados continuam salvos no dispositivo e serão enviados na próxima tentativa.');
      }
      await refreshChrome();
      if (state.screen === 'home') renderHome();
      if (state.screen === 'detail') renderDetail(state.inspectionId);
      if (state.screen === 'dds-home') renderDDSHome();
      if (state.screen === 'dds-detail') renderDDSDetail(state.ddsId);
      if (state.screen === 'diag-home') renderDiagHome();
      if (state.screen === 'diag-detail') renderDiagDetail(state.diagId);
      if (state.screen === 'cipa-home') renderCipaHome();
      if (state.screen === 'cipa-reuniao-detail') renderReuniaoCipaDetail(state.cipaReuniaoId);
      if (state.screen === 'ptapr-home') renderPTAPRHome();
      if (state.screen === 'ptapr-detail') renderPTAPRDetail(state.ptaprId);
      if (state.screen === 'cert-home') renderCertificadosHome();
      if (state.screen === 'cert-detail') renderCertificadoDetail(state.certId);
      if (state.screen === 'pet-home') renderPETHome();
      if (state.screen === 'pet-detail') renderPETDetail(state.petId);
    });
  }
}

function setActiveTab(tab) {
  const tabInsp = document.getElementById('tab-inspecoes');
  const tabPTAPR = document.getElementById('tab-ptapr');
  const tabPET = document.getElementById('tab-pet');
  const tabDDS = document.getElementById('tab-dds');
  const tabDiag = document.getElementById('tab-diagnostico');
  const tabCipa = document.getElementById('tab-cipa');
  const tabCert = document.getElementById('tab-certificados');
  if (tabInsp) tabInsp.classList.toggle('active', tab === 'inspecoes');
  if (tabPTAPR) tabPTAPR.classList.toggle('active', tab === 'ptapr');
  if (tabPET) tabPET.classList.toggle('active', tab === 'pet');
  if (tabDDS) tabDDS.classList.toggle('active', tab === 'dds');
  if (tabDiag) tabDiag.classList.toggle('active', tab === 'diagnostico');
  if (tabCipa) tabCipa.classList.toggle('active', tab === 'cipa');
  if (tabCert) tabCert.classList.toggle('active', tab === 'certificados');
}

async function refreshChrome() {
  updateConnBadge();
  await updateSyncBar();
}

window.addEventListener('online', refreshChrome);
window.addEventListener('offline', refreshChrome);
Sync.onChange(refreshChrome);

/* ---------------- HOME ---------------- */

async function renderHome() {
  state.screen = 'home';
  setActiveTab('inspecoes');
  const inspections = await DB.getAllInspections();

  const itemsHtml = inspections.length
    ? inspections.map((insp) => {
        const s = statusLabel(insp);
        const ident = insp.data.identificacao;
        const titulo = insp.data.tipoInspecao || 'Inspeção';
        return `
          <li class="insp-card" data-id="${insp.id}">
            <div class="insp-card-main">
              <div class="insp-card-title">${escapeHtml(titulo)}</div>
              <div class="insp-card-sub">${escapeHtml(ident.empresa || '')} · ${escapeHtml(ident.area || '')}</div>
              <div class="insp-card-sub">${escapeHtml(ident.data || '')} ${escapeHtml(ident.hora || '')}</div>
            </div>
            <div class="insp-card-side">
              <span class="badge ${s.cls}">${s.text}</span>
              <button type="button" class="btn-excluir-card" data-id="${insp.id}" title="Excluir">🗑</button>
            </div>
          </li>
        `;
      }).join('')
    : '<li class="empty-state">Nenhuma inspeção registrada ainda. Toque em "Nova inspeção" para começar.</li>';

  view.innerHTML = `
    <div class="screen-header">
      <h1>Inspeções</h1>
      <button id="btn-new-insp" class="btn-primary">+ Nova inspeção</button>
    </div>
    <ul class="insp-list">${itemsHtml}</ul>
  `;

  document.getElementById('btn-new-insp').addEventListener('click', startNewInspection);
  view.querySelectorAll('.insp-card').forEach((el) => {
    el.addEventListener('click', () => openInspection(el.dataset.id));
  });
  view.querySelectorAll('.btn-excluir-card').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      excluirInspecao(btn.dataset.id);
    });
  });
}

async function excluirInspecao(id) {
  const insp = await DB.getInspection(id);
  if (!insp) return;
  const rotulo = insp.completo
    ? 'esta inspeção'
    : 'este rascunho';
  if (!confirm(`Excluir ${rotulo} e todas as suas fotos do dispositivo? Esta ação não pode ser desfeita.`)) return;
  const photos = await DB.getPhotosByInspection(id);
  for (const p of photos) await DB.deletePhoto(p.id);
  await DB.deleteInspection(id);
  renderHome();
  updateSyncBar();
}

async function openInspection(id) {
  const insp = await DB.getInspection(id);
  if (!insp.completo) {
    state.inspectionId = id;
    state.step = 0;
    renderForm();
  } else {
    renderDetail(id);
  }
}

/* ---------------- NOVA INSPEÇÃO / FORMULÁRIO ---------------- */

function novaInspecaoVazia() {
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
        inspetor: '',
        responsavelArea: ''
      },
      tipoInspecao: '',
      checklist: [],
      fechamento: {
        classificacaoGeral: '',
        acaoImediata: '',
        descricaoNC: '',
        medidaImediata: '',
        medidaDefinitiva: '',
        responsavelAcao: '',
        prazo: '',
        observacoesFinais: '',
        necessitaReinspecao: '',
        fotosComplementaresIds: []
      },
      assinaturas: {
        inspetor: '',
        responsavelArea: ''
      }
    }
  };
}

async function startNewInspection() {
  const insp = novaInspecaoVazia();
  await DB.putInspection(insp);
  state.inspectionId = insp.id;
  state.step = 0;
  renderForm();
}

async function salvarRascunho(insp) {
  insp.updatedAt = Date.now();
  await DB.putInspection(insp);
}

async function renderForm() {
  state.screen = 'form';
  const insp = await DB.getInspection(state.inspectionId);

  const stepsNav = STEPS.map((label, idx) => `
    <div class="step-dot ${idx === state.step ? 'active' : ''} ${idx < state.step ? 'done' : ''}">${idx + 1}</div>
  `).join('');

  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-home" class="btn-link">← Voltar</button>
      <h1>${escapeHtml(insp.data.tipoInspecao || 'Nova inspeção')}</h1>
    </div>
    <div class="steps-nav">${stepsNav}</div>
    <div id="step-content"></div>
  `;

  document.getElementById('btn-back-home').addEventListener('click', async () => {
    await salvarRascunho(insp);
    renderHome();
  });

  const content = document.getElementById('step-content');
  if (state.step === 0) renderStepIdentificacao(content, insp);
  else if (state.step === 1) renderStepChecklist(content, insp);
  else if (state.step === 2) renderStepFechamento(content, insp);
  else renderStepRevisao(content, insp);
}

/* ---- Passo 1: Identificação ---- */
function renderStepIdentificacao(content, insp) {
  const id = insp.data.identificacao;
  const tiposOptions = TIPOS_INSPECAO.map((t) =>
    `<option value="${escapeHtml(t)}" ${insp.data.tipoInspecao === t ? 'selected' : ''}>${escapeHtml(t)}</option>`
  ).join('');

  content.innerHTML = `
    <form id="form-ident" class="form-section">
      <label>Data da inspeção *
        <input type="date" name="data" required value="${escapeHtml(id.data)}">
      </label>
      <label>Hora *
        <input type="time" name="hora" required value="${escapeHtml(id.hora)}">
      </label>
      <label>Empresa / Contratada *
        <input type="text" name="empresa" required value="${escapeHtml(id.empresa)}">
      </label>
      <label>Unidade / Projeto / Contrato *
        <input type="text" name="unidade" required value="${escapeHtml(id.unidade)}">
      </label>
      <label>Área / Setor / Frente de serviço *
        <input type="text" name="area" required value="${escapeHtml(id.area)}">
      </label>
      <label>Nome do inspetor *
        <input type="text" name="inspetor" required value="${escapeHtml(id.inspetor)}">
      </label>
      <label>Responsável da área acompanhando
        <input type="text" name="responsavelArea" value="${escapeHtml(id.responsavelArea)}">
      </label>
      <label>Tipo de inspeção *
        <select name="tipoInspecao" required>
          <option value="" disabled ${!insp.data.tipoInspecao ? 'selected' : ''}>Selecione…</option>
          ${tiposOptions}
        </select>
      </label>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Avançar →</button>
      </div>
    </form>
  `;

  const form = document.getElementById('form-ident');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    insp.data.identificacao = {
      data: fd.get('data'),
      hora: fd.get('hora'),
      empresa: fd.get('empresa').trim(),
      unidade: fd.get('unidade').trim(),
      area: fd.get('area').trim(),
      inspetor: fd.get('inspetor').trim(),
      responsavelArea: (fd.get('responsavelArea') || '').trim()
    };
    const novoTipo = fd.get('tipoInspecao');
    if (novoTipo !== insp.data.tipoInspecao || insp.data.checklist.length === 0) {
      insp.data.tipoInspecao = novoTipo;
      insp.data.checklist = gerarChecklistParaTipo(novoTipo);
    }
    await salvarRascunho(insp);
    state.step = 1;
    renderForm();
  });
}

/* ---- Passo 2: Checklist ---- */
function renderStepChecklist(content, insp) {
  content.innerHTML = `
    <div class="checklist" id="checklist-container"></div>
    <button id="btn-add-item" class="btn-secondary">+ Adicionar item personalizado</button>
    <div class="form-actions">
      <button id="btn-checklist-back" class="btn-link">← Voltar</button>
      <button id="btn-checklist-next" class="btn-primary">Avançar →</button>
    </div>
  `;

  const container = document.getElementById('checklist-container');
  renderChecklistItems(container, insp);

  document.getElementById('btn-add-item').addEventListener('click', async () => {
    const texto = prompt('Descreva o item de inspeção adicional:');
    if (!texto || !texto.trim()) return;
    const item = novoItemChecklist(texto.trim());
    item.personalizado = true;
    insp.data.checklist.push(item);
    await salvarRascunho(insp);
    renderChecklistItems(container, insp);
  });

  document.getElementById('btn-checklist-back').addEventListener('click', async () => {
    await salvarRascunho(insp);
    state.step = 0;
    renderForm();
  });

  document.getElementById('btn-checklist-next').addEventListener('click', async () => {
    await salvarRascunho(insp);
    state.step = 2;
    renderForm();
  });
}

function renderChecklistItems(container, insp) {
  if (insp.data.checklist.length === 0) {
    container.innerHTML = '<p class="empty-state">Nenhum item cadastrado para este tipo de inspeção. Adicione itens personalizados abaixo.</p>';
    return;
  }
  container.innerHTML = insp.data.checklist.map((item, idx) => renderChecklistItem(item, idx)).join('');

  insp.data.checklist.forEach((item, idx) => {
    const card = container.querySelector(`[data-idx="${idx}"]`);
    if (!card) return;

    card.querySelectorAll('input[type=radio]').forEach((radio) => {
      radio.addEventListener('change', async () => {
        item.resposta = radio.value;
        await salvarRascunho(insp);
        renderChecklistItems(container, insp);
      });
    });

    const obs = card.querySelector('.txt-observacao');
    if (obs) obs.addEventListener('blur', async () => {
      item.observacao = obs.value;
      await salvarRascunho(insp);
    });

    const med = card.querySelector('.txt-medida');
    if (med) med.addEventListener('blur', async () => {
      item.medida = med.value;
      await salvarRascunho(insp);
    });

    card.querySelectorAll('.input-foto-camera, .input-foto-galeria').forEach((fileInput) => {
      fileInput.addEventListener('change', async (e) => {
        await adicionarFotos(insp, item.photoIds, e.target.files, `item:${item.id}`);
        await salvarRascunho(insp);
        renderChecklistItems(container, insp);
      });
    });

    const btnRemoveItem = card.querySelector('.btn-remover-item');
    if (btnRemoveItem) btnRemoveItem.addEventListener('click', async () => {
      if (!confirm('Remover este item personalizado?')) return;
      for (const pid of item.photoIds) await DB.deletePhoto(pid);
      insp.data.checklist.splice(idx, 1);
      await salvarRascunho(insp);
      renderChecklistItems(container, insp);
    });

    renderThumbnails(card.querySelector('.thumbs'), item.photoIds).then(() => {
      card.querySelectorAll('.btn-remover-foto').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const photoId = btn.dataset.photoId;
          await DB.deletePhoto(photoId);
          item.photoIds = item.photoIds.filter((id) => id !== photoId);
          await salvarRascunho(insp);
          renderChecklistItems(container, insp);
        });
      });
    });
  });
}

function renderChecklistItem(item, idx) {
  const respostas = ['Conforme', 'Não Conforme', 'Não se Aplica'];
  const radiosHtml = respostas.map((r) => `
    <label class="radio-pill radio-${r === 'Conforme' ? 'ok' : r === 'Não Conforme' ? 'nc' : 'na'}">
      <input type="radio" name="resp-${idx}" value="${r}" ${item.resposta === r ? 'checked' : ''}>
      ${r}
    </label>
  `).join('');

  const destacar = item.resposta === 'Não Conforme';

  return `
    <div class="checklist-card ${destacar ? 'destaque-nc' : ''}" data-idx="${idx}">
      <div class="checklist-question">
        Questão ${String(idx + 1).padStart(2, '0')} — ${escapeHtml(item.texto)}
        ${item.personalizado ? '<button type="button" class="btn-remover-item" title="Remover item">✕</button>' : ''}
      </div>
      <div class="radio-group">${radiosHtml}</div>
      <div class="checklist-details">
        <div class="foto-botoes">
          <label class="file-label">📷 Tirar foto
            <input type="file" accept="image/*" capture="environment" class="input-foto-camera">
          </label>
          <label class="file-label">🖼️ Da galeria
            <input type="file" accept="image/*" multiple class="input-foto-galeria">
          </label>
        </div>
        <div class="thumbs"></div>
        <label>Observação / desvio identificado
          <textarea class="txt-observacao" rows="2">${escapeHtml(item.observacao)}</textarea>
        </label>
        <label>Medida de controle / ação necessária
          <textarea class="txt-medida" rows="2">${escapeHtml(item.medida)}</textarea>
        </label>
      </div>
    </div>
  `;
}

async function adicionarFotos(insp, photoIdsArray, fileList, questionRef) {
  for (const file of Array.from(fileList)) {
    const photo = {
      id: uuid(),
      inspectionId: insp.id,
      questionRef,
      mimeType: file.type || 'image/jpeg',
      fileName: file.name || `foto_${Date.now()}.jpg`,
      blob: file,
      synced: false,
      remoteUrl: null,
      createdAt: Date.now()
    };
    await DB.putPhoto(photo);
    photoIdsArray.push(photo.id);
  }
}

async function renderThumbnails(el, photoIds) {
  if (!el) return;
  if (!photoIds.length) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = photoIds.map((id) => `<div class="thumb" data-photo="${id}"></div>`).join('');
  for (const id of photoIds) {
    const photo = await DB.getPhoto(id);
    const thumbEl = el.querySelector(`[data-photo="${id}"]`);
    if (!photo || !thumbEl) continue;
    const url = URL.createObjectURL(photo.blob);
    thumbEl.innerHTML = `
      <img src="${url}" alt="Evidência">
      <span class="thumb-sync ${photo.synced ? 'ok' : ''}">${photo.synced ? '✓' : '⏳'}</span>
      <button type="button" class="btn-remover-foto" data-photo-id="${id}">✕</button>
    `;
  }
}

/* ---- Passo 3: Fechamento ---- */
function renderStepFechamento(content, insp) {
  const f = insp.data.fechamento;
  content.innerHTML = `
    <form id="form-fechamento" class="form-section">
      <label>Classificação geral *
        <select name="classificacaoGeral" required>
          <option value="" disabled ${!f.classificacaoGeral ? 'selected' : ''}>Selecione…</option>
          <option ${f.classificacaoGeral === 'Satisfatória' ? 'selected' : ''}>Satisfatória</option>
          <option ${f.classificacaoGeral === 'Requer melhoria' ? 'selected' : ''}>Requer melhoria</option>
          <option ${f.classificacaoGeral === 'Crítica' ? 'selected' : ''}>Crítica</option>
        </select>
      </label>

      <fieldset>
        <legend>Existe condição que exige ação imediata? *</legend>
        <label class="radio-inline"><input type="radio" name="acaoImediata" value="Sim" ${f.acaoImediata === 'Sim' ? 'checked' : ''} required> Sim</label>
        <label class="radio-inline"><input type="radio" name="acaoImediata" value="Não" ${f.acaoImediata === 'Não' ? 'checked' : ''}> Não</label>
      </fieldset>

      <label>Descrição da principal não conformidade
        <textarea name="descricaoNC" rows="3">${escapeHtml(f.descricaoNC)}</textarea>
      </label>
      <label>Medida de controle imediata adotada
        <textarea name="medidaImediata" rows="2">${escapeHtml(f.medidaImediata)}</textarea>
      </label>
      <label>Medida de controle definitiva recomendada
        <textarea name="medidaDefinitiva" rows="2">${escapeHtml(f.medidaDefinitiva)}</textarea>
      </label>
      <label>Responsável pela ação
        <input type="text" name="responsavelAcao" value="${escapeHtml(f.responsavelAcao)}">
      </label>
      <label>Prazo
        <input type="date" name="prazo" value="${escapeHtml(f.prazo)}">
      </label>

      <label>Evidência fotográfica complementar</label>
      <div class="foto-botoes">
        <label class="file-label">📷 Tirar foto
          <input type="file" accept="image/*" capture="environment" id="input-foto-fechamento-camera">
        </label>
        <label class="file-label">🖼️ Da galeria
          <input type="file" accept="image/*" multiple id="input-foto-fechamento-galeria">
        </label>
      </div>
      <div class="thumbs" id="thumbs-fechamento"></div>

      <label>Observações finais
        <textarea name="observacoesFinais" rows="3">${escapeHtml(f.observacoesFinais)}</textarea>
      </label>

      <fieldset>
        <legend>Necessita reinspeção? *</legend>
        <label class="radio-inline"><input type="radio" name="necessitaReinspecao" value="Sim" ${f.necessitaReinspecao === 'Sim' ? 'checked' : ''} required> Sim</label>
        <label class="radio-inline"><input type="radio" name="necessitaReinspecao" value="Não" ${f.necessitaReinspecao === 'Não' ? 'checked' : ''}> Não</label>
      </fieldset>

      <div class="form-actions">
        <button type="button" id="btn-fechamento-back" class="btn-link">← Voltar</button>
        <button type="submit" class="btn-primary">Avançar →</button>
      </div>
    </form>
  `;

  renderThumbnailsFechamento(insp);

  ['input-foto-fechamento-camera', 'input-foto-fechamento-galeria'].forEach((elId) => {
    document.getElementById(elId).addEventListener('change', async (e) => {
      await adicionarFotos(insp, f.fotosComplementaresIds, e.target.files, 'fechamento');
      await salvarRascunho(insp);
      renderThumbnailsFechamento(insp);
    });
  });

  document.getElementById('btn-fechamento-back').addEventListener('click', async () => {
    salvarFechamentoParcial(insp);
    await salvarRascunho(insp);
    state.step = 1;
    renderForm();
  });

  const form = document.getElementById('form-fechamento');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    salvarFechamentoParcial(insp);
    await salvarRascunho(insp);
    state.step = 3;
    renderForm();
  });

  function salvarFechamentoParcial(insp) {
    const fd = new FormData(form);
    insp.data.fechamento.classificacaoGeral = fd.get('classificacaoGeral') || '';
    insp.data.fechamento.acaoImediata = fd.get('acaoImediata') || '';
    insp.data.fechamento.descricaoNC = fd.get('descricaoNC') || '';
    insp.data.fechamento.medidaImediata = fd.get('medidaImediata') || '';
    insp.data.fechamento.medidaDefinitiva = fd.get('medidaDefinitiva') || '';
    insp.data.fechamento.responsavelAcao = fd.get('responsavelAcao') || '';
    insp.data.fechamento.prazo = fd.get('prazo') || '';
    insp.data.fechamento.observacoesFinais = fd.get('observacoesFinais') || '';
    insp.data.fechamento.necessitaReinspecao = fd.get('necessitaReinspecao') || '';
  }
}

async function renderThumbnailsFechamento(insp) {
  const el = document.getElementById('thumbs-fechamento');
  await renderThumbnails(el, insp.data.fechamento.fotosComplementaresIds);
  if (!el) return;
  el.querySelectorAll('.btn-remover-foto').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const photoId = btn.dataset.photoId;
      await DB.deletePhoto(photoId);
      insp.data.fechamento.fotosComplementaresIds = insp.data.fechamento.fotosComplementaresIds.filter((id) => id !== photoId);
      await salvarRascunho(insp);
      renderThumbnailsFechamento(insp);
    });
  });
}

/* ---- Passo 4: Revisão e salvar ---- */
async function renderStepRevisao(content, insp) {
  const totalItens = insp.data.checklist.length;
  const nc = insp.data.checklist.filter((i) => i.resposta === 'Não Conforme').length;
  const conforme = insp.data.checklist.filter((i) => i.resposta === 'Conforme').length;
  const naoRespondidos = insp.data.checklist.filter((i) => !i.resposta).length;

  content.innerHTML = `
    <div class="resumo">
      <h2>Resumo da inspeção</h2>
      <p><strong>${escapeHtml(insp.data.tipoInspecao)}</strong></p>
      <p>${escapeHtml(insp.data.identificacao.empresa)} · ${escapeHtml(insp.data.identificacao.area)}</p>
      <p>${escapeHtml(insp.data.identificacao.data)} ${escapeHtml(insp.data.identificacao.hora)}</p>
      <ul class="resumo-stats">
        <li>Itens verificados: ${totalItens}</li>
        <li class="ok">Conformes: ${conforme}</li>
        <li class="nc">Não conformes: ${nc}</li>
        ${naoRespondidos ? `<li class="alerta">${naoRespondidos} item(ns) sem resposta</li>` : ''}
      </ul>
      <p>Classificação geral: <strong>${escapeHtml(insp.data.fechamento.classificacaoGeral || '—')}</strong></p>
      <p>Necessita reinspeção: <strong>${escapeHtml(insp.data.fechamento.necessitaReinspecao || '—')}</strong></p>
    </div>
    <div class="form-actions">
      <button id="btn-revisao-back" class="btn-link">← Voltar</button>
      <button id="btn-concluir" class="btn-primary">Concluir e salvar</button>
    </div>
    <p class="hint">A inspeção fica salva no aparelho mesmo sem internet. Assim que houver conexão, ela é enviada automaticamente.</p>
  `;

  document.getElementById('btn-revisao-back').addEventListener('click', () => {
    state.step = 2;
    renderForm();
  });

  document.getElementById('btn-concluir').addEventListener('click', async () => {
    if (naoRespondidos > 0 && !confirm(`Existem ${naoRespondidos} item(ns) sem resposta. Deseja concluir mesmo assim?`)) {
      return;
    }
    insp.completo = true;
    insp.syncStatus = 'pendente';
    await salvarRascunho(insp);
    await refreshChrome();
    renderHome();
    Sync.syncAll().catch(() => {});
  });
}

function validarInspecaoParaRelatorio(insp) {
  const problemas = [];
  insp.data.checklist.forEach((item, idx) => {
    const num = String(idx + 1).padStart(2, '0');
    if (!item.resposta) {
      problemas.push(`Item ${num} ("${item.texto}") está sem resposta.`);
    } else if (item.resposta === 'Não Conforme' && !item.observacao && item.photoIds.length === 0) {
      problemas.push(`Item ${num} ("${item.texto}") está Não Conforme, mas não tem observação nem foto.`);
    }
  });
  return problemas;
}

/* ---------------- DETALHE DE INSPEÇÃO CONCLUÍDA ---------------- */

async function renderDetail(id) {
  state.screen = 'detail';
  state.inspectionId = id;
  const insp = await DB.getInspection(id);
  const photos = await DB.getPhotosByInspection(id);
  const s = statusLabel(insp);

  const checklistHtml = insp.data.checklist.map((item, idx) => {
    const itemPhotos = photos.filter((p) => p.questionRef === `item:${item.id}`);
    return `
      <div class="detail-item">
        <div><strong>Q${String(idx + 1).padStart(2, '0')}.</strong> ${escapeHtml(item.texto)}</div>
        <div class="detail-resposta resposta-${item.resposta === 'Conforme' ? 'ok' : item.resposta === 'Não Conforme' ? 'nc' : 'na'}">${escapeHtml(item.resposta || 'Sem resposta')}</div>
        ${item.observacao ? `<div class="detail-obs">Obs.: ${escapeHtml(item.observacao)}</div>` : ''}
        ${item.medida ? `<div class="detail-obs">Medida: ${escapeHtml(item.medida)}</div>` : ''}
        ${itemPhotos.length ? `<div class="thumbs">${itemPhotos.map((p) => `<div class="thumb"><img src="${URL.createObjectURL(p.blob)}"><span class="thumb-sync ${p.synced ? 'ok' : ''}">${p.synced ? '✓' : '⏳'}</span></div>`).join('')}</div>` : ''}
      </div>
    `;
  }).join('');

  const fotosFechamento = photos.filter((p) => p.questionRef === 'fechamento');

  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-home" class="btn-link">← Voltar</button>
      <h1>${escapeHtml(insp.data.tipoInspecao)}</h1>
    </div>
    <span class="badge ${s.cls}">${s.text}</span>
    ${insp.syncError ? `<p class="erro-msg">${escapeHtml(insp.syncError)}</p>` : ''}
    <div class="detail-block">
      <p>${escapeHtml(insp.data.identificacao.empresa)} · ${escapeHtml(insp.data.identificacao.unidade)} · ${escapeHtml(insp.data.identificacao.area)}</p>
      <p>${escapeHtml(insp.data.identificacao.data)} ${escapeHtml(insp.data.identificacao.hora)} · Inspetor: ${escapeHtml(insp.data.identificacao.inspetor)}</p>
    </div>
    <h3>Checklist</h3>
    ${checklistHtml}
    <h3>Fechamento</h3>
    <div class="detail-block">
      <p>Classificação: <strong>${escapeHtml(insp.data.fechamento.classificacaoGeral)}</strong></p>
      <p>Ação imediata necessária: ${escapeHtml(insp.data.fechamento.acaoImediata)}</p>
      ${insp.data.fechamento.descricaoNC ? `<p>Descrição da NC: ${escapeHtml(insp.data.fechamento.descricaoNC)}</p>` : ''}
      ${insp.data.fechamento.medidaImediata ? `<p>Medida imediata: ${escapeHtml(insp.data.fechamento.medidaImediata)}</p>` : ''}
      ${insp.data.fechamento.medidaDefinitiva ? `<p>Medida definitiva: ${escapeHtml(insp.data.fechamento.medidaDefinitiva)}</p>` : ''}
      ${insp.data.fechamento.responsavelAcao ? `<p>Responsável: ${escapeHtml(insp.data.fechamento.responsavelAcao)}</p>` : ''}
      ${insp.data.fechamento.prazo ? `<p>Prazo: ${escapeHtml(insp.data.fechamento.prazo)}</p>` : ''}
      ${insp.data.fechamento.observacoesFinais ? `<p>Observações finais: ${escapeHtml(insp.data.fechamento.observacoesFinais)}</p>` : ''}
      <p>Necessita reinspeção: ${escapeHtml(insp.data.fechamento.necessitaReinspecao)}</p>
      ${fotosFechamento.length ? `<div class="thumbs">${fotosFechamento.map((p) => `<div class="thumb"><img src="${URL.createObjectURL(p.blob)}"><span class="thumb-sync ${p.synced ? 'ok' : ''}">${p.synced ? '✓' : '⏳'}</span></div>`).join('')}</div>` : ''}
    </div>
    <div class="form-actions">
      <button id="btn-editar-inspecao" class="btn-secondary">✏️ Editar inspeção</button>
      <button id="btn-relatorio" class="btn-secondary">Gerar relatório (PDF)</button>
    </div>
    <div class="form-actions">
      ${insp.syncStatus !== 'synced' ? '<button id="btn-sync-one" class="btn-primary">Sincronizar esta inspeção</button>' : ''}
      <button id="btn-excluir" class="btn-danger">Excluir inspeção</button>
    </div>
  `;

  document.getElementById('btn-back-home').addEventListener('click', renderHome);
  document.getElementById('btn-relatorio').addEventListener('click', () => {
    const problemas = validarInspecaoParaRelatorio(insp);
    if (problemas.length) {
      alert('Não é possível gerar o relatório ainda:\n\n- ' + problemas.join('\n- ') + '\n\nToque em "Editar inspeção" para corrigir.');
      return;
    }
    renderReport(id);
  });
  document.getElementById('btn-editar-inspecao').addEventListener('click', async () => {
    insp.metaSynced = false;
    insp.syncStatus = 'pendente';
    await salvarRascunho(insp);
    state.inspectionId = id;
    state.step = 0;
    renderForm();
  });

  const btnSyncOne = document.getElementById('btn-sync-one');
  if (btnSyncOne) btnSyncOne.addEventListener('click', async () => {
    btnSyncOne.disabled = true;
    btnSyncOne.textContent = 'Sincronizando…';
    try {
      await Sync.syncInspection(id);
    } catch (e) {
      alert('Não foi possível sincronizar agora: ' + e.message);
    }
    renderDetail(id);
    updateSyncBar();
  });

  document.getElementById('btn-excluir').addEventListener('click', async () => {
    if (!confirm('Excluir esta inspeção e todas as suas fotos do dispositivo? Esta ação não pode ser desfeita.')) return;
    for (const p of photos) await DB.deletePhoto(p.id);
    await DB.deleteInspection(id);
    renderHome();
    updateSyncBar();
  });
}

/* ---------------- CONFIGURAÇÕES ---------------- */

async function renderSettings() {
  state.screen = 'settings';
  const endpoint = (await Sync.getEndpoint()) || '';

  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-home" class="btn-link">← Voltar</button>
      <h1>Configurações</h1>
    </div>
    <div class="form-section">
      <label>Endereço de sincronização (Google Apps Script Web App)
        <input type="url" id="input-endpoint" placeholder="https://script.google.com/macros/s/..." value="${escapeHtml(endpoint || '')}">
      </label>
      <p class="hint">
        Cole aqui a URL de implantação do Google Apps Script fornecido em
        <code>server/Code.gs</code>. É esse endereço que recebe os dados e as
        fotos das inspeções quando o aparelho está online, gravando tudo em
        uma planilha do Google Sheets e em uma pasta do Google Drive.
      </p>
      <button id="btn-salvar-endpoint" class="btn-primary">Salvar</button>
      <button id="btn-testar-endpoint" class="btn-secondary">Testar conexão</button>
      <p id="teste-resultado"></p>
    </div>
    <div class="form-section">
      <h3>Sobre o funcionamento offline</h3>
      <p class="hint">
        O aplicativo grava cada inspeção e cada foto diretamente no aparelho.
        Não é necessário estar conectado para preencher inspeções ou tirar
        fotos. Assim que o aparelho detectar conexão com a internet, os
        dados pendentes são enviados automaticamente, foto por foto, sem
        precisar reabrir o aplicativo.
      </p>
    </div>
    <div class="form-section">
      <h3>Versão instalada neste aparelho</h3>
      <p class="hint">Versão do aplicativo: <strong>${APP_VERSION}</strong></p>
      <p class="hint" id="info-cache">Verificando versão salva no cache…</p>
      <button id="btn-forcar-atualizacao" class="btn-secondary">Forçar verificação de atualização</button>
    </div>
  `;

  document.getElementById('btn-back-home').addEventListener('click', renderHome);

  (async () => {
    const infoEl = document.getElementById('info-cache');
    if (!infoEl) return;
    if (!('caches' in window)) { infoEl.textContent = 'Este navegador não informa o cache instalado.'; return; }
    const chaves = await caches.keys();
    infoEl.textContent = chaves.length ? 'Cache instalado: ' + chaves.join(', ') : 'Nenhum cache instalado ainda.';
  })();

  document.getElementById('btn-forcar-atualizacao').addEventListener('click', async () => {
    const resEl = document.getElementById('info-cache');
    const btn = document.getElementById('btn-forcar-atualizacao');
    btn.disabled = true;
    resEl.textContent = 'Limpando cache e buscando a versão mais recente…';
    try {
      if ('caches' in window) {
        const chaves = await caches.keys();
        await Promise.all(chaves.map((k) => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch (e) {
      console.warn('Falha ao limpar cache/Service Worker:', e);
    }
    resEl.textContent = 'Recarregando…';
    location.reload();
  });

  document.getElementById('btn-salvar-endpoint').addEventListener('click', async () => {
    const url = document.getElementById('input-endpoint').value.trim();
    await Sync.setEndpoint(url);
    document.getElementById('teste-resultado').textContent = 'Endereço salvo.';
  });

  document.getElementById('btn-testar-endpoint').addEventListener('click', async () => {
    const url = document.getElementById('input-endpoint').value.trim();
    const resEl = document.getElementById('teste-resultado');
    if (!url) { resEl.textContent = 'Informe um endereço antes de testar.'; return; }
    if (!navigator.onLine) { resEl.textContent = 'Sem conexão com a internet no momento.'; return; }
    resEl.textContent = 'Testando…';
    try {
      const resp = await postJson(url, { action: 'ping' });
      resEl.textContent = resp && resp.ok ? 'Conexão bem-sucedida.' : 'O servidor respondeu, mas com erro: ' + (resp && resp.error);
    } catch (e) {
      resEl.textContent = 'Falha ao conectar: ' + e.message;
    }
  });
}

document.getElementById('btn-settings').addEventListener('click', renderSettings);
document.getElementById('tab-inspecoes').addEventListener('click', renderHome);
document.getElementById('tab-dds').addEventListener('click', renderDDSHome);
document.getElementById('tab-diagnostico').addEventListener('click', renderDiagHome);
document.getElementById('tab-cipa').addEventListener('click', renderCipaHome);
document.getElementById('tab-ptapr').addEventListener('click', renderPTAPRHome);
document.getElementById('tab-certificados').addEventListener('click', renderCertificadosHome);
document.getElementById('tab-pet').addEventListener('click', renderPETHome);

/* ---------------- INICIALIZAÇÃO ---------------- */

async function init() {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('sw.js');
      // Força checar por uma versão mais nova a cada abertura do app, em vez de
      // depender só da checagem automática do navegador (que pode demorar a acontecer).
      reg.update().catch(() => {});
    } catch (e) {
      console.warn('Falha ao registrar service worker:', e);
    }
  }
  updateConnBadge();
  await updateSyncBar();
  await renderHome();
  Sync.syncAll().catch(() => {});
}

init();
