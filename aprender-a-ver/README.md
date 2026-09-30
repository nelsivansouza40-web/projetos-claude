# Aprender a Ver — estudo de desenho

Aplicativo web instalável para estudo pessoal de desenho realista, com as
técnicas de Betty Edwards ("Desenhando com o Lado Direito do Cérebro") e de
Andrew Loomis ("Drawing the Head and Hands"). Funciona sem internet depois do
primeiro acesso e não envia nada para fora do aparelho.

## Endereço

Publicado junto com o app de inspeções, na subpasta:

https://nelsivansouza40-web.github.io/projetos-claude/aprender-a-ver/

O app de Inspeções SSMA continua no endereço de sempre (raiz do site).

## Instalar no celular

1. Abra o endereço acima no Chrome (Android) ou no Safari (iPhone).
2. Android: menu (três pontos) > "Instalar aplicativo". iPhone: Compartilhar >
   "Adicionar à Tela de Início".
3. Depois disso o app abre como aplicativo e funciona sem internet.

## Onde ficam os dados

Desenhos salvos, progresso e fotos ficam só no navegador do aparelho.
Limpar os dados do navegador apaga os desenhos; use "Baixar imagem" na
prancheta para guardar cópias.

## Estrutura

- `index.html`, `css/styles.css`, `manifest.webmanifest`, `sw.js` (modo offline)
- `js/licoes.js`: trilhas, lições passo a passo e exercícios
- `js/cabeca3d.js`: cabeça de Loomis em 3D
- `js/sims.js`: simuladores de luz e perspectiva
- `js/foto.js`: foto em etapas, grades de proporção, visor e aferição
- `js/prancheta.js`: prancheta e modos de exercício
- `js/progresso.js`: progresso e galeria
