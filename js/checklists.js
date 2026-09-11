/*
 * Bancos de perguntas por tipo de inspeção.
 * Os itens de "Inspeção Geral de SST" seguem o modelo de referência definido.
 * Os itens das demais modalidades são um ponto de partida técnico geral:
 * devem ser revisados e ajustados pelo técnico responsável conforme o
 * processo real, a atividade e os requisitos normativos aplicáveis antes
 * do uso em campo. É possível adicionar itens personalizados em qualquer
 * inspeção, diretamente no aplicativo.
 */

const TIPOS_INSPECAO = [
  'Inspeção Geral de SST',
  'Máquinas e Equipamentos',
  'Ferramentas Manuais e Elétricas',
  'Trabalho em Altura',
  'Espaço Confinado',
  'Eletricidade',
  'Veículos e Equipamentos Móveis',
  'Içamento e Movimentação de Cargas',
  'EPI/EPC',
  'Prevenção e Combate a Incêndio',
  'Meio Ambiente e Resíduos',
  'Produtos Químicos',
  'Organização, Limpeza e Sinalização',
  'Canteiro/Área Operacional',
  'Outra inspeção específica'
];

const CHECKLISTS = {
  'Inspeção Geral de SST': [
    'Acessos e vias de circulação estão seguros e desobstruídos?',
    'A organização e limpeza da área estão adequadas?',
    'Pisos, plataformas e superfícies apresentam condições seguras?',
    'Escadas, rampas e passarelas apresentam condições adequadas?',
    'A sinalização de segurança está disponível, visível e adequada?',
    'Máquinas e equipamentos apresentam proteções e condições seguras?',
    'Dispositivos de emergência estão disponíveis e acessíveis?',
    'Ferramentas manuais estão adequadas e em boas condições?',
    'Ferramentas elétricas apresentam condições seguras de utilização?',
    'Instalações, cabos, painéis e conexões elétricas apresentam condições seguras?',
    'Os trabalhadores utilizam os EPIs definidos para a atividade?',
    'Os EPIs observados apresentam condições adequadas de conservação e uso?',
    'EPCs existentes estão instalados e funcionais?',
    'Trabalhos em altura observados apresentam controles compatíveis com a atividade?',
    'Escavações, aberturas ou diferenças de nível estão protegidas e sinalizadas?',
    'Operações com veículos e equipamentos móveis apresentam condições controladas?',
    'Atividades de movimentação e içamento de cargas apresentam condições seguras?',
    'Produtos químicos estão identificados, armazenados e controlados adequadamente?',
    'Resíduos estão segregados, identificados e acondicionados adequadamente?',
    'Extintores e demais recursos de emergência estão acessíveis e sem obstruções aparentes?',
    'Rotas e saídas destinadas à emergência encontram-se desobstruídas?',
    'Materiais estão armazenados de forma estável e segura?',
    'Existem condições ou comportamentos com potencial de acidente que necessitem intervenção?',
    'Os controles estabelecidos para os riscos observados estão efetivamente implementados?',
    'Existem outras condições de risco, desvios ou oportunidades de melhoria identificadas durante a inspeção?'
  ],

  'Máquinas e Equipamentos': [
    'A máquina possui proteções fixas e móveis instaladas e íntegras?',
    'Os dispositivos de parada de emergência estão acessíveis e funcionais?',
    'Existe registro de inspeção/manutenção preventiva atualizado?',
    'O prontuário da máquina (NR-12) está disponível e atualizado?',
    'Os operadores são capacitados e autorizados para a máquina?',
    'Sistemas de segurança (intertravamento, sensores, cortina de luz) estão funcionais?',
    'A sinalização de risco e os limites de operação estão visíveis?',
    'Não há improvisações ou bypass de dispositivos de segurança?',
    'O espaço ao redor da máquina permite operação e circulação seguras?',
    'Ruído, vibração ou outros agentes gerados pela máquina estão controlados?'
  ],

  'Ferramentas Manuais e Elétricas': [
    'As ferramentas manuais estão em bom estado de conservação (sem trincas, cabos soltos, fios expostos)?',
    'As ferramentas elétricas possuem sistema de aterramento ou isolação dupla íntegra?',
    'Cabos de alimentação e extensões estão íntegros, sem emendas irregulares?',
    'As ferramentas possuem proteção de partes móveis/cortantes quando aplicável?',
    'É utilizado dispositivo DR (diferencial residual) para ferramentas elétricas portáteis?',
    'As ferramentas são adequadas para a atividade executada?',
    'Existe local apropriado para guarda e transporte das ferramentas?',
    'Ferramentas danificadas são retiradas de uso e identificadas?'
  ],

  'Trabalho em Altura': [
    'Existe Permissão de Trabalho (PT) emitida e válida para a atividade?',
    'A Análise de Risco foi realizada e está compatível com a atividade em execução?',
    'Os trabalhadores possuem certificado de capacitação em trabalho em altura válido?',
    'O sistema de ancoragem é adequado e foi projetado/avaliado por profissional habilitado?',
    'Os cinturões de segurança tipo paraquedista e talabartes estão em boas condições?',
    'Está sendo utilizado sistema de proteção contra quedas (trava-quedas, linha de vida)?',
    'Existe plano de resgate e equipe/equipamento disponível para emergência?',
    'A área abaixo da atividade está isolada e sinalizada?',
    'As condições climáticas são compatíveis com a execução segura da atividade?',
    'Os pontos de ancoragem possuem resistência e fixação adequadas?'
  ],

  'Espaço Confinado': [
    'Existe Permissão de Entrada e Trabalho (PET) emitida e válida?',
    'A atmosfera do espaço confinado foi monitorada (O2, inflamáveis, tóxicos) antes da entrada?',
    'O monitoramento contínuo da atmosfera está sendo realizado durante a atividade?',
    'Existe vigia (observador) dedicado e treinado durante toda a entrada?',
    'Os equipamentos de ventilação/exaustão estão instalados e funcionando?',
    'Os trabalhadores possuem capacitação específica para espaço confinado?',
    'Existe equipamento de resgate e equipe de emergência disponível?',
    'O acesso está sinalizado e bloqueado para pessoas não autorizadas?',
    'Os EPIs específicos (respirador, tripé de resgate, etc.) estão disponíveis e adequados?'
  ],

  'Eletricidade': [
    'Os quadros e painéis elétricos estão identificados, fechados e sinalizados?',
    'Existe Permissão de Trabalho para atividades em instalações elétricas?',
    'Os trabalhadores possuem NR-10 (básico/complementar) compatível com a atividade?',
    'Foram adotados procedimentos de bloqueio e etiquetagem (LOTO) quando aplicável?',
    'Os EPIs isolantes (luvas, mangas, calçados) estão adequados e com teste de isolação válido?',
    'As ferramentas utilizadas são isoladas e apropriadas para trabalho elétrico?',
    'Cabos, fiações e conexões estão em boas condições, sem exposição de condutores?',
    'A área de trabalho elétrico está sinalizada e isolada?',
    'Existe aterramento adequado nas instalações e equipamentos?'
  ],

  'Veículos e Equipamentos Móveis': [
    'O veículo/equipamento possui checklist de pré-uso preenchido e atualizado?',
    'Os freios, luzes, sinalização sonora (ré) e cintos de segurança estão funcionais?',
    'O operador/motorista possui habilitação e capacitação compatível?',
    'Os limites de velocidade e rotas definidas estão sendo respeitados?',
    'Existe sinalização de manobra (ré, buzina) e uso de auxiliar de manobra quando necessário?',
    'Os pneus, espelhos e para-brisas estão em condições adequadas?',
    'A carga transportada está adequadamente fixada e distribuída?',
    'A manutenção preventiva do veículo/equipamento está em dia?',
    'A área de circulação é segregada do trânsito de pedestres quando aplicável?'
  ],

  'Içamento e Movimentação de Cargas': [
    'Existe Plano de Içamento para operações críticas ou não rotineiras?',
    'O guindaste/grua possui certificação e inspeção atualizada?',
    'Os cabos, cintas, correntes e acessórios de içamento estão em boas condições e com capacidade adequada?',
    'O operador possui certificação/capacitação válida para o equipamento?',
    'O sinaleiro/rigger está identificado, capacitado e presente durante a operação?',
    'A área abaixo e ao redor da carga está isolada e sinalizada?',
    'A capacidade de carga (tabela de carga) está sendo respeitada?',
    'O solo/base de apoio do equipamento é adequado e estável?',
    'Foi verificada a ausência de interferência com redes elétricas ou obstáculos aéreos?'
  ],

  'EPI/EPC': [
    'Os trabalhadores utilizam corretamente os EPIs definidos para a atividade?',
    'Os EPIs possuem Certificado de Aprovação (CA) válido e estão em boas condições?',
    'Existe controle de entrega e troca periódica dos EPIs (ficha de EPI)?',
    'Os EPCs aplicáveis (guarda-corpo, proteção coletiva, ventilação) estão instalados e íntegros?',
    'Os trabalhadores foram treinados quanto ao uso correto e conservação dos EPIs?',
    'Existe disponibilidade de EPIs de reposição na frente de serviço?',
    'Os EPIs estão adequados ao risco específico da atividade avaliada?'
  ],

  'Prevenção e Combate a Incêndio': [
    'Os extintores estão nos locais definidos, sinalizados, com carga e inspeção válidas?',
    'O acesso aos extintores e hidrantes está livre de obstruções?',
    'As rotas de fuga e saídas de emergência estão desobstruídas e sinalizadas?',
    'A iluminação de emergência está funcional?',
    'Os trabalhadores conhecem o plano de emergência e ponto de encontro?',
    'Existe brigada de incêndio treinada e identificada na área?',
    'Materiais inflamáveis/combustíveis estão armazenados adequadamente, longe de fontes de ignição?',
    'Os sistemas fixos de combate a incêndio (sprinklers, alarmes, detectores) estão operacionais?'
  ],

  'Meio Ambiente e Resíduos': [
    'Os resíduos estão segregados corretamente conforme classificação (recicláveis, orgânicos, perigosos)?',
    'Os recipientes de coleta estão identificados, íntegros e em quantidade suficiente?',
    'Existe área de armazenamento temporário de resíduos adequada e licenciada quando exigido?',
    'Produtos químicos e resíduos perigosos possuem contenção secundária adequada?',
    'Não há indícios de vazamento, contaminação do solo ou descarte irregular?',
    'A destinação final dos resíduos está sendo realizada por empresa licenciada, com documentação (MTR/CDF)?',
    'Existem medidas de controle de emissões, ruído ou poeira implementadas quando aplicável?',
    'A área apresenta condições de preservação de recursos hídricos e vegetação no entorno?'
  ],

  'Produtos Químicos': [
    'Os produtos químicos estão identificados com rótulo adequado (GHS/NR-26)?',
    'A Ficha de Informações de Segurança de Produtos Químicos (FISPQ/FDS) está disponível no local?',
    'O armazenamento respeita a compatibilidade química entre produtos?',
    'Existe contenção secundária para evitar vazamentos e contaminação?',
    'Os trabalhadores utilizam os EPIs específicos indicados para manuseio do produto?',
    'Existe chuveiro de emergência e lava-olhos disponível e funcional quando aplicável?',
    'A ventilação do local de armazenamento/manuseio é adequada?',
    'Os trabalhadores foram treinados quanto aos riscos e procedimentos de emergência do produto?'
  ],

  'Organização, Limpeza e Sinalização': [
    'A área está livre de materiais, entulhos ou objetos que possam causar acidentes?',
    'Os materiais estão armazenados de forma organizada e estável (sem risco de queda/tombamento)?',
    'A sinalização de segurança (obrigatoriedade, alerta, proibição) está visível e em bom estado?',
    'Os pisos e vias de circulação estão limpos e livres de resíduos escorregadios?',
    'A iluminação da área é adequada para a atividade?',
    'Os resíduos de obra/produção são recolhidos com frequência definida?',
    'As áreas de vivência (refeitório, sanitários, vestiário) estão organizadas e limpas?'
  ],

  'Canteiro/Área Operacional': [
    'O acesso ao canteiro/área é controlado e identificado?',
    'O layout do canteiro está de acordo com o planejado (PCMAT/plano de canteiro)?',
    'As instalações provisórias (elétrica, água, esgoto) estão em condições seguras?',
    'As áreas de vivência atendem às condições mínimas de conforto e higiene?',
    'A sinalização geral do canteiro está visível e atualizada?',
    'Os tapumes, fechamentos e proteções de perímetro estão íntegros?',
    'Existe controle de acesso de veículos e pedestres na área operacional?',
    'As condições de armazenamento de materiais no canteiro são adequadas?'
  ],

  'Outra inspeção específica': []
};

function novoItemChecklist(texto) {
  return {
    id: uuid(),
    texto: texto,
    resposta: '', // 'Conforme' | 'Não Conforme' | 'Não se Aplica'
    observacao: '',
    medida: '',
    photoIds: [],
    personalizado: false
  };
}

function gerarChecklistParaTipo(tipo) {
  const itens = CHECKLISTS[tipo] || [];
  return itens.map((texto) => novoItemChecklist(texto));
}
