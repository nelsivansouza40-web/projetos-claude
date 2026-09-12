/* Configurações: perfil local, matriz de risco e endereço de sincronização. */

async function renderConfig() {
  state.screen = 'config';
  SCREEN_RENDERERS.config = renderConfig;
  const perfil = await getPerfilAtual();
  const endpoint = (await Sync.getEndpoint()) || '';
  const matriz = await getMatrizRisco();

  view.innerHTML = `
    ${menuTopo(state.orgId)}
    <div class="screen-header"><button id="btn-voltar" class="btn-link">← Voltar</button><h1>Configurações</h1></div>

    <div class="form-section">
      <h3>Perfil local</h3>
      <p class="hint">Usado para identificar quem fez cada avaliação (trilha de auditoria). Não é um login com senha — o app é local ao dispositivo.</p>
      <label>Nome<input type="text" id="input-nome" value="${escapeHtml(perfil.nome)}"></label>
      <label>Papel
        <select id="select-papel">
          ${['Avaliador ergonômico', 'Responsável pelo PGR', 'Responsável técnico', 'Gestor', 'Médico do trabalho', 'CIPA', 'Auditor (somente leitura)']
            .map((p) => `<option ${perfil.papel === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
      </label>
      <button id="btn-salvar-perfil" class="btn-primary">Salvar perfil</button>
    </div>

    <div class="form-section">
      <h3>Matriz de risco</h3>
      <p class="hint">Classificação = peso da severidade × peso da probabilidade, comparado às faixas abaixo.</p>
      <h4>Severidades</h4>
      <div id="lista-severidades"></div>
      <h4>Probabilidades</h4>
      <div id="lista-probabilidades"></div>
      <h4>Faixas de classificação</h4>
      <div id="lista-faixas"></div>
      <button id="btn-salvar-matriz" class="btn-primary">Salvar matriz</button>
      <button id="btn-restaurar-matriz" class="btn-secondary">Restaurar padrão</button>
    </div>

    <div class="form-section">
      <h3>Sincronização</h3>
      <label>Endereço de sincronização (Google Apps Script Web App)<input type="url" id="input-endpoint" value="${escapeHtml(endpoint)}"></label>
      <button id="btn-salvar-endpoint" class="btn-primary">Salvar</button>
      <button id="btn-testar-endpoint" class="btn-secondary">Testar conexão</button>
      <p id="teste-resultado"></p>
    </div>`;
  ligarMenuTopo();
  document.getElementById('btn-voltar').addEventListener('click', () => state.orgId ? renderOrgPainel(state.orgId) : renderHome());

  document.getElementById('btn-salvar-perfil').addEventListener('click', async () => {
    await DB.setSetting('perfilAtual', { nome: document.getElementById('input-nome').value.trim(), papel: document.getElementById('select-papel').value });
    alert('Perfil salvo.');
  });

  renderListaEditavel('lista-severidades', matriz.severidades, 'nivel', 'peso');
  renderListaEditavel('lista-probabilidades', matriz.probabilidades, 'nivel', 'peso');
  renderListaFaixas('lista-faixas', matriz.faixas);

  document.getElementById('btn-salvar-matriz').addEventListener('click', async () => {
    const nova = {
      severidades: lerListaEditavel('lista-severidades'),
      probabilidades: lerListaEditavel('lista-probabilidades'),
      faixas: lerListaFaixas('lista-faixas')
    };
    await DB.setSetting('matrizRisco', nova);
    alert('Matriz de risco salva.');
  });
  document.getElementById('btn-restaurar-matriz').addEventListener('click', async () => {
    if (!confirm('Restaurar a matriz de risco padrão?')) return;
    await DB.setSetting('matrizRisco', MATRIZ_PADRAO);
    renderConfig();
  });

  document.getElementById('btn-salvar-endpoint').addEventListener('click', async () => {
    await Sync.setEndpoint(document.getElementById('input-endpoint').value.trim());
    document.getElementById('teste-resultado').textContent = 'Endereço salvo.';
  });
  document.getElementById('btn-testar-endpoint').addEventListener('click', async () => {
    const url = document.getElementById('input-endpoint').value.trim();
    const res = document.getElementById('teste-resultado');
    if (!url) { res.textContent = 'Informe um endereço.'; return; }
    if (!navigator.onLine) { res.textContent = 'Sem conexão no momento.'; return; }
    res.textContent = 'Testando…';
    try {
      const r = await postJson(url, { action: 'ping' });
      res.textContent = r && r.ok ? 'Conexão bem-sucedida.' : 'Erro: ' + (r && r.error);
    } catch (e) { res.textContent = 'Falha ao conectar: ' + e.message; }
  });
}

function renderListaEditavel(elId, itens, campoNome, campoPeso) {
  const el = document.getElementById(elId);
  el.innerHTML = itens.map((it, i) => `
    <div class="linha-editavel" data-i="${i}">
      <input type="text" class="edt-nome" value="${escapeHtml(it[campoNome])}">
      <input type="number" class="edt-peso" value="${it[campoPeso]}" style="width:70px">
      <button type="button" class="btn-link btn-del-linha">✕</button>
    </div>`).join('') + `<button type="button" class="btn-link btn-add-linha" data-target="${elId}">+ adicionar nível</button>`;
  el.querySelectorAll('.btn-del-linha').forEach((b) => b.addEventListener('click', () => b.closest('.linha-editavel').remove()));
  el.querySelector('.btn-add-linha').addEventListener('click', () => {
    const div = document.createElement('div');
    div.className = 'linha-editavel';
    div.innerHTML = `<input type="text" class="edt-nome" value=""><input type="number" class="edt-peso" value="1" style="width:70px"><button type="button" class="btn-link btn-del-linha">✕</button>`;
    div.querySelector('.btn-del-linha').addEventListener('click', () => div.remove());
    el.querySelector('.btn-add-linha').insertAdjacentElement('beforebegin', div);
  });
}
function lerListaEditavel(elId) {
  return Array.from(document.querySelectorAll(`#${elId} .linha-editavel`)).map((div) => ({
    nivel: div.querySelector('.edt-nome').value.trim(), peso: Number(div.querySelector('.edt-peso').value)
  })).filter((x) => x.nivel);
}
function renderListaFaixas(elId, faixas) {
  const el = document.getElementById(elId);
  el.innerHTML = faixas.map((f) => `
    <div class="linha-editavel">
      <input type="number" class="edt-min" value="${f.min}" style="width:60px"> a
      <input type="number" class="edt-max" value="${f.max}" style="width:60px">
      <input type="text" class="edt-classif" value="${escapeHtml(f.classificacao)}">
      <input type="color" class="edt-cor" value="${f.cor}">
    </div>`).join('');
}
function lerListaFaixas(elId) {
  return Array.from(document.querySelectorAll(`#${elId} .linha-editavel`)).map((div) => ({
    min: Number(div.querySelector('.edt-min').value), max: Number(div.querySelector('.edt-max').value),
    classificacao: div.querySelector('.edt-classif').value.trim(), cor: div.querySelector('.edt-cor').value
  }));
}

async function renderAuditoria() {
  state.screen = 'auditoria';
  SCREEN_RENDERERS.auditoria = renderAuditoria;
  const registros = (await DB.auditoria.getAll()).sort((a, b) => b.timestamp - a.timestamp).slice(0, 300);
  view.innerHTML = `
    ${menuTopo(state.orgId)}
    <div class="screen-header"><button id="btn-voltar" class="btn-link">← Voltar</button><h1>Trilha de auditoria</h1></div>
    <table class="rep-table">
      <thead><tr><th>Data/hora</th><th>Usuário</th><th>Entidade</th><th>Ação</th><th>Detalhes</th></tr></thead>
      <tbody>${registros.length ? registros.map((r) => `
        <tr><td>${fmtDataHora(r.timestamp)}</td><td>${escapeHtml(r.usuario)}${r.papel ? ` (${escapeHtml(r.papel)})` : ''}</td><td>${escapeHtml(r.entidade)}</td><td>${escapeHtml(r.acao)}</td><td>${escapeHtml(r.detalhes)}</td></tr>
      `).join('') : '<tr><td colspan="5" class="empty-state">Sem registros.</td></tr>'}</tbody>
    </table>`;
  ligarMenuTopo();
  document.getElementById('btn-voltar').addEventListener('click', () => state.orgId ? renderOrgPainel(state.orgId) : renderHome());
}
