<?php
require_once 'config.php';

$pdo = getPDOConnection();

$data = json_decode(file_get_contents('php://input'), true);


$question_id = $data['question_id'] ?? null;
$answer_text = trim($data['answer_text'] ?? '');

$user_id = $data['user_id'] ?? null;
if (!is_numeric($user_id) || intval($user_id) <= 0) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentification requise pour répondre au sondage']);
    exit;
}

if (!is_numeric($question_id) || intval($question_id) <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'question_id manquant ou invalide']);
    exit;
}
if (strlen($answer_text) < 1 || strlen($answer_text) > 1000) {
    http_response_code(400);
    echo json_encode(['error' => 'Réponse vide ou trop longue (max 1000 caractères)']);
    exit;
}

$answerEnc = encryptData($answer_text);
$stmt = $pdo->prepare('INSERT INTO answer (question_id, user_id, answer_text) VALUES (?, ?, ?)');
$stmt->execute([intval($question_id), $user_id, $answerEnc]);

echo json_encode(['success' => true]);
