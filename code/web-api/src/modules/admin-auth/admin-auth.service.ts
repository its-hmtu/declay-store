import AdminUser from './admin-auth.entity';
import { httpError } from '@/utils/http-error';
import { signAdminAccessToken } from '@/utils/jwt';
import type { IAdminAuthService, IAdminLoginData } from './admin-auth.interface';

export default class AdminAuthService implements IAdminAuthService {
  async login(data: IAdminLoginData): Promise<{ access_token: string; admin: object }> {
    const admin = await AdminUser.unscoped().findOne({ where: { email: data.email } });

    if (!admin || !admin.verifyPassword(data.password)) {
      throw httpError(401, 'Invalid email or password');
    }

    if (!admin.isActive) {
      throw httpError(403, 'This admin account has been deactivated');
    }

    const access_token = signAdminAccessToken({
      adminId: admin.id,
      email: admin.email,
      role: admin.role as string,
    });

    return { access_token, admin: admin.toSafeJSON() };
  }

  async getAdminInfo(adminId: number): Promise<object> {
    const admin = await AdminUser.findByPk(adminId);
    if (!admin) throw httpError(404, 'Admin not found');
    return admin.toJSON();
  }
}
