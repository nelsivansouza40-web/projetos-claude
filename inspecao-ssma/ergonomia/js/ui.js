/* Helpers de interface reutilizados por várias telas do app. */

function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fmtData(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso || '—');
}

function fmtDataHora(ts) {
  return ts ? new Date(ts).toLocaleString('pt-BR') : '—';
}

/*
 * Renderiza um formulário a partir de um schema declarativo.
 * schema: [{name, label, type: text|textarea|number|date|select|radio, options, required, hint}]
 */
function renderFormFields(schema, data) {
  data = data || {};
  return schema.map((f) => {
    const val = data[f.name] !== undefined ? data[f.name] : (f.default !== undefined ? f.default : '');
    const req = f.required ? 'required' : '';
    let campo;
    if (f.type === 'textarea') {
      campo = `<textarea name="${f.name}" rows="${f.rows || 3}" ${req}>${escapeHtml(val)}</textarea>`;
    } else if (f.type === 'select') {
      const opts = f.options.map((o) => {
        const v = typeof o === 'string' ? o : o.value;
        const l = typeof o === 'string' ? o : o.label;
        return `<option value="${escapeHtml(v)}" ${val === v ? 'selected' : ''}>${escapeHtml(l)}</option>`;
      }).join('');
      campo = `<select name="${f.name}" ${req}><option value="" disabled ${!val ? 'selected' : ''}>Selecione…</option>${opts}</select>`;
    } else if (f.type === 'radio') {
      campo = `<div class="radio-inline-group">${f.options.map((o) => {
        const v = typeof o === 'string' ? o : o.value;
        const l = typeof o === 'string' ? o : o.label;
        return `<label class="radio-inline"><input type="radio" name="${f.name}" value="${escapeHtml(v)}" ${val === v ? 'checked' : ''} ${req}> ${escapeHtml(l)}</label>`;
      }).join('')}</div>`;
    } else {
      campo = `<input type="${f.type || 'text'}" name="${f.name}" value="${escapeHtml(val)}" ${req}>`;
    }
    return `<label>${escapeHtml(f.label)}${f.required ? ' *' : ''}${f.hint ? `<span class="campo-hint">${escapeHtml(f.hint)}</span>` : ''}${campo}</label>`;
  }).join('');
}

function lerFormFields(form, schema) {
  const fd = new FormData(form);
  const out = {};
  schema.forEach((f) => {
    out[f.name] = (fd.get(f.name) || '').toString().trim();
  });
  return out;
}

function badgeClassificacao(classificacao) {
  const mapa = { 'Baixo': 'badge-ok', 'Moderado': 'badge-pendente', 'Alto': 'badge-alto', 'Crítico': 'badge-erro' };
  return mapa[classificacao] || 'badge-rascunho';
}

async function renderThumbsGaleria(el, fotoIds) {
  if (!el) return;
  if (!fotoIds || !fotoIds.length) { el.innerHTML = ''; return; }
  el.innerHTML = fotoIds.map((id) => `<div class="thumb" data-photo="${id}"></div>`).join('');
  for (const id of fotoIds) {
    const foto = await DB.fotos.get(id);
    const box = el.querySelector(`[data-photo="${id}"]`);
    if (!foto || !box) continue;
    const url = URL.createObjectURL(foto.blob);
    box.innerHTML = `<img src="${url}" alt="Evidência"><span class="thumb-sync ${foto.synced ? 'ok' : ''}">${foto.synced ? '✓' : '⏳'}</span><button type="button" class="btn-remover-foto" data-photo-id="${id}">✕</button>`;
  }
}

async function adicionarFotos(refType, refId, arr, fileList) {
  for (const file of Array.from(fileList)) {
    const foto = {
      id: uuid(), refType, refId,
      mimeType: file.type || 'image/jpeg',
      fileName: file.name || `foto_${Date.now()}.jpg`,
      blob: file, synced: false, remoteUrl: null, createdAt: Date.now()
    };
    await DB.fotos.put(foto);
    arr.push(foto.id);
  }
}
