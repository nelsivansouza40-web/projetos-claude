/* Relatos pelo QR Code: o gestor gera placas com QR para as áreas; qualquer
 * trabalhador lê a placa e relata pela página relato.html, sem instalar o
 * app. Os relatos chegam à aba Relatos_QR da planilha e aparecem aqui, em
 * Relatos → "Recebidos pelo QR Code", para serem importados: a partir daí
 * seguem o fluxo normal do módulo (tratamento, ação, Central de ações). */

/** Endereço da página pública de relato, no mesmo site do app. */
function urlPaginaRelatoQR(endpoint, codigo, dados) {
  const pasta = location.protocol.startsWith('http') && !/localhost|127\.0\.0\.1/.test(location.host)
    ? location.origin + location.pathname.replace(/[^/]*$/, '')
    : URL_APP_PUBLICADO;
  const p = new URLSearchParams({ u: endpoint, c: codigo });
  if (dados.empresa) p.set('e', dados.empresa);
  if (dados.area) p.set('a', dados.area);
  if (dados.local) p.set('l', dados.local);
  return `${pasta}relato.html?${p.toString()}`;
}

/** Relato do app montado a partir de um relato recebido pelo QR. */
function relatoDoQR(q) {
  const r = novoRelatoVazio();
  const quando = q.recebidoEm ? new Date(q.recebidoEm) : new Date();
  const pad = (n) => String(n).padStart(2, '0');
  if (!Number.isNaN(quando.getTime())) {
    r.data.data = `${quando.getFullYear()}-${pad(quando.getMonth() + 1)}-${pad(quando.getDate())}`;
    r.data.hora = `${pad(quando.getHours())}:${pad(quando.getMinutes())}`;
  }
  r.data.tipo = TIPOS_RELATO.includes(q.tipo) ? q.tipo : TIPOS_RELATO[0];
  r.data.potencial = POTENCIAIS_RELATO.includes(q.potencial) ? q.potencial : POTENCIAIS_RELATO[1];
  r.data.empresa = q.empresa || '';
  r.data.area = q.area || '';
  r.data.local = q.local || '';
  r.data.acaoImediata = q.acaoImediata || '';
  r.data.anonimo = q.anonimo !== false;
  r.data.relator = r.data.anonimo ? '' : (q.nome || '');
  r.data.funcaoRelator = r.data.anonimo ? '' : (q.funcao || '');
  r.data.origemQR = q.id;
  r.data.fotosQR = q.fotos || [];
  // O protocolo e as fotos vão também no texto, para chegarem à planilha e ao relatório.
  r.data.descricao = [q.descricao || '',
    `[Recebido pelo QR Code, protocolo ${q.id}${q.potencial ? '' : '; potencial não informado pelo relator'}]`,
    ...(r.data.fotosQR.length ? [`Fotos: ${r.data.fotosQR.join(' ')}`] : [])].join('\n\n');
  r.completo = true;
  return r;
}

async function importarRelatoQR(q, endpoint) {
  const jaImportado = (await DB.getAllRelatos()).find((r) => r.data.origemQR === q.id);
  const r = jaImportado || relatoDoQR(q);
  if (!jaImportado) await DB.putRelato(r);
  const resp = await postJson(endpoint, { action: 'marcarRelatoQRImportado', id: q.id });
  if (!resp || !resp.ok) throw new Error((resp && resp.error) || 'Não foi possível marcar o relato como importado.');
  return r;
}

async function renderRelatosQRHome() {
  state.screen = 'relatos-qr-home';
  setActiveTab('relatos');
  const endpoint = await Sync.getEndpoint();
  const gestor = PERFIL_ATUAL === 'Gestor';

  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-relatos-qr" class="btn-link">← Voltar</button>
      <h1>Relatos pelo QR Code</h1>
    </div>
    <p class="hint">Qualquer trabalhador lê a placa com o celular e relata em menos de um minuto, sem instalar nada e de forma anônima, se quiser. Os relatos chegam aqui para serem importados e tratados.</p>
    <div class="form-section">
      <h3>Recebidos</h3>
      <div id="lista-relatos-qr"><p class="hint">Carregando…</p></div>
    </div>
    ${gestor ? `
    <div class="form-section">
      <h3>Gerar placa para uma área</h3>
      <label>Empresa <input type="text" id="qr-empresa"></label>
      <label>Área <input type="text" id="qr-area"></label>
      <label>Local (opcional) <input type="text" id="qr-local" placeholder="Ex.: plataforma 2, oficina mecânica"></label>
      <button id="btn-gerar-placa-qr" class="btn-primary">Gerar placa</button>
      <p class="hint">Placa perdida ou fotografada por quem não devia? Gere um código novo: todas as placas antigas param de funcionar e precisam ser reimpressas.</p>
      <button id="btn-novo-codigo-qr" class="btn-secondary">Invalidar placas antigas</button>
      <p id="qr-resultado" class="hint"></p>
    </div>` : ''}
  `;
  document.getElementById('btn-back-relatos-qr').addEventListener('click', renderRelatosHome);

  const lista = document.getElementById('lista-relatos-qr');
  if (!endpoint) {
    lista.innerHTML = '<p class="hint">Configure o endereço de sincronização em Configurações para usar o relato pelo QR Code.</p>';
  } else if (!navigator.onLine) {
    lista.innerHTML = '<p class="hint">Sem internet agora: os relatos recebidos aparecem quando o celular estiver conectado.</p>';
  } else {
    desenharRelatosQRRecebidos(lista, endpoint);
  }

  if (!gestor) return;
  const resultado = document.getElementById('qr-resultado');
  const pedirCodigo = async (novo) => {
    if (!endpoint) throw new Error('Configure antes o endereço de sincronização.');
    if (!navigator.onLine) throw new Error('É preciso estar com internet.');
    const resp = await postJson(endpoint, { action: 'codigoRelatoQR', novo });
    if (!resp || !resp.ok) {
      throw new Error(/desconhecida/i.test((resp && resp.error) || '') ? 'O servidor da planilha está desatualizado: cole o Code.gs novo no Apps Script.' : ((resp && resp.error) || 'Falha ao obter o código do QR.'));
    }
    return resp.codigo;
  };
  document.getElementById('btn-gerar-placa-qr').addEventListener('click', async () => {
    const dados = {
      empresa: document.getElementById('qr-empresa').value.trim(),
      area: document.getElementById('qr-area').value.trim(),
      local: document.getElementById('qr-local').value.trim()
    };
    if (!dados.area) { resultado.textContent = 'Informe a área da placa.'; return; }
    resultado.textContent = 'Gerando…';
    try {
      renderPlacaRelatoQR(dados, urlPaginaRelatoQR(endpoint, await pedirCodigo(false), dados));
    } catch (e) {
      resultado.textContent = e.message;
    }
  });
  document.getElementById('btn-novo-codigo-qr').addEventListener('click', async () => {
    if (!confirm('Todas as placas de relato já impressas vão parar de funcionar. Continuar?')) return;
    try {
      await pedirCodigo(true);
      resultado.textContent = 'Código novo gerado. Gere e imprima as placas de novo.';
    } catch (e) {
      resultado.textContent = e.message;
    }
  });
}

async function desenharRelatosQRRecebidos(lista, endpoint) {
  let resp;
  try {
    resp = await postJson(endpoint, { action: 'listarRelatosQR' });
  } catch (e) {
    lista.innerHTML = `<p class="hint">Não foi possível buscar os relatos: ${escapeHtml(e.message)}</p>`;
    return;
  }
  if (!resp || !resp.ok) {
    const erro = (resp && resp.error) || '';
    lista.innerHTML = `<p class="hint">${escapeHtml(/desconhecida/i.test(erro) ? 'O servidor da planilha está desatualizado: cole o Code.gs novo no Apps Script.' : erro || 'Falha ao buscar os relatos.')}</p>`;
    return;
  }
  const relatos = resp.relatos || [];
  if (!relatos.length) {
    lista.innerHTML = '<p class="empty-state">Nenhum relato novo recebido pelo QR Code.</p>';
    return;
  }
  lista.innerHTML = `<ul class="insp-list">${relatos.map((q, i) => `
    <li class="insp-card">
      <div class="insp-card-main">
        <div class="insp-card-title">${escapeHtml(q.tipo)} — ${escapeHtml(q.local || q.area || 'sem local')}</div>
        <div class="insp-card-sub">${escapeHtml(resumirTexto(q.descricao, 120))}</div>
        <div class="insp-card-sub">${escapeHtml(q.id)} · ${q.anonimo ? 'Anônimo' : escapeHtml(q.nome || '—')}${q.fotos.length ? ` · ${q.fotos.length} foto(s)` : ''}</div>
      </div>
      <div class="insp-card-side">
        ${q.potencial ? `<span class="badge ${classePotencialRelato(q.potencial)}">Potencial ${escapeHtml(q.potencial)}</span>` : ''}
        <button type="button" class="btn-primary btn-importar-qr" data-idx="${i}">Importar</button>
      </div>
    </li>`).join('')}</ul>`;
  lista.querySelectorAll('.btn-importar-qr').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'Importando…';
      try {
        const r = await importarRelatoQR(relatos[Number(btn.dataset.idx)], endpoint);
        updateSyncBar();
        Sync.syncAll().catch(() => {});
        renderRelatoDetail(r.id);
      } catch (e) {
        alert(e.message);
        btn.disabled = false;
        btn.textContent = 'Importar';
      }
    });
  });
}

function renderPlacaRelatoQR(dados, url) {
  state.screen = 'relatos-qr-placa';
  view.innerHTML = `
    <div class="screen-header no-print">
      <button id="btn-back-placa-qr" class="btn-link">← Voltar</button>
      <h1>Placa de relato</h1>
    </div>
    <div class="form-actions no-print" style="margin-bottom:12px;">
      <button id="btn-imprimir-placa-qr" class="btn-primary">Imprimir</button>
    </div>
    <p class="hint no-print">Imprima em tamanho A4 ou A5 e fixe em local visível da área, na altura dos olhos. Plastifique se a área for externa ou úmida.</p>
    <div class="placa-qr">
      <div class="placa-qr-titulo">Viu um risco? Relate aqui.</div>
      <div class="placa-qr-codigo">${svgQRCode(url, 6)}</div>
      <div class="placa-qr-passos">Aponte a câmera do celular para o código.<br>Não precisa instalar nada. <strong>Pode ser anônimo.</strong></div>
      <div class="placa-qr-area">${escapeHtml([dados.area, dados.local].filter(Boolean).join(' · '))}${dados.empresa ? `<br><small>${escapeHtml(dados.empresa)}</small>` : ''}</div>
    </div>
    <p class="hint no-print" style="word-break:break-all;">Endereço do QR: <a href="${escapeHtml(url)}" target="_blank" rel="noopener">abrir a página de relato</a></p>
  `;
  document.getElementById('btn-back-placa-qr').addEventListener('click', renderRelatosQRHome);
  document.getElementById('btn-imprimir-placa-qr').addEventListener('click', () => window.print());
}
