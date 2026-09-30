/*
 * Conteúdo do estudo: trilhas, lições desenhadas passo a passo (SVG) e
 * exercícios práticos.
 *
 * Fontes das técnicas:
 *  - Betty Edwards, "Desenhando com o Lado Direito do Cérebro" (exercícios de percepção,
 *    forma vazia da cabeça, aferição, espaços negativos, sombras como formas).
 *  - Andrew Loomis, "Drawing the Head and Hands" (bola e plano, cruz, três terços, unidades).
 *  - Estudos de referência enviados pelo usuário (partes do rosto em quatro ângulos,
 *    nariz visto de baixo em quatro etapas, proporções do rosto).
 * Todos os textos foram escritos para este aplicativo; nenhum trecho dos livros é reproduzido.
 *
 * Em cada etapa: traço novo em vermelho, etapas anteriores em azul-claro.
 */
const Licoes = (() => {
  const f = (n) => (Math.round(n * 10) / 10).toString();
  const L = (x1, y1, x2, y2, k = '') => `<line class="l ${k}" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`;
  const C = (x, y, r, k = '') => `<circle class="l ${k}" cx="${f(x)}" cy="${f(y)}" r="${f(r)}"/>`;
  const E = (x, y, rx, ry, k = '', rot = 0) => `<ellipse class="l ${k}" cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}"${rot ? ` transform="rotate(${rot} ${f(x)} ${f(y)})"` : ''}/>`;
  const P = (d, k = '') => `<path class="l ${k}" d="${d}"/>`;
  const T = (x, y, s, anc = 'start') => `<text class="tx" x="${f(x)}" y="${f(y)}" text-anchor="${anc}">${s}</text>`;
  const Pt = (x, y, r = 3.5) => `<circle class="pt" cx="${f(x)}" cy="${f(y)}" r="${r}"/>`;
  const poli = (pts) => 'M' + pts.map((p) => f(p[0]) + ',' + f(p[1])).join('L');

  // Hachura: linhas paralelas cobrindo um retângulo, num ângulo dado
  function hachura(x, y, w, h, ang, esp) {
    const cx = x + w / 2, cy = y + h / 2, R = Math.hypot(w, h) / 2;
    const a = ang * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
    let d = '';
    for (let s = -R; s <= R; s += esp) {
      const px = cx + nx * s, py = cy + ny * s;
      d += `M${f(px - dx * R)},${f(py - dy * R)}L${f(px + dx * R)},${f(py + dy * R)}`;
    }
    return d;
  }

  const CSS = [
    '.l{fill:none;stroke-linecap:round;stroke-linejoin:round}',
    '.ant .l{stroke:#8ea3c4;stroke-width:1.6}',
    '.novo .l{stroke:#c8452c;stroke-width:2.4}',
    '.fin .l{stroke:#2e2925;stroke-width:1.8}',
    '.l.g{stroke-dasharray:6 6;stroke-width:1.2}',
    '.ant .l.g{stroke-width:1}',
    '.fin .l.g,.fin .l.c,.fin .tx,.fin .pt,.ant .tx{display:none}',
    '.ant .l.h,.novo .l.h,.fin .l.h{stroke-width:.9}',
    '.tx{font:600 13px system-ui,-apple-system,Segoe UI,Roboto,sans-serif}',
    '.novo .tx{fill:#c8452c}',
    '.pt{stroke:none}.ant .pt{fill:#8ea3c4}.novo .pt{fill:#c8452c}'
  ].join('');

  // Monta o SVG de uma etapa: anteriores em azul, atual em vermelho,
  // ou o acabamento final (todas as linhas em grafite + sombreado).
  function svgEtapa(licao, i, op = {}) {
    const vb = licao.vb || [400, 400];
    const passos = licao.passos;
    const p = passos[i];
    const juntar = (arr) => (arr || []).join('');
    let corpo;
    if (p.final) {
      const todas = passos.filter((q) => !q.final).map((q) => juntar(q.g)).join('');
      corpo = `<g class="fin">${juntar(p.fundo)}${p.semLinhas ? '' : todas}${juntar(p.g)}</g>`;
    } else {
      const ant = passos.slice(0, i).filter((q) => !q.final).map((q) => juntar(q.g)).join('');
      corpo = `<g class="ant">${ant}</g><g class="novo">${juntar(p.fundo)}${juntar(p.g)}</g>`;
    }
    const tam = op.tamanho || 800;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vb[0]} ${vb[1]}" width="${tam}" height="${Math.round(tam * vb[1] / vb[0])}"><style>${CSS}</style><rect width="${vb[0]}" height="${vb[1]}" fill="#fbf8f2"/>${licao.defs ? `<defs>${licao.defs}</defs>` : ''}${licao.escala ? `<g transform="${licao.escala}">${corpo}</g>` : corpo}</svg>`;
  }

  // ---------------------------------------------------------------
  // FORMAS BÁSICAS
  // ---------------------------------------------------------------
  const esfera = {
    id: 'esfera', titulo: 'Esfera', fonte: 'Fundamentos',
    resumo: 'A forma mais simples para entender luz, meio-tom e sombra.',
    defs: `<radialGradient id="esf-luz" cx="36%" cy="32%" r="70%"><stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#ddd7cd"/><stop offset=".62" stop-color="#8a8378"/><stop offset=".8" stop-color="#4c463f"/><stop offset="1" stop-color="#6e675e"/></radialGradient><radialGradient id="esf-sombra" cx="30%" cy="50%" r="70%"><stop offset="0" stop-color="#2b2723" stop-opacity=".75"/><stop offset="1" stop-color="#2b2723" stop-opacity="0"/></radialGradient>`,
    passos: [
      { t: 'Contorno', txt: 'Desenhe um círculo leve, movendo o braço inteiro e não só o pulso. Repita o giro no ar antes de encostar o lápis. Não precisa sair perfeito na primeira volta; reforce a linha que ficou mais redonda.', g: [C(200, 190, 110), T(200, 60, 'contorno leve', 'middle')] },
      { t: 'Eixos de volume', txt: 'Uma linha vertical e uma elipse no meio mostram que o círculo é uma bola. A elipse do "equador" faz o olho ler volume, e não um disco chapado.', g: [L(200, 70, 200, 310, 'g'), E(200, 190, 110, 32, 'g'), T(318, 196, 'equador')] },
      { t: 'Direção da luz e linha de sombra', txt: 'Escolha de onde vem a luz (aqui, do alto à esquerda). O ponto de brilho fica voltado para ela. A linha de sombra, chamada terminador, é a curva onde a bola deixa de receber luz direta; ela fica do lado oposto à luz.', g: [C(70, 62, 12), L(88, 80, 135, 122, 'g'), E(158, 146, 14, 10), P('M122.2,267.8 A110,42 -45 0 0 277.8,112.2'), T(20, 40, 'luz'), T(284, 106, 'terminador')] },
      { t: 'Sombra projetada', txt: 'A bola bloqueia a luz e projeta uma sombra no chão, do lado oposto à luz. Logo abaixo do ponto de contato fica a parte mais escura de todo o desenho: a sombra de contato.', g: [E(252, 302, 118, 20), P('M170,300 Q200,306 232,300'), T(250, 345, 'sombra projetada', 'middle'), T(110, 318, 'contato', 'end')] },
      { t: 'Acabamento', final: true, txt: 'Escureça a sombra própria, deixe o brilho com o branco do papel e mantenha uma faixa um pouco mais clara na borda de baixo: é a luz refletida pelo chão. Ela nunca fica tão clara quanto o lado iluminado.', fundo: [`<ellipse cx="252" cy="302" rx="118" ry="20" fill="url(#esf-sombra)"/>`, `<circle cx="200" cy="190" r="110" fill="url(#esf-luz)"/>`], semLinhas: true, g: [`<path d="M168,300 Q200,308 234,300" stroke="#1f1c19" stroke-width="4" fill="none" stroke-linecap="round"/>`] }
    ]
  };

  // Cubo em dois pontos de fuga (coordenadas calculadas)
  const cubo = (() => {
    const H = 110, P1 = [20, H], P2 = [380, H];
    const A = [200, 190], B = [200, 320];
    const Lt = [120, 154.4], Lb = [120, 226.7], Rt = [290, 150], Rb = [290, 215];
    const Tt = [212.8, 138.6], Tb = [212.9, 185];
    return {
      id: 'cubo', titulo: 'Cubo em dois pontos de fuga', fonte: 'Fundamentos',
      resumo: 'Caixas bem construídas são a base de móveis, prédios e até da cabeça.',
      passos: [
        { t: 'Linha do horizonte', txt: 'A linha do horizonte é a altura dos seus olhos. Marque nela dois pontos de fuga, bem afastados um do outro. Quanto mais longe ficarem, menos distorcido o cubo parece.', g: [L(0, H, 400, H, 'g'), Pt(...P1), Pt(...P2), T(24, 98, 'PF1'), T(376, 98, 'PF2', 'end'), T(200, 98, 'nível dos olhos', 'middle')] },
        { t: 'Aresta da frente', txt: 'Desenhe a aresta vertical mais próxima de você. Linhas verticais continuam verticais no desenho, não importa o ângulo.', g: [L(...A, ...B)] },
        { t: 'Linhas de fuga', txt: 'Ligue as duas pontas da aresta aos dois pontos de fuga, com traço leve. Todas as arestas horizontais do cubo vão seguir essas direções.', g: [L(...A, ...P1, 'g'), L(...B, ...P1, 'g'), L(...A, ...P2, 'g'), L(...B, ...P2, 'g')] },
        { t: 'Arestas laterais', txt: 'Escolha a profundidade de cada lado com duas verticais. O lado mais virado para você fica mais largo. Confira se as faces parecem quadradas; se parecerem compridas, aproxime as verticais.', g: [L(...Lt, ...Lb), L(...Rt, ...Rb), L(...A, ...Lt), L(...B, ...Lb), L(...A, ...Rt), L(...B, ...Rb)] },
        { t: 'Face de cima e arestas ocultas', txt: 'Cruze as linhas de fuga vindas dos cantos laterais para achar o canto de trás. Desenhe também as arestas escondidas, tracejadas: elas mostram se a caixa está coerente por inteiro.', g: [L(...Lt, ...P2, 'g'), L(...Rt, ...P1, 'g'), L(...Lt, ...Tt), L(...Rt, ...Tt), L(...Tt, ...Tb, 'g'), L(...Tb, ...Lb, 'g'), L(...Tb, ...Rb, 'g')] },
        { t: 'Acabamento', final: true, txt: 'Com a luz vindo da esquerda e do alto, a face de cima fica mais clara, a da esquerda em meio-tom e a da direita escura. Nas formas retas, a passagem de luz para sombra é brusca, na própria aresta; nas redondas, é gradual.', fundo: [`<polygon points="200,320 290,215 386,229 330,342" fill="#2b2723" opacity=".28"/>`, `<polygon points="${[A, Lt, Tt, Rt].join(' ')}" fill="#eee9e0"/>`, `<polygon points="${[A, Lt, Lb, B].join(' ')}" fill="#bbb4a9"/>`, `<polygon points="${[A, Rt, Rb, B].join(' ')}" fill="#6f685f"/>`] }
      ]
    };
  })();

  const cilindro = {
    id: 'cilindro', titulo: 'Cilindro', fonte: 'Fundamentos',
    resumo: 'Copos, troncos, braços e pescoço partem desta forma.',
    defs: `<linearGradient id="cil-g" x1="0" x2="1"><stop offset="0" stop-color="#cfc8bd"/><stop offset=".25" stop-color="#f4f0e9"/><stop offset=".62" stop-color="#8a8378"/><stop offset=".86" stop-color="#4f4942"/><stop offset="1" stop-color="#6c655c"/></linearGradient>`,
    passos: [
      { t: 'Eixo', txt: 'Comece pelo eixo central. Ele define a inclinação do objeto inteiro; se o eixo estiver torto, o cilindro todo tomba.', g: [L(200, 60, 200, 345, 'g')] },
      { t: 'Elipse de cima', txt: 'A boca do cilindro é um círculo visto de lado, então vira uma elipse. O eixo corta a elipse bem no meio e faz ângulo reto com o eixo maior dela.', g: [E(200, 100, 90, 24)] },
      { t: 'Elipse da base', txt: 'A base fica mais abaixo do nível dos olhos, por isso a elipse dela é um pouco mais aberta que a de cima. Desenhe a volta inteira; a metade de trás fica tracejada.', g: [P('M110,310 A90,32 0 0 0 290,310'), P('M110,310 A90,32 0 0 1 290,310', 'g'), T(300, 350, 'mais aberta embaixo')] },
      { t: 'Laterais', txt: 'Ligue as pontas das elipses com duas retas paralelas ao eixo. Elas tocam as elipses exatamente nas extremidades, sem formar bico.', g: [L(110, 100, 110, 310), L(290, 100, 290, 310)] },
      { t: 'Acabamento', final: true, txt: 'No cilindro a luz corre em faixas verticais: claro, meio-tom, sombra e, junto à borda da sombra, uma faixa de luz refletida. A tampa, virada para a luz, é a área mais clara.', fundo: [`<ellipse cx="275" cy="318" rx="115" ry="26" fill="#2b2723" opacity=".22"/>`, `<path d="M110,100 L110,310 A90,32 0 0 0 290,310 L290,100 Z" fill="url(#cil-g)"/>`, `<ellipse cx="200" cy="100" rx="90" ry="24" fill="#f7f4ee"/>`] }
    ]
  };

  const cone = {
    id: 'cone', titulo: 'Cone', fonte: 'Fundamentos',
    resumo: 'Base do nariz, de chapéus e de muitas formas que afinam.',
    defs: `<linearGradient id="cone-g" x1="0" x2="1"><stop offset="0" stop-color="#d7d0c5"/><stop offset=".3" stop-color="#f3efe8"/><stop offset=".66" stop-color="#7e776d"/><stop offset=".9" stop-color="#4b453e"/><stop offset="1" stop-color="#655e56"/></linearGradient>`,
    passos: [
      { t: 'Eixo', txt: 'Trace o eixo e marque a altura: onde fica a ponta e onde fica o centro da base.', g: [L(200, 55, 200, 345, 'g'), Pt(200, 70), Pt(200, 300)] },
      { t: 'Base', txt: 'A base é uma elipse com o centro no eixo. Desenhe a volta completa, deixando a parte de trás tracejada.', g: [P('M100,300 A100,28 0 0 0 300,300'), P('M100,300 A100,28 0 0 1 300,300', 'g')] },
      { t: 'Laterais', txt: 'Ligue a ponta às duas extremidades da elipse. As laterais encostam na elipse sem cruzá-la.', g: [L(200, 70, 100, 300), L(200, 70, 300, 300)] },
      { t: 'Acabamento', final: true, txt: 'As faixas de tom convergem para a ponta, como raios. É assim que o cone mostra que está afinando.', fundo: [`<ellipse cx="282" cy="308" rx="105" ry="22" fill="#2b2723" opacity=".22"/>`, `<path d="M200,70 L100,300 A100,28 0 0 0 300,300 Z" fill="url(#cone-g)"/>`] }
    ]
  };

  // ---------------------------------------------------------------
  // LUZ E SOMBRA
  // ---------------------------------------------------------------
  const valores = (() => {
    const caixas = [25, 95, 165, 235, 305];
    const tons = ['#fbf8f2', '#cdc6bb', '#8d867b', '#4f4a44', '#1f1c19'];
    const rect = (i, fill) => `<rect x="${caixas[i]}" y="130" width="70" height="80" fill="${fill}"/>`;
    const moldura = caixas.map((x) => `<rect class="l" x="${x}" y="130" width="70" height="80"/>`).join('');
    return {
      id: 'valores', titulo: 'Escala de valores', fonte: 'Betty Edwards, cap. 11',
      resumo: 'Treine a mão para produzir cinco tons distintos, do branco ao preto.',
      defs: `<linearGradient id="val-g" x1="0" x2="1"><stop offset="0" stop-color="#fbf8f2"/><stop offset="1" stop-color="#1f1c19"/></linearGradient>`,
      passos: [
        { t: 'Cinco caixas', txt: 'Valor é o quanto um tom é claro ou escuro. Desenhe cinco caixas lado a lado. No lápis, o branco mais claro que existe é o próprio papel.', g: [moldura] },
        { t: 'Os extremos', txt: 'Deixe a primeira caixa em branco e escureça a última o máximo que o seu lápis permitir, com camadas, sem afundar a ponta.', g: [rect(4, tons[4]), T(60, 235, 'papel', 'middle'), T(340, 235, 'o mais escuro', 'middle')] },
        { t: 'O meio', txt: 'Preencha a caixa do meio com um cinza que pareça estar exatamente entre o branco e o preto. Aperte os olhos para comparar.', g: [rect(2, tons[2]), T(200, 235, 'meio-tom', 'middle')] },
        { t: 'Os intermediários', txt: 'Complete as duas caixas restantes. Cada salto de tom deve parecer do mesmo tamanho.', g: [rect(1, tons[1]), rect(3, tons[3])] },
        { t: 'Degradê contínuo', txt: 'Agora faça uma faixa longa que vá do branco ao preto sem degraus visíveis. É esta passagem suave que dá volume às formas redondas.', g: [`<rect x="25" y="270" width="350" height="46" fill="url(#val-g)"/>`, `<rect class="l" x="25" y="270" width="350" height="46"/>`] },
        { t: 'Resultado', final: true, txt: 'Guarde esta escala perto de você. Ao desenhar, compare cada área do modelo com ela e pergunte: este tom é o 2, o 3 ou o 4?', fundo: tons.map((c, i) => rect(i, c)) }
      ]
    };
  })();

  const hachuraLicao = (() => {
    const q = [[30, 40], [215, 40], [30, 215], [215, 215]], w = 155;
    const clip = q.map((p, i) => `<clipPath id="hq${i}"><rect x="${p[0]}" y="${p[1]}" width="${w}" height="${w}"/></clipPath>`).join('');
    const camada = (i, ang, esp) => `<path class="l h" clip-path="url(#hq${i})" d="${hachura(q[i][0], q[i][1], w, w, ang, esp)}"/>`;
    const moldura = (i) => `<rect class="l" x="${q[i][0]}" y="${q[i][1]}" width="${w}" height="${w}"/>`;
    const esf = `<clipPath id="he"><circle cx="200" cy="200" r="130"/></clipPath><clipPath id="he2"><circle cx="262" cy="258" r="150"/></clipPath><clipPath id="he3"><circle cx="292" cy="290" r="130"/></clipPath><mask id="hm"><rect width="400" height="400" fill="#fff"/><circle cx="150" cy="148" r="46" fill="#000"/></mask><clipPath id="hs"><ellipse cx="262" cy="338" rx="120" ry="22"/></clipPath>`;
    return {
      id: 'hachura', titulo: 'Hachura cruzada', fonte: 'Betty Edwards, cap. 11',
      resumo: 'Construir tons sobrepondo conjuntos de traços paralelos.',
      defs: clip + esf,
      passos: [
        { t: 'Um conjunto', txt: 'Faça traços curtos, rápidos e paralelos, todos na mesma direção. Mova a mão pelo papel em vez de girar o pulso.', g: [moldura(0), camada(0, 45, 9)] },
        { t: 'Dois conjuntos', txt: 'Sobre o primeiro conjunto, faça outro com um ângulo só um pouco diferente. O tom escurece sem virar mancha.', g: [moldura(1), camada(1, 45, 9), camada(1, 70, 9)] },
        { t: 'Três conjuntos', txt: 'Mude a posição da mão e acrescente uma terceira camada. Cada camada nova escurece o tom um degrau.', g: [moldura(2), camada(2, 45, 8), camada(2, 70, 8), camada(2, 10, 8)] },
        { t: 'Quatro conjuntos', txt: 'Continue somando camadas até chegar ao tom desejado. Onde quiser uma passagem suave, afaste um pouco os traços.', g: [moldura(3), camada(3, 45, 7), camada(3, 70, 7), camada(3, 10, 7), camada(3, 135, 7)] },
        {
          t: 'Aplicando numa esfera', final: true, semLinhas: true,
          txt: 'Use menos camadas no lado da luz e mais no lado da sombra. O brilho fica sem traço nenhum. A hachura deixa o desenho vivo, com sensação de ar em volta da forma.',
          g: [
            `<g mask="url(#hm)"><path class="l h" clip-path="url(#he)" d="${hachura(60, 60, 280, 280, 45, 8)}"/></g>`,
            `<g clip-path="url(#he)"><path class="l h" clip-path="url(#he2)" d="${hachura(60, 60, 280, 280, 70, 7)}"/></g>`,
            `<g clip-path="url(#he)"><path class="l h" clip-path="url(#he3)" d="${hachura(60, 60, 280, 280, 15, 6)}"/></g>`,
            `<path class="l h" clip-path="url(#hs)" d="${hachura(140, 312, 250, 52, 30, 5)}${hachura(140, 312, 250, 52, 150, 5)}"/>`,
            `<circle cx="200" cy="200" r="130" fill="none" stroke="#2e2925" stroke-width="1.4"/>`
          ]
        }
      ]
    };
  })();

  // ---------------------------------------------------------------
  // PERSPECTIVA: rua com um ponto de fuga
  // ---------------------------------------------------------------
  const rua = (() => {
    const H = 170, PF = [200, H];
    const naLinha = (x, y0) => y0 + (H - y0) * (x / 200); // reta de (0,y0) até o PF
    const esp = (x) => 400 - x;
    const verticais = [60, 112, 146, 168];
    const vert = [], jan = [], janFill = [];
    for (const x of verticais) {
      vert.push(L(x, naLinha(x, 60), x, naLinha(x, 380)), L(esp(x), naLinha(x, 60), esp(x), naLinha(x, 380)));
    }
    const faixas = [[0, 60], [60, 112], [112, 146], [146, 168]];
    for (const [a, b] of faixas) {
      const m = (b - a) * 0.2, xa = a + m, xb = b - m;
      for (const [yt, yb] of [[120, 200], [240, 320]]) {
        const pts = [[xa, naLinha(xa, yt)], [xb, naLinha(xb, yt)], [xb, naLinha(xb, yb)], [xa, naLinha(xa, yb)]];
        const ptsE = pts.map(([x, y]) => [esp(x), y]);
        jan.push(P(poli(pts) + 'Z'), P(poli(ptsE) + 'Z'));
        janFill.push(`<path d="${poli(pts)}Z" fill="#4a443e"/>`, `<path d="${poli(ptsE)}Z" fill="#2f2b27"/>`);
      }
    }
    return {
      id: 'rua', titulo: 'Rua com um ponto de fuga', fonte: 'Perspectiva',
      resumo: 'A cena clássica da capa do livro: fachadas que convergem para um ponto.',
      passos: [
        { t: 'Horizonte e ponto de fuga', txt: 'Trace a linha do horizonte na altura dos seus olhos e marque um único ponto de fuga. Numa rua vista de frente, tudo o que se afasta converge para ele.', g: [L(0, H, 400, H, 'g'), Pt(...PF), T(208, 158, 'PF')] },
        { t: 'Leito da rua', txt: 'As bordas da rua saem da parte de baixo do papel e vão para o ponto de fuga.', g: [L(90, 400, ...PF), L(310, 400, ...PF)] },
        { t: 'Linhas das fachadas', txt: 'O topo e a base das fachadas também vão para o ponto de fuga. Acima do horizonte as linhas descem até ele; abaixo, sobem.', g: [L(0, 60, ...PF, 'g'), L(0, 380, ...PF, 'g'), L(400, 60, ...PF, 'g'), L(400, 380, ...PF, 'g')] },
        { t: 'Divisões verticais', txt: 'Separe os prédios com verticais. Repare que o espaço entre elas diminui à medida que se afastam: é isso que cria a profundidade.', g: vert },
        { t: 'Janelas', txt: 'O topo e a base de cada fileira de janelas também seguem para o ponto de fuga. Janelas mais distantes ficam mais estreitas e mais próximas entre si.', g: [L(0, 120, ...PF, 'g'), L(0, 200, ...PF, 'g'), L(0, 240, ...PF, 'g'), L(0, 320, ...PF, 'g'), L(400, 120, ...PF, 'g'), L(400, 200, ...PF, 'g'), L(400, 240, ...PF, 'g'), L(400, 320, ...PF, 'g'), ...jan] },
        {
          t: 'Acabamento', final: true, txt: 'Dê um tom para cada plano: uma fachada clara, a outra em sombra, a rua em meio-tom. Planos diferentes com tons diferentes deixam a cena legível de longe.',
          fundo: [`<path d="${poli([[0, 60], PF, [0, 380]])}Z" fill="#e7e1d6"/>`, `<path d="${poli([[400, 60], PF, [400, 380]])}Z" fill="#9d968b"/>`, `<path d="${poli([[0, 400], [0, 380], PF, [400, 380], [400, 400]])}Z" fill="#cfc8bc"/>`, ...janFill]
        }
      ]
    };
  })();

  // ---------------------------------------------------------------
  // RETRATO
  // ---------------------------------------------------------------
  // Proporções de frente: forma vazia de Betty Edwards + estudo de proporções
  const proporcoes = (() => {
    const A = 30, B = 115, Cc = 200, D = 285, Ee = 370, boca = D + (Ee - D) / 3;
    const cab = 'M200,30 C265,30 313,82 313,160 C313,222 303,272 283,302 C263,334 232,370 200,370 C168,370 137,334 117,302 C97,272 87,222 87,160 C87,82 135,30 200,30 Z';
    const olho = (x1, x2) => P(`M${x1},200 Q${(x1 + x2) / 2},185 ${x2},200 Q${(x1 + x2) / 2},213 ${x1},200 Z`);
    const quintos = [87, 132.2, 177.4, 222.6, 267.8, 313];
    return {
      id: 'proporcoes', titulo: 'Proporções do rosto de frente', fonte: 'Betty Edwards, cap. 9',
      resumo: 'A forma vazia da cabeça e as medidas que quase todo iniciante erra.',
      passos: [
        { t: 'Forma vazia', txt: 'Comece por um oval um pouco mais largo em cima, que representa o crânio visto de frente. Pense no tamanho total da cabeça antes de qualquer traço do rosto.', g: [P(cab)] },
        { t: 'Eixo central e nível dos olhos', txt: 'Divida o oval ao meio com uma vertical (o eixo central). Agora a medida mais importante: os olhos ficam na metade da altura da cabeça, e não no terço de cima. Colocar os olhos alto demais corta o topo do crânio, erro que Betty Edwards chama de crânio truncado.', g: [L(200, 18, 200, 382, 'g'), L(68, Cc, 332, Cc), T(330, Cc - 8, 'olhos: metade', 'end')] },
        { t: 'Divisões horizontais', txt: 'Marque a linha do cabelo (B) e a base do nariz (D), dividindo a cabeça em quatro faixas. A boca fica a um terço do caminho entre a base do nariz e o queixo.', g: [L(68, A, 332, A, 'g'), L(68, B, 332, B, 'g'), L(68, D, 332, D, 'g'), L(68, Ee, 332, Ee, 'g'), L(120, boca, 280, boca, 'g'), T(62, A + 4, 'A', 'end'), T(62, B + 4, 'B', 'end'), T(62, D + 4, 'D', 'end'), T(62, Ee + 4, 'E', 'end'), T(290, boca + 4, 'boca')] },
        { t: 'Olhos', txt: 'Divida a linha dos olhos em cinco partes iguais. Os olhos ocupam a segunda e a quarta. O espaço entre eles tem a largura de um olho.', g: [...quintos.map((x) => L(x, Cc - 10, x, Cc + 10)), olho(132.2, 177.4), olho(222.6, 267.8), C(154.8, 200, 8), C(245.2, 200, 8)] },
        { t: 'Nariz', txt: 'Desça uma linha do canto interno de cada olho: ela encontra a borda das narinas. O nariz é mais largo do que parece.', g: [L(177.4, 200, 177.4, D, 'g'), L(222.6, 200, 222.6, D, 'g'), P('M183,268 Q170,281 181,289'), P('M217,268 Q230,281 219,289'), P('M187,288 Q194,294 200,290 Q206,294 213,288'), P('M190,215 Q187,245 184,266'), P('M210,215 Q213,245 216,266')] },
        { t: 'Boca', txt: 'Desça uma linha do centro de cada pupila: ela marca os cantos da boca. A linha entre os lábios é a mais escura; as bordas externas dos lábios são só mudança de cor, então use traço leve.', g: [L(154.8, 208, 154.8, boca + 6, 'g'), L(245.2, 208, 245.2, boca + 6, 'g'), P(`M155,${boca} Q178,${boca - 5} 200,${boca - 2} Q222,${boca - 5} 245,${boca}`), P(`M161,${boca - 1} Q180,${boca - 15} 193,${boca - 12} Q200,${boca - 16} 207,${boca - 12} Q220,${boca - 15} 239,${boca - 1}`), P(`M163,${boca + 2} Q200,${boca + 24} 237,${boca + 2}`)] },
        { t: 'Sobrancelhas, orelhas e pescoço', txt: 'As orelhas ficam entre a linha dos olhos e a base do nariz. O pescoço tem quase a largura da mandíbula na altura das orelhas; pescoço fino demais é outro erro comum.', g: [P('M128,185 Q152,172 180,180'), P('M220,180 Q248,172 272,185'), P('M88,198 C70,193 67,230 75,255 C80,274 88,285 97,283'), P('M312,198 C330,193 333,230 325,255 C320,274 312,285 303,283'), P('M142,338 C138,360 134,385 132,400'), P('M258,338 C262,360 266,385 268,400')] },
        { t: 'Acabamento', final: true, txt: 'Apague as linhas de construção e confira as medidas com o lápis: olhos na metade, cinco larguras de olho na linha dos olhos, cantos da boca sob as pupilas.', fundo: [`<ellipse cx="200" cy="300" rx="25" ry="7" fill="#2b2723" opacity=".12"/>`, `<path d="M213,215 Q222,250 222,282 Q216,286 212,284 Q214,250 209,215 Z" fill="#2b2723" opacity=".14"/>`, `<ellipse cx="200" cy="${boca + 18}" rx="22" ry="5" fill="#2b2723" opacity=".16"/>`, `<circle cx="154.8" cy="200" r="7" fill="#3a3530"/>`, `<circle cx="245.2" cy="200" r="7" fill="#3a3530"/>`] }
      ]
    };
  })();

  const perfil = {
    id: 'perfil', titulo: 'Cabeça de perfil', fonte: 'Betty Edwards, cap. 9 e 10',
    resumo: 'Onde fica a orelha e onde o pescoço encontra o crânio.',
    passos: [
      { t: 'Forma vazia de perfil', txt: 'De lado, o crânio é mais largo que de frente: o oval se estende bastante para trás. Muitos iniciantes desenham a nuca curta demais.', g: [P('M205,40 C290,40 345,100 345,185 C345,245 320,290 290,315 C260,340 215,362 165,362 C125,362 100,335 97,295 C94,250 92,210 96,170 C102,95 145,40 205,40 Z', 'c')] },
      { t: 'Nível dos olhos', txt: 'Também de perfil os olhos ficam na metade da altura. Meça com o lápis: do topo da cabeça até os olhos é a mesma distância que dos olhos até o queixo.', g: [L(70, 200, 360, 200, 'c'), L(372, 40, 372, 200, 'c'), L(372, 200, 372, 360, 'c'), L(364, 40, 380, 40, 'c'), L(364, 200, 380, 200, 'c'), L(364, 360, 380, 360, 'c'), T(366, 124, 'igual', 'end'), T(366, 284, 'igual', 'end')] },
      { t: 'Triângulo da orelha', txt: 'A distância do nível dos olhos até o queixo é igual à distância do canto de trás do olho até a borda de trás da orelha. Visualize um triângulo com dois lados iguais: é o jeito mais simples de não colar a orelha no rosto.', g: [P('M140,200 L300,200 L140,360 Z', 'g'), P('M268,192 C290,180 308,196 304,228 C301,258 294,282 276,290 C264,295 258,282 262,268 C266,250 256,230 262,212 C263,203 262,197 268,192 Z'), T(220, 190, 'igual', 'middle'), T(132, 290, 'igual', 'end')] },
      { t: 'Perfil do rosto', txt: 'Desenhe o contorno do rosto olhando para o espaço vazio à frente dele, e não para o nariz ou a boca. Na maioria das pessoas, a ponta do nariz, os lábios e o queixo encostam numa mesma linha inclinada.', g: [P('M160,48 C120,62 100,100 98,150 C97,170 100,182 96,195 C92,205 94,212 98,220 L72,262 C70,270 78,276 92,274 C94,282 90,288 92,292 C86,297 88,302 94,304 C88,309 90,316 96,318 C98,326 96,334 94,342 C92,356 110,364 140,362'), P('M112,196 L128,200 L114,206'), P('M100,184 Q118,180 140,186'), P('M92,300 L108,302'), P('M92,268 Q100,266 104,272'), L(72, 262, 96, 350, 'g')] },
      { t: 'Pescoço', txt: 'Deslize o lápis na horizontal desde a base da orelha para trás: ali o pescoço encontra o crânio, bem mais alto do que se imagina. Na frente, o pescoço sai inclinado, não na vertical.', g: [Pt(303, 292), P('M140,362 C200,360 245,340 268,300'), P('M150,362 C160,375 165,390 168,400'), P('M303,292 C295,330 296,365 305,400'), L(262, 292, 330, 292, 'g'), T(310, 282, 'nuca')] },
      { t: 'Acabamento', final: true, g: [`<path d="M160,48 C180,40 195,40 205,40 C290,40 345,100 345,185 C345,245 325,280 303,292" fill="none" stroke="#2e2925" stroke-width="1.8"/>`], txt: 'Confira: olhos na metade, orelha no fim do triângulo, nuca na altura da base da orelha. Com isso a cabeça ganha o volume de trás, que é o que falta na maioria dos perfis.', fundo: [`<path d="M270,196 C288,190 300,205 298,230 C296,255 290,275 278,284 C272,270 276,240 270,196 Z" fill="#2b2723" opacity=".12"/>`] }
    ]
  };

  // Loomis: gerado a partir do modelo 3D numa vista de três quartos
  const loomis = (() => {
    const [g, a, r] = Cabeca.POSES.tresQuartos;
    const partes = Cabeca.projetar(g, a, r);
    const cx = 205, cy = 150, R = 118;
    const s = (grupos) => Cabeca.svg(partes, grupos, cx, cy, R);
    return {
      id: 'loomis', titulo: 'Cabeça pelo método de Loomis', fonte: 'Andrew Loomis, Drawing the Head and Hands',
      resumo: 'Bola, corte lateral, cruz e três terços: a cabeça em qualquer ângulo.',
      passos: [
        { t: 'A bola', txt: 'O crânio parece mais uma bola do que qualquer outra coisa. Desenhe um círculo; se tiver dificuldade, use uma moeda. Pense na bola inteira, inclusive na parte de trás que você não vê.', g: [s(['esfera'])] },
        { t: 'Corte lateral', txt: 'O crânio é achatado dos lados. Imagine uma fatia cortada da lateral da bola: ela vira uma elipse, mais fina quanto mais o rosto estiver de frente. A cruz dentro da elipse vai ajudar a posicionar a orelha.', g: [s(['lateral'])] },
        { t: 'A cruz', txt: 'A linha da sobrancelha dá a volta na bola como um equador; a linha central divide o rosto ao meio. O ponto onde as duas se cruzam, entre as sobrancelhas, define para onde a cabeça está virada. Loomis considera esta a chave de toda a construção.', g: [s(['central', 'sobrancelha'])] },
        { t: 'Três terços', txt: 'Na linha central, a distância da linha do cabelo até a sobrancelha é igual à da sobrancelha até a base do nariz, e igual à da base do nariz até o queixo. As duas primeiras marcas ficam na bola; o queixo fica abaixo dela.', g: [s(['tercos'])] },
        { t: 'Mandíbula e plano do rosto', txt: 'Ligue o queixo ao lado da cabeça: a mandíbula sobe até a base da orelha, na metade da volta da bola. Os lados do rosto descem da ponta da sobrancelha até o queixo e formam o plano da face.', g: [s(['mandibula'])] },
        { t: 'Olhos, nariz, boca e orelha', txt: 'Os olhos ficam um pouco abaixo da linha da sobrancelha; o nariz ocupa o terço do meio; a boca fica no terço de baixo, mais perto do nariz. A orelha fica atrás da linha vertical do corte lateral, entre a linha da sobrancelha e a base do nariz.', g: [s(['tracos', 'orelhas'])] },
        { t: 'Construção completa', final: true, txt: 'A mesma estrutura vale para qualquer pose. No simulador da cabeça você gira este modelo e vê como as linhas acompanham a forma.', g: [] }
      ]
    };
  })();

  const loomisUnidades = {
    id: 'unidades', titulo: 'A cabeça em unidades', fonte: 'Andrew Loomis, Drawing the Head and Hands',
    resumo: 'Uma escala simples para medir qualquer cabeça: 3 de largura por 3,5 de altura.',
    vb: [400, 420],
    passos: (() => {
      const un = 90, x0 = 65, y0 = 40; // 3 x 3,5 unidades
      const grade = [];
      for (let i = 0; i <= 3; i++) grade.push(L(x0 + i * un, y0, x0 + i * un, y0 + 3.5 * un, 'g'));
      for (let j = 0; j <= 7; j++) grade.push(L(x0, y0 + j * un / 2, x0 + 3 * un, y0 + j * un / 2, j % 2 ? 'g h' : 'g'));
      const cx = x0 + 1.5 * un;
      const top = y0, cabelo = y0 + 0.5 * un, sob = y0 + 1.5 * un, nar = y0 + 2.5 * un, que = y0 + 3.5 * un, olhos = y0 + 1.75 * un;
      return [
        { t: 'Retângulo de 3 por 3,5', txt: 'De frente, a cabeça cabe num retângulo de 3 unidades de largura (contando as orelhas) por 3,5 de altura. A unidade é você quem escolhe; o que importa é a proporção.', g: [`<rect class="l" x="${x0}" y="${y0}" width="${3 * un}" height="${3.5 * un}"/>`, ...grade, T(x0 + 1.5 * un, y0 - 12, '3 unidades', 'middle'), T(x0 - 8, y0 + 1.75 * un, '3,5', 'end')] },
        { t: 'Os três terços', txt: 'Do topo até a linha do cabelo vai meia unidade. Depois vêm três unidades iguais: testa, nariz e parte de baixo do rosto.', g: [L(x0 - 20, cabelo, x0 + 3 * un + 20, cabelo), L(x0 - 20, sob, x0 + 3 * un + 20, sob), L(x0 - 20, nar, x0 + 3 * un + 20, nar), T(x0 + 3 * un + 24, cabelo + 4, 'cabelo'), T(x0 + 3 * un + 24, sob + 4, 'sobrancelha'), T(x0 + 3 * un + 24, nar + 4, 'nariz'), T(x0 + 3 * un + 24, que + 4, 'queixo')] },
        { t: 'Linha dos olhos', txt: 'Os olhos ficam na metade da altura total, um quarto de unidade abaixo da sobrancelha. Loomis e Betty Edwards chegam à mesma medida por caminhos diferentes.', g: [L(x0, olhos, x0 + 3 * un, olhos), T(x0 + 3 * un + 24, olhos + 4, 'olhos')] },
        { t: 'Largura do rosto', txt: 'O rosto ocupa as duas unidades do meio. Os olhos ficam nos pontos de um quarto dessa largura, e a orelha tem a altura de uma unidade, da sobrancelha até o nariz.', g: [P(`M${cx},${top} C${cx + 1.35 * un},${top} ${cx + 1.45 * un},${sob - 0.3 * un} ${cx + 1.4 * un},${sob} C${cx + 1.3 * un},${nar} ${cx + 0.7 * un},${que} ${cx},${que} C${cx - 0.7 * un},${que} ${cx - 1.3 * un},${nar} ${cx - 1.4 * un},${sob} C${cx - 1.45 * un},${sob - 0.3 * un} ${cx - 1.35 * un},${top} ${cx},${top} Z`), E(cx - 0.5 * un, olhos, 0.28 * un, 0.1 * un), E(cx + 0.5 * un, olhos, 0.28 * un, 0.1 * un), P(`M${cx - 1.4 * un},${sob} C${cx - 1.62 * un},${sob} ${cx - 1.6 * un},${nar} ${cx - 1.38 * un},${nar}`), P(`M${cx + 1.4 * un},${sob} C${cx + 1.62 * un},${sob} ${cx + 1.6 * un},${nar} ${cx + 1.38 * un},${nar}`), P(`M${cx - 0.22 * un},${nar} Q${cx},${nar + 0.1 * un} ${cx + 0.22 * un},${nar}`), P(`M${cx - 0.42 * un},${nar + 0.33 * un} Q${cx},${nar + 0.4 * un} ${cx + 0.42 * un},${nar + 0.33 * un}`)] },
        { t: 'Resultado', final: true, txt: 'Com essa escala na memória, você mede qualquer cabeça em minutos. Varie as unidades de propósito para criar tipos: testa alta, queixo curto, mandíbula larga.', g: [] }
      ];
    })()
  };

  const olho = {
    id: 'olho', titulo: 'Olho de frente', fonte: 'Andrew Loomis e Betty Edwards',
    resumo: 'O olho é uma bola; as pálpebras se apoiam nela.',
    defs: `<clipPath id="olho-c"><path d="M110,210 C150,150 250,150 295,195 C250,238 160,240 110,210 Z"/></clipPath><radialGradient id="iris-g" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#7d7466"/><stop offset=".7" stop-color="#4a433b"/><stop offset="1" stop-color="#231f1b"/></radialGradient>`,
    passos: [
      { t: 'O globo', txt: 'Comece pela bola do olho, e não pelo contorno. As pálpebras são como uma capa sobre uma esfera; por isso os cantos do olho acompanham a curva.', g: [C(200, 198, 72, 'g'), L(95, 212, 305, 190, 'g'), T(310, 186, 'inclinação')] },
      { t: 'Pálpebras', txt: 'A pálpebra de cima é mais curva e tem o ponto mais alto perto do nariz; a de baixo é mais rasa. O olho quase nunca é uma amêndoa simétrica.', g: [P('M110,210 C150,150 250,150 295,195'), P('M110,210 C160,240 250,238 295,195')] },
      { t: 'Íris e pupila', txt: 'Betty Edwards sugere não desenhar a íris diretamente: desenhe as formas brancas em volta dela. A pálpebra de cima sempre cobre um pedaço da íris.', g: [`<g clip-path="url(#olho-c)">${C(203, 196, 36)}</g>`, C(203, 196, 13), C(214, 185, 5)] },
      { t: 'Dobra e cílios', txt: 'A dobra da pálpebra acompanha a curva de cima. Os cílios de cima primeiro descem e depois sobem; desenhe poucos, em grupos, na direção do crescimento.', g: [P('M118,196 C160,128 252,126 300,180'), ...[0.12, 0.25, 0.38, 0.5, 0.62, 0.74, 0.86].map((t, i) => { const x = 110 + t * 185, y = 210 - Math.sin(t * Math.PI) * 44 - t * 12; return P(`M${f(x)},${f(y)} q${f(4 + i)},-10 ${f(10 + i * 1.5)},-14`); })] },
      { t: 'Sobrancelha', txt: 'A sobrancelha fica sobre o osso da órbita, não colada ao olho. Os pelos nascem para cima perto do nariz e deitam para fora no resto.', g: [P('M98,150 C150,104 250,100 322,140'), P('M100,160 C155,120 250,118 318,146')] },
      { t: 'Acabamento', final: true, txt: 'Escureça a pupila, deixe o reflexo branco, sombreie o branco do olho perto dos cantos (ele também é uma bola) e a região sob a pálpebra de cima.', fundo: [`<g clip-path="url(#olho-c)"><rect x="100" y="140" width="210" height="110" fill="#eee9e0"/><circle cx="203" cy="196" r="36" fill="url(#iris-g)"/><circle cx="203" cy="196" r="13" fill="#161310"/><path d="M110,210 C150,150 250,150 295,195 L295,178 L110,178 Z" fill="#2b2723" opacity=".18"/></g>`, `<path d="M98,150 C150,104 250,100 322,140 C250,118 155,120 100,160 Z" fill="#3a3530"/>`], g: [`<circle cx="214" cy="185" r="5" fill="#fff"/>`] }
    ]
  };

  const narizBaixo = {
    id: 'nariz', titulo: 'Nariz visto de baixo', fonte: 'Estudo de referência em quatro etapas',
    resumo: 'Base, estrutura, narinas e acabamento, como na folha de estudo que você enviou.',
    defs: `<radialGradient id="nz-g" cx="50%" cy="35%" r="60%"><stop offset="0" stop-color="#f0e2d8"/><stop offset=".6" stop-color="#c79f8c"/><stop offset="1" stop-color="#8e6454"/></radialGradient>`,
    passos: [
      { t: 'Base', txt: 'Um círculo para o volume da ponta e um oval largo para a base. Cruze os dois com linhas de centro: tudo será simétrico em relação à vertical.', g: [C(200, 150, 48), E(200, 262, 125, 44), L(200, 70, 200, 330, 'g'), L(130, 150, 270, 150, 'g'), L(62, 262, 338, 262, 'g'), T(252, 104, 'forma principal'), T(330, 222, 'oval da base', 'end')] },
      { t: 'Estrutura', txt: 'Dois círculos marcam as asas do nariz, um de cada lado. Duas linhas inclinadas, que se aproximam em cima, mostram os planos laterais.', g: [C(132, 252, 44), C(268, 252, 44), C(200, 108, 30), L(172, 30, 90, 330, 'g'), L(228, 30, 310, 330, 'g'), T(70, 204, 'asas'), T(318, 180, 'planos laterais', 'end')] },
      { t: 'Narinas', txt: 'Desenhe as narinas como gotas inclinadas, apontando para a ponta. Entre elas fica a columela, que desce até o lábio. Olhe o espaço sob a borda da narina: é uma forma, e é ela que você copia.', g: [P('M160,262 C140,245 150,225 172,232 C188,238 190,262 176,272 C168,277 163,270 160,262 Z'), P('M240,262 C260,245 250,225 228,232 C212,238 210,262 224,272 C232,277 237,270 240,262 Z'), P('M188,272 Q200,292 212,272'), P('M96,300 C80,240 118,212 152,226'), P('M304,300 C320,240 282,212 248,226'), P('M188,300 L188,340 M212,300 L212,340', 'g')] },
      { t: 'Acabamento', final: true, txt: 'O tom mais escuro fica dentro das narinas. A ponta recebe luz; as laterais e a parte de baixo das asas escurecem aos poucos.', fundo: [`<path d="M96,300 C70,230 130,200 160,210 C165,150 170,90 200,60 C230,90 235,150 240,210 C270,200 330,230 304,300 C290,320 240,318 212,300 L188,300 C160,318 110,320 96,300 Z" fill="url(#nz-g)"/>`, `<path d="M160,262 C140,245 150,225 172,232 C188,238 190,262 176,272 C168,277 163,270 160,262 Z" fill="#2a1d19"/>`, `<path d="M240,262 C260,245 250,225 228,232 C212,238 210,262 224,272 C232,277 237,270 240,262 Z" fill="#2a1d19"/>`] }
    ]
  };

  const boca = {
    id: 'boca', titulo: 'Boca de frente', fonte: 'Andrew Loomis e Betty Edwards',
    resumo: 'Os lábios se apoiam num volume curvo, o focinho, e não num plano.',
    passos: [
      { t: 'Linha entre os lábios', txt: 'Comece pela linha central, a mais escura da boca. Marque os cantos e o centro. Ela não é reta: acompanha a curva dos dentes por baixo.', g: [P('M120,210 Q160,200 200,206 Q240,200 280,210'), Pt(120, 210), Pt(200, 206), Pt(280, 210)] },
      { t: 'Lábio de cima', txt: 'O lábio de cima tem o arco do cupido no meio. Para acertar a forma, olhe o espaço entre o nariz e o lábio (o filtro) e desenhe esse espaço.', g: [P('M124,208 Q165,180 190,178 Q200,171 210,178 Q235,180 276,208'), P('M190,178 L192,140 M210,178 L208,140', 'g')] },
      { t: 'Lábio de baixo', txt: 'O lábio de baixo costuma ser mais cheio e mais curto que o de cima. Use traço leve: a borda do lábio é só mudança de cor.', g: [P('M128,213 Q200,262 272,213')] },
      { t: 'Sombras e volume', txt: 'Marque a sombra embaixo do lábio inferior e os pequenos cantos escuros nas extremidades. É a sombra que faz o lábio parecer saliente.', g: [P(hachura(165, 258, 70, 16, 20, 5), 'h'), E(200, 266, 36, 8, 'g')] },
      { t: 'Acabamento', final: true, txt: 'O lábio de cima, virado para baixo, fica mais escuro; o de baixo, virado para a luz, mais claro, com um brilho discreto.', fundo: [`<path d="M124,208 Q165,180 190,178 Q200,171 210,178 Q235,180 276,208 Q240,200 200,206 Q160,200 124,208 Z" fill="#8c6a5e"/>`, `<path d="M128,213 Q160,208 200,209 Q240,208 272,213 Q200,262 128,213 Z" fill="#c9a393"/>`, `<ellipse cx="200" cy="268" rx="34" ry="6" fill="#2b2723" opacity=".25"/>`, `<ellipse cx="205" cy="226" rx="18" ry="4" fill="#fff" opacity=".45"/>`] }
    ]
  };

  const orelha = {
    id: 'orelha', titulo: 'Orelha de lado', fonte: 'Estudo de referência',
    resumo: 'Maior do que parece; fica atrás da metade da cabeça.',
    passos: [
      { t: 'Forma geral', txt: 'A orelha lembra um feijão, mais larga em cima e com o lóbulo embaixo. Ela ocupa a altura que vai da sobrancelha até a base do nariz.', g: [P('M170,95 C200,50 290,50 305,140 C315,215 270,255 255,295 C245,330 222,352 198,342 C176,333 178,305 170,290 C160,272 150,250 155,215 C160,170 150,130 170,95 Z')] },
      { t: 'Hélice', txt: 'A borda de fora é dobrada como a aba de um chapéu. Desenhe uma segunda linha paralela à borda, por dentro.', g: [P('M182,104 C207,72 276,76 286,145 C293,205 256,240 241,276')] },
      { t: 'Anti-hélice', txt: 'Dentro da hélice há uma dobra em forma de Y deitado. Ela começa perto do lóbulo e se abre em dois ramos em cima.', g: [P('M205,280 C236,246 262,200 255,152'), P('M255,152 C249,122 226,106 205,112'), P('M255,152 C240,142 218,150 204,162')] },
      { t: 'Concha e trago', txt: 'A concha é a cavidade central, que leva ao canal. O trago é a pequena aba na frente dela. Olhe as formas escuras e desenhe-as como formas, sem pensar nos nomes.', g: [P('M205,176 C185,196 190,246 215,256 C230,262 245,250 245,236'), P('M166,226 C182,214 191,240 176,256'), P('M208,285 C222,280 232,288 228,300')] },
      { t: 'Acabamento', final: true, txt: 'As cavidades ficam escuras; as dobras que saem para fora pegam luz. Mantenha o contraste mais forte dentro da concha.', fundo: [`<path d="M205,176 C185,196 190,246 215,256 C230,262 245,250 245,236 C240,215 225,190 205,176 Z" fill="#2b2723" opacity=".55"/>`, `<path d="M182,104 C207,72 276,76 286,145 C293,205 256,240 241,276 C250,230 270,190 262,140 C252,95 210,90 182,104 Z" fill="#2b2723" opacity=".18"/>`] }
    ]
  };

  // ---------------------------------------------------------------
  // EXERCÍCIOS PRÁTICOS (abrem a prancheta com um modo específico)
  // ---------------------------------------------------------------
  const EXERCICIOS = {
    partida: {
      titulo: 'Desenhos de partida', fonte: 'Betty Edwards, cap. 1', tempo: '10 a 20 min cada',
      objetivo: 'Registrar como você desenha hoje, antes do estudo. Daqui a algumas semanas você compara e vê o quanto mudou.',
      passos: [
        'Faça os quatro desenhos, um de cada vez, sem se preocupar com o resultado.',
        'Desenho 1: uma pessoa, de memória, sem olhar para ninguém.',
        'Desenho 2: a sua cabeça, olhando num espelho.',
        'Desenho 3: a sua mão que não desenha, na posição que quiser.',
        'Desenho 4: uma cadeira de verdade, olhando para ela.',
        'Ao salvar, escreva o que gostou e o que não gostou em cada um. O aplicativo guarda a data.'
      ],
      tarefas: [
        { id: 1, titulo: 'Uma pessoa, de memória' },
        { id: 2, titulo: 'Autorretrato no espelho' },
        { id: 3, titulo: 'Sua própria mão' },
        { id: 4, titulo: 'Uma cadeira de verdade' }
      ],
      prancheta: { modo: 'livre', tempoMin: 15 }
    },
    aquecimento: {
      titulo: 'Aquecimento: linhas longas', fonte: 'Betty Edwards, cap. 1, e Andrew Loomis', tempo: '5 min',
      objetivo: 'Perder o medo do papel em branco e soltar o braço antes de cada sessão.',
      passos: [
        'Contorne a folha inteira, perto das bordas, sem tirar o lápis do papel.',
        'Cruze a folha com linhas verticais e depois horizontais, tentando manter a mesma distância entre elas.',
        'Numa segunda folha, faça diagonais, depois círculos, depois losangos.',
        'Segure o lápis mais longe da ponta e mova o braço a partir do ombro, com os dedos parados. Loomis chama isso de traço com ritmo: a linha mais longa que você consegue fazer antes de mudar de direção.'
      ],
      prancheta: { modo: 'livre', tempoMin: 5 }
    },
    vaso: {
      titulo: 'Vasos e rostos', fonte: 'Betty Edwards, cap. 4', tempo: '10 min',
      objetivo: 'Sentir a passagem do modo "dar nome às coisas" para o modo "ver formas e espaços".',
      passos: [
        'O aplicativo já traz um perfil do lado esquerdo e as linhas de cima e de baixo do vaso.',
        'Passe o dedo sobre o perfil dizendo o nome de cada parte: testa, nariz, lábios, queixo.',
        'Agora desenhe o perfil espelhado do lado direito para completar o vaso.',
        'Repare no momento em que ficar estranho pensar em nariz e boca e for mais fácil olhar o espaço entre os dois perfis. É essa a mudança que o exercício quer mostrar.',
        'No fim, use "Conferir simetria" para comparar os dois lados.'
      ],
      prancheta: { modo: 'vaso', tempoMin: 10 }
    },
    invertido: {
      titulo: 'Desenho de cabeça para baixo', fonte: 'Betty Edwards, cap. 4', tempo: '30 a 40 min',
      objetivo: 'Copiar uma imagem invertida, que o cérebro não consegue nomear, e perceber que assim você vê as linhas como elas são.',
      passos: [
        'Escolha uma referência: uma foto sua ou um dos desenhos do aplicativo. Ela aparece de cabeça para baixo.',
        'Não vire a imagem até terminar. Virar no meio devolve você ao modo de dar nomes.',
        'Comece por qualquer borda e vá de linha em linha, comparando ângulos com as bordas da imagem e comprimentos entre si.',
        'Se reconhecer uma parte (uma mão, um rosto), não pense no nome; siga copiando formas.',
        'Toque em "Terminei" para desvirar e comparar.'
      ],
      referencia: 'escolher',
      prancheta: { modo: 'invertido', layout: 'lado', tempoMin: 35 }
    },
    cego: {
      titulo: 'Contorno cego', fonte: 'Betty Edwards, cap. 6 (método de Kimon Nicolaides)', tempo: '20 a 30 min',
      objetivo: 'O exercício que mais aprofunda a mudança para o modo de ver do artista. O resultado não precisa parecer com nada.',
      passos: [
        'Escolha algo complexo: a sua mão, uma flor, um papel amassado.',
        'A área de desenho fica coberta. Você desenha, mas não vê o traço.',
        'Olhe para uma borda do objeto e mova o olhar bem devagar, milímetro a milímetro. O lápis acompanha no mesmo ritmo.',
        'Não pare e não acelere. Se sentir impaciência ou vontade de desistir, continue: essa resistência passa.',
        'Ao terminar, toque em "Revelar". Os traços são um registro do que você percebeu.'
      ],
      prancheta: { modo: 'cego', tempoMin: 20 }
    },
    modificado: {
      titulo: 'Contorno modificado', fonte: 'Betty Edwards, cap. 6', tempo: '30 min',
      objetivo: 'Desenhar olhando quase só para o modelo, espiando o papel apenas para conferir proporções.',
      passos: [
        'Coloque a mão que não desenha numa posição complexa, com dedos cruzados ou dobrados, e não mude mais a posição.',
        'A área de desenho fica coberta. Segure o botão "Espiar" apenas para localizar um ponto ou conferir um ângulo.',
        'Cerca de 90 por cento do tempo o seu olhar deve estar no modelo.',
        'Ao chegar nas unhas, desenhe as formas da pele em volta delas, e não as unhas.',
        'O aplicativo conta quantas vezes você espiou.'
      ],
      prancheta: { modo: 'espiar', tempoMin: 30 }
    },
    negativo: {
      titulo: 'Espaços negativos', fonte: 'Betty Edwards, cap. 7', tempo: '30 min',
      objetivo: 'Desenhar o vazio em volta de um objeto. Quando os espaços estão certos, o objeto aparece sozinho.',
      passos: [
        'Fotografe uma cadeira, uma planta ou um objeto com vãos.',
        'Na ferramenta de foto, use o visor para enquadrar de modo que o objeto encoste na borda em pelo menos dois pontos.',
        'Na prancheta, a referência mostra o fundo escuro e o objeto claro. Desenhe somente as formas escuras.',
        'Para cada ângulo, compare com a borda vertical ou horizontal do enquadramento.',
        'Não pense no objeto; pense nas peças de um quebra-cabeça.'
      ],
      referencia: 'foto-negativo',
      prancheta: { modo: 'livre', layout: 'lado', tempoMin: 30 }
    },
    afericao: {
      titulo: 'Aferição de ângulos e proporções', fonte: 'Betty Edwards, cap. 8', tempo: '20 min',
      objetivo: 'Medir "a olho" com o lápis, como os artistas fazem, sem precisar de sistemas de perspectiva.',
      passos: [
        'Com o braço esticado, segure o lápis na vertical ou na horizontal, paralelo ao rosto, e feche um olho.',
        'Compare a direção de uma aresta com o lápis e desenhe o mesmo ângulo em relação à borda do papel.',
        'Para comprimentos, escolha uma unidade (por exemplo, a largura de uma mesa) e meça as outras partes em relação a ela.',
        'Acredite no que medir, mesmo que pareça errado. A mesa pode medir 1 de largura por 10 de comprimento naquele ângulo.',
        'Na ferramenta de foto, a aba "Aferição" faz essas medidas por você para conferir.'
      ],
      abreFoto: 'afericao'
    },
    nanquim: {
      titulo: 'Sombras em duas tonalidades', fonte: 'Betty Edwards, cap. 11', tempo: '30 min',
      objetivo: 'Ver as sombras como formas, sem meio-tom: só papel branco e preto.',
      passos: [
        'Use uma foto de rosto com luz forte de um lado só.',
        'A referência aparece em duas tonalidades; ajuste o limite até as sombras ficarem nítidas.',
        'Com o pincel preto, pinte uma forma de sombra de cada vez: ao lado do nariz, sob o lábio, o lado inteiro do rosto.',
        'Não há borracha neste exercício. Olhe bem a forma antes de pintar.',
        'Em algum momento as manchas viram um rosto. Esse é o objetivo.'
      ],
      referencia: 'foto-nanquim',
      prancheta: { modo: 'livre', layout: 'lado', ferramenta: 'nanquim', semBorracha: true, tempoMin: 30 }
    },
    retratoFoto: {
      titulo: 'Retrato a partir de foto', fonte: 'Betty Edwards, cap. 10, e Andrew Loomis', tempo: '40 min',
      objetivo: 'Juntar tudo: medir, construir e desenhar um rosto real.',
      passos: [
        'Abra uma foto de rosto na ferramenta de foto.',
        'Na aba "Proporções", ajuste a grade de frente ou de perfil, ou encaixe a cabeça de Loomis sobre a foto.',
        'Confira o eixo central: ele mostra a inclinação da cabeça, e a linha dos olhos fica sempre em ângulo reto com ele.',
        'Leve para a prancheta e desenhe a partir dos espaços negativos em volta da cabeça.',
        'Ao terminar, espelhe o desenho para enxergar erros com olhos novos.'
      ],
      abreFoto: 'proporcoes'
    }
  };

  const LICOES = { esfera, cubo, cilindro, cone, valores, hachura: hachuraLicao, rua, proporcoes, perfil, loomis, unidades: loomisUnidades, olho, nariz: narizBaixo, boca, orelha };

  const SIMS = {
    luz: { titulo: 'Simulador de luz', resumo: 'Mova a luz e veja brilho, meio-tom, terminador, luz refletida e sombras.' },
    pf1: { titulo: 'Um ponto de fuga', resumo: 'Arraste o horizonte e o ponto de fuga.' },
    pf2: { titulo: 'Dois pontos de fuga', resumo: 'Monte uma caixa e veja as arestas ocultas.' },
    cabeca: { titulo: 'Cabeça de Loomis em 3D', resumo: 'Gire a cabeça: frente, três quartos, perfil, de baixo e de cima.' }
  };

  const TRILHAS = [
    {
      id: 'ver', titulo: 'Aprender a ver', icone: 'olho',
      sub: 'Exercícios de percepção de Betty Edwards',
      itens: [['exercicio', 'partida'], ['exercicio', 'aquecimento'], ['exercicio', 'vaso'], ['exercicio', 'invertido'], ['exercicio', 'cego'], ['exercicio', 'modificado'], ['exercicio', 'negativo'], ['exercicio', 'afericao']]
    },
    {
      id: 'formas', titulo: 'Formas básicas', icone: 'cubo',
      sub: 'Esfera, cubo, cilindro e cone',
      itens: [['licao', 'esfera'], ['licao', 'cubo'], ['licao', 'cilindro'], ['licao', 'cone']]
    },
    {
      id: 'luz', titulo: 'Luz e sombra', icone: 'luz',
      sub: 'Valores, hachura e sombras como formas',
      itens: [['sim', 'luz'], ['licao', 'valores'], ['licao', 'hachura'], ['exercicio', 'nanquim']]
    },
    {
      id: 'perspectiva', titulo: 'Perspectiva', icone: 'perspectiva',
      sub: 'Pontos de fuga e aferição a olho',
      itens: [['sim', 'pf1'], ['sim', 'pf2'], ['licao', 'rua'], ['exercicio', 'afericao']]
    },
    {
      id: 'retrato', titulo: 'Retrato', icone: 'rosto',
      sub: 'Proporções, método de Loomis e partes do rosto',
      itens: [['licao', 'proporcoes'], ['licao', 'perfil'], ['licao', 'loomis'], ['licao', 'unidades'], ['sim', 'cabeca'], ['licao', 'olho'], ['licao', 'nariz'], ['licao', 'boca'], ['licao', 'orelha'], ['exercicio', 'retratoFoto']]
    }
  ];

  // Desenhos do próprio aplicativo que podem servir de referência
  function referenciasInternas() {
    const lista = [];
    for (const id of ['proporcoes', 'perfil', 'olho', 'nariz', 'boca', 'orelha', 'cubo', 'rua', 'esfera']) {
      const l = LICOES[id];
      lista.push({ id, titulo: l.titulo, svg: svgEtapa(l, l.passos.length - 1) });
    }
    return lista;
  }

  function item(tipo, id) {
    if (tipo === 'licao') return LICOES[id] && { titulo: LICOES[id].titulo, resumo: LICOES[id].resumo, fonte: LICOES[id].fonte };
    if (tipo === 'exercicio') return EXERCICIOS[id] && { titulo: EXERCICIOS[id].titulo, resumo: EXERCICIOS[id].objetivo, fonte: EXERCICIOS[id].fonte };
    if (tipo === 'sim') return SIMS[id] && { titulo: SIMS[id].titulo, resumo: SIMS[id].resumo, fonte: 'Simulador' };
    return null;
  }

  return { LICOES, EXERCICIOS, SIMS, TRILHAS, svgEtapa, referenciasInternas, item, CSS };
})();
