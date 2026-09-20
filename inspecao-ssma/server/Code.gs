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
 *  - { action: "upsertDiagnostico", diagnostico } -> dados textuais do diagnóstico
 *  - { action: "upsertCipaGestao", gestao }      -> membros e mandato da CIPA
 *  - { action: "upsertCipaReuniao", reuniao }    -> ata de reunião da CIPA
 *  - { action: "upsertPTAPR", ptapr }            -> dados da Permissão de Trabalho/APR
 *  - { action: "upsertCertificado", certificado } -> dados de certificado/treinamento
 *  - { action: "upsertPET", pet }                -> Permissão de Entrada e Trabalho em Espaço Confinado
 *  - { action: "uploadPhoto", inspectionId, photo } -> uma foto por vez
 *    (inspectionId também é usado para fotos de DDS, Diagnóstico, reuniões
 *    de CIPA, PT/APR, certificados e PET, com o próprio ID do registro
 *    correspondente)
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
const SHEET_DIAGNOSTICO = 'Diagnosticos';
const SHEET_DIAGNOSTICO_ITENS = 'Diagnostico_Itens';
const SHEET_CIPA_GESTAO = 'CIPA_Gestao';
const SHEET_CIPA_MEMBROS = 'CIPA_Membros';
const SHEET_CIPA_REUNIOES = 'CIPA_Reunioes';
const SHEET_CIPA_PARTICIPANTES = 'CIPA_Participantes';
const SHEET_PTAPR = 'PTAPR';
const SHEET_PTAPR_ITENS = 'PTAPR_Itens';
const SHEET_PTAPR_EQUIPE = 'PTAPR_Equipe';
const SHEET_CERTIFICADOS = 'Certificados';
const SHEET_PET = 'PET';
const SHEET_PET_ITENS = 'PET_Itens';
const SHEET_PET_LEITURAS = 'PET_Leituras';
const SHEET_PET_EQUIPE = 'PET_Equipe';

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
      case 'upsertDiagnostico':
        return jsonResponse(upsertDiagnostico(body.diagnostico));
      case 'upsertCipaGestao':
        return jsonResponse(upsertCipaGestao(body.gestao));
      case 'upsertCipaReuniao':
        return jsonResponse(upsertCipaReuniao(body.reuniao));
      case 'upsertPTAPR':
        return jsonResponse(upsertPTAPR(body.ptapr));
      case 'upsertCertificado':
        return jsonResponse(upsertCertificado(body.certificado));
      case 'upsertPET':
        return jsonResponse(upsertPET(body.pet));
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

function upsertDiagnostico(diag) {
  const rootFolder = getOrCreateDriveFolder(DRIVE_FOLDER_NAME);
  const folderName = diag.id + ' - Diagnostico - ' + (diag.identificacao.empresa || 'sem-empresa');
  const diagFolder = getOrCreateDriveFolder(folderName, rootFolder);

  const sheetDiag = getOrCreateSheet(SHEET_DIAGNOSTICO, [
    'ID', 'Data', 'Hora', 'Empresa', 'Unidade', 'Escopo',
    'Responsável Diagnóstico', 'Responsável Área', 'Score Geral (%)',
    'Plano de Ação', 'Observações', 'Recebido em', 'Pasta Drive'
  ]);

  const id = diag.id;
  const linha = [
    id,
    diag.identificacao.data,
    diag.identificacao.hora,
    diag.identificacao.empresa,
    diag.identificacao.unidade,
    diag.identificacao.escopo,
    diag.identificacao.responsavelDiagnostico,
    diag.identificacao.responsavelArea,
    diag.scoreGeral,
    diag.planoAcao,
    diag.observacoesFinais,
    new Date(),
    diagFolder.getUrl()
  ];

  const idCol = 1;
  const data = sheetDiag.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol - 1] === id) { rowIndex = i + 1; break; }
  }
  if (rowIndex > 0) {
    sheetDiag.getRange(rowIndex, 1, 1, linha.length).setValues([linha]);
  } else {
    sheetDiag.appendRow(linha);
  }

  const sheetItens = getOrCreateSheet(SHEET_DIAGNOSTICO_ITENS, [
    'Diagnóstico ID', 'Categoria', 'Score Categoria (%)', 'Item ID', 'Questão',
    'Resposta', 'Observação', 'Recebido em'
  ]);
  const itensExistentes = sheetItens.getDataRange().getValues();
  (diag.categorias || []).forEach((cat) => {
    (cat.itens || []).forEach((item) => {
      let jaExiste = false;
      for (let i = 1; i < itensExistentes.length; i++) {
        if (itensExistentes[i][0] === id && itensExistentes[i][3] === item.id) { jaExiste = true; break; }
      }
      if (!jaExiste) {
        sheetItens.appendRow([id, cat.nome, cat.score, item.id, item.texto, item.resposta, item.observacao, new Date()]);
      }
    });
  });

  return { ok: true, remoteRef: diagFolder.getId() };
}

function upsertCipaGestao(gestao) {
  const sheetGestao = getOrCreateSheet(SHEET_CIPA_GESTAO, [
    'ID', 'Empresa', 'Unidade', 'Início do Mandato', 'Fim do Mandato',
    'Qtd. Membros', 'Recebido em'
  ]);

  const id = gestao.id;
  const linha = [
    id,
    gestao.empresa,
    gestao.unidade,
    gestao.mandatoInicio,
    gestao.mandatoFim,
    (gestao.membros || []).length,
    new Date()
  ];

  const idCol = 1;
  const data = sheetGestao.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol - 1] === id) { rowIndex = i + 1; break; }
  }
  if (rowIndex > 0) {
    sheetGestao.getRange(rowIndex, 1, 1, linha.length).setValues([linha]);
  } else {
    sheetGestao.appendRow(linha);
  }

  const sheetMembros = getOrCreateSheet(SHEET_CIPA_MEMBROS, [
    'Gestão ID', 'Membro ID', 'Nome', 'Função', 'Representação', 'Tipo', 'Setor', 'Recebido em'
  ]);
  // Remove os membros antigos desta gestão antes de regravar (a lista pode
  // ser editada livremente no app, então mantemos a planilha em espelho).
  const dataMembros = sheetMembros.getDataRange().getValues();
  for (let i = dataMembros.length - 1; i >= 1; i--) {
    if (dataMembros[i][0] === id) sheetMembros.deleteRow(i + 1);
  }
  (gestao.membros || []).forEach((m) => {
    sheetMembros.appendRow([id, m.id, m.nome, m.funcao, m.representacao, m.tipo, m.setor, new Date()]);
  });

  return { ok: true, remoteRef: id };
}

function upsertCipaReuniao(reuniao) {
  const rootFolder = getOrCreateDriveFolder(DRIVE_FOLDER_NAME);
  const folderName = reuniao.id + ' - CIPA Reuniao - ' + (reuniao.identificacao.numeroAta || 'sem-numero');
  const reuniaoFolder = getOrCreateDriveFolder(folderName, rootFolder);

  const sheetReunioes = getOrCreateSheet(SHEET_CIPA_REUNIOES, [
    'ID', 'Data', 'Hora', 'Local', 'Número da Ata', 'Tipo',
    'Análise de Acidentes', 'Resultados de Inspeções', 'Plano de Trabalho',
    'Assuntos Gerais', 'Deliberações', 'Recebido em', 'Pasta Drive'
  ]);

  const id = reuniao.id;
  const linha = [
    id,
    reuniao.identificacao.data,
    reuniao.identificacao.hora,
    reuniao.identificacao.local,
    reuniao.identificacao.numeroAta,
    reuniao.identificacao.tipo,
    reuniao.pauta.analiseAcidentes,
    reuniao.pauta.resultadosInspecoes,
    reuniao.pauta.planoTrabalho,
    reuniao.pauta.assuntosGerais,
    reuniao.deliberacoes,
    new Date(),
    reuniaoFolder.getUrl()
  ];

  const idCol = 1;
  const data = sheetReunioes.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol - 1] === id) { rowIndex = i + 1; break; }
  }
  if (rowIndex > 0) {
    sheetReunioes.getRange(rowIndex, 1, 1, linha.length).setValues([linha]);
  } else {
    sheetReunioes.appendRow(linha);
  }

  const sheetParticipantes = getOrCreateSheet(SHEET_CIPA_PARTICIPANTES, [
    'Reunião ID', 'Participante ID', 'Nome', 'Função', 'Assinado', 'Recebido em'
  ]);
  const existentes = sheetParticipantes.getDataRange().getValues();
  (reuniao.participantes || []).forEach((p) => {
    let jaExiste = false;
    for (let i = 1; i < existentes.length; i++) {
      if (existentes[i][0] === id && existentes[i][1] === p.id) { jaExiste = true; break; }
    }
    if (!jaExiste) {
      sheetParticipantes.appendRow([id, p.id, p.nome, p.funcao, p.assinado, new Date()]);
    }
  });

  return { ok: true, remoteRef: reuniaoFolder.getId() };
}

function upsertPTAPR(pt) {
  const rootFolder = getOrCreateDriveFolder(DRIVE_FOLDER_NAME);
  const folderName = pt.id + ' - PTAPR - ' + (pt.identificacao.empresa || 'sem-empresa');
  const ptFolder = getOrCreateDriveFolder(folderName, rootFolder);

  const sheetPT = getOrCreateSheet(SHEET_PTAPR, [
    'ID', 'Data', 'Hora Início', 'Empresa', 'Unidade', 'Área', 'Local Específico',
    'Atividade', 'Emitente', 'Supervisor Área', 'Responsável pela Atividade', 'SESMT',
    'Tipos de Trabalho', 'Medidas de Controle', 'Data Encerramento', 'Hora Encerramento',
    'Área Organizada', 'Observações Encerramento', 'Recebido em', 'Pasta Drive'
  ]);

  const id = pt.id;
  const enc = pt.encerramento || {};
  const linha = [
    id,
    pt.identificacao.data,
    pt.identificacao.hora,
    pt.identificacao.empresa,
    pt.identificacao.unidade,
    pt.identificacao.area,
    pt.identificacao.localEspecifico,
    pt.identificacao.atividade,
    pt.identificacao.emitente,
    pt.identificacao.supervisorArea,
    pt.identificacao.responsavelAtividade,
    pt.identificacao.sesmt,
    (pt.tiposTrabalho || []).join(', '),
    pt.medidasControle,
    enc.data,
    enc.hora,
    enc.areaOrganizada,
    enc.observacoes,
    new Date(),
    ptFolder.getUrl()
  ];

  const idCol = 1;
  const data = sheetPT.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol - 1] === id) { rowIndex = i + 1; break; }
  }
  if (rowIndex > 0) {
    sheetPT.getRange(rowIndex, 1, 1, linha.length).setValues([linha]);
  } else {
    sheetPT.appendRow(linha);
  }

  const sheetItens = getOrCreateSheet(SHEET_PTAPR_ITENS, [
    'PTAPR ID', 'Item ID', 'Questão', 'Resposta', 'Observação', 'Recebido em'
  ]);
  const itensExistentes = sheetItens.getDataRange().getValues();
  (pt.checklist || []).forEach((item) => {
    let jaExiste = false;
    for (let i = 1; i < itensExistentes.length; i++) {
      if (itensExistentes[i][0] === id && itensExistentes[i][1] === item.id) { jaExiste = true; break; }
    }
    if (!jaExiste) {
      sheetItens.appendRow([id, item.id, item.texto, item.resposta, item.observacao, new Date()]);
    }
  });

  const sheetEquipe = getOrCreateSheet(SHEET_PTAPR_EQUIPE, [
    'PTAPR ID', 'Membro ID', 'Nome', 'Função', 'Assinado', 'Recebido em'
  ]);
  const equipeExistente = sheetEquipe.getDataRange().getValues();
  (pt.equipe || []).forEach((p) => {
    let jaExiste = false;
    for (let i = 1; i < equipeExistente.length; i++) {
      if (equipeExistente[i][0] === id && equipeExistente[i][1] === p.id) { jaExiste = true; break; }
    }
    if (!jaExiste) {
      sheetEquipe.appendRow([id, p.id, p.nome, p.funcao, p.assinado, new Date()]);
    }
  });

  return { ok: true, remoteRef: ptFolder.getId() };
}

function upsertCertificado(cert) {
  const rootFolder = getOrCreateDriveFolder(DRIVE_FOLDER_NAME);
  const folderName = cert.id + ' - Certificado - ' + (cert.colaborador || 'sem-nome');
  const certFolder = getOrCreateDriveFolder(folderName, rootFolder);

  const sheetCert = getOrCreateSheet(SHEET_CERTIFICADOS, [
    'ID', 'Colaborador', 'Função', 'Setor', 'Tipo', 'Instituição',
    'Carga Horária', 'Nº Certificado', 'Data Emissão', 'Data Validade',
    'Observações', 'Recebido em', 'Pasta Drive'
  ]);

  const id = cert.id;
  const linha = [
    id,
    cert.colaborador,
    cert.funcao,
    cert.setor,
    cert.tipo,
    cert.instituicao,
    cert.cargaHoraria,
    cert.numeroCertificado,
    cert.dataEmissao,
    cert.dataValidade,
    cert.observacoes,
    new Date(),
    certFolder.getUrl()
  ];

  const idCol = 1;
  const data = sheetCert.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol - 1] === id) { rowIndex = i + 1; break; }
  }
  if (rowIndex > 0) {
    sheetCert.getRange(rowIndex, 1, 1, linha.length).setValues([linha]);
  } else {
    sheetCert.appendRow(linha);
  }

  return { ok: true, remoteRef: certFolder.getId() };
}

function upsertPET(pet) {
  const rootFolder = getOrCreateDriveFolder(DRIVE_FOLDER_NAME);
  const folderName = pet.id + ' - PET - ' + (pet.identificacao.localEspaco || 'sem-identificacao');
  const petFolder = getOrCreateDriveFolder(folderName, rootFolder);

  const sheetPET = getOrCreateSheet(SHEET_PET, [
    'ID', 'Data', 'Hora Início', 'Empresa', 'Unidade', 'Área', 'Espaço Confinado',
    'Descrição do Espaço', 'Atividade', 'Supervisor de Entrada', 'Vigia',
    'Validade Início', 'Validade Fim', 'Data Encerramento', 'Hora Encerramento',
    'Área Liberada', 'Observações Encerramento', 'Recebido em', 'Pasta Drive'
  ]);

  const id = pet.id;
  const enc = pet.encerramento || {};
  const linha = [
    id,
    pet.identificacao.data,
    pet.identificacao.hora,
    pet.identificacao.empresa,
    pet.identificacao.unidade,
    pet.identificacao.area,
    pet.identificacao.localEspaco,
    pet.identificacao.descricaoEspaco,
    pet.identificacao.atividade,
    pet.identificacao.supervisorEntrada,
    pet.identificacao.vigia,
    pet.identificacao.validadeInicio,
    pet.identificacao.validadeFim,
    enc.data,
    enc.hora,
    enc.areaLiberada,
    enc.observacoes,
    new Date(),
    petFolder.getUrl()
  ];

  const idCol = 1;
  const data = sheetPET.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol - 1] === id) { rowIndex = i + 1; break; }
  }
  if (rowIndex > 0) {
    sheetPET.getRange(rowIndex, 1, 1, linha.length).setValues([linha]);
  } else {
    sheetPET.appendRow(linha);
  }

  const sheetItens = getOrCreateSheet(SHEET_PET_ITENS, [
    'PET ID', 'Item ID', 'Questão', 'Resposta', 'Observação', 'Recebido em'
  ]);
  const itensExistentes = sheetItens.getDataRange().getValues();
  (pet.checklist || []).forEach((item) => {
    let jaExiste = false;
    for (let i = 1; i < itensExistentes.length; i++) {
      if (itensExistentes[i][0] === id && itensExistentes[i][1] === item.id) { jaExiste = true; break; }
    }
    if (!jaExiste) {
      sheetItens.appendRow([id, item.id, item.texto, item.resposta, item.observacao, new Date()]);
    }
  });

  const sheetLeituras = getOrCreateSheet(SHEET_PET_LEITURAS, [
    'PET ID', 'Leitura ID', 'Horário', 'O2 (%)', 'LII (%)', 'CO (ppm)', 'H2S (ppm)',
    'Responsável', 'Observação', 'Recebido em'
  ]);
  const leiturasExistentes = sheetLeituras.getDataRange().getValues();
  (pet.leituras || []).forEach((l) => {
    let jaExiste = false;
    for (let i = 1; i < leiturasExistentes.length; i++) {
      if (leiturasExistentes[i][0] === id && leiturasExistentes[i][1] === l.id) { jaExiste = true; break; }
    }
    if (!jaExiste) {
      sheetLeituras.appendRow([id, l.id, l.horario, l.oxigenio, l.explosividade, l.monoxido, l.sulfidrico, l.responsavel, l.observacao, new Date()]);
    }
  });

  const sheetEquipe = getOrCreateSheet(SHEET_PET_EQUIPE, [
    'PET ID', 'Membro ID', 'Nome', 'Função', 'Assinado', 'Recebido em'
  ]);
  const equipeExistente = sheetEquipe.getDataRange().getValues();
  (pet.equipe || []).forEach((p) => {
    let jaExiste = false;
    for (let i = 1; i < equipeExistente.length; i++) {
      if (equipeExistente[i][0] === id && equipeExistente[i][1] === p.id) { jaExiste = true; break; }
    }
    if (!jaExiste) {
      sheetEquipe.appendRow([id, p.id, p.nome, p.funcao, p.assinado, new Date()]);
    }
  });

  return { ok: true, remoteRef: petFolder.getId() };
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
