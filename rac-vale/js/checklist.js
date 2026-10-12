/*
 * Check Básico de Campo – Auditorias de RAC.
 *
 * Origem dos itens:
 * - Itens iniciais dos RAC 01, 02, 03, 04, 05, 07, 08, 10 e observações:
 *   arquivo "1- Check list - RAC.xlsx", com correção apenas de erros de
 *   digitação e de cópia.
 * - Itens iniciais dos RAC 06, 09, 11, 12 e 13 e todos os itens
 *   complementares: PNR-000069 Rev. 11 (protocolo de requisitos),
 *   selecionando o que é verificável em campo e priorizando os requisitos
 *   prioritários do Anexo VI.
 *
 * Campos de cada item:
 *   texto – o que o auditor verifica;
 *   ref   – requisito de origem na PNR-000069 Rev. 11 ("(prioritário)" =
 *           requisito prioritário do Anexo VI);
 *   prazo – prazo de implementação do Anexo V: data AAAA-MM-DD, ou 'plano'
 *           quando o Anexo V remete ao plano de ação da área.
 *
 * Para alterar o checklist, edite somente esta lista. Depois de haver
 * auditorias registradas, não mude a ordem dos itens existentes (o
 * identificador de cada resposta depende da posição); acrescente itens
 * novos no fim da seção.
 */
const CHECKLIST_VERSAO = '2026-10 rev. 4 (Check Básico de Campo ampliado – PNR-000069 Rev. 11)';

const req = (texto, ref = '', prazo = '') => ({ texto, ref, prazo });

const CHECKLIST_RAC = [
  {
    id: 'RAC01',
    titulo: 'RAC 01 – Trabalhos em Altura',
    itens: [
      req('Inspeção de escadas com utilização de checklist.', '1.6.5; 1.6.6; 1.7.1.b'),
      req('Inspeção de Plataforma de Trabalho Aéreo (PTA) com uso de checklist.', '1.6.7; 1.6.8; 1.7.1.b'),
      req('ART para atividade de trabalho em altura.', '1.7.1.e (prioritário)', '2025-06-30'),
      req('Verificação de crachá e passaporte que demonstrem capacitação para realização de trabalho em altura.', '1.8.1.a'),
      req('Amarração de ferramentas na realização de trabalho em altura.', '1.6.1.b'),
      req('Os EPIs para realização de trabalho em altura estão em conformidade e são inspecionados por checklist.', '1.7.1.b; 1.7.1.d'),
      req('Planos de manutenção das Plataformas de Trabalho Aéreo (PTA) e ordens de serviço.', 'Requisitos gerais b; 1.6.8'),
      req('Manutenção em dia (horímetro x plano de manutenção).', 'Requisitos gerais b'),
      req('ART considera a zona livre de queda (ZLQ), evitando que o trabalhador colida com o nível inferior em caso de queda.', '1.7.1.f (prioritário)', '2025-06-30'),
      req('Isolamento e sinalização da área com barreiras físicas (cerquite, pedestais, cones, pontaletes), sem uso de fita plástica.', '1.6.1.a'),
      req('Guarda-corpo com travessão superior e intermediário, e rodapé, nos locais com risco de queda de pessoas e de objetos.', '1.6.2.a; 1.6.1.c'),
      req('Elemento de ligação conectado a ponto de ancoragem durante toda a atividade, sem uso de cinturão abdominal.', '1.7.1.c; 1.7.1.d'),
      req('Pontos de ancoragem projetados por profissional habilitado e com inspeção periódica em intervalo de até 12 meses.', '1.7.4.b; 1.7.4.g'),
      req('Andaime formalmente liberado (conformidade com o projeto, documento de liberação e placa de liberado/não liberado) e com placa de carga máxima.', '1.7.2.d; 1.6.4.f'),
      req('Andaime com alçapão e barreira fechados, escada de acesso incorporada, sapatas em base firme e rodízios travados (quando móvel).', '1.7.2.c; 1.6.4.a; 1.6.4.b; 1.6.4.c'),
      req('Andaime móvel não é movimentado com pessoas, equipamentos, ferramentas ou objetos em cima.', '1.7.2.e'),
      req('Dispensa do cinto em andaime somente quando todos os requisitos do Anexo I (andaime seguro) são atendidos.', '1.7.2.g (prioritário); Anexo I', '2025-06-30'),
      req('Aberturas de piso, grades, guarda-corpos ou alçapões removidos isoladas com barreira física, rígida e fixa, e sinalizadas.', '1.7.7.b (prioritário); 1.7.7.e'),
      req('Escada vertical fixa acima de 1,80 m com linha de vida e trava-quedas, trava-quedas retrátil, ancoragem com talabarte duplo ou gaiola aceita pela legislação.', '1.6.5.b'),
      req('Plano de emergência com cenário de resgate em altura, equipe preparada e equipamentos de resgate disponíveis.', '1.7.5.a'),
      req('Operadores de PTA e inspetores de andaime capacitados.', '1.8.1.b; 1.8.1.c', '2025-06-30'),
      req('Remoção de piso, grade, guarda-corpo ou alçapão prevista no planejamento e aprovada pelo dono da área por PTS com análise de risco.', '1.7.7.a'),
      req('Alçapões inventariados e com uso controlado por cadeado.', '1.7.7.g'),
      req('Cesto suspenso usado somente em resgate e emergência; cestos acoplado e suspenso com braços estabilizadores totalmente abertos.', '1.7.3.a; 1.7.3.b'),
      req('Entrada e saída do cesto da PTA elevado com elemento de ligação conectado a sistema de ancoragem projetado.', '1.7.3.c')
    ]
  },
  {
    id: 'RAC02',
    titulo: 'RAC 02 – Veículos Automotores Leves',
    itens: [
      req('Integridade dos veículos.', '2.6.2'),
      req('Inspeção dos veículos com uso de checklist.', '2.7.c.II (prioritário)'),
      req('Mapas de via.', '2.6.1.a; 2.7.b (prioritário)'),
      req('Verificação de crachá e passaporte que demonstrem capacitação para condução de veículos.', '2.8'),
      req('Estacionamento demarcado e, se possível, com as devidas sinalizações de segregação.', '2.6.1.d'),
      req('Planos de manutenção dos veículos e ordens de serviço.', '2.6.2.b (prioritário)'),
      req('Manutenção em dia (km x plano de manutenção).', '2.6.2.b (prioritário)'),
      req('Telemetria instalada e funcionando, com verificação periódica dos dados e política de consequências para violações.', '2.6.3.i; 2.6.4.i (prioritário); 2.7.c.IV'),
      req('Sistema de detecção de sonolência instalado e funcionando, com tratativa dos desvios.', '2.6.4.j (prioritário); 2.7.c.V; Anexo VIII'),
      req('Plano de fadiga implementado.', '2.7.c.III (prioritário)'),
      req('Cinto de segurança de 3 pontos e encosto de cabeça para os ocupantes (vans e ônibus: 3 pontos nos bancos dianteiros e no mínimo 2 nos demais).', '2.6.3.a; 2.6.3.b; 2.6.3.c'),
      req('Todos os ocupantes com cinto afivelado e número de passageiros compatível com os cintos disponíveis.', '2.7.a.III; 2.7.a.IV'),
      req('Alarme sonoro de ré e sensor ou câmera de ré funcionando.', '2.6.4.g; 2.6.4.h'),
      req('Triângulos refletivos no veículo (e cones, para acesso à área de lavra).', '2.6.4.f; 2.6.5.f'),
      req('Faróis acesos durante a circulação e respeito aos limites de velocidade sinalizados.', '2.7.a.V; 2.7.a.VI'),
      req('Celular, fone de ouvido e TV não utilizados com o veículo fora de local seguro de estacionamento.', '2.7.a.VII'),
      req('Veículo estacionado com freio de mão, motor desligado e chave retirada; calços nos pneus de vans, micro-ônibus e ônibus.', '2.7.a.VIII; 2.7.a.IX'),
      req('Em área de lavra: bandeirola com luz LED, luz giratória, rádio bidirecional ligado, faixa refletiva e alerta de proximidade com equipamentos pesados.', '2.6.5.o; 2.6.5.p; 2.6.5.q; 2.6.5.r; 2.6.5.s (prioritário); 2.7.a.X'),
      req('Cargas e bagagens amarradas ou acondicionadas com segurança.', '2.7.a.XI; 2.7.a.XII'),
      req('Regras de passagem em nível respeitadas (parar fora do gabarito, abrir os vidros, olhar os dois lados, nunca parar sobre a PN).', '2.7.a.XIII', '2025-06-30'),
      req('Segregação entre pedestres e veículos nas vias operacionais (barreiras, lombadas, cancelas, passarelas).', '2.6.1.b (prioritário)'),
      req('Sinalização de velocidade máxima nas vias internas.', '2.6.1.c')
    ]
  },
  {
    id: 'RAC03',
    titulo: 'RAC 03 – Operação de Equipamentos Móveis',
    itens: [
      req('Integridade dos equipamentos.', '3.6.2'),
      req('Inspeção dos equipamentos com uso de checklist.', '3.7.c.VI (prioritário)'),
      req('Verificação de crachá que demonstre capacitação para operação do equipamento e treinamento no RAC.', '3.8'),
      req('Estacionamento demarcado e, se possível, com as devidas sinalizações de segregação.', '3.6.1.e'),
      req('Planos de manutenção dos equipamentos e ordens de serviço.', '3.6.2.l (prioritário)'),
      req('Manutenção em dia (horímetro x plano de manutenção).', '3.6.2.l (prioritário)'),
      req('Leiras com altura mínima de metade do diâmetro do maior pneu nas vias, escavações, áreas com risco de queda e ao redor de equipamentos parados.', '3.6.1.a (prioritário)'),
      req('Segregação entre pessoas e equipamentos móveis (barreiras, cancelas, caminhos seguros).', '3.6.1.e.I (prioritário)'),
      req('Sinalização e isolamento do perímetro de atuação do equipamento e dos implementos durante a movimentação de materiais.', '3.6.1.e.III (prioritário)'),
      req('Controle de acesso de equipamentos, veículos e pessoas às áreas de lavra e áreas restritas definidas.', '3.7.c.I (prioritário); 3.7.c.II'),
      req('Sistema de alerta de proximidade entre equipamentos instalado e funcionando.', '3.6.3.g (prioritário)'),
      req('Sistema de detecção de sonolência funcionando, com verificação e tratativa dos desvios.', '3.6.3 (prioritário); 3.7.c.IV'),
      req('Monitoramento de pressão e temperatura dos pneus, com tratativa dos desvios (equipamentos de grande porte).', '3.6.3.p (prioritário); 3.7.c.V'),
      req('Telemetria funcionando, com verificação periódica dos dados e política de consequências.', '3.6.3.n; 3.7.c.III'),
      req('Equipamento com cabine, ROPS/FOPS, cinto de segurança, para-brisa, alarme e luz de ré e rádio bidirecional.', '3.6.2.g; 3.6.2.h; 3.6.2.j; 3.6.3'),
      req('Sinalização de capacidade de carga e tara, identificação externa visível e aviso nos pontos de articulação.', '3.6.2.b; 3.6.2.e; 3.6.2.f'),
      req('Calços nos pneus em manutenção, estacionamento e quando o operador sai da cabine com o equipamento ligado.', '3.7.c.XIII'),
      req('Sistema automático de detecção e supressão de incêndio mantido e extintor portátil disponível.', '3.6.6.c; 3.6.6.d; 3.7.c.X'),
      req('Faróis acesos, sem uso de celular em operação e colete refletivo para quem circula nas vias e na lavra.', '3.7.a.I; 3.7.a.II; 3.7.a.IV'),
      req('Programa de testagem de álcool e drogas implementado.', '3.7.c.XVI', '2025-06-30'),
      req('Caminhões fora de estrada com sistema anticolisão com frenagem automática ou, até o prazo, com as condicionantes do Anexo V (câmeras, rádio, luz de ré, segregação, controle de acesso e plano de trânsito).', '3.6.3.h', '2028-12-20'),
      req('Retarder hidráulico nos caminhões com PBT a partir de 30 t usados em declives acentuados.', '3.6.3.w', '2027-05-01'),
      req('Movimentação sob linha elétrica energizada não isolada a menos de 6 m supervisionada por profissional de elétrica e técnico de mina, com rádio.', '3.7.c.XV'),
      req('Manipulador de pneus (tire handler) usado para pneus com diâmetro a partir de 1.350 mm.', '3.7.c.IX'),
      req('Reboque e desatolamento conforme procedimento (rebocador ou prancha; cabos de fibra com anti-chicoteamento homologados).', '3.7.c.XI; 3.7.c.XII')
    ]
  },
  {
    id: 'RAC04',
    titulo: 'RAC 04 – Bloqueio, Identificação e Zero Energia',
    itens: [
      req('Cadeados de 6 pinos e resistentes a impactos.', '4.6.f.I'),
      req('Etiquetas atendendo aos requisitos do procedimento unificado (rastreio e modelo).', '4.6.g'),
      req('Etiquetas individuais devem ter todos os campos de autorização preenchidos.', '4.6.g.III'),
      req('PTS – Permissão de Trabalho Seguro para as atividades obrigatórias.', 'PNR-000031'),
      req('Verificação de crachá e passaporte que demonstrem capacitação para realização de bloqueio.', '4.9; 4.10.2.b'),
      req('ART deve descrever o passo a passo do bloqueio.', '4.8 (prioritário)'),
      req('Matriz de bloqueio atualizada com todas as fontes de energia e pontos de bloqueio do equipamento.', '4.7.d (prioritário)'),
      req('Procedimento específico de bloqueio do equipamento disponível no local.', '4.8 (prioritário)'),
      req('Cada executante com seu próprio cadeado e etiqueta no dispositivo de seccionamento ou na caixa de bloqueio.', '4.7.e (prioritário)'),
      req('Teste de energia zero realizado antes do início do serviço.', '4.7.h (prioritário)'),
      req('Energia residual liberada (pressão, gravidade, capacitores, molas) e medidas contra o reacúmulo.', '4.8.e; 4.7.j'),
      req('Bloqueio exclusivo quando há atividades simultâneas no mesmo equipamento.', '4.7.k (prioritário)'),
      req('Equipamentos e dispositivos de seccionamento claramente identificados no campo.', '4.6.a; 4.6.c'),
      req('Dispositivos de bloqueio duráveis, que aceitam cadeado e não são facilmente violados.', '4.6.e'),
      req('Cadeados de chave única, que retêm a chave quando abertos, e de material não condutor nas fontes elétricas.', '4.6.f.II; 4.6.f.IV; 4.6.f.V'),
      req('Lista de trabalhadores autorizados a bloquear aprovada formalmente pela gerência.', '4.10.2.b'),
      req('Mudança temporária do estado de energia zero (testes) com bloqueio exclusivo, análise de risco e comunicação a todos os envolvidos.', '4.7.l'),
      req('Bloqueio retirado somente por quem o aplicou; retirada excepcional com autorização do gerente da área.', '4.7.e; 4.7.f'),
      req('Desbloqueio com confirmação de pessoas fora da área de risco, ferramentas retiradas e proteções recolocadas.', '4.7.m')
    ]
  },
  {
    id: 'RAC05',
    titulo: 'RAC 05 – Içamento de Carga',
    itens: [
      req('Integridade dos acessórios de içamento com uso do checklist.', '5.7.e.I (prioritário)'),
      req('Integridade do equipamento de içamento com uso do checklist.', '5.7.e.I (prioritário)'),
      req('Disponibilidade de quebra-quinas nos modelos sugeridos.', '5.6.1.d', '2025-06-30'),
      req('Plano de içamento para as atividades.', '5.7.f (prioritário); nota 28'),
      req('Verificação de crachá e passaporte que demonstrem capacitação para atividades de içamento.', '5.8', '2025-06-30'),
      req('Plano de manutenção e ordens de serviço dos equipamentos de içamento (caminhão veicular articulado).', '5.7.e.II; Requisitos gerais b'),
      req('Laudo de integridade do equipamento de içamento (caminhão veicular articulado) por profissional habilitado.', '5.7.e.III'),
      req('Manutenção em dia (horímetro x plano de manutenção).', 'Requisitos gerais b'),
      req('Plano de Rigging para içamentos críticos (critérios do item 5.7.f), com o conteúdo mínimo do Anexo III.', '5.7.f (prioritário); 5.7.g'),
      req('Isolamento da área considerando o raio da carga, da lança e das patolas, sem uso de fita plástica.', '5.7.a (prioritário); 5.7.b'),
      req('Ninguém posicionado sob a carga ou no raio de ação da carga suspensa.', '5.7.n (prioritário)'),
      req('Sem contato das mãos com a carga suspensa; estabilização com cabo-guia ou haste.', '5.7.m (prioritário)'),
      req('Carga amarrada de acordo com o tipo, as dimensões, o peso e os acessórios usados.', '5.7.q (prioritário)'),
      req('Capacidade de carga indicada no equipamento e nos acessórios, e ganchos com trava de segurança.', '5.6.1.a; 5.6.1.b'),
      req('Tabela de carga disponível e fator de utilização dentro do limite (85% com um equipamento; 70% com dois ou mais).', '5.6.2.a; 5.7.c'),
      req('Patolas totalmente estendidas e calçadas com área de apoio de no mínimo duas vezes a área da patola.', '5.7.k; 5.7.l'),
      req('Comunicação por rádio em frequência exclusiva entre operador e sinaleiro.', '5.7.d'),
      req('Acessórios com inspeção periódica em dia; acessórios defeituosos ou desgastados segregados para descarte.', '5.7.e.II (prioritário); 5.7.j'),
      req('Sensor de sobrecarga com parada e alarme, e controle remoto no guindauto, funcionando.', '5.6.2.k; 5.6.2.q (prioritários)'),
      req('Sem uso de equipamentos de içamento improvisados ou adaptados sem autorização do fabricante ou projeto de engenharia.', '5.7.p'),
      req('Anemômetro no guindaste e na grua, respeitando a velocidade máxima de vento admitida.', '5.6.2.o; Anexo III.e'),
      req('Chaves de fim de curso e botoeira de emergência funcionando.', '5.6.2.h; 5.6.2.p'),
      req('Alarme sonoro de movimentação funcionando (grua, ponte rolante e talha elétrica).', '5.6.2.b'),
      req('Limite de 70% do fator de utilização em desmontagens com retirada dos pontos de sustentação da carga.', '5.7.i'),
      req('Acesso à área isolada do içamento somente com autorização.', '5.7.o')
    ]
  },
  {
    id: 'RAC06',
    titulo: 'RAC 06 – Espaços Confinados',
    itens: [
      req('Espaço confinado com placa de identificação e bloqueio físico contra acesso não autorizado.', '6.6.a (prioritário)'),
      req('Permissão de entrada (PNR-000031 e anexo aplicável) emitida e preenchida.', '6.7.1.e; 6.9.a.I'),
      req('Medidor multigases calibrado e com teste de resposta (bump test) antes do uso.', '6.7.1.d (prioritário)'),
      req('Monitoramento contínuo da atmosfera durante a permanência, com oxigênio entre 19,5% e 23%.', '6.7.3.b; 6.7.3.d (prioritário)'),
      req('Ventilação ou exaustão em funcionamento e verificada continuamente.', '6.7.3.f (prioritário)'),
      req('Bloqueio das fontes de energia conforme RAC 04 (desconexão física, raquete ou flange cego, ou duplo bloqueio e dreno).', '6.7.3.a'),
      req('Vigia presente na entrada, dedicado só a essa função, com controle de entrada e saída dos trabalhadores.', '6.9.b; 6.7.3.i'),
      req('Comunicação funcionando entre equipe, vigia e equipe de resgate.', '6.7.3.h'),
      req('Plano de resgate específico para o espaço, com equipamentos de resgate disponíveis.', '6.7.4.a; 6.7.4.b (prioritário)'),
      req('ART descrevendo preparação, entrada e atividades no espaço confinado.', '6.7.2.a'),
      req('Verificação de crachá e passaporte que demonstrem capacitação em RAC 06 (supervisor de entrada, vigia e executantes).', '6.8'),
      req('Inventário de espaços confinados atualizado, incluindo os desativados.', '6.7.1.a'),
      req('Equipamentos, ferramentas e dispositivos inspecionados antes do uso, incluindo os de apoio que ficam do lado de fora.', '6.7.1.c'),
      req('Entrada em atmosfera IPVS somente com máscara autônoma de pressão positiva ou linha de ar com cilindro de escape.', '6.7.3.c'),
      req('Equipe de resgate comunicada previamente sobre a entrada e as atividades.', '6.7.3.j'),
      req('Sensor de movimento eletrônico nos trabalhadores quando o vigia não consegue vê-los (túneis, galerias).', '6.6.d', '2025-12-31'),
      req('Suprimento de ar respirável conforme o Programa de Proteção Respiratória, verificado continuamente.', '6.6.b; 6.7.3.g'),
      req('Protocolo de estresse térmico com regime de trabalho e descanso, quando previsto na análise de risco.', '6.7.3.k'),
      req('Supervisor de entrada garantindo o teste dos medidores, o monitoramento contínuo, o resgate disponível e a presença do vigia.', '6.9.a.II; 6.9.a.III; 6.9.a.IV; 6.9.a.V'),
      req('Somente trabalhadores autorizados e relacionados na permissão de entrada acessam o espaço.', '6.9.b.II'),
      req('Locais de armazenagem com risco de engolfamento ou afogamento tratados e inventariados como espaço confinado.', '6.7.1.b'),
      req('Inspeções de espaço confinado feitas preferencialmente com drone (Anexo IV).', '6.6.e')
    ]
  },
  {
    id: 'RAC07',
    titulo: 'RAC 07 – Proteção de Máquinas',
    itens: [
      req('Integridade das máquinas e equipamentos com uso de checklist.', '7.7.1.b', 'plano'),
      req('Apreciação de riscos (HRN).', '7.7.2.a (prioritário)', 'plano'),
      req('Plano de manutenção e ordens de serviço das máquinas e equipamentos (sondas e serras).', '7.7.1.b', 'plano'),
      req('Verificação de crachá e passaporte que demonstrem capacitação para operação dos equipamentos e treinamento no RAC.', '7.8.a', 'plano'),
      req('Proteções fixas, proteções móveis ou dispositivos de proteção impedindo o acesso a partes móveis e áreas perigosas.', '7.6.1.i (prioritário)', 'plano'),
      req('Proteções fixas removíveis somente com ferramenta, sem permitir alcance da zona de perigo por cima, por baixo ou através.', '7.6.1.l', 'plano'),
      req('Proteções móveis intertravadas, parando a máquina quando abertas.', '7.6.1.m', 'plano'),
      req('Dispositivo de parada de emergência acessível e funcionando.', '7.6.1.p (prioritário)', 'plano'),
      req('Anteparos contra projeção ou queda de materiais onde há risco de atingir pessoas.', '7.6.1.f (prioritário)', 'plano'),
      req('Proteções recolocadas antes de a máquina voltar a operar.', '7.7.1.c', 'plano'),
      req('Medidas de contingência para dispositivos de segurança danificados até a solução definitiva.', '7.7.1.d', 'plano'),
      req('Dispositivo de seccionamento de energia de fácil acesso e que permite bloqueio na posição desligado.', '7.6.1.c', 'plano'),
      req('Painéis de operação e componentes de serviço regular localizados fora das proteções.', '7.6.1.d', 'plano'),
      req('Alarme sonoro ou visual de partida onde há dificuldade de ver pessoas na área de risco.', '7.6.1.v', 'plano'),
      req('Sinalização de advertência dos riscos residuais da máquina.', '7.6.1.w', 'plano'),
      req('Acesso seguro à máquina, com guarda-corpo onde há risco de queda acima de 500 mm.', '7.6.1.x; nota 3', 'plano'),
      req('Mangueiras e tubulações de fluido com proteção contra chicoteamento.', '7.6.1.o.I', 'plano'),
      req('Inventário das máquinas (nome, localização e TAG), próprias e contratadas.', '7.7.1.a', 'plano'),
      req('Máquinas com HRN acima de 500 paralisadas ou com contingência, e plano de ação para os riscos altos.', '7.7.2.c; 7.7.2.d', 'plano')
    ]
  },
  {
    id: 'RAC08',
    titulo: 'RAC 08 – Atividades no Terreno',
    itens: [
      req('Avaliação do cenário com uso do Anexo I do Procedimento de RAC 08 da Sondagem e Geociências.', '8.7.1.h (prioritário)'),
      req('ART deve descrever os cenários típicos de RAC 08.', '8.7.3.a (prioritário)', '2024-06-30'),
      req('Isolamento da área com barreiras físicas e sinalização, sem uso de fita plástica.', '8.6.2.b (prioritário)', '2024-08-30'),
      req('Checklist de riscos geotécnicos preenchido por indivíduo experiente antes do início do trabalho.', '8.7.1.h (prioritário)'),
      req('Atividade paralisada e área avaliada por indivíduo experiente ou qualificado quando há ruptura do terreno.', '8.7.1.c', '2024-08-30'),
      req('Acesso à área que sofreu ruptura controlado e liberado por profissional qualificado.', '8.6.2.a', '2024-08-30'),
      req('Escavação a partir de 1,25 m projetada por indivíduo qualificado, com escoramento, talude ou barreira e meio de evacuação.', '8.7.3.1.d', 'plano'),
      req('Verificação de interferências enterradas (desenhos e avaliação em campo) antes da escavação.', '8.7.3.1.a; nota 30'),
      req('Ferramentas e equipamentos de escavação adequados à atividade e em boas condições.', '8.6.1.a; 8.6.1.b', '2024-10-30'),
      req('Iluminação suficiente para o trabalho seguro.', '8.6.1.c', '2024-10-30'),
      req('Dispositivos de drenagem de águas superficiais e subterrâneas conforme projeto.', '8.6.1.d', 'plano'),
      req('Barreiras de proteção instaladas conforme projeto e proporcionais ao perigo.', '8.6.2.c', '2024-08-30'),
      req('Marcadores de projeto de talude claros no campo ou avanço do equipamento controlado por georreferenciamento.', '8.7.3.1.c; 8.7.3.c', '2024-12-30'),
      req('Riscos reavaliados após chuva, deformação do terreno ou desmonte de rocha.', '8.7.3.a (prioritário)', '2024-06-30'),
      req('Atividade próxima ao ativo geotécnico planejada, com projeto e medidas de controle aprovados.', '8.7.3.b (prioritário)', '2024-08-30'),
      req('Pilhas dentro do ângulo de repouso e da altura definidos em projeto.', '8.7.3.1.e', '2024-12-31'),
      req('Rotas de fuga e pontos de encontro sinalizados.', '8.7.2.e'),
      req('Ninguém trabalhando sob ou ao lado de terreno sem suporte adequado (atividades subterrâneas).', '8.7.4.2.a', '2024-08-30'),
      req('Empregados com treinamento global e local em RAC 08.', '8.8.a', '2024-12-30')
    ]
  },
  {
    id: 'RAC09',
    titulo: 'RAC 09 – Explosivos',
    itens: [
      req('Plano de fogo prévio elaborado e assinado pelo responsável técnico para o desmonte.', '9.7.1.j (prioritário); 9.7.5.1'),
      req('Sistema de detonação com espoleta eletrônica conforme o tipo de mina, sem uso de estopim.', '9.6.f (prioritário)'),
      req('Ferramentas e acessórios antifaísca no manuseio de explosivos.', '9.6.b'),
      req('Paiol trancado, sinalizado e segregado, com dispositivo antiestático na entrada e controle de inventário.', '9.6.c; 9.6.d; 9.7.1.a (prioritário); 9.7.2.b'),
      req('Veículo de transporte de explosivos exclusivo, sinalizado, com dissipador de energia estática e corta-chama, inspecionado com uso de checklist.', '9.6.e'),
      req('Bloqueio físico da área de carregamento e da Zona de Exclusão de Detonação, com sinalização na entrada da mina (rádio, blaster e horários).', '9.7.4.1.a; 9.7.4.1.d; 9.7.4.2.b (prioritários)'),
      req('Manuseio de explosivos na superfície suspenso durante alerta vermelho ou tempestade com raios.', '9.7.1.b (prioritário)'),
      req('Verificação de crachá e passaporte que demonstrem capacitação em RAC 09 e habilitação do blaster conforme legislação local.', '9.8'),
      req('Proibição de fumar, chama aberta e fontes de centelha a menos de 20 m dos explosivos.', '9.7.1.d'),
      req('Dispositivos eletrônicos que não são intrinsecamente seguros mantidos fora das áreas com explosivos.', '9.7.1.e'),
      req('Explosivos nas embalagens originais e segregados por grupo de compatibilidade.', '9.7.2.a; 9.7.1.a (prioritário)'),
      req('Proteção contra fricção, impacto, choque e calor no manuseio (corte de cordel com lâmina única, primer inserido logo após a escorva).', '9.7.1.g (prioritário)', '2024-08-30'),
      req('Caixa solidária quando explosivos e acessórios são transportados juntos, sem transbordo fora do paiol.', '9.7.3.c; 9.7.3.d'),
      req('Veículos aterrados na carga e descarga de explosivos a granel.', '9.7.3.b'),
      req('Alarme sonoro antes da detonação e evacuação da área confirmada pelo responsável.', '9.7.4.1.b; 9.7.4.1.c'),
      req('Horários de detonação e reprogramações comunicados a todos, interna e externamente.', '9.7.1.f'),
      req('Retorno após a detonação somente depois do tempo mínimo, da dissipação de gases e da verificação de fogo falhado.', '9.7.5.2'),
      req('Fogo falhado tratado conforme o PGS-004640, aguardando no mínimo 30 minutos antes de qualquer ação.', '9.7.6.a; 9.7.6.b'),
      req('Explosivos excedentes devolvidos ao paiol e explosivos defeituosos segregados para destruição.', '9.7.1.h; 9.7.1.i', '2024-08-30'),
      req('Perfuração georreferenciada, com parâmetros de controle de qualidade.', '9.6.h', '2024-12-31'),
      req('Plano de emergência com os cenários de explosivos, integrado ao do fornecedor.', '9.6.g', '2024-08-31')
    ]
  },
  {
    id: 'RAC10',
    titulo: 'RAC 10 – Trabalhos em Eletricidade',
    itens: [
      req('EPIs dos eletricistas devem ser específicos para atividades elétricas.', '10.7.1.j'),
      req('Ferramentas manuais utilizadas pelos eletricistas devem ser isoladas, com identificação de tensão.', '10.7.1.m'),
      req('Laudos das ferramentas manuais.', '10.7.1.o'),
      req('Quadros e painéis elétricos devem possuir sinalização de tensão e perigo.', '10.6.g'),
      req('Não utilização de adornos.', '10.7.1.n'),
      req('Etiqueta de energia incidente nos painéis e equipamentos.', '10.6.a (prioritário)', '2024-12-31'),
      req('Diagrama unifilar atualizado disponível.', '10.6.d (prioritário)'),
      req('Proteção contra contato acidental com partes energizadas.', '10.6.f (prioritário)'),
      req('Dispositivo diferencial residual (DR) nos pontos com risco de eletrocussão.', '10.6.e (prioritário)'),
      req('Aterramento e SPDA conforme PNR-000052.', '10.6.b (prioritário)', '2024-12-31'),
      req('Desenergização com seccionamento, bloqueio, teste de ausência de tensão, aterramento temporário, proteção das partes energizadas e sinalização.', '10.7.1.a (prioritário)'),
      req('Ausência de tensão confirmada com detector apropriado e testado (não com o detector pessoal).', '10.7.1.l'),
      req('Autorização formal específica para a atividade e trabalhadores autorizados conforme legislação local.', '10.7.1.d; 10.7.1.e'),
      req('Trabalho energizado somente com procedimento aprovado e aprovação do gerente com base em análise de risco.', '10.7.3 (prioritário)'),
      req('EPI para arco elétrico de no mínimo 10 cal/cm², compatível com a energia incidente; sem trabalho em painel energizado acima de 40 cal/cm².', '10.7.1.i; 10.7.1.j'),
      req('Instrumentos de medição inspecionados, calibrados e testados.', '10.7.1.p', '2024-12-31'),
      req('Sem uso de escadas metálicas e andaimes condutores em trabalhos com eletricidade.', '10.7.1.t; 10.7.1.u'),
      req('Critérios para rearme após desligamento automático (trip) e pessoas autorizadas definidos.', '10.7.1.q'),
      req('Acesso a painéis de distribuição e subestações controlado.', '10.7.1.r'),
      req('Trabalhadores treinados em prevenção de riscos em eletricidade (e em SEP e áreas classificadas, quando aplicável).', '10.8'),
      req('Manobra de disjuntores e contatores feita de forma remota em painéis não resistentes a arco interno.', '10.7.4.g', '2027-12-31'),
      req('Medição de temperatura em painéis de alta tensão sem abertura dos painéis.', '10.7.1.s', '2027-12-31'),
      req('Sem trabalho ao potencial em alta tensão e sem intervenção em circuito de potência de alta tensão sem desenergização completa.', '10.7.1.b; 10.7.1.c'),
      req('Trabalho energizado em alta tensão nunca realizado individualmente; critérios locais definidos para baixa tensão.', '10.7.1.f; 10.7.1.g'),
      req('Estudo de energia incidente do arco elétrico elaborado para os equipamentos.', '10.7.1.h')
    ]
  },
  {
    id: 'RAC11',
    titulo: 'RAC 11 – Metal Líquido',
    itens: [
      req('Traje aluminizado, escudo de respingos e óculos especiais em uso nas atividades com risco de projeção de metal ou escória.', '11.5.2.b; 11.5.2.e; 11.5.2.f', 'plano'),
      req('Ferramentas de amostragem, remoção de escória e vazamento com comprimento adequado, livres de ferrugem e umidade.', '11.5.2.c; 11.5.2.g', 'plano'),
      req('Equipamentos de transferência inspecionados com uso de checklist, com sinalização sonora e visual durante a transferência.', '11.6.4.a; 11.5.3.c'),
      req('Área sem acúmulo de água, sem extintores à base de água por perto e sem produtos inflamáveis ou combustíveis.', '11.5.1.b; 11.5.1.d; 11.6.1.a', 'plano'),
      req('Detector de gás fixo (CO, SO₂) instalado e detector pessoal em uso, quando aplicável.', '11.5.1.g; 11.5.2.d', 'plano'),
      req('Zonas de segurança demarcadas e placa de proibição de acesso a pessoas não autorizadas.', '11.6.1.b; 11.5.5.c'),
      req('Plano de manutenção dos equipamentos críticos e ordens de serviço.', '11.6.1.c', 'plano'),
      req('Plano de emergência com cenário de metal e escória líquidos e rotas de fuga sinalizadas.', '11.6.2.a; 11.6.2.b; 11.5.1.c', 'plano'),
      req('Sistema de proteção e combate a incêndio do forno conforme PNR-000187.', '11.5.1.a'),
      req('Exaustão para redução de poeira e gases perigosos.', '11.5.1.h'),
      req('Monitoramento contra presença de água e vazamento de água de refrigeração.', '11.5.1.i; 11.5.1.j; 11.6.4.e'),
      req('Telhado íntegro, sem entrada de água sobre as áreas com metal ou escória líquida.', '11.5.1.k'),
      req('Bicas de vazamento com contenção e desvio em caso de derramamento.', '11.5.1.e; 11.5.1.f'),
      req('Parada de emergência nos equipamentos, quando aplicável.', '11.5.1.m', 'plano'),
      req('Buzina exclusiva, audível acima do ruído, para aviso de vazamento.', '11.5.5.a', 'plano'),
      req('Equipamentos receptores pré-aquecidos, insumos armazenados secos e recipientes fechados não adicionados ao metal líquido.', '11.6.1.d; 11.6.1.g; 11.6.1.h', 'plano'),
      req('Plano de transferência com rotas e controle de velocidade, e isolamento nas rotas compartilhadas.', '11.6.3.a; 11.6.3.b'),
      req('Ninguém na região da abóbada durante o carregamento do forno, com controle de acesso.', '11.6.2.c; 11.6.2.d'),
      req('Indicador ou medição de nível para evitar sobrecarregamento de metal ou escória.', '11.5.1.s; 11.5.1.t; 11.6.1.e', 'plano')
    ]
  },
  {
    id: 'RAC12',
    titulo: 'RAC 12 – Trabalho a Quente',
    itens: [
      req('Autorização de trabalho a quente ou PTS para áreas não destinadas e áreas classificadas.', '12.7.4.a (prioritário)', '2025-06-30'),
      req('Área livre de 15 m sem materiais combustíveis ou, na impossibilidade, isolamento com barreiras não combustíveis e mantas térmicas.', '12.6.3.b; 12.6.3.c (prioritário); 12.6.3.d', '2025-12-30'),
      req('Sinalização de alerta de trabalho a quente.', '12.6.3.a (prioritário)', '2025-12-30'),
      req('Extintor destinado à tarefa e vigia exclusivo, com monitoramento de no mínimo 1 hora após o término.', '12.6.1.a; 12.7.3', '2025-12-30'),
      req('Máquina de solda, maçarico, mangueiras e reguladores inspecionados com uso de checklist (VRD na solda elétrica; corta-chama e mangueira sem emendas no oxicorte).', '12.7.1.b; 12.6.6; 12.6.7', '2025-12-30'),
      req('Cilindros travados no dispositivo de transporte, a no mínimo 3 m do ponto de aquecimento.', '12.6.2.a; 12.7.1.d; 12.7.1.e', '2025-12-30'),
      req('Medição de gases inflamáveis antes e durante a atividade, quando aplicável (LII acima de 1% impede o início).', '12.6.1.d; 12.6.1.e; 12.6.5.f', '2025-12-30'),
      req('Exaustão ou ventilação de fumos metálicos onde não houver ventilação natural.', '12.6.1.f (prioritário)', '2025-12-30'),
      req('Verificação de crachá e passaporte que demonstrem capacitação no procedimento de trabalho a quente (executantes e vigias).', '12.8', '2025-06-30'),
      req('Área de trabalho inspecionada antes do início para verificar a presença de materiais combustíveis.', '12.7.1.a', '2025-06-30'),
      req('Aberturas de piso consideradas na delimitação da área, evitando a passagem de fagulhas para outros níveis.', '12.6.3.e (prioritário)', '2025-12-30'),
      req('Mangueira de gases inflamáveis não enrolada no corpo durante a atividade.', '12.7.1.f', '2025-06-30'),
      req('Linhas do oxicorte despressurizadas quando fora de uso e conjunto removido nas áreas não destinadas.', '12.7.2.a; 12.7.2.b', '2025-06-30'),
      req('Proteção ocular contra radiação UV.', '12.6.1.h', '2025-12-30'),
      req('Estrutura e circuito da máquina de solda aterrados; DR identificado nas tomadas.', '12.6.1.b; 12.6.1.c; 12.6.7.b', '2025-12-30'),
      req('Área destinada a trabalho a quente com bancada, armário corta-fogo, extintores extras e cilindros protegidos de fagulhas.', '12.6.4.a (prioritário)', '2025-12-30'),
      req('Em área classificada: inertização, ventilação, isolamento da linha, controle de acesso, sistema hidráulico preventivo e explosividade igual a zero.', '12.6.5', '2025-12-30'),
      req('Inventário das áreas não destinadas a trabalho a quente.', '12.7.1.c', '2025-06-30'),
      req('Em áreas remotas: aceiro ou vegetação molhada, bombas costais e vigilância reforçada.', '12.6.3.f', '2025-12-30'),
      req('Reguladores de pressão calibrados, certificados e compatíveis com o gás usado.', '12.6.1.g', '2025-12-30'),
      req('Cilindro de oxicorte com controle de pressão e vazão com dois manômetros (exceto GLP).', '12.6.6.a', '2025-12-30'),
      req('Sistema homem-morto nas soldas MIG/MAG e TIG.', '12.6.7.c', '2025-12-30'),
      req('Vigia preparado para acionar a emergência conforme o plano de atendimento a emergência em caso de incêndio.', '12.9.2.a; 12.8.1')
    ]
  },
  {
    id: 'RAC13',
    titulo: 'RAC 13 – Abertura de Linhas e Equipamentos',
    itens: [
      req('PTS e ART descrevendo os passos da abertura, os pontos de abertura e os EPIs de cada fase.', '13.7.6.a', '2025-06-30'),
      req('Bloqueio da linha conforme RAC 04 e a hierarquia da norma, sem uso de válvula de retenção, de controle ou automática.', '13.7.2.a; 13.7.2.b; 13.7.2.c (prioritários)', '2025-06-30'),
      req('Linha despressurizada, drenada, ventilada, purgada e lavada antes da abertura, com drenagem para local seguro.', '13.7.3.a; 13.7.3.b (prioritários)', '2025-06-30'),
      req('Avaliação da atmosfera antes da abertura e periodicamente, conforme o planejamento.', '13.7.3.e (prioritário)', '2025-06-30'),
      req('Área isolada com barreira rígida em torno dos pontos de abertura.', '13.7.4 (prioritário)', '2025-06-30'),
      req('Pontos de abertura demarcados fisicamente no campo.', '13.7.5.a (prioritário)', '2025-06-30'),
      req('Para produtos inflamáveis: aterramento da linha verificado e ferramentas, iluminação e instrumentos certificados para área classificada.', '13.7.3.c; 13.6.2 (prioritários)', '2025-12-30'),
      req('Verificação de crachá e passaporte que demonstrem capacitação em abertura de linhas e equipamentos.', '13.8.a', '2025-06-30'),
      req('Raquetes, flanges cegos e juntas compatíveis com a classe de pressão e com o produto da linha.', '13.6.1', '2025-12-30'),
      req('Válvulas automáticas de falha fechada com a fonte de acionamento automático desconectada.', '13.7.2.d', '2025-06-30'),
      req('Bloqueio com apenas duas válvulas fechadas não usado em linhas de gás liquefeito sob pressão.', '13.7.2.b.IV', '2025-06-30'),
      req('Inertização da linha de produto inflamável quando indicada na FDS ou na análise de risco.', '13.7.3.d', '2025-06-30'),
      req('Método de confirmação de linha liberada e de conteúdo reduzido a nível aceitável definido e aplicado.', '13.7.6.a.V', '2025-06-30'),
      req('Necessidade e pontos de monitoramento da atmosfera definidos no planejamento, com instrumentos posicionados.', '13.7.1.b; 13.7.6.a.IX', '2025-06-30'),
      req('Requisitos do RAC 06 e do RAC 12 aplicados quando a abertura envolve espaço confinado ou trabalho a quente.', '13.7.6.b', '2025-06-30'),
      req('Ferramentas, equipamentos e instrumentos definidos no procedimento disponíveis e adequados.', '13.7.6.a.VI', '2025-06-30'),
      req('Trabalhadores autorizados formalmente pela gerência, com treinamento específico para área classificada quando aplicável.', '13.9.2.b; 13.8.b', '2025-06-30')
    ]
  },
  {
    id: 'OBS',
    titulo: 'Observações gerais',
    sempre: true,
    itens: [
      req('Entrevistas realizadas com os empregados.'),
      req('Equipamentos interditados devidamente bloqueados.'),
      req('Organização e limpeza do ambiente auditado (condição primordial para o início das avaliações).'),
      req('Requisitos legais em conformidade, mesmo sendo auditoria de RAC, demonstrando nosso compromisso com a segurança.'),
      req('Instalações sanitárias limpas e em condições de uso.'),
      req('Documentação sem rasuras (documentos rasurados são pontuados como não conformes).')
    ]
  }
];

// Gera ids estáveis por item (RAC01-1, RAC01-2...) e marca os prioritários.
CHECKLIST_RAC.forEach((sec) => {
  sec.itens = sec.itens.map((item, n) => ({
    ...item,
    id: `${sec.id}-${n + 1}`,
    num: n + 1,
    prioritario: /priorit/i.test(item.ref || '')
  }));
});

function secaoPorId(id) {
  return CHECKLIST_RAC.find((s) => s.id === id);
}

// Seções avaliadas numa auditoria: os RAC escolhidos + observações gerais.
function secoesDaAuditoria(aud) {
  return CHECKLIST_RAC.filter((s) => s.sempre || (aud.racs || []).includes(s.id));
}

// Texto do prazo do Anexo V, exibido só enquanto o prazo estiver correndo.
function textoPrazo(item, hoje = new Date()) {
  if (!item.prazo) return '';
  if (item.prazo === 'plano') return 'Prazo definido no plano de ação da área (Anexo V)';
  const [a, m, d] = item.prazo.split('-').map(Number);
  if (new Date(a, m - 1, d) < hoje) return '';
  return `Em implementação até ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${a} (Anexo V)`;
}

// Linha de referência exibida sob o item: requisito, prioridade e prazo.
function refLimpa(item) {
  return (item.ref || '').replace(/\s*\(priorit[áa]rios?\)/gi, '');
}
