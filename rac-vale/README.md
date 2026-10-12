# Auditoria de RAC – Check Básico de Campo

Aplicativo (PWA) para auditorias de campo dos Requisitos de Atividades
Críticas (RAC), feito para funcionar **sem internet**. As auditorias e as
fotos ficam gravadas no próprio aparelho.

## Conteúdo do checklist

As perguntas são as do arquivo "1- Check list - RAC.xlsx" (Check Básico de
Campo – Auditorias de RAC), com correção apenas de erros de digitação e de
cópia. Os títulos de cada RAC seguem a PNR-000069 Rev. 11.

| Seção | Itens |
|---|---|
| RAC 01 – Trabalhos em Altura | 8 |
| RAC 02 – Veículos Automotores Leves | 7 |
| RAC 03 – Operação de Equipamentos Móveis | 6 |
| RAC 04 – Bloqueio, Identificação e Zero Energia | 6 |
| RAC 05 – Içamento de Carga | 8 |
| RAC 07 – Proteção de Máquinas | 4 |
| RAC 08 – Atividades no Terreno | 2 |
| RAC 10 – Trabalhos em Eletricidade | 5 |
| Observações gerais (sempre avaliadas) | 6 |

Para alterar perguntas, edite somente `js/checklist.js`. Depois de haver
auditorias registradas, não mude a ordem dos itens existentes (o
identificador de cada resposta depende da posição); acrescente itens
novos no fim da seção.

## Como funciona

1. **Identificação**: data, hora, empresa, contrato, unidade, área,
   atividade, auditor e acompanhante; marcação dos RAC aplicáveis à frente
   auditada. As observações gerais entram sempre.
2. **Checklist**: cada item recebe Conforme, Não conforme ou N/A, com
   observação e fotos. Item não conforme exige ação corretiva (com
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
