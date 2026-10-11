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

/* ---------- Catálogo de perigos (base comum, usada também pelos demais modelos) ---------- */
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
    fonte: 'Organização do trabalho nas frentes operacionais',
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


/* ======================= Construção civil — edificações (NR-18) ======================= */
const PERIGOS_NR18 = {
  ruidoObra: Object.assign({}, PERIGOS_TERRAPLENAGEM.ruido, {
    fonte: 'Betoneira, serra circular, policorte, marteletes, vibradores de concreto e grua'
  }),
  silicaObra: Object.assign({}, PERIGOS_TERRAPLENAGEM.silica, {
    fonte: 'Corte e desbaste de alvenaria, concreto e revestimentos; lixamento; preparo de argamassa e concreto',
    medidasPropostas: 'Corte a úmido ou com ferramentas com aspiração; lixamento com aspiração; varrição úmida; Programa de Proteção Respiratória com PFF2 com CA e ensaio de vedação; avaliação quantitativa da fração respirável com teor de quartzo nas tarefas de corte; exames do PCMSO.'
  }),
  quedaEdificacao: {
    tipoRisco: 'Acidente',
    perigo: 'Queda de pessoa de nível diferente (periferia, lajes, aberturas, andaimes e telhados)',
    fonte: 'Trabalho na periferia da edificação, em lajes, poços de elevador, aberturas no piso, andaimes, plataformas e coberturas',
    lesaoAgravo: 'Fraturas, traumatismo craniano, politraumatismo e óbito',
    tipoExposicao: 'Intermitente',
    referencia: 'NR-18 (sistemas de proteção coletiva contra quedas, andaimes e plataformas); NR-35 (trabalho em altura)',
    medidasExistentes: 'Cinto de segurança tipo paraquedista',
    severidade: 5,
    medidasPropostas: 'Projetos e instalação dos sistemas de proteção coletiva contra quedas (guarda-corpo com rodapé, fechamento de aberturas, redes e telas); andaimes montados conforme projeto e inspecionados antes do uso; SPIQ com projeto e pontos de ancoragem; análise de risco e permissão de trabalho; capacitação NR-35 e aptidão registrada no ASO; plano de resgate em altura.',
    responsavel: 'Engenharia da obra e SESMT',
    acompanhamento: 'Check list semanal das proteções coletivas; registro de inspeção dos andaimes; permissões de trabalho emitidas.'
  },
  quedaMateriais: {
    tipoRisco: 'Acidente',
    perigo: 'Queda de materiais, ferramentas e objetos sobre pessoas',
    fonte: 'Serviços em pavimentos superiores, fachadas e içamento de cargas',
    lesaoAgravo: 'Traumatismo craniano, fraturas e óbito',
    tipoExposicao: 'Intermitente',
    referencia: 'NR-18 (plataformas de proteção, telas de fachada, movimentação e içamento de materiais)',
    medidasExistentes: 'Capacete de segurança',
    severidade: 5,
    medidasPropostas: 'Plataformas de proteção (bandejas) e telas na fachada; isolamento e sinalização das áreas sob serviços e sob içamento; amarração de ferramentas em altura; capacete com jugular; organização e limpeza dos pavimentos.',
    responsavel: 'Engenharia da obra e SESMT',
    acompanhamento: 'Inspeção semanal das bandejas e telas; registro de isolamento das áreas de içamento.'
  },
  choqueEletrico: {
    tipoRisco: 'Acidente',
    perigo: 'Choque elétrico em instalações temporárias e ferramentas elétricas',
    fonte: 'Quadros de distribuição provisórios, extensões, ferramentas portáteis, betoneira e serra; trabalho próximo a redes aéreas',
    lesaoAgravo: 'Queimaduras, parada cardiorrespiratória e óbito',
    tipoExposicao: 'Intermitente',
    referencia: 'NR-10 (segurança em instalações elétricas); NR-18 (instalações elétricas temporárias conforme projeto)',
    medidasExistentes: 'Não informadas',
    severidade: 5,
    medidasPropostas: 'Projeto elétrico das instalações temporárias por profissional legalmente habilitado; dispositivo DR e aterramento; quadros fechados e sinalizados; extensões e plugues adequados; serviços elétricos somente por trabalhador capacitado e autorizado (NR-10); bloqueio e etiquetagem na manutenção.',
    responsavel: 'Engenharia da obra (projeto elétrico) e SESMT',
    acompanhamento: 'Teste mensal do DR; inspeção dos quadros e das ferramentas; registro de autorização dos eletricistas.'
  },
  serraBetoneira: {
    tipoRisco: 'Acidente',
    perigo: 'Corte, amputação e esmagamento em serra circular, policorte e betoneira',
    fonte: 'Corte de madeira e de materiais; preparo de concreto e argamassa',
    lesaoAgravo: 'Cortes, amputação de dedos ou membros, projeção de partículas nos olhos',
    tipoExposicao: 'Intermitente',
    referencia: 'NR-12 (máquinas e equipamentos); NR-18 (serra circular e betoneira)',
    medidasExistentes: 'Não informadas',
    severidade: 4,
    medidasPropostas: 'Serra circular com coifa, cutelo divisor, empurrador e dispositivo de parada; betoneira com proteção das partes móveis e chave de partida protegida; inspeção NR-12; uso restrito a trabalhadores capacitados; óculos e protetor facial.',
    responsavel: 'Engenharia da obra e SESMT',
    acompanhamento: 'Check list mensal das máquinas; certificados de capacitação.'
  },
  icamento: {
    tipoRisco: 'Acidente',
    perigo: 'Queda de carga, tombamento ou colapso de grua, guincho ou elevador de obra',
    fonte: 'Movimentação vertical de materiais e de pessoas',
    lesaoAgravo: 'Esmagamento, politraumatismo e óbito',
    tipoExposicao: 'Intermitente',
    referencia: 'NR-18 (equipamentos de guindar, elevadores e gruas); NR-11; NR-12',
    medidasExistentes: 'Não informadas',
    severidade: 5,
    medidasPropostas: 'Plano de cargas e de içamento; operador capacitado e sinaleiro amarrador; inspeção diária com registro; limitadores de carga e de fim de curso; isolamento da área de içamento; manutenção conforme manual do fabricante, com responsável técnico.',
    responsavel: 'Engenharia da obra',
    acompanhamento: 'Livro de inspeção do equipamento; laudos de manutenção; certificados dos operadores.'
  },
  vergalhoes: {
    tipoRisco: 'Acidente',
    perigo: 'Perfuração e cortes por pontas de vergalhões e no corte e dobra de aço',
    fonte: 'Armação de pilares, vigas e lajes; bancada de corte e dobra',
    lesaoAgravo: 'Perfurações, cortes e lesões graves em quedas sobre pontas',
    tipoExposicao: 'Contínua',
    referencia: 'NR-18 (armações de aço: proteção das pontas verticais)',
    medidasExistentes: 'Luvas',
    severidade: 4,
    medidasPropostas: 'Proteção das pontas verticais de vergalhões (protetores plásticos ou dobra); bancada de corte e dobra estável e coberta; luvas de proteção mecânica e óculos.',
    responsavel: 'Mestre de obras e SESMT',
    acompanhamento: 'Inspeção semanal das pontas protegidas.'
  },
  cimento: {
    tipoRisco: 'Químico',
    perigo: 'Contato com cimento, cal e argamassa',
    fonte: 'Preparo e aplicação de concreto e argamassa',
    lesaoAgravo: 'Dermatite de contato irritativa e alérgica (cromo), queimaduras químicas e lesões oculares',
    tipoExposicao: 'Contínua',
    referencia: 'NR-09; NR-06 (luvas e óculos); FDS dos produtos',
    medidasExistentes: 'Luvas de raspa',
    severidade: 3,
    medidasPropostas: 'Luvas impermeáveis (nitrílicas) e botas de PVC no manuseio de concreto e argamassa; óculos de proteção; ponto de lavagem com água limpa; orientar para não deixar o cimento em contato com a pele.',
    responsavel: 'SESMT',
    acompanhamento: 'Ficha de EPI; queixas dermatológicas no PCMSO.'
  },
  tintasSolventes: {
    tipoRisco: 'Químico',
    perigo: 'Vapores de tintas, solventes, vernizes e impermeabilizantes',
    fonte: 'Pintura, impermeabilização e aplicação de selantes, especialmente em ambientes fechados',
    lesaoAgravo: 'Intoxicação, tontura, irritação respiratória e dermatites; efeitos neurológicos em exposição prolongada',
    tipoExposicao: 'Intermitente',
    referencia: 'NR-15, Anexo 11 e NR-09 (agentes químicos); FDS dos produtos; ACGIH',
    medidasExistentes: 'Não informadas',
    severidade: 3,
    medidasPropostas: 'Inventário dos produtos químicos com FDS; ventilação natural ou forçada; respirador com filtro para vapores orgânicos com CA; luvas e óculos; preferir produtos à base de água; avaliação quantitativa quando houver uso frequente em ambiente fechado.',
    responsavel: 'SESMT',
    acompanhamento: 'Inventário de produtos atualizado; inspeção do uso de respiradores.'
  },
  vibracaoMaos: {
    tipoRisco: 'Físico',
    perigo: 'Vibração em mãos e braços (VMB)',
    fonte: 'Marteletes, rompedores, compactadores de placa e lixadeiras',
    lesaoAgravo: 'Distúrbios vasculares e neurológicos nas mãos (dedo branco), lesões osteoarticulares',
    tipoExposicao: 'Intermitente',
    referencia: 'NR-15, Anexo 8 e NR-09, Anexo I (NHO-10): nível de ação aren 2,5 m/s²; limite 5,0 m/s²',
    medidasExistentes: 'Não informadas',
    severidade: 3,
    medidasPropostas: 'Avaliação quantitativa (NHO-10); ferramentas com sistema antivibração e manutenção em dia; revezamento e limitação do tempo de uso; luvas antivibração como medida complementar.',
    responsavel: 'SESMT',
    acompanhamento: 'Laudo de VMB; controle do tempo de uso.'
  },
  posturas: {
    tipoRisco: 'Ergonômico',
    perigo: 'Posturas forçadas e movimentos repetitivos',
    fonte: 'Trabalho com braços acima dos ombros, flexão de tronco, agachamento e tarefas repetitivas (pintura de teto, armação, assentamento)',
    lesaoAgravo: 'LER/DORT, tendinites, lombalgia e fadiga',
    tipoExposicao: 'Contínua',
    referencia: 'NR-17 (AEP e, quando necessário, AET)',
    medidasExistentes: 'Não informadas',
    severidade: 3,
    medidasPropostas: 'Realizar a AEP; extensores e cabos longos; plataformas e cavaletes na altura adequada; bancadas para corte e dobra; pausas e revezamento de tarefas.',
    responsavel: 'SESMT e mestre de obras',
    acompanhamento: 'AEP concluída; queixas osteomusculares no PCMSO.'
  }
};

const GHES_NR18 = [
  { nome: 'GHE 01 — Pedreiro', funcao: 'Pedreiro', atividades: 'Execução de alvenaria, chapisco, reboco, contrapiso e assentamento de revestimentos, inclusive em andaimes e na periferia.',
    perigos: { quedaEdificacao: 3, quedaMateriais: 2, ruidoObra: 2, silicaObra: 2, cimento: 3, calor: 2, cargas: 3, posturas: 3, psicoCampo: 2 } },
  { nome: 'GHE 02 — Servente', funcao: 'Servente', atividades: 'Transporte de materiais, preparo de argamassa na betoneira, limpeza e apoio às equipes nos pavimentos.',
    perigos: { quedaEdificacao: 3, quedaMateriais: 2, serraBetoneira: 2, ruidoObra: 3, silicaObra: 3, cimento: 3, calor: 2, cargas: 4, psicoCampo: 2 } },
  { nome: 'GHE 03 — Carpinteiro', funcao: 'Carpinteiro', atividades: 'Confecção e montagem de formas, escoramentos, guarda-corpos e plataformas de proteção; uso de serra circular.',
    perigos: { quedaEdificacao: 3, quedaMateriais: 2, serraBetoneira: 3, ruidoObra: 3, calor: 2, cargas: 3, posturas: 2, psicoCampo: 2 } },
  { nome: 'GHE 04 — Armador', funcao: 'Armador', atividades: 'Corte, dobra e montagem de armaduras de aço em bancada e nas formas.',
    perigos: { quedaEdificacao: 3, vergalhoes: 3, ruidoObra: 2, calor: 2, cargas: 3, posturas: 3, psicoCampo: 2 } },
  { nome: 'GHE 05 — Eletricista de obra', funcao: 'Eletricista', atividades: 'Montagem e manutenção das instalações elétricas temporárias e definitivas da obra.',
    perigos: { choqueEletrico: 3, quedaEdificacao: 2, ruidoObra: 2, posturas: 2, psicoCampo: 2 } },
  { nome: 'GHE 06 — Encanador', funcao: 'Encanador / bombeiro hidráulico', atividades: 'Instalações hidrossanitárias, abertura de rasgos em alvenaria e soldagem de tubos.',
    perigos: { quedaEdificacao: 2, ruidoObra: 2, silicaObra: 2, vibracaoMaos: 2, posturas: 3, tintasSolventes: 2, psicoCampo: 2 } },
  { nome: 'GHE 07 — Operador de grua / guincho', funcao: 'Operador de equipamento de guindar', atividades: 'Operação de grua, guincho ou elevador de obra para movimentação de materiais.',
    perigos: { icamento: 2, quedaEdificacao: 2, ruidoObra: 2, posturas: 2, psicoCampo: 2 } },
  { nome: 'GHE 08 — Pintor', funcao: 'Pintor', atividades: 'Preparo de superfícies, lixamento, aplicação de massa, tinta e verniz em áreas internas e fachadas.',
    perigos: { quedaEdificacao: 3, tintasSolventes: 3, silicaObra: 2, posturas: 3, calor: 2, psicoCampo: 2 } },
  { nome: 'GHE 09 — Montador de andaimes', funcao: 'Montador de andaimes', atividades: 'Montagem, desmontagem e manutenção de andaimes fachadeiros e tubulares.',
    perigos: { quedaEdificacao: 3, quedaMateriais: 3, cargas: 3, calor: 3, psicoCampo: 2 } },
  { nome: 'GHE 10 — Mestre de obras e encarregados', funcao: 'Mestre de obras / encarregado', atividades: 'Coordenação das equipes, liberação de frentes de serviço e controle da execução.',
    perigos: { quedaEdificacao: 2, quedaMateriais: 2, ruidoObra: 2, silicaObra: 1, calor: 2, psicoGestao: 2 } },
  { nome: 'GHE 11 — Engenharia e administração da obra', funcao: 'Engenheiro / técnico / administrativo', atividades: 'Planejamento, acompanhamento técnico e rotinas administrativas no escritório da obra, com visitas aos pavimentos.',
    perigos: { quedaEdificacao: 1, quedaMateriais: 1, ruidoObra: 1, psicoGestao: 2 } }
];

/* ======================= Mineração a céu aberto (NR-22) ======================= */
const PERIGOS_NR22 = {
  silicaMina: Object.assign({}, PERIGOS_TERRAPLENAGEM.silica, {
    fonte: 'Perfuração, detonação, carregamento, transporte e britagem de rocha; peneiramento e transferências em correias; vias não pavimentadas',
    medidasExistentes: 'Respirador (tipo e CA não especificados)',
    medidasPropostas: 'Perfuração com captação de pó ou injeção de água; aspersão nos britadores, peneiras e pontos de transferência; enclausuramento e exaustão nas transferências de correias; umectação das vias; cabines fechadas com filtro; Programa de Proteção Respiratória com PFF2 ou peça facial com filtro P2/P3, ensaio de vedação; monitoramento da fração respirável e do teor de quartzo por GHE; exames do PCMSO (imagem do tórax pela OIT e espirometria).'
  }),
  ruidoMina: Object.assign({}, PERIGOS_TERRAPLENAGEM.ruido, {
    fonte: 'Perfuratrizes, britadores, peneiras, correias transportadoras e equipamentos de carga e transporte'
  }),
  explosivos: {
    tipoRisco: 'Acidente',
    perigo: 'Detonação acidental, ultralançamento de fragmentos, falha de fogo e gases da detonação',
    fonte: 'Transporte, armazenamento, carregamento e detonação de explosivos; retorno à frente após o fogo',
    lesaoAgravo: 'Politraumatismo, queimaduras, amputações, intoxicação por CO e NOx, e óbito',
    tipoExposicao: 'Eventual',
    referencia: 'NR-22 (explosivos e acessórios); regulamentação do Exército para produtos controlados',
    medidasExistentes: 'Não informadas',
    severidade: 5,
    medidasPropostas: 'Plano de fogo por profissional legalmente habilitado; blaster habilitado; paióis licenciados e controle de estoque; área de segurança demarcada, evacuada e com vigias; sinais sonoros antes e depois do fogo; espera para a dissipação dos gases; procedimento para fogo falhado; proibição de fumar e de fontes de ignição.',
    responsavel: 'Engenheiro de minas (responsável técnico) e encarregado de fogo',
    acompanhamento: 'Registro de cada detonação (plano de fogo, área evacuada, ocorrências); auditoria trimestral dos paióis.'
  },
  taludes: {
    tipoRisco: 'Acidente',
    perigo: 'Instabilidade de taludes e bancadas: queda de blocos e ruptura do maciço',
    fonte: 'Frentes de lavra, bancadas, bermas e pilhas de estéril',
    lesaoAgravo: 'Soterramento, esmagamento e óbito; atingimento de máquinas e veículos',
    tipoExposicao: 'Contínua',
    referencia: 'NR-22 (estabilidade de maciços, plano de lavra e monitoramento geotécnico)',
    medidasExistentes: 'Não informadas',
    severidade: 5,
    medidasPropostas: 'Geometria de bancadas conforme o projeto e o plano de lavra; inspeção diária das frentes com registro; abatimento de blocos instáveis (choco); bermas e leiras de proteção; monitoramento geotécnico com responsável técnico; proibição de trabalho ou permanência ao pé de talude instável.',
    responsavel: 'Engenheiro de minas / geotecnia',
    acompanhamento: 'Relatórios de inspeção geotécnica; registro das inspeções diárias de frente.'
  },
  trafegoMina: {
    tipoRisco: 'Acidente',
    perigo: 'Colisão, atropelamento, tombamento e queda de veículos pela borda de vias e bancadas',
    fonte: 'Tráfego de caminhões fora de estrada, carregadeiras e veículos leves; manobras de ré; vias com rampas e bordas',
    lesaoAgravo: 'Esmagamento, politraumatismo e óbito',
    tipoExposicao: 'Contínua',
    referencia: 'NR-22 (circulação e transporte na mina); NR-12, Anexo XII; NR-11',
    medidasExistentes: 'Cinto de segurança; check list dos equipamentos',
    severidade: 5,
    medidasPropostas: 'Plano de tráfego com regras de preferência, velocidade e distâncias; leiras nas bordas das vias e bancadas com altura adequada ao porte dos equipamentos; sinalização e iluminação; separação entre veículos leves e fora de estrada (bandeirola e giroflex); comunicação por rádio; alarme de ré e câmeras; capacitação e autorização dos operadores.',
    responsavel: 'Gerente de mina e gestor de frota',
    acompanhamento: 'Inspeção semanal das vias e das leiras; registro de quase acidentes; indicadores de velocidade.'
  },
  correias: {
    tipoRisco: 'Acidente',
    perigo: 'Aprisionamento e esmagamento em partes móveis de correias transportadoras, britadores e peneiras',
    fonte: 'Limpeza, desobstrução, inspeção e manutenção da planta de beneficiamento com equipamentos energizados',
    lesaoAgravo: 'Amputações, esmagamento e óbito',
    tipoExposicao: 'Intermitente',
    referencia: 'NR-22 (transportadores contínuos e beneficiamento); NR-12 (proteções e dispositivos de parada)',
    medidasExistentes: 'Não informadas',
    severidade: 5,
    medidasPropostas: 'Proteções fixas em tambores, roletes de retorno e transmissões; cabos de parada de emergência ao longo das correias; bloqueio e etiquetagem (LOTO) com cadeado individual antes de qualquer intervenção; proibição de limpeza com o equipamento em movimento; passarelas com guarda-corpo.',
    responsavel: 'Supervisor da planta e manutenção',
    acompanhamento: 'Inspeção mensal das proteções; teste dos cabos de emergência; auditoria do procedimento de LOTO.'
  },
  espacoConfinado: {
    tipoRisco: 'Acidente',
    perigo: 'Entrada em espaço confinado (silos, chutes, britadores, galerias)',
    fonte: 'Desobstrução e manutenção de silos, chutes e britadores',
    lesaoAgravo: 'Soterramento por material, asfixia, intoxicação e óbito',
    tipoExposicao: 'Eventual',
    referencia: 'NR-33 (espaços confinados); NR-22',
    medidasExistentes: 'Não informadas',
    severidade: 5,
    medidasPropostas: 'Cadastro dos espaços confinados; permissão de entrada e trabalho (PET); bloqueio das alimentações; monitoramento da atmosfera; vigia e equipe de resgate capacitada; capacitação NR-33.',
    responsavel: 'Supervisor da planta e SESMT',
    acompanhamento: 'PETs emitidas e arquivadas; simulado anual de resgate.'
  },
  eletricidadeMina: Object.assign({}, PERIGOS_NR18.choqueEletrico, {
    perigo: 'Choque elétrico e arco elétrico na manutenção da planta e da subestação',
    fonte: 'Painéis, motores, subestação, cabos de alimentação de equipamentos móveis',
    medidasPropostas: 'Prontuário das instalações elétricas (NR-10); somente trabalhadores capacitados e autorizados; bloqueio e etiquetagem; vestimentas e EPI para arco elétrico conforme análise; inspeção dos cabos de equipamentos móveis.',
    responsavel: 'Manutenção elétrica e SESMT',
    acompanhamento: 'Prontuário atualizado; registro de autorização; auditoria de LOTO.'
  }),
  quedaPlanta: Object.assign({}, PERIGOS_TERRAPLENAGEM.queda, {
    fonte: 'Manutenção de britadores, peneiras, silos e correias elevadas; acesso a equipamentos de grande porte',
    medidasPropostas: 'Passarelas e plataformas com guarda-corpo; pontos de ancoragem; permissão de trabalho em altura; capacitação NR-35; acessos com escadas fixas.'
  }),
  cargasGeral: Object.assign({}, PERIGOS_TERRAPLENAGEM.cargas, {
    fonte: 'Movimentação manual de materiais, peças, sacos, carrinhos e roupas; posturas forçadas na limpeza e na manutenção',
    medidasPropostas: 'Realizar a AEP (NR-17) e, se indicado, a AET; meios auxiliares de transporte (carrinhos, talhas, paleteiras); limitar e fracionar o peso das cargas; revezamento e pausas; capacitação em levantamento e transporte de cargas.',
    medidasExistentes: 'Não informadas'
  }),
  postoComputador: {
    tipoRisco: 'Ergonômico',
    perigo: 'Postura sentada prolongada e trabalho com computador',
    fonte: 'Atividades administrativas, de atendimento e de balcão',
    lesaoAgravo: 'Dores cervicais e lombares, LER/DORT e fadiga visual',
    tipoExposicao: 'Contínua',
    referencia: 'NR-17 (mobiliário, equipamentos dos postos de trabalho e AEP)',
    medidasExistentes: 'Não informadas',
    severidade: 2,
    medidasPropostas: 'Realizar a AEP; cadeiras com regulagem; monitor na altura dos olhos; apoio para os pés quando necessário; pausas.',
    responsavel: 'SESMT e gestores',
    acompanhamento: 'AEP concluída; queixas osteomusculares no PCMSO.'
  },
  vciMina: Object.assign({}, PERIGOS_TERRAPLENAGEM.vci, {
    fonte: 'Operação de caminhões fora de estrada, carregadeiras, escavadeiras e perfuratrizes em vias e praças irregulares'
  })
};

const GHES_NR22 = [
  { nome: 'GHE 01 — Operador de perfuratriz', funcao: 'Operador de perfuratriz', atividades: 'Perfuração de furos para desmonte nas bancadas, posicionamento da perfuratriz e troca de hastes e brocas.',
    perigos: { silicaMina: 3, ruidoMina: 3, vciMina: 3, taludes: 2, quedaPlanta: 2, calor: 3, psicoConducao: 2 } },
  { nome: 'GHE 02 — Encarregado de fogo (blaster) e auxiliar', funcao: 'Blaster / auxiliar de detonação', atividades: 'Recebimento, transporte e carregamento de explosivos, amarração, evacuação da área, detonação e verificação pós-fogo.',
    perigos: { explosivos: 2, silicaMina: 3, ruidoMina: 3, taludes: 2, calor: 3, psicoCampo: 2 } },
  { nome: 'GHE 03 — Operador de escavadeira e carregadeira', funcao: 'Operador de máquinas de carga', atividades: 'Carregamento de caminhões nas frentes de lavra e na pilha de produtos.',
    perigos: { silicaMina: 3, ruidoMina: 2, vciMina: 3, sentado: 3, trafegoMina: 2, taludes: 2, psicoConducao: 2 } },
  { nome: 'GHE 04 — Motorista de caminhão fora de estrada', funcao: 'Motorista de caminhão fora de estrada', atividades: 'Transporte de rocha desmontada da frente de lavra ao britador primário e de estéril às pilhas.',
    perigos: { trafegoMina: 3, silicaMina: 2, ruidoMina: 2, vciMina: 3, sentado: 3, taludes: 2, psicoConducao: 3 } },
  { nome: 'GHE 05 — Operador de britagem', funcao: 'Operador de britagem', atividades: 'Controle da planta de britagem pela sala de controle e rondas na área; desobstrução de britadores.',
    perigos: { silicaMina: 3, ruidoMina: 3, correias: 2, espacoConfinado: 2, quedaPlanta: 2, psicoCampo: 2 } },
  { nome: 'GHE 06 — Auxiliar de beneficiamento', funcao: 'Auxiliar de britagem / limpeza', atividades: 'Limpeza de correias, chutes e pisos; coleta de amostras; apoio à manutenção na planta.',
    perigos: { silicaMina: 3, ruidoMina: 3, correias: 3, espacoConfinado: 2, quedaPlanta: 2, cargasGeral: 3, calor: 3, psicoCampo: 2 } },
  { nome: 'GHE 07 — Mecânico e eletricista de manutenção', funcao: 'Mecânico / eletricista', atividades: 'Manutenção mecânica e elétrica da planta, dos equipamentos móveis e da subestação.',
    perigos: { correias: 3, eletricidadeMina: 3, quedaPlanta: 3, espacoConfinado: 2, silicaMina: 3, ruidoMina: 3, cargasGeral: 3, psicoCampo: 2 } },
  { nome: 'GHE 08 — Encarregado e supervisor de lavra', funcao: 'Encarregado / supervisor', atividades: 'Coordenação das frentes de lavra e da planta, inspeção de bancadas e liberação de áreas.',
    perigos: { taludes: 2, trafegoMina: 2, explosivos: 1, silicaMina: 2, ruidoMina: 2, calor: 2, psicoGestao: 2 } },
  { nome: 'GHE 09 — Engenharia e SESMT', funcao: 'Engenheiro de minas / técnico de segurança', atividades: 'Planejamento de lavra, acompanhamento geotécnico, inspeções de segurança e acompanhamento de detonações.',
    perigos: { taludes: 1, trafegoMina: 2, explosivos: 1, silicaMina: 2, ruidoMina: 2, calor: 2, psicoGestao: 2 } },
  { nome: 'GHE 10 — Administrativo e balança', funcao: 'Administrativo / balanceiro', atividades: 'Rotinas administrativas, pesagem de caminhões e emissão de notas na portaria.',
    perigos: { silicaMina: 2, ruidoMina: 1, trafegoMina: 1, postoComputador: 2, psicoGestao: 2 } }
];

/* ======================= Serviços de saúde (NR-32) ======================= */
const PERIGOS_NR32 = {
  bioPerfuro: {
    tipoRisco: 'Biológico',
    perigo: 'Acidente com material perfurocortante e contato com sangue e fluidos corporais',
    fonte: 'Punções, medicação injetável, coleta de sangue, procedimentos cirúrgicos e descarte de agulhas e lâminas',
    lesaoAgravo: 'Infecção por HIV, hepatites B e C e outros agentes transmitidos pelo sangue',
    tipoExposicao: 'Contínua',
    referencia: 'NR-32 (riscos biológicos; Anexo III — Plano de Prevenção de Riscos de Acidentes com Materiais Perfurocortantes)',
    medidasExistentes: 'Luvas de procedimento; coletores de perfurocortantes',
    severidade: 5,
    medidasPropostas: 'Plano de prevenção de acidentes com perfurocortantes elaborado por comissão gestora multidisciplinar; dispositivos com mecanismo de segurança; proibição do reencape e da desconexão manual de agulhas; coletor rígido próximo ao ponto de uso, respeitando o limite de enchimento; vacinação contra hepatite B com controle sorológico; protocolo de atendimento pós-exposição (quimioprofilaxia) disponível 24 h; óculos e máscara em procedimentos com risco de respingos.',
    responsavel: 'Comissão gestora de perfurocortantes, SESMT e CCIH',
    acompanhamento: 'Taxa de acidentes com perfurocortantes por setor; cobertura vacinal e sorologia; auditoria mensal dos coletores.'
  },
  bioAerossol: {
    tipoRisco: 'Biológico',
    perigo: 'Agentes biológicos transmitidos por gotículas e aerossóis (tuberculose, influenza, COVID-19 e outros)',
    fonte: 'Assistência a pacientes com doenças respiratórias; procedimentos geradores de aerossóis (intubação, aspiração, nebulização)',
    lesaoAgravo: 'Tuberculose, infecções respiratórias graves e óbito',
    tipoExposicao: 'Contínua',
    referencia: 'NR-32 (riscos biológicos; programa de vacinação); protocolos de precaução da CCIH',
    medidasExistentes: 'Máscara cirúrgica',
    severidade: 4,
    medidasPropostas: 'Precauções por gotículas e aerossóis conforme a CCIH; respirador PFF2/N95 com ensaio de vedação nos procedimentos de risco; quartos de isolamento com ventilação adequada (pressão negativa onde exigido); triagem de sintomáticos respiratórios; vacinação (influenza e demais do programa).',
    responsavel: 'CCIH, SESMT e coordenação de enfermagem',
    acompanhamento: 'Auditoria de adesão às precauções; registro dos ensaios de vedação; casos de infecção ocupacional.'
  },
  bioContato: {
    tipoRisco: 'Biológico',
    perigo: 'Contato com materiais, superfícies, resíduos e roupas contaminados',
    fonte: 'Limpeza de quartos e áreas críticas, coleta de resíduos de serviços de saúde e processamento de roupa suja',
    lesaoAgravo: 'Infecções de pele, gastrointestinais e por agentes transmitidos pelo sangue',
    tipoExposicao: 'Contínua',
    referencia: 'NR-32 (riscos biológicos, resíduos e lavanderia); RDC ANVISA de gerenciamento de resíduos de serviços de saúde',
    medidasExistentes: 'Luvas de borracha',
    severidade: 4,
    medidasPropostas: 'Luvas de cano longo, botas impermeáveis, avental e óculos conforme a tarefa; sacos e recipientes adequados para os resíduos; carros de coleta fechados; separação física entre áreas suja e limpa da lavanderia; capacitação inicial e contínua; vacinação.',
    responsavel: 'Hotelaria / higienização e SESMT',
    acompanhamento: 'Inspeção da segregação de resíduos; Ficha de EPI; acidentes com resíduos.'
  },
  quimicosSaude: {
    tipoRisco: 'Químico',
    perigo: 'Produtos químicos de limpeza, desinfecção e esterilização',
    fonte: 'Hipoclorito, quaternários de amônio, álcool, ácido peracético e glutaraldeído na limpeza e no reprocessamento de materiais',
    lesaoAgravo: 'Dermatites, irritação ocular e respiratória, asma ocupacional',
    tipoExposicao: 'Intermitente',
    referencia: 'NR-32 (riscos químicos: inventário e FDS); NR-09; NR-15, Anexo 11',
    medidasExistentes: 'Luvas',
    severidade: 3,
    medidasPropostas: 'Inventário dos produtos com FDS disponível no local de uso; rotulagem dos frascos fracionados; ventilação ou exaustão no reprocessamento; luvas nitrílicas, óculos e avental; diluição automatizada; substituir o glutaraldeído quando possível.',
    responsavel: 'SESMT, farmácia e higienização',
    acompanhamento: 'Inventário atualizado; inspeção da rotulagem; queixas no PCMSO.'
  },
  quimioterapicos: {
    tipoRisco: 'Químico',
    perigo: 'Medicamentos antineoplásicos (quimioterápicos)',
    fonte: 'Preparo, transporte, administração e descarte de quimioterápicos; manipulação de excretas de pacientes em tratamento',
    lesaoAgravo: 'Efeitos carcinogênicos, mutagênicos e teratogênicos; alterações reprodutivas; dermatites',
    tipoExposicao: 'Intermitente',
    referencia: 'NR-32 (quimioterápicos antineoplásicos: preparo em cabine de segurança biológica e capacitação específica)',
    medidasExistentes: 'Não informadas',
    severidade: 5,
    medidasPropostas: 'Preparo exclusivamente em cabine de segurança biológica adequada (classe II B2), em sala exclusiva; luvas próprias para quimioterápicos, avental de baixa permeabilidade e proteção respiratória; kit de derramamento; sistemas fechados de transferência; afastar gestantes e lactantes do preparo e da administração; capacitação específica; acompanhamento no PCMSO.',
    responsavel: 'Farmácia, SESMT e médico do PCMSO',
    acompanhamento: 'Certificação anual da cabine; registro dos trabalhadores expostos; exames do PCMSO.'
  },
  radiacao: {
    tipoRisco: 'Físico',
    perigo: 'Radiações ionizantes (raios X, tomografia, radioscopia em centro cirúrgico)',
    fonte: 'Exames de radiodiagnóstico, procedimentos com arco cirúrgico e exames no leito',
    lesaoAgravo: 'Efeitos estocásticos (câncer), catarata e lesões de pele',
    tipoExposicao: 'Intermitente',
    referencia: 'NR-32 (radiações ionizantes); normas da CNEN; RDC ANVISA nº 611/2022 (radiodiagnóstico)',
    medidasExistentes: 'Avental plumbífero',
    severidade: 4,
    medidasPropostas: 'Plano de proteção radiológica com supervisor de proteção radiológica; dosimetria individual mensal com registro; blindagem das salas e sinalização luminosa; aventais, protetores de tireoide e óculos plumbíferos inspecionados periodicamente; limitar a permanência de pessoas não envolvidas.',
    responsavel: 'Supervisor de proteção radiológica e SESMT',
    acompanhamento: 'Relatórios mensais de dosimetria; levantamento radiométrico; controle de qualidade dos equipamentos.'
  },
  movPacientes: {
    tipoRisco: 'Ergonômico',
    perigo: 'Movimentação e transferência de pacientes; posturas forçadas na assistência',
    fonte: 'Mudança de decúbito, transferência cama–maca–cadeira, banho no leito e transporte de pacientes',
    lesaoAgravo: 'Lombalgia, hérnia de disco, lesões de ombro e LER/DORT',
    tipoExposicao: 'Contínua',
    referencia: 'NR-17 (AEP/AET); NR-32',
    medidasExistentes: 'Não informadas',
    severidade: 3,
    medidasPropostas: 'Realizar a AEP por setor; equipamentos de auxílio (elevador de pacientes, prancha e lençol de transferência); camas com regulagem de altura; dimensionamento das equipes para tarefas com pacientes dependentes; capacitação em técnicas de movimentação.',
    responsavel: 'Coordenação de enfermagem e SESMT',
    acompanhamento: 'AEP concluída; afastamentos por distúrbios osteomusculares no PCMSO.'
  },
  psicoSaude: {
    tipoRisco: 'Psicossocial',
    perigo: 'Fatores de risco psicossociais: sobrecarga, plantões e trabalho noturno, contato com sofrimento e morte, violência de pacientes e acompanhantes',
    fonte: 'Assistência direta a pacientes, dimensionamento de equipes e escalas de plantão',
    lesaoAgravo: 'Estresse ocupacional, ansiedade, depressão, esgotamento profissional (burnout) e distúrbios do sono',
    tipoExposicao: 'Contínua',
    referencia: 'NR-01, item 1.5.3.1.4 (Portaria MTE nº 1.419/2024); NR-17; NR-32; Guia de Informações sobre os Fatores de Riscos Psicossociais (MTE)',
    medidasExistentes: 'Não identificadas',
    severidade: 3,
    medidasPropostas: 'Avaliar os fatores psicossociais com participação dos trabalhadores; dimensionar as equipes; organizar as escalas respeitando o descanso; protocolo de prevenção e resposta à violência no atendimento; apoio psicológico após eventos críticos; canal de escuta e de denúncia de assédio com sigilo.',
    responsavel: 'RH, Diretoria, coordenações e SESMT',
    acompanhamento: 'Relatório da avaliação psicossocial; registros de violência; absenteísmo e afastamentos por transtornos mentais.'
  },
  quedaPiso: {
    tipoRisco: 'Acidente',
    perigo: 'Queda de mesmo nível em pisos molhados ou escorregadios',
    fonte: 'Limpeza úmida, áreas de lavagem, cozinha e banheiros de pacientes',
    lesaoAgravo: 'Entorses, contusões e fraturas',
    tipoExposicao: 'Intermitente',
    referencia: 'NR-32; NR-08 (edificações)',
    medidasExistentes: 'Não informadas',
    severidade: 3,
    medidasPropostas: 'Sinalização durante a limpeza; limpeza por metades do ambiente; calçado fechado antiderrapante; manutenção de pisos e ralos.',
    responsavel: 'Hotelaria / higienização e manutenção',
    acompanhamento: 'Inspeção mensal dos pisos; registro de quedas.'
  },
  cozinha: {
    tipoRisco: 'Acidente',
    perigo: 'Cortes, queimaduras e calor na produção de refeições',
    fonte: 'Facas, fatiadores e processadores; fogões, fornos, caldeirões e vapor',
    lesaoAgravo: 'Cortes, queimaduras, desidratação e fadiga pelo calor',
    tipoExposicao: 'Contínua',
    referencia: 'NR-12 (máquinas de cozinha); NR-15, Anexo 3 e NR-09 (calor); NR-32',
    medidasExistentes: 'Não informadas',
    severidade: 3,
    medidasPropostas: 'Luva de malha de aço no corte; proteções nos equipamentos (NR-12); luvas térmicas e aventais; exaustão e ventilação da cozinha; avaliação de calor (IBUTG); água disponível e pausas.',
    responsavel: 'Nutrição e SESMT',
    acompanhamento: 'Inspeção dos equipamentos; laudo de calor; registro de acidentes.'
  },
  eletricaManutencao: Object.assign({}, PERIGOS_NR18.choqueEletrico, {
    perigo: 'Choque elétrico na manutenção predial e de equipamentos',
    fonte: 'Quadros elétricos, casa de máquinas, geradores e equipamentos médico-hospitalares',
    medidasExistentes: 'Não informadas',
    medidasPropostas: 'Prontuário das instalações elétricas (NR-10); somente trabalhadores capacitados e autorizados; bloqueio e etiquetagem; atenção às áreas críticas alimentadas por gerador e no-break.',
    responsavel: 'Manutenção e SESMT',
    acompanhamento: 'Prontuário atualizado; registro de autorização; auditoria de bloqueio e etiquetagem.'
  }),
  quedaManutencao: Object.assign({}, PERIGOS_TERRAPLENAGEM.queda, {
    fonte: 'Uso de escadas e acesso a telhados, forros, casas de máquinas e caixas-d’água',
    medidasExistentes: 'Não informadas',
    medidasPropostas: 'Escadas em bom estado e plataformas com guarda-corpo; pontos de ancoragem e linha de vida nas coberturas; permissão de trabalho; capacitação NR-35.'
  }),
  lavanderia: {
    tipoRisco: 'Acidente',
    perigo: 'Aprisionamento em máquinas de lavanderia e calor',
    fonte: 'Lavadoras, centrífugas, calandras e secadoras',
    lesaoAgravo: 'Esmagamento e queimaduras nas mãos; fadiga pelo calor',
    tipoExposicao: 'Contínua',
    referencia: 'NR-12; NR-32 (lavanderia); NR-15, Anexo 3',
    medidasExistentes: 'Não informadas',
    severidade: 4,
    medidasPropostas: 'Calandra com barra de proteção e parada de emergência; intertravamento das portas das máquinas; manutenção preventiva; ventilação e avaliação de calor; capacitação dos operadores.',
    responsavel: 'Hotelaria / lavanderia e manutenção',
    acompanhamento: 'Teste mensal dos dispositivos de segurança; laudo de calor.'
  }
};

const GHES_NR32 = [
  { nome: 'GHE 01 — Enfermeiro(a) assistencial', funcao: 'Enfermeiro(a)', atividades: 'Assistência direta a pacientes, procedimentos invasivos, administração de medicamentos e coordenação da equipe de enfermagem.',
    perigos: { bioPerfuro: 3, bioAerossol: 3, quimicosSaude: 2, movPacientes: 3, psicoSaude: 3 } },
  { nome: 'GHE 02 — Técnico(a) de enfermagem', funcao: 'Técnico(a) de enfermagem', atividades: 'Cuidados diretos, higiene e mudança de decúbito de pacientes, punções, medicação e coleta de material.',
    perigos: { bioPerfuro: 3, bioAerossol: 3, bioContato: 3, quimicosSaude: 2, movPacientes: 4, psicoSaude: 3 } },
  { nome: 'GHE 03 — Médico(a)', funcao: 'Médico(a)', atividades: 'Atendimento clínico e cirúrgico, procedimentos invasivos e plantões.',
    perigos: { bioPerfuro: 3, bioAerossol: 3, radiacao: 2, psicoSaude: 3 } },
  { nome: 'GHE 04 — Técnico(a) de laboratório', funcao: 'Técnico(a) de laboratório', atividades: 'Coleta e processamento de amostras biológicas e operação de equipamentos de análise.',
    perigos: { bioPerfuro: 3, bioContato: 3, quimicosSaude: 3, psicoSaude: 2 } },
  { nome: 'GHE 05 — Técnico(a) em radiologia', funcao: 'Técnico(a) em radiologia', atividades: 'Realização de exames de raios X e tomografia, inclusive no leito e no centro cirúrgico.',
    perigos: { radiacao: 3, bioAerossol: 2, movPacientes: 3, psicoSaude: 2 } },
  { nome: 'GHE 06 — Farmácia (manipulação)', funcao: 'Farmacêutico(a) / auxiliar de farmácia', atividades: 'Dispensação, fracionamento e preparo de medicamentos, inclusive antineoplásicos.',
    perigos: { quimioterapicos: 3, quimicosSaude: 2, postoComputador: 2, psicoSaude: 2 } },
  { nome: 'GHE 07 — Higienização', funcao: 'Auxiliar de higienização', atividades: 'Limpeza concorrente e terminal de quartos e áreas críticas; coleta e transporte de resíduos.',
    perigos: { bioContato: 3, bioPerfuro: 3, quimicosSaude: 3, quedaPiso: 3, cargasGeral: 3, psicoSaude: 2 } },
  { nome: 'GHE 08 — Lavanderia', funcao: 'Auxiliar de lavanderia', atividades: 'Recebimento e separação de roupa suja, lavagem, calandragem e dobra.',
    perigos: { bioContato: 3, bioPerfuro: 2, lavanderia: 3, quimicosSaude: 2, cargasGeral: 3, psicoSaude: 2 } },
  { nome: 'GHE 09 — Nutrição', funcao: 'Cozinheiro(a) / copeiro(a)', atividades: 'Preparo e distribuição de refeições, inclusive em áreas de internação.',
    perigos: { cozinha: 3, quedaPiso: 3, cargasGeral: 3, bioContato: 2, psicoSaude: 2 } },
  { nome: 'GHE 10 — Maqueiro', funcao: 'Maqueiro', atividades: 'Transporte de pacientes em macas e cadeiras entre setores.',
    perigos: { movPacientes: 4, bioAerossol: 2, bioContato: 2, psicoSaude: 2 } },
  { nome: 'GHE 11 — Recepção e administrativo', funcao: 'Recepcionista / administrativo', atividades: 'Atendimento ao público, cadastro de pacientes e rotinas administrativas.',
    perigos: { bioAerossol: 2, postoComputador: 2, psicoSaude: 3 } },
  { nome: 'GHE 12 — Manutenção', funcao: 'Técnico(a) de manutenção', atividades: 'Manutenção predial, elétrica e de equipamentos, inclusive em áreas assistenciais.',
    perigos: { eletricaManutencao: 3, quedaManutencao: 2, bioContato: 2, cargasGeral: 2, psicoCampo: 2 } }
];

/* ======================= Montagem genérica de um modelo ======================= */

/* Probabilidade residual esperada após as medidas propostas. */
const RESIDUAL_P2_PGR = ['cargas', 'cargasGeral', 'postoComputador', 'sentado', 'vci', 'vciMina', 'calor', 'posturas', 'movPacientes', 'tintasSolventes', 'vibracaoMaos'];
const CARCINOGENOS_PGR = ['silica', 'silicaMina', 'silicaObra', 'quimioterapicos', 'radiacao'];

function probabilidadeResidualPGR(chave, prob) {
  if (prob <= 1) return 1;
  if (CARCINOGENOS_PGR.includes(chave) && prob >= 3) return 2;
  if (RESIDUAL_P2_PGR.includes(chave)) return 2;
  return 1;
}

function montarModeloPGR(def, base) {
  const ghes = [];
  const perigos = [];
  def.ghes.forEach((g) => {
    const ghe = { id: uuid(), nome: g.nome, setor: g.setor || def.setorPadrao || '', funcao: g.funcao, numTrabalhadores: '', descricaoAtividades: g.atividades };
    ghes.push(ghe);
    Object.entries(g.perigos).forEach(([chave, prob]) => {
      const h = def.catalogo[chave];
      if (!h) throw new Error(`Perigo "${chave}" não está no catálogo do modelo ${def.id}`);
      const medicao = (def.medicoes || {})[`${g.funcao}|${chave}`];
      const nivel = classificarRiscoPGR(h.severidade, prob).nivel;
      const semMedidas = h.medidasExistentes.startsWith('Não');
      const manter = nivel === 'Baixo' && !semMedidas;
      const higiene = ['Físico', 'Químico'].includes(h.tipoRisco);
      perigos.push({
        id: uuid(),
        gheId: ghe.id,
        perigo: h.perigo,
        fonte: h.fonte,
        lesaoAgravo: h.lesaoAgravo,
        tipoExposicao: h.tipoExposicao,
        tempoExposicao: h.tipoExposicao === 'Eventual' ? 'Eventual, conforme a atividade' : (def.jornada || 'Durante a jornada'),
        tipoRisco: h.tipoRisco,
        referencia: h.referencia,
        tipoAvaliacao: medicao ? 'Quantitativa' : 'Qualitativa',
        resultadoAvaliacao: medicao || (higiene
          ? 'Sem medição. Exposição estimada qualitativamente; avaliação quantitativa prevista no plano de ação.'
          : (h.tipoRisco === 'Psicossocial' ? 'Identificação preliminar; aplicar instrumento de avaliação com participação dos trabalhadores.' : 'Avaliação qualitativa em campo.')),
        severidade: String(h.severidade),
        probabilidade: String(prob),
        medidasExistentes: h.medidasExistentes,
        medidasPropostas: manter ? 'Manter as medidas existentes e acompanhar nas inspeções periódicas.' : h.medidasPropostas,
        tipoMedida: manter ? 'Manter' : (semMedidas ? 'Introduzir' : 'Aprimorar'),
        severidadeResidual: String(h.severidade),
        probabilidadeResidual: String(probabilidadeResidualPGR(chave, prob)),
        responsavel: h.responsavel,
        prazo: somarDiasISO(base, PRAZO_POR_NIVEL_PGR[nivel] || 90),
        acompanhamento: h.acompanhamento,
        status: 'Pendente'
      });
    });
  });
  const treinamentos = def.treinamentos.map(([nome, cargaHoraria, periodicidade, responsavel, dias]) => ({
    id: uuid(), nome, gheId: '', cargaHoraria: String(cargaHoraria), periodicidade, responsavel,
    dataPrevista: somarDiasISO(base, dias), status: 'Pendente'
  }));
  const revisoes = (def.revisoes || [{ revisao: '00', motivo: `Emissão original a partir do modelo "${def.nome}". Ajustar ao estabelecimento antes da assinatura.`, data: base }])
    .map((r) => Object.assign({ id: uuid() }, r, { data: r.data || base }));
  return Object.assign({
    empresa: '', unidade: '', cnpj: '', endereco: '', responsavelPGR: '',
    regimeTrabalho: def.regimeTrabalho || ''
  }, def.identificacao, {
    dataElaboracao: base,
    proximaRevisao: somarDiasISO(base, 730),
    revisoes,
    caracterizacaoAmbiente: def.caracterizacao,
    consultaTrabalhadores: 'Registrar aqui como foi feita a consulta aos trabalhadores e à CIPA (ou ao nomeado) sobre a percepção dos riscos: datas, participantes e principais contribuições.',
    requisitosEspecificos: def.requisitosEspecificos || '',
    ghes,
    perigos,
    treinamentos,
    emergencia: def.emergencia,
    exerciciosSimulados: [],
    assinaturas: { responsavelPGR: '' }
  });
}

const REQUISITOS_NR18_PGR = 'NR-18 — Requisitos do PGR em canteiros de obras (além do exigido pela NR-01):\n' +
  '• PGR elaborado por profissional legalmente habilitado em segurança do trabalho (em canteiros com até 7 m de altura e até 10 trabalhadores, pode ser elaborado por profissional qualificado) e implementado sob responsabilidade da organização.\n' +
  '• O PGR deve conter, elaborados por profissional legalmente habilitado: projeto da área de vivência do canteiro e de eventuais frentes de trabalho; projeto elétrico das instalações temporárias; projetos dos sistemas de proteção coletiva; projetos dos sistemas de proteção individual contra quedas (SPIQ), quando aplicável; e a relação dos EPI com as especificações técnicas, de acordo com os riscos.\n' +
  '• O PGR deve ser mantido atualizado de acordo com a etapa em que se encontra a obra.\n' +
  'Situação desta obra: [informar para cada projeto o responsável, o registro (ART/RRT) e a data].';

const MODELOS_PGR = [
  {
    id: 'terraplenagem',
    nome: 'Obras de terraplenagem (revisão conforme a NR-01 vigente)',
    descricao: '14 GHEs, inventário com fatores psicossociais, plano de ação, treinamentos e emergência.',
    criar(base) {
      const dados = montarModeloPGR({
        id: 'terraplenagem', nome: 'Obras de terraplenagem', catalogo: PERIGOS_TERRAPLENAGEM, ghes: GHES_TERRAPLENAGEM,
        medicoes: MEDICOES_TERRAPLENAGEM, jornada: JORNADA_TERRAPLENAGEM, setorPadrao: 'Obra / frentes de serviço',
        identificacao: { unidade: 'Duque de Caxias', cnae: '43.13-4-00', atividadePrincipal: 'Obras de terraplenagem', grauRisco: '3' },
        regimeTrabalho: 'Segunda a quinta-feira: 07h às 17h; sexta-feira: 07h às 16h; intervalo para refeição das 12h às 13h (44 h semanais).',
        revisoes: [
          { revisao: '00', motivo: 'Emissão original', data: '2022-01-07' },
          { revisao: '01', motivo: 'Revisão geral para adequação à NR-01 vigente: inclusão dos fatores de risco psicossociais (Portaria MTE nº 1.419/2024), correção da matriz e do inventário de riscos, inclusão de riscos não identificados, plano de ação, cronograma de treinamentos e preparação para emergências.' }
        ],
        caracterizacao: 'Obras de terraplenagem executadas a céu aberto: limpeza de terreno, escavação, carga, transporte e espalhamento de solo, compactação, execução de drenagem e valas, pavimentação com blocos intertravados, formas de madeira e alvenaria de apoio. Uso de máquinas pesadas (escavadeira, pá carregadeira, motoniveladora, retroescavadeira e rolo compactador — confirmar a relação), caminhões basculantes e carretas, com circulação em vias internas não pavimentadas e em vias públicas. Instalações de apoio do canteiro: descrever escritório, vestiário, sanitários e local de refeições.',
        requisitosEspecificos: REQUISITOS_NR18_PGR,
        treinamentos: [
          ['Integração de segurança e treinamento admissional (NR-18) — todos os GHEs', 4, 'Admissional', 'SESMT', 30],
          ['NR-35 — Trabalho em altura (GHEs 01, 02, 03, 05, 07, 11, 13 e 14)', 8, 'Bienal', 'SESMT / instrutor qualificado', 30],
          ['Escavações e prevenção de soterramento — NR-18 (GHEs 01, 05, 11 e 14)', 4, 'Anual', 'Engenharia e SESMT', 30],
          ['Prevenção de atropelamento e circulação no canteiro (todos os GHEs de campo)', 2, 'Anual', 'SESMT', 30],
          ['Operação segura de máquinas autopropelidas — NR-11/NR-12 (GHE 10)', 16, 'Quando houver mudança', 'Gestor de frota e equipamentos', 60],
          ['Direção defensiva e jornada do motorista — Lei 13.103/2015 (GHEs 08 e 09)', 8, 'Anual', 'Gestor de frota e equipamentos', 60],
          ['Segurança em máquinas — serra circular e cortadora de blocos, NR-12 (GHEs 03 e 04)', 4, 'Quando houver mudança', 'SESMT', 60],
          ['Uso, guarda e conservação de EPI; proteção auditiva (PCA) e respiratória (PPR) — NR-06 (todos os GHEs de campo)', 2, 'Anual', 'SESMT', 60],
          ['Levantamento e transporte manual de cargas — NR-17 (GHEs 01, 03, 04 e 11)', 2, 'Anual', 'SESMT', 90],
          ['Calor e radiação solar: prevenção e primeiros sinais (todos os GHEs de campo)', 1, 'Anual', 'SESMT', 90],
          ['Fatores de risco psicossociais, liderança e prevenção do assédio (GHEs 05, 06, 07, 12 e 13)', 4, 'Anual', 'RH e SESMT', 90],
          ['Primeiros socorros e resposta a emergências (equipe designada)', 8, 'Anual', 'SESMT', 60]
        ],
        emergencia: {
          meiosPrimeirosSocorros: 'Kit de primeiros socorros em cada frente de serviço e nos veículos de apoio; trabalhadores capacitados em primeiros socorros em todos os turnos; contatos de emergência afixados (SAMU 192, Corpo de Bombeiros 193) e hospital de referência com atendimento de trauma e soro antiveneno (informar nome, endereço e rota); veículo disponível para remoção quando não houver socorro especializado.',
          procedimentoAbandono: 'Ao sinal de alarme (sirene ou rádio), interromper as atividades, desligar e afastar máquinas das bordas de escavações, seguir até o ponto de encontro sinalizado e aguardar a contagem pelo encarregado; acesso de socorro mantido sempre desobstruído.',
          medidasGrandeMagnitude: 'Cenários: soterramento em vala, tombamento de máquina, colisão grave em via pública, incêndio em máquina ou tanque de combustível e vazamento de óleo ou combustível. Acionar 193/192, isolar a área, não entrar em vala sem escoramento para resgate, usar extintor apenas em princípio de incêndio, conter vazamentos com kit de mitigação e comunicar a diretoria e o SESMT.',
          periodicidadeExercicios: 'Anual'
        }
      }, base);
      return dados;
    }
  },
  {
    id: 'nr18',
    nome: 'Construção civil — edificações (NR-18)',
    descricao: '11 GHEs de obra de edificação, com os projetos exigidos pela NR-18, plano de ação, treinamentos e emergência.',
    criar(base) {
      return montarModeloPGR({
        id: 'nr18', nome: 'Construção civil — edificações (NR-18)',
        catalogo: Object.assign({}, PERIGOS_TERRAPLENAGEM, PERIGOS_NR18), ghes: GHES_NR18, setorPadrao: 'Canteiro de obras',
        identificacao: { cnae: '41.20-4-00', atividadePrincipal: 'Construção de edifícios', grauRisco: '3' },
        regimeTrabalho: 'Informar a jornada (ex.: segunda a quinta 07h–17h; sexta 07h–16h; refeição 12h–13h).',
        caracterizacao: 'Obra de edificação em [informar: nº de pavimentos, área construída e etapa atual — fundação, estrutura, alvenaria, instalações ou acabamento]. Atividades: execução de estrutura de concreto armado (formas, armação e concretagem), alvenaria, instalações elétricas e hidráulicas, revestimentos, pintura e serviços em fachada. Equipamentos: grua ou guincho, elevador de obra, betoneira, serra circular, andaimes e ferramentas elétricas portáteis. Áreas de vivência: descrever instalações sanitárias, vestiário, local de refeições e alojamento, se houver.',
        requisitosEspecificos: REQUISITOS_NR18_PGR,
        treinamentos: [
          ['Treinamento admissional NR-18 (inicial) — todos os GHEs', 4, 'Admissional', 'SESMT', 15],
          ['Treinamento periódico NR-18 — todos os GHEs', 4, 'Bienal', 'SESMT', 365],
          ['NR-35 — Trabalho em altura (GHEs 01 a 10)', 8, 'Bienal', 'SESMT / instrutor qualificado', 30],
          ['Montagem e desmontagem de andaimes (GHE 09)', 8, 'Quando houver mudança', 'Engenharia e SESMT', 30],
          ['NR-10 — Segurança em instalações elétricas, curso básico (GHE 05)', 40, 'Bienal', 'Instrutor qualificado', 30],
          ['Operação de grua, guincho e elevador de obra; sinaleiro amarrador — NR-11/NR-18 (GHE 07)', 16, 'Quando houver mudança', 'Engenharia', 30],
          ['Segurança em máquinas — serra circular e betoneira, NR-12 (GHEs 02 e 03)', 4, 'Quando houver mudança', 'SESMT', 30],
          ['Uso, guarda e conservação de EPI; proteção respiratória e auditiva — NR-06 (todos os GHEs)', 2, 'Anual', 'SESMT', 60],
          ['Produtos químicos: FDS, rotulagem e proteção (GHEs 06 e 08)', 2, 'Anual', 'SESMT', 60],
          ['Ergonomia: levantamento de cargas e posturas — NR-17 (GHEs 01 a 04 e 08)', 2, 'Anual', 'SESMT', 90],
          ['Fatores de risco psicossociais, liderança e prevenção do assédio (GHEs 10 e 11)', 4, 'Anual', 'RH e SESMT', 90],
          ['Primeiros socorros, combate a princípio de incêndio e resgate em altura (equipe designada)', 8, 'Anual', 'SESMT', 60]
        ],
        emergencia: {
          meiosPrimeirosSocorros: 'Kit de primeiros socorros no canteiro e em pavimentos com frentes ativas; trabalhadores capacitados em primeiros socorros; contatos de emergência afixados (SAMU 192, Corpo de Bombeiros 193) e hospital de referência (informar nome, endereço e rota).',
          procedimentoAbandono: 'Alarme sonoro do canteiro; rotas de fuga sinalizadas e desobstruídas nos pavimentos; ponto de encontro externo; contagem pelos encarregados; elevador de obra não deve ser usado para evacuação em caso de incêndio.',
          medidasGrandeMagnitude: 'Cenários: queda de trabalhador em altura ou trabalhador suspenso no cinto (plano de resgate em altura com equipe e equipamentos), choque elétrico, desabamento de escoramento ou estrutura, queda de carga da grua, soterramento em escavação de fundação e incêndio. Acionar 193/192, isolar a área e desenergizar a instalação quando aplicável.',
          periodicidadeExercicios: 'Anual'
        }
      }, base);
    }
  },
  {
    id: 'nr22',
    nome: 'Mineração a céu aberto — pedreira / agregados (NR-22)',
    descricao: '10 GHEs de lavra e beneficiamento: explosivos, taludes, tráfego de mina, correias, sílica e ruído.',
    criar(base) {
      return montarModeloPGR({
        id: 'nr22', nome: 'Mineração a céu aberto (NR-22)',
        catalogo: Object.assign({}, PERIGOS_TERRAPLENAGEM, PERIGOS_NR18, PERIGOS_NR22), ghes: GHES_NR22, setorPadrao: 'Lavra / beneficiamento',
        identificacao: { cnae: '08.10-0-02', atividadePrincipal: 'Extração de granito e beneficiamento associado (confirmar o CNAE)', grauRisco: '4' },
        regimeTrabalho: 'Informar turnos e escalas da lavra e da planta de beneficiamento.',
        caracterizacao: 'Mina a céu aberto de rocha para produção de agregados: decapeamento, perfuração e desmonte por explosivos em bancadas, carregamento por escavadeiras e carregadeiras, transporte por caminhões fora de estrada até o britador primário, britagem, rebritagem, peneiramento e estocagem em pilhas, com expedição por caminhões. Informar: número e altura das bancadas, paiol de explosivos, planta de beneficiamento, oficina, subestação, áreas de vivência e eventual barragem ou bacia de decantação.',
        requisitosEspecificos: 'NR-22 — Mineração (nova redação dada pela Portaria MTE nº 225/2024, com cronograma ajustado pela Portaria MTE nº 1.344/2024; o gerenciamento de riscos ocupacionais está no item 22.4). Além da NR-01, o gerenciamento de riscos da mineração deve tratar, conforme aplicável:\n' +
          '• estabilidade de maciços, taludes e pilhas, com monitoramento geotécnico e plano de lavra;\n' +
          '• explosivos: armazenamento, transporte, plano de fogo e detonação por profissional habilitado;\n' +
          '• circulação e transporte na mina (vias, leiras, sinalização e regras de tráfego);\n' +
          '• máquinas, transportadores contínuos e beneficiamento; instalações elétricas;\n' +
          '• poeira mineral e proteção respiratória; ruído e vibração;\n' +
          '• atmosferas explosivas, deficiência de oxigênio e ventilação (lavra subterrânea);\n' +
          '• plano de emergência, incluindo cenários de ruptura de taludes e, se houver barragem, o Plano de Ação de Emergência (Lei nº 12.334/2010);\n' +
          '• CIPAMIN (Comissão Interna de Prevenção de Acidentes na Mineração).\n' +
          'Confirmar a numeração e os prazos de implementação no texto vigente da NR-22.',
        treinamentos: [
          ['Treinamento introdutório de segurança na mineração (NR-22) — todos os GHEs', 8, 'Admissional', 'SESMT', 15],
          ['Manuseio, transporte e uso de explosivos; plano de fogo (GHE 02)', 16, 'Anual', 'Engenheiro de minas', 30],
          ['Operação de equipamentos de mina e regras de tráfego — NR-11/NR-12 (GHEs 01, 03 e 04)', 16, 'Quando houver mudança', 'Gerente de mina', 30],
          ['Bloqueio e etiquetagem (LOTO) e segurança em correias e britadores — NR-12 (GHEs 05, 06 e 07)', 8, 'Anual', 'Manutenção e SESMT', 30],
          ['NR-33 — Espaços confinados: trabalhador autorizado e vigia (GHEs 05, 06 e 07)', 16, 'Anual', 'Instrutor qualificado', 30],
          ['NR-35 — Trabalho em altura (GHEs 01, 05, 06 e 07)', 8, 'Bienal', 'Instrutor qualificado', 30],
          ['NR-10 — Segurança em instalações elétricas (eletricistas do GHE 07)', 40, 'Bienal', 'Instrutor qualificado', 60],
          ['Proteção respiratória (PPR) e auditiva (PCA): uso e ensaio de vedação (todos os GHEs operacionais)', 2, 'Anual', 'SESMT', 30],
          ['Inspeção de taludes e reconhecimento de instabilidade (GHEs 02, 03, 04, 08 e 09)', 4, 'Anual', 'Geotecnia', 60],
          ['Fatores de risco psicossociais, liderança e prevenção do assédio (GHEs 08, 09 e 10)', 4, 'Anual', 'RH e SESMT', 90],
          ['Resposta a emergências e primeiros socorros (brigada)', 16, 'Anual', 'SESMT', 60]
        ],
        emergencia: {
          meiosPrimeirosSocorros: 'Ambulância ou veículo de resgate disponível na mina; socorristas capacitados por turno; kit de primeiros socorros e maca rígida nas frentes e na planta; contatos de emergência (SAMU 192, Bombeiros 193) e hospital de referência com atendimento de trauma (informar nome, endereço e rota).',
          procedimentoAbandono: 'Sinal sonoro e comunicação por rádio; rotas de fuga sinalizadas na planta; ponto de encontro definido para lavra e beneficiamento; contagem por turno; nas detonações, evacuação da área de segurança conforme o plano de fogo.',
          medidasGrandeMagnitude: 'Cenários: ruptura de talude ou bancada, ultralançamento ou detonação acidental, tombamento de caminhão fora de estrada, aprisionamento em correia ou soterramento em silo, incêndio em equipamento ou no paiol e, se houver, ruptura de barragem (seguir o Plano de Ação de Emergência). Acionar o plano interno, 193/192 e a Defesa Civil quando houver risco a terceiros.',
          periodicidadeExercicios: 'Anual'
        }
      }, base);
    }
  },
  {
    id: 'nr32',
    nome: 'Serviços de saúde — hospital / clínica (NR-32)',
    descricao: '12 GHEs assistenciais e de apoio: riscos biológicos, perfurocortantes, quimioterápicos, radiação e psicossociais.',
    criar(base) {
      return montarModeloPGR({
        id: 'nr32', nome: 'Serviços de saúde (NR-32)',
        catalogo: Object.assign({}, PERIGOS_TERRAPLENAGEM, PERIGOS_NR18, PERIGOS_NR22, PERIGOS_NR32), ghes: GHES_NR32, setorPadrao: 'Serviço de saúde',
        jornada: 'Plantões e turnos (informar escala, ex.: 12x36)',
        identificacao: { cnae: '86.10-1-01', atividadePrincipal: 'Atividades de atendimento hospitalar (confirmar o CNAE)', grauRisco: '3' },
        regimeTrabalho: 'Informar turnos e escalas (ex.: plantões 12x36 diurnos e noturnos; administrativo 08h–17h).',
        caracterizacao: 'Estabelecimento de saúde com [informar: número de leitos, unidades de internação, UTI, centro cirúrgico, pronto atendimento, laboratório, imagem, farmácia, central de material e esterilização, lavanderia, nutrição e áreas administrativas]. Informar o perfil epidemiológico relevante (ex.: atendimento de doenças respiratórias, tuberculose) e se há preparo de quimioterápicos e uso de radiações ionizantes.',
        requisitosEspecificos: 'NR-32 — Serviços de saúde (alterada pela Portaria MTP nº 806/2022). Além da NR-01, o PGR deve contemplar:\n' +
          '• identificação dos riscos biológicos mais prováveis, considerando as fontes de exposição, as vias de transmissão e a persistência do agente no ambiente, a localização geográfica, as características do serviço e os dados epidemiológicos;\n' +
          '• relação dos trabalhadores expostos por setor e atividade;\n' +
          '• inventário dos produtos químicos com as fichas com dados de segurança (FDS), incluindo os quimioterápicos antineoplásicos;\n' +
          '• programa de vacinação (hepatite B, tétano, difteria e outras indicadas), com registro e comprovante ao trabalhador;\n' +
          '• Plano de Prevenção de Riscos de Acidentes com Materiais Perfurocortantes (Anexo III), elaborado por comissão gestora multidisciplinar;\n' +
          '• plano de proteção radiológica (normas da CNEN e da ANVISA) onde houver radiações ionizantes;\n' +
          '• integração com o PCMSO: protocolo de atendimento à exposição acidental a material biológico (quimioprofilaxia e acompanhamento sorológico);\n' +
          '• capacitação inicial e continuada dos trabalhadores.\n' +
          'Confirmar a numeração dos itens no texto vigente da NR-32.',
        treinamentos: [
          ['Capacitação inicial NR-32: riscos biológicos, precauções e uso de EPI — todos os GHEs', 4, 'Admissional', 'SESMT e CCIH', 15],
          ['Capacitação continuada NR-32 — todos os GHEs', 2, 'Anual', 'SESMT e CCIH', 365],
          ['Prevenção de acidentes com perfurocortantes e conduta pós-exposição (GHEs 01 a 04, 07 e 08)', 2, 'Anual', 'Comissão gestora de perfurocortantes', 30],
          ['Proteção respiratória: uso de PFF2/N95 e ensaio de vedação (GHEs 01 a 05)', 2, 'Anual', 'SESMT', 30],
          ['Manipulação segura de quimioterápicos antineoplásicos e kit de derramamento (GHE 06 e enfermagem da oncologia)', 4, 'Anual', 'Farmácia e SESMT', 30],
          ['Proteção radiológica (GHE 05 e equipe do centro cirúrgico)', 4, 'Anual', 'Supervisor de proteção radiológica', 60],
          ['Movimentação e transferência segura de pacientes — NR-17 (GHEs 01, 02, 05 e 10)', 4, 'Anual', 'SESMT e fisioterapia', 60],
          ['Produtos químicos, resíduos de serviços de saúde e higienização (GHEs 07 e 08)', 2, 'Anual', 'Hotelaria e SESMT', 60],
          ['Segurança em máquinas de lavanderia e cozinha — NR-12 (GHEs 08 e 09)', 2, 'Quando houver mudança', 'Manutenção e SESMT', 60],
          ['Prevenção da violência no atendimento e fatores psicossociais (todos os GHEs)', 2, 'Anual', 'RH e SESMT', 90],
          ['Prevenção e combate a incêndio e abandono com pacientes (brigada)', 8, 'Anual', 'SESMT', 60]
        ],
        emergencia: {
          meiosPrimeirosSocorros: 'Atendimento pelo próprio serviço de saúde; protocolo de exposição a material biológico com atendimento imediato e quimioprofilaxia disponível 24 h; fluxo de comunicação ao SESMT e emissão de CAT.',
          procedimentoAbandono: 'Plano de abandono considerando pacientes acamados e dependentes de equipamentos: ordem de evacuação horizontal antes da vertical, macas de evacuação, responsáveis por setor e ponto de encontro; brigada de incêndio dimensionada para todos os turnos.',
          medidasGrandeMagnitude: 'Cenários: incêndio em áreas com oxigênio, vazamento de gases medicinais, derramamento de quimioterápico, acidente radiológico, falta de energia em áreas críticas (geradores e no-break) e atendimento a múltiplas vítimas. Seguir os planos específicos e acionar o Corpo de Bombeiros (193) e a Defesa Civil quando necessário.',
          periodicidadeExercicios: 'Anual'
        }
      }, base);
    }
  }
];
