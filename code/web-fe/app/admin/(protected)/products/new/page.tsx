import type { Metadata } from 'next';
import ProductForm from '../ProductForm';

export const metadata: Metadata = { title: 'New Product' };

export default function NewProductPage() {
  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-text mb-8">New Product</h1>
      <ProductForm />
    </div>
  );
}
