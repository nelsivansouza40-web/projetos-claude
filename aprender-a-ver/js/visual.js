/*
 * Visualizador de etapas usado pelas lições e pela ferramenta de foto.
 * Dois modos, como no aplicativo do vídeo de referência:
 * "Etapa por etapa" (uma de cada vez) e "Todas as etapas" (rolagem).
 */
const Visual = (() => {
  const { h } = U;

  function conteudoFigura(f) {
    const v = typeof f === 'function' ? f() : f;
    if (v instanceof Node) return v;
    return h('div', { class: 'figura-svg', html: v });
  }

  function passos(raiz, etapas, op = {}) {
    let modo = U.store.get('modoVisual', 'etapa');
    let i = Math.min(op.inicial || 0, etapas.length - 1);
    const alternador = h('div', { class: 'segmentado largo', role: 'group', 'aria-label': 'Modo de visualização' });
    const corpo = h('div', { class: 'visual-corpo' });
    const opcoes = [['etapa', 'Etapa por etapa'], ['todas', 'Todas as etapas']];
    for (const [id, rot] of opcoes) {
      alternador.append(h('button', { class: 'seg' + (modo === id ? ' ativo' : ''), onclick: (e) => {
        modo = id; U.store.set('modoVisual', id);
        U.$$('.seg', alternador).forEach((b) => b.classList.remove('ativo'));
        e.currentTarget.classList.add('ativo');
        render();
      } }, rot));
    }
    raiz.append(alternador);
    if (op.legenda !== false) raiz.append(h('p', { class: 'legenda' }, h('span', { class: 'cor-novo' }, 'vermelho'), ': traço desta etapa · ', h('span', { class: 'cor-ant' }, 'azul'), ': etapas anteriores'));
    raiz.append(corpo);

    const botaoPraticar = (k) => op.aoPraticar ? h('button', { class: 'btn', onclick: () => op.aoPraticar(k) }, 'Praticar esta etapa') : null;

    function render() {
      corpo.innerHTML = '';
      if (modo === 'todas') {
        etapas.forEach((e, k) => {
          corpo.append(h('article', { class: 'cartao etapa' },
            h('div', { class: 'etapa-num' }, `Etapa ${k + 1}`),
            h('div', { class: 'papel figura' }, conteudoFigura(e.figura)),
            h('h3', {}, e.titulo), h('p', {}, e.texto),
            e.extra ? e.extra() : null,
            h('div', { class: 'linha-botoes' }, botaoPraticar(k))));
        });
        if (op.aoConcluir) corpo.append(h('div', { class: 'linha-botoes centro' }, h('button', { class: 'btn primario', onclick: op.aoConcluir }, 'Concluir')));
        return;
      }
      const e = etapas[i];
      const anterior = h('button', { class: 'btn', disabled: i === 0, onclick: () => { i--; render(); } }, 'Anterior');
      const ultima = i === etapas.length - 1;
      const proxima = ultima
        ? (op.aoConcluir ? h('button', { class: 'btn primario', onclick: op.aoConcluir }, 'Concluir') : h('span'))
        : h('button', { class: 'btn primario', onclick: () => { i++; render(); } }, 'Próxima');
      const pontos = h('div', { class: 'pontos', 'aria-hidden': 'true' }, etapas.map((_, k) => h('span', { class: k === i ? 'ativo' : k < i ? 'feito' : '' })));
      corpo.append(h('article', { class: 'cartao etapa' },
        h('div', { class: 'etapa-num' }, `Etapa ${i + 1} de ${etapas.length}`),
        h('div', { class: 'papel figura' }, conteudoFigura(e.figura)),
        pontos,
        h('h3', {}, e.titulo), h('p', {}, e.texto),
        e.extra ? e.extra() : null,
        h('div', { class: 'navegacao-etapa' }, anterior, botaoPraticar(i), proxima)));
    }
    render();
  }

  return { passos };
})();
