/*
 * Modelos prontos de PGR. Cada modelo devolve o conteúdo de "data" de um PGR
 * (GHEs, perigos com avaliação e plano de ação, treinamentos e emergência),
 * para o usuário partir de um documento já estruturado e só ajustar.
 *
 * Modelo "Obras de terraplenagem": revisão 01 do PGR de terraplenagem
 * (CNAE 43.13-4-00), atualizado à NR-01 vigente — inclui fatores de risco
 * psicossociais (Portaria MTE nº 1.419/2024) e corrige a avaliação da
 * versão de 2022 (ruído acima do limite, severidade de queda de altura,
 * riscos não identificados e ausência de plano de ação).
 */

const PRAZO_POR_NIVEL_PGR = { 'Crítico': 7, 'Alto': 30, 'Moderado': 90, 'Baixo': 180 };

function somarDiasISO(iso, dias) {
  const [a, m, d] = iso.split('-').map(Number);
  const dt = new Date(a, m - 1, d + dias);
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

/* ---------- Catálogo de perigos do modelo de terraplenagem ---------- */
const JORNADA_TERRAPLENAGEM = 'Até 9 h/dia (seg. a qui.) e 8 h (sex.)';

const PERIGOS_TERRAPLENAGEM = {
  ruido: {
    tipoRisco: 'Físico',
    perigo: 'Ruído contínuo/intermitente',
    fonte: 'Motores de máquinas pesadas, caminhões e equipamentos do canteiro',
    lesaoAgravo: 'Perda auditiva induzida por ruído (PAIR), zumbido, alterações do sono e estresse',
    tipoExposicao: 'Intermitente',
    referencia: 'NR-15, Anexo 1: limite de tolerância 85 dB(A) para 8 h; nível de ação 80 dB(A) (dose 0,5), conforme NR-09 e NHO-01',
    medidasExistentes: 'Protetor auricular tipo plug (NRRsf 16 dB)',
    severidade: 4,
    medidasPropostas: 'Implantar Programa de Conservação Auditiva (PCA) integrado ao PCMSO, com audiometrias; manutenção de escapamentos e silenciadores das máquinas; manter os trabalhadores afastados das fontes quando possível; revisar a escolha do protetor auricular pela atenuação necessária; realizar dosimetria (NHO-01) em todos os GHEs de campo.',
    responsavel: 'SESMT e gestor da obra',
    acompanhamento: 'Nova dosimetria após as medidas; resultados das audiometrias do PCMSO; inspeção mensal do uso do protetor auricular.'
  },
  silica: {
    tipoRisco: 'Químico',
    perigo: 'Poeira mineral contendo sílica cristalina (quartzo)',
    fonte: 'Escavação, carga, transporte e espalhamento de solo; tráfego em vias não pavimentadas; corte de blocos e concreto',
    lesaoAgravo: 'Silicose, câncer de pulmão (sílica cristalina: LINACH Grupo 1), DPOC e irritação das vias respiratórias',
    tipoExposicao: 'Intermitente',
    referencia: 'NR-15, Anexo 12: limite de tolerância em função do teor de quartzo (fração respirável = 8 ÷ (% quartzo + 2) mg/m³); nível de ação = 50% do limite (NR-09). Referência complementar: ACGIH, 0,025 mg/m³ (sílica cristalina respirável)',
    medidasExistentes: 'Máscara de proteção (tipo e CA não especificados)',
    severidade: 4,
    medidasPropostas: 'Umectação das vias e das frentes de escavação (caminhão-pipa); cabines fechadas, com filtro, nas máquinas; corte de blocos a úmido ou com aspiração; Programa de Proteção Respiratória (Fundacentro) com respirador PFF2 com CA, ensaio de vedação e controle de barba; avaliação quantitativa da fração respirável com determinação do teor de quartzo em todos os GHEs de campo; exames de imagem do tórax e espirometria conforme o PCMSO.',
    responsavel: 'SESMT e gestor da obra',
    acompanhamento: 'Avaliação quantitativa semestral; registro diário da umectação; resultados dos exames do PCMSO.'
  },
  calor: {
    tipoRisco: 'Físico',
    perigo: 'Calor e radiação solar (trabalho a céu aberto)',
    fonte: 'Exposição ao sol durante a jornada, associada a esforço físico',
    lesaoAgravo: 'Exaustão térmica, desidratação, insolação; queimaduras e câncer de pele pela radiação ultravioleta',
    tipoExposicao: 'Contínua',
    referencia: 'NR-15, Anexo 3 e NR-09, Anexo III (IBUTG, conforme NHO-06)',
    medidasExistentes: 'Não informadas na versão anterior',
    severidade: 3,
    medidasPropostas: 'Avaliar o calor pelo IBUTG (NHO-06); água potável e fresca próxima às frentes de serviço; pausas em local sombreado e tarefas pesadas nos horários mais frescos; protetor solar, roupa de manga longa e proteção de cabeça e nuca; orientar sobre os sinais de estresse térmico.',
    responsavel: 'SESMT e gestor da obra',
    acompanhamento: 'Laudo de IBUTG; inspeção semanal dos pontos de hidratação e de sombra.'
  },
  cargas: {
    tipoRisco: 'Ergonômico',
    perigo: 'Levantamento e transporte manual de cargas; posturas forçadas (agachamento, flexão de tronco)',
    fonte: 'Transporte de sacos de cimento, blocos, formas e ferramentas; assentamento de piso',
    lesaoAgravo: 'Lombalgia, hérnia de disco, LER/DORT e fadiga muscular',
    tipoExposicao: 'Intermitente',
    referencia: 'NR-17: avaliação ergonômica preliminar (AEP) e item 17.5 (levantamento, transporte e descarga individual de cargas)',
    medidasExistentes: 'Cinta ergonômica (não é medida de prevenção reconhecida nem EPI com CA)',
    severidade: 3,
    medidasPropostas: 'Realizar a AEP (NR-17) e, se indicado, a AET; disponibilizar meios mecânicos (carrinhos, girica, paleteira, minicarregadeira); limitar e fracionar o peso das cargas; revezamento e pausas; treinamento em levantamento e transporte de cargas; deixar de considerar a cinta ergonômica como medida de controle.',
    responsavel: 'SESMT (AEP) e gestor da obra (meios mecânicos)',
    acompanhamento: 'AEP concluída e arquivada; verificação mensal da disponibilidade dos meios mecânicos; queixas osteomusculares registradas no PCMSO.'
  },
  sentado: {
    tipoRisco: 'Ergonômico',
    perigo: 'Postura sentada prolongada, jornada extensa e atenção contínua na condução',
    fonte: 'Condução de caminhões, carretas e máquinas pesadas',
    lesaoAgravo: 'Lombalgia, fadiga, sonolência e distúrbios circulatórios',
    tipoExposicao: 'Contínua',
    referencia: 'NR-17; Lei nº 13.103/2015 (jornada e descanso do motorista profissional)',
    medidasExistentes: 'Não informadas na versão anterior',
    severidade: 3,
    medidasPropostas: 'Incluir os postos na AEP; assentos com regulagem e suspensão em bom estado; controle de jornada, pausas e descanso; rodízio de tarefas quando possível.',
    responsavel: 'Gestor de frota e equipamentos e SESMT',
    acompanhamento: 'Registros de jornada; item "assento" no check list diário do equipamento.'
  },
  vci: {
    tipoRisco: 'Físico',
    perigo: 'Vibração de corpo inteiro (VCI)',
    fonte: 'Operação de máquinas e condução de veículos em terreno irregular',
    lesaoAgravo: 'Lombalgia e alterações da coluna vertebral',
    tipoExposicao: 'Contínua',
    referencia: 'NR-15, Anexo 8 e NR-09, Anexo I (NHO-09): nível de ação aren 0,5 m/s² ou VDVR 9,1 m/s1,75; limite aren 1,1 m/s² ou VDVR 21,0 m/s1,75',
    medidasExistentes: 'Assento do próprio equipamento',
    severidade: 3,
    medidasPropostas: 'Avaliar a VCI quantitativamente (NHO-09); manutenção dos assentos e das suspensões; manutenção das vias internas do canteiro; controle de velocidade.',
    responsavel: 'SESMT e gestor de frota e equipamentos',
    acompanhamento: 'Laudo de VCI; registros de manutenção das vias e dos equipamentos.'
  },
  queda: {
    tipoRisco: 'Acidente',
    perigo: 'Queda de pessoa de nível diferente (acima de 2 m)',
    fonte: 'Bordas de taludes, valas e escavações; acesso a caçambas e carrocerias; montagem de formas e escoramentos',
    lesaoAgravo: 'Fraturas, traumatismo craniano, politraumatismo e óbito',
    tipoExposicao: 'Eventual',
    referencia: 'NR-35 (trabalho em altura); NR-18 (proteção de bordas e aberturas)',
    medidasExistentes: 'Cinto de segurança tipo paraquedista e linha de vida',
    severidade: 5,
    medidasPropostas: 'Proteção coletiva de bordas (guarda-corpo, sinalização e afastamento de taludes); análise de risco e permissão de trabalho (NR-35); capacitação NR-35 e aptidão registrada no ASO; pontos de ancoragem dimensionados; escadas de acesso a caçambas e carrocerias.',
    responsavel: 'Gestor da obra e SESMT',
    acompanhamento: 'Permissões de trabalho emitidas; inspeções de campo semanais; certificados NR-35 válidos.'
  },
  atropelamento: {
    tipoRisco: 'Acidente',
    perigo: 'Atropelamento e esmagamento por máquinas e veículos em movimento',
    fonte: 'Pedestres nas frentes de serviço com máquinas pesadas e caminhões (pontos cegos, manobras de ré)',
    lesaoAgravo: 'Esmagamento, fraturas, politraumatismo e óbito',
    tipoExposicao: 'Intermitente',
    referencia: 'NR-18 (circulação no canteiro); NR-12, Anexo XII (máquinas autopropelidas)',
    medidasExistentes: 'Não informadas na versão anterior',
    severidade: 5,
    medidasPropostas: 'Plano de circulação com separação entre pedestres e máquinas; sinaleiro nas manobras; alarme sonoro de ré e espelhos ou câmeras; colete refletivo; proibir permanência no raio de ação das máquinas; DDS sobre pontos cegos.',
    responsavel: 'Gestor da obra e SESMT',
    acompanhamento: 'Plano de circulação aprovado; inspeção semanal dos alarmes de ré; registro e análise de quase acidentes.'
  },
  colisao: {
    tipoRisco: 'Acidente',
    perigo: 'Colisão, tombamento ou capotamento de veículo ou máquina',
    fonte: 'Tráfego em vias públicas e no canteiro; operação em taludes, aterros e solo instável; carga e descarga em terreno irregular',
    lesaoAgravo: 'Fraturas, politraumatismo e óbito; danos a terceiros',
    tipoExposicao: 'Contínua',
    referencia: 'Código de Trânsito Brasileiro; Lei nº 13.103/2015; NR-11; NR-12, Anexo XII; NR-18',
    medidasExistentes: 'Cinto de segurança; check list do equipamento',
    severidade: 5,
    medidasPropostas: 'Manutenção preventiva com registro; estrutura de proteção na capotagem (ROPS/FOPS) nas máquinas; capacitação de operadores (NR-11/NR-12) e direção defensiva para motoristas; limite de velocidade no canteiro; controle de jornada e descanso; inspeção de taludes e bordas antes da operação.',
    responsavel: 'Gestor de frota e equipamentos',
    acompanhamento: 'Cumprimento do plano de manutenção; certificados de capacitação; indicadores de incidentes de trânsito.'
  },
  soterramento: {
    tipoRisco: 'Acidente',
    perigo: 'Soterramento por desmoronamento de taludes ou paredes de valas',
    fonte: 'Trabalho em escavações e valas, especialmente acima de 1,25 m de profundidade',
    lesaoAgravo: 'Asfixia, esmagamento e óbito',
    tipoExposicao: 'Eventual',
    referencia: 'NR-18 (escavações, fundações e desmonte de rochas)',
    medidasExistentes: 'Não informadas na versão anterior',
    severidade: 5,
    medidasPropostas: 'Taludamento ou escoramento das escavações definido por profissional legalmente habilitado; inspeção diária das escavações; afastar materiais e máquinas das bordas; escada de acesso e saída; proibir a entrada em vala sem liberação.',
    responsavel: 'Engenharia (responsável técnico) e gestor da obra',
    acompanhamento: 'Projeto ou avaliação das escavações; check list diário de escavação.'
  },
  peconhentos: {
    tipoRisco: 'Acidente',
    perigo: 'Contato com animais peçonhentos (cobras, escorpiões, aranhas, abelhas)',
    fonte: 'Limpeza de terreno, vegetação e entulho; frentes de escavação',
    lesaoAgravo: 'Envenenamento, reações alérgicas graves e óbito',
    tipoExposicao: 'Eventual',
    referencia: 'NR-18 (ordem e limpeza do canteiro)',
    medidasExistentes: 'Botina de segurança',
    severidade: 4,
    medidasPropostas: 'Inspeção e limpeza das áreas antes do início dos serviços; perneira e luvas na limpeza de terreno; orientação em DDS; identificar o hospital de referência com soro antiveneno.',
    responsavel: 'Gestor da obra e SESMT',
    acompanhamento: 'Registros de DDS; inspeção antes da tarefa.'
  },
  serra: {
    tipoRisco: 'Acidente',
    perigo: 'Corte e amputação em serra circular de bancada e ferramentas manuais',
    fonte: 'Confecção de formas de madeira',
    lesaoAgravo: 'Cortes, amputação de dedos, projeção de partículas nos olhos',
    tipoExposicao: 'Intermitente',
    referencia: 'NR-12 (máquinas e equipamentos); NR-18 (serra circular: coifa, cutelo divisor e empurrador)',
    medidasExistentes: 'Não informadas na versão anterior',
    severidade: 4,
    medidasPropostas: 'Serra circular com coifa, cutelo divisor, empurrador e dispositivo de parada; inspeção NR-12; óculos e protetor facial; capacitação do operador da serra.',
    responsavel: 'Gestor da obra e SESMT',
    acompanhamento: 'Inspeção mensal da serra; Ficha de EPI; certificado de capacitação.'
  },
  intertravado: {
    tipoRisco: 'Acidente',
    perigo: 'Prensamento de mãos e projeção de partículas no assentamento e no corte de blocos',
    fonte: 'Manuseio de blocos intertravados, uso de cortadora de blocos e martelo de borracha',
    lesaoAgravo: 'Esmagamento de dedos, cortes e lesões oculares',
    tipoExposicao: 'Contínua',
    referencia: 'NR-12 (máquinas e equipamentos); NR-06 (EPI)',
    medidasExistentes: 'Não informadas na versão anterior',
    severidade: 3,
    medidasPropostas: 'Luvas de proteção mecânica; óculos e protetor facial no corte; cortadora com proteção do disco e dispositivo de parada; capacitação para uso da cortadora.',
    responsavel: 'Gestor da obra e SESMT',
    acompanhamento: 'Inspeção da cortadora; Ficha de EPI.'
  },
  psicoCampo: {
    tipoRisco: 'Psicossocial',
    perigo: 'Fatores de risco psicossociais: ritmo intenso, pressão por prazos, baixa autonomia e exposição às intempéries',
    fonte: 'Organização do trabalho na frente de obra',
    lesaoAgravo: 'Estresse ocupacional, ansiedade, depressão, esgotamento profissional (burnout) e aumento do risco de acidentes',
    tipoExposicao: 'Contínua',
    referencia: 'NR-01, item 1.5.3.1.4 (Portaria MTE nº 1.419/2024); NR-17; Guia de Informações sobre os Fatores de Riscos Psicossociais (MTE)',
    medidasExistentes: 'Não identificadas na versão anterior',
    severidade: 3,
    medidasPropostas: 'Avaliar os fatores psicossociais com participação dos trabalhadores (questionário validado e entrevistas ou grupos); canal de escuta e de denúncia de assédio com sigilo; planejamento realista de prazos e dimensionamento das equipes; capacitação das lideranças; acompanhar no PCMSO os afastamentos por transtornos mentais.',
    responsavel: 'RH, Diretoria e SESMT',
    acompanhamento: 'Relatório da avaliação psicossocial com plano específico; indicadores de absenteísmo e afastamentos; reavaliação anual.'
  },
  psicoGestao: {
    tipoRisco: 'Psicossocial',
    perigo: 'Fatores de risco psicossociais: sobrecarga, alta responsabilidade, cobrança por metas e prazos, jornada estendida e conflitos',
    fonte: 'Gestão de equipes, contratos e prazos da obra',
    lesaoAgravo: 'Estresse ocupacional, ansiedade, depressão e esgotamento profissional (burnout)',
    tipoExposicao: 'Contínua',
    referencia: 'NR-01, item 1.5.3.1.4 (Portaria MTE nº 1.419/2024); NR-17; Guia de Informações sobre os Fatores de Riscos Psicossociais (MTE)',
    medidasExistentes: 'Não identificadas na versão anterior',
    severidade: 3,
    medidasPropostas: 'Incluir os cargos de gestão na avaliação dos fatores psicossociais; definir metas e prazos factíveis; controlar a jornada; capacitação em liderança e prevenção do assédio; canal de escuta com sigilo.',
    responsavel: 'RH, Diretoria e SESMT',
    acompanhamento: 'Relatório da avaliação psicossocial; controle de horas extras; reavaliação anual.'
  },
  psicoConducao: {
    tipoRisco: 'Psicossocial',
    perigo: 'Fatores de risco psicossociais: jornada extensa, trabalho isolado, trânsito e pressão por produtividade',
    fonte: 'Condução de veículos e operação de máquinas com metas de produção',
    lesaoAgravo: 'Estresse ocupacional, fadiga mental, ansiedade e aumento do risco de acidentes',
    tipoExposicao: 'Contínua',
    referencia: 'NR-01, item 1.5.3.1.4 (Portaria MTE nº 1.419/2024); NR-17; Lei nº 13.103/2015',
    medidasExistentes: 'Não identificadas na versão anterior',
    severidade: 3,
    medidasPropostas: 'Incluir motoristas e operadores na avaliação dos fatores psicossociais; respeitar jornada, pausas e descanso; metas de produção compatíveis com a segurança; canal de escuta com sigilo.',
    responsavel: 'RH, gestor de frota e SESMT',
    acompanhamento: 'Relatório da avaliação psicossocial; registros de jornada; reavaliação anual.'
  }
};

/* Resultados de medição registrados na versão de 2022, por função. */
const MEDICOES_TERRAPLENAGEM = {
  'Servente|ruido': 'NE = 85,79 dB(A): ACIMA do limite de tolerância de 85 dB(A)',
  'Operador de máquinas|ruido': 'NE = 80,0 dB(A): igual ao nível de ação',
  'Servente|silica': '0,48 mg/m³ (o laudo não informa a fração nem o teor de quartzo; confirmar)',
  'Operador de máquinas|silica': '0,196 mg/m³ (o laudo não informa a fração nem o teor de quartzo; confirmar)'
};

/* Funções (GHEs), atividades e perigos com a probabilidade avaliada (1 a 5). */
const GHES_TERRAPLENAGEM = [
  { nome: 'GHE 01 — Pedreiro e meio-oficial de pedreiro', funcao: 'Meio-oficial de pedreiro / Pedreiro',
    atividades: 'Execução de alvenaria de apoio, caixas de passagem e de drenagem, assentamento de tubos em valas, preparo e lançamento de argamassa e concreto.',
    perigos: { ruido: 2, silica: 2, calor: 3, cargas: 3, queda: 2, atropelamento: 2, soterramento: 2, peconhentos: 2, psicoCampo: 2 } },
  { nome: 'GHE 02 — Apontador', funcao: 'Apontador',
    atividades: 'Controle de produção, apontamento de horas de máquinas e de viagens de caminhões nas frentes de serviço.',
    perigos: { ruido: 2, silica: 2, calor: 3, queda: 1, atropelamento: 2, psicoCampo: 2 } },
  { nome: 'GHE 03 — Carpinteiro', funcao: 'Carpinteiro',
    atividades: 'Confecção e montagem de formas e escoramentos de madeira para drenagem e obras de arte; uso de serra circular e ferramentas manuais.',
    perigos: { ruido: 2, silica: 2, calor: 3, cargas: 3, queda: 2, serra: 2, atropelamento: 2, peconhentos: 2, psicoCampo: 2 } },
  { nome: 'GHE 04 — Calceteiro', funcao: 'Calceteiro',
    atividades: 'Preparo da base e assentamento de pavimento com blocos intertravados; corte de blocos com cortadora; rejuntamento e compactação.',
    perigos: { ruido: 2, silica: 3, calor: 3, cargas: 4, intertravado: 3, atropelamento: 2, peconhentos: 2, psicoCampo: 2 } },
  { nome: 'GHE 05 — Encarregado de turma', funcao: 'Encarregado de turma',
    atividades: 'Coordenação das equipes de campo, distribuição de tarefas, liberação de frentes de serviço e acompanhamento da execução.',
    perigos: { ruido: 2, silica: 2, calor: 3, queda: 1, atropelamento: 2, soterramento: 1, psicoGestao: 2 } },
  { nome: 'GHE 06 — Diretor', funcao: 'Diretor',
    atividades: 'Gestão administrativa e contratual, com visitas eventuais às frentes de obra.',
    perigos: { ruido: 1, silica: 1, calor: 1, atropelamento: 1, psicoGestao: 2 } },
  { nome: 'GHE 07 — Engenheiro', funcao: 'Engenheiro',
    atividades: 'Planejamento, acompanhamento técnico da execução, liberação de escavações e medições nas frentes de serviço.',
    perigos: { ruido: 1, silica: 1, calor: 1, queda: 1, atropelamento: 1, psicoGestao: 2 } },
  { nome: 'GHE 08 — Motorista de caminhão', funcao: 'Motorista de caminhão',
    atividades: 'Transporte de solo, agregados e materiais em caminhão basculante, no canteiro e em vias públicas; carga e descarga.',
    perigos: { ruido: 2, silica: 2, vci: 3, sentado: 3, colisao: 2, psicoConducao: 3 } },
  { nome: 'GHE 09 — Motorista de carreta', funcao: 'Motorista de carreta',
    atividades: 'Transporte de máquinas e materiais em carreta, em vias públicas e no canteiro; amarração e descarga.',
    perigos: { ruido: 2, silica: 2, vci: 3, sentado: 3, colisao: 2, psicoConducao: 3 } },
  { nome: 'GHE 10 — Operador de máquinas', funcao: 'Operador de máquinas',
    atividades: 'Operação de escavadeira, pá carregadeira, motoniveladora, retroescavadeira e rolo compactador em escavação, carga, espalhamento e compactação de solo.',
    perigos: { ruido: 2, silica: 3, vci: 3, sentado: 3, colisao: 2, psicoConducao: 2 } },
  { nome: 'GHE 11 — Servente', funcao: 'Servente',
    atividades: 'Apoio às equipes: transporte manual de materiais, limpeza de terreno, abertura manual de valas, sinalização de frentes e auxílio às máquinas.',
    perigos: { ruido: 3, silica: 3, calor: 3, cargas: 3, queda: 2, atropelamento: 2, soterramento: 2, peconhentos: 2, psicoCampo: 2 } },
  { nome: 'GHE 12 — Supervisor', funcao: 'Supervisor',
    atividades: 'Supervisão de várias frentes de serviço e de encarregados, com permanência parcial em campo.',
    perigos: { ruido: 1, silica: 1, calor: 1, atropelamento: 1, psicoGestao: 2 } },
  { nome: 'GHE 13 — Técnico de segurança do trabalho', funcao: 'Técnico de segurança do trabalho',
    atividades: 'Inspeções de segurança, DDS, emissão de permissões de trabalho, acompanhamento de atividades críticas e investigação de ocorrências.',
    perigos: { ruido: 2, silica: 2, calor: 3, queda: 1, atropelamento: 2, psicoGestao: 2 } },
  { nome: 'GHE 14 — Topógrafo', funcao: 'Topógrafo',
    atividades: 'Levantamentos topográficos, locação e marcação de cotas nas frentes de serviço, inclusive próximo a máquinas e taludes.',
    perigos: { ruido: 2, silica: 2, calor: 3, queda: 1, atropelamento: 2, soterramento: 1, peconhentos: 2, psicoCampo: 2 } }
];

/* Probabilidade residual esperada após as medidas propostas. */
function probabilidadeResidualTerraplenagem(chave, prob) {
  if (prob <= 1) return 1;
  if (chave === 'silica' && prob >= 3) return 2;
  if (['cargas', 'sentado', 'vci', 'calor'].includes(chave)) return 2;
  return 1;
}

function treinamentosTerraplenagem(base) {
  const t = (nome, cargaHoraria, periodicidade, responsavel, dias) => ({
    id: uuid(), nome, gheId: '', cargaHoraria: String(cargaHoraria), periodicidade, responsavel,
    dataPrevista: somarDiasISO(base, dias), status: 'Pendente'
  });
  return [
    t('Integração de segurança e treinamento admissional (NR-18) — todos os GHEs', 4, 'Admissional', 'SESMT', 30),
    t('NR-35 — Trabalho em altura (GHEs 01, 02, 03, 05, 07, 11, 13 e 14)', 8, 'Bienal', 'SESMT / instrutor qualificado', 30),
    t('Escavações e prevenção de soterramento — NR-18 (GHEs 01, 05, 11 e 14)', 4, 'Anual', 'Engenharia e SESMT', 30),
    t('Prevenção de atropelamento e circulação no canteiro (todos os GHEs de campo)', 2, 'Anual', 'SESMT', 30),
    t('Operação segura de máquinas autopropelidas — NR-11/NR-12 (GHE 10)', 16, 'Quando houver mudança', 'Gestor de frota e equipamentos', 60),
    t('Direção defensiva e jornada do motorista — Lei 13.103/2015 (GHEs 08 e 09)', 8, 'Anual', 'Gestor de frota e equipamentos', 60),
    t('Segurança em máquinas — serra circular e cortadora de blocos, NR-12 (GHEs 03 e 04)', 4, 'Quando houver mudança', 'SESMT', 60),
    t('Uso, guarda e conservação de EPI; proteção auditiva (PCA) e respiratória (PPR) — NR-06 (todos os GHEs de campo)', 2, 'Anual', 'SESMT', 60),
    t('Levantamento e transporte manual de cargas — NR-17 (GHEs 01, 03, 04 e 11)', 2, 'Anual', 'SESMT', 90),
    t('Calor e radiação solar: prevenção e primeiros sinais (todos os GHEs de campo)', 1, 'Anual', 'SESMT', 90),
    t('Fatores de risco psicossociais, liderança e prevenção do assédio (GHEs 05, 06, 07, 12 e 13)', 4, 'Anual', 'RH e SESMT', 90),
    t('Primeiros socorros e resposta a emergências (equipe designada)', 8, 'Anual', 'SESMT', 60)
  ];
}

const MODELOS_PGR = [
  {
    id: 'terraplenagem',
    nome: 'Obras de terraplenagem (revisão conforme a NR-01 vigente)',
    descricao: '14 GHEs, inventário com fatores psicossociais, plano de ação, treinamentos e emergência.',
    criar(base) {
      const ghes = [];
      const perigos = [];
      GHES_TERRAPLENAGEM.forEach((g) => {
        const ghe = { id: uuid(), nome: g.nome, setor: 'Obra / frentes de serviço', funcao: g.funcao, numTrabalhadores: '', descricaoAtividades: g.atividades };
        ghes.push(ghe);
        Object.entries(g.perigos).forEach(([chave, prob]) => {
          const h = PERIGOS_TERRAPLENAGEM[chave];
          const medicao = MEDICOES_TERRAPLENAGEM[`${g.funcao}|${chave}`];
          const nivel = classificarRiscoPGR(h.severidade, prob).nivel;
          const probRes = probabilidadeResidualTerraplenagem(chave, prob);
          const semMedidas = h.medidasExistentes.startsWith('Não');
          const manter = nivel === 'Baixo' && !semMedidas;
          perigos.push({
            id: uuid(),
            gheId: ghe.id,
            perigo: h.perigo,
            fonte: h.fonte,
            lesaoAgravo: h.lesaoAgravo,
            tipoExposicao: h.tipoExposicao,
            tempoExposicao: h.tipoExposicao === 'Eventual' ? 'Eventual, conforme a atividade' : JORNADA_TERRAPLENAGEM,
            tipoRisco: h.tipoRisco,
            referencia: h.referencia,
            tipoAvaliacao: medicao ? 'Quantitativa' : 'Qualitativa',
            resultadoAvaliacao: medicao || (['ruido', 'silica', 'calor', 'vci'].includes(chave)
              ? 'Sem medição. Exposição estimada qualitativamente; avaliação quantitativa prevista no plano de ação.'
              : (h.tipoRisco === 'Psicossocial' ? 'Identificação preliminar; aplicar instrumento de avaliação com participação dos trabalhadores.' : 'Avaliação qualitativa em campo.')),
            severidade: String(h.severidade),
            probabilidade: String(prob),
            medidasExistentes: h.medidasExistentes,
            medidasPropostas: manter ? 'Manter as medidas existentes durante a permanência em campo e acompanhar nas inspeções periódicas.' : h.medidasPropostas,
            tipoMedida: manter ? 'Manter' : (semMedidas ? 'Introduzir' : 'Aprimorar'),
            severidadeResidual: String(h.severidade),
            probabilidadeResidual: String(probRes),
            responsavel: h.responsavel,
            prazo: somarDiasISO(base, PRAZO_POR_NIVEL_PGR[nivel] || 90),
            acompanhamento: h.acompanhamento,
            status: 'Pendente'
          });
        });
      });
      return {
        empresa: '',
        unidade: 'Duque de Caxias',
        cnpj: '',
        cnae: '43.13-4-00',
        atividadePrincipal: 'Obras de terraplenagem',
        grauRisco: '3',
        endereco: '',
        regimeTrabalho: 'Segunda a quinta-feira: 07h às 17h; sexta-feira: 07h às 16h; intervalo para refeição das 12h às 13h (44 h semanais).',
        responsavelPGR: '',
        dataElaboracao: base,
        proximaRevisao: somarDiasISO(base, 730),
        revisoes: [
          { id: uuid(), revisao: '00', motivo: 'Emissão original', data: '2022-01-07' },
          { id: uuid(), revisao: '01', motivo: 'Revisão geral para adequação à NR-01 vigente: inclusão dos fatores de risco psicossociais (Portaria MTE nº 1.419/2024), correção da matriz e do inventário de riscos, inclusão de riscos não identificados, plano de ação, cronograma de treinamentos e preparação para emergências.', data: base }
        ],
        caracterizacaoAmbiente: 'Obras de terraplenagem executadas a céu aberto: limpeza de terreno, escavação, carga, transporte e espalhamento de solo, compactação, execução de drenagem e valas, pavimentação com blocos intertravados, formas de madeira e alvenaria de apoio. Uso de máquinas pesadas (escavadeira, pá carregadeira, motoniveladora, retroescavadeira e rolo compactador — confirmar a relação), caminhões basculantes e carretas, com circulação em vias internas não pavimentadas e em vias públicas. Instalações de apoio do canteiro: descrever escritório, vestiário, sanitários e local de refeições.',
        consultaTrabalhadores: 'Registrar aqui como foi feita a consulta aos trabalhadores e à CIPA (ou ao nomeado) sobre a percepção dos riscos: datas, participantes e principais contribuições.',
        ghes,
        perigos,
        treinamentos: treinamentosTerraplenagem(base),
        emergencia: {
          meiosPrimeirosSocorros: 'Kit de primeiros socorros em cada frente de serviço e nos veículos de apoio; trabalhadores capacitados em primeiros socorros em todos os turnos; contatos de emergência afixados (SAMU 192, Corpo de Bombeiros 193) e hospital de referência com atendimento de trauma e soro antiveneno (informar nome, endereço e rota); veículo disponível para remoção quando não houver socorro especializado.',
          procedimentoAbandono: 'Ao sinal de alarme (sirene ou rádio), interromper as atividades, desligar e afastar máquinas das bordas de escavações, seguir até o ponto de encontro sinalizado e aguardar a contagem pelo encarregado; acesso de socorro mantido sempre desobstruído.',
          medidasGrandeMagnitude: 'Cenários: soterramento em vala, tombamento de máquina, colisão grave em via pública, incêndio em máquina ou tanque de combustível e vazamento de óleo ou combustível. Acionar 193/192, isolar a área, não entrar em vala sem escoramento para resgate, usar extintor apenas em princípio de incêndio, conter vazamentos com kit de mitigação e comunicar a diretoria e o SESMT.',
          periodicidadeExercicios: 'Anual'
        },
        exerciciosSimulados: [],
        assinaturas: { responsavelPGR: '' }
      };
    }
  }
];
