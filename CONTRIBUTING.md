# Guide de contribution

Ce guide vise à établir des règles claires pour contribuer au projet. En suivant ces directives, nous assurons une collaboration efficace et maintenons la qualité de notre code.

Ce document couvre les conventions de nommage des branches, les règles pour les messages de commit (`fixed stuff` n'est malheureusement pas un nom valide), le processus de Merge Request (MR), la revue de code, et d'autres bonnes pratiques essentielles pour naviguer dans notre projet sans perdre la raison.

## 1. Convention de nommage des branches

La convention de nommage des branches est essentielle pour maintenir notre projet organisé et compréhensible. Nous utilisons une approche simplifiée adaptée à notre contexte académique, tout en s'inspirant des pratiques de l'industrie.

### Structure principale

Nous maintenons deux branches principales :

-   `master` ou `main` : branche principale qui contient le code stable, prêt pour la production/évaluation. On y touche avec précaution.
-   `dev` : branche de développement, intègre les nouvelles fonctionnalités. C'est ici que la magie opère (et que parfois tout explose). Les fonctionnalités devrait être stables, même si pas complètement terminées.

### Branches de travail

Pour tout nouveau développement, créez une branche à partir de la branche appropriée en suivant cette convention :

`type/description-courte`

Types de branches :

-   `feature/` : pour les nouvelles fonctionnalités
-   `bugfix/` : pour les corrections de bugs
-   `hotfix/` : pour les correctifs urgents (généralement moins de changements que `bugfix/`)
-   `doc/` : pour les mises à jour de documentation (optionnel)

Exemples :

-   `feature/authentification-utilisateur`
-   `bugfix/correction-calcul-score`
-   `hotfix/correction-fuite-memoire`
-   `doc/mise-a-jour-readme`

Règles :

1. Utilisez un séparateur cohérent entre les mots (tiret `-` ou barre oblique `/`). L'important est d'être uniforme au sein de l'équipe.
2. Soyez concis, mais descriptif.
3. Utilisez uniquement des lettres minuscules et des chiffres.
4. Choisissez une langue (français ou anglais) pour les noms de branches et les messages de commit, et utilisez-la de manière cohérente.
5. Décomposez les grosses fonctionnalités en plusieurs branches plus petites et gérables.

### Structure des branches

-   Les branches `feature/` et `bugfix/` peuvent partir de `dev` ou d'une autre branche `feature/` pour les sous-fonctionnalités.
-   Les branches `hotfix/` peuvent partir de `master` ou `dev` selon l'urgence.
-   Les branches `doc/` peuvent partir de `master` ou `dev` selon le niveau de stabilité ou d'avancement de ce qui est documenté.
-   Évitez de créer plus de 2 ou 3 niveaux de profondeur dans la hiérarchie des branches.

### Décomposition des grosses fonctionnalités

Il est fortement recommandé de décomposer les grosses fonctionnalités en plusieurs branches plus petites. Cela facilite la revue de code, réduit les conflits potentiels et permet une intégration plus fréquente.

Exemple de décomposition d'une grosse fonctionnalité "Système de recommandation" :

-   `feature/systeme-recommandation` (branche principale de la fonctionnalité)
    -   `feature/recommandation-collecte-donnees`
    -   `feature/recommandation-algorithme-filtrage`
    -   `feature/recommandation-interface-utilisateur`

## 2. Conventions pour les messages de commit

Nous suivons la convention des [Conventional Commits](https://www.conventionalcommits.org/) pour structurer nos messages de commit. Cette approche rend l'historique du projet plus lisible et facilite la génération automatique de changelogs.

### Format de base

```
<type>(portée optionnelle): <description>
[corps optionnel]
```

### Types de commit

-   `feat`: Nouvelle fonctionnalité
-   `fix`: Correction de bug
-   `docs`: Modification de la documentation
-   `style`: Changements de formatage (espaces, virgules, etc.)
-   `refactor`: Refactorisation du code
-   `test`: Ajout ou modification de tests
-   `chore`: Tâches de maintenance, mises à jour de dépendances, etc.

### Exemples

```
- feat(login): ajouter un bouton de login sur la page principale
- fix(login): cacher le bouton de login si déjà connectés
- docs(api): documenter l'API de la route d'authentification
- style(css): rendre le site lisible sur plateforme mobile
- refactor(algorithme): remplacer les ifs géants par un algorithme optimisé
- test(performance): vérifier que l'app ne plante pas sous une forte charge
- chore(git): mettre à jour les dépendances du projet
```

### Bonnes pratiques

-   Utilisez l'impératif présent dans la description ("ajouter" au lieu de "ajouté")
-   Séparez le sujet du corps par une ligne vide si vous incluez un corps
-   Utilisez le corps pour expliquer le "quoi" et le "pourquoi" du changement, pas le "comment"

Pour plus de détails, consultez [conventionalcommits.org](https://www.conventionalcommits.org/).

## 3. Processus de Merge Request (MR)

Les Merge Requests (MR) sont essentielles pour intégrer votre travail dans une branche ciblée (souvent `dev`). Suivez ces étapes pour créer et gérer efficacement vos MR.

### Création d'une MR

1. Assurez-vous que votre branche est à jour avec la dernière version de la branche cible.
2. Poussez votre branche vers le dépôt distant. **Astuce**: Si vous utilisez le terminal pour pousser votre branche, GitLab vous fournira automatiquement l'URL pour créer une Merge Request.
3. Dans GitLab, créez une nouvelle Merge Request depuis votre branche vers la branche cible.

### Contenu de la MR

Votre MR doit inclure :

-   Un titre clair et descriptif, suivant la même convention que nos messages de commit (Conventional Commits).
-   Une description détaillant :
    -   Le but de la MR
    -   Les changements principaux (la liste des tâches accomplis ou modifications apportées)
    -   Tout impact potentiel sur d'autres parties du projet
-   (Optionnel) Des labels appropriés (ex: "feature", "bugfix", "documentation")
-   Une personne assignée à la revue de votre contribution (peut être plusieurs personnes)

### Bonnes pratiques

-   Gardez vos MR de taille raisonnable (idéalement < 400 lignes modifiées)
-   Résolvez les conflits avant de demander une revue
-   Répondez rapidement aux commentaires et suggestions
-   Mettez à jour votre MR si des changements sont demandés
-   Évitez d'ouvrir une MR trop tôt dans l'étape de développement

### Processus d'approbation

1. Au moins un autre membre de l'équipe doit approuver la MR
2. Tous les commentaires doivent être résolus avant la fusion
3. Les tests CI doivent passer avec succès
4. Une fois approuvée, vous pouvez procéder à la fusion.
5. (Optionnel) Vous pouvez compacter (`squash`) tous les commits en un seul et supprimer la branche source. Attention à cette combinaison puisque vous risquez de perdre de l'historique de vos changements.

**Note** : N'hésitez pas à demander de l'aide si vous rencontrez des difficultés pendant ce processus.

## 4. Revue de code et approbation des MR

La revue de code est cruciale pour maintenir la qualité du code et partager les connaissances au sein de l'équipe.

### Critères de revue

Lors de la revue, vérifiez les points suivants :

-   Fonctionnalité : Le code fait-il ce qu'il est censé faire ?
-   Lisibilité : Le code est-il facile à comprendre ?
-   Style : Le code suit-il nos conventions de style ?
-   Tests : Y a-t-il des tests appropriés pour les nouvelles fonctionnalités/corrections ?

### Test local des changements

**Important** : Ne vous limitez pas à lire le code. Testez toujours les changements localement :

1. Récupérez la branche de la MR sur votre machine locale.
2. Installez les dépendances nécessaires et compilez le projet si nécessaire.
3. Testez manuellement les fonctionnalités nouvelles ou modifiées.
4. Assurez-vous que les performances des modifications sont adéquates et ne dégradent pas l'expérience utilisateur.
5. Vérifiez que les changements n'introduisent pas de régressions.

### Bonnes pratiques

-   Soyez respectueux et constructif dans vos commentaires. Rappelez-vous, derrière chaque ligne de code se cache un membre de l'équipe.
-   Expliquez le "pourquoi" derrière vos suggestions.
-   N'hésitez pas à demander des clarifications."C'est de la magie" n'est pas une documentation suffisante.
-   Félicitez les bonnes pratiques et les solutions innovantes.

## Conclusion

Ce guide de contribution est conçu pour faciliter notre collaboration et maintenir la qualité de notre projet. En suivant ces directives, nous créons un environnement de développement efficace, cohérent et moins chaotique.

N'oubliez pas que ces lignes directrices sont là pour nous aider, pas pour nous limiter. Si vous avez des suggestions d'amélioration pour ce guide, n'hésitez pas à en discuter avec l'équipe.

Bon développement à tou.te.s ! 🚀
