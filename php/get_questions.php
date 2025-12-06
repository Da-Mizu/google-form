<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, OPTIONS");
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
    if ($question['type'] === 'multiple') {
        $stmtOptions->execute([$question['id']]);
        $question['options'] = $stmtOptions->fetchAll(PDO::FETCH_COLUMN);
    }
}

header('Content-Type: application/json');
// Authentification déléguée au client (localStorage)
echo json_encode($questions);
