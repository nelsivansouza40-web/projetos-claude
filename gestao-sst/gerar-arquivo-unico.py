"""
Gera "Gestao-SST.html": o sistema inteiro em um único arquivo (CSS, scripts e
ícone embutidos). Basta copiar o arquivo para o computador e abrir no navegador.

Uso: python3 gerar-arquivo-unico.py [pasta_de_saida]
"""
import base64
import pathlib
import re
import sys

raiz = pathlib.Path(__file__).resolve().parent
saida = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else raiz / 'dist'
saida.mkdir(parents=True, exist_ok=True)

html = (raiz / 'index.html').read_text(encoding='utf-8')
css = (raiz / 'css' / 'app.css').read_text(encoding='utf-8')
icone = 'data:image/png;base64,' + base64.b64encode((raiz / 'icons' / 'icon-192.png').read_bytes()).decode()

html = html.replace('<link rel="manifest" href="manifest.webmanifest">\n', '')
html = html.replace('href="icons/icon-192.png"', 'href="' + icone + '"')
html = html.replace('<link rel="stylesheet" href="css/app.css">', '<style>\n' + css + '\n</style>')


def embutir(m):
    js = (raiz / m.group(1)).read_text(encoding='utf-8').replace('</script', '<\\/script')
    return '<script>\n' + js + '\n</script>'


html = re.sub(r'<script src="([^"]+)"></script>', embutir, html)
destino = saida / 'Gestao-SST.html'
destino.write_text(html, encoding='utf-8')
print(destino, round(destino.stat().st_size / 1024), 'KB')
