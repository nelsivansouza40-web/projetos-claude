/*
 * Disciplinas da inspeção: Segurança, Meio Ambiente e Qualidade.
 * Ao iniciar uma inspeção, o usuário escolhe primeiro a disciplina; a
 * lista de tipos (e, portanto, o checklist) passa a mostrar só os tipos
 * daquela disciplina.
 *
 * Os checklists de Meio Ambiente e de Qualidade seguem o mesmo critério
 * dos demais (mínimo de 20 itens) e são ponto de partida técnico: devem
 * ser revisados pelo profissional responsável conforme as licenças, o
 * plano da qualidade e as especificações de cada contrato.
 */

Object.assign(CHECKLISTS, {
  /* ---------------- MEIO AMBIENTE ---------------- */
  'Efluentes, Drenagem e Recursos Hídricos': [
    'O sistema de drenagem pluvial da área está implantado, desobstruído e em bom estado?',
    'Existem caixas de sedimentação ou bacias de decantação antes do lançamento das águas pluviais?',
    'Os efluentes sanitários são destinados a rede coletora, fossa/filtro ou empresa licenciada, com comprovação?',
    'Os banheiros químicos são higienizados e esvaziados por empresa licenciada, com registro da coleta?',
    'Efluentes oleosos (oficina, lavagem, abastecimento) passam por caixa separadora de água e óleo?',
    'A caixa separadora de água e óleo está limpa, sem transbordo e com registro de manutenção?',
    'O lançamento de efluentes atende aos padrões da outorga/licença e da Resolução CONAMA 430/2011?',
    'Existem análises periódicas de efluentes conforme exigido pela licença, com laudos de laboratório acreditado?',
    'A captação de água (poço, rio, caminhão-pipa) possui outorga ou autorização válida?',
    'Não há lançamento de efluentes, lama ou resíduos diretamente em cursos d’água ou galerias pluviais?',
    'A lavagem de betoneiras, caminhões e equipamentos é feita em local apropriado, com contenção?',
    'Os pontos de monitoramento de qualidade da água (montante/jusante) estão identificados e acessíveis?',
    'Nascentes, córregos e áreas úmidas próximas estão protegidos contra carreamento de sedimentos?',
    'Não há sinais de turbidez anormal, manchas de óleo ou espuma nos corpos hídricos do entorno?',
    'O consumo de água é registrado e existem ações de uso racional (reuso, controle de vazamentos)?',
    'Reservatórios e cisternas estão tampados, limpos e sem risco de proliferação de vetores?',
    'Os dispositivos de drenagem temporária (valetas, leiras, descidas d’água) são mantidos após chuvas?',
    'Há procedimento para resposta a derramamentos que possam atingir drenagem ou corpo hídrico?',
    'A equipe conhece os pontos de lançamento e as restrições de descarte da área?',
    'Os registros de manutenção e monitoramento de efluentes estão atualizados e disponíveis?'
  ],

  'Emissões Atmosféricas, Poeira e Ruído Ambiental': [
    'As vias internas não pavimentadas são umectadas com frequência suficiente para controlar a poeira?',
    'Existe controle de velocidade nas vias internas para reduzir a suspensão de poeira?',
    'As cargas de material granular transportadas são cobertas com lona?',
    'Pilhas de material fino (areia, brita, solo) estão protegidas contra a ação do vento?',
    'Britadores, peneiras e pontos de transferência possuem aspersão ou enclausuramento?',
    'Os veículos e equipamentos a diesel possuem manutenção preventiva em dia?',
    'É realizado o controle de fumaça preta (escala de Ringelmann) dos veículos a diesel, com registro?',
    'Não há queima de resíduos, vegetação ou materiais a céu aberto?',
    'Geradores e compressores estão em bom estado, sem emissão excessiva de fumaça?',
    'Atividades ruidosas próximas a comunidades respeitam os horários estabelecidos na licença ou no município?',
    'Existem medições de ruído ambiental conforme ABNT NBR 10151, quando exigido?',
    'Equipamentos ruidosos possuem atenuação (enclausuramento, silenciador, barreira) quando necessário?',
    'As detonações, quando houver, seguem plano de fogo com controle de vibração e sobrepressão?',
    'Há monitoramento de material particulado conforme condicionante da licença, quando aplicável?',
    'Fontes fixas de emissão (chaminés, exaustores) possuem filtro ou controle e estão em bom estado?',
    'Equipamentos com gases refrigerantes recebem manutenção sem liberação dos gases para a atmosfera?',
    'Existe canal para registro e tratamento de reclamações da vizinhança sobre poeira e ruído?',
    'As reclamações recebidas foram registradas, investigadas e respondidas?',
    'Os resultados de monitoramento de ar e ruído estão dentro dos padrões legais aplicáveis?',
    'A equipe foi orientada sobre as medidas de controle de poeira, fumaça e ruído?'
  ],

  'Armazenamento de Combustíveis e Produtos Perigosos': [
    'Os tanques de combustível possuem bacia de contenção com capacidade adequada e dreno fechado?',
    'A bacia de contenção está limpa, sem acúmulo de água, óleo ou resíduos?',
    'O ponto de abastecimento possui piso impermeável e canaleta ligada à caixa separadora de água e óleo?',
    'O abastecimento em campo usa bandeja de contenção e kit de emergência ambiental?',
    'Os tambores e bombonas estão sobre paletes de contenção e identificados?',
    'O depósito de produtos perigosos é coberto, ventilado, sinalizado e de acesso restrito?',
    'As FDS (Fichas com Dados de Segurança) dos produtos armazenados estão disponíveis no local?',
    'Produtos incompatíveis estão armazenados separadamente?',
    'O armazenamento de líquidos inflamáveis segue a ABNT NBR 17505 e as exigências do Corpo de Bombeiros?',
    'Os resíduos perigosos (Classe I, ABNT NBR 10004) são armazenados conforme a ABNT NBR 12235?',
    'Estopas, filtros, embalagens contaminadas e solo contaminado são segregados como resíduo perigoso?',
    'O óleo lubrificante usado é armazenado e destinado ao rerrefino, com certificado de coleta?',
    'Existe kit de emergência ambiental completo (mantas, barreiras, serragem, pá, sacos) próximo aos pontos de risco?',
    'Os extintores próximos às áreas de combustível estão adequados e dentro da validade?',
    'Mangueiras, bicos e conexões de abastecimento não apresentam vazamento?',
    'Não há manchas de óleo no solo ou indícios de contaminação nas áreas de armazenamento?',
    'Os tanques aéreos possuem licença/autorização e inspeção de estanqueidade quando exigido?',
    'Existe registro de entrada, consumo e saída de combustíveis e produtos perigosos?',
    'Os colaboradores que manuseiam esses produtos receberam treinamento específico?',
    'O plano de resposta a emergências contempla vazamento de combustível e de produtos perigosos?'
  ],

  'Erosão, Assoreamento e Recuperação de Áreas': [
    'Os taludes de corte e aterro estão estáveis, sem sulcos, ravinas ou voçorocas?',
    'Os taludes expostos possuem proteção superficial (hidrossemeadura, grama, biomanta) quando previsto?',
    'Existem canaletas de crista e de pé de talude funcionando?',
    'As descidas d’água e dissipadores de energia estão íntegros e desobstruídos?',
    'Há leiras, barreiras de siltagem ou sacos de contenção para reter sedimentos?',
    'As bacias de sedimentação estão dimensionadas e com limpeza periódica?',
    'Não há carreamento de sedimentos para cursos d’água, vias públicas ou propriedades vizinhas?',
    'O solo orgânico (topsoil) retirado foi estocado separadamente para uso na recuperação?',
    'As áreas de bota-fora e empréstimo estão autorizadas e com drenagem adequada?',
    'As pilhas de material estocado possuem altura e inclinação seguras e drenagem no entorno?',
    'Áreas sem uso foram reconformadas e liberadas para recuperação?',
    'O Plano de Recuperação de Áreas Degradadas (PRAD) está sendo executado conforme o cronograma?',
    'As espécies plantadas na recuperação estão de acordo com o projeto aprovado?',
    'Há acompanhamento do pegamento das mudas, com replantio quando necessário?',
    'Acessos e caminhos de serviço possuem abaulamento e saídas laterais de água?',
    'Após chuvas fortes são feitas vistorias e correções imediatas dos pontos de erosão?',
    'A movimentação de terra respeita os limites da área licenciada e as faixas de proteção?',
    'Não há deposição de material sobre vegetação nativa ou em Área de Preservação Permanente?',
    'Existem registros fotográficos periódicos da evolução das áreas em recuperação?',
    'As não conformidades de erosão já registradas têm ações corretivas com prazo e responsável?'
  ],

  'Supressão Vegetal e Fauna': [
    'A supressão de vegetação possui autorização válida do órgão ambiental?',
    'A área a suprimir está demarcada em campo e corresponde à área autorizada?',
    'Áreas de Preservação Permanente e de Reserva Legal estão identificadas e preservadas (Lei 12.651/2012)?',
    'Há afugentamento e resgate de fauna antes e durante a supressão, conforme o programa aprovado?',
    'A equipe de resgate de fauna possui profissional habilitado e autorização de manejo quando exigida?',
    'Os animais resgatados são registrados, com destinação documentada?',
    'Foi realizada a coleta de germoplasma (sementes e epífitas) quando exigida na autorização?',
    'O material lenhoso suprimido está romaneado, empilhado e com destinação conforme a autorização?',
    'O transporte de produto florestal possui o documento de origem exigido (DOF ou equivalente estadual)?',
    'Espécies protegidas ou ameaçadas foram identificadas e tratadas conforme a legislação?',
    'A supressão segue a direção que permite a fuga da fauna para áreas remanescentes?',
    'Não há uso de fogo para limpeza de área?',
    'Os operadores de motosserra são capacitados e os equipamentos estão registrados quando exigido?',
    'Existem placas de sinalização de travessia de fauna e de limite de velocidade nas vias?',
    'Os atropelamentos de fauna são registrados e analisados?',
    'É proibido e fiscalizado caçar, capturar, alimentar ou manter animais silvestres?',
    'Os resíduos orgânicos são acondicionados de forma a não atrair fauna?',
    'A compensação ambiental ou reposição florestal exigida está em andamento?',
    'Os trabalhadores receberam orientação sobre fauna, flora e animais peçonhentos?',
    'Os relatórios de supressão e de fauna estão atualizados para envio ao órgão ambiental?'
  ],

  'Licenças e Condicionantes Ambientais': [
    'A licença ambiental (LP/LI/LO ou equivalente) está válida e disponível no local?',
    'As atividades executadas são compatíveis com as autorizadas na licença?',
    'Existe controle formal das condicionantes da licença, com responsável e prazo?',
    'As condicionantes com prazo vencido foram atendidas e comprovadas?',
    'Os relatórios periódicos exigidos pelo órgão ambiental foram protocolados no prazo?',
    'A renovação da licença foi solicitada dentro do prazo legal antes do vencimento?',
    'Outorgas, autorizações de supressão e de manejo de fauna estão válidas?',
    'O Cadastro Técnico Federal (CTF/IBAMA) e o relatório anual (RAPP) estão em dia, quando aplicável?',
    'O Plano de Gerenciamento de Resíduos Sólidos (PGRS) está aprovado e atualizado?',
    'Os Manifestos de Transporte de Resíduos (MTR/SINIR) e os Certificados de Destinação Final (CDF) estão arquivados?',
    'As empresas contratadas para transporte e destinação de resíduos possuem licenças válidas?',
    'Os programas ambientais exigidos (monitoramento, educação ambiental, comunicação social) estão em execução?',
    'As notificações ou autos do órgão ambiental foram respondidos e tratados?',
    'Existe matriz de requisitos legais ambientais atualizada para a atividade?',
    'Os aspectos e impactos ambientais da atividade foram levantados e avaliados?',
    'Os indicadores ambientais (água, energia, resíduos) são acompanhados e reportados?',
    'As placas e a sinalização exigidas pela licença estão instaladas?',
    'A comunidade do entorno dispõe de canal de comunicação e suas demandas são registradas?',
    'Os colaboradores conhecem as principais restrições e condicionantes da licença?',
    'A documentação ambiental está organizada e disponível para fiscalização?'
  ],

  /* ---------------- QUALIDADE ---------------- */
  'Recebimento e Armazenamento de Materiais': [
    'O material recebido confere com o pedido de compra e a nota fiscal (tipo, quantidade, especificação)?',
    'O fornecedor está aprovado/qualificado conforme o procedimento de compras (ISO 9001, item 8.4)?',
    'Os certificados de qualidade, laudos ou fichas técnicas foram entregues com o material?',
    'Foi feita inspeção de recebimento conforme o plano de inspeção e ensaio (PIE)?',
    'Materiais com avaria, fora de especificação ou sem documentação foram identificados e segregados?',
    'Existe área específica e sinalizada para material não conforme ou aguardando liberação?',
    'Os materiais estão identificados (lote, data de recebimento, validade) no estoque?',
    'O armazenamento respeita as recomendações do fabricante (empilhamento, umidade, temperatura, luz solar)?',
    'O cimento e a argamassa ensacada estão sobre estrado, protegidos da umidade e com empilhamento limitado?',
    'O aço está estocado sobre apoios, sem contato com o solo e identificado por bitola?',
    'Os agregados estão em baias separadas, sem contaminação entre si ou com o solo?',
    'Materiais com prazo de validade seguem o critério de primeiro a vencer, primeiro a sair?',
    'O inventário físico confere com o controle de estoque?',
    'Os registros de recebimento e inspeção estão preenchidos e assinados?',
    'As devoluções a fornecedores são registradas, com o motivo da não conformidade?',
    'O almoxarifado está organizado, limpo e com acesso controlado?',
    'Os equipamentos de movimentação de materiais são adequados e evitam danos ao produto?',
    'Materiais de clientes (fornecidos pelo contratante) são identificados e controlados separadamente?',
    'As não conformidades de fornecedores alimentam a avaliação periódica de fornecedores?',
    'O responsável pelo recebimento conhece os critérios de aceitação de cada material crítico?'
  ],

  'Execução de Serviços (Conformidade com Projeto)': [
    'A equipe está trabalhando com a revisão vigente do projeto e das especificações?',
    'As cópias obsoletas de projeto foram recolhidas ou identificadas como "sem validade"?',
    'Existe procedimento executivo ou instrução de trabalho para o serviço inspecionado?',
    'A equipe foi treinada no procedimento executivo, com registro?',
    'A locação, os alinhamentos e os níveis conferem com o projeto, dentro das tolerâncias?',
    'As dimensões executadas conferem com o projeto (medição em campo)?',
    'Os materiais aplicados são os especificados em projeto, com rastreabilidade de lote?',
    'Os pontos de inspeção obrigatória (hold points) foram liberados antes da etapa seguinte?',
    'As fichas de verificação de serviço (FVS) estão preenchidas e assinadas?',
    'Os instrumentos usados na verificação estão calibrados e dentro da validade?',
    'As alterações de projeto feitas em campo foram aprovadas formalmente pelo projetista ou cliente?',
    'Interferências e dúvidas de projeto foram registradas e respondidas (RFI ou equivalente)?',
    'O acabamento do serviço atende ao padrão especificado, sem defeitos visíveis?',
    'Serviços com defeito foram identificados, registrados como não conformidade e tratados?',
    'As ações corretivas de não conformidades anteriores deste serviço foram eficazes?',
    'O serviço executado está protegido contra danos das etapas seguintes?',
    'O diário de obra registra o andamento e as ocorrências do serviço?',
    'Os registros "como construído" (as built) estão sendo atualizados?',
    'Os subcontratados conhecem e cumprem os mesmos requisitos de qualidade?',
    'O cliente ou a fiscalização acompanhou as etapas críticas, quando previsto em contrato?'
  ],

  'Terraplenagem e Compactação': [
    'A camada executada tem espessura compatível com a especificação (camada solta e compactada)?',
    'O material utilizado é proveniente de jazida ou área de empréstimo aprovada?',
    'Foram realizados ensaios de caracterização do material (granulometria, limites, CBR) conforme o plano?',
    'O ensaio de compactação (Proctor) de referência está disponível para o material aplicado?',
    'A umidade de compactação está dentro da faixa especificada em relação à umidade ótima?',
    'O grau de compactação medido em campo atinge o mínimo especificado?',
    'A frequência de ensaios de densidade in situ atende ao plano de controle tecnológico?',
    'Os pontos de ensaio estão identificados por estaca/posição e registrados?',
    'O equipamento de compactação é adequado ao tipo de solo e à espessura da camada?',
    'O número de passadas do rolo segue o definido no trecho experimental ou na especificação?',
    'Os greides, cotas e abaulamentos foram conferidos topograficamente?',
    'A largura da plataforma e a inclinação dos taludes conferem com o projeto?',
    'Camadas reprovadas foram escarificadas, corrigidas e reensaiadas antes de receber nova camada?',
    'Não há material orgânico, entulho ou blocos acima do tamanho permitido na camada?',
    'A superfície está protegida da chuva ou com drenagem provisória para evitar saturação?',
    'O laboratório de campo possui equipamentos calibrados e laboratorista capacitado?',
    'Os boletins de ensaio estão assinados e arquivados, com rastreabilidade ao trecho?',
    'O controle de volumes (corte, aterro, bota-fora) está atualizado e conciliado com a topografia?',
    'As liberações de camada foram assinadas pelo responsável e pela fiscalização, quando exigido?',
    'As não conformidades de compactação estão registradas com análise de causa?'
  ],

  'Concreto e Estruturas': [
    'O traço ou a nota fiscal do concreto usinado confere com o fck e a classe especificados em projeto?',
    'O tempo entre a saída da usina e o fim do lançamento está dentro do limite permitido?',
    'O ensaio de abatimento (slump) foi feito em cada caminhão e está dentro da faixa especificada?',
    'Foram moldados corpos de prova conforme a ABNT NBR 5738, com identificação do lote e da peça?',
    'Os corpos de prova são curados e rompidos conforme a ABNT NBR 5739, nas idades previstas?',
    'O controle de aceitação do concreto segue a ABNT NBR 12655 (formação de lotes e amostragem)?',
    'As fôrmas estão limpas, estanques, travadas e no alinhamento e prumo do projeto?',
    'A armadura confere com o projeto (bitolas, quantidades, espaçamentos, emendas e ancoragens)?',
    'Os espaçadores garantem o cobrimento especificado para a classe de agressividade?',
    'Embutidos e passagens (elétrica, hidráulica, insertos) foram conferidos antes da concretagem?',
    'A liberação para concretagem foi formalizada (checklist de pré-concretagem assinado)?',
    'O lançamento evita segregação (altura de queda, uso de bomba ou funil)?',
    'O adensamento é feito com vibrador adequado, sem excesso ou falta de vibração?',
    'A cura é iniciada logo após o acabamento e mantida pelo prazo especificado?',
    'As juntas de concretagem estão nos locais previstos e foram tratadas antes da retomada?',
    'Após a desforma, não há ninhos de concretagem, fissuras ou armadura exposta?',
    'Os prazos de desforma e de retirada de escoramento respeitam o projeto ou o procedimento?',
    'Peças com resistência abaixo do especificado foram tratadas conforme a ABNT NBR 6118/12655 (extração, análise, reforço)?',
    'O mapa de concretagem registra a rastreabilidade entre caminhão, corpos de prova e peça concretada?',
    'Os laudos do laboratório de controle tecnológico estão arquivados e analisados?'
  ],

  'Calibração de Instrumentos de Medição': [
    'Existe cadastro atualizado de todos os instrumentos de medição e monitoramento em uso?',
    'Cada instrumento possui identificação única (etiqueta, número de série ou código)?',
    'Os instrumentos estão com a calibração dentro da validade?',
    'Os certificados de calibração foram emitidos por laboratório acreditado (RBC/Cgcre) ou rastreável?',
    'Os resultados dos certificados foram analisados quanto ao erro e à incerteza admissíveis para o uso?',
    'Instrumentos vencidos ou reprovados foram retirados de uso e identificados?',
    'Quando um instrumento é reprovado, é avaliado o impacto sobre as medições feitas desde a última calibração (ISO 9001, item 7.1.5)?',
    'Os instrumentos são armazenados e transportados de forma a preservar sua exatidão?',
    'Existe verificação intermediária para instrumentos críticos (trenas, níveis, manômetros, balanças)?',
    'Os equipamentos topográficos (estação total, nível, GNSS) estão calibrados e aferidos?',
    'Os equipamentos de laboratório (prensa, balanças, estufas, peneiras) estão calibrados?',
    'Os instrumentos de segurança (detectores de gases, decibelímetros, luxímetros) estão calibrados?',
    'A periodicidade de calibração está definida com base no uso e no histórico de cada instrumento?',
    'Os usuários estão capacitados a operar e verificar os instrumentos?',
    'Instrumentos de terceiros usados no serviço também possuem calibração comprovada?',
    'Ajustes e reparos são registrados e seguidos de nova calibração?',
    'Os registros de calibração estão arquivados pelo prazo definido?',
    'Existe cronograma de calibração com alerta de vencimentos?',
    'Os instrumentos danificados ou com leitura suspeita são comunicados e encaminhados para verificação?',
    'O controle de instrumentos foi avaliado na última auditoria interna sem pendências abertas?'
  ],

  'Documentos e Registros da Qualidade': [
    'O manual, os procedimentos e as instruções em uso estão na revisão vigente?',
    'Existe lista mestra de documentos atualizada e acessível?',
    'Os documentos foram aprovados antes da emissão, por responsável definido?',
    'As alterações de documentos são identificadas e comunicadas às áreas usuárias?',
    'Os documentos obsoletos foram retirados de uso ou identificados como tais?',
    'Os documentos de origem externa (normas, projetos do cliente, legislação) são controlados?',
    'Os registros (FVS, ensaios, inspeções, treinamentos) estão legíveis, completos e assinados?',
    'Os registros estão protegidos contra perda, dano e alteração indevida?',
    'Os prazos de retenção dos registros estão definidos e são cumpridos?',
    'Os arquivos eletrônicos possuem cópia de segurança e controle de acesso?',
    'As não conformidades estão registradas com descrição, análise de causa e ação corretiva?',
    'A eficácia das ações corretivas é verificada e registrada?',
    'As reclamações de clientes estão registradas e tratadas dentro do prazo?',
    'Os objetivos e indicadores da qualidade estão definidos, medidos e analisados?',
    'As auditorias internas seguem o programa, e as constatações estão tratadas?',
    'A análise crítica pela direção foi realizada no período, com registro das saídas?',
    'Os registros de competência e treinamento dos colaboradores estão atualizados?',
    'Os riscos e as oportunidades do processo estão identificados e com ações definidas?',
    'O plano da qualidade da obra ou contrato está aprovado e sendo cumprido?',
    'Os colaboradores sabem onde encontrar os documentos e registros de que precisam?'
  ],

  'Produto/Serviço Acabado e Entrega': [
    'O produto ou serviço foi inspecionado integralmente antes da liberação (ISO 9001, item 8.6)?',
    'Todos os ensaios e verificações previstos no plano de inspeção foram concluídos e aprovados?',
    'As pendências levantadas na inspeção final foram corrigidas e reverificadas?',
    'Saídas não conformes foram identificadas e tratadas (correção, concessão ou rejeição) com registro (item 8.7)?',
    'Concessões ao cliente, quando houver, foram aprovadas formalmente?',
    'O acabamento final atende ao padrão contratado, sem defeitos visíveis?',
    'As dimensões e tolerâncias finais estão dentro do especificado?',
    'O produto acabado está protegido contra danos até a entrega?',
    'A identificação e a rastreabilidade do produto estão preservadas até a entrega?',
    'A documentação de entrega (data book, as built, certificados, manuais) está completa?',
    'Os termos de garantia e as orientações de uso e manutenção foram entregues ao cliente?',
    'A área foi entregue limpa, desmobilizada e sem resíduos da execução?',
    'O cliente ou a fiscalização participou da vistoria de entrega?',
    'O termo de recebimento (provisório ou definitivo) foi assinado?',
    'As observações do cliente na entrega foram registradas, com prazo para atendimento?',
    'A satisfação do cliente foi avaliada após a entrega?',
    'As lições aprendidas do serviço foram registradas para os próximos contratos?',
    'Os indicadores de retrabalho e de não conformidade do serviço foram consolidados?',
    'Os subcontratados entregaram a documentação e as garantias de seus serviços?',
    'Os registros finais da qualidade foram arquivados conforme o procedimento?'
  ]
});

const DISCIPLINAS_INSPECAO = [
  {
    id: 'Segurança',
    rotulo: 'Segurança do Trabalho',
    descricao: 'NRs, máquinas, trabalho em altura, eletricidade, EPI, ferramentas, canteiro e demais riscos ocupacionais.',
    subtitulo: 'Segurança e Saúde no Trabalho',
    cor: 'var(--azul)',
    tipos: [
      'Inspeção Geral de SST',
      'Máquinas e Equipamentos',
      'Ferramentas Manuais e Elétricas',
      'Trabalho em Altura',
      'Espaço Confinado',
      'Eletricidade',
      'Veículos e Equipamentos Móveis',
      'Içamento e Movimentação de Cargas',
      'EPI/EPC',
      'Prevenção e Combate a Incêndio',
      'Produtos Químicos',
      'Organização, Limpeza e Sinalização',
      'Canteiro/Área Operacional',
      'Vistoria de Obra (NR-18)',
      'Edificações',
      'Instalações Sanitárias',
      'Escola Técnica',
      'Parafusadeira',
      'Furadeira',
      'Serra Circular',
      'Esmerilhadeira',
      'Termofusora',
      'Rompedor',
      'Rompedor Portátil',
      'Soprador Térmico',
      'Betoneiras',
      'Extensões Elétricas',
      'Martelete',
      'Máquina de Solda',
      'Outra inspeção específica'
    ]
  },
  {
    id: 'Meio Ambiente',
    rotulo: 'Meio Ambiente',
    descricao: 'Resíduos, efluentes, emissões e ruído, produtos perigosos, erosão, flora e fauna, licenças e condicionantes.',
    subtitulo: 'Meio Ambiente',
    cor: 'var(--verde)',
    tipos: [
      'Meio Ambiente e Resíduos',
      'Efluentes, Drenagem e Recursos Hídricos',
      'Emissões Atmosféricas, Poeira e Ruído Ambiental',
      'Armazenamento de Combustíveis e Produtos Perigosos',
      'Erosão, Assoreamento e Recuperação de Áreas',
      'Supressão Vegetal e Fauna',
      'Licenças e Condicionantes Ambientais',
      'Outra inspeção específica'
    ]
  },
  {
    id: 'Qualidade',
    rotulo: 'Qualidade',
    descricao: 'Recebimento de materiais, conformidade com projeto, terraplenagem, concreto, calibração, documentos e entrega.',
    subtitulo: 'Qualidade',
    cor: '#6a3fb5',
    tipos: [
      'Recebimento e Armazenamento de Materiais',
      'Execução de Serviços (Conformidade com Projeto)',
      'Terraplenagem e Compactação',
      'Concreto e Estruturas',
      'Calibração de Instrumentos de Medição',
      'Documentos e Registros da Qualidade',
      'Produto/Serviço Acabado e Entrega',
      'Outra inspeção específica'
    ]
  }
];

// Mantém a lista geral de tipos completa (usada em buscas e relatórios).
DISCIPLINAS_INSPECAO.forEach((d) => d.tipos.forEach((t) => {
  if (!TIPOS_INSPECAO.includes(t)) TIPOS_INSPECAO.splice(TIPOS_INSPECAO.length - 1, 0, t);
}));

function dadosDisciplina(id) {
  return DISCIPLINAS_INSPECAO.find((d) => d.id === id) || DISCIPLINAS_INSPECAO[0];
}

/** Disciplina da inspeção; registros antigos (sem o campo) são deduzidos pelo tipo. */
function disciplinaDaInspecao(insp) {
  if (insp.data.disciplina) return insp.data.disciplina;
  const tipo = insp.data.tipoInspecao;
  const achada = DISCIPLINAS_INSPECAO.find((d) => d.id !== 'Segurança' && d.tipos.includes(tipo) && tipo !== 'Outra inspeção específica');
  return achada ? achada.id : 'Segurança';
}

function seloDisciplina(insp) {
  const d = dadosDisciplina(disciplinaDaInspecao(insp));
  return `<span class="badge badge-disciplina" style="background:${d.cor}">${escapeHtml(d.id)}</span>`;
}
