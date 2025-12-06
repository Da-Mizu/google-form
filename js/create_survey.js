// Navbar user actions
function renderNavbarUserActions() {
    const navbar = document.getElementById('navbarUserActions');
    if (!navbar) return;
    navbar.innerHTML = '';
    const userId = localStorage.getItem('user_id');
    if (userId) {
        const createBtn = document.createElement('a');
        createBtn.className = 'btn btn-success ms-2';
        createBtn.textContent = 'Create';
        createBtn.href = 'create_survey.html';
        navbar.appendChild(createBtn);
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'btn btn-outline-light ms-2';
        logoutBtn.textContent = 'Logout';
        logoutBtn.onclick = function() {
            localStorage.removeItem('user_id');
            window.location.href = 'index.html';
        };
        navbar.appendChild(logoutBtn);
    } else {
        window.location.href = 'index.html';
    }
}
renderNavbarUserActions();

// Gestion dynamique des inputs de questions
const questionsContainer = document.getElementById('questionsContainer');

function updateQuestionLabels() {
    const questionBlocks = questionsContainer.querySelectorAll('.question-block');
    questionBlocks.forEach((div, index) => {
        const label = div.querySelector('label.fw-bold');
        label.textContent = `Question ${index + 1}`;
    });
}

function checkAndAddOptionInput(optionInputsContainer) {
    const allOptions = optionInputsContainer.querySelectorAll('.option-field');
    const emptyOptions = Array.from(allOptions).filter(input => input.value.trim() === '');
    
    // Si il ne reste qu'un seul input vide, on en ajoute un nouveau
    if (emptyOptions.length === 1) {
        const newInput = document.createElement('input');
        newInput.type = 'text';
        newInput.className = 'form-control mb-2 option-field';
        newInput.placeholder = `Option ${allOptions.length + 1}`;
        optionInputsContainer.appendChild(newInput);
        
        // Ajouter l'event listener au nouvel input
        newInput.addEventListener('input', () => checkAndAddOptionInput(optionInputsContainer));
    }
}

function toggleOptionsContainer(questionBlock) {
    const typeSelect = questionBlock.querySelector('.question-type');
    const optionsContainer = questionBlock.querySelector('.options-container');
    
    if (typeSelect.value === 'multiple') {
        optionsContainer.style.display = 'block';
        // Initialiser les event listeners pour les options
        const optionInputsContainer = optionsContainer.querySelector('.option-inputs');
        optionInputsContainer.querySelectorAll('.option-field').forEach(input => {
            input.addEventListener('input', () => checkAndAddOptionInput(optionInputsContainer));
        });
    } else {
        optionsContainer.style.display = 'none';
    }
}

function checkAndAddQuestionBlock() {
    const allQuestions = questionsContainer.querySelectorAll('.question-field');
    const emptyQuestions = Array.from(allQuestions).filter(input => input.value.trim() === '');
    
    // Si il ne reste qu'un seul input vide, on en ajoute un nouveau
    if (emptyQuestions.length === 1) {
        const newBlock = document.createElement('div');
        newBlock.className = 'mb-4 question-block border p-3 rounded';
        
        const newLabel = document.createElement('label');
        newLabel.className = 'form-label fw-bold';
        newLabel.textContent = `Question ${allQuestions.length + 1}`;
        
        const newInput = document.createElement('input');
        newInput.type = 'text';
        newInput.className = 'form-control mb-2 question-field';
        newInput.placeholder = 'Entrez votre question';
        
        const newSelect = document.createElement('select');
        newSelect.className = 'form-select mb-2 question-type';
        newSelect.innerHTML = `
            <option value="text">Texte libre</option>
            <option value="multiple">Choix multiple</option>
        `;
        
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'options-container';
        optionsContainer.style.display = 'none';
        optionsContainer.innerHTML = `
            <label class="form-label small">Options de réponse :</label>
            <div class="option-inputs">
                <input type="text" class="form-control mb-2 option-field" placeholder="Option 1" />
                <input type="text" class="form-control mb-2 option-field" placeholder="Option 2" />
            </div>
        `;
        
        newBlock.appendChild(newLabel);
        newBlock.appendChild(newInput);
        newBlock.appendChild(newSelect);
        newBlock.appendChild(optionsContainer);
        questionsContainer.appendChild(newBlock);
        
        // Ajouter les event listeners
        newInput.addEventListener('input', checkAndAddQuestionBlock);
        newSelect.addEventListener('change', () => toggleOptionsContainer(newBlock));
    }
}

// Initialiser les event listeners pour les blocs existants
questionsContainer.querySelectorAll('.question-block').forEach(block => {
    const questionField = block.querySelector('.question-field');
    const typeSelect = block.querySelector('.question-type');
    
    questionField.addEventListener('input', checkAndAddQuestionBlock);
    typeSelect.addEventListener('change', () => toggleOptionsContainer(block));
});

// Gestion de la soumission du formulaire
document.getElementById('createSurveyForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const userId = localStorage.getItem('user_id');
    if (!userId) {
        window.location.href = 'index.html';
        return;
    }
    
    const title = document.getElementById('surveyTitle').value.trim();
    const description = document.getElementById('surveyDescription').value.trim();
    const message = document.getElementById('createMessage');
    
    // Récupérer toutes les questions avec leur type et options
    const questionBlocks = questionsContainer.querySelectorAll('.question-block');
    const questions = [];
    
    questionBlocks.forEach(block => {
        const questionText = block.querySelector('.question-field').value.trim();
        const questionType = block.querySelector('.question-type').value;
        
        if (questionText !== '') {
            const questionData = {
                question_text: questionText,
                type: questionType
            };
            
            // Si c'est un choix multiple, récupérer les options non vides
            if (questionType === 'multiple') {
                const optionInputs = block.querySelectorAll('.option-field');
                const options = Array.from(optionInputs)
                    .map(input => input.value.trim())
                    .filter(opt => opt !== '');
                questionData.options = options;
            }
            
            questions.push(questionData);
        }
    });
    
    if (questions.length === 0) {
        message.style.color = '#dc3545';
        message.textContent = 'Vous devez ajouter au moins une question.';
        return;
    }
    
    // Vérifier que les questions à choix multiple ont au moins 2 options
    for (const q of questions) {
        if (q.type === 'multiple' && (!q.options || q.options.length < 2)) {
            message.style.color = '#dc3545';
            message.textContent = 'Les questions à choix multiple doivent avoir au moins 2 options.';
            return;
        }
    }
    
    message.textContent = '';
    
    try {
        const response = await fetch('http://localhost/google-form/php/create_survey.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                title, 
                description, 
                questions,
                user_id: userId 
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            message.style.color = 'green';
            message.textContent = 'Sondage créé avec succès !';
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 1500);
        } else {
            message.style.color = '#dc3545';
            message.textContent = result.error || 'Erreur lors de la création du sondage.';
        }
    } catch (error) {
        message.style.color = '#dc3545';
        message.textContent = "Erreur serveur. Veuillez réessayer.";
    }
});
