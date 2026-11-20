/*
 * Gráficos em SVG, sem bibliotecas externas (funcionam offline).
 * Barras finas com ponta arredondada, grade discreta, dica ao passar o mouse,
 * legenda quando há mais de uma série e opção "Tabela" em cada gráfico.
 */
const CAT = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)', 'var(--s7)', 'var(--s8)'];
const STATUS_COR = { good: 'var(--good)', warning: 'var(--warning)', serious: 'var(--serious)', critical: 'var(--critical)', neutral: 'var(--axis)' };

const Charts = {
  tip(e, html) {
    const t = $('#tooltip');
    if (!html) { t.hidden = true; return; }
    t.innerHTML = html; t.hidden = false;
    const x = Math.min(e.clientX + 14, window.innerWidth - t.offsetWidth - 8);
    const y = Math.min(e.clientY + 14, window.innerHeight - t.offsetHeight - 8);
    t.style.left = x + 'px'; t.style.top = y + 'px';
  },

  ligarDicas(body) {
    body.addEventListener('mousemove', (e) => {
      const alvo = e.target.closest('[data-tip]');
      if (!alvo) { Charts.tip(e, null); body.classList.remove('dim'); $$('.mark.on', body).forEach((m) => m.classList.remove('on')); return; }
      Charts.tip(e, alvo.getAttribute('data-tip'));
      const g = alvo.getAttribute('data-g');
      if (g != null) {
        body.classList.add('dim');
        $$('.mark', body).forEach((m) => m.classList.toggle('on', m.getAttribute('data-g') === g));
      }
    });
    body.addEventListener('mouseleave', (e) => { Charts.tip(e, null); body.classList.remove('dim'); });
  },

  /**
   * Cartão de gráfico. tabela = { cab: [...], linhas: [[...]] } para a visão em tabela.
   */
  card(titulo, desenhar, tabela, opts = {}) {
    const card = h('<div class="chart-card' + (opts.wide ? ' wide' : '') + '"><div class="chart-head"><h3>' + esc(titulo) + '</h3>' +
      (tabela ? '<button type="button" class="btn btn-ghost">Tabela</button>' : '') + '</div><div class="chart-body"></div></div>');
    const body = $('.chart-body', card);
    let modoTabela = false;
    const render = () => {
      body.innerHTML = '';
      if (modoTabela && tabela) {
        body.innerHTML = '<div class="table-wrap" style="max-height:320px"><table class="data"><thead><tr>' +
          tabela.cab.map((c, i) => '<th' + (i ? ' class="num"' : '') + '>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>' +
          (tabela.linhas.length ? tabela.linhas.map((l) => '<tr>' + l.map((v, i) => '<td' + (i ? ' class="num"' : '') + '>' + esc(v) + '</td>').join('') + '</tr>').join('')
            : '<tr><td colspan="' + tabela.cab.length + '" class="empty">Sem dados</td></tr>') + '</tbody></table></div>';
      } else desenhar(body);
    };
    if (tabela) $('.chart-head .btn', card).addEventListener('click', (e) => {
      modoTabela = !modoTabela; e.target.textContent = modoTabela ? 'Gráfico' : 'Tabela'; render();
    });
    this.ligarDicas(body);
    // desenha quando o cartão já está na tela, na largura real (texto legível)
    let largura = 0;
    const ro = new ResizeObserver(() => {
      const w = Math.round(body.clientWidth);
      if (!w || Math.abs(w - largura) < 8) return;
      largura = w; render();
    });
    ro.observe(body);
    return card;
  },

  largura(body, min = 300) { return Math.max(min, Math.round(body.clientWidth || 560)); },

  vazio(body, msg) { body.innerHTML = '<div class="chart-empty">' + esc(msg || 'Sem dados para o período.') + '</div>'; },

  legenda(series) {
    if (series.length < 2) return '';
    return '<div class="legend">' + series.map((s, i) => '<span><i style="background:' + (s.cor || CAT[i]) + '"></i>' + esc(s.nome) + '</span>').join('') + '</div>';
  },

  escala(max) {
    if (max <= 0) return { max: 1, passo: 1 };
    const bruto = max / 4;
    const mag = Math.pow(10, Math.floor(Math.log10(bruto)));
    const n = bruto / mag;
    const passo = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
    const p = Math.max(passo, max < 4 ? 1 : passo);
    return { max: Math.ceil(max / p) * p, passo: p };
  },

  /** Barras verticais (uma ou mais séries agrupadas, ou empilhadas). */
  barras(body, { cats, series, fmt = fmtNum, empilhar = false, altura = 230 }) {
    const total = series.reduce((s, x) => s + x.valores.reduce((a, b) => a + (b || 0), 0), 0);
    if (!cats.length || !total) return this.vazio(body);
    const maxv = empilhar ? Math.max(...cats.map((_, i) => series.reduce((s, x) => s + (x.valores[i] || 0), 0)))
      : Math.max(...series.flatMap((s) => s.valores.map((v) => v || 0)));
    const { max, passo } = this.escala(maxv);
    const W = this.largura(body), H = altura, ml = Math.max(32, String(fmt(max)).length * 6.6 + 12), mr = 8, mt = 16, mb = 34;
    const iw = W - ml - mr, ih = H - mt - mb;
    const y = (v) => mt + ih - (v / max) * ih;
    const bw = iw / cats.length;
    const ns = empilhar ? 1 : series.length;
    const barW = Math.max(4, Math.min(28, (bw * 0.7) / ns - 2));
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img">';
    for (let v = 0; v <= max + 1e-9; v += passo) {
      s += '<line class="gridline" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y(v) + '" y2="' + y(v) + '"/>';
      s += '<text class="tick" x="' + (ml - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + fmt(v) + '</text>';
    }
    const passoRot = Math.ceil(cats.length / Math.max(4, Math.floor(iw / 42)));
    cats.forEach((c, i) => {
      const cx = ml + bw * i + bw / 2;
      if (i % passoRot === 0) {
        const r = String(c).length > 12 ? String(c).slice(0, 11) + '…' : c;
        s += '<text class="tick" x="' + cx + '" y="' + (H - mb + 16) + '" text-anchor="middle">' + esc(r) + '</text>';
      }
      let acum = 0;
      series.forEach((se, j) => {
        const v = se.valores[i] || 0;
        if (!v) return;
        const cor = se.cores ? se.cores[i] : (se.cor || CAT[j]);
        const x = empilhar ? cx - barW / 2 : cx - (ns * (barW + 2)) / 2 + j * (barW + 2) + 1;
        const y0 = y(acum + v), y1 = y(acum);
        const hgt = Math.max(1, y1 - y0 - (empilhar && acum ? 2 : 0));
        const tip = '<div>' + esc(c) + '</div>' + (series.length > 1 ? esc(se.nome) + ': ' : '') + '<b>' + esc(fmt(v)) + '</b>';
        s += '<path class="mark" data-g="' + i + '" d="' + this.barPath(x, y0, barW, hgt, !empilhar || j === series.length - 1 || !series.slice(j + 1).some((q) => q.valores[i])) + '" fill="' + cor + '"/>';
        s += '<rect class="hit" data-g="' + i + '" data-tip="' + esc(tip) + '" x="' + (x - 2) + '" y="' + mt + '" width="' + (barW + 4) + '" height="' + ih + '"/>';
        if (empilhar) acum += v;
      });
      if (!empilhar && series.length === 1 && bw >= String(fmt(series[0].valores[i] || 0)).length * 6.6 + 6) {
        const v = series[0].valores[i];
        if (v) s += '<text class="val" x="' + cx + '" y="' + (y(v) - 5) + '" text-anchor="middle">' + esc(fmt(v)) + '</text>';
      }
    });
    s += '<line class="baseline" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y(0) + '" y2="' + y(0) + '"/></svg>';
    body.innerHTML = s + this.legenda(series);
  },

  barPath(x, y, w, hgt, arred) {
    const r = Math.min(4, w / 2, hgt);
    if (!arred || r <= 0) return 'M' + x + ',' + (y + hgt) + 'V' + y + 'H' + (x + w) + 'V' + (y + hgt) + 'Z';
    return 'M' + x + ',' + (y + hgt) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'H' + (x + w - r) +
      'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + hgt) + 'Z';
  },

  /** Barras horizontais ordenadas (ranking). itens: [{nome, valor, cor?}] */
  ranking(body, { itens, fmt = fmtNum, max = 10, cor = 'var(--s1)' }) {
    let lista = itens.filter((i) => i.valor).sort((a, b) => b.valor - a.valor);
    if (!lista.length) return this.vazio(body);
    if (lista.length > max) {
      const resto = lista.slice(max - 1).reduce((s, i) => s + i.valor, 0);
      lista = lista.slice(0, max - 1).concat([{ nome: 'Outros', valor: resto, cor: 'var(--axis)' }]);
    }
    const W = this.largura(body), lh = 26, ml = Math.min(170, Math.round(W * 0.4)), mr = 56, H = lista.length * lh + 8;
    const maxCh = Math.max(10, Math.floor((ml - 10) / 6.4));
    const mx = Math.max(...lista.map((i) => i.valor));
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img">';
    lista.forEach((it, i) => {
      const y = 4 + i * lh, w = Math.max(2, (it.valor / mx) * (W - ml - mr));
      const nome = String(it.nome).length > maxCh ? String(it.nome).slice(0, maxCh - 1) + '…' : it.nome;
      s += '<text class="lbl" x="' + (ml - 8) + '" y="' + (y + 15) + '" text-anchor="end">' + esc(nome) + '</text>';
      s += '<path class="mark" data-g="' + i + '" d="' + this.hbarPath(ml, y + 5, w, 14) + '" fill="' + (it.cor || cor) + '"/>';
      s += '<text class="val" x="' + (ml + w + 6) + '" y="' + (y + 16) + '">' + esc(fmt(it.valor)) + '</text>';
      s += '<rect class="hit" data-g="' + i + '" data-tip="' + esc('<div>' + esc(it.nome) + '</div><b>' + esc(fmt(it.valor)) + '</b>') + '" x="0" y="' + y + '" width="' + W + '" height="' + lh + '"/>';
    });
    s += '<line class="baseline" x1="' + ml + '" x2="' + ml + '" y1="0" y2="' + H + '"/></svg>';
    body.innerHTML = s;
  },

  hbarPath(x, y, w, hgt) {
    const r = Math.min(4, hgt / 2, w);
    return 'M' + x + ',' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + hgt - r) +
      'Q' + (x + w) + ',' + (y + hgt) + ' ' + (x + w - r) + ',' + (y + hgt) + 'H' + x + 'Z';
  },

  /**
   * Figura do corpo humano (vista de frente) com a quantidade de acidentes por
   * parte atingida: a região fica mais vermelha quanto mais acidentes tem, e cada
   * parte tem um quadro com o número, ligado à região por uma linha.
   * itens: [{nome, valor}] com os nomes da lista "Partes do corpo".
   */
  corpo(body, { itens }) {
    const PARTES = [
      // [chave, rótulo, lado, sinônimos]
      ['cabeca', 'Cabeça', 'e', ['cabeca', 'cranio', 'couro cabeludo']],
      ['face', 'Face', 'e', ['face', 'rosto', 'boca', 'orelha', 'ouvido', 'mandibula', 'dente', 'dentes']],
      ['pescoco', 'Pescoço', 'e', ['pescoco']],
      ['ombro', 'Ombro', 'e', ['ombro', 'ombros', 'clavicula']],
      ['tronco', 'Tronco', 'e', ['tronco', 'torax', 'peito', 'costela', 'costelas']],
      ['abdomen', 'Abdômen', 'e', ['abdomen', 'barriga', 'quadril', 'virilha']],
      ['mao', 'Mão', 'e', ['mao', 'maos', 'punho', 'pulso']],
      ['joelho', 'Joelho', 'e', ['joelho', 'joelhos']],
      ['olhos', 'Olhos', 'd', ['olhos', 'olho']],
      ['nariz', 'Nariz', 'd', ['nariz']],
      ['braco', 'Braço', 'd', ['braco', 'bracos', 'antebraco', 'cotovelo']],
      ['coluna', 'Coluna (costas)', 'd', ['coluna', 'costas', 'lombar']],
      ['dedo', 'Dedos', 'd', ['dedo', 'dedos']],
      ['perna', 'Perna', 'd', ['perna', 'pernas', 'coxa', 'canela']],
      ['pe', 'Pé', 'd', ['pe', 'pes', 'tornozelo', 'calcanhar']],
      ['multiplas', 'Múltiplas partes', 'd', ['multiplas partes', 'multiplas', 'varias partes']]
    ];
    const conta = {}, outras = [];
    PARTES.forEach((p) => { conta[p[0]] = 0; });
    itens.forEach((it) => {
      if (!it.valor) return;
      const n = norm(it.nome);
      const p = PARTES.find((x) => x[3].includes(n));
      if (p) conta[p[0]] += it.valor; else outras.push(it);
    });
    const total = itens.reduce((s, i) => s + (i.valor || 0), 0);
    if (!total) return this.vazio(body, 'Nenhum acidente com parte do corpo informada no período.');
    const max = Math.max(1, ...PARTES.map((p) => conta[p[0]]));

    // formas de cada região: [tipo, atributos]
    const F = {
      braco: [['rect', 'x="222" y="140" width="26" height="168" rx="13" transform="rotate(10 235 140)"'], ['rect', 'x="352" y="140" width="26" height="168" rx="13" transform="rotate(-10 365 140)"']],
      perna: [['rect', 'x="262" y="292" width="36" height="206" rx="15"'], ['rect', 'x="302" y="292" width="36" height="206" rx="15"']],
      abdomen: [['rect', 'x="258" y="226" width="84" height="74" rx="12"']],
      tronco: [['rect', 'x="252" y="124" width="96" height="108" rx="20"']],
      ombro: [['ellipse', 'cx="252" cy="140" rx="22" ry="16"'], ['ellipse', 'cx="348" cy="140" rx="22" ry="16"']],
      pescoco: [['rect', 'x="289" y="100" width="22" height="26" rx="4"']],
      cabeca: [['ellipse', 'cx="300" cy="60" rx="36" ry="42"']],
      face: [['ellipse', 'cx="300" cy="74" rx="25" ry="24"']],
      olhos: [['circle', 'cx="288" cy="58" r="5"'], ['circle', 'cx="312" cy="58" r="5"']],
      nariz: [['path', 'd="M300 63 L294 80 H306 Z"']],
      mao: [['circle', 'cx="205" cy="316" r="15"'], ['circle', 'cx="395" cy="316" r="15"']],
      dedo: [['rect', 'x="194" y="326" width="5" height="17" rx="2.5"'], ['rect', 'x="202" y="328" width="5" height="18" rx="2.5"'], ['rect', 'x="210" y="326" width="5" height="17" rx="2.5"'],
        ['rect', 'x="385" y="326" width="5" height="17" rx="2.5"'], ['rect', 'x="393" y="328" width="5" height="18" rx="2.5"'], ['rect', 'x="401" y="326" width="5" height="17" rx="2.5"']],
      joelho: [['circle', 'cx="280" cy="398" r="13"'], ['circle', 'cx="320" cy="398" r="13"']],
      pe: [['ellipse', 'cx="274" cy="506" rx="25" ry="10"'], ['ellipse', 'cx="326" cy="506" rx="25" ry="10"']]
    };
    const ponto = { cabeca: [272, 34], face: [282, 86], pescoco: [290, 114], ombro: [240, 140], tronco: [266, 186], abdomen: [270, 262], mao: [196, 318], joelho: [272, 398],
      olhos: [312, 58], nariz: [304, 74], braco: [380, 222], coluna: [300, 232], dedo: [404, 340], perna: [330, 352], pe: [338, 506] };
    const ordem = ['braco', 'perna', 'abdomen', 'tronco', 'ombro', 'pescoco', 'cabeca', 'face', 'olhos', 'nariz', 'mao', 'dedo', 'joelho', 'pe'];
    const fmtA = (v) => fmtInt(v) + (v === 1 ? ' acidente' : ' acidentes');
    const dica = (k, rot) => esc('<div>' + esc(rot) + '</div><b>' + esc(fmtA(conta[k])) + '</b>' + (conta[k] ? ' · ' + Math.round(conta[k] * 100 / total) + '% do total' : ''));
    const rot = Object.fromEntries(PARTES.map((p) => [p[0], p[1]]));

    let s = '<svg class="corpo" viewBox="0 0 600 540" role="img" aria-label="Partes do corpo atingidas">';
    // silhueta
    ordem.forEach((k) => F[k].forEach(([t, a]) => { s += '<' + t + ' ' + a + ' class="corpo-base"/>'; }));
    // regiões atingidas, mais fortes quanto mais acidentes
    ordem.forEach((k) => {
      const v = conta[k];
      F[k].forEach(([t, a]) => {
        s += '<' + t + ' ' + a + ' class="corpo-reg' + (v ? ' on' : '') + '"' + (v ? ' style="fill-opacity:' + (0.3 + 0.65 * v / max).toFixed(2) + '"' : '') + ' data-tip="' + dica(k, rot[k]) + '"/>';
      });
    });
    s += '<line x1="300" y1="132" x2="300" y2="296" class="corpo-coluna' + (conta.coluna ? ' on' : '') + '" data-tip="' + dica('coluna', rot.coluna) + '"/>';
    // quadros com o número de cada parte
    const lados = { e: PARTES.filter((p) => p[2] === 'e'), d: PARTES.filter((p) => p[2] === 'd') };
    ['e', 'd'].forEach((lado) => lados[lado].forEach((p, i) => {
      const k = p[0], v = conta[k], y = 8 + i * 66, x = lado === 'e' ? 6 : 466, w = 128, hgt = 50;
      const on = v > 0;
      if (ponto[k]) {
        const [ax, ay] = ponto[k], bx = lado === 'e' ? x + w : x, by = y + hgt / 2;
        s += '<polyline points="' + bx + ',' + by + ' ' + (lado === 'e' ? bx + 14 : bx - 14) + ',' + by + ' ' + ax + ',' + ay + '" class="corpo-linha' + (on ? ' on' : '') + '"/>';
        s += '<circle cx="' + ax + '" cy="' + ay + '" r="3" class="corpo-ponto' + (on ? ' on' : '') + '"/>';
      }
      s += '<g data-tip="' + dica(k, p[1]) + '"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + hgt + '" rx="6" class="corpo-box' + (on ? ' on' : '') + '"/>';
      s += '<text x="' + (x + w / 2) + '" y="' + (y + 17) + '" text-anchor="middle" class="corpo-rot' + (on ? ' on' : '') + '">' + esc(p[1].toUpperCase()) + '</text>';
      s += '<text x="' + (x + w / 2) + '" y="' + (y + 41) + '" text-anchor="middle" class="corpo-num' + (on ? ' on' : '') + '">' + fmtInt(v) + '</text></g>';
    }));
    s += '</svg>';
    let nota = '<p class="small muted corpo-nota">' + fmtA(total) + ' com parte do corpo informada. Quanto mais forte o vermelho, mais acidentes na região.';
    if (outras.length) nota += ' Outras partes: ' + outras.map((o) => esc(o.nome) + ' (' + fmtInt(o.valor) + ')').join(', ') + '.';
    body.innerHTML = s + nota + '</p>';
  },

  /** Rosca para composição de poucas partes (até 6). itens: [{nome, valor, cor}] */
  rosca(body, { itens, fmt = fmtNum, centro }) {
    const lista = itens.filter((i) => i.valor > 0);
    const total = lista.reduce((s, i) => s + i.valor, 0);
    if (!total) return this.vazio(body);
    const W = this.largura(body);
    const lado = W >= 470; // legenda ao lado ou abaixo da rosca
    const R = 78, r = 52, lh = 24;
    const cx = lado ? 96 : W / 2, cy = 92;
    const lx = lado ? 196 : 8, ly0 = lado ? Math.max(20, cy - (lista.length * lh) / 2 + 12) : 2 * cy + 18;
    const H = lado ? Math.max(184, lista.length * lh + 24) : 2 * cy + 10 + lista.length * lh;
    const maxCh = Math.max(8, Math.floor((W - lx - 18 - 92) / 6.6));
    let a0 = -Math.PI / 2, s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img">';
    lista.forEach((it, i) => {
      const ang = (it.valor / total) * Math.PI * 2;
      const a1 = a0 + ang;
      const gap = lista.length > 1 ? 0.012 : 0;
      const p = (a, rad) => (cx + rad * Math.cos(a)).toFixed(2) + ',' + (cy + rad * Math.sin(a)).toFixed(2);
      const large = ang > Math.PI ? 1 : 0;
      const d = lista.length === 1
        ? 'M' + (cx - R) + ',' + cy + 'A' + R + ',' + R + ' 0 1 1 ' + (cx + R) + ',' + cy + 'A' + R + ',' + R + ' 0 1 1 ' + (cx - R) + ',' + cy +
          'M' + (cx - r) + ',' + cy + 'A' + r + ',' + r + ' 0 1 0 ' + (cx + r) + ',' + cy + 'A' + r + ',' + r + ' 0 1 0 ' + (cx - r) + ',' + cy + 'Z'
        : 'M' + p(a0 + gap, R) + 'A' + R + ',' + R + ' 0 ' + large + ' 1 ' + p(a1 - gap, R) + 'L' + p(a1 - gap, r) + 'A' + r + ',' + r + ' 0 ' + large + ' 0 ' + p(a0 + gap, r) + 'Z';
      const pct = Math.round((it.valor / total) * 100);
      s += '<path class="mark" data-g="' + i + '" fill-rule="evenodd" d="' + d + '" fill="' + (it.cor || CAT[i]) + '" data-tip="' + esc('<div>' + esc(it.nome) + '</div><b>' + esc(fmt(it.valor)) + '</b> (' + pct + '%)') + '"/>';
      a0 = a1;
    });
    s += '<text x="' + cx + '" y="' + (cy + 2) + '" text-anchor="middle" style="font-size:22px;font-weight:700;fill:var(--ink)">' + esc(centro != null ? centro : fmt(total)) + '</text>';
    s += '<text class="tick" x="' + cx + '" y="' + (cy + 20) + '" text-anchor="middle">total</text>';
    lista.forEach((it, i) => {
      const y = ly0 + i * lh;
      const pct = Math.round((it.valor / total) * 100);
      const nome = String(it.nome).length > maxCh ? String(it.nome).slice(0, maxCh - 1) + '…' : String(it.nome);
      s += '<g class="mark" data-g="' + i + '"><rect x="' + lx + '" y="' + (y - 10) + '" width="12" height="12" rx="3" fill="' + (it.cor || CAT[i]) + '"/>';
      s += '<text class="lbl" x="' + (lx + 18) + '" y="' + y + '"><title>' + esc(it.nome) + '</title>' + esc(nome) + '</text>';
      s += '<text class="val" x="' + (W - 8) + '" y="' + y + '" text-anchor="end">' + esc(fmt(it.valor)) + ' · ' + pct + '%</text></g>';
      s += '<rect class="hit" data-g="' + i + '" data-tip="' + esc('<div>' + esc(it.nome) + '</div><b>' + esc(fmt(it.valor)) + '</b> (' + pct + '%)') + '" x="' + lx + '" y="' + (y - 16) + '" width="' + (W - lx) + '" height="' + lh + '"/>';
    });
    body.innerHTML = s + '</svg>';
  },

  /** Linhas ao longo do tempo (meses). series: [{nome, valores, cor}] */
  linhas(body, { cats, series, fmt = fmtNum }) {
    const tem = series.some((s) => s.valores.some((v) => v));
    if (!tem) return this.vazio(body);
    const { max, passo } = this.escala(Math.max(...series.flatMap((s) => s.valores.map((v) => v || 0))));
    const W = this.largura(body), H = 230, ml = Math.max(32, String(fmt(max)).length * 6.6 + 12), mr = 10, mt = 14, mb = 30;
    const iw = W - ml - mr, ih = H - mt - mb;
    const x = (i) => ml + (cats.length === 1 ? iw / 2 : (i / (cats.length - 1)) * iw);
    const y = (v) => mt + ih - (v / max) * ih;
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img">';
    for (let v = 0; v <= max + 1e-9; v += passo) {
      s += '<line class="gridline" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y(v) + '" y2="' + y(v) + '"/>';
      s += '<text class="tick" x="' + (ml - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + esc(fmt(v)) + '</text>';
    }
    const pr = Math.ceil(cats.length / Math.max(4, Math.floor(iw / 42)));
    cats.forEach((c, i) => { if (i % pr === 0) s += '<text class="tick" x="' + x(i) + '" y="' + (H - 10) + '" text-anchor="middle">' + esc(c) + '</text>'; });
    series.forEach((se, j) => {
      const cor = se.cor || CAT[j];
      s += '<polyline class="mark" data-g="s' + j + '" fill="none" stroke="' + cor + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="' +
        se.valores.map((v, i) => x(i) + ',' + y(v || 0)).join(' ') + '"/>';
      se.valores.forEach((v, i) => { if (v) s += '<circle class="mark" data-g="s' + j + '" cx="' + x(i) + '" cy="' + y(v) + '" r="4" fill="' + cor + '" stroke="var(--chart-surface)" stroke-width="2"/>'; });
    });
    const bw = iw / Math.max(1, cats.length - 1);
    cats.forEach((c, i) => {
      const tip = '<div>' + esc(c) + '</div>' + series.map((se, j) => '<div><span style="color:' + (se.cor || CAT[j]) + '">●</span> ' + esc(se.nome) + ': <b>' + esc(fmt(se.valores[i] || 0)) + '</b></div>').join('');
      s += '<rect class="hit" data-tip="' + esc(tip) + '" x="' + (x(i) - bw / 2) + '" y="' + mt + '" width="' + bw + '" height="' + ih + '"/>';
    });
    s += '<line class="baseline" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y(0) + '" y2="' + y(0) + '"/></svg>';
    body.innerHTML = s + this.legenda(series);
  },

  /** Pirâmide (Bird): níveis do topo para a base. */
  piramide(body, { niveis }) {
    if (!niveis.some((n) => n.valor)) return this.vazio(body, 'Nenhuma ocorrência registrada.');
    const W = this.largura(body, 420), lh = 34, H = niveis.length * lh + 6, cx = 190;
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img">';
    niveis.forEach((n, i) => {
      const meia = 30 + i * (150 / Math.max(1, niveis.length - 1));
      const maxCh = Math.max(10, Math.floor((W - cx - 196) / 6.4));
      const y = 3 + i * lh;
      s += '<path class="mark" data-g="' + i + '" d="M' + (cx - meia) + ',' + (y + lh - 3) + 'L' + (cx - meia + 14) + ',' + y + 'H' + (cx + meia - 14) + 'L' + (cx + meia) + ',' + (y + lh - 3) + 'Z" fill="' + n.cor + '" data-tip="' + esc('<div>' + esc(n.nome) + '</div><b>' + fmtInt(n.valor) + '</b>') + '"/>';
      s += '<text class="val" x="' + cx + '" y="' + (y + 21) + '" text-anchor="middle" style="fill:#fff">' + fmtInt(n.valor) + '</text>';
      s += '<text class="lbl" x="' + (cx + 192) + '" y="' + (y + 21) + '"><title>' + esc(n.nome) + '</title>' + esc(n.nome.length > maxCh ? n.nome.slice(0, maxCh - 1) + '…' : n.nome) + '</text>';
    });
    body.innerHTML = s + '</svg>';
  }
};
