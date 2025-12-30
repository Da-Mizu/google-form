<?php
require_once 'config.php';

$pdo = getPDOConnection();


// Récupérer l'ID utilisateur depuis le body de la requête POST
$input = json_decode(file_get_contents('php://input'), true);
$user_id = isset($input['user_id']) ? intval($input['user_id']) : null;

if ($user_id) {
    // Récupérer tous les sondages avec :
    // - answered : si l'utilisateur a déjà répondu
    // - user_role : owner si créateur, sinon access_type s'il a été partagé (view/answer/admin)
    $stmt = $pdo->prepare('
        SELECT 
            f.id,
            f.title,
            f.description,
            f.user_id,
            CASE WHEN EXISTS (
                SELECT 1 FROM answer a
                JOIN question q ON a.question_id = q.id
                WHERE q.form_id = f.id AND a.user_id = ?
            ) THEN 1 ELSE 0 END AS answered,
            CASE 
                WHEN f.user_id = ? THEN "owner"
                ELSE sa.access_type
            END AS user_role
        FROM form f
        LEFT JOIN survey_access sa ON sa.form_id = f.id AND sa.user_id = ?
    ');
    $stmt->execute([$user_id, $user_id, $user_id]);
} else {
    // Si pas d'utilisateur, retourner tous les sondages
    $stmt = $pdo->prepare('SELECT id, title, description, user_id, 0 AS answered, NULL AS user_role FROM form');
    $stmt->execute();
}
$sondages = $stmt->fetchAll();

foreach ($sondages as &$sondage) {
    if (isset($sondage['title'])) {
        $sondage['title'] = decryptData($sondage['title']);
    }
    if (isset($sondage['description'])) {
        $sondage['description'] = decryptData($sondage['description']);
    }
}

echo json_encode($sondages);
