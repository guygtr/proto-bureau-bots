# Bureau virtuel GTR (prototype)

Étage de bureau 3D en vue isométrique (plancher de bois, mur de fenêtres, cuisine, bureau vitré, lounge) où chaque bot de Guy a un petit robot.
Les bots sont regroupés par équipe sur des tapis lumineux. **Au travail** : le robot est assis à son bureau, écran allumé et halo au sol.
**Attend Guy** : à son bureau, halo orange. **Libre** : au canapé, à la table ronde ou à la cuisine.
Panneau Équipe et fil Activité à droite (sous la scène sur cellulaire), ambiances Maintenant / Jour / Soir / Nuit,
et un bouton **Simulation** qui change des états au hasard pour voir les robots marcher.
Touchez un robot ou une ligne de l'équipe pour voir sa fiche.

Page statique en Three.js (vendorisé dans `vendor/`, aucune build), prévue pour GitHub Pages.

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
- `equipe` : regroupe les bureaux. L'équipe « Direction » va dans le bureau vitré.
- `court` (optionnel) : nom affiché au-dessus du robot. `activite` (optionnel) : fil d'exemple.
- `tache` : texte court et vague seulement (le dépôt sera public).

## Prochaines étapes

1. Créer le dépôt public `proto-bureau-bots` et activer GitHub Pages (avec l'OK de Guy).
2. Ajouter un script `statut.sh <bot> occupe|libre "tâche"` qui met à jour `status.json` avec `gh`.
3. Ajouter l'appel à ce script dans les instructions des bots (avec l'OK de Guy).

---
© GTR Technologies Inc. · Tous droits réservés.
Site réalisé par la GTR-Teams
