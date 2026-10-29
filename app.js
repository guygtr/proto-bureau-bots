// Bureau virtuel GTR — scène Three.js vendorisée, aucune build.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/CSS2DRenderer.js';

const INTERVALLE_MS = 60_000;
const VITESSE = 2.4;
const H = 5.2; // hauteur des murs
const COUL_ETAT = { occupe: '#8b7bff', attend: '#ff9f43', libre: '#a7b0c0' };
const NOM_ETAT = { occupe: 'Au travail', attend: 'Attend Guy', libre: 'Libre' };
const PALETTE = ['#3b6cff', '#ffd23f', '#ff7a2f', '#2ec4d6', '#34c759', '#9aa3b5', '#ff5fa2', '#8b5cf6', '#00c2a8', '#ff4d4d', '#7bd389', '#f5a524', '#5ac8fa', '#c084fc', '#e2725b', '#4ade80', '#60a5fa', '#facc15', '#fb7185', '#a3e635', '#22d3ee', '#f97316'];
const COUL_EQUIPE = ['#8b7bff', '#3ddc97', '#4cc3ff', '#ff5fa2', '#ffb347', '#e0e86b', '#ff6b6b', '#5eead4'];
const TACHES = ['Recherche', 'Veille', 'Analyse', 'Rédaction', 'Mise à jour'];
const tz = 'America/Toronto';
const fmtHeure = new Intl.DateTimeFormat('fr-CA', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

const conteneur = document.getElementById('scene');
const vue = document.querySelector('.vue');

// ---------- Rendu ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
conteneur.appendChild(renderer.domElement);
const labels = new CSS2DRenderer();
labels.domElement.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none';
conteneur.appendChild(labels.domElement);

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 400);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minPolarAngle = 0.5; controls.maxPolarAngle = 1.15;
controls.minZoom = 0.8; controls.maxZoom = 4;
controls.enablePan = true; controls.screenSpacePanning = true;

const hemi = new THREE.HemisphereLight(0xffe9d2, 0x3a2a20, 0.9);
scene.add(hemi);
const amb = new THREE.AmbientLight(0xffffff, 0.15); scene.add(amb);
const soleil = new THREE.DirectionalLight(0xfff1d6, 2.2);
soleil.castShadow = true;
soleil.shadow.mapSize.set(2048, 2048);
soleil.shadow.bias = -0.0004; soleil.shadow.normalBias = 0.03;
soleil.shadow.radius = 4;
scene.add(soleil, soleil.target);

// ---------- Utilitaires ----------
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, metalness: 0.02, ...o });
const cacheMat = new Map();
const mat = (c, o) => { const k = c + JSON.stringify(o || {}); if (!cacheMat.has(k)) cacheMat.set(k, M(c, o)); return cacheMat.get(k); };
function boite(parent, w, h, d, m, x, y, z, ombre = true) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof m === 'object' ? m : mat(m));
  o.position.set(x, y, z); o.castShadow = ombre; o.receiveShadow = true; parent.add(o); return o;
}
function cyl(parent, rt, rb, h, m, x, y, z, seg = 20) {
  const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof m === 'object' ? m : mat(m));
  o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
}
function texteCanvas(txt, { taille = 64, coul = '#fff', largeur = 1024, hauteur = 128, poids = 800, espace = 14 } = {}) {
  const c = document.createElement('canvas'); c.width = largeur; c.height = hauteur;
  const g = c.getContext('2d');
  g.font = `${poids} ${taille}px system-ui, sans-serif`; g.fillStyle = coul; g.textAlign = 'center'; g.textBaseline = 'middle';
  if ('letterSpacing' in g) g.letterSpacing = espace + 'px';
  g.fillText(txt, largeur / 2, hauteur / 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function texSol(w, d) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 1024;
  const g = c.getContext('2d');
  const planche = 1024 / 16;
  for (let i = 0; i < 16; i++) {
    let x = 0; const dec = (i * 37) % 5 * 60;
    while (x < 1024 + 300) {
      const long = 220 + ((i * 53 + x) % 7) * 40;
      const l = 46 + ((i * 7 + x / 13) % 9) * 1.4;
      g.fillStyle = `hsl(${24 + (i * 5 + x) % 7}, ${52 + (x % 3) * 4}%, ${l}%)`;
      g.fillRect(x - dec, i * planche, long, planche);
      for (let k = 0; k < 6; k++) { g.fillStyle = `rgba(80,40,15,${0.05 + (k % 3) * 0.02})`; g.fillRect(x - dec, i * planche + 6 + k * 9, long, 1.5); }
      g.fillStyle = 'rgba(40,20,8,.55)'; g.fillRect(x - dec, i * planche, 2, planche);
      x += long;
    }
    g.fillStyle = 'rgba(40,20,8,.6)'; g.fillRect(0, i * planche, 1024, 2);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / 8, d / 8); t.anisotropy = 8; return t;
}
const texHalo = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
})();
function halo(parent, coul, taille, x, y, z, plat = true) {
  const m = new THREE.MeshBasicMaterial({ map: texHalo, color: coul, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9 });
  const o = new THREE.Mesh(new THREE.PlaneGeometry(taille, taille), m);
  if (plat) o.rotation.x = -Math.PI / 2; o.position.set(x, y, z); o.renderOrder = 2; parent.add(o); return o;
}
const segments = (nom) => nom.split(/\s[·–-]\s/).map((x) => x.trim()).filter(Boolean);
function nomCourt(b, tous) {
  if (b.court) return b.court;
  const s = segments(b.nom); const dup = tous.filter((o) => segments(o.nom)[0] === s[0]).length > 1;
  return dup && s[1] ? s[1] : s[0] || b.id;
}
const estCell = () => matchMedia('(max-width:860px)').matches;

// ---------- Éléments de décor ----------
function plante(p, x, z, echelle = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(echelle);
  cyl(g, 0.34, 0.26, 0.62, '#f2efe9', 0, 0.31, 0);
  cyl(g, 0.3, 0.3, 0.04, '#4a3322', 0, 0.6, 0);
  const vert = ['#2f8f4e', '#3fae5f', '#277a43'];
  for (let i = 0; i < 9; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.2, 4), mat(vert[i % 3], { flatShading: true }));
    const a = i / 9 * Math.PI * 2;
    f.position.set(Math.cos(a) * 0.22, 1.15 + (i % 3) * 0.12, Math.sin(a) * 0.22);
    f.rotation.set(Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7); f.castShadow = true; g.add(f);
  }
  const t = new THREE.Mesh(new THREE.ConeGeometry(0.14, 1.4, 4), mat('#3fae5f', { flatShading: true })); t.position.y = 1.45; t.castShadow = true; g.add(t);
  p.add(g); return g;
}
const lampes = [];
function lampe(p, x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  cyl(g, 0.28, 0.32, 0.06, '#222', 0, 0.03, 0);
  cyl(g, 0.035, 0.035, 2.6, '#2a2a2a', 0, 1.3, 0, 8);
  const abat = cyl(g, 0.22, 0.42, 0.45, new THREE.MeshStandardMaterial({ color: '#ffe2b0', emissive: '#ffb347', emissiveIntensity: 0.8, roughness: 1 }), 0, 2.7, 0);
  abat.castShadow = false;
  const l = new THREE.PointLight('#ffb36b', 6, 9, 1.6); l.position.set(0, 2.45, 0); g.add(l);
  const h = halo(g, '#ffb347', 3.2, 0, 0.03, 0);
  lampes.push({ l, abat, h }); p.add(g);
}
function chaise(p, x, z, rot, coul = '#2b2f3a') {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot;
  cyl(g, 0.24, 0.24, 0.06, '#1b1d24', 0, 0.03, 0, 10);
  cyl(g, 0.03, 0.03, 0.42, '#555', 0, 0.24, 0, 6);
  boite(g, 0.5, 0.08, 0.5, coul, 0, 0.47, 0);
  boite(g, 0.5, 0.55, 0.07, coul, 0, 0.78, 0.24);
  p.add(g); return g;
}

// ---------- Construction de l'étage ----------
let etage = new THREE.Group(); scene.add(etage);
let plan = null; // { W, D, postes: Map, places: [], ecranStats, ciel, horloge }

function construire(bots) {
  scene.remove(etage);
  etage.traverse((o) => { if (o.element) o.element.remove(); });
  etage = new THREE.Group(); scene.add(etage);
  lampes.length = 0;

  // Regroupe par équipe (ordre d'apparition)
  const equipes = [];
  for (const b of bots) {
    const n = b.equipe || 'Équipe';
    let e = equipes.find((x) => x.nom === n);
    if (!e) { e = { nom: n, bots: [], coul: COUL_EQUIPE[equipes.length % COUL_EQUIPE.length] }; equipes.push(e); }
    e.bots.push(b);
  }
  const direction = equipes.find((e) => /^direction$/i.test(e.nom));
  const autres = equipes.filter((e) => e !== direction);

  const W = 30, CX = 2.6, CZ = 2.9;
  const dims = (n, maxCols = 3) => { const cols = n === 4 ? 2 : Math.min(n, maxCols); const rangs = Math.ceil(n / cols); return { cols, rangs, w: cols * CX + 0.8, d: rangs * CZ + 1.3 }; };

  // Bureau vitré (Direction) dans le coin du fond à gauche
  const oD = direction ? dims(direction.bots.length, 2) : null;
  const oW = 7.4, dO = direction ? Math.max(5.6, oD.d + 0.6) : 0;

  // Empaquetage des zones d'équipe + salon dans l'aire de travail
  const xL = 9, xR = W - 1.0;
  const items = autres.map((e) => ({ ...dims(e.bots.length), e }));
  items.push({ salon: true, w: 9.6, d: 7.6 });
  const rangees = []; let cur = null;
  for (const it of items) {
    if (!cur || cur.x + it.w > xR - xL) { cur = { x: 0, d: 0, items: [] }; rangees.push(cur); }
    it.rx = cur.x; cur.x += it.w + 1.1; cur.d = Math.max(cur.d, it.d); cur.items.push(it);
  }
  let z = 1.4;
  for (const r of rangees) {
    const largeur = r.x - 1.1, dec = xL + (xR - xL - largeur) / 2;
    for (const it of r.items) { it.x = dec + it.rx; it.z = z + (r.d - it.d) / 2; }
    z += r.d + 1.1;
  }
  const D = Math.max(22, z + 0.2);

  // Sol, dalle, murs
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: texSol(W, D), roughness: 0.62 }));
  sol.rotation.x = -Math.PI / 2; sol.position.set(W / 2, 0, D / 2); sol.receiveShadow = true; etage.add(sol);
  boite(etage, W + 0.6, 0.5, D + 0.3, '#5b3a22', W / 2 - 0.3, -0.25, D / 2 - 0.15, false);
  boite(etage, W + 0.6, 0.06, D + 0.3, '#b88358', W / 2 - 0.3, -0.03, D / 2 - 0.15, false);
  const murSombre = mat('#454b59', { roughness: 0.9 });
  boite(etage, 0.3, H, D + 0.3, murSombre, -0.15, H / 2, D / 2 - 0.15);
  boite(etage, 0.32, 0.08, D + 0.3, '#4a5060', -0.15, H + 0.04, D / 2 - 0.15, false);
  boite(etage, 0.04, 0.18, D, '#1c1f27', 0.02, 0.09, D / 2, false); // plinthe

  // Mur de fenêtres (fond)
  const cadre = mat('#1b1f29', { roughness: 0.6 });
  boite(etage, W + 0.3, 0.55, 0.3, cadre, W / 2 - 0.15, 0.275, -0.15);
  boite(etage, W + 0.3, 0.5, 0.3, cadre, W / 2 - 0.15, H - 0.25, -0.15);
  boite(etage, W + 0.6, 0.08, 0.32, '#3a4050', W / 2 - 0.3, H + 0.04, -0.15, false);
  const nbPan = 8;
  for (let i = 0; i <= nbPan; i++) boite(etage, 0.14, H, 0.3, cadre, Math.min(W - 0.07, 0.07 + i * (W / nbPan)), H / 2, -0.15);
  boite(etage, W, 0.07, 0.12, cadre, W / 2, 2.9, -0.1);
  const verre = new THREE.Mesh(new THREE.PlaneGeometry(W, H - 1.05), new THREE.MeshStandardMaterial({ color: '#cfe6ff', transparent: true, opacity: 0.08, roughness: 0.05, metalness: 0.1, depthWrite: false }));
  verre.position.set(W / 2, 0.55 + (H - 1.05) / 2, -0.02); etage.add(verre);
  const cielC = document.createElement('canvas'); cielC.width = 1024; cielC.height = 256;
  const cielT = new THREE.CanvasTexture(cielC); cielT.colorSpace = THREE.SRGBColorSpace;
  const ciel = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.1, H), new THREE.MeshBasicMaterial({ map: cielT, fog: false }));
  ciel.position.set(W / 2, H / 2 - 0.25, -0.7); etage.add(ciel);

  // Bureau vitré
  const postes = new Map();
  const zonesSol = [];
  if (direction) {
    tapis(0.5, 0.5, oW - 1.0, dO - 1.0, direction.coul, direction.nom, true);
    const vitre = new THREE.MeshStandardMaterial({ color: '#bfe3ff', transparent: true, opacity: 0.14, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
    const hV = 3.0, porte0 = oW - 2.1, porte1 = oW - 0.3;
    const pv = (w, x, zz, rot) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, hV), vitre); m.position.set(x, hV / 2, zz); m.rotation.y = rot; etage.add(m); };
    pv(porte0, porte0 / 2, dO, 0);
    pv(dO, oW, dO / 2, Math.PI / 2);
    const cad = '#151821';
    boite(etage, porte0, 0.08, 0.08, cad, porte0 / 2, hV, dO); boite(etage, 0.08, 0.08, dO, cad, oW, hV, dO / 2);
    boite(etage, oW - porte1 + 0.1, 0.08, 0.08, cad, (oW + porte1) / 2, hV, dO);
    for (const x of [porte0, porte1, oW]) boite(etage, 0.08, hV, 0.08, cad, x, hV / 2, dO);
    for (let zz = 0; zz < dO; zz += dO / 2) boite(etage, 0.08, hV, 0.08, cad, oW, hV / 2, zz);
    pv(oW - porte1, (oW + porte1) / 2, dO, 0);
    boite(etage, 0.05, 0.05, 0.55, '#c9cdd6', 0.25, 1.5, 1.2); // rien de lourd
    // Étagère dans le bureau
    etagere(0.35, dO - 1.4, Math.PI / 2);
    const plaq = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.32), new THREE.MeshBasicMaterial({ map: texteCanvas('CHEF DE CABINET', { taille: 56, coul: '#e8e4ff' }), transparent: true }));
    plaq.position.set(oW / 2 - 0.6, 2.75, dO + 0.01); etage.add(plaq);
    placerPostes(direction, 0.5, 0.5, oW - 1.0, 2, { porteX: (porte0 + porte1) / 2, dO });
    plante(etage, oW - 0.6, 0.8, 0.9);
  }

  function tapis(x, zz, w, d, coul, nom, bordure = true) {
    const g = new THREE.Group();
    const c = new THREE.Color(coul);
    const fond = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: c.clone().multiplyScalar(0.22).lerp(new THREE.Color('#1a1726'), 0.35), roughness: 0.95 }));
    fond.rotation.x = -Math.PI / 2; fond.position.set(x + w / 2, 0.012, zz + d / 2); fond.receiveShadow = true; g.add(fond);
    if (bordure) {
      const mb = new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
      const ep = 0.07;
      for (const [bw, bd, bx, bz] of [[w, ep, x + w / 2, zz], [w, ep, x + w / 2, zz + d], [ep, d, x, zz + d / 2], [ep, d, x + w, zz + d / 2]]) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.02, bd), mb); b.position.set(bx, 0.02, bz); g.add(b);
      }
      const lueur = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false });
      for (const [bw, bd, bx, bz] of [[w + 0.3, 0.35, x + w / 2, zz], [w + 0.3, 0.35, x + w / 2, zz + d], [0.35, d, x, zz + d / 2], [0.35, d, x + w, zz + d / 2]]) {
        const b = new THREE.Mesh(new THREE.PlaneGeometry(bw, bd), lueur); b.rotation.x = -Math.PI / 2; b.position.set(bx, 0.016, bz); g.add(b);
      }
    }
    if (nom) {
      const t = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w - 0.4, 5.2), 0.6), new THREE.MeshBasicMaterial({ map: texteCanvas(nom.toUpperCase(), { coul: '#' + c.clone().lerp(new THREE.Color('#ffffff'), 0.55).getHexString(), taille: 70 }), transparent: true, opacity: 0.92, depthWrite: false }));
      t.rotation.x = -Math.PI / 2; t.position.set(x + w / 2, 0.025, zz + d - 0.42); g.add(t);
    }
    etage.add(g); zonesSol.push(g); return g;
  }

  function etagere(x, zz, rot) {
    const g = new THREE.Group(); g.position.set(x, 0, zz); g.rotation.y = rot;
    const bois = '#5a3a25';
    boite(g, 1.8, 2.6, 0.08, bois, 0, 1.3, -0.25);
    for (const sx of [-0.9, 0.9]) boite(g, 0.08, 2.6, 0.5, bois, sx, 1.3, 0);
    const livres = ['#c0392b', '#2e86de', '#f1c40f', '#27ae60', '#8e44ad', '#e67e22', '#ecf0f1'];
    for (let r = 0; r < 4; r++) {
      boite(g, 1.8, 0.06, 0.5, bois, 0, 0.15 + r * 0.65, 0);
      let bx = -0.8;
      while (bx < 0.75) { const lw = 0.08 + ((r * 7 + bx * 13) % 3 + 3) % 3 * 0.03, lh = 0.38 + ((bx * 17) % 2 + 2) % 2 * 0.12; boite(g, lw, lh, 0.32, livres[Math.abs(Math.round(bx * 31 + r)) % livres.length], bx + lw / 2, 0.18 + r * 0.65 + lh / 2, 0, false); bx += lw + 0.015; }
    }
    etage.add(g);
  }

  function placerPostes(e, zx, zz, zw, maxCols, office) {
    const { cols } = dims(e.bots.length, maxCols);
    const ox = zx + (zw - cols * CX) / 2;
    e.bots.forEach((b, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const x = ox + c * CX + CX / 2, dz = zz + 0.45 + r * CZ + 0.6;
      const g = new THREE.Group(); g.position.set(x, 0, dz);
      const plateau = office && i === 0 ? '#6b4a32' : '#e9e4dc';
      boite(g, 1.9, 0.07, 0.95, plateau, 0, 0.76, 0);
      for (const px of [-0.88, 0.88]) boite(g, 0.06, 0.74, 0.85, '#2b2f3a', px, 0.37, 0);
      boite(g, 0.18, 0.3, 0.12, '#1d2029', 0, 0.95, -0.28);
      boite(g, 0.95, 0.56, 0.05, '#111318', 0, 1.33, -0.3);
      const ecranMat = new THREE.MeshBasicMaterial({ color: '#1a1e26', toneMapped: false });
      const ecran = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.48), ecranMat); ecran.position.set(0, 1.33, -0.27); g.add(ecran);
      const lueur = halo(g, '#7fb4ff', 2.2, 0, 1.33, -0.2, false); lueur.visible = false;
      boite(g, 0.5, 0.02, 0.16, '#cfd3da', -0.1, 0.8, 0.12, false);
      boite(g, 0.2, 0.12, 0.2, '#f2efe9', 0.6, 0.86, 0.05, false);
      const ch = chaise(g, 0, 0.85, 0, '#2b2f3a');
      etage.add(g);
      const chaiseZ = dz + 0.85;
      const chemin = office
        ? [[office.porteX, office.dO + 0.9], [office.porteX, chaiseZ + 0.4], [x, chaiseZ + 0.4]]
        : [[zx - 0.55, zz + dims(e.bots.length).d + 0.5], [zx - 0.55, chaiseZ + 0.35], [x, chaiseZ + 0.35]];
      postes.set(b.id, { x, z: chaiseZ, rot: Math.PI, assis: true, ecranMat, lueur, chemin, haloPos: [x, dz + 0.55] });
    });
  }

  for (const it of items) {
    if (it.salon) continue;
    tapis(it.x, it.z, it.w, it.d, it.e.coul, it.e.nom);
    placerPostes(it.e, it.x, it.z, it.w, 3, null);
  }

  // Places en détente
  const places = [];
  const salon = items.find((i) => i.salon);
  {
    const cx = salon.x + salon.w / 2, cz = salon.z + salon.d / 2;
    const r = new THREE.Mesh(new THREE.CircleGeometry(3.6, 48), M('#2f9e5a', { roughness: 1 }));
    r.rotation.x = -Math.PI / 2; r.position.set(cx, 0.015, cz + 0.2); r.receiveShadow = true; etage.add(r);
    const gris = mat('#5d6573'), coussin = mat('#2fa79a');
    // Canapé en L
    boite(etage, 5.6, 0.45, 1.1, gris, cx, 0.3, cz - 2.2);
    boite(etage, 5.6, 0.7, 0.3, gris, cx, 0.75, cz - 2.65);
    boite(etage, 1.1, 0.45, 3.2, gris, cx - 3.35, 0.3, cz - 0.75);
    boite(etage, 0.3, 0.7, 3.2, gris, cx - 3.8, 0.75, cz - 0.75);
    for (let i = 0; i < 4; i++) boite(etage, 1.25, 0.14, 0.9, coussin, cx - 2.05 + i * 1.37, 0.6, cz - 2.15);
    for (let i = 0; i < 2; i++) boite(etage, 0.9, 0.14, 1.3, coussin, cx - 3.35, 0.6, cz - 0.05 - i * 1.45 + 0.6);
    boite(etage, 0.3, 0.55, 1.1, gris, cx + 2.95, 0.42, cz - 2.2);
    // Table basse
    boite(etage, 1.8, 0.1, 1.0, '#a8754f', cx + 0.3, 0.45, cz + 0.2);
    for (const [a, b] of [[-0.8, -0.4], [0.8, -0.4], [-0.8, 0.4], [0.8, 0.4]]) boite(etage, 0.06, 0.4, 0.06, '#5a3a25', cx + 0.3 + a, 0.2, cz + 0.2 + b);
    cyl(etage, 0.08, 0.08, 0.12, '#ff5fa2', cx + 0.5, 0.56, cz + 0.1, 10);
    for (let i = 0; i < 4; i++) places.push({ x: cx - 2.05 + i * 1.37, z: cz - 2.0, rot: 0, assis: true, h: 0.22 });
    for (let i = 0; i < 2; i++) places.push({ x: cx - 3.25, z: cz + 0.55 - i * 1.45, rot: Math.PI / 2, assis: true, h: 0.22 });
    plante(etage, salon.x + salon.w - 0.3, salon.z + salon.d - 0.3, 1.1);
    lampe(etage, cx - 3.9, cz - 2.9);
    for (let i = 0; i < 4; i++) places.push({ x: cx - 1.2 + i * 1.2, z: cz + 2.4, rot: Math.PI, assis: false });
  }
  // Cuisine (mur de gauche), écran de stats, horloge, porte
  const k0 = dO + 1.0;
  boite(etage, 1.0, 0.95, 4.2, '#eceae6', 0.5, 0.475, k0 + 2.1);
  boite(etage, 1.08, 0.06, 4.3, '#3a3f4a', 0.54, 0.98, k0 + 2.1);
  boite(etage, 0.9, 2.1, 1.0, '#c9cdd4', 0.45, 1.05, k0 + 4.8);
  boite(etage, 0.02, 1.0, 0.04, '#7b818c', 0.91, 1.3, k0 + 4.45, false);
  boite(etage, 0.4, 0.45, 0.35, '#1f2229', 0.4, 1.23, k0 + 0.6);
  cyl(etage, 0.06, 0.05, 0.12, '#ffffff', 0.55, 1.07, k0 + 1.0, 10);
  boite(etage, 0.45, 0.05, 3.6, '#5a3a25', 0.23, 2.2, k0 + 2.1);
  for (let i = 0; i < 6; i++) cyl(etage, 0.07, 0.06, 0.15, ['#ff9f43', '#4cc3ff', '#ffffff'][i % 3], 0.25, 2.3, k0 + 0.6 + i * 0.55, 10);
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45), new THREE.MeshBasicMaterial({ map: texteCanvas('CAFÉ', { taille: 92, coul: '#ffcf7a', largeur: 512 }), transparent: true, toneMapped: false }));
  neon.rotation.y = Math.PI / 2; neon.position.set(0.03, 2.85, k0 + 2.1); etage.add(neon);
  halo(etage, '#ffb347', 2.6, 0.05, 2.85, k0 + 2.1, false).rotation.y = Math.PI / 2;
  for (let i = 0; i < 3; i++) places.push({ x: 1.55, z: k0 + 0.9 + i * 1.3, rot: -Math.PI / 2, assis: false });

  const statsC = document.createElement('canvas'); statsC.width = 512; statsC.height = 300;
  const statsT = new THREE.CanvasTexture(statsC); statsT.colorSpace = THREE.SRGBColorSpace;
  const zS = k0 + 6.6;
  boite(etage, 0.08, 1.75, 2.9, '#0b0d12', 0.04, 2.55, zS);
  const ecranStats = new THREE.Mesh(new THREE.PlaneGeometry(2.75, 1.6), new THREE.MeshBasicMaterial({ map: statsT, toneMapped: false }));
  ecranStats.rotation.y = Math.PI / 2; ecranStats.position.set(0.09, 2.55, zS); etage.add(ecranStats);
  halo(etage, '#3ddc97', 3.6, 0.1, 2.55, zS, false).rotation.y = Math.PI / 2;
  const horlC = document.createElement('canvas'); horlC.width = horlC.height = 256;
  const horlT = new THREE.CanvasTexture(horlC); horlT.colorSpace = THREE.SRGBColorSpace;
  const horl = new THREE.Mesh(new THREE.CircleGeometry(0.45, 32), new THREE.MeshBasicMaterial({ map: horlT }));
  horl.rotation.y = Math.PI / 2; horl.position.set(0.04, 3.9, k0 + 4.8); etage.add(horl);
  const zP = D - 2.0;
  boite(etage, 0.1, 2.5, 1.3, '#7a4f31', 0.05, 1.25, zP);
  boite(etage, 0.12, 2.6, 0.08, '#3a2a1e', 0.06, 1.3, zP - 0.68); boite(etage, 0.12, 2.6, 0.08, '#3a2a1e', 0.06, 1.3, zP + 0.68);
  boite(etage, 0.12, 0.08, 1.44, '#3a2a1e', 0.06, 2.58, zP);
  cyl(etage, 0.05, 0.05, 0.08, '#d4af37', 0.14, 1.2, zP - 0.45, 8).rotation.z = Math.PI / 2;
  const sortie = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.2), new THREE.MeshBasicMaterial({ color: '#3ddc97', toneMapped: false }));
  sortie.rotation.y = Math.PI / 2; sortie.position.set(0.04, 2.95, zP); etage.add(sortie);
  plante(etage, 0.8, D - 0.7, 1.0);
  plante(etage, 0.8, zS + 2.0, 0.85);

  // Table ronde et chaises
  const tx = 4.6, tz = zS + 0.6;
  cyl(etage, 0.85, 0.85, 0.07, '#e9e4dc', tx, 0.76, tz, 28);
  cyl(etage, 0.07, 0.07, 0.72, '#2b2f3a', tx, 0.38, tz, 8);
  cyl(etage, 0.35, 0.35, 0.04, '#2b2f3a', tx, 0.02, tz, 16);
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * Math.PI * 2 + Math.PI / 4;
    chaise(etage, tx + Math.cos(a) * 1.15, tz + Math.sin(a) * 1.15, -a - Math.PI / 2, '#2fa79a');
    places.push({ x: tx + Math.cos(a) * 1.05, z: tz + Math.sin(a) * 1.05, rot: -a - Math.PI / 2 + Math.PI, assis: true, h: 0.08 });
  }
  // Baie de serveurs et autres
  const baie = new THREE.Group(); baie.position.set(W - 0.85, 0, 1.0);
  boite(baie, 1.2, 3.0, 1.0, '#0f1116', 0, 1.5, 0);
  const leds = [];
  for (let r = 0; r < 9; r++) {
    boite(baie, 1.05, 0.22, 0.02, '#1c2029', 0, 0.4 + r * 0.3, -0.51, false);
    for (let k = 0; k < 4; k++) { const m = new THREE.MeshBasicMaterial({ color: k % 2 ? '#3ddc97' : '#4cc3ff', toneMapped: false }); const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.02), m); l.position.set(-0.4 + k * 0.1, 0.4 + r * 0.3, -0.52); baie.add(l); leds.push(l); }
  }
  baie.rotation.y = -Math.PI / 2;
  etage.add(baie);
  lampe(etage, W - 0.9, 5.4);
  lampe(etage, oW + 0.9, dO + 0.9);
  plante(etage, W - 0.8, D - 0.8, 1.2);
  plante(etage, W - 0.8, 2.6, 0.9);

  // Places supplémentaires si beaucoup de bots
  while (places.length < bots.length) { const k = places.length; places.push({ x: salon.x + 1 + (k % 6) * 1.3, z: salon.z + salon.d + 0.6 + Math.floor(k / 6) * 0.2, rot: Math.PI, assis: false }); }

  // Ordre de remplissage : on alterne canapé, table ronde et cuisine pour bien répartir
  const canape = places.slice(0, 6), debout = places.slice(6, 10), cuisine = places.slice(10, 13), ronde = places.slice(13, 17), extra = places.slice(17);
  const ordre = [canape[0], cuisine[0], ronde[0], canape[2], canape[4], debout[1], ronde[2], canape[1], debout[3], cuisine[2], canape[3], canape[5], debout[0], debout[2], ronde[1], ronde[3], cuisine[1], ...extra].filter(Boolean);
  places.length = 0; places.push(...ordre);
  places.forEach((pl, k) => { pl.etqY = 1.85 + (k % 3) * 0.42; });
  plan = { W, D, postes, places, statsC, statsT, horlC, horlT, cielC, cielT, leds, ids: bots.map((b) => b.id).join('|'), tx, tz };
  soleil.position.set(W * 0.78, 16, -14); soleil.target.position.set(W / 2, 0, D / 2);
  Object.assign(soleil.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 80 });
  soleil.shadow.camera.updateProjectionMatrix();
  dessinerHorloge(); appliquerAmbiance(ambianceCourante());
  cadrer();
}

// ---------- Ambiances ----------
const AMB = {
  jour: { ciel: ['#5aa9f0', '#cfe7ff'], soleil: ['#fff1d6', 2.6], hemi: 1.0, amb: 0.2, lampes: 1.5, expo: 1.05, nuit: false },
  soir: { ciel: ['#2c3e86', '#ff9a5c'], soleil: ['#ff9a5c', 1.5], hemi: 0.6, amb: 0.12, lampes: 6, expo: 1.05, nuit: false },
  nuit: { ciel: ['#04060f', '#18224a'], soleil: ['#7f93ff', 0.45], hemi: 0.42, amb: 0.08, lampes: 9, expo: 1.15, nuit: true },
};
let choixAmb = 'maintenant';
function ambianceCourante() {
  if (choixAmb !== 'maintenant') return choixAmb;
  const h = +fmtHeure.formatToParts(new Date()).find((p) => p.type === 'hour').value;
  return h >= 7 && h < 17 ? 'jour' : h >= 17 && h < 20 ? 'soir' : 'nuit';
}
function dessinerCiel(a) {
  const g = plan.cielC.getContext('2d'), w = 1024, h = 256;
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, a.ciel[0]); gr.addColorStop(1, a.ciel[1]);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  if (a.nuit) for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + (i % 5) / 8})`; g.fillRect((i * 97) % w, (i * 53) % 140, 2, 2); }
  else { g.fillStyle = 'rgba(255,255,255,.55)'; for (const [x, y, r] of [[160, 60, 40], [200, 55, 30], [620, 80, 46], [670, 70, 34], [880, 45, 28]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } }
  if (!a.nuit) { g.fillStyle = a === AMB.soir ? 'rgba(255,190,120,.9)' : 'rgba(255,250,220,.95)'; g.beginPath(); g.arc(860, a === AMB.soir ? 170 : 70, 26, 0, 7); g.fill(); }
  else { g.fillStyle = '#f4f1de'; g.beginPath(); g.arc(860, 60, 18, 0, 7); g.fill(); }
  let x = 0, i = 0;
  while (x < w) {
    const bw = 40 + (i * 37) % 60, bh = 60 + (i * 71) % 110;
    g.fillStyle = a.nuit ? '#0b1022' : a === AMB.soir ? '#3a3050' : '#7d94b5'; g.fillRect(x, h - bh, bw, bh);
    g.fillStyle = a.nuit ? 'rgba(255,214,120,.85)' : 'rgba(255,255,255,.25)';
    for (let yy = h - bh + 8; yy < h - 6; yy += 14) for (let xx = x + 6; xx < x + bw - 6; xx += 11) if (((xx * 7 + yy * 3 + i) % 5) < (a.nuit ? 2 : 3)) g.fillRect(xx, yy, 5, 7);
    x += bw + 4; i++;
  }
  plan.cielT.needsUpdate = true;
}
function appliquerAmbiance(nom) {
  if (!plan) return;
  const a = AMB[nom];
  dessinerCiel(a);
  soleil.color.set(a.soleil[0]); soleil.intensity = a.soleil[1];
  soleil.position.set(plan.W * (nom === 'soir' ? 0.95 : 0.78), nom === 'soir' ? 8 : 16, -14);
  hemi.intensity = a.hemi; amb.intensity = a.amb; renderer.toneMappingExposure = a.expo;
  hemi.color.set(a.nuit ? '#8ea0ff' : '#ffe9d2');
  for (const l of lampes) { l.l.intensity = a.lampes; l.abat.material.emissiveIntensity = a.nuit ? 2 : 0.8; l.h.material.opacity = a.nuit ? 0.9 : 0.35; }
  scene.background = new THREE.Color(a.nuit ? '#080b12' : '#0d1117');
  document.querySelectorAll('.ambiance button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.amb === choixAmb));
  ambActive = nom;
  for (const p of persos.values()) majPerso(p);
}
let ambActive = 'jour';
document.querySelectorAll('.ambiance button').forEach((b) => b.addEventListener('click', () => { choixAmb = b.dataset.amb; appliquerAmbiance(ambianceCourante()); }));

function dessinerHorloge() {
  const g = plan.horlC.getContext('2d');
  g.fillStyle = '#f4f2ee'; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill();
  g.lineWidth = 10; g.strokeStyle = '#22252d'; g.stroke();
  g.fillStyle = '#22252d'; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.fillRect(128 + Math.sin(a) * 100 - 4, 128 - Math.cos(a) * 100 - 4, 8, 8); }
  const [hh, mm] = fmtHeure.format(new Date()).split(/\D+/).map(Number);
  const aig = (a, l, w) => { g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(a) * l, 128 - Math.cos(a) * l); g.stroke(); };
  aig(((hh % 12) + mm / 60) / 12 * Math.PI * 2, 60, 10); aig(mm / 60 * Math.PI * 2, 90, 6);
  plan.horlT.needsUpdate = true;
}
function dessinerStats(c) {
  const g = plan.statsC.getContext('2d'), total = c.occupe + c.attend + c.libre || 1;
  g.fillStyle = '#0d1520'; g.fillRect(0, 0, 512, 300);
  g.fillStyle = '#8b93a7'; g.font = '600 22px system-ui'; g.fillText('BUREAU GTR · AUJOURD’HUI', 26, 42);
  g.fillStyle = '#3ddc97'; g.font = '800 92px system-ui'; g.fillText(Math.round((c.occupe + c.attend) / total * 100) + ' %', 24, 140);
  g.fillStyle = '#c9d1e0'; g.font = '500 22px system-ui'; g.fillText('des bots sont actifs', 28, 175);
  const vals = [c.occupe, c.attend, c.libre], cols = ['#8b7bff', '#ff9f43', '#a7b0c0'];
  vals.forEach((v, i) => { const h = 18 + v / total * 80; g.fillStyle = cols[i]; g.fillRect(330 + i * 52, 160 - h, 34, h); });
  g.fillStyle = '#1f2a3a'; g.fillRect(26, 210, 460, 10); g.fillStyle = '#3ddc97'; g.fillRect(26, 210, 460 * (c.occupe + c.attend) / total, 10);
  for (let i = 0; i < 24; i++) { g.fillStyle = '#4cc3ff'; const h = 8 + ((i * 37) % 11) * 4; g.fillRect(26 + i * 19, 284 - h, 12, h); }
  plan.statsT.needsUpdate = true;
}

// ---------- Personnages ----------
const persos = new Map();
function creerPerso(b, i, court) {
  const coul = new THREE.Color(b.couleur || PALETTE[i % PALETTE.length]);
  const g = new THREE.Group();
  const corpsM = mat('#' + coul.getHexString(), { roughness: 0.55 });
  const clair = mat('#' + coul.clone().lerp(new THREE.Color('#ffffff'), 0.25).getHexString(), { roughness: 0.5 });
  const fonce = mat('#' + coul.clone().multiplyScalar(0.55).getHexString());
  const hanche = new THREE.Group(); hanche.position.y = 0.36; g.add(hanche);
  const jambes = [-0.13, 0.13].map((x) => { const j = new THREE.Group(); j.position.x = x; boite(j, 0.17, 0.36, 0.2, fonce, 0, -0.18, 0); hanche.add(j); return j; });
  const torse = new THREE.Group(); torse.position.y = 0.36; g.add(torse);
  boite(torse, 0.56, 0.5, 0.4, corpsM, 0, 0.25, 0);
  boite(torse, 0.3, 0.14, 0.02, mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.15 }), 0, 0.3, 0.21, false);
  const bras = [-0.36, 0.36].map((x) => { const a = new THREE.Group(); a.position.set(x, 0.46, 0); boite(a, 0.14, 0.42, 0.16, clair, 0, -0.18, 0); torse.add(a); return a; });
  const tete = new THREE.Group(); tete.position.y = 0.78; torse.add(tete);
  boite(tete, 0.66, 0.5, 0.54, clair, 0, 0.18, 0);
  boite(tete, 0.52, 0.26, 0.02, '#12151c', 0, 0.2, 0.28, false);
  const yeux = new THREE.MeshBasicMaterial({ color: '#9ef3ff', toneMapped: false });
  for (const x of [-0.12, 0.12]) { const o = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.02), yeux); o.position.set(x, 0.2, 0.295); tete.add(o); }
  cyl(tete, 0.02, 0.02, 0.2, '#30343e', 0, 0.53, 0, 6);
  const bouleM = new THREE.MeshBasicMaterial({ color: COUL_ETAT[b.etat] || '#ccc', toneMapped: false });
  const boule = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), bouleM); boule.position.y = 0.66; tete.add(boule);
  const haloSol = halo(g, '#' + coul.getHexString(), 2.0, 0, 0.03, 0); haloSol.visible = false;
  const el = document.createElement('div'); el.className = 'etq';
  el.innerHTML = '<span class="pt"></span><span class="n"></span>';
  el.querySelector('.n').textContent = court;
  const etq = new CSS2DObject(el); etq.position.y = 1.85; g.add(etq);
  g.traverse((o) => { o.userData.botId = b.id; });
  g.scale.setScalar(1.22);
  scene.add(g);
  return { b, g, hanche, jambes, bras, torse, boule, haloSol, etq, el, coul: '#' + coul.getHexString(), court, chemin: [], place: null, phase: i * 0.7 };
}
function majPerso(p) {
  const e = p.b.etat in COUL_ETAT ? p.b.etat : 'libre';
  p.boule.material.color.set(COUL_ETAT[e]);
  const pt = p.el.querySelector('.pt'); pt.className = 'pt ' + e;
  p.el.classList.toggle('libre', e === 'libre');
  const poste = plan.postes.get(p.b.id);
  if (poste) {
    const actif = e !== 'libre';
    poste.ecranMat.color.set(actif ? (e === 'attend' ? '#ffb36b' : (ambActive === 'nuit' ? '#9cc4ff' : '#7fb0ff')) : '#1a1e26');
    poste.lueur.visible = actif; poste.lueur.material.color.set(e === 'attend' ? '#ff9f43' : '#6fa8ff');
    poste.lueur.material.opacity = ambActive === 'nuit' ? 0.9 : 0.55;
  }
}

// Places de détente stables
const occupation = new Map(); // index place -> id
function cibleDe(p) {
  if (p.b.etat !== 'libre') { for (const [k, v] of occupation) if (v === p.b.id) occupation.delete(k); return plan.postes.get(p.b.id); }
  for (const [k, v] of occupation) if (v === p.b.id) return plan.places[k];
  for (let k = 0; k < plan.places.length; k++) if (!occupation.has(k)) { occupation.set(k, p.b.id); return plan.places[k]; }
  return plan.places[0];
}
function allerA(p, cible, instant) {
  const ancienne = p.place;
  p.place = cible;
  if (instant || !ancienne) { p.g.position.set(cible.x, 0, cible.z); p.chemin = []; return; }
  if (ancienne === cible) return;
  const pts = [...(ancienne.chemin || [])].reverse().map(([x, z]) => new THREE.Vector3(x, 0, z));
  for (const [x, z] of cible.chemin || []) pts.push(new THREE.Vector3(x, 0, z));
  pts.push(new THREE.Vector3(cible.x, 0, cible.z));
  p.chemin = pts;
}

// ---------- Données ----------
let donnees = null;
const activite = [];
function ajouterActivite(heure, texte) { activite.unshift({ heure, texte }); activite.length = Math.min(activite.length, 14); rendreActivite(); }
function rendreActivite() {
  const ul = document.getElementById('liste-activite'); ul.replaceChildren();
  for (const a of activite) {
    const li = document.createElement('li'); const t = document.createElement('time');
    const d = new Date(a.heure); t.textContent = isNaN(d) ? '' : fmtHeure.format(d); t.dateTime = a.heure;
    const s = document.createElement('span'); s.textContent = a.texte; li.append(t, s); ul.append(li);
  }
}
function phrase(p, e) {
  return e === 'occupe' ? `${p.court} : ${(p.b.tache || 'travail').toLowerCase()} en cours` : e === 'attend' ? `${p.court} attend une réponse de Guy` : `${p.court} est passé en pause`;
}

function appliquer(data, { premier = false } = {}) {
  donnees = data;
  const bots = (data.bots || []).filter((b) => b && b.id);
  const ids = bots.map((b) => b.id).join('|');
  if (!plan || plan.ids !== ids) {
    for (const p of persos.values()) { p.el.remove(); scene.remove(p.g); }
    persos.clear(); occupation.clear();
    construire(bots);
  }
  bots.forEach((b, i) => {
    let p = persos.get(b.id); const neuf = !p;
    if (neuf) { p = creerPerso(b, i, nomCourt(b, bots)); persos.set(b.id, p); }
    const avant = p.b.etat; p.b = b;
    if (!neuf && avant !== b.etat && !premier) ajouterActivite(new Date().toISOString(), phrase(p, b.etat));
    majPerso(p); allerA(p, cibleDe(p), neuf);
  });
  if (premier && Array.isArray(data.activite)) { activite.length = 0; for (const a of data.activite.slice(0, 14)) activite.push(a); rendreActivite(); }
  majInterface(bots);
}
function majInterface(bots) {
  const c = { occupe: 0, attend: 0, libre: 0 };
  for (const b of bots) c[b.etat in c ? b.etat : 'libre']++;
  document.getElementById('c-occupe').textContent = c.occupe;
  document.getElementById('c-attend').textContent = c.attend;
  document.getElementById('c-libre').textContent = c.libre;
  document.getElementById('c-bureaux').textContent = c.libre;
  document.getElementById('nb-bots').textContent = bots.length + ' bots';
  const d = new Date(donnees.maj);
  document.getElementById('maj').textContent = sim ? 'Simulation' : isNaN(d) ? '' : 'maj ' + fmtHeure.format(d) + ' (Toronto)';
  dessinerStats(c);
  const ul = document.getElementById('liste-equipe'); ul.replaceChildren();
  for (const b of bots) {
    const p = persos.get(b.id); const e = b.etat in COUL_ETAT ? b.etat : 'libre';
    const li = document.createElement('li'); li.tabIndex = 0; li.setAttribute('role', 'button');
    li.innerHTML = '<span class="av"></span><span class="nm"></span><span class="st"><span class="pt"></span><span class="et"></span></span><span class="tc"></span>';
    li.querySelector('.av').style.background = p.coul;
    li.querySelector('.nm').textContent = p.court;
    const sm = document.createElement('small'); sm.textContent = b.equipe || ''; li.querySelector('.nm').append(sm);
    li.querySelector('.pt').className = 'pt ' + e;
    li.querySelector('.et').textContent = NOM_ETAT[e];
    li.querySelector('.tc').textContent = e === 'libre' ? 'En pause' : (b.tache || '—');
    const ouvrir = () => ouvrirFiche(b.id);
    li.addEventListener('click', ouvrir); li.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ouvrir(); } });
    ul.append(li);
  }
  vue.classList.toggle('cell-libres-cachees', estCell());
  if (ficheId) ouvrirFiche(ficheId);
}

async function charger(premier = false) {
  if (sim) return;
  const err = document.getElementById('erreur');
  try {
    const r = await fetch('status.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    appliquer(await r.json(), { premier });
    err.hidden = true;
  } catch {
    err.textContent = 'Statut introuvable pour l’instant, nouvel essai dans 1 min.'; err.hidden = false;
  }
}

// ---------- Simulation locale ----------
let sim = null;
const btnSim = document.getElementById('btn-sim');
function pasSim() {
  if (!donnees) return;
  const data = structuredClone(donnees);
  for (let k = 0; k < 2; k++) {
    const b = data.bots[Math.floor(Math.random() * data.bots.length)];
    const r = Math.random();
    if (b.etat === 'libre') { b.etat = r < 0.85 ? 'occupe' : 'attend'; b.tache = b.etat === 'attend' ? 'Validation' : TACHES[Math.floor(Math.random() * TACHES.length)]; }
    else if (b.etat === 'occupe') { b.etat = r < 0.7 ? 'libre' : 'attend'; b.tache = b.etat === 'attend' ? 'Validation' : ''; }
    else { b.etat = 'occupe'; b.tache = TACHES[Math.floor(Math.random() * TACHES.length)]; }
  }
  appliquer(data);
}
btnSim.addEventListener('click', () => {
  if (sim) { clearInterval(sim); sim = null; btnSim.textContent = '▶ Simulation'; btnSim.setAttribute('aria-pressed', 'false'); document.getElementById('badge-mode').textContent = 'En direct'; charger(); }
  else { sim = setInterval(pasSim, 3500); pasSim(); btnSim.textContent = '■ Arrêter'; btnSim.setAttribute('aria-pressed', 'true'); document.getElementById('badge-mode').textContent = 'Simulation'; }
});

// ---------- Fiche ----------
let ficheId = null;
const fiche = document.getElementById('fiche');
function ouvrirFiche(id) {
  const p = persos.get(id); if (!p) return fermerFiche();
  ficheId = id; const e = p.b.etat in COUL_ETAT ? p.b.etat : 'libre';
  document.getElementById('fiche-nom').textContent = p.b.nom;
  document.getElementById('fiche-equipe').textContent = 'Équipe ' + (p.b.equipe || '—');
  const et = document.getElementById('fiche-etat');
  et.innerHTML = '<span class="pt ' + e + '"></span>'; et.append(NOM_ETAT[e]);
  document.getElementById('fiche-tache').textContent = e === 'libre' ? 'En pause, zone détente' : 'Tâche : ' + (p.b.tache || '—');
  fiche.hidden = false;
}
function fermerFiche() { ficheId = null; fiche.hidden = true; }
document.getElementById('fiche-fermer').addEventListener('click', fermerFiche);
addEventListener('keydown', (e) => { if (e.key === 'Escape') fermerFiche(); });
const ray = new THREE.Raycaster(), souris = new THREE.Vector2();
let dep = null;
renderer.domElement.addEventListener('pointerdown', (e) => { dep = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!dep || Math.hypot(e.clientX - dep[0], e.clientY - dep[1]) > 8) return;
  const r = renderer.domElement.getBoundingClientRect();
  souris.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(souris, camera);
  const hit = ray.intersectObjects([...persos.values()].map((p) => p.g), true)[0];
  hit ? ouvrirFiche(hit.object.userData.botId) : fermerFiche();
});

// ---------- Caméra ----------
function cadrer() {
  if (!plan) return;
  const w = conteneur.clientWidth || 1, h = conteneur.clientHeight || 1, aspect = w / h;
  const cible = new THREE.Vector3(plan.W / 2, 0.8, plan.D / 2);
  const dir = new THREE.Vector3(1, 1.02, 1.08).normalize();
  camera.position.copy(cible).addScaledVector(dir, 90); camera.up.set(0, 1, 0); camera.lookAt(cible);
  camera.zoom = 1; camera.updateMatrixWorld();
  const inv = camera.matrixWorldInverse; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const x of [0, plan.W]) for (const y of [-0.5, H]) for (const z of [0, plan.D]) {
    const v = new THREE.Vector3(x, y, z).applyMatrix4(inv); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
  }
  const cell = estCell();
  const haut = cell ? 112 : 92, bas = cell ? 6 : 70, gauche = cell ? 16 : 10, droite = cell ? 16 : 10; // marges en px pour l'interface
  const sx = (x1 - x0) / Math.max(1, w - gauche - droite), sy = (y1 - y0) / Math.max(1, h - haut - bas);
  const s = Math.max(sx, sy);
  const cx = (x0 + x1) / 2 + s * (droite - gauche) / 2, cy = (y0 + y1) / 2 + s * (haut - bas) / 2;
  camera.left = cx - (w / 2) * s; camera.right = cx + (w / 2) * s; camera.top = cy + (h / 2) * s; camera.bottom = cy - (h / 2) * s;
  camera.updateProjectionMatrix();
  controls.target.copy(cible); controls.update();
}
function redim() {
  const w = conteneur.clientWidth, h = conteneur.clientHeight;
  renderer.setSize(w, h); labels.setSize(w, h); cadrer();
  vue.classList.toggle('cell-libres-cachees', estCell());
}
new ResizeObserver(redim).observe(conteneur);
if (estCell()) document.getElementById('d-activite').open = false;

// ---------- Boucle ----------
const horloge = new THREE.Clock(); const tmp = new THREE.Vector3();
let dernierMin = -1;
renderer.setAnimationLoop(() => {
  const dt = Math.min(horloge.getDelta(), 0.1), t = horloge.elapsedTime;
  for (const p of persos.values()) {
    const g = p.g;
    if (p.chemin.length) {
      const c = p.chemin[0]; tmp.subVectors(c, g.position); tmp.y = 0; const d = tmp.length();
      if (d < 0.05) { p.chemin.shift(); continue; }
      g.position.addScaledVector(tmp.normalize(), Math.min(d, VITESSE * dt));
      g.rotation.y = Math.atan2(tmp.x, tmp.z);
      const s = Math.sin(t * 11 + p.phase);
      p.jambes[0].rotation.x = s * 0.6; p.jambes[1].rotation.x = -s * 0.6;
      p.bras[0].rotation.x = -s * 0.5; p.bras[1].rotation.x = s * 0.5;
      g.position.y = Math.abs(s) * 0.06; p.torse.position.y = 0.36; p.hanche.position.y = 0.36;
      p.haloSol.visible = false;
    } else if (p.place) {
      const pl = p.place, assis = pl.assis;
      g.rotation.y = pl.rot; g.position.y = assis ? (pl.h ?? 0.08) : 0;
      p.jambes.forEach((j) => { j.rotation.x = assis ? -1.45 : 0; });
      const actif = p.b.etat !== 'libre';
      const tape = actif && p.b.etat === 'occupe' ? Math.sin(t * 14 + p.phase) * 0.12 : 0;
      p.bras[0].rotation.x = assis ? -1.1 + tape : 0; p.bras[1].rotation.x = assis ? -1.1 - tape : 0;
      p.torse.position.y = 0.36 + Math.sin(t * 2 + p.phase) * 0.012;
      p.etq.position.y = pl.etqY || 1.85;
      p.haloSol.visible = actif && !!plan.postes.get(p.b.id) && pl === plan.postes.get(p.b.id);
      p.haloSol.material.color.set(p.b.etat === 'attend' ? '#ff9f43' : p.coul);
      p.haloSol.material.opacity = (ambActive === 'nuit' ? 0.95 : 0.6) + Math.sin(t * 3 + p.phase) * 0.1;
      if (p.b.etat === 'attend') p.boule.scale.setScalar(1 + Math.abs(Math.sin(t * 4)) * 0.6); else p.boule.scale.setScalar(1);
    }
  }
  if (plan) { plan.leds.forEach((l, i) => { l.visible = Math.sin(t * 3 + i * 1.7) > -0.6; }); const m = new Date().getMinutes(); if (m !== dernierMin) { dernierMin = m; dessinerHorloge(); if (choixAmb === 'maintenant') { const a = ambianceCourante(); if (a !== ambActive) appliquerAmbiance(a); } } }
  controls.update();
  renderer.render(scene, camera);
  labels.render(scene, camera);
});

charger(true);
setInterval(() => charger(), INTERVALLE_MS);
window.__bureau = { appliquer, persos, camera, ambiance: (n) => { choixAmb = n; appliquerAmbiance(ambianceCourante()); }, pasSim };
