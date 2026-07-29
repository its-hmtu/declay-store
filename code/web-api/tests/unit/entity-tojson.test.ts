import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Hồi quy: entity có `toJSON()` liệt kê field bằng tay dễ BỎ SÓT thuộc tính mới.
 *
 * Lỗi thật đã gặp: `Address.toJSON()` không trả `ghnDistrictId`/`ghnWardCode`,
 * nên checkout không tính được phí dù dữ liệu đã có trong DB — cột đúng, entity
 * đọc đúng, chỉ tầng serialize cắt mất. TypeScript không thấy vì kiểu trả về
 * cũng được khai tay cho khớp phần thiếu.
 *
 * Test quét tĩnh: với entity có toJSON tự viết, mọi thuộc tính khai trong class
 * (declare X) phải xuất hiện trong thân toJSON.
 */

const SRC = [
  process.env.SRC_DIR,
  join(__dirname, '..', '..', 'src'),
  join(process.cwd(), 'src'),
].find((d): d is string => Boolean(d) && existsSync(d!));

if (!SRC) throw new Error('Không tìm thấy thư mục src.');

/** Các entity có toJSON tự viết cần kiểm. Thêm vào đây khi có entity mới. */
const ENTITIES = [
  'modules/address/address.entity.ts',
];

function checkEntity(relPath: string): string[] {
  const code = readFileSync(join(SRC!, relPath), 'utf8');

  // Chỉ kiểm khi entity thực sự tự viết toJSON.
  if (!/\btoJSON\s*\(/.test(code)) return [];

  const declared = [...code.matchAll(/declare\s+(\w+)\s*:/g)].map((m) => m[1]);
  // Thân toJSON: lấy đoạn từ "return {" đầu tiên sau "toJSON".
  const start = code.indexOf('toJSON');
  const ret = code.indexOf('return {', start);
  const body = code.slice(ret, code.indexOf('};', ret) >= 0 ? code.indexOf('};', ret) : code.indexOf('}', ret) + 200);

  const missing: string[] = [];
  for (const attr of declared) {
    // Bỏ qua các trường nội bộ không cần lộ ra API.
    if (['createdAt', 'updatedAt'].includes(attr)) continue;
    const re = new RegExp(`\\b${attr}\\s*:`);
    if (!re.test(body)) missing.push(attr);
  }
  return missing;
}

describe('Entity toJSON không bỏ sót thuộc tính (hồi quy M-13)', () => {
  for (const entity of ENTITIES) {
    it(`${entity}: toJSON trả đủ mọi thuộc tính đã khai`, () => {
      const missing = checkEntity(entity);
      expect(missing, `toJSON THIẾU: ${missing.join(', ')}`).toEqual([]);
    });
  }
});
