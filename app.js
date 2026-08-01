/* ============================================================
   Coalition 509 SaaS — Frontend v1.5.9
   Corrections : modals TCL/Campagnes, Stats Bot, Déconnexion,
   Actualiser, responsive mobile
   ============================================================ */

const API_URL = 'https://coalition509-api.onrender.com';

/* ---------- AUTH ---------- */
function getToken() { return localStorage.getItem('token'); }
function getUser() {
  try { return JSON.parse(localStorage.getItem('user') || '{}'); }
  catch { return {}; }
}
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

/* ---------- HELPERS ---------- */
function fmtFCFA(n) {
  if (n === undefined || n === null) return '0 FCFA';
  return Number(n).toLocaleString('fr-FR') + ' FCFA';
}
function fmtDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' });
}

/* ---------- API ---------- */
async function apiGet(path) {
  const res = await fetch(API_URL + path, {
    headers: { 'Authorization': 'Bearer ' + getToken() }
  });
  return res.json();
}
async function apiPost(path, body) {
  const res = await fetch(API_URL + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
    body: JSON.stringify(body)
  });
  return res.json();
}
async function apiPut(path, body) {
  const res = await fetch(API_URL + path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
    body: JSON.stringify(body)
  });
  return res.json();
}

/* ---------- NAVIGATION ---------- */
function showSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
  const sec = document.getElementById(id);
  if (sec) sec.classList.remove('hidden');
  // Active nav
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navMap = { 'dashboard-section':'nav-dashboard', 'campaigns-section':'nav-campaigns',
                   'users-section':'nav-users', 'orders-section':'nav-orders', 'profile-section':'nav-profile' };
  const navId = navMap[id];
  if (navId) {
    const el = document.getElementById(navId);
    if (el) el.classList.add('active');
  }
  window.scrollTo(0,0);
}

/* ---------- TOAST ---------- */
function showToast(msg, type='info') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.classList.remove('show'), 3000);
}

/* ---------- MODALS ---------- */
function openModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.add('hidden'); document.body.style.overflow = ''; }
}
function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.classList.add('hidden');
  });
  document.body.style.overflow = '';
}

/* ============================================================
   DASHBOARD — Vue d'ensemble
   ============================================================ */
async function loadDashboard() {
  try {
    const [stats, botStats] = await Promise.all([
      apiGet('/api/dashboard/stats'),
      apiGet('/api/bot/stats').catch(() => ({ ok:false }))
    ]);

    if (stats.ok) {
      setText('stat-users', stats.users || 0);
      setText('stat-campaigns', stats.campaigns || 0);
      setText('stat-orders', stats.orders || 0);
      setText('stat-revenue', fmtFCFA(stats.revenue));
      setText('stat-groups', stats.active_groups || 0);
      setText('stat-pending', stats.pending_withdrawals || 0);
    }

    // Stats Bot — gère les 2 formats de réponse
    if (botStats.ok) {
      const data = botStats.latest || botStats.stats || botStats;
      setText('bot-conversations', data.conversations || 0);
      setText('bot-active', data.active || data.messages || 0);
      setText('bot-leads', data.leads || 0);
      setText('bot-conversions', data.conversions || 0);
      setText('bot-messages', data.messages || 0);
      setText('bot-last-update', 'À l'instant');
    } else {
      // Fallback : afficher 0 sans planter
      setText('bot-conversations', 0);
      setText('bot-active', 0);
      setText('bot-leads', 0);
      setText('bot-conversions', 0);
      setText('bot-messages', 0);
      setText('bot-last-update', '—');
    }

    // Graphique 7j
    renderBotChart(botStats.week || botStats.history || []);

    // Coalition progression
    const groups = stats.active_groups || 0;
    setText('coalition-progress', groups + ' / 232 groupes créés');
    const bar = document.getElementById('coalition-bar');
    if (bar) bar.style.width = Math.min((groups/232)*100, 100) + '%';

  } catch (e) {
    console.error('Dashboard load error:', e);
    showToast('Erreur chargement dashboard', 'error');
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ---------- CHART ---------- */
let botChartInstance = null;
function renderBotChart(data) {
  const ctx = document.getElementById('botChart');
  if (!ctx) return;
  if (botChartInstance) { botChartInstance.destroy(); botChartInstance = null; }

  const labels = [];
  const values = [];
  if (Array.isArray(data) && data.length) {
    data.forEach(d => {
      labels.push(d.date || d.day || '?');
      values.push(d.messages || d.count || 0);
    });
  } else {
    // Fallback : 7 derniers jours à 0
    for (let i=6; i>=0; i--) {
      const d = new Date(); d.setDate(d.getDate()-i);
      labels.push(d.toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}));
      values.push(0);
    }
  }

  botChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Messages Bot (7j)',
        data: values,
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34,197,94,0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

/* ============================================================
   CAMPAGNES
   ============================================================ */
async function loadCampaigns() {
  try {
    const res = await apiGet('/api/campaigns');
    const tbody = document.getElementById('campaigns-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!res.ok || !res.campaigns || !res.campaigns.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:#888;">Aucune campagne</td></tr>';
      return;
    }

    res.campaigns.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${escapeHtml(c.name || c.nom || '—')}</strong></td>
        <td>${escapeHtml(c.type || '—')}</td>
        <td>${escapeHtml(c.region || '—')}</td>
        <td>${fmtDate(c.date || c.created_at)}</td>
        <td><span class="badge ${c.status==='active'?'badge-green':'badge-gray'}">${c.status || c.statut || '—'}</span></td>
        <td>${fmtFCFA(c.price || c.budget || 0)}</td>
        <td>
          <button class="btn-icon" onclick="openEditCampaign('${c.id || c.campaign_id}')" title="Modifier">✏️</button>
          <button class="btn-icon" onclick="viewCampaign('${c.id || c.campaign_id}')" title="Voir">👁️</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error('Campaigns load error:', e);
    showToast('Erreur chargement campagnes', 'error');
  }
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

async function createCampaign() {
  const name = document.getElementById('camp-name')?.value.trim();
  const type = document.getElementById('camp-type')?.value;
  const region = document.getElementById('camp-region')?.value.trim();
  const budget = parseInt(document.getElementById('camp-budget')?.value || 0);

  if (!name) { showToast('Nom de campagne requis', 'error'); return; }

  const res = await apiPost('/api/campaigns', { name, type, region, budget, status: 'active' });
  if (res.ok) {
    showToast('Campagne créée !', 'success');
    closeModal('modal-new-campaign');
    loadCampaigns();
    loadDashboard();
  } else {
    showToast(res.error || 'Erreur création', 'error');
  }
}

async function openEditCampaign(id) {
  try {
    const res = await apiGet('/api/campaigns?id=' + encodeURIComponent(id));
    const c = res.campaign || res.campaigns?.[0];
    if (!c) { showToast('Campagne introuvable', 'error'); return; }

    document.getElementById('edit-camp-id').value = c.id || c.campaign_id || id;
    document.getElementById('edit-camp-name').value = c.name || c.nom || '';
    document.getElementById('edit-camp-type').value = c.type || '';
    document.getElementById('edit-camp-region').value = c.region || '';
    document.getElementById('edit-camp-budget').value = c.price || c.budget || 0;
    document.getElementById('edit-camp-status').value = c.status || c.statut || 'active';

    openModal('modal-edit-campaign');
  } catch (e) {
    showToast('Erreur chargement campagne', 'error');
  }
}

async function saveEditCampaign() {
  const id = document.getElementById('edit-camp-id')?.value;
  const body = {
    name: document.getElementById('edit-camp-name')?.value.trim(),
    type: document.getElementById('edit-camp-type')?.value,
    region: document.getElementById('edit-camp-region')?.value.trim(),
    budget: parseInt(document.getElementById('edit-camp-budget')?.value || 0),
    status: document.getElementById('edit-camp-status')?.value
  };
  const res = await apiPut('/api/campaigns?id=' + encodeURIComponent(id), body);
  if (res.ok) {
    showToast('Campagne mise à jour', 'success');
    closeModal('modal-edit-campaign');
    loadCampaigns();
  } else {
    showToast(res.error || 'Erreur mise à jour', 'error');
  }
}

function viewCampaign(id) {
  showToast('Détail campagne — ID: ' + id, 'info');
}

/* ============================================================
   COMMANDES TCL
   ============================================================ */
async function loadOrders() {
  try {
    const res = await apiGet('/api/orders');
    const tbody = document.getElementById('orders-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!res.ok || !res.orders || !res.orders.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:#888;">Aucune commande</td></tr>';
      return;
    }

    res.orders.forEach(o => {
      const isPaid = (o.payment_status || o.statut_paiement) === 'paid' || (o.status || o.statut) === 'completed';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${escapeHtml(o.ref || o.id_commande || '#CMD-?')}</strong></td>
        <td>${escapeHtml(o.client || o.nom_complet || '—')}<br><small>${escapeHtml(o.telephone || '')}</small></td>
        <td>${fmtFCFA(o.amount || o.montant || 0)}</td>
        <td>${escapeHtml(o.region || '—')}</td>
        <td><span class="badge ${isPaid?'badge-green':'badge-orange'}">${escapeHtml(o.status || o.statut || 'pending')}</span></td>
        <td><span class="badge ${isPaid?'badge-green':'badge-gray'}">${isPaid?'Payé':'En attente'}</span></td>
        <td>${fmtDate(o.date || o.created_at)}</td>
        <td>
          ${isPaid
            ? '<span class="badge badge-green">✓ Payé</span>'
            : `<button class="btn-pay" onclick="payOrder('${o.id || o.id_commande}')">💳 Payer</button>`}
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error('Orders load error:', e);
  }
}

async function payOrder(id) {
  openModal('modal-pay-order');
  document.getElementById('pay-order-id').value = id;
}

async function confirmPayOrder() {
  const id = document.getElementById('pay-order-id')?.value;
  const method = document.getElementById('pay-method')?.value;
  const res = await apiPost('/api/orders/pay', { id, method });
  if (res.ok) {
    showToast('Paiement confirmé', 'success');
    closeModal('modal-pay-order');
    loadOrders();
    loadDashboard();
  } else {
    showToast(res.error || 'Erreur paiement', 'error');
  }
}

/* ============================================================
   UTILISATEURS
   ============================================================ */
async function loadUsers() {
  try {
    const res = await apiGet('/api/users');
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!res.ok || !res.users || !res.users.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:#888;">Aucun utilisateur</td></tr>';
      return;
    }

    res.users.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${escapeHtml(u.prenom || u.first_name || '—')} ${escapeHtml(u.nom || u.last_name || '')}</strong></td>
        <td>${escapeHtml(u.telephone || u.phone || '—')}</td>
        <td>${escapeHtml(u.email || '—')}</td>
        <td>${escapeHtml(u.region || '—')}</td>
        <td><span class="badge ${u.role==='admin'?'badge-purple':'badge-blue'}">${escapeHtml(u.role || u.profil || 'User')}</span></td>
        <td>${fmtDate(u.created_at)}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error('Users load error:', e);
  }
}

/* ============================================================
   PROFIL
   ============================================================ */
async function loadProfile() {
  const user = getUser();
  setText('profile-name', (user.prenom || user.first_name || '—') + ' ' + (user.nom || user.last_name || ''));
  setText('profile-role', user.role || user.profil || 'Utilisateur');
  setText('profile-id', user.id_ngd || user.id || '—');
  setText('profile-phone', user.telephone || user.phone || '—');
  setText('profile-email', user.email || '—');
  setText('profile-region', user.region || '—');
  setText('profile-commune', user.commune || '—');

  // Pré-remplir le formulaire d'édition
  const p = document.getElementById('edit-prenom');
  if (p) p.value = user.prenom || user.first_name || '';
  const n = document.getElementById('edit-nom');
  if (n) n.value = user.nom || user.last_name || '';
  const t = document.getElementById('edit-telephone');
  if (t) t.value = user.telephone || user.phone || '';
  const e = document.getElementById('edit-email');
  if (e) e.value = user.email || '';
}

async function saveProfile() {
  const body = {
    prenom: document.getElementById('edit-prenom')?.value.trim(),
    nom: document.getElementById('edit-nom')?.value.trim(),
    telephone: document.getElementById('edit-telephone')?.value.trim(),
    email: document.getElementById('edit-email')?.value.trim(),
    region: document.getElementById('edit-region')?.value.trim(),
    commune: document.getElementById('edit-commune')?.value.trim()
  };
  const pin1 = document.getElementById('edit-pin')?.value;
  const pin2 = document.getElementById('edit-pin-confirm')?.value;
  if (pin1 && pin1 !== pin2) { showToast('PINs différents', 'error'); return; }
  if (pin1) body.pin = pin1;

  const res = await apiPost('/api/auth/me', body);
  if (res.ok) {
    showToast('Profil mis à jour', 'success');
    localStorage.setItem('user', JSON.stringify({ ...getUser(), ...body }));
    loadProfile();
  } else {
    showToast(res.error || 'Erreur', 'error');
  }
}

/* ============================================================
   CSV EXPORT
   ============================================================ */
function exportCSV(filename, rows) {
  if (!rows || !rows.length) { showToast('Aucune donnée à exporter', 'error'); return; }
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(';')];
  rows.forEach(r => {
    csv.push(headers.map(h => '"' + String(r[h] || '').replace(/"/g,'""') + '"').join(';'));
  });
  const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

async function exportCampaignsCSV() {
  const res = await apiGet('/api/campaigns');
  if (res.ok && res.campaigns) exportCSV('campagnes.csv', res.campaigns);
}
async function exportOrdersCSV() {
  const res = await apiGet('/api/orders');
  if (res.ok && res.orders) exportCSV('commandes.csv', res.orders);
}
async function exportUsersCSV() {
  const res = await apiGet('/api/users');
  if (res.ok && res.users) exportCSV('utilisateurs.csv', res.users);
}

/* ============================================================
   MOBILE NAV
   ============================================================ */
function toggleMobileMenu() {
  const nav = document.getElementById('sidebar');
  if (nav) nav.classList.toggle('open');
}
function closeMobileMenu() {
  const nav = document.getElementById('sidebar');
  if (nav) nav.classList.remove('open');
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Auth check
  if (!getToken()) { window.location.href = 'index.html'; return; }

  const user = getUser();
  setText('sidebar-name', (user.prenom || user.first_name || 'Utilisateur'));
  setText('sidebar-role', user.role || user.profil || 'Membre');

  // Bouton Actualiser (header)
  const btnRefresh = document.getElementById('btn-refresh');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      showToast('Actualisation...', 'info');
      loadDashboard();
      loadCampaigns();
      loadOrders();
      loadUsers();
    });
  }

  // Bouton Déconnexion (header)
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', logout);
  }

  // Déconnexion sidebar
  const btnLogoutSide = document.getElementById('btn-logout-sidebar');
  if (btnLogoutSide) {
    btnLogoutSide.addEventListener('click', logout);
  }

  // Navigation
  document.getElementById('nav-dashboard')?.addEventListener('click', () => { showSection('dashboard-section'); closeMobileMenu(); });
  document.getElementById('nav-campaigns')?.addEventListener('click', () => { showSection('campaigns-section'); closeMobileMenu(); loadCampaigns(); });
  document.getElementById('nav-users')?.addEventListener('click', () => { showSection('users-section'); closeMobileMenu(); loadUsers(); });
  document.getElementById('nav-orders')?.addEventListener('click', () => { showSection('orders-section'); closeMobileMenu(); loadOrders(); });
  document.getElementById('nav-profile')?.addEventListener('click', () => { showSection('profile-section'); closeMobileMenu(); loadProfile(); });

  // Mobile nav bottom
  document.getElementById('mob-nav-dashboard')?.addEventListener('click', () => { showSection('dashboard-section'); loadDashboard(); });
  document.getElementById('mob-nav-campaigns')?.addEventListener('click', () => { showSection('campaigns-section'); loadCampaigns(); });
  document.getElementById('mob-nav-profile')?.addEventListener('click', () => { showSection('profile-section'); loadProfile(); });

  // Burger
  document.getElementById('menu-toggle')?.addEventListener('click', toggleMobileMenu);

  // Modals — close on backdrop click
  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', (e) => { if (e.target === m) m.classList.add('hidden'); });
  });

  // Boutons modals
  document.getElementById('btn-new-campaign')?.addEventListener('click', () => openModal('modal-new-campaign'));
  document.getElementById('btn-save-campaign')?.addEventListener('click', createCampaign);
  document.getElementById('btn-save-edit-campaign')?.addEventListener('click', saveEditCampaign);
  document.getElementById('btn-confirm-pay')?.addEventListener('click', confirmPayOrder);
  document.getElementById('btn-save-profile')?.addEventListener('click', saveProfile);

  // CSV
  document.getElementById('csv-campaigns')?.addEventListener('click', exportCampaignsCSV);
  document.getElementById('csv-orders')?.addEventListener('click', exportOrdersCSV);
  document.getElementById('csv-users')?.addEventListener('click', exportUsersCSV);

  // Chargement initial
  loadDashboard();
  loadCampaigns();
  loadOrders();
  loadUsers();
  loadProfile();
});
