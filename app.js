/* ============================================================
   COALITION 509 — Frontend Logic
   VoteConnect Ecosystem | ChallengeFinancier™
   v1.7.0 (match backend v2.9.1)
   Module SHOP intégré : Catalogue, Panier, Commandes, Fournisseurs,
   Livraisons, Paiements, Factures, Stocks
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

function normaliserTel(tel) {
  let t = (tel || '').toString().trim();
  t = t.replace(/\s/g, '').replace(/-/g, '').replace(/\./g, '').replace(/\(/g, '').replace(/\)/g, '');
  if (t.startsWith('+')) t = '00' + t.slice(1);
  if (t.startsWith('225') && !t.startsWith('00225')) t = '00' + t;
  if (t.startsWith('509') && !t.startsWith('00509')) t = '00' + t;
  return t;
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

function getToken() { return localStorage.getItem('access_token'); }
function setToken(token) { localStorage.setItem('access_token', token); }
function clearAuth() { localStorage.removeItem('access_token'); localStorage.removeItem('user'); }
function getUser() {
  try { const raw = JSON.parse(localStorage.getItem('user') || '{}'); return raw.user || raw; }
  catch { return {}; }
}
function setUser(user) { localStorage.setItem('user', JSON.stringify(user)); }

async function api(endpoint, options) {
  options = options || {};
  const url = API_BASE_URL + endpoint;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const res = await fetch(url, { ...options, headers, signal: options.signal });
  const isAuthRoute = endpoint.includes('/auth/login') || endpoint.includes('/auth/register') || endpoint.includes('/auth/verify-bot-token');

  if (res.status === 401 && !isAuthRoute) {
    clearAuth();
    window.location.href = 'index.html';
    const err = new Error('SESSION_EXPIRED');
    err.handled = true;
    throw err;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.message || 'Erreur ' + res.status);
  return data;
}

async function login(phone, pin) {
  const data = await api('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ phone: normaliserTel(phone), pin }) });
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

async function getDashboardStats() { return api('/api/v1/dashboard/stats'); }
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

/* ========== SHOP API ========== */

function setShopLoader(element, html, timeoutMsg) {
  element.innerHTML = html;
  return setTimeout(() => {
    element.innerHTML = '<p style="text-align:center;padding:40px;color:#888;">' + (timeoutMsg || '⏳ Chargement des données...') + '</p>';
  }, 8000);
}

async function shopListProducts(params, signal) {
  const qs = new URLSearchParams(params || {}).toString();
  return api('/api/shop/products?' + qs, { signal });
}
async function shopCreateProduct(data) {
  return api('/api/shop/products', { method: 'POST', body: JSON.stringify(data) });
}
async function shopUpdateProduct(data) {
  return api('/api/shop/products/update', { method: 'POST', body: JSON.stringify(data) });
}
async function shopDeleteProduct(id) {
  return api('/api/shop/products/delete', { method: 'POST', body: JSON.stringify({ id }) });
}
async function shopGetCart() {
  return api('/api/shop/cart');
}
async function shopAddToCart(product_id, quantity) {
  return api('/api/shop/cart/add', { method: 'POST', body: JSON.stringify({ product_id, quantity }) });
}
async function shopRemoveFromCart(id) {
  return api('/api/shop/cart/remove', { method: 'POST', body: JSON.stringify({ id }) });
}
async function shopClearCart() {
  return api('/api/shop/cart/clear', { method: 'POST' });
}
async function shopCreateOrder(data) {
  return api('/api/shop/orders/create', { method: 'POST', body: JSON.stringify(data) });
}
async function shopListOrders(params) {
  const qs = new URLSearchParams(params || {}).toString();
  return api('/api/shop/orders?' + qs);
}
async function shopGetOrder(id) {
  return api('/api/shop/orders/detail?id=' + id);
}
async function shopUpdateOrder(data) {
  return api('/api/shop/orders/update', { method: 'POST', body: JSON.stringify(data) });
}
async function shopDeleteOrder(id) {
  return api('/api/shop/orders/delete', { method: 'POST', body: JSON.stringify({ id }) });
}
async function shopListSuppliers(params) {
  const qs = new URLSearchParams(params || {}).toString();
  return api('/api/shop/suppliers?' + qs);
}
async function shopCreateSupplier(data) {
  return api('/api/shop/suppliers', { method: 'POST', body: JSON.stringify(data) });
}
async function shopUpdateSupplier(data) {
  return api('/api/shop/suppliers/update', { method: 'POST', body: JSON.stringify(data) });
}
async function shopDeleteSupplier(id) {
  return api('/api/shop/suppliers/delete', { method: 'POST', body: JSON.stringify({ id }) });
}
async function shopListDeliveries(params) {
  const qs = new URLSearchParams(params || {}).toString();
  return api('/api/shop/deliveries?' + qs);
}
async function shopUpdateDelivery(data) {
  return api('/api/shop/deliveries/update', { method: 'POST', body: JSON.stringify(data) });
}
async function shopListInvoices(params) {
  const qs = new URLSearchParams(params || {}).toString();
  return api('/api/shop/invoices?' + qs);
}
async function shopUpdateInvoice(data) {
  return api('/api/shop/invoices/update', { method: 'POST', body: JSON.stringify(data) });
}
async function shopListStock(params) {
  const qs = new URLSearchParams(params || {}).toString();
  return api('/api/shop/stock-movements?' + qs);
}
async function shopAddStock(data) {
  return api('/api/shop/stock-movements/add', { method: 'POST', body: JSON.stringify(data) });
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

/* ========== INIT ========== */
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  if (path.includes('index.html') || path === '/' || path === '') initAuthPage();
  else if (path.includes('dashboard.html')) initDashboardPage();
});

function initAuthPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const botAuth = urlParams.get('bot_auth');

  if (botAuth) {
    console.log('[BOT AUTH] Token recu:', botAuth);
    window.history.replaceState({}, document.title, window.location.pathname);
    api('/api/v1/auth/verify-bot-token', {
      method: 'POST',
      body: JSON.stringify({ token: botAuth })
    }).then(data => {
      console.log('[BOT AUTH] Reponse backend:', data);
      if (data.ok && data.access_token) {
        setToken(data.access_token);
        if (data.user) setUser(data.user);
        console.log('[BOT AUTH] Connexion directe OK, redirect dashboard');
        window.location.href = 'dashboard.html';
      } else if (data.needs_registration) {
        console.log('[BOT AUTH] Inscription requise pour:', data.phone);
        showToast('Veuillez compléter votre inscription', 'info');
        const modeUser = document.getElementById('mode-user');
        if (modeUser) modeUser.click();
        const regPhone = document.getElementById('reg-phone');
        if (regPhone && data.phone) {
          regPhone.value = data.phone;
          console.log('[BOT AUTH] Telephone pre-rempli:', data.phone);
        }
        const loginPhone = document.getElementById('login-phone');
        if (loginPhone && data.phone) loginPhone.value = data.phone;
        const regTab = document.getElementById('tab-register');
        if (regTab) regTab.click();
      } else {
        console.log('[BOT AUTH] Lien invalide:', data);
        showToast('Lien de connexion invalide ou expiré', 'error');
      }
    }).catch(err => {
      if (err.handled) return;
      console.error('[BOT AUTH] Erreur:', err);
      showToast('Erreur de connexion automatique — backend indisponible (500)', 'error');
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
        if (err.handled) return;
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
          phone: normaliserTel(getVal('reg-phone', 'phone').trim()),
          first_name: getVal('reg-firstname', 'first_name').trim(),
          last_name: getVal('reg-lastname', 'last_name').trim(),
          email: getVal('reg-email', 'email').trim() || null,
          pin: pin,
          profile_type: document.getElementById('reg-profile')?.value || 'Animateur NGD',
          region: getVal('reg-region', 'region').trim() || null,
          commune: getVal('reg-commune', 'commune').trim() || null
        };
        const result = await register(data);
        if (result.access_token) {
          setToken(result.access_token);
          if (result.user) setUser(result.user);
          window.location.href = 'dashboard.html';
          return;
        }
        showAuthError('');
        const successDiv = document.createElement('div');
        successDiv.style.cssText = 'background:#d4edda;color:#155724;padding:12px 16px;border-radius:10px;margin-bottom:16px;font-size:14px;';
        successDiv.textContent = 'Compte créé avec succès ! Connectez-vous.';
        if (authContainer) authContainer.insertBefore(successDiv, authContainer.children[3]);
        setTimeout(() => successDiv.remove(), 5000);
        if (loginTab) loginTab.click();
        registerForm.reset();
      } catch (err) {
        if (err.handled) return;
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
  // Injecte CSS dynamique pour cacher les sous-onglets Shop inactifs (évite conflit avec style.css)
  if (!document.getElementById('shop-tab-css')) {
    const s = document.createElement('style');
    s.id = 'shop-tab-css';
    s.textContent = '.shop-tab-content { display: none !important; } .shop-tab-content.active { display: block !important; }';
    document.head.appendChild(s);
  }
  // FIX v1.6.4: init display sous-onglets Shop
  document.querySelectorAll('.shop-tab-content').forEach(c => {
    if (!c.classList.contains('active')) c.style.display = 'none';
    else c.style.display = 'block';
  });
  loadUserInfo();
  setupNavigation();
  setupGlobalListeners();
  setupShopListeners();
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

  document.getElementById('modal-campaign-detail-close')?.addEventListener('click', () => {
    document.getElementById('modal-campaign-detail-overlay')?.classList.remove('active');
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
      const type = btn.dataset.export;
      const token = getToken();
      if (!token) { showToast('Non connecté', 'error'); return; }
      window.open(API_BASE_URL + '/api/v1/export/' + type + '?access_token=' + token);
      showToast('Export ' + type + ' téléchargé ✅', 'success');
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
    const navShop = document.getElementById('nav-shop');
    const bottomShop = document.getElementById('bottom-nav-shop');
    const shopAdminActions = document.getElementById('shop-admin-actions');

    if (isAdmin) {
      if (navUsers) { navUsers.style.display = 'flex'; navUsers.classList.remove('hidden'); }
      if (navShop) { navShop.style.display = 'flex'; navShop.classList.remove('hidden'); }
      if (bottomShop) { bottomShop.style.display = 'flex'; bottomShop.classList.remove('hidden'); }
      if (shopAdminActions) shopAdminActions.style.display = 'flex';
    } else {
      if (navUsers) navUsers.style.display = 'none';
      if (navShop) navShop.style.display = 'none';
      if (bottomShop) bottomShop.style.display = 'none';
      if (shopAdminActions) shopAdminActions.style.display = 'none';
    }
  } catch (err) {
    if (err.handled) return;
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
    case 'shop': loadShop(); break;
    case 'profile': loadProfile(); break;
  }
}

function getSectionTitle(name) {
  const titles = {
    overview: '📊 Vue d\'ensemble',
    campaigns: '📢 Campagnes',
    users: '👥 Utilisateurs',
    shop: '🛒 Commandes',
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
      renderStatCard({ value: formatNumber(stats.paid_orders), label: 'Commandes payées', icon: '✅', type: 'info' }) +
      renderStatCard({ value: formatNumber(stats.total_products || 0), label: 'Produits', icon: '📦', type: 'primary' }) +
      renderStatCard({ value: formatNumber(stats.low_stock || 0), label: 'Stock faible', icon: '⚠️', type: 'danger' });
  } catch (err) {
    if (err.handled) return;
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
    setText('bot-active', latest.active);
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
    if (err.handled) return;
    console.error('Bot stats error:', err);
    const errEl = document.getElementById('bot-stats-error');
    if (errEl) errEl.textContent = 'Stats bot indisponibles : ' + err.message;
  }
}

async function loadCampaigns() {
  const tbody = document.getElementById('campaigns-table-body');
  tbody.innerHTML = '<tr><td colspan="7" class="loading"><span class="spinner"></span> Chargement...</td></tr>';
  let timeoutId = null;
  try {
    clearTimeout(timeoutId);
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
    if (err.handled) return;
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
        if (err.handled) return;
        showAlert(err.message, 'error', form);
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    });
  }
});

async function viewCampaign(id) {
  try {
    const data = await api('/api/campaigns/detail?id=' + id);
    const c = data.campaign;
    const body = document.getElementById('campaign-detail-body');
    body.innerHTML = 
      '<div class="campaign-detail-grid">' +
      '<div class="campaign-detail-item"><span class="campaign-detail-label">Nom</span><span class="campaign-detail-value">' + (c.name || '—') + '</span></div>' +
      '<div class="campaign-detail-item"><span class="campaign-detail-label">Statut</span><span class="campaign-detail-value">' + renderBadge(c.status === 'active' ? 'Active' : c.status, c.status === 'active' ? 'success' : 'warning') + '</span></div>' +
      '<div class="campaign-detail-item"><span class="campaign-detail-label">Région</span><span class="campaign-detail-value">' + (c.region || '—') + '</span></div>' +
      '<div class="campaign-detail-item"><span class="campaign-detail-label">Commune</span><span class="campaign-detail-value">' + (c.commune || '—') + '</span></div>' +
      '<div class="campaign-detail-item"><span class="campaign-detail-label">Date élection</span><span class="campaign-detail-value">' + (c.election_date ? formatDate(c.election_date) : '—') + '</span></div>' +
      '<div class="campaign-detail-item"><span class="campaign-detail-label">Créée le</span><span class="campaign-detail-value">' + formatDate(c.created_at) + '</span></div>' +
      '<div class="campaign-detail-item full-width"><span class="campaign-detail-label">Description</span><span class="campaign-detail-value" style="font-weight:400;line-height:1.5;">' + (c.description || 'Aucune description') + '</span></div>' +
      '</div>';
    document.getElementById('modal-campaign-detail-overlay').classList.add('active');
  } catch (err) {
    if (!err.handled) showToast('Erreur chargement détails campagne', 'error');
  }
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
    if (err.handled) return;
    tbody.innerHTML = '<tr><td colspan="7" class="alert alert-error">' + err.message + '</td></tr>';
  }
}

async function loadProfile() {
  let user = getUser();
  try {
    const fresh = await getMe();
    const freshUser = fresh.user || fresh;
    if (freshUser && freshUser.id) { setUser(freshUser); user = freshUser; }
  } catch (e) {
    if (e.handled) return;
    console.warn('getMe failed in loadProfile, using cached user:', e.message);
  }
  if (!user || !user.id) {
    console.warn('loadProfile: no user data available');
    return;
  }

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

/* ============================================================
   MODULE SHOP
   ============================================================ */

let currentShopTab = 'catalogue';
let shopProducts = [];
let shopSuppliers = [];

function setupShopListeners() {
  // Tabs internes shop
  document.querySelectorAll('.shop-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.shop-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentShopTab = btn.dataset.shopTab;
      document.querySelectorAll('.shop-tab-content').forEach(c => {
        c.classList.remove('active');
        c.style.display = 'none';
      });
      const activeShopTab = document.getElementById('shop-tab-' + currentShopTab);
      if (activeShopTab) {
        activeShopTab.classList.add('active');
        activeShopTab.style.display = 'block';
      }
      refreshShopTab();
    });
  });

  // Filtres produits
  document.getElementById('prod-filter-apply')?.addEventListener('click', loadShopCatalogue);

  // Filtre stock
  document.getElementById('stock-filter-apply')?.addEventListener('click', loadShopStock);

  // Boutons admin
  document.getElementById('btn-add-product')?.addEventListener('click', () => openProductModal());
  document.getElementById('btn-add-supplier')?.addEventListener('click', () => openSupplierModal());

  // Modal product
  document.getElementById('modal-product-close')?.addEventListener('click', () => document.getElementById('modal-product-overlay')?.classList.remove('active'));
  document.getElementById('modal-product-cancel')?.addEventListener('click', () => document.getElementById('modal-product-overlay')?.classList.remove('active'));
  document.getElementById('form-product')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const orig = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:8px;"></span> Enregistrement...';
    try {
      const data = {
        id: document.getElementById('prod-edit-id')?.value || null,
        name: document.getElementById('prod-name')?.value,
        category: document.getElementById('prod-category')?.value,
        price: parseFloat(document.getElementById('prod-price')?.value || 0),
        stock_quantity: parseInt(document.getElementById('prod-stock')?.value || 0),
        supplier_id: document.getElementById('prod-supplier')?.value || null,
        description: document.getElementById('prod-desc')?.value || '',
        image_url: document.getElementById('prod-image')?.value || '',
        status: 'active'
      };
      if (data.id) {
        await shopUpdateProduct(data);
        showToast('Produit mis à jour', 'success');
      } else {
        await shopCreateProduct(data);
        showToast('Produit créé', 'success');
      }
      document.getElementById('modal-product-overlay')?.classList.remove('active');
      loadShopCatalogue();
    } catch (err) {
      if (!err.handled) showToast(err.message, 'error');
    } finally {
      btn.disabled = false; btn.innerHTML = orig;
    }
  });

  // Modal supplier
  document.getElementById('modal-supplier-close')?.addEventListener('click', () => document.getElementById('modal-supplier-overlay')?.classList.remove('active'));
  document.getElementById('modal-supplier-cancel')?.addEventListener('click', () => document.getElementById('modal-supplier-overlay')?.classList.remove('active'));
  document.getElementById('form-supplier')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const orig = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:8px;"></span> Enregistrement...';
    try {
      const data = {
        id: document.getElementById('supp-edit-id')?.value || null,
        name: document.getElementById('supp-name')?.value,
        contact_name: document.getElementById('supp-contact')?.value || '',
        phone: document.getElementById('supp-phone')?.value || '',
        email: document.getElementById('supp-email')?.value || '',
        region: document.getElementById('supp-region')?.value || '',
        commune: document.getElementById('supp-commune')?.value || '',
        address: document.getElementById('supp-address')?.value || '',
        status: 'active'
      };
      if (data.id) {
        await shopUpdateSupplier(data);
        showToast('Fournisseur mis à jour', 'success');
      } else {
        await shopCreateSupplier(data);
        showToast('Fournisseur créé', 'success');
      }
      document.getElementById('modal-supplier-overlay')?.classList.remove('active');
      loadShopSuppliers();
    } catch (err) {
      if (!err.handled) showToast(err.message, 'error');
    } finally {
      btn.disabled = false; btn.innerHTML = orig;
    }
  });

  // Modal order detail
  document.getElementById('modal-order-detail-close')?.addEventListener('click', () => document.getElementById('modal-order-detail-overlay')?.classList.remove('active'));

  // Modal payment (legacy)
  document.getElementById('form-payment')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const oid = document.getElementById('pay-order-id')?.value;
    const method = document.getElementById('pay-method')?.value;
    if (!oid) return;
    try {
      await api('/api/orders/pay', { method: 'POST', body: JSON.stringify({ id: oid, payment_method: method }) });
      showToast('Paiement enregistré', 'success');
      document.getElementById('modal-payment-overlay')?.classList.remove('active');
      loadShopOrders();
    } catch (err) {
      if (!err.handled) showToast(err.message, 'error');
    }
  });

  // Modal stock
  document.getElementById('modal-stock-close')?.addEventListener('click', () => document.getElementById('modal-stock-overlay')?.classList.remove('active'));
  document.getElementById('modal-stock-cancel')?.addEventListener('click', () => document.getElementById('modal-stock-overlay')?.classList.remove('active'));
  document.getElementById('form-stock')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await shopAddStock({
        product_id: document.getElementById('stock-product-id')?.value,
        quantity: parseInt(document.getElementById('stock-qty')?.value || 0),
        movement_type: document.getElementById('stock-type')?.value,
        reason: document.getElementById('stock-reason')?.value || 'Ajustement manuel'
      });
      showToast('Stock mis à jour', 'success');
      document.getElementById('modal-stock-overlay')?.classList.remove('active');
      loadShopStock();
      loadShopCatalogue();
    } catch (err) {
      if (!err.handled) showToast(err.message, 'error');
    }
  });

  // Panier actions
  document.getElementById('btn-clear-cart')?.addEventListener('click', async () => {
    try { await shopClearCart(); showToast('Panier vidé', 'success'); loadShopCart(); }
    catch (err) { if (!err.handled) showToast(err.message, 'error'); }
  });
  document.getElementById('btn-checkout')?.addEventListener('click', async () => {
    try {
      await shopCreateOrder({ region: getUser().region || '', commune: getUser().commune || '' });
      showToast('Commande créée avec succès !', 'success');
      loadShopCart();
      loadShopOrders();
    } catch (err) { if (!err.handled) showToast(err.message, 'error'); }
  });
}

function refreshShopTab() {
  switch (currentShopTab) {
    case 'catalogue': loadShopCatalogue(); break;
    case 'cart': loadShopCart(); break;
    case 'orders': loadShopOrders(); break;
    case 'suppliers': loadShopSuppliers(); break;
    case 'deliveries': loadShopDeliveries(); break;
    case 'payments': loadShopPayments(); break;
    case 'invoices': loadShopInvoices(); break;
    case 'stock': loadShopStock(); break;
  }
}

function loadShop() {
  document.querySelectorAll('.shop-tab-content').forEach(c => {
    c.classList.remove('active');
    c.style.display = 'none';
  });
  const activeTab = document.getElementById('shop-tab-' + currentShopTab);
  if (activeTab) {
    activeTab.classList.add('active');
    activeTab.style.display = 'block';
  }
  refreshShopTab();
}

/* —— CATALOGUE —— */
async function loadShopCatalogue() {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = '<div class="loading" style="grid-column:1/-1;"><span class="spinner"></span> Chargement...</div>';
  const timeoutId = setTimeout(() => {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:#888;">⏳ Le serveur se réveille (Render free tier)... Veuillez patienter 30-60s puis actualiser.</p>';
  }, 8000);
  try {
    const params = {};
    const search = document.getElementById('prod-filter-search')?.value?.trim();
    const cat = document.getElementById('prod-filter-category')?.value;
    if (search) params.search = search;
    if (cat) params.category = cat;
    const controller = new AbortController();
    const apiTimeout = setTimeout(() => controller.abort(), 15000);
    const data = await shopListProducts(params, controller.signal);
    clearTimeout(apiTimeout);
    clearTimeout(timeoutId);
    shopProducts = normalizeList(data, 'products');
    if (shopProducts.length === 0) {
      grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:#888;">Aucun produit trouvé</p>';
      return;
    }

    grid.innerHTML = shopProducts.map(p => {
      const low = (p.stock_quantity || 0) <= 5;
      return '<div class="product-card" style="background:#fff;border:1px solid #e8eaed;border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:10px;">' +
        '<div style="height:140px;background:#f5f5f5;border-radius:10px;display:flex;align-items:center;justify-content:center;overflow:hidden;">' +
        (p.image_url ? '<img src="' + p.image_url + '" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='<span style=&quot;font-size:48px;&quot;>📦</span>'">' : '<span style="font-size:48px;">📦</span>') +
        '</div>' +
        '<div><h4 style="margin:0;font-size:15px;">' + (p.name || '') + '</h4><small style="color:#888;">' + (p.category || '') + '</small></div>' +
        '<div style="font-weight:700;color:#228B22;font-size:16px;">' + formatCurrency(p.price) + '</div>' +
        '<div style="font-size:12px;color:' + (low ? '#e60023' : '#666') + ';">Stock: ' + (p.stock_quantity || 0) + (low ? ' ⚠️' : '') + '</div>' +
        '<div style="display:flex;gap:6px;margin-top:auto;">' +
          '<button class="btn btn-sm btn-primary" onclick="addToCart(' + p.id + ')" style="flex:1;">🛒 Ajouter</button>' +
          (isAdmin() ? '<button class="btn btn-sm btn-secondary" onclick="editProduct(' + p.id + ')">✏️</button>' : '') +
        '</div>' +
      '</div>';
    }).join('');
    updateSupplierSelects();
  } catch (err) {
    clearTimeout(timeoutId);
    clearTimeout(apiTimeout);
    if (!err.handled) grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#e60023;">' + err.message + '</p>';
  }
}

async function addToCart(productId) {
  try {
    await shopAddToCart(productId, 1);
    showToast('Produit ajouté au panier', 'success');
    updateCartBadge();
  } catch (err) {
    if (!err.handled) showToast(err.message, 'error');
  }
}

function isAdmin() {
  return (getUser().role || '').toString().toLowerCase().trim() === 'admin';
}

function openProductModal(product) {
  document.getElementById('prod-edit-id').value = product ? product.id : '';
  document.getElementById('prod-name').value = product ? product.name : '';
  document.getElementById('prod-category').value = product ? product.category : 'general';
  document.getElementById('prod-price').value = product ? product.price : '';
  document.getElementById('prod-stock').value = product ? product.stock_quantity : '';
  document.getElementById('prod-supplier').value = product ? product.supplier_id : '';
  document.getElementById('prod-desc').value = product ? product.description : '';
  document.getElementById('prod-image').value = product ? product.image_url : '';
  document.getElementById('modal-product-title').textContent = product ? 'Modifier produit' : 'Nouveau produit';
  document.getElementById('modal-product-overlay').classList.add('active');
}

function editProduct(id) {
  const p = shopProducts.find(x => x.id === id);
  if (p) openProductModal(p);
}

/* —— PANIER —— */
async function loadShopCart() {
  const container = document.getElementById('cart-container');
  const actions = document.getElementById('cart-actions');
  try {
    const data = await shopGetCart();
    const items = data.items || [];
    if (items.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:#888;padding:40px;">Votre panier est vide</p>';
      if (actions) actions.style.display = 'none';
      updateCartBadge(0);
      return;
    }
    container.innerHTML = '<div style="display:flex;flex-direction:column;gap:12px;">' + items.map(it =>
      '<div style="display:flex;align-items:center;gap:12px;padding:12px;border:1px solid #e8eaed;border-radius:10px;">' +
        '<div style="width:48px;height:48px;background:#f5f5f5;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:24px;">📦</div>' +
        '<div style="flex:1;"><div style="font-weight:600;">' + it.name + '</div><div style="font-size:13px;color:#666;">' + formatCurrency(it.price) + ' x ' + it.quantity + '</div></div>' +
        '<div style="font-weight:700;">' + formatCurrency(it.subtotal) + '</div>' +
        '<button class="btn btn-sm btn-danger" onclick="removeFromCart(' + it.id + ')">🗑️</button>' +
      '</div>'
    ).join('') + '</div>' +
    '<div style="text-align:right;margin-top:16px;font-size:18px;font-weight:700;">Total: ' + formatCurrency(data.total) + '</div>';
    if (actions) actions.style.display = 'block';
    updateCartBadge(items.length);
  } catch (err) {
    if (!err.handled) container.innerHTML = '<p style="text-align:center;color:#e60023;">' + err.message + '</p>';
  }
}

async function removeFromCart(id) {
  try { await shopRemoveFromCart(id); showToast('Retiré du panier', 'success'); loadShopCart(); }
  catch (err) { if (!err.handled) showToast(err.message, 'error'); }
}

function updateCartBadge(count) {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  if (count === undefined) {
    shopGetCart().then(d => { badge.textContent = (d.count || 0); badge.style.display = (d.count || 0) > 0 ? 'inline-block' : 'none'; }).catch(()=>{});
  } else {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-block' : 'none';
  }
}

/* —— COMMANDES —— */
async function loadShopOrders() {
  const tbody = document.getElementById('shop-orders-table-body');
  tbody.innerHTML = '<tr><td colspan="7" class="loading"><span class="spinner"></span> Chargement...</td></tr>';
  try {
    const data = await shopListOrders({ limit: 50 });
    const orders = normalizeList(data, 'orders');
    if (orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#666">Aucune commande trouvée</td></tr>';
      return;
    }
    tbody.innerHTML = orders.map(o =>
      '<tr>' +
        '<td><strong>#' + (o.order_number || '') + '</strong></td>' +
        '<td>' + (o.user?.first_name || '') + ' ' + (o.user?.last_name || '') + '<br><small>' + (o.user?.phone || '') + '</small></td>' +
        '<td>' + formatCurrency(o.total_amount) + '</td>' +
        '<td>' + renderBadge(o.status === 'pending' ? 'En attente' : o.status === 'completed' ? 'Terminée' : o.status, o.status === 'pending' ? 'warning' : o.status === 'completed' ? 'success' : 'info') + '</td>' +
        '<td>' + renderBadge(o.payment_status === 'paid' ? 'Payé' : o.payment_status || 'En attente', o.payment_status === 'paid' ? 'success' : 'warning') + '</td>' +
        '<td>' + formatDate(o.created_at) + '</td>' +
        '<td style="text-align:right">' +
          '<button class="btn btn-sm btn-secondary" onclick="viewShopOrder(' + o.id + ')">👁️</button> ' +
          (isAdmin() ? '<button class="btn btn-sm btn-primary" onclick="showPaymentModal(' + o.id + ', ' + (o.total_amount || 0) + ')">💳</button> ' : '') +
          (isAdmin() ? '<button class="btn btn-sm btn-danger" onclick="deleteShopOrder(' + o.id + ')">🗑️</button>' : '') +
        '</td>' +
      '</tr>'
    ).join('');
  } catch (err) {
    if (!err.handled) tbody.innerHTML = '<tr><td colspan="7" class="alert alert-error">' + err.message + '</td></tr>';
  }
}

async function viewShopOrder(id) {
  try {
    const data = await shopGetOrder(id);
    const o = data.order;
    const items = (o.items || []).map(it => '<li>' + it.product_name + ' x' + it.quantity + ' = ' + formatCurrency(it.total_price) + '</li>').join('');
    const inv = o.invoice ? '<p><strong>Facture:</strong> ' + o.invoice.invoice_number + ' (' + formatCurrency(o.invoice.amount) + ') — ' + o.invoice.status + '</p>' : '<p><em>Aucune facture</em></p>';
    const del = o.delivery ? '<p><strong>Livraison:</strong> ' + o.delivery.status + (o.delivery.tracking_number ? ' (N° ' + o.delivery.tracking_number + ')' : '') + '</p>' : '<p><em>Aucune livraison</em></p>';
    document.getElementById('order-detail-body').innerHTML =
      '<p><strong>N°:</strong> ' + o.order_number + '</p>' +
      '<p><strong>Client:</strong> ' + (o.user?.first_name || '') + ' ' + (o.user?.last_name || '') + '</p>' +
      '<p><strong>Montant:</strong> ' + formatCurrency(o.total_amount) + '</p>' +
      '<p><strong>Statut:</strong> ' + o.status + '</p>' +
      '<p><strong>Paiement:</strong> ' + o.payment_status + '</p>' +
      '<hr style="margin:12px 0;border:none;border-top:1px solid #e8eaed;">' +
      '<p><strong>Articles:</strong></p><ul style="margin:0 0 12px 18px;">' + items + '</ul>' +
      inv + del;
    document.getElementById('modal-order-detail-overlay').classList.add('active');
  } catch (err) {
    if (!err.handled) showToast(err.message, 'error');
  }
}

async function deleteShopOrder(id) {
  if (!confirm('Supprimer cette commande ?')) return;
  try { await shopDeleteOrder(id); showToast('Commande supprimée', 'success'); loadShopOrders(); }
  catch (err) { if (!err.handled) showToast(err.message, 'error'); }
}

function showPaymentModal(orderId, amount) {
  const modal = document.getElementById('modal-payment-overlay');
  const orderInput = document.getElementById('pay-order-id');
  const amountDiv = document.getElementById('pay-amount');
  const waveBtn = document.getElementById('pay-wave-btn');
  if (orderInput) orderInput.value = orderId || '';
  if (amountDiv) amountDiv.textContent = formatCurrency(amount);
  if (waveBtn) {
    waveBtn.href = 'https://pay.wave.com/m/M_ci_QlW5ke-hYGbA/c/ci/?amount=' + Math.round(amount || 0) + '&reference=C509-' + (orderId || '0');
    waveBtn.style.display = 'inline-flex';
  }
  if (modal) modal.classList.add('active');
}

/* —— FOURNISSEURS —— */
async function loadShopSuppliers() {
  const tbody = document.getElementById('suppliers-table-body');
  tbody.innerHTML = '<tr><td colspan="7" class="loading"><span class="spinner"></span> Chargement...</td></tr>';
  try {
    const data = await shopListSuppliers({ limit: 50 });
    shopSuppliers = normalizeList(data, 'suppliers');
    if (shopSuppliers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#666">Aucun fournisseur trouvé</td></tr>';
      return;
    }
    tbody.innerHTML = shopSuppliers.map(s =>
      '<tr>' +
        '<td><strong>' + (s.name || '') + '</strong></td>' +
        '<td>' + (s.contact_name || '—') + '</td>' +
        '<td>' + (s.phone || '—') + '</td>' +
        '<td>' + (s.email || '—') + '</td>' +
        '<td>' + (s.region || '—') + (s.commune ? ', ' + s.commune : '') + '</td>' +
        '<td>' + renderBadge(s.status === 'active' ? 'Actif' : s.status, s.status === 'active' ? 'success' : 'warning') + '</td>' +
        '<td style="text-align:right">' +
          (isAdmin() ? '<button class="btn btn-sm btn-secondary" onclick="editSupplier(' + s.id + ')">✏️</button> ' : '') +
          (isAdmin() ? '<button class="btn btn-sm btn-danger" onclick="deleteSupplier(' + s.id + ')">🗑️</button>' : '') +
        '</td>' +
      '</tr>'
    ).join('');
    updateSupplierSelects();
  } catch (err) {
    if (!err.handled) tbody.innerHTML = '<tr><td colspan="7" class="alert alert-error">' + err.message + '</td></tr>';
  }
}

function openSupplierModal(supplier) {
  document.getElementById('supp-edit-id').value = supplier ? supplier.id : '';
  document.getElementById('supp-name').value = supplier ? supplier.name : '';
  document.getElementById('supp-contact').value = supplier ? supplier.contact_name : '';
  document.getElementById('supp-phone').value = supplier ? supplier.phone : '';
  document.getElementById('supp-email').value = supplier ? supplier.email : '';
  document.getElementById('supp-region').value = supplier ? supplier.region : '';
  document.getElementById('supp-commune').value = supplier ? supplier.commune : '';
  document.getElementById('supp-address').value = supplier ? supplier.address : '';
  document.getElementById('modal-supplier-title').textContent = supplier ? 'Modifier fournisseur' : 'Nouveau fournisseur';
  document.getElementById('modal-supplier-overlay').classList.add('active');
}

function editSupplier(id) {
  const s = shopSuppliers.find(x => x.id === id);
  if (s) openSupplierModal(s);
}

async function deleteSupplier(id) {
  if (!confirm('Supprimer ce fournisseur ?')) return;
  try { await shopDeleteSupplier(id); showToast('Fournisseur supprimé', 'success'); loadShopSuppliers(); }
  catch (err) { if (!err.handled) showToast(err.message, 'error'); }
}

function updateSupplierSelects() {
  const sel = document.getElementById('prod-supplier');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">—</option>' + shopSuppliers.map(s => '<option value="' + s.id + '">' + s.name + '</option>').join('');
  sel.value = current;
}

/* —— LIVRAISONS —— */
async function loadShopDeliveries() {
  const tbody = document.getElementById('deliveries-table-body');
  tbody.innerHTML = '<tr><td colspan="7" class="loading"><span class="spinner"></span> Chargement...</td></tr>';
  try {
    const data = await shopListDeliveries({ limit: 50 });
    const deliveries = normalizeList(data, 'deliveries');
    if (deliveries.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#666">Aucune livraison trouvée</td></tr>';
      return;
    }
    tbody.innerHTML = deliveries.map(d =>
      '<tr>' +
        '<td><strong>#' + (d.order_number || '') + '</strong></td>' +
        '<td>' + renderBadge(d.status === 'delivered' ? 'Livrée' : d.status === 'pending' ? 'En attente' : d.status, d.status === 'delivered' ? 'success' : d.status === 'pending' ? 'warning' : 'info') + '</td>' +
        '<td>' + (d.tracking_number || '—') + '</td>' +
        '<td>' + (d.address || '—') + '</td>' +
        '<td>' + (d.region || '—') + (d.commune ? ', ' + d.commune : '') + '</td>' +
        '<td>' + (d.estimated_date || '—') + '</td>' +
        '<td style="text-align:right">' +
          (isAdmin() ? '<button class="btn btn-sm btn-secondary" onclick="editDelivery(' + d.id + ')">✏️</button>' : '') +
        '</td>' +
      '</tr>'
    ).join('');
  } catch (err) {
    if (!err.handled) tbody.innerHTML = '<tr><td colspan="7" class="alert alert-error">' + err.message + '</td></tr>';
  }
}

async function editDelivery(id) {
  const status = prompt('Nouveau statut (pending/shipped/delivered/cancelled):', 'shipped');
  if (!status) return;
  try { await shopUpdateDelivery({ id, status }); showToast('Livraison mise à jour', 'success'); loadShopDeliveries(); }
  catch (err) { if (!err.handled) showToast(err.message, 'error'); }
}

/* —— PAIEMENTS —— */
async function loadShopPayments() {
  const tbody = document.getElementById('payments-table-body');
  tbody.innerHTML = '<tr><td colspan="6" class="loading"><span class="spinner"></span> Chargement...</td></tr>';
  try {
    const data = await shopListOrders({ limit: 50 });
    const orders = normalizeList(data, 'orders');
    if (orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#666">Aucun paiement trouvé</td></tr>';
      return;
    }
    tbody.innerHTML = orders.map(o =>
      '<tr>' +
        '<td><strong>#' + (o.order_number || '') + '</strong></td>' +
        '<td>' + formatCurrency(o.total_amount) + '</td>' +
        '<td>' + (o.payment_method || '—') + '</td>' +
        '<td>' + renderBadge(o.payment_status === 'paid' ? 'Payé' : o.payment_status || 'En attente', o.payment_status === 'paid' ? 'success' : 'warning') + '</td>' +
        '<td>' + formatDate(o.created_at) + '</td>' +
        '<td style="text-align:right">' +
          (isAdmin() && o.payment_status !== 'paid' ? '<button class="btn btn-sm btn-primary" onclick="showPaymentModal(' + o.id + ', ' + (o.total_amount || 0) + ')">💳 Payer</button>' : '') +
        '</td>' +
      '</tr>'
    ).join('');
  } catch (err) {
    if (!err.handled) tbody.innerHTML = '<tr><td colspan="6" class="alert alert-error">' + err.message + '</td></tr>';
  }
}

/* —— FACTURES —— */
async function loadShopInvoices() {
  const tbody = document.getElementById('invoices-table-body');
  tbody.innerHTML = '<tr><td colspan="7" class="loading"><span class="spinner"></span> Chargement...</td></tr>';
  try {
    const data = await shopListInvoices({ limit: 50 });
    const invoices = normalizeList(data, 'invoices');
    if (invoices.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#666">Aucune facture trouvée</td></tr>';
      return;
    }
    tbody.innerHTML = invoices.map(inv =>
      '<tr>' +
        '<td><strong>' + (inv.invoice_number || '') + '</strong></td>' +
        '<td>#' + (inv.order_number || '') + '</td>' +
        '<td>' + formatCurrency(inv.amount) + '</td>' +
        '<td>' + renderBadge(inv.status === 'paid' ? 'Payée' : inv.status === 'pending' ? 'En attente' : inv.status, inv.status === 'paid' ? 'success' : inv.status === 'pending' ? 'warning' : 'danger') + '</td>' +
        '<td>' + formatDate(inv.issued_at) + '</td>' +
        '<td>' + (inv.due_date || '—') + '</td>' +
        '<td style="text-align:right">' +
          (isAdmin() && inv.status !== 'paid' ? '<button class="btn btn-sm btn-primary" onclick="payInvoice(' + inv.id + ')">✅ Marquer payée</button>' : '') +
        '</td>' +
      '</tr>'
    ).join('');
  } catch (err) {
    if (!err.handled) tbody.innerHTML = '<tr><td colspan="7" class="alert alert-error">' + err.message + '</td></tr>';
  }
}

async function payInvoice(id) {
  try { await shopUpdateInvoice({ id, status: 'paid' }); showToast('Facture payée', 'success'); loadShopInvoices(); }
  catch (err) { if (!err.handled) showToast(err.message, 'error'); }
}

/* —— STOCKS —— */
async function loadShopStock() {
  const tbody = document.getElementById('stock-table-body');
  tbody.innerHTML = '<tr><td colspan="5" class="loading"><span class="spinner"></span> Chargement...</td></tr>';
  try {
    const productId = document.getElementById('stock-filter-product')?.value;
    const data = await shopListStock({ product_id: productId || undefined, limit: 50 });
    const movements = normalizeList(data, 'movements');
    if (movements.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:#666">Aucun mouvement trouvé</td></tr>';
      return;
    }
    tbody.innerHTML = movements.map(m =>
      '<tr>' +
        '<td>' + (m.product_name || '—') + '</td>' +
        '<td>' + renderBadge(m.movement_type === 'in' ? 'Entrée' : 'Sortie', m.movement_type === 'in' ? 'success' : 'danger') + '</td>' +
        '<td>' + m.quantity + '</td>' +
        '<td>' + (m.reason || '—') + '</td>' +
        '<td>' + formatDate(m.created_at) + '</td>' +
      '</tr>'
    ).join('');
    updateStockProductSelect();
  } catch (err) {
    if (!err.handled) tbody.innerHTML = '<tr><td colspan="5" class="alert alert-error">' + err.message + '</td></tr>';
  }
}

function updateStockProductSelect() {
  const sel = document.getElementById('stock-filter-product');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">Tous les produits</option>' + shopProducts.map(p => '<option value="' + p.id + '">' + p.name + '</option>').join('');
  sel.value = current;
}

function openStockModal(productId, productName) {
  document.getElementById('stock-product-id').value = productId;
  document.getElementById('stock-product-name').textContent = productName;
  document.getElementById('stock-qty').value = '';
  document.getElementById('stock-reason').value = '';
  document.getElementById('modal-stock-overlay').classList.add('active');
}
