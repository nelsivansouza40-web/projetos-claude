/*
 * Utilitários gerais: DOM, armazenamento local (progresso) e banco de
 * desenhos no próprio aparelho (IndexedDB). Nada sai do dispositivo.
 */
const U = (() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Cria elemento: h('button', { class: 'btn', onclick: fn }, 'Texto')
  function h(tag, attrs = {}, ...filhos) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const f of filhos.flat()) {
      if (f == null || f === false) continue;
      el.append(f instanceof Node ? f : document.createTextNode(String(f)));
    }
    return el;
  }

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Armazenamento simples (progresso, preferências). Falha em silêncio.
  const store = {
    get(k, padrao) {
      try {
        const v = localStorage.getItem('av:' + k);
        return v == null ? padrao : JSON.parse(v);
      } catch (e) { return padrao; }
    },
    set(k, v) {
      try { localStorage.setItem('av:' + k, JSON.stringify(v)); } catch (e) { /* sem espaço ou bloqueado */ }
    }
  };

  // Banco de desenhos (imagens PNG + dados da sessão).
  let dbp = null;
  function abrirBanco() {
    if (!dbp) {
      dbp = new Promise((res, rej) => {
        if (!('indexedDB' in window)) return rej(new Error('Armazenamento indisponível neste navegador.'));
        const r = indexedDB.open('aprender-a-ver', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('desenhos', { keyPath: 'id' });
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    }
    return dbp;
  }
  async function operar(modo, fn) {
    const db = await abrirBanco();
    return new Promise((res, rej) => {
      const t = db.transaction('desenhos', modo);
      const req = fn(t.objectStore('desenhos'));
      t.oncomplete = () => res(req ? req.result : undefined);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    });
  }
  const desenhos = {
    salvar: (rec) => operar('readwrite', (s) => s.put(rec)),
    todos: () => operar('readonly', (s) => s.getAll()).then((l) => (l || []).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))),
    obter: (id) => operar('readonly', (s) => s.get(id)),
    apagar: (id) => operar('readwrite', (s) => s.delete(id))
  };

  // Datas
  const hoje = () => chaveDia(new Date());
  function chaveDia(d) {
    const z = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
  }
  function dataCurta(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  function duracao(seg) {
    seg = Math.round(seg || 0);
    const m = Math.floor(seg / 60), s = seg % 60;
    if (m >= 60) return `${Math.floor(m / 60)} h ${m % 60} min`;
    return m ? `${m} min${s ? ' ' + s + ' s' : ''}` : `${s} s`;
  }

  // Registro de prática por dia (minutos) para a sequência de estudo.
  function registrarPratica(segundos) {
    const dias = store.get('dias', {});
    const k = hoje();
    dias[k] = (dias[k] || 0) + Math.max(1, Math.round(segundos / 60));
    store.set('dias', dias);
  }
  function sequenciaDias() {
    const dias = store.get('dias', {});
    const d = new Date();
    if (!dias[chaveDia(d)]) d.setDate(d.getDate() - 1); // ainda vale se praticou ontem
    let n = 0;
    while (dias[chaveDia(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  // Imagens
  function carregarImagem(src) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error('Não foi possível abrir a imagem.'));
      img.src = src;
    });
  }
  const svgParaUrl = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  function canvasParaBlob(c, tipo = 'image/png', q) {
    return new Promise((res, rej) => {
      try { c.toBlob((b) => (b ? res(b) : rej(new Error('Falha ao gerar a imagem.'))), tipo, q); } catch (e) { rej(e); }
    });
  }
  function baixar(blobOuUrl, nome) {
    const url = typeof blobOuUrl === 'string' ? blobOuUrl : URL.createObjectURL(blobOuUrl);
    const a = h('a', { href: url, download: nome });
    document.body.append(a);
    a.click();
    a.remove();
    if (typeof blobOuUrl !== 'string') setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  // Aviso curto na base da tela
  let timerAviso;
  function aviso(msg) {
    let el = $('#aviso');
    if (!el) { el = h('div', { id: 'aviso', role: 'status' }); document.body.append(el); }
    el.textContent = msg;
    el.classList.add('visivel');
    clearTimeout(timerAviso);
    timerAviso = setTimeout(() => el.classList.remove('visivel'), 2600);
  }

  // Janela modal simples. Retorna { fechar, corpo }.
  function modal(titulo, conteudo, acoes = []) {
    const fundo = h('div', { class: 'modal-fundo' });
    const caixa = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo });
    const corpo = h('div', { class: 'modal-corpo' }, conteudo);
    const rodape = h('div', { class: 'modal-acoes' });
    const fechar = () => fundo.remove();
    for (const a of acoes) {
      rodape.append(h('button', { class: 'btn ' + (a.classe || ''), onclick: () => { if (a.acao && a.acao() === false) return; fechar(); } }, a.rotulo));
    }
    caixa.append(h('h2', {}, titulo), corpo, rodape);
    fundo.append(caixa);
    fundo.addEventListener('click', (e) => { if (e.target === fundo) fechar(); });
    document.body.append(fundo);
    return { fechar, corpo };
  }

  // Confirmação dentro da página (o navegador pode bloquear confirm()).
  function confirmar(msg, rotuloSim = 'Confirmar') {
    return new Promise((res) => {
      let resposta = false;
      const m = modal('Confirmar', h('p', {}, msg), [
        { rotulo: 'Cancelar' },
        { rotulo: rotuloSim, classe: 'primario', acao: () => { resposta = true; } }
      ]);
      const obs = new MutationObserver(() => { if (!document.body.contains(m.corpo)) { obs.disconnect(); res(resposta); } });
      obs.observe(document.body, { childList: true });
    });
  }

  // Ícones de linha simples (SVG inline)
  const ICONES = {
    olho: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    lapis: '<path d="M4 20l4-1 11-11-3-3L5 16l-1 4z"/><path d="M14 6l3 3"/>',
    cubo: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>',
    luz: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    perspectiva: '<path d="M2 20L12 8l10 12"/><path d="M2 8h20"/><path d="M7 20l5-12 5 12"/>',
    rosto: '<ellipse cx="12" cy="11" rx="7" ry="9"/><path d="M5 11h14M12 2v18M9 15.5c1.8 1 4.2 1 6 0"/>',
    foto: '<rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M8 6l2-3h4l2 3"/>',
    grafico: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    casa: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    pincel: '<path d="M18.5 3.5l2 2L11 15l-2.5-.5L8 12l10.5-8.5z"/><path d="M8 15c-2 0-3.5 1.5-3.5 3.5 0 1-.5 2-1.5 2.5 3 .5 6.5-.5 7-3.5l-2-2.5z"/>',
    relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
  };
  const icone = (nome, cls = 'ico') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome] || ''}</svg>`;

  return { $, $$, h, esc, store, desenhos, hoje, chaveDia, dataCurta, duracao, registrarPratica, sequenciaDias, carregarImagem, svgParaUrl, canvasParaBlob, baixar, aviso, modal, confirmar, icone };
})();
