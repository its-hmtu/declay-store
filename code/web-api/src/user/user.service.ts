import User from "@/user/user.entity";
import { IUserService } from "./user.interface";
import { httpError } from "@/utils/http-error";

export default class UserService implements IUserService {
  async getUserInfo(userId: number): Promise<User> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw httpError(404, 'User not found');
    }
    return user;
  }

  async updateUserInfo(userId: number, updateData: {
    username?: string;
    fullName?: string;
    phoneNumber?: string;
  }): Promise<User> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw httpError(404, 'User not found');
    }

    // Check if username is already taken by another user
    if (updateData.username) {
      const existingUser = await User.findOne({
        where: { username: updateData.username },
      });
      if (existingUser && existingUser.id !== userId) {
        throw httpError(400, 'Username is already taken');
      }
    }

    // Update user info
    if (updateData.username !== undefined) user.username = updateData.username;
    if (updateData.fullName !== undefined) user.fullName = updateData.fullName;
    if (updateData.phoneNumber !== undefined) user.phoneNumber = updateData.phoneNumber;

    await user.save();
    return user;
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    // Get user with password field
    const user = await User.unscoped().findByPk(userId);
    if (!user) {
      throw httpError(404, 'User not found');
    }

    // For OAuth users without password, they cannot change password this way
    if (!user.password) {
      throw httpError(400, 'OAuth users cannot change password directly. Please use password reset.');
    }

    // Verify current password
    if (!user.verifyPassword(currentPassword)) {
      throw httpError(401, 'Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    await user.save();
  }
}
