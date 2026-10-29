# Station spatiale GTR (prototype v3)

Station spatiale 3D en orbite au-dessus de la Terre (procédurale : continents, nuages, terminateur jour/nuit, lumières des villes, étoiles).
Un module par équipe, relié au moyeu central par des tubes et des treillis, avec panneaux solaires. Le module **Direction** est la passerelle de commandement.
Les modules sont en coupe avec un toit vitré, on voit l'intérieur.

- **Au travail** : l'astronaute-robot flotte devant sa console, écran allumé.
- **Attend Guy** : à sa console, bras levé, balise et anneaux orange qui pulsent.
- **Libre** : il flotte dans la cupole d'observation au centre.

Interface : 4 compteurs (au travail, attend Guy, libres, modules calmes), panneau Équipage, fil Activité,
vues d'orbite **Ensemble / Côté jour / Côté nuit / Cupole**, et un bouton **Simulation** qui change des états au hasard.
Les étiquettes de noms s'écartent ou se masquent pour ne jamais se chevaucher. Touchez un astronaute ou une ligne pour sa fiche.

Page statique en Three.js (vendorisé dans `vendor/`, aucune build), prévue pour GitHub Pages. Ordinateur, tablette et cellulaire.

## Mode « lite » (cellulaire)

Activé automatiquement sur écran tactile ou petit écran (et sur un appareil avec peu de mémoire, ou après une perte du contexte 3D). Pour le forcer : `?lite=1`, pour le désactiver : `?lite=0`.
Pas de shader personnalisé (Terre en texture 512 px), Lambert, aucune ombre ni vitre ni lumière ponctuelle, station fusionnée par matériau (~125 appels de dessin au lieu de ~740), 400 étoiles, pixelRatio 1, sans anticrénelage, `low-power`, ~30 i/s, pause quand l'onglet est caché, redémarrage automatique si le contexte 3D est perdu.

## Lancer en local

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000/
```

## Format de `status.json`

La page relit `status.json` toutes les 60 secondes. Le nombre de bots est lu dans le fichier : rien n'est en dur.

```json
{
  "maj": "2026-10-28T20:30:00-04:00",
  "bots": [
    { "id": "jarvis", "nom": "Jarvis · Adjoint principal", "court": "Jarvis", "equipe": "Direction", "etat": "occupe", "tache": "Analyse" },
    { "id": "finance-trader", "nom": "Finance - Trader", "court": "Trader", "equipe": "Finance", "etat": "attend", "tache": "Validation" },
    { "id": "prototypes", "nom": "Prototypes", "equipe": "Code", "etat": "libre", "tache": "" }
  ],
  "activite": [ { "heure": "2026-10-28T20:28:00-04:00", "texte": "Jarvis a lancé une analyse" } ]
}
```

- `etat` : `occupe` (au travail), `attend` (attend une réponse de Guy) ou `libre`.
- `equipe` : un module par équipe. L'équipe « Direction » devient la passerelle de commandement.
- `court` (optionnel) : nom affiché au-dessus de l'astronaute. `activite` (optionnel) : fil d'exemple.
- `tache` : texte court et vague seulement (le dépôt sera public).

## Prochaines étapes

En ligne : https://guygtr.github.io/proto-bureau-bots/ (bouton **Simulation** pour voir les astronautes bouger).

1. Ajouter un script `statut.sh <bot> occupe|attend|libre "tâche"` qui met à jour `status.json` avec `gh` (avec l'OK de Guy).
2. Ajouter l'appel à ce script dans les instructions des bots (avec l'OK de Guy).

---
© GTR Technologies Inc. · Tous droits réservés.
Site réalisé par la GTR-Teams

## Repli
- Version complète par défaut (ordi et cellulaire). Mode allégé : `?lite=1`, ou automatique après une perte du contexte 3D.
- Sans WebGL (ex. Chrome qui a désactivé la 3D) : vue 2D (SVG) avec compteurs, panneaux et simulation. Forcer : `?sans3d=1`.
