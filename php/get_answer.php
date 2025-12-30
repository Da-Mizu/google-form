<?php
require_once 'config.php';

$pdo = getPDOConnection();

// Récupérer les paramètres
$form_id = isset($_GET['form_id']) ? intval($_GET['form_id']) : null;
$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;

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
    // Vérifier que l'utilisateur est le propriétaire ou possède un accès partagé view/admin
    $stmtOwner = $pdo->prepare('SELECT user_id, title FROM form WHERE id = ?');
    $stmtOwner->execute([$form_id]);
    $form = $stmtOwner->fetch();
    
    if (!$form) {
        http_response_code(404);
        echo json_encode(['error' => 'Formulaire introuvable']);
        exit;
    }

    $isOwner = intval($form['user_id']) === $user_id;
    $hasShared = false;

    if (!$isOwner) {
        $stmtAccess = $pdo->prepare('SELECT access_type FROM survey_access WHERE form_id = ? AND user_id = ? AND access_type IN ("view","admin")');
        $stmtAccess->execute([$form_id, $user_id]);
        $shared = $stmtAccess->fetch();
        $hasShared = $shared !== false;
    }

    if (!$isOwner && !$hasShared) {
        http_response_code(403);
        echo json_encode(['error' => 'Accès refusé : seul le créateur ou un utilisateur avec accès view/admin peut voir les réponses']);
        exit;
    }
    
    // Récupérer toutes les questions du formulaire
    $stmtQuestions = $pdo->prepare('SELECT id, question_text, type, anonymus FROM question WHERE form_id = ? ORDER BY id');
    $stmtQuestions->execute([$form_id]);
    $questions = $stmtQuestions->fetchAll();
    
    // Pour chaque question, récupérer les réponses avec le username
    $stmtAnswers = $pdo->prepare('SELECT a.id, a.user_id, u.username, a.answer_text, a.answered_at FROM answer a LEFT JOIN user u ON a.user_id = u.id WHERE a.question_id = ? ORDER BY a.answered_at DESC');
    
    foreach ($questions as &$question) {
        $question['question_text'] = decryptData($question['question_text']);
        $stmtAnswers->execute([$question['id']]);
        $answers = $stmtAnswers->fetchAll();

        foreach ($answers as &$answer) {
            $answer['answer_text'] = decryptData($answer['answer_text']);
            if (isset($answer['username']) && $answer['username'] !== null) {
                $answer['username'] = decryptData($answer['username']);
            }
        }
        
        // Si la question est anonyme, masquer uniquement l'identité de l'utilisateur
        if (isset($question['anonymus']) && intval($question['anonymus']) === 1) {
            foreach ($answers as &$answer) {
                $answer['user_id'] = null;
                $answer['username'] = null;
                $answer['user_masked'] = true;
            }
        } else {
            foreach ($answers as &$answer) {
                $answer['user_masked'] = false;
            }
        }
        
        $question['answers'] = $answers;
    }
    
    $response = [
        'success' => true,
        'form_title' => decryptData($form['title']),
        'questions' => $questions
    ];
    
    echo json_encode($response);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur lors de la récupération des réponses']);
}
