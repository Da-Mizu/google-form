<?php
require_once 'config.php';

$pdo = getPDOConnection();



$form_id = isset($_GET['form_id']) ? $_GET['form_id'] : null;
if (!is_numeric($form_id) || intval($form_id) <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'form_id manquant ou invalide']);
    exit;
}

// Récupérer les questions avec leur type
$stmt = $pdo->prepare('SELECT id, question_text, type FROM question WHERE form_id = ?');
$stmt->execute([intval($form_id)]);
$questions = $stmt->fetchAll();

// Pour chaque question à choix multiple, récupérer les options
$stmtOptions = $pdo->prepare('SELECT option_text FROM question_option WHERE question_id = ?');
foreach ($questions as &$question) {
    $question['question_text'] = decryptData($question['question_text']);
    if ($question['type'] === 'multiple') {
        $stmtOptions->execute([$question['id']]);
        $options = $stmtOptions->fetchAll(PDO::FETCH_COLUMN);
        $question['options'] = array_map('decryptData', $options);
    }
}

// Authentification déléguée au client (localStorage)
echo json_encode($questions);
