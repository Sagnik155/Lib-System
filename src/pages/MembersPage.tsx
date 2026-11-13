import React, { useState, useEffect } from 'react';
import { api } from '../utils/api.ts';
import { Member } from '../types/index.ts';
import {
  UserPlus,
  Search,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  X,
} from 'lucide-react';

interface MembersPageProps {
  initialStatus?: 'all' | 'Active' | 'Inactive';
  statusTrigger?: number;
}

export const MembersPage: React.FC<MembersPageProps> = ({
  initialStatus = 'all',
  statusTrigger = 0,
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive'>(initialStatus);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deletingMember, setDeletingMember] = useState<Member | null>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [membershipType, setMembershipType] = useState('Student');
  const [memberCode, setMemberCode] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchMembers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<Member[]>(`/members${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      setMembers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load member records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (statusTrigger > 0) {
      setStatusFilter(initialStatus);
    }
  }, [initialStatus, statusTrigger]);

  useEffect(() => {
    fetchMembers();
  }, [search]);

  const handleOpenAddModal = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setMembershipType('Student');
    setMemberCode('');
    setFormError(null);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (m: Member) => {
    setEditingMember(m);
    setFullName(m.fullName);
    setEmail(m.email);
    setPhone(m.phone);
    setMembershipType(m.membershipType);
    setFormError(null);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (editingMember) {
        await api.put(`/members/${editingMember.id}`, {
          fullName,
          email,
          phone,
          membershipType,
        });
        setSuccessMsg(`Member ${fullName} updated successfully.`);
        setEditingMember(null);
      } else {
        await api.post('/members', {
          fullName,
          email,
          phone,
          membershipType,
          memberCode: memberCode ? memberCode.trim() : undefined,
        });
        setSuccessMsg(`Member ${fullName} registered successfully.`);
        setShowAddModal(false);
      }
      fetchMembers();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (member: Member) => {
    const newStatus = member.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await api.put(`/members/${member.id}`, { status: newStatus });
      setSuccessMsg(`Member ${member.fullName} status updated to ${newStatus}.`);
      fetchMembers();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    }
  };

  const handleConfirmDeleteMember = async () => {
    if (!deletingMember) return;
    const member = deletingMember;
    setDeletingMember(null);
    setError(null);

    try {
      await api.delete(`/members/${member.id}`);
      setSuccessMsg(`Member ${member.fullName} removed.`);
      fetchMembers();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Cannot delete member: active book loans exist.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Members</h2>
          <p className="text-xs text-slate-500 mt-0.5">Register student members, manage status, and view borrowing quotas</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-full text-[11px] font-semibold">
            {(['all', 'Active', 'Inactive'] as const).map(status => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                  statusFilter === status
                    ? 'bg-white text-slate-900 font-bold shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {status === 'all' ? 'All' : status}
              </button>
            ))}
          </div>

          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search Member..."
              className="w-full bg-white border border-slate-200 rounded-full pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-full shadow-sm transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Add Members
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-red-800 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Members Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-6">Member ID</th>
                <th className="py-3 px-6">Full Name</th>
                <th className="py-3 px-6">Email ID</th>
                <th className="py-3 px-6">Active Loans</th>
                <th className="py-3 px-6">Unpaid Fines</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    <span>Loading members...</span>
                  </td>
                </tr>
              ) : members.filter(m => statusFilter === 'all' || m.status === statusFilter).length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    No {statusFilter === 'all' ? '' : `${statusFilter.toLowerCase()} `}members found{search ? ` matching "${search}"` : ''}.
                  </td>
                </tr>
              ) : (
                members
                  .filter(m => statusFilter === 'all' || m.status === statusFilter)
                  .map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-6 whitespace-nowrap">
                      <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-1 rounded border border-slate-200">
                        {m.memberCode}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 font-semibold text-slate-900 whitespace-nowrap">{m.fullName}</td>
                    <td className="py-3.5 px-6 text-slate-600 font-medium">{m.email}</td>
                    <td className="py-3.5 px-6 whitespace-nowrap">
                      <span
                        className={`font-semibold px-2 py-0.5 rounded-full text-[11px] ${
                          (m.activeLoansCount || 0) >= 5
                            ? 'bg-rose-100 text-rose-800 font-bold border border-rose-200'
                            : (m.activeLoansCount || 0) > 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {m.activeLoansCount || 0} / 5 issued
                      </span>
                    </td>
                    <td className="py-3.5 px-6 whitespace-nowrap">
                      {(m.unpaidFinesTotal || 0) > 0 ? (
                        <span className="font-mono font-bold text-rose-600 text-xs bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          ₹{m.unpaidFinesTotal}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">₹0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(m)}
                        title="Click to toggle status"
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          m.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-200'
                            : 'bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-200'
                        }`}
                      >
                        {m.status}
                      </button>
                    </td>
                    <td className="py-3.5 px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(m)}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeletingMember(m)}
                          className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                          title="Delete member"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Member Modal */}
      {(showAddModal || editingMember) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">
                {editingMember ? 'Edit Member Details' : 'Register New Student Member'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingMember(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveMember} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Sagnik Roy"
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Institutional Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="e.g. sagnik.roy@college.edu"
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Student will activate their login using this exact email address.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {!editingMember && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Custom Member Code (Optional)</label>
                  <input
                    type="text"
                    value={memberCode}
                    onChange={e => setMemberCode(e.target.value)}
                    placeholder="Leave empty to auto-generate (e.g. M011)"
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingMember(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : editingMember ? 'Update Member' : 'Register Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">Remove Member</h3>
              <button
                onClick={() => setDeletingMember(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Are you sure you want to delete member <strong className="text-slate-900">{deletingMember.fullName}</strong> (
              <span className="font-mono">{deletingMember.memberCode}</span>)? Members with active loans cannot be deleted.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingMember(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteMember}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
              >
                Delete Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
