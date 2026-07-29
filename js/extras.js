// ============================================================
// extras.js — Map, PDF Export, Analytics, Notifications, Dark Mode
// ============================================================

// ─── Dark Mode ────────────────────────────────────────────
const DarkMode = {
  key: 'sct_darkmode',
  enabled: false,

  init() {
    this.enabled = localStorage.getItem(this.key) === '1';
    this.apply();
  },

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem(this.key, this.enabled ? '1' : '0');
    this.apply();
    const btn = document.getElementById('darkmode-btn');
    if (btn) btn.textContent = this.enabled ? '☀️' : '🌙';
  },

  apply() {
    document.documentElement.setAttribute('data-theme', this.enabled ? 'dark' : 'light');
    const btn = document.getElementById('darkmode-btn');
    if (btn) btn.textContent = this.enabled ? '☀️' : '🌙';
  }
};

window.DarkMode = DarkMode;

// ─── Notifications Panel ──────────────────────────────────
async function renderNotificationsPanel() {
  const activities = await ActivityStore.getAll();
  const main = document.getElementById('main-content');

  main.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">🔔 Notifications</h1>
        <p class="page-subtitle">${activities.length} recent events</p>
      </div>
      <button class="btn btn-ghost" onclick="clearNotifications()">🗑 Clear All</button>
    </div>

    <div class="notif-panel-grid">
      <div class="card notif-list-card">
        ${activities.length === 0 ? `
          <div class="empty-page">
            <div class="empty-icon">🔔</div>
            <h3>No notifications yet</h3>
            <p>Events will appear here as you use the app</p>
          </div>` :
          activities.map(a => `
            <div class="notif-entry notif-${a.type}" onclick="if('${a.productId}') Router.navigate('detail', {productId:'${a.productId}'})">
              <div class="notif-icon-wrap">${a.icon || '📦'}</div>
              <div class="notif-body">
                <div class="notif-msg">${a.message}</div>
                <div class="notif-time">${formatDate(a.timestamp)}</div>
              </div>
              <div class="notif-badge ${a.type}">${a.type}</div>
            </div>
          `).join('')
        }
      </div>
    </div>
  `;
}

function clearNotifications() {
  ActivityStore.clear();
  showNotification('Notifications cleared', 'info');
  renderNotificationsPanel();
}

window.renderNotificationsPanel = renderNotificationsPanel;
window.clearNotifications = clearNotifications;

// ─── Analytics View ───────────────────────────────────────
async function renderAnalytics() {
  const [products, stats, activities] = await Promise.all([
    ProductStore.getAll(),
    StatsHelper.getStats(),
    ActivityStore.getAll()
  ]);
  const main = document.getElementById('main-content');

  // Category breakdown
  const catMap = {};
  products.forEach(p => { catMap[p.category] = (catMap[p.category] || 0) + 1; });

  // Transfer timeline (last 7 days)
  const days = [];
  const counts = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
    days.push(label);
    const dayStr = d.toDateString();
    counts.push(activities.filter(a => new Date(a.timestamp).toDateString() === dayStr).length);
  }

  main.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">📈 Analytics</h1>
        <p class="page-subtitle">Supply chain performance overview</p>
      </div>
    </div>

    <div class="analytics-grid">
      <!-- Bar Chart - Activity Timeline -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📅 Activity (Last 7 Days)</h3>
        </div>
        <div class="chart-wrapper">
          <canvas id="activity-bar-chart"></canvas>
        </div>
      </div>

      <!-- Doughnut - Categories -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🏷️ Product Categories</h3>
        </div>
        <div class="chart-wrapper">
          <canvas id="category-chart"></canvas>
        </div>
      </div>

      <!-- Status Distribution -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🚦 Status Distribution</h3>
        </div>
        <div class="chart-wrapper">
          <canvas id="status-chart"></canvas>
        </div>
      </div>

      <!-- Stats Summary -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📊 Summary</h3>
        </div>
        <div class="analytics-summary">
          <div class="summary-row"><span>Total Products</span><strong>${stats.totalProducts}</strong></div>
          <div class="summary-row"><span>Total Transfers</span><strong>${stats.totalTransfers}</strong></div>
          <div class="summary-row"><span>Delivered</span><strong style="color:var(--accent-green)">${stats.delivered}</strong></div>
          <div class="summary-row"><span>In Transit</span><strong style="color:var(--accent-amber)">${stats.inTransit}</strong></div>
          <div class="summary-row"><span>Manufactured</span><strong style="color:var(--accent-purple)">${stats.manufactured}</strong></div>
          <div class="summary-row"><span>Avg Chain Length</span><strong>${stats.totalProducts > 0 ? ((stats.totalTransfers + stats.totalProducts) / stats.totalProducts).toFixed(1) : 0} blocks</strong></div>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    const chartDefaults = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#475569', font: { family: 'Inter', size: 12 }, usePointStyle: true } } }
    };

    // Activity bar chart
    new Chart(document.getElementById('activity-bar-chart'), {
      type: 'bar',
      data: {
        labels: days,
        datasets: [{ label: 'Events', data: counts, backgroundColor: 'rgba(99,102,241,0.7)', borderRadius: 6, borderSkipped: false }]
      },
      options: { ...chartDefaults, scales: { y: { beginAtZero: true, ticks: { stepSize: 1, color: '#94a3b8' }, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { ticks: { color: '#94a3b8' }, grid: { display: false } } } }
    });

    // Category doughnut
    const catLabels = Object.keys(catMap);
    const catData = Object.values(catMap);
    const catColors = ['#6366f1','#f59e0b','#10b981','#3b82f6','#ef4444','#8b5cf6','#06b6d4'];
    new Chart(document.getElementById('category-chart'), {
      type: 'doughnut',
      data: { labels: catLabels.length ? catLabels : ['No data'], datasets: [{ data: catData.length ? catData : [1], backgroundColor: catColors, borderWidth: 0, hoverOffset: 8 }] },
      options: { ...chartDefaults, plugins: { ...chartDefaults.plugins } }
    });

    // Status bar chart
    new Chart(document.getElementById('status-chart'), {
      type: 'bar',
      data: {
        labels: ['Manufactured', 'In Transit', 'At Retailer', 'Delivered'],
        datasets: [{ label: 'Products', data: [stats.manufactured, stats.inTransit, Math.max(0, stats.totalProducts - stats.manufactured - stats.inTransit - stats.delivered), stats.delivered], backgroundColor: ['#6366f1','#f59e0b','#10b981','#3b82f6'], borderRadius: 6, borderSkipped: false }]
      },
      options: { ...chartDefaults, scales: { y: { beginAtZero: true, ticks: { stepSize: 1, color: '#94a3b8' }, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { ticks: { color: '#94a3b8' }, grid: { display: false } } } }
    });
  }, 100);
}

window.renderAnalytics = renderAnalytics;

// ─── Map View ─────────────────────────────────────────────
async function renderMap(params) {
  const productId = params?.productId || AppState.selectedProductId;
  const products = await ProductStore.getAll();
  const main = document.getElementById('main-content');

  main.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">🗺️ Route Map</h1>
        <p class="page-subtitle">Global supply chain visualisation</p>
      </div>
      <select class="form-input" id="map-product-select" style="width:260px" onchange="switchMapProduct(this.value)">
        <option value="">— All products —</option>
        ${products.map(p => `<option value="${p.id}" ${p.id === productId ? 'selected' : ''}>${p.imageEmoji} ${p.name}</option>`).join('')}
      </select>
    </div>

    <div class="card map-card">
      <div class="map-container-wrap">
        <div id="leaflet-map"></div>
      </div>
    </div>

    <div class="card map-legend-card" id="map-legend-card">
      <div class="card-header"><h3 class="card-title">📍 Location History</h3></div>
      <div id="map-location-list"></div>
    </div>
  `;

  // Load Leaflet dynamically
  if (!window.L) {
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(cssLink);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => initMap(productId);
    document.head.appendChild(script);
  } else {
    // Small delay so DOM is ready after innerHTML swap
    setTimeout(() => initMap(productId), 50);
  }
}

async function initMap(productId) {
  const L = window.L;
  if (!L) return;

  // Destroy old map instance completely
  if (window._leafletMap) {
    window._leafletMap.off();
    window._leafletMap.remove();
    window._leafletMap = null;
  }

  const mapEl = document.getElementById('leaflet-map');
  if (!mapEl) return;
  // Clear any stale leaflet instance flag
  mapEl._leaflet_id = null;

  const map = L.map('leaflet-map', {
    zoomControl: true,
    preferCanvas: true,
    maxBounds: [[-90, -180], [90, 180]],
    maxBoundsViscosity: 1.0
  }).setView([20, 78], 3);
  window._leafletMap = map;

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18,
    noWrap: true
  }).addTo(map);

  const products = productId ? [await ProductStore.getById(productId)].filter(Boolean) : await ProductStore.getAll();
  const allPoints = [];
  const locationList = [];

  const roleColors = { 'Manufacturer': '#6366f1', 'Distributor': '#f59e0b', 'Retailer': '#10b981', 'Customer': '#3b82f6' };

  for (const product of products) {
    const chain = await ChainStore.getChain(product.id);
    if (!chain) continue;

    const points = [];
    chain.chain.forEach((block, i) => {
      const loc = block.data.location;
      if (!loc || (loc.lat === 0 && loc.lng === 0)) return;
      points.push([loc.lat, loc.lng]);
      allPoints.push([loc.lat, loc.lng]);

      // Custom marker
      const color = roleColors[block.data.role] || '#6366f1';
      const marker = L.circleMarker([loc.lat, loc.lng], {
        radius: 10,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:160px">
          <div style="font-weight:700;font-size:14px;margin-bottom:6px">${product.imageEmoji} ${product.name}</div>
          <div style="font-size:12px;color:#475569"><b>Block #${block.index}</b> — ${block.data.role}</div>
          <div style="font-size:12px;color:#6366f1;margin-top:4px">📍 ${loc.city}, ${loc.country}</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:2px">${formatDate(block.timestamp)}</div>
        </div>
      `);

      locationList.push({ product, block, loc, color });
    });

    // Draw route line
    if (points.length > 1) {
      L.polyline(points, { color: '#6366f1', weight: 2.5, opacity: 0.6, dashArray: '6,4' }).addTo(map);
    }
  }

  // Fit map to markers
  if (allPoints.length > 0) {
    map.fitBounds(allPoints, { padding: [40, 40] });
  }

  // Render location list
  const listEl = document.getElementById('map-location-list');
  if (listEl) {
    if (locationList.length === 0) {
      listEl.innerHTML = '<p class="empty-state">No GPS coordinates recorded. Products with 0,0 coordinates are excluded.</p>';
    } else {
      listEl.innerHTML = `<div class="location-list">
        ${locationList.map(({ product, block, loc, color }) => `
          <div class="location-list-item">
            <div class="loc-dot" style="background:${color}"></div>
            <div class="loc-info">
              <span class="loc-product">${product.imageEmoji} ${product.name}</span>
              <span class="loc-role">${block.data.role}</span>
            </div>
            <div class="loc-place">📍 ${loc.city}, ${loc.country}</div>
            <div class="loc-time">${formatDate(block.timestamp)}</div>
          </div>
        `).join('')}
      </div>`;
    }
  }
}

function switchMapProduct(productId) {
  AppState.selectedProductId = productId || null;
  renderMap({ productId });
}

window.renderMap = renderMap;
window.initMap = initMap;
window.switchMapProduct = switchMapProduct;

// ─── PDF Export ───────────────────────────────────────────
async function exportProductPDF(productId) {
  const product = await ProductStore.getById(productId || AppState.selectedProductId);
  if (!product) { showNotification('Select a product first', 'warning'); return; }

  const chain = await ChainStore.getChain(product.id);
  const blocks = chain ? chain.chain : [];

  // Verify authenticity
  let authentic = true;
  for (let i = 1; i < blocks.length; i++) {
    if (blocks[i].previousHash !== blocks[i-1].hash) { authentic = false; break; }
  }

  // Build printable HTML
  const printWin = window.open('', '_blank', 'width=800,height=900');
  if (!printWin) { showNotification('Please allow popups to export PDF', 'warning'); return; }

  const roleColors = { 'Manufacturer': '#6366f1', 'Distributor': '#f59e0b', 'Retailer': '#10b981', 'Customer': '#3b82f6' };

  printWin.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Chain Report — ${product.name}</title>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: #fff; color: #0f172a; font-size: 13px; padding: 48px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; padding-bottom: 24px; border-bottom: 2px solid #e2e8f0; }
    .logo { display: flex; align-items: center; gap: 10px; }
    .logo-icon { width: 44px; height: 44px; background: linear-gradient(135deg, #6366f1, #818cf8); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 22px; }
    .logo-title { font-size: 20px; font-weight: 800; color: #0f172a; }
    .logo-sub { font-size: 12px; color: #94a3b8; }
    .report-meta { text-align: right; }
    .report-meta h2 { font-size: 14px; color: #6366f1; font-weight: 600; }
    .report-meta p { font-size: 12px; color: #94a3b8; margin-top: 2px; }
    .product-hero { background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(99,102,241,0.03)); border: 1px solid rgba(99,102,241,0.2); border-radius: 16px; padding: 24px; margin-bottom: 28px; display: flex; gap: 20px; align-items: center; }
    .product-emoji { font-size: 56px; }
    .product-details h1 { font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
    .product-details p { font-size: 13px; color: #475569; margin-top: 4px; }
    .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 12px; }
    .meta-item { background: white; border-radius: 8px; padding: 10px 12px; border: 1px solid #e2e8f0; }
    .meta-label { font-size: 10px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
    .meta-value { font-size: 13px; font-weight: 600; color: #0f172a; margin-top: 2px; }
    .auth-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 700; margin-bottom: 24px; }
    .auth-badge.ok { background: rgba(16,185,129,0.12); color: #059669; border: 1px solid rgba(16,185,129,0.3); }
    .auth-badge.fail { background: rgba(239,68,68,0.12); color: #dc2626; border: 1px solid rgba(239,68,68,0.3); }
    .section-title { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
    .timeline { display: flex; flex-direction: column; gap: 0; margin-bottom: 32px; }
    .timeline-item { display: flex; gap: 16px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 10px; }
    .timeline-dot { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
    .timeline-content { flex: 1; }
    .timeline-role { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .timeline-action { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 6px; }
    .timeline-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; font-size: 12px; color: #475569; margin-bottom: 8px; }
    .hash-section { background: #f8fafc; border-radius: 8px; padding: 10px; }
    .hash-row { display: flex; gap: 8px; align-items: center; margin-bottom: 4px; font-size: 10px; }
    .hash-label { font-weight: 700; color: #94a3b8; width: 28px; flex-shrink: 0; }
    .hash-val { font-family: 'JetBrains Mono', monospace; color: #6366f1; word-break: break-all; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      <div class="logo-icon">⛓️</div>
      <div>
        <div class="logo-title">ChainTrack</div>
        <div class="logo-sub">Blockchain Supply Chain Report</div>
      </div>
    </div>
    <div class="report-meta">
      <h2>Blockchain Certificate</h2>
      <p>Generated: ${formatDate(new Date().toISOString())}</p>
      <p>Blocks: ${blocks.length} | Transfers: ${blocks.length - 1}</p>
    </div>
  </div>

  <div class="product-hero">
    <div class="product-emoji">${product.imageEmoji}</div>
    <div class="product-details">
      <div style="font-size:11px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">${product.category}</div>
      <h1>${product.name}</h1>
      <p>${product.description || 'No description provided'}</p>
      <div class="meta-grid">
        <div class="meta-item"><div class="meta-label">Product ID</div><div class="meta-value" style="font-family:monospace;font-size:11px">${product.id}</div></div>
        <div class="meta-item"><div class="meta-label">SKU</div><div class="meta-value">${product.sku}</div></div>
        <div class="meta-item"><div class="meta-label">Manufacturer</div><div class="meta-value">${product.manufacturer}</div></div>
        <div class="meta-item"><div class="meta-label">Origin</div><div class="meta-value">${product.manufacturerLocation?.city}, ${product.manufacturerLocation?.country}</div></div>
        <div class="meta-item"><div class="meta-label">Current Owner</div><div class="meta-value">${product.currentOwner}</div></div>
        <div class="meta-item"><div class="meta-label">Status</div><div class="meta-value">${product.status.replace('_',' ').toUpperCase()}</div></div>
      </div>
    </div>
  </div>

  <div class="auth-badge ${authentic ? 'ok' : 'fail'}">
    ${authentic ? '✅ AUTHENTIC — Chain Integrity Verified' : '⚠️ WARNING — Chain Integrity Failed'}
  </div>

  <div class="section-title">⛓️ Blockchain History (${blocks.length} Blocks)</div>
  <div class="timeline">
    ${blocks.map(block => {
      const color = roleColors[block.data.role] || '#6366f1';
      const roleIcons = { 'Manufacturer': '🏭', 'Distributor': '🚚', 'Retailer': '🏪', 'Customer': '👤' };
      return `
      <div class="timeline-item">
        <div class="timeline-dot" style="background:${color}22;border:2px solid ${color}">
          ${roleIcons[block.data.role] || '📦'}
        </div>
        <div class="timeline-content">
          <div class="timeline-role" style="color:${color}">${block.data.role} — Block #${block.index}</div>
          <div class="timeline-action">${block.data.action || block.data.type}</div>
          <div class="timeline-grid">
            <span>👤 Actor: ${block.data.actor || '—'}</span>
            <span>📍 ${block.data.location?.city || '—'}, ${block.data.location?.country || ''}</span>
            <span>🕐 ${formatDate(block.timestamp)}</span>
            <span>🔧 Nonce: ${block.nonce || '—'}</span>
            ${block.data.condition ? `<span>🌡️ Condition: ${block.data.condition}</span>` : ''}
            ${block.data.notes ? `<span>📝 ${block.data.notes}</span>` : ''}
          </div>
          <div class="hash-section">
            <div class="hash-row"><span class="hash-label">Hash</span><span class="hash-val">${block.hash}</span></div>
            <div class="hash-row"><span class="hash-label">Prev</span><span class="hash-val" style="color:#94a3b8">${block.previousHash}</span></div>
          </div>
        </div>
      </div>`;
    }).join('')}
  </div>

  <div class="footer">
    <span>ChainTrack Blockchain Supply Chain Tracker</span>
    <span>Document ID: ${product.id}-${Date.now()}</span>
  </div>

  <script>setTimeout(() => window.print(), 500);<\/script>
</body>
</html>`);
  printWin.document.close();
  showNotification('📄 PDF report opened — use browser Print → Save as PDF', 'success');
}

window.exportProductPDF = exportProductPDF;

// ─── Role-based Login ─────────────────────────────────────
const Auth = {
  key: 'sct_auth_user',

  getUser() {
    const u = localStorage.getItem(this.key);
    return u ? JSON.parse(u) : null;
  },

  login(role, name) {
    const user = { role, name, loginTime: new Date().toISOString() };
    localStorage.setItem(this.key, JSON.stringify(user));
    return user;
  },

  logout() {
    localStorage.removeItem(this.key);
    showLoginScreen();
  }
};

window.Auth = Auth;

function showLoginScreen() {
  document.getElementById('login-overlay').style.display = 'flex';
  document.getElementById('app-shell-wrapper').style.display = 'none';
}

function hideLoginScreen(user) {
  document.getElementById('login-overlay').style.display = 'none';
  document.getElementById('app-shell-wrapper').style.display = 'flex';

  // Update avatar
  const avatar = document.getElementById('user-avatar-btn');
  if (avatar) {
    avatar.textContent = user.name.charAt(0).toUpperCase();
    avatar.title = `${user.name} (${user.role})`;
  }

  // Update user info in sidebar
  const userInfo = document.getElementById('sidebar-user-info');
  if (userInfo) {
    userInfo.innerHTML = `
      <div class="sidebar-user">
        <div class="sidebar-user-avatar">${user.name.charAt(0).toUpperCase()}</div>
        <div>
          <div class="sidebar-user-name">${user.name}</div>
          <div class="sidebar-user-role">${user.role}</div>
        </div>
      </div>
    `;
  }
}

function handleLogin(event) {
  event.preventDefault();
  const role = document.getElementById('login-role').value;
  const name = document.getElementById('login-name').value.trim();
  if (!name) { document.getElementById('login-name').focus(); return; }

  const user = Auth.login(role, name);
  hideLoginScreen(user);
  ActivityStore.add({ type: 'registered', message: `${name} logged in as ${role}`, icon: '👤', productId: '' });
  showNotification(`Welcome, ${name}! Logged in as ${role}`, 'success');
}

window.handleLogin = handleLogin;

function checkAuth() {
  const user = Auth.getUser();
  if (!user) {
    showLoginScreen();
  } else {
    hideLoginScreen(user);
  }
}

window.checkAuth = checkAuth;

// ─── Geocoding Helper ────────────────────────────────────
async function geocodeLocation(city, country) {
  if (!city && !country) return { lat: 0, lng: 0 };
  
  try {
    const q = encodeURIComponent(`${city ? city + ',' : ''} ${country}`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ChainTrackDemo/1.0'
      }
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
    }
  } catch (err) {
    console.warn("Geocoding failed, falling back to 0,0", err);
  }
  
  // Fallback to 0,0 if not found or errored
  return { lat: 0, lng: 0 };
}

window.geocodeLocation = geocodeLocation;
