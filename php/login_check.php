<?php
require_once 'config.php';
// login_check.php
// Vérifie si l'utilisateur existe dans la base MySQL

$pdo = getPDOConnection();

// Récupère les données du formulaire (JSON)
$ip = $_SERVER['REMOTE_ADDR'];
//Configuration de la limitation des tentatives de connexion
$maxAttempts = 5;
$lockMinutes = 15;

// Connexion à la base pour le suivi des tentatives
$pdo->exec('CREATE TABLE IF NOT EXISTS login_attempts (ip VARCHAR(45) PRIMARY KEY, attempts INT DEFAULT 0, last_attempt DATETIME DEFAULT CURRENT_TIMESTAMP, locked_until DATETIME DEFAULT NULL)');

$attemptStmt = $pdo->prepare('SELECT attempts, locked_until FROM login_attempts WHERE ip = ?');
$attemptStmt->execute([$ip]);
$attempt = $attemptStmt->fetch();

if ($attempt && $attempt['locked_until'] && strtotime($attempt['locked_until']) > time()) {
    http_response_code(429);
    echo json_encode(['success' => false, 'error' => 'Trop de tentatives. Réessayez plus tard.']);
    exit;
}
$data = json_decode(file_get_contents('php://input'), true);
$username = $data['username'] ?? '';
$password = $data['password'] ?? '';

if (!$username || !$password) {
    http_response_code(400);
    echo json_encode(['error' => 'Données manquantes']);
    exit;
}

// Vérifie si l'utilisateur existe (lookup via username_hash)
$user = null;
$usernameHash = lookupHash($username);

try {
    $stmt = $pdo->prepare('SELECT * FROM user WHERE username_hash = ? LIMIT 1');
    $stmt->execute([$usernameHash]);
    $user = $stmt->fetch();
} catch (PDOException $e) {
    // Fallback si la colonne n'existe pas encore
    $stmt = $pdo->prepare('SELECT * FROM user WHERE username = ? LIMIT 1');
    $stmt->execute([$username]);
    $user = $stmt->fetch();
}

if ($user && password_verify($password, $user['password'])) {
    // Déchiffrer les champs sensibles (rétro-compatible si encore en clair)
    if (isset($user['username'])) {
        $user['username'] = decryptData($user['username']);
    }
    if (isset($user['email'])) {
        $user['email'] = decryptData($user['email']);
    }

    // Migration progressive: si l'utilisateur est encore en clair, chiffrer + ajouter hashes
    try {
        $needsMigration = isset($user['username']) && strpos((string)$user['username'], ENCRYPTION_PREFIX_V1) !== 0;
        if ($needsMigration) {
            $newEncUsername = encryptData($user['username']);
            $newEncEmail = isset($user['email']) ? encryptData($user['email']) : null;
            $newUsernameHash = lookupHash($user['username']);
            $newEmailHash = isset($user['email']) && $user['email'] !== '' ? lookupHash($user['email']) : null;

            $upd = $pdo->prepare('UPDATE user SET username = ?, username_hash = ?, email = ?, email_hash = ? WHERE id = ?');
            $upd->execute([$newEncUsername, $newUsernameHash, $newEncEmail, $newEmailHash, $user['id']]);
        }
    } catch (PDOException $e) {
        // Ignore migration errors
    }

    // Ne jamais renvoyer le hash du mot de passe au client
    unset($user['password']);

    // Réinitialiser les tentatives en cas de succès
    $resetStmt = $pdo->prepare('DELETE FROM login_attempts WHERE ip = ?');
    $resetStmt->execute([$ip]);
    echo json_encode(['success' => true, 'user' => $user]);
} else {
    // Incrémenter le nombre de tentatives
    if ($attempt) {
        $newAttempts = $attempt['attempts'] + 1;
        $lockedUntil = ($newAttempts >= $maxAttempts) ? date('Y-m-d H:i:s', strtotime("+$lockMinutes minutes")) : null;
        $updateStmt = $pdo->prepare('UPDATE login_attempts SET attempts = ?, last_attempt = NOW(), locked_until = ? WHERE ip = ?');
        $updateStmt->execute([$newAttempts, $lockedUntil, $ip]);
    } else {
        $insertStmt = $pdo->prepare('INSERT INTO login_attempts (ip, attempts, last_attempt, locked_until) VALUES (?, 1, NOW(), NULL)');
        $insertStmt->execute([$ip]);
    }
    http_response_code(401);
    $msg = ($attempt && $attempt['attempts'] + 1 >= $maxAttempts) ? 'Trop de tentatives. Réessayez dans ' . $lockMinutes . ' minutes.' : 'Utilisateur ou mot de passe incorrect';
    echo json_encode(['success' => false, 'error' => $msg]);
}
