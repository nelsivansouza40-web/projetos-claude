/*
 * Método da grade: a foto dividida em células iguais para ser copiada,
 * célula por célula, numa folha com a mesma grade (o recurso de Dürer).
 * Grade quadrada ou retangular, automática, personalizada ou por medida
 * em centímetros; diagonais; etiquetas; cor e espessura; recorte, giro,
 * espelhamento, ajustes, efeitos e pixels; comparação com o desenho;
 * divisão em partes; imagens salvas, impressão e compartilhamento.
 * Tudo é processado no próprio aparelho.
 */
const Grade = (() => {
  const { h } = U;
  const MAX = 1800;
  let g = null; // estado da imagem aberta
  let ativo = false;

  const PADRAO = () => ({
    ed: { rot: 0, espH: false, espV: false, corte: null, brilho: 100, contraste: 100, saturacao: 100, efeito: 'nenhum', niveis: 4, forca: 50, pixel: 0 },
    gr: { forma: 'quadrada', modo: 'auto', colunas: 6, linhas: 8, diagCelula: false, diagImagem: false, cor: '#e0301e', espessura: 2, opac: 0.9, etiquetas: 'bordas', tamEtiqueta: 1 },
    papel: { largura: 18, celula: 3 }
  });

  // ---------------- processamento ----------------
  function novaTela(W, H) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(W)); c.height = Math.max(1, Math.round(H)); return c; }
  // giro e espelhamento
  function geometria(src, ed) {
    const r = ((ed.rot % 360) + 360) % 360, troca = r === 90 || r === 270;
    const c = novaTela(troca ? src.height : src.width, troca ? src.width : src.height), x = c.getContext('2d');
    x.translate(c.width / 2, c.height / 2);
    x.rotate(r * Math.PI / 180);
    x.scale(ed.espH ? -1 : 1, ed.espV ? -1 : 1);
    x.drawImage(src, -src.width / 2, -src.height / 2);
    return c;
  }
  function recortar(src, corte) {
    if (!corte) return src;
    const X = Math.round(corte.x * src.width), Y = Math.round(corte.y * src.height), W = Math.round(corte.w * src.width), H = Math.round(corte.h * src.height);
    const c = novaTela(W, H); c.getContext('2d').drawImage(src, X, Y, W, H, 0, 0, W, H);
    return c;
  }
  function processar() {
    const ed = g.ed;
    g.girada = geometria(g.original, ed);
    const base = recortar(g.girada, ed.corte);
    let c = novaTela(base.width, base.height), x = c.getContext('2d', { willReadFrequently: true });
    const filtros = [`brightness(${ed.brilho}%)`, `contrast(${ed.contraste}%)`, `saturate(${ed.saturacao}%)`];
    if (ed.efeito === 'cinza') filtros.push('grayscale(1)');
    if (ed.efeito === 'sepia') filtros.push('sepia(1)');
    if (ed.efeito === 'inverter') filtros.push('invert(1)');
    if (ed.efeito === 'altoContraste') filtros.push('grayscale(1)', 'contrast(220%)');
    x.filter = filtros.join(' ');
    x.drawImage(base, 0, 0);
    x.filter = 'none';
    if (['esboco', 'contornos', 'valores'].includes(ed.efeito)) efeitoPixel(c, ed);
    if (ed.pixel > 1) {
      const k = ed.pixel, p = novaTela(c.width / k, c.height / k), px = p.getContext('2d');
      px.imageSmoothingEnabled = true; px.drawImage(c, 0, 0, p.width, p.height);
      const d = novaTela(c.width, c.height), dx = d.getContext('2d');
      dx.imageSmoothingEnabled = false; dx.drawImage(p, 0, 0, d.width, d.height);
      c = d;
    }
    g.proc = c;
  }
  function efeitoPixel(c, ed) {
    const W = c.width, H = c.height, x = c.getContext('2d', { willReadFrequently: true });
    const img = x.getImageData(0, 0, W, H), d = img.data, n = W * H;
    const cinza = new Float32Array(n);
    for (let i = 0, j = 0; i < n; i++, j += 4) cinza[i] = (0.299 * d[j] + 0.587 * d[j + 1] + 0.114 * d[j + 2]) / 255;
    let saida;
    if (ed.efeito === 'valores') {
      // poucos tons: o jeito mais rápido de enxergar luz e sombra
      const k = ed.niveis;
      saida = cinza.map((v) => Math.round(v * (k - 1)) / (k - 1));
    } else if (ed.efeito === 'esboco') {
      // desenho a lápis: cinza dividido pelo negativo desfocado
      const inv = cinza.map((v) => 1 - v), r = Math.max(2, Math.round(W / 140 * (0.4 + ed.forca / 60)));
      const b = desfocar(inv, W, H, r);
      saida = cinza.map((v, i) => Math.min(1, v / Math.max(0.02, 1 - b[i])));
    } else {
      // contornos (Sobel), linhas escuras sobre fundo claro
      const s = desfocar(cinza, W, H, 1);
      saida = new Float32Array(n).fill(1);
      const ganho = 1.5 + ed.forca / 20;
      for (let y = 1; y < H - 1; y++) for (let xx = 1; xx < W - 1; xx++) {
        const i = y * W + xx;
        const gx = -s[i - W - 1] - 2 * s[i - 1] - s[i + W - 1] + s[i - W + 1] + 2 * s[i + 1] + s[i + W + 1];
        const gy = -s[i - W - 1] - 2 * s[i - W] - s[i - W + 1] + s[i + W - 1] + 2 * s[i + W] + s[i + W + 1];
        saida[i] = Math.max(0, 1 - Math.hypot(gx, gy) * ganho);
      }
    }
    for (let i = 0, j = 0; i < n; i++, j += 4) { const v = Math.round(saida[i] * 255); d[j] = d[j + 1] = d[j + 2] = v; }
    x.putImageData(img, 0, 0);
  }
  function desfocar(src, W, H, r) {
    let a = Float32Array.from(src), b = new Float32Array(src.length);
    for (let p = 0; p < 2; p++) {
      for (let y = 0; y < H; y++) { let s = 0; const o = y * W; for (let x = -r; x <= r; x++) s += a[o + Math.min(W - 1, Math.max(0, x))]; for (let x = 0; x < W; x++) { b[o + x] = s / (2 * r + 1); s += a[o + Math.min(W - 1, x + r + 1)] - a[o + Math.max(0, x - r)]; } }
      for (let x = 0; x < W; x++) { let s = 0; for (let y = -r; y <= r; y++) s += b[Math.min(H - 1, Math.max(0, y)) * W + x]; for (let y = 0; y < H; y++) { a[y * W + x] = s / (2 * r + 1); s += b[Math.min(H - 1, y + r + 1) * W + x] - b[Math.max(0, y - r) * W + x]; } }
    }
    return a;
  }

  // ---------------- geometria da grade ----------------
  // Retorna as posições (em pixels da imagem) das linhas verticais e horizontais
  function linhasGrade(W, H) {
    const gr = g.gr;
    let xs = [], ys = [];
    const passos = (tam, passo) => { const v = []; for (let p = 0; p <= tam + 0.5; p += passo) v.push(Math.min(tam, p)); if (v[v.length - 1] < tam - 0.5) v.push(tam); return v; };
    if (gr.modo === 'medida') {
      // célula com tamanho real no papel
      const passo = W * g.papel.celula / g.papel.largura;
      xs = passos(W, passo); ys = passos(H, passo);
    } else if (gr.forma === 'quadrada') {
      const col = gr.modo === 'auto' ? Math.max(2, Math.round(W / (Math.min(W, H) / 5))) : gr.colunas;
      const passo = W / col;
      xs = passos(W, passo); ys = passos(H, passo);
    } else {
      const col = gr.modo === 'auto' ? Math.max(2, Math.round(W / (Math.min(W, H) / 4))) : gr.colunas;
      const lin = gr.modo === 'auto' ? Math.max(2, Math.round(H / (Math.min(W, H) / 4))) : gr.linhas;
      xs = Array.from({ length: col + 1 }, (_, i) => W * i / col);
      ys = Array.from({ length: lin + 1 }, (_, i) => H * i / lin);
    }
    return { xs, ys };
  }
  const letra = (i) => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };

  // Desenha a grade sobre um contexto já posicionado nas coordenadas da imagem
  function desenharGrade(x, W, H, escalaTela = 1, destaque = null) {
    const gr = g.gr, { xs, ys } = linhasGrade(W, H);
    const lw = gr.espessura * Math.max(W, H) / 1000;
    x.save();
    x.globalAlpha = gr.opac; x.strokeStyle = gr.cor; x.lineWidth = Math.max(lw, 0.6 / escalaTela);
    x.beginPath();
    for (const X of xs) { x.moveTo(X, 0); x.lineTo(X, H); }
    for (const Y of ys) { x.moveTo(0, Y); x.lineTo(W, Y); }
    x.stroke();
    if (gr.diagCelula) {
      x.lineWidth = Math.max(lw * 0.6, 0.5 / escalaTela); x.setLineDash([lw * 4, lw * 3]);
      x.beginPath();
      for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ys.length - 1; j++) {
        x.moveTo(xs[i], ys[j]); x.lineTo(xs[i + 1], ys[j + 1]);
        x.moveTo(xs[i + 1], ys[j]); x.lineTo(xs[i], ys[j + 1]);
      }
      x.stroke(); x.setLineDash([]);
    }
    if (gr.diagImagem) {
      x.lineWidth = Math.max(lw * 0.8, 0.6 / escalaTela);
      x.beginPath(); x.moveTo(0, 0); x.lineTo(W, H); x.moveTo(W, 0); x.lineTo(0, H);
      x.moveTo(W / 2, 0); x.lineTo(W / 2, H); x.moveTo(0, H / 2); x.lineTo(W, H / 2); x.stroke();
    }
    if (gr.etiquetas !== 'nenhuma') {
      const cel = Math.min(xs[1] - xs[0] || W, ys[1] - ys[0] || H);
      const fs = Math.max(9 / escalaTela, cel * 0.16 * gr.tamEtiqueta);
      x.font = `700 ${fs}px system-ui, sans-serif`; x.textBaseline = 'top'; x.globalAlpha = 1;
      const rotulo = (t, X, Y) => {
        const w = x.measureText(t).width, p = fs * 0.2;
        x.fillStyle = 'rgba(255,255,255,.82)'; x.fillRect(X, Y, w + 2 * p, fs + 2 * p);
        x.fillStyle = gr.cor; x.fillText(t, X + p, Y + p);
      };
      const m = Math.max(lw, 1) + fs * 0.1;
      if (gr.etiquetas === 'celulas') {
        for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ys.length - 1; j++) rotulo(letra(i) + (j + 1), xs[i] + m, ys[j] + m);
      } else {
        for (let i = 0; i < xs.length - 1; i++) rotulo(letra(i), (xs[i] + xs[i + 1]) / 2 - fs * 0.35, m);
        for (let j = 0; j < ys.length - 1; j++) rotulo(String(j + 1), m, (ys[j] + ys[j + 1]) / 2 - fs * 0.5);
      }
    }
    if (destaque) {
      const [i, j] = destaque;
      x.globalAlpha = 0.55; x.fillStyle = '#000';
      x.beginPath(); x.rect(0, 0, W, H); x.rect(xs[i], ys[j], xs[i + 1] - xs[i], ys[j + 1] - ys[j]); x.fill('evenodd');
      x.globalAlpha = 1; x.lineWidth = Math.max(lw * 2, 2 / escalaTela); x.strokeStyle = gr.cor;
      x.strokeRect(xs[i], ys[j], xs[i + 1] - xs[i], ys[j + 1] - ys[j]);
    }
    x.restore();
  }
  // Imagem final com a grade, no tamanho da imagem processada
  function imagemComGrade(fonte = g.proc, comGrade = true) {
    const c = novaTela(fonte.width, fonte.height), x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(fonte, 0, 0);
    if (comGrade) desenharGrade(x, c.width, c.height);
    return c;
  }

  // ---------------- banco (imagens salvas) ----------------
  const BANCO = 'aprender-a-ver-grade';
  function banco() { return new Promise((res, rej) => { const r = indexedDB.open(BANCO, 1); r.onupgradeneeded = () => r.result.createObjectStore('itens', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
  async function op(modo, fn) { const db = await banco(); return new Promise((res, rej) => { const t = db.transaction('itens', modo), req = fn(t.objectStore('itens')); t.oncomplete = () => res(req && req.result); t.onerror = () => rej(t.error); }); }
  async function salvar(nome) {
    const miniatura = novaTela(240, 240 * g.proc.height / g.proc.width);
    miniatura.getContext('2d').drawImage(imagemComGrade(), 0, 0, miniatura.width, miniatura.height);
    const rec = { id: g.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 5), nome, criadoEm: new Date().toISOString(), original: await U.canvasParaBlob(g.original, 'image/jpeg', 0.92), miniatura: await U.canvasParaBlob(miniatura, 'image/jpeg', 0.8), ed: g.ed, gr: g.gr, papel: g.papel };
    await op('readwrite', (s) => s.put(rec));
    g.id = rec.id; g.nome = nome;
  }

  // ---------------- abrir imagem ----------------
  async function abrirArquivo(arq) {
    const url = URL.createObjectURL(arq);
    try { const im = await U.carregarImagem(url); abrirImagem(im); } finally { URL.revokeObjectURL(url); }
  }
  function abrirImagem(im, cfg) {
    const w = im.naturalWidth || im.width, hh = im.naturalHeight || im.height, k = Math.min(1, MAX / Math.max(w, hh));
    const c = novaTela(w * k, hh * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    const p = PADRAO();
    g = { original: c, ed: p.ed, gr: p.gr, papel: p.papel, vista: null, bloqueado: false, celula: null, comp: null, cortando: null, aba: 'grade' };
    if (cfg) { Object.assign(g.ed, cfg.ed); Object.assign(g.gr, cfg.gr); Object.assign(g.papel, cfg.papel); g.id = cfg.id; g.nome = cfg.nome; }
    processar();
  }

  // ---------------- telas ----------------
  function montar(raiz) {
    ativo = true;
    raiz.innerHTML = '';
    raiz.classList.add('pagina-prancheta');
    const entrada = h('input', { type: 'file', accept: 'image/*', hidden: true });
    entrada.addEventListener('change', async () => {
      const arq = entrada.files && entrada.files[0]; if (!arq) return;
      raiz.innerHTML = '<p class="carregando">Abrindo a imagem...</p>';
      try { await abrirArquivo(arq); } catch (e) { U.aviso('Não foi possível abrir essa imagem.'); }
      montar(raiz);
    });
    raiz.append(entrada);
    g && (g.entrada = entrada);
    if (!g) {
      raiz.append(h('div', { class: 'cartao vazio' },
        h('div', { class: 'ico-grande', html: U.icone('grade', 'ico') }),
        h('h2', {}, 'Método da grade'),
        h('p', {}, 'Divida a imagem em células iguais e copie uma célula de cada vez numa folha com a mesma grade. É o recurso de Dürer: o cérebro deixa de desenhar "um rosto" e passa a desenhar formas simples, e as proporções saem certas.'),
        h('div', { class: 'linha-botoes' },
          h('button', { class: 'btn primario', onclick: () => entrada.click() }, 'Selecionar imagem'),
          h('button', { class: 'btn', onclick: () => telaSalvas(raiz) }, 'Imagens salvas')),
        h('p', { class: 'nota' }, 'A imagem fica só neste aparelho.')));
      return;
    }
    telaGrade(raiz);
  }

  function telaGrade(raiz) {
    raiz.innerHTML = '';
    raiz.classList.add('pagina-prancheta', 'pagina-grade');
    if (g.entrada) raiz.append(g.entrada);
    const ui = g.ui = {};
    const palco = h('div', { class: 'grade-palco' });
    const cv = h('canvas', { class: 'grade-tela', 'aria-label': 'Imagem com a grade' });
    const info = h('span', { class: 'grade-info' });
    const sairCheia = h('button', { class: 'btn pequeno grade-sair', hidden: true, onclick: alternarCheia }, 'Sair da tela cheia');
    const cadeado = h('button', { class: 'btn pequeno grade-cadeado', hidden: true, onclick: alternarBloqueio }, 'Desbloquear');
    const navCel = h('div', { class: 'grade-navcel', hidden: true },
      h('button', { class: 'btn pequeno', onclick: () => moverCelula(-1) }, 'Anterior'),
      ui.rotCel = h('strong', {}),
      h('button', { class: 'btn pequeno', onclick: () => moverCelula(1) }, 'Próxima'),
      h('button', { class: 'btn pequeno', onclick: () => { g.celula = null; atualizar(); ajustarVista(); } }, 'Fechar'));
    palco.append(cv, info, sairCheia, cadeado, navCel);
    Object.assign(ui, { palco, cv, ctx: cv.getContext('2d'), info, sairCheia, cadeado, navCel });

    const barra = h('div', { class: 'atelie-acoes' },
      h('button', { class: 'btn pequeno', onclick: () => g.entrada.click() }, 'Selecionar imagem'),
      h('button', { class: 'btn pequeno', onclick: alternarCheia }, 'Tela cheia'),
      ui.btnBloq = h('button', { class: 'btn pequeno', onclick: alternarBloqueio }, 'Bloquear'),
      h('button', { class: 'btn pequeno', onclick: () => zoom(1.25) }, 'Aproximar'),
      h('button', { class: 'btn pequeno', onclick: () => zoom(0.8) }, 'Afastar'),
      h('button', { class: 'btn pequeno', onclick: ajustarVista }, 'Ver tudo'));
    const abas = [['grade', 'Grade'], ['imagem', 'Imagem'], ['efeitos', 'Efeitos'], ['papel', 'Tamanho'], ['comparar', 'Comparar'], ['arquivo', 'Salvar']];
    const segAbas = h('div', { class: 'segmentado atelie-abas' });
    for (const [id, rot] of abas) segAbas.append(h('button', { class: 'seg', 'data-id': id, onclick: () => { g.aba = id; atualizar(); } }, rot));
    const corpo = h('div', { class: 'cartao atelie-painel' });
    Object.assign(ui, { segAbas, corpo, barra });
    raiz.append(barra, palco, segAbas, corpo);
    ligarEntrada(cv);
    ui.ro = new ResizeObserver(() => redimensionar());
    ui.ro.observe(palco);
    redimensionar(true);
    atualizar();
  }

  // ---------------- painéis ----------------
  function slider(rot, min, max, passo, valor, fmt, aoMudar, aoSoltar) {
    const out = h('output', {}, fmt(valor));
    const inp = h('input', { type: 'range', min, max, step: passo, value: valor, oninput: (e) => { out.textContent = fmt(+e.target.value); aoMudar(+e.target.value); } });
    if (aoSoltar) inp.addEventListener('change', (e) => aoSoltar(+e.target.value));
    return h('label', { class: 'slider' }, h('span', {}, rot), inp, out);
  }
  function segmento(opcoes, atual, aoEscolher) {
    const s = h('div', { class: 'segmentado' });
    for (const [id, rot] of opcoes) s.append(h('button', { class: 'seg' + (id === atual ? ' ativo' : ''), onclick: () => aoEscolher(id) }, rot));
    return s;
  }
  const linha = (rot, ...filhos) => h('div', { class: 'barra-ferramentas' }, h('span', { class: 'rotulo' }, rot), ...filhos);
  let timerProc = 0;
  function reprocessar(imediato) {
    clearTimeout(timerProc);
    const f = () => { processar(); if (g.celula) limitarCelula(); desenhar(); atualizarInfo(); };
    if (imediato) f(); else timerProc = setTimeout(f, 120);
  }

  function atualizar() {
    const ui = g.ui; if (!ui) return;
    U.$$('.seg', ui.segAbas).forEach((b) => b.classList.toggle('ativo', b.dataset.id === g.aba));
    ui.btnBloq.classList.toggle('ativo', g.bloqueado);
    ui.cadeado.hidden = !g.bloqueado;
    ui.navCel.hidden = !g.celula;
    const c = ui.corpo; c.innerHTML = '';
    const gr = g.gr, ed = g.ed;
    if (g.cortando) { painelCorte(c); desenhar(); return; }
    if (g.aba === 'grade') {
      c.append(
        linha('Forma', segmento([['quadrada', 'Quadrada'], ['retangular', 'Retangular']], gr.forma, (v) => { gr.forma = v; if (gr.modo === 'medida' && v === 'retangular') gr.modo = 'personalizada'; atualizar(); desenhar(); atualizarInfo(); })),
        linha('Quantidade', segmento([['auto', 'Automática'], ['personalizada', 'Personalizada'], ['medida', 'Por medida (cm)']], gr.modo, (v) => { gr.modo = v; if (v === 'medida') gr.forma = 'quadrada'; atualizar(); desenhar(); atualizarInfo(); })));
      if (gr.modo === 'personalizada') c.append(h('div', { class: 'controles coluna' },
        slider(gr.forma === 'quadrada' ? 'Células na largura' : 'Colunas', 1, 30, 1, gr.colunas, String, (v) => { gr.colunas = v; desenhar(); atualizarInfo(); }),
        gr.forma === 'retangular' ? slider('Linhas', 1, 30, 1, gr.linhas, String, (v) => { gr.linhas = v; desenhar(); atualizarInfo(); }) : null));
      if (gr.modo === 'medida') c.append(h('p', { class: 'nota' }, 'O tamanho da célula e da imagem no papel se ajustam na aba Tamanho.'));
      c.append(
        h('div', { class: 'linha-botoes' },
          h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: gr.diagCelula, onchange: (e) => { gr.diagCelula = e.target.checked; desenhar(); } }), ' Diagonais em cada célula'),
          h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: gr.diagImagem, onchange: (e) => { gr.diagImagem = e.target.checked; desenhar(); } }), ' Diagonais e centro da imagem')),
        linha('Etiquetas', segmento([['nenhuma', 'Sem etiqueta'], ['bordas', 'Nas bordas (A, 1)'], ['celulas', 'Em cada célula (A1)']], gr.etiquetas, (v) => { gr.etiquetas = v; atualizar(); desenhar(); })),
        linha('Cor', ...['#e0301e', '#1e5ae0', '#111111', '#ffffff', '#f5c400', '#18a058'].map((cor) => h('button', { class: 'grade-cor' + (gr.cor === cor ? ' ativo' : ''), style: { background: cor }, title: cor, onclick: () => { gr.cor = cor; atualizar(); desenhar(); } })),
          h('label', { class: 'btn pequeno' }, 'Outra ', h('input', { type: 'color', value: gr.cor, oninput: (e) => { gr.cor = e.target.value; desenhar(); } }))),
        h('div', { class: 'controles coluna' },
          slider('Espessura', 0.5, 10, 0.5, gr.espessura, (v) => v.toFixed(1), (v) => { gr.espessura = v; desenhar(); }),
          slider('Transparência', 0.1, 1, 0.05, gr.opac, (v) => Math.round(v * 100) + '%', (v) => { gr.opac = v; desenhar(); }),
          gr.etiquetas !== 'nenhuma' ? slider('Tamanho da etiqueta', 0.5, 2.5, 0.1, gr.tamEtiqueta, (v) => Math.round(v * 100) + '%', (v) => { gr.tamEtiqueta = v; desenhar(); }) : null),
        h('div', { class: 'linha-botoes' }, h('button', { class: 'btn', onclick: () => { g.celula = [0, 0]; atualizar(); focarCelula(); } }, 'Estudar célula por célula')),
        h('p', { class: 'nota' }, 'Como usar: desenhe no papel a mesma grade, bem fraca, com as mesmas etiquetas. Copie uma célula por vez, olhando onde cada linha entra e sai da célula. As diagonais ajudam a achar os pontos no meio da célula.'));
    } else if (g.aba === 'imagem') {
      c.append(
        h('div', { class: 'linha-botoes' },
          h('button', { class: 'btn', onclick: iniciarCorte }, 'Cortar'),
          h('button', { class: 'btn', onclick: () => { ed.rot = (ed.rot + 90) % 360; ed.corte = null; reprocessar(true); ajustarVista(); } }, 'Girar 90°'),
          h('button', { class: 'btn', onclick: () => { ed.espH = !ed.espH; ed.corte = ed.corte && { ...ed.corte, x: 1 - ed.corte.x - ed.corte.w }; reprocessar(true); } }, 'Inverter na horizontal'),
          h('button', { class: 'btn', onclick: () => { ed.espV = !ed.espV; ed.corte = ed.corte && { ...ed.corte, y: 1 - ed.corte.y - ed.corte.h }; reprocessar(true); } }, 'Inverter na vertical')),
        h('p', { class: 'rotulo' }, 'Editar'),
        h('div', { class: 'controles coluna' },
          slider('Brilho', 30, 200, 1, ed.brilho, (v) => v + '%', (v) => { ed.brilho = v; reprocessar(); }),
          slider('Contraste', 30, 250, 1, ed.contraste, (v) => v + '%', (v) => { ed.contraste = v; reprocessar(); }),
          slider('Saturação', 0, 250, 1, ed.saturacao, (v) => v + '%', (v) => { ed.saturacao = v; reprocessar(); })),
        h('div', { class: 'linha-botoes' },
          h('button', { class: 'btn pequeno', onclick: () => { Object.assign(ed, { brilho: 100, contraste: 100, saturacao: 100 }); reprocessar(true); atualizar(); } }, 'Zerar ajustes'),
          h('button', { class: 'btn pequeno', onclick: () => { Object.assign(ed, PADRAO().ed); reprocessar(true); atualizar(); ajustarVista(); } }, 'Voltar à imagem original')),
        h('p', { class: 'nota' }, 'Inverter a imagem é um bom teste: copiar a figura espelhada ou de cabeça para baixo obriga a ver formas, não objetos.'));
    } else if (g.aba === 'efeitos') {
      c.append(
        linha('Efeito', segmento([['nenhum', 'Nenhum'], ['cinza', 'Tons de cinza'], ['valores', 'Poucos tons'], ['altoContraste', 'Alto contraste'], ['esboco', 'Lápis'], ['contornos', 'Contornos'], ['sepia', 'Sépia'], ['inverter', 'Negativo']], ed.efeito, (v) => { ed.efeito = v; reprocessar(true); atualizar(); })),
        h('div', { class: 'controles coluna' },
          ed.efeito === 'valores' ? slider('Quantidade de tons', 2, 8, 1, ed.niveis, String, () => {}, (v) => { ed.niveis = v; reprocessar(true); }) : null,
          ed.efeito === 'esboco' || ed.efeito === 'contornos' ? slider('Intensidade', 0, 100, 1, ed.forca, String, () => {}, (v) => { ed.forca = v; reprocessar(true); }) : null,
          slider('Pixels (tamanho do bloco)', 0, 60, 1, ed.pixel, (v) => (v > 1 ? v + ' px' : 'desligado'), () => {}, (v) => { ed.pixel = v; reprocessar(true); })),
        h('p', { class: 'nota' }, '"Poucos tons" com 3 ou 5 tons mostra as massas de luz e sombra. "Pixels" junta a imagem em blocos: ótimo para estudar os valores antes dos detalhes.'));
    } else if (g.aba === 'papel') {
      const W = g.proc.width, H = g.proc.height, alt = g.papel.largura * H / W, { xs, ys } = linhasGrade(W, H);
      const celPx = xs[1] - xs[0], celCm = g.papel.largura * celPx / W;
      const campo = (rot, val, aoMudar) => h('label', { class: 'grade-campo' }, h('span', {}, rot), h('input', { type: 'number', min: 1, max: 300, step: 0.5, value: val, onchange: (e) => { const v = +e.target.value; if (v > 0) { aoMudar(v); atualizar(); desenhar(); atualizarInfo(); } } }), h('span', {}, 'cm'));
      c.append(
        h('div', { class: 'grade-campos' },
          campo('Largura da imagem no papel', g.papel.largura, (v) => { g.papel.largura = v; }),
          campo('Altura da imagem no papel', +alt.toFixed(1), (v) => { g.papel.largura = v * W / H; }),
          campo('Tamanho da célula', g.papel.celula, (v) => { g.papel.celula = v; g.gr.modo = 'medida'; g.gr.forma = 'quadrada'; })),
        h('p', {}, `Imagem no papel: ${fmtCm(g.papel.largura)} × ${fmtCm(alt)} cm · grade de ${xs.length - 1} × ${ys.length - 1} células de ${fmtCm(celCm)}${g.gr.forma === 'retangular' ? ' × ' + fmtCm(g.papel.largura * (ys[1] - ys[0]) / W) : ''} cm.`),
        h('p', { class: 'nota' }, `Folha A4: 21 × 29,7 cm. ${g.papel.largura <= 19 && alt <= 27.7 ? 'A imagem cabe numa A4 com margem de 1 cm.' : 'A imagem não cabe numa A4: use "Dividir em partes" na aba Salvar para imprimir em várias folhas.'} Para medir no papel, marque as linhas a cada ${fmtCm(celCm)} cm com a régua.`),
        h('div', { class: 'linha-botoes' },
          h('button', { class: 'btn pequeno', onclick: () => { g.papel.largura = W >= H ? 27.7 : 19; if (W >= H && g.papel.largura * H / W > 19) g.papel.largura = 19 * W / H; if (W < H && g.papel.largura * H / W > 27.7) g.papel.largura = 27.7 * W / H; atualizar(); atualizarInfo(); } }, 'Ocupar uma A4'),
          h('button', { class: 'btn pequeno', onclick: () => { g.gr.modo = 'medida'; g.gr.forma = 'quadrada'; atualizar(); desenhar(); atualizarInfo(); } }, 'Usar a célula em cm na grade')));
    } else if (g.aba === 'comparar') {
      const cp = g.comp;
      const entradaDes = h('input', { type: 'file', accept: 'image/*', hidden: true });
      entradaDes.addEventListener('change', async () => {
        const arq = entradaDes.files && entradaDes.files[0]; if (!arq) return;
        const url = URL.createObjectURL(arq);
        try { const im = await U.carregarImagem(url); const k = Math.min(1, MAX / Math.max(im.naturalWidth, im.naturalHeight)); const d = novaTela(im.naturalWidth * k, im.naturalHeight * k); d.getContext('2d').drawImage(im, 0, 0, d.width, d.height); g.comp = { img: d, modo: 'sobrepor', opac: 0.5, x: 0, y: 0, esc: 1, girar: 0, gradeNoDesenho: true }; } catch (e) { U.aviso('Não foi possível abrir a foto do desenho.'); }
        finally { URL.revokeObjectURL(url); }
        atualizar(); desenhar();
      });
      c.append(entradaDes, h('p', {}, 'Fotografe o seu desenho de frente, com a folha inteira, e compare com a referência.'),
        h('div', { class: 'linha-botoes' }, h('button', { class: 'btn primario', onclick: () => entradaDes.click() }, cp ? 'Trocar a foto do desenho' : 'Foto do meu desenho'), cp ? h('button', { class: 'btn', onclick: () => { g.comp = null; atualizar(); desenhar(); } }, 'Parar de comparar') : null));
      if (cp) {
        c.append(
          linha('Modo', segmento([['sobrepor', 'Sobrepor'], ['lado', 'Lado a lado'], ['piscar', 'Alternar']], cp.modo, (v) => { cp.modo = v; atualizar(); desenhar(); })),
          h('div', { class: 'controles coluna' },
            cp.modo === 'sobrepor' ? slider('Referência por cima', 0, 1, 0.05, cp.opac, (v) => Math.round(v * 100) + '%', (v) => { cp.opac = v; desenhar(); }) : null,
            slider('Tamanho do desenho', 0.5, 2, 0.01, cp.esc, (v) => Math.round(v * 100) + '%', (v) => { cp.esc = v; desenhar(); }),
            slider('Mover na horizontal', -0.5, 0.5, 0.005, cp.x, (v) => Math.round(v * 100) + '%', (v) => { cp.x = v; desenhar(); }),
            slider('Mover na vertical', -0.5, 0.5, 0.005, cp.y, (v) => Math.round(v * 100) + '%', (v) => { cp.y = v; desenhar(); }),
            slider('Girar', -15, 15, 0.5, cp.girar, (v) => v + '°', (v) => { cp.girar = v; desenhar(); })),
          h('div', { class: 'linha-botoes' },
            h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: cp.gradeNoDesenho, onchange: (e) => { cp.gradeNoDesenho = e.target.checked; desenhar(); } }), ' Grade sobre o desenho'),
            cp.modo === 'piscar' ? h('button', { class: 'btn', onclick: () => { cp.mostrarRef = !cp.mostrarRef; desenhar(); } }, 'Trocar imagem') : null),
          h('p', { class: 'nota' }, 'Alinhe as bordas da grade do desenho com as da referência usando tamanho, mover e girar. Onde as formas não coincidem está o erro de proporção.'));
      }
    } else if (g.aba === 'arquivo') {
      c.append(
        h('div', { class: 'linha-botoes' },
          h('button', { class: 'btn primario', onclick: pedirNomeESalvar }, g.id ? 'Salvar alterações' : 'Salvar'),
          h('button', { class: 'btn', onclick: () => telaSalvas(U.$('#vista')) }, 'Imagens salvas'),
          h('button', { class: 'btn', onclick: () => baixar(true) }, 'Baixar com a grade'),
          h('button', { class: 'btn', onclick: () => baixar(false) }, 'Baixar sem a grade'),
          h('button', { class: 'btn', onclick: compartilhar }, 'Compartilhar'),
          h('button', { class: 'btn', onclick: () => imprimir([imagemComGrade()], g.papel.largura) }, 'Imprimir no tamanho real'),
          h('button', { class: 'btn', onclick: dividir }, 'Dividir em partes'),
          h('button', { class: 'btn', onclick: levarAoAtelie }, 'Desenhar no Ateliê')),
        h('p', { class: 'nota' }, 'Na impressão a imagem sai com a largura escolhida na aba Tamanho. Na janela de impressão deixe a escala em 100% (sem "ajustar à página") para as células saírem com a medida certa.'));
    }
    atualizarInfo();
  }
  const fmtCm = (v) => (Math.round(v * 10) / 10).toString().replace('.', ',');
  function atualizarInfo() {
    if (!g.ui || !g.proc) return;
    const { xs, ys } = linhasGrade(g.proc.width, g.proc.height);
    g.ui.info.textContent = `${xs.length - 1} × ${ys.length - 1} células · ${Math.round(g.vista ? g.vista.esc * 100 : 100)}%`;
  }

  // ---------------- célula por célula ----------------
  function limitarCelula() {
    const { xs, ys } = linhasGrade(g.proc.width, g.proc.height);
    g.celula[0] = Math.min(g.celula[0], xs.length - 2); g.celula[1] = Math.min(g.celula[1], ys.length - 2);
  }
  function moverCelula(d) {
    const { xs, ys } = linhasGrade(g.proc.width, g.proc.height), nc = xs.length - 1, nl = ys.length - 1;
    let k = g.celula[1] * nc + g.celula[0] + d;
    k = (k + nc * nl) % (nc * nl);
    g.celula = [k % nc, Math.floor(k / nc)];
    focarCelula();
  }
  function focarCelula() {
    limitarCelula();
    const { xs, ys } = linhasGrade(g.proc.width, g.proc.height), [i, j] = g.celula;
    const w = xs[i + 1] - xs[i], hh = ys[j + 1] - ys[j], ui = g.ui, m = 50;
    const esc = Math.min((ui.lw - 2 * m) / (w * 1.6), (ui.lh - 2 * m) / (hh * 1.6));
    g.vista = { esc, x: ui.lw / 2 - (xs[i] + w / 2) * esc, y: ui.lh / 2 - (ys[j] + hh / 2) * esc };
    ui.rotCel.textContent = `Célula ${letra(i)}${j + 1}`;
    ui.navCel.hidden = false;
    desenhar(); atualizarInfo();
  }

  // ---------------- vista e desenho ----------------
  function redimensionar(ajustar) {
    const { palco, cv } = g.ui, r = palco.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    if (!r.width || !r.height) return;
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px';
    Object.assign(g.ui, { dpr, lw: r.width, lh: r.height });
    if (ajustar || !g.vista) ajustarVista(); else if (g.celula) focarCelula(); else desenhar();
  }
  function ajustarVista() {
    const { lw, lh } = g.ui, m = 10;
    const [W, H] = tamanhoConteudo();
    const esc = Math.min((lw - 2 * m) / W, (lh - 2 * m) / H);
    g.vista = { esc, x: (lw - W * esc) / 2, y: (lh - H * esc) / 2 };
    desenhar(); atualizarInfo();
  }
  function tamanhoConteudo() {
    if (g.cortando) return [g.girada.width, g.girada.height];
    const W = g.proc.width, H = g.proc.height;
    return g.comp && g.comp.modo === 'lado' ? [W * 2 + W * 0.04, H] : [W, H];
  }
  function zoom(k, cx, cy) {
    if (g.bloqueado) return;
    const v = g.vista, ui = g.ui;
    if (cx == null) { cx = ui.lw / 2; cy = ui.lh / 2; }
    const nova = Math.min(20, Math.max(0.03, v.esc * k)); k = nova / v.esc;
    v.x = cx - (cx - v.x) * k; v.y = cy - (cy - v.y) * k; v.esc = nova;
    desenhar(); atualizarInfo();
  }
  let pedido = 0;
  function desenhar() { if (!pedido) pedido = requestAnimationFrame(() => { pedido = 0; compor(); }); }
  function compor() {
    if (!g || !g.ui) return;
    const { ctx, cv, dpr } = g.ui, v = g.vista;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#2a2622'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr * v.esc, 0, 0, dpr * v.esc, dpr * v.x, dpr * v.y);
    ctx.imageSmoothingEnabled = v.esc < 3;
    if (g.cortando) { comporCorte(ctx, v.esc); return; }
    const W = g.proc.width, H = g.proc.height, cp = g.comp;
    const desenhoAlinhado = (x) => {
      x.save(); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
      x.beginPath(); x.rect(0, 0, W, H); x.clip();
      x.translate(W / 2 + cp.x * W, H / 2 + cp.y * H); x.rotate(cp.girar * Math.PI / 180);
      // o desenho é encaixado na mesma caixa da referência
      const k = Math.min(W / cp.img.width, H / cp.img.height) * cp.esc;
      x.drawImage(cp.img, -cp.img.width * k / 2, -cp.img.height * k / 2, cp.img.width * k, cp.img.height * k);
      x.restore();
    };
    if (!cp) {
      ctx.drawImage(g.proc, 0, 0);
      desenharGrade(ctx, W, H, v.esc, g.celula);
    } else if (cp.modo === 'lado') {
      ctx.drawImage(g.proc, 0, 0); desenharGrade(ctx, W, H, v.esc);
      ctx.save(); ctx.translate(W * 1.04, 0); desenhoAlinhado(ctx); if (cp.gradeNoDesenho) desenharGrade(ctx, W, H, v.esc); ctx.restore();
    } else if (cp.modo === 'piscar') {
      if (cp.mostrarRef) { ctx.drawImage(g.proc, 0, 0); desenharGrade(ctx, W, H, v.esc); }
      else { desenhoAlinhado(ctx); if (cp.gradeNoDesenho) desenharGrade(ctx, W, H, v.esc); }
    } else {
      desenhoAlinhado(ctx);
      ctx.globalAlpha = cp.opac; ctx.drawImage(g.proc, 0, 0); ctx.globalAlpha = 1;
      if (cp.gradeNoDesenho) desenharGrade(ctx, W, H, v.esc);
    }
  }

  // ---------------- cortar ----------------
  const PROP = [['livre', 'Livre', 0], ['1:1', 'Quadrado', 1], ['3:4', '3 × 4', 3 / 4], ['4:3', '4 × 3', 4 / 3], ['a4', 'A4 em pé', 21 / 29.7], ['a4d', 'A4 deitado', 29.7 / 21]];
  function iniciarCorte() {
    g.celula = null;
    const c = g.ed.corte || { x: 0.05, y: 0.05, w: 0.9, h: 0.9 };
    g.cortando = { ...c, prop: 'livre' };
    atualizar(); ajustarVista();
  }
  function painelCorte(c) {
    c.append(h('p', {}, h('strong', {}, 'Cortar: '), 'arraste os cantos e as bordas do retângulo; arraste o meio para mover.'),
      linha('Proporção', segmento(PROP.map(([id, rot]) => [id, rot]), g.cortando.prop, (id) => { g.cortando.prop = id; aplicarProporcao(); atualizar(); desenhar(); })),
      h('div', { class: 'linha-botoes' },
        h('button', { class: 'btn primario', onclick: () => { const k = g.cortando; g.ed.corte = { x: k.x, y: k.y, w: k.w, h: k.h }; g.cortando = null; reprocessar(true); atualizar(); ajustarVista(); } }, 'Aplicar corte'),
        h('button', { class: 'btn', onclick: () => { g.cortando = null; atualizar(); ajustarVista(); } }, 'Cancelar'),
        h('button', { class: 'btn', onclick: () => { g.ed.corte = null; g.cortando = null; reprocessar(true); atualizar(); ajustarVista(); } }, 'Sem corte')));
  }
  function aplicarProporcao() {
    const k = g.cortando, p = PROP.find((x) => x[0] === k.prop)[2]; if (!p) return;
    const W = g.girada.width, H = g.girada.height;
    // mantém o centro e a largura, ajusta a altura (e reduz se sair da imagem)
    const cx = k.x + k.w / 2, cy = k.y + k.h / 2;
    let w = k.w * W, hh = w / p;
    if (hh > H) { hh = H; w = hh * p; }
    if (w > W) { w = W; hh = w / p; }
    k.w = w / W; k.h = hh / H;
    k.x = Math.min(1 - k.w, Math.max(0, cx - k.w / 2)); k.y = Math.min(1 - k.h, Math.max(0, cy - k.h / 2));
  }
  function alcasCorte() {
    const k = g.cortando, W = g.girada.width, H = g.girada.height;
    const x0 = k.x * W, y0 = k.y * H, x1 = (k.x + k.w) * W, y1 = (k.y + k.h) * H, xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
    return [['nw', x0, y0], ['n', xm, y0], ['ne', x1, y0], ['e', x1, ym], ['se', x1, y1], ['s', xm, y1], ['sw', x0, y1], ['w', x0, ym]];
  }
  function comporCorte(ctx, esc) {
    const W = g.girada.width, H = g.girada.height, k = g.cortando;
    ctx.drawImage(g.girada, 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.rect(k.x * W, k.y * H, k.w * W, k.h * H); ctx.fill('evenodd');
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 / esc; ctx.strokeRect(k.x * W, k.y * H, k.w * W, k.h * H);
    ctx.lineWidth = 1 / esc; ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.beginPath();
    for (const f of [1 / 3, 2 / 3]) { ctx.moveTo((k.x + k.w * f) * W, k.y * H); ctx.lineTo((k.x + k.w * f) * W, (k.y + k.h) * H); ctx.moveTo(k.x * W, (k.y + k.h * f) * H); ctx.lineTo((k.x + k.w) * W, (k.y + k.h * f) * H); }
    ctx.stroke();
    const r = 9 / esc;
    for (const [, x, y] of alcasCorte()) { ctx.fillStyle = '#fff'; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); ctx.strokeStyle = '#c8531f'; ctx.lineWidth = 2 / esc; ctx.strokeRect(x - r, y - r, 2 * r, 2 * r); }
  }
  function arrastarCorte(a, x, y) {
    const k = g.cortando, W = g.girada.width, H = g.girada.height, k0 = a.k0, min = 0.05;
    const nx = x / W, ny = y / H, dx = nx - a.nx0, dy = ny - a.ny0;
    if (a.id === 'mover') { k.x = Math.min(1 - k.w, Math.max(0, k0.x + dx)); k.y = Math.min(1 - k.h, Math.max(0, k0.y + dy)); return; }
    let x0 = k0.x, y0 = k0.y, x1 = k0.x + k0.w, y1 = k0.y + k0.h;
    if (a.id.includes('w')) x0 = Math.min(x1 - min, Math.max(0, nx));
    if (a.id.includes('e')) x1 = Math.max(x0 + min, Math.min(1, nx));
    if (a.id.includes('n')) y0 = Math.min(y1 - min, Math.max(0, ny));
    if (a.id.includes('s')) y1 = Math.max(y0 + min, Math.min(1, ny));
    const p = PROP.find((q) => q[0] === k.prop)[2];
    if (p) {
      // mantém a proporção a partir do lado arrastado
      const wPx = (x1 - x0) * W, hPx = (y1 - y0) * H;
      if (a.id === 'n' || a.id === 's') { const nw = hPx * p / W; if (a.id) { x1 = Math.min(1, x0 + nw); } }
      else { const nh = wPx / p / H; if (a.id.includes('n')) y0 = Math.max(0, y1 - nh); else y1 = Math.min(1, y0 + nh); }
    }
    Object.assign(k, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
  }

  // ---------------- entrada ----------------
  function ligarEntrada(cv) {
    const pts = new Map();
    let gesto = null, arrasto = null;
    const local = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const paraImg = ([lx, ly]) => [(lx - g.vista.x) / g.vista.esc, (ly - g.vista.y) / g.vista.esc];
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId); e.preventDefault();
      pts.set(e.pointerId, local(e));
      if (pts.size === 2) { arrasto = null; const [a, b] = [...pts.values()]; gesto = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] }; return; }
      if (g.cortando) {
        const [x, y] = paraImg(local(e)), r = 22 / g.vista.esc;
        const alca = alcasCorte().find(([, ax, ay]) => Math.hypot(ax - x, ay - y) < r);
        const k = g.cortando, W = g.girada.width, H = g.girada.height;
        const dentro = x > k.x * W && x < (k.x + k.w) * W && y > k.y * H && y < (k.y + k.h) * H;
        if (alca || dentro) { arrasto = { tipo: 'corte', id: alca ? alca[0] : 'mover', nx0: x / W, ny0: y / H, k0: { ...k } }; return; }
      }
      if (g.bloqueado) return;
      const [lx, ly] = local(e);
      arrasto = { tipo: 'mao', x: lx, y: ly, vx: g.vista.x, vy: g.vista.y };
    });
    cv.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, local(e));
      if (gesto && pts.size >= 2) {
        if (g.bloqueado) return;
        const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        g.vista.x += m[0] - gesto.m[0]; g.vista.y += m[1] - gesto.m[1];
        zoom(d / (gesto.d || d), m[0], m[1]); gesto = { d, m }; return;
      }
      if (!arrasto) return;
      if (arrasto.tipo === 'corte') { const [x, y] = paraImg(local(e)); arrastarCorte(arrasto, x, y); desenhar(); return; }
      const [lx, ly] = local(e);
      g.vista.x = arrasto.vx + lx - arrasto.x; g.vista.y = arrasto.vy + ly - arrasto.y; desenhar();
    });
    const soltar = (e) => { pts.delete(e.pointerId); if (pts.size < 2) gesto = null; if (!pts.size) arrasto = null; };
    cv.addEventListener('pointerup', soltar); cv.addEventListener('pointercancel', soltar);
    cv.addEventListener('wheel', (e) => { e.preventDefault(); const [lx, ly] = local(e); zoom(Math.exp(-e.deltaY * 0.0015), lx, ly); }, { passive: false });
  }

  // ---------------- tela cheia e bloqueio ----------------
  async function alternarCheia() {
    const p = g.ui.palco, cheia = p.classList.contains('cheia') || document.fullscreenElement === p;
    if (cheia) {
      if (document.fullscreenElement) { try { await document.exitFullscreen(); } catch (e) { /* ignora */ } }
      p.classList.remove('cheia'); document.body.classList.remove('sem-rolagem');
    } else {
      p.classList.add('cheia'); document.body.classList.add('sem-rolagem');
      try { if (p.requestFullscreen) await p.requestFullscreen(); } catch (e) { /* o navegador não permite: fica em tela cheia dentro da página */ }
    }
    g.ui.sairCheia.hidden = cheia;
    setTimeout(() => redimensionar(true), 80);
  }
  let trava = null;
  async function alternarBloqueio() {
    g.bloqueado = !g.bloqueado;
    if (g.bloqueado) {
      U.aviso('Imagem bloqueada: não mexe com o toque, e a tela fica acesa enquanto você desenha.');
      try { if (navigator.wakeLock) trava = await navigator.wakeLock.request('screen'); } catch (e) { trava = null; }
    } else if (trava) { try { await trava.release(); } catch (e) { /* ignora */ } trava = null; }
    atualizar();
  }

  // ---------------- salvar, baixar, imprimir, compartilhar ----------------
  function pedirNomeESalvar() {
    const nome = h('input', { type: 'text', value: g.nome || 'Imagem com grade', maxlength: 60 });
    U.modal('Salvar', h('label', { class: 'controles coluna' }, 'Nome', nome), [
      { rotulo: 'Cancelar' },
      { rotulo: 'Salvar', classe: 'primario', acao: () => { salvar(nome.value.trim() || 'Imagem com grade').then(() => { U.aviso('Salvo em Imagens salvas.'); atualizar(); }).catch(() => U.aviso('Não foi possível salvar neste navegador.')); } }
    ]);
  }
  async function baixar(comGrade) {
    try { U.baixar(await U.canvasParaBlob(imagemComGrade(g.proc, comGrade)), `${(g.nome || 'grade').replace(/[^\w\- ]+/g, '')}${comGrade ? '-grade' : ''}.png`); } catch (e) { U.aviso('Não foi possível gerar a imagem.'); }
  }
  async function compartilhar() {
    try {
      const blob = await U.canvasParaBlob(imagemComGrade());
      const arq = new File([blob], 'grade.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [arq] })) await navigator.share({ files: [arq], title: 'Imagem com grade' });
      else { U.baixar(blob, 'grade.png'); U.aviso('Este navegador não compartilha arquivos. A imagem foi baixada; envie pelo aplicativo que preferir.'); }
    } catch (e) { if (e && e.name !== 'AbortError') U.aviso('Não foi possível compartilhar.'); }
  }
  // Imprime uma ou mais imagens, cada uma numa página, com a largura em centímetros
  function imprimir(telas, larguraCm) {
    const area = h('div', { class: 'area-impressao' });
    for (const t of telas) area.append(h('div', { class: 'pagina-impressao' }, h('img', { src: t.toDataURL('image/png'), style: { width: larguraCm + 'cm' }, alt: '' })));
    document.body.append(area); document.body.classList.add('imprimindo');
    const limpar = () => { area.remove(); document.body.classList.remove('imprimindo'); window.removeEventListener('afterprint', limpar); };
    window.addEventListener('afterprint', limpar);
    setTimeout(() => { try { window.print(); } catch (e) { U.aviso('A impressão não está disponível aqui. Baixe a imagem e imprima pelo aparelho.'); } setTimeout(limpar, 1500); }, 300);
  }
  // Divide a imagem com a grade em partes (para ampliar em várias folhas)
  function dividir() {
    let col = 2, lin = 2;
    const W = g.proc.width, H = g.proc.height;
    const lista = h('div', { class: 'grade-partes' });
    const larg = h('output', {});
    const gerar = () => {
      lista.innerHTML = '';
      const base = imagemComGrade(), pw = Math.ceil(W / col), ph = Math.ceil(H / lin);
      g.partes = [];
      for (let j = 0; j < lin; j++) for (let i = 0; i < col; i++) {
        const t = novaTela(Math.min(pw, W - i * pw), Math.min(ph, H - j * ph)), x = t.getContext('2d');
        x.drawImage(base, i * pw, j * ph, t.width, t.height, 0, 0, t.width, t.height);
        x.fillStyle = 'rgba(255,255,255,.85)'; const fs = Math.max(14, t.width / 18); x.font = `700 ${fs}px system-ui, sans-serif`;
        const rot = `Parte ${j * col + i + 1} de ${col * lin} (linha ${j + 1}, coluna ${i + 1})`; x.fillRect(0, t.height - fs * 1.5, x.measureText(rot).width + fs, fs * 1.5); x.fillStyle = '#222'; x.fillText(rot, fs / 2, t.height - fs * 0.4);
        g.partes.push(t);
        lista.append(h('figure', {}, h('img', { src: t.toDataURL('image/jpeg', 0.7), alt: rot }), h('figcaption', {}, `Parte ${j * col + i + 1}`)));
      }
      larg.textContent = `Largura final do desenho: ${fmtCm(g.papel.largura * col)} cm (cada parte com ${fmtCm(g.papel.largura)} cm de largura).`;
    };
    const s = (rot, v, f) => slider(rot, 1, 4, 1, v, String, (n) => { f(n); gerar(); });
    const corpo = h('div', { class: 'controles coluna' }, s('Partes na largura', col, (n) => { col = n; }), s('Partes na altura', lin, (n) => { lin = n; }), larg, lista);
    gerar();
    U.modal('Dividir em partes', corpo, [
      { rotulo: 'Fechar' },
      { rotulo: 'Baixar as partes', acao: () => { g.partes.forEach((t, i) => setTimeout(async () => U.baixar(await U.canvasParaBlob(t), `parte-${i + 1}.png`), i * 400)); return false; } },
      { rotulo: 'Imprimir as partes', classe: 'primario', acao: () => { imprimir(g.partes, g.papel.largura); } }
    ]);
  }
  function levarAoAtelie() {
    U.aviso('No Ateliê, escolha "Escolher foto" e use a imagem baixada; ative a grade na aba Vista com o mesmo número de células.');
    baixar(true);
  }

  // ---------------- imagens salvas ----------------
  async function telaSalvas(raiz) {
    let itens = [];
    try { itens = await op('readonly', (s) => s.getAll()); } catch (e) { /* sem banco */ }
    itens.sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1));
    const lista = h('div', { class: 'grade-salvas' });
    const m = U.modal('Imagens salvas', itens.length ? lista : h('p', {}, 'Nenhuma imagem salva ainda. Use "Salvar" na aba Salvar.'), [{ rotulo: 'Fechar' }]);
    for (const it of itens) {
      const url = URL.createObjectURL(it.miniatura);
      lista.append(h('div', { class: 'grade-salva' },
        h('img', { src: url, alt: it.nome }),
        h('div', {}, h('strong', {}, it.nome), h('span', { class: 'nota' }, U.dataCurta(it.criadoEm)),
          h('div', { class: 'linha-botoes' },
            h('button', { class: 'btn pequeno primario', onclick: async () => { m.fechar(); const im = await U.carregarImagem(URL.createObjectURL(it.original)); abrirImagem(im, it); montar(raiz); } }, 'Abrir'),
            h('button', { class: 'btn pequeno', onclick: async (e) => { if (!(await U.confirmar(`Excluir "${it.nome}"?`, 'Excluir'))) return; await op('readwrite', (s) => s.delete(it.id)); e.target.closest('.grade-salva').remove(); if (g && g.id === it.id) g.id = null; } }, 'Excluir')))));
    }
  }

  function sair() {
    if (!ativo) return;
    ativo = false;
    if (g && g.ui) { if (g.ui.ro) g.ui.ro.disconnect(); if (g.ui.palco.classList.contains('cheia')) { g.ui.palco.classList.remove('cheia'); document.body.classList.remove('sem-rolagem'); } }
    if (trava) { trava.release().catch(() => {}); trava = null; }
    if (g) g.bloqueado = false;
  }

  return { montar, sair };
})();
