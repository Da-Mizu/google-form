<?php
require_once 'config.php';

$pdo = getPDOConnection();

$input = json_decode(file_get_contents('php://input'), true);
$form_id = isset($input['form_id']) ? intval($input['form_id']) : null;
$user_id = isset($input['user_id']) ? intval($input['user_id']) : null;

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

try {
    // Vérifier que le user_id est bien propriétaire du formulaire
    $stmtForm = $pdo->prepare('SELECT user_id FROM form WHERE id = ?');
    $stmtForm->execute([$form_id]);
    $form = $stmtForm->fetch();
    if (!$form) {
        http_response_code(404);
        echo json_encode(['error' => 'Formulaire introuvable']);
        exit;
    }
    if (intval($form['user_id']) !== $user_id) {
        http_response_code(403);
        echo json_encode(['error' => 'Seul le créateur peut voir les partages']);
        exit;
    }

    $stmt = $pdo->prepare('SELECT sa.user_id, sa.access_type, u.username, u.email FROM survey_access sa JOIN user u ON sa.user_id = u.id WHERE sa.form_id = ?');
    $stmt->execute([$form_id]);
    $accesses = $stmt->fetchAll();

    foreach ($accesses as &$access) {
        $access['username'] = decryptData($access['username']);
        $access['email'] = decryptData($access['email']);
    }

    usort($accesses, function ($a, $b) {
        return strcmp((string)$a['username'], (string)$b['username']);
    });

    echo json_encode($accesses);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur lors de la récupération des accès']);
}
