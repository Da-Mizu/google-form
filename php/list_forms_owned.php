<?php
require_once 'config.php';

$pdo = getPDOConnection();

$input = json_decode(file_get_contents('php://input'), true);
$user_id = isset($input['user_id']) ? intval($input['user_id']) : null;

if (!$user_id || $user_id <= 0) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentification requise']);
    exit;
}

try {
    $stmt = $pdo->prepare('SELECT id, title, description FROM form WHERE user_id = ? ORDER BY id DESC');
    $stmt->execute([$user_id]);
    $forms = $stmt->fetchAll();

    foreach ($forms as &$form) {
        $form['title'] = decryptData($form['title']);
        $form['description'] = decryptData($form['description']);
    }

    echo json_encode($forms);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur lors de la récupération des sondages']);
}
