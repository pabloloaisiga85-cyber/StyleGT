/**
 * StyleGT - Admin Workspace Logic (Supabase Auth + Full CRUD)
 */
(function () {
  'use strict';

  const SUPABASE_URL = 'https://yygmdjfvpvnpsmjaqbqp.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5Z21kamZ2cHZucHNtamFxYnFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzODQwNDIsImV4cCI6MjEwNjk2MDA0Mn0.aOCdU2wgjxzeilIvBeaMmrzHj4gHl21FvPH_4_ltNfg';
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const state = {
    products: [],
    categories: [],
    orders: [],
    activeTab: 'resumen',
    orderStatusFilter: 'all',
    onlyLowStock: false,
    croppedBlob: null,
    cropper: null
  };

  const $ = (id) => document.getElementById(id);

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

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str || '')));
    return div.innerHTML;
  }

  function formatMoney(v) {
    return `$${Number(v || 0).toFixed(2)}`;
  }

  function showToast(msg, type = 'normal') {
    const container = $('toastContainer');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3400);
  }

  /* ==========================================================================
     Theme Toggle (synced with stylegt_theme)
     ========================================================================== */
  function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const next = isDark ? 'light' : 'dark';
    if (next === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    try { localStorage.setItem('stylegt_theme', next); } catch (e) {}
  }

  /* ==========================================================================
     Auth (Supabase Auth)
     ========================================================================== */
  async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      showDashboard();
      await loadAllData();
    } else {
      showAuth();
    }
  }

  function showAuth() {
    $('authView').style.display = 'flex';
    $('dashboardView').style.display = 'none';
    if (window.lucide) window.lucide.createIcons();
  }

  function playWelcomeAnimation(callback) {
    const splash = $('welcomeSplash');
    if (!splash) {
      if (callback) callback();
      return;
    }
    splash.style.display = 'flex';
    splash.classList.remove('fade-out');

    // Display for 1.1s, then fluid fade out in 0.4s
    setTimeout(() => {
      splash.classList.add('fade-out');
      setTimeout(() => {
        splash.style.display = 'none';
        splash.classList.remove('fade-out');
        if (callback) callback();
      }, 420);
    }, 1100);
  }

  function showDashboard(withWelcome = false) {
    $('authView').style.display = 'none';
    $('dashboardView').style.display = 'grid';
    if (window.lucide) window.lucide.createIcons();
    if (withWelcome) {
      playWelcomeAnimation();
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    const email = $('loginEmail').value.trim();
    const password = $('loginPassword').value;
    const errBox = $('loginError');
    const btn = $('loginSubmitBtn');

    errBox.style.display = 'none';
    btn.disabled = true;

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    btn.disabled = false;

    if (error) {
      errBox.textContent = error.message === 'Invalid login credentials'
        ? 'Correo o contraseña incorrectos.'
        : error.message;
      errBox.style.display = 'block';
      return;
    }

    showDashboard(true);
    await loadAllData();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    showAuth();
  }

  /* ==========================================================================
     Data Loading
     ========================================================================== */
  async function loadAllData() {
    try {
      const [catRes, prodRes, ordRes] = await Promise.all([
        supabase.from('categorias').select('*').order('id', { ascending: true }),
        supabase.from('productos').select('*, categorias(nombre), variantes_producto(*)').order('id', { ascending: true }),
        supabase.from('pedidos').select('*, items_pedido(*, variantes_producto(color, talla, productos(nombre)))').order('created_at', { ascending: false })
      ]);

      if (catRes.error) throw catRes.error;
      if (prodRes.error) throw prodRes.error;
      if (ordRes.error) throw ordRes.error;

      state.categories = catRes.data || [];
      state.products = prodRes.data || [];
      state.orders = ordRes.data || [];

      renderAll();
    } catch (err) {
      console.error(err);
      showToast('Error al cargar datos de Supabase: ' + (err.message || ''), 'error');
    }
  }

  function renderAll() {
    renderResumen();
    renderOrders();
    renderCategorySelects();
    renderProductsTable();
    renderCategoriesList();
    if (window.lucide) window.lucide.createIcons();
  }

  /* ==========================================================================
     Navigation Tabs
     ========================================================================== */
  const TAB_META = {
    resumen: ['Resumen', 'Estado general de ventas, pedidos e inventario.'],
    pedidos: ['Pedidos', 'Gestiona estados de envío y contacta clientes por WhatsApp.'],
    productos: ['Productos & Variantes', 'Crea, edita, pausa o elimina prendas y sus tallas/colores.'],
    categorias: ['Categorías', 'Organiza las colecciones de tu tienda.']
  };

  function switchTab(tab) {
    state.activeTab = tab;
    document.querySelectorAll('#sidebarNav .nav-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.querySelectorAll('.tab-panel').forEach(p => {
      p.classList.toggle('active', p.id === `tab-${tab}`);
    });
    const meta = TAB_META[tab] || ['Admin', ''];
    $('topbarTitle').textContent = meta[0];
    $('topbarSubtitle').textContent = meta[1];
  }

  /* ==========================================================================
     Tab 1: Resumen (KPIs + Low Stock)
     ========================================================================== */
  function renderResumen() {
    const validOrders = state.orders.filter(o => o.estado !== 'cancelado');
    const revenue = validOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const pendingCount = state.orders.filter(o => o.estado === 'pendiente').length;
    const activeProds = state.products.filter(p => p.activo).length;

    const lowStockItems = [];
    state.products.forEach(p => {
      (p.variantes_producto || []).forEach(v => {
        if (v.stock <= 3) {
          lowStockItems.push({ product: p, variant: v });
        }
      });
    });

    $('kpiRevenue').textContent = formatMoney(revenue);
    $('kpiPending').textContent = pendingCount;
    $('kpiProducts').textContent = activeProds;
    $('kpiLowStock').textContent = lowStockItems.length;

    const stockBadge = $('lowStockNavBadge');
    if (stockBadge) {
      if (lowStockItems.length > 0) {
        stockBadge.textContent = lowStockItems.length;
        stockBadge.style.display = 'inline-block';
        stockBadge.title = `${lowStockItems.length} variante(s) con stock bajo o agotado`;
      } else {
        stockBadge.style.display = 'none';
      }
    }

    const badge = $('pendingOrdersBadge');
    if (pendingCount > 0) {
      badge.textContent = pendingCount;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }

    const list = $('lowStockList');
    if (lowStockItems.length === 0) {
      list.innerHTML = '<div class="list-row"><span>Todo tu inventario tiene stock saludable (&gt; 3 unidades).</span></div>';
      return;
    }

    list.innerHTML = '';
    lowStockItems.slice(0, 12).forEach(({ product, variant }) => {
      const row = document.createElement('div');
      row.className = 'list-row';
      row.innerHTML = `
        <div style="display:flex; align-items:center; gap:0.55rem; flex-wrap:wrap;">
          <span class="stock-chip-dot" style="background-color:${getColorHex(variant.color)};" title="${escapeHTML(variant.color)}"></span>
          <strong>${escapeHTML(product.nombre)}</strong>
          <span style="color: var(--text-muted);">${escapeHTML(variant.color)} · Talla ${escapeHTML(variant.talla)}</span>
        </div>
        <div class="low-stock-row-actions">
          <span class="status-badge ${variant.stock === 0 ? 'status-paused' : 'status-pendiente'}">
            ${variant.stock === 0 ? 'Agotado' : `${variant.stock} uds`}
          </span>
          <button type="button" class="btn btn-secondary btn-sm btn-restock-now">Reponer</button>
        </div>
      `;
      row.querySelector('.btn-restock-now').addEventListener('click', () => openProductModal(product));
      list.appendChild(row);
    });
  }

  /* ==========================================================================
     Tab 2: Pedidos
     ========================================================================== */
  function renderOrders() {
    const container = $('ordersList');
    const filtered = state.orderStatusFilter === 'all'
      ? state.orders
      : state.orders.filter(o => o.estado === state.orderStatusFilter);

    if (filtered.length === 0) {
      container.innerHTML = '<div class="panel-card"><p style="color: var(--text-muted);">No hay pedidos en esta categoría.</p></div>';
      return;
    }

    container.innerHTML = '';
    filtered.forEach(order => {
      const dateStr = order.created_at ? new Date(order.created_at).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : '';
      const cleanPhone = String(order.telefono || '').replace(/\D/g, '');
      const waMsg = encodeURIComponent(`Hola ${order.nombre_cliente}, te escribimos de StyleGT sobre tu pedido #ORD-${order.id}.`);

      const itemsHTML = (order.items_pedido || []).map(it => {
        const prodName = it.variantes_producto?.productos?.nombre || 'Prenda';
        const talla = it.variantes_producto?.talla || '-';
        const color = it.variantes_producto?.color || '-';
        return `<div>${it.cantidad}× <strong>${escapeHTML(prodName)}</strong> (${escapeHTML(talla)} / ${escapeHTML(color)}) — ${formatMoney(it.precio_unitario)}</div>`;
      }).join('');

      const isTransfer = order.metodo_pago === 'transferencia';
      const isPaid = order.estado_pago === 'pagado';

      const card = document.createElement('article');
      card.className = 'order-card';
      card.innerHTML = `
        <div class="order-card-top">
          <div>
            <div class="order-id">Pedido #ORD-${order.id}</div>
            <div class="order-date">${escapeHTML(dateStr)}</div>
          </div>
          <div style="display:flex; gap:0.35rem; align-items:center; flex-wrap:wrap; justify-content:flex-end;">
            <button type="button" class="status-badge ${isPaid ? 'status-active' : 'status-pendiente'} btn-toggle-paid" title="Clic para cambiar estado de pago">
              ${isTransfer ? 'Transferencia' : 'Contra entrega'} · ${isPaid ? 'Pagado' : 'Por cobrar'}
            </button>
            <span class="status-badge status-${escapeHTML(order.estado)}">${escapeHTML(order.estado)}</span>
          </div>
        </div>
        <div class="order-customer">
          <div><strong>Cliente:</strong> ${escapeHTML(order.nombre_cliente)}</div>
          <div><strong>Tel:</strong> ${escapeHTML(order.telefono)}</div>
          <div><strong>Dirección:</strong> ${escapeHTML(order.direccion_envio)}</div>
        </div>
        <div class="order-items-box">${itemsHTML || 'Sin detalle de ítems'}</div>
        ${order.comprobante_url ? `
          <div class="order-receipt-row">
            <div class="order-receipt-thumb-wrap">
              <img src="${escapeHTML(order.comprobante_url)}" alt="Comprobante" class="order-receipt-thumb">
              <span>Comprobante adjunto</span>
            </div>
            <button type="button" class="btn btn-secondary btn-sm btn-view-receipt">Ver Comprobante</button>
          </div>
        ` : ''}
        <div class="order-card-footer">
          <span class="order-total">${formatMoney(order.total)}</span>
          <div class="order-controls">
            ${cleanPhone ? `<a href="https://wa.me/${cleanPhone}?text=${waMsg}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">WhatsApp</a>` : ''}
            <select class="form-select order-status-select" data-order-id="${order.id}">
              ${['pendiente', 'preparando', 'enviado', 'entregado', 'cancelado'].map(st =>
                `<option value="${st}" ${order.estado === st ? 'selected' : ''}>${st.charAt(0).toUpperCase() + st.slice(1)}</option>`
              ).join('')}
            </select>
          </div>
        </div>
      `;

      const receiptBtn = card.querySelector('.btn-view-receipt');
      if (receiptBtn) {
        receiptBtn.addEventListener('click', () => openReceiptModal(order));
      }

      card.querySelector('.btn-toggle-paid').addEventListener('click', async () => {
        const nextPaid = order.estado_pago === 'pagado' ? 'pendiente' : 'pagado';
        const { error } = await supabase.from('pedidos').update({ estado_pago: nextPaid }).eq('id', order.id);
        if (error) {
          showToast('Ejecuta supabase_transferencia.sql en Supabase primero', 'error');
          return;
        }
        order.estado_pago = nextPaid;
        showToast(`Pago #ORD-${order.id} → ${nextPaid === 'pagado' ? 'Pagado' : 'Por cobrar'}`, 'success');
        renderOrders();
      });

      card.querySelector('.order-status-select').addEventListener('change', async (e) => {
        const nextStatus = e.target.value;
        const { error } = await supabase.from('pedidos').update({ estado: nextStatus }).eq('id', order.id);
        if (error) {
          showToast('Error al actualizar pedido', 'error');
          return;
        }
        order.estado = nextStatus;
        showToast(`Pedido #ORD-${order.id} → ${nextStatus}`, 'success');
        renderResumen();
        renderOrders();
      });

      container.appendChild(card);
    });
  }

  /* ==========================================================================
     Tab 3: Productos & Variantes (Full CRUD)
     ========================================================================== */
  function renderCategorySelects() {
    const filterSel = $('prodCatFilter');
    const formSel = $('prodCategory');
    const prevFilter = filterSel.value;

    filterSel.innerHTML = '<option value="all">Todas las categorías</option>';
    formSel.innerHTML = '';

    state.categories.forEach(c => {
      filterSel.innerHTML += `<option value="${c.id}">${escapeHTML(c.nombre)}</option>`;
      formSel.innerHTML += `<option value="${c.id}">${escapeHTML(c.nombre)}</option>`;
    });

    if (prevFilter) filterSel.value = prevFilter;
  }

  function renderProductsTable() {
    const tbody = $('productsTableBody');
    const q = $('prodSearchInput').value.toLowerCase().trim();
    const catId = $('prodCatFilter').value;

    const lowStockProductsCount = state.products.filter(p =>
      (p.variantes_producto || []).some(v => Number(v.stock) <= 3)
    ).length;
    if ($('prodLowStockCount')) {
      $('prodLowStockCount').textContent = lowStockProductsCount;
    }

    const filtered = state.products.filter(p => {
      const matchCat = catId === 'all' || String(p.categoria_id) === String(catId);
      const matchQ = !q || (p.nombre || '').toLowerCase().includes(q);
      const matchLow = !state.onlyLowStock || (p.variantes_producto || []).some(v => Number(v.stock) <= 3);
      return matchCat && matchQ && matchLow;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding: 2rem;">No hay productos que coincidan.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    filtered.forEach(p => {
      const variants = p.variantes_producto || [];
      const totalStock = variants.reduce((s, v) => s + Number(v.stock || 0), 0);
      const catName = p.categorias?.nombre || 'Sin categoría';

      // Check stock alert levels
      const outOfStockVars = variants.filter(v => Number(v.stock) === 0);
      const lowStockVars = variants.filter(v => Number(v.stock) > 0 && Number(v.stock) <= 3);
      const alertVars = [...outOfStockVars, ...lowStockVars];

      let stockHTML = `<span>${totalStock} uds</span>`;
      if (alertVars.length > 0 || totalStock === 0) {
        const isCritical = totalStock === 0 || outOfStockVars.length > 0;
        const chipsHTML = alertVars.map(v => {
          const isZero = Number(v.stock) === 0;
          return `
            <span class="stock-chip ${isZero ? 'stock-chip-out' : 'stock-chip-low'}" title="${escapeHTML(v.color)} · Talla ${escapeHTML(v.talla)}">
              <span class="stock-chip-dot" style="background-color:${getColorHex(v.color)};"></span>
              <span>${escapeHTML(v.color)} · ${escapeHTML(v.talla)}: ${isZero ? '0u' : `${v.stock}u`}</span>
            </span>
          `;
        }).join('');

        stockHTML = `
          <div class="stock-cell-wrap">
            <div class="stock-pill-indicator ${isCritical ? 'stock-warn-text-out' : 'stock-warn-text-low'}">
              <span class="stock-beacon ${isCritical ? 'stock-beacon-out' : 'stock-beacon-low'}"></span>
              <span>${totalStock} uds</span>
            </div>
            ${chipsHTML ? `<div class="stock-chips-list">${chipsHTML}</div>` : ''}
          </div>
        `;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="prod-cell">
            <img src="${escapeHTML(p.imagen_url || '')}" alt="" class="prod-thumb" onerror="this.style.visibility='hidden'">
            <div>
              <div class="prod-name">${escapeHTML(p.nombre)}</div>
              <div class="prod-variants-mini">${variants.length} variantes</div>
            </div>
          </div>
        </td>
        <td>${escapeHTML(catName)}</td>
        <td><strong>${formatMoney(p.precio)}</strong></td>
        <td>${stockHTML}</td>
        <td>
          <span class="status-badge ${p.activo ? 'status-active' : 'status-paused'}">
            ${p.activo ? 'Activo' : 'Pausado'}
          </span>
        </td>
        <td>
          <div class="row-actions">
            <button type="button" class="btn btn-secondary btn-sm btn-edit-prod">Editar</button>
            <button type="button" class="btn btn-danger-outline btn-sm btn-del-prod">Eliminar</button>
          </div>
        </td>
      `;

      tr.querySelector('.btn-edit-prod').addEventListener('click', () => openProductModal(p));
      tr.querySelector('.btn-del-prod').addEventListener('click', () => deleteProduct(p));
      tbody.appendChild(tr);
    });
  }

  function addVariantRow(v = { id: '', color: '', talla: 'M', stock: 5 }) {
    const container = $('variantRowsContainer');
    const row = document.createElement('div');
    const stockNum = Number(v.stock ?? 0);
    const isOut = stockNum === 0;
    const isLow = stockNum > 0 && stockNum <= 3;

    row.className = `variant-row ${isOut ? 'variant-row-out' : (isLow ? 'variant-row-low' : '')}`;
    row.dataset.variantId = v.id || '';
    row.innerHTML = `
      <div class="variant-input-with-beacon">
        ${isOut ? '<span class="stock-beacon stock-beacon-out" title="Agotado"></span>' : ''}
        ${isLow ? '<span class="stock-beacon stock-beacon-low" title="Bajo stock (≤ 3)"></span>' : ''}
        <input type="text" class="form-input var-color" placeholder="Color (ej. Negro)" value="${escapeHTML(v.color)}" required>
      </div>
      <input type="text" class="form-input var-talla" placeholder="Talla (M)" value="${escapeHTML(v.talla)}" required>
      <input type="number" class="form-input var-stock ${isOut ? 'input-warn-out' : (isLow ? 'input-warn-low' : '')}" min="0" placeholder="Stock" value="${stockNum}" required>
      <button type="button" class="icon-btn btn-remove-var" title="Quitar variante">
        <i data-lucide="trash-2" class="icon-xs"></i>
      </button>
    `;
    row.querySelector('.btn-remove-var').addEventListener('click', () => row.remove());
    container.appendChild(row);
    if (window.lucide) window.lucide.createIcons();
  }

  function openProductModal(product = null) {
    state.croppedBlob = null;
    if (state.cropper) { state.cropper.destroy(); state.cropper = null; }
    $('cropperBox').style.display = 'none';
    $('prodImgFile').value = '';
    $('variantRowsContainer').innerHTML = '';

    if (product) {
      $('productModalTitle').textContent = `Editar: ${product.nombre}`;
      $('editProductId').value = product.id;
      $('prodName').value = product.nombre || '';
      $('prodPrice').value = product.precio || '';
      $('prodCategory').value = product.categoria_id || (state.categories[0]?.id || '');
      $('prodActive').value = String(product.activo !== false);
      $('prodDesc').value = product.descripcion || '';
      $('prodImgUrl').value = product.imagen_url || '';
      if (product.imagen_url) {
        $('prodImgPreview').src = product.imagen_url;
        $('prodImgPreview').style.display = 'block';
      } else {
        $('prodImgPreview').style.display = 'none';
      }
      (product.variantes_producto || []).forEach(v => addVariantRow(v));
    } else {
      $('productModalTitle').textContent = 'Nuevo Producto';
      $('editProductId').value = '';
      $('productForm').reset();
      $('prodActive').value = 'true';
      $('prodImgPreview').style.display = 'none';
      addVariantRow({ color: 'Negro', talla: 'M', stock: 10 });
    }

    $('productFormModal').classList.add('open');
    $('productFormModal').setAttribute('aria-hidden', 'false');
  }

  function closeProductModal() {
    if (state.cropper) { state.cropper.destroy(); state.cropper = null; }
    $('productFormModal').classList.remove('open');
    $('productFormModal').setAttribute('aria-hidden', 'true');
  }

  function handleImageFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      $('cropperImage').src = ev.target.result;
      $('cropperBox').style.display = 'block';
      if (state.cropper) state.cropper.destroy();
      state.cropper = new window.Cropper($('cropperImage'), { aspectRatio: 3 / 4, viewMode: 1 });
    };
    reader.readAsDataURL(file);
  }

  function applyCrop() {
    if (!state.cropper) return;
    state.cropper.getCroppedCanvas({ width: 800, height: 1066 }).toBlob((blob) => {
      state.croppedBlob = blob;
      $('prodImgPreview').src = URL.createObjectURL(blob);
      $('prodImgPreview').style.display = 'block';
      $('cropperBox').style.display = 'none';
      state.cropper.destroy();
      state.cropper = null;
      showToast('Imagen recortada lista para subir', 'success');
    }, 'image/jpeg', 0.88);
  }

  async function handleSaveProduct(e) {
    e.preventDefault();
    const btn = $('saveProductSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
      const editId = $('editProductId').value;
      let imagenUrl = $('prodImgUrl').value.trim();

      if (state.croppedBlob) {
        const fileName = `prod_${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from('productos')
          .upload(fileName, state.croppedBlob, { contentType: 'image/jpeg', upsert: true });
        if (upErr) throw upErr;
        const { data: pubData } = supabase.storage.from('productos').getPublicUrl(fileName);
        imagenUrl = pubData.publicUrl;
      }

      const payload = {
        nombre: $('prodName').value.trim(),
        precio: parseFloat($('prodPrice').value),
        categoria_id: Number($('prodCategory').value),
        activo: $('prodActive').value === 'true',
        descripcion: $('prodDesc').value.trim(),
        imagen_url: imagenUrl || null
      };

      let productId = editId ? Number(editId) : null;

      if (productId) {
        const { error } = await supabase.from('productos').update(payload).eq('id', productId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('productos').insert(payload).select().single();
        if (error) throw error;
        productId = data.id;
      }

      // Sync variants (update existing, insert new, delete removed)
      const rows = Array.from(document.querySelectorAll('#variantRowsContainer .variant-row'));
      const keptIds = [];

      for (const row of rows) {
        const vId = row.dataset.variantId;
        const vPayload = {
          producto_id: productId,
          color: row.querySelector('.var-color').value.trim(),
          talla: row.querySelector('.var-talla').value.trim(),
          stock: parseInt(row.querySelector('.var-stock').value, 10) || 0
        };
        if (vId) {
          keptIds.push(Number(vId));
          const { error } = await supabase.from('variantes_producto').update(vPayload).eq('id', Number(vId));
          if (error) throw error;
        } else {
          const { data: insVar, error } = await supabase.from('variantes_producto').insert(vPayload).select().single();
          if (error) throw error;
          keptIds.push(insVar.id);
        }
      }

      if (editId) {
        const existingProd = state.products.find(p => p.id === productId);
        const toDelete = (existingProd?.variantes_producto || [])
          .map(v => v.id)
          .filter(id => !keptIds.includes(id));
        if (toDelete.length > 0) {
          await supabase.from('variantes_producto').delete().in('id', toDelete);
        }
      }

      showToast(editId ? 'Producto actualizado en Supabase' : 'Producto creado en Supabase', 'success');
      closeProductModal();
      await loadAllData();
    } catch (err) {
      console.error(err);
      showToast('Error al guardar: ' + (err.message || ''), 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar Producto';
    }
  }

  async function deleteProduct(product) {
    if (!confirm(`¿Eliminar "${product.nombre}" permanentemente?`)) return;
    const { error } = await supabase.from('productos').delete().eq('id', product.id);
    if (error) {
      showToast('Error al eliminar producto', 'error');
      return;
    }
    showToast('Producto eliminado', 'success');
    await loadAllData();
  }

  /* ==========================================================================
     Tab 4: Categorías (Full CRUD)
     ========================================================================== */
  function renderCategoriesList() {
    const list = $('categoriesList');
    list.innerHTML = '';

    state.categories.forEach(cat => {
      const count = state.products.filter(p => Number(p.categoria_id) === Number(cat.id)).length;
      const row = document.createElement('div');
      row.className = 'list-row';
      row.innerHTML = `
        <div>
          <strong>${escapeHTML(cat.nombre)}</strong>
          <span style="color: var(--text-muted);"> · ${count} prenda${count === 1 ? '' : 's'}</span>
        </div>
        <div class="row-actions">
          <button type="button" class="btn btn-secondary btn-sm btn-rename-cat">Renombrar</button>
          <button type="button" class="btn btn-danger-outline btn-sm btn-del-cat">Eliminar</button>
        </div>
      `;

      row.querySelector('.btn-rename-cat').addEventListener('click', async () => {
        const nextName = prompt('Nuevo nombre de categoría:', cat.nombre);
        if (!nextName || !nextName.trim()) return;
        const { error } = await supabase.from('categorias').update({ nombre: nextName.trim() }).eq('id', cat.id);
        if (error) return showToast('Error al renombrar', 'error');
        showToast('Categoría actualizada', 'success');
        await loadAllData();
      });

      row.querySelector('.btn-del-cat').addEventListener('click', async () => {
        if (!confirm(`¿Eliminar la categoría "${cat.nombre}"?`)) return;
        const { error } = await supabase.from('categorias').delete().eq('id', cat.id);
        if (error) return showToast('Error al eliminar categoría', 'error');
        showToast('Categoría eliminada', 'success');
        await loadAllData();
      });

      list.appendChild(row);
    });
  }

  async function handleNewCategory(e) {
    e.preventDefault();
    const input = $('newCategoryName');
    const nombre = input.value.trim();
    if (!nombre) return;
    const { error } = await supabase.from('categorias').insert({ nombre });
    if (error) return showToast('Error al crear categoría: ' + error.message, 'error');
    input.value = '';
    showToast('Categoría creada', 'success');
    await loadAllData();
  }

  let activeReceiptOrder = null;

  function openReceiptModal(order) {
    activeReceiptOrder = order;
    $('receiptModalTitle').textContent = `Comprobante · Pedido #ORD-${order.id}`;
    $('receiptModalImg').src = order.comprobante_url;
    $('receiptMarkPaidBtn').textContent = order.estado_pago === 'pagado' ? 'Ya está Pagado' : 'Marcar como Pagado';
    $('receiptMarkPaidBtn').disabled = order.estado_pago === 'pagado';
    $('receiptModal').classList.add('open');
    $('receiptModal').setAttribute('aria-hidden', 'false');
  }

  function closeReceiptModal() {
    activeReceiptOrder = null;
    $('receiptModal').classList.remove('open');
    $('receiptModal').setAttribute('aria-hidden', 'true');
  }

  /* ==========================================================================
     Event Listeners & Init
     ========================================================================== */
  function setupListeners() {
    $('loginForm').addEventListener('submit', handleLogin);
    $('logoutBtn').addEventListener('click', handleLogout);
    $('themeToggleBtn').addEventListener('click', toggleTheme);
    $('refreshDataBtn').addEventListener('click', loadAllData);

    document.querySelectorAll('#sidebarNav .nav-tab').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    document.querySelectorAll('[data-goto-tab]').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.gotoTab));
    });

    document.querySelectorAll('#orderStatusFilters .pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('#orderStatusFilters .pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.orderStatusFilter = pill.dataset.status;
        renderOrders();
      });
    });

    $('prodSearchInput').addEventListener('input', renderProductsTable);
    $('prodCatFilter').addEventListener('change', renderProductsTable);
    if ($('prodLowStockFilterBtn')) {
      $('prodLowStockFilterBtn').addEventListener('click', () => {
        state.onlyLowStock = !state.onlyLowStock;
        $('prodLowStockFilterBtn').classList.toggle('active', state.onlyLowStock);
        renderProductsTable();
      });
    }
    $('newProductBtn').addEventListener('click', () => openProductModal(null));
    $('closeProductFormModal').addEventListener('click', closeProductModal);
    $('cancelProductFormBtn').addEventListener('click', closeProductModal);
    $('addVariantRowBtn').addEventListener('click', () => addVariantRow());
    $('prodImgFile').addEventListener('change', handleImageFileSelect);
    $('applyCropBtn').addEventListener('click', applyCrop);
    $('cancelCropBtn').addEventListener('click', () => {
      $('cropperBox').style.display = 'none';
      if (state.cropper) { state.cropper.destroy(); state.cropper = null; }
    });
    $('productForm').addEventListener('submit', handleSaveProduct);
    $('newCategoryForm').addEventListener('submit', handleNewCategory);

    if ($('closeReceiptModal')) {
      $('closeReceiptModal').addEventListener('click', closeReceiptModal);
    }
    if ($('receiptModal')) {
      $('receiptModal').addEventListener('click', (e) => {
        if (e.target === $('receiptModal')) closeReceiptModal();
      });
    }
    if ($('receiptMarkPaidBtn')) {
      $('receiptMarkPaidBtn').addEventListener('click', async () => {
        if (!activeReceiptOrder) return;
        const { error } = await supabase.from('pedidos').update({ estado_pago: 'pagado' }).eq('id', activeReceiptOrder.id);
        if (error) return showToast('Error al marcar pagado', 'error');
        activeReceiptOrder.estado_pago = 'pagado';
        showToast(`Pedido #ORD-${activeReceiptOrder.id} marcado como Pagado`, 'success');
        closeReceiptModal();
        renderOrders();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupListeners();
    checkSession();
  });
})();
