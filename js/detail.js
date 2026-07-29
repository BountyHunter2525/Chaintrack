// ============================================================
// detail.js — Product Detail, QR Code, Authenticity, History
// ============================================================

async function renderDetail(params) {
  const productId = params?.productId || AppState.selectedProductId;
  if (!productId) { Router.navigate('products'); return; }

  const product = ProductStore.getById(productId);
  if (!product) {
    showNotification('Product not found', 'error');
    Router.navigate('products');
    return;
  }

  const chain = ChainStore.getChain(productId);
  const blocks = chain ? chain.chain : [];
  const currentRoleIdx = getRoleIndex(product.currentRole);
  const nextRole = getNextRole(product.currentRole);

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${product.imageEmoji} ${product.name}</h1>
        <p class="page-subtitle">${product.id} • ${product.category}</p>
      </div>
      <div class="header-actions">
        ${nextRole ? `<button class="btn btn-primary" onclick="Router.navigate('transfer', {productId:'${product.id}'})">
          🔄 Transfer to ${nextRole.role}
        </button>` : `<span class="badge badge-green">✅ Fully Delivered</span>`}
        <button class="btn btn-pdf" onclick="exportProductPDF('${product.id}')">📄 Export PDF</button>
        <button class="btn btn-ghost" onclick="Router.navigate('products')">← Back</button>
      </div>
    </div>

    <div class="detail-grid">
      <!-- Left Column -->
      <div class="detail-left">
        <!-- QR Code Card -->
        <div class="card qr-card">
          <div class="card-header">
            <h3 class="card-title">📲 QR Code</h3>
            <button class="btn-link" onclick="downloadQR()">⬇ Download</button>
          </div>
          <div class="qr-container">
            <div id="qr-code"></div>
            <div class="qr-label">${product.id}</div>
          </div>
          <p class="qr-hint">Scan to verify authenticity</p>
        </div>

        <!-- Authenticity Card -->
        <div class="card authenticity-card" id="authenticity-card">
          <div class="card-header">
            <h3 class="card-title">🔐 Authenticity</h3>
          </div>
          <div class="auth-loading" id="auth-status">
            <div class="spinner"></div>
            <span>Verifying chain...</span>
          </div>
        </div>

        <!-- Product Info -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">ℹ️ Product Info</h3>
          </div>
          <div class="info-rows">
            <div class="info-row"><span>Manufacturer</span><strong>${product.manufacturer}</strong></div>
            <div class="info-row"><span>Origin</span><strong>${product.manufacturerLocation?.city}, ${product.manufacturerLocation?.country}</strong></div>
            <div class="info-row"><span>SKU</span><strong>${product.sku}</strong></div>
            <div class="info-row"><span>Category</span><strong>${product.category}</strong></div>
            <div class="info-row"><span>Registered</span><strong>${formatDate(product.createdAt)}</strong></div>
            <div class="info-row"><span>Current Owner</span><strong>${product.currentOwner}</strong></div>
            <div class="info-row"><span>Status</span>${getStatusBadge(product.status)}</div>
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div class="detail-right">
        <!-- Journey Map -->
        <div class="card journey-card">
          <div class="card-header">
            <h3 class="card-title">🗺️ Supply Chain Journey</h3>
          </div>
          <div class="journey-map">
            ${SUPPLY_CHAIN_ROLES.map((role, i) => {
              const isDone = currentRoleIdx >= i;
              const isCurrent = currentRoleIdx === i;
              const block = blocks[i];
              return `
                <div class="journey-node ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}">
                  <div class="journey-node-icon" style="${isDone ? `background: ${role.color}22; border-color: ${role.color}` : ''}">
                    <span>${role.icon}</span>
                    ${isCurrent ? '<div class="current-pulse"></div>' : ''}
                  </div>
                  <div class="journey-node-info">
                    <div class="journey-role">${role.role}</div>
                    ${block ? `
                      <div class="journey-actor">${block.data.actor || '—'}</div>
                      <div class="journey-time">${formatDate(block.timestamp)}</div>
                      <div class="journey-location">📍 ${block.data.location?.city || '—'}, ${block.data.location?.country || ''}</div>
                    ` : '<div class="journey-pending">Pending</div>'}
                  </div>
                  ${isDone && !isCurrent ? '<div class="journey-check">✓</div>' : ''}
                </div>
                ${i < SUPPLY_CHAIN_ROLES.length - 1 ? `
                  <div class="journey-connector ${currentRoleIdx > i ? 'done' : ''}">
                    <div class="connector-line"></div>
                    <div class="connector-arrow">↓</div>
                  </div>
                ` : ''}
              `;
            }).join('')}
          </div>
        </div>

        <!-- Blockchain History -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">⛓️ Block History</h3>
            <span class="block-count-badge">${blocks.length} block${blocks.length !== 1 ? 's' : ''}</span>
          </div>
          <div class="block-timeline">
            ${blocks.slice().reverse().map((block, i) => `
              <div class="block-entry ${i === 0 ? 'latest' : ''}">
                <div class="block-header-row">
                  <div class="block-num-badge">Block #${block.index}</div>
                  <div class="block-role-badge">${getRoleIcon(block.data.role)} ${block.data.role}</div>
                  ${i === 0 ? '<div class="latest-badge">Latest</div>' : ''}
                </div>
                <div class="block-action">${block.data.action || block.data.type}</div>
                <div class="block-details-grid">
                  <div class="block-detail"><span>Actor</span>${block.data.actor || '—'}</div>
                  <div class="block-detail"><span>Location</span>${block.data.location?.city || '—'}, ${block.data.location?.country || ''}</div>
                  <div class="block-detail"><span>Time</span>${formatDate(block.timestamp)}</div>
                  <div class="block-detail"><span>Nonce</span>${block.nonce || '—'}</div>
                </div>
                <div class="block-hashes">
                  <div class="hash-row"><span class="hash-label">Hash</span><code class="hash-value">${block.hash}</code></div>
                  <div class="hash-row"><span class="hash-label">Prev</span><code class="hash-value muted">${block.previousHash}</code></div>
                </div>
                ${block.data.notes ? `<div class="block-notes">${block.data.notes}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  // Generate QR Code
  setTimeout(() => {
    generateQRCode(product.id, product.name);
    verifyAuthenticity(product.id, chain);
  }, 200);
}

function generateQRCode(productId, productName) {
  const container = document.getElementById('qr-code');
  if (!container || typeof QRCode === 'undefined') return;

  container.innerHTML = '';
  new QRCode(container, {
    text: `${window.location.href.split('#')[0]}#product:${productId}`,
    width: 180,
    height: 180,
    colorDark: '#1e293b',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M
  });
}

async function verifyAuthenticity(productId, chain) {
  const statusEl = document.getElementById('auth-status');
  if (!statusEl) return;

  if (!chain || chain.chain.length === 0) {
    statusEl.innerHTML = `<div class="auth-result tampered">⚠️ No chain data found</div>`;
    return;
  }

  // Check hash linkage
  let valid = true;
  for (let i = 1; i < chain.chain.length; i++) {
    if (chain.chain[i].previousHash !== chain.chain[i-1].hash) {
      valid = false;
      break;
    }
  }

  const product = ProductStore.getById(productId);
  const blockCount = chain.chain.length;

  statusEl.innerHTML = valid ? `
    <div class="auth-result authentic">
      <div class="auth-seal">
        <div class="seal-ring">
          <span class="seal-check">✓</span>
        </div>
      </div>
      <div class="auth-details">
        <div class="auth-title">Authentic Product</div>
        <div class="auth-subtitle">Chain integrity verified</div>
        <div class="auth-stats">
          <span>⛓️ ${blockCount} blocks</span>
          <span>🔐 SHA-256</span>
        </div>
        <div class="auth-fingerprint">
          <span class="fp-label">Fingerprint:</span>
          <code>${chain.getLatestBlock().hash.substring(0, 16)}...</code>
        </div>
      </div>
    </div>
  ` : `
    <div class="auth-result tampered">
      <div class="tamper-icon">⚠️</div>
      <div class="auth-title">Chain Tampered!</div>
      <div class="auth-subtitle">Hash mismatch detected</div>
    </div>
  `;
}

function downloadQR() {
  const canvas = document.querySelector('#qr-code canvas');
  if (!canvas) { showNotification('QR code not ready yet', 'warning'); return; }
  const link = document.createElement('a');
  link.download = `qr-${AppState.selectedProductId}.png`;
  link.href = canvas.toDataURL();
  link.click();
  showNotification('QR code downloaded!', 'success');
}

window.renderDetail = renderDetail;
window.downloadQR = downloadQR;
