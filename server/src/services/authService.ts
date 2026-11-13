import bcrypt from 'bcryptjs';
import { db } from '../config/db.ts';
import { generateToken } from '../middleware/auth.ts';
import { AppError } from '../middleware/errorHandler.ts';

export class AuthService {
  public static async login(email: string, password: string) {
    if (!email || !password) {
      throw new AppError('Email and password are required', 400, 'VALIDATION_ERROR');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);

    if (!user) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      memberId: user.memberId,
    });

    // Hydrate member details if student
    let member = null;
    if (user.memberId) {
      member = db.members.find(m => m.id === user.memberId) || null;
    }

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        memberId: user.memberId,
        member,
      },
    };
  }

  public static async activateStudent(email: string, password: string) {
    if (!email || !password) {
      throw new AppError('Email and password are required', 400, 'VALIDATION_ERROR');
    }

    if (password.length < 6) {
      throw new AppError('Password must be at least 6 characters long', 400, 'PASSWORD_TOO_SHORT');
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (existingUser) {
      throw new AppError('Account is already activated. Please login.', 400, 'ALREADY_ACTIVATED');
    }

    // Find registered member record with this email
    const member = db.members.find(m => m.email.toLowerCase() === normalizedEmail);
    if (!member) {
      throw new AppError(
        'Email not found in registered member records. Contact librarian to register first.',
        404,
        'MEMBER_NOT_REGISTERED'
      );
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const newUser = {
      id: userId,
      email: normalizedEmail,
      passwordHash,
      role: 'student' as const, // Role is strictly enforced on the server
      memberId: member.id,
      createdAt: now,
      updatedAt: now,
    };

    db.users.push(newUser);
    member.userId = userId;
    member.updatedAt = now;
    db.save();

    const token = generateToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      memberId: newUser.memberId,
    });

    return {
      message: 'Account activated successfully',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        memberId: newUser.memberId,
        member,
      },
    };
  }

  public static getCurrentUser(userId: string) {
    const user = db.users.find(u => u.id === userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    let member = null;
    if (user.memberId) {
      member = db.members.find(m => m.id === user.memberId) || null;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      memberId: user.memberId,
      member,
    };
  }
}
