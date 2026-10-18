/* Avaliação de riscos psicossociais do PGR, igual à planilha modelo SGG (js/pgr-psicossocial.js). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { carregarApp, simples } = require('./ambiente');

const RAIZ = path.join(__dirname, '..');
const MODELO = fs.readFileSync(path.join(RAIZ, 'modelos/Modelo_Matriz_Riscos_Psicossociais_SGG.xlsx'));

/** ExcelJS do próprio app (js/vendor), carregado fora do navegador. */
function carregarExcelJS() {
  const ctx = vm.createContext({ console, setTimeout, clearTimeout, setImmediate, TextEncoder, TextDecoder, Buffer,
    process: { env: {}, nextTick: process.nextTick, version: process.version, versions: process.versions, platform: 'browser' } });
  ctx.window = ctx; ctx.self = ctx; ctx.global = ctx;
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'js/vendor/exceljs.min.js'), 'utf8'), ctx);
  return { ExcelJS: ctx.ExcelJS, Uint8: vm.runInContext('Uint8Array', ctx) };
}
const { ExcelJS, Uint8 } = carregarExcelJS();
const escapeHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const app = carregarApp(['js/pgr-psicossocial.js'], { escapeHtml, uuid: () => crypto.randomUUID(), formatarDataBR: (iso) => iso.split('-').reverse().join('/') });
const f = (nome) => app.valor(nome);

async function abrir(buffer) {
  const wb = new ExcelJS.Workbook();
  // Bytes criados no mesmo "mundo" da biblioteca, como acontece no navegador.
  await wb.xlsx.load(new Uint8(buffer).buffer);
  return wb;
}

test('cálculo igual às fórmulas da planilha (nível, classificação e prioridade)', () => {
  const calc = (s, p) => { const r = f('calcularRiscoPsico')(s, p); return [r.nivel, r.classificacao, r.prioridade]; };
  assert.deepStrictEqual(calc(4, 4), [16, 'Alto', 'Ação estruturada (curto prazo)']);
  assert.deepStrictEqual(calc(3, 4), [12, 'Alto', 'Ação estruturada (curto prazo)']);
  assert.deepStrictEqual(calc(5, 4), [20, 'Crítico', 'Intervenção imediata']);
  assert.deepStrictEqual(calc(2, 3), [6, 'Médio', 'Mitigar (médio prazo)']);
  assert.deepStrictEqual(calc(5, 1), [5, 'Baixo', 'Monitorar']);
  assert.deepStrictEqual(calc('', 3), ['', '', '']);
  // Todas as 25 combinações batem com a aba "Matriz 5x5" (nível = P × S).
  for (let s = 1; s <= 5; s++) for (let p = 1; p <= 5; p++) assert.strictEqual(f('calcularRiscoPsico')(s, p).nivel, s * p);
});

test('importa a planilha modelo: os dois exemplos e nenhum critério de exemplo', async () => {
  const lido = f('lerWorkbookPsico')(await abrir(MODELO));
  assert.strictEqual(lido.itens.length, 2);
  assert.strictEqual(lido.itens[0].setor, 'Atendimento ao cliente');
  assert.strictEqual(lido.itens[0].perigo, 'Excesso de demandas no trabalho (sobrecarga)');
  assert.strictEqual(lido.itens[0].severidade, 4);
  assert.strictEqual(lido.itens[1].probabilidade, 4);
  assert.ok(Object.values(simples(lido.criterios)).every((v) => v === ''), 'texto de exemplo entre parênteses não conta como critério');
});

test('exporta no mesmo modelo, com fórmulas, cores e validação, e reimporta igual', async () => {
  const itens = Array.from({ length: 25 }, (_, i) => ({
    ...f('novoItemPsico')(), setor: 'Setor ' + (i + 1), perigo: 'Fator ' + (i + 1), consequencia: 'Transtorno mental',
    caracterizacao: 'Atividade real ' + (i + 1), medidasExistentes: 'Nenhuma', severidade: (i % 5) + 1, probabilidade: ((i + 2) % 5) + 1,
    responsavel: 'RH', prazo: '2026-12-15'
  }));
  const av = { itens, criterios: { ...simples(f('avaliacaoPsicoVazia')().criterios), metodologia: 'Matriz P×S (ISO 31010)', responsavelTecnico: 'Nelsivan Souza' } };
  const wb = f('preencherWorkbookPsico')(await abrir(MODELO), av);
  const buffer = await wb.xlsx.writeBuffer();

  const reaberto = await abrir(buffer);
  const ws = reaberto.getWorksheet('Avaliação Psicossocial');
  assert.strictEqual(ws.getCell('A1').value, 'Matriz de Riscos Psicossociais — Avaliação por setor, cargo ou GHE (NR-1)');
  assert.strictEqual(ws.getCell('C2').value, 'Perigo psicossocial (fator de risco)');
  assert.strictEqual(ws.getCell('I27').formula, 'IF(OR(G27="",H27=""),"",G27*H27)');
  assert.match(ws.getCell('J27').formula, /IF\(I27>=20,"Crítico"/);
  assert.strictEqual(ws.getCell('A27').value, 25);
  assert.ok(ws.getCell('G27').dataValidation, 'validação 1 a 5 também nas linhas novas');
  assert.ok(ws.conditionalFormattings.some((cf) => cf.ref === 'J3:J27'), 'cores da classificação até a última linha');
  assert.match(String(ws.getCell('B29').value), /^As colunas Nível de Risco/, 'observação do modelo desce junto com a tabela');
  assert.strictEqual(reaberto.getWorksheet('Matriz 5x5').getCell('F4').value, 25, 'aba Matriz 5x5 preservada');
  const crit = reaberto.getWorksheet('Critérios & Escalas');
  assert.strictEqual(crit.getCell('B30').value, 'Matriz P×S (ISO 31010)');
  assert.strictEqual(crit.getCell('B34').value, 'Nelsivan Souza');
  assert.match(String(crit.getCell('B31').value), /^\(ex\./, 'critério não preenchido mantém o exemplo do modelo');

  const lido = f('lerWorkbookPsico')(reaberto);
  assert.strictEqual(lido.itens.length, 25);
  assert.deepStrictEqual(simples(lido.itens.map(({ id, ...resto }) => resto)), simples(itens.map(({ id, ...resto }) => resto)));
  assert.strictEqual(lido.criterios.metodologia, 'Matriz P×S (ISO 31010)');
});

test('exportar com poucos fatores limpa os exemplos do modelo', async () => {
  const av = { itens: [{ ...f('novoItemPsico')(), setor: 'Obra', perigo: 'Assédio moral', severidade: 4, probabilidade: 3 }], criterios: simples(f('avaliacaoPsicoVazia')().criterios) };
  const wb = f('preencherWorkbookPsico')(await abrir(MODELO), av);
  const lido = f('lerWorkbookPsico')(await abrir(await wb.xlsx.writeBuffer()));
  assert.strictEqual(lido.itens.length, 1);
  assert.strictEqual(lido.itens[0].perigo, 'Assédio moral');
});

test('planilha de outro formato é recusada com explicação', async () => {
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet('Plan1').getCell('A1').value = 'qualquer coisa';
  assert.throws(() => f('lerWorkbookPsico')(wb), /não parece ser a planilha/);
});

test('PGR antigo ganha a avaliação vazia sem perder dados', () => {
  const dados = { empresa: 'X', psicossocial: { itens: [{ perigo: 'Sobrecarga' }] } };
  const av = simples(f('garantirAvaliacaoPsico')(dados));
  assert.strictEqual(av.itens[0].perigo, 'Sobrecarga');
  assert.strictEqual(av.itens[0].severidade, '');
  assert.deepStrictEqual(Object.keys(av.criterios), ['metodologia', 'metodoIdentificacao', 'instrumento', 'unidadeAnalise', 'responsavelTecnico', 'dataRevisao']);
});
