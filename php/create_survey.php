<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$host = 'localhost';
$db = 'google-form';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur de connexion à la base']);
    exit;
}

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

    // Insérer le sondage dans la table form
    $stmt = $pdo->prepare('INSERT INTO form (title, description) VALUES (?, ?)');
    $stmt->execute([$title, $description]);
    $form_id = $pdo->lastInsertId();

    // Insérer chaque question dans la table question
    $stmtQuestion = $pdo->prepare('INSERT INTO question (form_id, question_text, type) VALUES (?, ?, ?)');
    $stmtOption = $pdo->prepare('INSERT INTO question_option (question_id, option_text) VALUES (?, ?)');

    foreach ($questions as $question) {
        $question_text = trim($question['question_text']);
        $question_type = isset($question['type']) ? $question['type'] : 'text';

        if (!empty($question_text)) {
            $stmtQuestion->execute([$form_id, $question_text, $question_type]);
            $question_id = $pdo->lastInsertId();

            // Si c'est un choix multiple, insérer les options
            if ($question_type === 'multiple' && isset($question['options']) && is_array($question['options'])) {
                foreach ($question['options'] as $option_text) {
                    $option_text = trim($option_text);
                    if (!empty($option_text)) {
                        $stmtOption->execute([$question_id, $option_text]);
                    }
                }
            }
        }
    }

    // Valider la transaction
    $pdo->commit();

    header('Content-Type: application/json');
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
