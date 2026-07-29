// ============================================================
// app.js — Router, State Management, Navigation
// ============================================================

// ─── App State ────────────────────────────────────────────
const AppState = {
  currentView: 'dashboard',
  selectedProductId: null,
  isLoading: false,
  notification: null
};

// ─── Router ───────────────────────────────────────────────
const Router = {
  routes: {
    'dashboard':     (p) => renderDashboard(p),
    'products':      (p) => renderProducts(p),
    'add-product':   (p) => renderAddProduct(p),
    'detail':        (p) => renderDetail(p),
    'transfer':      (p) => renderTransfer(p),
    'scan':          (p) => renderScan(p),
    'verify':        (p) => renderVerify(p),
    'analytics':     (p) => renderAnalytics(p),
    'map':           (p) => renderMap(p),
    'notifications': (p) => renderNotificationsPanel(p)
  },

  navigate(view, params = {}) {
    AppState.currentView = view;
    if (params.productId) AppState.selectedProductId = params.productId;

    // Update nav highlights
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.view === view);
    });

    // Render the view
    const renderFn = this.routes[view];
    if (renderFn) {
      const main = document.getElementById('main-content');
      main.style.opacity = '0';
      main.style.transform = 'translateY(12px)';
      setTimeout(() => {
        renderFn(params);
        main.style.opacity = '1';
        main.style.transform = 'translateY(0)';
      }, 150);
    }

    // Close mobile sidebar
    document.getElementById('sidebar')?.classList.remove('open');
  }
};

// ─── Notification System ──────────────────────────────────
function showNotification(message, type = 'success') {
  const notif = document.getElementById('notification');
  const notifMsg = document.getElementById('notif-message');
  const notifIcon = document.getElementById('notif-icon');
  
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  notifIcon.textContent = icons[type] || '✅';
  notifMsg.textContent = message;
  notif.className = `notification show ${type}`;
  
  setTimeout(() => { notif.className = 'notification'; }, 3500);
}

// ─── Loading Overlay ──────────────────────────────────────
function showLoading(message = 'Mining block...') {
  document.getElementById('loading-overlay').style.display = 'flex';
  document.getElementById('loading-message').textContent = message;
}

function hideLoading() {
  document.getElementById('loading-overlay').style.display = 'none';
}

// ─── Format Helpers ───────────────────────────────────────
function formatDate(iso) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatHash(hash) {
  if (!hash) return '—';
  return hash.substring(0, 8) + '...' + hash.substring(hash.length - 8);
}

function getStatusBadge(status) {
  const map = {
    'manufactured': { label: 'Manufactured', class: 'badge-purple' },
    'in_transit':   { label: 'In Transit',   class: 'badge-amber' },
    'at_retailer':  { label: 'At Retailer',  class: 'badge-blue' },
    'delivered':    { label: 'Delivered',     class: 'badge-green' }
  };
  const s = map[status] || { label: status, class: 'badge-gray' };
  return `<span class="badge ${s.class}">${s.label}</span>`;
}

function getRoleIcon(role) {
  const icons = {
    'Manufacturer': '🏭',
    'Distributor': '🚚',
    'Retailer': '🏪',
    'Customer': '👤'
  };
  return icons[role] || '📦';
}

// ─── Unique ID Generator ──────────────────────────────────
function generateProductId() {
  return 'PROD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
}

// ─── App Init ─────────────────────────────────────────────
async function initApp() {
  await seedDemoData();
  Router.navigate('dashboard');
  setupEventListeners();
}

function setupEventListeners() {
  // Sidebar nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      Router.navigate(item.dataset.view);
    });
  });

  // Mobile menu toggle
  const menuBtn = document.getElementById('menu-toggle');
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });
  }

  // Close sidebar on overlay click
  document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.remove('open');
  });
}

window.Router = Router;
window.AppState = AppState;
window.showNotification = showNotification;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.formatDate = formatDate;
window.formatHash = formatHash;
window.getStatusBadge = getStatusBadge;
window.getRoleIcon = getRoleIcon;
window.generateProductId = generateProductId;
window.initApp = initApp;
