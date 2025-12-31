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
- Gérer les permissions d'accès (view, answer, admin)

### Technologies utilisées
- **Frontend** : HTML5, CSS3, JavaScript (Vanilla)
- **Backend** : PHP 8.x
- **Base de données** : MySQL/MariaDB
- **Frameworks CSS** : Bootstrap 5.3. 2
- **Bibliothèques** : 
  - Chart.js 4.4.0 (graphiques)
  - html2pdf.js 0.10.1 (export PDF)

---

## Architecture

### Structure des dossiers
```
google-form/
├── . github/            # Configuration GitHub
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
│   ├── register. js             # Inscription
│   ├── home.js                 # Liste des sondages
│   ├── create_survey.js        # Création dynamique de formulaires
│   ├── questions.js            # Affichage et soumission de réponses
│   ├── answer.js               # Visualisation et export
│   ├── share_survey.js         # Gestion du partage
│   └── navbar.js               # Navbar dynamique
├── php/                # API Backend
│   ├── config.php              # Configuration DB + chiffrement
│   ├── login_check.php         # Authentification
│   ├── register.php            # Inscription
│   ├── create_survey.php       # Création de sondages
│   ├── get_sondage. php         # Liste des sondages
│   ├── get_questions.php       # Questions d'un sondage
│   ├── save_answer.php         # Sauvegarde des réponses
│   ├── get_answer.php          # Récupération des réponses
│   ├── delete_survey. php       # Suppression de sondage
│   ├── share_survey.php        # Partage de sondage
│   ├── get_survey_access.php   # Liste des partages
│   ├── delete_survey_access.php # Suppression d'accès
│   ├── list_forms_owned. php    # Sondages possédés
│   └── migrate_encrypt.php     # Script de migration chiffrement
├── sql/                # Scripts SQL
│   ├── google-form.sql         # Structure complète
│   ├── question_data.sql       # Données de test
│   └── sondage_data.sql        # Données de test
├── style.css           # Styles personnalisés
├── logo.png            # Logo de l'application
├── todo.txt            # Liste des tâches
└── README.md           # Documentation utilisateur
```

---

## Base de données

### Schéma relationnel

#### Table `user`
Stocke les utilisateurs de l'application avec chiffrement des données sensibles.

```sql
CREATE TABLE `user` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `username` TEXT NOT NULL,          -- Chiffré (enc: v1:...)
  `username_hash` CHAR(64) UNIQUE,   -- HMAC-SHA256 pour recherche
  `password` VARCHAR(255) NOT NULL,  -- Hash bcrypt (password_hash)
  `email` TEXT,                      -- Chiffré (enc:v1:...)
  `email_hash` CHAR(64) UNIQUE       -- HMAC-SHA256 pour recherche
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Champs :**
- `id` : Identifiant unique
- `username` : Nom d'utilisateur (stocké chiffré en base)
- `username_hash` : Hash déterministe HMAC-SHA256 (permet `SELECT ...  WHERE username_hash = ? `)
- `password` : Mot de passe haché avec `password_hash()` (bcrypt)
- `email` : Adresse email (stockée chiffrée en base)
- `email_hash` : Hash déterministe HMAC-SHA256 (permet `SELECT ... WHERE email_hash = ?`)

**Sécurité :**
- Les données sensibles (username, email) sont chiffrées avec AES-256-CBC
- Les hashes permettent la recherche sans déchiffrement
- Le mot de passe utilise bcrypt (résistant aux attaques par force brute)

---

#### Table `form`
Représente les sondages/formulaires créés. 

```sql
CREATE TABLE `form` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `title` TEXT NOT NULL,            -- Chiffré (enc:v1:...)
  `description` TEXT,                -- Chiffré (enc: v1:...)
  `user_id` INT,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Champs :**
- `id` : Identifiant unique du formulaire
- `title` : Titre du sondage (stocké chiffré en base)
- `description` : Description optionnelle (stockée chiffrée en base)
- `user_id` : Propriétaire du formulaire (créateur)

---

#### Table `question`
Questions d'un formulaire avec support de différents types. 

```sql
CREATE TABLE `question` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `form_id` INT NOT NULL,
  `question_text` TEXT NOT NULL,      -- Chiffré (enc:v1:...)
  `type` VARCHAR(20) DEFAULT 'text',  -- 'text', 'multiple', 'scale'
  `anonymus` TINYINT(1) DEFAULT 0,    -- 0 = non anonyme, 1 = anonyme
  FOREIGN KEY (`form_id`) REFERENCES `form`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Types de questions :**
- `text` : Texte libre (textarea)
- `multiple` : Choix multiples avec checkboxes
- `scale` : Échelle de notation (0-10)

**Champ `anonymus` :**
- Si activé (1), les réponses masquent l'identité de l'utilisateur dans les résultats
- Permet de collecter des feedbacks sensibles sans attribution

---

#### Table `question_option`
Options pour les questions à choix multiples.

```sql
CREATE TABLE `question_option` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `question_id` INT NOT NULL,
  `option_text` TEXT NOT NULL,      -- Chiffré (enc:v1:...)
  FOREIGN KEY (`question_id`) REFERENCES `question`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Usage :**
- Utilisé uniquement pour les questions de type `multiple`
- Chaque option représente un choix possible

---

#### Table `answer`
Réponses aux questions des utilisateurs.

```sql
CREATE TABLE `answer` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `question_id` INT NOT NULL,
  `user_id` INT,
  `answer_text` TEXT NOT NULL,      -- Chiffré (enc:v1:...)
  `answered_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`question_id`) REFERENCES `question`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Champs :**
- `answer_text` : 
  - Texte libre pour type `text`
  - Valeur(s) séparées par virgule pour `multiple` (ex: "Option 1, Option 3")
  - Nombre de 0 à 10 pour type `scale`
- `answered_at` : Timestamp de soumission

**Note chiffrement :** `answer_text` est stocké chiffré en base (format `enc:v1:...`) et déchiffré côté API avant d'être renvoyé au frontend.

---

#### Table `survey_access`
Gestion des permissions de partage (ACL - Access Control List).

```sql
CREATE TABLE `survey_access` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `form_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `access_type` ENUM('view','answer','admin') DEFAULT 'answer',
  UNIQUE KEY (`form_id`, `user_id`),
  FOREIGN KEY (`form_id`) REFERENCES `form`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Types d'accès :**
- `view` : Voir les résultats uniquement (lecture seule)
- `answer` : Répondre au sondage (participation)
- `admin` : Gérer le sondage (partager avec d'autres, modifier)

**Note :** Le créateur (propriétaire) a automatiquement tous les droits sans entrée dans cette table.

---

#### Table `login_attempts`
Protection anti-bruteforce par IP. 

```sql
CREATE TABLE `login_attempts` (
  `ip` VARCHAR(45) PRIMARY KEY,
  `attempts` INT DEFAULT 0,
  `last_attempt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `locked_until` DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Logique :**
- Après 5 tentatives échouées, blocage de 15 minutes
- Réinitialisation après connexion réussie

---

## API Backend (PHP)

### Configuration centrale (`php/config.php`)

**Connexion base de données :**
```php
$host = 'localhost';
$db = 'google-form';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO:: ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];
```

**Fonctions de chiffrement :**
- `encryptData($data)` : Chiffre avec AES-256-CBC + IV aléatoire
- `decryptData($encryptedData)` : Déchiffre les données
- `lookupHash($value)` : Génère un hash HMAC-SHA256 déterministe pour la recherche

**Configuration clé de chiffrement :**
```php
define('ENCRYPTION_KEY', getenv('GOOGLEFORM_ENCRYPTION_KEY') ?: 'gogleform_secret_key_2025_encryption_aes256_secure_production');
```

---

### 1. Authentification

#### `POST /php/login_check.php`
Authentifie un utilisateur avec protection anti-bruteforce.

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
  "user":  {
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
- Vérification anti-bruteforce (table `login_attempts`)
- Mot de passe vérifié avec `password_verify()`
- Blocage IP après 5 tentatives échouées (15 minutes)

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
- Username :  3-30 caractères alphanumériques + underscore
- Email : format valide
- Mot de passe : minimum 6 caractères
- Vérification unicité via `username_hash` et `email_hash`
- Chiffrement automatique des données

---

### 2. Gestion des sondages

#### `POST /php/create_survey.php`
Crée un nouveau sondage avec ses questions (transaction SQL).

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
      "anonymus":  false
    },
    {
      "text":  "Commentaires",
      "type": "text",
      "anonymus":  true
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
- Insertion du formulaire (chiffrement du titre/description)
- Insertion des questions (chiffrement du texte)
- Insertion des options pour type `multiple` (chiffrement)

---

#### `POST /php/get_sondage.php`
Liste des sondages disponibles pour l'utilisateur avec statut de réponse.

**Requête :**
```json
{
  "user_id": 1
}
```

**Réponse :**
```json
[
  {
    "id":  5,
    "title": "Sondage satisfaction",
    "description": ".. .",
    "user_id": 1,
    "answered":  0,
    "user_role": "owner"
  },
  {
    "id": 6,
    "title": "Feedback produit",
    "description": "...",
    "user_id": 2,
    "answered": 1,
    "user_role":  "answer"
  }
]
```

**Logique :**
- Déchiffrement automatique des titres/descriptions
- Champ `answered` : 1 si déjà répondu, 0 sinon
- Champ `user_role` : "owner", "view", "answer", "admin" selon les permissions
- Inclut les sondages partagés via `survey_access`

---

#### `GET /php/get_questions.php? form_id=5`
Questions d'un sondage spécifique avec options.

**Réponse :**
```json
[
  {
    "id": 12,
    "question_text":  "Quelle est votre couleur préférée ?",
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
- Suppression en cascade (questions, options, réponses, accès)

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

**Traitement :**
- Chiffrement automatique de `answer_text`
- Authentification obligatoire

---

#### `GET /php/get_answer.php?form_id=5&user_id=1`
Récupère toutes les réponses d'un sondage avec statistiques.

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
      "anonymus":  0,
      "answers": [
        {
          "username": "admin",
          "answer_text":  "Rouge, Bleu",
          "answered_at": "2025-12-29 10:30:00",
          "user_masked": false
        }
      ]
    }
  ]
}
```

**Sécurité :**
- Accessible uniquement au propriétaire ou utilisateurs avec accès `view`/`admin`
- Déchiffrement automatique des questions et réponses
- Les réponses anonymes masquent le `username` (remplacé par `null`)
- Code HTTP 403 si accès refusé

---

### 4. Partage

#### `POST /php/share_survey.php`
Partage un sondage avec un utilisateur.

**Requête :**
```json
{
  "form_id": 5,
  "username": "autre_user",
  "access_type":  "view",
  "user_id": 1
}
```

**Validations :**
- Seul le propriétaire peut partager
- Types d'accès valides : "view", "answer", "admin"
- Vérification existence de l'utilisateur cible

---

#### `POST /php/get_survey_access.php`
Liste des utilisateurs ayant accès au sondage.

**Requête :**
```json
{
  "form_id": 5,
  "user_id": 1
}
```

**Réponse :**
```json
[
  {
    "user_id": 3,
    "username": "alice",
    "email": "alice@example.com",
    "access_type": "view"
  }
]
```

---

#### `POST /php/delete_survey_access.php`
Révoque l'accès d'un utilisateur. 

**Requête :**
```json
{
  "form_id": 5,
  "user_id": 1,
  "target_user_id": 3
}
```

---

#### `POST /php/list_forms_owned.php`
Sondages créés par l'utilisateur. 

**Requête :**
```json
{
  "user_id": 1
}
```

**Usage :** Interface de sélection pour le partage.

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
    headers:  { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
});
const result = await response.json();
if (result.success) {
    localStorage.setItem('user_id', result.user.id);
    localStorage.setItem('username', result. user.username);
    window.location.href = 'home. html';
}
```

**Gestion des erreurs :**
- Message d'erreur affiché dynamiquement
- Gestion du blocage anti-bruteforce (code 429)

---

#### 2. Navbar dynamique (`navbar.js`)

**Logique :**
- Chargement asynchrone de `navbar.html`
- Si `user_id` existe → afficher "Create", "Share", "Logout", "Bonjour, {username}"
- Sinon → afficher "Register", "Login"

**Chargement :**
```javascript
async function loadNavbar() {
    const response = await fetch('navbar.html');
    const navbarHTML = await response.text();
    document.body.insertAdjacentHTML('afterbegin', navbarHTML);
    renderNavbarUserActions();
}
```

**Déconnexion :**
```javascript
function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}
```

---

#### 3. Création de sondages (`create_survey.js`)

**Fonctionnalités :**
- Ajout dynamique de questions (auto-ajout quand un seul champ vide reste)
- Sélection du type (text/multiple/scale)
- Ajout automatique d'options pour les choix multiples
- Checkbox "Rendre anonyme" par question

**Gestion dynamique des inputs :**
```javascript
function checkAndAddQuestionBlock() {
    const allQuestions = questionsContainer.querySelectorAll('. question-field');
    const emptyQuestions = Array.from(allQuestions)
        .filter(input => input.value.trim() === '');
    
    if (emptyQuestions.length === 1) {
        // Créer un nouveau bloc de question
        createNewQuestionBlock();
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
        const optionInputs = block.querySelectorAll('.option-field');
        optionInputs. forEach(input => {
            const optValue = input.value.trim();
            if (optValue) options.push(optValue);
        });
    }
    
    if (text) {
        questions.push({ text, type, anonymus, options });
    }
});

// Envoi vers create_survey.php
await fetch('http://localhost/google-form/php/create_survey. php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id, title, description, questions })
});
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
questionContainer.appendChild(textarea);
```

##### Type `multiple` :
```javascript
q.options.forEach((option, index) => {
    const div = document.createElement('div');
    div.className = 'form-check';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'form-check-input';
    checkbox.value = option;
    checkbox.setAttribute('data-question-id', q.id);
    checkbox.id = `q${q.id}_opt${index}`;
    
    const label = document.createElement('label');
    label.className = 'form-check-label';
    label.htmlFor = checkbox. id;
    label.textContent = option;
    
    div.appendChild(checkbox);
    div.appendChild(label);
    questionContainer.appendChild(div);
});
```

##### Type `scale` :
```javascript
const scaleContainer = document.createElement('div');
scaleContainer.className = 'd-flex gap-2 mt-3 flex-wrap justify-content-center';

for (let i = 0; i <= 10; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-outline-primary scale-btn';
    btn.textContent = i;
    btn. setAttribute('data-question-id', q.id);
    btn.setAttribute('data-value', i);
    btn.style.width = '45px';
    btn.style. height = '45px';
    
    btn.addEventListener('click', function() {
        // Désélectionner tous les autres boutons
        scaleContainer.querySelectorAll('. scale-btn').forEach(b => {
            b.classList.remove('active', 'btn-primary');
            b.classList.add('btn-outline-primary');
        });
        // Sélectionner ce bouton
        this.classList. remove('btn-outline-primary');
        this.classList.add('active', 'btn-primary');
    });
    
    scaleContainer.appendChild(btn);
}
```

**Soumission des réponses :**
```javascript
// Textareas (texte libre)
const textareas = document.querySelectorAll('textarea[data-question-id]');
for (const textarea of textareas) {
    const questionId = textarea.getAttribute('data-question-id');
    const answer = textarea.value.trim();
    
    if (answer) {
        await fetch('http://localhost/google-form/php/save_answer.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body:  JSON.stringify({ 
                question_id: questionId, 
                answer_text:  answer, 
                user_id 
            })
        });
    }
}

// Checkboxes (choix multiples) - grouper par question
const questionIds = new Set();
document.querySelectorAll('input[type="checkbox"][data-question-id]')
    .forEach(cb => questionIds.add(cb. getAttribute('data-question-id')));

for (const qId of questionIds) {
    const checkboxes = document.querySelectorAll(
        `input[type="checkbox"][data-question-id="${qId}"]`
    );
    const selectedValues = Array.from(checkboxes)
        .filter(cb => cb. checked)
        .map(cb => cb.value);
    
    if (selectedValues.length > 0) {
        const combinedAnswer = selectedValues.join(', ');
        await fetch('http://localhost/google-form/php/save_answer.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                question_id: qId, 
                answer_text: combinedAnswer, 
                user_id 
            })
        });
    }
}

// Scale buttons
const scaleButtons = document. querySelectorAll('.scale-btn. active');
for (const btn of scaleButtons) {
    const questionId = btn.getAttribute('data-question-id');
    const value = btn.getAttribute('data-value');
    
    await fetch('http://localhost/google-form/php/save_answer.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            question_id: questionId, 
            answer_text: value, 
            user_id 
        })
    });
}
```

---

#### 5. Visualisation des résultats (`answer. js`)

**Chargement des données :**
```javascript
async function loadAnswers(formId, userId) {
    const response = await fetch(
        `../php/get_answer.php?form_id=${formId}&user_id=${userId}`
    );
    const data = await response.json();
    
    if (data.success) {
        answerTitle.textContent = `Réponses - ${data.form_title}`;
        window.allQuestionsData = data.questions;
        renderAnswers(window.allQuestionsData, '');
    }
}
```

**Recherche dynamique :**
```javascript
usernameSearch.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    renderAnswers(window.allQuestionsData, searchTerm);
});

function renderAnswers(questions, searchTerm = '') {
    questions.forEach(question => {
        const filteredAnswers = question.answers.filter(answer => {
            if (! searchTerm) return true;
            const username = (answer.username || '').toLowerCase();
            return username.includes(searchTerm);
        });
        
        // Affichage selon le type de question
        if (question.type === 'multiple') {
            createPieChart(question.id, filteredAnswers);
        } else if (question.type === 'scale') {
            calculateAverage(filteredAnswers);
        } else {
            displayTextAnswers(filteredAnswers);
        }
    });
}
```

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
    
    const canvas = document.getElementById(`chart-${canvasId}`);
    new Chart(canvas, {
        type: 'pie',
        data: {
            labels: Object. keys(answerCounts),
            datasets: [{
                data:  Object.values(answerCounts),
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
                    '#9966FF', '#FF9F40', '#FF6384'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' },
                title: { 
                    display: true, 
                    text: 'Distribution des réponses' 
                }
            }
        }
    });
}
```

##### Moyenne (type `scale`) :
```javascript
function calculateAverage(answers) {
    const values = answers
        .map(a => parseFloat(a.answer_text))
        .filter(v => ! isNaN(v));
    
    if (values.length === 0) return 'N/A';
    
    const average = (values.reduce((sum, v) => sum + v, 0) / values.length)
        .toFixed(2);
    
    return `${average} / 10 (${values.length} réponses)`;
}
```

**Export CSV :**
```javascript
function downloadCSV() {
    // BOM UTF-8 pour Excel
    let csv = '\uFEFF' + `Sondage:  ${formTitle}\n\n`;
    
    window.allQuestionsData.forEach(q => {
        csv += `\nQuestion: ${q.question_text}\n`;
        csv += `Type: ${q.type}\n`;
        csv += `Anonyme: ${q.anonymus ? 'Oui' : 'Non'}\n`;
        csv += `Utilisateur,Réponse,Date\n`;
        
        q.answers.forEach(a => {
            const username = a.username || 'Anonyme';
            const answer = a.answer_text. replace(/"/g, '""'); // Échapper les guillemets
            const date = new Date(a.answered_at).toLocaleString('fr-FR');
            csv += `"${username}","${answer}","${date}"\n`;
        });
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Rapport_${formTitle}_${Date.now()}.csv`;
    link.click();
}
```

**Export PDF :**
```javascript
function downloadPDF() {
    let html = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h1 style="text-align: center;">${formTitle}</h1>
            <p style="text-align: center; color: #666;">
                Rapport généré le ${new Date().toLocaleDateString('fr-FR')}
            </p>
    `;
    
    window.allQuestionsData.forEach(q => {
        html += `
            <div style="margin-top: 30px; page-break-inside: avoid;">
                <h3>${q.question_text}</h3>
                <p><strong>Type:</strong> ${q.type} | 
                   <strong>Anonyme:</strong> ${q.anonymus ? 'Oui' : 'Non'}</p>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr style="background: #f5f5f5;">
                        <th style="border: 1px solid #ddd; padding: 8px;">Utilisateur</th>
                        <th style="border: 1px solid #ddd; padding: 8px;">Réponse</th>
                        <th style="border: 1px solid #ddd; padding: 8px;">Date</th>
                    </tr>
        `;
        
        q.answers.forEach(a => {
            html += `
                <tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">
                        ${a.username || 'Anonyme'}
                    </td>
                    <td style="border: 1px solid #ddd; padding: 8px;">
                        ${a.answer_text}
                    </td>
                    <td style="border: 1px solid #ddd; padding: 8px;">
                        ${new Date(a.answered_at).toLocaleString('fr-FR')}
                    </td>
                </tr>
            `;
        });
        
        html += `</table></div>`;
    });
    
    html += '</div>';
    
    html2pdf().set({
        filename: `Rapport_${formTitle}_${Date.now()}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { format: 'a4', orientation: 'portrait' }
    }).from(html).save();
}
```

---

#### 6. Partage de sondages (`share_survey.js`)

**Chargement des sondages possédés :**
```javascript
async function fetchOwnedForms() {
    const response = await fetch(
        'http://localhost/google-form/php/list_forms_owned.php',
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId })
        }
    );
    const data = await response.json();
    
    formSelect.innerHTML = '<option value="">-- Sélectionnez un sondage --</option>';
    data.forEach(form => {
        const opt = document.createElement('option');
        opt.value = form.id;
        opt.textContent = form.title;
        formSelect. appendChild(opt);
    });
}
```

**Partage avec un utilisateur :**
```javascript
shareForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formId = formSelect.value;
    const targetUsername = document.getElementById('targetUsername').value;
    const accessType = document.getElementById('accessType').value;
    
    const response = await fetch(
        'http://localhost/google-form/php/share_survey.php',
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                form_id: formId, 
                username: targetUsername, 
                access_type: accessType, 
                user_id: userId 
            })
        }
    );
    
    const result = await response.json();
    
    if (result.success) {
        showMessage('Accès ajouté/modifié avec succès', 'success');
        fetchShares(formId); // Rafraîchir la liste
    } else {
        showMessage(result.error || 'Erreur lors du partage', 'danger');
    }
});
```

**Gestion des accès existants :**
```javascript
async function fetchShares(formId) {
    const response = await fetch(
        'http://localhost/google-form/php/get_survey_access.php',
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON. stringify({ form_id: formId, user_id: userId })
        }
    );
    const accesses = await response.json();
    
    shareList.innerHTML = '';
    accesses.forEach(access => {
        const item = document.createElement('div');
        item.className = 'list-group-item d-flex justify-content-between';
        
        item.innerHTML = `
            <div>
                <strong>${access. username}</strong>
                <span class="text-muted">(${access.email || 'pas d\'email'})</span>
            </div>
            <div>
                <span class="badge bg-secondary">${access.access_type}</span>
                <button class="btn btn-sm btn-outline-danger ms-2" 
                        onclick="revokeAccess(${formId}, ${access.user_id})">
                    Retirer
                </button>
            </div>
        `;
        
        shareList.appendChild(item);
    });
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

**Algorithme :** bcrypt (via `PASSWORD_DEFAULT`)

---

#### Protection anti-bruteforce
```php
// login_check.php
$stmt = $pdo->prepare('SELECT attempts, locked_until FROM login_attempts WHERE ip = ?');
$stmt->execute([$ip]);
$attempt = $stmt->fetch();

if ($attempt && $attempt['attempts'] >= 5) {
    $lockedUntil = new DateTime($attempt['locked_until']);
    if ($lockedUntil > new DateTime()) {
        http_response_code(429);
        echo json_encode([
            'success' => false, 
            'error' => 'Trop de tentatives. Réessayez plus tard.'
        ]);
        exit;
    }
}

// Incrémenter les tentatives en cas d'échec
if (! $loginSuccess) {
    $pdo->prepare('INSERT INTO login_attempts (ip, attempts, locked_until) 
                   VALUES (?, 1, DATE_ADD(NOW(), INTERVAL 15 MINUTE))
                   ON DUPLICATE KEY UPDATE 
                   attempts = attempts + 1,
                   locked_until = IF(attempts >= 4, DATE_ADD(NOW(), INTERVAL 15 MINUTE), locked_until)')
        ->execute([$ip]);
}

// Réinitialiser en cas de succès
if ($loginSuccess) {
    $pdo->prepare('DELETE FROM login_attempts WHERE ip = ? ')->execute([$ip]);
}
```

---

### 2. Injection SQL

**Toujours utiliser des requêtes préparées :**
```php
// ✅ Sécurisé
$stmt = $pdo->prepare('SELECT * FROM user WHERE username_hash = ?');
$stmt->execute([lookupHash($username)]);
$result = $stmt->fetch();
```

---

### 3. Validation des données

#### Côté serveur (PHP)
```php
// Vérifier l'authentification
if (!isset($_POST['user_id']) || empty($_POST['user_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'user_id manquant']);
    exit;
}

// Vérifier la propriété du sondage
$stmt = $pdo->prepare('SELECT user_id FROM form WHERE id = ?');
$stmt->execute([$form_id]);
$form = $stmt->fetch();

if (!$form) {
    http_response_code(404);
    echo json_encode(['error' => 'Formulaire introuvable']);
    exit;
}

if (intval($form['user_id']) !== intval($user_id)) {
    http_response_code(403);
    echo json_encode(['error' => 'Accès refusé']);
    exit;
}

// Validation format username
if (!preg_match('/^[a-zA-Z0-9_]{3,30}$/', $username)) {
    http_response_code(400);
    echo json_encode(['error' => 'Nom d\'utilisateur invalide']);
    exit;
}

// Validation email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Email invalide']);
    exit;
}

// Validation longueur réponse
if (strlen($answer_text) < 1 || strlen($answer_text) > 1000) {
    http_response_code(400);
    echo json_encode(['error' => 'Réponse vide ou trop longue (max 1000 caractères)']);
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

// Validation formulaire
if (!title || title.trim() === '') {
    alert('Le titre est obligatoire');
    return;
}

// Validation questions non vides
const validQuestions = questions.filter(q => q.text.trim() !== '');
if (validQuestions.length === 0) {
    alert('Ajoutez au moins une question');
    return;
}
```

---

### 4. Headers CORS

**Tous les fichiers PHP incluent :**
```php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // À restreindre en production
header('Access-Control-Allow-Methods: GET, POST, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

// Gestion de la requête OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
```

> **Production :** Remplacer `*` par le domaine spécifique de l'application. 

---

### 5. Chiffrement des données (au repos)

Le projet chiffre les champs sensibles **avant l'écriture en base** (AES-256-CBC) et les déchiffre côté API à la lecture.

**Format de stockage :** `enc: v1:<base64(iv|ciphertext)>`

**Fonctions :** `encryptData()`, `decryptData()`, `lookupHash()` dans `php/config.php`

**Champs chiffrés :**
- `user. username` / `user.email`
- `form.title` / `form.description`
- `question.question_text`
- `question_option.option_text`
- `answer.answer_text`

**Recherche avec hashes :**
```php
// Impossible de faire WHERE sur texte chiffré (IV aléatoire)
// Solution : colonnes de hash déterministe

// Insertion
$usernameHash = lookupHash($username);
$encryptedUsername = encryptData($username);
$stmt = $pdo->prepare('INSERT INTO user (username, username_hash, .. .) VALUES (?, ?, ...)');
$stmt->execute([$encryptedUsername, $usernameHash, ...]);

// Recherche
$usernameHash = lookupHash($searchUsername);
$stmt = $pdo->prepare('SELECT * FROM user WHERE username_hash = ?');
$stmt->execute([$usernameHash]);
```

**Migration progressive :**
- Script `php/migrate_encrypt.php` pour chiffrer les données existantes

**Algorithme :**
- **Chiffrement** : AES-256-CBC avec IV aléatoire (16 octets)
- **Clé** : Dérivée de `ENCRYPTION_KEY` via SHA-256
- **Lookup** :  HMAC-SHA-256 de la valeur normalisée (lowercase, trim)

```php
function encryptData($data) {
    if ($data === null || $data === '') return $data;
    
    $key = hash('sha256', ENCRYPTION_KEY, true);
    $ivLength = openssl_cipher_iv_length(ENCRYPTION_ALGORITHM);
    $iv = random_bytes($ivLength);
    
    $ciphertext = openssl_encrypt($data, ENCRYPTION_ALGORITHM, $key, OPENSSL_RAW_DATA, $iv);
    return ENCRYPTION_PREFIX_V1 . base64_encode($iv .  $ciphertext);
}

function decryptData($encryptedData) {
    if (!is_string($encryptedData) || strpos($encryptedData, ENCRYPTION_PREFIX_V1) !== 0) {
        return $encryptedData; // Rétro-compatibilité
    }
    
    $payloadB64 = substr($encryptedData, strlen(ENCRYPTION_PREFIX_V1));
    $payload = base64_decode($payloadB64, true);
    
    $key = hash('sha256', ENCRYPTION_KEY, true);
    $ivLength = openssl_cipher_iv_length(ENCRYPTION_ALGORITHM);
    
    $iv = substr($payload, 0, $ivLength);
    $ciphertext = substr($payload, $ivLength);
    
    return openssl_decrypt($ciphertext, ENCRYPTION_ALGORITHM, $key, OPENSSL_RAW_DATA, $iv);
}

function lookupHash(string $value): string {
    return hash_hmac('sha256', strtolower(trim($value)), ENCRYPTION_KEY);
}
```

---

### 6. Transactions SQL

**Pour garantir la cohérence des données :**
```php
try {
    $pdo->beginTransaction();
    
    // 1. Insertion du formulaire
    $stmt = $pdo->prepare('INSERT INTO form (title, description, user_id) VALUES (?, ?, ?)');
    $stmt->execute([encryptData($title), encryptData($description), $user_id]);
    $form_id = $pdo->lastInsertId();
    
    // 2. Insertion des questions
    foreach ($questions as $q) {
        $stmtQ = $pdo->prepare('INSERT INTO question (form_id, question_text, type, anonymus) VALUES (?, ?, ?, ?)');
        $stmtQ->execute([$form_id, encryptData($q['text']), $q['type'], $q['anonymus'] ?  1 : 0]);
        $question_id = $pdo->lastInsertId();
        
        // 3. Insertion des options (si type multiple)
        if ($q['type'] === 'multiple' && !empty($q['options'])) {
            $stmtOpt = $pdo->prepare('INSERT INTO question_option (question_id, option_text) VALUES (?, ?)');
            foreach ($q['options'] as $opt) {
                $stmtOpt->execute([$question_id, encryptData($opt)]);
            }
        }
    }
    
    $pdo->commit();
    echo json_encode(['success' => true, 'form_id' => $form_id]);
    
} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}
```

**Avantages :**
- Atomicité :  tout ou rien
- Évite les états incohérents (formulaire sans questions, questions sans options)

---

### 7. Protection XSS (Cross-Site Scripting)

**Côté frontend :**
```javascript
// Utiliser textContent au lieu de innerHTML
element.textContent = userInput; // ✅ Échappe automatiquement

// Si innerHTML nécessaire, échapper manuellement
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
element.innerHTML = escapeHtml(userInput);
```

**Côté backend :**
```php
// JSON encode échappe automatiquement
echo json_encode(['username' => $username]); // ✅ Sécurisé

// Pour affichage HTML (si nécessaire)
echo htmlspecialchars($userInput, ENT_QUOTES, 'UTF-8');
```

---

## Installation & Configuration

### Prérequis
- PHP 8.0+ avec extensions : 
  - `pdo_mysql`
  - `openssl` (pour le chiffrement)
  - `mbstring`
- MySQL/MariaDB 10.4+
- Serveur web (Apache/Nginx)
- Navigateur moderne (Chrome, Firefox, Edge)

### Installation

#### 1. Cloner le projet
```bash
git clone https://github.com/Da-Mizu/google-form. git
cd google-form
```

#### 2. Importer la base de données
```bash
# Se connecter à MySQL
mysql -u root -p

# Créer la base
CREATE DATABASE `google-form` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

# Importer la structure
mysql -u root -p google-form < sql/google-form.sql

# (Optionnel) Importer les données de test
mysql -u root -p google-form < sql/sondage_data.sql
mysql -u root -p google-form < sql/question_data.sql
```

#### 3. Configurer la connexion MySQL
Modifier `php/config.php` si nécessaire :
```php
$host = 'localhost';
$db = 'google-form';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';
```

#### 4. Démarrer le serveur

**Avec XAMPP :**
1. Placer le projet dans `C:\xampp\htdocs\google-form`
2. Démarrer Apache et MySQL depuis XAMPP Control Panel
3. Accéder à `http://localhost/google-form/html/index.html`

#### 5. Vérifier l'installation
- Accéder à la page de connexion
- Créer un compte (Register)
- Se connecter
- Créer un sondage test
- Répondre au sondage
- Visualiser les résultats

---

## Flux de données

### 1. Création d'un sondage

```
┌──────────┐      ┌──────────────┐      ┌──────────┐      ┌──────────┐
│ Client   │      │ create_      │      │ PHP      │      │ MySQL    │
│ (JS)     │      │ survey. js    │      │ Backend  │      │          │
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
     │                    │                    │   (chiffré)     │
     │                    │                    │────────────────>│
     │                    │                    │                 │
     │                    │                    │ 5. INSERT quest. │
     │                    │                    │   (chiffré)     │
     │                    │                    │────────────────>│
     │                    │                    │                 │
     │                    │                    │ 6. INSERT opts  │
     │                    │                    │   (chiffré)     │
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
     │ 1. GET /questions. html? form_id=5        │                 │
     │───────────────────>│                    │                 │
     │                    │                    │                 │
     │                    │ 2. Fetch questions │                 │
     │                    │───────────────────>│                 │
     │                    │                    │ 3. SELECT       │
     │                    │                    │────────────────>│
     │                    │                    │                 │
     │                    │ 4. JSON (déchiffré)│                 │
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
     │                    │                    │   (chiffré)     │
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
│ Client   │      │ answer. js    │      │ PHP      │      │ MySQL    │
└──────────┘      └──────────────┘      └──────────┘      └──────────┘
     │                    │                    │                 │
     │ 1. GET /answer.html?form_id=5           │                 │
     │───────────────────>│                    │                 │
     │                    │                    │                 │
     │                    │ 2. Fetch answers   │                 │
     │                    │───────────────────>│                 │
     │                    │                    │ 3.  Vérif owner  │
     │                    │                    │────────────────>│
     │                    │                    │                 │
     │                    │                    │ 4. SELECT Q+A   │
     │                    │                    │────────────────>│
     │                    │                    │                 │
     │                    │ 5. JSON (déchiffré)│                 │
     │                    │<───────────────────│                 │
     │                    │                    │                 │
     │ 6. Render charts   │                    │                 │
     │ + statistics       │                    │                 │
     │<───────────────────│                    │                 │
     │                    │                    │                 │
     │ 7. Export CSV/PDF  │                    │                 │
     │───────────────────>│                    │                 │
     │                    │                    │                 │
     │ 8. Download file   │                    │                 │
     │<───────────────────│                    │                 │
```

---

### 4. Partage de sondage

```
┌──────────┐      ┌──────────────┐      ┌──────────┐      ┌──────────┐
│ Owner    │      │ share_       │      │ PHP      │      │ MySQL    │
│          │      │ survey.js    │      │          │      │          │
└──────────┘      └──────────────┘      └──────────┘      └──────────┘
     │                    │                    │                 │
     │ 1. Select form     │                    │                 │
     │───────────────────>│                    │                 │
     │                    │ 2. Fetch forms     │                 │
     │                    │───────────────────>│                 │
     │                    │                    │ 3. SELECT owned │
     │                    │                    │────────────────>│
     │                    │                    │                 │
     │                    │ 4. List forms      │                 │
     │                    │<───────────────────│                 │
     │                    │                    │                 │
     │ 5. Add access      │                    │                 │
     │ (user+rights)      │                    │                 │
     │───────────────────>│                    │                 │
     │                    │ 6. POST share      │                 │
     │                    │───────────────────>│                 │
     │                    │                    │ 7. Vérif owner  │
     │                    │                    │────────────────>│
     │                    │                    │                 │
     │                    │                    │ 8. Find user    │
     │                    │                    │────────────────>│
     │                    │                    │                 │
     │                    │                    │ 9. INSERT/UPDATE│
     │                    │                    │   survey_access │
     │                    │                    │────────────────>│
     │                    │                    │                 │
     │                    │ 10. Success        │                 │
     │                    │<───────────────────│                 │
     │                    │                    │                 │
     │ 11. Refresh list   │                    │                 │
     │<───────────────────│                    │                 │
```

---

## Guide de développement

### Structure de code recommandée

#### Ajouter un nouveau type de question

**1. Modifier la base de données**
```sql
-- Ajouter une valeur ENUM si nécessaire
ALTER TABLE question MODIFY type VARCHAR(20);
-- Ex: pour ajouter 'date', 'file', 'matrix', etc.
```

**2. Backend - `create_survey.php`**
```php
// Valider le nouveau type
$validTypes = ['text', 'multiple', 'scale', 'date']; // Ajouter 'date'
if (!in_array($q['type'], $validTypes)) {
    throw new Exception('Type de question invalide');
}
```

**3. Frontend - `create_survey.html`**
```html
<select class="form-select question-type">
    <option value="text">Texte libre</option>
    <option value="multiple">Choix multiple</option>
    <option value="scale">Échelle (0-10)</option>
    <option value="date">Date</option> <!-- Nouveau -->
</select>
```

**4. Frontend - `questions.js`**
```javascript
// Rendu du nouveau type
if (q.type === 'date') {
    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.className = 'form-control mt-2';
    dateInput. setAttribute('data-question-id', q.id);
    questionContainer.appendChild(dateInput);
}
```

**5. Frontend - `answer.js`**
```javascript
// Visualisation des résultats
if (question.type === 'date') {
    // Afficher timeline ou distribution temporelle
    renderDateDistribution(question.answers);
}
```

---

### Ajouter un nouvel endpoint API

**Template standard :**
```php
<?php
require_once 'config.php';

// Headers CORS
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$pdo = getPDOConnection();

// Récupérer les données
$input = json_decode(file_get_contents('php://input'), true);
$user_id = isset($input['user_id']) ? intval($input['user_id']) : null;

// Validation
if (!$user_id || $user_id <= 0) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentification requise']);
    exit;
}

try {
    // Logique métier
    $stmt = $pdo->prepare('SELECT ...  WHERE user_id = ? ');
    $stmt->execute([$user_id]);
    $data = $stmt->fetchAll();
    
    // Déchiffrement si nécessaire
    foreach ($data as &$item) {
        $item['sensitive_field'] = decryptData($item['sensitive_field']);
    }
    
    echo json_encode(['success' => true, 'data' => $data]);
    
} catch (PDOException $e) {
    error_log('Erreur DB: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Erreur serveur']);
}
```

---

### Bonnes pratiques

#### 1. Gestion des erreurs

**Côté backend :**
```php
// Logs détaillés (pas exposés au client)
error_log('Migration failed for user ' . $userId . ': ' . $e->getMessage());

// Réponse générique au client (sécurité)
echo json_encode(['error' => 'Erreur serveur']);
```

**Côté frontend :**
```javascript
try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (! response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
    }
    
    // Traitement... 
    
} catch (error) {
    console.error('Erreur:', error);
    alert('Une erreur est survenue:  ' + error.message);
}
```

---

#### 2. Tests manuels

**Checklist pour chaque fonctionnalité :**
```bash
# 1. Cas nominal
✓ Créer un sondage avec 3 types de questions
✓ Répondre au sondage
✓ Visualiser les résultats

# 2. Cas limites
✓ Sondage sans questions
✓ Réponse vide
✓ Caractères spéciaux (<script>, ", ', etc.)
✓ Très long texte (1000 caractères)

# 3. Sécurité
✓ Accéder aux résultats sans être propriétaire (doit échouer)
✓ Supprimer le sondage d'un autre (doit échouer)
✓ Tentatives de login répétées (doit bloquer après 5)

# 4. Performance
✓ Sondage avec 50+ questions
✓ 100+ réponses sur une question
✓ Export CSV avec beaucoup de données
```

---

#### 3. Débogage

**Activer les logs MySQL :**
```php
// Dans config.php (développement uniquement)
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO:: ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

// Logger les requêtes
$pdo->setAttribute(PDO:: ATTR_STATEMENT_CLASS, ['LoggedPDOStatement']);
```

**Logs JavaScript :**
```javascript
// Développement
const DEBUG = true;

if (DEBUG) {
    console.log('Données envoyées:', JSON.stringify(payload, null, 2));
}

fetch(url, options)
    .then(response => {
        if (DEBUG) console.log('Status:', response.status);
        return response.json();
    })
    .then(data => {
        if (DEBUG) console.log('Données reçues:', data);
    });
```

---

#### 4. Convention de nommage

**Base de données :**
- Tables : `snake_case` (ex: `survey_access`)
- Colonnes : `snake_case` (ex: `answered_at`)
- Clés étrangères : `{table}_id` (ex: `user_id`)

**PHP :**
- Variables : `$camelCase` (ex: `$userId`)
- Fonctions : `camelCase()` (ex: `encryptData()`)
- Constantes : `UPPER_CASE` (ex: `ENCRYPTION_KEY`)

**JavaScript :**
- Variables : `camelCase` (ex: `userId`)
- Fonctions : `camelCase()` (ex: `loadAnswers()`)
- Constantes : `UPPER_CASE` (ex: `API_BASE_URL`)
- Classes : `PascalCase` (si utilisées)

**Fichiers :**
- HTML/PHP : `snake_case. ext` (ex: `create_survey.php`)
- JavaScript : `camelCase.js` ou `snake_case.js` (être cohérent)

---

### Améliorations futures

#### Priorité haute

**1. Gestion des sessions PHP**
```php
// Remplacer localStorage par sessions serveur
session_start();
$_SESSION['user_id'] = $user['id'];
$_SESSION['username'] = $user['username'];

// Plus sécurisé que localStorage
// - HttpOnly cookies
// - Protection CSRF
// - Expiration automatique
```

---

#### Priorité moyenne

**2. Notifications email**
```php
// Partage de sondage
function notifyUserShared($userEmail, $formTitle, $accessType) {
    $subject = "Nouveau sondage partagé:  $formTitle";
    $message = "Vous avez été ajouté au sondage avec droits:  $accessType";
    
    // Utiliser PHPMailer ou service SMTP
    mail($userEmail, $subject, $message);
}
```

**3. Pagination des résultats**
```php
// get_answer. php
$page = isset($_GET['page']) ? intval($_GET['page']) : 1;
$perPage = 50;
$offset = ($page - 1) * $perPage;

$stmt = $pdo->prepare('SELECT ... LIMIT ?  OFFSET ?');
$stmt->execute([$perPage, $offset]);
```

**4. Système de templates**
```php
// Sondages pré-configurés
$templates = [
    'satisfaction' => [
        'title' => 'Sondage de satisfaction',
        'questions' => [
            ['text' => 'Notez notre service', 'type' => 'scale'],
            ['text' => 'Recommanderiez-vous ? ', 'type' => 'multiple', 
             'options' => ['Oui', 'Non', 'Peut-être']],
        ]
    ],
];
```

**5. Recherche avancée**
```javascript
// Recherche dans les sondages
function searchSurveys(query) {
    return allSurveys.filter(survey => 
        survey.title. toLowerCase().includes(query.toLowerCase()) ||
        survey.description.toLowerCase().includes(query.toLowerCase())
    );
}
```

---

#### Priorité basse

**6. Dark mode**
```css
/* style.css */
@media (prefers-color-scheme: dark) {
    body {
        background-color: #1a1a1a;
        color: #e0e0e0;
    }
    
    .card {
        background-color: #2d2d2d;
        border-color: #444;
    }
}
```

**7. Internationalisation (i18n)**
```javascript
// i18n.js
const translations = {
    'fr': {
        'login': 'Connexion',
        'register': 'Inscription',
    },
    'en': {
        'login': 'Login',
        'register': 'Sign up',
    }
};

function t(key) {
    const lang = localStorage.getItem('lang') || 'fr';
    return translations[lang][key] || key;
}
```

---

## Dépannage (Troubleshooting)

### Problèmes courants

#### 1. Données non déchiffrées (affichage "enc:v1:...")

**Cause :** Oubli d'appel à `decryptData()`

**Solution :**
```php
// Avant envoi au frontend
foreach ($results as &$item) {
    $item['title'] = decryptData($item['title']);
}
```

---

#### 2. Erreur CORS

**Symptôme :**
```
Access to fetch at 'http://localhost/php/login.php' from origin 'null' 
has been blocked by CORS policy
```

**Solution :**
```php
// Ajouter dans chaque endpoint PHP
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods:  GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
```

---

#### 3. Session localStorage perdue

**Cause :** Changement de domaine ou effacement navigateur

**Solution :**
```javascript
// Vérifier systématiquement
const userId = localStorage.getItem('user_id');
if (!userId) {
    window.location.href = 'index.html';
    return;
}

// Ou implémenter "Remember me" avec cookie
```

---

#### 4. Graphiques Chart.js ne s'affichent pas

**Cause :** Canvas non trouvé ou données invalides

**Solution :**
```javascript
// Vérifier l'existence du canvas
const canvas = document.getElementById(`chart-${questionId}`);
if (!canvas) {
    console.error('Canvas introuvable:', questionId);
    return;
}

// Vérifier les données
if (!answers || answers.length === 0) {
    canvas.parentElement.innerHTML = '<p class="text-muted">Aucune réponse</p>';
    return;
}
```

---

#### 5. Migration chiffrement échoue

**Symptôme :**
```
ERREUR: Migration annulée - SQLSTATE[22001]: String data too long
```

**Cause :** Colonnes trop petites pour le format chiffré

**Solution :**
```sql
-- Agrandir les colonnes concernées
ALTER TABLE user MODIFY username TEXT;
ALTER TABLE user MODIFY email TEXT;
ALTER TABLE form MODIFY title TEXT;
ALTER TABLE question MODIFY question_text TEXT;
-- etc.
```

---

#### 6. Blocage anti-bruteforce permanent

**Symptôme :** Impossible de se connecter même avec bon mot de passe

**Solution :**
```sql
-- Réinitialiser manuellement
DELETE FROM login_attempts WHERE ip = 'VOTRE_IP';

-- Ou réduire le temps de blocage
UPDATE login_attempts SET locked_until = NOW() WHERE ip = 'VOTRE_IP';
```

---

## Performances et optimisation

### Requêtes SQL

**Index recommandés :**
```sql
-- Améliore les recherches par hash
CREATE INDEX idx_username_hash ON user(username_hash);
CREATE INDEX idx_email_hash ON user(email_hash);

-- Améliore les jointures
CREATE INDEX idx_question_form ON question(form_id);
CREATE INDEX idx_answer_question ON answer(question_id);
CREATE INDEX idx_answer_user ON answer(user_id);

-- Améliore les permissions
CREATE INDEX idx_survey_access_form ON survey_access(form_id);
CREATE INDEX idx_survey_access_user ON survey_access(user_id);
```

**Requêtes à optimiser :**
```sql
-- ❌ N+1 queries
SELECT * FROM form;
-- Puis pour chaque form: 
SELECT * FROM question WHERE form_id = ?;

-- ✅ Jointure
SELECT f.*, GROUP_CONCAT(q.id) as question_ids
FROM form f
LEFT JOIN question q ON q.form_id = f.id
GROUP BY f.id;
```

---




## Licence et crédits

**Projet :** gogoleform  
**Auteur :** Da-Mizu  
**Repository :** https://github.com/Da-Mizu/google-form

**Technologies tierces :**
- Bootstrap 5.3.2 (MIT License)
- Chart.js 4.4.0 (MIT License)
- html2pdf.js 0.10.1 (MIT License)

**Inspiré de :** Google Forms

---

## Contact et support

**Issues :** https://github.com/Da-Mizu/google-form/issues  
**Documentation :** Ce fichier + README.md  
**Vidéo démo :** Voir `2025-12-30 18-38-11.mp4` dans le repository

---

## Changelog

### Version actuelle (2025-12-30)

**Fonctionnalités :**
- ✅ Authentification avec anti-bruteforce
- ✅ Création de sondages (3 types de questions)
- ✅ Réponses aux sondages
- ✅ Visualisation avec graphiques (Chart.js)
- ✅ Export CSV/PDF
- ✅ Partage avec permissions (view/answer/admin)
- ✅ Chiffrement AES-256-CBC des données sensibles
- ✅ Protection injections SQL (requêtes préparées)
- ✅ Questions anonymes
- ✅ Filtrage des sondages complétés

**Sécurité :**
- ✅ Hachage bcrypt des mots de passe
- ✅ Chiffrement at-rest (base de données)
- ✅ Headers CORS
- ✅ Validation serveur/client
- ⚠️ HTTPS recommandé en production

**À venir :**
- 🔲 Sessions PHP (remplacer localStorage)
- 🔲 Notifications email
- 🔲 Pagination
- 🔲 Dark mode

---

## Annexes

### A. Schéma complet de la base de données

```
┌─────────────────┐
│      user       │
├─────────────────┤
│ id (PK)         │
│ username (TEXT) │──┐
│ username_hash   │  │
│ password        │  │
│ email (TEXT)    │  │
│ email_hash      │  │
└─────────────────┘  │
                     │
                     │
┌─────────────────┐  │
│      form       │  │
├─────────────────┤  │
│ id (PK)         │  │
│ title (TEXT)    │  │
│ description     │  │
│ user_id (FK)    │──┘
└─────────────────┘
        │
        │
┌───────┴─────────┐
│    question     │
├─────────────────┤
│ id (PK)         │
│ form_id (FK)    │
│ question_text   │
│ type            │
│ anonymus        │
└─────────────────┘
        │
        ├──────────────────┐
        │                  │
┌───────┴──────────┐  ┌────┴────────────┐
│ question_option  │  │     answer      │
├──────────────────┤  ├─────────────────┤
│ id (PK)          │  │ id (PK)         │
│ question_id (FK) │  │ question_id (FK)│
│ option_text      │  │ user_id (FK)    │
└──────────────────┘  │ answer_text     │
                      │ answered_at     │
                      └─────────────────┘

┌─────────────────┐
│ survey_access   │
├─────────────────┤
│ id (PK)         │
│ form_id (FK)    │
│ user_id (FK)    │
│ access_type     │
└─────────────────┘

┌─────────────────┐
│ login_attempts  │
├─────────────────┤
│ ip (PK)         │
│ attempts        │
│ last_attempt    │
│ locked_until    │
└─────────────────┘
```

---

### B. Variables d'environnement

**Production recommandée :**
```bash
# . env (ne pas commiter !)
GOOGLEFORM_ENCRYPTION_KEY="votre-cle-secrete-64-caracteres-minimum-generee-aleatoirement"
DB_HOST="localhost"
DB_NAME="google-form"
DB_USER="app_user"
DB_PASS="mot_de_passe_securise"
DB_CHARSET="utf8mb4"
APP_ENV="production"
APP_DEBUG="false"
```

**Charger avec PHP :**
```php
// Utiliser vlucas/phpdotenv ou charger manuellement
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

define('ENCRYPTION_KEY', $_ENV['GOOGLEFORM_ENCRYPTION_KEY']);
```

---


**Fin de la documentation technique**

---

**Dernière mise à jour :** 2025-12-31  
**Version :** 1.0.0  
**Auteur :** Da-Mizu
