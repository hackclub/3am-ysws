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
        const state = project.status || 'submitted';
        const status = project.approved ? 'approved ✓' : escapeHtml(state);
        const statusClass = project.approved ? 'approved' : state === 'rejected' ? 'rejected' : state === 'pending' ? 'pending' : 'submitted';
        const link = project.codeUrl ? `<a href="${escapeHtml(project.codeUrl)}" target="_blank" rel="noopener noreferrer">code →</a>` : '';
        item.innerHTML = `
            <div class="project-main">
                <strong class="project-name">${escapeHtml(project.name)}</strong>
                <span class="project-meta">${escapeHtml(project.table || 'submission')}</span>
            </div>
            <div class="project-right">
                <span class="project-hours">${Number(project.hours || 0)}h</span>
                <span class="project-tag ${statusClass}">${status}</span>
                ${link}
            </div>`;
        projectList.appendChild(item);
    }
}

async function loadDashboard() {
    errorState.hidden = true;
    try {
        const response = await fetch(`/api/dashboard?ts=${Date.now()}`, {
            credentials: 'include',
            cache: 'no-store',
            headers: { Accept: 'application/json' }
        });

        const contentType = response.headers.get('content-type') || '';
        const data = contentType.includes('application/json') ? await response.json() : null;

        if (response.status === 401 || data?.authenticated === false) {
            showLoggedOut();
            return;
        }

        if (!response.ok) {
            const code = data?.errorCode || `HTTP_${response.status}`;
            throw new Error(data?.error ? `${data.error} (${code})` : `Dashboard API failed (${code})`);
        }

        if (data?.error) {
            throw new Error(data.errorCode ? `${data.error} (${data.errorCode})` : data.error);
        }

        const user = data.user || {};
        userBadge.textContent = user.name || user.email || 'Hack Club user';
        document.getElementById('logout').hidden = false;
        loginCard.hidden = true;
        dashboardContent.hidden = false;

        document.getElementById('approved-hours').textContent = `${Number(data.approvedHours || 0)}h`;
        document.getElementById('beans').textContent = Number(data.beans || 0).toLocaleString();
        document.getElementById('project-count').textContent = (data.projects || []).length;
        renderProjects(data.projects || []);
        setupNote.hidden = !data.setupRequired;
    } catch (error) {
        console.error('Dashboard load failed:', error);
        dashboardContent.hidden = true;
        errorState.hidden = false;
        errorState.textContent = `Something went wrong while loading your dashboard. ${error.message || 'Unknown error.'}`;
    }
}

document.getElementById('logout').addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/dash';
});

loadDashboard();
