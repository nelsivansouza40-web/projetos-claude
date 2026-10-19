/*
 * Documentos para impressão: Ficha de EPI (NR-06), OSS, Plano 5W2H, prontuário
 * do colaborador, calendário eleitoral da CIPA, listas e pendências.
 * Todos levam o cabeçalho com nome, CNPJ e logotipo da empresa configurada.
 */
const Reports = {
  cabecalho(titulo) {
    const e = App.emp || {};
    const end = [e.endereco, e.cidade && e.uf ? e.cidade + ' - ' + e.uf : (e.cidade || e.uf), e.cep ? 'CEP ' + e.cep : ''].filter(Boolean).join(' · ');
    return '<div class="doc-head">' + (e.logo ? '<img src="' + e.logo + '" alt="">' : '') +
      '<div class="emp"><b>' + esc(e.nome || '') + '</b><br>' + (e.cnpj ? 'CNPJ: ' + esc(e.cnpj) + '<br>' : '') + esc(end) + '</div>' +
      '<div style="text-align:right;font-size:9pt">Emitido em ' + D.br(D.today()) + '</div></div>' + (titulo ? '<h1>' + esc(titulo) + '</h1>' : '');
  },

  imprimir(html) {
    const area = $('#print-area');
    area.innerHTML = '<div class="doc">' + html + '</div>';
    document.body.classList.add('printing');
    const fim = () => { document.body.classList.remove('printing'); area.innerHTML = ''; window.removeEventListener('afterprint', fim); };
    window.addEventListener('afterprint', fim);
    setTimeout(() => window.print(), 50);
  },

  imprimirLista(mod, rs) {
    const m = MOD[mod];
    const cols = m.colunas;
    const html = this.cabecalho(m.nome) + '<table><thead><tr>' + cols.map((k) => '<th>' + esc(rotulo(mod, k)) + '</th>').join('') + '</tr></thead><tbody>' +
      rs.map((r) => '<tr>' + cols.map((k) => '<td>' + esc(Calc.texto(mod, r, k)) + '</td>').join('') + '</tr>').join('') + '</tbody></table>' +
      '<p style="font-size:9pt">Total: ' + rs.length + ' registro(s)</p>';
    this.imprimir(html);
  },

  imprimirPendencias(L) {
    this.imprimir(this.cabecalho('Pendências e vencimentos') + '<table><thead><tr><th>Área</th><th>Pendência</th><th>Responsável / local</th><th>Vencimento</th><th>Situação</th></tr></thead><tbody>' +
      L.map((p) => '<tr><td>' + esc(p.area) + '</td><td>' + esc(p.desc) + '</td><td>' + esc(p.quem) + '</td><td>' + D.br(p.venc) + '</td><td>' + esc(p.s.s) + '</td></tr>').join('') + '</tbody></table>');
  },

  imprimirRegistro(mod, r) {
    if (mod === 'oss') return this.imprimir(this.htmlOSS(r));
    if (mod === 'planos') return this.imprimir(this.html5W2H(r));
  },

  bloco(titulo, txt) { return '<h2>' + esc(titulo) + '</h2><div class="txt">' + esc(txt || '') + '</div>'; },

  htmlOSS(r) {
    const c = Calc.colab(r.colab) || {};
    return this.cabecalho('ORDEM DE SERVIÇO DE SEGURANÇA E SAÚDE NO TRABALHO') +
      '<table><tr><th>OSS nº</th><td>' + esc(r.numero) + '</td><th>Elaboração</th><td>' + D.br(r.data) + '</td><th>Revisão</th><td>' + D.br(r.dataRevisao) + '</td></tr>' +
      '<tr><th>Colaborador</th><td colspan="3">' + esc(c.nome) + '</td><th>Matrícula</th><td>' + esc(c.matricula) + '</td></tr>' +
      '<tr><th>Função</th><td colspan="3">' + esc(c.funcao) + '</td><th>Setor</th><td>' + esc(c.setor) + '</td></tr></table>' +
      '<p class="decl" style="font-size:9pt">Em cumprimento ao art. 157, inciso II, da CLT e à NR-01 (item 1.4.1, alínea c).</p>' +
      this.bloco('Objetivo', r.objetivo) + this.bloco('Descrição das atividades', r.atividades) + this.bloco('Riscos das atividades', r.riscos) +
      this.bloco('EPIs obrigatórios', r.epis) + this.bloco('Medidas preventivas', r.medidas) + this.bloco('Obrigações', r.obrigacoes) +
      this.bloco('Sanções', r.sancoes) + this.bloco('Procedimentos em caso de acidente', r.procedimentos) + this.bloco('Normas internas', r.normas) +
      (r.obs ? this.bloco('Observações', r.obs) : '') + this.bloco('Termo de responsabilidade', r.termo) +
      '<div class="sign"><div>' + esc(c.nome || 'Colaborador') + '</div><div>' + esc(App.emp.responsavel || 'Responsável pela segurança') + '</div></div>';
  },

  html5W2H(r) {
    const linha = (a, b) => '<tr><th style="width:30%">' + a + '</th><td style="white-space:pre-wrap">' + esc(b || '') + '</td></tr>';
    return this.cabecalho('PLANO DE AÇÃO 5W2H') +
      '<table>' + linha('Plano', r.nome) + linha('Situação', r.status) + linha('Prioridade', r.prioridade) + linha('Data de abertura', D.br(r.data)) +
      linha('O quê? (What)', r.oque) + linha('Por quê? (Why)', r.porque) + linha('Quem? (Who)', r.quem) + linha('Onde? (Where)', r.onde) +
      linha('Quando? (When)', D.br(r.prazo)) + linha('Como? (How)', r.como) + linha('Quanto custa? (How much)', r.quanto != null && r.quanto !== '' ? fmtMoney(r.quanto) : '') +
      linha('Observações', r.obs) + '</table><div class="sign"><div>Responsável</div><div>' + esc(App.emp.responsavel || 'Segurança do Trabalho') + '</div></div>';
  },

  /* ---------------- Ficha de EPI ---------------- */
  fichaColab: '',
  fichaHTML(cid) {
    const c = Calc.colab(cid);
    if (!c) return '';
    const movs = (App.data.movepi || []).filter((m) => m.colab === cid).sort((a, b) => (a.data || '').localeCompare(b.data || ''));
    return this.cabecalho('FICHA DE CONTROLE DE ENTREGA DE EPI') +
      '<table><tr><th>Colaborador</th><td colspan="3">' + esc(c.nome) + '</td><th>Matrícula</th><td>' + esc(c.matricula) + '</td></tr>' +
      '<tr><th>CPF</th><td>' + esc(c.cpf) + '</td><th>Função</th><td>' + esc(c.funcao) + '</td><th>Setor</th><td>' + esc(c.setor) + '</td></tr>' +
      '<tr><th>Admissão</th><td>' + D.br(c.admissao) + '</td><th>RG</th><td>' + esc(c.rg) + '</td><th>Situação</th><td>' + esc(c.status) + '</td></tr></table>' +
      '<p class="decl">' + esc(Config.params.declaracaoEPI) + '</p>' +
      '<table><thead><tr><th>Data</th><th>Qtd</th><th>EPI</th><th>CA</th><th>MED</th><th>Troca prevista</th><th>Devolução</th><th style="width:20%">Assinatura</th></tr></thead><tbody>' +
      (movs.length ? movs.map((m) => {
        const e = Calc.epi(m.epi) || {};
        return '<tr><td>' + D.br(m.data) + '</td><td>' + esc(m.qtd) + '</td><td>' + esc((e.descricao || '') + (e.fabricante ? ' — ' + e.fabricante : '')) + '</td><td>' + esc(e.ca) + '</td><td>' + esc(this.codMED(m.med)) + '</td><td>' + D.br(Calc.vencEntrega(m)) + '</td><td>' + D.br(m.devolucao) + '</td><td></td></tr>';
      }).join('') : '<tr><td colspan="8">Nenhuma entrega registrada.</td></tr>') +
      '</tbody></table><p style="font-size:8.5pt"><b>MED — Motivo da entrega ou devolução:</b> ' + Config.lista('med').map((t, i) => (i + 1) + ' - ' + esc(t)).join('; ') + '.</p>' +
      '<div class="sign"><div>' + esc(c.nome) + '</div><div>' + esc(App.emp.responsavel || 'Responsável pela entrega') + '</div></div>';
  },
  codMED(t) {
    if (!t) return '';
    const i = Config.lista('med').findIndex((x) => norm(x) === norm(t));
    return i >= 0 ? String(i + 1) : t;
  },

  paginaFicha() {
    const main = $('#main');
    main.innerHTML = '';
    const ops = Forms.opcoesRef('colab');
    const head = h('<div class="page-head"><div><h1>Ficha de EPI</h1><p>Ficha individual de entrega conforme NR-06, gerada a partir das movimentações de saída.</p></div><div class="toolbar"></div></div>');
    main.appendChild(head);
    const box = h('<div class="card"><div class="row"><label class="field">Colaborador<input type="text" list="dl_ficha" placeholder="Digite o nome" autocomplete="off"><datalist id="dl_ficha">' +
      ops.map((o) => '<option value="' + esc(o.label) + '">').join('') + '</datalist></label></div></div>');
    main.appendChild(box);
    const prev = h('<div class="doc-preview" style="margin-top:14px"><div class="muted">Escolha um colaborador para ver a ficha.</div></div>');
    main.appendChild(prev);
    const inp = $('input', box);
    const tb = $('.toolbar', head);
    const bImp = button('Imprimir ficha', 'btn-primary', () => { if (this.fichaColab) this.imprimir(this.fichaHTML(this.fichaColab)); });
    const bNova = button('+ Registrar entrega', '', () => Forms.abrir('movepi', null, { tipo: 'SAÍDA', destino: 'Funcionário', colab: this.fichaColab || '' }));
    tb.append(bNova, bImp);
    const mostrar = () => {
      const id = Forms.resolverRef('colab', inp.value);
      this.fichaColab = id || '';
      prev.innerHTML = id ? '<div class="doc">' + this.fichaHTML(id) + '</div>' : '<div class="muted">Escolha um colaborador para ver a ficha.</div>';
    };
    inp.addEventListener('change', mostrar);
    if (this.fichaColab) { const c = Calc.colab(this.fichaColab); if (c) { inp.value = Forms.rotuloColab(c); mostrar(); } }
  },

  /* ---------------- Prontuário (pesquisa por nome, CPF ou RG) ---------------- */
  pront: '',
  paginaProntuario() {
    const main = $('#main');
    main.innerHTML = '';
    main.appendChild(h('<div class="page-head"><div><h1>Pesquisa do colaborador</h1><p>Busque por nome, CPF, RG ou matrícula e veja tudo o que está registrado para a pessoa.</p></div></div>'));
    const box = h('<div class="card"><label class="field">Nome, CPF, RG ou matrícula<input type="search" placeholder="Ex.: 123.456.789-00"></label><div id="pr-res" style="margin-top:10px"></div></div>');
    main.appendChild(box);
    const out = h('<div style="margin-top:14px"></div>');
    main.appendChild(out);
    const inp = $('input', box), res = $('#pr-res', box);
    const dig = (s) => String(s || '').replace(/\D/g, '');
    const buscar = () => {
      const q = norm(inp.value), qd = dig(inp.value);
      if (q.length < 2) { res.innerHTML = ''; return; }
      const achados = (App.data.colaboradores || []).filter((c) => norm(c.nome).includes(q) || (qd.length >= 3 && (dig(c.cpf).includes(qd) || dig(c.rg).includes(qd))) || norm(c.matricula) === q).slice(0, 30);
      res.innerHTML = achados.length ? achados.map((c) => '<button type="button" class="btn btn-sm" data-id="' + c.id + '" style="margin:2px">' + esc(c.nome) + (c.cpf ? ' · ' + esc(c.cpf) : '') + '</button>').join('') : '<span class="muted">Nenhum colaborador encontrado.</span>';
      $$('button', res).forEach((b) => b.addEventListener('click', () => { this.pront = b.dataset.id; mostrar(); }));
    };
    const mostrar = () => {
      const html = this.prontuarioHTML(this.pront);
      out.innerHTML = '';
      if (!html) return;
      const tb = h('<div class="toolbar" style="margin-bottom:8px"></div>');
      tb.append(button('Imprimir', 'btn-primary', () => this.imprimir(this.prontuarioHTML(this.pront))),
        button('Editar cadastro', '', () => Forms.abrir('colaboradores', Calc.colab(this.pront))));
      out.append(tb, h('<div class="doc-preview"><div class="doc">' + html + '</div></div>'));
    };
    inp.addEventListener('input', buscar);
    if (this.pront) mostrar();
  },

  prontuarioHTML(cid) {
    const c = Calc.colab(cid);
    if (!c) return '';
    const d = Calc.derivar('colaboradores', c);
    const tab = (titulo, cab, linhas) => '<h2>' + esc(titulo) + ' (' + linhas.length + ')</h2>' + (linhas.length
      ? '<table><thead><tr>' + cab.map((x) => '<th>' + esc(x) + '</th>').join('') + '</tr></thead><tbody>' + linhas.map((l) => '<tr>' + l.map((v) => '<td>' + esc(v) + '</td>').join('') + '</tr>').join('') + '</tbody></table>'
      : '<p style="font-size:9pt">Nenhum registro.</p>');
    const ts = (App.data.treinamentos || []).filter((t) => (t.participantes || []).includes(cid)).sort((a, b) => (b.dataFinal || '').localeCompare(a.dataFinal || ''));
    const asos = (App.data.aso || []).filter((a) => a.colab === cid).sort((a, b) => (b.data || '').localeCompare(a.data || ''));
    const movs = (App.data.movepi || []).filter((m) => m.colab === cid).sort((a, b) => (b.data || '').localeCompare(a.data || ''));
    const ac = (App.data.acidentes || []).filter((a) => a.colab === cid);
    const adv = (App.data.advertencias || []).filter((a) => a.colab === cid);
    const cipa = (App.data.cipa || []).filter((a) => a.colab === cid);
    const dds = (App.data.dds || []).filter((x) => (x.participantes || []).includes(cid));
    return this.cabecalho('PRONTUÁRIO DO COLABORADOR') +
      '<table><tr><th>Nome</th><td colspan="3">' + esc(c.nome) + '</td><th>Matrícula</th><td>' + esc(c.matricula) + '</td></tr>' +
      '<tr><th>CPF</th><td>' + esc(c.cpf) + '</td><th>RG</th><td>' + esc(c.rg) + '</td><th>Situação</th><td>' + esc(c.status) + '</td></tr>' +
      '<tr><th>Função</th><td>' + esc(c.funcao) + '</td><th>Setor</th><td>' + esc(c.setor) + '</td><th>Sexo</th><td>' + esc(c.sexo) + '</td></tr>' +
      '<tr><th>Nascimento</th><td>' + D.br(c.nascimento) + (d._idade != null ? ' (' + d._idade + ' anos)' : '') + '</td><th>Admissão</th><td>' + D.br(c.admissao) + '</td><th>Tempo de empresa</th><td>' + esc(d._tempo || '') + '</td></tr></table>' +
      tab('Treinamentos', ['Treinamento', 'Norma', 'Conclusão', 'Vencimento', 'Situação'], ts.map((t) => { const v = Calc.vencTreino(t); return [t.treinamento, t.norma || '', D.br(t.dataFinal || t.dataInicial), D.br(v), v ? Calc.situacao(v).s : (t.status || '')]; })) +
      tab('ASO', ['Tipo', 'Emissão', 'Resultado', 'Vencimento', 'Situação'], asos.map((a) => { const v = Calc.vencASO(a); return [a.tipo || '', D.br(a.data), a.resultado || '', D.br(v), a.atualizado === 'Sim' ? 'SUBSTITUÍDO' : (v ? Calc.situacao(v).s : '')]; })) +
      tab('Entregas de EPI', ['Data', 'Qtd', 'EPI', 'CA', 'MED', 'Troca prevista', 'Situação'], movs.map((m) => { const e = Calc.epi(m.epi) || {}; const q = Calc.derivar('movepi', m); return [D.br(m.data), m.qtd, e.descricao || '', e.ca || '', m.med || '', D.br(q._troca), q._statusTroca || '']; })) +
      tab('Acidentes', ['Data', 'Tipo', 'Lesão', 'Parte do corpo', 'Dias perdidos'], ac.map((a) => [D.br(a.data), a.tipo || '', a.dano || '', a.parte || '', String(Calc.derivar('acidentes', a)._diasPerdidos || 0)])) +
      tab('Advertências', ['Data', 'Medida', 'Ato faltoso'], adv.map((a) => [D.br(a.data), a.medida || '', a.ato || ''])) +
      tab('CIPA', ['Gestão', 'Representação', 'Posse', 'Fim do mandato', 'Fim da estabilidade'], cipa.map((x) => { const q = Calc.derivar('cipa', x); return [x.gestao || '', x.representa || '', D.br(x.posse), D.br(q._fimMandato), D.br(q._fimEstab)]; })) +
      tab('DDS', ['Data', 'Tema', 'Instrutor'], dds.map((x) => [D.br(x.data), x.tema || '', x.instrutor || '']));
  },

  /* ---------------- Calendário eleitoral da CIPA ---------------- */
  paginaCalendarioCIPA() {
    const main = $('#main');
    const p = Config.params;
    // sugere o fim do mandato a partir dos membros cadastrados
    const fins = (App.data.cipa || []).filter((r) => r.posse).map((r) => Calc.derivar('cipa', r)._fimMandato).sort();
    const sugerido = p.cipaFimMandato || fins[fins.length - 1] || '';
    main.innerHTML = '';
    main.appendChild(h('<div class="page-head"><div><h1>Calendário eleitoral da CIPA</h1><p>Informe o término do mandato atual. As datas são calculadas pelos prazos abaixo, que podem ser ajustados.</p></div></div>'));
    const card = h('<div class="card"><div class="row"><label class="field">Término do mandato atual<input type="date" id="cipa-fim" value="' + esc(sugerido) + '"></label>' +
      '<label class="field">Gestão (vigência)<input type="text" id="cipa-gestao" value="' + esc(p.cipaGestao || '') + '" placeholder="Ex.: 2026/2027"></label>' +
      '<label class="field">Presidente da CIPA<input type="text" id="cipa-pres" value="' + esc(p.cipaPresidente || '') + '"></label>' +
      '<label class="field">Secretário da CIPA<input type="text" id="cipa-sec" value="' + esc(p.cipaSecretario || '') + '"></label></div>' +
      '<div class="table-wrap" style="margin-top:12px"><table class="data"><thead><tr><th>#</th><th>Tarefa</th><th class="num">Dias</th><th>Antes/depois</th><th>Referência</th><th>Data</th></tr></thead><tbody id="cipa-tb"></tbody></table></div>' +
      '<p class="small muted">NR-05: a eleição deve ocorrer no prazo mínimo de 30 dias antes do término do mandato; o processo eleitoral começa no mínimo 60 dias antes. Confira a convenção coletiva da categoria.</p>' +
      '<div class="toolbar"></div></div>');
    main.appendChild(card);
    const refs = { fim: 'término do mandato', eleicao: 'data da eleição' };
    const calcular = () => {
      const fim = $('#cipa-fim', card).value;
      const eleIdx = p.cipaPrazos.findIndex((x) => /realiza.*elei/i.test(x.t));
      const ele = fim && eleIdx >= 0 ? D.addDays(fim, p.cipaPrazos[eleIdx].d * p.cipaPrazos[eleIdx].dir) : '';
      return p.cipaPrazos.map((x, i) => {
        const base = x.ref === 'eleicao' ? ele : fim;
        return Object.assign({}, x, { i, data: base ? D.addDays(base, x.d * x.dir) : '' });
      }).sort((a, b) => (a.data || '').localeCompare(b.data || '') || a.i - b.i);
    };
    const desenhar = () => {
      const L = calcular();
      $('#cipa-tb', card).innerHTML = L.map((x, i) => '<tr><td>' + (i + 1) + '</td><td>' + esc(x.t) + '</td><td class="num"><input type="number" min="0" data-i="' + x.i + '" value="' + x.d + '" style="width:70px" aria-label="Dias"></td>' +
        '<td>' + (x.dir < 0 ? 'antes' : 'depois') + '</td><td>' + refs[x.ref] + '</td><td><b>' + (x.data ? D.br(x.data) : '–') + '</b></td></tr>').join('');
      $$('#cipa-tb input', card).forEach((inp) => inp.addEventListener('change', async () => {
        p.cipaPrazos[+inp.dataset.i].d = Math.max(0, Number(inp.value) || 0);
        await Config.salvar(); desenhar();
      }));
    };
    ['cipa-fim', 'cipa-gestao', 'cipa-pres', 'cipa-sec'].forEach((id) => $('#' + id, card).addEventListener('change', async () => {
      p.cipaFimMandato = $('#cipa-fim', card).value; p.cipaGestao = $('#cipa-gestao', card).value;
      p.cipaPresidente = $('#cipa-pres', card).value; p.cipaSecretario = $('#cipa-sec', card).value;
      await Config.salvar(); desenhar();
    }));
    $('.toolbar', card).append(button('Imprimir calendário', 'btn-primary', () => {
      const L = calcular();
      this.imprimir(this.cabecalho('CALENDÁRIO DO PROCESSO ELEITORAL DA CIPA') +
        '<table><tr><th>Término do mandato atual</th><td>' + D.br($('#cipa-fim', card).value) + '</td><th>Gestão</th><td>' + esc($('#cipa-gestao', card).value) + '</td></tr></table>' +
        '<table><thead><tr><th>#</th><th>Tarefa</th><th>Prazo</th><th>Data</th></tr></thead><tbody>' +
        L.map((x, i) => '<tr><td>' + (i + 1) + '</td><td>' + esc(x.t) + '</td><td>' + (x.d ? x.d + ' dia(s) ' + (x.dir < 0 ? 'antes' : 'depois') + ' da ' + refs[x.ref] : 'no dia (' + refs[x.ref] + ')') + '</td><td>' + D.br(x.data) + '</td></tr>').join('') +
        '</tbody></table><div class="sign"><div>' + esc($('#cipa-sec', card).value || 'Secretário(a) da CIPA') + '<br>Secretário(a)</div><div>' + esc($('#cipa-pres', card).value || 'Presidente da CIPA') + '<br>Presidente</div></div>');
    }));
    desenhar();
  }
};
