import React, { useState } from 'react';
import {
  Activity,
  Award,
  Banknote,
  BarChart3,
  BookMarked,
  BookOpen,
  Building2,
  Bus,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Cpu,
  DatabaseBackup,
  FileSpreadsheet,
  FileUp,
  Globe,
  GraduationCap,
  HeartPulse,
  History,
  Home,
  Hotel,
  IdCard,
  LayoutGrid,
  Megaphone,
  MessageSquare,
  MessageSquareWarning,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  ScanFace,
  ScrollText,
  Settings,
  ShieldCheck,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import type { AppPageId } from '../types/erp';
import { t } from '../utils/i18n';

interface NavChild {
  navKey: string;
  page: AppPageId;
  subTab?: string;
  label: string;
}

interface NavItem {
  navKey: string;
  page: AppPageId;
  subTab?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconStyle: string;
  children?: NavChild[];
}

interface NavGroup {
  section: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    section: 'OVERVIEW',
    items: [
      {
        navKey: 'dashboard',
        page: 'dashboard',
        label: 'Dashboard',
        icon: Home,
        iconStyle: 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400',
      },
      {
        navKey: 'today-activity',
        page: 'today-activity',
        label: "Today's Activity",
        icon: Activity,
        iconStyle: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
      },
    ],
  },
  {
    section: 'FRONT DESK',
    items: [
      {
        navKey: 'visitors-group',
        page: 'visitors',
        label: 'Gate & Visitors',
        icon: ShieldCheck,
        iconStyle: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
        children: [
          { navKey: 'visitors-log', page: 'visitors', label: 'Visitor Log' },
          { navKey: 'visitors-scan', page: 'card-attendance', label: 'Scan ID Cards' },
          { navKey: 'visitors-history', page: 'attendance', subTab: 'log', label: 'Student & Staff History' },
        ],
      },
      {
        navKey: 'admissions-group',
        page: 'admissions',
        label: 'Manage Admissions',
        icon: UserPlus,
        iconStyle: 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400',
        children: [
          { navKey: 'admissions-admit', page: 'students', subTab: 'admit', label: 'Admit Student' },
          { navKey: 'admissions', page: 'admissions', label: 'Admissions & Inquiries' },
        ],
      },
    ],
  },
  {
    section: 'PEOPLE',
    items: [
      {
        navKey: 'students-group',
        page: 'students',
        subTab: 'info',
        label: 'Student Management',
        icon: Users,
        iconStyle: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400',
        children: [
          { navKey: 'students-admit', page: 'students', subTab: 'admit', label: 'Admit Student' },
          { navKey: 'students-info', page: 'students', subTab: 'info', label: 'Student Information' },
          { navKey: 'students-promotion', page: 'students', subTab: 'promotion', label: 'Student Promotion' },
          { navKey: 'students-transfer', page: 'students', subTab: 'transfer', label: 'Student Transfer' },
          { navKey: 'students-birthdays', page: 'students', subTab: 'birthdays', label: 'Student Birthdays' },
          { navKey: 'students-reports', page: 'students', subTab: 'reports', label: 'Student Info Reports' },
        ],
      },
      {
        navKey: 'parents',
        page: 'parents',
        label: 'Parent Accounts',
        icon: UserCheck,
        iconStyle: 'bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400',
      },
      {
        navKey: 'staff-group',
        page: 'staff',
        label: 'Staff Management',
        icon: UserCog,
        iconStyle: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
        children: [
          { navKey: 'staff', page: 'staff', label: 'All Staff & Payroll' },
          { navKey: 'staff-today', page: 'staff-attendance', label: 'Staff Attendance Today' },
          { navKey: 'accountants', page: 'accountants', label: 'Accountants' },
        ],
      },
      {
        navKey: 'complaints',
        page: 'complaints',
        label: 'Parent Complaints',
        icon: MessageSquareWarning,
        iconStyle: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400',
      },
      {
        navKey: 'leaves',
        page: 'leaves',
        label: 'Leave Management',
        icon: CalendarCheck,
        iconStyle: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400',
      },
      {
        navKey: 'tasks',
        page: 'tasks',
        label: 'Task Management',
        icon: ClipboardCheck,
        iconStyle: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
      },
      {
        navKey: 'health',
        page: 'health',
        label: 'Student Health',
        icon: HeartPulse,
        iconStyle: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400',
      },
      {
        navKey: 'id-cards',
        page: 'id-cards',
        label: 'ID Card Printing',
        icon: IdCard,
        iconStyle: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
      },
    ],
  },
  {
    section: 'ACADEMICS',
    items: [
      {
        navKey: 'classes',
        page: 'classes',
        label: 'Classes & Sections',
        icon: LayoutGrid,
        iconStyle: 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400',
      },
      {
        navKey: 'subjects',
        page: 'subjects',
        label: 'Manage Subjects',
        icon: BookOpen,
        iconStyle: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400',
      },
      {
        navKey: 'attendance-group',
        page: 'attendance',
        label: 'Manage Attendance',
        icon: ScanFace,
        iconStyle: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
        children: [
          { navKey: 'attendance', page: 'attendance', label: 'Student Attendance' },
          { navKey: 'face-attendance', page: 'face-attendance', label: 'Face Attendance' },
          { navKey: 'card-attendance', page: 'card-attendance', label: 'Card / QR Attendance' },
          { navKey: 'staff-attendance', page: 'staff-attendance', label: 'Staff Attendance' },
          { navKey: 'attendance-reports', page: 'attendance', subTab: 'log', label: 'Attendance Reports' },
        ],
      },
      {
        navKey: 'calendar',
        page: 'calendar',
        label: 'Academic Calendar',
        icon: CalendarRange,
        iconStyle: 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400',
      },
      {
        navKey: 'timetable',
        page: 'timetable',
        label: 'Timetable Management',
        icon: CalendarClock,
        iconStyle: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400',
      },
      {
        navKey: 'homework',
        page: 'homework',
        label: 'Daily Homework Diary',
        icon: BookOpen,
        iconStyle: 'bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400',
      },
      {
        navKey: 'ptm',
        page: 'ptm',
        label: 'Parent–Teacher Meetings',
        icon: CalendarDays,
        iconStyle: 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400',
      },
    ],
  },
  {
    section: 'FINANCE',
    items: [
      {
        navKey: 'fees-group',
        page: 'fees',
        subTab: 'payment',
        label: 'Fee Management',
        icon: Receipt,
        iconStyle: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
        children: [
          { navKey: 'fees-payment', page: 'fees', subTab: 'payment', label: 'Fee Payment' },
          { navKey: 'fees-slips', page: 'fees', subTab: 'slips', label: 'Print Fee Slips' },
          { navKey: 'fees-monthly', page: 'fees', subTab: 'monthly', label: 'Generate Monthly Fee' },
          { navKey: 'fees-custom', page: 'fees', subTab: 'custom', label: 'Generate Custom Fee' },
          { navKey: 'fees-defaulters', page: 'fees', subTab: 'defaulters', label: 'Fee Defaulters' },
        ],
      },
      {
        navKey: 'accounting',
        page: 'accounting',
        label: 'Accounting & Ledger',
        icon: Banknote,
        iconStyle: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
      },
      {
        navKey: 'expenses',
        page: 'expenses',
        label: 'Expense Management',
        icon: Wallet,
        iconStyle: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400',
      },
      {
        navKey: 'reports',
        page: 'reports',
        label: 'Reporting Area',
        icon: BarChart3,
        iconStyle: 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400',
      },
      {
        navKey: 'inventory',
        page: 'inventory',
        label: 'Stock & Inventory',
        icon: Package,
        iconStyle: 'bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400',
      },
    ],
  },
  {
    section: 'EXAMS',
    items: [
      {
        navKey: 'exams-group',
        page: 'exams',
        label: 'Exam Management',
        icon: FileSpreadsheet,
        iconStyle: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400',
        children: [
          { navKey: 'exams-marks', page: 'exams', subTab: 'marks', label: 'Marks Entry' },
          { navKey: 'exams-tabulation', page: 'exams', subTab: 'tabulation', label: 'Tabulation & Marksheets' },
          { navKey: 'exams-list', page: 'exams', subTab: 'exams', label: 'Exam Schedule & List' },
          { navKey: 'exams-admit', page: 'certification', subTab: 'admit', label: 'Admit Cards / Roll Slips' },
        ],
      },
      {
        navKey: 'certification',
        page: 'certification',
        label: 'Certification & TC',
        icon: Award,
        iconStyle: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
      },
    ],
  },
  {
    section: 'COMMUNICATION',
    items: [
      {
        navKey: 'noticeboard',
        page: 'noticeboard',
        label: 'School Noticeboard',
        icon: Megaphone,
        iconStyle: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400',
      },
      {
        navKey: 'messaging',
        page: 'messaging',
        label: 'SMS & WhatsApp',
        icon: MessageSquare,
        iconStyle: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
      },
    ],
  },
  {
    section: 'CAMPUS',
    items: [
      {
        navKey: 'library',
        page: 'library',
        label: 'Library',
        icon: BookMarked,
        iconStyle: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400',
      },
      {
        navKey: 'transport',
        page: 'transport',
        label: 'Transport',
        icon: Bus,
        iconStyle: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400',
      },
      {
        navKey: 'hostel',
        page: 'hostel',
        label: 'Hostel',
        icon: Hotel,
        iconStyle: 'bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400',
      },
      {
        navKey: 'manage-campuses',
        page: 'settings',
        subTab: 'campuses',
        label: 'Manage Campuses',
        icon: Building2,
        iconStyle: 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400',
      },
      {
        navKey: 'manage-biometric',
        page: 'face-attendance',
        subTab: 'guide',
        label: 'Manage Biometric Devices',
        icon: Cpu,
        iconStyle: 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400',
      },
    ],
  },
  {
    section: 'SYSTEM',
    items: [
      {
        navKey: 'admin-roles',
        page: 'settings',
        subTab: 'rbac',
        label: 'Admin Roles Management',
        icon: ShieldCheck,
        iconStyle: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400',
      },
      {
        navKey: 'website-group',
        page: 'website',
        subTab: 'general',
        label: 'Website Management',
        icon: Globe,
        iconStyle: 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400',
        children: [
          { navKey: 'website-general', page: 'website', subTab: 'general', label: 'General Settings' },
          { navKey: 'website-gallery', page: 'website', subTab: 'gallery', label: 'Gallery Settings' },
          { navKey: 'website-classes', page: 'website', subTab: 'classes', label: 'Classes To Show' },
          { navKey: 'website-map', page: 'website', subTab: 'map', label: 'Address & Map' },
        ],
      },
      {
        navKey: 'settings-group',
        page: 'settings',
        subTab: 'profile',
        label: 'Settings',
        icon: Settings,
        iconStyle: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
        children: [
          { navKey: 'settings-general', page: 'settings', subTab: 'profile', label: 'General Settings' },
          { navKey: 'settings-automation', page: 'settings', subTab: 'automation', label: 'Automation Settings' },
          { navKey: 'settings-sms', page: 'settings', subTab: 'sms', label: 'SMS Settings' },
          { navKey: 'settings-email', page: 'settings', subTab: 'email', label: 'Email Settings' },
          { navKey: 'settings-whatsapp', page: 'settings', subTab: 'whatsapp', label: 'WhatsApp API Settings' },
          { navKey: 'settings-payments', page: 'settings', subTab: 'payments', label: 'Payment Settings' },
          { navKey: 'settings-exams', page: 'settings', subTab: 'exams', label: 'Exam Settings' },
          { navKey: 'settings-printer', page: 'settings', subTab: 'printer', label: 'Thermal Printer Settings' },
          { navKey: 'settings-biometric', page: 'settings', subTab: 'biometric', label: 'Biometric Attendance Settings' },
        ],
      },
      {
        navKey: 'system-backups',
        page: 'system-tools',
        subTab: 'backups',
        label: 'Backups',
        icon: DatabaseBackup,
        iconStyle: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
      },
      {
        navKey: 'system-import',
        page: 'system-tools',
        subTab: 'import',
        label: 'Import Data',
        icon: FileUp,
        iconStyle: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
      },
      {
        navKey: 'system-owner',
        page: 'system-tools',
        subTab: 'owner-summary',
        label: 'Owner Daily Summary',
        icon: Activity,
        iconStyle: 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400',
      },
      {
        navKey: 'system-audit',
        page: 'system-tools',
        subTab: 'audit',
        label: 'Audit Log',
        icon: ScrollText,
        iconStyle: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
      },
      {
        navKey: 'system-logins',
        page: 'system-tools',
        subTab: 'logins',
        label: 'Login Logs',
        icon: History,
        iconStyle: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
      },
    ],
  },
];

export const Sidebar: React.FC = () => {
  const {
    db,
    user,
    activePage,
    activeNavKey,
    navigateTo,
    canVisitPage,
    canPerform,
    sidebarCollapsed,
    setSidebarCollapsed,
    mobileMenuOpen,
    setMobileMenuOpen,
    uiPrefs,
  } = useErp();

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    'students-group': true,
    'attendance-group': true,
    'fees-group': true,
    'staff-group': false,
    'website-group': false,
    'settings-group': false,
  });

  const NAV_KEY_I18N: Record<string, string> = {
    dashboard: 'navDashboard',
    'today-activity': 'navTodayActivity',
    'visitors-group': 'navGateVisitors',
    'admissions-group': 'navAdmissions',
    'students-group': 'navStudents',
    parents: 'navParents',
    'staff-group': 'navStaff',
    'attendance-group': 'navAttendance',
    'fees-group': 'navFees',
    accounting: 'navAccounting',
    'exams-group': 'navExams',
    noticeboard: 'navNoticeboard',
    messaging: 'navMessaging',
    'website-group': 'navWebsite',
    'settings-group': 'navSettings',
  };

  const getLocalizedItemLabel = (navKey: string, defaultLabel: string): string => {
    const key = NAV_KEY_I18N[navKey];
    return key ? t(uiPrefs.language, key, defaultLabel) : defaultLabel;
  };

  const schoolName = db?.settings.schoolName || 'iqra school';
  const shortCode = db?.settings.shortCode || 'IS';
  const sessionName = db?.settings.sessionName || '2026-2027';

  const canManageStudents = canPerform('manage_students');
  const canEnterMarks = canPerform('enter_marks');

  const visibleGroups = NAV_GROUPS.map((group) => {
    const items = group.items
      .map((item) => {
        if (item.children && item.children.length > 0) {
          const allowedChildren = item.children.filter((c) => {
            if (!canVisitPage(c.page)) return false;
            if (
              !canManageStudents &&
              (c.navKey === 'students-admit' ||
                c.navKey === 'admissions-admit' ||
                c.navKey === 'students-promotion' ||
                c.navKey === 'students-transfer')
            ) {
              return false;
            }
            if (!canEnterMarks && c.navKey === 'exams-marks') {
              return false;
            }
            return true;
          });
          if (allowedChildren.length === 0 && !canVisitPage(item.page)) return null;
          return { ...item, children: allowedChildren };
        }
        return canVisitPage(item.page) ? item : null;
      })
      .filter((item): item is NavItem => item !== null);
    return { ...group, items };
  }).filter((g) => g.items.length > 0);

  const navBgClass = uiPrefs.navColor === 'coloured' ? 'erp-nav-coloured' : 'erp-nav-cream';

  const sidebarContent = (
    <div className={`h-full flex flex-col ${navBgClass} erp-surface border-r border-slate-200 dark:border-slate-800 select-none`}>
      {/* Brand Header */}
      <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-teal-700 text-white font-bold text-sm flex items-center justify-center shrink-0">
            {shortCode}
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900 dark:text-white truncate capitalize">
                {schoolName}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {user?.role || 'Admin'} · {sessionName}
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Sections */}
      <nav aria-label="Primary Sidebar" className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
        {visibleGroups.map((group) => (
          <div key={group.section}>
            {!sidebarCollapsed && (
              <div className="px-2.5 mb-1.5 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500">
                {group.section}
              </div>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const hasChildren = Boolean(item.children && item.children.length > 0);
                const childMatch = item.children?.some(
                  (child) => activeNavKey === child.navKey || (!activeNavKey && activePage === child.page)
                );
                const isActive = activeNavKey === item.navKey || Boolean(childMatch) || (activePage === item.page && !hasChildren);
                const isExpanded = expanded[item.navKey];

                return (
                  <li key={item.navKey}>
                    <button
                      type="button"
                      onClick={() => {
                        if (hasChildren && !sidebarCollapsed) {
                          setExpanded((prev) => ({ ...prev, [item.navKey]: !prev[item.navKey] }));
                        } else {
                          navigateTo(item.page, item.subTab, item.navKey);
                        }
                      }}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-1.5 rounded-xl text-[13px] font-medium transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isActive
                              ? 'bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300'
                              : item.iconStyle
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        {!sidebarCollapsed && (
                          <span className="truncate">{getLocalizedItemLabel(item.navKey, item.label)}</span>
                        )}
                      </span>
                      {!sidebarCollapsed && hasChildren && (
                        <span className="text-slate-400 shrink-0">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </span>
                      )}
                    </button>

                    {!sidebarCollapsed && hasChildren && isExpanded && (
                      <ul className="mt-1 ml-6 pl-3 border-l border-slate-200 dark:border-slate-700 space-y-0.5">
                        {item.children!.map((sub) => {
                          const subActive = activeNavKey === sub.navKey;
                          return (
                            <li key={sub.navKey}>
                              <button
                                type="button"
                                onClick={() => navigateTo(sub.page, sub.subTab, sub.navKey)}
                                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                                  subActive
                                    ? 'text-teal-700 dark:text-teal-300 font-semibold bg-teal-50/70 dark:bg-teal-950/40'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                              >
                                {sub.label}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {!sidebarCollapsed && (
        <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <GraduationCap className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" />
          <span className="truncate">School ERP · {db?.settings.packageName || 'Advance'}</span>
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-200 ${
          sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
      >
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-[270px] h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};
