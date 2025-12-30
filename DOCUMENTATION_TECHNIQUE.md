# Documentation Technique - gogoleform

## Table des matières
1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Base de données](#base-de-données)
4. [API Backend (PHP)](#api-backend-php)
5. [Frontend](#frontend)
6. [Sécurité](#sécurité)
7. [Installation & Configuration](#installation--configuration)
8. [Flux de données](#flux-de-données)
9. [Guide de développement](#guide-de-développement)

---

## Vue d'ensemble

**gogoleform** est une application web de gestion de sondages inspirée de Google Forms. Elle permet aux utilisateurs de :
- Créer des comptes et s'authentifier
- Créer des questionnaires avec différents types de questions
- Répondre à des sondages
- Visualiser les résultats avec graphiques et statistiques
- Exporter les données en CSV/PDF
- Partager les sondages avec d'autres utilisateurs

### Technologies utilisées
- **Frontend** : HTML5, CSS3, JavaScript (Vanilla)
- **Backend** : PHP 8.x
- **Base de données** : MySQL/MariaDB
- **Frameworks CSS** : Bootstrap 5.3.2
- **Bibliothèques** : 
  - Chart.js 4.4.0 (graphiques)
  - html2pdf.js 0.10.1 (export PDF)

---

## Architecture

### Structure des dossiers
```
google-form/
├── html/               # Pages HTML
│   ├── index.html              # Page de connexion
│   ├── register.html           # Page d'inscription
│   ├── home.html               # Liste des sondages
│   ├── create_survey.html      # Création de sondages
│   ├── questions.html          # Répondre aux questions
│   ├── answer.html             # Visualisation des réponses
│   ├── share_survey.html       # Partage de sondages
│   └── navbar.html             # Navbar réutilisable
├── js/                 # Scripts JavaScript
│   ├── script.js               # Authentification (login)
│   ├── register.js             # Inscription
│   ├── home.js                 # Liste des sondages
│   ├── create_survey.js        # Création dynamique de formulaires
│   ├── questions.js            # Affichage et soumission de réponses
│   ├── answer.js               # Visualisation et export
│   ├── share_survey.js         # Gestion du partage
│   └── navbar.js               # Navbar dynamique
├── php/                # API Backend
│   ├── login_check.php         # Authentification
│   ├── register.php            # Inscription
│   ├── create_survey.php       # Création de sondages
│   ├── get_sondage.php         # Liste des sondages
│   ├── get_questions.php       # Questions d'un sondage
│   ├── save_answer.php         # Sauvegarde des réponses
│   ├── get_answer.php          # Récupération des réponses
│   ├── delete_survey.php       # Suppression de sondage
│   ├── share_survey.php        # Partage de sondage
│   ├── get_survey_access.php   # Liste des partages
│   ├── delete_survey_access.php # Suppression d'accès
│   └── list_forms_owned.php    # Sondages possédés
├── sql/                # Scripts SQL
│   ├── google-form.sql         # Structure complète
│   ├── question_data.sql       # Données de test
│   └── sondage_data.sql        # Données de test
├── style.css           # Styles personnalisés
├── logo.png            # Logo de l'application
└── logo.svg            # Logo vectoriel
```

### Architecture MVC implicite
- **Modèle** : Scripts PHP + Base de données MySQL
- **Vue** : Fichiers HTML + CSS
- **Contrôleur** : JavaScript (logique côté client) + PHP (API)

---

## Base de données

### Schéma relationnel

#### Table `user`
Stocke les utilisateurs de l'application.

```sql
CREATE TABLE `user` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `username` VARCHAR(50) UNIQUE NOT NULL,
  `password` VARCHAR(255) NOT NULL,  -- Hash bcrypt
  `email` VARCHAR(100)
);
```

**Champs :**
- `id` : Identifiant unique
- `username` : Nom d'utilisateur unique
- `password` : Mot de passe haché avec `password_hash()`
- `email` : Adresse email

---

#### Table `form`
Représente les sondages/formulaires créés.

```sql
CREATE TABLE `form` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `user_id` INT,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
);
```

**Champs :**
- `id` : Identifiant unique du formulaire
- `title` : Titre du sondage
- `description` : Description optionnelle
- `user_id` : Propriétaire du formulaire

---

#### Table `question`
Questions d'un formulaire.

```sql
CREATE TABLE `question` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `form_id` INT NOT NULL,
  `question_text` TEXT NOT NULL,
  `type` VARCHAR(20) DEFAULT 'text',  -- 'text', 'multiple', 'scale'
  `anonymus` TINYINT(1) DEFAULT 0,    -- 0 = non anonyme, 1 = anonyme
  FOREIGN KEY (`form_id`) REFERENCES `form`(`id`)
);
```

**Types de questions :**
- `text` : Texte libre (textarea)
- `multiple` : Choix multiples avec checkboxes
- `scale` : Échelle de notation (0-10)

**Champ `anonymus` :**
- Si activé, les réponses masquent l'identité de l'utilisateur

---

#### Table `question_option`
Options pour les questions à choix multiples.

```sql
CREATE TABLE `question_option` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `question_id` INT NOT NULL,
  `option_text` VARCHAR(255) NOT NULL,
  FOREIGN KEY (`question_id`) REFERENCES `question`(`id`) ON DELETE CASCADE
);
```

---

#### Table `answer`
Réponses aux questions.

```sql
CREATE TABLE `answer` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `question_id` INT NOT NULL,
  `user_id` INT,
  `answer_text` TEXT NOT NULL,
  `answered_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`question_id`) REFERENCES `question`(`id`),
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
);
```

**Champs :**
- `answer_text` : 
  - Texte libre pour type `text`
  - Valeur(s) séparées par virgule pour `multiple` (ex: "Option 1, Option 3")
  - Nombre de 0 à 10 pour type `scale`

---

#### Table `survey_access`
Gestion des permissions de partage.

```sql
CREATE TABLE `survey_access` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `form_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `access_type` ENUM('view','answer','admin') DEFAULT 'answer',
  UNIQUE KEY (`form_id`, `user_id`),
  FOREIGN KEY (`form_id`) REFERENCES `form`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
```

**Types d'accès :**
- `view` : Voir les résultats uniquement
- `answer` : Répondre au sondage
- `admin` : Gérer le sondage

---

#### Table `login_attempts`
Protection anti-bruteforce.

```sql
CREATE TABLE `login_attempts` (
  `ip` VARCHAR(45) PRIMARY KEY,
  `attempts` INT DEFAULT 0,
  `last_attempt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `locked_until` DATETIME
);
```

**Logique :**
- Après 5 tentatives échouées, blocage de 15 minutes
- Réinitialisation après connexion réussie

---

## API Backend (PHP)

Tous les endpoints renvoient du JSON et incluent des headers CORS.

### 1. Authentification

#### `POST /php/login_check.php`
Authentifie un utilisateur.

**Requête :**
```json
{
  "username": "admin",
  "password": "motdepasse"
}
```

**Réponse (succès) :**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin"
  }
}
```

**Réponse (erreur) :**
```json
{
  "success": false,
  "error": "Utilisateur ou mot de passe incorrect."
}
```

**Sécurité :**
- Vérification anti-bruteforce
- Mot de passe vérifié avec `password_verify()`
- Blocage IP après 5 tentatives échouées

---

#### `POST /php/register.php`
Crée un nouveau compte utilisateur.

**Requête :**
```json
{
  "username": "nouvel_utilisateur",
  "password": "motdepasse",
  "email": "email@example.com"
}
```

**Réponse (succès) :**
```json
{
  "success": true,
  "message": "Inscription réussie"
}
```

**Validations :**
- Username unique
- Mot de passe haché avec `password_hash()`
- Email valide (optionnel)

---

### 2. Gestion des sondages

#### `POST /php/create_survey.php`
Crée un nouveau sondage avec ses questions.

**Requête :**
```json
{
  "user_id": 1,
  "title": "Sondage test",
  "description": "Description du sondage",
  "questions": [
    {
      "text": "Quelle est votre couleur préférée ?",
      "type": "multiple",
      "anonymus": false,
      "options": ["Rouge", "Bleu", "Vert"]
    },
    {
      "text": "Notez notre service",
      "type": "scale",
      "anonymus": false
    },
    {
      "text": "Commentaires",
      "type": "text",
      "anonymus": true
    }
  ]
}
```

**Réponse :**
```json
{
  "success": true,
  "form_id": 5,
  "message": "Sondage créé avec succès"
}
```

**Transaction SQL :**
- Insertion du formulaire
- Insertion des questions
- Insertion des options (si type `multiple`)
- Rollback en cas d'erreur

---

#### `GET /php/get_sondage.php?user_id=1`
Liste des sondages disponibles pour l'utilisateur.

**Réponse :**
```json
[
  {
    "id": 5,
    "title": "Sondage satisfaction",
    "description": "...",
    "user_id": 1
  }
]
```

**Filtrage :**
- Exclut les sondages déjà complétés par l'utilisateur
- Inclut les sondages partagés avec l'utilisateur

---

#### `GET /php/get_questions.php?form_id=5`
Questions d'un sondage spécifique.

**Réponse :**
```json
[
  {
    "id": 12,
    "question_text": "Quelle est votre couleur préférée ?",
    "type": "multiple",
    "anonymus": 0,
    "options": ["Rouge", "Bleu", "Vert"]
  },
  {
    "id": 13,
    "question_text": "Notez notre service",
    "type": "scale",
    "anonymus": 0,
    "options": []
  }
]
```

---

#### `DELETE /php/delete_survey.php`
Supprime un sondage (propriétaire uniquement).

**Requête :**
```json
{
  "form_id": 5,
  "user_id": 1
}
```

**Vérification :**
- L'utilisateur doit être le propriétaire
- Suppression en cascade (questions, options, réponses)

---

### 3. Réponses

#### `POST /php/save_answer.php`
Enregistre une réponse à une question.

**Requête :**
```json
{
  "question_id": 12,
  "answer_text": "Rouge, Bleu",
  "user_id": 1
}
```

**Formats selon le type :**
- `text` : Texte libre
- `multiple` : "Option1, Option2, Option3"
- `scale` : "7" (nombre de 0 à 10)

---

#### `GET /php/get_answer.php?form_id=5&user_id=1`
Récupère toutes les réponses d'un sondage.

**Réponse :**
```json
{
  "success": true,
  "form_title": "Sondage satisfaction",
  "questions": [
    {
      "id": 12,
      "question_text": "Quelle est votre couleur préférée ?",
      "type": "multiple",
      "anonymus": 0,
      "answers": [
        {
          "username": "admin",
          "answer_text": "Rouge, Bleu",
          "answered_at": "2025-12-29 10:30:00",
          "user_masked": false
        }
      ]
    }
  ]
}
```

**Sécurité :**
- Seul le propriétaire peut voir les résultats
- Les réponses anonymes masquent le username

---

### 4. Partage

#### `POST /php/share_survey.php`
Partage un sondage avec un utilisateur.

**Requête :**
```json
{
  "form_id": 5,
  "username": "autre_user",
  "access_type": "view",
  "user_id": 1
}
```

---

#### `GET /php/get_survey_access.php?form_id=5&user_id=1`
Liste des utilisateurs ayant accès au sondage.

---

#### `POST /php/delete_survey_access.php`
Révoque l'accès d'un utilisateur.

---

#### `GET /php/list_forms_owned.php?user_id=1`
Sondages créés par l'utilisateur (pour le partage).

---

## Frontend

### Architecture JavaScript

#### 1. Authentification (`script.js`, `register.js`)

**Flux de connexion :**
1. L'utilisateur saisit username/password
2. Envoi POST vers `login_check.php`
3. Stockage du `user_id` dans `localStorage`
4. Redirection vers `home.html`

**Code clé :**
```javascript
const response = await fetch('http://localhost/google-form/php/login_check.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
});
const result = await response.json();
if (result.success) {
    localStorage.setItem('user_id', result.user.id);
    window.location.href = 'home.html';
}
```

---

#### 2. Navbar dynamique (`navbar.js`)

**Logique :**
- Si `user_id` existe dans localStorage → afficher "Create", "Logout"
- Sinon → afficher "Register", "Login"

**Chargement :**
```javascript
fetch('navbar.html')
    .then(response => response.text())
    .then(html => {
        document.body.insertAdjacentHTML('afterbegin', html);
        updateNavbar();
    });
```

---

#### 3. Création de sondages (`create_survey.js`)

**Fonctionnalités :**
- Ajout dynamique de questions
- Sélection du type (text/multiple/scale)
- Ajout automatique d'options pour les choix multiples
- Checkbox "Rendre anonyme"

**Gestion dynamique des inputs :**
```javascript
// Ajoute automatiquement un nouveau champ si un seul reste vide
function checkAndAddQuestionBlock() {
    const emptyQuestions = Array.from(allQuestions)
        .filter(input => input.value.trim() === '');
    
    if (emptyQuestions.length === 1) {
        // Créer un nouveau bloc de question
    }
}
```

**Soumission :**
```javascript
const questions = [];
questionBlocks.forEach(block => {
    const text = block.querySelector('.question-field').value.trim();
    const type = block.querySelector('.question-type').value;
    const anonymus = block.querySelector('.question-anonymous').checked;
    
    const options = [];
    if (type === 'multiple') {
        // Récupérer les options non vides
    }
    
    questions.push({ text, type, anonymus, options });
});

// Envoi vers create_survey.php
```

---

#### 4. Répondre aux questions (`questions.js`)

**Affichage dynamique selon le type :**

##### Type `text` :
```javascript
const textarea = document.createElement('textarea');
textarea.className = 'form-control mt-2';
textarea.rows = 3;
textarea.setAttribute('data-question-id', q.id);
```

##### Type `multiple` :
```javascript
q.options.forEach((option, index) => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = option;
    checkbox.setAttribute('data-question-id', q.id);
    // ...
});
```

##### Type `scale` :
```javascript
for (let i = 0; i <= 10; i++) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-outline-primary scale-btn';
    btn.textContent = i;
    btn.addEventListener('click', function() {
        // Sélectionner ce bouton, désélectionner les autres
        this.classList.add('active', 'btn-primary');
    });
}
```

**Soumission des réponses :**
```javascript
// Textareas (texte libre)
textareas.forEach(async (input) => {
    const answer = input.value.trim();
    if (answer) {
        await fetch('save_answer.php', {
            method: 'POST',
            body: JSON.stringify({ question_id, answer_text: answer, user_id })
        });
    }
});

// Checkboxes (choix multiples)
const selectedValues = checkboxes.filter(cb => cb.checked).map(cb => cb.value);
const combinedAnswer = selectedValues.join(', ');

// Scale buttons
const scaleBtn = document.querySelector('.scale-btn.active');
const value = scaleBtn.getAttribute('data-value');
```

---

#### 5. Visualisation des résultats (`answer.js`)

**Graphiques avec Chart.js :**

##### Camembert (type `multiple`) :
```javascript
function createPieChart(canvasId, answers) {
    const answerCounts = {};
    answers.forEach(answer => {
        // Séparer les réponses multiples
        const options = answer.answer_text.split(',').map(opt => opt.trim());
        options.forEach(option => {
            answerCounts[option] = (answerCounts[option] || 0) + 1;
        });
    });
    
    new Chart(canvas, {
        type: 'pie',
        data: {
            labels: Object.keys(answerCounts),
            datasets: [{
                data: Object.values(answerCounts),
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', ...]
            }]
        }
    });
}
```

##### Moyenne (type `scale`) :
```javascript
if (question.type === 'scale') {
    const values = filteredAnswers
        .map(a => parseFloat(a.answer_text))
        .filter(v => !isNaN(v));
    const average = (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2);
    
    // Affichage : "Moyenne : 7.45 / 10 (15 réponses)"
}
```

**Export CSV :**
```javascript
function downloadCSV() {
    // Ajouter le BOM UTF-8 pour Excel
    let csv = '\uFEFF' + `Sondage: ${formTitle}\n\n`;
    
    questions.forEach(q => {
        csv += `Question: ${q.question_text}\n`;
        csv += `Utilisateur,Réponse,Date\n`;
        q.answers.forEach(a => {
            csv += `"${a.username}","${a.answer_text}","${a.date}"\n`;
        });
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    // Téléchargement du fichier
}
```

**Export PDF :**
```javascript
function downloadPDF() {
    const html = `<div>
        <h1>${formTitle}</h1>
        <table>...</table>
    </div>`;
    
    html2pdf().set({
        filename: `Rapport ${formTitle}.pdf`,
        jsPDF: { format: 'a4' }
    }).from(html).save();
}
```

---

## Sécurité

### 1. Authentification

#### Hachage des mots de passe
```php
// Inscription
$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

// Connexion
if (password_verify($password, $hashedPasswordFromDB)) {
    // Authentifié
}
```

#### Protection anti-bruteforce
```php
// login_check.php
$stmt = $pdo->prepare("SELECT * FROM login_attempts WHERE ip = ?");
$stmt->execute([$ip]);
$attempt = $stmt->fetch();

if ($attempt && $attempt['attempts'] >= 5) {
    $lockedUntil = new DateTime($attempt['locked_until']);
    if ($lockedUntil > new DateTime()) {
        echo json_encode(['success' => false, 'error' => 'Trop de tentatives']);
        exit;
    }
}

// Incrémenter les tentatives en cas d'échec
// Réinitialiser en cas de succès
```

---

### 2. Injection SQL

**Toujours utiliser des requêtes préparées :**
```php
// ❌ Vulnérable
$query = "SELECT * FROM user WHERE username = '$username'";

// ✅ Sécurisé
$stmt = $pdo->prepare("SELECT * FROM user WHERE username = ?");
$stmt->execute([$username]);
```

---

### 3. Validation des données

#### Côté serveur (PHP)
```php
// Vérifier que l'utilisateur existe
if (!isset($_POST['user_id']) || empty($_POST['user_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'user_id manquant']);
    exit;
}

// Vérifier la propriété
$stmt = $pdo->prepare("SELECT user_id FROM form WHERE id = ?");
$stmt->execute([$form_id]);
$form = $stmt->fetch();
if ($form['user_id'] != $user_id) {
    http_response_code(403);
    echo json_encode(['error' => 'Accès refusé']);
    exit;
}
```

#### Côté client (JavaScript)
```javascript
// Vérifier la connexion avant les requêtes
const userId = localStorage.getItem('user_id');
if (!userId) {
    alert('Vous devez être connecté');
    window.location.href = 'index.html';
    return;
}
```

---

### 4. Headers CORS

**Tous les endpoints PHP incluent :**
```php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE');
header('Access-Control-Allow-Headers: Content-Type');
```

---

### 5. Transactions SQL

**Pour garantir la cohérence des données :**
```php
try {
    $pdo->beginTransaction();
    
    // Insertion du formulaire
    $stmt = $pdo->prepare("INSERT INTO form (title, description, user_id) VALUES (?, ?, ?)");
    $stmt->execute([$title, $description, $user_id]);
    $form_id = $pdo->lastInsertId();
    
    // Insertion des questions
    foreach ($questions as $q) {
        // INSERT INTO question ...
        // INSERT INTO question_option ...
    }
    
    $pdo->commit();
} catch (Exception $e) {
    $pdo->rollBack();
    echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}
```

---

## Installation & Configuration

### Prérequis
- PHP 8.0+
- MySQL/MariaDB 10.4+
- Serveur web (Apache/Nginx)
- Extension PHP PDO_MYSQL

### Installation

1. **Cloner le projet**
```bash
git clone <repository-url>
cd google-form
```

2. **Importer la base de données**
```bash
mysql -u root -p < sql/google-form.sql
```

3. **Configurer la connexion MySQL**
Modifier les fichiers PHP (`php/*.php`) si nécessaire :
```php
$host = '127.0.0.1';
$db = 'google-form';
$user = 'root';
$password = '';
```

4. **Démarrer le serveur**
```bash
# Avec XAMPP : démarrer Apache et MySQL
# Ou avec PHP built-in server :
php -S localhost:8000
```

5. **Accéder à l'application**
```
http://localhost/google-form/html/index.html
```

### Configuration de production

1. **Variables d'environnement**
Créer un fichier `config.php` :
```php
<?php
define('DB_HOST', getenv('DB_HOST'));
define('DB_NAME', getenv('DB_NAME'));
define('DB_USER', getenv('DB_USER'));
define('DB_PASS', getenv('DB_PASS'));
```

2. **Désactiver les erreurs PHP**
```php
ini_set('display_errors', 0);
error_reporting(0);
```

3. **HTTPS**
Forcer HTTPS dans `.htaccess` :
```apache
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

4. **Sécurité des headers**
```php
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('X-XSS-Protection: 1; mode=block');
```

---

## Flux de données

### 1. Création d'un sondage

```
┌──────────┐      ┌──────────────┐      ┌──────────┐      ┌──────────┐
│ Client   │      │ create_      │      │ PHP      │      │ MySQL    │
│ (JS)     │      │ survey.js    │      │ Backend  │      │          │
└──────────┘      └──────────────┘      └──────────┘      └──────────┘
     │                    │                    │                 │
     │ 1. Remplir form    │                    │                 │
     │───────────────────>│                    │                 │
     │                    │                    │                 │
     │                    │ 2. POST JSON       │                 │
     │                    │───────────────────>│                 │
     │                    │                    │                 │
     │                    │                    │ 3. BEGIN TRANS  │
     │                    │                    │────────────────>│
     │                    │                    │                 │
     │                    │                    │ 4. INSERT form  │
     │                    │                    │────────────────>│
     │                    │                    │                 │
     │                    │                    │ 5. INSERT quest.│
     │                    │                    │────────────────>│
     │                    │                    │                 │
     │                    │                    │ 6. INSERT opts  │
     │                    │                    │────────────────>│
     │                    │                    │                 │
     │                    │                    │ 7. COMMIT       │
     │                    │                    │────────────────>│
     │                    │                    │                 │
     │                    │ 8. JSON response   │                 │
     │                    │<───────────────────│                 │
     │                    │                    │                 │
     │ 9. Redirect home   │                    │                 │
     │<───────────────────│                    │                 │
```

---

### 2. Répondre à un sondage

```
┌──────────┐      ┌──────────────┐      ┌──────────┐      ┌──────────┐
│ Client   │      │ questions.js │      │ PHP      │      │ MySQL    │
└──────────┘      └──────────────┘      └──────────┘      └──────────┘
     │                    │                    │                 │
     │ 1. GET /questions.html?form_id=5       │                 │
     │───────────────────>│                    │                 │
     │                    │                    │                 │
     │                    │ 2. Fetch questions │                 │
     │                    │───────────────────>│                 │
     │                    │                    │                 │
     │                    │                    │ 3. SELECT       │
     │                    │                    │────────────────>│
     │                    │                    │                 │
     │                    │ 4. JSON (questions)│                 │
     │                    │<───────────────────│                 │
     │                    │                    │                 │
     │ 5. Render inputs   │                    │                 │
     │<───────────────────│                    │                 │
     │                    │                    │                 │
     │ 6. Submit answers  │                    │                 │
     │───────────────────>│                    │                 │
     │                    │                    │                 │
     │                    │ 7. POST answer 1   │                 │
     │                    │───────────────────>│                 │
     │                    │                    │ 8. INSERT       │
     │                    │                    │────────────────>│
     │                    │                    │                 │
     │                    │ 9. POST answer 2   │                 │
     │                    │───────────────────>│                 │
     │                    │                    │ 10. INSERT      │
     │                    │                    │────────────────>│
     │                    │                    │                 │
     │ 11. Success msg    │                    │                 │
     │<───────────────────│                    │                 │
```

---

### 3. Visualisation des résultats

```
┌──────────┐      ┌──────────────┐      ┌──────────┐      ┌──────────┐
│ Client   │      │ answer.js    │      │ PHP      │      │ MySQL    │
└──────────┘      └──────────────┘      └──────────┘      └──────────┘
     │                    │                    │                 │
     │ 1. GET /answer.html?form_id=5          │                 │
     │───────────────────>│                    │                 │
     │                    │                    │                 │
     │                    │ 2. Fetch answers   │                 │
     │                    │───────────────────>│                 │
     │                    │                    │                 │
     │                    │                    │ 3. SELECT with  │
     │                    │                    │    JOINs        │
     │                    │                    │────────────────>│
     │                    │                    │                 │
     │                    │ 4. JSON (grouped)  │                 │
     │                    │<───────────────────│                 │
     │                    │                    │                 │
     │ 5. Render charts   │                    │                 │
     │<───────────────────│                    │                 │
     │    (Chart.js)      │                    │                 │
     │                    │                    │                 │
     │ 6. Calculate avg   │                    │                 │
     │    (for scale)     │                    │                 │
     │<───────────────────│                    │                 │
```

---

## Guide de développement

### Ajouter un nouveau type de question

1. **Modifier la base de données**
Le champ `type` accepte déjà des valeurs variées (VARCHAR(20)).

2. **Frontend - Création (`create_survey.html`)**
```html
<select class="form-select mb-2 question-type">
    <option value="text">Texte libre</option>
    <option value="multiple">Choix multiple</option>
    <option value="scale">Échelle (0-10)</option>
    <option value="nouveau_type">Nouveau type</option>
</select>
```

3. **Frontend - Affichage (`questions.js`)**
```javascript
if (q.type === 'nouveau_type') {
    // Créer l'interface pour ce type
    const customInput = document.createElement('input');
    customInput.type = 'date'; // exemple
    customInput.setAttribute('data-question-id', q.id);
    li.appendChild(customInput);
}
```

4. **Frontend - Soumission (`questions.js`)**
```javascript
// Récupérer les valeurs de ce nouveau type
const customInputs = document.querySelectorAll('input[type="date"][data-question-id]');
for (const input of customInputs) {
    const value = input.value;
    // Envoyer vers save_answer.php
}
```

5. **Backend - Visualisation (`answer.js`)**
```javascript
if (question.type === 'nouveau_type') {
    // Afficher un graphique spécifique ou statistiques
}
```

---

### Ajouter un endpoint API

1. **Créer le fichier PHP**
```php
<?php
// php/nouvelle_api.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Connexion DB
$host = '127.0.0.1';
$db = 'google-form';
$user = 'root';
$pass = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Logique métier
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validation
    if (!isset($data['param'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Paramètre manquant']);
        exit;
    }
    
    // Traitement
    $stmt = $pdo->prepare("SELECT * FROM table WHERE field = ?");
    $stmt->execute([$data['param']]);
    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['success' => true, 'data' => $result]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur serveur']);
}
?>
```

2. **Appeler depuis JavaScript**
```javascript
const response = await fetch('http://localhost/google-form/php/nouvelle_api.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ param: 'valeur' })
});
const result = await response.json();
```

---

### Tests

#### Tests manuels

1. **Créer un compte test**
```
Username: test_user
Password: Test123!
Email: test@example.com
```

2. **Créer un sondage de test**
- Titre: "Test Sondage"
- Question 1 (text): "Commentaires ?"
- Question 2 (multiple): "Couleur ?" → Options: Rouge, Vert, Bleu
- Question 3 (scale): "Note ?"

3. **Répondre au sondage**
- Se connecter avec un autre compte
- Répondre aux questions
- Vérifier l'enregistrement

4. **Visualiser les résultats**
- Se reconnecter avec le compte créateur
- Ouvrir la page Answer
- Vérifier les graphiques et statistiques

5. **Exporter**
- Télécharger CSV → Ouvrir dans Excel
- Télécharger PDF → Vérifier le contenu

---

### Debugging

#### Activer les logs PHP
```php
ini_set('display_errors', 1);
error_reporting(E_ALL);
```

#### Console JavaScript
```javascript
console.log('Question ID:', questionId);
console.log('Answer:', answer);
```

#### Inspecter les requêtes réseau
- Ouvrir DevTools (F12)
- Onglet Network
- Vérifier les requêtes fetch
- Examiner les réponses JSON

---

## Maintenance

### Sauvegarde de la base de données
```bash
mysqldump -u root -p google-form > backup_$(date +%Y%m%d).sql
```

### Nettoyage des tentatives de connexion
```sql
DELETE FROM login_attempts 
WHERE last_attempt < DATE_SUB(NOW(), INTERVAL 1 DAY);
```

### Analyse des performances
```sql
-- Réponses par utilisateur
SELECT u.username, COUNT(*) as nb_reponses
FROM answer a
JOIN user u ON a.user_id = u.id
GROUP BY u.username;

-- Sondages les plus populaires
SELECT f.title, COUNT(DISTINCT a.user_id) as nb_participants
FROM form f
JOIN question q ON f.id = q.form_id
JOIN answer a ON q.id = a.question_id
GROUP BY f.id
ORDER BY nb_participants DESC;
```

---

## Limites actuelles & Améliorations futures

### Limites
- Pas de gestion de sessions PHP (utilise localStorage côté client)
- Pas de limite sur le nombre de questions par sondage
- Pas de pagination pour les longues listes de réponses
- Pas de système de notification
- Pas de validation approfondie côté serveur

### Améliorations possibles
1. **Système de rôles** : Admin, Créateur, Répondant
2. **Questions conditionnelles** : Afficher Q2 seulement si réponse Q1 = "Oui"
3. **Templates de sondages** : Modèles prédéfinis
4. **Analytics avancés** : Tableau de bord avec statistiques
5. **API RESTful** : Restructuration complète en REST
6. **Websockets** : Résultats en temps réel
7. **Import/Export** : Importer des questions depuis Excel
8. **Thèmes personnalisables** : Dark mode, couleurs
9. **Multi-langue** : i18n
10. **Mobile app** : Application React Native

---

## Contacts & Support

- **Repository GitHub** : [lien vers le repo]
- **Documentation** : Ce fichier
- **Issues** : Ouvrir une issue sur GitHub

---

**Version** : 1.0.0  
**Dernière mise à jour** : 29 décembre 2025  
**Auteur** : [Votre nom]
