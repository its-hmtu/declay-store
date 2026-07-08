import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Chính sách cửa hàng' };

// NOTE (W-11): Bản mẫu để cửa hàng rà soát và thay bằng nội dung chính thức.
export default function PoliciesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-serif text-4xl font-bold text-text mb-2">Chính sách cửa hàng</h1>
      <p className="text-text-faint text-sm mb-8">Cập nhật lần cuối: (đang hoàn thiện)</p>

      <div className="space-y-6 text-text-muted leading-relaxed">
        <p className="text-warning text-sm">
          Đây là bản mẫu. Nội dung chính thức cần được cửa hàng rà soát trước khi phát hành.
        </p>

        <section>
          <h2 className="font-serif text-xl font-semibold text-text mb-2">Chính sách bảo mật</h2>
          <p>Chúng tôi thu thập thông tin (email, số điện thoại, ngày sinh, địa chỉ) để xử lý đơn hàng và chăm sóc khách hàng, và không bán dữ liệu cho bên thứ ba.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-semibold text-text mb-2">Chính sách vận chuyển</h2>
          <p>Thời gian và phí vận chuyển tùy theo khu vực. Mã vận đơn được cung cấp khi đơn hàng được gửi đi.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-semibold text-text mb-2">Chính sách đổi trả &amp; hoàn tiền</h2>
          <p>Sản phẩm có thể được đổi/trả trong thời hạn quy định nếu còn nguyên trạng. Hoàn tiền được xử lý qua phương thức thanh toán ban đầu.</p>
        </section>
      </div>
    </div>
  );
}
