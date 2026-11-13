import { db } from '../config/db.ts';
import { Member } from '../models/types.ts';
import { AppError } from '../middleware/errorHandler.ts';

export class MemberService {
  public static getAllMembers(search?: string): Member[] {
    let list = db.members;

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        m =>
          m.memberCode.toLowerCase().includes(q) ||
          m.fullName.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.phone.toLowerCase().includes(q)
      );
    }

    // Hydrate active loans count & unpaid fine total
    return list.map(m => {
      const activeLoansCount = db.transactions.filter(
        t => t.memberId === m.id && t.status === 'Issued'
      ).length;

      const unpaidFinesTotal = db.fines
        .filter(f => f.memberId === m.id && f.status === 'Unpaid')
        .reduce((sum, f) => sum + f.amount, 0);

      return {
        ...m,
        activeLoansCount,
        unpaidFinesTotal,
      };
    });
  }

  public static getMemberById(id: string): Member {
    const member = db.members.find(m => m.id === id || m.memberCode.toLowerCase() === id.toLowerCase());
    if (!member) {
      throw new AppError('Member not found', 404, 'MEMBER_NOT_FOUND');
    }

    const activeLoansCount = db.transactions.filter(
      t => t.memberId === member.id && t.status === 'Issued'
    ).length;

    const unpaidFinesTotal = db.fines
      .filter(f => f.memberId === member.id && f.status === 'Unpaid')
      .reduce((sum, f) => sum + f.amount, 0);

    return {
      ...member,
      activeLoansCount,
      unpaidFinesTotal,
    };
  }

  public static createMember(data: {
    fullName: string;
    email: string;
    phone: string;
    membershipType?: string;
    memberCode?: string;
  }): Member {
    if (!data.fullName || !data.email) {
      throw new AppError('Full name and email are required', 400, 'VALIDATION_ERROR');
    }

    const normalizedEmail = data.email.trim().toLowerCase();
    if (db.members.some(m => m.email.toLowerCase() === normalizedEmail)) {
      throw new AppError('A member with this email already exists', 409, 'DUPLICATE_EMAIL');
    }

    // Generate or validate member code (e.g. M001)
    let memberCode = data.memberCode?.trim().toUpperCase();
    if (!memberCode) {
      const highestNum = db.members.reduce((max, m) => {
        const match = m.memberCode.match(/M(\d+)/i);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
      }, 0);
      memberCode = `M${String(highestNum + 1).padStart(3, '0')}`;
    } else {
      if (db.members.some(m => m.memberCode.toUpperCase() === memberCode)) {
        throw new AppError('A member with this code already exists', 409, 'DUPLICATE_MEMBER_CODE');
      }
    }

    const now = new Date().toISOString();
    const newMember: Member = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      memberCode,
      fullName: data.fullName.trim(),
      email: normalizedEmail,
      phone: data.phone?.trim() || '',
      membershipType: data.membershipType?.trim() || 'Student',
      status: 'Active',
      createdAt: now,
      updatedAt: now,
    };

    db.members.push(newMember);
    db.save();
    return newMember;
  }

  public static updateMember(
    id: string,
    data: {
      fullName?: string;
      email?: string;
      phone?: string;
      membershipType?: string;
      status?: 'Active' | 'Inactive';
    }
  ): Member {
    const member = db.members.find(m => m.id === id);
    if (!member) {
      throw new AppError('Member not found', 404, 'MEMBER_NOT_FOUND');
    }

    if (data.email) {
      const normalizedEmail = data.email.trim().toLowerCase();
      if (
        normalizedEmail !== member.email.toLowerCase() &&
        db.members.some(m => m.email.toLowerCase() === normalizedEmail)
      ) {
        throw new AppError('Email is already in use by another member', 409, 'DUPLICATE_EMAIL');
      }
      member.email = normalizedEmail;
    }

    if (data.fullName !== undefined) member.fullName = data.fullName.trim();
    if (data.phone !== undefined) member.phone = data.phone.trim();
    if (data.membershipType !== undefined) member.membershipType = data.membershipType.trim();
    if (data.status !== undefined) member.status = data.status;

    member.updatedAt = new Date().toISOString();
    db.save();
    return member;
  }

  /**
   * Delete protection: A member with active unreturned transactions cannot be deleted.
   */
  public static deleteMember(id: string): void {
    const memberIndex = db.members.findIndex(m => m.id === id);
    if (memberIndex === -1) {
      throw new AppError('Member not found', 404, 'MEMBER_NOT_FOUND');
    }

    const hasActiveTransactions = db.transactions.some(
      t => t.memberId === id && t.status === 'Issued'
    );
    if (hasActiveTransactions) {
      throw new AppError(
        'Cannot delete member with active book loans. Return all books first.',
        400,
        'ACTIVE_TRANSACTIONS_EXIST'
      );
    }

    // Also remove associated user account if any
    const member = db.members[memberIndex];
    if (member.userId) {
      const uIndex = db.users.findIndex(u => u.id === member.userId);
      if (uIndex !== -1) db.users.splice(uIndex, 1);
    }

    db.members.splice(memberIndex, 1);
    db.save();
  }
}
