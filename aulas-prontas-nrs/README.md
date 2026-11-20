# Aulas Prontas de NRs · Prevenção Ativa

Kits de treinamento prontos para instrutores de SST, organizados por norma
regulamentadora. Cada kit traz apresentação editável, roteiros, avaliação e
documentos do treinamento.

## Normas disponíveis

| Norma | Tema | Carga horária do kit | Slides |
|---|---|---|---|
| NR-01 | GRO e PGR | 4 h (sugerida) | 26 |
| NR-05 | CIPA | 20 h (grau de risco 4; reduzir para 8, 12 ou 16 h) | 37 |
| NR-06 | Equipamento de Proteção Individual | 4 h (sugerida) | 23 |
| NR-10 | Segurança em Instalações e Serviços em Eletricidade | 40 h (curso básico) | 39 |
| NR-12 | Segurança no Trabalho em Máquinas e Equipamentos | 8 h (sugerida) | 30 |
| NR-18 | Indústria da Construção | 4 h (treinamento inicial) | 25 |
| NR-33 | Espaços Confinados | 16 h (autorizados e vigias) | 31 |
| NR-35 | Trabalho em Altura | 8 h (inicial) | 34 |

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
- Nos cursos longos (NR-05, NR-10 e NR-33), os slides cobrem todo o conteúdo
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
