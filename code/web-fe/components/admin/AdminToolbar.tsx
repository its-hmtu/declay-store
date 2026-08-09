'use client';

/**
 * @deprecated Replaced by `FilterBar`.
 *
 * The old toolbar queried on every keystroke and shipped its filters unlabelled.
 * `FilterBar` keeps edits in a draft until Apply and labels every control; use it
 * for anything new. This shim only exists so a stale import fails loudly rather
 * than silently rendering the old behaviour.
 */

export { default } from '@/components/admin/FilterBar';
