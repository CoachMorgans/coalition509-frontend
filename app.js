/* ============================================================
   COALITION 509 — Frontend Logic
   VoteConnect Ecosystem | ChallengeFinancier™
   v1.5.2-corrected
   ============================================================ */

// ⚙️ CONFIGURATION
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
  return (n || 0).toLocaleString('fr-FR') + ' FCFA';
}

function normalizeList(response) {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (response.items && Array.isArray(response.items)) return response.items;
  if (response.data && Array.isArray(response.data)) return response.data;
  if (response.results && Array.isArray(response.results)) return response.results;
  return [];
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

function showToast(message, type = 'info') {
  const container = $('#toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  const colors = { success: '#228B22', error: '#e60023', info: '#3b82f6', warning: '#f59e0b' };
  toast.style.borderLeftColor = colors[type] || colors.info;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
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
      throw new Error(data.detail || data.message || `Erreur ${res.status}`);
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
      <div class="stat-info">
        <div class="stat-value">${value}</div>
        <div class="stat-label">${label}</div>
      </div>
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
  const modeUser = $('#mode-user');
  const modeAdmin = $('#mode-admin');
  const adminHint = $('#admin-hint');
  const tabsContainer = $('.tabs');

  // Mode switcher
  modeUser?.addEventListener('click', () => {
    modeUser.classList.add('active');
    modeAdmin.classList.remove('active');
    adminHint?.classList.remove('visible');
    if (tabsContainer) tabsContainer.style.display = 'flex';
  });

  modeAdmin?.addEventListener('click', () => {
    modeAdmin.classList.add('active');
    modeUser.classList.remove('active');
    adminHint?.classList.add('visible');
    if (tabsContainer) tabsContainer.style.display = 'none';
    loginTab?.classList.add('active');
    registerTab?.classList.remove('active');
    if (loginForm) loginForm.style.display = 'block';
    if (registerForm) registerForm.style.display = 'none';
  });

  // Tabs
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
      showAlert(err.message, 'error', $('#auth-container'));
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });

  registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pin = $('#reg-pin').value;
    const pinConfirm = $('#reg-pin-confirm').value;
    if (pin !== pinConfirm) {
      showAlert('Les codes PIN ne correspondent pas.', 'error', $('#auth-container'));
      return;
    }

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
        pin: pin,
        profile_type: $('#reg-profile').value,
        region: $('#reg-region').value.trim() || null,
        commune: $('#reg-commune').value.trim() || null
      };
      await register(data);
      showAlert('Compte créé avec succès ! Connectez-vous.', 'success', $('#auth-container'));
      loginTab.click();
      registerForm.reset();
    } catch (err) {
      showAlert(err.message, 'error', $('#auth-container'));
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });
}

// ============================================================
// DASHBOARD PAGE LOGIC
// ============================================================
let botChartInstance = null;

function initDashboardPage() {
  if (!getToken()) {
    window.location.href = 'index.html';
    return;
  }

  loadUserInfo();
  setupNavigation();
  setupGlobalListeners();
  loadSection('overview');
}

function setupGlobalListeners() {
  // Mobile menu
  $('#mobile-menu-toggle')?.addEventListener('click', () => {
    $('.sidebar').classList.add('open');
    $('#sidebar-overlay').classList.add('active');
  });

  // Sidebar overlay
  $('#sidebar-overlay')?.addEventListener('click', () => {
    $('.sidebar').classList.remove('open');
    $('#sidebar-overlay').classList.remove('active');
  });

  // Desktop logout
  $('#logout-btn-desktop')?.addEventListener('click', logout);

  // Mobile logout
  $('#logout-btn')?.addEventListener('click', logout);

  // Refresh
  $('#refresh-btn')?.addEventListener('click', () => {
    const section = $('.nav-item.active')?.dataset.section || 'overview';
    loadSection(section);
    showToast('Données actualisées', 'success');
  });

  // Bottom nav
  $$('.bottom-nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.dataset.section;
      if (!section) return;

      $$('.nav-item').forEach(n => n.classList.remove('active'));
      const sidebarItem = $(`.nav-item[data-section="${section}"]`);
      if (sidebarItem) sidebarItem.classList.add('active');

      $$('.bottom-nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      loadSection(section);
    });
  });

  // Campaign create button
  $('#btn-create-campaign')?.addEventListener('click', showCreateCampaignModal);

  // Modal campaign cancel
  $('#modal-campaign-cancel')?.addEventListener('click', () => {
    $('#modal-campaign-overlay').classList.remove('active');
  });

  // Modal campaign close
  $('#modal-campaign-close')?.addEventListener('click', () => {
    $('#modal-campaign-overlay').classList.remove('active');
  });

  // Modal payment close
  $('#modal-payment-close')?.addEventListener('click', () => {
    $('#modal-payment-overlay').classList.remove('active');
  });

  // Profile form
  $('#form-profile')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPin = $('#prof-new-pin').value;
    const confirmPin = $('#prof-confirm-pin').value;
    if (newPin && newPin !== confirmPin) {
      showToast('Les PIN ne correspondent pas', 'error');
      return;
    }
    // TODO: PATCH /api/v1/users/me
    showToast('Profil mis à jour (simulation)', 'success');
  });

  // Campaign filter
  $('#camp-filter-apply')?.addEventListener('click', () => {
    loadCampaigns();
  });

  // Export buttons
  $$('[data-export]').forEach(btn => {
    btn.addEventListener('click', () => {
      showToast(`Export ${btn.dataset.export} — bientôt disponible`, 'info');
    });
  });
}

async function loadUserInfo() {
  try {
    const user = await getMe();
    setUser(user);
    const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();

    // Mobile header
    const mobileAvatar = $('#mobile-avatar');
    if (mobileAvatar) mobileAvatar.textContent = initials || 'U';

    // Sidebar
    const sidebarAvatar = $('#sidebar-avatar');
    if (sidebarAvatar) sidebarAvatar.textContent = initials || 'U';

    const sidebarName = $('#sidebar-name');
    if (sidebarName) sidebarName.textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.phone;

    const sidebarRole = $('#sidebar-role');
    if (sidebarRole) sidebarRole.textContent = user.role || 'Utilisateur';

    // Admin permissions
    if (user.role === 'admin') {
      const navUsers = $('#nav-users');
      const navOrders = $('#nav-orders');
      const bottomOrders = $('#bottom-nav-orders');
      if (navUsers) { navUsers.style.display = 'flex'; navUsers.style.removeProperty('display'); }
      if (navOrders) { navOrders.style.display = 'flex'; navOrders.style.removeProperty('display'); }
      if (bottomOrders) { bottomOrders.style.display = 'flex'; bottomOrders.style.removeProperty('display'); }
    }
  } catch {
    logout();
  }
}

function setupNavigation() {
  $$('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      $$('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      const section = item.dataset.section;
      $$('.bottom-nav-item').forEach(n => n.classList.remove('active'));
      const bottomItem = $(`.bottom-nav-item[data-section="${section}"]`);
      if (bottomItem) bottomItem.classList.add('active');

      loadSection(section);
      if (window.innerWidth <= 768) {
        $('.sidebar').classList.remove('open');
        $('#sidebar-overlay').classList.remove('active');
      }
    });
  });
}

function loadSection(sectionName) {
  $$('.section').forEach(s => s.classList.remove('active'));
  $(`#section-${sectionName}`)?.classList.add('active');

  const titleEl = $('.topbar h1');
  if (titleEl) titleEl.textContent = getSectionTitle(sectionName);

  // Gérer le bouton "Nouvelle campagne" dans la topbar globale (desktop)
  const topbarActions = $('.topbar-actions');
  let campaignBtn = $('#topbar-campaign-btn');
  const user = getUser();
  const isAdmin = user.role === 'admin';

  // Bouton dans la topbar globale (desktop)
  if (sectionName === 'campaigns' && isAdmin) {
    if (!campaignBtn && topbarActions) {
      campaignBtn = document.createElement('button');
      campaignBtn.id = 'topbar-campaign-btn';
      campaignBtn.className = 'btn btn-primary';
      campaignBtn.innerHTML = '+ Nouvelle campagne';
      campaignBtn.addEventListener('click', showCreateCampaignModal);
      topbarActions.insertBefore(campaignBtn, topbarActions.firstChild);
    }
    if (campaignBtn) campaignBtn.style.display = 'inline-flex';
  } else {
    if (campaignBtn) campaignBtn.style.display = 'none';
  }

  // Bouton dans la section (mobile) — cacher si non-admin
  const sectionCampaignBtn = $('#btn-create-campaign');
  if (sectionCampaignBtn) {
    sectionCampaignBtn.style.display = (sectionName === 'campaigns' && isAdmin) ? 'inline-flex' : 'none';
  }

  switch (sectionName) {
    case 'overview': loadOverview(); break;
    case 'campaigns': loadCampaigns(); break;
    case 'users': loadUsers(); break;
    case 'orders': loadOrders(); break;
    case 'profile': loadProfile(); break;
  }
}

function getSectionTitle(name) {
  const titles = {
    overview: '📊 Vue d\'ensemble',
    campaigns: '📢 Campagnes',
    users: '👥 Utilisateurs',
    orders: '🛒 Commandes TCL',
    profile: '👤 Mon Profil'
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

    // API status
    const apiStatus = $('#api-status');
    if (apiStatus) {
      apiStatus.textContent = '● API CONNECTÉE';
      apiStatus.className = 'badge badge-success';
    }

    // Coalition progress
    const progressEl = $('#coalition-progress');
    const progressText = $('#coalition-text');
    if (progressEl && stats.total_groups !== undefined) {
      const pct = Math.min((stats.total_groups / 232) * 100, 100);
      progressEl.style.width = pct + '%';
      if (progressText) progressText.textContent = `${stats.total_groups} / 232 groupes créés`;
    }

    container.innerHTML = `
      ${renderStatCard({
        value: formatNumber(stats.total_users),
        label: 'Utilisateurs actifs',
        icon: '👥',
        type: 'primary'
      })}
      ${renderStatCard({
        value: formatNumber(stats.total_campaigns),
        label: 'Campagnes actives',
        icon: '📢',
        type: 'success'
      })}
      ${renderStatCard({
        value: formatNumber(stats.total_orders),
        label: 'Commandes TCL',
        icon: '🛒',
        type: 'warning'
      })}
      ${renderStatCard({
        value: formatCurrency(stats.total_revenue),
        label: 'Revenus totaux',
        icon: '💰',
        type: 'accent'
      })}
      ${renderStatCard({
        value: formatNumber(stats.total_groups),
        label: 'Coalitions actives',
        icon: '🤝',
        type: 'info'
      })}
      ${renderStatCard({
        value: formatNumber(stats.pending_withdrawals),
        label: 'Retraits en attente',
        icon: '⏳',
        type: 'danger'
      })}
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">Impossible de charger les statistiques : ${err.message}</div>`;
    const apiStatus = $('#api-status');
    if (apiStatus) {
      apiStatus.textContent = '● API DÉCONNECTÉE';
      apiStatus.className = 'badge badge-danger';
    }
  }

  loadBotStats();
}

// ============================================================
// BOT STATS
// ============================================================
async function loadBotStats() {
  try {
    const data = await api('/api/v1/bot/stats');
    const latest = data.latest || {};
    const week = data.week || {};

    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = formatNumber(val);
    };

    setText('bot-conversations', latest.conversations);
    setText('bot-active', latest.active);
    setText('bot-leads', latest.leads);
    setText('bot-conversions', latest.conversions);
    setText('bot-messages', latest.messages);

    setText('bot-week-leads', week.leads);
    setText('bot-week-conversions', week.conversions);
    setText('bot-week-messages', week.messages);

    const lastUpdate = $('#bot-last-update');
    if (lastUpdate) lastUpdate.textContent = new Date().toLocaleString('fr-FR');

    // Chart
    const ctx = document.getElementById('bot-stats-chart');
    if (!ctx) return;

    if (botChartInstance) {
      botChartInstance.destroy();
      botChartInstance = null;
    }

    const labels = data.chart_labels || ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const conversationsData = data.chart_conversations || [0,0,0,0,0,0,0];
    const leadsData = data.chart_leads || [0,0,0,0,0,0,0];

    botChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Conversations',
            data: conversationsData,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Leads',
            data: leadsData,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
          x: { grid: { display: false } }
        }
      }
    });

    const errEl = $('#bot-stats-error');
    if (errEl) errEl.textContent = '';
  } catch (err) {
    console.error('Bot stats error:', err);
    const errEl = $('#bot-stats-error');
    if (errEl) errEl.textContent = 'Stats bot indisponibles : ' + err.message;
  }
}

// ============================================================
// CAMPAIGNS SECTION
// ============================================================
async function loadCampaigns() {
  const tbody = $('#campaigns-table-body');
  tbody.innerHTML = '<tr><td colspan="7" class="loading"><span class="spinner"></span> Chargement...</td></tr>';

  try {
    const params = {};
    const search = $('#camp-filter-search')?.value?.trim();
    const status = $('#camp-filter-status')?.value;
    const region = $('#camp-filter-region')?.value?.trim();
    if (search) params.search = search;
    if (status) params.status = status;
    if (region) params.region = region;

    const response = await listCampaigns(params);
    const campaigns = normalizeList(response);
    if (campaigns.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#666">Aucune campagne trouvée</td></tr>';
      return;
    }
    tbody.innerHTML = campaigns.map(c => `
      <tr>
        <td><strong>${c.name}</strong><br><small style="color:#666">${c.slug || ''}</small></td>
        <td>${c.election_type || '—'}</td>
        <td>${c.region || '—'}${c.commune ? `, ${c.commune}` : ''}</td>
        <td>${c.election_date ? formatDate(c.election_date) : '—'}</td>
        <td>${renderBadge(c.status === 'active' ? 'Active' : c.status, c.status === 'active' ? 'success' : 'warning')}</td>
        <td>${formatCurrency(c.price)}</td>
        <td style="text-align:right"><button class="btn btn-sm btn-secondary" onclick="viewCampaign('${c.id}')">Détails</button></td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="alert alert-error">${err.message}</td></tr>`;
  }
}

function showCreateCampaignModal() {
  const modal = $('#modal-campaign-overlay');
  const form = $('#form-campaign');
  if (form) form.reset();
  modal.classList.add('active');
}

// Attach campaign form submit once
document.addEventListener('DOMContentLoaded', () => {
  const form = $('#form-campaign');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:8px;"></span> Création...';

      try {
        await createCampaign({
          name: $('#camp-name').value.trim(),
          election_type: $('#camp-type').value,
          region: $('#camp-region').value.trim(),
          commune: $('#camp-commune').value.trim() || null,
          election_date: $('#camp-date').value || null,
          description: $('#camp-desc').value.trim() || null,
          price: parseInt($('#camp-price').value || '0', 10),
          pricing_model: $('#camp-pricing').value
        });
        $('#modal-campaign-overlay').classList.remove('active');
        showToast('Campagne créée avec succès !', 'success');
        loadCampaigns();
      } catch (err) {
        showAlert(err.message, 'error', form);
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    });
  }
});

function viewCampaign(id) {
  showToast(`Détails de la campagne ${id} — bientôt disponible`, 'info');
}

// ============================================================
// USERS SECTION
// ============================================================
async function loadUsers() {
  const tbody = $('#users-table-body');
  tbody.innerHTML = '<tr><td colspan="7" class="loading"><span class="spinner"></span> Chargement...</td></tr>';

  try {
    const response = await listUsers({ limit: 50 });
    const users = normalizeList(response);
    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#666">Aucun utilisateur trouvé</td></tr>';
      return;
    }
    tbody.innerHTML = users.map(u => `
      <tr>
        <td><strong>${u.first_name || ''} ${u.last_name || ''}</strong><br><small style="color:#666">${u.ngd_id || '—'}</small></td>
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
  tbody.innerHTML = '<tr><td colspan="8" class="loading"><span class="spinner"></span> Chargement...</td></tr>';

  try {
    const response = await getOrders({ limit: 50 });
    const orders = normalizeList(response);
    if (orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#666">Aucune commande trouvée</td></tr>';
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
        <td style="text-align:right"><button class="btn btn-sm btn-primary" onclick="showPaymentModal('${o.id}', ${o.total_amount || 0})">Payer</button></td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="alert alert-error">${err.message}</td></tr>`;
  }
}

function showPaymentModal(orderId, amount) {
  const modal = $('#modal-payment-overlay');
  $('#pay-order-id').value = orderId || '';
  $('#pay-amount').textContent = formatCurrency(amount);
  modal.classList.add('active');
}

// ============================================================
// PROFILE SECTION
// ============================================================
async function loadProfile() {
  let user = getUser();

  // Essayer de récupérer les données fraîches depuis l'API
  try {
    const fresh = await getMe();
    if (fresh && fresh.id) {
      setUser(fresh);
      user = fresh;
    }
  } catch (e) {
    console.warn('getMe failed in loadProfile, using cached user');
  }

  if (!user || !user.id) return;

  const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();

  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || '—';
  };

  const avatar = $('#profile-avatar');
  if (avatar) avatar.textContent = initials || 'U';

  const name = $('#profile-name');
  if (name) name.textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.phone;

  const role = $('#profile-role');
  if (role) role.textContent = user.role || 'Utilisateur';

  setText('prof-display-ngd', user.ngd_id);
  setText('prof-display-name', `${user.first_name || ''} ${user.last_name || ''}`.trim());
  setText('prof-display-phone', user.phone);
  setText('prof-display-email', user.email);
  setText('prof-display-region', user.region);
  setText('prof-display-commune', user.commune);
  setText('prof-display-role', user.role);
  setText('prof-display-profile', user.profile_type);

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  };

  setVal('prof-first-name', user.first_name);
  setVal('prof-last-name', user.last_name);
  setVal('prof-phone', user.phone);
  setVal('prof-email', user.email);
  setVal('prof-region-input', user.region);
  setVal('prof-commune-input', user.commune);
}

// ============================================================
// API URL CONFIG (debug)
// ============================================================
window.setApiUrl = function(url) {
  localStorage.setItem('api_url', url);
  location.reload();
};
