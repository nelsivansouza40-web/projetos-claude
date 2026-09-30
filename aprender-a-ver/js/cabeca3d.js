/*
 * Cabeça de estudo pelo método de Andrew Loomis ("Drawing the Head and
 * Hands"): uma bola achatada dos lados, a cruz formada pela linha da
 * sobrancelha e pela linha central, e o rosto dividido em três partes
 * iguais (cabelo-sobrancelha, sobrancelha-base do nariz, base do nariz-queixo).
 *
 * Proporções conferidas com o método de Loomis e com as folhas de
 * construção usadas como referência: raio da bola = 1; cada terço do
 * rosto vale u = 0,75 (a fatia lateral vai da linha do cabelo à base do
 * nariz); o queixo fica 2u abaixo da linha da sobrancelha.
 *
 * Eixos: x para a direita, y para baixo, z na direção de quem olha.
 */
const Cabeca = (() => {
  const u = 0.75;
  const LADO = Math.sqrt(1 - u * u); // distância do corte lateral ao centro (0,661)
  const QUEIXO = 2 * u;
  const RAD = Math.PI / 180;

  function girar(p, g) {
    let [x, y, z] = p;
    // guinada (virar para os lados) em torno de y
    let x1 = x * g.cy + z * g.sy, z1 = -x * g.sy + z * g.cy;
    // arfagem (olhar para cima/baixo) em torno de x
    let y1 = y * g.cp - z1 * g.sp, z2 = y * g.sp + z1 * g.cp;
    // largura e altura livres (modo personalizado), antes da inclinação
    if (g.lx) { x1 *= g.lx; y1 *= g.ly; }
    // inclinação lateral em torno do eixo de visão
    const x2 = x1 * g.cr - y1 * g.sr, y2 = x1 * g.sr + y1 * g.cr;
    return [x2, y2, z2];
  }
  const norm = (v) => { const m = Math.hypot(...v) || 1; return v.map((c) => c / m); };
  const amostrar = (a0, a1, n, f) => Array.from({ length: n + 1 }, (_, i) => f(a0 + (a1 - a0) * i / n));

  // Curva suave (Catmull-Rom) passando pelos pontos de controle
  function suave(pts, n = 8) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        out.push([0, 1, 2].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  // Ponto sobre a superfície do rosto (a bola, um pouco achatada na frente)
  const frente = (x, y, k = 0.97) => [x, y, Math.sqrt(Math.max(0.05, 1 - x * x - y * y)) * k];
  // Profundidade da parte de baixo do rosto (o "focinho" arredondado)
  const focinho = (x, y) => 0.97 - 1.3 * x * x - 0.15 * Math.max(0, y - 1.08);

  // Curvas do modelo. vis: 'esfera' (visível se o ponto está na metade da frente),
  // 'aro' (borda do corte lateral), ou um vetor normal fixo com limite.
  function curvas() {
    const C = [];
    // def: como a curva se ajusta às proporções de cada tipo de rosto
    let def = null;
    const add = (grupo, pts, vis, extra = {}) => C.push(typeof vis === 'object' ? { grupo, pts, def, ...vis } : { grupo, pts, vis, def, ...extra });

    // Linha central: grande círculo vertical + descida pelo rosto até o queixo
    add('central', amostrar(-Math.PI, Math.PI, 120, (a) => [0, Math.sin(a), Math.cos(a)]), 'esfera');
    def = { tipo: 'rosto' };
    // descida da linha central pelo plano do rosto até o queixo
    add('central', suave([[0, u, LADO + 0.25], [0, 0.95, 0.96], [0, 1.2, 0.93], [0, 1.4, 0.88], [0, QUEIXO, 0.84]], 6), { n: [0, 0.1, 1], lim: -0.55 });
    def = null;
    // Linha da sobrancelha (equador)
    add('sobrancelha', amostrar(0, 2 * Math.PI, 120, (a) => [Math.cos(a), 0, Math.sin(a)]), 'esfera');
    // Cortes laterais (círculos) e a cruz de cada lado
    for (const s of [1, -1]) {
      add('lateral', amostrar(0, 2 * Math.PI, 72, (a) => [s * LADO, u * Math.sin(a), u * Math.cos(a)]), 'aro', { lado: s });
      add('lateral', [[s * LADO, -u, 0], [s * LADO, u, 0]], { n: [s, 0, 0], lim: 0 });
      add('lateral', [[s * LADO, 0, -u], [s * LADO, 0, u]], { n: [s, 0, 0], lim: 0 });
    }
    // Linha do cabelo e linha da base do nariz: arcos da frente, de um corte ao outro
    add('tercos', arcoFrente(-u), 'esfera', { def: { tipo: 'arco', ref: 'cabelo' } });
    add('tercos', arcoFrente(u), 'esfera', { def: { tipo: 'arco', ref: 'nariz' } });
    // Linha do queixo: um traço curto e reto
    def = { tipo: 'rosto', mand: true };
    add('tercos', suave([[-0.17, QUEIXO - 0.01, 0.78], [0, QUEIXO, 0.84], [0.17, QUEIXO - 0.01, 0.78]], 6), { n: [0, 0.4, 1], lim: -0.35 });
    // Linha dos olhos: logo abaixo da sobrancelha, atravessando o rosto
    add('linhaOlhos', arcoFrente(0.3), 'esfera', { def: { tipo: 'arco', ref: 'olhos' } });

    for (const s of [1, -1]) {
      def = { tipo: 'rosto', mand: true };
      // Mandíbula: do corte lateral, sob a orelha, até o canto do queixo
      add('mandibula', suave([[s * LADO, 0.5, -0.36], [s * 0.64, 0.95, -0.28], [s * 0.6, 1.12, -0.05], [s * 0.45, 1.33, 0.42], [s * 0.17, QUEIXO - 0.01, 0.78]]), { n: [s * 0.9, 0.35, 0.25], lim: -0.35 });
      // Lado do rosto: da ponta da sobrancelha, pela maçã do rosto, até o queixo
      add('mandibula', suave([[s * LADO, 0, u], [s * 0.66, 0.42, 0.72], [s * 0.58, 0.85, 0.76], [s * 0.42, 1.22, 0.8], [s * 0.17, QUEIXO - 0.01, 0.78]]), { n: [s * 0.55, 0.1, 0.83], lim: -0.12 });
      // Pescoço: sai de trás da mandíbula, quase na vertical
      add('mandibula', suave([[s * 0.52, 1.02, -0.42], [s * 0.5, 1.5, -0.4], [s * 0.54, 2.0, -0.34]], 6), { n: [s, 0, -0.1], lim: -0.3 });

      // Orelha: um "C" no plano lateral, atrás da cruz, entre sobrancelha e nariz
      const xo = s * (LADO + 0.04);
      def = { tipo: 'orelha', c: [xo, 0.375, -0.23] };
      add('orelhas', suave([[xo, 0.04, -0.1], [xo, -0.02, -0.24], [xo + s * 0.02, 0.1, -0.36], [xo + s * 0.03, 0.34, -0.38], [xo + s * 0.02, 0.56, -0.3], [xo, u - 0.02, -0.2], [xo, u + 0.02, -0.12], [xo, u - 0.06, -0.08]]), { n: [s, 0, -0.25], lim: -0.15 });
      add('orelhas', suave([[xo, 0.16, -0.14], [xo + s * 0.01, 0.12, -0.25], [xo + s * 0.01, 0.34, -0.29], [xo, 0.5, -0.2]], 6), { n: [s, 0, -0.25], lim: -0.1 });

      // Olho: amêndoa (pálpebra de cima e de baixo) e íris
      const n0 = norm([s * 0.35, 0.25, 0.9]);
      def = { tipo: 'olho', c: [s * 0.32, 0.245, 0.9] };
      const ci = s * 0.17, ce = s * 0.49, ye = 0.26;
      add('tracos', suave([[ci, ye, 0], [s * 0.25, ye - 0.07, 0], [s * 0.37, ye - 0.075, 0], [ce, ye - 0.015, 0]].map(([x, y]) => frente(x, y)), 6), { n: n0, lim: 0.02 });
      add('tracos', suave([[ci, ye, 0], [s * 0.27, ye + 0.04, 0], [s * 0.39, ye + 0.035, 0], [ce, ye - 0.015, 0]].map(([x, y]) => frente(x, y)), 6), { n: n0, lim: 0.02 });
      add('tracos', amostrar(0, 2 * Math.PI, 18, (a) => frente(s * 0.32 + 0.048 * Math.cos(a), ye - 0.015 + 0.048 * Math.sin(a), 0.975)), { n: n0, lim: 0.08 });
      def = { tipo: 'rosto' };
      // Sobrancelha: começa sobre o canto interno do olho e afina para fora
      add('tracos', suave([[s * 0.15, 0.07, 0], [s * 0.27, 0.02, 0], [s * 0.4, 0.015, 0], [s * 0.5, 0.06, 0]].map(([x, y]) => frente(x, y, 0.985)), 6), { n: norm([s * 0.35, 0, 0.94]), lim: 0 });
      // Asa do nariz: círculo menor de cada lado da bola do nariz
      add('tracos', amostrar(0, 2 * Math.PI, 18, (a) => [s * 0.115 + 0.055 * Math.cos(a), 0.67 + 0.05 * Math.sin(a), 0.98 + s * 0.02 * Math.cos(a)]), { n: norm([s * 0.45, 0.2, 1]), lim: -0.1 });
      // Lateral do nariz: desce do canto do olho até a asa
      add('tracos', suave([[s * 0.07, 0.2, 0.99], [s * 0.075, 0.45, 1.05], [s * 0.1, 0.62, 1.02]], 5), { n: norm([s * 0.3, 0, 1]), lim: -0.2 });
    }
    // Perfil do nariz e dos lábios: só aparece com a cabeça virada
    add('tracos', suave([[0, 0.18, 0.98], [0, 0.45, 1.07], [0, 0.63, 1.2], [0, 0.71, 1.12], [0, 0.765, 0.99]], 5), { vis: 'perfil' });
    add('tracos', suave([[0, 0.9, 0.96], [0, 0.985, 0.975], [0, 1.045, 0.93], [0, 1.12, 0.955], [0, 1.25, 0.86], [0, 1.38, 0.88]], 5), { vis: 'perfil', lim: 0.75 });
    // Nariz: a bola da ponta e a base
    add('tracos', amostrar(0, 2 * Math.PI, 20, (a) => [0.075 * Math.cos(a), 0.64 + 0.07 * Math.sin(a), 1.13]), { n: [0, 0.1, 1], lim: -0.45 });
    add('tracos', suave([[-0.1, 0.73, 0.98], [0, 0.76, 1.02], [0.1, 0.73, 0.98]], 5), { n: [0, 0.4, 1], lim: -0.4 });
    // Boca: lábio de cima com o arco do cupido, linha da boca e lábio de baixo
    const B = (pts) => pts.map(([x, y]) => [x, y, focinho(x, y)]);
    const nB = { n: [0, 0.1, 1], lim: -0.28 };
    add('tracos', suave(B([[-0.21, 1.03], [-0.1, 0.98], [-0.03, 0.965], [0, 0.98], [0.03, 0.965], [0.1, 0.98], [0.21, 1.03]]), 5), nB);
    add('tracos', suave(B([[-0.21, 1.03], [-0.08, 1.035], [0, 1.045], [0.08, 1.035], [0.21, 1.03]]), 5), nB);
    add('tracos', suave(B([[-0.17, 1.06], [-0.09, 1.12], [0, 1.135], [0.09, 1.12], [0.17, 1.06]]), 5), nB);
    return C;
  }
  // Arco da frente da bola numa altura y, limitado pelos cortes laterais
  function arcoFrente(y) {
    const r = Math.sqrt(Math.max(0.0001, 1 - y * y)), a0 = r > LADO ? Math.acos(LADO / r) : 0;
    return amostrar(a0, Math.PI - a0, 48, (a) => [r * Math.cos(a), y, r * Math.sin(a)]);
  }
  const BASE = curvas();

  // Proporções por tipo de rosto (1 = adulto de referência).
  // testa: altura da linha do cabelo; nariz: terço do meio; queixo: terço de baixo;
  // mandibula: largura da parte de baixo; olhos e orelhas: tamanho; largura e altura: forma geral.
  const PADRAO = { testa: 1, nariz: 1, queixo: 1, mandibula: 1, olhos: 1, orelhas: 1, largura: 1, altura: 1 };
  const TIPOS = {
    adulto: { rotulo: 'Adulto', p: {} },
    jovem: { rotulo: 'Jovem', p: { testa: 1.05, nariz: 0.94, queixo: 0.92, mandibula: 0.94, olhos: 1.08, orelhas: 0.95, largura: 0.97 } },
    idoso: { rotulo: 'Idoso', p: { testa: 1.12, nariz: 1.08, queixo: 1.04, mandibula: 1.04, olhos: 0.92, orelhas: 1.22, largura: 1.02 } },
    crianca: { rotulo: 'Criança', p: { testa: 1.25, nariz: 0.74, queixo: 0.7, mandibula: 0.84, olhos: 1.2, orelhas: 0.9, largura: 1.04, altura: 0.96 } }
  };
  const completar = (P) => Object.assign({}, PADRAO, P || {});

  // Aplica as proporções ao modelo base (resultado guardado por combinação)
  const cache = new Map();
  function modelo(P) {
    P = completar(P);
    const chave = ['testa', 'nariz', 'queixo', 'mandibula', 'olhos', 'orelhas'].map((k) => P[k].toFixed(3)).join('|');
    if (cache.has(chave)) return cache.get(chave);
    const yN = u * Math.max(0.6, P.nariz), yQ = yN + u * P.queixo, yE = 0.3;
    // desloca as alturas do rosto: sobrancelha e olhos fixos, base do nariz e queixo nas novas posições
    const fy = (y) => (y <= yE ? y : y <= u ? yE + (y - yE) * (yN - yE) / (u - yE) : y <= QUEIXO ? yN + (y - u) * (yQ - yN) / u : yQ + (y - QUEIXO));
    const fx = (x, y, mand) => (mand ? x * (1 + (P.mandibula - 1) * Math.min(1, Math.max(0, (y - 0.3) / 0.9))) : x);
    const alturas = { cabelo: -Math.min(0.97, u * P.testa), nariz: yN, olhos: fy(0.3) };
    const C = BASE.map((c) => {
      const d = c.def;
      if (!d) return c;
      let pts;
      if (d.tipo === 'arco') pts = arcoFrente(alturas[d.ref]);
      else if (d.tipo === 'olho' || d.tipo === 'orelha') {
        const k = d.tipo === 'olho' ? P.olhos : P.orelhas, [cx, cy, cz] = d.c;
        pts = c.pts.map(([x, y, z]) => {
          const x1 = d.tipo === 'olho' ? cx + (x - cx) * k : x, y1 = cy + (y - cy) * k, z1 = d.tipo === 'orelha' ? cz + (z - cz) * k : z;
          return [x1, fy(y1), z1];
        });
      } else pts = c.pts.map(([x, y, z]) => [fx(x, y, d.mand), fy(y), z]);
      return { ...c, pts };
    });
    if (cache.size > 40) cache.clear();
    cache.set(chave, C);
    return C;
  }

  // Projeta a cabeça numa pose. Retorna polilinhas com visibilidade por ponto.
  // P (opcional): proporções do tipo de rosto, ver TIPOS.
  function projetar(guinada = 0, arfagem = 0, rolagem = 0, P) {
    P = completar(P);
    const g = {
      cy: Math.cos(guinada * RAD), sy: Math.sin(guinada * RAD),
      cp: Math.cos(arfagem * RAD), sp: Math.sin(arfagem * RAD),
      cr: Math.cos(rolagem * RAD), sr: Math.sin(rolagem * RAD)
    };
    const lx = P.largura, ly = P.altura, esticado = lx !== 1 || ly !== 1;
    // a visibilidade usa a rotação pura; o esticamento só muda o desenho
    const gv = g, gd = esticado ? { ...g, lx, ly } : g;
    const partes = modelo(P).map((c) => {
      let visNormal = null;
      if (c.n) visNormal = girar(c.n, gv)[2] > c.lim;
      if (c.vis === 'perfil') visNormal = Math.abs(girar([1, 0, 0], gv)[2]) > (c.lim || 0.3) && girar([0, 0, 1], gv)[2] > -0.2;
      let planoVisivel = false;
      if (c.vis === 'aro') planoVisivel = girar([c.lado, 0, 0], gv)[2] > 0;
      const pts = c.pts.map((p) => {
        const r = girar(p, gd);
        let vis;
        if (c.vis === 'esfera') vis = r[2] > -0.01;
        else if (c.vis === 'aro') vis = planoVisivel || r[2] > 0;
        else vis = visNormal;
        return [r[0], r[1], vis];
      });
      return { grupo: c.grupo, pts };
    });
    // contorno da bola: círculo, ou elipse quando a forma foi esticada
    partes.contorno = { lx, ly, rol: rolagem };
    return partes;
  }

  // Converte em SVG. grupos: lista dos grupos a desenhar.
  function svg(partes, grupos, cx, cy, R, op = {}) {
    const ocultas = op.ocultas !== false;
    const f = (n) => n.toFixed(1);
    let out = '';
    const k = partes.contorno || { lx: 1, ly: 1, rol: 0 };
    if (grupos.includes('esfera')) {
      out += k.lx === 1 && k.ly === 1 ? `<circle class="l" cx="${f(cx)}" cy="${f(cy)}" r="${f(R)}"/>`
        : `<ellipse class="l" cx="${f(cx)}" cy="${f(cy)}" rx="${f(R * k.lx)}" ry="${f(R * k.ly)}" transform="rotate(${f(k.rol)} ${f(cx)} ${f(cy)})"/>`;
    }
    for (const p of partes) {
      if (!grupos.includes(p.grupo)) continue;
      // separa trechos visíveis e ocultos
      let atual = null, trechos = [];
      p.pts.forEach((pt, i) => {
        const v = pt[2];
        if (!atual || atual.v !== v) {
          atual = { v, pts: i > 0 ? [p.pts[i - 1]] : [] };
          trechos.push(atual);
        }
        atual.pts.push(pt);
      });
      for (const t of trechos) {
        if (t.pts.length < 2) continue;
        if (!t.v && !ocultas) continue;
        const d = t.pts.map((pt, i) => (i ? 'L' : 'M') + f(cx + pt[0] * R) + ',' + f(cy + pt[1] * R)).join('');
        out += `<path class="l${t.v ? '' : ' g'}" d="${d}"/>`;
      }
    }
    return out;
  }

  // Poses de referência (graus): guinada, arfagem, rolagem
  const POSES = {
    frente: [0, 0, 0],
    tresQuartos: [-35, 6, 0],
    perfil: [-90, 0, 0],
    deBaixo: [-25, 28, 0],
    deCima: [-25, -28, 0]
  };

  return { projetar, svg, POSES, TIPOS, PADRAO, u };
})();
