/* Módulo Gestão de CIPA (Comissão Interna de Prevenção de Acidentes/de
 * Acidentes e de Assédio). Cobre duas frentes:
 *  - Gestão/mandato: cadastro dos membros (titulares/suplentes, empregador/
 *    empregados) e do período de mandato vigente, com alerta de vencimento.
 *  - Reuniões: atas mensais com pauta padrão, deliberações, lista de
 *    presença com assinatura digital e evidência fotográfica, seguindo os
 *    mesmos padrões já usados nos módulos de Inspeções, DDS e Diagnóstico. */

/* ---------------- GESTÃO / MANDATO ---------------- */

function novoMembroCipa() {
  return { id: uuid(), nome: '', funcao: 'Membro', representacao: 'Empregado', tipo: 'Titular', setor: '' };
}

function novaGestaoCipaVazia() {
  return {
    id: uuid(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    completo: true,
    syncStatus: 'pendente',
    syncError: '',
    metaSynced: false,
    remoteRef: null,
    data: {
      empresa: '',
      unidade: '',
      mandatoInicio: '',
      mandatoFim: '',
      membros: []
    }
  };
}

async function salvarGestaoCipa(gestao) {
  gestao.updatedAt = Date.now();
  await DB.putCipaGestao(gestao);
}

function statusMandatoCipa(gestao) {
  if (!gestao || !gestao.data.mandatoFim) return { text: 'Sem prazo definido', cls: 'badge-rascunho' };
  const hoje = new Date();
  const fim = new Date(gestao.data.mandatoFim + 'T23:59:59');
  const diffDias = Math.ceil((fim - hoje) / (1000 * 60 * 60 * 24));
  if (diffDias < 0) return { text: 'Mandato vencido', cls: 'badge-erro' };
  if (diffDias <= 60) return { text: `Mandato vence em ${diffDias} dia(s)`, cls: 'badge-pendente' };
  return { text: 'Mandato vigente', cls: 'badge-ok' };
}

async function abrirGestaoCipa(gestaoExistente) {
  const gestao = gestaoExistente || novaGestaoCipaVazia();
  if (!gestaoExistente) await DB.putCipaGestao(gestao);
  state.cipaGestaoId = gestao.id;
  renderCipaGestaoForm();
}

async function renderCipaGestaoForm() {
  state.screen = 'cipa-gestao-form';
  const gestao = await DB.getCipaGestao(state.cipaGestaoId);
  const d = gestao.data;

  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-cipa-gestao" class="btn-link">← Voltar</button>
      <h1>Gestão da CIPA</h1>
    </div>
    <form id="form-cipa-gestao" class="form-section">
      <label>Empresa / Contratada
        <input type="text" name="empresa" value="${escapeHtml(d.empresa)}">
      </label>
      <label>Unidade / Projeto
        <input type="text" name="unidade" value="${escapeHtml(d.unidade)}">
      </label>
      <label>Início do mandato
        <input type="date" name="mandatoInicio" value="${escapeHtml(d.mandatoInicio)}">
      </label>
      <label>Fim do mandato
        <input type="date" name="mandatoFim" value="${escapeHtml(d.mandatoFim)}">
      </label>
    </form>

    <div class="lista-participantes">
      <h3>Membros da CIPA</h3>
      <div id="membros-cipa-container"></div>
      <button type="button" id="btn-add-membro-cipa" class="btn-secondary">+ Adicionar membro</button>
    </div>

    <div class="form-actions">
      <button id="btn-salvar-gestao-cipa" class="btn-primary">Salvar</button>
    </div>
    <p class="hint">As alterações ficam salvas no aparelho mesmo sem internet. Ao tocar em "Salvar", o registro também é enviado para a planilha assim que houver conexão.</p>
  `;

  const form = document.getElementById('form-cipa-gestao');
  function coletarCampos() {
    const fd = new FormData(form);
    d.empresa = (fd.get('empresa') || '').trim();
    d.unidade = (fd.get('unidade') || '').trim();
    d.mandatoInicio = fd.get('mandatoInicio') || '';
    d.mandatoFim = fd.get('mandatoFim') || '';
  }

  document.getElementById('btn-back-cipa-gestao').addEventListener('click', async () => {
    coletarCampos();
    await salvarGestaoCipa(gestao);
    renderCipaHome();
  });

  const membrosContainer = document.getElementById('membros-cipa-container');
  renderMembrosCipa(membrosContainer, gestao);

  document.getElementById('btn-add-membro-cipa').addEventListener('click', async () => {
    d.membros.push(novoMembroCipa());
    await salvarGestaoCipa(gestao);
    renderMembrosCipa(membrosContainer, gestao);
  });

  document.getElementById('btn-salvar-gestao-cipa').addEventListener('click', async () => {
    coletarCampos();
    gestao.syncStatus = 'pendente';
    gestao.metaSynced = false;
    await salvarGestaoCipa(gestao);
    await refreshChrome();
    renderCipaHome();
    Sync.syncAll().catch(() => {});
  });
}

function renderMembrosCipa(container, gestao) {
  const membros = gestao.data.membros;
  const FUNCOES = ['Presidente', 'Vice-presidente', 'Secretário', 'Membro'];
  const REPRESENTACOES = ['Empregador', 'Empregado'];
  const TIPOS = ['Titular', 'Suplente'];

  container.innerHTML = membros.length
    ? membros.map((m, idx) => `
        <div class="participante-card" data-idx="${idx}">
          <div class="participante-linha">
            <input type="text" class="txt-membro-nome" placeholder="Nome completo" value="${escapeHtml(m.nome)}">
            <input type="text" class="txt-membro-setor" placeholder="Setor" value="${escapeHtml(m.setor)}">
          </div>
          <div class="participante-linha">
            <select class="sel-membro-funcao">
              ${FUNCOES.map((f) => `<option ${m.funcao === f ? 'selected' : ''}>${f}</option>`).join('')}
            </select>
            <select class="sel-membro-representacao">
              ${REPRESENTACOES.map((r) => `<option ${m.representacao === r ? 'selected' : ''}>${r}</option>`).join('')}
            </select>
            <select class="sel-membro-tipo">
              ${TIPOS.map((t) => `<option ${m.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
            <button type="button" class="btn-remover-item btn-remover-membro" title="Remover membro">✕</button>
          </div>
        </div>
      `).join('')
    : '<p class="empty-state">Nenhum membro cadastrado ainda.</p>';

  membros.forEach((m, idx) => {
    const card = container.querySelector(`[data-idx="${idx}"]`);
    if (!card) return;

    card.querySelector('.txt-membro-nome').addEventListener('blur', async (e) => {
      m.nome = e.target.value.trim();
      await salvarGestaoCipa(gestao);
    });
    card.querySelector('.txt-membro-setor').addEventListener('blur', async (e) => {
      m.setor = e.target.value.trim();
      await salvarGestaoCipa(gestao);
    });
    card.querySelector('.sel-membro-funcao').addEventListener('change', async (e) => {
      m.funcao = e.target.value;
      await salvarGestaoCipa(gestao);
    });
    card.querySelector('.sel-membro-representacao').addEventListener('change', async (e) => {
      m.representacao = e.target.value;
      await salvarGestaoCipa(gestao);
    });
    card.querySelector('.sel-membro-tipo').addEventListener('change', async (e) => {
      m.tipo = e.target.value;
      await salvarGestaoCipa(gestao);
    });
    card.querySelector('.btn-remover-membro').addEventListener('click', async () => {
      if (!confirm('Remover este membro da CIPA?')) return;
      gestao.data.membros.splice(idx, 1);
      await salvarGestaoCipa(gestao);
      renderMembrosCipa(container, gestao);
    });
  });
}

/* ---------------- HOME DO MÓDULO ---------------- */

async function renderCipaHome() {
  state.screen = 'cipa-home';
  setActiveTab('cipa');
  const gestoes = await DB.getAllCipaGestoes();
  const gestaoAtual = gestoes[0] || null;
  const reunioes = await DB.getAllCipaReunioes();
  const statusGestao = statusMandatoCipa(gestaoAtual);
  const totalMembros = gestaoAtual ? gestaoAtual.data.membros.length : 0;

  const reunioesHtml = reunioes.length
    ? reunioes.map((r) => {
        const s = statusLabel(r);
        const ident = r.data.identificacao;
        return `
          <li class="insp-card" data-id="${r.id}">
            <div class="insp-card-main">
              <div class="insp-card-title">Ata nº ${escapeHtml(ident.numeroAta || '—')} — ${escapeHtml(ident.tipo)}</div>
              <div class="insp-card-sub">${escapeHtml(ident.local || '')}</div>
              <div class="insp-card-sub">${escapeHtml(ident.data || '')} ${escapeHtml(ident.hora || '')}</div>
            </div>
            <div class="insp-card-side">
              <span class="badge ${s.cls}">${s.text}</span>
              <button type="button" class="btn-excluir-card" data-id="${r.id}" title="Excluir">🗑</button>
            </div>
          </li>
        `;
      }).join('')
    : '<li class="empty-state">Nenhuma reunião registrada ainda. Toque em "Nova reunião" para começar.</li>';

  view.innerHTML = `
    <div class="screen-header">
      <h1>Gestão de CIPA</h1>
    </div>
    <div class="detail-block cipa-gestao-resumo">
      <div class="diag-categoria-header">
        <strong>${gestaoAtual ? escapeHtml(gestaoAtual.data.empresa || 'Gestão atual') : 'Nenhuma gestão cadastrada'}</strong>
        <span class="badge ${statusGestao.cls}">${statusGestao.text}</span>
      </div>
      ${gestaoAtual
        ? `<p>Mandato: ${gestaoAtual.data.mandatoInicio ? formatarDataBR(gestaoAtual.data.mandatoInicio) : '—'} a ${gestaoAtual.data.mandatoFim ? formatarDataBR(gestaoAtual.data.mandatoFim) : '—'} · ${totalMembros} membro(s)</p>`
        : '<p>Cadastre os membros e o período de mandato da CIPA.</p>'}
      <div class="form-actions">
        <button id="btn-gerenciar-membros-cipa" class="btn-secondary">${gestaoAtual ? 'Gerenciar membros e mandato' : 'Cadastrar gestão da CIPA'}</button>
        ${gestaoAtual ? '<button id="btn-nova-gestao-cipa" class="btn-link">Iniciar nova gestão (após eleição)</button>' : ''}
      </div>
    </div>

    <div class="screen-header">
      <h1>Reuniões e Atas</h1>
      <button id="btn-new-reuniao-cipa" class="btn-primary">+ Nova reunião</button>
    </div>
    <ul class="insp-list">${reunioesHtml}</ul>
  `;

  document.getElementById('btn-gerenciar-membros-cipa').addEventListener('click', () => abrirGestaoCipa(gestaoAtual));
  const btnNovaGestao = document.getElementById('btn-nova-gestao-cipa');
  if (btnNovaGestao) btnNovaGestao.addEventListener('click', () => {
    if (!confirm('Iniciar uma nova gestão da CIPA? A gestão atual permanece registrada no histórico, mas deixa de ser exibida como ativa.')) return;
    abrirGestaoCipa(null);
  });

  document.getElementById('btn-new-reuniao-cipa').addEventListener('click', startNewReuniaoCipa);
  view.querySelectorAll('.insp-card').forEach((el) => {
    el.addEventListener('click', () => openReuniaoCipa(el.dataset.id));
  });
  view.querySelectorAll('.btn-excluir-card').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      excluirReuniaoCipa(btn.dataset.id);
    });
  });
}

async function excluirReuniaoCipa(id) {
  const reuniao = await DB.getCipaReuniao(id);
  if (!reuniao) return;
  const rotulo = reuniao.completo ? 'esta reunião/ata' : 'este rascunho de reunião';
  if (!confirm(`Excluir ${rotulo} e todas as suas fotos do dispositivo? Esta ação não pode ser desfeita.`)) return;
  const photos = await DB.getPhotosByInspection(id);
  for (const p of photos) await DB.deletePhoto(p.id);
  await DB.deleteCipaReuniao(id);
  renderCipaHome();
  updateSyncBar();
}

async function openReuniaoCipa(id) {
  const reuniao = await DB.getCipaReuniao(id);
  if (!reuniao.completo) {
    state.cipaReuniaoId = id;
    renderReuniaoCipaForm();
  } else {
    renderReuniaoCipaDetail(id);
  }
}

async function startNewReuniaoCipa() {
  const reuniao = novaReuniaoCipaVazia();
  await DB.putCipaReuniao(reuniao);
  state.cipaReuniaoId = reuniao.id;
  renderReuniaoCipaForm();
}

/* ---------------- REUNIÃO / ATA ---------------- */

function novaReuniaoCipaVazia() {
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
        local: '',
        numeroAta: '',
        tipo: 'Ordinária'
      },
      pauta: {
        analiseAcidentes: '',
        resultadosInspecoes: '',
        planoTrabalho: '',
        assuntosGerais: ''
      },
      deliberacoes: '',
      fotosIds: [],
      participantes: []
    }
  };
}

async function salvarRascunhoReuniaoCipa(reuniao) {
  reuniao.updatedAt = Date.now();
  await DB.putCipaReuniao(reuniao);
}

async function renderReuniaoCipaForm() {
  state.screen = 'cipa-reuniao-form';
  const reuniao = await DB.getCipaReuniao(state.cipaReuniaoId);
  const ident = reuniao.data.identificacao;
  const p = reuniao.data.pauta;

  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-cipa-reuniao" class="btn-link">← Voltar</button>
      <h1>Reunião da CIPA</h1>
    </div>
    <form id="form-cipa-reuniao" class="form-section">
      <label>Data *
        <input type="date" name="data" required value="${escapeHtml(ident.data)}">
      </label>
      <label>Hora *
        <input type="time" name="hora" required value="${escapeHtml(ident.hora)}">
      </label>
      <label>Local
        <input type="text" name="local" value="${escapeHtml(ident.local)}">
      </label>
      <label>Número da ata
        <input type="text" name="numeroAta" value="${escapeHtml(ident.numeroAta)}">
      </label>
      <label>Tipo de reunião
        <select name="tipo">
          <option ${ident.tipo === 'Ordinária' ? 'selected' : ''}>Ordinária</option>
          <option ${ident.tipo === 'Extraordinária' ? 'selected' : ''}>Extraordinária</option>
        </select>
      </label>

      <label>1. Análise de acidentes e incidentes do período
        <textarea name="analiseAcidentes" rows="3">${escapeHtml(p.analiseAcidentes)}</textarea>
      </label>
      <label>2. Resultados de inspeções de segurança realizadas
        <textarea name="resultadosInspecoes" rows="3">${escapeHtml(p.resultadosInspecoes)}</textarea>
      </label>
      <label>3. Andamento do plano de trabalho / metas da CIPA
        <textarea name="planoTrabalho" rows="3">${escapeHtml(p.planoTrabalho)}</textarea>
      </label>
      <label>4. Assuntos gerais
        <textarea name="assuntosGerais" rows="3">${escapeHtml(p.assuntosGerais)}</textarea>
      </label>
      <label>Deliberações e encaminhamentos
        <textarea name="deliberacoes" rows="3">${escapeHtml(reuniao.data.deliberacoes)}</textarea>
      </label>

      <label>Evidência fotográfica</label>
      <div class="foto-botoes">
        <label class="file-label">📷 Tirar foto
          <input type="file" accept="image/*" capture="environment" id="input-foto-cipa-camera">
        </label>
        <label class="file-label">🖼️ Da galeria
          <input type="file" accept="image/*" multiple id="input-foto-cipa-galeria">
        </label>
      </div>
      <div class="thumbs" id="thumbs-cipa"></div>

      <div class="lista-participantes">
        <h3>Lista de presença</h3>
        <div id="participantes-cipa-container"></div>
        <button type="button" id="btn-add-participante-cipa" class="btn-secondary">+ Adicionar participante</button>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn-primary">Concluir e salvar</button>
      </div>
    </form>
    <p class="hint">O registro fica salvo no aparelho mesmo sem internet. Assim que houver conexão, é enviado automaticamente.</p>
  `;

  const form = document.getElementById('form-cipa-reuniao');

  function coletarCampos() {
    const fd = new FormData(form);
    reuniao.data.identificacao.data = fd.get('data') || '';
    reuniao.data.identificacao.hora = fd.get('hora') || '';
    reuniao.data.identificacao.local = (fd.get('local') || '').trim();
    reuniao.data.identificacao.numeroAta = (fd.get('numeroAta') || '').trim();
    reuniao.data.identificacao.tipo = fd.get('tipo') || 'Ordinária';
    reuniao.data.pauta.analiseAcidentes = (fd.get('analiseAcidentes') || '').trim();
    reuniao.data.pauta.resultadosInspecoes = (fd.get('resultadosInspecoes') || '').trim();
    reuniao.data.pauta.planoTrabalho = (fd.get('planoTrabalho') || '').trim();
    reuniao.data.pauta.assuntosGerais = (fd.get('assuntosGerais') || '').trim();
    reuniao.data.deliberacoes = (fd.get('deliberacoes') || '').trim();
  }

  document.getElementById('btn-back-cipa-reuniao').addEventListener('click', async () => {
    coletarCampos();
    await salvarRascunhoReuniaoCipa(reuniao);
    renderCipaHome();
  });

  async function refreshThumbsCipa() {
    const el = document.getElementById('thumbs-cipa');
    await renderThumbnails(el, reuniao.data.fotosIds);
    el.querySelectorAll('.btn-remover-foto').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const photoId = btn.dataset.photoId;
        await DB.deletePhoto(photoId);
        reuniao.data.fotosIds = reuniao.data.fotosIds.filter((pid) => pid !== photoId);
        await salvarRascunhoReuniaoCipa(reuniao);
        refreshThumbsCipa();
      });
    });
  }
  refreshThumbsCipa();

  ['input-foto-cipa-camera', 'input-foto-cipa-galeria'].forEach((elId) => {
    document.getElementById(elId).addEventListener('change', async (e) => {
      await adicionarFotos(reuniao, reuniao.data.fotosIds, e.target.files, 'cipa-reuniao');
      await salvarRascunhoReuniaoCipa(reuniao);
      refreshThumbsCipa();
    });
  });

  const participantesContainer = document.getElementById('participantes-cipa-container');
  renderParticipantesCipa(participantesContainer, reuniao);

  document.getElementById('btn-add-participante-cipa').addEventListener('click', async () => {
    const nome = prompt('Nome completo do participante:');
    if (!nome || !nome.trim()) return;
    reuniao.data.participantes.push(novoParticipante(nome.trim()));
    await salvarRascunhoReuniaoCipa(reuniao);
    renderParticipantesCipa(participantesContainer, reuniao);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    coletarCampos();
    if (reuniao.data.participantes.length === 0 &&
        !confirm('Nenhum participante foi adicionado à lista de presença. Deseja concluir mesmo assim?')) {
      return;
    }
    reuniao.completo = true;
    reuniao.syncStatus = 'pendente';
    await salvarRascunhoReuniaoCipa(reuniao);
    await refreshChrome();
    renderCipaHome();
    Sync.syncAll().catch(() => {});
  });
}

function renderParticipantesCipa(container, reuniao) {
  const lista = reuniao.data.participantes;
  container.innerHTML = lista.length
    ? lista.map((p, idx) => blocoAssinaturaParticipante(p, idx)).join('')
    : '<p class="empty-state">Nenhum participante adicionado ainda.</p>';

  lista.forEach((p, idx) => {
    const card = container.querySelector(`[data-idx="${idx}"]`);
    if (!card) return;

    card.querySelector('.txt-participante-nome').addEventListener('blur', async (e) => {
      p.nome = e.target.value.trim();
      await salvarRascunhoReuniaoCipa(reuniao);
    });
    card.querySelector('.txt-participante-funcao').addEventListener('blur', async (e) => {
      p.funcao = e.target.value.trim();
      await salvarRascunhoReuniaoCipa(reuniao);
    });
    card.querySelector('.btn-remover-participante').addEventListener('click', async () => {
      if (!confirm('Remover este participante?')) return;
      reuniao.data.participantes.splice(idx, 1);
      await salvarRascunhoReuniaoCipa(reuniao);
      renderParticipantesCipa(container, reuniao);
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
      await salvarRascunhoReuniaoCipa(reuniao);
      renderParticipantesCipa(container, reuniao);
    });
  });
}

/* ---------------- DETALHE ---------------- */

async function renderReuniaoCipaDetail(id) {
  state.screen = 'cipa-reuniao-detail';
  state.cipaReuniaoId = id;
  const reuniao = await DB.getCipaReuniao(id);
  const photos = await DB.getPhotosByInspection(id);
  const s = statusLabel(reuniao);
  const ident = reuniao.data.identificacao;
  const p = reuniao.data.pauta;

  const participantesHtml = reuniao.data.participantes.length
    ? `<ul class="lista-presenca">${reuniao.data.participantes.map((pt) => `
        <li>${escapeHtml(pt.nome)}${pt.funcao ? ' — ' + escapeHtml(pt.funcao) : ''}
          <span class="badge ${pt.assinatura ? 'badge-ok' : 'badge-pendente'}">${pt.assinatura ? 'Assinado' : 'Sem assinatura'}</span>
        </li>
      `).join('')}</ul>`
    : '<p class="empty-state">Nenhum participante registrado.</p>';

  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-cipa-reuniao-home" class="btn-link">← Voltar</button>
      <h1>Ata nº ${escapeHtml(ident.numeroAta || '—')}</h1>
    </div>
    <span class="badge ${s.cls}">${s.text}</span>
    ${reuniao.syncError ? `<p class="erro-msg">${escapeHtml(reuniao.syncError)}</p>` : ''}
    <div class="detail-block">
      <p>${escapeHtml(ident.local || '—')} · ${escapeHtml(ident.tipo)}</p>
      <p>${escapeHtml(ident.data)} ${escapeHtml(ident.hora)}</p>
    </div>
    <h3>1. Análise de acidentes e incidentes</h3>
    <div class="detail-block"><p>${escapeHtml(p.analiseAcidentes || '—')}</p></div>
    <h3>2. Resultados de inspeções</h3>
    <div class="detail-block"><p>${escapeHtml(p.resultadosInspecoes || '—')}</p></div>
    <h3>3. Plano de trabalho / metas</h3>
    <div class="detail-block"><p>${escapeHtml(p.planoTrabalho || '—')}</p></div>
    <h3>4. Assuntos gerais</h3>
    <div class="detail-block"><p>${escapeHtml(p.assuntosGerais || '—')}</p></div>
    ${reuniao.data.deliberacoes ? `<h3>Deliberações e encaminhamentos</h3><div class="detail-block"><p>${escapeHtml(reuniao.data.deliberacoes)}</p></div>` : ''}
    ${photos.length ? `<h3>Evidência fotográfica</h3><div class="thumbs">${photos.map((ph) => `<div class="thumb"><img src="${URL.createObjectURL(ph.blob)}"><span class="thumb-sync ${ph.synced ? 'ok' : ''}">${ph.synced ? '✓' : '⏳'}</span></div>`).join('')}</div>` : ''}
    <h3>Lista de presença (${reuniao.data.participantes.length})</h3>
    ${participantesHtml}
    <div class="form-actions">
      <button id="btn-relatorio-cipa" class="btn-secondary">Gerar ata (PDF)</button>
    </div>
    <div class="form-actions">
      ${reuniao.syncStatus !== 'synced' ? '<button id="btn-sync-one-cipa" class="btn-primary">Sincronizar esta reunião</button>' : ''}
      <button id="btn-excluir-cipa-reuniao" class="btn-danger">Excluir reunião</button>
    </div>
  `;

  document.getElementById('btn-back-cipa-reuniao-home').addEventListener('click', renderCipaHome);
  document.getElementById('btn-relatorio-cipa').addEventListener('click', () => renderReuniaoCipaReport(id));

  const btnSyncOne = document.getElementById('btn-sync-one-cipa');
  if (btnSyncOne) btnSyncOne.addEventListener('click', async () => {
    btnSyncOne.disabled = true;
    btnSyncOne.textContent = 'Sincronizando…';
    try {
      await Sync.syncCipaReuniao(id);
    } catch (e) {
      alert('Não foi possível sincronizar agora: ' + e.message);
    }
    renderReuniaoCipaDetail(id);
    updateSyncBar();
  });

  document.getElementById('btn-excluir-cipa-reuniao').addEventListener('click', async () => {
    if (!confirm('Excluir esta reunião e todas as suas fotos do dispositivo? Esta ação não pode ser desfeita.')) return;
    for (const ph of photos) await DB.deletePhoto(ph.id);
    await DB.deleteCipaReuniao(id);
    renderCipaHome();
    updateSyncBar();
  });
}

/* ---------------- ATA (impressão / PDF) ---------------- */

function gerarCodigoAtaCipa(reuniao) {
  const data = (reuniao.data.identificacao.data || '').replace(/-/g, '');
  const curto = reuniao.id.split('-')[0].toUpperCase();
  return `CIPA-ATA-${data || 'SDATA'}-${curto}`;
}

async function montarFotosCipa(fotosIds) {
  if (!fotosIds || !fotosIds.length) {
    return '<p class="rep-hint">Nenhuma evidência fotográfica anexada.</p>';
  }
  const fotosHtml = (await Promise.all(fotosIds.map(montarBlocoFoto))).join('');
  return `<div class="rep-fotos-grid">${fotosHtml}</div>`;
}

function montarListaPresencaCipa(reuniao) {
  if (!reuniao.data.participantes.length) {
    return '<p class="rep-hint">Nenhum participante registrado.</p>';
  }
  const linhas = reuniao.data.participantes.map((p, idx) => `
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

async function renderReuniaoCipaReport(id) {
  state.screen = 'cipa-reuniao-report';
  const reuniao = await DB.getCipaReuniao(id);
  if (!reuniao) return renderCipaHome();

  const ident = reuniao.data.identificacao;
  const p = reuniao.data.pauta;
  const codigo = gerarCodigoAtaCipa(reuniao);
  const geradoEm = new Date().toLocaleString('pt-BR');
  const fotosHtml = await montarFotosCipa(reuniao.data.fotosIds);

  view.innerHTML = `
    <div class="screen-header no-print">
      <button id="btn-back-cipa-report" class="btn-link">← Voltar</button>
      <h1>Ata de Reunião da CIPA</h1>
    </div>
    <div class="form-actions no-print" style="margin-bottom:12px;">
      <button id="btn-imprimir-cipa" class="btn-primary">Imprimir / Salvar PDF</button>
    </div>

    <article class="rep-doc">
      <header class="rep-cabecalho">
        <div class="rep-titulo">
          <img src="icons/icon-192.png" alt="" class="rep-logo">
          <div>
            <h2>ATA DE REUNIÃO DA CIPA</h2>
            <p>Reunião ${escapeHtml(ident.tipo)} — Ata nº ${escapeHtml(ident.numeroAta || '—')}</p>
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
          <tr><th>Data</th><td>${formatarDataBR(ident.data)}</td><th>Hora</th><td>${escapeHtml(ident.hora)}</td></tr>
          <tr><th>Local</th><td>${escapeHtml(ident.local || '—')}</td><th>Tipo</th><td>${escapeHtml(ident.tipo)}</td></tr>
        </table>
      </section>

      <section class="rep-secao">
        <h3>2. Pauta</h3>
        <p><strong>2.1 Análise de acidentes e incidentes do período</strong></p>
        <p class="rep-parecer">${escapeHtml(p.analiseAcidentes || '—')}</p>
        <p><strong>2.2 Resultados de inspeções de segurança realizadas</strong></p>
        <p class="rep-parecer">${escapeHtml(p.resultadosInspecoes || '—')}</p>
        <p><strong>2.3 Andamento do plano de trabalho / metas da CIPA</strong></p>
        <p class="rep-parecer">${escapeHtml(p.planoTrabalho || '—')}</p>
        <p><strong>2.4 Assuntos gerais</strong></p>
        <p class="rep-parecer">${escapeHtml(p.assuntosGerais || '—')}</p>
      </section>

      <section class="rep-secao rep-quebra">
        <h3>3. Deliberações e encaminhamentos</h3>
        <p class="rep-parecer">${escapeHtml(reuniao.data.deliberacoes || 'Nenhuma deliberação registrada.')}</p>
      </section>

      <section class="rep-secao rep-quebra">
        <h3>4. Evidência fotográfica</h3>
        ${fotosHtml}
      </section>

      <section class="rep-secao rep-quebra">
        <h3>5. Lista de presença</h3>
        ${montarListaPresencaCipa(reuniao)}
      </section>

      <footer class="rep-rodape">
        Documento ${codigo} — gerado automaticamente pelo aplicativo Inspeções SSMA em ${geradoEm}.
      </footer>
    </article>
  `;

  document.getElementById('btn-back-cipa-report').addEventListener('click', () => renderReuniaoCipaDetail(id));
  document.getElementById('btn-imprimir-cipa').addEventListener('click', () => window.print());
}
