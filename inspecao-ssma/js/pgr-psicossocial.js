/* Avaliação de riscos psicossociais do PGR, igual ao "Modelo Matriz de Riscos
 * Psicossociais SGG" (planilha em modelos/): mesmas colunas, mesmas escalas
 * de severidade e probabilidade, mesmas faixas de classificação e prioridade
 * e os mesmos critérios documentados exigidos pela NR-1 (1.5.4.4.2.2).
 * Esses critérios valem só para os riscos psicossociais; os demais riscos do
 * PGR continuam com os critérios gerais (pgr-dados.js).
 * A planilha pode ser importada para dentro do PGR e exportada de volta no
 * mesmo modelo, com as fórmulas (biblioteca ExcelJS, carregada só na hora). */

const ARQUIVO_MODELO_PSICO = 'modelos/Modelo_Matriz_Riscos_Psicossociais_SGG.xlsx';
const ABA_AVALIACAO_PSICO = 'Avaliação Psicossocial';
const ABA_CRITERIOS_PSICO = 'Critérios & Escalas';
const PRIMEIRA_LINHA_PSICO = 3;
const LINHAS_MODELO_PSICO = 20; // linhas 3 a 22 da planilha

const RODAPE_PSICO = 'Modelo SGG · alinhado à NR-1, NR-17 e ao Guia de Fatores de Riscos Psicossociais do MTE (2025). A avaliação recai sobre as condições de trabalho, não sobre a saúde individual do trabalhador.';

/* Gradação da Severidade — magnitude do agravo (seleciona-se a de maior magnitude). */
const SEVERIDADE_PSICO = [
  { valor: 1, categoria: 'Leve', matriz: 'Leve', descricao: 'Desconforto passageiro, sem afastamento' },
  { valor: 2, categoria: 'Moderada', matriz: 'Moderada', descricao: 'Estresse com sintomas reversíveis; tratamento conservador' },
  { valor: 3, categoria: 'Grave', matriz: 'Grave', descricao: 'Transtorno instalado; afastamento prolongado' },
  { valor: 4, categoria: 'Muito Grave', matriz: 'Muito Grave', descricao: 'Burnout limitante; afastamento psiquiátrico crônico' },
  { valor: 5, categoria: 'Morte / Incapacitação', matriz: 'Extrema', descricao: 'Surto grave; ideação ou ato suicida de etiologia laboral' }
];

/* Gradação da Probabilidade — exigências da atividade × eficácia das medidas (NR-1 1.5.4.4.5.3). */
const PROBABILIDADE_PSICO = [
  { valor: 1, categoria: 'Muito Improvável', descricao: 'Fator estressor praticamente ausente; medidas eficazes e consolidadas' },
  { valor: 2, categoria: 'Improvável', descricao: 'Fator esporádico; medidas existentes e geralmente eficazes' },
  { valor: 3, categoria: 'Possível', descricao: 'Fator presente com regularidade; medidas parciais ou de eficácia incerta' },
  { valor: 4, categoria: 'Provável', descricao: 'Fator intenso e frequente na atividade; medidas insuficientes' },
  { valor: 5, categoria: 'Muito Provável', descricao: 'Fator contínuo e intenso; ausência de medidas ou medidas ineficazes' }
];

/* Faixas de classificação do nível de risco (P×S), da maior para a menor. */
const FAIXAS_PSICO = [
  { min: 20, faixa: '20 a 25', classificacao: 'Crítico', prioridade: 'Intervenção imediata', acao: 'Intervenção imediata', legenda: 'Intervenção imediata na organização do trabalho', cor: '#B3261E', texto: '#FFFFFF' },
  { min: 12, faixa: '12 a 16', classificacao: 'Alto', prioridade: 'Ação estruturada (curto prazo)', acao: 'Ação estruturada de curto prazo', legenda: 'Ação estruturada de curto prazo', cor: '#F59E0B', texto: '#3A2A00' },
  { min: 6, faixa: '6 a 10', classificacao: 'Médio', prioridade: 'Mitigar (médio prazo)', acao: 'Mitigar em médio prazo', legenda: 'Mitigar em médio prazo', cor: '#FDE68A', texto: '#000000' },
  { min: 1, faixa: '1 a 5', classificacao: 'Baixo', prioridade: 'Monitorar', acao: 'Monitorar / manter', legenda: 'Monitorar / manter', cor: '#BBF7D0', texto: '#000000' }
];

/* Documentação dos critérios (preencher — exigido pela NR-1). */
const CRITERIOS_DOC_PSICO = [
  { campo: 'metodologia', rotulo: 'Metodologia de avaliação adotada', exemplo: '(ex.: matriz de probabilidade × consequência, conforme ABNT NBR ISO/IEC 31010)' },
  { campo: 'metodoIdentificacao', rotulo: 'Método de identificação utilizado', exemplo: '(ex.: AEP/AET, observação da atividade, questionário validado)' },
  { campo: 'instrumento', rotulo: 'Instrumento/questionário (se houver)', exemplo: '(ex.: COPSOQ — versão brasileira; ou avaliação qualitativa)' },
  { campo: 'unidadeAnalise', rotulo: 'Unidade de análise', exemplo: '(setor / cargo / função / GHE)' },
  { campo: 'responsavelTecnico', rotulo: 'Responsável técnico pela avaliação', exemplo: '' },
  { campo: 'dataRevisao', rotulo: 'Data da avaliação / próxima revisão', exemplo: '' }
];

/* Sugestões de fatores de risco psicossociais para agilizar o preenchimento.
 * O campo é livre: a lista não limita o que pode ser registrado. */
const FATORES_PSICO_SUGERIDOS = [
  'Excesso de demandas no trabalho (sobrecarga)',
  'Baixo controle no trabalho / falta de autonomia',
  'Baixa clareza de papel ou função',
  'Baixo apoio social da chefia ou dos colegas',
  'Baixas recompensas e reconhecimento',
  'Baixa justiça organizacional',
  'Má gestão de mudanças organizacionais',
  'Assédio moral',
  'Assédio sexual',
  'Violência ou eventos traumáticos no trabalho',
  'Conflitos interpessoais',
  'Demandas emocionais elevadas (contato com sofrimento, público hostil)',
  'Jornada extensa, trabalho em turnos ou noturno',
  'Ritmo intenso e pressão por metas ou prazos',
  'Trabalho isolado ou remoto em condições difíceis',
  'Insegurança quanto à manutenção do emprego'
];

function novoItemPsico() {
  return { id: uuid(), setor: '', perigo: '', consequencia: '', caracterizacao: '', medidasExistentes: '', severidade: '', probabilidade: '', responsavel: '', prazo: '' };
}

function avaliacaoPsicoVazia() {
  return { itens: [], criterios: Object.fromEntries(CRITERIOS_DOC_PSICO.map((c) => [c.campo, ''])) };
}

/** Garante a avaliação psicossocial no PGR (PGRs antigos não têm). */
function garantirAvaliacaoPsico(dados) {
  const atual = dados.psicossocial || {};
  dados.psicossocial = {
    itens: (atual.itens || []).map((i) => Object.assign(novoItemPsico(), i)),
    criterios: Object.assign(avaliacaoPsicoVazia().criterios, atual.criterios || {})
  };
  return dados.psicossocial;
}

/**
 * Mesmas fórmulas da planilha: Nível = Severidade × Probabilidade;
 * Classificação ≥20 Crítico, ≥12 Alto, ≥6 Médio, senão Baixo; e a prioridade
 * correspondente. Sem severidade ou probabilidade, tudo fica em branco.
 */
function calcularRiscoPsico(severidade, probabilidade) {
  const s = Number(severidade);
  const p = Number(probabilidade);
  if (!s || !p) return { nivel: '', classificacao: '', prioridade: '', faixa: null };
  const nivel = s * p;
  const faixa = FAIXAS_PSICO.find((f) => nivel >= f.min);
  return { nivel, classificacao: faixa.classificacao, prioridade: faixa.prioridade, faixa };
}

function corClassificacaoPsico(classificacao) {
  return FAIXAS_PSICO.find((f) => f.classificacao === classificacao) || null;
}

function seloClassificacaoPsico(r) {
  if (!r.classificacao) return '<span class="badge badge-rascunho">Não avaliado</span>';
  return `<span class="psico-selo" style="background:${r.faixa.cor};color:${r.faixa.texto}">${r.nivel} · ${escapeHtml(r.classificacao)}</span>`;
}

/* ---------------- Tela (detalhe do PGR) ---------------- */

function htmlSecaoPsicossocialPGR(p, ghes) {
  const av = garantirAvaliacaoPsico(p.data);
  const sugestoesSetor = [...new Set(ghes.flatMap((g) => [g.nome, g.setor, g.funcao]).filter(Boolean))];
  const criteriosPreenchidos = CRITERIOS_DOC_PSICO.filter((c) => (av.criterios[c.campo] || '').trim()).length;
  return `
    <div class="lista-participantes form-section" id="secao-psicossocial">
      <h3>Avaliação de riscos psicossociais (NR-1)</h3>
      <p class="hint">Matriz de riscos psicossociais por setor, cargo ou GHE, no mesmo modelo da planilha SGG, alinhada à NR-1, à NR-17 e ao Guia de Fatores de Riscos Psicossociais do MTE (2025). O Nível de Risco, a Classificação e a Prioridade são calculados a partir de Severidade × Probabilidade. A avaliação recai sobre as condições de trabalho, não sobre a saúde individual do trabalhador.</p>
      <datalist id="psico-sugestoes-perigo">${FATORES_PSICO_SUGERIDOS.map((f) => `<option value="${escapeHtml(f)}">`).join('')}</datalist>
      <datalist id="psico-sugestoes-setor">${sugestoesSetor.map((f) => `<option value="${escapeHtml(f)}">`).join('')}</datalist>
      <div class="form-actions psico-acoes-arquivo">
        <label class="file-label btn-secondary">📥 Importar planilha (.xlsx)
          <input type="file" id="psico-importar" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden>
        </label>
        <button type="button" id="psico-exportar" class="btn-secondary">📤 Exportar planilha (.xlsx)</button>
      </div>
      <p id="psico-arquivo-msg" class="hint"></p>
      <details class="analise-causa">
        <summary>Critérios documentados (${criteriosPreenchidos}/${CRITERIOS_DOC_PSICO.length})</summary>
        <p class="hint">Exigência da NR-1 (subitem 1.5.4.4.2.2).</p>
        ${CRITERIOS_DOC_PSICO.map((c) => `
          <label>${escapeHtml(c.rotulo)}
            <input type="text" class="psico-criterio" data-campo="${c.campo}" value="${escapeHtml(av.criterios[c.campo])}" placeholder="${escapeHtml(c.exemplo)}">
          </label>`).join('')}
      </details>
      <details class="analise-causa">
        <summary>Escalas, faixas e matriz 5×5</summary>
        ${htmlEscalasPsico()}
        ${htmlMatrizPsico()}
      </details>
      <div id="psico-itens"></div>
      <button type="button" id="psico-adicionar" class="btn-secondary">+ Adicionar fator de risco psicossocial</button>
    </div>`;
}

function htmlItemPsico(item, idx) {
  const r = calcularRiscoPsico(item.severidade, item.probabilidade);
  const opcoes = (lista, atual) => `<option value="">—</option>${lista.map((n) => `<option value="${n.valor}" ${String(atual) === String(n.valor) ? 'selected' : ''}>${n.valor} — ${escapeHtml(n.categoria)}</option>`).join('')}`;
  const campo = (nome, rotulo, extra = '', cls = '') => `<label class="${cls}">${rotulo}<input type="text" data-campo="${nome}" value="${escapeHtml(item[nome])}" ${extra}></label>`;
  const area = (nome, rotulo, ph = '') => `<label>${rotulo}<textarea data-campo="${nome}" rows="2" placeholder="${escapeHtml(ph)}">${escapeHtml(item[nome])}</textarea></label>`;
  return `
    <div class="leitura-card psico-item" data-idx="${idx}">
      <div class="psico-item-topo">
        <strong>#${idx + 1}</strong>
        ${seloClassificacaoPsico(r)}
        ${r.prioridade ? `<span class="hint">${escapeHtml(r.prioridade)}</span>` : ''}
        <button type="button" class="btn-link psico-remover">Remover</button>
      </div>
      ${campo('setor', 'Setor / Cargo / GHE', 'list="psico-sugestoes-setor"')}
      ${campo('perigo', 'Perigo psicossocial (fator de risco)', 'list="psico-sugestoes-perigo"')}
      ${campo('consequencia', 'Possível consequência', 'placeholder="Ex.: transtorno mental; DORT"')}
      ${area('caracterizacao', 'Caracterização da exposição (atividade real)', 'Ex.: volume excessivo de chamados, horas extras frequentes, supressão de pausas')}
      ${area('medidasExistentes', 'Medidas de prevenção já existentes', 'Ex.: nenhuma medida implementada')}
      <div class="participante-linha">
        <label class="campo-leitura">Severidade (1-5)<select data-campo="severidade">${opcoes(SEVERIDADE_PSICO, item.severidade)}</select></label>
        <label class="campo-leitura">Probabilidade (1-5)<select data-campo="probabilidade">${opcoes(PROBABILIDADE_PSICO, item.probabilidade)}</select></label>
      </div>
      <div class="participante-linha">
        ${campo('responsavel', 'Responsável', '', 'campo-leitura')}
        <label class="campo-leitura">Prazo<input type="date" data-campo="prazo" value="${escapeHtml(item.prazo)}"></label>
      </div>
    </div>`;
}

function ligarSecaoPsicossocialPGR(p, salvar, redesenhar) {
  const av = garantirAvaliacaoPsico(p.data);
  const lista = document.getElementById('psico-itens');
  const msg = document.getElementById('psico-arquivo-msg');

  function desenharItens() {
    lista.innerHTML = av.itens.length
      ? av.itens.map((item, idx) => htmlItemPsico(item, idx)).join('')
      : '<p class="empty-state">Nenhum fator de risco psicossocial avaliado ainda.</p>';
    lista.querySelectorAll('.psico-item').forEach((card) => {
      const item = av.itens[Number(card.dataset.idx)];
      card.querySelectorAll('[data-campo]').forEach((el) => {
        const evento = el.tagName === 'SELECT' || el.type === 'date' ? 'change' : 'blur';
        el.addEventListener(evento, async () => {
          item[el.dataset.campo] = el.tagName === 'SELECT' ? (el.value ? Number(el.value) : '') : el.value.trim();
          await salvar();
          if (el.tagName === 'SELECT') desenharItens();
        });
      });
      card.querySelector('.psico-remover').addEventListener('click', async () => {
        if (!confirm('Remover este fator de risco psicossocial?')) return;
        av.itens.splice(av.itens.indexOf(item), 1);
        await salvar();
        desenharItens();
      });
    });
  }
  desenharItens();

  document.querySelectorAll('.psico-criterio').forEach((el) => {
    el.addEventListener('blur', async () => { av.criterios[el.dataset.campo] = el.value.trim(); await salvar(); });
  });
  document.getElementById('psico-adicionar').addEventListener('click', async () => {
    av.itens.push(novoItemPsico());
    await salvar();
    desenharItens();
  });

  document.getElementById('psico-exportar').addEventListener('click', async () => {
    msg.textContent = 'Gerando a planilha…';
    try {
      const arquivo = await exportarPlanilhaPsico(p);
      msg.textContent = `Planilha gerada: ${arquivo.name}.`;
      if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
        navigator.share({ files: [arquivo], title: 'Matriz de Riscos Psicossociais' }).catch(() => baixarArquivo(arquivo));
      } else {
        baixarArquivo(arquivo);
      }
    } catch (e) {
      msg.textContent = 'Não foi possível gerar a planilha: ' + e.message;
    }
  });

  document.getElementById('psico-importar').addEventListener('change', async (e) => {
    const arquivo = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!arquivo) return;
    msg.textContent = 'Lendo a planilha…';
    try {
      const lido = await importarPlanilhaPsico(arquivo);
      if (!lido.itens.length && !Object.values(lido.criterios).some(Boolean)) {
        msg.textContent = 'A planilha não tem fatores preenchidos nem critérios documentados.';
        return;
      }
      let modo = 'substituir';
      if (av.itens.length) {
        modo = await perguntarModoImportacaoPsico(av.itens.length, lido.itens.length);
        if (!modo) { msg.textContent = 'Importação cancelada.'; return; }
      }
      av.itens = modo === 'acrescentar' ? [...av.itens, ...lido.itens] : lido.itens;
      CRITERIOS_DOC_PSICO.forEach((c) => { if (lido.criterios[c.campo]) av.criterios[c.campo] = lido.criterios[c.campo]; });
      await salvar();
      redesenhar(`${lido.itens.length} fator(es) importado(s) da planilha.`);
    } catch (err) {
      msg.textContent = 'Não foi possível ler a planilha: ' + err.message;
    }
  });
}

function perguntarModoImportacaoPsico(atuais, novos) {
  return new Promise((resolve) => {
    const dlg = abrirDialogo(`
      <h2>Importar planilha</h2>
      <p>Este PGR já tem ${atuais} fator(es) psicossocial(is). A planilha tem ${novos}.</p>
      <div class="form-actions">
        <button type="button" class="btn-primary" data-modo="substituir">Substituir pelos da planilha</button>
        <button type="button" class="btn-secondary" data-modo="acrescentar">Acrescentar aos atuais</button>
        <button type="button" class="btn-link" data-modo="">Cancelar</button>
      </div>`);
    dlg.querySelectorAll('[data-modo]').forEach((b) => b.addEventListener('click', () => { dlg.remove(); resolve(b.dataset.modo); }));
  });
}

/* ---------------- Escalas, matriz e relatório ---------------- */

function htmlEscalasPsico() {
  return `
    <h4>Gradação da Severidade — magnitude do agravo (seleciona-se a de maior magnitude)</h4>
    <table class="rep-table"><thead><tr><th>Nível</th><th>Categoria</th><th>Descrição</th></tr></thead><tbody>
      ${SEVERIDADE_PSICO.map((n) => `<tr><td>${n.valor}</td><td>${escapeHtml(n.categoria)}</td><td>${escapeHtml(n.descricao)}</td></tr>`).join('')}
    </tbody></table>
    <h4>Gradação da Probabilidade — exigências da atividade × eficácia das medidas (NR-1 1.5.4.4.5.3)</h4>
    <table class="rep-table"><thead><tr><th>Nível</th><th>Categoria</th><th>Como aferir</th></tr></thead><tbody>
      ${PROBABILIDADE_PSICO.map((n) => `<tr><td>${n.valor}</td><td>${escapeHtml(n.categoria)}</td><td>${escapeHtml(n.descricao)}</td></tr>`).join('')}
    </tbody></table>
    <h4>Faixas de classificação do nível de risco</h4>
    <table class="rep-table"><thead><tr><th>Nível de risco (P×S)</th><th>Classificação</th><th>Ação</th></tr></thead><tbody>
      ${[...FAIXAS_PSICO].reverse().map((f) => `<tr><td>${f.faixa}</td><td style="background:${f.cor};color:${f.texto};font-weight:700">${f.classificacao}</td><td>${escapeHtml(f.acao)}</td></tr>`).join('')}
    </tbody></table>`;
}

function htmlMatrizPsico() {
  const linhas = [...PROBABILIDADE_PSICO].reverse().map((pr) => `
    <tr><th>${escapeHtml(pr.categoria)} (${pr.valor})</th>
      ${SEVERIDADE_PSICO.map((sv) => {
        const r = calcularRiscoPsico(sv.valor, pr.valor);
        return `<td style="background:${r.faixa.cor};color:${r.faixa.texto};text-align:center;font-weight:700">${r.nivel}</td>`;
      }).join('')}</tr>`).join('');
  return `
    <h4>Matriz de Nível de Risco — Probabilidade × Severidade</h4>
    <table class="rep-table psico-matriz">
      <thead><tr><th>Probabilidade ↓ \\ Severidade →</th>${SEVERIDADE_PSICO.map((s) => `<th>${escapeHtml(s.matriz)} (${s.valor})</th>`).join('')}</tr></thead>
      <tbody>${linhas}</tbody>
    </table>
    <p class="hint">${[...FAIXAS_PSICO].reverse().map((f) => `<strong>${f.classificacao} (${f.faixa.replace(' a ', '-')})</strong>: ${escapeHtml(f.legenda)}`).join(' · ')}</p>`;
}

/** Seção do relatório do PGR: critérios documentados, tabela no formato da planilha, escalas e matriz. */
function htmlRelatorioPsicoPGR(p) {
  const av = garantirAvaliacaoPsico(p.data);
  const criterios = `
    <table class="rep-tabela-ident"><tbody>
      ${CRITERIOS_DOC_PSICO.map((c) => `<tr><th>${escapeHtml(c.rotulo)}</th><td>${escapeHtml(av.criterios[c.campo] || '—')}</td></tr>`).join('')}
    </tbody></table>`;
  const tabela = av.itens.length
    ? `<table class="rep-table rep-inventario-pgr psico-tabela">
        <thead><tr><th>#</th><th>Setor / Cargo / GHE</th><th>Perigo psicossocial (fator de risco)</th><th>Possível consequência</th><th>Caracterização da exposição (atividade real)</th><th>Medidas de prevenção já existentes</th><th>Severidade (1-5)</th><th>Probabilidade (1-5)</th><th>Nível de Risco</th><th>Classificação</th><th>Prioridade de ação</th><th>Responsável</th><th>Prazo</th></tr></thead>
        <tbody>${av.itens.map((i, idx) => {
          const r = calcularRiscoPsico(i.severidade, i.probabilidade);
          const cor = r.faixa ? `background:${r.faixa.cor};color:${r.faixa.texto};font-weight:700` : '';
          return `<tr><td>${idx + 1}</td><td>${escapeHtml(i.setor)}</td><td>${escapeHtml(i.perigo)}</td><td>${escapeHtml(i.consequencia)}</td><td>${escapeHtml(i.caracterizacao)}</td><td>${escapeHtml(i.medidasExistentes)}</td><td>${escapeHtml(String(i.severidade))}</td><td>${escapeHtml(String(i.probabilidade))}</td><td>${r.nivel}</td><td style="${cor}">${escapeHtml(r.classificacao)}</td><td>${escapeHtml(r.prioridade)}</td><td>${escapeHtml(i.responsavel)}</td><td>${i.prazo ? formatarDataBR(i.prazo) : ''}</td></tr>`;
        }).join('')}</tbody>
      </table>`
    : '<p class="rep-hint">Nenhum fator de risco psicossocial avaliado neste PGR.</p>';
  return `
    <h4>Critérios documentados — exigência da NR-1 (subitem 1.5.4.4.2.2)</h4>
    ${criterios}
    <h4>Matriz de Riscos Psicossociais — Avaliação por setor, cargo ou GHE (NR-1)</h4>
    ${tabela}
    ${htmlEscalasPsico()}
    ${htmlMatrizPsico()}
    <p class="rep-hint">${escapeHtml(RODAPE_PSICO)}</p>`;
}

/* ---------------- Importar e exportar a planilha (.xlsx) ---------------- */

let carregamentoExcelJS = null;

function carregarExcelJS() {
  if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
  if (!carregamentoExcelJS) {
    carregamentoExcelJS = carregarScript('js/vendor/exceljs.min.js')
      .then(() => window.ExcelJS)
      .catch((e) => { carregamentoExcelJS = null; throw e; });
  }
  return carregamentoExcelJS;
}

/** Texto de uma célula da planilha (fórmula, texto rico, data, número). */
function valorCelulaPsico(v) {
  if (v === null || v === undefined) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    if ('result' in v) return valorCelulaPsico(v.result);
    if (Array.isArray(v.richText)) return v.richText.map((t) => t.text).join('');
    if ('text' in v) return String(v.text);
    return '';
  }
  return String(v).trim();
}

function dataIsoPsico(v) {
  const t = valorCelulaPsico(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  const br = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return br ? `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}` : '';
}

function notaEscalaPsico(v) {
  const n = Math.round(Number(valorCelulaPsico(v)));
  return n >= 1 && n <= 5 ? n : '';
}

/**
 * Lê uma planilha no modelo SGG (workbook do ExcelJS já carregado) e devolve
 * { itens, criterios }. Linhas de 3 em diante, até o fim da tabela; linhas
 * totalmente vazias são ignoradas.
 */
function lerWorkbookPsico(wb) {
  const ws = wb.getWorksheet(ABA_AVALIACAO_PSICO) || wb.worksheets[0];
  if (!ws) throw new Error('A planilha está vazia.');
  const cab = valorCelulaPsico(ws.getCell('C2').value).toLowerCase();
  if (!cab.includes('perigo')) throw new Error('Esta não parece ser a planilha "Matriz de Riscos Psicossociais" (a coluna C da linha 2 deveria ser "Perigo psicossocial").');
  const itens = [];
  for (let r = PRIMEIRA_LINHA_PSICO; r <= ws.rowCount; r++) {
    const linha = ws.getRow(r);
    const t = (col) => valorCelulaPsico(linha.getCell(col).value);
    if (t('B').startsWith('As colunas Nível de Risco') || t('A').startsWith('Modelo SGG')) break;
    const item = {
      ...novoItemPsico(),
      setor: t('B'), perigo: t('C'), consequencia: t('D'), caracterizacao: t('E'), medidasExistentes: t('F'),
      severidade: notaEscalaPsico(linha.getCell('G').value), probabilidade: notaEscalaPsico(linha.getCell('H').value),
      responsavel: t('L'), prazo: dataIsoPsico(linha.getCell('M').value)
    };
    if ([item.setor, item.perigo, item.consequencia, item.caracterizacao, item.medidasExistentes, item.severidade, item.probabilidade, item.responsavel].some(Boolean)) itens.push(item);
  }
  const criterios = avaliacaoPsicoVazia().criterios;
  const wsCrit = wb.getWorksheet(ABA_CRITERIOS_PSICO);
  if (wsCrit) {
    wsCrit.eachRow((linha) => {
      const rotulo = valorCelulaPsico(linha.getCell('A').value);
      const def = CRITERIOS_DOC_PSICO.find((c) => c.rotulo === rotulo);
      const valor = valorCelulaPsico(linha.getCell('B').value);
      // O texto de exemplo entre parênteses do modelo não conta como preenchido.
      if (def && valor && valor !== def.exemplo) criterios[def.campo] = valor;
    });
  }
  return { itens, criterios };
}

async function importarPlanilhaPsico(arquivo) {
  const ExcelJS = await carregarExcelJS();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await arquivo.arrayBuffer());
  return lerWorkbookPsico(wb);
}

/**
 * Preenche o modelo SGG (workbook já carregado) com a avaliação do PGR. Com
 * mais de 20 fatores, acrescenta linhas no mesmo formato e estende as
 * fórmulas, a validação (1 a 5) e as cores da classificação.
 */
function preencherWorkbookPsico(wb, av) {
  const ws = wb.getWorksheet(ABA_AVALIACAO_PSICO) || wb.worksheets[0];
  const extras = Math.max(0, av.itens.length - LINHAS_MODELO_PSICO);
  const ultimaModelo = PRIMEIRA_LINHA_PSICO + LINHAS_MODELO_PSICO - 1;
  if (extras) {
    // Células mescladas abaixo da tabela (observação e rodapé) são desfeitas
    // antes de abrir as linhas e refeitas no novo lugar; senão o texto se
    // repete em todas as colunas.
    const abaixo = (ws.model.merges || []).filter((m) => Number(m.match(/\d+/)[0]) > ultimaModelo);
    abaixo.forEach((m) => ws.unMergeCells(m));
    ws.spliceRows(ultimaModelo + 1, 0, ...Array.from({ length: extras }, () => []));
    abaixo.forEach((m) => ws.mergeCells(m.replace(/\d+/g, (n) => String(Number(n) + extras))));
    for (let k = 1; k <= extras; k++) {
      const base = ws.getRow(ultimaModelo - ((k + 1) % 2)); // alterna o fundo como no modelo
      const nova = ws.getRow(ultimaModelo + k);
      nova.height = base.height;
      for (let c = 1; c <= 13; c++) nova.getCell(c).style = JSON.parse(JSON.stringify(base.getCell(c).style || {}));
    }
  }
  const ultima = ultimaModelo + extras;
  const validacao = ws.getCell(`G${PRIMEIRA_LINHA_PSICO}`).dataValidation;
  for (let r = PRIMEIRA_LINHA_PSICO; r <= ultima; r++) {
    const item = av.itens[r - PRIMEIRA_LINHA_PSICO];
    const linha = ws.getRow(r);
    const calc = item ? calcularRiscoPsico(item.severidade, item.probabilidade) : { nivel: '', classificacao: '', prioridade: '' };
    const set = (col, v) => { linha.getCell(col).value = v === undefined || v === '' ? null : v; };
    set('A', item ? r - PRIMEIRA_LINHA_PSICO + 1 : '');
    set('B', item && item.setor); set('C', item && item.perigo); set('D', item && item.consequencia);
    set('E', item && item.caracterizacao); set('F', item && item.medidasExistentes);
    set('G', item && item.severidade ? Number(item.severidade) : '');
    set('H', item && item.probabilidade ? Number(item.probabilidade) : '');
    linha.getCell('I').value = { formula: `IF(OR(G${r}="",H${r}=""),"",G${r}*H${r})`, result: calc.nivel };
    linha.getCell('J').value = { formula: `IF(I${r}="","",IF(I${r}>=20,"Crítico",IF(I${r}>=12,"Alto",IF(I${r}>=6,"Médio","Baixo"))))`, result: calc.classificacao };
    linha.getCell('K').value = { formula: `IF(J${r}="","",IF(J${r}="Crítico","Intervenção imediata",IF(J${r}="Alto","Ação estruturada (curto prazo)",IF(J${r}="Médio","Mitigar (médio prazo)","Monitorar"))))`, result: calc.prioridade };
    set('L', item && item.responsavel);
    if (item && item.prazo) {
      // Data gravada como número de série do Excel, com formato de data só
      // nesta célula (o estilo do modelo é compartilhado com outras colunas).
      const [a, m, d] = item.prazo.split('-').map(Number);
      const celula = linha.getCell('M');
      celula.value = (Date.UTC(a, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000;
      celula.style = Object.assign(JSON.parse(JSON.stringify(celula.style || {})), { numFmt: 'dd/mm/yyyy' });
    } else {
      set('M', '');
    }
    if (validacao) {
      linha.getCell('G').dataValidation = validacao;
      linha.getCell('H').dataValidation = validacao;
    }
  }
  (ws.conditionalFormattings || []).forEach((cf) => {
    if (/^J\d+:J\d+$/.test(cf.ref)) cf.ref = `J${PRIMEIRA_LINHA_PSICO}:J${ultima}`;
  });

  const wsCrit = wb.getWorksheet(ABA_CRITERIOS_PSICO);
  if (wsCrit) {
    wsCrit.eachRow((linha) => {
      const def = CRITERIOS_DOC_PSICO.find((c) => c.rotulo === valorCelulaPsico(linha.getCell('A').value));
      if (def && (av.criterios[def.campo] || '').trim()) linha.getCell('B').value = av.criterios[def.campo].trim();
    });
  }
  wb.calcProperties = Object.assign({}, wb.calcProperties, { fullCalcOnLoad: true });
  return wb;
}

async function exportarPlanilhaPsico(p) {
  const ExcelJS = await carregarExcelJS();
  const resp = await fetch(ARQUIVO_MODELO_PSICO);
  if (!resp.ok) throw new Error('modelo da planilha não encontrado.');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await resp.arrayBuffer());
  preencherWorkbookPsico(wb, garantirAvaliacaoPsico(p.data));
  const buffer = await wb.xlsx.writeBuffer();
  const nome = `Matriz_Riscos_Psicossociais_${(p.data.empresa || 'PGR').replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '')}.xlsx`;
  return new File([buffer], nome, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
