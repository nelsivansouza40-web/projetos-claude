/* Painel de indicadores: números e gráficos calculados na hora, a partir dos
 * registros gravados no aparelho. Funciona sem internet. Os gráficos são
 * barras feitas em HTML/CSS, sem biblioteca externa. */

const PERIODOS_PAINEL = [
  { id: '30', rotulo: 'Últimos 30 dias' },
  { id: '90', rotulo: 'Últimos 90 dias' },
  { id: 'ano', rotulo: 'Ano atual' },
  { id: '365', rotulo: 'Últimos 12 meses' },
  { id: 'tudo', rotulo: 'Todo o período' }
];

function inicioPeriodoPainel(id) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  if (id === 'tudo') return '';
  if (id === 'ano') return `${hoje.getFullYear()}-01-01`;
  const d = new Date(hoje.getTime() - (Number(id) - 1) * 86400000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function barrasPainel(itens, opcoes = {}) {
  if (!itens.length) return '<p class="empty-state">Sem dados no período.</p>';
  const max = opcoes.max || Math.max(...itens.map((i) => i.valor), 1);
  return `<div class="painel-barras">${itens.map((i) => `
    <div class="painel-barra-linha">
      <span class="painel-barra-rotulo" title="${escapeHtml(i.rotulo)}">${escapeHtml(i.rotulo)}</span>
      <span class="painel-barra-trilho"><span class="painel-barra" style="width:${Math.max(2, (i.valor / max) * 100)}%;background:${i.cor || 'var(--azul)'}"></span></span>
      <span class="painel-barra-valor">${opcoes.sufixo ? i.valor.toFixed(0) + opcoes.sufixo : i.valor}</span>
    </div>`).join('')}</div>`;
}

function colunasMesesPainel(serie) {
  const max = Math.max(...serie.map((s) => s.valor), 1);
  return `<div class="painel-colunas">${serie.map((s) => `
    <div class="painel-coluna">
      <span class="painel-coluna-valor">${s.valor || ''}</span>
      <span class="painel-coluna-barra" style="height:${(s.valor / max) * 100}%"></span>
      <span class="painel-coluna-rotulo">${s.rotulo}</span>
    </div>`).join('')}</div>`;
}

function contarPor(lista, chaveFn) {
  const mapa = new Map();
  lista.forEach((x) => {
    const k = chaveFn(x) || 'Não informado';
    mapa.set(k, (mapa.get(k) || 0) + 1);
  });
  return [...mapa.entries()].map(([rotulo, valor]) => ({ rotulo, valor })).sort((a, b) => b.valor - a.valor);
}

async function renderPainel() {
  state.screen = 'painel';
  setActiveTab('painel');
  if (!state.filtroPainel) state.filtroPainel = { periodo: '90', empresa: '' };
  const filtro = state.filtroPainel;
  const inicio = inicioPeriodoPainel(filtro.periodo);

  const [inspecoes, ptaprs, pets, ddsList, investigacoes, relatos, acoes] = await Promise.all([
    DB.getAllInspections(), DB.getAllPTAPR(), DB.getAllPET(), DB.getAllDDS(),
    DB.getAllInvestigacoes(), DB.getAllRelatos(), coletarAcoes()
  ]);

  const empresas = [...new Set([
    ...inspecoes.map((r) => r.data.identificacao.empresa),
    ...relatos.map((r) => r.data.empresa),
    ...investigacoes.map((r) => r.data.acidente.empresa)
  ].map((e) => (e || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const daEmpresa = (emp) => !filtro.empresa || (emp || '').trim() === filtro.empresa;
  const noPeriodo = (data) => !inicio || (data || '') >= inicio;

  const insp = inspecoes.filter((r) => r.completo && daEmpresa(r.data.identificacao.empresa) && noPeriodo(r.data.identificacao.data));
  const pts = ptaprs.filter((r) => r.completo && daEmpresa(r.data.identificacao.empresa) && noPeriodo(r.data.identificacao.data));
  const petsF = pets.filter((r) => r.completo && daEmpresa(r.data.identificacao.empresa) && noPeriodo(r.data.identificacao.data));
  const dds = ddsList.filter((r) => r.completo && daEmpresa(r.data.identificacao.empresa) && noPeriodo(r.data.identificacao.data));
  const acid = investigacoes.filter((r) => r.completo && daEmpresa(r.data.acidente.empresa) && noPeriodo(r.data.acidente.data));
  const rels = relatos.filter((r) => r.completo && daEmpresa(r.data.empresa) && noPeriodo(r.data.data));
  const acoesF = acoes.filter((a) => daEmpresa(a.empresa));

  // Conformidade das inspeções (itens respondidos, sem "Não se Aplica").
  let conformes = 0;
  let naoConformes = 0;
  const porTipo = new Map();
  const ncPorArea = new Map();
  insp.forEach((r) => {
    const tipo = r.data.tipoInspecao || 'Sem tipo';
    const acc = porTipo.get(tipo) || { c: 0, nc: 0 };
    r.data.checklist.forEach((i) => {
      if (i.resposta === 'Conforme') { conformes++; acc.c++; }
      if (i.resposta === 'Não Conforme') {
        naoConformes++; acc.nc++;
        const area = r.data.identificacao.area || 'Não informada';
        ncPorArea.set(area, (ncPorArea.get(area) || 0) + 1);
      }
    });
    porTipo.set(tipo, acc);
  });
  const pctConformidade = conformes + naoConformes ? (conformes / (conformes + naoConformes)) * 100 : null;
  const corPct = (p) => (p >= 90 ? 'var(--verde)' : p >= 75 ? 'var(--amarelo)' : 'var(--vermelho)');
  const conformidadeTipo = [...porTipo.entries()]
    .filter(([, v]) => v.c + v.nc)
    .map(([rotulo, v]) => { const valor = (v.c / (v.c + v.nc)) * 100; return { rotulo, valor, cor: corPct(valor) }; })
    .sort((a, b) => a.valor - b.valor);
  const ncArea = [...ncPorArea.entries()].map(([rotulo, valor]) => ({ rotulo, valor, cor: 'var(--vermelho)' }))
    .sort((a, b) => b.valor - a.valor).slice(0, 8);

  // Ações (situação atual, independente do período).
  const sit = (chave) => acoesF.filter((a) => situacaoAcao(a).chave === chave).length;
  const abertas = acoesF.filter((a) => a.status !== 'Concluída').length;
  const atrasadas = sit('atrasada');

  // Acidentes e dias sem acidente (considera todos os registros da empresa).
  const todasDatasAcidente = investigacoes.filter((r) => r.completo && daEmpresa(r.data.acidente.empresa))
    .map((r) => r.data.acidente.data).filter(Boolean).sort();
  const ultimoAcidente = todasDatasAcidente[todasDatasAcidente.length - 1];
  const diasSemAcidente = ultimoAcidente ? -diasAte(ultimoAcidente) : null;
  const comAfast = acid.filter((r) => ['Com Afastamento', 'Fatal'].includes(r.data.acidente.gravidade)).length;
  const semAfast = acid.length - comAfast;

  // Pirâmide de segurança (acidentes x quase acidentes x desvios).
  const quaseAcidentes = rels.filter((r) => r.data.tipo === 'Quase acidente').length;
  const desvios = rels.filter((r) => r.data.tipo === 'Condição insegura' || r.data.tipo === 'Comportamento de risco').length + naoConformes;
  const piramide = [
    { rotulo: 'Acidentes com afastamento', valor: comAfast, cor: '#7a1414' },
    { rotulo: 'Acidentes sem afastamento', valor: semAfast, cor: 'var(--vermelho)' },
    { rotulo: 'Quase acidentes', valor: quaseAcidentes, cor: 'var(--amarelo)' },
    { rotulo: 'Condições e atos inseguros (relatos + NCs)', valor: desvios, cor: 'var(--azul)' }
  ];

  // Inspeções por mês (últimos 6 meses, sempre).
  const meses = [];
  const agora = new Date();
  for (let k = 5; k >= 0; k--) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - k, 1);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    meses.push({
      chave,
      rotulo: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      valor: inspecoes.filter((r) => r.completo && daEmpresa(r.data.identificacao.empresa) && (r.data.identificacao.data || '').startsWith(chave)).length
    });
  }

  const participantesDDS = dds.reduce((s, r) => s + r.data.participantes.length, 0);
  const coresRelato = { 'Quase acidente': 'var(--amarelo)', 'Condição insegura': 'var(--vermelho)', 'Comportamento de risco': '#8a3ffc', 'Sugestão de melhoria': 'var(--verde)' };
  const relatosTipo = TIPOS_RELATO.map((t) => ({ rotulo: t, valor: rels.filter((r) => r.data.tipo === t).length, cor: coresRelato[t] })).filter((x) => x.valor);
  const acoesSit = [
    { rotulo: 'Atrasadas', valor: atrasadas, cor: 'var(--vermelho)' },
    { rotulo: 'Vencem em 7 dias', valor: sit('embreve'), cor: 'var(--amarelo)' },
    { rotulo: 'No prazo', valor: sit('noprazo'), cor: 'var(--azul)' },
    { rotulo: 'Sem prazo', valor: sit('semprazo'), cor: '#6b7280' },
    { rotulo: 'Concluídas', valor: sit('concluida'), cor: 'var(--verde)' }
  ].filter((x) => x.valor);
  const acoesOrigem = contarPor(acoesF.filter((a) => a.status !== 'Concluída'), (a) => a.origem);

  const kpi = (valor, rotulo, cls = '', alvo = '') => `
    <div class="kpi ${cls} ${alvo ? 'kpi-clicavel' : ''}" ${alvo ? `data-alvo="${alvo}" role="button" tabindex="0"` : ''}>
      <span class="kpi-valor">${valor}</span><span class="kpi-rotulo">${rotulo}</span>
    </div>`;

  view.innerHTML = `
    <div class="screen-header">
      <h1>Painel de indicadores</h1>
    </div>
    <div class="filtros-acoes">
      <select id="painel-periodo">${PERIODOS_PAINEL.map((p) => `<option value="${p.id}" ${filtro.periodo === p.id ? 'selected' : ''}>${p.rotulo}</option>`).join('')}</select>
      <select id="painel-empresa">
        <option value="">Todas as empresas</option>
        ${empresas.map((e) => `<option ${filtro.empresa === e ? 'selected' : ''}>${escapeHtml(e)}</option>`).join('')}
      </select>
    </div>

    <div class="kpi-grid">
      ${kpi(diasSemAcidente === null ? '—' : diasSemAcidente, 'Dias sem acidente', diasSemAcidente !== null && diasSemAcidente < 30 ? 'kpi-alerta' : 'kpi-ok')}
      ${kpi(insp.length, 'Inspeções', '', 'inspecoes')}
      ${kpi(pctConformidade === null ? '—' : pctConformidade.toFixed(0) + '%', 'Conformidade', pctConformidade === null ? '' : pctConformidade >= 90 ? 'kpi-ok' : pctConformidade >= 75 ? 'kpi-atencao' : 'kpi-alerta')}
      ${kpi(naoConformes, 'Não conformidades', naoConformes ? 'kpi-atencao' : '')}
      ${kpi(abertas, 'Ações abertas', '', 'acoes')}
      ${kpi(atrasadas, 'Ações atrasadas', atrasadas ? 'kpi-alerta' : 'kpi-ok', 'acoes-atrasadas')}
      ${kpi(rels.length, 'Relatos', '', 'relatos')}
      ${kpi(acid.length, 'Acidentes', acid.length ? 'kpi-alerta' : 'kpi-ok', 'investigacao')}
      ${kpi(pts.length + petsF.length, 'PT/APR e PET')}
      ${kpi(`${dds.length}<small> / ${participantesDDS} part.</small>`, 'DDS realizados')}
    </div>

    <div class="painel-grid">
      <section class="painel-card">
        <h3>Inspeções por mês</h3>
        ${colunasMesesPainel(meses)}
      </section>
      <section class="painel-card">
        <h3>Pirâmide de segurança</h3>
        ${barrasPainel(piramide)}
        <p class="hint">Quanto mais relatos de quase acidentes e desvios tratados na base, menor a chance de acidentes no topo.</p>
      </section>
      <section class="painel-card">
        <h3>Conformidade por tipo de inspeção</h3>
        ${barrasPainel(conformidadeTipo, { max: 100, sufixo: '%' })}
      </section>
      <section class="painel-card">
        <h3>Não conformidades por área</h3>
        ${barrasPainel(ncArea)}
      </section>
      <section class="painel-card">
        <h3>Ações por situação</h3>
        ${barrasPainel(acoesSit)}
      </section>
      <section class="painel-card">
        <h3>Ações abertas por origem</h3>
        ${barrasPainel(acoesOrigem)}
      </section>
      <section class="painel-card">
        <h3>Relatos por tipo</h3>
        ${barrasPainel(relatosTipo)}
      </section>
    </div>
    <p class="hint">Indicadores calculados com os registros gravados neste aparelho. As ações mostram a situação de hoje, sem filtro de período.</p>
  `;

  document.getElementById('painel-periodo').addEventListener('change', (e) => { filtro.periodo = e.target.value; renderPainel(); });
  document.getElementById('painel-empresa').addEventListener('change', (e) => { filtro.empresa = e.target.value; renderPainel(); });
  view.querySelectorAll('.kpi-clicavel').forEach((el) => {
    const ir = () => {
      const alvo = el.dataset.alvo;
      if (alvo === 'inspecoes') return renderHome();
      if (alvo === 'relatos') return renderRelatosHome();
      if (alvo === 'investigacao') return renderInvestigacaoHome();
      state.filtroAcoes = { situacao: alvo === 'acoes-atrasadas' ? 'atrasadas' : 'abertas', origem: 'Todas', busca: '' };
      return renderAcoesHome();
    };
    el.addEventListener('click', ir);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') ir(); });
  });
}
