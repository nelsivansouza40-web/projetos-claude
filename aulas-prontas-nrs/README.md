# Aulas Prontas de NRs · Prevenção Ativa

Kits de treinamento prontos para instrutores de SST, organizados por norma
regulamentadora. Cada kit traz apresentação editável, roteiros, avaliação e
documentos do treinamento.

## Normas disponíveis

| Norma | Tema | Carga do kit | Slides |
|---|---|---|---|
| NR-01 | GRO e PGR | 4 h | 26 |
| NR-03 | Embargo e Interdição | 2 h | 16 |
| NR-04 | Serviços Especializados em Segurança e Medicina do Trabalho | 2 h | 14 |
| NR-05 | CIPA | 20 h | 37 |
| NR-06 | Equipamento de Proteção Individual | 4 h | 23 |
| NR-07 | Programa de Controle Médico de Saúde Ocupacional | 4 h | 20 |
| NR-08 | Edificações | 2 h | 14 |
| NR-09 | Agentes Físicos, Químicos e Biológicos | 4 h | 18 |
| NR-10 | Segurança em Instalações e Serviços em Eletricidade | 40 h | 39 |
| NR-11 | Movimentação e Armazenagem de Materiais | 8 h | 20 |
| NR-12 | Segurança no Trabalho em Máquinas e Equipamentos | 8 h | 30 |
| NR-13 | Caldeiras, Vasos de Pressão, Tubulações e Tanques Metálicos | 8 h | 23 |
| NR-14 | Fornos | 2 h | 14 |
| NR-15 | Atividades e Operações Insalubres | 4 h | 17 |
| NR-16 | Atividades e Operações Perigosas | 2 h | 14 |
| NR-17 | Ergonomia | 4 h | 20 |
| NR-18 | Segurança e Saúde no Trabalho na Indústria da Construção | 4 h | 25 |
| NR-19 | Explosivos | 4 h | 17 |
| NR-20 | Inflamáveis e Combustíveis | 8 h | 20 |
| NR-21 | Trabalhos a Céu Aberto | 2 h | 14 |
| NR-22 | Segurança e Saúde Ocupacional na Mineração | 8 h | 22 |
| NR-23 | Proteção contra Incêndios | 4 h | 15 |
| NR-24 | Condições Sanitárias e de Conforto nos Locais de Trabalho | 2 h | 14 |
| NR-25 | Resíduos Industriais | 2 h | 14 |
| NR-26 | Sinalização e Identificação de Segurança | 4 h | 18 |
| NR-28 | Fiscalização e Penalidades | 2 h | 14 |
| NR-29 | Segurança e Saúde no Trabalho Portuário | 8 h | 21 |
| NR-30 | Segurança e Saúde no Trabalho Aquaviário | 8 h | 20 |
| NR-31 | Trabalho Rural: Aplicação de Agrotóxicos | 20 h | 28 |
| NR-32 | Segurança e Saúde no Trabalho em Serviços de Saúde | 4 h | 19 |
| NR-33 | Segurança e Saúde nos Trabalhos em Espaços Confinados | 16 h | 31 |
| NR-34 | Indústria da Construção, Montagem e Reparação Naval | 8 h | 21 |
| NR-35 | Trabalho em Altura | 8 h | 34 |
| NR-36 | Frigoríficos | 4 h | 18 |
| NR-37 | Segurança e Saúde em Plataformas de Petróleo | 8 h | 21 |
| NR-38 | Atividades de Limpeza Urbana e Manejo de Resíduos Sólidos | 4 h | 19 |

As cargas sugeridas e as observações de cada norma estão no plano de aula do kit. A NR-02 e a NR-27 foram revogadas e não têm kit.

## O que tem em cada kit

Pasta `kits/NR-XX - Tema/`, com os arquivos editáveis e cópias em `PDF/`:

| Arquivo | Conteúdo |
|---|---|
| `01-Apresentacao.pptx` | Slides com a fala do instrutor nas anotações de cada slide |
| `02-Plano-de-Aula.docx` | Identificação, objetivos, conteúdo programático com tempos, metodologia, recursos, critério de aprovação e referências |
| `03-Roteiro-do-Instrutor.docx` | Fala-guia, perguntas para a turma e dicas de condução, slide a slide |
| `04-Roteiro-de-Gravacao.docx` | Um vídeo por módulo, com cena e fala, duração estimada e vídeos de abertura e encerramento |
| `05-Avaliacao.docx` | Prova com 10 questões e checklist de avaliação prática |
| `06-Gabarito.docx` | Respostas comentadas, de uso do instrutor |
| `07-Documentos.docx` | Lista de presença, certificado editável e avaliação de reação |
| `08-Material-de-Apoio.docx` | Estudo de caso com análise, dinâmica e DDS |

## Antes de aplicar ou vender

- Confira carga horária e conteúdo programático no texto vigente de cada NR.
- O material apoia o instrutor habilitado. A validade do certificado depende
  da qualificação do instrutor, do responsável técnico e do cumprimento da
  carga horária, incluindo a parte prática.
- Nos cursos longos (NR-05, NR-10, NR-31 e NR-33), os slides cobrem todo o conteúdo
  programático; o tempo restante é preenchido com exemplos da empresa, leitura
  da norma, exercícios, dinâmica, estudo de caso e prática. O roteiro do
  instrutor explica como distribuir esse tempo.
- Os estudos de caso são didáticos, sem nomes ou empresas reais.

## Como editar o conteúdo e gerar de novo

O texto de cada norma fica em `conteudo/nrXX.json`. O gerador monta todos os
arquivos a partir dele.

```bash
cd gerador
npm install
pip install python-docx
./build_kit.sh ../conteudo/nr35.json
```

Para gerar todas as normas: `./build_kit.sh ../conteudo/nr*.json`.
A conversão para PDF usa o LibreOffice (`soffice`).

## Plano do produto

`plano/index.html` traz o plano de criação e venda do produto.
