const STORAGE_KEY = "kakeibo.receipts.v1";

// 保存形式: [{ id, store, date: "YYYY-MM-DD", items: [{ name, price, category }] }]
export function loadReceipts() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveReceipts(receipts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(receipts));
}
