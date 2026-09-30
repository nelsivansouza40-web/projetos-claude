/*
 * Navegação e telas principais do aplicativo Aprender a Ver.
 */
const App = (() => {
  const { h, $ } = U;
  const vista = () => $('#vista');
  let pendente = null;
  let rotaAtual = '';
  let ignorarProxima = false;

  const TIPOS = { licao: 'Lição', exercicio: 'Exercício', sim: 'Simulador' };
  const hrefItem = (tipo, id) => `#/${tipo}/${id}`;

  function definirTitulo(titulo, sub) {
    $('#titulo-pagina').textContent = titulo;
    $('#subtitulo-pagina').textContent = sub || '';
    document.title = titulo === 'Aprender a Ver' ? 'Aprender a Ver' : `${titulo} · Aprender a Ver`;
  }

  function abrirPrancheta(cfg) {
    pendente = cfg;
    if (location.hash === '#/prancheta') rotear(); else location.hash = '#/prancheta';
  }

  // ---------------- telas ----------------
  function telaInicio(raiz) {
    definirTitulo('Aprender a Ver', 'Estudo de desenho realista');
    const seq = U.sequenciaDias();
    const todos = Licoes.TRILHAS.flatMap((t) => t.itens.map(([tipo, id]) => ({ tipo, id, trilha: t })));
    const pendentes = todos.filter((x) => !Progresso.feito(x.tipo, x.id));
    const base = pendentes.length ? pendentes : todos;
    const dia = Math.floor(Date.now() / 864e5);
    const sug = base[dia % Math.min(base.length, 6)];
    const infoSug = Licoes.item(sug.tipo, sug.id);

    raiz.append(
      h('section', { class: 'capa-inicio' },
        h('p', { class: 'sobretitulo' }, 'Observação visual, forma, luz e sombra'),
        h('h1', {}, 'Aprender a Ver'),
        h('p', {}, 'Um caderno de estudo com as técnicas de Betty Edwards e Andrew Loomis, simuladores e uma prancheta para praticar.'),
        h('div', { class: 'linha-sequencia' }, h('span', { html: U.icone('relogio') }), seq ? `${seq} ${seq === 1 ? 'dia seguido' : 'dias seguidos'} de prática` : 'Desenhe hoje para começar a sua sequência')),
      h('a', { class: 'cartao sugestao', href: hrefItem(sug.tipo, sug.id) },
        h('span', { class: 'rotulo' }, 'Sugestão para hoje'),
        h('strong', {}, infoSug.titulo),
        h('span', {}, infoSug.resumo),
        h('span', { class: 'nota' }, `${TIPOS[sug.tipo]} · ${sug.trilha.titulo}`))
    );
    const grade = h('div', { class: 'grade-trilhas' });
    for (const t of Licoes.TRILHAS) {
      const n = Progresso.contarTrilha(t), tot = t.itens.length;
      grade.append(h('a', { class: 'cartao trilha', href: `#/trilha/${t.id}` },
        h('span', { class: 'ico-trilha', html: U.icone(t.icone) }),
        h('span', { class: 'trilha-texto' }, h('strong', {}, t.titulo), h('span', {}, t.sub)),
        h('span', { class: 'progresso-mini' }, h('span', { class: 'barra' }, h('span', { style: { width: (n / tot * 100) + '%' } })), `${n}/${tot}`)));
    }
    raiz.append(h('h2', { class: 'secao' }, 'Trilhas'), grade);
    raiz.append(h('h2', { class: 'secao' }, 'Ferramentas'), h('div', { class: 'grade-ferramentas' },
      h('a', { class: 'cartao ferramenta', href: '#/foto' }, h('span', { html: U.icone('foto') }), h('strong', {}, 'Foto em etapas'), h('span', {}, 'Contornos, valores, grades de proporção e aferição a partir de uma foto sua.')),
      h('a', { class: 'cartao ferramenta', href: '#/prancheta' }, h('span', { html: U.icone('lapis') }), h('strong', {}, 'Prancheta livre'), h('span', {}, 'Lápis de 2H a 6B, carvão, pincel, esfuminho, papel higiênico e borrachas, com tempo e autoavaliação.')),
      h('a', { class: 'cartao ferramenta', href: '#/progresso' }, h('span', { html: U.icone('grafico') }), h('strong', {}, 'Meu progresso'), h('span', {}, 'Desenhos salvos, antes e depois, sequência de dias.'))));
    raiz.append(h('p', { class: 'rodape-inicio' }, h('a', { href: '#/sobre' }, 'Sobre as fontes, privacidade e instalação')));
  }

  function telaTrilha(raiz, id) {
    const t = Licoes.TRILHAS.find((x) => x.id === id);
    if (!t) return naoEncontrado(raiz);
    definirTitulo(t.titulo, t.sub);
    const lista = h('div', { class: 'lista-itens' });
    t.itens.forEach(([tipo, iid], k) => {
      const info = Licoes.item(tipo, iid);
      const ok = Progresso.feito(tipo, iid);
      lista.append(h('a', { class: 'cartao item' + (ok ? ' feito' : ''), href: hrefItem(tipo, iid) },
        h('span', { class: 'num' }, ok ? '✓' : String(k + 1)),
        h('span', { class: 'item-texto' },
          h('span', { class: 'rotulo' }, `${TIPOS[tipo]} · ${info.fonte}`),
          h('strong', {}, info.titulo),
          h('span', {}, info.resumo))));
    });
    raiz.append(lista);
  }

  function proximoNaTrilha(tipo, id) {
    for (const t of Licoes.TRILHAS) {
      const k = t.itens.findIndex(([a, b]) => a === tipo && b === id);
      if (k >= 0) return { trilha: t, prox: t.itens[k + 1] || null };
    }
    return { trilha: null, prox: null };
  }

  function telaLicao(raiz, id) {
    const l = Licoes.LICOES[id];
    if (!l) return naoEncontrado(raiz);
    definirTitulo(l.titulo, l.fonte);
    raiz.append(h('p', { class: 'resumo' }, l.resumo));
    const vb = l.vb || [400, 400];
    const etapas = l.passos.map((p, k) => ({ titulo: p.t, texto: p.txt, figura: () => Licoes.svgEtapa(l, k) }));
    Visual.passos(raiz, etapas, {
      aoPraticar: (k) => abrirPrancheta({
        titulo: `${l.titulo}: ${l.passos[k].t}`, origem: 'licao:' + id,
        referencia: U.svgParaUrl(Licoes.svgEtapa(l, k)), layout: 'lado', aspecto: vb[0] / vb[1], tempoMin: 10
      }),
      aoConcluir: () => {
        Progresso.concluir('licao:' + id);
        const { trilha, prox } = proximoNaTrilha('licao', id);
        const acoes = [{ rotulo: 'Praticar o desenho final', acao: () => abrirPrancheta({ titulo: l.titulo, origem: 'licao:' + id, referencia: U.svgParaUrl(Licoes.svgEtapa(l, l.passos.length - 1)), layout: 'lado', aspecto: vb[0] / vb[1], tempoMin: 15 }) }];
        if (prox) acoes.push({ rotulo: 'Próximo item', classe: 'primario', acao: () => { location.hash = hrefItem(prox[0], prox[1]); } });
        else if (trilha) acoes.push({ rotulo: 'Voltar à trilha', classe: 'primario', acao: () => { location.hash = '#/trilha/' + trilha.id; } });
        U.modal('Lição concluída', h('p', {}, 'Ler as etapas é metade do trabalho. A outra metade é desenhar: pratique a figura final na prancheta, olhando a referência ao lado.'), acoes);
      }
    });
  }

  async function lerFotoComoReferencia(arq) {
    const url = URL.createObjectURL(arq);
    try {
      const img = await U.carregarImagem(url);
      const k = Math.min(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return { src: c.toDataURL('image/jpeg', 0.9), aspecto: c.width / c.height };
    } finally { URL.revokeObjectURL(url); }
  }

  function telaExercicio(raiz, id) {
    const ex = Licoes.EXERCICIOS[id];
    if (!ex) return naoEncontrado(raiz);
    definirTitulo(ex.titulo, ex.fonte);
    const origem = 'exercicio:' + id;
    raiz.append(h('div', { class: 'cartao' },
      h('p', { class: 'rotulo' }, `Tempo: ${ex.tempo}`),
      h('p', { class: 'objetivo' }, ex.objetivo),
      h('h3', {}, 'Como fazer'),
      h('ol', { class: 'passos' }, ex.passos.map((p) => h('li', {}, p)))));
    const acoes = h('div', { class: 'cartao acoes-exercicio' });
    const base = Object.assign({ titulo: ex.titulo, origem }, ex.prancheta || {});

    if (id === 'partida') {
      acoes.append(h('h3', {}, 'Escolha o desenho'));
      for (const t of ex.tarefas) acoes.append(h('button', { class: 'btn largo', onclick: () => abrirPrancheta(Object.assign({}, base, { titulo: t.titulo, tarefa: t.id })) }, `${t.id}. ${t.titulo}`));
    } else if (ex.referencia === 'escolher') {
      const entrada = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async (e) => {
        const arq = e.target.files && e.target.files[0];
        if (!arq) return;
        try { const r = await lerFotoComoReferencia(arq); abrirPrancheta(Object.assign({}, base, { referencia: r.src, aspecto: r.aspecto })); } catch (err) { U.aviso(err.message); }
      } });
      acoes.append(h('h3', {}, 'Escolha a referência'), entrada,
        h('button', { class: 'btn primario largo', onclick: () => entrada.click() }, 'Usar uma foto do aparelho'),
        h('p', { class: 'nota' }, 'Ou use um desenho do próprio aplicativo:'));
      const grade = h('div', { class: 'grade-refs' });
      for (const r of Licoes.referenciasInternas()) {
        grade.append(h('button', { class: 'ref-interna', onclick: () => abrirPrancheta(Object.assign({}, base, { referencia: U.svgParaUrl(r.svg), aspecto: 1 })) },
          h('span', { class: 'mini', html: r.svg }), h('span', {}, r.titulo)));
      }
      acoes.append(grade);
    } else if (ex.referencia === 'foto-nanquim' || ex.referencia === 'foto-negativo') {
      const etapaIdx = 2;
      if (Foto.temFoto()) {
        acoes.append(h('button', { class: 'btn primario largo', onclick: () => abrirPrancheta(Object.assign({}, base, { referencia: Foto.referenciaEtapa('nanquim') })) }, 'Usar a foto que já está aberta'));
      }
      acoes.append(h('a', { class: 'btn largo', href: `#/foto?aba=etapas&etapa=${etapaIdx}&exercicio=${id}` }, Foto.temFoto() ? 'Ajustar na ferramenta de foto' : 'Abrir a ferramenta de foto'),
        h('p', { class: 'nota' }, ex.referencia === 'foto-negativo' ? 'Na etapa "Sombras em duas tonalidades", marque "Inverter" se o fundo ficar claro: a ideia é o espaço em volta do objeto aparecer escuro.' : 'Na etapa "Sombras em duas tonalidades", ajuste o controle e toque em "Praticar esta etapa".'));
    } else if (ex.abreFoto) {
      acoes.append(h('a', { class: 'btn primario largo', href: `#/foto?aba=${ex.abreFoto}&exercicio=${id}` }, 'Abrir a ferramenta de foto'),
        h('button', { class: 'btn largo', onclick: () => { Progresso.concluir(origem); U.aviso('Exercício marcado como feito.'); } }, 'Marcar como feito'));
    } else {
      acoes.append(h('button', { class: 'btn primario largo', onclick: () => abrirPrancheta(base) }, 'Começar'));
    }
    raiz.append(acoes);
  }

  function telaSim(raiz, id) {
    const s = Licoes.SIMS[id];
    if (!s || !Sims[id]) return naoEncontrado(raiz);
    definirTitulo(s.titulo, 'Simulador');
    const area = h('div', {});
    raiz.append(area);
    const sim = Sims[id](area);
    raiz.append(h('div', { class: 'linha-botoes' },
      h('button', { class: 'btn', onclick: () => { Progresso.concluir('sim:' + id); U.aviso('Marcado como estudado.'); } }, 'Marcar como estudado'),
      h('button', { class: 'btn primario', onclick: async () => {
        const ref = await sim.referencia();
        const img = await U.carregarImagem(ref);
        abrirPrancheta({ titulo: s.titulo, origem: 'sim:' + id, referencia: ref, layout: 'lado', aspecto: img.naturalWidth / img.naturalHeight, tempoMin: 15 });
      } }, 'Desenhar esta vista')));
  }

  function telaSobre(raiz) {
    definirTitulo('Sobre', 'Fontes, privacidade e instalação');
    raiz.append(h('div', { class: 'cartao texto' },
      h('h2', {}, 'Fontes das técnicas'),
      h('ul', {},
        h('li', {}, h('b', {}, 'Betty Edwards, "Desenhando com o Lado Direito do Cérebro": '), 'desenhos de partida, vasos e rostos, desenho de cabeça para baixo, contorno cego e modificado, espaços negativos com visor, aferição com o lápis, forma vazia da cabeça, perfil e três quartos, escala de valores, sombras em nanquim e hachura cruzada.'),
        h('li', {}, h('b', {}, 'Andrew Loomis, "Drawing the Head and Hands": '), 'bola achatada e plano do rosto, a cruz da sobrancelha com a linha central, os três terços do rosto, a cabeça em unidades, uma única fonte de luz, linhas de construção desenhadas sobre fotos e o traço com ritmo.'),
        h('li', {}, h('b', {}, 'Estudos de referência: '), 'partes do rosto em quatro ângulos, nariz visto de baixo em quatro etapas e proporções do rosto, a partir das imagens enviadas; e a ideia de ver a construção etapa por etapa, do aplicativo mostrado no vídeo.')),
      h('p', {}, 'Os textos do aplicativo foram escritos para ele, com base nessas técnicas. Os livros originais continuam sendo a melhor leitura.'),
      h('h2', {}, 'Privacidade'),
      h('p', {}, 'Fotos e desenhos ficam só neste aparelho, no armazenamento do navegador. Nada é enviado para a internet. Se você limpar os dados do navegador, os desenhos salvos são apagados; use "Baixar" para guardar cópias.'),
      h('h2', {}, 'Instalar no celular'),
      h('p', {}, 'No Chrome do Android: menu (três pontos) e "Instalar aplicativo" ou "Adicionar à tela inicial". No iPhone: botão Compartilhar e "Adicionar à Tela de Início". Depois do primeiro acesso, o aplicativo funciona sem internet.')));
  }

  function naoEncontrado(raiz) {
    definirTitulo('Não encontrado');
    raiz.append(h('p', {}, 'Esta página não existe. ', h('a', { href: '#/' }, 'Voltar ao início')));
  }

  // ---------------- roteador ----------------
  function lerRota() {
    const [caminho, consulta] = (location.hash.replace(/^#/, '') || '/').split('?');
    const partes = caminho.split('/').filter(Boolean);
    const params = Object.fromEntries(new URLSearchParams(consulta || ''));
    return { partes, params };
  }

  function rotear() {
    const { partes, params } = lerRota();
    const raiz = vista();
    raiz.innerHTML = '';
    raiz.className = '';
    window.scrollTo(0, 0);
    const [p0, p1] = partes;
    rotaAtual = location.hash;
    $('#btn-voltar').hidden = !p0;
    U.$$('#abas a').forEach((a) => a.classList.toggle('ativa', a.dataset.rota === (p0 || 'inicio')));
    try {
      if (!p0) telaInicio(raiz);
      else if (p0 === 'trilha') telaTrilha(raiz, p1);
      else if (p0 === 'licao') telaLicao(raiz, p1);
      else if (p0 === 'exercicio') telaExercicio(raiz, p1);
      else if (p0 === 'sim') telaSim(raiz, p1);
      else if (p0 === 'foto') {
        definirTitulo('Foto em etapas', 'Processada no próprio aparelho');
        Foto.montar(raiz, { aba: params.aba, exercicio: params.exercicio, etapa: params.etapa != null ? +params.etapa : null });
      } else if (p0 === 'prancheta') {
        definirTitulo('Prancheta', pendente ? pendente.titulo : 'Desenho livre');
        Prancheta.montar(raiz, pendente || { titulo: 'Desenho livre', origem: 'livre' });
        pendente = null;
      } else if (p0 === 'progresso') {
        definirTitulo('Meu progresso', 'Tudo fica guardado neste aparelho');
        Progresso.montar(raiz);
      } else if (p0 === 'sobre') telaSobre(raiz);
      else naoEncontrado(raiz);
    } catch (e) {
      console.error(e);
      raiz.append(h('p', { class: 'nota' }, 'Algo deu errado ao abrir esta tela. ', h('a', { href: '#/' }, 'Voltar ao início')));
    }
  }

  function iniciar() {
    let anterior = location.hash;
    window.addEventListener('hashchange', () => {
      if (ignorarProxima) { ignorarProxima = false; anterior = location.hash; return; }
      if (anterior.startsWith('#/prancheta') && Prancheta.temAlteracoes()) {
        const destino = location.hash;
        ignorarProxima = true;
        location.hash = anterior;
        U.confirmar('O desenho não foi salvo. Sair mesmo assim?', 'Sair sem salvar').then((ok) => {
          if (ok) { Prancheta.descartar(); location.hash = destino; }
        });
        return;
      }
      anterior = location.hash;
      rotear();
    });
    window.addEventListener('beforeunload', (e) => { if (Prancheta.temAlteracoes()) { e.preventDefault(); e.returnValue = ''; } });
    $('#btn-voltar').addEventListener('click', () => { if (history.length > 1) history.back(); else location.hash = '#/'; });
    rotear();
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* sem modo offline neste endereço */ });
    }
  }

  return { iniciar, abrirPrancheta };
})();

document.addEventListener('DOMContentLoaded', App.iniciar);
