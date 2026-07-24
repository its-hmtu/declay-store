import type { Metadata } from 'next';
import WishlistClient from './WishlistClient';

export const metadata: Metadata = { title: 'My Wishlist' };

export default function WishlistPage() {
  return <WishlistClient />;
}
