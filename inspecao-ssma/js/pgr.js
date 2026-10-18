/* Módulo de PGR (Programa de Gerenciamento de Riscos), alinhado ao GRO da
 * NR-01. Assim como a Ficha de EPI e a Gestão de CIPA, é um documento
 * contínuo por empresa/unidade: a cada perigo identificado, registra-se
 * severidade x probabilidade (risco antes das medidas), as medidas de
 * controle e a severidade x probabilidade residual (risco depois das
 * medidas), com uma matriz visual 5x5 para cada avaliação. */

function novoPerigoPGR() {
  return {
    id: uuid(),
    gheId: '',
    perigo: '',
    fonte: '',
    lesaoAgravo: '',
    tipoExposicao: '',
    tempoExposicao: '',
    tipoRisco: TIPOS_RISCO_PGR[0],
    referencia: '',
    tipoAvaliacao: 'Qualitativa',
    resultadoAvaliacao: '',
    severidade: '',
    probabilidade: '',
    medidasExistentes: '',
    medidasPropostas: '',
    severidadeResidual: '',
    probabilidadeResidual: '',
    tipoMedida: 'Introduzir',
    responsavel: '',
    prazo: '',
    acompanhamento: '',
    status: 'Pendente'
  };
}

function novoGHEPGR() {
  return {
    id: uuid(),
    nome: '',
    setor: '',
    funcao: '',
    numTrabalhadores: '',
    descricaoAtividades: ''
  };
}

function novoTreinamentoPGR() {
  return {
    id: uuid(),
    nome: '',
    gheId: '',
    cargaHoraria: '',
    periodicidade: PERIODICIDADES_TREINAMENTO_PGR[0],
    responsavel: '',
    dataPrevista: '',
    status: 'Pendente'
  };
}

function novoExercicioSimuladoPGR() {
  return {
    id: uuid(),
    data: '',
    descricao: '',
    participantes: '',
    fotosIds: []
  };
}

function novoPGRVazio() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const hoje = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const daquiA2Anos = `${now.getFullYear() + 2}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
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
      cnpj: '',
      cnae: '',
      atividadePrincipal: '',
      grauRisco: '',
      endereco: '',
      regimeTrabalho: '',
      responsavelPGR: '',
      dataElaboracao: hoje,
      proximaRevisao: daquiA2Anos,
      revisoes: [{ id: uuid(), revisao: '00', motivo: 'Emissão original', data: hoje }],
      caracterizacaoAmbiente: '',
      consultaTrabalhadores: '',
      requisitosEspecificos: '',
      ghes: [],
      perigos: [],
      treinamentos: [],
      emergencia: {
        meiosPrimeirosSocorros: '',
        procedimentoAbandono: '',
        medidasGrandeMagnitude: '',
        periodicidadeExercicios: PERIODICIDADES_EXERCICIO_EMERGENCIA_PGR[0]
      },
      exerciciosSimulados: [],
      assinaturas: {
        responsavelPGR: ''
      }
    }
  };
}

function nomeGHEPGR(ghes, gheId) {
  const g = ghes.find((x) => x.id === gheId);
  if (!g) return '';
  const partes = [g.nome];
  const complemento = [g.setor, g.funcao].filter(Boolean).join(' / ');
  if (complemento) partes.push(`(${complemento})`);
  return partes.join(' ');
}

function opcoesGHEPGR(ghes, selecionado) {
  return `<option value="">Selecione um GHE…</option>` + ghes.map((g) =>
    `<option value="${g.id}" ${selecionado === g.id ? 'selected' : ''}>${escapeHtml(nomeGHEPGR(ghes, g.id) || 'Sem nome')}</option>`
  ).join('');
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
        const revisaoVencida = p.data.proximaRevisao && p.data.proximaRevisao < new Date().toISOString().slice(0, 10);
        return `
          <li class="insp-card" data-id="${p.id}">
            <div class="insp-card-main">
              <div class="insp-card-title">${escapeHtml(p.data.empresa || 'Sem nome')}</div>
              <div class="insp-card-sub">${escapeHtml(p.data.unidade || '')}</div>
              <div class="insp-card-sub">${p.data.perigos.length} perigo(s) mapeado(s)</div>
            </div>
            <div class="insp-card-side">
              ${revisaoVencida ? `<span class="badge badge-erro">Revisão vencida</span>` : ''}
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
  if (!confirm('Excluir este PGR do dispositivo e todas as suas fotos? Esta ação não pode ser desfeita.')) return;
  const photos = await DB.getPhotosByInspection(id);
  for (const photo of photos) await DB.deletePhoto(photo.id);
  await DB.deletePGR(id);
  renderPGRHome();
  updateSyncBar();
}

async function startNewPGR() {
  state.screen = 'pgr-novo';
  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-pgr-novo" class="btn-link">← Voltar</button>
      <h1>Novo PGR</h1>
    </div>
    <p class="hint">Comece em branco ou a partir de um modelo pronto, já estruturado conforme a NR-01. Depois, ajuste os dados ao estabelecimento.</p>
    <ul class="insp-list">
      <li class="insp-card" data-modelo="">
        <div class="insp-card-main">
          <div class="insp-card-title">PGR em branco</div>
          <div class="insp-card-sub">Cadastre GHEs, perigos e plano de ação do zero.</div>
        </div>
      </li>
      ${MODELOS_PGR.map((m) => `
        <li class="insp-card" data-modelo="${m.id}">
          <div class="insp-card-main">
            <div class="insp-card-title">Modelo: ${escapeHtml(m.nome)}</div>
            <div class="insp-card-sub">${escapeHtml(m.descricao)}</div>
          </div>
        </li>
      `).join('')}
    </ul>
  `;
  document.getElementById('btn-back-pgr-novo').addEventListener('click', renderPGRHome);
  view.querySelectorAll('.insp-card[data-modelo]').forEach((el) => {
    el.addEventListener('click', () => criarPGR(el.dataset.modelo));
  });
}

async function criarPGR(modeloId) {
  const p = novoPGRVazio();
  const modelo = MODELOS_PGR.find((m) => m.id === modeloId);
  if (modelo) Object.assign(p.data, modelo.criar(p.data.dataElaboracao));
  await DB.putPGR(p);
  renderPGRDetail(p.id);
}

/* ---------------- DETALHE (também é a tela de edição) ---------------- */

async function renderPGRDetail(id) {
  state.screen = 'pgr-detail';
  state.pgrId = id;
  const p = await DB.getPGR(id);
  if (!p) return renderPGRHome();
  p.data.ghes = p.data.ghes || [];
  p.data.treinamentos = p.data.treinamentos || [];
  p.data.caracterizacaoAmbiente = p.data.caracterizacaoAmbiente || '';
  p.data.revisoes = p.data.revisoes || [];
  p.data.consultaTrabalhadores = p.data.consultaTrabalhadores || '';
  p.data.requisitosEspecificos = p.data.requisitosEspecificos || '';
  ['cnpj', 'cnae', 'atividadePrincipal', 'grauRisco', 'endereco', 'regimeTrabalho'].forEach((k) => { p.data[k] = p.data[k] || ''; });
  p.data.exerciciosSimulados = p.data.exerciciosSimulados || [];
  p.data.emergencia = p.data.emergencia || {
    meiosPrimeirosSocorros: '',
    procedimentoAbandono: '',
    medidasGrandeMagnitude: '',
    periodicidadeExercicios: PERIODICIDADES_EXERCICIO_EMERGENCIA_PGR[0]
  };
  const revisaoVencida = p.data.proximaRevisao && p.data.proximaRevisao < new Date().toISOString().slice(0, 10);
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
      <div class="participante-linha">
        <label class="campo-leitura">CNPJ
          <input type="text" class="in-ident" data-campo="cnpj" value="${escapeHtml(p.data.cnpj)}">
        </label>
        <label class="campo-leitura">CNAE
          <input type="text" class="in-ident" data-campo="cnae" placeholder="Ex.: 43.13-4-00" value="${escapeHtml(p.data.cnae)}">
        </label>
        <label class="campo-leitura">Grau de risco (NR-04)
          <input type="text" class="in-ident" data-campo="grauRisco" value="${escapeHtml(p.data.grauRisco)}">
        </label>
      </div>
      <label>Atividade principal
        <input type="text" class="in-ident" data-campo="atividadePrincipal" value="${escapeHtml(p.data.atividadePrincipal)}">
      </label>
      <label>Endereço do estabelecimento
        <input type="text" class="in-ident" data-campo="endereco" value="${escapeHtml(p.data.endereco)}">
      </label>
      <label>Regime de trabalho (jornada)
        <input type="text" class="in-ident" data-campo="regimeTrabalho" placeholder="Ex.: Seg. a qui. 07h–17h; sex. 07h–16h; refeição 12h–13h" value="${escapeHtml(p.data.regimeTrabalho)}">
      </label>
      <label>Responsável técnico pelo PGR
        <input type="text" id="pgr-responsavel" value="${escapeHtml(p.data.responsavelPGR)}">
      </label>
      <label>Data de elaboração / última revisão
        <input type="date" id="pgr-data-elaboracao" value="${escapeHtml(p.data.dataElaboracao)}">
      </label>
      <label>Data prevista da próxima revisão
        <input type="date" id="pgr-proxima-revisao" value="${escapeHtml(p.data.proximaRevisao || '')}">
      </label>
      ${revisaoVencida ? '<p class="erro-msg">A revisão deste PGR está vencida (a NR-01 exige reavaliação a cada 2 anos, ou 3 anos com certificação em SST).</p>' : ''}
      <label>Caracterização do processo e ambiente de trabalho
        <textarea id="pgr-caracterizacao-ambiente" rows="3" placeholder="Ex.: Obra de construção civil, execução de estrutura em concreto armado, com atividades em altura e uso de ferramentas elétricas.">${escapeHtml(p.data.caracterizacaoAmbiente)}</textarea>
      </label>
      <label>Consulta aos trabalhadores e à CIPA (percepção dos riscos)
        <textarea class="in-ident" data-campo="consultaTrabalhadores" rows="2" placeholder="Datas, participantes e principais contribuições da consulta.">${escapeHtml(p.data.consultaTrabalhadores)}</textarea>
      </label>
      <label>Requisitos específicos da NR setorial (NR-18, NR-22, NR-32 etc.)
        <textarea class="in-ident" data-campo="requisitosEspecificos" rows="4" placeholder="Itens que a norma do setor exige no PGR além da NR-01 e a situação de cada um.">${escapeHtml(p.data.requisitosEspecificos)}</textarea>
      </label>
    </div>

    <div class="lista-participantes">
      <h3>Controle de revisões</h3>
      <p class="hint">Registre cada emissão ou revisão do PGR (a NR-01 exige o histórico das atualizações).</p>
      <div id="pgr-revisoes-container"></div>
      <button type="button" id="btn-add-revisao-pgr" class="btn-secondary">+ Registrar revisão</button>
    </div>

    <div class="lista-participantes">
      <h3>Grupos Homogêneos de Exposição (GHE)</h3>
      <p class="hint">Agrupe os trabalhadores com exposições semelhantes. Cada perigo do inventário e cada treinamento do cronograma são vinculados a um GHE.</p>
      <div id="pgr-ghes-container"></div>
      <button type="button" id="btn-add-ghe-pgr" class="btn-secondary">+ Adicionar GHE</button>
    </div>

    <div class="lista-participantes">
      <h3>Perigos identificados</h3>
      <p class="hint">Para cada perigo, avalie a severidade e a probabilidade antes das medidas de controle e, depois de definir as medidas propostas, avalie novamente o risco residual.</p>
      <div id="pgr-perigos-container"></div>
      <button type="button" id="btn-add-perigo-pgr" class="btn-secondary">+ Adicionar perigo</button>
    </div>

    ${htmlSecaoPsicossocialPGR(p, p.data.ghes)}

    <div class="lista-participantes">
      <h3>Cronograma de Treinamento</h3>
      <p class="hint">Treinamentos previstos ou já realizados para cada GHE, conforme as medidas de controle definidas.</p>
      <div id="pgr-treinamentos-container"></div>
      <button type="button" id="btn-add-treinamento-pgr" class="btn-secondary">+ Adicionar treinamento</button>
    </div>

    <div class="lista-participantes">
      <h3>Preparação e Resposta a Emergências</h3>
      <p class="hint">Procedimentos mínimos exigidos pela NR-01 (item 1.5.6) para situações de emergência.</p>
      <label>Meios, responsáveis e recursos para primeiros socorros e encaminhamento de acidentados
        <textarea id="pgr-emergencia-socorros" rows="2">${escapeHtml(p.data.emergencia.meiosPrimeirosSocorros)}</textarea>
      </label>
      <label>Procedimento de abandono de área / local afetado
        <textarea id="pgr-emergencia-abandono" rows="2">${escapeHtml(p.data.emergencia.procedimentoAbandono)}</textarea>
      </label>
      <label>Medidas para emergências de grande magnitude (quando aplicável)
        <textarea id="pgr-emergencia-magnitude" rows="2">${escapeHtml(p.data.emergencia.medidasGrandeMagnitude)}</textarea>
      </label>
      <label>Periodicidade dos exercícios simulados
        <select id="pgr-emergencia-periodicidade">${PERIODICIDADES_EXERCICIO_EMERGENCIA_PGR.map((per) => `<option ${p.data.emergencia.periodicidadeExercicios === per ? 'selected' : ''}>${escapeHtml(per)}</option>`).join('')}</select>
      </label>

      <h4>Exercícios simulados realizados</h4>
      <div id="pgr-exercicios-container"></div>
      <button type="button" id="btn-add-exercicio-pgr" class="btn-secondary">+ Registrar exercício simulado</button>
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
  const inputProximaRevisao = document.getElementById('pgr-proxima-revisao');
  inputProximaRevisao.addEventListener('change', async () => { p.data.proximaRevisao = inputProximaRevisao.value; await salvarPGR(p); renderPGRDetail(id); });
  view.querySelectorAll('.in-ident').forEach((el) => {
    el.addEventListener('blur', async () => { p.data[el.dataset.campo] = el.value.trim(); await salvarPGR(p); });
  });
  const revisoesContainer = document.getElementById('pgr-revisoes-container');
  renderRevisoesPGR(revisoesContainer, p);
  document.getElementById('btn-add-revisao-pgr').addEventListener('click', async () => {
    const ultima = p.data.revisoes.length ? Number(p.data.revisoes[p.data.revisoes.length - 1].revisao) || 0 : -1;
    p.data.revisoes.push({ id: uuid(), revisao: String(ultima + 1).padStart(2, '0'), motivo: '', data: new Date().toISOString().slice(0, 10) });
    await salvarPGR(p);
    renderRevisoesPGR(revisoesContainer, p);
  });
  const inputCaracterizacao = document.getElementById('pgr-caracterizacao-ambiente');
  inputCaracterizacao.addEventListener('blur', async () => { p.data.caracterizacaoAmbiente = inputCaracterizacao.value.trim(); await salvarPGR(p); });

  const inputSocorros = document.getElementById('pgr-emergencia-socorros');
  const inputAbandono = document.getElementById('pgr-emergencia-abandono');
  const inputMagnitude = document.getElementById('pgr-emergencia-magnitude');
  const inputPeriodicidadeExercicio = document.getElementById('pgr-emergencia-periodicidade');
  inputSocorros.addEventListener('blur', async () => { p.data.emergencia.meiosPrimeirosSocorros = inputSocorros.value.trim(); await salvarPGR(p); });
  inputAbandono.addEventListener('blur', async () => { p.data.emergencia.procedimentoAbandono = inputAbandono.value.trim(); await salvarPGR(p); });
  inputMagnitude.addEventListener('blur', async () => { p.data.emergencia.medidasGrandeMagnitude = inputMagnitude.value.trim(); await salvarPGR(p); });
  inputPeriodicidadeExercicio.addEventListener('change', async () => { p.data.emergencia.periodicidadeExercicios = inputPeriodicidadeExercicio.value; await salvarPGR(p); });

  const ghesContainer = document.getElementById('pgr-ghes-container');
  const perigosContainer = document.getElementById('pgr-perigos-container');
  const treinamentosContainer = document.getElementById('pgr-treinamentos-container');
  const exerciciosContainer = document.getElementById('pgr-exercicios-container');

  // Os selects de perigo e de treinamento mostram o nome dos GHEs cadastrados,
  // então precisam ser redesenhados sempre que a lista de GHEs mudar.
  function refrescarDependentesDeGHE() {
    renderPerigosPGR(perigosContainer, p);
    renderTreinamentosPGR(treinamentosContainer, p);
  }

  renderGHEsPGR(ghesContainer, p, refrescarDependentesDeGHE);
  renderPerigosPGR(perigosContainer, p);
  renderTreinamentosPGR(treinamentosContainer, p);
  renderExerciciosSimuladosPGR(exerciciosContainer, p);

  document.getElementById('btn-add-ghe-pgr').addEventListener('click', async () => {
    p.data.ghes.push(novoGHEPGR());
    await salvarPGR(p);
    renderGHEsPGR(ghesContainer, p, refrescarDependentesDeGHE);
  });

  document.getElementById('btn-add-perigo-pgr').addEventListener('click', async () => {
    p.data.perigos.push(novoPerigoPGR());
    await salvarPGR(p);
    renderPerigosPGR(perigosContainer, p);
  });

  ligarSecaoPsicossocialPGR(p, () => salvarPGR(p), async (mensagem) => {
    await renderPGRDetail(id);
    const msg = document.getElementById('psico-arquivo-msg');
    if (msg) msg.textContent = mensagem;
    const secao = document.getElementById('secao-psicossocial');
    if (secao) secao.scrollIntoView({ block: 'start' });
  });

  document.getElementById('btn-add-treinamento-pgr').addEventListener('click', async () => {
    p.data.treinamentos.push(novoTreinamentoPGR());
    await salvarPGR(p);
    renderTreinamentosPGR(treinamentosContainer, p);
  });

  document.getElementById('btn-add-exercicio-pgr').addEventListener('click', async () => {
    p.data.exerciciosSimulados.push(novoExercicioSimuladoPGR());
    await salvarPGR(p);
    renderExerciciosSimuladosPGR(exerciciosContainer, p);
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
    if (!confirm('Excluir este PGR do dispositivo e todas as suas fotos? Esta ação não pode ser desfeita.')) return;
    const photos = await DB.getPhotosByInspection(id);
    for (const photo of photos) await DB.deletePhoto(photo.id);
    await DB.deletePGR(id);
    renderPGRHome();
    updateSyncBar();
  });
}

function renderPerigoPGR(item, idx, ghes) {
  const antes = classificarRiscoPGR(item.severidade, item.probabilidade);
  const depois = classificarRiscoPGR(item.severidadeResidual, item.probabilidadeResidual);
  return `
    <div class="leitura-card" data-idx="${idx}">
      <div class="participante-linha">
        <label class="campo-leitura">GHE (Grupo Homogêneo de Exposição)
          <select class="in-ghe-perigo">${opcoesGHEPGR(ghes, item.gheId)}</select>
        </label>
        <button type="button" class="btn-remover-item btn-remover-perigo" title="Remover perigo">✕</button>
      </div>
      <label>Perigo / Risco identificado *
        <input type="text" class="in-perigo" placeholder="Ex.: Queda de altura ao subir em telhado sem proteção coletiva" value="${escapeHtml(item.perigo)}">
      </label>
      <label>Possível lesão ou agravo à saúde *
        <input type="text" class="in-lesao-agravo" placeholder="Ex.: Fratura, politraumatismo, óbito" value="${escapeHtml(item.lesaoAgravo)}">
      </label>
      <div class="participante-linha">
        <label class="campo-leitura">Fonte / Causa
          <input type="text" class="in-fonte" value="${escapeHtml(item.fonte)}">
        </label>
        <label class="campo-leitura">Tipo de risco
          <select class="in-tipo-risco">${TIPOS_RISCO_PGR.map((t) => `<option ${item.tipoRisco === t ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('')}</select>
        </label>
      </div>
      <div class="participante-linha">
        <label class="campo-leitura">Tipo de exposição
          <select class="in-tipo-exposicao">
            <option value="">Selecione…</option>
            ${TIPOS_EXPOSICAO_PGR.map((t) => `<option ${item.tipoExposicao === t ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('')}
          </select>
        </label>
        <label class="campo-leitura">Tempo / frequência de exposição
          <input type="text" class="in-tempo-exposicao" placeholder="Ex.: 8h/dia" value="${escapeHtml(item.tempoExposicao)}">
        </label>
      </div>

      <label>Referência / limite de exposição
        <input type="text" class="in-referencia" placeholder="Ex.: NR-15, Anexo 1 — 85 dB(A); nível de ação 80 dB(A)" value="${escapeHtml(item.referencia || '')}">
      </label>
      <div class="participante-linha">
        <label class="campo-leitura">Tipo de avaliação
          <select class="in-tipo-avaliacao">${TIPOS_AVALIACAO_PGR.map((t) => `<option ${item.tipoAvaliacao === t ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('')}</select>
        </label>
        <label class="campo-leitura">Resultado da avaliação / medição
          <input type="text" class="in-resultado-avaliacao" placeholder="Ex.: NE = 82 dB(A)" value="${escapeHtml(item.resultadoAvaliacao || '')}">
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
      <h4>Plano de ação</h4>
      <label class="campo-leitura">Tipo de medida (NR-01)
        <select class="in-tipo-medida">${TIPOS_MEDIDA_PGR.map((t) => `<option ${item.tipoMedida === t ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('')}</select>
      </label>
      <label>Medidas de prevenção propostas
        <textarea class="in-medidas-propostas" rows="2">${escapeHtml(item.medidasPropostas)}</textarea>
      </label>
      <label>Forma de acompanhamento e aferição dos resultados
        <textarea class="in-acompanhamento" rows="2" placeholder="Ex.: Nova dosimetria após as medidas; inspeção mensal.">${escapeHtml(item.acompanhamento || '')}</textarea>
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
  const ghes = p.data.ghes;
  container.innerHTML = perigos.length
    ? perigos.map((item, idx) => renderPerigoPGR(item, idx, ghes)).join('')
    : '<p class="empty-state">Nenhum perigo cadastrado ainda.</p>';

  perigos.forEach((item, idx) => {
    const card = container.querySelector(`.leitura-card[data-idx="${idx}"]`);
    if (!card) return;

    card.querySelector('.in-ghe-perigo').addEventListener('change', async (e) => {
      item.gheId = e.target.value;
      await salvarPGR(p);
    });

    const camposTexto = [
      ['.in-perigo', 'perigo'], ['.in-lesao-agravo', 'lesaoAgravo'], ['.in-fonte', 'fonte'],
      ['.in-tempo-exposicao', 'tempoExposicao'],
      ['.in-medidas-existentes', 'medidasExistentes'], ['.in-medidas-propostas', 'medidasPropostas'],
      ['.in-responsavel-perigo', 'responsavel'], ['.in-referencia', 'referencia'],
      ['.in-resultado-avaliacao', 'resultadoAvaliacao'], ['.in-acompanhamento', 'acompanhamento']
    ];
    camposTexto.forEach(([seletor, campo]) => {
      const el = card.querySelector(seletor);
      if (!el) return;
      el.addEventListener('blur', async () => {
        item[campo] = el.value.trim ? el.value.trim() : el.value;
        await salvarPGR(p);
      });
    });

    card.querySelector('.in-tipo-exposicao').addEventListener('change', async (e) => {
      item.tipoExposicao = e.target.value;
      await salvarPGR(p);
    });

    card.querySelector('.in-tipo-risco').addEventListener('change', async (e) => {
      item.tipoRisco = e.target.value;
      await salvarPGR(p);
    });
    card.querySelector('.in-tipo-avaliacao').addEventListener('change', async (e) => {
      item.tipoAvaliacao = e.target.value;
      await salvarPGR(p);
    });
    card.querySelector('.in-tipo-medida').addEventListener('change', async (e) => {
      item.tipoMedida = e.target.value;
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

/* ---------------- CONTROLE DE REVISÕES ---------------- */

function renderRevisoesPGR(container, p) {
  const revisoes = p.data.revisoes;
  container.innerHTML = revisoes.length
    ? revisoes.map((r, idx) => `
      <div class="leitura-card" data-idx="${idx}">
        <div class="participante-linha">
          <label class="campo-leitura">Revisão
            <input type="text" class="in-rev-numero" value="${escapeHtml(r.revisao)}">
          </label>
          <label class="campo-leitura">Data
            <input type="date" class="in-rev-data" value="${escapeHtml(r.data)}">
          </label>
          <button type="button" class="btn-remover-item btn-remover-revisao" title="Remover revisão">✕</button>
        </div>
        <label>Motivo da revisão
          <textarea class="in-rev-motivo" rows="2">${escapeHtml(r.motivo)}</textarea>
        </label>
      </div>
    `).join('')
    : '<p class="empty-state">Nenhuma revisão registrada.</p>';
  revisoes.forEach((r, idx) => {
    const card = container.querySelector(`.leitura-card[data-idx="${idx}"]`);
    if (!card) return;
    card.querySelector('.in-rev-numero').addEventListener('blur', async (e) => { r.revisao = e.target.value.trim(); await salvarPGR(p); });
    card.querySelector('.in-rev-data').addEventListener('change', async (e) => { r.data = e.target.value; await salvarPGR(p); });
    card.querySelector('.in-rev-motivo').addEventListener('blur', async (e) => { r.motivo = e.target.value.trim(); await salvarPGR(p); });
    card.querySelector('.btn-remover-revisao').addEventListener('click', async () => {
      if (!confirm('Remover este registro de revisão?')) return;
      revisoes.splice(idx, 1);
      await salvarPGR(p);
      renderRevisoesPGR(container, p);
    });
  });
}

/* ---------------- GHE (GRUPOS HOMOGÊNEOS DE EXPOSIÇÃO) ---------------- */

function renderGHEPGR(item, idx) {
  return `
    <div class="leitura-card" data-idx="${idx}">
      <div class="participante-linha">
        <label class="campo-leitura">Nome do GHE *
          <input type="text" class="in-ghe-nome" placeholder="Ex.: Pedreiros — Obra Central" value="${escapeHtml(item.nome)}">
        </label>
        <button type="button" class="btn-remover-item btn-remover-ghe" title="Remover GHE">✕</button>
      </div>
      <div class="participante-linha">
        <label class="campo-leitura">Setor
          <input type="text" class="in-ghe-setor" value="${escapeHtml(item.setor)}">
        </label>
        <label class="campo-leitura">Função
          <input type="text" class="in-ghe-funcao" value="${escapeHtml(item.funcao)}">
        </label>
        <label class="campo-leitura">Nº de trabalhadores
          <input type="number" class="in-ghe-num-trabalhadores" min="1" value="${escapeHtml(item.numTrabalhadores)}">
        </label>
      </div>
      <label>Descrição das atividades
        <textarea class="in-ghe-atividades" rows="2" placeholder="Atividades executadas pelo grupo (caracterização exigida no inventário de riscos).">${escapeHtml(item.descricaoAtividades || '')}</textarea>
      </label>
    </div>
  `;
}

function renderGHEsPGR(container, p, aoMudar) {
  const ghes = p.data.ghes;
  container.innerHTML = ghes.length
    ? ghes.map((item, idx) => renderGHEPGR(item, idx)).join('')
    : '<p class="empty-state">Nenhum GHE cadastrado ainda.</p>';

  ghes.forEach((item, idx) => {
    const card = container.querySelector(`.leitura-card[data-idx="${idx}"]`);
    if (!card) return;

    const camposTexto = [
      ['.in-ghe-nome', 'nome'], ['.in-ghe-setor', 'setor'], ['.in-ghe-funcao', 'funcao']
    ];
    camposTexto.forEach(([seletor, campo]) => {
      const el = card.querySelector(seletor);
      el.addEventListener('blur', async () => {
        item[campo] = el.value.trim();
        await salvarPGR(p);
        aoMudar();
      });
    });
    card.querySelector('.in-ghe-num-trabalhadores').addEventListener('blur', async (e) => {
      item.numTrabalhadores = e.target.value;
      await salvarPGR(p);
    });
    card.querySelector('.in-ghe-atividades').addEventListener('blur', async (e) => {
      item.descricaoAtividades = e.target.value.trim();
      await salvarPGR(p);
    });

    card.querySelector('.btn-remover-ghe').addEventListener('click', async () => {
      if (!confirm('Remover este GHE? Perigos e treinamentos vinculados a ele ficarão sem GHE.')) return;
      p.data.ghes.splice(idx, 1);
      p.data.perigos.forEach((h) => { if (h.gheId === item.id) h.gheId = ''; });
      p.data.treinamentos.forEach((t) => { if (t.gheId === item.id) t.gheId = ''; });
      await salvarPGR(p);
      renderGHEsPGR(container, p, aoMudar);
      aoMudar();
    });
  });
}

/* ---------------- CRONOGRAMA DE TREINAMENTO ---------------- */

function renderTreinamentoPGR(item, idx, ghes) {
  return `
    <div class="leitura-card" data-idx="${idx}">
      <div class="participante-linha">
        <label class="campo-leitura">Treinamento / Norma *
          <input type="text" class="in-treinamento-nome" placeholder="Ex.: NR-35 — Trabalho em Altura" value="${escapeHtml(item.nome)}">
        </label>
        <button type="button" class="btn-remover-item btn-remover-treinamento" title="Remover treinamento">✕</button>
      </div>
      <label class="campo-leitura">Público-alvo (GHE)
        <select class="in-treinamento-ghe">${opcoesGHEPGR(ghes, item.gheId)}</select>
      </label>
      <div class="participante-linha">
        <label class="campo-leitura">Carga horária (h)
          <input type="number" class="in-treinamento-carga" min="1" value="${escapeHtml(item.cargaHoraria)}">
        </label>
        <label class="campo-leitura">Periodicidade
          <select class="in-treinamento-periodicidade">${PERIODICIDADES_TREINAMENTO_PGR.map((per) => `<option ${item.periodicidade === per ? 'selected' : ''}>${escapeHtml(per)}</option>`).join('')}</select>
        </label>
      </div>
      <div class="participante-linha">
        <label class="campo-leitura">Responsável
          <input type="text" class="in-treinamento-responsavel" value="${escapeHtml(item.responsavel)}">
        </label>
        <label class="campo-leitura">Data prevista
          <input type="date" class="in-treinamento-data" value="${escapeHtml(item.dataPrevista)}">
        </label>
        <label class="campo-leitura">Status
          <select class="in-treinamento-status">
            <option ${item.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
            <option ${item.status === 'Em andamento' ? 'selected' : ''}>Em andamento</option>
            <option ${item.status === 'Concluída' ? 'selected' : ''}>Concluída</option>
          </select>
        </label>
      </div>
    </div>
  `;
}

function renderTreinamentosPGR(container, p) {
  const treinamentos = p.data.treinamentos;
  const ghes = p.data.ghes;
  container.innerHTML = treinamentos.length
    ? treinamentos.map((item, idx) => renderTreinamentoPGR(item, idx, ghes)).join('')
    : '<p class="empty-state">Nenhum treinamento cadastrado ainda.</p>';

  treinamentos.forEach((item, idx) => {
    const card = container.querySelector(`.leitura-card[data-idx="${idx}"]`);
    if (!card) return;

    card.querySelector('.in-treinamento-nome').addEventListener('blur', async (e) => {
      item.nome = e.target.value.trim();
      await salvarPGR(p);
    });
    card.querySelector('.in-treinamento-ghe').addEventListener('change', async (e) => {
      item.gheId = e.target.value;
      await salvarPGR(p);
    });
    card.querySelector('.in-treinamento-carga').addEventListener('blur', async (e) => {
      item.cargaHoraria = e.target.value;
      await salvarPGR(p);
    });
    card.querySelector('.in-treinamento-periodicidade').addEventListener('change', async (e) => {
      item.periodicidade = e.target.value;
      await salvarPGR(p);
    });
    card.querySelector('.in-treinamento-responsavel').addEventListener('blur', async (e) => {
      item.responsavel = e.target.value.trim();
      await salvarPGR(p);
    });
    card.querySelector('.in-treinamento-data').addEventListener('change', async (e) => {
      item.dataPrevista = e.target.value;
      await salvarPGR(p);
    });
    card.querySelector('.in-treinamento-status').addEventListener('change', async (e) => {
      item.status = e.target.value;
      await salvarPGR(p);
    });

    card.querySelector('.btn-remover-treinamento').addEventListener('click', async () => {
      if (!confirm('Remover este treinamento do cronograma?')) return;
      p.data.treinamentos.splice(idx, 1);
      await salvarPGR(p);
      renderTreinamentosPGR(container, p);
    });
  });
}

/* ---------------- PREPARAÇÃO E RESPOSTA A EMERGÊNCIAS ---------------- */

function renderExercicioSimuladoPGR(item, idx) {
  return `
    <div class="leitura-card" data-idx="${idx}">
      <div class="participante-linha">
        <label class="campo-leitura">Data do exercício
          <input type="date" class="in-exercicio-data" value="${escapeHtml(item.data)}">
        </label>
        <button type="button" class="btn-remover-item btn-remover-exercicio" title="Remover exercício">✕</button>
      </div>
      <label>Descrição do exercício
        <textarea class="in-exercicio-descricao" rows="2" placeholder="Ex.: Simulado de abandono de área em caso de incêndio no canteiro de obras.">${escapeHtml(item.descricao)}</textarea>
      </label>
      <label>Participantes
        <input type="text" class="in-exercicio-participantes" value="${escapeHtml(item.participantes)}">
      </label>
      <label>Evidência (registro fotográfico)</label>
      <div class="foto-botoes">
        <label class="file-label">📷 Tirar foto
          <input type="file" accept="image/*" capture="environment" class="input-foto-camera">
        </label>
        <label class="file-label">🖼️ Da galeria
          <input type="file" accept="image/*" multiple class="input-foto-galeria">
        </label>
      </div>
      <div class="thumbs"></div>
    </div>
  `;
}

function renderExerciciosSimuladosPGR(container, p) {
  const exercicios = p.data.exerciciosSimulados;
  container.innerHTML = exercicios.length
    ? exercicios.map((item, idx) => renderExercicioSimuladoPGR(item, idx)).join('')
    : '<p class="empty-state">Nenhum exercício simulado registrado ainda.</p>';

  exercicios.forEach((item, idx) => {
    const card = container.querySelector(`.leitura-card[data-idx="${idx}"]`);
    if (!card) return;

    card.querySelector('.in-exercicio-data').addEventListener('change', async (e) => {
      item.data = e.target.value;
      await salvarPGR(p);
    });
    card.querySelector('.in-exercicio-descricao').addEventListener('blur', async (e) => {
      item.descricao = e.target.value.trim();
      await salvarPGR(p);
    });
    card.querySelector('.in-exercicio-participantes').addEventListener('blur', async (e) => {
      item.participantes = e.target.value.trim();
      await salvarPGR(p);
    });

    card.querySelectorAll('.input-foto-camera, .input-foto-galeria').forEach((fileInput) => {
      fileInput.addEventListener('change', async (e) => {
        await adicionarFotos(p, item.fotosIds, e.target.files, `exercicio:${item.id}`);
        await salvarPGR(p);
        renderExerciciosSimuladosPGR(container, p);
      });
    });

    renderThumbnails(card.querySelector('.thumbs'), item.fotosIds).then(() => {
      card.querySelectorAll('.btn-remover-foto').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const photoId = btn.dataset.photoId;
          await DB.deletePhoto(photoId);
          item.fotosIds = item.fotosIds.filter((id) => id !== photoId);
          await salvarPGR(p);
          renderExerciciosSimuladosPGR(container, p);
        });
      });
    });

    card.querySelector('.btn-remover-exercicio').addEventListener('click', async () => {
      if (!confirm('Remover o registro deste exercício simulado?')) return;
      p.data.exerciciosSimulados.splice(idx, 1);
      await salvarPGR(p);
      renderExerciciosSimuladosPGR(container, p);
    });
  });
}

/* ---------------- VALIDAÇÃO PARA O RELATÓRIO ---------------- */

function validarPGRParaRelatorio(p) {
  const problemas = [];
  if (!p.data.empresa) {
    problemas.push('O nome da empresa não foi informado.');
  }
  if (!p.data.responsavelPGR) {
    problemas.push('O responsável técnico pelo PGR não foi informado (a NR-01 exige documento datado e assinado).');
  }
  if (!p.data.perigos.length) {
    problemas.push('Nenhum perigo foi cadastrado.');
  }
  p.data.perigos.forEach((item, idx) => {
    const num = idx + 1;
    if (!item.perigo) problemas.push(`Perigo ${num} está sem descrição.`);
    if (!item.lesaoAgravo) problemas.push(`Perigo ${num} ("${item.perigo || 'sem descrição'}") está sem a possível lesão ou agravo à saúde (exigido pela NR-01).`);
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

const CORES_NIVEL_PGR = { 'Baixo': '#C6EFCE', 'Moderado': '#FFEB9C', 'Alto': '#F8CBAD', 'Crítico': '#FF8B8B' };

function celulaNivelPGR(c) {
  if (!c.valor) return '<td>—</td>';
  return `<td style="background:${CORES_NIVEL_PGR[c.nivel]};font-weight:700">${c.nivel} (${c.valor})</td>`;
}

function montarIdentificacaoPGR(p) {
  const d = p.data;
  return `
    <table class="rep-tabela-ident">
      <tr><th>Empresa</th><td>${escapeHtml(d.empresa)}</td><th>CNPJ</th><td>${escapeHtml(d.cnpj || '—')}</td></tr>
      <tr><th>CNAE / atividade</th><td>${escapeHtml([d.cnae, d.atividadePrincipal].filter(Boolean).join(' — ') || '—')}</td><th>Grau de risco</th><td>${escapeHtml(d.grauRisco || '—')}</td></tr>
      <tr><th>Unidade</th><td>${escapeHtml(d.unidade || '—')}</td><th>Endereço</th><td>${escapeHtml(d.endereco || '—')}</td></tr>
      <tr><th>Regime de trabalho</th><td colspan="3">${escapeHtml(d.regimeTrabalho || '—')}</td></tr>
      <tr><th>Responsável técnico</th><td>${escapeHtml(d.responsavelPGR || '—')}</td><th>Data de elaboração / revisão</th><td>${d.dataElaboracao ? formatarDataBR(d.dataElaboracao) : '—'}</td></tr>
      <tr><th>Próxima revisão prevista</th><td colspan="3">${d.proximaRevisao ? formatarDataBR(d.proximaRevisao) : '—'}</td></tr>
    </table>
  `;
}

function montarRevisoesPGR(revisoes) {
  if (!revisoes || !revisoes.length) return '<p class="rep-hint">Nenhuma revisão registrada.</p>';
  return `
    <table class="rep-table">
      <thead><tr><th>Revisão</th><th>Motivo</th><th>Data</th></tr></thead>
      <tbody>${revisoes.map((r) => `<tr><td>${escapeHtml(r.revisao)}</td><td>${escapeHtml(r.motivo || '—')}</td><td>${r.data ? formatarDataBR(r.data) : '—'}</td></tr>`).join('')}</tbody>
    </table>
  `;
}

/* Critérios de avaliação e tomada de decisão (NR-01): escalas, matriz e ações. */
function montarCriteriosPGR() {
  const escala = (titulo, niveis) => `
    <table class="rep-table">
      <thead><tr><th>${titulo}</th><th>Grau</th><th>Descrição</th></tr></thead>
      <tbody>${niveis.map((n) => `<tr><td>${n.valor}</td><td>${escapeHtml(n.label)}</td><td>${escapeHtml(n.descricao)}</td></tr>`).join('')}</tbody>
    </table>`;
  let matriz = '<table class="rep-table rep-matriz-pgr"><thead><tr><th>Severidade \\ Probabilidade</th>' +
    NIVEIS_PROBABILIDADE_PGR.map((n) => `<th>${n.valor} — ${escapeHtml(n.label)}</th>`).join('') + '</tr></thead><tbody>';
  for (let sv = 5; sv >= 1; sv--) {
    matriz += `<tr><th>${sv} — ${escapeHtml(NIVEIS_SEVERIDADE_PGR[sv - 1].label)}</th>` +
      [1, 2, 3, 4, 5].map((pr) => {
        const c = classificarRiscoPGR(sv, pr);
        return `<td style="background:${CORES_NIVEL_PGR[c.nivel]};text-align:center">${c.valor}<br>${c.nivel}</td>`;
      }).join('') + '</tr>';
  }
  matriz += '</tbody></table>';
  return `
    <p>Nível de risco = Severidade (S) × Probabilidade (P), de 1 a 25. A severidade considera a magnitude da consequência e o número de trabalhadores possivelmente afetados; a probabilidade considera a eficácia das medidas existentes e, quando houver, a comparação da exposição com o nível de ação e o limite.</p>
    ${escala('S', NIVEIS_SEVERIDADE_PGR)}
    ${escala('P', NIVEIS_PROBABILIDADE_PGR)}
    ${matriz}
    <table class="rep-table">
      <thead><tr><th>Nível</th><th>Faixa</th><th>Ação requerida</th><th>Prazo máximo</th></tr></thead>
      <tbody>${CRITERIOS_DECISAO_PGR.map((c) => `<tr><td style="background:${CORES_NIVEL_PGR[c.nivel]};font-weight:700">${c.nivel}</td><td>${c.faixa}</td><td>${escapeHtml(c.acao)}</td><td>${escapeHtml(c.prazo)}</td></tr>`).join('')}</tbody>
    </table>
    <p class="rep-hint">Hierarquia das medidas de prevenção (NR-01): eliminação do fator de risco; proteção coletiva; medidas administrativas ou de organização do trabalho; EPI.</p>
    <p class="rep-hint">Os riscos psicossociais seguem critérios próprios (escalas de severidade e probabilidade e faixas de classificação), documentados na seção 7.</p>
  `;
}

function montarGHEsRelatorioPGR(ghes) {
  if (!ghes.length) return '<p class="rep-hint">Nenhum GHE cadastrado.</p>';
  return `
    <table class="rep-table">
      <thead><tr><th>GHE</th><th>Setor / função</th><th>Descrição das atividades</th><th>Nº trab.</th></tr></thead>
      <tbody>${ghes.map((g) => `<tr><td>${escapeHtml(g.nome || '—')}</td><td>${escapeHtml([g.setor, g.funcao].filter(Boolean).join(' / ') || '—')}</td><td>${escapeHtml(g.descricaoAtividades || '—')}</td><td>${escapeHtml(g.numTrabalhadores || '—')}</td></tr>`).join('')}</tbody>
    </table>
  `;
}

/* Inventário de riscos agrupado por GHE, com os dados exigidos pela NR-01. */
function montarInventarioRiscosPGR(perigos, ghes) {
  if (!perigos.length) return '<p class="rep-hint">Nenhum perigo cadastrado.</p>';
  const grupos = ghes.map((g) => ({ titulo: g.nome || 'GHE sem nome', ghe: g, itens: [] }));
  const semGHE = { titulo: 'Perigos sem GHE vinculado', itens: [] };
  perigos.forEach((item, idx) => {
    const g = grupos.find((x) => x.ghe.id === item.gheId);
    (g || semGHE).itens.push({ item, numero: idx + 1 });
  });
  return grupos.concat([semGHE]).filter((g) => g.itens.length).map((g) => `
    <h4>${escapeHtml(g.titulo)}${g.ghe && g.ghe.numTrabalhadores ? ` — ${escapeHtml(g.ghe.numTrabalhadores)} trabalhador(es)` : ''}</h4>
    <table class="rep-table rep-inventario-pgr">
      <thead><tr><th>Nº</th><th>Tipo</th><th>Perigo / fator de risco</th><th>Fonte ou circunstância</th><th>Lesão ou agravo</th><th>Exposição</th><th>Referência e avaliação</th><th>Medidas existentes</th><th>Risco inicial</th><th>Risco residual</th></tr></thead>
      <tbody>${g.itens.map(({ item, numero }) => {
        const exposicao = [item.tipoExposicao, item.tempoExposicao].filter(Boolean).join(' — ');
        const avaliacao = [item.referencia ? 'Ref.: ' + item.referencia : '', item.tipoAvaliacao ? item.tipoAvaliacao + (item.resultadoAvaliacao ? ': ' + item.resultadoAvaliacao : '') : item.resultadoAvaliacao].filter(Boolean).join(' | ');
        return `<tr>
          <td>${numero}</td>
          <td>${escapeHtml(item.tipoRisco)}</td>
          <td>${escapeHtml(item.perigo)}</td>
          <td>${escapeHtml(item.fonte || '—')}</td>
          <td>${escapeHtml(item.lesaoAgravo || '—')}</td>
          <td>${escapeHtml(exposicao || '—')}</td>
          <td>${escapeHtml(avaliacao || '—')}</td>
          <td>${escapeHtml(item.medidasExistentes || '—')}</td>
          ${celulaNivelPGR(classificarRiscoPGR(item.severidade, item.probabilidade))}
          ${celulaNivelPGR(classificarRiscoPGR(item.severidadeResidual, item.probabilidadeResidual))}
        </tr>`;
      }).join('')}</tbody>
    </table>
  `).join('');
}

function montarCronogramaTreinamentoPGR(treinamentos, ghes) {
  if (!treinamentos.length) return '<p class="rep-hint">Nenhum treinamento cadastrado.</p>';
  const linhas = treinamentos.map((item, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${escapeHtml(item.nome || '—')}</td>
      <td>${escapeHtml(nomeGHEPGR(ghes, item.gheId) || 'Todos os GHEs')}</td>
      <td>${item.cargaHoraria ? item.cargaHoraria + 'h' : '—'}</td>
      <td>${escapeHtml(item.periodicidade || '—')}</td>
      <td>${escapeHtml(item.responsavel || '—')}</td>
      <td>${item.dataPrevista ? formatarDataBR(item.dataPrevista) : '—'}</td>
      <td>${escapeHtml(item.status || '—')}</td>
    </tr>
  `).join('');
  return `
    <table class="rep-table">
      <thead><tr><th>Nº</th><th>Treinamento / Norma</th><th>Público-alvo</th><th>Carga horária</th><th>Periodicidade</th><th>Responsável</th><th>Data prevista</th><th>Status</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
  `;
}

function montarPlanoAcaoPGR(perigos, ghes) {
  const comAcao = perigos
    .map((item, idx) => ({ item, numero: idx + 1 }))
    .filter(({ item }) => item.medidasPropostas || item.responsavel || item.prazo);
  if (!comAcao.length) return '<p class="rep-hint">Nenhuma medida de prevenção registrada.</p>';
  const linhas = comAcao.map(({ item, numero }) => `
    <tr>
      <td>${numero}</td>
      <td>${escapeHtml(item.medidasPropostas || '—')}<br><span class="rep-hint">${escapeHtml(item.perigo)} — ${escapeHtml(nomeGHEPGR(ghes, item.gheId) || 'sem GHE')}</span></td>
      <td>${escapeHtml(item.tipoMedida || '—')}</td>
      <td>${escapeHtml(item.responsavel || '—')}</td>
      <td>${item.prazo ? formatarDataBR(item.prazo) : '—'}</td>
      <td>${escapeHtml(item.acompanhamento || '—')}</td>
      <td>${escapeHtml(item.status || '—')}</td>
    </tr>
  `).join('');
  return `
    <table class="rep-table">
      <thead><tr><th>Nº</th><th>Medida de prevenção</th><th>Tipo</th><th>Responsável</th><th>Prazo</th><th>Acompanhamento e aferição</th><th>Status</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
    <p class="rep-hint">O número da medida corresponde ao número do perigo no inventário de riscos. Concluída a medida, reavalie o risco residual e atualize o inventário.</p>
  `;
}

async function montarExerciciosSimuladosPGR(exercicios) {
  if (!exercicios.length) return '<p class="rep-hint">Nenhum exercício simulado registrado.</p>';
  const blocos = await Promise.all(exercicios.map(async (item, idx) => {
    const fotosHtml = (await Promise.all((item.fotosIds || []).map(montarBlocoFoto))).join('');
    return `
      <div class="rep-foto-bloco">
        <div class="rep-foto-header">
          <strong>Exercício ${idx + 1}</strong> — ${item.data ? formatarDataBR(item.data) : 'data não informada'}
        </div>
        <p>${escapeHtml(item.descricao || '—')}</p>
        ${item.participantes ? `<p><strong>Participantes:</strong> ${escapeHtml(item.participantes)}</p>` : ''}
        ${fotosHtml ? `<div class="rep-fotos-grid">${fotosHtml}</div>` : '<p class="rep-hint">Sem evidência fotográfica anexada.</p>'}
      </div>
    `;
  }));
  return blocos.join('');
}

async function montarPreparacaoEmergenciaPGR(p) {
  const emergencia = p.data.emergencia || {};
  const exerciciosHtml = await montarExerciciosSimuladosPGR(p.data.exerciciosSimulados || []);
  return `
    <table class="rep-tabela-ident">
      <tr><th>Primeiros socorros / encaminhamento de acidentados</th><td colspan="3">${escapeHtml(emergencia.meiosPrimeirosSocorros || '—')}</td></tr>
      <tr><th>Procedimento de abandono de área</th><td colspan="3">${escapeHtml(emergencia.procedimentoAbandono || '—')}</td></tr>
      <tr><th>Medidas para emergências de grande magnitude</th><td colspan="3">${escapeHtml(emergencia.medidasGrandeMagnitude || '—')}</td></tr>
      <tr><th>Periodicidade dos exercícios simulados</th><td colspan="3">${escapeHtml(emergencia.periodicidadeExercicios || '—')}</td></tr>
    </table>
    <h4>Exercícios simulados realizados</h4>
    ${exerciciosHtml}
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
  p.data.ghes = p.data.ghes || [];
  p.data.treinamentos = p.data.treinamentos || [];
  p.data.exerciciosSimulados = p.data.exerciciosSimulados || [];
  p.data.emergencia = p.data.emergencia || {};
  p.data.revisoes = p.data.revisoes || [];

  const codigo = gerarCodigoPGR(p);
  const geradoEm = new Date().toLocaleString('pt-BR');
  const inventarioHtml = montarInventarioRiscosPGR(p.data.perigos, p.data.ghes);
  const planoAcaoHtml = montarPlanoAcaoPGR(p.data.perigos, p.data.ghes);
  const cronogramaHtml = montarCronogramaTreinamentoPGR(p.data.treinamentos, p.data.ghes);
  const emergenciaHtml = await montarPreparacaoEmergenciaPGR(p);

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
          ${htmlLogoRelatorio()}
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
        <h3>1. Identificação da organização</h3>
        ${montarIdentificacaoPGR(p)}
        <p class="rep-hint">PGR elaborado conforme o capítulo 1.5 da NR-01 (Gerenciamento de Riscos Ocupacionais), incluindo os fatores de risco psicossociais relacionados ao trabalho (Portaria MTE nº 1.419/2024). Composto, no mínimo, pelo inventário de riscos (item 6) e pelo plano de ação (item 7).</p>
      </section>

      <section class="rep-secao">
        <h3>2. Controle de revisões</h3>
        ${montarRevisoesPGR(p.data.revisoes)}
      </section>

      <section class="rep-secao rep-quebra">
        <h3>3. Critérios de avaliação e tomada de decisão</h3>
        ${montarCriteriosPGR()}
      </section>

      <section class="rep-secao rep-quebra">
        <h3>4. Caracterização dos processos, ambientes e atividades</h3>
        <p>${escapeHtml(p.data.caracterizacaoAmbiente || '—')}</p>
        ${montarGHEsRelatorioPGR(p.data.ghes)}
        <p><strong>Consulta aos trabalhadores e à CIPA:</strong> ${escapeHtml(p.data.consultaTrabalhadores || '—')}</p>
        ${p.data.requisitosEspecificos ? `<h4>Requisitos específicos da NR setorial</h4><p style="white-space:pre-line">${escapeHtml(p.data.requisitosEspecificos)}</p>` : ''}
      </section>

      <section class="rep-secao">
        <h3>5. Resumo dos riscos mapeados</h3>
        ${montarResumoRiscosPGR(p.data.perigos)}
      </section>

      <section class="rep-secao rep-quebra rep-paisagem">
        <h3>6. Inventário de riscos</h3>
        ${inventarioHtml}
      </section>

      <section class="rep-secao rep-quebra rep-paisagem">
        <h3>7. Avaliação de riscos psicossociais</h3>
        ${htmlRelatorioPsicoPGR(p)}
      </section>

      <section class="rep-secao rep-quebra rep-paisagem">
        <h3>8. Plano de ação</h3>
        ${planoAcaoHtml}
      </section>

      <section class="rep-secao rep-quebra">
        <h3>9. Cronograma de capacitação</h3>
        ${cronogramaHtml}
      </section>

      <section class="rep-secao rep-quebra">
        <h3>10. Preparação e resposta a emergências</h3>
        ${emergenciaHtml}
      </section>

      <section class="rep-secao">
        <h3>11. Acompanhamento e revisão</h3>
        <p>O plano de ação deve ser acompanhado mensalmente. A avaliação de riscos deve ser revista a cada 2 anos (3 anos com certificação em sistema de gestão de SST) e sempre que houver mudanças nos processos, acidentes ou doenças relacionadas ao trabalho, medidas ineficazes ou solicitação dos trabalhadores ou da CIPA. O histórico das atualizações do inventário deve ser mantido por, no mínimo, 20 anos.</p>
      </section>

      <section class="rep-secao rep-assinaturas">
        <h3>12. Responsável técnico</h3>
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
