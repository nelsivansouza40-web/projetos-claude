/*
 * Blocos de análise da AEP (item 17.3 da NR-17) e fatores de apoio
 * apresentados como sugestão para o avaliador — não são um checklist
 * fechado. O avaliador registra livremente os fatores identificados
 * em cada bloco, na atividade real observada.
 */
const BLOCOS_AEP = [
  {
    chave: 'organizacaoTrabalho',
    titulo: 'Organização do trabalho',
    sugestoes: [
      'Normas de produção', 'Modo operatório', 'Metas', 'Exigência de tempo', 'Ritmo',
      'Pausas', 'Alternância de tarefas', 'Autonomia', 'Conteúdo da tarefa',
      'Trabalho em turnos', 'Horas extras', 'Exigências cognitivas', 'Comunicação',
      'Suporte da liderança', 'Clareza das responsabilidades', 'Conflitos ou demandas contraditórias'
    ]
  },
  {
    chave: 'sobrecargaBiomecanica',
    titulo: 'Sobrecarga biomecânica',
    sugestoes: [
      'Postura do tronco', 'Pescoço e cabeça', 'Membros superiores', 'Membros inferiores',
      'Postura estática', 'Repetitividade', 'Uso de força', 'Pressão ou compressão localizada',
      'Movimentos bruscos', 'Alcance', 'Pega', 'Frequência', 'Duração', 'Recuperação'
    ]
  },
  {
    chave: 'movimentacaoCargas',
    titulo: 'Movimentação manual de cargas',
    sugestoes: [
      'Peso', 'Tamanho', 'Formato', 'Estabilidade', 'Distância horizontal da carga',
      'Altura de pega e deposição', 'Frequência', 'Distância percorrida', 'Levantamento',
      'Transporte', 'Empurrar', 'Puxar', 'Condições do piso', 'Espaço disponível'
    ]
  },
  {
    chave: 'mobiliarioPosto',
    titulo: 'Mobiliário e posto de trabalho',
    sugestoes: [
      'Regulagens', 'Assento', 'Apoio lombar', 'Apoio para os pés', 'Plano de trabalho',
      'Espaço para pernas', 'Zonas de alcance', 'Campo visual',
      'Alternância entre sentado e em pé', 'Compatibilidade antropométrica'
    ]
  },
  {
    chave: 'maquinasEquipamentos',
    titulo: 'Máquinas, equipamentos e ferramentas',
    sugestoes: [
      'Peso', 'Pega', 'Empunhadura', 'Vibração', 'Comandos', 'Painéis', 'Visibilidade',
      'Força de acionamento', 'Manutenção', 'Adequação ao uso de luvas',
      'Interação homem-máquina', 'Possibilidade de erro de interpretação'
    ]
  },
  {
    chave: 'condicoesAmbientais',
    titulo: 'Condições ambientais de conforto',
    sugestoes: [
      'Iluminação', 'Ofuscamento', 'Reflexos', 'Sombras', 'Conforto acústico',
      'Conforto térmico', 'Velocidade do ar', 'Ventilação', 'Correntes de ar'
    ]
  },
  {
    chave: 'fatoresPsicossociais',
    titulo: 'Fatores cognitivos e psicossociais relacionados ao trabalho',
    sugestoes: [
      'Carga mental', 'Atenção sustentada', 'Pressão temporal', 'Baixa autonomia',
      'Falta de recursos', 'Conflito de papéis', 'Comunicação deficiente',
      'Suporte insuficiente', 'Mudanças organizacionais', 'Relações de trabalho',
      'Reconhecimento', 'Previsibilidade', 'Violência e assédio', 'Isolamento', 'Trabalho emocional'
    ],
    aviso: 'Avalia condições coletivas de trabalho, não diagnostica transtornos mentais individuais.'
  }
];

const METODOS_AET_REFERENCIA = [
  'RULA', 'REBA', 'OWAS', 'ROSA', 'Equação Revisada de NIOSH', 'OCRA',
  'Strain Index', 'Snook e Ciriello', 'QEC', 'Análise antropométrica',
  'Avaliação de força', 'Avaliação de empurrar e puxar',
  'Avaliação de conforto ambiental', 'Ferramenta de carga mental/psicossocial', 'Outro'
];
