/*
 * Campos calculados (o equivalente às fórmulas da planilha): validades,
 * estoque de EPI, dias perdidos, classificação de risco, mandato da CIPA etc.
 * Toda contagem de dias usa dias corridos (a planilha original usava DIAS360,
 * que distorce a contagem em até 5 dias por ano).
 */
const Calc = {
  _ver: -1,
  idx: null,

  /** Índices refeitos sempre que os dados mudam. */
  indices() {
    if (this._ver === App.versao && this.idx) return this.idx;
    const ix = { colab: new Map(), epi: new Map(), equip: new Map(), mov: new Map(), ultimaManut: new Map() };
    (App.data.colaboradores || []).forEach((c) => ix.colab.set(c.id, c));
    (App.data.epis || []).forEach((e) => ix.epi.set(e.id, e));
    (App.data.equipamentos || []).forEach((e) => ix.equip.set(e.id, e));
    (App.data.movepi || []).forEach((m) => {
      const a = ix.mov.get(m.epi) || { ent: 0, sai: 0 };
      const q = Number(m.qtd) || 0;
      if (m.tipo === 'ENTRADA') a.ent += q; else a.sai += q;
      ix.mov.set(m.epi, a);
    });
    (App.data.manutencoes || []).forEach((m) => {
      const u = ix.ultimaManut.get(m.equip);
      if (m.data && (!u || m.data > u)) ix.ultimaManut.set(m.equip, m.data);
    });
    this.idx = ix; this._ver = App.versao;
    return ix;
  },

  colab(id) { return this.indices().colab.get(id) || null; },
  nomeColab(id) { const c = this.colab(id); return c ? c.nome : ''; },
  epi(id) { return this.indices().epi.get(id) || null; },
  nomeEpi(id) {
    const e = this.epi(id); if (!e) return '';
    return e.descricao + (e.fabricante ? ' — ' + e.fabricante : '') + (e.ca ? ' (CA ' + e.ca + ')' : '');
  },
  nomeEquip(id) { const e = this.indices().equip.get(id); return e ? e.nome + (e.modelo ? ' — ' + e.modelo : '') : ''; },

  situacao(venc) {
    if (!venc) return { s: '', dias: null };
    const dias = D.diff(D.today(), venc);
    if (dias < 0) return { s: 'VENCIDO', dias };
    if (dias <= Number(Config.params.aVencerDias || 30)) return { s: 'A VENCER', dias };
    return { s: 'VÁLIDO', dias };
  },

  vencASO(r) {
    if (!r.data) return '';
    let dias = toNum(r.validadeDias);
    if (dias == null) dias = toNum((Config.params.asoValidade || {})[r.tipo]);
    return dias ? D.addDays(r.data, dias) : '';
  },
  vencTreino(r) {
    const base = r.dataFinal || r.dataInicial;
    if (!base || r.controlar === 'Não' || r.status === 'Cancelado' || r.status === 'Agendado') return '';
    const m = toNum(r.validadeMeses);
    return m ? D.addMonths(base, m) : '';
  },

  /** Calcula todos os campos derivados de um registro. */
  derivar(mod, r) {
    const o = {};
    const hoje = D.today();
    if (r.data) { o._ano = D.year(r.data); o._mes = D.month(r.data); }
    switch (mod) {
      case 'colaboradores': {
        if (r.nascimento) o._idade = Math.floor(D.diff(r.nascimento, r.desligamento || hoje) / 365.25);
        if (r.admissao) {
          const dias = D.diff(r.admissao, r.desligamento || hoje);
          if (dias != null && dias >= 0) {
            const a = Math.floor(dias / 365.25), m = Math.floor((dias - a * 365.25) / 30.44);
            o._tempo = (a ? a + (a === 1 ? ' ano ' : ' anos ') : '') + m + (m === 1 ? ' mês' : ' meses');
            o._tempoDias = dias;
          }
        }
        break;
      }
      case 'acidentes': {
        if (r.afastamento === 'Sim' && r.data) {
          const fim = r.retorno || hoje;
          o._diasPerdidos = Math.max(0, (D.diff(r.data, fim) || 0) - (r.retorno ? 1 : 0));
          if (!r.retorno) o._afastado = true;
        } else o._diasPerdidos = 0;
        break;
      }
      case 'treinamentos': case 'aso': case 'documentos': case 'epis': {
        let venc = '';
        if (mod === 'treinamentos') venc = this.vencTreino(r);
        else if (mod === 'aso') venc = r.atualizado === 'Sim' ? '' : this.vencASO(r);
        else if (mod === 'documentos') {
          const base = r.dataRevisao || r.data, m = toNum(r.validadeMeses);
          venc = (r.controlar !== 'Não' && base && m) ? D.addMonths(base, m) : '';
        } else venc = r.controlar !== 'Não' ? (r.vencCA || '') : '';
        o._venc = venc;
        if (mod === 'aso' && r.atualizado === 'Sim') o._venc = this.vencASO(r);
        const s = this.situacao(venc); o._statusVenc = s.s; o._diasVenc = s.dias;
        if (mod === 'aso' && r.atualizado === 'Sim') o._statusVenc = 'SUBSTITUÍDO';
        if (mod === 'treinamentos' || mod === 'dds') o._qtd = (r.participantes || []).length;
        if (mod === 'epis') {
          const mv = this.indices().mov.get(r.id) || { ent: 0, sai: 0 };
          o._entradas = mv.ent; o._saidas = mv.sai;
          o._estoque = (toNum(r.saldoInicial) || 0) + mv.ent - mv.sai;
          const mi = toNum(r.minimo), ma = toNum(r.maximo);
          if (o._estoque <= 0) o._statusEstoque = 'SEM ESTOQUE';
          else if (mi != null && o._estoque < mi) o._statusEstoque = 'ABAIXO';
          else if (ma != null && ma > 0 && o._estoque > ma) o._statusEstoque = 'ACIMA';
          else o._statusEstoque = 'ÓTIMO';
          const p = toNum(r.preco);
          o._valor = p != null && o._estoque > 0 ? p * o._estoque : 0;
        }
        break;
      }
      case 'dds': o._qtd = (r.participantes || []).length; break;
      case 'advertencias': case 'oss': {
        const c = this.colab(r.colab);
        o._setor = c ? c.setor || '' : ''; o._funcao = c ? c.funcao || '' : '';
        break;
      }
      case 'movepi': {
        o._quem = r.destino === 'Fornecedor' ? (r.fornecedor || 'Fornecedor') : this.nomeColab(r.colab);
        const e = this.epi(r.epi);
        const p = toNum(r.preco) != null ? toNum(r.preco) : (e ? toNum(e.preco) : null);
        o._preco = p;
        o._total = p != null ? p * (Number(r.qtd) || 0) : null;
        break;
      }
      case 'auditorias': {
        const a = toNum(r.ncEncontradas), b = toNum(r.ncResolvidas);
        o._perc = a ? Math.min(100, Math.round((b || 0) * 100 / a)) : (a === 0 ? 100 : null);
        break;
      }
      case 'desvios': {
        if (r.conclusao) o._statusAcao = 'CONCLUÍDO';
        else if (r.prazo && r.prazo < hoje) o._statusAcao = 'ATRASADO';
        else o._statusAcao = 'EM ABERTO';
        break;
      }
      case 'planos': {
        if (r.status === 'REALIZADO') o._prazoStatus = 'CONCLUÍDO';
        else if (r.status === 'CANCELADO') o._prazoStatus = 'CANCELADO';
        else if (!r.prazo) o._prazoStatus = 'SEM PRAZO';
        else {
          const d = D.diff(hoje, r.prazo);
          o._prazoStatus = d < 0 ? 'ATRASADO' : (d <= Number(Config.params.aVencerDias || 30) ? 'PRÓXIMO' : 'NO PRAZO');
        }
        break;
      }
      case 'riscos': {
        const p = toNum(r.prob), s = toNum(r.sev);
        o._nivel = p && s ? p * s : null;
        o._classe = Config.classeRisco(o._nivel);
        break;
      }
      case 'extintores': {
        const m = toNum(r.validadeMeses) || toNum(Config.params.validadeRecargaExt) || 12;
        o._proxRecarga = r.recarga ? D.addMonths(r.recarga, m) : '';
        o._statusRecarga = this.situacao(o._proxRecarga).s;
        o._proxTH = r.th ? D.addMonths(r.th, toNum(Config.params.validadeTHExt) || 60) : '';
        o._statusTH = this.situacao(o._proxTH).s;
        break;
      }
      case 'hidrantes': {
        const m = toNum(r.validadeMeses) || toNum(Config.params.validadeTHHid) || 12;
        o._prox = r.th ? D.addMonths(r.th, m) : '';
        o._status = this.situacao(o._prox).s;
        o._naoConf = ['lacre', 'mangueira', 'esguicho', 'tampao', 'chave', 'sinalizacao'].filter((k) => r[k] === 'Não conforme').length;
        break;
      }
      case 'equipamentos': o._ultimaManut = this.indices().ultimaManut.get(r.id) || ''; break;
      case 'cipa': {
        if (r.posse) {
          o._fimMandato = D.addDays(D.addMonths(r.posse, 12), -1);
          o._statusMandato = hoje <= o._fimMandato ? 'VIGENTE' : 'ENCERRADO';
          if (String(r.representa || '').startsWith('Empregados')) {
            o._fimEstab = D.addMonths(o._fimMandato, 12);
            o._statusEstab = hoje <= o._fimEstab ? 'ESTÁVEL' : 'ENCERRADA';
          } else { o._fimEstab = ''; o._statusEstab = 'NÃO SE APLICA'; }
        }
        break;
      }
    }
    return o;
  },

  /** Valor bruto (para ordenar e filtrar) */
  get(mod, r, k) {
    if (k.startsWith('_')) {
      if (!r.__d || r.__v !== App.versao) { r.__d = this.derivar(mod, r); r.__v = App.versao; }
      return r.__d[k];
    }
    const c = campoDe(mod, k);
    if (c && c.t === 'colab') return this.nomeColab(r[k]);
    if (c && c.t === 'epi') return this.nomeEpi(r[k]);
    if (c && c.t === 'equip') return this.nomeEquip(r[k]);
    return r[k];
  },

  /** Texto para exibir e exportar */
  texto(mod, r, k) {
    const v = this.get(mod, r, k);
    if (v == null || v === '') return '';
    const c = k.startsWith('_') ? null : campoDe(mod, k);
    const tipo = c ? c.t : (['_venc', '_proxRecarga', '_proxTH', '_prox', '_fimMandato', '_fimEstab', '_ultimaManut'].includes(k) ? 'date' : '');
    if (tipo === 'date') return D.br(v);
    if ((c && c.t === 'money') || ['_valor', '_total'].includes(k)) return fmtMoney(v);
    if (k === '_perc') return v + '%';
    if (k === '_mes') return D.mesesLongos[v - 1] || v;
    if (Array.isArray(v)) {
      if (c && c.t === 'multicolab') return v.map((id) => this.nomeColab(id)).filter(Boolean).join(', ');
      return v.join(', ');
    }
    return String(v);
  },

  /** Classe visual (badge) de um status */
  classe(v) {
    const s = norm(v);
    const mapa = {
      'vencido': 'critical', 'a vencer': 'warning', 'valido': 'good', 'substituido': 'neutral',
      'sem estoque': 'critical', 'abaixo': 'warning', 'otimo': 'good', 'acima': 'neutral',
      'atrasado': 'critical', 'em aberto': 'warning', 'concluido': 'good', 'proximo': 'warning', 'no prazo': 'good',
      'sem prazo': 'neutral', 'cancelado': 'neutral', 'realizado': 'good', 'agendado': 'neutral', 'em andamento': 'warning',
      'trivial': 'good', 'baixo': 'good', 'moderado': 'warning', 'alto': 'serious', 'extremo': 'critical',
      'vigente': 'good', 'encerrado': 'neutral', 'estavel': 'warning', 'encerrada': 'neutral', 'nao se aplica': 'neutral',
      'apto': 'good', 'nao apto': 'critical', 'conforme': 'good', 'nao conforme': 'critical'
    };
    return mapa[s] || '';
  },

  html(mod, r, k) {
    const t = this.texto(mod, r, k);
    if (t === '') return '';
    const cls = (k.startsWith('_') || ['status', 'resultado', 'prioridade'].includes(k)) ? this.classe(t) : '';
    if (cls) {
      let extra = '';
      const dias = r.__d && r.__d._diasVenc;
      if (k === '_statusVenc' && dias != null && (t === 'A VENCER' || t === 'VENCIDO')) {
        extra = t === 'VENCIDO' ? ' há ' + Math.abs(dias) + ' d' : ' em ' + dias + ' d';
      }
      return '<span class="badge b-' + cls + '">' + esc(t + extra) + '</span>';
    }
    if (k === '_estoque' && Number(this.get(mod, r, k)) < 0) {
      return '<span class="badge b-critical" title="Saídas maiores que entradas + saldo inicial">' + esc(t) + '</span>';
    }
    if (k === '_diasPerdidos' && r.__d && r.__d._afastado) return esc(t) + ' <span class="muted small">(afastado)</span>';
    if (t.length > 120) return esc(t.slice(0, 117)) + '…';
    return esc(t);
  },

  ehNumero(mod, k) {
    if (['_idade', '_diasPerdidos', '_qtd', '_entradas', '_saidas', '_estoque', '_valor', '_total', '_perc', '_nivel', '_naoConf'].includes(k)) return true;
    const c = campoDe(mod, k);
    return !!(c && (c.t === 'num' || c.t === 'money'));
  },

  /* ---------------- Pendências consolidadas ---------------- */
  pendencias() {
    const P = [];
    const lim = Number(Config.params.aVencerDias || 30);
    const ativo = (id) => { const c = this.colab(id); return !c || norm(c.status) !== 'demitido'; };
    const add = (area, desc, quem, venc, s, mod, id) => P.push({ area, desc, quem, venc, s, mod, id });

    // ASO: só o mais recente de cada colaborador
    const ultimoAso = new Map();
    (App.data.aso || []).forEach((a) => {
      if (!a.colab || !a.data || a.tipo === 'Demissional') return;
      const u = ultimoAso.get(a.colab);
      if (!u || a.data > u.data) ultimoAso.set(a.colab, a);
    });
    ultimoAso.forEach((a) => {
      if (a.atualizado === 'Sim' || !ativo(a.colab)) return;
      const v = this.vencASO(a); const s = this.situacao(v);
      if (s.s === 'VENCIDO' || s.s === 'A VENCER') add('ASO', 'ASO ' + (a.tipo || '').toLowerCase(), this.nomeColab(a.colab), v, s, 'aso', a.id);
    });

    // Treinamentos: validade por participante, considerando o mais recente de cada curso
    const ult = new Map();
    (App.data.treinamentos || []).forEach((t) => {
      const v = this.vencTreino(t); if (!v) return;
      (t.participantes || []).forEach((cid) => {
        const key = cid + '|' + norm(t.treinamento) + '|' + norm(t.norma);
        const u = ult.get(key);
        if (!u || v > u.v) ult.set(key, { v, t, cid });
      });
    });
    ult.forEach(({ v, t, cid }) => {
      if (!ativo(cid)) return;
      const s = this.situacao(v);
      if (s.s === 'VENCIDO' || s.s === 'A VENCER') add('Treinamento', t.treinamento + (t.norma ? ' (' + t.norma + ')' : ''), this.nomeColab(cid), v, s, 'treinamentos', t.id);
    });

    (App.data.epis || []).forEach((e) => {
      const d = this.derivar('epis', e);
      if (d._statusVenc === 'VENCIDO' || d._statusVenc === 'A VENCER') add('CA de EPI', 'CA ' + (e.ca || '') + ' — ' + e.descricao, e.fabricante || '', d._venc, this.situacao(d._venc), 'epis', e.id);
      if ((d._statusEstoque === 'SEM ESTOQUE' || d._statusEstoque === 'ABAIXO') && (toNum(e.minimo) != null)) {
        add('Estoque de EPI', e.descricao + ' — estoque ' + d._estoque + ' (mínimo ' + e.minimo + ')', e.fabricante || '', '', { s: d._statusEstoque, dias: null }, 'epis', e.id);
      }
    });
    (App.data.documentos || []).forEach((r) => {
      const d = this.derivar('documentos', r);
      if (d._statusVenc === 'VENCIDO' || d._statusVenc === 'A VENCER') add('Documento', r.nome, r.responsavel || r.area || '', d._venc, this.situacao(d._venc), 'documentos', r.id);
    });
    (App.data.extintores || []).forEach((r) => {
      const d = this.derivar('extintores', r);
      if (['VENCIDO', 'A VENCER'].includes(d._statusRecarga)) add('Extintor', 'Recarga do extintor nº ' + r.numero + ' (' + (r.tipo || '') + ')', r.local || '', d._proxRecarga, this.situacao(d._proxRecarga), 'extintores', r.id);
      if (['VENCIDO', 'A VENCER'].includes(d._statusTH)) add('Extintor', 'Teste hidrostático do extintor nº ' + r.numero, r.local || '', d._proxTH, this.situacao(d._proxTH), 'extintores', r.id);
    });
    (App.data.hidrantes || []).forEach((r) => {
      const d = this.derivar('hidrantes', r);
      if (['VENCIDO', 'A VENCER'].includes(d._status)) add('Hidrante', 'Teste do hidrante nº ' + r.numero, r.local || '', d._prox, this.situacao(d._prox), 'hidrantes', r.id);
      if (d._naoConf) add('Hidrante', 'Hidrante nº ' + r.numero + ': ' + d._naoConf + ' item(ns) não conforme(s)', r.local || '', '', { s: 'NÃO CONFORME', dias: null }, 'hidrantes', r.id);
    });
    // CIPA: avisa com antecedência de 75 dias para dar tempo ao processo eleitoral (60 dias)
    const fins = new Map();
    (App.data.cipa || []).forEach((r) => {
      if (r.controlar === 'Não' || !r.posse) return;
      const d = this.derivar('cipa', r);
      const dias = D.diff(D.today(), d._fimMandato);
      if (dias >= -30 && dias <= 75) fins.set(d._fimMandato, r);
    });
    fins.forEach((r, fim) => {
      const dias = D.diff(D.today(), fim);
      add('CIPA', 'Término do mandato da CIPA ' + (r.gestao || '') + ' — iniciar o processo eleitoral', '', fim, { s: dias < 0 ? 'VENCIDO' : 'A VENCER', dias }, 'cipa', r.id);
    });
    (App.data.desvios || []).forEach((r) => {
      if (this.derivar('desvios', r)._statusAcao === 'ATRASADO') add('Desvio', (r.classe || 'Desvio') + ': ' + String(r.descricao || '').slice(0, 80), r.responsavel || r.setor || '', r.prazo, this.situacao(r.prazo), 'desvios', r.id);
    });
    (App.data.planos || []).forEach((r) => {
      const st = this.derivar('planos', r)._prazoStatus;
      if (st === 'ATRASADO' || st === 'PRÓXIMO') add('Plano 5W2H', r.nome, r.quem || '', r.prazo, this.situacao(r.prazo), 'planos', r.id);
    });
    (App.data.manutencoes || []).forEach((r) => {
      if (r.status === 'Agendada' && r.data && D.diff(D.today(), r.data) <= lim) add('Manutenção', (r.tipo || 'Manutenção') + ' — ' + this.nomeEquip(r.equip), r.responsavel || '', r.data, this.situacao(r.data), 'manutencoes', r.id);
    });
    P.sort((a, b) => (a.venc || '9999') < (b.venc || '9999') ? -1 : 1);
    return P;
  }
};
