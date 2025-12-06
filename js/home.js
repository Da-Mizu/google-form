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
            li.className = 'list-group-item list-group-item-action';
            li.style.cursor = 'pointer';
            // Titre
            const title = document.createElement('div');
            title.textContent = sondage.title;
            title.className = 'fw-bold';
            li.appendChild(title);
            // Description
            if (sondage.description) {
                const desc = document.createElement('div');
                desc.textContent = sondage.description;
                desc.className = 'text-muted small';
                li.appendChild(desc);
            }
            li.addEventListener('click', () => {
                window.location.href = `questions.html?form_id=${sondage.id}&title=${encodeURIComponent(sondage.title)}`;
            });
            list.appendChild(li);
        });
    })
    .catch(() => {
        const li = document.createElement('li');
        li.className = 'list-group-item text-danger';
        li.textContent = 'Erreur lors du chargement des sondages.';
        list.appendChild(li);
    });
