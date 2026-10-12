/*
 * Inteligência SSMA: transforma os registros do app em informação para
 * decisão. Reúne quatro peças, usadas também pela Central de ações, pelo
 * checklist da inspeção e pelo painel:
 *  - criticidade dos desvios (Baixa, Média, Alta e Crítica);
 *  - reincidência (o mesmo item não conforme na mesma área dentro de
 *    JANELA_REINCIDENCIA_DIAS);
 *  - etapa de eficácia das ações (evidência de conclusão e verificação);
 *  - Índice de Maturidade Preventiva (IMP) por área, com pesos ajustáveis.
 * Tudo é calculado na hora, a partir dos registros do aparelho, sem internet.
 */

const CRITICIDADES = ['Baixa', 'Média', 'Alta', 'Crítica'];
const PESO_CRITICIDADE = { 'Baixa': 1, 'Média': 2, 'Alta': 3, 'Crítica': 4 };
const JANELA_REINCIDENCIA_DIAS = 90;
const DIAS_PADRAO_VERIFICACAO = 30;

function classeCriticidade(c) {
  return { 'Crítica': 'badge-erro', 'Alta': 'badge-alto', 'Média': 'badge-pendente', 'Baixa': 'badge-ok' }[c] || 'badge-rascunho';
}

function ehCriticidadeAlta(c) {
  return c === 'Alta' || c === 'Crítica';
}

function criticidadeDoPotencialRelato(p) {
  return { 'Baixo': 'Baixa', 'Médio': 'Média', 'Alto': 'Alta', 'Crítico': 'Crítica' }[p] || '';
}

function criticidadeDaGravidade(g) {
  return { 'Sem Afastamento': 'Média', 'Com Afastamento': 'Alta', 'Fatal': 'Crítica' }[g] || '';
}

function criticidadeDoNivelPGR(n) {
  return { 'Baixo': 'Baixa', 'Moderado': 'Média', 'Alto': 'Alta', 'Crítico': 'Crítica' }[n] || '';
}

function maiorCriticidade(lista) {
  return lista.filter(Boolean).sort((a, b) => (PESO_CRITICIDADE[b] || 0) - (PESO_CRITICIDADE[a] || 0))[0] || '';
}

/** Botões de criticidade (mesmo visual dos botões de resposta do checklist). */
function htmlEscolhaCriticidade(nome, atual) {
  const cls = { 'Baixa': 'radio-ok', 'Média': 'radio-parcial', 'Alta': 'radio-alto', 'Crítica': 'radio-nc' };
  return `<div class="radio-group criticidade-group">${CRITICIDADES.map((c) => `
    <label class="radio-pill ${cls[c]}"><input type="radio" name="${nome}" value="${c}" ${atual === c ? 'checked' : ''}> ${c}</label>`).join('')}
  </div>`;
}

/* ---------------- REINCIDÊNCIA ---------------- */

function normalizarTexto(t) {
  return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function rotuloArea(area) {
  return String(area || '').trim() || 'Não informada';
}

function diasEntreDatas(isoA, isoB) {
  if (!isoA || !isoB) return null;
  const [a1, m1, d1] = isoA.split('-').map(Number);
  const [a2, m2, d2] = isoB.split('-').map(Number);
  return Math.round((new Date(a2, m2 - 1, d2) - new Date(a1, m1 - 1, d1)) / 86400000);
}

/**
 * Percorre as não conformidades das inspeções concluídas, em ordem de data,
 * e marca como reincidente a que repete um item já não conforme na mesma
 * área nos JANELA_REINCIDENCIA_DIAS anteriores.
 * Retorna { porItem: Map("inspId:itemId" -> {reincidente, vezes, anterior}), ocorrencias, grupos }.
 */
function analisarReincidencias(inspecoes) {
  const ocorrencias = [];
  inspecoes.filter((i) => i.completo).forEach((insp) => {
    const id = insp.data.identificacao;
    insp.data.checklist.forEach((item) => {
      if (item.resposta !== 'Não Conforme') return;
      ocorrencias.push({
        chave: normalizarTexto(id.area) + '|' + normalizarTexto(item.texto),
        data: id.data || '', inspId: insp.id, itemId: item.id,
        area: rotuloArea(id.area), empresa: (id.empresa || '').trim(),
        texto: item.texto, tema: insp.data.tipoInspecao || 'Sem tipo',
        criticidade: item.criticidade || '', reincidente: false
      });
    });
  });
  ocorrencias.sort((a, b) => a.data.localeCompare(b.data));

  const porChave = new Map();
  const porItem = new Map();
  ocorrencias.forEach((o) => {
    const anteriores = (porChave.get(o.chave) || []).filter((p) => {
      const dias = diasEntreDatas(p.data, o.data);
      return p.inspId !== o.inspId && dias !== null && dias >= 0 && dias <= JANELA_REINCIDENCIA_DIAS;
    });
    o.reincidente = anteriores.length > 0;
    porItem.set(`${o.inspId}:${o.itemId}`, {
      reincidente: o.reincidente,
      vezes: anteriores.length + 1,
      anterior: anteriores.length ? anteriores[anteriores.length - 1].data : ''
    });
    porChave.set(o.chave, [...(porChave.get(o.chave) || []), o]);
  });

  const grupos = [...porChave.values()]
    .filter((lista) => lista.some((o) => o.reincidente))
    .map((lista) => ({
      area: lista[0].area,
      texto: lista[0].texto,
      tema: lista[lista.length - 1].tema,
      empresas: [...new Set(lista.map((o) => o.empresa).filter(Boolean))],
      ocorrencias: lista.length,
      ultima: lista[lista.length - 1].data,
      datas: lista.map((o) => o.data)
    }))
    .sort((a, b) => b.ocorrencias - a.ocorrencias || b.ultima.localeCompare(a.ultima));

  return { porItem, ocorrencias, grupos };
}

/**
 * Para o checklist em preenchimento: itens que já foram não conformes na
 * mesma área nos últimos JANELA_REINCIDENCIA_DIAS (texto normalizado -> data mais recente).
 */
async function historicoNCDaArea(insp) {
  const area = normalizarTexto(insp.data.identificacao.area);
  const dataAtual = insp.data.identificacao.data || hojeISO();
  const mapa = new Map();
  if (!area) return mapa;
  (await DB.getAllInspections()).forEach((outra) => {
    if (!outra.completo || outra.id === insp.id) return;
    const id = outra.data.identificacao;
    if (normalizarTexto(id.area) !== area) return;
    const dias = diasEntreDatas(id.data, dataAtual);
    if (dias === null || dias < 0 || dias > JANELA_REINCIDENCIA_DIAS) return;
    outra.data.checklist.forEach((item) => {
      if (item.resposta !== 'Não Conforme') return;
      const chave = normalizarTexto(item.texto);
      if (!mapa.has(chave) || mapa.get(chave) < id.data) mapa.set(chave, id.data);
    });
  });
  return mapa;
}

/* ---------------- EFICÁCIA DAS AÇÕES ---------------- */

function somarDias(iso, dias) {
  const [a, m, d] = (iso || hojeISO()).split('-').map(Number);
  const dt = new Date(a, m - 1, d + dias);
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

/**
 * Etapa da ação depois da conclusão: sem evidência, aguardando verificação,
 * verificar agora, eficaz, ou reaberta (verificada como não eficaz).
 * Retorna null para ação aberta que nunca foi reaberta.
 */
function etapaEficacia(a) {
  const ac = a.acomp || {};
  if (a.status !== 'Concluída') {
    return (ac.historico || []).length ? { chave: 'reaberta', text: 'Reaberta: não eficaz', cls: 'badge-erro' } : null;
  }
  if (!ac.evidencia) return { chave: 'semevidencia', text: 'Concluída sem evidência', cls: 'badge-pendente' };
  if (ac.eficacia === 'Eficaz') return { chave: 'eficaz', text: `Eficaz${ac.eficaciaEm ? ' (verificada em ' + formatarDataBR(ac.eficaciaEm) + ')' : ''}`, cls: 'badge-ok' };
  const dias = diasAte(ac.verificarEm);
  if (dias === null || dias <= 0) return { chave: 'verificar', text: 'Verificar eficácia agora', cls: 'badge-alto' };
  return { chave: 'aguardando', text: `Verificar eficácia em ${formatarDataBR(ac.verificarEm)}`, cls: 'badge-sync' };
}

/* ---------------- ÍNDICE DE MATURIDADE PREVENTIVA ---------------- */

const COMPONENTES_IMP = [
  { id: 'conformidade', rotulo: 'Conformidade das inspeções', explicacao: 'Itens conformes sobre itens respondidos (sem "Não se Aplica"), no período.' },
  { id: 'tratamento', rotulo: 'Tratamento dos desvios', explicacao: 'Ações com prazo que não estão atrasadas (concluídas ou dentro do prazo), situação de hoje.' },
  { id: 'eficacia', rotulo: 'Eficácia das ações', explicacao: 'Verificações "Eficaz" sobre todas as verificações feitas (eficazes e não eficazes).' },
  { id: 'reincidencia', rotulo: 'Ausência de reincidência', explicacao: '100% menos o percentual de não conformidades reincidentes no período.' },
  { id: 'criticos', rotulo: 'Controle dos desvios críticos', explicacao: 'Não conformidades Alta e Crítica do período com ação, responsável e prazo definidos.' },
  { id: 'regularidade', rotulo: 'Regularidade das inspeções', explicacao: 'Inspeções nos últimos 30 dias sobre a meta mensal da área (limitado a 100%).' }
];
const PESOS_IMP_PADRAO = { conformidade: 25, tratamento: 20, eficacia: 20, reincidencia: 15, criticos: 10, regularidade: 10 };
const META_INSPECOES_MES_PADRAO = 4;

const FAIXAS_IMP = [
  { min: 85, rotulo: 'Controle consistente', cls: 'imp-verde' },
  { min: 70, rotulo: 'Atenção', cls: 'imp-amarelo' },
  { min: 50, rotulo: 'Fragilidade operacional', cls: 'imp-laranja' },
  { min: -1, rotulo: 'Intervenção prioritária', cls: 'imp-vermelho' }
];

function faixaIMP(valor) {
  return FAIXAS_IMP.find((f) => valor >= f.min);
}

async function lerCriteriosIMP() {
  const salvo = (await DB.getSetting('criteriosIMP')) || {};
  return {
    pesos: Object.assign({}, PESOS_IMP_PADRAO, salvo.pesos || {}),
    metaMensal: Number(salvo.metaMensal) > 0 ? Number(salvo.metaMensal) : META_INSPECOES_MES_PADRAO
  };
}

/** Média ponderada dos componentes disponíveis (componente sem dado não entra na conta). */
function calcularIMP(componentes, pesos) {
  let soma = 0;
  let pesoTotal = 0;
  COMPONENTES_IMP.forEach((c) => {
    const v = componentes[c.id];
    const p = Number(pesos[c.id]) || 0;
    if (v === null || v === undefined || !p) return;
    soma += v * p;
    pesoTotal += p;
  });
  return pesoTotal ? soma / pesoTotal : null;
}

/* ---------------- CÁLCULO POR ÁREA ---------------- */

function pct(parte, total) {
  return total ? (parte / total) * 100 : null;
}

/**
 * Consolida, por área, inspeções, desvios, criticidade, reincidência, ações,
 * tendência e IMP. filtro: { periodo, empresa, area }.
 */
async function calcularInteligencia(filtro) {
  const [inspecoes, acoes, criterios] = await Promise.all([DB.getAllInspections(), coletarAcoes(), lerCriteriosIMP()]);
  const analise = analisarReincidencias(inspecoes);
  const inicio = inicioPeriodoPainel(filtro.periodo);
  const hoje = hojeISO();
  const ini30 = somarDias(hoje, -29);
  const ini60 = somarDias(hoje, -59);
  const daEmpresa = (emp) => !filtro.empresa || (emp || '').trim() === filtro.empresa;
  const daArea = (area) => !filtro.area || normalizarTexto(area) === normalizarTexto(filtro.area);

  const concluidas = inspecoes.filter((r) => r.completo && daEmpresa(r.data.identificacao.empresa));
  const areas = new Map();
  const obterArea = (nome) => {
    const chave = normalizarTexto(rotuloArea(nome));
    if (!areas.has(chave)) {
      areas.set(chave, {
        nome: rotuloArea(nome), inspecoes: 0, insp30: 0, conformes: 0, ncs: 0, criticos: 0,
        criticosTratados: 0, reincidentes: 0, nc30: 0, ncAnt30: 0, temas: new Map(),
        acoes: [], vencidas: 0, eficazes: 0, naoEficazes: 0, verificar: 0
      });
    }
    return areas.get(chave);
  };

  const celulas = new Map(); // "area|tema" -> { n, peso, reincidentes, criticos }
  const temasTotal = new Map();

  concluidas.forEach((insp) => {
    const id = insp.data.identificacao;
    if (!daArea(id.area)) return;
    const data = id.data || '';
    const a = obterArea(id.area);
    const tema = insp.data.tipoInspecao || 'Sem tipo';
    const f = insp.data.fechamento;
    if (data >= ini30) a.insp30++;
    insp.data.checklist.forEach((item) => {
      if (item.resposta !== 'Não Conforme') return;
      if (data >= ini30) a.nc30++;
      else if (data >= ini60) a.ncAnt30++;
    });
    if (inicio && data < inicio) return;
    a.inspecoes++;
    insp.data.checklist.forEach((item) => {
      if (item.resposta === 'Conforme') a.conformes++;
      if (item.resposta !== 'Não Conforme') return;
      a.ncs++;
      a.temas.set(tema, (a.temas.get(tema) || 0) + 1);
      temasTotal.set(tema, (temasTotal.get(tema) || 0) + 1);
      const reinc = (analise.porItem.get(`${insp.id}:${item.id}`) || {}).reincidente;
      if (reinc) a.reincidentes++;
      if (ehCriticidadeAlta(item.criticidade)) {
        a.criticos++;
        const temPlano = item.medida && (item.responsavelAcao || f.responsavelAcao) && (item.prazoAcao || f.prazo);
        if (temPlano) a.criticosTratados++;
      }
      const chaveCel = normalizarTexto(a.nome) + '|' + tema;
      const cel = celulas.get(chaveCel) || { n: 0, peso: 0, reincidentes: 0, criticos: 0 };
      cel.n++;
      cel.peso += PESO_CRITICIDADE[item.criticidade] || 1;
      if (reinc) cel.reincidentes++;
      if (ehCriticidadeAlta(item.criticidade)) cel.criticos++;
      celulas.set(chaveCel, cel);
    });
  });

  acoes.filter((x) => daEmpresa(x.empresa) && daArea(x.area)).forEach((x) => {
    const a = obterArea(x.area);
    a.acoes.push(x);
    if (situacaoAcao(x).chave === 'atrasada') a.vencidas++;
    const ac = x.acomp || {};
    if (ac.eficacia === 'Eficaz') a.eficazes++;
    a.naoEficazes += (ac.historico || []).length;
    const etapa = etapaEficacia(x);
    if (etapa && etapa.chave === 'verificar') a.verificar++;
  });

  const lista = [...areas.values()].filter((a) => a.inspecoes || a.acoes.length).map((a) => {
    const comPrazo = a.acoes.filter((x) => x.prazo || x.status === 'Concluída');
    const componentes = {
      conformidade: pct(a.conformes, a.conformes + a.ncs),
      tratamento: pct(comPrazo.length - a.vencidas, comPrazo.length),
      eficacia: pct(a.eficazes, a.eficazes + a.naoEficazes),
      reincidencia: a.ncs ? 100 - (a.reincidentes / a.ncs) * 100 : (a.inspecoes ? 100 : null),
      criticos: pct(a.criticosTratados, a.criticos),
      regularidade: Math.min(100, (a.insp30 / criterios.metaMensal) * 100)
    };
    const imp = calcularIMP(componentes, criterios.pesos);
    const temaPrincipal = [...a.temas.entries()].sort((x, y) => y[1] - x[1])[0];
    const tendencia = a.ncAnt30 ? ((a.nc30 - a.ncAnt30) / a.ncAnt30) * 100 : null;
    return { ...a, componentes, imp, temaPrincipal: temaPrincipal ? temaPrincipal[0] : '', tendencia };
  }).sort((x, y) => (x.imp === null ? 999 : x.imp) - (y.imp === null ? 999 : y.imp) || y.ncs - x.ncs);

  const temas = [...temasTotal.entries()].sort((x, y) => y[1] - x[1]).slice(0, 8).map(([t]) => t);

  return { areas: lista, celulas, temas, analise, criterios, acoes };
}

/** Pontos de atenção gerados a partir dos números (ordem: mais grave primeiro). */
function pontosDeAtencao(dados, filtro) {
  const pontos = [];
  dados.areas.forEach((a) => {
    if (a.imp !== null && a.imp < 50) pontos.push({ nivel: 3, texto: `${a.nome}: índice de maturidade em ${a.imp.toFixed(0)}% (intervenção prioritária).` });
    const criticasAtrasadas = a.acoes.filter((x) => ehCriticidadeAlta(x.criticidade) && situacaoAcao(x).chave === 'atrasada').length;
    if (criticasAtrasadas) pontos.push({ nivel: 3, texto: `${a.nome}: ${criticasAtrasadas} ação(ões) de criticidade alta ou crítica atrasada(s).` });
    if (a.tendencia !== null && a.tendencia >= 20 && a.nc30 >= 3) pontos.push({ nivel: 2, texto: `${a.nome}: desvios subiram ${a.tendencia.toFixed(0)}% nos últimos 30 dias (${a.ncAnt30} para ${a.nc30}).` });
    if (a.verificar) pontos.push({ nivel: 1, texto: `${a.nome}: ${a.verificar} ação(ões) concluída(s) aguardando verificação de eficácia.` });
  });
  dados.celulas.forEach((cel, chave) => {
    if (cel.n < 3) return;
    const [areaNorm, tema] = chave.split('|');
    const area = (dados.areas.find((a) => normalizarTexto(a.nome) === areaNorm) || {}).nome || areaNorm;
    pontos.push({ nivel: cel.criticos ? 3 : 2, texto: `${area}: ${cel.n} desvios em ${tema}${cel.criticos ? ` (${cel.criticos} alto(s) ou crítico(s))` : ''}${cel.reincidentes ? `, ${cel.reincidentes} reincidente(s)` : ''}.` });
  });
  const inicio = inicioPeriodoPainel(filtro.periodo);
  const porEmpresa = new Map();
  dados.analise.ocorrencias.forEach((o) => {
    if (!o.reincidente || !o.empresa || (inicio && o.data < inicio)) return;
    if (filtro.empresa && o.empresa !== filtro.empresa) return;
    if (filtro.area && normalizarTexto(o.area) !== normalizarTexto(filtro.area)) return;
    porEmpresa.set(o.empresa, (porEmpresa.get(o.empresa) || 0) + 1);
  });
  porEmpresa.forEach((n, emp) => {
    if (n >= 2) pontos.push({ nivel: 2, texto: `${emp}: ${n} não conformidades reincidentes no período.` });
  });
  return pontos.sort((a, b) => b.nivel - a.nivel).slice(0, 12);
}

/* ---------------- TELA ---------------- */

const ESCALA_CALOR = ['#fbe9e1', '#f5c3ac', '#ea8f6a', '#c95530', '#8f3216'];

function corCalor(peso, max) {
  if (!peso) return '';
  const nivel = Math.min(ESCALA_CALOR.length - 1, Math.floor((peso / max) * ESCALA_CALOR.length - 1e-9));
  return ESCALA_CALOR[nivel];
}

function formatarPct(v) {
  return v === null || v === undefined ? '—' : `${v.toFixed(0)}%`;
}

function htmlTendencia(a) {
  if (a.tendencia === null) return a.nc30 ? `<span class="tend tend-sobe">novos desvios (${a.nc30})</span>` : '<span class="tend">sem desvios recentes</span>';
  if (Math.abs(a.tendencia) < 1) return '<span class="tend">estável</span>';
  return a.tendencia > 0
    ? `<span class="tend tend-sobe">↑ ${a.tendencia.toFixed(0)}%</span>`
    : `<span class="tend tend-desce">↓ ${Math.abs(a.tendencia).toFixed(0)}%</span>`;
}

function cartaoArea(a, idx) {
  const faixa = a.imp === null ? null : faixaIMP(a.imp);
  return `
    <section class="painel-card area-card">
      <div class="area-topo">
        <h3>${escapeHtml(a.nome)}</h3>
        ${faixa ? `<span class="imp-selo ${faixa.cls}">IMP ${a.imp.toFixed(0)}% · ${faixa.rotulo}</span>` : '<span class="imp-selo">IMP sem dados</span>'}
      </div>
      <dl class="area-numeros">
        <div><dt>Inspeções</dt><dd>${a.inspecoes}</dd></div>
        <div><dt>Desvios</dt><dd>${a.ncs}</dd></div>
        <div><dt>Altos e críticos</dt><dd class="${a.criticos ? 'num-alerta' : ''}">${a.criticos}</dd></div>
        <div><dt>Ações vencidas</dt><dd class="${a.vencidas ? 'num-alerta' : ''}">${a.vencidas}</dd></div>
        <div><dt>Reincidentes</dt><dd class="${a.reincidentes ? 'num-alerta' : ''}">${a.reincidentes}</dd></div>
        <div><dt>Verificar eficácia</dt><dd>${a.verificar}</dd></div>
      </dl>
      <p class="area-linha"><strong>Tema com mais desvios:</strong> ${a.temaPrincipal ? escapeHtml(a.temaPrincipal) : '—'}</p>
      <p class="area-linha"><strong>Tendência (30 dias):</strong> ${htmlTendencia(a)}</p>
      <details class="area-detalhe">
        <summary>Composição do índice</summary>
        <table class="imp-tabela">
          ${COMPONENTES_IMP.map((c) => `<tr><td>${c.rotulo}</td><td>${formatarPct(a.componentes[c.id])}</td></tr>`).join('')}
        </table>
      </details>
      <button type="button" class="btn-link btn-area-acoes" data-idx="${idx}">Ver ações da área →</button>
    </section>`;
}

function htmlMapaCalor(dados) {
  if (!dados.temas.length) return '<p class="empty-state">Sem não conformidades no período.</p>';
  const linhas = dados.areas.filter((a) => a.ncs).slice(0, 15);
  let max = 1;
  dados.celulas.forEach((c) => { max = Math.max(max, c.peso); });
  return `
    <div class="calor-rolagem">
      <table class="calor-tabela">
        <thead><tr><th>Área</th>${dados.temas.map((t) => `<th><span>${escapeHtml(t)}</span></th>`).join('')}</tr></thead>
        <tbody>${linhas.map((a) => `
          <tr><th>${escapeHtml(a.nome)}</th>${dados.temas.map((t) => {
            const cel = dados.celulas.get(normalizarTexto(a.nome) + '|' + t);
            if (!cel) return '<td class="calor-vazio">·</td>';
            const cor = corCalor(cel.peso, max);
            const escuro = ESCALA_CALOR.indexOf(cor) >= 3;
            const dica = `${a.nome} × ${t}: ${cel.n} desvio(s), ${cel.criticos} alto(s)/crítico(s), ${cel.reincidentes} reincidente(s)`;
            return `<td style="background:${cor};color:${escuro ? '#fff' : '#1c2530'}" title="${escapeHtml(dica)}" aria-label="${escapeHtml(dica)}">${cel.n}${cel.reincidentes ? '<sup>R</sup>' : ''}</td>`;
          }).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="calor-legenda">
      <span>Menor peso</span>${ESCALA_CALOR.map((c) => `<i style="background:${c}"></i>`).join('')}<span>Maior peso</span>
    </div>
    <p class="hint">O número é a quantidade de desvios. A cor soma a criticidade de cada um (Baixa 1, Média 2, Alta 3, Crítica 4; sem classificação conta 1). <sup>R</sup> indica reincidência. Toque na célula para ver o detalhe.</p>`;
}

async function renderInteligencia() {
  state.screen = 'inteligencia';
  setActiveTab('inteligencia');
  if (!state.filtroInteligencia) state.filtroInteligencia = { periodo: '90', empresa: '', area: '' };
  const filtro = state.filtroInteligencia;
  const dados = await calcularInteligencia(filtro);
  const todas = await DB.getAllInspections();
  const empresas = [...new Set(todas.filter((r) => r.completo).map((r) => (r.data.identificacao.empresa || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const nomesArea = [...new Set(todas.filter((r) => r.completo).map((r) => rotuloArea(r.data.identificacao.area)))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const pontos = pontosDeAtencao(dados, filtro);
  const grupos = dados.analise.grupos.filter((g) => (!filtro.area || normalizarTexto(g.area) === normalizarTexto(filtro.area)) &&
    (!filtro.empresa || g.empresas.includes(filtro.empresa))).slice(0, 10);
  const comIMP = dados.areas.filter((a) => a.imp !== null);
  const impGeral = comIMP.length ? comIMP.reduce((s, a) => s + a.imp, 0) / comIMP.length : null;
  const faixaGeral = impGeral === null ? null : faixaIMP(impGeral);
  const tot = (campo) => dados.areas.reduce((s, a) => s + a[campo], 0);
  const c = dados.criterios;

  view.innerHTML = `
    <div class="screen-header">
      <h1>Inteligência SSMA</h1>
    </div>
    <p class="hint">Visão por área: onde o risco está se concentrando, o que se repete e se as ações estão funcionando.</p>
    <div class="filtros-acoes">
      <select id="int-periodo">${PERIODOS_PAINEL.map((p) => `<option value="${p.id}" ${filtro.periodo === p.id ? 'selected' : ''}>${p.rotulo}</option>`).join('')}</select>
      <select id="int-empresa"><option value="">Todas as empresas</option>${empresas.map((e) => `<option ${filtro.empresa === e ? 'selected' : ''}>${escapeHtml(e)}</option>`).join('')}</select>
      <select id="int-area"><option value="">Todas as áreas</option>${nomesArea.map((a) => `<option ${filtro.area === a ? 'selected' : ''}>${escapeHtml(a)}</option>`).join('')}</select>
    </div>

    <div class="kpi-grid">
      <div class="kpi ${faixaGeral ? faixaGeral.cls : ''}"><span class="kpi-valor">${impGeral === null ? '—' : impGeral.toFixed(0) + '%'}</span><span class="kpi-rotulo">IMP médio${faixaGeral ? ' · ' + faixaGeral.rotulo : ''}</span></div>
      <div class="kpi"><span class="kpi-valor">${tot('ncs')}</span><span class="kpi-rotulo">Desvios no período</span></div>
      <div class="kpi ${tot('criticos') ? 'kpi-alerta' : 'kpi-ok'}"><span class="kpi-valor">${tot('criticos')}</span><span class="kpi-rotulo">Altos e críticos</span></div>
      <div class="kpi ${tot('reincidentes') ? 'kpi-atencao' : 'kpi-ok'}"><span class="kpi-valor">${tot('reincidentes')}</span><span class="kpi-rotulo">Reincidentes</span></div>
      <div class="kpi ${tot('vencidas') ? 'kpi-alerta' : 'kpi-ok'}"><span class="kpi-valor">${tot('vencidas')}</span><span class="kpi-rotulo">Ações vencidas</span></div>
      <button type="button" class="kpi kpi-clicavel ${tot('verificar') ? 'kpi-atencao' : ''}" id="int-kpi-verificar"><span class="kpi-valor">${tot('verificar')}</span><span class="kpi-rotulo">Verificar eficácia</span></button>
    </div>

    <section class="painel-card">
      <h3>Pontos de atenção</h3>
      ${pontos.length ? `<ul class="pontos-atencao">${pontos.map((p) => `<li class="ponto-n${p.nivel}"><span class="ponto-marca">${p.nivel === 3 ? 'Prioridade' : p.nivel === 2 ? 'Atenção' : 'Acompanhar'}</span>${escapeHtml(p.texto)}</li>`).join('')}</ul>` : '<p class="empty-state">Nenhum ponto de atenção com os filtros atuais.</p>'}
    </section>

    <section class="painel-card">
      <h3>Mapa de calor: área × tipo de inspeção</h3>
      ${htmlMapaCalor(dados)}
    </section>

    <h2 class="secao-titulo">Situação por área</h2>
    ${dados.areas.length ? `<div class="painel-grid">${dados.areas.map(cartaoArea).join('')}</div>` : '<p class="empty-state">Sem inspeções ou ações com os filtros atuais.</p>'}

    <section class="painel-card">
      <h3>Desvios reincidentes</h3>
      ${grupos.length ? `<table class="tabela-simples">
        <thead><tr><th>Área</th><th>Item não conforme</th><th>Vezes</th><th>Última</th></tr></thead>
        <tbody>${grupos.map((g) => `<tr><td>${escapeHtml(g.area)}</td><td>${escapeHtml(g.texto)}${g.empresas.length ? `<br><small>${escapeHtml(g.empresas.join(', '))}</small>` : ''}</td><td>${g.ocorrencias}</td><td>${formatarDataBR(g.ultima)}</td></tr>`).join('')}</tbody>
      </table>` : '<p class="empty-state">Nenhuma reincidência encontrada.</p>'}
      <p class="hint">Reincidência: o mesmo item não conforme, na mesma área, dentro de ${JANELA_REINCIDENCIA_DIAS} dias.</p>
    </section>

    <section class="painel-card">
      <details id="int-criterios">
        <summary><strong>Critérios do Índice de Maturidade Preventiva (IMP)</strong></summary>
        <p class="hint">Indicador em validação. Os pesos e a meta devem ser definidos e aprovados pela empresa antes de virar indicador oficial. Componente sem dados na área não entra na conta.</p>
        <form id="form-criterios" class="form-section">
          ${COMPONENTES_IMP.map((comp) => `
            <label>${comp.rotulo} (peso)
              <input type="number" min="0" max="100" step="1" name="peso-${comp.id}" value="${c.pesos[comp.id]}">
              <small>${comp.explicacao}</small>
            </label>`).join('')}
          <label>Meta de inspeções por área a cada 30 dias
            <input type="number" min="1" max="200" step="1" name="metaMensal" value="${c.metaMensal}">
          </label>
          <p class="hint">Faixas: 85 a 100% controle consistente · 70 a 84% atenção · 50 a 69% fragilidade operacional · abaixo de 50% intervenção prioritária.</p>
          <div class="form-actions">
            <button type="button" id="btn-criterios-padrao" class="btn-link">Voltar ao padrão</button>
            <button type="submit" class="btn-primary">Salvar critérios</button>
          </div>
        </form>
      </details>
    </section>
    <p class="hint">Calculado com os registros deste aparelho. Para a visão da equipe inteira, use o painel da planilha (Looker Studio), conforme o Guia do Gestor.</p>
  `;

  const recarregar = () => renderInteligencia();
  document.getElementById('int-periodo').addEventListener('change', (e) => { filtro.periodo = e.target.value; recarregar(); });
  document.getElementById('int-empresa').addEventListener('change', (e) => { filtro.empresa = e.target.value; recarregar(); });
  document.getElementById('int-area').addEventListener('change', (e) => { filtro.area = e.target.value; recarregar(); });
  document.getElementById('int-kpi-verificar').addEventListener('click', () => {
    state.filtroAcoes = { situacao: 'verificar', origem: 'Todas', busca: '' };
    renderAcoesHome();
  });
  view.querySelectorAll('.btn-area-acoes').forEach((btn) => {
    btn.addEventListener('click', () => {
      const a = dados.areas[Number(btn.dataset.idx)];
      state.filtroAcoes = { situacao: 'todas', origem: 'Todas', busca: a.nome === 'Não informada' ? '' : a.nome };
      renderAcoesHome();
    });
  });
  const form = document.getElementById('form-criterios');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const pesos = {};
    COMPONENTES_IMP.forEach((comp) => { pesos[comp.id] = Math.max(0, Number(fd.get(`peso-${comp.id}`)) || 0); });
    if (!Object.values(pesos).some((p) => p > 0)) { alert('Informe peso maior que zero em pelo menos um componente.'); return; }
    await DB.setSetting('criteriosIMP', { pesos, metaMensal: Math.max(1, Number(fd.get('metaMensal')) || META_INSPECOES_MES_PADRAO) });
    recarregar();
  });
  document.getElementById('btn-criterios-padrao').addEventListener('click', async () => {
    await DB.setSetting('criteriosIMP', {});
    recarregar();
  });
}
