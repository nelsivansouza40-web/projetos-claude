/* Módulo Certificados. Controle dos certificados e treinamentos dos
 * colaboradores (NR-35, NR-33, NR-10 etc.), com data de emissão, validade
 * e alerta de vencimento — mesmo princípio do controle de mandato usado
 * na CIPA. A evidência fotográfica aqui é o próprio certificado
 * digitalizado/fotografado, por isso é obrigatória para gerar o relatório. */

function novoCertificadoVazio() {
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
      colaborador: '',
      funcao: '',
      setor: '',
      tipo: '',
      tipoOutro: '',
      instituicao: '',
      cargaHoraria: '',
      numeroCertificado: '',
      dataEmissao: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      dataValidade: '',
      fotosIds: [],
      observacoes: ''
    }
  };
}

async function salvarRascunhoCertificado(cert) {
  cert.updatedAt = Date.now();
  await DB.putCertificado(cert);
}

function descricaoTipoCertificado(cert) {
  return cert.data.tipo === 'Outro' ? (cert.data.tipoOutro || 'Outro') : cert.data.tipo;
}

function statusCertificado(cert) {
  if (!cert.data.dataValidade) return { text: 'Sem validade definida', cls: 'badge-rascunho' };
  const hoje = new Date();
  const validade = new Date(cert.data.dataValidade + 'T23:59:59');
  const diffDias = Math.ceil((validade - hoje) / (1000 * 60 * 60 * 24));
  if (diffDias < 0) return { text: 'Vencido', cls: 'badge-erro' };
  if (diffDias <= 60) return { text: `Vence em ${diffDias} dia(s)`, cls: 'badge-pendente' };
  return { text: 'Válido', cls: 'badge-ok' };
}

/* ---------------- HOME DO MÓDULO ---------------- */

async function renderCertificadosHome() {
  state.screen = 'cert-home';
  setActiveTab('certificados');
  const registros = await DB.getAllCertificados();

  const vencidos = registros.filter((c) => statusCertificado(c).cls === 'badge-erro').length;
  const vencendo = registros.filter((c) => statusCertificado(c).cls === 'badge-pendente').length;

  const resumoHtml = registros.length
    ? `<div class="detail-block cipa-gestao-resumo">
        <p>${registros.length} certificado(s) cadastrado(s)${vencidos ? ` · <strong class="nc">${vencidos} vencido(s)</strong>` : ''}${vencendo ? ` · <strong class="alerta">${vencendo} vencendo em breve</strong>` : ''}</p>
      </div>`
    : '';

  const itemsHtml = registros.length
    ? registros.map((c) => {
        const s = statusCertificado(c);
        return `
          <li class="insp-card" data-id="${c.id}">
            <div class="insp-card-main">
              <div class="insp-card-title">${escapeHtml(c.data.colaborador || 'Sem nome')}</div>
              <div class="insp-card-sub">${escapeHtml(descricaoTipoCertificado(c) || '')}</div>
              <div class="insp-card-sub">Validade: ${c.data.dataValidade ? formatarDataBR(c.data.dataValidade) : '—'}</div>
            </div>
            <div class="insp-card-side">
              <span class="badge ${s.cls}">${s.text}</span>
              <button type="button" class="btn-excluir-card" data-id="${c.id}" title="Excluir">🗑</button>
            </div>
          </li>
        `;
      }).join('')
    : '<li class="empty-state">Nenhum certificado registrado ainda. Toque em "Novo certificado" para começar.</li>';

  view.innerHTML = `
    <div class="screen-header">
      <h1>Certificados e Treinamentos</h1>
      <button id="btn-new-cert" class="btn-primary">+ Novo certificado</button>
    </div>
    ${resumoHtml}
    ${registros.length ? '<div class="form-actions"><button id="btn-ver-matriz" class="btn-secondary">📊 Ver Matriz de Treinamento</button></div>' : ''}
    <ul class="insp-list">${itemsHtml}</ul>
  `;

  document.getElementById('btn-new-cert').addEventListener('click', startNewCertificado);
  const btnMatriz = document.getElementById('btn-ver-matriz');
  if (btnMatriz) btnMatriz.addEventListener('click', renderMatrizTreinamento);
  view.querySelectorAll('.insp-card').forEach((el) => {
    el.addEventListener('click', () => openCertificado(el.dataset.id));
  });
  view.querySelectorAll('.btn-excluir-card').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      excluirCertificado(btn.dataset.id);
    });
  });
}

async function excluirCertificado(id) {
  const cert = await DB.getCertificado(id);
  if (!cert) return;
  if (!confirm('Excluir este certificado e a foto anexada do dispositivo? Esta ação não pode ser desfeita.')) return;
  const photos = await DB.getPhotosByInspection(id);
  for (const p of photos) await DB.deletePhoto(p.id);
  await DB.deleteCertificado(id);
  renderCertificadosHome();
  updateSyncBar();
}

async function openCertificado(id) {
  const cert = await DB.getCertificado(id);
  if (!cert.completo) {
    state.certId = id;
    renderCertificadoForm();
  } else {
    renderCertificadoDetail(id);
  }
}

async function startNewCertificado() {
  const cert = novoCertificadoVazio();
  await DB.putCertificado(cert);
  state.certId = cert.id;
  renderCertificadoForm();
}

/* ---------------- FORMULÁRIO ---------------- */

async function renderCertificadoForm() {
  state.screen = 'cert-form';
  const cert = await DB.getCertificado(state.certId);
  const d = cert.data;

  const tiposHtml = TIPOS_CERTIFICADO.map((t) =>
    `<option value="${escapeHtml(t)}" ${d.tipo === t ? 'selected' : ''}>${escapeHtml(t)}</option>`
  ).join('');

  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-cert-home" class="btn-link">← Voltar</button>
      <h1>Certificado / Treinamento</h1>
    </div>
    <form id="form-cert" class="form-section">
      <label>Nome do colaborador *
        <input type="text" name="colaborador" required value="${escapeHtml(d.colaborador)}">
      </label>
      <label>Função / Cargo
        <input type="text" name="funcao" value="${escapeHtml(d.funcao)}">
      </label>
      <label>Setor
        <input type="text" name="setor" value="${escapeHtml(d.setor)}">
      </label>
      <label>Tipo de certificado/treinamento *
        <select name="tipo" required>
          <option value="" disabled ${!d.tipo ? 'selected' : ''}>Selecione…</option>
          ${tiposHtml}
        </select>
      </label>
      <label id="label-tipo-outro" ${d.tipo === 'Outro' ? '' : 'hidden'}>Descreva o treinamento
        <input type="text" name="tipoOutro" value="${escapeHtml(d.tipoOutro)}">
      </label>
      <label>Instituição / Instrutor
        <input type="text" name="instituicao" value="${escapeHtml(d.instituicao)}">
      </label>
      <label>Carga horária (horas)
        <input type="number" name="cargaHoraria" min="1" value="${escapeHtml(d.cargaHoraria)}">
      </label>
      <label>Número do certificado
        <input type="text" name="numeroCertificado" value="${escapeHtml(d.numeroCertificado)}">
      </label>
      <label>Data de emissão *
        <input type="date" name="dataEmissao" required value="${escapeHtml(d.dataEmissao)}">
      </label>
      <label>Data de validade
        <input type="date" name="dataValidade" value="${escapeHtml(d.dataValidade)}">
      </label>

      <label>Foto do certificado</label>
      <div class="foto-botoes">
        <label class="file-label">📷 Tirar foto
          <input type="file" accept="image/*" capture="environment" id="input-foto-cert-camera">
        </label>
        <label class="file-label">🖼️ Da galeria
          <input type="file" accept="image/*" multiple id="input-foto-cert-galeria">
        </label>
      </div>
      <div class="thumbs" id="thumbs-cert"></div>

      <label>Observações
        <textarea name="observacoes" rows="2">${escapeHtml(d.observacoes)}</textarea>
      </label>

      <div class="form-actions">
        <button type="submit" class="btn-primary">Concluir e salvar</button>
      </div>
    </form>
    <p class="hint">O registro fica salvo no aparelho mesmo sem internet. Assim que houver conexão, é enviado automaticamente.</p>
  `;

  const form = document.getElementById('form-cert');
  const selectTipo = form.querySelector('select[name="tipo"]');
  selectTipo.addEventListener('change', () => {
    document.getElementById('label-tipo-outro').hidden = selectTipo.value !== 'Outro';
  });

  document.getElementById('btn-back-cert-home').addEventListener('click', async () => {
    const fd = new FormData(form);
    d.colaborador = (fd.get('colaborador') || '').trim();
    d.funcao = (fd.get('funcao') || '').trim();
    d.setor = (fd.get('setor') || '').trim();
    d.tipo = fd.get('tipo') || '';
    d.tipoOutro = (fd.get('tipoOutro') || '').trim();
    d.instituicao = (fd.get('instituicao') || '').trim();
    d.cargaHoraria = fd.get('cargaHoraria') || '';
    d.numeroCertificado = (fd.get('numeroCertificado') || '').trim();
    d.dataEmissao = fd.get('dataEmissao') || '';
    d.dataValidade = fd.get('dataValidade') || '';
    d.observacoes = (fd.get('observacoes') || '').trim();
    await salvarRascunhoCertificado(cert);
    renderCertificadosHome();
  });

  async function refreshThumbsCert() {
    const el = document.getElementById('thumbs-cert');
    await renderThumbnails(el, d.fotosIds);
    el.querySelectorAll('.btn-remover-foto').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const photoId = btn.dataset.photoId;
        await DB.deletePhoto(photoId);
        d.fotosIds = d.fotosIds.filter((pid) => pid !== photoId);
        await salvarRascunhoCertificado(cert);
        refreshThumbsCert();
      });
    });
  }
  refreshThumbsCert();

  ['input-foto-cert-camera', 'input-foto-cert-galeria'].forEach((elId) => {
    document.getElementById(elId).addEventListener('change', async (e) => {
      await adicionarFotos(cert, d.fotosIds, e.target.files, 'certificado');
      await salvarRascunhoCertificado(cert);
      refreshThumbsCert();
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    d.colaborador = fd.get('colaborador').trim();
    d.funcao = (fd.get('funcao') || '').trim();
    d.setor = (fd.get('setor') || '').trim();
    d.tipo = fd.get('tipo');
    d.tipoOutro = (fd.get('tipoOutro') || '').trim();
    d.instituicao = (fd.get('instituicao') || '').trim();
    d.cargaHoraria = fd.get('cargaHoraria') || '';
    d.numeroCertificado = (fd.get('numeroCertificado') || '').trim();
    d.dataEmissao = fd.get('dataEmissao');
    d.dataValidade = fd.get('dataValidade') || '';
    d.observacoes = (fd.get('observacoes') || '').trim();

    if (d.fotosIds.length === 0 &&
        !confirm('Nenhuma foto do certificado foi anexada. Deseja concluir mesmo assim? (Será necessário anexar antes de gerar o relatório.)')) {
      return;
    }

    cert.completo = true;
    cert.syncStatus = 'pendente';
    await salvarRascunhoCertificado(cert);
    await refreshChrome();
    renderCertificadosHome();
    Sync.syncAll().catch(() => {});
  });
}

/* ---------------- MATRIZ DE TREINAMENTO ---------------- */

function agruparCertificadosPorColaborador(registros) {
  const mapa = new Map();
  registros.forEach((c) => {
    const nome = c.data.colaborador || 'Sem nome';
    const tipo = descricaoTipoCertificado(c) || 'Não especificado';
    if (!mapa.has(nome)) mapa.set(nome, { funcao: c.data.funcao, setor: c.data.setor, tipos: new Map() });
    const entrada = mapa.get(nome);
    const atual = entrada.tipos.get(tipo);
    if (!atual || (c.data.dataEmissao || '') > (atual.data.dataEmissao || '')) {
      entrada.tipos.set(tipo, c);
    }
  });
  return mapa;
}

async function renderMatrizTreinamento() {
  state.screen = 'cert-matriz';
  setActiveTab('certificados');
  const registros = await DB.getAllCertificados();
  const colaboradores = agruparCertificadosPorColaborador(registros);
  const tiposUnicos = [...new Set(registros.map((c) => descricaoTipoCertificado(c) || 'Não especificado'))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  function montarTabela(filtro) {
    const nomes = [...colaboradores.keys()]
      .filter((nome) => !filtro || nome.toLowerCase().includes(filtro))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));

    if (!nomes.length) return '<p class="empty-state">Nenhum colaborador encontrado.</p>';

    const linhas = nomes.map((nome) => {
      const entrada = colaboradores.get(nome);
      const celulas = tiposUnicos.map((tipo) => {
        const cert = entrada.tipos.get(tipo);
        if (!cert) return '<td><span class="badge badge-rascunho">—</span></td>';
        const s = statusCertificado(cert);
        return `<td><span class="badge ${s.cls}">${s.text}</span></td>`;
      }).join('');
      return `<tr><td>${escapeHtml(nome)}<br><span class="insp-card-sub">${escapeHtml(entrada.funcao || '')} · ${escapeHtml(entrada.setor || '')}</span></td>${celulas}</tr>`;
    }).join('');

    return `
      <div style="overflow-x:auto;">
        <table class="rep-table">
          <thead><tr><th>Colaborador</th>${tiposUnicos.map((t) => `<th>${escapeHtml(t)}</th>`).join('')}</tr></thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
    `;
  }

  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-matriz" class="btn-link">← Voltar</button>
      <h1>Matriz de Treinamento</h1>
    </div>
    <p class="hint">Mostra o treinamento mais recente de cada colaborador por tipo, com a mesma situação de validade usada nos certificados.</p>
    <div class="form-section">
      <label>Buscar colaborador
        <input type="text" id="input-filtro-matriz" placeholder="Digite o nome do colaborador">
      </label>
    </div>
    <div id="matriz-treinamento-container">${montarTabela('')}</div>
  `;

  document.getElementById('btn-back-matriz').addEventListener('click', renderCertificadosHome);
  document.getElementById('input-filtro-matriz').addEventListener('input', (e) => {
    document.getElementById('matriz-treinamento-container').innerHTML = montarTabela(e.target.value.trim().toLowerCase());
  });
}

/* ---------------- VALIDAÇÃO PARA O RELATÓRIO ---------------- */

function validarCertificadoParaRelatorio(cert) {
  const problemas = [];
  if (cert.data.fotosIds.length === 0) {
    problemas.push('Nenhuma foto do certificado foi anexada.');
  }
  if (!cert.data.dataValidade) {
    problemas.push('A data de validade não foi informada.');
  }
  return problemas;
}

/* ---------------- DETALHE ---------------- */

async function renderCertificadoDetail(id) {
  state.screen = 'cert-detail';
  state.certId = id;
  const cert = await DB.getCertificado(id);
  const photos = await DB.getPhotosByInspection(id);
  const s = statusLabel(cert);
  const statusValidade = statusCertificado(cert);
  const d = cert.data;

  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-cert-home" class="btn-link">← Voltar</button>
      <h1>${escapeHtml(d.colaborador)}</h1>
    </div>
    <span class="badge ${s.cls}">${s.text}</span>
    <span class="badge ${statusValidade.cls}">${statusValidade.text}</span>
    ${cert.syncError ? `<p class="erro-msg">${escapeHtml(cert.syncError)}</p>` : ''}
    <div class="detail-block">
      <p>${escapeHtml(descricaoTipoCertificado(cert))}</p>
      <p>${escapeHtml(d.funcao || '—')} · ${escapeHtml(d.setor || '—')}</p>
      <p>Emissão: ${d.dataEmissao ? formatarDataBR(d.dataEmissao) : '—'} · Validade: ${d.dataValidade ? formatarDataBR(d.dataValidade) : '—'}</p>
      ${d.instituicao ? `<p>Instituição: ${escapeHtml(d.instituicao)}</p>` : ''}
      ${d.cargaHoraria ? `<p>Carga horária: ${escapeHtml(d.cargaHoraria)}h</p>` : ''}
      ${d.numeroCertificado ? `<p>Nº do certificado: ${escapeHtml(d.numeroCertificado)}</p>` : ''}
    </div>
    ${photos.length ? `<h3>Foto do certificado</h3><div class="thumbs">${photos.map((p) => `<div class="thumb"><img src="${URL.createObjectURL(p.blob)}"><span class="thumb-sync ${p.synced ? 'ok' : ''}">${p.synced ? '✓' : '⏳'}</span></div>`).join('')}</div>` : '<p class="hint">Nenhuma foto do certificado anexada ainda.</p>'}
    ${d.observacoes ? `<h3>Observações</h3><div class="detail-block"><p>${escapeHtml(d.observacoes)}</p></div>` : ''}
    <div class="form-actions">
      <button id="btn-editar-cert" class="btn-secondary">✏️ Editar certificado</button>
      <button id="btn-relatorio-cert" class="btn-secondary">Gerar relatório (PDF)</button>
    </div>
    <div class="form-actions">
      ${cert.syncStatus !== 'synced' ? '<button id="btn-sync-one-cert" class="btn-primary">Sincronizar este certificado</button>' : ''}
      <button id="btn-excluir-cert" class="btn-danger">Excluir certificado</button>
    </div>
  `;

  document.getElementById('btn-back-cert-home').addEventListener('click', renderCertificadosHome);
  document.getElementById('btn-relatorio-cert').addEventListener('click', () => {
    const problemas = validarCertificadoParaRelatorio(cert);
    if (problemas.length) {
      alert('Não é possível gerar o relatório ainda:\n\n- ' + problemas.join('\n- ') + '\n\nToque em "Editar certificado" para corrigir.');
      return;
    }
    renderCertificadoReport(id);
  });
  document.getElementById('btn-editar-cert').addEventListener('click', async () => {
    cert.metaSynced = false;
    cert.syncStatus = 'pendente';
    await salvarRascunhoCertificado(cert);
    state.certId = id;
    renderCertificadoForm();
  });

  const btnSyncOne = document.getElementById('btn-sync-one-cert');
  if (btnSyncOne) btnSyncOne.addEventListener('click', async () => {
    btnSyncOne.disabled = true;
    btnSyncOne.textContent = 'Sincronizando…';
    try {
      await Sync.syncCertificado(id);
    } catch (e) {
      alert('Não foi possível sincronizar agora: ' + e.message);
    }
    renderCertificadoDetail(id);
    updateSyncBar();
  });

  document.getElementById('btn-excluir-cert').addEventListener('click', async () => {
    if (!confirm('Excluir este certificado e a foto anexada do dispositivo? Esta ação não pode ser desfeita.')) return;
    for (const p of photos) await DB.deletePhoto(p.id);
    await DB.deleteCertificado(id);
    renderCertificadosHome();
    updateSyncBar();
  });
}

/* ---------------- RELATÓRIO (impressão / PDF) ---------------- */

function gerarCodigoCertificado(cert) {
  const data = (cert.data.dataEmissao || '').replace(/-/g, '');
  const curto = cert.id.split('-')[0].toUpperCase();
  return `CERT-${data || 'SDATA'}-${curto}`;
}

async function montarFotosCertificado(fotosIds) {
  if (!fotosIds || !fotosIds.length) return '<p class="rep-hint">Nenhuma foto anexada.</p>';
  const fotosHtml = (await Promise.all(fotosIds.map(montarBlocoFoto))).join('');
  return `<div class="rep-fotos-grid">${fotosHtml}</div>`;
}

async function renderCertificadoReport(id) {
  state.screen = 'cert-report';
  const cert = await DB.getCertificado(id);
  if (!cert) return renderCertificadosHome();

  const d = cert.data;
  const codigo = gerarCodigoCertificado(cert);
  const geradoEm = new Date().toLocaleString('pt-BR');
  const statusValidade = statusCertificado(cert);
  const fotosHtml = await montarFotosCertificado(d.fotosIds);

  view.innerHTML = `
    <div class="screen-header no-print">
      <button id="btn-back-cert-detail" class="btn-link">← Voltar</button>
      <h1>Relatório de Certificado</h1>
    </div>
    <div class="form-actions no-print" style="margin-bottom:12px;">
      <button id="btn-imprimir-cert" class="btn-primary">Imprimir / Salvar PDF</button>
    </div>

    <article class="rep-doc">
      <header class="rep-cabecalho">
        <div class="rep-titulo">
          <img src="icons/icon-192.png" alt="" class="rep-logo">
          <div>
            <h2>FICHA DE CERTIFICADO / TREINAMENTO</h2>
            <p>${escapeHtml(descricaoTipoCertificado(cert))}</p>
          </div>
        </div>
        <table class="rep-controle">
          <tr><th>Código</th><td>${codigo}</td></tr>
          <tr><th>Situação</th><td>${statusValidade.text}</td></tr>
          <tr><th>Emitido em</th><td>${geradoEm}</td></tr>
        </table>
      </header>

      <section class="rep-secao">
        <h3>1. Identificação</h3>
        <table class="rep-tabela-ident">
          <tr><th>Colaborador</th><td>${escapeHtml(d.colaborador)}</td><th>Função</th><td>${escapeHtml(d.funcao || '—')}</td></tr>
          <tr><th>Setor</th><td>${escapeHtml(d.setor || '—')}</td><th>Instituição / Instrutor</th><td>${escapeHtml(d.instituicao || '—')}</td></tr>
          <tr><th>Carga horária</th><td>${d.cargaHoraria ? d.cargaHoraria + 'h' : '—'}</td><th>Nº do certificado</th><td>${escapeHtml(d.numeroCertificado || '—')}</td></tr>
          <tr><th>Data de emissão</th><td>${formatarDataBR(d.dataEmissao)}</td><th>Data de validade</th><td>${d.dataValidade ? formatarDataBR(d.dataValidade) : '—'}</td></tr>
        </table>
      </section>

      <section class="rep-secao rep-quebra">
        <h3>2. Certificado digitalizado</h3>
        ${fotosHtml}
      </section>

      ${d.observacoes ? `
      <section class="rep-secao">
        <h3>3. Observações</h3>
        <p class="rep-parecer">${escapeHtml(d.observacoes)}</p>
      </section>` : ''}

      <footer class="rep-rodape">
        Documento ${codigo} — gerado automaticamente pelo aplicativo Inspeções SSMA em ${geradoEm}.
      </footer>
    </article>
  `;

  document.getElementById('btn-back-cert-detail').addEventListener('click', () => renderCertificadoDetail(id));
  document.getElementById('btn-imprimir-cert').addEventListener('click', () => window.print());
}
