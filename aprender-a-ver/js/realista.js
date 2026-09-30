/*
 * Trilha "Do simples ao realista": cada desenho começa em formas básicas
 * (círculo, triângulo, oval, cilindro) e termina num acabamento realista.
 *
 * O acabamento é descrito como um mapa de tons (SVG com degradês e
 * desfoque). Ele pode ser visto "Suave" (o próprio mapa) ou "Grafite":
 * o mapa vira camadas de hachura com grão de papel, como lápis de verdade.
 */
const Realista = (() => {
  const f = (n) => (Math.round(n * 10) / 10).toString();
  const L = (x1, y1, x2, y2, k = '') => `<line class="l ${k}" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`;
  const C = (x, y, r, k = '') => `<circle class="l ${k}" cx="${f(x)}" cy="${f(y)}" r="${f(r)}"/>`;
  const E = (x, y, rx, ry, k = '', rot = 0) => `<ellipse class="l ${k}" cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}"${rot ? ` transform="rotate(${rot} ${f(x)} ${f(y)})"` : ''}/>`;
  const P = (d, k = '') => `<path class="l ${k}" d="${d}"/>`;
  const T = (x, y, s, anc = 'start') => `<text class="tx" x="${f(x)}" y="${f(y)}" text-anchor="${anc}">${s}</text>`;
  const desf = (id, s) => `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${s}"/></filter>`;
  const radial = (id, cx, cy, r, stops) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</radialGradient>`;
  const linear = (id, stops, x2 = 1, y2 = 0) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
  const PELE = '#efe7dc';

  // ------------------------------------------------------------------
  // OBJETOS
  // ------------------------------------------------------------------
  const MACA = 'M200,122 C172,96 112,98 90,150 C70,200 80,268 114,308 C140,338 172,344 200,331 C228,344 260,338 286,308 C320,268 330,200 310,150 C288,98 228,96 200,122 Z';
  const TALO = 'M199,124 C197,102 201,82 213,62';
  const maca = {
    id: 'maca', titulo: 'Maçã', fonte: 'Do simples ao realista',
    resumo: 'A maçã da capa do livro: de um círculo até o volume com luz e sombra.',
    defs: desf('mc-b8', 8) + desf('mc-b4', 4) + desf('mc-b2', 2) +
      radial('mc-corpo', '34%', '30%', '75%', [[0, '#f6f2ec'], [0.3, '#cfc8bd'], [0.62, '#7a7369'], [0.84, '#3e3934'], [1, '#5d564e']]),
    passos: [
      { t: 'Um círculo', txt: 'Toda a maçã cabe num círculo. Desenhe leve, girando o braço. Ele define o tamanho e o lugar no papel.', g: [C(200, 215, 118)] },
      { t: 'Ombros e base', txt: 'Dois círculos menores marcam os "ombros" de cima, um de cada lado do talo. A base é mais estreita: uma elipse achatada.', g: [C(150, 188, 68, 'g'), C(250, 188, 68, 'g'), E(200, 300, 72, 30, 'g')] },
      { t: 'Contorno único', txt: 'Una as formas numa linha só. A cavidade do talo é uma pequena elipse, e o talo é um cilindro fino e curvo.', g: [P(MACA), P(TALO), E(200, 126, 26, 8, 'g')] },
      { t: 'Luz e sombra', txt: 'Com a luz no alto à esquerda: brilho voltado para ela, terminador do lado oposto e sombra projetada no chão, para a direita.', g: [C(58, 48, 10), L(72, 62, 118, 108, 'g'), E(148, 170, 22, 14), P('M112,180 C140,262 210,318 292,298', 'g'), E(236, 342, 128, 20), T(36, 30, 'luz'), T(292, 290, 'terminador')] },
      {
        t: 'Acabamento', final: true, semLinhas: true, realista: true,
        txt: 'Escureça aos poucos, do meio-tom para a sombra. Deixe o brilho com o papel, uma faixa de luz refletida embaixo e o tom mais escuro logo abaixo da maçã, na sombra de contato.',
        fundo: [
          `<ellipse cx="236" cy="342" rx="132" ry="22" fill="#2b2622" opacity=".55" filter="url(#mc-b8)"/>`,
          `<path d="${MACA}" fill="url(#mc-corpo)"/>`,
          `<path d="M118,298 C150,334 250,340 286,304" stroke="#958e83" stroke-width="12" fill="none" opacity=".55" filter="url(#mc-b4)"/>`,
          `<ellipse cx="148" cy="170" rx="26" ry="16" fill="#fff" opacity=".9" filter="url(#mc-b4)"/>`,
          `<ellipse cx="200" cy="128" rx="26" ry="9" fill="#3a3530" opacity=".7" filter="url(#mc-b2)"/>`,
          `<ellipse cx="200" cy="334" rx="72" ry="7" fill="#1c1916" opacity=".8" filter="url(#mc-b4)"/>`,
          `<path d="${TALO}" stroke="#2b2622" stroke-width="6" fill="none" stroke-linecap="round"/>`
        ],
        g: [P(MACA), P(TALO)]
      }
    ]
  };

  const XIC_CORPO = 'M95,120 C98,210 115,270 128,292 A72,20 0 0 0 272,292 C285,270 302,210 305,120 A105,28 0 0 1 95,120 Z';
  const XIC_ALCA = 'M303,160 C360,150 372,230 290,250 L294,232 C342,222 338,176 300,180 Z';
  const xicara = {
    id: 'xicara', titulo: 'Xícara', fonte: 'Do simples ao realista',
    resumo: 'Um cilindro que afina, um anel como alça e um pires de duas elipses.',
    defs: desf('xc-b8', 8) + desf('xc-b3', 3) +
      linear('xc-corpo', [[0, '#bdb6ab'], [0.2, '#f4f0ea'], [0.5, '#ccc5ba'], [0.8, '#6f685f'], [1, '#8a8378']]) +
      linear('xc-dentro', [[0, '#5a544c'], [0.6, '#9a9388'], [1, '#d9d3c9']], 0, 1) +
      linear('xc-pires', [[0, '#d6d0c6'], [0.3, '#f5f2ec'], [0.8, '#a8a196'], [1, '#bdb6ab']]) +
      linear('xc-alca', [[0, '#e9e4dc'], [1, '#5d564e']]),
    passos: [
      { t: 'Eixo e elipses', txt: 'A xícara é um cilindro que afina para baixo. Trace o eixo e duas elipses: a boca, maior, e a base, menor e um pouco mais aberta.', g: [L(200, 70, 200, 350, 'g'), E(200, 120, 105, 28), E(200, 292, 72, 20, 'g')] },
      { t: 'Laterais', txt: 'Ligue as pontas das elipses com curvas suaves. A parede é levemente arredondada, não reta.', g: [P('M95,120 C98,210 115,270 128,292'), P('M305,120 C302,210 285,270 272,292'), P('M128,292 A72,20 0 0 0 272,292'), E(200, 124, 95, 22)] },
      { t: 'Alça como anel', txt: 'A alça é um pedaço de anel. Dois círculos, um dentro do outro, dão a curva de fora e a de dentro.', g: [C(318, 200, 48, 'g'), C(318, 200, 28, 'g'), P(XIC_ALCA)] },
      { t: 'Pires', txt: 'O pires são duas elipses: a borda larga e o fundo onde a xícara apoia. Todas as elipses têm o mesmo "achatamento", porque estão na mesma altura dos olhos.', g: [E(200, 306, 162, 38), E(200, 300, 80, 18, 'g')] },
      {
        t: 'Acabamento', final: true, semLinhas: true, realista: true,
        txt: 'Luz da esquerda: o corpo claro à esquerda e escuro à direita, o interior escuro perto da borda de trás, a alça com sombra embaixo e a sombra da xícara no pires.',
        fundo: [
          `<ellipse cx="228" cy="330" rx="170" ry="30" fill="#2b2622" opacity=".35" filter="url(#xc-b8)"/>`,
          `<ellipse cx="200" cy="306" rx="162" ry="38" fill="url(#xc-pires)"/>`,
          `<ellipse cx="236" cy="302" rx="92" ry="16" fill="#3a3530" opacity=".55" filter="url(#xc-b8)"/>`,
          `<path d="${XIC_ALCA}" fill="url(#xc-alca)"/>`,
          `<path d="${XIC_CORPO}" fill="url(#xc-corpo)"/>`,
          `<ellipse cx="200" cy="124" rx="95" ry="22" fill="url(#xc-dentro)"/>`,
          `<ellipse cx="200" cy="120" rx="105" ry="28" fill="none" stroke="#f7f4ee" stroke-width="5"/>`
        ],
        g: [P(XIC_CORPO), E(200, 124, 95, 22), P(XIC_ALCA), E(200, 306, 162, 38)]
      }
    ]
  };

  const VASO = 'M158,112 C158,122 168,126 170,132 C172,150 170,168 164,180 C120,196 104,238 106,272 C108,320 150,356 200,358 C250,356 292,320 294,272 C296,238 280,196 236,180 C230,168 228,150 230,132 C232,126 242,122 242,112';
  const vaso = {
    id: 'vaso', titulo: 'Vaso de cerâmica', fonte: 'Do simples ao realista',
    resumo: 'Círculo para o bojo, cilindro para o pescoço: o mesmo raciocínio serve para garrafas e jarras.',
    defs: desf('vs-b8', 8) + desf('vs-b3', 3) +
      radial('vs-corpo', '33%', '35%', '72%', [[0, '#f3efe8'], [0.35, '#c7c0b5'], [0.7, '#6d665d'], [0.9, '#3f3a35'], [1, '#58514a']]) +
      linear('vs-colo', [[0, '#b6afa4'], [0.3, '#ebe6de'], [0.75, '#6f685f'], [1, '#857e74']]),
    passos: [
      { t: 'Eixo e círculo', txt: 'O bojo do vaso é um círculo centrado no eixo. Toda a simetria parte desse eixo vertical.', g: [L(200, 60, 200, 375, 'g'), C(200, 265, 94)] },
      { t: 'Pescoço e boca', txt: 'O pescoço é um cilindro estreito. Marque as elipses da boca e do lábio no topo.', g: [L(170, 128, 166, 182, 'g'), L(230, 128, 234, 182, 'g'), E(200, 112, 42, 11), E(200, 180, 34, 9, 'g')] },
      { t: 'Contorno', txt: 'Una o cilindro ao círculo com a curva dos ombros. As duas metades precisam ser espelho uma da outra: confira pelo eixo.', g: [P(VASO)] },
      { t: 'Luz', txt: 'Luz vinda da esquerda. O bojo se comporta como a esfera; o pescoço, como o cilindro, com faixas verticais de tom.', g: [E(150, 232, 20, 30), P('M130,300 C170,340 250,330 280,260', 'g'), E(240, 366, 120, 16)] },
      {
        t: 'Acabamento', final: true, semLinhas: true, realista: true,
        txt: 'Escureça o lado direito do bojo e do pescoço, deixe o brilho vertical no pescoço e o reflexo redondo no bojo. A boca por dentro é o tom mais escuro.',
        fundo: [
          `<ellipse cx="240" cy="364" rx="130" ry="18" fill="#2b2622" opacity=".5" filter="url(#vs-b8)"/>`,
          `<path d="${VASO} Z" fill="url(#vs-corpo)"/>`,
          `<path d="M170,132 C172,150 170,168 164,180 L236,180 C230,168 228,150 230,132 Z" fill="url(#vs-colo)"/>`,
          `<ellipse cx="200" cy="112" rx="42" ry="11" fill="#2a2622"/>`,
          `<ellipse cx="148" cy="236" rx="16" ry="30" fill="#fff" opacity=".8" filter="url(#vs-b3)"/>`,
          `<rect x="180" y="136" width="8" height="40" fill="#fff" opacity=".6" filter="url(#vs-b3)"/>`
        ],
        g: [P(VASO), E(200, 112, 42, 11)]
      }
    ]
  };

  // ------------------------------------------------------------------
  // ROSTO: PARTES
  // ------------------------------------------------------------------
  const OLHO_BORDA = 'M110,210 C150,150 250,150 295,195 C250,238 160,240 110,210 Z';
  const olho = {
    id: 'olhoR', titulo: 'Olho realista', fonte: 'Do simples ao realista',
    resumo: 'Círculo do globo, triângulo dos cantos e as camadas de tom da íris.',
    defs: desf('ol-b10', 10) + desf('ol-b4', 4) + desf('ol-b2', 2) +
      `<clipPath id="ol-c"><path d="${OLHO_BORDA}"/></clipPath>` +
      radial('ol-iris', '50%', '45%', '55%', [[0, '#8a8174'], [0.55, '#5b5349'], [0.85, '#3a342d'], [1, '#1d1a16']]) +
      radial('ol-pele', '40%', '55%', '65%', [[0, '#f3ece2'], [0.7, '#ddd3c6'], [1, '#c5baab']]),
    passos: [
      { t: 'Círculo do globo', txt: 'O olho é uma bola. Desenhe o círculo do globo e uma linha levemente inclinada que liga os dois cantos.', g: [C(200, 198, 72, 'g'), L(95, 212, 305, 190, 'g')] },
      { t: 'Triângulo dos cantos', txt: 'Três pontos definem o formato: canto interno, canto externo e o ponto mais alto da pálpebra, mais perto do nariz. Ligue-os num triângulo e arredonde por dentro.', g: [P('M110,210 L292,196 L182,152 Z', 'g'), P('M110,210 C150,150 250,150 295,195'), P('M110,210 C160,240 250,238 295,195')] },
      { t: 'Íris, pupila e reflexo', txt: 'A íris é um círculo que a pálpebra de cima corta. A pupila fica no centro; o reflexo, do lado da luz, encosta na pupila.', g: [`<g clip-path="url(#ol-c)">${C(203, 196, 36)}</g>`, C(203, 196, 13), C(214, 185, 5)] },
      { t: 'Pálpebras e cílios', txt: 'As pálpebras têm espessura: desenhe uma segunda linha rente à de baixo. A dobra acompanha a curva de cima. Cílios em grupos, curvando para fora.', g: [P('M118,212 C162,236 248,234 290,200'), P('M118,196 C160,128 252,126 300,180'), ...[0.15, 0.3, 0.45, 0.6, 0.75, 0.88].map((t, i) => { const x = 110 + t * 185, y = 210 - Math.sin(t * Math.PI) * 44 - t * 12; return P(`M${f(x)},${f(y)} q${f(3 + i)},-11 ${f(10 + i * 1.6)},-15`); })] },
      { t: 'Sobrancelha como forma', txt: 'Desenhe a sobrancelha como uma forma inteira, mais grossa perto do nariz, e só depois os pelos, na direção em que crescem.', g: [P('M98,152 C150,104 250,100 322,140 C252,120 158,122 102,164 Z')] },
      {
        t: 'Acabamento', final: true, semLinhas: true, realista: true,
        txt: 'O branco do olho não é branco: escurece nos cantos, porque é uma bola. A pálpebra de cima projeta sombra sobre o globo. A cavidade sob a sobrancelha é um meio-tom largo.',
        fundo: [
          `<rect x="0" y="0" width="400" height="400" fill="url(#ol-pele)"/>`,
          `<ellipse cx="205" cy="160" rx="120" ry="40" fill="#8f8478" opacity=".55" filter="url(#ol-b10)"/>`,
          `<g clip-path="url(#ol-c)"><rect x="100" y="140" width="210" height="110" fill="#f1ede6"/>` +
            `<ellipse cx="118" cy="208" rx="30" ry="26" fill="#9c9387" opacity=".6" filter="url(#ol-b10)"/><ellipse cx="290" cy="198" rx="30" ry="26" fill="#9c9387" opacity=".6" filter="url(#ol-b10)"/>` +
            `<circle cx="203" cy="196" r="36" fill="url(#ol-iris)"/><circle cx="203" cy="196" r="13" fill="#110f0d"/>` +
            `<path d="M100,150 L310,150 L310,186 C250,168 160,170 100,200 Z" fill="#2b2622" opacity=".45" filter="url(#ol-b4)"/></g>`,
          `<circle cx="214" cy="185" r="5.5" fill="#fff"/>`,
          `<path d="M98,152 C150,104 250,100 322,140 C252,120 158,122 102,164 Z" fill="#3a332c" opacity=".9" filter="url(#ol-b2)"/>`,
          `<path d="M110,210 C150,150 250,150 295,195" stroke="#1d1a16" stroke-width="5" fill="none"/>`
        ],
        g: [P(OLHO_BORDA), P('M118,196 C160,128 252,126 300,180'), ...[0.15, 0.3, 0.45, 0.6, 0.75, 0.88].map((t, i) => { const x = 110 + t * 185, y = 210 - Math.sin(t * Math.PI) * 44 - t * 12; return P(`M${f(x)},${f(y)} q${f(3 + i)},-11 ${f(10 + i * 1.6)},-15`); })]
      }
    ]
  };

  const narizFrente = {
    id: 'narizF', titulo: 'Nariz de frente', fonte: 'Do simples ao realista',
    resumo: 'Três círculos (ponta e asas) e um trapézio para o dorso.',
    defs: desf('nf-b10', 10) + desf('nf-b5', 5) + desf('nf-b2', 2) +
      radial('nf-pele', '42%', '45%', '70%', [[0, '#f4ede3'], [0.7, '#ded4c7'], [1, '#c7bcad']]),
    passos: [
      { t: 'Três círculos', txt: 'Um círculo para a ponta e dois menores, um pouco mais baixos, para as asas. Eles são o volume de baixo do nariz.', g: [C(200, 250, 34), C(150, 262, 26), C(250, 262, 26)] },
      { t: 'Trapézio do dorso', txt: 'O dorso é um bloco que alarga para baixo. Duas linhas descem da região entre as sobrancelhas até a ponta.', g: [P('M186,70 L168,232 M214,70 L232,232', 'g'), P('M186,70 L214,70', 'g')] },
      { t: 'Asas e narinas', txt: 'Contorne as asas por fora dos círculos. As narinas são pequenas formas escuras, inclinadas para o centro. Entre elas, a columela.', g: [P('M128,262 C120,236 142,226 160,236'), P('M272,262 C280,236 258,226 240,236'), P('M128,262 C132,284 158,290 176,282'), P('M272,262 C268,284 242,290 224,282'), P('M168,276 C174,268 186,270 188,280 C182,286 172,284 168,276 Z'), P('M232,276 C226,268 214,270 212,280 C218,286 228,284 232,276 Z')] },
      { t: 'Planos de luz', txt: 'Com a luz da esquerda, o plano lateral direito do nariz fica em sombra. A parte de baixo, virada para o chão, também escurece.', g: [P('M214,80 L236,232 C250,236 262,244 272,262', 'g'), E(200, 294, 60, 8, 'g')] },
      {
        t: 'Acabamento', final: true, semLinhas: true, realista: true,
        txt: 'Não contorne o dorso com linha: ele aparece pela diferença de tom entre o lado claro e o lado da sombra. As narinas são o ponto mais escuro; a ponta pega luz.',
        fundo: [
          `<rect x="0" y="0" width="400" height="400" fill="url(#nf-pele)"/>`,
          `<path d="M214,70 L236,232 C262,238 282,258 272,280 C250,292 226,288 212,282 L205,230 Z" fill="#8d8276" opacity=".75" filter="url(#nf-b10)"/>`,
          `<ellipse cx="200" cy="298" rx="72" ry="12" fill="#5f564c" opacity=".7" filter="url(#nf-b5)"/>`,
          `<circle cx="150" cy="264" r="22" fill="#b3a898" opacity=".5" filter="url(#nf-b5)"/>`,
          `<path d="M168,276 C174,268 186,270 188,280 C182,286 172,284 168,276 Z" fill="#2a231e" filter="url(#nf-b2)"/>`,
          `<path d="M232,276 C226,268 214,270 212,280 C218,286 228,284 232,276 Z" fill="#2a231e" filter="url(#nf-b2)"/>`,
          `<ellipse cx="192" cy="240" rx="14" ry="10" fill="#fff" opacity=".7" filter="url(#nf-b5)"/>`
        ],
        g: [P('M128,262 C120,236 142,226 160,236'), P('M272,262 C280,236 258,226 240,236'), P('M128,262 C132,284 158,290 176,282'), P('M272,262 C268,284 242,290 224,282')]
      }
    ]
  };


  const NZ34 = 'M168,66 C180,140 205,210 240,250 C262,272 262,300 236,312 C222,318 206,312 196,306';
  const nariz34 = {
    id: 'nariz34', titulo: 'Nariz em três quartos', fonte: 'Do simples ao realista',
    resumo: 'Uma pirâmide vira um bloco com uma bola na ponta, e depois um nariz.',
    defs: desf('n3-b10', 10) + desf('n3-b5', 5) + desf('n3-b2', 2) +
      radial('n3-pele', '60%', '40%', '75%', [[0, '#f4ede3'], [0.7, '#ddd2c4'], [1, '#c3b7a7']]),
    passos: [
      { t: 'Pirâmide', txt: 'Visto de três quartos, o nariz cabe numa pirâmide: a ponta de cima fica entre as sobrancelhas e a base apoia no rosto.', g: [P('M170,60 L110,300 L252,318 Z'), P('M170,60 L286,272 L252,318'), P('M110,300 L182,262 L286,272', 'g'), P('M170,60 L182,262', 'g')] },
      { t: 'Bloco e esfera', txt: 'Troque a pirâmide por um bloco estreito para o dorso e uma esfera para a ponta. A asa é um volume menor, encaixado atrás da esfera.', g: [P('M168,70 L206,250 M186,64 L252,246', ''), C(232, 282, 32), C(160, 290, 24, 'g')] },
      { t: 'Planos e asa', txt: 'Separe o plano da frente do plano lateral. Desenhe a asa em volta do círculo menor e a narina como uma forma escura, fina e inclinada.', g: [P('M140,296 C130,270 160,258 186,272 C196,290 186,306 168,308'), E(196, 302, 17, 6, '', -12), P(NZ34)] },
      {
        t: 'Acabamento', final: true, semLinhas: true, realista: true,
        txt: 'Com a luz vindo da direita, o plano lateral esquerdo fica em meio-tom e a sombra sob a asa e a narina são os pontos mais escuros. A ponta, redonda, tem brilho e passagem suave.',
        fundo: [
          `<rect x="0" y="0" width="400" height="400" fill="url(#n3-pele)"/>`,
          `<path d="M166,66 L110,300 C140,320 190,318 206,300 C200,230 185,140 172,70 Z" fill="#9a8e80" opacity=".6" filter="url(#n3-b10)"/>`,
          `<ellipse cx="180" cy="318" rx="80" ry="12" fill="#5d5349" opacity=".6" filter="url(#n3-b5)"/>`,
          `<path d="M140,296 C130,270 160,258 186,272 C196,290 186,306 168,308 Z" fill="#b5a999" opacity=".7" filter="url(#n3-b5)"/>`,
          `<ellipse cx="196" cy="302" rx="17" ry="6" fill="#2a231e" transform="rotate(-12 196 302)" filter="url(#n3-b2)"/>`,
          `<ellipse cx="236" cy="272" rx="14" ry="10" fill="#fff" opacity=".75" filter="url(#n3-b5)"/>`
        ],
        g: [P(NZ34), P('M140,296 C130,270 160,258 186,272')]
      }
    ]
  };

  const BOCA_SUP = 'M124,208 Q165,180 190,178 Q200,171 210,178 Q235,180 276,208 Q240,200 200,206 Q160,200 124,208 Z';
  const BOCA_INF = 'M128,213 Q160,208 200,209 Q240,208 272,213 Q200,262 128,213 Z';
  const boca = {
    id: 'bocaR', titulo: 'Boca realista', fonte: 'Do simples ao realista',
    resumo: 'O método dos três círculos: dois embaixo, um em cima, e a boca aparece em volta deles.',
    escala: 'translate(200 212) scale(1.55) translate(-200 -212)',
    defs: desf('bc-b8', 8) + desf('bc-b3', 3) +
      linear('bc-sup', [[0, '#6f5a52'], [1, '#9b8177']], 0, 1) + linear('bc-inf', [[0, '#a88d82'], [0.6, '#c9ada1'], [1, '#9d8378']], 0, 1) +
      radial('bc-pele', '45%', '40%', '70%', [[0, '#f4ede3'], [1, '#d6cbbd']]),
    passos: [
      { t: 'Três círculos', txt: 'Desenhe um círculo em cima e dois embaixo, encostados. O de cima é o volume central do lábio superior; os de baixo, os dois volumes do lábio inferior.', g: [C(200, 190, 24), C(176, 214, 24), C(224, 214, 24)] },
      { t: 'Cruz e cantos', txt: 'Uma vertical passa pelo meio dos três círculos. A horizontal, entre os lábios, vai além deles até os cantos da boca, que ficam embaixo das pupilas.', g: [L(200, 150, 200, 262, 'g'), L(110, 206, 290, 206, 'g'), P('M118,210 L126,206 M282,210 L274,206')] },
      { t: 'Contorno', txt: 'Contorne por fora dos círculos: o arco do cupido em cima do círculo superior, e o lábio de baixo passando sob os dois círculos. A linha entre os lábios é ondulada, acompanhando os volumes.', g: [P('M120,210 Q160,200 200,206 Q240,200 280,210'), P('M124,208 Q165,180 190,178 Q200,171 210,178 Q235,180 276,208'), P('M128,213 Q200,262 272,213')] },
      { t: 'Primeiras sombras', txt: 'O lábio de cima fica virado para baixo e recebe menos luz: escureça com traços que seguem a curva. Embaixo do lábio inferior, marque a sombra que ele projeta no queixo.', g: [P('M150,196 Q175,186 195,194 M205,194 Q225,186 250,196', 'h'), P('M160,248 Q200,262 240,248 M170,256 Q200,266 230,256', 'h')] },
      {
        t: 'Acabamento', final: true, semLinhas: true, realista: true,
        txt: 'Lábio de cima mais escuro, virado para baixo; lábio de baixo mais claro, com brilho. A sombra embaixo do lábio inferior é que faz a boca saltar.',
        fundo: [
          `<rect x="-200" y="-200" width="800" height="800" fill="url(#bc-pele)"/>`,
          `<ellipse cx="200" cy="268" rx="46" ry="10" fill="#6d6056" opacity=".7" filter="url(#bc-b8)"/>`,
          `<path d="${BOCA_SUP}" fill="url(#bc-sup)" filter="url(#bc-b3)"/>`,
          `<path d="${BOCA_INF}" fill="url(#bc-inf)" filter="url(#bc-b3)"/>`,
          `<path d="M120,210 Q160,200 200,206 Q240,200 280,210" stroke="#2c211d" stroke-width="4" fill="none" filter="url(#bc-b3)"/>`,
          `<ellipse cx="206" cy="226" rx="20" ry="5" fill="#fff" opacity=".55" filter="url(#bc-b3)"/>`
        ],
        g: [P('M120,210 Q160,200 200,206 Q240,200 280,210')]
      }
    ]
  };

  const ORELHA = 'M170,95 C200,50 290,50 305,140 C315,215 270,255 255,295 C245,330 222,352 198,342 C176,333 178,305 170,290 C160,272 150,250 155,215 C160,170 150,130 170,95 Z';
  const orelha = {
    id: 'orelhaR', titulo: 'Orelha realista', fonte: 'Do simples ao realista',
    resumo: 'Um oval inclinado, um "C" e um "Y": a orelha fica simples.',
    defs: desf('or-b8', 8) + desf('or-b4', 4) + radial('or-pele', '40%', '40%', '75%', [[0, '#f1e9de'], [1, '#cbbfb0']]),
    passos: [
      { t: 'Oval inclinado', txt: 'A orelha cabe num oval inclinado para trás. Ele vai da altura da sobrancelha até a base do nariz.', g: [E(230, 200, 80, 132, '', 12)] },
      { t: 'O "C" da hélice', txt: 'A borda de fora é um "C" dobrado. Desenhe uma segunda linha por dentro, acompanhando a borda.', g: [P(ORELHA), P('M182,104 C207,72 276,76 286,145 C293,205 256,240 241,276')] },
      { t: 'O "Y" deitado', txt: 'A anti-hélice forma um Y deitado: começa perto do lóbulo e se abre em dois ramos em cima.', g: [P('M205,280 C236,246 262,200 255,152'), P('M255,152 C249,122 226,106 205,112'), P('M255,152 C240,142 218,150 204,162')] },
      { t: 'Concha e trago', txt: 'A concha é a cavidade central; o trago é a aba na frente dela. Pense em formas escuras, não em nomes.', g: [P('M205,176 C185,196 190,246 215,256 C230,262 245,250 245,236'), P('M166,226 C182,214 191,240 176,256')] },
      {
        t: 'Acabamento', final: true, semLinhas: true, realista: true,
        txt: 'As cavidades são escuras e as dobras que saem para fora pegam luz. O contraste mais forte fica dentro da concha.',
        fundo: [
          `<path d="${ORELHA}" fill="url(#or-pele)"/>`,
          `<path d="M182,104 C207,72 276,76 286,145 C293,205 256,240 241,276 C250,230 270,190 262,140 C252,95 210,90 182,104 Z" fill="#8a7f72" opacity=".6" filter="url(#or-b4)"/>`,
          `<path d="M205,176 C185,196 190,246 215,256 C230,262 245,250 245,236 C240,215 225,190 205,176 Z" fill="#3a322b" opacity=".85" filter="url(#or-b4)"/>`,
          `<path d="M255,152 C249,122 226,106 205,112 C220,130 235,140 255,152 Z" fill="#7d7266" opacity=".6" filter="url(#or-b4)"/>`,
          `<ellipse cx="206" cy="318" rx="18" ry="16" fill="#9b8f81" opacity=".45" filter="url(#or-b8)"/>`
        ],
        g: [P(ORELHA), P('M182,104 C207,72 276,76 286,145 C293,205 256,240 241,276'), P('M205,280 C236,246 262,200 255,152')]
      }
    ]
  };

  // ------------------------------------------------------------------
  // ROSTO COMPLETO
  // ------------------------------------------------------------------
  const ROSTO = 'M200,45 C262,45 305,95 305,165 C305,230 292,288 262,330 C242,356 222,368 200,368 C178,368 158,356 138,330 C108,288 95,230 95,165 C95,95 138,45 200,45 Z';
  const CABELO = 'M92,190 C80,110 120,38 200,36 C282,38 322,110 308,190 C300,150 290,112 262,96 C230,112 170,112 138,98 C112,116 100,150 92,190 Z';
  const olhoRosto = (x) => `M${x - 20},206 Q${x},193 ${x + 20},206 Q${x},216 ${x - 20},206 Z`;
  const rostoFrente = {
    id: 'rostoF', titulo: 'Rosto de frente', fonte: 'Do simples ao realista',
    resumo: 'Círculo do crânio, triângulo da mandíbula e a cruz: o retrato inteiro.',
    defs: desf('rf-b12', 12) + desf('rf-b6', 6) + desf('rf-b3', 3) +
      radial('rf-pele', '38%', '40%', '72%', [[0, '#f5eee4'], [0.55, '#e0d5c7'], [0.85, '#b9ac9b'], [1, '#9c8f7f']]) +
      linear('rf-cabelo', [[0, '#5c5249'], [0.5, '#2e2823'], [1, '#221e1a']]),
    passos: [
      { t: 'Círculo e triângulo', txt: 'O crânio é um círculo. A mandíbula é um triângulo de ponta para baixo, que sai das laterais do círculo e termina no queixo.', g: [C(200, 150, 105), P('M112,205 L200,368 L288,205', 'g')] },
      { t: 'A cruz', txt: 'A linha central divide o rosto ao meio. Os olhos ficam na metade da altura total, do topo da cabeça ao queixo, e não no meio do círculo.', g: [L(200, 36, 200, 380, 'g'), L(90, 206, 310, 206), L(96, 180, 304, 180, 'g'), L(120, 268, 280, 268, 'g'), L(150, 300, 250, 300, 'g')] },
      { t: 'Olhos, nariz e boca', txt: 'Olhos como amêndoas, separados pela largura de um olho. O nariz é um triângulo até a base; a boca, um oval achatado a um terço do caminho até o queixo.', g: [P(olhoRosto(162)), P(olhoRosto(238)), P('M200,215 L181,268 L219,268 Z', 'g'), E(200, 300, 34, 9, 'g'), P('M166,300 Q200,294 234,300')] },
      { t: 'Contorno do rosto', txt: 'Una o círculo e o triângulo num oval. As orelhas ficam entre a linha dos olhos e a base do nariz; o pescoço desce quase da largura da mandíbula.', g: [P(ROSTO), P('M96,200 C78,196 76,236 84,256 C88,270 96,276 104,274'), P('M304,200 C322,196 324,236 316,256 C312,270 304,276 296,274'), P('M150,350 L146,400 M250,350 L254,400')] },
      { t: 'Cabelo como massa', txt: 'Desenhe o cabelo como uma massa só, por cima do crânio, e não fio a fio. Ele acrescenta volume ao topo da cabeça.', g: [P(CABELO)] },
      {
        t: 'Acabamento', final: true, semLinhas: true, realista: true,
        txt: 'Com a luz da esquerda: as órbitas dos olhos, o lado direito do nariz, a região sob o lábio e o pescoço ficam em sombra. O cabelo é a maior massa escura e faz o rosto claro se destacar.',
        fundo: [
          `<rect x="130" y="330" width="140" height="70" fill="#8f8374"/>`,
          `<path d="M140,330 C170,380 230,380 262,330 L262,360 L140,360 Z" fill="#4d443b" opacity=".6" filter="url(#rf-b6)"/>`,
          `<path d="${ROSTO}" fill="url(#rf-pele)"/>`,
          `<path d="M96,200 C78,196 76,236 84,256 C88,270 96,276 104,274 Z" fill="#b4a795"/><path d="M304,200 C322,196 324,236 316,256 C312,270 304,276 296,274 Z" fill="#8c7f6f"/>`,
          `<ellipse cx="162" cy="200" rx="30" ry="16" fill="#9d9080" opacity=".6" filter="url(#rf-b6)"/><ellipse cx="238" cy="200" rx="30" ry="16" fill="#8d8070" opacity=".7" filter="url(#rf-b6)"/>`,
          `<path d="M206,212 L222,268 L204,270 Z" fill="#8a7d6d" opacity=".7" filter="url(#rf-b3)"/>`,
          `<ellipse cx="200" cy="278" rx="26" ry="6" fill="#6d6152" opacity=".7" filter="url(#rf-b3)"/>`,
          `<path d="M166,300 Q200,286 234,300 Q200,296 166,300 Z" fill="#7a6258"/><path d="M168,301 Q200,318 232,301 Z" fill="#a8897b"/>`,
          `<ellipse cx="200" cy="322" rx="22" ry="6" fill="#8a7d6d" opacity=".7" filter="url(#rf-b3)"/>`,
          `<path d="M262,120 C300,190 296,280 258,336 C280,280 286,200 262,120 Z" fill="#6f6355" opacity=".55" filter="url(#rf-b12)"/>`,
          `<path d="${olhoRosto(162)}" fill="#eee9e1"/><path d="${olhoRosto(238)}" fill="#e2ddd4"/>`,
          `<circle cx="162" cy="205" r="7" fill="#3a332c"/><circle cx="238" cy="205" r="7" fill="#3a332c"/>`,
          `<path d="M140,186 Q162,176 184,184 L184,188 Q162,181 140,191 Z" fill="#3e362f"/><path d="M216,184 Q238,176 260,186 L260,191 Q238,181 216,188 Z" fill="#3e362f"/>`,
          `<path d="${CABELO}" fill="url(#rf-cabelo)"/>`
        ],
        g: [P(ROSTO), P(olhoRosto(162)), P(olhoRosto(238)), P('M166,300 Q200,294 234,300'), P('M188,272 Q200,278 212,272')]
      }
    ]
  };

  const PERFIL = 'M160,48 C120,62 100,100 98,150 C97,170 100,182 96,195 C92,205 94,212 98,220 L72,262 C70,270 78,276 92,274 C94,282 90,288 92,292 C86,297 88,302 94,304 C88,309 90,316 96,318 C98,326 96,334 94,342 C92,356 110,364 140,362 C200,360 245,340 268,300';
  const CRANIO_P = 'M160,48 C180,40 195,40 205,40 C290,40 345,100 345,185 C345,245 325,280 303,292';
  const rostoPerfil = {
    id: 'rostoP', titulo: 'Rosto de perfil', fonte: 'Do simples ao realista',
    resumo: 'Círculo grande para o crânio, triângulo para a face e a orelha no lugar certo.',
    defs: desf('rp-b12', 12) + desf('rp-b5', 5) + desf('rp-b3', 3) +
      radial('rp-pele', '30%', '45%', '75%', [[0, '#f4ede3'], [0.6, '#dccfbf'], [1, '#a99b89']]) +
      linear('rp-cabelo', [[0, '#3a332c'], [1, '#221e1a']]),
    passos: [
      { t: 'Círculo do crânio', txt: 'De perfil, o crânio é um círculo grande e a face fica presa na frente dele. Deixe espaço atrás: a nuca vai longe.', g: [C(222, 168, 124)] },
      { t: 'Triângulo da face', txt: 'A face é um triângulo que desce da testa até o queixo, na frente do círculo. A linha dos olhos fica na metade da altura.', g: [P('M104,112 L92,352 L240,300 Z', 'g'), L(70, 200, 360, 200, 'g')] },
      { t: 'Perfil do rosto', txt: 'Desenhe o perfil olhando o espaço vazio à frente dele: testa, dorso do nariz, lábios e queixo. Ponta do nariz, lábios e queixo tocam uma mesma linha inclinada.', g: [P(PERFIL), P('M112,196 L128,200 L114,206'), P('M100,184 Q118,180 140,186'), L(72, 262, 96, 350, 'g')] },
      { t: 'Orelha e nuca', txt: 'A orelha fica atrás da metade da cabeça, entre a linha dos olhos e a base do nariz. A nuca começa na altura da base da orelha.', g: [P('M268,192 C290,180 308,196 304,228 C301,258 294,282 276,290 C264,295 258,282 262,268 C266,250 256,230 262,212 C263,203 262,197 268,192 Z'), P(CRANIO_P), P('M303,292 C295,330 296,365 305,400'), P('M150,362 C160,375 165,390 168,400')] },
      {
        t: 'Acabamento', final: true, semLinhas: true, realista: true,
        txt: 'Luz vindo da frente: a testa, o nariz e a maçã do rosto claros; sombra sob o queixo, atrás da mandíbula e dentro da orelha. O cabelo, escuro, emoldura o perfil.',
        fundo: [
          `<path d="${PERFIL} C290,300 303,292 303,292 ${CRANIO_P.replace('M160,48', '').split(' ').reverse().join(' ').length ? '' : ''} L303,292 C296,330 296,365 305,400 L168,400 C165,390 160,375 150,362 Z" fill="#b8ab99"/>`,
          `<path d="${PERFIL} L303,292 C345,245 345,185 345,185 C345,100 290,40 205,40 C195,40 180,40 160,48 Z" fill="url(#rp-pele)"/>`,
          `<path d="M140,362 C200,360 245,340 268,300 L303,292 C298,330 280,360 250,372 Z" fill="#6c6053" opacity=".6" filter="url(#rp-b5)"/>`,
          `<path d="M268,192 C290,180 308,196 304,228 C301,258 294,282 276,290 C264,295 258,282 262,268 C266,250 256,230 262,212 C263,203 262,197 268,192 Z" fill="#b5a794"/>`,
          `<path d="M270,200 C288,195 298,210 296,230 C294,250 288,268 278,276 C272,262 276,240 270,200 Z" fill="#4d443b" opacity=".6" filter="url(#rp-b3)"/>`,
          `<path d="M150,50 C210,20 330,40 350,150 C356,210 340,260 320,288 C318,240 312,200 300,180 C285,150 260,130 230,110 C200,92 170,80 150,50 Z" fill="url(#rp-cabelo)"/>`,
          `<ellipse cx="118" cy="200" rx="14" ry="10" fill="#8c8071" opacity=".6" filter="url(#rp-b3)"/>`,
          `<ellipse cx="140" cy="240" rx="30" ry="22" fill="#fff" opacity=".35" filter="url(#rp-b12)"/>`
        ],
        g: [P(PERFIL), P('M112,196 L128,200 L114,206'), P('M268,192 C290,180 308,196 304,228 C301,258 294,282 276,290')]
      }
    ]
  };

  // ------------------------------------------------------------------
  // MÃO
  // ------------------------------------------------------------------
  // dedos: [x da base, y da base, largura, comprimento, inclinação]
  const DEDOS = [[158, 250, 30, 118, -6], [192, 242, 31, 136, -1], [226, 246, 30, 128, 4], [258, 256, 26, 100, 10]];
  const dedo = (x, y, w, c, a, k = '') => `<rect class="l ${k}" x="${f(x - w / 2)}" y="${f(y - c)}" width="${f(w)}" height="${f(c)}" rx="${f(w / 2)}" transform="rotate(${a} ${f(x)} ${f(y)})"/>`;
  const juntas = (x, y, w, c, a) => [0, 0.36, 0.66].map((t) => `<ellipse class="l g" cx="${f(x)}" cy="${f(y - c * t)}" rx="${f(w / 2)}" ry="${f(w / 6)}" transform="rotate(${a} ${f(x)} ${f(y)})"/>`).join('');
  const PALMA = 'M140,250 C170,236 232,236 272,254 L276,370 C240,384 180,386 148,372 Z';
  const POLEGAR = 'M142,318 C120,300 100,276 86,250 C80,236 94,226 106,234 C122,246 140,262 152,280';
  const mao = {
    id: 'mao', titulo: 'Mão (dorso)', fonte: 'Do simples ao realista',
    resumo: 'Palma como bloco, dedos como cilindros em arco e o polegar como triângulo.',
    defs: desf('mo-b8', 8) + desf('mo-b3', 3) +
      linear('mo-dedo', [[0, '#cfc3b3'], [0.3, '#f3ece2'], [0.75, '#b3a694'], [1, '#8f8270']]) +
      linear('mo-palma', [[0, '#e8dfd2'], [1, '#a99b89']]),
    passos: [
      { t: 'Bloco da palma', txt: 'Comece por caixas, como nos estudos de estrutura da mão. A palma é um bloco um pouco mais largo em cima. Não é um quadrado perfeito: o lado do dedo mínimo é mais curto.', g: [P(PALMA)] },
      { t: 'Arco dos nós', txt: 'Os nós dos dedos não ficam em linha reta: formam um arco, com o dedo médio mais alto. Marque esse arco antes dos dedos.', g: [P('M142,254 Q192,226 272,256', 'g'), ...DEDOS.map(([x, y]) => C(x, y, 5, 'g'))] },
      { t: 'Dedos como cilindros', txt: 'Cada dedo são três cilindros empilhados; as elipses marcam as juntas e mostram para onde o dedo está virado. O médio é o mais comprido; o mínimo, o mais curto. As juntas também seguem arcos.', g: DEDOS.map(([x, y, w, c, a]) => dedo(x, y, w, c, a) + juntas(x, y, w, c, a)) },
      { t: 'Polegar', txt: 'O polegar sai da lateral da palma, com uma base em forma de triângulo, e aponta para fora. Ele tem só duas partes visíveis.', g: [P('M142,322 L96,244 L150,276 Z', 'g'), P(POLEGAR)] },
      {
        t: 'Acabamento', final: true, semLinhas: true, realista: true,
        txt: 'Trate cada dedo como um cilindro: claro de um lado, escuro do outro. Os espaços entre os dedos e a sombra da mão no papel fazem a mão sair do fundo.',
        fundo: [
          `<path d="M160,380 C220,398 300,390 320,360 L300,250 C290,300 280,340 250,370 Z" fill="#2b2622" opacity=".35" filter="url(#mo-b8)"/>`,
          `<path d="${PALMA}" fill="url(#mo-palma)"/>`,
          `<path d="${POLEGAR} L148,340 C140,330 138,324 142,318 Z" fill="url(#mo-dedo)"/>`,
          ...DEDOS.map(([x, y, w, c, a]) => `<rect x="${f(x - w / 2)}" y="${f(y - c)}" width="${f(w)}" height="${f(c + 6)}" rx="${f(w / 2)}" fill="url(#mo-dedo)" transform="rotate(${a} ${f(x)} ${f(y)})"/>`),
          ...DEDOS.map(([x, y, w, c, a]) => [0.36, 0.66].map((t) => `<ellipse cx="${f(x)}" cy="${f(y - c * t)}" rx="${f(w / 2.4)}" ry="3" fill="#8a7d6c" opacity=".5" filter="url(#mo-b3)" transform="rotate(${a} ${f(x)} ${f(y)})"/>`).join('')),
          `<ellipse cx="206" cy="258" rx="70" ry="8" fill="#8a7d6c" opacity=".45" filter="url(#mo-b3)"/>`
        ],
        g: [P(PALMA), P(POLEGAR), ...DEDOS.map(([x, y, w, c, a]) => dedo(x, y, w, c, a))]
      }
    ]
  };

  const LICOES = { maca, xicara, vaso, olhoR: olho, narizF: narizFrente, nariz34, bocaR: boca, orelhaR: orelha, rostoF: rostoFrente, rostoP: rostoPerfil, mao };

  // ------------------------------------------------------------------
  // Renderização "grafite": hachura em camadas + grão de papel
  // ------------------------------------------------------------------
  const TAM = 800;
  const envolver = (l, s) => (l.escala ? `<g transform="${l.escala}">${s}</g>` : s);
  const cacheImg = new Map();
  function svgTom(l, p) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="${TAM}" height="${TAM}"><rect width="400" height="400" fill="#fbf8f2"/><defs>${l.defs || ''}</defs>${envolver(l, (p.fundo || []).join(''))}</svg>`;
  }
  function svgContorno(l, p) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="${TAM}" height="${TAM}"><style>.l{fill:none;stroke:#3a3530;stroke-width:1.3;stroke-linecap:round;stroke-linejoin:round;opacity:.7}</style>${envolver(l, (p.g || []).join(''))}</svg>`;
  }
  const ruido = (x, y) => { const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return s - Math.floor(s); };
  const CAMADAS = [
    { lim: 0.86, ang: 45, esp: 7 },
    { lim: 0.72, ang: -35, esp: 6 },
    { lim: 0.54, ang: 80, esp: 5 },
    { lim: 0.36, ang: 15, esp: 4.2 },
    { lim: 0.2, ang: -60, esp: 3.6 }
  ];
  async function renderizar(l, k, modo) {
    const chave = `${l.id}:${k}:${modo}`;
    if (cacheImg.has(chave)) return cacheImg.get(chave);
    const p = l.passos[k];
    const c = document.createElement('canvas'); c.width = TAM; c.height = TAM;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const tom = await U.carregarImagem(U.svgParaUrl(svgTom(l, p)));
    ctx.drawImage(tom, 0, 0, TAM, TAM);
    if (modo === 'grafite') {
      const img = ctx.getImageData(0, 0, TAM, TAM), d = img.data;
      const cam = CAMADAS.map((q) => ({ ...q, ca: Math.cos(q.ang * Math.PI / 180), sa: Math.sin(q.ang * Math.PI / 180) }));
      for (let y = 0; y < TAM; y++) {
        for (let x = 0; x < TAM; x++) {
          const i = (y * TAM + x) * 4;
          const T = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
          const g = ruido(x, y);
          let esc = (1 - T) * 0.3; // esfumado de base
          for (const q of cam) {
            if (T >= q.lim) continue;
            const forca = Math.min(1, (q.lim - T) / 0.16);
            const onda = 0.9 * Math.sin(x * 0.021 + y * 0.017 + q.ang); // traço levemente irregular
            const v = (x * q.ca + y * q.sa) / q.esp + onda;
            const dist = Math.abs(v - Math.floor(v) - 0.5) * 2; // 0 no meio do traço
            const linha = Math.max(0, 1 - dist / 0.42);
            esc += forca * linha * 0.42;
          }
          esc *= 0.82 + 0.36 * g; // grão do papel
          if (T > 0.97) esc *= 0.3;
          esc = Math.min(1, esc);
          d[i] = 251 + (38 - 251) * esc; d[i + 1] = 248 + (34 - 248) * esc; d[i + 2] = 242 + (31 - 242) * esc; d[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    }
    const cont = await U.carregarImagem(U.svgParaUrl(svgContorno(l, p)));
    ctx.drawImage(cont, 0, 0, TAM, TAM);
    const url = c.toDataURL('image/jpeg', 0.9);
    cacheImg.set(chave, url);
    return url;
  }

  // Figura do passo final com a troca entre Grafite e Suave
  function figura(l, k) {
    const caixa = U.h('div', { class: 'figura-realista' });
    const img = U.h('img', { alt: `${l.titulo}: acabamento`, class: 'img-realista' });
    const seg = U.h('div', { class: 'segmentado' });
    const mostrar = async (modo) => {
      U.store.set('acabamento', modo);
      U.$$('.seg', seg).forEach((b) => b.classList.toggle('ativo', b.dataset.modo === modo));
      img.style.opacity = '.4';
      try { img.src = await renderizar(l, k, modo); } catch (e) { U.aviso('Não foi possível gerar o acabamento.'); }
      img.style.opacity = '1';
    };
    for (const [m, r] of [['grafite', 'Grafite'], ['suave', 'Suave']]) seg.append(U.h('button', { class: 'seg', 'data-modo': m, onclick: () => mostrar(m) }, r));
    caixa.append(img, U.h('div', { class: 'troca-acabamento' }, seg));
    mostrar(U.store.get('acabamento', 'grafite'));
    return caixa;
  }
  const referencia = (l, k) => renderizar(l, k, U.store.get('acabamento', 'grafite'));

  // Registra as lições e a trilha
  Object.assign(Licoes.LICOES, LICOES);
  Licoes.TRILHAS.splice(1, 0, {
    id: 'realista', titulo: 'Do simples ao realista', icone: 'lapis',
    sub: 'Das formas básicas ao acabamento a lápis',
    itens: ['maca', 'xicara', 'vaso', 'olhoR', 'narizF', 'nariz34', 'bocaR', 'orelhaR', 'rostoF', 'rostoP', 'mao'].map((id) => ['licao', id])
  });

  return { figura, referencia, LICOES };
})();
