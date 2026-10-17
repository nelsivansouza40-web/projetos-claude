/* 5 Porquês e Ishikawa da Investigação de Acidente (js/analise-causas.js). */
const test = require('node:test');
const assert = require('node:assert');
const { carregarApp, simples } = require('./ambiente');

const escapeHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const app = carregarApp(['js/analise-causas.js'], { escapeHtml });
const f = (nome) => app.valor(nome);

test('investigação antiga ganha os campos vazios sem perder o que já tem', () => {
  const antiga = { causasImediatas: 'piso molhado', cincoPorques: { porques: ['a'] }, ishikawa: { maquina: 'sem proteção' } };
  const d = simples(f('garantirAnaliseCausa')(antiga));
  assert.strictEqual(d.causasImediatas, 'piso molhado');
  assert.deepStrictEqual(d.cincoPorques, { problema: '', porques: ['a', '', '', '', ''], causaRaiz: '' });
  assert.strictEqual(d.ishikawa.maquina, 'sem proteção');
  assert.deepStrictEqual(Object.keys(d.ishikawa).sort(), ['maoDeObra', 'maquina', 'material', 'medida', 'meioAmbiente', 'metodo']);
});

test('relatório só mostra o que foi preenchido, com texto protegido', () => {
  const vazia = f('garantirAnaliseCausa')({});
  assert.strictEqual(f('htmlRelatorioCincoPorques')(vazia), '');
  assert.strictEqual(f('htmlRelatorioIshikawa')(vazia, 'Queda'), '');
  const d = f('garantirAnaliseCausa')({
    cincoPorques: { problema: 'Queda da escada', porques: ['Escada escorregou', 'Sem sapata', '', '', ''], causaRaiz: 'Sem inspeção de escadas' },
    ishikawa: { metodo: 'Sem procedimento <b>', maoDeObra: 'Sem treinamento' }
  });
  const porques = f('htmlRelatorioCincoPorques')(d);
  assert.match(porques, /1º Por quê\?<\/td><td>Escada escorregou/);
  assert.doesNotMatch(porques, /3º Por quê/);
  assert.match(porques, /Sem inspeção de escadas/);
  const ish = f('htmlRelatorioIshikawa')(d, 'Queda da escada');
  assert.match(ish, /Sem procedimento &lt;b&gt;/);
  assert.match(ish, /ish-efeito">Queda da escada/);
  assert.strictEqual((ish.match(/ish-caixa/g) || []).length, 6);
});
