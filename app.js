// Bureau des bots GTR — première version (Three.js vendorisé, aucune build).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/CSS2DRenderer.js';

const INTERVALLE_MS = 60_000;
const VITESSE = 3; // unités / seconde
const conteneur = document.getElementById('scene');

// --- Rendu ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
conteneur.appendChild(renderer.domElement);
const labels = new CSS2DRenderer();
labels.domElement.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none';
conteneur.appendChild(labels.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1020);
scene.fog = new THREE.Fog(0x0b1020, 40, 90);
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.45;
controls.minDistance = 6;
controls.maxDistance = 60;

scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x202030, 1.1));
const soleil = new THREE.DirectionalLight(0xffffff, 1.4);
soleil.position.set(10, 20, 12);
soleil.castShadow = true;
soleil.shadow.mapSize.set(1024, 1024);
Object.assign(soleil.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30 });
scene.add(soleil);

const mat = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...extra });
const boite = (w, h, d, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.castShadow = o.receiveShadow = true; return o; };
const etiquette = (texte, classe) => { const el = document.createElement('div'); el.className = classe; el.textContent = texte; return new CSS2DObject(el); };
const segments = (nom) => nom.split(/\s[·–-]\s/).map((x) => x.trim()).filter(Boolean);
// Nom de plaque : 1er segment, ou 2e si le 1er est partagé (ex. « Finance - Trader » → « Trader »).
function nomsAffiches(bots) {
  const compte = {};
  bots.forEach((b) => { const k = segments(b.nom)[0]; compte[k] = (compte[k] || 0) + 1; });
  return new Map(bots.map((b) => { const s = segments(b.nom); return [b.id, compte[s[0]] > 1 && s[1] ? s[1] : s[0] || b.id]; }));
}
const estPortrait = () => conteneur.clientWidth < conteneur.clientHeight;
const teinte = (id) => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return new THREE.Color().setHSL((h % 360) / 360, 0.6, 0.55); };

// --- Décor (reconstruit selon N) ---
let decor = new THREE.Group();
scene.add(decor);
let disposition = null; // { postes: Map(id -> {x,z}), detente: [{x,z}], centre }

function construireDecor(bots) {
  scene.remove(decor);
  decor.traverse((o) => { if (o.element) o.element.remove(); });
  decor = new THREE.Group();
  scene.add(decor);

  const n = bots.length;
  const portrait = estPortrait();
  const cols = portrait ? Math.max(2, Math.min(4, Math.ceil(Math.sqrt(n * 0.8)))) : Math.max(2, Math.ceil(Math.sqrt(n * 1.3)));
  const rangs = Math.ceil(n / cols);
  const ex = 3.2, ez = 3.8;
  const largeur = cols * ex, profondeur = rangs * ez;
  // Paysage : salon à droite des bureaux. Portrait : salon devant les bureaux.
  const x0 = portrait ? -largeur / 2 : -largeur / 2 - 3;
  const z0 = portrait ? -(profondeur + 10) / 2 : -profondeur / 2;
  const salonX = portrait ? -1 : x0 + largeur + 6.5;
  const salonZ = portrait ? z0 + profondeur + 5 : 0;
  const minX = x0 - 1, maxX = portrait ? Math.max(x0 + largeur, salonX + 5.5) + 1 : salonX + 5.5;
  const minZ = z0 - 1.5, maxZ = portrait ? salonZ + 5 : Math.max(z0 + profondeur, salonZ + 5) + 1;
  const solW = maxX - minX + 4, solD = maxZ - minZ + 4;

  const sol = new THREE.Mesh(new THREE.PlaneGeometry(solW, solD), mat(0x1c2440));
  sol.rotation.x = -Math.PI / 2; sol.receiveShadow = true;
  sol.position.set((minX + maxX) / 2, 0, (minZ + maxZ) / 2);
  decor.add(sol);
  const grille = new THREE.GridHelper(Math.max(solW, solD), Math.round(Math.max(solW, solD) / 2), 0x2e3a66, 0x253055);
  grille.position.set(sol.position.x, 0.01, sol.position.z); decor.add(grille);
  const noms = nomsAffiches(bots);

  const postes = new Map();
  const mBureau = mat(0x8a6a4a), mPied = mat(0x333a50), mChaise = mat(0x2b3354);
  bots.forEach((b, i) => {
    const x = x0 + (i % cols) * ex + ex / 2, z = z0 + Math.floor(i / cols) * ez + ez / 2;
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const dessus = boite(2.2, 0.1, 1.1, mBureau); dessus.position.y = 0.8; g.add(dessus);
    for (const [px, pz] of [[-1, -0.45], [1, -0.45], [-1, 0.45], [1, 0.45]]) { const p = boite(0.08, 0.8, 0.08, mPied); p.position.set(px, 0.4, pz); g.add(p); }
    const ecran = boite(0.9, 0.5, 0.06, mat(0x111522, { emissive: 0x000000 })); ecran.position.set(0.55, 1.15, 0.1); ecran.rotation.y = Math.PI; g.add(ecran);
    const chaise = boite(0.6, 0.1, 0.6, mChaise); chaise.position.set(0, 0.5, -0.95); g.add(chaise);
    const dossier = boite(0.6, 0.7, 0.08, mChaise); dossier.position.set(0, 0.9, -1.25); g.add(dossier);
    const plaque = etiquette(noms.get(b.id), 'plaque'); plaque.position.set(0, 0.75, 0.75); g.add(plaque);
    decor.add(g);
    postes.set(b.id, { x, z: z - 0.95, ecran });
  });

  // Zone détente : tapis, canapé, machine à café
  const tapis = new THREE.Mesh(new THREE.CircleGeometry(4.6, 32), mat(0x2a5a4a)); tapis.rotation.x = -Math.PI / 2; tapis.position.set(salonX, 0.02, salonZ); tapis.receiveShadow = true; decor.add(tapis);
  const canape = new THREE.Group(); canape.position.set(salonX, 0, salonZ - 3.6);
  const mCanape = mat(0x6b4fa0);
  const assise = boite(4, 0.5, 1.2, mCanape); assise.position.y = 0.35; canape.add(assise);
  const dos = boite(4, 0.9, 0.3, mCanape); dos.position.set(0, 0.8, -0.5); canape.add(dos);
  decor.add(canape);
  const cafe = new THREE.Group(); cafe.position.set(salonX + 4, 0, salonZ - 1.5);
  const comptoir = boite(1.2, 1.0, 0.8, mat(0x444c66)); comptoir.position.y = 0.5; cafe.add(comptoir);
  const machine = boite(0.5, 0.6, 0.45, mat(0xb03a3a)); machine.position.y = 1.3; cafe.add(machine);
  decor.add(cafe);
  const table = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.45, 20), mat(0x8a6a4a)); table.position.set(salonX, 0.22, salonZ + 0.3); table.castShadow = true; decor.add(table);
  const zone = etiquette('Détente', 'zone'); zone.position.set(salonX, 0.1, salonZ + 4.3); decor.add(zone);

  // Places en détente : anneau autour de la table (s'agrandit si besoin)
  const detente = [];
  for (let k = 0; detente.length < n; k++) {
    const r = 1.9 + Math.floor(k / 10) * 1.1, a = (k % 10) / 10 * Math.PI * 2 + Math.floor(k / 10) * 0.3;
    detente.push({ x: salonX + Math.cos(a) * r, z: salonZ + 0.3 + Math.sin(a) * r });
  }
  disposition = { postes, detente, portrait, centre: new THREE.Vector3((minX + maxX) / 2, 0, (minZ + maxZ) / 2), taille: { w: maxX - minX, d: maxZ - minZ }, table: { x: salonX, z: salonZ + 0.3 } };
  cadrer();
}

// --- Personnages ---
const persos = new Map(); // id -> { groupe, bulle, cible, bot }
function creerPerso(b) {
  const g = new THREE.Group();
  const couleur = teinte(b.id);
  const corps = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.6, 4, 10), mat(couleur)); corps.position.y = 0.75; corps.castShadow = true; g.add(corps);
  const tete = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), mat(0xf1d2b6)); tete.position.y = 1.55; tete.castShadow = true; g.add(tete);
  const visiere = boite(0.36, 0.08, 0.1, mat(0x1a1f33)); visiere.position.set(0, 1.58, 0.22); g.add(visiere);
  const bulleEl = etiquette('', 'bulle'); bulleEl.position.y = 1.95; g.add(bulleEl);
  g.traverse((o) => { o.userData.botId = b.id; });
  scene.add(g);
  return { groupe: g, corps, bulle: bulleEl, cible: new THREE.Vector3(), bot: b, assis: false };
}

function appliquerStatut(data) {
  dernierLu = data;
  const bots = (data.bots || []).filter((b) => b && b.id);
  const ids = bots.map((b) => b.id).join('|');
  if (!disposition || disposition.ids !== ids || disposition.portrait !== estPortrait()) {
    for (const p of persos.values()) { p.bulle.element.remove(); scene.remove(p.groupe); }
    persos.clear();
    construireDecor(bots);
    disposition.ids = ids;
  }
  let libres = 0, occupes = 0;
  bots.forEach((b) => {
    let p = persos.get(b.id);
    const neuf = !p;
    if (neuf) { p = creerPerso(b); persos.set(b.id, p); }
    p.bot = b;
    const occupe = b.etat === 'occupe';
    const poste = disposition.postes.get(b.id);
    poste.ecran.material.emissive.setHex(occupe ? 0x2d6cff : 0x000000);
    if (occupe) { occupes++; p.cible.set(poste.x, 0, poste.z); }
    else { const s = disposition.detente[libres++]; p.cible.set(s.x, 0, s.z); }
    p.bulle.element.textContent = occupe ? (b.tache || 'Occupé') : '';
    p.bulle.visible = occupe;
    if (neuf) p.groupe.position.copy(p.cible);
  });
  document.getElementById('nb-occupes').textContent = occupes;
  document.getElementById('nb-libres').textContent = libres;
  const d = new Date(data.maj);
  document.getElementById('maj').textContent = isNaN(d) ? '' : 'Mise à jour : ' + d.toLocaleString('fr-CA', { timeZone: 'America/Toronto', dateStyle: 'medium', timeStyle: 'short' }) + ' (heure de Toronto)';
  if (ficheId) ouvrirFiche(ficheId);
}

async function charger() {
  const err = document.getElementById('erreur');
  try {
    const r = await fetch('status.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    appliquerStatut(await r.json());
    err.hidden = true;
  } catch (e) {
    err.textContent = 'Statut introuvable pour l’instant, nouvel essai dans 1 min.';
    err.hidden = false;
  }
}

// --- Fiche (clic / tap) ---
let ficheId = null;
const fiche = document.getElementById('fiche');
function ouvrirFiche(id) {
  const p = persos.get(id); if (!p) return fermerFiche();
  ficheId = id;
  const occupe = p.bot.etat === 'occupe';
  document.getElementById('fiche-nom').textContent = p.bot.nom;
  const etat = document.getElementById('fiche-etat');
  etat.textContent = occupe ? 'Occupé' : 'Libre'; etat.className = 'etat ' + (occupe ? 'occupe' : 'libre');
  document.getElementById('fiche-tache').textContent = occupe ? 'Tâche : ' + (p.bot.tache || '—') : 'En pause, zone détente';
  fiche.hidden = false;
}
function fermerFiche() { ficheId = null; fiche.hidden = true; }
document.getElementById('fiche-fermer').addEventListener('click', fermerFiche);
addEventListener('keydown', (e) => { if (e.key === 'Escape') fermerFiche(); });

const ray = new THREE.Raycaster(), souris = new THREE.Vector2();
let depart = null;
renderer.domElement.addEventListener('pointerdown', (e) => { depart = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!depart || Math.hypot(e.clientX - depart[0], e.clientY - depart[1]) > 8) return;
  const r = renderer.domElement.getBoundingClientRect();
  souris.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(souris, camera);
  const hit = ray.intersectObjects([...persos.values()].map((p) => p.groupe), true)[0];
  hit ? ouvrirFiche(hit.object.userData.botId) : fermerFiche();
});

// --- Cadrage et redimensionnement ---
function cadrer() {
  if (!disposition) return;
  const w = conteneur.clientWidth, h = conteneur.clientHeight;
  const vf = THREE.MathUtils.degToRad(camera.fov) / 2, hf = Math.atan(Math.tan(vf) * (w / h));
  const { w: lw, d: ld } = disposition.taille;
  const dist = Math.min(75, Math.max((lw / 2) / Math.tan(hf) * 1.05, (ld / 2) / Math.tan(vf) * 1.25, 10));
  controls.maxDistance = dist * 1.6;
  controls.target.copy(disposition.centre);
  camera.position.set(disposition.centre.x, dist * 0.78, disposition.centre.z + dist * 0.62);
  controls.update();
}
function redim() {
  const w = conteneur.clientWidth, h = conteneur.clientHeight;
  renderer.setSize(w, h); labels.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
let dernierLu = null;
new ResizeObserver(() => { redim(); if (dernierLu && disposition && disposition.portrait !== estPortrait()) appliquerStatut(dernierLu); else cadrer(); }).observe(conteneur);
redim();

// --- Boucle ---
const horloge = new THREE.Clock();
const tmp = new THREE.Vector3();
renderer.setAnimationLoop(() => {
  const dt = Math.min(horloge.getDelta(), 0.1), t = horloge.elapsedTime;
  for (const p of persos.values()) {
    const g = p.groupe;
    tmp.subVectors(p.cible, g.position); tmp.y = 0;
    const d = tmp.length();
    const occupe = p.bot.etat === 'occupe';
    if (d > 0.05) {
      g.position.addScaledVector(tmp.normalize(), Math.min(d, VITESSE * dt));
      g.rotation.y = Math.atan2(tmp.x, tmp.z);
      g.position.y = Math.abs(Math.sin(t * 10)) * 0.12; // petits pas
    } else {
      g.position.y = occupe ? -0.15 : 0; // assis un peu plus bas
      const tb = disposition.table; // libres : face à la table basse
      g.rotation.y = occupe ? 0 : Math.atan2(tb.x - g.position.x, tb.z - g.position.z);
      p.corps.scale.y = 1 + Math.sin(t * 2 + g.id) * 0.02; // respiration
    }
  }
  controls.update();
  renderer.render(scene, camera);
  labels.render(scene, camera);
});

charger();
setInterval(charger, INTERVALLE_MS);
window.__bureau = { appliquerStatut, persos, camera }; // utile pour les tests
