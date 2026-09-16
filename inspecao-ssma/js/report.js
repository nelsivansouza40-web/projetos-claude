/*
 * Relatório técnico fotográfico de inspeção.
 * Gera um documento HTML dentro do próprio app (sem internet, sem
 * biblioteca externa) e usa a função de impressão nativa do navegador
 * para exportar/salvar como PDF. Formatação inspirada em documento
 * controlado ISO 9001: cabeçalho com código/revisão/data, identificação,
 * registro fotográfico das evidências, parecer técnico e bloco de
 * assinaturas para encerramento.
 */

function gerarCodigoDocumento(insp) {
  const tipo = (insp.data.tipoInspecao || 'GERAL')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase() || 'GER';
  const data = (insp.data.identificacao.data || '').replace(/-/g, '');
  const curto = insp.id.split('-')[0].toUpperCase();
  return `RI-${tipo}-${data || 'SDATA'}-${curto}`;
}

function calcularEstatisticas(checklist) {
  const total = checklist.length;
  const conforme = checklist.filter((i) => i.resposta === 'Conforme').length;
  const naoConforme = checklist.filter((i) => i.resposta === 'Não Conforme').length;
  const naoAplica = checklist.filter((i) => i.resposta === 'Não se Aplica').length;
  const semResposta = total - conforme - naoConforme - naoAplica;
  const base = conforme + naoConforme; // índice de conformidade ignora N/A e sem resposta
  const indice = base > 0 ? Math.round((conforme / base) * 100) : null;
  return { total, conforme, naoConforme, naoAplica, semResposta, indice };
}

function montarDiagramaConformidade(stats) {
  const partes = [
    { label: 'Conforme', valor: stats.conforme, cor: 'var(--rep-good)' },
    { label: 'Não Conforme', valor: stats.naoConforme, cor: 'var(--rep-critical)' },
    { label: 'Não se Aplica', valor: stats.naoAplica, cor: 'var(--rep-muted)' }
  ];
  if (stats.semResposta > 0) {
    partes.push({ label: 'Sem resposta', valor: stats.semResposta, cor: 'var(--rep-warning)' });
  }
  const totalBarra = partes.reduce((s, p) => s + p.valor, 0) || 1;

  const segmentos = partes
    .filter((p) => p.valor > 0)
    .map((p) => `<div class="rep-bar-seg" style="flex:${p.valor} 0 0%;background:${p.cor}" title="${p.label}: ${p.valor}"></div>`)
    .join('');

  const legenda = partes
    .map((p) => {
      const pct = totalBarra ? Math.round((p.valor / totalBarra) * 100) : 0;
      return `
        <div class="rep-legend-item">
          <span class="rep-legend-swatch" style="background:${p.cor}"></span>
          <span>${escapeHtml(p.label)}: <strong>${p.valor}</strong> (${pct}%)</span>
        </div>`;
    }).join('');

  return `
    <div class="rep-bar">${segmentos}</div>
    <div class="rep-legend">${legenda}</div>
  `;
}

function montarParecerTecnico(insp, stats) {
  const id = insp.data.identificacao;
  const f = insp.data.fechamento;
  const partes = [];

  partes.push(
    `Com base na inspeção do tipo "${insp.data.tipoInspecao}" realizada em ${id.data ? formatarDataBR(id.data) : 'data não informada'}` +
    `${id.hora ? ' às ' + id.hora : ''}, na área "${id.area || 'não informada'}" da unidade "${id.unidade || 'não informada'}", ` +
    `foram verificados ${stats.total} item(ns) do checklist aplicável.`
  );

  if (stats.indice !== null) {
    partes.push(
      `Do total avaliado, ${stats.conforme} item(ns) foram considerados conformes e ${stats.naoConforme} não conformes` +
      `${stats.naoAplica ? `, além de ${stats.naoAplica} item(ns) não aplicável(is) à atividade` : ''}, ` +
      `resultando em um índice de conformidade de ${stats.indice}% sobre os itens aplicáveis.`
    );
  }

  partes.push(`A situação geral da área foi classificada como "${f.classificacaoGeral || 'não classificada'}".`);

  if (f.acaoImediata === 'Sim') {
    partes.push(
      `Foi identificada condição que exigiu ação imediata` +
      `${f.medidaImediata ? `, tendo sido adotada a seguinte medida de controle imediata: "${f.medidaImediata}"` : ''}.`
    );
  }

  if (stats.naoConforme > 0) {
    partes.push(
      `Recomenda-se o acompanhamento da(s) medida(s) de controle definitiva(s) registrada(s)` +
      `${f.responsavelAcao ? `, sob responsabilidade de ${f.responsavelAcao}` : ''}` +
      `${f.prazo ? `, com prazo estabelecido para ${formatarDataBR(f.prazo)}` : ''}, até a efetiva implementação e verificação de eficácia.`
    );
  } else {
    partes.push('Não foram identificadas não conformidades que exijam medida de controle definitiva adicional.');
  }

  if (f.necessitaReinspecao === 'Sim') {
    partes.push('Recomenda-se a realização de reinspeção da área para verificação da eficácia das medidas adotadas.');
  }

  return partes.join(' ');
}

function formatarDataBR(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return iso || '';
  return `${m[3]}/${m[2]}/${m[1]}`;
}

async function montarBlocoFoto(photoId) {
  const photo = await DB.getPhoto(photoId);
  if (!photo) return '';
  const url = URL.createObjectURL(photo.blob);
  return `<img src="${url}" class="rep-foto" alt="Evidência fotográfica">`;
}

async function montarRegistroFotografico(checklist) {
  const itensComFoto = checklist.filter((item) => item.photoIds && item.photoIds.length);
  if (!itensComFoto.length) {
    return '<p class="rep-hint">Nenhuma evidência fotográfica anexada aos itens do checklist.</p>';
  }

  const blocos = await Promise.all(itensComFoto.map(async (item, idx) => {
    const fotosHtml = (await Promise.all(item.photoIds.map(montarBlocoFoto))).join('');
    const classe = item.resposta === 'Não Conforme' ? 'rep-nc' : item.resposta === 'Conforme' ? 'rep-ok' : '';
    return `
      <div class="rep-foto-bloco ${classe}">
        <div class="rep-foto-header">
          <strong>Item ${String(checklist.indexOf(item) + 1).padStart(2, '0')}</strong> — ${escapeHtml(item.texto)}
          <span class="rep-status-pill">${escapeHtml(item.resposta || 'Sem resposta')}</span>
        </div>
        <div class="rep-fotos-grid">${fotosHtml}</div>
        ${item.observacao ? `<p><strong>Observação / desvio:</strong> ${escapeHtml(item.observacao)}</p>` : ''}
        ${item.medida ? `<p><strong>Medida de controle:</strong> ${escapeHtml(item.medida)}</p>` : ''}
      </div>
    `;
  }));

  return blocos.join('');
}

function montarTabelaResumo(checklist) {
  const linhas = checklist.map((item, idx) => `
    <tr>
      <td>${String(idx + 1).padStart(2, '0')}</td>
      <td>${escapeHtml(item.texto)}</td>
      <td class="rep-td-status rep-status-${item.resposta === 'Conforme' ? 'ok' : item.resposta === 'Não Conforme' ? 'nc' : 'na'}">
        ${escapeHtml(item.resposta || '—')}
      </td>
    </tr>
  `).join('');

  return `
    <table class="rep-table">
      <thead><tr><th>Nº</th><th>Item verificado</th><th>Resultado</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
  `;
}

async function montarFotosComplementares(fotosIds) {
  if (!fotosIds || !fotosIds.length) return '';
  const fotosHtml = (await Promise.all(fotosIds.map(montarBlocoFoto))).join('');
  return `
    <div class="rep-foto-bloco">
      <div class="rep-foto-header"><strong>Evidência fotográfica complementar</strong></div>
      <div class="rep-fotos-grid">${fotosHtml}</div>
    </div>
  `;
}

function formatarDataAgora() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function blocoAssinatura(insp, campo, rotulo, nome) {
  const dataUrl = (insp.data.assinaturas || {})[campo] || '';
  return `
    <div class="rep-assinatura">
      ${dataUrl
        ? `<img src="${dataUrl}" class="rep-assinatura-img" alt="Assinatura — ${escapeHtml(rotulo)}">`
        : '<div class="rep-linha-assinatura"></div>'}
      <p>${escapeHtml(nome || rotulo)}<br>${escapeHtml(rotulo)} — Data: ${dataUrl ? formatarDataAgora() : '____/____/______'}</p>
      <div class="no-print rep-assinatura-controles">
        <button type="button" class="btn-secondary btn-pequeno btn-assinar" data-campo="${campo}">${dataUrl ? 'Assinar novamente' : 'Assinar digitalmente'}</button>
      </div>
      <div class="no-print rep-assinatura-pad" data-campo="${campo}" hidden>
        <canvas class="rep-canvas-assinatura"></canvas>
        <div class="form-actions">
          <button type="button" class="btn-link btn-limpar-pad">Limpar</button>
          <button type="button" class="btn-link btn-cancelar-pad">Cancelar</button>
          <button type="button" class="btn-primary btn-pequeno btn-confirmar-pad">Confirmar assinatura</button>
        </div>
      </div>
    </div>`;
}

function iniciarCanvasAssinaturaRelatorio(canvas) {
  const rect = canvas.getBoundingClientRect();
  const larguraCss = rect.width || 300;
  const alturaCss = 110;
  canvas.width = larguraCss * 2;
  canvas.height = alturaCss * 2;
  canvas.style.height = alturaCss + 'px';
  delete canvas.dataset.assinado;

  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#0f4c81';

  let desenhando = false;
  function posicao(e) {
    const r = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - r.left) * (canvas.width / r.width) / 2,
      y: (clientY - r.top) * (canvas.height / r.height) / 2
    };
  }
  function iniciarTraco(e) {
    e.preventDefault();
    desenhando = true;
    const p = posicao(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }
  function moverTraco(e) {
    if (!desenhando) return;
    e.preventDefault();
    const p = posicao(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    canvas.dataset.assinado = '1';
  }
  function pararTraco() { desenhando = false; }

  canvas.addEventListener('mousedown', iniciarTraco);
  canvas.addEventListener('mousemove', moverTraco);
  window.addEventListener('mouseup', pararTraco);
  canvas.addEventListener('touchstart', iniciarTraco, { passive: false });
  canvas.addEventListener('touchmove', moverTraco, { passive: false });
  canvas.addEventListener('touchend', pararTraco);
}

function ligarAssinaturas(insp, id) {
  view.querySelectorAll('.btn-assinar').forEach((btn) => {
    btn.addEventListener('click', () => {
      const campo = btn.dataset.campo;
      const pad = view.querySelector(`.rep-assinatura-pad[data-campo="${campo}"]`);
      pad.hidden = false;
      btn.closest('.rep-assinatura-controles').hidden = true;
      iniciarCanvasAssinaturaRelatorio(pad.querySelector('canvas'));
    });
  });

  view.querySelectorAll('.btn-cancelar-pad').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pad = btn.closest('.rep-assinatura-pad');
      pad.hidden = true;
      pad.previousElementSibling.hidden = false;
    });
  });

  view.querySelectorAll('.btn-limpar-pad').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pad = btn.closest('.rep-assinatura-pad');
      iniciarCanvasAssinaturaRelatorio(pad.querySelector('canvas'));
    });
  });

  view.querySelectorAll('.btn-confirmar-pad').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const pad = btn.closest('.rep-assinatura-pad');
      const canvas = pad.querySelector('canvas');
      const campo = pad.dataset.campo;
      if (!canvas.dataset.assinado) {
        alert('Desenhe a assinatura no quadro antes de confirmar.');
        return;
      }
      const dataUrl = canvas.toDataURL('image/png');
      insp.data.assinaturas = insp.data.assinaturas || {};
      insp.data.assinaturas[campo] = dataUrl;
      await salvarRascunho(insp);
      renderReport(id);
    });
  });
}

async function renderReport(id) {
  state.screen = 'report';
  const insp = await DB.getInspection(id);
  if (!insp) return renderHome();
  insp.data.assinaturas = insp.data.assinaturas || {};

  const id_ = insp.data.identificacao;
  const f = insp.data.fechamento;
  const stats = calcularEstatisticas(insp.data.checklist);
  const codigo = gerarCodigoDocumento(insp);
  const geradoEm = new Date().toLocaleString('pt-BR');

  const [registroFotografico, fotosComplementares] = await Promise.all([
    montarRegistroFotografico(insp.data.checklist),
    montarFotosComplementares(f.fotosComplementaresIds)
  ]);

  view.innerHTML = `
    <div class="screen-header no-print">
      <button id="btn-back-detail" class="btn-link">← Voltar</button>
      <h1>Relatório técnico</h1>
    </div>
    <div class="form-actions no-print" style="margin-bottom:12px;">
      <button id="btn-imprimir" class="btn-primary">Imprimir / Salvar PDF</button>
    </div>

    <article class="rep-doc">
      <header class="rep-cabecalho">
        <div class="rep-titulo">
          <img src="icons/icon-192.png" alt="" class="rep-logo">
          <div>
            <h2>RELATÓRIO DE INSPEÇÃO SSMA</h2>
            <p>Segurança, Saúde do Trabalho e Meio Ambiente — ${escapeHtml(insp.data.tipoInspecao)}</p>
          </div>
        </div>
        <table class="rep-controle">
          <tr><th>Código</th><td>${codigo}</td></tr>
          <tr><th>Revisão</th><td>00</td></tr>
          <tr><th>Emitido em</th><td>${geradoEm}</td></tr>
        </table>
      </header>

      <section class="rep-secao">
        <h3>1. Identificação da inspeção</h3>
        <table class="rep-tabela-ident">
          <tr><th>Empresa / Contratada</th><td>${escapeHtml(id_.empresa)}</td><th>Unidade / Projeto</th><td>${escapeHtml(id_.unidade)}</td></tr>
          <tr><th>Área / Setor</th><td>${escapeHtml(id_.area)}</td><th>Tipo de inspeção</th><td>${escapeHtml(insp.data.tipoInspecao)}</td></tr>
          <tr><th>Data</th><td>${formatarDataBR(id_.data)}</td><th>Hora</th><td>${escapeHtml(id_.hora)}</td></tr>
          <tr><th>Inspetor</th><td>${escapeHtml(id_.inspetor)}</td><th>Responsável acompanhando</th><td>${escapeHtml(id_.responsavelArea || '—')}</td></tr>
        </table>
      </section>

      <section class="rep-secao">
        <h3>2. Diagrama de conformidade</h3>
        ${montarDiagramaConformidade(stats)}
      </section>

      <section class="rep-secao rep-quebra">
        <h3>3. Resumo dos itens verificados</h3>
        ${montarTabelaResumo(insp.data.checklist)}
      </section>

      <section class="rep-secao rep-quebra">
        <h3>4. Registro fotográfico das evidências</h3>
        ${registroFotografico}
      </section>

      <section class="rep-secao rep-quebra">
        <h3>5. Fechamento</h3>
        <table class="rep-tabela-ident">
          <tr><th>Classificação geral</th><td>${escapeHtml(f.classificacaoGeral || '—')}</td><th>Ação imediata necessária</th><td>${escapeHtml(f.acaoImediata || '—')}</td></tr>
          <tr><th>Responsável pela ação</th><td>${escapeHtml(f.responsavelAcao || '—')}</td><th>Prazo</th><td>${f.prazo ? formatarDataBR(f.prazo) : '—'}</td></tr>
          <tr><th>Necessita reinspeção</th><td colspan="3">${escapeHtml(f.necessitaReinspecao || '—')}</td></tr>
        </table>
        ${f.descricaoNC ? `<p><strong>Descrição da principal não conformidade:</strong> ${escapeHtml(f.descricaoNC)}</p>` : ''}
        ${f.medidaImediata ? `<p><strong>Medida de controle imediata adotada:</strong> ${escapeHtml(f.medidaImediata)}</p>` : ''}
        ${f.medidaDefinitiva ? `<p><strong>Medida de controle definitiva recomendada:</strong> ${escapeHtml(f.medidaDefinitiva)}</p>` : ''}
        ${f.observacoesFinais ? `<p><strong>Observações finais:</strong> ${escapeHtml(f.observacoesFinais)}</p>` : ''}
        ${fotosComplementares}
      </section>

      <section class="rep-secao rep-quebra">
        <h3>6. Parecer técnico</h3>
        <p class="rep-parecer">${escapeHtml(montarParecerTecnico(insp, stats))}</p>
      </section>

      <section class="rep-secao rep-assinaturas">
        <h3>7. Encerramento</h3>
        <div class="rep-assinatura-grid">
          ${blocoAssinatura(insp, 'inspetor', 'Inspetor responsável', id_.inspetor)}
          ${blocoAssinatura(insp, 'responsavelArea', 'Responsável da área', id_.responsavelArea)}
        </div>
      </section>

      <footer class="rep-rodape">
        Documento ${codigo} — gerado automaticamente pelo aplicativo Inspeções SSMA em ${geradoEm}.
      </footer>
    </article>
  `;

  document.getElementById('btn-back-detail').addEventListener('click', () => renderDetail(id));
  document.getElementById('btn-imprimir').addEventListener('click', () => window.print());
  ligarAssinaturas(insp, id);
}
