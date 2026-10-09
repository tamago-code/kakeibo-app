// スマホ写真は数MBあり、Claude API の画像サイズ上限を超えやすい。
// 長辺 1568px(Claude が画像を縮小せずに扱える目安)に縮めて JPEG で送る。
const MAX_EDGE = 1568;

export async function resizeImage(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("画像の変換に失敗しました。"))),
      "image/jpeg",
      0.9,
    );
  });
}
