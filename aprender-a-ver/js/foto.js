/*
 * Ferramenta de foto: transforma uma foto do aparelho em etapas de desenho
 * (sem inteligência artificial, só processamento de imagem local), sobrepõe
 * grades de proporção (Betty Edwards e Andrew Loomis), oferece o visor com
 * grade e a aferição de ângulos e comprimentos. A foto não sai do aparelho.
 */
const Foto = (() => {
  const { h, $ } = U;
  const MAX = 900;
  const COR = { vermelho: [200, 69, 44], azul: [142, 163, 196], grafite: [46, 41, 37], papel: [251, 248, 242] };

  // Estado mantido enquanto o app estiver aberto
  const st = {
    inteira: null, base: null, W: 0, H: 0, etapas: null,
    aba: 'etapas', girar: false, espelhar: false,
    limiar: 40, inverter: false,
    modoProp: 'frente', prop: null, perfilDir: 1, loomis: null,
    razao: 0.7071, visor: null, nGrade: 4,
    afer: { pts: [], unidade: null }
  };

  // ---------------- processamento ----------------
  function cinza(cv) {
    const { width: W, height: H } = cv;
    const d = cv.getContext('2d').getImageData(0, 0, W, H).data;
    const g = new Float32Array(W * H);
    for (let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = (0.299 * d[j] + 0.587 * d[j + 1] + 0.114 * d[j + 2]) / 255;
    return g;
  }
  function borrar(src, W, H, r, passes = 3) {
    let a = Float32Array.from(src), b = new Float32Array(src.length);
    r = Math.max(1, Math.round(r));
    for (let p = 0; p < passes; p++) {
      for (let y = 0; y < H; y++) { // horizontal
        let soma = 0; const o = y * W;
        for (let x = -r; x <= r; x++) soma += a[o + Math.min(W - 1, Math.max(0, x))];
        for (let x = 0; x < W; x++) {
          b[o + x] = soma / (2 * r + 1);
          soma += a[o + Math.min(W - 1, x + r + 1)] - a[o + Math.max(0, x - r)];
        }
      }
      for (let x = 0; x < W; x++) { // vertical
        let soma = 0;
        for (let y = -r; y <= r; y++) soma += b[Math.min(H - 1, Math.max(0, y)) * W + x];
        for (let y = 0; y < H; y++) {
          a[y * W + x] = soma / (2 * r + 1);
          soma += b[Math.min(H - 1, y + r + 1) * W + x] - b[Math.max(0, y - r) * W + x];
        }
      }
    }
    return a;
  }
  function sobel(g, W, H) {
    const m = new Float32Array(W * H);
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        const gx = -g[i - W - 1] - 2 * g[i - 1] - g[i + W - 1] + g[i - W + 1] + 2 * g[i + 1] + g[i + W + 1];
        const gy = -g[i - W - 1] - 2 * g[i - W] - g[i - W + 1] + g[i + W - 1] + 2 * g[i + W] + g[i + W + 1];
        m[i] = Math.hypot(gx, gy);
      }
    }
    return m;
  }
  function percentil(arr, p) {
    let max = 0;
    for (let i = 0; i < arr.length; i++) if (arr[i] > max) max = arr[i];
    if (!max) return 0;
    const N = 1024, hist = new Uint32Array(N);
    for (let i = 0; i < arr.length; i++) hist[Math.min(N - 1, (arr[i] / max * (N - 1)) | 0)]++;
    const alvo = arr.length * p;
    let acc = 0;
    for (let k = 0; k < N; k++) { acc += hist[k]; if (acc >= alvo) return (k / (N - 1)) * max; }
    return max;
  }
  const novaTela = (W, H) => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  function pintar(W, H, fn) {
    const c = novaTela(W, H), ctx = c.getContext('2d');
    const img = ctx.createImageData(W, H), d = img.data;
    for (let i = 0, j = 0; i < W * H; i++, j += 4) {
      const [r, g, b] = fn(i);
      d[j] = r; d[j + 1] = g; d[j + 2] = b; d[j + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }
  const misturar = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  function tonsPorQuantil(g, qs) { return qs.map((q) => percentil(g, q)); }
  const TONS5 = [[36, 32, 29], [98, 92, 84], [156, 149, 138], [207, 200, 188], [247, 243, 235]];

  function gerarEtapas() {
    const { W, H } = st;
    const g = cinza(st.base);
    const gGeral = borrar(g, W, H, Math.max(3, W / 110), 3);
    const gDet = borrar(g, W, H, Math.max(1, W / 450), 2);
    const gMassa = borrar(g, W, H, Math.max(2, W / 200), 3);
    const mGeral = sobel(gGeral, W, H), mDet = sobel(gDet, W, H);
    const tGeral = percentil(mGeral, 0.9), tDet = percentil(mDet, 0.84);
    const t3 = tonsPorQuantil(gMassa, [0.33, 0.66]);
    const t5 = tonsPorQuantil(gMassa, [0.2, 0.4, 0.6, 0.8]);
    st.proc = { g, gMassa, mGeral, mDet, tGeral, tDet };
    const e = {};
    e.geral = pintar(W, H, (i) => (mGeral[i] > tGeral ? COR.vermelho : COR.papel));
    e.contornos = pintar(W, H, (i) => (mDet[i] > tDet ? COR.vermelho : mGeral[i] > tGeral ? COR.azul : COR.papel));
    e.tres = pintar(W, H, (i) => { const v = gMassa[i]; const c = v < t3[0] ? TONS5[1] : v < t3[1] ? TONS5[3] : TONS5[4]; return mDet[i] > tDet ? misturar(c, COR.grafite, 0.6) : c; });
    e.cinco = pintar(W, H, (i) => { const v = gMassa[i]; let k = 0; while (k < 4 && v >= t5[k]) k++; return TONS5[k]; });
    e.cinza = pintar(W, H, (i) => { const v = g[i]; return [24 + 229 * v, 21 + 227 * v, 18 + 224 * v]; });
    st.etapas = e;
    gerarNanquim();
  }
  function gerarNanquim() {
    const { W, H } = st, { gMassa } = st.proc;
    const t = percentil(gMassa, st.limiar / 100);
    const inv = st.inverter;
    st.etapas.nanquim = pintar(W, H, (i) => ((gMassa[i] < t) !== inv ? [22, 20, 18] : COR.papel));
  }

  // ---------------- carregar foto ----------------
  async function carregarArquivo(arq) {
    const url = URL.createObjectURL(arq);
    try {
      const img = await U.carregarImagem(url);
      const k = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
      const W = Math.round(img.naturalWidth * k), H = Math.round(img.naturalHeight * k);
      const c = novaTela(W, H);
      c.getContext('2d').drawImage(img, 0, 0, W, H);
      st.inteira = c;
      definirBase(c);
    } finally { URL.revokeObjectURL(url); }
  }
  function definirBase(c) {
    st.base = c; st.W = c.width; st.H = c.height;
    const { W, H } = st;
    const hh = H * 0.36;
    st.prop = { cx: W / 2, cy: H * 0.5, hh, half: hh * 0.68, ang: 0, olho: -hh * 0.35 };
    st.loomis = { cx: W / 2, cy: H * 0.42, R: Math.min(W, H) * 0.24, g: 0, a: 0, r: 0 };
    const vw = Math.min(W * 0.8, H * 0.8 * st.razao);
    st.visor = { x: (W - vw) / 2, y: (H - vw / st.razao) / 2, w: vw };
    st.afer = { pts: [], unidade: null };
    gerarEtapas();
  }

  // ---------------- geometria das sobreposições ----------------
  const paraImg = (p, lx, ly) => [p.cx + lx * Math.cos(p.ang) - ly * Math.sin(p.ang), p.cy + lx * Math.sin(p.ang) + ly * Math.cos(p.ang)];
  const paraLocal = (p, x, y) => { const dx = x - p.cx, dy = y - p.cy, c = Math.cos(p.ang), s = Math.sin(p.ang); return [dx * c + dy * s, -dx * s + dy * c]; };
  const f1 = (n) => n.toFixed(1);

  const OVAL = [[0, -1], [0.575, -1], [1, -0.694], [1, -0.235], [1, 0.129], [0.912, 0.424], [0.735, 0.6], [0.558, 0.788], [0.283, 1], [0, 1]];
  function caminhoOval(p) {
    const pt = (x, y) => paraImg(p, x * p.half, y * p.hh).map(f1).join(',');
    const dir = OVAL, esq = OVAL.slice().reverse().map(([x, y]) => [-x, y]);
    let d = 'M' + pt(...dir[0]);
    for (let i = 1; i < dir.length; i += 3) d += 'C' + [dir[i], dir[i + 1], dir[i + 2]].map((q) => pt(...q)).join(' ');
    for (let i = 1; i < esq.length; i += 3) d += 'C' + [esq[i], esq[i + 1], esq[i + 2]].map((q) => pt(...q)).join(' ');
    return d + 'Z';
  }
  function linhaLocal(p, x1, y1, x2, y2, cls = 'l') {
    const a = paraImg(p, x1, y1), b = paraImg(p, x2, y2);
    return `<line class="${cls}" x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}"/>`;
  }
  function textoLocal(p, x, y, t, anc = 'start') {
    const a = paraImg(p, x, y);
    return `<text class="tx-sobre" text-anchor="${anc}" x="${f1(a[0])}" y="${f1(a[1])}">${t}</text>`;
  }

  function alcasProp() {
    const p = st.prop;
    const lista = [
      { id: 'mover', pos: [p.cx, p.cy] },
      { id: 'topo', pos: paraImg(p, 0, -p.hh) },
      { id: 'queixo', pos: paraImg(p, 0, p.hh) },
      { id: 'girar', pos: paraImg(p, 0, -p.hh * 1.25) }
    ];
    if (st.modoProp === 'frente') lista.push({ id: 'lado', pos: paraImg(p, p.half, 0) });
    if (st.modoProp === 'perfil') lista.push({ id: 'olho', pos: paraImg(p, p.olho, 0) });
    return lista;
  }
  function svgProporcoes(somenteLinhas = false) {
    const p = st.prop, hh = p.hh, hf = p.half;
    let s = '';
    if (st.modoProp === 'frente') {
      const boca = hh / 2 + hh / 6;
      s += `<path class="l" d="${caminhoOval(p)}"/>`;
      s += linhaLocal(p, 0, -hh * 1.08, 0, hh * 1.08, 'l g');
      for (const [y, rot] of [[-hh, 'A topo'], [-hh / 2, 'B cabelo'], [0, 'C olhos'], [hh / 2, 'D nariz'], [hh, 'E queixo']]) {
        s += linhaLocal(p, -hf * 1.25, y, hf * 1.25, y, y === 0 ? 'l' : 'l g');
        if (!somenteLinhas) s += textoLocal(p, hf * 1.22, y - hh * 0.03, rot, 'end');
      }
      s += linhaLocal(p, -hf * 0.7, boca, hf * 0.7, boca, 'l g');
      for (let k = 0; k <= 5; k++) { const x = -hf + k * 0.4 * hf; s += linhaLocal(p, x, -hh * 0.05, x, hh * 0.05); }
      for (const sx of [-1, 1]) {
        s += linhaLocal(p, sx * 0.2 * hf, 0, sx * 0.2 * hf, hh / 2, 'l g');
        s += linhaLocal(p, sx * 0.4 * hf, 0, sx * 0.4 * hf, boca, 'l g');
        s += linhaLocal(p, sx * hf * 1.02, 0, sx * hf * 1.02, hh / 2);
      }
    } else if (st.modoProp === 'perfil') {
      const d = st.perfilDir, ox = p.olho;
      for (const [y, rot] of [[-hh, 'topo'], [0, 'olhos: metade'], [hh, 'queixo']]) {
        s += linhaLocal(p, -hh * 1.1, y, hh * 1.1, y, y === 0 ? 'l' : 'l g');
        if (!somenteLinhas) s += textoLocal(p, -hh * 1.1, y - 6, rot);
      }
      const a = paraImg(p, ox, 0), b = paraImg(p, ox + d * hh, 0), c = paraImg(p, ox, hh);
      s += `<path class="l" d="M${a.map(f1)}L${b.map(f1)}L${c.map(f1)}Z"/>`;
      s += linhaLocal(p, ox + d * hh, -hh * 0.05, ox + d * hh, hh * 0.58);
      s += linhaLocal(p, ox + d * hh * 0.7, hh * 0.58, ox + d * hh * 1.5, hh * 0.58, 'l g');
      if (!somenteLinhas) {
        s += textoLocal(p, ox + d * hh + d * 6, hh * 0.3, 'fundo da orelha');
        s += textoLocal(p, ox + d * hh * 1.05, hh * 0.58 - 6, 'nuca');
      }
    } else {
      const L = st.loomis;
      const partes = Cabeca.projetar(L.g, L.a, L.r);
      s += `<g class="ant">${Cabeca.svg(partes, ['esfera', 'lateral', 'central', 'sobrancelha', 'tercos', 'mandibula'], L.cx, L.cy, L.R)}</g>`;
      s += `<g class="novo">${Cabeca.svg(partes, ['tracos', 'orelhas'], L.cx, L.cy, L.R, { ocultas: false })}</g>`;
    }
    return s;
  }
  function svgVisor(somenteLinhas = false) {
    const v = st.visor, vh = v.w / st.razao, n = st.nGrade;
    let s = '';
    if (!somenteLinhas) s += `<path class="escurecer" d="M0,0H${st.W}V${st.H}H0Z M${f1(v.x)},${f1(v.y)}v${f1(vh)}h${f1(v.w)}v${f1(-vh)}Z" fill-rule="evenodd"/>`;
    s += `<rect class="l" x="${f1(v.x)}" y="${f1(v.y)}" width="${f1(v.w)}" height="${f1(vh)}"/>`;
    for (let i = 1; i < n; i++) {
      s += `<line class="l g" x1="${f1(v.x + v.w * i / n)}" y1="${f1(v.y)}" x2="${f1(v.x + v.w * i / n)}" y2="${f1(v.y + vh)}"/>`;
      s += `<line class="l g" x1="${f1(v.x)}" y1="${f1(v.y + vh * i / n)}" x2="${f1(v.x + v.w)}" y2="${f1(v.y + vh * i / n)}"/>`;
    }
    s += `<line class="l g h" x1="${f1(v.x)}" y1="${f1(v.y)}" x2="${f1(v.x + v.w)}" y2="${f1(v.y + vh)}"/><line class="l g h" x1="${f1(v.x + v.w)}" y1="${f1(v.y)}" x2="${f1(v.x)}" y2="${f1(v.y + vh)}"/>`;
    return s;
  }
  function medidas() {
    const P = st.afer.pts, segs = [];
    for (let i = 0; i + 1 < P.length; i += 2) {
      const [a, b] = [P[i], P[i + 1]];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      let angH = Math.abs(Math.atan2(-dy, dx) * 180 / Math.PI);
      if (angH > 90) angH = 180 - angH;
      segs.push({ a, b, comp: Math.hypot(dx, dy), angH, angV: 90 - angH, i: i / 2 });
    }
    return segs;
  }
  function svgAfericao() {
    let s = '';
    const segs = medidas(), un = st.afer.unidade != null ? segs[st.afer.unidade] : null;
    for (const sg of segs) {
      const cls = un && sg.i === st.afer.unidade ? 'l unidade' : 'l';
      s += `<line class="${cls}" x1="${f1(sg.a[0])}" y1="${f1(sg.a[1])}" x2="${f1(sg.b[0])}" y2="${f1(sg.b[1])}"/>`;
      s += `<line class="l g" x1="${f1(sg.a[0])}" y1="${f1(sg.a[1])}" x2="${f1(sg.a[0] + (sg.b[0] >= sg.a[0] ? 1 : -1) * sg.comp * 0.6)}" y2="${f1(sg.a[1])}"/>`;
      const mx = (sg.a[0] + sg.b[0]) / 2, my = (sg.a[1] + sg.b[1]) / 2;
      const txt = `${sg.i + 1}: ${Math.round(sg.angH)}°` + (un ? ` · ${(sg.comp / un.comp).toFixed(2).replace('.', ',')} u` : '');
      s += `<text class="tx-sobre" x="${f1(mx + 8)}" y="${f1(my - 8)}">${txt}</text>`;
    }
    for (const p of st.afer.pts) s += `<circle class="ponto" cx="${f1(p[0])}" cy="${f1(p[1])}" r="${f1(Math.max(4, st.W / 150))}"/>`;
    return s;
  }

  // ---------------- tela ----------------
  let raizAtual = null, opAtual = {};
  function montar(raiz, op = {}) {
    raizAtual = raiz; opAtual = op;
    if (op.aba) st.aba = op.aba;
    desenharTela();
  }

  function desenharTela() {
    const raiz = raizAtual;
    raiz.innerHTML = '';
    const entradaCamera = h('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true, onchange: aoEscolher });
    const entradaGaleria = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: aoEscolher });
    async function aoEscolher(e) {
      const arq = e.target.files && e.target.files[0];
      if (!arq) return;
      raiz.innerHTML = '<p class="carregando">Preparando as etapas...</p>';
      try { await carregarArquivo(arq); } catch (err) { U.aviso(err.message); }
      desenharTela();
    }
    raiz.append(entradaCamera, entradaGaleria);
    const exercicio = opAtual.exercicio && Licoes.EXERCICIOS[opAtual.exercicio];
    if (exercicio) raiz.append(h('div', { class: 'faixa-exercicio' }, h('b', {}, 'Exercício: '), exercicio.titulo));

    if (!st.base) {
      raiz.append(h('div', { class: 'cartao vazio' },
        h('div', { class: 'ico-grande', html: U.icone('foto', 'ico') }),
        h('h2', {}, 'Transforme uma foto em estudo'),
        h('p', {}, 'O aplicativo separa a foto em etapas: contorno geral, contornos internos, massas de sombra e valores. Também sobrepõe as grades de proporção de Betty Edwards e a cabeça de Loomis, e mede ângulos para você conferir.'),
        h('p', { class: 'nota' }, 'A foto fica só neste aparelho. Nada é enviado para a internet.'),
        h('div', { class: 'linha-botoes' },
          h('button', { class: 'btn primario', onclick: () => entradaCamera.click() }, 'Tirar foto'),
          h('button', { class: 'btn', onclick: () => entradaGaleria.click() }, 'Escolher da galeria'))
      ));
      return;
    }

    const abas = [['etapas', 'Etapas'], ['proporcoes', 'Proporções'], ['visor', 'Visor e grade'], ['afericao', 'Aferição']];
    const nav = h('div', { class: 'abas-internas', role: 'tablist' });
    for (const [id, rot] of abas) nav.append(h('button', { class: 'aba' + (st.aba === id ? ' ativa' : ''), role: 'tab', 'aria-selected': st.aba === id ? 'true' : 'false', onclick: () => { st.aba = id; desenharTela(); } }, rot));
    const ferramentas = h('div', { class: 'linha-botoes pequena' },
      h('button', { class: 'btn pequeno' + (st.girar ? ' ativo' : ''), onclick: () => { st.girar = !st.girar; desenharTela(); } }, 'De cabeça para baixo'),
      h('button', { class: 'btn pequeno' + (st.espelhar ? ' ativo' : ''), onclick: () => { st.espelhar = !st.espelhar; desenharTela(); } }, 'Espelhar'),
      h('button', { class: 'btn pequeno', onclick: () => entradaGaleria.click() }, 'Trocar foto'));
    raiz.append(nav, ferramentas);

    const corpo = h('div', { class: 'foto-corpo' });
    raiz.append(corpo);
    if (st.aba === 'etapas') abaEtapas(corpo);
    else abaSobreposta(corpo, st.aba);
  }

  const transformar = () => `${st.girar ? 'rotate(180deg) ' : ''}${st.espelhar ? 'scaleX(-1)' : ''}`.trim() || 'none';

  // Etapas geradas da foto
  function abaEtapas(corpo) {
    const e = st.etapas;
    const fig = (cv) => () => { const img = h('img', { src: cv.toDataURL('image/jpeg', 0.9), alt: '', class: 'foto-etapa' }); img.style.transform = transformar(); return img; };
    const controlesNanquim = () => {
      const saida = h('output', {}, st.limiar + '%');
      return h('div', { class: 'controles coluna' },
        h('label', { class: 'slider' }, h('span', {}, 'Quanto é sombra'), h('input', { type: 'range', min: 10, max: 80, value: st.limiar, oninput: (ev) => { st.limiar = +ev.target.value; saida.textContent = st.limiar + '%'; }, onchange: () => { gerarNanquim(); desenharTela(); } }), saida),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: st.inverter, onchange: (ev) => { st.inverter = ev.target.checked; gerarNanquim(); desenharTela(); } }), ' Inverter (para ver o espaço negativo escuro)'));
    };
    const etapas = [
      { titulo: 'Contorno geral', texto: 'Só as grandes bordas. Comece por aqui: tamanho da cabeça no papel, inclinação e o formato do espaço em volta. Detalhe nenhum ainda.', figura: fig(e.geral), cv: e.geral },
      { titulo: 'Contornos internos', texto: 'Em vermelho, as bordas menores: olhos, nariz, boca, dobras. Desenhe olhando as formas entre elas, e não as partes com nome.', figura: fig(e.contornos), cv: e.contornos },
      { titulo: 'Sombras em duas tonalidades', texto: 'O exercício do nanquim: só papel e preto. Ajuste o controle até as formas de sombra ficarem claras. Com "Inverter", o fundo fica escuro e você treina espaços negativos.', figura: fig(e.nanquim), cv: e.nanquim, extra: controlesNanquim },
      { titulo: 'Três valores', texto: 'Claro, meio-tom e escuro. Planeje o desenho em poucas massas antes de ir para os detalhes.', figura: fig(e.tres), cv: e.tres },
      { titulo: 'Cinco valores', texto: 'A mesma escala da lição de valores. Compare cada área com a escala e pergunte qual tom ela é.', figura: fig(e.cinco), cv: e.cinco },
      { titulo: 'Referência em cinza', texto: 'A foto sem cor. Sem a cor, fica mais fácil julgar claro e escuro.', figura: fig(e.cinza), cv: e.cinza }
    ];
    const inicial = opAtual.etapa != null ? opAtual.etapa : 0;
    opAtual.etapa = null;
    Visual.passos(corpo, etapas, {
      chave: 'foto', inicial,
      aoPraticar: (i) => praticar(etapas[i].titulo, etapas[i].cv.toDataURL('image/jpeg', 0.92))
    });
  }

  function praticar(titulo, referencia, extra = {}) {
    const ex = opAtual.exercicio && Licoes.EXERCICIOS[opAtual.exercicio];
    App.abrirPrancheta(Object.assign({
      titulo: ex ? ex.titulo : 'Foto: ' + titulo,
      origem: ex ? 'exercicio:' + opAtual.exercicio : 'foto',
      referencia, layout: 'lado', aspecto: st.W / st.H,
      girarRef: st.girar, espelharRef: st.espelhar
    }, ex && ex.prancheta ? ex.prancheta : {}, extra));
  }

  // Abas com a foto e uma camada SVG por cima
  function abaSobreposta(corpo, aba) {
    const palco = h('div', { class: 'foto-palco' });
    const img = h('img', { src: st.base.toDataURL('image/jpeg', 0.9), alt: 'Foto de referência', class: 'foto-base' });
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${st.W} ${st.H}`);
    svg.setAttribute('class', 'sobreposicao');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('font-size', f1(st.W / 32));
    palco.style.transform = transformar();
    palco.append(img, svg);
    const painel = h('div', { class: 'painel-aba' });
    corpo.append(h('div', { class: 'cartao papel palco-moldura' }, palco), painel);

    const desenharSvg = () => {
      let s = '';
      if (aba === 'proporcoes') {
        s = svgProporcoes();
        if (st.modoProp === 'loomis') {
          const L = st.loomis, r = Math.max(8, st.W / 55);
          s += `<circle class="alca" cx="${f1(L.cx)}" cy="${f1(L.cy)}" r="${r}"/><circle class="alca azul" cx="${f1(L.cx + L.R)}" cy="${f1(L.cy)}" r="${r}"/>`;
        } else {
          for (const a of alcasProp()) s += `<circle class="alca${a.id === 'girar' ? ' azul' : ''}" cx="${f1(a.pos[0])}" cy="${f1(a.pos[1])}" r="${Math.max(8, st.W / 55)}"/>`;
        }
      } else if (aba === 'visor') {
        s = svgVisor();
        const v = st.visor, r = Math.max(8, st.W / 55);
        s += `<circle class="alca" cx="${f1(v.x + v.w / 2)}" cy="${f1(v.y + v.w / st.razao / 2)}" r="${r}"/><circle class="alca azul" cx="${f1(v.x + v.w)}" cy="${f1(v.y + v.w / st.razao)}" r="${r}"/>`;
      } else s = svgAfericao();
      svg.innerHTML = s;
      if (aba === 'afericao') listaAfericao();
    };

    // Ponteiro em coordenadas da imagem (desfaz o giro e o espelho da exibição)
    const pontoImg = (e) => {
      const r = svg.getBoundingClientRect();
      let x = (e.clientX - r.left) / r.width * st.W, y = (e.clientY - r.top) / r.height * st.H;
      if (st.girar) { x = st.W - x; y = st.H - y; }
      if (st.espelhar) x = st.W - x;
      return [x, y];
    };
    let arrasto = null;
    svg.addEventListener('pointerdown', (e) => {
      const [x, y] = pontoImg(e);
      const raio = 34 * st.W / svg.getBoundingClientRect().width;
      const perto = (lista) => { let m = null, d = raio; for (const a of lista) { const dd = Math.hypot(a.pos[0] - x, a.pos[1] - y); if (dd < d) { d = dd; m = a; } } return m; };
      if (aba === 'proporcoes') {
        if (st.modoProp === 'loomis') {
          const L = st.loomis;
          const a = perto([{ id: 'raio', pos: [L.cx + L.R, L.cy] }, { id: 'mover', pos: [L.cx, L.cy] }]);
          arrasto = a ? { id: a.id, x0: x, y0: y, L0: { ...L } } : { id: 'mover', x0: x, y0: y, L0: { ...L } };
        } else {
          const a = perto(alcasProp());
          arrasto = a ? { id: a.id, x0: x, y0: y, p0: { ...st.prop } } : null;
        }
      } else if (aba === 'visor') {
        const v = st.visor;
        const a = perto([{ id: 'canto', pos: [v.x + v.w, v.y + v.w / st.razao] }, { id: 'mover', pos: [v.x + v.w / 2, v.y + v.w / st.razao / 2] }]);
        arrasto = { id: a ? a.id : 'mover', x0: x, y0: y, v0: { ...v } };
      } else {
        st.afer.pts.push([x, y]);
        desenharSvg();
        return;
      }
      if (arrasto) { svg.setPointerCapture(e.pointerId); e.preventDefault(); }
    });
    svg.addEventListener('pointermove', (e) => {
      if (!arrasto) return;
      const [x, y] = pontoImg(e);
      const dx = x - arrasto.x0, dy = y - arrasto.y0;
      if (aba === 'proporcoes' && st.modoProp === 'loomis') {
        const L = st.loomis, L0 = arrasto.L0;
        if (arrasto.id === 'mover') { L.cx = L0.cx + dx; L.cy = L0.cy + dy; } else L.R = Math.max(20, Math.hypot(x - L.cx, y - L.cy));
      } else if (aba === 'proporcoes') {
        const p = st.prop, p0 = arrasto.p0;
        const [lx, ly] = paraLocal(p0, x, y);
        if (arrasto.id === 'mover') { p.cx = p0.cx + dx; p.cy = p0.cy + dy; }
        else if (arrasto.id === 'topo' || arrasto.id === 'queixo') {
          const fixo = arrasto.id === 'topo' ? p0.hh : -p0.hh; // extremidade que não se move (local)
          const novo = arrasto.id === 'topo' ? Math.min(ly, fixo - 40) : Math.max(ly, fixo + 40);
          const centroLocal = (fixo + novo) / 2;
          const [ncx, ncy] = paraImg(p0, 0, centroLocal);
          p.cx = ncx; p.cy = ncy; p.hh = Math.abs(fixo - novo) / 2;
          p.half = p0.half * p.hh / p0.hh; p.olho = p0.olho * p.hh / p0.hh;
        } else if (arrasto.id === 'lado') p.half = Math.max(20, Math.abs(lx));
        else if (arrasto.id === 'olho') p.olho = lx;
        else if (arrasto.id === 'girar') p.ang = Math.atan2(y - p0.cy, x - p0.cx) + Math.PI / 2;
      } else if (aba === 'visor') {
        const v = st.visor, v0 = arrasto.v0;
        if (arrasto.id === 'mover') { v.x = v0.x + dx; v.y = v0.y + dy; } else v.w = Math.max(40, x - v0.x);
      }
      desenharSvg();
    });
    const soltar = () => { arrasto = null; };
    svg.addEventListener('pointerup', soltar);
    svg.addEventListener('pointercancel', soltar);

    // Painéis
    if (aba === 'proporcoes') {
      const modos = h('div', { class: 'segmentado' });
      for (const [id, rot] of [['frente', 'Frente'], ['perfil', 'Perfil'], ['loomis', 'Loomis']]) {
        modos.append(h('button', { class: 'seg' + (st.modoProp === id ? ' ativo' : ''), onclick: () => { st.modoProp = id; desenharTela(); } }, rot));
      }
      painel.append(modos);
      if (st.modoProp === 'frente') painel.append(h('p', { class: 'dica' }, 'Arraste as alças vermelhas para o topo da cabeça, o queixo e a lateral do rosto; a alça azul inclina a grade junto com a cabeça. Confira: os olhos caem na linha C? Os cantos da boca ficam sob as pupilas?'));
      if (st.modoProp === 'perfil') painel.append(
        h('p', { class: 'dica' }, 'Ajuste topo e queixo, depois arraste a alça do olho até o canto de trás do olho. O triângulo mostra onde deve ficar a borda de trás da orelha.'),
        h('button', { class: 'btn pequeno', onclick: () => { st.perfilDir *= -1; desenharSvg(); } }, 'Inverter lado do rosto'));
      if (st.modoProp === 'loomis') {
        const L = st.loomis;
        const sl = (k, rot, min, max) => { const o = h('output', {}, L[k] + '°'); return h('label', { class: 'slider' }, h('span', {}, rot), h('input', { type: 'range', min, max, value: L[k], oninput: (e) => { L[k] = +e.target.value; o.textContent = L[k] + '°'; desenharSvg(); } }), o); };
        painel.append(
          h('p', { class: 'dica' }, 'Loomis sugere desenhar as linhas de construção sobre fotos de outras pessoas para entender a estrutura. Arraste para posicionar a bola sobre o crânio, use a alça azul para o tamanho e os controles para acertar a pose. A cruz deve cair entre as sobrancelhas.'),
          h('div', { class: 'controles coluna' }, sl('g', 'Virar', -90, 90), sl('a', 'Cima ou baixo', -40, 40), sl('r', 'Inclinar', -40, 40)));
      }
      painel.append(h('div', { class: 'linha-botoes' }, h('button', { class: 'btn primario', onclick: praticarProporcoes }, 'Desenhar com esta grade')));
    } else if (aba === 'visor') {
      const razoes = [[0.7071, 'A4 em pé'], [1.4142, 'A4 deitado'], [1, 'Quadrado'], [0.75, '3 por 4']];
      const seg = h('div', { class: 'segmentado' });
      for (const [r, rot] of razoes) seg.append(h('button', { class: 'seg' + (Math.abs(st.razao - r) < 0.01 ? ' ativo' : ''), onclick: () => { const cy = st.visor.y + st.visor.w / st.razao / 2; st.razao = r; st.visor.y = cy - st.visor.w / r / 2; desenharTela(); } }, rot));
      const saida = h('output', {}, st.nGrade + ' x ' + st.nGrade);
      painel.append(
        h('p', { class: 'dica' }, 'O visor tem as mesmas proporções do seu papel, como o visor de cartolina de Betty Edwards. Enquadre de modo que o objeto encoste na borda em pelo menos dois pontos. A grade é o recurso de Dürer: o que está em cada quadrado vai para o quadrado correspondente no papel.'),
        seg,
        h('label', { class: 'slider' }, h('span', {}, 'Divisões da grade'), h('input', { type: 'range', min: 2, max: 8, value: st.nGrade, oninput: (e) => { st.nGrade = +e.target.value; saida.textContent = st.nGrade + ' x ' + st.nGrade; desenharSvg(); } }), saida),
        h('div', { class: 'linha-botoes' },
          h('button', { class: 'btn', onclick: recortar }, 'Recortar pelo visor'),
          st.base !== st.inteira ? h('button', { class: 'btn', onclick: () => { definirBase(st.inteira); desenharTela(); } }, 'Voltar à foto inteira') : null,
          h('button', { class: 'btn primario', onclick: praticarVisor }, 'Desenhar com a grade')));
    } else {
      painel.append(
        h('p', { class: 'dica' }, 'Toque em dois pontos para medir uma linha. O aplicativo mostra o ângulo em relação à horizontal, como o lápis esticado no braço. Escolha uma medida como unidade e as outras aparecem em relação a ela.'),
        h('div', { id: 'lista-afer' }),
        h('div', { class: 'linha-botoes' }, h('button', { class: 'btn', onclick: () => { st.afer = { pts: [], unidade: null }; desenharSvg(); } }, 'Limpar medidas')));
    }
    desenharSvg();
  }

  function listaAfericao() {
    const el = $('#lista-afer');
    if (!el) return;
    el.innerHTML = '';
    const segs = medidas(), un = st.afer.unidade != null ? segs[st.afer.unidade] : null;
    if (!segs.length) { el.append(h('p', { class: 'nota' }, 'Nenhuma medida ainda.')); return; }
    for (const sg of segs) {
      el.append(h('div', { class: 'linha-medida' },
        h('span', {}, `Linha ${sg.i + 1}: ${Math.round(sg.angH)}° da horizontal, ${Math.round(sg.angV)}° da vertical` + (un ? ` · ${(sg.comp / un.comp).toFixed(2).replace('.', ',')} unidade` : '')),
        h('button', { class: 'btn pequeno' + (st.afer.unidade === sg.i ? ' ativo' : ''), onclick: () => { st.afer.unidade = sg.i; desenharTela(); } }, 'Usar como unidade')));
    }
  }

  function recortar() {
    const v = st.visor, vh = v.w / st.razao;
    const x = Math.max(0, v.x), y = Math.max(0, v.y), w = Math.min(st.W - x, v.w), hh = Math.min(st.H - y, vh);
    if (w < 20 || hh < 20) { U.aviso('O visor está fora da foto.'); return; }
    const c = novaTela(Math.round(w), Math.round(hh));
    c.getContext('2d').drawImage(st.base, x, y, w, hh, 0, 0, c.width, c.height);
    const inteira = st.inteira, razao = st.razao, n = st.nGrade;
    definirBase(c);
    st.inteira = inteira; st.razao = razao; st.nGrade = n;
    st.visor = { x: 0, y: 0, w: st.W };
    st.aba = 'visor';
    desenharTela();
  }

  // Compõe foto + linhas numa imagem (referência) e as linhas sozinhas (guia no papel)
  async function compor(svgLinhas, x = 0, y = 0, w = st.W, hh = st.H) {
    const lw = f1(st.W / 260), tr = f1(st.W / 90);
    const estilo = `<style>${Licoes.CSS}.ant .l{stroke:#2f5d9a;stroke-width:${lw}}.novo .l{stroke:#c8452c;stroke-width:${lw}}.ant .l.g{stroke-dasharray:${tr} ${tr};stroke-width:${f1(st.W / 380)}}.tx-sobre{display:none}</style>`;
    const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f1(x)} ${f1(y)} ${f1(w)} ${f1(hh)}" width="${Math.round(w)}" height="${Math.round(hh)}">${estilo}<g class="ant">${svgLinhas}</g></svg>`;
    const img = await U.carregarImagem(U.svgParaUrl(svgStr));
    const c = novaTela(Math.round(w), Math.round(hh)), ctx = c.getContext('2d');
    ctx.drawImage(st.base, x, y, w, hh, 0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0);
    return { referencia: c.toDataURL('image/jpeg', 0.92), guia: svgStr };
  }
  async function praticarProporcoes() {
    const { referencia, guia } = await compor(svgProporcoes(true));
    praticar('proporções', referencia, { fundo: guia, fundoOpacidade: 0.35, origem: opAtual.exercicio ? 'exercicio:' + opAtual.exercicio : 'foto:proporcoes' });
  }
  async function praticarVisor() {
    const v = st.visor, vh = v.w / st.razao;
    const n = st.nGrade;
    let linhas = '';
    for (let i = 1; i < n; i++) {
      linhas += `<line class="l" x1="${f1(v.x + v.w * i / n)}" y1="${f1(v.y)}" x2="${f1(v.x + v.w * i / n)}" y2="${f1(v.y + vh)}"/><line class="l" x1="${f1(v.x)}" y1="${f1(v.y + vh * i / n)}" x2="${f1(v.x + v.w)}" y2="${f1(v.y + vh * i / n)}"/>`;
    }
    const { referencia } = await compor(linhas, v.x, v.y, v.w, vh);
    praticar('visor', referencia, { grade: n, aspecto: st.razao });
  }

  const temFoto = () => !!st.base;
  // Para exercícios: devolve a referência de uma etapa, se houver foto
  function referenciaEtapa(nome) {
    if (!st.etapas || !st.etapas[nome]) return null;
    return st.etapas[nome].toDataURL('image/jpeg', 0.92);
  }

  return { montar, temFoto, referenciaEtapa };
})();
