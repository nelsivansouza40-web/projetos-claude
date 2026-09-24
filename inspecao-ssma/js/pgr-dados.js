/* Dados de apoio ao módulo de PGR (Programa de Gerenciamento de Riscos). */

const TIPOS_RISCO_PGR = ['Físico', 'Químico', 'Biológico', 'Ergonômico', 'Acidente'];

/* Escala de 1 a 5 para severidade e probabilidade, base de uma matriz de
 * risco 5x5 (Severidade x Probabilidade), método comum em PGRs alinhados
 * à ISO 31000 / GRO da NR-01. */
const NIVEIS_SEVERIDADE_PGR = [
  { valor: 1, label: 'Desprezível' },
  { valor: 2, label: 'Marginal' },
  { valor: 3, label: 'Moderada' },
  { valor: 4, label: 'Crítica' },
  { valor: 5, label: 'Catastrófica' }
];

const NIVEIS_PROBABILIDADE_PGR = [
  { valor: 1, label: 'Rara' },
  { valor: 2, label: 'Improvável' },
  { valor: 3, label: 'Possível' },
  { valor: 4, label: 'Provável' },
  { valor: 5, label: 'Quase certa' }
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
