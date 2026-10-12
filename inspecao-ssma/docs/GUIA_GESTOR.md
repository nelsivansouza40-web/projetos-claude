# Guia do gestor: segurança, painel da equipe e migração

Este guia cobre três tarefas feitas no computador, na planilha que recebe os
dados do app (hoje, **INSPEÇÕES SSMA_2026**):

1. Ativar a chave de acesso (proteção do servidor).
2. Montar o painel da equipe no Looker Studio.
3. Migrar planilha e script para a conta corporativa.
4. Cadastrar usuários, perfis e ações compartilhadas.

Antes de tudo, a planilha precisa estar com o **Code.gs versão 2026-10-13 ou
mais nova**. Para conferir, abra no navegador o endereço do app da Web (o que
termina em `/exec`): a página deve mostrar *"Servidor do Inspeções SSMA
funcionando. Versão 2026-10-13."*

Para atualizar: copie o `server/Code.gs` deste repositório, cole no Apps Script
substituindo o conteúdo e use **Implantar → Gerenciar implantações → editar →
Nova versão**. O endereço `/exec` continua o mesmo. Enquanto o servidor não for
atualizado, o app continua funcionando; só as colunas novas não chegam à
planilha.

---

## 1. Ativar a chave de acesso

Sem a chave, qualquer pessoa que descubra o endereço do servidor consegue
gravar dados na planilha. Com a chave, só os celulares configurados com ela
conseguem.

1. Escolha uma chave difícil de adivinhar, com pelo menos 16 caracteres
   (exemplo de formato: `ssma-7Kq2-mX9p-41Rv`). Não use nome, CPF ou data.
2. Na planilha, abra **Extensões → Apps Script**.
3. No menu da esquerda, clique na **engrenagem (Configurações do projeto)**.
4. Role até **Propriedades do script → Adicionar propriedade do script**.
   - Propriedade: `CHAVE_ACESSO`
   - Valor: a chave escolhida
5. Clique em **Salvar propriedades do script**. Não é preciso reimplantar.
6. Em **cada celular**: app → Configurações → campo **Chave de acesso** →
   digite a mesma chave → **Salvar** → **Testar conexão**. O resultado deve
   ser "Conexão bem-sucedida".

A partir desse momento, celulares sem a chave recebem "Chave de acesso
inválida" e nada é gravado. Para trocar a chave, altere a propriedade e
atualize os celulares. A chave não vai para os arquivos de cópia de segurança.

---

## 2. Painel da equipe no Looker Studio (gratuito)

O painel do app mostra apenas os registros daquele celular. O Looker Studio lê
a planilha e mostra a equipe inteira, sempre atualizado.

### 2.1 Abas que alimentam o painel

| Aba | Uma linha por | Colunas úteis |
|---|---|---|
| `Inspecoes` | inspeção | Data, Empresa, Área, Inspetor, Tipo de Inspeção, Disciplina, Conformidade (%), Qtd. NC, Duração (min), Registrado por |
| `Acoes_Consolidadas` | ação (de todos os módulos e de todos os celulares) | Origem, Área, Responsável, Prazo, Status, Situação, Concluída em, Concluída no prazo, Registrado por, Criticidade, Reincidente, Evidência, Fotos da evidência, Verificar eficácia em, Eficácia, Verificada em, Reaberturas (não eficaz) |
| `Itens_Checklist` | item de checklist respondido | Questão, Resposta, Criticidade, Reincidente, Data, Área, Empresa, Tipo de Inspeção |
| `Relatos` | relato | Tipo, Data, Área, Potencial, Status da Ação |
| `Observacoes_Comportamentais` | observação | Data, Área, Observador, Seguros, De Risco, % Seguro |

As abas são criadas sozinhas na primeira sincronização de cada tipo de
registro.

### 2.2 Criar o relatório

1. Acesse **lookerstudio.google.com** com a conta dona da planilha.
2. **Criar → Relatório → Planilhas Google** → escolha a planilha → aba
   **Inspecoes** → deixe marcado "Usar a primeira linha como cabeçalho" →
   **Adicionar**.
3. Menu **Recurso → Gerenciar fontes de dados adicionadas → Adicionar**. Repita
   para `Acoes_Consolidadas`, `Itens_Checklist`, `Relatos` e `Observacoes_Comportamentais`.
4. Na fonte `Inspecoes`, confira se **Data** está como tipo *Data*. Se
   estiver como texto, clique no tipo e mude para *Data (AAAA-MM-DD)*.

### 2.3 Gráficos sugeridos (página "Visão geral")

| Gráfico | Fonte | Configuração |
|---|---|---|
| Visão geral (4 cartões) | Inspecoes | Contagem de ID · Média de Conformidade (%) · Soma de Qtd. NC · Média de Duração (min) |
| Inspeções por semana | Inspecoes | Série temporal · Dimensão: Data (semana) · Métrica: Contagem de ID |
| Inspeções por inspetor | Inspecoes | Barras · Dimensão: Registrado por (ou Inspetor) · Métrica: Contagem de ID |
| Conformidade por disciplina | Inspecoes | Barras · Dimensão: Disciplina · Métrica: Média de Conformidade (%) |
| NCs por área | Inspecoes | Barras · Dimensão: Área · Métrica: Soma de Qtd. NC · Ordenar decrescente |
| Ações abertas e atrasadas | Acoes_Consolidadas | Cartões com filtro: Status ≠ Concluída; Situação contém "Atrasada" |
| % de ações concluídas no prazo | Acoes_Consolidadas | Cartão com o campo calculado abaixo |
| Ações atrasadas por responsável | Acoes_Consolidadas | Tabela · Dimensões: Responsável, Ação, Prazo · Filtro: Situação contém "Atrasada" |
| Relatos por tipo | Relatos | Pizza · Dimensão: Tipo |
| Comportamento seguro | Observacoes_Comportamentais | Cartão: Soma de Seguros ÷ (Soma de Seguros + Soma de De Risco) |
| Mapa de calor área × tipo | Itens_Checklist | Tabela dinâmica · Linha: Área · Coluna: Tipo de Inspeção · Métrica: Contagem · Filtro: Resposta = Não Conforme · Estilo: mapa de calor |
| Desvios altos e críticos | Itens_Checklist | Cartão · Filtro: Resposta = Não Conforme e Criticidade em (Alta, Crítica) |
| Reincidências | Itens_Checklist | Tabela · Dimensões: Área, Questão · Métrica: Contagem · Filtro: Reincidente = Sim |
| Ações aguardando verificação | Acoes_Consolidadas | Tabela · Filtro: Eficácia contém "Verificar" |
| Eficácia das ações | Acoes_Consolidadas | Cartão: ações com Eficácia começando por "Eficaz" ÷ (essas + Soma de Reaberturas) |

**Campo calculado "% no prazo"** (fonte `Acoes_Consolidadas` → Adicionar um
campo):

```
SUM(CASE WHEN Concluída no prazo = "Sim" THEN 1 ELSE 0 END)
/ SUM(CASE WHEN Status = "Concluída" THEN 1 ELSE 0 END)
```

Defina o tipo como *Percentual*.

**Filtros no topo da página:** controle de período (dimensão Data), lista
suspensa de Empresa e de Disciplina.

### 2.4 Compartilhar com a gestão

- **Compartilhar → Convidar pessoas** com permissão **Leitor**. Quem vê o
  relatório não precisa ter acesso à planilha se a fonte de dados estiver com
  a credencial "do proprietário" (padrão).
- **Compartilhar → Agendar entrega**: envio automático do painel em PDF por
  e-mail, por exemplo toda segunda-feira às 7h.

---

## 3. Migração para a conta corporativa

Faça quando a empresa adotar o app oficialmente. Os dados pessoais (nomes,
acidentes, afastamentos, assinaturas) passam a ficar sob a gestão da empresa,
como pede a LGPD.

1. **Sincronize todos os celulares** antes de começar (faixa amarela vazia).
2. Na conta corporativa, abra a planilha atual (compartilhada com você) e use
   **Arquivo → Fazer uma cópia**. A cópia leva junto o Apps Script.
3. Na cópia: **Extensões → Apps Script → Implantar → Nova implantação → App da
   Web** · Executar como: **Eu** · Quem pode acessar: **Qualquer pessoa**.
   - Se a opção "Qualquer pessoa" não aparecer, o administrador do Google
     Workspace da empresa precisa liberá-la para apps da Web do Apps Script.
     A opção "Qualquer pessoa da organização" **não funciona** com o app,
     porque o celular não envia o login do Google junto com os dados.
4. Defina a `CHAVE_ACESSO` na cópia (item 1 deste guia).
5. Em cada celular: Configurações → novo endereço `/exec` + chave → **Salvar**
   → **Testar conexão**.
6. A pasta de fotos (`Inspeções SSMA - Fotos`) é criada sozinha no Drive da
   conta corporativa na primeira foto enviada. As fotos antigas continuam na
   conta pessoal: mova a pasta para o Drive compartilhado da empresa, se
   necessário.
7. Recrie as fontes do Looker Studio apontando para a nova planilha.
8. Depois de conferir que tudo chega à nova planilha, retire o compartilhamento
   da planilha antiga e arquive-a.

### Cuidados de LGPD

- Compartilhe a planilha só com quem precisa (SESMT e gestão), nunca com
  "qualquer pessoa com o link".
- Não divulgue o endereço `/exec` fora da equipe e mantenha a chave ativa.
- Defina por quanto tempo os registros serão guardados (por exemplo, 20 anos
  para PGR e investigações, conforme a NR-01 e a legislação previdenciária) e
  quem pode excluí-los.
- Informe aos trabalhadores, na integração, que inspeções, relatos e
  observações são registrados em sistema eletrônico. O relato anônimo e a
  observação comportamental não gravam o nome do trabalhador.

---

## 4. Usuários, perfis e ações compartilhadas

### 4.1 Cadastrar usuários

Depois de atualizar o Code.gs, a planilha ganha a aba **Usuarios**, vazia.
Enquanto ela estiver vazia, o app funciona como antes, sem login.

| Nome | PIN | Perfil | Ativo |
|---|---|---|---|
| Nelsivan Souza | 4821 | Gestor | Sim |
| Carlos Lima | 0420 | Responsável | Sim |
| Maria Santos | 7315 | Inspetor | Sim |

- **Nome**: como a pessoa vai digitar no app (maiúsculas e acentos não importam).
  Use o mesmo nome que aparece no campo "Responsável" das ações: é por ele
  que o app separa as ações de cada um.
- **PIN**: 4 a 6 números, diferente para cada pessoa.
- **Perfil**:
  - **Gestor**: vê todos os módulos.
  - **Inspetor**: inspeções, permissões, relatos, observações e ações.
  - **Responsável**: só a Central de ações, já filtrada nas ações dele. Pode
    concluir com evidência, mas não altera responsável e prazo nem verifica a
    eficácia (a verificação é feita por SSMA).
- **Ativo**: "Não" bloqueia a pessoa sem apagar o histórico.

**Atenção:** a partir do primeiro usuário cadastrado, o login passa a ser
obrigatório. Cada celular precisa entrar em **Configurações → Acesso do
usuário** com nome e PIN, senão a sincronização para. Cadastre todos antes e
avise a equipe. Cinco PINs errados seguidos bloqueiam o usuário por 15 minutos.

O PIN fica visível na aba Usuarios: compartilhe a planilha só com a gestão de
SSMA. É uma proteção adequada para o piloto; para uso corporativo amplo, o
caminho é um banco de dados com login da empresa.

### 4.2 Como as ações passam a funcionar

- Cada celular baixa da planilha as ações de toda a equipe a cada
  sincronização (ou pelo botão **Atualizar com a equipe** na Central).
- O responsável conclui a ação no próprio celular. A conclusão, a evidência e
  as fotos vão para a planilha e, depois, para o celular de quem criou o
  registro.
- Quando duas pessoas mexem na mesma ação, vale a alteração mais recente.
- A aba **Historico_Acoes** registra cada mudança de responsável, prazo,
  status, evidência e eficácia, com data, hora e o nome de quem fez.
- A tela **Inteligência** continua mostrando os dados do próprio aparelho.
  A visão da equipe inteira é a do Looker Studio (item 2).
