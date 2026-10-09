import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from "chart.js";
import { Bar, Pie } from "react-chartjs-2";
import { CATEGORIES, CATEGORY_COLORS } from "./categories.js";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const yen = (n) => `¥${n.toLocaleString()}`;

function sumByCategory(receipts) {
  const totals = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
  for (const r of receipts) for (const it of r.items) totals[it.category] += it.price;
  return totals;
}

// receipts: 全データ(月別グラフ用) / filtered: 選択中の期間のデータ(円グラフ・表用)
export default function Charts({ receipts, filtered }) {
  if (receipts.length === 0) {
    return <p className="muted">レシートを登録すると集計が表示されます。</p>;
  }

  const totals = sumByCategory(filtered);
  // 値引きで合計がマイナスになったカテゴリは円グラフに描けないので除外する
  const pieCategories = CATEGORIES.filter((c) => totals[c] > 0);
  const grandTotal = CATEGORIES.reduce((s, c) => s + totals[c], 0);

  const months = [...new Set(receipts.map((r) => r.date.slice(0, 7)))].sort();
  const monthly = Object.fromEntries(months.map((m) => [m, sumByCategory(receipts.filter((r) => r.date.startsWith(m)))]));

  return (
    <>
      <div className="charts">
        <div className="chart">
          <h3>カテゴリ別</h3>
          <Pie
            data={{
              labels: pieCategories,
              datasets: [
                {
                  data: pieCategories.map((c) => totals[c]),
                  backgroundColor: pieCategories.map((c) => CATEGORY_COLORS[c]),
                },
              ],
            }}
            options={{ plugins: { tooltip: { callbacks: { label: (ctx) => ` ${yen(ctx.parsed)}` } } } }}
          />
        </div>
        <div className="chart">
          <h3>月別(全期間)</h3>
          <Bar
            data={{
              labels: months,
              datasets: CATEGORIES.map((c) => ({
                label: c,
                data: months.map((m) => monthly[m][c]),
                backgroundColor: CATEGORY_COLORS[c],
              })),
            }}
            options={{
              scales: { x: { stacked: true }, y: { stacked: true, ticks: { callback: (v) => yen(v) } } },
              plugins: { tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${yen(ctx.parsed.y)}` } } },
            }}
          />
        </div>
      </div>

      <table className="summary">
        <tbody>
          {CATEGORIES.filter((c) => totals[c] !== 0).map((c) => (
            <tr key={c}>
              <td>
                <span className="swatch" style={{ background: CATEGORY_COLORS[c] }} />
                {c}
              </td>
              <td className="num">{yen(totals[c])}</td>
            </tr>
          ))}
          <tr className="grand">
            <td>合計</td>
            <td className="num">{yen(grandTotal)}</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}
