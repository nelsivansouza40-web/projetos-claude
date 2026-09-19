/*
 * Banco de perguntas do Diagnóstico de Gestão de SSMA.
 * Avalia, por categoria, o grau de implementação do sistema de gestão de
 * Segurança, Saúde do Trabalho e Meio Ambiente da empresa/unidade — não
 * substitui o PGR nem as inspeções de campo, é uma fotografia da gestão
 * como um todo, usada para priorizar investimentos e ações corretivas.
 * Cada item é respondido como Atende / Atende Parcialmente / Não Atende /
 * Não se Aplica, e o aplicativo calcula um percentual de conformidade por
 * categoria e um índice geral.
 */

const DIAGNOSTICO_CATEGORIAS = [
  {
    nome: 'Gestão Documental e Legal',
    itens: [
      'A empresa possui PGR (Programa de Gerenciamento de Riscos) elaborado e atualizado?',
      'O PCMSO está elaborado, implementado e dentro do prazo de validade?',
      'O LTCAT, quando aplicável, está atualizado e disponível?',
      'As licenças ambientais e alvarás necessários estão vigentes?',
      'Os documentos obrigatórios de SSMA estão organizados e acessíveis para consulta?',
      'Existe controle de prazos de validade dos documentos legais e suas renovações?',
      'As exigências das Normas Regulamentadoras aplicáveis à atividade estão mapeadas?',
      'Auditorias ou fiscalizações de órgãos competentes são acompanhadas e tratadas formalmente?'
    ]
  },
  {
    nome: 'Saúde Ocupacional',
    itens: [
      'Todos os colaboradores possuem ASO (Atestado de Saúde Ocupacional) válido?',
      'Os exames complementares previstos no PCMSO são realizados conforme cronograma?',
      'Existe controle e acompanhamento de afastamentos por doença ocupacional?',
      'Colaboradores expostos a agentes de risco possuem monitoramento específico (ruído, químico, etc.)?',
      'A ergonomia (NR-17) é avaliada nos postos de trabalho?',
      'Existe programa de prevenção a riscos psicossociais/saúde mental?',
      'Os resultados dos exames ocupacionais orientam ações de prevenção?',
      'Há controle de vacinação e outras medidas de vigilância em saúde, quando aplicável?'
    ]
  },
  {
    nome: 'Treinamentos e Capacitação',
    itens: [
      'Todos os colaboradores possuem treinamento de integração em SSMA?',
      'Os treinamentos específicos por NR (NR-35, NR-33, NR-10, NR-12, NR-18 etc.) estão em dia?',
      'Existe controle de validade e reciclagem periódica dos treinamentos?',
      'Os registros de treinamento (listas de presença, certificados) estão arquivados?',
      'Lideranças recebem capacitação específica em gestão de segurança?',
      'Novos colaboradores recebem treinamento antes de iniciar suas atividades?',
      'Há avaliação de eficácia dos treinamentos aplicados?',
      'Treinamentos de brigada de incêndio e resposta a emergências são realizados periodicamente?'
    ]
  },
  {
    nome: 'EPI e EPC',
    itens: [
      'Os EPIs fornecidos possuem Certificado de Aprovação (CA) válido?',
      'Existe ficha de entrega de EPI assinada por todos os colaboradores?',
      'Os EPIs são trocados/substituídos quando danificados ou vencidos?',
      'Os colaboradores são treinados quanto ao uso, guarda e conservação dos EPIs?',
      'EPCs (proteções coletivas) estão instalados nos pontos de risco identificados?',
      'Existe rotina de inspeção periódica dos EPCs instalados?',
      'O estoque de EPI é suficiente para atender a demanda da operação?',
      'A adequação do EPI/EPC à atividade é avaliada tecnicamente, e não apenas por disponibilidade?'
    ]
  },
  {
    nome: 'Gestão de Riscos e Inspeções',
    itens: [
      'O PGR contempla o inventário de riscos atualizado de todas as atividades?',
      'Inspeções periódicas de segurança são realizadas e documentadas?',
      'Não conformidades identificadas em inspeções são tratadas com plano de ação?',
      'Existe controle de prazos e responsáveis para as ações corretivas?',
      'Riscos críticos possuem controles específicos implementados e monitorados?',
      'Mudanças de processo, layout ou equipamentos passam por análise de risco prévia?',
      'Há indicadores de desempenho de SSMA acompanhados periodicamente?',
      'As inspeções cobrem áreas operacionais, administrativas e de empresas terceirizadas?'
    ]
  },
  {
    nome: 'CIPA e Organização Interna',
    itens: [
      'A CIPA está constituída conforme o dimensionamento exigido pela NR-5?',
      'As eleições da CIPA são realizadas conforme o cronograma legal?',
      'As atas de reunião da CIPA são registradas e arquivadas?',
      'Os membros da CIPA recebem treinamento adequado?',
      'O mapa de riscos está atualizado e afixado nas áreas correspondentes?',
      'A CIPA participa ativamente das inspeções e investigações de acidentes?',
      'Existe SESMT dimensionado conforme exigência legal, quando aplicável?',
      'Metas e ações da CIPA são acompanhadas e comunicadas aos colaboradores?'
    ]
  },
  {
    nome: 'Gestão de Emergência',
    itens: [
      'Existe plano de resposta a emergências formalizado e divulgado?',
      'A brigada de incêndio está constituída e treinada?',
      'Simulados de emergência são realizados periodicamente?',
      'Extintores, hidrantes e demais equipamentos de combate a incêndio são inspecionados regularmente?',
      'As rotas de fuga e saídas de emergência estão sinalizadas e desobstruídas?',
      'Existe ponto de encontro definido e conhecido pelos colaboradores?',
      'Kits de primeiros socorros estão disponíveis e completos nas áreas de trabalho?',
      'Os contatos de emergência (bombeiros, ambulância, etc.) estão visíveis e atualizados?'
    ]
  },
  {
    nome: 'Investigação e Registro de Acidentes',
    itens: [
      'Todos os acidentes e incidentes são registrados formalmente?',
      'A CAT (Comunicação de Acidente de Trabalho) é emitida dentro do prazo legal?',
      'As investigações de acidentes identificam causas raiz, não apenas causas imediatas?',
      'Os planos de ação decorrentes de investigações são implementados e verificados?',
      'Existem indicadores de taxa de frequência e gravidade de acidentes acompanhados periodicamente?',
      'As lições aprendidas de acidentes são comunicadas a outras áreas ou unidades?',
      'Quase-acidentes (near miss) são registrados e tratados preventivamente?',
      'As estatísticas de acidentes são analisadas para identificar tendências e reincidências?'
    ]
  }
];
