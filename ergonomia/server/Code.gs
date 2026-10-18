/**
 * Backend de sincronização do app "Gestão Ergonômica — PGR".
 *
 * Como implantar (igual ao app de Inspeções SSMA):
 * 1. Crie uma planilha nova no Google Sheets.
 * 2. Extensões > Apps Script > cole este arquivo substituindo o padrão.
 * 3. Implantar > Nova implantação > tipo "App da Web":
 *    - Executar como: Eu
 *    - Quem pode acessar: Qualquer pessoa
 * 4. Copie a URL (termina em /exec) e cole nas Configurações do app,
 *    em "Endereço de sincronização".
 *
 * Requisições aceitas (POST, JSON no corpo):
 *  - { action: "ping" }
 *  - { action: "upsertEntidade", tipo, dados }
 *  - { action: "uploadPhoto", photo }
 */

const DRIVE_FOLDER_NAME = 'Gestão Ergonômica PGR - Evidências';

const COLUNAS_POR_TIPO = {
  organizacoes: ['id', 'razaoSocial', 'nomeFantasia', 'cnpj', 'cnaePrincipal', 'grauRisco', 'numTrabalhadores', 'responsavelLegal', 'responsavelPGR', 'responsavelTecnico', 'temCipa'],
  estabelecimentos: ['id', 'organizacaoId', 'nome', 'endereco', 'numTrabalhadores', 'turnos'],
  processos: ['id', 'estabelecimentoId', 'nome'],
  setores: ['id', 'processoId', 'nome'],
  funcoes: ['id', 'setorId', 'nome'],
  atividades: ['id', 'funcaoId', 'descricao'],
  situacoes: ['id', 'atividadeId', 'local', 'cargo', 'numTrabalhadores', 'jornada', 'turnos', 'trabalhadoresParticiparam'],
  riscos: ['id', 'organizacaoId', 'codigo', 'status', 'tipoProposta', 'perigo', 'processo', 'atividade', 'fonte', 'grupoExposto', 'severidade', 'probabilidade', 'classificacao', 'necessidadeAcao', 'versao'],
  aep: ['id', 'situacaoId', 'avaliador', 'data', 'status', 'necessitaAET', 'alertaAcaoImediata'],
  aet: ['id', 'aepId', 'situacaoId', 'responsavelTecnico', 'status'],
  planos: ['id', 'organizacaoId', 'codigo', 'descricaoMedida', 'prioridade', 'responsavel', 'prazo', 'status', 'percentualExecucao', 'avaliacaoEficacia', 'riscoResidual']
};

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); }
  catch (err) { return jsonResponse({ ok: false, error: 'JSON inválido: ' + err.message }); }

  try {
    switch (body.action) {
      case 'ping': return jsonResponse({ ok: true });
      case 'upsertEntidade': return jsonResponse(upsertEntidade(body.tipo, body.dados));
      case 'uploadPhoto': return jsonResponse(uploadPhoto(body.photo));
      default: return jsonResponse({ ok: false, error: 'Ação desconhecida: ' + body.action });
    }
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
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

function upsertEntidade(tipo, dados) {
  const colunas = COLUNAS_POR_TIPO[tipo];
  if (!colunas) return { ok: false, error: 'Tipo de entidade desconhecido: ' + tipo };

  const nomeAba = tipo.charAt(0).toUpperCase() + tipo.slice(1);
  const headers = colunas.concat(['dados_completos_json', 'recebido_em']);
  const sheet = getOrCreateSheet(nomeAba, headers);

  const linha = colunas.map((c) => {
    const v = dados[c];
    return (v === undefined || v === null) ? '' : (typeof v === 'object' ? JSON.stringify(v) : v);
  });
  linha.push(JSON.stringify(dados));
  linha.push(new Date());

  const dataRange = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][0] === dados.id) { rowIndex = i + 1; break; }
  }
  if (rowIndex > 0) sheet.getRange(rowIndex, 1, 1, linha.length).setValues([linha]);
  else sheet.appendRow(linha);

  return { ok: true, remoteRef: dados.id };
}

function uploadPhoto(photo) {
  const rootFolder = getOrCreateDriveFolder(DRIVE_FOLDER_NAME);
  const subFolder = getOrCreateDriveFolder(photo.refType || 'geral', rootFolder);
  const itemFolder = getOrCreateDriveFolder(photo.refId || 'sem-id', subFolder);

  const bytes = Utilities.base64Decode(photo.base64);
  const blob = Utilities.newBlob(bytes, photo.mimeType || 'image/jpeg', photo.fileName || (photo.id + '.jpg'));
  const file = itemFolder.createFile(blob);

  return { ok: true, fileUrl: file.getUrl() };
}
