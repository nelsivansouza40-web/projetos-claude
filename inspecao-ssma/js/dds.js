/* Módulo DDS (Diálogo Diário de Segurança). Segue os mesmos padrões do
 * módulo de Inspeções: offline-first (IndexedDB), sincronização automática,
 * evidência fotográfica com câmera/galeria e assinatura digital — aqui
 * aplicada a cada participante da lista de presença. */

function novaDDSVazia() {
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
      identificacao: {
        data: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
        hora: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
        empresa: '',
        unidade: '',
        area: '',
        ministrante: ''
      },
      tema: '',
      conteudo: '',
      duracaoMinutos: '',
      observacoes: '',
      fotosIds: [],
      participantes: []
    }
  };
}

function novoParticipante(nome) {
  return { id: uuid(), nome: nome || '', funcao: '', assinatura: '' };
}

async function salvarRascunhoDDS(dds) {
  dds.updatedAt = Date.now();
  await DB.putDDS(dds);
}

/* ---------------- HOME DO MÓDULO DDS ---------------- */

async function renderDDSHome() {
  state.screen = 'dds-home';
  setActiveTab('dds');
  const registros = await DB.getAllDDS();

  const itemsHtml = registros.length
    ? registros.map((d) => {
        const s = statusLabel(d);
        const ident = d.data.identificacao;
        return `
          <li class="insp-card" data-id="${d.id}">
            <div class="insp-card-main">
              <div class="insp-card-title">${escapeHtml(d.data.tema || 'DDS sem tema')}</div>
              <div class="insp-card-sub">${escapeHtml(ident.empresa || '')} · ${escapeHtml(ident.area || '')}</div>
              <div class="insp-card-sub">${escapeHtml(ident.data || '')} ${escapeHtml(ident.hora || '')} · ${d.data.participantes.length} participante(s)</div>
            </div>
            <div class="insp-card-side">
              <span class="badge ${s.cls}">${s.text}</span>
              <button type="button" class="btn-excluir-card" data-id="${d.id}" title="Excluir">🗑</button>
            </div>
          </li>
        `;
      }).join('')
    : '<li class="empty-state">Nenhum DDS registrado ainda. Toque em "Novo DDS" para começar.</li>';

  view.innerHTML = `
    <div class="screen-header">
      <h1>DDS — Diálogo Diário de Segurança</h1>
      <button id="btn-new-dds" class="btn-primary">+ Novo DDS</button>
    </div>
    <ul class="insp-list">${itemsHtml}</ul>
  `;

  document.getElementById('btn-new-dds').addEventListener('click', startNewDDS);
  view.querySelectorAll('.insp-card').forEach((el) => {
    el.addEventListener('click', () => openDDS(el.dataset.id));
  });
  view.querySelectorAll('.btn-excluir-card').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      excluirDDS(btn.dataset.id);
    });
  });
}

async function excluirDDS(id) {
  const dds = await DB.getDDS(id);
  if (!dds) return;
  const rotulo = dds.completo ? 'este DDS' : 'este rascunho de DDS';
  if (!confirm(`Excluir ${rotulo} e todas as suas fotos do dispositivo? Esta ação não pode ser desfeita.`)) return;
  const photos = await DB.getPhotosByInspection(id);
  for (const p of photos) await DB.deletePhoto(p.id);
  await DB.deleteDDS(id);
  renderDDSHome();
  updateSyncBar();
}

async function openDDS(id) {
  const dds = await DB.getDDS(id);
  if (!dds.completo) {
    state.ddsId = id;
    renderDDSForm();
  } else {
    renderDDSDetail(id);
  }
}

async function startNewDDS() {
  const dds = novaDDSVazia();
  await DB.putDDS(dds);
  state.ddsId = dds.id;
  renderDDSForm();
}

/* ---------------- FORMULÁRIO ---------------- */

async function renderDDSForm() {
  state.screen = 'dds-form';
  const dds = await DB.getDDS(state.ddsId);
  const id = dds.data.identificacao;

  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-dds-home" class="btn-link">← Voltar</button>
      <h1>${escapeHtml(dds.data.tema || 'Novo DDS')}</h1>
    </div>
    <form id="form-dds" class="form-section">
      <label>Data *
        <input type="date" name="data" required value="${escapeHtml(id.data)}">
      </label>
      <label>Hora *
        <input type="time" name="hora" required value="${escapeHtml(id.hora)}">
      </label>
      <label>Empresa / Contratada *
        <input type="text" name="empresa" required value="${escapeHtml(id.empresa)}">
      </label>
      <label>Unidade / Projeto / Contrato
        <input type="text" name="unidade" value="${escapeHtml(id.unidade)}">
      </label>
      <label>Área / Setor / Frente de serviço *
        <input type="text" name="area" required value="${escapeHtml(id.area)}">
      </label>
      <label>Ministrante (responsável pelo DDS) *
        <input type="text" name="ministrante" required value="${escapeHtml(id.ministrante)}">
      </label>
      <label>Tema do DDS *
        <input type="text" name="tema" required value="${escapeHtml(dds.data.tema)}">
      </label>
      <label>Conteúdo abordado *
        <textarea name="conteudo" rows="4" required>${escapeHtml(dds.data.conteudo)}</textarea>
      </label>
      <label>Duração (minutos)
        <input type="number" name="duracaoMinutos" min="1" value="${escapeHtml(dds.data.duracaoMinutos)}">
      </label>

      <label>Evidência fotográfica</label>
      <div class="foto-botoes">
        <label class="file-label">📷 Tirar foto
          <input type="file" accept="image/*" capture="environment" id="input-foto-dds-camera">
        </label>
        <label class="file-label">🖼️ Da galeria
          <input type="file" accept="image/*" multiple id="input-foto-dds-galeria">
        </label>
      </div>
      <div class="thumbs" id="thumbs-dds"></div>

      <label>Observações finais
        <textarea name="observacoes" rows="2">${escapeHtml(dds.data.observacoes)}</textarea>
      </label>

      <div class="lista-participantes">
        <h3>Participantes / Lista de presença</h3>
        <div id="participantes-container"></div>
        <button type="button" id="btn-add-participante" class="btn-secondary">+ Adicionar participante</button>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn-primary">Concluir e salvar</button>
      </div>
    </form>
    <p class="hint">O registro fica salvo no aparelho mesmo sem internet. Assim que houver conexão, é enviado automaticamente.</p>
  `;

  const form = document.getElementById('form-dds');

  function coletarCampos() {
    const fd = new FormData(form);
    dds.data.identificacao.data = fd.get('data') || '';
    dds.data.identificacao.hora = fd.get('hora') || '';
    dds.data.identificacao.empresa = (fd.get('empresa') || '').trim();
    dds.data.identificacao.unidade = (fd.get('unidade') || '').trim();
    dds.data.identificacao.area = (fd.get('area') || '').trim();
    dds.data.identificacao.ministrante = (fd.get('ministrante') || '').trim();
    dds.data.tema = (fd.get('tema') || '').trim();
    dds.data.conteudo = (fd.get('conteudo') || '').trim();
    dds.data.duracaoMinutos = fd.get('duracaoMinutos') || '';
    dds.data.observacoes = (fd.get('observacoes') || '').trim();
  }

  document.getElementById('btn-back-dds-home').addEventListener('click', async () => {
    coletarCampos();
    await salvarRascunhoDDS(dds);
    renderDDSHome();
  });

  async function refreshThumbsDDS() {
    const el = document.getElementById('thumbs-dds');
    await renderThumbnails(el, dds.data.fotosIds);
    el.querySelectorAll('.btn-remover-foto').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const photoId = btn.dataset.photoId;
        await DB.deletePhoto(photoId);
        dds.data.fotosIds = dds.data.fotosIds.filter((pid) => pid !== photoId);
        await salvarRascunhoDDS(dds);
        refreshThumbsDDS();
      });
    });
  }
  refreshThumbsDDS();

  ['input-foto-dds-camera', 'input-foto-dds-galeria'].forEach((elId) => {
    document.getElementById(elId).addEventListener('change', async (e) => {
      await adicionarFotos(dds, dds.data.fotosIds, e.target.files, 'dds');
      await salvarRascunhoDDS(dds);
      refreshThumbsDDS();
    });
  });

  const participantesContainer = document.getElementById('participantes-container');
  renderParticipantes(participantesContainer, dds);

  document.getElementById('btn-add-participante').addEventListener('click', async () => {
    const nome = prompt('Nome completo do participante:');
    if (!nome || !nome.trim()) return;
    dds.data.participantes.push(novoParticipante(nome.trim()));
    await salvarRascunhoDDS(dds);
    renderParticipantes(participantesContainer, dds);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    coletarCampos();
    if (dds.data.participantes.length === 0 &&
        !confirm('Nenhum participante foi adicionado à lista de presença. Deseja concluir mesmo assim?')) {
      return;
    }
    dds.completo = true;
    dds.syncStatus = 'pendente';
    await salvarRascunhoDDS(dds);
    await refreshChrome();
    renderDDSHome();
    Sync.syncAll().catch(() => {});
  });
}

function blocoAssinaturaParticipante(p, idx) {
  return `
    <div class="participante-card" data-idx="${idx}">
      <div class="participante-linha">
        <input type="text" class="txt-participante-nome" placeholder="Nome completo" value="${escapeHtml(p.nome)}">
        <input type="text" class="txt-participante-funcao" placeholder="Função" value="${escapeHtml(p.funcao)}">
        <button type="button" class="btn-remover-item btn-remover-participante" title="Remover participante">✕</button>
      </div>
      <div class="rep-assinatura rep-assinatura-compacta">
        ${p.assinatura
          ? `<img src="${p.assinatura}" class="rep-assinatura-img" alt="Assinatura">`
          : '<div class="rep-linha-assinatura"></div>'}
        <div class="rep-assinatura-controles">
          <button type="button" class="btn-secondary btn-pequeno btn-assinar-participante">${p.assinatura ? 'Assinar novamente' : 'Assinar'}</button>
        </div>
        <div class="rep-assinatura-pad" hidden>
          <canvas class="rep-canvas-assinatura"></canvas>
          <div class="form-actions">
            <button type="button" class="btn-link btn-limpar-pad">Limpar</button>
            <button type="button" class="btn-link btn-cancelar-pad">Cancelar</button>
            <button type="button" class="btn-primary btn-pequeno btn-confirmar-pad">Confirmar</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderParticipantes(container, dds) {
  const lista = dds.data.participantes;
  container.innerHTML = lista.length
    ? lista.map((p, idx) => blocoAssinaturaParticipante(p, idx)).join('')
    : '<p class="empty-state">Nenhum participante adicionado ainda.</p>';

  lista.forEach((p, idx) => {
    const card = container.querySelector(`[data-idx="${idx}"]`);
    if (!card) return;

    card.querySelector('.txt-participante-nome').addEventListener('blur', async (e) => {
      p.nome = e.target.value.trim();
      await salvarRascunhoDDS(dds);
    });
    card.querySelector('.txt-participante-funcao').addEventListener('blur', async (e) => {
      p.funcao = e.target.value.trim();
      await salvarRascunhoDDS(dds);
    });
    card.querySelector('.btn-remover-participante').addEventListener('click', async () => {
      if (!confirm('Remover este participante?')) return;
      dds.data.participantes.splice(idx, 1);
      await salvarRascunhoDDS(dds);
      renderParticipantes(container, dds);
    });

    const btnAssinar = card.querySelector('.btn-assinar-participante');
    const pad = card.querySelector('.rep-assinatura-pad');
    btnAssinar.addEventListener('click', () => {
      pad.hidden = false;
      pad.previousElementSibling.hidden = true;
      iniciarCanvasAssinaturaRelatorio(pad.querySelector('canvas'));
    });
    pad.querySelector('.btn-cancelar-pad').addEventListener('click', () => {
      pad.hidden = true;
      pad.previousElementSibling.hidden = false;
    });
    pad.querySelector('.btn-limpar-pad').addEventListener('click', () => {
      iniciarCanvasAssinaturaRelatorio(pad.querySelector('canvas'));
    });
    pad.querySelector('.btn-confirmar-pad').addEventListener('click', async () => {
      const canvas = pad.querySelector('canvas');
      if (!canvas.dataset.assinado) {
        alert('Desenhe a assinatura no quadro antes de confirmar.');
        return;
      }
      p.assinatura = canvas.toDataURL('image/png');
      await salvarRascunhoDDS(dds);
      renderParticipantes(container, dds);
    });
  });
}

/* ---------------- DETALHE ---------------- */

async function renderDDSDetail(id) {
  state.screen = 'dds-detail';
  state.ddsId = id;
  const dds = await DB.getDDS(id);
  const photos = await DB.getPhotosByInspection(id);
  const s = statusLabel(dds);
  const ident = dds.data.identificacao;

  const participantesHtml = dds.data.participantes.length
    ? `<ul class="lista-presenca">${dds.data.participantes.map((p) => `
        <li>${escapeHtml(p.nome)}${p.funcao ? ' — ' + escapeHtml(p.funcao) : ''}
          <span class="badge ${p.assinatura ? 'badge-ok' : 'badge-pendente'}">${p.assinatura ? 'Assinado' : 'Sem assinatura'}</span>
        </li>
      `).join('')}</ul>`
    : '<p class="empty-state">Nenhum participante registrado.</p>';

  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-dds-home" class="btn-link">← Voltar</button>
      <h1>${escapeHtml(dds.data.tema)}</h1>
    </div>
    <span class="badge ${s.cls}">${s.text}</span>
    ${dds.syncError ? `<p class="erro-msg">${escapeHtml(dds.syncError)}</p>` : ''}
    <div class="detail-block">
      <p>${escapeHtml(ident.empresa)} · ${escapeHtml(ident.unidade)} · ${escapeHtml(ident.area)}</p>
      <p>${escapeHtml(ident.data)} ${escapeHtml(ident.hora)} · Ministrante: ${escapeHtml(ident.ministrante)}</p>
      <p>Duração: ${escapeHtml(dds.data.duracaoMinutos || '—')} min</p>
    </div>
    <h3>Conteúdo abordado</h3>
    <div class="detail-block"><p>${escapeHtml(dds.data.conteudo)}</p></div>
    ${photos.length ? `<h3>Evidência fotográfica</h3><div class="thumbs">${photos.map((p) => `<div class="thumb"><img src="${URL.createObjectURL(p.blob)}"><span class="thumb-sync ${p.synced ? 'ok' : ''}">${p.synced ? '✓' : '⏳'}</span></div>`).join('')}</div>` : ''}
    ${dds.data.observacoes ? `<h3>Observações</h3><div class="detail-block"><p>${escapeHtml(dds.data.observacoes)}</p></div>` : ''}
    <h3>Participantes (${dds.data.participantes.length})</h3>
    ${participantesHtml}
    <div class="form-actions">
      <button id="btn-editar-dds" class="btn-secondary">✏️ Editar DDS</button>
      <button id="btn-relatorio-dds" class="btn-secondary">Gerar relatório (PDF)</button>
    </div>
    <div class="form-actions">
      ${dds.syncStatus !== 'synced' ? '<button id="btn-sync-one-dds" class="btn-primary">Sincronizar este DDS</button>' : ''}
      <button id="btn-excluir-dds" class="btn-danger">Excluir DDS</button>
    </div>
  `;

  document.getElementById('btn-back-dds-home').addEventListener('click', renderDDSHome);
  document.getElementById('btn-relatorio-dds').addEventListener('click', () => renderDDSReport(id));
  document.getElementById('btn-editar-dds').addEventListener('click', async () => {
    dds.metaSynced = false;
    dds.syncStatus = 'pendente';
    await salvarRascunhoDDS(dds);
    state.ddsId = id;
    renderDDSForm();
  });

  const btnSyncOne = document.getElementById('btn-sync-one-dds');
  if (btnSyncOne) btnSyncOne.addEventListener('click', async () => {
    btnSyncOne.disabled = true;
    btnSyncOne.textContent = 'Sincronizando…';
    try {
      await Sync.syncDDS(id);
    } catch (e) {
      alert('Não foi possível sincronizar agora: ' + e.message);
    }
    renderDDSDetail(id);
    updateSyncBar();
  });

  document.getElementById('btn-excluir-dds').addEventListener('click', async () => {
    if (!confirm('Excluir este DDS e todas as suas fotos do dispositivo? Esta ação não pode ser desfeita.')) return;
    for (const p of photos) await DB.deletePhoto(p.id);
    await DB.deleteDDS(id);
    renderDDSHome();
    updateSyncBar();
  });
}

/* ---------------- RELATÓRIO (impressão / PDF) ---------------- */

function gerarCodigoDocumentoDDS(dds) {
  const data = (dds.data.identificacao.data || '').replace(/-/g, '');
  const curto = dds.id.split('-')[0].toUpperCase();
  return `DDS-${data || 'SDATA'}-${curto}`;
}

async function montarFotosDDS(fotosIds) {
  if (!fotosIds || !fotosIds.length) {
    return '<p class="rep-hint">Nenhuma evidência fotográfica anexada.</p>';
  }
  const fotosHtml = (await Promise.all(fotosIds.map(montarBlocoFoto))).join('');
  return `<div class="rep-fotos-grid">${fotosHtml}</div>`;
}

function montarListaPresenca(dds) {
  if (!dds.data.participantes.length) {
    return '<p class="rep-hint">Nenhum participante registrado.</p>';
  }
  const linhas = dds.data.participantes.map((p, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${escapeHtml(p.nome)}</td>
      <td>${escapeHtml(p.funcao || '—')}</td>
      <td class="rep-td-assinatura">${p.assinatura
        ? `<img src="${p.assinatura}" class="rep-assinatura-mini" alt="Assinatura">`
        : '<div class="rep-linha-assinatura-mini"></div>'}</td>
    </tr>
  `).join('');
  return `
    <table class="rep-table rep-table-presenca">
      <thead><tr><th>Nº</th><th>Nome</th><th>Função</th><th>Assinatura</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
  `;
}

async function renderDDSReport(id) {
  state.screen = 'dds-report';
  const dds = await DB.getDDS(id);
  if (!dds) return renderDDSHome();

  const ident = dds.data.identificacao;
  const codigo = gerarCodigoDocumentoDDS(dds);
  const geradoEm = new Date().toLocaleString('pt-BR');
  const fotosHtml = await montarFotosDDS(dds.data.fotosIds);
  const numObs = dds.data.observacoes ? '4' : null;
  const numPresenca = dds.data.observacoes ? '5' : '4';

  view.innerHTML = `
    <div class="screen-header no-print">
      <button id="btn-back-dds-detail" class="btn-link">← Voltar</button>
      <h1>Relatório de DDS</h1>
    </div>
    <div class="form-actions no-print" style="margin-bottom:12px;">
      <button id="btn-imprimir-dds" class="btn-primary">Imprimir / Salvar PDF</button>
    </div>

    <article class="rep-doc">
      <header class="rep-cabecalho">
        <div class="rep-titulo">
          <img src="icons/icon-192.png" alt="" class="rep-logo">
          <div>
            <h2>REGISTRO DE DDS</h2>
            <p>Diálogo Diário de Segurança — ${escapeHtml(dds.data.tema)}</p>
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
          <tr><th>Empresa / Contratada</th><td>${escapeHtml(ident.empresa)}</td><th>Unidade / Projeto</th><td>${escapeHtml(ident.unidade || '—')}</td></tr>
          <tr><th>Área / Setor</th><td>${escapeHtml(ident.area)}</td><th>Ministrante</th><td>${escapeHtml(ident.ministrante)}</td></tr>
          <tr><th>Data</th><td>${formatarDataBR(ident.data)}</td><th>Hora</th><td>${escapeHtml(ident.hora)}</td></tr>
          <tr><th>Duração</th><td colspan="3">${escapeHtml(dds.data.duracaoMinutos || '—')} minuto(s)</td></tr>
        </table>
      </section>

      <section class="rep-secao">
        <h3>2. Conteúdo abordado</h3>
        <p class="rep-parecer">${escapeHtml(dds.data.conteudo)}</p>
      </section>

      <section class="rep-secao rep-quebra">
        <h3>3. Evidência fotográfica</h3>
        ${fotosHtml}
      </section>

      ${numObs ? `
      <section class="rep-secao">
        <h3>${numObs}. Observações finais</h3>
        <p class="rep-parecer">${escapeHtml(dds.data.observacoes)}</p>
      </section>` : ''}

      <section class="rep-secao rep-quebra">
        <h3>${numPresenca}. Lista de presença</h3>
        ${montarListaPresenca(dds)}
      </section>

      <footer class="rep-rodape">
        Documento ${codigo} — gerado automaticamente pelo aplicativo Inspeções SSMA em ${geradoEm}.
      </footer>
    </article>
  `;

  document.getElementById('btn-back-dds-detail').addEventListener('click', () => renderDDSDetail(id));
  document.getElementById('btn-imprimir-dds').addEventListener('click', () => window.print());
}
