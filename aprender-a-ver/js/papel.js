/*
 * Tipos de papel e gramaturas (75 a 220 g/m²). O papel muda a cor da folha,
 * o grão (dente) que segura o grafite, quanto escuro o papel aceita, como o
 * esfuminho espalha e como a borracha limpa. Usado pelo Ateliê e pela Prancheta.
 */
const Papel = (() => {
  const GRAMATURAS = [75, 90, 120, 140, 160, 180, 200, 220];
  // dente: rugosidade da superfície (0 liso a 1 áspero); escala: tamanho do grão
  const TIPOS = {
    sulfite: { rotulo: 'Sulfite', cor: '#f8f8f5', dente: 0.22, escala: 1, sugerida: 75,
      texto: 'Papel de impressora. Liso e fino: aceita pouco grafite, marca com facilidade e não aguenta muita borracha. Bom para rascunhos e exercícios rápidos.' },
    offset: { rotulo: 'Offset', cor: '#f7f5ee', dente: 0.3, escala: 1.1, sugerida: 120,
      texto: 'Um pouco mais encorpado que o sulfite. Serve para estudos de linha e de valor sem muitas camadas.' },
    desenho: { rotulo: 'Papel de desenho', cor: '#f4efe3', dente: 0.5, escala: 1.5, sugerida: 180,
      texto: 'O mais usado para grafite (como o Canson). Dente médio: aceita várias camadas, esfuminho e borracha sem estragar.' },
    bristol: { rotulo: 'Bristol liso', cor: '#fbfbf8', dente: 0.12, escala: 0.8, sugerida: 220,
      texto: 'Muito liso: ótimo para detalhes finos, pele e esfuminho. Escurece menos e o grafite macio brilha quando acumula.' },
    tonalizado: { rotulo: 'Tonalizado cinza', cor: '#d6d3cc', dente: 0.48, escala: 1.4, sugerida: 160,
      texto: 'Papel em tom médio: o grafite faz as sombras e o lápis branco faz as luzes. Ensina a pensar em três valores.' },
    kraft: { rotulo: 'Kraft', cor: '#c9a87c', dente: 0.45, escala: 1.3, sugerida: 200,
      texto: 'Papel pardo, quente. Combina com grafite, carvão e realces em branco.' },
    texturizado: { rotulo: 'Texturizado', cor: '#f3efe6', dente: 0.85, escala: 2.4, sugerida: 220,
      texto: 'Grão grosso, como o de aquarela: o grafite fica só no alto da textura. Bom para carvão e retratos expressivos.' }
  };

  // Propriedades efetivas de um papel numa gramatura
  function propriedades(tipo, gramatura) {
    const t = TIPOS[tipo] || TIPOS.desenho, g = Math.min(220, Math.max(75, gramatura || t.sugerida));
    const f = (g - 75) / 145; // 0 no papel mais fino, 1 no mais grosso
    const dente = Math.min(1, t.dente * (0.75 + 0.5 * f));
    return {
      tipo, gramatura: g, rotulo: t.rotulo, cor: t.cor, texto: t.texto, escala: t.escala, dente,
      absorcao: 0.78 + 0.22 * f,       // quanto grafite o papel segura
      esfuma: 1.15 - 0.45 * dente,     // papel liso espalha mais
      apaga: 0.72 + 0.28 * f,          // papel fino limpa pior e pode marcar
      grao: 0.03 + 0.09 * dente        // intensidade visível do grão
    };
  }
  function atual() {
    const s = U.store.get('papel', { tipo: 'desenho', gramatura: 180 });
    return propriedades(s.tipo, s.gramatura);
  }
  function definir(tipo, gramatura) { U.store.set('papel', { tipo, gramatura }); return propriedades(tipo, gramatura); }

  // Ruído do grão (o mesmo usado na textura do traço e na aparência da folha)
  let base = null;
  function ruido() {
    if (base) return base;
    const tam = 256, c = document.createElement('canvas'); c.width = c.height = tam;
    const x = c.getContext('2d'), img = x.createImageData(tam, tam), d = img.data;
    let s = 104729; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const v = new Float32Array(tam * tam); for (let i = 0; i < v.length; i++) v[i] = rnd();
    for (let y = 0; y < tam; y++) for (let xx = 0; xx < tam; xx++) {
      const i = y * tam + xx;
      const m = (v[i] * 2 + v[y * tam + ((xx + 1) % tam)] + v[((y + 1) % tam) * tam + xx] + v[((y + tam - 1) % tam) * tam + xx]) / 5;
      d[i * 4 + 3] = Math.round(Math.pow(m, 1.3) * 255);
    }
    x.putImageData(img, 0, 0);
    base = c;
    return c;
  }
  // Ladrilho do grão na escala do papel (para padrões de canvas)
  const ladrilhos = new Map();
  function ladrilho(escala) {
    const k = Math.round(escala * 10) / 10;
    if (ladrilhos.has(k)) return ladrilhos.get(k);
    const tam = Math.round(256 * k), c = document.createElement('canvas'); c.width = c.height = tam;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.drawImage(ruido(), 0, 0, tam, tam);
    ladrilhos.set(k, c);
    return c;
  }
  // Aparência do grão sobre a folha (sombra nos vales do papel)
  function desenharGrao(ctx, W, H, p) {
    const t = ladrilho(p.escala), c = document.createElement('canvas'); c.width = t.width; c.height = t.height;
    const x = c.getContext('2d'); x.drawImage(t, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#5e5546'; x.fillRect(0, 0, c.width, c.height);
    ctx.save(); ctx.globalAlpha = p.grao; ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = ctx.createPattern(c, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  // Imagem de fundo (data URL) com cor e grão, para áreas em HTML
  const fundos = new Map();
  function fundoCss(p) {
    const k = p.tipo + p.gramatura;
    if (fundos.has(k)) return fundos.get(k);
    const t = ladrilho(p.escala), c = document.createElement('canvas'); c.width = t.width; c.height = t.height;
    const x = c.getContext('2d'); x.fillStyle = p.cor; x.fillRect(0, 0, c.width, c.height); desenharGrao(x, c.width, c.height, p);
    const url = `url(${c.toDataURL('image/png')})`;
    fundos.set(k, url);
    return url;
  }

  // Ladrilho colorido com o grão: usado como "tinta" de traços (lápis e carvão)
  const tintas = new Map();
  function tintaGranulada(cor, forca, p) {
    const ef = Math.min(1, forca * (0.35 + 1.15 * p.dente)), chave = cor + '|' + ef.toFixed(2) + '|' + p.escala;
    if (tintas.has(chave)) return tintas.get(chave);
    const t = ladrilho(p.escala), c = document.createElement('canvas'); c.width = t.width; c.height = t.height;
    const x = c.getContext('2d');
    x.fillStyle = `rgba(0,0,0,${1 - ef})`; x.fillRect(0, 0, c.width, c.height);
    x.globalAlpha = ef; x.drawImage(t, 0, 0); x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-in'; x.fillStyle = cor; x.fillRect(0, 0, c.width, c.height);
    if (tintas.size > 60) tintas.clear();
    tintas.set(chave, c);
    return c;
  }

  // Controles de escolha (tipo e gramatura) com a explicação do papel
  function controles(aoMudar) {
    const { h } = U;
    const caixa = h('div', { class: 'controles coluna papel-controles' });
    const montar = () => {
      const p = atual();
      caixa.innerHTML = '';
      const segT = h('div', { class: 'segmentado' }), segG = h('div', { class: 'segmentado' });
      for (const [id, t] of Object.entries(TIPOS)) segT.append(h('button', { class: 'seg' + (id === p.tipo ? ' ativo' : ''), onclick: () => { aoMudar(definir(id, t.sugerida)); montar(); } }, t.rotulo));
      for (const g of GRAMATURAS) segG.append(h('button', { class: 'seg' + (g === p.gramatura ? ' ativo' : ''), onclick: () => { aoMudar(definir(p.tipo, g)); montar(); } }, g + ' g'));
      caixa.append(
        h('div', { class: 'barra-ferramentas' }, h('span', { class: 'rotulo' }, 'Tipo de papel'), segT),
        h('div', { class: 'barra-ferramentas' }, h('span', { class: 'rotulo' }, 'Gramatura (g/m²)'), segG),
        h('div', { class: 'papel-amostra' }, h('span', { class: 'amostra', style: { backgroundImage: fundoCss(p) } }),
          h('p', { class: 'nota' }, h('strong', {}, `${p.rotulo}, ${p.gramatura} g/m². `), p.texto, ' ', descreverGramatura(p.gramatura))));
    };
    montar();
    return caixa;
  }
  function descreverGramatura(g) {
    if (g <= 90) return 'Gramatura baixa: folha fina, transparece e enruga com esfuminho e borracha.';
    if (g <= 140) return 'Gramatura média: aguenta algumas camadas e correções leves.';
    if (g <= 180) return 'Gramatura boa para desenho: firme, aceita muitas camadas e correções.';
    return 'Gramatura alta: folha grossa e resistente, aceita esfuminho e borracha sem marcar.';
  }

  return { TIPOS, GRAMATURAS, propriedades, atual, definir, ladrilho, desenharGrao, fundoCss, tintaGranulada, controles };
})();
