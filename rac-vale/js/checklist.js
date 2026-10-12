/*
 * Check Básico de Campo – Auditorias de RAC.
 * Itens transcritos do arquivo "1- Check list - RAC.xlsx", com correção
 * apenas de erros de digitação e de cópia (sem mudar o sentido).
 * Os títulos de cada RAC seguem a PNR-000069 Rev. 11.
 * Para alterar o checklist, edite somente esta lista: o id de cada item
 * não deve mudar depois que houver auditorias registradas.
 */
const CHECKLIST_VERSAO = '2026-10 (Check Básico de Campo)';

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
  sec.itens = sec.itens.map((texto, i) => ({ id: `${sec.id}-${i + 1}`, num: i + 1, texto }));
});

function secaoPorId(id) {
  return CHECKLIST_RAC.find((s) => s.id === id);
}

// Seções avaliadas numa auditoria: os RAC escolhidos + observações gerais.
function secoesDaAuditoria(aud) {
  return CHECKLIST_RAC.filter((s) => s.sempre || (aud.racs || []).includes(s.id));
}
