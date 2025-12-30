<?php
require_once 'config.php';

$pdo = getPDOConnection();

$data = json_decode(file_get_contents('php://input'), true);


$username = trim($data['username'] ?? '');
$email = trim($data['email'] ?? '');
$password = $data['password'] ?? '';

// Validation username
if (!preg_match('/^[a-zA-Z0-9_]{3,30}$/', $username)) {
    http_response_code(400);
    echo json_encode(['error' => 'Nom d\'utilisateur invalide (3-30 caractères, lettres, chiffres, underscore)']);
    exit;
}
// Validation email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Email invalide']);
    exit;
}
// Validation password
if (!is_string($password) || strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(['error' => 'Mot de passe trop court (min 6 caractères)']);
    exit;
}

// Chiffrement + hash de recherche (nécessite les colonnes username_hash / email_hash)
$encryptedUsername = encryptData($username);
$encryptedEmail = encryptData($email);
$usernameHash = lookupHash($username);
$emailHash = lookupHash($email);

// Vérifier si l'utilisateur existe déjà
$stmt = $pdo->prepare('SELECT id FROM user WHERE username_hash = ? OR email_hash = ?');
$stmt->execute([$usernameHash, $emailHash]);
if ($stmt->fetch()) {
    http_response_code(409);
    echo json_encode(['error' => 'Nom d\'utilisateur ou email déjà utilisé']);
    exit;
}

// Hacher le mot de passe
$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

$stmt = $pdo->prepare('INSERT INTO user (username, username_hash, password, email, email_hash) VALUES (?, ?, ?, ?, ?)');
$stmt->execute([$encryptedUsername, $usernameHash, $hashedPassword, $encryptedEmail, $emailHash]);

echo json_encode(['success' => true]);
