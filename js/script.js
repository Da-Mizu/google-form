document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const message = document.getElementById('loginMessage');
    message.textContent = '';
    try {
        const response = await fetch('http://localhost/google-form/php/login_check.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        const result = await response.json();
        if (response.ok && result.success) {
            message.style.color = 'green';
            message.textContent = 'Connexion réussie !';
            // Stocker l'ID utilisateur dans le localStorage
            if (result.user && result.user.id) {
                localStorage.setItem('user_id', result.user.id);
            }
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 800);
        } else {
            message.style.color = '#dc3545';
            message.textContent = result.error || 'Utilisateur ou mot de passe incorrect.';
        }
    } catch (error) {
        message.style.color = '#dc3545';
        message.textContent = "Erreur serveur. Veuillez réessayer.";
    }
});
