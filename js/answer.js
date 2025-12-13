document.addEventListener('DOMContentLoaded', () => {
    // Récupérer les informations utilisateur depuis localStorage
    const userId = localStorage.getItem('user_id');
    
    // Récupérer le form_id depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const formId = urlParams.get('form_id');
    
    // Éléments du DOM
    const answerTitle = document.getElementById('answerTitle');
    const answerMessage = document.getElementById('answerMessage');
    const answersContainer = document.getElementById('answersContainer');
    
    // Vérifier que l'utilisateur est connecté
    if (!userId) {
        showError('Vous devez être connecté pour voir les réponses.');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
    
    // Vérifier que le form_id est présent
    if (!formId) {
        showError('Aucun formulaire spécifié.');
        return;
    }
    
    // Charger les réponses
    loadAnswers(formId, userId);
});

function showError(message) {
    const answerMessage = document.getElementById('answerMessage');
    answerMessage.textContent = message;
    answerMessage.classList.remove('d-none', 'alert-success');
    answerMessage.classList.add('alert-danger');
}

function showSuccess(message) {
    const answerMessage = document.getElementById('answerMessage');
    answerMessage.textContent = message;
    answerMessage.classList.remove('d-none', 'alert-danger');
    answerMessage.classList.add('alert-success');
}

async function loadAnswers(formId, userId) {
    const answerTitle = document.getElementById('answerTitle');
    const answersContainer = document.getElementById('answersContainer');
    
    try {
        const response = await fetch(`../php/get_answer.php?form_id=${formId}&user_id=${userId}`);
        const data = await response.json();
        
        if (!response.ok) {
            if (response.status === 403) {
                showError(data.error || 'Accès refusé : seul le créateur peut voir les réponses.');
            } else if (response.status === 404) {
                showError(data.error || 'Formulaire introuvable.');
            } else {
                showError(data.error || 'Erreur lors du chargement des réponses.');
            }
            return;
        }
        
        if (data.success) {
            // Afficher le titre du formulaire
            answerTitle.textContent = `Réponses - ${data.form_title}`;
            
            // Afficher les questions et réponses
            if (data.questions && data.questions.length > 0) {
                renderAnswers(data.questions);
            } else {
                answersContainer.innerHTML = '<p class="text-muted">Aucune question dans ce formulaire.</p>';
            }
        } else {
            showError(data.error || 'Erreur lors du chargement des réponses.');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur de connexion au serveur.');
    }
}

function renderAnswers(questions) {
    const answersContainer = document.getElementById('answersContainer');
    answersContainer.innerHTML = '';
    
    questions.forEach((question, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'card mb-3';
        
        const cardHeader = document.createElement('div');
        cardHeader.className = 'card-header';
        cardHeader.innerHTML = `
            <h5 class="mb-0">
                Question ${index + 1}: ${question.question_text}
                ${question.anonymus == 1 ? '<span class="badge bg-secondary ms-2">Anonyme</span>' : ''}
            </h5>
        `;
        
        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';
        
        if (question.answers && question.answers.length > 0) {
            const answersList = document.createElement('ul');
            answersList.className = 'list-group list-group-flush';
            
            question.answers.forEach(answer => {
                const answerItem = document.createElement('li');
                answerItem.className = 'list-group-item';
                
                if (answer.masked) {
                    answerItem.innerHTML = `
                        <span class="text-muted fst-italic">[Réponse anonyme masquée]</span>
                        <small class="text-muted ms-2">(${new Date(answer.answered_at).toLocaleString('fr-FR')})</small>
                    `;
                } else {
                    answerItem.innerHTML = `
                        <strong>Réponse:</strong> ${answer.answer_text || '<em class="text-muted">Aucune réponse</em>'}
                        <br>
                        <small class="text-muted">
                            Utilisateur ID: ${answer.user_id || 'Inconnu'} | 
                            ${new Date(answer.answered_at).toLocaleString('fr-FR')}
                        </small>
                    `;
                }
                
                answersList.appendChild(answerItem);
            });
            
            cardBody.appendChild(answersList);
        } else {
            cardBody.innerHTML = '<p class="text-muted mb-0">Aucune réponse pour cette question.</p>';
        }
        
        questionDiv.appendChild(cardHeader);
        questionDiv.appendChild(cardBody);
        answersContainer.appendChild(questionDiv);
    });
}
