import type { Metadata } from 'next';
import ProductFormPage from '../ProductFormPage';

export const metadata: Metadata = { title: 'New Product' };

/**
 * M-48: create is its own route, not a panel above the list. The URL is
 * shareable, the browser's back button means something, and the breadcrumb
 * rendered by the admin layout is accurate — so no in-page back button is needed.
 */
export default function NewProductPage() {
  return <ProductFormPage />;
}
