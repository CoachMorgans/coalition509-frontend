/* ============================================================
   Coalition 509 SaaS — Frontend v1.5.9-fix
   Routes API corrigées · Nav fonctionnelle · Modals OK
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
function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

/* ---------- API ---------- */
async function apiGet(path) {
  try {
    const res = await fetch(API_URL + path, {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    });
    const json = await res.json();
    console.log('[API GET]', path, json);
    return json;
  } catch (e) {
    console.error('[API GET ERROR]', path, e.message);
    return { ok: false, error: e.message };
  }
}
async function apiPost(path, body) {
  try {
    const res = await fetch(API_URL + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify(body)
    });
    const json = await res.json();
    console.log('[API POST]', path, json);
    return json;
  } catch (e) {
    console.error('[API POST ERROR]', path, e.message);
    return { ok: false, error: e.message };
  }
}
async function apiPut(path, body) {
  try {
    const res = await fetch(API_URL + path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify(body)
    });
    const json = await res.json();
    console.log('[API PUT]', path, json);
    return json;
  } catch (e) {
    console.error('[API PUT ERROR]', path, e.message);
    return { ok: false, error: e.message };
  }
}

/* ---------- NAVIGATION ---------- */
function showSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
  const sec = document.getElementById(id);
  if (sec) sec.classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navMap = {
    'dashboard-section': 'nav-dashboard',
    'campaigns-section': 'nav-campaigns',
    'users-section': 'nav-users',
    'orders-section': 'nav-orders',
    'profile-section': 'nav-profile'
  };
  const navId = navMap[id];
  if (navId) {
    const el = document.getElementById(navId);
    if (el) el.classList.add('active');
  }
  // Mobile nav
  document.querySelectorAll('.mob-nav-item').forEach(n => n.classList.remove('active'));
  const mobMap = {
    'dashboard-section': 'mob-nav-dashboard',
    'campaigns-section': 'mob-nav-campaigns',
    'profile-section': 'mob-nav-profile'
  };
  const mobId = mobMap[id];
  if (mobId) {
    const el = document.getElementById(mobId);
    if (el) el.classList.add('active');
  }
  window.scrollTo(0, 0);
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

/* ---------- SET TEXT ---------- */
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ============================================================
   DASHBOARD — Vue d'ensemble
   ============================================================ */
async function loadDashboard() {
  try {
    const [statsRes, botRes] = await Promise.all([
      apiGet('/api/stats'),
      apiGet('/api/bot/stats').catch(() => ({ ok: false }))
    ]);

    // Stats principales — gère plusieurs formats de réponse
    const stats = statsRes.ok ? (statsRes.stats || statsRes.data || statsRes) : {};
    setText('stat-users', stats.users ?? stats.inscrits_ngd ?? stats.total_users ?? 0);
    setText('stat-campaigns', stats.campaigns ?? stats.total_campaigns ?? 0);
    setText('stat-orders', stats.orders ?? stats.commandes_tcl ?? stats.total_orders ?? 0);
    setText('stat-revenue', fmtFCFA(stats.revenue ?? stats.total_revenue ?? 0));
    setText('stat-groups', stats.active_groups ?? stats.groupes_coalition ?? 0);
    setText('stat-pending', stats.pending_withdrawals ?? stats.retraits_en_attente ?? 0);

    // Stats Bot
    let botData = {};
    if (botRes.ok) {
      botData = botRes.latest ?? botRes.stats ?? botRes.data ?? botRes ?? {};
    }
    setText('bot-conversations', botData.conversations ?? 0);
    setText('bot-active', botData.active ?? botData.messages ?? 0);
    setText('bot-leads', botData.leads ?? 0);
    setText('bot-conversions', botData.conversions ?? 0);
    setText('bot-messages', botData.messages ?? 0);
    setText('week-leads', botData.leads ?? 0);
    setText('week-conversions', botData.conversions ?? 0);
    setText('week-messages', botData.messages ?? 0);
    setText('bot-last-update', botRes.ok ? 'À l'instant' : '—');

    // Graphique
    renderBotChart(botRes.week ?? botRes.history ?? botData.history ?? []);

    // Coalition
    const groups = stats.active_groups ?? stats.groupes_coalition ?? 0;
    setText('coalition-progress', groups + ' / 232 groupes créés');
    const bar = document.getElementById('coalition-bar');
    if (bar) bar.style.width = Math.min((groups / 232) * 100, 100) + '%';

  } catch (e) {
    console.error('Dashboard load error:', e);
    showToast('Erreur chargement dashboard', 'error');
  }
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
      labels.push(d.date ?? d.day ?? '?');
      values.push(d.messages ?? d.count ?? 0);
    });
  } else {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }));
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

    const campaigns = res.campaigns ?? res.data ?? [];
    if (!res.ok || !campaigns.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:#888;">Aucune campagne</td></tr>';
      return;
    }

    campaigns.forEach(c => {
      const tr = document.createElement('tr');
      const cid = c.id ?? c.campaign_id ?? '';
      tr.innerHTML = `
        <td><strong>${escapeHtml(c.name ?? c.nom ?? '—')}</strong></td>
        <td>${escapeHtml(c.type ?? '—')}</td>
        <td>${escapeHtml(c.region ?? '—')}</td>
        <td>${fmtDate(c.date ?? c.created_at)}</td>
        <td><span class="badge ${(c.status ?? c.statut) === 'active' ? 'badge-green' : 'badge-gray'}">${c.status ?? c.statut ?? '—'}</span></td>
        <td>${fmtFCFA(c.price ?? c.budget ?? 0)}</td>
        <td>
          <button class="btn-icon" onclick="openEditCampaign('${cid}')" title="Modifier">✏️</button>
          <button class="btn-icon" onclick="viewCampaign('${cid}')" title="Voir">👁️</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error('Campaigns load error:', e);
    showToast('Erreur chargement campagnes', 'error');
  }
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
    document.getElementById('camp-name').value = '';
    document.getElementById('camp-region').value = '';
    document.getElementById('camp-budget').value = '';
    loadCampaigns();
    loadDashboard();
  } else {
    showToast(res.error ?? 'Erreur création', 'error');
  }
}

async function openEditCampaign(id) {
  try {
    const res = await apiGet('/api/campaigns?id=' + encodeURIComponent(id));
    const c = res.campaign ?? res.campaigns?.[0];
    if (!c) { showToast('Campagne introuvable', 'error'); return; }

    document.getElementById('edit-camp-id').value = c.id ?? c.campaign_id ?? id;
    document.getElementById('edit-camp-name').value = c.name ?? c.nom ?? '';
    document.getElementById('edit-camp-type').value = c.type ?? '';
    document.getElementById('edit-camp-region').value = c.region ?? '';
    document.getElementById('edit-camp-budget').value = c.price ?? c.budget ?? 0;
    document.getElementById('edit-camp-status').value = c.status ?? c.statut ?? 'active';

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
    showToast(res.error ?? 'Erreur mise à jour', 'error');
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

    const orders = res.orders ?? res.data ?? [];
    if (!res.ok || !orders.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:#888;">Aucune commande</td></tr>';
      return;
    }

    orders.forEach(o => {
      const isPaid = (o.payment_status ?? o.statut_paiement) === 'paid' || (o.status ?? o.statut) === 'completed';
      const oid = o.id ?? o.id_commande ?? '';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${escapeHtml(o.ref ?? oid ?? '#CMD-?')}</strong></td>
        <td>${escapeHtml(o.client ?? o.nom_complet ?? '—')}<br><small>${escapeHtml(o.telephone ?? '')}</small></td>
        <td>${fmtFCFA(o.amount ?? o.montant ?? 0)}</td>
        <td>${escapeHtml(o.region ?? '—')}</td>
        <td><span class="badge ${isPaid ? 'badge-green' : 'badge-orange'}">${escapeHtml(o.status ?? o.statut ?? 'pending')}</span></td>
        <td><span class="badge ${isPaid ? 'badge-green' : 'badge-gray'}">${isPaid ? 'Payé' : 'En attente'}</span></td>
        <td>${fmtDate(o.date ?? o.created_at)}</td>
        <td>
          ${isPaid
            ? '<span class="badge badge-green">✓ Payé</span>'
            : `<button class="btn-pay" onclick="payOrder('${oid}')">💳 Payer</button>`}
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error('Orders load error:', e);
  }
}

function payOrder(id) {
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
    showToast(res.error ?? 'Erreur paiement', 'error');
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

    const users = res.users ?? res.data ?? [];
    if (!res.ok || !users.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:#888;">Aucun utilisateur</td></tr>';
      return;
    }

    users.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${escapeHtml(u.prenom ?? u.first_name ?? '—')} ${escapeHtml(u.nom ?? u.last_name ?? '')}</strong></td>
        <td>${escapeHtml(u.telephone ?? u.phone ?? '—')}</td>
        <td>${escapeHtml(u.email ?? '—')}</td>
        <td>${escapeHtml(u.region ?? '—')}</td>
        <td><span class="badge ${u.role === 'admin' ? 'badge-purple' : 'badge-blue'}">${escapeHtml(u.role ?? u.profil ?? 'User')}</span></td>
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
  const name = (user.prenom ?? user.first_name ?? '') + ' ' + (user.nom ?? user.last_name ?? '');
  setText('profile-name', name.trim() || '—');
  setText('profile-role', user.role ?? user.profil ?? 'Utilisateur');
  setText('profile-id', user.id_ngd ?? user.id ?? '—');
  setText('profile-phone', user.telephone ?? user.phone ?? '—');
  setText('profile-email', user.email ?? '—');
  setText('profile-region', user.region ?? '—');
  setText('profile-commune', user.commune ?? '—');

  // Sidebar
  setText('sidebar-name', user.prenom ?? user.first_name ?? 'Utilisateur');
  setText('sidebar-role', user.role ?? user.profil ?? 'Membre');

  // Pré-remplir formulaire
  const p = document.getElementById('edit-prenom');
  if (p) p.value = user.prenom ?? user.first_name ?? '';
  const n = document.getElementById('edit-nom');
  if (n) n.value = user.nom ?? user.last_name ?? '';
  const t = document.getElementById('edit-telephone');
  if (t) t.value = user.telephone ?? user.phone ?? '';
  const e = document.getElementById('edit-email');
  if (e) e.value = user.email ?? '';
  const r = document.getElementById('edit-region');
  if (r) r.value = user.region ?? '';
  const c = document.getElementById('edit-commune');
  if (c) c.value = user.commune ?? '';
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
    showToast(res.error ?? 'Erreur', 'error');
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
    csv.push(headers.map(h => '"' + String(r[h] ?? '').replace(/"/g, '""') + '"').join(';'));
  });
  const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

async function exportCampaignsCSV() {
  const res = await apiGet('/api/campaigns');
  const data = res.campaigns ?? res.data ?? [];
  if (res.ok && data.length) exportCSV('campagnes.csv', data);
  else showToast('Aucune donnée', 'error');
}
async function exportOrdersCSV() {
  const res = await apiGet('/api/orders');
  const data = res.orders ?? res.data ?? [];
  if (res.ok && data.length) exportCSV('commandes.csv', data);
  else showToast('Aucune donnée', 'error');
}
async function exportUsersCSV() {
  const res = await apiGet('/api/users');
  const data = res.users ?? res.data ?? [];
  if (res.ok && data.length) exportCSV('utilisateurs.csv', data);
  else showToast('Aucune donnée', 'error');
}

/* ============================================================
   MOBILE NAV
   ============================================================ */
function toggleMobileMenu() {
  const nav = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (nav) nav.classList.toggle('open');
  if (overlay) overlay.classList.toggle('open');
}
function closeMobileMenu() {
  const nav = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (nav) nav.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Auth check
  if (!getToken()) { window.location.href = 'index.html'; return; }

  // Header buttons
  document.getElementById('btn-refresh')?.addEventListener('click', (e) => {
    e.preventDefault();
    showToast('Actualisation...', 'info');
    loadDashboard();
    loadCampaigns();
    loadOrders();
    loadUsers();
  });

  document.getElementById('btn-logout')?.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });

  document.getElementById('btn-logout-sidebar')?.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });

  // Sidebar nav — preventDefault sur les <a>
  document.getElementById('nav-dashboard')?.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('dashboard-section');
    closeMobileMenu();
    loadDashboard();
  });
  document.getElementById('nav-campaigns')?.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('campaigns-section');
    closeMobileMenu();
    loadCampaigns();
  });
  document.getElementById('nav-users')?.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('users-section');
    closeMobileMenu();
    loadUsers();
  });
  document.getElementById('nav-orders')?.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('orders-section');
    closeMobileMenu();
    loadOrders();
  });
  document.getElementById('nav-profile')?.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('profile-section');
    closeMobileMenu();
    loadProfile();
  });

  // Mobile bottom nav
  document.getElementById('mob-nav-dashboard')?.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('dashboard-section');
    loadDashboard();
  });
  document.getElementById('mob-nav-campaigns')?.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('campaigns-section');
    loadCampaigns();
  });
  document.getElementById('mob-nav-profile')?.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('profile-section');
    loadProfile();
  });

  // Burger
  document.getElementById('menu-toggle')?.addEventListener('click', (e) => {
    e.preventDefault();
    toggleMobileMenu();
  });

  // Modals — close on backdrop
  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', (e) => { if (e.target === m) m.classList.add('hidden'); });
  });

  // Modal buttons
  document.getElementById('btn-new-campaign')?.addEventListener('click', (e) => {
    e.preventDefault();
    openModal('modal-new-campaign');
  });
  document.getElementById('btn-save-campaign')?.addEventListener('click', (e) => {
    e.preventDefault();
    createCampaign();
  });
  document.getElementById('btn-save-edit-campaign')?.addEventListener('click', (e) => {
    e.preventDefault();
    saveEditCampaign();
  });
  document.getElementById('btn-confirm-pay')?.addEventListener('click', (e) => {
    e.preventDefault();
    confirmPayOrder();
  });
  document.getElementById('btn-save-profile')?.addEventListener('click', (e) => {
    e.preventDefault();
    saveProfile();
  });

  // CSV
  document.getElementById('csv-campaigns')?.addEventListener('click', (e) => {
    e.preventDefault();
    exportCampaignsCSV();
  });
  document.getElementById('csv-orders')?.addEventListener('click', (e) => {
    e.preventDefault();
    exportOrdersCSV();
  });
  document.getElementById('csv-users')?.addEventListener('click', (e) => {
    e.preventDefault();
    exportUsersCSV();
  });

  // Chargement initial
  loadDashboard();
  loadCampaigns();
  loadOrders();
  loadUsers();
  loadProfile();
});
