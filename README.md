# Bureau des bots GTR (prototype)

Bureau virtuel 3D des bots de Guy. Chaque bot a un personnage et un bureau avec son nom.
Quand un bot est **occupé**, son personnage va s'asseoir à son bureau avec une étiquette de tâche.
Quand il est **libre**, il va dans la zone détente (canapé, machine à café).
Touchez ou cliquez un personnage pour voir sa fiche (nom, état, tâche).

Page statique en Three.js (vendorisé dans `vendor/`, aucune build), prévue pour GitHub Pages.
Fonctionne sur ordinateur et sur cellulaire (la scène se réorganise en mode portrait).

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
    { "id": "jarvis", "nom": "Jarvis · Adjoint principal", "etat": "occupe", "tache": "Analyse" },
    { "id": "prototypes", "nom": "Prototypes", "etat": "libre", "tache": "" }
  ]
}
```

- `etat` : `occupe` ou `libre`.
- `tache` : texte court et vague seulement (le dépôt sera public).

## Prochaines étapes

1. Créer le dépôt public `proto-bureau-bots` et activer GitHub Pages (avec l'OK de Guy).
2. Ajouter un script `statut.sh <bot> occupe|libre "tâche"` qui met à jour `status.json` avec `gh`.
3. Ajouter l'appel à ce script dans les instructions des bots (avec l'OK de Guy).

---
© GTR Technologies Inc. · Tous droits réservés.
Site réalisé par la GTR-Teams
