const DEFAULT_CART_KEY = "mati_cart_v1";

export class CartManager {
  constructor(catalog = [], { storageKey = DEFAULT_CART_KEY, onChange } = {}) {
    this.storageKey = storageKey;
    this.catalogById = new Map(
      catalog.map((item) => [String(item.id), item])
    );
    this.items = new Map(this.#load());
    this.onChange = onChange;
    this.#notify();
  }

  #load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return [];

      const entries = Array.isArray(parsed)
        ? parsed
        : Object.entries(parsed);

      return entries
        .map(([id, qty]) => [String(id), Math.floor(Number(qty))])
        .filter(([id, qty]) => this.catalogById.has(id) && Number.isFinite(qty) && qty > 0);
    } catch {
      return [];
    }
  }

  #save() {
    try {
      const obj = Object.fromEntries(this.items);
      localStorage.setItem(this.storageKey, JSON.stringify(obj));
    } catch {
      // Ignore storage quota or restricted-context errors
    }
  }

  #notify() {
    if (typeof this.onChange === "function") {
      this.onChange(this.getSummary());
    }
  }

  add(id, amount = 1) {
    const key = String(id);
    const delta = Math.floor(Number(amount));
    if (!this.catalogById.has(key) || !Number.isFinite(delta) || delta <= 0) {
      return false;
    }

    const nextQty = (this.items.get(key) || 0) + delta;
    this.items.set(key, nextQty);
    this.#save();
    this.#notify();
    return true;
  }

  changeQty(id, delta) {
    const key = String(id);
    const step = Math.floor(Number(delta));
    if (!this.items.has(key) || !Number.isFinite(step)) return false;

    const nextQty = this.items.get(key) + step;
    if (nextQty <= 0) {
      this.items.delete(key);
    } else {
      this.items.set(key, nextQty);
    }

    this.#save();
    this.#notify();
    return true;
  }

  remove(id) {
    const key = String(id);
    if (!this.items.delete(key)) return false;
    this.#save();
    this.#notify();
    return true;
  }

  clear() {
    if (this.items.size === 0) return;
    this.items.clear();
    this.#save();
    this.#notify();
  }

  getLines() {
    const lines = [];
    for (const [id, qty] of this.items.entries()) {
      const product = this.catalogById.get(id);
      if (!product) continue;
      const price = Number(product.price) || 0;
      lines.push({
        product,
        qty,
        lineTotal: price * qty,
      });
    }
    return lines;
  }

  getSummary() {
    let count = 0;
    let subtotal = 0;
    for (const line of this.getLines()) {
      count += line.qty;
      subtotal += line.lineTotal;
    }
    return { count, subtotal };
  }
}
