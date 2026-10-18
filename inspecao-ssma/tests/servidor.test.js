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

test('lembretes semanais: cada responsável recebe as suas; gestor recebe o resumo', () => {
  const s = carregarServidor();
  s.abas.Usuarios = criarAba('Usuarios', [
    ['Nome', 'PIN', 'Perfil', 'Ativo', 'E-mail'],
    ['Ana Gestora', '1', 'Gestor', 'Sim', 'ana@empresa.com'],
    ['Carlos Lima', '2', 'Responsável', 'Sim', 'carlos@empresa.com'],
    ['Joana', '3', 'Responsável', 'Sim', ''],
    ['Pedro', '4', 'Responsável', 'Não', 'pedro@empresa.com']
  ]);
  const acao = (chave, resp, prazo, status = 'Pendente', acomp = {}) => {
    const l = linhaAcao(chave, resp, 'Ana Gestora', acomp);
    l[7] = prazo; l[8] = status; return l;
  };
  s.abas.Acoes_Consolidadas = criarAba('Acoes_Consolidadas', [CAB_ACOES,
    acao('k1', 'Carlos Lima', '2026-10-10'), // atrasada
    acao('k2', 'carlos lima', '2026-10-22'), // vence em 3 dias
    acao('k3', 'Carlos Lima', '2026-12-01'), // longe: fora do lembrete
    acao('k4', 'Carlos Lima', '2026-10-01', 'Concluída'), // concluída: fora
    acao('k5', 'Joana', '2026-10-15'), // sem e-mail
    acao('k6', 'Pedro', '2026-10-15'), // inativo: sem e-mail
    acao('k7', 'Carlos Lima', '2026-10-01', 'Concluída', { evidencia: 'feito', verificarEm: '2026-10-18' }) // eficácia a verificar
  ]);
  const r = s.valor('montarLembretesDeAcoes_')('2026-10-19');
  const paraCarlos = r.emails.filter((e) => e.para === 'carlos@empresa.com');
  assert.strictEqual(paraCarlos.length, 1);
  assert.match(paraCarlos[0].assunto, /1 atrasada\(s\), 1 vencendo/);
  assert.match(paraCarlos[0].html, /Ação k1/);
  assert.match(paraCarlos[0].html, /Atrasada 9 dia/);
  assert.doesNotMatch(paraCarlos[0].html, /Ação k3|Ação k4/);
  const resumo = r.emails.find((e) => e.para === 'ana@empresa.com');
  assert.ok(resumo, 'gestor recebe o resumo');
  assert.match(resumo.html, /Eficácia a verificar \(1\)/);
  assert.match(resumo.html, /Joana \(1\)/);
  assert.match(resumo.html, /Pedro \(1\)/);
  assert.strictEqual(r.emails.length, 2);
});

test('lembretes: envio respeita a cota diária e o agendamento fica único', () => {
  const s = carregarServidor();
  s.abas.Usuarios = criarAba('Usuarios', [['Nome', 'PIN', 'Perfil', 'Ativo', 'E-mail'], ['Carlos', '2', 'Responsável', 'Sim', 'c@x.com']]);
  const l = linhaAcao('k1', 'Carlos', 'Ana'); l[7] = '2000-01-01';
  s.abas.Acoes_Consolidadas = criarAba('Acoes_Consolidadas', [CAB_ACOES, l]);
  const enviados = [];
  let cota = 0;
  s.ctx.MailApp = { getRemainingDailyQuota: () => cota, sendEmail: (m) => enviados.push(m) };
  assert.strictEqual(s.valor('enviarLembretesDeAcoes')(), 0);
  cota = 100;
  assert.strictEqual(s.valor('enviarLembretesDeAcoes')(), 1);
  assert.strictEqual(enviados[0].to, 'c@x.com');

  const gatilhos = [];
  s.ctx.ScriptApp = {
    WeekDay: { MONDAY: 'MONDAY' },
    getProjectTriggers: () => gatilhos.slice(),
    deleteTrigger: (t) => gatilhos.splice(gatilhos.indexOf(t), 1),
    newTrigger: (fn) => ({ timeBased: () => ({ onWeekDay: () => ({ atHour: () => ({ create: () => gatilhos.push({ getHandlerFunction: () => fn }) }) }) }) })
  };
  s.valor('ativarLembretesSemanais')();
  s.valor('ativarLembretesSemanais')();
  assert.strictEqual(gatilhos.length, 1);
});

/* ---------------- Relato pelo QR Code ---------------- */

function servidorComDrive() {
  const s = servidorComUsuarios();
  const arquivos = [];
  const pasta = (nome) => ({
    nome,
    getFoldersByName: () => ({ hasNext: () => false }),
    createFolder: (n) => pasta(nome + '/' + n),
    createFile: (blob) => { arquivos.push({ pasta: nome, blob }); return { getUrl: () => 'https://drive/' + arquivos.length }; },
    getUrl: () => 'https://drive/pasta', getId: () => nome
  });
  s.ctx.DriveApp = { getRootFolder: () => pasta('raiz') };
  s.ctx.Utilities.newBlob = (bytes, tipo, nome) => ({ bytes, tipo, nome });
  s.ctx.Utilities.base64Decode = (b) => Buffer.from(b, 'base64');
  return { s, arquivos };
}

const gestor = { usuarioLogin: 'Ana Gestora', pin: '1234' };

test('relato pelo QR: sem o código certo nada é gravado', () => {
  const { s } = servidorComDrive();
  let r = s.post({ action: 'relatoPublico', codigo: 'qualquer', relato: { descricao: 'Degrau solto na escada' } });
  assert.strictEqual(r.ok, false);
  const codigo = s.post({ action: 'codigoRelatoQR', ...gestor }).codigo;
  assert.ok(codigo && codigo.length >= 16);
  r = s.post({ action: 'relatoPublico', codigo: 'errado', relato: { descricao: 'Degrau solto na escada' } });
  assert.match(r.error, /não está mais ativo/);
  assert.strictEqual(s.abas.Relatos_QR, undefined);
});

test('relato pelo QR: grava como texto, respeita o anonimato e limita fotos', () => {
  const { s, arquivos } = servidorComDrive();
  const codigo = s.post({ action: 'codigoRelatoQR', ...gestor }).codigo;
  const fotoPequena = Buffer.from('jpeg').toString('base64');
  const fotoGrande = 'A'.repeat(3 * 1024 * 1024);
  const r = s.post({ action: 'relatoPublico', codigo, relato: {
    tipo: 'Condição insegura', potencial: 'Alto', area: 'Oficina', local: 'Bancada 2',
    descricao: '=HYPERLINK("http://x")', anonimo: true, nome: 'Não deve aparecer',
    fotos: [{ base64: fotoPequena }, { base64: fotoGrande }, { base64: fotoPequena }]
  } });
  assert.strictEqual(r.ok, true);
  assert.match(r.protocolo, /^QR-/);
  const linha = s.abas.Relatos_QR.rows[1];
  assert.strictEqual(linha[2], 'Condição insegura');
  assert.strictEqual(linha[7], '\'=HYPERLINK("http://x")');
  assert.strictEqual(linha[9], 'Sim');
  assert.strictEqual(linha[10], '');
  assert.strictEqual(linha[13], 'Novo');
  assert.strictEqual(Object.prototype.toString.call(linha[1]), '[object Date]', 'data de recebimento preservada');
  assert.strictEqual(arquivos.length, 1, 'só a primeira das duas fotos permitidas cabe no limite de tamanho');
  assert.match(s.post({ action: 'relatoPublico', codigo, relato: { descricao: 'oi' } }).error, /Descreva/);
});

test('relato pelo QR: limite de relatos por hora', () => {
  const { s } = servidorComDrive();
  const codigo = s.post({ action: 'codigoRelatoQR', ...gestor }).codigo;
  for (let i = 0; i < 60; i++) assert.strictEqual(s.post({ action: 'relatoPublico', codigo, relato: { descricao: 'Relato número ' + i } }).ok, true);
  assert.match(s.post({ action: 'relatoPublico', codigo, relato: { descricao: 'Relato a mais' } }).error, /Muitos relatos/);
});

test('relato pelo QR: equipe lista e importa; código novo invalida as placas', () => {
  const { s } = servidorComDrive();
  const codigo = s.post({ action: 'codigoRelatoQR', ...gestor }).codigo;
  const { protocolo } = s.post({ action: 'relatoPublico', codigo, relato: { descricao: 'Fio desencapado no corredor', anonimo: false, nome: 'José', funcao: 'Eletricista' } });
  assert.match(s.post({ action: 'codigoRelatoQR', usuarioLogin: 'Bia', pin: '9999' }).error, /perfil Inspetor/);
  assert.match(s.post({ action: 'listarRelatosQR', usuarioLogin: 'Carlos Lima', pin: '420' }).error, /perfil Responsável/);
  let lista = s.post({ action: 'listarRelatosQR', usuarioLogin: 'Bia', pin: '9999' });
  assert.strictEqual(lista.relatos.length, 1);
  assert.strictEqual(lista.relatos[0].nome, 'José');
  assert.strictEqual(lista.relatos[0].anonimo, false);
  assert.strictEqual(s.post({ action: 'marcarRelatoQRImportado', usuarioLogin: 'Bia', pin: '9999', id: protocolo }).ok, true);
  assert.strictEqual(s.abas.Relatos_QR.rows[1][14], 'Bia');
  lista = s.post({ action: 'listarRelatosQR', ...gestor });
  assert.strictEqual(lista.relatos.length, 0);
  const novo = s.post({ action: 'codigoRelatoQR', ...gestor, novo: true }).codigo;
  assert.notStrictEqual(novo, codigo);
  assert.strictEqual(s.post({ action: 'relatoPublico', codigo, relato: { descricao: 'Placa antiga' } }).ok, false);
});

test('PGR: avaliação psicossocial vai para as abas PGR_Psicossocial e de critérios, em espelho', () => {
  const s = carregarServidor();
  s.ctx.DriveApp = { getRootFolder: () => ({ getFoldersByName: () => ({ hasNext: () => false }), createFolder: () => ({ getUrl: () => 'u', getId: () => 'f', getFoldersByName: () => ({ hasNext: () => false }), createFolder: () => ({ getUrl: () => 'u', getId: () => 'f' }) }) }) };
  const pgr = (itens) => ({ id: 'pgr1', empresa: 'Empresa X', ghes: [], perigos: [], treinamentos: [], exerciciosSimulados: [], emergencia: {},
    psicossocial: { criterios: { metodologia: '=Matriz P×S' }, itens } });
  const item = (n) => ({ id: 'i' + n, setor: 'Atendimento', perigo: 'Sobrecarga ' + n, severidade: 4, probabilidade: 4, nivel: 16, classificacao: 'Alto', prioridade: 'Ação estruturada (curto prazo)' });
  assert.strictEqual(s.post({ action: 'upsertPGR', pgr: pgr([item(1), item(2)]) }).ok, true);
  assert.strictEqual(s.post({ action: 'upsertPGR', pgr: pgr([item(3)]) }).ok, true);
  const linhas = s.abas.PGR_Psicossocial.rows.slice(1);
  assert.strictEqual(linhas.length, 1, 'reenvio substitui, não duplica');
  assert.strictEqual(linhas[0][4], 'Sobrecarga 3');
  assert.strictEqual(linhas[0][11], 'Alto');
  const crit = s.abas.PGR_Psicossocial_Criterios.rows;
  assert.strictEqual(crit.length, 2);
  assert.strictEqual(crit[1][2], "'=Matriz P×S", 'critério também protegido contra fórmula');
});
