import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Search, ChevronDown, Wifi, WifiOff } from 'lucide-react';
import { getLastSyncTime } from '../utils/offlineCache.ts';
import { PWAInstallButton } from './PWAInstallButton.tsx';

interface TopBarProps {
  onSearch?: (query: string, filterType: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onSearch }) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState<string | null>(getLastSyncTime());

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      setLastSync(getLastSyncTime());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery, filterType);
    }
  };

  const filterOptions = ['All', 'Title', 'Author', 'ISBN'];

  return (
    <header className="h-16 bg-white border-b border-slate-200/90 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative flex items-center max-w-md w-full">
        <div className="relative flex items-center w-full bg-slate-100/90 border border-slate-200/80 rounded-full px-3 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 pr-2 border-r border-slate-300 mr-2 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>{filterType}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showFilterMenu && (
              <div className="absolute top-8 left-0 w-28 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
                {filterOptions.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setFilterType(opt);
                      setShowFilterMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer ${
                      filterType === opt ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search catalogue by ISBN, Title, or Author..."
            className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
          />
        </div>
      </form>

      {/* Right Controls: Install PWA, Offline Banner & User Profile */}
      <div className="flex items-center gap-3">
        <PWAInstallButton />
        {!isOnline ? (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs font-medium text-amber-800">
            <WifiOff className="w-3.5 h-3.5 text-amber-600" />
            <span>Offline: showing catalogue cached {lastSync ? new Date(lastSync).toLocaleTimeString() : 'earlier'}</span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200/60 rounded-full text-[11px] font-semibold text-emerald-700">
            <Wifi className="w-3 h-3 text-emerald-600" />
            <span>Catalogue Online</span>
          </div>
        )}

        {/* User Avatar with Role */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center">
            {user?.email[0].toUpperCase()}
          </div>
          <div className="hidden lg:block text-left">
            <span className="text-xs font-bold text-slate-800 block leading-tight">
              {user?.member ? user.member.fullName : user?.email.split('@')[0]}
            </span>
            <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
              {user?.role}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
