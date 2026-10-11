/*
 * Utilitários gerais: datas, formatação, DOM, modal, avisos e downloads.
 * Datas são guardadas como texto ISO (AAAA-MM-DD) para não sofrer com fuso horário.
 */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function uid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function norm(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/* ---------------- Datas ---------------- */
const D = {
  pad: (n) => String(n).padStart(2, '0'),
  iso(dt) { return dt.getFullYear() + '-' + D.pad(dt.getMonth() + 1) + '-' + D.pad(dt.getDate()); },
  today() { return D.iso(new Date()); },
  parse(s) {
    if (!s) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (!m) return null;
    const dt = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(dt) ? null : dt;
  },
  br(s) {
    const dt = D.parse(s);
    return dt ? D.pad(dt.getDate()) + '/' + D.pad(dt.getMonth() + 1) + '/' + dt.getFullYear() : '';
  },
  addDays(s, n) { const dt = D.parse(s); if (!dt) return ''; dt.setDate(dt.getDate() + Number(n)); return D.iso(dt); },
  addMonths(s, n) {
    const dt = D.parse(s); if (!dt) return '';
    const day = dt.getDate();
    dt.setDate(1); dt.setMonth(dt.getMonth() + Number(n));
    const last = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
    dt.setDate(Math.min(day, last));
    return D.iso(dt);
  },
  /** dias corridos de a até b (b - a) */
  diff(a, b) {
    const x = D.parse(a), y = D.parse(b);
    if (!x || !y) return null;
    return Math.round((Date.UTC(y.getFullYear(), y.getMonth(), y.getDate()) - Date.UTC(x.getFullYear(), x.getMonth(), x.getDate())) / 86400000);
  },
  year(s) { const dt = D.parse(s); return dt ? dt.getFullYear() : null; },
  month(s) { const dt = D.parse(s); return dt ? dt.getMonth() + 1 : null; },
  meses: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  mesesLongos: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
  /** converte texto dd/mm/aaaa ou número serial do Excel em ISO */
  fromAny(v) {
    if (v == null || v === '') return '';
    if (typeof v === 'number' && isFinite(v)) {
      if (v < 1 || v > 120000) return '';
      const dt = new Date(Math.round((v - 25569) * 86400000));
      return dt.getUTCFullYear() + '-' + D.pad(dt.getUTCMonth() + 1) + '-' + D.pad(dt.getUTCDate());
    }
    const s = String(v).trim();
    let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (m) return m[1] + '-' + m[2] + '-' + m[3];
    m = /^(\d{1,2})\/+(\d{1,2})\/+(\d{2,5})$/.exec(s);
    if (m) {
      let y = m[3];
      if (y.length === 2) y = '20' + y;
      if (y.length === 5) y = y.slice(0, 4); // erros comuns de digitação: 20222
      return y + '-' + D.pad(m[2]) + '-' + D.pad(m[1]);
    }
    if (/^\d+(\.\d+)?$/.test(s)) return D.fromAny(Number(s));
    return '';
  }
};

/* ---------------- Números ---------------- */
const fmtInt = (n) => (n == null || isNaN(n) ? '–' : Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 0 }));
const fmtNum = (n, d = 2) => (n == null || isNaN(n) ? '–' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: d }));
const fmtMoney = (n) => (n == null || n === '' || isNaN(n) ? '' : Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
function toNum(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v;
  const s = String(v).trim().replace(/\s/g, '').replace(/^R\$/, '');
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
  return isFinite(n) ? n : null;
}

/* ---------------- DOM ---------------- */
function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.hidden = true; }, ms);
}

const Modal = {
  open({ title, body, foot, small = false, onClose }) {
    $('#modal-title').textContent = title;
    const b = $('#modal-body'); b.innerHTML = '';
    if (typeof body === 'string') b.innerHTML = body; else if (body) b.appendChild(body);
    const f = $('#modal-foot'); f.innerHTML = '';
    (foot || []).forEach((btn) => f.appendChild(btn));
    f.hidden = !(foot && foot.length);
    $('.modal-box').classList.toggle('small', small);
    $('#modal').hidden = false;
    Modal._onClose = onClose;
    const first = b.querySelector('input:not([type=hidden]), select, textarea');
    if (first) setTimeout(() => first.focus(), 30);
  },
  close() {
    $('#modal').hidden = true;
    if (Modal._onClose) { const fn = Modal._onClose; Modal._onClose = null; fn(); }
  }
};

function button(label, cls, onClick) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'btn ' + (cls || ''); b.textContent = label;
  if (onClick) b.addEventListener('click', onClick);
  return b;
}

/** Confirmação dentro da página (sem window.confirm). Resolve true/false. */
function confirmar(msg, okLabel = 'Confirmar', perigo = false) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (done) return; done = true; Modal.close(); resolve(v); };
    Modal.open({
      title: 'Confirmação', small: true,
      body: '<p>' + esc(msg) + '</p>',
      foot: [button('Cancelar', '', () => finish(false)), button(okLabel, perigo ? 'btn-danger' : 'btn-primary', () => finish(true))],
      onClose: () => { if (!done) { done = true; resolve(false); } }
    });
  });
}

function download(nome, conteudo, tipo = 'application/octet-stream') {
  const blob = conteudo instanceof Blob ? conteudo : new Blob([conteudo], { type: tipo });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nome;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

function lerArquivo(file, modo = 'text') {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    if (modo === 'dataurl') r.readAsDataURL(file);
    else if (modo === 'buffer') r.readAsArrayBuffer(file);
    else r.readAsText(file, 'utf-8');
  });
}

function slugArquivo(s) {
  return norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'empresa';
}
