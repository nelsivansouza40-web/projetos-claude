# Inspeções SSMA — aplicativo offline

Aplicativo (PWA) para registro de inspeções de Saúde, Segurança do Trabalho
e Meio Ambiente, feito para funcionar **sem internet**. As inspeções e as
fotos são gravadas no próprio aparelho; quando a conexão volta, tudo é
enviado automaticamente para o Google Sheets/Drive, foto por foto.

## Instalação no aparelho (uso em campo)

1. Publique a pasta `inspecao-ssma/` em um endereço HTTPS (obrigatório para
   o modo offline funcionar). Qualquer hospedagem simples serve: GitHub
   Pages, Netlify, Vercel, ou um servidor interno da empresa.
2. Abra esse endereço no celular, pelo navegador (Chrome no Android, Safari
   no iPhone).
3. Toque em "Adicionar à tela inicial" (Android: menu ⋮ > Instalar
   aplicativo; iPhone: Compartilhar > Adicionar à Tela de Início).
4. A partir daí, o aplicativo abre como um app normal e funciona mesmo em
   local sem sinal. Só é necessário estar online no primeiro acesso, para
   o aparelho guardar os arquivos do aplicativo.

## Configurar a sincronização

1. Siga as instruções no topo de `server/Code.gs` para publicar o backend
   no Google Apps Script (gera uma URL de "App da Web").
2. No aplicativo, toque no ícone de engrenagem (⚙) e cole essa URL em
   "Endereço de sincronização".
3. Toque em "Testar conexão" para confirmar.

Sem essa configuração, o aplicativo continua funcionando normalmente,
apenas mantém as inspeções guardadas no aparelho até que o endereço seja
configurado.

## Como funciona o uso offline

- Toda inspeção preenchida é salva no aparelho a cada passo (não existe
  risco de perder o preenchimento se o app fechar).
- As fotos ficam guardadas no aparelho junto com a inspeção.
- Ao concluir uma inspeção, ela entra na fila de sincronização.
- Quando o aparelho detecta conexão com a internet, o aplicativo envia
  primeiro os dados de texto da inspeção e, em seguida, cada foto
  individualmente. Se a conexão cair no meio do envio, as fotos já
  enviadas não são reenviadas — a sincronização continua de onde parou na
  próxima vez que houver sinal.
- A tela inicial mostra o status de cada inspeção: Rascunho, Aguardando
  sincronização, Sincronizando, Sincronizado ou Erro na sincronização.
- Cada envio espera no máximo 90 segundos (fotos: 180). Se a sincronização
  falhar, o app tenta de novo sozinho a cada 5 minutos enquanto estiver
  aberto. Se a planilha recusar o usuário ou PIN, o app para de enviar até a
  pessoa entrar de novo, para não esgotar as tentativas e bloquear o usuário.
- As fotos são guardadas já reduzidas (até 1600 px no lado maior), o que
  economiza espaço no celular em inspeções feitas sem internet.
- Quando sai uma versão nova do app, ele só recarrega sozinho nas telas de
  consulta. No meio de um preenchimento, aparece o aviso "Versão nova do
  aplicativo pronta" e a pessoa escolhe a hora de atualizar.

## Estrutura do formulário

- **Identificação**: data, hora, empresa/contratada, unidade/projeto,
  área/setor, inspetor, responsável acompanhando e tipo de inspeção.
- **Checklist**: gerado automaticamente conforme o tipo de inspeção
  escolhido. Cada item tem resposta (Conforme / Não Conforme / Não se
  Aplica), foto, observação e medida de controle. É possível adicionar
  itens personalizados em qualquer inspeção.
- **Fechamento**: classificação geral, necessidade de ação imediata,
  descrição da não conformidade principal, medidas de controle, evidência
  fotográfica complementar e necessidade de reinspeção.

## Equipe: login, perfis e ações compartilhadas

- Usuários cadastrados na aba **Usuarios** da planilha entram com nome e PIN
  (Configurações → Acesso do usuário). Sem usuários cadastrados, não há login.
- Perfis: Gestor (tudo), Inspetor (inspeções, permissões, relatos, observações
  e ações) e Responsável (só a Central de ações, com as ações em seu nome).
- A Central de ações mostra as ações de toda a equipe. O responsável conclui
  no próprio celular; vale a alteração mais recente; a aba Historico_Acoes
  registra quem alterou o quê. Detalhes no `docs/GUIA_GESTOR.md`.
- Segurança no servidor: o perfil é conferido pela planilha (não só na tela do
  celular), cinco PINs errados em qualquer comunicação bloqueiam o usuário por
  15 minutos, os PINs ficam codificados na aba Usuarios e textos começando com
  `=`, `+`, `-` ou `@` são gravados como texto, nunca como fórmula. Sem chave de
  acesso e sem usuários, o app avisa que a planilha está sem proteção.

## Inteligência SSMA (Gestão → Inteligência)

- **Criticidade** (Baixa, Média, Alta, Crítica) em cada não conformidade,
  nos relatos (potencial) e nas observações comportamentais.
- **Reincidência**: o mesmo item não conforme na mesma área em até 90 dias.
  O inspetor é avisado no próprio checklist.
- **Evidência e eficácia**: concluir uma ação na Central de ações exige
  descrever o que foi feito (com foto opcional) e marcar a data de
  verificação. Na verificação, "Eficaz" encerra; "Não eficaz" reabre a ação
  com novo prazo e guarda o histórico.
- **Visão por área**: pontos de atenção automáticos, mapa de calor
  área × tipo de inspeção, tendência de 30 dias e o Índice de Maturidade
  Preventiva (IMP), com pesos e meta ajustáveis na própria tela.

Os itens de checklist de "Inspeção Geral de SST" seguem o modelo de
referência de 25 perguntas. Os itens das demais modalidades (Trabalho em
Altura, Espaço Confinado, Eletricidade, etc.) são um ponto de partida
técnico geral, definidos em `js/checklists.js`, e devem ser revisados pelo
técnico responsável conforme o processo real de cada operação antes do uso
definitivo em campo.

## Relato por QR Code, 5 Porquês e lembretes por e-mail

- **Relato por QR Code** (`relato.html` e `js/relatos-qr.js`): o gestor gera
  placas por área em Relatos → "Recebidos pelo QR Code e placas". Qualquer
  pessoa lê a placa e relata pelo celular, sem instalar o app e sem login.
  Os relatos chegam à aba Relatos_QR e são importados no app para tratamento.
- **5 Porquês e Ishikawa (6M)** na Investigação de Acidente, etapa "Causas e
  Plano de Ação" (`js/analise-causas.js`). Entram no detalhe, no relatório
  (com o diagrama de espinha de peixe) e em colunas novas da aba
  Investigacoes_Acidente.
- **Lembretes semanais por e-mail** das ações atrasadas e a vencer, para cada
  responsável, e resumo da equipe para os gestores. Configuração no
  `docs/GUIA_GESTOR.md`, item 5.

## Avaliação de riscos psicossociais no PGR (modelo SGG)

Cada PGR tem a seção **Avaliação de riscos psicossociais (NR-1)**, igual à
planilha `modelos/Modelo_Matriz_Riscos_Psicossociais_SGG.xlsx`:

- Mesmas colunas: setor/cargo/GHE, perigo psicossocial, possível consequência,
  caracterização da exposição, medidas existentes, severidade (1-5),
  probabilidade (1-5), nível de risco, classificação, prioridade de ação,
  responsável e prazo.
- Mesmos cálculos: nível = severidade × probabilidade; Crítico (20-25),
  Alto (12-16), Médio (6-10) e Baixo (1-5), com a prioridade correspondente.
- Mesmas escalas de severidade e probabilidade, matriz 5×5 e critérios
  documentados exigidos pela NR-1 (subitem 1.5.4.4.2.2). Esses critérios valem
  só para os riscos psicossociais; os demais riscos seguem os critérios gerais.
- **Importar planilha (.xlsx)**: traz para o PGR uma planilha preenchida no
  modelo (substitui ou acrescenta aos fatores atuais).
- **Exportar planilha (.xlsx)**: gera o mesmo modelo preenchido, com as três
  abas, fórmulas, cores e validação de 1 a 5. Com mais de 20 fatores, as
  linhas são acrescentadas no mesmo formato.
- No relatório do PGR, a avaliação é a seção 7. Na planilha da equipe, vai
  para as abas `PGR_Psicossocial` e `PGR_Psicossocial_Criterios`.
- A leitura e gravação do Excel usam a biblioteca ExcelJS (licença MIT, em
  `js/vendor/`), carregada só na hora de importar ou exportar e guardada para
  uso sem internet.

## Módulos retirados

O módulo **Certificados** foi retirado do menu, por decisão da equipe. Os
certificados já registrados continuam no aparelho, aparecem na busca e os
pendentes ainda são enviados à planilha. Para trazer o módulo de volta, tire
`'certificados'` da lista `MODULOS_RETIRADOS` em `js/menu.js`.

## Testes automáticos

Os testes ficam em `tests/` e rodam sem navegador e sem planilha de verdade
(ambos são simulados). Conferem as regras de segurança do servidor (PIN,
bloqueio, perfis, fórmulas, proteção), os cálculos do app (índice de
conformidade, reincidência, IMP, prazos e eficácia das ações, menu por
perfil) e o comportamento da sincronização (tempo limite, nova tentativa,
PIN recusado).

Para rodar, com Node.js 22 ou mais novo, na pasta raiz do repositório:

    node --test "inspecao-ssma/tests/*.test.js"

O GitHub roda os mesmos testes sozinho a cada envio de código
(`.github/workflows/testes.yml`). Toda mudança nova no app deve vir com o
teste correspondente.

## Limitações conhecidas

- O upload de arquivos usado pelo Google Forms original exige conta
  Google; este aplicativo elimina essa exigência, pois quem sincroniza os
  dados é o backend (Apps Script), não o dispositivo do inspecionado.
- Em iPhone, o armazenamento de um app instalado via "Adicionar à Tela de
  Início" pode ser reduzido pelo sistema se o app ficar muito tempo sem
  ser aberto. Abra o aplicativo periodicamente para garantir que as
  inspeções pendentes sejam sincronizadas.
- O backend padrão usa Google Sheets e Google Drive, reaproveitando a
  mesma conta Google já utilizada nos formulários existentes. Outro
  destino (banco de dados próprio, outra planilha) pode ser usado desde
  que implemente as mesmas três ações (`ping`, `upsertInspection`,
  `uploadPhoto`).
