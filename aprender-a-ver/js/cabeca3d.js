/*
 * Cabeça de estudo pelo método de Andrew Loomis ("Drawing the Head and
 * Hands"): uma bola achatada dos lados, a cruz formada pela linha da
 * sobrancelha e pela linha central, e o rosto dividido em três partes
 * iguais (cabelo-sobrancelha, sobrancelha-base do nariz, base do nariz-queixo).
 *
 * Medidas em unidades do livro: a cabeça tem 3,5 unidades de altura e
 * 3 de largura (com as orelhas). Aqui o raio da bola vale 1, então
 * uma unidade (u) = 2/3.
 *
 * Eixos: x para a direita, y para baixo, z na direção de quem olha.
 */
const Cabeca = (() => {
  const u = 2 / 3;
  const LADO = Math.sqrt(1 - u * u); // distância do corte lateral ao centro (0,745)
  const RAD = Math.PI / 180;

  function girar(p, g) {
    let [x, y, z] = p;
    // guinada (virar para os lados) em torno de y
    let x1 = x * g.cy + z * g.sy, z1 = -x * g.sy + z * g.cy;
    // arfagem (olhar para cima/baixo) em torno de x
    let y1 = y * g.cp - z1 * g.sp, z2 = y * g.sp + z1 * g.cp;
    // inclinação lateral em torno do eixo de visão
    const x2 = x1 * g.cr - y1 * g.sr, y2 = x1 * g.sr + y1 * g.cr;
    return [x2, y2, z2];
  }
  const norm = (v) => { const m = Math.hypot(...v) || 1; return v.map((c) => c / m); };
  const amostrar = (a0, a1, n, f) => Array.from({ length: n + 1 }, (_, i) => f(a0 + (a1 - a0) * i / n));

  // Curvas do modelo. vis: 'esfera' (visível se o ponto está na metade da frente),
  // 'aro' (borda do corte lateral), ou um vetor normal fixo com limite.
  function curvas() {
    const C = [];
    const add = (grupo, pts, vis, extra = {}) => C.push(typeof vis === 'object' ? { grupo, pts, ...vis } : { grupo, pts, vis, ...extra });

    // Linha central: grande círculo vertical + descida pelo rosto até o queixo
    add('central', amostrar(-Math.PI, Math.PI, 96, (a) => [0, Math.sin(a), Math.cos(a)]), 'esfera');
    add('central', [[0, u, Math.sqrt(1 - u * u)], [0, 1.25 * u, 0.74], [0, 1.6 * u, 0.7], [0, 2 * u, 0.6]], { n: [0, 0.15, 1], lim: -0.25 });
    // Linha da sobrancelha (equador)
    add('sobrancelha', amostrar(0, 2 * Math.PI, 96, (a) => [Math.cos(a), 0, Math.sin(a)]), 'esfera');
    // Cortes laterais (círculos) e a cruz de cada lado
    for (const s of [1, -1]) {
      add('lateral', amostrar(0, 2 * Math.PI, 64, (a) => [s * LADO, u * Math.sin(a), u * Math.cos(a)]), 'aro', { lado: s });
      add('lateral', [[s * LADO, -u, 0], [s * LADO, u, 0]], { n: [s, 0, 0], lim: 0 });
      add('lateral', [[s * LADO, 0, -u], [s * LADO, 0, u]], { n: [s, 0, 0], lim: 0 });
    }
    // Linha do cabelo e linha da base do nariz (arcos da frente, entre os cortes)
    const rLat = Math.sqrt(1 - u * u);
    add('tercos', amostrar(0, Math.PI, 48, (a) => [rLat * Math.cos(a), -u, rLat * Math.sin(a)]), 'esfera');
    add('tercos', amostrar(0, Math.PI, 48, (a) => [rLat * Math.cos(a), u, rLat * Math.sin(a)]), 'esfera');
    // Linha do queixo
    add('tercos', amostrar(-1, 1, 12, (t) => [0.3 * t, 2 * u, 0.6 - 0.12 * t * t]), { n: [0, 0.3, 1], lim: -0.3 });

    // Mandíbula e lados do rosto
    for (const s of [1, -1]) {
      add('mandibula', [[s * (LADO + 0.01), u, -0.12], [s * 0.72, 1.3 * u, -0.16], [s * 0.66, 1.6 * u, -0.08], [s * 0.48, 1.85 * u, 0.3], [s * 0.3, 2 * u, 0.52]], { n: [s * 0.9, 0.2, 0.25], lim: -0.35 });
      add('mandibula', [[s * LADO, 0, u], [s * 0.7, 0.5 * u, 0.62], [s * 0.6, u, 0.58], [s * 0.45, 1.5 * u, 0.55], [s * 0.3, 2 * u, 0.52]], { n: [s * 0.7, 0, 0.7], lim: -0.1 });
    }

    // Traços do rosto
    const naEsfera = (x, y, k = 0.985) => [x, y, Math.sqrt(Math.max(0, 1 - x * x - y * y)) * k];
    for (const s of [1, -1]) {
      const ex = s * 0.5 * u, ey = 0.25 * u;
      // olho (amêndoa) e íris
      add('tracos', amostrar(0, 2 * Math.PI, 28, (a) => naEsfera(ex + 0.15 * Math.cos(a), ey + (Math.sin(a) < 0 ? 0.06 : 0.045) * Math.sin(a))), { n: norm([ex, ey, 0.9]), lim: 0.02 });
      add('tracos', amostrar(0, 2 * Math.PI, 16, (a) => naEsfera(ex + 0.045 * Math.cos(a), ey + 0.045 * Math.sin(a), 0.99)), { n: norm([ex, ey, 0.9]), lim: 0.08 });
      // sobrancelha
      add('tracos', amostrar(0, 1, 10, (t) => naEsfera(s * (0.1 + 0.36 * t), -0.04 - 0.05 * Math.sin(Math.PI * t))), { n: norm([s * 0.3, 0, 0.95]), lim: 0.0 });
      // orelha (no plano lateral, atrás da linha vertical, entre sobrancelha e nariz)
      add('tracos', amostrar(0, 2 * Math.PI, 28, (a) => [s * (LADO + 0.03), 0.5 * u + 0.5 * u * Math.sin(a), -0.2 + 0.13 * Math.cos(a) - 0.03 * Math.sin(a)]), { n: [s, 0, 0], lim: -0.12 });
    }
    // nariz: dorso, ponta, asas e base
    add('tracos', [[0, 0.05, 0.99], [0, 0.45, 1.0], [0, 0.6, 1.04], [0, 0.66, 0.92]], { n: [0, 0, 1], lim: -0.35 });
    add('tracos', [[0.15, 0.64, 0.8], [0.08, 0.68, 0.86], [0, 0.66, 0.92], [-0.08, 0.68, 0.86], [-0.15, 0.64, 0.8]], { n: [0, 0.3, 1], lim: -0.2 });
    // boca (sobre o focinho arredondado)
    const yb = u + u / 3;
    add('tracos', amostrar(-1, 1, 16, (t) => [0.25 * t, yb + 0.012 * Math.abs(t), 0.8 - 0.3 * t * t]), { n: [0, 0, 1], lim: -0.25 });
    return C;
  }
  const CURVAS = curvas();

  // Projeta a cabeça numa pose. Retorna polilinhas com visibilidade por ponto.
  function projetar(guinada = 0, arfagem = 0, rolagem = 0) {
    const g = {
      cy: Math.cos(guinada * RAD), sy: Math.sin(guinada * RAD),
      cp: Math.cos(arfagem * RAD), sp: Math.sin(arfagem * RAD),
      cr: Math.cos(rolagem * RAD), sr: Math.sin(rolagem * RAD)
    };
    return CURVAS.map((c) => {
      let visNormal = null;
      if (c.n) visNormal = girar(c.n, g)[2] > c.lim;
      let planoVisivel = false;
      if (c.vis === 'aro') planoVisivel = girar([c.lado, 0, 0], g)[2] > 0;
      const pts = c.pts.map((p) => {
        const r = girar(p, g);
        let vis;
        if (c.vis === 'esfera') vis = r[2] > -0.01;
        else if (c.vis === 'aro') vis = planoVisivel || r[2] > 0;
        else vis = visNormal;
        return [r[0], r[1], vis];
      });
      return { grupo: c.grupo, pts };
    });
  }

  // Converte em SVG. grupos: lista dos grupos a desenhar.
  function svg(partes, grupos, cx, cy, R, op = {}) {
    const ocultas = op.ocultas !== false;
    const f = (n) => n.toFixed(1);
    let out = '';
    if (grupos.includes('esfera')) out += `<circle class="l" cx="${f(cx)}" cy="${f(cy)}" r="${f(R)}"/>`;
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

  return { projetar, svg, POSES, u };
})();
