// ============================================================
// transfer.js — Ownership Transfer + Verify + Scan Views
// ============================================================

async function renderTransfer(params) {
  const productId = params?.productId || AppState.selectedProductId;
  if (!productId) {
    // Show product picker
    const products = (await ProductStore.getAll()).filter(p => getNextRole(p.currentRole));
    const main = document.getElementById('main-content');
    main.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Transfer Ownership</h1>
          <p class="page-subtitle">Select a product to transfer</p>
        </div>
      </div>
      <div class="verify-grid">
        ${products.length === 0 ?
          `<div class="empty-page"><div class="empty-icon">🔄</div><h3>No products available to transfer</h3><p>All products are either fully delivered or none registered.</p><button class="btn btn-primary" onclick="Router.navigate('add-product')">Register Product</button></div>` :
          products.map(p => `
            <div class="verify-card" style="cursor:pointer" onclick="Router.navigate('transfer', {productId:'${p.id}'})">
              <div class="verify-card-header">
                <span>${p.imageEmoji} ${p.name}</span>
                <code>${p.id}</code>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px">
                ${getStatusBadge(p.status)}
                <span style="font-size:12px;color:var(--accent-purple);font-weight:600">→ Transfer to ${getNextRole(p.currentRole)?.role}</span>
              </div>
            </div>
          `).join('')
        }
      </div>
    `;
    return;
  }

  const product = await ProductStore.getById(productId);
  if (!product) { showNotification('Product not found', 'error'); Router.navigate('products'); return; }

  const nextRole = getNextRole(product.currentRole);
  if (!nextRole) {
    showNotification('Product already delivered to customer', 'info');
    Router.navigate('detail', { productId });
    return;
  }

  const currentRoleInfo = SUPPLY_CHAIN_ROLES.find(r => r.role === product.currentRole);
  const chain = await ChainStore.getChain(productId);

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Transfer Ownership</h1>
        <p class="page-subtitle">${product.imageEmoji} ${product.name}</p>
      </div>
      <button class="btn btn-ghost" onclick="Router.navigate('detail', {productId:'${productId}'})">← Back</button>
    </div>

    <div class="transfer-layout">
      <!-- Transfer Form -->
      <div class="card transfer-card">
        <!-- Transfer Arrow -->
        <div class="transfer-flow">
          <div class="transfer-from">
            <div class="tf-icon" style="background: ${currentRoleInfo?.color}22; border-color: ${currentRoleInfo?.color}">
              ${currentRoleInfo?.icon || '📦'}
            </div>
            <div class="tf-label">From</div>
            <div class="tf-role">${product.currentRole}</div>
            <div class="tf-owner">${product.currentOwner}</div>
          </div>
          <div class="transfer-arrow-big">
            <div class="arrow-line-h"></div>
            <div class="arrow-chevron">→</div>
          </div>
          <div class="transfer-to">
            <div class="tf-icon" style="background: ${nextRole.color}22; border-color: ${nextRole.color}">
              ${nextRole.icon}
            </div>
            <div class="tf-label">To</div>
            <div class="tf-role">${nextRole.role}</div>
            <div class="tf-owner-input">
              <input type="text" class="form-input" id="new-owner" placeholder="${nextRole.role} name..." required />
            </div>
          </div>
        </div>

        <div class="form-divider"></div>

        <form id="transfer-form" onsubmit="handleTransfer(event, '${productId}')">
          <input type="hidden" id="hidden-owner" />
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">📍 City *</label>
              <input type="text" class="form-input" id="tcity" placeholder="e.g. Mumbai" required />
            </div>
            <div class="form-group">
              <label class="form-label">🌍 Country *</label>
              <input type="text" class="form-input" id="tcountry" placeholder="e.g. India" required />
            </div>
            <div class="form-group form-full">
              <label class="form-label">📝 Transfer Notes</label>
              <textarea class="form-input form-textarea" id="tnotes" placeholder="Add inspection notes, delivery details..." rows="2"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">📅 Transfer Date</label>
              <input type="datetime-local" class="form-input" id="tdate" value="${new Date().toISOString().slice(0,16)}" />
            </div>
            <div class="form-group">
              <label class="form-label">🌡️ Condition</label>
              <select class="form-input" id="tcondition">
                <option>Excellent</option>
                <option>Good</option>
                <option>Fair</option>
                <option>Damaged</option>
              </select>
            </div>
          </div>

          <div class="mining-preview" id="mining-preview-t" style="display:none">
            <div class="mining-animation">
              <div class="mining-dot"></div>
              <div class="mining-dot"></div>
              <div class="mining-dot"></div>
            </div>
            <p>⛏️ Mining transfer block...</p>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-ghost" onclick="Router.navigate('detail', {productId:'${productId}'})">Cancel</button>
            <button type="submit" class="btn btn-primary" id="transfer-btn">
              🔄 Execute Transfer
            </button>
          </div>
        </form>
      </div>

      <!-- Info Panel -->
      <div class="info-panel">
        <div class="info-card">
          <h4>📦 Product</h4>
          <div class="info-rows">
            <div class="info-row"><span>Name</span><strong>${product.name}</strong></div>
            <div class="info-row"><span>ID</span><strong class="mono">${product.id}</strong></div>
            <div class="info-row"><span>SKU</span><strong>${product.sku}</strong></div>
          </div>
        </div>
        <div class="info-card mt-4">
          <h4>⛓️ Chain Info</h4>
          ${renderMiniChain(product, chain)}
        </div>
        <div class="info-card mt-4 warning-card">
          <h4>⚠️ Important</h4>
          <p class="info-text">This action creates an immutable block on the blockchain. Once confirmed, it <strong>cannot be reversed</strong>.</p>
        </div>
      </div>
    </div>
  `;
}

function renderMiniChain(product, chain) {
  if (!chain) return '<p>No chain data</p>';

  return `
    <div class="mini-chain">
      ${chain.chain.map(b => `
        <div class="mini-block">
          <div class="mini-block-idx">#${b.index}</div>
          <div class="mini-block-role">${b.data.role}</div>
        </div>
        ${b.index < chain.chain.length - 1 ? '<div class="mini-arrow">→</div>' : ''}
      `).join('')}
    </div>
  `;
}

async function handleTransfer(event, productId) {
  event.preventDefault();

  const newOwner = document.getElementById('new-owner').value;
  if (!newOwner.trim()) {
    showNotification('Please enter the new owner name', 'warning');
    document.getElementById('new-owner').focus();
    return;
  }

  const product = await ProductStore.getById(productId);
  if (!product) return;

  const nextRole = getNextRole(product.currentRole);
  if (!nextRole) return;

  const btn = document.getElementById('transfer-btn');
  btn.disabled = true;
  
  if (window.showMining) window.showMining('Mining Transfer Block...');

  try {
    const chain = await ChainStore.getChain(productId);
    if (!chain) throw new Error('Chain not found');

    const blockData = {
      productId,
      actor: newOwner,
      role: nextRole.role,
      action: nextRole.action,
      location: {
        city: document.getElementById('tcity').value,
        country: document.getElementById('tcountry').value,
        lat: 0, lng: 0
      },
      status: nextRole.status,
      condition: document.getElementById('tcondition').value,
      notes: document.getElementById('tnotes').value,
      transferDate: document.getElementById('tdate').value
    };

    await chain.addBlock(blockData, (hash, nonce) => {
      if (window.updateMiningHash) window.updateMiningHash(hash, nonce);
    });

    // Update product record
    product.status = nextRole.status;
    product.currentOwner = newOwner;
    product.currentRole = nextRole.role;
    product.lastUpdated = new Date().toISOString();

    await ProductStore.save(product);
    await ChainStore.saveChain(productId, chain);

    await ActivityStore.add({
      type: 'transfer',
      message: `${product.name} → ${nextRole.role}: ${newOwner}`,
      productId,
      icon: nextRole.icon
    });

    if (window.hideLoading) window.hideLoading();
    showNotification(`✅ Transferred to ${nextRole.role}: ${newOwner}!`, 'success');
    Router.navigate('detail', { productId });
  } catch (err) {
    console.error(err);
    if (window.hideLoading) window.hideLoading();
    showNotification('Transfer failed. Try again.', 'error');
    btn.disabled = false;
  }
}

// ─── QR Scan Simulation ───────────────────────────────────
async function renderScan() {
  const products = await ProductStore.getAll();
  const main = document.getElementById('main-content');

  main.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">📲 Scan QR Code</h1>
        <p class="page-subtitle">Scan or enter a product ID to track it</p>
      </div>
    </div>

    <div class="scan-layout">
      <div class="scan-card">
        <div class="scanner-frame">
          <div class="scanner-corner tl"></div>
          <div class="scanner-corner tr"></div>
          <div class="scanner-corner bl"></div>
          <div class="scanner-corner br"></div>
          <div class="scanner-line"></div>
          <div class="scanner-icon">📱</div>
          <p class="scanner-text">Camera scanner simulation</p>
        </div>
        <p class="scan-hint">Or enter product ID manually:</p>
        <div class="scan-input-row">
          <input type="text" class="form-input" id="scan-input" placeholder="e.g. PROD-ABC123..." list="product-ids" />
          <datalist id="product-ids">
            ${products.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
          </datalist>
          <button class="btn btn-primary" onclick="handleScan()">🔍 Lookup</button>
        </div>

        <div class="form-divider"></div>
        <p class="scan-hint">Or click a demo product:</p>
        <div class="scan-demo-products">
          ${products.map(p => `
            <div class="scan-demo-item" onclick="Router.navigate('detail', {productId:'${p.id}'})">
              <span>${p.imageEmoji}</span>
              <span>${p.name}</span>
              <span class="mono text-muted">${p.id}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

async function handleScan() {
  const val = document.getElementById('scan-input').value.trim();
  if (!val) { showNotification('Enter a product ID', 'warning'); return; }
  const product = await ProductStore.getById(val);
  if (!product) { showNotification('Product not found on blockchain', 'error'); return; }
  Router.navigate('detail', { productId: val });
}

// ─── Verify View ──────────────────────────────────────────
async function renderVerify(params) {
  const productId = params?.productId || AppState.selectedProductId;
  const products = await ProductStore.getAll();
  const main = document.getElementById('main-content');

  main.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">🔐 Verify Products</h1>
        <p class="page-subtitle">Cryptographic chain integrity verification</p>
      </div>
    </div>

    <div class="verify-grid" id="verify-grid">
      ${products.map(p => `
        <div class="verify-card" id="verify-${p.id}">
          <div class="verify-card-header">
            <span>${p.imageEmoji} ${p.name}</span>
            <code class="mono">${p.id}</code>
          </div>
          <div class="verify-status" id="vstatus-${p.id}">
            <div class="spinner-sm"></div> Verifying...
          </div>
        </div>
      `).join('')}
      ${products.length === 0 ? '<div class="empty-page"><div class="empty-icon">🔐</div><h3>No products to verify</h3></div>' : ''}
    </div>
  `;

  // Verify all products
  for (const p of products) {
    const chain = await ChainStore.getChain(p.id);
    const statusEl = document.getElementById(`vstatus-${p.id}`);
    if (!statusEl) continue;

    if (!chain) {
      statusEl.innerHTML = `<span class="auth-tag tampered">⚠️ No Chain</span>`;
      continue;
    }

    let valid = true;
    for (let i = 1; i < chain.chain.length; i++) {
      if (chain.chain[i].previousHash !== chain.chain[i-1].hash) {
        valid = false; break;
      }
    }

    const blocks = chain.chain.length;
    statusEl.innerHTML = valid
      ? `<span class="auth-tag authentic">✅ Valid — ${blocks} block${blocks !== 1 ? 's' : ''}</span>`
      : `<span class="auth-tag tampered">❌ Tampered!</span>`;
  }
}

window.renderTransfer = renderTransfer;
window.handleTransfer = handleTransfer;
window.renderScan = renderScan;
window.handleScan = handleScan;
window.renderVerify = renderVerify;
