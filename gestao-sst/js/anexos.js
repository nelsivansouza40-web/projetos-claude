/*
 * Anexos de registros: assinatura na tela e evidência fotográfica (hoje usados
 * no DDS). Cada arquivo vira uma ou mais linhas do módulo interno "anexos",
 * fatiado em partes menores que o limite de uma célula da planilha da equipe
 * (49 mil caracteres), para sincronizar como qualquer outro registro.
 *
 * Registro: { id, mod: 'anexos', ref, tipo: 'assinatura' | 'foto', colab,
 *             grupo, parte, partes, dados }
 */
const Anexos = {
  PARTE: 40000,

  /** Arquivos montados de um registro: [{ grupo, tipo, colab, url, criadoEm }]. */
  lista(ref, tipo) {
    const grupos = new Map();
    (App.data.anexos || []).forEach((a) => {
      if ((ref != null && a.ref !== ref) || (tipo && a.tipo !== tipo)) return;
      const g = grupos.get(a.grupo) || { grupo: a.grupo, tipo: a.tipo, colab: a.colab || '', partes: a.partes, criadoEm: a.criadoEm || '', assinadoEm: a.assinadoEm || '', codigo: a.codigo || '', resumo: a.resumo || '', ref: a.ref, pedacos: [] };
      g.pedacos[a.parte] = a.dados;
      grupos.set(a.grupo, g);
    });
    return [...grupos.values()]
      .filter((g) => g.pedacos.filter((p) => p != null).length === g.partes) // ainda chegando da planilha: ignora
      .map((g) => ({ grupo: g.grupo, tipo: g.tipo, colab: g.colab, criadoEm: g.criadoEm, assinadoEm: g.assinadoEm, codigo: g.codigo, resumo: g.resumo, ref: g.ref, url: g.pedacos.join('') }))
      .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
  },

  assinatura(ref, colab) {
    const a = this.assinaturaInfo(ref, colab);
    return a ? a.url : '';
  },
  /** Assinatura com data, hora e código de verificação: { url, assinadoEm, codigo } */
  assinaturaInfo(ref, colab) {
    const l = this.lista(ref, 'assinatura').filter((a) => a.colab === colab);
    return l.length ? l[l.length - 1] : null;
  },

  /** Código de verificação: os 12 primeiros caracteres do SHA-256 do que foi assinado. */
  async codigo(texto) {
    let hex = '';
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
      hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      // navegador sem crypto.subtle: hash FNV-1a, mais simples, só para não ficar sem código
      let h1 = 0x811c9dc5, h2 = 0x01000193;
      for (let i = 0; i < texto.length; i++) { h1 = Math.imul(h1 ^ texto.charCodeAt(i), 16777619); h2 = Math.imul(h2 ^ texto.charCodeAt(i), 2246822519); }
      hex = (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
    }
    const c = hex.slice(0, 12).toUpperCase();
    return c.slice(0, 4) + '-' + c.slice(4, 8) + '-' + c.slice(8, 12);
  },
  rotuloAssinatura(a) {
    if (!a || !a.assinadoEm) return '';
    const d = new Date(a.assinadoEm);
    return 'Assinado em ' + d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + (a.codigo ? ' · cód. ' + a.codigo : '');
  },
  /** Procura uma assinatura pelo código de verificação. */
  conferir(codigo) {
    const c = String(codigo || '').toUpperCase().replace(/[^0-9A-F]/g, '');
    if (c.length < 8) return null;
    return this.lista(null, 'assinatura').find((a) => a.codigo && a.codigo.replace(/-/g, '').startsWith(c)) || null;
  },


  async gravar(ref, tipo, url, extra) {
    const grupo = uid();
    const agora = new Date().toISOString();
    const n = Math.max(1, Math.ceil(url.length / this.PARTE));
    const lista = App.data.anexos || (App.data.anexos = []);
    for (let i = 0; i < n; i++) {
      const rec = Object.assign({ id: uid(), emp: App.emp.id, mod: 'anexos', ref, tipo, grupo, parte: i, partes: n, dados: url.slice(i * this.PARTE, (i + 1) * this.PARTE), criadoEm: agora, atualizadoEm: agora }, extra || {});
      await DB.put('rec', rec);
      lista.push(rec);
    }
    this.atualizado();
    return grupo;
  },

  async excluirOnde(filtro) {
    const fora = (App.data.anexos || []).filter(filtro);
    if (!fora.length) return;
    for (const a of fora) await DB.del('rec', a.id);
    const ids = new Set(fora.map((a) => a.id));
    App.data.anexos = App.data.anexos.filter((a) => !ids.has(a.id));
    this.atualizado();
  },
  excluirGrupo(grupo) { return this.excluirOnde((a) => a.grupo === grupo); },
  excluirDoRegistro(ref) { return this.excluirOnde((a) => a.ref === ref); },

  /** resumo: o que foi assinado (ex.: "EPI | CA | qtd | data"); entra no código de verificação. */
  async assinar(ref, colab, url, resumo) {
    await this.excluirOnde((a) => a.ref === ref && a.tipo === 'assinatura' && a.colab === colab);
    const assinadoEm = new Date().toISOString();
    const codigo = await this.codigo([ref, colab, resumo || '', assinadoEm, url].join('|'));
    return this.gravar(ref, 'assinatura', url, { colab, assinadoEm, codigo, resumo: resumo || '' });
  },

  /* ---------------- Assinatura das entregas de EPI e uniforme ---------------- */
  entregasDoColab(cid, cat) {
    return (App.data.movepi || []).filter((m) => m.colab === cid && Calc.entregaColab(m) && (!cat || ((Calc.epi(m.epi) || {}).categoria === 'Uniforme' ? 'Uniforme' : 'EPI') === cat))
      .sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  },
  resumoEntrega(m) {
    const e = Calc.epi(m.epi) || {};
    return [e.descricao || '', e.ca ? 'CA ' + e.ca : '', 'qtd ' + m.qtd, D.br(m.data)].filter(Boolean).join(' | ');
  },
  /** Tela para o colaborador assinar na tela uma ou mais entregas ainda sem assinatura. */
  assinarEntregas(cid, cat, marcar, depois) {
    const c = Calc.colab(cid);
    if (!c) { toast('Escolha um colaborador.'); return; }
    const pend = this.entregasDoColab(cid, cat).filter((m) => !this.assinatura(m.id, cid));
    if (!pend.length) { toast('Todas as entregas de ' + c.nome + ' já estão assinadas.'); if (depois) depois(); return; }
    const sel = new Set(marcar && marcar.length ? marcar : pend.map((m) => m.id));
    const body = h('<div class="anx"><p><b>' + esc(c.nome) + '</b>' + (c.funcao ? ' · ' + esc(c.funcao) : '') + '</p>' +
      '<p class="small">Marque as entregas que o colaborador está recebendo e peça que assine no quadro. A assinatura fica registrada com data, hora e um código de verificação.</p>' +
      '<div class="check-list anx-entregas">' + pend.map((m) => '<label><input type="checkbox" value="' + m.id + '"' + (sel.has(m.id) ? ' checked' : '') + '> ' + esc(this.resumoEntrega(m)) + '</label>').join('') + '</div>' +
      '<p class="small muted anx-termo">' + esc(String(Config.params.declaracaoEPI || '').slice(0, 400)) + '</p>' +
      '<div class="anx-pad"><canvas aria-label="Quadro de assinatura de ' + esc(c.nome) + '"></canvas></div></div>');
    let q = null;
    Modal.open({
      title: 'Assinatura da entrega', body,
      foot: [button('Limpar quadro', '', () => q && q.limpar()), button('Cancelar', '', () => { Modal.close(); if (depois) depois(); }),
        button('Confirmar assinatura', 'btn-primary', async () => {
          const ids = $$('.anx-entregas input:checked', body).map((i) => i.value);
          if (!ids.length) { toast('Marque ao menos uma entrega.'); return; }
          if (!q || q.vazio()) { toast('Peça ao colaborador que assine no quadro.'); return; }
          const img = q.imagem();
          for (const id of ids) { const m = pend.find((x) => x.id === id); await this.assinar(id, cid, img, this.resumoEntrega(m)); }
          Modal.close();
          toast(ids.length + ' entrega(s) assinada(s)');
          if (depois) depois(); else App.atualizarTela();
        })]
    });
    q = this.quadro($('canvas', body));
  },

  apagarAssinatura(ref, colab) {
    return this.excluirOnde((a) => a.ref === ref && a.tipo === 'assinatura' && a.colab === colab);
  },

  /** Tela com as entregas já assinadas do colaborador, para apagar uma assinatura colhida por engano. */
  telaApagarAssinaturas(cid, cat, depois) {
    const c = Calc.colab(cid);
    if (!c) { toast('Escolha um colaborador.'); return; }
    const body = h('<div class="anx"></div>');
    const desenhar = () => {
      const feitas = this.entregasDoColab(cid, cat).map((m) => ({ m, a: this.assinaturaInfo(m.id, cid) })).filter((x) => x.a);
      body.innerHTML = '<p><b>' + esc(c.nome) + '</b></p>' + (feitas.length
        ? '<p class="small">Apague só a assinatura colhida por engano. A entrega continua registrada e volta a aparecer como "sem assinatura".</p>' +
          '<div class="anx-lista">' + feitas.map((x) => '<div class="anx-pessoa"><div class="anx-nome"><b>' + esc(this.resumoEntrega(x.m)) + '</b><span class="muted small">' + esc(this.rotuloAssinatura(x.a)) + '</span></div>' +
            '<div class="anx-ass"><img src="' + x.a.url + '" alt="Assinatura"></div>' +
            '<div class="anx-acoes"><button type="button" class="btn btn-sm btn-danger" data-apagar="' + x.m.id + '">Apagar assinatura</button></div></div>').join('') + '</div>'
        : '<p class="muted">Nenhuma entrega assinada deste colaborador.</p>');
      $$('[data-apagar]', body).forEach((b) => b.addEventListener('click', async () => {
        const m = feitas.find((x) => x.m.id === b.dataset.apagar).m;
        if (!await confirmar('Apagar a assinatura da entrega "' + this.resumoEntrega(m) + '"? Esta ação não pode ser desfeita.', 'Apagar', true)) return this.telaApagarAssinaturas(cid, cat, depois);
        await this.apagarAssinatura(m.id, cid);
        toast('Assinatura apagada');
        this.telaApagarAssinaturas(cid, cat, depois);
      }));
    };
    desenhar();
    Modal.open({ title: 'Apagar assinatura', body, foot: [button('Fechar', 'btn-primary', () => { Modal.close(); if (depois) depois(); })] });
  },

  /** Tela para conferir um código de verificação de assinatura. */
  telaConferir() {
    const body = h('<div><label class="field">Código de verificação<input type="text" placeholder="Ex.: 3F2A-9C1E-5B7D" autocomplete="off"></label><div class="anx-res" style="margin-top:10px"></div></div>');
    const res = $('.anx-res', body), inp = $('input', body);
    const ver = () => {
      const a = this.conferir(inp.value);
      if (!a) { res.innerHTML = '<span class="badge b-critical">Código não encontrado</span> <span class="small muted">Confira os caracteres ou se a assinatura foi feita nesta empresa.</span>'; return; }
      const c = Calc.colab(a.colab);
      res.innerHTML = '<span class="badge b-good">Assinatura encontrada</span><p><b>' + esc(c ? c.nome : '') + '</b><br>' + esc(a.resumo || '') + '<br>' + esc(this.rotuloAssinatura(a)) + '</p><img src="' + a.url + '" alt="Assinatura" style="max-height:80px;border:1px solid var(--line);border-radius:6px">';
    };
    Modal.open({ title: 'Conferir assinatura', body, small: true, foot: [button('Fechar', '', () => Modal.close()), button('Conferir', 'btn-primary', ver)] });
  },


  atualizado() { App.versao++; App.marcarSalvo(); },

  /** Foto do celular ou do computador reduzida para no máximo 1280 px, em JPEG. */
  reduzirFoto(file, max = 1280, qualidade = 0.72) {
    return new Promise((ok, erro) => {
      const img = new Image();
      const src = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        const ctx = cv.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(src);
        ok(cv.toDataURL('image/jpeg', qualidade));
      };
      img.onerror = () => { URL.revokeObjectURL(src); erro(new Error('Não foi possível ler a imagem.')); };
      img.src = src;
    });
  },

  /** Quadro de assinatura (mouse, caneta ou dedo). Devolve { limpar, vazio, imagem }. */
  quadro(canvas) {
    const alt = 140;
    const larg = canvas.getBoundingClientRect().width || 320;
    canvas.width = larg * 2; canvas.height = alt * 2; canvas.style.height = alt + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2); ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#111';
    let riscou = false, ativo = false;
    const pos = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', (e) => { ativo = true; canvas.setPointerCapture(e.pointerId); const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); });
    canvas.addEventListener('pointermove', (e) => { if (!ativo) return; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); riscou = true; });
    const fim = () => { ativo = false; };
    canvas.addEventListener('pointerup', fim); canvas.addEventListener('pointercancel', fim);
    return {
      limpar() { ctx.clearRect(0, 0, canvas.width, canvas.height); riscou = false; },
      vazio() { return !riscou; },
      // imagem pequena (metade da resolução de tela) para caber numa linha da planilha
      imagem() {
        const cv = document.createElement('canvas');
        cv.width = Math.round(larg); cv.height = alt;
        cv.getContext('2d').drawImage(canvas, 0, 0, cv.width, cv.height);
        return cv.toDataURL('image/png');
      }
    };
  },

  /* ---------------- Tela do DDS: assinaturas da lista de presença e fotos ---------------- */
  telaDDS(rec) {
    const r = (App.data.dds || []).find((x) => x.id === rec.id) || rec;
    const pessoas = (r.participantes || []).map((id) => Calc.colab(id)).filter(Boolean).sort((a, b) => a.nome.localeCompare(b.nome));
    const corpo = h('<div class="anx"></div>');
    const desenhar = () => {
      const fotos = this.lista(r.id, 'foto');
      const assinados = pessoas.filter((c) => this.assinatura(r.id, c.id)).length;
      corpo.innerHTML =
        '<p class="small muted">' + esc(r.tema || '') + ' · ' + D.br(r.data) + '</p>' +
        '<h3>Lista de presença <span class="muted small">(' + assinados + ' de ' + pessoas.length + ' assinaram)</span></h3>' +
        (pessoas.length ? '<div class="anx-lista">' + pessoas.map((c) => {
          const ass = this.assinatura(r.id, c.id);
          return '<div class="anx-pessoa" data-c="' + c.id + '"><div class="anx-nome"><b>' + esc(c.nome) + '</b><span class="muted small">' + esc(c.funcao || '') + '</span></div>' +
            '<div class="anx-ass">' + (ass ? '<img src="' + ass + '" alt="Assinatura de ' + esc(c.nome) + '">' : '<span class="badge b-warning">Sem assinatura</span>') + '</div>' +
            '<div class="anx-acoes"><button type="button" class="btn btn-sm" data-assinar>' + (ass ? 'Assinar novamente' : 'Assinar') + '</button>' +
            (ass ? '<button type="button" class="btn btn-sm" data-apagar>Apagar</button>' : '') + '</div>' +
            '<div class="anx-pad" hidden><canvas aria-label="Quadro de assinatura de ' + esc(c.nome) + '"></canvas>' +
            '<div class="anx-acoes"><button type="button" class="btn btn-sm" data-limpar>Limpar</button><button type="button" class="btn btn-sm" data-cancelar>Cancelar</button><button type="button" class="btn btn-sm btn-primary" data-ok>Confirmar assinatura</button></div></div></div>';
        }).join('') + '</div>' : '<p class="muted">Nenhum participante neste DDS. Inclua os participantes no cadastro do DDS para colher as assinaturas.</p>') +
        '<h3>Evidência fotográfica <span class="muted small">(' + fotos.length + ')</span></h3>' +
        '<div class="anx-botoes"><label class="btn btn-sm">Tirar foto<input type="file" accept="image/*" capture="environment" hidden data-foto></label>' +
        '<label class="btn btn-sm">Escolher da galeria<input type="file" accept="image/*" multiple hidden data-foto></label></div>' +
        (fotos.length ? '<div class="anx-fotos">' + fotos.map((f) => '<figure><img src="' + f.url + '" alt="Foto do DDS"><button type="button" class="btn btn-sm" data-tirar="' + f.grupo + '">Remover</button></figure>').join('') + '</div>' : '<p class="muted small">Nenhuma foto anexada.</p>');

      $$('.anx-pessoa', corpo).forEach((el) => {
        const cid = el.dataset.c, pad = $('.anx-pad', el);
        let q = null;
        $('[data-assinar]', el).addEventListener('click', () => {
          $$('.anx-pad', corpo).forEach((p) => { p.hidden = true; });
          pad.hidden = false; q = this.quadro($('canvas', pad));
        });
        const apagar = $('[data-apagar]', el);
        if (apagar) apagar.addEventListener('click', async () => { await this.excluirOnde((a) => a.ref === r.id && a.tipo === 'assinatura' && a.colab === cid); desenhar(); });
        $('[data-limpar]', el).addEventListener('click', () => q && q.limpar());
        $('[data-cancelar]', el).addEventListener('click', () => { pad.hidden = true; });
        $('[data-ok]', el).addEventListener('click', async () => {
          if (!q || q.vazio()) { toast('Desenhe a assinatura no quadro antes de confirmar.'); return; }
          await this.assinar(r.id, cid, q.imagem(), 'DDS | ' + (r.tema || '') + ' | ' + D.br(r.data)); toast('Assinatura registrada'); desenhar();
        });
      });
      $$('[data-foto]', corpo).forEach((inp) => inp.addEventListener('change', async () => {
        const arqs = [...inp.files];
        for (const f of arqs) {
          try { await this.gravar(r.id, 'foto', await this.reduzirFoto(f)); } catch (e) { toast(e.message); }
        }
        if (arqs.length) toast(arqs.length + ' foto(s) anexada(s)');
        desenhar();
      }));
      $$('[data-tirar]', corpo).forEach((b) => b.addEventListener('click', async () => {
        if (!await confirmar('Remover esta foto do DDS?', 'Remover', true)) return this.telaDDS(r);
        await this.excluirGrupo(b.dataset.tirar); this.telaDDS(r);
      }));
    };
    desenhar();
    Modal.open({
      title: 'Assinaturas e fotos do DDS', body: corpo,
      foot: [button('Imprimir registro', '', () => Reports.imprimirRegistro('dds', r)), button('Voltar ao DDS', '', () => Forms.abrir('dds', r)), button('Concluir', 'btn-primary', () => { Modal.close(); App.atualizarTela(); })]
    });
  }
};
