/*
 * Importação da planilha "Gestão SST" (.xlsx) direto no navegador, sem internet
 * e sem bibliotecas externas: o arquivo .xlsx é um ZIP com XMLs; aqui ele é
 * aberto com DecompressionStream e lido com DOMParser.
 * Lê os valores já calculados das células (não as fórmulas).
 */
const Xlsx = {
  async unzip(buf) {
    const dv = new DataView(buf);
    let i = buf.byteLength - 22;
    while (i >= 0 && dv.getUint32(i, true) !== 0x06054b50) i--;
    if (i < 0) throw new Error('O arquivo não é um .xlsx válido.');
    const total = dv.getUint16(i + 10, true);
    let p = dv.getUint32(i + 16, true);
    const dec = new TextDecoder('utf-8');
    const arq = {};
    for (let n = 0; n < total; n++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const metodo = dv.getUint16(p + 10, true);
      const csize = dv.getUint32(p + 20, true);
      const nlen = dv.getUint16(p + 28, true), elen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
      const lho = dv.getUint32(p + 42, true);
      const nome = dec.decode(new Uint8Array(buf, p + 46, nlen));
      arq[nome] = { metodo, csize, lho };
      p += 46 + nlen + elen + clen;
    }
    return {
      nomes: Object.keys(arq),
      async texto(nome) {
        const f = arq[nome];
        if (!f) return null;
        const ini = f.lho + 30 + dv.getUint16(f.lho + 26, true) + dv.getUint16(f.lho + 28, true);
        const dados = new Uint8Array(buf, ini, f.csize);
        if (f.metodo === 0) return dec.decode(dados);
        if (f.metodo !== 8) throw new Error('Compressão não suportada em ' + nome);
        if (typeof DecompressionStream === 'undefined') throw new Error('Navegador sem suporte à leitura de .xlsx. Use Chrome, Edge ou Firefox atualizados.');
        const ds = new Blob([dados]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        return new Response(ds).text();
      }
    };
  },

  xml(txt) { return new DOMParser().parseFromString(txt, 'application/xml'); },

  colNum(ref) {
    let n = 0;
    for (const ch of ref) { const c = ch.charCodeAt(0); if (c < 65 || c > 90) break; n = n * 26 + (c - 64); }
    return n;
  },

  async abrir(buf) {
    const z = await this.unzip(buf);
    const wb = this.xml(await z.texto('xl/workbook.xml'));
    const rels = this.xml(await z.texto('xl/_rels/workbook.xml.rels'));
    const alvo = {};
    Array.from(rels.getElementsByTagName('Relationship')).forEach((r) => { alvo[r.getAttribute('Id')] = r.getAttribute('Target'); });
    const abas = {};
    Array.from(wb.getElementsByTagName('sheet')).forEach((s) => {
      const rid = s.getAttribute('r:id') || s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
      let t = alvo[rid] || '';
      t = t.startsWith('/') ? t.slice(1) : 'xl/' + t.replace(/^\.\//, '');
      abas[s.getAttribute('name')] = t;
    });
    const ss = [];
    const sst = await z.texto('xl/sharedStrings.xml');
    if (sst) {
      Array.from(this.xml(sst).getElementsByTagName('si')).forEach((si) => {
        ss.push(Array.from(si.getElementsByTagName('t')).filter((t) => t.parentNode === si || t.parentNode.nodeName.endsWith('r')).map((t) => t.textContent).join(''));
      });
    }
    const self = this;
    return {
      abas: Object.keys(abas),
      /** Linhas da aba como mapas {coluna: valor}; f = coluna tem fórmula */
      async linhas(nome) {
        const path = abas[nome];
        if (!path) return null;
        const doc = self.xml(await z.texto(path));
        const out = new Map();
        Array.from(doc.getElementsByTagName('row')).forEach((row) => {
          const rn = Number(row.getAttribute('r'));
          const cel = {};
          let tem = false;
          Array.from(row.getElementsByTagName('c')).forEach((c) => {
            const t = c.getAttribute('t');
            const vEl = c.getElementsByTagName('v')[0];
            let v = null;
            if (t === 'inlineStr') { const is = c.getElementsByTagName('t'); v = Array.from(is).map((x) => x.textContent).join(''); }
            else if (vEl) {
              const raw = vEl.textContent;
              if (t === 's') v = ss[Number(raw)];
              else if (t === 'str') v = raw;
              else if (t === 'b') v = raw === '1';
              else if (t === 'e') v = null;
              else v = raw === '' ? null : Number(raw);
            }
            if (v !== null && v !== '') { cel[self.colNum(c.getAttribute('r'))] = v; tem = true; }
          });
          if (tem) out.set(rn, cel);
        });
        return out;
      }
    };
  }
};

const Importador = {
  /** Encontra a aba do módulo (nome exato ou parecido). */
  achaAba(abas, nome) {
    return abas.find((a) => a === nome) || abas.find((a) => norm(a) === norm(nome)) || null;
  },

  cabecalho(linhas, campos) {
    let melhor = null, pts = 0;
    for (const [rn, cel] of linhas) {
      if (rn > 15) break;
      const mapa = {};
      let n = 0;
      Object.entries(cel).forEach(([col, v]) => {
        const c = campos.find((f) => f.x && norm(f.x) === norm(v));
        if (c && !Object.values(mapa).includes(c)) { mapa[col] = c; n++; }
      });
      if (n > pts) { pts = n; melhor = { rn, mapa }; }
    }
    return pts >= 2 ? melhor : null;
  },

  async analisar(file) {
    const buf = await lerArquivo(file, 'buffer');
    const wb = await Xlsx.abrir(buf);
    const res = { wb, mods: {}, empresa: null, listas: {} };
    for (const m of MODULOS) {
      const aba = this.achaAba(wb.abas, m.aba);
      if (!aba) continue;
      const linhas = await wb.linhas(aba);
      const cab = this.cabecalho(linhas, m.campos);
      if (!cab) continue;
      const chave = m.campos.find((c) => c.k === m.chave);
      const colChave = Object.keys(cab.mapa).find((col) => cab.mapa[col] === chave);
      const regs = [];
      for (const [rn, cel] of linhas) {
        if (rn <= cab.rn) continue;
        if (colChave && (cel[colChave] == null || String(cel[colChave]).trim() === '')) continue;
        const bruto = {};
        Object.entries(cab.mapa).forEach(([col, c]) => { if (cel[col] != null) bruto[c.k] = cel[col]; });
        if (Object.keys(bruto).length) regs.push({ linha: rn, bruto });
      }
      if (regs.length) res.mods[m.id] = regs;
    }
    // dados da empresa e listas (aba CONFIGURAÇÕES)
    const abaCfg = this.achaAba(wb.abas, 'CONFIGURAÇÕES');
    if (abaCfg) {
      const L = await wb.linhas(abaCfg);
      const rot = {};
      for (const [, cel] of L) {
        Object.entries(cel).forEach(([col, v]) => {
          const k = norm(v);
          const prox = cel[Number(col) + 1];
          if (prox == null) return;
          if (k === 'nome da empresa') rot.nome = prox;
          else if (k === 'cnpj') rot.cnpj = prox;
          else if (k === 'atividade economica') rot.atividade = prox;
          else if (k === 'grau de risco') rot.grauRisco = prox;
          else if (k === 'endereco') rot.endereco = prox;
          else if (k === 'cidade') rot.cidade = prox;
          else if (k === 'uf') rot.uf = prox;
          else if (k === 'data da fundacao') rot.fundacao = D.fromAny(prox);
          else if (k === 'responsavel pela seguranca') rot.responsavel = prox;
        });
      }
      res.empresa = Object.keys(rot).length ? rot : null;
      // listas: título na linha 7, valores abaixo
      const titulos = L.get(7) || {};
      const alvo = { 'setores': 'setores', 'funcoes': 'funcoes', 'instrutores': 'instrutores', 'medicos': 'medicos', 'fornecedores': 'fornecedores', 'tipo de extintores': 'tiposExtintor', 'normas': 'normas', 'dano / lesao': 'danos', 'parte do corpo': 'partesCorpo', 'agente causador': 'agentes' };
      Object.entries(titulos).forEach(([col, t]) => {
        const k = alvo[norm(t)];
        if (!k) return;
        const vals = [];
        for (const [rn, cel] of L) { if (rn > 7 && rn < 60 && typeof cel[col] === 'string') vals.push(cel[col].trim()); }
        if (vals.length) res.listas[k] = (res.listas[k] || []).concat(vals);
      });
    }
    return res;
  },

  valor(c, v) {
    if (v == null) return '';
    switch (c.t) {
      case 'date': return D.fromAny(v);
      case 'num': case 'money': { const n = toNum(v); return n == null ? '' : n; }
      case 'sn': { const s = norm(v); return s.startsWith('s') ? 'Sim' : s.startsWith('n') ? 'Não' : ''; }
      case 'opt': {
        const s = norm(v);
        const o = c.opts.find((x) => norm(x) === s) || c.opts.find((x) => x && norm(x).startsWith(s)) || c.opts.find((x) => x && s.startsWith(norm(x)));
        return o != null ? o : String(v).trim();
      }
      case 'time': {
        if (typeof v === 'number') { const m = Math.round((v % 1) * 1440); return D.pad(Math.floor(m / 60)) + ':' + D.pad(m % 60); }
        return String(v).trim().slice(0, 5);
      }
      default: return typeof v === 'number' ? String(v) : String(v).trim();
    }
  },

  /** Aplica a importação. modo: 'substituir' | 'adicionar' */
  async aplicar(res, modo) {
    const emp = App.emp.id;
    const mods = Object.keys(res.mods);
    if (modo === 'substituir') await DB.limparModulos(emp, mods);
    await App.recarregarDados();
    const novos = { colaboradores: [] };
    const colabPorNome = new Map((App.data.colaboradores || []).map((c) => [norm(c.nome), c.id]));
    const epiPorChave = new Map();
    const epiPorDesc = new Map();
    const epiPorCodigo = new Map(); // planilha: "Descrição ( código )" — o código resolve EPIs renomeados
    const equipPorNome = new Map((App.data.equipamentos || []).map((e) => [norm(e.nome), e.id]));
    const resumo = [];
    const criados = {};
    const salvarLote = async (mod, lista) => {
      const prontos = lista.map((r) => Object.assign({ id: r.id || uid(), emp, mod, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() }, r));
      await DB.putMany('rec', prontos);
      criados[mod] = (criados[mod] || 0) + prontos.length;
      return prontos;
    };
    const colabId = (nome) => {
      const k = norm(nome); if (!k) return '';
      if (colabPorNome.has(k)) return colabPorNome.get(k);
      const id = uid(); colabPorNome.set(k, id);
      novos.colaboradores.push({ id, nome: String(nome).trim().replace(/\s+/g, ' ') });
      return id;
    };
    const converter = (m, bruto) => {
      const r = {};
      m.campos.forEach((c) => {
        if (!(c.k in bruto)) return;
        const v = bruto[c.k];
        if (c.t === 'colab') r[c.k] = colabId(v);
        else if (c.t === 'epi') {
          const s = norm(v);
          const cod = /\(\s*(\d+)\s*\)\s*$/.exec(s);
          r[c.k] = epiPorChave.get(s) || epiPorDesc.get(s.replace(/\(\s*\d+\s*\)\s*$/, '').trim()) || (cod && epiPorCodigo.get(cod[1])) || '';
          if (!r[c.k]) r._epiTexto = String(v);
        } else if (c.t === 'equip') r[c.k] = equipPorNome.get(norm(v)) || '';
        else if (c.t === 'multicolab' || c.t === 'checks') r[c.k] = [];
        else r[c.k] = this.valor(c, v);
      });
      return r;
    };
    // ordem: colaboradores, equipamentos e EPIs antes de quem os referencia
    const ordem = ['colaboradores', 'epis', 'equipamentos'].concat(MODULOS.map((m) => m.id).filter((x) => !['colaboradores', 'epis', 'equipamentos'].includes(x)));
    for (const mod of ordem) {
      const regs = res.mods[mod];
      if (!regs) continue;
      const m = MOD[mod];
      let lista = regs.map((x) => converter(m, x.bruto));
      if (mod === 'colaboradores') lista = lista.map((r) => {
        const k = norm(r.nome);
        if (colabPorNome.has(k)) r.id = colabPorNome.get(k); else { r.id = uid(); colabPorNome.set(k, r.id); }
        return r;
      });
      if (mod === 'epis') {
        lista.forEach((r) => {
          r.id = uid();
          r.saldoInicial = '';
          epiPorChave.set(norm(r.descricao + ' ( ' + (r.codigo != null && r.codigo !== '' ? r.codigo : '') + ' )'), r.id);
          if (!epiPorDesc.has(norm(r.descricao))) epiPorDesc.set(norm(r.descricao), r.id);
          if (r.codigo != null && r.codigo !== '' && !epiPorCodigo.has(String(r.codigo))) epiPorCodigo.set(String(r.codigo), r.id);
        });
      }
      if (mod === 'equipamentos') lista.forEach((r) => { r.id = uid(); equipPorNome.set(norm(r.nome), r.id); });
      if (mod === 'riscos') lista.forEach((r) => {
        ['prob', 'sev'].forEach((k) => {
          if (r[k] && !/^[1-5]$/.test(r[k])) {
            const labs = k === 'prob' ? Config.params.probLabels : Config.params.sevLabels;
            const i = labs.findIndex((l) => norm(l) === norm(r[k]));
            r[k] = i >= 0 ? String(i + 1) : '';
          }
        });
      });
      if (mod === 'movepi') {
        let semEpi = 0;
        lista = lista.filter((r) => { if (!r.epi) { semEpi++; return false; } return true; });
        lista.forEach((r) => {
          delete r._epiTexto;
          r.tipo = norm(r.tipo) === 'entrada' ? 'ENTRADA' : 'SAÍDA';
          if (!r.destino) r.destino = r.colab ? 'Funcionário' : 'Fornecedor';
          if (r.destino === 'Fornecedor' && r.colab) { r.fornecedor = Calc.nomeColab(r.colab) || ((novos.colaboradores.find((c) => c.id === r.colab) || {}).nome) || ''; r.colab = ''; }
          if (!r.qtd) r.qtd = 1;
          const med = Config.lista('med').find((t) => norm(t) === norm(r.med)) || (/primeira/i.test(r.med || '') ? 'Primeira entrega' : r.med);
          r.med = med || '';
        });
        if (semEpi) resumo.push(semEpi + ' movimentação(ões) ignorada(s) por não encontrar o EPI no cadastro');
      }
      if (mod === 'colaboradores') { await salvarLote(mod, lista); continue; }
      // garante que nomes vindos de outras abas virem colaboradores antes dos registros
      if (novos.colaboradores.length) {
        const fornecedores = new Set((mod === 'movepi' ? lista.filter((r) => r.fornecedor).map((r) => norm(r.fornecedor)) : []));
        const nc = novos.colaboradores.filter((c) => !fornecedores.has(norm(c.nome)));
        if (nc.length) await salvarLote('colaboradores', nc);
        novos.colaboradores = [];
      }
      lista.forEach((r) => m.campos.forEach((c) => { if (c.t === 'sel') Config.absorver(c.lista, r[c.k]); }));
      await salvarLote(mod, lista);
    }
    // participantes dos treinamentos (aba LISTA_TREINAMENTOS)
    const abaLT = this.achaAba(res.wb.abas, 'LISTA_TREINAMENTOS');
    if (abaLT && res.mods.treinamentos) {
      const L = await res.wb.linhas(abaLT);
      const cab = this.cabecalho(L, [{ k: 'nome', x: 'NOME DO COLABORADOR' }, { k: 'tr', x: 'TREINAMENTO' }, { k: 'df', x: 'DATA FINAL' }]);
      if (cab) {
        await App.recarregarDados();
        const turmas = App.data.treinamentos || [];
        const alterados = new Set();
        for (const [rn, cel] of L) {
          if (rn <= cab.rn) continue;
          const b = {}; Object.entries(cab.mapa).forEach(([col, c]) => { b[c.k] = cel[col]; });
          if (!b.nome || !b.tr) continue;
          const nomeTr = norm(String(b.tr).replace(/\(\s*\d+\s*\)\s*$/, ''));
          const df = D.fromAny(b.df);
          const t = turmas.find((x) => norm(x.treinamento) === nomeTr && (!df || x.dataFinal === df)) || turmas.find((x) => norm(x.treinamento) === nomeTr);
          if (!t) continue;
          const cid = colabId(b.nome);
          t.participantes = Array.from(new Set((t.participantes || []).concat([cid])));
          alterados.add(t);
        }
        if (novos.colaboradores.length) { await salvarLote('colaboradores', novos.colaboradores); novos.colaboradores = []; }
        if (alterados.size) await DB.putMany('rec', Array.from(alterados).map((t) => App.limpo(t)));
      }
    }
    // empresa e listas
    if (res.empresa) {
      Object.entries(res.empresa).forEach(([k, v]) => { if (v != null && v !== '' && !App.emp[k]) App.emp[k] = typeof v === 'number' ? String(v) : v; });
      await DB.put('empresas', App.emp);
    }
    Object.entries(res.listas).forEach(([k, vals]) => Config.absorver(k, vals));
    await Config.salvar();
    await App.recarregarDados();
    return { criados, resumo };
  },

  async iniciar() {
    const inp = h('<input type="file" accept=".xlsx,.xlsm" hidden>');
    document.body.appendChild(inp);
    inp.addEventListener('change', async () => {
      const f = inp.files[0]; inp.remove();
      if (!f) return;
      toast('Lendo a planilha…', 10000);
      let res;
      try { res = await this.analisar(f); } catch (e) { toast('Não foi possível ler a planilha: ' + e.message, 6000); return; }
      const mods = Object.keys(res.mods);
      if (!mods.length && !res.empresa) { toast('Nenhuma aba reconhecida. Use a planilha Gestão SST original.', 6000); return; }
      $('#toast').hidden = true;
      const body = h('<div><p>Encontrei estes dados em <b>' + esc(f.name) + '</b>:</p><ul>' +
        mods.map((m) => '<li>' + esc(MOD[m].nome) + ': <b>' + res.mods[m].length + '</b> linha(s)</li>').join('') +
        (res.empresa ? '<li>Dados da empresa: <b>' + esc(res.empresa.nome || '') + '</b> (preenchem só os campos vazios)</li>' : '') + '</ul>' +
        '<label class="field">O que fazer com os registros que já existem nesses módulos?<select id="imp-modo"><option value="substituir">Substituir (apaga os registros atuais desses módulos)</option><option value="adicionar">Adicionar aos registros atuais</option></select></label>' +
        '<p class="small muted">Colaboradores citados nas movimentações de EPI e em outras abas, mas ausentes do cadastro, são criados automaticamente. O saldo inicial dos EPIs fica em branco: ajuste no cadastro de cada EPI, se necessário.</p></div>');
      Modal.open({
        title: 'Importar planilha', small: true, body,
        foot: [button('Cancelar', '', () => Modal.close()), button('Importar', 'btn-primary', async () => {
          const modo = $('#imp-modo').value;
          Modal.close();
          toast('Importando…', 20000);
          try {
            const { criados, resumo } = await this.aplicar(res, modo);
            $('#toast').hidden = true;
            Modal.open({
              title: 'Importação concluída', small: true,
              body: '<ul>' + Object.entries(criados).map(([m, n]) => '<li>' + esc(MOD[m].nome) + ': ' + n + '</li>').join('') + '</ul>' + resumo.map((r) => '<p class="notice warn">' + esc(r) + '</p>').join(''),
              foot: [button('Ver painel', 'btn-primary', () => { Modal.close(); App.ir('painel'); })]
            });
            App.atualizarTela();
          } catch (e) { toast('Falha na importação: ' + e.message, 6000); }
        })]
      });
    });
    inp.click();
  }
};
