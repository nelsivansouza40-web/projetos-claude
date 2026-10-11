/*
 * Trabalho em equipe: sincronização com uma planilha Google (servidor em
 * servidor/Code.gs, publicado como app da Web do Apps Script).
 *
 * Como funciona:
 *  - Cada gravação local de uma empresa conectada entra numa fila de envio
 *    (guardada no banco, sobrevive a fechar o navegador).
 *  - A sincronização envia a fila e depois recebe o que os outros computadores
 *    alteraram desde a última vez (contador "cursor" devolvido pelo servidor).
 *  - Conflito: vale a alteração mais recente. Sem internet, o sistema continua
 *    funcionando e envia tudo quando a conexão voltar.
 *  - Roda ao abrir, alguns segundos depois de cada alteração e a cada 2 minutos.
 */
const Sync = {
  cfg: null,              // conexão da empresa em uso: { url, chave, cursor, ultimo, erro }
  pends: {},              // emp -> { chave: { s, k, del, t } }  fila de envio
  conectadas: new Set(),  // empresas com conexão neste computador
  rodando: false,
  _t: null,
  LOTE: 150,

  async init() {
    const sys = await DB.all('sys');
    sys.forEach((x) => {
      if (x.key.startsWith('sync:cfg:')) this.conectadas.add(x.key.slice(9));
      if (x.key.startsWith('sync:pend:')) this.pends[x.key.slice(10)] = x.value || {};
    });
    DB.aoMudar = (s, o, del) => this.registrar(s, o, del);
    window.addEventListener('online', () => this.agendar(1000));
    setInterval(() => this.agendar(0), 120000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.agendar(500); });
  },

  async carregar(emp) {
    const c = await DB.get('sys', 'sync:cfg:' + emp);
    this.cfg = c ? c.value : null;
    if (this.cfg) this.agendar(800);
  },

  async salvarCfg() {
    if (!App.emp || !this.cfg) return;
    await DB.putRaw('sys', { key: 'sync:cfg:' + App.emp.id, value: this.cfg });
  },

  fila(emp) { return this.pends[emp] || (this.pends[emp] = {}); },
  pendentes(emp) { return Object.keys(this.pends[emp || (App.emp && App.emp.id)] || {}).length; },
  _salvarFila(emp) {
    clearTimeout(this['_f' + emp]);
    this['_f' + emp] = setTimeout(() => DB.putRaw('sys', { key: 'sync:pend:' + emp, value: this.pends[emp] || {} }), 300);
  },

  /** Chamado pelo banco a cada gravação. */
  registrar(store, o, del) {
    let emp, k;
    if (store === 'rec') { k = del ? o : o.id; emp = del ? (App.emp && App.emp.id) : o.emp; }
    else if (store === 'cfg') { k = del ? o : o.key; emp = String(k).split(':')[0]; }
    else if (store === 'empresas') { if (del) return; k = o.id; emp = o.id; }
    else return;
    if (!emp || !this.conectadas.has(emp)) return;
    this.fila(emp)[store + '|' + k] = { s: store, k, del: !!del, t: new Date().toISOString() };
    this._salvarFila(emp);
    if (App.emp && emp === App.emp.id) { this.agendar(4000); App.statusSalvo(); }
  },

  agendar(ms) {
    if (!this.cfg || !App.emp) return;
    clearTimeout(this._t);
    this._t = setTimeout(() => this.executar(false), ms);
  },

  esquema() {
    return MODULOS.map((m) => ({ id: m.id, nome: m.nome, campos: m.campos.map((c) => [c.k, c.l, c.t]) }));
  },

  async post(corpo, cfg) {
    const c = cfg || this.cfg;
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const t = ctl ? setTimeout(() => ctl.abort(), 90000) : null;
    let resp;
    try {
      resp = await fetch(c.url, {
        method: 'POST', redirect: 'follow', signal: ctl ? ctl.signal : undefined,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(Object.assign({ chave: c.chave }, corpo))
      });
    } catch (e) {
      throw new Error(e.name === 'AbortError' ? 'O servidor demorou demais para responder.' : 'Sem conexão com o servidor (verifique a internet e o endereço).');
    } finally { if (t) clearTimeout(t); }
    let j;
    try { j = await resp.json(); } catch (e) { throw new Error('Resposta inesperada do servidor. Confira se o endereço termina em /exec e se a implantação está como "Qualquer pessoa".'); }
    if (!j || !j.ok) throw new Error((j && j.erro) || 'Erro no servidor.');
    return j;
  },

  async montarItem(emp, p) {
    if (p.s === 'rec') {
      const r = p.del ? null : await DB.get('rec', p.k);
      if (!r) return { id: p.k, excluido: true, atualizadoEm: p.t };
      return { id: r.id, mod: r.mod, atualizadoEm: r.atualizadoEm || p.t, dados: r };
    }
    if (p.s === 'cfg') {
      const c = p.del ? null : await DB.get('cfg', p.k);
      return c ? { id: p.k, mod: '_cfg', atualizadoEm: p.t, dados: c.value } : { id: p.k, mod: '_cfg', excluido: true, atualizadoEm: p.t };
    }
    const e = await DB.get('empresas', emp);
    if (!e) return null;
    const d = Object.assign({}, e);
    if (d.logo && d.logo.length > 40000) { delete d.logo; d._logoGrande = true; }
    return { id: emp, mod: '_empresa', atualizadoEm: p.t, dados: d };
  },

  /** Envia a fila e recebe as alterações dos outros computadores. */
  async executar(manual) {
    if (!App.emp || !this.cfg) return;
    if (this.rodando) { if (manual) toast('A sincronização já está em andamento.'); return; }
    if (!manual && navigator.onLine === false) return;
    const emp = App.emp.id;
    const cfg = this.cfg;
    this.rodando = true;
    App.statusSalvo();
    let recebidos = 0, enviados = 0;
    try {
      // 1. enviar
      const fila = this.fila(emp);
      const chaves = Object.keys(fila);
      for (let i = 0; i < chaves.length; i += this.LOTE) {
        const parte = chaves.slice(i, i + this.LOTE).map((k) => ({ k, p: Object.assign({}, fila[k]) }));
        const itens = [];
        for (const x of parte) { const it = await this.montarItem(emp, x.p); if (it) itens.push(it); }
        const r = await this.post({ acao: 'enviar', emp, itens, esquema: i === 0 ? this.esquema() : undefined }, cfg);
        enviados += r.gravados || 0;
        // tira da fila só o que não mudou de novo durante o envio
        parte.forEach((x) => { if (fila[x.k] && fila[x.k].t === x.p.t) delete fila[x.k]; });
        this._salvarFila(emp);
        if (r.erros && r.erros.length) cfg.avisos = r.erros.slice(0, 5).map((e) => e.erro).join(' ');
      }
      // 2. receber
      let mais = true, mudou = { rec: false, cfg: false, emp: false };
      while (mais) {
        const r = await this.post({ acao: 'receber', emp, desde: cfg.cursor || 0, limite: 400 }, cfg);
        for (const it of r.itens) { if (await this.aplicar(emp, it, mudou)) recebidos++; }
        cfg.cursor = r.cursor;
        mais = r.mais && r.itens.length > 0;
        await DB.putRaw('sys', { key: 'sync:cfg:' + emp, value: cfg });
      }
      cfg.ultimo = new Date().toISOString();
      cfg.erro = '';
      await DB.putRaw('sys', { key: 'sync:cfg:' + emp, value: cfg });
      if (App.emp && App.emp.id === emp && (mudou.rec || mudou.cfg || mudou.emp)) {
        if (mudou.cfg) await Config.carregar(emp);
        if (mudou.emp) { App.empresas = await DB.all('empresas'); App.emp = App.empresas.find((e) => e.id === emp) || App.emp; App.marca(); }
        await App.recarregarDados();
        App.atualizarTela();
      }
      if (manual) toast('Sincronizado: ' + enviados + ' enviado(s), ' + recebidos + ' recebido(s)');
    } catch (e) {
      cfg.erro = e.message;
      await DB.putRaw('sys', { key: 'sync:cfg:' + emp, value: cfg });
      if (manual) toast('Não foi possível sincronizar: ' + e.message, 6000);
    } finally {
      this.rodando = false;
      App.statusSalvo();
      if (App.rota === 'config' && $('#sync-card')) this.desenharCard();
      // se algo foi alterado durante o envio, envia de novo
      if (this.pendentes(emp) && !cfg.erro) this.agendar(3000);
    }
  },

  /** Aplica um registro vindo da planilha. Retorna true se mudou algo aqui. */
  async aplicar(emp, it, mudou) {
    const fila = this.fila(emp);
    if (it.mod === '_empresa') {
      if (fila['empresas|' + it.id] || !it.dados) return false;
      const local = await DB.get('empresas', it.id);
      const d = Object.assign({}, it.dados);
      if (d._logoGrande && local && local.logo) d.logo = local.logo;
      delete d._logoGrande;
      if (local && JSON.stringify(local) === JSON.stringify(d)) return false;
      await DB.putRaw('empresas', d);
      mudou.emp = true;
      return true;
    }
    if (it.mod === '_cfg') {
      if (fila['cfg|' + it.id]) return false;
      const local = await DB.get('cfg', it.id);
      if (!it.excluido && local && JSON.stringify(local.value) === JSON.stringify(it.dados)) return false;
      if (it.excluido && !local) return false;
      if (it.excluido) await DB.delRaw('cfg', it.id); else await DB.putRaw('cfg', { key: it.id, value: it.dados });
      mudou.cfg = true;
      return true;
    }
    if (fila['rec|' + it.id]) return false;
    const local = await DB.get('rec', it.id);
    if (it.excluido) {
      if (!local) return false;
      await DB.delRaw('rec', it.id);
      mudou.rec = true;
      return true;
    }
    if (!it.dados) return false;
    if (local && local.atualizadoEm && it.atualizadoEm && local.atualizadoEm >= it.atualizadoEm) return false;
    await DB.putRaw('rec', Object.assign({}, it.dados, { emp }));
    mudou.rec = true;
    return true;
  },

  /* ---------------- Conectar e desconectar ---------------- */

  validarUrl(url) {
    const u = String(url || '').trim();
    if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(u)) throw new Error('O endereço deve começar com https://script.google.com/ e terminar em /exec.');
    return u;
  },

  async lembrarUltima() {
    const u = await DB.get('sys', 'sync:ultimaConexao');
    return (u && u.value) || { url: '', chave: '' };
  },

  /** Conecta a empresa em uso e envia todos os registros dela. */
  async conectar(url, chave) {
    const cfg = { url: this.validarUrl(url), chave: String(chave || '').trim(), cursor: 0, ultimo: '', erro: '' };
    if (!cfg.chave) throw new Error('Informe a chave de acesso.');
    await this.post({ acao: 'ping' }, cfg);
    const emp = App.emp.id;
    await DB.putRaw('sys', { key: 'sync:ultimaConexao', value: { url: cfg.url, chave: cfg.chave } });
    await DB.putRaw('sys', { key: 'sync:cfg:' + emp, value: cfg });
    this.cfg = cfg;
    this.conectadas.add(emp);
    // coloca tudo na fila de envio
    const t = new Date().toISOString();
    const fila = this.fila(emp);
    (await DB.recsDaEmpresa(emp)).forEach((r) => { fila['rec|' + r.id] = { s: 'rec', k: r.id, del: false, t }; });
    (await DB.all('cfg')).filter((c) => c.key.startsWith(emp + ':')).forEach((c) => { fila['cfg|' + c.key] = { s: 'cfg', k: c.key, del: false, t }; });
    fila['empresas|' + emp] = { s: 'empresas', k: emp, del: false, t };
    await DB.putRaw('sys', { key: 'sync:pend:' + emp, value: fila });
    await this.executar(true);
  },

  async desconectar() {
    const emp = App.emp.id;
    await DB.delRaw('sys', 'sync:cfg:' + emp);
    await DB.delRaw('sys', 'sync:pend:' + emp);
    delete this.pends[emp];
    this.conectadas.delete(emp);
    this.cfg = null;
    clearTimeout(this._t);
    App.statusSalvo();
  },

  /** Ao excluir a empresa deste computador: esquece a conexão (não apaga nada na planilha). */
  async esquecer(emp) {
    await DB.delRaw('sys', 'sync:cfg:' + emp);
    await DB.delRaw('sys', 'sync:pend:' + emp);
    delete this.pends[emp];
    this.conectadas.delete(emp);
    if (App.emp && App.emp.id === emp) this.cfg = null;
  },

  /** Outro computador: baixa uma empresa que já está na planilha da equipe. */
  async entrarEmEmpresa() {
    const ult = await this.lembrarUltima();
    const semEmpresa = !App.emp;
    const body = h('<div><p>Use esta opção nos demais computadores da equipe. O sistema baixa da planilha Google todos os registros da empresa e passa a sincronizar sozinho.</p>' +
      '<p class="small muted">Não importe a planilha Excel de novo nesses computadores: isso criaria registros duplicados.</p>' +
      '<div class="form-grid"><label class="field w4">Endereço do servidor (termina em /exec)<input name="url" type="url" value="' + esc(ult.url) + '" placeholder="https://script.google.com/macros/s/.../exec"></label>' +
      '<label class="field w4">Chave de acesso<input name="chave" type="password" value="' + esc(ult.chave) + '" autocomplete="off"></label></div>' +
      '<div class="lista-emp"></div><p class="small" data-msg></p></div>');
    const msg = $('[data-msg]', body), alvo = $('.lista-emp', body);
    const voltar = () => { if (semEmpresa && !App.emp) setTimeout(() => App.primeiraEmpresa(), 0); };
    const buscar = async () => {
      msg.textContent = 'Consultando a planilha…'; alvo.innerHTML = '';
      try {
        const cfg = { url: this.validarUrl($('[name=url]', body).value), chave: $('[name=chave]', body).value.trim() };
        const r = await this.post({ acao: 'empresas' }, cfg);
        await DB.putRaw('sys', { key: 'sync:ultimaConexao', value: cfg });
        if (!r.empresas.length) { msg.textContent = 'A planilha ainda não tem nenhuma empresa. No computador principal, conecte a empresa em Configurações → Trabalho em equipe.'; return; }
        msg.textContent = 'Escolha a empresa:';
        alvo.innerHTML = '<ul class="company-list">' + r.empresas.map((e, i) =>
          '<li><span><b>' + esc(e.nome) + '</b>' + (e.cnpj ? ' <span class="muted small">' + esc(e.cnpj) + '</span>' : '') + ' <span class="muted small">· ' + fmtInt(e.registros) + ' registros</span></span>' +
          '<button type="button" class="btn btn-sm btn-primary" data-i="' + i + '">Baixar e usar</button></li>').join('') + '</ul>';
        $$('[data-i]', alvo).forEach((b) => b.addEventListener('click', () => this.baixarEmpresa(r.empresas[+b.dataset.i], cfg)));
      } catch (e) { msg.textContent = e.message; }
    };
    Modal.open({
      title: 'Entrar em empresa da equipe', body,
      foot: [button('Cancelar', '', () => Modal.close()), button('Buscar empresas', 'btn-primary', buscar)],
      onClose: voltar
    });
  },

  async baixarEmpresa(e, cfgBase) {
    const existe = await DB.get('empresas', e.id);
    const d = Object.assign({}, e.dados, { id: e.id });
    delete d._logoGrande;
    if (!existe) await DB.putRaw('empresas', d);
    const cfg = { url: cfgBase.url, chave: cfgBase.chave, cursor: 0, ultimo: '', erro: '' };
    await DB.putRaw('sys', { key: 'sync:cfg:' + e.id, value: cfg });
    this.conectadas.add(e.id);
    Modal._onClose = null;
    Modal.close();
    await App.trocarEmpresa(e.id);
    toast('Baixando os registros de ' + e.nome + '…', 4000);
    await this.executar(true);
  },

  /* ---------------- Tela ---------------- */

  textoStatus() {
    if (!this.cfg) return '';
    if (this.rodando) return ' · sincronizando…';
    if (this.cfg.erro) return ' · erro na sincronização (clique)';
    const n = this.pendentes();
    if (n) return ' · ' + n + ' alteração(ões) a enviar';
    if (this.cfg.ultimo) return ' · equipe sincronizada às ' + new Date(this.cfg.ultimo).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return ' · equipe conectada';
  },

  card() {
    const el = h('<div class="card" id="sync-card"></div>');
    setTimeout(() => this.desenharCard(), 0);
    return el;
  },

  async desenharCard() {
    const el = $('#sync-card');
    if (!el) return;
    if (!this.cfg) {
      const ult = await this.lembrarUltima();
      el.innerHTML = '<h2>Trabalho em equipe</h2>' +
        '<p>Conecte esta empresa a uma planilha Google para que vários computadores usem o mesmo cadastro. Cada computador continua funcionando sem internet e envia as alterações quando a conexão volta.</p>' +
        '<p class="small muted">Antes, crie o servidor na planilha Google seguindo o guia <b>servidor/LEIA-ME.md</b> (cerca de 10 minutos). Nos outros computadores, use <b>Empresa → Entrar em empresa da equipe</b>.</p>' +
        '<div class="form-grid"><label class="field w4">Endereço do servidor (termina em /exec)<input id="sync-url" type="url" value="' + esc(ult.url) + '" placeholder="https://script.google.com/macros/s/.../exec"></label>' +
        '<label class="field w2">Chave de acesso<input id="sync-chave" type="password" value="' + esc(ult.chave) + '" autocomplete="off"></label></div>' +
        '<div class="toolbar" style="margin-top:8px"></div><p class="small" id="sync-msg"></p>';
      const msg = $('#sync-msg', el);
      $('.toolbar', el).append(
        button('Testar conexão', '', async () => {
          msg.textContent = 'Testando…';
          try {
            const r = await this.post({ acao: 'ping' }, { url: this.validarUrl($('#sync-url', el).value), chave: $('#sync-chave', el).value.trim() });
            msg.textContent = 'Conexão bem-sucedida com a planilha "' + r.planilha + '" (servidor versão ' + r.versao + ').';
          } catch (e) { msg.textContent = e.message; }
        }),
        button('Conectar esta empresa e enviar tudo', 'btn-primary', async () => {
          msg.textContent = 'Conectando e enviando os registros…';
          try { await this.conectar($('#sync-url', el).value, $('#sync-chave', el).value); this.desenharCard(); } catch (e) { msg.textContent = e.message; }
        }));
      return;
    }
    const c = this.cfg;
    const n = this.pendentes();
    el.innerHTML = '<h2>Trabalho em equipe</h2>' +
      '<div class="notice' + (c.erro ? ' warn' : '') + '"><b>' + (c.erro ? 'Última tentativa falhou: ' + esc(c.erro) : 'Conectada à planilha da equipe.') + '</b></div>' +
      '<p class="small">Servidor: ' + esc(c.url.replace(/^https:\/\/script\.google\.com\/macros\/s\//, '…/').slice(0, 60)) + '<br>' +
      'Última sincronização: ' + (c.ultimo ? new Date(c.ultimo).toLocaleString('pt-BR') : 'ainda não concluída') + '<br>' +
      'Alterações aguardando envio: ' + n + (c.avisos ? '<br>Aviso do servidor: ' + esc(c.avisos) : '') + '</p>' +
      '<p class="small muted">A sincronização é automática: ao abrir o sistema, segundos depois de cada alteração e a cada 2 minutos. Se duas pessoas alterarem o mesmo registro, vale a alteração mais recente.</p>' +
      '<div class="toolbar"></div>';
    $('.toolbar', el).append(
      button(this.rodando ? 'Sincronizando…' : 'Sincronizar agora', 'btn-primary', () => this.executar(true)),
      button('Reenviar tudo', '', async () => {
        if (!await confirmar('Reenviar todos os registros desta empresa para a planilha? Use se a planilha foi recriada ou perdeu dados.', 'Reenviar')) return;
        try { await this.conectar(c.url, c.chave); } catch (e) { toast(e.message, 5000); }
        App.paginaConfig();
      }),
      button('Desconectar', 'btn-danger', async () => {
        if (!await confirmar('Desconectar esta empresa da planilha da equipe? Os dados continuam neste computador e na planilha, mas deixam de ser sincronizados.' + (n ? ' Há ' + n + ' alteração(ões) ainda não enviadas.' : ''), 'Desconectar', true)) return;
        await this.desconectar();
        App.paginaConfig();
      }));
  }
};
