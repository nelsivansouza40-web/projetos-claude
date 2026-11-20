# Gera os documentos editáveis (DOCX) de um kit de NR a partir de conteudo/nrXX.json
# Uso: python3 build_docx.py ../conteudo/nr35.json pasta_de_saida
import json, sys, os, math
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.section import WD_ORIENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

NAVY = RGBColor(0x13, 0x23, 0x3A)
YELLOW_HEX = "F2B705"
NAVY_HEX = "13233A"
LIGHT_HEX = "EEF1F4"
SLATE = RGBColor(0x5B, 0x6B, 0x7F)
PALAVRAS_POR_MINUTO = 140


def shade(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tcPr.append(shd)


def page_number_field(paragraph):
    run = paragraph.add_run()
    for tag, text in (("begin", None), (None, "PAGE"), ("end", None)):
        if tag:
            el = OxmlElement("w:fldChar")
            el.set(qn("w:fldCharType"), tag)
        else:
            el = OxmlElement("w:instrText")
            el.set(qn("xml:space"), "preserve")
            el.text = text
        run._r.append(el)


def new_doc(d, titulo_doc):
    doc = Document()
    sec = doc.sections[0]
    sec.page_height, sec.page_width = Cm(29.7), Cm(21.0)
    sec.left_margin = sec.right_margin = Cm(2.0)
    sec.top_margin, sec.bottom_margin = Cm(2.0), Cm(1.8)
    st = doc.styles["Normal"]
    st.font.name = "Calibri"
    st.element.rPr.rFonts.set(qn("w:eastAsia"), "Calibri")
    st.font.size = Pt(11)
    st.paragraph_format.space_after = Pt(6)
    st.paragraph_format.line_spacing = 1.15
    for name, size in (("Title", 24), ("Heading 1", 16), ("Heading 2", 13), ("Heading 3", 11.5)):
        h = doc.styles[name]
        h.font.name = "Arial"
        h.element.rPr.rFonts.set(qn("w:ascii"), "Arial")
        h.element.rPr.rFonts.set(qn("w:hAnsi"), "Arial")
        h.font.size = Pt(size)
        h.font.bold = True
        h.font.color.rgb = NAVY
        h.paragraph_format.space_before = Pt(14 if name != "Title" else 0)
        h.paragraph_format.space_after = Pt(6)
    hp = sec.header.paragraphs[0]
    r = hp.add_run(f"PREVENÇÃO ATIVA  ·  NR-{d['nr']} {d['titulo']}  ·  {titulo_doc}")
    r.font.size = Pt(8.5)
    r.font.color.rgb = SLATE
    fp = sec.footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    rr = fp.add_run("Página ")
    rr.font.size = Pt(8.5)
    page_number_field(fp)
    # capa compacta
    t = doc.add_paragraph(style="Title")
    t.add_run(titulo_doc)
    p = doc.add_paragraph()
    rn = p.add_run(f"NR-{d['nr']}  ·  {d['titulo']}")
    rn.bold = True
    rn.font.size = Pt(13)
    rn.font.color.rgb = SLATE
    return doc


def table(doc, header, rows, widths=None, header_fill=NAVY_HEX, zebra=True, font=10):
    tb = doc.add_table(rows=1, cols=len(header))
    tb.style = "Table Grid"
    tb.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, h in enumerate(header):
        c = tb.rows[0].cells[i]
        c.text = ""
        run = c.paragraphs[0].add_run(h)
        run.bold = True
        run.font.size = Pt(font)
        run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF) if header_fill == NAVY_HEX else NAVY
        shade(c, header_fill)
    for ri, row in enumerate(rows):
        cells = tb.add_row().cells
        for i, v in enumerate(row):
            cells[i].text = ""
            run = cells[i].paragraphs[0].add_run(str(v))
            run.font.size = Pt(font)
            if zebra and ri % 2 == 0:
                shade(cells[i], LIGHT_HEX)
    if widths:
        tb.autofit = False
        for i, w in enumerate(widths):
            tb.columns[i].width = Cm(w)
        for row in tb.rows:
            for i, w in enumerate(widths):
                row.cells[i].width = Cm(w)
    doc.add_paragraph()
    return tb


def kv(doc, pares):
    tb = doc.add_table(rows=0, cols=2)
    tb.style = "Table Grid"
    for k, v in pares:
        cells = tb.add_row().cells
        cells[0].text = ""
        r = cells[0].paragraphs[0].add_run(k)
        r.bold = True
        r.font.color.rgb = NAVY
        shade(cells[0], LIGHT_HEX)
        cells[1].text = v
        cells[0].width, cells[1].width = Cm(4.5), Cm(12.5)
    tb.autofit = False
    tb.columns[0].width, tb.columns[1].width = Cm(4.5), Cm(12.5)
    doc.add_paragraph()


def bullets(doc, itens, style="List Bullet"):
    for it in itens:
        doc.add_paragraph(it, style=style)


def label(doc, rotulo, texto, cor=NAVY):
    p = doc.add_paragraph()
    r = p.add_run(rotulo + " ")
    r.bold = True
    r.font.color.rgb = cor
    p.add_run(texto)
    return p


def nota_conferencia(doc):
    p = doc.add_paragraph()
    r = p.add_run("Antes de aplicar, confira a carga horária e o conteúdo programático no texto vigente da norma e adapte exemplos e procedimentos à realidade da empresa.")
    r.italic = True
    r.font.size = Pt(9.5)
    r.font.color.rgb = SLATE


def etapas(d):
    out = [(f"Módulo {i+1}", m["titulo"], m["duracao"]) for i, m in enumerate(d["modulos"])]
    if d.get("pratica"):
        out.append(("Prática", d["pratica"]["titulo"], d["pratica"]["duracao"]))
    out.append(("Avaliação", "Prova teórica, avaliação de reação e encerramento", 30))
    return out


def numeracao_slides(d):
    """Mesma ordem do build_pptx.js: capa, objetivos, programação, depois divisor + slides de cada módulo."""
    n = 3
    mapa = []
    for m in d["modulos"]:
        n += 1
        div = n
        nums = []
        for _ in m["slides"]:
            n += 1
            nums.append(n)
        mapa.append((div, nums))
    return mapa


def minutos(texto):
    return len(texto.split()) / PALAVRAS_POR_MINUTO


# ---------------- Documentos ----------------

def plano_de_aula(d, out):
    doc = new_doc(d, "Plano de Aula")
    doc.add_heading("Identificação", 1)
    kv(doc, [
        ("Norma", f"NR-{d['nr']} {d['titulo']}"),
        ("Carga horária", d["carga"]),
        ("Periodicidade", d["periodicidade"]),
        ("Público", d["publico"]),
        ("Pré-requisitos", d["prerequisitos"]),
        ("Instrutor", d["instrutor"]),
    ])
    doc.add_heading("Objetivos de aprendizagem", 1)
    doc.add_paragraph("Ao final do treinamento, o participante será capaz de:")
    bullets(doc, d["objetivos"])
    doc.add_heading("Conteúdo programático e distribuição do tempo", 1)
    linhas = []
    for i, m in enumerate(d["modulos"]):
        topicos = "; ".join(s["titulo"] for s in m["slides"])
        linhas.append([f"Módulo {i+1}", f"{m['titulo']}. Tópicos: {topicos}", f"{m['duracao']} min"])
    if d.get("pratica"):
        linhas.append(["Prática", d["pratica"]["descricao"], f"{d['pratica']['duracao']} min"])
    linhas.append(["Avaliação", "Prova teórica, avaliação de reação e encerramento", "30 min"])
    total = sum(e[2] for e in etapas(d))
    linhas.append(["Total", "", f"{total} min ({total/60:.1f} h)".replace(".", ",")])
    table(doc, ["Etapa", "Conteúdo", "Tempo"], linhas, widths=[2.6, 12.0, 2.4])
    doc.add_heading("Metodologia", 1)
    bullets(doc, [
        "Exposição dialogada com apoio da apresentação, sempre partindo de situações reais do local de trabalho",
        "Perguntas à turma ao longo de cada módulo para verificar entendimento e trazer a experiência dos participantes",
        f"Estudo de caso: {d['caso']['titulo']}",
        f"Dinâmica: {d['dinamica']['titulo']}",
    ] + (["Prática supervisionada com checklist individual"] if d.get("pratica") else []))
    doc.add_heading("Recursos necessários", 1)
    bullets(doc, d["recursos"])
    doc.add_heading("Avaliação e critério de aprovação", 1)
    doc.add_paragraph(d["aprovacao"])
    doc.add_paragraph("Registros obrigatórios: lista de presença assinada, prova corrigida" + (", checklist prático" if d.get("pratica") else "") + " e certificado emitido conforme a NR-01.")
    doc.add_heading("Referências", 1)
    bullets(doc, d["referencias"])
    nota_conferencia(doc)
    doc.save(os.path.join(out, "02-Plano-de-Aula.docx"))


def roteiro_instrutor(d, out):
    doc = new_doc(d, "Roteiro do Instrutor")
    doc.add_heading("Como usar este roteiro", 1)
    doc.add_paragraph("Este roteiro acompanha a apresentação slide a slide. Para cada slide você encontra a fala-guia, que pode ser lida no ensaio e depois dita com as suas palavras, as perguntas para envolver a turma e dicas práticas de condução. As mesmas falas estão nas anotações do apresentador, no PowerPoint.")
    doc.add_heading("Antes da aula", 2)
    bullets(doc, [
        "Testar projetor, som e a apresentação no computador da sala",
        "Imprimir lista de presença, provas" + (", checklist prático" if d.get("pratica") else "") + " e avaliação de reação",
        "Separar os materiais da dinâmica e do estudo de caso",
        "Substituir exemplos genéricos por situações reais da empresa atendida",
        "Confirmar que todos os participantes atendem aos pré-requisitos: " + d["prerequisitos"],
    ])
    total = sum(e[2] for e in etapas(d))
    if total > 480:
        doc.add_heading("Como cumprir a carga horária", 2)
        doc.add_paragraph(f"Este curso tem {total // 60} horas. A apresentação e as falas cobrem todo o conteúdo programático, mas a carga horária exige aprofundamento em sala. Em cada módulo, use o tempo indicado para: discutir exemplos e procedimentos reais da empresa, ler com a turma os itens da norma correspondentes ao tema, aplicar as perguntas de cada slide em pequenos grupos com apresentação das respostas, mostrar equipamentos e documentos reais e realizar a dinâmica, o estudo de caso e os exercícios práticos. Registre na lista de presença o horário de início e término de cada dia.")
    doc.add_heading("Abertura (slides 1 a 3)", 1)
    label(doc, "Tempo:", "15 minutos.")
    label(doc, "Fala-guia:", f"Bom dia a todos. Meu nome é [nome do instrutor] e vamos passar as próximas horas juntos falando sobre a NR-{d['nr']}, {d['titulo']}. Este treinamento tem carga de {d['carga'].lower()}. Mais do que cumprir uma exigência da norma, o objetivo aqui é que cada um saia sabendo o que fazer e o que não fazer no dia a dia.")
    label(doc, "Conduza:", "Faça uma rodada rápida de apresentação com nome, função e tempo de empresa. Pergunte o que cada um espera do treinamento e anote no quadro.")
    mapa = numeracao_slides(d)
    for i, m in enumerate(d["modulos"]):
        div, nums = mapa[i]
        doc.add_heading(f"Módulo {i+1}: {m['titulo']}", 1)
        label(doc, "Tempo total:", f"{m['duracao']} minutos.")
        label(doc, f"Slide {div} (abertura do módulo):", m.get("gancho", ""))
        for s, n in zip(m["slides"], nums):
            doc.add_heading(f"Slide {n}  ·  {s['titulo']}", 2)
            label(doc, "Fala-guia:", s["fala"])
            if s.get("pergunta"):
                label(doc, "Pergunta para a turma:", s["pergunta"])
            if s.get("dica"):
                label(doc, "Dica de condução:", s["dica"], SLATE)
        if i == d.get("caso_modulo", len(d["modulos"]) - 2):
            doc.add_heading("Estudo de caso", 2)
            doc.add_paragraph(f"Ao final deste módulo, aplique o estudo de caso \"{d['caso']['titulo']}\" do Material de Apoio. Tempo sugerido: 25 minutos.")
    if d.get("pratica"):
        doc.add_heading(d["pratica"]["titulo"], 1)
        label(doc, "Tempo:", f"{d['pratica']['duracao']} minutos.")
        doc.add_paragraph(d["pratica"]["descricao"])
        bullets(doc, d["pratica"]["itens"])
    doc.add_heading("Avaliação e encerramento", 1)
    bullets(doc, [
        "Distribua a prova e informe o tempo de 20 minutos",
        "Corrija com o gabarito comentado e devolva as provas revisando as questões com mais erros",
        "Retome as expectativas anotadas na abertura",
        "Aplique a avaliação de reação e recolha a lista de presença assinada",
        f"Critério de aprovação: {d['aprovacao']}",
    ])
    nota_conferencia(doc)
    doc.save(os.path.join(out, "03-Roteiro-do-Instrutor.docx"))


def roteiro_gravacao(d, out):
    doc = new_doc(d, "Roteiro de Gravação")
    doc.add_heading("Orientações de gravação", 1)
    bullets(doc, [
        "Um vídeo por módulo, além de um vídeo de apresentação do curso e um de encerramento",
        "Formato 16:9, resolução mínima Full HD, microfone de lapela ou direcional",
        "Enquadramento em plano médio, câmera na altura dos olhos e fundo neutro ou ambiente industrial organizado",
        "Quando indicado TELA, o slide ocupa a tela inteira e o apresentador aparece em janela no canto ou só em voz",
        "Ao gravar em área operacional, use todos os EPIs exigidos no local. O vídeo também ensina pelo exemplo",
        "Leia o texto em voz alta antes de gravar e ajuste palavras que não soem naturais na sua fala",
        f"Tempo estimado calculado com {PALAVRAS_POR_MINUTO} palavras por minuto",
    ])
    total_min = 0
    # Vídeo de apresentação
    objs = "; ".join(o[0].lower() + o[1:] for o in d["objetivos"][:3])
    abertura = f"Olá, seja bem-vindo ao treinamento da NR-{d['nr']}, {d['titulo']}. Eu sou [nome do instrutor] e vou acompanhar você em cada etapa deste curso. Aqui você vai aprender a {objs}. O curso está dividido em {len(d['modulos'])} módulos curtos, com exemplos reais e uma avaliação no final. Anote suas dúvidas, pense nas atividades do seu dia a dia e vamos começar."
    total_min += minutos(abertura)
    doc.add_heading("Vídeo 0  ·  Apresentação do curso", 1)
    label(doc, "Duração estimada:", f"{max(1, round(minutos(abertura)))} min")
    table(doc, ["Cena", "Fala"], [["CÂMERA: apresentador em plano médio. Lettering com o nome do curso e a logomarca.", abertura]], widths=[5.0, 12.0])
    for i, m in enumerate(d["modulos"]):
        linhas = [["CÂMERA: apresentador em plano médio. Lettering: Módulo " + str(i + 1) + " · " + m["titulo"], m.get("gancho", "")]]
        for k, s in enumerate(m["slides"]):
            cena = s.get("cena") or (f"TELA: slide \"{s['titulo']}\"." + (" Apresentador em janela no canto." if k % 2 == 0 else " Narração em voz."))
            if s.get("apoio"):
                cena += f" IMAGEM DE APOIO: {s['apoio']}."
            linhas.append([cena, s["fala"]])
        proximo = d["modulos"][i + 1]["titulo"].lower() if i + 1 < len(d["modulos"]) else None
        topicos = ", ".join(s["titulo"].lower() for s in m["slides"])
        fecho = f"Neste módulo nós vimos {topicos}. " + (f"No próximo módulo vamos falar sobre {proximo}. Até lá." if proximo else "Com isso fechamos o conteúdo do curso. No próximo vídeo vamos revisar os pontos principais e preparar você para a avaliação.")
        linhas.append(["CÂMERA: apresentador em plano médio.", fecho])
        dur = sum(minutos(l[1]) for l in linhas)
        total_min += dur
        doc.add_heading(f"Vídeo {i+1}  ·  {m['titulo']}", 1)
        label(doc, "Duração estimada:", f"{max(1, round(dur))} min")
        table(doc, ["Cena", "Fala"], linhas, widths=[5.0, 12.0])
    encerramento = f"Chegamos ao fim do treinamento da NR-{d['nr']}. Antes de ir, guarde três ideias. Primeiro, " + d["objetivos"][0][0].lower() + d["objetivos"][0][1:] + ". Segundo, " + d["objetivos"][2][0].lower() + d["objetivos"][2][1:] + ". E terceiro, sempre que perceber um risco grave e iminente, pare e comunique. Agora faça a avaliação com calma. Obrigado pela atenção e bom trabalho com segurança."
    total_min += minutos(encerramento)
    doc.add_heading(f"Vídeo {len(d['modulos'])+1}  ·  Encerramento", 1)
    label(doc, "Duração estimada:", f"{max(1, round(minutos(encerramento)))} min")
    table(doc, ["Cena", "Fala"], [["CÂMERA: apresentador em plano médio. Lettering final com a chamada para a avaliação.", encerramento]], widths=[5.0, 12.0])
    doc.add_heading("Resumo", 2)
    doc.add_paragraph(f"{len(d['modulos'])+2} vídeos, com duração total estimada de {round(total_min)} minutos de fala. A gravação em vídeo não substitui a parte prática nem a carga horária exigida pela norma; ela apoia turmas presenciais, semipresenciais ou reciclagens, nos limites permitidos pela NR-01 e pela própria NR.")
    nota_conferencia(doc)
    doc.save(os.path.join(out, "04-Roteiro-de-Gravacao.docx"))


def cabecalho_participante(doc, campos):
    tb = doc.add_table(rows=len(campos), cols=2)
    tb.style = "Table Grid"
    for i, (a, b) in enumerate(campos):
        tb.rows[i].cells[0].text = a
        tb.rows[i].cells[1].text = b
        for c in tb.rows[i].cells:
            c.width = Cm(8.5)
    doc.add_paragraph()


def avaliacao(d, out):
    doc = new_doc(d, "Avaliação Teórica")
    cabecalho_participante(doc, [("Nome:", "Data:"), ("Empresa:", "Nota:")])
    p = doc.add_paragraph()
    p.add_run("Instruções: ").bold = True
    p.add_run(f"marque apenas uma alternativa por questão. Cada questão vale {10/len(d['prova']):.1f} ponto. ".replace(".", ",", 1) + "Tempo: 20 minutos.")
    letras = "abcd"
    for i, q in enumerate(d["prova"]):
        pq = doc.add_paragraph()
        pq.paragraph_format.space_before = Pt(8)
        pq.paragraph_format.keep_with_next = True
        r = pq.add_run(f"{i+1}. {q['q']}")
        r.bold = True
        for j, o in enumerate(q["o"]):
            po = doc.add_paragraph(f"(   ) {letras[j]}) {o}")
            po.paragraph_format.left_indent = Cm(0.6)
            po.paragraph_format.space_after = Pt(2)
            if j < 3:
                po.paragraph_format.keep_with_next = True
    if d.get("pratica"):
        doc.add_page_break()
        doc.add_heading("Checklist de avaliação prática", 1)
        cabecalho_participante(doc, [("Nome:", "Data:"), ("Instrutor:", "Resultado:  (  ) Apto   (  ) Não apto")])
        table(doc, ["Item avaliado", "Satisfatório", "Não satisfatório"], [[it, "", ""] for it in d["pratica"]["itens"]], widths=[11.0, 3.0, 3.0], zebra=False)
        doc.add_paragraph("Assinatura do instrutor: ________________________________________")
    doc.save(os.path.join(out, "05-Avaliacao.docx"))


def gabarito(d, out):
    doc = new_doc(d, "Gabarito Comentado")
    p = doc.add_paragraph("Documento de uso exclusivo do instrutor. ")
    p.runs[0].bold = True
    p.add_run(d["aprovacao"])
    letras = "abcd"
    table(doc, ["Questão", "Resposta"], [[str(i + 1), letras[q["c"]]] for i, q in enumerate(d["prova"])], widths=[3, 3])
    for i, q in enumerate(d["prova"]):
        doc.add_heading(f"Questão {i+1}", 3)
        doc.add_paragraph(q["q"])
        label(doc, "Resposta:", f"{letras[q['c']]}) {q['o'][q['c']]}")
        label(doc, "Comentário:", q["com"], SLATE)
    doc.save(os.path.join(out, "06-Gabarito.docx"))


def documentos(d, out):
    doc = new_doc(d, "Documentos do Treinamento")
    doc.add_heading("Lista de presença", 1)
    kv(doc, [("Treinamento", f"NR-{d['nr']} {d['titulo']}"), ("Carga horária", d["carga"]), ("Data e horário", ""), ("Local", ""), ("Instrutor", "")])
    table(doc, ["Nº", "Nome completo", "CPF ou matrícula", "Função", "Assinatura"], [[str(i + 1), "", "", "", ""] for i in range(18)], widths=[1.0, 5.5, 3.2, 3.0, 4.3], zebra=False)
    doc.add_paragraph("Assinatura do instrutor: ____________________________   Responsável técnico: ____________________________")
    # Certificado em paisagem
    sec = doc.add_section()
    sec.orientation = WD_ORIENT.LANDSCAPE
    sec.page_width, sec.page_height = Cm(29.7), Cm(21.0)
    sec.left_margin = sec.right_margin = Cm(2.5)
    t = doc.add_paragraph()
    t.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = t.add_run("CERTIFICADO")
    r.bold = True
    r.font.size = Pt(34)
    r.font.name = "Arial"
    r.font.color.rgb = NAVY
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(18)
    r = p.add_run("Certificamos que ")
    r.font.size = Pt(14)
    r = p.add_run("[NOME DO PARTICIPANTE]")
    r.bold = True
    r.font.size = Pt(14)
    r = p.add_run(f", portador do documento [CPF], concluiu com aproveitamento o treinamento ")
    r.font.size = Pt(14)
    r = p.add_run(f"NR-{d['nr']} {d['titulo']}")
    r.bold = True
    r.font.size = Pt(14)
    r = p.add_run(f", com carga horária de {d['carga'].split(' (')[0]}, realizado em [DATA], em [LOCAL], sob a modalidade [presencial/semipresencial].")
    r.font.size = Pt(14)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(10)
    r = p.add_run("Conteúdo programático: " + "; ".join(m["titulo"] for m in d["modulos"]) + (f"; {d['pratica']['titulo'].lower()}" if d.get("pratica") else "") + ".")
    r.font.size = Pt(10)
    sig = doc.add_table(rows=2, cols=3)
    for i, txt in enumerate(["Participante", "Instrutor: [nome e qualificação]", "Responsável técnico: [nome e registro]"]):
        sig.rows[0].cells[i].text = "\n\n\n______________________________"
        sig.rows[1].cells[i].text = txt
        for row in (0, 1):
            sig.rows[row].cells[i].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    r = p.add_run("[Logotipo e dados da empresa emissora]   ·   O certificado deve conter os dados exigidos pela NR-01 e ser entregue ao trabalhador, com cópia arquivada pela empresa.")
    r.font.size = Pt(8.5)
    r.font.color.rgb = SLATE
    # Avaliação de reação em retrato
    sec = doc.add_section()
    sec.orientation = WD_ORIENT.PORTRAIT
    sec.page_width, sec.page_height = Cm(21.0), Cm(29.7)
    sec.left_margin = sec.right_margin = Cm(2.0)
    doc.add_heading("Avaliação de reação", 1)
    doc.add_paragraph("Sua opinião ajuda a melhorar os próximos treinamentos. Não é necessário se identificar. Marque de 1 (ruim) a 5 (excelente).")
    itens = ["O conteúdo foi útil para o meu trabalho", "O instrutor explicou com clareza", "Os exemplos tinham relação com a minha realidade", "O material e os recursos foram adequados", "A carga horária foi suficiente", "Me sinto preparado para aplicar o que aprendi"]
    if d.get("pratica"):
        itens.insert(4, "A parte prática foi bem conduzida")
    table(doc, ["Item", "1", "2", "3", "4", "5"], [[i, "", "", "", "", ""] for i in itens], widths=[10.5, 1.3, 1.3, 1.3, 1.3, 1.3], zebra=False)
    doc.add_paragraph("O que mais ajudou neste treinamento?")
    doc.add_paragraph("_" * 95)
    doc.add_paragraph("O que pode melhorar?")
    doc.add_paragraph("_" * 95)
    doc.save(os.path.join(out, "07-Documentos.docx"))


def material_apoio(d, out):
    doc = new_doc(d, "Material de Apoio")
    c = d["caso"]
    doc.add_heading(f"Estudo de caso: {c['titulo']}", 1)
    label(doc, "Tempo sugerido:", "25 minutos, em grupos de 3 a 5 pessoas.")
    doc.add_paragraph("Caso didático elaborado a partir de situações recorrentes em investigações de acidentes. Nomes e empresas não são reais.").runs[0].italic = True
    doc.add_heading("Relato", 2)
    doc.add_paragraph(c["relato"])
    doc.add_heading("Perguntas para os grupos", 2)
    bullets(doc, c["perguntas"], "List Number")
    doc.add_heading("Análise para o instrutor", 2)
    doc.add_paragraph(c["analise"])
    dn = d["dinamica"]
    doc.add_heading(f"Dinâmica: {dn['titulo']}", 1)
    label(doc, "Objetivo:", dn["objetivo"])
    label(doc, "Tempo:", f"{dn['tempo']} minutos.")
    doc.add_heading("Passo a passo", 2)
    bullets(doc, dn["passos"], "List Number")
    ds = d["dds"]
    doc.add_heading(f"DDS: {ds['titulo']}", 1)
    label(doc, "Duração:", "5 minutos.")
    doc.add_paragraph(ds["texto"])
    doc.save(os.path.join(out, "08-Material-de-Apoio.docx"))


if __name__ == "__main__":
    d = json.load(open(sys.argv[1], encoding="utf-8"))
    out = sys.argv[2]
    os.makedirs(out, exist_ok=True)
    for f in (plano_de_aula, roteiro_instrutor, roteiro_gravacao, avaliacao, gabarito, documentos, material_apoio):
        f(d, out)
    print("DOCX gerados em", out)
