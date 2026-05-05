// Client-side JavaScript for SLAM DUNKS POS

let products = [];
let cart = [];
let salesTransactions = [];
let currentCustomer = null;
let currentRole = 'Cashier';
let currentUser = { username: 'Guest', role: 'Cashier' };
let isAuthenticated = false;
let accounts = [
  { username: 'admin', password: 'admin', role: 'Admin' },
  { username: 'cashier', password: 'cashier', role: 'Cashier' }
];
let salesChart;
let dashboardPieChart;

const sizes = [
  'US 6 / ASIA 24',
  'US 7 / ASIA 25',
  'US 8 / ASIA 26',
  'US 9 / ASIA 27',
  'US 10 / ASIA 28',
  'US 11 / ASIA 29',
  'US 12 / ASIA 30'
];
const colors = ['Black', 'White', 'Red', 'Gray', 'Blue', 'Gold'];

const categories = [
  { prefix: 'Sport Runner', category: 'Running', basePrice: 1350 },
  { prefix: 'Urban Street', category: 'Casual', basePrice: 1180 },
  { prefix: 'Classic Leather', category: 'Formal', basePrice: 1850 },
  { prefix: 'Hoop Kicks', category: 'Basketball', basePrice: 1620 },
  { prefix: 'Slide Comfort', category: 'Sandals', basePrice: 980 },
  { prefix: 'Model Slip-On', category: 'Modeling', basePrice: 1490 }
];

const sampleProducts = [];

categories.forEach(({ prefix, category, basePrice }, indexGroup) => {
  for (let i = 1; i <= 15; i += 1) {
    const id = indexGroup * 15 + i;
    sampleProducts.push({
      id,
      barcode: `SD${String(id).padStart(5, '0')}`,
      code: `${prefix.split(' ')[0].toUpperCase().slice(0, 3)}-${String(i).padStart(2, '0')}`,
      name: `${prefix} ${String(i).padStart(2, '0')}`,
      category,
      size: sizes[i % sizes.length],
      color: colors[i % colors.length],
      price: basePrice + ((i % 6) * 120),
      stock: 4 + ((i * 3) % 10),
      productCode: `SD${indexGroup + 1}-${String(i).padStart(2, '0')}`
    });
  }
});

const lowStockThreshold = 5;

function buildProductData() {
  products = [...sampleProducts];
  renderCategoryChips();
  displayProducts(products);
  updateDashboard();
  renderSalesChart();
  renderDashboardPie();
  updateReports();
  updateStockGrid();
  displayReturnTransactions();
}

function renderCategoryChips() {
  const chipRow = document.getElementById('categoryChips');
  if (!chipRow) return;
  const categoriesList = ['All', 'Running', 'Casual', 'Basketball', 'Formal', 'Sandals', 'Modeling'];
  chipRow.innerHTML = '';
  categoriesList.forEach(category => {
    const chip = document.createElement('button');
    chip.className = `chip ${category === 'All' ? 'active' : ''}`;
    chip.textContent = category;
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      document.getElementById('search').value = '';
      document.getElementById('categoryFilter').value = category === 'All' ? 'all' : category;
      searchProducts();
    });
    chipRow.appendChild(chip);
  });
}

function displayProducts(prods) {
  const container = document.getElementById('products');
  container.innerHTML = '';
  if (!prods.length) {
    container.innerHTML = '<p class="empty-state">No products match your filters.</p>';
    return;
  }

  prods.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <div class="badge">${product.category}</div>
      <h3>${product.name}</h3>
      <div class="product-meta">
        <span>Code: ${product.productCode}</span>
        <span>Barcode: ${product.barcode}</span>
        <span>Size: ${product.size}</span>
        <span>Color: ${product.color}</span>
        <span class="stock">Stock: ${product.stock}</span>
      </div>
      <div class="price">\u20B1${product.price.toLocaleString()}</div>
      <button ${product.stock <= 0 ? 'disabled' : ''} onclick="addToCart(${product.id})">Add to cart</button>
    `;
    container.appendChild(card);
  });
}

function getFilteredProducts() {
  const query = document.getElementById('search').value.toLowerCase().trim();
  const category = document.getElementById('categoryFilter').value;
  return products.filter(product => {
    const matchesQuery = [product.name, product.productCode, product.barcode, product.category, product.color, product.size]
      .some(field => field.toLowerCase().includes(query));
    const matchesCategory = category === 'all' || product.category === category;
    return matchesQuery && matchesCategory;
  });
}

function searchProducts() {
  const filtered = getFilteredProducts();
  displayProducts(filtered);
}

function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product || product.stock <= 0) {
    showToast('Product is out of stock');
    return;
  }

  const cartItem = cart.find(item => item.product.id === productId);
  if (cartItem) {
    cartItem.quantity += 1;
  } else {
    cart.push({ product, quantity: 1 });
  }

  updateCart();
}

function adjustQuantity(productId, delta) {
  const cartItem = cart.find(item => item.product.id === productId);
  if (!cartItem) return;
  cartItem.quantity += delta;
  if (cartItem.quantity <= 0) {
    cart = cart.filter(item => item.product.id !== productId);
  }
  updateCart();
}

function updateCart() {
  const list = document.getElementById('cartItems');
  list.innerHTML = '';
  let total = 0;

  cart.forEach(item => {
    const li = document.createElement('li');
    const subtotal = item.product.price * item.quantity;
    total += subtotal;
    li.innerHTML = `
      <div>${item.product.name}</div>
      <div class="quantity-control">
        <button onclick="adjustQuantity(${item.product.id}, -1)">-</button>
        <span>${item.quantity}</span>
        <button onclick="adjustQuantity(${item.product.id}, 1)">+</button>
      </div>
      <div>\u20B1${subtotal.toLocaleString()}</div>
    `;
    list.appendChild(li);
  });

  document.getElementById('cartTotal').textContent = `\u20B1${total.toLocaleString()}`;
  calculateChange();
}

function saveCustomer() {
  const name = document.getElementById('customerName').value.trim();
  const contact = document.getElementById('customerContact').value.trim();
  if (!name || !contact) {
    showToast('Enter customer name and contact number');
    return;
  }
  currentCustomer = { name, contact, history: currentCustomer?.history || [] };
  document.getElementById('customerLabel').textContent = `${name} • ${contact}`;
  document.getElementById('customerHistoryLabel').textContent = 'Recent purchases';
  displayCustomerHistory();
  showToast('Customer saved successfully');
}

function displayCustomerHistory() {
  const historyList = document.getElementById('customerHistory');
  historyList.innerHTML = '';
  if (!currentCustomer || !currentCustomer.history.length) {
    historyList.innerHTML = '<li>No purchase history yet.</li>';
    return;
  }
  currentCustomer.history.slice(-5).reverse().forEach(entry => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${entry.date}</strong><br>${entry.items}<br>\u20B1${entry.total.toLocaleString()} • ${entry.method}`;
    historyList.appendChild(li);
  });
}

function checkout() {
  if (!cart.length) {
    showToast('Cart is empty');
    return;
  }

  const paymentMethod = document.getElementById('paymentMethod').value;
  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const tendered = parseFloat(document.getElementById('tenderedAmount').value) || 0;
  if (tendered < total) {
    showToast('Tendered amount must cover total price');
    return;
  }

  const date = new Date().toLocaleString();
  const transaction = {
    date,
    items: cart.map(item => ({ productId: item.product.id, name: item.product.name, quantity: item.quantity, price: item.product.price })),
    quantity: cart.reduce((sum, item) => sum + item.quantity, 0),
    total,
    method: paymentMethod,
    customer: currentCustomer ? { ...currentCustomer } : null
  };

  cart.forEach(item => {
    item.product.stock = Math.max(0, item.product.stock - item.quantity);
  });

  salesTransactions.unshift(transaction);
  if (currentCustomer) {
    currentCustomer.history.push({ date, items: transaction.items.map(i => `${i.name} x${i.quantity}`).join(', '), total, method: paymentMethod });
  }

  cart = [];
  updateCart();
  document.getElementById('tenderedAmount').value = '';
  document.getElementById('changeAmount').textContent = '\u20B1 0';
  updateDashboard();
  updateReports();
  renderSalesChart();
  updateStockGrid();
  displayCustomerHistory();
  displayReturnTransactions();
  showToast('Sale complete. Receipt ready.');
}

function calculateChange() {
  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const tendered = parseFloat(document.getElementById('tenderedAmount').value) || 0;
  const change = Math.max(0, tendered - total);
  document.getElementById('changeAmount').textContent = `\u20B1${change.toLocaleString()}`;
}

function printReceipt() {
  const transaction = salesTransactions[0];
  if (!transaction) {
    showToast('No receipt available yet');
    return;
  }
  const receiptWindow = window.open('', '_blank', 'width=420,height=760');
  const itemsHtml = transaction.items.map(item => `<div class="item">${item.name} x${item.quantity} - \u20B1${(item.price * item.quantity).toLocaleString()}</div>`).join('');
  receiptWindow.document.write(`
    <html>
      <head>
        <title>SLAM DUNKS Receipt</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #111; background: #f8fafc; }
          h2 { margin-top: 0; color: #0f172a; }
          .item { margin-bottom: 10px; }
          .line { margin: 14px 0; border-bottom: 1px solid #d1d5db; }
          .total { margin-top: 16px; font-size: 1.1rem; font-weight: 700; }
        </style>
      </head>
      <body>
        <h2>SLAM DUNKS</h2>
        <p>${transaction.date}</p>
        <p>Payment: ${transaction.method}</p>
        <div class="line"></div>
        ${itemsHtml}
        <div class="line"></div>
        <div class="total">Total: \u20B1${transaction.total.toLocaleString()}</div>
      </body>
    </html>
  `);
  receiptWindow.document.close();
  receiptWindow.focus();
  receiptWindow.onload = () => receiptWindow.print();
}

function updateDashboard() {
  const totalProducts = products.length;
  const lowStockCount = products.filter(product => product.stock <= lowStockThreshold).length;
  const totalRevenue = salesTransactions.reduce((sum, txn) => sum + txn.total, 0);
  const bestSeller = computeBestSeller();

  document.getElementById('totalProducts').textContent = totalProducts;
  document.getElementById('lowStock').textContent = lowStockCount;
  document.getElementById('salesToday').textContent = `\u20B1${totalRevenue.toLocaleString()}`;
  document.getElementById('bestSeller').textContent = bestSeller || '-';
  renderSuggestedItems();
  renderRestockAlerts();
  renderRecentSales();
  renderDashboardPie();
}

function computeBestSeller() {
  const counts = {};
  salesTransactions.forEach(txn => {
    txn.items.forEach(item => {
      counts[item.name] = (counts[item.name] || 0) + item.quantity;
    });
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function renderSuggestedItems() {
  const list = document.getElementById('suggestedItems');
  list.innerHTML = '';
  const suggestions = products
    .filter(product => product.stock > lowStockThreshold && product.stock <= lowStockThreshold + 3)
    .slice(0, 5);
  suggestions.forEach(product => {
    const li = document.createElement('li');
    li.textContent = `${product.name} • ${product.stock} left`;
    list.appendChild(li);
  });
  if (!suggestions.length) list.innerHTML = '<li>Inventory looks stable.</li>';
}

function renderRestockAlerts() {
  const list = document.getElementById('restockAlerts');
  list.innerHTML = '';
  const alerts = products.filter(product => product.stock <= lowStockThreshold);
  alerts.forEach(product => {
    const li = document.createElement('li');
    li.textContent = `${product.name} • ${product.stock} left`;
    list.appendChild(li);
  });
  if (!alerts.length) list.innerHTML = '<li>No restock alerts.</li>';
}

function renderRecentSales() {
  const list = document.getElementById('recentSaleList');
  list.innerHTML = '';
  const recent = salesTransactions.slice(0, 5);
  recent.forEach(txn => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${txn.date}</strong><br>${txn.items.map(item => `${item.name} x${item.quantity}`).join(', ')}<br>\u20B1${txn.total.toLocaleString()}`;
    list.appendChild(li);
  });
  if (!recent.length) list.innerHTML = '<li>No sales yet.</li>';
}

function updateReports() {
  const totalRevenue = salesTransactions.reduce((sum, txn) => sum + txn.total, 0);
  document.getElementById('totalRevenue').textContent = `\u20B1${totalRevenue.toLocaleString()}`;
  document.getElementById('bestSellingItem').textContent = computeBestSeller() || '-';

  const now = new Date();
  const daily = salesTransactions
    .filter(tx => new Date(tx.date).toDateString() === now.toDateString())
    .reduce((sum, tx) => sum + tx.total, 0);
  const weekly = salesTransactions
    .filter(tx => isSameWeek(new Date(tx.date), now))
    .reduce((sum, tx) => sum + tx.total, 0);
  const monthly = salesTransactions
    .filter(tx => {
      const date = new Date(tx.date);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    })
    .reduce((sum, tx) => sum + tx.total, 0);

  document.getElementById('dailyRevenue').textContent = `\u20B1${daily.toLocaleString()}`;
  document.getElementById('weeklyRevenue').textContent = `\u20B1${weekly.toLocaleString()}`;
  document.getElementById('monthlyRevenue').textContent = `\u20B1${monthly.toLocaleString()}`;
}

function isSameWeek(date, now) {
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  return date >= startOfWeek && date <= now;
}

function renderDashboardPie() {
  const categoryTotals = {};
  salesTransactions.forEach(tx => {
    tx.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      const category = product?.category || 'Unknown';
      categoryTotals[category] = (categoryTotals[category] || 0) + item.price * item.quantity;
    });
  });

  const labels = Object.keys(categoryTotals).length ? Object.keys(categoryTotals) : ['No Sales'];
  const values = labels.map(label => categoryTotals[label] || 0);
  const ctx = document.getElementById('dashboardPie')?.getContext('2d');
  if (!ctx) return;

  if (dashboardPieChart) {
    dashboardPieChart.data.labels = labels;
    dashboardPieChart.data.datasets[0].data = values;
    dashboardPieChart.update();
    return;
  }

  dashboardPieChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: ['#38bdf8', '#818cf8', '#f472b6', '#34d399', '#fbbf24', '#60a5fa'],
        borderColor: '#020617',
        borderWidth: 2
      }]
    },
    options: {
      plugins: {
        legend: { position: 'bottom', labels: { color: '#f8fafc' } }
      }
    }
  });
}

function renderSalesChart() {
  const categoryTotals = {};
  salesTransactions.forEach(tx => {
    tx.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      const category = product?.category || 'Unknown';
      categoryTotals[category] = (categoryTotals[category] || 0) + item.price * item.quantity;
    });
  });

  const labels = Object.keys(categoryTotals).length ? Object.keys(categoryTotals) : ['No Data'];
  const values = labels.map(label => categoryTotals[label] || 0);
  const ctx = document.getElementById('salesChart').getContext('2d');

  if (salesChart) {
    salesChart.data.labels = labels;
    salesChart.data.datasets[0].data = values;
    salesChart.update();
    return;
  }

  salesChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: ['#ef4444', '#f97316', '#22c55e', '#38bdf8', '#c084fc', '#facc15'],
        borderColor: '#0f172a',
        borderWidth: 2
      }]
    },
    options: {
      plugins: {
        legend: { labels: { color: '#f8fafc' } }
      }
    }
  });
}

function updateStockGrid() {
  const stockGrid = document.getElementById('stockGrid');
  stockGrid.innerHTML = '';
  products.slice(0, 6).forEach(product => {
    const div = document.createElement('div');
    div.className = 'stock-item';
    div.innerHTML = `
      <h4>${product.name}</h4>
      <span>Stock: ${product.stock}</span>
      <span>Price: \u20B1${product.price.toLocaleString()}</span>
      <span>Category: ${product.category}</span>
    `;
    stockGrid.appendChild(div);
  });
}

function displayReturnTransactions() {
  const list = document.getElementById('returnTransactionList');
  if (!list) return;
  list.innerHTML = '';
  const visible = salesTransactions.slice(0, 5);
  visible.forEach((txn, index) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${txn.date}</strong><br>${txn.items.map(item => `${item.name} x${item.quantity}`).join(', ')}<br>\u20B1${txn.total.toLocaleString()} • ${txn.method}`;
    const button = document.createElement('button');
    button.textContent = 'Refund';
    button.className = 'secondary';
    button.addEventListener('click', () => processRefund(index));
    button.disabled = currentRole !== 'Admin';
    li.appendChild(button);
    list.appendChild(li);
  });
  if (!visible.length) {
    list.innerHTML = '<li>No completed sales to refund.</li>';
  }
}

function processRefund(index) {
  if (currentRole !== 'Admin') {
    showToast('Only Admin can process refunds.');
    return;
  }
  const transaction = salesTransactions[index];
  if (!transaction) return;
  transaction.items.forEach(item => {
    const product = products.find(p => p.id === item.productId);
    if (product) product.stock += item.quantity;
  });
  salesTransactions.splice(index, 1);
  updateDashboard();
  updateReports();
  renderSalesChart();
  updateStockGrid();
  displayProducts(getFilteredProducts());
  displayReturnTransactions();
  showToast('Refund processed and inventory updated.');
}

function setupWheelScroll() {
  const container = document.getElementById('products');
  if (!container) return;
  container.addEventListener('wheel', event => {
    if (Math.abs(event.deltaX) < Math.abs(event.deltaY)) {
      event.preventDefault();
      container.scrollLeft += event.deltaY;
    }
  });
}

function refreshAccountDisplay() {
  const miniLabel = document.getElementById('miniAccountLabel');
  if (miniLabel) miniLabel.textContent = currentUser.username;
  currentRole = currentUser.role;
  displayReturnTransactions();
}

function getLoginCredentials() {
  const name = document.getElementById('overlayAccountName')?.value.trim() || '';
  const password = document.getElementById('overlayAccountPass')?.value || '';
  return { name, password };
}

function getCreateAccountValues() {
  const name = document.getElementById('overlayNewName')?.value.trim() || document.getElementById('flyoutNewName')?.value.trim() || '';
  const password = document.getElementById('overlayNewPass')?.value || document.getElementById('flyoutNewPass')?.value || '';
  const email = document.getElementById('overlayNewEmail')?.value.trim() || document.getElementById('flyoutNewEmail')?.value.trim() || '';
  return { name, password, email };
}

function clearCreateInputs() {
  ['overlayNewName', 'overlayNewPass', 'overlayNewEmail', 'flyoutNewName', 'flyoutNewPass', 'flyoutNewEmail'].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.value = '';
  });
}

function showAppInterface() {
  isAuthenticated = true;
  document.body.classList.add('authenticated');
  document.getElementById('loginOverlay').classList.remove('active');
  document.querySelector('.header-controls')?.classList.remove('hidden');
  document.querySelector('.tabs')?.classList.remove('hidden');
  document.querySelector('.tab-content')?.classList.remove('hidden');
  document.getElementById('accountMini')?.classList.remove('hidden');
  refreshAccountDisplay();
}

function hideAppInterface() {
  isAuthenticated = false;
  document.body.classList.remove('authenticated');
  document.getElementById('loginOverlay').classList.add('active');
  document.querySelector('.header-controls')?.classList.add('hidden');
  document.querySelector('.tabs')?.classList.add('hidden');
  document.querySelector('.tab-content')?.classList.add('hidden');
  document.getElementById('accountMini')?.classList.add('hidden');
  document.getElementById('accountCreateFlyout')?.classList.add('hidden');
  showLoginForm();
}

function showLoginForm() {
  document.getElementById('loginForm')?.classList.remove('hidden');
  document.getElementById('createOverlay')?.classList.add('hidden');
}

function showCreateOverlay() {
  document.getElementById('loginForm')?.classList.add('hidden');
  document.getElementById('createOverlay')?.classList.remove('hidden');
}

function hideCreateOverlay() {
  document.getElementById('createOverlay')?.classList.add('hidden');
  document.getElementById('loginForm')?.classList.remove('hidden');
}

function showCreateAccountForm() {
  if (!isAuthenticated) {
    showCreateOverlay();
    return;
  }
  document.getElementById('accountCreateFlyout')?.classList.remove('hidden');
}

function hideCreateAccountForm() {
  document.getElementById('accountCreateFlyout')?.classList.add('hidden');
}

function loginAccount() {
  const { name, password } = getLoginCredentials();
  if (!name || !password) {
    showToast('Enter username and password to log in');
    return;
  }
  const account = accounts.find(acc => acc.username === name && acc.password === password);
  if (!account) {
    showToast('Account not found or password incorrect');
    return;
  }
  currentUser = { username: account.username, role: account.role };
  showAppInterface();
  showToast(`Logged in as ${account.username} (${account.role})`);
}

function submitCreateAccount() {
  const { name, password, email } = getCreateAccountValues();
  if (!name || !password || !email) {
    showToast('Enter username, password, and email to create an account');
    return;
  }
  if (accounts.some(acc => acc.username === name)) {
    showToast('Username already exists');
    return;
  }
  accounts.push({ username: name, password, role: 'Cashier', email });
  showToast(`Account created: ${name}. Please log in to continue.`);
  clearCreateInputs();
  if (isAuthenticated) {
    hideCreateAccountForm();
  } else {
    hideCreateOverlay();
  }
}

function logoutAccount() {
  currentUser = { username: 'Guest', role: 'Cashier' };
  refreshAccountDisplay();
  hideAppInterface();
  showToast('Logged out');
}

function setColorMode(mode) {
  document.body.classList.remove('dark-mode', 'light-mode');
  if (mode === 'light') {
    document.body.classList.add('light-mode');
  } else {
    document.body.classList.add('dark-mode');
  }
  document.getElementById('darkModeBtn')?.classList.toggle('active', mode === 'dark');
  document.getElementById('lightModeBtn')?.classList.toggle('active', mode === 'light');
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('active');
  setTimeout(() => toast.classList.remove('active'), 3000);
}

function scanBarcode() {
  const code = prompt('Enter barcode to scan:');
  if (!code) return;
  const normalized = code.trim();
  document.getElementById('search').value = normalized;
  const product = products.find(p => p.barcode === normalized || p.productCode === normalized);
  const barcodeDisplay = document.getElementById('barcodeDisplay');
  if (barcodeDisplay) {
    barcodeDisplay.textContent = product ? `${product.barcode} — ${product.name}` : `${normalized} (not found)`;
  }
  searchProducts();
  showToast(product ? `Barcode ${product.barcode} loaded` : `Barcode searched: ${normalized}`);
}

function initialize() {
  buildProductData();
  setupWheelScroll();
  refreshAccountDisplay();
  hideAppInterface();
  setColorMode('dark');
  document.getElementById('searchBtn').addEventListener('click', searchProducts);
  document.getElementById('scanBarcode').addEventListener('click', scanBarcode);
  document.getElementById('categoryFilter').addEventListener('change', searchProducts);
  document.getElementById('paymentMethod').addEventListener('change', calculateChange);
  document.getElementById('tenderedAmount').addEventListener('input', calculateChange);
  document.getElementById('checkout').addEventListener('click', checkout);
  document.getElementById('saveCustomer').addEventListener('click', saveCustomer);
  document.getElementById('printReceipt').addEventListener('click', printReceipt);
  document.getElementById('overlayLoginBtn').addEventListener('click', loginAccount);
  document.getElementById('openCreateOverlayBtn').addEventListener('click', showCreateOverlay);
  document.getElementById('overlayConfirmCreateBtn').addEventListener('click', submitCreateAccount);
  document.getElementById('overlayCancelCreateBtn').addEventListener('click', hideCreateOverlay);
  document.getElementById('miniCreateBtn').addEventListener('click', showCreateAccountForm);
  document.getElementById('miniLogoutBtn').addEventListener('click', logoutAccount);
  document.getElementById('flyoutConfirmCreateBtn').addEventListener('click', submitCreateAccount);
  document.getElementById('flyoutCancelCreateBtn').addEventListener('click', hideCreateAccountForm);
  document.getElementById('darkModeBtn').addEventListener('click', () => setColorMode('dark'));
  document.getElementById('lightModeBtn').addEventListener('click', () => setColorMode('light'));
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.toggle('active', panel.id === btn.dataset.tab));
    });
  });
}

document.addEventListener('DOMContentLoaded', initialize);
