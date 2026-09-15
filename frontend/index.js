const API = 'https://portfolio-backend-3smd.onrender.com';

async function loadPortfolio() {
  try {
    const res = await fetch(`${API}/data`);
    const data = await res.json();
    renderProfile(data.profile);
    renderProjects(data.projects);
    renderLinks(data.links);
  } catch {
    document.getElementById('projects-grid').innerHTML = '<p class="loading-text">Could not load data. Make sure the server is running.</p>';
  }
}

function renderProfile({ bio, photo, name }) {
  document.getElementById('bio-text').textContent = bio;
  document.title = `${name} — Data Analyst`;
  if (photo) {
    const img = document.getElementById('profile-photo');
    img.src = photo;
    img.classList.remove('hidden');
  }
}

function renderProjects(projects) {
  const grid = document.getElementById('projects-grid');
  document.getElementById('project-count').textContent = projects.length + '+';
  if (!projects.length) {
    grid.innerHTML = '<p class="loading-text">No projects yet — check back soon.</p>';
    return;
  }
  grid.innerHTML = projects.map(p => `
    <div class="project-card">
      <div class="project-icon">📁</div>
      <h3>${p.title}</h3>
      <p>${p.description}</p>
      <div class="project-chips">
        ${p.tags.map(t => `<span class="chip">${t}</span>`).join('')}
      </div>
      <div class="project-links">
        ${(p.links || []).map(l => `<a href="${l.url}" target="_blank" rel="noopener">↗ ${l.label}</a>`).join('')}
      </div>
    </div>
  `).join('');
}

function renderLinks({ email, whatsapp, github, linkedin }) {
  document.getElementById('contact-links').innerHTML = `
    <a class="contact-link" href="mailto:${email}">
      <div class="link-icon link-icon-email">✉️</div>
      <div><div>Email me</div><div class="link-label">${email}</div></div>
    </a>
    <a class="contact-link" href="https://wa.me/${whatsapp}" target="_blank" rel="noopener">
      <div class="link-icon link-icon-whatsapp">💬</div>
      <div><div>WhatsApp</div><div class="link-label">Message me directly</div></div>
    </a>
    <a class="contact-link" href="https://github.com/${github}" target="_blank" rel="noopener">
      <div class="link-icon link-icon-github">🐙</div>
      <div><div>GitHub</div><div class="link-label">github.com/${github}</div></div>
    </a>
    <a class="contact-link" href="https://linkedin.com/in/${linkedin}" target="_blank" rel="noopener">
      <div class="link-icon link-icon-linkedin">💼</div>
      <div><div>LinkedIn</div><div class="link-label">linkedin.com/in/${linkedin}</div></div>
    </a>
  `;
}

loadPortfolio();
