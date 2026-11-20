// Gera a apresentação editável (PPTX) de um kit de NR a partir de conteudo/nrXX.json
// Uso: node build_pptx.js ../conteudo/nr35.json saida.pptx
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const { applyTheme } = require("./apply_theme.js");
const fa6 = require("react-icons/fa6");
const fa = require("react-icons/fa");

const THEME = {
  name: "Prevenção Ativa",
  headFontFace: "Arial",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "1B2430", lt1: "FFFFFF", dk2: "13233A", lt2: "EEF1F4",
    accent1: "F2B705", accent2: "D9452B", accent3: "2E8B57", accent4: "5B6B7F",
    accent5: "FFF3C4", accent6: "0B1626", hlink: "1F6FB2", folHlink: "6B4FA0",
  },
};
const HEX = THEME.colors;

async function icon(name, color, px = 512) {
  const Comp = fa6[name] || fa[name];
  if (!Comp) throw new Error("Ícone não encontrado: " + name);
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp, { color: "#" + color, size: px }));
  const buf = await sharp(Buffer.from(svg)).resize(px, px).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

// Define o idioma do texto como português do Brasil (revisão ortográfica no PowerPoint)
async function setLang(file, lang) {
  const JSZip = require(require.resolve("jszip", { paths: [require.resolve("pptxgenjs")] }));
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  for (const name of Object.keys(zip.files)) {
    if (!/^ppt\/(slides|slideLayouts|slideMasters|notesSlides)\/[^/]+\.xml$/.test(name)) continue;
    const xml = await zip.file(name).async("string");
    zip.file(name, xml.replace(/lang="en-US"/g, `lang="${lang}"`));
  }
  fs.writeFileSync(file, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
}

async function build(jsonPath, outPath) {
  const d = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE"; // 13,33 x 7,5 pol
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  pres.author = "Prevenção Ativa";
  pres.company = "Prevenção Ativa";
  pres.title = `NR-${d.nr} ${d.titulo}`;
  const C = pres.SchemeColor;

  const ICO = {
    nrY: await icon(d.icone, HEX.accent1),
    nrN: await icon(d.icone, HEX.dk2),
    logoY: await icon("FaHelmetSafety", HEX.accent1, 256),
    logoN: await icon("FaHelmetSafety", HEX.dk2, 256),
    warn: await icon("FaTriangleExclamation", HEX.dk2),
    check: await icon("FaCircleCheck", HEX.accent3, 256),
    target: await icon("FaBullseye", HEX.dk2, 256),
    clock: await icon("FaClock", HEX.accent1, 256),
    pen: await icon("FaPenToSquare", HEX.accent1),
    hands: await icon("FaHandsHolding", HEX.accent1),
  };
  const rodape = `PREVENÇÃO ATIVA  ·  NR-${d.nr} ${d.titulo}`;

  // ---------- Layouts ----------
  pres.defineSlideMaster({
    title: "PA Capa",
    background: { color: C.text2 },
    objects: [
      { image: { data: ICO.logoY, x: 0.7, y: 0.6, w: 0.45, h: 0.45 } },
      { text: { text: "PREVENÇÃO ATIVA", options: { x: 1.25, y: 0.6, w: 4, h: 0.45, fontSize: 14, bold: true, color: C.background1, charSpacing: 3, margin: 0, valign: "middle", isTextBox: true } } },
      { placeholder: { options: { name: "title", type: "title", x: 0.7, y: 1.35, w: 8.4, h: 2.95, fontSize: 54, bold: true, color: C.background1, fontFace: THEME.headFontFace, align: "left", valign: "bottom", margin: 0 }, text: "" } },
      { placeholder: { options: { name: "sub", type: "body", x: 0.7, y: 4.5, w: 8.2, h: 1.2, fontSize: 22, color: C.accent1, align: "left", valign: "top", margin: 0 }, text: "" } },
    ],
  });
  pres.defineSlideMaster({
    title: "PA Divisor",
    background: { color: C.text2 },
    objects: [
      { placeholder: { options: { name: "num", type: "body", x: 0.7, y: 2.0, w: 7, h: 0.8, fontSize: 24, bold: true, color: C.accent1, margin: 0, valign: "bottom" }, text: "" } },
      { placeholder: { options: { name: "title", type: "title", x: 0.7, y: 2.9, w: 8.4, h: 2.0, fontSize: 44, bold: true, color: C.background1, fontFace: THEME.headFontFace, align: "left", valign: "top", margin: 0 }, text: "" } },
      { text: { text: rodape, options: { x: 0.7, y: 6.85, w: 9, h: 0.35, fontSize: 11, color: C.background2, margin: 0, isTextBox: true } } },
    ],
  });
  pres.defineSlideMaster({
    title: "PA Conteudo",
    background: { color: C.background1 },
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.35, w: 12.1, h: 0.95, fontSize: 34, bold: true, color: C.text2, fontFace: THEME.headFontFace, align: "left", valign: "middle", margin: 0 }, text: "" } },
      { image: { data: ICO.logoN, x: 0.6, y: 6.93, w: 0.26, h: 0.26 } },
      { text: { text: rodape, options: { x: 0.95, y: 6.9, w: 9, h: 0.32, fontSize: 11, color: C.accent4, margin: 0, valign: "middle", isTextBox: true } } },
    ],
    slideNumber: { x: 12.2, y: 6.9, w: 0.5, h: 0.32, fontSize: 11, color: HEX.accent4, align: "right" },
  });

  const notas = (s) => {
    let t = s.fala || "";
    if (s.pergunta) t += `\n\nPergunta para a turma: ${s.pergunta}`;
    if (s.dica) t += `\n\nDica ao instrutor: ${s.dica}`;
    return t;
  };
  const numCircle = (slide, n, x, y, size, fill, txt) => {
    slide.addShape(pres.shapes.OVAL, { x, y, w: size, h: size, fill: { color: fill }, line: { color: fill }, objectName: `Número ${n}` });
    slide.addText(String(n), { x, y, w: size, h: size, align: "center", valign: "middle", fontSize: Math.round(size * 34), bold: true, color: txt, fontFace: THEME.headFontFace, margin: 0, isTextBox: true });
  };
  const card = (slide, x, y, w, h, fill, name) =>
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.08, fill: { color: fill }, line: { color: fill }, objectName: name });

  // ---------- Renderizadores de conteúdo ----------
  const R = {
    lista(slide, s) {
      const n = s.itens.length;
      const top = 1.6, avail = 5.1, rowH = Math.min(1.0, avail / n);
      s.itens.forEach((it, i) => {
        const y = top + i * rowH;
        numCircle(slide, i + 1, 0.6, y + (rowH - 0.5) / 2, 0.5, C.accent1, C.text2);
        slide.addText(it, { x: 1.3, y, w: 6.5, h: rowH, fontSize: 19, color: C.text1, valign: "middle", margin: 0, isTextBox: true });
      });
      card(slide, 8.4, 1.55, 4.3, 5.1, C.text2, "Painel de destaque");
      slide.addImage({ data: ICO.nrY, x: 9.85, y: 1.95, w: 1.4, h: 1.4, altText: "Ícone do tema" });
      slide.addText(s.destaque || d.chamada, { x: 8.75, y: 3.6, w: 3.6, h: 2.8, fontSize: 19, bold: true, color: C.background1, valign: "top", align: "left", margin: 0, isTextBox: true });
    },
    cards(slide, s) {
      const n = s.cards.length;
      const cols = n === 4 ? 2 : n;
      const rows = Math.ceil(n / cols);
      const gap = 0.35, x0 = 0.6, y0 = 1.6, W = 12.1, H = 5.0;
      const w = (W - gap * (cols - 1)) / cols, h = (H - gap * (rows - 1)) / rows;
      s.cards.forEach((c, i) => {
        const x = x0 + (i % cols) * (w + gap), y = y0 + Math.floor(i / cols) * (h + gap);
        card(slide, x, y, w, h, C.background2, `Cartão ${i + 1}`);
        numCircle(slide, i + 1, x + 0.3, y + 0.3, 0.55, C.accent1, C.text2);
        slide.addText(c.t, { x: x + 1.05, y: y + 0.3, w: w - 1.3, h: 0.55, fontSize: 21, bold: true, color: C.text2, valign: "middle", margin: 0, isTextBox: true });
        slide.addText(c.d, { x: x + 0.3, y: y + 1.0, w: w - 0.6, h: h - 1.2, fontSize: 18, color: C.text1, valign: "top", margin: 0, isTextBox: true });
      });
    },
    passos(slide, s) {
      const n = s.passos.length;
      const x0 = 0.6, W = 12.1, gap = 0.3;
      const w = (W - gap * (n - 1)) / n;
      const cy = 1.85, size = 0.8;
      slide.addShape(pres.shapes.LINE, { x: x0 + w / 2, y: cy + size / 2, w: W - w, h: 0, line: { color: C.accent1, width: 3 }, objectName: "Linha do fluxo" });
      s.passos.forEach((p, i) => {
        const x = x0 + i * (w + gap);
        numCircle(slide, i + 1, x + (w - size) / 2, cy, size, C.text2, C.accent1);
        card(slide, x, cy + 1.1, w, 3.0, C.background2, `Etapa ${i + 1}`);
        slide.addText(p.t, { x: x + 0.12, y: cy + 1.3, w: w - 0.24, h: 0.85, fontSize: n > 5 ? 16 : n > 4 ? 17 : 21, bold: true, color: C.text2, align: "center", valign: "middle", margin: 0, isTextBox: true });
        slide.addText(p.d, { x: x + 0.12, y: cy + 2.2, w: w - 0.24, h: 1.85, fontSize: n > 5 ? 14 : n > 4 ? 15 : 18, color: C.text1, align: "center", valign: "top", margin: 0, isTextBox: true });
      });
    },
    numero(slide, s) {
      card(slide, 0.6, 1.6, 5.4, 5.0, C.accent1, "Painel do número");
      slide.addText(s.valor, { x: 0.9, y: 2.1, w: 4.8, h: 1.9, fontSize: s.valor.length > 5 ? 60 : 88, bold: true, color: C.text2, fontFace: THEME.headFontFace, valign: "middle", margin: 0, isTextBox: true, fit: "shrink" });
      slide.addText(s.legenda, { x: 0.9, y: 4.1, w: 4.8, h: 2.1, fontSize: 21, color: C.text2, valign: "top", margin: 0, isTextBox: true });
      const rowH = 5.0 / s.itens.length;
      s.itens.forEach((it, i) => {
        const y = 1.6 + i * rowH;
        slide.addImage({ data: ICO.check, x: 6.5, y: y + (rowH - 0.42) / 2, w: 0.42, h: 0.42, altText: "Marcador" });
        slide.addText(it, { x: 7.15, y, w: 5.55, h: rowH, fontSize: 19, color: C.text1, valign: "middle", margin: 0, isTextBox: true });
      });
    },
    tabela(slide, s) {
      const head = s.cabecalho.map((h) => ({ text: h, options: { bold: true, color: C.background1, fill: { color: C.text2 }, fontSize: 18 } }));
      const rowH = Math.min(0.95, 4.9 / (s.linhas.length + 1));
      const rows = s.linhas.map((r, i) => r.map((c, j) => ({ text: c, options: { fontSize: 17, bold: j === 0, color: j === 0 ? C.text2 : C.text1, fill: { color: i % 2 ? C.background1 : C.background2 } } })));
      slide.addTable([head, ...rows], { x: 0.6, y: 1.6, w: 12.1, colW: [3.3, 8.8], rowH, border: { type: "solid", pt: 0.75, color: "D5DAE0" }, margin: [0.1, 0.15, 0.1, 0.15], valign: "middle", objectName: "Tabela" });
    },
    comparar(slide, s) {
      [[s.esquerda, 0.6, C.text2, C.background1], [s.direita, 6.85, C.accent1, C.text2]].forEach(([col, x, fill, txt], k) => {
        card(slide, x, 1.6, 5.85, 0.9, fill, `Cabeçalho coluna ${k + 1}`);
        slide.addText(col.t, { x: x + 0.3, y: 1.6, w: 5.25, h: 0.9, fontSize: 23, bold: true, color: txt, valign: "middle", margin: 0, isTextBox: true });
        card(slide, x, 2.6, 5.85, 4.0, C.background2, `Coluna ${k + 1}`);
        const rowH = 3.6 / col.itens.length;
        col.itens.forEach((it, i) => {
          const y = 2.8 + i * rowH;
          slide.addImage({ data: ICO.check, x: x + 0.3, y: y + (rowH - 0.4) / 2, w: 0.4, h: 0.4, altText: "Marcador" });
          slide.addText(it, { x: x + 0.9, y, w: 4.7, h: rowH, fontSize: 19, color: C.text1, valign: "middle", margin: 0, isTextBox: true });
        });
      });
    },
    alerta(slide, s) {
      card(slide, 0.6, 1.6, 5.0, 5.0, C.accent1, "Painel de alerta");
      slide.addImage({ data: ICO.warn, x: 0.95, y: 1.95, w: 1.1, h: 1.1, altText: "Atenção" });
      slide.addText(s.texto, { x: 0.95, y: 3.3, w: 4.3, h: 3.1, fontSize: 23, bold: true, color: C.text2, valign: "top", margin: 0, isTextBox: true });
      const rowH = Math.min(1.0, 5.0 / s.itens.length);
      s.itens.forEach((it, i) => {
        const y = 1.6 + i * rowH;
        slide.addShape(pres.shapes.OVAL, { x: 6.1, y: y + (rowH - 0.22) / 2, w: 0.22, h: 0.22, fill: { color: C.accent2 }, line: { color: C.accent2 }, objectName: `Marcador ${i + 1}` });
        slide.addText(it, { x: 6.55, y, w: 6.15, h: rowH, fontSize: 19, color: C.text1, valign: "middle", margin: 0, isTextBox: true });
      });
    },
  };

  // ---------- Abertura ----------
  pres.addSection({ title: "Abertura" });
  let s = pres.addSlide({ masterName: "PA Capa", sectionTitle: "Abertura" });
  const tl = d.titulo.length;
  s.addText(`NR-${d.nr}`, { x: 0.7, y: 1.45, w: 8.4, h: 0.7, fontSize: 30, bold: true, color: C.accent1, fontFace: THEME.headFontFace, margin: 0, valign: "bottom", isTextBox: true, objectName: "Norma" });
  s.addText(d.titulo, { x: 0.7, y: 2.2, w: 8.4, h: 2.15, fontSize: tl > 45 ? 32 : tl > 25 ? 38 : 50, bold: true, color: C.background1, fontFace: THEME.headFontFace, margin: 0, valign: "top", isTextBox: true, objectName: "Título" });
  s.addText(d.chamada, { placeholder: "sub" });
  s.addImage({ data: ICO.nrY, x: 9.6, y: 2.0, w: 3.0, h: 3.0, altText: "Ícone do tema" });
  s.addText(`Carga horária: ${d.carga}`, { x: 0.7, y: 6.55, w: 9, h: 0.4, fontSize: 14, color: C.background2, margin: 0, isTextBox: true });
  s.addNotes(`Abertura. Apresente-se, confirme a lista de presença e explique a carga horária: ${d.carga}. Combine horários de intervalo, uso de celular e as regras de segurança da sala.`);

  s = pres.addSlide({ masterName: "PA Conteudo", sectionTitle: "Abertura" });
  s.addText("Objetivos do treinamento", { placeholder: "title" });
  {
    const rowH = Math.min(0.95, 5.0 / d.objetivos.length);
    d.objetivos.forEach((o, i) => {
      const y = 1.6 + i * rowH;
      s.addImage({ data: ICO.target, x: 0.6, y: y + (rowH - 0.45) / 2, w: 0.45, h: 0.45, altText: "Objetivo" });
      s.addText(o, { x: 1.3, y, w: 11.4, h: rowH, fontSize: 20, color: C.text1, valign: "middle", margin: 0, isTextBox: true });
    });
  }
  s.addNotes("Leia os objetivos com a turma e pergunte o que cada participante espera do treinamento. Anote as expectativas no quadro e retome-as no encerramento.");

  s = pres.addSlide({ masterName: "PA Conteudo", sectionTitle: "Abertura" });
  s.addText("Programação", { placeholder: "title" });
  {
    const etapas = d.modulos.map((m, i) => [`Módulo ${i + 1}`, m.titulo, `${m.duracao} min`]);
    if (d.pratica) etapas.push(["Prática", d.pratica.titulo, `${d.pratica.duracao} min`]);
    etapas.push(["Avaliação", "Prova teórica e encerramento", "30 min"]);
    const rowH = Math.min(0.62, 5.1 / etapas.length);
    etapas.forEach((e, i) => {
      const y = 1.55 + i * rowH;
      if (i % 2 === 0) s.addShape(pres.shapes.RECTANGLE, { x: 0.6, y, w: 12.1, h: rowH, fill: { color: C.background2 }, line: { color: C.background2 }, objectName: `Faixa ${i + 1}` });
      s.addText(e[0], { x: 0.8, y, w: 1.8, h: rowH, fontSize: 16, bold: true, color: C.text2, valign: "middle", margin: 0, isTextBox: true });
      s.addText(e[1], { x: 2.7, y, w: 8.2, h: rowH, fontSize: 17, color: C.text1, valign: "middle", margin: 0, isTextBox: true });
      s.addText(e[2], { x: 11.0, y, w: 1.5, h: rowH, fontSize: 16, color: C.text2, align: "right", valign: "middle", margin: 0, isTextBox: true });
    });
  }
  s.addNotes("Apresente a programação e os horários. Reforce que a aprovação depende da avaliação" + (d.pratica ? " teórica e da prática." : " teórica."));

  // ---------- Módulos ----------
  d.modulos.forEach((m, mi) => {
    const sec = `Módulo ${mi + 1}`;
    pres.addSection({ title: `${sec}: ${m.titulo}` });
    let dv = pres.addSlide({ masterName: "PA Divisor", sectionTitle: `${sec}: ${m.titulo}` });
    dv.addText(`MÓDULO ${mi + 1}  ·  ${m.duracao} MIN`, { placeholder: "num" });
    dv.addText(m.titulo, { placeholder: "title" });
    dv.addImage({ data: ICO.nrY, x: 10.0, y: 2.4, w: 2.4, h: 2.4, altText: "Ícone do tema" });
    dv.addNotes(m.gancho || "");
    m.slides.forEach((sl) => {
      const slide = pres.addSlide({ masterName: "PA Conteudo", sectionTitle: `${sec}: ${m.titulo}` });
      slide.addText(sl.titulo, { placeholder: "title" });
      if (!R[sl.tipo]) throw new Error("Tipo de slide desconhecido: " + sl.tipo);
      R[sl.tipo](slide, sl);
      slide.addNotes(notas(sl));
    });
  });

  // ---------- Encerramento ----------
  pres.addSection({ title: "Encerramento" });
  if (d.pratica) {
    s = pres.addSlide({ masterName: "PA Conteudo", sectionTitle: "Encerramento" });
    s.addText(d.pratica.titulo, { placeholder: "title" });
    const it = d.pratica.itens;
    const rowH = Math.min(0.72, 5.1 / it.length);
    it.forEach((t, i) => {
      const y = 1.55 + i * rowH;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: y + (rowH - 0.38) / 2, w: 0.38, h: 0.38, rectRadius: 0.05, fill: { color: C.background1 }, line: { color: C.text2, width: 1.5 }, objectName: `Caixa ${i + 1}` });
      s.addText(t, { x: 1.2, y, w: 7.3, h: rowH, fontSize: 16, color: C.text1, valign: "middle", margin: 0, isTextBox: true });
    });
    card(s, 8.9, 1.55, 3.8, 5.1, C.text2, "Painel da prática");
    s.addImage({ data: ICO.hands, x: 10.2, y: 1.95, w: 1.2, h: 1.2, altText: "Prática" });
    s.addText(`${d.pratica.duracao} minutos de prática supervisionada. Cada participante executa todos os itens.`, { x: 9.2, y: 3.4, w: 3.2, h: 3.0, fontSize: 18, bold: true, color: C.background1, valign: "top", margin: 0, isTextBox: true });
    s.addNotes(d.pratica.descricao + " Registre o resultado de cada participante no checklist de avaliação prática.");
  }
  s = pres.addSlide({ masterName: "PA Divisor", sectionTitle: "Encerramento" });
  s.addText("AVALIAÇÃO", { placeholder: "num" });
  s.addText("Hora de mostrar o que você aprendeu", { placeholder: "title" });
  s.addImage({ data: ICO.pen, x: 10.0, y: 2.4, w: 2.4, h: 2.4, altText: "Avaliação" });
  s.addNotes(`Distribua a prova. Tempo sugerido: 20 minutos. Critério de aprovação: ${d.aprovacao}`);

  s = pres.addSlide({ masterName: "PA Capa", sectionTitle: "Encerramento" });
  s.addText("Obrigado", { placeholder: "title" });
  s.addText("Segurança é uma decisão que se toma antes de começar o trabalho.", { placeholder: "sub" });
  s.addText("Instrutor: ______________________     Contato: ______________________", { x: 0.7, y: 6.4, w: 11, h: 0.45, fontSize: 16, color: C.background2, margin: 0, isTextBox: true });
  s.addImage({ data: ICO.nrY, x: 9.6, y: 2.0, w: 3.0, h: 3.0, altText: "Ícone do tema" });
  s.addNotes("Retome as expectativas anotadas na abertura, esclareça dúvidas finais e aplique a avaliação de reação.");

  await pres.writeFile({ fileName: outPath });
  await applyTheme(outPath, THEME);
  await setLang(outPath, "pt-BR");
}

build(process.argv[2], process.argv[3]).then(() => console.log("PPTX gerado:", process.argv[3])).catch((e) => { console.error(e); process.exit(1); });
