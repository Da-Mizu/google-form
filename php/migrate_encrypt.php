<?php
require_once __DIR__ . '/config.php';

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    echo "Ce script doit être exécuté en CLI.\n";
    exit(1);
}

$pdo = getPDOConnection();

function isEncrypted($value): bool {
    return is_string($value) && strpos($value, ENCRYPTION_PREFIX_V1) === 0;
}

function migrateColumn(PDO $pdo, string $table, string $idCol, string $col): int {
    $stmt = $pdo->query("SELECT $idCol, $col FROM `$table`");
    $rows = $stmt->fetchAll();

    $updated = 0;
    $upd = $pdo->prepare("UPDATE `$table` SET `$col` = ? WHERE `$idCol` = ?");

    foreach ($rows as $row) {
        $id = $row[$idCol];
        $val = $row[$col];
        if ($val === null || $val === '' || isEncrypted($val)) {
            continue;
        }
        $enc = encryptData($val);
        $upd->execute([$enc, $id]);
        $updated++;
    }

    return $updated;
}

function columnExists(PDO $pdo, string $table, string $column): bool {
    $stmt = $pdo->prepare('SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?');
    $stmt->execute([$table, $column]);
    return intval($stmt->fetch()['c'] ?? 0) > 0;
}

echo "Migration chiffrement (at-rest)\n";

// USERS: username/email + hashes
if (!columnExists($pdo, 'user', 'username_hash') || !columnExists($pdo, 'user', 'email_hash')) {
    echo "ERREUR: colonnes user.username_hash / user.email_hash absentes. Applique d'abord le SQL d'ALTER TABLE.\n";
    exit(1);
}

$users = $pdo->query('SELECT id, username, email, username_hash, email_hash FROM user')->fetchAll();
$updUser = $pdo->prepare('UPDATE user SET username = ?, email = ?, username_hash = ?, email_hash = ? WHERE id = ?');
$usersUpdated = 0;
foreach ($users as $u) {
    $id = $u['id'];

    $plainUsername = decryptData($u['username']);
    $plainEmail = $u['email'] !== null ? decryptData($u['email']) : null;

    $newUsernameEnc = isEncrypted($u['username']) ? $u['username'] : encryptData($plainUsername);
    $newEmailEnc = ($u['email'] === null || $u['email'] === '') ? $u['email'] : (isEncrypted($u['email']) ? $u['email'] : encryptData($plainEmail));

    $newUsernameHash = $u['username_hash'] ?: lookupHash($plainUsername);
    $newEmailHash = ($plainEmail === null || $plainEmail === '') ? null : ($u['email_hash'] ?: lookupHash($plainEmail));

    // Si rien ne change, skip
    if ($newUsernameEnc === $u['username'] && $newEmailEnc === $u['email'] && $newUsernameHash === $u['username_hash'] && $newEmailHash === $u['email_hash']) {
        continue;
    }

    $updUser->execute([$newUsernameEnc, $newEmailEnc, $newUsernameHash, $newEmailHash, $id]);
    $usersUpdated++;
}

echo "- user: $usersUpdated ligne(s) mises à jour\n";

// FORMS
$formsTitle = migrateColumn($pdo, 'form', 'id', 'title');
$formsDesc = migrateColumn($pdo, 'form', 'id', 'description');
echo "- form.title: $formsTitle\n";
echo "- form.description: $formsDesc\n";

// QUESTIONS
$qText = migrateColumn($pdo, 'question', 'id', 'question_text');
echo "- question.question_text: $qText\n";

// OPTIONS
$optText = migrateColumn($pdo, 'question_option', 'id', 'option_text');
echo "- question_option.option_text: $optText\n";

// ANSWERS
$ansText = migrateColumn($pdo, 'answer', 'id', 'answer_text');
echo "- answer.answer_text: $ansText\n";

echo "Terminé.\n";
