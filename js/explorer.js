// ============================================================
// explorer.js — Blockchain Ledger Explorer
// ============================================================

async function renderExplorer() {
  const [chains, products] = await Promise.all([
    DB.select('chains'),
    ProductStore.getAll()
  ]);
  const productMap = {};
  products.forEach(p => productMap[p.id] = p);

  // Extract all blocks from all chains
  let allBlocks = [];
  (chains || []).forEach(c => {
    if (c.chain_data) {
      c.chain_data.forEach(blockData => {
        // blockData is a JSON block. We attach the productId for reference.
        allBlocks.push({
          productId: c.product_id,
          productName: productMap[c.product_id]?.name || 'Unknown Product',
          productEmoji: productMap[c.product_id]?.imageEmoji || '📦',
          ...blockData
        });
      });
    }
  });

  // Sort chronologically (newest first)
  allBlocks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">⛓️ Blockchain Explorer</h1>
        <p class="page-subtitle">Decentralized network ledger</p>
      </div>
      <div class="header-actions">
        <span class="badge badge-green">Network Status: Online</span>
      </div>
    </div>

    <div class="explorer-stats" style="display:flex; gap:16px; margin-bottom:24px;">
      <div class="card" style="flex:1; padding:16px;">
        <div style="font-size:12px; color:var(--text-muted); text-transform:uppercase;">Total Blocks</div>
        <div style="font-size:24px; font-weight:bold;">${allBlocks.length}</div>
      </div>
      <div class="card" style="flex:1; padding:16px;">
        <div style="font-size:12px; color:var(--text-muted); text-transform:uppercase;">Consensus Algorithm</div>
        <div style="font-size:24px; font-weight:bold;">PoW (SHA-256)</div>
      </div>
      <div class="card" style="flex:1; padding:16px;">
        <div style="font-size:12px; color:var(--text-muted); text-transform:uppercase;">Difficulty Target</div>
        <div style="font-size:24px; font-weight:bold;">${window.DIFFICULTY || 3} Zeros</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Latest Blocks</h3>
      </div>
      <div class="explorer-table-wrapper" style="overflow-x:auto;">
        <table class="table" style="width:100%; text-align:left; border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1px solid var(--border-color);">
              <th style="padding:12px; color:var(--text-muted); font-weight:600; font-size:12px;">Height</th>
              <th style="padding:12px; color:var(--text-muted); font-weight:600; font-size:12px;">Age</th>
              <th style="padding:12px; color:var(--text-muted); font-weight:600; font-size:12px;">Product</th>
              <th style="padding:12px; color:var(--text-muted); font-weight:600; font-size:12px;">Type</th>
              <th style="padding:12px; color:var(--text-muted); font-weight:600; font-size:12px;">Hash</th>
              <th style="padding:12px; color:var(--text-muted); font-weight:600; font-size:12px;">Nonce</th>
            </tr>
          </thead>
          <tbody>
            ${allBlocks.map(b => {
              const age = getTimeAgo(b.timestamp);
              return `
                <tr style="border-bottom:1px solid var(--border-color); font-size:14px; transition:background 0.2s;">
                  <td style="padding:12px;">
                    <span class="badge" style="background:#3b82f622; color:#3b82f6;">#${b.index}</span>
                  </td>
                  <td style="padding:12px; color:var(--text-secondary);">${age}</td>
                  <td style="padding:12px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                      <span>${b.productEmoji}</span>
                      <a href="#product:${b.productId}" onclick="Router.navigate('detail', {productId:'${b.productId}'}); return false;" style="color:var(--text-primary); text-decoration:none; font-weight:500;">
                        ${b.productName}
                      </a>
                    </div>
                  </td>
                  <td style="padding:12px;">${b.data.type || 'TRANSFER'}</td>
                  <td style="padding:12px;">
                    <div style="font-family:monospace; color:var(--accent-green); background:#10b98111; padding:4px 8px; border-radius:4px; font-size:12px;">
                      ${b.hash.substring(0, 16)}...
                    </div>
                  </td>
                  <td style="padding:12px; font-family:monospace; color:var(--text-secondary);">${b.nonce}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function getTimeAgo(dateString) {
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " mins ago";
  if (seconds < 10) return "Just now";
  return Math.floor(seconds) + " secs ago";
}

window.renderExplorer = renderExplorer;
