import { describe, it, expect } from 'vitest';
import type { Request } from 'express';
import { keyWithQuery } from '@/middlewares/cache.middleware';

/** Minimal stand-in — keyWithQuery only ever reads `req.query`. */
function req(query: Record<string, unknown>): Request {
  return { query } as unknown as Request;
}

describe('keyWithQuery', () => {
  const key = keyWithQuery('collection_list', ['withProducts']);

  it('returns the bare key when the param is absent', () => {
    expect(key(req({}))).toBe('collection_list');
  });

  it('separates a different query variant', () => {
    // The bug this prevents: `/collections` and `/collections?withProducts=8`
    // return different payloads. Sharing one entry made the collections page
    // render nothing, because it received the variant with no products attached.
    expect(key(req({ withProducts: '8' }))).toBe('collection_list:withProducts=8');
    expect(key(req({ withProducts: '8' }))).not.toBe(key(req({})));
  });

  it('treats different values as different entries', () => {
    expect(key(req({ withProducts: '4' }))).not.toBe(key(req({ withProducts: '8' })));
  });

  it('ignores params the route does not read, so tracking junk cannot fragment the cache', () => {
    expect(key(req({ withProducts: '8', utm_source: 'facebook' }))).toBe('collection_list:withProducts=8');
    expect(key(req({ fbclid: 'abc' }))).toBe('collection_list');
  });

  it('ignores an empty value rather than creating a distinct entry', () => {
    expect(key(req({ withProducts: '' }))).toBe('collection_list');
  });

  it('ignores a repeated param, which Express parses as an array', () => {
    // Only strings are keyed; an array would otherwise stringify unpredictably.
    expect(key(req({ withProducts: ['8', '4'] }))).toBe('collection_list');
  });

  it('combines several params in the declared order, not the request order', () => {
    const articleKey = keyWithQuery('article_list', ['limit', 'offset']);
    expect(articleKey(req({ offset: '10', limit: '3' }))).toBe('article_list:limit=3&offset=10');
    // Same values, different request order → same key, so the cache still hits.
    expect(articleKey(req({ limit: '3', offset: '10' })))
      .toBe(articleKey(req({ offset: '10', limit: '3' })));
  });

  it('keeps the wildcard invalidation pattern working', () => {
    // Services invalidate with `${BASE}*`; every variant must start with BASE.
    expect(key(req({ withProducts: '8' })).startsWith('collection_list')).toBe(true);
  });
});
