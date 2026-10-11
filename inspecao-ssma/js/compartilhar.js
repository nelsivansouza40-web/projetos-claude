/* Compartilhar relatório em PDF (WhatsApp, e-mail ou qualquer app do
 * aparelho). Funciona em todos os relatórios do app: sempre que uma tela de
 * relatório (article.rep-doc) é aberta, um botão "Compartilhar PDF" aparece
 * ao lado do "Imprimir / Salvar PDF".
 *
 * O PDF é montado no próprio aparelho, sem internet, com jsPDF e
 * html2canvas (em js/vendor, carregados só quando o botão é usado). Cada
 * bloco do relatório vira uma imagem posicionada em páginas A4, evitando
 * cortar títulos, tabelas curtas e fotos no meio. */

const PDF_MARGEM_MM = 12;
const PDF_LARGURA_MM = 210;
const PDF_ALTURA_MM = 297;
const PDF_LARGURA_LAYOUT_PX = 760;

let carregamentoBibliotecasPDF = null;

function carregarScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Não foi possível carregar ' + src));
    document.head.appendChild(s);
  });
}

function carregarBibliotecasPDF() {
  if (!carregamentoBibliotecasPDF) {
    carregamentoBibliotecasPDF = Promise.all([
      window.jspdf ? null : carregarScript('js/vendor/jspdf.umd.min.js'),
      window.html2canvas ? null : carregarScript('js/vendor/html2canvas.min.js')
    ]).catch((e) => { carregamentoBibliotecasPDF = null; throw e; });
  }
  return carregamentoBibliotecasPDF;
}

/**
 * Divide um elemento em faixas horizontais que podem ir inteiras para o PDF.
 * Elementos lado a lado (ex.: grade de fotos) formam uma única faixa; um
 * elemento mais alto que a página é aberto nos seus filhos (no caso de
 * tabelas, linha a linha), para a quebra de página não cortar uma linha ou
 * uma foto ao meio.
 */
function faixasDoElemento(el, base, limitePx) {
  const r = el.getBoundingClientRect();
  if (r.height < 1) return [];
  const filhos = Array.from(el.children).filter((c) => c.getBoundingClientRect().height >= 1);
  if (r.height <= limitePx || !filhos.length) return [{ top: r.top - base, bottom: r.bottom - base }];

  const intervalos = filhos
    .map((c) => { const cr = c.getBoundingClientRect(); return { top: cr.top - base, bottom: cr.bottom - base, els: [c] }; })
    .sort((x, y) => x.top - y.top);
  const bandas = [];
  intervalos.forEach((it) => {
    const ultima = bandas[bandas.length - 1];
    if (ultima && it.top < ultima.bottom - 0.5) {
      ultima.bottom = Math.max(ultima.bottom, it.bottom);
      ultima.els.push(...it.els);
    } else {
      bandas.push({ ...it, els: [...it.els] });
    }
  });
  const faixas = [];
  bandas.forEach((bd) => {
    if (bd.els.length === 1 && bd.bottom - bd.top > limitePx) {
      faixas.push(...faixasDoElemento(bd.els[0], base, limitePx));
    } else {
      faixas.push({ top: bd.top, bottom: bd.bottom });
    }
  });
  return faixas;
}

/** Faixas do relatório: cabeçalho, cada item das seções e rodapé. */
function faixasDoRelatorio(article, limitePx) {
  const base = article.getBoundingClientRect().top;
  const faixas = [];
  Array.from(article.children).forEach((filho) => {
    const partes = filho.classList.contains('rep-secao') && filho.children.length ? Array.from(filho.children) : [filho];
    partes.forEach((el) => faixas.push(...faixasDoElemento(el, base, limitePx)));
  });
  return faixas.map((f) => ({ top: f.top, height: f.bottom - f.top }));
}

async function aguardarImagens(raiz) {
  const imgs = Array.from(raiz.querySelectorAll('img'));
  await Promise.all(imgs.map((img) => (img.complete ? null : new Promise((r) => { img.onload = r; img.onerror = r; }))));
}

/** Gera o PDF do relatório aberto na tela e devolve um File. */
async function gerarPDFDoRelatorio(article, nomeArquivo, aoProgredir) {
  await carregarBibliotecasPDF();
  const { jsPDF } = window.jspdf;

  // Copia o relatório para uma área fora da tela, com largura fixa, para o
  // PDF sair igual no celular e no computador.
  const palco = document.createElement('div');
  palco.className = 'palco-pdf';
  palco.style.cssText = `position:absolute;left:0;top:0;width:${PDF_LARGURA_LAYOUT_PX}px;background:#fff;z-index:9998;`;
  // A cópia precisa estar na área visível da página para o html2canvas
  // desenhá-la; uma cobertura com o progresso fica por cima enquanto isso.
  const cobertura = document.createElement('div');
  cobertura.className = 'cobertura-pdf';
  cobertura.innerHTML = '<div class="cobertura-pdf-caixa">Gerando PDF… <span>0%</span></div>';
  const copia = article.cloneNode(true);
  copia.style.cssText = 'max-width:none;width:100%;border:none;border-radius:0;padding:0;margin:0;';
  copia.querySelectorAll('.no-print, .rep-assinatura-controles, .rep-assinatura-pad, button').forEach((el) => el.remove());
  palco.appendChild(copia);
  document.body.appendChild(palco);
  document.body.appendChild(cobertura);
  const progresso = (pct) => {
    cobertura.querySelector('span').textContent = pct + '%';
    if (aoProgredir) aoProgredir(pct);
  };

  try {
    await aguardarImagens(copia);
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    const larguraUtil = PDF_LARGURA_MM - 2 * PDF_MARGEM_MM;
    const alturaUtil = PDF_ALTURA_MM - 2 * PDF_MARGEM_MM - 6; // 6 mm reservados para o número da página
    const mmPorPx = larguraUtil / copia.offsetWidth;

    const ESCALA = 1.6;
    const LOTE_PX = 3000;
    const larguraPx = copia.offsetWidth;
    const alturaTotalPx = copia.offsetHeight;
    
    const unidades = faixasDoRelatorio(copia, alturaUtil / mmPorPx);

    // Renderiza o relatório em lotes de ~3000 px (limite de tamanho de
    // imagem dos celulares) e recorta cada unidade do lote correspondente.
    let lote = null;
    async function loteQueContem(top, height) {
      if (lote && top >= lote.top && top + height <= lote.top + lote.height) return lote;
      const alturaLote = Math.min(Math.max(LOTE_PX, height + 1), alturaTotalPx - top + 1);
      const r = copia.getBoundingClientRect();
      const canvas = await window.html2canvas(copia, {
        backgroundColor: '#ffffff',
        scale: ESCALA,
        useCORS: true,
        logging: false,
        x: r.left + window.scrollX,
        y: r.top + window.scrollY + top,
        width: larguraPx,
        height: alturaLote,
        windowWidth: PDF_LARGURA_LAYOUT_PX
      });
      lote = { top, height: alturaLote, canvas };
      return lote;
    }

    function recortar(origem, sy, altura) {
      const c = document.createElement('canvas');
      c.width = origem.width;
      c.height = Math.max(1, Math.round(altura));
      c.getContext('2d').drawImage(origem, 0, Math.round(sy), origem.width, c.height, 0, 0, c.width, c.height);
      return c;
    }

    let y = PDF_MARGEM_MM;
    let fundoAnteriorPx = null;
    const limite = PDF_MARGEM_MM + alturaUtil;

    for (let i = 0; i < unidades.length; i++) {
      progresso(Math.round((i / unidades.length) * 100));
      const u = unidades[i];
      if (u.height < 1) continue;
      const espacoAntesMm = fundoAnteriorPx === null ? 0 : Math.max(0, u.top - fundoAnteriorPx) * mmPorPx;
      fundoAnteriorPx = u.top + u.height;
      const alturaMm = u.height * mmPorPx;
      if (y > PDF_MARGEM_MM) y += espacoAntesMm;

      const l = await loteQueContem(u.top, u.height);
      const imagem = recortar(l.canvas, (u.top - l.top) * ESCALA, u.height * ESCALA);
      const jpeg = (c) => c.toDataURL('image/jpeg', 0.82);

      if (alturaMm <= alturaUtil) {
        if (y + alturaMm > limite) { pdf.addPage(); y = PDF_MARGEM_MM; }
        pdf.addImage(jpeg(imagem), 'JPEG', PDF_MARGEM_MM, y, larguraUtil, alturaMm, undefined, 'FAST');
        y += alturaMm;
      } else {
        // Bloco maior que uma página (ex.: tabela longa): fatia em pedaços.
        const pxPorMm = imagem.height / alturaMm;
        let feitoMm = 0;
        while (feitoMm < alturaMm - 0.1) {
          if (y >= limite - 10) { pdf.addPage(); y = PDF_MARGEM_MM; }
          const fatiaMm = Math.min(alturaMm - feitoMm, limite - y);
          const fatia = recortar(imagem, feitoMm * pxPorMm, fatiaMm * pxPorMm);
          pdf.addImage(jpeg(fatia), 'JPEG', PDF_MARGEM_MM, y, larguraUtil, fatiaMm, undefined, 'FAST');
          y += fatiaMm;
          feitoMm += fatiaMm;
        }
      }
    }

    const total = pdf.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      pdf.setPage(p);
      pdf.setFontSize(8);
      pdf.setTextColor(110);
      pdf.text(`Página ${p} de ${total}`, PDF_LARGURA_MM - PDF_MARGEM_MM, PDF_ALTURA_MM - PDF_MARGEM_MM + 2, { align: 'right' });
    }
    progresso(100);
    const blob = pdf.output('blob');
    return new File([blob], nomeArquivo, { type: 'application/pdf' });
  } finally {
    palco.remove();
    cobertura.remove();
  }
}

function nomeArquivoRelatorio(article) {
  const codigo = (article.querySelector('.rep-controle td') || {}).textContent || '';
  const titulo = (article.querySelector('.rep-titulo h2') || {}).textContent || 'Relatorio';
  const base = (codigo.trim() || titulo.trim()).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_-]+/g, '_');
  return `${base || 'Relatorio'}.pdf`;
}

function tituloRelatorio(article) {
  const h2 = (article.querySelector('.rep-titulo h2') || {}).textContent || 'Relatório';
  const sub = (article.querySelector('.rep-titulo p') || {}).textContent || '';
  return `${h2.trim()}${sub.trim() ? ' — ' + sub.trim() : ''}`;
}

function baixarArquivo(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/** Quando o aparelho não compartilha arquivos (ex.: computador), baixa o PDF e oferece WhatsApp/e-mail. */
function mostrarOpcoesEnvio(painel, file, titulo) {
  const texto = `${titulo}\nSegue o relatório em PDF (${file.name}).`;
  painel.innerHTML = `
    <p class="hint">O PDF <strong>${escapeHtml(file.name)}</strong> foi baixado. Abra o WhatsApp ou o e-mail e anexe o arquivo.</p>
    <div class="compartilhar-opcoes">
      <a class="btn-secondary btn-pequeno" href="https://wa.me/?text=${encodeURIComponent(texto)}" target="_blank" rel="noopener">Abrir WhatsApp</a>
      <a class="btn-secondary btn-pequeno" href="mailto:?subject=${encodeURIComponent(titulo)}&body=${encodeURIComponent(texto + '\n\nO arquivo segue em anexo.')}">Abrir e-mail</a>
      <button type="button" class="btn-link btn-baixar-de-novo">Baixar o PDF de novo</button>
    </div>
  `;
  painel.querySelector('.btn-baixar-de-novo').addEventListener('click', () => baixarArquivo(file));
}

async function compartilharRelatorio(article, botao, painel) {
  const textoOriginal = botao.textContent;
  botao.disabled = true;
  painel.innerHTML = '';
  try {
    const titulo = tituloRelatorio(article);
    const file = await gerarPDFDoRelatorio(article, nomeArquivoRelatorio(article), (pct) => {
      botao.textContent = `Gerando PDF… ${pct}%`;
    });
    botao.textContent = textoOriginal;
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: titulo, text: titulo });
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return; // usuário fechou a janela de compartilhar
      }
    }
    baixarArquivo(file);
    mostrarOpcoesEnvio(painel, file, titulo);
  } catch (e) {
    console.error(e);
    alert('Não foi possível gerar o PDF: ' + (e.message || e) + '\n\nUse "Imprimir / Salvar PDF" como alternativa.');
  } finally {
    botao.disabled = false;
    botao.textContent = textoOriginal;
  }
}

/** Acrescenta o botão de compartilhar em qualquer tela de relatório. */
function instalarBotaoCompartilhar() {
  const article = view.querySelector('article.rep-doc');
  if (!article) return;
  const barra = Array.from(view.querySelectorAll('.form-actions.no-print')).find((el) => /imprimir/i.test(el.textContent));
  if (!barra || barra.querySelector('.btn-compartilhar')) return;
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'btn-primary btn-compartilhar';
  botao.textContent = 'Compartilhar PDF (WhatsApp / e-mail)';
  const painel = document.createElement('div');
  painel.className = 'painel-compartilhar no-print';
  barra.appendChild(botao);
  barra.insertAdjacentElement('afterend', painel);
  botao.addEventListener('click', () => compartilharRelatorio(article, botao, painel));
}

new MutationObserver(instalarBotaoCompartilhar).observe(view, { childList: true });
