/* Testes da geometria e da paginação. Rodar com: node gerador-moldes/testes/testes.js */
'use strict';
const assert = require('assert');
const G = require('../js/geometria.js');
const P = require('../js/paginacao.js');

let ok = 0;
function teste(nome, fn) {
  try { fn(); ok++; } catch (e) { console.error('FALHOU:', nome, '\n ', e.message); process.exitCode = 1; }
}
const perto = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} ≠ ${b}`);

// 1. Todos os modelos com valores padrão, em todos os materiais
for (const [id, m] of Object.entries(G.MODELOS)) {
  for (const mat of G.MATERIAIS.filter((x) => x.t != null)) {
    teste(`${id} em ${mat.nome}`, () => {
      const v = {};
      for (const c of m.campos) v[c.id] = c.padrao;
      const r = G.gerar(id, v, mat.t);
      assert.ok(r.pecas.length > 0, 'sem peças');
      for (const p of r.pecas) {
        assert.ok(p.simples, `peça ${p.codigo} com contorno cruzado`);
        for (const c of p.contornos) for (const q of c) assert.ok(isFinite(q[0]) && isFinite(q[1]), 'ponto inválido');
      }
      for (const vf of r.verificacoes) assert.ok(vf.ok, vf.texto);
    });
  }
}

// 2. Variação aleatória de medidas (contornos nunca se cruzam)
function aleatorio(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
const rnd = aleatorio(42);
const faixa = (a, b) => a + (b - a) * rnd();
const casos = {
  caixa: () => ({ comp: faixa(2, 40), larg: faixa(2, 40), alt: faixa(2, 40), tampa: rnd() < 0.5 ? 'sim' : 'nao' }),
  cilindro: () => ({ diam: faixa(2, 30), alt: faixa(1, 40), tampas: ['uma', 'ambas', 'nenhuma'][Math.floor(rnd() * 3)] }),
  cone: () => { const d = faixa(2, 30); return { diam: d, alt: faixa(d * 0.4, 40), base: 'sim' }; },
  troncoCone: () => { const d1 = faixa(3, 30); return { d1, d2: faixa(0.3, d1 * 0.9), alt: faixa(2, 40), tampas: 'maior' }; },
  prisma: () => ({ lados: 3 + Math.floor(rnd() * 10), lado: faixa(1.5, 12), alt: faixa(2, 30), tampas: ['ambas', 'uma', 'nenhuma', 'abas'][Math.floor(rnd() * 4)] }),
  piramide: () => ({ lados: 3 + Math.floor(rnd() * 10), lado: faixa(2, 15), alt: faixa(1, 30), base: 'sim' }),
  troncoPiramide: () => { const A = faixa(3, 20), B = faixa(3, 20); return { compMaior: A, largMaior: B, compMenor: faixa(1, A), largMenor: faixa(1, B), alt: faixa(2, 25), fechar: 'sim' }; },
  tatu: () => ({ comp: faixa(20, 120), faixas: 4 + Math.floor(rnd() * 10) }),
};
for (const [id, gerarV] of Object.entries(casos)) {
  teste(`variação aleatória: ${id}`, () => {
    for (let k = 0; k < 60; k++) {
      const v = gerarV();
      const t = [0.1, 0.35, 2, 3][k % 4];
      let r;
      try { r = G.gerar(id, v, t); } catch (e) { continue; } // medidas recusadas com mensagem
      for (const p of r.pecas) assert.ok(p.simples, `${id} peça ${p.codigo} cruzada com ${JSON.stringify(v)} t=${t}`);
    }
  });
}

// 3. Conferências geométricas
teste('cilindro: comprimento = π(D − t)', () => {
  const r = G.gerar('cilindro', { diam: 7, alt: 10, tampas: 'nenhuma' }, 3);
  const bb = G.caixaLimite(r.pecas[0].contornos);
  perto(bb.w - G.abaPadrao(3), Math.PI * (70 - 3), 0.01, 'comprimento');
});

teste('cone: arco do setor = circunferência', () => {
  const ctx = { t: 0, aba: 8 };
  const R = 40, H = 120, s = Math.hypot(R, H), th = 2 * Math.PI * R / s;
  perto(s * th, 2 * Math.PI * R, 1e-9, 'arco');
});

teste('tronco de cone: arcos batem com as duas bocas', () => {
  const r = G.moldeTroncoCone(80, 50, 90, { t: 0, aba: 8 }, {});
  perto(r.s1 * r.th, Math.PI * 80, 1e-6, 'arco maior');
  perto(r.s2 * r.th, Math.PI * 50, 1e-6, 'arco menor');
  perto(r.s1 - r.s2, Math.hypot(15, 90), 1e-6, 'geratriz');
});

teste('tronco de pirâmide: arestas vizinhas iguais', () => {
  const r = G.moldeTroncoPiramide(60, 50, 15, 15, 80, { t: 0, aba: 8 }, true);
  const ladoN = Math.hypot(r.hN, (r.A - r.a) / 2);
  const ladoE = Math.hypot(r.hE, (r.B - r.b) / 2);
  perto(ladoN, ladoE, 1e-9, 'arestas');
});

teste('tatu: faixa = meia volta da costela + espessura', () => {
  const t = 3;
  const r = G.gerar('tatu', { comp: 40, faixas: 7 }, t);
  const costelas = r.pecas.filter((p) => /^B\d/.test(p.codigo));
  const faixas = r.pecas.filter((p) => /^C\d/.test(p.codigo));
  assert.strictEqual(costelas.length, 7);
  assert.strictEqual(faixas.length, 7);
  const W = 0.225 * 400, aR = W / 2 - t;
  costelas.forEach((c, i) => {
    const bb = G.caixaLimite(c.contornos);
    const b = bb.h; // sem abas (material grosso)
    const fx = G.caixaLimite(faixas[i].contornos);
    const esperado = G.meioPerimetroElipse(aR + t / 2, b + t / 2) + 2 * t;
    perto(fx.w - 2 * Math.min(G.abaPadrao(t), 12), esperado, 0.05, `faixa ${i + 1}`);
    // aproximação de Ramanujan como conferência independente
    const a2 = aR + t / 2, b2 = b + t / 2;
    const ram = Math.PI * (3 * (a2 + b2) - Math.sqrt((3 * a2 + b2) * (a2 + 3 * b2))) / 2;
    perto(esperado - 2 * t, ram, ram * 0.002, `Ramanujan ${i + 1}`);
  });
});

teste('caixa: painéis com medida externa − t', () => {
  const r = G.gerar('caixa', { comp: 12, larg: 8, alt: 6, tampa: 'nao' }, 3);
  const dobras = r.pecas[0].dobras.map(([a, b]) => G.dist(a, b));
  assert.ok(dobras.some((d) => Math.abs(d - 117) < 1e-6), 'dobra de 117 mm');
  assert.ok(dobras.some((d) => Math.abs(d - 77) < 1e-6), 'dobra de 77 mm');
});

teste('peça que não cabe é girada até caber na folha', () => {
  const area = P.areaUtil(P.PAPEIS.A4);
  const r = G.gerar('piramide', { lados: 4, lado: 8, alt: 8, base: 'sim' }, 0.35, 0, area);
  assert.strictEqual(P.paginar(r.pecas, P.PAPEIS.A4).length, 1);
  assert.ok(r.pecas[0].simples);
});

// 4. Paginação: tudo dentro da área útil e sem sobreposição
for (const papelId of Object.keys(P.PAPEIS)) {
  teste(`paginação ${papelId}`, () => {
    const papel = P.PAPEIS[papelId];
    const area = P.areaUtil(papel);
    for (const comp of [30, 40, 80, 150]) {
      const r = G.gerar('tatu', { comp, faixas: 7 }, 0.35);
      const folhas = P.paginar(r.pecas, papel);
      const totalPecas = r.pecas.reduce((s, p) => s + p.qtd, 0);
      const pos = folhas.filter((f) => f.tipo === 'pecas').reduce((s, f) => s + f.itens.length, 0);
      const partes = new Set(folhas.filter((f) => f.tipo === 'parte').map((f) => f.peca.codigo + '#' + f.copia)).size;
      assert.strictEqual(pos + partes, totalPecas, 'quantidade de peças');
      for (const f of folhas.filter((x) => x.tipo === 'pecas')) {
        const caixas = f.itens.map((it) => {
          const T = P.transformacao(it.bb, it.rot, it.x, it.y);
          return P.caixa([].concat(...it.peca.contornos).map(T));
        });
        for (const c of caixas) {
          assert.ok(c.minx >= area.x - 0.01 && c.miny >= area.y - 0.01 && c.maxx <= area.x + area.w + 0.01 && c.maxy <= area.y + area.h + 0.01, 'peça fora da área útil');
        }
        for (let i = 0; i < caixas.length; i++) for (let j = i + 1; j < caixas.length; j++) {
          const a = caixas[i], b = caixas[j];
          const cruza = a.minx < b.maxx - 0.01 && b.minx < a.maxx - 0.01 && a.miny < b.maxy - 0.01 && b.miny < a.maxy - 0.01;
          assert.ok(!cruza, 'peças sobrepostas na folha');
        }
      }
    }
  });
}

console.log(`${ok} testes passaram${process.exitCode ? ', com falhas acima' : ''}.`);
