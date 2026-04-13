export type CartItem = {
  id: string;
  title: string;
  slug?: string;
  type: "course" | "video" | "booking";
  price: number;
  creatorId?: string;
  image?: string | null;
};

const STORAGE_KEY = "coursevia-cart";

export const getCartItems = (): CartItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveCartItems = (items: CartItem[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  // Dispatch custom event for same-tab updates
  window.dispatchEvent(new Event("cartUpdated"));
};

export const addCartItem = (item: CartItem) => {
  const items = getCartItems();
  const exists = items.some((entry) => entry.id === item.id && entry.type === item.type);
  if (exists) return items;

  const next = [...items, item];
  saveCartItems(next);
  return next;
};

export const removeCartItem = (id: string, type: CartItem["type"]) => {
  const next = getCartItems().filter((entry) => !(entry.id === id && entry.type === type));
  saveCartItems(next);
  return next;
};

export const clearCart = () => {
  saveCartItems([]);
};
