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

  _navId: 0, // tracks current navigation to cancel stale renders

  async navigate(view, params = {}) {
    const navId = ++this._navId;            // bump ID for this navigation
    AppState.currentView = view;
    if (params.productId) AppState.selectedProductId = params.productId;

    // Update nav highlights immediately
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.view === view);
    });

    // Show skeleton loader instantly — no wait
    const main = document.getElementById('main-content');
    if (main) {
      main.innerHTML = `
        <div class="skeleton-page">
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-subtitle"></div>
          <div class="skeleton-grid">
            <div class="skeleton skeleton-card"></div>
            <div class="skeleton skeleton-card"></div>
            <div class="skeleton skeleton-card"></div>
            <div class="skeleton skeleton-card"></div>
          </div>
          <div class="skeleton skeleton-block"></div>
        </div>`;
    }

    // Close mobile sidebar
    document.getElementById('sidebar')?.classList.remove('open');

    // Await the actual render (Supabase fetch happens here)
    const renderFn = this.routes[view];
    if (renderFn) {
      await renderFn(params);
    }

    // If another navigate() was called while we were awaiting, don't fade in stale content
    if (navId !== this._navId) return;

    // Fade in
    if (main) {
      main.style.opacity = '0';
      main.style.transform = 'translateY(8px)';
      requestAnimationFrame(() => {
        main.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        main.style.opacity = '1';
        main.style.transform = 'translateY(0)';
      });
    }
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
