import express from "express";
import multer from "multer";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const PORT = Number(process.env.PORT) || 3001;
const MODEL = "claude-haiku-5-5";

// フロントエンドと共通のカテゴリ一覧。変更する場合は src/categories.js も合わせて直す
const CATEGORIES = ["食費", "外食", "日用品", "交通費", "衣服", "医療", "娯楽", "その他"];

// Claude API が受け付ける画像形式のみ許可する
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const ReceiptSchema = z.object({
  store: z.string().describe("店名。読み取れない場合は空文字"),
  date: z.string().describe("購入日 (YYYY-MM-DD)。読み取れない場合は空文字"),
  items: z.array(
    z.object({
      name: z.string().describe("商品名"),
      price: z.number().describe("税込金額(円)。値引きは負の数"),
      // z.enum は SDK のスキーマ変換で制約ではなく説明文になるため、文字列で受けて後で正規化する
      category: z.string().describe(`次のいずれか: ${CATEGORIES.join("、")}`),
    }),
  ),
});

const SYSTEM_PROMPT = `あなたは日本のレシートを読み取る家計簿アシスタントです。
画像から店名・購入日・商品ごとの名前と金額を抽出し、各商品を次のカテゴリのいずれかに分類してください: ${CATEGORIES.join("、")}。
- 金額は税込の整数(円)で返す。外税表記のレシートは消費税を各商品に按分せず、「消費税」という1行の商品として「その他」に入れる
- 値引き・クーポンは負の金額の行として、値引き対象の商品と同じカテゴリに入れる
- 小計・合計・お預かり・お釣り・ポイントの行は商品に含めない
- 飲食店・カフェ・ファストフードのレシートは「外食」に分類する
- 年が省略されている、和暦で書かれているなどの場合も西暦の YYYY-MM-DD に直す`;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, ALLOWED_TYPES.includes(file.mimetype)),
});

// APIキーは環境変数 (ANTHROPIC_API_KEY) から SDK が自動で読み込む
const client = new Anthropic();

const app = express();

app.post("/api/receipts/parse", upload.single("image"), async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "サーバーに ANTHROPIC_API_KEY が設定されていません。.env を確認してください。" });
  }
  if (!req.file) {
    return res.status(400).json({ error: "JPEG・PNG・GIF・WebP 形式の画像(5MB以下)を選択してください。" });
  }

  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: req.file.mimetype, data: req.file.buffer.toString("base64") },
            },
            { type: "text", text: "このレシートを読み取ってください。" },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(ReceiptSchema) },
    });

    if (response.stop_reason === "refusal") {
      return res.status(422).json({ error: "この画像は読み取りを拒否されました。" });
    }
    if (!response.parsed_output) {
      return res.status(502).json({ error: "レシートの読み取り結果を解析できませんでした。" });
    }
    const { store, date, items } = response.parsed_output;
    res.json({
      store,
      date,
      items: items.map((it) => ({
        name: it.name,
        price: Math.round(it.price),
        category: CATEGORIES.includes(it.category) ? it.category : "その他",
      })),
    });
  } catch (err) {
    // SDKの型付き例外で、設定ミス・一時的な失敗・通信エラーを区別して返す
    if (err instanceof Anthropic.AuthenticationError) {
      console.error("APIキーが無効です:", err.message);
      return res.status(500).json({ error: "サーバーのAPIキー設定を確認してください。" });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: "混み合っています。しばらくしてから再度お試しください。" });
    }
    if (err instanceof Anthropic.APIError) {
      console.error(`Claude APIエラー (${err.status}):`, err.message);
      return res.status(502).json({ error: "Claude APIの呼び出しに失敗しました。" });
    }
    console.error(err);
    res.status(500).json({ error: "サーバーでエラーが発生しました。" });
  }
});

// 本番ビルド (npm run build) 後は dist/ をこのサーバーから配信する
app.use(express.static("dist"));

// ファイルサイズ超過などのアップロードエラーをJSONで返す
app.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: "画像サイズは5MB以下にしてください。" });
  }
  next(err);
});

// 家計データとAPIキーを扱うため、同じPCからのアクセスに限定する
app.listen(PORT, "127.0.0.1", () => {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("警告: ANTHROPIC_API_KEY が設定されていません。.env を確認してください。");
  }
  console.log(`APIサーバー起動: http://127.0.0.1:${PORT}`);
});
