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
    // Vérifier que l'utilisateur est le propriétaire du formulaire
    $stmtOwner = $pdo->prepare('SELECT user_id FROM form WHERE id = ?');
    $stmtOwner->execute([$form_id]);
    $form = $stmtOwner->fetch();
    
    if (!$form) {
        http_response_code(404);
        echo json_encode(['error' => 'Formulaire introuvable']);
        exit;
    }
    
    if (intval($form['user_id']) !== $user_id) {
        http_response_code(403);
        echo json_encode(['error' => 'Accès refusé : seul le créateur peut supprimer le sondage']);
        exit;
    }
    
    // Démarrer une transaction
    $pdo->beginTransaction();
    
    // Supprimer les réponses liées aux questions
    $stmtDeleteAnswers = $pdo->prepare('DELETE FROM answer WHERE question_id IN (SELECT id FROM question WHERE form_id = ?)');
    $stmtDeleteAnswers->execute([$form_id]);
    
    // Supprimer les options des questions
    $stmtDeleteOptions = $pdo->prepare('DELETE FROM question_option WHERE question_id IN (SELECT id FROM question WHERE form_id = ?)');
    $stmtDeleteOptions->execute([$form_id]);
    
    // Supprimer les questions
    $stmtDeleteQuestions = $pdo->prepare('DELETE FROM question WHERE form_id = ?');
    $stmtDeleteQuestions->execute([$form_id]);
    
    // Supprimer le formulaire
    $stmtDeleteForm = $pdo->prepare('DELETE FROM form WHERE id = ?');
    $stmtDeleteForm->execute([$form_id]);
    
    // Valider la transaction
    $pdo->commit();
    
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'message' => 'Sondage supprimé avec succès'
    ]);
    
} catch (PDOException $e) {
    // Annuler la transaction en cas d'erreur
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Erreur lors de la suppression du sondage']);
}
?>
