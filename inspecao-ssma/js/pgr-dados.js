/* Dados de apoio ao módulo de PGR (Programa de Gerenciamento de Riscos). */

/* "Psicossocial": fatores de risco psicossociais relacionados ao trabalho,
 * incluídos no GRO pela Portaria MTE nº 1.419/2024 (NR-01). */
const TIPOS_RISCO_PGR = ['Físico', 'Químico', 'Biológico', 'Ergonômico', 'Acidente', 'Psicossocial'];

const TIPOS_AVALIACAO_PGR = ['Qualitativa', 'Quantitativa'];

/* NR-01: o plano de ação indica medidas a serem introduzidas, aprimoradas ou mantidas. */
const TIPOS_MEDIDA_PGR = ['Introduzir', 'Aprimorar', 'Manter'];

const PERIODICIDADES_TREINAMENTO_PGR = ['Admissional', 'Anual', 'Bienal', 'Trienal', 'Quando houver mudança', 'Eventual'];

const TIPOS_EXPOSICAO_PGR = ['Contínua', 'Intermitente', 'Eventual'];

const PERIODICIDADES_EXERCICIO_EMERGENCIA_PGR = ['Semestral', 'Anual', 'Bienal', 'Outra'];

/* Escala de 1 a 5 para severidade e probabilidade, base de uma matriz de
 * risco 5x5 (Severidade x Probabilidade), método comum em PGRs alinhados
 * à ISO 31000 / GRO da NR-01. */
const NIVEIS_SEVERIDADE_PGR = [
  { valor: 1, label: 'Desprezível', descricao: 'Sem lesão ou apenas primeiros socorros; desconforto passageiro.' },
  { valor: 2, label: 'Marginal', descricao: 'Lesão ou agravo leve, reversível, sem afastamento.' },
  { valor: 3, label: 'Moderada', descricao: 'Lesão ou doença com afastamento, reversível.' },
  { valor: 4, label: 'Crítica', descricao: 'Lesão grave ou doença irreversível; incapacidade parcial permanente.' },
  { valor: 5, label: 'Catastrófica', descricao: 'Morte ou incapacidade total permanente; ou várias vítimas.' }
];

const NIVEIS_PROBABILIDADE_PGR = [
  { valor: 1, label: 'Rara', descricao: 'Exposição eventual, com controles eficazes; ocorrência muito improvável.' },
  { valor: 2, label: 'Improvável', descricao: 'Controles existentes adequados, mas sujeitos a falhas; exposição abaixo do nível de ação.' },
  { valor: 3, label: 'Possível', descricao: 'Controles parciais ou não comprovados; exposição entre o nível de ação e o limite.' },
  { valor: 4, label: 'Provável', descricao: 'Controles inexistentes ou ineficazes; exposição acima do limite ou histórico de ocorrências.' },
  { valor: 5, label: 'Quase certa', descricao: 'Exposição frequente sem controle; ocorrência esperada.' }
];

/* Critérios de decisão por nível de risco (NR-01: critérios para avaliação e tomada de decisão). */
const CRITERIOS_DECISAO_PGR = [
  { nivel: 'Baixo', faixa: '1 a 4', acao: 'Manter as medidas existentes e acompanhar nas inspeções periódicas.', prazo: 'Contínuo (rever em até 180 dias)' },
  { nivel: 'Moderado', faixa: '5 a 9', acao: 'Aprimorar as medidas de prevenção e incluí-las no plano de ação.', prazo: 'Até 90 dias' },
  { nivel: 'Alto', faixa: '10 a 15', acao: 'Ação prioritária; adotar controles provisórios imediatos até a implantação das medidas definitivas.', prazo: 'Até 30 dias' },
  { nivel: 'Crítico', faixa: '16 a 25', acao: 'Não iniciar ou interromper a atividade até reduzir o risco.', prazo: 'Imediato' }
];

/* Classifica o risco (severidade x probabilidade, de 1 a 25) nas quatro
 * faixas usadas na matriz visual. */
function classificarRiscoPGR(severidade, probabilidade) {
  const sev = Number(severidade) || 0;
  const prob = Number(probabilidade) || 0;
  const valor = sev * prob;
  if (!sev || !prob) return { valor: 0, nivel: 'Não avaliado', cls: 'badge-rascunho' };
  if (valor <= 4) return { valor, nivel: 'Baixo', cls: 'badge-ok' };
  if (valor <= 9) return { valor, nivel: 'Moderado', cls: 'badge-pendente' };
  if (valor <= 15) return { valor, nivel: 'Alto', cls: 'badge-alto' };
  return { valor, nivel: 'Crítico', cls: 'badge-erro' };
}
