/*
 * Aplicação: empresas, navegação, gravação em tempo real e configurações.
 */
const NAV = [
  ['Início', [['painel', 'Painéis'], ['pendencias', 'Pendências e vencimentos']]],
  ['Pessoas', [['m:colaboradores', 'Colaboradores'], ['prontuario', 'Pesquisa do colaborador'], ['m:treinamentos', 'Treinamentos'], ['m:aso', 'ASO'], ['m:dds', 'DDS'], ['m:advertencias', 'Advertências']]],
  ['EPI', [['m:epis', 'Cadastro de EPI'], ['m:movepi', 'Movimentação de EPI'], ['fichaepi', 'Ficha de EPI']]],
  ['Ocorrências', [['m:acidentes', 'Acidentes'], ['m:desvios', 'Desvios e incidentes'], ['m:auditorias', 'Auditorias']]],
  ['Gestão', [['m:planos', 'Plano de ação 5W2H'], ['m:riscos', 'Riscos ambientais'], ['m:documentos', 'Documentos'], ['m:oss', 'Ordem de Serviço (OSS)'], ['m:atividades', 'Atividades por função'], ['m:quimicos', 'Produtos químicos']]],
  ['Emergência', [['m:extintores', 'Extintores'], ['m:hidrantes', 'Hidrantes']]],
  ['Equipamentos', [['m:equipamentos', 'Máquinas e equipamentos'], ['m:manutencoes', 'Manutenções'], ['m:frota', 'Frota de veículos']]],
  ['CIPA', [['m:cipa', 'Mandato e estabilidade'], ['calcipa', 'Calendário eleitoral']]],
  ['Sistema', [['config', 'Configurações'], ['sobre', 'Como usar']]]
];

const App = {
  emp: null,
  empresas: [],
  data: {},
  versao: 0,
  rota: 'painel',
  salvoEm: null,

  async init() {
    this.aplicarTema();
    try { await DB.open(); } catch (e) {
      $('#main').innerHTML = '<div class="card"><h2>Não foi possível abrir o banco de dados local</h2><p>' + esc(e.message) + '</p><p>Verifique se o navegador não está em modo anônimo/privado e se o armazenamento de sites está permitido.</p></div>';
      return;
    }
    pedirArmazenamentoPersistente();
    await Sync.init();
    this.empresas = await DB.all('empresas');
    $('#btn-empresa').addEventListener('click', () => this.abrirEmpresa());
    $('#btn-backup').addEventListener('click', () => Backup.abrirPainel());
    $('#btn-menu').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
    $('#modal-close').addEventListener('click', () => Modal.close());
    $('#modal').addEventListener('mousedown', (e) => { if (e.target.id === 'modal') Modal.close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden) Modal.close(); });
    $('#save-status').addEventListener('click', () => {
      if (Backup.handle && !Backup.permitido) Backup.reativar();
      else if (Sync.cfg) this.ir('config');
    });
    window.addEventListener('hashchange', () => this.navegar());
    window.addEventListener('beforeunload', () => { if (Backup._t) { clearTimeout(Backup._t); Backup.gravar(); } });
    if (!this.empresas.length) { this.primeiraEmpresa(); return; }
    let atual = null;
    try { atual = localStorage.getItem('gsst_emp'); } catch (e) { /* sem localStorage */ }
    await this.trocarEmpresa(this.empresas.some((e) => e.id === atual) ? atual : this.empresas[0].id);
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
  },

  aplicarTema() {
    let t = 'auto';
    try { t = localStorage.getItem('gsst_tema') || 'auto'; } catch (e) { /* padrão */ }
    if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
  },

  async trocarEmpresa(id) {
    this.empresas = await DB.all('empresas');
    this.emp = this.empresas.find((e) => e.id === id) || this.empresas[0];
    try { localStorage.setItem('gsst_emp', this.emp.id); } catch (e) { /* ignora */ }
    await Config.carregar(this.emp.id);
    await this.recarregarDados();
    await this.migrarClasseDoenca();
    await Backup.carregarVinculo();
    await Sync.carregar(this.emp.id);
    Object.keys(Lista.estado).forEach((k) => delete Lista.estado[k]);
    this.marca();
    this.statusSalvo();
    this.navegar();
  },

  async recarregarDados() {
    const recs = await DB.recsDaEmpresa(this.emp.id);
    const d = {};
    MODULOS.forEach((m) => { d[m.id] = []; });
    recs.forEach((r) => { (d[r.mod] || (d[r.mod] = [])).push(r); });
    this.data = d;
    this.versao++;
  },

  /**
   * Uma única vez por empresa: "Doença profissional" e "Doença do trabalho" deixam de ser
   * tipos de acidente e passam a ser a classificação da doença ocupacional.
   */
  async migrarClasseDoenca() {
    if (Config.params.migClasseDoenca) return;
    const classes = ['Doença profissional', 'Doença do trabalho'];
    const daLista = (v) => classes.find((c) => norm(c) === norm(v));
    Config.listas.tiposAcidente = Config.lista('tiposAcidente').filter((v) => !daLista(v));
    for (const r of (this.data.acidentes || []).filter((a) => daLista(a.tipo))) {
      await this.salvar('acidentes', Object.assign({}, r, { tipo: 'Doença ocupacional', classeDoenca: r.classeDoenca || daLista(r.tipo) }));
    }
    Config.params.migClasseDoenca = true;
    await Config.salvar();
  },

  marca() {
    $('#brand-nome').textContent = this.emp.nome || 'Gestão SST';
    const img = $('#brand-logo');
    if (this.emp.logo) { img.src = this.emp.logo; img.hidden = false; } else img.hidden = true;
    document.title = (this.emp.nome ? this.emp.nome + ' · ' : '') + 'Gestão SST';
  },

  limpo(r) {
    const o = {};
    Object.keys(r).forEach((k) => { if (!k.startsWith('__') && !k.startsWith('_')) o[k] = r[k]; });
    return o;
  },

  async salvar(mod, r) {
    const agora = new Date().toISOString();
    const rec = this.limpo(r);
    rec.id = rec.id || uid();
    rec.emp = this.emp.id; rec.mod = mod;
    rec.criadoEm = rec.criadoEm || agora; rec.atualizadoEm = agora;
    await DB.put('rec', rec);
    const lista = this.data[mod] || (this.data[mod] = []);
    const i = lista.findIndex((x) => x.id === rec.id);
    if (i >= 0) lista[i] = rec; else lista.push(rec);
    this.versao++;
    this.marcarSalvo();
    this.atualizarTela();
    return rec;
  },

  async excluir(mod, id) {
    await DB.del('rec', id);
    this.data[mod] = (this.data[mod] || []).filter((x) => x.id !== id);
    this.versao++;
    this.marcarSalvo();
    this.atualizarTela();
  },

  marcarSalvo() {
    this.salvoEm = new Date();
    this.statusSalvo();
    Backup.agendar();
  },

  statusSalvo() {
    const el = $('#save-status');
    const hora = this.salvoEm ? 'Salvo às ' + this.salvoEm.toLocaleTimeString('pt-BR') : 'Dados salvos neste computador';
    let bk = '';
    if (Backup.handle) bk = Backup.permitido ? ' · backup automático ativo' : ' · clique para reativar o backup';
    el.textContent = hora + bk + Sync.textoStatus();
    el.style.cursor = (Backup.handle && !Backup.permitido) || Sync.cfg ? 'pointer' : '';
    el.classList.toggle('sync-erro', !!(Sync.cfg && Sync.cfg.erro));
  },

  atualizarTela() {
    this.montarMenu();
    const r = this.rota;
    if (r.startsWith('m:')) {
      const mod = r.slice(2);
      if ($('#lista-tabela')) Lista.tabela(mod); else Lista.render(mod);
      const p = $('#main .page-head p');
      if (p) p.textContent = fmtInt((this.data[mod] || []).length) + ' registro(s)';
    } else if (r === 'painel') Paineis.render();
    else if (r === 'pendencias') Pendencias.render();
    else if (r === 'fichaepi') Reports.paginaFicha();
  },

  ir(rota) { if (location.hash === '#/' + rota) this.navegar(); else location.hash = '#/' + rota; },

  navegar() {
    if (!this.emp) return;
    const r = decodeURIComponent((location.hash || '').replace(/^#\/?/, '')) || 'painel';
    this.rota = r;
    $('#sidebar').classList.remove('open');
    this.montarMenu();
    window.scrollTo(0, 0);
    if (r.startsWith('m:') && MOD[r.slice(2)]) return Lista.render(r.slice(2));
    const pag = {
      painel: () => Paineis.render(), pendencias: () => Pendencias.render(), fichaepi: () => Reports.paginaFicha(),
      prontuario: () => Reports.paginaProntuario(), calcipa: () => Reports.paginaCalendarioCIPA(),
      config: () => this.paginaConfig(), sobre: () => this.paginaSobre()
    }[r];
    if (pag) pag(); else { this.rota = 'painel'; Paineis.render(); }
  },

  montarMenu() {
    const nav = $('#sidebar');
    const venc = Calc.pendencias().filter((p) => ['VENCIDO', 'ATRASADO', 'SEM ESTOQUE', 'NÃO CONFORME'].includes(p.s.s)).length;
    nav.innerHTML = NAV.map(([g, itens]) => '<div class="nav-group">' + g + '</div>' + itens.map(([k, l]) => {
      let extra = '';
      if (k.startsWith('m:')) { const n = (this.data[k.slice(2)] || []).length; if (n) extra = '<span class="nav-count">' + fmtInt(n) + '</span>'; }
      if (k === 'pendencias' && venc) extra = '<span class="nav-alert" title="Itens vencidos">' + venc + '</span>';
      return '<button type="button" class="nav-item' + (this.rota === k ? ' active' : '') + '" data-r="' + k + '"' + (this.rota === k ? ' aria-current="page"' : '') + '><span>' + esc(l) + '</span>' + extra + '</button>';
    }).join('')).join('');
    $$('button[data-r]', nav).forEach((b) => b.addEventListener('click', () => this.ir(b.dataset.r)));
  },

  /* ---------------- Empresa ---------------- */
  camposEmpresa: [
    ['nome', 'Nome da empresa *', 'w2'], ['razao', 'Razão social', 'w2'], ['cnpj', 'CNPJ', ''], ['cnae', 'CNAE', ''],
    ['atividade', 'Atividade econômica', 'w2'], ['grauRisco', 'Grau de risco (NR-04)', ''], ['fundacao', 'Data da fundação', '', 'date'],
    ['endereco', 'Endereço', 'w2'], ['cidade', 'Cidade', ''], ['uf', 'UF', ''], ['cep', 'CEP', ''], ['telefone', 'Telefone', ''], ['email', 'E-mail', 'w2'],
    ['responsavel', 'Responsável pela segurança', 'w2'], ['registro', 'Registro profissional (MTE/CREA)', '']
  ],

  formEmpresa(e) {
    return h('<form class="form-grid">' + this.camposEmpresa.map(([k, l, w, t]) =>
      '<label class="field ' + w + '">' + l + '<input name="' + k + '" type="' + (t || 'text') + '" value="' + esc(e[k] || '') + '"' + (k === 'nome' ? ' required' : '') + '></label>').join('') +
      '<div class="field w4"><span>Logotipo (aparece no topo e nos documentos impressos)</span><div class="toolbar"><img class="logo-prev"' + (e.logo ? ' src="' + e.logo + '"' : ' hidden') + ' alt="Logotipo">' +
      '<input type="file" accept="image/*" style="max-width:280px"><button type="button" class="btn btn-sm" data-rm>Remover logotipo</button></div></div></form>');
  },

  async lerLogo(file) {
    const url = await lerArquivo(file, 'dataurl');
    // reduz para no máximo 400 px de largura, para não pesar no banco
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const esc_ = Math.min(1, 400 / img.width);
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * esc_); c.height = Math.round(img.height * esc_);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/png'));
      };
      img.onerror = () => resolve(url);
      img.src = url;
    });
  },

  ligarLogo(form, alvo) {
    const prev = $('.logo-prev', form);
    $('input[type=file]', form).addEventListener('change', async (ev) => {
      const f = ev.target.files[0]; if (!f) return;
      alvo.logo = await this.lerLogo(f);
      prev.src = alvo.logo; prev.hidden = false;
    });
    $('[data-rm]', form).addEventListener('click', () => { alvo.logo = ''; prev.hidden = true; });
  },

  lerFormEmpresa(form, base) {
    const e = Object.assign({}, base);
    this.camposEmpresa.forEach(([k]) => { e[k] = form.elements[k].value.trim(); });
    return e;
  },

  primeiraEmpresa() {
    $('#main').innerHTML = '<div class="card"><h1>Bem-vindo ao Gestão SST</h1><p>Para começar, informe os dados da empresa. Eles aparecem no topo do sistema e nos documentos impressos (Ficha de EPI, OSS, 5W2H, calendário da CIPA).</p><p>Quer conhecer o sistema antes? Use <b>Ver empresa de demonstração</b>: ela vem com dados fictícios em todos os módulos. Se a sua equipe já usa o sistema com uma planilha Google, use <b>Entrar em empresa da equipe</b>.</p></div>';
    this.novaEmpresa(true);
  },

  novaEmpresa(primeira = false) {
    const base = { id: uid(), criadaEm: new Date().toISOString() };
    const form = this.formEmpresa(base);
    this.ligarLogo(form, base);
    const salvar = async () => {
      const e = this.lerFormEmpresa(form, base);
      if (!e.nome) { toast('Informe o nome da empresa.'); return; }
      await DB.put('empresas', e);
      Modal._onClose = null;
      Modal.close();
      await this.trocarEmpresa(e.id);
      toast('Empresa cadastrada: ' + e.nome);
      if (primeira) this.ir('sobre');
    };
    Modal.open({
      title: primeira ? 'Cadastrar a empresa' : 'Nova empresa', body: form,
      foot: (primeira ? [button('Ver empresa de demonstração', '', () => Demo.carregar()), button('Entrar em empresa da equipe', '', () => Sync.entrarEmEmpresa())] : [button('Cancelar', '', () => Modal.close())]).concat([button('Salvar empresa', 'btn-primary', salvar)]),
      onClose: () => { if (primeira && !this.emp) setTimeout(() => this.novaEmpresa(true), 0); }
    });
  },

  abrirEmpresa() {
    const base = Object.assign({}, this.emp);
    const form = this.formEmpresa(base);
    this.ligarLogo(form, base);
    const lista = h('<div><h3>Empresas neste computador</h3><ul class="company-list">' + this.empresas.map((e) =>
      '<li class="' + (e.id === this.emp.id ? 'current' : '') + '"><span><b>' + esc(e.nome) + '</b>' + (e.cnpj ? ' <span class="muted small">' + esc(e.cnpj) + '</span>' : '') + '</span>' +
      (e.id === this.emp.id ? '<span class="badge b-good">Em uso</span>' : '<button type="button" class="btn btn-sm" data-usar="' + e.id + '">Usar esta</button>') + '</li>').join('') + '</ul></div>');
    $$('[data-usar]', lista).forEach((b) => b.addEventListener('click', async () => { Modal.close(); await this.trocarEmpresa(b.dataset.usar); toast('Empresa em uso: ' + this.emp.nome); }));
    const novaBtn = button('+ Cadastrar outra empresa', 'btn-sm', () => { Modal.close(); this.novaEmpresa(false); });
    lista.appendChild(novaBtn);
    lista.appendChild(button('Entrar em empresa da equipe', 'btn-sm', () => { Modal.close(); Sync.entrarEmEmpresa(); }));
    lista.appendChild(button('Empresa de demonstração', 'btn-sm', () => Demo.carregar()));
    const body = h('<div></div>');
    body.append(h('<h3>Dados da empresa em uso</h3>'), form, h('<hr style="border:0;border-top:1px solid var(--line);margin:16px 0">'), lista);
    Modal.open({
      title: 'Empresa', body,
      foot: [
        button('Excluir esta empresa', 'btn-danger', async () => {
          const nome = this.emp.nome;
          if (!await confirmar('Excluir a empresa "' + nome + '" e TODOS os seus registros deste computador? Faça um backup antes. Esta ação não pode ser desfeita.', 'Excluir tudo', true)) return;
          await Sync.esquecer(this.emp.id);
          await DB.apagarEmpresa(this.emp.id);
          this.empresas = await DB.all('empresas');
          this.emp = null;
          if (this.empresas.length) await this.trocarEmpresa(this.empresas[0].id); else this.primeiraEmpresa();
          toast('Empresa excluída: ' + nome);
        }),
        button('Cancelar', '', () => Modal.close()),
        button('Salvar', 'btn-primary', async () => {
          const e = this.lerFormEmpresa(form, base);
          if (!e.nome) { toast('Informe o nome da empresa.'); return; }
          await DB.put('empresas', e);
          this.emp = e;
          this.empresas = await DB.all('empresas');
          this.marca();
          this.marcarSalvo();
          Modal.close();
          toast('Dados da empresa salvos');
        })
      ]
    });
  },

  /* ---------------- Configurações ---------------- */
  paginaConfig() {
    const p = Config.params;
    const main = $('#main');
    main.innerHTML = '';
    main.appendChild(h('<div class="page-head"><div><h1>Configurações</h1><p>Parâmetros e listas de ' + esc(this.emp.nome) + '. Tudo é salvo automaticamente ao sair de cada campo.</p></div></div>'));
    let tema = 'auto';
    try { tema = localStorage.getItem('gsst_tema') || 'auto'; } catch (e) { /* padrão */ }

    const num = (k, l, hint) => '<label class="field">' + l + '<input type="number" min="0" data-p="' + k + '" value="' + esc(p[k]) + '">' + (hint ? '<span class="hint">' + hint + '</span>' : '') + '</label>';
    const geral = h('<div class="card"><h2>Dados e importação</h2><div class="toolbar"></div>' +
      '<p class="small muted" style="margin-top:8px">A importação lê a planilha Gestão SST (.xlsx) e traz colaboradores, EPIs, movimentações, acidentes, treinamentos, ASO e demais abas preenchidas.</p></div>');
    $('.toolbar', geral).append(
      button('Importar planilha Excel (.xlsx)', 'btn-primary', () => Importador.iniciar()),
      button('Dados da empresa', '', () => this.abrirEmpresa()),
      button('Backup', '', () => Backup.abrirPainel()));
    main.appendChild(geral);
    main.appendChild(Sync.card());

    const par = h('<div class="card"><h2>Parâmetros</h2><div class="cfg-grid">' +
      num('metaDias', 'Meta de dias sem acidentes') +
      num('jornada', 'Jornada diária (horas)', 'Usada no cálculo das horas-homem trabalhadas (HHT)') +
      num('diasMes', 'Dias trabalhados por mês', 'Usado no HHT para as taxas de frequência e gravidade') +
      num('aVencerDias', 'Avisar vencimentos com quantos dias de antecedência') +
      num('validadeRecargaExt', 'Validade da recarga do extintor (meses)') +
      num('validadeTHExt', 'Validade do teste hidrostático do extintor (meses)') +
      num('validadeTHHid', 'Validade do teste de mangueira/hidrante (meses)') +
      '<label class="field">Aparência<select id="cfg-tema"><option value="auto">Automática (igual ao sistema)</option><option value="light">Clara</option><option value="dark">Escura</option></select></label>' +
      '</div></div>');
    $('#cfg-tema', par).value = tema;
    $('#cfg-tema', par).addEventListener('change', (e) => { try { localStorage.setItem('gsst_tema', e.target.value); } catch (x) { /* ignora */ } this.aplicarTema(); });
    $$('[data-p]', par).forEach((inp) => inp.addEventListener('change', async () => { p[inp.dataset.p] = Number(inp.value) || 0; await Config.salvar(); toast('Parâmetro salvo'); }));
    main.appendChild(par);

    const aso = h('<div class="card"><h2>Validade do ASO por tipo (dias)</h2><p class="small muted">Deixe em branco para tipos sem vencimento (ex.: demissional). O PCMSO define a periodicidade de cada exame.</p><div class="cfg-grid">' +
      Config.lista('tiposASO').map((t) => '<label class="field">' + esc(t) + '<input type="number" min="0" data-aso="' + esc(t) + '" value="' + esc((p.asoValidade || {})[t] ?? '') + '"></label>').join('') + '</div></div>');
    $$('[data-aso]', aso).forEach((inp) => inp.addEventListener('change', async () => { p.asoValidade = p.asoValidade || {}; p.asoValidade[inp.dataset.aso] = inp.value === '' ? '' : Number(inp.value); await Config.salvar(); toast('Validade salva'); }));
    main.appendChild(aso);

    const mat = h('<div class="card"><h2>Matriz de risco (probabilidade × severidade)</h2><div class="row">' +
      '<div><h3>Classificação por faixa de nível (1 a 25)</h3><div class="list-edit">' + p.riscoFaixas.map((f, i) =>
        '<div class="item"><input data-fx="' + i + '" data-k="nome" value="' + esc(f.nome) + '"><input type="number" data-fx="' + i + '" data-k="de" value="' + f.de + '" style="max-width:80px" aria-label="De"><input type="number" data-fx="' + i + '" data-k="ate" value="' + f.ate + '" style="max-width:80px" aria-label="Até"></div>').join('') + '</div></div>' +
      '<div><h3>Rótulos de probabilidade (1 a 5)</h3><div class="list-edit">' + p.probLabels.map((l, i) => '<div class="item"><span style="width:20px">' + (i + 1) + '</span><input data-pl="' + i + '" value="' + esc(l) + '"></div>').join('') + '</div></div>' +
      '<div><h3>Rótulos de severidade (1 a 5)</h3><div class="list-edit">' + p.sevLabels.map((l, i) => '<div class="item"><span style="width:20px">' + (i + 1) + '</span><input data-sl="' + i + '" value="' + esc(l) + '"></div>').join('') + '</div></div></div></div>');
    $$('[data-fx]', mat).forEach((inp) => inp.addEventListener('change', async () => { const f = p.riscoFaixas[+inp.dataset.fx]; f[inp.dataset.k] = inp.dataset.k === 'nome' ? inp.value : Number(inp.value); await Config.salvar(); toast('Matriz salva'); }));
    $$('[data-pl]', mat).forEach((inp) => inp.addEventListener('change', async () => { p.probLabels[+inp.dataset.pl] = inp.value; await Config.salvar(); }));
    $$('[data-sl]', mat).forEach((inp) => inp.addEventListener('change', async () => { p.sevLabels[+inp.dataset.sl] = inp.value; await Config.salvar(); }));
    main.appendChild(mat);

    const txt = h('<div class="card"><h2>Textos padrão dos documentos</h2><div class="cfg-grid">' +
      [['objetivoOSS', 'Objetivo da OSS'], ['termoOSS', 'Termo de responsabilidade da OSS'], ['declaracaoEPI', 'Declaração da Ficha de EPI']].map(([k, l]) =>
        '<label class="field">' + l + '<textarea data-t="' + k + '" rows="6">' + esc(p[k]) + '</textarea></label>').join('') + '</div></div>');
    $$('[data-t]', txt).forEach((inp) => inp.addEventListener('change', async () => { p[inp.dataset.t] = inp.value; await Config.salvar(); toast('Texto salvo'); }));
    main.appendChild(txt);

    const keys = Object.keys(LISTAS_PADRAO);
    const lst = h('<div class="card"><h2>Listas de opções</h2><p class="small muted">Uma opção por linha. Valores novos digitados nos formulários entram aqui automaticamente.</p>' +
      '<div class="row"><label class="field">Lista<select id="cfg-lista">' + keys.map((k) => '<option value="' + k + '">' + esc(LISTAS_PADRAO[k].l) + '</option>').join('') + '</select></label></div>' +
      '<textarea id="cfg-vals" rows="12" style="margin-top:8px"></textarea><div class="toolbar" style="margin-top:8px"></div></div>');
    const sel = $('#cfg-lista', lst), ta = $('#cfg-vals', lst);
    const mostrar = () => { ta.value = Config.lista(sel.value).join('\n'); };
    sel.addEventListener('change', mostrar);
    $('.toolbar', lst).append(
      button('Salvar lista', 'btn-primary', async () => {
        Config.listas[sel.value] = Array.from(new Set(ta.value.split('\n').map((s) => s.trim()).filter(Boolean)));
        await Config.salvar(); toast('Lista salva');
      }),
      button('Ordenar A–Z', '', () => { ta.value = ta.value.split('\n').map((s) => s.trim()).filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR')).join('\n'); }),
      button('Restaurar padrão', '', () => { ta.value = LISTAS_PADRAO[sel.value].v.join('\n'); }));
    mostrar();
    main.appendChild(lst);

    const perigo = h('<div class="card"><h2>Zona de cuidado</h2><p class="small">Apaga os registros de um módulo desta empresa (por exemplo, para refazer uma importação).</p><div class="toolbar"><select id="cfg-apagar" style="width:auto">' +
      MODULOS.map((m) => '<option value="' + m.id + '">' + esc(m.nome) + ' (' + (this.data[m.id] || []).length + ')</option>').join('') + '</select></div></div>');
    $('.toolbar', perigo).appendChild(button('Apagar registros do módulo', 'btn-danger', async () => {
      const m = $('#cfg-apagar', perigo).value;
      if (!await confirmar('Apagar todos os ' + (this.data[m] || []).length + ' registros de "' + MOD[m].nome + '"? Faça um backup antes.', 'Apagar', true)) return;
      await DB.limparModulos(this.emp.id, [m]);
      await this.recarregarDados();
      this.marcarSalvo();
      this.paginaConfig();
      toast('Registros apagados');
    }));
    main.appendChild(perigo);
  },

  paginaSobre() {
    $('#main').innerHTML = '<div class="page-head"><div><h1>Como usar</h1><p>Gestão SST — sistema offline de gestão de saúde e segurança do trabalho.</p></div></div>' +
      '<div class="card"><h2>1. Sem internet e com gravação imediata</h2><p>O sistema funciona inteiro no navegador deste computador. Cada registro é gravado no momento em que você clica em <b>Salvar</b> — não existe "salvar arquivo". O horário da última gravação aparece no topo.</p>' +
      '<p>Para não perder dados caso o navegador seja limpo, use o botão <b>Backup</b>: no Chrome e no Edge você pode ativar o <b>backup automático em arquivo</b>, que regrava uma cópia .json numa pasta sua (por exemplo, OneDrive ou pen drive) a cada alteração.</p></div>' +
      '<div class="card"><h2>2. Empresa configurável</h2><p>No botão <b>Empresa</b>, no topo, você informa nome, CNPJ, endereço, responsável e o logotipo. Esses dados aparecem no cabeçalho e em todos os documentos impressos. É possível cadastrar várias empresas e alternar entre elas — os dados de cada uma ficam separados.</p></div>' +
      '<div class="card"><h2>3. Trazer os dados da planilha</h2><p>Em <b>Configurações → Importar planilha Excel</b>, escolha o arquivo Gestão SST (.xlsx). O sistema lê as abas preenchidas (colaboradores, EPI e movimentações, acidentes, treinamentos, ASO, extintores etc.) e cria os colaboradores citados nas movimentações.</p></div>' +
      '<div class="card"><h2>4. Rotina sugerida</h2><ul><li>Cadastre colaboradores, EPIs e o conteúdo de <b>Atividades por função</b>.</li><li>Lance cada entrega em <b>Movimentação de EPI</b> e imprima a <b>Ficha de EPI</b> para assinatura.</li><li>Acompanhe <b>Pendências e vencimentos</b> (ASO, treinamentos, CA, extintores, documentos, CIPA).</li><li>Use os <b>Painéis</b> nas reuniões de CIPA e de resultados.</li></ul></div>' +
      '<div class="card"><h2>5. Trabalho em equipe</h2><p>Para vários computadores usarem o mesmo cadastro, conecte a empresa a uma planilha Google em <b>Configurações → Trabalho em equipe</b>. Nos outros computadores, use <b>Empresa → Entrar em empresa da equipe</b>. Cada um continua funcionando sem internet e sincroniza sozinho quando a conexão volta.</p></div>' +
      '<div class="card"><h2>6. Indicadores</h2><p>Taxa de frequência = acidentes × 1.000.000 ÷ HHT. Taxa de gravidade = (dias perdidos + dias debitados) × 1.000.000 ÷ HHT, conforme a NBR 14280. O HHT é estimado por colaboradores ativos × jornada diária × dias trabalhados no mês × meses do período (ajuste em Configurações).</p></div>';
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
