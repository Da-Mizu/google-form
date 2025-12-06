// Navbar user actions
function renderNavbarUserActions() {
    const navbar = document.getElementById('navbarUserActions');
    if (!navbar) return;
    navbar.innerHTML = '';
    const userId = localStorage.getItem('user_id');
    if (userId) {
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'btn btn-outline-light ms-2';
        logoutBtn.textContent = 'Logout';
        logoutBtn.onclick = function() {
            localStorage.removeItem('user_id');
            window.location.href = 'index.html';
        };
        navbar.appendChild(logoutBtn);
    } else {
        const registerBtn = document.createElement('a');
        registerBtn.className = 'btn btn-outline-light ms-2';
        registerBtn.textContent = 'Register';
        registerBtn.href = 'register.html';
        const loginBtn = document.createElement('a');
        loginBtn.className = 'btn btn-light ms-2';
        loginBtn.textContent = 'Login';
        loginBtn.href = 'index.html';
        navbar.appendChild(registerBtn);
        navbar.appendChild(loginBtn);
    }
}
renderNavbarUserActions();
// Récupère les paramètres d'URL
function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

const formId = getQueryParam('form_id');
const title = getQueryParam('title');
const titleElem = document.getElementById('sondageTitle');
const list = document.getElementById('questionList');

if (title) {
    titleElem.textContent = title;
}


if (formId) {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
        titleElem.textContent = 'Authentification requise';
        const li = document.createElement('li');
        li.className = 'list-group-item text-danger';
        li.textContent = 'Vous devez être connecté pour accéder aux questions.';
        list.appendChild(li);
    } else {
        fetch(`http://localhost/google-form/php/get_questions.php?form_id=${formId}`)
            .then(response => response.json())
            .then(data => {
                if (data.length === 0) {
                    const li = document.createElement('li');
                    li.className = 'list-group-item text-warning';
                    li.textContent = 'Aucune question pour ce sondage.';
                    list.appendChild(li);
                } else {
                    data.forEach(q => {
                        const li = document.createElement('li');
                        li.className = 'list-group-item';
                        // Question
                        const questionDiv = document.createElement('div');
                        questionDiv.textContent = q.question_text;
                        li.appendChild(questionDiv);
                        // Textarea réponse
                        const textarea = document.createElement('textarea');
                        textarea.className = 'form-control mt-2';
                        textarea.rows = 3;
                        textarea.name = `answer_${q.id}`;
                        textarea.setAttribute('data-question-id', q.id);
                        li.appendChild(textarea);
                        list.appendChild(li);
                    });
                }
            })
            .catch(() => {
                const li = document.createElement('li');
                li.className = 'list-group-item text-danger';
                li.textContent = 'Erreur lors du chargement des questions.';
                list.appendChild(li);
            });
        // Gestion de la soumission du formulaire
        document.getElementById('answerForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const inputs = document.querySelectorAll('#questionList textarea[data-question-id]');
            let hasError = false;
            for (const input of inputs) {
                const answer = input.value.trim();
                const questionId = input.getAttribute('data-question-id');
                if (answer) {
                    try {
                        const response = await fetch('http://localhost/google-form/php/save_answer.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ question_id: questionId, answer_text: answer, user_id: userId })
                        });
                        console.log('Envoi de la réponse pour la question ID :', questionId, 'Réponse :', answer, 'User ID :', userId);
                        const result = await response.json();
                        if (!result.success) hasError = true;
                    } catch {
                        hasError = true;
                    }
                }
            }
            if (!hasError) {
                alert('Réponses enregistrées avec succès !');
                setTimeout(() => {
                    window.location.href = 'home.html';
                }, 1500);
            } else {
                alert('Erreur lors de l\'enregistrement de certaines réponses.');
            }
        });
    }
} else {
    titleElem.textContent = 'Sondage inconnu';
    const li = document.createElement('li');
    li.className = 'list-group-item text-danger';
    li.textContent = 'Aucun sondage sélectionné.';
    list.appendChild(li);
}
