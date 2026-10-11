/* Observação comportamental (segurança baseada em comportamento).
 * O observador acompanha uma atividade por alguns minutos, marca cada
 * comportamento como Seguro, De risco ou Não observado, conversa com a
 * equipe (reconhece o que foi feito com segurança e combina a correção do
 * que foi de risco) e registra o compromisso assumido. O foco é o
 * comportamento, não a pessoa: o nome do observado não é registrado. */

const CATEGORIAS_OBSERVACAO = [
  { nome: 'EPI', itens: [
    'Usa os EPIs exigidos para a atividade',
    'Os EPIs estão em bom estado e ajustados corretamente',
    'Usa proteção auditiva e respiratória quando necessário'
  ] },
  { nome: 'Posição das pessoas', itens: [
    'Fica fora da linha de fogo (cargas suspensas, partes móveis, energia armazenada)',
    'Mantém postura adequada ao levantar e movimentar cargas',
    'Mantém três pontos de apoio em escadas e acessos',
    'Não se expõe a pontos de prensamento ou esmagamento'
  ] },
  { nome: 'Ferramentas e equipamentos', itens: [
    'Usa a ferramenta certa para a tarefa',
    'Ferramentas e equipamentos em boas condições e inspecionados',
    'Mantém as proteções das máquinas instaladas'
  ] },
  { nome: 'Procedimentos', itens: [
    'Segue o procedimento ou a análise de risco da tarefa',
    'A PT/APR está emitida e é conhecida pela equipe, quando exigida',
    'Faz bloqueio e etiquetagem de energias quando aplicável',
    'Respeita sinalização, isolamento de área e limites de velocidade'
  ] },
  { nome: 'Ordem e limpeza', itens: [
    'Área de trabalho organizada e sem obstáculos',
    'Materiais e resíduos armazenados no local correto',
    'Rotas de fuga e equipamentos de emergência desobstruídos'
  ] },
  { nome: 'Reação ao ser observado', itens: [
    'Não precisou parar ou ajustar a tarefa ao perceber a observação',
    'Não precisou colocar ou ajustar EPI ao perceber a observação'
  ] }
];

const RESULTADOS_OBS = ['Seguro', 'De risco', 'Não observado'];

function novaObservacaoVazia() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return {
    id: uuid(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    completo: false,
    syncStatus: 'pendente',
    syncError: '',
    metaSynced: false,
    remoteRef: null,
    data: {
      data: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      hora: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      empresa: '',
      area: '',
      atividade: '',
      observador: '',
      numObservados: '1',
      itens: CATEGORIAS_OBSERVACAO.flatMap((c) => c.itens.map((texto) => ({ id: uuid(), categoria: c.nome, texto, resultado: '' }))),
      comportamentosRisco: '',
      reconhecimento: '',
      feedbackRealizado: '',
      compromisso: '',
      fotosIds: [],
      tratamento: { acaoCorretiva: '', responsavel: '', prazo: '', status: 'Pendente' }
    }
  };
}

function indiceSeguro(obs) {
  const seg = obs.data.itens.filter((i) => i.resultado === 'Seguro').length;
  const risco = obs.data.itens.filter((i) => i.resultado === 'De risco').length;
  return { seguro: seg, risco, pct: seg + risco ? Math.round((seg / (seg + risco)) * 100) : null };
}

async function salvarObservacao(o) {
  o.updatedAt = Date.now();
  await DB.putItem('observacoes', o);
}

/* ---------------- LISTA ---------------- */

async function renderObservacoesHome() {
  state.screen = 'observacoes-home';
  setActiveTab('observacoes');
  const lista = await DB.getAllItems('observacoes');
  const concluidas = lista.filter((o) => o.completo);
  let seg = 0; let risco = 0;
  concluidas.forEach((o) => { const k = indiceSeguro(o); seg += k.seguro; risco += k.risco; });
  const pctGeral = seg + risco ? Math.round((seg / (seg + risco)) * 100) : null;

  view.innerHTML = `
    <div class="screen-header">
      <h1>Observação comportamental</h1>
      <button id="btn-nova-obs" class="btn-primary">+ Nova observação</button>
    </div>
    <div class="kpi-grid kpi-grid-4">
      <div class="kpi"><span class="kpi-valor">${concluidas.length}</span><span class="kpi-rotulo">Observações</span></div>
      <div class="kpi ${pctGeral === null ? '' : pctGeral >= 90 ? 'kpi-ok' : pctGeral >= 75 ? 'kpi-atencao' : 'kpi-alerta'}"><span class="kpi-valor">${pctGeral === null ? '—' : pctGeral + '%'}</span><span class="kpi-rotulo">Comportamento seguro</span></div>
      <div class="kpi kpi-alerta"><span class="kpi-valor">${risco}</span><span class="kpi-rotulo">Comportamentos de risco</span></div>
      <div class="kpi"><span class="kpi-valor">${concluidas.filter((o) => o.data.feedbackRealizado === 'Sim').length}</span><span class="kpi-rotulo">Com feedback</span></div>
    </div>
    <p class="hint">Observe a tarefa por alguns minutos, marque o que viu, depois converse com a equipe: reconheça o que foi feito com segurança e combine a correção do que foi de risco. O nome do observado não é registrado.</p>
    <ul class="insp-list">
      ${lista.length ? lista.map((o) => {
        const k = indiceSeguro(o);
        const s = o.completo && o.syncStatus !== 'synced' ? statusLabel(o) : null;
        return `<li class="insp-card" data-id="${o.id}">
          <div class="insp-card-main">
            <div class="insp-card-title">${escapeHtml(o.data.atividade || 'Atividade não informada')}</div>
            <div class="insp-card-sub">${escapeHtml([o.data.empresa, o.data.area].filter(Boolean).join(' · '))}</div>
            <div class="insp-card-sub">${formatarDataBR(o.data.data)} ${escapeHtml(o.data.hora)} · ${escapeHtml(o.data.observador || '')}</div>
          </div>
          <div class="insp-card-side">
            ${o.completo ? `<span class="badge ${k.pct === null ? 'badge-rascunho' : k.pct >= 90 ? 'badge-ok' : k.pct >= 75 ? 'badge-pendente' : 'badge-erro'}">${k.pct === null ? '—' : k.pct + '% seguro'}</span>` : '<span class="badge badge-rascunho">Rascunho</span>'}
            ${s ? `<span class="badge ${s.cls}">${s.text}</span>` : ''}
          </div>
        </li>`;
      }).join('') : '<li class="empty-state">Nenhuma observação registrada ainda.</li>'}
    </ul>
  `;
  document.getElementById('btn-nova-obs').addEventListener('click', async () => {
    const o = novaObservacaoVazia();
    const anteriores = await DB.getAllItems('observacoes');
    if (anteriores.length) { o.data.empresa = anteriores[0].data.empresa; o.data.observador = anteriores[0].data.observador; }
    await salvarObservacao(o);
    renderObservacaoForm(o.id);
  });
  view.querySelectorAll('.insp-card').forEach((el) => el.addEventListener('click', async () => {
    const o = await DB.getItem('observacoes', el.dataset.id);
    if (o.completo) renderObservacaoDetail(o.id); else renderObservacaoForm(o.id);
  }));
}

/* ---------------- FORMULÁRIO ---------------- */

async function renderObservacaoForm(id) {
  state.screen = 'observacao-form';
  state.observacaoId = id;
  const o = await DB.getItem('observacoes', id);
  const d = o.data;
  const blocos = CATEGORIAS_OBSERVACAO.map((c) => `
    <div class="obs-categoria">
      <h3>${escapeHtml(c.nome)}</h3>
      ${d.itens.filter((i) => i.categoria === c.nome).map((i) => `
        <div class="obs-item" data-item="${i.id}">
          <p>${escapeHtml(i.texto)}</p>
          <div class="radio-group">
            ${RESULTADOS_OBS.map((r) => `<label class="radio-pill ${r === 'Seguro' ? 'radio-ok' : r === 'De risco' ? 'radio-nc' : 'radio-na'}"><input type="radio" name="r-${i.id}" value="${r}" ${i.resultado === r ? 'checked' : ''}> ${r}</label>`).join('')}
          </div>
        </div>`).join('')}
    </div>`).join('');

  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-obs" class="btn-link">← Voltar</button>
      <h1>Observação comportamental</h1>
    </div>
    <form id="form-obs" class="form-section">
      <div class="participante-linha">
        <label class="campo-leitura">Data *<input type="date" name="data" required value="${escapeHtml(d.data)}"></label>
        <label class="campo-leitura">Hora<input type="time" name="hora" value="${escapeHtml(d.hora)}"></label>
      </div>
      <label>Empresa / contratada<input type="text" name="empresa" value="${escapeHtml(d.empresa)}"></label>
      <label>Área / setor *<input type="text" name="area" required value="${escapeHtml(d.area)}"></label>
      <label>Atividade observada *<input type="text" name="atividade" required placeholder="Ex.: troca de pneu de caminhão fora de estrada" value="${escapeHtml(d.atividade)}"></label>
      <div class="participante-linha">
        <label class="campo-leitura">Observador *<input type="text" name="observador" required value="${escapeHtml(d.observador)}"></label>
        <label class="campo-leitura">Nº de pessoas observadas<input type="number" min="1" name="numObservados" value="${escapeHtml(d.numObservados)}"></label>
      </div>
      ${blocos}
      <label>Comportamentos de risco observados (descreva)
        <textarea name="comportamentosRisco" rows="2">${escapeHtml(d.comportamentosRisco)}</textarea>
      </label>
      <label>Reconhecimento (o que foi feito com segurança e foi elogiado)
        <textarea name="reconhecimento" rows="2">${escapeHtml(d.reconhecimento)}</textarea>
      </label>
      <label>Houve conversa de feedback com a equipe? *
        <select name="feedbackRealizado" required>
          <option value="" ${!d.feedbackRealizado ? 'selected' : ''} disabled>Selecione…</option>
          <option ${d.feedbackRealizado === 'Sim' ? 'selected' : ''}>Sim</option>
          <option ${d.feedbackRealizado === 'Não' ? 'selected' : ''}>Não</option>
        </select>
      </label>
      <label>Compromisso combinado com a equipe
        <textarea name="compromisso" rows="2">${escapeHtml(d.compromisso)}</textarea>
      </label>
      <label>Fotos (sem identificar pessoas)</label>
      <div class="foto-botoes">
        <label class="file-label">📷 Tirar foto<input type="file" accept="image/*" capture="environment" class="input-foto-obs"></label>
        <label class="file-label">🖼️ Da galeria<input type="file" accept="image/*" multiple class="input-foto-obs"></label>
      </div>
      <div class="thumbs" id="thumbs-obs"></div>
      <h3>Ação corretiva (se necessária)</h3>
      <label>O que será feito<textarea name="acaoCorretiva" rows="2">${escapeHtml(d.tratamento.acaoCorretiva)}</textarea></label>
      <div class="participante-linha">
        <label class="campo-leitura">Responsável<input type="text" name="responsavel" value="${escapeHtml(d.tratamento.responsavel)}"></label>
        <label class="campo-leitura">Prazo<input type="date" name="prazo" value="${escapeHtml(d.tratamento.prazo)}"></label>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Concluir observação</button>
      </div>
    </form>
  `;
  const form = document.getElementById('form-obs');
  function coletar() {
    const fd = new FormData(form);
    ['data', 'hora', 'empresa', 'area', 'atividade', 'observador', 'numObservados', 'comportamentosRisco', 'reconhecimento', 'feedbackRealizado', 'compromisso']
      .forEach((k) => { d[k] = (fd.get(k) || '').trim(); });
    d.itens.forEach((i) => { i.resultado = fd.get('r-' + i.id) || ''; });
    d.tratamento.acaoCorretiva = (fd.get('acaoCorretiva') || '').trim();
    d.tratamento.responsavel = (fd.get('responsavel') || '').trim();
    d.tratamento.prazo = fd.get('prazo') || '';
  }
  async function refreshThumbs() {
    const el = document.getElementById('thumbs-obs');
    await renderThumbnails(el, d.fotosIds);
    el.querySelectorAll('.btn-remover-foto').forEach((btn) => btn.addEventListener('click', async () => {
      await DB.deletePhoto(btn.dataset.photoId);
      d.fotosIds = d.fotosIds.filter((x) => x !== btn.dataset.photoId);
      await salvarObservacao(o);
      refreshThumbs();
    }));
  }
  refreshThumbs();
  form.querySelectorAll('.input-foto-obs').forEach((inp) => inp.addEventListener('change', async (e) => {
    if (!e.target.files || !e.target.files.length) return;
    coletar();
    await adicionarFotos(o, d.fotosIds, e.target.files, 'observacao');
    e.target.value = '';
    await salvarObservacao(o);
    refreshThumbs();
  }));
  form.addEventListener('change', () => { coletar(); salvarObservacao(o); });
  document.getElementById('btn-back-obs').addEventListener('click', async () => { coletar(); await salvarObservacao(o); renderObservacoesHome(); });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    coletar();
    const marcados = d.itens.filter((i) => i.resultado).length;
    if (!marcados) { alert('Marque ao menos um comportamento observado.'); return; }
    const k = indiceSeguro(o);
    if (k.risco && !d.comportamentosRisco && !confirm('Há comportamentos de risco marcados, mas a descrição está vazia. Concluir mesmo assim?')) return;
    o.completo = true;
    o.syncStatus = 'pendente';
    o.metaSynced = false;
    await salvarObservacao(o);
    await refreshChrome();
    renderObservacaoDetail(o.id);
    Sync.syncAll().catch(() => {});
  });
}

/* ---------------- DETALHE / RELATÓRIO ---------------- */

async function renderObservacaoDetail(id) {
  state.screen = 'observacao-detail';
  state.observacaoId = id;
  const o = await DB.getItem('observacoes', id);
  if (!o) return renderObservacoesHome();
  const d = o.data;
  const k = indiceSeguro(o);
  const s = statusLabel(o);
  const codigo = `OBS-${(d.data || '').replace(/-/g, '')}-${o.id.split('-')[0].toUpperCase()}`;
  const geradoEm = new Date().toLocaleString('pt-BR');
  const fotosHtml = d.fotosIds.length ? `<div class="rep-fotos-grid">${(await Promise.all(d.fotosIds.map(montarBlocoFoto))).join('')}</div>` : '<p class="rep-hint">Nenhuma foto anexada.</p>';
  const linhas = CATEGORIAS_OBSERVACAO.map((c) => {
    const itens = d.itens.filter((i) => i.categoria === c.nome && i.resultado);
    if (!itens.length) return '';
    return itens.map((i, n) => `<tr>${n === 0 ? `<td rowspan="${itens.length}"><strong>${escapeHtml(c.nome)}</strong></td>` : ''}<td>${escapeHtml(i.texto)}</td><td class="${i.resultado === 'Seguro' ? 'rep-status-ok' : i.resultado === 'De risco' ? 'rep-status-nc' : 'rep-status-na'}">${escapeHtml(i.resultado)}</td></tr>`).join('');
  }).join('');

  view.innerHTML = `
    <div class="screen-header no-print">
      <button id="btn-back-obs" class="btn-link">← Voltar</button>
      <h1>Observação comportamental</h1>
    </div>
    <div class="no-print">
      <span class="badge ${s.cls}">${s.text}</span>
      ${o.syncError ? `<p class="erro-msg">${escapeHtml(o.syncError)}</p>` : ''}
    </div>
    <div class="form-actions no-print" style="margin-bottom:12px;">
      <button id="btn-imprimir-obs" class="btn-primary">Imprimir / Salvar PDF</button>
      <button id="btn-editar-obs" class="btn-secondary">Editar</button>
      <button id="btn-excluir-obs" class="btn-danger">Excluir</button>
    </div>
    <article class="rep-doc">
      <header class="rep-cabecalho">
        <div class="rep-titulo">
          <img src="icons/icon-192.png" alt="" class="rep-logo">
          <div>
            <h2>OBSERVAÇÃO COMPORTAMENTAL</h2>
            <p>${escapeHtml(d.atividade)} — ${k.pct === null ? 'sem itens avaliados' : k.pct + '% de comportamento seguro'}</p>
          </div>
        </div>
        <table class="rep-controle">
          <tr><th>Código</th><td>${codigo}</td></tr>
          <tr><th>Revisão</th><td>00</td></tr>
          <tr><th>Emitido em</th><td>${geradoEm}</td></tr>
        </table>
      </header>
      <section class="rep-secao">
        <h3>1. Identificação</h3>
        <table class="rep-tabela-ident">
          <tr><th>Data</th><td>${formatarDataBR(d.data)} ${escapeHtml(d.hora)}</td><th>Empresa</th><td>${escapeHtml(d.empresa || '—')}</td></tr>
          <tr><th>Área</th><td>${escapeHtml(d.area)}</td><th>Atividade</th><td>${escapeHtml(d.atividade)}</td></tr>
          <tr><th>Observador</th><td>${escapeHtml(d.observador)}</td><th>Pessoas observadas</th><td>${escapeHtml(d.numObservados || '—')}</td></tr>
          <tr><th>Seguros</th><td>${k.seguro}</td><th>De risco</th><td>${k.risco}</td></tr>
        </table>
      </section>
      <section class="rep-secao">
        <h3>2. Comportamentos observados</h3>
        <table class="rep-table"><thead><tr><th>Categoria</th><th>Comportamento</th><th>Resultado</th></tr></thead><tbody>${linhas || '<tr><td colspan="3">—</td></tr>'}</tbody></table>
      </section>
      <section class="rep-secao">
        <h3>3. Feedback à equipe</h3>
        <table class="rep-tabela-ident">
          <tr><th>Comportamentos de risco</th><td>${escapeHtml(d.comportamentosRisco || '—')}</td></tr>
          <tr><th>Reconhecimento</th><td>${escapeHtml(d.reconhecimento || '—')}</td></tr>
          <tr><th>Feedback realizado</th><td>${escapeHtml(d.feedbackRealizado || '—')}</td></tr>
          <tr><th>Compromisso</th><td>${escapeHtml(d.compromisso || '—')}</td></tr>
          <tr><th>Ação corretiva</th><td>${escapeHtml(d.tratamento.acaoCorretiva || '—')}${d.tratamento.responsavel ? ' — ' + escapeHtml(d.tratamento.responsavel) : ''}${d.tratamento.prazo ? ' — até ' + formatarDataBR(d.tratamento.prazo) : ''}</td></tr>
        </table>
      </section>
      <section class="rep-secao">
        <h3>4. Registro fotográfico</h3>
        ${fotosHtml}
      </section>
      <footer class="rep-rodape">Documento ${codigo} — gerado automaticamente pelo aplicativo Inspeções SSMA em ${geradoEm}.</footer>
    </article>
  `;
  document.getElementById('btn-back-obs').addEventListener('click', renderObservacoesHome);
  document.getElementById('btn-imprimir-obs').addEventListener('click', () => window.print());
  document.getElementById('btn-editar-obs').addEventListener('click', async () => {
    o.completo = false; o.metaSynced = false; o.syncStatus = 'pendente';
    await salvarObservacao(o);
    renderObservacaoForm(o.id);
  });
  document.getElementById('btn-excluir-obs').addEventListener('click', async () => {
    if (!confirm('Excluir esta observação e suas fotos?')) return;
    for (const pid of d.fotosIds) await DB.deletePhoto(pid);
    await DB.deleteItem('observacoes', o.id);
    updateSyncBar();
    renderObservacoesHome();
  });
}
