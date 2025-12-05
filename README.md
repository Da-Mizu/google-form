
# Google Form Clone

Application web de gestion de sondages (login, inscription, réponses, affichage dynamique) avec HTML, CSS, JavaScript, PHP, MySQL et Bootstrap.

## Fonctionnalités principales

- Authentification sécurisée (inscription, login, logout, mot de passe hashé)
- Limitation des tentatives de login (anti-bruteforce)
- Protection contre les injections SQL et validation côté serveur
- Saisie et persistance des réponses aux sondages (liées à l'utilisateur)
- Affichage dynamique des sondages et questions depuis la base
- Navbar dynamique selon l'état de connexion
- Protection des endpoints sensibles (authentification requise)

## Structure du projet

- `index.html` : Formulaire de login
- `register.html` : Formulaire d'inscription
- `home.html` : Liste des sondages
- `questions.html` : Liste des questions et saisie des réponses
- `style.css` : Styles personnalisés
- `script.js`, `register.js`, `home.js`, `questions.js` : Logique JS
- `login_check.php`, `register.php`, `get_sondage.php`, `get_questions.php`, `save_answer.php` : Endpoints PHP

## Démarrage

1. Importez la structure SQL (`gogoleform.sql`) et les données (`sondage_data.sql`, `question_data.sql`) dans MySQL.
2. Placez le dossier dans `htdocs` de XAMPP.
3. Lancez Apache et MySQL via XAMPP.
4. Accédez à [http://localhost/google-form/](http://localhost/google-form/) dans votre navigateur.

## Librairies utilisées

- [Bootstrap 5](https://getbootstrap.com/)

## Sécurité & bonnes pratiques

- Mots de passe hashés (PHP `password_hash`/`password_verify`)
- Validation et assainissement des entrées côté serveur
- Requêtes préparées partout (anti-injection SQL)
- Limitation brute-force sur le login
- Authentification requise pour les actions sensibles

## Exemple de connexion

Après inscription, connectez-vous avec vos identifiants créés.

## TODO & améliorations possibles

Voir le fichier `todo.txt` pour les axes d'amélioration sécurité, validation, UX, etc.
