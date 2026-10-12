/* Cópia de segurança dos dados do aparelho.
 * Os registros ficam no armazenamento do navegador do celular. Se o aparelho
 * for perdido, formatado ou tiver os dados do navegador limpos antes de
 * sincronizar, eles se perdem. Por isso:
 *  - o app pede ao navegador que trate esse armazenamento como permanente
 *    (não apagar automaticamente por falta de espaço ou de uso);
 *  - o botão "Exportar todos os dados" gera um arquivo com tudo (inclusive
 *    as fotos, se desejado), que pode ser guardado no Drive, enviado por
 *    e-mail ou restaurado em outro aparelho pelo botão "Importar". */

async function pedirArmazenamentoPermanente() {
  try {
    if (!navigator.storage || !navigator.storage.persist) return null;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch (e) {
    return null;
  }
}

function blobParaDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

async function dataUrlParaBlob(dataUrl) {
  const resp = await fetch(dataUrl);
  return resp.blob();
}

/** Lê todas as tabelas do banco local. Fotos entram como texto (data URL) quando comFotos = true. */
async function montarCopiaDeSeguranca(comFotos, aoProgredir) {
  const db = await openDB();
  const nomes = Array.from(db.objectStoreNames);
  const tabelas = {};
  for (let i = 0; i < nomes.length; i++) {
    const nome = nomes[i];
    if (aoProgredir) aoProgredir(`Lendo ${nome}…`);
    const st = await storeTx(nome, 'readonly');
    const registros = await reqToPromise(st.getAll());
    if (nome === 'photos') {
      if (!comFotos) continue;
      tabelas.photos = [];
      for (const p of registros) {
        const copia = { ...p };
        if (p.blob instanceof Blob) copia.blob = { __blob: await blobParaDataUrl(p.blob) };
        if (p.originalBlob instanceof Blob) copia.originalBlob = { __blob: await blobParaDataUrl(p.originalBlob) };
        tabelas.photos.push(copia);
      }
    } else if (nome === 'settings') {
      // A chave de acesso do servidor não vai para o arquivo.
      tabelas.settings = registros.filter((r) => !['chaveAcesso', 'pinUsuario'].includes(r.key));
    } else {
      tabelas[nome] = registros;
    }
  }
  return {
    tipo: 'copia-seguranca-inspecoes-ssma',
    versaoApp: APP_VERSION,
    versaoBanco: DB_VERSION,
    geradoEm: new Date().toISOString(),
    comFotos: !!comFotos,
    tabelas
  };
}

async function exportarTodosOsDados(comFotos, statusEl) {
  const status = (t) => { if (statusEl) statusEl.textContent = t; };
  try {
    status('Preparando cópia de segurança…');
    const copia = await montarCopiaDeSeguranca(comFotos, status);
    const nomeArquivo = `inspecoes-ssma-backup-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}${comFotos ? '-com-fotos' : ''}.json`;
    const arquivo = new File([JSON.stringify(copia)], nomeArquivo, { type: 'application/json' });
    await DB.setSetting('ultimoBackup', Date.now());
    const total = Object.values(copia.tabelas).reduce((s, t) => s + t.length, 0);
    const tamanho = (arquivo.size / 1024 / 1024).toFixed(1);
    if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
      try {
        await navigator.share({ files: [arquivo], title: 'Cópia de segurança — Inspeções SSMA' });
        status(`Cópia gerada: ${total} registro(s), ${tamanho} MB.`);
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') { status('Envio cancelado.'); return; }
      }
    }
    baixarArquivo(arquivo);
    status(`Cópia baixada: ${total} registro(s), ${tamanho} MB. Guarde o arquivo no Drive ou envie por e-mail.`);
  } catch (e) {
    status('Não foi possível gerar a cópia: ' + e.message);
  }
}

/** Restaura uma cópia: acrescenta e atualiza registros, sem apagar o que já existe no aparelho. */
async function importarCopiaDeSeguranca(arquivo, statusEl) {
  const status = (t) => { if (statusEl) statusEl.textContent = t; };
  try {
    status('Lendo arquivo…');
    const copia = JSON.parse(await arquivo.text());
    if (!copia || copia.tipo !== 'copia-seguranca-inspecoes-ssma' || !copia.tabelas) throw new Error('o arquivo não é uma cópia de segurança deste aplicativo.');
    const db = await openDB();
    const existentes = Array.from(db.objectStoreNames);
    let n = 0;
    for (const [nome, registros] of Object.entries(copia.tabelas)) {
      if (!existentes.includes(nome) || !Array.isArray(registros)) continue;
      if (nome === 'settings') continue; // não sobrescreve endereço e chave deste aparelho
      status(`Restaurando ${nome}…`);
      for (const r of registros) {
        const reg = { ...r };
        if (nome === 'photos') {
          if (reg.blob && reg.blob.__blob) reg.blob = await dataUrlParaBlob(reg.blob.__blob);
          if (reg.originalBlob && reg.originalBlob.__blob) reg.originalBlob = await dataUrlParaBlob(reg.originalBlob.__blob);
        }
        const st = await storeTx(nome, 'readwrite');
        await reqToPromise(st.put(reg));
        n++;
      }
    }
    status(`${n} registro(s) restaurado(s) da cópia de ${new Date(copia.geradoEm).toLocaleString('pt-BR')}.`);
    await refreshChrome();
  } catch (e) {
    status('Não foi possível restaurar: ' + e.message);
  }
}

async function htmlSecaoBackup() {
  const ultimo = await DB.getSetting('ultimoBackup');
  let permanente = null;
  try { permanente = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : null; } catch (e) { permanente = null; }
  let uso = '';
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      uso = `${(est.usage / 1024 / 1024).toFixed(1)} MB usados`;
    }
  } catch (e) { uso = ''; }
  return `
    <div class="form-section">
      <h3>Cópia de segurança dos dados</h3>
      <p class="hint">Os registros ficam guardados neste aparelho até serem sincronizados. Faça uma cópia periódica (sugestão: toda sexta-feira) e guarde o arquivo no Drive ou no e-mail.</p>
      <p class="hint">
        Armazenamento permanente: <strong>${permanente === true ? 'ativado' : permanente === false ? 'não concedido pelo navegador (instale o app na tela inicial para melhorar)' : 'não suportado neste navegador'}</strong>${uso ? ' · ' + uso : ''}<br>
        Última cópia: <strong>${ultimo ? new Date(ultimo).toLocaleString('pt-BR') : 'nenhuma'}</strong>
      </p>
      <div class="form-actions acoes-envio">
        <button id="btn-backup-fotos" class="btn-primary">Exportar todos os dados (com fotos)</button>
        <button id="btn-backup-leve" class="btn-secondary">Exportar sem fotos (arquivo leve)</button>
        <label class="btn-secondary file-label">Importar cópia<input type="file" accept="application/json,.json" id="input-restaurar" hidden></label>
      </div>
      <p id="backup-status" class="hint"></p>
    </div>
  `;
}

function ligarSecaoBackup() {
  const statusEl = document.getElementById('backup-status');
  document.getElementById('btn-backup-fotos').addEventListener('click', () => exportarTodosOsDados(true, statusEl));
  document.getElementById('btn-backup-leve').addEventListener('click', () => exportarTodosOsDados(false, statusEl));
  document.getElementById('input-restaurar').addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!confirm('Restaurar esta cópia? Os registros do arquivo serão acrescentados ou atualizados neste aparelho. Nada será apagado.')) return;
    await importarCopiaDeSeguranca(f, statusEl);
    e.target.value = '';
  });
}
