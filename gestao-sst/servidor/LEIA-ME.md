# Trabalho em equipe: instalar o servidor na planilha Google

Faça uma vez só, no computador, com a conta Google que vai guardar os dados
(de preferência a conta corporativa). Leva cerca de 10 minutos.

## 1. Criar a planilha e colar o código

1. Abra a planilha **Gestão SST — Dados da equipe** no Google Drive (ou crie
   uma planilha nova em branco).
2. Menu **Extensões → Apps Script**.
3. Apague todo o conteúdo do arquivo `Código.gs` que aparece.
4. Abra o código do servidor neste endereço, selecione tudo (Ctrl+A), copie
   (Ctrl+C) e cole no editor (Ctrl+V):
   https://raw.githubusercontent.com/nelsivansouza40-web/projetos-claude/claude/vigilant-noether-u1eqou/gestao-sst/servidor/Code.gs
5. Clique no ícone de disquete (**Salvar projeto**). Se aparecer erro de
   sintaxe, a cópia veio incompleta: repita o passo 4.

## 2. Definir a chave de acesso

A chave impede que outra pessoa grave dados na sua planilha.

1. No menu da esquerda do Apps Script, clique na **engrenagem
   (Configurações do projeto)**.
2. Role até **Propriedades do script → Adicionar propriedade do script**.
   - Propriedade: `CHAVE_ACESSO`
   - Valor: uma chave com pelo menos 16 caracteres, sem nome, CPF ou data
     (exemplo de formato: `sst-8Hq3-pL2x-71Wd`)
3. **Salvar propriedades do script**.

Sem essa chave o servidor recusa todos os envios.

## 3. Publicar como app da Web

1. Botão azul **Implantar → Nova implantação**.
2. Na engrenagem ao lado de "Selecione o tipo", escolha **App da Web**.
3. Executar como: **Eu**. Quem pode acessar: **Qualquer pessoa**.
4. **Implantar** e autorize o acesso com a sua conta (em "Avançado", clique em
   "Acessar projeto").
5. Copie o **URL do app da Web** (termina em `/exec`).

Para conferir, abra esse endereço no navegador. Deve aparecer:
*"Servidor do Gestão SST funcionando. Versão 2026-10-11."*

## 4. Conectar o computador principal

No computador que já tem os dados:

1. **Configurações → Trabalho em equipe**.
2. Cole o endereço `/exec` e a chave → **Testar conexão**.
3. **Conectar esta empresa e enviar tudo**. Na primeira vez, o envio pode levar
   alguns minutos, dependendo da quantidade de registros.

## 5. Conectar os outros computadores

Nos demais computadores, **não importe a planilha Excel** (criaria registros
duplicados):

1. Abra o sistema → **Empresa → Entrar em empresa da equipe** (na primeira vez,
   o botão aparece na tela de boas-vindas).
2. Cole o endereço e a chave → **Buscar empresas** → **Baixar e usar**.

## Como funciona no dia a dia

- Cada computador continua funcionando **sem internet**. As alterações ficam na
  fila e são enviadas quando a conexão volta.
- A sincronização é automática: ao abrir o sistema, alguns segundos depois de
  cada alteração e a cada 2 minutos. O topo da tela mostra
  "equipe sincronizada às HH:MM" ou quantas alterações aguardam envio.
- Se duas pessoas alterarem o mesmo registro, **vale a alteração mais recente**.
- Na planilha, cada módulo ganha uma aba de consulta (Colaboradores, Acidentes,
  Treinamentos...), boa para filtros e para o Looker Studio. **Não edite essas
  abas**: elas são refeitas a cada envio. As abas `_dados` e `_esquema` ficam
  ocultas e não devem ser alteradas.
- Para refazer as abas de consulta à mão: menu **Gestão SST → Atualizar abas de
  consulta**, na própria planilha.

## Cuidados (LGPD)

- Compartilhe a planilha só com quem precisa (SESMT e gestão), nunca com
  "qualquer pessoa com o link".
- Não divulgue o endereço `/exec` nem a chave fora da equipe.
- O backup em arquivo (.json) continua valendo: a planilha não substitui a
  cópia de segurança.

## Ao atualizar o código do servidor

Cole o novo código e use **Implantar → Gerenciar implantações → lápis (Editar)
→ Versão: Nova versão → Implantar**. Assim o endereço `/exec` continua o mesmo
e não é preciso mexer nos computadores.
