/*
 * Auditoria de RAC – Check Básico de Campo.
 * Fluxo: Identificação > Checklist > Fechamento > Relatório.
 * Tudo é gravado no aparelho a cada alteração (IndexedDB).
 */
const view = () => document.getElementById('view');
const RESPOSTAS = { C: 'Conforme', NC: 'Não conforme', NA: 'N/A' };

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function uid() {
  return (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
}

function hojeISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function horaAgora() {
  return new Date().toTimeString().slice(0, 5);
}

function formatarDataBR(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso || '');
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 2600);
}

/* ---------------- Cálculos ---------------- */

function estatisticas(aud, secao) {
  const secoes = secao ? [secao] : secoesDaAuditoria(aud);
  let c = 0, nc = 0, na = 0, total = 0;
  secoes.forEach((s) => s.itens.forEach((it) => {
    total++;
    const r = (aud.respostas[it.id] || {}).r;
    if (r === 'C') c++; else if (r === 'NC') nc++; else if (r === 'NA') na++;
  }));
  const base = c + nc;
  return { c, nc, na, total, pendentes: total - c - nc - na, indice: base ? Math.round((c / base) * 100) : null };
}

function classeIndice(indice) {
  if (indice === null) return 'neutro';
  if (indice >= 90) return 'bom';
  if (indice >= 70) return 'atencao';
  return 'critico';
}

/* ---------------- Persistência ---------------- */

let salvarTimer = null;
function salvarDepois(aud) {
  aud.updatedAt = Date.now();
  clearTimeout(salvarTimer);
  salvarTimer = setTimeout(() => DB.put('auditorias', aud), 300);
}

async function salvarAgora(aud) {
  clearTimeout(salvarTimer);
  aud.updatedAt = Date.now();
  await DB.put('auditorias', aud);
}

function redimensionarImagem(file, maxLado = 1280, qualidade = 0.72) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const esc = Math.min(1, maxLado / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * esc);
      cv.height = Math.round(img.height * esc);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      resolve(cv.toDataURL('image/jpeg', qualidade));
    };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

/* ---------------- Câmera no computador ----------------
 * No celular, "Tirar foto" usa a câmera nativa (input com capture).
 * No computador o navegador ignora o capture e abre só a janela de
 * arquivos; por isso ali a foto é tirada pela webcam dentro do app.
 */

function usarCameraDoApp() {
  const toque = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  return !toque && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

function abrirCamera() {
  return new Promise((resolve) => {
    const fundo = document.createElement('div');
    fundo.className = 'camera-fundo';
    fundo.innerHTML = `
      <div class="camera-caixa">
        <video autoplay playsinline muted></video>
        <p class="camera-msg muted">Abrindo a câmera...</p>
        <div class="acoes-linha">
          <button type="button" class="btn sec" data-cam="cancelar">Cancelar</button>
          <button type="button" class="btn sec" data-cam="trocar" hidden>Trocar câmera</button>
          <button type="button" class="btn" data-cam="capturar" disabled>Capturar</button>
        </div>
      </div>`;
    document.body.appendChild(fundo);
    const video = fundo.querySelector('video');
    const msg = fundo.querySelector('.camera-msg');
    const btnCapturar = fundo.querySelector('[data-cam="capturar"]');
    const btnTrocar = fundo.querySelector('[data-cam="trocar"]');
    let stream = null;
    let cameras = [];
    let indice = 0;

    const parar = () => { if (stream) stream.getTracks().forEach((t) => t.stop()); stream = null; };
    const fechar = (resultado) => { parar(); fundo.remove(); resolve(resultado); };

    const iniciar = async () => {
      parar();
      btnCapturar.disabled = true;
      try {
        const video_ = cameras[indice] ? { deviceId: { exact: cameras[indice].deviceId } } : { facingMode: 'environment' };
        stream = await navigator.mediaDevices.getUserMedia({ video: { ...video_, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
        video.srcObject = stream;
        await video.play();
        msg.hidden = true;
        btnCapturar.disabled = false;
        if (!cameras.length) {
          cameras = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
          const atual = stream.getVideoTracks()[0].getSettings().deviceId;
          indice = Math.max(0, cameras.findIndex((c) => c.deviceId === atual));
        }
        btnTrocar.hidden = cameras.length < 2;
      } catch (err) {
        msg.hidden = false;
        msg.textContent = err && err.name === 'NotAllowedError'
          ? 'O navegador bloqueou o acesso à câmera. Libere a permissão no cadeado da barra de endereço ou use "Foto da galeria".'
          : 'Nenhuma câmera disponível neste computador. Use "Foto da galeria".';
      }
    };

    fundo.querySelector('[data-cam="cancelar"]').onclick = () => fechar(null);
    btnTrocar.onclick = () => { indice = (indice + 1) % cameras.length; iniciar(); };
    btnCapturar.onclick = () => {
      const esc = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
      const cv = document.createElement('canvas');
      cv.width = Math.round(video.videoWidth * esc);
      cv.height = Math.round(video.videoHeight * esc);
      cv.getContext('2d').drawImage(video, 0, 0, cv.width, cv.height);
      fechar(cv.toDataURL('image/jpeg', 0.72));
    };
    iniciar();
  });
}

/* ---------------- Início ---------------- */

async function renderInicio() {
  const auds = await DB.getAll('auditorias');
  const cards = auds.map((a) => {
    const st = estatisticas(a);
    const status = a.status === 'concluida' ? '<span class="tag ok">Concluída</span>' : '<span class="tag rascunho">Rascunho</span>';
    return `
      <div class="card aud-card">
        <div class="aud-top">
          <div>
            <strong>${escapeHtml(a.ident.empresa || 'Empresa não informada')}</strong>
            <div class="muted">${formatarDataBR(a.ident.data)} · ${escapeHtml(a.ident.area || a.ident.unidade || 'Área não informada')}</div>
            <div class="muted">Auditor: ${escapeHtml(a.ident.auditor || '—')}</div>
          </div>
          <div class="indice ${classeIndice(st.indice)}">${st.indice === null ? '—' : st.indice + '%'}</div>
        </div>
        <div class="aud-meta">${status} <span class="muted">${st.nc} não conforme(s) · ${st.pendentes} pendente(s)</span></div>
        <div class="acoes-linha">
          <button class="btn" data-abrir="${a.id}">${a.status === 'concluida' ? 'Ver / editar' : 'Continuar'}</button>
          <button class="btn sec" data-relatorio="${a.id}">Relatório</button>
          <button class="btn perigo" data-excluir="${a.id}">Excluir</button>
        </div>
      </div>`;
  }).join('');

  view().innerHTML = `
    <section class="intro card">
      <h2>Check Básico de Campo – Auditorias de RAC</h2>
      <p class="muted">Selecione os RAC aplicáveis à frente auditada. Cada item recebe Conforme, Não conforme ou N/A, com observação, foto e ação para as não conformidades. O índice considera apenas os itens Conforme e Não conforme.</p>
      <button class="btn grande" id="btn-nova">+ Nova auditoria</button>
    </section>
    <h3 class="titulo-lista">Auditorias registradas (${auds.length})</h3>
    ${cards || '<p class="muted vazio">Nenhuma auditoria registrada neste aparelho.</p>'}
    <section class="card">
      <h3>Cópia de segurança</h3>
      <p class="muted">Os dados ficam somente neste aparelho. Exporte uma cópia periodicamente (inclui as fotos).</p>
      <div class="acoes-linha">
        <button class="btn sec" id="btn-backup">Exportar cópia</button>
        <label class="btn sec">Restaurar cópia<input type="file" id="inp-restaurar" accept="application/json" hidden></label>
      </div>
    </section>`;

  document.getElementById('btn-nova').onclick = novaAuditoria;
  document.getElementById('btn-backup').onclick = exportarBackup;
  document.getElementById('inp-restaurar').onchange = (e) => restaurarBackup(e.target.files[0]);
  view().querySelectorAll('[data-abrir]').forEach((b) => { b.onclick = () => irPara(`#/auditoria/${b.dataset.abrir}/identificacao`); });
  view().querySelectorAll('[data-relatorio]').forEach((b) => { b.onclick = () => irPara(`#/relatorio/${b.dataset.relatorio}`); });
  view().querySelectorAll('[data-excluir]').forEach((b) => {
    b.onclick = async () => {
      if (!confirm('Excluir esta auditoria e suas fotos? Esta ação não pode ser desfeita.')) return;
      await DB.excluirAuditoria(b.dataset.excluir);
      renderInicio();
    };
  });
}

async function novaAuditoria() {
  const aud = {
    id: uid(),
    status: 'rascunho',
    versaoChecklist: CHECKLIST_VERSAO,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ident: {
      data: hojeISO(),
      hora: horaAgora(),
      empresa: await DB.getSetting('empresaPadrao', ''),
      contrato: '',
      unidade: await DB.getSetting('unidadePadrao', ''),
      area: '',
      atividade: '',
      auditor: await DB.getSetting('auditorPadrao', ''),
      acompanhante: '',
      logo: await logoPadraoAtual()
    },
    racs: [],
    respostas: {},
    pontos: [],
    fechamento: { comentarios: '', nomeResponsavel: '', assinaturaAuditor: '', assinaturaResponsavel: '' }
  };
  await salvarAgora(aud);
  irPara(`#/auditoria/${aud.id}/identificacao`);
}

/* ---------------- Formulário ---------------- */

const PASSOS = [
  { id: 'identificacao', rotulo: '1. Identificação' },
  { id: 'checklist', rotulo: '2. Checklist' },
  { id: 'fechamento', rotulo: '3. Fechamento' }
];

async function renderAuditoria(id, passo) {
  const aud = await DB.get('auditorias', id);
  if (!aud) { irPara('#/'); return; }
  const abas = PASSOS.map((p) => `<button class="passo ${p.id === passo ? 'ativo' : ''}" data-passo="${p.id}">${p.rotulo}</button>`).join('');
  view().innerHTML = `
    <div class="passos">${abas}</div>
    <div id="conteudo"></div>`;
  view().querySelectorAll('[data-passo]').forEach((b) => {
    b.onclick = async () => { await salvarAgora(aud); irPara(`#/auditoria/${id}/${b.dataset.passo}`); };
  });
  const el = document.getElementById('conteudo');
  if (passo === 'checklist') return renderChecklist(el, aud);
  if (passo === 'fechamento') return renderFechamento(el, aud);
  return renderIdentificacao(el, aud);
}

function campo(rotulo, nome, valor, tipo = 'text', extra = '') {
  return `<label class="campo"><span>${rotulo}</span><input type="${tipo}" name="${nome}" value="${escapeHtml(valor)}" ${extra}></label>`;
}

function renderIdentificacao(el, aud) {
  const i = aud.ident;
  const racs = CHECKLIST_RAC.filter((s) => !s.sempre).map((s) => `
    <label class="rac-opcao">
      <input type="checkbox" value="${s.id}" ${aud.racs.includes(s.id) ? 'checked' : ''}>
      <span><strong>${escapeHtml(s.titulo)}</strong><small>${s.itens.length} itens</small></span>
    </label>`).join('');

  el.innerHTML = `
    <section class="card">
      <h3>Logomarca da empresa</h3>
      <p class="muted">Aparece no cabeçalho do relatório desta auditoria.</p>
      <div data-logo-bloco></div>
    </section>
    <section class="card">
      <h3>Identificação da auditoria</h3>
      <div class="grade">
        ${campo('Data', 'data', i.data, 'date')}
        ${campo('Hora', 'hora', i.hora, 'time')}
        ${campo('Empresa / contratada', 'empresa', i.empresa)}
        ${campo('Contrato', 'contrato', i.contrato)}
        ${campo('Unidade / projeto', 'unidade', i.unidade)}
        ${campo('Área / frente de trabalho', 'area', i.area)}
        ${campo('Atividade auditada', 'atividade', i.atividade)}
        ${campo('Auditor', 'auditor', i.auditor)}
        ${campo('Acompanhante da área', 'acompanhante', i.acompanhante)}
      </div>
    </section>
    <section class="card">
      <h3>RAC aplicáveis</h3>
      <p class="muted">Marque os RAC presentes na frente auditada. As observações gerais entram sempre.</p>
      <div class="rac-lista">${racs}</div>
    </section>
    <div class="rodape-acoes">
      <button class="btn sec" id="btn-voltar">Início</button>
      <button class="btn" id="btn-seguir">Ir para o checklist</button>
    </div>`;

  el.querySelectorAll('input[name]').forEach((inp) => {
    inp.oninput = () => { aud.ident[inp.name] = inp.value; salvarDepois(aud); };
  });
  blocoLogo(el.querySelector('[data-logo-bloco]'), () => aud.ident.logo, async (valor) => {
    aud.ident.logo = valor;
    await salvarAgora(aud);
  });
  el.querySelectorAll('.rac-opcao input').forEach((cb) => {
    cb.onchange = () => {
      aud.racs = [...el.querySelectorAll('.rac-opcao input:checked')].map((x) => x.value);
      salvarDepois(aud);
    };
  });
  document.getElementById('btn-voltar').onclick = async () => { await salvarAgora(aud); irPara('#/'); };
  document.getElementById('btn-seguir').onclick = async () => {
    if (!aud.racs.length && !confirm('Nenhum RAC marcado. Seguir só com as observações gerais?')) return;
    await salvarAgora(aud);
    irPara(`#/auditoria/${aud.id}/checklist`);
  };
}

function renderChecklist(el, aud) {
  const secoes = secoesDaAuditoria(aud);
  el.innerHTML = `
    <div id="resumo-topo" class="card resumo-topo"></div>
    ${secoes.map((s) => `
      <section class="card secao" data-secao="${s.id}">
        <div class="secao-cab">
          <h3>${escapeHtml(s.titulo)}</h3>
          <span class="indice-sec" data-indice="${s.id}"></span>
        </div>
        <div class="acoes-linha pequena">
          <button class="btn mini sec" data-todos-c="${s.id}">Marcar pendentes como Conforme</button>
        </div>
        ${s.itens.map((it) => `<div class="item" data-item="${it.id}"></div>`).join('')}
      </section>`).join('')}
    <div class="rodape-acoes">
      <button class="btn sec" id="btn-ident">Identificação</button>
      <button class="btn" id="btn-fech">Ir para o fechamento</button>
    </div>`;

  secoes.forEach((s) => s.itens.forEach((it) => renderItem(el.querySelector(`[data-item="${it.id}"]`), aud, s, it)));
  atualizarResumo(el, aud);

  el.querySelectorAll('[data-todos-c]').forEach((b) => {
    b.onclick = () => {
      const s = secaoPorId(b.dataset.todosC);
      s.itens.forEach((it) => {
        const r = aud.respostas[it.id] || (aud.respostas[it.id] = {});
        if (!r.r) { r.r = 'C'; renderItem(el.querySelector(`[data-item="${it.id}"]`), aud, s, it); }
      });
      salvarDepois(aud);
      atualizarResumo(el, aud);
    };
  });
  document.getElementById('btn-ident').onclick = async () => { await salvarAgora(aud); irPara(`#/auditoria/${aud.id}/identificacao`); };
  document.getElementById('btn-fech').onclick = async () => { await salvarAgora(aud); irPara(`#/auditoria/${aud.id}/fechamento`); };
}

function atualizarResumo(el, aud) {
  const st = estatisticas(aud);
  el.querySelector('#resumo-topo').innerHTML = `
    <div class="resumo-num"><span class="indice ${classeIndice(st.indice)}">${st.indice === null ? '—' : st.indice + '%'}</span><small>Índice geral</small></div>
    <div class="resumo-num"><strong>${st.c}</strong><small>Conforme</small></div>
    <div class="resumo-num"><strong class="txt-critico">${st.nc}</strong><small>Não conforme</small></div>
    <div class="resumo-num"><strong>${st.na}</strong><small>N/A</small></div>
    <div class="resumo-num"><strong class="txt-atencao">${st.pendentes}</strong><small>Pendentes</small></div>`;
  secoesDaAuditoria(aud).forEach((s) => {
    const e = estatisticas(aud, s);
    const alvo = el.querySelector(`[data-indice="${s.id}"]`);
    if (alvo) alvo.innerHTML = `<span class="indice pequeno ${classeIndice(e.indice)}">${e.indice === null ? '—' : e.indice + '%'}</span>`;
  });
}

function linhaReferencia(it) {
  if (!it.ref && !it.prioritario) return '';
  const prazo = textoPrazo(it);
  return `<div class="item-ref">
    ${it.prioritario ? '<span class="tag-prio">Requisito prioritário</span>' : ''}
    ${it.ref ? `<span>PNR-000069: ${escapeHtml(refLimpa(it))}</span>` : ''}
    ${prazo ? `<span class="tag-prazo">${escapeHtml(prazo)}</span>` : ''}
  </div>`;
}

function renderItem(box, aud, secao, it) {
  const r = aud.respostas[it.id] || {};
  const botoes = Object.entries(RESPOSTAS).map(([k, rot]) =>
    `<button class="resp ${k.toLowerCase()} ${r.r === k ? 'marcada' : ''}" data-r="${k}">${rot}</button>`).join('');
  box.className = `item ${r.r ? 'resp-' + r.r.toLowerCase() : 'pendente'}`;
  box.innerHTML = `
    <div class="item-texto"><span class="num">${it.num}</span>${escapeHtml(it.texto)}</div>
    ${linhaReferencia(it)}
    <div class="resp-linha">${botoes}</div>
    ${htmlBotoesFoto()}
    <div class="fotos" data-fotos></div>
    <label class="campo obs"><span>Observação</span><textarea data-campo="obs" rows="2">${escapeHtml(r.obs || '')}</textarea></label>
    ${r.r === 'NC' ? `
      <div class="nc-bloco">
        <label class="campo"><span>Ação corretiva *</span><textarea data-campo="acao" rows="2">${escapeHtml(r.acao || '')}</textarea></label>
        <div class="grade">
          <label class="campo"><span>Responsável</span><input data-campo="responsavel" value="${escapeHtml(r.responsavel || '')}"></label>
          <label class="campo"><span>Prazo</span><input type="date" data-campo="prazo" value="${escapeHtml(r.prazo || '')}"></label>
        </div>
      </div>` : ''}`;

  const resp = () => aud.respostas[it.id] || (aud.respostas[it.id] = {});
  box.querySelectorAll('[data-r]').forEach((b) => {
    b.onclick = () => {
      const atual = resp();
      atual.r = atual.r === b.dataset.r ? undefined : b.dataset.r;
      salvarDepois(aud);
      renderItem(box, aud, secao, it);
      atualizarResumo(document.getElementById('conteudo'), aud);
    };
  });
  box.querySelectorAll('[data-campo]').forEach((inp) => {
    inp.oninput = () => { resp()[inp.dataset.campo] = inp.value; salvarDepois(aud); };
  });
  ligarBotoesFoto(box, aud, it.id, (fid) => { const atual = resp(); atual.fotos = (atual.fotos || []).concat(fid); }, () => renderItem(box, aud, secao, it));
  renderMiniaturas(box.querySelector('[data-fotos]'), aud, it, () => renderItem(box, aud, secao, it));
}

function renderMiniaturas(el, aud, it, aoMudar) {
  miniaturasDe(el, aud, (aud.respostas[it.id] || {}).fotos || [], async (fid) => {
    const r = aud.respostas[it.id];
    r.fotos = r.fotos.filter((x) => x !== fid);
    await salvarAgora(aud);
    aoMudar();
  });
}

/* ---------------- Fechamento ---------------- */

function pendenciasParaConcluir(aud) {
  const faltas = [];
  if (!aud.ident.empresa) faltas.push('Informe a empresa na identificação.');
  if (!aud.ident.auditor) faltas.push('Informe o auditor na identificação.');
  secoesDaAuditoria(aud).forEach((s) => s.itens.forEach((it) => {
    const r = aud.respostas[it.id] || {};
    if (!r.r) faltas.push(`${s.titulo}, item ${it.num}: sem resposta.`);
    else if (r.r === 'NC' && !(r.acao || '').trim()) faltas.push(`${s.titulo}, item ${it.num}: não conforme sem ação corretiva.`);
  }));
  return faltas;
}

function renderFechamento(el, aud) {
  const st = estatisticas(aud);
  const porSecao = secoesDaAuditoria(aud).map((s) => {
    const e = estatisticas(aud, s);
    return `<tr><td>${escapeHtml(s.titulo)}</td><td>${e.c}</td><td>${e.nc}</td><td>${e.na}</td><td>${e.pendentes}</td><td><span class="indice pequeno ${classeIndice(e.indice)}">${e.indice === null ? '—' : e.indice + '%'}</span></td></tr>`;
  }).join('');
  const f = aud.fechamento;

  el.innerHTML = `
    <section class="card">
      <h3>Resultado</h3>
      <div class="tabela-rolagem">
        <table class="tabela">
          <thead><tr><th>Seção</th><th>C</th><th>NC</th><th>N/A</th><th>Pend.</th><th>Índice</th></tr></thead>
          <tbody>${porSecao}</tbody>
          <tfoot><tr><th>Geral</th><th>${st.c}</th><th>${st.nc}</th><th>${st.na}</th><th>${st.pendentes}</th><th><span class="indice pequeno ${classeIndice(st.indice)}">${st.indice === null ? '—' : st.indice + '%'}</span></th></tr></tfoot>
        </table>
      </div>
    </section>
    <section class="card">
      <h3>Comentários do auditor</h3>
      <textarea id="comentarios" rows="4" placeholder="Pontos positivos, oportunidades de melhoria, combinados com a área...">${escapeHtml(f.comentarios)}</textarea>
    </section>
    <section class="card">
      <h3>Pontos observados e registro fotográfico</h3>
      <p class="muted">Registre pontos observados na frente auditada (boas práticas ou desvios), com o local e as fotos.</p>
      <div id="pontos"></div>
      <button type="button" class="btn sec grande" id="btn-add-ponto">+ Adicionar ponto observado</button>
    </section>
    <section class="card">
      <h3>Assinaturas (opcional)</h3>
      <div class="assinaturas">
        <div>
          <span class="muted">Auditor: ${escapeHtml(aud.ident.auditor || '—')}</span>
          <canvas class="assinatura" data-assin="assinaturaAuditor"></canvas>
          <div class="assin-acoes">
            <button type="button" class="btn mini" data-salvar-assin="assinaturaAuditor">Salvar assinatura</button>
            <button type="button" class="btn mini perigo" data-limpar="assinaturaAuditor">Limpar assinatura</button>
          </div>
          <div class="assin-status" data-status="assinaturaAuditor"></div>
        </div>
        <div>
          <label class="campo"><span>Responsável da área</span><input id="nome-resp" value="${escapeHtml(f.nomeResponsavel)}"></label>
          <canvas class="assinatura" data-assin="assinaturaResponsavel"></canvas>
          <div class="assin-acoes">
            <button type="button" class="btn mini" data-salvar-assin="assinaturaResponsavel">Salvar assinatura</button>
            <button type="button" class="btn mini perigo" data-limpar="assinaturaResponsavel">Limpar assinatura</button>
          </div>
          <div class="assin-status" data-status="assinaturaResponsavel"></div>
        </div>
      </div>
    </section>
    <div id="faltas"></div>
    <div class="rodape-acoes">
      <button class="btn sec" id="btn-check">Checklist</button>
      <button class="btn" id="btn-concluir">${aud.status === 'concluida' ? 'Salvar e ver relatório' : 'Concluir auditoria'}</button>
    </div>`;

  document.getElementById('comentarios').oninput = (e) => { f.comentarios = e.target.value; salvarDepois(aud); };
  document.getElementById('nome-resp').oninput = (e) => { f.nomeResponsavel = e.target.value; salvarDepois(aud); };
  el.querySelectorAll('canvas[data-assin]').forEach((cv) => prepararAssinatura(cv, aud));
  el.querySelectorAll('[data-salvar-assin]').forEach((b) => {
    b.onclick = async () => {
      const chave = b.dataset.salvarAssin;
      const cv = el.querySelector(`canvas[data-assin="${chave}"]`);
      if (!cv.dataset.rabiscado && !f[chave]) { toast('Assine no quadro antes de salvar.'); return; }
      if (cv.dataset.rabiscado) f[chave] = cv.toDataURL('image/png');
      await salvarAgora(aud);
      atualizarStatusAssinatura(el, aud, chave);
      toast('Assinatura salva.');
    };
  });
  el.querySelectorAll('[data-limpar]').forEach((b) => {
    b.onclick = async () => {
      const chave = b.dataset.limpar;
      f[chave] = '';
      await salvarAgora(aud);
      prepararAssinatura(el.querySelector(`canvas[data-assin="${chave}"]`), aud);
      atualizarStatusAssinatura(el, aud, chave);
      toast('Assinatura apagada.');
    };
  });
  ['assinaturaAuditor', 'assinaturaResponsavel'].forEach((k) => atualizarStatusAssinatura(el, aud, k));
  renderPontos(el.querySelector('#pontos'), aud);
  document.getElementById('btn-add-ponto').onclick = async () => {
    aud.pontos = aud.pontos || [];
    aud.pontos.push({ id: uid(), descricao: '', local: '', fotos: [] });
    await salvarAgora(aud);
    renderPontos(el.querySelector('#pontos'), aud);
    const ult = el.querySelector('#pontos .ponto:last-child textarea');
    if (ult) ult.focus();
  };
  document.getElementById('btn-check').onclick = async () => { await salvarAgora(aud); irPara(`#/auditoria/${aud.id}/checklist`); };
  document.getElementById('btn-concluir').onclick = async () => {
    const faltas = pendenciasParaConcluir(aud);
    if (faltas.length) {
      document.getElementById('faltas').innerHTML = `
        <section class="card alerta"><h3>Faltam ${faltas.length} ponto(s) para concluir</h3>
        <ul>${faltas.slice(0, 15).map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
        ${faltas.length > 15 ? `<p class="muted">e mais ${faltas.length - 15}.</p>` : ''}</section>`;
      document.getElementById('faltas').scrollIntoView({ behavior: 'smooth' });
      return;
    }
    aud.status = 'concluida';
    aud.concluidaEm = aud.concluidaEm || Date.now();
    await salvarAgora(aud);
    irPara(`#/relatorio/${aud.id}`);
  };
}

function prepararAssinatura(cv, aud) {
  const chave = cv.dataset.assin;
  const largura = cv.parentElement.clientWidth || 300;
  cv.width = largura;
  cv.height = 140;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#0a2540';
  if (aud.fechamento[chave]) {
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, cv.width, cv.height);
    img.src = aud.fechamento[chave];
  }
  let desenhando = false;
  const pos = (e) => {
    const r = cv.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  cv.onpointerdown = (e) => { desenhando = true; cv.setPointerCapture(e.pointerId); const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(x, y); };
  cv.onpointermove = (e) => { if (!desenhando) return; const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke(); };
  cv.dataset.rabiscado = '';
  cv.onpointerup = () => {
    if (!desenhando) return;
    desenhando = false;
    cv.dataset.rabiscado = '1';
    aud.fechamento[chave] = cv.toDataURL('image/png');
    salvarDepois(aud);
    const st = document.querySelector(`[data-status="${chave}"]`);
    if (st) { st.textContent = 'Assinatura feita. Toque em "Salvar assinatura" para confirmar.'; st.className = 'assin-status pendente'; }
  };
}

function atualizarStatusAssinatura(el, aud, chave) {
  const st = el.querySelector(`[data-status="${chave}"]`);
  if (!st) return;
  const tem = !!aud.fechamento[chave];
  st.textContent = tem ? 'Assinatura salva.' : 'Sem assinatura.';
  st.className = 'assin-status ' + (tem ? 'ok' : '');
}

/* ---------------- Pontos observados ---------------- */

function htmlBotoesFoto() {
  return `<div class="foto-linha">
      ${usarCameraDoApp()
        ? '<button type="button" class="btn mini sec" data-camera>Tirar foto</button>'
        : '<label class="btn mini sec">Tirar foto<input type="file" accept="image/*" capture="environment" hidden data-foto></label>'}
      <label class="btn mini sec">Foto da galeria<input type="file" accept="image/*" multiple hidden data-foto></label>
    </div>`;
}

// Liga os botões de foto de um bloco; cada foto é gravada e entregue a aoGravar(id).
function ligarBotoesFoto(box, aud, refId, aoGravar, aoTerminar) {
  const gravar = async (dataUrl) => {
    const foto = { id: uid(), auditoriaId: aud.id, itemId: refId, dataUrl, createdAt: Date.now() };
    await DB.put('fotos', foto);
    aoGravar(foto.id);
  };
  box.querySelectorAll('[data-foto]').forEach((inp) => {
    inp.onchange = async (e) => {
      for (const file of [...e.target.files]) {
        try { await gravar(await redimensionarImagem(file)); } catch (err) { toast('Não foi possível ler a foto.'); }
      }
      await salvarAgora(aud);
      aoTerminar();
    };
  });
  const cam = box.querySelector('[data-camera]');
  if (cam) {
    cam.onclick = async () => {
      const dataUrl = await abrirCamera();
      if (!dataUrl) return;
      await gravar(dataUrl);
      await salvarAgora(aud);
      aoTerminar();
    };
  }
}

async function miniaturasDe(el, aud, ids, aoRemover) {
  for (const fid of ids) {
    const f = await DB.get('fotos', fid);
    if (!f) continue;
    const d = document.createElement('div');
    d.className = 'mini';
    d.innerHTML = `<img src="${f.dataUrl}" alt="Foto"><button type="button" title="Remover foto">×</button>`;
    d.querySelector('button').onclick = async () => {
      if (!confirm('Remover esta foto?')) return;
      await DB.del('fotos', fid);
      aoRemover(fid);
    };
    el.appendChild(d);
  }
}

function renderPontos(cont, aud) {
  const pontos = aud.pontos || [];
  cont.innerHTML = pontos.length ? '' : '<p class="muted">Nenhum ponto observado registrado.</p>';
  pontos.forEach((p, n) => {
    const box = document.createElement('div');
    box.className = 'ponto';
    box.innerHTML = `
      <div class="ponto-cab"><strong>Ponto observado ${n + 1}</strong>
        <button type="button" class="btn mini perigo" data-remover>Remover</button></div>
      <label class="campo"><span>Ponto observado</span><textarea rows="3" data-p="descricao" placeholder="Descreva o que foi observado">${escapeHtml(p.descricao)}</textarea></label>
      <label class="campo"><span>Local</span><input data-p="local" value="${escapeHtml(p.local)}" placeholder="Ex.: Frente 3, plataforma do britador"></label>
      <div class="acoes-linha pequena">
        <button type="button" class="btn mini sec" data-gps>Usar localização do aparelho</button>
        <span class="muted" data-gps-txt>${typeof p.lat === 'number' ? `GPS: ${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}` : ''}</span>
      </div>
      ${htmlBotoesFoto()}
      <div class="fotos" data-fotos></div>
      <button type="button" class="btn mini" data-salvar-ponto>Salvar ponto observado</button>`;
    cont.appendChild(box);

    box.querySelectorAll('[data-p]').forEach((inp) => {
      inp.oninput = () => { p[inp.dataset.p] = inp.value; salvarDepois(aud); };
    });
    box.querySelector('[data-salvar-ponto]').onclick = async () => {
      await salvarAgora(aud);
      toast(`Ponto observado ${n + 1} salvo.`);
    };
    box.querySelector('[data-remover]').onclick = async () => {
      if (!confirm('Remover este ponto observado e suas fotos?')) return;
      for (const fid of p.fotos || []) await DB.del('fotos', fid);
      aud.pontos = aud.pontos.filter((x) => x.id !== p.id);
      await salvarAgora(aud);
      renderPontos(cont, aud);
    };
    box.querySelector('[data-gps]').onclick = () => {
      if (!navigator.geolocation) { toast('Localização indisponível neste aparelho.'); return; }
      const txt = box.querySelector('[data-gps-txt]');
      txt.textContent = 'Obtendo localização...';
      navigator.geolocation.getCurrentPosition((pos) => {
        p.lat = pos.coords.latitude;
        p.lon = pos.coords.longitude;
        txt.textContent = `GPS: ${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}`;
        salvarDepois(aud);
      }, () => { txt.textContent = 'Não foi possível obter a localização.'; }, { enableHighAccuracy: true, timeout: 15000 });
    };
    ligarBotoesFoto(box, aud, 'ponto:' + p.id, (fid) => { p.fotos = (p.fotos || []).concat(fid); }, () => renderPontos(cont, aud));
    miniaturasDe(box.querySelector('[data-fotos]'), aud, p.fotos || [], async (fid) => {
      p.fotos = p.fotos.filter((x) => x !== fid);
      await salvarAgora(aud);
      renderPontos(cont, aud);
    });
  });
}

/* ---------------- Exportação e cópia de segurança ---------------- */

function baixarArquivo(nome, conteudo, tipo) {
  const blob = conteudo instanceof Blob ? conteudo : new Blob([conteudo], { type: tipo });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

function exportarPlanilha(aud) {
  const csv = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const i = aud.ident;
  const linhas = [['Data', 'Hora', 'Empresa', 'Contrato', 'Unidade', 'Área', 'Atividade', 'Auditor', 'Seção', 'Item', 'Descrição', 'Referência PNR-000069', 'Prioritário', 'Resposta', 'Observação', 'Ação corretiva', 'Responsável', 'Prazo', 'Fotos']];
  secoesDaAuditoria(aud).forEach((s) => s.itens.forEach((it) => {
    const r = aud.respostas[it.id] || {};
    linhas.push([formatarDataBR(i.data), i.hora, i.empresa, i.contrato, i.unidade, i.area, i.atividade, i.auditor, s.titulo, it.num, it.texto, refLimpa(it), it.prioritario ? 'Sim' : 'Não',
      RESPOSTAS[r.r] || 'Sem resposta', r.obs, r.acao, r.responsavel, formatarDataBR(r.prazo), (r.fotos || []).length]);
  }));
  const conteudo = '﻿' + linhas.map((l) => l.map(csv).join(';')).join('\r\n');
  baixarArquivo(`Auditoria_RAC_${i.data}_${(i.empresa || 'empresa').replace(/[^\w]+/g, '_')}.csv`, conteudo, 'text/csv;charset=utf-8');
}

async function exportarBackup() {
  const auditorias = await DB.getAll('auditorias');
  const fotos = await DB.getAll('fotos');
  const pacote = { app: 'rac-campo', versao: 1, geradoEm: new Date().toISOString(), auditorias, fotos };
  baixarArquivo(`Copia_RAC_Campo_${hojeISO()}.json`, JSON.stringify(pacote), 'application/json');
}

async function restaurarBackup(file) {
  if (!file) return;
  try {
    const pacote = JSON.parse(await file.text());
    if (pacote.app !== 'rac-campo') throw new Error('arquivo de outro aplicativo');
    if (!confirm(`Restaurar ${pacote.auditorias.length} auditoria(s)? Registros com o mesmo identificador serão substituídos.`)) return;
    for (const a of pacote.auditorias) await DB.put('auditorias', a);
    for (const f of pacote.fotos || []) await DB.put('fotos', f);
    toast('Cópia restaurada.');
    renderInicio();
  } catch (err) {
    alert('Não foi possível restaurar: ' + err.message);
  }
}

/* ---------------- Configurações ---------------- */

async function renderConfig() {
  const auditor = await DB.getSetting('auditorPadrao', '');
  const empresa = await DB.getSetting('empresaPadrao', '');
  const unidade = await DB.getSetting('unidadePadrao', '');
  view().innerHTML = `
    <section class="card">
      <h3>Preenchimento automático</h3>
      <p class="muted">Estes dados entram automaticamente em cada nova auditoria.</p>
      <div class="grade">
        ${campo('Auditor', 'auditorPadrao', auditor)}
        ${campo('Empresa / contratada', 'empresaPadrao', empresa)}
        ${campo('Unidade / projeto', 'unidadePadrao', unidade)}
      </div>
    </section>
    <section class="card">
      <h3>Logomarca padrão</h3>
      <p class="muted">Entra automaticamente no cabeçalho de cada nova auditoria. Em cada auditoria é possível trocar ou remover.</p>
      <div data-logo-padrao></div>
    </section>
    <section class="card">
      <h3>Sobre</h3>
      <p class="muted">Checklist: ${escapeHtml(CHECKLIST_VERSAO)}. Referência: PNR-000069 Rev. 11 – Requisitos de Atividades Críticas.</p>
    </section>
    <div class="rodape-acoes"><button class="btn" id="btn-ok">Voltar</button></div>`;
  view().querySelectorAll('input[name]').forEach((inp) => {
    inp.onchange = () => DB.setSetting(inp.name, inp.value.trim());
  });
  let logoPadrao = await logoPadraoAtual();
  blocoLogo(view().querySelector('[data-logo-padrao]'), () => logoPadrao, async (valor) => {
    logoPadrao = valor;
    await DB.setSetting('logoPadrao', valor);
  });
  document.getElementById('btn-ok').onclick = () => irPara('#/');
}

/* ---------------- Logomarca ---------------- */

// Logomarca do projeto piloto (REDE Montagens Eletromecânicas), usada como
// padrão enquanto o usuário não escolher outra ou remover nas configurações.
const LOGO_EMBUTIDA = 'icons/logo-padrao.png';

async function logoPadraoAtual() {
  const salva = await DB.getSetting('logoPadrao', null);
  if (salva !== null) return salva;
  try {
    const blob = await (await fetch(LOGO_EMBUTIDA)).blob();
    return await new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(leitor.result);
      leitor.onerror = reject;
      leitor.readAsDataURL(blob);
    });
  } catch (err) {
    return '';
  }
}

// Reduz a imagem para no máximo 600 x 200 px, mantendo a transparência (PNG).
function redimensionarLogo(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const esc = Math.min(1, 600 / img.width, 200 / img.height);
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(img.width * esc));
      cv.height = Math.max(1, Math.round(img.height * esc));
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      resolve(cv.toDataURL('image/png'));
    };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

function blocoLogo(el, obter, gravar) {
  const desenhar = () => {
    const logo = obter();
    el.innerHTML = `
      <div class="logo-prev">${logo ? `<img src="${logo}" alt="Logomarca da empresa">` : '<span class="muted">Nenhuma logomarca inserida.</span>'}</div>
      <div class="acoes-linha pequena">
        <label class="btn mini">${logo ? 'Trocar logomarca' : 'Inserir logomarca da empresa'}<input type="file" accept="image/*" hidden data-logo-arquivo></label>
        ${logo ? '<button type="button" class="btn mini perigo" data-logo-remover>Remover logomarca</button>' : ''}
      </div>`;
    el.querySelector('[data-logo-arquivo]').onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        await gravar(await redimensionarLogo(file));
        toast('Logomarca inserida.');
      } catch (err) {
        toast('Não foi possível ler a imagem.');
      }
      desenhar();
    };
    const rem = el.querySelector('[data-logo-remover]');
    if (rem) {
      rem.onclick = async () => {
        if (!confirm('Remover a logomarca?')) return;
        await gravar('');
        desenhar();
      };
    }
  };
  desenhar();
}

/* ---------------- Rotas ---------------- */

function irPara(hash) {
  if (location.hash === hash) rotear();
  else location.hash = hash;
}

async function rotear() {
  window.scrollTo(0, 0);
  document.body.classList.remove('modo-relatorio');
  const partes = location.hash.replace(/^#\/?/, '').split('/');
  if (partes[0] === 'auditoria' && partes[1]) return renderAuditoria(partes[1], partes[2] || 'identificacao');
  if (partes[0] === 'relatorio' && partes[1]) return renderRelatorio(partes[1]);
  if (partes[0] === 'config') return renderConfig();
  return renderInicio();
}

function atualizarConexao() {
  const el = document.getElementById('conn');
  el.textContent = navigator.onLine ? 'Online' : 'Offline';
  el.className = 'conn ' + (navigator.onLine ? 'on' : 'off');
}

function init() {
  document.getElementById('btn-home').onclick = () => irPara('#/');
  document.getElementById('btn-config').onclick = () => irPara('#/config');
  window.addEventListener('hashchange', rotear);
  window.addEventListener('online', atualizarConexao);
  window.addEventListener('offline', atualizarConexao);
  atualizarConexao();
  rotear();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', init);
