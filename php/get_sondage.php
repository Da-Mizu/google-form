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


// Récupérer l'ID utilisateur depuis le body de la requête POST
$input = json_decode(file_get_contents('php://input'), true);
$user_id = isset($input['user_id']) ? intval($input['user_id']) : null;

if ($user_id) {
    // Récupérer uniquement les sondages auxquels l'utilisateur n'a pas encore répondu
    $stmt = $pdo->prepare('
        SELECT DISTINCT f.id, f.title, f.description 
        FROM form f
        WHERE f.id NOT IN (
            SELECT DISTINCT q.form_id 
            FROM answer a
            JOIN question q ON a.question_id = q.id
            WHERE a.user_id = ?
        )
    ');
    $stmt->execute([$user_id]);
} else {
    // Si pas d'utilisateur, retourner tous les sondages
    $stmt = $pdo->prepare('SELECT id, title, description FROM form');
    $stmt->execute();
}
$sondages = $stmt->fetchAll();

header('Content-Type: application/json');
echo json_encode($sondages);
