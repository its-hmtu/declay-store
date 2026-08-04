import { redirect } from 'next/navigation';

// M-32: Yêu thích giờ nằm trong khu vực Tài khoản. Giữ route cũ để link cũ không gãy.
export default function WishlistPage() {
  redirect('/account/favorites');
}
