// ============================================================
// portals.js — Role-Specific Dashboard Portals
// Manufacturer | Distributor | Retailer | Customer
// ============================================================

// ─── Portal Router ────────────────────────────────────────
async function renderDashboard() {
  const user = Auth.getUser();
  const role = user?.role || 'Manufacturer';

  if (role === 'Manufacturer') return renderManufacturerPortal();
  if (role === 'Distributor')  return renderDistributorPortal();
  if (role === 'Retailer')     return renderRetailerPortal();
  if (role === 'Customer')     return renderCustomerPortal();
  return renderManufacturerPortal(); // fallback
}

// ─── Shared Stat Card HTML ────────────────────────────────
function portalStatCard(icon, value, label, accent, trend) {
  return `
    <div class="stat-card" style="--accent:${accent}">
      <div class="stat-icon">${icon}</div>
      <div class="stat-info">
        <div class="stat-value">${value}</div>
        <div class="stat-label">${label}</div>
      </div>
      <div class="stat-trend">${trend}</div>
    </div>`;
}

// ─── Portal: MANUFACTURER ─────────────────────────────────
async function renderManufacturerPortal() {
  const [stats, activities, products] = await Promise.all([
    StatsHelper.getStats(),
    ActivityStore.getAll(),
    ProductStore.getAll()
  ]);

  const user = Auth.getUser();
  const main = document.getElementById('main-content');

  main.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">🏭 Manufacturer Portal</h1>
        <p class="page-subtitle">Welcome back, ${user?.name}. Here's your production overview.</p>
      </div>
      <button class="btn btn-primary" onclick="Router.navigate('add-product')">
        <span>＋</span> Register Product
      </button>
    </div>

    <div class="stats-grid">
      ${portalStatCard('📦', stats.totalProducts, 'Total Products', '#6366f1', '↑ Active')}
      ${portalStatCard('🚚', stats.inTransit,     'In Transit',     '#f59e0b', 'Live')}
      ${portalStatCard('✅', stats.delivered,      'Delivered',      '#10b981', 'Completed')}
      ${portalStatCard('⛓️', stats.totalBlocks,   'Blocks Mined',   '#3b82f6', 'On-chain')}
    </div>

    <!-- Network Health Banner -->
    <div class="card" style="display:flex;justify-content:space-between;align-items:center;padding:16px 24px;margin-bottom:24px;background:linear-gradient(135deg,rgba(16,185,129,.1),rgba(16,185,129,.02));border-color:rgba(16,185,129,.2);">
      <div style="display:flex;align-items:center;gap:16px;">
        <div style="font-size:24px;">🌐</div>
        <div>
          <h3 style="margin:0;font-size:16px;">Network Health</h3>
          <p style="margin:0;font-size:13px;color:var(--text-secondary);">ChainTrack Decentralized Ledger is fully operational.</p>
        </div>
      </div>
      <div style="display:flex;gap:24px;">
        <div>
          <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;">Difficulty</div>
          <div style="font-family:monospace;font-size:16px;font-weight:bold;">${window.DIFFICULTY || 3} Zeros</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;">Algorithm</div>
          <div style="font-family:monospace;font-size:16px;font-weight:bold;">SHA-256</div>
        </div>
      </div>
    </div>

    <!-- Main Grid -->
    <div class="dashboard-grid">
      <!-- Blockchain Viz -->
      <div class="card blockchain-viz-card">
        <div class="card-header">
          <h3 class="card-title">⛓️ Live Blockchain</h3>
          <span class="chain-health" id="chain-health-badge">Verifying...</span>
        </div>
        <div class="blockchain-visual" id="blockchain-visual">
          ${await renderBlockchainViz(products)}
        </div>
      </div>

      <!-- Activity Feed -->
      <div class="card activity-card">
        <div class="card-header">
          <h3 class="card-title">📡 Activity Feed</h3>
          <span class="live-dot"><span class="pulse"></span>LIVE</span>
        </div>
        <div class="activity-list">
          ${activities.length === 0 ? '<p class="empty-state">No activity yet</p>' :
            activities.slice(0, 8).map(a => `
              <div class="activity-item" onclick="if('${a.productId}') Router.navigate('detail', {productId:'${a.productId}'})">
                <div class="activity-icon">${a.icon || '📦'}</div>
                <div class="activity-info">
                  <div class="activity-msg">${a.message}</div>
                  <div class="activity-time">${formatDate(a.timestamp)}</div>
                </div>
                <div class="activity-type ${a.type}">${a.type}</div>
              </div>
            `).join('')
          }
        </div>
      </div>

      <!-- Pipeline Chart -->
      <div class="card chart-card" style="display:flex;flex-direction:column;">
        <div class="card-header"><h3 class="card-title">📊 Pipeline Status</h3></div>
        <div style="position:relative;flex:1;min-height:220px;width:100%;padding-bottom:16px;">
          <canvas id="pipeline-chart"></canvas>
        </div>
      </div>

      <!-- Recent Products -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🏷️ Recent Products</h3>
          <button class="btn-link" onclick="Router.navigate('products')">View All →</button>
        </div>
        <div class="recent-products">
          ${products.slice(-4).reverse().map(p => `
            <div class="recent-product-item" onclick="Router.navigate('detail', {productId:'${p.id}'})">
              <div class="product-emoji">${p.imageEmoji || '📦'}</div>
              <div class="product-info-mini">
                <div class="product-name-mini">${p.name}</div>
                <div class="product-id-mini">${p.id}</div>
              </div>
              ${getStatusBadge(p.status)}
            </div>
          `).join('')}
          ${products.length === 0 ? `<div class="empty-state">No products yet. <button class="btn-link" onclick="Router.navigate('add-product')">Add one</button></div>` : ''}
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    if (window.renderPipelineChart) renderPipelineChart(stats);
    if (window.verifyChainHealth) verifyChainHealth(products);
  }, 100);
}

// ─── Portal: DISTRIBUTOR ──────────────────────────────────
async function renderDistributorPortal() {
  const user = Auth.getUser();
  const [products, activities] = await Promise.all([
    ProductStore.getAll(),
    ActivityStore.getAll()
  ]);

  // Products that are in the distributor's hands (in_transit) or ready to pick up
  const myProducts = products.filter(p => p.status === 'in_transit' || p.status === 'manufactured');
  const delivered   = products.filter(p => p.status === 'delivered').length;

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">🚚 Distributor Portal</h1>
        <p class="page-subtitle">Welcome, ${user?.name}. Manage your active shipments.</p>
      </div>
      <button class="btn btn-primary" onclick="Router.navigate('transfer')">
        🔄 Record Transfer
      </button>
    </div>

    <div class="stats-grid">
      ${portalStatCard('📦', products.length,    'Total Products',   '#6366f1', 'Network-wide')}
      ${portalStatCard('🚚', myProducts.length,  'Active Shipments', '#f59e0b', 'Needs action')}
      ${portalStatCard('✅', delivered,           'Delivered',        '#10b981', 'Completed')}
      ${portalStatCard('🗺️', myProducts.length,  'Routes Active',    '#3b82f6', 'Live')}
    </div>

    <div class="dashboard-grid">
      <!-- Active Shipments Card -->
      <div class="card" style="grid-column:1;">
        <div class="card-header">
          <h3 class="card-title">📦 Active Shipments</h3>
          <button class="btn-link" onclick="Router.navigate('map')">View on Map →</button>
        </div>
        <div class="recent-products">
          ${myProducts.length === 0 ? `<div class="empty-state">No active shipments. All products delivered!</div>` :
            myProducts.slice(0, 6).map(p => `
              <div class="recent-product-item" onclick="Router.navigate('detail', {productId:'${p.id}'})">
                <div class="product-emoji">${p.imageEmoji || '📦'}</div>
                <div class="product-info-mini">
                  <div class="product-name-mini">${p.name}</div>
                  <div class="product-id-mini">Owner: ${p.currentOwner}</div>
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
                  ${getStatusBadge(p.status)}
                  <button class="btn btn-ghost" style="font-size:11px;padding:2px 8px;" onclick="event.stopPropagation(); Router.navigate('transfer', {productId:'${p.id}'})">Transfer →</button>
                </div>
              </div>
            `).join('')
          }
        </div>
      </div>

      <!-- Activity Feed -->
      <div class="card activity-card">
        <div class="card-header">
          <h3 class="card-title">📡 Recent Activity</h3>
          <span class="live-dot"><span class="pulse"></span>LIVE</span>
        </div>
        <div class="activity-list">
          ${activities.slice(0, 10).map(a => `
            <div class="activity-item" onclick="if('${a.productId}') Router.navigate('detail', {productId:'${a.productId}'})">
              <div class="activity-icon">${a.icon || '📦'}</div>
              <div class="activity-info">
                <div class="activity-msg">${a.message}</div>
                <div class="activity-time">${formatDate(a.timestamp)}</div>
              </div>
              <div class="activity-type ${a.type}">${a.type}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="card" style="grid-column:1;">
        <div class="card-header"><h3 class="card-title">⚡ Quick Actions</h3></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:8px 0;">
          <button class="btn btn-primary" onclick="Router.navigate('transfer')" style="justify-content:center;padding:14px;">
            🔄 Record Transfer
          </button>
          <button class="btn btn-ghost" onclick="Router.navigate('scan')" style="justify-content:center;padding:14px;">
            📲 Scan QR Code
          </button>
          <button class="btn btn-ghost" onclick="Router.navigate('map')" style="justify-content:center;padding:14px;">
            🗺️ View Route Map
          </button>
          <button class="btn btn-ghost" onclick="Router.navigate('verify')" style="justify-content:center;padding:14px;">
            🔐 Verify Chain
          </button>
        </div>
      </div>
    </div>
  `;
}

// ─── Portal: RETAILER ─────────────────────────────────────
async function renderRetailerPortal() {
  const user = Auth.getUser();
  const [products, activities] = await Promise.all([
    ProductStore.getAll(),
    ActivityStore.getAll()
  ]);

  const atRetailer  = products.filter(p => p.status === 'at_retailer');
  const delivered   = products.filter(p => p.status === 'delivered').length;
  const inTransit   = products.filter(p => p.status === 'in_transit').length;

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">🏪 Retailer Portal</h1>
        <p class="page-subtitle">Welcome, ${user?.name}. Manage your store inventory.</p>
      </div>
      <button class="btn btn-primary" onclick="Router.navigate('scan')">
        📲 Scan Incoming
      </button>
    </div>

    <div class="stats-grid">
      ${portalStatCard('🏪', atRetailer.length, 'At Retailer',     '#6366f1', 'In store')}
      ${portalStatCard('🚚', inTransit,          'Incoming',        '#f59e0b', 'In transit')}
      ${portalStatCard('✅', delivered,           'Delivered',       '#10b981', 'To customers')}
      ${portalStatCard('📦', products.length,    'Total Products',  '#3b82f6', 'Network-wide')}
    </div>

    <div class="dashboard-grid">
      <!-- Inventory Card -->
      <div class="card" style="grid-column:1;">
        <div class="card-header">
          <h3 class="card-title">🏪 Store Inventory</h3>
          <button class="btn-link" onclick="Router.navigate('products')">View All →</button>
        </div>
        <div class="recent-products">
          ${atRetailer.length === 0 ? `<div class="empty-state">No products currently at retailer.</div>` :
            atRetailer.slice(0, 6).map(p => `
              <div class="recent-product-item" onclick="Router.navigate('detail', {productId:'${p.id}'})">
                <div class="product-emoji">${p.imageEmoji || '📦'}</div>
                <div class="product-info-mini">
                  <div class="product-name-mini">${p.name}</div>
                  <div class="product-id-mini">${p.manufacturer}</div>
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
                  ${getStatusBadge(p.status)}
                  <button class="btn btn-ghost" style="font-size:11px;padding:2px 8px;" onclick="event.stopPropagation(); Router.navigate('transfer', {productId:'${p.id}'})">Deliver →</button>
                </div>
              </div>
            `).join('')
          }
        </div>
      </div>

      <!-- Activity Feed -->
      <div class="card activity-card">
        <div class="card-header">
          <h3 class="card-title">📡 Recent Activity</h3>
          <span class="live-dot"><span class="pulse"></span>LIVE</span>
        </div>
        <div class="activity-list">
          ${activities.slice(0, 10).map(a => `
            <div class="activity-item" onclick="if('${a.productId}') Router.navigate('detail', {productId:'${a.productId}'})">
              <div class="activity-icon">${a.icon || '📦'}</div>
              <div class="activity-info">
                <div class="activity-msg">${a.message}</div>
                <div class="activity-time">${formatDate(a.timestamp)}</div>
              </div>
              <div class="activity-type ${a.type}">${a.type}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="card" style="grid-column:1;">
        <div class="card-header"><h3 class="card-title">⚡ Quick Actions</h3></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:8px 0;">
          <button class="btn btn-primary" onclick="Router.navigate('transfer')" style="justify-content:center;padding:14px;">
            ✅ Mark as Delivered
          </button>
          <button class="btn btn-ghost" onclick="Router.navigate('scan')" style="justify-content:center;padding:14px;">
            📲 Scan QR Code
          </button>
          <button class="btn btn-ghost" onclick="Router.navigate('verify')" style="justify-content:center;padding:14px;">
            🔐 Verify Authenticity
          </button>
          <button class="btn btn-ghost" onclick="Router.navigate('explorer')" style="justify-content:center;padding:14px;">
            ⛓️ Block Explorer
          </button>
        </div>
      </div>
    </div>
  `;
}

// ─── Portal: CUSTOMER ─────────────────────────────────────
async function renderCustomerPortal() {
  const user = Auth.getUser();
  const products = await ProductStore.getAll();
  const delivered = products.filter(p => p.status === 'delivered');

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">👤 Customer Portal</h1>
        <p class="page-subtitle">Welcome, ${user?.name}. Track and verify your products.</p>
      </div>
    </div>

    <!-- Hero CTA -->
    <div class="card" style="background:linear-gradient(135deg,#6366f122,#3b82f611);border-color:#6366f133;padding:32px;text-align:center;margin-bottom:24px;">
      <div style="font-size:48px;margin-bottom:16px;">🔍</div>
      <h2 style="margin:0 0 8px;font-size:22px;">Track Your Product</h2>
      <p style="color:var(--text-secondary);margin:0 0 20px;">Scan a QR code or enter a product ID to see its full blockchain-verified journey.</p>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="Router.navigate('scan')" style="padding:12px 24px;">
          📲 Scan QR Code
        </button>
        <button class="btn btn-ghost" onclick="Router.navigate('verify')" style="padding:12px 24px;">
          🔐 Verify Authenticity
        </button>
      </div>
    </div>

    <!-- Info Cards -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:24px;">
      <div class="card" style="padding:20px;text-align:center;">
        <div style="font-size:32px;margin-bottom:8px;">⛓️</div>
        <div style="font-weight:700;font-size:18px;">${products.length} Products</div>
        <div style="color:var(--text-muted);font-size:13px;">Registered on blockchain</div>
      </div>
      <div class="card" style="padding:20px;text-align:center;">
        <div style="font-size:32px;margin-bottom:8px;">✅</div>
        <div style="font-weight:700;font-size:18px;">${delivered.length} Delivered</div>
        <div style="color:var(--text-muted);font-size:13px;">Successfully delivered</div>
      </div>
      <div class="card" style="padding:20px;text-align:center;">
        <div style="font-size:32px;margin-bottom:8px;">🔒</div>
        <div style="font-weight:700;font-size:18px;">SHA-256</div>
        <div style="color:var(--text-muted);font-size:13px;">Cryptographic security</div>
      </div>
    </div>

    <!-- Recently Delivered (visible to customer to verify) -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">✅ Recently Delivered Products</h3>
        <button class="btn-link" onclick="Router.navigate('explorer')">View Ledger →</button>
      </div>
      <div class="recent-products">
        ${delivered.length === 0 ? `<div class="empty-state">No delivered products yet.</div>` :
          delivered.slice(-5).reverse().map(p => `
            <div class="recent-product-item" onclick="Router.navigate('detail', {productId:'${p.id}'})">
              <div class="product-emoji">${p.imageEmoji || '📦'}</div>
              <div class="product-info-mini">
                <div class="product-name-mini">${p.name}</div>
                <div class="product-id-mini">by ${p.manufacturer}</div>
              </div>
              <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px;" onclick="event.stopPropagation(); Router.navigate('verify', {productId:'${p.id}'})">
                🔐 Verify
              </button>
            </div>
          `).join('')
        }
      </div>
    </div>

    <!-- Why Blockchain? -->
    <div class="card" style="margin-top:16px;">
      <div class="card-header"><h3 class="card-title">🛡️ Why Trust This?</h3></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;padding:8px 0;">
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <span style="font-size:24px;">🔗</span>
          <div>
            <div style="font-weight:600;font-size:14px;">Immutable Records</div>
            <div style="color:var(--text-muted);font-size:12px;">Data cannot be changed after it's recorded.</div>
          </div>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <span style="font-size:24px;">🌍</span>
          <div>
            <div style="font-weight:600;font-size:14px;">Full Journey Visible</div>
            <div style="color:var(--text-muted);font-size:12px;">Track your product from factory to you.</div>
          </div>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <span style="font-size:24px;">⛏️</span>
          <div>
            <div style="font-weight:600;font-size:14px;">Proof-of-Work Secured</div>
            <div style="color:var(--text-muted);font-size:12px;">Every block is cryptographically mined.</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

window.renderDashboard = renderDashboard;
window.renderManufacturerPortal = renderManufacturerPortal;
window.renderDistributorPortal  = renderDistributorPortal;
window.renderRetailerPortal     = renderRetailerPortal;
window.renderCustomerPortal     = renderCustomerPortal;
