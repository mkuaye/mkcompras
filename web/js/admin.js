const PLATFORM_LABELS = { shopee: 'Shopee', mercadolivre: 'Mercado Livre', amazon: 'Amazon', outros: 'Outros' };

let token = '';
let editingId = null;
let products = [];

// ─── AUTH ────────────────────────────────────────────────────────────
function login() {
  const pw = document.getElementById('admin-pw').value.trim();
  if (!pw) return;
  token = pw;
  fetchProducts();
}

async function fetchProducts() {
  const res = await fetch('/api/products', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (res.status === 401) {
    token = '';
    setError('login-error', 'Senha incorreta.');
    return;
  }
  products = data.products || [];
  showDashboard();
  renderList(products);
}

function showDashboard() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'flex';
  document.getElementById('btn-logout').style.display = 'inline';
}

function logout() {
  token = '';
  editingId = null;
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('btn-logout').style.display = 'none';
  document.getElementById('admin-pw').value = '';
  resetForm();
}

// ─── PRODUCT LIST ─────────────────────────────────────────────────────
function renderList(list) {
  const container = document.getElementById('admin-product-list');
  const empty = document.getElementById('admin-empty');
  document.getElementById('product-count').textContent = products.length;

  if (list.length === 0) {
    container.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  container.innerHTML = list.map((p) => `
    <div class="admin-product-row" data-id="${p.id}">
      ${p.image
        ? `<img class="admin-product-thumb" src="${esc(p.image)}" alt="" loading="lazy" onerror="this.style.display='none'">`
        : `<div class="admin-product-thumb"></div>`}
      <div class="admin-product-info">
        <div class="admin-product-name">${esc(p.name)}</div>
        <div class="admin-product-meta">
          ${PLATFORM_LABELS[p.platform] || p.platform} &bull;
          ${p.category || '—'} &bull;
          ${p.price || 'sem preço'}
          ${p.featured ? ' &bull; ⭐ destaque' : ''}
        </div>
      </div>
      <div class="admin-product-actions">
        <button class="btn-edit" onclick="startEdit('${p.id}')">Editar</button>
        <button class="btn-delete" onclick="deleteProduct('${p.id}')">Excluir</button>
      </div>
    </div>
  `).join('');
}

// ─── CONVERT URL ─────────────────────────────────────────────────────
async function autoConvert() {
  const url = document.getElementById('f-original-url').value.trim();
  const status = document.getElementById('convert-status');
  const btn = document.getElementById('btn-auto-convert');
  const affiliateInput = document.getElementById('f-affiliate-url');
  const platformSel = document.getElementById('f-platform');

  if (!url) { setConvertStatus('Cole a URL do produto primeiro.', 'fail'); return; }

  btn.disabled = true;
  btn.textContent = 'Convertendo...';
  setConvertStatus('', '');

  try {
    const res = await fetch('/api/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();

    if (!res.ok || data.error) {
      setConvertStatus('Conversão automática falhou — cole o link de afiliado manualmente.', 'fail');
    } else {
      affiliateInput.value = data.affiliateUrl;
      setConvertStatus('Link de afiliado gerado com sucesso!', 'ok');

      // auto-detect platform
      try {
        const host = new URL(url).hostname.toLowerCase();
        if (host.includes('shopee')) platformSel.value = 'shopee';
        else if (host.includes('mercadolivre') || host.includes('mercadolibre')) platformSel.value = 'mercadolivre';
        else if (host.includes('amazon') || host.includes('amzn')) platformSel.value = 'amazon';
      } catch {}
    }
  } catch {
    setConvertStatus('Erro de conexão. Cole o link de afiliado manualmente.', 'fail');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Gerar link afiliado';
  }
}

function setConvertStatus(msg, type) {
  const el = document.getElementById('convert-status');
  el.textContent = msg;
  el.className = `convert-status ${type}`;
}

// ─── SAVE PRODUCT ─────────────────────────────────────────────────────
async function saveProduct() {
  const btn = document.getElementById('btn-save');
  setError('form-error', '');

  const body = {
    originalUrl: v('f-original-url'),
    affiliateUrl: v('f-affiliate-url'),
    name: v('f-name'),
    description: v('f-description'),
    image: v('f-image'),
    price: v('f-price'),
    category: v('f-category'),
    platform: v('f-platform'),
    featured: document.getElementById('f-featured').checked,
  };

  if (!body.originalUrl) { setError('form-error', 'URL original é obrigatória.'); return; }
  if (!body.name)         { setError('form-error', 'Nome do produto é obrigatório.'); return; }

  btn.disabled = true;
  btn.textContent = 'Salvando...';

  try {
    const method = editingId ? 'PUT' : 'POST';
    if (editingId) body.id = editingId;

    const res = await fetch('/api/products', {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      setError('form-error', data.error || 'Erro ao salvar.');
      return;
    }

    if (editingId) {
      const idx = products.findIndex((p) => p.id === editingId);
      if (idx >= 0) products[idx] = data;
    } else {
      products.push(data);
    }

    resetForm();
    renderList(products);
  } catch {
    setError('form-error', 'Erro de conexão. Tente novamente.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Salvar produto';
  }
}

// ─── EDIT / DELETE ────────────────────────────────────────────────────
function startEdit(id) {
  const p = products.find((x) => x.id === id);
  if (!p) return;
  editingId = id;

  set('f-original-url', p.originalUrl || '');
  set('f-affiliate-url', p.affiliateUrl || '');
  set('f-name', p.name || '');
  set('f-description', p.description || '');
  set('f-image', p.image || '');
  set('f-price', p.price || '');
  set('f-category', p.category || '');
  set('f-platform', p.platform || '');
  document.getElementById('f-featured').checked = Boolean(p.featured);
  document.getElementById('form-title').textContent = 'Editar produto';
  document.getElementById('btn-cancel').style.display = 'inline';
  previewImage(p.image || '');
  document.getElementById('f-original-url').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function deleteProduct(id) {
  if (!confirm('Excluir este produto?')) return;
  const res = await fetch(`/api/products?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.ok) {
    products = products.filter((p) => p.id !== id);
    renderList(products);
  }
}

function resetForm() {
  editingId = null;
  ['f-original-url','f-affiliate-url','f-name','f-description','f-image','f-price','f-category'].forEach((id) => set(id, ''));
  set('f-platform', '');
  document.getElementById('f-featured').checked = false;
  document.getElementById('form-title').textContent = 'Adicionar produto';
  document.getElementById('btn-cancel').style.display = 'none';
  document.getElementById('img-preview-wrap').style.display = 'none';
  setConvertStatus('', '');
  setError('form-error', '');
}

function previewImage(url) {
  const wrap = document.getElementById('img-preview-wrap');
  if (!url) { wrap.style.display = 'none'; return; }
  document.getElementById('img-preview').src = url;
  wrap.style.display = 'block';
}

// ─── SEARCH ───────────────────────────────────────────────────────────
function adminSearch(q) {
  const lower = q.toLowerCase();
  renderList(
    lower
      ? products.filter((p) => p.name.toLowerCase().includes(lower) || (p.category || '').toLowerCase().includes(lower))
      : products
  );
}

// ─── HELPERS ──────────────────────────────────────────────────────────
function v(id) { return document.getElementById(id).value.trim(); }
function set(id, val) { document.getElementById(id).value = val; }
function setError(id, msg) { document.getElementById(id).textContent = msg; }
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ─── INIT ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-login').addEventListener('click', login);
  document.getElementById('admin-pw').addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
  document.getElementById('btn-logout').addEventListener('click', logout);
  document.getElementById('btn-auto-convert').addEventListener('click', autoConvert);
  document.getElementById('btn-save').addEventListener('click', saveProduct);
  document.getElementById('btn-cancel').addEventListener('click', resetForm);
  document.getElementById('admin-search').addEventListener('input', (e) => adminSearch(e.target.value));
  document.getElementById('f-image').addEventListener('blur', (e) => previewImage(e.target.value.trim()));
});
