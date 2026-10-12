/*
 * Cuidados de iPhone (iOS) e Android, aplicados a todo o app:
 * - cartão de instalação na tela inicial (passo a passo no Safari do
 *   iPhone; botão "Instalar aplicativo" no Chrome do Android);
 * - ao enviar o app para segundo plano, o campo em edição perde o foco,
 *   disparando o salvamento normal do formulário (o iOS pode suspender o
 *   app sem avisar);
 * - nos relatórios, no iPhone, orientação para usar "Compartilhar PDF".
 */

function ehIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function estaInstalado() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

let eventoInstalacao = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  eventoInstalacao = e;
  if (typeof state !== 'undefined' && state.screen === 'home') renderHome();
});
window.addEventListener('appinstalled', () => { eventoInstalacao = null; });

function cartaoInstalacao() {
  if (estaInstalado()) return '';
  if (ehIOS()) {
    return `<div class="cartao-instalar">
      <strong>Instalar no iPhone</strong>
      <p>Instale para usar sem internet e para o iPhone não apagar as inspeções guardadas.</p>
      <ol>
        <li>Abra este endereço no <strong>Safari</strong>.</li>
        <li>Toque em <strong>Compartilhar</strong> (quadrado com seta para cima).</li>
        <li>Escolha <strong>Adicionar à Tela de Início</strong> e confirme.</li>
      </ol>
    </div>`;
  }
  if (eventoInstalacao) {
    return `<div class="cartao-instalar">
      <strong>Instalar no aparelho</strong>
      <p>Instale para abrir como aplicativo e usar sem internet.</p>
      <button type="button" class="btn-primary" id="btn-instalar-app">Instalar aplicativo</button>
    </div>`;
  }
  return '';
}

function ligarCartaoInstalacao() {
  const btn = document.getElementById('btn-instalar-app');
  if (!btn || !eventoInstalacao) return;
  btn.addEventListener('click', async () => {
    eventoInstalacao.prompt();
    await eventoInstalacao.userChoice;
    eventoInstalacao = null;
    renderHome();
  });
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'hidden') return;
  const ativo = document.activeElement;
  if (ativo && /^(INPUT|TEXTAREA|SELECT)$/.test(ativo.tagName)) ativo.blur();
});

function instalarDicaPdfIOS() {
  if (!ehIOS()) return;
  const area = document.getElementById('view');
  if (!area || !area.querySelector('article.rep-doc')) return;
  const barra = Array.from(area.querySelectorAll('.form-actions.no-print')).find((el) => /imprimir/i.test(el.textContent));
  if (!barra || area.querySelector('.dica-pdf-ios')) return;
  const dica = document.createElement('p');
  dica.className = 'hint dica-pdf-ios no-print';
  dica.textContent = 'No iPhone, use "Compartilhar PDF" para salvar em Arquivos ou enviar por WhatsApp e e-mail.';
  barra.insertAdjacentElement('beforebegin', dica);
}

/* ---------- Aviso de instalação ao abrir o link no celular ---------- */

const CHAVE_AVISO_INSTALAR = 'avisoInstalarDispensadoEm';
const DIAS_SEM_REPETIR_AVISO = 3;

function avisoInstalarDispensadoRecente() {
  try {
    const em = Number(localStorage.getItem(CHAVE_AVISO_INSTALAR) || 0);
    return em && (Date.now() - em) < DIAS_SEM_REPETIR_AVISO * 86400000;
  } catch (e) {
    return false;
  }
}

function fecharAvisoInstalar(lembrar) {
  const el = document.getElementById('aviso-instalar');
  if (el) el.remove();
  if (lembrar) {
    try { localStorage.setItem(CHAVE_AVISO_INSTALAR, String(Date.now())); } catch (e) { /* sem armazenamento */ }
  }
}

function mostrarAvisoInstalar() {
  if (estaInstalado() || avisoInstalarDispensadoRecente()) return;
  if (!window.matchMedia('(pointer: coarse)').matches) return; // só no celular/tablet
  const ios = ehIOS();
  let corpo;
  if (ios) {
    corpo = `<p>Para usar sem internet e não perder as inspeções, instale na tela de início:</p>
      <ol>
        <li>Abra este endereço no <strong>Safari</strong>.</li>
        <li>Toque em <strong>Compartilhar</strong> (quadrado com seta para cima).</li>
        <li>Escolha <strong>Adicionar à Tela de Início</strong> e confirme.</li>
      </ol>`;
  } else if (eventoInstalacao) {
    corpo = `<p>Instale o aplicativo para abrir pela tela inicial e usar sem internet.</p>
      <button type="button" class="btn-primary" data-instalar-agora>Instalar aplicativo</button>`;
  } else {
    corpo = `<p>Para usar sem internet, instale na tela inicial: no Chrome, toque no menu <strong>⋮</strong> e escolha
      <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.</p>`;
  }
  fecharAvisoInstalar(false);
  const aviso = document.createElement('div');
  aviso.id = 'aviso-instalar';
  aviso.className = 'aviso-instalar no-print';
  aviso.setAttribute('role', 'dialog');
  aviso.innerHTML = `<div class="aviso-instalar-caixa">
      <strong>Instalar o Inspeções SSMA no celular</strong>
      ${corpo}
      <button type="button" class="btn-link" data-agora-nao>Agora não</button>
    </div>`;
  document.body.appendChild(aviso);
  aviso.querySelector('[data-agora-nao]').addEventListener('click', () => fecharAvisoInstalar(true));
  const btn = aviso.querySelector('[data-instalar-agora]');
  if (btn) {
    btn.addEventListener('click', async () => {
      eventoInstalacao.prompt();
      await eventoInstalacao.userChoice;
      eventoInstalacao = null;
      fecharAvisoInstalar(false);
    });
  }
}

// No Android o botão "Instalar" depende do evento do Chrome, que chega logo
// após a abertura; o aviso espera um instante por ele.
window.addEventListener('beforeinstallprompt', () => {
  if (document.getElementById('aviso-instalar')) mostrarAvisoInstalar();
});

document.addEventListener('DOMContentLoaded', () => {
  const area = document.getElementById('view');
  if (area) new MutationObserver(instalarDicaPdfIOS).observe(area, { childList: true });
  setTimeout(mostrarAvisoInstalar, 1200);
});
