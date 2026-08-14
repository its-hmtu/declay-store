'use client';

import FavoritesSection from '@/components/storefront/account/FavoritesSection';
import RecommendedProducts from '@/components/storefront/RecommendedProducts';

// M-32: /account/favorites — danh sách yêu thích, trong layout Account.
export default function AccountFavoritesPage() {
  return (
    <>
      <FavoritesSection />
      {/* M-35: gợi ý cá nhân hoá theo lịch sử mua + sản phẩm vừa xem. */}
      <RecommendedProducts context="account" limit={4} />
    </>
  );
}
