/*
 * Configurações por empresa: listas de opções (setores, funções, tipos...) e
 * parâmetros (meta de dias sem acidente, jornada, prazos de validade, matriz de risco).
 * Os valores iniciais vêm da aba CONFIGURAÇÕES da planilha Gestão SST.
 */
const LISTAS_PADRAO = {
  statusColab: { l: 'Situação do colaborador', v: ['Contratado', 'Experiência', 'Jovem aprendiz', 'Afastado', 'Férias', 'Demitido'] },
  setores: { l: 'Setores', v: ['Administração', 'Manutenção', 'Produção', 'Logística'] },
  funcoes: { l: 'Funções', v: [] },
  statusAcidente: { l: 'Situação da investigação do acidente', v: ['Concluído', 'Aguardando ação', 'Investigação'] },
  tiposAcidente: { l: 'Tipos de acidente', v: ['Típico', 'Trajeto', 'Doença ocupacional'] },
  danos: { l: 'Dano / lesão', v: ['Queimadura', 'Fratura', 'Contusão', 'Objeto estranho', 'Corte', 'Escoriação', 'Torção', 'Luxação', 'Amputação', 'Choque elétrico', 'Intoxicação'] },
  partesCorpo: { l: 'Partes do corpo', v: ['Cabeça', 'Olhos', 'Nariz', 'Pescoço', 'Face', 'Ombro', 'Braço', 'Mão', 'Dedo', 'Tronco', 'Abdômen', 'Coluna', 'Perna', 'Joelho', 'Pé', 'Múltiplas partes'] },
  agentes: { l: 'Agente causador', v: ['Piso', 'Andaime', 'Escada', 'Rampa', 'Serra', 'Máquina', 'Ferramenta manual', 'Veículo', 'Eletricidade', 'Produto químico', 'Queda de material'] },
  gravidades: { l: 'Gravidade do acidente', v: ['Leve', 'Moderada', 'Grave', 'Fatal'] },
  bird: { l: 'Pirâmide de Bird — nível do acidente', v: ['Fatalidade (acidente com morte)', 'Acidente com lesão grave', 'Acidente com lesão leve', 'Acidente com danos materiais'] },
  normas: { l: 'Normas (treinamentos e auditorias)', v: ['NR 01', 'NR 05', 'NR 06', 'NR 10', 'NR 11', 'NR 12', 'NR 13', 'NR 17', 'NR 18', 'NR 20', 'NR 23', 'NR 33', 'NR 35'] },
  instrutores: { l: 'Instrutores', v: [] },
  finalidades: { l: 'Finalidade do treinamento', v: ['Inicial', 'Periódico', 'Eventual', 'Reciclagem'] },
  modalidades: { l: 'Modalidade do treinamento', v: ['Presencial', 'EAD', 'Semipresencial'] },
  tiposASO: { l: 'Tipos de ASO', v: ['Admissional', 'Periódico', 'Retorno ao trabalho', 'Mudança de risco ocupacional', 'Demissional'] },
  medicos: { l: 'Médicos (nome — CRM)', v: [] },
  tiposAuditoria: { l: 'Tipos de auditoria', v: ['Interna', 'Externa'] },
  statusAuditoria: { l: 'Situação da auditoria', v: ['Realizada', 'Em aberto', 'Agendada', 'Cancelada'] },
  tiposDesvio: { l: 'Tipos de desvio / incidente', v: ['EPI', 'Ferramenta', 'Máquinas', 'Treinamentos', 'Organização e limpeza', 'Procedimento'] },
  gravidadeDesvio: { l: 'Gravidade do desvio', v: ['Baixa', 'Média', 'Alta'] },
  statusManut: { l: 'Situação da manutenção', v: ['Realizada', 'Não realizada', 'Agendada'] },
  tiposManut: { l: 'Tipos de manutenção', v: ['Corretiva', 'Preventiva', 'Preditiva'] },
  prioridades: { l: 'Prioridades', v: ['Urgente', 'Alta', 'Média', 'Baixa'] },
  tiposEquip: { l: 'Tipos de máquina / equipamento', v: ['Máquina', 'Equipamento', 'Ferramenta elétrica', 'Ferramenta manual', 'Vaso de pressão', 'Içamento'] },
  fornecedores: { l: 'Fornecedores de EPI', v: [] },
  med: { l: 'MED — motivo da entrega ou devolução (Ficha de EPI)', v: ['Primeira entrega', 'Substituição por dano justificado', 'Substituição por dano próprio ou perda', 'Troca do EPI, danificado ou vencido', 'Devolução, demissão ou mudança de função'] },
  tiposDocumento: { l: 'Tipos de documento', v: ['PGR', 'PCMSO', 'LTCAT', 'Laudo de insalubridade', 'Laudo de periculosidade', 'AET', 'Procedimento', 'Licença', 'Alvará', 'AVCB'] },
  areasDocumento: { l: 'Áreas dos documentos', v: ['Segurança do Trabalho', 'Saúde Ocupacional', 'Meio Ambiente', 'RH'] },
  tiposExtintor: { l: 'Tipos de extintor (tipo + carga)', v: ['PQS ABC-4KG', 'PQS ABC-6KG', 'PQS BC-6KG', 'PQS BC-12KG', 'AP-10L', 'CO2-6KG', 'CO2-12KG'] },
  tiposRisco: { l: 'Tipos de risco', v: ['ACIDENTE', 'QUÍMICO', 'FÍSICO', 'BIOLÓGICO', 'ERGONÔMICO'] },
  tiposVeiculo: { l: 'Tipos de veículo', v: ['Carro', 'Motocicleta', 'Caminhão', 'Ônibus', 'Micro-ônibus', 'Reboque', 'Utilitário', 'Empilhadeira', 'Outro'] },
  statusFrota: { l: 'Situação do serviço da frota', v: ['Realizado', 'Em aberto', 'Agendado', 'Cancelado'] },
  tiposManutFrota: { l: 'Tipos de manutenção da frota', v: ['Preditiva', 'Preventiva', 'Corretiva', 'Revisão', 'Troca de óleo', 'Pneus'] },
  classesQuimicos: { l: 'Classes de risco (produtos químicos)', v: ['Classe 1 - Explosivos', 'Classe 2 - Gases', 'Classe 3 - Líquidos inflamáveis', 'Classe 4 - Sólidos inflamáveis', 'Classe 5 - Oxidantes e peróxidos orgânicos', 'Classe 6 - Tóxicos e substâncias infectantes', 'Classe 7 - Material radioativo', 'Classe 8 - Corrosivos', 'Classe 9 - Perigosos diversos'] },
  embalagemTipo: { l: 'Tipo de embalagem', v: ['Granel', 'Bombona', 'Balde', 'Lata', 'Frasco', 'Tambor', 'Caixa', 'Saco', 'Embalagem composta', 'Outro'] },
  embalagemMaterial: { l: 'Material da embalagem', v: ['Papelão', 'Plástico', 'Vidro', 'Alumínio', 'Aço', 'Madeira', 'Outro'] },
  departamentos: { l: 'Departamentos (DDS)', v: [] },
  medidasDisciplinares: { l: 'Medidas disciplinares', v: ['Orientação', 'Advertência verbal', 'Advertência escrita', 'Suspensão'] }
};

const PARAMS_PADRAO = {
  metaDias: 100,
  jornada: 8,
  diasMes: 22,
  aVencerDias: 30,
  validadeRecargaExt: 12,
  validadeTHExt: 60,
  validadeTHHid: 12,
  asoValidade: { 'Admissional': 365, 'Periódico': 365, 'Retorno ao trabalho': 365, 'Mudança de risco ocupacional': 365, 'Demissional': '' },
  probLabels: ['Remota', 'Baixa', 'Média', 'Alta', 'Muito alta'],
  sevLabels: ['Sem impacto', 'Leve', 'Médio', 'Grave', 'Gravíssimo'],
  riscoFaixas: [
    { nome: 'Trivial', de: 1, ate: 3 },
    { nome: 'Baixo', de: 4, ate: 8 },
    { nome: 'Moderado', de: 9, ate: 14 },
    { nome: 'Alto', de: 15, ate: 19 },
    { nome: 'Extremo', de: 20, ate: 25 }
  ],
  objetivoOSS: 'Dar ciência aos empregados, com o seguinte intuito:\nI - Prevenir atos inseguros no desempenho do trabalho;\nII - Divulgar as obrigações e proibições que os empregados devam conhecer e cumprir;\nIII - Dar conhecimento aos empregados de que serão passíveis de punição, pelo descumprimento das ordens de serviço expedidas.',
  termoOSS: 'Declaro que recebi, li e compreendi esta Ordem de Serviço de Segurança, comprometendo-me a cumprir as orientações nela contidas, ciente de que o descumprimento constitui ato faltoso, nos termos do art. 158 da CLT e da NR-01.',
  declaracaoEPI: 'Declaro que recebi os Equipamentos de Proteção Individual (EPI) relacionados abaixo, em perfeito estado de conservação, bem como o treinamento sobre o uso correto, guarda e conservação, comprometendo-me a: usá-los apenas para a finalidade a que se destinam; responsabilizar-me pela guarda e conservação; comunicar qualquer alteração que os torne impróprios para uso; e cumprir as determinações sobre o uso adequado, conforme a NR-06 e o art. 158 da CLT.',
  cipaPrazos: [
    { t: 'Convocar os trabalhadores para a eleição', d: 60, ref: 'fim', dir: -1 },
    { t: 'Comunicar ao sindicato o início do processo eleitoral', d: 60, ref: 'fim', dir: -1 },
    { t: 'Constituir a comissão eleitoral', d: 55, ref: 'fim', dir: -1 },
    { t: 'Divulgação do edital de convocação', d: 45, ref: 'fim', dir: -1 },
    { t: 'Início da inscrição de candidatos (período mínimo de 15 dias)', d: 15, ref: 'eleicao', dir: -1 },
    { t: 'Término da inscrição de candidatos', d: 1, ref: 'eleicao', dir: -1 },
    { t: 'Publicação da relação dos candidatos inscritos', d: 1, ref: 'eleicao', dir: -1 },
    { t: 'Realização da eleição da CIPA', d: 30, ref: 'fim', dir: -1 },
    { t: 'Apuração dos votos', d: 30, ref: 'fim', dir: -1 },
    { t: 'Elaboração da ata de eleição', d: 30, ref: 'fim', dir: -1 },
    { t: 'Comunicar ao sindicato o resultado e a data da posse', d: 15, ref: 'eleicao', dir: 1 },
    { t: 'Treinamento dos cipeiros (antes da posse)', d: 15, ref: 'eleicao', dir: 1 },
    { t: 'Término do mandato atual', d: 0, ref: 'fim', dir: 1 },
    { t: 'Posse da nova CIPA', d: 1, ref: 'fim', dir: 1 },
    { t: 'Elaboração da ata de posse', d: 1, ref: 'fim', dir: 1 },
    { t: 'Calendário das reuniões ordinárias mensais', d: 1, ref: 'fim', dir: 1 }
  ]
};

const Config = {
  listas: {},
  params: {},
  async carregar(emp) {
    const l = await DB.get('cfg', emp + ':listas');
    const p = await DB.get('cfg', emp + ':params');
    this.listas = {};
    Object.keys(LISTAS_PADRAO).forEach((k) => {
      this.listas[k] = (l && l.value && Array.isArray(l.value[k])) ? l.value[k] : LISTAS_PADRAO[k].v.slice();
    });
    this.params = Object.assign(JSON.parse(JSON.stringify(PARAMS_PADRAO)), (p && p.value) || {});
  },
  async salvar() {
    const emp = App.emp.id;
    await DB.put('cfg', { key: emp + ':listas', value: this.listas });
    await DB.put('cfg', { key: emp + ':params', value: this.params });
    App.marcarSalvo();
  },
  lista(k) { return this.listas[k] || []; },
  /** Inclui na lista valores novos digitados nos formulários (lista flexível). */
  absorver(k, valor) {
    if (!k || valor == null || valor === '') return false;
    const vals = Array.isArray(valor) ? valor : [valor];
    let mudou = false;
    vals.forEach((v) => {
      const s = String(v).trim();
      if (!s) return;
      const l = this.listas[k] || (this.listas[k] = []);
      if (!l.some((x) => norm(x) === norm(s))) { l.push(s); mudou = true; }
    });
    return mudou;
  },
  classeRisco(nivel) {
    if (!nivel) return '';
    const f = this.params.riscoFaixas.find((x) => nivel >= Number(x.de) && nivel <= Number(x.ate));
    return f ? f.nome : '';
  }
};
