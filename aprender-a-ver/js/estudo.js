/*
 * Folhas de estudo: a partir de uma foto com a cabeça de Loomis encaixada,
 * monta três pranchas no estilo dos cadernos de estudo de retrato:
 *  1. Construção passo a passo (esfera, planos e feições, blocos, refinar,
 *     sombrear) com o retrato final a lápis;
 *  2. Proporções e medidas (terços, linhas de referência e cotas);
 *  3. Planos, luz e sombra (planos da estrutura, três valores e a cabeça
 *     em vários ângulos).
 * Tudo é calculado no aparelho, sem serviço externo.
 */
const Estudo = (() => {
  const { h } = U;
  const FOLHA = [1654, 2339]; // A4 em pé, 200 ppp
  const LETRA = "'Segoe Print', 'Bradley Hand', 'Comic Neue', 'Comic Sans MS', 'Patrick Hand', cursive";
  const VERMELHO = '#c8452c', AZUL = '#3f72c0', TINTA = '#2b2622', PAPEL = '#f4f0e7';

  // ---------------- imagem: tons, bordas e lápis ----------------
  function tela(W, H) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(W)); c.height = Math.max(1, Math.round(H)); return c; }
  function cinza(c) {
    const d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data, n = c.width * c.height, g = new Float32Array(n);
    for (let i = 0, j = 0; i < n; i++, j += 4) g[i] = (0.299 * d[j] + 0.587 * d[j + 1] + 0.114 * d[j + 2]) / 255;
    return g;
  }
  function desfocar(src, W, H, r) {
    const a = Float32Array.from(src), b = new Float32Array(src.length);
    r = Math.max(1, Math.round(r));
    for (let p = 0; p < 2; p++) {
      for (let y = 0; y < H; y++) { let s = 0; const o = y * W; for (let x = -r; x <= r; x++) s += a[o + Math.min(W - 1, Math.max(0, x))]; for (let x = 0; x < W; x++) { b[o + x] = s / (2 * r + 1); s += a[o + Math.min(W - 1, x + r + 1)] - a[o + Math.max(0, x - r)]; } }
      for (let x = 0; x < W; x++) { let s = 0; for (let y = -r; y <= r; y++) s += b[Math.min(H - 1, Math.max(0, y)) * W + x]; for (let y = 0; y < H; y++) { a[y * W + x] = s / (2 * r + 1); s += b[Math.min(H - 1, y + r + 1) * W + x] - b[Math.max(0, y - r) * W + x]; } }
    }
    return a;
  }
  function percentil(g, p) {
    const hist = new Uint32Array(256); for (let i = 0; i < g.length; i++) hist[Math.min(255, (g[i] * 255) | 0)]++;
    let acc = 0; for (let k = 0; k < 256; k++) { acc += hist[k]; if (acc >= g.length * p) return k / 255; } return 1;
  }
  function normalizar(g) {
    const lo = percentil(g, 0.02), hi = percentil(g, 0.985), out = new Float32Array(g.length);
    for (let i = 0; i < g.length; i++) out[i] = Math.min(1, Math.max(0, (g[i] - lo) / Math.max(0.05, hi - lo)));
    return out;
  }
  // canal alfa a partir de um mapa (0..1)
  function mascara(W, H, fn) {
    const c = tela(W, H), x = c.getContext('2d'), img = x.createImageData(W, H), d = img.data;
    for (let i = 0, j = 0; i < W * H; i++, j += 4) { d[j] = d[j + 1] = d[j + 2] = 0; d[j + 3] = Math.round(255 * fn(i)); }
    x.putImageData(img, 0, 0); return c;
  }
  function papel(W, H, cor = PAPEL) {
    const c = tela(W, H), x = c.getContext('2d');
    x.fillStyle = cor; x.fillRect(0, 0, W, H);
    const img = x.getImageData(0, 0, W, H), d = img.data;
    let s = 12345; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let j = 0; j < d.length; j += 4) { const v = (rnd() - 0.5) * 10; d[j] += v; d[j + 1] += v; d[j + 2] += v; }
    x.putImageData(img, 0, 0);
    return c;
  }
  // hachuras em várias direções, cada camada só onde o tom é mais escuro que o limite
  function hachurar(x, W, H, g, camadas, cor = TINTA) {
    let s = 777; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (const c of camadas) {
      const hc = tela(W, H), hx = hc.getContext('2d');
      hx.strokeStyle = cor; hx.lineWidth = c.lw; hx.globalAlpha = c.a; hx.lineCap = 'round';
      hx.translate(W / 2, H / 2); hx.rotate(c.ang * Math.PI / 180);
      const L = Math.hypot(W, H);
      hx.beginPath();
      for (let p = -L / 2; p < L / 2; p += c.esp * (0.8 + rnd() * 0.4)) {
        const desvio = (rnd() - 0.5) * c.esp * 0.5;
        hx.moveTo(-L / 2, p); hx.quadraticCurveTo(0, p + desvio, L / 2, p + (rnd() - 0.5) * c.esp * 0.4);
      }
      hx.stroke();
      hx.setTransform(1, 0, 0, 1, 0, 0); hx.globalAlpha = 1;
      hx.globalCompositeOperation = 'destination-in';
      hx.drawImage(mascara(W, H, (i) => Math.min(1, Math.max(0, (c.t - g[i]) / 0.09))), 0, 0);
      x.drawImage(hc, 0, 0);
    }
  }
  // Retrato a lápis feito da foto: tom suave + hachuras + contornos
  function lapis(fonte, W, H, op = {}) {
    const base = tela(W, H); base.getContext('2d').drawImage(fonte, 0, 0, W, H);
    const g0 = normalizar(desfocar(cinza(base), W, H, 1));
    const g = g0.map((v) => Math.pow(v, op.gama || 1.15));
    const out = papel(W, H, op.papel), x = out.getContext('2d');
    x.globalCompositeOperation = 'multiply';
    // camada suave de grafite
    const tom = mascara(W, H, (i) => (1 - g[i]) * (op.suave != null ? op.suave : 0.42));
    const tc = tela(W, H), tx = tc.getContext('2d'); tx.fillStyle = '#3a342e'; tx.fillRect(0, 0, W, H); tx.globalCompositeOperation = 'destination-in'; tx.drawImage(tom, 0, 0);
    x.drawImage(tc, 0, 0);
    const k = Math.max(W, H) / 900;
    if (op.hachura !== false) hachurar(x, W, H, g, [
      { t: 0.8, ang: 48, esp: 6.5 * k, lw: 0.9 * k, a: 0.38 },
      { t: 0.64, ang: -38, esp: 5.5 * k, lw: 0.9 * k, a: 0.42 },
      { t: 0.48, ang: 64, esp: 4.8 * k, lw: 1 * k, a: 0.48 },
      { t: 0.33, ang: -12, esp: 4.2 * k, lw: 1.1 * k, a: 0.55 },
      { t: 0.19, ang: 28, esp: 3.4 * k, lw: 1.2 * k, a: 0.65 }
    ], op.cor);
    // contornos (diferença de desfoques)
    const b1 = desfocar(g0, W, H, 1 * k), b2 = desfocar(g0, W, H, 3.2 * k), forca = op.contorno != null ? op.contorno : 1;
    const linhas = mascara(W, H, (i) => Math.min(1, Math.max(0, (b2[i] - b1[i] - 0.015) * 9 * forca)));
    const lc = tela(W, H), lx = lc.getContext('2d'); lx.fillStyle = op.cor || TINTA; lx.fillRect(0, 0, W, H); lx.globalCompositeOperation = 'destination-in'; lx.drawImage(linhas, 0, 0);
    x.drawImage(lc, 0, 0);
    return out;
  }
  // Três valores: luz, meio-tom e sombra
  function tresValores(fonte, W, H) {
    const base = tela(W, H); base.getContext('2d').drawImage(fonte, 0, 0, W, H);
    const g = normalizar(desfocar(cinza(base), W, H, Math.max(2, W / 160)));
    const a = percentil(g, 0.33), b = percentil(g, 0.66);
    const c = tela(W, H), x = c.getContext('2d'), img = x.createImageData(W, H), d = img.data;
    const cores = [[78, 72, 66], [166, 159, 150], [242, 238, 230]];
    const classe = new Uint8Array(W * H);
    for (let i = 0, j = 0; i < W * H; i++, j += 4) { const k = g[i] < a ? 0 : g[i] < b ? 1 : 2; classe[i] = k; d[j] = cores[k][0]; d[j + 1] = cores[k][1]; d[j + 2] = cores[k][2]; d[j + 3] = 255; }
    x.putImageData(img, 0, 0);
    return { tela: c, classe };
  }

  // ---------------- desenho da folha ----------------
  function texto(x, t, X, Y, op = {}) {
    x.save(); x.font = `${op.peso || 400} ${op.tam || 26}px ${LETRA}`; x.fillStyle = op.cor || TINTA; x.textAlign = op.alinha || 'left'; x.textBaseline = op.base || 'alphabetic';
    x.fillText(t, X, Y); x.restore();
  }
  function tituloPainel(x, n, t, X, Y) {
    if (n) {
      x.save(); x.strokeStyle = TINTA; x.lineWidth = 2; x.beginPath(); x.arc(X + 16, Y - 9, 16, 0, Math.PI * 2); x.stroke(); x.restore();
      texto(x, String(n), X + 16, Y - 1, { alinha: 'center', tam: 22, peso: 700 });
      texto(x, t, X + 42, Y, { tam: 28 });
    } else {
      texto(x, t, X, Y, { tam: 28 });
      x.save(); x.strokeStyle = TINTA; x.lineWidth = 1.5; x.beginPath(); x.moveTo(X, Y + 8); x.lineTo(X + x.measureText(t).width * 1.25, Y + 8); x.stroke(); x.restore();
    }
  }
  // seta de cota com texto
  function cota(x, x1, y1, x2, y2, rot, op = {}) {
    const cor = op.cor || AZUL, ang = Math.atan2(y2 - y1, x2 - x1), s = op.seta || 9;
    x.save(); x.strokeStyle = cor; x.fillStyle = cor; x.lineWidth = op.lw || 2;
    x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke();
    for (const [px, py, a] of [[x1, y1, ang + Math.PI], [x2, y2, ang]]) {
      x.beginPath(); x.moveTo(px, py); x.lineTo(px - s * Math.cos(a - 0.4), py - s * Math.sin(a - 0.4)); x.lineTo(px - s * Math.cos(a + 0.4), py - s * Math.sin(a + 0.4)); x.closePath(); x.fill();
    }
    x.restore();
    if (rot) {
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, vertical = Math.abs(y2 - y1) > Math.abs(x2 - x1);
      const linhas = rot.split('\n'), tam = op.tam || 20;
      linhas.forEach((l, i) => {
        const dy = (i - (linhas.length - 1) / 2) * tam * 1.1;
        if (vertical) texto(x, l, mx + (op.lado === 'esq' ? -10 : 10), my + dy + tam * 0.35, { tam, cor, alinha: op.lado === 'esq' ? 'right' : 'left', peso: 600 });
        else texto(x, l, mx, my - 10 + dy - (linhas.length - 1) * tam * 0.55, { tam, cor, alinha: 'center', peso: 600 });
      });
    }
  }
  function svgImg(svg) { return U.carregarImagem(U.svgParaUrl(svg)); }

  // Recorte da foto em volta da cabeça
  function recorte(foto, L) {
    const P = Object.assign({}, Cabeca.PADRAO, L.P || {});
    let w = L.R * P.largura * 3.3, hgt = L.R * P.altura * 3.7;
    let x0 = L.cx - w / 2, y0 = L.cy - L.R * P.altura * 1.35;
    x0 = Math.max(0, x0); y0 = Math.max(0, y0);
    w = Math.min(foto.width - x0, w); hgt = Math.min(foto.height - y0, hgt);
    return { x: x0, y: y0, w, h: hgt };
  }
  // Linhas de Loomis em SVG, no sistema de coordenadas do recorte
  function linhasSvg(L, rec, W, H, op = {}) {
    const k = W / rec.w, partes = Cabeca.projetar(L.g, L.a, L.r, L.P);
    const lw = (op.lw || 2.2) / k;
    const css = `.l{fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-width:${lw.toFixed(2)}}.az .l{stroke:${AZUL}}.vm .l{stroke:${VERMELHO}}.l.g{display:none}.l.plano{stroke:${AZUL};stroke-width:${(lw * 0.8).toFixed(2)}}`;
    const az = Cabeca.svg(partes, op.azul || ['esfera', 'sobrancelha', 'lateral', 'tercos', 'mandibula'], L.cx, L.cy, L.R, { ocultas: false });
    const vm = Cabeca.svg(partes, op.vermelho || ['central', 'linhaOlhos'], L.cx, L.cy, L.R, { ocultas: false });
    const tr = op.tracos ? Cabeca.svg(partes, ['tracos', 'orelhas'], L.cx, L.cy, L.R, { ocultas: false }) : '';
    const pl = op.planos ? Cabeca.planosSvg(partes, L.cx, L.cy, L.R, { modo: op.planos, opac: op.opacPlanos, traco: lw * 0.7 }) : '';
    const tremido = `transform="translate(${(0.9 / k).toFixed(2)} ${(0.6 / k).toFixed(2)})" opacity=".45"`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${rec.x} ${rec.y} ${rec.w} ${rec.h}" width="${W}" height="${H}" preserveAspectRatio="none"><style>${css}</style>${pl}` +
      `<g class="az">${az}</g><g class="az" ${tremido}>${az}</g><g class="vm">${vm}</g><g class="vm" ${tremido}>${vm}</g><g class="vm">${tr}</g></svg>`;
  }
  // Cabeça de Loomis isolada numa caixa
  function cabecaSvg(W, H, pose, P, op = {}) {
    const [g, a, r] = pose, partes = Cabeca.projetar(g, a, r, P);
    const R = Math.min(W / 2.6, H / 3.4), cx = W / 2 + (Math.abs(g) > 60 ? Math.sign(-g) * R * 0.15 : 0), cy = H * 0.37;
    const css = `.l{fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-width:${op.lw || 1.8}}.az .l{stroke:${AZUL}}.vm .l{stroke:${VERMELHO}}.l.g{display:none}.tr .l{stroke:${TINTA};stroke-width:${(op.lw || 1.8) * 0.8}}.l.plano{stroke:${AZUL}}`;
    const pl = op.planos ? Cabeca.planosSvg(partes, cx, cy, R, { modo: op.planos, opac: 0.5, traco: 1 }) : '';
    const esfera = op.esferaCheia ? `<ellipse cx="${cx}" cy="${cy}" rx="${R * (P && P.largura || 1)}" ry="${R * (P && P.altura || 1)}" fill="${op.esferaCheia}"/>` : '';
    return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><style>${css}</style>${esfera}${pl}` +
      `<g class="az">${Cabeca.svg(partes, op.azul || ['esfera', 'sobrancelha', 'lateral', 'tercos', 'mandibula'], cx, cy, R, { ocultas: false })}</g>` +
      `<g class="vm">${Cabeca.svg(partes, op.vermelho || ['central', 'linhaOlhos'], cx, cy, R, { ocultas: false })}</g>` +
      (op.tracos ? `<g class="tr">${Cabeca.svg(partes, ['tracos', 'orelhas'], cx, cy, R, { ocultas: false })}</g>` : '') + '</svg>', partes, cx, cy, R };
  }
  // desenha uma imagem (canvas) dentro da caixa, centralizada
  function encaixar(x, img, X, Y, W, H) {
    const k = Math.min(W / img.width, H / img.height), w = img.width * k, hh = img.height * k;
    x.drawImage(img, X + (W - w) / 2, Y + (H - hh) / 2, w, hh);
    return { x: X + (W - w) / 2, y: Y + (H - hh) / 2, k };
  }
  // posições (no recorte) das linhas de referência do rosto
  function marcosNoRecorte(L, rec, W) {
    const k = W / rec.w, m = Cabeca.marcos(Cabeca.projetar(L.g, L.a, L.r, L.P), L.cx, L.cy, L.R), out = {};
    for (const [n, [x, y]] of Object.entries(m)) out[n] = [(x - rec.x) * k, (y - rec.y) * k];
    return out;
  }

  // ---------------- as três folhas ----------------
  async function gerar(foto, L, progresso = () => {}) {
    const rec = recorte(foto, L);
    const corte = tela(rec.w, rec.h); corte.getContext('2d').drawImage(foto, rec.x, rec.y, rec.w, rec.h, 0, 0, rec.w, rec.h);
    // tamanho de trabalho do retrato (lado maior ~ 1000 px)
    const kT = 1000 / Math.max(rec.w, rec.h), TW = Math.round(rec.w * kT), TH = Math.round(rec.h * kT);
    progresso('Desenhando o retrato a lápis...');
    await pausa();
    const final = lapis(corte, TW, TH);
    progresso('Preparando as etapas...');
    await pausa();
    const esboco = lapis(corte, TW, TH, { hachura: false, suave: 0.12, contorno: 0.8 });
    const meio = lapis(corte, TW, TH, { suave: 0.3, contorno: 0.9, gama: 1.3 });
    const valores = tresValores(corte, TW, TH);
    const fotoPeq = tela(TW, TH); fotoPeq.getContext('2d').drawImage(corte, 0, 0, TW, TH);
    // camadas de linhas sobre o recorte
    const linhas = async (op) => svgImg(linhasSvg(L, rec, TW, TH, op));
    const camadas = {
      construcao: await linhas({}),
      feicoes: await linhas({ tracos: true }),
      blocos: await linhas({ planos: 'linhas', tracos: true }),
      leves: await linhas({ lw: 1.4 }),
      cores: await linhas({ planos: 'cores', opacPlanos: 0.42, azul: ['esfera'], vermelho: ['central'] })
    };
    const comp = (...imgs) => { const c = tela(TW, TH), x = c.getContext('2d'); for (const [img, a = 1, modo] of imgs) { x.globalAlpha = a; x.globalCompositeOperation = modo || 'source-over'; x.drawImage(img, 0, 0, TW, TH); } return c; };
    const etapas = {
      e1: comp([papel(TW, TH)], [camadas.construcao]),
      e2: comp([papel(TW, TH)], [esboco, 0.35, 'multiply'], [camadas.feicoes]),
      e3: comp([papel(TW, TH)], [esboco, 0.55, 'multiply'], [camadas.blocos, 0.9]),
      e4: comp([papel(TW, TH)], [esboco, 0.95, 'multiply'], [camadas.leves, 0.55]),
      e5: comp([meio], [camadas.leves, 0.3])
    };
    const marcos = marcosNoRecorte(L, rec, TW);
    progresso('Montando as folhas...');
    await pausa();
    const f1 = await folhaConstrucao({ fotoPeq, final, etapas, L });
    const f2 = await folhaProporcoes({ final, esboco, marcos, L, TW, TH });
    const f3 = await folhaPlanos({ valores, fotoPeq, esboco, camadas, marcos, L, TW, TH });
    return [
      { titulo: 'Construção passo a passo', tela: f1 },
      { titulo: 'Proporções e medidas', tela: f2 },
      { titulo: 'Planos, luz e sombra', tela: f3 }
    ];
  }
  const pausa = () => new Promise((r) => setTimeout(r, 30));
  function folhaBase(titulo) {
    const c = papel(FOLHA[0], FOLHA[1]), x = c.getContext('2d');
    texto(x, titulo, 60, 70, { tam: 40, peso: 700 });
    texto(x, 'Aprender a Ver', FOLHA[0] - 60, 70, { tam: 24, alinha: 'right', cor: '#8a8178' });
    return { c, x };
  }
  function moldura(x, X, Y, W, H) { x.save(); x.strokeStyle = 'rgba(43,38,34,.18)'; x.lineWidth = 1.5; x.strokeRect(X, Y, W, H); x.restore(); }

  async function folhaConstrucao({ fotoPeq, final, etapas, L }) {
    const { c, x } = folhaBase('Retrato pelo método de Loomis');
    // linha 1: referência e etapas 1 a 3
    const y1 = 130, hP = 470, wRef = 300;
    encaixar(x, fotoPeq, 60, y1, wRef, hP - 70); moldura(x, 60, y1, wRef, hP - 70);
    texto(x, 'Referência', 60, y1 + hP - 40, { tam: 22, cor: '#6b625a' });
    const wE = (FOLHA[0] - 120 - wRef - 60) / 3;
    const pos = [[60 + wRef + 30, '1', 'Construção da cabeça', etapas.e1], [60 + wRef + 30 + wE + 15, '2', 'Planos e feições', etapas.e2], [60 + wRef + 30 + 2 * (wE + 15), '3', 'Blocos das formas', etapas.e3]];
    for (const [X, n, t, img] of pos) { tituloPainel(x, n, t, X, y1 + 10); encaixar(x, img, X, y1 + 30, wE, hP - 40); }
    const lista = ['• Esfera', '• Linha central', '• Linha dos olhos', '• Plano da mandíbula'];
    lista.forEach((t, i) => texto(x, t, pos[0][0] + wE - 175, y1 + hP - 110 + i * 26, { tam: 20 }));
    // linha 2: etapas 4 e 5 e o retrato final
    const y2 = y1 + hP + 50, wE2 = 400, hE2 = 520;
    tituloPainel(x, '4', 'Refinar as feições', 60, y2); encaixar(x, etapas.e4, 60, y2 + 20, wE2, hE2);
    tituloPainel(x, '5', 'Sombrear', 60 + wE2 + 30, y2); encaixar(x, etapas.e5, 60 + wE2 + 30, y2 + 20, wE2, hE2);
    const XF = 60 + 2 * (wE2 + 30), WF = FOLHA[0] - 60 - XF, HF = 1000;
    encaixar(x, final, XF, y2 - 10, WF, HF);
    // proporções e ângulo
    const y3 = y2 + hE2 + 70, wQ = 400, hQ = 400;
    tituloPainel(x, '', 'Proporções (vista de frente)', 60, y3);
    const frente = cabecaSvg(wQ, hQ, [0, 0, 0], L.P, { tracos: true, vermelho: ['central', 'linhaOlhos'] });
    x.drawImage(await svgImg(frente.svg), 60, y3 + 20);
    const mf = Cabeca.marcos(frente.partes, frente.cx, frente.cy, frente.R);
    const xr = 60 + frente.cx + frente.R * 1.15;
    const ys = [mf.cabelo[1], mf.sobrancelha[1], mf.narizBase[1], mf.queixo[1]].map((v) => v + y3 + 20);
    for (let i = 0; i < 3; i++) { cota(x, xr + 18, ys[i], xr + 18, ys[i + 1], '1/3', { cor: TINTA, lw: 1.5, seta: 7, tam: 20 }); }
    texto(x, 'Linha dos olhos', 60, mf.pupilaE[1] + y3 + 20 - 8, { tam: 16, cor: VERMELHO });
    tituloPainel(x, '', 'Ângulo e inclinação', 60 + wQ + 30, y3);
    const angulo = cabecaSvg(wQ, hQ, [L.g, L.a, L.r], L.P, { planos: 'linhas', tracos: true });
    x.drawImage(await svgImg(angulo.svg), 60 + wQ + 30, y3 + 20);
    texto(x, 'Mesmo ângulo e pose da foto', 60 + wQ + 30 + wQ / 2, y3 + hQ + 10, { tam: 18, alinha: 'center', cor: '#6b625a' });
    // cabeça em formas simples e planos simplificados
    const y4 = y3 + hQ + 60, n = 4, wC = (FOLHA[0] - 120 - (n - 1) * 20) / n, hC = 230;
    const poses = [[[0, 0, 0], 'Frente'], [[-90, 0, 0], 'Perfil'], [[-35, 6, 0], 'Três quartos'], [[L.g, L.a, L.r], 'Mesmo ângulo']];
    tituloPainel(x, '', 'Cabeça em formas simples', 60, y4);
    for (let i = 0; i < n; i++) { const cs = cabecaSvg(wC, hC, poses[i][0], L.P, { tracos: i === 3 }); x.drawImage(await svgImg(cs.svg), 60 + i * (wC + 20), y4 + 10); }
    const y5 = y4 + hC + 45;
    tituloPainel(x, '', 'Planos simplificados (mesmos ângulos)', 60, y5);
    for (let i = 0; i < n; i++) {
      const cs = cabecaSvg(wC, hC, poses[i][0], L.P, { planos: 'luz', esferaCheia: '#e2dbcf', azul: ['esfera', 'sobrancelha'], vermelho: ['central'] });
      x.drawImage(await svgImg(cs.svg), 60 + i * (wC + 20), y5 + 10);
      texto(x, poses[i][1], 60 + i * (wC + 20) + wC / 2, y5 + hC + 32, { tam: 20, alinha: 'center' });
    }
    return c;
  }

  async function folhaProporcoes({ final, esboco, marcos: m, L, TW, TH }) {
    const { c, x } = folhaBase('Proporções e medidas do rosto');
    // painel 1: terços com faixas vermelhas
    const X1 = 60, Y1 = 120, W1 = 760, H1 = 1000;
    const p1 = encaixar(x, final, X1 + 90, Y1, W1 - 90, H1);
    const P = (n) => [p1.x + m[n][0] * p1.k, p1.y + m[n][1] * p1.k];
    const faixa = (y, rot) => {
      x.save(); x.strokeStyle = VERMELHO; x.lineCap = 'round';
      for (let i = 0; i < 3; i++) { x.globalAlpha = 0.55 + i * 0.12; x.lineWidth = 7 - i * 2; x.beginPath(); x.moveTo(X1 + 10, y + i - 1); x.lineTo(P('cranioD')[0] + 20, y + (i - 1) * 1.5); x.stroke(); }
      x.restore();
      if (rot) texto(x, rot, X1 + 10, y - 12, { tam: 20, cor: TINTA });
    };
    const yC = P('cabelo')[1], yS = P('sobrancelha')[1], yN = P('narizBase')[1], yQ = P('queixo')[1];
    faixa(yC); faixa(yS, 'Sobrancelha'); faixa(yN, 'Nariz'); faixa(yQ, 'Queixo');
    for (const [a, b] of [[yC, yS], [yS, yN], [yN, yQ]]) texto(x, '1/3', X1 + 40, (a + b) / 2 + 12, { tam: 34, cor: VERMELHO, peso: 700, alinha: 'center' });
    const yO = (P('pupilaE')[1] + P('pupilaD')[1]) / 2;
    x.save(); x.strokeStyle = AZUL; x.lineWidth = 1.5; x.setLineDash([8, 6]); x.beginPath(); x.moveTo(X1 + 80, yO); x.lineTo(p1.x + TW * p1.k, yO); x.stroke(); x.restore();
    texto(x, 'Linha dos olhos', X1 + 10, yO - 8, { tam: 18, cor: AZUL });

    // painel 2: cotas
    const X2 = 860, Y2 = 140, W2 = FOLHA[0] - 60 - X2, H2 = 980;
    const ge = cinza(esboco), tinta = tela(TW, TH), tix = tinta.getContext('2d');
    tix.fillStyle = '#3d6fc0'; tix.fillRect(0, 0, TW, TH); tix.globalCompositeOperation = 'destination-in';
    tix.drawImage(mascara(TW, TH, (i) => Math.min(1, Math.max(0, (0.93 - ge[i]) * 1.6))), 0, 0);
    const az = papel(TW, TH); az.getContext('2d').drawImage(tinta, 0, 0);
    x.globalAlpha = 0.85; const p2 = encaixar(x, az, X2 + 110, Y2 + 70, W2 - 230, H2 - 120); x.globalAlpha = 1;
    const Q = (n) => [p2.x + m[n][0] * p2.k, p2.y + m[n][1] * p2.k];
    const op = { tam: 17, seta: 7, lw: 1.6 };
    const topo = Q('topo')[1], esq = X2 + 95, dir = X2 + W2 - 100;
    // larguras dos olhos (em cima)
    const yt = Y2 + 45;
    const oE = [Q('olhoExtE')[0], Q('olhoIntE')[0]].sort((a, b) => a - b), oD = [Q('olhoIntD')[0], Q('olhoExtD')[0]].sort((a, b) => a - b);
    cota(x, oE[0], yt, oE[1], yt, 'olho', op); cota(x, oE[1], yt, oD[0], yt, 'olho', op); cota(x, oD[0], yt, oD[1], yt, 'olho', op);
    x.save(); x.strokeStyle = AZUL; x.globalAlpha = 0.5; x.lineWidth = 1; x.beginPath(); for (const v of [...oE, ...oD]) { x.moveTo(v, yt); x.lineTo(v, Q('pupilaE')[1]); } x.stroke(); x.restore();
    // larguras horizontais
    cota(x, Q('cranioE')[0], Q('cabelo')[1] + 40, Q('cranioD')[0], Q('cabelo')[1] + 40, 'largura do crânio', op);
    cota(x, Q('rostoE')[0], Q('pupilaE')[1] + 45, Q('rostoD')[0], Q('pupilaD')[1] + 45, 'largura do rosto', op);
    cota(x, Q('narizE')[0], Q('narizBase')[1] + 16, Q('narizD')[0], Q('narizBase')[1] + 16, 'nariz', { ...op, tam: 15 });
    cota(x, Q('bocaE')[0], Q('boca')[1] + 26, Q('bocaD')[0], Q('boca')[1] + 26, 'boca', { ...op, tam: 15 });
    cota(x, Q('pescocoE')[0], Q('pescocoE')[1], Q('pescocoD')[0], Q('pescocoD')[1], 'pescoço', op);
    // alturas (esquerda)
    const pares = [['topo', 'cabelo', 'topo à linha\ndo cabelo'], ['cabelo', 'sobrancelha', 'testa'], ['sobrancelha', 'narizBase', 'nariz\n(altura)'], ['narizBase', 'boca', 'nariz à\nboca'], ['boca', 'queixo', 'boca ao\nqueixo']];
    for (const [a, b, t] of pares) cota(x, esq, Q(a)[1], esq, Q(b)[1], t, { ...op, lado: 'esq' });
    // alturas (direita)
    const yp = (Q('pupilaE')[1] + Q('pupilaD')[1]) / 2;
    cota(x, dir, topo, dir, Q('queixo')[1], 'altura\nda cabeça', op);
    cota(x, dir - 40, topo, dir - 40, yp, 'pupila\nao topo', { ...op, tam: 15 });
    cota(x, dir - 40, yp, dir - 40, Q('queixo')[1], 'queixo à\npupila', { ...op, tam: 15 });
    x.save(); x.strokeStyle = AZUL; x.globalAlpha = 0.45; x.lineWidth = 1; x.beginPath();
    for (const n of ['topo', 'cabelo', 'sobrancelha', 'narizBase', 'boca', 'queixo']) { x.moveTo(esq, Q(n)[1]); x.lineTo(dir, Q(n)[1]); }
    x.stroke(); x.restore();

    // regras e cabeças de referência
    const Y3 = 1190;
    tituloPainel(x, '', 'Regras para conferir', 60, Y3);
    const regras = [
      'A cabeça de frente cabe em 3 por 3,5 unidades.',
      'Do cabelo à sobrancelha, da sobrancelha ao nariz e do nariz ao queixo: três partes iguais.',
      'Os olhos ficam na metade da altura da cabeça.',
      'O rosto tem cerca de cinco larguras de olho; entre os olhos cabe um olho.',
      'A largura do nariz é a distância entre os cantos de dentro dos olhos.',
      'Os cantos da boca ficam abaixo das pupilas.',
      'A orelha vai da linha da sobrancelha até a base do nariz.',
      'O pescoço é quase tão largo quanto a mandíbula na altura das orelhas.'
    ];
    regras.forEach((t, i) => texto(x, '• ' + t, 70, Y3 + 50 + i * 38, { tam: 23 }));
    texto(x, 'As cotas seguem a construção encaixada na foto: confira cada uma medindo a própria foto com o lápis.', 70, Y3 + 50 + regras.length * 38 + 20, { tam: 19, cor: '#6b625a' });
    const Y4 = 1700, wC = 360, hC = 520;
    const tipos = [[[0, 0, 0], 'Vista de frente'], [[-90, 0, 0], 'Perfil'], [[0, 30, 0], 'Vista de baixo'], [[0, -28, 0], 'Vista de cima']];
    for (let i = 0; i < tipos.length; i++) {
      const X = 60 + i * (wC + 32);
      const cs = cabecaSvg(wC, hC, tipos[i][0], L.P, { tracos: true });
      x.drawImage(await svgImg(cs.svg), X, Y4);
      texto(x, tipos[i][1], X + wC / 2, Y4 + hC + 30, { tam: 22, alinha: 'center' });
      if (i < 2) {
        const mm = Cabeca.marcos(cs.partes, cs.cx, cs.cy, cs.R), xr = X + cs.cx + cs.R * 1.12;
        for (const [a, b] of [['cabelo', 'sobrancelha'], ['sobrancelha', 'narizBase'], ['narizBase', 'queixo']]) cota(x, xr, Y4 + mm[a][1], xr, Y4 + mm[b][1], '1/3', { cor: TINTA, tam: 16, seta: 6, lw: 1.2 });
      }
    }
    return c;
  }

  async function folhaPlanos({ valores, fotoPeq, esboco, camadas, marcos: m, L, TW, TH }) {
    const { c, x } = folhaBase('Planos da cabeça, luz e sombra');
    // roda de ângulos com planos sombreados
    const cx = FOLHA[0] / 2, cy = 680, raio = 540, raioY = 520, wC = 230, hC = 270;
    x.save(); x.strokeStyle = 'rgba(43,38,34,.2)'; x.lineWidth = 1.5; x.beginPath(); x.ellipse(cx, cy, raio, raioY, 0, 0, Math.PI * 2); x.stroke(); x.restore();
    const roda = [
      [[0, -55, 0], 'De cima', 0, -1], [[30, -32, 0], 'Cima e direita', 0.62, -0.78], [[60, -18, 0], '3/4 direita (cima)', 0.95, -0.35],
      [[88, 0, 0], 'Perfil direito', 1, 0.08], [[55, 22, 0], '3/4 direita (baixo)', 0.88, 0.5], [[25, 38, 0], 'Baixo e direita', 0.5, 0.86],
      [[0, 55, 0], 'De baixo', 0, 1], [[-25, 38, 0], 'Baixo e esquerda', -0.5, 0.86], [[-55, 22, 0], '3/4 esquerda (baixo)', -0.88, 0.5],
      [[-88, 0, 0], 'Perfil esquerdo', -1, 0.08], [[-60, -18, 0], '3/4 esquerda (cima)', -0.95, -0.35], [[-30, -32, 0], 'Cima e esquerda', -0.62, -0.78]
    ];
    const desenharCab = async (pose, X, Y, w, hh) => { const cs = cabecaSvg(w, hh, pose, L.P, { planos: 'luz', esferaCheia: '#ddd5c8', azul: ['esfera', 'sobrancelha', 'lateral'], vermelho: ['central'], lw: 1.4 }); x.drawImage(await svgImg(cs.svg), X, Y); };
    await desenharCab([0, 0, 0], cx - wC * 0.6, cy - hC * 0.55, wC * 1.2, hC * 1.2);
    texto(x, 'Frente', cx, cy + hC * 0.62, { tam: 22, alinha: 'center', peso: 700 });
    for (const [pose, rot, dx, dy] of roda) {
      const X = cx + dx * raio - wC / 2, Y = cy + dy * raioY - hC / 2;
      await desenharCab(pose, X, Y, wC, hC);
      const linhasRot = rot.replace(' (', '\n(').split('\n');
      if (Math.abs(dx) > 0.7) {
        // nas laterais o nome fica para fora da roda, ao lado da cabeça
        linhasRot.forEach((l, i) => texto(x, l, dx < 0 ? X + 8 : X + wC - 8, Y + hC * 0.42 + i * 22, { tam: 18, alinha: dx < 0 ? 'right' : 'left' }));
      } else texto(x, rot, X + wC / 2, Y + hC + 14, { tam: 18, alinha: 'center' });
    }
    texto(x, 'Observe. Simplifique. Construa qualquer cabeça.', 60, 1400, { tam: 24, cor: '#6b625a' });

    // linha de baixo: luz e sombra, planos da estrutura, proporções e marcos
    const Y = 1470, w = (FOLHA[0] - 120 - 2 * 30) / 3, hh = 820;
    tituloPainel(x, '', 'Luz e sombra simplificadas', 60, Y);
    const p1 = encaixar(x, valores.tela, 60, Y + 30, w - 110, hh - 120);
    // aponta um ponto de cada valor dentro do rosto
    const rotulos = ['Sombra', 'Meio-tom', 'Luz'], achados = [null, null, null];
    const cxF = (m.pupilaE[0] + m.pupilaD[0]) / 2, cyF = (m.sobrancelha[1] + m.queixo[1]) / 2, rx = Math.abs(m.rostoD[0] - m.rostoE[0]) / 2, ry = Math.abs(m.queixo[1] - m.cabelo[1]) / 2;
    for (let t = 0; t < 400 && achados.some((v) => !v); t++) {
      const ang = t * 2.399, rr = Math.sqrt(t / 400);
      const px = Math.round(cxF + Math.cos(ang) * rx * rr * 1.1), py = Math.round(cyF + Math.sin(ang) * ry * rr);
      if (px < 0 || py < 0 || px >= TW || py >= TH) continue;
      const k = valores.classe[py * TW + px];
      if (!achados[k]) achados[k] = [px, py];
    }
    const ordem = [0, 1, 2].filter((i) => achados[i]).sort((a, b) => achados[a][1] - achados[b][1]);
    ordem.forEach((i, pos) => {
      const pt = achados[i];
      const X = p1.x + pt[0] * p1.k, Yp = p1.y + pt[1] * p1.k, Xt = 60 + w - 100, Yt = Y + 140 + pos * 90;
      x.save(); x.strokeStyle = VERMELHO; x.lineWidth = 2; x.beginPath(); x.moveTo(X, Yp); x.lineTo(Xt - 6, Yt - 7); x.stroke(); x.fillStyle = VERMELHO; x.beginPath(); x.arc(X, Yp, 6, 0, 7); x.fill(); x.restore();
      texto(x, rotulos[i], Xt, Yt, { tam: 22, peso: 700 });
    });
    const X2 = 60 + w + 30;
    tituloPainel(x, '', 'Planos da estrutura', X2, Y);
    const est = tela(TW, TH), ex = est.getContext('2d'); ex.drawImage(esboco, 0, 0); ex.globalAlpha = 1; ex.drawImage(camadas.cores, 0, 0);
    encaixar(x, est, X2, Y + 30, w, hh - 250);
    const legenda = [['#e0705c', 'Testa, nariz, boca, órbitas'], ['#6f98d6', 'Sobrancelha, maçãs, queixo'], ['#e0705c', 'Bochechas e lateral da mandíbula'], ['#6f98d6', 'Têmporas e mandíbula']];
    legenda.forEach(([cor, t], i) => { const Yl = Y + hh - 190 + i * 36; x.fillStyle = cor; x.beginPath(); x.arc(X2 + 14, Yl - 7, 10, 0, 7); x.fill(); texto(x, t, X2 + 34, Yl, { tam: 19 }); });
    const X3 = X2 + w + 30;
    tituloPainel(x, '', 'Proporções e marcos', X3, Y);
    const p3 = encaixar(x, esboco, X3, Y + 30, w - 110, hh - 120);
    const R3 = (n) => p3.y + m[n][1] * p3.k;
    const marcosLinhas = [['cabelo', 'Linha do cabelo'], ['sobrancelha', 'Sobrancelha'], ['pupilaE', 'Olhos'], ['narizBase', 'Nariz'], ['boca', 'Boca'], ['queixo', 'Queixo']];
    for (const [n, t] of marcosLinhas) {
      const yy = R3(n);
      x.save(); x.strokeStyle = n === 'pupilaE' ? VERMELHO : AZUL; x.lineWidth = 1.5; x.beginPath(); x.moveTo(p3.x, yy); x.lineTo(X3 + w - 100, yy); x.stroke(); x.restore();
      texto(x, t, X3 + w - 95, yy + 7, { tam: 18 });
    }
    const xc = p3.x + ((m.pupilaE[0] + m.pupilaD[0]) / 2) * p3.k;
    x.save(); x.strokeStyle = VERMELHO; x.lineWidth = 1.5; x.beginPath(); x.moveTo(xc, R3('topo')); x.lineTo(xc, R3('queixo')); x.stroke(); x.restore();
    return c;
  }

  // ---------------- tela ----------------
  let folhas = null;
  async function mostrar(raiz, { foto, L, voltar }) {
    raiz.innerHTML = '';
    const estado = h('p', { class: 'carregando' }, 'Gerando as folhas de estudo...');
    raiz.append(estado);
    try {
      folhas = await gerar(foto, L, (t) => { estado.textContent = t; });
    } catch (e) {
      console.error(e);
      raiz.innerHTML = '';
      raiz.append(h('p', { class: 'nota' }, 'Não foi possível gerar as folhas neste aparelho.'), h('button', { class: 'btn', onclick: voltar }, 'Voltar'));
      return;
    }
    let atual = 0;
    const img = h('img', { class: 'folha-estudo', alt: '' });
    const seg = h('div', { class: 'segmentado largo' });
    const trocar = (i) => { atual = i; img.src = folhas[i].tela.toDataURL('image/jpeg', 0.9); img.alt = folhas[i].titulo; U.$$('.seg', seg).forEach((b, k) => b.classList.toggle('ativo', k === i)); };
    folhas.forEach((f, i) => seg.append(h('button', { class: 'seg', onclick: () => trocar(i) }, `${i + 1}. ${f.titulo}`)));
    raiz.innerHTML = '';
    raiz.append(
      h('div', { class: 'cartao' }, h('h2', {}, 'Folhas de estudo'),
        h('p', { class: 'nota' }, 'Três pranchas feitas a partir da sua foto e da construção encaixada. Toque na imagem para ampliar. Use-as como referência na prancheta ou imprima em A4.')),
      seg,
      h('div', { class: 'cartao papel folha-moldura', onclick: () => { const w = window.open(); if (w) { w.document.write(`<img src="${img.src}" style="width:100%">`); } } }, img),
      h('div', { class: 'linha-botoes' },
        h('button', { class: 'btn primario', onclick: () => App.abrirPrancheta({ titulo: folhas[atual].titulo, origem: 'estudo', referencia: folhas[atual].tela.toDataURL('image/jpeg', 0.9), layout: 'lado', aspecto: FOLHA[0] / FOLHA[1] }) }, 'Praticar com esta folha'),
        h('button', { class: 'btn', onclick: async () => U.baixar(await U.canvasParaBlob(folhas[atual].tela, 'image/jpeg', 0.92), `folha-de-estudo-${atual + 1}.jpg`) }, 'Baixar esta folha'),
        h('button', { class: 'btn', onclick: salvarTodas }, 'Salvar no meu progresso'),
        h('button', { class: 'btn', onclick: imprimir }, 'Imprimir as três'),
        h('button', { class: 'btn', onclick: voltar }, 'Ajustar o encaixe')));
    trocar(0);
  }
  async function salvarTodas() {
    try {
      for (const [i, f] of folhas.entries()) {
        await U.desenhos.salvar({ id: Date.now().toString(36) + i + Math.random().toString(36).slice(2, 5), criadoEm: new Date().toISOString(), origem: 'estudo', titulo: 'Folha de estudo: ' + f.titulo, duracao: 0, png: await U.canvasParaBlob(f.tela, 'image/jpeg', 0.9) });
      }
      U.aviso('As três folhas foram salvas no seu progresso.');
    } catch (e) { U.aviso('Não foi possível salvar. Use "Baixar esta folha".'); }
  }
  function imprimir() {
    const area = h('div', { class: 'area-impressao' });
    for (const f of folhas) area.append(h('div', { class: 'pagina-impressao' }, h('img', { src: f.tela.toDataURL('image/jpeg', 0.92), style: { width: '19cm' }, alt: '' })));
    document.body.append(area); document.body.classList.add('imprimindo');
    const limpar = () => { area.remove(); document.body.classList.remove('imprimindo'); };
    window.addEventListener('afterprint', limpar, { once: true });
    setTimeout(() => { try { window.print(); } catch (e) { U.aviso('A impressão não está disponível aqui. Baixe as folhas e imprima pelo aparelho.'); } setTimeout(limpar, 1500); }, 300);
  }

  return { mostrar, gerar };
})();
