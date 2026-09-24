/* Dados de apoio ao módulo de Investigação de Acidente de Trabalho (RIAT). */

const TIPOS_ACIDENTE_INVESTIGACAO = ['Típico', 'De Trajeto', 'Doença Ocupacional'];

const GRAVIDADES_ACIDENTE_INVESTIGACAO = ['Sem Afastamento', 'Com Afastamento', 'Fatal'];

/* As 15 perguntas investigativas que orientam a busca das causas raízes do
 * acidente (fatores imediatos, fatores básicos e falhas de gestão), no
 * padrão de um Relatório de Investigação de Acidente de Trabalho (RIAT). */
const PERGUNTAS_INVESTIGACAO = [
  'O acidentado estava utilizando os EPIs exigidos para a atividade no momento do acidente?',
  'Os EPIs utilizados estavam em boas condições de conservação e uso?',
  'O acidentado possuía treinamento específico para a atividade que realizava?',
  'Havia procedimento operacional ou instrução de trabalho definida para a atividade?',
  'A atividade exigia PT/APR ou outra autorização formal de trabalho, e ela estava emitida?',
  'As condições do ambiente (iluminação, piso, organização, ruído) contribuíram para o acidente?',
  'A máquina, equipamento ou ferramenta envolvida estava em condições adequadas de uso?',
  'Os dispositivos de proteção (proteções de máquina, travas, sistemas de segurança) estavam instalados e funcionando?',
  'Houve pressão de tempo, meta de produção ou improviso que influenciou a forma de execução da tarefa?',
  'Houve desvio do procedimento padrão por parte do acidentado ou de terceiros envolvidos?',
  'Existem registros anteriores (inspeções, quase-acidentes, reclamações) apontando risco semelhante nesta atividade ou local?',
  'A supervisão estava presente ou disponível para orientar a atividade no momento do acidente?',
  'O acidente foi comunicado imediatamente à liderança e ao SESMT?',
  'Os primeiros socorros foram prestados de forma adequada e em tempo hábil?',
  'Existem outros trabalhadores atualmente expostos ao mesmo risco que causou este acidente?'
];
