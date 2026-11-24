const DEFAULT_WISHLIST_KEY = "mati_wishlist_v1";

export class WishlistManager {
  constructor(catalog = [], { storageKey = DEFAULT_WISHLIST_KEY, onChange } = {}) {
    this.storageKey = storageKey;
    this.validIds = new Set(catalog.map((item) => String(item.id)));
    this.ids = new Set(this.#load());
    this.onChange = onChange;
    this.#notify();
  }

  #load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((id) => String(id))
        .filter((id) => this.validIds.has(id));
    } catch {
      return [];
    }
  }

  #save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify([...this.ids]));
    } catch {
      // Ignore storage quota or restricted-context errors
    }
  }

  #notify() {
    if (typeof this.onChange === "function") {
      this.onChange(this.count);
    }
  }

  get count() {
    return this.ids.size;
  }

  has(id) {
    return this.ids.has(String(id));
  }

  toggle(id) {
    const key = String(id);
    if (!this.validIds.has(key)) return false;

    const nowWished = !this.ids.has(key);
    if (nowWished) {
      this.ids.add(key);
    } else {
      this.ids.delete(key);
    }

    this.#save();
    this.#notify();
    return nowWished;
  }

  filterProducts(catalog) {
    return catalog.filter((item) => this.ids.has(String(item.id)));
  }

  clear() {
    if (this.ids.size === 0) return;
    this.ids.clear();
    this.#save();
    this.#notify();
  }
}
