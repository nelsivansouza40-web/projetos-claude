/*
 * Empresa de demonstração: dados inventados em todos os módulos, para
 * apresentar o sistema sem expor dados pessoais reais (LGPD).
 * As datas são calculadas a partir de hoje, para que os painéis e as
 * pendências mostrem situações atuais (vencidos, a vencer, atrasados).
 * Nomes, CPFs, CAs e placas são fictícios.
 */
const Demo = {
  NOME: 'Metalúrgica Modelo Ltda (DEMONSTRAÇÃO)',

  async criar() {
    // gerador previsível: a demonstração sai sempre igual
    let semente = 20261011;
    const rnd = () => { semente = (semente * 1103515245 + 12345) % 2147483648; return semente / 2147483648; };
    const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    const hoje = D.today();
    const dia = (n) => D.addDays(hoje, n);
    const agora = new Date().toISOString();

    const emp = {
      id: uid(), criadaEm: agora, demonstracao: true,
      nome: this.NOME, razao: 'Metalúrgica Modelo Indústria e Comércio Ltda', cnpj: '00.000.000/0000-00',
      cnae: '2512-8/00', atividade: 'Fabricação de esquadrias e estruturas metálicas', grauRisco: '3',
      endereco: 'Rua das Indústrias, 1000 — Distrito Industrial', cidade: 'Cidade Exemplo', uf: 'MG', cep: '00000-000',
      telefone: '(00) 0000-0000', email: 'sesmt@exemplo.com.br',
      responsavel: 'Técnico de Segurança do Trabalho (demonstração)', registro: 'MTE 00000'
    };

    const recs = [];
    const novo = (mod, r) => { const x = Object.assign({ id: uid(), emp: emp.id, mod, criadoEm: agora, atualizadoEm: agora }, r); recs.push(x); return x; };

    /* ---------- Colaboradores ---------- */
    const nomes = [['Ana', 'F'], ['Bruno', 'M'], ['Carla', 'F'], ['Diego', 'M'], ['Elaine', 'F'], ['Fábio', 'M'], ['Gisele', 'F'], ['Hugo', 'M'], ['Isabela', 'F'], ['João', 'M'], ['Karina', 'F'], ['Lucas', 'M'], ['Marta', 'F'], ['Nelson', 'M'], ['Otávio', 'M'], ['Paula', 'F'], ['Rafael', 'M'], ['Sandra', 'F'], ['Tiago', 'M'], ['Vânia', 'F'], ['Wagner', 'M'], ['Yara', 'F'], ['André', 'M'], ['Beatriz', 'F'], ['Caio', 'M'], ['Débora', 'F'], ['Eduardo', 'M'], ['Fernanda', 'F'], ['Gustavo', 'M'], ['Helena', 'F'], ['Igor', 'M'], ['Juliana', 'F'], ['Leandro', 'M'], ['Mônica', 'F'], ['Natan', 'M'], ['Priscila', 'F'], ['Renato', 'M'], ['Sílvia', 'F'], ['Ulisses', 'M'], ['Viviane', 'F']];
    const sobrenomes = ['Almeida', 'Barros', 'Campos', 'Duarte', 'Esteves', 'Freitas', 'Gomes', 'Henriques', 'Lacerda', 'Machado', 'Nogueira', 'Pacheco', 'Queiroz', 'Rezende', 'Siqueira', 'Teixeira', 'Valadares', 'Xavier'];
    const quadro = [
      ['Produção', 'Soldador', 9], ['Produção', 'Operador de máquinas', 8], ['Produção', 'Ajudante geral', 5],
      ['Manutenção', 'Eletricista de manutenção', 3], ['Manutenção', 'Mecânico de manutenção', 3],
      ['Logística', 'Operador de empilhadeira', 3], ['Logística', 'Motorista', 2], ['Logística', 'Almoxarife', 1],
      ['Administração', 'Assistente administrativo', 3], ['Administração', 'Técnico de segurança do trabalho', 1],
      ['Administração', 'Supervisor de produção', 2]
    ];
    const colabs = [];
    let mat = 1001, ni = 0;
    quadro.forEach(([setor, funcao, qtd]) => {
      for (let i = 0; i < qtd; i++) {
        const [primeiro, sexo] = nomes[ni % nomes.length];
        const nome = primeiro + ' ' + sobrenomes[(ni * 7) % sobrenomes.length] + ' ' + sobrenomes[(ni * 5 + 3) % sobrenomes.length];
        const demitido = ni === 7 || ni === 22;
        colabs.push(novo('colaboradores', {
          matricula: String(mat++), nome, status: demitido ? 'Demitido' : (ni === 12 ? 'Afastado' : ni === 30 ? 'Experiência' : 'Contratado'),
          cpf: '', rg: '', setor, funcao, sexo,
          nascimento: D.addDays(hoje, -int(20 * 365, 55 * 365)), admissao: ni === 30 ? dia(-40) : D.addDays(hoje, -int(200, 12 * 365)),
          desligamento: demitido ? dia(-int(20, 120)) : '', celular: '(00) 90000-' + String(1000 + ni), endereco: 'Endereço fictício, ' + (100 + ni)
        }));
        ni++;
      }
    });
    const ativos = colabs.filter((c) => c.status !== 'Demitido');
    const doSetor = (s) => ativos.filter((c) => c.setor === s);
    const daFuncao = (f) => ativos.filter((c) => c.funcao === f);

    /* ---------- EPI ---------- */
    const episBase = [
      ['Capacete de segurança classe B', 'Protege Equipamentos', 18.5, 30, 60, 400, 730],
      ['Óculos de proteção incolor', 'Visão Segura', 7.9, 40, 100, 900, 180],
      ['Protetor auricular tipo plug', 'Audição Total', 1.2, 200, 600, 120, ''],
      ['Luva de vaqueta', 'Mãos Firmes', 14.0, 40, 120, 200, ''],
      ['Botina de segurança com biqueira', 'Passo Forte', 89.0, 10, 40, -15, 180],
      ['Máscara de solda com escurecimento automático', 'Arco Protege', 240.0, 4, 12, 20, 730],
      ['Avental de raspa', 'Arco Protege', 46.0, 6, 20, 300, 180],
      ['Cinturão tipo paraquedista', 'Altura Segura', 310.0, 3, 8, 500, 1825],
      ['Respirador PFF2', 'Ar Puro', 4.5, 60, 200, 45, ''],
      ['Luva isolante classe 0', 'Volt Seguro', 180.0, 2, 6, 700, 180]
    ];
    const epis = episBase.map(([descricao, fabricante, preco, minimo, maximo, vencDias, validadeUso], i) => novo('epis', {
      codigo: i + 1, descricao, fabricante, ca: String(10000 + i * 731), vencCA: dia(vencDias), controlar: 'Sim', validadeUso, categoria: 'EPI', unidade: [2, 3, 4].includes(i) ? 'PAR' : 'UN',
      saldoInicial: Math.round(maximo * 0.5), minimo, maximo, preco
    }));
    // entradas de compra
    epis.forEach((e, i) => {
      novo('movepi', { tipo: 'ENTRADA', epi: e.id, qtd: Math.round(e.maximo * 0.6), destino: 'Fornecedor', fornecedor: 'Distribuidora de EPI Exemplo', data: dia(-int(60, 150)), preco: e.preco, med: '', obs: 'Nota fiscal fictícia ' + (5000 + i) });
    });
    // entregas aos colaboradores
    const kit = { 'Soldador': [0, 1, 2, 3, 4, 5, 6], 'Operador de máquinas': [0, 1, 2, 3, 4], 'Ajudante geral': [0, 1, 3, 4, 8], 'Eletricista de manutenção': [0, 1, 4, 7, 9], 'Mecânico de manutenção': [0, 1, 2, 3, 4], 'Operador de empilhadeira': [0, 4, 2], 'Motorista': [4], 'Almoxarife': [4, 3], 'Supervisor de produção': [0, 1, 4], 'Técnico de segurança do trabalho': [0, 1, 4] };
    ativos.forEach((c) => {
      (kit[c.funcao] || []).forEach((k) => {
        const e = epis[k];
        novo('movepi', { tipo: 'SAÍDA', epi: e.id, qtd: k === 2 || k === 8 ? 10 : 1, destino: 'Funcionário', colab: c.id, data: D.addDays(c.admissao > dia(-200) ? c.admissao : dia(-200), int(0, 5)), med: 'Primeira entrega', preco: '' });
        if (rnd() < 0.45) novo('movepi', { tipo: 'SAÍDA', epi: e.id, qtd: k === 2 || k === 8 ? 10 : 1, destino: 'Funcionário', colab: c.id, data: dia(-int(5, 90)), med: pick(['Troca do EPI, danificado ou vencido', 'Substituição por dano justificado', 'Substituição por dano próprio ou perda']), preco: '' });
      });
    });
    // saldo inicial calculado para o estoque final ficar coerente: a maioria entre
    // o mínimo e o máximo, um EPI esgotado e um abaixo do mínimo (aparecem nas pendências)
    epis.forEach((e, i) => {
      let ent = 0, sai = 0;
      recs.filter((r) => r.mod === 'movepi' && r.epi === e.id).forEach((r) => { if (r.tipo === 'ENTRADA') ent += r.qtd; else sai += r.qtd; });
      const alvo = i === 5 ? 0 : i === 2 ? Math.floor(e.minimo / 2) : Math.round((e.minimo + e.maximo) / 2);
      e.saldoInicial = Math.max(0, alvo - ent + sai);
      if (alvo - ent + sai < 0) novo('movepi', { tipo: 'SAÍDA', epi: e.id, qtd: ent - sai - alvo, destino: 'Funcionário', colab: ativos[i].id, data: dia(-2), med: 'Troca do EPI, danificado ou vencido', preco: '' });
    });
    // uniformes (sem CA): saem na Ficha de uniforme
    [['Camisa de uniforme manga longa', 'Confecções Exemplo', 45, 'UN'], ['Calça de uniforme em brim', 'Confecções Exemplo', 60, 'UN'], ['Meia de algodão', 'Confecções Exemplo', 12, 'PAR']].forEach(([descricao, fabricante, preco, unidade], j) => {
      const u = novo('epis', { codigo: epis.length + j + 1, descricao, fabricante, ca: '', controlar: 'Não', validadeUso: 180, categoria: 'Uniforme', unidade, saldoInicial: ativos.length * 3, minimo: 20, maximo: ativos.length * 3, preco });
      ativos.forEach((c) => novo('movepi', { tipo: 'SAÍDA', epi: u.id, qtd: 2, destino: 'Funcionário', colab: c.id, data: D.addDays(c.admissao > dia(-200) ? c.admissao : dia(-200), int(0, 5)), med: 'Primeira entrega', preco: '' }));
    });

    /* ---------- Treinamentos ---------- */
    const ids = (lista) => lista.map((c) => c.id);
    const tr = (treinamento, norma, finalizado, meses, carga, part, extra) => novo('treinamentos', Object.assign({
      treinamento, norma, status: 'Concluído', dataInicial: finalizado, dataFinal: finalizado, validadeMeses: meses, controlar: meses ? 'Sim' : 'Não',
      instrutor: 'Instrutor Exemplo', cargaHoraria: carga, finalidade: 'Periódico', modalidade: 'Presencial', local: 'Sala de treinamento', custo: carga * 60, participantes: ids(part)
    }, extra || {}));
    tr('Trabalho em altura', 'NR 35', dia(-700), 24, 8, daFuncao('Eletricista de manutenção').concat(daFuncao('Mecânico de manutenção')));
    tr('Trabalho em altura', 'NR 35', dia(-120), 24, 8, daFuncao('Soldador').slice(0, 4));
    tr('Segurança em instalações e serviços em eletricidade', 'NR 10', dia(-715), 24, 40, daFuncao('Eletricista de manutenção'), { custo: 3200 });
    tr('Segurança no trabalho em máquinas e equipamentos', 'NR 12', dia(-200), 12, 8, daFuncao('Operador de máquinas'));
    tr('Operação de empilhadeira', 'NR 11', dia(-350), 12, 16, daFuncao('Operador de empilhadeira'));
    tr('Uso, guarda e conservação de EPI', 'NR 06', dia(-90), 12, 2, ativos.filter((c) => c.setor === 'Produção'));
    tr('Treinamento da CIPA', 'NR 05', dia(-330), 12, 20, ativos.slice(0, 6), { instrutor: 'SESMT' });
    tr('Prevenção e combate a incêndio (brigada)', 'NR 23', dia(-380), 12, 8, ativos.filter((_, i) => i % 4 === 0));
    tr('Espaço confinado — trabalhador e vigia', 'NR 33', dia(-30), 12, 16, daFuncao('Mecânico de manutenção').concat(daFuncao('Soldador').slice(0, 2)));
    novo('treinamentos', { treinamento: 'Reciclagem de trabalho em altura', norma: 'NR 35', status: 'Agendado', dataInicial: dia(20), dataFinal: dia(20), validadeMeses: 24, controlar: 'Sim', instrutor: 'Instrutor Exemplo', cargaHoraria: 8, finalidade: 'Reciclagem', modalidade: 'Presencial', local: 'Pátio', custo: 1800, participantes: ids(daFuncao('Eletricista de manutenção')) });

    /* ---------- ASO ---------- */
    ativos.forEach((c, i) => {
      const atraso = i % 11 === 0 ? -int(380, 420) : i % 7 === 0 ? -int(340, 360) : -int(20, 300);
      novo('aso', { colab: c.id, tipo: 'Periódico', resultado: 'Apto', data: dia(atraso), validadeDias: '', medico: 'Dra. Médica do Trabalho (fictícia) — CRM 00000', crm: '00000', atualizado: 'Não', exames: 'Clínico, audiometria' + (c.setor === 'Produção' ? ', espirometria' : '') });
    });

    /* ---------- DDS ---------- */
    const temas = ['Uso correto do protetor auricular', 'Ordem e limpeza no posto de trabalho', 'Riscos da solda e proteção dos olhos', 'Bloqueio e etiquetagem (LOTO)', 'Prevenção de quedas em escadas', 'Hidratação e calor', 'Transporte manual de cargas', 'Empilhadeira: circulação de pedestres', 'Uso do cinto paraquedista', 'Produtos químicos e FDS', 'Proteção das mãos', 'Comunicação de quase acidentes', 'Extintores: qual usar em cada fogo', 'Ergonomia na bancada', 'Direção defensiva'];
    temas.forEach((tema, i) => {
      const setor = pick(['Produção', 'Manutenção', 'Logística']);
      novo('dds', { tema, status: 'Realizado', data: dia(-7 * (i + 1) + int(0, 3)), departamento: setor, instrutor: 'SESMT', duracao: 10, participantes: ids(doSetor(setor).filter(() => rnd() < 0.85)) });
    });
    novo('dds', { tema: 'Riscos do trabalho a quente', status: 'Agendado', data: dia(3), departamento: 'Produção', instrutor: 'SESMT', duracao: 10, participantes: [] });

    /* ---------- Acidentes ---------- */
    const acid = [
      [-400, '1 - Típico', 'Corte', 'Mão', 'Ferramenta manual', 'Leve', 'Acidente com lesão leve', 'Não', '', 'Corte superficial ao manusear chapa sem luva.'],
      [-300, '1 - Típico', 'Queimadura', 'Braço', 'Máquina', 'Moderada', 'Acidente com lesão leve', 'Sim', -296, 'Respingo de solda no antebraço por avental mal posicionado.'],
      [-210, '3 - Trajeto', 'Contusão', 'Joelho', 'Veículo', 'Moderada', 'Acidente com lesão leve', 'Sim', -199, 'Queda de motocicleta no trajeto para o trabalho.'],
      [-150, '1 - Típico', 'Objeto estranho', 'Olhos', 'Ferramenta manual', 'Leve', 'Acidente com lesão leve', 'Não', '', 'Partícula no olho durante esmerilhamento.'],
      [-80, '1 - Típico', 'Torção', 'Pé', 'Piso', 'Leve', 'Acidente com lesão leve', 'Sim', -77, 'Torção ao descer da plataforma da prensa.'],
      [-45, '1 - Típico', 'Fratura', 'Dedo', 'Máquina', 'Grave', 'Acidente com lesão grave', 'Sim', '', 'Prensamento do dedo em dobradeira com proteção removida.'],
      [-12, '1 - Típico', 'Contusão', 'Ombro', 'Queda de material', 'Leve', 'Acidente com danos materiais', 'Não', '', 'Queda de perfil metálico da estante; danos ao material e contusão leve.']
    ];
    acid.forEach(([d, tipo, dano, parte, agente, gravidade, bird, afast, ret, det], i) => {
      const c = ativos[(i * 5 + 2) % ativos.length];
      novo('acidentes', { colab: c.id, data: dia(d), hora: pick(['08:20', '10:45', '14:10', '16:30']), status: i >= 5 ? 'Investigação' : 'Concluído', tipo, dano, parte, agente, local: c.setor, cat: tipo === '3 - Trajeto' || afast === 'Sim' || gravidade === 'Grave' ? 'Sim' : 'Não', gravidade, bird, afastamento: afast, retorno: ret === '' ? '' : dia(ret), diasDebitados: '', detalhes: det });
    });

    /* ---------- Advertências ---------- */
    [[-60, 'Orientação', 'Operação de esmerilhadeira sem óculos de proteção.'], [-35, 'Advertência verbal', 'Retirada da proteção da dobradeira para agilizar a produção.'], [-10, 'Advertência escrita', 'Reincidência: circulação na área de solda sem máscara.']].forEach(([d, medida, ato], i) => {
      novo('advertencias', { colab: daFuncao(i === 1 ? 'Operador de máquinas' : 'Soldador')[i + 1].id, data: dia(d), hora: '09:30', medida, ato });
    });

    /* ---------- Desvios e incidentes ---------- */
    const desvios = [
      ['Desvio', 'EPI', 'Média', 'Produção', 'Colaborador sem protetor auricular na área de corte.', 'Reforçar DDS e fiscalização do supervisor.', -50, -40, true],
      ['Desvio', 'Organização e limpeza', 'Baixa', 'Logística', 'Corredor do almoxarifado obstruído por paletes.', 'Demarcar área de paletes.', -40, -30, true],
      ['Incidente', 'Máquinas', 'Alta', 'Produção', 'Prensa acionada com a porta de proteção aberta (falha no intertravamento).', 'Revisar intertravamento e bloquear a máquina até o reparo.', -30, -20, true],
      ['Desvio', 'Ferramenta', 'Média', 'Manutenção', 'Esmerilhadeira sem coifa de proteção.', 'Substituir coifa e inspecionar ferramentas elétricas.', -25, -5, false],
      ['Incidente', 'Procedimento', 'Alta', 'Logística', 'Empilhadeira quase atingiu pedestre no cruzamento do galpão.', 'Instalar espelho convexo e faixa de pedestres.', -20, -2, false],
      ['Desvio', 'Treinamentos', 'Média', 'Manutenção', 'Eletricista com NR 10 vencida executando serviço.', 'Programar reciclagem NR 10.', -15, 10, false],
      ['Desvio', 'EPI', 'Baixa', 'Produção', 'Luvas de vaqueta desgastadas em uso.', 'Trocar luvas e revisar periodicidade de troca.', -8, 7, false],
      ['Desvio', 'Organização e limpeza', 'Média', 'Produção', 'Cabos elétricos espalhados no piso da caldeiraria.', 'Organizar cabos com canaletas.', -5, 15, false],
      ['Incidente', 'Máquinas', 'Média', 'Manutenção', 'Vazamento de óleo hidráulico na prensa 2.', 'Conter vazamento e trocar mangueira.', -3, 4, false]
    ];
    desvios.forEach(([classe, tipo, gravidade, setor, descricao, acoes, d, prazo, concl]) => {
      novo('desvios', { classe, data: dia(d), tipo, gravidade, setor, responsavel: 'Supervisor de ' + setor.toLowerCase(), descricao, acoes, prazo: dia(prazo), conclusao: concl ? dia(prazo - 2) : '' });
    });

    /* ---------- Auditorias ---------- */
    novo('auditorias', { nome: 'Auditoria interna de segurança — 1º semestre', tipo: 'Interna', data: dia(-200), status: 'Realizada', normas: 'NR 06, NR 12, NR 23', ncEncontradas: 14, ncResolvidas: 14 });
    novo('auditorias', { nome: 'Auditoria do cliente (requisitos de SSMA)', tipo: 'Externa', data: dia(-95), status: 'Realizada', normas: 'NR 10, NR 12, NR 35', ncEncontradas: 9, ncResolvidas: 6 });
    novo('auditorias', { nome: 'Auditoria interna de segurança — 2º semestre', tipo: 'Interna', data: dia(-20), status: 'Realizada', normas: 'NR 06, NR 11, NR 12', ncEncontradas: 11, ncResolvidas: 3 });
    novo('auditorias', { nome: 'Auditoria de máquinas (NR 12)', tipo: 'Interna', data: dia(40), status: 'Agendada', normas: 'NR 12' });

    /* ---------- Plano de ação 5W2H ---------- */
    [
      ['Adequar dobradeira à NR 12', 'Alta', -60, -5, 'EM ABERTO', 'Instalar cortina de luz e comando bimanual', 'Acidente com fratura de dedo em 45 dias', 'Manutenção', 'Caldeiraria', 'Contratar empresa especializada', 18500],
      ['Sinalizar circulação de empilhadeiras', 'Urgente', -18, 12, 'AGENDADO', 'Pintar faixas de pedestres e instalar espelhos', 'Incidente com pedestre', 'Supervisor de logística', 'Galpão de expedição', 'Equipe interna com tinta de demarcação', 2400],
      ['Reciclagem NR 10 dos eletricistas', 'Alta', -15, 25, 'AGENDADO', 'Reciclagem de 8 h para os eletricistas', 'Treinamento vencido', 'SESMT', 'Sala de treinamento', 'Instrutor externo', 3200],
      ['Recarga dos extintores vencidos', 'Média', -10, -1, 'EM ABERTO', 'Enviar extintores para recarga', 'Extintores vencidos na inspeção mensal', 'Almoxarife', 'Toda a planta', 'Empresa credenciada', 960],
      ['Implantar coleta seletiva de resíduos', 'Baixa', -90, -20, 'REALIZADO', 'Instalar coletores identificados', 'Exigência do cliente', 'Administração', 'Refeitório e produção', 'Compra de coletores', 1500],
      ['Revisar PGR após mudança de layout', 'Média', -5, 60, 'EM ABERTO', 'Atualizar inventário de riscos da caldeiraria', 'Mudança de processo (NR 01)', 'SESMT', 'Caldeiraria', 'Levantamento em campo', 0]
    ].forEach(([nome, prioridade, d, prazo, status, oque, porque, quem, onde, como, quanto]) => {
      novo('planos', { nome, status, prioridade, data: dia(d), prazo: dia(prazo), oque, porque, quem, onde, como, quanto, obs: '' });
    });

    /* ---------- Riscos ---------- */
    [
      ['Soldador', 'Produção', 'FÍSICO', 'Radiação não ionizante (arco elétrico)', 'Queimaduras, lesões oculares', 9, 'Habitual e permanente', 'Máscara de solda, biombos, avental de raspa', 3, 3],
      ['Soldador', 'Produção', 'QUÍMICO', 'Fumos metálicos de solda', 'Doenças respiratórias', 9, 'Habitual e intermitente', 'Exaustão localizada, PFF2', 3, 4],
      ['Operador de máquinas', 'Produção', 'ACIDENTE', 'Partes móveis de prensas e dobradeiras', 'Amputação, esmagamento', 8, 'Habitual', 'Proteções fixas, intertravamento', 3, 5],
      ['Operador de máquinas', 'Produção', 'FÍSICO', 'Ruído acima de 85 dB(A)', 'Perda auditiva', 8, 'Habitual e permanente', 'Protetor auricular, enclausuramento parcial', 4, 3],
      ['Eletricista de manutenção', 'Manutenção', 'ACIDENTE', 'Eletricidade (baixa tensão)', 'Choque elétrico, queimaduras', 3, 'Intermitente', 'Bloqueio e etiquetagem, luva isolante', 2, 5],
      ['Mecânico de manutenção', 'Manutenção', 'ACIDENTE', 'Trabalho em altura acima de 2 m', 'Queda, fraturas', 3, 'Eventual', 'Cinturão, linha de vida, PT', 2, 5],
      ['Operador de empilhadeira', 'Logística', 'ACIDENTE', 'Atropelamento e tombamento', 'Lesões graves', 3, 'Habitual', 'Treinamento NR 11, sinalização', 3, 4],
      ['Ajudante geral', 'Produção', 'ERGONÔMICO', 'Levantamento e transporte manual de cargas', 'Lombalgia', 5, 'Habitual', 'Carrinhos, rodízio de tarefas', 3, 2],
      ['Assistente administrativo', 'Administração', 'ERGONÔMICO', 'Postura sentada prolongada', 'Dores musculares', 3, 'Habitual', 'Mobiliário ajustável, pausas', 2, 2],
      ['Mecânico de manutenção', 'Manutenção', 'QUÍMICO', 'Óleos e graxas', 'Dermatites', 3, 'Intermitente', 'Luvas nitrílicas, creme de proteção', 3, 2],
      ['Motorista', 'Logística', 'ACIDENTE', 'Acidentes de trânsito', 'Lesões graves', 2, 'Habitual', 'Direção defensiva, manutenção da frota', 2, 4],
      ['Soldador', 'Produção', 'ACIDENTE', 'Incêndio por fagulhas', 'Queimaduras', 9, 'Intermitente', 'Extintores, permissão de trabalho a quente', 2, 4]
    ].forEach(([funcao, setor, tipo, descricao, danos, expostos, exposicao, controles, prob, sev]) => {
      novo('riscos', { funcao, setor, tipo, descricao, danos, expostos, exposicao, controles, prob: String(prob), sev: String(sev) });
    });

    /* ---------- Documentos ---------- */
    [
      ['Programa de Gerenciamento de Riscos (PGR)', 'PGR', 'Segurança do Trabalho', -300, 24, 'Rev. 03'],
      ['Programa de Controle Médico de Saúde Ocupacional (PCMSO)', 'PCMSO', 'Saúde Ocupacional', -345, 12, 'Rev. 05'],
      ['Laudo Técnico das Condições Ambientais (LTCAT)', 'LTCAT', 'Segurança do Trabalho', -400, 24, 'Rev. 02'],
      ['Auto de Vistoria do Corpo de Bombeiros (AVCB)', 'AVCB', 'Segurança do Trabalho', -1080, 36, '—'],
      ['Análise Ergonômica do Trabalho (AET)', 'AET', 'Segurança do Trabalho', -500, 24, 'Rev. 01'],
      ['Procedimento de bloqueio e etiquetagem', 'Procedimento', 'Segurança do Trabalho', -380, 12, 'Rev. 04'],
      ['Licença de operação ambiental', 'Licença', 'Meio Ambiente', -700, 48, '—']
    ].forEach(([nome, tipo, area, d, meses, revisao]) => {
      novo('documentos', { nome, tipo, area, data: dia(d), revisao, dataRevisao: dia(d), validadeMeses: meses, controlar: 'Sim', responsavel: tipo === 'PCMSO' ? 'Médico coordenador' : 'SESMT' });
    });

    /* ---------- Atividades por função e OSS ---------- */
    const conteudo = {
      'Soldador': ['Executar soldas MIG/MAG e eletrodo revestido em estruturas metálicas; preparar peças; inspecionar cordões de solda.', 'Radiação não ionizante; fumos metálicos; queimaduras; incêndio; ruído.', 'Máscara de solda, avental e luvas de raspa, botina, óculos, protetor auricular, PFF2.'],
      'Operador de máquinas': ['Operar prensas, dobradeiras e guilhotinas; fazer o setup e conferir as peças produzidas.', 'Partes móveis; ruído; projeção de partículas; levantamento de cargas.', 'Óculos, protetor auricular, luva de vaqueta, botina.'],
      'Eletricista de manutenção': ['Manutenção preventiva e corretiva em painéis e instalações de baixa tensão.', 'Choque elétrico; arco elétrico; queda de altura.', 'Luva isolante, vestimenta antichama, capacete com jugular, botina sem partes metálicas, cinturão.'],
      'Operador de empilhadeira': ['Movimentar matéria-prima e produto acabado com empilhadeira.', 'Atropelamento; tombamento; queda de carga; ruído.', 'Capacete, botina, protetor auricular.']
    };
    Object.entries(conteudo).forEach(([funcao, [atividades, riscos, eps]]) => {
      novo('atividades', { funcao, setor: (ativos.find((c) => c.funcao === funcao) || {}).setor || '', atividades, riscos, epis: eps,
        medidas: 'Seguir procedimentos, participar dos DDS, comunicar condições inseguras.', obrigacoes: 'Usar os EPIs fornecidos e cumprir as normas internas.',
        sancoes: 'O descumprimento sujeita o empregado às penalidades previstas na CLT (art. 158 e 482).', procedimentos: 'Comunicar imediatamente o supervisor e o SESMT; acionar a brigada se necessário.', normas: 'Regulamento interno de segurança.' });
    });
    ['Soldador', 'Operador de máquinas', 'Eletricista de manutenção', 'Operador de empilhadeira'].forEach((f, i) => {
      const c = daFuncao(f)[0]; const [atividades, riscos, eps] = conteudo[f];
      novo('oss', { numero: 'OSS-' + String(i + 1).padStart(3, '0'), colab: c.id, data: c.admissao, dataRevisao: dia(-30), objetivo: PARAMS_PADRAO.objetivoOSS, atividades, riscos, epis: eps,
        medidas: 'Seguir procedimentos, participar dos DDS, comunicar condições inseguras.', obrigacoes: 'Usar os EPIs fornecidos e cumprir as normas internas.',
        sancoes: 'O descumprimento sujeita o empregado às penalidades previstas na CLT (art. 158 e 482).', procedimentos: 'Comunicar imediatamente o supervisor e o SESMT.', normas: 'Regulamento interno de segurança.', termo: PARAMS_PADRAO.termoOSS });
    });

    /* ---------- Produtos químicos ---------- */
    [
      ['Desengraxante industrial', 'Hidrocarbonetos alifáticos', 'Química Exemplo', 'SIM', 'Classe 3 - Líquidos inflamáveis', '1993', ['Inflamável'], 'Tambor', 'Aço'],
      ['Gás acetileno', 'Acetileno', 'Gases Exemplo', 'SIM', 'Classe 2 - Gases', '1001', ['Inflamável', 'Reativo'], 'Outro', 'Aço'],
      ['Óleo hidráulico ISO 68', 'Óleo mineral', 'Lubrificantes Exemplo', 'NÃO', '', '', [], 'Balde', 'Plástico'],
      ['Tinta esmalte sintético', 'Resina alquídica e solventes', 'Tintas Exemplo', 'SIM', 'Classe 3 - Líquidos inflamáveis', '1263', ['Inflamável', 'Tóxico'], 'Lata', 'Aço'],
      ['Ácido para decapagem', 'Ácido clorídrico 33%', 'Química Exemplo', 'SIM', 'Classe 8 - Corrosivos', '1789', ['Corrosivo', 'Tóxico'], 'Bombona', 'Plástico']
    ].forEach(([nomeComercial, nomeTecnico, fabricante, perigo, classe, onu, caracteristicas, tipoEmb, materialEmb], i) => {
      novo('quimicos', { nomeComercial, nomeTecnico, fabricante, perigo, classe, onu, cas: '', caracteristicas, tipoEmb, materialEmb, local: i === 1 ? 'Central de gases' : 'Almoxarifado de químicos', quantidade: pick(['20 L', '50 L', '4 cilindros', '18 L']), aprovado: 'Sim', fornecedor: fabricante, fispq: i === 3 ? 'Não' : 'Sim', localFispq: i === 3 ? '' : 'Pasta do almoxarifado', destinacao: 'Empresa licenciada de resíduos' });
    });

    /* ---------- Extintores e hidrantes ---------- */
    const locais = ['Portaria', 'Recepção', 'Escritório', 'Refeitório', 'Almoxarifado', 'Caldeiraria 1', 'Caldeiraria 2', 'Prensas', 'Pintura', 'Manutenção', 'Expedição', 'Central de gases'];
    locais.forEach((local, i) => {
      const venc = i === 4 || i === 8 ? -int(380, 420) : i === 6 ? -int(340, 350) : -int(30, 300);
      novo('extintores', { numero: String(i + 1).padStart(3, '0'), tipo: pick(['PQS ABC-6KG', 'CO2-6KG', 'AP-10L', 'PQS BC-12KG']), inmetro: 'INM-' + (900000 + i * 37), local, recarga: dia(venc), validadeMeses: '', th: dia(i === 9 ? -1810 : -int(200, 1400)) });
    });
    [['H-01', 'Fachada principal', 'Conforme'], ['H-02', 'Galpão de produção', 'Não conforme'], ['H-03', 'Expedição', 'Conforme'], ['H-04', 'Almoxarifado', 'Conforme']].forEach(([numero, local, mang], i) => {
      novo('hidrantes', { numero, local, abrigo: 'Abrigo ' + (i + 1), th: dia(i === 3 ? -380 : -int(30, 300)), validadeMeses: '', lacre: 'Conforme', mangueira: mang, diametro: '1 1/2"', comprimento: 30, esguicho: 'Conforme', tampao: 'Conforme', chave: i === 1 ? 'Não conforme' : 'Conforme', sinalizacao: 'Conforme' });
    });

    /* ---------- Máquinas, manutenções e frota ---------- */
    const maqs = [
      ['Prensa excêntrica 60 t', 'PE-60', 'Prensas Exemplo', 2008, 'Máquina', 'Produção'],
      ['Dobradeira hidráulica', 'DH-3000', 'Dobras Exemplo', 2015, 'Máquina', 'Produção'],
      ['Guilhotina', 'GL-2500', 'Cortes Exemplo', 2012, 'Máquina', 'Produção'],
      ['Máquina de solda MIG', 'MIG-400', 'Soldas Exemplo', 2020, 'Equipamento', 'Produção'],
      ['Compressor de ar', 'CP-20', 'Ar Comprimido Exemplo', 2018, 'Vaso de pressão', 'Manutenção'],
      ['Ponte rolante 5 t', 'PR-5', 'Içamentos Exemplo', 2010, 'Içamento', 'Produção'],
      ['Esmerilhadeira angular', 'EA-7', 'Ferramentas Exemplo', 2022, 'Ferramenta elétrica', 'Manutenção'],
      ['Furadeira de bancada', 'FB-16', 'Ferramentas Exemplo', 2016, 'Máquina', 'Manutenção']
    ].map(([nome, modelo, fabricante, ano, tipo, setor], i) => novo('equipamentos', { nome, modelo, fabricante, ano, tipo, potencia: '', voltagem: '380 V', setor, patrimonio: 'TAG-' + (100 + i) }));
    maqs.forEach((m, i) => {
      novo('manutencoes', { equip: m.id, data: dia(-int(60, 180)), status: 'Realizada', tipo: 'Preventiva', prioridade: 'Média', custo: int(200, 1500), responsavel: 'Equipe de manutenção', itens: 'Lubrificação, reaperto e inspeção dos dispositivos de segurança.' });
      if (i < 3) novo('manutencoes', { equip: m.id, data: dia(int(5, 25)), status: 'Agendada', tipo: 'Preventiva', prioridade: 'Alta', custo: '', responsavel: 'Equipe de manutenção', itens: 'Inspeção dos sistemas de segurança (NR 12).' });
    });
    novo('manutencoes', { equip: maqs[1].id, data: dia(-44), status: 'Realizada', tipo: 'Corretiva', prioridade: 'Urgente', custo: 4800, responsavel: 'Fornecedor da dobradeira', itens: 'Reparo do intertravamento após acidente.' });
    [['AAA0A00', 'Caminhão baú 3/4', 'Caminhão'], ['BBB1B11', 'Utilitário de entregas', 'Utilitário'], ['CCC2C22', 'Empilhadeira a gás 2,5 t', 'Empilhadeira']].forEach(([placa, veiculo, tipo], i) => {
      novo('frota', { placa, veiculo, tipo, data: dia(-int(20, 120)), status: 'Realizado', km: 40000 + i * 23000, tipoManut: 'Revisão', valor: int(400, 2500), empresa: 'Oficina Exemplo', descricao: 'Revisão periódica', detalhes: 'Troca de óleo, filtros e verificação de freios.' });
      novo('frota', { placa, veiculo, tipo, data: dia(int(10, 40)), status: 'Agendado', km: '', tipoManut: 'Preventiva', valor: '', empresa: 'Oficina Exemplo', descricao: 'Preventiva programada', detalhes: '' });
    });

    /* ---------- CIPA ---------- */
    const posse = dia(-305);
    ativos.slice(0, 6).forEach((c, i) => {
      novo('cipa', { gestao: D.year(posse) + '/' + (D.year(posse) + 1), colab: c.id, representa: i < 3 ? 'Empregados (eleito)' : 'Empregador (indicado)', cargo: i % 3 === 2 ? 'Suplente' : 'Titular', funcaoCipa: i === 3 ? 'Presidente' : i === 0 ? 'Vice-presidente' : i === 4 ? 'Secretário' : 'Membro', posse, votos: i < 3 ? 40 - i * 7 : '', controlar: 'Sim' });
    });

    /* ---------- Configurações da empresa ---------- */
    const listas = {};
    Object.keys(LISTAS_PADRAO).forEach((k) => { listas[k] = LISTAS_PADRAO[k].v.slice(); });
    listas.setores = ['Administração', 'Produção', 'Manutenção', 'Logística'];
    listas.funcoes = Array.from(new Set(quadro.map((q) => q[1])));
    listas.instrutores = ['Instrutor Exemplo', 'SESMT'];
    listas.departamentos = ['Produção', 'Manutenção', 'Logística', 'Administração'];
    listas.medicos = ['Dra. Médica do Trabalho (fictícia) — CRM 00000'];
    listas.fornecedores = ['Distribuidora de EPI Exemplo'];

    await DB.put('empresas', emp);
    await DB.put('cfg', { key: emp.id + ':listas', value: listas });
    await DB.put('cfg', { key: emp.id + ':params', value: JSON.parse(JSON.stringify(PARAMS_PADRAO)) });
    await DB.putMany('rec', recs);
    return { emp, total: recs.length };
  },

  async carregar() {
    const existente = (await DB.all('empresas')).find((e) => e.demonstracao);
    if (existente) {
      if (!await confirmar('Já existe uma empresa de demonstração neste computador. Recriar com datas atualizadas? Os dados atuais dela serão apagados.', 'Recriar')) {
        await App.trocarEmpresa(existente.id);
        return;
      }
      await Sync.esquecer(existente.id);
      await DB.apagarEmpresa(existente.id);
    }
    const { emp, total } = await this.criar();
    Modal._onClose = null;
    Modal.close();
    await App.trocarEmpresa(emp.id);
    App.ir('painel');
    toast('Empresa de demonstração criada: ' + fmtInt(total) + ' registros fictícios', 5000);
  }
};
