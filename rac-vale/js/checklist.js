/*
 * Check Básico de Campo – Auditorias de RAC.
 * RAC 01, 02, 03, 04, 05, 07, 08, 10 e observações: itens transcritos do
 * arquivo "1- Check list - RAC.xlsx", com correção apenas de erros de
 * digitação e de cópia (sem mudar o sentido).
 * RAC 06, 09, 11, 12 e 13: montados a partir da PNR-000069 Rev. 11 no mesmo
 * padrão (itens verificáveis em campo, com prioridade aos requisitos
 * prioritários do Anexo VI). Cada item traz em "ref" o requisito de origem.
 * Os títulos de cada RAC seguem a PNR-000069 Rev. 11.
 * Para alterar o checklist, edite somente esta lista: o id de cada item
 * não deve mudar depois que houver auditorias registradas.
 */
const CHECKLIST_VERSAO = '2026-10 rev. 2 (Check Básico de Campo + RAC 06, 09, 11, 12 e 13)';

const CHECKLIST_RAC = [
  {
    id: 'RAC01',
    titulo: 'RAC 01 – Trabalhos em Altura',
    itens: [
      'Inspeção de escadas com utilização de checklist.',
      'Inspeção de Plataforma de Trabalho Aéreo (PTA) com uso de checklist.',
      'ART para atividade de trabalho em altura.',
      'Verificação de crachá e passaporte que demonstrem capacitação para realização de trabalho em altura.',
      'Amarração de ferramentas na realização de trabalho em altura.',
      'Os EPIs para realização de trabalho em altura estão em conformidade e são inspecionados por checklist.',
      'Planos de manutenção das Plataformas de Trabalho Aéreo (PTA) e ordens de serviço.',
      'Manutenção em dia (horímetro x plano de manutenção).'
    ]
  },
  {
    id: 'RAC02',
    titulo: 'RAC 02 – Veículos Automotores Leves',
    itens: [
      'Integridade dos veículos.',
      'Inspeção dos veículos com uso de checklist.',
      'Mapas de via.',
      'Verificação de crachá e passaporte que demonstrem capacitação para condução de veículos.',
      'Estacionamento demarcado e, se possível, com as devidas sinalizações de segregação.',
      'Planos de manutenção dos veículos e ordens de serviço.',
      'Manutenção em dia (km x plano de manutenção).'
    ]
  },
  {
    id: 'RAC03',
    titulo: 'RAC 03 – Operação de Equipamentos Móveis',
    itens: [
      'Integridade dos equipamentos.',
      'Inspeção dos equipamentos com uso de checklist.',
      'Verificação de crachá que demonstre capacitação para operação do equipamento e treinamento no RAC.',
      'Estacionamento demarcado e, se possível, com as devidas sinalizações de segregação.',
      'Planos de manutenção dos equipamentos e ordens de serviço.',
      'Manutenção em dia (horímetro x plano de manutenção).'
    ]
  },
  {
    id: 'RAC04',
    titulo: 'RAC 04 – Bloqueio, Identificação e Zero Energia',
    itens: [
      'Cadeados de 6 pinos e resistentes a impactos.',
      'Etiquetas atendendo aos requisitos do procedimento unificado (rastreio e modelo).',
      'Etiquetas individuais devem ter todos os campos de autorização preenchidos.',
      'PTS – Permissão de Trabalho Seguro para as atividades obrigatórias.',
      'Verificação de crachá e passaporte que demonstrem capacitação para realização de bloqueio.',
      'ART deve descrever o passo a passo do bloqueio.'
    ]
  },
  {
    id: 'RAC05',
    titulo: 'RAC 05 – Içamento de Carga',
    itens: [
      'Integridade dos acessórios de içamento com uso do checklist.',
      'Integridade do equipamento de içamento com uso do checklist.',
      'Disponibilidade de quebra-quinas nos modelos sugeridos.',
      'Plano de içamento para as atividades.',
      'Verificação de crachá e passaporte que demonstrem capacitação para atividades de içamento.',
      'Plano de manutenção e ordens de serviço dos equipamentos de içamento (caminhão veicular articulado).',
      'Laudo de integridade do equipamento de içamento (caminhão veicular articulado) por profissional habilitado.',
      'Manutenção em dia (horímetro x plano de manutenção).'
    ]
  },
  {
    id: 'RAC06',
    titulo: 'RAC 06 – Espaços Confinados',
    itens: [
      { texto: 'Espaço confinado com placa de identificação e bloqueio físico contra acesso não autorizado.', ref: '6.6.a (prioritário)' },
      { texto: 'Permissão de entrada (PNR-000031 e anexo aplicável) emitida e preenchida.', ref: '6.7.1.e; 6.9.a.I' },
      { texto: 'Medidor multigases calibrado e com teste de resposta (bump test) antes do uso.', ref: '6.7.1.d (prioritário)' },
      { texto: 'Monitoramento contínuo da atmosfera durante a permanência, com oxigênio entre 19,5% e 23%.', ref: '6.7.3.b; 6.7.3.d (prioritário)' },
      { texto: 'Ventilação ou exaustão em funcionamento e verificada continuamente.', ref: '6.7.3.f (prioritário)' },
      { texto: 'Bloqueio das fontes de energia conforme RAC 04 (desconexão física, raquete ou flange cego, ou duplo bloqueio e dreno).', ref: '6.7.3.a' },
      { texto: 'Vigia presente na entrada, dedicado só a essa função, com controle de entrada e saída dos trabalhadores.', ref: '6.9.b; 6.7.3.i' },
      { texto: 'Comunicação funcionando entre equipe, vigia e equipe de resgate.', ref: '6.7.3.h' },
      { texto: 'Plano de resgate específico para o espaço, com equipamentos de resgate disponíveis.', ref: '6.7.4.a; 6.7.4.b (prioritário)' },
      { texto: 'ART descrevendo preparação, entrada e atividades no espaço confinado.', ref: '6.7.2.a' },
      { texto: 'Verificação de crachá e passaporte que demonstrem capacitação em RAC 06 (supervisor de entrada, vigia e executantes).', ref: '6.8' }
    ]
  },
  {
    id: 'RAC07',
    titulo: 'RAC 07 – Proteção de Máquinas',
    itens: [
      'Integridade das máquinas e equipamentos com uso de checklist.',
      'Apreciação de riscos (HRN).',
      'Plano de manutenção e ordens de serviço das máquinas e equipamentos (sondas e serras).',
      'Verificação de crachá e passaporte que demonstrem capacitação para operação dos equipamentos e treinamento no RAC.'
    ]
  },
  {
    id: 'RAC08',
    titulo: 'RAC 08 – Atividades no Terreno',
    itens: [
      'Avaliação do cenário com uso do Anexo I do Procedimento de RAC 08 da Sondagem e Geociências.',
      'ART deve descrever os cenários típicos de RAC 08.'
    ]
  },
  {
    id: 'RAC09',
    titulo: 'RAC 09 – Explosivos',
    itens: [
      { texto: 'Plano de fogo prévio elaborado e assinado pelo responsável técnico para o desmonte.', ref: '9.7.1.j (prioritário); 9.7.5.1' },
      { texto: 'Sistema de detonação com espoleta eletrônica conforme o tipo de mina, sem uso de estopim.', ref: '9.6.f (prioritário)' },
      { texto: 'Ferramentas e acessórios antifaísca no manuseio de explosivos.', ref: '9.6.b' },
      { texto: 'Paiol trancado, sinalizado e segregado, com dispositivo antiestático na entrada e controle de inventário.', ref: '9.6.c; 9.6.d; 9.7.1.a (prioritário); 9.7.2.b' },
      { texto: 'Veículo de transporte de explosivos exclusivo, sinalizado, com dissipador de energia estática e corta-chama, inspecionado com uso de checklist.', ref: '9.6.e' },
      { texto: 'Bloqueio físico da área de carregamento e da Zona de Exclusão de Detonação, com sinalização na entrada da mina (rádio, blaster e horários).', ref: '9.7.4.1.a; 9.7.4.1.d; 9.7.4.2.b (prioritários)' },
      { texto: 'Manuseio de explosivos na superfície suspenso durante alerta vermelho ou tempestade com raios.', ref: '9.7.1.b (prioritário)' },
      { texto: 'Verificação de crachá e passaporte que demonstrem capacitação em RAC 09 e habilitação do blaster conforme legislação local.', ref: '9.8' }
    ]
  },
  {
    id: 'RAC10',
    titulo: 'RAC 10 – Trabalhos em Eletricidade',
    itens: [
      'EPIs dos eletricistas devem ser específicos para atividades elétricas.',
      'Ferramentas manuais utilizadas pelos eletricistas devem ser isoladas, com identificação de tensão.',
      'Laudos das ferramentas manuais.',
      'Quadros e painéis elétricos devem possuir sinalização de tensão e perigo.',
      'Não utilização de adornos.'
    ]
  },
  {
    id: 'RAC11',
    titulo: 'RAC 11 – Metal Líquido',
    itens: [
      { texto: 'Traje aluminizado, escudo de respingos e óculos especiais em uso nas atividades com risco de projeção de metal ou escória.', ref: '11.5.2.b; 11.5.2.e; 11.5.2.f' },
      { texto: 'Ferramentas de amostragem, remoção de escória e vazamento com comprimento adequado, livres de ferrugem e umidade.', ref: '11.5.2.c; 11.5.2.g' },
      { texto: 'Equipamentos de transferência inspecionados com uso de checklist, com sinalização sonora e visual durante a transferência.', ref: '11.6.4.a; 11.5.3.c' },
      { texto: 'Área sem acúmulo de água, sem extintores à base de água por perto e sem produtos inflamáveis ou combustíveis.', ref: '11.5.1.b; 11.5.1.d; 11.6.1.a' },
      { texto: 'Detector de gás fixo (CO, SO₂) instalado e detector pessoal em uso, quando aplicável.', ref: '11.5.1.g; 11.5.2.d' },
      { texto: 'Zonas de segurança demarcadas e placa de proibição de acesso a pessoas não autorizadas.', ref: '11.6.1.b; 11.5.5.c' },
      { texto: 'Plano de manutenção dos equipamentos críticos e ordens de serviço.', ref: '11.6.1.c' },
      { texto: 'Plano de emergência com cenário de metal e escória líquidos e rotas de fuga sinalizadas.', ref: '11.6.2.a; 11.6.2.b; 11.5.1.c' }
    ]
  },
  {
    id: 'RAC12',
    titulo: 'RAC 12 – Trabalho a Quente',
    itens: [
      { texto: 'Autorização de trabalho a quente ou PTS para áreas não destinadas e áreas classificadas.', ref: '12.7.4.a (prioritário)' },
      { texto: 'Área livre de 15 m sem materiais combustíveis ou, na impossibilidade, isolamento com barreiras não combustíveis e mantas térmicas.', ref: '12.6.3.b; 12.6.3.c (prioritário); 12.6.3.d' },
      { texto: 'Sinalização de alerta de trabalho a quente.', ref: '12.6.3.a (prioritário)' },
      { texto: 'Extintor destinado à tarefa e vigia exclusivo, com monitoramento de no mínimo 1 hora após o término.', ref: '12.6.1.a; 12.7.3' },
      { texto: 'Máquina de solda, maçarico, mangueiras e reguladores inspecionados com uso de checklist (VRD na solda elétrica; corta-chama e mangueira sem emendas no oxicorte).', ref: '12.7.1.b; 12.6.6; 12.6.7' },
      { texto: 'Cilindros travados no dispositivo de transporte, a no mínimo 3 m do ponto de aquecimento.', ref: '12.6.2.a; 12.7.1.d; 12.7.1.e' },
      { texto: 'Medição de gases inflamáveis antes e durante a atividade, quando aplicável (LII acima de 1% impede o início).', ref: '12.6.1.d; 12.6.1.e; 12.6.5.f' },
      { texto: 'Exaustão ou ventilação de fumos metálicos onde não houver ventilação natural.', ref: '12.6.1.f (prioritário)' },
      { texto: 'Verificação de crachá e passaporte que demonstrem capacitação no procedimento de trabalho a quente (executantes e vigias).', ref: '12.8' }
    ]
  },
  {
    id: 'RAC13',
    titulo: 'RAC 13 – Abertura de Linhas e Equipamentos',
    itens: [
      { texto: 'PTS e ART descrevendo os passos da abertura, os pontos de abertura e os EPIs de cada fase.', ref: '13.7.6.a' },
      { texto: 'Bloqueio da linha conforme RAC 04 e a hierarquia da norma, sem uso de válvula de retenção, de controle ou automática.', ref: '13.7.2.a; 13.7.2.b; 13.7.2.c (prioritários)' },
      { texto: 'Linha despressurizada, drenada, ventilada, purgada e lavada antes da abertura, com drenagem para local seguro.', ref: '13.7.3.a; 13.7.3.b (prioritários)' },
      { texto: 'Avaliação da atmosfera antes da abertura e periodicamente, conforme o planejamento.', ref: '13.7.3.e (prioritário)' },
      { texto: 'Área isolada com barreira rígida em torno dos pontos de abertura.', ref: '13.7.4 (prioritário)' },
      { texto: 'Pontos de abertura demarcados fisicamente no campo.', ref: '13.7.5.a (prioritário)' },
      { texto: 'Para produtos inflamáveis: aterramento da linha verificado e ferramentas, iluminação e instrumentos certificados para área classificada.', ref: '13.7.3.c; 13.6.2 (prioritários)' },
      { texto: 'Verificação de crachá e passaporte que demonstrem capacitação em abertura de linhas e equipamentos.', ref: '13.8.a' }
    ]
  },
  {
    id: 'OBS',
    titulo: 'Observações gerais',
    sempre: true,
    itens: [
      'Entrevistas realizadas com os empregados.',
      'Equipamentos interditados devidamente bloqueados.',
      'Organização e limpeza do ambiente auditado (condição primordial para o início das avaliações).',
      'Requisitos legais em conformidade, mesmo sendo auditoria de RAC, demonstrando nosso compromisso com a segurança.',
      'Instalações sanitárias limpas e em condições de uso.',
      'Documentação sem rasuras (documentos rasurados são pontuados como não conformes).'
    ]
  }
];

// Gera ids estáveis por item: RAC01-1, RAC01-2...
CHECKLIST_RAC.forEach((sec) => {
  sec.itens = sec.itens.map((item, i) => {
    const base = typeof item === 'string' ? { texto: item } : item;
    return { ...base, id: `${sec.id}-${i + 1}`, num: i + 1 };
  });
});

function secaoPorId(id) {
  return CHECKLIST_RAC.find((s) => s.id === id);
}

// Seções avaliadas numa auditoria: os RAC escolhidos + observações gerais.
function secoesDaAuditoria(aud) {
  return CHECKLIST_RAC.filter((s) => s.sempre || (aud.racs || []).includes(s.id));
}
