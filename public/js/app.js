/**
 * Mr Moses Poster Store - Customer Application Logic
 * Clean, lightweight Vanilla JS with real-time API integrations
 */

// Global State
const appState = {
  products: [],
  selectedProduct: null,
  selectedDesign: null,
  selectedCollectionProduct: null,
  orderQuantity: 1,
  storeWhatsApp: '8754126367'
};

// DOM Content Loaded Handler
document.addEventListener('DOMContentLoaded', () => {
  initializeNavigation();
  loadProducts();
  initializeOrderModal();
  initializeCustomerCollectionModal();
  initializeCustomOrderForm();
  initializeTrackingForm();
  initializeContactForm();
});

// Toast Notification Helper
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      ${type === 'error'
        ? '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
        : type === 'success'
        ? '<circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/>'
        : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
      }
    </svg>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Navigation & Mobile Menu
function initializeNavigation() {
  const toggleBtn = document.getElementById('mobile-toggle');
  const navMenu = document.getElementById('nav-menu');

  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener('click', () => {
      navMenu.classList.toggle('open');
    });

    // Close menu when link is clicked
    navMenu.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
      });
    });
  }
}

// Fetch Real Products from Backend
async function loadProducts() {
  try {
    const response = await fetch('/api/products');
    const data = await response.json();

    if (data.success && Array.isArray(data.products)) {
      appState.products = data.products;
      renderProductsByCategory(data.products);
      populateCustomProductDropdown(data.products);
      checkHashRouting();
    } else {
      showToast('Could not load current product catalog.', 'error');
    }
  } catch (err) {
    console.error('Failed to load products:', err);
    showToast('Network error while connecting to store catalog.', 'error');
  }
}

// URL Hash routing to directly open a collection (e.g. #collection/poster-a3)
function checkHashRouting() {
  const hash = window.location.hash;
  if (hash && hash.startsWith('#collection/')) {
    const colId = hash.replace('#collection/', '').trim();
    const product = appState.products.find(p => p.productId === colId);
    if (product) {
      openCustomerCollection(product);
    }
  }
}

window.addEventListener('hashchange', checkHashRouting);

// Render Products into Grids
function renderProductsByCategory(products) {
  const postersContainer = document.getElementById('posters-grid');
  const stickersContainer = document.getElementById('stickers-grid');
  const framesContainer = document.getElementById('frames-grid');
  const combosContainer = document.getElementById('combos-grid');

  if (postersContainer) postersContainer.innerHTML = '';
  if (stickersContainer) stickersContainer.innerHTML = '';
  if (framesContainer) framesContainer.innerHTML = '';
  if (combosContainer) combosContainer.innerHTML = '';

  products.forEach(product => {
    const card = createProductCard(product);

    if (product.category === 'posters' && postersContainer) {
      postersContainer.appendChild(card);
    } else if (product.category === 'stickers' && stickersContainer) {
      stickersContainer.appendChild(card);
    } else if (product.category === 'frames' && framesContainer) {
      framesContainer.appendChild(card);
    } else if (product.category === 'combos' && combosContainer) {
      combosContainer.appendChild(card);
    }
  });
}

// Placeholder Image Mapping
function getPlaceholderImage(product) {
  if (product.category === 'posters') {
    return '/assets/placeholders/poster-neutral.svg';
  } else if (product.category === 'frames') {
    return '/assets/placeholders/frame-neutral.svg';
  } else if (product.category === 'stickers') {
    return '/assets/placeholders/sticker-neutral.svg';
  } else if (product.category === 'combos') {
    return '/assets/placeholders/combo-neutral.svg';
  }
  return '/assets/placeholders/poster-neutral.svg';
}

// Create a Product Card Element
function createProductCard(product) {
  const card = document.createElement('div');
  card.className = 'product-card';
  card.id = `card-${product.productId}`;

  const imageSrc = getPlaceholderImage(product);
  const isOutOfStock = product.inStock === false;

  card.innerHTML = `
    ${product.badge ? `<div class="product-card-badge"><span class="badge ${product.badge.includes('Combo') || product.badge.includes('Value') ? 'badge-orange' : 'badge-navy'}">${product.badge}</span></div>` : ''}
    <div class="product-media">
      <img src="${imageSrc}" alt="${product.name} specifications diagram" loading="lazy">
    </div>
    <div class="product-info">
      <span class="product-category-label">${product.category}</span>
      <h3 class="product-name">${product.name}</h3>
      <div class="product-dimension">${product.dimensions || product.size}</div>
      <p class="product-desc">${product.description || ''}</p>
      <div class="product-footer">
        <div class="product-price-box">
          <span class="price-label">Price</span>
          <div class="product-price"><span class="currency">₹</span>${product.price}</div>
        </div>
        <button 
          type="button" 
          class="btn ${isOutOfStock ? 'btn-outline' : 'btn-primary'} btn-sm open-order-btn" 
          ${isOutOfStock ? 'disabled' : ''}
          data-product-id="${product.productId}"
        >
          ${isOutOfStock ? 'Out of Stock' : 'Select Design / Order Now'}
        </button>
      </div>
    </div>
  `;

  const orderBtn = card.querySelector('.open-order-btn');
  if (orderBtn && !isOutOfStock) {
    orderBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openCustomerCollection(product);
    });
  }

  // Clicking on product card also opens its designs collection
  if (!isOutOfStock) {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      openCustomerCollection(product);
    });
  }

  return card;
}

// Populate Dropdown in Custom Orders Form
function populateCustomProductDropdown(products) {
  const select = document.getElementById('custom-product-select');
  if (!select) return;

  select.innerHTML = '<option value="">-- Choose Desired Print / Frame Base Size --</option>';

  const optGroups = {
    posters: document.createElement('optgroup'),
    frames: document.createElement('optgroup'),
    combos: document.createElement('optgroup'),
    stickers: document.createElement('optgroup')
  };

  optGroups.posters.label = 'Posters';
  optGroups.frames.label = 'Photo Frames';
  optGroups.combos.label = 'Combos';
  optGroups.stickers.label = 'Stickers';

  products.forEach(p => {
    if (optGroups[p.category]) {
      const opt = document.createElement('option');
      opt.value = p.productId;
      opt.textContent = `${p.name} (${p.size}) — ₹${p.price}`;
      opt.dataset.price = p.price;
      optGroups[p.category].appendChild(opt);
    }
  });

  Object.values(optGroups).forEach(group => {
    if (group.children.length > 0) {
      select.appendChild(group);
    }
  });
}

// ==========================================================================
// ORDER MODAL & SUBMISSION FLOW
// ==========================================================================
function initializeOrderModal() {
  const modal = document.getElementById('order-modal');
  const closeBtn = document.getElementById('modal-close-btn');
  const qtyInput = document.getElementById('modal-qty-input');
  const qtyMinus = document.getElementById('qty-minus-btn');
  const qtyPlus = document.getElementById('qty-plus-btn');
  const orderForm = document.getElementById('customer-order-form');
  const fileInput = document.getElementById('modal-file-input');
  const filePreview = document.getElementById('modal-file-preview');
  const fileNameDisplay = document.getElementById('modal-file-name');

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => closeModal(modal));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  }

  // Quantity controllers
  if (qtyMinus && qtyPlus && qtyInput) {
    qtyMinus.addEventListener('click', () => {
      let val = parseInt(qtyInput.value, 10) || 1;
      if (val > 1) {
        qtyInput.value = val - 1;
        updateModalPriceSummary();
      }
    });

    qtyPlus.addEventListener('click', () => {
      let val = parseInt(qtyInput.value, 10) || 1;
      qtyInput.value = val + 1;
      updateModalPriceSummary();
    });

    qtyInput.addEventListener('input', () => {
      let val = parseInt(qtyInput.value, 10);
      if (isNaN(val) || val < 1) val = 1;
      qtyInput.value = val;
      updateModalPriceSummary();
    });
  }

  // File upload feedback
  if (fileInput && filePreview && fileNameDisplay) {
    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        if (file.size > 15 * 1024 * 1024) {
          showToast('File is too large. Maximum allowed size is 15MB.', 'error');
          fileInput.value = '';
          filePreview.classList.remove('show');
          return;
        }
        fileNameDisplay.textContent = `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
        filePreview.classList.add('show');
      } else {
        filePreview.classList.remove('show');
      }
    });
  }

  // Order Submission Handler
  if (orderForm) {
    orderForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await submitCustomerOrder(orderForm, false);
    });
  }
}

// Initialize Customer Collection Modal
function initializeCustomerCollectionModal() {
  const modal = document.getElementById('customer-collection-modal');
  const closeBtn = document.getElementById('customer-coll-close-btn');
  const backBtn = document.getElementById('customer-coll-back-btn');

  if (modal) {
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('open');
        if (window.location.hash.startsWith('#collection/')) {
          history.pushState('', document.title, window.location.pathname + window.location.search);
        }
      });
    }
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        modal.classList.remove('open');
        if (window.location.hash.startsWith('#collection/')) {
          history.pushState('', document.title, window.location.pathname + window.location.search);
        }
      });
    }
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('open');
        if (window.location.hash.startsWith('#collection/')) {
          history.pushState('', document.title, window.location.pathname + window.location.search);
        }
      }
    });
  }
}

// Open Collection Page for a specific product size/category
async function openCustomerCollection(product) {
  const modal = document.getElementById('customer-collection-modal');
  const designsGrid = document.getElementById('customer-designs-grid');
  const emptyState = document.getElementById('customer-collection-empty');

  if (!modal || !designsGrid || !emptyState) return;

  appState.selectedCollectionProduct = product;

  // Set collection title, category pill, and live price from single source of truth in database
  document.getElementById('customer-coll-badge').textContent = (product.category || 'COLLECTION').toUpperCase();
  document.getElementById('customer-coll-title').textContent = `${product.name} Collection`;
  document.getElementById('customer-coll-price-tag').textContent = `₹${product.price}`;
  document.getElementById('customer-coll-subtitle').textContent = `Dimensions: ${product.dimensions || product.size} • Transparent pricing: ₹${product.price} each. Select any design below to place an order with instant WhatsApp support.`;

  // Set URL hash for linkability
  try {
    history.replaceState(null, '', `#collection/${product.productId}`);
  } catch (e) {}

  // Loading state
  designsGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 2.5rem; color: var(--text-muted); font-size: 0.95rem;">Loading designs for this collection...</div>';
  designsGrid.style.display = 'grid';
  emptyState.style.display = 'none';
  modal.classList.add('open');

  try {
    const res = await fetch(`/api/collections/${product.productId}/designs`);
    const data = await res.json();

    if (data.success && Array.isArray(data.designs)) {
      const designs = data.designs;

      if (designs.length === 0) {
        // STRICT REQUIREMENT: Empty state message when no real designs exist
        designsGrid.innerHTML = '';
        designsGrid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
      }

      emptyState.style.display = 'none';
      designsGrid.style.display = 'grid';
      designsGrid.innerHTML = '';

      designs.forEach(design => {
        const card = document.createElement('div');
        card.className = 'customer-design-card';
        card.id = `cust-des-${design.designId}`;

        card.innerHTML = `
          <div class="customer-design-media">
            <img src="${design.imageUrl}" alt="${design.name}" loading="lazy">
          </div>
          <div class="customer-design-content">
            <div>
              <h4 class="customer-design-title">${design.name}</h4>
              <div class="customer-design-meta">${product.name} • ${product.dimensions || product.size}</div>
              ${design.description ? `<p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.75rem; line-height: 1.4;">${design.description}</p>` : ''}
            </div>
            <div>
              <div class="customer-design-price-row">
                <span style="font-size: 0.82rem; color: var(--text-muted); font-weight: 600;">Price</span>
                <span class="customer-design-price">₹${product.price}</span>
              </div>
              <button type="button" class="btn btn-primary btn-block select-design-btn" data-design-id="${design.designId}">
                Select Design / Order Now
              </button>
            </div>
          </div>
        `;

        card.querySelector('.select-design-btn').addEventListener('click', () => {
          modal.classList.remove('open');
          openOrderModal(product, design);
        });

        designsGrid.appendChild(card);
      });
    } else {
      designsGrid.innerHTML = '';
      designsGrid.style.display = 'none';
      emptyState.style.display = 'block';
    }
  } catch (err) {
    console.error('Failed to load collection designs:', err);
    designsGrid.innerHTML = '';
    designsGrid.style.display = 'none';
    emptyState.style.display = 'block';
  }
}

function openOrderModal(product, design = null) {
  const modal = document.getElementById('order-modal');
  if (!modal) return;

  appState.selectedProduct = product;
  appState.selectedDesign = design;
  appState.orderQuantity = 1;

  // Set product details
  document.getElementById('modal-prod-title').textContent = product.name;
  document.getElementById('modal-prod-size').textContent = `Size: ${product.dimensions || product.size}`;
  document.getElementById('modal-qty-input').value = 1;
  document.getElementById('modal-hidden-product-id').value = product.productId;

  // Selected design fields
  const designImgElem = document.getElementById('modal-selected-design-img');
  const designNameElem = document.getElementById('modal-selected-design-name');
  const hiddenDesignId = document.getElementById('modal-hidden-design-id');
  const hiddenDesignName = document.getElementById('modal-hidden-design-name');
  const hiddenDesignImage = document.getElementById('modal-hidden-design-image');

  if (design) {
    if (designImgElem) {
      designImgElem.src = design.imageUrl;
      designImgElem.style.display = 'block';
    }
    if (designNameElem) {
      designNameElem.textContent = `Design: ${design.name}`;
      designNameElem.style.display = 'block';
    }
    if (hiddenDesignId) hiddenDesignId.value = design.designId;
    if (hiddenDesignName) hiddenDesignName.value = design.name;
    if (hiddenDesignImage) hiddenDesignImage.value = design.imageUrl;
  } else {
    if (designImgElem) designImgElem.style.display = 'none';
    if (designNameElem) designNameElem.style.display = 'none';
    if (hiddenDesignId) hiddenDesignId.value = '';
    if (hiddenDesignName) hiddenDesignName.value = '';
    if (hiddenDesignImage) hiddenDesignImage.value = '';
  }

  // Reset form views
  document.getElementById('modal-form-view').style.display = 'block';
  document.getElementById('modal-success-view').style.display = 'none';

  updateModalPriceSummary();
  modal.classList.add('open');
}

function closeModal(modal) {
  modal.classList.remove('open');
}

function updateModalPriceSummary() {
  if (!appState.selectedProduct) return;
  const qty = parseInt(document.getElementById('modal-qty-input').value, 10) || 1;
  const unitPrice = appState.selectedProduct.price;
  const total = unitPrice * qty;

  const totalElem = document.getElementById('modal-total-display');
  if (totalElem) {
    totalElem.textContent = `₹${total}`;
  }
}

// Real Order Submission Handler
async function submitCustomerOrder(formElement, isCustomOrderPage = false) {
  const submitBtn = formElement.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.innerHTML;

  try {
    // Validate fields
    const nameInput = formElement.querySelector('[name="customerName"]');
    const phoneInput = formElement.querySelector('[name="customerWhatsapp"]');
    const streetInput = formElement.querySelector('[name="street"]');
    const cityInput = formElement.querySelector('[name="city"]');
    const pincodeInput = formElement.querySelector('[name="pincode"]');

    if (!nameInput.value.trim()) {
      showToast('Please enter your full name.', 'error');
      nameInput.focus();
      return;
    }

    const cleanPhone = phoneInput.value.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      showToast('Please enter a valid 10-digit WhatsApp number.', 'error');
      phoneInput.focus();
      return;
    }

    if (!streetInput.value.trim() || !cityInput.value.trim() || !pincodeInput.value.trim()) {
      showToast('Please fill in complete delivery address details.', 'error');
      return;
    }

    // Set loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite; margin-right: 6px;">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
        <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
      </svg>
      Saving Order to Database...
    `;

    const formData = new FormData(formElement);

    const response = await fetch('/api/orders', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (result.success && result.orderId) {
      // Order actually saved to MongoDB!
      if (isCustomOrderPage) {
        showCustomOrderSuccess(result);
      } else {
        showModalOrderSuccess(result);
      }
      formElement.reset();
      showToast(`Order #${result.orderId} placed successfully!`, 'success');
    } else {
      showToast(result.error || 'Failed to submit order. Please try again.', 'error');
    }
  } catch (err) {
    console.error('Order submission error:', err);
    showToast('Network error while placing order. Please try again or WhatsApp us directly.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }
}

// Display Confirmation inside Modal
function showModalOrderSuccess(result) {
  document.getElementById('modal-form-view').style.display = 'none';
  const successView = document.getElementById('modal-success-view');
  successView.style.display = 'block';

  document.getElementById('success-order-id').textContent = result.orderId;
  document.getElementById('success-order-total').textContent = `₹${result.totalPrice}`;

  const waBtn = document.getElementById('modal-whatsapp-confirm-btn');
  if (waBtn && result.customerWhatsAppLink) {
    waBtn.href = result.customerWhatsAppLink;
  }
}

// ==========================================================================
// DEDICATED CUSTOM ORDER FORM
// ==========================================================================
function initializeCustomOrderForm() {
  const customForm = document.getElementById('custom-order-form');
  const fileInput = document.getElementById('custom-file-input');
  const filePreview = document.getElementById('custom-file-preview');
  const fileNameDisplay = document.getElementById('custom-file-name');

  if (fileInput && filePreview && fileNameDisplay) {
    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        if (file.size > 15 * 1024 * 1024) {
          showToast('File is too large. Maximum size is 15MB.', 'error');
          fileInput.value = '';
          filePreview.classList.remove('show');
          return;
        }
        fileNameDisplay.textContent = `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
        filePreview.classList.add('show');
      } else {
        filePreview.classList.remove('show');
      }
    });
  }

  if (customForm) {
    customForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const productSelect = document.getElementById('custom-product-select');
      if (!productSelect.value) {
        showToast('Please choose a preferred size or format.', 'error');
        productSelect.focus();
        return;
      }
      await submitCustomerOrder(customForm, true);
    });
  }
}

function showCustomOrderSuccess(result) {
  const resultCard = document.getElementById('custom-order-success-card');
  const formCard = document.getElementById('custom-order-form');

  if (resultCard && formCard) {
    formCard.style.display = 'none';
    resultCard.style.display = 'block';

    document.getElementById('custom-success-order-id').textContent = result.orderId;
    document.getElementById('custom-success-total').textContent = `₹${result.totalPrice} (Base price)`;

    const waBtn = document.getElementById('custom-whatsapp-confirm-btn');
    if (waBtn && result.customerWhatsAppLink) {
      waBtn.href = result.customerWhatsAppLink;
    }
  }
}

// ==========================================================================
// SECURE ORDER TRACKING
// ==========================================================================
function initializeTrackingForm() {
  const form = document.getElementById('order-tracking-form');
  const resultBox = document.getElementById('tracking-result-box');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const orderIdInput = document.getElementById('track-order-id');
    const phoneInput = document.getElementById('track-whatsapp');
    const trackBtn = form.querySelector('button[type="submit"]');

    const orderId = orderIdInput.value.trim();
    const whatsapp = phoneInput.value.trim();

    if (!orderId || !whatsapp) {
      showToast('Please enter both Order ID and WhatsApp number to track your order.', 'error');
      return;
    }

    const origBtnHtml = trackBtn.innerHTML;
    trackBtn.disabled = true;
    trackBtn.innerHTML = 'Verifying with Database...';

    try {
      const response = await fetch(`/api/orders/track?orderId=${encodeURIComponent(orderId)}&whatsapp=${encodeURIComponent(whatsapp)}`);
      const data = await response.json();

      if (data.success && data.order) {
        renderTrackingResult(data.order);
        resultBox.classList.add('show');
        resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        resultBox.classList.remove('show');
        showToast(data.error || 'No matching order found. Please verify your Order ID and phone number.', 'error');
      }
    } catch (err) {
      console.error('Tracking error:', err);
      showToast('Failed to connect to tracking service. Please try again.', 'error');
    } finally {
      trackBtn.disabled = false;
      trackBtn.innerHTML = origBtnHtml;
    }
  });
}

function renderTrackingResult(order) {
  const orderIdSpan = document.getElementById('track-res-order-id');
  const statusSpan = document.getElementById('track-res-status');
  const customerSpan = document.getElementById('track-res-customer');
  const citySpan = document.getElementById('track-res-city');
  const itemsSpan = document.getElementById('track-res-items');
  const totalSpan = document.getElementById('track-res-total');
  const timelineContainer = document.getElementById('track-res-timeline');
  const waContactBtn = document.getElementById('track-res-whatsapp-btn');

  if (orderIdSpan) orderIdSpan.textContent = order.orderId;

  if (statusSpan) {
    statusSpan.textContent = order.status;
    statusSpan.className = `order-badge-status status-${order.status.replace(/\s+/g, '-')}`;
  }

  if (customerSpan) customerSpan.textContent = order.customerName;
  if (citySpan) citySpan.textContent = order.deliveryCity;

  if (itemsSpan && Array.isArray(order.items)) {
    itemsSpan.innerHTML = order.items.map(item => `
      <div style="font-size: 0.9rem; margin-bottom: 0.35rem;">
        <strong>${item.name}</strong> (${item.size}) &times; ${item.quantity} — 
        <span style="color: var(--brand-orange); font-weight: 700;">₹${item.subtotal}</span>
      </div>
    `).join('');
  }

  if (totalSpan) {
    totalSpan.textContent = `₹${order.totalPrice}${order.isCustomPricePending ? ' (Custom quote pending)' : ''}`;
  }

  // Render Status History Timeline
  if (timelineContainer && Array.isArray(order.statusHistory)) {
    timelineContainer.innerHTML = order.statusHistory.map(step => {
      const dateFormatted = new Date(step.timestamp).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
      return `
        <div class="timeline-step active">
          <div class="timeline-dot"></div>
          <div class="timeline-step-title">${step.status}</div>
          <div class="timeline-step-time">${dateFormatted}</div>
          ${step.note ? `<div class="timeline-step-note">${step.note}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  // Direct WhatsApp contact for this order
  if (waContactBtn) {
    const msg = encodeURIComponent(`Hi Mr Moses Poster Store, I am inquiring about my Order #${order.orderId} (Current Status: ${order.status}).`);
    waContactBtn.href = `https://wa.me/91${appState.storeWhatsApp}?text=${msg}`;
  }
}

// ==========================================================================
// CONTACT US FORM (Direct WhatsApp trigger)
// ==========================================================================
function initializeContactForm() {
  const form = document.getElementById('contact-inquiry-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('contact-name').value.trim();
    const phone = document.getElementById('contact-phone').value.trim();
    const inquiry = document.getElementById('contact-message').value.trim();

    if (!name || !inquiry) {
      showToast('Please enter your name and message.', 'error');
      return;
    }

    const prefilledText = encodeURIComponent(
      `Hello Mr Moses Poster Store!\n` +
      `My Name: ${name}\n` +
      (phone ? `Phone: ${phone}\n` : '') +
      `Inquiry: ${inquiry}`
    );

    window.open(`https://wa.me/91${appState.storeWhatsApp}?text=${prefilledText}`, '_blank');
    form.reset();
    showToast('Opening WhatsApp with your pre-filled inquiry...', 'success');
  });
}
