/* Análise de causa raiz da Investigação de Acidente: 5 Porquês e diagrama
 * de Ishikawa (6M). Complementa as causas imediatas e básicas: o 5 Porquês
 * aprofunda uma cadeia de causa até a raiz, e o Ishikawa organiza as causas
 * contribuintes por categoria. Investigações antigas, sem esses campos,
 * ganham os campos vazios ao serem abertas. */

const CATEGORIAS_ISHIKAWA = [
  { id: 'metodo', rotulo: 'Método', dica: 'Procedimento, instrução de trabalho, PT/APR, sequência da tarefa' },
  { id: 'maquina', rotulo: 'Máquina', dica: 'Equipamento, ferramenta, proteções, manutenção' },
  { id: 'material', rotulo: 'Material', dica: 'Insumos, produtos químicos, peças, EPI fornecido' },
  { id: 'maoDeObra', rotulo: 'Mão de obra', dica: 'Treinamento, experiência, fadiga, supervisão, comportamento' },
  { id: 'meioAmbiente', rotulo: 'Meio ambiente', dica: 'Iluminação, piso, ruído, clima, organização do local' },
  { id: 'medida', rotulo: 'Medida', dica: 'Instrumentos, inspeções, indicadores, controles que falharam' }
];

const QTD_PORQUES = 5;

function analiseCausaVazia() {
  return {
    cincoPorques: { problema: '', porques: Array(QTD_PORQUES).fill(''), causaRaiz: '' },
    ishikawa: Object.fromEntries(CATEGORIAS_ISHIKAWA.map((c) => [c.id, '']))
  };
}

/** Garante os campos de análise de causa no registro (investigações antigas não têm). */
function garantirAnaliseCausa(dados) {
  const vazia = analiseCausaVazia();
  const cp = dados.cincoPorques || {};
  dados.cincoPorques = {
    problema: cp.problema || '',
    porques: Array.from({ length: QTD_PORQUES }, (_, i) => (cp.porques || [])[i] || ''),
    causaRaiz: cp.causaRaiz || ''
  };
  dados.ishikawa = Object.assign(vazia.ishikawa, dados.ishikawa || {});
  return dados;
}

function cincoPorquesPreenchido(dados) {
  const cp = dados.cincoPorques || {};
  return !!(cp.problema || cp.causaRaiz || (cp.porques || []).some(Boolean));
}

function ishikawaPreenchido(dados) {
  const ish = dados.ishikawa || {};
  return CATEGORIAS_ISHIKAWA.some((c) => (ish[c.id] || '').trim());
}

/* ---------------- Formulário (passo "Causas e Plano de Ação") ---------------- */

function htmlFormAnaliseCausa(dados) {
  const cp = dados.cincoPorques;
  const abertoPorques = cincoPorquesPreenchido(dados) ? 'open' : '';
  const abertoIsh = ishikawaPreenchido(dados) ? 'open' : '';
  return `
    <details class="analise-causa" ${abertoPorques}>
      <summary>5 Porquês (causa raiz)</summary>
      <p class="hint">Parta do problema e pergunte "por quê?" até chegar a uma causa que, se eliminada, impede a repetição. Nem sempre são necessários os cinco.</p>
      <label>Problema analisado
        <textarea data-analise="problema" rows="2" placeholder="Ex.: trabalhador caiu da escada ao acessar a prateleira">${escapeHtml(cp.problema)}</textarea>
      </label>
      ${cp.porques.map((p, i) => `
        <label>${i + 1}º Por quê?
          <input type="text" data-analise="porque" data-idx="${i}" value="${escapeHtml(p)}">
        </label>`).join('')}
      <label>Causa raiz identificada
        <textarea data-analise="causaRaiz" rows="2">${escapeHtml(cp.causaRaiz)}</textarea>
      </label>
    </details>
    <details class="analise-causa" ${abertoIsh}>
      <summary>Diagrama de Ishikawa (6M)</summary>
      <p class="hint">Liste as causas contribuintes em cada categoria. Deixe em branco a categoria que não se aplica.</p>
      ${CATEGORIAS_ISHIKAWA.map((c) => `
        <label>${c.rotulo}
          <textarea data-analise="ishikawa" data-cat="${c.id}" rows="2" placeholder="${escapeHtml(c.dica)}">${escapeHtml(dados.ishikawa[c.id])}</textarea>
        </label>`).join('')}
    </details>
  `;
}

/** Copia para `dados` o que está digitado nos campos de análise de causa. */
function lerFormAnaliseCausa(container, dados) {
  container.querySelectorAll('[data-analise]').forEach((el) => {
    const v = el.value;
    switch (el.dataset.analise) {
      case 'problema': dados.cincoPorques.problema = v; break;
      case 'causaRaiz': dados.cincoPorques.causaRaiz = v; break;
      case 'porque': dados.cincoPorques.porques[Number(el.dataset.idx)] = v; break;
      case 'ishikawa': dados.ishikawa[el.dataset.cat] = v; break;
      default: break;
    }
  });
}

function ligarFormAnaliseCausa(container, dados, salvar) {
  container.querySelectorAll('[data-analise]').forEach((el) => {
    el.addEventListener('blur', async () => {
      lerFormAnaliseCausa(container, dados);
      await salvar();
    });
  });
}

/* ---------------- Detalhe e relatório ---------------- */

function htmlDetalheAnaliseCausa(dados) {
  let html = '';
  if (cincoPorquesPreenchido(dados)) {
    const cp = dados.cincoPorques;
    html += `<h3>5 Porquês</h3><div class="detail-block">
      ${cp.problema ? `<p><strong>Problema:</strong> ${escapeHtml(cp.problema)}</p>` : ''}
      ${cp.porques.map((p, i) => (p ? `<p>${i + 1}º Por quê? ${escapeHtml(p)}</p>` : '')).join('')}
      ${cp.causaRaiz ? `<p><strong>Causa raiz:</strong> ${escapeHtml(cp.causaRaiz)}</p>` : ''}
    </div>`;
  }
  if (ishikawaPreenchido(dados)) {
    html += `<h3>Diagrama de Ishikawa (6M)</h3><div class="detail-block">
      ${CATEGORIAS_ISHIKAWA.filter((c) => (dados.ishikawa[c.id] || '').trim())
        .map((c) => `<p><strong>${c.rotulo}:</strong> ${escapeHtml(dados.ishikawa[c.id])}</p>`).join('')}
    </div>`;
  }
  return html;
}

function htmlRelatorioCincoPorques(dados) {
  if (!cincoPorquesPreenchido(dados)) return '';
  const cp = dados.cincoPorques;
  const linhas = cp.porques
    .map((p, i) => (p ? `<tr><td>${i + 1}º Por quê?</td><td>${escapeHtml(p)}</td></tr>` : ''))
    .join('');
  return `
    <h4>5 Porquês</h4>
    <table class="rep-table">
      <tbody>
        <tr><th>Problema</th><td>${escapeHtml(cp.problema || '—')}</td></tr>
        ${linhas}
        <tr><th>Causa raiz</th><td><strong>${escapeHtml(cp.causaRaiz || '—')}</strong></td></tr>
      </tbody>
    </table>`;
}

/**
 * Diagrama de espinha de peixe: três categorias acima e três abaixo da
 * espinha, que aponta para o efeito (o acidente). Feito em HTML para sair
 * igual na tela, na impressão e no PDF.
 */
function htmlRelatorioIshikawa(dados, efeito) {
  if (!ishikawaPreenchido(dados)) return '';
  const caixa = (c) => `
    <div class="ish-caixa">
      <div class="ish-rotulo">${c.rotulo}</div>
      <div class="ish-texto">${escapeHtml(dados.ishikawa[c.id] || '—')}</div>
    </div>`;
  const cima = CATEGORIAS_ISHIKAWA.slice(0, 3);
  const baixo = CATEGORIAS_ISHIKAWA.slice(3);
  return `
    <h4>Diagrama de Ishikawa (6M)</h4>
    <div class="ishikawa">
      <div class="ish-linha">${cima.map(caixa).join('')}</div>
      <div class="ish-espinha"><span class="ish-seta"></span><div class="ish-efeito">${escapeHtml(efeito || 'Acidente')}</div></div>
      <div class="ish-linha">${baixo.map(caixa).join('')}</div>
    </div>`;
}
