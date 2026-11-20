/*
 * Controle de manutenção preventiva por horímetro ou quilometragem, no modelo
 * da planilha "Controle de manutenção preventiva": uma linha por veículo ou
 * equipamento, com a leitura atual, a última revisão, o intervalo e o que vence
 * primeiro — a revisão por uso (km/h) ou por tempo (dias).
 * Também importa essa planilha (.xlsx): várias linhas do mesmo veículo viram
 * um registro, com as revisões anteriores no histórico.
 */
const Preventiva = {
  fmt(v, un) { return v == null || v === '' ? '' : fmtNum(v, 1) + (un ? ' ' + un : ''); },

  derivar(r, o) {
    const ult = toNum(r.ultimaRevisao), int = toNum(r.intervalo), lei = toNum(r.leituraAtual), dias = toNum(r.intervaloDias);
    o._proxRevisao = ult != null && int ? ult + int : null;
    o._faltam = o._proxRevisao != null && lei != null ? o._proxRevisao - lei : null;
    o._proxData = r.dataUltima && dias ? D.addDays(r.dataUltima, dias) : '';
    const lim = Number(Config.params.aVencerDias || 30);
    const diasData = o._proxData ? D.diff(D.today(), o._proxData) : null;
    const diasProg = r.dataProgramada ? D.diff(D.today(), r.dataProgramada) : null;
    if (o._proxRevisao == null && !o._proxData) o._sitPrev = 'SEM DADOS';
    else if ((o._faltam != null && o._faltam <= 0) || (diasData != null && diasData < 0)) o._sitPrev = 'VENCIDA';
    else if ((o._faltam != null && int && o._faltam <= int * 0.1) || (diasData != null && diasData <= lim) || (diasProg != null && diasProg >= 0 && diasProg <= lim)) o._sitPrev = 'PRÓXIMA';
    else o._sitPrev = 'EM DIA';
    const idade = r.dataLeitura ? D.diff(r.dataLeitura, D.today()) : null;
    o._leitura = idade == null ? 'SEM LEITURA' : idade > 30 ? 'DESATUALIZADA' : 'ATUALIZADA';
    o._diasData = diasData;
    o._statusSelo = r.validadeSelo ? Calc.situacao(r.validadeSelo).s : '';
  },

  pendencias(add) {
    (App.data.preventivas || []).forEach((r) => {
      const d = Calc.derivar('preventivas', r);
      const nome = (r.frota ? r.frota + ' — ' : '') + (r.modelo || '') + (r.placaSerie ? ' (' + r.placaSerie + ')' : '');
      if (d._sitPrev === 'VENCIDA' || d._sitPrev === 'PRÓXIMA') {
        const falta = d._faltam != null ? (d._faltam <= 0 ? 'passou ' + this.fmt(-d._faltam, r.unidade) : 'faltam ' + this.fmt(d._faltam, r.unidade)) : '';
        add('Preventiva', 'Revisão ' + this.fmt(d._proxRevisao, r.unidade) + ' — ' + nome + (falta ? ' (' + falta + ')' : ''), r.executante || r.local || '', d._proxData || r.dataProgramada || '',
          { s: d._sitPrev === 'VENCIDA' ? 'VENCIDO' : 'A VENCER', dias: d._diasData }, 'preventivas', r.id);
      }
      if (d._statusSelo === 'VENCIDO' || d._statusSelo === 'A VENCER') add('Preventiva', 'Selo de inspeção — ' + nome, r.local || '', r.validadeSelo, Calc.situacao(r.validadeSelo), 'preventivas', r.id);
      if (r.parada === 'Sim') add('Preventiva', 'Máquina parada — ' + nome, r.obs ? String(r.obs).slice(0, 60) : '', '', { s: 'PARADA', dias: null }, 'preventivas', r.id);
    });
  },

  /** Registrar uma revisão feita: a anterior vai para o histórico. */
  registrarRevisao(rec) {
    const r = (App.data.preventivas || []).find((x) => x.id === rec.id) || rec;
    const d = Calc.derivar('preventivas', r);
    const un = r.unidade || '';
    const body = h('<form class="form-grid"><p class="w4"><b>' + esc((r.frota ? r.frota + ' — ' : '') + (r.modelo || '')) + '</b>' + (r.placaSerie ? ' · ' + esc(r.placaSerie) : '') + '</p>' +
      '<label class="field">Revisão feita com (' + esc(un || 'km ou h') + ')<input name="valor" type="text" inputmode="decimal" value="' + esc(d._proxRevisao != null ? String(d._proxRevisao) : '') + '"></label>' +
      '<label class="field">Data da revisão<input name="data" type="date" value="' + D.today() + '"></label>' +
      '<label class="field w4">Serviços e peças trocadas<textarea name="servicos">' + esc(r.servicos || '') + '</textarea></label></form>');
    Modal.open({
      title: 'Registrar revisão', body,
      foot: [button('Cancelar', '', () => Forms.abrir('preventivas', r)), button('Registrar', 'btn-primary', async () => {
        const valor = toNum(body.elements.valor.value), data = body.elements.data.value;
        if (valor == null || !data) { toast('Informe o valor e a data da revisão.'); return; }
        const linha = D.br(data) + ' — revisão de ' + this.fmt(valor, un) + (body.elements.servicos.value.trim() ? ' — ' + body.elements.servicos.value.trim().replace(/\s+/g, ' ') : '');
        const novo = Object.assign({}, r, {
          historico: [linha, r.historico || ''].filter(Boolean).join('\n'),
          ultimaRevisao: valor, dataUltima: data, servicos: '', dataProgramada: ''
        });
        if (toNum(r.leituraAtual) == null || valor >= toNum(r.leituraAtual)) { novo.leituraAtual = valor; novo.dataLeitura = data; }
        await App.salvar('preventivas', novo);
        Modal.close();
        toast('Revisão registrada. Próxima: ' + this.fmt(valor + (toNum(r.intervalo) || 0), un));
      })]
    });
  },

  /* ---------------- Importação da planilha de controle de preventiva ---------------- */
  CAB: [
    ['modelo', (s) => s === 'modelo'],
    ['placaSerie', (s) => s.includes('serie') || s.includes('placa')],
    ['frota', (s) => s === 'frota'],
    ['leituraAtual', (s) => s.startsWith('horimetro') || s.startsWith('km atual') || s.startsWith('hodometro')],
    ['dataLeitura', (s) => s.startsWith('data de coleta')],
    ['ultimaRevisao', (s) => s === 'ultima revisao'],
    ['dataUltima', (s) => s.startsWith('data da ultima revisao')],
    ['_proxData', (s) => s.startsWith('revisao por tempo')],
    ['_proxRev', (s) => s.startsWith('proxima revisao')],
    ['servicos', (s) => s.startsWith('servico')],
    ['executante', (s) => s.startsWith('pmp')],
    ['parada', (s) => s.startsWith('maquina parada')],
    ['material', (s) => s.startsWith('material enviado')],
    ['obs', (s) => s === 'obs' || s === 'obs.' || s.startsWith('observ')],
    ['emissaoSelo', (s) => s.startsWith('data de emissao do selo')],
    ['validadeSelo', (s) => s === 'validade' || s.startsWith('validade do selo')]
  ],

  /** Linha de cabeçalho: devolve o mapa campo → coluna, ou null. */
  cabecalho(cel) {
    const textos = Object.entries(cel).map(([c, v]) => [Number(c), norm(String(v)).replace(/\s+/g, ' ').replace(/[.:]+$/, '').trim()]);
    if (!textos.some(([, t]) => t === 'modelo') || !textos.some(([, t]) => t === 'frota')) return null;
    const mapa = {};
    textos.forEach(([c, t]) => { const k = this.CAB.find(([, f]) => f(t)); if (k && mapa[k[0]] == null) mapa[k[0]] = c; });
    return mapa;
  },

  async lerPlanilha(file) {
    const wb = await Xlsx.abrir(await lerArquivo(file, 'buffer'));
    const regs = [];
    for (const aba of wb.abas) {
      const linhas = await wb.linhas(aba);
      if (!linhas) continue;
      const nomeAba = aba.replace(/\s+/g, ' ').trim();
      let mapa = null, secao = '';
      for (const [rn, cel] of linhas) {
        const novo = this.cabecalho(cel);
        if (novo) {
          // seção sem título na coluna da validade: na planilha original, a primeira coluna de datas sem título é a validade do selo
          if (novo.validadeSelo == null && mapa && mapa.validadeSelo != null) novo.validadeSelo = mapa.validadeSelo;
          if (novo.validadeSelo == null) {
            const usadas = new Set(Object.values(novo));
            const conta = {};
            for (const [rn2, c2] of linhas) {
              if (rn2 <= rn) continue;
              if (this.cabecalho(c2)) break;
              Object.entries(c2).forEach(([c, v]) => { if (!usadas.has(Number(c)) && typeof v === 'number' && v > 36000 && v < 60000 && Number.isInteger(v)) conta[c] = (conta[c] || 0) + 1; });
            }
            const col = Object.entries(conta).sort((a, b) => b[1] - a[1])[0];
            if (col) novo.validadeSelo = Number(col[0]);
          }
          mapa = novo;
          continue;
        }
        if (!mapa) continue;
        const v = (k) => (mapa[k] != null ? cel[mapa[k]] : undefined);
        const modelo = v('modelo'), placa = v('placaSerie'), frota = v('frota');
        const valores = Object.values(cel);
        // título de seção: só texto curto na primeira coluna (ex.: "SONDAS")
        if (valores.length === 1 && typeof valores[0] === 'string' && !placa && !frota) {
          const t = valores[0].trim();
          if (t.length <= 60 && !/^obs/i.test(t)) secao = t;
          continue;
        }
        if (!modelo && !placa && !frota) continue; // linha só com fórmulas ou observação
        const num = (x) => (typeof x === 'number' ? x : toNum(x));
        const ult = num(v('ultimaRevisao')), prox = num(v('_proxRev'));
        const dUlt = D.fromAny(v('dataUltima')), dProx = D.fromAny(v('_proxData'));
        regs.push({
          aba: nomeAba + (secao ? ' — ' + secao : ''), linha: rn,
          emissaoSelo: D.fromAny(v('emissaoSelo')), validadeSelo: D.fromAny(v('validadeSelo')),
          modelo: modelo != null ? String(modelo).trim() : '', placaSerie: placa != null && norm(placa) !== 'na' ? String(placa).trim() : '',
          frota: frota != null ? String(frota).replace(/\s+/g, ' ').trim() : '',
          leituraAtual: num(v('leituraAtual')), dataLeitura: D.fromAny(v('dataLeitura')),
          ultimaRevisao: ult, dataUltima: dUlt,
          intervalo: ult != null && prox != null && prox > ult ? prox - ult : null,
          intervaloDias: dUlt && dProx ? D.diff(dUlt, dProx) : null,
          servicos: v('servicos') != null ? String(v('servicos')) : '',
          executante: v('executante') != null ? String(v('executante')).trim() : '',
          parada: v('parada') != null ? (norm(v('parada')).startsWith('s') ? 'Sim' : 'Não') : '',
          obs: [v('obs'), v('material') != null ? 'Material enviado: ' + v('material') : ''].filter((x) => x != null && x !== '').join(' · ')
        });
      }
    }
    return this.agrupar(regs);
  },

  /** Várias linhas do mesmo veículo: a de maior revisão é a situação atual; as outras viram histórico. */
  agrupar(regs) {
    // sem placa ou série, o mesmo ID de frota pode estar em modelos diferentes: entra o modelo na chave
    const chave = (r) => (r.placaSerie ? norm(r.placaSerie) : norm(r.frota) + '#' + norm(r.modelo)) + '|' + norm(r.aba);
    const grupos = new Map();
    regs.forEach((r) => { const k = chave(r); (grupos.get(k) || grupos.set(k, []).get(k)).push(r); });
    return [...grupos.values()].map((g) => {
      g.sort((a, b) => (a.ultimaRevisao ?? -1) - (b.ultimaRevisao ?? -1) || (a.dataUltima || '').localeCompare(b.dataUltima || ''));
      const atual = Object.assign({}, g[g.length - 1]);
      const comLeitura = g.filter((x) => x.leituraAtual != null).sort((a, b) => b.leituraAtual - a.leituraAtual)[0];
      if (atual.leituraAtual == null && comLeitura) { atual.leituraAtual = comLeitura.leituraAtual; atual.dataLeitura = comLeitura.dataLeitura; }
      ['frota', 'modelo', 'executante', 'servicos', 'obs', 'emissaoSelo', 'validadeSelo', 'parada'].forEach((k) => { if (!atual[k]) { const x = g.slice().reverse().find((y) => y[k]); if (x) atual[k] = x[k]; } });
      if (atual.intervalo == null) { const x = g.slice().reverse().find((y) => y.intervalo != null); if (x) atual.intervalo = x.intervalo; }
      if (atual.intervaloDias == null) { const x = g.slice().reverse().find((y) => y.intervaloDias != null); if (x) atual.intervaloDias = x.intervaloDias; }
      // placa de veículo e leitura alta: quilometragem; senão, horímetro
      const placa = /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(String(atual.placaSerie || '').toUpperCase().replace(/[^A-Z0-9]/g, ''));
      atual.unidade = placa && ((atual.ultimaRevisao ?? atual.leituraAtual ?? 0) >= 5000) ? 'km' : 'horas';
      atual.historico = g.slice(0, -1).reverse().filter((x) => x.ultimaRevisao != null)
        .map((x) => (x.dataUltima ? D.br(x.dataUltima) : 'sem data') + ' — revisão de ' + this.fmt(x.ultimaRevisao, atual.unidade)).join('\n');
      atual.local = atual.aba;
      atual._linhas = g.length;
      delete atual.aba; delete atual.linha;
      return atual;
    });
  },

  importar() {
    const inp = h('<input type="file" accept=".xlsx" hidden>');
    document.body.appendChild(inp);
    inp.addEventListener('change', async () => {
      const f = inp.files[0]; inp.remove();
      if (!f) return;
      let lista;
      try { lista = await this.lerPlanilha(f); } catch (e) { toast('Não foi possível ler a planilha: ' + e.message, 6000); return; }
      if (!lista.length) { toast('Nenhuma linha de controle de preventiva encontrada. A planilha precisa ter as colunas "Modelo" e "Frota".', 6000); return; }
      const existentes = App.data.preventivas || [];
      const id = (r) => (r.placaSerie ? norm(r.placaSerie) : norm(r.frota) + '#' + norm(r.modelo)) + '|' + norm(r.local);
      const achar = (r) => existentes.find((x) => id(x) === id(r));
      const novos = lista.filter((r) => !achar(r)).length;
      const linhas = lista.reduce((s, r) => s + r._linhas, 0);
      const body = h('<div><p>Encontrei <b>' + lista.length + '</b> veículos e equipamentos em ' + linhas + ' linhas da planilha. Linhas repetidas do mesmo veículo viraram histórico de revisões.</p>' +
        '<p class="small">' + novos + ' novo(s) e ' + (lista.length - novos) + ' já cadastrado(s): estes terão os dados atualizados pela planilha.</p>' +
        '<div class="table-wrap" style="max-height:320px"><table class="data"><thead><tr><th>Local</th><th>Frota</th><th>Modelo</th><th>Placa / série</th><th>Controle</th><th class="num">Última revisão</th><th class="num">Intervalo</th><th class="num">Leitura atual</th><th>Validade do selo</th></tr></thead><tbody>' +
        lista.map((r) => '<tr><td>' + esc(r.local) + '</td><td>' + esc(r.frota) + '</td><td>' + esc(r.modelo) + '</td><td>' + esc(r.placaSerie) + '</td><td>' + esc(r.unidade) + '</td><td class="num">' + esc(this.fmt(r.ultimaRevisao)) + '</td><td class="num">' + esc(this.fmt(r.intervalo)) +
          (r.intervaloDias ? ' / ' + r.intervaloDias + ' d' : '') + '</td><td class="num">' + esc(this.fmt(r.leituraAtual)) + '</td><td>' + D.br(r.validadeSelo) + '</td></tr>').join('') + '</tbody></table></div>' +
        '<p class="small muted">Confira a coluna "Controle": veículos com placa foram marcados por km e os demais por horas. Dá para corrigir depois em cada cadastro.</p></div>');
      Modal.open({
        title: 'Importar controle de preventiva', body,
        foot: [button('Cancelar', '', () => Modal.close()), button('Importar', 'btn-primary', async () => {
          for (const r of lista) {
            const ja = achar(r);
            const rec = Object.assign({}, ja || {}, r);
            delete rec._linhas;
            ['frota', 'modelo'].forEach((k) => { if (!rec[k]) rec[k] = k === 'frota' ? (r.placaSerie || 'sem ID') : '(sem modelo)'; });
            await App.salvar('preventivas', rec);
          }
          ['locaisPreventiva', 'executantesPreventiva'].forEach((l, i) => lista.forEach((r) => Config.absorver(l, i ? r.executante : r.local)));
          await Config.salvar();
          Modal.close();
          App.ir('m:preventivas');
          toast(lista.length + ' veículo(s) e equipamento(s) importados', 4000);
        })]
      });
    });
    inp.click();
  }
};
