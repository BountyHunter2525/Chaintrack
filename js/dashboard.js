// ============================================================
// dashboard.js — Dashboard View
// ============================================================

async function renderDashboard() {
  const [stats, activities, products] = await Promise.all([
    StatsHelper.getStats(),
    ActivityStore.getAll(),
    ProductStore.getAll()
  ]);

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Real-time supply chain overview</p>
      </div>
      <button class="btn btn-primary" onclick="Router.navigate('add-product')">
        <span>＋</span> Register Product
      </button>
    </div>

    <!-- Stats Grid -->
    <div class="stats-grid">
      <div class="stat-card" style="--accent: #6366f1">
        <div class="stat-icon">📦</div>
        <div class="stat-info">
          <div class="stat-value">${stats.totalProducts}</div>
          <div class="stat-label">Total Products</div>
        </div>
        <div class="stat-trend">↑ Active</div>
      </div>
      <div class="stat-card" style="--accent: #f59e0b">
        <div class="stat-icon">🚚</div>
        <div class="stat-info">
          <div class="stat-value">${stats.inTransit}</div>
          <div class="stat-label">In Transit</div>
        </div>
        <div class="stat-trend">Live</div>
      </div>
      <div class="stat-card" style="--accent: #10b981">
        <div class="stat-icon">✅</div>
        <div class="stat-info">
          <div class="stat-value">${stats.delivered}</div>
          <div class="stat-label">Delivered</div>
        </div>
        <div class="stat-trend">Completed</div>
      </div>
      <div class="stat-card" style="--accent: #3b82f6">
        <div class="stat-icon">⛓️</div>
        <div class="stat-info">
          <div class="stat-value">${stats.totalBlocks}</div>
          <div class="stat-label">Blocks Mined</div>
        </div>
        <div class="stat-trend">On-chain</div>
      </div>
    </div>

    <!-- Network Health Banner -->
    <div class="network-health-banner card" style="display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; margin-bottom: 24px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.02)); border-color: rgba(16, 185, 129, 0.2);">
      <div style="display: flex; align-items: center; gap: 16px;">
        <div style="font-size: 24px;">🌐</div>
        <div>
          <h3 style="margin: 0; font-size: 16px; color: var(--text-primary);">Network Health</h3>
          <p style="margin: 0; font-size: 13px; color: var(--text-secondary);">ChainTrack Decentralized Ledger is fully operational.</p>
        </div>
      </div>
      <div style="display: flex; gap: 24px;">
        <div>
          <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Current Difficulty</div>
          <div style="font-family: monospace; font-size: 16px; color: var(--text-primary); font-weight: bold;">${window.DIFFICULTY || 3}</div>
        </div>
        <div>
          <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Algorithm</div>
          <div style="font-family: monospace; font-size: 16px; color: var(--text-primary); font-weight: bold;">SHA-256</div>
        </div>
      </div>
    </div>

    <!-- Main Grid -->
    <div class="dashboard-grid">
      <!-- Blockchain Visualization -->
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
        <div class="activity-list" id="activity-list">
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

      <!-- Product Journey Chart -->
      <div class="card chart-card" style="display:flex; flex-direction:column;">
        <div class="card-header">
          <h3 class="card-title">📊 Pipeline Status</h3>
        </div>
        <div style="position:relative; flex:1; min-height:220px; width:100%; padding-bottom:16px;">
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

  // Render chart
  setTimeout(() => {
    renderPipelineChart(stats);
    verifyChainHealth(products);
  }, 100);
}

async function renderBlockchainViz(products) {
  if (products.length === 0) {
    return '<div class="empty-chain">No blocks yet. Register a product to start.</div>';
  }

  // Show last 3 products' latest blocks in a chain
  const recentProducts = products.slice(-3);
  const chains = await Promise.all(recentProducts.map(p => ChainStore.getChain(p.id)));
  let html = '<div class="chain-blocks">';
  
  recentProducts.forEach((p, i) => {
    const chain = chains[i];
    const blockCount = chain ? chain.chain.length : 1;
    const lastBlock = chain ? chain.getLatestBlock() : null;
    
    html += `
      <div class="chain-block" onclick="Router.navigate('detail', {productId:'${p.id}'})" title="${p.name}">
        <div class="block-index">#${lastBlock ? lastBlock.index : 0}</div>
        <div class="block-emoji">${p.imageEmoji || '📦'}</div>
        <div class="block-name">${p.name.substring(0, 15)}${p.name.length > 15 ? '…' : ''}</div>
        <div class="block-hash">${lastBlock ? formatHash(lastBlock.hash) : '—'}</div>
        <div class="block-count">${blockCount} block${blockCount !== 1 ? 's' : ''}</div>
      </div>
      ${i < recentProducts.length - 1 ? '<div class="chain-arrow"><div class="arrow-line"></div><div class="arrow-head">→</div></div>' : ''}
    `;
  });

  html += '</div>';
  return html;
}

function renderPipelineChart(stats) {
  const ctx = document.getElementById('pipeline-chart');
  if (!ctx) return;

  if (window.pipelineChartInstance) {
    window.pipelineChartInstance.destroy();
  }

  window.pipelineChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Manufactured', 'In Transit', 'At Retailer', 'Delivered'],
      datasets: [{
        data: [stats.manufactured, stats.inTransit,
               stats.totalProducts - stats.manufactured - stats.inTransit - stats.delivered,
               stats.delivered],
        backgroundColor: ['#6366f1', '#f59e0b', '#10b981', '#3b82f6'],
        borderWidth: 0,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#64748b',
            font: { family: 'Inter', size: 12 },
            padding: 16,
            usePointStyle: true
          }
        }
      },
      animation: { animateScale: true, animateRotate: true }
    }
  });
}

async function verifyChainHealth(products) {
  const badge = document.getElementById('chain-health-badge');
  if (!badge) return;

  let allValid = true;
  for (const p of products) {
    const chain = await ChainStore.getChain(p.id);
    if (chain && chain.chain.length > 1) {
      // Quick linkage check (skip full hash recompute for demo)
      for (let i = 1; i < chain.chain.length; i++) {
        if (chain.chain[i].previousHash !== chain.chain[i-1].hash) {
          allValid = false;
          break;
        }
      }
    }
  }

  badge.textContent = allValid ? '✅ Healthy' : '⚠️ Check Required';
  badge.className = `chain-health ${allValid ? 'healthy' : 'warning'}`;
}

window.renderDashboard = renderDashboard;
