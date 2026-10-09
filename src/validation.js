export const yen = (n) => `¥${n.toLocaleString()}`;

export function receiptTotal(receipt) {
  return receipt.items.reduce((sum, it) => sum + it.price, 0);
}

// 値引き行は正しくても負になるため、エラーではなく確認を促す警告にとどめる
export function negativePriceWarning(receipt) {
  const negatives = receipt.items.filter((it) => it.price < 0);
  if (negatives.length === 0) return null;
  const list = negatives.map((it) => `${it.name}(${yen(it.price)})`).join("、");
  return `金額がマイナスの商品があります: ${list}。値引き以外の場合は読み取りミスの可能性があるため確認してください。`;
}

// 保存データには時刻がないため、「同じ日付かつ同じ合計金額」を重複とみなす
export function findDuplicate(receipts, candidate) {
  const total = receiptTotal(candidate);
  return receipts.find((r) => r.id !== candidate.id && r.date === candidate.date && receiptTotal(r) === total);
}
