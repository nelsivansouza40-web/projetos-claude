/*
 * Simuladores interativos: luz sobre a esfera, perspectiva com um e dois
 * pontos de fuga e a cabeça de Loomis em 3D. Cada simulador monta a própria
 * tela dentro de "raiz" e devolve { referencia() } para levar a vista atual
 * para a prancheta.
 */
const Sims = (() => {
  const { h } = U;

  // Converte a posição do ponteiro em coordenadas internas do elemento
  function pontoLocal(e, el, W, H) {
    const r = el.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H];
  }
  const norm = (v) => { const m = Math.hypot(...v) || 1; return v.map((c) => c / m); };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function botoesModo(opcoes, atual, aoEscolher) {
    const grupo = h('div', { class: 'segmentado', role: 'group' });
    for (const [valor, rotulo] of opcoes) {
      const b = h('button', { class: 'seg' + (valor === atual ? ' ativo' : ''), onclick: () => {
        U.$$('.seg', grupo).forEach((x) => x.classList.remove('ativo'));
        b.classList.add('ativo');
        aoEscolher(valor);
      } }, rotulo);
      grupo.append(b);
    }
    return grupo;
  }

  // ------------------------------------------------------------
  // LUZ
  // ------------------------------------------------------------
  function luz(raiz) {
    const W = 360, H = 320, cx = 175, cy = 145, r = 88, chao = cy + r;
    const st = { lx: 70, ly: 40, modo: 'continuo', nomes: true };
    const cv = h('canvas', { width: W, height: H, class: 'sim-canvas', 'aria-label': 'Esfera iluminada; arraste para mover a luz' });
    const ctx = cv.getContext('2d');

    function desenhar(comNomes = st.nomes) {
      const img = ctx.createImageData(W, H);
      const d = img.data;
      const L = norm([st.lx - cx, st.ly - cy, 110]);
      const Hh = norm([L[0], L[1], L[2] + 1]);
      // sombra projetada no chão (vista lateral simplificada)
      const k = (chao - cy) / Math.max(12, cy - st.ly);
      const sx = clamp(cx + (cx - st.lx) * k, -200, W + 200);
      const srx = r * (1 + 0.45 * Math.abs(sx - cx) / r), sry = r * 0.2;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          let v;
          const nx = (x - cx) / r, ny = (y - cy) / r, q = nx * nx + ny * ny;
          if (q <= 1) {
            const nz = Math.sqrt(1 - q);
            const dd = nx * L[0] + ny * L[1] + nz * L[2];
            const dif = Math.max(0, dd);
            const refl = dd < 0 ? 0.2 * Math.max(0, ny) * Math.min(1, -dd * 3 + 0.4) : 0;
            const spec = Math.pow(Math.max(0, nx * Hh[0] + ny * Hh[1] + nz * Hh[2]), 70) * 0.5;
            v = 0.09 + 0.8 * dif + refl + spec - 0.05 * Math.exp(-(dd * dd) / 0.004) * (dd < 0.05 ? 1 : 0);
            if (st.modo === '5') v = v < 0.17 ? 0.08 : v < 0.35 ? 0.27 : v < 0.55 ? 0.47 : v < 0.8 ? 0.7 : 0.96;
            else if (st.modo === '2') v = v < 0.3 ? 0.08 : 0.97;
          } else {
            v = y > chao - 30 ? 0.94 : 0.975;
            const ex = (x - sx) / srx, ey = (y - chao) / sry, e2 = ex * ex + ey * ey;
            if (e2 < 1 && y > chao - sry) v -= 0.42 * Math.min(1, (1 - e2) * 2.2);
            const cx2 = (x - cx) / (r * 0.4), cy2 = (y - chao) / 6, c2 = cx2 * cx2 + cy2 * cy2;
            if (c2 < 1) v -= 0.35 * (1 - c2);
            if (st.modo === '2') v = v < 0.6 ? 0.08 : 0.97;
          }
          v = clamp(v, 0, 1);
          d[i] = 24 + 229 * v; d[i + 1] = 21 + 227 * v; d[i + 2] = 18 + 224 * v; d[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      // fonte de luz
      ctx.save();
      ctx.strokeStyle = '#c8452c'; ctx.fillStyle = '#f5c26b'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(st.lx, st.ly, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      for (let a = 0; a < 8; a++) {
        const t = a * Math.PI / 4;
        ctx.beginPath(); ctx.moveTo(st.lx + Math.cos(t) * 14, st.ly + Math.sin(t) * 14); ctx.lineTo(st.lx + Math.cos(t) * 20, st.ly + Math.sin(t) * 20); ctx.stroke();
      }
      if (comNomes) {
        const P = (n) => [cx + n[0] * r, cy + n[1] * r];
        // terminador
        let a = norm(cross(L, [0, 0, 1])); if (!isFinite(a[0])) a = [1, 0, 0];
        const b = cross(L, a);
        ctx.setLineDash([5, 4]); ctx.strokeStyle = '#c8452c'; ctx.lineWidth = 1.6; ctx.beginPath();
        let primeiro = true, meio = null;
        for (let t = 0; t <= 64; t++) {
          const ang = t / 64 * Math.PI * 2;
          const n = [Math.cos(ang) * a[0] + Math.sin(ang) * b[0], Math.cos(ang) * a[1] + Math.sin(ang) * b[1], Math.cos(ang) * a[2] + Math.sin(ang) * b[2]];
          if (n[2] < 0) { primeiro = true; continue; }
          const [px, py] = P(n);
          if (primeiro) { ctx.moveTo(px, py); primeiro = false; } else ctx.lineTo(px, py);
          if (!meio || n[2] > meio[2]) meio = [px, py, n[2]];
        }
        ctx.stroke(); ctx.setLineDash([]);
        const rotulo = (x, y, tx, ty, texto) => {
          ctx.font = '600 12px system-ui, sans-serif';
          const w = ctx.measureText(texto).width;
          // mantém o texto inteiro dentro da imagem
          const esq = tx < x;
          const x0 = clamp(esq ? tx - 3 - w : tx + 3, 4, W - 4 - w);
          const fimLinha = esq ? x0 + w + 3 : x0 - 3;
          ctx.strokeStyle = '#c8452c'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(fimLinha, ty); ctx.stroke();
          ctx.fillStyle = '#c8452c'; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
          ctx.textAlign = 'left';
          ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(251,248,242,.9)'; ctx.strokeText(texto, x0, ty + 4);
          ctx.fillStyle = '#8c2e1a'; ctx.fillText(texto, x0, ty + 4);
        };
        const lado = st.lx < cx ? 1 : -1;
        const brilho = P(Hh);
        rotulo(brilho[0], brilho[1], brilho[0] - lado * 60, brilho[1] - 30, 'brilho');
        const meioTom = P(norm([L[0] * 0.35 + a[0] * 0.2, L[1] * 0.35 + a[1] * 0.2, 0.9]));
        rotulo(meioTom[0], meioTom[1], cx + lado * (r + 40), cy - r * 0.55, 'meio-tom');
        if (meio) rotulo(meio[0], meio[1], cx + lado * (r + 40), cy - r * 0.1, 'terminador');
        const sp = P(norm([-L[0], -L[1], 0.7]));
        rotulo(sp[0], sp[1], cx + lado * (r + 40), cy + r * 0.35, 'sombra própria');
        const rf = P(norm([-L[0] * 0.4, 1, 0.3]));
        rotulo(rf[0], rf[1], cx - lado * (r + 30), cy + r * 0.8, 'luz refletida');
        rotulo(clamp(sx + (sx > cx ? 1 : -1) * srx * 0.5, 10, W - 10), chao + 4, clamp(sx + (sx > cx ? 1 : -1) * srx * 0.5, 40, W - 40), H - 14, 'sombra projetada');
        rotulo(cx, chao + 1, cx - lado * 70, H - 34, 'sombra de contato');
      }
      ctx.restore();
    }

    let arrastando = false;
    const mover = (e) => {
      const [x, y] = pontoLocal(e, cv, W, H);
      st.lx = clamp(x, 12, W - 12); st.ly = clamp(y, 12, cy - 20);
      requestAnimationFrame(() => desenhar());
    };
    cv.addEventListener('pointerdown', (e) => { arrastando = true; cv.setPointerCapture(e.pointerId); mover(e); });
    cv.addEventListener('pointermove', (e) => { if (arrastando) mover(e); });
    cv.addEventListener('pointerup', () => { arrastando = false; });

    const chkNomes = h('input', { type: 'checkbox', checked: true, onchange: (e) => { st.nomes = e.target.checked; desenhar(); } });
    raiz.append(
      h('div', { class: 'cartao papel' }, cv),
      h('div', { class: 'controles' },
        botoesModo([['continuo', 'Contínuo'], ['5', '5 valores'], ['2', '2 valores']], st.modo, (m) => { st.modo = m; desenhar(); }),
        h('label', { class: 'check' }, chkNomes, ' Mostrar nomes')
      ),
      h('div', { class: 'texto' },
        h('p', {}, 'Arraste na imagem para mover a luz. Observe que a luz vem de uma única fonte, como Loomis recomenda para começar: com uma só luz as sombras ficam simples e fáceis de ler.'),
        h('ul', {},
          h('li', {}, h('b', {}, 'Brilho: '), 'o ponto mais claro, voltado para a luz. No lápis, é o branco do papel.'),
          h('li', {}, h('b', {}, 'Meio-tom: '), 'a passagem gradual da luz para a sombra. Numa forma redonda ela é suave; numa forma com arestas, some.'),
          h('li', {}, h('b', {}, 'Terminador: '), 'a borda onde a luz direta acaba. É ali que a sombra própria é mais escura.'),
          h('li', {}, h('b', {}, 'Luz refletida: '), 'a luz que volta do chão para a parte de baixo. Ela nunca fica tão clara quanto o lado iluminado.'),
          h('li', {}, h('b', {}, 'Sombra projetada e de contato: '), 'a forma escura no chão, mais escura ainda logo abaixo do objeto.')
        ),
        h('p', {}, 'O modo "2 valores" é o exercício do nanquim de Betty Edwards: só papel e preto. Veja como a forma da sombra, sozinha, já descreve a bola.')
      )
    );
    desenhar();
    return {
      referencia: () => { desenhar(false); const url = cv.toDataURL('image/png'); desenhar(); return Promise.resolve(url); }
    };
  }

  // ------------------------------------------------------------
  // SVG interativo com alças arrastáveis
  // ------------------------------------------------------------
  function svgInterativo(W, H, rotulo) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('class', 'sim-svg');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', rotulo);
    const alcas = [];
    let ativa = null;
    svg.addEventListener('pointerdown', (e) => {
      const [x, y] = pontoLocal(e, svg, W, H);
      let melhor = null, dist = 28;
      for (const a of alcas) {
        const [ax, ay] = a.pos();
        const d = Math.hypot(ax - x, ay - y);
        if (d < dist) { dist = d; melhor = a; }
      }
      if (melhor) { ativa = melhor; svg.setPointerCapture(e.pointerId); e.preventDefault(); }
    });
    svg.addEventListener('pointermove', (e) => {
      if (!ativa) return;
      const [x, y] = pontoLocal(e, svg, W, H);
      ativa.mover(clamp(x, 0, W), clamp(y, 0, H));
    });
    const soltar = () => { ativa = null; };
    svg.addEventListener('pointerup', soltar);
    svg.addEventListener('pointercancel', soltar);
    return { svg, alcas };
  }
  const alca = (x, y, cor = '#c8452c') => `<circle cx="${x}" cy="${y}" r="9" fill="${cor}" fill-opacity=".18" stroke="${cor}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="3" fill="${cor}"/>`;
  const pts = (arr) => arr.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ');
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  function intersec(a, b, c, d) {
    const x1 = a[0], y1 = a[1], x2 = b[0], y2 = b[1], x3 = c[0], y3 = c[1], x4 = d[0], y4 = d[1];
    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(den) < 1e-6) return lerp(a, c, 0.5);
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
    return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
  }
  const ESTILO_PERSP = `<style>.f{stroke:#2e2925;stroke-width:1.6;stroke-linejoin:round}.fuga{stroke:#c8452c;stroke-width:1;stroke-dasharray:5 5;fill:none}.oc{stroke:#2e2925;stroke-width:1.2;stroke-dasharray:4 4;fill:none}.hz{stroke:#2f5d9a;stroke-width:1.4}.tx{font:600 11px system-ui,sans-serif;fill:#2f5d9a}.chao{stroke:#8ea3c4;stroke-width:.8;fill:none}</style>`;

  // ------------------------------------------------------------
  // UM PONTO DE FUGA
  // ------------------------------------------------------------
  function pf1(raiz) {
    const W = 400, H = 300;
    const st = { hy: 120, px: 200, fuga: true };
    const caixas = [[30, 175, 90, 70], [255, 35, 105, 55], [165, 205, 70, 55], [285, 200, 80, 50]];
    const { svg, alcas } = svgInterativo(W, H, 'Cena em perspectiva com um ponto de fuga');
    alcas.push({ pos: () => [st.px, st.hy], mover: (x, y) => { st.px = x; st.hy = clamp(y, 15, H - 15); desenhar(); } });
    alcas.push({ pos: () => [W - 12, st.hy], mover: (x, y) => { st.hy = clamp(y, 15, H - 15); desenhar(); } });

    function desenhar() {
      const PF = [st.px, st.hy];
      let s = ESTILO_PERSP + `<rect width="${W}" height="${H}" fill="#fbf8f2"/>`;
      for (let x = -400; x <= 800; x += 60) if (st.hy < H) s += `<line class="chao" x1="${x}" y1="${H}" x2="${PF[0]}" y2="${PF[1]}"/>`;
      s += `<line class="hz" x1="0" y1="${st.hy}" x2="${W}" y2="${st.hy}"/><text class="tx" x="6" y="${st.hy - 6}">linha do horizonte (nível dos olhos)</text>`;
      for (const [x, y, w, hh] of caixas) {
        const f = [[x, y], [x + w, y], [x + w, y + hh], [x, y + hh]];
        const b = f.map((p) => lerp(p, PF, 0.32));
        const faces = [];
        if (st.px > x + w) faces.push([[f[1], f[2], b[2], b[1]], '#b5aea3']);
        if (st.px < x) faces.push([[f[0], f[3], b[3], b[0]], '#b5aea3']);
        if (st.hy < y) faces.push([[f[0], f[1], b[1], b[0]], '#f8f5ef']);
        if (st.hy > y + hh) faces.push([[f[3], f[2], b[2], b[3]], '#8f887e']);
        if (st.fuga) for (const p of f) s += `<line class="fuga" x1="${p[0]}" y1="${p[1]}" x2="${PF[0]}" y2="${PF[1]}"/>`;
        for (const [poly, cor] of faces) s += `<polygon class="f" points="${pts(poly)}" fill="${cor}"/>`;
        s += `<polygon class="f" points="${pts(f)}" fill="#efe9df"/>`;
      }
      s += alca(PF[0], PF[1]) + `<text class="tx" x="${PF[0] + 12}" y="${PF[1] + 16}">PF</text>` + alca(W - 12, st.hy, '#2f5d9a');
      svg.innerHTML = s;
    }
    const chk = h('input', { type: 'checkbox', checked: true, onchange: (e) => { st.fuga = e.target.checked; desenhar(); } });
    raiz.append(
      h('div', { class: 'cartao papel' }, svg),
      h('div', { class: 'controles' }, h('label', { class: 'check' }, chk, ' Linhas de fuga')),
      h('div', { class: 'texto' },
        h('p', {}, 'Arraste o ponto de fuga (PF) ou a alça azul da direita, que sobe e desce o horizonte.'),
        h('ul', {},
          h('li', {}, 'Tudo o que se afasta de você converge para o ponto de fuga.'),
          h('li', {}, 'Verticais continuam verticais; horizontais de frente continuam horizontais.'),
          h('li', {}, 'Caixas abaixo do horizonte mostram o topo; acima, mostram a parte de baixo. Com o horizonte no meio de uma caixa, você não vê nem o topo nem o fundo.')
        ),
        h('p', {}, 'Betty Edwards lembra que, conhecidas essas regras, o artista desenha "a olho": mede ângulos com o lápis e confia no que vê. A perspectiva serve para entender, não para travar o desenho.')
      )
    );
    desenhar();
    return { referencia: () => Promise.resolve(U.svgParaUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W * 2}" height="${H * 2}">${svg.innerHTML}</svg>`)) };
  }

  // ------------------------------------------------------------
  // DOIS PONTOS DE FUGA
  // ------------------------------------------------------------
  function pf2(raiz) {
    const W = 400, H = 300;
    const st = { hy: 110, p1: 25, p2: 375, fx: 200, ty: 160, by: 270, ocultas: true };
    const { svg, alcas } = svgInterativo(W, H, 'Caixa em perspectiva com dois pontos de fuga');
    alcas.push({ pos: () => [st.p1, st.hy], mover: (x, y) => { st.p1 = clamp(x, 0, st.fx - 30); st.hy = clamp(y, 10, H - 10); desenhar(); } });
    alcas.push({ pos: () => [st.p2, st.hy], mover: (x, y) => { st.p2 = clamp(x, st.fx + 30, W); st.hy = clamp(y, 10, H - 10); desenhar(); } });
    alcas.push({ pos: () => [st.fx, st.ty], mover: (x, y) => { st.fx = clamp(x, st.p1 + 40, st.p2 - 40); st.ty = clamp(y, 10, st.by - 30); desenhar(); } });
    alcas.push({ pos: () => [st.fx, st.by], mover: (x, y) => { st.by = clamp(y, st.ty + 30, H - 5); desenhar(); } });

    function desenhar() {
      const P1 = [st.p1, st.hy], P2 = [st.p2, st.hy], T = [st.fx, st.ty], B = [st.fx, st.by];
      const Lt = lerp(T, P1, 0.38), Rt = lerp(T, P2, 0.3);
      const Lb = lerp(B, P1, (Lt[0] - B[0]) / (P1[0] - B[0]));
      const Rb = lerp(B, P2, (Rt[0] - B[0]) / (P2[0] - B[0]));
      const BT = intersec(Lt, P2, Rt, P1), BB = intersec(Lb, P2, Rb, P1);
      const topo = st.hy < st.ty, fundo = st.hy > st.by;
      let s = ESTILO_PERSP + `<rect width="${W}" height="${H}" fill="#fbf8f2"/>`;
      s += `<line class="hz" x1="0" y1="${st.hy}" x2="${W}" y2="${st.hy}"/><text class="tx" x="6" y="${st.hy - 6}">horizonte</text>`;
      for (const p of [T, B]) s += `<line class="fuga" x1="${p[0]}" y1="${p[1]}" x2="${P1[0]}" y2="${P1[1]}"/><line class="fuga" x1="${p[0]}" y1="${p[1]}" x2="${P2[0]}" y2="${P2[1]}"/>`;
      s += `<line class="fuga" x1="${Lt[0]}" y1="${Lt[1]}" x2="${P2[0]}" y2="${P2[1]}"/><line class="fuga" x1="${Rt[0]}" y1="${Rt[1]}" x2="${P1[0]}" y2="${P1[1]}"/>`;
      s += `<polygon class="f" points="${pts([T, Lt, Lb, B])}" fill="#bbb4a9"/><polygon class="f" points="${pts([T, Rt, Rb, B])}" fill="#77706a"/>`;
      if (topo) s += `<polygon class="f" points="${pts([T, Lt, BT, Rt])}" fill="#f1ece3"/>`;
      if (fundo) s += `<polygon class="f" points="${pts([B, Lb, BB, Rb])}" fill="#5c5650"/>`;
      if (st.ocultas) {
        const seg = (a, b) => `<line class="oc" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;
        s += seg(BT, BB);
        if (!topo) s += seg(Lt, BT) + seg(Rt, BT);
        if (!fundo) s += seg(Lb, BB) + seg(Rb, BB);
      }
      s += alca(...P1) + alca(...P2) + alca(...T, '#2f5d9a') + alca(...B, '#2f5d9a');
      s += `<text class="tx" x="${P1[0] + 10}" y="${P1[1] + 18}">PF1</text><text class="tx" x="${P2[0] - 30}" y="${P2[1] + 18}">PF2</text>`;
      svg.innerHTML = s;
    }
    const chk = h('input', { type: 'checkbox', checked: true, onchange: (e) => { st.ocultas = e.target.checked; desenhar(); } });
    raiz.append(
      h('div', { class: 'cartao papel' }, svg),
      h('div', { class: 'controles' }, h('label', { class: 'check' }, chk, ' Arestas ocultas')),
      h('div', { class: 'texto' },
        h('p', {}, 'Arraste os pontos de fuga (vermelhos) e as pontas da aresta da frente (azuis).'),
        h('ul', {},
          h('li', {}, 'Com os pontos de fuga muito próximos, a caixa se deforma. Afaste-os para um resultado natural.'),
          h('li', {}, 'Desenhar as arestas ocultas mostra se a caixa está coerente por inteiro. Loomis pede o mesmo para a cabeça: "sentir o lado que não se vê".'),
          h('li', {}, 'Suba a caixa acima do horizonte e veja a face de cima desaparecer.')
        )
      )
    );
    desenhar();
    return { referencia: () => Promise.resolve(U.svgParaUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W * 2}" height="${H * 2}">${svg.innerHTML}</svg>`)) };
  }

  // ------------------------------------------------------------
  // CABEÇA DE LOOMIS
  // ------------------------------------------------------------
  function cabeca(raiz) {
    const st = { g: -35, a: 6, r: 0, ocultas: true, tracos: true };
    const box = h('div', { class: 'cartao papel' });
    const W = 400, H = 400, cx = 200, cy = 165, R = 112;
    function svgAtual() {
      const partes = Cabeca.projetar(st.g, st.a, st.r);
      const constr = Cabeca.svg(partes, ['esfera', 'lateral', 'central', 'sobrancelha', 'tercos', 'mandibula'], cx, cy, R, { ocultas: st.ocultas });
      const tr = st.tracos ? Cabeca.svg(partes, ['tracos', 'orelhas'], cx, cy, R, { ocultas: false }) : '';
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W * 2}" height="${H * 2}" class="sim-svg" role="img" aria-label="Cabeça de Loomis"><style>${Licoes.CSS}</style><rect width="${W}" height="${H}" fill="#fbf8f2"/><g class="ant">${constr}</g><g class="novo">${tr}</g></svg>`;
    }
    const desenhar = () => { box.innerHTML = svgAtual(); };
    const controles = {};
    const slider = (chave, rotulo, min, max) => {
      const saida = h('output', {}, st[chave] + '°');
      const inp = h('input', { type: 'range', min, max, value: st[chave], oninput: (e) => { st[chave] = +e.target.value; saida.textContent = st[chave] + '°'; desenhar(); } });
      controles[chave] = { inp, saida };
      return h('label', { class: 'slider' }, h('span', {}, rotulo), inp, saida);
    };
    const pose = (nome, rotulo) => h('button', { class: 'btn pequeno', onclick: () => {
      const [g, a, r] = Cabeca.POSES[nome];
      Object.assign(st, { g, a, r });
      for (const k of ['g', 'a', 'r']) { controles[k].inp.value = st[k]; controles[k].saida.textContent = st[k] + '°'; }
      desenhar();
    } }, rotulo);
    raiz.append(
      box,
      h('div', { class: 'linha-botoes' }, pose('frente', 'Frente'), pose('tresQuartos', 'Três quartos'), pose('perfil', 'Perfil'), pose('deBaixo', 'De baixo'), pose('deCima', 'De cima')),
      h('div', { class: 'controles coluna' },
        slider('g', 'Virar para os lados', -90, 90),
        slider('a', 'Olhar para cima ou baixo', -40, 40),
        slider('r', 'Inclinar', -30, 30),
        h('div', { class: 'linha-botoes' },
          h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: true, onchange: (e) => { st.ocultas = e.target.checked; desenhar(); } }), ' Linhas ocultas'),
          h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: true, onchange: (e) => { st.tracos = e.target.checked; desenhar(); } }), ' Olhos, nariz, boca e orelha'))
      ),
      h('div', { class: 'texto' },
        h('p', {}, 'Esta é a construção de Andrew Loomis: uma bola achatada dos lados, com o rosto preso na frente. Em azul, a estrutura; em vermelho, os traços do rosto.'),
        h('ul', {},
          h('li', {}, 'Veja como a linha da sobrancelha e a linha central formam uma cruz que "anda" sobre a bola quando a cabeça gira.'),
          h('li', {}, 'Na vista de baixo, as linhas horizontais se curvam para cima; na de cima, para baixo. É o mesmo efeito das linhas guia na folha de olhos, narizes, bocas e orelhas em quatro ângulos.'),
          h('li', {}, 'Quando a cabeça inclina, tudo inclina junto: a linha dos olhos continua em ângulo reto com a linha central.')
        )
      )
    );
    desenhar();
    return { referencia: () => Promise.resolve(U.svgParaUrl(svgAtual())) };
  }

  return { luz, pf1, pf2, cabeca };
})();
