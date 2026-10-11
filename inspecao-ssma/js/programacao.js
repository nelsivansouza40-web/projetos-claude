/* Programação de inspeções recorrentes.
 * Cada programação define o que inspecionar (disciplina, checklist,
 * equipamento ou área), com que frequência e a partir de quando. A próxima
 * data é calculada pela última inspeção concluída daquela programação; o
 * app mostra o que está atrasado, o que vence nos próximos dias e permite
 * iniciar a inspeção já preenchida. */

const FREQUENCIAS_PROGRAMACAO = {
  'Diária': 1,
  'Semanal': 7,
  'Quinzenal': 15,
  'Mensal': 30,
  'Bimestral': 60,
  'Trimestral': 90,
  'Semestral': 182,
  'Anual': 365
};

function novaProgramacao() {
  return {
    id: uuid(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    titulo: '',
    disciplina: 'Segurança',
    tipoInspecao: '',
    equipamentoId: '',
    area: '',
    responsavel: '',
    frequencia: 'Mensal',
    inicio: hojeISO(),
    ativa: true
  };
}

function somarDiasProgramacao(iso, dias) {
  const [a, m, d] = iso.split('-').map(Number);
  const dt = new Date(a, m - 1, d + dias);
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

/** Última data concluída, próxima data prevista e situação (Atrasada, Vence em breve, Em dia). */
async function situacaoProgramacao(p, inspecoesCache) {
  const inspecoes = inspecoesCache || await DB.getAllInspections();
  const feitas = inspecoes.filter((i) => i.completo && i.data.programacaoId === p.id)
    .map((i) => i.data.identificacao.data).filter(Boolean).sort();
  const ultima = feitas[feitas.length - 1] || '';
  const proxima = ultima ? somarDiasProgramacao(ultima, FREQUENCIAS_PROGRAMACAO[p.frequencia] || 30) : (p.inicio || hojeISO());
  if (!p.ativa) return { ultima, proxima, chave: 'pausada', text: 'Pausada', cls: 'badge-rascunho' };
  const dias = diasAte(proxima);
  if (dias < 0) return { ultima, proxima, chave: 'atrasada', text: `Atrasada ${-dias} dia(s)`, cls: 'badge-erro' };
  if (dias <= 3) return { ultima, proxima, chave: 'embreve', text: dias === 0 ? 'Vence hoje' : `Vence em ${dias} dia(s)`, cls: 'badge-pendente' };
  return { ultima, proxima, chave: 'emdia', text: 'Em dia', cls: 'badge-ok' };
}

async function contarProgramacoesAtrasadas() {
  const [progs, inspecoes] = await Promise.all([DB.getAllItems('programacoes'), DB.getAllInspections()]);
  let atrasadas = 0;
  let embreve = 0;
  for (const p of progs) {
    const s = await situacaoProgramacao(p, inspecoes);
    if (s.chave === 'atrasada') atrasadas++;
    if (s.chave === 'embreve') embreve++;
  }
  return { atrasadas, embreve, total: progs.filter((p) => p.ativa).length };
}

/* ---------------- LISTA ---------------- */

async function renderProgramacaoHome() {
  state.screen = 'programacao-home';
  setActiveTab('inspecoes');
  const [progs, inspecoes, equipamentos] = await Promise.all([DB.getAllItems('programacoes'), DB.getAllInspections(), DB.getAllItems('equipamentos')]);
  const itens = await Promise.all(progs.map(async (p) => ({ p, s: await situacaoProgramacao(p, inspecoes) })));
  const ordem = { atrasada: 0, embreve: 1, emdia: 2, pausada: 3 };
  itens.sort((x, y) => ordem[x.s.chave] - ordem[y.s.chave] || x.s.proxima.localeCompare(y.s.proxima));
  const nomeEq = (id) => { const e = equipamentos.find((x) => x.id === id); return e ? `${e.codigo} — ${e.nome}` : ''; };

  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-home" class="btn-link">← Voltar</button>
      <h1>Programação de inspeções</h1>
    </div>
    <div class="kpi-grid kpi-grid-4">
      <div class="kpi"><span class="kpi-valor">${itens.filter((i) => i.p.ativa).length}</span><span class="kpi-rotulo">Ativas</span></div>
      <div class="kpi kpi-alerta"><span class="kpi-valor">${itens.filter((i) => i.s.chave === 'atrasada').length}</span><span class="kpi-rotulo">Atrasadas</span></div>
      <div class="kpi kpi-atencao"><span class="kpi-valor">${itens.filter((i) => i.s.chave === 'embreve').length}</span><span class="kpi-rotulo">Vencem em 3 dias</span></div>
      <div class="kpi kpi-ok"><span class="kpi-valor">${itens.filter((i) => i.s.chave === 'emdia').length}</span><span class="kpi-rotulo">Em dia</span></div>
    </div>
    <div class="form-actions acoes-envio">
      <button id="btn-nova-prog" class="btn-primary">+ Nova programação</button>
    </div>
    <ul class="insp-list">
      ${itens.length ? itens.map(({ p, s }) => `
        <li class="acao-card" data-id="${p.id}">
          <div class="acao-topo">
            ${seloDisciplina({ data: { disciplina: p.disciplina, tipoInspecao: p.tipoInspecao } })}
            <span class="badge ${s.cls}">${s.text}</span>
          </div>
          <div class="insp-card-title">${escapeHtml(p.titulo || p.tipoInspecao || 'Inspeção programada')}</div>
          <div class="insp-card-sub">${escapeHtml([p.tipoInspecao, nomeEq(p.equipamentoId), p.area].filter(Boolean).join(' · '))}</div>
          <div class="insp-card-sub">${escapeHtml(p.frequencia)} · próxima: ${formatarDataBR(s.proxima)} · última: ${s.ultima ? formatarDataBR(s.ultima) : 'nenhuma'}${p.responsavel ? ' · ' + escapeHtml(p.responsavel) : ''}</div>
          <div class="form-actions acoes-envio">
            <button type="button" class="btn-primary btn-pequeno btn-iniciar-prog">Iniciar inspeção</button>
            <button type="button" class="btn-link btn-editar-prog">Editar</button>
          </div>
        </li>`).join('') : '<li class="empty-state">Nenhuma inspeção programada. Toque em "Nova programação" para montar o cronograma (ex.: extintores todo mês, andaimes toda semana).</li>'}
    </ul>
  `;
  document.getElementById('btn-back-home').addEventListener('click', renderHome);
  document.getElementById('btn-nova-prog').addEventListener('click', () => renderProgramacaoForm(null));
  view.querySelectorAll('.acao-card[data-id]').forEach((card) => {
    const p = progs.find((x) => x.id === card.dataset.id);
    card.querySelector('.btn-editar-prog').addEventListener('click', () => renderProgramacaoForm(p.id));
    card.querySelector('.btn-iniciar-prog').addEventListener('click', () => iniciarInspecaoPreenchida({
      disciplina: p.disciplina, tipoInspecao: p.tipoInspecao, area: p.area, equipamentoId: p.equipamentoId, programacaoId: p.id
    }));
  });
}

/* ---------------- CADASTRO ---------------- */

async function renderProgramacaoForm(id, preset) {
  state.screen = 'programacao-form';
  const p = id ? await DB.getItem('programacoes', id) : Object.assign(novaProgramacao(), preset || {});
  const equipamentos = (await DB.getAllItems('equipamentos')).sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
  const modelos = await DB.getAllItems('modelosChecklist');
  const discOpts = DISCIPLINAS_INSPECAO.map((d) => `<option value="${escapeHtml(d.id)}" ${p.disciplina === d.id ? 'selected' : ''}>${escapeHtml(d.rotulo)}</option>`).join('');
  const tiposOpts = (disc) => opcoesTiposComModelos(disc, p.tipoInspecao, modelos);

  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-prog" class="btn-link">← Voltar</button>
      <h1>${id ? 'Editar programação' : 'Nova programação'}</h1>
    </div>
    <form id="form-prog" class="form-section">
      <label>Título
        <input type="text" name="titulo" placeholder="Ex.: Extintores do almoxarifado" value="${escapeHtml(p.titulo)}">
      </label>
      <label>Disciplina *
        <select name="disciplina">${discOpts}</select>
      </label>
      <label>Checklist *
        <select name="tipoInspecao" required>${tiposOpts(p.disciplina)}</select>
      </label>
      <label>Equipamento (opcional)
        <select name="equipamentoId">
          <option value="">Nenhum (área ou atividade)</option>
          ${equipamentos.map((e) => `<option value="${e.id}" ${p.equipamentoId === e.id ? 'selected' : ''}>${escapeHtml(e.codigo)} — ${escapeHtml(e.nome)}</option>`).join('')}
        </select>
      </label>
      <label>Área / local
        <input type="text" name="area" value="${escapeHtml(p.area)}">
      </label>
      <label>Responsável pela inspeção
        <input type="text" name="responsavel" value="${escapeHtml(p.responsavel)}">
      </label>
      <div class="participante-linha">
        <label class="campo-leitura">Frequência *
          <select name="frequencia">${Object.keys(FREQUENCIAS_PROGRAMACAO).map((f) => `<option ${p.frequencia === f ? 'selected' : ''}>${f}</option>`).join('')}</select>
        </label>
        <label class="campo-leitura">Primeira data *
          <input type="date" name="inicio" required value="${escapeHtml(p.inicio)}">
        </label>
      </div>
      <label class="checkbox-pill"><input type="checkbox" name="ativa" ${p.ativa ? 'checked' : ''}> Programação ativa</label>
      <div class="form-actions">
        ${id ? '<button type="button" id="btn-excluir-prog" class="btn-danger">Excluir</button>' : ''}
        <button type="submit" class="btn-primary">Salvar</button>
      </div>
    </form>
  `;
  const form = document.getElementById('form-prog');
  form.querySelector('[name="disciplina"]').addEventListener('change', (e) => {
    form.querySelector('[name="tipoInspecao"]').innerHTML = opcoesTiposComModelos(e.target.value, '', modelos);
  });
  document.getElementById('btn-back-prog').addEventListener('click', renderProgramacaoHome);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    ['titulo', 'disciplina', 'tipoInspecao', 'equipamentoId', 'area', 'responsavel', 'frequencia', 'inicio'].forEach((k) => { p[k] = (fd.get(k) || '').trim(); });
    p.ativa = fd.get('ativa') === 'on';
    p.updatedAt = Date.now();
    await DB.putItem('programacoes', p);
    renderProgramacaoHome();
  });
  const btnEx = document.getElementById('btn-excluir-prog');
  if (btnEx) btnEx.addEventListener('click', async () => {
    if (!confirm('Excluir esta programação? As inspeções já feitas continuam salvas.')) return;
    await DB.deleteItem('programacoes', p.id);
    renderProgramacaoHome();
  });
}
