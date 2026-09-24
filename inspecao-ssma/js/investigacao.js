/* Módulo de Investigação de Acidente de Trabalho (RIAT).
 * Documenta a análise de um acidente ocorrido: dados do acidentado e do
 * evento, 15 perguntas investigativas que orientam a busca das causas
 * imediatas e básicas, e um plano de ação com responsáveis e prazos.
 * Segue os mesmos padrões offline-first, fotos, GPS e assinatura já
 * usados nos demais módulos. */

const INVESTIGACAO_STEPS = ['Dados do Acidente', 'Investigação', 'Causas e Plano de Ação', 'Revisão'];

function novoItemInvestigacao(texto) {
  return { id: uuid(), texto, resposta: '', observacao: '' };
}

function gerarPerguntasInvestigacao() {
  return PERGUNTAS_INVESTIGACAO.map((texto) => novoItemInvestigacao(texto));
}

function novaAcaoPlanoInvestigacao() {
  return { id: uuid(), descricao: '', responsavel: '', prazo: '', status: 'Pendente' };
}

function novaInvestigacaoVazia() {
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
      acidente: {
        data: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
        hora: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
        empresa: '',
        unidade: '',
        local: '',
        turno: '',
        tipo: '',
        gravidade: '',
        diasAfastamento: '',
        catEmitida: '',
        catNumero: '',
        parteCorpoAtingida: '',
        agenteCausador: '',
        naturezaLesao: ''
      },
      acidentado: {
        nome: '',
        funcao: '',
        setor: '',
        tempoEmpresa: '',
        tempoFuncao: ''
      },
      descricao: '',
      testemunhas: '',
      perguntas: gerarPerguntasInvestigacao(),
      causasImediatas: '',
      causasBasicas: '',
      investigador: '',
      planoAcao: [],
      fotosIds: [],
      assinaturas: {
        investigador: '',
        responsavelArea: ''
      },
      localizacao: null
    }
  };
}

async function salvarRascunhoInvestigacao(inv) {
  inv.updatedAt = Date.now();
  await DB.putInvestigacao(inv);
}

function gravidadeBadgeClass(gravidade) {
  if (gravidade === 'Fatal') return 'badge-erro';
  if (gravidade === 'Com Afastamento') return 'badge-pendente';
  if (gravidade === 'Sem Afastamento') return 'badge-ok';
  return 'badge-rascunho';
}

/* ---------------- HOME DO MÓDULO ---------------- */

async function renderInvestigacaoHome() {
  state.screen = 'investigacao-home';
  setActiveTab('investigacao');
  const registros = await DB.getAllInvestigacoes();

  const itemsHtml = registros.length
    ? registros.map((inv) => {
        const s = statusLabel(inv);
        const ac = inv.data.acidente;
        const acidentado = inv.data.acidentado;
        return `
          <li class="insp-card" data-id="${inv.id}">
            <div class="insp-card-main">
              <div class="insp-card-title">${escapeHtml(acidentado.nome || 'Investigação de Acidente')}</div>
              <div class="insp-card-sub">${escapeHtml(ac.empresa || '')} · ${escapeHtml(ac.local || '')}</div>
              <div class="insp-card-sub">${escapeHtml(ac.data || '')} ${escapeHtml(ac.hora || '')}</div>
            </div>
            <div class="insp-card-side">
              ${ac.gravidade ? `<span class="badge ${gravidadeBadgeClass(ac.gravidade)}">${escapeHtml(ac.gravidade)}</span>` : ''}
              <span class="badge ${s.cls}">${s.text}</span>
              <button type="button" class="btn-excluir-card" data-id="${inv.id}" title="Excluir">🗑</button>
            </div>
          </li>
        `;
      }).join('')
    : '<li class="empty-state">Nenhuma investigação registrada ainda. Toque em "Nova investigação" para começar.</li>';

  view.innerHTML = `
    <div class="screen-header">
      <h1>Investigação de Acidente</h1>
      <button id="btn-new-investigacao" class="btn-primary">+ Nova investigação</button>
    </div>
    <ul class="insp-list">${itemsHtml}</ul>
  `;

  document.getElementById('btn-new-investigacao').addEventListener('click', startNewInvestigacao);
  view.querySelectorAll('.insp-card').forEach((el) => {
    el.addEventListener('click', () => openInvestigacao(el.dataset.id));
  });
  view.querySelectorAll('.btn-excluir-card').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      excluirInvestigacao(btn.dataset.id);
    });
  });
}

async function excluirInvestigacao(id) {
  const inv = await DB.getInvestigacao(id);
  if (!inv) return;
  const rotulo = inv.completo ? 'esta investigação' : 'este rascunho de investigação';
  if (!confirm(`Excluir ${rotulo} e todas as suas fotos do dispositivo? Esta ação não pode ser desfeita.`)) return;
  const photos = await DB.getPhotosByInspection(id);
  for (const p of photos) await DB.deletePhoto(p.id);
  await DB.deleteInvestigacao(id);
  renderInvestigacaoHome();
  updateSyncBar();
}

async function openInvestigacao(id) {
  const inv = await DB.getInvestigacao(id);
  if (!inv.completo) {
    state.investigacaoId = id;
    state.step = 0;
    renderInvestigacaoForm();
  } else {
    renderInvestigacaoDetail(id);
  }
}

async function startNewInvestigacao() {
  const inv = novaInvestigacaoVazia();
  await DB.putInvestigacao(inv);
  state.investigacaoId = inv.id;
  state.step = 0;
  renderInvestigacaoForm();
  localizacoesPendentes[inv.id] = capturarLocalizacao();
}

/* ---------------- FORMULÁRIO (MULTI-ETAPAS) ---------------- */

async function renderInvestigacaoForm() {
  state.screen = 'investigacao-form';
  const inv = await DB.getInvestigacao(state.investigacaoId);

  const stepsNav = INVESTIGACAO_STEPS.map((label, idx) => `
    <div class="step-dot ${idx === state.step ? 'active' : ''} ${idx < state.step ? 'done' : ''}">${idx + 1}</div>
  `).join('');

  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-investigacao-home" class="btn-link">← Voltar</button>
      <h1>${escapeHtml(inv.data.acidentado.nome || 'Nova Investigação')}</h1>
    </div>
    <div class="steps-nav">${stepsNav}</div>
    <div id="investigacao-step-content"></div>
  `;

  document.getElementById('btn-back-investigacao-home').addEventListener('click', async () => {
    await salvarRascunhoInvestigacao(inv);
    renderInvestigacaoHome();
  });

  const content = document.getElementById('investigacao-step-content');
  if (state.step === 0) renderInvestigacaoStepDados(content, inv);
  else if (state.step === 1) renderInvestigacaoStepPerguntas(content, inv);
  else if (state.step === 2) renderInvestigacaoStepCausas(content, inv);
  else renderInvestigacaoStepRevisao(content, inv);
}

/* ---- Passo 1: Dados do acidente e do acidentado ---- */
function renderInvestigacaoStepDados(content, inv) {
  const ac = inv.data.acidente;
  const acidentado = inv.data.acidentado;

  const tiposHtml = TIPOS_ACIDENTE_INVESTIGACAO.map((t) => `<option value="${escapeHtml(t)}" ${ac.tipo === t ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('');
  const gravidadesHtml = GRAVIDADES_ACIDENTE_INVESTIGACAO.map((g) => `<option value="${escapeHtml(g)}" ${ac.gravidade === g ? 'selected' : ''}>${escapeHtml(g)}</option>`).join('');

  content.innerHTML = `
    <form id="form-investigacao-dados" class="form-section">
      <h3>Dados do acidente</h3>
      <label>Data do acidente *
        <input type="date" name="data" required value="${escapeHtml(ac.data)}">
      </label>
      <label>Hora do acidente *
        <input type="time" name="hora" required value="${escapeHtml(ac.hora)}">
      </label>
      <label>Empresa / Contratada *
        <input type="text" name="empresa" required value="${escapeHtml(ac.empresa)}">
      </label>
      <label>Unidade / Projeto
        <input type="text" name="unidade" value="${escapeHtml(ac.unidade)}">
      </label>
      <label>Local do acidente *
        <input type="text" name="local" required value="${escapeHtml(ac.local)}">
      </label>
      <label>Turno
        <input type="text" name="turno" placeholder="Ex.: 1º turno, comercial…" value="${escapeHtml(ac.turno)}">
      </label>
      <label>Tipo de acidente *
        <select name="tipo" required>
          <option value="">Selecione…</option>
          ${tiposHtml}
        </select>
      </label>
      <label>Gravidade *
        <select name="gravidade" required>
          <option value="">Selecione…</option>
          ${gravidadesHtml}
        </select>
      </label>
      <label>Dias de afastamento
        <input type="number" name="diasAfastamento" min="0" value="${escapeHtml(ac.diasAfastamento)}">
      </label>
      <fieldset>
        <legend>CAT emitida?</legend>
        <label class="radio-inline"><input type="radio" name="catEmitida" value="Sim" ${ac.catEmitida === 'Sim' ? 'checked' : ''}> Sim</label>
        <label class="radio-inline"><input type="radio" name="catEmitida" value="Não" ${ac.catEmitida === 'Não' ? 'checked' : ''}> Não</label>
      </fieldset>
      <label>Número da CAT
        <input type="text" name="catNumero" value="${escapeHtml(ac.catNumero)}">
      </label>
      <label>Parte do corpo atingida
        <input type="text" name="parteCorpoAtingida" value="${escapeHtml(ac.parteCorpoAtingida)}">
      </label>
      <label>Agente causador
        <input type="text" name="agenteCausador" placeholder="Ex.: máquina, ferramenta, queda de altura…" value="${escapeHtml(ac.agenteCausador)}">
      </label>
      <label>Natureza da lesão
        <input type="text" name="naturezaLesao" placeholder="Ex.: corte, fratura, queimadura…" value="${escapeHtml(ac.naturezaLesao)}">
      </label>

      <h3>Dados do acidentado</h3>
      <label>Nome do acidentado *
        <input type="text" name="nomeAcidentado" required value="${escapeHtml(acidentado.nome)}">
      </label>
      <label>Função
        <input type="text" name="funcaoAcidentado" value="${escapeHtml(acidentado.funcao)}">
      </label>
      <label>Setor
        <input type="text" name="setorAcidentado" value="${escapeHtml(acidentado.setor)}">
      </label>
      <label>Tempo de empresa
        <input type="text" name="tempoEmpresa" placeholder="Ex.: 2 anos" value="${escapeHtml(acidentado.tempoEmpresa)}">
      </label>
      <label>Tempo na função
        <input type="text" name="tempoFuncao" placeholder="Ex.: 6 meses" value="${escapeHtml(acidentado.tempoFuncao)}">
      </label>

      <label>Descrição do acidente *
        <textarea name="descricao" rows="4" required placeholder="Descreva o que aconteceu, na ordem dos fatos.">${escapeHtml(inv.data.descricao)}</textarea>
      </label>
      <label>Testemunhas
        <textarea name="testemunhas" rows="2" placeholder="Nomes e, se possível, contato das testemunhas.">${escapeHtml(inv.data.testemunhas)}</textarea>
      </label>

      <div class="form-actions">
        <button type="submit" class="btn-primary">Avançar →</button>
      </div>
    </form>
  `;

  const form = document.getElementById('form-investigacao-dados');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    inv.data.acidente = {
      data: fd.get('data'),
      hora: fd.get('hora'),
      empresa: fd.get('empresa').trim(),
      unidade: (fd.get('unidade') || '').trim(),
      local: fd.get('local').trim(),
      turno: (fd.get('turno') || '').trim(),
      tipo: fd.get('tipo'),
      gravidade: fd.get('gravidade'),
      diasAfastamento: fd.get('diasAfastamento') || '',
      catEmitida: fd.get('catEmitida') || '',
      catNumero: (fd.get('catNumero') || '').trim(),
      parteCorpoAtingida: (fd.get('parteCorpoAtingida') || '').trim(),
      agenteCausador: (fd.get('agenteCausador') || '').trim(),
      naturezaLesao: (fd.get('naturezaLesao') || '').trim()
    };
    inv.data.acidentado = {
      nome: fd.get('nomeAcidentado').trim(),
      funcao: (fd.get('funcaoAcidentado') || '').trim(),
      setor: (fd.get('setorAcidentado') || '').trim(),
      tempoEmpresa: (fd.get('tempoEmpresa') || '').trim(),
      tempoFuncao: (fd.get('tempoFuncao') || '').trim()
    };
    inv.data.descricao = fd.get('descricao').trim();
    inv.data.testemunhas = (fd.get('testemunhas') || '').trim();
    await salvarRascunhoInvestigacao(inv);
    state.step = 1;
    renderInvestigacaoForm();
  });
}

/* ---- Passo 2: As 15 perguntas investigativas ---- */
function renderInvestigacaoStepPerguntas(content, inv) {
  content.innerHTML = `
    <p class="hint">Responda com base nos fatos apurados na investigação. Use o campo de observação para registrar evidências, relatos e detalhes relevantes.</p>
    <div class="checklist" id="investigacao-perguntas-container"></div>
    <div class="form-actions">
      <button id="btn-investigacao-perguntas-back" class="btn-link">← Voltar</button>
      <button id="btn-investigacao-perguntas-next" class="btn-primary">Avançar →</button>
    </div>
  `;

  const container = document.getElementById('investigacao-perguntas-container');
  renderPerguntasInvestigacaoItems(container, inv);

  document.getElementById('btn-investigacao-perguntas-back').addEventListener('click', async () => {
    state.step = 0;
    renderInvestigacaoForm();
  });

  document.getElementById('btn-investigacao-perguntas-next').addEventListener('click', async () => {
    state.step = 2;
    renderInvestigacaoForm();
  });
}

function renderPerguntaInvestigacao(item, idx) {
  const respostas = ['Sim', 'Não', 'Não se Aplica'];
  const radiosHtml = respostas.map((r) => `
    <label class="radio-pill radio-na">
      <input type="radio" name="investigacao-resp-${idx}" value="${r}" ${item.resposta === r ? 'checked' : ''}>
      ${r}
    </label>
  `).join('');

  return `
    <div class="checklist-card" data-idx="${idx}">
      <div class="checklist-question">${String(idx + 1).padStart(2, '0')}. ${escapeHtml(item.texto)}</div>
      <div class="radio-group">${radiosHtml}</div>
      <div class="checklist-details">
        <label>Observação / evidência
          <textarea class="txt-observacao" rows="2">${escapeHtml(item.observacao)}</textarea>
        </label>
      </div>
    </div>
  `;
}

function renderPerguntasInvestigacaoItems(container, inv) {
  container.innerHTML = inv.data.perguntas.map((item, idx) => renderPerguntaInvestigacao(item, idx)).join('');

  inv.data.perguntas.forEach((item, idx) => {
    const card = container.querySelector(`.checklist-card[data-idx="${idx}"]`);
    if (!card) return;

    card.querySelectorAll('input[type=radio]').forEach((radio) => {
      radio.addEventListener('change', async () => {
        item.resposta = radio.value;
        await salvarRascunhoInvestigacao(inv);
      });
    });

    const obs = card.querySelector('.txt-observacao');
    if (obs) obs.addEventListener('blur', async () => {
      item.observacao = obs.value;
      await salvarRascunhoInvestigacao(inv);
    });
  });
}

/* ---- Passo 3: Causas e plano de ação ---- */
function renderInvestigacaoStepCausas(content, inv) {
  content.innerHTML = `
    <label>Causas imediatas (atos inseguros e/ou condições inseguras identificadas)
      <textarea id="investigacao-causas-imediatas" rows="3">${escapeHtml(inv.data.causasImediatas)}</textarea>
    </label>
    <label>Causas básicas (fatores pessoais e/ou fatores do trabalho na origem do problema)
      <textarea id="investigacao-causas-basicas" rows="3">${escapeHtml(inv.data.causasBasicas)}</textarea>
    </label>
    <label>Investigador responsável *
      <input type="text" id="investigacao-investigador" required value="${escapeHtml(inv.data.investigador)}">
    </label>

    <label>Evidência fotográfica</label>
    <div class="foto-botoes">
      <label class="file-label">📷 Tirar foto
        <input type="file" accept="image/*" capture="environment" id="input-foto-investigacao-camera">
      </label>
      <label class="file-label">🖼️ Da galeria
        <input type="file" accept="image/*" multiple id="input-foto-investigacao-galeria">
      </label>
    </div>
    <div class="thumbs" id="thumbs-investigacao"></div>

    <div class="lista-participantes">
      <h3>Plano de ação</h3>
      <p class="hint">Registre as ações corretivas e preventivas para eliminar ou controlar as causas identificadas.</p>
      <div id="investigacao-plano-container"></div>
      <button type="button" id="btn-add-acao-investigacao" class="btn-secondary">+ Adicionar ação</button>
    </div>

    <div class="form-actions">
      <button id="btn-investigacao-causas-back" class="btn-link">← Voltar</button>
      <button id="btn-investigacao-causas-next" class="btn-primary">Avançar →</button>
    </div>
  `;

  const causasImediatas = document.getElementById('investigacao-causas-imediatas');
  const causasBasicas = document.getElementById('investigacao-causas-basicas');
  const investigadorInput = document.getElementById('investigacao-investigador');

  causasImediatas.addEventListener('blur', async () => {
    inv.data.causasImediatas = causasImediatas.value;
    await salvarRascunhoInvestigacao(inv);
  });
  causasBasicas.addEventListener('blur', async () => {
    inv.data.causasBasicas = causasBasicas.value;
    await salvarRascunhoInvestigacao(inv);
  });
  investigadorInput.addEventListener('blur', async () => {
    inv.data.investigador = investigadorInput.value.trim();
    await salvarRascunhoInvestigacao(inv);
  });

  const planoContainer = document.getElementById('investigacao-plano-container');
  renderPlanoAcaoInvestigacao(planoContainer, inv);

  document.getElementById('btn-add-acao-investigacao').addEventListener('click', async () => {
    inv.data.planoAcao.push(novaAcaoPlanoInvestigacao());
    await salvarRascunhoInvestigacao(inv);
    renderPlanoAcaoInvestigacao(planoContainer, inv);
  });

  async function refreshThumbsInvestigacao() {
    const el = document.getElementById('thumbs-investigacao');
    await renderThumbnails(el, inv.data.fotosIds);
    el.querySelectorAll('.btn-remover-foto').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const photoId = btn.dataset.photoId;
        await DB.deletePhoto(photoId);
        inv.data.fotosIds = inv.data.fotosIds.filter((pid) => pid !== photoId);
        await salvarRascunhoInvestigacao(inv);
        refreshThumbsInvestigacao();
      });
    });
  }
  refreshThumbsInvestigacao();

  ['input-foto-investigacao-camera', 'input-foto-investigacao-galeria'].forEach((elId) => {
    document.getElementById(elId).addEventListener('change', async (e) => {
      await adicionarFotos(inv, inv.data.fotosIds, e.target.files, 'investigacao');
      await salvarRascunhoInvestigacao(inv);
      refreshThumbsInvestigacao();
    });
  });

  document.getElementById('btn-investigacao-causas-back').addEventListener('click', async () => {
    inv.data.causasImediatas = causasImediatas.value;
    inv.data.causasBasicas = causasBasicas.value;
    inv.data.investigador = investigadorInput.value.trim();
    await salvarRascunhoInvestigacao(inv);
    state.step = 1;
    renderInvestigacaoForm();
  });

  document.getElementById('btn-investigacao-causas-next').addEventListener('click', async () => {
    if (!investigadorInput.value.trim()) {
      alert('Informe o investigador responsável antes de avançar.');
      return;
    }
    inv.data.causasImediatas = causasImediatas.value;
    inv.data.causasBasicas = causasBasicas.value;
    inv.data.investigador = investigadorInput.value.trim();
    await salvarRascunhoInvestigacao(inv);
    state.step = 3;
    renderInvestigacaoForm();
  });
}

function renderPlanoAcaoInvestigacao(container, inv) {
  const acoes = inv.data.planoAcao;
  container.innerHTML = acoes.length
    ? acoes.map((a, idx) => `
        <div class="leitura-card" data-idx="${idx}">
          <label class="campo-leitura">Ação corretiva / preventiva
            <input type="text" class="in-descricao" placeholder="Descreva a ação" value="${escapeHtml(a.descricao)}">
          </label>
          <div class="participante-linha">
            <label class="campo-leitura">Responsável
              <input type="text" class="in-responsavel" value="${escapeHtml(a.responsavel)}">
            </label>
            <label class="campo-leitura">Prazo
              <input type="date" class="in-prazo" value="${escapeHtml(a.prazo)}">
            </label>
            <label class="campo-leitura">Status
              <select class="in-status">
                <option ${a.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                <option ${a.status === 'Concluída' ? 'selected' : ''}>Concluída</option>
              </select>
            </label>
            <button type="button" class="btn-remover-item btn-remover-acao" title="Remover ação">✕</button>
          </div>
        </div>
      `).join('')
    : '<p class="empty-state">Nenhuma ação registrada ainda.</p>';

  acoes.forEach((a, idx) => {
    const card = container.querySelector(`.leitura-card[data-idx="${idx}"]`);
    if (!card) return;

    card.querySelector('.in-descricao').addEventListener('blur', async (e) => {
      a.descricao = e.target.value.trim();
      await salvarRascunhoInvestigacao(inv);
    });
    card.querySelector('.in-responsavel').addEventListener('blur', async (e) => {
      a.responsavel = e.target.value.trim();
      await salvarRascunhoInvestigacao(inv);
    });
    card.querySelector('.in-prazo').addEventListener('change', async (e) => {
      a.prazo = e.target.value;
      await salvarRascunhoInvestigacao(inv);
    });
    card.querySelector('.in-status').addEventListener('change', async (e) => {
      a.status = e.target.value;
      await salvarRascunhoInvestigacao(inv);
    });
    card.querySelector('.btn-remover-acao').addEventListener('click', async () => {
      if (!confirm('Remover esta ação do plano?')) return;
      inv.data.planoAcao.splice(idx, 1);
      await salvarRascunhoInvestigacao(inv);
      renderPlanoAcaoInvestigacao(container, inv);
    });
  });
}

/* ---- Passo 4: Revisão e salvar ---- */
function renderInvestigacaoStepRevisao(content, inv) {
  const totalPerguntas = inv.data.perguntas.length;
  const semResposta = inv.data.perguntas.filter((p) => !p.resposta).length;
  const acoesPendentes = inv.data.planoAcao.filter((a) => a.status !== 'Concluída').length;

  content.innerHTML = `
    <div class="resumo">
      <h2>Resumo da Investigação</h2>
      <p><strong>${escapeHtml(inv.data.acidentado.nome)}</strong></p>
      <p>${escapeHtml(inv.data.acidente.empresa)} · ${escapeHtml(inv.data.acidente.local)}</p>
      <p>${escapeHtml(inv.data.acidente.data)} ${escapeHtml(inv.data.acidente.hora)} · ${escapeHtml(inv.data.acidente.tipo)} · ${escapeHtml(inv.data.acidente.gravidade)}</p>
      <ul class="resumo-stats">
        <li>Perguntas investigativas: ${totalPerguntas}</li>
        ${semResposta ? `<li class="alerta">${semResposta} pergunta(s) sem resposta</li>` : ''}
        <li>Ações no plano: ${inv.data.planoAcao.length} (${acoesPendentes} pendente(s))</li>
      </ul>
    </div>
    <div class="form-actions">
      <button id="btn-investigacao-revisao-back" class="btn-link">← Voltar</button>
      <button id="btn-investigacao-concluir" class="btn-primary">Concluir e salvar</button>
    </div>
    <p class="hint">A investigação fica salva no aparelho mesmo sem internet. Assim que houver conexão, é enviada automaticamente.</p>
  `;

  document.getElementById('btn-investigacao-revisao-back').addEventListener('click', () => {
    state.step = 2;
    renderInvestigacaoForm();
  });

  document.getElementById('btn-investigacao-concluir').addEventListener('click', async () => {
    if (semResposta > 0 && !confirm(`Existem ${semResposta} pergunta(s) sem resposta. Deseja concluir mesmo assim?`)) {
      return;
    }
    await aplicarLocalizacaoPendente(inv);
    inv.completo = true;
    inv.syncStatus = 'pendente';
    await salvarRascunhoInvestigacao(inv);
    await refreshChrome();
    renderInvestigacaoHome();
    Sync.syncAll().catch(() => {});
  });
}

/* ---------------- VALIDAÇÃO PARA O RELATÓRIO ---------------- */

function validarInvestigacaoParaRelatorio(inv) {
  const problemas = [];
  inv.data.perguntas.forEach((item, idx) => {
    const num = String(idx + 1).padStart(2, '0');
    if (!item.resposta) {
      problemas.push(`Pergunta ${num} está sem resposta.`);
    }
  });
  if (!inv.data.investigador) {
    problemas.push('O investigador responsável não foi informado.');
  }
  if (!inv.data.planoAcao.length) {
    problemas.push('Nenhuma ação foi registrada no plano de ação.');
  }
  inv.data.planoAcao.forEach((a, idx) => {
    if (!a.descricao) problemas.push(`Ação ${idx + 1} do plano de ação está sem descrição.`);
  });
  return problemas;
}

/* ---------------- DETALHE ---------------- */

async function renderInvestigacaoDetail(id) {
  state.screen = 'investigacao-detail';
  state.investigacaoId = id;
  const inv = await DB.getInvestigacao(id);
  const photos = await DB.getPhotosByInspection(id);
  const s = statusLabel(inv);
  const ac = inv.data.acidente;
  const acidentado = inv.data.acidentado;

  const perguntasHtml = inv.data.perguntas.map((item, idx) => `
    <div class="detail-item">
      <div><strong>${String(idx + 1).padStart(2, '0')}.</strong> ${escapeHtml(item.texto)}</div>
      <div class="detail-resposta">${escapeHtml(item.resposta || 'Sem resposta')}</div>
      ${item.observacao ? `<div class="detail-obs">Obs.: ${escapeHtml(item.observacao)}</div>` : ''}
    </div>
  `).join('');

  const planoHtml = inv.data.planoAcao.length
    ? `<ul class="lista-presenca">${inv.data.planoAcao.map((a) => `
        <li>${escapeHtml(a.descricao || 'Ação sem descrição')} — ${escapeHtml(a.responsavel || 'sem responsável')}
          ${a.prazo ? ' · Prazo: ' + formatarDataBR(a.prazo) : ''}
          <span class="badge ${a.status === 'Concluída' ? 'badge-ok' : 'badge-pendente'}">${escapeHtml(a.status)}</span>
        </li>
      `).join('')}</ul>`
    : '<p class="empty-state">Nenhuma ação registrada.</p>';

  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-investigacao-home" class="btn-link">← Voltar</button>
      <h1>${escapeHtml(acidentado.nome)}</h1>
    </div>
    <span class="badge ${gravidadeBadgeClass(ac.gravidade)}">${escapeHtml(ac.gravidade || '—')}</span>
    <span class="badge ${s.cls}">${s.text}</span>
    ${inv.syncError ? `<p class="erro-msg">${escapeHtml(inv.syncError)}</p>` : ''}
    <div class="detail-block">
      <p>${escapeHtml(ac.empresa)} · ${escapeHtml(ac.unidade || '—')} · ${escapeHtml(ac.local)}</p>
      <p>${escapeHtml(ac.data)} ${escapeHtml(ac.hora)} · Tipo: ${escapeHtml(ac.tipo)}</p>
      <p>Função: ${escapeHtml(acidentado.funcao || '—')} · Setor: ${escapeHtml(acidentado.setor || '—')}</p>
    </div>
    <h3>Descrição do acidente</h3>
    <div class="detail-block"><p>${escapeHtml(inv.data.descricao)}</p></div>
    <h3>Investigação (15 perguntas)</h3>
    ${perguntasHtml}
    ${inv.data.causasImediatas ? `<h3>Causas imediatas</h3><div class="detail-block"><p>${escapeHtml(inv.data.causasImediatas)}</p></div>` : ''}
    ${inv.data.causasBasicas ? `<h3>Causas básicas</h3><div class="detail-block"><p>${escapeHtml(inv.data.causasBasicas)}</p></div>` : ''}
    ${photos.length ? `<h3>Evidência fotográfica</h3><div class="thumbs">${photos.map((p) => `<div class="thumb"><img src="${URL.createObjectURL(p.blob)}"><span class="thumb-sync ${p.synced ? 'ok' : ''}">${p.synced ? '✓' : '⏳'}</span></div>`).join('')}</div>` : ''}
    <h3>Plano de ação (${inv.data.planoAcao.length})</h3>
    ${planoHtml}
    <div class="form-actions">
      <button id="btn-editar-investigacao" class="btn-secondary">✏️ Editar Investigação</button>
      <button id="btn-relatorio-investigacao" class="btn-secondary">Gerar relatório (PDF)</button>
    </div>
    <div class="form-actions">
      ${inv.syncStatus !== 'synced' ? '<button id="btn-sync-one-investigacao" class="btn-primary">Sincronizar esta investigação</button>' : ''}
      <button id="btn-excluir-investigacao" class="btn-danger">Excluir investigação</button>
    </div>
  `;

  document.getElementById('btn-back-investigacao-home').addEventListener('click', renderInvestigacaoHome);
  document.getElementById('btn-relatorio-investigacao').addEventListener('click', () => {
    const problemas = validarInvestigacaoParaRelatorio(inv);
    if (problemas.length) {
      alert('Não é possível gerar o relatório ainda:\n\n- ' + problemas.join('\n- ') + '\n\nToque em "Editar Investigação" para corrigir.');
      return;
    }
    renderInvestigacaoReport(id);
  });
  document.getElementById('btn-editar-investigacao').addEventListener('click', async () => {
    inv.metaSynced = false;
    inv.syncStatus = 'pendente';
    await salvarRascunhoInvestigacao(inv);
    state.investigacaoId = id;
    state.step = 0;
    renderInvestigacaoForm();
  });

  const btnSyncOne = document.getElementById('btn-sync-one-investigacao');
  if (btnSyncOne) btnSyncOne.addEventListener('click', async () => {
    btnSyncOne.disabled = true;
    btnSyncOne.textContent = 'Sincronizando…';
    try {
      await Sync.syncInvestigacao(id);
    } catch (e) {
      alert('Não foi possível sincronizar agora: ' + e.message);
    }
    renderInvestigacaoDetail(id);
    updateSyncBar();
  });

  document.getElementById('btn-excluir-investigacao').addEventListener('click', async () => {
    if (!confirm('Excluir esta investigação e todas as suas fotos do dispositivo? Esta ação não pode ser desfeita.')) return;
    for (const p of photos) await DB.deletePhoto(p.id);
    await DB.deleteInvestigacao(id);
    renderInvestigacaoHome();
    updateSyncBar();
  });
}

/* ---------------- RELATÓRIO (impressão / PDF) ---------------- */

function gerarCodigoInvestigacao(inv) {
  const data = (inv.data.acidente.data || '').replace(/-/g, '');
  const curto = inv.id.split('-')[0].toUpperCase();
  return `RIAT-${data || 'SDATA'}-${curto}`;
}

async function montarFotosInvestigacao(fotosIds) {
  if (!fotosIds || !fotosIds.length) {
    return '<p class="rep-hint">Nenhuma evidência fotográfica anexada.</p>';
  }
  const fotosHtml = (await Promise.all(fotosIds.map(montarBlocoFoto))).join('');
  return `<div class="rep-fotos-grid">${fotosHtml}</div>`;
}

function montarTabelaPerguntasInvestigacao(perguntas) {
  const linhas = perguntas.map((item, idx) => `
    <tr>
      <td>${String(idx + 1).padStart(2, '0')}</td>
      <td>${escapeHtml(item.texto)}</td>
      <td>${escapeHtml(item.resposta || '—')}</td>
      <td>${escapeHtml(item.observacao || '—')}</td>
    </tr>
  `).join('');
  return `
    <table class="rep-table">
      <thead><tr><th>Nº</th><th>Pergunta investigativa</th><th>Resposta</th><th>Observação / evidência</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
  `;
}

function montarPlanoAcaoInvestigacao(planoAcao) {
  if (!planoAcao.length) return '<p class="rep-hint">Nenhuma ação registrada.</p>';
  const linhas = planoAcao.map((a, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${escapeHtml(a.descricao || '—')}</td>
      <td>${escapeHtml(a.responsavel || '—')}</td>
      <td>${a.prazo ? formatarDataBR(a.prazo) : '—'}</td>
      <td>${escapeHtml(a.status || '—')}</td>
    </tr>
  `).join('');
  return `
    <table class="rep-table">
      <thead><tr><th>Nº</th><th>Ação corretiva / preventiva</th><th>Responsável</th><th>Prazo</th><th>Status</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
  `;
}

function ligarAssinaturasInvestigacao(inv, id) {
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
      inv.data.assinaturas = inv.data.assinaturas || {};
      inv.data.assinaturas[campo] = dataUrl;
      await salvarRascunhoInvestigacao(inv);
      renderInvestigacaoReport(id);
    });
  });
}

async function renderInvestigacaoReport(id) {
  state.screen = 'investigacao-report';
  const inv = await DB.getInvestigacao(id);
  if (!inv) return renderInvestigacaoHome();
  inv.data.assinaturas = inv.data.assinaturas || {};

  const ac = inv.data.acidente;
  const acidentado = inv.data.acidentado;
  const codigo = gerarCodigoInvestigacao(inv);
  const geradoEm = new Date().toLocaleString('pt-BR');
  const fotosHtml = await montarFotosInvestigacao(inv.data.fotosIds);

  view.innerHTML = `
    <div class="screen-header no-print">
      <button id="btn-back-investigacao-detail" class="btn-link">← Voltar</button>
      <h1>Relatório de Investigação de Acidente</h1>
    </div>
    <div class="form-actions no-print" style="margin-bottom:12px;">
      <button id="btn-imprimir-investigacao" class="btn-primary">Imprimir / Salvar PDF</button>
    </div>

    <article class="rep-doc">
      <header class="rep-cabecalho">
        <div class="rep-titulo">
          <img src="icons/icon-192.png" alt="" class="rep-logo">
          <div>
            <h2>RELATÓRIO DE INVESTIGAÇÃO DE ACIDENTE DE TRABALHO</h2>
            <p>${escapeHtml(acidentado.nome)}</p>
          </div>
        </div>
        <table class="rep-controle">
          <tr><th>Código</th><td>${codigo}</td></tr>
          <tr><th>Revisão</th><td>00</td></tr>
          <tr><th>Emitido em</th><td>${geradoEm}</td></tr>
        </table>
      </header>

      <section class="rep-secao">
        <h3>1. Dados do acidente</h3>
        <table class="rep-tabela-ident">
          <tr><th>Empresa / Contratada</th><td>${escapeHtml(ac.empresa)}</td><th>Unidade / Projeto</th><td>${escapeHtml(ac.unidade || '—')}</td></tr>
          <tr><th>Local</th><td>${escapeHtml(ac.local)}</td><th>Turno</th><td>${escapeHtml(ac.turno || '—')}</td></tr>
          <tr><th>Data</th><td>${formatarDataBR(ac.data)}</td><th>Hora</th><td>${escapeHtml(ac.hora)}</td></tr>
          <tr><th>Tipo de acidente</th><td>${escapeHtml(ac.tipo)}</td><th>Gravidade</th><td>${escapeHtml(ac.gravidade)}</td></tr>
          <tr><th>Dias de afastamento</th><td>${escapeHtml(ac.diasAfastamento || '—')}</td><th>CAT emitida</th><td>${escapeHtml(ac.catEmitida || '—')}${ac.catNumero ? ' — nº ' + escapeHtml(ac.catNumero) : ''}</td></tr>
          <tr><th>Parte do corpo atingida</th><td>${escapeHtml(ac.parteCorpoAtingida || '—')}</td><th>Agente causador</th><td>${escapeHtml(ac.agenteCausador || '—')}</td></tr>
          <tr><th>Natureza da lesão</th><td colspan="3">${escapeHtml(ac.naturezaLesao || '—')}</td></tr>
        </table>
        ${montarLocalizacaoRelatorio(inv.data.localizacao)}
      </section>

      <section class="rep-secao">
        <h3>2. Dados do acidentado</h3>
        <table class="rep-tabela-ident">
          <tr><th>Nome</th><td>${escapeHtml(acidentado.nome)}</td><th>Função</th><td>${escapeHtml(acidentado.funcao || '—')}</td></tr>
          <tr><th>Setor</th><td>${escapeHtml(acidentado.setor || '—')}</td><th>Tempo de empresa</th><td>${escapeHtml(acidentado.tempoEmpresa || '—')}</td></tr>
          <tr><th>Tempo na função</th><td colspan="3">${escapeHtml(acidentado.tempoFuncao || '—')}</td></tr>
        </table>
        <p><strong>Descrição do acidente:</strong> ${escapeHtml(inv.data.descricao)}</p>
        ${inv.data.testemunhas ? `<p><strong>Testemunhas:</strong> ${escapeHtml(inv.data.testemunhas)}</p>` : ''}
      </section>

      <section class="rep-secao rep-quebra">
        <h3>3. Investigação — perguntas e evidências</h3>
        ${montarTabelaPerguntasInvestigacao(inv.data.perguntas)}
      </section>

      <section class="rep-secao rep-quebra">
        <h3>4. Análise de causas</h3>
        <p><strong>Causas imediatas:</strong> ${escapeHtml(inv.data.causasImediatas || '—')}</p>
        <p><strong>Causas básicas:</strong> ${escapeHtml(inv.data.causasBasicas || '—')}</p>
      </section>

      <section class="rep-secao rep-quebra">
        <h3>5. Evidência fotográfica</h3>
        ${fotosHtml}
      </section>

      <section class="rep-secao rep-quebra">
        <h3>6. Plano de ação</h3>
        ${montarPlanoAcaoInvestigacao(inv.data.planoAcao)}
      </section>

      <section class="rep-secao rep-assinaturas">
        <h3>7. Encerramento</h3>
        <div class="rep-assinatura-grid">
          ${blocoAssinatura(inv, 'investigador', 'Investigador responsável', inv.data.investigador)}
          ${blocoAssinatura(inv, 'responsavelArea', 'Responsável da área', '')}
        </div>
      </section>

      <footer class="rep-rodape">
        Documento ${codigo} — gerado automaticamente pelo aplicativo Inspeções SSMA em ${geradoEm}.
      </footer>
    </article>
  `;

  document.getElementById('btn-back-investigacao-detail').addEventListener('click', () => renderInvestigacaoDetail(id));
  document.getElementById('btn-imprimir-investigacao').addEventListener('click', () => window.print());
  ligarAssinaturasInvestigacao(inv, id);
}
