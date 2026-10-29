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
  loadAdminCollections();
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

  // Manage Collections Event Listeners
  const backCollBtn = document.getElementById('admin-back-to-collections-btn');
  if (backCollBtn) {
    backCollBtn.addEventListener('click', closeAdminCollection);
  }

  const openUploadBtn = document.getElementById('admin-open-upload-btn');
  if (openUploadBtn) {
    openUploadBtn.addEventListener('click', () => openUploadDesignModal(null));
  }

  const designModal = document.getElementById('design-modal');
  const designCloseBtn = document.getElementById('design-modal-close');
  const designCancelBtn = document.getElementById('design-modal-cancel-btn');
  if (designCloseBtn) designCloseBtn.addEventListener('click', closeUploadDesignModal);
  if (designCancelBtn) designCancelBtn.addEventListener('click', closeUploadDesignModal);
  if (designModal) {
    designModal.addEventListener('click', (e) => {
      if (e.target === designModal) closeUploadDesignModal();
    });
  }

  // Design file input preview
  const designFileInput = document.getElementById('design-image-file');
  const previewBox = document.getElementById('design-preview-container');
  const previewImg = document.getElementById('design-preview-img');
  const previewCaption = document.getElementById('design-preview-caption');

  if (designFileInput && previewImg && previewBox) {
    designFileInput.addEventListener('change', () => {
      if (designFileInput.files && designFileInput.files[0]) {
        const file = designFileInput.files[0];
        if (file.size > 15 * 1024 * 1024) {
          showAdminToast('File is too large. Max size is 15MB.', true);
          designFileInput.value = '';
          previewBox.style.display = 'none';
          return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          previewImg.src = e.target.result;
          previewCaption.textContent = `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
          previewBox.style.display = 'block';
        };
        reader.readAsDataURL(file);
      } else {
        previewBox.style.display = 'none';
      }
    });
  }

  // Design form submit
  const designForm = document.getElementById('design-upload-form');
  if (designForm) {
    designForm.addEventListener('submit', handleDesignFormSubmit);
  }

  // Delete modal listeners
  const deleteModal = document.getElementById('design-delete-modal');
  const deleteCloseBtn = document.getElementById('design-delete-modal-close');
  const deleteCancelBtn = document.getElementById('design-delete-cancel-btn');
  const deleteConfirmBtn = document.getElementById('design-delete-confirm-btn');

  if (deleteCloseBtn) deleteCloseBtn.addEventListener('click', closeDeleteDesignModal);
  if (deleteCancelBtn) deleteCancelBtn.addEventListener('click', closeDeleteDesignModal);
  if (deleteConfirmBtn) deleteConfirmBtn.addEventListener('click', confirmDeleteDesign);
  if (deleteModal) {
    deleteModal.addEventListener('click', (e) => {
      if (e.target === deleteModal) closeDeleteDesignModal();
    });
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

        const itemsFormatted = order.items.map(i => {
          let line = `<strong>${i.name}</strong> (${i.size}) &times; ${i.quantity}`;
          if (i.designName) {
            line += `<br><span style="color: var(--admin-orange); font-size: 0.78rem; font-weight: 600;">Design: ${i.designName}</span>`;
          }
          return line;
        }).join('<div style="height: 4px;"></div>');

        const firstDesignImg = order.items.find(i => i.designImage)?.designImage;

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
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              ${firstDesignImg ? `
                <img src="${firstDesignImg}" alt="Design" style="width: 42px; height: 42px; object-fit: cover; border-radius: 4px; border: 1px solid var(--admin-border); flex-shrink: 0;" onerror="this.onerror=null; this.src='/assets/placeholders/poster-neutral.svg';">
              ` : ''}
              <div style="max-width: 250px; font-size: 0.85rem; line-height: 1.3;">
                ${itemsFormatted}
              </div>
            </div>
            ${order.customDesignFile ? '<span style="font-size: 0.72rem; color: var(--admin-orange); font-weight: 700; display: block; margin-top: 0.25rem;">[Customer Uploaded File]</span>' : ''}
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

    // Items list with design image and name
    const itemsContainer = document.getElementById('detail-items-list');
    itemsContainer.innerHTML = order.items.map(item => `
      <div style="display: flex; gap: 0.75rem; align-items: center; padding: 0.65rem 0; border-bottom: 1px solid var(--admin-border);">
        ${item.designImage ? `
          <img src="${item.designImage}" alt="${item.designName || item.name}" style="width: 52px; height: 52px; object-fit: cover; border-radius: 6px; border: 1px solid var(--admin-border); flex-shrink: 0;" onerror="this.onerror=null; this.src='/assets/placeholders/poster-neutral.svg';">
        ` : ''}
        <div style="flex: 1;">
          <div style="font-weight: 700; color: var(--admin-navy);">${item.name} <span style="font-size: 0.82rem; color: var(--admin-muted); font-weight: 500;">(${item.size}) &times; ${item.quantity}</span></div>
          ${item.designName ? `<div style="font-size: 0.82rem; color: var(--admin-orange); font-weight: 600;">Selected Design: ${item.designName}</div>` : ''}
          ${item.customNotes ? `<div style="font-size: 0.8rem; color: #b45309;">Note: ${item.customNotes}</div>` : ''}
        </div>
        <div style="font-weight: 700; color: var(--admin-navy); font-size: 1rem;">₹${item.subtotal}</div>
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

        const cat = prod.category || 'posters';
        const defaultPlaceholder = `/assets/placeholders/${cat === 'frames' ? 'frame' : cat === 'stickers' ? 'sticker' : cat === 'combos' ? 'combo' : 'poster'}-neutral.svg`;
        const currentImg = (prod.imageUrl && prod.imageUrl.trim()) ? prod.imageUrl.trim() : defaultPlaceholder;

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

          <div style="display: flex; gap: 0.75rem; align-items: center; margin-top: 0.75rem; padding: 0.5rem; background: var(--admin-bg); border-radius: 6px; border: 1px solid var(--admin-border);">
            <img src="${currentImg}" alt="${prod.name}" class="prod-preview-thumb" style="width: 50px; height: 50px; object-fit: contain; border-radius: 4px; background: #fff;" onerror="this.onerror=null; this.src='${defaultPlaceholder}';">
            <div style="flex: 1;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem;">
                <label style="font-size: 0.75rem; font-weight: 700; color: var(--admin-muted); margin: 0;">
                  Product Image
                </label>
                <button type="button" class="btn btn-outline btn-sm upload-file-btn" style="font-size: 0.7rem; padding: 0.15rem 0.45rem;">
                  Upload File
                </button>
                <input type="file" class="prod-file-upload-input" accept=".jpg,.jpeg,.png,.webp" style="display: none;">
              </div>
              <input type="text" class="form-control prod-image-input" placeholder="Paste URL or click Upload File" value="${prod.imageUrl || ''}" style="padding: 0.35rem 0.6rem; font-size: 0.8rem;">
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
            Save Changes
          </button>
        `;

        const fileBtn = card.querySelector('.upload-file-btn');
        const fileInput = card.querySelector('.prod-file-upload-input');
        const imgInput = card.querySelector('.prod-image-input');
        const thumbImg = card.querySelector('.prod-preview-thumb');

        if (fileBtn && fileInput) {
          fileBtn.addEventListener('click', () => fileInput.click());
          fileInput.addEventListener('change', async () => {
            if (!fileInput.files || !fileInput.files[0]) return;
            const file = fileInput.files[0];
            const formData = new FormData();
            formData.append('image', file);

            fileBtn.disabled = true;
            fileBtn.textContent = 'Uploading...';

            try {
              const uploadRes = await fetch(`/api/products/${prod.productId}/image`, {
                method: 'POST',
                body: formData
              });
              const uploadData = await uploadRes.json();
              if (uploadData.success && uploadData.imageUrl) {
                imgInput.value = uploadData.imageUrl;
                thumbImg.src = uploadData.imageUrl;
                showAdminToast(`Uploaded image for "${prod.name}"!`, false);
              } else {
                showAdminToast(uploadData.error || 'Failed to upload product image.', true);
              }
            } catch (err) {
              showAdminToast('Network error during image upload.', true);
            } finally {
              fileBtn.disabled = false;
              fileBtn.textContent = 'Upload File';
            }
          });
        }

        const saveBtn = card.querySelector('.save-prod-btn');
        saveBtn.addEventListener('click', async () => {
          const newPrice = card.querySelector('.prod-price-input').value;
          const inStock = card.querySelector('.prod-stock-select').value === 'true';
          const imageUrl = card.querySelector('.prod-image-input').value.trim();

          saveBtn.disabled = true;
          saveBtn.textContent = 'Saving...';

          try {
            const updateRes = await fetch(`/api/products/${prod.productId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ price: Number(newPrice), inStock, imageUrl })
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

// ==========================================================================
// MANAGE COLLECTIONS & DESIGNS LOGIC
// ==========================================================================
let adminCollections = [];
let activeAdminCollection = null;
let activeCollectionDesigns = [];
let targetDeleteDesign = null;

async function loadAdminCollections() {
  try {
    const res = await fetch('/api/collections/admin/all');
    const data = await res.json();

    if (data.success && Array.isArray(data.collections)) {
      adminCollections = data.collections;
      renderAdminCollectionsGrid(adminCollections);
    }
  } catch (err) {
    console.error('Failed to load admin collections:', err);
  }
}

function renderAdminCollectionsGrid(collections) {
  const gridPosters = document.getElementById('admin-grid-posters');
  const gridStickers = document.getElementById('admin-grid-stickers');
  const gridFrames = document.getElementById('admin-grid-frames');
  const gridCombos = document.getElementById('admin-grid-combos');

  if (gridPosters) gridPosters.innerHTML = '';
  if (gridStickers) gridStickers.innerHTML = '';
  if (gridFrames) gridFrames.innerHTML = '';
  if (gridCombos) gridCombos.innerHTML = '';

  collections.forEach(col => {
    const card = document.createElement('div');
    card.className = 'admin-collection-card';
    card.id = `admin-coll-${col.collectionId}`;

    card.innerHTML = `
      <div>
        <div class="coll-card-head">
          <h4 class="coll-card-title">${col.name}</h4>
          <span class="coll-card-count">${col.totalDesigns || 0} designs</span>
        </div>
        <div class="coll-card-size">${col.dimensions || col.size}</div>
      </div>

      <div class="coll-card-footer">
        <div class="coll-card-price">₹${col.price}</div>
        <button type="button" class="btn btn-navy btn-sm open-coll-btn" data-id="${col.collectionId}">
          Open Collection &rarr;
        </button>
      </div>
    `;

    card.querySelector('.open-coll-btn').addEventListener('click', () => {
      openAdminCollection(col.collectionId);
    });

    if (col.category === 'posters' && gridPosters) gridPosters.appendChild(card);
    else if (col.category === 'stickers' && gridStickers) gridStickers.appendChild(card);
    else if (col.category === 'frames' && gridFrames) gridFrames.appendChild(card);
    else if (col.category === 'combos' && gridCombos) gridCombos.appendChild(card);
  });
}

async function openAdminCollection(collectionId) {
  const masterView = document.getElementById('admin-collections-master-view');
  const detailView = document.getElementById('admin-collection-detail-view');

  activeAdminCollection = adminCollections.find(c => c.collectionId === collectionId) || {
    collectionId,
    name: collectionId,
    category: 'posters',
    price: 0
  };

  document.getElementById('admin-view-coll-category').textContent = (activeAdminCollection.category || 'COLLECTION').toUpperCase();
  document.getElementById('admin-view-coll-title').textContent = `${activeAdminCollection.name} (${activeAdminCollection.dimensions || activeAdminCollection.size})`;
  document.getElementById('admin-view-coll-price').textContent = `₹${activeAdminCollection.price}`;

  masterView.style.display = 'none';
  detailView.style.display = 'block';

  await loadAdminCollectionDesigns(collectionId);
}

function closeAdminCollection() {
  document.getElementById('admin-collection-detail-view').style.display = 'none';
  document.getElementById('admin-collections-master-view').style.display = 'block';
  activeAdminCollection = null;
  loadAdminCollections(); // Refresh counts
}

async function loadAdminCollectionDesigns(collectionId) {
  const designsGrid = document.getElementById('admin-designs-grid');
  const emptyState = document.getElementById('admin-designs-empty-state');

  try {
    const res = await fetch(`/api/collections/admin/${collectionId}/designs`);
    const data = await res.json();

    if (data.success && Array.isArray(data.designs)) {
      activeCollectionDesigns = data.designs;

      if (activeCollectionDesigns.length === 0) {
        designsGrid.innerHTML = '';
        designsGrid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
      }

      emptyState.style.display = 'none';
      designsGrid.style.display = 'grid';
      designsGrid.innerHTML = '';

      activeCollectionDesigns.forEach(design => {
        const card = document.createElement('div');
        card.className = 'admin-design-card';
        card.id = `admin-des-${design.designId}`;

        const cat = activeAdminCollection ? activeAdminCollection.category : 'posters';
        const placeholder = `/assets/placeholders/${cat === 'frames' ? 'frame' : cat === 'stickers' ? 'sticker' : cat === 'combos' ? 'combo' : 'poster'}-neutral.svg`;

        card.innerHTML = `
          <div class="admin-design-img-wrap">
            <img src="${design.imageUrl}" alt="${design.name}" loading="lazy" onerror="this.onerror=null; this.src='${placeholder}';">
            <span class="admin-design-status-pill ${design.isPublished ? 'status-pill-pub' : 'status-pill-hid'}">
              ${design.isPublished ? 'Published' : 'Hidden'}
            </span>
          </div>

          <div class="admin-design-body">
            <div>
              <div class="admin-design-name" title="${design.name}">${design.name}</div>
              <div class="admin-design-desc">${design.description || 'No description provided.'}</div>
            </div>

            <div class="admin-design-actions">
              <button type="button" class="btn btn-outline btn-sm edit-des-btn" style="flex: 1; padding: 0.3rem 0.5rem; font-size: 0.75rem;">
                Edit
              </button>
              <button type="button" class="btn btn-sm toggle-des-btn" style="flex: 1; padding: 0.3rem 0.5rem; font-size: 0.75rem; background: ${design.isPublished ? '#f1f5f9' : '#10b981'}; color: ${design.isPublished ? 'var(--admin-navy)' : '#fff'};">
                ${design.isPublished ? 'Hide' : 'Publish'}
              </button>
              <button type="button" class="btn btn-outline btn-sm delete-des-btn" style="padding: 0.3rem 0.5rem; font-size: 0.75rem; color: #dc2626; border-color: #fecaca;">
                Delete
              </button>
            </div>
          </div>
        `;

        card.querySelector('.edit-des-btn').addEventListener('click', () => {
          openUploadDesignModal(design);
        });

        card.querySelector('.toggle-des-btn').addEventListener('click', () => {
          handleToggleDesign(design.designId);
        });

        card.querySelector('.delete-des-btn').addEventListener('click', () => {
          promptDeleteDesign(design);
        });

        designsGrid.appendChild(card);
      });
    }
  } catch (err) {
    console.error('Error loading designs:', err);
    showAdminToast('Failed to load designs.', true);
  }
}

function openUploadDesignModal(editDesign = null) {
  const modal = document.getElementById('design-modal');
  const title = document.getElementById('design-modal-title');
  const form = document.getElementById('design-upload-form');
  const colIdInput = document.getElementById('design-form-collection-id');
  const editIdInput = document.getElementById('design-form-edit-id');
  const nameInput = document.getElementById('design-name-input');
  const descInput = document.getElementById('design-desc-input');
  const pubCheckbox = document.getElementById('design-publish-checkbox');
  const fileInput = document.getElementById('design-image-file');
  const reqMark = document.getElementById('design-file-required-mark');
  const previewBox = document.getElementById('design-preview-container');
  const previewImg = document.getElementById('design-preview-img');
  const previewCaption = document.getElementById('design-preview-caption');
  const saveBtn = document.getElementById('design-save-btn');

  form.reset();
  colIdInput.value = activeAdminCollection ? activeAdminCollection.collectionId : '';

  if (editDesign) {
    editIdInput.value = editDesign.designId;
    title.textContent = `Edit Design: ${editDesign.name}`;
    nameInput.value = editDesign.name;
    descInput.value = editDesign.description || '';
    pubCheckbox.checked = editDesign.isPublished !== false;
    reqMark.style.display = 'none';
    fileInput.required = false;

    previewImg.src = editDesign.imageUrl;
    previewCaption.textContent = 'Current Image (select new file to replace)';
    previewBox.style.display = 'block';
    saveBtn.textContent = 'Update Design Details';
  } else {
    editIdInput.value = '';
    title.textContent = `Upload New Design for ${activeAdminCollection ? activeAdminCollection.name : 'Collection'}`;
    reqMark.style.display = 'inline';
    fileInput.required = true;
    previewBox.style.display = 'none';
    previewImg.src = '';
    saveBtn.textContent = 'Add and Publish Design';
  }

  modal.style.display = 'flex';
}

function closeUploadDesignModal() {
  document.getElementById('design-modal').style.display = 'none';
}

async function handleDesignFormSubmit(e) {
  e.preventDefault();
  if (!activeAdminCollection) return;

  const editId = document.getElementById('design-form-edit-id').value;
  const name = document.getElementById('design-name-input').value.trim();
  const description = document.getElementById('design-desc-input').value.trim();
  const isPublished = document.getElementById('design-publish-checkbox').checked;
  const fileInput = document.getElementById('design-image-file');
  const saveBtn = document.getElementById('design-save-btn');

  if (!name) {
    showAdminToast('Please enter a design name.', true);
    return;
  }

  const formData = new FormData();
  formData.append('name', name);
  formData.append('description', description);
  formData.append('isPublished', isPublished);

  if (fileInput.files && fileInput.files[0]) {
    formData.append('image', fileInput.files[0]);
  } else if (!editId) {
    showAdminToast('Please select an image file to upload.', true);
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = editId ? 'Updating...' : 'Uploading & Publishing...';

  try {
    let url = `/api/collections/admin/${activeAdminCollection.collectionId}/designs`;
    let method = 'POST';

    if (editId) {
      url = `/api/collections/admin/designs/${editId}`;
      method = 'PUT';
    }

    const res = await fetch(url, {
      method,
      body: formData
    });
    const data = await res.json();

    if (data.success) {
      showAdminToast(data.message || 'Design saved successfully!', false);
      closeUploadDesignModal();
      loadAdminCollectionDesigns(activeAdminCollection.collectionId);
    } else {
      showAdminToast(data.error || 'Failed to save design.', true);
    }
  } catch (err) {
    console.error('Error saving design:', err);
    showAdminToast('Network error while saving design.', true);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = editId ? 'Update Design Details' : 'Add and Publish Design';
  }
}

async function handleToggleDesign(designId) {
  try {
    const res = await fetch(`/api/collections/admin/designs/${designId}/toggle`, {
      method: 'PATCH'
    });
    const data = await res.json();
    if (data.success) {
      showAdminToast(data.message, false);
      if (activeAdminCollection) {
        loadAdminCollectionDesigns(activeAdminCollection.collectionId);
      }
    } else {
      showAdminToast(data.error || 'Failed to update design status.', true);
    }
  } catch (err) {
    showAdminToast('Network error updating design status.', true);
  }
}

function promptDeleteDesign(design) {
  targetDeleteDesign = design;
  document.getElementById('delete-target-design-name').textContent = `"${design.name}"`;
  document.getElementById('design-delete-modal').style.display = 'flex';
}

function closeDeleteDesignModal() {
  document.getElementById('design-delete-modal').style.display = 'none';
  targetDeleteDesign = null;
}

async function confirmDeleteDesign() {
  if (!targetDeleteDesign) return;

  const btn = document.getElementById('design-delete-confirm-btn');
  btn.disabled = true;
  btn.textContent = 'Deleting...';

  try {
    const res = await fetch(`/api/collections/admin/designs/${targetDeleteDesign.designId}`, {
      method: 'DELETE'
    });
    const data = await res.json();

    if (data.success) {
      showAdminToast(data.message || 'Design deleted.', false);
      closeDeleteDesignModal();
      if (activeAdminCollection) {
        loadAdminCollectionDesigns(activeAdminCollection.collectionId);
      }
    } else {
      showAdminToast(data.error || 'Failed to delete design.', true);
    }
  } catch (err) {
    showAdminToast('Network error while deleting design.', true);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Yes, Delete Design';
  }
}
