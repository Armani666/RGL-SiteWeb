(function () {
  var WHATSAPP_NUMBER = "524791382982";
  var CART_STORAGE_KEY = "rgl_cart_v1";
  var SUPABASE_URL = window.RGL_CONFIG && window.RGL_CONFIG.supabaseUrl ? String(window.RGL_CONFIG.supabaseUrl) : "";
  var SUPABASE_PUBLISHABLE_KEY = window.RGL_CONFIG && window.RGL_CONFIG.supabasePublishableKey ? String(window.RGL_CONFIG.supabasePublishableKey) : "";
  var SUPABASE_CATALOG_VIEW = window.RGL_CONFIG && window.RGL_CONFIG.catalogView ? String(window.RGL_CONFIG.catalogView) : "catalog_products";

  var cart = loadCart();
  var revealObserver = null;

  var yearNode = document.getElementById("copyrightText");
  if (yearNode) {
    yearNode.textContent = "(c) " + new Date().getFullYear() + " Rose Gold Luxury";
  }

  var menuButton = document.querySelector(".menu-toggle");
  var nav = document.getElementById("siteNav");

  if (menuButton && nav) {
    menuButton.addEventListener("click", function () {
      var isOpen = nav.classList.toggle("is-open");
      menuButton.setAttribute("aria-expanded", String(isOpen));
      menuButton.classList.toggle("is-active", isOpen);
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("is-open");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.classList.remove("is-active");
      });
    });
  }

  var filterButtons = document.querySelectorAll(".filter-btn");
  var filterRow = document.querySelector(".filter-row");
  var products = document.querySelectorAll(".product-card");
  var searchInput = document.getElementById("productSearch");
  var priceFilter = document.getElementById("priceFilter");
  var resultsNote = document.getElementById("resultsNote");
  var emptyState = document.getElementById("emptyState");
  var resetFiltersBtn = document.getElementById("resetFiltersBtn");
  var productsGrid = document.getElementById("productsGrid");
  var activeBrand = "all";
  var activePriceRange = "all";

  var cartTrigger = document.getElementById("cartTrigger");
  var cartCount = document.getElementById("cartCount");
  var cartDrawer = document.getElementById("cartDrawer");
  var cartBackdrop = document.getElementById("cartBackdrop");
  var cartClose = document.getElementById("cartClose");
  var cartItems = document.getElementById("cartItems");
  var cartEmpty = document.getElementById("cartEmpty");
  var cartItemsCountNode = document.getElementById("cartItemsCount");
  var cartTotalNode = document.getElementById("cartTotal");
  var cartWhatsappBtn = document.getElementById("cartWhatsappBtn");
  var cartClearBtn = document.getElementById("cartClearBtn");
  var prefillFromCartBtn = document.getElementById("prefillFromCartBtn");
  var orderForm = document.getElementById("orderForm");
  var productGalleryModal = document.getElementById("productGalleryModal");
  var productGalleryBackdrop = document.getElementById("productGalleryBackdrop");
  var productGalleryClose = document.getElementById("productGalleryClose");
  var productGalleryMainImage = document.getElementById("productGalleryMainImage");
  var productGalleryThumbs = document.getElementById("productGalleryThumbs");
  var productGalleryPrev = document.getElementById("productGalleryPrev");
  var productGalleryNext = document.getElementById("productGalleryNext");
  var productGalleryTitle = document.getElementById("productGalleryTitle");
  var productGalleryMainWrap = productGalleryModal ? productGalleryModal.querySelector(".product-gallery-main-wrap") : null;
  var galleryImages = [];
  var galleryIndex = 0;
  var galleryTouchStartX = 0;
  var galleryTouchStartY = 0;

  function refreshProductsCollection() {
    products = document.querySelectorAll(".product-card");
  }

  function refreshFilterButtonsCollection() {
    filterButtons = document.querySelectorAll(".filter-btn");
  }

  function normalizeText(text) {
    return (text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function parsePrice(text) {
    var digits = String(text || "").replace(/[^\d]/g, "");
    return digits ? parseInt(digits, 10) : 0;
  }

  function parseCardPrice(card) {
    if (!card) {
      return 0;
    }
    var explicit = parseNumber(card.getAttribute("data-price"));
    if (explicit > 0) {
      return explicit;
    }
    var priceNode = card.querySelector(".product-footer strong");
    return parsePrice(priceNode ? priceNode.textContent : "0");
  }

  function matchesPriceRange(price, range) {
    if (!range || range === "all") {
      return true;
    }
    if (range === "0-199") {
      return price <= 199;
    }
    if (range === "200-399") {
      return price >= 200 && price <= 399;
    }
    if (range === "400+") {
      return price >= 400;
    }
    return true;
  }

  function parseNumber(value) {
    var num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  function sanitizeImageUrl(rawUrl, fallbackUrl) {
    var fallback = String(fallbackUrl || "assets/images/products/base-maybelline.svg");
    var url = String(rawUrl || "").trim();
    if (!url) {
      return fallback;
    }

    // Allow only https/http absolute URLs and local asset paths.
    var isHttp = /^https?:\/\//i.test(url);
    var isLocalAsset = /^(\/?assets\/|\.\/assets\/)/i.test(url);
    if (!isHttp && !isLocalAsset) {
      return fallback;
    }

    return url;
  }

  function formatCurrency(value) {
    try {
      return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
        maximumFractionDigits: 0
      }).format(Number(value) || 0);
    } catch (error) {
      return "$" + (Number(value) || 0) + " MXN";
    }
  }

  function slugify(text) {
    return normalizeText(text)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "producto";
  }

  function brandFilterKey(brand) {
    return normalizeText(brand).replace(/[^a-z0-9]/g, "") || "otros";
  }

  function brandFilterLabel(brand) {
    return String(brand || "Marca").trim();
  }

  function buildWhatsAppUrl(message) {
    return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message);
  }

  function openWhatsApp(message) {
    window.open(buildWhatsAppUrl(message), "_blank", "noopener,noreferrer");
  }

  function loadCart() {
    try {
      var raw = window.localStorage.getItem(CART_STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter(function (item) {
        return item && item.id && item.name && Number(item.price) >= 0 && Number(item.qty) > 0;
      }).map(function (item) {
        return {
          id: String(item.id),
          name: String(item.name),
          brand: String(item.brand || ""),
          price: Number(item.price) || 0,
          qty: Math.max(1, Number(item.qty) || 1)
        };
      });
    } catch (error) {
      return [];
    }
  }

  function saveCart() {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {}
  }

  function cartItemsCount() {
    return cart.reduce(function (sum, item) { return sum + item.qty; }, 0);
  }

  function cartTotal() {
    return cart.reduce(function (sum, item) { return sum + (item.price * item.qty); }, 0);
  }

  function findCartItemQty(productId) {
    var item = cart.find(function (entry) { return entry.id === productId; });
    return item ? item.qty : 0;
  }

  function getProductData(card) {
    if (!card) {
      return null;
    }

    var nameNode = card.querySelector("h3");
    var brandNode = card.querySelector(".product-tag");
    var priceNode = card.querySelector(".product-footer strong");

    var name = nameNode ? nameNode.textContent.trim() : "Producto";
    var brand = brandNode ? brandNode.textContent.trim() : (card.getAttribute("data-brand") || "");
    var price = parsePrice(priceNode ? priceNode.textContent : "0");
    var id = card.getAttribute("data-product-id") || slugify(brand + "-" + name);
    var stock = parseNumber(card.getAttribute("data-stock"));

    card.setAttribute("data-product-id", id);
    card.setAttribute("data-product-name", name);
    card.setAttribute("data-product-brand", brand);
    card.setAttribute("data-product-price", String(price));

    return {
      id: id,
      name: name,
      brand: brand,
      price: price,
      stock: Number.isFinite(stock) ? stock : 0
    };
  }

  function safeJsonParse(value) {
    if (!value) {
      return null;
    }
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }

  function normalizeImageList(list) {
    if (!Array.isArray(list)) {
      return [];
    }
    return list
      .map(function (item) { return String(item || "").trim(); })
      .map(function (item) { return sanitizeImageUrl(item, ""); })
      .filter(Boolean);
  }

  function parseRowImageList(row, fallbackUrl) {
    var fallback = sanitizeImageUrl(fallbackUrl, "assets/images/products/base-maybelline.svg");
    var candidates = [row && row.images, row && row.image_urls, row && row.gallery_images];
    for (var i = 0; i < candidates.length; i += 1) {
      var value = candidates[i];
      if (Array.isArray(value)) {
        var direct = normalizeImageList(value);
        if (direct.length) {
          return direct;
        }
        continue;
      }
      if (typeof value !== "string") {
        continue;
      }
      var fromJson = normalizeImageList(safeJsonParse(value));
      if (fromJson.length) {
        return fromJson;
      }
      var split = normalizeImageList(value.split(","));
      if (split.length) {
        return split;
      }
    }
    return [fallback];
  }

  function parseCardImageList(card) {
    if (!card) {
      return [];
    }
    var encoded = card.getAttribute("data-product-images");
    if (encoded) {
      var decoded = safeJsonParse(decodeURIComponent(encoded));
      var list = normalizeImageList(decoded);
      if (list.length) {
        return list;
      }
    }
    var first = card.querySelector(".product-media .media-img");
    if (first && first.getAttribute("src")) {
      return [sanitizeImageUrl(first.getAttribute("src"), "")].filter(Boolean);
    }
    return [];
  }

  function closeProductGallery() {
    if (!productGalleryModal || !productGalleryBackdrop) {
      return;
    }
    productGalleryModal.classList.remove("is-open");
    productGalleryModal.setAttribute("aria-hidden", "true");
    productGalleryBackdrop.hidden = true;
    productGalleryBackdrop.classList.remove("is-visible");
  }

  function renderProductGallery() {
    if (!productGalleryMainImage || !productGalleryThumbs || !galleryImages.length) {
      return;
    }
    galleryIndex = (galleryIndex + galleryImages.length) % galleryImages.length;
    productGalleryMainImage.src = galleryImages[galleryIndex];

    var thumbsHtml = galleryImages.map(function (src, idx) {
      var activeClass = idx === galleryIndex ? " is-active" : "";
      return '<button class="product-gallery-thumb' + activeClass + '" type="button" data-gallery-index="' + idx + '" aria-label="Ver foto ' + (idx + 1) + '"><img src="' + escapeHtml(src) + '" alt="Miniatura ' + (idx + 1) + '" loading="lazy"></button>';
    }).join("");
    productGalleryThumbs.innerHTML = thumbsHtml;
  }

  function openProductGallery(card, startIndex) {
    if (!productGalleryModal || !productGalleryBackdrop || !card) {
      return;
    }
    var name = (card.querySelector("h3") || {}).textContent || "Producto";
    galleryImages = parseCardImageList(card);
    if (!galleryImages.length) {
      return;
    }
    galleryIndex = Math.max(0, Number(startIndex) || 0);
    if (productGalleryTitle) {
      productGalleryTitle.textContent = "Fotos de " + name.trim();
    }
    renderProductGallery();
    attachImageFallbackListeners(productGalleryModal);
    productGalleryModal.classList.add("is-open");
    productGalleryModal.setAttribute("aria-hidden", "false");
    productGalleryBackdrop.hidden = false;
    productGalleryBackdrop.classList.add("is-visible");
  }

  function addToCart(product, qty) {
    if (!product || !product.id) {
      return false;
    }

    var amount = Math.max(1, Number(qty) || 1);
    var existing = cart.find(function (item) { return item.id === product.id; });
    var currentQty = existing ? existing.qty : 0;

    if (Number.isFinite(product.stock) && product.stock >= 0 && currentQty + amount > product.stock) {
      return false;
    }

    if (existing) {
      existing.qty += amount;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        brand: product.brand,
        price: Number(product.price) || 0,
        qty: amount
      });
    }

    saveCart();
    renderCart();
    return true;
  }

  function updateCartQty(id, nextQty) {
    var targetCard = document.querySelector('.product-card[data-product-id="' + id + '"]');
    var product = getProductData(targetCard);
    var maxStock = product ? product.stock : Infinity;

    cart = cart
      .map(function (item) {
        if (item.id !== id) {
          return item;
        }
        var safeQty = Math.max(0, nextQty);
        if (Number.isFinite(maxStock) && maxStock >= 0) {
          safeQty = Math.min(safeQty, maxStock);
        }
        return {
          id: item.id,
          name: item.name,
          brand: item.brand,
          price: item.price,
          qty: safeQty
        };
      })
      .filter(function (item) { return item.qty > 0; });

    saveCart();
    renderCart();
  }

  function clearCart() {
    cart = [];
    saveCart();
    renderCart();
  }

  function buildCartMessage() {
    var lines = [
      "Hola, quiero cotizar / pedir estos productos de Rose Gold Luxury:",
      ""
    ];

    cart.forEach(function (item, index) {
      lines.push(
        (index + 1) + ". " + item.name +
        (item.brand ? " (" + item.brand + ")" : "") +
        " x" + item.qty + " - " + formatCurrency(item.price * item.qty)
      );
    });

    lines.push("");
    lines.push("Total estimado: " + formatCurrency(cartTotal()));
    lines.push("Quedo al pendiente de disponibilidad y pago. Gracias.");

    return lines.join("\n");
  }

  function openCartDrawer() {
    if (!cartDrawer || !cartBackdrop) {
      return;
    }
    cartDrawer.classList.add("is-open");
    cartDrawer.setAttribute("aria-hidden", "false");
    cartBackdrop.hidden = false;
    document.body.classList.add("has-cart-open");
    if (cartTrigger) {
      cartTrigger.setAttribute("aria-expanded", "true");
    }
  }

  function closeCartDrawer() {
    if (!cartDrawer || !cartBackdrop) {
      return;
    }
    cartDrawer.classList.remove("is-open");
    cartDrawer.setAttribute("aria-hidden", "true");
    cartBackdrop.hidden = true;
    document.body.classList.remove("has-cart-open");
    if (cartTrigger) {
      cartTrigger.setAttribute("aria-expanded", "false");
    }
  }

  function createCartItemNode(item) {
    var row = document.createElement("div");
    row.className = "cart-item";
    row.setAttribute("data-cart-id", item.id);

    var title = document.createElement("p");
    title.className = "cart-item-title";
    title.textContent = item.name;

    var meta = document.createElement("p");
    meta.className = "cart-item-meta";
    meta.textContent = (item.brand ? item.brand + " | " : "") + formatCurrency(item.price) + " c/u";

    var summary = document.createElement("strong");
    summary.className = "cart-item-total";
    summary.textContent = formatCurrency(item.price * item.qty);

    var info = document.createElement("div");
    info.className = "cart-item-info";
    info.appendChild(title);
    info.appendChild(meta);
    info.appendChild(summary);

    var controls = document.createElement("div");
    controls.className = "cart-item-controls";

    [
      { action: "decrease", text: "-", className: "qty-btn" },
      { action: "increase", text: "+", className: "qty-btn" }
    ].forEach(function (cfg, index) {
      if (index === 0) {
        var minusBtn = document.createElement("button");
        minusBtn.type = "button";
        minusBtn.className = cfg.className;
        minusBtn.setAttribute("data-action", cfg.action);
        minusBtn.textContent = cfg.text;
        controls.appendChild(minusBtn);

        var qtyValue = document.createElement("span");
        qtyValue.className = "qty-value";
        qtyValue.textContent = String(item.qty);
        controls.appendChild(qtyValue);
      } else {
        var plusBtn = document.createElement("button");
        plusBtn.type = "button";
        plusBtn.className = cfg.className;
        plusBtn.setAttribute("data-action", cfg.action);
        plusBtn.textContent = cfg.text;
        controls.appendChild(plusBtn);
      }
    });

    var removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "cart-remove";
    removeBtn.setAttribute("data-action", "remove");
    removeBtn.textContent = "Quitar";
    controls.appendChild(removeBtn);

    row.appendChild(info);
    row.appendChild(controls);
    return row;
  }

  function renderCart() {
    var itemCount = cartItemsCount();
    var total = cartTotal();

    if (cartCount) {
      cartCount.textContent = String(itemCount);
    }
    if (cartItemsCountNode) {
      cartItemsCountNode.textContent = String(itemCount);
    }
    if (cartTotalNode) {
      cartTotalNode.textContent = formatCurrency(total);
    }
    if (cartTrigger) {
      cartTrigger.classList.toggle("has-items", itemCount > 0);
    }

    if (cartItems) {
      Array.prototype.slice.call(cartItems.querySelectorAll(".cart-item")).forEach(function (node) {
        node.remove();
      });

      if (cartEmpty) {
        cartEmpty.hidden = itemCount !== 0;
      }

      cart.forEach(function (item) {
        cartItems.appendChild(createCartItemNode(item));
      });
    }

    if (cartWhatsappBtn) {
      cartWhatsappBtn.disabled = itemCount === 0;
    }
    if (cartClearBtn) {
      cartClearBtn.disabled = itemCount === 0;
    }
    if (prefillFromCartBtn) {
      prefillFromCartBtn.disabled = itemCount === 0;
    }

    enhanceProductCards();
  }

  function attachImageFallbackListeners(root) {
    (root || document).querySelectorAll(".js-image-fallback").forEach(function (img) {
      if (img.dataset.fallbackBound === "1") {
        return;
      }
      img.dataset.fallbackBound = "1";
      img.addEventListener("error", function () {
        var container = img.closest(".visual-photo, .product-media");
        if (container) {
          container.classList.add("is-missing-image");
        }
        img.setAttribute("aria-hidden", "true");
      });
    });
  }

  function observeRevealNodes(root) {
    var scope = root || document;
    scope.querySelectorAll(".reveal").forEach(function (node) {
      if (revealObserver) {
        revealObserver.observe(node);
      } else {
        node.classList.add("is-visible");
      }
    });
  }

  function bindFilterButtons() {
    refreshFilterButtonsCollection();
    filterButtons.forEach(function (button) {
      if (button.dataset.filterBound === "1") {
        return;
      }
      button.dataset.filterBound = "1";
      button.addEventListener("click", function () {
        activeBrand = button.getAttribute("data-filter") || "all";
        refreshFilterButtonsCollection();
        filterButtons.forEach(function (btn) { btn.classList.remove("is-active"); });
        button.classList.add("is-active");
        applyProductFilters();
      });
    });
  }

  function renderBrandFiltersFromRows(rows) {
    if (!filterRow || !Array.isArray(rows)) {
      return;
    }

    var seen = {};
    var brands = [];

    rows.forEach(function (row) {
      var rawBrand = row && row.brand ? String(row.brand).trim() : "";
      if (!rawBrand) {
        return;
      }
      var key = brandFilterKey(rawBrand);
      if (key === "all" || seen[key]) {
        return;
      }
      seen[key] = true;
      brands.push({ key: key, label: brandFilterLabel(rawBrand) });
    });

    brands.sort(function (a, b) {
      return a.label.localeCompare(b.label, "es", { sensitivity: "base" });
    });

    var html = ['<button class="filter-btn' + (activeBrand === "all" ? ' is-active' : '') + '" type="button" data-filter="all">Todos</button>'];
    brands.forEach(function (brand) {
      var activeClass = activeBrand === brand.key ? " is-active" : "";
      html.push('<button class="filter-btn' + activeClass + '" type="button" data-filter="' + escapeHtml(brand.key) + '">' + escapeHtml(brand.label) + '</button>');
    });

    filterRow.innerHTML = html.join("");
    observeRevealNodes(filterRow);
    bindFilterButtons();
  }

  function buildProductCardMarkup(row) {
    var id = row && row.id ? String(row.id) : slugify((row && row.brand || "") + "-" + (row && row.name || "producto"));
    var brand = row && row.brand ? String(row.brand) : "Marca";
    var category = row && row.category ? String(row.category) : "Producto";
    var name = row && row.name ? String(row.name) : "Producto";
    var description = row && row.description ? String(row.description) : "Consulta disponibilidad por WhatsApp.";
    var imageUrl = sanitizeImageUrl(row && row.image_url ? String(row.image_url) : "", "assets/images/products/base-maybelline.svg");
    var imageList = parseRowImageList(row, imageUrl);
    var primaryImage = imageList[0] || imageUrl;
    var encodedImages = encodeURIComponent(JSON.stringify(imageList));
    var price = parseNumber(row && row.price);
    var stock = Math.max(0, Math.floor(parseNumber(row && row.stock)));
    var minStock = Math.max(0, Math.floor(parseNumber(row && row.min_stock)));
    var rawStatus = normalizeText(row && row.stock_status ? String(row.stock_status) : "");
    var stockStatus = rawStatus;
    if (!stockStatus) {
      if (stock <= 0) {
        stockStatus = "agotado";
      } else if (stock <= minStock && minStock > 0) {
        stockStatus = "alerta";
      } else {
        stockStatus = "disponible";
      }
    }
    var stockText = stock > 0 ? ("Stock: " + stock + " disponible" + (stock === 1 ? "" : "s")) : "Agotado";
    var categoryLabel = category.length > 12 ? category.slice(0, 12) : category;
    var badgeLabel = "Disponible";
    if (stockStatus === "agotado" || stock <= 0) {
      badgeLabel = "Agotado";
    } else if (stockStatus === "alerta" || (minStock > 0 && stock <= minStock)) {
      badgeLabel = "Pocas piezas";
    }

    return [
      '<article class="product-card reveal" data-brand="', escapeHtml(brandFilterKey(brand)), '" data-stock="', escapeHtml(String(stock)), '" data-price="', escapeHtml(String(Math.round(price))), '" data-product-id="', escapeHtml(id), '" data-product-images="', escapeHtml(encodedImages), '">',
      '<div class="product-media">',
      '<img class="media-img js-image-fallback" src="', escapeHtml(primaryImage), '" alt="', escapeHtml(name), '" loading="lazy">',
      '<button class="product-gallery-trigger" type="button" aria-label="Ver mas fotos de ', escapeHtml(name), '">Fotos</button>',
      '<span class="product-media-label">', escapeHtml(categoryLabel), '</span>',
      '<span class="product-stock-badge is-', escapeHtml(stockStatus), '">', escapeHtml(badgeLabel), '</span>',
      '</div>',
      '<div class="product-body">',
      '<span class="product-tag">', escapeHtml(brand), '</span>',
      '<h3>', escapeHtml(name), '</h3>',
      '<p>', escapeHtml(description), '</p>',
      '<p class="product-stock', stock <= 0 ? ' is-out' : '', '">', escapeHtml(stockText), '</p>',
      '<div class="product-footer">',
      '<strong>', escapeHtml(formatCurrency(price)), '</strong>',
      '<a href="', escapeHtml(buildWhatsAppUrl("Hola, me interesa " + name + " de " + brand)), '" target="_blank" rel="noreferrer noopener">Pedir</a>',
      '</div>',
      '</div>',
      '</article>'
    ].join("");
  }

  function enhanceProductCards() {
    refreshProductsCollection();

    products.forEach(function (card) {
      var product = getProductData(card);
      if (!product) {
        return;
      }

      var footer = card.querySelector(".product-footer");
      var orderLink = footer ? footer.querySelector("a") : null;
      if (!footer || !orderLink) {
        return;
      }

      var actions = footer.querySelector(".product-actions");
      if (!actions) {
        actions = document.createElement("div");
        actions.className = "product-actions";
        footer.appendChild(actions);
      }

      if (orderLink.parentNode !== actions) {
        actions.appendChild(orderLink);
      }

      var addButton = actions.querySelector(".add-to-cart-btn");
      if (!addButton) {
        addButton = document.createElement("button");
        addButton.type = "button";
        addButton.className = "add-to-cart-btn";
        actions.appendChild(addButton);
      }

      var stockValue = Number(card.getAttribute("data-stock"));
      var qtyInCart = findCartItemQty(product.id);
      if (Number.isFinite(stockValue) && stockValue <= 0) {
        addButton.disabled = true;
        addButton.textContent = "Agotado";
      } else if (Number.isFinite(stockValue) && qtyInCart >= stockValue) {
        addButton.disabled = true;
        addButton.textContent = "Sin stock";
      } else {
        addButton.disabled = false;
        if (!addButton.classList.contains("is-added")) {
          addButton.textContent = "Agregar";
        }
      }
    });
  }

  function applyProductFilters() {
    refreshProductsCollection();
    var query = normalizeText(searchInput ? searchInput.value : "").trim();
    var visibleCount = 0;

    products.forEach(function (product) {
      var brand = product.getAttribute("data-brand") || "";
      var price = parseCardPrice(product);
      var haystack = normalizeText(product.textContent);
      var brandMatch = activeBrand === "all" || brand === activeBrand;
      var priceMatch = matchesPriceRange(price, activePriceRange);
      var queryMatch = query === "" || haystack.indexOf(query) !== -1;
      var show = brandMatch && priceMatch && queryMatch;

      product.classList.toggle("is-hidden", !show);
      if (show) {
        visibleCount += 1;
      }
    });

    if (resultsNote) {
      resultsNote.textContent = "Mostrando " + visibleCount + " producto" + (visibleCount === 1 ? "" : "s");
    }

    if (emptyState) {
      emptyState.classList.toggle("is-hidden", visibleCount !== 0);
      emptyState.classList.toggle("is-visible", visibleCount === 0);
    }
  }

  function renderCatalogFromSupabase(rows) {
    if (!productsGrid || !Array.isArray(rows)) {
      return;
    }

    renderBrandFiltersFromRows(rows);

    if (!rows.length) {
      productsGrid.innerHTML = "";
      refreshProductsCollection();
      if (resultsNote) {
        resultsNote.textContent = "Mostrando 0 productos";
      }
      if (emptyState) {
        emptyState.classList.remove("is-hidden");
        emptyState.classList.add("is-visible");
        var title = emptyState.querySelector("h3");
        var text = emptyState.querySelector("p");
        if (title) {
          title.textContent = "No hay productos publicados";
        }
        if (text) {
          text.textContent = "Publica productos en Supabase (product_web.is_published = true) para mostrarlos aqui.";
        }
      }
      return;
    }

    productsGrid.innerHTML = rows.map(buildProductCardMarkup).join("");
    attachImageFallbackListeners(productsGrid);
    observeRevealNodes(productsGrid);
    enhanceProductCards();
    applyProductFilters();
  }

  function loadCatalogFromSupabase() {
    if (!productsGrid || !window.fetch) {
      return Promise.resolve();
    }

    if (!SUPABASE_PUBLISHABLE_KEY || SUPABASE_PUBLISHABLE_KEY.indexOf("sb_publishable_") !== 0) {
      return Promise.resolve();
    }

    function fetchCatalogRows() {
      var params = new URLSearchParams({
        select: "id,sku,name,brand,category,description,price,stock,min_stock,stock_status,image_url"
      });

      return fetch(SUPABASE_URL + "/rest/v1/" + SUPABASE_CATALOG_VIEW + "?" + params.toString(), {
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: "Bearer " + SUPABASE_PUBLISHABLE_KEY
        }
      }).then(function (response) {
        if (!response.ok) {
          return response.text().then(function (body) {
            throw new Error("Supabase catalog request failed: " + response.status + " " + body);
          });
        }
        return response.json();
      });
    }

    return fetchCatalogRows()
      .then(function (rows) {
        if (Array.isArray(rows)) {
          renderCatalogFromSupabase(rows);
        }
      })
      .catch(function (error) {
        console.warn("[catalog] using static fallback", error);
      });
  }

  bindFilterButtons();

  if (searchInput) {
    searchInput.addEventListener("input", applyProductFilters);
  }

  if (priceFilter) {
    priceFilter.addEventListener("change", function () {
      activePriceRange = priceFilter.value || "all";
      applyProductFilters();
    });
  }

  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener("click", function () {
      activeBrand = "all";
      activePriceRange = "all";
      if (searchInput) {
        searchInput.value = "";
      }
      if (priceFilter) {
        priceFilter.value = "all";
      }
      filterButtons.forEach(function (btn) {
        btn.classList.toggle("is-active", btn.getAttribute("data-filter") === "all");
      });
      applyProductFilters();
    });
  }

  if (productsGrid) {
    productsGrid.addEventListener("click", function (event) {
      var target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      var galleryThumb = target.closest(".product-media .media-img");
      var galleryTrigger = target.closest(".product-gallery-trigger");
      if (galleryThumb || galleryTrigger) {
        var galleryCard = target.closest(".product-card");
        openProductGallery(galleryCard, 0);
        return;
      }

      var addButton = target.closest(".add-to-cart-btn");
      if (!addButton) {
        return;
      }

      var card = addButton.closest(".product-card");
      var product = getProductData(card);
      var added = addToCart(product, 1);
      if (!added) {
        addButton.disabled = true;
        addButton.textContent = "Sin stock";
        return;
      }

      addButton.classList.add("is-added");
      addButton.textContent = "Agregado";
      window.setTimeout(function () {
        addButton.classList.remove("is-added");
        enhanceProductCards();
      }, 900);

      openCartDrawer();
    });
  }

  if (cartTrigger) {
    cartTrigger.addEventListener("click", function () {
      if (cartDrawer && cartDrawer.classList.contains("is-open")) {
        closeCartDrawer();
      } else {
        openCartDrawer();
      }
    });
  }

  if (cartClose) {
    cartClose.addEventListener("click", closeCartDrawer);
  }

  if (cartBackdrop) {
    cartBackdrop.addEventListener("click", closeCartDrawer);
  }

  if (productGalleryClose) {
    productGalleryClose.addEventListener("click", closeProductGallery);
  }

  if (productGalleryBackdrop) {
    productGalleryBackdrop.addEventListener("click", closeProductGallery);
  }

  if (productGalleryThumbs) {
    productGalleryThumbs.addEventListener("click", function (event) {
      var target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      var button = target.closest("button[data-gallery-index]");
      if (!button) {
        return;
      }
      galleryIndex = Number(button.getAttribute("data-gallery-index")) || 0;
      renderProductGallery();
    });
  }

  if (productGalleryPrev) {
    productGalleryPrev.addEventListener("click", function () {
      galleryIndex -= 1;
      renderProductGallery();
    });
  }

  if (productGalleryNext) {
    productGalleryNext.addEventListener("click", function () {
      galleryIndex += 1;
      renderProductGallery();
    });
  }

  if (productGalleryMainWrap) {
    productGalleryMainWrap.addEventListener("touchstart", function (event) {
      var touch = event.touches && event.touches[0];
      if (!touch) {
        return;
      }
      galleryTouchStartX = touch.clientX;
      galleryTouchStartY = touch.clientY;
    }, { passive: true });

    productGalleryMainWrap.addEventListener("touchend", function (event) {
      var touch = event.changedTouches && event.changedTouches[0];
      if (!touch) {
        return;
      }
      var deltaX = touch.clientX - galleryTouchStartX;
      var deltaY = touch.clientY - galleryTouchStartY;
      var absX = Math.abs(deltaX);
      var absY = Math.abs(deltaY);

      if (absX < 40 || absX < absY) {
        return;
      }

      if (deltaX < 0) {
        galleryIndex += 1;
      } else {
        galleryIndex -= 1;
      }
      renderProductGallery();
    }, { passive: true });
  }

  document.addEventListener("keydown", function (event) {
    if (!productGalleryModal || !productGalleryModal.classList.contains("is-open")) {
      return;
    }
    if (event.key === "Escape") {
      closeProductGallery();
      return;
    }
    if (event.key === "ArrowLeft") {
      galleryIndex -= 1;
      renderProductGallery();
      return;
    }
    if (event.key === "ArrowRight") {
      galleryIndex += 1;
      renderProductGallery();
    }
  });

  if (cartItems) {
    cartItems.addEventListener("click", function (event) {
      var target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      var actionButton = target.closest("button[data-action]");
      if (!actionButton) {
        return;
      }

      var row = actionButton.closest(".cart-item");
      var id = row ? row.getAttribute("data-cart-id") : "";
      if (!id) {
        return;
      }

      var item = cart.find(function (entry) { return entry.id === id; });
      if (!item) {
        return;
      }

      var action = actionButton.getAttribute("data-action");
      if (action === "increase") {
        updateCartQty(id, item.qty + 1);
      } else if (action === "decrease") {
        updateCartQty(id, item.qty - 1);
      } else if (action === "remove") {
        updateCartQty(id, 0);
      }
    });
  }

  if (cartClearBtn) {
    cartClearBtn.addEventListener("click", clearCart);
  }

  if (cartWhatsappBtn) {
    cartWhatsappBtn.addEventListener("click", function () {
      if (!cart.length) {
        return;
      }
      openWhatsApp(buildCartMessage());
    });
  }

  if (prefillFromCartBtn) {
    prefillFromCartBtn.addEventListener("click", function () {
      if (!cart.length) {
        return;
      }

      var productsField = document.getElementById("orderProducts");
      var notesField = document.getElementById("orderNotes");
      var list = cart.map(function (item) { return item.name + " x" + item.qty; }).join(" + ");

      if (productsField) {
        productsField.value = list;
      }
      if (notesField) {
        var cartNote = "Carrito estimado: " + formatCurrency(cartTotal());
        if (!notesField.value) {
          notesField.value = cartNote;
        } else if (notesField.value.indexOf(cartNote) === -1) {
          notesField.value += "\n" + cartNote;
        }
      }

      var orderSection = document.getElementById("pedido");
      if (orderSection) {
        orderSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  if (orderForm) {
    orderForm.addEventListener("submit", function (event) {
      event.preventDefault();

      var name = (document.getElementById("orderName") || {}).value || "";
      var phone = (document.getElementById("orderPhone") || {}).value || "";
      var productsText = (document.getElementById("orderProducts") || {}).value || "";
      var shade = (document.getElementById("orderShade") || {}).value || "";
      var delivery = (document.getElementById("orderDelivery") || {}).value || "Por definir";
      var notes = (document.getElementById("orderNotes") || {}).value || "";

      var lines = [
        "Hola, quiero hacer un pedido en Rose Gold Luxury:",
        "",
        "Nombre: " + name.trim(),
        "Telefono: " + phone.trim(),
        "Producto(s): " + productsText.trim(),
        "Entrega: " + delivery
      ];

      if (shade.trim()) {
        lines.push("Tono / detalle: " + shade.trim());
      }
      if (notes.trim()) {
        lines.push("Notas: " + notes.trim());
      }
      if (cart.length) {
        lines.push("");
        lines.push("Carrito actual:");
        cart.forEach(function (item, index) {
          lines.push((index + 1) + ". " + item.name + " x" + item.qty);
        });
        lines.push("Total estimado: " + formatCurrency(cartTotal()));
      }

      openWhatsApp(lines.join("\n"));
    });
  }

  attachImageFallbackListeners(document);

  if ("IntersectionObserver" in window) {
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
  }

  observeRevealNodes(document);

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeCartDrawer();
    }
  });

  enhanceProductCards();
  applyProductFilters();
  renderCart();
  loadCatalogFromSupabase();
})();
