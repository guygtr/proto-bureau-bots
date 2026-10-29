// Station spatiale GTR — v3. Three.js vendorisé, aucune build.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/CSS2DRenderer.js';

const INTERVALLE_MS = 60_000;
const VITESSE = 3.2;
const COUL_ETAT = { occupe: '#8b7bff', attend: '#ff9f43', libre: '#a7b0c0' };
const NOM_ETAT = { occupe: 'Au travail', attend: 'Attend Guy', libre: 'Libre' };
const PALETTE = ['#4f7dff', '#ffd23f', '#ff7a2f', '#2ec4d6', '#34c759', '#c7ccd8', '#ff5fa2', '#9b6bff', '#00c2a8', '#ff4d4d', '#7bd389', '#f5a524', '#5ac8fa', '#c084fc', '#e2725b', '#4ade80', '#60a5fa', '#facc15', '#fb7185', '#a3e635', '#22d3ee', '#f97316'];
const COUL_EQUIPE = ['#ffcc66', '#3ddc97', '#4cc3ff', '#ff5fa2', '#b18cff', '#ff8a5c', '#e0e86b', '#5eead4'];
const TACHES = ['Recherche', 'Veille', 'Analyse', 'Rédaction', 'Mise à jour'];
const tz = 'America/Toronto';
const fmtHeure = new Intl.DateTimeFormat('fr-CA', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

const conteneur = document.getElementById('scene');
const vue = document.querySelector('.vue');
const estCell = () => matchMedia('(max-width:860px)').matches;
const forme = () => (conteneur.clientWidth < conteneur.clientHeight * 0.9 ? 'portrait' : 'paysage');

// ---------- Rendu ----------
const params = new URLSearchParams(location.search);
const mobile = matchMedia('(max-width:860px), (pointer:coarse)').matches;
function avis(msg, duree = 0) {
  let el = document.getElementById('avis-3d');
  if (!el) { el = document.createElement('p'); el.id = 'avis-3d'; el.className = 'avis'; document.querySelector('.vue').append(el); }
  el.textContent = msg; console.info('[3D]', msg);
  clearTimeout(avis.t); if (duree) avis.t = setTimeout(() => el.remove(), duree);
}
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: !mobile, powerPreference: 'default' });
} catch (e) {
  avis('La 3D (WebGL) n’est pas disponible sur cet appareil. Les états restent visibles dans le panneau.');
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
renderer.setClearColor('#02030a', 1);
let terreSimple = false;
renderer.debug.onShaderError = (gl, prog, vs, fs) => {
  avis('Shader non pris en charge : Terre simplifiée.', 8000);
  if (!terreSimple) setTimeout(() => passerTerreSimple('erreur de shader'), 0);
};
renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); avis('Contexte 3D perdu — rechargez la page.'); });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
conteneur.appendChild(renderer.domElement);
const labels = new CSS2DRenderer();
labels.domElement.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none';
conteneur.appendChild(labels.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#02030a');
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 2000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.minDistance = 6; controls.maxDistance = 120; controls.maxPolarAngle = Math.PI * 0.62;

const hemi = new THREE.HemisphereLight('#9fb7ff', '#1b4f8f', 0.55); scene.add(hemi);
const soleil = new THREE.DirectionalLight('#fff4e0', 3.0);
soleil.castShadow = true; soleil.shadow.mapSize.set(2048, 2048);
soleil.shadow.bias = -0.0005; soleil.shadow.normalBias = 0.04;
Object.assign(soleil.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 120 });
scene.add(soleil, soleil.target);
const dirSoleil = new THREE.Vector3();

// ---------- Utilitaires ----------
const cacheMat = new Map();
const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!cacheMat.has(k)) cacheMat.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.15, ...o })); return cacheMat.get(k); };
function mesh(parent, geo, m, x = 0, y = 0, z = 0, ombre = true) {
  const o = new THREE.Mesh(geo, typeof m === 'string' ? mat(m) : m); o.position.set(x, y, z);
  o.castShadow = ombre; o.receiveShadow = true; parent.add(o); return o;
}
const lum = (c) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
const texHalo = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.3, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
})();
const sprite = (coul, taille, opac = 0.9) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texHalo, color: coul, transparent: true, opacity: opac, blending: THREE.AdditiveBlending, depthWrite: false })); s.scale.setScalar(taille); return s; };
const segments = (nom) => nom.split(/\s[·–-]\s/).map((x) => x.trim()).filter(Boolean);
function nomCourt(b, tous) {
  if (b.court) return b.court;
  const s = segments(b.nom); const dup = tous.filter((o) => segments(o.nom)[0] === s[0]).length > 1;
  return dup && s[1] ? s[1] : s[0] || b.id;
}

// ---------- Ciel étoilé ----------
{
  const n = 2600, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, r = 900;
    const s = Math.sqrt(1 - u * u); pos.set([r * s * Math.cos(t), r * u, r * s * Math.sin(t)], i * 3);
    const k = 0.55 + Math.random() * 0.45, teinte = Math.random();
    col.set(teinte < 0.15 ? [k, k * 0.85, k * 0.7] : teinte < 0.3 ? [k * 0.75, k * 0.85, k] : [k, k, k], i * 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, map: texHalo, transparent: true, depthWrite: false })));
}

// ---------- Terre procédurale (shader : continents, nuages, terminateur, lumières des villes) ----------
const RT = 230, terre = new THREE.Group();
terre.position.set(0, -RT - 34, -40);
scene.add(terre);
const uniTerre = { soleilDir: { value: dirSoleil }, temps: { value: 0 } };
const matTerre = new THREE.ShaderMaterial({
  uniforms: uniTerre,
  defines: { OCT: mobile ? 5 : 7 },
  vertexShader: `varying vec3 vP; varying vec3 vN; varying vec3 vW;
    void main(){ vP=position; vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
  fragmentShader: `uniform vec3 soleilDir; uniform float temps; varying vec3 vP; varying vec3 vN; varying vec3 vW;
    float hash(vec3 p){ p=fract(p*0.1031); p+=dot(p,p.yzx+19.19); return fract((p.x+p.y)*p.z); }
    float bruit(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.-2.*f);
      return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                 mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
    float fbm(vec3 p){ float s=0., a=.5; for(int i=0;i<OCT;i++){ s+=a*bruit(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=.5; } return s/(1.-pow(.5,float(OCT))); }
    void main(){
      vec3 p=normalize(vP); vec3 N=normalize(vN); vec3 L=normalize(soleilDir); vec3 V=normalize(cameraPosition-vW);
      float h=fbm(p*2.4);
      float terre=smoothstep(0.555,0.565,h);
      float sec=fbm(p*5.+40.);
      float desert=smoothstep(0.45,0.7,sec+(0.3-abs(p.y))*0.7);
      vec3 cTerre=mix(vec3(0.13,0.30,0.11),vec3(0.70,0.58,0.36),desert)*(0.85+0.3*fbm(p*20.));
      vec3 cMer=mix(vec3(0.01,0.07,0.22),vec3(0.03,0.26,0.45),smoothstep(0.40,0.56,h));
      float glace=smoothstep(0.86,0.93,abs(p.y)+(h-0.5)*0.25);
      vec3 col=mix(mix(cMer,cTerre,terre),vec3(0.9,0.93,0.96),glace);
      float d=dot(N,L); float t=smoothstep(-0.12,0.16,d);
      float nu=smoothstep(0.53,0.72,fbm(p*3.1+vec3(temps*0.004,0.,temps*0.002)));
      float spec=pow(max(dot(reflect(-L,N),V),0.),30.)*(1.-terre)*(1.-nu)*0.55;
      vec3 jour=col*(0.05+1.05*max(d,0.))+vec3(1.,.95,.85)*spec*max(d,0.);
      jour=mix(jour,vec3(1.)*(0.06+0.95*max(d,0.)),nu*0.88);
      float zone=smoothstep(0.5,0.66,fbm(p*9.+7.));
      float villes=terre*(1.-glace)*zone*(0.55*smoothstep(0.58,0.78,fbm(p*140.+1.))+0.18*smoothstep(0.52,0.7,fbm(p*35.+3.)));
      vec3 nuit=vec3(1.,.72,.38)*villes*1.3*(1.-nu*0.85)+col*0.015;
      gl_FragColor=vec4(clamp(mix(nuit,jour,t),0.,1.),1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
const globe = new THREE.Mesh(new THREE.SphereGeometry(RT, mobile ? 72 : 128, mobile ? 48 : 96), matTerre); terre.add(globe);
// Repli : Terre simple (couleurs + éclairage standard) si le shader échoue ou rend du blanc
function passerTerreSimple(raison) {
  if (terreSimple) return; terreSimple = true;
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#dfe8f0'); gr.addColorStop(0.12, '#1d5a8c'); gr.addColorStop(0.5, '#0f4a7a'); gr.addColorStop(0.88, '#1d5a8c'); gr.addColorStop(1, '#dfe8f0');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
  let s0 = 11; const r = () => (s0 = (s0 * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 26; i++) { g.fillStyle = r() < 0.5 ? '#3f6b35' : '#a8925c'; g.beginPath(); g.ellipse(r() * 256, 20 + r() * 88, 8 + r() * 26, 5 + r() * 14, r() * 3, 0, 7); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 40; i++) { g.beginPath(); g.ellipse(r() * 256, r() * 128, 6 + r() * 20, 2 + r() * 5, 0, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  globe.material = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, metalness: 0 });
  atmo.visible = false;
  if (params.has('debug') || raison !== 'test') avis('Mode compatibilité : Terre simplifiée (' + raison + ').', 8000);
}
const atmo = new THREE.Mesh(new THREE.SphereGeometry(RT * 1.05, 64, 48), new THREE.ShaderMaterial({
  uniforms: { soleilDir: { value: dirSoleil } }, side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
  vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vN=normalize(normalMatrix*normal); vW=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform vec3 soleilDir; varying vec3 vN; varying vec3 vW; void main(){ float i=pow(max(0.72-dot(vN,vec3(0,0,1.)),0.),3.2); float j=0.35+0.65*smoothstep(-0.4,0.4,dot(-vW,normalize(soleilDir)));
    gl_FragColor=vec4(clamp(vec3(0.3,0.6,1.0)*i*j*1.6,0.,1.),1.); }`,
}));
terre.add(atmo);
terre.rotation.set(1.25, 0, 0.2); // on survole les tropiques, pas le pôle

// ---------- Robots-astronautes ----------
const persos = new Map();
function creerPerso(b, i, court) {
  const coul = new THREE.Color(b.couleur || PALETTE[i % PALETTE.length]);
  const hex = '#' + coul.getHexString();
  const g = new THREE.Group();
  const corps = new THREE.Group(); g.add(corps);
  const blanc = mat('#eef1f6', { roughness: 0.35 }), gris = mat('#7d8696', { roughness: 0.5, metalness: 0.4 });
  // combinaison arrondie
  mesh(corps, new THREE.CapsuleGeometry(0.24, 0.26, 6, 14), blanc, 0, -0.1, 0);
  mesh(corps, new THREE.BoxGeometry(0.3, 0.38, 0.18), gris, 0, -0.04, -0.22); // sac à dos
  mesh(corps, new THREE.CylinderGeometry(0.05, 0.07, 0.1, 10), gris, -0.09, -0.29, -0.24);
  mesh(corps, new THREE.CylinderGeometry(0.05, 0.07, 0.1, 10), gris, 0.09, -0.29, -0.24);
  const flammes = [-0.09, 0.09].map((x) => { const f = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.28, 10), new THREE.MeshBasicMaterial({ color: '#7fd7ff', transparent: true, opacity: 0.85, toneMapped: false })); f.rotation.x = Math.PI; f.position.set(x, -0.46, -0.24); corps.add(f); return f; });
  const plastron = mesh(corps, new THREE.BoxGeometry(0.2, 0.12, 0.04), lum(COUL_ETAT[b.etat] || '#ccc'), 0, -0.02, 0.235, false);
  mesh(corps, new THREE.TorusGeometry(0.2, 0.035, 8, 24), mat(hex, { roughness: 0.4 }), 0, 0.17, 0).rotation.x = Math.PI / 2;
  const bras = [-1, 1].map((s) => { const a = new THREE.Group(); a.position.set(s * 0.27, 0.06, 0); mesh(a, new THREE.CapsuleGeometry(0.075, 0.2, 4, 8), blanc, 0, -0.13, 0); mesh(a, new THREE.SphereGeometry(0.075, 10, 8), mat(hex), 0, -0.3, 0); corps.add(a); return a; });
  const jambes = [-1, 1].map((s) => { const j = new THREE.Group(); j.position.set(s * 0.11, -0.3, 0); mesh(j, new THREE.CapsuleGeometry(0.08, 0.14, 4, 8), blanc, 0, -0.1, 0); corps.add(j); return j; });
  // casque bulle + visière colorée
  const tete = new THREE.Group(); tete.position.y = 0.42; corps.add(tete);
  mesh(tete, new THREE.SphereGeometry(0.3, 24, 18), blanc, 0, 0, 0);
  const visiere = mesh(tete, new THREE.SphereGeometry(0.305, 24, 18, -Math.PI * 0.32, Math.PI * 0.64, Math.PI * 0.28, Math.PI * 0.42),
    new THREE.MeshStandardMaterial({ color: coul.clone().multiplyScalar(0.5), emissive: coul, emissiveIntensity: 0.35, roughness: 0.08, metalness: 0.9 }), 0, 0, 0, false);
  visiere.rotation.y = 0;
  const reflet = mesh(tete, new THREE.SphereGeometry(0.05, 8, 6), lum('#ffffff'), -0.1, 0.08, 0.27, false); reflet.scale.set(1, 0.5, 0.3);
  mesh(tete, new THREE.CylinderGeometry(0.012, 0.012, 0.2, 6), gris, 0.14, 0.32, -0.05);
  const balise = mesh(tete, new THREE.SphereGeometry(0.045, 10, 8), lum(COUL_ETAT[b.etat] || '#ccc'), 0.14, 0.44, -0.05, false);
  // signal « attend Guy » : anneaux qui pulsent
  const signal = new THREE.Group(); signal.position.set(0.14, 0.86, -0.05);
  const anneaux = [0, 1].map(() => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.02, 6, 32), new THREE.MeshBasicMaterial({ color: '#ff9f43', transparent: true, toneMapped: false, depthWrite: false })); signal.add(r); return r; });
  const lueurSignal = sprite('#ff9f43', 1.1, 0.8); signal.add(lueurSignal); signal.visible = false; g.add(signal);
  const aura = sprite(hex, 2.0, 0.35); aura.position.set(0, -0.1, 0.2); g.add(aura);
  // étiquette
  const el = document.createElement('div'); el.className = 'etq';
  el.innerHTML = '<span class="in"><span class="pt"></span><span class="n"></span></span>';
  el.querySelector('.n').textContent = court;
  const etq = new CSS2DObject(el); etq.position.y = 1.15; g.add(etq);
  g.traverse((o) => { o.userData.botId = b.id; });
  scene.add(g);
  return { b, g, corps, bras, jambes, flammes, plastron, balise, signal, anneaux, aura, etq, el, inner: el.firstChild, coul: hex, court, chemin: [], place: null, phase: i * 0.83, vol: 0 };
}
function majPerso(p) {
  const e = p.b.etat in COUL_ETAT ? p.b.etat : 'libre';
  p.plastron.material.color.set(COUL_ETAT[e]); p.balise.material.color.set(COUL_ETAT[e]);
  p.el.querySelector('.pt').className = 'pt ' + e;
  p.el.dataset.etat = e;
  p.signal.visible = e === 'attend';
  const poste = plan.postes.get(p.b.id);
  if (poste) {
    const actif = e !== 'libre';
    poste.ecran.material.color.set(actif ? (e === 'attend' ? '#ffb36b' : '#8fc3ff') : '#121722');
    poste.lueur.visible = actif; poste.lueur.material.color.set(e === 'attend' ? '#ff9f43' : '#6fa8ff');
  }
}

// ---------- Station ----------
let station = new THREE.Group(); scene.add(station);
let plan = null;
const lumieresInt = [];
function etiquetteModule(txt, coul) {
  const el = document.createElement('div'); el.className = 'mod';
  el.innerHTML = '<span class="in"></span>'; el.firstChild.textContent = txt; el.style.setProperty('--c', coul);
  return new CSS2DObject(el);
}
function panneauSolaire(parent, longueur, largeur) {
  const g = new THREE.Group();
  const c = document.createElement('canvas'); c.width = 128; c.height = 512; const x = c.getContext('2d');
  x.fillStyle = '#0c1d4a'; x.fillRect(0, 0, 128, 512);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 16; j++) { x.fillStyle = (i + j) % 2 ? '#1a3a8c' : '#16337d'; x.fillRect(4 + i * 31, 4 + j * 31.7, 28, 28.5); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshStandardMaterial({ map: t, metalness: 0.6, roughness: 0.25, side: THREE.DoubleSide });
  const p = mesh(g, new THREE.BoxGeometry(largeur, 0.04, longueur), m, 0, 0, 0);
  mesh(g, new THREE.BoxGeometry(largeur + 0.08, 0.06, 0.06), '#c9a24a', 0, 0, longueur / 2);
  mesh(g, new THREE.BoxGeometry(largeur + 0.08, 0.06, 0.06), '#c9a24a', 0, 0, -longueur / 2);
  parent.add(g); return g;
}
function treillis(parent, a, b, rayon = 0.18) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.Group(); g.position.copy(a); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.clone().normalize());
  const m = mat('#b9c0cc', { metalness: 0.6, roughness: 0.4 });
  for (const [x, y] of [[-rayon, -rayon], [rayon, -rayon], [0, rayon]]) mesh(g, new THREE.BoxGeometry(0.05, 0.05, L), m, x, y, L / 2);
  const n = Math.max(2, Math.round(L / 0.7));
  for (let i = 0; i <= n; i++) { const z = (i / n) * L; const r = mesh(g, new THREE.TorusGeometry(rayon * 1.05, 0.02, 4, 3), m, 0, 0, z, false); r.rotation.z = Math.PI / 6; }
  parent.add(g);
}

function construire(bots) {
  scene.remove(station);
  station.traverse((o) => { if (o.element) o.element.remove(); });
  station = new THREE.Group(); scene.add(station);
  lumieresInt.length = 0;
  const f = forme();
  const sx = f === 'portrait' ? 0.8 : 1.3, sz = f === 'portrait' ? 1.95 : 1.0;

  const equipes = [];
  for (const b of bots) {
    const n = b.equipe || 'Module';
    let e = equipes.find((x) => x.nom === n);
    if (!e) { e = { nom: n, bots: [], coul: COUL_EQUIPE[equipes.length % COUL_EQUIPE.length] }; equipes.push(e); }
    e.bots.push(b);
  }
  // Direction (passerelle de commandement) devant, face à la caméra
  const iDir = equipes.findIndex((e) => /^direction$/i.test(e.nom));
  if (iDir > 0) equipes.unshift(...equipes.splice(iDir, 1));

  // --- Moyeu central + cupole d'observation ---
  const RH = 3.3;
  const coque = mat('#e9edf3', { roughness: 0.45, metalness: 0.25 });
  const coqueInt = new THREE.MeshStandardMaterial({ color: '#c9d1dd', roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide });
  mesh(station, new THREE.CylinderGeometry(RH, RH * 0.92, 1.0, 48), coque, 0, -0.5, 0);
  mesh(station, new THREE.CylinderGeometry(RH * 0.95, RH * 0.95, 0.06, 48), mat('#2a3242', { roughness: 0.8 }), 0, 0.02, 0);
  const anneau = mesh(station, new THREE.TorusGeometry(RH, 0.12, 10, 64), mat('#9aa6b8', { metalness: 0.7, roughness: 0.3 }), 0, 0.02, 0); anneau.rotation.x = Math.PI / 2;
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; mesh(station, new THREE.SphereGeometry(0.05, 6, 4), lum('#7fe3ff'), Math.cos(a) * RH, 0.1, Math.sin(a) * RH, false); }
  const dome = new THREE.Mesh(new THREE.SphereGeometry(RH * 0.97, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#bfe6ff', transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0, side: THREE.DoubleSide, depthWrite: false }));
  station.add(dome);
  for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.TorusGeometry(RH * 0.97, 0.035, 6, 48, Math.PI), mat('#8a95a8', { metalness: 0.6 })); m.rotation.y = i / 6 * Math.PI; station.add(m); }
  const lumHub = new THREE.PointLight('#bfe0ff', 6, 9, 1.5); lumHub.position.set(0, 2.2, 0); station.add(lumHub); lumieresInt.push(lumHub);
  { const sp = sprite('#7fd0ff', 5, 0.25); sp.position.set(0, 0.3, 0); station.add(sp); }
  const hubTag = etiquetteModule('Cupole · détente', '#7fe3ff'); hubTag.position.set(0, RH + 0.5, 0); station.add(hubTag);

  // Places libres dans la cupole
  const places = [];
  const anneauxPl = [[1.25, 1.0, 6, 0], [2.35, 0.75, 9, 0.3], [1.35, 2.25, 4, 0.8], [0, 1.6, 1, 0]];
  for (const [r, y, n, d] of anneauxPl) for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + d; places.push({ x: Math.cos(a) * r, y, z: Math.sin(a) * r, rot: a + Math.PI / 2, flotte: true, chemin: [] }); }
  // ordre de remplissage alterné entre anneaux
  const ordre = []; const tmpP = [...places]; while (tmpP.length) { ordre.push(tmpP.shift()); if (tmpP.length > 6) ordre.push(tmpP.splice(5, 1)[0]); }
  places.length = 0; places.push(...ordre);

  // --- Modules d'équipe ---
  const R = 1.55, postes = new Map(), modules = [];
  const n = equipes.length;
  equipes.forEach((e, i) => {
    const a = Math.PI / 2 + (i / n) * Math.PI * 2; // 1er module devant (+z)
    const nb = e.bots.length, parCote = Math.ceil(nb / 2);
    const L = Math.max(4.2, parCote * 1.75 + 1.5);
    const u0 = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const echelle = Math.hypot(u0.x * sx, u0.z * sz);
    const dist = (RH + 1.6 + L / 2) * echelle;
    const c = new THREE.Vector3(u0.x * sx, 0, u0.z * sz).normalize().multiplyScalar(dist);
    const u = c.clone().normalize();
    const commande = i === 0 && /^direction$/i.test(e.nom);
    const g = new THREE.Group(); g.position.set(c.x, -0.1, c.z); g.rotation.y = -Math.atan2(u.z, u.x); station.add(g);
    // coque en coupe : moitié basse opaque, haut vitré
    const ouv = 0.45;
    mesh(g, new THREE.CylinderGeometry(R, R, L, 40, 1, true, Math.PI - ouv, Math.PI + 2 * ouv), coqueInt, 0, 0, 0).rotation.z = Math.PI / 2;
    const verre = new THREE.Mesh(new THREE.CylinderGeometry(R, R, L, 40, 1, true, ouv, Math.PI - 2 * ouv), new THREE.MeshPhysicalMaterial({ color: '#cdeeff', transparent: true, opacity: 0.1, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false }));
    verre.rotation.z = Math.PI / 2; g.add(verre);
    for (const s of [-1, 1]) {
      const r = mesh(g, new THREE.TorusGeometry(R + 0.04, 0.09, 8, 40), lum(e.coul), s * L / 2, 0, 0, false); r.rotation.y = Math.PI / 2;
      for (let k = 1; k < 3; k++) { const nerv = mesh(g, new THREE.TorusGeometry(R + 0.02, 0.05, 6, 40, Math.PI + 2 * ouv), mat('#aab3c2', { metalness: 0.5 }), s * (L / 2) * (k / 3), 0, 0, false); nerv.rotation.set(0, Math.PI / 2, Math.PI / 2 - ouv - Math.PI / 2 + Math.PI); }
    }
    // embout extérieur (dôme pour la passerelle)
    if (commande) {
      const nez = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#ffe7b0', transparent: true, opacity: 0.16, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false }));
      nez.rotation.z = -Math.PI / 2; nez.position.x = L / 2; g.add(nez);
      mesh(g, new THREE.BoxGeometry(0.1, 0.9, 1.8), lum('#ffcc66'), L / 2 + 0.6, -0.4, 0, false).rotation.z = 0.5;
    } else {
      const fond = mesh(g, new THREE.CircleGeometry(R, 40), coqueInt, L / 2, 0, 0); fond.rotation.y = -Math.PI / 2;
      // panneaux solaires
      const mat0 = new THREE.Group(); mat0.position.set(L / 2 + 0.7, 0, 0); g.add(mat0);
      mesh(mat0, new THREE.CylinderGeometry(0.08, 0.08, 1.4, 8), '#9aa6b8', -0.35, 0, 0).rotation.z = Math.PI / 2;
      mesh(mat0, new THREE.BoxGeometry(0.12, 0.12, 9.2), mat('#c3cad6', { metalness: 0.6 }), 0, 0, 0);
      for (const s of [-1, 1]) { const p = panneauSolaire(mat0, 3.8, 1.5); p.position.set(0, 0.02, s * 2.6); p.rotation.x = 0.12 * s; }
    }
    // plancher + éclairage
    mesh(g, new THREE.BoxGeometry(L - 0.1, 0.06, 2 * Math.sqrt(R * R - 0.95 * 0.95) - 0.05), mat('#3a4456', { roughness: 0.8 }), 0, -0.95, 0);
    mesh(g, new THREE.BoxGeometry(L - 0.4, 0.02, 0.08), lum(e.coul), 0, -0.91, 0, false);
    const li = new THREE.PointLight(e.coul, 4, 6, 1.6); li.position.set(0, 0.6, 0); g.add(li); lumieresInt.push(li);
    // tube + treillis vers le moyeu
    const inner = c.clone().addScaledVector(u, -L / 2), hubP = u.clone().multiplyScalar(RH - 0.1);
    const tl = inner.distanceTo(hubP);
    const tube = mesh(station, new THREE.CylinderGeometry(0.62, 0.62, tl, 24), coque, 0, 0, 0);
    tube.position.copy(hubP.clone().add(inner).multiplyScalar(0.5)).setY(-0.1);
    tube.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), u);
    for (let k = 0; k <= 2; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.05, 6, 24), mat('#9aa6b8', { metalness: 0.6 })); r.position.copy(hubP.clone().lerp(inner, k / 2)).setY(-0.1); r.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), u); station.add(r); }
    const lat = new THREE.Vector3(-u.z, 0, u.x);
    treillis(station, hubP.clone().addScaledVector(lat, 0.9).setY(-0.7), inner.clone().addScaledVector(lat, 0.9).setY(-0.7), 0.14);
    // nom du module
    const tag = etiquetteModule(commande ? e.nom + ' · passerelle' : e.nom, e.coul); tag.position.set(L / 2 - 0.4, R + 0.35, 0); g.add(tag);
    // consoles
    g.updateMatrixWorld(true);
    const portI = new THREE.Vector3(-L / 2 + 0.3, -0.15, 0), hubE = u.clone().multiplyScalar(RH - 0.6).setY(0.5);
    e.bots.forEach((b, k) => {
      const cote = k % 2 ? -1 : 1, slot = Math.floor(k / 2);
      const x = -L / 2 + 1.25 + slot * 1.75;
      const cg = new THREE.Group(); cg.position.set(x, -0.95, cote * 1.02); g.add(cg);
      mesh(cg, new THREE.BoxGeometry(1.15, 0.72, 0.36), mat('#2c3446', { metalness: 0.4 }), 0, 0.36, 0);
      const pupitre = new THREE.Group(); pupitre.position.set(0, 0.92, 0); pupitre.rotation.x = cote * 0.45; cg.add(pupitre);
      mesh(pupitre, new THREE.BoxGeometry(1.1, 0.5, 0.05), mat('#1a1f2b'), 0, 0, 0);
      const ecran = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.42), lum('#121722')); ecran.position.z = -cote * 0.03; ecran.rotation.y = cote > 0 ? Math.PI : 0; pupitre.add(ecran);
      for (let q = 0; q < 4; q++) mesh(cg, new THREE.BoxGeometry(0.08, 0.02, 0.05), lum(['#ff5f5f', '#3ddc97', '#4cc3ff', '#ffd23f'][q]), -0.3 + q * 0.2, 0.73, -cote * 0.12, false);
      const lueur = sprite('#6fa8ff', 1.8, 0.55); lueur.position.set(0, 0.95, -cote * 0.2); cg.add(lueur); lueur.visible = false;
      const pos = g.localToWorld(new THREE.Vector3(x, -0.3, cote * 0.28));
      const face = g.localToWorld(new THREE.Vector3(x, -0.3, cote * 2)).sub(pos);
      const aisle = g.localToWorld(new THREE.Vector3(x, -0.15, 0)), port = g.localToWorld(portI.clone());
      postes.set(b.id, { x: pos.x, y: pos.y, z: pos.z, rot: Math.atan2(face.x, face.z), flotte: false, ecran, lueur, chemin: [[hubE.x, hubE.y, hubE.z], [port.x, port.y, port.z], [aisle.x, aisle.y, aisle.z]] });
    });
    modules.push({ nom: e.nom, bots: e.bots.map((b) => b.id), centre: c, box: new THREE.Box3().setFromObject(g) });
  });
  // Rayon de la station pour le cadrage
  const box = new THREE.Box3().setFromObject(station);
  plan = { postes, places, modules, forme: f, ids: bots.map((b) => b.id).join('|'), box };
  while (places.length < bots.length) places.push({ ...places[places.length % 20], y: places[places.length % 20].y + 0.6 });
  appliquerVue(vueCourante, true);
}

// Places libres stables
const occupation = new Map();
function cibleDe(p) {
  if (p.b.etat !== 'libre') { for (const [k, v] of occupation) if (v === p.b.id) occupation.delete(k); return plan.postes.get(p.b.id); }
  for (const [k, v] of occupation) if (v === p.b.id) return plan.places[k];
  for (let k = 0; k < plan.places.length; k++) if (!occupation.has(k)) { occupation.set(k, p.b.id); return plan.places[k]; }
  return plan.places[0];
}
function allerA(p, cible, instant) {
  const ancienne = p.place; p.place = cible;
  if (instant || !ancienne) { p.g.position.set(cible.x, cible.y, cible.z); p.chemin = []; return; }
  if (ancienne === cible) return;
  const v = ([x, y, z]) => new THREE.Vector3(x, y, z);
  const pts = [...(ancienne.chemin || [])].reverse().map(v);
  pts.push(new THREE.Vector3(0, 1.3, 0));
  for (const c of cible.chemin || []) pts.push(v(c));
  pts.push(new THREE.Vector3(cible.x, cible.y, cible.z));
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
  return e === 'occupe' ? `${p.court} : ${(p.b.tache || 'travail').toLowerCase()} en cours` : e === 'attend' ? `${p.court} attend une réponse de Guy` : `${p.court} rejoint la cupole`;
}

function appliquer(data, { premier = false } = {}) {
  donnees = data;
  const bots = (data.bots || []).filter((b) => b && b.id);
  const ids = bots.map((b) => b.id).join('|');
  if (!plan || plan.ids !== ids || plan.forme !== forme()) {
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
  document.getElementById('c-bureaux').textContent = plan.modules.filter((m) => !m.bots.some((id) => { const b = bots.find((x) => x.id === id); return b && b.etat !== 'libre'; })).length;
  document.getElementById('nb-bots').textContent = bots.length + ' bots';
  const d = new Date(donnees.maj);
  document.getElementById('maj').textContent = sim ? 'Simulation' : isNaN(d) ? '' : 'maj ' + fmtHeure.format(d) + ' (Toronto)';
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
  } catch (ex) {
    console.warn('Chargement du statut :', ex);
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
  document.getElementById('fiche-equipe').textContent = 'Module ' + (p.b.equipe || '—');
  const et = document.getElementById('fiche-etat');
  et.innerHTML = '<span class="pt ' + e + '"></span>'; et.append(NOM_ETAT[e]);
  document.getElementById('fiche-tache').textContent = e === 'libre' ? 'En pause, dans la cupole' : 'Tâche : ' + (p.b.tache || '—');
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

// ---------- Vues d'orbite et éclairage ----------
const deg = Math.PI / 180;
const VUES = {
  ensemble: { elev: 52, az: 0, lum: 'jour' },
  jour: { elev: 20, az: 30, lum: 'jour', k: 0.92 },
  nuit: { elev: 36, az: -34, lum: 'nuit' },
  cupole: { elev: 50, az: 18, lum: null, cupole: true },
};
const LUM = {
  jour: { dir: [0.55, 0.62, 0.55], coul: '#fff4e0', i: 3.0, hemi: 0.55, int: 4, expo: 1.1 },
  nuit: { dir: [-0.45, -0.3, -0.85], coul: '#9fb0ff', i: 1.9, hemi: 1.2, int: 18, expo: 1.35 },
};
let vueCourante = 'ensemble', lumCourante = 'jour';
const anim = { t: 1, de: null, vers: null, cDe: null, cVers: null };
function appliquerLumiere(nom) {
  const l = LUM[nom]; lumCourante = nom;
  dirSoleil.set(...l.dir).normalize();
  soleil.color.set(l.coul); soleil.intensity = l.i; hemi.intensity = l.hemi; renderer.toneMappingExposure = l.expo;
  soleil.position.copy(dirSoleil).multiplyScalar(60); soleil.target.position.set(0, 0, 0);
  for (const li of lumieresInt) li.intensity = l.int;
  hemi.color.set(nom === 'nuit' ? '#b8c6ff' : '#9fb7ff'); hemi.groundColor.set(nom === 'nuit' ? '#3a4f8a' : '#1b4f8f');
  for (const p of persos.values()) p.aura.material.color.set(p.coul);
  if (plan) for (const po of plan.postes.values()) po.lueur.material.opacity = nom === 'nuit' ? 0.85 : 0.55;
  document.body.dataset.orbite = nom;
}
function marges() {
  const cell = estCell();
  return cell ? { h: 118, b: 124, c: 10 } : { h: 96, b: 78, c: 24 };
}
function cadrage(nom) {
  const v = VUES[nom]; const w = conteneur.clientWidth || 1, h = conteneur.clientHeight || 1;
  const m = marges();
  camera.aspect = w / h;
  camera.clearViewOffset();
  camera.updateProjectionMatrix();
  const elev = (v.elev + (plan && plan.forme === 'portrait' && !v.cupole ? 14 : 0)) * deg, az = v.az * deg * (plan && plan.forme === 'portrait' ? 0.25 : 1);
  const dir = new THREE.Vector3(Math.sin(az) * Math.cos(elev), Math.sin(elev), Math.cos(az) * Math.cos(elev));
  const cible = v.cupole ? new THREE.Vector3(0, 1.2, 0) : new THREE.Vector3(0, -0.2, 0);
  const lx = 1 - (2 * m.c) / w;
  const pts = [];
  if (v.cupole) for (const x of [-4.5, 4.5]) for (const y of [-0.5, 3.6]) for (const z of [-4.5, 4.5]) pts.push(new THREE.Vector3(x, y, z));
  else if (plan) for (const mo of plan.modules) { const b = mo.box; for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) pts.push(new THREE.Vector3(x, y, z)); }
  let lo = 4, hi = 300;
  const cam = camera.clone();
  for (let it = 0; it < 26; it++) {
    const d = (lo + hi) / 2; cam.position.copy(cible).addScaledVector(dir, d); cam.lookAt(cible); cam.updateMatrixWorld(); cam.projectionMatrix.copy(camera.projectionMatrix);
    const ok = pts.every((p) => { const q = p.clone().project(cam); return Math.abs(q.x) <= lx && q.y <= 1 - (2 * m.h) / h && q.y >= -1 + (2 * m.b) / h && q.z < 1; });
    ok ? (hi = d) : (lo = d);
  }
  return { pos: cible.clone().addScaledVector(dir, hi * (v.k || 1)), cible };
}
function appliquerVue(nom, instant = false) {
  vueCourante = nom; const v = VUES[nom];
  if (v.lum) appliquerLumiere(v.lum);
  const c = cadrage(nom);
  document.querySelectorAll('.vues button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.vue === nom));
  if (instant) { camera.position.copy(c.pos); controls.target.copy(c.cible); controls.update(); anim.t = 1; return; }
  Object.assign(anim, { t: 0, de: camera.position.clone(), vers: c.pos, cDe: controls.target.clone(), cVers: c.cible });
}
document.querySelectorAll('.vues button').forEach((b) => b.addEventListener('click', () => appliquerVue(b.dataset.vue)));
appliquerLumiere('jour');

function redim() {
  const w = conteneur.clientWidth, h = conteneur.clientHeight;
  renderer.setSize(w, h); labels.setSize(w, h);
  if (donnees && plan && plan.forme !== forme()) appliquer(donnees);
  else if (plan) appliquerVue(vueCourante, true);
}
new ResizeObserver(redim).observe(conteneur);
if (estCell()) document.getElementById('d-activite').open = false;

// ---------- Étiquettes sans chevauchement ----------
const PRIO = { attend: 1, occupe: 2, libre: 3 };
function deChevaucher() {
  const items = [];
  conteneur.querySelectorAll('.mod, .etq').forEach((el) => {
    if (el.style.display === 'none') return;
    const r = el.getBoundingClientRect(); if (!r.width) return;
    items.push({ el, r, p: el.classList.contains('mod') ? 0 : PRIO[el.dataset.etat] || 3 });
  });
  items.sort((a, b) => a.p - b.p || a.r.top - b.r.top);
  const pris = [];
  const touche = (a) => pris.some((b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t);
  for (const it of items) {
    const h = it.r.height + 3; let choisi = null;
    for (const dy of [0, -h, h, -2 * h, 2 * h]) {
      const c = { l: it.r.left - 2, r: it.r.right + 2, t: it.r.top + dy, b: it.r.bottom + dy };
      if (!touche(c)) { choisi = dy; pris.push(c); break; }
    }
    const inn = it.el.firstChild;
    if (choisi === null) inn.style.opacity = '0';
    else { inn.style.opacity = '1'; inn.style.transform = `translateY(${choisi}px)`; }
  }
}

// ---------- Vérification du rendu (écran blanc = shader en échec sur certains GPU mobiles) ----------
let verif = 0;
function verifierImage() {
  if (params.has('simple')) return passerTerreSimple('test');
  const gl = renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(4);
  let blancs = 0, total = 0;
  for (const [fx, fy] of [[0.1, 0.1], [0.9, 0.1], [0.1, 0.9], [0.9, 0.9], [0.5, 0.15], [0.5, 0.85], [0.2, 0.5], [0.8, 0.5]]) {
    gl.readPixels(Math.floor(w * fx), Math.floor(h * fy), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); total++;
    if (px[0] > 245 && px[1] > 245 && px[2] > 245) blancs++;
  }
  if (params.has('forcerBlanc') || blancs >= total - 1) passerTerreSimple('rendu blanc détecté');
}

// ---------- Boucle ----------
const horloge = new THREE.Clock(); const tmp = new THREE.Vector3(); let image = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(horloge.getDelta(), 0.1), t = horloge.elapsedTime;
  globe.rotation.y += dt * 0.004; uniTerre.temps.value = t;
  if (anim.t < 1) {
    anim.t = Math.min(1, anim.t + dt / 1.2); const e = 1 - Math.pow(1 - anim.t, 3);
    camera.position.lerpVectors(anim.de, anim.vers, e); controls.target.lerpVectors(anim.cDe, anim.cVers, e);
  }
  for (const p of persos.values()) {
    const g = p.g;
    if (p.chemin.length) {
      const c = p.chemin[0]; tmp.subVectors(c, g.position); const d = tmp.length();
      if (d < 0.06) { p.chemin.shift(); continue; }
      g.position.addScaledVector(tmp.normalize(), Math.min(d, VITESSE * dt));
      g.rotation.y = Math.atan2(tmp.x, tmp.z); p.corps.rotation.x = 0.35;
      p.flammes.forEach((f) => { f.visible = true; f.scale.y = 0.8 + Math.random() * 0.5; });
      p.bras.forEach((a) => { a.rotation.x = 0.5; a.rotation.z = 0; });
      p.jambes.forEach((j) => { j.rotation.x = 0.4; });
    } else if (p.place) {
      const pl = p.place, e = p.b.etat;
      p.flammes.forEach((f) => { f.visible = false; });
      if (pl.flotte) {
        g.position.set(pl.x + Math.sin(t * 0.6 + p.phase) * 0.14, pl.y + Math.sin(t * 0.9 + p.phase) * 0.13, pl.z + Math.cos(t * 0.5 + p.phase) * 0.14);
        g.rotation.y = pl.rot + Math.sin(t * 0.25 + p.phase) * 0.7; p.corps.rotation.x = Math.sin(t * 0.4 + p.phase) * 0.15;
        p.corps.rotation.z = Math.sin(t * 0.33 + p.phase) * 0.2;
        p.bras[0].rotation.z = -0.5 + Math.sin(t + p.phase) * 0.2; p.bras[1].rotation.z = 0.5 - Math.sin(t + p.phase) * 0.2;
        p.bras.forEach((a) => { a.rotation.x = 0; }); p.jambes.forEach((j, k) => { j.rotation.x = Math.sin(t * 0.8 + p.phase + k) * 0.3; });
      } else {
        g.position.set(pl.x, pl.y + Math.sin(t * 1.4 + p.phase) * 0.05, pl.z); g.rotation.y = pl.rot;
        p.corps.rotation.set(0.12, 0, 0);
        const tape = e === 'occupe' ? Math.sin(t * 12 + p.phase) * 0.15 : 0;
        p.bras[0].rotation.set(-1.1 + tape, 0, 0); p.bras[1].rotation.set(e === 'attend' ? -2.7 + Math.sin(t * 5) * 0.25 : -1.1 - tape, 0, 0);
        p.jambes.forEach((j) => { j.rotation.x = -0.5; });
      }
      if (e === 'attend') {
        p.anneaux.forEach((r, k) => { const q = ((t * 0.9 + k * 0.5) % 1); r.scale.setScalar(0.4 + q * 2.2); r.material.opacity = 1 - q; r.lookAt(camera.position); });
        p.signal.children[2].material.opacity = 0.5 + Math.abs(Math.sin(t * 4)) * 0.5;
        p.balise.scale.setScalar(1 + Math.abs(Math.sin(t * 4)) * 0.8);
      } else p.balise.scale.setScalar(1);
      p.aura.material.opacity = e === 'libre' ? 0.12 : 0.32 + Math.sin(t * 2 + p.phase) * 0.06;
    }
  }
  controls.update();
  renderer.render(scene, camera);
  if (verif >= 0 && persos.size && horloge.elapsedTime > 1.2 && ++verif > 3) { verif = -1; if (!terreSimple) verifierImage(); }
  labels.render(scene, camera);
  if ((image++ & 1) === 0) deChevaucher();
});

charger(true);
setInterval(() => charger(), INTERVALLE_MS);
window.__bureau = { simple: () => terreSimple, appliquer, persos, camera, vue: (n) => appliquerVue(n, true), pasSim };
