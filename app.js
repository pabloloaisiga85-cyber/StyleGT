/**
 * StyleGT - E-Commerce Application Logic
 * Vanilla JavaScript + Supabase JS Client v2
 */

(function () {
  'use strict';

  /* ==========================================================================
     1. Supabase Client Configuration
     ========================================================================== */
  const SUPABASE_URL = "https://yygmdjfvpvnpsmjaqbqp.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5Z21kamZ2cHZucHNtamFxYnFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzODQwNDIsImV4cCI6MjEwNjk2MDA0Mn0.aOCdU2wgjxzeilIvBeaMmrzHj4gHl21FvPH_4_ltNfg";

  if (!window.supabase) {
    console.error("Supabase client library not loaded. Please verify your connection.");
  }
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  /* ==========================================================================
     2. Application State
     ========================================================================== */
  const state = {
    products: [],
    categories: [],
    activeCategory: 'all',
    searchQuery: '',
    sortBy: 'default',
    
    // Active modal state
    modalProduct: null,
    modalVariants: [],
    selectedColor: null,
    selectedSize: null,
    selectedVariant: null,
    modalQuantity: 1,

    // Cart state (persisted in localStorage)
    cart: JSON.parse(localStorage.getItem('stylegt_cart_items') || '[]')
  };

  /* ==========================================================================
     3. DOM Elements Cache
     ========================================================================== */
  const DOM = {
    // Navbar & Filters
    navbar: document.getElementById('navbar'),
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    sortSelect: document.getElementById('sortSelect'),
    categoriesContainer: document.getElementById('categoriesContainer'),
    productCountLabel: document.getElementById('productCountLabel'),
    productsGrid: document.getElementById('productsGrid'),
    emptyState: document.getElementById('emptyState'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),

    // Cart Badges & Triggers
    openCartBtn: document.getElementById('openCartBtn'),
    cartCountBadge: document.getElementById('cartCountBadge'),
    cartDrawer: document.getElementById('cartDrawer'),
    cartDrawerBackdrop: document.getElementById('cartDrawerBackdrop'),
    closeCartBtn: document.getElementById('closeCartBtn'),
    cartDrawerCount: document.getElementById('cartDrawerCount'),
    cartItemsContainer: document.getElementById('cartItemsContainer'),
    cartEmptyState: document.getElementById('cartEmptyState'),
    cartFooter: document.getElementById('cartFooter'),
    cartSubtotal: document.getElementById('cartSubtotal'),
    cartTotal: document.getElementById('cartTotal'),
    cartEmptyExploreBtn: document.getElementById('cartEmptyExploreBtn'),
    goToCheckoutBtn: document.getElementById('goToCheckoutBtn'),

    // Product Detail Modal
    productModal: document.getElementById('productModal'),
    closeProductModalBtn: document.getElementById('closeProductModalBtn'),
    modalProductImg: document.getElementById('modalProductImg'),
    modalProductCategory: document.getElementById('modalProductCategory'),
    modalProductTitle: document.getElementById('modalProductTitle'),
    modalProductPrice: document.getElementById('modalProductPrice'),
    modalProductDesc: document.getElementById('modalProductDesc'),
    selectedColorName: document.getElementById('selectedColorName'),
    colorOptionsContainer: document.getElementById('colorOptionsContainer'),
    selectedSizeName: document.getElementById('selectedSizeName'),
    sizeOptionsContainer: document.getElementById('sizeOptionsContainer'),
    stockStatusBox: document.getElementById('stockStatusBox'),
    stockStatusText: document.getElementById('stockStatusText'),
    qtyMinusBtn: document.getElementById('qtyMinusBtn'),
    qtyPlusBtn: document.getElementById('qtyPlusBtn'),
    qtyDisplay: document.getElementById('qtyDisplay'),
    addToCartBtn: document.getElementById('addToCartBtn'),

    // Checkout Modal
    checkoutModal: document.getElementById('checkoutModal'),
    closeCheckoutModalBtn: document.getElementById('closeCheckoutModalBtn'),
    checkoutForm: document.getElementById('checkoutForm'),
    checkoutItemsPreview: document.getElementById('checkoutItemsPreview'),
    clienteNombre: document.getElementById('clienteNombre'),
    clienteTelefono: document.getElementById('clienteTelefono'),
    clienteDireccion: document.getElementById('clienteDireccion'),
    checkoutTotalAmount: document.getElementById('checkoutTotalAmount'),
    submitOrderBtn: document.getElementById('submitOrderBtn'),
    submitOrderBtnText: document.getElementById('submitOrderBtnText'),
    submitOrderSpinner: document.getElementById('submitOrderSpinner'),

    // Success Modal
    successModal: document.getElementById('successModal'),
    confirmedOrderId: document.getElementById('confirmedOrderId'),
    orderReceiptDetails: document.getElementById('orderReceiptDetails'),
    successCloseBtn: document.getElementById('successCloseBtn'),

    // Toasts
    toastContainer: document.getElementById('toastContainer')
  };

  /* ==========================================================================
     4. Utility Helpers
     ========================================================================== */
  function formatMoney(amount) {
    const val = Number(amount) || 0;
    return `$${val.toFixed(2)}`;
  }

  function showToast(message, type = 'normal') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-triangle';

    toast.innerHTML = `
      <i data-lucide="${iconName}" class="icon-sm"></i>
      <span>${message}</span>
    `;

    DOM.toastContainer.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function getColorHex(colorName) {
    if (!colorName) return '#cccccc';
    const c = colorName.toLowerCase().trim();
    if (c.includes('blanco')) return '#ffffff';
    if (c.includes('negro')) return '#1a1a1a';
    if (c.includes('gris') || c.includes('melange') || c.includes('carbón')) return '#6b7280';
    if (c.includes('verde') || c.includes('oliva')) return '#4d7c0f';
    if (c.includes('beige') || c.includes('arena')) return '#d4c5b9';
    if (c.includes('camel') || c.includes('café') || c.includes('marrón')) return '#b45309';
    if (c.includes('azul') || c.includes('marino')) return '#1e3a8a';
    if (c.includes('rojo') || c.includes('vino')) return '#991b1b';
    return '#94a3b8';
  }

  /* ==========================================================================
     5. Data Fetching from Supabase
     ========================================================================== */
  async function fetchCategories() {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      state.categories = data || [];
      renderCategoryFilters();
    } catch (err) {
      console.error('Error fetching categorias:', err);
      showToast('No se pudieron cargar las categorías', 'error');
    }
  }

  async function fetchProducts() {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*, categorias(nombre)')
        .eq('activo', true)
        .order('id', { ascending: true });

      if (error) throw error;
      state.products = data || [];
      renderProducts();
    } catch (err) {
      console.error('Error fetching productos:', err);
      showToast('Error de conexión al cargar el catálogo', 'error');
      DOM.productsGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <p>No se pudo conectar a la base de datos. Verifica tu conexión a internet.</p>
        </div>
      `;
    }
  }

  async function fetchVariantsForProduct(productId) {
    try {
      const { data, error } = await supabase
        .from('variantes_producto')
        .select('*')
        .eq('producto_id', productId)
        .gt('stock', 0);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching variantes_producto:', err);
      showToast('Error al consultar stock de variantes', 'error');
      return [];
    }
  }

  /* ==========================================================================
     6. Rendering: Filters & Products
     ========================================================================== */
  function renderCategoryFilters() {
    DOM.categoriesContainer.innerHTML = `
      <button class="cat-pill ${state.activeCategory === 'all' ? 'active' : ''}" data-category="all">
        <span>Todos</span>
      </button>
    `;

    state.categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = `cat-pill ${state.activeCategory == cat.id ? 'active' : ''}`;
      btn.dataset.category = cat.id;
      btn.innerHTML = `<span>${cat.nombre.trim()}</span>`;
      btn.addEventListener('click', () => {
        state.activeCategory = cat.id;
        document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        renderProducts();
      });
      DOM.categoriesContainer.appendChild(btn);
    });

    const allBtn = DOM.categoriesContainer.querySelector('[data-category="all"]');
    if (allBtn) {
      allBtn.addEventListener('click', () => {
        state.activeCategory = 'all';
        document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
        allBtn.classList.add('active');
        renderProducts();
      });
    }
  }

  function getFilteredAndSortedProducts() {
    let list = [...state.products];

    // Category filter
    if (state.activeCategory !== 'all') {
      list = list.filter(p => String(p.categoria_id) === String(state.activeCategory));
    }

    // Search query
    if (state.searchQuery.trim() !== '') {
      const q = state.searchQuery.toLowerCase().trim();
      list = list.filter(p =>
        (p.nombre && p.nombre.toLowerCase().includes(q)) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(q)) ||
        (p.categorias && p.categorias.nombre && p.categorias.nombre.toLowerCase().includes(q))
      );
    }

    // Sorting
    switch (state.sortBy) {
      case 'price-asc':
        list.sort((a, b) => Number(a.precio) - Number(b.precio));
        break;
      case 'price-desc':
        list.sort((a, b) => Number(b.precio) - Number(a.precio));
        break;
      case 'name-asc':
        list.sort((a, b) => a.nombre.localeCompare(b.nombre));
        break;
      default:
        // default by id
        break;
    }

    return list;
  }

  function renderProducts() {
    const filtered = getFilteredAndSortedProducts();

    // Update count label
    DOM.productCountLabel.textContent = `${filtered.length} prenda${filtered.length === 1 ? '' : 's'} disponible${filtered.length === 1 ? '' : 's'}`;

    if (filtered.length === 0) {
      DOM.productsGrid.innerHTML = '';
      DOM.emptyState.style.display = 'block';
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    DOM.emptyState.style.display = 'none';
    DOM.productsGrid.innerHTML = '';

    filtered.forEach(product => {
      const card = document.createElement('article');
      card.className = 'product-card';
      card.dataset.id = product.id;

      const categoryName = (product.categorias && product.categorias.nombre)
        ? product.categorias.nombre.trim()
        : 'Colección';

      const fallbackImg = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80';
      const imgSrc = product.imagen_url || fallbackImg;

      card.innerHTML = `
        <div class="product-image-container">
          <img src="${imgSrc}" alt="${product.nombre}" class="product-thumb" loading="lazy" onerror="this.src='${fallbackImg}'">
          <span class="product-category-tag">${categoryName}</span>
        </div>
        <div class="product-card-body">
          <h3 class="product-title">${product.nombre}</h3>
          <p class="product-desc">${product.descripcion || ''}</p>
          <div class="product-card-footer">
            <span class="product-price">${formatMoney(product.precio)}</span>
            <button class="btn-quick-view" type="button" aria-label="Seleccionar talla y color">
              <span>Elegir</span>
              <i data-lucide="chevron-right" class="icon-xs"></i>
            </button>
          </div>
        </div>
      `;

      card.addEventListener('click', () => openProductModal(product));
      DOM.productsGrid.appendChild(card);
    });

    if (window.lucide) window.lucide.createIcons();
  }

  /* ==========================================================================
     7. Product Detail Modal & Variants Selection Logic
     ========================================================================== */
  async function openProductModal(product) {
    state.modalProduct = product;
    state.modalQuantity = 1;
    state.selectedColor = null;
    state.selectedSize = null;
    state.selectedVariant = null;

    // Set basic product details
    const fallbackImg = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80';
    DOM.modalProductImg.src = product.imagen_url || fallbackImg;
    DOM.modalProductImg.alt = product.nombre;
    DOM.modalProductTitle.textContent = product.nombre;
    DOM.modalProductPrice.textContent = formatMoney(product.precio);
    DOM.modalProductDesc.textContent = product.descripcion || 'Sin descripción adicional.';
    DOM.modalProductCategory.textContent = (product.categorias && product.categorias.nombre)
      ? product.categorias.nombre.trim()
      : 'Moda Minimalista';

    DOM.qtyDisplay.textContent = '1';
    DOM.colorOptionsContainer.innerHTML = '<span style="font-size: 0.85rem; color: #737373;">Consultando variantes...</span>';
    DOM.sizeOptionsContainer.innerHTML = '';
    DOM.stockStatusBox.innerHTML = '<span class="stock-text">Cargando disponibilidad...</span>';
    DOM.addToCartBtn.disabled = true;

    // Show modal
    DOM.productModal.classList.add('open');
    DOM.productModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Fetch variants with stock > 0
    const variants = await fetchVariantsForProduct(product.id);
    state.modalVariants = variants;

    if (variants.length === 0) {
      DOM.colorOptionsContainer.innerHTML = '<span style="color: #ef4444; font-size: 0.85rem;">Prenda agotada temporalmente.</span>';
      DOM.sizeOptionsContainer.innerHTML = '';
      DOM.stockStatusBox.innerHTML = `
        <span class="stock-dot out-of-stock"></span>
        <span class="stock-text" style="color: #ef4444;">Sin existencias</span>
      `;
      DOM.addToCartBtn.disabled = true;
      return;
    }

    // Populate colors and sizes
    setupVariantSelectors(variants);
  }

  function setupVariantSelectors(variants) {
    // Unique colors available
    const availableColors = [...new Set(variants.map(v => v.color.trim()))];
    state.selectedColor = availableColors[0];

    renderColorOptions(availableColors);
    updateSizeOptionsForSelectedColor();
  }

  function renderColorOptions(colors) {
    DOM.colorOptionsContainer.innerHTML = '';
    DOM.selectedColorName.textContent = state.selectedColor;

    colors.forEach(color => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `color-chip ${color === state.selectedColor ? 'active' : ''}`;
      
      const hexColor = getColorHex(color);
      chip.innerHTML = `
        <span class="color-dot-indicator" style="background-color: ${hexColor};"></span>
        <span>${color}</span>
      `;

      chip.addEventListener('click', () => {
        state.selectedColor = color;
        DOM.selectedColorName.textContent = color;
        DOM.colorOptionsContainer.querySelectorAll('.color-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        updateSizeOptionsForSelectedColor();
      });

      DOM.colorOptionsContainer.appendChild(chip);
    });
  }

  function updateSizeOptionsForSelectedColor() {
    DOM.sizeOptionsContainer.innerHTML = '';

    // Filter variants that match current color
    const variantsWithColor = state.modalVariants.filter(v => v.color.trim() === state.selectedColor);
    const availableSizes = variantsWithColor.map(v => v.talla.trim());

    // Auto select first available size for this color
    if (!availableSizes.includes(state.selectedSize)) {
      state.selectedSize = availableSizes[0];
    }
    DOM.selectedSizeName.textContent = state.selectedSize || '-';

    // Get all sizes across this product to display enabled/disabled
    const allSizesForProduct = [...new Set(state.modalVariants.map(v => v.talla.trim()))];

    allSizesForProduct.forEach(size => {
      const chip = document.createElement('button');
      chip.type = 'button';
      const isAvailable = availableSizes.includes(size);
      const isSelected = size === state.selectedSize;

      chip.className = `size-chip ${isSelected ? 'active' : ''}`;
      chip.textContent = size;
      chip.disabled = !isAvailable;

      if (isAvailable) {
        chip.addEventListener('click', () => {
          state.selectedSize = size;
          DOM.selectedSizeName.textContent = size;
          DOM.sizeOptionsContainer.querySelectorAll('.size-chip').forEach(s => s.classList.remove('active'));
          chip.classList.add('active');
          resolveSelectedVariant();
        });
      }

      DOM.sizeOptionsContainer.appendChild(chip);
    });

    resolveSelectedVariant();
  }

  function resolveSelectedVariant() {
    const matched = state.modalVariants.find(
      v => v.color.trim() === state.selectedColor && v.talla.trim() === state.selectedSize
    );

    state.selectedVariant = matched || null;
    state.modalQuantity = 1;
    DOM.qtyDisplay.textContent = '1';

    if (matched && matched.stock > 0) {
      DOM.stockStatusBox.innerHTML = `
        <span class="stock-dot in-stock"></span>
        <span class="stock-text">${matched.stock} disponibles en stock</span>
      `;
      DOM.addToCartBtn.disabled = false;
      DOM.qtyMinusBtn.disabled = true;
      DOM.qtyPlusBtn.disabled = matched.stock <= 1;
    } else {
      DOM.stockStatusBox.innerHTML = `
        <span class="stock-dot out-of-stock"></span>
        <span class="stock-text" style="color: #ef4444;">Combinación no disponible</span>
      `;
      DOM.addToCartBtn.disabled = true;
      DOM.qtyMinusBtn.disabled = true;
      DOM.qtyPlusBtn.disabled = true;
    }
  }

  function closeProductModal() {
    DOM.productModal.classList.remove('open');
    DOM.productModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  /* ==========================================================================
     8. Cart Management & Drawer Logic
     ========================================================================== */
  function saveCart() {
    localStorage.setItem('stylegt_cart_items', JSON.stringify(state.cart));
    updateCartUI();
  }

  function addToCart(product, variant, quantity) {
    if (!variant || variant.stock <= 0) {
      showToast('Por favor selecciona una variante disponible', 'error');
      return;
    }

    const existingIndex = state.cart.findIndex(item => item.variante_id === variant.id);

    if (existingIndex > -1) {
      const currentQty = state.cart[existingIndex].cantidad;
      const maxAllowed = variant.stock;

      if (currentQty + quantity > maxAllowed) {
        state.cart[existingIndex].cantidad = maxAllowed;
        showToast(`Alcanzaste el stock máximo (${maxAllowed}) para esta variante`, 'error');
      } else {
        state.cart[existingIndex].cantidad += quantity;
        showToast(`Añadidas ${quantity} unidades al carrito`, 'success');
      }
    } else {
      state.cart.push({
        variante_id: variant.id,
        producto_id: product.id,
        nombre: product.nombre,
        precio: Number(product.precio),
        imagen_url: product.imagen_url,
        talla: variant.talla,
        color: variant.color,
        stock_max: variant.stock,
        cantidad: quantity
      });
      showToast(`"${product.nombre}" (${variant.talla} / ${variant.color}) añadido`, 'success');
    }

    saveCart();
    closeProductModal();
    openCartDrawer();
  }

  function updateCartItemQuantity(varianteId, change) {
    const item = state.cart.find(i => i.variante_id === varianteId);
    if (!item) return;

    const newQty = item.cantidad + change;
    if (newQty <= 0) {
      removeFromCart(varianteId);
      return;
    }

    if (newQty > item.stock_max) {
      showToast(`Stock máximo disponible: ${item.stock_max}`, 'error');
      return;
    }

    item.cantidad = newQty;
    saveCart();
  }

  function removeFromCart(varianteId) {
    state.cart = state.cart.filter(i => i.variante_id !== varianteId);
    saveCart();
    showToast('Producto removido del carrito', 'normal');
  }

  function getCartTotals() {
    const totalItems = state.cart.reduce((sum, item) => sum + item.cantidad, 0);
    const subtotal = state.cart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const total = subtotal; // Free shipping
    return { totalItems, subtotal, total };
  }

  function updateCartUI() {
    const { totalItems, subtotal, total } = getCartTotals();

    // Badges
    DOM.cartCountBadge.textContent = totalItems;
    DOM.cartDrawerCount.textContent = totalItems;

    // Badge bump animation
    DOM.cartCountBadge.classList.remove('bump');
    void DOM.cartCountBadge.offsetWidth;
    DOM.cartCountBadge.classList.add('bump');

    // Totals
    DOM.cartSubtotal.textContent = formatMoney(subtotal);
    DOM.cartTotal.textContent = formatMoney(total);

    // Empty state or Items
    if (state.cart.length === 0) {
      DOM.cartEmptyState.classList.add('visible');
      DOM.cartItemsContainer.innerHTML = '';
      DOM.cartFooter.style.display = 'none';
    } else {
      DOM.cartEmptyState.classList.remove('visible');
      DOM.cartFooter.style.display = 'flex';
      renderCartItems();
    }
  }

  function renderCartItems() {
    DOM.cartItemsContainer.innerHTML = '';

    state.cart.forEach(item => {
      const el = document.createElement('div');
      el.className = 'cart-item';

      const fallbackImg = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80';
      const imgSrc = item.imagen_url || fallbackImg;

      el.innerHTML = `
        <img src="${imgSrc}" alt="${item.nombre}" class="cart-item-thumb">
        <div class="cart-item-details">
          <h4 class="cart-item-title">${item.nombre}</h4>
          <span class="cart-item-variant">Talla: <strong>${item.talla}</strong> | Color: <strong>${item.color}</strong></span>
          <span class="cart-item-price">${formatMoney(item.precio * item.cantidad)} <small style="font-weight:400; color:#737373;">(${formatMoney(item.precio)} c/u)</small></span>
        </div>
        <div class="cart-item-actions">
          <button class="cart-item-remove-btn" title="Eliminar" data-id="${item.variante_id}">
            <i data-lucide="trash-2" class="icon-sm"></i>
          </button>
          <div class="cart-item-qty-control">
            <button class="cart-qty-minus" data-id="${item.variante_id}" aria-label="Disminuir">
              <i data-lucide="minus" class="icon-xs"></i>
            </button>
            <span>${item.cantidad}</span>
            <button class="cart-qty-plus" data-id="${item.variante_id}" aria-label="Aumentar">
              <i data-lucide="plus" class="icon-xs"></i>
            </button>
          </div>
        </div>
      `;

      // Event handlers
      el.querySelector('.cart-item-remove-btn').addEventListener('click', () => {
        removeFromCart(item.variante_id);
      });

      el.querySelector('.cart-qty-minus').addEventListener('click', () => {
        updateCartItemQuantity(item.variante_id, -1);
      });

      el.querySelector('.cart-qty-plus').addEventListener('click', () => {
        updateCartItemQuantity(item.variante_id, 1);
      });

      DOM.cartItemsContainer.appendChild(el);
    });

    if (window.lucide) window.lucide.createIcons();
  }

  function openCartDrawer() {
    DOM.cartDrawer.classList.add('open');
    DOM.cartDrawerBackdrop.classList.add('open');
    DOM.cartDrawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeCartDrawer() {
    DOM.cartDrawer.classList.remove('open');
    DOM.cartDrawerBackdrop.classList.remove('open');
    DOM.cartDrawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  /* ==========================================================================
     9. Checkout Modal & Order Placement into Supabase
     ========================================================================== */
  function openCheckoutModal() {
    if (state.cart.length === 0) {
      showToast('Tu carrito está vacío', 'error');
      return;
    }

    closeCartDrawer();

    const { total } = getCartTotals();
    DOM.checkoutTotalAmount.textContent = formatMoney(total);

    // Build compact preview
    DOM.checkoutItemsPreview.innerHTML = '';
    state.cart.forEach(item => {
      const row = document.createElement('div');
      row.className = 'checkout-preview-item';
      row.innerHTML = `
        <span>${item.cantidad}x ${item.nombre} (${item.talla}, ${item.color})</span>
        <strong>${formatMoney(item.precio * item.cantidad)}</strong>
      `;
      DOM.checkoutItemsPreview.appendChild(row);
    });

    DOM.checkoutModal.classList.add('open');
    DOM.checkoutModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeCheckoutModal() {
    DOM.checkoutModal.classList.remove('open');
    DOM.checkoutModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  async function handleCheckoutSubmit(e) {
    e.preventDefault();

    if (state.cart.length === 0) {
      showToast('El carrito está vacío', 'error');
      closeCheckoutModal();
      return;
    }

    const nombre = DOM.clienteNombre.value.trim();
    const telefono = DOM.clienteTelefono.value.trim();
    const direccion = DOM.clienteDireccion.value.trim();

    if (!nombre || !telefono || !direccion) {
      showToast('Por favor completa todos los campos requeridos', 'error');
      return;
    }

    const { total } = getCartTotals();

    // Set loading button state
    DOM.submitOrderBtn.disabled = true;
    DOM.submitOrderBtnText.style.display = 'none';
    DOM.submitOrderSpinner.style.display = 'block';

    try {
      // 1. Insert order into "pedidos"
      const orderPayload = {
        nombre_cliente: nombre,
        telefono: telefono,
        direccion_envio: direccion,
        total: parseFloat(total.toFixed(2)),
        estado: 'pendiente'
      };

      const { data: pedidoData, error: pedidoError } = await supabase
        .from('pedidos')
        .insert([orderPayload])
        .select()
        .single();

      if (pedidoError) throw pedidoError;
      if (!pedidoData || !pedidoData.id) {
        throw new Error('No se pudo obtener el ID del pedido registrado.');
      }

      const pedidoId = pedidoData.id;

      // 2. Prepare and insert order items into "items_pedido"
      const itemsPayload = state.cart.map(item => ({
        pedido_id: pedidoId,
        variante_id: item.variante_id,
        cantidad: item.cantidad,
        precio_unitario: parseFloat(item.precio.toFixed(2))
      }));

      const { error: itemsError } = await supabase
        .from('items_pedido')
        .insert(itemsPayload);

      if (itemsError) throw itemsError;

      // 3. Success! Clear cart and show confirmation modal
      const placedCart = [...state.cart];
      state.cart = [];
      saveCart();

      // Reset form
      DOM.checkoutForm.reset();
      closeCheckoutModal();

      // Show success modal
      openSuccessModal(pedidoData, placedCart);
      showToast('¡Pedido registrado con éxito!', 'success');

    } catch (err) {
      console.error('Error registrando el pedido en Supabase:', err);
      showToast('Ocurrió un error al procesar el pedido. Intenta nuevamente.', 'error');
    } finally {
      // Reset button state
      DOM.submitOrderBtn.disabled = false;
      DOM.submitOrderBtnText.style.display = 'inline';
      DOM.submitOrderSpinner.style.display = 'none';
    }
  }

  function openSuccessModal(order, items) {
    DOM.confirmedOrderId.textContent = `#ORD-${order.id}`;

    DOM.orderReceiptDetails.innerHTML = `
      <div>
        <span>Cliente:</span>
        <span>${order.nombre_cliente}</span>
      </div>
      <div>
        <span>Teléfono:</span>
        <span>${order.telefono}</span>
      </div>
      <div>
        <span>Dirección:</span>
        <span>${order.direccion_envio}</span>
      </div>
      <div>
        <span>Total Pagado:</span>
        <span style="font-weight: 800; color: #111;">${formatMoney(order.total)}</span>
      </div>
      <div>
        <span>Prendas ordenadas:</span>
        <span>${items.reduce((s, i) => s + i.cantidad, 0)} piezas</span>
      </div>
    `;

    DOM.successModal.classList.add('open');
    DOM.successModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (window.lucide) window.lucide.createIcons();
  }

  function closeSuccessModal() {
    DOM.successModal.classList.remove('open');
    DOM.successModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  /* ==========================================================================
     10. Event Listeners Initialization
     ========================================================================== */
  function setupEventListeners() {
    // Search input
    DOM.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      DOM.clearSearchBtn.style.display = state.searchQuery ? 'flex' : 'none';
      renderProducts();
    });

    DOM.clearSearchBtn.addEventListener('click', () => {
      DOM.searchInput.value = '';
      state.searchQuery = '';
      DOM.clearSearchBtn.style.display = 'none';
      renderProducts();
      DOM.searchInput.focus();
    });

    // Sorting
    DOM.sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      renderProducts();
    });

    // Reset filters from empty state
    DOM.resetFiltersBtn.addEventListener('click', () => {
      state.activeCategory = 'all';
      state.searchQuery = '';
      DOM.searchInput.value = '';
      DOM.clearSearchBtn.style.display = 'none';
      renderCategoryFilters();
      renderProducts();
    });

    // Product Modal Close
    DOM.closeProductModalBtn.addEventListener('click', closeProductModal);
    DOM.productModal.addEventListener('click', (e) => {
      if (e.target === DOM.productModal) closeProductModal();
    });

    // Quantity Stepper in Product Modal
    DOM.qtyMinusBtn.addEventListener('click', () => {
      if (state.modalQuantity > 1) {
        state.modalQuantity--;
        DOM.qtyDisplay.textContent = state.modalQuantity;
        DOM.qtyMinusBtn.disabled = state.modalQuantity <= 1;
        DOM.qtyPlusBtn.disabled = false;
      }
    });

    DOM.qtyPlusBtn.addEventListener('click', () => {
      const max = state.selectedVariant ? state.selectedVariant.stock : 1;
      if (state.modalQuantity < max) {
        state.modalQuantity++;
        DOM.qtyDisplay.textContent = state.modalQuantity;
        DOM.qtyPlusBtn.disabled = state.modalQuantity >= max;
        DOM.qtyMinusBtn.disabled = false;
      }
    });

    // Add To Cart Button
    DOM.addToCartBtn.addEventListener('click', () => {
      addToCart(state.modalProduct, state.selectedVariant, state.modalQuantity);
    });

    // Cart Drawer Open/Close
    DOM.openCartBtn.addEventListener('click', openCartDrawer);
    DOM.closeCartBtn.addEventListener('click', closeCartDrawer);
    DOM.cartDrawerBackdrop.addEventListener('click', closeCartDrawer);
    DOM.cartEmptyExploreBtn.addEventListener('click', closeCartDrawer);

    // Proceed to Checkout
    DOM.goToCheckoutBtn.addEventListener('click', openCheckoutModal);

    // Checkout Modal Close & Form
    DOM.closeCheckoutModalBtn.addEventListener('click', closeCheckoutModal);
    DOM.checkoutModal.addEventListener('click', (e) => {
      if (e.target === DOM.checkoutModal) closeCheckoutModal();
    });
    DOM.checkoutForm.addEventListener('submit', handleCheckoutSubmit);

    // Success Modal Close
    DOM.successCloseBtn.addEventListener('click', closeSuccessModal);
    DOM.successModal.addEventListener('click', (e) => {
      if (e.target === DOM.successModal) closeSuccessModal();
    });

    // Escape Key to close open modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (DOM.checkoutModal.classList.contains('open')) closeCheckoutModal();
        else if (DOM.productModal.classList.contains('open')) closeProductModal();
        else if (DOM.cartDrawer.classList.contains('open')) closeCartDrawer();
        else if (DOM.successModal.classList.contains('open')) closeSuccessModal();
      }
    });
  }

  /* ==========================================================================
     11. Initialize Application
     ========================================================================== */
  async function init() {
    updateCartUI();
    setupEventListeners();
    await fetchCategories();
    await fetchProducts();

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
