const userBadge = document.getElementById('user-badge');
const loginCard = document.getElementById('login-card');
const dashboardContent = document.getElementById('dashboard-content');
const errorState = document.getElementById('error-state');
const setupNote = document.getElementById('setup-note');
const emptyState = document.getElementById('empty-state');
const projectList = document.getElementById('project-list');

function showLoggedOut() {
    userBadge.textContent = 'not signed in';
    document.getElementById('logout').hidden = true;
    loginCard.hidden = false;
    dashboardContent.hidden = true;
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[char]));
}

function renderProjects(projects) {
    projectList.innerHTML = '';
    emptyState.hidden = projects.length !== 0;

    for (const project of projects) {
        const item = document.createElement('article');
        item.className = 'project-item';
        const status = project.approved ? 'approved ✓' : escapeHtml(project.status || 'submitted');
        const link = project.codeUrl ? `<a href="${escapeHtml(project.codeUrl)}" target="_blank" rel="noopener noreferrer">code →</a>` : '';
        item.innerHTML = `
            <div class="project-main">
                <strong class="project-name">${escapeHtml(project.name)}</strong>
                <span class="project-meta">${escapeHtml(project.table || 'submission')}</span>
            </div>
            <div class="project-right">
                <span class="project-hours">${Number(project.hours || 0)}h</span>
                <span class="project-tag ${project.approved ? 'approved' : 'pending'}">${status}</span>
                ${link}
            </div>`;
        projectList.appendChild(item);
    }
}

async function loadDashboard() {
    try {
        const response = await fetch('/api/dashboard', { credentials: 'include', cache: 'no-store' });
        const data = await response.json();

        if (response.status === 401 || data.authenticated === false) {
            showLoggedOut();
            return;
        }
        if (!response.ok) throw new Error(data.error || 'Dashboard request failed');

        const user = data.user || {};
        userBadge.textContent = user.name || user.email || 'Hack Club user';
        document.getElementById('logout').hidden = false;
        loginCard.hidden = true;
        dashboardContent.hidden = false;
        errorState.hidden = true;

        document.getElementById('approved-hours').textContent = `${Number(data.approvedHours || 0)}h`;
        document.getElementById('beans').textContent = Number(data.beans || 0);
        document.getElementById('project-count').textContent = (data.projects || []).length;
        renderProjects(data.projects || []);
        setupNote.hidden = !data.setupRequired;
    } catch (error) {
        console.error(error);
        errorState.hidden = false;
    }
}

document.getElementById('logout').addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/dash';
});

loadDashboard();
