/* Cálculos do app que alimentam relatórios, painel e Inteligência SSMA. */
const test = require('node:test');
const assert = require('node:assert');
const { carregarApp, simples } = require('./ambiente');

const app = carregarApp(['js/report.js', 'js/inteligencia.js', 'js/acoes.js', 'js/menu.js']);
const f = (nome) => app.valor(nome);

test('índice de conformidade ignora "Não se Aplica" e itens sem resposta', () => {
  const r = f('calcularEstatisticas')([
    { resposta: 'Conforme' }, { resposta: 'Conforme' }, { resposta: 'Conforme' },
    { resposta: 'Não Conforme' }, { resposta: 'Não se Aplica' }, { resposta: '' }
  ]);
  assert.deepStrictEqual(simples(r), { total: 6, conforme: 3, naoConforme: 1, naoAplica: 1, semResposta: 1, indice: 75 });
  assert.strictEqual(f('calcularEstatisticas')([{ resposta: 'Não se Aplica' }]).indice, null);
});

test('código do relatório segue o padrão RI-TIPO-DATA-ID', () => {
  const codigo = f('gerarCodigoDocumento')({ id: 'ab12cd-99', data: { tipoInspecao: 'Trabalho em Altura', identificacao: { data: '2026-10-17' } } });
  assert.strictEqual(codigo, 'RI-TRA-20261017-AB12CD');
});

function inspecao(id, data, area, itens) {
  return { id, completo: true, data: { tipoInspecao: 'Geral', identificacao: { data, area, empresa: 'X' },
    checklist: itens.map((t, i) => ({ id: 'i' + i, texto: t, resposta: 'Não Conforme' })) } };
}

test('reincidência: mesmo item não conforme na mesma área em até 90 dias', () => {
  const r = f('analisarReincidencias')([
    inspecao('a', '2026-01-10', 'Oficina', ['Extintor obstruído']),
    inspecao('b', '2026-03-01', 'oficina ', ['Extintor  obstruído']), // 50 dias, mesma área e item (maiúsculas e espaços não contam)
    inspecao('c', '2026-08-01', 'Oficina', ['Extintor obstruído']), // 153 dias depois: fora da janela
    inspecao('d', '2026-03-05', 'Almoxarifado', ['Extintor obstruído']) // outra área
  ]);
  assert.strictEqual(r.porItem.get('a:i0').reincidente, false);
  assert.strictEqual(r.porItem.get('b:i0').reincidente, true);
  assert.strictEqual(r.porItem.get('b:i0').anterior, '2026-01-10');
  assert.strictEqual(r.porItem.get('c:i0').reincidente, false);
  assert.strictEqual(r.porItem.get('d:i0').reincidente, false);
  assert.strictEqual(r.grupos.length, 1);
});

test('IMP: média ponderada só dos componentes com dado', () => {
  const pesos = simples(f('PESOS_IMP_PADRAO'));
  assert.strictEqual(f('calcularIMP')({ conformidade: 80, tratamento: 60 }, pesos), (80 * 25 + 60 * 20) / 45);
  assert.strictEqual(f('calcularIMP')({}, pesos), null);
  assert.strictEqual(f('faixaIMP')(90).rotulo, 'Controle consistente');
  assert.strictEqual(f('faixaIMP')(10).rotulo, 'Intervenção prioritária');
});

test('situação da ação conforme o prazo', () => {
  const daqui = (d) => f('somarDias')(f('hojeISO')(), d);
  const situacao = (a) => f('situacaoAcao')(a).chave;
  assert.strictEqual(situacao({ status: 'Concluída', prazo: daqui(-10) }), 'concluida');
  assert.strictEqual(situacao({ status: 'Pendente', prazo: daqui(-3) }), 'atrasada');
  assert.strictEqual(situacao({ status: 'Pendente', prazo: daqui(0) }), 'embreve');
  assert.strictEqual(situacao({ status: 'Pendente', prazo: daqui(30) }), 'noprazo');
  assert.strictEqual(situacao({ status: 'Pendente', prazo: '' }), 'semprazo');
});

test('etapa da eficácia depois da conclusão', () => {
  const etapa = (a) => (f('etapaEficacia')(a) || { chave: null }).chave;
  const daqui = (d) => f('somarDias')(f('hojeISO')(), d);
  assert.strictEqual(etapa({ status: 'Pendente', acomp: {} }), null);
  assert.strictEqual(etapa({ status: 'Pendente', acomp: { historico: [{}] } }), 'reaberta');
  assert.strictEqual(etapa({ status: 'Concluída', acomp: {} }), 'semevidencia');
  assert.strictEqual(etapa({ status: 'Concluída', acomp: { evidencia: 'ok', verificarEm: daqui(10) } }), 'aguardando');
  assert.strictEqual(etapa({ status: 'Concluída', acomp: { evidencia: 'ok', verificarEm: daqui(-1) } }), 'verificar');
  assert.strictEqual(etapa({ status: 'Concluída', acomp: { evidencia: 'ok', eficacia: 'Eficaz' } }), 'eficaz');
});

test('menu: Certificados retirado para todos; cada perfil vê só os seus módulos', () => {
  const ver = (perfil, aba) => app.valor(`PERFIL_ATUAL = ${JSON.stringify(perfil)}; abaPermitida(${JSON.stringify(aba)})`);
  ['Gestor', 'Inspetor', 'Responsável'].forEach((p) => assert.strictEqual(ver(p, 'certificados'), false));
  assert.strictEqual(ver('Gestor', 'pgr'), true);
  assert.strictEqual(ver('Inspetor', 'inspecoes'), true);
  assert.strictEqual(ver('Inspetor', 'dds'), false);
  assert.strictEqual(ver('Responsável', 'acoes'), true);
  assert.strictEqual(ver('Responsável', 'inspecoes'), false);
});
