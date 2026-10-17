/* Regras de segurança do servidor (server/Code.gs). */
const test = require('node:test');
const assert = require('node:assert');
const { carregarServidor, criarAba, simples } = require('./ambiente');

function servidorComUsuarios() {
  const s = carregarServidor();
  s.abas.Usuarios = criarAba('Usuarios', [
    ['Nome', 'PIN', 'Perfil', 'Ativo'],
    ['Ana Gestora', '1234', 'Gestor', 'Sim'],
    ['Carlos Lima', 420, 'Responsável', 'Sim'], // "0420" que a planilha guardou como número
    ['Bia', '9999', 'Inspetor', 'Sim']
  ]);
  return s;
}

const CAB_ACOES = new Array(26).fill('h');
function linhaAcao(chave, responsavel, registradoPor, acomp = {}) {
  return [chave, 'Inspeção', 'Ação ' + chave, '', '', '', responsavel, '2026-11-01', 'Pendente', '', '', '', registradoPor,
    '', '', '', '', '', '', '', '', '', 0, 100, JSON.stringify(acomp), ''];
}

test('PINs ficam codificados na planilha e o login continua funcionando', () => {
  const s = servidorComUsuarios();
  const r = s.post({ action: 'login', usuarioLogin: 'carlos lima', pin: '0420' });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.perfil, 'Responsável');
  s.abas.Usuarios.rows.slice(1).forEach((l) => assert.match(String(l[1]), /^pin1:/));
  assert.ok(!JSON.stringify(s.abas.Usuarios.rows).includes('1234'));
  assert.strictEqual(s.post({ action: 'login', usuarioLogin: 'Ana Gestora', pin: '1234' }).ok, true);
  assert.strictEqual(s.post({ action: 'login', usuarioLogin: 'Ana Gestora', pin: '4321' }).ok, false);
});

test('PIN novo digitado por cima do código passa a valer', () => {
  const s = servidorComUsuarios();
  s.post({ action: 'ping' });
  s.post({ action: 'login', usuarioLogin: 'Bia', pin: '9999' });
  s.abas.Usuarios.rows[3][1] = '5555';
  assert.strictEqual(s.post({ action: 'login', usuarioLogin: 'Bia', pin: '5555' }).ok, true);
  assert.strictEqual(s.post({ action: 'login', usuarioLogin: 'Bia', pin: '9999' }).ok, false);
});

test('5 PINs errados em qualquer ação bloqueiam o usuário, inclusive no login', () => {
  const s = servidorComUsuarios();
  for (let i = 0; i < 5; i++) assert.strictEqual(s.post({ action: 'listarAcoes', usuarioLogin: 'Bia', pin: '000' + i }).ok, false);
  const r = s.post({ action: 'listarAcoes', usuarioLogin: 'Bia', pin: '9999' });
  assert.strictEqual(r.loginInvalido, true);
  assert.match(r.error, /Muitas tentativas/);
  assert.match(s.post({ action: 'login', usuarioLogin: 'Bia', pin: '9999' }).error, /Muitas tentativas/);
});

test('cada perfil só envia os registros dos seus módulos', () => {
  const s = servidorComUsuarios();
  assert.match(s.post({ action: 'upsertDDS', usuarioLogin: 'Carlos Lima', pin: '420', dds: { id: 'x' } }).error, /perfil Responsável/);
  assert.match(s.post({ action: 'upsertCertificado', usuarioLogin: 'Bia', pin: '9999', certificado: { id: 'x' } }).error, /perfil Inspetor/);
  assert.strictEqual(s.post({ action: 'listarAcoes', usuarioLogin: 'Bia', pin: '9999' }).ok, true);
});

test('Responsável só altera as próprias ações e não muda prazo, responsável nem eficácia', () => {
  const s = servidorComUsuarios();
  s.abas.Acoes_Consolidadas = criarAba('Acoes_Consolidadas', [CAB_ACOES, linhaAcao('k1', 'Joana', 'Ana Gestora'),
    linhaAcao('k2', 'Carlos Lima', 'Ana Gestora', { historico: [{ reaberta: 1 }] })]);
  const login = { usuarioLogin: 'Carlos Lima', pin: '420' };
  assert.match(s.post({ action: 'atualizarAcao', ...login, acao: { chave: 'k1', status: 'Concluída', atualizadoEm: 200, acomp: {} } }).error, /em nome de Joana/);

  const r = s.post({ action: 'atualizarAcao', ...login, acao: { chave: 'k2', status: 'Concluída', responsavel: 'Outro', prazo: '2030-01-01', eficacia: 'Eficaz', atualizadoEm: 200, acomp: { evidencia: 'feito', eficacia: 'Eficaz', historico: [] } } });
  assert.strictEqual(r.ok, true);
  const k2 = s.abas.Acoes_Consolidadas.rows[2];
  assert.strictEqual(k2[8], 'Concluída');
  assert.strictEqual(k2[6], 'Carlos Lima');
  assert.strictEqual(k2[7], '2026-11-01');
  assert.strictEqual(k2[19], '');
  const acomp = JSON.parse(k2[24]);
  assert.strictEqual(acomp.evidencia, 'feito');
  assert.strictEqual(acomp.eficacia, '');
  assert.deepStrictEqual(acomp.historico, [{ reaberta: 1 }]);

  s.post({ action: 'upsertAcoesConsolidadas', ...login, acoes: [{ chave: 'k1', descricao: 'trocada', atualizadoEm: 999 }] });
  assert.strictEqual(s.abas.Acoes_Consolidadas.rows[1][2], 'Ação k1');
});

test('Gestor continua podendo alterar qualquer ação', () => {
  const s = servidorComUsuarios();
  s.abas.Acoes_Consolidadas = criarAba('Acoes_Consolidadas', [CAB_ACOES, linhaAcao('k1', 'Joana', 'Bia')]);
  const r = s.post({ action: 'atualizarAcao', usuarioLogin: 'Ana Gestora', pin: '1234', acao: { chave: 'k1', status: 'Em andamento', responsavel: 'Joana', prazo: '2026-12-01', atualizadoEm: 300, acomp: {} } });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(s.abas.Acoes_Consolidadas.rows[1][7], '2026-12-01');
});

test('textos começando com =, +, - ou @ são gravados como texto', () => {
  const { valor } = carregarServidor();
  const r = valor('protegerContraFormulas_')({ a: '=IMPORTXML("x")', b: '-5', c: '+55 11 9999', d: '@x', e: 'normal', f: ['=1+1'], acomp: { x: '=y' }, photo: { base64: '=abc' }, n: -3 });
  assert.deepStrictEqual(simples(r), { a: "'=IMPORTXML(\"x\")", b: '-5', c: "'+55 11 9999", d: "'@x", e: 'normal', f: ["'=1+1"], acomp: { x: '=y' }, photo: { base64: '=abc' }, n: -3 });
});

test('ping avisa quando a planilha está sem proteção', () => {
  const s = carregarServidor();
  assert.strictEqual(s.post({ action: 'ping' }).protegido, false);
  s.props.CHAVE_ACESSO = 'abc';
  assert.strictEqual(s.post({ action: 'ping', chave: 'abc' }).protegido, true);
  assert.match(s.post({ action: 'ping', chave: 'errada' }).error, /Chave de acesso inválida/);
});

test('pasta do registro no Drive: guardada, buscada pelo ID e nunca duplicada', () => {
  const s = carregarServidor();
  const pastas = [{ id: 'p1', nome: 'aaa - Inspecao' }, { id: 'p2', nome: 'reg-123 - Relato' }];
  const cont = { buscas: 0, varreduras: 0, criadas: 0 };
  let buscaAcha = true;
  const pasta = (p) => ({ getName: () => p.nome, getId: () => p.id });
  const iter = (lista) => { let i = 0; return { hasNext: () => i < lista.length, next: () => lista[i++] }; };
  const raiz = {
    searchFolders: (q) => { cont.buscas++; const t = q.match(/"(.*)"/)[1]; return iter(buscaAcha ? pastas.filter((p) => p.nome.includes(t)).map(pasta) : []); },
    getFolders: () => { cont.varreduras++; return iter(pastas.map(pasta)); },
    getFoldersByName: (n) => iter(pastas.filter((p) => p.nome === n).map(pasta)),
    createFolder: (n) => { cont.criadas++; const p = { id: 'n' + cont.criadas, nome: n }; pastas.push(p); return pasta(p); }
  };
  s.ctx.DriveApp = { getFolderById: (id) => { const p = pastas.find((x) => x.id === id); if (!p) throw new Error('não achou'); return pasta(p); } };
  const pastaDoRegistro = s.valor('pastaDoRegistro_');
  assert.strictEqual(pastaDoRegistro(raiz, 'reg-123').getId(), 'p2');
  assert.strictEqual(pastaDoRegistro(raiz, 'reg-123').getId(), 'p2');
  assert.strictEqual(cont.buscas, 1);
  assert.strictEqual(cont.varreduras, 0);
  buscaAcha = false;
  assert.strictEqual(pastaDoRegistro(raiz, 'aaa').getId(), 'p1');
  assert.strictEqual(cont.varreduras, 1);
  pastaDoRegistro(raiz, 'zzz');
  pastaDoRegistro(raiz, 'zzz');
  assert.strictEqual(cont.criadas, 1);
});

test('fórmula enviada pelo app chega à planilha como texto', () => {
  const s = carregarServidor();
  const r = s.post({ action: 'upsertAcao', acao: { id: 'a1', descricao: '=IMPORTXML("http://x";"//a")', responsavel: 'Ana', prazo: '2026-11-01', status: 'Pendente' } });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(s.abas.Acoes_Avulsas.rows[1][1], '\'=IMPORTXML("http://x";"//a")');
});
