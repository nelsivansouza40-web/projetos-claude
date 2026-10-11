/* Módulo de Relatos: quase acidente, condição insegura, comportamento de
 * risco e sugestão de melhoria. Feito para ser rápido no campo (uma tela só)
 * e aceitar relato anônimo. O tratamento (ação corretiva, responsável,
 * prazo e status) pode ser preenchido depois, pela equipe de SST, e entra
 * automaticamente na Central de ações. */

const TIPOS_RELATO = ['Quase acidente', 'Condição insegura', 'Comportamento de risco', 'Sugestão de melhoria'];
const POTENCIAIS_RELATO = ['Baixo', 'Médio', 'Alto'];
const STATUS_ACAO = ['Pendente', 'Em andamento', 'Concluída'];

function novoRelatoVazio() {
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
      tipo: TIPOS_RELATO[0],
      data: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      hora: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      empresa: '',
      area: '',
      local: '',
      descricao: '',
      potencial: POTENCIAIS_RELATO[1],
      acaoImediata: '',
      fotosIds: [],
      anonimo: false,
      relator: '',
      funcaoRelator: '',
      tratamento: {
        analise: '',
        acaoCorretiva: '',
        responsavel: '',
        prazo: '',
        status: 'Pendente'
      },
      localizacao: null
    }
  };
}

async function salvarRascunhoRelato(r) {
  r.updatedAt = Date.now();
  await DB.putRelato(r);
}

function classePotencialRelato(p) {
  if (p === 'Alto') return 'badge-erro';
  if (p === 'Médio') return 'badge-pendente';
  return 'badge-ok';
}

function situacaoTratamentoRelato(r) {
  const t = r.data.tratamento;
  if (t.status === 'Concluída') return { text: 'Encerrado', cls: 'badge-ok' };
  if (t.acaoCorretiva) return { text: 'Em tratamento', cls: 'badge-sync' };
  return { text: 'Aguardando tratamento', cls: 'badge-pendente' };
}

/* ---------------- HOME ---------------- */

async function renderRelatosHome() {
  state.screen = 'relatos-home';
  setActiveTab('relatos');
  const registros = await DB.getAllRelatos();
  const filtro = state.filtroRelatos || 'Todos';
  const visiveis = filtro === 'Todos' ? registros : registros.filter((r) => r.data.tipo === filtro);

  const contagem = (tipo) => registros.filter((r) => r.data.tipo === tipo).length;
  const chips = ['Todos', ...TIPOS_RELATO].map((t) => `
    <button type="button" class="chip-filtro ${t === filtro ? 'ativo' : ''}" data-filtro="${escapeHtml(t)}">
      ${escapeHtml(t)} <span>${t === 'Todos' ? registros.length : contagem(t)}</span>
    </button>`).join('');

  const itemsHtml = visiveis.length
    ? visiveis.map((r) => {
        const s = r.completo ? situacaoTratamentoRelato(r) : statusLabel(r);
        const d = r.data;
        return `
          <li class="insp-card" data-id="${r.id}">
            <div class="insp-card-main">
              <div class="insp-card-title">${escapeHtml(d.tipo)} — ${escapeHtml(d.local || d.area || 'sem local')}</div>
              <div class="insp-card-sub">${escapeHtml(resumirTexto(d.descricao, 90))}</div>
              <div class="insp-card-sub">${formatarDataBR(d.data)} ${escapeHtml(d.hora)} · ${d.anonimo ? 'Anônimo' : escapeHtml(d.relator || '—')}</div>
            </div>
            <div class="insp-card-side">
              <span class="badge ${classePotencialRelato(d.potencial)}">Potencial ${escapeHtml(d.potencial)}</span>
              <span class="badge ${s.cls}">${s.text}</span>
              ${r.completo && r.syncStatus !== 'synced' ? `<span class="badge ${statusLabel(r).cls}">${statusLabel(r).text}</span>` : ''}
              <button type="button" class="btn-excluir-card" data-id="${r.id}" title="Excluir">🗑</button>
            </div>
          </li>
        `;
      }).join('')
    : `<li class="empty-state">${registros.length ? 'Nenhum relato deste tipo.' : 'Nenhum relato registrado ainda. Toque em "Novo relato" para registrar um quase acidente ou uma condição insegura.'}</li>`;

  view.innerHTML = `
    <div class="screen-header">
      <h1>Relatos de segurança</h1>
      <button id="btn-new-relato" class="btn-primary">+ Novo relato</button>
    </div>
    <p class="hint">Quase acidentes, condições inseguras e comportamentos de risco registrados hoje evitam o acidente de amanhã. O relato pode ser anônimo.</p>
    <div class="chips-filtro">${chips}</div>
    <ul class="insp-list">${itemsHtml}</ul>
  `;

  document.getElementById('btn-new-relato').addEventListener('click', startNewRelato);
  view.querySelectorAll('.chip-filtro').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.filtroRelatos = btn.dataset.filtro;
      renderRelatosHome();
    });
  });
  view.querySelectorAll('.insp-card').forEach((el) => {
    el.addEventListener('click', () => openRelato(el.dataset.id));
  });
  view.querySelectorAll('.btn-excluir-card').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      excluirRelato(btn.dataset.id);
    });
  });
}

function resumirTexto(texto, max) {
  const t = (texto || '').trim();
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

async function excluirRelato(id, depois) {
  const r = await DB.getRelato(id);
  if (!r) return;
  if (!confirm('Excluir este relato e suas fotos do dispositivo? Esta ação não pode ser desfeita.')) return;
  const photos = await DB.getPhotosByInspection(id);
  for (const p of photos) await DB.deletePhoto(p.id);
  await DB.deleteRelato(id);
  (depois || renderRelatosHome)();
  updateSyncBar();
}

async function openRelato(id) {
  const r = await DB.getRelato(id);
  if (!r) return;
  if (!r.completo) {
    state.relatoId = id;
    renderRelatoForm();
  } else {
    renderRelatoDetail(id);
  }
}

async function startNewRelato() {
  const r = novoRelatoVazio();
  // Reaproveita empresa e área do último relato para agilizar no campo.
  const anteriores = await DB.getAllRelatos();
  if (anteriores.length) {
    r.data.empresa = anteriores[0].data.empresa || '';
    r.data.area = anteriores[0].data.area || '';
  }
  await DB.putRelato(r);
  state.relatoId = r.id;
  renderRelatoForm();
  localizacoesPendentes[r.id] = capturarLocalizacao();
}

/* ---------------- FORMULÁRIO ---------------- */

async function renderRelatoForm() {
  state.screen = 'relatos-form';
  const r = await DB.getRelato(state.relatoId);
  const d = r.data;

  const tiposHtml = TIPOS_RELATO.map((t) => `
    <label class="radio-pill radio-tipo-relato"><input type="radio" name="tipo" value="${escapeHtml(t)}" ${d.tipo === t ? 'checked' : ''}> ${escapeHtml(t)}</label>
  `).join('');
  const potHtml = POTENCIAIS_RELATO.map((p) => `
    <label class="radio-pill ${p === 'Alto' ? 'radio-nc' : p === 'Médio' ? 'radio-parcial' : 'radio-ok'}"><input type="radio" name="potencial" value="${p}" ${d.potencial === p ? 'checked' : ''}> ${p}</label>
  `).join('');

  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-relatos" class="btn-link">← Voltar</button>
      <h1>Novo relato</h1>
    </div>
    <form id="form-relato" class="form-section">
      <label>Tipo de relato *</label>
      <div class="radio-group">${tiposHtml}</div>

      <div class="participante-linha">
        <label class="campo-leitura">Data *
          <input type="date" name="data" required value="${escapeHtml(d.data)}">
        </label>
        <label class="campo-leitura">Hora
          <input type="time" name="hora" value="${escapeHtml(d.hora)}">
        </label>
      </div>
      <label>Empresa / Contratada
        <input type="text" name="empresa" value="${escapeHtml(d.empresa)}">
      </label>
      <label>Área / Setor *
        <input type="text" name="area" required value="${escapeHtml(d.area)}">
      </label>
      <label>Local exato (equipamento, frente de serviço, ponto de referência)
        <input type="text" name="local" value="${escapeHtml(d.local)}">
      </label>
      <label>O que aconteceu ou o que foi observado? *
        <textarea name="descricao" rows="4" required placeholder="Descreva de forma objetiva: o que, onde e como.">${escapeHtml(d.descricao)}</textarea>
      </label>

      <label>Potencial de gravidade, se tivesse virado acidente *</label>
      <div class="radio-group">${potHtml}</div>

      <label>Ação imediata tomada no local
        <textarea name="acaoImediata" rows="2" placeholder="Ex.: área isolada, atividade paralisada, supervisor avisado">${escapeHtml(d.acaoImediata)}</textarea>
      </label>

      <label>Fotos</label>
      <div class="foto-botoes">
        <label class="file-label">📷 Tirar foto
          <input type="file" accept="image/*" capture="environment" class="input-foto-relato">
        </label>
        <label class="file-label">🖼️ Da galeria
          <input type="file" accept="image/*" multiple class="input-foto-relato">
        </label>
      </div>
      <div class="thumbs" id="thumbs-relato"></div>

      <label class="checkbox-pill checkbox-anonimo">
        <input type="checkbox" name="anonimo" ${d.anonimo ? 'checked' : ''}> Quero fazer este relato de forma anônima
      </label>
      <div id="campos-relator" ${d.anonimo ? 'hidden' : ''}>
        <label>Seu nome
          <input type="text" name="relator" value="${escapeHtml(d.relator)}">
        </label>
        <label>Função
          <input type="text" name="funcaoRelator" value="${escapeHtml(d.funcaoRelator)}">
        </label>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn-primary">Enviar relato</button>
      </div>
    </form>
    <p class="hint">O relato fica salvo no aparelho mesmo sem internet e é enviado automaticamente quando houver conexão. No relato anônimo, nome e função não são gravados.</p>
  `;

  const form = document.getElementById('form-relato');
  const camposRelator = document.getElementById('campos-relator');

  function coletarCampos() {
    const fd = new FormData(form);
    d.tipo = fd.get('tipo') || d.tipo;
    d.data = fd.get('data') || '';
    d.hora = fd.get('hora') || '';
    d.empresa = (fd.get('empresa') || '').trim();
    d.area = (fd.get('area') || '').trim();
    d.local = (fd.get('local') || '').trim();
    d.descricao = (fd.get('descricao') || '').trim();
    d.potencial = fd.get('potencial') || d.potencial;
    d.acaoImediata = (fd.get('acaoImediata') || '').trim();
    d.anonimo = fd.get('anonimo') === 'on';
    d.relator = d.anonimo ? '' : (fd.get('relator') || '').trim();
    d.funcaoRelator = d.anonimo ? '' : (fd.get('funcaoRelator') || '').trim();
  }

  form.querySelector('input[name="anonimo"]').addEventListener('change', (e) => {
    camposRelator.hidden = e.target.checked;
  });

  document.getElementById('btn-back-relatos').addEventListener('click', async () => {
    coletarCampos();
    await salvarRascunhoRelato(r);
    renderRelatosHome();
  });

  async function refreshThumbs() {
    const el = document.getElementById('thumbs-relato');
    await renderThumbnails(el, d.fotosIds);
    el.querySelectorAll('.btn-remover-foto').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const photoId = btn.dataset.photoId;
        await DB.deletePhoto(photoId);
        d.fotosIds = d.fotosIds.filter((pid) => pid !== photoId);
        await salvarRascunhoRelato(r);
        refreshThumbs();
      });
    });
  }
  refreshThumbs();

  form.querySelectorAll('.input-foto-relato').forEach((input) => {
    input.addEventListener('change', async (e) => {
      if (!e.target.files || !e.target.files.length) return;
      coletarCampos();
      await adicionarFotos(r, d.fotosIds, e.target.files, 'relato');
      e.target.value = '';
      await salvarRascunhoRelato(r);
      refreshThumbs();
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    coletarCampos();
    await aplicarLocalizacaoPendente(r);
    r.completo = true;
    r.syncStatus = 'pendente';
    r.metaSynced = false;
    await salvarRascunhoRelato(r);
    await refreshChrome();
    alert('Relato registrado. Obrigado por contribuir com a prevenção.');
    renderRelatosHome();
    Sync.syncAll().catch(() => {});
  });
}

/* ---------------- DETALHE + TRATAMENTO ---------------- */

async function renderRelatoDetail(id) {
  state.screen = 'relatos-detail';
  state.relatoId = id;
  const r = await DB.getRelato(id);
  if (!r) return renderRelatosHome();
  const d = r.data;
  const t = d.tratamento;
  const s = statusLabel(r);
  const sit = situacaoTratamentoRelato(r);
  const photos = await DB.getPhotosByInspection(id);

  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-relatos" class="btn-link">← Voltar</button>
      <h1>${escapeHtml(d.tipo)}</h1>
    </div>
    <span class="badge ${classePotencialRelato(d.potencial)}">Potencial ${escapeHtml(d.potencial)}</span>
    <span class="badge ${sit.cls}">${sit.text}</span>
    <span class="badge ${s.cls}">${s.text}</span>
    ${r.syncError ? `<p class="erro-msg">${escapeHtml(r.syncError)}</p>` : ''}
    <div class="detail-block">
      <p>${formatarDataBR(d.data)} ${escapeHtml(d.hora)} · ${escapeHtml(d.empresa || '—')} · ${escapeHtml(d.area)}</p>
      ${d.local ? `<p>Local: ${escapeHtml(d.local)}</p>` : ''}
      <p>Relator: ${d.anonimo ? '<strong>Anônimo</strong>' : escapeHtml([d.relator, d.funcaoRelator].filter(Boolean).join(' — ') || '—')}</p>
    </div>
    <h3>Descrição</h3>
    <div class="detail-block"><p>${escapeHtml(d.descricao)}</p></div>
    ${d.acaoImediata ? `<h3>Ação imediata</h3><div class="detail-block"><p>${escapeHtml(d.acaoImediata)}</p></div>` : ''}
    ${photos.length ? `<h3>Fotos</h3><div class="thumbs">${photos.map((p) => `<div class="thumb"><img src="${URL.createObjectURL(p.blob)}" alt="Foto do relato"><span class="thumb-sync ${p.synced ? 'ok' : ''}">${p.synced ? '✓' : '⏳'}</span></div>`).join('')}</div>` : ''}

    <h3>Tratamento (equipe de SST)</h3>
    <form id="form-tratamento" class="form-section">
      <label>Análise / causa provável
        <textarea name="analise" rows="2">${escapeHtml(t.analise)}</textarea>
      </label>
      <label>Ação corretiva ou preventiva
        <textarea name="acaoCorretiva" rows="2">${escapeHtml(t.acaoCorretiva)}</textarea>
      </label>
      <div class="participante-linha">
        <label class="campo-leitura">Responsável
          <input type="text" name="responsavel" value="${escapeHtml(t.responsavel)}">
        </label>
        <label class="campo-leitura">Prazo
          <input type="date" name="prazo" value="${escapeHtml(t.prazo)}">
        </label>
        <label class="campo-leitura">Status
          <select name="status">${STATUS_ACAO.map((st) => `<option ${t.status === st ? 'selected' : ''}>${st}</option>`).join('')}</select>
        </label>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Salvar tratamento</button>
      </div>
    </form>

    <div class="form-actions">
      <button id="btn-relatorio-relato" class="btn-secondary">Gerar relatório (PDF)</button>
      ${r.syncStatus !== 'synced' ? '<button id="btn-sync-one-relato" class="btn-primary">Sincronizar este relato</button>' : ''}
      <button id="btn-excluir-relato" class="btn-danger">Excluir relato</button>
    </div>
  `;

  document.getElementById('btn-back-relatos').addEventListener('click', renderRelatosHome);
  document.getElementById('btn-relatorio-relato').addEventListener('click', () => renderRelatoReport(id));

  document.getElementById('form-tratamento').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    t.analise = (fd.get('analise') || '').trim();
    t.acaoCorretiva = (fd.get('acaoCorretiva') || '').trim();
    t.responsavel = (fd.get('responsavel') || '').trim();
    t.prazo = fd.get('prazo') || '';
    t.status = fd.get('status') || 'Pendente';
    r.metaSynced = false;
    r.syncStatus = 'pendente';
    await salvarRascunhoRelato(r);
    await refreshChrome();
    renderRelatoDetail(id);
    Sync.syncAll().catch(() => {});
  });

  const btnSyncOne = document.getElementById('btn-sync-one-relato');
  if (btnSyncOne) btnSyncOne.addEventListener('click', async () => {
    btnSyncOne.disabled = true;
    btnSyncOne.textContent = 'Sincronizando…';
    try {
      await Sync.syncRelato(id);
    } catch (e) {
      alert('Não foi possível sincronizar agora: ' + e.message);
    }
    renderRelatoDetail(id);
    updateSyncBar();
  });

  document.getElementById('btn-excluir-relato').addEventListener('click', () => excluirRelato(id));
}

/* ---------------- RELATÓRIO ---------------- */

function gerarCodigoDocumentoRelato(r) {
  const data = (r.data.data || '').replace(/-/g, '');
  return `REL-${data || 'SDATA'}-${r.id.split('-')[0].toUpperCase()}`;
}

async function renderRelatoReport(id) {
  state.screen = 'relatos-report';
  const r = await DB.getRelato(id);
  if (!r) return renderRelatosHome();
  const d = r.data;
  const t = d.tratamento;
  const codigo = gerarCodigoDocumentoRelato(r);
  const geradoEm = new Date().toLocaleString('pt-BR');
  const fotosHtml = d.fotosIds.length
    ? `<div class="rep-fotos-grid">${(await Promise.all(d.fotosIds.map(montarBlocoFoto))).join('')}</div>`
    : '<p class="rep-hint">Nenhuma foto anexada.</p>';

  view.innerHTML = `
    <div class="screen-header no-print">
      <button id="btn-back-relato-detail" class="btn-link">← Voltar</button>
      <h1>Relatório do relato</h1>
    </div>
    <div class="form-actions no-print" style="margin-bottom:12px;">
      <button id="btn-imprimir-relato" class="btn-primary">Imprimir / Salvar PDF</button>
    </div>

    <article class="rep-doc">
      <header class="rep-cabecalho">
        <div class="rep-titulo">
          <img src="icons/icon-192.png" alt="" class="rep-logo">
          <div>
            <h2>RELATO DE SEGURANÇA</h2>
            <p>${escapeHtml(d.tipo)} — potencial ${escapeHtml(d.potencial.toLowerCase())}</p>
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
          <tr><th>Tipo</th><td>${escapeHtml(d.tipo)}</td><th>Potencial</th><td>${escapeHtml(d.potencial)}</td></tr>
          <tr><th>Data</th><td>${formatarDataBR(d.data)}</td><th>Hora</th><td>${escapeHtml(d.hora || '—')}</td></tr>
          <tr><th>Empresa</th><td>${escapeHtml(d.empresa || '—')}</td><th>Área / Setor</th><td>${escapeHtml(d.area)}</td></tr>
          <tr><th>Local</th><td>${escapeHtml(d.local || '—')}</td><th>Relator</th><td>${d.anonimo ? 'Anônimo' : escapeHtml([d.relator, d.funcaoRelator].filter(Boolean).join(' — ') || '—')}</td></tr>
        </table>
        ${montarLocalizacaoRelatorio(d.localizacao)}
      </section>

      <section class="rep-secao">
        <h3>2. Descrição</h3>
        <p class="rep-parecer">${escapeHtml(d.descricao)}</p>
        ${d.acaoImediata ? `<p><strong>Ação imediata:</strong> ${escapeHtml(d.acaoImediata)}</p>` : ''}
      </section>

      <section class="rep-secao">
        <h3>3. Tratamento</h3>
        <table class="rep-tabela-ident">
          <tr><th>Análise</th><td colspan="3">${escapeHtml(t.analise || '—')}</td></tr>
          <tr><th>Ação corretiva</th><td colspan="3">${escapeHtml(t.acaoCorretiva || '—')}</td></tr>
          <tr><th>Responsável</th><td>${escapeHtml(t.responsavel || '—')}</td><th>Prazo</th><td>${t.prazo ? formatarDataBR(t.prazo) : '—'}</td></tr>
          <tr><th>Status</th><td colspan="3">${escapeHtml(t.status)}</td></tr>
        </table>
      </section>

      <section class="rep-secao rep-quebra">
        <h3>4. Registro fotográfico</h3>
        ${fotosHtml}
      </section>

      <footer class="rep-rodape">
        Documento ${codigo} — gerado automaticamente pelo aplicativo Inspeções SSMA em ${geradoEm}.
      </footer>
    </article>
  `;

  document.getElementById('btn-back-relato-detail').addEventListener('click', () => renderRelatoDetail(id));
  document.getElementById('btn-imprimir-relato').addEventListener('click', () => window.print());
}
