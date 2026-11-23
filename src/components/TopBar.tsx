import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Building2,
  CheckCircle2,
  CloudOff,
  Home,
  LogOut,
  Menu,
  Moon,
  Palette,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sun,
  Trash2,
  Wifi,
  X,
} from 'lucide-react';
import { PAGE_LABELS, useErp } from '../context/ErpContext';
import type { AppPageId } from '../types/erp';
import { t } from '../utils/i18n';

export const TopBar: React.FC = () => {
  const {
    db,
    user,
    activeCampusId,
    setActiveCampusId,
    activePage,
    navigateTo,
    openTabs,
    closeTab,
    setMobileMenuOpen,
    darkMode,
    toggleDarkMode,
    uiPrefs,
    setCustomizeOpen,
    setSearchOpen,
    canVisitPage,
    logout,
    mutate,
    isOnline,
    simulatedOffline,
    toggleSimulatedOffline,
    syncQueue,
    syncing,
    lastSyncedAt,
    syncNow,
    removeQueuedItem,
    clearSyncQueue,
  } = useErp();

  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'Advance' | 'Enterprise'>('Advance');

  const pendingInquiries = canVisitPage('admissions')
    ? (db?.inquiries.filter((i) => i.status === 'new').length ?? 0)
    : 0;
  const pendingLeaves = canVisitPage('leaves')
    ? (db?.leaves.filter((l) => l.status === 'pending').length ?? 0)
    : 0;
  const openComplaints = canVisitPage('complaints')
    ? (db?.complaints.filter((c) => c.status === 'open').length ?? 0)
    : 0;
  const totalAlerts = pendingInquiries + pendingLeaves + openComplaints;

  const campuses = db?.campuses ?? [];
  const quickTabPages: AppPageId[] = ['students', 'fees', 'attendance', 'exams', 'classes', 'homework', 'timetable'];
  const nextQuickTab = quickTabPages.find((p) => canVisitPage(p) && !openTabs.some((t) => t.id === p));
  const daysLeft = db?.settings.daysLeft ?? 3;
  const showRenewalBanner =
    user?.role === 'Admin' && db && !db.settings.renewalBannerDismissed && daysLeft <= 7;

  const handleRenew = async () => {
    const res = await mutate(
      '/api/settings',
      'PATCH',
      {
        packageName: selectedPlan,
        daysLeft: 365,
        renewalBannerDismissed: false,
      },
      `Subscription renewed on ${selectedPlan} plan for 365 days.`
    );
    if (res.ok) setRenewOpen(false);
  };

  const headerNavClass =
    uiPrefs.navColor === 'coloured' ? 'erp-nav-coloured' : 'erp-nav-cream';

  return (
    <header className={`sticky top-0 z-30 ${headerNavClass} erp-surface border-b border-slate-200 dark:border-slate-800`}>
      {/* Primary Top Row */}
      <div className="px-3 sm:px-4 lg:px-6 py-2 flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            className="lg:hidden w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center shrink-0"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Compact Search Icon on Mobile, Full Search Bar on sm+ */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search students, parents, staff or pages"
            className="sm:hidden w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0 cursor-pointer"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex flex-1 max-w-xl items-center justify-between gap-3 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 text-left transition-colors cursor-pointer min-w-0"
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <span className="w-7 h-7 rounded-lg bg-teal-700 text-white flex items-center justify-center shrink-0">
                <Search className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs sm:text-sm text-slate-400 dark:text-slate-400 truncate">
                {t(uiPrefs.language, 'searchPlaceholder')}
              </span>
            </span>
            <kbd className="hidden md:inline-block px-2 py-0.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shrink-0">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Right Utility Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Online / Offline Sync Center */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setSyncOpen((p) => !p);
                setNotifOpen(false);
                setUserMenuOpen(false);
              }}
              aria-label="Online and offline data sync center"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                isOnline
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/80 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
              }`}
            >
              {syncing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : isOnline ? (
                <Wifi className="w-3.5 h-3.5" />
              ) : (
                <CloudOff className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {isOnline ? t(uiPrefs.language, 'online') : t(uiPrefs.language, 'offline')}
              </span>
              {syncQueue.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-amber-600 text-white font-mono text-[10px] font-bold tabular-nums">
                  {syncQueue.length} Queued
                </span>
              )}
            </button>

            {syncOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-4 z-50 space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      Online / Offline Data Sync
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {lastSyncedAt ? `Last server sync: ${lastSyncedAt}` : 'Local snapshot cached'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSyncOpen(false)}
                    aria-label="Close sync center"
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <label className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 cursor-pointer">
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      Work Offline (Queue Mode)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Queue attendance scans, fees &amp; forms locally
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={simulatedOffline}
                    onChange={toggleSimulatedOffline}
                    className="rounded accent-teal-700"
                  />
                </label>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    <span>Pending Sync Queue ({syncQueue.length})</span>
                    {syncQueue.length > 0 && (
                      <button
                        type="button"
                        onClick={clearSyncQueue}
                        className="text-rose-600 hover:underline font-semibold cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  {syncQueue.length === 0 ? (
                    <div className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-[11px] text-slate-400">
                      All attendance, fees, and records are synced with server.
                    </div>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-1.5">
                      {syncQueue.map((item) => (
                        <div
                          key={item.id}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {item.summary}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {item.createdAt.slice(11, 19)} · {item.status}
                              {item.error ? ` (${item.error})` : ''}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeQueuedItem(item.id)}
                            aria-label={`Remove queued ${item.summary}`}
                            className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={syncing}
                  onClick={() => void syncNow()}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white font-semibold cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  <span>{syncing ? 'Syncing Queue...' : 'Sync Now with Server'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Campus Selector (Admin/Staff) */}
          {user?.role !== 'Parent' && user?.role !== 'Student' && (
            <div className="relative flex items-center">
              <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 absolute left-2.5 pointer-events-none" />
              <select
                aria-label="Select Campus"
                value={activeCampusId}
                onChange={(e) => setActiveCampusId(e.target.value)}
                className="max-w-[130px] sm:max-w-[190px] truncate pl-7 pr-6 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600/20 cursor-pointer"
              >
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value="all">All Campuses</option>
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setCustomizeOpen(true);
              setSyncOpen(false);
              setNotifOpen(false);
              setUserMenuOpen(false);
            }}
            aria-label="Open theme and language customization"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold cursor-pointer"
          >
            <Palette className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
            <span className="hidden md:inline">{t(uiPrefs.language, 'customize')}</span>
          </button>

          <button
            type="button"
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
            className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notifications Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setNotifOpen((p) => !p);
                setUserMenuOpen(false);
                setSyncOpen(false);
              }}
              aria-label="Notifications"
              className="relative w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {totalAlerts > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {totalAlerts}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl p-3 z-50 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Campus Alerts</span>
                  <button
                    type="button"
                    onClick={() => setNotifOpen(false)}
                    aria-label="Close notifications"
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {canVisitPage('admissions') && (
                  <button
                    type="button"
                    onClick={() => {
                      setNotifOpen(false);
                      navigateTo('admissions');
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-xs"
                  >
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {pendingInquiries} New Admission Inquiries
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">Click to review &amp; enroll</div>
                  </button>
                )}
                {canVisitPage('leaves') && (
                  <button
                    type="button"
                    onClick={() => {
                      setNotifOpen(false);
                      navigateTo('leaves');
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-xs"
                  >
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {pendingLeaves} Pending Leave Requests
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">Student &amp; staff updates</div>
                  </button>
                )}
                {canVisitPage('complaints') && (
                  <button
                    type="button"
                    onClick={() => {
                      setNotifOpen(false);
                      navigateTo('complaints');
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-xs"
                  >
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {openComplaints} Open Parent Complaints
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">Feedback &amp; review queue</div>
                  </button>
                )}
                {!canVisitPage('admissions') && !canVisitPage('leaves') && !canVisitPage('complaints') && (
                  <div className="p-2 text-xs text-slate-500">All caught up!</div>
                )}
              </div>
            )}
          </div>

          {/* Active Role Pill + User Avatar Menu */}
          <div className="relative flex items-center gap-1.5">
            {user?.role && (
              <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/70 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold">
                {user.role}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setUserMenuOpen((p) => !p);
                setNotifOpen(false);
                setSyncOpen(false);
              }}
              aria-label="User profile menu"
              className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center justify-center cursor-pointer"
            >
              {user?.avatarInitial || 'Z'}
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-60 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl p-2 z-50">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      {user?.role}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{user?.email}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    setCustomizeOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/50 cursor-pointer"
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>{t(uiPrefs.language, 'customize')} Theme &amp; Language</span>
                </button>
                {canVisitPage('settings') && (
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigateTo('settings');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>School &amp; Campus Settings</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Multi-Tab Workspace Bar */}
      <div className="px-4 lg:px-6 py-1.5 bg-slate-50/70 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto">
        {openTabs.map((tab) => {
          const isActive = activePage === tab.id;
          return (
            <div
              key={tab.id}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border shrink-0 transition-colors ${
                isActive
                  ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'bg-transparent border-transparent text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60'
              }`}
            >
              <button
                type="button"
                onClick={() => navigateTo(tab.id)}
                className="inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                {tab.id === 'dashboard' && <Home className="w-3 h-3" />}
                <span>{tab.label}</span>
              </button>
              {tab.id !== 'dashboard' && (
                <button
                  type="button"
                  onClick={() => closeTab(tab.id)}
                  aria-label={`Close ${tab.label} tab`}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 ml-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        {nextQuickTab && (
          <div className="relative group ml-1">
            <button
              type="button"
              onClick={() => navigateTo(nextQuickTab)}
              aria-label="Open quick workspace tab"
              title={`Open ${PAGE_LABELS[nextQuickTab]}`}
              className="w-6 h-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Subscription Renewal Warning Banner */}
      {showRenewalBanner && (
        <div className="px-4 lg:px-6 py-2 bg-amber-50 dark:bg-amber-950/40 border-t border-amber-200/80 dark:border-amber-900/60 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Important :</strong> Your subscription is ending soon. Please renew subscription to continue using the software. ({daysLeft} days left.)
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setRenewOpen(true)}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-teal-800 hover:bg-teal-900 text-white font-semibold cursor-pointer"
            >
              <span>Click Here To Renew</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => void mutate('/api/settings', 'PATCH', { renewalBannerDismissed: true })}
              aria-label="Dismiss renewal warning"
              className="p-1 text-amber-700 dark:text-amber-300 hover:text-amber-950 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Plan Renewal Modal */}
      {renewOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Renew School ERP Subscription</h2>
              <button type="button" onClick={() => setRenewOpen(false)} aria-label="Close renewal dialog" className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {(['Advance', 'Enterprise'] as const).map((plan) => (
                <button
                  key={plan}
                  type="button"
                  onClick={() => setSelectedPlan(plan)}
                  className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                    selectedPlan === plan
                      ? 'border-teal-600 bg-teal-50/70 dark:bg-teal-950/40'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    <span>{plan}</span>
                    {selectedPlan === plan && <CheckCircle2 className="w-4 h-4 text-teal-600" />}
                  </div>
                  <div className="text-slate-500 mt-1">
                    {plan === 'Advance' ? 'Up to 3,000 students · 2 campuses' : 'Unlimited students · 10 campuses'}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setRenewOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                Cancel
              </button>
              <button type="button" onClick={() => void handleRenew()} className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer">
                Confirm 1-Year Renewal
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
