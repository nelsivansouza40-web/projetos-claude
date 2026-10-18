/*
 * Regras de negócio: matriz de risco configurável, motor de decisão de
 * necessidade de AET (NR-17, item 17.3.2) e motor de correlação com o
 * inventário do PGR. Mantido separado da interface para deixar as
 * regras auditáveis e fáceis de ajustar.
 */

const MATRIZ_PADRAO = {
  severidades: [
    { nivel: 'Leve', peso: 1 },
    { nivel: 'Moderada', peso: 2 },
    { nivel: 'Grave', peso: 3 },
    { nivel: 'Gravíssima', peso: 4 }
  ],
  probabilidades: [
    { nivel: 'Rara', peso: 1 },
    { nivel: 'Improvável', peso: 2 },
    { nivel: 'Possível', peso: 3 },
    { nivel: 'Provável', peso: 4 },
    { nivel: 'Quase certa', peso: 5 }
  ],
  faixas: [
    { min: 1, max: 2, classificacao: 'Baixo', cor: '#0ca30c' },
    { min: 3, max: 6, classificacao: 'Moderado', cor: '#eda100' },
    { min: 7, max: 12, classificacao: 'Alto', cor: '#eb6834' },
    { min: 13, max: 20, classificacao: 'Crítico', cor: '#d03b3b' }
  ]
};

async function getMatrizRisco() {
  const m = await DB.getSetting('matrizRisco');
  return m || MATRIZ_PADRAO;
}

function pesoDe(lista, nivel) {
  const item = lista.find((i) => i.nivel === nivel);
  return item ? item.peso : 0;
}

function faixaDe(matriz, produto) {
  return matriz.faixas.find((f) => produto >= f.min && produto <= f.max) || null;
}

async function classificarRisco(severidade, probabilidade) {
  const matriz = await getMatrizRisco();
  const produto = pesoDe(matriz.severidades, severidade) * pesoDe(matriz.probabilidades, probabilidade);
  const faixa = faixaDe(matriz, produto);
  return {
    produto,
    classificacao: faixa ? faixa.classificacao : 'Não classificado',
    cor: faixa ? faixa.cor : '#898781'
  };
}

/*
 * Motor de decisão de necessidade de AET — implementa as hipóteses do
 * item 17.3.2 da NR-17. Cada condição é informada pelo avaliador; a
 * decisão final continua dependendo de validação profissional.
 */
function avaliarNecessidadeAET(cond) {
  const motivos = [];
  let necessitaAET = false;
  let exigeAnaliseProfissional = false;

  if (cond.medidaImplantadaSemEficacia) {
    necessitaAET = true;
    motivos.push('Medida de controle já adotada não se mostrou eficaz.');
  }
  if (cond.indicacaoPCMSO) {
    necessitaAET = true;
    motivos.push('Dados coletivos do acompanhamento da saúde (PCMSO) indicam possível relação com as condições de trabalho — recomenda-se integração com a saúde ocupacional.');
  }
  if (cond.acidenteDoencaRelacionado) {
    necessitaAET = true;
    motivos.push('Análise de acidente ou doença relacionada apontou fator ergonômico.');
  }
  if (cond.dadosInsuficientes) {
    necessitaAET = true;
    motivos.push('Dados coletados na AEP são insuficientes para conclusão — recomenda-se aprofundamento.');
  }
  if (cond.contradicaoMetodoObservacao) {
    necessitaAET = true;
    exigeAnaliseProfissional = true;
    motivos.push('Contradição entre o resultado do método aplicado e a observação real da atividade — exige análise profissional aprofundada.');
  }

  const alertaAcaoImediata = !!cond.riscoEvidenteAcaoImediata;
  if (alertaAcaoImediata) {
    motivos.push('Situação de risco evidente identificada — ação imediata recomendada, independentemente da conclusão da AEP/AET.');
  }

  if (!necessitaAET && motivos.length === 0) {
    motivos.push('Risco compreendido e medida de controle simples já definida — AEP pode ser concluída e encaminhada ao PGR.');
  }

  return { necessitaAET, exigeAnaliseProfissional, alertaAcaoImediata, motivos };
}

/*
 * Motor de correlação com o inventário do PGR. O vínculo com o risco
 * existente é sempre escolhido manualmente pelo avaliador (nunca só
 * pelo nome do cargo/atividade) — aqui só comparamos os campos para
 * sugerir qual dos quatro resultados da NR-1/NR-17 se aplica.
 */
function compararComRiscoExistente(fator, risco) {
  if (!risco) {
    return { resultado: 'novo', descricao: 'Risco não existe no PGR — propor novo registro.' };
  }
  const mesmaClassificacao = risco.classificacao === fator.classificacao;
  const incompleto = !risco.medidasExistentes || !risco.eficaciaMedidas || !risco.fonte || !risco.possiveisLesoes;

  if (mesmaClassificacao && !incompleto) {
    return { resultado: 'existente_correto', descricao: 'Risco já existe e está correto — atualizar evidências e data da avaliação.' };
  }
  if (!mesmaClassificacao) {
    return { resultado: 'classificacao_mudou', descricao: 'Classificação mudou em relação ao registro atual do PGR — propor revisão do nível de risco.' };
  }
  return { resultado: 'existente_incompleto', descricao: 'Risco existe, mas está incompleto — propor complementação.' };
}

const HIERARQUIA_CONTROLE = [
  { nivel: 1, nome: 'Eliminação do fator de risco' },
  { nivel: 2, nome: 'Proteção coletiva' },
  { nivel: 3, nome: 'Medidas administrativas / organização do trabalho' },
  { nivel: 4, nome: 'Proteção individual (EPI)' }
];
