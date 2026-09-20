/*
 * Dados do módulo PT/APR (Permissão de Trabalho / Análise Preliminar de
 * Risco). Documento emitido antes de atividades críticas, verificando as
 * condições de segurança para liberar o início do trabalho.
 */

const TIPOS_TRABALHO_PTAPR = [
  'Trabalho em Altura (NR-35)',
  'Espaço Confinado (NR-33)',
  'Trabalho a Quente',
  'Trabalho Elétrico (NR-10)',
  'Escavação',
  'Içamento e Movimentação de Carga',
  'Trabalho com Produtos Químicos',
  'Trabalho a Frio / Geral'
];

const CHECKLIST_PTAPR = [
  'A área de trabalho está isolada e sinalizada adequadamente?',
  'Os equipamentos e ferramentas necessários foram inspecionados e estão em condições seguras de uso?',
  'Os EPIs necessários para a atividade estão disponíveis e em condições adequadas?',
  'Os EPCs necessários (guarda-corpo, isolamento, ventilação, etc.) estão instalados, quando aplicável?',
  'Os executantes possuem treinamento/capacitação específica para a atividade (NR aplicável)?',
  'Os executantes foram informados sobre os riscos da atividade e as medidas de controle?',
  'Existe procedimento operacional específico para a atividade, quando aplicável?',
  'As condições climáticas são adequadas para a realização da atividade?',
  'Foi verificada a ausência de interferência com outras atividades simultâneas na área?',
  'Equipamentos de emergência (extintor, kit de primeiros socorros, etc.) estão disponíveis no local?',
  'Foi realizado teste de atmosfera, quando aplicável (espaço confinado)?',
  'Sistemas de bloqueio e etiquetagem (LOTO) foram aplicados, quando aplicável?',
  'As rotas de fuga e a comunicação de emergência foram definidas e são de conhecimento da equipe?',
  'A energização/desenergização de equipamentos foi confirmada, quando aplicável?',
  'O vigia (quando exigido pela atividade) está designado e posicionado?',
  'Foi designado um responsável técnico/supervisor acompanhando a atividade?'
];
