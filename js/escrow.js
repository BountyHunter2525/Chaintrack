// ============================================================
// escrow.js — Smart Contract Escrow Simulation
// Simulates on-chain escrow: funds locked on product registration,
// auto-released when delivery is confirmed on the blockchain.
// ============================================================

// ─── Escrow Store (localStorage) ──────────────────────────
// In a real system this would be a smart contract on-chain.
// We simulate it with localStorage keyed by product ID.
const EscrowStore = {
  _key: 'chaintrack_escrow',

  _load() {
    try { return JSON.parse(localStorage.getItem(this._key) || '{}'); }
    catch { return {}; }
  },

  _save(data) {
    localStorage.setItem(this._key, JSON.stringify(data));
  },

  getAll() {
    const data = this._load();
    return Object.values(data);
  },

  getByProductId(productId) {
    return this._load()[productId] || null;
  },

  create(productId, { amount, currency, buyer, seller, productName }) {
    const data = this._load();
    data[productId] = {
      productId,
      productName,
      amount: parseFloat(amount),
      currency: currency || 'USD',
      buyer,
      seller,
      status: 'locked',       // locked | released | refunded
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      txHash: _fakeHash()     // simulated transaction hash
    };
    this._save(data);
    return data[productId];
  },

  update(productId, changes) {
    const data = this._load();
    if (!data[productId]) return null;
    data[productId] = { ...data[productId], ...changes };
    this._save(data);
    return data[productId];
  },

  delete(productId) {
    const data = this._load();
    delete data[productId];
    this._save(data);
  }
};

// ─── Helpers ──────────────────────────────────────────────
function _fakeHash() {
  // Simulate a 64-char SHA-256-like hex string
  const hex = '0123456789abcdef';
  let h = '00000'; // start with zeros (PoW simulation)
  for (let i = 0; i < 59; i++) h += hex[Math.floor(Math.random() * 16)];
  return h;
}

function _escrowStatusBadge(status) {
  const map = {
    locked:   `<span style="background:#f59e0b22;color:#f59e0b;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">🔒 Locked</span>`,
    released: `<span style="background:#10b98122;color:#10b981;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">✅ Released</span>`,
    refunded: `<span style="background:#6366f122;color:#6366f1;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">↩️ Refunded</span>`
  };
  return map[status] || map.locked;
}

function _currencySymbol(currency) {
  return { USD: '$', EUR: '€', INR: '₹', GBP: '£' }[currency] || '$';
}

// ─── Smart Contract Actions ────────────────────────────────
async function lockEscrow(productId) {
  const product = await ProductStore.getById(productId);
  if (!product) { showNotification('Product not found', 'error'); return; }

  const existing = EscrowStore.getByProductId(productId);
  if (existing) {
    showNotification('Escrow already exists for this product', 'warning');
    return;
  }

  const amountStr = document.getElementById('escrow-amount')?.value;
  const currency  = document.getElementById('escrow-currency')?.value || 'USD';
  const buyer     = document.getElementById('escrow-buyer')?.value?.trim();
  const seller    = product.manufacturer;

  if (!amountStr || parseFloat(amountStr) <= 0) {
    showNotification('Enter a valid escrow amount', 'warning'); return;
  }
  if (!buyer) {
    showNotification('Enter the buyer name', 'warning'); return;
  }

  const contract = EscrowStore.create(productId, {
    amount: amountStr,
    currency,
    buyer,
    seller,
    productName: product.name
  });

  await ActivityStore.add({
    type: 'escrow',
    message: `Escrow locked: ${_currencySymbol(currency)}${contract.amount} for ${product.name}`,
    productId,
    icon: '🔒'
  });

  showNotification(`🔒 ${_currencySymbol(currency)}${contract.amount} locked in escrow!`, 'success');
  Router.navigate('escrow');
}

async function releaseEscrow(productId) {
  const contract = EscrowStore.getByProductId(productId);
  if (!contract) { showNotification('No escrow contract found', 'error'); return; }
  if (contract.status !== 'locked') {
    showNotification(`Escrow is already ${contract.status}`, 'warning'); return;
  }

  EscrowStore.update(productId, {
    status: 'released',
    resolvedAt: new Date().toISOString(),
    releaseTxHash: _fakeHash()
  });

  await ActivityStore.add({
    type: 'escrow',
    message: `Escrow released: ${_currencySymbol(contract.currency)}${contract.amount} → ${contract.seller} for ${contract.productName}`,
    productId,
    icon: '✅'
  });

  showNotification(`✅ ${_currencySymbol(contract.currency)}${contract.amount} released to ${contract.seller}!`, 'success');
  renderEscrow();
}

async function refundEscrow(productId) {
  const contract = EscrowStore.getByProductId(productId);
  if (!contract) { showNotification('No escrow contract found', 'error'); return; }
  if (contract.status !== 'locked') {
    showNotification(`Escrow is already ${contract.status}`, 'warning'); return;
  }

  EscrowStore.update(productId, {
    status: 'refunded',
    resolvedAt: new Date().toISOString()
  });

  await ActivityStore.add({
    type: 'escrow',
    message: `Escrow refunded: ${_currencySymbol(contract.currency)}${contract.amount} → ${contract.buyer} for ${contract.productName}`,
    productId,
    icon: '↩️'
  });

  showNotification(`↩️ ${_currencySymbol(contract.currency)}${contract.amount} refunded to ${contract.buyer}`, 'info');
  renderEscrow();
}

// Auto-release hook — call this after every delivery transfer
async function checkAndAutoReleaseEscrow(productId, newStatus) {
  if (newStatus !== 'delivered') return;
  const contract = EscrowStore.getByProductId(productId);
  if (!contract || contract.status !== 'locked') return;

  EscrowStore.update(productId, {
    status: 'released',
    resolvedAt: new Date().toISOString(),
    releaseTxHash: _fakeHash(),
    autoReleased: true
  });

  await ActivityStore.add({
    type: 'escrow',
    message: `🤖 Smart Contract auto-released ${_currencySymbol(contract.currency)}${contract.amount} to ${contract.seller} on delivery confirmation`,
    productId,
    icon: '🤖'
  });

  showNotification(`🤖 Smart Contract: ${_currencySymbol(contract.currency)}${contract.amount} auto-released to ${contract.seller}!`, 'success');
}

// ─── Escrow View ──────────────────────────────────────────
async function renderEscrow() {
  const contracts = EscrowStore.getAll();
  const products  = await ProductStore.getAll();
  const productMap = {};
  products.forEach(p => productMap[p.id] = p);

  const locked   = contracts.filter(c => c.status === 'locked');
  const resolved = contracts.filter(c => c.status !== 'locked');
  const totalLocked = locked.reduce((s, c) => s + c.amount, 0);

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">📜 Smart Contract Escrow</h1>
        <p class="page-subtitle">Automated payment release on delivery confirmation</p>
      </div>
      <button class="btn btn-primary" onclick="Router.navigate('products')">
        ➕ New Escrow Contract
      </button>
    </div>

    <!-- Summary Stats -->
    <div class="stats-grid" style="margin-bottom:24px;">
      <div class="stat-card" style="--accent:#f59e0b">
        <div class="stat-icon">🔒</div>
        <div class="stat-info">
          <div class="stat-value">${locked.length}</div>
          <div class="stat-label">Active Contracts</div>
        </div>
        <div class="stat-trend">Locked</div>
      </div>
      <div class="stat-card" style="--accent:#10b981">
        <div class="stat-icon">✅</div>
        <div class="stat-info">
          <div class="stat-value">${contracts.filter(c => c.status==='released').length}</div>
          <div class="stat-label">Released</div>
        </div>
        <div class="stat-trend">Completed</div>
      </div>
      <div class="stat-card" style="--accent:#6366f1">
        <div class="stat-icon">💰</div>
        <div class="stat-info">
          <div class="stat-value">$${totalLocked.toFixed(2)}</div>
          <div class="stat-label">Total Locked</div>
        </div>
        <div class="stat-trend">USD</div>
      </div>
      <div class="stat-card" style="--accent:#3b82f6">
        <div class="stat-icon">🤖</div>
        <div class="stat-info">
          <div class="stat-value">${contracts.filter(c => c.autoReleased).length}</div>
          <div class="stat-label">Auto-Released</div>
        </div>
        <div class="stat-trend">By contract</div>
      </div>
    </div>

    <!-- How It Works Banner -->
    <div class="card" style="margin-bottom:24px; padding:20px; background:linear-gradient(135deg,rgba(99,102,241,.08),rgba(99,102,241,.02)); border-color:rgba(99,102,241,.2);">
      <h3 style="margin:0 0 12px; font-size:15px;">🤖 How Smart Contract Escrow Works</h3>
      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px;">
        <div style="display:flex;gap:10px;align-items:flex-start;">
          <span style="background:#6366f122;color:#6366f1;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">1</span>
          <div><div style="font-weight:600;font-size:13px;">Lock Funds</div><div style="font-size:12px;color:var(--text-muted);">Retailer locks payment before shipment begins.</div></div>
        </div>
        <div style="display:flex;gap:10px;align-items:flex-start;">
          <span style="background:#f59e0b22;color:#f59e0b;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">2</span>
          <div><div style="font-weight:600;font-size:13px;">Product Ships</div><div style="font-size:12px;color:var(--text-muted);">Product moves through the supply chain. Funds stay locked.</div></div>
        </div>
        <div style="display:flex;gap:10px;align-items:flex-start;">
          <span style="background:#10b98122;color:#10b981;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">3</span>
          <div><div style="font-weight:600;font-size:13px;">Delivery Mined</div><div style="font-size:12px;color:var(--text-muted);">When the "Delivered" block is mined, the contract auto-releases funds.</div></div>
        </div>
        <div style="display:flex;gap:10px;align-items:flex-start;">
          <span style="background:#3b82f622;color:#3b82f6;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">4</span>
          <div><div style="font-weight:600;font-size:13px;">Seller Paid</div><div style="font-size:12px;color:var(--text-muted);">Funds automatically transferred to manufacturer. Zero trust needed.</div></div>
        </div>
      </div>
    </div>

    <!-- Active Contracts -->
    ${locked.length > 0 ? `
    <div class="card" style="margin-bottom:20px;">
      <div class="card-header">
        <h3 class="card-title">🔒 Active Contracts</h3>
        <span style="font-size:12px;color:var(--text-muted);">${locked.length} contract${locked.length !== 1 ? 's' : ''}</span>
      </div>
      ${locked.map(c => _renderEscrowCard(c, productMap[c.productId])).join('')}
    </div>` : ''}

    <!-- New Contract Form -->
    <div class="card" style="margin-bottom:20px;">
      <div class="card-header">
        <h3 class="card-title">➕ Create New Escrow Contract</h3>
      </div>
      <div style="padding:8px 0;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
          <div class="form-group">
            <label class="form-label">📦 Product *</label>
            <select class="form-input" id="escrow-product-select" onchange="document.getElementById('escrow-buyer').value=''">
              <option value="">— Select a product —</option>
              ${products.filter(p => !EscrowStore.getByProductId(p.id) && p.status !== 'delivered').map(p =>
                `<option value="${p.id}">${p.imageEmoji} ${p.name} (${p.status})</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">👤 Buyer Name *</label>
            <input type="text" class="form-input" id="escrow-buyer" placeholder="e.g. TechMart Retail" />
          </div>
          <div class="form-group">
            <label class="form-label">💰 Amount *</label>
            <input type="number" class="form-input" id="escrow-amount" placeholder="e.g. 5000" min="1" step="0.01" />
          </div>
          <div class="form-group">
            <label class="form-label">💱 Currency</label>
            <select class="form-input" id="escrow-currency">
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="INR">INR — Indian Rupee</option>
              <option value="GBP">GBP — British Pound</option>
            </select>
          </div>
        </div>
        <button class="btn btn-primary" onclick="handleCreateEscrow()">
          🔒 Lock Funds in Smart Contract
        </button>
      </div>
    </div>

    <!-- Resolved Contracts -->
    ${resolved.length > 0 ? `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">📋 Contract History</h3>
      </div>
      ${resolved.map(c => _renderEscrowCard(c, productMap[c.productId])).join('')}
    </div>` : ''}

    ${contracts.length === 0 ? `
    <div class="empty-page" style="margin-top:0;">
      <div class="empty-icon">📜</div>
      <h3>No Escrow Contracts Yet</h3>
      <p>Create your first smart contract above to automate payment on delivery.</p>
    </div>` : ''}
  `;
}

function _renderEscrowCard(c, product) {
  const sym = _currencySymbol(c.currency);
  const isLocked = c.status === 'locked';
  return `
    <div style="border:1px solid var(--border-color);border-radius:12px;padding:16px;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
        <div style="display:flex;gap:12px;align-items:center;">
          <span style="font-size:28px;">${product?.imageEmoji || '📦'}</span>
          <div>
            <div style="font-weight:700;font-size:15px;">${c.productName}</div>
            <div style="font-size:12px;color:var(--text-muted);font-family:monospace;">${c.productId}</div>
          </div>
        </div>
        ${_escrowStatusBadge(c.status)}
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:12px;">
        <div style="background:var(--bg-tertiary);border-radius:8px;padding:10px;">
          <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Amount</div>
          <div style="font-weight:700;font-size:18px;">${sym}${c.amount.toFixed(2)}</div>
        </div>
        <div style="background:var(--bg-tertiary);border-radius:8px;padding:10px;">
          <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Buyer</div>
          <div style="font-weight:600;font-size:14px;">${c.buyer}</div>
        </div>
        <div style="background:var(--bg-tertiary);border-radius:8px;padding:10px;">
          <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Seller</div>
          <div style="font-weight:600;font-size:14px;">${c.seller}</div>
        </div>
        <div style="background:var(--bg-tertiary);border-radius:8px;padding:10px;">
          <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Locked At</div>
          <div style="font-weight:600;font-size:13px;">${formatDate(c.createdAt)}</div>
        </div>
      </div>

      <div style="background:var(--bg-tertiary);border-radius:8px;padding:10px;margin-bottom:12px;">
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Contract Tx Hash</div>
        <div style="font-family:monospace;font-size:11px;color:var(--accent-green);word-break:break-all;">${c.txHash}</div>
      </div>

      ${c.resolvedAt ? `
        <div style="background:var(--bg-tertiary);border-radius:8px;padding:10px;margin-bottom:12px;">
          <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">${c.autoReleased ? '🤖 Auto-Released At' : 'Resolved At'}</div>
          <div style="font-size:13px;font-weight:600;">${formatDate(c.resolvedAt)}</div>
        </div>` : ''}

      ${isLocked ? `
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-primary" onclick="releaseEscrow('${c.productId}')">✅ Release to Seller</button>
          <button class="btn btn-ghost" onclick="Router.navigate('detail', {productId:'${c.productId}'})">📦 View Product</button>
          <button class="btn btn-ghost" style="color:#ef4444;border-color:#ef444433;" onclick="refundEscrow('${c.productId}')">↩️ Refund Buyer</button>
        </div>` : `
        <button class="btn btn-ghost" onclick="Router.navigate('detail', {productId:'${c.productId}'})">📦 View Product</button>`
      }
    </div>
  `;
}

async function handleCreateEscrow() {
  const productId = document.getElementById('escrow-product-select')?.value;
  if (!productId) { showNotification('Select a product', 'warning'); return; }
  await lockEscrow(productId);
}

// ─── Product Detail Escrow Panel (injected into detail page) ─
function injectEscrowPanel(productId) {
  const contract = EscrowStore.getByProductId(productId);
  const detailLeft = document.querySelector('.detail-left');
  if (!detailLeft) return;

  // Remove any existing escrow panel
  const existing = document.getElementById('escrow-panel');
  if (existing) existing.remove();

  const panel = document.createElement('div');
  panel.id = 'escrow-panel';
  panel.className = 'card';
  panel.style.marginTop = '16px';

  if (!contract) {
    panel.innerHTML = `
      <div class="card-header">
        <h3 class="card-title">📜 Escrow Contract</h3>
      </div>
      <div style="padding:8px 0; color:var(--text-secondary); font-size:13px;">
        No escrow contract for this product yet.
      </div>
      <button class="btn btn-ghost" style="margin-top:4px;" onclick="Router.navigate('escrow')">
        ➕ Create Contract
      </button>
    `;
  } else {
    const sym = _currencySymbol(contract.currency);
    panel.innerHTML = `
      <div class="card-header">
        <h3 class="card-title">📜 Escrow Contract</h3>
        ${_escrowStatusBadge(contract.status)}
      </div>
      <div style="margin-top:8px; font-size:14px;">
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-color);">
          <span style="color:var(--text-muted);">Amount</span>
          <strong>${sym}${contract.amount.toFixed(2)} ${contract.currency}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-color);">
          <span style="color:var(--text-muted);">Buyer</span>
          <strong>${contract.buyer}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;">
          <span style="color:var(--text-muted);">Seller</span>
          <strong>${contract.seller}</strong>
        </div>
        ${contract.autoReleased ? `<div style="margin-top:8px;font-size:12px;color:#10b981;background:#10b98111;padding:6px 10px;border-radius:6px;">🤖 Auto-released by smart contract on delivery</div>` : ''}
      </div>
      <button class="btn btn-ghost" style="margin-top:12px;width:100%;" onclick="Router.navigate('escrow')">
        View Full Contract →
      </button>
    `;
  }

  detailLeft.appendChild(panel);
}

window.EscrowStore              = EscrowStore;
window.renderEscrow             = renderEscrow;
window.lockEscrow               = lockEscrow;
window.releaseEscrow            = releaseEscrow;
window.refundEscrow             = refundEscrow;
window.handleCreateEscrow       = handleCreateEscrow;
window.checkAndAutoReleaseEscrow = checkAndAutoReleaseEscrow;
window.injectEscrowPanel        = injectEscrowPanel;
