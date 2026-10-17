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
 *  - { action: "upsertInvestigacao", investigacao } -> Investigação de Acidente de Trabalho (RIAT)
 *  - { action: "upsertFichaEPI", ficha }            -> Ficha de Controle de EPI (NR-6)
 *  - { action: "upsertVeiculo", veiculo }           -> Vistoria de Veículo (checklist + croqui de avarias)
 *  - { action: "upsertPGR", pgr }                   -> Programa de Gerenciamento de Riscos (GRO/NR-01)
 *  - { action: "upsertRelato", relato }             -> Relato de quase acidente / condição insegura
 *  - { action: "upsertAcao", acao }                 -> Ação avulsa da Central de ações
 *  - { action: "upsertObservacao", observacao }     -> Observação comportamental
 *  - { action: "upsertAcoesConsolidadas", acoes }   -> lista de ações do aparelho (painel do gestor)
 *  - { action: "listarAcoes" }                     -> ações de toda a equipe (Central de ações)
 *  - { action: "atualizarAcao", acao }              -> alteração feita em outro aparelho
 *  - { action: "login", usuarioLogin, pin }         -> confere usuário e PIN (aba Usuarios)
 *  - { action: "uploadPhoto", inspectionId, photo } -> uma foto por vez
 *    (inspectionId também é usado para fotos de DDS, Diagnóstico, reuniões
 *    de CIPA, PT/APR, certificados, PET, investigações de acidente e
 *    vistorias de veículo, com o próprio ID do registro correspondente)
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
const SHEET_INVESTIGACAO = 'Investigacoes_Acidente';
const SHEET_INVESTIGACAO_PERGUNTAS = 'Investigacao_Perguntas';
const SHEET_INVESTIGACAO_PLANO = 'Investigacao_Plano_Acao';
const SHEET_EPI = 'Fichas_EPI';
const SHEET_EPI_ENTREGAS = 'Fichas_EPI_Entregas';
const SHEET_VEICULO = 'Veiculos';
const SHEET_VEICULO_ITENS = 'Veiculos_Itens';
const SHEET_VEICULO_AVARIAS = 'Veiculos_Avarias';
const SHEET_PGR = 'PGR';
const SHEET_PGR_GHES = 'PGR_GHEs';
const SHEET_PGR_PERIGOS = 'PGR_Perigos';
const SHEET_PGR_TREINAMENTOS = 'PGR_Treinamentos';
const SHEET_PGR_EXERCICIOS = 'PGR_Exercicios_Simulados';
const SHEET_RELATOS = 'Relatos';
const SHEET_ACOES = 'Acoes_Avulsas';
const SHEET_OBSERVACOES = 'Observacoes_Comportamentais';

const SHEET_USUARIOS = 'Usuarios';
const SHEET_HISTORICO_ACOES = 'Historico_Acoes';

const VERSAO_SERVIDOR = '2026-10-17';

/** Nome do usuário autenticado na requisição atual (vazio quando o login não está ativo). */
let USUARIO_ATUAL = '';
/** Perfil do usuário autenticado (Gestor, Inspetor ou Responsável); vazio sem login. */
let PERFIL_ATUAL = '';

/**
 * O que cada perfil pode enviar ao servidor. Espelha os módulos de cada
 * perfil no app (PERFIS_USO em js/menu.js): sem isso, o perfil só existia na
 * tela do celular e qualquer usuário conseguia gravar qualquer registro.
 * O Gestor pode tudo.
 */
const ACOES_POR_PERFIL = {
  'Inspetor': ['ping', 'listarAcoes', 'atualizarAcao', 'uploadPhoto', 'upsertInspection', 'upsertDiagnostico',
    'upsertVeiculo', 'upsertPTAPR', 'upsertPET', 'upsertRelato', 'upsertObservacao', 'upsertAcao',
    'upsertAcoesConsolidadas', 'listarRelatosQR', 'marcarRelatoQRImportado'],
  'Responsável': ['ping', 'listarAcoes', 'atualizarAcao', 'uploadPhoto', 'upsertAcoesConsolidadas']
};

/** Limite de PINs errados por usuário antes do bloqueio, e duração do bloqueio (segundos). */
const MAX_FALHAS_PIN = 5;
const BLOQUEIO_PIN_SEGUNDOS = 900;

/** Abrir o endereço do app da Web no navegador mostra se o servidor está no ar. */
function doGet() {
  return ContentService.createTextOutput(
    'Servidor do Inspeções SSMA funcionando. Versão ' + VERSAO_SERVIDOR + '.'
  ).setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ ok: false, error: 'JSON inválido: ' + err.message });
  }

  // Relato pelo QR Code: vem de qualquer celular, sem app, sem chave e sem
  // login. Só grava na aba Relatos_QR, exige o código do QR e tem limite por hora.
  if (body.action === 'relatoPublico') return jsonResponse(receberRelatoPublico_(body));

  // Chave de acesso: se a propriedade CHAVE_ACESSO estiver definida em
  // Configurações do projeto > Propriedades do script, só aceita requisições
  // que tragam a mesma chave (definida também nas Configurações do app).
  const chaveEsperada = PropertiesService.getScriptProperties().getProperty('CHAVE_ACESSO');
  if (chaveEsperada && body.chave !== chaveEsperada) {
    return jsonResponse({ ok: false, error: 'Chave de acesso inválida. Confira a chave nas Configurações do app.' });
  }

  // Login por usuário e PIN: fica ativo quando a aba "Usuarios" tem ao menos
  // um usuário ativo. Sem usuários cadastrados, o app funciona como antes.
  const usuarios = lerUsuarios_();
  if (body.action === 'login') return jsonResponse(fazerLogin_(usuarios, body.usuarioLogin, body.pin));
  if (usuarios.length && body.action !== 'ping') {
    // O limite de tentativas vale para toda requisição, não só para a tela de
    // login: antes, o PIN podia ser testado sem limite por qualquer outra ação.
    const conferido = conferirPin_(usuarios, body.usuarioLogin, body.pin);
    if (!conferido.ok) {
      return jsonResponse({ ok: false, loginInvalido: true, error: conferido.bloqueado
        ? conferido.error
        : 'Usuário ou PIN inválido. Entre novamente em Configurações → Acesso do usuário.' });
    }
    USUARIO_ATUAL = conferido.usuario.nome;
    PERFIL_ATUAL = conferido.usuario.perfil;
    const permitidas = ACOES_POR_PERFIL[PERFIL_ATUAL];
    if (permitidas && permitidas.indexOf(body.action) < 0) {
      return jsonResponse({ ok: false, error: 'O perfil ' + PERFIL_ATUAL + ' não pode enviar este tipo de registro. Peça ao gestor para ajustar seu perfil na aba Usuarios.' });
    }
  }

  // Texto começando com =, +, - ou @ seria lido pela planilha como fórmula.
  body = protegerContraFormulas_(body);

  // Leituras não precisam de trava; gravações são feitas uma de cada vez,
  // para dois celulares não escreverem a mesma linha ao mesmo tempo.
  const somenteLeitura = ['ping', 'listarAcoes', 'listarRelatosQR'].indexOf(body.action) >= 0;
  const trava = somenteLeitura ? null : LockService.getScriptLock();
  try {
    if (trava) trava.waitLock(30000);
    switch (body.action) {
      case 'ping':
        // "protegido" avisa o app quando o servidor aceita dados de qualquer
        // pessoa que tenha o endereço (sem chave de acesso e sem usuários).
        return jsonResponse({ ok: true, versao: VERSAO_SERVIDOR, loginAtivo: usuarios.length > 0, protegido: !!chaveEsperada || usuarios.length > 0 });
      case 'listarAcoes':
        return jsonResponse(listarAcoes());
      case 'atualizarAcao':
        return jsonResponse(atualizarAcao(body.acao));
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
      case 'upsertInvestigacao':
        return jsonResponse(upsertInvestigacao(body.investigacao));
      case 'upsertFichaEPI':
        return jsonResponse(upsertFichaEPI(body.ficha));
      case 'upsertVeiculo':
        return jsonResponse(upsertVeiculo(body.veiculo));
      case 'upsertPGR':
        return jsonResponse(upsertPGR(body.pgr));
      case 'upsertRelato':
        return jsonResponse(upsertRelato(body.relato));
      case 'upsertAcao':
        return jsonResponse(upsertAcao(body.acao));
      case 'upsertAcoesConsolidadas':
        return jsonResponse(upsertAcoesConsolidadas(body.acoes, body.usuario));
      case 'upsertObservacao':
        return jsonResponse(upsertObservacao(body.observacao));
      case 'uploadPhoto':
        return jsonResponse(uploadPhoto(body.inspectionId, body.photo));
      case 'codigoRelatoQR':
        return jsonResponse(codigoRelatoQR_(body.novo === true));
      case 'listarRelatosQR':
        return jsonResponse(listarRelatosQR_());
      case 'marcarRelatoQRImportado':
        return jsonResponse(marcarRelatoQRImportado_(body.id));
      default:
        return jsonResponse({ ok: false, error: 'Ação desconhecida: ' + body.action });
    }
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  } finally {
    if (trava) trava.releaseLock();
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
  } else if (sheet.getLastColumn() < headers.length) {
    // Colunas novas são sempre acrescentadas no fim: atualiza só o cabeçalho.
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
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
  let rowIndex = linhaDoId(sheetInsp, id);
  if (rowIndex > 0) {
    sheetInsp.getRange(rowIndex, 1, 1, linha.length).setValues([linha]);
  } else {
    sheetInsp.appendRow(linha);
    rowIndex = sheetInsp.getLastRow();
  }

  // Colunas acrescentadas depois da versão original: localizadas pelo
  // cabeçalho e criadas no fim da aba, para não deslocar as existentes.
  gravarColunaExtra(sheetInsp, rowIndex, 'Disciplina', insp.disciplina);
  gravarColunaExtra(sheetInsp, rowIndex, 'Equipamento', insp.equipamento);
  gravarColunaExtra(sheetInsp, rowIndex, 'Conformidade (%)', insp.conformidade);
  gravarColunaExtra(sheetInsp, rowIndex, 'Qtd. NC', insp.qtdNC);
  gravarColunaExtra(sheetInsp, rowIndex, 'Duração (min)', insp.duracaoMin);
  gravarColunaExtra(sheetInsp, rowIndex, 'Registrado por', body_usuario_(insp));
  gravarColunaExtra(sheetInsp, rowIndex, 'Qtd. NC Alta/Crítica', insp.qtdNCAltasCriticas === undefined ? '' : insp.qtdNCAltasCriticas);
  gravarColunaExtra(sheetInsp, rowIndex, 'Qtd. NC Reincidentes', insp.qtdNCReincidentes === undefined ? '' : insp.qtdNCReincidentes);

  // Se o painel de ações já foi criado, o status marcado na Central de ações
  // do app atualiza a coluna "Status da Ação" desta inspeção.
  if (insp.fechamento.statusAcao) {
    const cab = sheetInsp.getRange(1, 1, 1, sheetInsp.getLastColumn()).getValues()[0];
    const colStatus = cab.indexOf('Status da Ação') + 1;
    if (colStatus) {
      sheetInsp.getRange(rowIndex, colStatus).setValue(insp.fechamento.statusAcao === 'Concluída' ? 'Resolvida' : 'Pendente');
    }
  }

  const sheetItens = getOrCreateSheet(SHEET_ITENS, [
    'Inspeção ID', 'Item ID', 'Questão', 'Resposta', 'Observação',
    'Medida de Controle', 'Personalizado', 'Recebido em', 'Criticidade', 'Reincidente',
    'Data', 'Área', 'Empresa', 'Tipo de Inspeção'
  ]);
  // Uma linha por item; atualizada a cada envio (a criticidade e a resposta
  // podem mudar quando a inspeção é editada). Base do mapa de calor no Looker.
  const itensExistentes = sheetItens.getDataRange().getValues();
  (insp.checklist || []).forEach((item) => {
    const linhaItem = [
      id, item.id, item.texto, item.resposta, item.observacao,
      item.medida, item.personalizado, new Date(), item.criticidade || '', item.reincidente ? 'Sim' : 'Não',
      insp.identificacao.data, insp.identificacao.area, insp.identificacao.empresa, insp.tipoInspecao
    ];
    let linhaExistente = -1;
    for (let i = 1; i < itensExistentes.length; i++) {
      if (itensExistentes[i][0] === id && itensExistentes[i][1] === item.id) { linhaExistente = i + 1; break; }
    }
    if (linhaExistente > 0) sheetItens.getRange(linhaExistente, 1, 1, linhaItem.length).setValues([linhaItem]);
    else sheetItens.appendRow(linhaItem);
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
  let rowIndex = linhaDoId(sheetDDS, id);
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
  let rowIndex = linhaDoId(sheetDiag, id);
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
  let rowIndex = linhaDoId(sheetGestao, id);
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
  let rowIndex = linhaDoId(sheetReunioes, id);
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
  let rowIndex = linhaDoId(sheetPT, id);
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
  let rowIndex = linhaDoId(sheetCert, id);
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
  let rowIndex = linhaDoId(sheetPET, id);
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

function upsertInvestigacao(inv) {
  const rootFolder = getOrCreateDriveFolder(DRIVE_FOLDER_NAME);
  const folderName = inv.id + ' - Investigacao - ' + (inv.acidentado.nome || 'sem-nome');
  const invFolder = getOrCreateDriveFolder(folderName, rootFolder);

  const sheetInv = getOrCreateSheet(SHEET_INVESTIGACAO, [
    'ID', 'Data', 'Hora', 'Empresa', 'Unidade', 'Local', 'Turno', 'Tipo de Acidente',
    'Gravidade', 'Dias de Afastamento', 'CAT Emitida', 'Nº CAT', 'Parte do Corpo Atingida',
    'Agente Causador', 'Natureza da Lesão', 'Nome do Acidentado', 'Função', 'Setor',
    'Tempo de Empresa', 'Tempo na Função', 'Descrição do Acidente', 'Testemunhas',
    'Causas Imediatas', 'Causas Básicas', 'Investigador', 'Recebido em', 'Pasta Drive',
    // Colunas novas sempre no fim, para não deslocar as existentes (Looker Studio).
    'Problema (5 Porquês)', '1º Porquê', '2º Porquê', '3º Porquê', '4º Porquê', '5º Porquê', 'Causa Raiz',
    'Ishikawa: Método', 'Ishikawa: Máquina', 'Ishikawa: Material', 'Ishikawa: Mão de obra',
    'Ishikawa: Meio ambiente', 'Ishikawa: Medida'
  ]);
  const cp = inv.cincoPorques || {};
  const porques = cp.porques || [];
  const ish = inv.ishikawa || {};

  const id = inv.id;
  const ac = inv.acidente;
  const acidentado = inv.acidentado;
  const linha = [
    id,
    ac.data,
    ac.hora,
    ac.empresa,
    ac.unidade,
    ac.local,
    ac.turno,
    ac.tipo,
    ac.gravidade,
    ac.diasAfastamento,
    ac.catEmitida,
    ac.catNumero,
    ac.parteCorpoAtingida,
    ac.agenteCausador,
    ac.naturezaLesao,
    acidentado.nome,
    acidentado.funcao,
    acidentado.setor,
    acidentado.tempoEmpresa,
    acidentado.tempoFuncao,
    inv.descricao,
    inv.testemunhas,
    inv.causasImediatas,
    inv.causasBasicas,
    inv.investigador,
    new Date(),
    invFolder.getUrl(),
    cp.problema || '', porques[0] || '', porques[1] || '', porques[2] || '', porques[3] || '', porques[4] || '', cp.causaRaiz || '',
    ish.metodo || '', ish.maquina || '', ish.material || '', ish.maoDeObra || '', ish.meioAmbiente || '', ish.medida || ''
  ];

  const idCol = 1;
  let rowIndex = linhaDoId(sheetInv, id);
  if (rowIndex > 0) {
    sheetInv.getRange(rowIndex, 1, 1, linha.length).setValues([linha]);
  } else {
    sheetInv.appendRow(linha);
  }

  const sheetPerguntas = getOrCreateSheet(SHEET_INVESTIGACAO_PERGUNTAS, [
    'Investigação ID', 'Pergunta ID', 'Pergunta', 'Resposta', 'Observação', 'Recebido em'
  ]);
  const perguntasExistentes = sheetPerguntas.getDataRange().getValues();
  (inv.perguntas || []).forEach((item) => {
    let jaExiste = false;
    for (let i = 1; i < perguntasExistentes.length; i++) {
      if (perguntasExistentes[i][0] === id && perguntasExistentes[i][1] === item.id) { jaExiste = true; break; }
    }
    if (!jaExiste) {
      sheetPerguntas.appendRow([id, item.id, item.texto, item.resposta, item.observacao, new Date()]);
    }
  });

  const sheetPlano = getOrCreateSheet(SHEET_INVESTIGACAO_PLANO, [
    'Investigação ID', 'Ação ID', 'Descrição', 'Responsável', 'Prazo', 'Status', 'Recebido em'
  ]);
  // A lista de ações pode ser editada livremente no app (removida, alterada
  // de status), então mantemos a planilha em espelho a cada sincronização.
  const dataPlano = sheetPlano.getDataRange().getValues();
  for (let i = dataPlano.length - 1; i >= 1; i--) {
    if (dataPlano[i][0] === id) sheetPlano.deleteRow(i + 1);
  }
  (inv.planoAcao || []).forEach((a) => {
    sheetPlano.appendRow([id, a.id, a.descricao, a.responsavel, a.prazo, a.status, new Date()]);
  });

  return { ok: true, remoteRef: invFolder.getId() };
}

function upsertFichaEPI(ficha) {
  const sheetFicha = getOrCreateSheet(SHEET_EPI, [
    'ID', 'Colaborador', 'Função', 'Setor', 'Qtd. Entregas', 'Recebido em'
  ]);

  const id = ficha.id;
  const linha = [
    id,
    ficha.colaborador,
    ficha.funcao,
    ficha.setor,
    (ficha.entregas || []).length,
    new Date()
  ];

  const idCol = 1;
  let rowIndex = linhaDoId(sheetFicha, id);
  if (rowIndex > 0) {
    sheetFicha.getRange(rowIndex, 1, 1, linha.length).setValues([linha]);
  } else {
    sheetFicha.appendRow(linha);
  }

  const sheetEntregas = getOrCreateSheet(SHEET_EPI_ENTREGAS, [
    'Ficha ID', 'Entrega ID', 'EPI', 'CA', 'Data de Entrega', 'Quantidade',
    'Motivo', 'Assinado', 'Recebido em'
  ]);
  // A lista de entregas pode ser editada livremente no app (removida,
  // corrigida), então mantemos a planilha em espelho a cada sincronização.
  const dataEntregas = sheetEntregas.getDataRange().getValues();
  for (let i = dataEntregas.length - 1; i >= 1; i--) {
    if (dataEntregas[i][0] === id) sheetEntregas.deleteRow(i + 1);
  }
  (ficha.entregas || []).forEach((e) => {
    sheetEntregas.appendRow([id, e.id, e.epi, e.ca, e.dataEntrega, e.quantidade, e.motivo, e.assinado, new Date()]);
  });

  return { ok: true, remoteRef: id };
}

function upsertVeiculo(v) {
  const rootFolder = getOrCreateDriveFolder(DRIVE_FOLDER_NAME);
  const folderName = v.id + ' - Veiculo - ' + (v.identificacao.placa || 'sem-placa');
  const vFolder = getOrCreateDriveFolder(folderName, rootFolder);

  const sheetVeiculo = getOrCreateSheet(SHEET_VEICULO, [
    'ID', 'Data', 'Hora', 'Empresa', 'Unidade', 'Placa', 'Marca', 'Modelo',
    'Quilometragem', 'Condutor', 'Classificação Geral', 'Condições de Uso',
    'Responsável pela Vistoria', 'Observações Finais', 'Recebido em', 'Pasta Drive'
  ]);

  const id = v.id;
  const ident = v.identificacao;
  const f = v.fechamento || {};
  const linha = [
    id,
    ident.data,
    ident.hora,
    ident.empresa,
    ident.unidade,
    ident.placa,
    ident.marca,
    ident.modelo,
    ident.km,
    ident.condutor,
    f.classificacaoGeral,
    f.condicoesUso,
    f.responsavelVistoria,
    f.observacoesFinais,
    new Date(),
    vFolder.getUrl()
  ];

  const idCol = 1;
  let rowIndex = linhaDoId(sheetVeiculo, id);
  if (rowIndex > 0) {
    sheetVeiculo.getRange(rowIndex, 1, 1, linha.length).setValues([linha]);
  } else {
    sheetVeiculo.appendRow(linha);
  }

  const sheetItens = getOrCreateSheet(SHEET_VEICULO_ITENS, [
    'Veículo ID', 'Item ID', 'Questão', 'Resposta', 'Observação', 'Recebido em'
  ]);
  const itensExistentes = sheetItens.getDataRange().getValues();
  (v.checklist || []).forEach((item) => {
    let jaExiste = false;
    for (let i = 1; i < itensExistentes.length; i++) {
      if (itensExistentes[i][0] === id && itensExistentes[i][1] === item.id) { jaExiste = true; break; }
    }
    if (!jaExiste) {
      sheetItens.appendRow([id, item.id, item.texto, item.resposta, item.observacao, new Date()]);
    }
  });

  const sheetAvarias = getOrCreateSheet(SHEET_VEICULO_AVARIAS, [
    'Veículo ID', 'Avaria ID', 'Posição X (%)', 'Posição Y (%)', 'Tipo', 'Descrição', 'Recebido em'
  ]);
  // A lista de avarias pode ser editada livremente no app (removida,
  // corrigida), então mantemos a planilha em espelho a cada sincronização.
  const dataAvarias = sheetAvarias.getDataRange().getValues();
  for (let i = dataAvarias.length - 1; i >= 1; i--) {
    if (dataAvarias[i][0] === id) sheetAvarias.deleteRow(i + 1);
  }
  (v.avarias || []).forEach((a) => {
    sheetAvarias.appendRow([id, a.id, a.x, a.y, a.tipo, a.descricao, new Date()]);
  });

  return { ok: true, remoteRef: vFolder.getId() };
}

function upsertPGR(p) {
  const sheetPGR = getOrCreateSheet(SHEET_PGR, [
    'ID', 'Empresa', 'Unidade', 'Responsável Técnico', 'Data de Elaboração',
    'Próxima Revisão', 'Caracterização do Processo e Ambiente de Trabalho',
    'Primeiros Socorros / Encaminhamento', 'Procedimento de Abandono',
    'Medidas para Emergências de Grande Magnitude', 'Periodicidade de Exercícios',
    'Qtd. Perigos', 'Recebido em',
    'CNPJ', 'CNAE', 'Atividade Principal', 'Grau de Risco', 'Endereço', 'Regime de Trabalho',
    'Consulta aos Trabalhadores', 'Controle de Revisões', 'Requisitos da NR Setorial'
  ]);

  const id = p.id;
  const emergencia = p.emergencia || {};
  const linha = [
    id,
    p.empresa,
    p.unidade,
    p.responsavelPGR,
    p.dataElaboracao,
    p.proximaRevisao,
    p.caracterizacaoAmbiente,
    emergencia.meiosPrimeirosSocorros,
    emergencia.procedimentoAbandono,
    emergencia.medidasGrandeMagnitude,
    emergencia.periodicidadeExercicios,
    (p.perigos || []).length,
    new Date(),
    p.cnpj, p.cnae, p.atividadePrincipal, p.grauRisco, p.endereco, p.regimeTrabalho,
    p.consultaTrabalhadores, p.revisoes, p.requisitosEspecificos
  ];

  const idCol = 1;
  let rowIndex = linhaDoId(sheetPGR, id);
  if (rowIndex > 0) {
    sheetPGR.getRange(rowIndex, 1, 1, linha.length).setValues([linha]);
  } else {
    sheetPGR.appendRow(linha);
  }

  const sheetGHEs = getOrCreateSheet(SHEET_PGR_GHES, [
    'PGR ID', 'GHE ID', 'Nome', 'Setor', 'Função', 'Nº de Trabalhadores', 'Recebido em',
    'Descrição das Atividades'
  ]);
  const dataGHEs = sheetGHEs.getDataRange().getValues();
  for (let i = dataGHEs.length - 1; i >= 1; i--) {
    if (dataGHEs[i][0] === id) sheetGHEs.deleteRow(i + 1);
  }
  (p.ghes || []).forEach((g) => {
    sheetGHEs.appendRow([id, g.id, g.nome, g.setor, g.funcao, g.numTrabalhadores, new Date(), g.descricaoAtividades]);
  });

  const sheetPerigos = getOrCreateSheet(SHEET_PGR_PERIGOS, [
    'PGR ID', 'Perigo ID', 'GHE', 'Perigo', 'Lesão / Agravo à Saúde', 'Fonte',
    'Tipo de Exposição', 'Tempo / Frequência de Exposição', 'Tipo de Risco',
    'Severidade', 'Probabilidade', 'Nível de Risco', 'Medidas Existentes',
    'Medidas Propostas', 'Severidade Residual', 'Probabilidade Residual',
    'Nível de Risco Residual', 'Responsável', 'Prazo', 'Status', 'Recebido em',
    'Referência / Limite', 'Tipo de Avaliação', 'Resultado da Avaliação', 'Tipo de Medida',
    'Acompanhamento e Aferição'
  ]);
  // A lista de perigos pode ser editada livremente no app (removida,
  // reavaliada), então mantemos a planilha em espelho a cada sincronização.
  const dataPerigos = sheetPerigos.getDataRange().getValues();
  for (let i = dataPerigos.length - 1; i >= 1; i--) {
    if (dataPerigos[i][0] === id) sheetPerigos.deleteRow(i + 1);
  }
  (p.perigos || []).forEach((item) => {
    sheetPerigos.appendRow([
      id, item.id, item.ghe, item.perigo, item.lesaoAgravo, item.fonte,
      item.tipoExposicao, item.tempoExposicao, item.tipoRisco,
      item.severidade, item.probabilidade, item.nivelRisco, item.medidasExistentes,
      item.medidasPropostas, item.severidadeResidual, item.probabilidadeResidual,
      item.nivelRiscoResidual, item.responsavel, item.prazo, item.status, new Date(),
      item.referencia, item.tipoAvaliacao, item.resultadoAvaliacao, item.tipoMedida,
      item.acompanhamento
    ]);
  });

  const sheetTreinamentos = getOrCreateSheet(SHEET_PGR_TREINAMENTOS, [
    'PGR ID', 'Treinamento ID', 'Treinamento / Norma', 'Público-alvo (GHE)',
    'Carga Horária', 'Periodicidade', 'Responsável', 'Data Prevista', 'Status', 'Recebido em'
  ]);
  const dataTreinamentos = sheetTreinamentos.getDataRange().getValues();
  for (let i = dataTreinamentos.length - 1; i >= 1; i--) {
    if (dataTreinamentos[i][0] === id) sheetTreinamentos.deleteRow(i + 1);
  }
  (p.treinamentos || []).forEach((item) => {
    sheetTreinamentos.appendRow([
      id, item.id, item.nome, item.ghe, item.cargaHoraria, item.periodicidade,
      item.responsavel, item.dataPrevista, item.status, new Date()
    ]);
  });

  const sheetExercicios = getOrCreateSheet(SHEET_PGR_EXERCICIOS, [
    'PGR ID', 'Exercício ID', 'Data', 'Descrição', 'Participantes', 'Qtd. Fotos', 'Recebido em'
  ]);
  const dataExercicios = sheetExercicios.getDataRange().getValues();
  for (let i = dataExercicios.length - 1; i >= 1; i--) {
    if (dataExercicios[i][0] === id) sheetExercicios.deleteRow(i + 1);
  }
  (p.exerciciosSimulados || []).forEach((item) => {
    sheetExercicios.appendRow([
      id, item.id, item.data, item.descricao, item.participantes, item.qtdFotos, new Date()
    ]);
  });

  return { ok: true, remoteRef: id };
}

/** Grava um valor numa coluna identificada pelo título; cria a coluna no fim se ela não existir. */
function gravarColunaExtra(sheet, rowIndex, titulo, valor) {
  if (valor === undefined || valor === null) return;
  const cab = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
  let col = cab.indexOf(titulo) + 1;
  if (!col) {
    col = sheet.getLastColumn() + 1;
    sheet.getRange(1, col).setValue(titulo);
  }
  sheet.getRange(rowIndex, col).setValue(valor);
}

function body_usuario_(registro) {
  if (USUARIO_ATUAL) return USUARIO_ATUAL;
  return registro && registro.usuario ? registro.usuario : '';
}

/** Linha (1-based) do registro com este ID na coluna A, ou -1. Busca direta, sem ler a aba inteira. */
function linhaDoId(sheet, id) {
  if (!id || sheet.getLastRow() < 2) return -1;
  const achado = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1)
    .createTextFinder(String(id)).matchEntireCell(true).findNext();
  return achado ? achado.getRow() : -1;
}

/* ---------------- USUÁRIOS E LOGIN ---------------- */

function normalizarNome_(t) {
  return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function normalizarPerfil_(p) {
  const n = normalizarNome_(p);
  if (n.indexOf('gestor') === 0) return 'Gestor';
  if (n.indexOf('respons') === 0) return 'Responsável';
  return 'Inspetor';
}

/**
 * Aba "Usuarios": Nome | PIN | Perfil (Inspetor, Responsável ou Gestor) | Ativo (Sim/Não).
 * Criada vazia na primeira requisição; o login só passa a valer quando houver usuário ativo.
 */
const CABECALHO_USUARIOS = ['Nome', 'PIN', 'Perfil', 'Ativo', 'E-mail'];

function lerUsuarios_() {
  const sheet = getOrCreateSheet(SHEET_USUARIOS, CABECALHO_USUARIOS);
  if (sheet.getLastRow() < 2) return [];
  const linhas = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
  // PIN digitado pelo gestor é trocado na hora pela versão codificada, para
  // não ficar legível para quem abre a planilha. Para trocar um PIN, basta
  // digitar o novo por cima: ele é codificado na próxima sincronização.
  linhas.forEach((l, i) => {
    const pin = String(l[1]).trim();
    if (pin && !pinCodificado_(pin)) {
      l[1] = codificarPin_(pin);
      sheet.getRange(i + 2, 2).setNumberFormat('@').setValue(l[1]);
    }
  });
  return linhas
    .filter((l) => String(l[0]).trim() && String(l[1]).trim() && normalizarNome_(l[3]) !== 'nao')
    .map((l) => ({ nome: String(l[0]).trim(), pin: String(l[1]).trim(), perfil: normalizarPerfil_(l[2]) }));
}

const PREFIXO_PIN = 'pin1:';

function pinCodificado_(valor) {
  return String(valor).indexOf(PREFIXO_PIN) === 0;
}

/**
 * Codifica o PIN com uma chave secreta guardada nas Propriedades do script
 * (criada sozinha na primeira vez). Sem essa chave, quem vê a planilha não
 * consegue descobrir os PINs testando combinações.
 */
let SEGREDO_PIN_ = '';

function codificarPin_(pin) {
  if (!SEGREDO_PIN_) {
    const props = PropertiesService.getScriptProperties();
    SEGREDO_PIN_ = props.getProperty('SEGREDO_PIN');
    if (!SEGREDO_PIN_) {
      // Trava para dois celulares não criarem chaves diferentes ao mesmo tempo.
      const trava = LockService.getScriptLock();
      trava.waitLock(30000);
      try {
        SEGREDO_PIN_ = props.getProperty('SEGREDO_PIN');
        if (!SEGREDO_PIN_) {
          SEGREDO_PIN_ = Utilities.getUuid() + Utilities.getUuid();
          props.setProperty('SEGREDO_PIN', SEGREDO_PIN_);
        }
      } finally {
        trava.releaseLock();
      }
    }
  }
  const segredo = SEGREDO_PIN_;
  // A planilha pode guardar "0123" como o número 123: zeros à esquerda não contam.
  let p = String(pin || '').trim();
  if (/^\d+$/.test(p)) p = p.replace(/^0+(?=\d)/, '');
  const assinatura = Utilities.computeHmacSha256Signature(p, segredo);
  return PREFIXO_PIN + Utilities.base64EncodeWebSafe(assinatura);
}

function pinConfere_(esperado, informado) {
  const a = String(esperado).trim();
  const b = String(informado || '').trim();
  if (!b) return false;
  return codificarPin_(b) === (pinCodificado_(a) ? a : codificarPin_(a));
}

function autenticar_(usuarios, login, pin) {
  const nome = normalizarNome_(login);
  return usuarios.find((u) => normalizarNome_(u.nome) === nome && pinConfere_(u.pin, pin)) || null;
}

/**
 * Confere usuário e PIN com limite de tentativas: 5 erros seguidos bloqueiam
 * o usuário por 15 minutos. Vale para o login e para todas as outras ações.
 */
function conferirPin_(usuarios, login, pin) {
  const cache = CacheService.getScriptCache();
  const chaveFalhas = 'falhas_' + normalizarNome_(login);
  const falhas = Number(cache.get(chaveFalhas) || 0);
  if (falhas >= MAX_FALHAS_PIN) {
    return { ok: false, bloqueado: true, error: 'Muitas tentativas erradas. Aguarde 15 minutos e tente de novo.' };
  }
  const u = autenticar_(usuarios, login, pin);
  if (!u) {
    cache.put(chaveFalhas, String(falhas + 1), BLOQUEIO_PIN_SEGUNDOS);
    return { ok: false, error: 'Usuário ou PIN inválido.' };
  }
  if (falhas) cache.remove(chaveFalhas);
  return { ok: true, usuario: u };
}

function fazerLogin_(usuarios, login, pin) {
  if (!usuarios.length) return { ok: true, loginAtivo: false };
  const r = conferirPin_(usuarios, login, pin);
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, loginAtivo: true, nome: r.usuario.nome, perfil: r.usuario.perfil };
}

/* ---------------- RELATO PELO QR CODE ---------------- */

/*
 * Qualquer trabalhador, inclusive terceirizado, lê a placa com QR Code na
 * área e abre a página relato.html no próprio celular, sem instalar o app.
 * O relato vai para a aba Relatos_QR. No app, o gestor ou inspetor vê os
 * relatos recebidos em Relatos → "Recebidos pelo QR Code" e os importa: a
 * partir daí, seguem o fluxo normal (tratamento, ação, Central de ações).
 *
 * Proteções: o QR leva um código secreto (CODIGO_RELATO_QR); sem ele, nada é
 * gravado. Gerar um código novo invalida todas as placas antigas. Há limite
 * de relatos por hora, de tamanho de texto e de fotos, e a página pública
 * não consegue ler nada da planilha.
 */
const SHEET_RELATOS_QR = 'Relatos_QR';
const CABECALHO_RELATOS_QR = ['ID', 'Recebido em', 'Tipo', 'Potencial', 'Empresa', 'Área', 'Local', 'Descrição',
  'Ação imediata', 'Anônimo', 'Nome', 'Função', 'Fotos', 'Situação', 'Importado por', 'Importado em'];
const TIPOS_RELATO_QR = ['Quase acidente', 'Condição insegura', 'Comportamento de risco', 'Sugestão de melhoria'];
const POTENCIAIS_RELATO_QR = ['Baixo', 'Médio', 'Alto', 'Crítico'];
const MAX_RELATOS_QR_POR_HORA = 60;
const MAX_FOTOS_RELATO_QR = 2;
const MAX_BASE64_FOTO_QR = 2 * 1024 * 1024; // cerca de 1,5 MB de imagem

function codigoRelatoQR_(gerarNovo) {
  const props = PropertiesService.getScriptProperties();
  let codigo = props.getProperty('CODIGO_RELATO_QR');
  if (!codigo || gerarNovo) {
    codigo = Utilities.getUuid().replace(/-/g, '').slice(0, 20);
    props.setProperty('CODIGO_RELATO_QR', codigo);
  }
  return { ok: true, codigo: codigo };
}

function cortarTexto_(v, max) {
  return String(v === undefined || v === null ? '' : v).trim().slice(0, max);
}

function receberRelatoPublico_(body) {
  const esperado = PropertiesService.getScriptProperties().getProperty('CODIGO_RELATO_QR');
  if (!esperado || body.codigo !== esperado) {
    return { ok: false, error: 'Este QR Code não está mais ativo. Avise a equipe de segurança do trabalho.' };
  }
  const r = body.relato || {};
  const descricao = cortarTexto_(r.descricao, 2000);
  if (descricao.length < 5) return { ok: false, error: 'Descreva o que aconteceu ou o que você viu.' };

  const cache = CacheService.getScriptCache();
  const chaveHora = 'relatos_qr_' + Utilities.formatDate(new Date(), 'UTC', 'yyyyMMddHH');
  const naHora = Number(cache.get(chaveHora) || 0);
  if (naHora >= MAX_RELATOS_QR_POR_HORA) {
    return { ok: false, error: 'Muitos relatos recebidos agora. Tente de novo em alguns minutos.' };
  }

  const fotos = (Array.isArray(r.fotos) ? r.fotos : []).slice(0, MAX_FOTOS_RELATO_QR)
    .filter((f) => f && typeof f.base64 === 'string' && f.base64.length <= MAX_BASE64_FOTO_QR);

  const trava = LockService.getScriptLock();
  trava.waitLock(30000);
  try {
    cache.put(chaveHora, String(naHora + 1), 3600);
    const id = 'QR-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss') + '-' +
      Utilities.getUuid().slice(0, 4).toUpperCase();
    const links = [];
    if (fotos.length) {
      const raiz = getOrCreateDriveFolder(DRIVE_FOLDER_NAME);
      const pastaQR = getOrCreateDriveFolder('Relatos por QR Code', raiz);
      const pasta = pastaQR.createFolder(id);
      fotos.forEach((f, i) => {
        const blob = Utilities.newBlob(Utilities.base64Decode(f.base64), 'image/jpeg', id + '_foto' + (i + 1) + '.jpg');
        links.push(pasta.createFile(blob).getUrl());
      });
    }
    const anonimo = r.anonimo !== false;
    const linha = protegerContraFormulas_([
      id, new Date(),
      TIPOS_RELATO_QR.indexOf(r.tipo) >= 0 ? r.tipo : TIPOS_RELATO_QR[0],
      POTENCIAIS_RELATO_QR.indexOf(r.potencial) >= 0 ? r.potencial : '',
      cortarTexto_(r.empresa, 120), cortarTexto_(r.area, 120), cortarTexto_(r.local, 200), descricao,
      cortarTexto_(r.acaoImediata, 1000), anonimo ? 'Sim' : 'Não',
      anonimo ? '' : cortarTexto_(r.nome, 120), anonimo ? '' : cortarTexto_(r.funcao, 120),
      links.join(' '), 'Novo', '', ''
    ]);
    getOrCreateSheet(SHEET_RELATOS_QR, CABECALHO_RELATOS_QR).appendRow(linha);
    return { ok: true, protocolo: id };
  } finally {
    trava.releaseLock();
  }
}

/** Relatos do QR ainda não importados por ninguém da equipe. */
function listarRelatosQR_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_RELATOS_QR);
  if (!sheet || sheet.getLastRow() < 2) return { ok: true, relatos: [] };
  const n = CABECALHO_RELATOS_QR.length;
  const relatos = sheet.getRange(2, 1, sheet.getLastRow() - 1, n).getValues()
    .filter((l) => l[0] && textoCelula_(l[13]) !== 'Importado')
    .map((l) => ({
      id: textoCelula_(l[0]),
      recebidoEm: l[1] instanceof Date ? l[1].toISOString() : textoCelula_(l[1]),
      tipo: textoCelula_(l[2]), potencial: textoCelula_(l[3]), empresa: textoCelula_(l[4]), area: textoCelula_(l[5]),
      local: textoCelula_(l[6]), descricao: textoCelula_(l[7]), acaoImediata: textoCelula_(l[8]),
      anonimo: textoCelula_(l[9]) !== 'Não', nome: textoCelula_(l[10]), funcao: textoCelula_(l[11]),
      fotos: textoCelula_(l[12]).split(' ').filter(Boolean)
    }));
  return { ok: true, relatos: relatos };
}

function marcarRelatoQRImportado_(id) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_RELATOS_QR);
  const row = sheet ? linhaDoId(sheet, id) : -1;
  if (row < 0) return { ok: false, error: 'Relato do QR não encontrado.' };
  sheet.getRange(row, 14, 1, 3).setValues([['Importado', USUARIO_ATUAL || '', new Date()]]);
  return { ok: true };
}

/* ---------------- LEMBRETES SEMANAIS POR E-MAIL ---------------- */

/**
 * Toda segunda-feira, cada responsável recebe por e-mail as ações em seu nome
 * que estão vencidas ou vencem nos próximos 7 dias. Os gestores recebem o
 * resumo da equipe, as eficácias a verificar e quem está sem e-mail
 * cadastrado. O e-mail de cada pessoa fica na coluna "E-mail" da aba
 * Usuarios; quem não tem e-mail não recebe nada.
 *
 * Para ligar: no editor do Apps Script, escolha a função
 * ativarLembretesSemanais e clique em Executar (uma vez só). O Google pede
 * autorização para enviar e-mails em seu nome. Para testar na hora, execute
 * enviarLembretesDeAcoes.
 */
const DIAS_AVISO_PRAZO = 7;
const HORA_LEMBRETE = 7;

function ativarLembretesSemanais() {
  desativarLembretesSemanais();
  ScriptApp.newTrigger('enviarLembretesDeAcoes').timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(HORA_LEMBRETE).create();
  return 'Lembretes ativados: toda segunda-feira, por volta das ' + HORA_LEMBRETE + 'h.';
}

function desativarLembretesSemanais() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'enviarLembretesDeAcoes')
    .forEach((t) => ScriptApp.deleteTrigger(t));
}

/** Data da célula (Date ou "aaaa-mm-dd") como "aaaa-mm-dd"; vazio se não houver. */
function dataIsoDaCelula_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const t = String(v || '').trim();
  return /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : '';
}

function diasEntre_(isoDe, isoAte) {
  const [a1, m1, d1] = isoDe.split('-').map(Number);
  const [a2, m2, d2] = isoAte.split('-').map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000);
}

function dataBR_(iso) {
  return iso ? iso.split('-').reverse().join('/') : '';
}

/** Ações abertas vencidas ou a vencer, e eficácias a verificar, a partir da aba Acoes_Consolidadas. */
function levantarAcoesParaLembrete_(hojeIso) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Acoes_Consolidadas');
  const vazio = { prazos: [], eficacias: [] };
  if (!sheet || sheet.getLastRow() < 2) return vazio;
  const n = Math.min(CABECALHO_ACOES.length, sheet.getLastColumn());
  const linhas = sheet.getRange(2, 1, sheet.getLastRow() - 1, n).getValues();
  const prazos = [];
  const eficacias = [];
  linhas.forEach((l) => {
    if (!l[0]) return;
    const acao = {
      descricao: textoCelula_(l[2]), contexto: textoCelula_(l[3]), area: textoCelula_(l[5]),
      responsavel: textoCelula_(l[6]), prazo: dataIsoDaCelula_(l[7]), status: textoCelula_(l[8]) || 'Pendente'
    };
    if (acao.status !== 'Concluída') {
      if (!acao.prazo) return;
      acao.dias = diasEntre_(hojeIso, acao.prazo);
      if (acao.dias <= DIAS_AVISO_PRAZO) prazos.push(acao);
      return;
    }
    let acomp = {};
    try { acomp = l[24] ? JSON.parse(l[24]) : {}; } catch (e) { acomp = {}; }
    const verificarEm = dataIsoDaCelula_(acomp.verificarEm);
    if (acomp.evidencia && acomp.eficacia !== 'Eficaz' && verificarEm && verificarEm <= hojeIso) {
      eficacias.push(Object.assign(acao, { verificarEm: verificarEm }));
    }
  });
  prazos.sort((a, b) => a.dias - b.dias);
  return { prazos: prazos, eficacias: eficacias };
}

function lerEmailsUsuarios_() {
  const sheet = getOrCreateSheet(SHEET_USUARIOS, CABECALHO_USUARIOS);
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, CABECALHO_USUARIOS.length).getValues()
    .filter((l) => String(l[0]).trim() && normalizarNome_(l[3]) !== 'nao')
    .map((l) => ({ nome: String(l[0]).trim(), perfil: normalizarPerfil_(l[2]), email: String(l[4] || '').trim() }));
}

function situacaoPrazo_(a) {
  if (a.dias < 0) return 'Atrasada ' + (-a.dias) + ' dia(s)';
  if (a.dias === 0) return 'Vence hoje';
  return 'Vence em ' + a.dias + ' dia(s)';
}

function tabelaAcoesEmail_(acoes, comResponsavel) {
  const esc = (t) => String(t || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cab = '<tr><th align="left">Ação</th><th align="left">Área</th>' + (comResponsavel ? '<th align="left">Responsável</th>' : '') +
    '<th align="left">Prazo</th><th align="left">Situação</th></tr>';
  const linhas = acoes.map((a) => '<tr><td>' + esc(a.descricao) + '</td><td>' + esc(a.area) + '</td>' +
    (comResponsavel ? '<td>' + esc(a.responsavel || 'sem responsável') + '</td>' : '') +
    '<td>' + dataBR_(a.prazo) + '</td><td' + (a.dias < 0 ? ' style="color:#b3261e;font-weight:bold"' : '') + '>' + situacaoPrazo_(a) + '</td></tr>').join('');
  return '<table cellpadding="6" cellspacing="0" border="1" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px">' + cab + linhas + '</table>';
}

/**
 * Monta os e-mails da semana (sem enviar). Separado do envio para poder ser
 * conferido nos testes e pelo gestor, se quiser, antes de ativar.
 */
function montarLembretesDeAcoes_(hojeIso) {
  const { prazos, eficacias } = levantarAcoesParaLembrete_(hojeIso);
  const usuarios = lerEmailsUsuarios_();
  const porNome = {};
  usuarios.forEach((u) => { porNome[normalizarNome_(u.nome)] = u; });

  const emails = [];
  const semEmail = {};
  const porResponsavel = {};
  prazos.forEach((a) => {
    const chave = normalizarNome_(a.responsavel);
    (porResponsavel[chave] = porResponsavel[chave] || []).push(a);
  });
  Object.keys(porResponsavel).forEach((chave) => {
    const u = porNome[chave];
    const lista = porResponsavel[chave];
    if (!u || !u.email) { semEmail[lista[0].responsavel || 'sem responsável'] = lista.length; return; }
    const atrasadas = lista.filter((a) => a.dias < 0).length;
    emails.push({
      para: u.email,
      assunto: 'Ações de SSMA: ' + (atrasadas ? atrasadas + ' atrasada(s), ' : '') + (lista.length - atrasadas) + ' vencendo nesta semana',
      html: '<p>Olá, ' + u.nome + '.</p><p>Estas são as ações de SSMA em seu nome que estão atrasadas ou vencem nos próximos ' +
        DIAS_AVISO_PRAZO + ' dias:</p>' + tabelaAcoesEmail_(lista, false) +
        '<p>Para concluir, abra o aplicativo Inspeções SSMA → Central de ações, registre o que foi feito e a evidência.</p>' +
        '<p style="color:#666;font-size:12px">Mensagem automática semanal do aplicativo Inspeções SSMA.</p>'
    });
  });

  const gestores = usuarios.filter((u) => u.perfil === 'Gestor' && u.email);
  if (gestores.length && (prazos.length || eficacias.length)) {
    const atrasadas = prazos.filter((a) => a.dias < 0);
    let html = '<p>Resumo semanal das ações de SSMA da equipe.</p>' +
      '<p><strong>' + atrasadas.length + '</strong> ação(ões) atrasada(s) e <strong>' + (prazos.length - atrasadas.length) +
      '</strong> vencendo nos próximos ' + DIAS_AVISO_PRAZO + ' dias.</p>';
    if (prazos.length) html += tabelaAcoesEmail_(prazos, true);
    if (eficacias.length) {
      html += '<p><strong>Eficácia a verificar (' + eficacias.length + '):</strong> ' +
        eficacias.map((a) => a.descricao + ' (' + (a.responsavel || 'sem responsável') + ')').join('; ') + '.</p>';
    }
    const nomesSemEmail = Object.keys(semEmail);
    if (nomesSemEmail.length) {
      html += '<p><strong>Não receberam o lembrete</strong> (sem usuário ou sem e-mail na aba Usuarios): ' +
        nomesSemEmail.map((n) => n + ' (' + semEmail[n] + ')').join('; ') + '.</p>';
    }
    html += '<p style="color:#666;font-size:12px">Mensagem automática semanal do aplicativo Inspeções SSMA.</p>';
    gestores.forEach((g) => emails.push({ para: g.email, assunto: 'Resumo semanal das ações de SSMA', html: html }));
  }
  return { emails: emails, semEmail: semEmail, totalAcoes: prazos.length, eficacias: eficacias.length };
}

function enviarLembretesDeAcoes() {
  const hojeIso = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const r = montarLembretesDeAcoes_(hojeIso);
  let enviados = 0;
  r.emails.forEach((e) => {
    if (MailApp.getRemainingDailyQuota() < 1) return;
    MailApp.sendEmail({ to: e.para, subject: e.assunto, htmlBody: e.html, name: 'Inspeções SSMA' });
    enviados++;
  });
  console.log('Lembretes enviados: ' + enviados + ' de ' + r.emails.length + '.');
  return enviados;
}

/* ---------------- PROTEÇÃO CONTRA FÓRMULAS ---------------- */

/**
 * A planilha trata como fórmula qualquer texto que comece com =, +, - ou @.
 * Um texto assim vindo do app (por exemplo, uma observação) poderia quebrar
 * a aba ou executar uma fórmula. O apóstrofo na frente faz a planilha gravar
 * o texto como texto, e ele não aparece na célula. Números ("-3") ficam como
 * estão. Fotos e o acompanhamento das ações (gravado como JSON) não passam
 * por aqui.
 */
const CAMPOS_SEM_PROTECAO = ['photo', 'acomp'];

function protegerContraFormulas_(valor, chave) {
  if (CAMPOS_SEM_PROTECAO.indexOf(chave) >= 0) return valor;
  if (typeof valor === 'string') {
    return /^[=+\-@]/.test(valor) && !/^[+-]?\d+([.,]\d+)?$/.test(valor) ? "'" + valor : valor;
  }
  if (Array.isArray(valor)) return valor.map((v) => protegerContraFormulas_(v));
  if (valor instanceof Date) return valor;
  if (valor && typeof valor === 'object') {
    const novo = {};
    Object.keys(valor).forEach((k) => { novo[k] = protegerContraFormulas_(valor[k], k); });
    return novo;
  }
  return valor;
}

/* ---------------- AÇÕES COMPARTILHADAS ---------------- */

const CABECALHO_ACOES = [
  'Chave', 'Origem', 'Ação', 'Contexto', 'Empresa', 'Área', 'Responsável', 'Prazo',
  'Status', 'Situação', 'Concluída em', 'Concluída no prazo', 'Registrado por', 'Atualizado em',
  'Criticidade', 'Reincidente', 'Evidência', 'Fotos da evidência', 'Verificar eficácia em',
  'Eficácia', 'Verificada em', 'Verificada por', 'Reaberturas (não eficaz)',
  'Atualização (ms)', 'Acompanhamento (JSON)', 'Última alteração por'
];
// Colunas de acompanhamento: valem as da alteração mais recente (Atualização em ms),
// venha ela do aparelho que criou o registro ou de outro aparelho da equipe.
const COLS_ACOMPANHAMENTO = [6, 7, 8, 9, 10, 11, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
const COLS_HISTORICO = { 6: 'Responsável', 7: 'Prazo', 8: 'Status', 16: 'Evidência', 18: 'Verificar eficácia em', 19: 'Eficácia' };

function textoCelula_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return v === null || v === undefined ? '' : String(v);
}

function linhaAcao_(a, usuario, existente) {
  const noPrazo = a.status === 'Concluída' && a.concluidaEm && a.prazo ? (a.concluidaEm <= a.prazo ? 'Sim' : 'Não') : '';
  return [
    a.chave, a.origem, a.descricao, a.contexto, a.empresa, a.area, a.responsavel, a.prazo,
    a.status, a.situacao, a.concluidaEm, noPrazo, existente ? existente[12] : (usuario || ''), new Date(),
    a.criticidade || '', a.reincidente || '', a.evidencia || '', a.fotosEvidencia || '', a.verificarEm || '',
    a.eficacia || '', a.eficaciaEm || '', a.eficaciaPor || '', a.reaberturas || 0,
    Number(a.atualizadoEm) || 0, a.acomp ? JSON.stringify(a.acomp) : '', usuario || ''
  ];
}

function registrarHistorico_(usuario, antes, depois) {
  const mudancas = [];
  Object.keys(COLS_HISTORICO).forEach((col) => {
    const de = textoCelula_(antes ? antes[col] : '');
    const para = textoCelula_(depois[col]);
    if (de !== para) mudancas.push([new Date(), usuario || '', depois[0], depois[2], COLS_HISTORICO[col], de, para]);
  });
  if (!mudancas.length) return;
  const sheet = getOrCreateSheet(SHEET_HISTORICO_ACOES, ['Data/hora', 'Usuário', 'Chave', 'Ação', 'Campo', 'Antes', 'Depois']);
  sheet.getRange(sheet.getLastRow() + 1, 1, mudancas.length, 7).setValues(mudancas);
}

/**
 * Lista consolidada de ações de todos os aparelhos (uma linha por ação,
 * identificada pela chave). É a base do painel do gestor no Looker Studio e
 * da Central de ações compartilhada.
 */
function upsertAcoesConsolidadas(acoes, usuario) {
  usuario = USUARIO_ATUAL || usuario || '';
  const sheet = getOrCreateSheet('Acoes_Consolidadas', CABECALHO_ACOES);
  const n = CABECALHO_ACOES.length;
  const dados = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, n).getValues() : [];
  const linhaPorChave = {};
  dados.forEach((l, i) => { linhaPorChave[l[0]] = i; });
  const novas = [];
  (acoes || []).forEach((a) => {
    const idx = linhaPorChave[a.chave];
    const existente = idx === undefined ? null : dados[idx];
    // O perfil Responsável não sobrescreve ações registradas por outra pessoa;
    // as alterações dele nessas ações passam por atualizarAcao.
    if (existente && PERFIL_ATUAL === 'Responsável' && normalizarNome_(existente[12]) !== normalizarNome_(USUARIO_ATUAL)) return;
    let linha = linhaAcao_(a, usuario, existente);
    if (existente && PERFIL_ATUAL === 'Responsável') manterCamposDoGestor_(existente, linha);
    if (existente) {
      // Alteração mais nova feita em outro aparelho: mantém o acompanhamento da planilha.
      if ((Number(existente[23]) || 0) > (Number(a.atualizadoEm) || 0)) {
        COLS_ACOMPANHAMENTO.forEach((c) => { linha[c] = existente[c]; });
      } else {
        registrarHistorico_(usuario, existente, linha);
      }
      sheet.getRange(idx + 2, 1, 1, n).setValues([linha]);
    } else {
      novas.push(linha);
    }
  });
  if (novas.length) sheet.getRange(sheet.getLastRow() + 1, 1, novas.length, n).setValues(novas);
  return { ok: true, total: (acoes || []).length };
}

/** Alteração feita na Central de ações de um aparelho que não criou o registro. */
function atualizarAcao(a) {
  if (!a || !a.chave) return { ok: false, error: 'Ação sem identificação.' };
  const sheet = getOrCreateSheet('Acoes_Consolidadas', CABECALHO_ACOES);
  const n = CABECALHO_ACOES.length;
  const row = linhaDoId(sheet, a.chave);
  if (row < 0) return { ok: false, error: 'Ação não encontrada na planilha. Ela ainda não foi enviada pelo aparelho que a criou.' };
  const existente = sheet.getRange(row, 1, 1, n).getValues()[0];
  if (PERFIL_ATUAL === 'Responsável' && normalizarNome_(existente[6]) !== normalizarNome_(USUARIO_ATUAL)) {
    return { ok: false, error: 'Esta ação está em nome de ' + (textoCelula_(existente[6]) || 'outra pessoa') + ': o perfil Responsável só altera as próprias ações.' };
  }
  if ((Number(existente[23]) || 0) >= (Number(a.atualizadoEm) || 0)) return { ok: true, ignorada: true };
  const linha = existente.slice();
  const nova = linhaAcao_(Object.assign({
    chave: existente[0], origem: existente[1], descricao: existente[2], contexto: existente[3],
    empresa: existente[4], area: existente[5], criticidade: existente[14], reincidente: existente[15]
  }, a), USUARIO_ATUAL || a.usuario || '', existente);
  if (PERFIL_ATUAL === 'Responsável') manterCamposDoGestor_(existente, nova);
  COLS_ACOMPANHAMENTO.forEach((c) => { linha[c] = nova[c]; });
  linha[13] = new Date();
  registrarHistorico_(USUARIO_ATUAL || a.usuario || '', existente, linha);
  sheet.getRange(row, 1, 1, n).setValues([linha]);
  return { ok: true };
}

/**
 * Campos que o perfil Responsável não altera (como no app): responsável,
 * prazo, o veredito da verificação de eficácia e o histórico de reaberturas.
 * Ele pode limpar a verificação ao concluir de novo uma ação reaberta, mas
 * não pode marcá-la como "Eficaz" ou "Não eficaz". Altera `nova` no lugar.
 */
function manterCamposDoGestor_(existente, nova) {
  nova[6] = existente[6];
  nova[7] = existente[7];
  let antes = {};
  let depois = {};
  try { antes = existente[24] ? JSON.parse(existente[24]) : {}; } catch (e) { antes = {}; }
  try { depois = nova[24] ? JSON.parse(nova[24]) : {}; } catch (e) { depois = {}; }
  if (depois.eficacia && depois.eficacia !== antes.eficacia) {
    ['eficacia', 'eficaciaEm', 'eficaciaPor', 'eficaciaObs'].forEach((k) => { depois[k] = antes[k] || ''; });
    [19, 20, 21].forEach((c) => { nova[c] = existente[c]; });
  }
  depois.historico = antes.historico || [];
  nova[22] = existente[22];
  nova[24] = JSON.stringify(depois);
}

/** Todas as ações da planilha, para a Central de ações de cada aparelho. */
function listarAcoes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Acoes_Consolidadas');
  if (!sheet || sheet.getLastRow() < 2) return { ok: true, acoes: [] };
  const n = Math.min(CABECALHO_ACOES.length, sheet.getLastColumn());
  const linhas = sheet.getRange(2, 1, sheet.getLastRow() - 1, n).getValues();
  const acoes = linhas.filter((l) => l[0]).map((l) => {
    let acomp = {};
    try { acomp = l[24] ? JSON.parse(l[24]) : {}; } catch (e) { acomp = {}; }
    return {
      chave: textoCelula_(l[0]), origem: textoCelula_(l[1]), descricao: textoCelula_(l[2]), contexto: textoCelula_(l[3]),
      empresa: textoCelula_(l[4]), area: textoCelula_(l[5]), responsavel: textoCelula_(l[6]), prazo: textoCelula_(l[7]),
      status: textoCelula_(l[8]) || 'Pendente', concluidaEm: textoCelula_(l[10]), registradoPor: textoCelula_(l[12]),
      criticidade: textoCelula_(l[14]), reincidente: textoCelula_(l[15]) === 'Sim', fotosEvidencia: textoCelula_(l[17]),
      atualizadoEm: Number(l[23]) || 0, acomp: acomp, alteradoPor: textoCelula_(l[25])
    };
  });
  return { ok: true, acoes: acoes };
}

/** Grava (ou atualiza, pelo ID na coluna A) uma linha na aba informada. */
function gravarLinhaPorId(sheet, linha) {
  const row = linhaDoId(sheet, linha[0]);
  if (row > 0) sheet.getRange(row, 1, 1, linha.length).setValues([linha]);
  else sheet.appendRow(linha);
}

function upsertRelato(r) {
  const rootFolder = getOrCreateDriveFolder(DRIVE_FOLDER_NAME);
  const folder = getOrCreateDriveFolder(r.id + ' - Relato - ' + (r.tipo || 'relato'), rootFolder);
  const sheet = getOrCreateSheet(SHEET_RELATOS, [
    'ID', 'Tipo', 'Data', 'Hora', 'Empresa', 'Área', 'Local', 'Descrição',
    'Potencial', 'Ação Imediata', 'Anônimo', 'Relator', 'Função do Relator',
    'Análise', 'Ação Corretiva', 'Responsável', 'Prazo', 'Status da Ação',
    'Latitude', 'Longitude', 'Qtd. Fotos', 'Recebido em', 'Pasta Drive'
  ]);
  const t = r.tratamento || {};
  const loc = r.localizacao || {};
  gravarLinhaPorId(sheet, [
    r.id, r.tipo, r.data, r.hora, r.empresa, r.area, r.local, r.descricao,
    r.potencial, r.acaoImediata, r.anonimo ? 'Sim' : 'Não', r.relator, r.funcaoRelator,
    t.analise || '', t.acaoCorretiva || '', t.responsavel || '', t.prazo || '', t.status || '',
    loc.lat || '', loc.lon || '', r.qtdFotos || 0, new Date(), folder.getUrl()
  ]);
  return { ok: true, remoteRef: folder.getId() };
}

function upsertObservacao(o) {
  const rootFolder = getOrCreateDriveFolder(DRIVE_FOLDER_NAME);
  const folder = getOrCreateDriveFolder(o.id + ' - Observacao - ' + (o.area || 'area'), rootFolder);
  const sheet = getOrCreateSheet(SHEET_OBSERVACOES, [
    'ID', 'Data', 'Hora', 'Empresa', 'Área', 'Atividade', 'Observador', 'Nº Observados',
    'Seguros', 'De Risco', '% Seguro', 'Itens de Risco', 'Comportamentos de Risco',
    'Reconhecimento', 'Feedback Realizado', 'Compromisso', 'Ação Corretiva', 'Responsável',
    'Prazo', 'Status da Ação', 'Qtd. Fotos', 'Recebido em', 'Pasta Drive'
  ]);
  const t = o.tratamento || {};
  gravarLinhaPorId(sheet, [
    o.id, o.data, o.hora, o.empresa, o.area, o.atividade, o.observador, o.numObservados,
    o.seguros, o.deRisco, o.percentualSeguro === null ? '' : o.percentualSeguro, o.itensDeRisco, o.comportamentosRisco,
    o.reconhecimento, o.feedbackRealizado, o.compromisso, t.acaoCorretiva || '', t.responsavel || '',
    t.prazo || '', t.status || '', o.qtdFotos || 0, new Date(), folder.getUrl()
  ]);
  return { ok: true, remoteRef: folder.getId() };
}

function upsertAcao(a) {
  const sheet = getOrCreateSheet(SHEET_ACOES, [
    'ID', 'Descrição', 'Origem', 'Empresa', 'Área', 'Responsável', 'Prazo',
    'Status', 'Observação', 'Recebido em'
  ]);
  gravarLinhaPorId(sheet, [
    a.id, a.descricao, a.origem, a.empresa, a.area, a.responsavel, a.prazo,
    a.status, a.observacao, new Date()
  ]);
  return { ok: true, remoteRef: a.id };
}

function uploadPhoto(inspectionId, photo) {
  const rootFolder = getOrCreateDriveFolder(DRIVE_FOLDER_NAME);
  const inspFolder = photo.remoteRef ? DriveApp.getFolderById(photo.remoteRef) : pastaDoRegistro_(rootFolder, inspectionId);

  const bytes = Utilities.base64Decode(photo.base64);
  const blob = Utilities.newBlob(bytes, photo.mimeType || 'image/jpeg', photo.fileName || (photo.id + '.jpg'));
  const file = inspFolder.createFile(blob);
  file.setName((photo.questionRef || 'foto') + '_' + photo.id + '_' + file.getName());

  return { ok: true, fileUrl: file.getUrl() };
}

/**
 * Pasta do registro no Drive (o nome começa pelo ID do registro). Antes, cada
 * foto percorria todas as pastas de fotos, o que ficava mais lento a cada
 * inspeção nova. Agora: 1) a pasta já usada fica guardada por 6 horas;
 * 2) a busca do Drive pelo ID; 3) só se ela não achar, a varredura antiga,
 * para nunca criar uma pasta duplicada.
 */
function pastaDoRegistro_(rootFolder, inspectionId) {
  const cache = CacheService.getScriptCache();
  const chave = 'pasta_' + inspectionId;
  const guardada = cache.get(chave);
  if (guardada) {
    try { return DriveApp.getFolderById(guardada); } catch (e) { cache.remove(chave); }
  }
  const id = String(inspectionId);
  const ehDoRegistro = (f) => f.getName().indexOf(id) === 0;
  let pasta = null;
  const busca = rootFolder.searchFolders('title contains "' + id.replace(/["\\]/g, '') + '"');
  while (!pasta && busca.hasNext()) { const f = busca.next(); if (ehDoRegistro(f)) pasta = f; }
  if (!pasta) {
    const todas = rootFolder.getFolders();
    while (!pasta && todas.hasNext()) { const f = todas.next(); if (ehDoRegistro(f)) pasta = f; }
  }
  if (!pasta) pasta = getOrCreateDriveFolder(id, rootFolder);
  cache.put(chave, pasta.getId(), 21600);
  return pasta;
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
  // As fórmulas só contam linhas com ID preenchido e ignoram células que
  // pareçam vazias mas tenham espaços ou restos de formatação.
  const faixa = (col) => REF_INSP + col + '2:' + col + LINHA_FINAL;
  const temId = '(LEN(TRIM(' + faixa('A') + '))>0)';
  const kpis = [
    ['Total de Ações', '=SUMPRODUCT(' + temId + '*(LEN(TRIM(' + faixa(COL_PRAZO) + '))>0))'],
    ['Resolvidas', '=SUMPRODUCT(' + temId + '*(' + faixa(colStatusLetra) + '="Resolvida"))'],
    ['Dentro do Prazo', '=SUMPRODUCT(' + temId + '*(' + faixa(colSituacaoLetra) + '="Dentro do Prazo"))'],
    ['Em Atraso', '=SUMPRODUCT(' + temId + '*(' + faixa(colSituacaoLetra) + '="Em Atraso"))']
  ];
  kpis.forEach((kpi, i) => {
    const col = 1 + i * 2; // A, C, E, G
    dash.getRange(linhaKpi, col).setValue(kpi[0]).setFontWeight('bold');
    dash.getRange(linhaKpi + 1, col).setFormula(kpi[1]).setFontSize(28).setFontWeight('bold');
  });
  // Pendentes = Total - Resolvidas (inclui as ações sem prazo vencido e as atrasadas).
  dash.getRange(linhaKpi, 9).setValue('Pendentes').setFontWeight('bold');
  dash.getRange(linhaKpi + 1, 9).setFormula('=A' + (linhaKpi + 1) + '-C' + (linhaKpi + 1)).setFontSize(28).setFontWeight('bold');
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
