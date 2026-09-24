/* Módulo de Vistoria de Veículo. Checklist dos itens de segurança
 * obrigatórios do veículo (frota própria ou de terceiros) e um croqui
 * interativo (vista superior) onde o inspetor marca a localização de
 * avarias existentes — risco, amassado, quebrado etc. — com um clique/
 * toque, prática comum em vistorias de check-in/check-out de veículos. */

const VEICULO_STEPS = ['Identificação', 'Checklist', 'Avarias e Fechamento', 'Revisão'];

function novoItemVeiculo(texto) {
  return { id: uuid(), texto, resposta: '', observacao: '', photoIds: [] };
}

function gerarChecklistVeiculo() {
  return CHECKLIST_VEICULO.map((texto) => novoItemVeiculo(texto));
}

function novaAvariaVeiculo(x, y) {
  return { id: uuid(), x, y, tipo: TIPOS_AVARIA_VEICULO[0], descricao: '' };
}

function novoVeiculoVazio() {
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
        placa: '',
        marca: '',
        modelo: '',
        km: '',
        condutor: ''
      },
      checklist: gerarChecklistVeiculo(),
      avarias: [],
      fotosIds: [],
      fechamento: {
        classificacaoGeral: '',
        condicoesUso: '',
        responsavelVistoria: '',
        observacoesFinais: ''
      },
      assinaturas: {
        responsavelVistoria: ''
      },
      localizacao: null
    }
  };
}

async function salvarRascunhoVeiculo(v) {
  v.updatedAt = Date.now();
  await DB.putVeiculo(v);
}

/* ---------------- HOME DO MÓDULO ---------------- */

async function renderVeiculoHome() {
  state.screen = 'veiculo-home';
  setActiveTab('veiculo');
  const registros = await DB.getAllVeiculos();

  const itemsHtml = registros.length
    ? registros.map((v) => {
        const s = statusLabel(v);
        const ident = v.data.identificacao;
        return `
          <li class="insp-card" data-id="${v.id}">
            <div class="insp-card-main">
              <div class="insp-card-title">${escapeHtml(ident.placa || 'Vistoria de Veículo')}</div>
              <div class="insp-card-sub">${escapeHtml(ident.marca || '')} ${escapeHtml(ident.modelo || '')} · ${escapeHtml(ident.empresa || '')}</div>
              <div class="insp-card-sub">${escapeHtml(ident.data || '')} ${escapeHtml(ident.hora || '')} · ${v.data.avarias.length} avaria(s)</div>
            </div>
            <div class="insp-card-side">
              <span class="badge ${s.cls}">${s.text}</span>
              <button type="button" class="btn-excluir-card" data-id="${v.id}" title="Excluir">🗑</button>
            </div>
          </li>
        `;
      }).join('')
    : '<li class="empty-state">Nenhuma vistoria de veículo registrada ainda. Toque em "Nova vistoria" para começar.</li>';

  view.innerHTML = `
    <div class="screen-header">
      <h1>Vistoria de Veículo</h1>
      <button id="btn-new-veiculo" class="btn-primary">+ Nova vistoria</button>
    </div>
    <ul class="insp-list">${itemsHtml}</ul>
  `;

  document.getElementById('btn-new-veiculo').addEventListener('click', startNewVeiculo);
  view.querySelectorAll('.insp-card').forEach((el) => {
    el.addEventListener('click', () => openVeiculo(el.dataset.id));
  });
  view.querySelectorAll('.btn-excluir-card').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      excluirVeiculo(btn.dataset.id);
    });
  });
}

async function excluirVeiculo(id) {
  const v = await DB.getVeiculo(id);
  if (!v) return;
  const rotulo = v.completo ? 'esta vistoria' : 'este rascunho de vistoria';
  if (!confirm(`Excluir ${rotulo} de veículo e todas as suas fotos do dispositivo? Esta ação não pode ser desfeita.`)) return;
  const photos = await DB.getPhotosByInspection(id);
  for (const p of photos) await DB.deletePhoto(p.id);
  await DB.deleteVeiculo(id);
  renderVeiculoHome();
  updateSyncBar();
}

async function openVeiculo(id) {
  const v = await DB.getVeiculo(id);
  if (!v.completo) {
    state.veiculoId = id;
    state.step = 0;
    renderVeiculoForm();
  } else {
    renderVeiculoDetail(id);
  }
}

async function startNewVeiculo() {
  const v = novoVeiculoVazio();
  await DB.putVeiculo(v);
  state.veiculoId = v.id;
  state.step = 0;
  renderVeiculoForm();
  localizacoesPendentes[v.id] = capturarLocalizacao();
}

/* ---------------- FORMULÁRIO (MULTI-ETAPAS) ---------------- */

async function renderVeiculoForm() {
  state.screen = 'veiculo-form';
  const v = await DB.getVeiculo(state.veiculoId);

  const stepsNav = VEICULO_STEPS.map((label, idx) => `
    <div class="step-dot ${idx === state.step ? 'active' : ''} ${idx < state.step ? 'done' : ''}">${idx + 1}</div>
  `).join('');

  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-veiculo-home" class="btn-link">← Voltar</button>
      <h1>${escapeHtml(v.data.identificacao.placa || 'Nova Vistoria')}</h1>
    </div>
    <div class="steps-nav">${stepsNav}</div>
    <div id="veiculo-step-content"></div>
  `;

  document.getElementById('btn-back-veiculo-home').addEventListener('click', async () => {
    await salvarRascunhoVeiculo(v);
    renderVeiculoHome();
  });

  const content = document.getElementById('veiculo-step-content');
  if (state.step === 0) renderVeiculoStepIdentificacao(content, v);
  else if (state.step === 1) renderVeiculoStepChecklist(content, v);
  else if (state.step === 2) renderVeiculoStepAvarias(content, v);
  else renderVeiculoStepRevisao(content, v);
}

/* ---- Passo 1: Identificação ---- */
function renderVeiculoStepIdentificacao(content, v) {
  const id = v.data.identificacao;
  content.innerHTML = `
    <form id="form-veiculo-ident" class="form-section">
      <label>Data *
        <input type="date" name="data" required value="${escapeHtml(id.data)}">
      </label>
      <label>Hora *
        <input type="time" name="hora" required value="${escapeHtml(id.hora)}">
      </label>
      <label>Empresa / Contratada *
        <input type="text" name="empresa" required value="${escapeHtml(id.empresa)}">
      </label>
      <label>Unidade / Projeto
        <input type="text" name="unidade" value="${escapeHtml(id.unidade)}">
      </label>
      <label>Placa *
        <input type="text" name="placa" required style="text-transform:uppercase;" value="${escapeHtml(id.placa)}">
      </label>
      <label>Marca
        <input type="text" name="marca" value="${escapeHtml(id.marca)}">
      </label>
      <label>Modelo
        <input type="text" name="modelo" value="${escapeHtml(id.modelo)}">
      </label>
      <label>Quilometragem (km)
        <input type="number" name="km" min="0" value="${escapeHtml(id.km)}">
      </label>
      <label>Condutor *
        <input type="text" name="condutor" required value="${escapeHtml(id.condutor)}">
      </label>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Avançar →</button>
      </div>
    </form>
  `;

  const form = document.getElementById('form-veiculo-ident');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    v.data.identificacao = {
      data: fd.get('data'),
      hora: fd.get('hora'),
      empresa: fd.get('empresa').trim(),
      unidade: (fd.get('unidade') || '').trim(),
      placa: fd.get('placa').trim().toUpperCase(),
      marca: (fd.get('marca') || '').trim(),
      modelo: (fd.get('modelo') || '').trim(),
      km: fd.get('km') || '',
      condutor: fd.get('condutor').trim()
    };
    await salvarRascunhoVeiculo(v);
    state.step = 1;
    renderVeiculoForm();
  });
}

/* ---- Passo 2: Checklist ---- */
function renderVeiculoStepChecklist(content, v) {
  content.innerHTML = `
    <div class="checklist" id="veiculo-checklist-container"></div>
    <div class="form-actions">
      <button id="btn-veiculo-checklist-back" class="btn-link">← Voltar</button>
      <button id="btn-veiculo-checklist-next" class="btn-primary">Avançar →</button>
    </div>
  `;

  const container = document.getElementById('veiculo-checklist-container');
  renderVeiculoChecklistItems(container, v);

  document.getElementById('btn-veiculo-checklist-back').addEventListener('click', async () => {
    state.step = 0;
    renderVeiculoForm();
  });

  document.getElementById('btn-veiculo-checklist-next').addEventListener('click', async () => {
    state.step = 2;
    renderVeiculoForm();
  });
}

function renderVeiculoItem(item, idx) {
  const respostas = ['Conforme', 'Não Conforme', 'Não se Aplica'];
  const radiosHtml = respostas.map((r) => `
    <label class="radio-pill radio-${r === 'Conforme' ? 'ok' : r === 'Não Conforme' ? 'nc' : 'na'}">
      <input type="radio" name="veiculo-resp-${idx}" value="${r}" ${item.resposta === r ? 'checked' : ''}>
      ${r}
    </label>
  `).join('');

  const destacar = item.resposta === 'Não Conforme';

  return `
    <div class="checklist-card ${destacar ? 'destaque-nc' : ''}" data-idx="${idx}">
      <div class="checklist-question">${String(idx + 1).padStart(2, '0')}. ${escapeHtml(item.texto)}</div>
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
        <label>Observação
          <textarea class="txt-observacao" rows="2">${escapeHtml(item.observacao)}</textarea>
        </label>
      </div>
    </div>
  `;
}

function renderVeiculoChecklistItems(container, v) {
  container.innerHTML = v.data.checklist.map((item, idx) => renderVeiculoItem(item, idx)).join('');

  v.data.checklist.forEach((item, idx) => {
    const card = container.querySelector(`.checklist-card[data-idx="${idx}"]`);
    if (!card) return;

    card.querySelectorAll('input[type=radio]').forEach((radio) => {
      radio.addEventListener('change', async () => {
        item.resposta = radio.value;
        await salvarRascunhoVeiculo(v);
        renderVeiculoChecklistItems(container, v);
      });
    });

    const obs = card.querySelector('.txt-observacao');
    if (obs) obs.addEventListener('blur', async () => {
      item.observacao = obs.value;
      await salvarRascunhoVeiculo(v);
    });

    card.querySelectorAll('.input-foto-camera, .input-foto-galeria').forEach((fileInput) => {
      fileInput.addEventListener('change', async (e) => {
        await adicionarFotos(v, item.photoIds, e.target.files, `item:${item.id}`);
        await salvarRascunhoVeiculo(v);
        renderVeiculoChecklistItems(container, v);
      });
    });

    renderThumbnails(card.querySelector('.thumbs'), item.photoIds).then(() => {
      card.querySelectorAll('.btn-remover-foto').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const photoId = btn.dataset.photoId;
          await DB.deletePhoto(photoId);
          item.photoIds = item.photoIds.filter((id) => id !== photoId);
          await salvarRascunhoVeiculo(v);
          renderVeiculoChecklistItems(container, v);
        });
      });
    });
  });
}

/* ---- Croqui do veículo (SVG, vista superior) ---- */
function svgCroquiVeiculo(avarias) {
  const marcadores = avarias.map((a, idx) => {
    const cx = (a.x / 100) * 300;
    const cy = (a.y / 100) * 500;
    return `
      <g>
        <circle cx="${cx}" cy="${cy}" r="14" fill="#b02a2a" stroke="#fff" stroke-width="2"></circle>
        <text x="${cx}" y="${cy + 5}" font-size="14" fill="#fff" text-anchor="middle" font-weight="bold">${idx + 1}</text>
      </g>
    `;
  }).join('');

  return `
    <svg viewBox="0 0 300 500" id="croqui-veiculo-svg" class="croqui-svg">
      <rect x="1" y="1" width="298" height="498" fill="#eef2f6" stroke="#c7d1db"></rect>
      <text x="150" y="22" text-anchor="middle" font-size="14" fill="#5a6572">FRENTE</text>
      <rect x="60" y="40" width="180" height="420" rx="40" fill="#ffffff" stroke="#33475b" stroke-width="2"></rect>
      <rect x="80" y="80" width="140" height="45" rx="6" fill="#cfe2ff" stroke="#33475b"></rect>
      <rect x="80" y="375" width="140" height="45" rx="6" fill="#cfe2ff" stroke="#33475b"></rect>
      <rect x="38" y="110" width="24" height="70" rx="6" fill="#33475b"></rect>
      <rect x="238" y="110" width="24" height="70" rx="6" fill="#33475b"></rect>
      <rect x="38" y="320" width="24" height="70" rx="6" fill="#33475b"></rect>
      <rect x="238" y="320" width="24" height="70" rx="6" fill="#33475b"></rect>
      <rect x="45" y="95" width="14" height="14" fill="#5a6572"></rect>
      <rect x="241" y="95" width="14" height="14" fill="#5a6572"></rect>
      <text x="150" y="486" text-anchor="middle" font-size="14" fill="#5a6572">TRASEIRA</text>
      ${marcadores}
    </svg>
  `;
}

/* ---- Passo 3: Avarias (croqui interativo) e Fechamento ---- */
function renderVeiculoStepAvarias(content, v) {
  const f = v.data.fechamento;
  content.innerHTML = `
    <h3>Croqui do veículo — vista superior</h3>
    <p class="hint">Toque no desenho do veículo no ponto onde há uma avaria para marcá-la.</p>
    <div id="croqui-veiculo-container" class="croqui-container"></div>
    <div id="veiculo-avarias-container"></div>

    <label>Evidência fotográfica</label>
    <div class="foto-botoes">
      <label class="file-label">📷 Tirar foto
        <input type="file" accept="image/*" capture="environment" id="input-foto-veiculo-camera">
      </label>
      <label class="file-label">🖼️ Da galeria
        <input type="file" accept="image/*" multiple id="input-foto-veiculo-galeria">
      </label>
    </div>
    <div class="thumbs" id="thumbs-veiculo"></div>

    <div class="form-section" style="margin-top:16px;">
      <h3>Fechamento da vistoria</h3>
      <label>Classificação geral do veículo *
        <select id="veiculo-classificacao-geral" required>
          <option value="">Selecione…</option>
          <option ${f.classificacaoGeral === 'Bom' ? 'selected' : ''}>Bom</option>
          <option ${f.classificacaoGeral === 'Regular' ? 'selected' : ''}>Regular</option>
          <option ${f.classificacaoGeral === 'Ruim' ? 'selected' : ''}>Ruim</option>
        </select>
      </label>
      <fieldset>
        <legend>Veículo em condições de uso?</legend>
        <label class="radio-inline"><input type="radio" name="condicoesUso" value="Sim" ${f.condicoesUso === 'Sim' ? 'checked' : ''}> Sim</label>
        <label class="radio-inline"><input type="radio" name="condicoesUso" value="Não" ${f.condicoesUso === 'Não' ? 'checked' : ''}> Não</label>
      </fieldset>
      <label>Responsável pela vistoria *
        <input type="text" id="veiculo-responsavel-vistoria" required value="${escapeHtml(f.responsavelVistoria)}">
      </label>
      <label>Observações finais
        <textarea id="veiculo-observacoes-finais" rows="2">${escapeHtml(f.observacoesFinais)}</textarea>
      </label>
    </div>

    <div class="form-actions">
      <button id="btn-veiculo-avarias-back" class="btn-link">← Voltar</button>
      <button id="btn-veiculo-avarias-next" class="btn-primary">Avançar →</button>
    </div>
  `;

  const croquiContainer = document.getElementById('croqui-veiculo-container');
  const avariasContainer = document.getElementById('veiculo-avarias-container');

  function refreshCroqui() {
    croquiContainer.innerHTML = svgCroquiVeiculo(v.data.avarias);
    const svg = document.getElementById('croqui-veiculo-svg');
    svg.addEventListener('click', async (e) => {
      const rect = svg.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      v.data.avarias.push(novaAvariaVeiculo(x, y));
      await salvarRascunhoVeiculo(v);
      refreshCroqui();
      renderAvariasVeiculo(avariasContainer, v, refreshCroqui);
    });
  }
  refreshCroqui();
  renderAvariasVeiculo(avariasContainer, v, refreshCroqui);

  async function refreshThumbsVeiculo() {
    const el = document.getElementById('thumbs-veiculo');
    await renderThumbnails(el, v.data.fotosIds);
    el.querySelectorAll('.btn-remover-foto').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const photoId = btn.dataset.photoId;
        await DB.deletePhoto(photoId);
        v.data.fotosIds = v.data.fotosIds.filter((pid) => pid !== photoId);
        await salvarRascunhoVeiculo(v);
        refreshThumbsVeiculo();
      });
    });
  }
  refreshThumbsVeiculo();

  ['input-foto-veiculo-camera', 'input-foto-veiculo-galeria'].forEach((elId) => {
    document.getElementById(elId).addEventListener('change', async (e) => {
      await adicionarFotos(v, v.data.fotosIds, e.target.files, 'veiculo');
      await salvarRascunhoVeiculo(v);
      refreshThumbsVeiculo();
    });
  });

  function coletarFechamento() {
    v.data.fechamento.classificacaoGeral = document.getElementById('veiculo-classificacao-geral').value;
    const radioMarcado = content.querySelector('input[name="condicoesUso"]:checked');
    v.data.fechamento.condicoesUso = radioMarcado ? radioMarcado.value : '';
    v.data.fechamento.responsavelVistoria = document.getElementById('veiculo-responsavel-vistoria').value.trim();
    v.data.fechamento.observacoesFinais = document.getElementById('veiculo-observacoes-finais').value;
  }

  document.getElementById('btn-veiculo-avarias-back').addEventListener('click', async () => {
    coletarFechamento();
    await salvarRascunhoVeiculo(v);
    state.step = 1;
    renderVeiculoForm();
  });

  document.getElementById('btn-veiculo-avarias-next').addEventListener('click', async () => {
    coletarFechamento();
    if (!v.data.fechamento.classificacaoGeral || !v.data.fechamento.responsavelVistoria) {
      alert('Preencha a classificação geral e o responsável pela vistoria antes de avançar.');
      return;
    }
    await salvarRascunhoVeiculo(v);
    state.step = 3;
    renderVeiculoForm();
  });
}

function renderAvariasVeiculo(container, v, onChangeCroqui) {
  const avarias = v.data.avarias;
  container.innerHTML = avarias.length
    ? `<h3>Avarias marcadas (${avarias.length})</h3>` + avarias.map((a, idx) => `
        <div class="leitura-card" data-idx="${idx}">
          <div class="participante-linha">
            <label class="campo-leitura">Avaria nº ${idx + 1} — Tipo
              <select class="in-tipo-avaria">${TIPOS_AVARIA_VEICULO.map((t) => `<option ${a.tipo === t ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('')}</select>
            </label>
            <button type="button" class="btn-remover-item btn-remover-avaria" title="Remover avaria">✕</button>
          </div>
          <label>Descrição
            <input type="text" class="in-descricao-avaria" placeholder="Ex.: risco na porta dianteira esquerda" value="${escapeHtml(a.descricao)}">
          </label>
        </div>
      `).join('')
    : '<p class="empty-state">Nenhuma avaria marcada. Se o veículo estiver íntegro, siga em frente.</p>';

  avarias.forEach((a, idx) => {
    const card = container.querySelector(`.leitura-card[data-idx="${idx}"]`);
    if (!card) return;

    card.querySelector('.in-tipo-avaria').addEventListener('change', async (e) => {
      a.tipo = e.target.value;
      await salvarRascunhoVeiculo(v);
    });
    card.querySelector('.in-descricao-avaria').addEventListener('blur', async (e) => {
      a.descricao = e.target.value.trim();
      await salvarRascunhoVeiculo(v);
    });
    card.querySelector('.btn-remover-avaria').addEventListener('click', async () => {
      if (!confirm('Remover esta avaria do croqui?')) return;
      v.data.avarias.splice(idx, 1);
      await salvarRascunhoVeiculo(v);
      onChangeCroqui();
      renderAvariasVeiculo(container, v, onChangeCroqui);
    });
  });
}

/* ---- Passo 4: Revisão e salvar ---- */
function renderVeiculoStepRevisao(content, v) {
  const totalItens = v.data.checklist.length;
  const nc = v.data.checklist.filter((i) => i.resposta === 'Não Conforme').length;
  const semResposta = v.data.checklist.filter((i) => !i.resposta).length;

  content.innerHTML = `
    <div class="resumo">
      <h2>Resumo da Vistoria</h2>
      <p><strong>${escapeHtml(v.data.identificacao.placa)}</strong> — ${escapeHtml(v.data.identificacao.marca)} ${escapeHtml(v.data.identificacao.modelo)}</p>
      <p>${escapeHtml(v.data.identificacao.empresa)} · ${escapeHtml(v.data.identificacao.data)} ${escapeHtml(v.data.identificacao.hora)}</p>
      <ul class="resumo-stats">
        <li>Itens verificados: ${totalItens}</li>
        <li class="nc">Não conformes: ${nc}</li>
        ${semResposta ? `<li class="alerta">${semResposta} item(ns) sem resposta</li>` : ''}
        <li>Avarias marcadas no croqui: ${v.data.avarias.length}</li>
      </ul>
    </div>
    <div class="form-actions">
      <button id="btn-veiculo-revisao-back" class="btn-link">← Voltar</button>
      <button id="btn-veiculo-concluir" class="btn-primary">Concluir e salvar</button>
    </div>
    <p class="hint">A vistoria fica salva no aparelho mesmo sem internet. Assim que houver conexão, é enviada automaticamente.</p>
  `;

  document.getElementById('btn-veiculo-revisao-back').addEventListener('click', () => {
    state.step = 2;
    renderVeiculoForm();
  });

  document.getElementById('btn-veiculo-concluir').addEventListener('click', async () => {
    if (semResposta > 0 && !confirm(`Existem ${semResposta} item(ns) sem resposta. Deseja concluir mesmo assim?`)) {
      return;
    }
    await aplicarLocalizacaoPendente(v);
    v.completo = true;
    v.syncStatus = 'pendente';
    await salvarRascunhoVeiculo(v);
    await refreshChrome();
    renderVeiculoHome();
    Sync.syncAll().catch(() => {});
  });
}

/* ---------------- VALIDAÇÃO PARA O RELATÓRIO ---------------- */

function validarVeiculoParaRelatorio(v) {
  const problemas = [];
  v.data.checklist.forEach((item, idx) => {
    const num = String(idx + 1).padStart(2, '0');
    if (!item.resposta) {
      problemas.push(`Item ${num} ("${item.texto}") está sem resposta.`);
    } else if (item.resposta === 'Não Conforme' && !item.observacao && item.photoIds.length === 0) {
      problemas.push(`Item ${num} ("${item.texto}") está Não Conforme, mas não tem observação nem foto.`);
    }
  });
  v.data.avarias.forEach((a, idx) => {
    if (!a.descricao) problemas.push(`Avaria nº ${idx + 1} está sem descrição.`);
  });
  if (!v.data.fechamento.classificacaoGeral) {
    problemas.push('A classificação geral do veículo não foi informada.');
  }
  return problemas;
}

/* ---------------- DETALHE ---------------- */

async function renderVeiculoDetail(id) {
  state.screen = 'veiculo-detail';
  state.veiculoId = id;
  const v = await DB.getVeiculo(id);
  const photos = await DB.getPhotosByInspection(id);
  const s = statusLabel(v);
  const ident = v.data.identificacao;
  const f = v.data.fechamento;

  const checklistHtml = v.data.checklist.map((item, idx) => {
    const itemPhotos = photos.filter((p) => p.questionRef === `item:${item.id}`);
    return `
      <div class="detail-item">
        <div><strong>Item ${String(idx + 1).padStart(2, '0')}.</strong> ${escapeHtml(item.texto)}</div>
        <div class="detail-resposta resposta-${item.resposta === 'Conforme' ? 'ok' : item.resposta === 'Não Conforme' ? 'nc' : 'na'}">${escapeHtml(item.resposta || 'Sem resposta')}</div>
        ${item.observacao ? `<div class="detail-obs">Obs.: ${escapeHtml(item.observacao)}</div>` : ''}
        ${itemPhotos.length ? `<div class="thumbs">${itemPhotos.map((p) => `<div class="thumb"><img src="${URL.createObjectURL(p.blob)}"><span class="thumb-sync ${p.synced ? 'ok' : ''}">${p.synced ? '✓' : '⏳'}</span></div>`).join('')}</div>` : ''}
      </div>
    `;
  }).join('');

  const fotosGerais = photos.filter((p) => p.questionRef === 'veiculo');

  const avariasHtml = v.data.avarias.length
    ? `<ul class="lista-presenca">${v.data.avarias.map((a, idx) => `<li>Nº ${idx + 1} — ${escapeHtml(a.tipo)}: ${escapeHtml(a.descricao || 'sem descrição')}</li>`).join('')}</ul>`
    : '<p class="empty-state">Nenhuma avaria marcada.</p>';

  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-veiculo-home" class="btn-link">← Voltar</button>
      <h1>${escapeHtml(ident.placa)}</h1>
    </div>
    <span class="badge ${s.cls}">${s.text}</span>
    ${v.syncError ? `<p class="erro-msg">${escapeHtml(v.syncError)}</p>` : ''}
    <div class="detail-block">
      <p>${escapeHtml(ident.marca)} ${escapeHtml(ident.modelo)} · ${escapeHtml(ident.empresa)} · ${escapeHtml(ident.unidade || '—')}</p>
      <p>${escapeHtml(ident.data)} ${escapeHtml(ident.hora)} · Condutor: ${escapeHtml(ident.condutor)} · KM: ${escapeHtml(ident.km || '—')}</p>
    </div>
    <h3>Checklist do veículo</h3>
    ${checklistHtml}
    <h3>Croqui do veículo</h3>
    <div class="croqui-container">${svgCroquiVeiculo(v.data.avarias)}</div>
    ${avariasHtml}
    ${fotosGerais.length ? `<h3>Evidência fotográfica geral</h3><div class="thumbs">${fotosGerais.map((p) => `<div class="thumb"><img src="${URL.createObjectURL(p.blob)}"><span class="thumb-sync ${p.synced ? 'ok' : ''}">${p.synced ? '✓' : '⏳'}</span></div>`).join('')}</div>` : ''}
    <h3>Fechamento</h3>
    <div class="detail-block">
      <p>Classificação geral: ${escapeHtml(f.classificacaoGeral || '—')} · Condições de uso: ${escapeHtml(f.condicoesUso || '—')}</p>
      <p>Responsável pela vistoria: ${escapeHtml(f.responsavelVistoria || '—')}</p>
      ${f.observacoesFinais ? `<p>${escapeHtml(f.observacoesFinais)}</p>` : ''}
    </div>
    <div class="form-actions">
      <button id="btn-editar-veiculo" class="btn-secondary">✏️ Editar Vistoria</button>
      <button id="btn-relatorio-veiculo" class="btn-secondary">Gerar relatório (PDF)</button>
    </div>
    <div class="form-actions">
      ${v.syncStatus !== 'synced' ? '<button id="btn-sync-one-veiculo" class="btn-primary">Sincronizar esta vistoria</button>' : ''}
      <button id="btn-excluir-veiculo" class="btn-danger">Excluir vistoria</button>
    </div>
  `;

  document.getElementById('btn-back-veiculo-home').addEventListener('click', renderVeiculoHome);
  document.getElementById('btn-relatorio-veiculo').addEventListener('click', () => {
    const problemas = validarVeiculoParaRelatorio(v);
    if (problemas.length) {
      alert('Não é possível gerar o relatório ainda:\n\n- ' + problemas.join('\n- ') + '\n\nToque em "Editar Vistoria" para corrigir.');
      return;
    }
    renderVeiculoReport(id);
  });
  document.getElementById('btn-editar-veiculo').addEventListener('click', async () => {
    v.metaSynced = false;
    v.syncStatus = 'pendente';
    await salvarRascunhoVeiculo(v);
    state.veiculoId = id;
    state.step = 0;
    renderVeiculoForm();
  });

  const btnSyncOne = document.getElementById('btn-sync-one-veiculo');
  if (btnSyncOne) btnSyncOne.addEventListener('click', async () => {
    btnSyncOne.disabled = true;
    btnSyncOne.textContent = 'Sincronizando…';
    try {
      await Sync.syncVeiculo(id);
    } catch (e) {
      alert('Não foi possível sincronizar agora: ' + e.message);
    }
    renderVeiculoDetail(id);
    updateSyncBar();
  });

  document.getElementById('btn-excluir-veiculo').addEventListener('click', async () => {
    if (!confirm('Excluir esta vistoria de veículo e todas as suas fotos do dispositivo? Esta ação não pode ser desfeita.')) return;
    for (const p of photos) await DB.deletePhoto(p.id);
    await DB.deleteVeiculo(id);
    renderVeiculoHome();
    updateSyncBar();
  });
}

/* ---------------- RELATÓRIO (impressão / PDF) ---------------- */

function gerarCodigoVeiculo(v) {
  const data = (v.data.identificacao.data || '').replace(/-/g, '');
  const curto = v.id.split('-')[0].toUpperCase();
  return `VEI-${data || 'SDATA'}-${curto}`;
}

async function montarFotosVeiculo(fotosIds) {
  if (!fotosIds || !fotosIds.length) {
    return '<p class="rep-hint">Nenhuma evidência fotográfica anexada.</p>';
  }
  const fotosHtml = (await Promise.all(fotosIds.map(montarBlocoFoto))).join('');
  return `<div class="rep-fotos-grid">${fotosHtml}</div>`;
}

function montarTabelaChecklistVeiculo(checklist) {
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

function montarTabelaAvariasVeiculo(avarias) {
  if (!avarias.length) return '<p class="rep-hint">Nenhuma avaria marcada — veículo íntegro no momento da vistoria.</p>';
  const linhas = avarias.map((a, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${escapeHtml(a.tipo)}</td>
      <td>${escapeHtml(a.descricao || '—')}</td>
    </tr>
  `).join('');
  return `
    <table class="rep-table">
      <thead><tr><th>Nº</th><th>Tipo</th><th>Descrição</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
  `;
}

function ligarAssinaturasVeiculo(v, id) {
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
      v.data.assinaturas = v.data.assinaturas || {};
      v.data.assinaturas[campo] = dataUrl;
      await salvarRascunhoVeiculo(v);
      renderVeiculoReport(id);
    });
  });
}

async function renderVeiculoReport(id) {
  state.screen = 'veiculo-report';
  const v = await DB.getVeiculo(id);
  if (!v) return renderVeiculoHome();
  v.data.assinaturas = v.data.assinaturas || {};

  const ident = v.data.identificacao;
  const f = v.data.fechamento;
  const codigo = gerarCodigoVeiculo(v);
  const geradoEm = new Date().toLocaleString('pt-BR');
  const fotosHtml = await montarFotosVeiculo(v.data.fotosIds);
  const registroFotograficoChecklist = await montarRegistroFotografico(v.data.checklist);

  view.innerHTML = `
    <div class="screen-header no-print">
      <button id="btn-back-veiculo-detail" class="btn-link">← Voltar</button>
      <h1>Relatório de Vistoria de Veículo</h1>
    </div>
    <div class="form-actions no-print" style="margin-bottom:12px;">
      <button id="btn-imprimir-veiculo" class="btn-primary">Imprimir / Salvar PDF</button>
    </div>

    <article class="rep-doc">
      <header class="rep-cabecalho">
        <div class="rep-titulo">
          <img src="icons/icon-192.png" alt="" class="rep-logo">
          <div>
            <h2>RELATÓRIO DE VISTORIA DE VEÍCULO</h2>
            <p>${escapeHtml(ident.placa)} — ${escapeHtml(ident.marca)} ${escapeHtml(ident.modelo)}</p>
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
          <tr><th>Placa</th><td>${escapeHtml(ident.placa)}</td><th>Marca / Modelo</th><td>${escapeHtml(ident.marca)} ${escapeHtml(ident.modelo)}</td></tr>
          <tr><th>Data</th><td>${formatarDataBR(ident.data)}</td><th>Hora</th><td>${escapeHtml(ident.hora)}</td></tr>
          <tr><th>Condutor</th><td>${escapeHtml(ident.condutor)}</td><th>Quilometragem</th><td>${escapeHtml(ident.km || '—')}</td></tr>
        </table>
        ${montarLocalizacaoRelatorio(v.data.localizacao)}
      </section>

      <section class="rep-secao rep-quebra">
        <h3>2. Checklist de segurança do veículo</h3>
        ${montarTabelaChecklistVeiculo(v.data.checklist)}
      </section>

      <section class="rep-secao rep-quebra">
        <h3>3. Registro fotográfico do checklist</h3>
        ${registroFotograficoChecklist}
      </section>

      <section class="rep-secao rep-quebra">
        <h3>4. Croqui do veículo e avarias</h3>
        <div class="croqui-container">${svgCroquiVeiculo(v.data.avarias)}</div>
        ${montarTabelaAvariasVeiculo(v.data.avarias)}
      </section>

      <section class="rep-secao rep-quebra">
        <h3>5. Evidência fotográfica geral</h3>
        ${fotosHtml}
      </section>

      <section class="rep-secao">
        <h3>6. Fechamento</h3>
        <table class="rep-tabela-ident">
          <tr><th>Classificação geral</th><td>${escapeHtml(f.classificacaoGeral)}</td><th>Condições de uso</th><td>${escapeHtml(f.condicoesUso || '—')}</td></tr>
          <tr><th>Responsável pela vistoria</th><td colspan="3">${escapeHtml(f.responsavelVistoria)}</td></tr>
        </table>
        ${f.observacoesFinais ? `<p><strong>Observações finais:</strong> ${escapeHtml(f.observacoesFinais)}</p>` : ''}
      </section>

      <section class="rep-secao rep-assinaturas">
        <h3>7. Encerramento</h3>
        <div class="rep-assinatura-grid">
          ${blocoAssinatura(v, 'responsavelVistoria', 'Responsável pela vistoria', f.responsavelVistoria)}
          ${blocoAssinatura(v, 'condutor', 'Condutor', ident.condutor)}
        </div>
      </section>

      <footer class="rep-rodape">
        Documento ${codigo} — gerado automaticamente pelo aplicativo Inspeções SSMA em ${geradoEm}.
      </footer>
    </article>
  `;

  document.getElementById('btn-back-veiculo-detail').addEventListener('click', () => renderVeiculoDetail(id));
  document.getElementById('btn-imprimir-veiculo').addEventListener('click', () => window.print());
  ligarAssinaturasVeiculo(v, id);
}
