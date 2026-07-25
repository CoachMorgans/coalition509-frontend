/* ============================================================
   Coalition 509 — Frontend SaaS
   VoteConnect Ecosystem | ChallengeFinancier™
   Auteur : Coach Morgan's (Simplice KOUAME)
   Version : 1.2.0  (Fix sélecteurs + détection robuste)
   ============================================================ */

const API_URL = 'https://coalition509-api.onrender.com';

// ═══════════════════════════════════════════════════════════════
//  UTILITAIRES
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

// Trouve un input dans un container (recherche exhaustive)
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
//  1. AUTO-AUTH DEPUIS LE BOT CHALLENGER
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
//  2. PAGE INDEX — DÉTECTION ROBUSTE DES ONGLETS & FORMULAIRES
// ═══════════════════════════════════════════════════════════════

function initIndexPage() {
  if (isLoggedIn()) {
    window.location.replace('dashboard.html');
    return;
  }

  // ── DÉTECTION ROBUSTE DES ONGLETS ──
  let tabBtns = [];
  let tabContents = [];

  // Essai 1 : classes attendues
  tabBtns = Array.from(document.querySelectorAll('.tab-btn'));
  tabContents = Array.from(document.querySelectorAll('.tab-content'));

  // Essai 2 : si vide, cherche par rôle / data-tab
  if (!tabBtns.length) {
    tabBtns = Array.from(document.querySelectorAll('[data-tab]'));
  }
  if (!tabContents.length) {
    tabContents = Array.from(document.querySelectorAll('[id="login"], [id="register"], [id="connexion"], [id="inscription"], .login-form, .register-form, .form-login, .form-register'));
  }

  // Essai 3 : cherche par texte des boutons
  if (!tabBtns.length) {
    const allBtns = document.querySelectorAll('button, a, div[role="tab"], .nav-link');
    allBtns.forEach(btn => {
      const txt = btn.textContent.toLowerCase().trim();
      if (txt.includes('connexion') || txt.includes('inscription') || txt.includes('login') || txt.includes('register')) {
        tabBtns.push(btn);
      }
    });
  }

  console.log('[C509] Onglets détectés :', tabBtns.length, tabBtns);
  console.log('[C509] Contenus détectés :', tabContents.length, tabContents);

  // Attache les listeners d'onglets
  if (tabBtns.length) {
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const target = btn.dataset.tab || btn.getAttribute('href')?.replace('#', '');

        // Active visuellement le bouton
        tabBtns.forEach(b => {
          b.classList.remove('active');
          if (b.style) b.style.fontWeight = 'normal';
        });
        btn.classList.add('active');
        if (btn.style) btn.style.fontWeight = 'bold';

        // Affiche le contenu cible
        tabContents.forEach(c => c.classList.remove('active'));
        if (target) {
          const targetEl = document.getElementById(target);
          if (targetEl) targetEl.classList.add('active');
        }
        // Fallback : montre/cache par ID connus
        const loginEl = document.getElementById('login') || document.getElementById('connexion');
        const registerEl = document.getElementById('register') || document.getElementById('inscription');
        const txt = btn.textContent.toLowerCase();
        if (txt.includes('connexion') || txt.includes('login')) {
          if (loginEl) loginEl.classList.add('active');
          if (registerEl) registerEl.classList.remove('active');
        } else if (txt.includes('inscription') || txt.includes('register')) {
          if (registerEl) registerEl.classList.add('active');
          if (loginEl) loginEl.classList.remove('active');
        }
      });
    });
  }

  // ── DÉTECTION ROBUSTE DES FORMULAIRES ──
  const allForms = Array.from(document.querySelectorAll('form'));
  console.log('[C509] Formulaires trouvés :', allForms.length);

  // Stratégie : on attache les listeners sur TOUS les formulaires,
  // et on détecte à la volée s'il s'agit de connexion ou inscription
  // grâce au texte du bouton submit ou aux champs présents.

  allForms.forEach((form, idx) => {
    const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
    const btnText = (submitBtn?.textContent || submitBtn?.value || '').toLowerCase();
    const hasFirstName = !!form.querySelector('input[name="first_name"], input[name="prenom"], input[id*="prenom"], input[id*="first"]');
    const hasPhone = !!form.querySelector('input[type="tel"], input[name="phone"], input[name="telephone"]');
    const hasPin = !!form.querySelector('input[type="password"], input[name="pin"], input[name="code"]');

    console.log(`[C509] Form #${idx}: btn="${btnText}" firstName=${hasFirstName} phone=${hasPhone} pin=${hasPin}`);

    // Détermine le type de formulaire
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

    if (formType === 'login') {
      attachLoginHandler(form, tabBtns);
    } else if (formType === 'register') {
      attachRegisterHandler(form, tabBtns);
    }
  });

  // ── SI AUCUN FORMULAIRE DÉTECTÉ : fallback sur IDs explicites ──
  if (allForms.length === 0) {
    console.warn('[C509] Aucun <form> trouvé. Fallback sur IDs...');
    const loginContainer = document.getElementById('login') || document.getElementById('connexion');
    const registerContainer = document.getElementById('register') || document.getElementById('inscription');
    if (loginContainer) attachLoginHandler(loginContainer, tabBtns);
    if (registerContainer) attachRegisterHandler(registerContainer, tabBtns);
  }

  // ── PRÉ-REMPLISSAGE BOT ──
  const pendingPhone = localStorage.getItem('c509_pending_phone');
  const authSource = localStorage.getItem('c509_auth_source');

  if (pendingPhone && authSource === 'bot_pending') {
    // Switch sur inscription
    const regBtn = tabBtns.find(b => {
      const txt = b.textContent.toLowerCase();
      return txt.includes('inscription') || txt.includes('inscrire') || txt.includes('register');
    });
    if (regBtn) regBtn.click();

    // Pré-remplit le téléphone (dans tout le document)
    setTimeout(() => {
      const phoneInputs = document.querySelectorAll('input[type="tel"], input[name="phone"], input[name="telephone"], #reg-phone, #phone, #telephone');
      phoneInputs.forEach(inp => {
        if (!inp.value || inp.value === '') {
          inp.value = pendingPhone;
          inp.focus();
        }
      });
      localStorage.removeItem('c509_pending_phone');
      localStorage.removeItem('c509_auth_source');
      showToast('Votre numéro est pré-rempli. Complétez votre inscription.', 'info');
    }, 400);
  }
}

// ═══════════════════════════════════════════════════════════════
//  HANDLER CONNEXION
// ═══════════════════════════════════════════════════════════════

function attachLoginHandler(container, tabBtns) {
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

  console.log('[C509] Handler connexion attaché sur', container);
}

// ═══════════════════════════════════════════════════════════════
//  HANDLER INSCRIPTION
// ═══════════════════════════════════════════════════════════════

function attachRegisterHandler(container, tabBtns) {
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
        // Passe à l'onglet connexion
        const loginBtn = tabBtns.find(b => {
          const txt = b.textContent.toLowerCase();
          return txt.includes('connexion') || txt.includes('connecter') || txt.includes('login');
        });
        if (loginBtn) loginBtn.click();
        // Pré-remplit le téléphone dans le form de connexion
        const loginContainer = document.getElementById('login') || document.getElementById('connexion');
        if (loginContainer) {
          const loginPhone = findInput(loginContainer, ['tel', 'text'], ['phone', 'telephone'], ['téléphone']);
          if (loginPhone) loginPhone.value = phone;
        }
      } else {
        showToast(data.detail || 'Erreur lors de l\'inscription', 'error');
      }
    } catch (err) {
      showToast('Erreur réseau. Réessayez.', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = originalText; }
    }
  });

  console.log('[C509] Handler inscription attaché sur', container);
}

// ═══════════════════════════════════════════════════════════════
//  PAGE DASHBOARD
// ═══════════════════════════════════════════════════════════════

function initDashboardPage() {
  if (!isLoggedIn()) {
    window.location.replace('index.html');
    return;
  }

  const user = getCurrentUser();

  const setText = (selector, text) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = text || '—';
  };

  setText('#dash-name', `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Membre NGD');
  setText('#dash-id', user.ngd_id || '—');
  setText('#dash-profil', user.profile_type || 'Animateur NGD');
  setText('#dash-phone', formatPhone(user.phone) || '—');
  setText('#dash-region', user.region || '—');
  setText('#dash-commune', user.commune || '—');

  const authSource = localStorage.getItem('c509_auth_source');
  const elBadge = document.querySelector('#dash-badge, .dash-badge');
  if (elBadge && authSource === 'bot') {
    elBadge.textContent = '🔗 Connecté via Bot Challenger';
    elBadge.style.display = 'inline-block';
  } else if (elBadge) {
    elBadge.style.display = 'none';
  }

  const btnLogout = document.querySelector('#btn-logout, .btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', logout);
  }

  const jwt = localStorage.getItem('c509_jwt');
  if (jwt && user.phone) {
    loadDashboardData(jwt);
  }
}

async function loadDashboardData(jwt) {
  try {
    const res = await fetch(`${API_URL}/api/v1/dashboard/stats`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${jwt}` }
    });
    const data = await res.json();
    if (data && !data.detail) {
      console.log('[DASHBOARD] Stats chargées', data);
    }
  } catch (e) {
    console.error('[DASHBOARD]', e);
  }
}

// ═══════════════════════════════════════════════════════════════
//  INITIALISATION
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  if (path.includes('dashboard')) {
    initDashboardPage();
  } else {
    initIndexPage();
  }
});
