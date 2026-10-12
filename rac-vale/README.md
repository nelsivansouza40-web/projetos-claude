# Auditoria de RAC – Check Básico de Campo

Aplicativo (PWA) para auditorias de campo dos Requisitos de Atividades
Críticas (RAC), feito para funcionar **sem internet**. As auditorias e as
fotos ficam gravadas no próprio aparelho.

## Conteúdo do checklist

RAC 01, 02, 03, 04, 05, 07, 08, 10 e as observações gerais: perguntas do
arquivo "1- Check list - RAC.xlsx" (Check Básico de Campo – Auditorias de
RAC), com correção apenas de erros de digitação e de cópia.

RAC 06, 09, 11, 12 e 13: montados a partir da PNR-000069 Rev. 11 no mesmo
padrão do checklist original (itens curtos e verificáveis em campo:
documento da atividade, controle físico do risco, equipamento inspecionado
com checklist, capacitação), dando prioridade aos requisitos prioritários
do Anexo VI. Em `js/checklist.js`, cada um desses itens indica o requisito
de origem no campo `ref`. A lista do RAC 06 foi aprovada pelo gestor.

| Seção | Itens | Origem |
|---|---|---|
| RAC 01 – Trabalhos em Altura | 8 | Checklist original |
| RAC 02 – Veículos Automotores Leves | 7 | Checklist original |
| RAC 03 – Operação de Equipamentos Móveis | 6 | Checklist original |
| RAC 04 – Bloqueio, Identificação e Zero Energia | 6 | Checklist original |
| RAC 05 – Içamento de Carga | 8 | Checklist original |
| RAC 06 – Espaços Confinados | 11 | PNR-000069 Rev. 11 |
| RAC 07 – Proteção de Máquinas | 4 | Checklist original |
| RAC 08 – Atividades no Terreno | 2 | Checklist original |
| RAC 09 – Explosivos | 8 | PNR-000069 Rev. 11 |
| RAC 10 – Trabalhos em Eletricidade | 5 | Checklist original |
| RAC 11 – Metal Líquido | 8 | PNR-000069 Rev. 11 |
| RAC 12 – Trabalho a Quente | 9 | PNR-000069 Rev. 11 |
| RAC 13 – Abertura de Linhas e Equipamentos | 8 | PNR-000069 Rev. 11 |
| Observações gerais (sempre avaliadas) | 6 | Checklist original |

Para alterar perguntas, edite somente `js/checklist.js`. Depois de haver
auditorias registradas, não mude a ordem dos itens existentes (o
identificador de cada resposta depende da posição); acrescente itens
novos no fim da seção.

## Como funciona

1. **Identificação**: data, hora, empresa, contrato, unidade, área,
   atividade, auditor e acompanhante; marcação dos RAC aplicáveis à frente
   auditada. As observações gerais entram sempre.
2. **Checklist**: cada item recebe Conforme, Não conforme ou N/A, com
   observação e fotos (câmera ou galeria), sempre visíveis. Item não conforme exige ação corretiva (com
   responsável e prazo).
3. **Fechamento**: resultado por seção, comentários do auditor e
   assinaturas na tela (opcionais).
4. **Relatório**: identificação, índice de conformidade, plano de ação,
   itens verificados com fotos e assinaturas. Sai em PDF pela opção
   "Salvar em PDF / imprimir" e em planilha (CSV) para Excel.

Índice de conformidade = conformes ÷ (conformes + não conformes). Itens N/A
não entram no cálculo.

## Instalação no aparelho

1. Publique a pasta `rac-vale/` em um endereço HTTPS (GitHub Pages,
   Netlify ou servidor interno).
2. Abra o endereço no celular e use "Adicionar à tela inicial".
3. A partir daí o aplicativo abre sem internet.

## Cópia de segurança

Os dados ficam só no aparelho. Na tela inicial, use "Exportar cópia" para
gerar um arquivo com todas as auditorias e fotos, e "Restaurar cópia" para
recuperar em outro aparelho.
