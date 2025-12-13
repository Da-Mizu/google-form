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
            leftDiv.style.cursor = 'pointer';
            leftDiv.style.flex = '1';
            
            // Titre
            const title = document.createElement('div');
            title.textContent = sondage.title;
            title.className = 'fw-bold';
            leftDiv.appendChild(title);
            
            // Description
            if (sondage.description) {
                const desc = document.createElement('div');
                desc.textContent = sondage.description;
                desc.className = 'text-muted small';
                leftDiv.appendChild(desc);
            }
            
            // Clic sur le titre/description pour aller aux questions
            leftDiv.addEventListener('click', () => {
                window.location.href = `questions.html?form_id=${sondage.id}&title=${encodeURIComponent(sondage.title)}`;
            });
            
            contentDiv.appendChild(leftDiv);
            
            // Colonne droite : bouton "Voir résultats" si l'utilisateur est propriétaire
            if (userId && sondage.user_id && parseInt(sondage.user_id) === parseInt(userId)) {
                const btnDiv = document.createElement('div');
                btnDiv.className = 'ms-3';
                
                const resultBtn = document.createElement('a');
                resultBtn.className = 'btn btn-sm btn-outline-primary';
                resultBtn.textContent = 'Voir résultats';
                resultBtn.href = `answer.html?form_id=${sondage.id}`;
                
                btnDiv.appendChild(resultBtn);
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
