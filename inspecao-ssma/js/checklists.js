/*
 * Bancos de perguntas por tipo de inspeção.
 * Todos os tipos possuem no mínimo 20 questões, revisadas conforme as
 * Normas Regulamentadoras vigentes aplicáveis a cada modalidade (NR-6,
 * NR-10, NR-11, NR-12, NR-18, NR-23, NR-24, NR-25, NR-26, NR-33, NR-35,
 * entre outras citadas nos itens). Termos tecnicamente obsoletos (como
 * "ato inseguro" e o antigo plano específico de segurança do canteiro
 * de obras, hoje absorvido pelo Programa de Gerenciamento de Riscos -
 * PGR) foram removidos ou atualizados.
 *
 * Os itens continuam sendo um ponto de partida técnico: devem ser
 * revisados e ajustados pelo profissional responsável conforme o
 * processo real, a atividade e os requisitos normativos aplicáveis
 * antes do uso definitivo em campo. É possível adicionar itens
 * personalizados em qualquer inspeção, diretamente no aplicativo.
 */

const TIPOS_INSPECAO = [
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
  'Meio Ambiente e Resíduos',
  'Produtos Químicos',
  'Organização, Limpeza e Sinalização',
  'Canteiro/Área Operacional',
  'Outra inspeção específica'
];

const CHECKLISTS = {
  'Inspeção Geral de SST': [
    'Acessos e vias de circulação estão seguros e desobstruídos?',
    'A organização e limpeza da área estão adequadas?',
    'Pisos, plataformas e superfícies apresentam condições seguras?',
    'Escadas, rampas e passarelas apresentam condições adequadas?',
    'A sinalização de segurança está disponível, visível e adequada?',
    'Máquinas e equipamentos apresentam proteções e condições seguras?',
    'Dispositivos de emergência estão disponíveis e acessíveis?',
    'Ferramentas manuais estão adequadas e em boas condições?',
    'Ferramentas elétricas apresentam condições seguras de utilização?',
    'Instalações, cabos, painéis e conexões elétricas apresentam condições seguras?',
    'Os trabalhadores utilizam os EPIs definidos para a atividade?',
    'Os EPIs observados apresentam condições adequadas de conservação e uso?',
    'EPCs existentes estão instalados e funcionais?',
    'Trabalhos em altura observados apresentam controles compatíveis com a atividade?',
    'Escavações, aberturas ou diferenças de nível estão protegidas e sinalizadas?',
    'Operações com veículos e equipamentos móveis apresentam condições controladas?',
    'Atividades de movimentação e içamento de cargas apresentam condições seguras?',
    'Produtos químicos estão identificados, armazenados e controlados adequadamente?',
    'Resíduos estão segregados, identificados e acondicionados adequadamente?',
    'Extintores e demais recursos de emergência estão acessíveis e sem obstruções aparentes?',
    'Rotas e saídas destinadas à emergência encontram-se desobstruídas?',
    'Materiais estão armazenados de forma estável e segura?',
    'Existem condições ou comportamentos de risco com potencial de acidente que necessitem intervenção?',
    'Os controles estabelecidos para os riscos observados estão efetivamente implementados?',
    'Existem outras condições de risco, desvios ou oportunidades de melhoria identificadas durante a inspeção?'
  ],

  'Máquinas e Equipamentos': [
    'A máquina possui proteções fixas e móveis instaladas e íntegras?',
    'Os dispositivos de parada de emergência estão acessíveis, sinalizados e funcionais?',
    'Existe registro de inspeção e manutenção preventiva atualizado (prontuário da máquina, conforme NR-12)?',
    'Os operadores são capacitados, treinados e autorizados formalmente para a máquina?',
    'Sistemas de segurança (intertravamento, sensores de presença, cortina de luz) estão funcionais?',
    'A sinalização de risco, capacidade e limites de operação está visível e legível?',
    'Não há evidência de burla, remoção ou bypass de dispositivos de segurança?',
    'O espaço ao redor da máquina permite operação, manutenção e circulação seguras?',
    'Ruído, vibração ou outros agentes gerados pela máquina estão controlados e dentro dos limites aplicáveis?',
    'Os procedimentos de bloqueio e etiquetagem (LOTO) são seguidos durante manutenção?',
    'As zonas de perigo estão devidamente identificadas e com barreiras físicas quando aplicável?',
    'Os comandos de acionamento exigem ação intencional e não permitem acionamento acidental?',
    'Existe Análise de Risco (AR) específica da máquina disponível e atualizada?',
    'Os manuais de operação e manutenção do fabricante estão disponíveis aos operadores?',
    'A máquina possui sistema de frenagem/parada compatível com o tempo de segurança exigido?',
    'Cabos, mangueiras e conexões hidráulicas/pneumáticas estão íntegros e sem vazamentos?',
    'Existe manutenção corretiva pendente que represente risco à segurança dos operadores?',
    'Os pontos de lubrificação e abastecimento são acessados sem exposição a partes móveis?',
    'A troca de ferramentas e acessórios segue procedimento seguro documentado?',
    'Foi realizada capacitação específica para a função de operador de máquinas, conforme a NR-12?',
    'Os dispositivos de proteção removidos para manutenção são reinstalados antes do retorno à operação?'
  ],

  'Ferramentas Manuais e Elétricas': [
    'As ferramentas manuais estão em bom estado de conservação (sem trincas, cabos soltos, fios expostos)?',
    'As ferramentas elétricas possuem sistema de aterramento ou isolação dupla íntegra?',
    'Cabos de alimentação e extensões estão íntegros, sem emendas irregulares ou fita isolante como reparo definitivo?',
    'As ferramentas possuem proteção de partes móveis/cortantes quando aplicável?',
    'É utilizado dispositivo DR (diferencial residual) para ferramentas elétricas portáteis?',
    'As ferramentas são adequadas e dimensionadas para a atividade executada?',
    'Existe local apropriado, organizado e seco para guarda e transporte das ferramentas?',
    'Ferramentas danificadas são retiradas de uso, identificadas e segregadas imediatamente?',
    'As ferramentas elétricas portáteis possuem inspeção periódica documentada?',
    'Os discos de corte/desbaste estão dentro da validade e são compatíveis com o equipamento?',
    'As proteções (guardas) de esmerilhadeiras, serras e similares estão instaladas corretamente?',
    'Os cabos das ferramentas não atravessam vias de circulação sem proteção ou sinalização?',
    'Ferramentas pneumáticas apresentam mangueiras e engates em boas condições, sem vazamento?',
    'Os trabalhadores utilizam EPI compatível com o uso da ferramenta (óculos, protetor auricular, luvas)?',
    'Existe treinamento específico para uso das ferramentas de maior risco (serra circular, esmerilhadeira, furadeira de impacto)?',
    'As baterias e carregadores de ferramentas sem fio apresentam condições seguras de uso e armazenamento?',
    'Ferramentas de percussão (marretas, talhadeiras) não apresentam rebarbas ou fissuras na cabeça?',
    'O acionamento das ferramentas elétricas exige ação contínua do operador, sem travas de acionamento indevidas?',
    'Existe controle de posse e devolução de ferramentas (almoxarifado/ferramentaria)?',
    'As tomadas e plugues utilizados são compatíveis com as ferramentas e estão em bom estado, sem improvisações?'
  ],

  'Trabalho em Altura': [
    'Existe Permissão de Trabalho (PT) emitida e válida para a atividade em altura?',
    'A Análise de Risco foi realizada e está compatível com a atividade em execução?',
    'Os trabalhadores possuem certificado de capacitação em trabalho em altura válido, conforme a NR-35?',
    'O sistema de ancoragem é adequado e foi projetado/avaliado por profissional habilitado?',
    'Os cinturões de segurança tipo paraquedista e talabartes estão em boas condições e dentro da validade?',
    'Está sendo utilizado sistema de proteção contra quedas (trava-quedas, linha de vida) compatível com a atividade?',
    'Existe plano de resgate específico, com equipe e equipamentos disponíveis no local?',
    'A área abaixo da atividade está isolada, sinalizada e livre de circulação de pessoas?',
    'As condições climáticas (vento, chuva, tempestade) são compatíveis com a execução segura da atividade?',
    'Os pontos de ancoragem possuem resistência e fixação adequadas, testadas ou certificadas?',
    'Os trabalhadores possuem Atestado de Saúde Ocupacional (ASO) específico para trabalho em altura?',
    'O fator de queda e a distância livre de queda foram avaliados antes do início da atividade?',
    'Os equipamentos de proteção individual estão inspecionados antes do uso (checklist pré-uso)?',
    'Existe segundo trabalhador ou observador quando exigido pelo procedimento da atividade?',
    'Escadas, andaimes ou plataformas elevatórias utilizados possuem inspeção e liberação para uso?',
    'Os andaimes possuem guarda-corpo, rodapé e travamento adequados, quando aplicável?',
    'Ferramentas e materiais utilizados em altura possuem contenção contra queda de objetos?',
    'Os trabalhadores demonstram conhecimento dos procedimentos de emergência e resgate?',
    'Não há execução simultânea de outras atividades que aumentem o risco na mesma vertical?',
    'A comunicação entre os trabalhadores em altura e a equipe de apoio no solo está garantida?'
  ],

  'Espaço Confinado': [
    'Existe Permissão de Entrada e Trabalho (PET) emitida e válida, conforme a NR-33?',
    'A atmosfera do espaço confinado foi monitorada (O2, inflamáveis, tóxicos) antes da entrada?',
    'O monitoramento contínuo da atmosfera está sendo realizado durante toda a atividade?',
    'Existe vigia (observador) dedicado, capacitado e presente durante toda a entrada?',
    'Os equipamentos de ventilação/exaustão estão instalados, dimensionados e funcionando?',
    'Os trabalhadores possuem capacitação específica para espaço confinado (autorizado/supervisor)?',
    'Existe equipamento de resgate (tripé, guincho) e equipe de emergência disponível e treinada?',
    'O acesso está sinalizado, isolado e bloqueado para pessoas não autorizadas?',
    'Os EPIs específicos (respirador, tripé de resgate, cabo de segurança) estão disponíveis e adequados?',
    'Existe plano de resgate específico para o espaço confinado, testado previamente?',
    'Os equipamentos de detecção de gases estão calibrados e com certificado válido?',
    'A comunicação entre o vigia e os trabalhadores no interior do espaço é eficaz e testada?',
    'Existe procedimento de isolamento de energias perigosas (bloqueio e etiquetagem) antes da entrada?',
    'O espaço confinado foi limpo e preparado adequadamente antes da liberação para entrada?',
    'Os trabalhadores foram informados sobre os riscos específicos do espaço confinado avaliado?',
    'Existe controle do número de entradas e saídas de trabalhadores durante a atividade?',
    'Os equipamentos elétricos utilizados no interior são compatíveis com a classificação de área, quando aplicável?',
    'A iluminação utilizada no interior do espaço confinado é adequada e segura para a atmosfera existente?',
    'Existe rota de fuga desobstruída e conhecida por todos os envolvidos?',
    'A PET está afixada e visível no local durante toda a execução da atividade?'
  ],

  'Eletricidade': [
    'Os quadros e painéis elétricos estão identificados, fechados e sinalizados?',
    'Existe Permissão de Trabalho para atividades em instalações elétricas?',
    'Os trabalhadores possuem capacitação NR-10 (básica/complementar SEP) compatível com a atividade?',
    'Foram adotados procedimentos de bloqueio e etiquetagem (LOTO) quando aplicável?',
    'Os EPIs isolantes (luvas, mangas, calçados) estão adequados e com teste de isolação dentro da validade?',
    'As ferramentas utilizadas são isoladas e apropriadas para trabalho elétrico?',
    'Cabos, fiações e conexões estão em boas condições, sem exposição de condutores?',
    'A área de trabalho elétrico está sinalizada, isolada e com acesso controlado?',
    'Existe aterramento adequado nas instalações e equipamentos avaliados?',
    'Foi comprovada a ausência de tensão antes do início dos trabalhos (teste dos três passos)?',
    'Os equipamentos de detecção de tensão estão calibrados e em boas condições?',
    'Existe prontuário de instalações elétricas atualizado, conforme exigido pela NR-10?',
    'Os trabalhadores utilizam tapete isolante e/ou banqueta isolante quando aplicável?',
    'Extensões e adaptadores elétricos utilizados estão em boas condições, sem improvisações?',
    'Painéis e quadros possuem diagrama unifilar disponível e atualizado?',
    'Existe distância de segurança respeitada em relação a partes energizadas não protegidas?',
    'Os disjuntores e dispositivos de proteção estão dimensionados corretamente para o circuito?',
    'Trabalhos em linha viva, quando existentes, seguem procedimento específico e autorização formal?',
    'Os trabalhadores demonstram conhecimento dos riscos elétricos e dos procedimentos de emergência?',
    'Existe sinalização de impedimento (cadeado, etiqueta) visível durante manutenção nos circuitos desenergizados?'
  ],

  'Veículos e Equipamentos Móveis': [
    'O veículo/equipamento possui checklist de pré-uso preenchido e atualizado?',
    'Os freios, luzes, sinalização sonora (ré) e cintos de segurança estão funcionais?',
    'O operador/motorista possui habilitação e capacitação compatível com o veículo/equipamento?',
    'Os limites de velocidade e rotas definidas estão sendo respeitados?',
    'Existe sinalização de manobra (ré, buzina) e uso de auxiliar de manobra quando necessário?',
    'Os pneus, espelhos e para-brisas estão em condições adequadas de uso?',
    'A carga transportada está adequadamente fixada, distribuída e dentro da capacidade do veículo?',
    'A manutenção preventiva do veículo/equipamento está em dia, com registros disponíveis?',
    'A área de circulação é segregada do trânsito de pedestres quando aplicável?',
    'O veículo/equipamento possui extintor de incêndio e kit de emergência quando exigido?',
    'Existe controle de fadiga/jornada do operador compatível com a atividade exercida?',
    'O uso de celular ou outras distrações durante a operação é proibido e efetivamente respeitado?',
    'Equipamentos móveis possuem alarme sonoro de ré e sinalizador rotativo (giroflex) funcionando?',
    'A visibilidade do operador é adequada, sem obstruções por carga ou acessórios?',
    'Existe procedimento definido para operação em marcha à ré, com auxílio de sinaleiro quando necessário?',
    'Os cintos de segurança e sistemas de retenção são utilizados por todos os ocupantes?',
    'O abastecimento de combustível segue procedimento seguro, com o veículo desligado e a área ventilada?',
    'Existe controle de acesso e bloqueio de partida para operadores não autorizados?',
    'As condições da via/piso são adequadas para a circulação segura do veículo/equipamento?',
    'Equipamentos com plataforma elevatória possuem sistema de nivelamento e travamento funcionais?'
  ],

  'Içamento e Movimentação de Cargas': [
    'Existe Plano de Içamento para operações críticas ou não rotineiras?',
    'O guindaste/grua possui certificação e inspeção atualizada, com laudo de profissional habilitado?',
    'Os cabos, cintas, correntes e acessórios de içamento estão em boas condições e com capacidade adequada?',
    'O operador possui certificação/capacitação válida para o equipamento operado, conforme a NR-11?',
    'O sinaleiro/rigger está identificado, capacitado e presente durante toda a operação?',
    'A área abaixo e ao redor da carga está isolada e sinalizada?',
    'A capacidade de carga (tabela de carga) do equipamento está sendo respeitada?',
    'O solo/base de apoio do equipamento é adequado, nivelado e estável?',
    'Foi verificada a ausência de interferência com redes elétricas ou obstáculos aéreos?',
    'Os ganchos de içamento possuem trava de segurança funcional?',
    'A carga a ser movimentada foi previamente pesada ou corretamente estimada?',
    'Existe comunicação clara (rádio ou sinais manuais padronizados) entre operador e sinaleiro?',
    'Os acessórios de içamento possuem identificação de capacidade de carga (etiqueta/marcação)?',
    'A movimentação de carga sobre pessoas é proibida e efetivamente respeitada?',
    'O equipamento passou por inspeção diária antes do início das operações?',
    'Existe procedimento específico para içamento de cargas com dimensões ou pesos especiais?',
    'As condições climáticas (vento) são compatíveis com a operação segura de içamento?',
    'Os estabilizadores do equipamento estão corretamente posicionados e travados?',
    'Cargas suspensas não permanecem paradas sobre áreas de circulação sem necessidade?',
    'Existe registro de manutenção preventiva/corretiva do equipamento de içamento?'
  ],

  'EPI/EPC': [
    'Os trabalhadores utilizam corretamente os EPIs definidos para a atividade?',
    'Os EPIs possuem Certificado de Aprovação (CA) válido e estão em boas condições, conforme a NR-6?',
    'Existe controle de entrega e troca periódica dos EPIs (ficha de EPI assinada)?',
    'Os EPCs aplicáveis (guarda-corpo, proteção coletiva, ventilação) estão instalados e íntegros?',
    'Os trabalhadores foram treinados quanto ao uso correto, guarda e conservação dos EPIs?',
    'Existe disponibilidade de EPIs de reposição na frente de serviço?',
    'Os EPIs estão adequados ao risco específico da atividade avaliada?',
    'Os EPIs apresentam sinais de desgaste, dano ou vencimento que comprometam sua eficácia?',
    'Existe local apropriado para higienização e armazenamento dos EPIs?',
    'Os EPIs de proteção respiratória possuem troca de filtros/cartuchos conforme recomendação do fabricante?',
    'Os protetores auriculares utilizados são compatíveis com o nível de ruído da atividade?',
    'Os calçados de segurança são adequados ao risco (impacto, perfuração, elétrico) da atividade?',
    'Óculos e protetores faciais utilizados estão limpos e sem riscos que prejudiquem a visão?',
    'Existe procedimento de inspeção periódica dos EPIs pelos próprios usuários?',
    'Os EPCs de proteção contra quedas (guarda-corpo, redes) estão dimensionados corretamente?',
    'A sinalização de obrigatoriedade de uso de EPI está visível nas áreas aplicáveis?',
    'Trabalhadores recém-admitidos receberam treinamento de integração sobre uso de EPI?',
    'Existe substituição imediata de EPIs danificados identificados durante a inspeção?',
    'Os EPIs utilizados são compatíveis entre si, sem conflito de uso simultâneo?',
    'A liderança da área cobra e fiscaliza o uso correto dos EPIs pelos trabalhadores?'
  ],

  'Prevenção e Combate a Incêndio': [
    'Os extintores estão nos locais definidos, sinalizados, com carga e inspeção válidas?',
    'O acesso aos extintores e hidrantes está livre de obstruções?',
    'As rotas de fuga e saídas de emergência estão desobstruídas e sinalizadas?',
    'A iluminação de emergência está funcional e testada periodicamente?',
    'Os trabalhadores conhecem o plano de emergência e o ponto de encontro definido?',
    'Existe brigada de incêndio treinada, identificada e dimensionada para a área, conforme a NR-23?',
    'Materiais inflamáveis/combustíveis estão armazenados adequadamente, longe de fontes de ignição?',
    'Os sistemas fixos de combate a incêndio (sprinklers, alarmes, detectores) estão operacionais?',
    'Os extintores possuem selo de inspeção com data de validade dentro do prazo?',
    'Existe simulado de abandono de área realizado periodicamente?',
    'As portas corta-fogo estão íntegras, sinalizadas e não travadas em posição aberta indevidamente?',
    'O tipo de extintor disponível é compatível com a classe de incêndio prevista para a área?',
    'Existe sistema de alarme de incêndio audível em toda a área de risco?',
    'Os pontos de encontro em caso de emergência estão sinalizados e conhecidos pelos trabalhadores?',
    'A quantidade de extintores está de acordo com a área de risco e a distância máxima exigida?',
    'Trabalhos a quente (solda, corte) na área seguem Permissão de Trabalho específica?',
    'Existe controle de materiais combustíveis próximos a trabalhos a quente?',
    'Mangueiras de incêndio, quando existentes, estão íntegras e acondicionadas corretamente?',
    'A brigada de incêndio possui equipamentos de resposta a emergência disponíveis e em condições de uso?',
    'Não há bloqueio de painéis elétricos, hidrantes ou saídas por materiais ou equipamentos?'
  ],

  'Meio Ambiente e Resíduos': [
    'Os resíduos estão segregados corretamente conforme classificação (recicláveis, orgânicos, perigosos)?',
    'Os recipientes de coleta estão identificados, íntegros e em quantidade suficiente?',
    'Existe área de armazenamento temporário de resíduos adequada e licenciada quando exigido?',
    'Produtos químicos e resíduos perigosos possuem contenção secundária adequada?',
    'Não há indícios de vazamento, contaminação do solo ou descarte irregular?',
    'A destinação final dos resíduos está sendo realizada por empresa licenciada, com documentação (MTR/CDF)?',
    'Existem medidas de controle de emissões, ruído ou poeira implementadas quando aplicável?',
    'A área apresenta condições de preservação de recursos hídricos e vegetação no entorno?',
    'Existe controle de geração e destinação de efluentes líquidos da atividade?',
    'Os resíduos perigosos estão identificados com simbologia adequada (inflamável, corrosivo, tóxico)?',
    'Existe plano de gerenciamento de resíduos sólidos disponível e atualizado?',
    'Áreas de abastecimento de combustível possuem contenção contra vazamentos?',
    'Os indicadores ambientais (ruído, emissões, efluentes) estão dentro dos limites legais aplicáveis?',
    'Existe licenciamento ambiental válido e compatível com a atividade desenvolvida?',
    'Resíduos recicláveis são segregados e destinados corretamente para reaproveitamento?',
    'A equipe conhece os procedimentos de resposta a emergências ambientais (vazamentos, derramamentos)?',
    'Existe kit de contenção de emergência ambiental disponível nas áreas de risco?',
    'Os tambores e recipientes de produtos/resíduos estão identificados e em boas condições?',
    'Não há queima irregular de resíduos ou materiais na área avaliada?',
    'Áreas verdes e de preservação permanente estão preservadas conforme exigido?'
  ],

  'Produtos Químicos': [
    'Os produtos químicos estão identificados com rotulagem adequada, conforme GHS/NR-26?',
    'A Ficha de Informações de Segurança de Produtos Químicos (FISPQ/FDS) está disponível no local?',
    'O armazenamento respeita a compatibilidade química entre produtos?',
    'Existe contenção secundária para evitar vazamentos e contaminação?',
    'Os trabalhadores utilizam os EPIs específicos indicados para manuseio do produto?',
    'Existe chuveiro de emergência e lava-olhos disponível, sinalizado e funcional quando aplicável?',
    'A ventilação do local de armazenamento/manuseio é adequada?',
    'Os trabalhadores foram treinados quanto aos riscos e procedimentos de emergência do produto?',
    'Os recipientes de produtos químicos estão livres de vazamentos ou avarias?',
    'Não há reenvase de produtos químicos em embalagens sem identificação adequada?',
    'Existe controle de estoque e validade dos produtos químicos armazenados?',
    'Os produtos inflamáveis são armazenados em local apropriado, longe de fontes de ignição?',
    'Existe sinalização de risco químico visível nas áreas de armazenamento e manuseio?',
    'Os trabalhadores sabem localizar e interpretar a FISPQ do produto que manuseiam?',
    'Existe procedimento definido para descarte seguro de embalagens vazias de produtos químicos?',
    'As áreas de manuseio possuem piso impermeável e de fácil limpeza?',
    'Os equipamentos de transferência de produtos químicos (bombas, mangueiras) estão em boas condições?',
    'Existe kit de emergência para vazamentos de produtos químicos disponível no local?',
    'Os produtos incompatíveis (ex.: oxidantes e inflamáveis) estão fisicamente segregados?',
    'A quantidade de produto armazenado respeita o limite definido para a área/edificação?'
  ],

  'Organização, Limpeza e Sinalização': [
    'A área está livre de materiais, entulhos ou objetos que possam causar acidentes?',
    'Os materiais estão armazenados de forma organizada e estável (sem risco de queda/tombamento)?',
    'A sinalização de segurança (obrigatoriedade, alerta, proibição) está visível e em bom estado?',
    'Os pisos e vias de circulação estão limpos e livres de resíduos escorregadios?',
    'A iluminação da área é adequada para a atividade desenvolvida?',
    'Os resíduos de obra/produção são recolhidos com frequência definida?',
    'As áreas de vivência (refeitório, sanitários, vestiário) estão organizadas, limpas e conforme a NR-24?',
    'Existe programa de organização e limpeza (5S ou similar) implementado na área?',
    'Corredores e vias de circulação possuem largura adequada e estão devidamente demarcados?',
    'Os materiais empilhados respeitam altura máxima segura e estabilidade da pilha?',
    'A sinalização de piso (faixas, demarcações) está visível e em bom estado de conservação?',
    'Não há cabos, mangueiras ou fios soltos representando risco de tropeço nas vias de circulação?',
    'Os depósitos de materiais e ferramentas estão organizados e identificados?',
    'A água potável disponibilizada aos trabalhadores atende aos requisitos mínimos de qualidade e acesso?',
    'Os sanitários e vestiários possuem condições adequadas de higiene e conservação?',
    'Existe local adequado para refeições, protegido das intempéries e distante de agentes insalubres?',
    'A sinalização de rotas de fuga e saídas de emergência está visível em toda a área?',
    'Placas de identificação de riscos específicos estão afixadas nos locais correspondentes?',
    'Não há acúmulo de lixo ou materiais em desuso que comprometam a organização da área?',
    'Existe responsável definido pela manutenção da organização e limpeza da área?'
  ],

  'Canteiro/Área Operacional': [
    'O acesso ao canteiro/área é controlado e identificado?',
    'O layout do canteiro está de acordo com o planejado, conforme o PGR da obra e o plano de canteiro?',
    'As instalações provisórias (elétrica, água, esgoto) estão em condições seguras?',
    'As áreas de vivência atendem às condições mínimas de conforto e higiene exigidas pela NR-18?',
    'A sinalização geral do canteiro está visível e atualizada?',
    'Os tapumes, fechamentos e proteções de perímetro estão íntegros?',
    'Existe controle de acesso de veículos e pedestres na área operacional?',
    'As condições de armazenamento de materiais no canteiro são adequadas e organizadas?',
    'As áreas de circulação interna do canteiro estão sinalizadas e desobstruídas?',
    'Existe Programa de Gerenciamento de Riscos (PGR) da obra disponível e atualizado no canteiro?',
    'As instalações elétricas provisórias do canteiro possuem proteção e aterramento adequados?',
    'Os acessos verticais (escadas, rampas) do canteiro estão em condições seguras de uso?',
    'Existe controle de terceiros e visitantes quanto ao uso de EPI dentro do canteiro?',
    'As áreas de risco (escavações, aberturas, bordas) estão isoladas e sinalizadas?',
    'Os equipamentos de proteção coletiva do canteiro (guarda-corpo, redes, plataformas) estão instalados corretamente?',
    'Existe local apropriado e seguro para carga e descarga de materiais?',
    'As instalações sanitárias do canteiro estão em quantidade compatível com o número de trabalhadores?',
    'A movimentação de veículos e máquinas dentro do canteiro segue plano de tráfego definido?',
    'Os resíduos gerados na obra são segregados e destinados conforme plano de gerenciamento de resíduos?',
    'Existe integração de segurança para novos trabalhadores e terceiros antes do ingresso no canteiro?'
  ],

  'Outra inspeção específica': []
};

function novoItemChecklist(texto) {
  return {
    id: uuid(),
    texto: texto,
    resposta: '', // 'Conforme' | 'Não Conforme' | 'Não se Aplica'
    observacao: '',
    medida: '',
    photoIds: [],
    personalizado: false
  };
}

function gerarChecklistParaTipo(tipo) {
  const itens = CHECKLISTS[tipo] || [];
  return itens.map((texto) => novoItemChecklist(texto));
}
