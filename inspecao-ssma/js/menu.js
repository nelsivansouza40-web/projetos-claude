/* Menu agrupado: em vez de 16 abas numa faixa só, cinco grupos fixos
 * (Inspeções, Permissões, Gestão, Pessoas e PGR). Ao tocar num grupo, abre o
 * primeiro módulo dele; a faixa de baixo mostra apenas os módulos do grupo
 * ativo. Os botões de módulo continuam os mesmos (tab-*), então o restante
 * do app não muda. */

/* Perfis de uso: cada aparelho vê só os módulos do seu perfil. Com login
 * ativo na planilha, o perfil vem do cadastro do usuário; sem login, é
 * escolhido em Configurações. O padrão (Gestor) mostra tudo, como antes. */
const PERFIS_USO = {
  'Gestor': null,
  'Inspetor': ['inspecoes', 'diagnostico', 'veiculo', 'ptapr', 'pet', 'acoes', 'relatos', 'observacoes'],
  'Responsável': ['acoes']
};
let PERFIL_ATUAL = 'Gestor';

/* Módulos retirados do menu para todos os perfis, por decisão da equipe.
 * O código e os registros já feitos continuam no aparelho: os pendentes ainda
 * sincronizam e os antigos aparecem na busca. Para trazer um módulo de volta,
 * basta tirá-lo desta lista. */
const MODULOS_RETIRADOS = ['certificados'];

function abaPermitida(aba) {
  if (MODULOS_RETIRADOS.includes(aba)) return false;
  const lista = PERFIS_USO[PERFIL_ATUAL];
  return !lista || lista.includes(aba);
}

async function carregarPerfilUso() {
  const p = await DB.getSetting('perfilUso');
  PERFIL_ATUAL = PERFIS_USO.hasOwnProperty(p) ? p : 'Gestor';
  montarMenuGrupos();
}

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
  const grupos = GRUPOS_MENU.filter((g) => g.abas.some(abaPermitida));
  el.innerHTML = grupos.map((g) => `<button type="button" class="grupo-btn" role="tab" data-grupo="${g.id}">${g.rotulo}</button>`).join('');
  el.hidden = grupos.length < 2;
  el.querySelectorAll('.grupo-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const g = GRUPOS_MENU.find((x) => x.id === btn.dataset.grupo);
      const primeira = document.getElementById(`tab-${g.abas.find(abaPermitida)}`);
      if (primeira) primeira.click();
    });
  });
  atualizarMenuGrupos(abaPermitida('inspecoes') ? 'inspecoes' : (grupos[0] ? grupos[0].abas.find(abaPermitida) : 'inspecoes'));
}

/** Chamado a cada troca de aba: destaca o grupo e mostra só os módulos dele. */
function atualizarMenuGrupos(aba) {
  const g = grupoDaAba(aba);
  document.querySelectorAll('.grupo-btn').forEach((b) => {
    const ativo = b.dataset.grupo === g.id;
    b.classList.toggle('active', ativo);
    b.setAttribute('aria-selected', ativo ? 'true' : 'false');
  });
  const visiveis = g.abas.filter(abaPermitida);
  document.querySelectorAll('#subnav .tab-btn').forEach((b) => {
    b.hidden = !visiveis.includes(b.dataset.tab);
  });
  const sub = document.getElementById('subnav');
  if (sub) sub.hidden = visiveis.length < 2;
}

montarMenuGrupos();
