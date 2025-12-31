// Charger la navbar dans toutes les pages
async function loadNavbar() {
    try {
        const response = await fetch('navbar.html');
        const navbarHTML = await response.text();
        document.body.insertAdjacentHTML('afterbegin', navbarHTML);
        renderNavbarUserActions();
    } catch (error) {
        console.error('Erreur lors du chargement de la navbar:', error);
    }
}

// Gérer les actions utilisateur dans la navbar
function renderNavbarUserActions() {
    const navbar = document.getElementById('navbarUserActions');
    if (!navbar) return;
    
    navbar.innerHTML = '';
    const userId = localStorage.getItem('user_id');
    const username = localStorage.getItem('username');
    
    if (userId) {
        // Afficher le nom d'utilisateur centré
        if (username) {
            const navbarCenter = document.createElement('div');
            navbarCenter.id = 'navbarCenter';
            navbarCenter.className = 'mx-auto';
            navbarCenter.innerHTML = `<span class="navbar-text">Bonjour, ${username}</span>`;
            navbar.appendChild(navbarCenter);
        }
        
        // Bouton Créer (sauf sur la page de création)
        if (!window.location.pathname.includes('create_survey.html')) {
            const createBtn = document.createElement('a');
            createBtn.className = 'btn btn-success ms-2';
            createBtn.textContent = 'Créer un sondage';
            createBtn.href = 'create_survey.html';
            navbar.appendChild(createBtn);
        }

        // Bouton Partager (sauf sur la page de partage)
        if (!window.location.pathname.includes('share_survey.html')) {
            const shareBtn = document.createElement('a');
            shareBtn.className = 'btn btn-warning ms-2 text-dark';
            shareBtn.textContent = 'Partager';
            shareBtn.href = 'share_survey.html';
            navbar.appendChild(shareBtn);
        }
        
        // Bouton Déconnexion
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'btn btn-outline-light ms-2';
        logoutBtn.textContent = 'Déconnexion';
        logoutBtn.onclick = logout;
        navbar.appendChild(logoutBtn);
    } else {
        // Utilisateur non connecté
        const registerBtn = document.createElement('a');
        registerBtn.className = 'btn btn-outline-light ms-2';
        registerBtn.textContent = 'Inscription';
        registerBtn.href = 'register.html';
        
        const loginBtn = document.createElement('a');
        loginBtn.className = 'btn btn-light ms-2';
        loginBtn.textContent = 'Connexion';
        loginBtn.href = 'index.html';
        
        navbar.appendChild(registerBtn);
        navbar.appendChild(loginBtn);
    }
}

// Fonction de déconnexion
function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// Charger la navbar au chargement de la page
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadNavbar);
} else {
    loadNavbar();
}
