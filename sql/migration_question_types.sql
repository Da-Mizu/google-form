-- Migration pour ajouter le support des questions à choix multiple

-- Ajouter le type de question à la table question
ALTER TABLE `question` 
ADD COLUMN `type` VARCHAR(20) DEFAULT 'text' AFTER `question_text`;

-- Créer une nouvelle table pour les options de réponse
CREATE TABLE `question_option` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `question_id` int(11) NOT NULL,
  `option_text` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_option_question` (`question_id`),
  CONSTRAINT `fk_option_question` FOREIGN KEY (`question_id`) REFERENCES `question` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
