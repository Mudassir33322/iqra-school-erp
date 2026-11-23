import React from 'react';
import { AlertTriangle, CheckCircle2, Info, RefreshCw, X } from 'lucide-react';
import { ErpProvider, useErp } from './context/ErpContext';
import { LoginView } from './components/LoginView';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { CommandPalette } from './components/CommandPalette';
import { DashboardView } from './components/DashboardView';
import { StudentsView } from './components/StudentsView';
import { AdmissionsView } from './components/AdmissionsView';
import { AcademicsView } from './components/AcademicsView';
import { AttendanceView } from './components/AttendanceView';
import { FeesAccountsView } from './components/FeesAccountsView';
import { StaffView } from './components/StaffView';
import { ExamsView } from './components/ExamsView';
import { OperationsView } from './components/OperationsView';
import { SettingsView } from './components/SettingsView';
import { ExtendedModulesView } from './components/ExtendedModulesView';
import { RolePortalView } from './components/RolePortalView';
import { CustomizeDrawer } from './components/CustomizeDrawer';
import { WebsiteAndSystemView } from './components/WebsiteAndSystemView';
import { t } from './utils/i18n';

const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useErp();
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:w-96 z-50 flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold ${
            t.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200'
              : t.type === 'info'
                ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-200'
                : 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'
          }`}
        >
          <span className="flex items-center gap-2">
            {t.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            ) : t.type === 'info' ? (
              <Info className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{t.text}</span>
          </span>
          <button
            type="button"
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss notification"
            className="opacity-70 hover:opacity-100 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};

const ErpWorkspace: React.FC = () => {
  const { user, db, loading, error, refreshState, activePage, canVisitPage, uiPrefs } = useErp();

  const bgClass = `erp-bg-${uiPrefs.backgroundStyle || 'soft'}`;

  if (!user) {
    return (
      <>
        <LoginView />
        <ToastContainer />
      </>
    );
  }

  if (loading && !db) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bgClass} p-6`}>
        <div className="w-full max-w-sm rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl p-7 text-center space-y-5 erp-surface">
          <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-full border-[3px] border-slate-200 dark:border-slate-700 border-t-teal-700 animate-erp-orbit"
              style={{ borderTopColor: 'var(--accent)' }}
            />
            <div className="w-11 h-11 rounded-xl bg-teal-700 text-white font-bold text-base flex items-center justify-center shadow-sm">
              IS
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {t(uiPrefs.language, 'loadingWorkspace')}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t(uiPrefs.language, 'loadingSyncing')}
            </p>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full w-1/2 rounded-full bg-teal-700 animate-erp-progress"
              style={{ backgroundColor: 'var(--accent)' }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1 opacity-70">
            <div className="h-8 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
            <div className="h-8 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
            <div className="h-8 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !db) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="max-w-sm w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Connection Error</h2>
          <p className="text-xs text-slate-500">{error}</p>
          <button
            type="button"
            onClick={() => void refreshState()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  const isRolePortal =
    user.role === 'Parent' || user.role === 'Student' || user.role === 'Teacher';

  const renderPage = () => {
    const targetPage = canVisitPage(activePage) ? activePage : 'dashboard';
    switch (targetPage) {
      case 'dashboard':
        return isRolePortal ? <RolePortalView /> : <DashboardView />;
      case 'students':
        return <StudentsView initialMode="students" />;
      case 'parents':
        return <StudentsView initialMode="parents" />;
      case 'admissions':
        return <AdmissionsView />;
      case 'classes':
        return <AcademicsView mode="classes" />;
      case 'subjects':
        return <AcademicsView mode="subjects" />;
      case 'attendance':
        return <AttendanceView mode="student" />;
      case 'face-attendance':
        return <AttendanceView mode="face" />;
      case 'card-attendance':
        return <AttendanceView mode="card" />;
      case 'staff-attendance':
        return <AttendanceView mode="staff" />;
      case 'fees':
        return <FeesAccountsView mode="fees" />;
      case 'accounting':
        return <FeesAccountsView mode="accounting" initialLedgerFilter="all" />;
      case 'expenses':
        return <FeesAccountsView mode="accounting" initialLedgerFilter="expense" />;
      case 'staff':
        return <StaffView initialRoleFilter="all" />;
      case 'accountants':
        return <StaffView initialRoleFilter="Accountant" />;
      case 'exams':
        return <ExamsView />;
      case 'today-activity':
      case 'visitors':
      case 'complaints':
      case 'leaves':
      case 'tasks':
      case 'noticeboard':
      case 'id-cards':
        return <OperationsView page={targetPage} />;
      case 'timetable':
      case 'homework':
      case 'health':
      case 'inventory':
      case 'library':
      case 'transport':
      case 'hostel':
      case 'messaging':
      case 'ptm':
      case 'certification':
      case 'calendar':
      case 'reports':
        return <ExtendedModulesView page={targetPage} />;
      case 'website':
        return <WebsiteAndSystemView mode="website" />;
      case 'system-tools':
        return <WebsiteAndSystemView mode="system-tools" />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className={`min-h-screen flex ${bgClass} text-slate-900 dark:text-slate-100`}>
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar />
        <main className="erp-main flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">{renderPage()}</main>
        <footer className="px-6 py-4 text-center text-xs text-slate-400 dark:text-slate-500 border-t border-slate-200/70 dark:border-slate-800/70 no-print">
          © 2026 · {db?.settings.schoolName || 'iqra school'} · School ERP Management Suite
        </footer>
      </div>
      <CommandPalette />
      <CustomizeDrawer />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <ErpProvider>
      <ErpWorkspace />
    </ErpProvider>
  );
}
