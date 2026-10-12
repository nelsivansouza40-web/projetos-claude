/*
 * Aparência do app (botão "Aa" na barra superior): cor do fundo, cor
 * principal (barra superior, menus e botões) e tamanho do texto.
 * A escolha vale para este aparelho e fica guardada no navegador.
 */

const APARENCIA_FUNDOS = [
  { id: 'padrao', rotulo: 'Musgo claro', cor: '#f2f4ec' },
  { id: 'branco', rotulo: 'Branco', cor: '#ffffff' },
  { id: 'salvia', rotulo: 'Sálvia', cor: '#e9efe4' },
  { id: 'menta', rotulo: 'Menta', cor: '#ebf5ee' },
  { id: 'oliva', rotulo: 'Oliva claro', cor: '#f4f5e6' },
  { id: 'agua', rotulo: 'Verde-água', cor: '#e8f3f1' },
  // Opções da primeira versão do painel, mantidas a pedido do gestor.
  { id: 'cinza', rotulo: 'Cinza claro', cor: '#f4f6f8' },
  { id: 'azul', rotulo: 'Azul claro', cor: '#e8f1fb' },
  { id: 'bege', rotulo: 'Bege', cor: '#f7f1e6' },
  { id: 'lilas', rotulo: 'Lilás claro', cor: '#f1edf9' }
];

const APARENCIA_CORES = [
  { id: 'padrao', rotulo: 'Verde musgo', cor: '#556b2f', escura: '#3f5022', claro: '#e6ecdb', medio: '#d3e0bd', texto: '#33421c' },
  { id: 'oliva', rotulo: 'Verde oliva', cor: '#6b7a1f', escura: '#525d17', claro: '#ebeed9', medio: '#dbe1b6', texto: '#3e4612' },
  { id: 'floresta', rotulo: 'Verde floresta', cor: '#2f5d3a', escura: '#22472b', claro: '#e1ece3', medio: '#c6dccb', texto: '#1d3d25' },
  { id: 'esmeralda', rotulo: 'Verde esmeralda', cor: '#1f6f50', escura: '#165239', claro: '#ddefe7', medio: '#bfe0d1', texto: '#124232' },
  { id: 'petroleo', rotulo: 'Verde petróleo', cor: '#2f6b62', escura: '#22504a', claro: '#dfedeb', medio: '#c2ddd9', texto: '#1b403a' },
  // Opções da primeira versão do painel, mantidas a pedido do gestor.
  { id: 'azul', rotulo: 'Azul', cor: '#0f4c81', escura: '#0a3a63', claro: '#e7edf3', medio: '#cfe2ff', texto: '#084298' },
  { id: 'vinho', rotulo: 'Vinho', cor: '#7a1f2b', escura: '#5a1520', claro: '#f3e6e8', medio: '#ebcdd2', texto: '#5a1520' },
  { id: 'grafite', rotulo: 'Grafite', cor: '#37474f', escura: '#263238', claro: '#e8ecee', medio: '#d3dbdf', texto: '#263238' },
  { id: 'laranja', rotulo: 'Laranja', cor: '#a8460a', escura: '#7c3407', claro: '#f6ebe2', medio: '#f0d5c2', texto: '#6b2d06' }
];

const APARENCIA_TEXTOS = [
  { id: 'normal', rotulo: 'Normal', escala: '100%' },
  { id: 'grande', rotulo: 'Grande', escala: '112.5%' },
  { id: 'extra', rotulo: 'Extra grande', escala: '125%' }
];

const CHAVE_APARENCIA = 'aparenciaApp';

function lerAparencia() {
  try {
    return Object.assign({ fundo: 'padrao', cor: 'padrao', texto: 'normal' }, JSON.parse(localStorage.getItem(CHAVE_APARENCIA) || '{}'));
  } catch (e) {
    return { fundo: 'padrao', cor: 'padrao', texto: 'normal' };
  }
}

function gravarAparencia(ap) {
  try { localStorage.setItem(CHAVE_APARENCIA, JSON.stringify(ap)); } catch (e) { /* sem armazenamento: vale só nesta sessão */ }
}

function aplicarAparencia(ap = lerAparencia()) {
  const raiz = document.documentElement;
  const fundo = APARENCIA_FUNDOS.find((f) => f.id === ap.fundo) || APARENCIA_FUNDOS[0];
  const cor = APARENCIA_CORES.find((c) => c.id === ap.cor) || APARENCIA_CORES[0];
  const texto = APARENCIA_TEXTOS.find((t) => t.id === ap.texto) || APARENCIA_TEXTOS[0];
  raiz.style.setProperty('--cinza-bg', fundo.cor);
  raiz.style.setProperty('--azul', cor.cor);
  raiz.style.setProperty('--azul-escuro', cor.escura);
  raiz.style.setProperty('--tom-claro', cor.claro);
  raiz.style.setProperty('--tom-medio', cor.medio);
  raiz.style.setProperty('--tom-texto', cor.texto);
  raiz.style.fontSize = texto.escala;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', cor.cor);
  if (typeof aplicarImagemFundoTopbar === 'function') aplicarImagemFundoTopbar();
}

function abrirPainelAparencia() {
  const atual = lerAparencia();
  const grupo = (titulo, chave, lista, amostra) => `
    <div class="aparencia-grupo">
      <div class="aparencia-titulo">${titulo}</div>
      <div class="aparencia-opcoes">
        ${lista.map((o) => `
          <button type="button" class="aparencia-opcao ${atual[chave] === o.id ? 'ativa' : ''}" data-chave="${chave}" data-valor="${o.id}">
            ${amostra(o)}<span>${o.rotulo}</span>
          </button>`).join('')}
      </div>
    </div>`;
  const fundo = document.createElement('div');
  fundo.className = 'aparencia-fundo no-print';
  fundo.innerHTML = `
    <div class="aparencia-caixa" role="dialog" aria-label="Aparência">
      <div class="aparencia-cab"><strong>Aparência</strong>
        <button type="button" class="btn-link" data-fechar>Fechar</button></div>
      ${grupo('Cor do fundo', 'fundo', APARENCIA_FUNDOS, (o) => `<i class="aparencia-amostra" style="background:${o.cor}"></i>`)}
      ${grupo('Cor principal (barra superior, menus e botões)', 'cor', APARENCIA_CORES, (o) => `<i class="aparencia-amostra" style="background:${o.cor}"></i>`)}
      ${grupo('Visualização (tamanho do texto)', 'texto', APARENCIA_TEXTOS, (o) => `<i class="aparencia-amostra-texto" style="font-size:${o.escala === '100%' ? '0.9rem' : o.escala === '112.5%' ? '1.05rem' : '1.2rem'}">Aa</i>`)}
      <button type="button" class="btn-secondary" data-restaurar>Voltar ao padrão</button>
    </div>`;
  document.body.appendChild(fundo);
  const fechar = () => fundo.remove();
  fundo.addEventListener('click', (e) => { if (e.target === fundo) fechar(); });
  fundo.querySelector('[data-fechar]').addEventListener('click', fechar);
  fundo.querySelector('[data-restaurar]').addEventListener('click', () => {
    gravarAparencia({ fundo: 'padrao', cor: 'padrao', texto: 'normal' });
    aplicarAparencia();
    fechar();
    abrirPainelAparencia();
  });
  fundo.querySelectorAll('.aparencia-opcao').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ap = lerAparencia();
      ap[btn.dataset.chave] = btn.dataset.valor;
      gravarAparencia(ap);
      aplicarAparencia(ap);
      fundo.querySelectorAll(`.aparencia-opcao[data-chave="${btn.dataset.chave}"]`).forEach((b) => b.classList.toggle('ativa', b === btn));
    });
  });
}

aplicarAparencia();
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btn-aparencia');
  if (btn) btn.addEventListener('click', abrirPainelAparencia);
});
