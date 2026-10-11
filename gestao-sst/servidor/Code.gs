/**
 * Gestão SST — servidor da equipe (Google Apps Script).
 *
 * Guarda os registros de todos os computadores numa planilha Google e devolve
 * a cada computador o que os outros alteraram.
 *
 *  - Aba "_dados" (oculta): uma linha por registro, com o conteúdo completo.
 *    É a fonte da sincronização. Não edite essa aba à mão.
 *  - Abas de consulta (Colaboradores, Acidentes, Treinamentos...): montadas a
 *    partir de "_dados" a cada envio, só para leitura, filtros e Looker Studio.
 *    Alterações feitas nelas são apagadas no envio seguinte.
 *
 * Instalação (resumo; o passo a passo está em servidor/LEIA-ME.md):
 *  1. Planilha nova → Extensões → Apps Script → cole este arquivo → Salvar.
 *  2. Configurações do projeto → Propriedades do script → CHAVE_ACESSO.
 *  3. Implantar → Nova implantação → App da Web → Executar como: Eu →
 *     Quem pode acessar: Qualquer pessoa → copie o endereço que termina em /exec.
 */

const VERSAO_SERVIDOR = '2026-10-11';
const ABA_DADOS = '_dados';
const ABA_ESQUEMA = '_esquema';
const CABECALHO = ['id', 'emp', 'mod', 'rev', 'atualizadoEm', 'excluido', 'json', 'recebidoEm'];
const C = { id: 0, emp: 1, mod: 2, rev: 3, atualizadoEm: 4, excluido: 5, json: 6, recebidoEm: 7 };
const LIMITE_CELULA = 49000;

function doGet() {
  return ContentService.createTextOutput('Servidor do Gestão SST funcionando. Versão ' + VERSAO_SERVIDOR + '.');
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return resposta({ ok: false, erro: 'Requisição inválida.' });
  }
  const chave = PropertiesService.getScriptProperties().getProperty('CHAVE_ACESSO');
  if (!chave) return resposta({ ok: false, erro: 'Servidor sem chave de acesso. Defina CHAVE_ACESSO em Configurações do projeto → Propriedades do script.' });
  if (String(body.chave || '') !== chave) return resposta({ ok: false, erro: 'Chave de acesso inválida.' });
  try {
    switch (body.acao) {
      case 'ping': return resposta({ ok: true, versao: VERSAO_SERVIDOR, planilha: SpreadsheetApp.getActiveSpreadsheet().getName() });
      case 'empresas': return resposta(listarEmpresas());
      case 'enviar': return resposta(comTrava(() => enviar(body)));
      case 'receber': return resposta(comTrava(() => receber(body)));
      default: return resposta({ ok: false, erro: 'Ação desconhecida: ' + body.acao });
    }
  } catch (err) {
    return resposta({ ok: false, erro: String(err && err.message || err) });
  }
}

function resposta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function comTrava(fn) {
  const trava = LockService.getScriptLock();
  trava.waitLock(30000);
  try { return fn(); } finally { trava.releaseLock(); }
}

/* ---------------- Armazenamento ---------------- */

function abaDados() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(ABA_DADOS);
  if (!sh) {
    sh = ss.insertSheet(ABA_DADOS);
    // tudo como texto: impede o Sheets de transformar datas e números
    sh.getRange(1, 1, sh.getMaxRows(), CABECALHO.length).setNumberFormat('@');
    sh.getRange(1, 1, 1, CABECALHO.length).setValues([CABECALHO]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.hideSheet();
  }
  return sh;
}

function lerDados() {
  const sh = abaDados();
  const n = sh.getLastRow();
  if (n < 2) return { sh, linhas: [] };
  return { sh, linhas: sh.getRange(2, 1, n - 1, CABECALHO.length).getValues() };
}

function lerEsquema() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_ESQUEMA);
  if (!sh) return null;
  try { return JSON.parse(sh.getRange(1, 1).getValue()); } catch (e) { return null; }
}

function gravarEsquema(esquema) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(ABA_ESQUEMA);
  if (!sh) { sh = ss.insertSheet(ABA_ESQUEMA); sh.hideSheet(); }
  sh.getRange(1, 1).setNumberFormat('@').setValue(JSON.stringify(esquema));
}

function proximaRevisao(qtd) {
  const props = PropertiesService.getScriptProperties();
  const atual = Number(props.getProperty('REV') || 0);
  props.setProperty('REV', String(atual + qtd));
  return atual;
}

/* ---------------- Ações ---------------- */

function listarEmpresas() {
  const { linhas } = lerDados();
  const contagem = {};
  linhas.forEach((l) => {
    if (l[C.excluido] || String(l[C.mod]).charAt(0) === '_') return;
    contagem[l[C.emp]] = (contagem[l[C.emp]] || 0) + 1;
  });
  const empresas = linhas.filter((l) => l[C.mod] === '_empresa' && !l[C.excluido]).map((l) => {
    let d = {};
    try { d = JSON.parse(l[C.json]) || {}; } catch (e) { d = {}; }
    return { id: String(l[C.id]), nome: d.nome || '(sem nome)', cnpj: d.cnpj || '', registros: contagem[l[C.id]] || 0, dados: d };
  });
  return { ok: true, empresas };
}

/**
 * Recebe registros alterados num computador. Regra de conflito: vale a
 * alteração mais recente (campo atualizadoEm); a mais antiga é ignorada.
 */
function enviar(body) {
  const emp = String(body.emp || '');
  if (!emp) throw new Error('Empresa não informada.');
  const itens = Array.isArray(body.itens) ? body.itens : [];
  if (body.esquema) gravarEsquema(body.esquema);
  const { sh, linhas } = lerDados();
  const indice = {};
  linhas.forEach((l, i) => { indice[String(l[C.id])] = i; });

  const validos = [];
  const erros = [];
  let ignorados = 0;
  itens.forEach((it) => {
    const id = String(it.id || '');
    if (!id) return;
    const json = it.excluido ? '' : JSON.stringify(it.dados == null ? null : it.dados);
    if (json.length > LIMITE_CELULA) { erros.push({ id, erro: 'Registro grande demais para a planilha.' }); return; }
    const i = indice[id];
    const atual = i == null ? null : linhas[i];
    if (atual && String(atual[C.emp]) !== emp) { erros.push({ id, erro: 'Registro pertence a outra empresa.' }); return; }
    if (atual && String(atual[C.atualizadoEm]) > String(it.atualizadoEm || '')) { ignorados++; return; }
    validos.push({ it, id, json, i, atual });
  });

  let rev = proximaRevisao(validos.length);
  const agora = new Date().toISOString();
  const novas = [];
  const tocados = {};
  validos.forEach((v) => {
    rev++;
    const mod = String(v.it.mod || (v.atual ? v.atual[C.mod] : ''));
    const linha = [v.id, emp, mod, String(rev), String(v.it.atualizadoEm || agora), v.it.excluido ? 'SIM' : '', v.json, agora];
    tocados[mod] = true;
    if (v.i == null) { novas.push(linha); indice[v.id] = linhas.length; linhas.push(linha); } else { linhas[v.i] = linha; sh.getRange(v.i + 2, 1, 1, CABECALHO.length).setValues([linha]); }
  });
  if (novas.length) {
    const inicio = sh.getLastRow() + 1;
    sh.getRange(inicio, 1, novas.length, CABECALHO.length).setNumberFormat('@').setValues(novas);
  }

  const esquema = body.esquema || lerEsquema();
  if (esquema) {
    // nomes de colaborador, EPI e máquina aparecem nas abas que os citam
    const refs = { colaboradores: true, epis: true, equipamentos: true, _empresa: true };
    const afetados = Object.keys(tocados).some((m) => refs[m]) ? esquema.map((m) => m.id) : Object.keys(tocados);
    montarAbasDeConsulta(esquema, linhas, afetados);
  }
  return { ok: true, gravados: validos.length, ignorados, erros, rev };
}

/** Devolve os registros da empresa alterados depois da revisão "desde". */
function receber(body) {
  const emp = String(body.emp || '');
  const desde = Number(body.desde || 0);
  const limite = Math.min(Number(body.limite || 400), 1000);
  const { linhas } = lerDados();
  const novas = linhas.filter((l) => String(l[C.emp]) === emp && Number(l[C.rev]) > desde)
    .sort((a, b) => Number(a[C.rev]) - Number(b[C.rev]));
  const lote = novas.slice(0, limite);
  const itens = lote.map((l) => {
    let dados = null;
    if (!l[C.excluido]) { try { dados = JSON.parse(l[C.json]); } catch (e) { dados = null; } }
    return { id: String(l[C.id]), mod: String(l[C.mod]), atualizadoEm: String(l[C.atualizadoEm]), excluido: !!l[C.excluido], dados };
  });
  const cursor = lote.length ? Number(lote[lote.length - 1][C.rev]) : desde;
  return { ok: true, itens, cursor, mais: novas.length > limite };
}

/* ---------------- Abas de consulta ---------------- */

function nomeAba(m) {
  return String(m.nome).replace(/[\[\]\*\?:\/\\]/g, '-').slice(0, 90);
}

function dataBR(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
  return m ? m[3] + '/' + m[2] + '/' + m[1] : String(s || '');
}

function montarAbasDeConsulta(esquema, linhas, modulos) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ler = (l) => { try { return JSON.parse(l[C.json]) || {}; } catch (e) { return {}; } };
  const ativos = linhas.filter((l) => !l[C.excluido]);
  const nomes = { colab: {}, epi: {}, equip: {}, empresa: {} };
  ativos.forEach((l) => {
    const m = l[C.mod];
    if (m === 'colaboradores') nomes.colab[l[C.id]] = ler(l).nome || '';
    else if (m === 'epis') { const d = ler(l); nomes.epi[l[C.id]] = (d.descricao || '') + (d.ca ? ' (CA ' + d.ca + ')' : ''); }
    else if (m === 'equipamentos') nomes.equip[l[C.id]] = ler(l).nome || '';
    else if (m === '_empresa') nomes.empresa[l[C.id]] = ler(l).nome || '';
  });
  const texto = (c, v) => {
    if (v == null || v === '') return '';
    switch (c[2]) {
      case 'date': return dataBR(v);
      case 'colab': return nomes.colab[v] || '';
      case 'epi': return nomes.epi[v] || '';
      case 'equip': return nomes.equip[v] || '';
      case 'multicolab': return (Array.isArray(v) ? v : []).map((id) => nomes.colab[id] || '').filter(String).join(', ');
      case 'num': case 'money': return typeof v === 'number' ? String(v).replace('.', ',') : String(v);
      default: return Array.isArray(v) ? v.join(', ') : String(v);
    }
  };
  esquema.forEach((m) => {
    if (modulos.indexOf(m.id) < 0) return;
    const cab = ['Empresa'].concat(m.campos.map((c) => c[1])).concat(['Atualizado em']);
    const corpo = ativos.filter((l) => l[C.mod] === m.id).map((l) => {
      const d = ler(l);
      return [nomes.empresa[l[C.emp]] || ''].concat(m.campos.map((c) => texto(c, d[c[0]]))).concat([String(l[C.atualizadoEm]).replace('T', ' ').slice(0, 16)]);
    });
    const nome = nomeAba(m);
    let sh = ss.getSheetByName(nome);
    if (!sh && !corpo.length) return; // não cria aba vazia
    if (!sh) sh = ss.insertSheet(nome);
    sh.clearContents();
    const tudo = [cab].concat(corpo);
    if (sh.getMaxColumns() < cab.length) sh.insertColumnsAfter(sh.getMaxColumns(), cab.length - sh.getMaxColumns());
    if (sh.getMaxRows() < tudo.length) sh.insertRowsAfter(sh.getMaxRows(), tudo.length - sh.getMaxRows());
    sh.getRange(1, 1, tudo.length, cab.length).setNumberFormat('@').setValues(tudo);
    sh.getRange(1, 1, 1, cab.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  });
}

/** Menu da planilha: refaz todas as abas de consulta. */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Gestão SST').addItem('Atualizar abas de consulta', 'atualizarAbasDeConsulta').addToUi();
}

function atualizarAbasDeConsulta() {
  const esquema = lerEsquema();
  if (!esquema) { SpreadsheetApp.getUi().alert('Ainda não há dados enviados pelo sistema.'); return; }
  const { linhas } = lerDados();
  montarAbasDeConsulta(esquema, linhas, esquema.map((m) => m.id));
}
