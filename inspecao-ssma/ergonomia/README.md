# Gestão Ergonômica — PGR

Aplicativo (PWA) de gestão ergonômica integrada ao PGR, com base na NR-1
vigente (item 1.5.7.3, fatores ergonômicos e psicossociais no GRO/PGR) e na
NR-17 (AEP, AET e participação dos trabalhadores). Funciona offline e
sincroniza automaticamente com Google Sheets/Drive, seguindo a mesma
arquitetura do app de Inspeções SSMA.

## Fluxo implementado

Organização → Estabelecimento → Processo → Setor → Função → Atividade →
Situação de trabalho → AEP → (motor de decisão) → AET → Correlação com o
PGR → Aprovação → Plano de ação → Acompanhamento → Relatórios.

## Módulos

- **Organização e estrutura operacional**: dados cadastrais da empresa e
  hierarquia processo/setor/função/atividade.
- **Inventário PGR**: cadastro manual e importação por CSV.
- **Situação de trabalho**: trabalho prescrito, trabalho real, evidências
  fotográficas e participação obrigatória dos trabalhadores (NR-17, 17.3.8).
- **AEP**: os 7 blocos de análise da NR-17 (organização do trabalho,
  sobrecarga biomecânica, movimentação de cargas, mobiliário, máquinas e
  ferramentas, condições ambientais, fatores psicossociais), com fatores
  identificados livremente pelo avaliador — não é um checklist fechado.
- **Motor de decisão de AET**: aplica as hipóteses do item 17.3.2 da NR-17.
  A decisão final sempre depende de confirmação do profissional responsável.
- **AET**: as 6 etapas da NR-17 (demanda, atividade, métodos, diagnóstico,
  recomendações, restituição), com calculadoras reais dos métodos RULA,
  REBA, Equação de NIOSH, Strain Index, OWAS, QEC e OCRA Checklist.
- **Correlação com o PGR**: compara cada fator/recomendação com o
  inventário existente e propõe um dos quatro resultados previstos
  (correto, incompleto, classificação mudou, novo registro) — nada é
  alterado sem aprovação do responsável pelo PGR.
- **Plano de ação**: prioridade, responsável, prazo, evidências,
  percentual de execução, avaliação de eficácia e risco residual.
- **Relatórios**: AEP e AET em PDF (impressão do navegador), inventário
  PGR e plano de ação em CSV.
- **Auditoria**: trilha de quem fez o quê e quando.

## Limitações conhecidas (por decisão técnica, não por descuido)

- **Sem login multiusuário real.** O app é local ao dispositivo; existe
  apenas um "perfil atual" (nome + papel) usado para identificar quem fez
  cada ação na trilha de auditoria e liberar a tela de Aprovações. Não há
  controle de acesso entre dispositivos — isso exigiria um backend com
  autenticação, fora do escopo de um app offline-first.
- **Sem assinatura eletrônica com validade jurídica.** Os relatórios
  registram nome e data para encerramento, não uma assinatura digital
  certificada.
- **Calculadoras ergonômicas são indicativas.** RULA, REBA, NIOSH, Strain
  Index, OWAS, QEC e OCRA seguem as tabelas/fórmulas publicadas dos
  métodos, mas o resultado deve ser conferido pelo profissional
  responsável antes de decisões críticas — cada resultado exibe esse
  aviso. Snook & Ciriello e ROSA não têm calculadora embutida: suas
  tabelas psicofísicas têm centenas de combinações e devem ser
  consultadas na fonte oficial; o app apenas estrutura a coleta de dados
  do método (via campo de método "Outro" com resultado descritivo).
- **Sem integrações por API com outros sistemas.** A importação do PGR
  aceita CSV; exportações saem em CSV/PDF, prontas para uso em outras
  ferramentas.
- **Sugestões de fatores e métodos são apoio, não checklist fechado.** O
  avaliador registra livremente o que observa; nada é sugerido
  automaticamente como solução padrão, para evitar respostas genéricas
  desconectadas da atividade real.

## Sincronização

Mesmo padrão do app de Inspeções SSMA: veja `server/Code.gs` para o
backend em Google Apps Script (Sheets + Drive). Cada tipo de registro vira
uma aba própria na planilha; fotos são enviadas separadamente para tolerar
quedas de conexão.
