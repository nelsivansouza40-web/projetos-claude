/*
 * Tela de lista de cada módulo: busca, filtros, ordenação, exportação CSV
 * e impressão da lista. Clique numa linha para editar.
 */
const Lista = {
  estado: {},

  st(mod) {
    if (!this.estado[mod]) this.estado[mod] = { q: '', f: {}, ord: null, dir: 1, lim: 300 };
    return this.estado[mod];
  },

  linhas(mod) {
    const st = this.st(mod);
    const m = MOD[mod];
    const q = norm(st.q);
    let rs = (App.data[mod] || []).filter((r) => {
      for (const k in st.f) {
        if (st.f[k] === '') continue;
        if (String(Calc.get(mod, r, k) ?? '') !== st.f[k]) return false;
      }
      if (!q) return true;
      const txt = m.campos.map((c) => Calc.texto(mod, r, c.k)).join(' ');
      return norm(txt).includes(q);
    });
    const ord = st.ord || this.ordemPadrao(mod);
    const num = Calc.ehNumero(mod, ord);
    rs.sort((a, b) => {
      let x = Calc.get(mod, a, ord), y = Calc.get(mod, b, ord);
      if (num) { x = toNum(x); y = toNum(y); x = x == null ? -Infinity : x; y = y == null ? -Infinity : y; return (x - y) * st.dir; }
      x = x == null ? '' : String(x); y = y == null ? '' : String(y);
      return x.localeCompare(y, 'pt-BR', { numeric: true }) * st.dir;
    });
    return rs;
  },

  ordemPadrao(mod) {
    const st = this.st(mod);
    const m = MOD[mod];
    const temData = m.campos.some((c) => c.k === 'data');
    if (!st.ord) { st.ord = temData ? 'data' : m.colunas[0]; st.dir = temData ? -1 : 1; }
    return st.ord;
  },

  render(mod) {
    const m = MOD[mod];
    const st = this.st(mod);
    this.ordemPadrao(mod);
    const main = $('#main');
    const total = (App.data[mod] || []).length;
    main.innerHTML = '';
    const head = h('<div class="page-head"><div><h1>' + esc(m.nome) + '</h1><p>' + fmtInt(total) + ' registro(s)</p></div><div class="toolbar"></div></div>');
    const tb = $('.toolbar', head);
    tb.appendChild(button('+ ' + novoRotulo(m), 'btn-primary', () => Forms.abrir(mod)));
    tb.appendChild(button('Exportar CSV', '', () => this.exportarCSV(mod)));
    tb.appendChild(button('Imprimir lista', '', () => Reports.imprimirLista(mod, this.linhas(mod))));
    if (mod === 'movepi' || mod === 'colaboradores') tb.appendChild(button('Ficha de EPI', '', () => App.ir('fichaepi')));
    main.appendChild(head);

    // filtros
    const filtros = h('<div class="filters"><input type="search" placeholder="Buscar em todos os campos" value="' + esc(st.q) + '" aria-label="Buscar"></div>');
    const inpBusca = $('input', filtros);
    let t;
    inpBusca.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { st.q = inpBusca.value; st.lim = 300; this.tabela(mod); }, 200); });
    (m.filtros || []).forEach((k) => {
      const valores = new Set();
      (App.data[mod] || []).forEach((r) => { const v = Calc.get(mod, r, k); if (v != null && v !== '') valores.add(String(v)); });
      if (!valores.size) return;
      const ops = Array.from(valores).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
      const s = h('<select aria-label="' + esc(rotulo(mod, k)) + '"><option value="">' + esc(rotulo(mod, k)) + ': todos</option>' +
        ops.map((o) => '<option value="' + esc(o) + '"' + (st.f[k] === o ? ' selected' : '') + '>' + esc(k === '_mes' ? D.mesesLongos[o - 1] : o) + '</option>').join('') + '</select>');
      s.addEventListener('change', () => { st.f[k] = s.value; st.lim = 300; this.tabela(mod); });
      filtros.appendChild(s);
    });
    if (Object.values(st.f).some(Boolean) || st.q) {
      filtros.appendChild(button('Limpar filtros', 'btn-sm btn-ghost', () => { st.f = {}; st.q = ''; this.render(mod); }));
    }
    main.appendChild(filtros);
    if (m.ajuda) main.appendChild(h('<div class="notice">' + esc(m.ajuda) + '</div>'));
    main.appendChild(h('<div id="lista-tabela"></div>'));
    this.tabela(mod);
  },

  tabela(mod) {
    const m = MOD[mod];
    const st = this.st(mod);
    const rs = this.linhas(mod);
    const alvo = $('#lista-tabela');
    if (!alvo) return;
    if (!rs.length) {
      alvo.innerHTML = '<div class="card empty">' + ((App.data[mod] || []).length ? 'Nenhum registro encontrado com esses filtros.' : 'Nenhum registro ainda. Use o botão "' + esc(novoRotulo(m)) + '" ou importe a sua planilha em Configurações.') + '</div>';
      return;
    }
    const cols = m.colunas;
    const vis = rs.slice(0, st.lim);
    let html = '<div class="table-wrap"><table class="data"><thead><tr>' +
      cols.map((k) => '<th data-k="' + k + '"' + (Calc.ehNumero(mod, k) ? ' class="num"' : '') + ' aria-sort="' + (st.ord === k ? (st.dir > 0 ? 'ascending' : 'descending') : 'none') + '">' +
        esc(rotulo(mod, k)) + (st.ord === k ? (st.dir > 0 ? ' ▲' : ' ▼') : '') + '</th>').join('') + '</tr></thead><tbody>';
    vis.forEach((r) => {
      html += '<tr data-id="' + r.id + '" style="cursor:pointer">' + cols.map((k) => '<td' + (Calc.ehNumero(mod, k) ? ' class="num"' : '') + '>' + Calc.html(mod, r, k) + '</td>').join('') + '</tr>';
    });
    html += '</tbody></table></div>';
    if (rs.length > vis.length) html += '<p class="small muted">Mostrando ' + vis.length + ' de ' + rs.length + '. <button type="button" class="btn btn-sm" id="mais">Mostrar mais</button></p>';
    else html += '<p class="small muted">' + rs.length + ' registro(s) na lista.</p>';
    alvo.innerHTML = html;
    $$('th[data-k]', alvo).forEach((th) => th.addEventListener('click', () => {
      const k = th.dataset.k;
      if (st.ord === k) st.dir = -st.dir; else { st.ord = k; st.dir = 1; }
      this.tabela(mod);
    }));
    $$('tbody tr', alvo).forEach((tr) => tr.addEventListener('click', () => {
      const r = (App.data[mod] || []).find((x) => x.id === tr.dataset.id);
      if (r) Forms.abrir(mod, r);
    }));
    const mais = $('#mais', alvo);
    if (mais) mais.addEventListener('click', () => { st.lim += 500; this.tabela(mod); });
  },

  exportarCSV(mod) {
    const m = MOD[mod];
    const rs = this.linhas(mod);
    const cols = m.campos.map((c) => c.k).concat(m.colunas.filter((k) => k.startsWith('_')));
    const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const linhas = [cols.map((k) => q(rotulo(mod, k))).join(';')];
    rs.forEach((r) => linhas.push(cols.map((k) => {
      const v = Calc.get(mod, r, k);
      if (Calc.ehNumero(mod, k) && v !== '' && v != null && !isNaN(v)) return q(String(v).replace('.', ','));
      return q(Calc.texto(mod, r, k));
    }).join(';')));
    download(slugArquivo(App.emp.nome) + '-' + mod + '-' + D.today() + '.csv', '﻿' + linhas.join('\r\n'), 'text/csv;charset=utf-8');
  }
};
