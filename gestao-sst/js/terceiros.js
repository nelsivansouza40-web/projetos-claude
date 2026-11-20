/*
 * Gestão de terceiros: empresas contratadas, seus trabalhadores e documentos.
 * Cada trabalhador fica LIBERADO, em ATENÇÃO (documento perto de vencer) ou
 * BLOQUEADO (contrato encerrado, documento obrigatório ausente ou vencido),
 * e a tela "Liberação de acesso" gera a lista para a portaria.
 * Os documentos obrigatórios ficam nas listas de Configurações.
 */
const Terceiros = {
  docs(contratada, terceiro) {
    return (App.data.docsterceiros || []).filter((d) => d.contratada === contratada && (terceiro === undefined ? true : (d.terceiro || '') === (terceiro || '')));
  },
  /** Documento mais recente de um tipo. */
  ultimo(lista, tipo) {
    return lista.filter((d) => norm(d.documento) === norm(tipo)).sort((a, b) => (b.validade || b.emissao || '').localeCompare(a.validade || a.emissao || ''))[0] || null;
  },
  sitDoc(d) { return d.validade ? Calc.situacao(d.validade) : { s: 'VÁLIDO', dias: null }; },

  /** Problemas da empresa (valem para todos os seus trabalhadores). */
  problemasEmpresa(e) {
    const bloq = [], alerta = [];
    if (!e) return { bloq: ['Empresa não encontrada'], alerta };
    if (e.status && e.status !== 'Ativa') bloq.push('Empresa ' + e.status.toLowerCase());
    if (e.fim) {
      const st = Calc.situacao(e.fim);
      if (st.s === 'VENCIDO') bloq.push('Contrato encerrado em ' + D.br(e.fim));
      else if (st.s === 'A VENCER') alerta.push('Contrato termina em ' + D.br(e.fim));
    }
    const docsEmp = this.docs(e.id, '');
    Config.lista('docsObrigContratada').forEach((tipo) => {
      const d = this.ultimo(docsEmp, tipo);
      if (!d) bloq.push('Sem ' + tipo);
    });
    const tipos = [...new Set(docsEmp.map((d) => norm(d.documento)))];
    tipos.forEach((t) => {
      const d = this.ultimo(docsEmp, t);
      const st = this.sitDoc(d);
      if (st.s === 'VENCIDO') bloq.push(d.documento + ' vencido');
      else if (st.s === 'A VENCER') alerta.push(d.documento + ' vence em ' + D.br(d.validade));
    });
    return { bloq, alerta };
  },

  /** Situação de um trabalhador: { s: LIBERADO | ATENÇÃO | BLOQUEADO, motivos } */
  liberacao(t) {
    if (t.status === 'Desligado') return { s: 'DESLIGADO', motivos: [] };
    const e = (App.data.contratadas || []).find((x) => x.id === t.contratada);
    const pe = this.problemasEmpresa(e);
    const bloq = pe.bloq.slice(), alerta = pe.alerta.slice();
    const meus = this.docs(t.contratada, t.id);
    Config.lista('docsObrigTrabalhador').forEach((tipo) => { if (!this.ultimo(meus, tipo)) bloq.push('Sem ' + tipo); });
    [...new Set(meus.map((d) => norm(d.documento)))].forEach((tipo) => {
      const d = this.ultimo(meus, tipo);
      const st = this.sitDoc(d);
      if (st.s === 'VENCIDO') bloq.push(d.documento + ' vencido');
      else if (st.s === 'A VENCER') alerta.push(d.documento + ' vence em ' + D.br(d.validade));
    });
    if (bloq.length) return { s: 'BLOQUEADO', motivos: bloq.concat(alerta) };
    if (alerta.length) return { s: 'ATENÇÃO', motivos: alerta };
    return { s: 'LIBERADO', motivos: [] };
  },

  derivar(mod, r, o) {
    if (mod === 'terceiros') {
      const l = this.liberacao(r);
      o._liberacao = l.s; o._pendDocs = l.motivos.join('; ');
    } else if (mod === 'contratadas') {
      const ts = (App.data.terceiros || []).filter((t) => t.contratada === r.id && t.status !== 'Desligado');
      o._trab = ts.length;
      o._liberados = ts.filter((t) => this.liberacao(t).s !== 'BLOQUEADO').length;
      const pe = this.problemasEmpresa(r);
      o._situacao = pe.bloq.length ? 'COM PENDÊNCIAS' : (!ts.length ? 'SEM TRABALHADORES' : (o._liberados < ts.length ? 'COM PENDÊNCIAS' : 'DOCUMENTOS EM DIA'));
    } else if (mod === 'docsterceiros') {
      o._venc = r.validade || '';
      const st = r.validade ? Calc.situacao(r.validade) : { s: '', dias: null };
      o._statusVenc = st.s; o._diasVenc = st.dias;
    }
  },

  pendencias(add) {
    const ativas = new Set((App.data.contratadas || []).filter((e) => e.status === 'Ativa').map((e) => e.id));
    const vivos = new Set((App.data.terceiros || []).filter((t) => t.status !== 'Desligado').map((t) => t.id));
    // só o documento mais recente de cada tipo, por trabalhador ou empresa
    const ult = new Map();
    (App.data.docsterceiros || []).forEach((d) => {
      if (!d.validade || !ativas.has(d.contratada) || (d.terceiro && !vivos.has(d.terceiro))) return;
      const k = d.contratada + '|' + (d.terceiro || '') + '|' + norm(d.documento);
      const u = ult.get(k);
      if (!u || d.validade > u.validade) ult.set(k, d);
    });
    ult.forEach((d) => {
      const st = Calc.situacao(d.validade);
      if (st.s === 'VENCIDO' || st.s === 'A VENCER') {
        const quem = d.terceiro ? Calc.nomeTerceiro(d.terceiro) : Calc.nomeContratada(d.contratada);
        add('Terceiros', d.documento + (d.terceiro ? '' : ' (empresa)'), quem, d.validade, st, 'docsterceiros', d.id);
      }
    });
    (App.data.contratadas || []).forEach((e) => {
      if (e.status !== 'Ativa' || !e.fim) return;
      const st = Calc.situacao(e.fim);
      if (st.s === 'VENCIDO' || st.s === 'A VENCER') add('Terceiros', 'Fim do contrato — ' + (e.servico || 'serviço'), e.nome, e.fim, st, 'contratadas', e.id);
    });
  },

  /* ---------------- Tela de liberação de acesso ---------------- */
  filtroEmp: '',
  pagina() {
    const main = $('#main');
    main.innerHTML = '';
    const emps = (App.data.contratadas || []).filter((e) => e.status !== 'Encerrada').sort((a, b) => a.nome.localeCompare(b.nome));
    const head = h('<div class="page-head"><div><h1>Liberação de acesso de terceiros</h1><p>Situação de cada trabalhador terceiro conforme os documentos da empresa e os dele. Imprima a lista para a portaria.</p></div><div class="toolbar"></div></div>');
    const lista = () => (App.data.terceiros || []).filter((t) => t.status !== 'Desligado' && (!this.filtroEmp || t.contratada === this.filtroEmp))
      .map((t) => Object.assign({ t }, this.liberacao(t))).sort((a, b) => Calc.nomeContratada(a.t.contratada).localeCompare(Calc.nomeContratada(b.t.contratada)) || a.t.nome.localeCompare(b.t.nome));
    $('.toolbar', head).append(
      button('Empresas', '', () => App.ir('m:contratadas')),
      button('Trabalhadores', '', () => App.ir('m:terceiros')),
      button('Documentos', '', () => App.ir('m:docsterceiros')),
      button('Imprimir lista da portaria', 'btn-primary', () => Reports.imprimir(Reports.cabecalho('LISTA DE LIBERAÇÃO DE ACESSO — TERCEIROS') + this.tabela(lista(), true) +
        '<p style="font-size:9pt">Situação em ' + D.br(D.today()) + '. Trabalhador BLOQUEADO não deve entrar na área até regularizar os documentos com o SESMT.</p>')));
    main.appendChild(head);
    if (!emps.length) {
      main.appendChild(h('<div class="card empty">Nenhuma empresa contratada cadastrada. Comece por "Empresas", depois cadastre os trabalhadores e os documentos de cada um.</div>'));
      return;
    }
    const f = h('<div class="filters"><select aria-label="Empresa"><option value="">Todas as empresas</option>' + emps.map((e) => '<option value="' + e.id + '"' + (e.id === this.filtroEmp ? ' selected' : '') + '>' + esc(e.nome) + '</option>').join('') + '</select></div>');
    $('select', f).addEventListener('change', (e) => { this.filtroEmp = e.target.value; this.pagina(); });
    main.appendChild(f);
    const L = lista();
    const n = (s) => L.filter((x) => x.s === s).length;
    main.appendChild(h('<div class="tiles">' + Paineis.tile('Liberados', fmtInt(n('LIBERADO')), 'documentos em dia', 'hero') +
      Paineis.tile('Atenção', fmtInt(n('ATENÇÃO')), 'documento perto de vencer') + Paineis.tile('Bloqueados', fmtInt(n('BLOQUEADO')), 'não podem entrar na área') + '</div>'));
    const card = h('<div class="card">' + this.tabela(L, false) + '</div>');
    $$('tr[data-id]', card).forEach((tr) => tr.addEventListener('click', () => {
      const t = (App.data.terceiros || []).find((x) => x.id === tr.dataset.id);
      if (t) this.fichaTrabalhador(t);
    }));
    main.appendChild(card);
  },

  tabela(L, impressao) {
    if (!L.length) return '<div class="empty">Nenhum trabalhador terceiro ativo.</div>';
    return '<div class="table-wrap"><table class="data"><thead><tr><th>Trabalhador</th><th>CPF</th><th>Empresa</th><th>Função</th><th>Situação</th><th>Motivo</th></tr></thead><tbody>' +
      L.map((x) => '<tr' + (impressao ? '' : ' data-id="' + x.t.id + '" style="cursor:pointer"') + '><td>' + esc(x.t.nome) + '</td><td>' + esc(x.t.cpf || '') + '</td><td>' + esc(Calc.nomeContratada(x.t.contratada)) + '</td><td>' + esc(x.t.funcao || '') + '</td><td>' +
        (impressao ? '<b>' + esc(x.s) + '</b>' : '<span class="badge b-' + Calc.classe(x.s) + '">' + esc(x.s) + '</span>') + '</td><td>' + esc(x.motivos.join('; ')) + '</td></tr>').join('') + '</tbody></table></div>';
  },

  /** Documentos de um trabalhador, com atalho para incluir o que falta. */
  fichaTrabalhador(t) {
    const l = this.liberacao(t);
    const meus = this.docs(t.contratada, t.id).sort((a, b) => a.documento.localeCompare(b.documento));
    const body = h('<div><p><b>' + esc(t.nome) + '</b> · ' + esc(Calc.nomeContratada(t.contratada)) + (t.funcao ? ' · ' + esc(t.funcao) : '') + '</p>' +
      '<p><span class="badge b-' + Calc.classe(l.s) + '">' + esc(l.s) + '</span> ' + esc(l.motivos.join('; ')) + '</p>' +
      '<h3>Documentos do trabalhador</h3>' + (meus.length ? '<table class="data"><thead><tr><th>Documento</th><th>Emissão</th><th>Vencimento</th><th>Situação</th></tr></thead><tbody>' +
        meus.map((d) => { const st = this.sitDoc(d); return '<tr data-doc="' + d.id + '" style="cursor:pointer"><td>' + esc(d.documento) + '</td><td>' + D.br(d.emissao) + '</td><td>' + D.br(d.validade) + '</td><td><span class="badge b-' + Calc.classe(st.s) + '">' + esc(st.s) + '</span></td></tr>'; }).join('') + '</tbody></table>'
        : '<p class="muted">Nenhum documento cadastrado.</p>') + '</div>');
    $$('tr[data-doc]', body).forEach((tr) => tr.addEventListener('click', () => Forms.abrir('docsterceiros', (App.data.docsterceiros || []).find((d) => d.id === tr.dataset.doc))));
    Modal.open({
      title: 'Documentos do trabalhador', body,
      foot: [button('Editar cadastro', '', () => Forms.abrir('terceiros', t)),
        button('+ Incluir documento', '', () => Forms.abrir('docsterceiros', null, { contratada: t.contratada, terceiro: t.id })),
        button('Fechar', 'btn-primary', () => Modal.close())]
    });
  }
};
