/* Comportamento da sincronização no aparelho (js/sync.js). */
const test = require('node:test');
const assert = require('node:assert');
const { carregarApp } = require('./ambiente');

function appComServidor(responder) {
  const chamadas = [];
  const app = carregarApp(['js/report.js', 'js/inteligencia.js', 'js/acoes.js', 'js/sync.js'], {
    fetch: async (url, opcoes) => {
      const corpo = JSON.parse(opcoes.body);
      chamadas.push(corpo.action);
      return new Response(JSON.stringify(await responder(corpo, opcoes)));
    }
  });
  return { app, chamadas, valor: app.valor };
}

test('PIN recusado: o app para de enviar até a pessoa entrar de novo', async () => {
  const { valor, chamadas, app } = appComServidor(() => ({ ok: false, loginInvalido: true, error: 'Usuário ou PIN inválido.' }));
  await app.ctx.DB.setSetting('endpointUrl', 'https://servidor/exec');
  await valor('postJson')('https://servidor/exec', { action: 'upsertInspection' });
  assert.strictEqual(chamadas.length, 1);
  await assert.rejects(valor('postJson')('https://servidor/exec', { action: 'upsertDDS' }), /recusou o usuário ou PIN/);
  await assert.rejects(valor('Sync').syncAll(), /recusou o usuário ou PIN/);
  assert.strictEqual(chamadas.length, 1, 'nenhum envio a mais depois da recusa');
  assert.strictEqual(await app.ctx.DB.getSetting('loginRecusado'), true);
});

test('envio sem resposta desiste depois de 90 segundos', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { valor } = appComServidor((corpo, opcoes) => new Promise((_, rejeitar) => {
    opcoes.signal.addEventListener('abort', () => rejeitar(Object.assign(new Error('abortado'), { name: 'AbortError' })));
  }));
  const envio = valor('postJson')('https://servidor/exec', { action: 'upsertInspection' });
  await new Promise((r) => setImmediate(r));
  t.mock.timers.tick(89 * 1000);
  t.mock.timers.tick(2 * 1000);
  await assert.rejects(envio, /não respondeu em 90 segundos/);
});

test('sincronização com falha marca nova tentativa; sem falha, não', async () => {
  let falhar = true;
  const { valor, app } = appComServidor((corpo) => {
    if (corpo.action === 'ping') return { ok: true, versao: 'x', protegido: true };
    if (falhar) throw new Error('rede caiu');
    return { ok: true, acoes: [], total: 0 };
  });
  await app.ctx.DB.setSetting('endpointUrl', 'https://servidor/exec');
  const Sync = valor('Sync');
  await assert.rejects(Sync.syncAll());
  assert.strictEqual(Sync.ultimaComFalha, true);
  falhar = false;
  await Sync.syncAll();
  assert.strictEqual(Sync.ultimaComFalha, false);
});

test('servidor sem proteção fica registrado para o aviso ao gestor', async () => {
  const { valor, app } = appComServidor((corpo) => (corpo.action === 'ping' ? { ok: true, protegido: false } : { ok: true, acoes: [] }));
  await app.ctx.DB.setSetting('endpointUrl', 'https://servidor/exec');
  await valor('Sync').syncAll();
  assert.strictEqual(await app.ctx.DB.getSetting('servidorProtegido'), false);
  assert.match(await valor('htmlAvisoServidorDesprotegido')(), /Planilha sem proteção/);
});
