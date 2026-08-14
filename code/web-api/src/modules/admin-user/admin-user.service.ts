import { Op } from 'sequelize';
import AdminUser from '@/modules/admin-auth/admin-auth.entity';
import { httpError } from '@/utils/http-error';
import { revokeAllForPrincipal, TokenTTL } from '@/lib/token-revocation';
import type {
  IAdminUser,
  IAdminUserService,
  ICreateAdminData,
  IUpdateAdminData,
} from './admin-user.interface';

export default class AdminUserService implements IAdminUserService {
  // Number of OTHER active super_admins (excludes the given id)
  private async otherActiveSuperAdminCount(excludeId: number): Promise<number> {
    return AdminUser.count({
      where: { role: 'super_admin', isActive: true, id: { [Op.ne]: excludeId } },
    });
  }

  async list(page: number, limit: number): Promise<{ rows: IAdminUser[]; count: number }> {
    const offset = (page - 1) * limit;
    const { rows, count } = await AdminUser.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });
    return { rows: rows.map((a) => a.toSafeJSON() as IAdminUser), count };
  }

  async findById(id: number): Promise<IAdminUser> {
    const admin = await AdminUser.findByPk(id);
    if (!admin) throw httpError(404, 'Admin not found');
    return admin.toSafeJSON() as IAdminUser;
  }

  async create(data: ICreateAdminData): Promise<IAdminUser> {
    const existing = await AdminUser.findOne({ where: { email: data.email } });
    if (existing) throw httpError(409, 'An admin with this email already exists');

    const admin = await AdminUser.create(data);
    return admin.toSafeJSON() as IAdminUser;
  }

  async update(id: number, data: IUpdateAdminData, actingAdminId: number): Promise<IAdminUser> {
    const admin = await AdminUser.unscoped().findByPk(id);
    if (!admin) throw httpError(404, 'Admin not found');

    const isSelf = id === actingAdminId;
    const demoting = data.role !== undefined && data.role !== 'super_admin';
    const deactivating = data.isActive === false;

    // Prevent self-lockout
    if (isSelf && deactivating) {
      throw httpError(400, 'You cannot deactivate your own account');
    }
    if (isSelf && demoting) {
      throw httpError(400, 'You cannot change your own role');
    }

    // Protect the last active super_admin
    if (admin.role === 'super_admin' && (demoting || deactivating)) {
      const others = await this.otherActiveSuperAdminCount(id);
      if (others === 0) {
        throw httpError(400, 'Cannot demote or deactivate the last active super admin');
      }
    }

    const roleChanged = data.role !== undefined && data.role !== admin.role;
    await admin.update(data);

    // A demotion or deactivation must take effect immediately, not after the
    // existing token expires (up to 8h later)
    if (roleChanged || deactivating) {
      await revokeAllForPrincipal('admin', id, TokenTTL.ADMIN_MAX);
    }

    return admin.toSafeJSON() as IAdminUser;
  }

  async remove(id: number, actingAdminId: number): Promise<void> {
    if (id === actingAdminId) {
      throw httpError(400, 'You cannot delete your own account');
    }

    const admin = await AdminUser.findByPk(id);
    if (!admin) throw httpError(404, 'Admin not found');

    if (admin.role === 'super_admin') {
      const others = await this.otherActiveSuperAdminCount(id);
      if (others === 0) {
        throw httpError(400, 'Cannot delete the last active super admin');
      }
    }

    await admin.destroy();

    // Invalidate any tokens the deleted admin still holds
    await revokeAllForPrincipal('admin', id, TokenTTL.ADMIN_MAX);
  }
}
