/* Inventário de riscos (PGR): lista, cadastro manual e importação CSV. */

const RISCO_SCHEMA = [
  { name: 'processo', label: 'Processo / ambiente de trabalho' },
  { name: 'atividade', label: 'Atividade' },
  { name: 'perigo', label: 'Perigo ou fator de risco', required: true },
  { name: 'fonte', label: 'Fonte ou circunstância' },
  { name: 'possiveisLesoes', label: 'Possíveis lesões ou agravos', type: 'textarea' },
  { name: 'grupoExposto', label: 'Grupo de trabalhadores expostos' },
  { name: 'caracterizacaoExposicao', label: 'Caracterização da exposição', type: 'textarea' },
  { name: 'medidasExistentes', label: 'Medidas existentes', type: 'textarea' },
  { name: 'eficaciaMedidas', label: 'Eficácia das medidas', type: 'select', options: ['Eficaz', 'Parcialmente eficaz', 'Ineficaz', 'Não há medida'] },
  { name: 'severidade', label: 'Severidade', type: 'select', options: [] },
  { name: 'probabilidade', label: 'Probabilidade', type: 'select', options: [] },
  { name: 'necessidadeAcao', label: 'Necessidade de ação?', type: 'radio', options: ['Sim', 'Não'] }
];

async function schemaComMatriz(schema) {
  const matriz = await getMatrizRisco();
  return schema.map((f) => {
    if (f.name === 'severidade') return Object.assign({}, f, { options: matriz.severidades.map((s) => s.nivel) });
    if (f.name === 'probabilidade') return Object.assign({}, f, { options: matriz.probabilidades.map((p) => p.nivel) });
    return f;
  });
}

async function renderPgrLista(orgId) {
  state.screen = 'pgr-lista';
  SCREEN_RENDERERS['pgr-lista'] = () => renderPgrLista(orgId);
  const riscos = (await DB.riscos.byIndex('organizacaoId', orgId)).filter((r) => r.status !== 'pendente_aprovacao');
  view.innerHTML = `
    ${menuTopo(orgId)}
    <div class="screen-header"><button id="btn-voltar" class="btn-link">← Voltar</button><h1>Inventário PGR</h1></div>
    <div class="form-actions">
      <button id="btn-novo-risco" class="btn-primary">+ Novo risco</button>
      <button id="btn-importar-csv" class="btn-secondary">Importar CSV</button>
    </div>
    <table class="rep-table">
      <thead><tr><th>Código</th><th>Perigo</th><th>Processo/Atividade</th><th>Classificação</th><th></th></tr></thead>
      <tbody>${riscos.length ? riscos.map((r) => `
        <tr data-id="${r.id}" class="linha-clicavel">
          <td>${escapeHtml(r.codigo || '—')}</td>
          <td>${escapeHtml(r.perigo)}</td>
          <td>${escapeHtml(r.processo || '')} / ${escapeHtml(r.atividade || '')}</td>
          <td><span class="badge ${badgeClassificacao(r.classificacao)}">${escapeHtml(r.classificacao || '—')}</span></td>
          <td><button type="button" class="btn-excluir-card" data-id="${r.id}">🗑</button></td>
        </tr>`).join('') : '<tr><td colspan="5" class="empty-state">Nenhum risco cadastrado.</td></tr>'}</tbody>
    </table>
    <input type="file" id="input-csv" accept=".csv" hidden>`;
  ligarMenuTopo();
  document.getElementById('btn-voltar').addEventListener('click', () => renderOrgPainel(orgId));
  document.getElementById('btn-novo-risco').addEventListener('click', () => renderPgrForm(orgId));
  document.getElementById('btn-importar-csv').addEventListener('click', () => document.getElementById('input-csv').click());
  document.getElementById('input-csv').addEventListener('change', async (e) => {
    if (!e.target.files.length) return;
    const n = await importarRiscosCSV(orgId, e.target.files[0]);
    alert(`${n} risco(s) importado(s).`);
    renderPgrLista(orgId);
  });
  view.querySelectorAll('tr[data-id]').forEach((tr) => tr.addEventListener('click', (e) => {
    if (e.target.closest('.btn-excluir-card')) return;
    renderPgrForm(orgId, riscos.find((r) => r.id === tr.dataset.id));
  }));
  view.querySelectorAll('.btn-excluir-card').forEach((btn) => btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!confirm('Excluir este risco do inventário?')) return;
    await DB.riscos.delete(btn.dataset.id);
    renderPgrLista(orgId);
  }));
}

async function renderPgrForm(orgId, risco) {
  state.screen = 'pgr-form';
  const schema = await schemaComMatriz(RISCO_SCHEMA);
  view.innerHTML = `
    ${menuTopo(orgId)}
    <div class="screen-header"><button id="btn-voltar" class="btn-link">← Voltar</button><h1>${risco ? 'Editar' : 'Novo'} risco do PGR</h1></div>
    <form id="form-risco" class="form-section">
      ${renderFormFields(schema, risco)}
      <div class="form-actions"><button type="submit" class="btn-primary">Salvar</button></div>
    </form>`;
  ligarMenuTopo();
  document.getElementById('btn-voltar').addEventListener('click', () => renderPgrLista(orgId));
  document.getElementById('form-risco').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = lerFormFields(e.target, schema);
    const { classificacao } = await classificarRisco(dados.severidade, dados.probabilidade);
    const registro = Object.assign({}, risco, dados, {
      id: risco ? risco.id : uuid(),
      organizacaoId: orgId,
      codigo: (risco && risco.codigo) || `PGR-${Date.now().toString(36).toUpperCase()}`,
      classificacao,
      versao: risco ? (risco.versao || 1) + 1 : 1,
      dataAtualizacao: Date.now(),
      status: 'aprovado',
      synced: false
    });
    await DB.riscos.put(registro);
    await registrarAuditoria('risco', registro.id, risco ? 'edicao' : 'criacao', registro.perigo);
    Sync.syncAll().catch(() => {});
    renderPgrLista(orgId);
  });
}

function parseCSV(texto) {
  const sepCandidato = (texto.split('\n')[0].match(/;/g) || []).length > (texto.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim());
  const cabecalho = linhas[0].split(sepCandidato).map((h) => h.trim().toLowerCase());
  return linhas.slice(1).map((linha) => {
    const valores = linha.split(sepCandidato);
    const obj = {};
    cabecalho.forEach((h, i) => { obj[h] = (valores[i] || '').trim(); });
    return obj;
  });
}

const MAPA_CSV = {
  processo: ['processo'], ambiente: ['ambiente'], atividade: ['atividade'],
  perigo: ['perigo', 'fator de risco', 'fator_de_risco'], fonte: ['fonte', 'circunstancia'],
  possiveisLesoes: ['possiveis lesoes', 'lesoes', 'possiveislesoes'],
  grupoExposto: ['grupo exposto', 'grupoexposto'],
  caracterizacaoExposicao: ['caracterizacao da exposicao', 'caracterizacaoexposicao'],
  medidasExistentes: ['medidas existentes', 'medidasexistentes'],
  eficaciaMedidas: ['eficacia', 'eficacia das medidas', 'eficaciamedidas'],
  severidade: ['severidade'], probabilidade: ['probabilidade'],
  necessidadeAcao: ['necessidade de acao', 'necessidadeacao']
};

function normalizarChaveCsv(v) {
  return (v || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

async function importarRiscosCSV(orgId, file) {
  const texto = await file.text();
  const linhas = parseCSV(texto);
  let n = 0;
  for (const linha of linhas) {
    const linhaNorm = {};
    Object.keys(linha).forEach((k) => { linhaNorm[normalizarChaveCsv(k)] = linha[k]; });
    const dados = {};
    Object.entries(MAPA_CSV).forEach(([campo, aliases]) => {
      for (const alias of aliases) {
        if (linhaNorm[normalizarChaveCsv(alias)] !== undefined) { dados[campo] = linhaNorm[normalizarChaveCsv(alias)]; break; }
      }
    });
    if (!dados.perigo) continue;
    const { classificacao } = await classificarRisco(dados.severidade, dados.probabilidade).catch(() => ({ classificacao: 'Não classificado' }));
    await DB.riscos.put(Object.assign({ id: uuid(), organizacaoId: orgId, codigo: `PGR-${Date.now().toString(36).toUpperCase()}-${n}`, versao: 1, dataAtualizacao: Date.now(), status: 'aprovado', synced: false, classificacao }, dados));
    n++;
  }
  await registrarAuditoria('risco', orgId, 'importacao_csv', `${n} registros importados`);
  Sync.syncAll().catch(() => {});
  return n;
}
