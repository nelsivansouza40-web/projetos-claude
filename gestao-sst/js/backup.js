/*
 * Cópia de segurança.
 *  - Exportar/restaurar arquivo .json com todos os dados da empresa.
 *  - Backup automático em arquivo (Chrome/Edge no computador): o sistema regrava o
 *    arquivo escolhido a cada alteração, segundos depois de salvar.
 * Os dados ficam no navegador (IndexedDB); o arquivo protege contra limpeza do
 * navegador, troca de computador ou perda do equipamento.
 */
const Backup = {
  handle: null,
  permitido: false,
  _t: null,
  suporta() { return typeof window.showSaveFilePicker === 'function'; },

  async montar(emp) {
    const recs = await DB.recsDaEmpresa(emp.id);
    const cfg = (await DB.all('cfg')).filter((c) => c.key.startsWith(emp.id + ':'));
    return { sistema: 'Gestão SST', versao: 1, geradoEm: new Date().toISOString(), empresa: emp, cfg, registros: recs };
  },

  async exportar() {
    const dados = await this.montar(App.emp);
    download('backup-gestao-sst-' + slugArquivo(App.emp.nome) + '-' + D.today() + '.json', JSON.stringify(dados), 'application/json');
    await DB.put('sys', { key: 'ultimoBackup:' + App.emp.id, value: new Date().toISOString() });
    toast('Backup exportado');
  },

  async restaurar(file) {
    let dados;
    try { dados = JSON.parse(await lerArquivo(file)); } catch (e) { toast('Arquivo inválido.'); return; }
    if (!dados || dados.sistema !== 'Gestão SST' || !dados.empresa) { toast('Este arquivo não é um backup do Gestão SST.'); return; }
    const existe = await DB.get('empresas', dados.empresa.id);
    const msg = existe
      ? 'Restaurar o backup de "' + dados.empresa.nome + '" de ' + new Date(dados.geradoEm).toLocaleString('pt-BR') + '? Os dados atuais dessa empresa serão substituídos.'
      : 'Restaurar o backup de "' + dados.empresa.nome + '" como uma nova empresa neste computador?';
    if (!await confirmar(msg, 'Restaurar', !!existe)) return;
    if (existe) await DB.apagarEmpresa(dados.empresa.id);
    await DB.put('empresas', dados.empresa);
    await DB.putMany('cfg', dados.cfg || []);
    await DB.putMany('rec', (dados.registros || []).map((r) => Object.assign(r, { emp: dados.empresa.id })));
    await App.trocarEmpresa(dados.empresa.id);
    toast('Backup restaurado: ' + (dados.registros || []).length + ' registros');
  },

  /* ---------- backup automático em arquivo ---------- */
  async carregarVinculo() {
    this.handle = null; this.permitido = false;
    if (!this.suporta()) return;
    const s = await DB.get('sys', 'arquivo:' + App.emp.id);
    if (!s || !s.value) return;
    this.handle = s.value;
    try { this.permitido = (await this.handle.queryPermission({ mode: 'readwrite' })) === 'granted'; } catch (e) { this.permitido = false; }
  },

  async vincular() {
    try {
      const h = await window.showSaveFilePicker({
        suggestedName: 'gestao-sst-' + slugArquivo(App.emp.nome) + '.json',
        types: [{ description: 'Backup Gestão SST', accept: { 'application/json': ['.json'] } }]
      });
      this.handle = h; this.permitido = true;
      await DB.put('sys', { key: 'arquivo:' + App.emp.id, value: h });
      await this.gravar();
      toast('Backup automático ativado: ' + h.name);
      App.statusSalvo();
    } catch (e) { if (e.name !== 'AbortError') toast('Não foi possível ativar: ' + e.message, 5000); }
  },

  async reativar() {
    if (!this.handle) return this.vincular();
    try {
      this.permitido = (await this.handle.requestPermission({ mode: 'readwrite' })) === 'granted';
      if (this.permitido) { await this.gravar(); toast('Backup automático reativado'); }
    } catch (e) { toast('Permissão negada.'); }
    App.statusSalvo();
  },

  async desvincular() {
    await DB.del('sys', 'arquivo:' + App.emp.id);
    this.handle = null; this.permitido = false;
    App.statusSalvo();
  },

  agendar() {
    if (!this.handle || !this.permitido) return;
    clearTimeout(this._t);
    this._t = setTimeout(() => this.gravar(), 1500);
  },

  async gravar() {
    if (!this.handle || !this.permitido) return;
    try {
      const dados = await this.montar(App.emp);
      const w = await this.handle.createWritable();
      await w.write(JSON.stringify(dados));
      await w.close();
      this.ultimaGravacao = new Date();
      await DB.put('sys', { key: 'ultimoBackup:' + App.emp.id, value: this.ultimaGravacao.toISOString() });
      App.statusSalvo();
    } catch (e) {
      this.permitido = false;
      App.statusSalvo();
    }
  },

  async abrirPainel() {
    const ult = await DB.get('sys', 'ultimoBackup:' + App.emp.id);
    const persist = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : false;
    let est = '';
    try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); est = (e.usage / 1048576).toFixed(1) + ' MB usados'; } } catch (e) { /* sem suporte */ }
    const body = h('<div>' +
      '<p>Cada alteração é gravada <b>na hora</b> no banco de dados deste navegador, sem precisar de internet. ' +
      'Para proteger contra limpeza do navegador ou troca de computador, mantenha uma cópia em arquivo.</p>' +
      '<div class="notice' + (this.permitido ? '' : ' warn') + '"><b>Backup automático em arquivo:</b> ' +
      (!this.suporta() ? 'disponível apenas no Google Chrome ou Microsoft Edge para computador. Use o backup manual abaixo.'
        : this.handle ? (this.permitido ? 'ativo, gravando em "' + esc(this.handle.name) + '" a cada alteração.' : 'vinculado a "' + esc(this.handle.name) + '", mas aguardando sua autorização nesta sessão.')
          : 'desativado.') + '</div>' +
      '<p class="small muted">Último backup: ' + (ult ? new Date(ult.value).toLocaleString('pt-BR') : 'nunca') + ' · Armazenamento persistente: ' + (persist ? 'sim' : 'não') + (est ? ' · ' + est : '') + '</p>' +
      '<div class="toolbar"></div><hr style="border:0;border-top:1px solid var(--line);margin:14px 0">' +
      '<h3>Backup manual</h3><div class="toolbar t2"></div></div>');
    const t1 = $('.toolbar', body), t2 = $('.t2', body);
    if (this.suporta()) {
      if (!this.handle) t1.appendChild(button('Ativar backup automático', 'btn-primary', () => this.vincular().then(() => this.abrirPainel())));
      else {
        if (!this.permitido) t1.appendChild(button('Autorizar gravação', 'btn-primary', () => this.reativar().then(() => this.abrirPainel())));
        t1.appendChild(button('Trocar arquivo', '', () => this.vincular().then(() => this.abrirPainel())));
        t1.appendChild(button('Desativar', '', () => this.desvincular().then(() => this.abrirPainel())));
      }
    }
    t2.appendChild(button('Baixar backup (.json)', '', () => this.exportar()));
    t2.appendChild(button('Restaurar backup…', '', () => {
      const inp = h('<input type="file" accept=".json,application/json" hidden>');
      document.body.appendChild(inp);
      inp.addEventListener('change', () => { const f = inp.files[0]; inp.remove(); if (f) { Modal.close(); this.restaurar(f); } });
      inp.click();
    }));
    Modal.open({ title: 'Cópia de segurança', body, small: true, foot: [button('Fechar', '', () => Modal.close())] });
  }
};
