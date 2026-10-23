/**
 * Mr Moses Poster Store - Administrator Portal Logic
 * Real-time order management, status updates, pricing editor, and WhatsApp triggers
 */

let currentAdmin = null;
let currentOrders = [];
let allProducts = [];
let activeOrderId = null;

document.addEventListener('DOMContentLoaded', () => {
  checkAuthSession();
  setupEventListeners();
});

// Toast notification for Admin
function showAdminToast(msg, isError = false) {
  let box = document.getElementById('admin-toast');
  if (!box) {
    box = document.createElement('div');
    box.id = 'admin-toast';
    box.style.cssText = `
      position: fixed;
      bottom: 25px;
      right: 25px;
      z-index: 9999;
      padding: 0.85rem 1.25rem;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 600;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
      transition: all 0.3s;
    `;
    document.body.appendChild(box);
  }

  box.style.background = isError ? '#ef4444' : '#0f2b48';
  box.style.color = '#ffffff';
  box.style.borderLeft = isError ? '4px solid #b91c1c' : '4px solid #f97316';
  box.textContent = msg;
  box.style.display = 'block';
  box.style.opacity = '1';

  setTimeout(() => {
    box.style.opacity = '0';
    setTimeout(() => { box.style.display = 'none'; }, 300);
  }, 3500);
}

// Session check
async function checkAuthSession() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();

    if (data.success && data.admin) {
      currentAdmin = data.admin;
      showDashboardView();
    } else {
      showLoginView();
    }
  } catch (err) {
    showLoginView();
  }
}

// Check if first-time admin setup is required
async function checkAdminInitStatus() {
  try {
    const res = await fetch('/api/auth/status');
    const data = await res.json();
    const alertBox = document.getElementById('auth-setup-notice');

    if (data.success && !data.hasAdmin && alertBox) {
      alertBox.innerHTML = `
        <strong>First-Time Setup:</strong> No administrator account exists yet.<br>
        Run <code>npm run setup-admin</code> in your terminal or use the setup token from <code>.env</code>.
      `;
      alertBox.className = 'auth-alert auth-alert-info show';
    }
  } catch (e) {
    console.error('Status check error:', e);
  }
}

function showLoginView() {
  document.getElementById('auth-view').style.display = 'flex';
  document.getElementById('dashboard-view').classList.remove('active');
  checkAdminInitStatus();
}

function showDashboardView() {
  document.getElementById('auth-view').style.display = 'none';
  document.getElementById('dashboard-view').classList.add('active');

  const adminNameElem = document.getElementById('admin-username-display');
  if (adminNameElem && currentAdmin) {
    adminNameElem.textContent = currentAdmin.username;
  }

  // Load initial dashboard data
  loadSystemStatus();
  loadDashboardStats();
  loadOrders();
  loadProductsEditor();
}

// System Status & DB badge
async function loadSystemStatus() {
  try {
    const res = await fetch('/api/system-status');
    const data = await res.json();
    const statusElem = document.getElementById('db-connection-text');
    if (statusElem && data.database) {
      statusElem.textContent = data.database.connected ? 'MongoDB Atlas (Connected)' : data.database.host;
    }
  } catch (e) {
    console.error('System status error:', e);
  }
}

// Event Listeners setup
function setupEventListeners() {
  // Login form
  const loginForm = document.getElementById('admin-login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Logout button
  const logoutBtn = document.getElementById('admin-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  // Tabs switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');

      btn.classList.add('active');
      const targetPane = document.getElementById(btn.dataset.target);
      if (targetPane) targetPane.style.display = 'block';
    });
  });

  // Orders filters & search
  const statusFilter = document.getElementById('order-status-filter');
  const searchInput = document.getElementById('order-search-input');

  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      loadOrders(statusFilter.value, searchInput.value);
    });
  }

  if (searchInput) {
    let timeout = null;
    searchInput.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        loadOrders(statusFilter ? statusFilter.value : 'All', searchInput.value);
      }, 300);
    });
  }

  // Order Details Modal close
  const detailModal = document.getElementById('order-detail-modal');
  const detailClose = document.getElementById('detail-modal-close');
  if (detailModal && detailClose) {
    detailClose.addEventListener('click', () => {
      detailModal.style.display = 'none';
    });
    detailModal.addEventListener('click', (e) => {
      if (e.target === detailModal) detailModal.style.display = 'none';
    });
  }

  // Order Status update form
  const updateStatusForm = document.getElementById('order-update-status-form');
  if (updateStatusForm) {
    updateStatusForm.addEventListener('submit', handleUpdateOrderStatus);
  }
}

// Handle Admin Login
async function handleLogin(e) {
  e.preventDefault();
  const usernameInput = document.getElementById('login-username');
  const passwordInput = document.getElementById('login-password');
  const alertBox = document.getElementById('auth-error-alert');
  const submitBtn = document.getElementById('login-submit-btn');

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    alertBox.textContent = 'Please enter both username and password.';
    alertBox.className = 'auth-alert auth-alert-error show';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Authenticating...';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (data.success && data.admin) {
      currentAdmin = data.admin;
      showDashboardView();
      showAdminToast('Welcome, Administrator!', false);
    } else {
      alertBox.textContent = data.error || 'Invalid administrator credentials.';
      alertBox.className = 'auth-alert auth-alert-error show';
    }
  } catch (err) {
    alertBox.textContent = 'Network error while attempting to log in.';
    alertBox.className = 'auth-alert auth-alert-error show';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Log In to Admin Portal';
  }
}

// Handle Admin Logout
async function handleLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {}
  currentAdmin = null;
  showLoginView();
  showAdminToast('Logged out successfully.');
}

// Load Metrics
async function loadDashboardStats() {
  try {
    const res = await fetch('/api/orders/stats');
    const data = await res.json();
    if (data.success && data.stats) {
      const s = data.stats;
      document.getElementById('stat-total-orders').textContent = s.totalOrders || 0;
      document.getElementById('stat-new-orders').textContent = s.newOrders || 0;
      document.getElementById('stat-inprogress-orders').textContent = s.inProgress || 0;
      document.getElementById('stat-delivered-orders').textContent = s.deliveredOrders || 0;
      document.getElementById('stat-total-revenue').textContent = `₹${s.totalRevenue || 0}`;
    }
  } catch (e) {
    console.error('Stats error:', e);
  }
}

// Load Real Orders from Database
async function loadOrders(status = 'All', search = '') {
  const tableBody = document.getElementById('orders-table-body');
  const emptyBox = document.getElementById('orders-empty-state');
  const tableWrapper = document.getElementById('orders-table-wrapper');

  try {
    let url = `/api/orders?status=${encodeURIComponent(status)}`;
    if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.success && Array.isArray(data.orders)) {
      currentOrders = data.orders;

      if (currentOrders.length === 0) {
        // STRICT REQUIREMENT: Empty state when no orders. Never fake data.
        tableWrapper.style.display = 'none';
        emptyBox.style.display = 'block';
        return;
      }

      tableWrapper.style.display = 'block';
      emptyBox.style.display = 'none';
      tableBody.innerHTML = '';

      currentOrders.forEach(order => {
        const tr = document.createElement('tr');
        const formattedDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        });

        const itemsSummary = order.items.map(i => `${i.name} (${i.size}) x${i.quantity}`).join(', ');

        tr.innerHTML = `
          <td>
            <strong style="color: var(--admin-navy); font-family: monospace;">${order.orderId}</strong>
            <div style="font-size: 0.78rem; color: var(--admin-muted);">${formattedDate}</div>
          </td>
          <td>
            <div style="font-weight: 600;">${order.customer?.name || '--'}</div>
            <div style="font-size: 0.8rem; color: var(--admin-muted);">+91 ${order.customer?.whatsapp || '--'}</div>
          </td>
          <td>
            <div style="max-width: 260px; font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${itemsSummary}
            </div>
            ${order.customDesignFile ? '<span style="font-size: 0.72rem; color: var(--admin-orange); font-weight: 700;">[Attached File]</span>' : ''}
          </td>
          <td>
            <strong style="color: var(--admin-navy);">₹${order.totalPrice}</strong>
            <div style="font-size: 0.75rem; color: ${order.paymentStatus === 'Paid' ? '#10b981' : '#b45309'};">${order.paymentStatus}</div>
          </td>
          <td>
            <span class="badge-status status-${order.status.replace(/\s+/g, '-')}">${order.status}</span>
          </td>
          <td style="text-align: right;">
            <button type="button" class="btn btn-outline btn-sm view-order-btn" data-order-id="${order.orderId}">
              Manage
            </button>
          </td>
        `;

        tr.querySelector('.view-order-btn').addEventListener('click', () => {
          openOrderDetail(order.orderId);
        });

        tableBody.appendChild(tr);
      });
    }
  } catch (err) {
    console.error('Orders loading error:', err);
    showAdminToast('Failed to load orders from database.', true);
  }
}

// Open Order Details Modal
async function openOrderDetail(orderId) {
  activeOrderId = orderId;
  const modal = document.getElementById('order-detail-modal');

  try {
    const res = await fetch(`/api/orders/${orderId}`);
    const data = await res.json();

    if (!data.success || !data.order) {
      showAdminToast('Could not load order details.', true);
      return;
    }

    const order = data.order;

    // Populate modal fields
    document.getElementById('detail-order-id').textContent = order.orderId;
    document.getElementById('detail-created-date').textContent = new Date(order.createdAt).toLocaleString('en-IN');
    document.getElementById('detail-cust-name').textContent = order.customer.name;
    document.getElementById('detail-cust-phone').textContent = `+91 ${order.customer.whatsapp}`;
    document.getElementById('detail-cust-address').textContent = `${order.customer.address.street}, ${order.customer.address.city} - ${order.customer.address.pincode}`;
    document.getElementById('detail-total-price').textContent = `₹${order.totalPrice}`;

    // Select dropdowns
    document.getElementById('detail-status-select').value = order.status;
    document.getElementById('detail-payment-select').value = order.paymentStatus || 'Pending';
    document.getElementById('detail-status-note').value = '';

    // Custom price field
    const customPriceInput = document.getElementById('detail-custom-price-input');
    if (customPriceInput) {
      customPriceInput.value = order.totalPrice;
    }

    // Items list
    const itemsContainer = document.getElementById('detail-items-list');
    itemsContainer.innerHTML = order.items.map(item => `
      <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--admin-border);">
        <div>
          <strong>${item.name}</strong> (${item.size}) &times; ${item.quantity}
          ${item.customNotes ? `<div style="font-size: 0.8rem; color: #b45309;">Note: ${item.customNotes}</div>` : ''}
        </div>
        <div style="font-weight: 700; color: var(--admin-navy);">₹${item.subtotal}</div>
      </div>
    `).join('');

    // Custom Design File preview/download link
    const fileContainer = document.getElementById('detail-file-container');
    if (order.customDesignFile) {
      fileContainer.innerHTML = `
        <div style="margin-top: 0.75rem; padding: 0.75rem; background: #ffffff; border: 1px solid var(--admin-border); border-radius: 6px;">
          <div style="font-size: 0.85rem; font-weight: 700; color: var(--admin-navy); margin-bottom: 0.35rem;">Customer Uploaded File:</div>
          <div style="font-size: 0.82rem; color: var(--admin-muted); margin-bottom: 0.5rem;">${order.customDesignFile.originalName} (${(order.customDesignFile.size / (1024*1024)).toFixed(2)} MB)</div>
          <a href="/api/orders/${order.orderId}/file" target="_blank" class="btn btn-navy btn-sm" style="font-size: 0.78rem;">
            Download / View Design File
          </a>
        </div>
      `;
    } else {
      fileContainer.innerHTML = '<div style="font-size: 0.85rem; color: var(--admin-muted); margin-top: 0.5rem;">No custom design file attached.</div>';
    }

    // WhatsApp Click-to-Send Action Links
    setupWhatsAppActionButtons(order);

    // Status Timeline
    const timelineBox = document.getElementById('detail-status-history');
    if (Array.isArray(order.statusHistory)) {
      timelineBox.innerHTML = order.statusHistory.map(h => `
        <div style="font-size: 0.82rem; padding: 0.4rem 0; border-bottom: 1px dashed var(--admin-border);">
          <strong>${h.status}</strong> &bull; ${new Date(h.timestamp).toLocaleString('en-IN')}<br>
          <span style="color: var(--admin-muted);">${h.note || ''}</span>
        </div>
      `).join('');
    }

    modal.style.display = 'flex';
  } catch (err) {
    console.error('Error fetching order details:', err);
    showAdminToast('Failed to load order.', true);
  }
}

// WhatsApp Click-to-Chat Button Configuration
function setupWhatsAppActionButtons(order) {
  const customerPhone = order.customer.whatsapp;
  const customerName = order.customer.name;
  const orderId = order.orderId;
  const itemsSummary = order.items.map(i => `${i.name} (${i.size}) x${i.quantity}`).join(', ');

  // 1. Order Confirmation message
  const confirmBtn = document.getElementById('wa-confirm-btn');
  const confirmMsg = encodeURIComponent(
    `Hello ${customerName}! Greetings from Mr Moses Poster Store.\n\n` +
    `We have received your order #${orderId}.\n` +
    `Items: ${itemsSummary}\n` +
    `Total Amount: ₹${order.totalPrice}\n` +
    `Status: ${order.status}\n\n` +
    `We are beginning production. Feel free to reply if you need any adjustments!`
  );
  confirmBtn.href = `https://wa.me/91${customerPhone}?text=${confirmMsg}`;

  // 2. Status Update message
  const statusUpdateBtn = document.getElementById('wa-status-btn');
  const statusMsg = encodeURIComponent(
    `Hello ${customerName}! Here is an update on your Mr Moses Poster Store order #${orderId}:\n\n` +
    `Current Status: *${order.status}*\n\n` +
    `You can track your order anytime on our website using your Order ID.`
  );
  statusUpdateBtn.href = `https://wa.me/91${customerPhone}?text=${statusMsg}`;
}

// Handle Order Status Update
async function handleUpdateOrderStatus(e) {
  e.preventDefault();
  if (!activeOrderId) return;

  const status = document.getElementById('detail-status-select').value;
  const paymentStatus = document.getElementById('detail-payment-select').value;
  const note = document.getElementById('detail-status-note').value;
  const adjustedPrice = document.getElementById('detail-custom-price-input').value;
  const saveBtn = document.getElementById('save-status-btn');

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const res = await fetch(`/api/orders/${activeOrderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        paymentStatus,
        note,
        adjustedPrice: adjustedPrice ? Number(adjustedPrice) : undefined
      })
    });
    const data = await res.json();

    if (data.success && data.order) {
      showAdminToast(`Order #${activeOrderId} updated to "${status}".`, false);
      openOrderDetail(activeOrderId); // Refresh modal view
      loadOrders(); // Refresh table
      loadDashboardStats(); // Refresh stats
    } else {
      showAdminToast(data.error || 'Failed to update order.', true);
    }
  } catch (err) {
    showAdminToast('Network error while updating status.', true);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Update Order';
  }
}

// ==========================================================================
// PRODUCT CATALOG & PRICE EDITOR
// ==========================================================================
async function loadProductsEditor() {
  const container = document.getElementById('catalog-editor-container');
  if (!container) return;

  try {
    const res = await fetch('/api/products');
    const data = await res.json();

    if (data.success && Array.isArray(data.products)) {
      allProducts = data.products;
      container.innerHTML = '';

      allProducts.forEach(prod => {
        const card = document.createElement('div');
        card.className = 'catalog-edit-card';
        card.id = `edit-card-${prod.productId}`;

        card.innerHTML = `
          <div class="catalog-edit-header">
            <div>
              <span class="catalog-prod-cat">${prod.category}</span>
              <div class="catalog-prod-title">${prod.name}</div>
              <div style="font-size: 0.82rem; color: var(--admin-muted);">${prod.dimensions || prod.size}</div>
            </div>
            <div>
              <span class="badge ${prod.inStock ? 'badge-stock' : 'badge-orange'}">${prod.inStock ? 'In Stock' : 'Out of Stock'}</span>
            </div>
          </div>

          <div style="margin: 1rem 0;">
            <label style="font-size: 0.8rem; font-weight: 700; color: var(--admin-muted); display: block; margin-bottom: 0.35rem;">
              Price (INR ₹)
            </label>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <span style="font-weight: 700; color: var(--admin-orange);">₹</span>
              <input type="number" class="form-control prod-price-input" value="${prod.price}" min="0" style="padding: 0.45rem 0.75rem;">
            </div>
          </div>

          <div style="margin-bottom: 1rem;">
            <label style="font-size: 0.8rem; font-weight: 700; color: var(--admin-muted); display: block; margin-bottom: 0.35rem;">
              Availability
            </label>
            <select class="form-control prod-stock-select" style="padding: 0.45rem 0.75rem;">
              <option value="true" ${prod.inStock ? 'selected' : ''}>In Stock</option>
              <option value="false" ${!prod.inStock ? 'selected' : ''}>Out of Stock</option>
            </select>
          </div>

          <button type="button" class="btn btn-navy btn-block btn-sm save-prod-btn">
            Save Price &amp; Stock
          </button>
        `;

        const saveBtn = card.querySelector('.save-prod-btn');
        saveBtn.addEventListener('click', async () => {
          const newPrice = card.querySelector('.prod-price-input').value;
          const inStock = card.querySelector('.prod-stock-select').value === 'true';

          saveBtn.disabled = true;
          saveBtn.textContent = 'Saving...';

          try {
            const updateRes = await fetch(`/api/products/${prod.productId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ price: Number(newPrice), inStock })
            });
            const updateData = await updateRes.json();

            if (updateData.success) {
              showAdminToast(`Updated "${prod.name}" price to ₹${newPrice}`, false);
              loadProductsEditor(); // Refresh view
            } else {
              showAdminToast(updateData.error || 'Failed to update product.', true);
            }
          } catch (err) {
            showAdminToast('Network error while saving product price.', true);
          } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Price & Stock';
          }
        });

        container.appendChild(card);
      });
    }
  } catch (err) {
    console.error('Catalog error:', err);
  }
}
