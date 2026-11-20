#!/usr/bin/env bash
# Gera o kit completo de uma ou mais NRs: PPTX, DOCX e cópias em PDF.
# Uso: ./build_kit.sh ../conteudo/nr35.json [../conteudo/nr06.json ...]
# Variável opcional SOFFICE: comando do LibreOffice para conversão em PDF (padrão: soffice)
set -euo pipefail
cd "$(dirname "$0")"
SOFFICE=${SOFFICE:-soffice}
for json in "$@"; do
  nome=$(python3 -c "import json,sys;d=json.load(open(sys.argv[1]));print(f\"NR-{d['nr']} - {d['titulo']}\")" "$json")
  out="../kits/$nome"
  mkdir -p "$out/PDF"
  node build_pptx.js "$json" "$out/01-Apresentacao.pptx"
  python3 build_docx.py "$json" "$out"
  $SOFFICE --headless --convert-to pdf --outdir "$out/PDF" "$out"/*.pptx "$out"/*.docx >/dev/null 2>&1
  echo "Kit pronto: $out"
done
