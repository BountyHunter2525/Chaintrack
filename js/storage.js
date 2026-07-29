// ============================================================
// storage.js — localStorage Persistence Layer
// ============================================================

const STORAGE_KEYS = {
  PRODUCTS: 'sct_products',
  CHAINS: 'sct_chains',
  ACTIVITY: 'sct_activity',
  INITIALIZED: 'sct_initialized'
};

// ─── Product Store ─────────────────────────────────────────
const ProductStore = {
  getAll() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
  },
  getById(id) {
    return this.getAll().find(p => p.id === id) || null;
  },
  save(product) {
    const products = this.getAll();
    const idx = products.findIndex(p => p.id === product.id);
    if (idx >= 0) products[idx] = product;
    else products.push(product);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  },
  deleteById(id) {
    const products = this.getAll().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }
};

// ─── Chain Store ───────────────────────────────────────────
const ChainStore = {
  getChain(productId) {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHAINS) || '{}');
    return all[productId] ? Blockchain.fromJSON(all[productId]) : null;
  },
  saveChain(productId, blockchain) {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHAINS) || '{}');
    all[productId] = blockchain.toJSON();
    localStorage.setItem(STORAGE_KEYS.CHAINS, JSON.stringify(all));
  }
};

// ─── Activity Feed ─────────────────────────────────────────
const ActivityStore = {
  getAll() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITY) || '[]');
  },
  add(entry) {
    const activities = this.getAll();
    activities.unshift({ ...entry, id: Date.now(), timestamp: new Date().toISOString() });
    // Keep last 50 entries
    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(activities.slice(0, 50)));
  },
  clear() {
    localStorage.removeItem(STORAGE_KEYS.ACTIVITY);
  }
};

// ─── Stats Helper ──────────────────────────────────────────
const StatsHelper = {
  async getStats() {
    const products = ProductStore.getAll();
    let totalTransfers = 0;
    let delivered = 0;
    let inTransit = 0;

    for (const p of products) {
      const chain = ChainStore.getChain(p.id);
      if (chain) {
        totalTransfers += chain.chain.length - 1;
      }
      if (p.status === 'delivered') delivered++;
      else if (p.status !== 'manufactured') inTransit++;
    }

    return {
      totalProducts: products.length,
      totalTransfers,
      delivered,
      inTransit,
      manufactured: products.filter(p => p.status === 'manufactured').length
    };
  }
};

// ─── Demo Data Seeder ──────────────────────────────────────
async function seedDemoData() {
  if (localStorage.getItem(STORAGE_KEYS.INITIALIZED)) return;

  const demoProducts = [
    {
      id: 'PROD-' + Math.random().toString(36).substr(2, 8).toUpperCase(),
      name: 'Apple iPhone 16 Pro',
      category: 'Electronics',
      sku: 'APL-IP16P-BLK',
      manufacturer: 'Apple Inc.',
      manufacturerLocation: { city: 'Shenzhen', country: 'China', lat: 22.5431, lng: 114.0579 },
      description: 'Flagship smartphone with A18 Pro chip',
      status: 'at_retailer',
      currentOwner: 'TechMart Retail',
      currentRole: 'Retailer',
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      imageEmoji: '📱'
    },
    {
      id: 'PROD-' + Math.random().toString(36).substr(2, 8).toUpperCase(),
      name: 'Pfizer Paracetamol 500mg',
      category: 'Pharmaceuticals',
      sku: 'PFZ-PARA-500',
      manufacturer: 'Pfizer Ltd.',
      manufacturerLocation: { city: 'New York', country: 'USA', lat: 40.7128, lng: -74.0060 },
      description: 'Pain relief medication, batch #PZ2024-09',
      status: 'in_transit',
      currentOwner: 'MedEx Distributors',
      currentRole: 'Distributor',
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      imageEmoji: '💊'
    },
    {
      id: 'PROD-' + Math.random().toString(36).substr(2, 8).toUpperCase(),
      name: 'Organic Darjeeling Tea',
      category: 'Food & Beverage',
      sku: 'DAR-TEA-250G',
      manufacturer: 'Himalayan Gardens',
      manufacturerLocation: { city: 'Darjeeling', country: 'India', lat: 27.0360, lng: 88.2627 },
      description: 'First flush organic Darjeeling tea, 250g',
      status: 'delivered',
      currentOwner: 'John Smith',
      currentRole: 'Customer',
      createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      imageEmoji: '🍵'
    }
  ];

  // For demo data, create a simple chain without full mining (just store structure)
  for (const product of demoProducts) {
    ProductStore.save(product);

    // Build a fake but consistent chain for demo
    const bc = new Blockchain();
    const roles = SUPPLY_CHAIN_ROLES;
    const roleIdx = getRoleIndex(product.currentRole);
    const locations = [
      product.manufacturerLocation,
      { city: 'Mumbai', country: 'India', lat: 19.0760, lng: 72.8777 },
      { city: 'Delhi', country: 'India', lat: 28.6139, lng: 77.2090 },
      { city: 'Bangalore', country: 'India', lat: 12.9716, lng: 77.5946 }
    ];

    // Create chain manually (skipping mining for demo speed)
    const genesisData = {
      type: 'GENESIS',
      productId: product.id,
      productName: product.name,
      manufacturer: product.manufacturer,
      actor: product.manufacturer,
      role: 'Manufacturer',
      action: 'Product Registered',
      location: locations[0],
      status: 'manufactured'
    };
    const genesis = new Block({ index: 0, data: genesisData, previousHash: '0'.repeat(64) });
    genesis.hash = '00' + Math.random().toString(16).substr(2, 62);
    bc.chain = [genesis];

    for (let i = 1; i <= roleIdx; i++) {
      const r = roles[i];
      const blockData = {
        type: 'TRANSFER',
        productId: product.id,
        actor: product.currentOwner,
        role: r.role,
        action: r.action,
        location: locations[Math.min(i, locations.length - 1)],
        status: r.status,
        notes: 'Demo transfer - chain verified'
      };
      const block = new Block({
        index: i,
        data: blockData,
        previousHash: bc.chain[i - 1].hash,
        timestamp: new Date(Date.now() - (roleIdx - i) * 2 * 86400000).toISOString()
      });
      block.hash = '00' + Math.random().toString(16).substr(2, 62);
      bc.chain.push(block);
    }

    ChainStore.saveChain(product.id, bc);

    ActivityStore.add({
      type: product.status === 'delivered' ? 'delivered' : 'transfer',
      message: `${product.name} — ${product.currentRole} stage`,
      productId: product.id,
      icon: product.imageEmoji
    });
  }

  localStorage.setItem(STORAGE_KEYS.INITIALIZED, '1');
}

window.ProductStore = ProductStore;
window.ChainStore = ChainStore;
window.ActivityStore = ActivityStore;
window.StatsHelper = StatsHelper;
window.seedDemoData = seedDemoData;
window.STORAGE_KEYS = STORAGE_KEYS;
