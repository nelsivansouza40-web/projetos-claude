# Auditoria de RAC – Check Básico de Campo

Aplicativo (PWA) para auditorias de campo dos Requisitos de Atividades
Críticas (RAC), feito para funcionar **sem internet**. As auditorias e as
fotos ficam gravadas no próprio aparelho.

## Conteúdo do checklist

Cada RAC tem no mínimo 15 itens (287 no total, incluindo as observações
gerais; até 25 por RAC). Os primeiros itens de cada seção vêm do arquivo "1- Check list -
RAC.xlsx" (RAC 01, 02, 03, 04, 05, 07, 08, 10 e observações), com correção
apenas de erros de digitação e de cópia; os itens dos RAC 06, 09, 11, 12 e
13 e todos os itens complementares vêm da PNR-000069 Rev. 11, selecionando
o que é verificável em campo e priorizando os requisitos prioritários do
Anexo VI.

Em cada item o aplicativo mostra o requisito de origem na PNR-000069, a
marcação "Requisito prioritário" (Anexo VI) e, enquanto estiver correndo,
o prazo de implementação do Anexo V (ou a indicação de que o prazo é
definido no plano de ação da área). Essas informações também saem no
relatório e na planilha.

| Seção | Itens | Prioritários |
|---|---|---|
| RAC 01 – Trabalhos em Altura | 25 | 4 |
| RAC 02 – Veículos Automotores Leves | 22 | 9 |
| RAC 03 – Operação de Equipamentos Móveis | 25 | 10 |
| RAC 04 – Bloqueio, Identificação e Zero Energia | 19 | 6 |
| RAC 05 – Içamento de Carga | 25 | 10 |
| RAC 06 – Espaços Confinados | 22 | 5 |
| RAC 07 – Proteção de Máquinas | 19 | 4 |
| RAC 08 – Atividades no Terreno | 19 | 6 |
| RAC 09 – Explosivos | 21 | 7 |
| RAC 10 – Trabalhos em Eletricidade | 25 | 7 |
| RAC 11 – Metal Líquido | 19 | 0 (a norma não define prioritários) |
| RAC 12 – Trabalho a Quente | 23 | 6 |
| RAC 13 – Abertura de Linhas e Equipamentos | 17 | 6 |
| Observações gerais (sempre avaliadas) | 6 | – |

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
3. **Fechamento**: resultado por seção, comentários do auditor, pontos
   observados (descrição, local, GPS opcional e fotos) e assinaturas na
   tela (opcionais), com botões para salvar e limpar.
4. **Relatório**: identificação, índice de conformidade, plano de ação,
   itens verificados com fotos, pontos observados e assinaturas. Sai em PDF pela opção
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
