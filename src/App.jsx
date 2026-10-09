import { useEffect, useMemo, useState } from "react";
import { loadReceipts, saveReceipts } from "./storage.js";
import { resizeImage } from "./resizeImage.js";
import { findDuplicate, negativePriceWarning, receiptTotal, yen } from "./validation.js";
import ReceiptList from "./ReceiptList.jsx";
import Charts from "./Charts.jsx";

const today = () => new Date().toLocaleDateString("sv-SE"); // sv-SE は YYYY-MM-DD 形式になる

export default function App() {
  const [receipts, setReceipts] = useState(loadReceipts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [month, setMonth] = useState("all");

  useEffect(() => saveReceipts(receipts), [receipts]);

  const months = useMemo(
    () => [...new Set(receipts.map((r) => r.date.slice(0, 7)))].sort().reverse(),
    [receipts],
  );

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 同じファイルを続けて選んでも change が発火するようにする
    if (!file) return;

    setLoading(true);
    setError("");
    setWarning("");
    try {
      const form = new FormData();
      form.append("image", await resizeImage(file), "receipt.jpg");
      const res = await fetch("/api/receipts/parse", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `読み取りに失敗しました (${res.status})`);
      if (data.items.length === 0) throw new Error("商品を読み取れませんでした。別の写真でお試しください。");

      const receipt = {
        id: crypto.randomUUID(),
        store: data.store || "(店名不明)",
        // 日付が読めなかった場合は今日の日付で登録し、一覧で修正できるようにする
        date: /^\d{4}-\d{2}-\d{2}$/.test(data.date) ? data.date : today(),
        items: data.items,
      };

      const dup = findDuplicate(receipts, receipt);
      if (
        dup &&
        !confirm(
          `${dup.date} に合計 ${yen(receiptTotal(dup))} のレシート(${dup.store})が既に登録されています。\n重複の可能性がありますが、登録しますか?`,
        )
      ) {
        setWarning("重複の可能性があるため、登録を取り消しました。");
        return;
      }

      setReceipts((prev) => [receipt, ...prev]);
      setWarning(negativePriceWarning(receipt) ?? "");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function updateReceipt(id, patch) {
    setReceipts((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function deleteReceipt(id) {
    if (confirm("このレシートを削除しますか?")) {
      setReceipts((prev) => prev.filter((r) => r.id !== id));
    }
  }

  // 選択中の月のレシートがすべて削除された場合は全期間に戻す
  const activeMonth = months.includes(month) ? month : "all";
  const filtered = activeMonth === "all" ? receipts : receipts.filter((r) => r.date.startsWith(activeMonth));

  return (
    <main>
      <h1>レシート家計簿</h1>

      <section className="card">
        <label className={`upload ${loading ? "disabled" : ""}`}>
          <input type="file" accept="image/*" onChange={handleUpload} disabled={loading} />
          {loading ? "読み取り中…" : "レシート画像をアップロード"}
        </label>
        {error && <p className="error">{error}</p>}
        {warning && <p className="warning">{warning}</p>}
      </section>

      <section className="card">
        <div className="toolbar">
          <h2>集計</h2>
          <select value={activeMonth}onChange={(e) => setMonth(e.target.value)}>
            <option value="all">全期間</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {m.replace("-", "年")}月
              </option>
            ))}
          </select>
        </div>
        <Charts receipts={receipts} filtered={filtered} />
      </section>

      <section className="card">
        <h2>明細</h2>
        <ReceiptList receipts={filtered} onUpdate={updateReceipt} onDelete={deleteReceipt} />
      </section>
    </main>
  );
}
