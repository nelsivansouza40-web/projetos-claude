/* Módulo PET (Permissão de Entrada e Trabalho em Espaço Confinado),
 * conforme a NR-33. Documento específico para entrada em espaços
 * confinados, com verificações pré-entrada, testes atmosféricos
 * periódicos (O2, explosividade, CO, H2S), equipe autorizada com
 * assinatura, evidência fotográfica e encerramento — seguindo os mesmos
 * padrões offline-first já usados nos demais módulos. */

const PET_STEPS = ['Identificação', 'Verificações Pré-Entrada', 'Testes Atmosféricos', 'Equipe e Encerramento', 'Revisão'];

function novoItemPET(texto) {
  return { id: uuid(), texto, resposta: '', observacao: '', personalizado: false };
}

function gerarChecklistPET() {
  return CHECKLIST_PET.map((texto) => novoItemPET(texto));
}

function novaLeituraAtmosferica() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return {
    id: uuid(),
    horario: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    oxigenio: '',
    explosividade: '',
    monoxido: '',
    sulfidrico: '',
    responsavel: '',
    observacao: ''
  };
}

function novaPETVazia() {
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
        localEspaco: '',
        descricaoEspaco: '',
        atividade: '',
        supervisorEntrada: '',
        vigia: '',
        validadeInicio: '',
        validadeFim: ''
      },
      checklist: gerarChecklistPET(),
      leituras: [],
      equipe: [],
      fotosIds: [],
      encerramento: {
        data: '',
        hora: '',
        areaLiberada: '',
        observacoes: ''
      },
      assinaturas: {
        supervisorEntrada: '',
        vigia: ''
      },
      localizacao: null
    }
  };
}

async function salvarRascunhoPET(pet) {
  pet.updatedAt = Date.now();
  await DB.putPET(pet);
}

function leituraForaDoLimite(leitura) {
  const problemas = [];
  const o2 = parseFloat(leitura.oxigenio);
  const lii = parseFloat(leitura.explosividade);
  const co = parseFloat(leitura.monoxido);
  const h2s = parseFloat(leitura.sulfidrico);
  if (!isNaN(o2) && (o2 < LIMITES_ATMOSFERA_PET.oxigenioMin || o2 > LIMITES_ATMOSFERA_PET.oxigenioMax)) {
    problemas.push(`O2 fora da faixa segura (${LIMITES_ATMOSFERA_PET.oxigenioMin}% a ${LIMITES_ATMOSFERA_PET.oxigenioMax}%)`);
  }
  if (!isNaN(lii) && lii >= LIMITES_ATMOSFERA_PET.explosividadeMax) {
    problemas.push(`Explosividade (LII) igual ou acima do limite (${LIMITES_ATMOSFERA_PET.explosividadeMax}%)`);
  }
  if (!isNaN(co) && co >= LIMITES_ATMOSFERA_PET.monoxidoMax) {
    problemas.push(`CO igual ou acima do limite (${LIMITES_ATMOSFERA_PET.monoxidoMax} ppm)`);
  }
  if (!isNaN(h2s) && h2s >= LIMITES_ATMOSFERA_PET.sulfidricoMax) {
    problemas.push(`H2S igual ou acima do limite (${LIMITES_ATMOSFERA_PET.sulfidricoMax} ppm)`);
  }
  return problemas;
}

/* ---------------- HOME DO MÓDULO ---------------- */

async function renderPETHome() {
  state.screen = 'pet-home';
  setActiveTab('pet');
  const registros = await DB.getAllPET();

  const itemsHtml = registros.length
    ? registros.map((pet) => {
        const s = statusLabel(pet);
        const ident = pet.data.identificacao;
        return `
          <li class="insp-card" data-id="${pet.id}">
            <div class="insp-card-main">
              <div class="insp-card-title">${escapeHtml(ident.localEspaco || 'PET Espaço Confinado')}</div>
              <div class="insp-card-sub">${escapeHtml(ident.empresa || '')} · ${escapeHtml(ident.area || '')}</div>
              <div class="insp-card-sub">${escapeHtml(ident.data || '')} ${escapeHtml(ident.hora || '')}</div>
            </div>
            <div class="insp-card-side">
              <span class="badge ${s.cls}">${s.text}</span>
              <button type="button" class="btn-excluir-card" data-id="${pet.id}" title="Excluir">🗑</button>
            </div>
          </li>
        `;
      }).join('')
    : '<li class="empty-state">Nenhuma PET registrada ainda. Toque em "Nova PET" para começar.</li>';

  view.innerHTML = `
    <div class="screen-header">
      <h1>PET — Espaço Confinado</h1>
      <button id="btn-new-pet" class="btn-primary">+ Nova PET</button>
    </div>
    <ul class="insp-list">${itemsHtml}</ul>
  `;

  document.getElementById('btn-new-pet').addEventListener('click', startNewPET);
  view.querySelectorAll('.insp-card').forEach((el) => {
    el.addEventListener('click', () => openPET(el.dataset.id));
  });
  view.querySelectorAll('.btn-excluir-card').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      excluirPET(btn.dataset.id);
    });
  });
}

async function excluirPET(id) {
  const pet = await DB.getPET(id);
  if (!pet) return;
  const rotulo = pet.completo ? 'esta PET' : 'este rascunho de PET';
  if (!confirm(`Excluir ${rotulo} e todas as suas fotos do dispositivo? Esta ação não pode ser desfeita.`)) return;
  const photos = await DB.getPhotosByInspection(id);
  for (const p of photos) await DB.deletePhoto(p.id);
  await DB.deletePET(id);
  renderPETHome();
  updateSyncBar();
}

async function openPET(id) {
  const pet = await DB.getPET(id);
  if (!pet.completo) {
    state.petId = id;
    state.step = 0;
    renderPETForm();
  } else {
    renderPETDetail(id);
  }
}

async function startNewPET() {
  const pet = novaPETVazia();
  await DB.putPET(pet);
  state.petId = pet.id;
  state.step = 0;
  renderPETForm();
  localizacoesPendentes[pet.id] = capturarLocalizacao();
}

/* ---------------- FORMULÁRIO (MULTI-ETAPAS) ---------------- */

async function renderPETForm() {
  state.screen = 'pet-form';
  const pet = await DB.getPET(state.petId);

  const stepsNav = PET_STEPS.map((label, idx) => `
    <div class="step-dot ${idx === state.step ? 'active' : ''} ${idx < state.step ? 'done' : ''}">${idx + 1}</div>
  `).join('');

  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-pet-home" class="btn-link">← Voltar</button>
      <h1>${escapeHtml(pet.data.identificacao.localEspaco || 'Nova PET')}</h1>
    </div>
    <div class="steps-nav">${stepsNav}</div>
    <div id="pet-step-content"></div>
  `;

  document.getElementById('btn-back-pet-home').addEventListener('click', async () => {
    await salvarRascunhoPET(pet);
    renderPETHome();
  });

  const content = document.getElementById('pet-step-content');
  if (state.step === 0) renderPETStepIdentificacao(content, pet);
  else if (state.step === 1) renderPETStepChecklist(content, pet);
  else if (state.step === 2) renderPETStepLeituras(content, pet);
  else if (state.step === 3) renderPETStepEquipe(content, pet);
  else renderPETStepRevisao(content, pet);
}

/* ---- Passo 1: Identificação ---- */
function renderPETStepIdentificacao(content, pet) {
  const id = pet.data.identificacao;

  content.innerHTML = `
    <form id="form-pet-ident" class="form-section">
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
      <label>Identificação do espaço confinado *
        <input type="text" name="localEspaco" required placeholder="Ex.: Tanque TQ-04, Poço de visita, Silo 2" value="${escapeHtml(id.localEspaco)}">
      </label>
      <label>Descrição do espaço confinado
        <textarea name="descricaoEspaco" rows="2" placeholder="Tipo, produto armazenado anteriormente, dimensões relevantes">${escapeHtml(id.descricaoEspaco)}</textarea>
      </label>
      <label>Descrição da atividade a ser realizada *
        <textarea name="atividade" rows="2" required>${escapeHtml(id.atividade)}</textarea>
      </label>
      <label>Supervisor de entrada (NR-33) *
        <input type="text" name="supervisorEntrada" required value="${escapeHtml(id.supervisorEntrada)}">
      </label>
      <label>Vigia *
        <input type="text" name="vigia" required value="${escapeHtml(id.vigia)}">
      </label>
      <label>Validade da permissão — início
        <input type="time" name="validadeInicio" value="${escapeHtml(id.validadeInicio)}">
      </label>
      <label>Validade da permissão — fim
        <input type="time" name="validadeFim" value="${escapeHtml(id.validadeFim)}">
      </label>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Avançar →</button>
      </div>
    </form>
  `;

  const form = document.getElementById('form-pet-ident');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    pet.data.identificacao = {
      data: fd.get('data'),
      hora: fd.get('hora'),
      empresa: fd.get('empresa').trim(),
      unidade: (fd.get('unidade') || '').trim(),
      area: fd.get('area').trim(),
      localEspaco: fd.get('localEspaco').trim(),
      descricaoEspaco: (fd.get('descricaoEspaco') || '').trim(),
      atividade: fd.get('atividade').trim(),
      supervisorEntrada: fd.get('supervisorEntrada').trim(),
      vigia: fd.get('vigia').trim(),
      validadeInicio: fd.get('validadeInicio') || '',
      validadeFim: fd.get('validadeFim') || ''
    };
    await salvarRascunhoPET(pet);
    state.step = 1;
    renderPETForm();
  });
}

/* ---- Passo 2: Verificações Pré-Entrada ---- */
function renderPETStepChecklist(content, pet) {
  content.innerHTML = `
    <div class="checklist" id="pet-checklist-container"></div>
    <div class="form-actions">
      <button id="btn-pet-checklist-back" class="btn-link">← Voltar</button>
      <button id="btn-pet-checklist-next" class="btn-primary">Avançar →</button>
    </div>
  `;

  const container = document.getElementById('pet-checklist-container');
  renderPETChecklistItems(container, pet);

  document.getElementById('btn-pet-checklist-back').addEventListener('click', async () => {
    await salvarRascunhoPET(pet);
    state.step = 0;
    renderPETForm();
  });

  document.getElementById('btn-pet-checklist-next').addEventListener('click', async () => {
    await salvarRascunhoPET(pet);
    state.step = 2;
    renderPETForm();
  });
}

function renderPETItem(item, idx) {
  const respostas = ['Conforme', 'Não Conforme', 'Não se Aplica'];
  const radiosHtml = respostas.map((r) => `
    <label class="radio-pill radio-${r === 'Conforme' ? 'ok' : r === 'Não Conforme' ? 'nc' : 'na'}">
      <input type="radio" name="pet-resp-${idx}" value="${r}" ${item.resposta === r ? 'checked' : ''}>
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

function renderPETChecklistItems(container, pet) {
  container.innerHTML = pet.data.checklist.map((item, idx) => renderPETItem(item, idx)).join('');

  pet.data.checklist.forEach((item, idx) => {
    const card = container.querySelector(`.checklist-card[data-idx="${idx}"]`);
    if (!card) return;

    card.querySelectorAll('input[type=radio]').forEach((radio) => {
      radio.addEventListener('change', async () => {
        item.resposta = radio.value;
        await salvarRascunhoPET(pet);
        renderPETChecklistItems(container, pet);
      });
    });

    const obs = card.querySelector('.txt-observacao');
    if (obs) obs.addEventListener('blur', async () => {
      item.observacao = obs.value;
      await salvarRascunhoPET(pet);
    });
  });
}

/* ---- Passo 3: Testes Atmosféricos ---- */
function renderPETStepLeituras(content, pet) {
  content.innerHTML = `
    <p class="hint">Registre uma leitura a cada verificação da atmosfera durante a permanência no espaço confinado, conforme exige a NR-33.</p>
    <div id="pet-leituras-container"></div>
    <button type="button" id="btn-add-leitura-pet" class="btn-secondary">+ Adicionar leitura</button>
    <div class="form-actions">
      <button id="btn-pet-leituras-back" class="btn-link">← Voltar</button>
      <button id="btn-pet-leituras-next" class="btn-primary">Avançar →</button>
    </div>
  `;

  const container = document.getElementById('pet-leituras-container');
  renderLeiturasPET(container, pet);

  document.getElementById('btn-add-leitura-pet').addEventListener('click', async () => {
    pet.data.leituras.push(novaLeituraAtmosferica());
    await salvarRascunhoPET(pet);
    renderLeiturasPET(container, pet);
  });

  document.getElementById('btn-pet-leituras-back').addEventListener('click', async () => {
    await salvarRascunhoPET(pet);
    state.step = 1;
    renderPETForm();
  });

  document.getElementById('btn-pet-leituras-next').addEventListener('click', async () => {
    await salvarRascunhoPET(pet);
    state.step = 3;
    renderPETForm();
  });
}

function renderLeiturasPET(container, pet) {
  const leituras = pet.data.leituras;
  container.innerHTML = leituras.length
    ? leituras.map((l, idx) => {
        const problemas = leituraForaDoLimite(l);
        return `
          <div class="leitura-card ${problemas.length ? 'leitura-alerta' : ''}" data-idx="${idx}">
            <div class="participante-linha">
              <label class="campo-leitura">Horário
                <input type="time" class="in-horario" value="${escapeHtml(l.horario)}">
              </label>
              <label class="campo-leitura">Responsável
                <input type="text" class="in-responsavel" placeholder="Nome" value="${escapeHtml(l.responsavel)}">
              </label>
              <button type="button" class="btn-remover-item btn-remover-leitura" title="Remover leitura">✕</button>
            </div>
            <div class="participante-linha">
              <label class="campo-leitura">O2 (%)
                <input type="number" step="0.1" class="in-oxigenio" value="${escapeHtml(l.oxigenio)}">
              </label>
              <label class="campo-leitura">LII (%)
                <input type="number" step="0.1" class="in-explosividade" value="${escapeHtml(l.explosividade)}">
              </label>
              <label class="campo-leitura">CO (ppm)
                <input type="number" step="1" class="in-monoxido" value="${escapeHtml(l.monoxido)}">
              </label>
              <label class="campo-leitura">H2S (ppm)
                <input type="number" step="1" class="in-sulfidrico" value="${escapeHtml(l.sulfidrico)}">
              </label>
            </div>
            ${problemas.length ? `<p class="leitura-aviso">⚠️ ${problemas.join('; ')}</p>` : ''}
            <label>Observação
              <textarea class="in-observacao" rows="2">${escapeHtml(l.observacao)}</textarea>
            </label>
          </div>
        `;
      }).join('')
    : '<p class="empty-state">Nenhuma leitura registrada ainda.</p>';

  leituras.forEach((l, idx) => {
    const card = container.querySelector(`.leitura-card[data-idx="${idx}"]`);
    if (!card) return;

    const campos = [
      ['.in-horario', 'horario'], ['.in-responsavel', 'responsavel'],
      ['.in-oxigenio', 'oxigenio'], ['.in-explosividade', 'explosividade'],
      ['.in-monoxido', 'monoxido'], ['.in-sulfidrico', 'sulfidrico'],
      ['.in-observacao', 'observacao']
    ];
    campos.forEach(([seletor, campo]) => {
      const el = card.querySelector(seletor);
      if (!el) return;
      const evento = el.tagName === 'INPUT' && el.type === 'time' ? 'change' : 'blur';
      el.addEventListener(evento, async () => {
        l[campo] = el.value;
        await salvarRascunhoPET(pet);
        renderLeiturasPET(container, pet);
      });
    });

    card.querySelector('.btn-remover-leitura').addEventListener('click', async () => {
      if (!confirm('Remover esta leitura?')) return;
      pet.data.leituras.splice(idx, 1);
      await salvarRascunhoPET(pet);
      renderLeiturasPET(container, pet);
    });
  });
}

/* ---- Passo 4: Equipe autorizada e Encerramento ---- */
function renderPETStepEquipe(content, pet) {
  const enc = pet.data.encerramento;

  content.innerHTML = `
    <div class="lista-participantes">
      <h3>Equipe autorizada</h3>
      <p class="hint">Cada trabalhador autorizado deve assinar confirmando ciência dos riscos do espaço confinado.</p>
      <div id="pet-equipe-container"></div>
      <button type="button" id="btn-add-equipe-pet" class="btn-secondary">+ Adicionar trabalhador autorizado</button>
    </div>

    <label>Evidência fotográfica</label>
    <div class="foto-botoes">
      <label class="file-label">📷 Tirar foto
        <input type="file" accept="image/*" capture="environment" id="input-foto-pet-camera">
      </label>
      <label class="file-label">🖼️ Da galeria
        <input type="file" accept="image/*" multiple id="input-foto-pet-galeria">
      </label>
    </div>
    <div class="thumbs" id="thumbs-pet"></div>

    <div class="form-section" style="margin-top:16px;">
      <h3>Encerramento da PET</h3>
      <p class="hint">Preencha ao final da atividade, quando a saída do espaço confinado for concluída. Pode ser feito depois, tocando em "Editar".</p>
      <label>Data de encerramento
        <input type="date" id="pet-enc-data" value="${escapeHtml(enc.data)}">
      </label>
      <label>Hora de encerramento
        <input type="time" id="pet-enc-hora" value="${escapeHtml(enc.hora)}">
      </label>
      <fieldset>
        <legend>Todos os trabalhadores saíram e a área foi liberada?</legend>
        <label class="radio-inline"><input type="radio" name="areaLiberada" value="Sim" ${enc.areaLiberada === 'Sim' ? 'checked' : ''}> Sim</label>
        <label class="radio-inline"><input type="radio" name="areaLiberada" value="Não" ${enc.areaLiberada === 'Não' ? 'checked' : ''}> Não</label>
      </fieldset>
      <label>Observações do encerramento
        <textarea id="pet-enc-obs" rows="2">${escapeHtml(enc.observacoes)}</textarea>
      </label>
    </div>

    <div class="form-actions">
      <button id="btn-pet-equipe-back" class="btn-link">← Voltar</button>
      <button id="btn-pet-equipe-next" class="btn-primary">Avançar →</button>
    </div>
  `;

  const equipeContainer = document.getElementById('pet-equipe-container');
  renderEquipePET(equipeContainer, pet);

  document.getElementById('btn-add-equipe-pet').addEventListener('click', async () => {
    const nome = prompt('Nome completo do trabalhador autorizado:');
    if (!nome || !nome.trim()) return;
    pet.data.equipe.push(novoParticipante(nome.trim()));
    await salvarRascunhoPET(pet);
    renderEquipePET(equipeContainer, pet);
  });

  async function refreshThumbsPET() {
    const el = document.getElementById('thumbs-pet');
    await renderThumbnails(el, pet.data.fotosIds);
    el.querySelectorAll('.btn-remover-foto').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const photoId = btn.dataset.photoId;
        await DB.deletePhoto(photoId);
        pet.data.fotosIds = pet.data.fotosIds.filter((pid) => pid !== photoId);
        await salvarRascunhoPET(pet);
        refreshThumbsPET();
      });
    });
  }
  refreshThumbsPET();

  ['input-foto-pet-camera', 'input-foto-pet-galeria'].forEach((elId) => {
    document.getElementById(elId).addEventListener('change', async (e) => {
      await adicionarFotos(pet, pet.data.fotosIds, e.target.files, 'pet');
      await salvarRascunhoPET(pet);
      refreshThumbsPET();
    });
  });

  function coletarEncerramento() {
    pet.data.encerramento.data = document.getElementById('pet-enc-data').value;
    pet.data.encerramento.hora = document.getElementById('pet-enc-hora').value;
    const radioMarcado = content.querySelector('input[name="areaLiberada"]:checked');
    pet.data.encerramento.areaLiberada = radioMarcado ? radioMarcado.value : '';
    pet.data.encerramento.observacoes = document.getElementById('pet-enc-obs').value;
  }

  document.getElementById('btn-pet-equipe-back').addEventListener('click', async () => {
    coletarEncerramento();
    await salvarRascunhoPET(pet);
    state.step = 2;
    renderPETForm();
  });

  document.getElementById('btn-pet-equipe-next').addEventListener('click', async () => {
    coletarEncerramento();
    await salvarRascunhoPET(pet);
    state.step = 4;
    renderPETForm();
  });
}

function renderEquipePET(container, pet) {
  const equipe = pet.data.equipe;
  container.innerHTML = equipe.length
    ? equipe.map((p, idx) => blocoAssinaturaParticipante(p, idx)).join('')
    : '<p class="empty-state">Nenhum trabalhador adicionado ainda.</p>';

  equipe.forEach((p, idx) => {
    const card = container.querySelector(`[data-idx="${idx}"]`);
    if (!card) return;

    card.querySelector('.txt-participante-nome').addEventListener('blur', async (e) => {
      p.nome = e.target.value.trim();
      await salvarRascunhoPET(pet);
    });
    card.querySelector('.txt-participante-funcao').addEventListener('blur', async (e) => {
      p.funcao = e.target.value.trim();
      await salvarRascunhoPET(pet);
    });
    card.querySelector('.btn-remover-participante').addEventListener('click', async () => {
      if (!confirm('Remover este trabalhador?')) return;
      pet.data.equipe.splice(idx, 1);
      await salvarRascunhoPET(pet);
      renderEquipePET(container, pet);
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
      await salvarRascunhoPET(pet);
      renderEquipePET(container, pet);
    });
  });
}

/* ---- Passo 5: Revisão e salvar ---- */
function renderPETStepRevisao(content, pet) {
  const totalItens = pet.data.checklist.length;
  const nc = pet.data.checklist.filter((i) => i.resposta === 'Não Conforme').length;
  const semResposta = pet.data.checklist.filter((i) => !i.resposta).length;
  const leiturasComProblema = pet.data.leituras.filter((l) => leituraForaDoLimite(l).length > 0).length;

  content.innerHTML = `
    <div class="resumo">
      <h2>Resumo da PET</h2>
      <p><strong>${escapeHtml(pet.data.identificacao.localEspaco)}</strong></p>
      <p>${escapeHtml(pet.data.identificacao.empresa)} · ${escapeHtml(pet.data.identificacao.area)}</p>
      <p>${escapeHtml(pet.data.identificacao.data)} ${escapeHtml(pet.data.identificacao.hora)}</p>
      <ul class="resumo-stats">
        <li>Itens verificados: ${totalItens}</li>
        <li class="nc">Não conformes: ${nc}</li>
        ${semResposta ? `<li class="alerta">${semResposta} item(ns) sem resposta</li>` : ''}
        <li>Leituras atmosféricas: ${pet.data.leituras.length}</li>
        ${leiturasComProblema ? `<li class="nc">${leiturasComProblema} leitura(s) fora do limite seguro</li>` : ''}
        <li>Equipe autorizada: ${pet.data.equipe.length} trabalhador(es)</li>
      </ul>
    </div>
    <div class="form-actions">
      <button id="btn-pet-revisao-back" class="btn-link">← Voltar</button>
      <button id="btn-pet-concluir" class="btn-primary">Concluir e salvar</button>
    </div>
    <p class="hint">A PET fica salva no aparelho mesmo sem internet. Assim que houver conexão, é enviada automaticamente.</p>
  `;

  document.getElementById('btn-pet-revisao-back').addEventListener('click', () => {
    state.step = 3;
    renderPETForm();
  });

  document.getElementById('btn-pet-concluir').addEventListener('click', async () => {
    if (semResposta > 0 && !confirm(`Existem ${semResposta} item(ns) sem resposta. Deseja concluir mesmo assim?`)) {
      return;
    }
    await aplicarLocalizacaoPendente(pet);
    pet.completo = true;
    pet.syncStatus = 'pendente';
    await salvarRascunhoPET(pet);
    await refreshChrome();
    renderPETHome();
    Sync.syncAll().catch(() => {});
  });
}

/* ---------------- VALIDAÇÃO PARA O RELATÓRIO ---------------- */

function validarPETParaRelatorio(pet) {
  const problemas = [];
  pet.data.checklist.forEach((item, idx) => {
    const num = String(idx + 1).padStart(2, '0');
    if (!item.resposta) {
      problemas.push(`Item ${num} ("${item.texto}") está sem resposta.`);
    } else if (item.resposta === 'Não Conforme' && !item.observacao) {
      problemas.push(`Item ${num} ("${item.texto}") está Não Conforme, mas não tem observação.`);
    }
  });
  if (!pet.data.leituras.length) {
    problemas.push('Nenhuma leitura de teste atmosférico foi registrada.');
  } else {
    const ultimaLeitura = pet.data.leituras[pet.data.leituras.length - 1];
    const problemasUltimaLeitura = leituraForaDoLimite(ultimaLeitura);
    if (problemasUltimaLeitura.length) {
      problemas.push(`A entrada não pode ser liberada: a leitura mais recente (${ultimaLeitura.horario || 'sem horário'}) está fora da faixa segura — ${problemasUltimaLeitura.join('; ')}. Registre uma nova leitura dentro dos limites antes de gerar o relatório.`);
    }
  }
  if (!pet.data.equipe.length) {
    problemas.push('Nenhum trabalhador autorizado foi registrado.');
  }
  pet.data.equipe.forEach((p) => {
    if (!p.assinatura) problemas.push(`Trabalhador "${p.nome || 'sem nome'}" ainda não assinou.`);
  });
  return problemas;
}

/* ---------------- DETALHE ---------------- */

async function renderPETDetail(id) {
  state.screen = 'pet-detail';
  state.petId = id;
  const pet = await DB.getPET(id);
  const photos = await DB.getPhotosByInspection(id);
  const s = statusLabel(pet);
  const ident = pet.data.identificacao;

  const checklistHtml = pet.data.checklist.map((item, idx) => `
    <div class="detail-item">
      <div><strong>Item ${String(idx + 1).padStart(2, '0')}.</strong> ${escapeHtml(item.texto)}</div>
      <div class="detail-resposta resposta-${item.resposta === 'Conforme' ? 'ok' : item.resposta === 'Não Conforme' ? 'nc' : 'na'}">${escapeHtml(item.resposta || 'Sem resposta')}</div>
      ${item.observacao ? `<div class="detail-obs">Obs.: ${escapeHtml(item.observacao)}</div>` : ''}
    </div>
  `).join('');

  const leiturasHtml = pet.data.leituras.length
    ? pet.data.leituras.map((l, idx) => {
        const problemas = leituraForaDoLimite(l);
        return `
          <div class="detail-item ${problemas.length ? 'destaque-nc' : ''}">
            <div><strong>Leitura ${idx + 1}</strong> — ${escapeHtml(l.horario || '—')} · Resp.: ${escapeHtml(l.responsavel || '—')}</div>
            <div>O2: ${escapeHtml(l.oxigenio || '—')}% · LII: ${escapeHtml(l.explosividade || '—')}% · CO: ${escapeHtml(l.monoxido || '—')}ppm · H2S: ${escapeHtml(l.sulfidrico || '—')}ppm</div>
            ${problemas.length ? `<div class="detail-obs nc">⚠️ ${problemas.join('; ')}</div>` : ''}
            ${l.observacao ? `<div class="detail-obs">Obs.: ${escapeHtml(l.observacao)}</div>` : ''}
          </div>
        `;
      }).join('')
    : '<p class="empty-state">Nenhuma leitura registrada.</p>';

  const equipeHtml = pet.data.equipe.length
    ? `<ul class="lista-presenca">${pet.data.equipe.map((p) => `
        <li>${escapeHtml(p.nome)}${p.funcao ? ' — ' + escapeHtml(p.funcao) : ''}
          <span class="badge ${p.assinatura ? 'badge-ok' : 'badge-pendente'}">${p.assinatura ? 'Assinado' : 'Sem assinatura'}</span>
        </li>
      `).join('')}</ul>`
    : '<p class="empty-state">Nenhum trabalhador registrado.</p>';

  const enc = pet.data.encerramento;

  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-pet-home" class="btn-link">← Voltar</button>
      <h1>${escapeHtml(ident.localEspaco)}</h1>
    </div>
    <span class="badge ${s.cls}">${s.text}</span>
    ${pet.syncError ? `<p class="erro-msg">${escapeHtml(pet.syncError)}</p>` : ''}
    <div class="detail-block">
      <p>${escapeHtml(ident.empresa)} · ${escapeHtml(ident.unidade)} · ${escapeHtml(ident.area)}</p>
      <p>${escapeHtml(ident.data)} ${escapeHtml(ident.hora)} · Supervisor de entrada: ${escapeHtml(ident.supervisorEntrada)} · Vigia: ${escapeHtml(ident.vigia)}</p>
      ${ident.descricaoEspaco ? `<p>${escapeHtml(ident.descricaoEspaco)}</p>` : ''}
    </div>
    <h3>Verificações Pré-Entrada</h3>
    ${checklistHtml}
    <h3>Testes Atmosféricos</h3>
    ${leiturasHtml}
    ${photos.length ? `<h3>Evidência fotográfica</h3><div class="thumbs">${photos.map((p) => `<div class="thumb"><img src="${URL.createObjectURL(p.blob)}"><span class="thumb-sync ${p.synced ? 'ok' : ''}">${p.synced ? '✓' : '⏳'}</span></div>`).join('')}</div>` : ''}
    <h3>Equipe autorizada (${pet.data.equipe.length})</h3>
    ${equipeHtml}
    <h3>Encerramento</h3>
    ${enc.data
      ? `<div class="detail-block"><p>${formatarDataBR(enc.data)} ${escapeHtml(enc.hora || '')} · Área liberada: ${escapeHtml(enc.areaLiberada || '—')}</p>${enc.observacoes ? `<p>${escapeHtml(enc.observacoes)}</p>` : ''}</div>`
      : '<p class="hint">PET ainda não foi encerrada.</p>'}
    <div class="form-actions">
      <button id="btn-editar-pet" class="btn-secondary">✏️ Editar PET</button>
      <button id="btn-relatorio-pet" class="btn-secondary">Gerar relatório (PDF)</button>
    </div>
    <div class="form-actions">
      ${pet.syncStatus !== 'synced' ? '<button id="btn-sync-one-pet" class="btn-primary">Sincronizar esta PET</button>' : ''}
      <button id="btn-excluir-pet" class="btn-danger">Excluir PET</button>
    </div>
  `;

  document.getElementById('btn-back-pet-home').addEventListener('click', renderPETHome);
  document.getElementById('btn-relatorio-pet').addEventListener('click', () => {
    const problemas = validarPETParaRelatorio(pet);
    if (problemas.length) {
      alert('Não é possível gerar o relatório ainda:\n\n- ' + problemas.join('\n- ') + '\n\nToque em "Editar PET" para corrigir.');
      return;
    }
    renderPETReport(id);
  });
  document.getElementById('btn-editar-pet').addEventListener('click', async () => {
    pet.metaSynced = false;
    pet.syncStatus = 'pendente';
    await salvarRascunhoPET(pet);
    state.petId = id;
    state.step = 0;
    renderPETForm();
  });

  const btnSyncOne = document.getElementById('btn-sync-one-pet');
  if (btnSyncOne) btnSyncOne.addEventListener('click', async () => {
    btnSyncOne.disabled = true;
    btnSyncOne.textContent = 'Sincronizando…';
    try {
      await Sync.syncPET(id);
    } catch (e) {
      alert('Não foi possível sincronizar agora: ' + e.message);
    }
    renderPETDetail(id);
    updateSyncBar();
  });

  document.getElementById('btn-excluir-pet').addEventListener('click', async () => {
    if (!confirm('Excluir esta PET e todas as suas fotos do dispositivo? Esta ação não pode ser desfeita.')) return;
    for (const p of photos) await DB.deletePhoto(p.id);
    await DB.deletePET(id);
    renderPETHome();
    updateSyncBar();
  });
}

/* ---------------- RELATÓRIO (impressão / PDF) ---------------- */

function gerarCodigoPET(pet) {
  const data = (pet.data.identificacao.data || '').replace(/-/g, '');
  const curto = pet.id.split('-')[0].toUpperCase();
  return `PET-${data || 'SDATA'}-${curto}`;
}

async function montarFotosPET(fotosIds) {
  if (!fotosIds || !fotosIds.length) return '<p class="rep-hint">Nenhuma evidência fotográfica anexada.</p>';
  const fotosHtml = (await Promise.all(fotosIds.map(montarBlocoFoto))).join('');
  return `<div class="rep-fotos-grid">${fotosHtml}</div>`;
}

function montarTabelaChecklistPET(checklist) {
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

function montarTabelaLeiturasPET(leituras) {
  if (!leituras.length) return '<p class="rep-hint">Nenhuma leitura registrada.</p>';
  const linhas = leituras.map((l, idx) => {
    const problemas = leituraForaDoLimite(l);
    return `
      <tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(l.horario || '—')}</td>
        <td class="rep-td-status ${problemas.length ? 'rep-status-nc' : 'rep-status-ok'}">${escapeHtml(l.oxigenio || '—')}%</td>
        <td class="rep-td-status ${problemas.length ? 'rep-status-nc' : 'rep-status-ok'}">${escapeHtml(l.explosividade || '—')}%</td>
        <td class="rep-td-status ${problemas.length ? 'rep-status-nc' : 'rep-status-ok'}">${escapeHtml(l.monoxido || '—')}ppm</td>
        <td class="rep-td-status ${problemas.length ? 'rep-status-nc' : 'rep-status-ok'}">${escapeHtml(l.sulfidrico || '—')}ppm</td>
        <td>${escapeHtml(l.responsavel || '—')}</td>
      </tr>
    `;
  }).join('');
  return `
    <table class="rep-table">
      <thead><tr><th>Nº</th><th>Horário</th><th>O2</th><th>LII</th><th>CO</th><th>H2S</th><th>Responsável</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
  `;
}

function montarEquipePET(equipe) {
  if (!equipe.length) return '<p class="rep-hint">Nenhum trabalhador registrado.</p>';
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

function ligarAssinaturasPET(pet, id) {
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
      pet.data.assinaturas = pet.data.assinaturas || {};
      pet.data.assinaturas[campo] = dataUrl;
      await salvarRascunhoPET(pet);
      renderPETReport(id);
    });
  });
}

async function renderPETReport(id) {
  state.screen = 'pet-report';
  const pet = await DB.getPET(id);
  if (!pet) return renderPETHome();
  pet.data.assinaturas = pet.data.assinaturas || {};

  const ident = pet.data.identificacao;
  const codigo = gerarCodigoPET(pet);
  const geradoEm = new Date().toLocaleString('pt-BR');
  const fotosHtml = await montarFotosPET(pet.data.fotosIds);
  const enc = pet.data.encerramento;
  const encerrada = !!enc.data;

  view.innerHTML = `
    <div class="screen-header no-print">
      <button id="btn-back-pet-detail" class="btn-link">← Voltar</button>
      <h1>Relatório de PET</h1>
    </div>
    <div class="form-actions no-print" style="margin-bottom:12px;">
      <button id="btn-imprimir-pet" class="btn-primary">Imprimir / Salvar PDF</button>
    </div>

    <article class="rep-doc">
      <header class="rep-cabecalho">
        <div class="rep-titulo">
          <img src="icons/icon-192.png" alt="" class="rep-logo">
          <div>
            <h2>PET — ENTRADA EM ESPAÇO CONFINADO</h2>
            <p>${escapeHtml(ident.localEspaco)}</p>
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
          <tr><th>Área / Setor</th><td>${escapeHtml(ident.area)}</td><th>Espaço confinado</th><td>${escapeHtml(ident.localEspaco)}</td></tr>
          <tr><th>Data</th><td>${formatarDataBR(ident.data)}</td><th>Hora de início</th><td>${escapeHtml(ident.hora)}</td></tr>
          <tr><th>Supervisor de entrada</th><td>${escapeHtml(ident.supervisorEntrada)}</td><th>Vigia</th><td>${escapeHtml(ident.vigia)}</td></tr>
          <tr><th>Validade da permissão</th><td colspan="3">${escapeHtml(ident.validadeInicio || '—')} às ${escapeHtml(ident.validadeFim || '—')}</td></tr>
        </table>
        ${ident.descricaoEspaco ? `<p><strong>Descrição do espaço:</strong> ${escapeHtml(ident.descricaoEspaco)}</p>` : ''}
        <p><strong>Atividade:</strong> ${escapeHtml(ident.atividade)}</p>
        ${montarLocalizacaoRelatorio(pet.data.localizacao)}
      </section>

      <section class="rep-secao rep-quebra">
        <h3>2. Verificações Pré-Entrada</h3>
        ${montarTabelaChecklistPET(pet.data.checklist)}
      </section>

      <section class="rep-secao rep-quebra">
        <h3>3. Testes Atmosféricos</h3>
        ${montarTabelaLeiturasPET(pet.data.leituras)}
      </section>

      <section class="rep-secao rep-quebra">
        <h3>4. Evidência fotográfica</h3>
        ${fotosHtml}
      </section>

      <section class="rep-secao rep-quebra">
        <h3>5. Equipe autorizada — ciência dos riscos</h3>
        ${montarEquipePET(pet.data.equipe)}
      </section>

      <section class="rep-secao rep-assinaturas">
        <h3>6. Liberação da entrada</h3>
        <div class="rep-assinatura-grid">
          ${blocoAssinatura(pet, 'supervisorEntrada', 'Supervisor de entrada', ident.supervisorEntrada)}
          ${blocoAssinatura(pet, 'vigia', 'Vigia', ident.vigia)}
        </div>
      </section>

      <section class="rep-secao">
        <h3>7. Encerramento</h3>
        ${encerrada
          ? `<table class="rep-tabela-ident">
              <tr><th>Data</th><td>${formatarDataBR(enc.data)}</td><th>Hora</th><td>${escapeHtml(enc.hora || '—')}</td></tr>
              <tr><th>Área liberada</th><td colspan="3">${escapeHtml(enc.areaLiberada || '—')}</td></tr>
            </table>
            ${enc.observacoes ? `<p>${escapeHtml(enc.observacoes)}</p>` : ''}`
          : '<p class="rep-hint">PET ainda não foi encerrada.</p>'}
      </section>

      <footer class="rep-rodape">
        Documento ${codigo} — gerado automaticamente pelo aplicativo Inspeções SSMA em ${geradoEm}.
      </footer>
    </article>
  `;

  document.getElementById('btn-back-pet-detail').addEventListener('click', () => renderPETDetail(id));
  document.getElementById('btn-imprimir-pet').addEventListener('click', () => window.print());
  ligarAssinaturasPET(pet, id);
}
