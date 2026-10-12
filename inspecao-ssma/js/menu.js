/* Menu agrupado: em vez de 16 abas numa faixa só, cinco grupos fixos
 * (Inspeções, Permissões, Gestão, Pessoas e PGR). Ao tocar num grupo, abre o
 * primeiro módulo dele; a faixa de baixo mostra apenas os módulos do grupo
 * ativo. Os botões de módulo continuam os mesmos (tab-*), então o restante
 * do app não muda. */

const GRUPOS_MENU = [
  { id: 'inspecoes', rotulo: 'Inspeções', abas: ['inspecoes', 'diagnostico', 'veiculo'] },
  { id: 'permissoes', rotulo: 'Permissões', abas: ['ptapr', 'pet'] },
  { id: 'gestao', rotulo: 'Gestão', abas: ['painel', 'inteligencia', 'acoes', 'relatos', 'observacoes', 'investigacao'] },
  { id: 'pessoas', rotulo: 'Pessoas', abas: ['dds', 'cipa', 'certificados', 'epi'] },
  { id: 'pgr', rotulo: 'PGR', abas: ['pgr'] }
];

function grupoDaAba(aba) {
  return GRUPOS_MENU.find((g) => g.abas.includes(aba)) || GRUPOS_MENU[0];
}

function montarMenuGrupos() {
  const el = document.getElementById('grupos-nav');
  if (!el) return;
  el.innerHTML = GRUPOS_MENU.map((g) => `<button type="button" class="grupo-btn" role="tab" data-grupo="${g.id}">${g.rotulo}</button>`).join('');
  el.querySelectorAll('.grupo-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const g = GRUPOS_MENU.find((x) => x.id === btn.dataset.grupo);
      const primeira = document.getElementById(`tab-${g.abas[0]}`);
      if (primeira) primeira.click();
    });
  });
  atualizarMenuGrupos('inspecoes');
}

/** Chamado a cada troca de aba: destaca o grupo e mostra só os módulos dele. */
function atualizarMenuGrupos(aba) {
  const g = grupoDaAba(aba);
  document.querySelectorAll('.grupo-btn').forEach((b) => {
    const ativo = b.dataset.grupo === g.id;
    b.classList.toggle('active', ativo);
    b.setAttribute('aria-selected', ativo ? 'true' : 'false');
  });
  document.querySelectorAll('#subnav .tab-btn').forEach((b) => {
    b.hidden = !g.abas.includes(b.dataset.tab);
  });
  const sub = document.getElementById('subnav');
  if (sub) sub.hidden = g.abas.length < 2;
}

montarMenuGrupos();
