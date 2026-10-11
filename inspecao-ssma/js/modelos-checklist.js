/* Checklists da empresa.
 * Além dos checklists padrão do app, o técnico pode montar checklists
 * próprios (ou copiar um padrão e ajustar), salvá-los e usá-los em qualquer
 * inspeção da disciplina correspondente. Os checklists podem ser exportados
 * em arquivo e importados em outros aparelhos da equipe. */

const PREFIXO_MODELO = 'modelo:';

function novoModeloChecklist() {
  return { id: uuid(), createdAt: Date.now(), updatedAt: Date.now(), nome: '', disciplina: 'Segurança', itens: [] };
}

/** Opções do campo "Tipo de inspeção": checklists padrão da disciplina + checklists da empresa. */
function opcoesTiposComModelos(disciplina, selecionado, modelos) {
  const padrao = dadosDisciplina(disciplina).tipos
    .map((t) => `<option value="${escapeHtml(t)}" ${selecionado === t ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('');
  const proprios = (modelos || []).filter((m) => m.disciplina === disciplina);
  return `<option value="" disabled ${!selecionado ? 'selected' : ''}>Selecione…</option>` +
    (proprios.length ? `<optgroup label="Checklists da empresa">${proprios.map((m) =>
      `<option value="${PREFIXO_MODELO}${m.id}" ${selecionado === PREFIXO_MODELO + m.id ? 'selected' : ''}>${escapeHtml(m.nome)}</option>`).join('')}</optgroup>` : '') +
    `<optgroup label="Checklists padrão">${padrao}</optgroup>`;
}

/** Valor do campo de tipo correspondente a uma inspeção (para reabrir o formulário já selecionado). */
function valorTipoDaInspecao(insp) {
  return insp.data.modeloId ? PREFIXO_MODELO + insp.data.modeloId : insp.data.tipoInspecao;
}

/** Aplica o tipo escolhido (padrão ou da empresa) à inspeção, gerando o checklist. */
async function aplicarTipoNaInspecao(insp, valor) {
  if (valor && valor.startsWith(PREFIXO_MODELO)) {
    const modelo = await DB.getItem('modelosChecklist', valor.slice(PREFIXO_MODELO.length));
    if (modelo) {
      insp.data.modeloId = modelo.id;
      insp.data.tipoInspecao = modelo.nome;
      insp.data.checklist = modelo.itens.map((t) => novoItemChecklist(t));
      return;
    }
  }
  insp.data.modeloId = '';
  insp.data.tipoInspecao = valor || '';
  insp.data.checklist = gerarChecklistParaTipo(valor);
}

/* ---------------- LISTA ---------------- */

async function renderModelosHome() {
  state.screen = 'modelos-home';
  setActiveTab('inspecoes');
  const modelos = (await DB.getAllItems('modelosChecklist')).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-home" class="btn-link">← Voltar</button>
      <h1>Checklists da empresa</h1>
    </div>
    <p class="hint">Monte checklists próprios ou copie um padrão e ajuste. Eles aparecem na lista de tipos ao iniciar uma inspeção da mesma disciplina.</p>
    <div class="form-actions acoes-envio">
      <button id="btn-novo-modelo" class="btn-primary">+ Novo checklist</button>
      ${modelos.length ? '<button id="btn-exportar-modelos" class="btn-secondary">Exportar (arquivo)</button>' : ''}
      <label class="btn-secondary file-label">Importar arquivo<input type="file" accept="application/json,.json" id="input-importar-modelos" hidden></label>
    </div>
    <ul class="insp-list">
      ${modelos.length ? modelos.map((m) => `
        <li class="insp-card" data-id="${m.id}">
          <div class="insp-card-main">
            <div class="insp-card-title">${escapeHtml(m.nome)}</div>
            <div class="insp-card-sub">${m.itens.length} item(ns)</div>
          </div>
          <div class="insp-card-side">${seloDisciplina({ data: { disciplina: m.disciplina } })}</div>
        </li>`).join('') : '<li class="empty-state">Nenhum checklist próprio ainda.</li>'}
    </ul>
  `;
  document.getElementById('btn-back-home').addEventListener('click', renderHome);
  document.getElementById('btn-novo-modelo').addEventListener('click', () => renderModeloForm(null));
  view.querySelectorAll('.insp-card').forEach((el) => el.addEventListener('click', () => renderModeloForm(el.dataset.id)));
  const btnExp = document.getElementById('btn-exportar-modelos');
  if (btnExp) btnExp.addEventListener('click', () => {
    const arquivo = new File([JSON.stringify({ tipo: 'checklists-inspecoes-ssma', versao: 1, modelos }, null, 2)],
      `checklists-empresa-${hojeISO()}.json`, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
      navigator.share({ files: [arquivo], title: 'Checklists da empresa' }).catch(() => baixarArquivo(arquivo));
    } else {
      baixarArquivo(arquivo);
    }
  });
  document.getElementById('input-importar-modelos').addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      const dados = JSON.parse(await f.text());
      const lista = Array.isArray(dados) ? dados : dados.modelos;
      if (!Array.isArray(lista)) throw new Error('arquivo sem checklists');
      let n = 0;
      for (const m of lista) {
        if (!m || !m.nome || !Array.isArray(m.itens)) continue;
        await DB.putItem('modelosChecklist', {
          id: m.id || uuid(), createdAt: m.createdAt || Date.now(), updatedAt: Date.now(),
          nome: String(m.nome), disciplina: dadosDisciplina(m.disciplina).id, itens: m.itens.map(String).filter(Boolean)
        });
        n++;
      }
      alert(`${n} checklist(s) importado(s).`);
    } catch (err) {
      alert('Não foi possível importar: ' + err.message);
    }
    renderModelosHome();
  });
}

/* ---------------- CADASTRO ---------------- */

async function renderModeloForm(id, preset) {
  state.screen = 'modelo-form';
  const m = id ? await DB.getItem('modelosChecklist', id) : Object.assign(novoModeloChecklist(), preset || {});
  const discOpts = DISCIPLINAS_INSPECAO.map((d) => `<option value="${escapeHtml(d.id)}" ${m.disciplina === d.id ? 'selected' : ''}>${escapeHtml(d.rotulo)}</option>`).join('');
  const padraoOpts = (disc) => '<option value="">Copiar itens de um checklist padrão…</option>' + dadosDisciplina(disc).tipos
    .filter((t) => (CHECKLISTS[t] || []).length).map((t) => `<option>${escapeHtml(t)}</option>`).join('');

  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-modelo" class="btn-link">← Voltar</button>
      <h1>${id ? 'Editar checklist' : 'Novo checklist'}</h1>
    </div>
    <form id="form-modelo" class="form-section">
      <label>Nome do checklist *
        <input type="text" name="nome" required placeholder="Ex.: Inspeção de britador — Mina X" value="${escapeHtml(m.nome)}">
      </label>
      <label>Disciplina *
        <select name="disciplina">${discOpts}</select>
      </label>
      <label>Ponto de partida
        <select id="sel-copiar">${padraoOpts(m.disciplina)}</select>
      </label>
      <label>Itens do checklist * (um por linha)
        <textarea name="itens" rows="14" required placeholder="Escreva cada pergunta numa linha, de forma que a resposta seja Conforme / Não Conforme / Não se Aplica.">${escapeHtml(m.itens.join('\n'))}</textarea>
      </label>
      <p class="hint" id="contagem-itens"></p>
      <div class="form-actions">
        ${id ? '<button type="button" id="btn-excluir-modelo" class="btn-danger">Excluir</button>' : ''}
        <button type="submit" class="btn-primary">Salvar checklist</button>
      </div>
    </form>
  `;
  const form = document.getElementById('form-modelo');
  const ta = form.querySelector('[name="itens"]');
  const contar = () => {
    document.getElementById('contagem-itens').textContent = `${ta.value.split('\n').map((l) => l.trim()).filter(Boolean).length} item(ns)`;
  };
  ta.addEventListener('input', contar);
  contar();
  form.querySelector('[name="disciplina"]').addEventListener('change', (e) => {
    document.getElementById('sel-copiar').innerHTML = padraoOpts(e.target.value);
  });
  document.getElementById('sel-copiar').addEventListener('change', (e) => {
    const itens = CHECKLISTS[e.target.value] || [];
    if (!itens.length) return;
    if (ta.value.trim() && !confirm('Acrescentar os itens deste checklist aos que já estão escritos?')) return;
    ta.value = [ta.value.trim(), ...itens].filter(Boolean).join('\n');
    if (!form.querySelector('[name="nome"]').value.trim()) form.querySelector('[name="nome"]').value = e.target.value + ' (empresa)';
    e.target.value = '';
    contar();
  });
  document.getElementById('btn-back-modelo').addEventListener('click', renderModelosHome);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    m.nome = (fd.get('nome') || '').trim();
    m.disciplina = fd.get('disciplina');
    m.itens = (fd.get('itens') || '').split('\n').map((l) => l.trim()).filter(Boolean);
    if (!m.itens.length) { alert('Inclua ao menos um item.'); return; }
    m.updatedAt = Date.now();
    await DB.putItem('modelosChecklist', m);
    renderModelosHome();
  });
  const btnEx = document.getElementById('btn-excluir-modelo');
  if (btnEx) btnEx.addEventListener('click', async () => {
    if (!confirm('Excluir este checklist? Inspeções já feitas com ele continuam salvas.')) return;
    await DB.deleteItem('modelosChecklist', m.id);
    renderModelosHome();
  });
}

/** Salva os itens de uma inspeção em andamento como checklist da empresa. */
async function salvarChecklistComoModelo(insp) {
  const nome = prompt('Nome do novo checklist da empresa:', insp.data.tipoInspecao ? insp.data.tipoInspecao + ' (empresa)' : '');
  if (!nome || !nome.trim()) return;
  const m = novoModeloChecklist();
  m.nome = nome.trim();
  m.disciplina = disciplinaDaInspecao(insp);
  m.itens = insp.data.checklist.map((i) => i.texto).filter(Boolean);
  await DB.putItem('modelosChecklist', m);
  alert(`Checklist "${m.nome}" salvo com ${m.itens.length} item(ns). Ele já aparece na lista de tipos das próximas inspeções.`);
}
