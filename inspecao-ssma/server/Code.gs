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
 * O app envia três tipos de requisição (todas via POST, JSON no corpo):
 *  - { action: "ping" }                          -> teste de conexão
 *  - { action: "upsertInspection", inspection }  -> dados textuais da inspeção
 *  - { action: "uploadPhoto", inspectionId, photo } -> uma foto por vez
 */

const DRIVE_FOLDER_NAME = 'Inspeções SSMA - Fotos';
const SHEET_INSPECOES = 'Inspecoes';
const SHEET_ITENS = 'Itens_Checklist';

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
