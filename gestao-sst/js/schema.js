/*
 * Definição dos módulos (equivalentes às abas da planilha). Cada módulo descreve
 * seus campos; a tela de lista, o formulário, a busca, a exportação e a importação
 * da planilha são gerados a partir daqui.
 *
 * Tipos de campo:
 *  text, textarea, num, money, date, time,
 *  sel   -> lista configurável (aceita valor novo, que entra na lista),
 *  opt   -> opções fixas, sn -> Sim/Não,
 *  colab -> colaborador, multicolab -> vários colaboradores,
 *  epi   -> EPI do cadastro, equip -> máquina/equipamento, checks -> várias opções fixas.
 *
 * "x" no campo = nome do cabeçalho correspondente na planilha (para importação).
 * Colunas iniciadas por "_" são calculadas (ver calc.js).
 */
const SN = ['Sim', 'Não'];

const MODULOS = [
  {
    id: 'colaboradores', nome: 'Colaboradores', grupo: 'Pessoas', singular: 'colaborador',
    aba: 'COLABORADORES', chave: 'nome',
    campos: [
      { k: 'matricula', l: 'Matrícula', t: 'text', x: 'MATRÍCULA' },
      { k: 'nome', l: 'Nome do colaborador', t: 'text', req: 1, w: 2, x: 'NOME DO COLABORADOR' },
      { k: 'status', l: 'Situação', t: 'sel', lista: 'statusColab', x: 'STATUS' },
      { k: 'cpf', l: 'CPF', t: 'text', x: 'CPF', mask: 'cpf' },
      { k: 'rg', l: 'RG', t: 'text', x: 'RG' },
      { k: 'setor', l: 'Setor', t: 'sel', lista: 'setores', x: 'SETOR' },
      { k: 'funcao', l: 'Função', t: 'sel', lista: 'funcoes', x: 'FUNÇÃO' },
      { k: 'sexo', l: 'Sexo', t: 'opt', opts: ['M', 'F'], x: 'SEXO' },
      { k: 'nascimento', l: 'Nascimento', t: 'date', x: 'NASCIMENTO' },
      { k: 'admissao', l: 'Data de admissão', t: 'date', x: 'DATA DE ADMISSÃO' },
      { k: 'desligamento', l: 'Data do desligamento', t: 'date', x: 'DATA DO DESLIGAMENTO' },
      { k: 'ctps', l: 'CTPS', t: 'text', x: 'CTPS' },
      { k: 'serie', l: 'Série', t: 'text', x: 'SÉRIE' },
      { k: 'celular', l: 'Celular', t: 'text', x: 'CELULAR' },
      { k: 'endereco', l: 'Endereço', t: 'text', w: 2, x: 'ENDEREÇO' }
    ],
    colunas: ['matricula', 'nome', 'status', 'cpf', 'setor', 'funcao', '_idade', '_tempo'],
    filtros: ['status', 'setor', 'funcao']
  },
  {
    id: 'acidentes', nome: 'Acidentes', grupo: 'Ocorrências', singular: 'acidente', aba: 'ACIDENTES', chave: 'colab',
    campos: [
      { k: 'colab', l: 'Colaborador', t: 'colab', req: 1, w: 2, x: 'COLABORADOR' },
      { k: 'data', l: 'Data', t: 'date', req: 1, x: 'DATA' },
      { k: 'hora', l: 'Horário', t: 'time', x: 'HORÁRIO' },
      { k: 'status', l: 'Situação da investigação', t: 'sel', lista: 'statusAcidente', x: 'STATUS' },
      { k: 'tipo', l: 'Tipo', t: 'sel', lista: 'tiposAcidente', x: 'TIPO' },
      { k: 'classeDoenca', l: 'Classificação da doença ocupacional', t: 'sel', lista: 'classeDoenca', x: 'CLASSIFICAÇÃO DA DOENÇA OCUPACIONAL', se: (r) => norm(r.tipo).includes('doenca ocupacional') },
      { k: 'dano', l: 'Dano / lesão', t: 'sel', lista: 'danos', x: 'DANO/LESÃO' },
      { k: 'parte', l: 'Parte do corpo atingida', t: 'sel', lista: 'partesCorpo', x: 'PARTE DO CORPO ATINGIDA' },
      { k: 'agente', l: 'Agente causador', t: 'sel', lista: 'agentes', x: 'AGENTE CAUSADOR' },
      { k: 'local', l: 'Local do acidente', t: 'text', x: 'LOCAL DO ACIDENTE' },
      { k: 'cat', l: 'Emitir CAT?', t: 'sn', x: 'EMITIR CAT?' },
      { k: 'gravidade', l: 'Gravidade', t: 'sel', lista: 'gravidades', x: 'GRAVIDADE' },
      { k: 'bird', l: 'Nível (pirâmide de Bird)', t: 'sel', lista: 'bird', w: 2, x: 'PIRÂMIDE DE BIRD' },
      { k: 'afastamento', l: 'Houve afastamento?', t: 'sn', x: 'AFASTAMENTO' },
      { k: 'retorno', l: 'Data de retorno', t: 'date', x: 'DATA DE RETORNO' },
      { k: 'diasDebitados', l: 'Dias debitados (NBR 14280)', t: 'num', hint: 'Somente para morte ou lesão permanente' },
      { k: 'detalhes', l: 'Descrição do acidente', t: 'textarea', w: 4, x: 'DETALHES' }
    ],
    colunas: ['data', 'colab', 'tipo', 'dano', 'parte', 'gravidade', 'afastamento', '_diasPerdidos', 'status'],
    filtros: ['tipo', 'classeDoenca', 'gravidade', 'status', '_ano']
  },
  {
    id: 'treinamentos', nome: 'Treinamentos', grupo: 'Pessoas', singular: 'treinamento', aba: 'TREINAMENTOS', chave: 'treinamento',
    campos: [
      { k: 'treinamento', l: 'Treinamento', t: 'text', req: 1, w: 2, x: 'TREINAMENTO' },
      { k: 'norma', l: 'Norma', t: 'sel', lista: 'normas', x: 'NORMA' },
      { k: 'status', l: 'Situação', t: 'opt', opts: ['Concluído', 'Em andamento', 'Agendado', 'Cancelado'], x: 'STATUS' },
      { k: 'dataInicial', l: 'Data inicial', t: 'date', x: 'DATA INICIAL' },
      { k: 'dataFinal', l: 'Data final', t: 'date', x: 'DATA FINAL' },
      { k: 'validadeMeses', l: 'Validade (meses)', t: 'num', x: 'VALIDADE (EM MESES)' },
      { k: 'controlar', l: 'Controlar validade?', t: 'sn', x: 'CONTROLAR VALIDADE?', padrao: 'Sim' },
      { k: 'instrutor', l: 'Instrutor', t: 'sel', lista: 'instrutores', x: 'INSTRUTOR' },
      { k: 'cargaHoraria', l: 'Carga horária (h)', t: 'num', x: 'DURAÇÃO (EM HORAS)' },
      { k: 'finalidade', l: 'Finalidade', t: 'sel', lista: 'finalidades', x: 'FINALIDADE' },
      { k: 'modalidade', l: 'Modalidade', t: 'sel', lista: 'modalidades', x: 'MODALIDADE' },
      { k: 'local', l: 'Local', t: 'text', x: 'LOCAL' },
      { k: 'custo', l: 'Custo (R$)', t: 'money', x: 'CUSTO (R$)' },
      { k: 'participantes', l: 'Participantes', t: 'multicolab', w: 4 },
      { k: 'obs', l: 'Observações', t: 'textarea', w: 4 }
    ],
    colunas: ['treinamento', 'norma', 'status', 'dataFinal', '_venc', '_statusVenc', '_qtd', 'cargaHoraria', 'custo'],
    filtros: ['norma', 'status', '_statusVenc']
  },
  {
    id: 'aso', nome: 'ASO', grupo: 'Pessoas', singular: 'ASO', aba: 'ASO', chave: 'colab',
    campos: [
      { k: 'colab', l: 'Colaborador', t: 'colab', req: 1, w: 2, x: 'COLABORADOR' },
      { k: 'tipo', l: 'Tipo de exame', t: 'sel', lista: 'tiposASO', x: 'TIPO' },
      { k: 'resultado', l: 'Resultado', t: 'opt', opts: ['Apto', 'Não apto'], x: 'APTO / NÃO APTO' },
      { k: 'data', l: 'Data da emissão', t: 'date', req: 1, x: 'DATA DA EMISSÃO' },
      { k: 'validadeDias', l: 'Validade (dias)', t: 'num', x: 'VALIDADE (em dias)', hint: 'Em branco: usa o prazo do tipo em Configurações' },
      { k: 'medico', l: 'Médico', t: 'sel', lista: 'medicos', x: 'MÉDICO' },
      { k: 'crm', l: 'CRM', t: 'text', x: 'CRM' },
      { k: 'atualizado', l: 'Já foi substituído por ASO novo?', t: 'sn', x: 'JÁ ATUALIZOU ASO?', hint: 'Marque Sim para tirar este ASO das pendências' },
      { k: 'exames', l: 'Exames realizados', t: 'textarea', w: 4, x: 'EXAMES REALIZADOS' }
    ],
    colunas: ['colab', 'tipo', 'resultado', 'data', '_venc', '_statusVenc', 'medico'],
    filtros: ['tipo', 'resultado', '_statusVenc']
  },
  {
    id: 'advertencias', nome: 'Advertências', grupo: 'Pessoas', singular: 'advertência', fem: 1, aba: 'ADVERTENCIAS', chave: 'colab',
    campos: [
      { k: 'colab', l: 'Colaborador', t: 'colab', req: 1, w: 2, x: 'COLABORADOR' },
      { k: 'data', l: 'Data', t: 'date', req: 1, x: 'DATA' },
      { k: 'hora', l: 'Hora', t: 'time', x: 'HORA' },
      { k: 'medida', l: 'Medida aplicada', t: 'sel', lista: 'medidasDisciplinares' },
      { k: 'ato', l: 'Ato faltoso', t: 'textarea', w: 4, x: 'ATO FALTOSO' }
    ],
    colunas: ['data', 'colab', '_setor', '_funcao', 'medida', 'ato'],
    filtros: ['medida', '_ano']
  },
  {
    id: 'epis', nome: 'Cadastro de EPI', grupo: 'EPI', singular: 'EPI', aba: 'EPI', chave: 'descricao',
    campos: [
      { k: 'codigo', l: 'Código', t: 'num', x: 'NÚM' },
      { k: 'descricao', l: 'Descrição do EPI', t: 'text', req: 1, w: 2, x: 'DESCRIÇÃO DO EPI' },
      { k: 'categoria', l: 'Categoria', t: 'opt', opts: ['EPI', 'Uniforme'], x: 'CATEGORIA', padrao: 'EPI', hint: 'Uniforme sai na Ficha de uniforme' },
      { k: 'unidade', l: 'Unidade', t: 'sel', lista: 'unidades', x: 'UNIDADE', padrao: 'UN' },
      { k: 'fabricante', l: 'Fabricante', t: 'text', x: 'FABRICANTE' },
      { k: 'ca', l: 'Número do CA', t: 'text', x: 'NÚMERO DO CA' },
      { k: 'vencCA', l: 'Vencimento do CA', t: 'date', x: 'DATA DE VENCIMENTO' },
      { k: 'controlar', l: 'Controlar validade do CA?', t: 'sn', x: 'CONTROLAR VALIDADE?', padrao: 'Sim' },
      { k: 'validadeUso', l: 'Validade de uso (dias)', t: 'num', x: 'VALIDADE DE USO (DIAS)', hint: 'Prazo de troca contado da entrega ao colaborador. Em branco: não controla' },
      { k: 'saldoInicial', l: 'Saldo inicial', t: 'num', hint: 'Estoque existente antes das movimentações lançadas' },
      { k: 'minimo', l: 'Estoque mínimo', t: 'num', x: 'MÍNIMO' },
      { k: 'maximo', l: 'Estoque máximo', t: 'num', x: 'MÁXIMO' },
      { k: 'preco', l: 'Preço unitário', t: 'money', x: 'PREÇO UNITÁRIO' }
    ],
    colunas: ['codigo', 'descricao', 'categoria', 'fabricante', 'ca', 'vencCA', '_statusVenc', 'validadeUso', '_entradas', '_saidas', '_estoque', '_statusEstoque', '_valor'],
    filtros: ['categoria', '_statusEstoque', '_statusVenc']
  },
  {
    id: 'movepi', nome: 'Movimentação de EPI', grupo: 'EPI', singular: 'movimentação', fem: 1, aba: 'MOV_EPI', chave: 'epi',
    campos: [
      { k: 'tipo', l: 'Entrada ou saída', t: 'opt', opts: ['SAÍDA', 'ENTRADA'], req: 1, x: 'ENTRADA OU SAÍDA', padrao: 'SAÍDA' },
      { k: 'epi', l: 'EPI', t: 'epi', req: 1, w: 2, x: 'DESCRIÇÃO DO EPI' },
      { k: 'qtd', l: 'Quantidade', t: 'num', req: 1, x: 'QTD', padrao: 1 },
      { k: 'destino', l: 'Funcionário ou fornecedor', t: 'opt', opts: ['Funcionário', 'Fornecedor'], x: 'FUNCIONÁRIO / FORNECEDOR', padrao: 'Funcionário' },
      { k: 'colab', l: 'Colaborador', t: 'colab', w: 2, x: 'NOME', se: (r) => r.destino !== 'Fornecedor' },
      { k: 'fornecedor', l: 'Fornecedor', t: 'sel', lista: 'fornecedores', w: 2, se: (r) => r.destino === 'Fornecedor' },
      { k: 'data', l: 'Data', t: 'date', req: 1, x: 'DATA' },
      { k: 'preco', l: 'Preço unitário', t: 'money', x: 'PREÇO UNITÁRIO', hint: 'Em branco: usa o preço do cadastro' },
      { k: 'med', l: 'MED (motivo)', t: 'sel', lista: 'med', w: 2, x: 'MED (MOTIVO DA ENTREGA OU DEVOLUÇÃO)' },
      { k: 'devolucao', l: 'Data de devolução', t: 'date', x: 'DATA DE DEVOLUÇÃO' },
      { k: 'motivoDev', l: 'Motivo da devolução', t: 'sel', lista: 'motivosDevolucao', x: 'MOTIVO DA DEVOLUÇÃO', se: (r) => !!r.devolucao },
      { k: 'validadeDias', l: 'Validade de uso (dias)', t: 'num', x: 'VALIDADE DE USO (DIAS)', hint: 'Em branco: usa o prazo do cadastro do EPI', se: (r) => r.tipo !== 'ENTRADA' && r.destino !== 'Fornecedor' },
      { k: 'obs', l: 'Observação', t: 'text', w: 4 }
    ],
    colunas: ['data', 'tipo', 'epi', 'qtd', '_quem', 'med', '_total', 'devolucao', '_troca', '_statusTroca'],
    filtros: ['tipo', '_statusTroca', '_ano', '_mes']
  },
  {
    id: 'documentos', nome: 'Documentos', grupo: 'Gestão', singular: 'documento', aba: 'DOCUMENTOS', chave: 'nome',
    campos: [
      { k: 'nome', l: 'Nome do documento', t: 'text', req: 1, w: 2, x: 'NOME DO DOCUMENTO' },
      { k: 'tipo', l: 'Tipo', t: 'sel', lista: 'tiposDocumento', x: 'TIPO' },
      { k: 'area', l: 'Área', t: 'sel', lista: 'areasDocumento', x: 'ÁREA' },
      { k: 'data', l: 'Data de emissão', t: 'date', x: 'DATA' },
      { k: 'revisao', l: 'Revisão', t: 'text', x: 'REVISÃO' },
      { k: 'dataRevisao', l: 'Data da última revisão', t: 'date', x: 'DATA DA ÚLTIMA REVISÃO' },
      { k: 'validadeMeses', l: 'Validade (meses)', t: 'num', x: 'VALIDADE (EM MESES)' },
      { k: 'controlar', l: 'Controlar validade?', t: 'sn', x: 'CONTROLAR VALIDADE?', padrao: 'Sim' },
      { k: 'responsavel', l: 'Responsável', t: 'text', w: 2 },
      { k: 'obs', l: 'Observações', t: 'textarea', w: 4 }
    ],
    colunas: ['nome', 'tipo', 'area', 'revisao', '_venc', '_statusVenc'],
    filtros: ['tipo', 'area', '_statusVenc']
  },
  {
    id: 'oss', nome: 'Ordem de Serviço (OSS)', grupo: 'Gestão', singular: 'ordem de serviço', fem: 1, aba: 'OSS', chave: 'colab', imprimir: 'oss',
    campos: [
      { k: 'numero', l: 'Número da OSS', t: 'text', x: 'NÚMERO DA OSS' },
      { k: 'colab', l: 'Colaborador', t: 'colab', req: 1, w: 2, x: 'NOME DO COLABORADOR' },
      { k: 'data', l: 'Data da elaboração', t: 'date', x: 'DATA DA ELABORAÇÃO' },
      { k: 'dataRevisao', l: 'Data da revisão', t: 'date', x: 'DATA DA REVISÃO' },
      { k: 'objetivo', l: 'Objetivo', t: 'textarea', w: 4, x: 'OBJETIVO', padraoParam: 'objetivoOSS' },
      { k: 'atividades', l: 'Descrição das atividades', t: 'textarea', w: 4, x: 'DESCRIÇÃO DAS ATIVIDADES DESENVOLVIDAS' },
      { k: 'riscos', l: 'Riscos das atividades', t: 'textarea', w: 4, x: 'RISCOS DAS ATIVIDADES DESENVOLVIDAS' },
      { k: 'epis', l: 'EPIs obrigatórios', t: 'textarea', w: 4, x: 'EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL OBRIGATÓRIOS' },
      { k: 'medidas', l: 'Medidas preventivas', t: 'textarea', w: 4, x: 'MEDIDAS PREVENTIVAS' },
      { k: 'obrigacoes', l: 'Obrigações', t: 'textarea', w: 4, x: 'OBRIGAÇÕES' },
      { k: 'sancoes', l: 'Sanções', t: 'textarea', w: 4, x: 'SANÇÕES' },
      { k: 'procedimentos', l: 'Procedimentos em caso de acidente', t: 'textarea', w: 4, x: 'PROCEDIMENTOS EM CASO DE ACIDENTES' },
      { k: 'normas', l: 'Normas internas', t: 'textarea', w: 4, x: 'NORMAS INTERNAS' },
      { k: 'obs', l: 'Observações', t: 'textarea', w: 4, x: 'OBSERVAÇÕES' },
      { k: 'termo', l: 'Termo de responsabilidade', t: 'textarea', w: 4, x: 'TERMO DE RESPONSABILIDADE', padraoParam: 'termoOSS' }
    ],
    colunas: ['numero', 'colab', '_funcao', 'data', 'dataRevisao'],
    filtros: []
  },
  {
    id: 'atividades', nome: 'Atividades por função', grupo: 'Gestão', singular: 'atividade da função', fem: 1, aba: 'INFO_ATIVIDADES', chave: 'funcao',
    ajuda: 'Cadastre aqui o conteúdo padrão de cada função. A OSS do colaborador é preenchida automaticamente a partir deste cadastro.',
    campos: [
      { k: 'funcao', l: 'Função', t: 'sel', lista: 'funcoes', req: 1, x: 'FUNÇÃO' },
      { k: 'setor', l: 'Setor', t: 'sel', lista: 'setores', x: 'SETOR' },
      { k: 'atividades', l: 'Descrição das atividades', t: 'textarea', w: 4, x: 'DESCRIÇÃO DAS ATIVIDADES DESENVOLVIDAS' },
      { k: 'riscos', l: 'Riscos das atividades', t: 'textarea', w: 4, x: 'RISCOS DAS ATIVIDADES DESENVOLVIDAS' },
      { k: 'epis', l: 'EPIs obrigatórios', t: 'textarea', w: 4, x: 'EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL OBRIGATÓRIOS' },
      { k: 'medidas', l: 'Medidas preventivas', t: 'textarea', w: 4, x: 'MEDIDAS PREVENTIVAS' },
      { k: 'obrigacoes', l: 'Obrigações', t: 'textarea', w: 4, x: 'OBRIGAÇÕES' },
      { k: 'sancoes', l: 'Sanções', t: 'textarea', w: 4, x: 'SANÇÕES' },
      { k: 'procedimentos', l: 'Procedimentos em caso de acidente', t: 'textarea', w: 4, x: 'PROCEDIMENTOS EM CASO DE ACIDENTES' },
      { k: 'normas', l: 'Normas internas', t: 'textarea', w: 4, x: 'NORMAS INTERNAS' },
      { k: 'obs', l: 'Observações', t: 'textarea', w: 4, x: 'OBSERVAÇÕES' }
    ],
    colunas: ['funcao', 'setor', 'atividades'],
    filtros: ['setor']
  },
  {
    id: 'auditorias', nome: 'Auditorias', grupo: 'Ocorrências', singular: 'auditoria', fem: 1, aba: 'AUDITORIA', chave: 'nome',
    campos: [
      { k: 'nome', l: 'Auditoria', t: 'text', req: 1, w: 2, x: 'AUDITORIA' },
      { k: 'tipo', l: 'Tipo', t: 'sel', lista: 'tiposAuditoria', x: 'TIPO DA AUDITORIA' },
      { k: 'data', l: 'Data', t: 'date', x: 'DATA' },
      { k: 'status', l: 'Situação', t: 'sel', lista: 'statusAuditoria', x: 'STATUS' },
      { k: 'normas', l: 'Normas', t: 'text', w: 2, x: 'NORMAS' },
      { k: 'ncEncontradas', l: 'Não conformidades encontradas', t: 'num', x: 'NÃO CONFORMIDADES ENCONTRADAS' },
      { k: 'ncResolvidas', l: 'Não conformidades resolvidas', t: 'num', x: 'NÃO CONFORMIDADES RESOLVIDAS' },
      { k: 'obs', l: 'Observações', t: 'textarea', w: 4 }
    ],
    colunas: ['nome', 'tipo', 'data', 'status', 'ncEncontradas', 'ncResolvidas', '_perc'],
    filtros: ['tipo', 'status', '_ano']
  },
  {
    id: 'desvios', nome: 'Desvios e incidentes', grupo: 'Ocorrências', singular: 'desvio ou incidente', aba: 'DESVIOS', chave: 'descricao',
    campos: [
      { k: 'classe', l: 'Desvio ou incidente', t: 'opt', opts: ['Desvio', 'Incidente'], req: 1, x: 'DESVIO OU INCIDENTE' },
      { k: 'data', l: 'Data', t: 'date', req: 1, x: 'DATA' },
      { k: 'tipo', l: 'Tipo', t: 'sel', lista: 'tiposDesvio', x: 'TIPO' },
      { k: 'gravidade', l: 'Gravidade', t: 'sel', lista: 'gravidadeDesvio', x: 'GRAVIDADE' },
      { k: 'setor', l: 'Setor', t: 'sel', lista: 'setores', x: 'SETOR' },
      { k: 'responsavel', l: 'Responsável pela ação', t: 'text' },
      { k: 'descricao', l: 'Descrição', t: 'textarea', req: 1, w: 4, x: 'DESCRIÇÃO DO INCIDENTE OU DESVIO' },
      { k: 'acoes', l: 'Ações a realizar', t: 'textarea', w: 4, x: 'AÇÕES A SEREM REALIZADAS' },
      { k: 'prazo', l: 'Prazo para conclusão', t: 'date', x: 'PRAZO PARA CONCLUSÃO' },
      { k: 'conclusao', l: 'Data da conclusão', t: 'date', x: 'DATA DA CONCLUSÃO' }
    ],
    colunas: ['data', 'classe', 'tipo', 'gravidade', 'setor', 'descricao', 'prazo', '_statusAcao'],
    filtros: ['classe', 'tipo', 'gravidade', '_statusAcao']
  },
  {
    id: 'planos', nome: 'Plano de ação 5W2H', grupo: 'Gestão', singular: 'plano de ação', aba: '5W2H', chave: 'nome', imprimir: '5w2h',
    campos: [
      { k: 'nome', l: 'Nome do plano', t: 'text', req: 1, w: 2, x: 'NOME DO PLANO' },
      { k: 'status', l: 'Situação', t: 'opt', opts: ['EM ABERTO', 'AGENDADO', 'REALIZADO', 'CANCELADO'], x: 'STATUS', padrao: 'EM ABERTO' },
      { k: 'prioridade', l: 'Prioridade', t: 'sel', lista: 'prioridades', x: 'PRIORIDADE' },
      { k: 'data', l: 'Data de abertura', t: 'date', x: 'DATA' },
      { k: 'prazo', l: 'Quando? (prazo)', t: 'date', x: 'CONCLUSÃO' },
      { k: 'oque', l: 'O quê? (What)', t: 'textarea', w: 2, x: 'O QUÊ?' },
      { k: 'porque', l: 'Por quê? (Why)', t: 'textarea', w: 2, x: 'POR QUÊ?' },
      { k: 'quem', l: 'Quem? (Who)', t: 'text', w: 2, x: 'QUEM?' },
      { k: 'onde', l: 'Onde? (Where)', t: 'text', w: 2, x: 'ONDE' },
      { k: 'como', l: 'Como? (How)', t: 'textarea', w: 2, x: 'COMO?' },
      { k: 'quanto', l: 'Quanto custa? (How much)', t: 'money', x: 'QUANTO?' },
      { k: 'obs', l: 'Observações', t: 'textarea', w: 4, x: 'OBS' }
    ],
    colunas: ['nome', 'prioridade', 'quem', 'prazo', 'status', '_prazoStatus', 'quanto'],
    filtros: ['status', 'prioridade', '_prazoStatus']
  },
  {
    id: 'riscos', nome: 'Riscos ambientais', grupo: 'Gestão', singular: 'risco', aba: 'RISCOS', chave: 'descricao',
    campos: [
      { k: 'funcao', l: 'Função', t: 'sel', lista: 'funcoes', x: 'FUNÇÃO' },
      { k: 'setor', l: 'Setor', t: 'sel', lista: 'setores', x: 'SETOR' },
      { k: 'tipo', l: 'Tipo do risco', t: 'sel', lista: 'tiposRisco', req: 1, x: 'TIPO DO RISCO' },
      { k: 'descricao', l: 'Perigo / descrição do risco', t: 'text', req: 1, w: 2, x: 'DESCRIÇÃO DO RISCO' },
      { k: 'danos', l: 'Possíveis danos ou lesões', t: 'text', w: 2, x: 'DANOS OU LESÕES' },
      { k: 'expostos', l: 'Quantidade de expostos', t: 'num', x: 'QTD EXPOSTOS' },
      { k: 'exposicao', l: 'Tempo / tipo da exposição', t: 'text', x: 'TEMPO OU TIPO DA EXPOSIÇÃO' },
      { k: 'controles', l: 'Controles existentes', t: 'textarea', w: 4, x: 'CONTROLES EXISTENTES' },
      { k: 'prob', l: 'Probabilidade (1 a 5)', t: 'opt', opts: ['1', '2', '3', '4', '5'], x: 'PROBABILIDADE' },
      { k: 'sev', l: 'Severidade (1 a 5)', t: 'opt', opts: ['1', '2', '3', '4', '5'], x: 'SEVERIDADE' }
    ],
    colunas: ['setor', 'funcao', 'tipo', 'descricao', 'prob', 'sev', '_nivel', '_classe'],
    filtros: ['setor', 'tipo', '_classe']
  },
  {
    id: 'extintores', nome: 'Extintores', grupo: 'Emergência', singular: 'extintor', aba: 'EXTINTORES', chave: 'numero',
    campos: [
      { k: 'numero', l: 'Número', t: 'text', req: 1, x: 'NÚM' },
      { k: 'tipo', l: 'Tipo (agente + carga)', t: 'sel', lista: 'tiposExtintor', x: 'TIPO DO EXTINTOR (TIPO + CARGA)' },
      { k: 'inmetro', l: 'Nº Inmetro', t: 'text', x: 'Nº INMETRO' },
      { k: 'local', l: 'Localização', t: 'text', w: 2, x: 'LOCALIZAÇÃO' },
      { k: 'recarga', l: 'Data da recarga', t: 'date', x: 'DATA DA RECARGA' },
      { k: 'validadeMeses', l: 'Validade da recarga (meses)', t: 'num', x: 'VALIDADE (EM MESES)', hint: 'Em branco: usa o padrão das Configurações' },
      { k: 'th', l: 'Último teste hidrostático', t: 'date', x: 'DATA DO ÚLTIMO TESTE HIDROSTÁTICO' },
      { k: 'obs', l: 'Observações', t: 'text', w: 4, x: 'OBS' }
    ],
    colunas: ['numero', 'tipo', 'local', '_proxRecarga', '_statusRecarga', '_proxTH', '_statusTH'],
    filtros: ['tipo', '_statusRecarga', '_statusTH']
  },
  {
    id: 'hidrantes', nome: 'Hidrantes', grupo: 'Emergência', singular: 'hidrante', aba: 'HIDRANTES', chave: 'numero',
    campos: [
      { k: 'numero', l: 'Número', t: 'text', req: 1, x: 'NÚMERO' },
      { k: 'local', l: 'Localização', t: 'text', w: 2, x: 'LOCALIZAÇÃO' },
      { k: 'abrigo', l: 'Abrigo', t: 'text', x: 'ABRIGO' },
      { k: 'th', l: 'Data do teste hidrostático', t: 'date', x: 'DATA TESTE HIDROSTÁTICO' },
      { k: 'validadeMeses', l: 'Validade (meses)', t: 'num', x: 'VALIDADE (EM MESES)', hint: 'Em branco: usa o padrão das Configurações' },
      { k: 'lacre', l: 'Lacre', t: 'opt', opts: ['Conforme', 'Não conforme'], x: 'LACRE' },
      { k: 'mangueira', l: 'Mangueira', t: 'opt', opts: ['Conforme', 'Não conforme'], x: 'MANGUEIRA' },
      { k: 'diametro', l: 'Diâmetro', t: 'text', x: 'DIÂMETRO' },
      { k: 'comprimento', l: 'Comprimento (m)', t: 'num', x: 'COMPRIMENTO (m)' },
      { k: 'esguicho', l: 'Esguicho', t: 'opt', opts: ['Conforme', 'Não conforme'], x: 'ESGUICHO' },
      { k: 'tampao', l: 'Tampão', t: 'opt', opts: ['Conforme', 'Não conforme'], x: 'TAMPÃO' },
      { k: 'chave', l: 'Chave', t: 'opt', opts: ['Conforme', 'Não conforme'], x: 'CHAVE' },
      { k: 'sinalizacao', l: 'Sinalização', t: 'opt', opts: ['Conforme', 'Não conforme'], x: 'SINALIZAÇÃO' },
      { k: 'obs', l: 'Observações', t: 'text', w: 4, x: 'OBS' }
    ],
    colunas: ['numero', 'local', 'th', '_prox', '_status', '_naoConf'],
    filtros: ['_status']
  },
  {
    id: 'equipamentos', nome: 'Máquinas e equipamentos', grupo: 'Equipamentos', singular: 'máquina ou equipamento', aba: 'LISTA_EQUIPAMENTOS', chave: 'nome',
    campos: [
      { k: 'nome', l: 'Máquina / equipamento / ferramenta', t: 'text', req: 1, w: 2, x: 'MÁQUINA / EQUIPAMENTO / FERRAMENTA' },
      { k: 'modelo', l: 'Modelo', t: 'text', x: 'MODELO' },
      { k: 'fabricante', l: 'Fabricante', t: 'text', x: 'FABRICANTE' },
      { k: 'ano', l: 'Ano', t: 'num', x: 'ANO' },
      { k: 'tipo', l: 'Tipo', t: 'sel', lista: 'tiposEquip', x: 'TIPO' },
      { k: 'potencia', l: 'Potência', t: 'text', x: 'POTÊNCIA' },
      { k: 'voltagem', l: 'Tensão', t: 'text', x: 'VOLTAGEM' },
      { k: 'setor', l: 'Setor', t: 'sel', lista: 'setores', x: 'SETOR' },
      { k: 'patrimonio', l: 'Patrimônio / TAG', t: 'text' }
    ],
    colunas: ['nome', 'modelo', 'fabricante', 'tipo', 'setor', '_ultimaManut'],
    filtros: ['tipo', 'setor']
  },
  {
    id: 'manutencoes', nome: 'Manutenção de equipamentos', grupo: 'Equipamentos', singular: 'manutenção', fem: 1, aba: 'MANUTENÇÃO_EQUIPAMENTOS', chave: 'equip',
    campos: [
      { k: 'equip', l: 'Máquina / equipamento', t: 'equip', req: 1, w: 2, x: 'MÁQUINA / EQUIPAMENTO / FERRAMENTA' },
      { k: 'data', l: 'Data', t: 'date', req: 1, x: 'DATA' },
      { k: 'status', l: 'Situação', t: 'sel', lista: 'statusManut', x: 'STATUS' },
      { k: 'tipo', l: 'Tipo', t: 'sel', lista: 'tiposManut', x: 'TIPO' },
      { k: 'prioridade', l: 'Prioridade', t: 'sel', lista: 'prioridades', x: 'PRIORIDADE' },
      { k: 'custo', l: 'Custo', t: 'money', x: 'CUSTO' },
      { k: 'responsavel', l: 'Responsável', t: 'text', w: 2, x: 'RESPONSÁVEL' },
      { k: 'itens', l: 'Itens analisados e/ou resolvidos', t: 'textarea', w: 4, x: 'ITENS ANALISADOS E/OU RESOLVIDOS' }
    ],
    colunas: ['data', 'equip', 'tipo', 'prioridade', 'status', 'custo', 'responsavel'],
    filtros: ['status', 'tipo', '_ano']
  },
  {
    id: 'cipa', nome: 'CIPA — mandato e estabilidade', grupo: 'CIPA', singular: 'membro da CIPA', aba: 'ESTABILIDADE_CIPA', chave: 'colab',
    campos: [
      { k: 'gestao', l: 'Gestão', t: 'text', x: 'GESTÃO CIPA', hint: 'Ex.: 2025/2026' },
      { k: 'colab', l: 'Membro (cipeiro)', t: 'colab', req: 1, w: 2, x: 'NOME DO CIPEIRO' },
      { k: 'representa', l: 'Representação', t: 'opt', opts: ['Empregados (eleito)', 'Empregador (indicado)'], padrao: 'Empregados (eleito)' },
      { k: 'cargo', l: 'Titular ou suplente', t: 'opt', opts: ['Titular', 'Suplente'], x: 'ELEITO' },
      { k: 'funcaoCipa', l: 'Cargo na CIPA', t: 'opt', opts: ['', 'Presidente', 'Vice-presidente', 'Secretário', 'Membro'] },
      { k: 'posse', l: 'Data da posse', t: 'date', req: 1, x: 'DATA DA POSSE' },
      { k: 'votos', l: 'Nº de votos', t: 'num', x: 'Nº DE VOTOS' },
      { k: 'controlar', l: 'Controlar situação?', t: 'sn', x: 'CONTROLAR STATUS?', padrao: 'Sim' }
    ],
    colunas: ['gestao', 'colab', 'representa', 'cargo', 'posse', '_fimMandato', '_statusMandato', '_fimEstab', '_statusEstab'],
    filtros: ['gestao', 'cargo', '_statusMandato']
  },
  {
    id: 'frota', nome: 'Frota de veículos', grupo: 'Equipamentos', singular: 'serviço da frota', aba: 'FROTA', chave: 'placa',
    campos: [
      { k: 'placa', l: 'Placa', t: 'text', req: 1, x: 'PLACA' },
      { k: 'veiculo', l: 'Veículo', t: 'text', w: 2, x: 'VEÍCULO' },
      { k: 'tipo', l: 'Tipo', t: 'sel', lista: 'tiposVeiculo', x: 'TIPO' },
      { k: 'data', l: 'Data', t: 'date', x: 'DATA' },
      { k: 'status', l: 'Situação', t: 'sel', lista: 'statusFrota', x: 'STATUS' },
      { k: 'km', l: 'KM atual', t: 'num', x: 'KM ATUAL' },
      { k: 'tipoManut', l: 'Tipo de manutenção', t: 'sel', lista: 'tiposManutFrota', x: 'TIPO DE MANUTENÇÃO' },
      { k: 'valor', l: 'Valor', t: 'money', x: 'VALOR' },
      { k: 'empresa', l: 'Empresa executante', t: 'text', w: 2, x: 'EMPRESA' },
      { k: 'descricao', l: 'Descrição do serviço', t: 'text', w: 2, x: 'DESCRIÇÃO DO SERVIÇO' },
      { k: 'detalhes', l: 'Detalhes do serviço', t: 'textarea', w: 4, x: 'DETALHES DO SERVIÇO' }
    ],
    colunas: ['data', 'placa', 'veiculo', 'tipo', 'tipoManut', 'status', 'km', 'valor'],
    filtros: ['tipo', 'status', '_ano']
  },
  {
    id: 'quimicos', nome: 'Produtos químicos', grupo: 'Gestão', singular: 'produto químico', aba: 'PRODUTOS QUIMICOS', chave: 'nomeComercial',
    campos: [
      { k: 'nomeComercial', l: 'Nome comercial', t: 'text', req: 1, w: 2, x: 'NOME COMERCIAL' },
      { k: 'nomeTecnico', l: 'Nome técnico / substância', t: 'text', w: 2, x: 'NOME TÉCNICO - SUBSTÂNCIA QUÍMICA' },
      { k: 'fabricante', l: 'Fabricante', t: 'text', x: 'FABRICANTE' },
      { k: 'perigo', l: 'Representa perigo?', t: 'opt', opts: ['SIM', 'NÃO', 'NÃO APLICÁVEL'], x: 'REPRESENTA PERIGO?' },
      { k: 'classe', l: 'Classe de risco', t: 'sel', lista: 'classesQuimicos', w: 2, x: 'CLASSE DE RISCO' },
      { k: 'onu', l: 'Nº ONU', t: 'text', x: 'Nº ONU' },
      { k: 'cas', l: 'Nº CAS', t: 'text', x: 'Nº CAS' },
      { k: 'caracteristicas', l: 'Características', t: 'checks', opts: ['Inflamável', 'Corrosivo', 'Tóxico', 'Reativo', 'Patogênico'], w: 2 },
      { k: 'tipoEmb', l: 'Tipo da embalagem', t: 'sel', lista: 'embalagemTipo', x: 'TIPO DA EMBALAGEM' },
      { k: 'materialEmb', l: 'Material da embalagem', t: 'sel', lista: 'embalagemMaterial', x: 'MATERIAL DA EMBALAGEM' },
      { k: 'local', l: 'Local de armazenamento', t: 'text', w: 2, x: 'LOCAL DE ARMAZENAMENTO' },
      { k: 'quantidade', l: 'Quantidade armazenada', t: 'text', x: 'QUANTIDADE ARMAZENADA' },
      { k: 'aprovado', l: 'Aprovado?', t: 'sn', x: 'APROVADO?' },
      { k: 'orgao', l: 'Órgão fiscalizador', t: 'text', x: 'ÓRGÃO FISCALIZADOR' },
      { k: 'fornecedor', l: 'Fornecedor', t: 'text', x: 'FORNECEDOR' },
      { k: 'fispq', l: 'Possui FDS (antiga FISPQ)?', t: 'sn', x: 'POSSUI FISPQ?' },
      { k: 'localFispq', l: 'Local da FDS', t: 'text', x: 'LOCAL DA FISPQ' },
      { k: 'controle', l: 'Controle interno', t: 'text', x: 'CONTROLE INTERNO' },
      { k: 'destinacao', l: 'Destinação do produto', t: 'text', w: 2, x: 'DESTINAÇÃO DO PRODUTO QUÍMICO' }
    ],
    colunas: ['nomeComercial', 'nomeTecnico', 'classe', 'perigo', 'local', 'fispq', 'aprovado'],
    filtros: ['perigo', 'classe', 'fispq']
  },
  {
    id: 'dds', nome: 'DDS', grupo: 'Pessoas', singular: 'DDS', aba: 'EXTRAS', chave: 'tema', imprimir: 'dds',
    campos: [
      { k: 'tema', l: 'Tema / descrição do DDS', t: 'text', req: 1, w: 2, x: 'DESCRIÇÃO DO DDS' },
      { k: 'status', l: 'Situação', t: 'opt', opts: ['Realizado', 'Agendado', 'Cancelado'], x: 'STATUS DDS', padrao: 'Realizado' },
      { k: 'data', l: 'Data', t: 'date', req: 1, x: 'DATA' },
      { k: 'hora', l: 'Hora', t: 'time' },
      { k: 'departamento', l: 'Departamento', t: 'sel', lista: 'departamentos', x: 'DEPARTAMENTO' },
      { k: 'instrutor', l: 'Instrutor', t: 'sel', lista: 'instrutores', x: 'INSTRUTOR' },
      { k: 'duracao', l: 'Duração (min)', t: 'num' },
      { k: 'local', l: 'Local', t: 'text', w: 2 },
      { k: 'conteudo', l: 'Conteúdo abordado', t: 'textarea', w: 4 },
      { k: 'participantes', l: 'Participantes', t: 'multicolab', w: 4 },
      { k: 'obs', l: 'Observações finais', t: 'textarea', w: 4 }
    ],
    colunas: ['data', 'tema', 'departamento', 'instrutor', 'status', '_qtd'],
    filtros: ['status', 'departamento', '_ano']
  }
];

const MOD = Object.fromEntries(MODULOS.map((m) => [m.id, m]));

/** Rótulos das colunas calculadas */
const ROTULOS_CALC = {
  _idade: 'Idade', _tempo: 'Tempo de empresa', _diasPerdidos: 'Dias perdidos', _venc: 'Vencimento',
  _statusVenc: 'Situação da validade', _qtd: 'Participantes', _setor: 'Setor', _funcao: 'Função',
  _entradas: 'Entradas', _saidas: 'Saídas', _estoque: 'Estoque', _statusEstoque: 'Situação do estoque',
  _valor: 'Valor em estoque', _quem: 'Colaborador / fornecedor', _total: 'Total', _perc: '% resolvido',
  _statusAcao: 'Situação da ação', _prazoStatus: 'Prazo', _nivel: 'Nível', _classe: 'Classificação',
  _proxRecarga: 'Próxima recarga', _statusRecarga: 'Recarga', _proxTH: 'Próximo teste hidrostático',
  _statusTH: 'Teste hidrostático', _prox: 'Próximo teste', _status: 'Situação', _naoConf: 'Itens não conformes',
  _ultimaManut: 'Última manutenção', _fimMandato: 'Fim do mandato', _statusMandato: 'Mandato',
  _fimEstab: 'Fim da estabilidade', _troca: 'Troca prevista', _statusTroca: 'Validade do EPI entregue', _statusEstab: 'Estabilidade', _ano: 'Ano', _mes: 'Mês'
};

function novoRotulo(m) { return (m.fem ? 'Nova ' : 'Novo ') + m.singular; }

function campoDe(mod, k) {
  return (MOD[mod].campos.find((c) => c.k === k)) || null;
}
function rotulo(mod, k) {
  if (k.startsWith('_')) return ROTULOS_CALC[k] || k;
  const c = campoDe(mod, k); return c ? c.l : k;
}
