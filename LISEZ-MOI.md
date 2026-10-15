# Duel des Trois — application de bureau

Installateur pour **Windows, macOS et Linux**, avec mises à jour automatiques via GitHub (gratuit).

## 1. Une seule fois : mettre le projet sur GitHub

1. Crée un compte sur github.com, puis un dépôt **public** nommé `duel-des-trois`.
2. Ouvre `package.json` et remplace `TON_PSEUDO_GITHUB` par ton pseudo GitHub (ligne `repository`).
3. Installe **Git** (git-scm.com) et **Node.js** version LTS (nodejs.org).
4. Dans le dossier du projet, ouvre un terminal et tape :

```
git init
git add .
git commit -m "Première version"
git branch -M main
git remote add origin https://github.com/TON_PSEUDO_GITHUB/duel-des-trois.git
git push -u origin main
```

## 2. Publier la première version

```
git tag v1.0.0
git push origin v1.0.0
```

GitHub fabrique les 3 installateurs tout seul (environ 10 minutes). Suis l'avancement dans l'onglet **Actions** du dépôt. Ensuite, la page **Releases** contient :

| Système | Fichier à télécharger |
|---|---|
| Windows | `Duel-des-Trois-Setup-1.0.0.exe` |
| macOS | `Duel-des-Trois-1.0.0-mac-arm64.dmg` (Mac récent) ou `-x64.dmg` (Mac Intel) |
| Linux | `Duel-des-Trois-1.0.0-linux-x86_64.AppImage` |

**Premier lancement**
- Windows : si « Windows a protégé votre ordinateur » apparaît, clique sur *Informations complémentaires* puis *Exécuter quand même*. Ça vient du fait que l'appli n'est pas signée par un éditeur payant.
- macOS : clic droit sur l'appli, *Ouvrir*. Si Mac dit « endommagée », tape dans le terminal : `xattr -cr "/Applications/Duel des Trois.app"`
- Linux : clic droit sur le fichier, *Propriétés*, *Autoriser l'exécution*, puis double-clic (ou `chmod +x fichier.AppImage`).

## 3. Publier une mise à jour

1. Remplace `app/index.html` par la nouvelle version du jeu.
2. Dans le terminal :

```
git add .
git commit -m "Nouvelle version"
npm install
npm run release
```

`npm run release` augmente le numéro de version (1.0.0 → 1.0.1), crée l'étiquette et l'envoie. GitHub refait les installateurs tout seul.

**Ce que voient les joueurs**
- **Windows et Linux (AppImage)** : la mise à jour se télécharge en arrière-plan. Une fenêtre propose *Redémarrer maintenant*. Sinon elle s'installe à la fermeture du jeu.
- **macOS** : une fenêtre annonce la nouvelle version avec un bouton *Télécharger*. Une mise à jour 100 % automatique sur Mac demande un compte développeur Apple payant (99 $/an).
- La **progression de la campagne est conservée** à chaque mise à jour.
- Menu **Jeu > Rechercher une mise à jour** pour vérifier à la main. **F11** : plein écran.

## 4. Pourquoi ça ne pose pas de problème

- Installation sans droits administrateur (Windows) : la mise à jour peut s'installer sans demander de mot de passe.
- Noms de fichiers sans espaces : c'est la cause n°1 des mises à jour qui échouent avec GitHub.
- Une erreur de mise à jour (pas d'internet, GitHub en panne) ne bloque jamais le jeu.
- Une seule fenêtre du jeu à la fois, pour éviter les fichiers verrouillés pendant l'installation.
- Adresse interne fixe (`app://duel`) : la sauvegarde ne se perd pas d'une version à l'autre.

## 5. Si une mise à jour n'arrive pas

- Le dépôt doit être **public**.
- La version doit apparaître dans **Releases** comme publiée (pas en « brouillon »). Le dernier job de l'onglet Actions s'en charge.
- Le numéro de l'étiquette (`v1.0.1`) doit être égal à `version` dans `package.json`. `npm run release` le fait pour toi.
- L'appli doit être **installée**. Une appli lancée depuis un dossier de développement ne se met pas à jour.

## Tester chez toi sans rien publier

```
npm install
npm start
```
