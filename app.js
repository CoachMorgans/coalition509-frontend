/* ============================================================
 Coalition 509 — Frontend SaaS
 VoteConnect Ecosystem | ChallengeFinancier™
 Auteur : Coach Morgan's (Simplice KOUAME)
 Version : 1.3.0 (Routes API réelles connectées)
 ============================================================ */

const API_URL = 'https://coalition509-api.onrender.com';

// ═══════════════════════════════════════════════════════════════
// UTILITAIRES
// ═══════════════════════════════════════════════════════════════

function showToast(message, type = 'info') {
  const existing = document.querySelector('.c509-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `c509-toast c509-toast--${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 14px 24px;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    z-index: 9999;
    animation: slideIn 0.3s ease;
    max-width: 320px;
    word-wrap: break-word;
  `;
  toast.style.background = type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#2980b9';

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function getCurrentUser() {
  const raw = localStorage.getItem('c509_user');
  return raw ? JSON.parse(raw) : null;
}

function setCurrentUser(user) {
  localStorage.setItem('c509_user', JSON.stringify(user));
}

function isLoggedIn() {
  return !!getCurrentUser();
}

function logout() {
  localStorage.removeItem('c509_user');
  localStorage.removeItem('c509_auth_source');
  localStorage.removeItem('c509_jwt');
  window.location.href = 'index.html';
}

function formatPhone(phone) {
  if (!phone) return '';
  const p = phone.replace(/\s/g, '');
  if (p.startsWith('00')) return '+' + p.slice(2);
  if (p.startsWith('225') && p.length === 11) return '+225 ' + p.slice(3, 5) + ' ' + p.slice(5, 8) + ' ' + p.slice(8);
  return p;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatNumber(n) {
  if (n === null || n === undefined) return '0';
  return Number(n).toLocaleString('fr-FR');
}

function getAuthHeaders() {
  const jwt = localStorage.getItem('c509_jwt');
  return jwt ? { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: { ...getAuthHeaders(), ...(opts.headers || {}) }
  });
  if (res.status === 401) {
    showToast('Session expirée. Reconnectez-vous.', 'error');
    setTimeout(logout, 1500);
    throw new Error('Unauthorized');
  }
  return res;
}

function findInput(container, types, names, placeholderKeywords, ids) {
  if (!container) return null;
  if (ids) {
    for (const id of ids) {
      const el = container.querySelector(`#${id}`);
      if (el) return el;
    }
  }
  for (const t of types) {
    const el = container.querySelector(`input[type="${t}"]`);
    if (el) return el;
  }
  for (const n of names) {
    const el = container.querySelector(`input[name="${n}"]`);
    if (el) return el;
  }
  if (placeholderKeywords) {
    const inputs = container.querySelectorAll('input');
    for (const inp of inputs) {
      const ph = (inp.placeholder || '').toLowerCase();
      for (const kw of placeholderKeywords) {
        if (ph.includes(kw)) return inp;
      }
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// 1. AUTO-AUTH DEPUIS LE BOT CHALLENGER
// ═══════════════════════════════════════════════════════════════

(async function autoAuthFromBot() {
  const params = new URLSearchParams(window.location.search);
  const botToken = params.get('bot_auth');

  if (!botToken) return;

  try {
    const res = await fetch(`${API_URL}/api/auth/verify-bot-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: botToken })
    });
    const data = await res.json();

    if (data.ok && data.user) {
      localStorage.setItem('c509_user', JSON.stringify(data.user));
      localStorage.setItem('c509_auth_source', 'bot');
      const path = window.location.pathname;
      if (path.includes('index') || path === '/' || path.endsWith('/coalition509-frontend/')) {
        window.location.replace('dashboard.html');
      }
    } else if (data.ok && data.needs_registration) {
      localStorage.setItem('c509_pending_phone', data.phone);
      localStorage.setItem('c509_auth_source', 'bot_pending');
      showToast('Complétez votre inscription sur le SaaS.', 'info');
      const path = window.location.pathname;
      if (!path.includes('index')) {
        window.location.replace('index.html');
      }
    } else {
      console.error('[BOT AUTH] Échec :', data.error || 'Inconnu');
      showToast('Lien expiré ou invalide. Connectez-vous manuellement.', 'error');
    }
  } catch (e) {
    console.error('[BOT AUTH] Erreur réseau :', e);
    showToast('Erreur de connexion au serveur.', 'error');
  }
})();

// ═══════════════════════════════════════════════════════════════
// 2. PAGE INDEX — DÉTECTION ROBUSTE DES ONGLETS & FORMULAIRES
// ═══════════════════════════════════════════════════════════════

function initIndexPage() {
  if (isLoggedIn()) {
    window.location.replace('dashboard.html');
    return;
  }

  let tabBtns = Array.from(document.querySelectorAll('.tab-btn, [data-tab]'));
  let tabContents = Array.from(document.querySelectorAll('.tab-content, #login, #register, #connexion, #inscription, #login-form, #register-form, #connexion-form, #inscription-form, .login-form, .register-form'));

  if (!tabBtns.length) {
    const allBtns = document.querySelectorAll('button, a, div[role="tab"], .nav-link');
    allBtns.forEach(btn => {
      const txt = btn.textContent.toLowerCase().trim();
      if (txt.includes('connexion') || txt.includes('inscription') || txt.includes('login') || txt.includes('register')) {
        tabBtns.push(btn);
      }
    });
  }

  function switchTab(targetName) {
    const isLogin = targetName === 'login' || targetName === 'connexion';
    const isRegister = targetName === 'register' || targetName === 'inscription';

    tabBtns.forEach(b => {
      const txt = b.textContent.toLowerCase();
      const tab = (b.dataset.tab || '').toLowerCase();
      const active = (isLogin && (txt.includes('connexion') || txt.includes('login') || tab.includes('login') || tab.includes('connexion')))
        || (isRegister && (txt.includes('inscription') || txt.includes('inscrire') || txt.includes('register') || tab.includes('register') || tab.includes('inscription')));
      b.classList.toggle('active', active);
    });

    tabContents.forEach(c => {
      const id = (c.id || '').toLowerCase();
      const show = (isLogin && (id.includes('login') || id.includes('connexion')))
        || (isRegister && (id.includes('register') || id.includes('inscription')));
      c.classList.toggle('active', show);
      c.style.display = show ? '' : 'none';
    });
  }

  if (tabBtns.length) {
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const target = btn.dataset.tab || btn.getAttribute('href')?.replace('#', '');
        const txt = btn.textContent.toLowerCase();
        let targetName = target;
        if (!targetName) {
          if (txt.includes('connexion') || txt.includes('login')) targetName = 'login';
          else if (txt.includes('inscription') || txt.includes('inscrire') || txt.includes('register')) targetName = 'register';
        }
        if (targetName) switchTab(targetName);
      });
    });
  }

  const allForms = Array.from(document.querySelectorAll('form'));
  allForms.forEach((form, idx) => {
    const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
    const btnText = (submitBtn?.textContent || submitBtn?.value || '').toLowerCase();
    const hasFirstName = !!form.querySelector('input[name="first_name"], input[name="prenom"], input[id*="prenom"], input[id*="first"]');
    const hasPhone = !!form.querySelector('input[type="tel"], input[name="phone"], input[name="telephone"]');
    const hasPin = !!form.querySelector('input[type="password"], input[name="pin"], input[name="code"]');

    let formType = 'unknown';
    if (btnText.includes('connecter') || btnText.includes('login') || btnText.includes('connexion')) {
      formType = 'login';
    } else if (btnText.includes('inscrire') || btnText.includes('register') || btnText.includes('inscription')) {
      formType = 'register';
    } else if (hasFirstName) {
      formType = 'register';
    } else if (hasPhone && hasPin && !hasFirstName) {
      formType = 'login';
    }

    if (formType === 'login') attachLoginHandler(form);
    else if (formType === 'register') attachRegisterHandler(form);
  });

  if (allForms.length === 0) {
    const loginContainer = document.getElementById('login') || document.getElementById('connexion') || document.getElementById('login-form') || document.getElementById('connexion-form');
    const registerContainer = document.getElementById('register') || document.getElementById('inscription') || document.getElementById('register-form') || document.getElementById('inscription-form');
    if (loginContainer) attachLoginHandler(loginContainer);
    if (registerContainer) attachRegisterHandler(registerContainer);
  }

  const pendingPhone = localStorage.getItem('c509_pending_phone');
  const authSource = localStorage.getItem('c509_auth_source');
  if (pendingPhone && authSource === 'bot_pending') {
    switchTab('register');
    setTimeout(() => {
      const phoneInputs = document.querySelectorAll('input[type="tel"], input[name="phone"], input[name="telephone"], #reg-phone, #phone, #telephone');
      phoneInputs.forEach(inp => { if (!inp.value) { inp.value = pendingPhone; inp.focus(); } });
      localStorage.removeItem('c509_pending_phone');
      localStorage.removeItem('c509_auth_source');
      showToast('Votre numéro est pré-rempli. Complétez votre inscription.', 'info');
    }, 400);
  }
}

// ═══════════════════════════════════════════════════════════════
// HANDLER CONNEXION
// ═══════════════════════════════════════════════════════════════

function attachLoginHandler(container) {
  const form = container.tagName === 'FORM' ? container : container.querySelector('form') || container;
  if (form._c509_loginAttached) return;
  form._c509_loginAttached = true;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"], input[type="submit"]');
    const originalText = btn ? (btn.textContent || btn.value) : 'Se connecter';
    if (btn) { btn.disabled = true; btn.textContent = 'Connexion...'; }

    const phoneInput = findInput(form, ['tel', 'text'], ['phone', 'telephone'], ['téléphone', 'telephone', 'phone']);
    const pinInput = findInput(form, ['password', 'text'], ['pin', 'code'], ['pin', 'code']);

    const phone = (phoneInput ? phoneInput.value : '').trim().replace(/\s/g, '');
    const pin = (pinInput ? pinInput.value : '').trim();

    if (!phone || !pin) {
      showToast('Veuillez saisir votre téléphone et PIN.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = originalText; }
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin })
      });
      const data = await res.json();

      if (res.ok && data.access_token) {
        localStorage.setItem('c509_jwt', data.access_token);
        localStorage.setItem('c509_user', JSON.stringify(data.user));
        localStorage.setItem('c509_auth_source', 'manual');
        showToast('Connexion réussie !', 'success');
        setTimeout(() => window.location.href = 'dashboard.html', 800);
      } else {
        showToast(data.detail || 'Identifiants incorrects', 'error');
      }
    } catch (err) {
      showToast('Erreur réseau. Réessayez.', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = originalText; }
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// HANDLER INSCRIPTION
// ═══════════════════════════════════════════════════════════════

function attachRegisterHandler(container) {
  const form = container.tagName === 'FORM' ? container : container.querySelector('form') || container;
  if (form._c509_registerAttached) return;
  form._c509_registerAttached = true;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"], input[type="submit"]');
    const originalText = btn ? (btn.textContent || btn.value) : "S'inscrire";
    if (btn) { btn.disabled = true; btn.textContent = 'Inscription...'; }

    const firstNameInput = findInput(form, ['text'], ['first_name', 'prenom'], ['prénom', 'prenom']);
    const lastNameInput = findInput(form, ['text'], ['last_name', 'nom'], ['nom']);
    const phoneInput = findInput(form, ['tel', 'text'], ['phone', 'telephone'], ['téléphone', 'telephone']);
    const pinInput = findInput(form, ['password', 'text'], ['pin'], ['pin', 'code']);
    const pinConfirmInput = findInput(form, ['password', 'text'], ['pin_confirm', 'pin-confirm'], ['confirmer', 'confirm']);

    const first_name = (firstNameInput ? firstNameInput.value : '').trim();
    const last_name = (lastNameInput ? lastNameInput.value : '').trim();
    const phone = (phoneInput ? phoneInput.value : '').trim().replace(/\s/g, '');
    const pin = (pinInput ? pinInput.value : '').trim();
    const pinConfirm = pinConfirmInput ? pinConfirmInput.value.trim() : pin;

    const profileInput = form.querySelector('select[name="profile_type"], select[name="profil"]');
    const regionInput = findInput(form, ['text'], ['region'], ['région', 'region']);
    const communeInput = findInput(form, ['text'], ['commune'], ['commune']);

    const profile_type = profileInput ? profileInput.value : 'Animateur NGD';
    const region = regionInput ? regionInput.value.trim() : '';
    const commune = communeInput ? communeInput.value.trim() : '';

    if (!first_name || !last_name || !phone || !pin) {
      showToast('Veuillez remplir tous les champs obligatoires.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = originalText; }
      return;
    }
    if (pin !== pinConfirm) {
      showToast('Les PINs ne correspondent pas.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = originalText; }
      return;
    }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      showToast('Le PIN doit être exactement 4 chiffres.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = originalText; }
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name, last_name, phone, pin, profile_type, region, commune })
      });
      const data = await res.json();

      if (res.status === 201 || data.id) {
        showToast(`Inscription réussie ! Votre ID NGD : ${data.ngd_id || '—'}`, 'success');
        const loginIds = ['login', 'connexion', 'login-form', 'connexion-form'];
        for (const id of loginIds) {
          const loginContainer = document.getElementById(id);
          if (loginContainer) {
            const loginPhone = findInput(loginContainer, ['tel', 'text'], ['phone', 'telephone'], ['téléphone']);
            if (loginPhone) loginPhone.value = phone;
            break;
          }
        }
      } else {
        showToast(data.detail || "Erreur lors de l'inscription", 'error');
      }
    } catch (err) {
      showToast('Erreur réseau. Réessayez.', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = originalText; }
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// PAGE DASHBOARD — NAVIGATION & DATA
// ═══════════════════════════════════════════════════════════════

function initDashboardPage() {
  if (!isLoggedIn()) {
    window.location.replace('index.html');
    return;
  }

  setupNavigation();
  setupCampaignModal();
  setupMobileMenu();
  updateSidebarProfile();
  refreshUserFromAPI();

  // Charger la section active par défaut
  loadSection('overview');
}

function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item[data-section]');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const section = item.dataset.section;
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      loadSection(section);
    });
  });

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
}

function setupMobileMenu() {
  const toggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (toggle && sidebar) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }
}

function loadSection(sectionName) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`section-${sectionName}`);
  if (target) target.classList.add('active');

  switch (sectionName) {
    case 'overview': loadOverviewStats(); break;
    case 'campaigns': loadCampaigns(); break;
    case 'users': loadUsers(); break;
    case 'orders': loadOrders(); break;
  }
}

// ── Profil sidebar ──
async function refreshUserFromAPI() {
  try {
    const res = await apiFetch('/api/v1/auth/me');
    if (!res.ok) return;
    const user = await res.json();
    if (user && user.id) {
      setCurrentUser(user);
      updateSidebarProfile();
    }
  } catch (e) {
    console.error('[DASHBOARD] refreshUserFromAPI:', e);
  }
}

function updateSidebarProfile() {
  const user = getCurrentUser();
  if (!user) return;

  const nameEl = document.querySelector('.user-mini .name');
  const roleEl = document.querySelector('.user-mini .role');
  const avatarEl = document.querySelector('.user-avatar');

  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Membre NGD';
  if (nameEl) nameEl.textContent = fullName;
  if (roleEl) roleEl.textContent = user.profile_type || user.role || 'Animateur NGD';
  if (avatarEl) avatarEl.textContent = (user.first_name?.[0] || 'U').toUpperCase();

  // Mettre à jour aussi les champs profil si présents
  const setText = (selector, text) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = text || '—';
  };
  setText('#dash-name', fullName);
  setText('#dash-id', user.ngd_id);
  setText('#dash-profil', user.profile_type || user.role);
  setText('#dash-phone', formatPhone(user.phone));
  setText('#dash-region', user.region);
  setText('#dash-commune', user.commune);

  const authSource = localStorage.getItem('c509_auth_source');
  const elBadge = document.querySelector('#dash-badge, .dash-badge');
  if (elBadge && authSource === 'bot') {
    elBadge.textContent = '🔗 Connecté via Bot Challenger';
    elBadge.style.display = 'inline-block';
  } else if (elBadge) {
    elBadge.style.display = 'none';
  }
}

// ── Overview ──
async function loadOverviewStats() {
  const container = document.getElementById('overview-stats');
  if (!container) return;
  container.innerHTML = '<div class="loading"><span class="spinner"></span> Chargement des statistiques...</div>';

  try {
    const res = await apiFetch('/api/v1/dashboard/stats');
    if (!res.ok) throw new Error('Erreur stats');
    const data = await res.json();

    const stats = [
      { label: 'Utilisateurs actifs', value: data.total_users || 0, icon: '👥', color: '#3498db' },
      { label: 'Campagnes actives', value: data.total_campaigns || 0, icon: '📢', color: '#e74c3c' },
      { label: 'Commandes TCL', value: data.total_orders || 0, icon: '🛒', color: '#f39c12' },
      { label: 'Revenus payés', value: (data.total_revenue || 0) + ' Gdes', icon: '💰', color: '#27ae60' },
      { label: 'Groupes actifs', value: data.total_groups || 0, icon: '👥', color: '#9b59b6' },
      { label: 'Retraits en attente', value: data.pending_withdrawals || 0, icon: '⏳', color: '#e67e22' },
    ];

    container.innerHTML = stats.map(s => `
      <div class="stat-card" style="border-left: 4px solid ${s.color};">
        <div class="stat-icon" style="font-size:28px;margin-bottom:8px;">${s.icon}</div>
        <div class="stat-value" style="font-size:28px;font-weight:700;color:${s.color};">${formatNumber(s.value)}</div>
        <div class="stat-label" style="font-size:13px;color:#666;margin-top:4px;">${s.label}</div>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = '<div class="loading" style="color:#e74c3c;">⚠️ Impossible de charger les statistiques.</div>';
  }
}

// ── Campagnes ──
async function loadCampaigns() {
  const tbody = document.getElementById('campaigns-table-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" class="loading"><span class="spinner"></span> Chargement...</td></tr>';

  try {
    const res = await apiFetch('/api/v1/campaigns');
    if (!res.ok) throw new Error('Erreur campagnes');
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:#888;">Aucune campagne trouvée.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(c => `
      <tr>
        <td><strong>${escapeHtml(c.name)}</strong><br><small style="color:#888;">${c.slug || ''}</small></td>
        <td><span class="badge badge-info">${c.election_type || '—'}</span></td>
        <td>${escapeHtml(c.region || '—')}${c.commune ? `<br><small>${escapeHtml(c.commune)}</small>` : ''}</td>
        <td>${formatDate(c.election_date)}</td>
        <td><span class="badge ${c.status === 'active' ? 'badge-success' : 'badge-secondary'}">${c.status || '—'}</span></td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="viewCampaign('${c.id}')" title="Voir">👁</button>
          ${canManageCampaigns() ? `<button class="btn btn-sm btn-primary" onclick="editCampaign('${c.id}')" title="Modifier">✎</button>` : ''}
        </td>
      </tr>
    `).join('');
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading" style="color:#e74c3c;">⚠️ Erreur de chargement.</td></tr>';
  }
}

function canManageCampaigns() {
  const user = getCurrentUser();
  return user && ['superadmin', 'admin', 'manager'].includes(user.role);
}

function viewCampaign(id) {
  showToast(`Détail campagne ${id} — à implémenter`, 'info');
}
function editCampaign(id) {
  showToast(`Édition campagne ${id} — à implémenter`, 'info');
}

// ── Modal Créer Campagne ──
function setupCampaignModal() {
  const modal = document.getElementById('modal-campaign');
  const btnOpen = document.getElementById('btn-create-campaign');
  const btnClose = document.getElementById('modal-campaign-close');
  const form = document.getElementById('form-campaign');

  if (btnOpen && modal) {
    btnOpen.addEventListener('click', () => {
      if (!canManageCampaigns()) {
        showToast('Permission insuffisante.', 'error');
        return;
      }
      modal.classList.add('active');
    });
  }
  if (btnClose && modal) {
    btnClose.addEventListener('click', () => modal.classList.remove('active'));
  }
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn ? btn.textContent : 'Créer';
      if (btn) { btn.disabled = true; btn.textContent = 'Création...'; }

      const payload = {
        name: document.getElementById('camp-name')?.value.trim(),
        election_type: document.getElementById('camp-type')?.value,
        region: document.getElementById('camp-region')?.value.trim(),
        commune: document.getElementById('camp-commune')?.value.trim() || null,
        election_date: document.getElementById('camp-date')?.value || null,
        description: document.getElementById('camp-desc')?.value.trim() || null
      };

      if (!payload.name || !payload.election_type || !payload.region) {
        showToast('Veuillez remplir les champs obligatoires.', 'error');
        if (btn) { btn.disabled = false; btn.textContent = originalText; }
        return;
      }

      try {
        const res = await apiFetch('/api/v1/campaigns', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.status === 201) {
          showToast('Campagne créée avec succès !', 'success');
          modal.classList.remove('active');
          form.reset();
          loadCampaigns();
        } else {
          showToast(data.detail || 'Erreur création campagne', 'error');
        }
      } catch (err) {
        showToast('Erreur réseau.', 'error');
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = originalText; }
      }
    });
  }
}

// ── Utilisateurs ──
async function loadUsers() {
  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" class="loading"><span class="spinner"></span> Chargement...</td></tr>';

  try {
    const res = await apiFetch('/api/v1/users?limit=100');
    if (!res.ok) throw new Error('Erreur users');
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:#888;">Aucun utilisateur trouvé.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(u => `
      <tr>
        <td><strong>${escapeHtml(u.first_name || '')} ${escapeHtml(u.last_name || '')}</strong><br><small style="color:#888;">${u.ngd_id || ''}</small></td>
        <td>${formatPhone(u.phone)}</td>
        <td>${u.email ? escapeHtml(u.email) : '—'}</td>
        <td><span class="badge badge-info">${u.profile_type || '—'}</span></td>
        <td>${escapeHtml(u.region || '—')}</td>
        <td><span class="badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}">${u.status || '—'}</span></td>
        <td>${formatDate(u.created_at)}</td>
      </tr>
    `).join('');
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading" style="color:#e74c3c;">⚠️ Erreur de chargement.</td></tr>';
  }
}

// ── Commandes TCL ──
async function loadOrders() {
  const tbody = document.getElementById('orders-table-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" class="loading"><span class="spinner"></span> Chargement...</td></tr>';

  try {
    const res = await apiFetch('/api/v1/orders?limit=100');
    if (!res.ok) throw new Error('Erreur orders');
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:#888;">Aucune commande trouvée.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(o => {
      const client = o.user || {};
      return `
      <tr>
        <td><strong>#${o.order_number || o.id}</strong></td>
        <td>${escapeHtml(client.first_name || '')} ${escapeHtml(client.last_name || '')}<br><small>${formatPhone(client.phone)}</small></td>
        <td>${formatNumber(o.total_amount)} Gdes</td>
        <td>${escapeHtml(o.region || '—')}${o.commune ? `<br><small>${escapeHtml(o.commune)}</small>` : ''}</td>
        <td><span class="badge ${o.status === 'delivered' ? 'badge-success' : o.status === 'pending' ? 'badge-warning' : 'badge-secondary'}">${o.status || '—'}</span></td>
        <td><span class="badge ${o.payment_status === 'paid' ? 'badge-success' : 'badge-danger'}">${o.payment_status || '—'}</span></td>
        <td>${formatDate(o.created_at)}</td>
      </tr>
    `}).join('');
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading" style="color:#e74c3c;">⚠️ Erreur de chargement.</td></tr>';
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ═══════════════════════════════════════════════════════════════
// INITIALISATION
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  if (path.includes('dashboard')) {
    initDashboardPage();
  } else {
    initIndexPage();
  }
});
