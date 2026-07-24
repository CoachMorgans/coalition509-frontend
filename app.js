/* ============================================================
   COALITION 509 — Frontend Logic
   VoteConnect Ecosystem | ChallengeFinancier™
   ============================================================ */

// ⚙️ CONFIGURATION — MODIFIEZ CETTE URL
const API_BASE_URL = localStorage.getItem('api_url') || 'https://coalition509-api.onrender.com';

// ============================================================
// UTILITAIRES
// ============================================================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function formatNumber(n) {
  return new Intl.NumberFormat('fr-FR').format(n || 0);
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function formatCurrency(n) {
  return new Intl.NumberFormat('fr-HT', { style: 'currency', currency: 'HTG' }).format(n || 0);
}

function showAlert(message, type = 'error', container = null) {
  const div = document.createElement('div');
  div.className = `alert alert-${type}`;
  div.innerHTML = `<span>${message}</span>`;
  const target = container || document.body;
  if (container) {
    target.prepend(div);
  } else {
    target.insertBefore(div, target.firstChild);
  }
  setTimeout(() => div.remove(), 5000);
}

function getToken() {
  return localStorage.getItem('access_token');
}

function setToken(token) {
  localStorage.setItem('access_token', token);
}

function clearAuth() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
}

function getUser() {
  try { return JSON.parse(localStorage.getItem('user') || '{}'); }
  catch { return {}; }
}

function setUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}

// ============================================================
// API CLIENT
// ============================================================
async function api(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || `Erreur ${res.status}`);
    }
    return data;
  } catch (err) {
    console.error('API Error:', err);
    throw err;
  }
}

// ============================================================
// AUTHENTIFICATION
// ============================================================
async function login(phone, pin) {
  const data = await api('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone, pin })
  });
  setToken(data.access_token);
  setUser(data.user);
  return data;
}

async function register(userData) {
  return api('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
}

async function getMe() {
  return api('/api/v1/auth/me');
}

function logout() {
  clearAuth();
  window.location.href = 'index.html';
}

// ============================================================
// DASHBOARD
// ============================================================
async function getDashboardStats() {
  return api('/api/v1/dashboard/stats');
}

// ============================================================
// CAMPAGNES
// ============================================================
async function listCampaigns(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return api(`/api/v1/campaigns?${qs}`);
}

async function createCampaign(data) {
  return api('/api/v1/campaigns', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

// ============================================================
// UTILISATEURS
// ============================================================
async function listUsers(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return api(`/api/v1/users?${qs}`);
}

// ============================================================
// COMMANDES
// ============================================================
async function getOrders(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return api(`/api/v1/orders?${qs}`);
}

// ============================================================
// CONFIG
// ============================================================
async function getConfig() {
  return api('/api/v1/config');
}

// ============================================================
// UI HELPERS — DASHBOARD
// ============================================================
function renderStatCard({ value, label, icon, type = 'primary', change = null }) {
  const changeHtml = change !== null
    ? `<div class="stat-change ${change >= 0 ? 'positive' : 'negative'}">${change >= 0 ? '↑' : '↓'} ${Math.abs(change)}%</div>`
    : '';
  return `
    <div class="stat-card ${type}">
      <div class="stat-header">
        <div class="stat-icon">${icon}</div>
      </div>
      <div class="stat-value">${value}</div>
      <div class="stat-label">${label}</div>
      ${changeHtml}
    </div>
  `;
}

function renderTable(headers, rows, emptyMsg = 'Aucune donnée disponible') {
  if (!rows || rows.length === 0) {
    return `<div class="empty-state"><p>${emptyMsg}</p></div>`;
  }
  const ths = headers.map(h => `<th>${h}</th>`).join('');
  const trs = rows.map(row => `<tr>${row.map(c => `<td>${c}</td>`).join('')}</tr>`).join('');
  return `
    <div class="table-container">
      <table>
        <thead><tr>${ths}</tr></thead>
        <tbody>${trs}</tbody>
      </table>
    </div>
  `;
}

function renderBadge(text, type) {
  return `<span class="badge badge-${type}">${text}</span>`;
}

// ============================================================
// PAGE INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;

  if (path.includes('index.html') || path === '/' || path === '') {
    initAuthPage();
  } else if (path.includes('dashboard.html')) {
    initDashboardPage();
  }
});

// ============================================================
// AUTH PAGE LOGIC
// ============================================================
function initAuthPage() {
  if (getToken()) {
    window.location.href = 'dashboard.html';
    return;
  }

  const loginTab = $('#tab-login');
  const registerTab = $('#tab-register');
  const loginForm = $('#login-form');
  const registerForm = $('#register-form');

  loginTab?.addEventListener('click', () => {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
  });

  registerTab?.addEventListener('click', () => {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerForm.style.display = 'block';
    loginForm.style.display = 'none';
  });

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = loginForm.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:8px;"></span> Connexion...';
    btn.disabled = true;

    try {
      const phone = $('#login-phone').value.trim();
      const pin = $('#login-pin').value;
      await login(phone, pin);
      window.location.href = 'dashboard.html';
    } catch (err) {
      showAlert(err.message, 'error', $('.auth-container'));
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });

  registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = registerForm.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:8px;"></span> Création...';
    btn.disabled = true;

    try {
      const data = {
        phone: $('#reg-phone').value.trim(),
        first_name: $('#reg-firstname').value.trim(),
        last_name: $('#reg-lastname').value.trim(),
        email: $('#reg-email').value.trim() || null,
        pin: $('#reg-pin').value,
        profile_type: $('#reg-profile').value,
        region: $('#reg-region').value.trim() || null,
        commune: $('#reg-commune').value.trim() || null
      };
      await register(data);
      showAlert('Compte créé avec succès ! Connectez-vous.', 'success', $('.auth-container'));
      loginTab.click();
      registerForm.reset();
    } catch (err) {
      showAlert(err.message, 'error', $('.auth-container'));
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });
}

// ============================================================
// DASHBOARD PAGE LOGIC
// ============================================================
function initDashboardPage() {
  if (!getToken()) {
    window.location.href = 'index.html';
    return;
  }

  loadUserInfo();
  setupNavigation();
  loadSection('overview');

  $('#logout-btn')?.addEventListener('click', logout);
  $('#mobile-menu-toggle')?.addEventListener('click', () => {
    $('.sidebar').classList.toggle('open');
  });
}

async function loadUserInfo() {
  try {
    const user = await getMe();
    setUser(user);
    const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
    $('.user-avatar').textContent = initials || 'U';
    $('.user-info .name').textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.phone;
    $('.user-info .role').textContent = user.role || 'Utilisateur';
  } catch {
    logout();
  }
}

function setupNavigation() {
  $$('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      $$('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      const section = item.dataset.section;
      loadSection(section);
      if (window.innerWidth <= 768) {
        $('.sidebar').classList.remove('open');
      }
    });
  });
}

function loadSection(sectionName) {
  $$('.section').forEach(s => s.classList.remove('active'));
  $(`#section-${sectionName}`)?.classList.add('active');
  $('.topbar h1').textContent = getSectionTitle(sectionName);

  switch (sectionName) {
    case 'overview': loadOverview(); break;
    case 'campaigns': loadCampaigns(); break;
    case 'users': loadUsers(); break;
    case 'orders': loadOrders(); break;
  }
}

function getSectionTitle(name) {
  const titles = {
    overview: 'Tableau de bord',
    campaigns: 'Campagnes',
    users: 'Utilisateurs',
    orders: 'Commandes TCL'
  };
  return titles[name] || 'Coalition 509';
}

// ============================================================
// OVERVIEW SECTION
// ============================================================
async function loadOverview() {
  const container = $('#overview-stats');
  container.innerHTML = '<div class="loading"><span class="spinner"></span> Chargement des statistiques...</div>';

  try {
    const stats = await getDashboardStats();
    container.innerHTML = `
      ${renderStatCard({
        value: formatNumber(stats.total_users),
        label: 'Utilisateurs actifs',
        icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z"/></svg>',
        type: 'primary'
      })}
      ${renderStatCard({
        value: formatNumber(stats.total_campaigns),
        label: 'Campagnes actives',
        icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>',
        type: 'success'
      })}
      ${renderStatCard({
        value: formatNumber(stats.total_orders),
        label: 'Commandes TCL',
        icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>',
        type: 'warning'
      })}
      ${renderStatCard({
        value: formatCurrency(stats.total_revenue),
        label: 'Revenus totaux',
        icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
        type: 'accent'
      })}
      ${renderStatCard({
        value: formatNumber(stats.total_groups),
        label: 'Coalitions actives',
        icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z"/></svg>',
        type: 'info'
      })}
      ${renderStatCard({
        value: formatNumber(stats.pending_withdrawals),
        label: 'Retraits en attente',
        icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
        type: 'danger'
      })}
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">Impossible de charger les statistiques : ${err.message}</div>`;
  }
}

// ============================================================
// CAMPAIGNS SECTION
// ============================================================
async function loadCampaigns() {
  const tbody = $('#campaigns-table-body');
  tbody.innerHTML = '<tr><td colspan="6" class="loading"><span class="spinner"></span> Chargement...</td></tr>';

  try {
    const campaigns = await listCampaigns();
    if (!campaigns || campaigns.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--gray-600)">Aucune campagne trouvée</td></tr>';
      return;
    }
    tbody.innerHTML = campaigns.map(c => `
      <tr>
        <td><strong>${c.name}</strong><br><small style="color:var(--gray-600)">${c.slug}</small></td>
        <td>${c.election_type || '—'}</td>
        <td>${c.region || '—'}${c.commune ? `, ${c.commune}` : ''}</td>
        <td>${c.election_date ? formatDate(c.election_date) : '—'}</td>
        <td>${renderBadge(c.status === 'active' ? 'Active' : c.status, c.status === 'active' ? 'success' : 'warning')}</td>
        <td><button class="btn btn-sm btn-secondary" onclick="viewCampaign('${c.id}')">Détails</button></td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="alert alert-error">${err.message}</td></tr>`;
  }

  // Setup create button
  $('#btn-create-campaign')?.addEventListener('click', showCreateCampaignModal);
}

function showCreateCampaignModal() {
  const modal = $('#modal-campaign');
  modal.classList.add('active');

  $('#form-campaign')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:8px;"></span> Création...';

    try {
      await createCampaign({
        name: $('#camp-name').value.trim(),
        election_type: $('#camp-type').value,
        region: $('#camp-region').value.trim(),
        commune: $('#camp-commune').value.trim() || null,
        election_date: $('#camp-date').value || null,
        description: $('#camp-desc').value.trim() || null
      });
      modal.classList.remove('active');
      showAlert('Campagne créée avec succès !', 'success');
      loadCampaigns();
    } catch (err) {
      showAlert(err.message, 'error', $('#form-campaign'));
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Créer la campagne';
    }
  }, { once: true });

  $('#modal-campaign-close')?.addEventListener('click', () => modal.classList.remove('active'));
}

function viewCampaign(id) {
  showAlert(`Détails de la campagne ${id} — Fonctionnalité à venir`, 'info');
}

// ============================================================
// USERS SECTION
// ============================================================
async function loadUsers() {
  const tbody = $('#users-table-body');
  tbody.innerHTML = '<tr><td colspan="7" class="loading"><span class="spinner"></span> Chargement...</td></tr>';

  try {
    const users = await listUsers({ limit: 50 });
    if (!users || users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--gray-600)">Aucun utilisateur trouvé</td></tr>';
      return;
    }
    tbody.innerHTML = users.map(u => `
      <tr>
        <td><strong>${u.first_name || ''} ${u.last_name || ''}</strong><br><small style="color:var(--gray-600)">${u.ngd_id || '—'}</small></td>
        <td>${u.phone}</td>
        <td>${u.email || '—'}</td>
        <td>${u.profile_type || '—'}</td>
        <td>${u.region || '—'}</td>
        <td>${renderBadge(u.status === 'active' ? 'Actif' : u.status, u.status === 'active' ? 'success' : 'danger')}</td>
        <td>${formatDate(u.created_at)}</td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="alert alert-error">${err.message}</td></tr>`;
  }
}

// ============================================================
// ORDERS SECTION
// ============================================================
async function loadOrders() {
  const tbody = $('#orders-table-body');
  tbody.innerHTML = '<tr><td colspan="7" class="loading"><span class="spinner"></span> Chargement...</td></tr>';

  try {
    const orders = await getOrders({ limit: 50 });
    if (!orders || orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--gray-600)">Aucune commande trouvée</td></tr>';
      return;
    }
    tbody.innerHTML = orders.map(o => `
      <tr>
        <td><strong>#${o.order_number}</strong></td>
        <td>${o.user?.first_name || ''} ${o.user?.last_name || ''}<br><small>${o.user?.phone || ''}</small></td>
        <td>${formatCurrency(o.total_amount)}</td>
        <td>${o.region || '—'}${o.commune ? `, ${o.commune}` : ''}</td>
        <td>${renderBadge(o.status === 'pending' ? 'En attente' : o.status, o.status === 'pending' ? 'warning' : 'success')}</td>
        <td>${renderBadge(o.payment_status === 'paid' ? 'Payé' : o.payment_status || 'En attente', o.payment_status === 'paid' ? 'success' : 'warning')}</td>
        <td>${formatDate(o.created_at)}</td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="alert alert-error">${err.message}</td></tr>`;
  }
}

// ============================================================
// API URL CONFIG (pour le débogage)
// ============================================================
window.setApiUrl = function(url) {
  localStorage.setItem('api_url', url);
  location.reload();
};
