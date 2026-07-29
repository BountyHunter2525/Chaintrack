// ============================================================
// supabase.js — Supabase Database Layer
// Replaces localStorage with real cloud database
// Project: https://zbzptwinibxwrgiobsuq.supabase.co
// ============================================================

const SUPABASE_URL = 'https://zbzptwinibxwrgiobsuq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpienB0d2luaWJ4d3JnaW9ic3VxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMzQ0NTEsImV4cCI6MjEwMDkxMDQ1MX0.8rorvd-VRU2LPWs5WfQwsiiGIOpU81KtDqDxsqBOX_M';

// ─── Supabase REST helper ──────────────────────────────────
const DB = {
  async request(path, method = 'GET', body = null, params = '') {
    const url = `${SUPABASE_URL}/rest/v1/${path}${params}`;
    const opts = {
      method,
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'return=representation' : ''
      }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Supabase error: ${err}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  },

  // SELECT
  select(table, params = '') { return this.request(table, 'GET', null, params); },
  // INSERT
  insert(table, data) { return this.request(table, 'POST', data); },
  // UPDATE
  update(table, data, filter) { return this.request(table, 'PATCH', data, filter); },
  // UPSERT
  upsert(table, data) {
    return fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify(data)
    }).then(r => r.json());
  },
  // DELETE
  delete(table, filter) { return this.request(table, 'DELETE', null, filter); }
};

// ─── Product Store (Supabase) ──────────────────────────────
const ProductStore = {
  async getAll() {
    try {
      const data = await DB.select('products', '?order=created_at.desc');
      return (data || []).map(mapFromDB);
    } catch (e) { console.error('getAll error:', e); return []; }
  },

  async getById(id) {
    try {
      const data = await DB.select('products', `?id=eq.${id}`);
      return data && data[0] ? mapFromDB(data[0]) : null;
    } catch (e) { console.error('getById error:', e); return null; }
  },

  async save(product) {
    try {
      await DB.upsert('products', mapToDB(product));
    } catch (e) { console.error('save error:', e); }
  },

  async deleteById(id) {
    try {
      await DB.delete('products', `?id=eq.${id}`);
    } catch (e) { console.error('deleteById error:', e); }
  }
};

// ─── Chain Store (Supabase) ────────────────────────────────
const ChainStore = {
  async getChain(productId) {
    try {
      const data = await DB.select('chains', `?product_id=eq.${productId}`);
      if (!data || !data[0]) return null;
      return Blockchain.fromJSON(data[0].chain_data);
    } catch (e) { console.error('getChain error:', e); return null; }
  },

  async saveChain(productId, blockchain) {
    try {
      await DB.upsert('chains', {
        product_id: productId,
        chain_data: blockchain.toJSON()
      });
    } catch (e) { console.error('saveChain error:', e); }
  }
};

// ─── Activity Store (Supabase) ─────────────────────────────
const ActivityStore = {
  async getAll() {
    try {
      const data = await DB.select('activity', '?order=timestamp.desc&limit=50');
      return (data || []).map(a => ({
        id: a.id,
        type: a.type,
        message: a.message,
        productId: a.product_id,
        icon: a.icon,
        timestamp: a.timestamp
      }));
    } catch (e) { console.error('getAll activity error:', e); return []; }
  },

  async add(entry) {
    try {
      await DB.insert('activity', {
        type: entry.type,
        message: entry.message,
        product_id: entry.productId || '',
        icon: entry.icon || '📦'
      });
    } catch (e) { console.error('add activity error:', e); }
  },

  async clear() {
    try {
      await DB.delete('activity', '?id=gt.0');
    } catch (e) { console.error('clear activity error:', e); }
  }
};

// ─── Stats Helper (Supabase) ───────────────────────────────
const StatsHelper = {
  async getStats() {
    try {
      const products = await ProductStore.getAll();
      const chains   = await DB.select('chains');
      let totalTransfers = 0;
      (chains || []).forEach(c => {
        if (c.chain_data && c.chain_data.length > 1)
          totalTransfers += c.chain_data.length - 1;
      });
      return {
        totalProducts:   products.length,
        totalTransfers,
        delivered:       products.filter(p => p.status === 'delivered').length,
        inTransit:       products.filter(p => p.status === 'in_transit').length,
        manufactured:    products.filter(p => p.status === 'manufactured').length
      };
    } catch (e) { console.error('stats error:', e); return { totalProducts:0, totalTransfers:0, delivered:0, inTransit:0, manufactured:0 }; }
  }
};

// ─── Field Mappers ─────────────────────────────────────────
function mapToDB(p) {
  return {
    id:                    p.id,
    name:                  p.name,
    category:              p.category,
    sku:                   p.sku,
    manufacturer:          p.manufacturer,
    manufacturer_location: p.manufacturerLocation,
    description:           p.description,
    status:                p.status,
    current_owner:         p.currentOwner,
    supply_role:           p.currentRole,
    image_emoji:           p.imageEmoji,
    created_at:            p.createdAt,
    last_updated:          new Date().toISOString()
  };
}

function mapFromDB(row) {
  return {
    id:                   row.id,
    name:                 row.name,
    category:             row.category,
    sku:                  row.sku,
    manufacturer:         row.manufacturer,
    manufacturerLocation: row.manufacturer_location,
    description:          row.description,
    status:               row.status,
    currentOwner:         row.current_owner,
    currentRole:          row.supply_role,
    imageEmoji:           row.image_emoji,
    createdAt:            row.created_at,
    lastUpdated:          row.last_updated
  };
}

// ─── Demo Seeder (Supabase version) ───────────────────────
async function seedDemoData() {
  try {
    const existing = await ProductStore.getAll();
    if (existing.length > 0) return; // Already has data

    const demoProducts = [
      {
        id: 'PROD-DEMO001',
        name: 'Apple iPhone 16 Pro',
        category: 'Electronics',
        sku: 'APL-IP16P-BLK',
        manufacturer: 'Apple Inc.',
        manufacturerLocation: { city: 'Shenzhen', country: 'China', lat: 22.5431, lng: 114.0579 },
        description: 'Flagship smartphone with A18 Pro chip',
        status: 'at_retailer',
        currentOwner: 'TechMart Retail',
        currentRole: 'Retailer',
        createdAt: new Date(Date.now() - 7*86400000).toISOString(),
        imageEmoji: '📱'
      },
      {
        id: 'PROD-DEMO002',
        name: 'Pfizer Paracetamol 500mg',
        category: 'Pharmaceuticals',
        sku: 'PFZ-PARA-500',
        manufacturer: 'Pfizer Ltd.',
        manufacturerLocation: { city: 'New York', country: 'USA', lat: 40.7128, lng: -74.0060 },
        description: 'Pain relief medication, batch #PZ2024-09',
        status: 'in_transit',
        currentOwner: 'MedEx Distributors',
        currentRole: 'Distributor',
        createdAt: new Date(Date.now() - 3*86400000).toISOString(),
        imageEmoji: '💊'
      },
      {
        id: 'PROD-DEMO003',
        name: 'Organic Darjeeling Tea',
        category: 'Food & Beverage',
        sku: 'DAR-TEA-250G',
        manufacturer: 'Himalayan Gardens',
        manufacturerLocation: { city: 'Darjeeling', country: 'India', lat: 27.0360, lng: 88.2627 },
        description: 'First flush organic Darjeeling tea, 250g',
        status: 'delivered',
        currentOwner: 'John Smith',
        currentRole: 'Customer',
        createdAt: new Date(Date.now() - 14*86400000).toISOString(),
        imageEmoji: '🍵'
      }
    ];

    const rolesList = [
      { role:'Manufacturer', status:'manufactured', action:'Product Registered',       icon:'🏭' },
      { role:'Distributor',  status:'in_transit',   action:'Dispatched to Distributor', icon:'🚚' },
      { role:'Retailer',     status:'at_retailer',  action:'Received by Retailer',      icon:'🏪' },
      { role:'Customer',     status:'delivered',    action:'Delivered to Customer',      icon:'👤' }
    ];

    const locations = [
      { city:'Shenzhen',  country:'China',  lat:22.5431, lng:114.0579 },
      { city:'Mumbai',    country:'India',  lat:19.0760, lng:72.8777  },
      { city:'Delhi',     country:'India',  lat:28.6139, lng:77.2090  },
      { city:'Bangalore', country:'India',  lat:12.9716, lng:77.5946  }
    ];

    for (const product of demoProducts) {
      await ProductStore.save(product);

      const bc = new Blockchain();
      const roleIdx = getRoleIndex(product.currentRole);
      const genesis = new Block({
        index: 0,
        data: { type:'GENESIS', productId:product.id, productName:product.name,
                manufacturer:product.manufacturer, actor:product.manufacturer,
                role:'Manufacturer', action:'Product Registered',
                location:locations[0], status:'manufactured' },
        previousHash: '0'.repeat(64)
      });
      genesis.hash = '00' + Array.from({length:62}, () => '0123456789abcdef'[Math.floor(Math.random()*16)]).join('');
      bc.chain = [genesis];

      for (let i = 1; i <= roleIdx; i++) {
        const r = rolesList[i];
        const block = new Block({
          index: i,
          data: { type:'TRANSFER', productId:product.id, actor:product.currentOwner,
                  role:r.role, action:r.action,
                  location:locations[Math.min(i, locations.length-1)],
                  status:r.status, notes:'Demo transfer' },
          previousHash: bc.chain[i-1].hash,
          timestamp: new Date(Date.now() - (roleIdx-i)*2*86400000).toISOString()
        });
        block.hash = '00' + Array.from({length:62}, () => '0123456789abcdef'[Math.floor(Math.random()*16)]).join('');
        bc.chain.push(block);
      }

      await ChainStore.saveChain(product.id, bc);
      await ActivityStore.add({
        type: product.status === 'delivered' ? 'delivered' : 'transfer',
        message: `${product.name} — ${product.currentRole} stage`,
        productId: product.id,
        icon: product.imageEmoji
      });
    }
  } catch (e) {
    console.error('Seed error:', e);
  }
}

// ─── Export ────────────────────────────────────────────────
window.ProductStore  = ProductStore;
window.ChainStore    = ChainStore;
window.ActivityStore = ActivityStore;
window.StatsHelper   = StatsHelper;
window.seedDemoData  = seedDemoData;
window.DB            = DB;
