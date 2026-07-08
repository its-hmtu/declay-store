import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Điều khoản & Điều kiện' };

// NOTE (W-11): Bản mẫu để cửa hàng rà soát và thay bằng nội dung pháp lý chính thức.
export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-serif text-4xl font-bold text-text mb-2">Điều khoản &amp; Điều kiện</h1>
      <p className="text-text-faint text-sm mb-8">Cập nhật lần cuối: (đang hoàn thiện)</p>

      <div className="space-y-6 text-text-muted leading-relaxed">
        <p className="text-warning text-sm">
          Đây là bản mẫu. Nội dung chính thức cần được cửa hàng và bộ phận pháp lý rà soát trước khi phát hành.
        </p>

        <section>
          <h2 className="font-serif text-xl font-semibold text-text mb-2">1. Chấp nhận điều khoản</h2>
          <p>Khi tạo tài khoản và sử dụng Declay Store, bạn đồng ý tuân thủ các điều khoản dưới đây.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-semibold text-text mb-2">2. Tài khoản</h2>
          <p>Bạn chịu trách nhiệm bảo mật thông tin đăng nhập và mọi hoạt động diễn ra dưới tài khoản của mình.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-semibold text-text mb-2">3. Đặt hàng &amp; Thanh toán</h2>
          <p>Đơn hàng chỉ được xác nhận sau khi thanh toán thành công. Giá và tình trạng còn hàng có thể thay đổi.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-semibold text-text mb-2">4. Giao hàng &amp; Đổi trả</h2>
          <p>Chi tiết về vận chuyển và đổi trả được nêu tại trang Chính sách cửa hàng.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-semibold text-text mb-2">5. Liên hệ</h2>
          <p>Mọi thắc mắc vui lòng liên hệ bộ phận hỗ trợ của Declay Store.</p>
        </section>
      </div>
    </div>
  );
}
