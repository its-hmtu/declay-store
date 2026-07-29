import AdminUser from './admin-auth.entity';
import { httpError } from '@/utils/http-error';
import { signAdminAccessToken, signAdminRefreshToken, verifyAdminRefreshToken } from '@/utils/jwt';
import type { IAdminAuthService, IAdminLoginData } from './admin-auth.interface';

export default class AdminAuthService implements IAdminAuthService {
  async login(data: IAdminLoginData): Promise<{ access_token: string; refresh_token: string; admin: object }> {
    const admin = await AdminUser.unscoped().findOne({ where: { email: data.email } });

    if (!admin || !admin.verifyPassword(data.password)) {
      throw httpError(401, 'Invalid email or password');
    }

    if (!admin.isActive) {
      throw httpError(403, 'This admin account has been deactivated');
    }

    const tokenPayload = { adminId: admin.id, email: admin.email, role: admin.role as string };
    const access_token = signAdminAccessToken(tokenPayload);
    const refresh_token = signAdminRefreshToken(tokenPayload);

    return { access_token, refresh_token, admin: admin.toSafeJSON() };
  }

  /**
   * M-25: đổi refresh token lấy access token mới (và xoay refresh).
   *
   * Kiểm tra lại tài khoản còn tồn tại và ĐANG hoạt động — refresh token cấp
   * lúc còn active không được phép dùng sau khi admin bị vô hiệu hoá.
   */
  async refresh(refreshToken: string): Promise<{ access_token: string; refresh_token: string }> {
    const decoded = verifyAdminRefreshToken(refreshToken);

    const admin = await AdminUser.unscoped().findByPk(decoded.adminId);
    if (!admin) throw httpError(401, 'Admin not found');
    if (!admin.isActive) throw httpError(403, 'This admin account has been deactivated');

    const tokenPayload = { adminId: admin.id, email: admin.email, role: admin.role as string };
    return {
      access_token: signAdminAccessToken(tokenPayload),
      refresh_token: signAdminRefreshToken(tokenPayload),
    };
  }

  async getAdminInfo(adminId: number): Promise<object> {
    const admin = await AdminUser.findByPk(adminId);
    if (!admin) throw httpError(404, 'Admin not found');
    return admin.toJSON();
  }
}
