/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Sidebar, NavTab } from './components/Sidebar.tsx';
import { TopBar } from './components/TopBar.tsx';
import { DashboardPage, DashboardNavPreset } from './pages/DashboardPage.tsx';
import { MembersPage } from './pages/MembersPage.tsx';
import { CataloguePage } from './pages/CataloguePage.tsx';
import { IssueBookPage } from './pages/IssueBookPage.tsx';
import { ReturnBookPage, ReturnDeskMode } from './pages/ReturnBookPage.tsx';
import { FinesPage } from './pages/FinesPage.tsx';
import { StudentAccountPage } from './pages/StudentAccountPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { RefreshCw } from 'lucide-react';

function AppContent() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  // TopBar global search state
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchTrigger, setGlobalSearchTrigger] = useState(0);

  // Drill-down filter intents from Dashboard cards
  const [catalogueAvailability, setCatalogueAvailability] = useState<'all' | 'available' | 'unavailable'>('all');
  const [catalogueTrigger, setCatalogueTrigger] = useState(0);

  const [returnMode, setReturnMode] = useState<ReturnDeskMode>('active');
  const [returnTrigger, setReturnTrigger] = useState(0);

  const [membersStatus, setMembersStatus] = useState<'all' | 'Active' | 'Inactive'>('all');
  const [membersTrigger, setMembersTrigger] = useState(0);

  const [finesTab, setFinesTab] = useState<'Unpaid' | 'Paid'>('Unpaid');
  const [finesTrigger, setFinesTrigger] = useState(0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
        <p className="text-sm font-semibold text-slate-700">Connecting to Library Management System...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const isLibrarian = user.role === 'librarian';

  const currentTab: NavTab =
    !isLibrarian &&
    (activeTab === 'dashboard' ||
      activeTab === 'members' ||
      activeTab === 'issue' ||
      activeTab === 'return' ||
      activeTab === 'fines')
      ? 'catalogue'
      : activeTab;

  const handleSidebarSelectTab = (tab: NavTab) => {
    if (tab === 'catalogue') {
      setCatalogueAvailability('all');
      setCatalogueTrigger(prev => prev + 1);
    } else if (tab === 'return') {
      setReturnMode('active');
      setReturnTrigger(prev => prev + 1);
    } else if (tab === 'members') {
      setMembersStatus('all');
      setMembersTrigger(prev => prev + 1);
    } else if (tab === 'fines') {
      setFinesTab('Unpaid');
      setFinesTrigger(prev => prev + 1);
    }
    setActiveTab(tab);
  };

  const handleDashboardNavigate = (tab: NavTab, preset?: DashboardNavPreset) => {
    if (tab === 'catalogue') {
      setCatalogueAvailability(preset?.availability ?? 'all');
      setCatalogueTrigger(prev => prev + 1);
    } else if (tab === 'return') {
      setReturnMode(preset?.returnMode ?? 'active');
      setReturnTrigger(prev => prev + 1);
    } else if (tab === 'members') {
      setMembersStatus(preset?.memberStatus ?? 'all');
      setMembersTrigger(prev => prev + 1);
    } else if (tab === 'fines') {
      setFinesTab(preset?.fineTab ?? 'Unpaid');
      setFinesTrigger(prev => prev + 1);
    }
    setActiveTab(tab);
  };

  const handleTopBarSearch = (query: string) => {
    setGlobalSearchQuery(query);
    setGlobalSearchTrigger(prev => prev + 1);
    setCatalogueAvailability('all');
    setCatalogueTrigger(prev => prev + 1);
    setActiveTab('catalogue');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={currentTab} onSelectTab={handleSidebarSelectTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onSearch={handleTopBarSearch} />

        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && isLibrarian && (
            <DashboardPage onNavigateTo={handleDashboardNavigate} />
          )}

          {currentTab === 'members' && isLibrarian && (
            <MembersPage initialStatus={membersStatus} statusTrigger={membersTrigger} />
          )}

          {currentTab === 'catalogue' && (
            <CataloguePage
              isLibrarian={isLibrarian}
              externalSearch={globalSearchQuery}
              externalSearchTrigger={globalSearchTrigger}
              initialAvailability={catalogueAvailability}
              availabilityTrigger={catalogueTrigger}
            />
          )}

          {currentTab === 'issue' && isLibrarian && <IssueBookPage />}

          {currentTab === 'return' && isLibrarian && (
            <ReturnBookPage
              initialMode={returnMode}
              modeTrigger={returnTrigger}
              onNavigateToFines={() => handleDashboardNavigate('fines', { fineTab: 'Unpaid' })}
            />
          )}

          {currentTab === 'fines' && isLibrarian && (
            <FinesPage initialTab={finesTab} tabTrigger={finesTrigger} />
          )}

          {currentTab === 'my-account' && <StudentAccountPage />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
