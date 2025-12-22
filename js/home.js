const list = document.getElementById('questionnaireList');
const userId = localStorage.getItem('user_id');

fetch('http://localhost/google-form/php/get_sondage.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId })
})
    .then(response => response.json())
    .then(data => {
        if (data.length === 0) {
            const li = document.createElement('li');
            li.className = 'list-group-item text-warning';
            li.textContent = 'Aucun sondage disponible ou vous avez déjà répondu à tous les sondages.';
            list.appendChild(li);
            return;
        }
        data.forEach(sondage => {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            
            // Conteneur flex pour le contenu principal et les boutons
            const contentDiv = document.createElement('div');
            contentDiv.className = 'd-flex justify-content-between align-items-center';
            
            // Colonne gauche : titre et description
            const leftDiv = document.createElement('div');
            leftDiv.style.flex = '1';
            
            // Vérifier si le sondage a déjà été répondu
            const hasAnswered = sondage.answered == 1;
            
            if (!hasAnswered) {
                leftDiv.style.cursor = 'pointer';
            }
            
            // Titre avec badge si déjà répondu
            const titleContainer = document.createElement('div');
            titleContainer.className = 'd-flex align-items-center gap-2';
            
            const title = document.createElement('span');
            title.textContent = sondage.title;
            title.className = 'fw-bold';
            titleContainer.appendChild(title);
            
            if (hasAnswered) {
                const badge = document.createElement('span');
                badge.className = 'badge bg-success';
                badge.textContent = 'Déjà répondu';
                titleContainer.appendChild(badge);
            }
            
            leftDiv.appendChild(titleContainer);
            
            // Description
            if (sondage.description) {
                const desc = document.createElement('div');
                desc.textContent = sondage.description;
                desc.className = 'text-muted small';
                leftDiv.appendChild(desc);
            }
            
            // Clic sur le titre/description pour aller aux questions
            leftDiv.addEventListener('click', () => {
                if (hasAnswered) {
                    alert('Vous avez déjà répondu à ce sondage.');
                    return;
                }
                window.location.href = `questions.html?form_id=${sondage.id}&title=${encodeURIComponent(sondage.title)}`;
            });
            
            contentDiv.appendChild(leftDiv);
            
            // Colonne droite : bouton "Voir résultats" si l'utilisateur est propriétaire
            if (userId && sondage.user_id && parseInt(sondage.user_id) === parseInt(userId)) {
                const btnDiv = document.createElement('div');
                btnDiv.className = 'ms-3 d-flex gap-2';
                
                const resultBtn = document.createElement('a');
                resultBtn.className = 'btn btn-sm btn-outline-primary';
                resultBtn.textContent = 'Voir résultats';
                resultBtn.href = `answer.html?form_id=${sondage.id}`;
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-sm btn-danger';
                deleteBtn.textContent = 'Supprimer';
                deleteBtn.addEventListener('click', async () => {
                    if (confirm('Êtes-vous sûr de vouloir supprimer ce sondage ? Cette action est irréversible.')) {
                        try {
                            const response = await fetch('http://localhost/google-form/php/delete_survey.php', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                    form_id: sondage.id,
                                    user_id: userId
                                })
                            });
                            const result = await response.json();
                            if (result.success) {
                                alert('Sondage supprimé avec succès !');
                                location.reload();
                            } else {
                                alert('Erreur : ' + result.error);
                            }
                        } catch (error) {
                            alert('Erreur lors de la suppression.');
                        }
                    }
                });
                
                btnDiv.appendChild(resultBtn);
                btnDiv.appendChild(deleteBtn);
                contentDiv.appendChild(btnDiv);
            }
            
            li.appendChild(contentDiv);
            list.appendChild(li);
        });
    })
    .catch(() => {
        const li = document.createElement('li');
        li.className = 'list-group-item text-danger';
        li.textContent = 'Erreur lors du chargement des sondages.';
        list.appendChild(li);
    });
