import { CATEGORIES } from "./categories.js";
import { receiptTotal, yen } from "./validation.js";

export default function ReceiptList({ receipts, onUpdate, onDelete }) {
  if (receipts.length === 0) {
    return <p className="muted">まだレシートが登録されていません。</p>;
  }

  const sorted = [...receipts].sort((a, b) => b.date.localeCompare(a.date));

  return sorted.map((r) => {
    // 自動分類が間違っていたときのために、カテゴリは一覧から変更できるようにする
    const changeCategory = (index, category) =>
      onUpdate(r.id, { items: r.items.map((it, i) => (i === index ? { ...it, category } : it)) });

    return (
      <div key={r.id} className="receipt">
        <div className="receipt-head">
          <input type="date" value={r.date} onChange={(e) => e.target.value && onUpdate(r.id, { date: e.target.value })} />
          <strong>{r.store}</strong>
          <span className="total">{yen(receiptTotal(r))}</span>
          <button onClick={() => onDelete(r.id)} aria-label="削除">
            削除
          </button>
        </div>
        <table>
          <tbody>
            {r.items.map((it, i) => (
              <tr key={i}>
                <td>{it.name}</td>
                <td>
                  <select value={it.category} onChange={(e) => changeCategory(i, e.target.value)}>
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </td>
                <td className={it.price < 0 ? "num negative" : "num"} title={it.price < 0 ? "マイナスの金額です。値引き以外なら読み取りミスの可能性があります" : undefined}>
                  {yen(it.price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  });
}
