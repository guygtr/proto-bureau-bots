// Vue 2D de secours (SVG) quand WebGL n'est pas disponible. Mêmes données, compteurs, panneaux et simulation.
const INTERVALLE_MS = 60_000;
const COUL_ETAT = { occupe: '#8b7bff', attend: '#ff9f43', libre: '#a7b0c0' };
const NOM_ETAT = { occupe: 'Au travail', attend: 'Attend Guy', libre: 'Libre' };
const COUL_EQUIPE = ['#ffcc66', '#3ddc97', '#4cc3ff', '#ff5fa2', '#b18cff', '#ff8a5c', '#e0e86b', '#5eead4'];
const PALETTE = ['#4f7dff', '#ffd23f', '#ff7a2f', '#2ec4d6', '#34c759', '#c7ccd8', '#ff5fa2', '#9b6bff', '#00c2a8', '#ff4d4d', '#7bd389', '#f5a524', '#5ac8fa', '#c084fc', '#e2725b', '#4ade80', '#60a5fa', '#facc15', '#fb7185', '#a3e635', '#22d3ee', '#f97316'];
const TACHES = ['Recherche', 'Veille', 'Analyse', 'Rédaction', 'Mise à jour'];
const fmtHeure = new Intl.DateTimeFormat('fr-CA', { timeZone: 'America/Toronto', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const NS = 'http://www.w3.org/2000/svg';
const $ = (id) => document.getElementById(id);
const scene = $('scene'), vue = document.querySelector('.vue');
document.documentElement.dataset.mode = '2d';

// Message (pas d'erreur bloquante)
const avis = document.createElement('p'); avis.className = 'avis avis-2d';
avis.textContent = '3D (WebGL) indisponible : Chrome l’a peut-être désactivée. Redémarrez Chrome ou essayez Edge. Vue 2D en attendant.';
vue.append(avis);
document.querySelectorAll('.vues button').forEach((b) => { b.disabled = true; b.title = 'Disponible avec la 3D'; });

const svg = document.createElementNS(NS, 'svg'); svg.classList.add('plan2d'); svg.setAttribute('role', 'img');
svg.setAttribute('aria-label', 'Plan 2D de la station : modules d’équipe autour de la cupole');
scene.append(svg);

const segments = (nom) => nom.split(/\s[·–-]\s/).map((x) => x.trim()).filter(Boolean);
const nomCourt = (b, tous) => { if (b.court) return b.court; const s = segments(b.nom); return tous.filter((o) => segments(o.nom)[0] === s[0]).length > 1 && s[1] ? s[1] : s[0] || b.id; };
const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); parent && parent.append(e); return e; };

let donnees = null, sim = null, ficheId = null;
const activite = [];
const etatDe = (b) => (b.etat in COUL_ETAT ? b.etat : 'libre');

function dessiner() {
  if (!donnees) return;
  const bots = donnees.bots.filter((b) => b && b.id);
  const portrait = scene.clientWidth < scene.clientHeight;
  const W = portrait ? 400 : 800, H = portrait ? 560 : 470, cx = W / 2, cy = H / 2;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.replaceChildren();
  const equipes = [];
  for (const b of bots) { const n = b.equipe || 'Module'; let e = equipes.find((x) => x.nom === n); if (!e) { e = { nom: n, bots: [], coul: COUL_EQUIPE[equipes.length % COUL_EQUIPE.length] }; equipes.push(e); } e.bots.push(b); }
  const iDir = equipes.findIndex((e) => /^direction$/i.test(e.nom)); if (iDir > 0) equipes.unshift(...equipes.splice(iDir, 1));
  const rx = portrait ? 118 : 285, ry = portrait ? 205 : 160, RH = portrait ? 58 : 66;
  // étoiles
  for (let i = 0; i < 70; i++) el('circle', { cx: (i * 97) % W, cy: (i * 61) % H, r: i % 7 ? 0.7 : 1.2, fill: '#fff', opacity: 0.25 + (i % 4) * 0.12 }, svg);
  const tubes = el('g', {}, svg), mods = el('g', {}, svg);
  const couleurs = new Map(bots.map((b, i) => [b.id, b.couleur || PALETTE[i % PALETTE.length]]));
  equipes.forEach((e, i) => {
    const a = Math.PI / 2 + (i / equipes.length) * Math.PI * 2;
    const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
    el('line', { x1: cx, y1: cy, x2: x, y2: y, stroke: '#9aa6b8', 'stroke-width': 9, 'stroke-linecap': 'round', opacity: 0.55 }, tubes);
    const actifs = e.bots.filter((b) => etatDe(b) !== 'libre');
    const w = portrait ? 156 : 180, h = 30 + Math.max(1, actifs.length) * 17;
    const g = el('g', { transform: `translate(${x - w / 2},${y - h / 2})` }, mods);
    el('rect', { width: w, height: h, rx: 12, fill: '#141b2b', stroke: e.coul, 'stroke-width': 2 }, g);
    el('rect', { x: -10, y: h / 2 - 9, width: 10, height: 18, rx: 3, fill: '#2a3550' }, g);
    el('rect', { x: w, y: h / 2 - 9, width: 10, height: 18, rx: 3, fill: '#2a3550' }, g);
    const t = el('text', { x: 10, y: 18, fill: e.coul, 'font-size': 10.5, 'font-weight': 700, 'letter-spacing': '1.5' }, g); t.textContent = e.nom.toUpperCase();
    if (!actifs.length) { const v = el('text', { x: 10, y: 37, fill: '#8b93a7', 'font-size': 11 }, g); v.textContent = 'Module calme'; }
    actifs.forEach((b, k) => {
      const st = etatDe(b), yy = 34 + k * 17;
      const r = el('g', { class: 'bot2d', 'data-id': b.id, tabindex: 0, role: 'button' }, g);
      if (st === 'attend') el('circle', { cx: 16, cy: yy, r: 5, fill: 'none', stroke: COUL_ETAT.attend, class: 'pulse' }, r);
      el('circle', { cx: 16, cy: yy, r: 5, fill: couleurs.get(b.id), stroke: COUL_ETAT[st], 'stroke-width': 2 }, r);
      const n = el('text', { x: 27, y: yy + 4, fill: '#e6e9f0', 'font-size': 11.5 }, r); { const c = nomCourt(b, bots); n.textContent = c.length > 12 ? c.slice(0, 11) + '…' : c; }
      const tt = el('text', { x: w - 8, y: yy + 4, fill: COUL_ETAT[st], 'font-size': 10, 'text-anchor': 'end' }, r); tt.textContent = st === 'attend' ? 'attend Guy' : (b.tache || '');
    });
  });
  // cupole centrale avec les libres
  const hub = el('g', {}, svg);
  el('circle', { cx, cy, r: RH + 6, fill: 'none', stroke: '#7fe3ff', 'stroke-width': 1.5, opacity: 0.5 }, hub);
  el('circle', { cx, cy, r: RH, fill: '#0f1a2c', stroke: '#9aa6b8', 'stroke-width': 3 }, hub);
  const ht = el('text', { x: cx, y: cy - RH - 12, fill: '#7fe3ff', 'font-size': 10, 'font-weight': 700, 'text-anchor': 'middle', 'letter-spacing': '1.5' }, hub); ht.textContent = 'CUPOLE · DÉTENTE';
  const libres = bots.filter((b) => etatDe(b) === 'libre');
  libres.forEach((b, k) => {
    const anneau = k < 8 ? 0 : 1, idx = anneau ? k - 8 : k, nb = anneau ? Math.max(1, libres.length - 8) : Math.min(8, libres.length);
    const a = (idx / nb) * Math.PI * 2 + anneau * 0.4, r = anneau ? RH * 0.32 : RH * 0.7;
    const g = el('g', { class: 'bot2d', 'data-id': b.id, tabindex: 0, role: 'button' }, hub);
    el('circle', { cx: cx + Math.cos(a) * r, cy: cy + Math.sin(a) * r, r: 6.5, fill: couleurs.get(b.id), stroke: '#e6e9f0', 'stroke-width': 1.2 }, g);
    const ti = el('title', {}, g); ti.textContent = nomCourt(b, bots) + ' · libre';
  });
  const nl = el('text', { x: cx, y: cy + RH + 20, fill: '#a7b0c0', 'font-size': 10.5, 'text-anchor': 'middle' }, hub); nl.textContent = `${libres.length} en pause`;
  svg.querySelectorAll('.bot2d').forEach((g) => { const f = () => ouvrirFiche(g.dataset.id); g.addEventListener('click', f); g.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') f(); }); });
}

function majInterface() {
  const bots = donnees.bots; const c = { occupe: 0, attend: 0, libre: 0 };
  for (const b of bots) c[etatDe(b)]++;
  $('c-occupe').textContent = c.occupe; $('c-attend').textContent = c.attend; $('c-libre').textContent = c.libre;
  const eq = new Map(); for (const b of bots) { const k = b.equipe || 'Module'; eq.set(k, (eq.get(k) || 0) + (etatDe(b) !== 'libre' ? 1 : 0)); }
  $('c-bureaux').textContent = [...eq.values()].filter((v) => v === 0).length;
  $('nb-bots').textContent = bots.length + ' bots';
  const d = new Date(donnees.maj);
  $('maj').textContent = sim ? 'Simulation' : isNaN(d) ? '' : 'maj ' + fmtHeure.format(d) + ' (Toronto)';
  const ul = $('liste-equipe'); ul.replaceChildren();
  bots.forEach((b, i) => {
    const e = etatDe(b), li = document.createElement('li'); li.tabIndex = 0; li.setAttribute('role', 'button');
    li.innerHTML = '<span class="av"></span><span class="nm"></span><span class="st"><span class="pt"></span><span class="et"></span></span><span class="tc"></span>';
    li.querySelector('.av').style.background = b.couleur || PALETTE[i % PALETTE.length];
    li.querySelector('.nm').textContent = nomCourt(b, bots);
    const sm = document.createElement('small'); sm.textContent = b.equipe || ''; li.querySelector('.nm').append(sm);
    li.querySelector('.pt').className = 'pt ' + e; li.querySelector('.et').textContent = NOM_ETAT[e];
    li.querySelector('.tc').textContent = e === 'libre' ? 'En pause' : (b.tache || '—');
    li.addEventListener('click', () => ouvrirFiche(b.id)); ul.append(li);
  });
  dessiner();
  if (ficheId) ouvrirFiche(ficheId);
}
function rendreActivite() {
  const ul = $('liste-activite'); ul.replaceChildren();
  for (const a of activite) { const li = document.createElement('li'); const t = document.createElement('time'); const d = new Date(a.heure); t.textContent = isNaN(d) ? '' : fmtHeure.format(d); const s = document.createElement('span'); s.textContent = a.texte; li.append(t, s); ul.append(li); }
}
function appliquer(data, premier = false) {
  const avant = donnees ? new Map(donnees.bots.map((b) => [b.id, etatDe(b)])) : null;
  donnees = data;
  if (premier && Array.isArray(data.activite)) { activite.length = 0; activite.push(...data.activite.slice(0, 14)); }
  else if (avant) for (const b of data.bots) { const e = etatDe(b); if (avant.has(b.id) && avant.get(b.id) !== e) { const c = nomCourt(b, data.bots); activite.unshift({ heure: new Date().toISOString(), texte: e === 'occupe' ? `${c} : ${(b.tache || 'travail').toLowerCase()} en cours` : e === 'attend' ? `${c} attend une réponse de Guy` : `${c} rejoint la cupole` }); } }
  activite.length = Math.min(activite.length, 14);
  rendreActivite(); majInterface();
}
async function charger(premier = false) {
  if (sim) return;
  try { const r = await fetch('status.json?t=' + Date.now(), { cache: 'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status); appliquer(await r.json(), premier); $('erreur').hidden = true; }
  catch { $('erreur').textContent = 'Statut introuvable pour l’instant, nouvel essai dans 1 min.'; $('erreur').hidden = false; }
}
function pasSim() {
  if (!donnees) return; const data = structuredClone(donnees);
  for (let k = 0; k < 2; k++) {
    const b = data.bots[Math.floor(Math.random() * data.bots.length)], r = Math.random();
    if (b.etat === 'libre') { b.etat = r < 0.85 ? 'occupe' : 'attend'; b.tache = b.etat === 'attend' ? 'Validation' : TACHES[Math.floor(Math.random() * TACHES.length)]; }
    else if (b.etat === 'occupe') { b.etat = r < 0.7 ? 'libre' : 'attend'; b.tache = b.etat === 'attend' ? 'Validation' : ''; }
    else { b.etat = 'occupe'; b.tache = TACHES[Math.floor(Math.random() * TACHES.length)]; }
  }
  appliquer(data);
}
const btnSim = $('btn-sim');
btnSim.addEventListener('click', () => {
  if (sim) { clearInterval(sim); sim = null; btnSim.querySelector('.lib').textContent = 'Simulation'; btnSim.setAttribute('aria-pressed', 'false'); $('badge-mode').textContent = 'En direct'; charger(); }
  else { sim = setInterval(pasSim, 3500); pasSim(); btnSim.querySelector('.lib').textContent = 'Arrêter'; btnSim.setAttribute('aria-pressed', 'true'); $('badge-mode').textContent = 'Simulation'; }
});
function ouvrirFiche(id) {
  const b = donnees.bots.find((x) => x.id === id); if (!b) return;
  ficheId = id; const e = etatDe(b);
  $('fiche-nom').textContent = b.nom; $('fiche-equipe').textContent = 'Module ' + (b.equipe || '—');
  const et = $('fiche-etat'); et.innerHTML = '<span class="pt ' + e + '"></span>'; et.append(NOM_ETAT[e]);
  $('fiche-tache').textContent = e === 'libre' ? 'En pause, dans la cupole' : 'Tâche : ' + (b.tache || '—');
  $('fiche').hidden = false;
}
$('fiche-fermer').addEventListener('click', () => { ficheId = null; $('fiche').hidden = true; });
new ResizeObserver(() => dessiner()).observe(scene);
if (matchMedia('(max-width:860px)').matches) $('d-activite').open = false;
charger(true);
setInterval(() => charger(), INTERVALLE_MS);
window.__bureau2d = { pasSim, donnees: () => donnees };
