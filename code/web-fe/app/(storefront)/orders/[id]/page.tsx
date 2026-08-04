import { redirect } from 'next/navigation';

// M-31: chi tiết đơn giờ hiển thị trong trang Profile. Route cũ /orders/:id
// (dùng trong email xác nhận, trang cảm ơn, thông báo) chuyển hướng về
// /account?order=:id để mở đúng đơn trong mục Đơn hàng — deep-link không gãy.
export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const payment = typeof sp.payment === 'string' ? `?payment=${sp.payment}` : '';
  redirect(`/account/orders/${id}${payment}`);
}
