/* ============================================================
   COALITION 509 — Frontend Logic
   VoteConnect Ecosystem | ChallengeFinancier™
   v1.5.4 (match backend v2.7.9)
   ============================================================ */

const API_BASE_URL = localStorage.getItem('api_url') || 'https://coalition509-api.onrender.com';

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

function normalizeList(response, key) {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (key && response[key] && Array.isArray(response[key])) return response[key];
  if (response.items && Array.isArray(response.items)) return response.items;
  if (response.data && Array.isArray(response.data)) return response.data;
  if (response.results && Array.isArray(response.results)) return response.results;
  return [];
}

function showAlert(message, type, container) {
  const div = document.createElement('div');
  div.className = 'alert alert-' + type;
  div.innerHTML = '<span>' + message + '</span>';
  if (container) container.prepend(div);
  else document.body.insertBefore(div, document.body.firstChild);
  setTimeout(() => div.remove(), 5000);
}

function showToast(message, type) {
  const container = document.getElementById('toast-container');
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
  try { 
    const raw = JSON.parse(localStorage.getItem('user') || '{}');
    return raw.user || raw;
  }
  catch { return {}; }
}

function setUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}

async function api(endpoint, options) {
  options = options || {};
  const url = API_BASE_URL + endpoint;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  try {
    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || data.message || 'Erreur ' + res.status);
    return data;
  } catch (err) {
    console.error('API Error:', err);
    throw err;
  }
}

async function login(phone, pin) {
  const data = await api('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ phone, pin }) });
  setToken(data.access_token);
  setUser(data.user);
  return data;
}

async function register(userData) {
  return api('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(userData) });
}

async function getMe() {
  const data = await api('/api/v1/auth/me');
  return data.user || data;
}

function logout() {
  clearAuth();
  window.location.href = 'index.html';
}

async function getDashboardStats() {
  return api('/api/v1/dashboard/stats');
}

async function listCampaigns(params) {
  const qs = new URLSearchParams(params || {}).toString();
  return api('/api/v1/campaigns?' + qs);
}

async function createCampaign(data) {
  return api('/api/v1/campaigns', { method: 'POST', body: JSON.stringify(data) });
}

async function listUsers(params) {
  const qs = new URLSearchParams(params || {}).toString();
  return api('/api/v1/users?' + qs);
}

async function getOrders(params) {
  const qs = new URLSearchParams(params || {}).toString();
  return api('/api/v1/orders?' + qs);
}

function renderStatCard(opts) {
  const changeHtml = opts.change !== null && opts.change !== undefined
    ? '<div class="stat-change ' + (opts.change >= 0 ? 'positive' : 'negative') + '">' + (opts.change >= 0 ? '↑' : '↓') + ' ' + Math.abs(opts.change) + '%</div>'
    : '';
  return '<div class="stat-card ' + (opts.type || 'primary') + '">' +
    '<div class="stat-header"><div class="stat-icon">' + opts.icon + '</div></div>' +
    '<div class="stat-info"><div class="stat-value">' + opts.value + '</div><div class="stat-label">' + opts.label + '</div></div>' +
    changeHtml + '</div>';
}

function renderBadge(text, type) {
  return '<span class="badge badge-' + type + '">' + text + '</span>';
}

document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  if (path.includes('index.html') || path === '/' || path === '') initAuthPage();
  else if (path.includes('dashboard.html')) initDashboardPage();
});

function initAuthPage() {
  // ── v1.5.4 : Auto-auth depuis lien bot ────────────────────
  const urlParams = new URLSearchParams(window.location.search);
  const botAuth = urlParams.get('bot_auth');
  if (botAuth) {
    // Nettoyer l'URL pour ne pas exposer le token dans l'historique
    window.history.replaceState({}, document.title, window.location.pathname);
    api('/api/v1/auth/verify-bot-token', {
      method: 'POST',
      body: JSON.stringify({ token: botAuth })
    }).then(data => {
      if (data.ok && data.access_token) {
        setToken(data.access_token);
        if (data.user) setUser(data.user);
        window.location.href = 'dashboard.html';
      } else if (data.needs_registration) {
        localStorage.setItem('bot_phone', data.phone || '');
        showToast('Veuillez compléter votre inscription', 'info');
        // Laisser le formulaire s'afficher, pré-remplir le téléphone
        const regPhone = document.getElementById('reg-phone');
        if (regPhone && data.phone) regPhone.value = data.phone;
        if (registerTab) registerTab.click();
      } else {
        showToast('Lien de connexion invalide ou expiré', 'error');
      }
    }).catch(err => {
      console.error('Bot auth error:', err);
      showToast('Erreur de connexion automatique', 'error');
    });
    return;
  }

  if (getToken()) { window.location.href = 'dashboard.html'; return; }

  const loginTab = document.getElementById('tab-login');
  const registerTab = document.getElementById('tab-register');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const modeUser = document.getElementById('mode-user');
  const modeAdmin = document.getElementById('mode-admin');
  const adminHint = document.getElementById('admin-hint');
  const tabsContainer = document.querySelector('.tabs');
  const authContainer = document.getElementById('auth-container');

  function getVal(id, name) {
    const el = document.getElementById(id);
    if (el) return el.value;
    const byName = document.querySelector('input[name="' + name + '"]');
    return byName ? byName.value : '';
  }

  function showAuthError(msg) {
    const existing = document.querySelector('.auth-error');
    if (existing) existing.remove();
    if (!msg) return;
    const div = document.createElement('div');
    div.className = 'auth-error';
    div.style.cssText = 'background:#f8d7da;color:#721c24;padding:12px 16px;border-radius:10px;margin-bottom:16px;font-size:14px;';
    div.textContent = msg;
    if (authContainer) authContainer.insertBefore(div, authContainer.children[3]);
  }

  if (modeUser) {
    modeUser.addEventListener('click', () => {
      modeUser.classList.add('active');
      if (modeAdmin) modeAdmin.classList.remove('active');
      if (adminHint) adminHint.classList.remove('visible');
      if (tabsContainer) tabsContainer.style.display = 'flex';
    });
  }

  if (modeAdmin) {
    modeAdmin.addEventListener('click', () => {
      modeAdmin.classList.add('active');
      if (modeUser) modeUser.classList.remove('active');
      if (adminHint) adminHint.classList.add('visible');
      if (tabsContainer) tabsContainer.style.display = 'none';
      if (loginTab) loginTab.classList.add('active');
      if (registerTab) registerTab.classList.remove('active');
      if (loginForm) loginForm.style.display = 'block';
      if (registerForm) registerForm.style.display = 'none';
    });
  }

  if (loginTab) {
    loginTab.addEventListener('click', () => {
      loginTab.classList.add('active');
      if (registerTab) registerTab.classList.remove('active');
      if (loginForm) loginForm.style.display = 'block';
      if (registerForm) registerForm.style.display = 'none';
    });
  }

  if (registerTab) {
    registerTab.addEventListener('click', () => {
      registerTab.classList.add('active');
      if (loginTab) loginTab.classList.remove('active');
      if (registerForm) registerForm.style.display = 'block';
      if (loginForm) loginForm.style.display = 'none';
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = loginForm.querySelector('button[type="submit"]');
      if (!btn) return;
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:8px;"></span> Connexion...';
      btn.disabled = true;
      try {
        const phone = getVal('login-phone', 'phone').trim();
        const pin = getVal('login-pin', 'pin');
        if (!phone || !pin) { showAuthError('Veuillez remplir tous les champs.'); btn.innerHTML = originalText; btn.disabled = false; return; }
        await login(phone, pin);
        window.location.href = 'dashboard.html';
      } catch (err) {
        showAuthError(err.message || 'Erreur de connexion');
        btn.innerHTML = originalText; btn.disabled = false;
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pin = getVal('reg-pin', 'pin');
      const pinConfirm = getVal('reg-pin-confirm', 'pin_confirm');
      if (pin !== pinConfirm) { showAuthError('Les codes PIN ne correspondent pas.'); return; }
      const btn = registerForm.querySelector('button[type="submit"]');
      if (!btn) return;
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:8px;"></span> Création...';
      btn.disabled = true;
      try {
        const data = {
          phone: getVal('reg-phone', 'phone').trim(),
          first_name: getVal('reg-firstname', 'first_name').trim(),
          last_name: getVal('reg-lastname', 'last_name').trim(),
          email: getVal('reg-email', 'email').trim() || null,
          pin: pin,
          profile_type: document.getElementById('reg-profile')?.value || 'Animateur NGD',
          region: getVal('reg-region', 'region').trim() || null,
          commune: getVal('reg-commune', 'commune').trim() || null
        };
        await register(data);
        showAuthError('');
        const successDiv = document.createElement('div');
        successDiv.style.cssText = 'background:#d4edda;color:#155724;padding:12px 16px;border-radius:10px;margin-bottom:16px;font-size:14px;';
        successDiv.textContent = 'Compte créé avec succès ! Connectez-vous.';
        if (authContainer) authContainer.insertBefore(successDiv, authContainer.children[3]);
        setTimeout(() => successDiv.remove(), 5000);
        if (loginTab) loginTab.click();
        registerForm.reset();
      } catch (err) {
        showAuthError(err.message || 'Erreur lors de l\'inscription');
      } finally {
        btn.innerHTML = originalText; btn.disabled = false;
      }
    });
  }
}

let botChartInstance = null;

function initDashboardPage() {
  if (!getToken()) { window.location.href = 'index.html'; return; }
  loadUserInfo();
  setupNavigation();
  setupGlobalListeners();
  loadSection('overview');
}

function setupGlobalListeners() {
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  if (mobileToggle) mobileToggle.addEventListener('click', () => {
    document.querySelector('.sidebar')?.classList.add('open');
    document.getElementById('sidebar-overlay')?.classList.add('active');
  });

  const overlay = document.getElementById('sidebar-overlay');
  if (overlay) overlay.addEventListener('click', () => {
    document.querySelector('.sidebar')?.classList.remove('open');
    overlay.classList.remove('active');
  });

  document.getElementById('logout-btn-desktop')?.addEventListener('click', logout);
  document.getElementById('logout-btn')?.addEventListener('click', logout);

  document.getElementById('refresh-btn')?.addEventListener('click', () => {
    const section = document.querySelector('.nav-item.active')?.dataset.section || 'overview';
    loadSection(section);
    showToast('Données actualisées', 'success');
  });

  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.dataset.section;
      if (!section) return;
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      const sidebarItem = document.querySelector('.nav-item[data-section="' + section + '"]');
      if (sidebarItem) sidebarItem.classList.add('active');
      document.querySelectorAll('.bottom-nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      loadSection(section);
    });
  });

  document.getElementById('btn-create-campaign')?.addEventListener('click', showCreateCampaignModal);
  document.getElementById('modal-campaign-cancel')?.addEventListener('click', () => {
    document.getElementById('modal-campaign-overlay')?.classList.remove('active');
  });
  document.getElementById('modal-campaign-close')?.addEventListener('click', () => {
    document.getElementById('modal-campaign-overlay')?.classList.remove('active');
  });
  document.getElementById('modal-payment-close')?.addEventListener('click', () => {
    document.getElementById('modal-payment-overlay')?.classList.remove('active');
  });

  document.getElementById('form-profile')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPin = document.getElementById('prof-new-pin')?.value;
    const confirmPin = document.getElementById('prof-confirm-pin')?.value;
    if (newPin && newPin !== confirmPin) { showToast('Les PIN ne correspondent pas', 'error'); return; }
    showToast('Profil mis à jour (simulation)', 'success');
  });

  document.getElementById('camp-filter-apply')?.addEventListener('click', loadCampaigns);

  document.querySelectorAll('[data-export]').forEach(btn => {
    btn.addEventListener('click', () => {
      showToast('Export ' + btn.dataset.export + ' — bientôt disponible', 'info');
    });
  });
}

async function loadUserInfo() {
  try {
    const data = await getMe();
    const user = data.user || data;
    if (user && user.id) setUser(user);
    const initials = (user.first_name?.[0] || '') + (user.last_name?.[0] || '');
    const mobileAvatar = document.getElementById('mobile-avatar');
    if (mobileAvatar) mobileAvatar.textContent = initials.toUpperCase() || 'U';
    const sidebarAvatar = document.getElementById('sidebar-avatar');
    if (sidebarAvatar) sidebarAvatar.textContent = initials.toUpperCase() || 'U';
    const sidebarName = document.getElementById('sidebar-name');
    if (sidebarName) sidebarName.textContent = ((user.first_name || '') + ' ' + (user.last_name || '')).trim() || user.phone;
    const sidebarRole = document.getElementById('sidebar-role');
    if (sidebarRole) sidebarRole.textContent = (user.role || 'Utilisateur').toUpperCase();

    const role = (user.role || '').toString().toLowerCase().trim();
    const isAdmin = role === 'admin';

    const navUsers = document.getElementById('nav-users');
    const navOrders = document.getElementById('nav-orders');
    const bottomOrders = document.getElementById('bottom-nav-orders');

    if (isAdmin) {
      if (navUsers) { navUsers.style.display = 'flex'; navUsers.classList.remove('hidden'); }
      if (navOrders) { navOrders.style.display = 'flex'; navOrders.classList.remove('hidden'); }
      if (bottomOrders) { bottomOrders.style.display = 'flex'; bottomOrders.classList.remove('hidden'); }
    } else {
      if (navUsers) navUsers.style.display = 'none';
      if (navOrders) navOrders.style.display = 'none';
      if (bottomOrders) bottomOrders.style.display = 'none';
    }
  } catch (err) {
    console.error('loadUserInfo error:', err);
    showToast('Erreur de chargement du profil', 'error');
  }
}

function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      const section = item.dataset.section;
      document.querySelectorAll('.bottom-nav-item').forEach(n => n.classList.remove('active'));
      const bottomItem = document.querySelector('.bottom-nav-item[data-section="' + section + '"]');
      if (bottomItem) bottomItem.classList.add('active');
      loadSection(section);
      if (window.innerWidth <= 768) {
        document.querySelector('.sidebar')?.classList.remove('open');
        document.getElementById('sidebar-overlay')?.classList.remove('active');
      }
    });
  });
}

function loadSection(sectionName) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('section-' + sectionName)?.classList.add('active');
  const titleEl = document.querySelector('.topbar h1');
  if (titleEl) titleEl.textContent = getSectionTitle(sectionName);

  const user = getUser();
  const role = (user.role || '').toString().toLowerCase().trim();
  const isAdmin = role === 'admin';

  const topbarActions = document.querySelector('.topbar-actions');
  let campaignBtn = document.getElementById('topbar-campaign-btn');
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

  const sectionCampaignBtn = document.getElementById('btn-create-campaign');
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

async function loadOverview() {
  const container = document.getElementById('overview-stats');
  container.innerHTML = '<div class="loading"><span class="spinner"></span> Chargement des statistiques...</div>';
  try {
    const stats = await getDashboardStats();
    const apiStatus = document.getElementById('api-status');
    if (apiStatus) { apiStatus.textContent = '● API CONNECTÉE'; apiStatus.className = 'badge badge-success'; }

    const progressEl = document.getElementById('coalition-progress');
    const progressText = document.getElementById('coalition-text');
    const totalGroups = stats.total_groups || stats.total_campaigns || 0;
    if (progressEl) {
      progressEl.style.width = Math.min((totalGroups / 232) * 100, 100) + '%';
      if (progressText) progressText.textContent = totalGroups + ' / 232 groupes créés';
    }

    container.innerHTML =
      renderStatCard({ value: formatNumber(stats.total_users), label: 'Utilisateurs actifs', icon: '👥', type: 'primary' }) +
      renderStatCard({ value: formatNumber(stats.total_campaigns), label: 'Campagnes actives', icon: '📢', type: 'success' }) +
      renderStatCard({ value: formatNumber(stats.total_orders), label: 'Commandes TCL', icon: '🛒', type: 'warning' }) +
      renderStatCard({ value: formatCurrency(stats.total_revenue), label: 'Revenus totaux', icon: '💰', type: 'accent' }) +
      renderStatCard({ value: formatNumber(stats.pending_orders), label: 'Commandes en attente', icon: '⏳', type: 'danger' }) +
      renderStatCard({ value: formatNumber(stats.paid_orders), label: 'Commandes payées', icon: '✅', type: 'info' });
  } catch (err) {
    container.innerHTML = '<div class="alert alert-error">Impossible de charger les statistiques : ' + err.message + '</div>';
    const apiStatus = document.getElementById('api-status');
    if (apiStatus) { apiStatus.textContent = '● API DÉCONNECTÉE'; apiStatus.className = 'badge badge-danger'; }
  }
  loadBotStats();
}

async function loadBotStats() {
  try {
    const data = await api('/api/v1/bot/stats');
    const latest = data.latest || {};
    const week = data.week || [];

    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = formatNumber(val);
    };
    setText('bot-conversations', latest.conversations);
    setText('bot-active', latest.active !== undefined ? latest.active : (latest.conversations || 0));
    setText('bot-leads', latest.leads);
    setText('bot-conversions', latest.conversions);
    setText('bot-messages', latest.messages);

    const lastWeek = week[week.length - 1] || {};
    setText('bot-week-leads', lastWeek.leads);
    setText('bot-week-conversions', lastWeek.conversions);
    setText('bot-week-messages', lastWeek.messages);

    const lastUpdate = document.getElementById('bot-last-update');
    if (lastUpdate) lastUpdate.textContent = new Date().toLocaleString('fr-FR');

    const ctx = document.getElementById('bot-stats-chart');
    if (!ctx) return;
    if (botChartInstance) { botChartInstance.destroy(); botChartInstance = null; }

    const labels = week.map(w => {
      const d = new Date(w.date);
      return ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][d.getDay()];
    });
    const conversationsData = week.map(w => w.conversations || 0);
    const leadsData = week.map(w => w.leads || 0);

    botChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.length ? labels : ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'],
        datasets: [
          { label: 'Conversations', data: conversationsData.length ? conversationsData : [0,0,0,0,0,0,0], borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', tension: 0.4, fill: true },
          { label: 'Leads', data: leadsData.length ? leadsData : [0,0,0,0,0,0,0], borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', tension: 0.4, fill: true }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
          x: { grid: { display: false } }
        }
      }
    });
    const errEl = document.getElementById('bot-stats-error');
    if (errEl) errEl.textContent = '';
  } catch (err) {
    console.error('Bot stats error:', err);
    const errEl = document.getElementById('bot-stats-error');
    if (errEl) errEl.textContent = 'Stats bot indisponibles : ' + err.message;
  }
}

async function loadCampaigns() {
  const tbody = document.getElementById('campaigns-table-body');
  tbody.innerHTML = '<tr><td colspan="7" class="loading"><span class="spinner"></span> Chargement...</td></tr>';
  try {
    const params = {};
    const search = document.getElementById('camp-filter-search')?.value?.trim();
    const status = document.getElementById('camp-filter-status')?.value;
    const region = document.getElementById('camp-filter-region')?.value?.trim();
    if (search) params.search = search;
    if (status) params.status = status;
    if (region) params.region = region;

    const response = await listCampaigns(params);
    const campaigns = normalizeList(response, 'campaigns');
    if (campaigns.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#666">Aucune campagne trouvée</td></tr>';
      return;
    }
    tbody.innerHTML = campaigns.map(c =>
      '<tr>' +
        '<td><strong>' + (c.name || '') + '</strong></td>' +
        '<td>' + (c.region || '—') + '</td>' +
        '<td>' + (c.commune || '—') + '</td>' +
        '<td>' + (c.election_date ? formatDate(c.election_date) : '—') + '</td>' +
        '<td>' + renderBadge(c.status === 'active' ? 'Active' : c.status, c.status === 'active' ? 'success' : 'warning') + '</td>' +
        '<td>' + (c.description ? (c.description.length > 40 ? c.description.substring(0,40)+'...' : c.description) : '—') + '</td>' +
        '<td style="text-align:right"><button class="btn btn-sm btn-secondary" onclick="viewCampaign(' + c.id + ')">Détails</button></td>' +
      '</tr>'
    ).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="7" class="alert alert-error">' + err.message + '</td></tr>';
  }
}

function showCreateCampaignModal() {
  const modal = document.getElementById('modal-campaign-overlay');
  const form = document.getElementById('form-campaign');
  if (form) form.reset();
  if (modal) modal.classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-campaign');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      if (!btn) return;
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:8px;"></span> Création...';
      try {
        await createCampaign({
          name: document.getElementById('camp-name')?.value?.trim(),
          election_type: document.getElementById('camp-type')?.value,
          region: document.getElementById('camp-region')?.value?.trim(),
          commune: document.getElementById('camp-commune')?.value?.trim() || null,
          election_date: document.getElementById('camp-date')?.value || null,
          description: document.getElementById('camp-desc')?.value?.trim() || null,
          price: parseInt(document.getElementById('camp-price')?.value || '0', 10),
          pricing_model: document.getElementById('camp-pricing')?.value
        });
        document.getElementById('modal-campaign-overlay')?.classList.remove('active');
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
  showToast('Détails de la campagne ' + id + ' — bientôt disponible', 'info');
}

async function loadUsers() {
  const tbody = document.getElementById('users-table-body');
  tbody.innerHTML = '<tr><td colspan="7" class="loading"><span class="spinner"></span> Chargement...</td></tr>';
  try {
    const response = await listUsers({ limit: 50 });
    const users = normalizeList(response, 'users');
    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#666">Aucun utilisateur trouvé</td></tr>';
      return;
    }
    tbody.innerHTML = users.map(u =>
      '<tr>' +
        '<td><strong>' + (u.first_name || '') + ' ' + (u.last_name || '') + '</strong><br><small style="color:#666">' + (u.ngd_id || '—') + '</small></td>' +
        '<td>' + (u.phone || '—') + '</td>' +
        '<td>' + (u.email || '—') + '</td>' +
        '<td>' + (u.profile_type || '—') + '</td>' +
        '<td>' + (u.region || '—') + '</td>' +
        '<td>' + renderBadge(u.status === 'active' ? 'Actif' : u.status, u.status === 'active' ? 'success' : 'danger') + '</td>' +
        '<td>' + formatDate(u.created_at) + '</td>' +
      '</tr>'
    ).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="7" class="alert alert-error">' + err.message + '</td></tr>';
  }
}

async function loadOrders() {
  const tbody = document.getElementById('orders-table-body');
  tbody.innerHTML = '<tr><td colspan="8" class="loading"><span class="spinner"></span> Chargement...</td></tr>';
  try {
    const response = await getOrders({ limit: 50 });
    const orders = normalizeList(response, 'orders');
    if (orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#666">Aucune commande trouvée</td></tr>';
      return;
    }
    tbody.innerHTML = orders.map(o =>
      '<tr>' +
        '<td><strong>#' + (o.order_number || '') + '</strong></td>' +
        '<td>' + (o.user?.first_name || '') + ' ' + (o.user?.last_name || '') + '<br><small>' + (o.user?.phone || '') + '</small></td>' +
        '<td>' + formatCurrency(o.total_amount) + '</td>' +
        '<td>' + (o.region || '—') + (o.commune ? ', ' + o.commune : '') + '</td>' +
        '<td>' + renderBadge(o.status === 'pending' ? 'En attente' : o.status, o.status === 'pending' ? 'warning' : 'success') + '</td>' +
        '<td>' + renderBadge(o.payment_status === 'paid' ? 'Payé' : o.payment_status || 'En attente', o.payment_status === 'paid' ? 'success' : 'warning') + '</td>' +
        '<td>' + formatDate(o.created_at) + '</td>' +
        '<td style="text-align:right"><button class="btn btn-sm btn-primary" onclick="showPaymentModal(' + (o.id ? "'" + o.id + "'" : "null") + ', ' + (o.total_amount || 0) + ')">Payer</button></td>' +
      '</tr>'
    ).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="8" class="alert alert-error">' + err.message + '</td></tr>';
  }
}

function showPaymentModal(orderId, amount) {
  const modal = document.getElementById('modal-payment-overlay');
  const orderInput = document.getElementById('pay-order-id');
  const amountDiv = document.getElementById('pay-amount');
  if (orderInput) orderInput.value = orderId || '';
  if (amountDiv) amountDiv.textContent = formatCurrency(amount);
  if (modal) modal.classList.add('active');
}

async function loadProfile() {
  let user = getUser();
  try {
    const fresh = await getMe();
    const freshUser = fresh.user || fresh;
    if (freshUser && freshUser.id) { setUser(freshUser); user = freshUser; }
  } catch (e) {
    console.warn('getMe failed in loadProfile, using cached user');
  }
  if (!user || !user.id) return;

  const initials = ((user.first_name?.[0] || '') + (user.last_name?.[0] || '')).toUpperCase();
  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || '—';
  };

  const avatar = document.getElementById('profile-avatar');
  if (avatar) avatar.textContent = initials || 'U';
  const name = document.getElementById('profile-name');
  if (name) name.textContent = ((user.first_name || '') + ' ' + (user.last_name || '')).trim() || user.phone;
  const role = document.getElementById('profile-role');
  if (role) role.textContent = user.role || 'Utilisateur';

  setText('prof-display-ngd', user.ngd_id);
  setText('prof-display-name', (user.first_name || '') + ' ' + (user.last_name || ''));
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

window.setApiUrl = function(url) {
  localStorage.setItem('api_url', url);
  location.reload();
};
