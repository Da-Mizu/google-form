-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1
-- Généré le : lun. 22 déc. 2025 à 20:35
-- Version du serveur : 10.4.32-MariaDB
-- Version de PHP : 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `google-form`
--

-- --------------------------------------------------------

--
-- Structure de la table `answer`
--

CREATE TABLE `answer` (
  `id` int(11) NOT NULL,
  `question_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `answer_text` text NOT NULL,
  `answered_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `answer`
--

INSERT INTO `answer` (`id`, `question_id`, `user_id`, `answer_text`, `answered_at`) VALUES
(1, 1, 1, 'caca', '2025-12-22 19:55:29'),
(2, 2, 1, '123456', '2025-12-22 19:56:02'),
(4, 4, 1, 'ds', '2025-12-22 20:05:39'),
(5, 5, 1, 'ds', '2025-12-22 20:05:39'),
(6, 6, 1, 'ds', '2025-12-22 20:05:39'),
(7, 7, 1, 'hghfg', '2025-12-22 20:07:40'),
(8, 8, 2, 'test', '2025-12-22 20:29:13'),
(9, 9, 2, 'pipi', '2025-12-22 20:31:29');

-- --------------------------------------------------------

--
-- Structure de la table `form`
--

CREATE TABLE `form` (
  `id` int(11) NOT NULL,
  `title` text NOT NULL,
  `description` text DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `form`
--

INSERT INTO `form` (`id`, `title`, `description`, `user_id`) VALUES
(6, 'caca', '', 1),
(7, 'test1', '', 1);

-- --------------------------------------------------------

--
-- Structure de la table `login_attempts`
--

CREATE TABLE `login_attempts` (
  `ip` varchar(45) NOT NULL,
  `attempts` int(11) DEFAULT 0,
  `last_attempt` datetime DEFAULT current_timestamp(),
  `locked_until` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `question`
--

CREATE TABLE `question` (
  `id` int(11) NOT NULL,
  `form_id` int(11) NOT NULL,
  `question_text` text NOT NULL,
  `type` varchar(20) DEFAULT 'text',
  `anonymus` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `question`
--

INSERT INTO `question` (`id`, `form_id`, `question_text`, `type`, `anonymus`) VALUES
(8, 6, 'caca', 'text', 0),
(9, 7, 'caca', 'multiple', 1);

-- --------------------------------------------------------

--
-- Structure de la table `question_option`
--

CREATE TABLE `question_option` (
  `id` int(11) NOT NULL,
  `question_id` int(11) NOT NULL,
  `option_text` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `question_option`
--

INSERT INTO `question_option` (`id`, `question_id`, `option_text`) VALUES
(3, 9, 'caca'),
(4, 9, 'pipi');

-- --------------------------------------------------------

--
-- Structure de la table `survey_access`
--

CREATE TABLE `survey_access` (
  `id` int(11) NOT NULL,
  `form_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `access_type` enum('view','answer','admin') NOT NULL DEFAULT 'answer'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `survey_access`
--

INSERT INTO `survey_access` (`id`, `form_id`, `user_id`, `access_type`) VALUES
(3, 6, 2, 'view'),
(4, 7, 2, 'view');

-- --------------------------------------------------------

--
-- Structure de la table `user`
--

CREATE TABLE `user` (
  `id` int(11) NOT NULL,
  `username` text NOT NULL,
  `username_hash` char(64) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `email` text DEFAULT NULL,
  `email_hash` char(64) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `user`
--

INSERT INTO `user` (`id`, `username`, `password`, `email`) VALUES
(1, 'admin', '$2y$10$LTlleDkisKFgKcuChl..9uhM/VNLu36vqh/rUoBp1XgdpfFkupvRe', 'admin@gmail.com'),
(2, 'damizu', '$2y$10$CWd.HUfrSdGlkIhD08nlnO7czE5hIasZ5aBZSZ/CnRwOO5EQs/fhe', 'theo.vic@outlook.fr');

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `answer`
--
ALTER TABLE `answer`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_answer_question` (`question_id`),
  ADD KEY `fk_answer_user` (`user_id`);

--
-- Index pour la table `form`
--
ALTER TABLE `form`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `login_attempts`
--
ALTER TABLE `login_attempts`
  ADD PRIMARY KEY (`ip`);

--
-- Index pour la table `question`
--
ALTER TABLE `question`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_question_form` (`form_id`);

--
-- Index pour la table `question_option`
--
ALTER TABLE `question_option`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_option_question` (`question_id`);

--
-- Index pour la table `survey_access`
--
ALTER TABLE `survey_access`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_form_user` (`form_id`,`user_id`),
  ADD KEY `fk_access_user` (`user_id`);

--
-- Index pour la table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_user_username_hash` (`username_hash`),
  ADD UNIQUE KEY `uniq_user_email_hash` (`email_hash`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `answer`
--
ALTER TABLE `answer`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT pour la table `form`
--
ALTER TABLE `form`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT pour la table `question`
--
ALTER TABLE `question`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT pour la table `question_option`
--
ALTER TABLE `question_option`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT pour la table `survey_access`
--
ALTER TABLE `survey_access`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT pour la table `user`
--
ALTER TABLE `user`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `answer`
--
ALTER TABLE `answer`
  ADD CONSTRAINT `fk_answer_question` FOREIGN KEY (`question_id`) REFERENCES `question` (`id`),
  ADD CONSTRAINT `fk_answer_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`);

--
-- Contraintes pour la table `question`
--
ALTER TABLE `question`
  ADD CONSTRAINT `fk_question_form` FOREIGN KEY (`form_id`) REFERENCES `form` (`id`);

--
-- Contraintes pour la table `question_option`
--
ALTER TABLE `question_option`
  ADD CONSTRAINT `fk_option_question` FOREIGN KEY (`question_id`) REFERENCES `question` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `survey_access`
--
ALTER TABLE `survey_access`
  ADD CONSTRAINT `fk_access_form` FOREIGN KEY (`form_id`) REFERENCES `form` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_access_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
