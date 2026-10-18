/*
 * Calculadoras dos métodos ergonômicos utilizáveis na AET.
 *
 * IMPORTANTE: os métodos aqui implementados seguem as tabelas e
 * fórmulas publicadas de cada técnica, mas o resultado é sempre
 * indicativo — a interpretação final e a validação da pontuação
 * cabem ao profissional responsável pela análise, que deve conferir
 * o resultado com a tabela/planilha oficial do método antes de
 * decisões críticas. Isso vale sobretudo para RULA, REBA, OWAS, QEC
 * e OCRA, cujas tabelas de referência são extensas.
 *
 * Snook & Ciriello e ROSA não têm calculadora de pontuação embutida
 * aqui: as tabelas psicofísicas (Snook/Ciriello) e as tabelas de
 * cadeira/monitor (ROSA) têm centenas de combinações e devem ser
 * consultadas na fonte oficial. O app apenas estrutura a coleta dos
 * dados de entrada do método.
 */

const AVISO_METODO_PADRAO = 'Resultado indicativo. Confira com a tabela/planilha oficial do método antes de decisões críticas.';

/* ---------------- RULA (McAtamney & Corlett, 1993) ---------------- */

const RULA_TABELA_A = {
  // [upperArm-1][lowerArm-1][wrist-1][wristTwist-1]
  1: { 1: { 1: [1, 2], 2: [2, 2], 3: [2, 3], 4: [3, 3] }, 2: { 1: [2, 2], 2: [2, 2], 3: [3, 3], 4: [3, 3] }, 3: { 1: [2, 3], 2: [3, 3], 3: [3, 3], 4: [4, 4] } },
  2: { 1: { 1: [2, 3], 2: [3, 3], 3: [3, 4], 4: [4, 4] }, 2: { 1: [3, 3], 2: [3, 3], 3: [3, 4], 4: [4, 4] }, 3: { 1: [3, 4], 2: [4, 4], 3: [4, 4], 4: [5, 5] } },
  3: { 1: { 1: [3, 3], 2: [4, 4], 3: [4, 4], 4: [5, 5] }, 2: { 1: [3, 4], 2: [4, 4], 3: [4, 4], 4: [5, 5] }, 3: { 1: [4, 4], 2: [4, 4], 3: [4, 5], 4: [5, 5] } },
  4: { 1: { 1: [4, 4], 2: [4, 4], 3: [4, 5], 4: [5, 5] }, 2: { 1: [4, 4], 2: [4, 4], 3: [4, 5], 4: [5, 5] }, 3: { 1: [4, 4], 2: [4, 5], 3: [5, 5], 4: [6, 6] } },
  5: { 1: { 1: [5, 5], 2: [5, 5], 3: [5, 6], 4: [6, 7] }, 2: { 1: [5, 6], 2: [6, 6], 3: [6, 7], 4: [7, 7] }, 3: { 1: [6, 6], 2: [6, 7], 3: [7, 7], 4: [7, 8] } },
  6: { 1: { 1: [7, 7], 2: [7, 7], 3: [7, 8], 4: [8, 9] }, 2: { 1: [8, 8], 2: [8, 8], 3: [8, 9], 4: [9, 9] }, 3: { 1: [9, 9], 2: [9, 9], 3: [9, 9], 4: [9, 9] } }
};

const RULA_TABELA_B = {
  1: { 1: [1, 3], 2: [2, 3], 3: [3, 4], 4: [5, 5], 5: [6, 6], 6: [7, 7] },
  2: { 1: [2, 3], 2: [2, 3], 3: [4, 5], 4: [5, 5], 5: [6, 7], 6: [7, 7] },
  3: { 1: [3, 3], 2: [3, 4], 3: [4, 5], 4: [5, 6], 5: [6, 7], 6: [7, 7] },
  4: { 1: [5, 5], 2: [5, 6], 3: [6, 7], 4: [7, 7], 5: [7, 7], 6: [8, 8] },
  5: { 1: [7, 7], 2: [7, 7], 3: [7, 8], 4: [8, 8], 5: [8, 8], 6: [8, 8] },
  6: { 1: [8, 8], 2: [8, 8], 3: [8, 8], 4: [8, 9], 5: [9, 9], 6: [9, 9] }
};

const RULA_TABELA_C = [
  [1, 2, 3, 3, 4, 5, 5], [2, 2, 3, 4, 4, 5, 5], [3, 3, 3, 4, 4, 5, 6],
  [3, 3, 3, 4, 5, 6, 6], [4, 4, 4, 5, 6, 7, 7], [4, 4, 5, 6, 6, 7, 7],
  [5, 5, 6, 6, 7, 7, 7], [5, 5, 6, 7, 7, 7, 7]
];

function rulaNivelAcao(pontuacaoFinal) {
  if (pontuacaoFinal <= 2) return { nivel: 1, acao: 'Postura aceitável se não for mantida ou repetida por longos períodos.' };
  if (pontuacaoFinal <= 4) return { nivel: 2, acao: 'Investigar mais — pode ser necessária mudança.' };
  if (pontuacaoFinal <= 6) return { nivel: 3, acao: 'Investigar em breve e providenciar mudanças.' };
  return { nivel: 4, acao: 'Investigar e implementar mudanças imediatamente.' };
}

function calcularRULA(input) {
  const twistIdx = input.wristTwist === 2 ? 1 : 0;
  const parA = RULA_TABELA_A[input.upperArm][input.lowerArm][input.wrist];
  let pontA = parA[twistIdx] + (input.pescocoTroncoAjusteA || 0);
  pontA += (input.musculoA || 0) + (input.forcaA || 0);

  const parB = RULA_TABELA_B[input.neck][input.trunk];
  const legsIdx = input.legs === 2 ? 1 : 0;
  let pontB = parB[legsIdx];
  pontB += (input.musculoB || 0) + (input.forcaB || 0);

  const idxC = Math.min(pontA, 8) - 1;
  const idxD = Math.min(pontB, 7) - 1;
  const pontuacaoFinal = RULA_TABELA_C[idxC][idxD];
  const acao = rulaNivelAcao(pontuacaoFinal);

  return {
    metodo: 'RULA',
    pontuacaoA: pontA, pontuacaoB: pontB, pontuacaoFinal,
    nivelAcao: acao.nivel, recomendacao: acao.acao,
    aviso: AVISO_METODO_PADRAO
  };
}

/* ---------------- REBA (Hignett & McAtamney, 2000) ---------------- */

const REBA_TABELA_A = {
  1: { 1: [1, 2, 3, 4], 2: [1, 2, 3, 4], 3: [3, 3, 5, 6] },
  2: { 1: [2, 3, 4, 5], 2: [3, 4, 5, 6], 3: [4, 5, 6, 7] },
  3: { 1: [2, 4, 5, 6], 2: [4, 5, 6, 7], 3: [5, 6, 7, 8] },
  4: { 1: [3, 5, 6, 7], 2: [5, 6, 7, 8], 3: [6, 7, 8, 9] },
  5: { 1: [4, 6, 7, 8], 2: [6, 7, 8, 9], 3: [7, 8, 9, 9] }
};

const REBA_TABELA_B = {
  1: { 1: [1, 2, 2], 2: [1, 2, 3] },
  2: { 1: [1, 2, 3], 2: [2, 3, 4] },
  3: { 1: [3, 4, 5], 2: [4, 5, 5] },
  4: { 1: [4, 5, 5], 2: [5, 6, 7] },
  5: { 1: [6, 7, 8], 2: [7, 8, 8] },
  6: { 1: [7, 8, 8], 2: [8, 9, 9] }
};

const REBA_TABELA_C = [
  [1, 1, 1, 2, 3, 3, 4, 5, 6, 7, 7, 7],
  [1, 2, 2, 3, 4, 4, 5, 6, 6, 7, 7, 8],
  [2, 3, 3, 3, 4, 5, 6, 7, 7, 8, 8, 8],
  [3, 4, 4, 4, 5, 6, 7, 8, 8, 9, 9, 9],
  [4, 4, 4, 5, 6, 7, 8, 8, 9, 9, 9, 9],
  [6, 6, 6, 7, 8, 8, 9, 9, 10, 10, 10, 10],
  [7, 7, 7, 8, 9, 9, 9, 10, 10, 11, 11, 11],
  [8, 8, 8, 9, 10, 10, 10, 10, 10, 11, 11, 11],
  [9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12, 12],
  [10, 10, 10, 11, 11, 11, 11, 12, 12, 12, 12, 12],
  [11, 11, 11, 11, 12, 12, 12, 12, 12, 12, 12, 12],
  [12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12]
];

function rebaNivelAcao(pontuacao) {
  if (pontuacao === 1) return { nivel: 0, risco: 'Insignificante', acao: 'Não é necessária ação.' };
  if (pontuacao <= 3) return { nivel: 1, risco: 'Baixo', acao: 'Pode ser necessária ação.' };
  if (pontuacao <= 7) return { nivel: 2, risco: 'Médio', acao: 'Necessária ação.' };
  if (pontuacao <= 10) return { nivel: 3, risco: 'Alto', acao: 'Necessária ação em breve.' };
  return { nivel: 4, risco: 'Muito alto', acao: 'Necessária ação imediata.' };
}

function calcularREBA(input) {
  const trunkIdx = Math.min(input.trunk, 5);
  const parA = REBA_TABELA_A[trunkIdx][input.neck];
  const legsIdx = Math.min(input.legs, 4) - 1;
  let pontA = parA[legsIdx] + (input.cargaForca || 0);

  const upperArmIdx = Math.min(input.upperArm, 6);
  const parB = REBA_TABELA_B[upperArmIdx][input.lowerArm];
  const wristIdx = Math.min(input.wrist, 3) - 1;
  let pontB = parB[wristIdx] + (input.pegaAcoplamento || 0);

  const idxC_row = Math.min(pontA, 12) - 1;
  const idxC_col = Math.min(pontB, 12) - 1;
  let pontuacaoC = REBA_TABELA_C[idxC_row][idxC_col];
  const pontuacaoFinal = pontuacaoC + (input.atividade || 0);

  const acao = rebaNivelAcao(pontuacaoFinal);

  return {
    metodo: 'REBA',
    pontuacaoA: pontA, pontuacaoB: pontB, pontuacaoC, pontuacaoFinal,
    nivelAcao: acao.nivel, risco: acao.risco, recomendacao: acao.acao,
    aviso: AVISO_METODO_PADRAO
  };
}

/* ---------------- Equação de NIOSH revisada (1991) ---------------- */

function calcularNIOSH(input) {
  const LC = 23;
  const HM = input.H > 0 ? Math.min(1, 25 / input.H) : 0;
  const VM = 1 - 0.003 * Math.abs(input.V - 75);
  const DM = input.D > 0 ? 0.82 + 4.5 / input.D : 1;
  const AM = 1 - 0.0032 * input.A;
  const tabelaFM = [
    [1.00, 0.95, 0.85, 0.75, 0.65, 0.55, 0.35, 0.00],
    [0.95, 0.92, 0.62, 0.30, 0.22, 0.15, 0.00, 0.00],
    [0.65, 0.45, 0.35, 0.22, 0.10, 0.00, 0.00, 0.00]
  ];
  const linhaV = input.V < 75 ? 0 : 0;
  const freqIdx = Math.min(Math.floor(input.frequenciaPorMin), 7);
  const linhaDuracao = input.duracao === 'curta' ? 0 : input.duracao === 'moderada' ? 1 : 2;
  const FM = tabelaFM[linhaDuracao][freqIdx] ?? 0;

  const tabelaCM = { boa: 1.00, regular: 0.95, ruim: 0.90 };
  const CM = tabelaCM[input.acoplamento] ?? 0.95;

  const RWL = LC * Math.max(HM, 0) * Math.max(VM, 0) * Math.max(DM, 0) * Math.max(AM, 0) * FM * CM;
  const LI = RWL > 0 ? (input.pesoReal / RWL) : Infinity;

  let interpretacao;
  if (LI <= 1) interpretacao = 'Risco aceitável para a maioria dos trabalhadores.';
  else if (LI <= 3) interpretacao = 'Risco moderado — recomenda-se redução da exigência da tarefa.';
  else interpretacao = 'Risco elevado — intervenção prioritária recomendada.';

  return {
    metodo: 'Equação de NIOSH',
    multiplicadores: { HM: round2(HM), VM: round2(VM), DM: round2(DM), AM: round2(AM), FM, CM },
    RWL: round2(RWL), LI: round2(LI), interpretacao,
    aviso: AVISO_METODO_PADRAO
  };
}

function round2(n) { return Math.round(n * 100) / 100; }

/* ---------------- Strain Index (Moore & Garg, 1995) ---------------- */

const SI_MULTIPLICADORES = {
  intensidadeEsforco: { 'leve': 1, 'algo_dificil': 3, 'dificil': 6, 'muito_dificil': 9, 'quase_maximo': 13 },
  duracaoEsforcoPct: { '<10': 0.5, '10-29': 1, '30-49': 1.5, '50-79': 2, '>=80': 3 },
  esforcosPorMinuto: { '<4': 0.5, '4-8': 1, '9-14': 1.5, '15-19': 2, '>=20': 3 },
  posturaMao: { 'muito_boa': 1, 'boa': 1, 'regular': 1.5, 'ruim': 2, 'muito_ruim': 3 },
  velocidadeTrabalho: { 'muito_lenta': 1, 'lenta': 1, 'media': 1, 'rapida': 1.5, 'muito_rapida': 2 },
  duracaoTarefaHoras: { '<=1': 0.25, '1-2': 0.5, '2-4': 0.75, '4-8': 1, '>8': 1.5 }
};

function calcularStrainIndex(input) {
  const m = SI_MULTIPLICADORES;
  const fatores = {
    intensidadeEsforco: m.intensidadeEsforco[input.intensidadeEsforco],
    duracaoEsforcoPct: m.duracaoEsforcoPct[input.duracaoEsforcoPct],
    esforcosPorMinuto: m.esforcosPorMinuto[input.esforcosPorMinuto],
    posturaMao: m.posturaMao[input.posturaMao],
    velocidadeTrabalho: m.velocidadeTrabalho[input.velocidadeTrabalho],
    duracaoTarefaHoras: m.duracaoTarefaHoras[input.duracaoTarefaHoras]
  };
  const SI = Object.values(fatores).reduce((a, b) => a * b, 1);
  const interpretacao = SI < 3 ? 'Improvável associação com distúrbio osteomuscular.'
    : SI <= 5 ? 'Zona duvidosa — atenção recomendada.'
    : SI <= 7 ? 'Provavelmente perigoso.' : 'Muito provavelmente perigoso.';

  return { metodo: 'Strain Index', fatores, SI: round2(SI), interpretacao, aviso: AVISO_METODO_PADRAO };
}

/* ---------------- OWAS (Ovako Working Posture Analysis System) ---------------- */

const OWAS_TABELA_ACAO = {
  // código = costas(1-4) + braços(1-3) + pernas(1-7); simplificado por combinação de categorias
};

function calcularOWAS(input) {
  // Categoria de ação conforme regras publicadas (Karhu et al., 1977),
  // simplificada por combinação das piores posturas informadas.
  const costas = input.costas, bracos = input.bracos, pernas = input.pernas, carga = input.carga;
  let categoria = 1;
  if (costas >= 3 || pernas >= 6 || carga >= 3) categoria = 3;
  else if (costas === 2 || bracos === 3 || pernas >= 4 || carga === 2) categoria = 2;
  if ((costas >= 3 && pernas >= 6) || carga >= 3 && costas >= 3) categoria = 4;

  const acoes = {
    1: 'Postura normal, sem necessidade de ação.',
    2: 'Postura com efeitos nocivos leves — ação corretiva no futuro próximo pode ser necessária.',
    3: 'Postura com efeitos nocivos — ação corretiva o quanto antes.',
    4: 'Postura com efeitos nocivos extremos — ação corretiva imediata.'
  };

  return {
    metodo: 'OWAS',
    codigoPostura: `${costas}-${bracos}-${pernas}-${carga}`,
    categoriaAcao: categoria,
    recomendacao: acoes[categoria],
    aviso: AVISO_METODO_PADRAO
  };
}

/* ---------------- QEC (Quick Exposure Check) ---------------- */

function calcularQEC(input) {
  // Pontuação de exposição por região, soma simples dos níveis
  // informados (1 a 4) por fator considerado no QEC.
  const regioes = ['costas', 'ombroBraco', 'punhoMao', 'pescoco'];
  let total = 0;
  const detalhamento = {};
  regioes.forEach((r) => {
    const v = input[r] || 0;
    detalhamento[r] = v;
    total += v;
  });
  const maximo = regioes.length * 4 * 2; // fator de referência simplificado
  const percentual = Math.round((total / maximo) * 100);
  const interpretacao = percentual < 40 ? 'Exposição baixa' : percentual < 60 ? 'Exposição moderada' : percentual < 80 ? 'Exposição alta' : 'Exposição muito alta';

  return { metodo: 'QEC', detalhamento, pontuacaoTotal: total, percentualExposicao: percentual, interpretacao, aviso: AVISO_METODO_PADRAO };
}

/* ---------------- OCRA Checklist ---------------- */

function calcularOCRAChecklist(input) {
  const fatores = ['recuperacao', 'frequencia', 'forca', 'postura', 'fatoresAdicionais'];
  const soma = fatores.reduce((acc, f) => acc + (Number(input[f]) || 0), 0);
  const duracaoMultiplicador = (input.duracaoMinutos || 480) / 480;
  const indice = round2(soma * duracaoMultiplicador);

  let classificacao;
  if (indice <= 7.5) classificacao = 'Risco aceitável';
  else if (indice <= 11) classificacao = 'Risco muito baixo/incerto';
  else if (indice <= 14) classificacao = 'Risco leve';
  else if (indice <= 22.5) classificacao = 'Risco médio';
  else classificacao = 'Risco alto';

  return { metodo: 'OCRA Checklist', somaFatores: soma, indiceChecklist: indice, classificacao, aviso: AVISO_METODO_PADRAO };
}

const METODOS_CALCULAVEIS = {
  'RULA': calcularRULA,
  'REBA': calcularREBA,
  'Equação Revisada de NIOSH': calcularNIOSH,
  'Strain Index': calcularStrainIndex,
  'OWAS': calcularOWAS,
  'QEC': calcularQEC,
  'OCRA': calcularOCRAChecklist
};
