/*
 * Ateliê digital: desenho realista sobre uma foto (ou num papel em branco).
 * Camadas, lápis de 4H a 8B, carvão, pincel, aerógrafo, esfuminho, lenço,
 * borrachas, conta-gotas, traço reto, pressão da caneta, estabilizador,
 * zoom, grade e textura de papel. O projeto fica guardado no aparelho.
 */
const Atelie = (() => {
  const { h } = U;
  const MAX = 1800; // maior lado do documento, em pixels
  const LIMITE_DESFAZER = 40;
  let st = null;
  let ativo = false;

  // ---------------- ferramentas ----------------
  // tipo: pintar | apagar | borrar | misturar | conta | mao
  const FERR = {
    lapis: { rotulo: 'Lápis', tipo: 'pintar', tam: 4, fluxo: 0.35, dureza: 0.6, textura: 0.75, espac: 0.12, pTam: true, pOp: true },
    carvao: { rotulo: 'Carvão', tipo: 'pintar', tam: 16, fluxo: 0.45, dureza: 0.35, textura: 0.9, espac: 0.1, pTam: true, pOp: true, dica: 'Carvão: preto intenso e granulado. Bom para as sombras mais fundas e para o cabelo.' },
    pincel: { rotulo: 'Pincel', tipo: 'pintar', tam: 8, fluxo: 1, dureza: 0.9, textura: 0, espac: 0.08, pTam: true, pOp: false, dica: 'Pincel: traço liso e firme, como nanquim.' },
    aerografo: { rotulo: 'Aerógrafo', tipo: 'pintar', tam: 70, fluxo: 0.05, dureza: 0, textura: 0, espac: 0.08, pTam: false, pOp: true, dica: 'Aerógrafo: passe várias vezes para escurecer aos poucos. Ótimo para meios-tons de pele.' },
    esfuminho: { rotulo: 'Esfuminho', tipo: 'borrar', tam: 18, fluxo: 0.6, dureza: 0.3, textura: 0, espac: 0.1, pTam: true, pOp: true, dica: 'Esfuminho: arrasta o grafite na direção do movimento. Siga a forma do volume.' },
    lenco: { rotulo: 'Lenço', tipo: 'misturar', tam: 60, fluxo: 0.35, dureza: 0, textura: 0, espac: 0.12, pTam: false, pOp: true, dica: 'Lenço (papel higiênico): mistura e suaviza grandes áreas sem deixar marca de traço.' },
    borracha: { rotulo: 'Borracha', tipo: 'apagar', tam: 16, fluxo: 1, dureza: 0.85, textura: 0, espac: 0.08, pTam: true, pOp: false },
    macia: { rotulo: 'Borracha macia', tipo: 'apagar', tam: 50, fluxo: 0.2, dureza: 0, textura: 0, espac: 0.1, pTam: false, pOp: true, dica: 'Borracha macia: clareia aos poucos, sem borda. Use para corrigir valores.' },
    limpatipos: { rotulo: 'Limpa-tipos', tipo: 'apagar', tam: 10, fluxo: 0.25, dureza: 0.4, textura: 0.6, espac: 0.1, pTam: true, pOp: true, dica: 'Limpa-tipos: tira grafite com textura. Abra brilhos nos olhos, nos lábios e no cabelo.' },
    conta: { rotulo: 'Conta-gotas', tipo: 'conta', dica: 'Conta-gotas: toque na foto ou no desenho para copiar aquele tom.' },
    mao: { rotulo: 'Mover', tipo: 'mao', dica: 'Mover: arraste para deslocar a folha. Com dois dedos você move e aproxima em qualquer ferramenta.' }
  };
  // Graduações do lápis: quanto mais macio, mais escuro e menos granulado
  const GRAUS = {
    '4H': { fluxo: 0.1, textura: 0.9, dureza: 0.75 }, '2H': { fluxo: 0.16, textura: 0.85, dureza: 0.7 },
    HB: { fluxo: 0.26, textura: 0.78, dureza: 0.62 }, '2B': { fluxo: 0.36, textura: 0.72, dureza: 0.55 },
    '4B': { fluxo: 0.5, textura: 0.64, dureza: 0.5 }, '6B': { fluxo: 0.64, textura: 0.56, dureza: 0.45 },
    '8B': { fluxo: 0.8, textura: 0.48, dureza: 0.4 }
  };
  const ESCALA = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map((v) => {
    const c = Math.round(20 + v * 235).toString(16).padStart(2, '0');
    return '#' + c + c + c;
  });

  // ---------------- textura (grão do papel) ----------------
  function ruido(tam, semente) {
    const c = document.createElement('canvas'); c.width = c.height = tam;
    const x = c.getContext('2d'), img = x.createImageData(tam, tam), d = img.data;
    let s = semente;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    // ruído com fibras levemente alongadas
    const base = new Float32Array(tam * tam);
    for (let i = 0; i < base.length; i++) base[i] = rnd();
    for (let y = 0; y < tam; y++) for (let xx = 0; xx < tam; xx++) {
      const i = y * tam + xx;
      const v = (base[i] * 2 + base[y * tam + ((xx + 1) % tam)] + base[((y + 1) % tam) * tam + xx]) / 4;
      d[i * 4 + 3] = Math.round(v * 255);
    }
    x.putImageData(img, 0, 0);
    return c;
  }
  let grao = null;
  const mascaras = new Map();
  // Máscara de textura: alfa entre (1 - forca) e 1
  function mascaraGrao(forca) {
    const k = Math.round(forca * 10);
    if (mascaras.has(k)) return mascaras.get(k);
    if (!grao) grao = ruido(256, 7919);
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = `rgba(0,0,0,${1 - k / 10})`; x.fillRect(0, 0, 256, 256);
    x.globalAlpha = k / 10; x.drawImage(grao, 0, 0);
    mascaras.set(k, c);
    return c;
  }

  // Ponta redonda com borda suave (dureza 0 a 1), cacheada
  const pontas = new Map();
  function ponta(raio, dureza, cor) {
    const r = Math.max(0.5, Math.round(raio * 2) / 2), chave = r + '|' + dureza.toFixed(2) + '|' + cor;
    if (pontas.has(chave)) return pontas.get(chave);
    const lado = Math.ceil(r * 2) + 2, c = document.createElement('canvas');
    c.width = c.height = lado;
    const x = c.getContext('2d'), m = lado / 2;
    const g = x.createRadialGradient(m, m, 0, m, m, r);
    const [cr, cg, cb] = hexRgb(cor);
    g.addColorStop(0, `rgba(${cr},${cg},${cb},1)`);
    g.addColorStop(Math.min(0.99, dureza), `rgba(${cr},${cg},${cb},1)`);
    g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    x.fillStyle = g; x.beginPath(); x.arc(m, m, r, 0, Math.PI * 2); x.fill();
    if (pontas.size > 300) pontas.clear();
    pontas.set(chave, c);
    return c;
  }
  const hexRgb = (hx) => { const n = parseInt(hx.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const tmp = document.createElement('canvas');
  const tctx = tmp.getContext('2d');
  const prepararTmp = (lado) => { if (tmp.width < lado || tmp.height < lado) { tmp.width = tmp.height = Math.ceil(lado); } tctx.setTransform(1, 0, 0, 1, 0, 0); tctx.globalCompositeOperation = 'source-over'; tctx.globalAlpha = 1; tctx.filter = 'none'; tctx.clearRect(0, 0, lado, lado); };

  // ---------------- documento ----------------
  function novoDocumento(foto, W, H) {
    const camada = (nome) => { const cv = document.createElement('canvas'); cv.width = W; cv.height = H; return { id: Math.random().toString(36).slice(2), nome, cv, ctx: cv.getContext('2d', { willReadFrequently: true }), visivel: true, opac: 1, multiplicar: true }; };
    st = {
      W, H, foto, camada,
      camadas: [camada('Desenho')], ativa: 0,
      fotoVis: !!foto, fotoOpac: 0.45, fotoCinza: false, fotoSobre: false, fotoLado: false,
      papel: '#fbf8f2', graoPapel: true, grade: 0,
      ferramenta: 'lapis', grau: '2B', cor: '#262626', recentes: [],
      ajustes: Object.fromEntries(Object.entries(FERR).map(([k, f]) => [k, { tam: f.tam, fluxo: f.fluxo, dureza: f.dureza, textura: f.textura }])),
      estab: 3, pressao: true, reta: false,
      vista: { esc: 1, x: 0, y: 0, espelho: false, cinza: false },
      desfazer: [], refazer: [], alterado: false, segundos: 0
    };
    aplicarGrau('2B');
  }
  function aplicarGrau(g) {
    st.grau = g;
    Object.assign(st.ajustes.lapis, GRAUS[g]);
  }
  const ajuste = () => st.ajustes[st.ferramenta] || {};
  const camadaAtiva = () => st.camadas[st.ativa];

  // ---------------- guardar no aparelho ----------------
  const BANCO = 'aprender-a-ver-atelie';
  function banco() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(BANCO, 1);
      r.onupgradeneeded = () => r.result.createObjectStore('projeto');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  }
  async function bancoOp(modo, fn) {
    const db = await banco();
    return new Promise((res, rej) => {
      const t = db.transaction('projeto', modo), req = fn(t.objectStore('projeto'));
      t.oncomplete = () => res(req && req.result); t.onerror = () => rej(t.error);
    });
  }
  let timerSalvar = null;
  function agendarSalvar() { clearTimeout(timerSalvar); timerSalvar = setTimeout(salvarProjeto, 2500); }
  async function salvarProjeto() {
    clearTimeout(timerSalvar);
    if (!st) return;
    try {
      const camadas = [];
      for (const c of st.camadas) camadas.push({ nome: c.nome, visivel: c.visivel, opac: c.opac, multiplicar: c.multiplicar, png: await U.canvasParaBlob(c.cv) });
      const foto = st.foto ? await U.canvasParaBlob(st.foto, 'image/jpeg', 0.92) : null;
      const { W, H, fotoVis, fotoOpac, fotoCinza, fotoSobre, papel, graoPapel, grade, ferramenta, grau, cor, recentes, ajustes, estab, pressao, segundos } = st;
      await bancoOp('readwrite', (s) => s.put({ W, H, foto, camadas, ativa: st.ativa, fotoVis, fotoOpac, fotoCinza, fotoSobre, papel, graoPapel, grade, ferramenta, grau, cor, recentes, ajustes, estab, pressao, segundos, salvoEm: new Date().toISOString() }, 'atual'));
    } catch (e) { /* segue sem salvar: navegador sem espaço ou modo privado */ }
  }
  async function abrirProjeto(p) {
    const img = async (b) => (b ? U.carregarImagem(URL.createObjectURL(b)) : null);
    let foto = null;
    if (p.foto) { const i = await img(p.foto); foto = document.createElement('canvas'); foto.width = p.W; foto.height = p.H; foto.getContext('2d').drawImage(i, 0, 0, p.W, p.H); }
    novoDocumento(foto, p.W, p.H);
    st.camadas = [];
    for (const c of p.camadas) {
      const cam = st.camada(c.nome); Object.assign(cam, { visivel: c.visivel, opac: c.opac, multiplicar: c.multiplicar });
      cam.ctx.drawImage(await img(c.png), 0, 0);
      st.camadas.push(cam);
    }
    if (!st.camadas.length) st.camadas.push(st.camada('Desenho'));
    for (const k of ['ativa', 'fotoVis', 'fotoOpac', 'fotoCinza', 'fotoSobre', 'papel', 'graoPapel', 'grade', 'ferramenta', 'grau', 'cor', 'recentes', 'estab', 'pressao', 'segundos']) if (p[k] != null) st[k] = p[k];
    if (p.ajustes) for (const k of Object.keys(st.ajustes)) Object.assign(st.ajustes[k], p.ajustes[k] || {});
    st.ativa = Math.min(st.ativa, st.camadas.length - 1);
  }

  // ---------------- tela inicial ----------------
  async function montar(raiz) {
    ativo = true;
    raiz.innerHTML = '';
    raiz.classList.add('pagina-prancheta');
    if (st) { telaDesenho(raiz); return; }
    let salvo = null;
    try { salvo = await bancoOp('readonly', (s) => s.get('atual')); } catch (e) { /* sem banco */ }
    const entrada = h('input', { type: 'file', accept: 'image/*', hidden: true });
    entrada.addEventListener('change', async () => {
      const arq = entrada.files && entrada.files[0];
      if (!arq) return;
      raiz.innerHTML = '<p class="carregando">Preparando a folha...</p>';
      try {
        const url = URL.createObjectURL(arq), im = await U.carregarImagem(url);
        URL.revokeObjectURL(url);
        const k = Math.min(1, MAX / Math.max(im.naturalWidth, im.naturalHeight));
        const W = Math.round(im.naturalWidth * k), H = Math.round(im.naturalHeight * k);
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        c.getContext('2d').drawImage(im, 0, 0, W, H);
        novoDocumento(c, W, H);
        salvarProjeto();
        telaDesenho(raiz);
      } catch (e) { U.aviso('Não foi possível abrir essa imagem.'); montar(raiz); }
    });
    const branco = (W, H) => { novoDocumento(null, W, H); salvarProjeto(); telaDesenho(raiz); };
    raiz.append(entrada, h('div', { class: 'cartao vazio' },
      h('div', { class: 'ico-grande', html: U.icone('lapis', 'ico') }),
      h('h2', {}, 'Ateliê digital'),
      h('p', {}, 'Coloque uma foto e desenhe sobre ela, em camadas, com lápis de 4H a 8B, carvão, pincel, aerógrafo, esfuminho, lenço, borrachas e conta-gotas. Aproxime com dois dedos, use a grade e compare com a foto a qualquer momento.'),
      salvo ? h('p', { class: 'nota' }, `Há um desenho em andamento, salvo em ${U.dataCurta(salvo.salvoEm)}.`) : null,
      h('div', { class: 'linha-botoes' },
        salvo ? h('button', { class: 'btn primario', onclick: async () => { raiz.innerHTML = '<p class="carregando">Abrindo o desenho...</p>'; try { await abrirProjeto(salvo); telaDesenho(raiz); } catch (e) { U.aviso('Não foi possível abrir o desenho salvo.'); st = null; montar(raiz); } } }, 'Continuar o desenho') : null,
        h('button', { class: 'btn' + (salvo ? '' : ' primario'), onclick: async () => { if (salvo && !(await U.confirmar('Começar outro desenho? O desenho em andamento será substituído. Se quiser guardá-lo, abra e use "Salvar no meu progresso" antes.', 'Começar outro'))) return; entrada.click(); } }, 'Escolher foto'),
        h('button', { class: 'btn', onclick: async () => { if (salvo && !(await U.confirmar('Começar outro desenho? O desenho em andamento será substituído.', 'Começar outro'))) return; branco(1240, 1754); } }, 'Papel em branco (A4)')),
      h('p', { class: 'nota' }, 'Tudo fica só neste aparelho. O desenho é salvo sozinho a cada traço.')));
  }

  // ---------------- tela de desenho ----------------
  function telaDesenho(raiz) {
    raiz.innerHTML = '';
    raiz.classList.add('pagina-prancheta', 'pagina-atelie');
    const ui = st.ui = {};

    // barra de ferramentas
    const barra = h('div', { class: 'atelie-ferramentas', role: 'toolbar', 'aria-label': 'Ferramentas' });
    for (const [id, f] of Object.entries(FERR)) {
      barra.append(h('button', { class: 'ferr', 'data-id': id, title: f.rotulo, onclick: () => escolherFerramenta(id) }, f.rotulo));
    }
    ui.barra = barra;
    const acoes = h('div', { class: 'atelie-acoes' },
      h('button', { class: 'btn pequeno', onclick: desfazer, title: 'Desfazer (Ctrl+Z)' }, 'Desfazer'),
      h('button', { class: 'btn pequeno', onclick: refazer, title: 'Refazer (Ctrl+Y)' }, 'Refazer'),
      h('button', { class: 'btn pequeno', onclick: () => zoom(1.25) }, 'Aproximar'),
      h('button', { class: 'btn pequeno', onclick: () => zoom(0.8) }, 'Afastar'),
      h('button', { class: 'btn pequeno', onclick: ajustarVista }, 'Ver tudo'),
      ui.btnFoto = h('button', { class: 'btn pequeno', title: 'Mostrar ou esconder a foto', onclick: () => { st.fotoVis = !st.fotoVis; atualizarPaineis(); desenhar(); } }, 'Foto'),
      ui.btnReta = h('button', { class: 'btn pequeno', title: 'Traço reto entre o ponto inicial e o final', onclick: () => { st.reta = !st.reta; atualizarPaineis(); } }, 'Traço reto'));

    // palco
    const palco = h('div', { class: 'atelie-palco' });
    const cv = h('canvas', { class: 'atelie-tela', 'aria-label': 'Folha de desenho' });
    const refLado = h('img', { class: 'atelie-ref', alt: 'Foto de referência', hidden: true });
    const zoomInfo = h('span', { class: 'atelie-zoom' });
    palco.append(cv, refLado, zoomInfo);
    Object.assign(ui, { palco, cv, ctx: cv.getContext('2d'), refLado, zoomInfo });

    // painéis
    const abas = [['pincel', 'Pincel'], ['cor', 'Tom e cor'], ['camadas', 'Camadas'], ['foto', 'Foto'], ['vista', 'Vista'], ['arquivo', 'Salvar']];
    const segAbas = h('div', { class: 'segmentado atelie-abas' });
    const corpo = h('div', { class: 'cartao atelie-painel' });
    ui.aba = ui.aba || 'pincel';
    for (const [id, rot] of abas) segAbas.append(h('button', { class: 'seg', 'data-id': id, onclick: () => { ui.aba = id; atualizarPaineis(); } }, rot));
    Object.assign(ui, { segAbas, corpo, acoes });

    raiz.append(barra, acoes, palco, segAbas, corpo);
    ligarEntrada(cv);
    ui.ro = new ResizeObserver(() => { redimensionar(); });
    ui.ro.observe(palco);
    redimensionar(true);
    atualizarPaineis();
    ligarTeclado();
    if (!ui.relogio) ui.relogio = setInterval(() => { if (ativo && document.visibilityState === 'visible' && st && st.ativoRecente && Date.now() - st.ativoRecente < 60000) st.segundos++; }, 1000);
  }

  function escolherFerramenta(id) {
    st.ferramenta = id;
    if (FERR[id].dica) U.aviso(FERR[id].dica);
    atualizarPaineis();
  }

  // ---------------- painéis ----------------
  function slider(rot, min, max, passo, valor, fmt, aoMudar) {
    const out = h('output', {}, fmt(valor));
    const inp = h('input', { type: 'range', min, max, step: passo, value: valor, oninput: (e) => { const v = +e.target.value; out.textContent = fmt(v); aoMudar(v); } });
    return h('label', { class: 'slider' }, h('span', {}, rot), inp, out);
  }
  const pct = (v) => Math.round(v * 100) + '%';
  function atualizarPaineis() {
    const ui = st.ui;
    U.$$('.ferr', ui.barra).forEach((b) => b.classList.toggle('ativo', b.dataset.id === st.ferramenta));
    U.$$('.seg', ui.segAbas).forEach((b) => b.classList.toggle('ativo', b.dataset.id === ui.aba));
    ui.btnFoto.classList.toggle('ativo', st.fotoVis); ui.btnFoto.hidden = !st.foto;
    ui.btnReta.classList.toggle('ativo', st.reta);
    ui.refLado.hidden = !(st.foto && st.fotoLado);
    if (st.foto && st.fotoLado && !ui.refLado.src) ui.refLado.src = st.foto.toDataURL('image/jpeg', 0.85);
    const c = ui.corpo; c.innerHTML = '';
    const f = FERR[st.ferramenta], a = ajuste();
    if (ui.aba === 'pincel') {
      c.append(h('p', { class: 'nota' }, h('strong', {}, f.rotulo), f.tipo === 'conta' || f.tipo === 'mao' ? ' não tem ajustes de ponta.' : ''));
      if (st.ferramenta === 'lapis') {
        const seg = h('div', { class: 'segmentado', 'aria-label': 'Graduação do lápis' });
        for (const g of Object.keys(GRAUS)) seg.append(h('button', { class: 'seg' + (g === st.grau ? ' ativo' : ''), onclick: () => { aplicarGrau(g); atualizarPaineis(); } }, g));
        c.append(h('div', { class: 'barra-ferramentas' }, h('span', { class: 'rotulo' }, 'Graduação'), seg));
      }
      if (f.tipo !== 'conta' && f.tipo !== 'mao') {
        c.append(h('div', { class: 'controles coluna' },
          slider('Tamanho', 1, 200, 1, a.tam, (v) => v + ' px', (v) => { a.tam = v; }),
          slider(f.tipo === 'apagar' ? 'Força' : f.tipo === 'borrar' || f.tipo === 'misturar' ? 'Intensidade' : 'Opacidade', 0.02, 1, 0.01, a.fluxo, pct, (v) => { a.fluxo = v; }),
          slider('Dureza da borda', 0, 1, 0.05, a.dureza, pct, (v) => { a.dureza = v; }),
          f.tipo === 'pintar' || st.ferramenta === 'limpatipos' ? slider('Textura do papel', 0, 1, 0.05, a.textura, pct, (v) => { a.textura = v; }) : null,
          slider('Estabilizador', 0, 10, 1, st.estab, (v) => String(v), (v) => { st.estab = v; })),
          h('div', { class: 'linha-botoes' },
            h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: st.pressao, onchange: (e) => { st.pressao = e.target.checked; } }), ' Pressão da caneta'),
            h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: st.reta, onchange: (e) => { st.reta = e.target.checked; ui.btnReta.classList.toggle('ativo', st.reta); } }), ' Traço reto')),
          h('p', { class: 'nota' }, 'Estabilizador alto deixa a linha mais lisa, com um pequeno atraso. A pressão funciona com caneta ativa; com o dedo o traço fica uniforme.'));
      }
    } else if (ui.aba === 'cor') {
      const atual = h('span', { class: 'atelie-cor-atual', style: { background: st.cor } });
      const escala = h('div', { class: 'atelie-escala', 'aria-label': 'Escala de valores' });
      ESCALA.forEach((cor, i) => escala.append(h('button', { class: 'tom' + (cor === st.cor ? ' ativo' : ''), style: { background: cor }, title: `Valor ${i} de 10`, onclick: () => definirCor(cor) }, String(i))));
      const rec = h('div', { class: 'atelie-escala recentes' });
      for (const cor of st.recentes) rec.append(h('button', { class: 'tom', style: { background: cor }, title: cor, onclick: () => definirCor(cor) }));
      c.append(
        h('div', { class: 'barra-ferramentas' }, atual, h('strong', {}, st.cor.toUpperCase()),
          h('label', { class: 'btn pequeno' }, 'Outra cor ', h('input', { type: 'color', value: st.cor, oninput: (e) => definirCor(e.target.value, true), onchange: (e) => definirCor(e.target.value) })),
          h('button', { class: 'btn pequeno', onclick: () => escolherFerramenta('conta') }, 'Conta-gotas')),
        h('p', { class: 'rotulo' }, 'Escala de valores (0 = mais escuro, 10 = papel)'), escala,
        st.recentes.length ? h('p', { class: 'rotulo' }, 'Usadas há pouco') : null, st.recentes.length ? rec : null,
        h('p', { class: 'nota' }, 'No desenho realista a graduação do lápis e a pressão controlam o escuro. Use o conta-gotas na foto para conferir o valor de cada área.'));
    } else if (ui.aba === 'camadas') {
      const lista = h('div', { class: 'atelie-camadas' });
      for (let i = st.camadas.length - 1; i >= 0; i--) {
        const cm = st.camadas[i];
        lista.append(h('div', { class: 'atelie-camada' + (i === st.ativa ? ' ativa' : '') },
          h('button', { class: 'nome', onclick: () => { st.ativa = i; atualizarPaineis(); } }, cm.nome),
          h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: cm.visivel, onchange: (e) => { cm.visivel = e.target.checked; desenhar(); agendarSalvar(); } }), ' visível'),
          h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: cm.opac, title: 'Opacidade da camada', oninput: (e) => { cm.opac = +e.target.value; desenhar(); }, onchange: agendarSalvar }),
          h('span', { class: 'mini' },
            h('button', { class: 'btn pequeno', title: 'Subir', disabled: i === st.camadas.length - 1, onclick: () => moverCamada(i, 1) }, 'Subir'),
            h('button', { class: 'btn pequeno', title: 'Descer', disabled: i === 0, onclick: () => moverCamada(i, -1) }, 'Descer'))));
      }
      c.append(lista, h('div', { class: 'linha-botoes' },
        h('button', { class: 'btn pequeno primario', onclick: () => { st.camadas.splice(st.ativa + 1, 0, st.camada('Camada ' + (st.camadas.length + 1))); st.ativa++; atualizarPaineis(); desenhar(); agendarSalvar(); } }, 'Nova camada'),
        h('button', { class: 'btn pequeno', onclick: duplicarCamada }, 'Duplicar'),
        h('button', { class: 'btn pequeno', disabled: st.ativa === 0, onclick: mesclarAbaixo }, 'Juntar com a de baixo'),
        h('button', { class: 'btn pequeno', onclick: async () => { if (await U.confirmar('Apagar tudo o que está desenhado nesta camada?', 'Limpar')) { registrarDesfazer(camadaAtiva(), 0, 0, st.W, st.H); camadaAtiva().ctx.clearRect(0, 0, st.W, st.H); fimAlteracao(); } } }, 'Limpar camada'),
        h('button', { class: 'btn pequeno', disabled: st.camadas.length < 2, onclick: async () => { if (await U.confirmar(`Excluir a camada "${camadaAtiva().nome}"? Isso não pode ser desfeito.`, 'Excluir')) { st.camadas.splice(st.ativa, 1); st.ativa = Math.max(0, st.ativa - 1); st.desfazer = st.desfazer.filter((d) => st.camadas.includes(d.camada)); st.refazer = []; atualizarPaineis(); desenhar(); agendarSalvar(); } } }, 'Excluir')),
        h('p', { class: 'nota' }, 'Dica de método: uma camada para o contorno leve, outra para os valores e outra para os detalhes. No fim, esconda ou apague a de contorno.'));
    } else if (ui.aba === 'foto') {
      if (!st.foto) {
        c.append(h('p', {}, 'Este desenho começou num papel em branco.'), h('p', { class: 'nota' }, 'Para desenhar sobre uma foto, abra o Ateliê com "Novo desenho" na aba Salvar.'));
      } else {
        c.append(h('div', { class: 'controles coluna' },
          h('div', { class: 'linha-botoes' },
            h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: st.fotoVis, onchange: (e) => { st.fotoVis = e.target.checked; atualizarPaineis(); desenhar(); } }), ' Foto sob o desenho'),
            h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: st.fotoSobre, onchange: (e) => { st.fotoSobre = e.target.checked; desenhar(); } }), ' Foto por cima (conferir)'),
            h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: st.fotoCinza, onchange: (e) => { st.fotoCinza = e.target.checked; desenhar(); } }), ' Foto em tons de cinza'),
            h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: st.fotoLado, onchange: (e) => { st.fotoLado = e.target.checked; atualizarPaineis(); } }), ' Foto ao lado')),
          slider('Transparência da foto', 0.05, 1, 0.05, st.fotoOpac, pct, (v) => { st.fotoOpac = v; desenhar(); })),
          h('div', { class: 'linha-botoes' }, botaoComparar()),
          h('p', { class: 'nota' }, 'Desenhar por cima da foto é decalque: bom para aprender valores e bordas. Para treinar o olhar, esconda a foto e use "Foto ao lado" com a grade.'));
      }
    } else if (ui.aba === 'vista') {
      const grade = h('div', { class: 'segmentado' });
      for (const [n, rot] of [[0, 'Sem grade'], [3, '3 x 3'], [4, '4 x 4'], [6, '6 x 6'], [8, '8 x 8']]) grade.append(h('button', { class: 'seg' + (st.grade === n ? ' ativo' : ''), onclick: () => { st.grade = n; atualizarPaineis(); desenhar(); } }, rot));
      const papel = h('div', { class: 'segmentado' });
      for (const [cor, rot] of [['#ffffff', 'Branco'], ['#fbf8f2', 'Marfim'], ['#efe6d2', 'Creme'], ['#d9d6cf', 'Cinza claro']]) papel.append(h('button', { class: 'seg' + (st.papel === cor ? ' ativo' : ''), onclick: () => { st.papel = cor; atualizarPaineis(); desenhar(); agendarSalvar(); } }, rot));
      c.append(
        h('div', { class: 'barra-ferramentas' }, h('span', { class: 'rotulo' }, 'Grade'), grade),
        h('div', { class: 'barra-ferramentas' }, h('span', { class: 'rotulo' }, 'Papel'), papel),
        h('div', { class: 'linha-botoes' },
          h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: st.graoPapel, onchange: (e) => { st.graoPapel = e.target.checked; desenhar(); } }), ' Grão do papel'),
          h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: st.vista.espelho, onchange: (e) => { st.vista.espelho = e.target.checked; desenhar(); } }), ' Espelhar a vista'),
          h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: st.vista.cinza, onchange: (e) => { st.vista.cinza = e.target.checked; st.ui.cv.style.filter = e.target.checked ? 'grayscale(1)' : ''; } }), ' Ver tudo em cinza')),
        h('p', { class: 'nota' }, 'Espelhar a vista revela erros de proporção que o olho já se acostumou a não ver. Ver em cinza ajuda a conferir só os valores.'));
    } else if (ui.aba === 'arquivo') {
      c.append(h('div', { class: 'linha-botoes' },
        h('button', { class: 'btn primario', onclick: salvarProgresso }, 'Salvar no meu progresso'),
        h('button', { class: 'btn', onclick: () => exportar(false) }, 'Baixar desenho (PNG)'),
        st.foto ? h('button', { class: 'btn', onclick: () => exportar(true) }, 'Baixar com a foto') : null,
        h('button', { class: 'btn', onclick: async () => { await salvarProjeto(); if (await U.confirmar('Começar um desenho novo? O desenho atual será substituído. Use "Salvar no meu progresso" antes se quiser guardá-lo.', 'Começar novo')) { st = null; montar(U.$('#vista')); } } }, 'Novo desenho')),
        h('p', { class: 'nota' }, `O desenho em andamento é salvo sozinho neste aparelho. Tempo de desenho: ${U.duracao(st.segundos)}.`));
    }
  }
  function definirCor(cor, provisoria) {
    st.cor = cor;
    if (!provisoria) {
      st.recentes = [cor, ...st.recentes.filter((c) => c !== cor)].slice(0, 10);
      if (FERR[st.ferramenta].tipo !== 'pintar') st.ferramenta = st.ferramenta === 'conta' ? (st.ultimaPintura || 'lapis') : st.ferramenta;
      atualizarPaineis();
    }
  }
  function moverCamada(i, d) {
    const j = i + d; if (j < 0 || j >= st.camadas.length) return;
    [st.camadas[i], st.camadas[j]] = [st.camadas[j], st.camadas[i]];
    if (st.ativa === i) st.ativa = j; else if (st.ativa === j) st.ativa = i;
    atualizarPaineis(); desenhar(); agendarSalvar();
  }
  function duplicarCamada() {
    const o = camadaAtiva(), n = st.camada(o.nome + ' (cópia)');
    n.ctx.drawImage(o.cv, 0, 0); n.opac = o.opac; n.visivel = o.visivel;
    st.camadas.splice(st.ativa + 1, 0, n); st.ativa++;
    atualizarPaineis(); desenhar(); agendarSalvar();
  }
  async function mesclarAbaixo() {
    if (st.ativa === 0) return;
    if (!(await U.confirmar('Juntar esta camada com a de baixo? Isso não pode ser desfeito.', 'Juntar'))) return;
    const cima = camadaAtiva(), baixo = st.camadas[st.ativa - 1];
    baixo.ctx.globalAlpha = cima.opac; baixo.ctx.drawImage(cima.cv, 0, 0); baixo.ctx.globalAlpha = 1;
    st.camadas.splice(st.ativa, 1); st.ativa--;
    st.desfazer = st.desfazer.filter((d) => st.camadas.includes(d.camada)); st.refazer = [];
    atualizarPaineis(); desenhar(); agendarSalvar();
  }
  // Enquanto o botão está pressionado, mostra só a foto, para comparar com o desenho
  function botaoComparar() {
    const b = h('button', { class: 'btn pequeno', title: 'Segure para ver só a foto' }, 'Comparar com a foto (segure)');
    const mostrar = (e) => { e.preventDefault(); st.comparando = true; desenhar(); };
    const esconder = () => { if (st.comparando) { st.comparando = false; desenhar(); } };
    b.addEventListener('pointerdown', mostrar);
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, esconder);
    return b;
  }

  // ---------------- vista ----------------
  function redimensionar(ajustar) {
    const { palco, cv } = st.ui, r = palco.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    if (!r.width || !r.height) return;
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px';
    st.ui.dpr = dpr; st.ui.lw = r.width; st.ui.lh = r.height;
    if (ajustar || !st.vistaAjustada) { ajustarVista(); st.vistaAjustada = true; } else desenhar();
  }
  function ajustarVista() {
    const { lw, lh } = st.ui, m = 12;
    const esc = Math.min((lw - 2 * m) / st.W, (lh - 2 * m) / st.H);
    Object.assign(st.vista, { esc, x: (lw - st.W * esc) / 2, y: (lh - st.H * esc) / 2 });
    desenhar();
  }
  function zoom(k, cx, cy) {
    const v = st.vista, ui = st.ui;
    if (cx == null) { cx = ui.lw / 2; cy = ui.lh / 2; }
    const nova = Math.min(16, Math.max(0.05, v.esc * k)); k = nova / v.esc;
    v.x = cx - (cx - v.x) * k; v.y = cy - (cy - v.y) * k; v.esc = nova;
    desenhar();
  }
  // tela (px CSS) -> documento
  function paraDoc(px, py) {
    const v = st.vista;
    let x = (px - v.x) / v.esc; const y = (py - v.y) / v.esc;
    if (v.espelho) x = st.W - x;
    return [x, y];
  }
  let pedido = 0;
  function desenhar() { if (!pedido) pedido = requestAnimationFrame(() => { pedido = 0; compor(); }); }
  let padraoPapel = null;
  function compor() {
    if (!st || !st.ui) return;
    const { ctx, cv, dpr } = st.ui, v = st.vista;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--fundo') || '#eee';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr * v.esc, 0, 0, dpr * v.esc, dpr * v.x, dpr * v.y);
    if (v.espelho) { ctx.translate(st.W, 0); ctx.scale(-1, 1); }
    ctx.imageSmoothingEnabled = v.esc < 2;
    ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 12 / v.esc;
    ctx.fillStyle = st.papel; ctx.fillRect(0, 0, st.W, st.H);
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
    const fotoVisivel = st.foto && (st.fotoVis || st.comparando);
    const desenharFoto = () => {
      ctx.save(); ctx.globalAlpha = st.comparando ? 1 : st.fotoOpac;
      if (st.fotoCinza) ctx.filter = 'grayscale(1)';
      ctx.drawImage(st.foto, 0, 0); ctx.restore();
    };
    if (fotoVisivel && !st.fotoSobre && !st.comparando) desenharFoto();
    for (const c of st.camadas) {
      if (!c.visivel || st.comparando) continue;
      ctx.globalAlpha = c.opac; ctx.globalCompositeOperation = c.multiplicar ? 'multiply' : 'source-over';
      ctx.drawImage(c.cv, 0, 0);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (st.graoPapel) {
      if (!padraoPapel) { const g = ruido(256, 104729), x = g.getContext('2d'); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#6b6252'; x.fillRect(0, 0, 256, 256); padraoPapel = ctx.createPattern(g, 'repeat'); }
      ctx.save(); ctx.globalAlpha = 0.07; ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = padraoPapel; ctx.fillRect(0, 0, st.W, st.H); ctx.restore();
    }
    if (fotoVisivel && (st.fotoSobre || st.comparando)) desenharFoto();
    if (st.grade) {
      ctx.save(); ctx.strokeStyle = 'rgba(200,83,31,.55)'; ctx.lineWidth = 1 / v.esc;
      ctx.beginPath();
      for (let i = 1; i < st.grade; i++) { const x = st.W * i / st.grade, y = st.H * i / st.grade; ctx.moveTo(x, 0); ctx.lineTo(x, st.H); ctx.moveTo(0, y); ctx.lineTo(st.W, y); }
      ctx.stroke(); ctx.restore();
    }
    // prévia do traço reto
    if (st.previa) {
      const [a, b] = st.previa, aj = ajuste();
      ctx.save(); ctx.strokeStyle = FERR[st.ferramenta].tipo === 'apagar' ? 'rgba(47,93,154,.8)' : st.cor; ctx.globalAlpha = 0.6; ctx.lineWidth = Math.max(1 / v.esc, aj.tam); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.restore();
    }
    // contorno da ponta sob o cursor
    if (st.cursor && ['pintar', 'apagar', 'borrar', 'misturar'].includes(FERR[st.ferramenta].tipo)) {
      ctx.save(); ctx.lineWidth = 1 / v.esc; ctx.strokeStyle = 'rgba(0,0,0,.55)';
      ctx.beginPath(); ctx.arc(st.cursor[0], st.cursor[1], Math.max(0.5, ajuste().tam / 2), 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(st.cursor[0], st.cursor[1], Math.max(0.5, ajuste().tam / 2) + 1 / v.esc, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    st.ui.zoomInfo.textContent = Math.round(v.esc * 100) + '%';
  }

  // ---------------- desfazer ----------------
  function registrarDesfazer(camada, x, y, w, hh, fonte) {
    x = Math.max(0, Math.floor(x)); y = Math.max(0, Math.floor(y));
    w = Math.min(st.W - x, Math.ceil(w)); hh = Math.min(st.H - y, Math.ceil(hh));
    if (w <= 0 || hh <= 0) return;
    const ctx = fonte ? fonte.getContext('2d') : camada.ctx;
    st.desfazer.push({ camada, x, y, img: ctx.getImageData(x, y, w, hh) });
    if (st.desfazer.length > LIMITE_DESFAZER) st.desfazer.shift();
    st.refazer = [];
  }
  function trocar(de, para) {
    const r = de.pop(); if (!r) return;
    const atual = r.camada.ctx.getImageData(r.x, r.y, r.img.width, r.img.height);
    r.camada.ctx.putImageData(r.img, r.x, r.y);
    para.push({ camada: r.camada, x: r.x, y: r.y, img: atual });
    desenhar(); agendarSalvar();
  }
  const desfazer = () => trocar(st.desfazer, st.refazer);
  const refazer = () => trocar(st.refazer, st.desfazer);
  function fimAlteracao() { st.alterado = true; st.ativoRecente = Date.now(); desenhar(); agendarSalvar(); }

  // ---------------- motor do traço ----------------
  const copia = document.createElement('canvas');
  function iniciarTraco(p) {
    const cam = camadaAtiva();
    if (!cam.visivel) { U.aviso('A camada ativa está escondida. Deixe-a visível para desenhar nela.'); return false; }
    if (copia.width !== st.W || copia.height !== st.H) { copia.width = st.W; copia.height = st.H; }
    const cc = copia.getContext('2d'); cc.clearRect(0, 0, st.W, st.H); cc.drawImage(cam.cv, 0, 0);
    st.traco = { cam, ult: p, suave: [p[0], p[1]], resto: 0, caixa: [p[0], p[1], p[0], p[1]], inicio: p };
    if (!st.reta) dab(p[0], p[1], p[2], p[0], p[1]);
    return true;
  }
  function moverTraco(p) {
    const t = st.traco; if (!t) return;
    if (st.reta) { st.previa = [t.inicio, p]; desenhar(); return; }
    // estabilizador: o ponto segue o dedo com atraso
    const k = st.estab ? 1 / (1 + st.estab * 0.9) : 1;
    t.suave[0] += (p[0] - t.suave[0]) * k; t.suave[1] += (p[1] - t.suave[1]) * k;
    segmento(t, [t.suave[0], t.suave[1], p[2]]);
    desenhar();
  }
  function segmento(t, p) {
    const a = t.ult, dx = p[0] - a[0], dy = p[1] - a[1], dist = Math.hypot(dx, dy);
    const aj = ajuste(), esp = Math.max(0.4, aj.tam * (FERR[st.ferramenta].espac || 0.1));
    let pos = esp - t.resto;
    let prev = [a[0], a[1]];
    while (pos <= dist) {
      const f = pos / dist, x = a[0] + dx * f, y = a[1] + dy * f, pr = a[2] + (p[2] - a[2]) * f;
      dab(x, y, pr, prev[0], prev[1]);
      prev = [x, y]; pos += esp;
    }
    t.resto = dist - (pos - esp);
    t.ult = p;
  }
  function terminarTraco(p) {
    const t = st.traco; if (!t) return;
    if (st.reta && p) {
      st.previa = null;
      t.ult = [t.inicio[0], t.inicio[1], 1];
      dab(t.inicio[0], t.inicio[1], 1, t.inicio[0], t.inicio[1]);
      segmento(t, [p[0], p[1], 1]);
    } else if (p && st.estab) {
      // completa até o ponto real ao soltar
      segmento(t, p);
    }
    const [x0, y0, x1, y1] = t.caixa, m = ajuste().tam + 4;
    registrarDesfazer(t.cam, x0 - m, y0 - m, x1 - x0 + 2 * m, y1 - y0 + 2 * m, copia);
    st.traco = null;
    fimAlteracao();
  }
  function cancelarTraco() {
    const t = st.traco; if (!t) return;
    t.cam.ctx.clearRect(0, 0, st.W, st.H); t.cam.ctx.drawImage(copia, 0, 0);
    st.traco = null; st.previa = null; desenhar();
  }
  // Uma "pincelada" elementar no ponto (x, y); (px, py) é o ponto anterior (para o esfuminho)
  function dab(x, y, pressao, px, py) {
    const t = st.traco, f = FERR[st.ferramenta], aj = ajuste(), ctx = t.cam.ctx;
    const p = st.pressao ? pressao : 1;
    const raio = Math.max(0.5, aj.tam / 2 * (f.pTam && st.pressao ? 0.3 + 0.7 * p : 1));
    const alfa = Math.min(1, aj.fluxo * (f.pOp && st.pressao ? 0.25 + 0.75 * p : 1));
    const c = t.caixa; c[0] = Math.min(c[0], x - raio); c[1] = Math.min(c[1], y - raio); c[2] = Math.max(c[2], x + raio); c[3] = Math.max(c[3], y + raio);
    const lado = Math.ceil(raio * 2) + 2, ox = x - lado / 2, oy = y - lado / 2;
    if (f.tipo === 'pintar' || f.tipo === 'apagar') {
      const pt = ponta(raio, aj.dureza, f.tipo === 'apagar' ? '#000000' : st.cor);
      let fonte = pt;
      if (aj.textura > 0.02) {
        prepararTmp(lado);
        tctx.drawImage(pt, 0, 0);
        tctx.globalCompositeOperation = 'destination-in';
        const pad = tctx.createPattern(mascaraGrao(aj.textura), 'repeat');
        pad.setTransform(new DOMMatrix().translate(-ox, -oy));
        tctx.fillStyle = pad; tctx.fillRect(0, 0, lado, lado);
        fonte = tmp;
      }
      ctx.save();
      ctx.globalAlpha = alfa;
      ctx.globalCompositeOperation = f.tipo === 'apagar' ? 'destination-out' : 'source-over';
      ctx.drawImage(fonte, 0, 0, lado, lado, ox, oy, lado, lado);
      ctx.restore();
    } else if (f.tipo === 'borrar' || f.tipo === 'misturar') {
      // leva um pouco do que está sob o ponto anterior para o ponto atual
      const sx = (f.tipo === 'misturar' ? (px + x) / 2 : px) - lado / 2, sy = (f.tipo === 'misturar' ? (py + y) / 2 : py) - lado / 2;
      prepararTmp(lado);
      if (f.tipo === 'misturar') tctx.filter = `blur(${Math.max(1, raio * 0.18).toFixed(1)}px)`;
      tctx.drawImage(t.cam.cv, sx, sy, lado, lado, 0, 0, lado, lado);
      tctx.filter = 'none';
      tctx.globalCompositeOperation = 'destination-in';
      tctx.drawImage(ponta(raio, aj.dureza, '#000000'), 0, 0);
      ctx.save(); ctx.globalAlpha = alfa;
      ctx.drawImage(tmp, 0, 0, lado, lado, ox, oy, lado, lado);
      ctx.restore();
    }
  }
  // Tom visível num ponto do documento (foto + camadas)
  function amostrar(x, y) {
    const c = document.createElement('canvas'); c.width = c.height = 1;
    const k = c.getContext('2d', { willReadFrequently: true });
    k.fillStyle = st.papel; k.fillRect(0, 0, 1, 1);
    k.translate(-Math.floor(x), -Math.floor(y));
    if (st.foto && st.fotoVis) { k.globalAlpha = st.fotoOpac; if (st.fotoCinza) k.filter = 'grayscale(1)'; k.drawImage(st.foto, 0, 0); k.filter = 'none'; }
    // sem desenho por cima, o conta-gotas na foto pega a cor real
    let temDesenho = false;
    for (const cm of st.camadas) if (cm.visivel && cm.ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data[3] > 8) temDesenho = true;
    if (!temDesenho && st.foto && st.fotoVis) { k.globalAlpha = 1; k.drawImage(st.foto, 0, 0); if (st.fotoCinza) { const d = k.getImageData(0, 0, 1, 1).data; const v = Math.round(0.299 * d[0] + 0.587 * d[1] + 0.114 * d[2]); return '#' + [v, v, v].map((n) => n.toString(16).padStart(2, '0')).join(''); } }
    for (const cm of st.camadas) if (cm.visivel) { k.globalAlpha = cm.opac; k.globalCompositeOperation = cm.multiplicar ? 'multiply' : 'source-over'; k.drawImage(cm.cv, 0, 0); }
    const d = k.getImageData(0, 0, 1, 1).data;
    return '#' + [d[0], d[1], d[2]].map((n) => n.toString(16).padStart(2, '0')).join('');
  }

  // ---------------- entrada (dedo, caneta, mouse) ----------------
  function ligarEntrada(cv) {
    const ponteiros = new Map();
    let gesto = null, arrastoMao = null, temCaneta = false;
    const local = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const pressaoDe = (e) => (e.pointerType === 'pen' ? (e.pressure || 0.5) : 1);
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId);
      e.preventDefault();
      if (e.pointerType === 'pen') temCaneta = true;
      ponteiros.set(e.pointerId, local(e));
      // dois dedos: move e aproxima; cancela o traço que tinha acabado de começar
      if (ponteiros.size === 2) {
        if (st.traco) cancelarTraco();
        const [a, b] = [...ponteiros.values()];
        gesto = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] };
        return;
      }
      if (ponteiros.size > 2) return;
      const f = FERR[st.ferramenta];
      const [lx, ly] = local(e);
      // com caneta ativa, o dedo só move a folha (evita marcas da palma)
      if (f.tipo === 'mao' || e.button === 1 || st.espaco || (temCaneta && e.pointerType === 'touch')) { arrastoMao = { x: lx, y: ly, vx: st.vista.x, vy: st.vista.y }; return; }
      const [x, y] = paraDoc(lx, ly);
      if (f.tipo === 'conta') { definirCor(amostrar(x, y)); U.aviso('Tom copiado.'); return; }
      if (f.tipo === 'pintar') st.ultimaPintura = st.ferramenta;
      iniciarTraco([x, y, pressaoDe(e)]);
    });
    cv.addEventListener('pointermove', (e) => {
      const [lx, ly] = local(e);
      if (e.pointerType === 'mouse' || e.pointerType === 'pen') { st.cursor = paraDoc(lx, ly); if (!st.traco) desenhar(); }
      if (!ponteiros.has(e.pointerId)) return;
      ponteiros.set(e.pointerId, [lx, ly]);
      if (gesto && ponteiros.size >= 2) {
        const [a, b] = [...ponteiros.values()];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1]), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        st.vista.x += m[0] - gesto.m[0]; st.vista.y += m[1] - gesto.m[1];
        zoom(d / (gesto.d || d), m[0], m[1]);
        gesto = { d, m };
        return;
      }
      if (arrastoMao) { st.vista.x = arrastoMao.vx + lx - arrastoMao.x; st.vista.y = arrastoMao.vy + ly - arrastoMao.y; desenhar(); return; }
      if (st.traco) {
        const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
        for (const ev of (evs.length ? evs : [e])) { const [ax, ay] = local(ev); const [x, y] = paraDoc(ax, ay); moverTraco([x, y, pressaoDe(ev)]); }
      }
    });
    const soltar = (e) => {
      if (!ponteiros.has(e.pointerId)) return;
      ponteiros.delete(e.pointerId);
      if (gesto) { if (ponteiros.size < 2) gesto = null; return; }
      if (arrastoMao) { arrastoMao = null; return; }
      if (st.traco) { const [lx, ly] = local(e); const [x, y] = paraDoc(lx, ly); terminarTraco(e.type === 'pointercancel' ? null : [x, y, pressaoDe(e)]); }
    };
    cv.addEventListener('pointerup', soltar);
    cv.addEventListener('pointercancel', soltar);
    cv.addEventListener('pointerleave', () => { st.cursor = null; desenhar(); });
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      const [lx, ly] = local(e);
      if (e.ctrlKey || !e.shiftKey) zoom(Math.exp(-e.deltaY * 0.0015), lx, ly);
      else { st.vista.x -= e.deltaY; desenhar(); }
    }, { passive: false });
  }

  let teclado = null;
  function ligarTeclado() {
    if (teclado) return;
    teclado = (e) => {
      if (!ativo || !st || !st.ui || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); if (e.shiftKey) refazer(); else desfazer(); }
      else if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); refazer(); }
      else if (k === '[' || k === ']') { const a = ajuste(); if (a.tam) { a.tam = Math.max(1, Math.min(200, Math.round(a.tam * (k === ']' ? 1.2 : 1 / 1.2)))); if (st.ui.aba === 'pincel') atualizarPaineis(); desenhar(); } }
      else if (k === ' ' && !st.espaco) { st.espaco = true; e.preventDefault(); }
      else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const atalho = { b: 'lapis', c: 'carvao', p: 'pincel', a: 'aerografo', s: 'esfuminho', l: 'lenco', e: 'borracha', i: 'conta', h: 'mao' }[k];
        if (atalho) escolherFerramenta(atalho);
      }
    };
    document.addEventListener('keydown', teclado);
    document.addEventListener('keyup', (e) => { if (e.key === ' ' && st) st.espaco = false; });
  }

  // ---------------- exportar ----------------
  function imagemFinal(comFoto) {
    const c = document.createElement('canvas'); c.width = st.W; c.height = st.H;
    const x = c.getContext('2d');
    x.fillStyle = st.papel; x.fillRect(0, 0, st.W, st.H);
    if (comFoto && st.foto) { x.globalAlpha = st.fotoOpac; if (st.fotoCinza) x.filter = 'grayscale(1)'; x.drawImage(st.foto, 0, 0); x.filter = 'none'; x.globalAlpha = 1; }
    for (const cm of st.camadas) if (cm.visivel) { x.globalAlpha = cm.opac; x.globalCompositeOperation = cm.multiplicar ? 'multiply' : 'source-over'; x.drawImage(cm.cv, 0, 0); }
    if (st.graoPapel) { x.globalAlpha = 0.07; x.globalCompositeOperation = 'multiply'; const g = ruido(256, 104729), gx = g.getContext('2d'); gx.globalCompositeOperation = 'source-in'; gx.fillStyle = '#6b6252'; gx.fillRect(0, 0, 256, 256); x.fillStyle = x.createPattern(g, 'repeat'); x.fillRect(0, 0, st.W, st.H); }
    return c;
  }
  async function exportar(comFoto) {
    try { U.baixar(await U.canvasParaBlob(imagemFinal(comFoto)), `desenho-${new Date().toISOString().slice(0, 10)}.png`); } catch (e) { U.aviso('Não foi possível gerar a imagem.'); }
  }
  function salvarProgresso() {
    const titulo = h('input', { type: 'text', value: 'Desenho do ateliê', maxlength: 80 });
    U.modal('Salvar no meu progresso', h('div', { class: 'controles coluna' }, h('label', {}, 'Nome do desenho', titulo), h('p', { class: 'nota' }, `Tempo de desenho: ${U.duracao(st.segundos)}`)), [
      { rotulo: 'Cancelar' },
      { rotulo: 'Salvar', classe: 'primario', acao: async () => {
        try {
          const png = await U.canvasParaBlob(imagemFinal(false));
          await U.desenhos.salvar({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), criadoEm: new Date().toISOString(), origem: 'atelie', titulo: titulo.value.trim() || 'Desenho do ateliê', duracao: st.segundos, png });
          U.registrarPratica(Math.max(60, st.segundos));
          U.aviso('Desenho salvo no seu progresso.');
        } catch (e) { U.aviso('Não foi possível salvar. Use "Baixar desenho".'); }
      } }
    ]);
  }

  // Chamado pelo roteador ao sair da aba
  function sair() {
    if (!ativo) return;
    ativo = false;
    if (st && st.ui) { if (st.ui.ro) st.ui.ro.disconnect(); if (st.traco) cancelarTraco(); }
    if (st) salvarProjeto();
  }

  return { montar, sair, ativo: () => ativo };
})();
