/*
 * Prancheta de desenho com os modos de exercício:
 *  livre, cego (área coberta), espiar (olhadas rápidas), invertido
 *  (referência de cabeça para baixo) e vaso (vasos e rostos).
 * Os traços ficam guardados como vetores, para desfazer sem gastar memória.
 */
const Prancheta = (() => {
  const { h } = U;
  const LADO_MAIOR = 1400;
  const FERRAMENTAS = {
    lapis: { rotulo: 'Lápis', cor: 'rgba(40,36,33,0.92)', largura: 3.2 },
    carvao: { rotulo: 'Carvão', cor: 'rgba(30,27,24,0.22)', largura: 16 },
    nanquim: { rotulo: 'Pincel preto', cor: '#141210', largura: 12 },
    borracha: { rotulo: 'Borracha', cor: '#000', largura: 22, apagar: true }
  };
  const TAMANHOS = [['P', 0.55], ['M', 1], ['G', 1.9]];

  // Molde do exercício de vasos e rostos (perfil voltado para o centro)
  const MOLDE_VASO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="800" height="1000"><g fill="none" stroke="#3a3530" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M140,60 C150,90 160,120 158,150 C156,165 150,172 152,180 C156,190 162,196 160,205 L190,250 C194,256 188,262 176,262 C178,270 176,276 178,280 C186,284 186,290 176,292 C184,296 182,304 172,306 C168,316 170,326 176,334 C182,350 172,362 156,366 C150,380 146,410 140,440"/><path d="M140,60 L262,60 M140,440 L262,440"/></g></svg>`;

  let st = null;

  function montar(raiz, cfg) {
    cfg = Object.assign({ titulo: 'Desenho livre', origem: 'livre', layout: 'lado', opacidade: 0.35, aspecto: 3 / 4, modo: 'livre', ferramenta: 'lapis', tempoMin: 0 }, cfg || {});
    if (cfg.modo === 'vaso') { cfg.fundo = MOLDE_VASO; cfg.fundoOpacidade = 1; cfg.aspecto = 0.8; }
    if (!cfg.referencia) cfg.layout = 'nenhum';
    const W = cfg.aspecto >= 1 ? LADO_MAIOR : Math.round(LADO_MAIOR * cfg.aspecto);
    const H = cfg.aspecto >= 1 ? Math.round(LADO_MAIOR / cfg.aspecto) : LADO_MAIOR;
    st = {
      cfg, W, H, tracos: [], refeitos: [], atual: null,
      ferramenta: cfg.ferramenta, tamanho: 1,
      layout: cfg.layout, opacidade: cfg.opacidade,
      grade: cfg.grade || 0,
      visao: { girar: false, espelhar: false },
      coberto: cfg.modo === 'cego' || cfg.modo === 'espiar',
      olhadas: 0, desvirado: false, simetria: false,
      segundos: 0, rodando: false, avisouTempo: false, salvo: false
    };
    raiz.innerHTML = '';
    raiz.classList.add('pagina-prancheta');

    // Cabeçalho: tempo
    const relogio = h('span', { class: 'relogio', 'aria-live': 'off' }, '00:00');
    const btnRelogio = h('button', { class: 'btn pequeno', onclick: () => alternarRelogio() }, 'Iniciar');
    st.ui = { relogio, btnRelogio };
    raiz.append(h('div', { class: 'prancheta-topo' },
      h('div', {}, h('strong', {}, cfg.titulo), cfg.tempoMin ? h('span', { class: 'nota' }, ` · sugestão: ${cfg.tempoMin} min`) : null),
      h('div', { class: 'relogio-caixa', html: U.icone('relogio') }, relogio, btnRelogio)));

    // Ferramentas
    const grupoFerr = h('div', { class: 'segmentado' });
    for (const [id, f] of Object.entries(FERRAMENTAS)) {
      if (id === 'borracha' && cfg.semBorracha) continue;
      grupoFerr.append(h('button', { class: 'seg' + (st.ferramenta === id ? ' ativo' : ''), onclick: (e) => { st.ferramenta = id; U.$$('.seg', grupoFerr).forEach((b) => b.classList.remove('ativo')); e.currentTarget.classList.add('ativo'); } }, f.rotulo));
    }
    const grupoTam = h('div', { class: 'segmentado', 'aria-label': 'Espessura' });
    for (const [rot, k] of TAMANHOS) grupoTam.append(h('button', { class: 'seg' + (k === 1 ? ' ativo' : ''), onclick: (e) => { st.tamanho = k; U.$$('.seg', grupoTam).forEach((b) => b.classList.remove('ativo')); e.currentTarget.classList.add('ativo'); } }, rot));
    raiz.append(h('div', { class: 'barra-ferramentas' }, grupoFerr, grupoTam,
      h('button', { class: 'btn pequeno', onclick: desfazer }, 'Desfazer'),
      h('button', { class: 'btn pequeno', onclick: refazer }, 'Refazer'),
      h('button', { class: 'btn pequeno', onclick: () => { if (st.tracos.length && confirm('Apagar todo o desenho?')) { st.tracos = []; st.refeitos = []; redesenhar(); } } }, 'Limpar')));

    // Palco
    const palco = h('div', { class: 'prancheta-palco layout-' + st.layout });
    const refPainel = h('div', { class: 'ref-painel' });
    const area = h('div', { class: 'area-desenho' });
    area.style.aspectRatio = `${W} / ${H}`;
    area.style.width = `min(100%, calc(76vh * ${(W / H).toFixed(4)}))`;
    const fundoImg = cfg.fundo ? h('img', { class: 'camada fundo', alt: '', src: U.svgParaUrl(cfg.fundo) }) : null;
    if (fundoImg) fundoImg.style.opacity = cfg.fundoOpacidade != null ? cfg.fundoOpacidade : 0.35;
    const refSobre = cfg.referencia ? h('img', { class: 'camada ref-sobre', alt: '', src: cfg.referencia }) : null;
    const cv = h('canvas', { class: 'camada tela', width: W, height: H, 'aria-label': 'Área de desenho' });
    const gradeSvg = h('div', { class: 'camada grade' });
    const simetria = h('canvas', { class: 'camada simetria', width: W, height: H, hidden: true });
    const capa = h('div', { class: 'camada capa' }, h('p', {}, cfg.modo === 'espiar' ? 'Olhe para o modelo. Segure "Espiar" só para conferir um ponto.' : 'Olhe para o modelo, não para o papel. Seus traços estão sendo registrados.'));
    area.append(...[fundoImg, refSobre, cv, gradeSvg, simetria, capa].filter(Boolean));
    if (cfg.referencia) {
      const refImg = h('img', { class: 'ref-img', alt: 'Referência', src: cfg.referencia });
      refPainel.append(refImg);
      st.ui.refImg = refImg;
    }
    palco.append(refPainel, area);
    raiz.append(palco);
    Object.assign(st.ui, { palco, area, cv, ctx: cv.getContext('2d'), refSobre, gradeSvg, simetria, capa });

    // Opções de visualização
    const vis = h('div', { class: 'barra-ferramentas' });
    if (cfg.referencia) {
      const seg = h('div', { class: 'segmentado' });
      for (const [id, rot] of [['lado', 'Lado a lado'], ['sobreposto', 'Sobreposta'], ['nenhum', 'Oculta']]) {
        seg.append(h('button', { class: 'seg' + (st.layout === id ? ' ativo' : ''), onclick: (e) => { st.layout = id; U.$$('.seg', seg).forEach((b) => b.classList.remove('ativo')); e.currentTarget.classList.add('ativo'); aplicarVisual(); } }, rot));
      }
      const op = h('input', { type: 'range', min: 5, max: 90, value: Math.round(st.opacidade * 100), oninput: (e) => { st.opacidade = e.target.value / 100; aplicarVisual(); } });
      vis.append(h('span', { class: 'rotulo' }, 'Referência:'), seg, h('label', { class: 'slider curto', title: 'Transparência da referência sobreposta' }, op));
    }
    vis.append(
      h('button', { class: 'btn pequeno', onclick: (e) => { st.grade = st.grade ? 0 : (cfg.grade || 4); e.currentTarget.classList.toggle('ativo', !!st.grade); aplicarVisual(); } }, 'Grade'),
      h('button', { class: 'btn pequeno', title: 'Ver o desenho espelhado ajuda a enxergar erros', onclick: (e) => { st.visao.espelhar = !st.visao.espelhar; e.currentTarget.classList.toggle('ativo', st.visao.espelhar); aplicarVisual(); } }, 'Espelhar desenho'),
      h('button', { class: 'btn pequeno', onclick: (e) => { st.visao.girar = !st.visao.girar; e.currentTarget.classList.toggle('ativo', st.visao.girar); aplicarVisual(); } }, 'Virar 180°'));
    raiz.append(vis);
    if (cfg.referencia && st.layout === 'sobreposto') raiz.append(h('p', { class: 'nota' }, 'Com a referência sobreposta você está decalcando. Use só para conferir; o treino do olhar acontece lado a lado.'));

    // Ações do modo
    const acoes = h('div', { class: 'linha-botoes acoes-prancheta' });
    if (cfg.modo === 'cego') acoes.append(h('button', { class: 'btn', onclick: (e) => { st.coberto = !st.coberto; e.currentTarget.textContent = st.coberto ? 'Revelar' : 'Cobrir de novo'; aplicarVisual(); } }, 'Revelar'));
    if (cfg.modo === 'espiar') {
      const cont = h('span', { class: 'nota' }, 'Olhadas: 0');
      const b = h('button', { class: 'btn espiar' }, 'Espiar (segure)');
      const mostrar = (e) => { e.preventDefault(); st.coberto = false; st.olhadas++; cont.textContent = 'Olhadas: ' + st.olhadas; aplicarVisual(); };
      const esconder = () => { if (!st.revelado) { st.coberto = true; aplicarVisual(); } };
      b.addEventListener('pointerdown', mostrar); b.addEventListener('pointerup', esconder); b.addEventListener('pointerleave', esconder); b.addEventListener('pointercancel', esconder);
      acoes.append(b, cont, h('button', { class: 'btn', onclick: (e) => { st.revelado = true; st.coberto = false; e.currentTarget.disabled = true; aplicarVisual(); } }, 'Terminei: revelar'));
    }
    if (cfg.modo === 'invertido') {
      acoes.append(h('button', { class: 'btn', onclick: (e) => { st.desvirado = !st.desvirado; e.currentTarget.textContent = st.desvirado ? 'Voltar de cabeça para baixo' : 'Terminei: desvirar'; aplicarVisual(); } }, 'Terminei: desvirar'));
    }
    if (cfg.modo === 'vaso') acoes.append(h('button', { class: 'btn', onclick: (e) => { st.simetria = !st.simetria; e.currentTarget.classList.toggle('ativo', st.simetria); if (st.simetria) desenharSimetria(); aplicarVisual(); } }, 'Conferir simetria'));
    acoes.append(
      h('button', { class: 'btn', onclick: baixar }, 'Baixar imagem'),
      h('button', { class: 'btn primario', onclick: salvar }, 'Salvar no meu progresso'));
    raiz.append(acoes);

    ligarPonteiro(cv);
    aplicarVisual();
    redesenhar();
    if (cfg.modo !== 'livre' || cfg.tempoMin) U.aviso(cfg.modo === 'invertido' ? 'A referência está de cabeça para baixo. Não vire até terminar.' : 'O tempo começa a contar no primeiro traço.');
  }

  function aplicarVisual() {
    const { ui, cfg } = st;
    ui.palco.className = 'prancheta-palco layout-' + st.layout;
    if (ui.refSobre) { ui.refSobre.hidden = st.layout !== 'sobreposto'; ui.refSobre.style.opacity = st.opacidade; }
    // referência lado a lado
    if (ui.refImg) {
      let t = '';
      const inv = cfg.modo === 'invertido' && !st.desvirado;
      if (cfg.girarRef !== inv) t += 'rotate(180deg) ';
      if (cfg.espelharRef) t += 'scaleX(-1)';
      ui.refImg.style.transform = t.trim() || 'none';
    }
    // desenho (visão)
    const girar = st.visao.girar !== (cfg.modo === 'invertido' && st.desvirado);
    ui.area.style.transform = `${girar ? 'rotate(180deg) ' : ''}${st.visao.espelhar ? 'scaleX(-1)' : ''}`.trim() || 'none';
    st.giroEfetivo = girar;
    // grade
    if (st.grade) {
      let s = `<svg viewBox="0 0 ${st.W} ${st.H}" preserveAspectRatio="none">`;
      for (let i = 1; i < st.grade; i++) {
        s += `<line x1="${st.W * i / st.grade}" y1="0" x2="${st.W * i / st.grade}" y2="${st.H}"/><line x1="0" y1="${st.H * i / st.grade}" x2="${st.W}" y2="${st.H * i / st.grade}"/>`;
      }
      ui.gradeSvg.innerHTML = s + '</svg>';
    } else ui.gradeSvg.innerHTML = '';
    ui.capa.hidden = !st.coberto;
    ui.simetria.hidden = !st.simetria;
  }

  // ---------------- desenho ----------------
  function pontoTela(e) {
    const r = st.ui.cv.getBoundingClientRect();
    let x = (e.clientX - r.left) / r.width * st.W, y = (e.clientY - r.top) / r.height * st.H;
    if (st.giroEfetivo) { x = st.W - x; y = st.H - y; }
    if (st.visao.espelhar) x = st.W - x;
    const k = e.pointerType === 'pen' && e.pressure > 0 ? 0.35 + e.pressure * 1.3 : 1;
    return [x, y, k];
  }
  function ligarPonteiro(cv) {
    let ativo = null;
    cv.addEventListener('pointerdown', (e) => {
      if (ativo != null) return; // ignora o segundo dedo
      ativo = e.pointerId;
      cv.setPointerCapture(e.pointerId);
      e.preventDefault();
      if (!st.rodando) alternarRelogio(true);
      const f = FERRAMENTAS[st.ferramenta];
      st.atual = { f: st.ferramenta, l: f.largura * st.tamanho, pts: [pontoTela(e)] };
      st.refeitos = [];
      tracarUltimo();
    });
    cv.addEventListener('pointermove', (e) => {
      if (e.pointerId !== ativo || !st.atual) return;
      const lista = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of lista) st.atual.pts.push(pontoTela(ev));
      tracarUltimo();
    });
    const fim = (e) => {
      if (e.pointerId !== ativo) return;
      ativo = null;
      if (st.atual) { st.tracos.push(st.atual); st.atual = null; st.salvo = false; }
      if (st.simetria) desenharSimetria();
    };
    cv.addEventListener('pointerup', fim);
    cv.addEventListener('pointercancel', fim);
  }
  function estilo(ctx, t) {
    const f = FERRAMENTAS[t.f];
    ctx.globalCompositeOperation = f.apagar ? 'destination-out' : 'source-over';
    ctx.strokeStyle = f.cor; ctx.fillStyle = f.cor;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  }
  // Desenha só o trecho novo do traço atual (rápido durante o movimento)
  function tracarUltimo() {
    const ctx = st.ui.ctx, t = st.atual, p = t.pts, n = p.length;
    estilo(ctx, t);
    if (n === 1) { ctx.beginPath(); ctx.arc(p[0][0], p[0][1], t.l * p[0][2] / 2, 0, Math.PI * 2); ctx.fill(); t.feito = 1; return; }
    for (let i = Math.max(1, t.feito || 1); i < n; i++) {
      const a = p[i - 1], b = p[i];
      ctx.lineWidth = t.l * (a[2] + b[2]) / 2;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    t.feito = n;
  }
  function tracarCompleto(ctx, t) {
    const p = t.pts;
    estilo(ctx, t);
    if (p.length === 1) { ctx.beginPath(); ctx.arc(p[0][0], p[0][1], t.l * p[0][2] / 2, 0, Math.PI * 2); ctx.fill(); return; }
    for (let i = 1; i < p.length; i++) {
      ctx.lineWidth = t.l * (p[i - 1][2] + p[i][2]) / 2;
      ctx.beginPath(); ctx.moveTo(p[i - 1][0], p[i - 1][1]); ctx.lineTo(p[i][0], p[i][1]); ctx.stroke();
    }
  }
  function redesenhar(ctx = st.ui.ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, st.W, st.H);
    for (const t of st.tracos) tracarCompleto(ctx, t);
    ctx.restore();
    if (st.simetria) desenharSimetria();
  }
  function desfazer() { if (st.tracos.length) { st.refeitos.push(st.tracos.pop()); redesenhar(); } }
  function refazer() { if (st.refeitos.length) { st.tracos.push(st.refeitos.pop()); redesenhar(); } }

  // Vasos e rostos: espelha a metade esquerda sobre a direita, em vermelho
  async function desenharSimetria() {
    const { W, H } = st;
    const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H;
    const t = tmp.getContext('2d');
    if (st.cfg.fundo) {
      try { t.drawImage(await U.carregarImagem(U.svgParaUrl(st.cfg.fundo)), 0, 0, W, H); } catch (e) { /* segue só com o desenho */ }
    }
    t.drawImage(st.ui.cv, 0, 0);
    const out = st.ui.simetria.getContext('2d');
    out.clearRect(0, 0, W, H);
    out.save();
    out.translate(W, 0); out.scale(-1, 1);
    out.drawImage(tmp, 0, 0, W / 2, H, 0, 0, W / 2, H);
    out.restore();
    out.globalCompositeOperation = 'source-in';
    out.fillStyle = 'rgba(200,69,44,0.55)';
    out.fillRect(0, 0, W, H);
    out.globalCompositeOperation = 'source-over';
  }

  // ---------------- relógio ----------------
  let intervalo = null;
  function alternarRelogio(forcarInicio) {
    st.rodando = forcarInicio ? true : !st.rodando;
    st.ui.btnRelogio.textContent = st.rodando ? 'Pausar' : 'Continuar';
    clearInterval(intervalo);
    if (st.rodando) {
      intervalo = setInterval(() => {
        if (!document.body.contains(st.ui.relogio)) { clearInterval(intervalo); return; }
        st.segundos++;
        const m = Math.floor(st.segundos / 60), s = st.segundos % 60;
        st.ui.relogio.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        if (st.cfg.tempoMin && !st.avisouTempo && st.segundos >= st.cfg.tempoMin * 60) {
          st.avisouTempo = true;
          sinal();
          U.aviso('Tempo sugerido concluído. Continue se quiser.');
        }
      }, 1000);
    }
  }
  function sinal() {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.value = 660; g.gain.value = 0.08;
      o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.35);
    } catch (e) { /* sem áudio */ }
    if (navigator.vibrate) navigator.vibrate(200);
  }

  // ---------------- exportar e salvar ----------------
  async function imagemFinal() {
    const { W, H, cfg } = st;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fbf8f2'; ctx.fillRect(0, 0, W, H);
    if (cfg.modo === 'invertido' && st.desvirado) { ctx.translate(W, H); ctx.rotate(Math.PI); }
    if (cfg.modo === 'vaso' && cfg.fundo) {
      try { ctx.drawImage(await U.carregarImagem(U.svgParaUrl(cfg.fundo)), 0, 0, W, H); } catch (e) { /* ignora */ }
    }
    ctx.drawImage(st.ui.cv, 0, 0);
    return U.canvasParaBlob(c, 'image/png');
  }
  async function baixar() {
    try { U.baixar(await imagemFinal(), `desenho-${U.hoje()}.png`); } catch (e) { U.aviso('Não foi possível gerar a imagem.'); }
  }
  function salvar() {
    if (!st.tracos.length) { U.aviso('Faça pelo menos um traço antes de salvar.'); return; }
    const cfg = st.cfg;
    let nota = 0;
    const estrelas = h('div', { class: 'estrelas', role: 'radiogroup', 'aria-label': 'Autoavaliação de 1 a 5' });
    for (let i = 1; i <= 5; i++) {
      estrelas.append(h('button', { class: 'estrela', 'aria-label': i + ' de 5', onclick: () => { nota = i; U.$$('.estrela', estrelas).forEach((b, k) => b.classList.toggle('ativa', k < i)); } }, String(i)));
    }
    const titulo = h('input', { type: 'text', value: cfg.titulo, maxlength: 80 });
    const gostei = h('textarea', { rows: 2, placeholder: 'O que ficou bom neste desenho?' });
    const melhorar = h('textarea', { rows: 2, placeholder: 'O que você quer melhorar no próximo?' });
    U.modal('Salvar desenho', h('div', { class: 'form' },
      h('label', {}, 'Título', titulo),
      h('div', {}, h('span', { class: 'rotulo' }, 'Como você avalia o resultado?'), estrelas),
      h('label', {}, 'O que gostei', gostei),
      h('label', {}, 'O que melhorar', melhorar),
      h('p', { class: 'nota' }, `Tempo: ${U.duracao(st.segundos)}${cfg.modo === 'espiar' ? ` · olhadas: ${st.olhadas}` : ''}`)
    ), [
      { rotulo: 'Cancelar' },
      { rotulo: 'Salvar', classe: 'primario', acao: () => { gravar({ titulo: titulo.value.trim() || cfg.titulo, nota, gostei: gostei.value.trim(), melhorar: melhorar.value.trim() }); } }
    ]);
  }
  async function gravar(extra) {
    try {
      const png = await imagemFinal();
      const rec = Object.assign({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        criadoEm: new Date().toISOString(),
        origem: st.cfg.origem, tarefa: st.cfg.tarefa || null,
        duracao: st.segundos, olhadas: st.cfg.modo === 'espiar' ? st.olhadas : null,
        png
      }, extra);
      await U.desenhos.salvar(rec);
      U.registrarPratica(Math.max(60, st.segundos));
      Progresso.concluir(st.cfg.origem);
      st.salvo = true;
      U.aviso('Desenho salvo no seu progresso.');
    } catch (e) {
      U.aviso('Não foi possível salvar neste navegador. Use "Baixar imagem".');
    }
  }

  const temAlteracoes = () => !!(st && st.tracos.length && !st.salvo && document.body.contains(st.ui.cv));
  const MOLDES = { vaso: MOLDE_VASO };
  return { montar, temAlteracoes, MOLDES };
})();
