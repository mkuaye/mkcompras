const PLATFORM_LABELS = {
  shopee: 'Shopee',
  mercadolivre: 'Mercado Livre',
  amazon: 'Amazon',
  outros: 'Outros',
};

let allProducts = [];
let allCategories = [];
let activePlatform = '';
let activeCategory = '';
let searchQuery = '';

async function loadProducts() {
  const grid = document.getElementById('product-grid');
  const loading = document.getElementById('loading-state');
  const empty = document.getElementById('empty-state');

  loading.style.display = 'flex';
  grid.innerHTML = '';
  empty.style.display = 'none';

  try {
    const res = await fetch('/api/products');
    const data = await res.json();
    allProducts = data.products || [];
    allCategories = data.categories || [];
    populateCategories();
    renderProducts();
  } catch {
    empty.querySelector('#empty-msg').textContent = 'Erro ao carregar produtos. Tente novamente.';
    empty.style.display = 'block';
  } finally {
    loading.style.display = 'none';
  }
}

function populateCategories() {
  const sel = document.getElementById('category-select');
  sel.innerHTML = '<option value="">Todas as categorias</option>';
  allCategories.forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
    sel.appendChild(opt);
  });
}

function renderProducts() {
  const grid = document.getElementById('product-grid');
  const empty = document.getElementById('empty-state');

  let filtered = allProducts.filter((p) => {
    const matchPlatform = !activePlatform || p.platform === activePlatform;
    const matchCategory = !activeCategory || p.category === activeCategory;
    const matchSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery) ||
      (p.description || '').toLowerCase().includes(searchQuery);
    return matchPlatform && matchCategory && matchSearch;
  });

  grid.innerHTML = '';

  if (filtered.length === 0) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  filtered.forEach((p) => {
    grid.appendChild(buildCard(p));
  });
}

function buildCard(p) {
  const a = document.createElement('a');
  a.className = 'product-card';
  a.href = p.affiliateUrl;
  a.target = '_blank';
  a.rel = 'noopener noreferrer sponsored';

  const platform = p.platform || 'outros';
  const label = PLATFORM_LABELS[platform] || platform;

  const imgHtml = p.image
    ? `<img src="${escHtml(p.image)}" alt="${escHtml(p.name)}" loading="lazy" onerror="this.parentElement.innerHTML='<svg class=product-img-placeholder viewBox=\\'0 0 48 48\\' fill=\\'none\\'><rect width=\\'48\\' height=\\'48\\' rx=\\'8\\' fill=\\'currentColor\\' opacity=\\'.1\\'/></svg>'" />`
    : `<svg class="product-img-placeholder" viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="8" fill="currentColor" opacity=".1"/><path d="M16 32l8-10 6 7 4-5 6 8H8l8-10z" fill="currentColor" opacity=".3"/></svg>`;

  a.innerHTML = `
    <div class="product-img-wrap">${imgHtml}</div>
    <div class="product-body">
      <span class="platform-badge badge-${platform}">
        <span class="dot dot-${platform === 'mercadolivre' ? 'ml' : platform}"></span>
        ${escHtml(label)}
      </span>
      <div class="product-name">${escHtml(p.name)}</div>
      ${p.description ? `<div class="product-description">${escHtml(p.description)}</div>` : ''}
      <div class="product-footer">
        ${p.price ? `<span class="product-price">${escHtml(p.price)}</span>` : '<span></span>'}
        <span class="btn-view">Ver produto →</span>
      </div>
    </div>`;

  return a;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function initControls() {
  document.getElementById('search').addEventListener('input', (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    renderProducts();
  });

  document.getElementById('category-select').addEventListener('change', (e) => {
    activeCategory = e.target.value;
    renderProducts();
  });

  document.getElementById('platform-filters').addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    activePlatform = btn.dataset.platform;
    renderProducts();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initControls();
  loadProducts();
});
