/*
 * Progresso de estudo: o que já foi feito, sequência de dias,
 * desenhos de partida (para comparar antes e depois) e galeria.
 */
const Progresso = (() => {
  const { h } = U;

  function concluir(origem) {
    if (!origem) return;
    const feitos = U.store.get('feitos', {});
    feitos[origem] = new Date().toISOString();
    U.store.set('feitos', feitos);
  }
  const feito = (tipo, id) => !!U.store.get('feitos', {})[`${tipo}:${id}`];
  function contarTrilha(t) {
    return t.itens.filter(([tipo, id]) => feito(tipo, id)).length;
  }

  const urls = new Set();
  const urlDe = (blob) => { const u = URL.createObjectURL(blob); urls.add(u); return u; };
  function liberarUrls() { for (const u of urls) URL.revokeObjectURL(u); urls.clear(); }

  async function montar(raiz) {
    liberarUrls();
    let lista = [];
    try { lista = await U.desenhos.todos(); } catch (e) { raiz.append(h('p', { class: 'nota' }, 'Este navegador não permite guardar desenhos. Use "Baixar imagem" na prancheta.')); }
    const dias = U.store.get('dias', {});
    const totalMin = Object.values(dias).reduce((a, b) => a + b, 0);
    const seq = U.sequenciaDias();

    raiz.append(h('div', { class: 'numeros' },
      numero(seq, seq === 1 ? 'dia seguido' : 'dias seguidos'),
      numero(Object.keys(dias).length, 'dias de prática'),
      numero(lista.length, lista.length === 1 ? 'desenho' : 'desenhos'),
      numero(totalMin >= 60 ? (totalMin / 60).toFixed(1).replace('.', ',') + ' h' : totalMin + ' min', 'de estudo')));
    raiz.append(h('p', { class: 'nota' }, 'Betty Edwards recomenda desenhar todos os dias, sem esperar inspiração. Dez minutos contam.'));

    // Trilhas
    const trilhas = h('div', { class: 'cartao' }, h('h2', {}, 'Trilhas'));
    for (const t of Licoes.TRILHAS) {
      const n = contarTrilha(t), tot = t.itens.length;
      trilhas.append(h('a', { class: 'barra-trilha', href: `#/trilha/${t.id}` },
        h('span', {}, t.titulo), h('span', { class: 'barra' }, h('span', { style: { width: (n / tot * 100) + '%' } })), h('span', { class: 'nota' }, `${n}/${tot}`)));
    }
    raiz.append(trilhas);

    // Desenhos de partida x recentes
    const partida = h('div', { class: 'cartao' }, h('h2', {}, 'Antes e depois'),
      h('p', {}, 'Os desenhos de partida registram o seu ponto inicial. Refaça os mesmos temas de tempos em tempos e compare lado a lado.'));
    const grade = h('div', { class: 'grade-partida' });
    for (const t of Licoes.EXERCICIOS.partida.tarefas) {
      const dessa = lista.filter((d) => d.origem === 'exercicio:partida' && d.tarefa === t.id);
      const primeiro = dessa[dessa.length - 1], ultimo = dessa[0];
      const cel = h('div', { class: 'cel-partida' }, h('strong', {}, t.titulo));
      if (!primeiro) cel.append(h('a', { class: 'btn pequeno', href: '#/exercicio/partida' }, 'Fazer agora'));
      else {
        const par = h('div', { class: 'par' }, miniatura(primeiro, 'Antes'));
        if (ultimo && ultimo !== primeiro) par.append(miniatura(ultimo, 'Depois'));
        cel.append(par);
      }
      grade.append(cel);
    }
    partida.append(grade);
    raiz.append(partida);

    // Galeria
    const gal = h('div', { class: 'cartao' }, h('h2', {}, 'Meus desenhos'));
    if (!lista.length) gal.append(h('p', { class: 'nota' }, 'Os desenhos salvos na prancheta aparecem aqui, com data, tempo e a sua autoavaliação.'));
    const g = h('div', { class: 'galeria' });
    for (const d of lista) g.append(h('button', { class: 'item-galeria', onclick: () => abrir(d, raiz) },
      h('img', { src: urlDe(d.png), alt: d.titulo, loading: 'lazy' }),
      h('span', { class: 'legenda-item' }, d.titulo),
      h('span', { class: 'nota' }, U.dataCurta(d.criadoEm) + (d.nota ? ` · ${d.nota}/5` : ''))));
    gal.append(g);
    raiz.append(gal);
  }

  function numero(v, rot) { return h('div', { class: 'numero' }, h('strong', {}, String(v)), h('span', {}, rot)); }
  function miniatura(d, rot) {
    return h('figure', {}, h('img', { src: urlDe(d.png), alt: `${rot}: ${d.titulo}` }), h('figcaption', {}, `${rot} · ${U.dataCurta(d.criadoEm)}`));
  }

  function abrir(d, raiz) {
    const info = h('div', { class: 'detalhe' },
      h('img', { src: urlDe(d.png), alt: d.titulo, class: 'img-detalhe' }),
      h('p', { class: 'nota' }, `${U.dataCurta(d.criadoEm)} · ${U.duracao(d.duracao)}` + (d.olhadas != null ? ` · olhadas: ${d.olhadas}` : '') + (d.nota ? ` · autoavaliação ${d.nota}/5` : '')),
      d.gostei ? h('p', {}, h('b', {}, 'Gostei: '), d.gostei) : null,
      d.melhorar ? h('p', {}, h('b', {}, 'Melhorar: '), d.melhorar) : null);
    U.modal(d.titulo, info, [
      { rotulo: 'Apagar', classe: 'perigo', acao: () => { if (!confirm('Apagar este desenho?')) return false; U.desenhos.apagar(d.id).then(() => { raiz.innerHTML = ''; montar(raiz); }); } },
      { rotulo: 'Baixar', acao: () => { U.baixar(d.png, `${d.titulo.replace(/[^\w\- ]+/g, '')}.png`); return false; } },
      { rotulo: 'Fechar', classe: 'primario' }
    ]);
  }

  return { concluir, feito, contarTrilha, montar };
})();
