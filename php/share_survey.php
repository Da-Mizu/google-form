<?php
require_once 'config.php';

$pdo = getPDOConnection();

$input = json_decode(file_get_contents('php://input'), true);
$form_id = isset($input['form_id']) ? intval($input['form_id']) : null;
$user_id = isset($input['user_id']) ? intval($input['user_id']) : null;
$target_username = isset($input['target_username']) ? trim($input['target_username']) : '';
$access_type = isset($input['access_type']) ? trim($input['access_type']) : 'answer';

$validAccess = ['view', 'answer', 'admin'];
if (!in_array($access_type, $validAccess, true)) {
    $access_type = 'answer';
}

if (!$form_id || $form_id <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'form_id manquant ou invalide']);
    exit;
}
if (!$user_id || $user_id <= 0) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentification requise']);
    exit;
}
if ($target_username === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Nom d’utilisateur requis']);
    exit;
}

try {
    // Vérifier que le user_id est bien propriétaire du formulaire
    $stmtForm = $pdo->prepare('SELECT id, user_id FROM form WHERE id = ?');
    $stmtForm->execute([$form_id]);
    $form = $stmtForm->fetch();
    if (!$form) {
        http_response_code(404);
        echo json_encode(['error' => 'Formulaire introuvable']);
        exit;
    }
    if (intval($form['user_id']) !== $user_id) {
        http_response_code(403);
        echo json_encode(['error' => 'Seul le créateur peut partager ce sondage']);
        exit;
    }

    // Récupérer l'utilisateur cible (lookup via username_hash)
    $targetUser = null;
    $targetUsernameHash = lookupHash($target_username);

    try {
        $stmtUser = $pdo->prepare('SELECT id FROM user WHERE username_hash = ? LIMIT 1');
        $stmtUser->execute([$targetUsernameHash]);
        $targetUser = $stmtUser->fetch();
    } catch (PDOException $e) {
        // Fallback si la colonne n'existe pas encore
        $stmtUser = $pdo->prepare('SELECT id FROM user WHERE username = ? LIMIT 1');
        $stmtUser->execute([$target_username]);
        $targetUser = $stmtUser->fetch();
    }
    if (!$targetUser) {
        http_response_code(404);
        echo json_encode(['error' => 'Utilisateur cible introuvable']);
        exit;
    }

    // Insérer ou mettre à jour l'accès
    $stmtAccess = $pdo->prepare('INSERT INTO survey_access (form_id, user_id, access_type) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE access_type = VALUES(access_type)');
    $stmtAccess->execute([$form_id, $targetUser['id'], $access_type]);

    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur lors du partage du sondage']);
}
