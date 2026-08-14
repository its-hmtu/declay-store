import { redirect } from 'next/navigation';

// M-31: Đơn hàng giờ là một mục trong trang Profile. Giữ route cũ để mọi liên
// kết cũ (email, thông báo) vẫn hoạt động — chuyển hướng vào mục Đơn hàng.
export default function OrdersPage() {
  redirect('/account/orders');
}
