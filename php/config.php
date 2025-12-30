<?php
/**
 * Configuration globale et fonctions de chiffrement
 */

// === Configuration de la base de données ===
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

// === Configuration du chiffrement ===
// IMPORTANT: idéalement, fournir une clé via variable d'environnement (non commitée)
// Exemple: setx GOOGLEFORM_ENCRYPTION_KEY "une-cle-longue-et-secrete"
define('ENCRYPTION_KEY', getenv('GOOGLEFORM_ENCRYPTION_KEY') ?: 'gogleform_secret_key_2025_encryption_aes256_secure_production');
define('ENCRYPTION_ALGORITHM', 'AES-256-CBC');
define('ENCRYPTION_PREFIX_V1', 'enc:v1:');

function normalizeLookupValue(string $value): string {
    return strtolower(trim($value));
}

/**
 * Hash de recherche (déterministe) pour pouvoir retrouver un enregistrement
 * même si les champs sont chiffrés avec IV aléatoire.
 */
function lookupHash(string $value): string {
    return hash_hmac('sha256', normalizeLookupValue($value), ENCRYPTION_KEY);
}

/**
 * Chiffre une donnée en AES-256-CBC
 *
 * @param mixed $data
 * @return string|null Données chiffrées (format enc:v1:base64(iv|cipher))
 */
function encryptData($data) {
    if ($data === null) {
        return null;
    }
    if (!is_string($data)) {
        $data = strval($data);
    }
    if ($data === '') {
        return '';
    }

    $key = hash('sha256', ENCRYPTION_KEY, true);
    $ivLength = openssl_cipher_iv_length(ENCRYPTION_ALGORITHM);
    $iv = random_bytes($ivLength);

    $ciphertext = openssl_encrypt($data, ENCRYPTION_ALGORITHM, $key, OPENSSL_RAW_DATA, $iv);
    if ($ciphertext === false) {
        return '';
    }

    return ENCRYPTION_PREFIX_V1 . base64_encode($iv . $ciphertext);
}

/**
 * Déchiffre une donnée en AES-256-CBC
 *
 * @param mixed $encryptedData
 * @return string|null
 */
function decryptData($encryptedData) {
    if ($encryptedData === null) {
        return null;
    }
    if (!is_string($encryptedData)) {
        return '';
    }
    if ($encryptedData === '') {
        return '';
    }

    // Rétro-compatibilité: si ce n'est pas notre format chiffré, renvoyer tel quel
    if (strpos($encryptedData, ENCRYPTION_PREFIX_V1) !== 0) {
        return $encryptedData;
    }

    try {
        $payloadB64 = substr($encryptedData, strlen(ENCRYPTION_PREFIX_V1));
        $payload = base64_decode($payloadB64, true);
        if ($payload === false) {
            return '';
        }

        $key = hash('sha256', ENCRYPTION_KEY, true);
        $ivLength = openssl_cipher_iv_length(ENCRYPTION_ALGORITHM);
        if (strlen($payload) <= $ivLength) {
            return '';
        }

        $iv = substr($payload, 0, $ivLength);
        $ciphertext = substr($payload, $ivLength);

        $decrypted = openssl_decrypt($ciphertext, ENCRYPTION_ALGORITHM, $key, OPENSSL_RAW_DATA, $iv);
        return $decrypted !== false ? $decrypted : '';
    } catch (Exception $e) {
        return '';
    }
}

/**
 * Initialise la connexion PDO
 */
function getPDOConnection() {
    global $dsn, $options, $user, $pass;

    try {
        return new PDO($dsn, $user, $pass, $options);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Erreur de connexion à la base']);
        exit;
    }
}

// En-têtes de réponse CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
