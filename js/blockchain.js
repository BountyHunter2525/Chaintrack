// ============================================================
// blockchain.js — Core Blockchain Engine
// Supply Chain Tracker | SHA-256 + Proof-of-Work simulation
// ============================================================

const DIFFICULTY = 2; // Number of leading zeros required

// SHA-256 hash using Web Crypto API
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Block Class ───────────────────────────────────────────
class Block {
  constructor({ index, timestamp, data, previousHash = '0' }) {
    this.index = index;
    this.timestamp = timestamp || new Date().toISOString();
    this.data = data;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.hash = '';
  }

  async calculateHash() {
    const content = `${this.index}${this.timestamp}${JSON.stringify(this.data)}${this.previousHash}${this.nonce}`;
    return await sha256(content);
  }

  async mine(difficulty) {
    const target = '0'.repeat(difficulty);
    do {
      this.nonce++;
      this.hash = await this.calculateHash();
    } while (!this.hash.startsWith(target));
    return this.hash;
  }
}

// ─── Blockchain Class ──────────────────────────────────────
class Blockchain {
  constructor() {
    this.chain = [];
  }

  async createGenesisBlock(productData) {
    const block = new Block({
      index: 0,
      data: {
        type: 'GENESIS',
        ...productData,
        actor: productData.manufacturer,
        role: 'Manufacturer',
        action: 'Product Registered',
        location: productData.location || { city: 'Factory', country: 'Unknown', lat: 0, lng: 0 },
        status: 'manufactured'
      },
      previousHash: '0000000000000000000000000000000000000000000000000000000000000000'
    });
    await block.mine(DIFFICULTY);
    this.chain = [block];
    return block;
  }

  async addBlock(data) {
    const previousBlock = this.chain[this.chain.length - 1];
    const block = new Block({
      index: this.chain.length,
      data: { type: 'TRANSFER', ...data },
      previousHash: previousBlock.hash
    });
    await block.mine(DIFFICULTY);
    this.chain.push(block);
    return block;
  }

  async isValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];

      // Check hash linkage
      if (current.previousHash !== previous.hash) return false;

      // Recompute hash
      const recomputed = await (async () => {
        const content = `${current.index}${current.timestamp}${JSON.stringify(current.data)}${current.previousHash}${current.nonce}`;
        return await sha256(content);
      })();

      if (current.hash !== recomputed) return false;
    }
    return true;
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  toJSON() {
    return this.chain.map(b => ({
      index: b.index,
      timestamp: b.timestamp,
      data: b.data,
      previousHash: b.previousHash,
      hash: b.hash,
      nonce: b.nonce
    }));
  }

  static fromJSON(jsonChain) {
    const bc = new Blockchain();
    bc.chain = jsonChain.map(b => {
      const block = new Block(b);
      block.hash = b.hash;
      block.nonce = b.nonce;
      return block;
    });
    return bc;
  }
}

// ─── Supply Chain Roles (ordered pipeline) ────────────────
const SUPPLY_CHAIN_ROLES = [
  { role: 'Manufacturer', status: 'manufactured', action: 'Product Manufactured', icon: '🏭', color: '#6366f1' },
  { role: 'Distributor',  status: 'in_transit',   action: 'Dispatched to Distributor', icon: '🚚', color: '#f59e0b' },
  { role: 'Retailer',     status: 'at_retailer',  action: 'Received by Retailer', icon: '🏪', color: '#10b981' },
  { role: 'Customer',     status: 'delivered',    action: 'Delivered to Customer', icon: '👤', color: '#3b82f6' }
];

function getRoleIndex(role) {
  return SUPPLY_CHAIN_ROLES.findIndex(r => r.role === role);
}

function getNextRole(currentRole) {
  const idx = getRoleIndex(currentRole);
  return idx < SUPPLY_CHAIN_ROLES.length - 1 ? SUPPLY_CHAIN_ROLES[idx + 1] : null;
}

// Export to global scope
window.Block = Block;
window.Blockchain = Blockchain;
window.SUPPLY_CHAIN_ROLES = SUPPLY_CHAIN_ROLES;
window.getRoleIndex = getRoleIndex;
window.getNextRole = getNextRole;
window.DIFFICULTY = DIFFICULTY;
