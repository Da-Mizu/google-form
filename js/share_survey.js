const formSelect = document.getElementById('formSelect');
const shareList = document.getElementById('shareList');
const shareForm = document.getElementById('shareForm');
const shareMessage = document.getElementById('shareMessage');
const userId = localStorage.getItem('user_id');

if (!userId) {
    window.location.href = 'index.html';
}

async function fetchOwnedForms() {
    try {
        const response = await fetch('http://localhost/google-form/php/list_forms_owned.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId })
        });
        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) {
            formSelect.innerHTML = '<option value="">Aucun sondage trouvé</option>';
            return;
        }
        formSelect.innerHTML = '<option value="">-- Sélectionnez un sondage --</option>';
        data.forEach(form => {
            const opt = document.createElement('option');
            opt.value = form.id;
            opt.textContent = form.title;
            formSelect.appendChild(opt);
        });
    } catch (error) {
        formSelect.innerHTML = '<option value="">Erreur de chargement</option>';
    }
}

async function fetchShares(formId) {
    shareList.innerHTML = '<div class="list-group-item">Chargement...</div>';
    try {
        const response = await fetch('http://localhost/google-form/php/get_survey_access.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ form_id: formId, user_id: userId })
        });
        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) {
            shareList.innerHTML = '<div class="list-group-item text-muted">Aucun accès pour ce sondage.</div>';
            return;
        }
        shareList.innerHTML = '';
        data.forEach(access => {
            const item = document.createElement('div');
            item.className = 'list-group-item d-flex justify-content-between align-items-center';
            const left = document.createElement('div');
            left.innerHTML = `<strong>${access.username}</strong> <span class="text-muted">(${access.email || 'sans email'})</span>`;
            const accessLabel = {
                answer: 'Répondre',
                view: 'Voir les réponses',
                admin: 'Admin'
            }[access.access_type] || access.access_type;
            const badge = document.createElement('span');
            badge.className = 'badge bg-secondary me-3';
            badge.textContent = accessLabel;

            const btn = document.createElement('button');
            btn.className = 'btn btn-sm btn-outline-danger';
            btn.textContent = 'Retirer';
            btn.addEventListener('click', async () => {
                if (!confirm('Retirer cet accès ?')) return;
                try {
                    const resp = await fetch('http://localhost/google-form/php/delete_survey_access.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ form_id: formId, user_id: userId, target_user_id: access.user_id })
                    });
                    const resData = await resp.json();
                    if (resData.success) {
                        fetchShares(formId);
                    } else {
                        alert(resData.error || 'Erreur lors du retrait');
                    }
                } catch (err) {
                    alert('Erreur lors du retrait');
                }
            });

            const right = document.createElement('div');
            right.className = 'd-flex align-items-center gap-2';
            right.appendChild(badge);
            right.appendChild(btn);

            item.appendChild(left);
            item.appendChild(right);
            shareList.appendChild(item);
        });
    } catch (error) {
        shareList.innerHTML = '<div class="list-group-item text-danger">Erreur de chargement.</div>';
    }
}

shareForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    shareMessage.textContent = '';
    const formId = formSelect.value;
    const targetUsername = document.getElementById('targetUsername').value.trim();
    const accessType = document.getElementById('accessType').value;
    if (!formId) {
        shareMessage.className = 'text-danger';
        shareMessage.textContent = 'Sélectionnez un sondage.';
        return;
    }
    if (!targetUsername) {
        shareMessage.className = 'text-danger';
        shareMessage.textContent = 'Entrez un nom d’utilisateur.';
        return;
    }

    try {
        const response = await fetch('http://localhost/google-form/php/share_survey.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                form_id: formId,
                target_username: targetUsername,
                access_type: accessType,
                user_id: userId
            })
        });
        const data = await response.json();
        if (response.ok && data.success) {
            shareMessage.className = 'text-success';
            shareMessage.textContent = 'Accès mis à jour.';
            document.getElementById('targetUsername').value = '';
            fetchShares(formId);
        } else {
            shareMessage.className = 'text-danger';
            shareMessage.textContent = data.error || 'Erreur lors du partage.';
        }
    } catch (error) {
        shareMessage.className = 'text-danger';
        shareMessage.textContent = 'Erreur serveur.';
    }
});

formSelect.addEventListener('change', () => {
    const formId = formSelect.value;
    if (formId) {
        fetchShares(formId);
    } else {
        shareList.innerHTML = '';
    }
});

fetchOwnedForms();
