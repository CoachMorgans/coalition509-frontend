/* ============================================================
 Coalition 509 — Frontend SaaS
 VoteConnect Ecosystem | ChallengeFinancier
 Version: 1.5.5 (Fix Bot Chart + Campaign detail route)
 ============================================================ */

const API_URL = 'https://coalition509-api.onrender.com';
const FCFA_RATE = 4.5;

/* ---------- UTILITAIRES ---------- */
function showToast(message, type) {
  type = type || 'info';
  var existing = document.querySelector('.c509-toast');
  if (existing) existing.remove();
  var toast = document.createElement('div');
  toast.className = 'c509-toast c509-toast--' + type;
  toast.textContent = message;
  toast.style.cssText = 'position:fixed;top:20px;right:20px;padding:14px 24px;border-radius:8px;color:white;font-weight:600;z-index:9999;animation:slideIn 0.3s ease;max-width:320px;word-wrap:break-word;';
  toast.style.background = type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#2980b9';
  document.body.appendChild(toast);
  setTimeout(function() {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(function() { toast.remove(); }, 300);
  }, 4000);
}
function getCurrentUser() { var raw = localStorage.getItem('c509_user'); return raw ? JSON.parse(raw) : null; }
function setCurrentUser(user) { localStorage.setItem('c509_user', JSON.stringify(user)); }
function isLoggedIn() { return !!getCurrentUser(); }
function logout() { localStorage.removeItem('c509_user'); localStorage.removeItem('c509_auth_source'); localStorage.removeItem('c509_jwt'); localStorage.removeItem('c509_login_mode'); window.location.href = 'index.html'; }
function formatPhone(phone) { if (!phone) return ''; var p = phone.replace(/\s/g, ''); if (p.startsWith('00')) return '+' + p.slice(2); if (p.startsWith('225') && p.length === 11) return '+225 ' + p.slice(3,5) + ' ' + p.slice(5,8) + ' ' + p.slice(8); return p; }
function formatDate(dateStr) { if (!dateStr) return '—'; var d = new Date(dateStr); if (isNaN(d)) return dateStr; return d.toLocaleDateString('fr-FR', {day:'2-digit', month:'short', year:'numeric'}); }
function formatCurrency(n) { if (n === null || n === undefined || isNaN(Number(n))) return '0 Gdes'; return Number(n).toLocaleString('fr-FR') + ' Gdes'; }
function formatFCFA(n, rate) { rate = rate || FCFA_RATE; if (n === null || n === undefined || isNaN(Number(n))) return '0 FCFA'; return Math.round(Number(n) * rate).toLocaleString('fr-FR') + ' FCFA'; }
function formatNumber(n) { if (n === null || n === undefined || isNaN(Number(n))) return '0'; return Number(n).toLocaleString('fr-FR'); }
function isAdmin() { var user = getCurrentUser(); return user && (user.role === 'admin' || user.role === 'superadmin'); }
function isManager() { var user = getCurrentUser(); return user && (user.role === 'admin' || user.role === 'superadmin' || user.role === 'manager'); }
function getAuthHeaders() { var jwt = localStorage.getItem('c509_jwt'); return jwt ? { 'Authorization': 'Bearer ' + jwt, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }; }
function apiFetch(path, opts) {
  opts = opts || {};
  var url = API_URL + path;
  console.log('[API] ' + (opts.method || 'GET') + ' ' + url);
  var fetchOpts = { method: opts.method || 'GET', headers: Object.assign(getAuthHeaders(), opts.headers || {}) };
  if (opts.body) fetchOpts.body = opts.body;
  return fetch(url, fetchOpts).then(function(res) {
    console.log('[API] Response ' + res.status + ' for ' + path);
    if (res.status === 401) { showToast('Session expiree. Reconnectez-vous.', 'error'); setTimeout(logout, 1500); throw new Error('Unauthorized'); }
    return res;
  });
}
function findInput(container, types, names, placeholderKeywords, ids) {
  if (!container) return null;
  var i, el;
  if (ids) { for (i=0;i<ids.length;i++) { el=container.querySelector('#'+ids[i]); if(el)return el; } }
  for (i=0;i<types.length;i++) { el=container.querySelector('input[type="'+types[i]+'"]'); if(el)return el; }
  for (i=0;i<names.length;i++) { el=container.querySelector('input[name="'+names[i]+'"]'); if(el)return el; }
  if (placeholderKeywords) { var inputs=container.querySelectorAll('input'); for(i=0;i<inputs.length;i++){ var ph=(inputs[i].placeholder||'').toLowerCase(); for(var j=0;j<placeholderKeywords.length;j++){ if(ph.indexOf(placeholderKeywords[j])!==-1)return inputs[i];} } }
  return null;
}

/* ---------- CHART REGISTRY ---------- */
const chartRegistry = {};
function safeChartCreate(canvasId, config) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  if (chartRegistry[canvasId]) { chartRegistry[canvasId].destroy(); delete chartRegistry[canvasId]; }
  var existing = Chart.getChart ? Chart.getChart(canvas) : null;
  if (existing) existing.destroy();
  var ctx = canvas.getContext('2d');
  var chart = new Chart(ctx, config);
  chartRegistry[canvasId] = chart;
  return chart;
}

/* ---------- AUTO-AUTH BOT ---------- */
(function autoAuthFromBot() {
  var params = new URLSearchParams(window.location.search);
  var botToken = params.get('bot_auth');
  if (!botToken) return;
  fetch(API_URL + '/api/auth/verify-bot-token', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: botToken })
  }).then(function(res){ return res.json(); }).then(function(data){
    if (data.ok && data.user) {
      localStorage.setItem('c509_user', JSON.stringify(data.user));
      localStorage.setItem('c509_auth_source', 'bot');
      if (data.access_token) localStorage.setItem('c509_jwt', data.access_token);
      var path = window.location.pathname;
      if (path.includes('index') || path === '/' || path.endsWith('/coalition509-frontend/')) window.location.replace('dashboard.html');
    } else if (data.ok && data.needs_registration) {
      localStorage.setItem('c509_pending_phone', data.phone);
      localStorage.setItem('c509_auth_source', 'bot_pending');
      showToast('Completez votre inscription sur le SaaS.', 'info');
      if (!window.location.pathname.includes('index')) window.location.replace('index.html');
    } else { console.error('[BOT AUTH] Echec :', data.error||'Inconnu'); showToast('Lien expire ou invalide. Connectez-vous manuellement.', 'error'); }
  }).catch(function(e){ console.error('[BOT AUTH] Erreur reseau :', e); showToast('Erreur de connexion au serveur.', 'error'); });
})();

/* ---------- PAGE INDEX ---------- */
function initIndexPage() {
  if (isLoggedIn()) { window.location.replace('dashboard.html'); return; }
  var tabBtns = Array.from(document.querySelectorAll('.tab-btn, [data-tab]'));
  var tabContents = Array.from(document.querySelectorAll('.tab-content, #login, #register, #connexion, #inscription, #login-form, #register-form, #connexion-form, #inscription-form, .login-form, .register-form'));
  if (!tabBtns.length) {
    var allBtns = document.querySelectorAll('button, a, div[role="tab"], .nav-link');
    allBtns.forEach(function(btn){ var txt=btn.textContent.toLowerCase().trim(); if(txt.indexOf('connexion')!==-1||txt.indexOf('inscription')!==-1||txt.indexOf('login')!==-1||txt.indexOf('register')!==-1) tabBtns.push(btn); });
  }
  function switchTab(targetName) {
    var isLogin = targetName === 'login' || targetName === 'connexion';
    var isRegister = targetName === 'register' || targetName === 'inscription';
    tabBtns.forEach(function(b){
      var txt=b.textContent.toLowerCase(), tab=(b.dataset.tab||'').toLowerCase();
      var active = (isLogin&&(txt.indexOf('connexion')!==-1||txt.indexOf('login')!==-1||tab.indexOf('login')!==-1||tab.indexOf('connexion')!==-1)) || (isRegister&&(txt.indexOf('inscription')!==-1||txt.indexOf('inscrire')!==-1||txt.indexOf('register')!==-1||tab.indexOf('register')!==-1||tab.indexOf('inscription')!==-1));
      b.classList.toggle('active', active);
    });
    tabContents.forEach(function(c){
      var id=(c.id||'').toLowerCase();
      var show = (isLogin&&(id.indexOf('login')!==-1||id.indexOf('connexion')!==-1)) || (isRegister&&(id.indexOf('register')!==-1||id.indexOf('inscription')!==-1));
      c.classList.toggle('active', show); c.style.display = show ? '' : 'none';
    });
  }
  if (tabBtns.length) {
    tabBtns.forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.preventDefault();
        var target = btn.dataset.tab || (btn.getAttribute('href')||'').replace('#','');
        var txt = btn.textContent.toLowerCase(), targetName = target;
        if (!targetName) { if(txt.indexOf('connexion')!==-1||txt.indexOf('login')!==-1) targetName='login'; else if(txt.indexOf('inscription')!==-1||txt.indexOf('inscrire')!==-1||txt.indexOf('register')!==-1) targetName='register'; }
        if (targetName) switchTab(targetName);
      });
    });
  }
  var modeUserBtn = document.getElementById('mode-user');
  var modeAdminBtn = document.getElementById('mode-admin');
  var adminHint = document.getElementById('admin-hint');
  function setAdminMode(active) {
    if (active) {
      localStorage.setItem('c509_login_mode', 'admin');
      if (modeAdminBtn) modeAdminBtn.classList.add('active');
      if (modeUserBtn) modeUserBtn.classList.remove('active');
      if (adminHint) adminHint.classList.add('visible');
      ['register','inscription','register-form','inscription-form'].forEach(function(id){ var el=document.getElementById(id); if(el)el.style.display='none'; });
      ['login','connexion','login-form','connexion-form'].forEach(function(id){ var el=document.getElementById(id); if(el)el.style.display=''; });
      tabBtns.forEach(function(b){ var txt=b.textContent.toLowerCase(); if(txt.indexOf('inscription')!==-1||txt.indexOf('register')!==-1)b.style.display='none'; if(txt.indexOf('connexion')!==-1||txt.indexOf('login')!==-1)b.classList.add('active'); });
      switchTab('login');
    } else {
      localStorage.removeItem('c509_login_mode');
      if (modeUserBtn) modeUserBtn.classList.add('active');
      if (modeAdminBtn) modeAdminBtn.classList.remove('active');
      if (adminHint) adminHint.classList.remove('visible');
      tabBtns.forEach(function(b){ b.style.display=''; });
    }
  }
  if (modeUserBtn) modeUserBtn.addEventListener('click', function(){ setAdminMode(false); });
  if (modeAdminBtn) modeAdminBtn.addEventListener('click', function(){ setAdminMode(true); });
  if (localStorage.getItem('c509_login_mode') === 'admin') setAdminMode(true);

  var allForms = Array.from(document.querySelectorAll('form'));
  allForms.forEach(function(form){
    var submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
    var btnText = (submitBtn ? (submitBtn.textContent || submitBtn.value) : '').toLowerCase();
    var hasFirstName = !!form.querySelector('input[name="first_name"], input[name="prenom"], input[id*="prenom"], input[id*="first"]');
    var hasPhone = !!form.querySelector('input[type="tel"], input[name="phone"], input[name="telephone"]');
    var hasPin = !!form.querySelector('input[type="password"], input[name="pin"], input[name="code"]');
    var formType = 'unknown';
    if (btnText.indexOf('connecter')!==-1||btnText.indexOf('login')!==-1||btnText.indexOf('connexion')!==-1) formType='login';
    else if (btnText.indexOf('inscrire')!==-1||btnText.indexOf('register')!==-1||btnText.indexOf('inscription')!==-1) formType='register';
    else if (hasFirstName) formType='register';
    else if (hasPhone && hasPin && !hasFirstName) formType='login';
    if (formType === 'login') attachLoginHandler(form);
    else if (formType === 'register') attachRegisterHandler(form);
  });
  if (allForms.length === 0) {
    var loginContainer = document.getElementById('login')||document.getElementById('connexion')||document.getElementById('login-form')||document.getElementById('connexion-form');
    var registerContainer = document.getElementById('register')||document.getElementById('inscription')||document.getElementById('register-form')||document.getElementById('inscription-form');
    if (loginContainer) attachLoginHandler(loginContainer);
    if (registerContainer) attachRegisterHandler(registerContainer);
  }
  var pendingPhone = localStorage.getItem('c509_pending_phone');
  var authSource = localStorage.getItem('c509_auth_source');
  if (pendingPhone && authSource === 'bot_pending') {
    switchTab('register');
    setTimeout(function(){
      var phoneInputs = document.querySelectorAll('input[type="tel"], input[name="phone"], input[name="telephone"], #reg-phone, #phone, #telephone');
      phoneInputs.forEach(function(inp){ if(!inp.value){ inp.value=pendingPhone; inp.focus(); } });
      localStorage.removeItem('c509_pending_phone'); localStorage.removeItem('c509_auth_source');
      showToast('Votre numero est pre-rempli. Completez votre inscription.', 'info');
    }, 400);
  }
}

function attachLoginHandler(container) {
  var form = container.tagName === 'FORM' ? container : (container.querySelector('form') || container);
  if (form._c509_loginAttached) return;
  form._c509_loginAttached = true;
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var btn = form.querySelector('button[type="submit"], input[type="submit"]');
    var originalText = btn ? (btn.textContent || btn.value) : 'Se connecter';
    if (btn) { btn.disabled = true; btn.textContent = 'Connexion...'; }
    var phoneInput = findInput(form, ['tel','text'], ['phone','telephone'], ['telephone','telephone','phone']);
    var pinInput = findInput(form, ['password','text'], ['pin','code'], ['pin','code']);
    var phone = (phoneInput ? phoneInput.value : '').trim().replace(/\s/g,'');
    var pin = (pinInput ? pinInput.value : '').trim();
    if (!phone || !pin) { showToast('Veuillez saisir votre telephone et PIN.', 'error'); if(btn){btn.disabled=false;btn.textContent=originalText;} return; }
    fetch(API_URL + '/api/v1/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({phone:phone,pin:pin}) })
      .then(function(res){ return res.json(); }).then(function(data){
        if (data.access_token) {
          localStorage.setItem('c509_jwt', data.access_token);
          localStorage.setItem('c509_user', JSON.stringify(data.user));
          localStorage.setItem('c509_auth_source', 'manual');
          var isAdminMode = localStorage.getItem('c509_login_mode') === 'admin';
          var userIsAdmin = data.user && (data.user.role === 'admin' || data.user.role === 'superadmin');
          if (isAdminMode && !userIsAdmin) { showToast('Acces administrateur refuse. Redirection utilisateur.', 'error'); localStorage.removeItem('c509_login_mode'); setTimeout(function(){window.location.href='dashboard.html';},1500); }
          else if (isAdminMode && userIsAdmin) { showToast('Connexion Administrateur reussie !', 'success'); localStorage.removeItem('c509_login_mode'); setTimeout(function(){window.location.href='dashboard.html';},800); }
          else { showToast('Connexion reussie !', 'success'); setTimeout(function(){window.location.href='dashboard.html';},800); }
        } else { showToast(data.detail || 'Identifiants incorrects', 'error'); }
      }).catch(function(){ showToast('Erreur reseau. Reessayez.', 'error'); })
      .finally(function(){ if(btn){btn.disabled=false;btn.textContent=originalText;} });
  });
}

function attachRegisterHandler(container) {
  var form = container.tagName === 'FORM' ? container : (container.querySelector('form') || container);
  if (form._c509_registerAttached) return;
  form._c509_registerAttached = true;
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var btn = form.querySelector('button[type="submit"], input[type="submit"]');
    var originalText = btn ? (btn.textContent || btn.value) : "S'inscrire";
    if (btn) { btn.disabled = true; btn.textContent = 'Inscription...'; }
    var firstNameInput = findInput(form, ['text'], ['first_name','prenom'], ['prenom','prenom']);
    var lastNameInput = findInput(form, ['text'], ['last_name','nom'], ['nom']);
    var phoneInput = findInput(form, ['tel','text'], ['phone','telephone'], ['telephone','telephone']);
    var pinInput = findInput(form, ['password','text'], ['pin'], ['pin','code']);
    var pinConfirmInput = findInput(form, ['password','text'], ['pin_confirm','pin-confirm'], ['confirmer','confirm']);
    var first_name = (firstNameInput ? firstNameInput.value : '').trim();
    var last_name = (lastNameInput ? lastNameInput.value : '').trim();
    var phone = (phoneInput ? phoneInput.value : '').trim().replace(/\s/g,'');
    var pin = (pinInput ? pinInput.value : '').trim();
    var pinConfirm = pinConfirmInput ? pinConfirmInput.value.trim() : pin;
    var profileInput = form.querySelector('select[name="profile_type"], select[name="profil"]');
    var regionInput = findInput(form, ['text'], ['region'], ['region','region']);
    var communeInput = findInput(form, ['text'], ['commune'], ['commune']);
    var profile_type = profileInput ? profileInput.value : 'Animateur NGD';
    var region = regionInput ? regionInput.value.trim() : '';
    var commune = communeInput ? communeInput.value.trim() : '';
    if (!first_name || !last_name || !phone || !pin) { showToast('Veuillez remplir tous les champs obligatoires.', 'error'); if(btn){btn.disabled=false;btn.textContent=originalText;} return; }
    if (pin !== pinConfirm) { showToast('Les PINs ne correspondent pas.', 'error'); if(btn){btn.disabled=false;btn.textContent=originalText;} return; }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) { showToast('Le PIN doit etre exactement 4 chiffres.', 'error'); if(btn){btn.disabled=false;btn.textContent=originalText;} return; }
    fetch(API_URL + '/api/v1/auth/register', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({first_name:first_name,last_name:last_name,phone:phone,pin:pin,profile_type:profile_type,region:region,commune:commune}) })
      .then(function(res){ return res.json(); }).then(function(data){
        if (data.id) {
          showToast("Inscription reussie ! Votre ID NGD : " + (data.ngd_id || '—'), 'success');
          var loginIds = ['login','connexion','login-form','connexion-form'];
          for (var i=0;i<loginIds.length;i++) { var loginContainer=document.getElementById(loginIds[i]); if(loginContainer){ var loginPhone=findInput(loginContainer,['tel','text'],['phone','telephone'],['telephone']); if(loginPhone)loginPhone.value=phone; break; } }
        } else { showToast(data.detail || "Erreur lors de l'inscription", 'error'); }
      }).catch(function(){ showToast('Erreur reseau. Reessayez.', 'error'); })
      .finally(function(){ if(btn){btn.disabled=false;btn.textContent=originalText;} });
  });
}

/* ---------- DASHBOARD ---------- */
function fixCampaignLabels() {
  var modal = document.getElementById('modal-campaign');
  if (!modal) return;
  modal.querySelectorAll('label, .form-label, .field-label, .modal-label').forEach(function(lbl){
    if (lbl.textContent.indexOf('GDES')!==-1 || lbl.textContent.indexOf('Gdes')!==-1) lbl.textContent = lbl.textContent.replace(/GDES|Gdes/g, 'FCFA');
  });
}

function initDashboardPage() {
  console.log('[DASHBOARD] initDashboardPage demarre');
  if (!isLoggedIn()) { window.location.replace('index.html'); return; }
  setupNavigation();
  setupCampaignModal();
  setupCampaignFilters();
  setupMobileMenu();
  fixCampaignLabels();
  setupAdminFeatures();
  setupProfileForm();
  setupPaymentModal();
  setupExportButtons();
  updateSidebarProfile();
  refreshUserFromAPI();
  loadSection('overview');
  setTimeout(loadBotStats, 500);
}

function setupNavigation() {
  var navItems = document.querySelectorAll('.nav-item[data-section]');
  navItems.forEach(function(item){
    item.addEventListener('click', function(){
      var section = item.dataset.section;
      navItems.forEach(function(n){ n.classList.remove('active'); });
      item.classList.add('active');
      loadSection(section);
    });
  });
  var logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
}

function setupMobileMenu() {
  var toggle = document.getElementById('mobile-menu-toggle');
  var sidebar = document.querySelector('.sidebar');
  if (toggle && sidebar) toggle.addEventListener('click', function(){ sidebar.classList.toggle('open'); });
}

function loadSection(sectionName) {
  document.querySelectorAll('.section').forEach(function(s){ s.classList.remove('active'); });
  var target = document.getElementById('section-' + sectionName);
  if (target) target.classList.add('active');
  switch(sectionName){
    case 'overview': loadOverviewStats(); break;
    case 'campaigns': loadCampaigns(); break;
    case 'users': loadUsers(); break;
    case 'orders': loadOrders(); break;
    case 'profile': loadProfile(); break;
  }
}

function refreshUserFromAPI() {
  apiFetch('/api/v1/auth/me').then(function(res){
    if (!res.ok) return;
    return res.json();
  }).then(function(user){
    if (user && user.id) { setCurrentUser(user); updateSidebarProfile(); setupAdminFeatures(); }
  }).catch(function(e){ console.error('[DASHBOARD] refreshUserFromAPI:', e); });
}

function updateSidebarProfile() {
  var user = getCurrentUser();
  if (!user) return;
  var fullName = ((user.first_name||'') + ' ' + (user.last_name||'')).trim() || 'Membre NGD';
  var nameEl = document.querySelector('.user-mini .name');
  var roleEl = document.querySelector('.user-mini .role');
  var avatarEl = document.querySelector('.user-avatar');
  if (nameEl) nameEl.textContent = fullName;
  if (roleEl) roleEl.textContent = user.profile_type || user.role || 'Animateur NGD';
  if (avatarEl) avatarEl.textContent = (user.first_name ? user.first_name[0] : 'U').toUpperCase();
  var setText = function(sel, txt){ var el=document.querySelector(sel); if(el)el.textContent=txt||'—'; };
  setText('#dash-name', fullName);
  setText('#dash-id', user.ngd_id);
  setText('#dash-profil', user.profile_type || user.role);
  setText('#dash-phone', formatPhone(user.phone));
  setText('#dash-region', user.region);
  setText('#dash-commune', user.commune);
  var authSource = localStorage.getItem('c509_auth_source');
  var elBadge = document.querySelector('#dash-badge, .dash-badge');
  if (elBadge) { elBadge.style.display = authSource==='bot'?'inline-block':'none'; if(authSource==='bot')elBadge.textContent='Connecte via Bot Challenger'; }
}

function setupAdminFeatures() {
  var user = getCurrentUser();
  if (!user) return;
  var isAdminUser = user.role === 'admin' || user.role === 'superadmin';
  var isManagerUser = isAdminUser || user.role === 'manager';

  var badgeEl = document.querySelector('.admin-badge, #admin-badge');
  if (badgeEl) { badgeEl.style.display = isAdminUser ? 'inline-block' : 'none'; if(isAdminUser) badgeEl.textContent = 'ADMIN'; }

  var btnCreate = document.getElementById('btn-create-campaign');
  if (btnCreate) btnCreate.style.display = isManagerUser ? '' : 'none';

  var editBtns = document.querySelectorAll('.btn-edit-campaign');
  editBtns.forEach(function(b){ b.style.display = isManagerUser ? '' : 'none'; });

  // Utilisateurs : visible seulement admin
  var usersNav = document.querySelector('.nav-item[data-section="users"]');
  if (usersNav) usersNav.style.display = isAdminUser ? '' : 'none';

  // Commandes TCL : visible pour TOUS (user voit ses commandes, admin voit tout)
  var ordersNav = document.querySelector('.nav-item[data-section="orders"]');
  if (ordersNav) ordersNav.style.display = '';

  console.log('[ADMIN] Role:', user.role, '| Admin:', isAdminUser, '| Manager:', isManagerUser);
}

function loadOverviewStats() {
  var container = document.getElementById('overview-stats');
  if (!container) return;
  container.innerHTML = '<div class="loading">Chargement des statistiques...</div>';

  function renderStats(data) {
    var stats = [
      { label: 'Utilisateurs', value: data.total_users || 0, icon: '👥', color: '#3498db', fmt: 'num' },
      { label: 'Campagnes', value: data.total_campaigns || 0, icon: '📢', color: '#e74c3c', fmt: 'num' },
      { label: 'Commandes TCL', value: data.total_orders || 0, icon: '🛒', color: '#f39c12', fmt: 'num' },
      { label: 'Revenus payes', value: data.total_revenue || 0, icon: '💰', color: '#27ae60', fmt: 'fcfa' },
      { label: 'Groupes actifs', value: data.total_groups || 0, icon: '👥', color: '#9b59b6', fmt: 'num' },
      { label: 'Retraits en attente', value: data.pending_withdrawals || 0, icon: '⏳', color: '#e67e22', fmt: 'num' },
    ];
    var allZero = stats.every(function(s){ return s.value === 0; });
    var html = stats.map(function(s){
      return '<div class="stat-card" style="border-left:4px solid ' + s.color + '"><div class="stat-icon">' + s.icon + '</div><div class="stat-value" style="color:' + s.color + '">' + (s.fmt==='fcfa'?formatFCFA(s.value):formatNumber(s.value)) + '</div><div class="stat-label">' + s.label + '</div></div>';
    }).join('');
    if (allZero) {
      html += '<div style="grid-column:1/-1;text-align:center;padding:12px;background:#fff3cd;border-radius:8px;color:#856404;font-size:13px;">⚠️ Toutes les stats sont à 0. Avez-vous appele <strong>/api/seed</strong> sur le backend ?</div>';
    }
    container.innerHTML = html;
  }

  apiFetch('/api/v1/dashboard/stats').then(function(res){
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }).then(function(data){
    renderStats(data);
  }).catch(function(e){
    console.error('[STATS] Erreur /api/v1/dashboard/stats:', e.message);
    apiFetch('/api/dashboard/stats').then(function(res){
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function(data){
      renderStats(data);
    }).catch(function(e2){
      console.error('[STATS] Fallback aussi en erreur:', e2.message);
      container.innerHTML = '<div class="text-error">Impossible de charger les statistiques. (' + e.message + ')</div>';
    });
  });
}

/* ---------- BOT STATS ---------- */
function loadBotStats() {
  console.log('[BOT STATS] loadBotStats() appele');
  var container = document.getElementById('bot-stats-section');
  if (!container) { console.warn('[BOT STATS] Section introuvable'); return; }
  var token = localStorage.getItem("c509_jwt");
  if (!token) { console.warn('[BOT STATS] Pas de token'); return; }

  apiFetch('/api/bot/stats').then(function(res){
    if (!res.ok) throw new Error('Erreur stats bot: ' + res.status);
    return res.json();
  }).then(function(data){
    renderBotStats(data.latest, data.week);
    renderBotWeekStats(data.week);
    return apiFetch('/api/bot/stats/history?days=7');
  }).then(function(res){
    if (!res.ok) throw new Error('Erreur historique bot: ' + res.status);
    return res.json();
  }).then(function(history){
    renderBotChart(history);
    console.log('[BOT STATS] Tout charge');
  }).catch(function(e){
    console.error('[BOT STATS] ERREUR:', e.message);
    var errEl = document.getElementById('bot-stats-error');
    if (errEl) errEl.textContent = 'Erreur: ' + e.message;
  });
}

function renderBotStats(latest, week) {
  week = week || {}; latest = latest || {};
  var idMap = {
    'bot-conversations': latest.total_conversations || 0,
    'bot-active': latest.active_conversations || 0,
    'bot-leads': latest.leads_generated || 0,
    'bot-conversions': latest.conversions || 0,
    'bot-messages': latest.messages_sent || 0
  };
  for (var id in idMap) { var el = document.getElementById(id); if (el) el.textContent = formatNumber(idMap[id]); }
  var verEl = document.getElementById("bot-version");
  if (verEl && latest.bot_version) verEl.textContent = 'v' + latest.bot_version;
  var tsEl = document.getElementById("bot-last-update");
  if (tsEl && latest.recorded_at) tsEl.textContent = new Date(latest.recorded_at).toLocaleTimeString("fr-FR");
}

function renderBotWeekStats(week) {
  var el = document.getElementById("bot-week-summary");
  if (!el) return;
  el.innerHTML =
    '<div class="bot-week-item"><strong>' + formatNumber(week.leads || 0) + '</strong><span>Leads (7j)</span></div>' +
    '<div class="bot-week-item"><strong>' + formatNumber(week.conversions || 0) + '</strong><span>Conversions (7j)</span></div>' +
    '<div class="bot-week-item"><strong>' + formatNumber(week.messages || 0) + '</strong><span>Messages (7j)</span></div>';
}

function renderBotChart(history) {
  var canvas = document.getElementById("bot-stats-chart");
  if (!canvas || typeof Chart === 'undefined') return;

  // Agréger par date pour eviter les labels dupliques
  var aggregated = {};
  history.forEach(function(h){
    var dk = h.date;
    if (!aggregated[dk]) aggregated[dk] = { conversations: 0, leads: 0, messages: 0 };
    aggregated[dk].conversations += (h.conversations || 0);
    aggregated[dk].leads += (h.leads || 0);
    aggregated[dk].messages += (h.messages || 0);
  });
  var dates = Object.keys(aggregated).sort();
  var labels = dates.map(function(d){ return new Date(d).toLocaleDateString("fr-FR", {weekday:"short", day:"numeric", month:"short"}); });
  var conversations = dates.map(function(d){ return aggregated[d].conversations; });
  var leads = dates.map(function(d){ return aggregated[d].leads; });

  safeChartCreate("bot-stats-chart", {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        { label: "Conversations", data: conversations, borderColor: "#3b82f6", tension: 0.3, fill: false },
        { label: "Leads", data: leads, borderColor: "#10b981", tension: 0.3, fill: false }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

/* ---------- CAMPAGNES ---------- */
var campaignsState = { page: 1, perPage: 10, total: 0, data: [], filters: { search: '', status: '', region: '' } };

function loadCampaigns() {
  var tbody = document.getElementById('campaigns-table-body');
  var paginationEl = document.getElementById('campaigns-pagination');
  if (!tbody) { console.error('[CAMPAIGNS] tbody introuvable'); return; }
  tbody.innerHTML = '<tr><td colspan="7" class="text-center">Chargement...</td></tr>';
  var q = new URLSearchParams();
  q.append('page', campaignsState.page);
  q.append('per_page', campaignsState.perPage);
  if (campaignsState.filters.search) q.append('search', campaignsState.filters.search);
  if (campaignsState.filters.status) q.append('status', campaignsState.filters.status);
  if (campaignsState.filters.region) q.append('region', campaignsState.filters.region);
  apiFetch('/api/v1/campaigns?' + q.toString()).then(function(res){
    return res.json().then(function(data){
      if (!res.ok) { console.error('[CAMPAIGNS] HTTP', res.status, data); throw new Error(data.detail || 'HTTP ' + res.status); }
      var list = Array.isArray(data) ? data : (data.campaigns || []);
      campaignsState.total = Array.isArray(data) ? list.length : (data.total || list.length);
      campaignsState.data = list;
      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Aucune campagne trouvee.</td></tr>';
        if (paginationEl) paginationEl.innerHTML = '';
        return;
      }
      tbody.innerHTML = list.map(function(c){
        return '<tr><td><strong>' + escapeHtml(c.name) + '</strong><br><small>' + (c.slug || '') + '</small></td><td><span class="badge">' + (c.election_type || '—') + '</span></td><td>' + escapeHtml(c.region || '—') + (c.commune ? '<br><small>' + escapeHtml(c.commune) + '</small>' : '') + '</td><td>' + formatDate(c.election_date) + '</td><td><span class="status-badge status-' + (c.status || '—').toLowerCase() + '">' + (c.status || '—') + '</span></td><td>' + formatFCFA(c.price_ht || c.price_total || 0) + '</td><td>' + (canManageCampaigns() ? '<button onclick="editCampaign(' + c.id + ')" class="btn-icon" title="Editer">✏️</button> ' : '') + '<button onclick="viewCampaign(' + c.id + ')" class="btn-icon" title="Voir">👁️</button></td></tr>';
      }).join('');
      renderCampaignPagination();
    });
  }).catch(function(e){
    console.error('[CAMPAIGNS] Exception:', e.message);
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-error">Erreur de chargement.</td></tr>';
  });
}

function renderCampaignPagination() {
  var el = document.getElementById('campaigns-pagination');
  if (!el) return;
  var totalPages = Math.ceil(campaignsState.total / campaignsState.perPage) || 1;
  if (totalPages <= 1) { el.innerHTML = ''; return; }
  var html = '<div class="pagination">';
  html += '<button onclick="changeCampaignPage(' + (campaignsState.page - 1) + ')" ' + (campaignsState.page <= 1 ? 'disabled' : '') + '>&lt;</button>';
  for (var i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= campaignsState.page - 1 && i <= campaignsState.page + 1)) {
      html += '<button onclick="changeCampaignPage(' + i + ')" class="' + (i === campaignsState.page ? 'active' : '') + '">' + i + '</button>';
    } else if (i === campaignsState.page - 2 || i === campaignsState.page + 2) {
      html += '<span>...</span>';
    }
  }
  html += '<button onclick="changeCampaignPage(' + (campaignsState.page + 1) + ')" ' + (campaignsState.page >= totalPages ? 'disabled' : '') + '>&gt;</button>';
  html += '</div>';
  el.innerHTML = html;
}

function changeCampaignPage(p) { campaignsState.page = p; loadCampaigns(); }

function setupCampaignFilters() {
  var searchInp = document.getElementById('camp-filter-search');
  var statusSel = document.getElementById('camp-filter-status');
  var regionInp = document.getElementById('camp-filter-region');
  var applyBtn = document.getElementById('camp-filter-apply');
  var apply = function(){
    campaignsState.filters.search = searchInp ? searchInp.value.trim() : '';
    campaignsState.filters.status = statusSel ? statusSel.value : '';
    campaignsState.filters.region = regionInp ? regionInp.value.trim() : '';
    campaignsState.page = 1; loadCampaigns();
  };
  if (applyBtn) applyBtn.addEventListener('click', apply);
  if (searchInp) searchInp.addEventListener('keyup', function(e){ if(e.key==='Enter') apply(); });
}

function canManageCampaigns() { var user = getCurrentUser(); return user && ['superadmin','admin','manager'].indexOf(user.role) !== -1; }

function viewCampaign(id) {
  apiFetch('/api/v1/campaigns?id=' + id).then(function(res){
    if (!res.ok) throw new Error('Erreur chargement campagne');
    return res.json();
  }).then(function(c){
    var modalId = 'modal-campaign-detail';
    var existing = document.getElementById(modalId);
    if (existing) existing.remove();
    var modal = document.createElement('div');
    modal.id = modalId; modal.className = 'modal active';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;';
    modal.innerHTML = '<div style="background:#fff;border-radius:12px;max-width:560px;width:90%;max-height:90vh;overflow-y:auto;padding:28px;position:relative;">' +
      '<button onclick="this.closest(\'.modal\').remove()" style="position:absolute;top:14px;right:14px;background:none;border:none;font-size:22px;cursor:pointer;">&times;</button>' +
      '<h2 style="margin:0 0 18px 0;font-size:20px;color:#1a1a2e;">' + escapeHtml(c.name) + '</h2>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px;">' +
      '<div><small style="color:#888;">Type</small><div style="font-weight:600;">' + (c.election_type || '—') + '</div></div>' +
      '<div><small style="color:#888;">Statut</small><div style="font-weight:600;">' + (c.status || '—') + '</div></div>' +
      '<div><small style="color:#888;">Region</small><div style="font-weight:600;">' + escapeHtml(c.region || '—') + '</div></div>' +
      '<div><small style="color:#888;">Commune</small><div style="font-weight:600;">' + escapeHtml(c.commune || '—') + '</div></div>' +
      '<div><small style="color:#888;">Date election</small><div style="font-weight:600;">' + formatDate(c.election_date) + '</div></div>' +
      '<div><small style="color:#888;">Prix HT</small><div style="font-weight:600;color:#27ae60;">' + formatFCFA(c.price_ht || c.price_total || 0) + '</div></div>' +
      '</div>' +
      '<div style="margin-bottom:18px;"><small style="color:#888;">Description</small><div style="margin-top:4px;">' + escapeHtml(c.description || 'Aucune description') + '</div></div>' +
      '<div style="text-align:right;"><button onclick="this.closest(\'.modal\').remove()" style="padding:10px 22px;background:#1a1a2e;color:#fff;border:none;border-radius:8px;cursor:pointer;">Fermer</button></div>' +
      '</div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', function(e){ if(e.target===modal) modal.remove(); });
  }).catch(function(e){ showToast('Erreur: ' + e.message, 'error'); });
}

function editCampaign(id) {
  if (!canManageCampaigns()) { showToast('Permission insuffisante.', 'error'); return; }
  apiFetch('/api/v1/campaigns?id=' + id).then(function(res){
    if (!res.ok) throw new Error('Erreur chargement campagne');
    return res.json();
  }).then(function(c){
    var modal = document.getElementById('modal-campaign');
    if (!modal) { showToast('Modal non trouve.', 'error'); return; }
    var form = document.getElementById('form-campaign');
    if (!form) { showToast('Formulaire non trouve.', 'error'); return; }
    document.getElementById('camp-name').value = c.name || '';
    var typeSel = document.getElementById('camp-type');
    if (typeSel) typeSel.value = c.election_type || '';
    document.getElementById('camp-region').value = c.region || '';
    document.getElementById('camp-commune').value = c.commune || '';
    document.getElementById('camp-date').value = c.election_date || '';
    document.getElementById('camp-desc').value = c.description || '';
    document.getElementById('camp-price').value = c.price_ht || c.price_total || 0;
    var pricingSel = document.getElementById('camp-pricing');
    if (pricingSel) pricingSel.value = c.pricing_model || 'forfait';
    var titleEl = modal.querySelector('.modal-title, h2, h3');
    if (titleEl) titleEl.textContent = 'Modifier la campagne';
    var submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.textContent = 'Enregistrer'; submitBtn.dataset.originalText = 'Enregistrer'; }
    modal.dataset.campaignId = id;
    modal.classList.add('active');
  }).catch(function(e){ showToast('Erreur: ' + e.message, 'error'); });
}

function setupCampaignModal() {
  var modal = document.getElementById('modal-campaign');
  var btnOpen = document.getElementById('btn-create-campaign');
  var btnClose = document.getElementById('modal-campaign-close');
  var form = document.getElementById('form-campaign');
  if (btnOpen && modal) {
    btnOpen.addEventListener('click', function(){
      if (!canManageCampaigns()) { showToast('Permission insuffisante.', 'error'); return; }
      form.reset(); delete modal.dataset.campaignId;
      var titleEl = modal.querySelector('.modal-title, h2, h3');
      if (titleEl) titleEl.textContent = 'Nouvelle campagne';
      var submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) { submitBtn.textContent = 'Creer'; submitBtn.dataset.originalText = 'Creer'; }
      modal.classList.add('active');
    });
  }
  if (btnClose && modal) btnClose.addEventListener('click', function(){ modal.classList.remove('active'); });
  if (modal) modal.addEventListener('click', function(e){ if(e.target===modal) modal.classList.remove('active'); });
  if (form) {
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      var originalText = btn ? btn.textContent : 'Creer';
      if (btn) { btn.disabled = true; btn.textContent = 'Envoi...'; }
      var payload = {
        name: document.getElementById('camp-name') ? document.getElementById('camp-name').value.trim() : '',
        election_type: document.getElementById('camp-type') ? document.getElementById('camp-type').value : '',
        region: document.getElementById('camp-region') ? document.getElementById('camp-region').value.trim() : '',
        commune: document.getElementById('camp-commune') ? document.getElementById('camp-commune').value.trim() || null : null,
        election_date: document.getElementById('camp-date') ? document.getElementById('camp-date').value || null : null,
        description: document.getElementById('camp-desc') ? document.getElementById('camp-desc').value.trim() || null : null,
        price_ht: Number(document.getElementById('camp-price') ? document.getElementById('camp-price').value || 0 : 0),
        pricing_model: document.getElementById('camp-pricing') ? document.getElementById('camp-pricing').value || 'forfait' : 'forfait'
      };
      if (!payload.name || !payload.election_type || !payload.region) {
        showToast('Veuillez remplir les champs obligatoires.', 'error');
        if (btn) { btn.disabled = false; btn.textContent = originalText; }
        return;
      }
      var campaignId = modal.dataset.campaignId;
      var method = campaignId ? 'PUT' : 'POST';
      var path = campaignId ? '/api/v1/campaigns?id=' + campaignId : '/api/v1/campaigns';
      apiFetch(path, { method: method, body: JSON.stringify(payload) }).then(function(res){
        return res.json().then(function(data){
          if (res.status === 200 || res.status === 201) {
            showToast(campaignId ? 'Campagne mise a jour !' : 'Campagne creee avec succes !', 'success');
            modal.classList.remove('active'); form.reset(); delete modal.dataset.campaignId;
            var titleEl = modal.querySelector('.modal-title, h2, h3');
            if (titleEl) titleEl.textContent = 'Nouvelle campagne';
            var submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.textContent = submitBtn.dataset.originalText || 'Creer';
            loadCampaigns();
          } else { showToast(data.detail || 'Erreur campagne', 'error'); }
        });
      }).catch(function(){ showToast('Erreur reseau.', 'error'); })
      .finally(function(){ if(btn){btn.disabled=false;btn.textContent=originalText;} });
    });
  }
}

/* ---------- UTILISATEURS ---------- */
function loadUsers() {
  var tbody = document.getElementById('users-table-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" class="text-center">Chargement...</td></tr>';
  apiFetch('/api/v1/users?per_page=100').then(function(res){
    if (!res.ok) throw new Error('Erreur users');
    return res.json();
  }).then(function(data){
    var list = Array.isArray(data) ? data : (data.users || []);
    if (!list.length) { tbody.innerHTML = '<tr><td colspan="7" class="text-center">Aucun utilisateur trouve.</td></tr>'; return; }
    tbody.innerHTML = list.map(function(u){
      return '<tr><td><strong>' + escapeHtml(u.first_name || '') + ' ' + escapeHtml(u.last_name || '') + '</strong><br><small>' + (u.ngd_id || '') + '</small></td><td>' + formatPhone(u.phone) + '</td><td>' + (u.email ? escapeHtml(u.email) : '—') + '</td><td>' + (u.profile_type || '—') + '</td><td>' + escapeHtml(u.region || '—') + '</td><td>' + (u.status || '—') + '</td><td>' + formatDate(u.created_at) + '</td></tr>';
    }).join('');
  }).catch(function(e){ tbody.innerHTML = '<tr><td colspan="7" class="text-center text-error">Erreur de chargement.</td></tr>'; });
}

/* ---------- COMMANDES (AVEC BOUTON PAYER) ---------- */
function loadOrders() {
  var tbody = document.getElementById('orders-table-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" class="text-center">Chargement...</td></tr>';

  function doLoad(path) {
    apiFetch(path).then(function(res){
      console.log('[ORDERS] Response', res.status);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function(data){
      console.log('[ORDERS] Data keys:', Object.keys(data));
      var list = Array.isArray(data) ? data : (data.orders || []);
      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Aucune commande trouvee.</td></tr>';
        return;
      }
      tbody.innerHTML = list.map(function(o){
        var client = o.user || {};
        var payBtn = '';
        if (o.payment_status === 'pending' || o.payment_status === 'unpaid') {
          payBtn = '<button onclick="openPaymentModal(' + o.id + ',' + (o.total_amount || 0) + ')" class="btn-icon" title="Payer" style="background:#27ae60;color:#fff;padding:4px 10px;border-radius:4px;font-size:12px;border:none;cursor:pointer;">💳 Payer</button>';
        } else {
          payBtn = '<span style="color:#27ae60;font-weight:600;font-size:12px;">✓ Paye</span>';
        }
        return '<tr><td><strong>#' + (o.order_number || o.id) + '</strong></td><td>' + escapeHtml(client.first_name || '') + ' ' + escapeHtml(client.last_name || '') + '<br><small>' + formatPhone(client.phone) + '</small></td><td>' + formatNumber(o.total_amount) + ' Gdes</td><td>' + escapeHtml(o.region || '—') + (o.commune ? '<br><small>' + escapeHtml(o.commune) + '</small>' : '') + '</td><td>' + (o.status || '—') + '</td><td>' + (o.payment_status || '—') + '</td><td>' + formatDate(o.created_at) + '</td><td>' + payBtn + '</td></tr>';
      }).join('');
    }).catch(function(e){
      console.error('[ORDERS] Error:', e.message);
      if (path.indexOf('/api/v1/') !== -1) {
        console.log('[ORDERS] Fallback sur /api/orders...');
        doLoad('/api/orders?per_page=100');
      } else {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-error">Erreur de chargement: ' + escapeHtml(e.message) + '</td></tr>';
      }
    });
  }

  doLoad('/api/v1/orders?per_page=100');
}

/* ---------- HELPERS ---------- */
function escapeHtml(text) { if (!text) return ''; var div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

/* ---------- PROFIL ---------- */
function loadProfile() {
  var section = document.getElementById('section-profile');
  if (!section) return;
  var user = getCurrentUser();
  if (!user) return;
  var fields = {
    'prof-first-name': user.first_name, 'prof-last-name': user.last_name,
    'prof-phone': user.phone, 'prof-email': user.email || '',
    'prof-region': user.region || '', 'prof-commune': user.commune || '',
    'prof-ngd-id': user.ngd_id, 'prof-role': user.role, 'prof-profile-type': user.profile_type
  };
  for (var id in fields) { var el = document.getElementById(id); if (el) el.value = fields[id] || ''; }
  var readOnly = {
    'prof-display-name': (user.first_name||'') + ' ' + (user.last_name||''),
    'prof-display-phone': user.phone, 'prof-display-email': user.email || '—',
    'prof-display-region': user.region || '—', 'prof-display-commune': user.commune || '—',
    'prof-display-ngd': user.ngd_id, 'prof-display-role': user.role, 'prof-display-profile': user.profile_type
  };
  for (var id in readOnly) { var el = document.getElementById(id); if (el) el.textContent = readOnly[id]; }
}

function setupProfileForm() {
  var form = document.getElementById('form-profile');
  if (!form) return;
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var btn = form.querySelector('button[type="submit"]');
    var originalText = btn ? btn.textContent : 'Enregistrer';
    if (btn) { btn.disabled = true; btn.textContent = 'Enregistrement...'; }
    var payload = {
      first_name: document.getElementById('prof-first-name') ? document.getElementById('prof-first-name').value.trim() : '',
      last_name: document.getElementById('prof-last-name') ? document.getElementById('prof-last-name').value.trim() : '',
      phone: document.getElementById('prof-phone') ? document.getElementById('prof-phone').value.trim().replace(/\s/g,'') : '',
      email: document.getElementById('prof-email') ? document.getElementById('prof-email').value.trim() : '',
      region: document.getElementById('prof-region') ? document.getElementById('prof-region').value.trim() : '',
      commune: document.getElementById('prof-commune') ? document.getElementById('prof-commune').value.trim() : ''
    };
    var newPin = document.getElementById('prof-new-pin');
    var confirmPin = document.getElementById('prof-confirm-pin');
    if (newPin && newPin.value.trim()) {
      var pin = newPin.value.trim();
      var confirm = confirmPin ? confirmPin.value.trim() : '';
      if (pin !== confirm) { showToast('Les PINs ne correspondent pas.', 'error'); if(btn){btn.disabled=false;btn.textContent=originalText;} return; }
      if (pin.length !== 4 || !/^\d{4}$/.test(pin)) { showToast('Le PIN doit etre 4 chiffres.', 'error'); if(btn){btn.disabled=false;btn.textContent=originalText;} return; }
      payload.pin = pin;
    }
    apiFetch('/api/v1/auth/me', { method: 'PUT', body: JSON.stringify(payload) })
      .then(function(res){ if(!res.ok) throw new Error('Erreur ' + res.status); return res.json(); })
      .then(function(user){ setCurrentUser(user); updateSidebarProfile(); loadProfile(); showToast('Profil mis a jour avec succes !', 'success'); if(newPin)newPin.value=''; if(confirmPin)confirmPin.value=''; })
      .catch(function(e){ showToast('Erreur: ' + e.message, 'error'); })
      .finally(function(){ if(btn){btn.disabled=false;btn.textContent=originalText;} });
  });
}

/* ---------- PAIEMENT ---------- */
function openPaymentModal(orderId, amount) {
  var modal = document.getElementById('modal-payment');
  if (!modal) return;
  document.getElementById('pay-order-id').value = orderId;
  document.getElementById('pay-amount').textContent = formatCurrency(amount) + ' / ' + formatFCFA(amount);
  var instrEl = document.getElementById('pay-instructions');
  if (instrEl) { instrEl.style.display = 'none'; instrEl.textContent = ''; }
  var confirmBtn = document.getElementById('btn-confirm-payment');
  if (confirmBtn) confirmBtn.style.display = 'none';
  modal.classList.add('active');
}

function setupPaymentModal() {
  var modal = document.getElementById('modal-payment');
  var btnClose = document.getElementById('modal-payment-close');
  var form = document.getElementById('form-payment');
  if (btnClose && modal) btnClose.addEventListener('click', function(){ modal.classList.remove('active'); });
  if (modal) modal.addEventListener('click', function(e){ if(e.target===modal) modal.classList.remove('active'); });
  if (form) {
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      var originalText = btn ? btn.textContent : 'Payer';
      if (btn) { btn.disabled = true; btn.textContent = 'Traitement...'; }
      var orderId = document.getElementById('pay-order-id').value;
      var method = document.getElementById('pay-method').value;
      var phone = document.getElementById('pay-phone').value.trim();
      apiFetch('/api/v1/payments/init', { method: 'POST', body: JSON.stringify({ order_id: parseInt(orderId), method: method, phone: phone }) })
        .then(function(res){ return res.json(); })
        .then(function(data){
          if (data.ok) {
            showToast('Paiement initie. ' + data.instructions, 'success');
            var instrEl = document.getElementById('pay-instructions');
            if (instrEl) { instrEl.textContent = data.instructions; instrEl.style.display = 'block'; }
            var confirmBtn = document.getElementById('btn-confirm-payment');
            if (confirmBtn) { confirmBtn.style.display = ''; confirmBtn.onclick = function(){ confirmPayment(data.payment_id, data.transaction_id); }; }
          } else { showToast(data.detail || 'Erreur paiement', 'error'); }
        })
        .catch(function(e){ showToast('Erreur reseau: ' + e.message, 'error'); })
        .finally(function(){ if(btn){btn.disabled=false;btn.textContent=originalText;} });
    });
  }
}

function confirmPayment(paymentId, txId) {
  apiFetch('/api/v1/payments/confirm', { method: 'POST', body: JSON.stringify({ payment_id: paymentId, transaction_id: txId }) })
    .then(function(res){ return res.json(); })
    .then(function(data){
      if (data.ok) {
        showToast('Paiement confirme avec succes !', 'success');
        var modal = document.getElementById('modal-payment');
        if (modal) modal.classList.remove('active');
        loadOrders(); loadOverviewStats();
      } else { showToast(data.detail || 'Erreur confirmation', 'error'); }
    })
    .catch(function(e){ showToast('Erreur: ' + e.message, 'error'); });
}

/* ---------- EXPORT CSV ---------- */
function exportCSV(type) {
  var token = localStorage.getItem('c509_jwt');
  var url = API_URL + '/api/v1/export/' + type;
  var filename = type + '_' + new Date().toISOString().slice(0,10) + '.csv';
  fetch(url, { method: 'GET', headers: { 'Authorization': 'Bearer ' + token } })
    .then(function(res){ if(!res.ok) throw new Error('Erreur export: ' + res.status); return res.blob(); })
    .then(function(blob){ var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href); showToast('Export ' + type + ' telecharge !', 'success'); })
    .catch(function(e){ showToast('Erreur export: ' + e.message, 'error'); });
}
function setupExportButtons() {
  var btns = document.querySelectorAll('[data-export]');
  btns.forEach(function(btn){ btn.addEventListener('click', function(){ var type=btn.dataset.export; if(type) exportCSV(type); }); });
}

/* ---------- INIT ---------- */
document.addEventListener('DOMContentLoaded', function(){
  var path = window.location.pathname;
  if (path.indexOf('dashboard') !== -1) initDashboardPage();
  else initIndexPage();
});
