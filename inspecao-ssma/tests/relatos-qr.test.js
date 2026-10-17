/* Importação no app dos relatos recebidos pelo QR Code (js/relatos-qr.js). */
const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { carregarApp } = require('./ambiente');

function appRelatos(relatosLocais, respostaServidor) {
  const enviados = [];
  const app = carregarApp(['js/relatos.js', 'js/relatos-qr.js'], {
    uuid: () => crypto.randomUUID(),
    escapeHtml: (t) => String(t),
    URL_APP_PUBLICADO: 'https://exemplo.github.io/projetos-claude/',
    postJson: async (url, corpo) => { enviados.push(corpo); return respostaServidor; }
  });
  app.ctx.DB.getAllRelatos = async () => relatosLocais;
  app.ctx.DB.putRelato = async (r) => { relatosLocais.push(r); };
  return { app, enviados };
}

const recebido = {
  id: 'QR-20261017-101500-AB12', recebidoEm: '2026-10-17T13:15:00.000Z', tipo: 'Condição insegura', potencial: '',
  empresa: 'X', area: 'Oficina', local: 'Bancada 2', descricao: 'Fio desencapado', acaoImediata: 'Isolei',
  anonimo: false, nome: 'José', funcao: 'Eletricista', fotos: ['https://drive/1']
};

test('relato do QR vira relato do app, concluído e pronto para tratamento', () => {
  const { app } = appRelatos([], { ok: true });
  const r = app.valor('relatoDoQR')(recebido);
  assert.strictEqual(r.completo, true);
  assert.strictEqual(r.data.tipo, 'Condição insegura');
  assert.strictEqual(r.data.potencial, 'Médio', 'sem potencial informado, entra como Médio para a equipe reavaliar');
  assert.strictEqual(r.data.relator, 'José');
  assert.strictEqual(r.data.origemQR, recebido.id);
  assert.match(r.data.descricao, /Fio desencapado/);
  assert.match(r.data.descricao, /protocolo QR-20261017-101500-AB12; potencial não informado/);
  assert.match(r.data.descricao, /Fotos: https:\/\/drive\/1/);
  assert.strictEqual(app.valor('relatoDoQR')({ ...recebido, anonimo: true }).data.relator, '');
});

test('importar duas vezes o mesmo relato não duplica no aparelho', async () => {
  const locais = [];
  const { app, enviados } = appRelatos(locais, { ok: true });
  await app.valor('importarRelatoQR')(recebido, 'https://servidor/exec');
  await app.valor('importarRelatoQR')(recebido, 'https://servidor/exec');
  assert.strictEqual(locais.length, 1);
  assert.deepStrictEqual(enviados.map((e) => e.action), ['marcarRelatoQRImportado', 'marcarRelatoQRImportado']);
});

test('endereço da placa leva servidor, código e área', () => {
  const { app } = appRelatos([], { ok: true });
  app.ctx.location = { protocol: 'file:', host: '' };
  app.ctx.URLSearchParams = URLSearchParams;
  const url = app.valor('urlPaginaRelatoQR')('https://script.google.com/macros/s/abc/exec', 'cod123', { area: 'Oficina', local: 'Bancada 2' });
  const u = new URL(url);
  assert.strictEqual(u.pathname.endsWith('/relato.html'), true);
  assert.strictEqual(u.searchParams.get('u'), 'https://script.google.com/macros/s/abc/exec');
  assert.strictEqual(u.searchParams.get('c'), 'cod123');
  assert.strictEqual(u.searchParams.get('a'), 'Oficina');
});
