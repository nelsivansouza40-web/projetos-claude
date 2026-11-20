/*
 * Conformidade por função:
 *  - Matriz de treinamentos: cada função tem os treinamentos obrigatórios
 *    (cadastro "Treinamentos obrigatórios por função"); o sistema confere os
 *    treinamentos de cada colaborador ativo e mostra quem nunca fez, está
 *    vencido ou está em dia.
 *  - Programação de exames do PCMSO: cada função tem os exames e a
 *    periodicidade (cadastro "PCMSO — exames por função"); a data do último
 *    exame vem do ASO cujo campo "Exames realizados" cita o exame.
 */
const chaveNorma = (s) => norm(s).replace(/[^a-z0-9]/g, '');
const ehClinico = (exame) => /clinic/.test(norm(exame));

const Matriz = {
  ativos() { return (App.data.colaboradores || []).filter((c) => norm(c.status) !== 'demitido' && !c.desligamento); },
  exigencias(funcao) { return (App.data.matriz || []).filter((r) => norm(r.funcao) === norm(funcao)); },

  /** Situação de um colaborador diante de uma exigência: { s, venc, t } */
  situacao(cid, req) {
    let ts = (App.data.treinamentos || []).filter((t) => (t.participantes || []).includes(cid) && t.status !== 'Cancelado' && t.status !== 'Agendado');
    if (req.norma) {
      ts = ts.filter((t) => chaveNorma(t.norma) === chaveNorma(req.norma));
      const porNome = ts.filter((t) => this.mesmoNome(t.treinamento, req.treinamento));
      if (porNome.length) ts = porNome;
    } else ts = ts.filter((t) => this.mesmoNome(t.treinamento, req.treinamento));
    if (!ts.length) return { s: 'NUNCA FEZ', venc: '', t: null };
    const t = ts.sort((a, b) => (b.dataFinal || b.dataInicial || '').localeCompare(a.dataFinal || a.dataInicial || ''))[0];
    let venc = Calc.vencTreino(t);
    const proprio = !!venc;
    if (!venc && toNum(req.validadeMeses)) venc = D.addMonths(t.dataFinal || t.dataInicial, toNum(req.validadeMeses));
    if (!venc) return { s: 'EM DIA', venc: '', t, proprio };
    const st = Calc.situacao(venc);
    return { s: st.s === 'VÁLIDO' ? 'EM DIA' : st.s, venc, t, dias: st.dias, proprio };
  },
  mesmoNome(a, b) {
    const x = norm(a), y = norm(b);
    return !!x && !!y && (x.includes(y) || y.includes(x));
  },

  /** Resumo de uma exigência: quantos colaboradores da função e quantos em dia. */
  resumo(req) {
    const cs = this.ativos().filter((c) => norm(c.funcao) === norm(req.funcao));
    const ok = cs.filter((c) => this.situacao(c.id, req).s === 'EM DIA').length;
    return { total: cs.length, ok };
  },

  pendencias(add) {
    const reqs = App.data.matriz || [];
    if (!reqs.length) return;
    this.ativos().forEach((c) => {
      this.exigencias(c.funcao).forEach((req) => {
        const st = this.situacao(c.id, req);
        const desc = req.treinamento + (req.norma ? ' (' + req.norma + ')' : '') + ' — obrigatório para ' + (c.funcao || 'a função');
        if (st.s === 'NUNCA FEZ') add('Treinamento obrigatório', desc, c.nome, '', { s: 'NUNCA FEZ', dias: null }, 'colaboradores', c.id);
        // vencimento pela reciclagem da matriz (o vencimento próprio do treinamento já entra nas pendências de Treinamento)
        else if (!st.proprio && (st.s === 'VENCIDO' || st.s === 'A VENCER')) add('Treinamento obrigatório', desc, c.nome, st.venc, { s: st.s, dias: st.dias }, 'treinamentos', st.t.id);
      });
    });
  },

  /* ---------------- Tela ---------------- */
  filtroSetor: '',
  pagina() {
    const main = $('#main');
    main.innerHTML = '';
    const head = h('<div class="page-head"><div><h1>Matriz de treinamentos</h1><p>Treinamentos obrigatórios de cada função e a situação de cada colaborador ativo.</p></div><div class="toolbar"></div></div>');
    $('.toolbar', head).append(
      button('Editar exigências por função', '', () => App.ir('m:matriz')),
      button('Imprimir', 'btn-primary', () => Reports.imprimir(Reports.cabecalho('MATRIZ DE TREINAMENTOS POR FUNÇÃO') + this.html(true))));
    main.appendChild(head);
    if (!(App.data.matriz || []).length) {
      main.appendChild(h('<div class="card empty">Nenhuma exigência cadastrada. Use "Editar exigências por função" e informe, para cada função, os treinamentos obrigatórios (por exemplo: Eletricista — NR 10 e NR 35).</div>'));
      return;
    }
    const setores = [...new Set(this.ativos().map((c) => c.setor).filter(Boolean))].sort();
    const f = h('<div class="filters"><select aria-label="Setor"><option value="">Todos os setores</option>' + setores.map((s) => '<option' + (s === this.filtroSetor ? ' selected' : '') + '>' + esc(s) + '</option>').join('') + '</select></div>');
    $('select', f).addEventListener('change', (e) => { this.filtroSetor = e.target.value; this.pagina(); });
    main.appendChild(f);
    main.appendChild(h('<div>' + this.html(false) + '</div>'));
  },

  html(impressao) {
    const funcoes = [...new Set((App.data.matriz || []).map((r) => r.funcao))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    let total = 0, ok = 0, nunca = 0, venc = 0;
    const blocos = funcoes.map((fn) => {
      const reqs = this.exigencias(fn).sort((a, b) => (a.norma || '').localeCompare(b.norma || ''));
      const cs = this.ativos().filter((c) => norm(c.funcao) === norm(fn) && (!this.filtroSetor || impressao || c.setor === this.filtroSetor)).sort((a, b) => a.nome.localeCompare(b.nome));
      if (!cs.length) return '';
      const linhas = cs.map((c) => '<tr><td>' + esc(c.nome) + '</td><td>' + esc(c.setor || '') + '</td>' + reqs.map((r) => {
        const st = this.situacao(c.id, r);
        total++;
        if (st.s === 'EM DIA') ok++; else if (st.s === 'NUNCA FEZ') nunca++; else if (st.s === 'VENCIDO') venc++;
        const cls = Calc.classe(st.s);
        return '<td>' + (impressao ? esc(st.s) + (st.venc ? '<br><small>' + D.br(st.venc) + '</small>' : '')
          : '<span class="badge b-' + cls + '">' + esc(st.s) + '</span>' + (st.venc ? '<div class="small muted">' + D.br(st.venc) + '</div>' : '')) + '</td>';
      }).join('') + '</tr>').join('');
      return '<h2 class="mx-fn">' + esc(fn) + ' <span class="muted small">(' + cs.length + ' colaborador' + (cs.length === 1 ? '' : 'es') + ')</span></h2>' +
        '<div class="table-wrap"><table class="data"><thead><tr><th>Colaborador</th><th>Setor</th>' +
        reqs.map((r) => '<th>' + esc(r.treinamento) + (r.norma ? '<br><span class="muted small">' + esc(r.norma) + '</span>' : '') + '</th>').join('') + '</tr></thead><tbody>' + linhas + '</tbody></table></div>';
    }).join('');
    const perc = total ? Math.round(ok * 100 / total) : 0;
    const resumo = impressao
      ? '<p><b>Conformidade: ' + perc + '%</b> (' + ok + ' de ' + total + ' exigências em dia) · Nunca fizeram: ' + nunca + ' · Vencidos: ' + venc + '</p>'
      : '<div class="tiles">' + Paineis.tile('Conformidade', perc + '%', ok + ' de ' + total + ' exigências em dia', 'hero') +
        Paineis.tile('Nunca fizeram', fmtInt(nunca), 'treinamentos obrigatórios') + Paineis.tile('Vencidos', fmtInt(venc), 'precisam de reciclagem') + '</div>';
    return resumo + (blocos || '<div class="card empty">Nenhum colaborador ativo nas funções cadastradas' + (this.filtroSetor ? ' neste setor' : '') + '.</div>');
  },

  /** Seção para o prontuário do colaborador. */
  prontuario(c) {
    const reqs = this.exigencias(c.funcao);
    if (!reqs.length) return '';
    return '<h2>Treinamentos obrigatórios da função (' + reqs.length + ')</h2><table><thead><tr><th>Treinamento</th><th>Norma</th><th>Situação</th><th>Vencimento</th></tr></thead><tbody>' +
      reqs.map((r) => { const st = this.situacao(c.id, r); return '<tr><td>' + esc(r.treinamento) + '</td><td>' + esc(r.norma || '') + '</td><td>' + esc(st.s) + '</td><td>' + D.br(st.venc) + '</td></tr>'; }).join('') + '</tbody></table>';
  }
};

const Pcmso = {
  /** Situação de um exame para um colaborador: { s, ultimo, prox } */
  situacao(c, req) {
    const asos = (App.data.aso || []).filter((a) => a.colab === c.id && a.data && a.tipo !== 'Demissional')
      .sort((a, b) => b.data.localeCompare(a.data));
    const nome = norm(req.exame);
    const chave = nome.split(/[\s(]/)[0];
    const feito = ehClinico(req.exame) ? asos[0] : asos.find((a) => norm(a.exames).includes(chave));
    if (!feito) return { s: 'SEM REGISTRO', ultimo: '', prox: '' };
    const meses = toNum(req.periodicidadeMeses);
    if (!meses) return { s: 'EM DIA', ultimo: feito.data, prox: '' };
    const prox = D.addMonths(feito.data, meses);
    const st = Calc.situacao(prox);
    return { s: st.s === 'VÁLIDO' ? 'EM DIA' : st.s, ultimo: feito.data, prox, dias: st.dias, aso: feito };
  },

  linhas() {
    const L = [];
    Matriz.ativos().forEach((c) => {
      (App.data.pcmso || []).filter((r) => norm(r.funcao) === norm(c.funcao)).forEach((req) => {
        L.push(Object.assign({ c, req }, this.situacao(c, req)));
      });
    });
    return L.sort((a, b) => (a.prox || '0000').localeCompare(b.prox || '0000') || a.c.nome.localeCompare(b.c.nome));
  },

  pendencias(add) {
    if (!(App.data.pcmso || []).length) return;
    this.linhas().forEach((x) => {
      if (ehClinico(x.req.exame)) return; // o exame clínico já entra como pendência de ASO
      if (x.s === 'VENCIDO' || x.s === 'A VENCER' || x.s === 'SEM REGISTRO') {
        add('Exame do PCMSO', x.req.exame + ' — ' + (x.c.funcao || ''), x.c.nome, x.prox, { s: x.s, dias: x.dias == null ? null : x.dias }, 'colaboradores', x.c.id);
      }
    });
  },

  filtro: '',
  pagina() {
    const main = $('#main');
    main.innerHTML = '';
    const head = h('<div class="page-head"><div><h1>Programação de exames do PCMSO</h1><p>Exames de cada colaborador ativo conforme a função, com a data do último exame e a do próximo.</p></div><div class="toolbar"></div></div>');
    const L0 = this.linhas();
    const L = L0.filter((x) => !this.filtro || x.s === this.filtro);
    $('.toolbar', head).append(
      button('Editar exames por função', '', () => App.ir('m:pcmso')),
      button('Imprimir', 'btn-primary', () => Reports.imprimir(Reports.cabecalho('PROGRAMAÇÃO DE EXAMES DO PCMSO') + this.tabela(L, true))));
    main.appendChild(head);
    if (!(App.data.pcmso || []).length) {
      main.appendChild(h('<div class="card empty">Nenhum exame cadastrado. Use "Editar exames por função" e informe os exames do PCMSO de cada função, com a periodicidade.</div>'));
      return;
    }
    const conta = (s) => L0.filter((x) => x.s === s).length;
    const f = h('<div class="filters"><select aria-label="Situação"><option value="">Todas as situações (' + L0.length + ')</option>' +
      ['VENCIDO', 'A VENCER', 'SEM REGISTRO', 'EM DIA'].map((s) => '<option value="' + s + '"' + (s === this.filtro ? ' selected' : '') + '>' + s + ' (' + conta(s) + ')</option>').join('') + '</select></div>');
    $('select', f).addEventListener('change', (e) => { this.filtro = e.target.value; this.pagina(); });
    main.appendChild(f);
    main.appendChild(h('<div class="card">' + this.tabela(L, false) + '</div>'));
  },

  tabela(L, impressao) {
    if (!L.length) return '<div class="empty">Nenhum exame nesta situação.</div>';
    return '<div class="table-wrap"><table class="data"><thead><tr><th>Colaborador</th><th>Função</th><th>Exame</th><th class="num">Periodicidade</th><th>Último</th><th>Próximo</th><th>Situação</th></tr></thead><tbody>' +
      L.map((x) => '<tr><td>' + esc(x.c.nome) + '</td><td>' + esc(x.c.funcao || '') + '</td><td>' + esc(x.req.exame) + '</td><td class="num">' + esc(x.req.periodicidadeMeses || '') + ' m</td><td>' + D.br(x.ultimo) + '</td><td>' + D.br(x.prox) + '</td><td>' +
        (impressao ? esc(x.s) : '<span class="badge b-' + Calc.classe(x.s) + '">' + esc(x.s) + '</span>') + '</td></tr>').join('') + '</tbody></table></div>' +
      '<p class="small muted">O exame é reconhecido pelo nome citado no campo "Exames realizados" do ASO. O exame clínico considera o último ASO.</p>';
  }
};
