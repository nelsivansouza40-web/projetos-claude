/* Equipamentos e locais com QR code.
 * Cada equipamento (extintor, andaime, máquina, área) recebe uma etiqueta
 * com QR code. O QR aponta para o endereço do app com os dados do
 * equipamento; ao ler a etiqueta com a câmera do celular (ou pelo leitor do
 * próprio app), abre-se a ficha do equipamento com o histórico de
 * inspeções e o botão para iniciar uma nova. Se o equipamento ainda não
 * existir naquele aparelho, ele é cadastrado automaticamente a partir dos
 * dados da etiqueta. */

const URL_APP_PUBLICADO = 'https://nelsivansouza40-web.github.io/projetos-claude/';

function novoEquipamento() {
  return {
    id: uuid(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    codigo: '',
    nome: '',
    categoria: '',
    local: '',
    disciplina: 'Segurança',
    tipoInspecao: '',
    observacao: ''
  };
}

async function proximoCodigoEquipamento() {
  const todos = await DB.getAllItems('equipamentos');
  const nums = todos.map((e) => Number((e.codigo || '').replace(/\D/g, ''))).filter((n) => n > 0);
  return 'EQ-' + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, '0');
}

function urlEquipamento(eq) {
  const base = location.protocol.startsWith('http') && !/localhost|127\.0\.0\.1/.test(location.host)
    ? location.origin + location.pathname
    : URL_APP_PUBLICADO;
  const p = new URLSearchParams({ eq: eq.id, c: eq.codigo, n: eq.nome, t: eq.tipoInspecao || '', d: eq.disciplina || '', l: eq.local || '' });
  return `${base}#${p.toString()}`;
}

function svgQRCode(texto, tamanhoCelula = 4) {
  if (typeof qrcode !== 'function') return '<p class="hint">Gerador de QR indisponível.</p>';
  const qr = qrcode(0, 'M');
  qr.addData(texto);
  qr.make();
  return qr.createSvgTag(tamanhoCelula, 2);
}

/** Inspeções (concluídas ou não) vinculadas a um equipamento, da mais recente para a mais antiga. */
async function inspecoesDoEquipamento(eqId) {
  const todas = await DB.getAllInspections();
  return todas.filter((i) => i.data.equipamentoId === eqId)
    .sort((a, b) => (b.data.identificacao.data || '').localeCompare(a.data.identificacao.data || ''));
}

/* ---------------- LISTA ---------------- */

async function renderEquipamentosHome() {
  state.screen = 'equipamentos-home';
  setActiveTab('inspecoes');
  const lista = await DB.getAllItems('equipamentos');
  lista.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
  const inspecoes = await DB.getAllInspections();
  const ultima = (id) => inspecoes.filter((i) => i.completo && i.data.equipamentoId === id)
    .map((i) => i.data.identificacao.data).sort().pop();

  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-home" class="btn-link">← Voltar</button>
      <h1>Equipamentos e locais</h1>
    </div>
    <div class="form-actions acoes-envio">
      <button id="btn-novo-eq" class="btn-primary">+ Novo equipamento</button>
      <button id="btn-ler-qr" class="btn-secondary">Ler QR code</button>
      ${lista.length ? '<button id="btn-etiquetas" class="btn-secondary">Imprimir etiquetas</button>' : ''}
    </div>
    <p class="hint">Cadastre extintores, andaimes, máquinas, veículos ou áreas. Cada um recebe uma etiqueta com QR code: basta apontar a câmera do celular para abrir a ficha e iniciar a inspeção.</p>
    <ul class="insp-list">
      ${lista.length ? lista.map((e) => {
        const u = ultima(e.id);
        return `
        <li class="insp-card" data-id="${e.id}">
          <div class="insp-card-main">
            <div class="insp-card-title">${escapeHtml(e.codigo)} — ${escapeHtml(e.nome)}</div>
            <div class="insp-card-sub">${escapeHtml([e.categoria, e.local].filter(Boolean).join(' · '))}</div>
            <div class="insp-card-sub">Última inspeção: ${u ? formatarDataBR(u) : 'nenhuma'}</div>
          </div>
          <div class="insp-card-side">${seloDisciplina({ data: { disciplina: e.disciplina, tipoInspecao: e.tipoInspecao } })}</div>
        </li>`;
      }).join('') : '<li class="empty-state">Nenhum equipamento cadastrado.</li>'}
    </ul>
  `;
  document.getElementById('btn-back-home').addEventListener('click', renderHome);
  document.getElementById('btn-novo-eq').addEventListener('click', () => renderEquipamentoForm(null));
  document.getElementById('btn-ler-qr').addEventListener('click', abrirLeitorQR);
  const btnEt = document.getElementById('btn-etiquetas');
  if (btnEt) btnEt.addEventListener('click', () => renderEtiquetas(lista));
  view.querySelectorAll('.insp-card').forEach((el) => el.addEventListener('click', () => renderEquipamentoDetail(el.dataset.id)));
}

/* ---------------- CADASTRO ---------------- */

async function renderEquipamentoForm(id) {
  state.screen = 'equipamento-form';
  const eq = id ? await DB.getItem('equipamentos', id) : novoEquipamento();
  if (!id) eq.codigo = await proximoCodigoEquipamento();
  const discOpts = DISCIPLINAS_INSPECAO.map((d) => `<option value="${escapeHtml(d.id)}" ${eq.disciplina === d.id ? 'selected' : ''}>${escapeHtml(d.rotulo)}</option>`).join('');
  const tiposOpts = (disc) => '<option value="">Escolher na hora</option>' + dadosDisciplina(disc).tipos
    .map((t) => `<option ${eq.tipoInspecao === t ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('');

  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-eq" class="btn-link">← Voltar</button>
      <h1>${id ? 'Editar equipamento' : 'Novo equipamento'}</h1>
    </div>
    <form id="form-eq" class="form-section">
      <label>Código *
        <input type="text" name="codigo" required value="${escapeHtml(eq.codigo)}">
      </label>
      <label>Nome / descrição *
        <input type="text" name="nome" required placeholder="Ex.: Extintor PQS 6 kg nº 12, Andaime fachadeiro bloco B" value="${escapeHtml(eq.nome)}">
      </label>
      <label>Categoria
        <input type="text" name="categoria" placeholder="Ex.: Extintor, Andaime, Máquina, Veículo, Área" value="${escapeHtml(eq.categoria)}">
      </label>
      <label>Local / área
        <input type="text" name="local" value="${escapeHtml(eq.local)}">
      </label>
      <label>Disciplina da inspeção
        <select name="disciplina">${discOpts}</select>
      </label>
      <label>Checklist padrão deste equipamento
        <select name="tipoInspecao">${tiposOpts(eq.disciplina)}</select>
      </label>
      <label>Observações
        <textarea name="observacao" rows="2">${escapeHtml(eq.observacao)}</textarea>
      </label>
      <div class="form-actions">
        ${id ? '<button type="button" id="btn-excluir-eq" class="btn-danger">Excluir</button>' : ''}
        <button type="submit" class="btn-primary">Salvar</button>
      </div>
    </form>
  `;
  const form = document.getElementById('form-eq');
  form.querySelector('[name="disciplina"]').addEventListener('change', (e) => {
    form.querySelector('[name="tipoInspecao"]').innerHTML = tiposOpts(e.target.value);
  });
  document.getElementById('btn-back-eq').addEventListener('click', () => (id ? renderEquipamentoDetail(id) : renderEquipamentosHome()));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    ['codigo', 'nome', 'categoria', 'local', 'disciplina', 'tipoInspecao', 'observacao'].forEach((k) => { eq[k] = (fd.get(k) || '').trim(); });
    eq.updatedAt = Date.now();
    await DB.putItem('equipamentos', eq);
    renderEquipamentoDetail(eq.id);
  });
  const btnEx = document.getElementById('btn-excluir-eq');
  if (btnEx) btnEx.addEventListener('click', async () => {
    if (!confirm('Excluir este equipamento? As inspeções já feitas continuam salvas.')) return;
    await DB.deleteItem('equipamentos', eq.id);
    renderEquipamentosHome();
  });
}

/* ---------------- FICHA DO EQUIPAMENTO ---------------- */

async function renderEquipamentoDetail(id) {
  state.screen = 'equipamento-detail';
  const eq = await DB.getItem('equipamentos', id);
  if (!eq) return renderEquipamentosHome();
  const historico = await inspecoesDoEquipamento(id);
  const programacoes = (await DB.getAllItems('programacoes')).filter((p) => p.equipamentoId === id);

  view.innerHTML = `
    <div class="screen-header">
      <button id="btn-back-eq" class="btn-link">← Voltar</button>
      <h1>${escapeHtml(eq.codigo)} — ${escapeHtml(eq.nome)}</h1>
    </div>
    <div class="eq-ficha">
      <div class="eq-qr">${svgQRCode(urlEquipamento(eq), 4)}</div>
      <div class="detail-block">
        <p>${seloDisciplina({ data: { disciplina: eq.disciplina, tipoInspecao: eq.tipoInspecao } })}</p>
        ${eq.categoria ? `<p>Categoria: ${escapeHtml(eq.categoria)}</p>` : ''}
        ${eq.local ? `<p>Local: ${escapeHtml(eq.local)}</p>` : ''}
        <p>Checklist padrão: ${escapeHtml(eq.tipoInspecao || 'escolher na hora')}</p>
        ${eq.observacao ? `<p>${escapeHtml(eq.observacao)}</p>` : ''}
      </div>
    </div>
    <div class="form-actions acoes-envio">
      <button id="btn-inspecionar-eq" class="btn-primary">Iniciar inspeção</button>
      <button id="btn-programar-eq" class="btn-secondary">Programar inspeção</button>
      <button id="btn-etiqueta-eq" class="btn-secondary">Imprimir etiqueta</button>
      <button id="btn-editar-eq" class="btn-secondary">Editar</button>
    </div>
    ${programacoes.length ? `<h3>Programação</h3><ul class="insp-list">${(await Promise.all(programacoes.map(async (p) => {
      const s = await situacaoProgramacao(p);
      return `<li class="insp-card"><div class="insp-card-main"><div class="insp-card-title">${escapeHtml(p.tipoInspecao || p.titulo)}</div><div class="insp-card-sub">${escapeHtml(p.frequencia)} · próxima: ${s.proxima ? formatarDataBR(s.proxima) : '—'}</div></div><div class="insp-card-side"><span class="badge ${s.cls}">${s.text}</span></div></li>`;
    }))).join('')}</ul>` : ''}
    <h3>Histórico de inspeções (${historico.length})</h3>
    <ul class="insp-list">
      ${historico.length ? historico.map((i) => {
        const nc = i.data.checklist.filter((x) => x.resposta === 'Não Conforme').length;
        return `<li class="insp-card" data-insp="${i.id}">
          <div class="insp-card-main">
            <div class="insp-card-title">${escapeHtml(i.data.tipoInspecao || 'Inspeção')}</div>
            <div class="insp-card-sub">${formatarDataBR(i.data.identificacao.data)} · ${escapeHtml(i.data.identificacao.inspetor || '')}</div>
          </div>
          <div class="insp-card-side">
            ${i.completo ? `<span class="badge ${nc ? 'badge-erro' : 'badge-ok'}">${nc ? nc + ' NC' : 'Conforme'}</span>` : '<span class="badge badge-rascunho">Rascunho</span>'}
          </div>
        </li>`;
      }).join('') : '<li class="empty-state">Nenhuma inspeção deste equipamento ainda.</li>'}
    </ul>
  `;
  document.getElementById('btn-back-eq').addEventListener('click', renderEquipamentosHome);
  document.getElementById('btn-editar-eq').addEventListener('click', () => renderEquipamentoForm(id));
  document.getElementById('btn-etiqueta-eq').addEventListener('click', () => renderEtiquetas([eq]));
  document.getElementById('btn-programar-eq').addEventListener('click', () => renderProgramacaoForm(null, { equipamentoId: eq.id, disciplina: eq.disciplina, tipoInspecao: eq.tipoInspecao, area: eq.local, titulo: eq.nome }));
  document.getElementById('btn-inspecionar-eq').addEventListener('click', () => iniciarInspecaoPreenchida({
    disciplina: eq.disciplina, tipoInspecao: eq.tipoInspecao, area: eq.local, equipamentoId: eq.id
  }));
  view.querySelectorAll('[data-insp]').forEach((el) => el.addEventListener('click', () => openInspection(el.dataset.insp)));
}

/* ---------------- ETIQUETAS ---------------- */

function renderEtiquetas(lista) {
  state.screen = 'etiquetas';
  view.innerHTML = `
    <div class="screen-header no-print">
      <button id="btn-back-et" class="btn-link">← Voltar</button>
      <h1>Etiquetas QR</h1>
    </div>
    <div class="form-actions no-print" style="margin-bottom:12px;">
      <button id="btn-imprimir-et" class="btn-primary">Imprimir</button>
    </div>
    <p class="hint no-print">Imprima em papel adesivo ou plastifique. Recomenda-se no mínimo 4 cm de lado para leitura a 30 cm.</p>
    <div class="etiquetas-grid">
      ${lista.map((e) => `
        <div class="etiqueta">
          <div class="etiqueta-qr">${svgQRCode(urlEquipamento(e), 3)}</div>
          <div class="etiqueta-texto">
            <strong>${escapeHtml(e.codigo)}</strong>
            <span>${escapeHtml(e.nome)}</span>
            <small>${escapeHtml(e.local || '')}</small>
            <small>Aponte a câmera para inspecionar</small>
          </div>
        </div>`).join('')}
    </div>
  `;
  document.getElementById('btn-back-et').addEventListener('click', () => (lista.length === 1 ? renderEquipamentoDetail(lista[0].id) : renderEquipamentosHome()));
  document.getElementById('btn-imprimir-et').addEventListener('click', () => window.print());
}

/* ---------------- LEITURA DO QR ---------------- */

/** Trata endereços do tipo ...#eq=ID&c=COD&n=NOME (etiqueta lida pela câmera do celular). */
async function tratarLinkEquipamento() {
  const hash = location.hash.replace(/^#/, '');
  if (!hash.startsWith('eq=')) return false;
  const p = new URLSearchParams(hash);
  // O endereço só é limpo alguns segundos depois: na primeira abertura, o app
  // pode recarregar sozinho ao ativar o modo offline, e o link precisa
  // continuar no endereço para a ficha abrir de novo após essa recarga.
  setTimeout(() => {
    if (location.hash.replace(/^#/, '') === hash) history.replaceState(null, '', location.pathname + location.search);
  }, 5000);
  return abrirEquipamentoPorDados({ id: p.get('eq'), codigo: p.get('c'), nome: p.get('n'), tipoInspecao: p.get('t'), disciplina: p.get('d'), local: p.get('l') });
}

async function abrirEquipamentoPorDados(d) {
  if (!d.id) return false;
  let eq = await DB.getItem('equipamentos', d.id);
  if (!eq) {
    // Equipamento cadastrado em outro aparelho: cria a ficha com os dados da etiqueta.
    eq = { ...novoEquipamento(), id: d.id, codigo: d.codigo || '', nome: d.nome || 'Equipamento', tipoInspecao: d.tipoInspecao || '', disciplina: d.disciplina || 'Segurança', local: d.local || '' };
    await DB.putItem('equipamentos', eq);
  }
  renderEquipamentoDetail(eq.id);
  return true;
}

async function abrirLeitorQR() {
  if (!('BarcodeDetector' in window) || !navigator.mediaDevices) {
    alert('Este aparelho não tem leitor de QR pelo navegador. Use a câmera do celular: aponte para a etiqueta e toque no link que aparecer — o app abre direto na ficha do equipamento.');
    return;
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
  } catch (e) {
    alert('Não foi possível abrir a câmera: ' + e.message);
    return;
  }
  const overlay = document.createElement('div');
  overlay.className = 'leitor-qr';
  overlay.innerHTML = `
    <video autoplay playsinline muted></video>
    <div class="leitor-qr-mira"></div>
    <p>Aponte para a etiqueta QR do equipamento</p>
    <button type="button" class="btn-secondary">Cancelar</button>
  `;
  document.body.appendChild(overlay);
  const video = overlay.querySelector('video');
  video.srcObject = stream;
  const detector = new BarcodeDetector({ formats: ['qr_code'] });
  let ativo = true;
  const fechar = () => {
    ativo = false;
    stream.getTracks().forEach((t) => t.stop());
    overlay.remove();
  };
  overlay.querySelector('button').addEventListener('click', fechar);
  const procurar = async () => {
    if (!ativo) return;
    try {
      const codigos = await detector.detect(video);
      const lido = codigos.find((c) => /[#&]?eq=/.test(c.rawValue));
      if (lido) {
        fechar();
        const p = new URLSearchParams(lido.rawValue.split('#')[1] || '');
        await abrirEquipamentoPorDados({ id: p.get('eq'), codigo: p.get('c'), nome: p.get('n'), tipoInspecao: p.get('t'), disciplina: p.get('d'), local: p.get('l') });
        return;
      }
    } catch (e) { /* quadro ainda sem imagem */ }
    setTimeout(procurar, 300);
  };
  video.addEventListener('loadeddata', procurar, { once: true });
}
