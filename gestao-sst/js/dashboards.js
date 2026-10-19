/*
 * Painéis (dashboards). Todos os números são recalculados a partir dos registros
 * na hora em que a tela abre — não existe fórmula para "quebrar".
 */
const Paineis = {
  aba: 'geral',
  ano: null,
  mes: '',

  abas: [
    ['geral', 'Visão geral'], ['acidentes', 'Acidentes'], ['colaboradores', 'Colaboradores'], ['treinamentos', 'Treinamentos'],
    ['epi', 'EPI'], ['auditorias', 'Auditorias e desvios'], ['planos', 'Plano 5W2H'], ['riscos', 'Riscos'], ['emergencia', 'Extintores e hidrantes']
  ],

  anos() {
    const s = new Set([String(new Date().getFullYear())]);
    ['acidentes', 'treinamentos', 'movepi', 'auditorias', 'desvios', 'planos', 'dds', 'aso'].forEach((m) =>
      (App.data[m] || []).forEach((r) => { const d = r.data || r.dataFinal || r.dataInicial; const y = D.year(d); if (y) s.add(String(y)); }));
    return Array.from(s).sort().reverse();
  },

  noPeriodo(data) {
    if (!data) return false;
    if (this.ano && String(D.year(data)) !== this.ano) return false;
    if (this.mes && String(D.month(data)) !== this.mes) return false;
    return true;
  },

  contar(lista, fn) {
    const m = new Map();
    lista.forEach((r) => {
      let k = fn(r);
      if (Array.isArray(k)) k.forEach((x) => m.set(x || 'Não informado', (m.get(x || 'Não informado') || 0) + 1));
      else { k = k || 'Não informado'; m.set(k, (m.get(k) || 0) + 1); }
    });
    return Array.from(m, ([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor);
  },

  somar(lista, fnK, fnV) {
    const m = new Map();
    lista.forEach((r) => { const k = fnK(r) || 'Não informado'; m.set(k, (m.get(k) || 0) + (Number(fnV(r)) || 0)); });
    return Array.from(m, ([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor);
  },

  porMes(lista, fnData, fnV = () => 1) {
    const v = new Array(12).fill(0);
    lista.forEach((r) => { const d = fnData(r); if (d && (!this.ano || String(D.year(d)) === this.ano)) v[D.month(d) - 1] += Number(fnV(r)) || 0; });
    return v;
  },

  tab(itens) { return { cab: ['Item', 'Quantidade'], linhas: itens.map((i) => [i.nome, fmtNum(i.valor)]) }; },
  tabMes(series) { return { cab: ['Mês'].concat(series.map((s) => s.nome)), linhas: D.meses.map((m, i) => [m].concat(series.map((s) => fmtNum(s.valores[i])))) }; },

  coresStatus(itens) {
    return itens.map((i) => Object.assign({}, i, { cor: STATUS_COR[Calc.classe(i.nome)] || 'var(--axis)' }));
  },

  tile(label, valor, sub, cls = '') {
    return '<div class="tile ' + cls + '"><div class="t-label">' + esc(label) + '</div><div class="t-value">' + valor + '</div>' + (sub ? '<div class="t-sub">' + sub + '</div>' : '') + '</div>';
  },

  colabsAtivos() { return (App.data.colaboradores || []).filter((c) => norm(c.status) !== 'demitido' && !c.desligamento); },

  /** Abre no ano mais recente que tem registros (ou no ano atual). */
  anoPadrao() {
    let max = 0;
    ['acidentes', 'treinamentos', 'movepi', 'auditorias', 'desvios', 'dds', 'aso'].forEach((m) =>
      (App.data[m] || []).forEach((r) => { const y = D.year(r.data || r.dataFinal || r.dataInicial); if (y && y > max && y <= new Date().getFullYear()) max = y; }));
    return String(max || new Date().getFullYear());
  },

  render() {
    if (!this._escolhido || this._emp !== App.emp.id) { this.ano = this.anoPadrao(); if (this._emp !== App.emp.id) this.mes = ''; this._emp = App.emp.id; this._escolhido = false; }
    const main = $('#main');
    main.innerHTML = '';
    const head = h('<div class="page-head"><div><h1>Painéis</h1><p>Indicadores calculados em tempo real a partir dos cadastros.</p></div><div class="toolbar"></div></div>');
    const tb = $('.toolbar', head);
    const selAno = h('<select aria-label="Ano"><option value="">Todos os anos</option>' + this.anos().map((a) => '<option' + (a === this.ano ? ' selected' : '') + '>' + a + '</option>').join('') + '</select>');
    const selMes = h('<select aria-label="Mês"><option value="">Ano inteiro</option>' + D.mesesLongos.map((m, i) => '<option value="' + (i + 1) + '"' + (String(i + 1) === this.mes ? ' selected' : '') + '>' + m + '</option>').join('') + '</select>');
    selAno.addEventListener('change', () => { this.ano = selAno.value; this._escolhido = true; this.render(); });
    selMes.addEventListener('change', () => { this.mes = selMes.value; this.render(); });
    tb.append(selAno, selMes, button('Imprimir', '', () => window.print()));
    main.appendChild(head);
    const tabs = h('<div class="tabs" role="tablist">' + this.abas.map(([k, l]) => '<button type="button" role="tab" data-k="' + k + '" class="' + (k === this.aba ? 'active' : '') + '">' + l + '</button>').join('') + '</div>');
    $$('button', tabs).forEach((b) => b.addEventListener('click', () => { this.aba = b.dataset.k; this.render(); }));
    main.appendChild(tabs);
    const area = h('<div></div>');
    main.appendChild(area);
    this['p_' + this.aba](area);
  },

  grade(area, tilesHtml) {
    if (tilesHtml) area.appendChild(h('<div class="tiles">' + tilesHtml + '</div>'));
    const g = h('<div class="charts"></div>');
    area.appendChild(g);
    return g;
  },

  /* ---------------- Visão geral ---------------- */
  p_geral(area) {
    const pend = Calc.pendencias();
    const venc = pend.filter((p) => p.s.s === 'VENCIDO' || p.s.s === 'ATRASADO' || p.s.s === 'SEM ESTOQUE' || p.s.s === 'NÃO CONFORME').length;
    const a = this.indicadoresAcidentes();
    const epis = (App.data.epis || []).map((e) => Calc.derivar('epis', e));
    const critico = epis.filter((d) => d._statusEstoque === 'SEM ESTOQUE' || d._statusEstoque === 'ABAIXO').length;
    const desvAbertos = (App.data.desvios || []).filter((r) => Calc.derivar('desvios', r)._statusAcao !== 'CONCLUÍDO').length;
    const g = this.grade(area,
      this.tile('Dias sem acidentes', a.diasSem == null ? '–' : fmtInt(a.diasSem), ['Meta: ' + fmtInt(Config.params.metaDias) + ' dias', this.textoMeta(a.diasSem)].filter(Boolean).join(' · '), 'hero') +
      this.tile('Colaboradores ativos', fmtInt(this.colabsAtivos().length)) +
      this.tile('Acidentes no período', fmtInt(a.total), fmtInt(a.comAfast) + ' com afastamento') +
      this.tile('Pendências vencidas', fmtInt(venc), fmtInt(pend.length - venc) + ' a vencer em ' + Config.params.aVencerDias + ' dias') +
      this.tile('EPIs com estoque crítico', fmtInt(critico)) +
      this.tile('Desvios com ação em aberto', fmtInt(desvAbertos)));

    const card = h('<div class="chart-card wide"><div class="chart-head"><h3>Próximos vencimentos e pendências</h3><button type="button" class="btn btn-ghost">Ver todas</button></div><div></div></div>');
    $('button', card).addEventListener('click', () => App.ir('pendencias'));
    $('div:last-child', card).innerHTML = pend.length ? '<ul class="alert-list">' + pend.slice(0, 12).map((p) => Pendencias.item(p)).join('') + '</ul>' : '<div class="chart-empty">Nenhuma pendência. Tudo em dia.</div>';
    Pendencias.ligar(card);
    g.appendChild(card);

    const meses = this.porMes(App.data.acidentes || [], (r) => r.data);
    g.appendChild(Charts.card('Acidentes por mês' + (this.ano ? ' — ' + this.ano : ''), (b) => Charts.barras(b, { cats: D.meses, series: [{ nome: 'Acidentes', valores: meses }] }), this.tabMes([{ nome: 'Acidentes', valores: meses }])));
    const st = this.coresStatus(this.contar(pend, (p) => p.s.s));
    g.appendChild(Charts.card('Pendências por situação', (b) => Charts.rosca(b, { itens: st }), this.tab(st)));
    const ar = this.contar(pend, (p) => p.area);
    g.appendChild(Charts.card('Pendências por área', (b) => Charts.ranking(b, { itens: ar }), this.tab(ar)));
  },

  textoMeta(dias) {
    const meta = Number(Config.params.metaDias) || 0;
    if (dias == null || !meta) return '';
    return dias >= meta ? 'meta atingida' : Math.round(dias * 100 / meta) + '% da meta';
  },

  /* ---------------- Acidentes ---------------- */
  indicadoresAcidentes() {
    const todos = (App.data.acidentes || []).filter((r) => r.data);
    const lista = todos.filter((r) => this.noPeriodo(r.data));
    const ultimo = todos.reduce((m, r) => (!m || r.data > m ? r.data : m), '');
    const ref = ultimo || (App.emp.fundacao || '');
    const diasSem = ref ? D.diff(ref, D.today()) : null;
    const dias = lista.reduce((s, r) => s + (Calc.derivar('acidentes', r)._diasPerdidos || 0) + (toNum(r.diasDebitados) || 0), 0);
    const ativos = this.colabsAtivos().length;
    // meses do período: ano inteiro, ou até o mês atual no ano corrente
    let meses = this.mes ? 1 : 12;
    const hoje = new Date();
    if (!this.mes && this.ano === String(hoje.getFullYear())) meses = hoje.getMonth() + 1;
    if (!this.ano) {
      const anos = new Set(todos.map((r) => D.year(r.data)));
      meses = Math.max(1, anos.size) * 12;
    }
    const hht = ativos * (Number(Config.params.jornada) || 0) * (Number(Config.params.diasMes) || 0) * meses;
    return {
      lista, total: lista.length, diasSem, ultimo, dias, ativos, hht,
      comAfast: lista.filter((r) => r.afastamento === 'Sim').length,
      tf: hht ? lista.length * 1e6 / hht : null,
      tg: hht ? dias * 1e6 / hht : null,
      indice: ativos ? lista.length * 100 / ativos : null
    };
  },

  p_acidentes(area) {
    const a = this.indicadoresAcidentes();
    const L = a.lista;
    const g = this.grade(area,
      this.tile('Dias sem acidentes', a.diasSem == null ? '–' : fmtInt(a.diasSem), a.ultimo ? 'Último: ' + D.br(a.ultimo) : 'Sem acidentes registrados', 'hero') +
      this.tile('Meta de dias sem acidentes', fmtInt(Config.params.metaDias), this.textoMeta(a.diasSem)) +
      this.tile('Acidentes no período', fmtInt(a.total), fmtInt(a.comAfast) + ' com afastamento') +
      this.tile('Dias perdidos', fmtInt(a.dias)) +
      this.tile('Taxa de frequência', a.tf == null ? '–' : fmtNum(a.tf, 2), 'acidentes × 1.000.000 ÷ HHT') +
      this.tile('Taxa de gravidade', a.tg == null ? '–' : fmtNum(a.tg, 0), 'dias perdidos × 1.000.000 ÷ HHT') +
      this.tile('Acidentes por 100 colaboradores', a.indice == null ? '–' : fmtNum(a.indice, 2)) +
      this.tile('HHT estimado', fmtInt(a.hht), fmtInt(a.ativos) + ' ativos × ' + Config.params.jornada + ' h × ' + Config.params.diasMes + ' dias'));

    const meses = this.porMes(App.data.acidentes || [], (r) => r.data);
    const afast = this.porMes((App.data.acidentes || []).filter((r) => r.afastamento === 'Sim'), (r) => r.data);
    const sMes = [{ nome: 'Sem afastamento', valores: meses.map((v, i) => v - afast[i]) }, { nome: 'Com afastamento', valores: afast }];
    g.appendChild(Charts.card('Acidentes por mês', (b) => Charts.barras(b, { cats: D.meses, series: sMes, empilhar: true }), this.tabMes(sMes), { wide: true }));

    // pirâmide de Bird: acidentes por nível + incidentes + desvios do período
    const niveis = Config.lista('bird');
    const des = (App.data.desvios || []).filter((r) => this.noPeriodo(r.data));
    const cores = ['var(--critical)', 'var(--serious)', 'var(--warning)', 'var(--s1)', 'var(--s7)', 'var(--s3)'];
    const pir = niveis.map((n, i) => ({ nome: n, valor: L.filter((r) => r.bird === n).length, cor: cores[Math.min(i, 3)] }))
      .concat([{ nome: 'Incidentes (quase acidentes)', valor: des.filter((r) => r.classe === 'Incidente').length, cor: cores[4] },
        { nome: 'Desvios / condições inseguras', valor: des.filter((r) => r.classe !== 'Incidente').length, cor: cores[5] }]);
    g.appendChild(Charts.card('Pirâmide de Bird', (b) => Charts.piramide(b, { niveis: pir }), this.tab(pir)));

    const tipo = this.contar(L, (r) => r.tipo);
    g.appendChild(Charts.card('Por tipo de acidente', (b) => Charts.rosca(b, { itens: tipo.slice(0, 6) }), this.tab(tipo)));
    [['Parte do corpo atingida', 'parte'], ['Dano / lesão', 'dano'], ['Agente causador', 'agente'], ['Gravidade', 'gravidade']].forEach(([t, k]) => {
      const it = this.contar(L, (r) => r[k]);
      g.appendChild(Charts.card(t, (b) => Charts.ranking(b, { itens: it }), this.tab(it)));
    });
    const setor = this.contar(L, (r) => (Calc.colab(r.colab) || {}).setor);
    g.appendChild(Charts.card('Por setor', (b) => Charts.ranking(b, { itens: setor }), this.tab(setor)));
    const func = this.contar(L, (r) => (Calc.colab(r.colab) || {}).funcao);
    g.appendChild(Charts.card('Por função', (b) => Charts.ranking(b, { itens: func }), this.tab(func)));
    const sexo = this.contar(L, (r) => ({ M: 'Masculino', F: 'Feminino' })[(Calc.colab(r.colab) || {}).sexo]);
    g.appendChild(Charts.card('Por sexo', (b) => Charts.rosca(b, { itens: sexo }), this.tab(sexo)));
    const horas = new Array(24).fill(0);
    L.forEach((r) => { const m = /^(\d{1,2})/.exec(r.hora || ''); if (m) horas[Math.min(23, +m[1])]++; });
    const cats = horas.map((_, i) => i + 'h');
    g.appendChild(Charts.card('Por horário', (b) => Charts.barras(b, { cats, series: [{ nome: 'Acidentes', valores: horas }] }), { cab: ['Hora', 'Acidentes'], linhas: cats.map((c, i) => [c, horas[i]]) }));
  },

  /* ---------------- Colaboradores ---------------- */
  p_colaboradores(area) {
    const todos = App.data.colaboradores || [];
    const at = this.colabsAtivos();
    const der = at.map((c) => Object.assign({ c }, Calc.derivar('colaboradores', c)));
    const idades = der.filter((d) => d._idade != null).map((d) => d._idade);
    const tempos = der.filter((d) => d._tempoDias != null).map((d) => d._tempoDias);
    const media = (v) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
    const comNasc = at.filter((c) => c.nascimento).sort((a, b) => a.nascimento.localeCompare(b.nascimento));
    const comAdm = at.filter((c) => c.admissao).sort((a, b) => a.admissao.localeCompare(b.admissao));
    const g = this.grade(area,
      this.tile('Colaboradores ativos', fmtInt(at.length), fmtInt(todos.length - at.length) + ' desligados') +
      this.tile('Homens / mulheres', fmtInt(at.filter((c) => c.sexo === 'M').length) + ' / ' + fmtInt(at.filter((c) => c.sexo === 'F').length)) +
      this.tile('Idade média', idades.length ? fmtNum(media(idades), 1) + ' anos' : '–') +
      this.tile('Tempo médio de empresa', tempos.length ? fmtNum(media(tempos) / 365.25, 1) + ' anos' : '–') +
      this.tile('Mais novo', comNasc.length ? esc(comNasc[comNasc.length - 1].nome) : '–', comNasc.length ? Calc.derivar('colaboradores', comNasc[comNasc.length - 1])._idade + ' anos' : '') +
      this.tile('Mais velho', comNasc.length ? esc(comNasc[0].nome) : '–', comNasc.length ? Calc.derivar('colaboradores', comNasc[0])._idade + ' anos' : '') +
      this.tile('Mais antigo na empresa', comAdm.length ? esc(comAdm[0].nome) : '–', comAdm.length ? 'Admissão ' + D.br(comAdm[0].admissao) : '') +
      this.tile('Admissão mais recente', comAdm.length ? esc(comAdm[comAdm.length - 1].nome) : '–', comAdm.length ? D.br(comAdm[comAdm.length - 1].admissao) : ''));
    const faixas = [[14, 20], [21, 25], [26, 30], [31, 40], [41, 50], [51, 60], [61, 200]];
    const cats = faixas.map(([a, b]) => b > 100 ? a + '+' : a + '–' + b);
    const ser = [['M', 'Masculino'], ['F', 'Feminino']].map(([s, nome]) => ({ nome, valores: faixas.map(([a, b]) => der.filter((d) => d.c.sexo === s && d._idade >= a && d._idade <= b).length) }));
    g.appendChild(Charts.card('Faixa etária por sexo', (b) => Charts.barras(b, { cats, series: ser }), { cab: ['Faixa', 'Masculino', 'Feminino'], linhas: cats.map((c, i) => [c, ser[0].valores[i], ser[1].valores[i]]) }));
    const st = this.contar(todos, (c) => c.status);
    g.appendChild(Charts.card('Por situação', (b) => Charts.rosca(b, { itens: st.slice(0, 6) }), this.tab(st)));
    const set = this.contar(at, (c) => c.setor);
    g.appendChild(Charts.card('Por setor', (b) => Charts.ranking(b, { itens: set }), this.tab(set)));
    const fun = this.contar(at, (c) => c.funcao);
    g.appendChild(Charts.card('Por função', (b) => Charts.ranking(b, { itens: fun, max: 12 }), this.tab(fun)));
  },

  /* ---------------- Treinamentos ---------------- */
  p_treinamentos(area) {
    const T = (App.data.treinamentos || []).filter((r) => this.noPeriodo(r.dataFinal || r.dataInicial));
    const concl = T.filter((r) => r.status === 'Concluído');
    const part = concl.reduce((s, r) => s + (r.participantes || []).length, 0);
    const horas = concl.reduce((s, r) => s + (toNum(r.cargaHoraria) || 0) * Math.max(1, (r.participantes || []).length), 0);
    const custo = T.reduce((s, r) => s + (toNum(r.custo) || 0), 0);
    // situação atual da validade por colaborador (independe do período)
    const ult = new Map();
    (App.data.treinamentos || []).forEach((t) => {
      const v = Calc.vencTreino(t); if (!v) return;
      (t.participantes || []).forEach((cid) => {
        const k = cid + '|' + norm(t.treinamento) + '|' + norm(t.norma);
        const u = ult.get(k); if (!u || v > u.v) ult.set(k, { v, t });
      });
    });
    const sit = this.coresStatus(this.contar(Array.from(ult.values()), (x) => Calc.situacao(x.v).s));
    const g = this.grade(area,
      this.tile('Turmas no período', fmtInt(T.length), fmtInt(concl.length) + ' concluídas') +
      this.tile('Participações', fmtInt(part)) +
      this.tile('Horas de treinamento', fmtInt(horas), 'carga horária × participantes') +
      this.tile('Investimento', fmtMoney(custo) || 'R$ 0,00') +
      this.tile('Certificados vencidos', fmtInt((sit.find((s) => s.nome === 'VENCIDO') || {}).valor || 0), 'situação atual') +
      this.tile('A vencer em ' + Config.params.aVencerDias + ' dias', fmtInt((sit.find((s) => s.nome === 'A VENCER') || {}).valor || 0)));
    g.appendChild(Charts.card('Situação atual das validades (por colaborador e curso)', (b) => Charts.rosca(b, { itens: sit }), this.tab(sit)));
    const norma = this.somar(concl, (r) => r.norma, (r) => (r.participantes || []).length || 1);
    g.appendChild(Charts.card('Participações por norma', (b) => Charts.ranking(b, { itens: norma }), this.tab(norma)));
    const mt = this.porMes(concl, (r) => r.dataFinal || r.dataInicial);
    const mh = this.porMes(concl, (r) => r.dataFinal || r.dataInicial, (r) => (toNum(r.cargaHoraria) || 0) * Math.max(1, (r.participantes || []).length));
    g.appendChild(Charts.card('Turmas concluídas por mês', (b) => Charts.barras(b, { cats: D.meses, series: [{ nome: 'Turmas', valores: mt }] }), this.tabMes([{ nome: 'Turmas', valores: mt }])));
    g.appendChild(Charts.card('Horas de treinamento por mês', (b) => Charts.linhas(b, { cats: D.meses, series: [{ nome: 'Horas', valores: mh }] }), this.tabMes([{ nome: 'Horas', valores: mh }])));
    const fin = this.contar(T, (r) => r.finalidade);
    g.appendChild(Charts.card('Por finalidade', (b) => Charts.rosca(b, { itens: fin.slice(0, 6) }), this.tab(fin)));
    const mod = this.contar(T, (r) => r.modalidade);
    g.appendChild(Charts.card('Por modalidade', (b) => Charts.rosca(b, { itens: mod.slice(0, 6) }), this.tab(mod)));
    const inst = this.contar(T, (r) => r.instrutor);
    g.appendChild(Charts.card('Por instrutor', (b) => Charts.ranking(b, { itens: inst }), this.tab(inst)));
  },

  /* ---------------- EPI ---------------- */
  p_epi(area) {
    const epis = (App.data.epis || []).map((e) => Object.assign({ e }, Calc.derivar('epis', e)));
    const M = (App.data.movepi || []).filter((r) => this.noPeriodo(r.data));
    const saidas = M.filter((r) => r.tipo !== 'ENTRADA');
    const custoSaidas = saidas.reduce((s, r) => s + (Calc.derivar('movepi', r)._total || 0), 0);
    const valorEstoque = epis.reduce((s, d) => s + (d._valor || 0), 0);
    const negativos = epis.filter((d) => d._estoque < 0).length;
    // validade de uso: entregas ainda em poder do colaborador (não devolvidas nem substituídas)
    const emUso = (App.data.movepi || []).map((r) => Calc.derivar('movepi', r)).filter((d) => ['VÁLIDO', 'A VENCER', 'VENCIDO'].includes(d._statusTroca));
    const g = this.grade(area,
      this.tile('EPIs cadastrados', fmtInt(epis.length)) +
      this.tile('Valor em estoque', fmtMoney(valorEstoque) || 'R$ 0,00') +
      this.tile('Sem estoque / abaixo do mínimo', fmtInt(epis.filter((d) => d._statusEstoque === 'SEM ESTOQUE').length) + ' / ' + fmtInt(epis.filter((d) => d._statusEstoque === 'ABAIXO').length)) +
      this.tile('CA vencido', fmtInt(epis.filter((d) => d._statusVenc === 'VENCIDO').length), fmtInt(epis.filter((d) => d._statusVenc === 'A VENCER').length) + ' a vencer') +
      this.tile('EPI entregue com troca vencida', fmtInt(emUso.filter((d) => d._statusTroca === 'VENCIDO').length), fmtInt(emUso.filter((d) => d._statusTroca === 'A VENCER').length) + ' a vencer') +
      this.tile('Unidades entregues no período', fmtInt(saidas.reduce((s, r) => s + (Number(r.qtd) || 0), 0)), fmtInt(new Set(saidas.map((r) => r.colab).filter(Boolean)).size) + ' colaboradores') +
      this.tile('Custo das entregas', fmtMoney(custoSaidas) || 'R$ 0,00') +
      (negativos ? this.tile('Estoque negativo', fmtInt(negativos), 'Lance o saldo inicial ou as entradas') : ''));
    const ent = this.porMes(App.data.movepi || [], (r) => r.tipo === 'ENTRADA' ? r.data : null, (r) => r.qtd);
    const sai = this.porMes(App.data.movepi || [], (r) => r.tipo !== 'ENTRADA' ? r.data : null, (r) => r.qtd);
    const ser = [{ nome: 'Entradas', valores: ent }, { nome: 'Saídas', valores: sai }];
    g.appendChild(Charts.card('Entradas e saídas por mês (unidades)', (b) => Charts.barras(b, { cats: D.meses, series: ser }), this.tabMes(ser), { wide: true }));
    const st = this.coresStatus(this.contar(epis, (d) => d._statusEstoque));
    g.appendChild(Charts.card('Situação do estoque', (b) => Charts.rosca(b, { itens: st }), this.tab(st)));
    const ca = this.coresStatus(this.contar(epis.filter((d) => d._statusVenc), (d) => d._statusVenc));
    g.appendChild(Charts.card('Validade dos CAs', (b) => Charts.rosca(b, { itens: ca }), this.tab(ca)));
    const uso = this.coresStatus(this.contar(emUso, (d) => d._statusTroca));
    g.appendChild(Charts.card('Validade dos EPIs em uso', (b) => Charts.rosca(b, { itens: uso }), this.tab(uso)));
    const top = this.somar(saidas, (r) => (Calc.epi(r.epi) || {}).descricao, (r) => r.qtd);
    g.appendChild(Charts.card('EPIs mais entregues', (b) => Charts.ranking(b, { itens: top }), this.tab(top)));
    const quem = this.somar(saidas.filter((r) => r.colab), (r) => Calc.nomeColab(r.colab), (r) => r.qtd);
    g.appendChild(Charts.card('Colaboradores que mais receberam EPI', (b) => Charts.ranking(b, { itens: quem }), this.tab(quem)));
    const med = this.somar(saidas, (r) => r.med, (r) => r.qtd);
    g.appendChild(Charts.card('Entregas por motivo (MED)', (b) => Charts.ranking(b, { itens: med }), this.tab(med)));
    const cm = this.porMes(saidas, (r) => r.data, (r) => Calc.derivar('movepi', r)._total || 0);
    g.appendChild(Charts.card('Custo das entregas por mês', (b) => Charts.barras(b, { cats: D.meses, series: [{ nome: 'Custo', valores: cm }], fmt: (v) => 'R$ ' + fmtNum(v, 0) }), this.tabMes([{ nome: 'Custo (R$)', valores: cm }])));
  },

  /* ---------------- Auditorias e desvios ---------------- */
  p_auditorias(area) {
    const A = (App.data.auditorias || []).filter((r) => this.noPeriodo(r.data) && r.status !== 'Cancelada');
    const nE = A.reduce((s, r) => s + (toNum(r.ncEncontradas) || 0), 0);
    const nR = A.reduce((s, r) => s + (toNum(r.ncResolvidas) || 0), 0);
    const Dv = (App.data.desvios || []).filter((r) => this.noPeriodo(r.data));
    const st = Dv.map((r) => Calc.derivar('desvios', r)._statusAcao);
    const g = this.grade(area,
      this.tile('Auditorias no período', fmtInt(A.length)) +
      this.tile('Não conformidades', fmtInt(nE), fmtInt(nR) + ' resolvidas (' + (nE ? Math.round(nR * 100 / nE) : 0) + '%)') +
      this.tile('Desvios', fmtInt(Dv.filter((r) => r.classe !== 'Incidente').length)) +
      this.tile('Incidentes', fmtInt(Dv.filter((r) => r.classe === 'Incidente').length)) +
      this.tile('Ações atrasadas', fmtInt(st.filter((s) => s === 'ATRASADO').length), fmtInt(st.filter((s) => s === 'EM ABERTO').length) + ' em aberto no prazo'));
    const tipo = this.contar(A, (r) => r.tipo);
    g.appendChild(Charts.card('Auditorias por tipo', (b) => Charts.rosca(b, { itens: tipo.slice(0, 6) }), this.tab(tipo)));
    const ncE = this.porMes(A, (r) => r.data, (r) => r.ncEncontradas);
    const ncR = this.porMes(A, (r) => r.data, (r) => r.ncResolvidas);
    const sNC = [{ nome: 'Encontradas', valores: ncE }, { nome: 'Resolvidas', valores: ncR }];
    g.appendChild(Charts.card('Não conformidades por mês', (b) => Charts.barras(b, { cats: D.meses, series: sNC }), this.tabMes(sNC)));
    const dm = this.porMes(Dv.filter((r) => r.classe !== 'Incidente'), (r) => r.data);
    const im = this.porMes(Dv.filter((r) => r.classe === 'Incidente'), (r) => r.data);
    const sD = [{ nome: 'Desvios', valores: dm }, { nome: 'Incidentes', valores: im }];
    g.appendChild(Charts.card('Desvios e incidentes por mês', (b) => Charts.linhas(b, { cats: D.meses, series: sD }), this.tabMes(sD)));
    const sa = this.coresStatus(this.contar(st, (s) => s));
    g.appendChild(Charts.card('Situação das ações', (b) => Charts.rosca(b, { itens: sa }), this.tab(sa)));
    const dt = this.contar(Dv, (r) => r.tipo);
    g.appendChild(Charts.card('Desvios por tipo', (b) => Charts.ranking(b, { itens: dt }), this.tab(dt)));
    const ds = this.contar(Dv, (r) => r.setor);
    g.appendChild(Charts.card('Desvios por setor', (b) => Charts.ranking(b, { itens: ds }), this.tab(ds)));
    const dg = this.contar(Dv, (r) => r.gravidade);
    g.appendChild(Charts.card('Desvios por gravidade', (b) => Charts.ranking(b, { itens: dg }), this.tab(dg)));
  },

  /* ---------------- 5W2H ---------------- */
  p_planos(area) {
    const P = (App.data.planos || []).filter((r) => !this.ano || this.noPeriodo(r.data || r.prazo));
    const der = P.map((r) => Calc.derivar('planos', r)._prazoStatus);
    const g = this.grade(area,
      this.tile('Planos de ação', fmtInt(P.length)) +
      this.tile('Em aberto', fmtInt(P.filter((r) => r.status === 'EM ABERTO' || r.status === 'AGENDADO').length)) +
      this.tile('Atrasados', fmtInt(der.filter((s) => s === 'ATRASADO').length)) +
      this.tile('Realizados', fmtInt(P.filter((r) => r.status === 'REALIZADO').length)) +
      this.tile('Custo previsto', fmtMoney(P.reduce((s, r) => s + (toNum(r.quanto) || 0), 0)) || 'R$ 0,00'));
    const st = this.coresStatus(this.contar(P, (r) => r.status));
    g.appendChild(Charts.card('Por situação', (b) => Charts.rosca(b, { itens: st }), this.tab(st)));
    const pz = this.coresStatus(this.contar(der, (s) => s));
    g.appendChild(Charts.card('Situação do prazo', (b) => Charts.rosca(b, { itens: pz }), this.tab(pz)));
    const pr = this.contar(P, (r) => r.prioridade);
    g.appendChild(Charts.card('Por prioridade', (b) => Charts.ranking(b, { itens: pr }), this.tab(pr)));
    const q = this.contar(P.filter((r) => r.status !== 'REALIZADO' && r.status !== 'CANCELADO'), (r) => r.quem);
    g.appendChild(Charts.card('Ações em aberto por responsável', (b) => Charts.ranking(b, { itens: q }), this.tab(q)));
  },

  /* ---------------- Riscos ---------------- */
  p_riscos(area) {
    const R = App.data.riscos || [];
    const der = R.map((r) => Object.assign({ r }, Calc.derivar('riscos', r)));
    const g = this.grade(area,
      this.tile('Riscos avaliados', fmtInt(R.length)) +
      Config.params.riscoFaixas.map((f) => this.tile('Risco ' + f.nome.toLowerCase(), fmtInt(der.filter((d) => d._classe === f.nome).length), 'nível ' + f.de + ' a ' + f.ate)).join(''));
    const cor = (n) => {
      const c = Calc.classe(Config.classeRisco(n));
      return { good: 'var(--good-bg)', warning: 'var(--warning-bg)', serious: 'var(--serious-bg)', critical: 'var(--critical-bg)' }[c] || 'var(--surface-2)';
    };
    const card = h('<div class="chart-card"><div class="chart-head"><h3>Matriz de risco (probabilidade × severidade)</h3></div><div class="chart-body"></div></div>');
    let t = '<table class="matrix"><tr><th rowspan="2" style="writing-mode:vertical-rl;transform:rotate(180deg)">Severidade</th>';
    for (let s = 5; s >= 1; s--) {
      if (s < 5) t += '<tr>';
      t += '<th>' + s + ' · ' + esc(Config.params.sevLabels[s - 1]) + '</th>';
      for (let p = 1; p <= 5; p++) {
        const n = der.filter((d) => Number(d.r.prob) === p && Number(d.r.sev) === s).length;
        t += '<td style="background:' + cor(p * s) + '" title="Nível ' + (p * s) + ' — ' + esc(Config.classeRisco(p * s)) + '"><b>' + (n || '') + '</b><div class="small muted">' + (p * s) + '</div></td>';
      }
      t += '</tr>';
    }
    t += '<tr><td></td><td></td>' + [1, 2, 3, 4, 5].map((p) => '<th>' + p + ' · ' + esc(Config.params.probLabels[p - 1]) + '</th>').join('') + '</tr></table><p class="small muted" style="text-align:center">Probabilidade · número em negrito = quantidade de riscos</p>';
    $('.chart-body', card).innerHTML = t;
    g.appendChild(card);
    const cl = this.coresStatus(this.contar(der.filter((d) => d._classe), (d) => d._classe));
    g.appendChild(Charts.card('Por classificação', (b) => Charts.rosca(b, { itens: cl }), this.tab(cl)));
    const tp = this.contar(R, (r) => r.tipo);
    g.appendChild(Charts.card('Por tipo de risco', (b) => Charts.ranking(b, { itens: tp }), this.tab(tp)));
    const se = this.contar(R, (r) => r.setor);
    g.appendChild(Charts.card('Por setor', (b) => Charts.ranking(b, { itens: se }), this.tab(se)));
    const ex = this.somar(R, (r) => r.tipo, (r) => r.expostos);
    g.appendChild(Charts.card('Trabalhadores expostos por tipo de risco', (b) => Charts.ranking(b, { itens: ex }), this.tab(ex)));
  },

  /* ---------------- Extintores e hidrantes ---------------- */
  p_emergencia(area) {
    const E = (App.data.extintores || []).map((r) => Object.assign({ r }, Calc.derivar('extintores', r)));
    const H = (App.data.hidrantes || []).map((r) => Object.assign({ r }, Calc.derivar('hidrantes', r)));
    const g = this.grade(area,
      this.tile('Extintores', fmtInt(E.length)) +
      this.tile('Recarga vencida', fmtInt(E.filter((d) => d._statusRecarga === 'VENCIDO').length), fmtInt(E.filter((d) => d._statusRecarga === 'A VENCER').length) + ' a vencer') +
      this.tile('Teste hidrostático vencido', fmtInt(E.filter((d) => d._statusTH === 'VENCIDO').length)) +
      this.tile('Hidrantes', fmtInt(H.length)) +
      this.tile('Hidrantes com teste vencido', fmtInt(H.filter((d) => d._status === 'VENCIDO').length)) +
      this.tile('Hidrantes com item não conforme', fmtInt(H.filter((d) => d._naoConf).length)));
    const tp = this.contar(E, (d) => d.r.tipo);
    g.appendChild(Charts.card('Extintores por tipo', (b) => Charts.ranking(b, { itens: tp }), this.tab(tp)));
    const rc = this.coresStatus(this.contar(E.filter((d) => d._statusRecarga), (d) => d._statusRecarga));
    g.appendChild(Charts.card('Situação da recarga', (b) => Charts.rosca(b, { itens: rc }), this.tab(rc)));
    const th = this.coresStatus(this.contar(E.filter((d) => d._statusTH), (d) => d._statusTH));
    g.appendChild(Charts.card('Situação do teste hidrostático (extintores)', (b) => Charts.rosca(b, { itens: th }), this.tab(th)));
    // vencimentos nos próximos 12 meses
    const base = new Date(); const cats = []; const vals = [];
    for (let i = 0; i < 12; i++) {
      const dt = new Date(base.getFullYear(), base.getMonth() + i, 1);
      cats.push(D.meses[dt.getMonth()] + '/' + String(dt.getFullYear()).slice(2));
      const pref = D.iso(dt).slice(0, 7);
      vals.push(E.filter((d) => (d._proxRecarga || '').startsWith(pref)).length + H.filter((d) => (d._prox || '').startsWith(pref)).length);
    }
    g.appendChild(Charts.card('Vencimentos nos próximos 12 meses', (b) => Charts.barras(b, { cats, series: [{ nome: 'Vencimentos', valores: vals }] }), { cab: ['Mês', 'Vencimentos'], linhas: cats.map((c, i) => [c, vals[i]]) }));
  }
};

/* ---------------- Página de pendências ---------------- */
const Pendencias = {
  area: '', sit: '',
  item(p) {
    const cls = Calc.classe(p.s.s) || 'critical';
    const dias = p.s.dias != null ? (p.s.dias < 0 ? 'há ' + Math.abs(p.s.dias) + ' dias' : p.s.dias === 0 ? 'hoje' : 'em ' + p.s.dias + ' dias') : '';
    return '<li><div><div><b>' + esc(p.desc) + '</b></div><div class="a-what">' + esc(p.area) + (p.quem ? ' · ' + esc(p.quem) : '') + (p.venc ? ' · ' + D.br(p.venc) : '') + '</div></div>' +
      '<div style="text-align:right"><span class="badge b-' + cls + '">' + esc(p.s.s) + '</span><div class="a-what">' + dias + '</div>' +
      '<button type="button" class="btn btn-sm btn-ghost" data-mod="' + p.mod + '" data-id="' + p.id + '">Abrir</button></div></li>';
  },
  ligar(root) {
    $$('button[data-mod]', root).forEach((b) => b.addEventListener('click', () => {
      const r = (App.data[b.dataset.mod] || []).find((x) => x.id === b.dataset.id);
      if (r) Forms.abrir(b.dataset.mod, r);
    }));
  },
  render() {
    const main = $('#main');
    const P = Calc.pendencias();
    const areas = Array.from(new Set(P.map((p) => p.area))).sort();
    const sits = Array.from(new Set(P.map((p) => p.s.s))).sort();
    const L = P.filter((p) => (!this.area || p.area === this.area) && (!this.sit || p.s.s === this.sit));
    main.innerHTML = '';
    const head = h('<div class="page-head"><div><h1>Pendências e vencimentos</h1><p>Itens vencidos ou que vencem em até ' + Config.params.aVencerDias + ' dias (prazo ajustável em Configurações).</p></div><div class="toolbar"></div></div>');
    $('.toolbar', head).append(button('Imprimir', '', () => Reports.imprimirPendencias(L)), button('Exportar CSV', '', () => {
      const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
      const lin = [['Área', 'Pendência', 'Responsável / local', 'Vencimento', 'Situação'].map(q).join(';')].concat(L.map((p) => [p.area, p.desc, p.quem, D.br(p.venc), p.s.s].map(q).join(';')));
      download(slugArquivo(App.emp.nome) + '-pendencias-' + D.today() + '.csv', '﻿' + lin.join('\r\n'), 'text/csv;charset=utf-8');
    }));
    main.appendChild(head);
    const f = h('<div class="filters"><select aria-label="Área"><option value="">Todas as áreas</option>' + areas.map((a) => '<option' + (a === this.area ? ' selected' : '') + '>' + esc(a) + '</option>').join('') + '</select>' +
      '<select aria-label="Situação"><option value="">Todas as situações</option>' + sits.map((a) => '<option' + (a === this.sit ? ' selected' : '') + '>' + esc(a) + '</option>').join('') + '</select></div>');
    const [s1, s2] = $$('select', f);
    s1.addEventListener('change', () => { this.area = s1.value; this.render(); });
    s2.addEventListener('change', () => { this.sit = s2.value; this.render(); });
    main.appendChild(f);
    const card = h('<div class="card">' + (L.length ? '<ul class="alert-list">' + L.map((p) => this.item(p)).join('') + '</ul>' : '<div class="empty">Nenhuma pendência encontrada.</div>') + '</div>');
    this.ligar(card);
    main.appendChild(card);
  }
};
