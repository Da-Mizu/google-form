<?php
require_once 'config.php';

$pdo = getPDOConnection();

// Récupérer les données JSON
$input = json_decode(file_get_contents('php://input'), true);

$title = isset($input['title']) ? trim($input['title']) : '';
$description = isset($input['description']) ? trim($input['description']) : null;
$questions = isset($input['questions']) ? $input['questions'] : [];
$user_id = isset($input['user_id']) ? intval($input['user_id']) : null;

// Validation
if (empty($title)) {
    http_response_code(400);
    echo json_encode(['error' => 'Le titre est requis']);
    exit;
}

if (empty($questions) || !is_array($questions)) {
    http_response_code(400);
    echo json_encode(['error' => 'Au moins une question est requise']);
    exit;
}

if (!$user_id) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentification requise']);
    exit;
}

try {
    // Démarrer une transaction
    $pdo->beginTransaction();

    // Insérer le sondage dans la table form (chiffré)
    $titleEnc = encryptData($title);
    $descriptionEnc = $description !== null ? encryptData($description) : null;
    $stmt = $pdo->prepare('INSERT INTO form (title, description, user_id) VALUES (?, ?, ?)');
    $stmt->execute([$titleEnc, $descriptionEnc, $user_id]);
    $form_id = $pdo->lastInsertId();

    // Insérer chaque question dans la table question
    $stmtQuestion = $pdo->prepare('INSERT INTO question (form_id, question_text, type, anonymus) VALUES (?, ?, ?, ?)');
    $stmtOption = $pdo->prepare('INSERT INTO question_option (question_id, option_text) VALUES (?, ?)');

    foreach ($questions as $question) {
        $question_text = trim($question['question_text']);
        $question_type = isset($question['type']) ? $question['type'] : 'text';
        $question_anonymus = isset($question['anonymus']) ? intval($question['anonymus']) : 0;

        if (!empty($question_text)) {
            $questionTextEnc = encryptData($question_text);
            $stmtQuestion->execute([$form_id, $questionTextEnc, $question_type, $question_anonymus]);
            $question_id = $pdo->lastInsertId();

            // Si c'est un choix multiple, insérer les options
            if ($question_type === 'multiple' && isset($question['options']) && is_array($question['options'])) {
                foreach ($question['options'] as $option_text) {
                    $option_text = trim($option_text);
                    if (!empty($option_text)) {
                        $stmtOption->execute([$question_id, encryptData($option_text)]);
                    }
                }
            }
        }
    }

    // Valider la transaction
    $pdo->commit();

    echo json_encode([
        'success' => true,
        'form_id' => $form_id,
        'message' => 'Sondage créé avec succès'
    ]);
} catch (PDOException $e) {
    // Annuler la transaction en cas d'erreur
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Erreur lors de la création du sondage']);
}

