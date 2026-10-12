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
