import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  BookPlus,
  RotateCcw,
  Receipt,
  UserCheck,
  LogOut,
  Sparkles,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'members'
  | 'catalogue'
  | 'issue'
  | 'return'
  | 'fines'
  | 'my-account';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const { user, logout, quickLoginAs } = useAuth();
  const isLibrarian = user?.role === 'librarian';

  const navItems = isLibrarian
    ? [
        { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
        { id: 'members' as NavTab, label: 'Members', icon: Users },
        { id: 'catalogue' as NavTab, label: 'Books & Catalogue', icon: BookOpen },
        { id: 'issue' as NavTab, label: 'Issue Book Desk', icon: BookPlus },
        { id: 'return' as NavTab, label: 'Return Book Desk', icon: RotateCcw },
        { id: 'fines' as NavTab, label: 'Fines & Receipts', icon: Receipt },
      ]
    : [
        { id: 'catalogue' as NavTab, label: 'Browse Catalogue', icon: BookOpen },
        { id: 'my-account' as NavTab, label: 'My Account', icon: UserCheck },
      ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/90 flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div>
        <div className="px-5 py-5 border-b border-slate-100">
          <h1 className="font-bold text-slate-900 text-sm leading-snug tracking-tight">
            Library Management System
          </h1>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">
            Circulation Desk
          </p>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1.5">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {isLibrarian ? 'Administration' : 'Student Access'}
          </div>

          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-300/40 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Demo Switcher & Logout */}
      <div className="p-4 border-t border-slate-100 space-y-3">
        {/* Viva / Demo Quick Account Switcher */}
        <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              Demo Switcher
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-semibold">
              Quick Switch
            </span>
          </div>

          <div className="space-y-1 text-xs">
            <button
              onClick={() => quickLoginAs('librarian@college.edu')}
              className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                user?.role === 'librarian'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-slate-700 hover:bg-slate-200/70'
              }`}
            >
              Librarian (Full Admin)
            </button>
            <button
              onClick={() => quickLoginAs('aarav.sharma@college.edu')}
              className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                user?.email === 'aarav.sharma@college.edu'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-slate-700 hover:bg-slate-200/70'
              }`}
            >
              Student: Aarav (1 fine)
            </button>
            <button
              onClick={() => quickLoginAs('diya.patel@college.edu')}
              className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                user?.email === 'diya.patel@college.edu'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-slate-700 hover:bg-slate-200/70'
              }`}
            >
              Student: Diya (Overdue)
            </button>
          </div>
        </div>

        {/* User Card & Logout */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
              {user?.email[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-800 truncate">{user?.email}</p>
              <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wider">{user?.role}</p>
            </div>
          </div>

          <button
            onClick={logout}
            title="Sign out"
            className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
