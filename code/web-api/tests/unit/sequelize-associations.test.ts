import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Hồi quy M-19: mọi alias dùng trong `include: [{ model: X, as: 'y' }]` phải
 * có khai báo quan hệ tương ứng ở đâu đó trong mã nguồn.
 *
 * Vì sao cần test này: include với quan hệ chưa khai báo chỉ hỏng lúc CHẠY
 * ("X is not associated to Y!") — TypeScript không thấy vì `include` nhận kiểu
 * lỏng. Đã có bốn tính năng dùng `as: 'shippingAddress'` và `as: 'variant'`
 * trong khi hai quan hệ đó chưa hề được khai báo.
 *
 * Đây là kiểm tra TĨNH trên mã nguồn — không cần kết nối cơ sở dữ liệu.
 */

/** SRC_DIR cho phép chạy test từ thư mục khác (ví dụ môi trường CI tách biệt). */
const SRC = [
  process.env.SRC_DIR,
  join(__dirname, '..', '..', 'src'),
  join(process.cwd(), 'src'),
].find((dir): dir is string => Boolean(dir) && existsSync(dir!));

if (!SRC) throw new Error('Không tìm thấy thư mục src để quét quan hệ Sequelize.');

function collectFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collectFiles(full, out);
    else if (full.endsWith('.ts')) out.push(full);
  }
  return out;
}

const sources = collectFiles(SRC).map((f) => readFileSync(f, 'utf8'));
const allCode = sources.join('\n');

/** Alias xuất hiện trong include: `{ model: X, as: 'y' }` */
function usedAliases(): Set<string> {
  const found = new Set<string>();
  const re = /\{\s*model:\s*\w+\s*,\s*as:\s*'([^']+)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(allCode)) !== null) found.add(m[1]);
  return found;
}

/** Alias được khai báo: `.belongsTo(X, { ..., as: 'y' })` / hasOne / hasMany */
function declaredAliases(): Set<string> {
  const found = new Set<string>();
  const re = /\.(belongsTo|hasOne|hasMany|belongsToMany)\([^)]*as:\s*'([^']+)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(allCode)) !== null) found.add(m[2]);
  return found;
}

describe('Quan hệ Sequelize (M-19 hồi quy)', () => {
  it('mọi alias dùng trong include đều đã được khai báo', () => {
    const used = usedAliases();
    const declared = declaredAliases();
    const missing = [...used].filter((alias) => !declared.has(alias));

    expect(missing, `Alias dùng trong include nhưng CHƯA khai báo quan hệ: ${missing.join(', ')}`)
      .toEqual([]);
  });

  it('các quan hệ then chốt của Order tồn tại', () => {
    const declared = declaredAliases();
    // Bốn tính năng phụ thuộc: email xác nhận, email vận đơn,
    // tóm tắt trang cảm ơn, tạo vận đơn GHN.
    for (const alias of ['user', 'items', 'shipment', 'shippingAddress', 'variant']) {
      expect(declared.has(alias), `Thiếu khai báo quan hệ "${alias}"`).toBe(true);
    }
  });
});
