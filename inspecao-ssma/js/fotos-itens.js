/*
 * Fotos por item de checklist, reaproveitado por PT/APR, PET, Diagnóstico e
 * Investigação (o checklist das Inspeções já tinha o seu próprio). As fotos
 * ficam no mesmo armazenamento das demais (DB.putPhoto), vinculadas ao
 * documento e ao item ("item:<id>"), e sincronizam pelo fluxo já existente.
 */

function htmlFotosItem() {
  return `
    <div class="foto-botoes">
      <label class="file-label">📷 Tirar foto
        <input type="file" accept="image/*" capture="environment" class="input-foto-item">
      </label>
      <label class="file-label">🖼️ Da galeria
        <input type="file" accept="image/*" multiple class="input-foto-item">
      </label>
    </div>
    <div class="thumbs thumbs-item"></div>
  `;
}

/** Liga os botões de foto de um card de item. salvar(doc) grava o rascunho. */
function ligarFotosItem(card, doc, item, salvar) {
  if (!Array.isArray(item.photoIds)) item.photoIds = [];
  const thumbs = card.querySelector('.thumbs-item');

  async function atualizar() {
    await renderThumbnails(thumbs, item.photoIds);
    thumbs.querySelectorAll('.btn-remover-foto').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const photoId = btn.dataset.photoId;
        await DB.deletePhoto(photoId);
        item.photoIds = item.photoIds.filter((pid) => pid !== photoId);
        await salvar(doc);
        atualizar();
      });
    });
  }

  card.querySelectorAll('.input-foto-item').forEach((input) => {
    input.addEventListener('change', async (e) => {
      if (!e.target.files || !e.target.files.length) return;
      await adicionarFotos(doc, item.photoIds, e.target.files, `item:${item.id}`);
      e.target.value = '';
      await salvar(doc);
      atualizar();
    });
  });

  atualizar();
}

/** Miniaturas (somente leitura) para a tela de detalhe. */
async function htmlFotosItemDetalhe(item) {
  if (!item.photoIds || !item.photoIds.length) return '';
  const imgs = await Promise.all(item.photoIds.map(async (id) => {
    const p = await DB.getPhoto(id);
    if (!p) return '';
    return `<div class="thumb"><img src="${URL.createObjectURL(p.blob)}" alt="Foto do item"><span class="thumb-sync ${p.synced ? 'ok' : ''}">${p.synced ? '✓' : '⏳'}</span></div>`;
  }));
  return `<div class="thumbs detail-thumbs">${imgs.join('')}</div>`;
}

/**
 * Bloco do relatório com as fotos de cada item.
 * itens: [{ item, rotulo }] — rotulo é o texto exibido no cabeçalho (ex.: "Item 03").
 * Retorna '' quando nenhum item tem foto.
 */
async function montarFotosItensRelatorio(itens) {
  const comFoto = itens.filter(({ item }) => item.photoIds && item.photoIds.length);
  if (!comFoto.length) return '';
  const negativas = ['Não Conforme', 'Não Atende'];
  const blocos = await Promise.all(comFoto.map(async ({ item, rotulo }) => {
    const fotosHtml = (await Promise.all(item.photoIds.map(montarBlocoFoto))).join('');
    const classe = negativas.includes(item.resposta) ? 'rep-nc' : (item.resposta === 'Conforme' || item.resposta === 'Atende') ? 'rep-ok' : '';
    return `
      <div class="rep-foto-bloco ${classe}">
        <div class="rep-foto-header">
          <strong>${escapeHtml(rotulo)}</strong> — ${escapeHtml(item.texto)}
          <span class="rep-status-pill">${escapeHtml(item.resposta || 'Sem resposta')}</span>
        </div>
        <div class="rep-fotos-grid">${fotosHtml}</div>
        ${item.observacao ? `<p><strong>Observação:</strong> ${escapeHtml(item.observacao)}</p>` : ''}
      </div>
    `;
  }));
  return blocos.join('');
}

/** Junta, na seção de evidências do relatório, as fotos por item e as fotos gerais. */
function secaoFotosRelatorio(fotosItensHtml, fotosGeraisIds, fotosGeraisHtml) {
  if (!fotosItensHtml) return fotosGeraisHtml;
  const temGerais = fotosGeraisIds && fotosGeraisIds.length;
  return `<h4>Fotos por item</h4>${fotosItensHtml}` + (temGerais ? `<h4>Fotos gerais</h4>${fotosGeraisHtml}` : '');
}

/** Fotos do documento que não pertencem a nenhum item (para a tela de detalhe). */
function fotosGerais(photos) {
  return photos.filter((p) => !String(p.questionRef || '').startsWith('item:'));
}
