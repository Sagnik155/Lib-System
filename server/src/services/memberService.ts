import { db, exactCaseInsensitive } from '../config/db.ts';
import { Member } from '../models/types.ts';
import { AppError } from '../middleware/errorHandler.ts';

export class MemberService {
  public static async getAllMembers(search?: string): Promise<Member[]> {
    const [members, activeTxns, unpaidFines] = await Promise.all([
      db.members.find({}, { projection: { _id: 0 } }).toArray(),
      db.transactions.find({ status: 'Issued' }, { projection: { _id: 0 } }).toArray(),
      db.fines.find({ status: 'Unpaid' }, { projection: { _id: 0 } }).toArray(),
    ]);

    let list = members;
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

    return list.map(m => {
      const activeLoansCount = activeTxns.filter(t => t.memberId === m.id).length;
      const unpaidFinesTotal = unpaidFines
        .filter(f => f.memberId === m.id)
        .reduce((sum, f) => sum + f.amount, 0);

      return {
        ...m,
        activeLoansCount,
        unpaidFinesTotal,
      };
    });
  }

  public static async getMemberById(id: string): Promise<Member> {
    const member = await db.members.findOne(
      { $or: [{ id }, { memberCode: exactCaseInsensitive(id) }] },
      { projection: { _id: 0 } }
    );
    if (!member) {
      throw new AppError('Member not found', 404, 'MEMBER_NOT_FOUND');
    }

    const [activeLoansCount, unpaidFines] = await Promise.all([
      db.transactions.countDocuments({ memberId: member.id, status: 'Issued' }),
      db.fines.find({ memberId: member.id, status: 'Unpaid' }, { projection: { _id: 0 } }).toArray(),
    ]);

    const unpaidFinesTotal = unpaidFines.reduce((sum, f) => sum + f.amount, 0);

    return {
      ...member,
      activeLoansCount,
      unpaidFinesTotal,
    };
  }

  public static async createMember(data: {
    fullName: string;
    email: string;
    phone: string;
    membershipType?: string;
    memberCode?: string;
  }): Promise<Member> {
    if (!data.fullName || !data.email) {
      throw new AppError('Full name and email are required', 400, 'VALIDATION_ERROR');
    }

    const normalizedEmail = data.email.trim().toLowerCase();
    const existingEmail = await db.members.findOne(
      { email: exactCaseInsensitive(normalizedEmail) },
      { projection: { _id: 0 } }
    );
    if (existingEmail) {
      throw new AppError('A member with this email already exists', 409, 'DUPLICATE_EMAIL');
    }

    let memberCode = data.memberCode?.trim().toUpperCase();
    if (!memberCode) {
      const allMembers = await db.members.find({}, { projection: { _id: 0, memberCode: 1 } }).toArray();
      const highestNum = allMembers.reduce((max, m) => {
        const match = m.memberCode.match(/M(\d+)/i);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
      }, 0);
      memberCode = `M${String(highestNum + 1).padStart(3, '0')}`;
    } else {
      const existingCode = await db.members.findOne(
        { memberCode: exactCaseInsensitive(memberCode) },
        { projection: { _id: 0 } }
      );
      if (existingCode) {
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

    await db.members.insertOne({ ...newMember });
    return newMember;
  }

  public static async updateMember(
    id: string,
    data: {
      fullName?: string;
      email?: string;
      phone?: string;
      membershipType?: string;
      status?: 'Active' | 'Inactive';
    }
  ): Promise<Member> {
    const member = await db.members.findOne({ id }, { projection: { _id: 0 } });
    if (!member) {
      throw new AppError('Member not found', 404, 'MEMBER_NOT_FOUND');
    }

    const updates: Partial<Member> = {
      updatedAt: new Date().toISOString(),
    };

    if (data.email) {
      const normalizedEmail = data.email.trim().toLowerCase();
      if (normalizedEmail !== member.email.toLowerCase()) {
        const emailConflict = await db.members.findOne(
          { id: { $ne: id }, email: exactCaseInsensitive(normalizedEmail) },
          { projection: { _id: 0 } }
        );
        if (emailConflict) {
          throw new AppError('Email is already in use by another member', 409, 'DUPLICATE_EMAIL');
        }
      }
      updates.email = normalizedEmail;
    }

    if (data.fullName !== undefined) updates.fullName = data.fullName.trim();
    if (data.phone !== undefined) updates.phone = data.phone.trim();
    if (data.membershipType !== undefined) updates.membershipType = data.membershipType.trim();
    if (data.status !== undefined) updates.status = data.status;

    await db.members.updateOne({ id }, { $set: updates });
    return { ...member, ...updates };
  }

  /**
   * Delete protection: A member with active unreturned transactions cannot be deleted.
   */
  public static async deleteMember(id: string): Promise<void> {
    const member = await db.members.findOne({ id }, { projection: { _id: 0 } });
    if (!member) {
      throw new AppError('Member not found', 404, 'MEMBER_NOT_FOUND');
    }

    const activeCount = await db.transactions.countDocuments({
      memberId: id,
      status: 'Issued',
    });
    if (activeCount > 0) {
      throw new AppError(
        'Cannot delete member with active book loans. Return all books first.',
        400,
        'ACTIVE_TRANSACTIONS_EXIST'
      );
    }

    if (member.userId) {
      await db.users.deleteOne({ id: member.userId });
    }

    await db.members.deleteOne({ id });
  }
}
