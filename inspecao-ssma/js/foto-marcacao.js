/* Marcação sobre a foto: setas, círculos, retângulos e texto desenhados
 * sobre a evidência, para deixar claro qual é o desvio. A marcação é
 * gravada na própria imagem; a foto original fica guardada para poder ser
 * restaurada. Fotos já enviadas à planilha não são alteradas. */

const CORES_MARCACAO = ['#e01e1e', '#ffd400', '#ffffff', '#1e6bff'];

async function abrirMarcacaoFoto(photoId) {
  const foto = await DB.getPhoto(photoId);
  if (!foto) return null;
  if (foto.synced) {
    alert('Esta foto já foi enviada para a planilha e não pode mais ser marcada. Faça a marcação antes de sincronizar.');
    return null;
  }
  // Edita sobre a versão atual (com marcações anteriores); a original fica guardada.
  const original = foto.originalBlob || foto.blob;
  const img = await createImageBitmap(foto.blob);

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'marcacao-foto';
    overlay.innerHTML = `
      <div class="marcacao-barra">
        <div class="marcacao-ferramentas">
          <button type="button" data-ferr="seta" class="ativo">Seta</button>
          <button type="button" data-ferr="circulo">Círculo</button>
          <button type="button" data-ferr="retangulo">Retângulo</button>
          <button type="button" data-ferr="texto">Texto</button>
        </div>
        <div class="marcacao-cores">
          ${CORES_MARCACAO.map((c, i) => `<button type="button" data-cor="${c}" class="${i === 0 ? 'ativo' : ''}" style="background:${c}" aria-label="Cor"></button>`).join('')}
        </div>
      </div>
      <div class="marcacao-area"><canvas></canvas></div>
      <div class="marcacao-barra">
        <button type="button" data-acao="desfazer">Desfazer</button>
        ${foto.originalBlob ? '<button type="button" data-acao="restaurar">Restaurar original</button>' : ''}
        <span class="marcacao-espaco"></span>
        <button type="button" data-acao="cancelar">Cancelar</button>
        <button type="button" data-acao="salvar" class="marcacao-salvar">Salvar marcação</button>
      </div>
    `;
    document.body.appendChild(overlay);
    const canvas = overlay.querySelector('canvas');
    const area = overlay.querySelector('.marcacao-area');
    const ctx = canvas.getContext('2d');

    // Tamanho de trabalho: a imagem inteira cabendo na tela.
    const escalaTela = Math.min((area.clientWidth - 8) / img.width, (area.clientHeight - 8) / img.height, 1);
    canvas.width = Math.round(img.width * escalaTela);
    canvas.height = Math.round(img.height * escalaTela);

    let ferramenta = 'seta';
    let cor = CORES_MARCACAO[0];
    const formas = []; // em coordenadas da imagem original
    let rascunho = null;

    function desenharForma(c, f, k) {
      const lw = Math.max(3, Math.round(Math.max(img.width, img.height) / 220)) * k;
      c.strokeStyle = f.cor; c.fillStyle = f.cor; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round';
      const x1 = f.x1 * k; const y1 = f.y1 * k; const x2 = f.x2 * k; const y2 = f.y2 * k;
      if (f.tipo === 'seta') {
        c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
        const ang = Math.atan2(y2 - y1, x2 - x1); const tam = lw * 4.5;
        c.beginPath(); c.moveTo(x2, y2);
        c.lineTo(x2 - tam * Math.cos(ang - 0.45), y2 - tam * Math.sin(ang - 0.45));
        c.lineTo(x2 - tam * Math.cos(ang + 0.45), y2 - tam * Math.sin(ang + 0.45));
        c.closePath(); c.fill();
      } else if (f.tipo === 'circulo') {
        c.beginPath();
        c.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.abs(x2 - x1) / 2 || 1, Math.abs(y2 - y1) / 2 || 1, 0, 0, Math.PI * 2);
        c.stroke();
      } else if (f.tipo === 'retangulo') {
        c.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      } else if (f.tipo === 'texto') {
        const fs = Math.max(18, Math.round(Math.max(img.width, img.height) / 28)) * k;
        c.font = `bold ${fs}px sans-serif`;
        c.lineWidth = fs / 6; c.strokeStyle = f.cor === '#ffffff' || f.cor === '#ffd400' ? '#000' : '#fff';
        c.strokeText(f.texto, x1, y1); c.fillText(f.texto, x1, y1);
      }
    }

    function redesenhar() {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      formas.forEach((f) => desenharForma(ctx, f, escalaTela));
      if (rascunho) desenharForma(ctx, rascunho, escalaTela);
    }
    redesenhar();

    const ponto = (ev) => {
      const r = canvas.getBoundingClientRect();
      return { x: (ev.clientX - r.left) / escalaTela, y: (ev.clientY - r.top) / escalaTela };
    };
    canvas.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      const p = ponto(ev);
      if (ferramenta === 'texto') {
        const texto = prompt('Texto da marcação:');
        if (texto && texto.trim()) { formas.push({ tipo: 'texto', cor, x1: p.x, y1: p.y, x2: p.x, y2: p.y, texto: texto.trim() }); redesenhar(); }
        return;
      }
      canvas.setPointerCapture(ev.pointerId);
      rascunho = { tipo: ferramenta, cor, x1: p.x, y1: p.y, x2: p.x, y2: p.y };
    });
    canvas.addEventListener('pointermove', (ev) => {
      if (!rascunho) return;
      const p = ponto(ev); rascunho.x2 = p.x; rascunho.y2 = p.y; redesenhar();
    });
    const terminar = () => {
      if (!rascunho) return;
      if (Math.hypot(rascunho.x2 - rascunho.x1, rascunho.y2 - rascunho.y1) > 4) formas.push(rascunho);
      rascunho = null; redesenhar();
    };
    canvas.addEventListener('pointerup', terminar);
    canvas.addEventListener('pointercancel', terminar);

    overlay.querySelectorAll('[data-ferr]').forEach((b) => b.addEventListener('click', () => {
      ferramenta = b.dataset.ferr;
      overlay.querySelectorAll('[data-ferr]').forEach((x) => x.classList.toggle('ativo', x === b));
    }));
    overlay.querySelectorAll('[data-cor]').forEach((b) => b.addEventListener('click', () => {
      cor = b.dataset.cor;
      overlay.querySelectorAll('[data-cor]').forEach((x) => x.classList.toggle('ativo', x === b));
    }));

    const fechar = (resultado) => { overlay.remove(); resolve(resultado); };
    overlay.querySelector('[data-acao="desfazer"]').addEventListener('click', () => { formas.pop(); redesenhar(); });
    overlay.querySelector('[data-acao="cancelar"]').addEventListener('click', () => fechar(null));
    const btnRest = overlay.querySelector('[data-acao="restaurar"]');
    if (btnRest) btnRest.addEventListener('click', async () => {
      if (!confirm('Remover todas as marcações e voltar à foto original?')) return;
      foto.blob = foto.originalBlob;
      delete foto.originalBlob;
      await DB.putPhoto(foto);
      fechar(foto.blob);
    });
    overlay.querySelector('[data-acao="salvar"]').addEventListener('click', async () => {
      if (!formas.length) { fechar(null); return; }
      // Grava na resolução original (limitada a 2000 px no lado maior).
      const k = Math.min(1, 2000 / Math.max(img.width, img.height));
      const final = document.createElement('canvas');
      final.width = Math.round(img.width * k);
      final.height = Math.round(img.height * k);
      const fc = final.getContext('2d');
      fc.drawImage(img, 0, 0, final.width, final.height);
      formas.forEach((f) => desenharForma(fc, f, k));
      const blob = await new Promise((r) => final.toBlob(r, 'image/jpeg', 0.88));
      if (!foto.originalBlob) foto.originalBlob = original;
      foto.blob = blob;
      foto.mimeType = 'image/jpeg';
      await DB.putPhoto(foto);
      fechar(blob);
    });
  });
}
