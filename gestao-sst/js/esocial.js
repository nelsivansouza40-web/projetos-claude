/*
 * Dados prontos para os eventos de SST do eSocial: S-2210 (CAT), S-2220 (ASO)
 * e S-2240 (condições ambientais do trabalho).
 *
 * O sistema NÃO transmite ao eSocial (isso exige certificado digital e o
 * sistema de folha). Ele reúne os campos de cada evento num relatório e num
 * CSV para o setor de folha conferir e enviar, e aponta o que falta preencher.
 * Códigos usados: tpAcid (1 típico, 2 doença, 3 trajeto), tpExameOcup
 * (0 admissional, 1 periódico, 2 retorno, 3 mudança de risco, 4 monitoração
 * pontual, 9 demissional) e resAso (1 apto, 2 inapto). Confira sempre com o
 * leiaute vigente do eSocial.
 */
const ESocial = {
  evento: 'S-2210',
  de: '',
  ate: '',

  cpfValido(cpf) {
    const d = String(cpf || '').replace(/\D/g, '');
    if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
    const dv = (n) => { let s = 0; for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
    return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
  },
  faltasColab(c) {
    const f = [];
    if (!c) return ['Colaborador não encontrado'];
    if (!c.cpf) f.push('CPF em branco'); else if (!this.cpfValido(c.cpf)) f.push('CPF inválido');
    if (!c.matricula) f.push('Matrícula em branco');
    return f;
  },
  noPeriodo(d) { return !!d && (!this.de || d >= this.de) && (!this.ate || d <= this.ate); },

  tpAcid(tipo) { const m = /^\s*(\d)/.exec(tipo || ''); if (m) return m[1]; const t = norm(tipo); return t.includes('traj') ? '3' : t.includes('doenc') ? '2' : t ? '1' : ''; },
  tpExame(tipo) {
    const t = norm(tipo);
    if (t.includes('admiss')) return '0';
    if (t.includes('period')) return '1';
    if (t.includes('retorno')) return '2';
    if (t.includes('mudanca')) return '3';
    if (t.includes('monitora')) return '4';
    if (t.includes('demiss')) return '9';
    return '';
  },

  /** Linhas do evento escolhido: { cab: [...], linhas: [[...]], faltas: n } */
  dados() {
    const C = (id) => Calc.colab(id);
    const base = (c) => [c ? c.cpf || '' : '', c ? c.matricula || '' : '', c ? c.nome : ''];
    if (this.evento === 'S-2210') {
      const L = (App.data.acidentes || []).filter((a) => this.noPeriodo(a.data) && a.cat !== 'Não').sort((a, b) => a.data.localeCompare(b.data));
      return {
        cab: ['CPF', 'Matrícula', 'Nome', 'Data do acidente', 'Hora', 'Tipo (tpAcid)', 'Houve afastamento', 'Óbito', 'Parte do corpo', 'Agente causador', 'Natureza da lesão', 'Local', 'Descrição', 'O que falta'],
        linhas: L.map((a) => {
          const c = C(a.colab);
          const f = this.faltasColab(c);
          if (!a.hora) f.push('Hora do acidente');
          if (!a.parte) f.push('Parte do corpo');
          if (!a.agente) f.push('Agente causador');
          if (!a.dano) f.push('Natureza da lesão');
          f.push('Códigos das tabelas 13, 14, 15 e 17 no sistema de folha');
          return base(c).concat([D.br(a.data), a.hora || '', this.tpAcid(a.tipo) + (a.tipo ? ' (' + String(a.tipo).replace(/^\d\s*-\s*/, '') + ')' : ''),
            a.afastamento === 'Sim' ? 'S' : 'N', norm(a.gravidade) === 'fatal' ? 'S' : 'N', a.parte || '', a.agente || '', a.dano || '', a.local || '', a.detalhes || '', f.join('; ')]);
        })
      };
    }
    if (this.evento === 'S-2220') {
      const L = (App.data.aso || []).filter((a) => this.noPeriodo(a.data)).sort((a, b) => a.data.localeCompare(b.data));
      return {
        cab: ['CPF', 'Matrícula', 'Nome', 'Tipo do exame (tpExameOcup)', 'Data do ASO', 'Resultado (resAso)', 'Médico', 'CRM', 'Exames realizados', 'O que falta'],
        linhas: L.map((a) => {
          const c = C(a.colab);
          const f = this.faltasColab(c);
          const tp = this.tpExame(a.tipo);
          if (!tp) f.push('Tipo do exame');
          if (!a.resultado) f.push('Resultado');
          if (!a.medico) f.push('Médico');
          if (!a.crm) f.push('CRM');
          if (!a.exames) f.push('Exames realizados');
          f.push('Código de cada exame na Tabela 27 no sistema de folha');
          return base(c).concat([tp + (a.tipo ? ' (' + a.tipo + ')' : ''), D.br(a.data), a.resultado === 'Apto' ? '1 (Apto)' : a.resultado ? '2 (Inapto)' : '',
            String(a.medico || '').replace(/\s*[—-]\s*CRM.*$/i, ''), a.crm || '', a.exames || '', f.join('; ')]);
        })
      };
    }
    // S-2240: situação atual de cada colaborador ativo
    const ativos = Matriz.ativos().sort((a, b) => a.nome.localeCompare(b.nome));
    return {
      cab: ['CPF', 'Matrícula', 'Nome', 'Setor', 'Função', 'Início da condição', 'Atividades', 'Agentes / riscos', 'EPIs entregues (CA)', 'O que falta'],
      linhas: ativos.map((c) => {
        const f = this.faltasColab(c);
        const at = (App.data.atividades || []).find((a) => norm(a.funcao) === norm(c.funcao));
        const riscos = (App.data.riscos || []).filter((r) => (r.funcao && norm(r.funcao) === norm(c.funcao)) || (!r.funcao && r.setor && norm(r.setor) === norm(c.setor)));
        const epis = new Map();
        (App.data.movepi || []).filter((m) => m.colab === c.id && Calc.entregaColab(m)).forEach((m) => { const e = Calc.epi(m.epi); if (e && e.categoria !== 'Uniforme') epis.set(e.id, e.descricao + (e.ca ? ' (CA ' + e.ca + ')' : '')); });
        if (!c.admissao) f.push('Data de admissão');
        if (!at) f.push('Atividades da função');
        if (!riscos.length) f.push('Riscos da função ou do setor');
        f.push('Código do agente na Tabela 24 no sistema de folha (sem agente nocivo: 09.01.001)');
        return [c.cpf || '', c.matricula || '', c.nome, c.setor || '', c.funcao || '', D.br(c.admissao), at ? at.atividades || '' : '',
          riscos.map((r) => (r.tipo ? r.tipo + ': ' : '') + r.descricao).join('; '), [...epis.values()].join('; '), f.join('; ')];
      })
    };
  },

  pagina() {
    if (!this.de) { const h0 = D.today(); this.de = h0.slice(0, 8) + '01'; this.ate = h0; }
    const main = $('#main');
    main.innerHTML = '';
    const head = h('<div class="page-head"><div><h1>Dados para o eSocial SST</h1><p>Campos dos eventos S-2210, S-2220 e S-2240 reunidos para o setor de folha conferir e enviar.</p></div><div class="toolbar"></div></div>');
    const nomes = { 'S-2210': 'S-2210 — Comunicação de acidente de trabalho (CAT)', 'S-2220': 'S-2220 — Monitoramento da saúde (ASO)', 'S-2240': 'S-2240 — Condições ambientais do trabalho' };
    const d = this.dados();
    $('.toolbar', head).append(
      button('Exportar CSV', '', () => {
        const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
        const lin = [d.cab.map(q).join(';')].concat(d.linhas.map((l) => l.map(q).join(';')));
        download(slugArquivo(App.emp.nome) + '-esocial-' + this.evento + '-' + D.today() + '.csv', '﻿' + lin.join('\r\n'), 'text/csv;charset=utf-8');
      }),
      button('Imprimir', 'btn-primary', () => Reports.imprimir('<style>@page { size: A4 landscape; margin: 8mm; }</style>' + Reports.cabecalho('DADOS PARA O ESOCIAL — ' + nomes[this.evento]) +
        '<table><thead><tr>' + d.cab.map((c) => '<th>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>' + d.linhas.map((l) => '<tr>' + l.map((v) => '<td>' + esc(v) + '</td>').join('') + '</tr>').join('') + '</tbody></table>')));
    main.appendChild(head);
    main.appendChild(h('<div class="notice">O sistema <b>não envia</b> ao eSocial: o envio exige certificado digital e é feito pelo sistema de folha ou por um prestador. Aqui ficam os dados conferidos, com a coluna "O que falta" para corrigir antes de enviar. Os códigos das tabelas do eSocial (parte do corpo, agente causador, exames, agentes nocivos) devem ser escolhidos no sistema que transmite.</div>'));
    const f = h('<div class="filters"><select aria-label="Evento">' + Object.entries(nomes).map(([k, l]) => '<option value="' + k + '"' + (k === this.evento ? ' selected' : '') + '>' + esc(l) + '</option>').join('') + '</select>' +
      (this.evento !== 'S-2240' ? '<label class="small">De <input type="date" data-de value="' + esc(this.de) + '"></label><label class="small">Até <input type="date" data-ate value="' + esc(this.ate) + '"></label>' : '<span class="small muted">Situação atual dos colaboradores ativos</span>') + '</div>');
    $('select', f).addEventListener('change', (e) => { this.evento = e.target.value; this.pagina(); });
    const de = $('[data-de]', f), ate = $('[data-ate]', f);
    if (de) de.addEventListener('change', () => { this.de = de.value; this.pagina(); });
    if (ate) ate.addEventListener('change', () => { this.ate = ate.value; this.pagina(); });
    main.appendChild(f);
    const comFalta = d.linhas.filter((l) => /CPF|Matrícula|Hora|Parte|Agente|Natureza|Tipo|Resultado|Médico|CRM|Exames realizados|admissão|Atividades|Riscos/.test(l[l.length - 1])).length;
    main.appendChild(h('<div class="tiles">' + Paineis.tile('Registros', fmtInt(d.linhas.length), this.evento === 'S-2240' ? 'colaboradores ativos' : 'no período', 'hero') +
      Paineis.tile('Com dados a corrigir', fmtInt(comFalta), 'além dos códigos das tabelas') + '</div>'));
    main.appendChild(h('<div class="card">' + (d.linhas.length ? '<div class="table-wrap"><table class="data esocial"><thead><tr>' + d.cab.map((c) => '<th>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>' +
      d.linhas.map((l) => '<tr>' + l.map((v, i) => '<td' + (i === l.length - 1 ? ' class="small muted"' : '') + '>' + esc(v) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>'
      : '<div class="empty">Nenhum registro neste período.</div>') + '</div>'));
  }
};
