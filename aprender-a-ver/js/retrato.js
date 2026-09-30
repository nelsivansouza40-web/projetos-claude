/*
 * Retrato guiado: a partir de uma foto do aparelho, o aplicativo conduz o
 * retrato pelo método de Loomis em 12 etapas, do círculo base ao retrato
 * pronto. Para cada etapa ele monta a imagem de apoio (a foto com as linhas
 * daquela etapa, ou a foto processada em valores) e sugere o lápis.
 * Tudo é feito no próprio aparelho.
 */
const Retrato = (() => {
  const { h } = U;
  const MAX = 900;
  const st = { foto: null, W: 0, H: 0, L: null };

  // ---------------- processamento simples ----------------
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
      for (let y = 0; y < H; y++) {
        let s = 0; const o = y * W;
        for (let x = -r; x <= r; x++) s += a[o + Math.min(W - 1, Math.max(0, x))];
        for (let x = 0; x < W; x++) { b[o + x] = s / (2 * r + 1); s += a[o + Math.min(W - 1, x + r + 1)] - a[o + Math.max(0, x - r)]; }
      }
      for (let x = 0; x < W; x++) {
        let s = 0;
        for (let y = -r; y <= r; y++) s += b[Math.min(H - 1, Math.max(0, y)) * W + x];
        for (let y = 0; y < H; y++) { a[y * W + x] = s / (2 * r + 1); s += b[Math.min(H - 1, y + r + 1) * W + x] - b[Math.max(0, y - r) * W + x]; }
      }
    }
    return a;
  }
  function percentil(arr, p) {
    const hist = new Uint32Array(256);
    for (let i = 0; i < arr.length; i++) hist[Math.min(255, (arr[i] * 255) | 0)]++;
    let acc = 0; const alvo = arr.length * p;
    for (let k = 0; k < 256; k++) { acc += hist[k]; if (acc >= alvo) return k / 255; }
    return 1;
  }
  function pintar(W, H, fn) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d'), img = ctx.createImageData(W, H), d = img.data;
    for (let i = 0, j = 0; i < W * H; i++, j += 4) { const v = fn(i); d[j] = v[0]; d[j + 1] = v[1]; d[j + 2] = v[2]; d[j + 3] = 255; }
    ctx.putImageData(img, 0, 0);
    return c;
  }
  const tomCinza = (v) => [18 + 237 * v, 16 + 234 * v, 14 + 230 * v];

  // ---------------- linhas de Loomis ----------------
  const f1 = (n) => n.toFixed(1);
  function linhas(grupos, novos, W, H, estiloExtra = '') {
    const L = st.L, partes = Cabeca.projetar(L.g, L.a, L.r);
    const ant = grupos.filter((g) => !novos.includes(g));
    const lw = Math.max(1.5, W / 260);
    const css = `.l{fill:none;stroke-linecap:round;stroke-linejoin:round}.ant .l{stroke:#2f5d9a;stroke-width:${f1(lw)}}.novo .l{stroke:#d0402a;stroke-width:${f1(lw * 1.3)}}.l.g{stroke-dasharray:${f1(W / 90)} ${f1(W / 90)};stroke-width:${f1(lw * 0.7)}}${estiloExtra}`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><style>${css}</style>` +
      `<g class="ant">${Cabeca.svg(partes, ant, L.cx, L.cy, L.R, { ocultas: false })}</g>` +
      `<g class="novo">${Cabeca.svg(partes, novos, L.cx, L.cy, L.R, { ocultas: false })}</g></svg>`;
  }
  async function compor(fundo, svg, clarear = 0) {
    const { W, H } = st;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.drawImage(fundo, 0, 0, W, H);
    if (clarear) { ctx.fillStyle = `rgba(255,255,255,${clarear})`; ctx.fillRect(0, 0, W, H); }
    if (svg) ctx.drawImage(await U.carregarImagem(U.svgParaUrl(svg)), 0, 0, W, H);
    return c.toDataURL('image/jpeg', 0.9);
  }

  // Máscara do cabelo: as áreas escuras e grandes da foto
  // (só as manchas grandes: olhos, sobrancelhas e boca ficam de fora)
  function mascaraCabelo(gBorrado, W, H) {
    const lim = percentil(gBorrado, 0.3);
    const m = new Uint8Array(W * H);
    for (let i = 0; i < m.length; i++) m[i] = gBorrado[i] < lim ? 1 : 0;
    const minimo = W * H * 0.02, pilha = new Int32Array(W * H), comp = [];
    for (let i0 = 0; i0 < m.length; i0++) {
      if (m[i0] !== 1) continue;
      let topo = 0; comp.length = 0; pilha[topo++] = i0; m[i0] = 2;
      while (topo) {
        const i = pilha[--topo]; comp.push(i);
        const x = i % W;
        if (x > 0 && m[i - 1] === 1) { m[i - 1] = 2; pilha[topo++] = i - 1; }
        if (x < W - 1 && m[i + 1] === 1) { m[i + 1] = 2; pilha[topo++] = i + 1; }
        if (i >= W && m[i - W] === 1) { m[i - W] = 2; pilha[topo++] = i - W; }
        if (i < m.length - W && m[i + W] === 1) { m[i + W] = 2; pilha[topo++] = i + W; }
      }
      if (comp.length >= minimo) for (const i of comp) m[i] = 3;
    }
    return (i) => m[i] === 3;
  }

  // ---------------- as 12 etapas ----------------
  const ETAPAS = [
    { t: 'O círculo base', txt: 'Desenhe um círculo leve. Imagine uma esfera sólida: é a base do crânio. Compare o tamanho com a referência: a bola vai do topo da cabeça até perto da base do nariz.', grupos: ['esfera'], novos: ['esfera'], grau: '2H' },
    { t: 'A cruz guia', txt: 'Trace a linha central e a linha da sobrancelha seguindo a curva da esfera. Elas mostram para onde a pessoa está olhando.', grupos: ['esfera', 'central', 'sobrancelha'], novos: ['central', 'sobrancelha'], grau: '2H' },
    { t: 'Corte as laterais', txt: 'Corte uma fatia de cada lado da bola. Isso achata a cabeça e dá a forma de um crânio de verdade. O corte mais visível fica do lado para onde o rosto está virado.', grupos: ['esfera', 'central', 'sobrancelha', 'lateral'], novos: ['lateral'], grau: '2H' },
    { t: 'Divida em três partes', txt: 'Marque três distâncias iguais na linha central: do começo do cabelo às sobrancelhas, das sobrancelhas à base do nariz e da base do nariz ao queixo. Se a boca estiver aberta, a última parte fica um pouco maior.', grupos: ['esfera', 'central', 'sobrancelha', 'lateral', 'tercos'], novos: ['tercos'], grau: '2H' },
    { t: 'Mandíbula e orelhas', txt: 'Ligue o oval ao queixo para formar a mandíbula. A orelha fica entre a linha das sobrancelhas e a do nariz. Trace os lados do rosto e o pescoço.', grupos: ['esfera', 'central', 'sobrancelha', 'lateral', 'tercos', 'mandibula', 'orelhas'], novos: ['mandibula', 'orelhas'], grau: '2H' },
    { t: 'Simplifique o cabelo', txt: 'Olhe a referência e desenhe o cabelo em blocos grandes e simples, com linhas retas. Não faça fio por fio.', grupos: ['esfera', 'central', 'sobrancelha', 'lateral', 'tercos', 'mandibula', 'orelhas'], novos: [], cabelo: 'contorno', grau: 'HB' },
    { t: 'Linha dos olhos', txt: 'Trace a linha onde os dois olhos vão ficar, um pouco abaixo da linha das sobrancelhas. Confira na foto se a cabeça está inclinada: a linha inclina junto.', grupos: ['esfera', 'central', 'sobrancelha', 'lateral', 'tercos', 'mandibula', 'orelhas', 'linhaOlhos'], novos: ['linhaOlhos'], grau: 'HB' },
    { t: 'Coloque as feições', txt: 'Simplifique olhos, sobrancelhas, nariz e boca em linhas simples e encaixe-os na estrutura. O nariz pode começar como três círculos; a boca, como um losango.', grupos: ['esfera', 'central', 'sobrancelha', 'lateral', 'tercos', 'mandibula', 'orelhas', 'linhaOlhos', 'tracos'], novos: ['tracos'], grau: 'HB' },
    { t: 'Primeira camada de valores', txt: 'Aperte os olhos para ver a referência sem detalhes: sobram só luzes e sombras simples, como na imagem desfocada. Aplique uma primeira camada suave com o lápis 2H para dar volume.', proc: 'desfocado', grau: '2H' },
    { t: 'Valores mais escuros', txt: 'Identifique as partes mais escuras da referência e use um lápis mais macio para dar força e contraste a essas áreas: sobrancelhas, íris, linha da boca, sob o queixo.', proc: 'contraste', grau: '4B' },
    { t: 'Volume do cabelo', txt: 'Dê tom ao cabelo como volumes simples: escureça as partes escuras e deixe o papel nos brilhos. A referência mostra só a massa escura do cabelo.', proc: 'cabelo', grau: '2B' },
    { t: 'Retrato pronto', txt: 'Acrescente detalhes onde achar necessário e o seu próprio estilo. Use o esfuminho com cuidado na pele e o limpa-tipos para abrir brilhos nos olhos e no nariz.', proc: 'cinza', grau: 'HB' }
  ];

  async function gerarReferencias() {
    const { W, H, foto } = st;
    const g = cinza(foto);
    const gm = borrar(g, W, H, W / 120, 2);
    const cab = mascaraCabelo(borrar(g, W, H, W / 70, 3), W, H);
    const saidas = [];
    for (const e of ETAPAS) {
      let ref, guia = null;
      if (e.proc === 'desfocado') {
        const gd = borrar(g, W, H, W / 45, 3);
        ref = pintar(W, H, (i) => tomCinza(gd[i])).toDataURL('image/jpeg', 0.9);
      } else if (e.proc === 'contraste') {
        const lo = percentil(gm, 0.08), hi = percentil(gm, 0.85);
        ref = pintar(W, H, (i) => { const v = Math.min(1, Math.max(0, (gm[i] - lo) / (hi - lo))); return tomCinza(Math.pow(v, 1.4)); }).toDataURL('image/jpeg', 0.9);
      } else if (e.proc === 'cabelo') {
        ref = pintar(W, H, (i) => (cab(i) ? [20, 18, 16] : [250, 248, 244])).toDataURL('image/jpeg', 0.9);
      } else if (e.proc === 'cinza') {
        ref = pintar(W, H, (i) => tomCinza(g[i])).toDataURL('image/jpeg', 0.9);
      } else {
        let extra = '';
        if (e.cabelo) {
          // cabelo em vermelho translúcido sobre a foto
          const m = pintar(W, H, (i) => (cab(i) ? [208, 64, 42] : [255, 255, 255]));
          const c = document.createElement('canvas'); c.width = W; c.height = H;
          const ctx = c.getContext('2d');
          ctx.drawImage(foto, 0, 0);
          ctx.globalAlpha = 0.45; ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(m, 0, 0);
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
          ref = await compor(c, linhas(e.grupos, e.novos, W, H, extra));
        } else {
          ref = await compor(foto, linhas(e.grupos, e.novos, W, H), 0.15);
        }
        guia = linhas(e.grupos, [], W, H, '.ant .l{stroke:#6d85ad}');
      }
      saidas.push({ titulo: e.t, texto: e.txt, referencia: ref, guia, grau: e.grau });
    }
    return saidas;
  }

  // ---------------- telas ----------------
  async function carregar(arq) {
    const url = URL.createObjectURL(arq);
    try {
      const img = await U.carregarImagem(url);
      const k = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      st.foto = c; st.W = c.width; st.H = c.height;
      st.L = { cx: c.width / 2, cy: c.height * 0.38, R: Math.min(c.width, c.height) * 0.24, g: 0, a: 0, r: 0 };
    } finally { URL.revokeObjectURL(url); }
  }

  function montar(raiz) {
    raiz.innerHTML = '';
    const entrada = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async (e) => {
      const arq = e.target.files && e.target.files[0];
      if (!arq) return;
      raiz.innerHTML = '<p class="carregando">Abrindo a foto...</p>';
      try { await carregar(arq); } catch (err) { U.aviso(err.message); }
      montar(raiz);
    } });
    const camera = h('input', { type: 'file', accept: 'image/*', capture: 'user', hidden: true });
    camera.addEventListener('change', async (e) => {
      const arq = e.target.files && e.target.files[0];
      if (!arq) return;
      raiz.innerHTML = '<p class="carregando">Abrindo a foto...</p>';
      try { await carregar(arq); } catch (err) { U.aviso(err.message); }
      montar(raiz);
    });
    raiz.append(entrada, camera);

    if (!st.foto) {
      raiz.append(h('div', { class: 'cartao vazio' },
        h('div', { class: 'ico-grande', html: U.icone('rosto', 'ico') }),
        h('h2', {}, 'Retrato guiado em 12 etapas'),
        h('p', {}, 'Escolha a foto de um rosto. O aplicativo encaixa a construção de Loomis sobre ela e conduz o retrato do círculo base até o acabamento, mostrando a referência de cada etapa ao lado da prancheta.'),
        h('ol', { class: 'passos lista-etapas' }, ETAPAS.map((e) => h('li', {}, e.t))),
        h('p', { class: 'nota' }, 'Funciona melhor com o rosto de frente ou levemente virado, bem iluminado e com fundo claro. A foto fica só neste aparelho.'),
        h('div', { class: 'linha-botoes' },
          h('button', { class: 'btn primario', onclick: () => entrada.click() }, 'Escolher foto'),
          h('button', { class: 'btn', onclick: () => camera.click() }, 'Tirar foto'))));
      return;
    }
    telaAjuste(raiz, entrada);
  }

  // Encaixe da bola de Loomis sobre a foto
  function telaAjuste(raiz, entrada) {
    const { W, H } = st, L = st.L;
    const palco = h('div', { class: 'foto-palco' });
    const img = h('img', { src: st.foto.toDataURL('image/jpeg', 0.9), alt: 'Foto de referência', class: 'foto-base' });
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'sobreposicao'); svg.setAttribute('preserveAspectRatio', 'none');
    palco.append(img, svg);
    const desenhar = () => {
      const partes = Cabeca.projetar(L.g, L.a, L.r), r = Math.max(8, W / 55);
      svg.innerHTML = `<g class="ant">${Cabeca.svg(partes, ['esfera', 'lateral', 'central', 'sobrancelha', 'tercos', 'mandibula'], L.cx, L.cy, L.R)}</g><g class="novo">${Cabeca.svg(partes, ['tracos', 'orelhas'], L.cx, L.cy, L.R, { ocultas: false })}</g>` +
        `<circle class="alca" cx="${f1(L.cx)}" cy="${f1(L.cy)}" r="${r}"/><circle class="alca azul" cx="${f1(L.cx + L.R)}" cy="${f1(L.cy)}" r="${r}"/>`;
    };
    let arrasto = null;
    const ponto = (e) => { const r = svg.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
    svg.addEventListener('pointerdown', (e) => {
      const [x, y] = ponto(e);
      const perto = Math.hypot(x - (L.cx + L.R), y - L.cy) < 34 * W / svg.getBoundingClientRect().width;
      arrasto = { id: perto ? 'raio' : 'mover', x0: x, y0: y, L0: { ...L } };
      svg.setPointerCapture(e.pointerId); e.preventDefault();
    });
    svg.addEventListener('pointermove', (e) => {
      if (!arrasto) return;
      const [x, y] = ponto(e);
      if (arrasto.id === 'mover') { L.cx = arrasto.L0.cx + x - arrasto.x0; L.cy = arrasto.L0.cy + y - arrasto.y0; } else L.R = Math.max(20, Math.hypot(x - L.cx, y - L.cy));
      desenhar();
    });
    svg.addEventListener('pointerup', () => { arrasto = null; });
    const sl = (k, rot, min, max) => { const o = h('output', {}, L[k] + '°'); return h('label', { class: 'slider' }, h('span', {}, rot), h('input', { type: 'range', min, max, value: L[k], oninput: (e) => { L[k] = +e.target.value; o.textContent = L[k] + '°'; desenhar(); } }), o); };
    const btnComecar = h('button', { class: 'btn primario', onclick: async () => {
      btnComecar.disabled = true; btnComecar.textContent = 'Preparando as 12 etapas...';
      try {
        const etapas = await gerarReferencias();
        App.abrirPrancheta({
          titulo: 'Retrato guiado', origem: 'retrato', referencia: etapas[0].referencia,
          layout: 'lado', aspecto: W / H, etapas, fundo: etapas[0].guia, fundoOpacidade: 0.3, tempoMin: 60
        });
      } catch (err) { U.aviso('Não foi possível preparar as etapas.'); btnComecar.disabled = false; btnComecar.textContent = 'Começar o retrato'; }
    } }, 'Começar o retrato');
    raiz.append(
      h('div', { class: 'cartao' },
        h('h2', {}, 'Encaixe a cabeça'),
        h('p', { class: 'dica' }, 'Arraste a bola até o crânio e use a alça azul para o tamanho. A cruz fica entre as sobrancelhas; a linha de baixo da bola passa na base do nariz; o queixo fica no fim da linha central. Use os controles para virar e inclinar até as linhas acompanharem o rosto.')),
      h('div', { class: 'cartao papel palco-moldura' }, palco),
      h('div', { class: 'controles coluna' }, sl('g', 'Virar', -90, 90), sl('a', 'Cima ou baixo', -40, 40), sl('r', 'Inclinar', -40, 40)),
      h('div', { class: 'linha-botoes' }, h('button', { class: 'btn', onclick: () => entrada.click() }, 'Trocar foto'), btnComecar));
    desenhar();
  }

  return { montar };
})();
