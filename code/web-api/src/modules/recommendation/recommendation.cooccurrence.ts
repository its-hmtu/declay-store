/**
 * M-35: tính "mua chung" (co-occurrence) — thuần, test được.
 *
 * Đầu vào: mỗi đơn là một mảng product_id. Đếm số ĐƠN mà mỗi cặp (a,b) cùng
 * xuất hiện (đối xứng, lưu cả hai chiều để tra nhanh theo product_id). Chỉ giữ
 * cặp có số đơn ≥ minScore (P-Q5b, mặc định 2) để tránh nhiễu từ đơn lẻ.
 */
export interface CooccurrenceRow {
  productId: number;
  coProductId: number;
  score: number;
}

export function buildCooccurrence(orders: number[][], minScore = 2): CooccurrenceRow[] {
  const counts = new Map<string, number>();
  for (const order of orders) {
    const uniq = Array.from(new Set(order.filter((id) => Number.isInteger(id) && id > 0)));
    for (let i = 0; i < uniq.length; i++) {
      for (let j = 0; j < uniq.length; j++) {
        if (i === j) continue;
        const key = `${uniq[i]}:${uniq[j]}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }
  const out: CooccurrenceRow[] = [];
  for (const [key, score] of counts) {
    if (score < minScore) continue;
    const [a, b] = key.split(':').map(Number);
    out.push({ productId: a, coProductId: b, score });
  }
  return out;
}
