import { products } from "./data/products.js";
import { WishlistManager } from "./utils/wishlistManager.js";
import { CartManager } from "./utils/cartManager.js";

const WISHLIST_KEY = "mati_wishlist_v1";
const CART_KEY = "mati_cart_v1";

const rupees = (n) => "₹" + Number(n).toLocaleString("en-IN");

let activeCategory = "All";
let showingWishlist = false;

const wishlist = new WishlistManager(products, {
  storageKey: WISHLIST_KEY,
  onChange: (count) => {
    const badge = document.getElementById("wishCount");
    if (badge) badge.textContent = String(count);
  },
});

const cart = new CartManager(products, {
  storageKey: CART_KEY,
  onChange: ({ count }) => {
    const countBadge = document.getElementById("cartCount");
    if (countBadge) countBadge.textContent = String(count);
  },
});

function findProduct(id) {
  return products.find((item) => String(item.id) === String(id));
}

function getFilteredProducts() {
  const searchEl = document.getElementById("search");
  const query = (searchEl ? searchEl.value : "").trim().toLowerCase();

  let list = showingWishlist ? wishlist.filterProducts(products) : products;

  if (!showingWishlist && activeCategory !== "All") {
    list = list.filter((p) => p.category === activeCategory);
  }

  if (query) {
    list = list.filter((p) =>
      `${p.name} ${p.maker} ${p.region} ${p.category}`.toLowerCase().includes(query)
    );
  }

  return list;
}

function renderProducts() {
  const list = getFilteredProducts();
  const countEl = document.getElementById("resultCount");
  const gridEl = document.getElementById("products");
  if (!gridEl) return;

  if (countEl) {
    const unit = showingWishlist ? "saved pieces" : "pieces";
    countEl.textContent = `${list.length} ${unit}`;
  }

  const emptyHtml = showingWishlist
    ? '<p class="sub">Your wishlist is empty. Tap the heart on a piece to save it.</p>'
    : '<p class="sub">No products match that search yet.</p>';

  gridEl.innerHTML =
    list
      .map((p) => {
        const wished = wishlist.has(p.id);
        return `
          <article class="product" data-id="${p.id}">
            <div class="product-photo">
              <img src="${p.img}" alt="${p.name}" loading="lazy" data-action="open">
              <span class="pill">${p.tag}</span>
              <button
                type="button"
                class="heart ${wished ? "active" : ""}"
                data-action="wish"
                aria-pressed="${wished}"
                aria-label="${wished ? "Remove from wishlist" : "Save to wishlist"}: ${p.name}"
                title="${wished ? "Saved to wishlist" : "Save to wishlist"}"
              >${wished ? "♥" : "♡"}</button>
            </div>
            <div class="product-info">
              <span class="maker">${p.maker}</span>
              <h3 data-action="open">${p.name}</h3>
              <div class="product-bottom">
                <span class="price">${rupees(p.price)}</span>
                <button type="button" class="add" data-action="add">Add +</button>
              </div>
            </div>
          </article>
        `;
      })
      .join("") || emptyHtml;
}

function showWishlist() {
  showingWishlist = true;
  activeCategory = "All";
  document.querySelectorAll("#categoryFilters .filter").forEach((btn) => {
    btn.classList.remove("active");
  });
  const searchEl = document.getElementById("search");
  if (searchEl) searchEl.value = "";
  renderProducts();
  document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
}

function setCategory(category, activeBtn = null) {
  showingWishlist = false;
  activeCategory = category;

  const filterButtons = [...document.querySelectorAll("#categoryFilters .filter")];
  filterButtons.forEach((btn) => btn.classList.remove("active"));

  const targetBtn =
    activeBtn || filterButtons.find((btn) => btn.dataset.category === category);
  targetBtn?.classList.add("active");

  renderProducts();
}

function renderCart() {
  const lines = cart.getLines();
  const { count, subtotal } = cart.getSummary();

  const countBadge = document.getElementById("cartCount");
  if (countBadge) countBadge.textContent = String(count);

  const itemsEl = document.getElementById("cartItems");
  const totalEl = document.getElementById("cartTotal");
  if (!itemsEl || !totalEl) return;

  if (!lines.length) {
    itemsEl.innerHTML =
      '<div class="empty">Your bag is waiting for something meaningful.<br><br>Explore the MATI collection.</div>';
    totalEl.innerHTML = "";
    return;
  }

  itemsEl.innerHTML = lines
    .map(
      ({ product, qty, lineTotal }) => `
        <div class="cart-item" data-id="${product.id}">
          <img src="${product.img}" alt="${product.name}">
          <div>
            <h4>${product.name}</h4>
            <small>${rupees(product.price)}</small>
            <div class="qty">
              <button type="button" data-action="dec" aria-label="Decrease quantity">−</button>
              <span>${qty}</span>
              <button type="button" data-action="inc" aria-label="Increase quantity">+</button>
            </div>
          </div>
          <strong>${rupees(lineTotal)}</strong>
        </div>
      `
    )
    .join("");

  totalEl.innerHTML = `
    <div class="totalrow"><span>Subtotal</span><span>${rupees(subtotal)}</span></div>
    <small class="sub">Shipping calculated at checkout.</small>
    <button type="button" class="btn checkout" id="openCheckoutBtn">Continue to checkout ↗</button>
  `;

  document.getElementById("openCheckoutBtn")?.addEventListener("click", openCheckout);
}

function addToCart(id) {
  if (!cart.add(id, 1)) return;
  renderCart();
  openCart();
}

function openCart() {
  renderCart();
  document.getElementById("overlay")?.classList.add("show");
  document.getElementById("drawer")?.classList.add("show");
}

function closeCart() {
  document.getElementById("overlay")?.classList.remove("show");
  document.getElementById("drawer")?.classList.remove("show");
}

function openProduct(id) {
  const p = findProduct(id);
  const modal = document.getElementById("productModal");
  const content = document.getElementById("modalContent");
  if (!p || !modal || !content) return;

  content.innerHTML = `
    <button type="button" class="close" id="closeProductBtn" style="float:right" aria-label="Close product details">×</button>
    <div class="modal-grid">
      <img src="${p.img}" alt="${p.name}">
      <div>
        <span class="eyebrow">${p.category} · ${p.region}</span>
        <h2>${p.name}</h2>
        <div class="price">${rupees(p.price)}</div>
        <p>${p.desc}</p>
        <p><b>Maker:</b> ${p.maker}<br><b>Craft origin:</b> To be verified with maker<br><b>Care:</b> See final artisan listing</p>
        <button type="button" class="btn" id="modalAddBtn">Add to bag</button>
      </div>
    </div>
  `;

  document.getElementById("closeProductBtn")?.addEventListener("click", closeProduct);
  document.getElementById("modalAddBtn")?.addEventListener("click", () => {
    addToCart(p.id);
    closeProduct();
  });

  modal.classList.add("show");
}

function closeProduct() {
  document.getElementById("productModal")?.classList.remove("show");
}

function openCheckout() {
  closeCart();
  document.getElementById("checkoutModal")?.classList.add("show");
}

function closeCheckout() {
  document.getElementById("checkoutModal")?.classList.remove("show");
}

function bindEvents() {
  document.getElementById("search")?.addEventListener("input", renderProducts);
  document.getElementById("wishlistBtn")?.addEventListener("click", showWishlist);
  document.getElementById("cartBtn")?.addEventListener("click", openCart);
  document.getElementById("closeCartBtn")?.addEventListener("click", closeCart);
  document.getElementById("overlay")?.addEventListener("click", closeCart);
  document.getElementById("closeCheckoutBtn")?.addEventListener("click", closeCheckout);

  document.getElementById("productModal")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeProduct();
  });

  document.getElementById("checkoutModal")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeCheckout();
  });

  document.getElementById("checkoutForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    cart.clear();
    renderCart();
    closeCheckout();
    e.currentTarget.reset();
  });

  document.getElementById("mobileMenuBtn")?.addEventListener("click", () => {
    document.getElementById("categories")?.scrollIntoView({ behavior: "smooth" });
  });

  document.getElementById("searchBtn")?.addEventListener("click", () => {
    document.getElementById("search")?.focus();
  });

  document.querySelectorAll("#categoryFilters .filter, .category[data-category], .textlink[data-category]").forEach((el) => {
    el.addEventListener("click", (e) => {
      const cat = el.dataset.category;
      if (!cat) return;
      if (el.classList.contains("category") || el.classList.contains("textlink")) {
        e.preventDefault();
        document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
      }
      setCategory(cat, el.classList.contains("filter") ? el : null);
    });
  });

  document.getElementById("products")?.addEventListener("click", (e) => {
    const actionEl = e.target.closest("[data-action]");
    const card = e.target.closest(".product[data-id]");
    if (!actionEl || !card) return;

    const id = card.dataset.id;
    const action = actionEl.dataset.action;

    if (action === "wish") {
      const nowWished = wishlist.toggle(id);
      if (showingWishlist) {
        renderProducts();
      } else if (actionEl instanceof HTMLElement) {
        actionEl.textContent = nowWished ? "♥" : "♡";
        actionEl.classList.toggle("active", nowWished);
        actionEl.setAttribute("aria-pressed", String(nowWished));
      }
    } else if (action === "add") {
      addToCart(id);
    } else if (action === "open") {
      openProduct(id);
    }
  });

  document.getElementById("cartItems")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    const row = e.target.closest(".cart-item[data-id]");
    if (!btn || !row) return;

    const id = row.dataset.id;
    if (btn.dataset.action === "inc") cart.changeQty(id, 1);
    if (btn.dataset.action === "dec") cart.changeQty(id, -1);
    renderCart();
  });
}

bindEvents();
renderProducts();
renderCart();
