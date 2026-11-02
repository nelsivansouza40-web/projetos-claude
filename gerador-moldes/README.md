# Gerador de Moldes

Aplicativo web que calcula moldes planificados a partir das medidas e gera as
folhas em escala real (1:1) para imprimir em A4, A3 ou Carta. Funciona com
papel, papel-cartão, papelão (até 10 mm) e EVA.

## Como usar

1. Abra `index.html` no navegador (computador ou celular).
2. Escolha o modelo e digite as medidas em centímetros.
3. Escolha o material. A espessura entra no cálculo das peças.
4. Toque em **Baixar PDF** e imprima em **tamanho real (100%)**, sem
   "ajustar à página". Confira a régua de 5 cm no rodapé de cada folha.

## Modelos

| Grupo | Modelo | Uso típico |
|---|---|---|
| Formas básicas | Caixa (com ou sem tampa) | embalagem, maquete de prédio, organizador |
| | Cilindro | porta-lápis, torre, tronco |
| | Cone | chapéu, telhado de torre, cone de sinalização |
| | Tronco de cone | copo, vaso, cauda de bicho |
| | Prisma de 3 a 12 lados | pata de bicho, coluna, embalagem sextavada |
| | Pirâmide de 3 a 12 lados | telhado, enfeite |
| | Tronco de pirâmide | cabeça de bicho, focinho, suporte |
| | Peça plana | placa, disco, pé, etiqueta |
| Figuras | Tatu | figura completa com 29 peças (40 cm) |

## Como as medidas são calculadas

- **Medidas externas.** O que você digita é a medida da peça pronta, por fora.
- **Linha neutra.** O material dobra em torno do meio da sua espessura. Por
  isso cada painel entre duas dobras mede *(medida externa − espessura)* e um
  tubo de diâmetro D tem comprimento π × (D − espessura) no molde. Em papel a
  diferença é desprezível; em papelão de 3 a 7 mm é o que faz a peça fechar.
- **Abas de cola.** Largura automática conforme a espessura (8 a 20 mm). Os
  cantos das abas são cortados em meia-esquadria conforme o espaço livre, para
  uma aba nunca invadir a peça vizinha. Quando não há espaço, o aplicativo
  avisa e sugere uma tira de emenda.
- **Material grosso (1,5 mm ou mais).** Junções em "T", como as costelas do
  tatu, são coladas de topo, sem abas.
- **Peças maiores que a folha** são giradas até caber. Quando nem assim cabem,
  saem divididas em partes com 10 mm de sobreposição para emendar.

## Tatu: como as peças fecham

As medidas de todas as peças saem do comprimento total:

- costelas B em meia elipse, mais altas no meio do corpo;
- cada faixa C mede exatamente a meia volta da sua costela, somada à espessura
  do material (conferido também pela fórmula de Ramanujan nos testes);
- a cabeça D é dimensionada para caber na frente da costela B1, e a cauda G
  para caber na traseira da última costela. A tela mostra as duas conferências.

## Arquivos

- `index.html`: tela do aplicativo.
- `js/geometria.js`: planificação das peças (sem dependência de navegador).
- `js/paginacao.js`: distribuição das peças nas folhas e lista de desenho.
- `js/app.js`: formulário, prévia em SVG, impressão e PDF.
- `js/lib/jspdf.umd.min.js`: biblioteca jsPDF 2.5.1 (licença MIT, em
  `js/lib/jspdf-LICENSE.txt`) para gerar o PDF sem internet.
- `testes/testes.js`: testes automáticos.

## Testes

```bash
node gerador-moldes/testes/testes.js
```

Os testes geram todos os modelos em todos os materiais, conferem que nenhum
contorno se cruza (inclusive com centenas de medidas aleatórias), conferem as
contas de cada forma e verificam que as peças ficam dentro da folha e não se
sobrepõem.

## Próximas etapas previstas

- Novas figuras montadas com os mesmos módulos.
- Importação de modelo 3D (.obj ou .stl) com planificação automática.
