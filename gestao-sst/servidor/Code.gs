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

const VERSAO_SERVIDOR = '2026-11-20';
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
      case 'pendencias': return resposta(comTrava(() => guardarPendencias(body)));
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
    const refs = { colaboradores: true, epis: true, equipamentos: true, contratadas: true, terceiros: true, _empresa: true };
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
  const nomes = { colab: {}, epi: {}, equip: {}, empresa: {}, contratada: {}, terceiro: {} };
  ativos.forEach((l) => {
    const m = l[C.mod];
    if (m === 'colaboradores') nomes.colab[l[C.id]] = ler(l).nome || '';
    else if (m === 'contratadas') nomes.contratada[l[C.id]] = ler(l).nome || '';
    else if (m === 'terceiros') nomes.terceiro[l[C.id]] = ler(l).nome || '';
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
      case 'contratada': return nomes.contratada[v] || '';
      case 'terceiro': return nomes.terceiro[v] || '';
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

/* ---------------- Aviso de vencimentos por e-mail ---------------- */

const ABA_PENDENCIAS = '_pendencias';

/** O sistema envia a lista de pendências de cada empresa; fica guardada para o aviso semanal. */
function guardarPendencias(body) {
  const emp = String(body.emp || '');
  if (!emp) throw new Error('Empresa não informada.');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(ABA_PENDENCIAS);
  if (!sh) { sh = ss.insertSheet(ABA_PENDENCIAS); sh.getRange(1, 1, sh.getMaxRows(), 4).setNumberFormat('@'); sh.hideSheet(); }
  let itens = Array.isArray(body.itens) ? body.itens : [];
  let json = JSON.stringify(itens);
  while (json.length > LIMITE_CELULA && itens.length) { itens = itens.slice(0, Math.floor(itens.length * 0.8)); json = JSON.stringify(itens); }
  const linha = [emp, String(body.nome || ''), new Date().toISOString(), json];
  const n = sh.getLastRow();
  const ids = n ? sh.getRange(1, 1, n, 1).getValues().map((r) => String(r[0])) : [];
  const i = ids.indexOf(emp);
  sh.getRange(i >= 0 ? i + 1 : n + 1, 1, 1, 4).setValues([linha]);
  return { ok: true, guardados: itens.length };
}

/** Envia o resumo de vencimentos para os e-mails da propriedade EMAIL_AVISOS. */
function enviarAvisoSemanal() {
  const destino = String(PropertiesService.getScriptProperties().getProperty('EMAIL_AVISOS') || '').trim();
  if (!destino) throw new Error('Defina a propriedade EMAIL_AVISOS (e-mails separados por vírgula).');
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_PENDENCIAS);
  if (!sh || !sh.getLastRow()) return;
  const linhas = sh.getRange(1, 1, sh.getLastRow(), 4).getValues();
  linhas.forEach((l) => {
    let itens = [];
    try { itens = JSON.parse(l[3]) || []; } catch (e) { itens = []; }
    const vencidos = itens.filter((p) => p.s !== 'A VENCER');
    const avencer = itens.filter((p) => p.s === 'A VENCER');
    const tabela = (lista) => lista.length
      ? '<table cellpadding="5" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px">' +
        '<tr style="background:#0f4c81;color:#fff"><th align="left">Área</th><th align="left">Pendência</th><th align="left">Quem / local</th><th align="left">Vencimento</th><th align="left">Situação</th></tr>' +
        lista.map((p) => '<tr style="border-bottom:1px solid #ddd"><td>' + esc_(p.area) + '</td><td>' + esc_(p.desc) + '</td><td>' + esc_(p.quem) + '</td><td>' + esc_(dataBR(p.venc)) + '</td><td><b>' + esc_(p.s) + '</b></td></tr>').join('') + '</table>'
      : '<p>Nenhum item.</p>';
    const atualizado = dataBR(String(l[2]).slice(0, 10));
    const html = '<div style="font-family:Arial,sans-serif;font-size:14px"><h2 style="color:#0f4c81">Gestão SST — ' + esc_(l[1]) + '</h2>' +
      '<p>Resumo semanal de vencimentos. Dados enviados pelo sistema em ' + atualizado + '.</p>' +
      '<h3>Vencidos e pendentes (' + vencidos.length + ')</h3>' + tabela(vencidos) +
      '<h3>A vencer nos próximos dias (' + avencer.length + ')</h3>' + tabela(avencer) +
      '<p style="color:#777;font-size:12px">Mensagem automática do servidor da equipe do Gestão SST. Para parar, remova a propriedade EMAIL_AVISOS no Apps Script.</p></div>';
    MailApp.sendEmail({ to: destino, subject: 'Gestão SST — ' + l[1] + ': ' + vencidos.length + ' vencido(s), ' + avencer.length + ' a vencer', htmlBody: html });
  });
}

function esc_(v) {
  return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Rode uma vez no editor do Apps Script: agenda o aviso toda segunda-feira às 7h. */
function instalarAvisoSemanal() {
  ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === 'enviarAvisoSemanal').forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('enviarAvisoSemanal').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(7).create();
}

/** Menu da planilha. */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Gestão SST')
    .addItem('Atualizar abas de consulta', 'atualizarAbasDeConsulta')
    .addItem('Enviar aviso de vencimentos agora', 'enviarAvisoSemanal')
    .addItem('Agendar aviso toda segunda-feira', 'instalarAvisoSemanal')
    .addToUi();
}

function atualizarAbasDeConsulta() {
  const esquema = lerEsquema();
  if (!esquema) { SpreadsheetApp.getUi().alert('Ainda não há dados enviados pelo sistema.'); return; }
  const { linhas } = lerDados();
  montarAbasDeConsulta(esquema, linhas, esquema.map((m) => m.id));
}
