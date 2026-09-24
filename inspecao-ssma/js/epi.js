/* Módulo Ficha de EPI (Equipamento de Proteção Individual), conforme NR-6.
 * Diferente dos demais módulos, é um documento contínuo por colaborador:
 * a ficha é aberta uma vez e recebe novas entregas de EPI ao longo do
 * tempo, cada uma com a assinatura do colaborador confirmando o
 * recebimento e a ciência do uso obrigatório. */

const MOTIVOS_ENTREGA_EPI = ['Uso normal', 'Substituição por desgaste', 'Perda', 'Dano', 'Troca periódica'];

function novaEntregaEPI() {
  return { id: uuid(), epi: '', ca: '', dataEntrega: '', quantidade: '', motivo: 'Uso normal', assinatura: '' };
}

function novaFichaEPIVazia() {
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
      colaborador: '',
      funcao: '',
      setor: '',
      entregas: []
    }
  };
}

async function salvarFichaEPI(ficha) {
  ficha.updatedAt = Date.now();
  ficha.metaSynced = false;
  ficha.syncStatus = 'pendente';
  await DB.putFichaEPI(ficha);
}

/* ---------------- HOME DO MÓDULO ---------------- */

async function renderEPIHome() {
  state.screen = 'epi-home';
  setActiveTab('epi');
  const registros = await DB.getAllFichasEPI();

  const itemsHtml = registros.length
    ? registros.map((f) => {
        const s = statusLabel(f);
        const pendentes = f.data.entregas.filter((e) => !e.assinatura).length;
        return `
          <li class="insp-card" data-id="${f.id}">
            <div class="insp-card-main">
              <div class="insp-card-title">${escapeHtml(f.data.colaborador || 'Sem nome')}</div>
              <div class="insp-card-sub">${escapeHtml(f.data.funcao || '')} · ${escapeHtml(f.data.setor || '')}</div>
              <div class="insp-card-sub">${f.data.entregas.length} entrega(s) registrada(s)</div>
            </div>
            <div class="insp-card-side">
              ${pendentes ? `<span class="badge badge-pendente">${pendentes} sem assinatura</span>` : ''}
              <span class="badge ${s.cls}">${s.text}</span>
              <button type="button" class="btn-excluir-card" data-id="${f.id}" title="Excluir">🗑</button>
            </div>
          </li>
        `;
      }).join('')
    : '<li class="empty-state">Nenhuma ficha de EPI registrada ainda. Toque em "Nova ficha" para começar.</li>';

  view.innerHTML = `
    <div class="screen-header">
      <h1>Ficha de EPI</h1>
      <button id="btn-new-epi" class="btn-primary">+ Nova ficha</button>
    </div>
    <ul class="insp-list">${itemsHtml}</ul>
  `;

  document.getElementById('btn-new-epi').addEventListener('click', startNewFichaEPI);
  view.querySelectorAll('.insp-card').forEach((el) => {
    el.addEventListener('click', () => renderEPIDetail(el.dataset.id));
  });
  view.querySelectorAll('.btn-excluir-card').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      excluirFichaEPI(btn.dataset.id);
    });
  });
}

async function excluirFichaEPI(id) {
  const ficha = await DB.getFichaEPI(id);
  if (!ficha) return;
  if (!confirm('Excluir esta ficha de EPI do dispositivo? Esta ação não pode ser desfeita.')) return;
  await DB.deleteFichaEPI(id);
  renderEPIHome();
  updateSyncBar();
}

async function startNewFichaEPI() {
  const ficha = novaFichaEPIVazia();
  await DB.putFichaEPI(ficha);
  renderEPIDetail(ficha.id);
}

/* ---------------- DETALHE (também é a tela de edição) ---------------- */

async function renderEPIDetail(id) {
  state.screen = 'epi-detail';
  state.epiId = id;
  const ficha = await DB.getFichaEPI(id);
  if (!ficha) return renderEPIHome();
  const s = statusLabel(ficha);

  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-epi-home" class="btn-link">← Voltar</button>
      <h1>${escapeHtml(ficha.data.colaborador || 'Ficha de EPI')}</h1>
    </div>
    <span class="badge ${s.cls}">${s.text}</span>
    ${ficha.syncError ? `<p class="erro-msg">${escapeHtml(ficha.syncError)}</p>` : ''}

    <div class="form-section">
      <label>Nome do colaborador *
        <input type="text" id="epi-colaborador" value="${escapeHtml(ficha.data.colaborador)}">
      </label>
      <label>Função / Cargo
        <input type="text" id="epi-funcao" value="${escapeHtml(ficha.data.funcao)}">
      </label>
      <label>Setor
        <input type="text" id="epi-setor" value="${escapeHtml(ficha.data.setor)}">
      </label>
    </div>

    <div class="lista-participantes">
      <h3>Entregas de EPI</h3>
      <p class="hint">Registre cada equipamento entregue. O colaborador deve assinar confirmando o recebimento e a ciência do uso obrigatório.</p>
      <div id="epi-entregas-container"></div>
      <button type="button" id="btn-add-entrega-epi" class="btn-secondary">+ Adicionar entrega</button>
    </div>

    <div class="form-actions">
      <button id="btn-relatorio-epi" class="btn-secondary">Gerar ficha (PDF)</button>
    </div>
    <div class="form-actions">
      ${ficha.syncStatus !== 'synced' ? '<button id="btn-sync-one-epi" class="btn-primary">Sincronizar esta ficha</button>' : ''}
      <button id="btn-excluir-epi-detail" class="btn-danger">Excluir ficha</button>
    </div>
  `;

  document.getElementById('btn-back-epi-home').addEventListener('click', renderEPIHome);

  const inputColaborador = document.getElementById('epi-colaborador');
  const inputFuncao = document.getElementById('epi-funcao');
  const inputSetor = document.getElementById('epi-setor');
  inputColaborador.addEventListener('blur', async () => {
    ficha.data.colaborador = inputColaborador.value.trim();
    await salvarFichaEPI(ficha);
  });
  inputFuncao.addEventListener('blur', async () => {
    ficha.data.funcao = inputFuncao.value.trim();
    await salvarFichaEPI(ficha);
  });
  inputSetor.addEventListener('blur', async () => {
    ficha.data.setor = inputSetor.value.trim();
    await salvarFichaEPI(ficha);
  });

  const entregasContainer = document.getElementById('epi-entregas-container');
  renderEntregasEPI(entregasContainer, ficha);

  document.getElementById('btn-add-entrega-epi').addEventListener('click', async () => {
    ficha.data.entregas.push(novaEntregaEPI());
    await salvarFichaEPI(ficha);
    renderEntregasEPI(entregasContainer, ficha);
  });

  document.getElementById('btn-relatorio-epi').addEventListener('click', () => {
    const problemas = validarFichaEPIParaRelatorio(ficha);
    if (problemas.length) {
      alert('Não é possível gerar a ficha ainda:\n\n- ' + problemas.join('\n- '));
      return;
    }
    renderEPIReport(id);
  });

  const btnSyncOne = document.getElementById('btn-sync-one-epi');
  if (btnSyncOne) btnSyncOne.addEventListener('click', async () => {
    btnSyncOne.disabled = true;
    btnSyncOne.textContent = 'Sincronizando…';
    try {
      await Sync.syncFichaEPI(id);
    } catch (e) {
      alert('Não foi possível sincronizar agora: ' + e.message);
    }
    renderEPIDetail(id);
    updateSyncBar();
  });

  document.getElementById('btn-excluir-epi-detail').addEventListener('click', async () => {
    if (!confirm('Excluir esta ficha de EPI do dispositivo? Esta ação não pode ser desfeita.')) return;
    await DB.deleteFichaEPI(id);
    renderEPIHome();
    updateSyncBar();
  });
}

function renderEntregaEPI(e, idx) {
  const motivosHtml = MOTIVOS_ENTREGA_EPI.map((m) => `<option ${e.motivo === m ? 'selected' : ''}>${escapeHtml(m)}</option>`).join('');
  return `
    <div class="leitura-card" data-idx="${idx}">
      <div class="participante-linha">
        <label class="campo-leitura">EPI *
          <input type="text" class="in-epi" placeholder="Ex.: Capacete, luva, óculos…" value="${escapeHtml(e.epi)}">
        </label>
        <label class="campo-leitura">Nº do CA
          <input type="text" class="in-ca" value="${escapeHtml(e.ca)}">
        </label>
        <button type="button" class="btn-remover-item btn-remover-entrega" title="Remover entrega">✕</button>
      </div>
      <div class="participante-linha">
        <label class="campo-leitura">Data de entrega *
          <input type="date" class="in-data-entrega" value="${escapeHtml(e.dataEntrega)}">
        </label>
        <label class="campo-leitura">Quantidade
          <input type="number" min="1" class="in-quantidade" value="${escapeHtml(e.quantidade)}">
        </label>
        <label class="campo-leitura">Motivo
          <select class="in-motivo">${motivosHtml}</select>
        </label>
      </div>
      <div class="rep-assinatura rep-assinatura-compacta">
        ${e.assinatura
          ? `<img src="${e.assinatura}" class="rep-assinatura-img" alt="Assinatura">`
          : '<div class="rep-linha-assinatura"></div>'}
        <p class="hint">Ciência do recebimento e do uso obrigatório do EPI.</p>
        <div class="rep-assinatura-controles">
          <button type="button" class="btn-secondary btn-pequeno btn-assinar-entrega">${e.assinatura ? 'Assinar novamente' : 'Assinar recebimento'}</button>
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

function renderEntregasEPI(container, ficha) {
  const entregas = ficha.data.entregas;
  container.innerHTML = entregas.length
    ? entregas.map((e, idx) => renderEntregaEPI(e, idx)).join('')
    : '<p class="empty-state">Nenhuma entrega registrada ainda.</p>';

  entregas.forEach((e, idx) => {
    const card = container.querySelector(`.leitura-card[data-idx="${idx}"]`);
    if (!card) return;

    const campos = [
      ['.in-epi', 'epi'], ['.in-ca', 'ca'], ['.in-data-entrega', 'dataEntrega'],
      ['.in-quantidade', 'quantidade'], ['.in-motivo', 'motivo']
    ];
    campos.forEach(([seletor, campo]) => {
      const el = card.querySelector(seletor);
      if (!el) return;
      const evento = el.tagName === 'SELECT' || (el.tagName === 'INPUT' && el.type === 'date') ? 'change' : 'blur';
      el.addEventListener(evento, async () => {
        e[campo] = el.value;
        await salvarFichaEPI(ficha);
      });
    });

    card.querySelector('.btn-remover-entrega').addEventListener('click', async () => {
      if (!confirm('Remover esta entrega de EPI?')) return;
      ficha.data.entregas.splice(idx, 1);
      await salvarFichaEPI(ficha);
      renderEntregasEPI(container, ficha);
    });

    const btnAssinar = card.querySelector('.btn-assinar-entrega');
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
      e.assinatura = canvas.toDataURL('image/png');
      await salvarFichaEPI(ficha);
      renderEntregasEPI(container, ficha);
    });
  });
}

/* ---------------- VALIDAÇÃO PARA A FICHA ---------------- */

function validarFichaEPIParaRelatorio(ficha) {
  const problemas = [];
  if (!ficha.data.colaborador) {
    problemas.push('O nome do colaborador não foi informado.');
  }
  if (!ficha.data.entregas.length) {
    problemas.push('Nenhuma entrega de EPI foi registrada.');
  }
  ficha.data.entregas.forEach((e, idx) => {
    if (!e.epi) problemas.push(`Entrega ${idx + 1} está sem o nome do EPI.`);
    if (!e.dataEntrega) problemas.push(`Entrega ${idx + 1} está sem data de entrega.`);
    if (!e.assinatura) problemas.push(`Entrega ${idx + 1} (${e.epi || 'sem nome'}) ainda não foi assinada pelo colaborador.`);
  });
  return problemas;
}

/* ---------------- RELATÓRIO (impressão / PDF) ---------------- */

function gerarCodigoFichaEPI(ficha) {
  const curto = ficha.id.split('-')[0].toUpperCase();
  return `EPI-${curto}`;
}

function montarTabelaEntregasEPI(entregas) {
  const linhas = entregas.map((e, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${escapeHtml(e.epi)}</td>
      <td>${escapeHtml(e.ca || '—')}</td>
      <td>${e.dataEntrega ? formatarDataBR(e.dataEntrega) : '—'}</td>
      <td>${escapeHtml(e.quantidade || '—')}</td>
      <td>${escapeHtml(e.motivo || '—')}</td>
      <td class="rep-td-assinatura">${e.assinatura
        ? `<img src="${e.assinatura}" class="rep-assinatura-mini" alt="Assinatura">`
        : '<div class="rep-linha-assinatura-mini"></div>'}</td>
    </tr>
  `).join('');
  return `
    <table class="rep-table rep-table-presenca">
      <thead><tr><th>Nº</th><th>EPI</th><th>CA</th><th>Data</th><th>Qtd.</th><th>Motivo</th><th>Ciente (assinatura)</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
  `;
}

async function renderEPIReport(id) {
  state.screen = 'epi-report';
  const ficha = await DB.getFichaEPI(id);
  if (!ficha) return renderEPIHome();

  const codigo = gerarCodigoFichaEPI(ficha);
  const geradoEm = new Date().toLocaleString('pt-BR');

  view.innerHTML = `
    <div class="screen-header no-print">
      <button id="btn-back-epi-detail" class="btn-link">← Voltar</button>
      <h1>Ficha de Controle de EPI</h1>
    </div>
    <div class="form-actions no-print" style="margin-bottom:12px;">
      <button id="btn-imprimir-epi" class="btn-primary">Imprimir / Salvar PDF</button>
    </div>

    <article class="rep-doc">
      <header class="rep-cabecalho">
        <div class="rep-titulo">
          <img src="icons/icon-192.png" alt="" class="rep-logo">
          <div>
            <h2>FICHA DE CONTROLE DE EPI</h2>
            <p>${escapeHtml(ficha.data.colaborador)}</p>
          </div>
        </div>
        <table class="rep-controle">
          <tr><th>Código</th><td>${codigo}</td></tr>
          <tr><th>Emitido em</th><td>${geradoEm}</td></tr>
        </table>
      </header>

      <section class="rep-secao">
        <h3>1. Identificação</h3>
        <table class="rep-tabela-ident">
          <tr><th>Colaborador</th><td>${escapeHtml(ficha.data.colaborador)}</td><th>Função</th><td>${escapeHtml(ficha.data.funcao || '—')}</td></tr>
          <tr><th>Setor</th><td colspan="3">${escapeHtml(ficha.data.setor || '—')}</td></tr>
        </table>
      </section>

      <section class="rep-secao rep-quebra">
        <h3>2. Entregas de EPI</h3>
        <p class="rep-hint">Nos termos da NR-6, o colaborador declara ter recebido os equipamentos abaixo, estar ciente da obrigatoriedade do uso e ter recebido treinamento sobre seu uso correto.</p>
        ${montarTabelaEntregasEPI(ficha.data.entregas)}
      </section>

      <footer class="rep-rodape">
        Documento ${codigo} — gerado automaticamente pelo aplicativo Inspeções SSMA em ${geradoEm}.
      </footer>
    </article>
  `;

  document.getElementById('btn-back-epi-detail').addEventListener('click', () => renderEPIDetail(id));
  document.getElementById('btn-imprimir-epi').addEventListener('click', () => window.print());
}
