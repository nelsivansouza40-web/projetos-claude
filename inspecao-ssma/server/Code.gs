/**
 * Backend de sincronização do app "Inspeções SSMA".
 *
 * Como implantar:
 * 1. Crie uma planilha nova no Google Sheets (ela receberá os registros).
 * 2. Nessa planilha, abra Extensões > Apps Script e cole este arquivo
 *    substituindo o conteúdo padrão.
 * 3. Ajuste, se quiser, o nome da pasta do Drive em DRIVE_FOLDER_NAME.
 * 4. Em "Implantar" > "Nova implantação" > tipo "App da Web":
 *    - Executar como: Eu (sua conta)
 *    - Quem pode acessar: Qualquer pessoa (ou "Qualquer pessoa com link"
 *      da organização, se o app for usado só internamente)
 * 5. Copie a URL gerada e cole nas Configurações do aplicativo, no campo
 *    "Endereço de sincronização".
 *
 * O app envia estes tipos de requisição (todas via POST, JSON no corpo):
 *  - { action: "ping" }                          -> teste de conexão
 *  - { action: "upsertInspection", inspection }  -> dados textuais da inspeção
 *  - { action: "upsertDDS", dds }                -> dados textuais do DDS
 *  - { action: "uploadPhoto", inspectionId, photo } -> uma foto por vez
 *    (inspectionId também é usado para fotos de DDS, com o próprio ID do DDS)
 *
 * Painel de ações (Resolvidas / Pendentes / Dentro do Prazo / Em Atraso):
 * depois de sincronizar ao menos uma inspeção, rode a função
 * `criarOuAtualizarDashboard` uma vez pelo próprio editor do Apps Script
 * (menu de funções no topo > selecione o nome > Executar). Isso cria as
 * colunas "Status da Ação" e "Situação do Prazo" na aba Inspecoes e uma
 * aba "Dashboard" com os indicadores e um gráfico. Marque manualmente
 * "Resolvida" na coluna "Status da Ação" quando a medida for concluída;
 * o resto (prazo vencido ou não) é calculado sozinho todo dia.
 */

const DRIVE_FOLDER_NAME = 'Inspeções SSMA - Fotos';
const SHEET_INSPECOES = 'Inspecoes';
const SHEET_ITENS = 'Itens_Checklist';
const SHEET_DDS = 'DDS';
const SHEET_DDS_PARTICIPANTES = 'DDS_Participantes';

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ ok: false, error: 'JSON inválido: ' + err.message });
  }

  try {
    switch (body.action) {
      case 'ping':
        return jsonResponse({ ok: true });
      case 'upsertInspection':
        return jsonResponse(upsertInspection(body.inspection));
      case 'upsertDDS':
        return jsonResponse(upsertDDS(body.dds));
      case 'uploadPhoto':
        return jsonResponse(uploadPhoto(body.inspectionId, body.photo));
      default:
        return jsonResponse({ ok: false, error: 'Ação desconhecida: ' + body.action });
    }
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getOrCreateDriveFolder(name, parent) {
  const parentFolder = parent || DriveApp.getRootFolder();
  const it = parentFolder.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parentFolder.createFolder(name);
}

function upsertInspection(insp) {
  const rootFolder = getOrCreateDriveFolder(DRIVE_FOLDER_NAME);
  const folderName = insp.id + ' - ' + (insp.identificacao.empresa || 'sem-empresa');
  const inspFolder = getOrCreateDriveFolder(folderName, rootFolder);

  const sheetInsp = getOrCreateSheet(SHEET_INSPECOES, [
    'ID', 'Data', 'Hora', 'Empresa', 'Unidade', 'Área', 'Inspetor',
    'Responsável Área', 'Tipo de Inspeção', 'Classificação Geral',
    'Ação Imediata', 'Descrição NC', 'Medida Imediata', 'Medida Definitiva',
    'Responsável Ação', 'Prazo', 'Observações Finais', 'Necessita Reinspeção',
    'Recebido em', 'Pasta Drive'
  ]);

  const id = insp.id;
  const linha = [
    id,
    insp.identificacao.data,
    insp.identificacao.hora,
    insp.identificacao.empresa,
    insp.identificacao.unidade,
    insp.identificacao.area,
    insp.identificacao.inspetor,
    insp.identificacao.responsavelArea,
    insp.tipoInspecao,
    insp.fechamento.classificacaoGeral,
    insp.fechamento.acaoImediata,
    insp.fechamento.descricaoNC,
    insp.fechamento.medidaImediata,
    insp.fechamento.medidaDefinitiva,
    insp.fechamento.responsavelAcao,
    insp.fechamento.prazo,
    insp.fechamento.observacoesFinais,
    insp.fechamento.necessitaReinspecao,
    new Date(),
    inspFolder.getUrl()
  ];

  const idCol = 1;
  const data = sheetInsp.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol - 1] === id) { rowIndex = i + 1; break; }
  }
  if (rowIndex > 0) {
    sheetInsp.getRange(rowIndex, 1, 1, linha.length).setValues([linha]);
  } else {
    sheetInsp.appendRow(linha);
  }

  const sheetItens = getOrCreateSheet(SHEET_ITENS, [
    'Inspeção ID', 'Item ID', 'Questão', 'Resposta', 'Observação',
    'Medida de Controle', 'Personalizado', 'Recebido em'
  ]);
  const itensExistentes = sheetItens.getDataRange().getValues();
  (insp.checklist || []).forEach((item) => {
    let jaExiste = false;
    for (let i = 1; i < itensExistentes.length; i++) {
      if (itensExistentes[i][0] === id && itensExistentes[i][1] === item.id) { jaExiste = true; break; }
    }
    if (!jaExiste) {
      sheetItens.appendRow([
        id, item.id, item.texto, item.resposta, item.observacao,
        item.medida, item.personalizado, new Date()
      ]);
    }
  });

  return { ok: true, remoteRef: inspFolder.getId() };
}

function upsertDDS(dds) {
  const rootFolder = getOrCreateDriveFolder(DRIVE_FOLDER_NAME);
  const folderName = dds.id + ' - DDS - ' + (dds.identificacao.empresa || 'sem-empresa');
  const ddsFolder = getOrCreateDriveFolder(folderName, rootFolder);

  const sheetDDS = getOrCreateSheet(SHEET_DDS, [
    'ID', 'Data', 'Hora', 'Empresa', 'Unidade', 'Área', 'Ministrante',
    'Tema', 'Conteúdo Abordado', 'Duração (min)', 'Observações',
    'Qtd. Participantes', 'Recebido em', 'Pasta Drive'
  ]);

  const id = dds.id;
  const linha = [
    id,
    dds.identificacao.data,
    dds.identificacao.hora,
    dds.identificacao.empresa,
    dds.identificacao.unidade,
    dds.identificacao.area,
    dds.identificacao.ministrante,
    dds.tema,
    dds.conteudo,
    dds.duracaoMinutos,
    dds.observacoes,
    (dds.participantes || []).length,
    new Date(),
    ddsFolder.getUrl()
  ];

  const idCol = 1;
  const data = sheetDDS.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol - 1] === id) { rowIndex = i + 1; break; }
  }
  if (rowIndex > 0) {
    sheetDDS.getRange(rowIndex, 1, 1, linha.length).setValues([linha]);
  } else {
    sheetDDS.appendRow(linha);
  }

  const sheetParticipantes = getOrCreateSheet(SHEET_DDS_PARTICIPANTES, [
    'DDS ID', 'Participante ID', 'Nome', 'Função', 'Assinado', 'Recebido em'
  ]);
  const existentes = sheetParticipantes.getDataRange().getValues();
  (dds.participantes || []).forEach((p) => {
    let jaExiste = false;
    for (let i = 1; i < existentes.length; i++) {
      if (existentes[i][0] === id && existentes[i][1] === p.id) { jaExiste = true; break; }
    }
    if (!jaExiste) {
      sheetParticipantes.appendRow([id, p.id, p.nome, p.funcao, p.assinado, new Date()]);
    }
  });

  return { ok: true, remoteRef: ddsFolder.getId() };
}

function uploadPhoto(inspectionId, photo) {
  const rootFolder = getOrCreateDriveFolder(DRIVE_FOLDER_NAME);
  let inspFolder;
  if (photo.remoteRef) {
    inspFolder = DriveApp.getFolderById(photo.remoteRef);
  } else {
    const it = rootFolder.getFolders();
    inspFolder = null;
    while (it.hasNext()) {
      const f = it.next();
      if (f.getName().indexOf(inspectionId) === 0) { inspFolder = f; break; }
    }
    if (!inspFolder) inspFolder = getOrCreateDriveFolder(inspectionId, rootFolder);
  }

  const bytes = Utilities.base64Decode(photo.base64);
  const blob = Utilities.newBlob(bytes, photo.mimeType || 'image/jpeg', photo.fileName || (photo.id + '.jpg'));
  const file = inspFolder.createFile(blob);
  file.setName((photo.questionRef || 'foto') + '_' + photo.id + '_' + file.getName());

  return { ok: true, fileUrl: file.getUrl() };
}

/**
 * Cria (ou recria) a aba "Dashboard" com os indicadores de ações:
 * Resolvidas, Pendentes, Dentro do Prazo e Em Atraso, mais um gráfico.
 * Rode esta função manualmente pelo editor do Apps Script sempre que
 * quiser reconstruir o painel do zero. Ela não altera dados já lançados
 * pelo app, só acrescenta duas colunas de controle na aba Inspecoes
 * (se ainda não existirem) e (re)monta a aba Dashboard.
 */
function criarOuAtualizarDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetInsp = ss.getSheetByName(SHEET_INSPECOES);
  if (!sheetInsp) {
    throw new Error('A aba "Inspecoes" ainda não existe. Sincronize ao menos uma inspeção pelo app antes de criar o dashboard.');
  }

  const LINHA_FINAL = 2000; // quantidade de linhas cobertas pelas fórmulas do painel
  const COL_PRAZO = 'P';    // coluna "Prazo" no layout atual da aba Inspecoes

  // Garante as colunas de controle de ação, sem mexer nas colunas já usadas pelo app.
  const cabecalho = sheetInsp.getRange(1, 1, 1, sheetInsp.getLastColumn()).getValues()[0];
  let colStatus = cabecalho.indexOf('Status da Ação') + 1;
  let colSituacao = cabecalho.indexOf('Situação do Prazo') + 1;

  if (!colStatus) {
    colStatus = sheetInsp.getLastColumn() + 1;
    sheetInsp.getRange(1, colStatus).setValue('Status da Ação');
    sheetInsp.getRange(2, colStatus, LINHA_FINAL - 1, 1).setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInList(['Pendente', 'Resolvida'], true)
        .setAllowInvalid(false)
        .build()
    );
  }
  if (!colSituacao) {
    colSituacao = sheetInsp.getLastColumn() + 1;
    sheetInsp.getRange(1, colSituacao).setValue('Situação do Prazo');
  }

  const colStatusLetra = columnToLetter(colStatus);
  const colSituacaoLetra = columnToLetter(colSituacao);

  // Fórmula única (matricial) que calcula a situação de todas as linhas de uma vez.
  // Usa ";" como separador de argumentos (planilha em português usa vírgula
  // como separador decimal, então o Sheets exige ";" nas fórmulas).
  sheetInsp.getRange(colSituacaoLetra + '2').setFormula(
    '=ARRAYFORMULA(IF($A$2:$A$' + LINHA_FINAL + '="";"";' +
    'IF(' + colStatusLetra + '$2:' + colStatusLetra + '$' + LINHA_FINAL + '="Resolvida";"Resolvida";' +
    'IF(' + COL_PRAZO + '$2:' + COL_PRAZO + '$' + LINHA_FINAL + '="";"Sem Prazo";' +
    'IF(' + COL_PRAZO + '$2:' + COL_PRAZO + '$' + LINHA_FINAL + '<TODAY();"Em Atraso";"Dentro do Prazo")))))'
  );

  // Recria a aba do painel do zero.
  const existente = ss.getSheetByName('Dashboard');
  if (existente) ss.deleteSheet(existente);
  const dash = ss.insertSheet('Dashboard', 0);

  dash.getRange('A1').setValue('Painel de Ações — Inspeções SSMA').setFontSize(16).setFontWeight('bold');
  dash.getRange('A2')
    .setValue('Marque "Resolvida" na coluna "Status da Ação" da aba Inspecoes quando a medida for concluída. Os prazos vencidos são calculados automaticamente todo dia.')
    .setFontStyle('italic').setFontColor('#666666').setWrap(true);
  dash.getRange('A2:H2').merge();

  const linhaKpi = 4;
  const REF_INSP = 'Inspecoes!';
  const kpis = [
    ['Total de Ações', '=COUNTIF(' + REF_INSP + COL_PRAZO + '2:' + COL_PRAZO + LINHA_FINAL + ';"<>")'],
    ['Resolvidas', '=COUNTIF(' + REF_INSP + colStatusLetra + '2:' + colStatusLetra + LINHA_FINAL + ';"Resolvida")'],
    ['Dentro do Prazo', '=COUNTIF(' + REF_INSP + colSituacaoLetra + '2:' + colSituacaoLetra + LINHA_FINAL + ';"Dentro do Prazo")'],
    ['Em Atraso', '=COUNTIF(' + REF_INSP + colSituacaoLetra + '2:' + colSituacaoLetra + LINHA_FINAL + ';"Em Atraso")']
  ];
  kpis.forEach((kpi, i) => {
    const col = 1 + i * 2; // A, C, E, G
    dash.getRange(linhaKpi, col).setValue(kpi[0]).setFontWeight('bold');
    dash.getRange(linhaKpi + 1, col).setFormula(kpi[1]).setFontSize(28).setFontWeight('bold');
  });
  // Pendentes = Dentro do Prazo + Em Atraso (colunas E e G da linha de valores).
  dash.getRange(linhaKpi, 9).setValue('Pendentes').setFontWeight('bold');
  dash.getRange(linhaKpi + 1, 9).setFormula('=E' + (linhaKpi + 1) + '+G' + (linhaKpi + 1)).setFontSize(28).setFontWeight('bold');
  dash.setColumnWidths(1, 9, 130);

  // Fonte de dados do gráfico (situações mutuamente exclusivas, somam o total).
  const linhaGrafico = linhaKpi + 4;
  dash.getRange(linhaGrafico, 1, 4, 2).setValues([
    ['Situação', 'Quantidade'],
    ['Resolvida', '=C' + (linhaKpi + 1)],
    ['Dentro do Prazo', '=E' + (linhaKpi + 1)],
    ['Em Atraso', '=G' + (linhaKpi + 1)]
  ]);

  const chart = dash.newChart()
    .asPieChart()
    .addRange(dash.getRange(linhaGrafico, 1, 4, 2))
    .setPosition(linhaKpi, 11, 0, 0)
    .setOption('title', 'Distribuição das Ações')
    .setOption('colors', ['#1e7e34', '#0f4c81', '#b02a2a'])
    .setOption('width', 420)
    .setOption('height', 300)
    .build();
  dash.insertChart(chart);
}

function columnToLetter(coluna) {
  let letra = '';
  while (coluna > 0) {
    const resto = (coluna - 1) % 26;
    letra = String.fromCharCode(65 + resto) + letra;
    coluna = Math.floor((coluna - resto) / 26);
  }
  return letra;
}
