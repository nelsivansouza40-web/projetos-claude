/*
 * Relatório da auditoria de RAC.
 * Montado em HTML dentro do próprio app (sem internet) e exportado para
 * PDF pela impressão nativa do navegador ("Salvar como PDF").
 */

function codigoRelatorio(aud) {
  return `AUD-RAC-${(aud.ident.data || '').replace(/-/g, '') || 'SDATA'}-${aud.id.slice(0, 6).toUpperCase()}`;
}

async function renderRelatorio(id) {
  const aud = await DB.get('auditorias', id);
  if (!aud) { irPara('#/'); return; }
  const fotos = {};
  (await DB.fotosDaAuditoria(id)).forEach((f) => { fotos[f.id] = f; });

  const i = aud.ident;
  const st = estatisticas(aud);
  const secoes = secoesDaAuditoria(aud);
  const indiceTxt = (e) => (e.indice === null ? '—' : e.indice + '%');

  const resumo = secoes.map((s) => {
    const e = estatisticas(aud, s);
    return `<tr><td>${escapeHtml(s.titulo)}</td><td>${e.c}</td><td>${e.nc}</td><td>${e.na}</td><td><strong>${indiceTxt(e)}</strong></td></tr>`;
  }).join('');

  const detalhe = secoes.map((s) => `
    <h3 class="rel-sec">${escapeHtml(s.titulo)} <span>${indiceTxt(estatisticas(aud, s))}</span></h3>
    <table class="rel-tab">
      <thead><tr><th class="c-num">Nº</th><th>Item verificado</th><th class="c-resp">Resultado</th></tr></thead>
      <tbody>
        ${s.itens.map((it) => {
          const r = aud.respostas[it.id] || {};
          const det = [];
          if (r.obs) det.push(`<div><em>Observação:</em> ${escapeHtml(r.obs)}</div>`);
          if (r.r === 'NC') {
            det.push(`<div><em>Ação corretiva:</em> ${escapeHtml(r.acao || '—')}` +
              `${r.responsavel ? ` · <em>Responsável:</em> ${escapeHtml(r.responsavel)}` : ''}` +
              `${r.prazo ? ` · <em>Prazo:</em> ${formatarDataBR(r.prazo)}` : ''}</div>`);
          }
          const imgs = (r.fotos || []).map((fid) => fotos[fid]).filter(Boolean)
            .map((f) => `<img src="${f.dataUrl}" alt="Evidência do item ${it.num}">`).join('');
          return `<tr class="${r.r ? 'r-' + r.r.toLowerCase() : ''}">
            <td class="c-num">${it.num}</td>
            <td>${escapeHtml(it.texto)}${it.ref ? `<div class="rel-ref">PNR-000069: ${escapeHtml(refLimpa(it))}${it.prioritario ? ' · Requisito prioritário' : ''}</div>` : ''}${det.join('')}${imgs ? `<div class="rel-fotos">${imgs}</div>` : ''}</td>
            <td class="c-resp">${RESPOSTAS[r.r] || 'Sem resposta'}</td></tr>`;
        }).join('')}
      </tbody>
    </table>`).join('');

  const ncs = [];
  secoes.forEach((s) => s.itens.forEach((it) => {
    const r = aud.respostas[it.id] || {};
    if (r.r === 'NC') ncs.push({ s, it, r });
  }));
  const planoAcao = ncs.length ? `
    <h2>Plano de ação</h2>
    <table class="rel-tab">
      <thead><tr><th>RAC / item</th><th>Não conformidade</th><th>Ação corretiva</th><th>Responsável</th><th>Prazo</th></tr></thead>
      <tbody>${ncs.map(({ s, it, r }) => `<tr>
        <td>${escapeHtml(s.titulo.split(' – ')[0])} · ${it.num}</td>
        <td>${escapeHtml(it.texto)}</td>
        <td>${escapeHtml(r.acao || '—')}</td>
        <td>${escapeHtml(r.responsavel || '—')}</td>
        <td>${formatarDataBR(r.prazo) || '—'}</td></tr>`).join('')}
      </tbody>
    </table>` : '<h2>Plano de ação</h2><p>Não foram registradas não conformidades.</p>';

  const f = aud.fechamento;
  const assin = (img, nome, papel) => `
    <div class="rel-assin">
      ${img ? `<img src="${img}" alt="Assinatura">` : '<div class="linha-assin"></div>'}
      <div>${escapeHtml(nome || '')}</div><small>${papel}</small>
    </div>`;

  document.body.classList.add('modo-relatorio');
  view().innerHTML = `
    <div class="rel-barra nao-imprimir">
      <button class="btn sec" id="rel-voltar">Voltar</button>
      <button class="btn sec" id="rel-editar">Editar</button>
      <button class="btn sec" id="rel-csv">Exportar planilha</button>
      <button class="btn" id="rel-pdf">Salvar em PDF / imprimir</button>
    </div>
    ${ehIOS() ? '<p class="dica-ios nao-imprimir">No iPhone: na tela de impressão, toque em Compartilhar (no alto) e escolha Salvar em Arquivos, ou envie por e-mail ou WhatsApp.</p>' : ''}
    ${aud.status !== 'concluida' ? '<p class="aviso nao-imprimir">Auditoria em rascunho: o relatório mostra o preenchimento atual.</p>' : ''}
    <article class="relatorio">
      <header class="rel-cab">
        ${i.logo ? `<div class="rel-logo"><img src="${i.logo}" alt="Logomarca da empresa"></div>` : ''}
        <div class="rel-titulo">
          <h1>Relatório de Auditoria de RAC</h1>
          <div>Check Básico de Campo · Referência: PNR-000069 Rev. 11</div>
        </div>
        <div class="rel-cod">
          <div><strong>${codigoRelatorio(aud)}</strong></div>
          <div>${aud.status === 'concluida' ? 'Concluída' : 'Rascunho'}</div>
        </div>
      </header>
      <table class="rel-ident">
        <tr><th>Data / hora</th><td>${formatarDataBR(i.data)} ${escapeHtml(i.hora)}</td><th>Empresa</th><td>${escapeHtml(i.empresa)}</td></tr>
        <tr><th>Contrato</th><td>${escapeHtml(i.contrato)}</td><th>Unidade / projeto</th><td>${escapeHtml(i.unidade)}</td></tr>
        <tr><th>Área / frente</th><td>${escapeHtml(i.area)}</td><th>Atividade</th><td>${escapeHtml(i.atividade)}</td></tr>
        <tr><th>Auditor</th><td>${escapeHtml(i.auditor)}</td><th>Acompanhante</th><td>${escapeHtml(i.acompanhante)}</td></tr>
      </table>

      <h2>Resultado</h2>
      <div class="rel-kpis">
        <div><strong>${indiceTxt(st)}</strong><span>Índice geral de conformidade</span></div>
        <div><strong>${st.c}</strong><span>Conforme</span></div>
        <div><strong>${st.nc}</strong><span>Não conforme</span></div>
        <div><strong>${st.na}</strong><span>N/A</span></div>
      </div>
      <table class="rel-tab">
        <thead><tr><th>Seção</th><th>C</th><th>NC</th><th>N/A</th><th>Índice</th></tr></thead>
        <tbody>${resumo}</tbody>
      </table>
      <p class="rel-nota">Índice = itens conformes ÷ (conformes + não conformes). Itens N/A não entram no cálculo.</p>

      ${planoAcao}

      <h2>Itens verificados</h2>
      ${detalhe}

      ${(aud.pontos || []).length ? `<h2>Pontos observados e registro fotográfico</h2>
        ${aud.pontos.map((p, n) => {
          const imgs = (p.fotos || []).map((fid) => fotos[fid]).filter(Boolean)
            .map((ft) => `<img src="${ft.dataUrl}" alt="Foto do ponto observado ${n + 1}">`).join('');
          const gps = typeof p.lat === 'number'
            ? ` · <a href="https://www.google.com/maps?q=${p.lat.toFixed(6)},${p.lon.toFixed(6)}" target="_blank" rel="noopener">GPS ${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}</a>` : '';
          return `<div class="rel-ponto">
            <div class="rel-ponto-cab"><strong>Ponto observado ${n + 1}</strong>${p.local ? ` · Local: ${escapeHtml(p.local)}` : ''}${gps}</div>
            ${p.descricao ? `<p class="rel-texto">${escapeHtml(p.descricao)}</p>` : ''}
            ${imgs ? `<div class="rel-fotos">${imgs}</div>` : ''}
          </div>`;
        }).join('')}` : ''}

      ${f.comentarios ? `<h2>Comentários do auditor</h2><p class="rel-texto">${escapeHtml(f.comentarios)}</p>` : ''}

      <div class="rel-assinaturas">
        ${assin(f.assinaturaAuditor, i.auditor, 'Auditor')}
        ${assin(f.assinaturaResponsavel, f.nomeResponsavel, 'Responsável da área')}
      </div>
    </article>`;

  document.getElementById('rel-voltar').onclick = () => irPara('#/');
  document.getElementById('rel-editar').onclick = () => irPara(`#/auditoria/${aud.id}/checklist`);
  document.getElementById('rel-csv').onclick = () => exportarPlanilha(aud);
  document.getElementById('rel-pdf').onclick = () => {
    const tituloAnterior = document.title;
    document.title = codigoRelatorio(aud);
    window.print();
    setTimeout(() => { document.title = tituloAnterior; }, 1000);
  };
}
