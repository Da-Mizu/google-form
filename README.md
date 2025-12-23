# Google Form Clone

Application web complète de gestion de sondages développée avec HTML, CSS, JavaScript, PHP, MySQL et Bootstrap. Cette application permet la création de sondages personnalisés, l'inscription et l'authentification des utilisateurs, ainsi que la collecte et l'affichage dynamique des réponses.

**Dernières mises à jour :**

- Organisation complète du projet avec séparation claire : fichiers HTML dans `/html`, fichiers JavaScript dans `/js`, endpoints PHP dans `/php`
- **Support multi-types de questions** : implémentation des questions à texte libre ET à choix multiple avec radio buttons
- **Interface de création dynamique** : formulaire intuitif permettant l'ajout automatique de questions et d'options personnalisables
- Filtrage intelligent des sondages : les sondages déjà complétés par l'utilisateur sont automatiquement masqués de la liste
- Redirection automatique vers la liste des sondages après soumission des réponses
- Sécurisation renforcée : envoi de `user_id` en POST (body JSON) au lieu de GET (URL)
- Configuration CORS complète sur l'ensemble des endpoints PHP
- Vérification systématique de l'authentification côté JavaScript avant les appels sensibles

## Fonctionnalités principales

- **Authentification sécurisée** : système complet d'inscription, connexion et déconnexion avec mots de passe hashés selon les standards de sécurité
- **Création de sondages avancée** : interface dynamique permettant de choisir le type de question (texte libre ou choix multiple)
- **Types de questions supportés** : 
  - Questions à texte libre avec zone de saisie textarea
  - Questions à choix multiple avec radio buttons et options personnalisables
  - Ajout dynamique d'inputs pour questions et options supplémentaires (inspiré de Google Forms)
- **Réponse aux sondages** : affichage adaptatif selon le type de question avec persistance automatique des réponses
- **Filtrage intelligent** : masquage automatique des sondages déjà complétés par l'utilisateur connecté
- **Protection anti-bruteforce** : système de limitation des tentatives de connexion avec table `login_attempts` dédiée
- **Protection contre les injections SQL** : utilisation exclusive de requêtes préparées sur tous les endpoints
- **Interface utilisateur adaptative** : barre de navigation dynamique avec boutons adaptés selon l'état de connexion (Create, Logout, Register, Login)
- **Navigation fluide** : redirection automatique vers la liste des sondages après soumission de réponses

## Structure du projet

### Fichiers HTML (`/html`)
- `index.html` : Page de connexion avec formulaire de login
- `register.html` : Page d'inscription pour les nouveaux utilisateurs
- `home.html` : Page d'accueil affichant la liste des sondages disponibles
- `questions.html` : Page d'affichage des questions et de saisie des réponses
- `create_survey.html` : Page de création de nouveaux sondages (réservée aux utilisateurs connectés)

### Fichiers JavaScript (`/js`)
- `script.js` : Gestion de l'authentification et logique de connexion
- `register.js` : Logique d'inscription des nouveaux utilisateurs
- `home.js` : Affichage dynamique des sondages avec filtrage selon les réponses déjà soumises
- `questions.js` : Affichage adaptatif des questions (textarea ou radio buttons) et gestion de la soumission des réponses
- `create_survey.js` : Gestion du formulaire de création avec inputs dynamiques et sélection des types de questions

### Endpoints PHP (`/php`)
- `login_check.php` : Authentification des utilisateurs avec protection anti-bruteforce
- `register.php` : Inscription des nouveaux utilisateurs avec validation et hachage sécurisé des mots de passe
- `get_sondage.php` : Récupération de la liste des sondages disponibles (filtrés selon l'utilisateur connecté)
- `get_questions.php` : Récupération des questions avec leurs types et options associées (pour les choix multiples)
- `save_answer.php` : Enregistrement sécurisé des réponses aux questions
- `create_survey.php` : Création complète de sondages avec questions et options (utilise des transactions SQL)

### Base de données
- `sql/gogoleform.sql` : Structure initiale complète des tables de la base de données
- `sql/migration_question_types.sql` : Script de migration pour ajouter le support des types de questions et des options
  - Ajout de la colonne `type` dans la table `question`
  - Création de la table `question_option` pour gérer les choix multiples

### Autres fichiers
- `style.css` : Feuille de styles CSS personnalisés pour l'interface

## Démarrage

1. Importez la structure SQL et les données initiales depuis le dossier `/sql` dans votre instance MySQL.
2. Placez le dossier du projet dans le répertoire `htdocs` de votre installation XAMPP.
3. Lancez les services Apache et MySQL via le panneau de contrôle XAMPP.
4. Accédez à l'application via votre navigateur à l'adresse : [http://localhost/google-form/html/index.html](http://localhost/google-form/html/index.html)

## Librairies utilisées

- [Bootstrap 5](https://getbootstrap.com/) - Framework CSS pour une interface responsive et moderne

## Sécurité & bonnes pratiques

- Mots de passe sécurisés : utilisation des fonctions PHP `password_hash` et `password_verify` pour le hachage
- Validation rigoureuse et assainissement des entrées utilisateur côté serveur
- Protection anti-injection SQL : utilisation exclusive de requêtes préparées sur tous les endpoints
- Système de limitation des tentatives de connexion contre les attaques par force brute (table `login_attempts`)
- Authentification obligatoire pour toutes les actions sensibles de l'application
- Transmission sécurisée de `user_id` via POST (body JSON) au lieu de paramètres GET dans l'URL
- Vérification de l'état de connexion côté client via la clé `user_id` stockée dans le localStorage
- Contrôle d'authentification : les requêtes fetch JavaScript ne sont exécutées que si l'utilisateur est authentifié
- Configuration CORS systématique sur l'ensemble des endpoints PHP pour une communication sécurisée
- Transactions SQL pour garantir l'intégrité et la cohérence des données lors de la création de sondages
- Architecture organisée et modulaire pour faciliter la maintenance et l'évolution du projet

## Exemple de connexion

Après avoir créé votre compte via le formulaire d'inscription, connectez-vous à l'application en utilisant les identifiants que vous avez définis.

## TODO & améliorations possibles

Consultez le fichier `todo.txt` pour découvrir les axes d'amélioration envisagés concernant la sécurité, la validation, l'expérience utilisateur et les fonctionnalités à venir.
