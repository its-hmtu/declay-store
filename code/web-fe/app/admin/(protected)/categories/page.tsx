import type { Metadata } from 'next';
import CategoriesClient from './CategoriesClient';

export const metadata: Metadata = { title: 'Categories' };

export default function CategoriesPage() {
  return <CategoriesClient />;
}
