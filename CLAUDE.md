# kakeibo-app

レシート画像を Claude API で読み取る家計簿Webアプリ。個人がローカルPCで使う前提。

## 技術スタック

- フロントエンド: React + Vite(`src/`)、グラフは Chart.js(react-chartjs-2)
- バックエンド: Node.js + Express(`server/index.js`)。Claude API はここからのみ呼ぶ
- モデル: `claude-haiku-5-5`
- データ保存: ブラウザの localStorage(キー `kakeibo.receipts.v1`)
- カテゴリ一覧は `server/index.js` と `src/categories.js` の2か所にあり、変更時は両方そろえる

## コマンド

- `npm run dev`: APIサーバー(127.0.0.1:3001)と Vite 開発サーバーを同時起動
- `npm run build`: フロントエンドをビルド(変更後の確認に使う)
- `npm start`: ビルド済みの `dist/` を Express から配信
- APIキーは `.env` の `ANTHROPIC_API_KEY` に書く(`.env.example` を参照)

## Git運用ルール

- コードを変更したら、そのたびにコミットして GitHub(`origin`)へプッシュする。このプロジェクトに限り、グローバルルールの「コミットは明示的に依頼された場合のみ」より本ルールを優先する。
- 1つの作業単位(機能追加・修正など)ごとに1コミットにまとめる。途中の壊れた状態はプッシュしない。
- プッシュ前に、可能な範囲でテスト・型チェックを実行し、通ることを確認する。失敗した場合はプッシュせず報告する。
- コミットメッセージは日本語で、変更内容が分かるように書く。
- `.env`・認証情報・実際の家計データなど、公開すべきでないファイルはコミットしない(`.gitignore` で除外する)。
- force push・`git reset --hard`・ブランチ削除などの破壊的操作は、事前に承認を得てから行う。
- リモートが未設定、または認証エラーでプッシュできない場合は、コミットまで行い、その旨を報告する。
