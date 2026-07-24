/* ============================================================
   Coalition 509 — Frontend SaaS
   VoteConnect Ecosystem | ChallengeFinancier™
   Auteur : Coach Morgan's (Simplice KOUAME)
   Version : 1.0.0
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
      localStorage.setItem('c509_user', JSON.stringify(data.user));
      localStorage.setItem('c509_auth', 'bot');

      // Redirige vers le dashboard si on est sur index.html
      const path = window.location.pathname;
      if (path.includes('index') || path === '/' || path.endsWith('/coalition509-frontend/')) {
        window.location.replace('dashboard.html');
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
  localStorage.removeItem('c509_auth');
  window.location.href = 'index.html';
}

function formatPhone(phone) {
  if (!phone) return '';
  const p = phone.replace(/\s/g, '');
  if (p.startsWith('00')) return '+' + p.slice(2);
  if (p.startsWith('225') && p.length === 11) return '+225 ' + p.slice(3, 5) + ' ' + p.slice(5, 8) + ' ' + p.slice(8);
  return p;
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

  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(target).classList.add('active');
    });
  });

  // Formulaire Connexion
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = loginForm.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Connexion...';

      const telephone = document.getElementById('login-phone').value.trim().replace(/\s/g, '');
      const pin = document.getElementById('login-pin').value.trim();

      try {
        const res = await fetch(`${API_URL}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telephone, pin })
        });
        const data = await res.json();

        if (data.ok && data.user) {
          localStorage.setItem('c509_user', JSON.stringify(data.user));
          localStorage.setItem('c509_auth', 'manual');
          showToast('Connexion réussie !', 'success');
          setTimeout(() => window.location.href = 'dashboard.html', 800);
        } else {
          showToast(data.error || 'Identifiants incorrects', 'error');
        }
      } catch (err) {
        showToast('Erreur réseau. Réessayez.', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });
  }

  // Formulaire Inscription
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = registerForm.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Inscription...';

      const prenom = document.getElementById('reg-prenom').value.trim();
      const nom = document.getElementById('reg-nom').value.trim();
      const telephone = document.getElementById('reg-phone').value.trim().replace(/\s/g, '');
      const pin = document.getElementById('reg-pin').value.trim();
      const pinConfirm = document.getElementById('reg-pin-confirm').value.trim();
      const profil = document.getElementById('reg-profil').value;
      const region = document.getElementById('reg-region').value.trim();
      const commune = document.getElementById('reg-commune').value.trim();

      if (pin !== pinConfirm) {
        showToast('Les PINs ne correspondent pas.', 'error');
        btn.disabled = false;
        btn.textContent = originalText;
        return;
      }
      if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        showToast('Le PIN doit être exactement 4 chiffres.', 'error');
        btn.disabled = false;
        btn.textContent = originalText;
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prenom, nom, telephone, pin, profil, region, commune })
        });
        const data = await res.json();

        if (data.ok) {
          showToast(`Inscription réussie ! Votre ID NGD : ${data.id_ngd}`, 'success');
          // Passe à l'onglet connexion
          tabBtns[0].click();
          document.getElementById('login-phone').value = telephone;
        } else {
          showToast(data.error || 'Erreur lors de l\'inscription', 'error');
        }
      } catch (err) {
        showToast('Erreur réseau. Réessayez.', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
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

  // Affiche les infos utilisateur
  const elName = document.getElementById('dash-name');
  const elId = document.getElementById('dash-id');
  const elProfil = document.getElementById('dash-profil');
  const elPhone = document.getElementById('dash-phone');
  const elRegion = document.getElementById('dash-region');
  const elCommune = document.getElementById('dash-commune');

  if (elName) elName.textContent = `${user.prenom || ''} ${user.nom || ''}`.trim() || 'Membre NGD';
  if (elId) elId.textContent = user.id_ngd || '—';
  if (elProfil) elProfil.textContent = user.profil || 'Animateur NGD';
  if (elPhone) elPhone.textContent = formatPhone(user.telephone) || '—';
  if (elRegion) elRegion.textContent = user.region || '—';
  if (elCommune) elCommune.textContent = user.commune || '—';

  // Badge auth source
  const authSource = localStorage.getItem('c509_auth');
  const elBadge = document.getElementById('dash-badge');
  if (elBadge && authSource === 'bot') {
    elBadge.textContent = '🔗 Connecté via Bot Challenger';
    elBadge.style.display = 'inline-block';
  } else if (elBadge) {
    elBadge.style.display = 'none';
  }

  // Bouton déconnexion
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', logout);
  }

  // Chargement données dashboard (optionnel)
  loadDashboardData(user.telephone);
}

async function loadDashboardData(telephone) {
  try {
    const res = await fetch(`${API_URL}/api/dashboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telephone })
    });
    const data = await res.json();
    if (data.ok) {
      // Mise à jour éventuelle des données
      localStorage.setItem('c509_user', JSON.stringify(data.user));
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
