// ============================================================
// products.js — Products List + Add Product
// ============================================================

async function renderProducts() {
  const products = await ProductStore.getAll();
  const chains = await Promise.all(products.map(p => ChainStore.getChain(p.id)));
  const chainMap = {};
  products.forEach((p, i) => { chainMap[p.id] = chains[i]; });

  const main = document.getElementById('main-content');

  main.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Products</h1>
        <p class="page-subtitle">${products.length} product${products.length !== 1 ? 's' : ''} on blockchain</p>
      </div>
      <button class="btn btn-primary" onclick="Router.navigate('add-product')">
        <span>＋</span> Register Product
      </button>
    </div>

    <!-- Filter Bar -->
    <div class="filter-bar">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" id="product-search" placeholder="Search products..." oninput="filterProducts(this.value)" />
      </div>
      <div class="filter-chips">
        <button class="chip active" onclick="filterByStatus('all', this)">All</button>
        <button class="chip" onclick="filterByStatus('manufactured', this)">Manufactured</button>
        <button class="chip" onclick="filterByStatus('in_transit', this)">In Transit</button>
        <button class="chip" onclick="filterByStatus('at_retailer', this)">At Retailer</button>
        <button class="chip" onclick="filterByStatus('delivered', this)">Delivered</button>
      </div>
    </div>

    <!-- Products Grid -->
    <div class="products-grid" id="products-grid">
      ${products.length === 0 ? `
        <div class="empty-page">
          <div class="empty-icon">📦</div>
          <h3>No products registered yet</h3>
          <p>Start by registering your first product on the blockchain</p>
          <button class="btn btn-primary" onclick="Router.navigate('add-product')">Register First Product</button>
        </div>
      ` : products.map(p => renderProductCard(p, chainMap[p.id])).join('')}
    </div>
  `;

  // Store all products for filtering
  window._allProducts = products;
}

function renderProductCard(p, chain) {
  const blockCount = chain ? chain.chain.length : 1;
  const roleInfo = SUPPLY_CHAIN_ROLES.find(r => r.role === p.currentRole) || SUPPLY_CHAIN_ROLES[0];

  return `
    <div class="product-card" data-status="${p.status}" data-name="${p.name.toLowerCase()}"
         onclick="Router.navigate('detail', {productId:'${p.id}'})">
      <div class="product-card-header" style="background: linear-gradient(135deg, ${roleInfo.color}22, ${roleInfo.color}11)">
        <div class="product-emoji-large">${p.imageEmoji || '📦'}</div>
        <div class="product-card-actions" onclick="event.stopPropagation()">
          <button class="icon-btn" title="Transfer" onclick="Router.navigate('transfer', {productId:'${p.id}'})">🔄</button>
          <button class="icon-btn" title="Verify" onclick="Router.navigate('verify', {productId:'${p.id}'})">🔐</button>
          <button class="icon-btn danger" title="Delete" onclick="deleteProduct('${p.id}', event)">🗑️</button>
        </div>
      </div>
      <div class="product-card-body">
        <div class="product-category">${p.category}</div>
        <h3 class="product-card-name">${p.name}</h3>
        <div class="product-card-id">${p.id}</div>
        <div class="product-card-meta">
          <span>🏭 ${p.manufacturer}</span>
          <span>⛓️ ${blockCount} block${blockCount !== 1 ? 's' : ''}</span>
        </div>
        <div class="product-card-footer">
          ${getStatusBadge(p.status)}
          <div class="current-owner">
            ${getRoleIcon(p.currentRole)} ${p.currentOwner || p.manufacturer}
          </div>
        </div>
        <div class="journey-mini">
          ${SUPPLY_CHAIN_ROLES.map((r, i) => `
            <div class="journey-step-mini ${getRoleIndex(p.currentRole) >= i ? 'done' : ''}">
              <div class="step-dot-mini"></div>
            </div>
          `).join('<div class="step-line-mini"></div>')}
        </div>
      </div>
    </div>
  `;
}

function filterProducts(query) {
  const cards = document.querySelectorAll('.product-card');
  query = query.toLowerCase();
  cards.forEach(card => {
    const name = card.dataset.name || '';
    card.style.display = name.includes(query) ? '' : 'none';
  });
}

function filterByStatus(status, btn) {
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  const cards = document.querySelectorAll('.product-card');
  cards.forEach(card => {
    card.style.display = (status === 'all' || card.dataset.status === status) ? '' : 'none';
  });
}

async function deleteProduct(id, event) {
  event.stopPropagation();
  if (!confirm('Delete this product from the blockchain? This cannot be undone.')) return;
  ProductStore.deleteById(id);
  ActivityStore.add({ type: 'delete', message: 'Product deleted', productId: id, icon: '🗑️' });
  showNotification('Product removed', 'info');
  renderProducts();
}

// ─── Add Product View ─────────────────────────────────────
function renderAddProduct() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Register Product</h1>
        <p class="page-subtitle">Create a new genesis block on the blockchain</p>
      </div>
      <button class="btn btn-ghost" onclick="Router.navigate('products')">← Back</button>
    </div>

    <div class="form-container">
      <div class="form-card">
        <div class="form-section-title">
          <span class="form-section-icon">📦</span>
          Product Information
        </div>

        <form id="add-product-form" onsubmit="handleAddProduct(event)">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Product Name *</label>
              <input type="text" class="form-input" id="pname" placeholder="e.g. iPhone 16 Pro" required />
            </div>
            <div class="form-group">
              <label class="form-label">Category *</label>
              <select class="form-input" id="pcategory" required>
                <option value="">Select category</option>
                <option>Electronics</option>
                <option>Pharmaceuticals</option>
                <option>Food & Beverage</option>
                <option>Clothing & Apparel</option>
                <option>Automotive</option>
                <option>Industrial</option>
                <option>Other</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">SKU / Batch Number *</label>
              <input type="text" class="form-input" id="psku" placeholder="e.g. APL-IP16P-001" required />
            </div>
            <div class="form-group">
              <label class="form-label">Manufacturer Name *</label>
              <input type="text" class="form-input" id="pmanufacturer" placeholder="e.g. Apple Inc." required />
            </div>
            <div class="form-group">
              <label class="form-label">Origin City *</label>
              <input type="text" class="form-input" id="pcity" placeholder="e.g. Shenzhen" required />
            </div>
            <div class="form-group">
              <label class="form-label">Origin Country *</label>
              <input type="text" class="form-input" id="pcountry" placeholder="e.g. China" required />
            </div>
            <div class="form-group form-full">
              <label class="form-label">Description</label>
              <textarea class="form-input form-textarea" id="pdesc" placeholder="Product description..." rows="3"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Product Icon</label>
              <div class="emoji-picker" id="emoji-picker">
                ${['📦', '📱', '💊', '🍵', '👕', '🚗', '⚙️', '💻', '🎮', '🍎', '🔋', '💎'].map(e =>
                  `<button type="button" class="emoji-btn" onclick="selectEmoji('${e}', this)">${e}</button>`
                ).join('')}
              </div>
              <input type="hidden" id="pemoji" value="📦" />
            </div>
          </div>

          <div class="form-divider"></div>

          <div class="mining-preview" id="mining-preview" style="display:none">
            <div class="mining-animation">
              <div class="mining-dot"></div>
              <div class="mining-dot"></div>
              <div class="mining-dot"></div>
            </div>
            <p>⛏️ Mining genesis block with difficulty ${window.DIFFICULTY}...</p>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-ghost" onclick="Router.navigate('products')">Cancel</button>
            <button type="submit" class="btn btn-primary" id="submit-btn">
              ⛓️ Register on Blockchain
            </button>
          </div>
        </form>
      </div>

      <!-- Info Panel -->
      <div class="info-panel">
        <div class="info-card">
          <h4>How it works</h4>
          <div class="info-steps">
            <div class="info-step">
              <div class="info-step-num">1</div>
              <div>Fill in product details</div>
            </div>
            <div class="info-step">
              <div class="info-step-num">2</div>
              <div>A genesis block is mined with proof-of-work</div>
            </div>
            <div class="info-step">
              <div class="info-step-num">3</div>
              <div>Product gets a unique QR code + ID</div>
            </div>
            <div class="info-step">
              <div class="info-step-num">4</div>
              <div>Track it through the supply chain</div>
            </div>
          </div>
        </div>
        <div class="info-card mt-4">
          <h4>🔐 Blockchain Properties</h4>
          <ul class="info-list">
            <li>Immutable audit trail</li>
            <li>SHA-256 cryptographic hashing</li>
            <li>Proof-of-work (difficulty: ${window.DIFFICULTY})</li>
            <li>Chain integrity verification</li>
          </ul>
        </div>
      </div>
    </div>
  `;

  // Select first emoji by default
  document.querySelector('.emoji-btn')?.classList.add('selected');
}

function selectEmoji(emoji, btn) {
  document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  document.getElementById('pemoji').value = emoji;
}

async function handleAddProduct(event) {
  event.preventDefault();

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = '⛏️ Mining...';
  document.getElementById('mining-preview').style.display = 'flex';

  const productId = generateProductId();
  const product = {
    id: productId,
    name: document.getElementById('pname').value,
    category: document.getElementById('pcategory').value,
    sku: document.getElementById('psku').value,
    manufacturer: document.getElementById('pmanufacturer').value,
    manufacturerLocation: {
      city: document.getElementById('pcity').value,
      country: document.getElementById('pcountry').value,
      lat: 0, lng: 0
    },
    description: document.getElementById('pdesc').value,
    status: 'manufactured',
    currentOwner: document.getElementById('pmanufacturer').value,
    currentRole: 'Manufacturer',
    imageEmoji: document.getElementById('pemoji').value,
    createdAt: new Date().toISOString()
  };

  try {
    const bc = new Blockchain();
    await bc.createGenesisBlock({
      productId: product.id,
      productName: product.name,
      manufacturer: product.manufacturer,
      location: product.manufacturerLocation,
      sku: product.sku,
      category: product.category
    });

    ProductStore.save(product);
    ChainStore.saveChain(product.id, bc);
    ActivityStore.add({
      type: 'registered',
      message: `${product.name} registered by ${product.manufacturer}`,
      productId: product.id,
      icon: product.imageEmoji
    });

    showNotification(`✅ ${product.name} registered on blockchain!`, 'success');
    Router.navigate('detail', { productId: product.id });
  } catch (err) {
    console.error(err);
    showNotification('Error mining block. Try again.', 'error');
    btn.disabled = false;
    btn.textContent = '⛓️ Register on Blockchain';
    document.getElementById('mining-preview').style.display = 'none';
  }
}

window.renderProducts = renderProducts;
window.renderAddProduct = renderAddProduct;
window.filterProducts = filterProducts;
window.filterByStatus = filterByStatus;
window.deleteProduct = deleteProduct;
window.handleAddProduct = handleAddProduct;
window.selectEmoji = selectEmoji;
