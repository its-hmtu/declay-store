import { describe, it, expect } from 'vitest';
import { slugify } from '@/modules/tag/tag.service';

describe('slugify (W-23)', () => {
  it('lowercases and hyphenates words', () => {
    expect(slugify('Hand Made')).toBe('hand-made');
  });
  it('strips Vietnamese diacritics (incl. đ)', () => {
    expect(slugify('Đồ Gốm Thủ Công')).toBe('do-gom-thu-cong');
  });
  it('trims and collapses non-alphanumeric runs', () => {
    expect(slugify('  Rustic --- Vase!!  ')).toBe('rustic-vase');
  });
});
