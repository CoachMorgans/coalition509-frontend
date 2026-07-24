/* ============================================================
   Coalition 509 — Frontend SaaS
   VoteConnect Ecosystem | ChallengeFinancier™
   Auteur : Coach Morgan's (Simplice KOUAME)
   Version : 1.1.0  (Compatible Backend v2.1+ / v2.2)
   ============================================================ */

const API_URL = 'https://coalition509-api.onrender.com';

// ═══════════════════════════════════════════════════════════════
//  1. AUTO-AUTH DEPUIS LE BOT CHALLENGER
//  Si l'URL contient ?bot_auth=TOKEN, connexion automatique
// ═══════════════════════════════════════════════════════════════

(async function autoAuthFromBot() {
  const params = new URLSearchParams(window.location.search);
  const botToken = params.get('bot_auth');

  if (!botToken) return; // Pas de token = connexion manuelle normale

  try {
    const res = await fetch(`${API_URL}/api/auth/verify-bot-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: botToken })
    });
    const data = await res.json();

    if (data.ok && data.user) {
      // ✅ Utilisateur trouvé → connexion auto
      localStorage.setItem('c509_user', JSON.stringify(data.user));
      localStorage.setItem('c509_auth_source', 'bot');

      const path = window.location.pathname;
      if (path.includes('index') || path === '/' || path.endsWith('/coalition509-frontend/')) {
        window.location.replace('dashboard.html');
      }
    } else if (data.ok && data.needs_registration) {
      // ⚠️ Utilisateur inconnu dans le SaaS → redirige inscription avec téléphone pré-rempli
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
//  2. UTILITAIRES
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

// Helper pour trouver un input dans un formulaire
function findInput(form, types, names, placeholderKeywords) {
  // Par type
  for (const t of types) {
    const el = form.querySelector(`input[type="${t}"]`);
    if (el) return el;
  }
  // Par name
  for (const n of names) {
    const el = form.querySelector(`input[name="${n}"]`);
    if (el) return el;
  }
  // Par placeholder
  if (placeholderKeywords) {
    const inputs = form.querySelectorAll('input');
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
//  3. PAGE INDEX (Connexion / Inscription)
// ═══════════════════════════════════════════════════════════════

function initIndexPage() {
  // Si déjà connecté, redirige vers dashboard
  if (isLoggedIn()) {
    window.location.replace('dashboard.html');
    return;
  }

  // ── Vient du bot avec téléphone pré-rempli ? ──
  const pendingPhone = localStorage.getItem('c509_pending_phone');
  const authSource = localStorage.getItem('c509_auth_source');

  // ── Gestion des onglets Connexion / Inscription ──
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  if (tabBtns.length && tabContents.length) {
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const targetEl = document.getElementById(target);
        if (targetEl) targetEl.classList.add('active');
      });
    });
  }

  // Si vient du bot et pas encore inscrit → switch sur inscription + pré-remplit téléphone
  if (pendingPhone && authSource === 'bot_pending') {
    // Trouve et clique le bouton inscription
    const regBtn = Array.from(tabBtns).find(b => b.dataset.tab === 'register' || b.textContent.toLowerCase().includes('inscription'));
    if (regBtn) regBtn.click();

    // Pré-remplit le champ téléphone dans le formulaire d'inscription
    setTimeout(() => {
      const regForm = registerForm || document.querySelector('form');
      if (regForm) {
        const phoneInput = findInput(regForm, ['tel', 'text'], ['phone', 'telephone'], ['téléphone', 'telephone']);
        if (phoneInput) {
          phoneInput.value = pendingPhone;
          phoneInput.focus();
        }
      }
      // Nettoie le flag pour éviter de re-switcher au refresh
      localStorage.removeItem('c509_pending_phone');
      localStorage.removeItem('c509_auth_source');
    }, 200);
  }

  // ── Formulaire Connexion ──
  const loginForms = document.querySelectorAll('form');
  let loginForm = null;
  for (const form of loginForms) {
    const hasPhone = form.querySelector('input[type="tel"], input[name="phone"], input[name="telephone"]');
    const hasPin = form.querySelector('input[type="password"], input[name="pin"]');
    if (hasPhone && hasPin && !form.querySelector('input[name="first_name"], input[name="prenom"]')) {
      loginForm = form;
      break;
    }
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = loginForm.querySelector('button[type="submit"]');
      const originalText = btn ? btn.textContent : 'Se connecter';
      if (btn) { btn.disabled = true; btn.textContent = 'Connexion...'; }

      const phoneInput = findInput(loginForm, ['tel', 'text'], ['phone', 'telephone'], ['téléphone', 'telephone', 'phone']);
      const pinInput = findInput(loginForm, ['password', 'text'], ['pin', 'code'], ['pin', 'code']);

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

  // ── Formulaire Inscription ──
  let registerForm = null;
  for (const form of loginForms) {
    const hasFirstName = form.querySelector('input[name="first_name"], input[name="prenom"]');
    if (hasFirstName) {
      registerForm = form;
      break;
    }
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = registerForm.querySelector('button[type="submit"]');
      const originalText = btn ? btn.textContent : 'S\'inscrire';
      if (btn) { btn.disabled = true; btn.textContent = 'Inscription...'; }

      const firstNameInput = findInput(registerForm, ['text'], ['first_name', 'prenom'], ['prénom', 'prenom']);
      const lastNameInput = findInput(registerForm, ['text'], ['last_name', 'nom'], ['nom']);
      const phoneInput = findInput(registerForm, ['tel', 'text'], ['phone', 'telephone'], ['téléphone', 'telephone']);
      const pinInput = findInput(registerForm, ['password', 'text'], ['pin'], ['pin', 'code']);
      const pinConfirmInput = findInput(registerForm, ['password', 'text'], ['pin_confirm', 'pin-confirm'], ['confirmer', 'confirm']);

      const first_name = (firstNameInput ? firstNameInput.value : '').trim();
      const last_name = (lastNameInput ? lastNameInput.value : '').trim();
      const phone = (phoneInput ? phoneInput.value : '').trim().replace(/\s/g, '');
      const pin = (pinInput ? pinInput.value : '').trim();
      const pinConfirm = pinConfirmInput ? pinConfirmInput.value.trim() : pin;

      // Récupère le profil et la région si présents
      const profileInput = registerForm.querySelector('select[name="profile_type"], select[name="profil"]');
      const regionInput = findInput(registerForm, ['text'], ['region'], ['région', 'region']);
      const communeInput = findInput(registerForm, ['text'], ['commune'], ['commune']);

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
          if (tabBtns.length) tabBtns[0].click();
          // Pré-remplit le téléphone
          if (phoneInput && loginForm) {
            const loginPhone = findInput(loginForm, ['tel', 'text'], ['phone', 'telephone'], ['téléphone']);
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
  }
}

// ═══════════════════════════════════════════════════════════════
//  4. PAGE DASHBOARD
// ═══════════════════════════════════════════════════════════════

function initDashboardPage() {
  if (!isLoggedIn()) {
    window.location.replace('index.html');
    return;
  }

  const user = getCurrentUser();

  // Affiche les infos utilisateur (cherche par ID ou classe)
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

  // Badge auth source
  const authSource = localStorage.getItem('c509_auth_source');
  const elBadge = document.querySelector('#dash-badge, .dash-badge');
  if (elBadge && authSource === 'bot') {
    elBadge.textContent = '🔗 Connecté via Bot Challenger';
    elBadge.style.display = 'inline-block';
  } else if (elBadge) {
    elBadge.style.display = 'none';
  }

  // Bouton déconnexion
  const btnLogout = document.querySelector('#btn-logout, .btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', logout);
  }

  // Chargement données dashboard (optionnel, nécessite JWT)
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
      // Mise à jour éventuelle des données affichées
      console.log('[DASHBOARD] Stats chargées', data);
    }
  } catch (e) {
    console.error('[DASHBOARD]', e);
  }
}

// ═══════════════════════════════════════════════════════════════
//  5. INITIALISATION AU CHARGEMENT
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;

  if (path.includes('dashboard')) {
    initDashboardPage();
  } else {
    initIndexPage();
  }
});
