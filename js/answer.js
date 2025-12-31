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
    const usernameSearch = document.getElementById('usernameSearch');
    
    // Variable globale pour stocker les données
    window.allQuestionsData = [];
    
    // Écouteur pour la recherche
    if (usernameSearch) {
        usernameSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            renderAnswers(window.allQuestionsData, searchTerm);
        });
    } else {
        console.error('usernameSearch element not found');
    }
    
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
            
            // Stocker et afficher les questions et réponses
            if (data.questions && data.questions.length > 0) {
                window.allQuestionsData = data.questions;
                renderAnswers(window.allQuestionsData, '');
            } else {
                answersContainer.innerHTML = '<p class="text-muted">Aucune question dans ce formulaire.</p>';
            }
        } else {
            showError(data.error || 'Erreur lors du chargement des réponses.');
        }
    } catch (error) {
        console.log('Erreur:', error);
        showError('Erreur de connexion au serveur.');
    }
}

function renderAnswers(questions, searchTerm = '') {
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
            // Filtrer les réponses selon le terme de recherche
            const filteredAnswers = searchTerm 
                ? question.answers.filter(answer => {
                    const username = answer.username || '';
                    return username.toLowerCase().includes(searchTerm);
                })
                : question.answers;
            
            // Créer le camembert uniquement pour les questions à choix multiple
            if (question.type === 'multiple' && filteredAnswers.length > 0) {
                const chartContainer = document.createElement('div');
                chartContainer.className = 'mb-4';
                chartContainer.style.maxWidth = '400px';
                chartContainer.style.margin = '0 auto';
                
                const canvas = document.createElement('canvas');
                canvas.id = `chart-${index}`;
                chartContainer.appendChild(canvas);
                cardBody.appendChild(chartContainer);
                
                // Créer le camembert après l'insertion dans le DOM
                setTimeout(() => {
                    createPieChart(`chart-${index}`, filteredAnswers);
                }, 100);
            }
            
            // Afficher la moyenne pour les questions de type échelle
            if (question.type === 'scale' && filteredAnswers.length > 0) {
                const values = filteredAnswers.map(a => parseFloat(a.answer_text)).filter(v => !isNaN(v));
                if (values.length > 0) {
                    const average = (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2);
                    const avgDiv = document.createElement('div');
                    avgDiv.className = 'alert alert-info mb-3';
                    avgDiv.innerHTML = `
                        <strong>Moyenne :</strong> ${average} / 10 
                        <small class="text-muted">(${values.length} réponse${values.length > 1 ? 's' : ''})</small>
                    `;
                    cardBody.appendChild(avgDiv);
                }
            }
            
            // Afficher la liste des réponses filtrées
            if (filteredAnswers.length > 0) {
                const answersList = document.createElement('ul');
                answersList.className = 'list-group list-group-flush';
                
                filteredAnswers.forEach(answer => {
                    const answerItem = document.createElement('li');
                    answerItem.className = 'list-group-item';
                    
                    if (answer.user_masked) {
                        // Question anonyme : afficher la réponse mais masquer l'utilisateur
                        answerItem.innerHTML = `
                            <strong>Utilisateur:</strong> <span class="fst-italic">Anonyme</span>
                            <br>
                            <strong>Réponse:</strong> ${answer.answer_text || '<em class="text-muted">Aucune réponse</em>'}
                            <br>
                            <small class="text-muted">
                                ${new Date(answer.answered_at).toLocaleString('fr-FR')}
                            </small>
                        `;
                    } else {
                        // Question normale : afficher tout
                        answerItem.innerHTML = `
                            <strong>Utilisateur:</strong> ${answer.username || 'Inconnu'}
                            <br>
                            <strong>Réponse:</strong> ${answer.answer_text || '<em class="text-muted">Aucune réponse</em>'}
                            <br>
                            <small class="text-muted">
                                ${new Date(answer.answered_at).toLocaleString('fr-FR')}
                            </small>
                        `;
                    }
                    
                    answersList.appendChild(answerItem);
                });
                
                cardBody.appendChild(answersList);
            } else {
                cardBody.innerHTML = '<p class="text-muted mb-0">Aucune réponse correspondante.</p>';
            }
        } else {
            cardBody.innerHTML = '<p class="text-muted mb-0">Aucune réponse pour cette question.</p>';
        }
        
        questionDiv.appendChild(cardHeader);
        questionDiv.appendChild(cardBody);
        answersContainer.appendChild(questionDiv);
    });
}

function createPieChart(canvasId, answers) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    // Compter les occurrences de chaque réponse
    const answerCounts = {};
    answers.forEach(answer => {
        const text = answer.answer_text || 'Sans réponse';
        // Séparer les réponses multiples (séparées par des virgules)
        const options = text.split(',').map(opt => opt.trim());
        options.forEach(option => {
            answerCounts[option] = (answerCounts[option] || 0) + 1;
        });
    });
    
    // Préparer les données pour le graphique
    const labels = Object.keys(answerCounts);
    const data = Object.values(answerCounts);
    
    // Palette de couleurs
    const backgroundColors = [
        'rgba(255, 99, 132, 0.7)',
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(153, 102, 255, 0.7)',
        'rgba(255, 159, 64, 0.7)',
        'rgba(199, 199, 199, 0.7)',
        'rgba(83, 102, 255, 0.7)',
        'rgba(255, 99, 255, 0.7)',
        'rgba(99, 255, 132, 0.7)'
    ];
    
    const borderColors = [
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(153, 102, 255, 1)',
        'rgba(255, 159, 64, 1)',
        'rgba(199, 199, 199, 1)',
        'rgba(83, 102, 255, 1)',
        'rgba(255, 99, 255, 1)',
        'rgba(99, 255, 132, 1)'
    ];
    
    // Créer le graphique
    new Chart(canvas, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                label: 'Nombre de réponses',
                data: data,
                backgroundColor: backgroundColors.slice(0, labels.length),
                borderColor: borderColors.slice(0, labels.length),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Fonction pour télécharger en CSV
function downloadCSV() {
    if (!window.allQuestionsData || window.allQuestionsData.length === 0) {
        alert('Aucune donnée à télécharger.');
        return;
    }
    
    const formTitle = document.getElementById('answerTitle').textContent.replace('Réponses - ', '');
    // Ajouter le BOM UTF-8 au début du CSV pour une meilleure compatibilité
    let csv = '\uFEFF' + `Sondage: ${formTitle}\n\n`;
    
    window.allQuestionsData.forEach((question, qIndex) => {
        csv += `Question ${qIndex + 1}: ${question.question_text}\n`;
        const typeLabel = question.type === 'multiple'
            ? 'Choix multiple'
            : question.type === 'scale'
                ? 'Échelle (0-10)'
                : 'Texte libre';
        csv += `Type: ${typeLabel}\n`;
        csv += `Anonyme: ${question.anonymus == 1 ? 'Oui' : 'Non'}\n`;
        csv += `Utilisateur,Réponse,Date\n`;
        
        if (question.answers && question.answers.length > 0) {
            question.answers.forEach(answer => {
                const username = answer.username || 'Anonyme';
                const answerText = (answer.answer_text || '').replace(/,/g, ';');
                const date = new Date(answer.answered_at).toLocaleString('fr-FR');
                csv += `"${username}","${answerText}","${date}"\n`;
            });
        }
        csv += `\n`;
    });
    
    // Créer et télécharger le fichier
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Rapport ${formTitle}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Fonction pour télécharger en PDF
function downloadPDF() {
    if (!window.allQuestionsData || window.allQuestionsData.length === 0) {
        alert('Aucune donnée à télécharger.');
        return;
    }
    
    const formTitle = document.getElementById('answerTitle').textContent.replace('Réponses - ', '');
    let html = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h1>${formTitle}</h1>
            <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
            <hr>
    `;
    
    window.allQuestionsData.forEach((question, qIndex) => {
        html += `
            <div style="margin-bottom: 30px; page-break-inside: avoid;">
                <h2 style="font-size: 16px; margin-bottom: 10px;">Question ${qIndex + 1}: ${question.question_text}</h2>
                <p style="margin: 5px 0; font-size: 12px;">
                    <strong>Type:</strong> ${
                        question.type === 'multiple'
                            ? 'Choix multiple'
                            : question.type === 'scale'
                                ? 'Échelle (0-10)'
                                : 'Texte libre'
                    } | 
                    <strong>Anonyme:</strong> ${question.anonymus == 1 ? 'Oui' : 'Non'}
                </p>
        `;
        
        if (question.answers && question.answers.length > 0) {
            html += '<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">';
            html += '<tr style="background-color: #f0f0f0;">';
            html += '<th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Utilisateur</th>';
            html += '<th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Réponse</th>';
            html += '<th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Date</th>';
            html += '</tr>';
            
            question.answers.forEach(answer => {
                const username = answer.username || 'Anonyme';
                const answerText = answer.answer_text || '-';
                const date = new Date(answer.answered_at).toLocaleString('fr-FR');
                html += '<tr>';
                html += `<td style="border: 1px solid #ddd; padding: 8px;">${username}</td>`;
                html += `<td style="border: 1px solid #ddd; padding: 8px;">${answerText}</td>`;
                html += `<td style="border: 1px solid #ddd; padding: 8px; font-size: 12px;">${date}</td>`;
                html += '</tr>';
            });
            html += '</table>';
        } else {
            html += '<p style="color: #999; font-style: italic;">Aucune réponse pour cette question.</p>';
        }
        html += '</div>';
    });
    
    html += '</div>';
    
    const element = document.createElement('div');
    element.innerHTML = html;
    
    const opt = {
        margin: 10,
        filename: `Rapport ${formTitle}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };
    
    html2pdf().set(opt).from(element).save();
}

// Ajouter les écouteurs pour les boutons
document.addEventListener('DOMContentLoaded', () => {
    const downloadCsvBtn = document.getElementById('downloadCsv');
    const downloadPdfBtn = document.getElementById('downloadPdf');
    
    if (downloadCsvBtn) {
        downloadCsvBtn.addEventListener('click', downloadCSV);
    }
    
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', downloadPDF);
    }
});
