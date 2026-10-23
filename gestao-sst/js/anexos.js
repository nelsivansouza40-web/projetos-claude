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
      if (a.ref !== ref || (tipo && a.tipo !== tipo)) return;
      const g = grupos.get(a.grupo) || { grupo: a.grupo, tipo: a.tipo, colab: a.colab || '', partes: a.partes, criadoEm: a.criadoEm || '', pedacos: [] };
      g.pedacos[a.parte] = a.dados;
      grupos.set(a.grupo, g);
    });
    return [...grupos.values()]
      .filter((g) => g.pedacos.filter((p) => p != null).length === g.partes) // ainda chegando da planilha: ignora
      .map((g) => ({ grupo: g.grupo, tipo: g.tipo, colab: g.colab, criadoEm: g.criadoEm, url: g.pedacos.join('') }))
      .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
  },

  assinatura(ref, colab) {
    const l = this.lista(ref, 'assinatura').filter((a) => a.colab === colab);
    return l.length ? l[l.length - 1].url : '';
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

  async assinar(ref, colab, url) {
    await this.excluirOnde((a) => a.ref === ref && a.tipo === 'assinatura' && a.colab === colab);
    return this.gravar(ref, 'assinatura', url, { colab });
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
          await this.assinar(r.id, cid, q.imagem()); toast('Assinatura registrada'); desenhar();
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
