/*
 * Riscos psicossociais (NR-01, capítulo 1.5, em vigor desde 26/05/2026).
 *
 * Questionário de triagem com 20 afirmações em 10 fatores, respondido de forma
 * ANÔNIMA: a resposta guarda só a campanha, o setor e as notas — sem nome, sem
 * hora. O resultado sai por setor e por fator; setor com menos de 5 respostas
 * entra em "Demais setores", para ninguém ser identificado (LGPD).
 * Os fatores em nível moderado ou alto podem ser levados ao inventário de
 * riscos (módulo Riscos ambientais, tipo PSICOSSOCIAL).
 *
 * Instrumento de triagem próprio, não validado cientificamente: serve para
 * identificar onde aprofundar (entrevistas, grupos, análise da atividade).
 */
const Psico = {
  MIN_GRUPO: 5,
  ESCALA: ['Nunca', 'Raramente', 'Às vezes', 'Frequentemente', 'Sempre'],
  // [fator, afirmação, positiva?] — afirmação positiva conta ao contrário (mais = menos risco)
  ITENS: [
    ['Demandas e ritmo de trabalho', 'Tenho mais trabalho do que consigo fazer dentro da jornada.', false],
    ['Demandas e ritmo de trabalho', 'Preciso trabalhar em ritmo acelerado para dar conta das tarefas.', false],
    ['Jornada e pausas', 'Faço horas extras ou levo trabalho para casa.', false],
    ['Jornada e pausas', 'Consigo fazer as pausas e o intervalo previstos.', true],
    ['Autonomia e controle', 'Posso opinar sobre a forma de fazer o meu trabalho.', true],
    ['Autonomia e controle', 'Tenho liberdade para decidir a ordem das minhas tarefas.', true],
    ['Clareza do papel', 'Sei exatamente o que se espera de mim no trabalho.', true],
    ['Clareza do papel', 'Recebo ordens contraditórias de pessoas diferentes.', false],
    ['Apoio da liderança', 'Minha liderança me ajuda quando tenho dificuldades.', true],
    ['Apoio da liderança', 'Sou tratado(a) com respeito pela liderança.', true],
    ['Apoio dos colegas', 'Posso contar com os colegas quando preciso.', true],
    ['Apoio dos colegas', 'Há clima de cooperação na minha equipe.', true],
    ['Assédio e violência', 'Sou alvo de humilhações, ameaças ou piadas ofensivas no trabalho.', false],
    ['Assédio e violência', 'Presencio situações de assédio moral ou sexual no trabalho.', false],
    ['Reconhecimento', 'Meu esforço é reconhecido pela empresa.', true],
    ['Reconhecimento', 'Sinto que o meu trabalho é valorizado.', true],
    ['Mudanças e comunicação', 'Sou informado(a) com antecedência sobre mudanças que me afetam.', true],
    ['Mudanças e comunicação', 'Tenho receio de perder o emprego.', false],
    ['Exigência emocional e isolamento', 'Meu trabalho me deixa esgotado(a) emocionalmente.', false],
    ['Exigência emocional e isolamento', 'Trabalho isolado(a), sem contato com colegas ou liderança.', false]
  ],
  fatores() { return [...new Set(this.ITENS.map((i) => i[0]))]; },

  /** Nota de risco de 0 a 100 de um conjunto de respostas, por fator. */
  notas(respostas) {
    const out = {};
    this.fatores().forEach((f) => {
      let soma = 0, n = 0;
      respostas.forEach((r) => this.ITENS.forEach((it, i) => {
        if (it[0] !== f) return;
        const v = r.respostas ? r.respostas[i] : null;
        if (v == null || v === '') return;
        soma += it[2] ? 4 - Number(v) : Number(v); n++;
      }));
      out[f] = n ? Math.round(soma * 100 / (n * 4)) : null;
    });
    return out;
  },
  nivel(nota) { return nota == null ? '' : nota >= 60 ? 'ALTO' : nota >= 35 ? 'MODERADO' : 'BAIXO'; },

  respostas(campanha) { return (App.data.respostaspsico || []).filter((r) => r.campanha === campanha); },
  campanhas() { return (App.data.campanhaspsico || []).slice().sort((a, b) => (b.inicio || '').localeCompare(a.inicio || '')); },

  /** Grupos para o resultado: setores com 5 ou mais respostas; os demais juntos. */
  grupos(resps) {
    const por = new Map();
    resps.forEach((r) => { const k = r.setor || 'Sem setor'; (por.get(k) || por.set(k, []).get(k)).push(r); });
    const G = [], resto = [];
    [...por.entries()].sort((a, b) => a[0].localeCompare(b[0])).forEach(([k, l]) => { if (l.length >= this.MIN_GRUPO) G.push({ nome: k, l }); else resto.push(...l); });
    if (resto.length >= this.MIN_GRUPO) G.push({ nome: 'Demais setores', l: resto, juntos: true });
    return G;
  },

  /* ---------------- Gravação anônima ---------------- */
  async gravarResposta(campanha, setor, valores) {
    const hoje = D.today();
    // sem hora e sem nome: só a data do dia, para a resposta não poder ser ligada a quem respondeu
    const rec = { id: uid(), emp: App.emp.id, mod: 'respostaspsico', campanha, setor, respostas: valores, criadoEm: hoje, atualizadoEm: hoje + 'T00:00:00.000Z' };
    await DB.put('rec', rec);
    (App.data.respostaspsico || (App.data.respostaspsico = [])).push(rec);
    App.versao++;
    App.marcarSalvo();
  },

  /* ---------------- Tela principal ---------------- */
  sel: '',
  pagina() {
    const main = $('#main');
    main.innerHTML = '';
    const cs = this.campanhas();
    if (!cs.some((c) => c.id === this.sel)) this.sel = cs[0] ? cs[0].id : '';
    const camp = cs.find((c) => c.id === this.sel);
    const head = h('<div class="page-head"><div><h1>Riscos psicossociais (NR-01)</h1><p>Questionário anônimo por setor. O resultado identifica os fatores que precisam entrar no inventário de riscos do PGR.</p></div><div class="toolbar"></div></div>');
    const tb = $('.toolbar', head);
    tb.append(button('+ Nova campanha', '', () => Forms.abrir('campanhaspsico', null, { nome: 'Avaliação psicossocial ' + D.year(D.today()) })));
    if (camp) {
      tb.append(button('Imprimir questionário em branco', '', () => Reports.imprimir(this.htmlQuestionario(camp))));
      if (camp.status !== 'Encerrada') tb.append(button('Responder (modo anônimo)', 'btn-primary', () => this.modoResposta(camp)));
    }
    main.appendChild(head);
    main.appendChild(h('<div class="notice">As respostas não guardam nome nem horário. O resultado só mostra setores com pelo menos ' + this.MIN_GRUPO + ' respostas; os menores aparecem juntos em "Demais setores". A NR-01 não obriga o uso de questionário: entrevistas, grupos de discussão e observação da atividade também valem e complementam este levantamento.</div>'));
    if (!camp) {
      main.appendChild(h('<div class="card empty">Nenhuma campanha ainda. Crie uma campanha, aplique o questionário (no próprio computador ou tablet, em "Responder", ou em papel) e acompanhe aqui o resultado por setor.</div>'));
      return;
    }
    if (cs.length > 1) {
      const f = h('<div class="filters"><select aria-label="Campanha">' + cs.map((c) => '<option value="' + c.id + '"' + (c.id === this.sel ? ' selected' : '') + '>' + esc(c.nome) + '</option>').join('') + '</select></div>');
      $('select', f).addEventListener('change', (e) => { this.sel = e.target.value; this.pagina(); });
      main.appendChild(f);
    }
    main.appendChild(this.resultado(camp));
  },

  resultado(camp) {
    const resps = this.respostas(camp.id);
    const G = this.grupos(resps);
    const geral = this.notas(resps);
    const box = h('<div></div>');
    const altos = this.fatores().filter((f) => this.nivel(geral[f]) === 'ALTO').length;
    box.appendChild(h('<div class="tiles">' + Paineis.tile('Respostas', fmtInt(resps.length), esc(camp.status || '') + (camp.inicio ? ' · desde ' + D.br(camp.inicio) : ''), 'hero') +
      Paineis.tile('Setores com resultado', fmtInt(G.filter((g) => !g.juntos).length), 'com ' + this.MIN_GRUPO + ' ou mais respostas') +
      Paineis.tile('Fatores em nível alto', resps.length >= this.MIN_GRUPO ? fmtInt(altos) : '–', 'na empresa como um todo') + '</div>'));
    if (resps.length < this.MIN_GRUPO) {
      box.appendChild(h('<div class="card empty">Ainda há ' + resps.length + ' resposta(s). O resultado aparece a partir de ' + this.MIN_GRUPO + ', para preservar o anonimato.</div>'));
      return box;
    }
    const cel = (n) => '<td class="num psi-cel psi-' + norm(this.nivel(n)) + '" title="' + this.nivel(n) + '">' + (n == null ? '–' : n) + '</td>';
    const colunas = [{ nome: 'Empresa', l: resps }].concat(G);
    const notasG = colunas.map((g) => this.notas(g.l));
    const card = h('<div class="card"><h2>Resultado por fator e setor</h2><p class="small muted">Nota de risco de 0 a 100: abaixo de 35, baixo; de 35 a 59, moderado; 60 ou mais, alto.</p>' +
      '<div class="table-wrap"><table class="data psi-tab"><thead><tr><th>Fator</th>' + colunas.map((g) => '<th class="num">' + esc(g.nome) + '<div class="muted small">' + g.l.length + ' resp.</div></th>').join('') + '</tr></thead><tbody>' +
      this.fatores().map((f) => '<tr><td>' + esc(f) + '</td>' + notasG.map((n) => cel(n[f])).join('') + '</tr>').join('') + '</tbody></table></div>' +
      '<div class="toolbar" style="margin-top:10px"></div></div>');
    $('.toolbar', card).append(
      button('Levar ao inventário de riscos', 'btn-primary', () => this.levarAoInventario(camp, G)),
      button('Imprimir resultado', '', () => Reports.imprimir(Reports.cabecalho('AVALIAÇÃO DE FATORES DE RISCO PSICOSSOCIAIS — ' + camp.nome) +
        '<p>Respostas: ' + resps.length + ' · Período: ' + D.br(camp.inicio) + (camp.fim ? ' a ' + D.br(camp.fim) : '') + '</p>' +
        '<table><thead><tr><th>Fator</th>' + colunas.map((g) => '<th>' + esc(g.nome) + ' (' + g.l.length + ')</th>').join('') + '</tr></thead><tbody>' +
        this.fatores().map((f) => '<tr><td>' + esc(f) + '</td>' + notasG.map((n) => '<td>' + (n[f] == null ? '–' : n[f] + ' — ' + this.nivel(n[f])) + '</td>').join('') + '</tr>').join('') + '</tbody></table>' +
        '<p style="font-size:9pt">Nota de risco de 0 a 100 (abaixo de 35: baixo; 35 a 59: moderado; 60 ou mais: alto). Questionário anônimo de triagem; setores com menos de ' + this.MIN_GRUPO + ' respostas foram agrupados. Os fatores moderados e altos devem ser aprofundados e tratados no plano de ação do PGR (NR-01, item 1.5).</p>' +
        '<div class="sign"><div>' + esc(App.emp.responsavel || 'Responsável pela segurança') + '</div><div>Gestão</div></div>')));
    box.appendChild(card);
    return box;
  },

  async levarAoInventario(camp, G) {
    const novos = [];
    G.forEach((g) => {
      const n = this.notas(g.l);
      this.fatores().forEach((f) => {
        const nv = this.nivel(n[f]);
        if (nv === 'MODERADO' || nv === 'ALTO') novos.push({ setor: g.juntos ? '' : g.nome, grupo: g.nome, fator: f, nota: n[f], nv, qtd: g.l.length });
      });
    });
    if (!novos.length) { toast('Nenhum fator em nível moderado ou alto. Nada a levar ao inventário.', 4000); return; }
    if (!await confirmar('Levar ' + novos.length + ' fator(es) em nível moderado ou alto ao inventário de riscos (Riscos ambientais, tipo PSICOSSOCIAL)? Os que já estiverem lá serão atualizados.', 'Levar ao inventário')) return;
    Config.absorver('tiposRisco', 'PSICOSSOCIAL');
    await Config.salvar();
    let criados = 0, atualizados = 0;
    for (const x of novos) {
      const descricao = 'Fator psicossocial: ' + x.fator + (x.setor ? '' : ' (' + x.grupo + ')');
      const ja = (App.data.riscos || []).find((r) => r.tipo === 'PSICOSSOCIAL' && norm(r.descricao) === norm(descricao) && norm(r.setor || '') === norm(x.setor));
      const dados = {
        tipo: 'PSICOSSOCIAL', setor: x.setor, descricao,
        danos: 'Estresse, ansiedade, esgotamento, adoecimento mental e aumento do risco de acidentes',
        expostos: x.qtd, exposicao: 'Contínua, durante a jornada',
        controles: (ja && ja.controles) || 'A definir no plano de ação. Origem: ' + camp.nome + ', nota ' + x.nota + ' de 100 (' + x.nv.toLowerCase() + '), ' + x.qtd + ' respostas.',
        prob: String(x.nv === 'ALTO' ? 4 : 3), sev: '3'
      };
      await App.salvar('riscos', Object.assign({}, ja || {}, dados));
      if (ja) atualizados++; else criados++;
    }
    toast(criados + ' risco(s) incluído(s) e ' + atualizados + ' atualizado(s) no inventário', 5000);
  },

  /* ---------------- Modo resposta (tablet ou computador) ---------------- */
  modoResposta(camp) {
    const setores = Config.lista('setores');
    const tela = h('<div class="psi-tela"></div>');
    const inicio = () => {
      tela.innerHTML = '<h2>' + esc(camp.nome) + '</h2><p>Este questionário é <b>anônimo</b>: não pede nome e não guarda o horário. Responda pensando nos <b>últimos 30 dias</b>. Leva cerca de 5 minutos.</p>' +
        '<label class="field">Seu setor<select data-setor><option value="">Escolha o setor</option>' + setores.map((s) => '<option>' + esc(s) + '</option>').join('') + '</select></label>' +
        '<div class="toolbar" style="margin-top:12px"></div>';
      $('.toolbar', tela).append(button('Começar', 'btn-primary', () => {
        const s = $('[data-setor]', tela).value;
        if (!s) { toast('Escolha o setor.'); return; }
        perguntas(s);
      }));
    };
    const perguntas = (setor) => {
      tela.innerHTML = '<p class="small muted">Setor: ' + esc(setor) + '. Marque com que frequência cada situação acontece.</p>' +
        '<ol class="psi-lista">' + this.ITENS.map((it, i) => '<li><div class="psi-q">' + esc(it[1]) + '</div><div class="psi-op" role="radiogroup">' +
          this.ESCALA.map((e, v) => '<label><input type="radio" name="q' + i + '" value="' + v + '"> ' + esc(e) + '</label>').join('') + '</div></li>').join('') + '</ol>' +
        '<div class="toolbar"></div>';
      $('.toolbar', tela).append(button('Enviar respostas', 'btn-primary', async () => {
        const vals = this.ITENS.map((_, i) => { const m = $('input[name="q' + i + '"]:checked', tela); return m ? Number(m.value) : null; });
        const falta = vals.filter((v) => v == null).length;
        if (falta) { toast('Faltam ' + falta + ' pergunta(s).'); return; }
        await this.gravarResposta(camp.id, setor, vals);
        obrigado();
      }));
      tela.scrollTop = 0;
    };
    const obrigado = () => {
      tela.innerHTML = '<h2>Obrigado!</h2><p>Suas respostas foram registradas sem identificação.</p><div class="toolbar"></div>';
      $('.toolbar', tela).append(button('Próxima pessoa', 'btn-primary', inicio));
    };
    inicio();
    Modal.open({ title: 'Questionário anônimo', body: tela, foot: [button('Sair do modo resposta', '', () => { Modal.close(); this.pagina(); })] });
  },

  htmlQuestionario(camp) {
    return Reports.cabecalho('QUESTIONÁRIO DE FATORES PSICOSSOCIAIS — ' + camp.nome) +
      '<p>Questionário <b>anônimo</b>. Não escreva seu nome. Marque um X na frequência de cada situação nos últimos 30 dias e deposite na urna.</p>' +
      '<p>Setor: ______________________________</p>' +
      '<table><thead><tr><th>#</th><th>Situação</th>' + this.ESCALA.map((e) => '<th>' + esc(e) + '</th>').join('') + '</tr></thead><tbody>' +
      this.ITENS.map((it, i) => '<tr><td>' + (i + 1) + '</td><td>' + esc(it[1]) + '</td>' + this.ESCALA.map(() => '<td></td>').join('') + '</tr>').join('') + '</tbody></table>' +
      '<p style="font-size:9pt">Os questionários em papel podem ser lançados no sistema em "Responder (modo anônimo)", um por vez.</p>';
  }
};
