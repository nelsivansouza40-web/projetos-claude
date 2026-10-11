/*
 * Formulário genérico de cadastro, montado a partir do schema de cada módulo.
 * Listas são flexíveis: um valor novo digitado entra automaticamente na lista
 * da empresa (Configurações > Listas).
 */
const Forms = {
  rotuloColab(c) { return c.nome + (c.matricula ? ' (mat. ' + c.matricula + ')' : ''); },

  opcoesRef(t) {
    if (t === 'colab') {
      return (App.data.colaboradores || []).slice().sort((a, b) => a.nome.localeCompare(b.nome))
        .map((c) => ({ id: c.id, label: this.rotuloColab(c), alt: c.nome, inativo: norm(c.status) === 'demitido' }));
    }
    if (t === 'epi') return (App.data.epis || []).map((e) => ({ id: e.id, label: Calc.nomeEpi(e.id), alt: e.descricao })).sort((a, b) => a.label.localeCompare(b.label));
    if (t === 'equip') return (App.data.equipamentos || []).map((e) => ({ id: e.id, label: Calc.nomeEquip(e.id), alt: e.nome })).sort((a, b) => a.label.localeCompare(b.label));
    return [];
  },

  resolverRef(t, texto) {
    const s = norm(texto);
    if (!s) return '';
    const ops = this.opcoesRef(t);
    const a = ops.find((o) => norm(o.label) === s) || ops.find((o) => norm(o.alt) === s);
    return a ? a.id : null;
  },

  campoHTML(mod, c, r) {
    const v = r[c.k];
    const id = 'f_' + c.k;
    const req = c.req ? ' required' : '';
    const wcls = c.w === 4 ? 'w4' : c.w === 2 ? 'w2' : '';
    let inp = '';
    switch (c.t) {
      case 'textarea': inp = '<textarea id="' + id + '" name="' + c.k + '"' + req + '>' + esc(v) + '</textarea>'; break;
      case 'date': inp = '<input type="date" id="' + id + '" name="' + c.k + '" value="' + esc(v) + '"' + req + '>'; break;
      case 'time': inp = '<input type="time" id="' + id + '" name="' + c.k + '" value="' + esc(v) + '">'; break;
      case 'num': case 'money':
        inp = '<input type="text" inputmode="decimal" id="' + id + '" name="' + c.k + '" value="' + esc(v == null ? '' : String(v).replace('.', ',')) + '"' + req + '>'; break;
      case 'sel': {
        const dl = 'dl_' + c.k;
        inp = '<input type="text" id="' + id + '" name="' + c.k + '" list="' + dl + '" value="' + esc(v) + '" autocomplete="off"' + req + '>' +
          '<datalist id="' + dl + '">' + Config.lista(c.lista).map((o) => '<option value="' + esc(o) + '">').join('') + '</datalist>';
        break;
      }
      case 'opt': case 'sn': {
        const ops = c.t === 'sn' ? SN : c.opts;
        inp = '<select id="' + id + '" name="' + c.k + '"' + req + '>' + (ops.includes('') ? '' : '<option value=""></option>') +
          ops.map((o) => '<option' + (String(v) === String(o) ? ' selected' : '') + ' value="' + esc(o) + '">' + esc(o || '—') + '</option>').join('') + '</select>';
        break;
      }
      case 'checks': {
        const arr = Array.isArray(v) ? v : [];
        inp = '<div class="check-list" data-checks="' + c.k + '">' + c.opts.map((o) =>
          '<label><input type="checkbox" value="' + esc(o) + '"' + (arr.includes(o) ? ' checked' : '') + '> ' + esc(o) + '</label>').join('') + '</div>';
        break;
      }
      case 'colab': case 'epi': case 'equip': {
        const dl = 'dl_' + c.k;
        const ops = this.opcoesRef(c.t);
        const atual = ops.find((o) => o.id === v);
        inp = '<input type="text" id="' + id + '" name="' + c.k + '" data-ref="' + c.t + '" list="' + dl + '" autocomplete="off" placeholder="Digite para buscar" value="' + esc(atual ? atual.label : '') + '"' + req + '>' +
          '<datalist id="' + dl + '">' + ops.filter((o) => !o.inativo || o.id === v).map((o) => '<option value="' + esc(o.label) + '">').join('') + '</datalist>';
        break;
      }
      case 'multicolab': {
        const sel = new Set(Array.isArray(v) ? v : []);
        const ops = this.opcoesRef('colab').filter((o) => !o.inativo || sel.has(o.id));
        const setores = Config.lista('setores');
        inp = '<div class="multi-box" data-multi="' + c.k + '">' +
          '<div class="toolbar" style="margin-bottom:6px"><input type="search" placeholder="Filtrar nomes" style="flex:1;min-width:160px">' +
          (setores.length ? '<select data-setor style="width:auto"><option value="">Marcar setor…</option>' + setores.map((s) => '<option>' + esc(s) + '</option>').join('') + '</select>' : '') +
          '<button type="button" class="btn btn-sm" data-todos>Marcar visíveis</button><button type="button" class="btn btn-sm" data-nenhum>Limpar</button>' +
          '<span class="muted small" data-cont></span></div><div class="check-list">' +
          (ops.length ? ops.map((o) => '<label data-nome="' + esc(norm(o.label)) + '"><input type="checkbox" value="' + o.id + '"' + (sel.has(o.id) ? ' checked' : '') + '> ' + esc(o.label) + '</label>').join('')
            : '<span class="muted">Cadastre colaboradores para selecionar participantes.</span>') + '</div></div>';
        break;
      }
      default: inp = '<input type="text" id="' + id + '" name="' + c.k + '" value="' + esc(v) + '"' + req + '>';
    }
    const hint = c.hint ? '<span class="hint">' + esc(c.hint) + '</span>' : '';
    return '<label class="field ' + wcls + '" data-campo="' + c.k + '"' + (c.t === 'multicolab' || c.t === 'checks' ? ' role="group"' : ' for="' + id + '"') + '>' + esc(c.l) + (c.req ? ' *' : '') + inp + hint + '</label>';
  },

  ler(mod, form, base) {
    const r = Object.assign({}, base);
    const erros = [];
    const novos = [];
    MOD[mod].campos.forEach((c) => {
      if (c.t === 'checks') { r[c.k] = $$('[data-checks="' + c.k + '"] input:checked', form).map((i) => i.value); return; }
      if (c.t === 'multicolab') { r[c.k] = $$('[data-multi="' + c.k + '"] .check-list input:checked', form).map((i) => i.value); return; }
      const el = form.elements[c.k];
      if (!el) return;
      let v = el.value.trim();
      if (c.t === 'num' || c.t === 'money') {
        if (v === '') v = '';
        else { const n = toNum(v); if (n == null) erros.push(c.l + ': número inválido'); v = n; }
      } else if (['colab', 'epi', 'equip'].includes(c.t)) {
        if (v) {
          const id = this.resolverRef(c.t, v);
          if (id) v = id;
          else if (c.t === 'colab') { novos.push({ campo: c.k, nome: v }); v = ''; }
          else { erros.push(c.l + ': "' + v + '" não está cadastrado'); v = ''; }
        }
      }
      r[c.k] = v;
    });
    return { r, erros, novos };
  },

  validar(mod, r, novos) {
    const falta = MOD[mod].campos.filter((c) => c.req && (!c.se || c.se(r)) &&
      (r[c.k] == null || r[c.k] === '' || (Array.isArray(r[c.k]) && !r[c.k].length)) && !novos.some((n) => n.campo === c.k));
    return falta.map((c) => c.l);
  },

  previa(mod, form, base) {
    const box = $('.computed-box', form);
    if (!box) return;
    const { r } = this.ler(mod, form, base);
    r.__v = -1;
    const cols = MOD[mod].colunas.filter((k) => k.startsWith('_'));
    const d = Calc.derivar(mod, r);
    r.__d = d; r.__v = App.versao;
    const partes = cols.map((k) => {
      const html = Calc.html(mod, r, k);
      return html ? '<span><span class="muted">' + esc(rotulo(mod, k)) + ':</span> ' + html + '</span>' : '';
    }).filter(Boolean);
    box.innerHTML = partes.length ? partes.join('') : '<span class="muted">Os campos calculados aparecem aqui conforme o preenchimento.</span>';
    MOD[mod].campos.forEach((c) => {
      if (!c.se) return;
      const lab = $('[data-campo="' + c.k + '"]', form);
      if (lab) lab.hidden = !c.se(r);
    });
  },

  abrir(mod, rec, preset) {
    const m = MOD[mod];
    const novo = !rec;
    const base = rec ? Object.assign({}, rec) : {};
    if (novo) {
      m.campos.forEach((c) => {
        if (c.padrao != null) base[c.k] = c.padrao;
        if (c.padraoParam) base[c.k] = Config.params[c.padraoParam] || '';
        if (c.t === 'date' && c.req && !base[c.k]) base[c.k] = D.today();
      });
      Object.assign(base, preset || {});
    }
    const temCalc = m.colunas.some((k) => k.startsWith('_') && !['_ano', '_mes'].includes(k));
    const form = h('<form class="form-grid" novalidate>' + (m.ajuda ? '<div class="notice w4">' + esc(m.ajuda) + '</div>' : '') +
      m.campos.map((c) => this.campoHTML(mod, c, base)).join('') + (temCalc ? '<div class="computed-box"></div>' : '') + '</form>');

    // seleção múltipla
    $$('[data-multi]', form).forEach((box) => {
      const busca = $('input[type=search]', box);
      const cont = $('[data-cont]', box);
      const atualizar = () => { cont.textContent = $$('.check-list input:checked', box).length + ' selecionado(s)'; };
      busca.addEventListener('input', () => {
        const q = norm(busca.value);
        $$('.check-list label', box).forEach((l) => { l.hidden = q && !l.dataset.nome.includes(q); });
      });
      $('[data-todos]', box).addEventListener('click', () => { $$('.check-list label:not([hidden]) input', box).forEach((i) => { i.checked = true; }); atualizar(); });
      $('[data-nenhum]', box).addEventListener('click', () => { $$('.check-list input', box).forEach((i) => { i.checked = false; }); atualizar(); });
      const st = $('[data-setor]', box);
      if (st) st.addEventListener('change', () => {
        const ids = new Set((App.data.colaboradores || []).filter((c) => c.setor === st.value && norm(c.status) !== 'demitido').map((c) => c.id));
        $$('.check-list input', box).forEach((i) => { if (ids.has(i.value)) i.checked = true; });
        st.value = ''; atualizar();
      });
      box.addEventListener('change', atualizar);
      atualizar();
    });

    form.addEventListener('input', () => this.previa(mod, form, base));
    form.addEventListener('change', () => this.previa(mod, form, base));
    this.extras(mod, form, base);
    this.previa(mod, form, base);

    const salvar = async (continuar) => {
      const { r, erros, novos } = this.ler(mod, form, base);
      const falta = this.validar(mod, r, novos);
      if (falta.length || erros.length) {
        toast((falta.length ? 'Preencha: ' + falta.join(', ') + '. ' : '') + erros.join('. '), 4500);
        return;
      }
      for (const n of novos) {
        const ok = await confirmar('"' + n.nome + '" não está cadastrado em Colaboradores. Cadastrar agora com esse nome?', 'Cadastrar');
        if (!ok) { Modal.open({ title: novo ? novoRotulo(m) : 'Editar ' + m.singular, body: form, foot: rodape }); return; }
        const c = await App.salvar('colaboradores', { nome: n.nome });
        r[n.campo] = c.id;
      }
      // listas flexíveis
      let mudouLista = false;
      m.campos.forEach((c) => { if (c.t === 'sel' && Config.absorver(c.lista, r[c.k])) mudouLista = true; });
      if (mudouLista) await Config.salvar();
      await App.salvar(mod, r);
      toast(novo ? 'Registro incluído' : 'Alterações salvas');
      if (continuar) {
        Modal.close();
        const keep = {};
        if (mod === 'movepi') ['tipo', 'data', 'colab', 'destino', 'fornecedor', 'med'].forEach((k) => { keep[k] = r[k]; });
        if (mod === 'manutencoes' || mod === 'acidentes') keep.data = r.data;
        this.abrir(mod, null, keep);
      } else Modal.close();
    };

    const rodape = [];
    if (!novo) rodape.push(button('Excluir', 'btn-danger', async () => {
      if (await confirmar('Excluir este registro? Esta ação não pode ser desfeita.', 'Excluir', true)) {
        await App.excluir(mod, rec.id); toast('Registro excluído');
      } else this.abrir(mod, rec);
    }));
    if (!novo && m.imprimir) rodape.push(button('Imprimir', '', () => Reports.imprimirRegistro(mod, rec)));
    rodape.push(button('Cancelar', '', () => Modal.close()));
    if (novo) rodape.push(button('Salvar e incluir outro', '', () => salvar(true)));
    rodape.push(button('Salvar', 'btn-primary', () => salvar(false)));
    form.addEventListener('submit', (e) => { e.preventDefault(); salvar(false); });

    Modal.open({ title: novo ? novoRotulo(m) : 'Editar ' + m.singular, body: form, foot: rodape });
  },

  /** Comportamentos específicos de alguns módulos. */
  extras(mod, form, base) {
    if (mod === 'oss') {
      const b = button('Preencher pela função do colaborador', 'btn-sm', () => {
        const id = this.resolverRef('colab', form.elements.colab.value);
        const c = id && Calc.colab(id);
        if (!c) { toast('Escolha primeiro um colaborador cadastrado.'); return; }
        const a = (App.data.atividades || []).find((x) => norm(x.funcao) === norm(c.funcao));
        if (!a) { toast('Não há cadastro em "Atividades por função" para a função ' + (c.funcao || '(sem função)') + '.', 4000); return; }
        ['atividades', 'riscos', 'epis', 'medidas', 'obrigacoes', 'sancoes', 'procedimentos', 'normas', 'obs'].forEach((k) => {
          if (form.elements[k] && a[k]) form.elements[k].value = a[k];
        });
        toast('Campos preenchidos com o padrão da função ' + c.funcao);
      });
      const alvo = $('[data-campo="objetivo"]', form);
      const wrap = h('<div class="w4"></div>'); wrap.appendChild(b);
      form.insertBefore(wrap, alvo);
    }
    if (mod === 'movepi') {
      const atualizarPreco = () => {
        const id = this.resolverRef('epi', form.elements.epi.value);
        const e = id && Calc.epi(id);
        form.elements.preco.placeholder = e && e.preco != null && e.preco !== '' ? 'Cadastro: ' + fmtMoney(e.preco) : '';
      };
      form.elements.epi.addEventListener('change', atualizarPreco);
      atualizarPreco();
    }
    if (mod === 'aso') {
      form.elements.medico.addEventListener('change', () => {
        const m = /CRM[\s:-]*([\w\/.-]+)/i.exec(form.elements.medico.value);
        if (m && !form.elements.crm.value) form.elements.crm.value = m[1];
      });
    }
  }
};
