# Gestão SST — sistema offline

Sistema de gestão de Saúde e Segurança do Trabalho que substitui a planilha
"Gestão SST" (GSST). Funciona inteiro no navegador, **sem internet**, e grava
cada registro **no momento em que é salvo**.

## Como abrir

- **Arquivo único:** rode `python3 gerar-arquivo-unico.py` e abra
  `dist/Gestao-SST.html` com dois cliques (Chrome, Edge ou Firefox).
- **Pasta completa:** abra `index.html`. Publicado em um endereço `https://`,
  o sistema também pode ser instalado como aplicativo (PWA) e abre sem internet.

## O que tem

| Área | Módulos |
|---|---|
| Início | Painéis (visão geral, acidentes, colaboradores, treinamentos, EPI, auditorias e desvios, 5W2H, riscos, extintores e hidrantes) · Pendências e vencimentos |
| Pessoas | Colaboradores · Pesquisa do colaborador (prontuário) · Treinamentos · ASO · DDS · Advertências |
| EPI | Cadastro com estoque, validade do CA e validade de uso (prazo de troca) · Movimentação com troca prevista por entrega · Ficha de EPI (NR-06) para impressão |
| Ocorrências | Acidentes (TF, TG, pirâmide de Bird) · Desvios e incidentes · Auditorias |
| Gestão | Plano 5W2H · Riscos com matriz 5×5 · Documentos · OSS · Atividades por função · Produtos químicos |
| Emergência | Extintores (recarga e teste hidrostático) · Hidrantes |
| Equipamentos | Máquinas · Manutenções · Frota |
| CIPA | Mandato e estabilidade · Calendário eleitoral (NR-05) |

## Empresa configurável

O botão **Empresa**, no topo, guarda nome, CNPJ, endereço, responsável e
logotipo. Esses dados aparecem no cabeçalho e em todos os documentos impressos.
Dá para cadastrar várias empresas; os dados de cada uma ficam separados.

## Onde os dados ficam

- Banco de dados do navegador (IndexedDB), gravado a cada alteração.
- **Backup automático em arquivo** (Chrome/Edge no computador): o sistema
  regrava um `.json` escolhido pelo usuário segundos depois de cada alteração.
- Backup manual (`.json`) e restauração pelo botão **Backup**.

## Empresa de demonstração

Na tela de boas-vindas ou em **Empresa → Empresa de demonstração**, o sistema
cria a "Metalúrgica Modelo Ltda (DEMONSTRAÇÃO)", com cerca de 480 registros
fictícios em todos os módulos. As datas são calculadas a partir do dia em que
ela é criada, para que os painéis e as pendências mostrem situações atuais
(ASO e extintores vencidos, EPI sem estoque, ações atrasadas). Serve para
apresentar o sistema sem expor dados pessoais reais.

## Trabalho em equipe

Vários computadores podem usar o mesmo cadastro, sincronizados por uma planilha
Google (servidor em Apps Script). Cada computador continua funcionando sem
internet e envia as alterações quando a conexão volta; em conflito, vale a
alteração mais recente. Instalação passo a passo em
[`servidor/LEIA-ME.md`](servidor/LEIA-ME.md).

## Importar a planilha

Em **Configurações → Importar planilha Excel (.xlsx)**. O leitor de `.xlsx` é
próprio (sem bibliotecas externas): abre o arquivo com `DecompressionStream`
e lê os valores calculados das abas. Colaboradores citados nas movimentações
e ausentes do cadastro são criados automaticamente.

## Estrutura

```
index.html            página principal
css/app.css           estilos (tema claro e escuro)
js/util.js            datas, formatação, modal
js/db.js              IndexedDB
js/config.js          listas e parâmetros padrão por empresa
js/schema.js          definição dos módulos e campos
js/calc.js            campos calculados e pendências (equivalente às fórmulas)
js/charts.js          gráficos SVG
js/forms.js           formulário genérico
js/modules.js         listas com busca, filtros e exportação CSV
js/dashboards.js      painéis
js/reports.js         Ficha de EPI, OSS, 5W2H, prontuário, calendário da CIPA
js/xlsx-import.js     importação da planilha
js/backup.js          backup manual e automático
js/demo.js            empresa de demonstração (dados fictícios)
js/sync.js            sincronização com a planilha Google da equipe
js/app.js             navegação, empresa e configurações
sw.js                 cache para uso offline quando publicado
servidor/Code.gs      servidor da equipe (Google Apps Script)
servidor/LEIA-ME.md   instalação do servidor
```
