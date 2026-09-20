/*
 * Checklist da PET (Permissão de Entrada e Trabalho em Espaço Confinado),
 * conforme requisitos da NR-33. Documento específico para entrada em
 * espaços confinados — distinto da PT/APR genérica, por exigir controles
 * próprios: testes atmosféricos periódicos, vigia dedicado e plano de
 * resgate específico.
 */

const CHECKLIST_PET = [
  'O espaço confinado foi isolado e sinalizado, com bloqueio de entradas de energia e produtos?',
  'O espaço confinado foi esvaziado, limpo e ventilado antes da liberação?',
  'O equipamento de ventilação forçada está instalado e em operação contínua?',
  'O equipamento de monitoramento de atmosfera está disponível e devidamente calibrado?',
  'Os equipamentos de resgate (tripé, cabo, cinto tipo paraquedista) estão montados e prontos para uso imediato?',
  'A iluminação utilizada é adequada e segura para a atmosfera do espaço (antiexplosão, quando aplicável)?',
  'O sistema de comunicação entre vigia e trabalhadores autorizados foi testado e está funcionando?',
  'Os trabalhadores autorizados possuem treinamento NR-33 (trabalhador autorizado) válido?',
  'O supervisor de entrada possui treinamento NR-33 (supervisor de entrada) válido?',
  'O vigia possui treinamento NR-33 válido e permanece dedicado exclusivamente a essa função?',
  'O plano de resgate e emergência específico foi elaborado e é de conhecimento de toda a equipe?',
  'Os EPIs específicos (detector de gases portátil, cinto de resgate, proteção respiratória quando necessário) estão disponíveis?',
  'As vias de acesso e saída do espaço confinado estão desobstruídas?',
  'Foi verificada a ausência de líquidos ou gases residuais perigosos no espaço confinado?'
];

const LIMITES_ATMOSFERA_PET = {
  oxigenioMin: 19.5,
  oxigenioMax: 23,
  explosividadeMax: 10,
  monoxidoMax: 35,
  sulfidricoMax: 10
};
