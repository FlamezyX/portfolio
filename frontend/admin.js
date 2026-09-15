const API = 'https://portfolio-backend-3smd.onrender.com';
let token = localStorage.getItem('admin_token');

if (token) { showDashboard(); } else { checkAuthStatus(); }

async function checkAuthStatus() {
  try {
    const res = await fetch(`${API}/auth-status`);
    const data = await res.json();
    if (data.hasAdmin) {
      document.getElementById('setup-form').style.display = 'none';
      document.getElementById('login-form').style.display = 'block';
    }
  } catch { showToast('Cannot connect to server', true); }
}

async function setup() {
  const username = document.getElementById('setup-username').value.trim();
  const password = document.getElementById('setup-password').value;
  if (!username || !password) return showToast('Both fields are required', true);
  try {
    const res = await fetch(`${API}/setup`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) return showToast(data.error || 'Setup failed', true);
    token = data.token;
    localStorage.setItem('admin_token', token);
    showDashboard();
  } catch { showToast('Cannot connect to server', true); }
}

async function login() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  try {
    const res = await fetch(`${API}/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) return showToast(data.error || 'Login failed', true);
    token = data.token;
    localStorage.setItem('admin_token', token);
    showDashboard();
  } catch { showToast('Cannot connect to server', true); }
}

function logout() {
  localStorage.removeItem('admin_token');
  token = null;
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
}

async function showDashboard() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';
  await loadData();
}

async function loadData() {
  try {
    const res = await fetch(`${API}/data`);
    const data = await res.json();
    fillProfile(data.profile);
    fillLinks(data.links);
    fillProjects(data.projects);
    fillOverview(data.profile, data.links, data.projects);
  } catch { showToast('Could not load data', true); }
}

function fillOverview(profile, links, projects) {
  document.getElementById('welcome-name').textContent = (profile.name || 'Benjamin').split(' ')[0];
  document.getElementById('stat-projects').textContent = projects.length;
  const filledLinks = Object.values(links).filter(v => v && v !== 'yourusername').length;
  document.getElementById('stat-links').textContent = filledLinks + '/4';
  document.getElementById('stat-profile').textContent = profile.bio ? '✓' : '—';
  document.getElementById('sidebar-name').textContent = profile.name || 'Benjamin Emmanuel';
  document.getElementById('sidebar-role').textContent = profile.title || 'Data Analyst';
  document.getElementById('account-name').textContent = profile.name || 'Benjamin Emmanuel';
  if (profile.photo) {
    const src = profile.photo;
    document.getElementById('sidebar-avatar').innerHTML = `<img src="${src}" alt="avatar">`;
    document.getElementById('account-avatar').innerHTML = `<img src="${src}" alt="avatar">`;
  }
}

function fillProfile({ name, title, bio, photo }) {
  document.getElementById('profile-name').value = name || '';
  document.getElementById('profile-title').value = title || '';
  document.getElementById('profile-bio').value = bio || '';
  if (photo) {
    const img = document.getElementById('photo-preview');
    img.src = photo;
    img.classList.remove('hidden');
    document.getElementById('photo-placeholder').style.display = 'none';
  }
}

function fillLinks({ email, whatsapp, github, linkedin }) {
  document.getElementById('link-email').value = email || '';
  document.getElementById('link-whatsapp').value = whatsapp || '';
  document.getElementById('link-github').value = github || '';
  document.getElementById('link-linkedin').value = linkedin || '';
}

function fillProjects(projects) {
  const list = document.getElementById('projects-list');
  if (!projects.length) {
    list.innerHTML = '<p style="color:var(--text-soft);font-size:0.9rem;margin-bottom:16px;">No projects yet.</p>';
    return;
  }
  list.innerHTML = projects.map(p => `
    <div class="project-item">
      <div>
        <div class="project-item-title">${p.title}</div>
        <div class="project-item-desc">${p.description.slice(0, 90)}...</div>
        <div class="project-item-tags">${p.tags.map(t => `<span class="tag-chip">${t}</span>`).join('')}</div>
      </div>
      <div class="project-item-actions">
        <button class="btn btn-ghost" onclick="editProject(${JSON.stringify(p).replace(/"/g, '&quot;')})">Edit</button>
        <button class="btn btn-red" onclick="deleteProject('${p.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

async function saveProfile() {
  const body = {
    name: document.getElementById('profile-name').value,
    title: document.getElementById('profile-title').value,
    bio: document.getElementById('profile-bio').value,
  };
  const res = await authFetch('/profile', 'PUT', body);
  if (res) { showToast('Profile saved ✓'); await loadData(); }
}

async function uploadPhoto(input) {
  const file = input.files[0];
  if (!file) return;
  const form = new FormData();
  form.append('photo', file);
  try {
    const res = await fetch(`${API}/photo`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
    });
    const data = await res.json();
    if (!res.ok) return showToast(data.error, true);
    const img = document.getElementById('photo-preview');
    img.src = data.photo + '?t=' + Date.now();
    img.classList.remove('hidden');
    document.getElementById('photo-placeholder').style.display = 'none';
    showToast('Photo uploaded ✓');
    await loadData();
  } catch { showToast('Upload failed', true); }
}

async function saveLinks() {
  const body = {
    email: document.getElementById('link-email').value,
    whatsapp: document.getElementById('link-whatsapp').value,
    github: document.getElementById('link-github').value,
    linkedin: document.getElementById('link-linkedin').value,
  };
  const res = await authFetch('/links', 'PUT', body);
  if (res) { showToast('Links saved ✓'); await loadData(); }
}

function addLinkRow(label = '', url = '') {
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:8px;align-items:center;';
  row.innerHTML = `
    <input type="text" placeholder="Label (e.g. SQL file, Excel, Power BI)" value="${label}"
      style="flex:1;background:var(--bg-3);border:1px solid var(--border);border-radius:10px;padding:9px 12px;color:var(--text);font-family:Inter,sans-serif;font-size:0.88rem;">
    <input type="text" placeholder="URL" value="${url}"
      style="flex:2;background:var(--bg-3);border:1px solid var(--border);border-radius:10px;padding:9px 12px;color:var(--text);font-family:Inter,sans-serif;font-size:0.88rem;">
    <button type="button" onclick="this.parentElement.remove()" style="background:var(--accent-red);border:none;border-radius:8px;color:#fff;padding:8px 10px;cursor:pointer;font-size:0.85rem;">✕</button>
  `;
  document.getElementById('proj-links-list').appendChild(row);
}

function getProjectLinks() {
  return [...document.getElementById('proj-links-list').children].map(row => {
    const [labelInput, urlInput] = row.querySelectorAll('input');
    return { label: labelInput.value.trim(), url: urlInput.value.trim() };
  }).filter(l => l.label && l.url);
}

async function saveProject() {
  const id = document.getElementById('edit-project-id').value;
  const body = {
    title: document.getElementById('proj-title').value,
    description: document.getElementById('proj-desc').value,
    tags: document.getElementById('proj-tags').value.split(',').map(t => t.trim()).filter(Boolean),
    links: getProjectLinks(),
  };
  if (!body.title) return showToast('Title is required', true);
  const res = id ? await authFetch(`/projects/${id}`, 'PUT', body) : await authFetch('/projects', 'POST', body);
  if (res) { showToast(id ? 'Project updated ✓' : 'Project added ✓'); clearProjectForm(); await loadData(); }
}

function editProject(p) {
  document.getElementById('edit-project-id').value = p.id;
  document.getElementById('proj-title').value = p.title;
  document.getElementById('proj-desc').value = p.description;
  document.getElementById('proj-tags').value = p.tags.join(', ');
  document.getElementById('proj-links-list').innerHTML = '';
  (p.links || []).forEach(l => addLinkRow(l.label, l.url));
  document.getElementById('project-form-title').textContent = 'Edit project';
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

async function deleteProject(id) {
  if (!confirm('Delete this project?')) return;
  const res = await authFetch(`/projects/${id}`, 'DELETE');
  if (res) { showToast('Project deleted'); await loadData(); }
}

function clearProjectForm() {
  ['edit-project-id','proj-title','proj-desc','proj-tags'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('proj-links-list').innerHTML = '';
  document.getElementById('project-form-title').textContent = 'Add new project';
}

async function changePassword() {
  const current = document.getElementById('current-password').value;
  const newPass = document.getElementById('new-password').value;
  const confirm = document.getElementById('confirm-password').value;
  if (!current || !newPass) return showToast('All fields are required', true);
  if (newPass !== confirm) return showToast('Passwords do not match', true);
  const res = await authFetch('/change-password', 'POST', { currentPassword: current, newPassword: newPass });
  if (res) { showToast('Password updated — please log in again'); setTimeout(logout, 2000); }
}

async function authFetch(path, method, body) {
  try {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Something went wrong', true); return null; }
    return data;
  } catch { showToast('Cannot connect to server', true); return null; }
}

const pageTitles = { overview: 'Overview', profile: 'Profile', links: 'Links', projects: 'Projects', account: 'Account' };

function showPage(name, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`page-${name}`).classList.add('active');
  btn.classList.add('active');
  document.getElementById('topbar-title').textContent = pageTitles[name];
}

function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(() => t.className = 'toast', 3000);
}

document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  if (document.getElementById('login-screen').style.display === 'none') return;
  if (document.getElementById('login-form').style.display !== 'none') login();
  else setup();
});
