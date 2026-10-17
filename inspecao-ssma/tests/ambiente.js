/*
 * Ambiente de teste: carrega os arquivos do app e do servidor no Node, sem
 * navegador e sem planilha de verdade. O navegador, o banco do aparelho
 * (DB), a planilha e o Drive são simulados só no necessário para os testes.
 * Rodar: node --test inspecao-ssma/tests
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const RAIZ = path.join(__dirname, '..');
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

/** Banco do aparelho em memória: configurações de verdade, listas vazias. */
function criarDB() {
  const settings = {};
  const base = {
    async getSetting(k) { return settings[k]; },
    async setSetting(k, v) { settings[k] = v; },
    settings
  };
  return new Proxy(base, {
    get(alvo, nome) {
      if (nome in alvo) return alvo[nome];
      if (typeof nome === 'string' && /^getAll/.test(nome)) return async () => [];
      return undefined;
    }
  });
}

/**
 * Carrega scripts do app (caminhos relativos a inspecao-ssma/) num contexto
 * com navegador simulado. Devolve { ctx, valor(expr) } para ler funções e
 * constantes do app, inclusive as declaradas com const.
 */
function carregarApp(arquivos, extras = {}) {
  const elementos = {};
  const ctx = vm.createContext({
    console, URL, Blob, Response, AbortController, TextEncoder, TextDecoder,
    // Repassa para os relógios do Node, para os testes poderem simular a passagem do tempo.
    setTimeout: (...a) => globalThis.setTimeout(...a), clearTimeout: (...a) => globalThis.clearTimeout(...a),
    setInterval: () => 0, clearInterval: () => {},
    navigator: { onLine: true },
    window: { addEventListener() {} },
    document: {
      visibilityState: 'visible',
      addEventListener() {},
      getElementById: (id) => elementos[id] || null,
      querySelector: () => null,
      querySelectorAll: () => []
    },
    DB: criarDB(),
    fetch: async () => { throw new Error('fetch não simulado neste teste'); },
    ...extras
  });
  arquivos.forEach((rel) => vm.runInContext(ler(rel), ctx, { filename: rel }));
  return { ctx, valor: (expr) => vm.runInContext(expr, ctx) };
}

/* ---------------- Servidor (Apps Script) simulado ---------------- */

function criarAba(nome, linhas = []) {
  return {
    nome, rows: linhas,
    appendRow(l) { this.rows.push(l); },
    setFrozenRows() {},
    getLastRow() { return this.rows.length; },
    getLastColumn() { return Math.max(1, ...this.rows.map((r) => r.length)); },
    getRange(r, c, nr = 1, nc = 1) {
      const aba = this;
      return {
        getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => {
          const v = (aba.rows[r - 1 + i] || [])[c - 1 + j];
          return v === undefined ? '' : v;
        })),
        setValues(v) {
          v.forEach((linha, i) => { aba.rows[r - 1 + i] = aba.rows[r - 1 + i] || []; linha.forEach((x, j) => { aba.rows[r - 1 + i][c - 1 + j] = x; }); });
          return this;
        },
        setValue(x) { aba.rows[r - 1] = aba.rows[r - 1] || []; aba.rows[r - 1][c - 1] = x; return this; },
        setNumberFormat() { return this; },
        createTextFinder: (t) => ({ matchEntireCell: () => ({ findNext() {
          for (let i = r - 1; i < aba.rows.length; i++) if (String(aba.rows[i][c - 1]) === t) return { getRow: () => i + 1 };
          return null;
        } }) })
      };
    }
  };
}

/** Carrega server/Code.gs com planilha, propriedades, cache e trava simulados. */
function carregarServidor() {
  const abas = {};
  const props = {};
  const cache = {};
  const ctx = vm.createContext({
    console,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (n) => abas[n] || null, insertSheet: (n) => (abas[n] = criarAba(n)) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = v; } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = v; }, remove: (k) => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      computeHmacSha256Signature: (v, k) => [...crypto.createHmac('sha256', k).update(v).digest()],
      base64EncodeWebSafe: (b) => Buffer.from(b).toString('base64url'),
      formatDate: (d) => d.toISOString().slice(0, 10)
    },
    Session: { getScriptTimeZone: () => 'UTC' },
    ContentService: { createTextOutput: (t) => ({ setMimeType: () => JSON.parse(t) }), MimeType: { JSON: 'json', TEXT: 'text' } }
  });
  vm.runInContext(ler('server/Code.gs'), ctx, { filename: 'server/Code.gs' });
  const valor = (expr) => vm.runInContext(expr, ctx);
  const post = (corpo) => valor('doPost')({ postData: { contents: JSON.stringify(corpo) } });
  return { ctx, abas, props, cache, valor, post, criarAba };
}

/** Converte objetos criados dentro do contexto simulado para comparação com deepStrictEqual. */
const simples = (v) => JSON.parse(JSON.stringify(v));

module.exports = { carregarApp, carregarServidor, criarAba, simples };
