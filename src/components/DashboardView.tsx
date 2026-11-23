import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Award,
  BarChart3,
  BookOpen,
  Cake,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardList,
  CreditCard,
  Eye,
  EyeOff,
  FileSpreadsheet,
  GraduationCap,
  IdCard,
  Megaphone,
  Printer,
  QrCode,
  Receipt,
  Scale,
  ScanFace,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import type { DashboardPeriod } from '../types/erp';
import { computeDashboardSummary, formatCurrency } from '../utils/erpLogic';
import { t } from '../utils/i18n';

const DonutRing: React.FC<{
  percent: number;
  centerTop: string;
  centerBottom: string;
  strokeColor: string;
}> = ({ percent, centerTop, centerBottom, strokeColor }) => {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96" aria-hidden="true">
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-slate-100 dark:text-slate-800"
          strokeWidth="10"
        />
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-white leading-tight">
          {centerTop}
        </span>
        <span className="text-[10px] text-slate-500 dark:text-slate-400">{centerBottom}</span>
      </div>
    </div>
  );
};

export const DashboardView: React.FC = () => {
  const {
    db,
    user,
    today,
    activeCampusId,
    navigateTo,
    canVisitPage,
    canPerform,
    showAmounts,
    toggleShowAmounts,
    mutate,
    uiPrefs,
  } = useErp();

  const [period, setPeriod] = useState<DashboardPeriod>('month');
  const [periodMode, setPeriodMode] = useState<DashboardPeriod | 'custom'>('month');
  const [customFrom, setCustomFrom] = useState(`${today.slice(0, 7)}-01`);
  const [customTo, setCustomTo] = useState(today);
  const [incomeTab, setIncomeTab] = useState<'today' | 'month' | 'session'>('today');
  const [chartMode, setChartMode] = useState<'yearly' | 'weekly'>('yearly');
  const [classesView, setClassesView] = useState<'cards' | 'table'>('cards');
  const [dailySummaryOpen, setDailySummaryOpen] = useState(false);
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState<number | null>(null);
  const quickActionsRef = useRef<HTMLDivElement | null>(null);

  const effectivePeriod: DashboardPeriod = periodMode === 'custom' ? 'custom' : period;
  const summary = useMemo(() => {
    if (!db) return null;
    return computeDashboardSummary(
      db,
      activeCampusId,
      today,
      effectivePeriod,
      periodMode === 'custom' ? { from: customFrom, to: customTo } : undefined
    );
  }, [db, activeCampusId, today, effectivePeriod, periodMode, customFrom, customTo]);

  const incomeBoxSummary = useMemo(() => {
    if (!db) return { income: 0, expense: 0, profit: 0 };
    const s = computeDashboardSummary(db, activeCampusId, today, incomeTab);
    return { income: s.incomePeriod, expense: s.expensePeriod, profit: s.profitPeriod };
  }, [db, activeCampusId, today, incomeTab]);

  if (!db || !summary) return null;

  const currency = db.settings.currency || 'Rs';
  const campusName =
    activeCampusId === 'all'
      ? 'All Campuses'
      : db.campuses.find((c) => c.id === activeCampusId)?.name ?? 'Main Campus';

  const setupSteps = [
    { label: 'School details & settings', done: Boolean(db.settings.schoolName), page: 'settings' as const },
    { label: 'Add classes and sections', done: db.classes.length > 0, page: 'classes' as const },
    { label: 'Add subjects', done: db.subjects.length > 0, page: 'subjects' as const },
    { label: 'Add a teacher', done: db.staff.length > 0, page: 'staff' as const },
    { label: 'Add a parent', done: summary.registeredParents > 0, page: 'parents' as const },
    { label: 'Admit a student', done: db.students.length > 0, page: 'students' as const },
    { label: 'Set up fee types', done: db.vouchers.length > 0, page: 'fees' as const },
    {
      label: 'Add accountants and admins',
      done: db.staff.some((s) => s.role === 'Accountant' || s.role === 'Admin'),
      page: 'accountants' as const,
    },
  ];
  const doneSteps = setupSteps.filter((s) => s.done).length;

  const formattedDate = new Date(`${today}T00:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });

  const maxChartVal = Math.max(
    1,
    ...summary.monthlyChart.flatMap((m) => [m.income, m.expense])
  );
  const maxInvoiceCount = Math.max(
    1,
    ...summary.monthlyChart.map((m) => m.paidVouchers + m.unpaidVouchers)
  );

  const visibleLedgerChart =
    chartMode === 'yearly' ? summary.monthlyChart : summary.monthlyChart.slice(-6);

  const campusFilteredInquiries = db.inquiries.filter(
    (i) => (activeCampusId === 'all' || i.campusId === activeCampusId) && i.status === 'new'
  );
  const campusFilteredLeaves = db.leaves.filter(
    (l) => (activeCampusId === 'all' || l.campusId === activeCampusId) && l.status === 'pending'
  );
  const campusFilteredComplaints = db.complaints.filter(
    (c) => (activeCampusId === 'all' || c.campusId === activeCampusId) && c.status !== 'resolved'
  );
  const campusFilteredTasks = db.tasks.filter(
    (t) => activeCampusId === 'all' || t.campusId === activeCampusId
  );
  const latestStudents = db.students
    .filter((s) => (activeCampusId === 'all' || s.campusId === activeCampusId) && s.status === 'active')
    .slice(0, 4);

  const campusAllStudents = db.students.filter(
    (s) => activeCampusId === 'all' || s.campusId === activeCampusId
  );
  const campusActiveStudents = campusAllStudents.filter((s) => s.status === 'active');
  const admissionsTodayCount = campusActiveStudents.filter((s) => s.admissionDate === today).length;
  const currentYearPrefix = today.slice(0, 4);
  const admissionsYearCount = campusActiveStudents.filter(
    (s) => s.admissionDate.slice(0, 4) === currentYearPrefix
  ).length;
  const admissionsSeries = summary.monthlyChart.slice(-6).map((m) => ({
    label: m.label.split(' ')[0] || m.label,
    monthKey: m.monthKey,
    admissions: campusAllStudents.filter(
      (s) => s.status !== 'withdrawn' && s.admissionDate.slice(0, 7) === m.monthKey
    ).length,
    withdrawn: campusAllStudents.filter(
      (s) => s.status === 'withdrawn' && s.admissionDate.slice(0, 7) === m.monthKey
    ).length,
  }));
  const maxAdmissionsBar = Math.max(
    1,
    ...admissionsSeries.flatMap((m) => [m.admissions, m.withdrawn])
  );

  const todayStaffAttendance = db.attendance.filter(
    (a) =>
      a.date === today &&
      a.targetType === 'staff' &&
      (activeCampusId === 'all' || a.campusId === activeCampusId)
  );
  const staffMarkedToday = todayStaffAttendance.length;
  const staffLeaveToday = todayStaffAttendance.filter((a) => a.status === 'leave').length;

  const campusAllInquiries = db.inquiries.filter(
    (i) => activeCampusId === 'all' || i.campusId === activeCampusId
  );
  const funnelTotal = campusAllInquiries.length;
  const funnelContacted = campusAllInquiries.filter((i) => i.status === 'contacted').length;
  const funnelApproved = campusAllInquiries.filter((i) => i.status === 'approved').length;
  const funnelRejected = campusAllInquiries.filter((i) => i.status === 'rejected').length;

  const todayMs = Date.parse(`${today}T00:00:00Z`);
  const unpaidAging = {
    d0_30: { count: 0, amount: 0 },
    d31_60: { count: 0, amount: 0 },
    d61_plus: { count: 0, amount: 0 },
  };
  for (const v of db.vouchers) {
    if (v.status === 'paid') continue;
    if (activeCampusId !== 'all' && v.campusId !== activeCampusId) continue;
    const dueMs = Date.parse(`${v.dueDate}T00:00:00Z`);
    const daysOld = Number.isFinite(dueMs) ? Math.max(0, Math.floor((todayMs - dueMs) / 86400000)) : 0;
    const unpaidAmt = Math.max(0, v.totalAmount - v.paidAmount);
    if (daysOld <= 30) {
      unpaidAging.d0_30.count += 1;
      unpaidAging.d0_30.amount += unpaidAmt;
    } else if (daysOld <= 60) {
      unpaidAging.d31_60.count += 1;
      unpaidAging.d31_60.amount += unpaidAmt;
    } else {
      unpaidAging.d61_plus.count += 1;
      unpaidAging.d61_plus.amount += unpaidAmt;
    }
  }

  const campusParentsList = db.parents.filter(
    (p) => activeCampusId === 'all' || p.campusId === activeCampusId
  );
  const parentIdSet = new Set(campusParentsList.map((p) => p.id));
  const childrenPerParent = new Map<string, number>();
  let unlinkedStudentsCount = 0;
  for (const stu of campusActiveStudents) {
    if (stu.parentId && parentIdSet.has(stu.parentId)) {
      childrenPerParent.set(stu.parentId, (childrenPerParent.get(stu.parentId) ?? 0) + 1);
    } else {
      unlinkedStudentsCount += 1;
    }
  }
  const linkedFamiliesCount = Array.from(childrenPerParent.values()).filter((cnt) => cnt >= 1).length;
  const multiChildFamiliesCount = Array.from(childrenPerParent.values()).filter((cnt) => cnt >= 2).length;

  const taskCounts = {
    pending: campusFilteredTasks.filter((t) => t.status === 'pending').length,
    processing: campusFilteredTasks.filter((t) => t.status === 'processing').length,
    completed: campusFilteredTasks.filter((t) => t.status === 'completed').length,
    returned: campusFilteredTasks.filter((t) => t.status === 'returned').length,
  };

  // 3+ month defaulters
  const unpaidByStudent = new Map<string, number>();
  for (const v of db.vouchers) {
    if (v.status !== 'paid' && (activeCampusId === 'all' || v.campusId === activeCampusId)) {
      unpaidByStudent.set(v.studentId, (unpaidByStudent.get(v.studentId) ?? 0) + 1);
    }
  }
  const longDefaultersCount = Array.from(unpaidByStudent.values()).filter((cnt) => cnt >= 3).length;
  const behindSyllabusCount = db.subjects.filter(
    (s) => (activeCampusId === 'all' || s.campusId === activeCampusId) && s.syllabusProgress < 75
  ).length;

  const priorityItems = [
    {
      title: 'Fees unpaid for 3+ months',
      owner: 'Accounts',
      due: 'This week',
      count: longDefaultersCount,
      page: 'fees' as const,
    },
    {
      title: 'Attendance not marked',
      owner: 'Class teachers',
      due: 'Today',
      count: summary.classesNotMarkedCount,
      page: 'attendance' as const,
    },
    {
      title: 'Staff attendance not marked',
      owner: 'Front desk',
      due: 'Today',
      count: summary.staffNotMarkedCount,
      page: 'staff-attendance' as const,
    },
    {
      title: 'Students at academic risk',
      owner: 'Coordinators',
      due: 'This week',
      count: summary.studentsAtRiskCount,
      page: 'exams' as const,
    },
    {
      title: 'Sections behind syllabus plan',
      owner: 'Coordinators',
      due: 'Before exams',
      count: behindSyllabusCount,
      page: 'subjects' as const,
    },
    {
      title: 'Parent complaints',
      owner: 'Principal',
      due: 'Within 3 days',
      count: campusFilteredComplaints.length,
      page: 'complaints' as const,
    },
    {
      title: 'Admission inquiries to follow up',
      owner: 'Admissions desk',
      due: 'Today',
      count: campusFilteredInquiries.length,
      page: 'admissions' as const,
    },
    {
      title: 'Leave requests',
      owner: 'You',
      due: 'Today',
      count: campusFilteredLeaves.length,
      page: 'leaves' as const,
    },
    {
      title: 'Pending tasks',
      owner: 'Assigned staff',
      due: 'As set',
      count: taskCounts.pending,
      page: 'tasks' as const,
    },
  ].filter((item) => canVisitPage(item.page));

  const quickActions = (
    [
      { label: 'Admit Student', icon: UserPlus, color: 'bg-teal-700 text-white', page: 'students', subTab: 'admit', navKey: 'students-admit', requiresManageStudents: true },
      { label: 'Student Information', icon: Users, color: 'bg-rose-700 text-white', page: 'students', subTab: 'info', navKey: 'students-info' },
      { label: 'Student Attendance', icon: UserCheck, color: 'bg-emerald-700 text-white', page: 'attendance', navKey: 'attendance' },
      { label: 'Face Attendance', icon: ScanFace, color: 'bg-cyan-700 text-white', page: 'face-attendance', navKey: 'face-attendance' },
      { label: 'Card Attendance', icon: QrCode, color: 'bg-violet-700 text-white', page: 'card-attendance', navKey: 'card-attendance' },
      { label: 'Staff Attendance', icon: ClipboardList, color: 'bg-blue-700 text-white', page: 'staff-attendance', navKey: 'staff-attendance' },
      { label: 'Fee Payment', icon: CreditCard, color: 'bg-amber-700 text-white', page: 'fees', subTab: 'payment', navKey: 'fees-payment' },
      { label: 'Generate Monthly Fee', icon: Receipt, color: 'bg-indigo-700 text-white', page: 'fees', subTab: 'monthly', navKey: 'fees-monthly' },
      { label: 'Print Fee Slips', icon: Printer, color: 'bg-slate-800 text-white', page: 'fees', subTab: 'slips', navKey: 'fees-slips' },
      { label: 'Record Expense', icon: Wallet, color: 'bg-rose-800 text-white', page: 'expenses', navKey: 'expenses' },
      { label: 'ID Card Printing', icon: IdCard, color: 'bg-sky-700 text-white', page: 'id-cards', navKey: 'id-cards' },
      { label: 'Certification & TC', icon: Award, color: 'bg-amber-600 text-white', page: 'certification', navKey: 'certification' },
      { label: 'Exams & Results', icon: FileSpreadsheet, color: 'bg-indigo-800 text-white', page: 'exams', navKey: 'exams' },
      { label: 'Reporting Area', icon: BarChart3, color: 'bg-teal-800 text-white', page: 'reports', navKey: 'reports' },
      { label: 'Noticeboard', icon: Megaphone, color: 'bg-rose-600 text-white', page: 'noticeboard', navKey: 'noticeboard' },
    ] as Array<{
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      color: string;
      page: Parameters<typeof navigateTo>[0];
      subTab?: string;
      navKey?: string;
      requiresManageStudents?: boolean;
    }>
  ).filter(
    (qa) => canVisitPage(qa.page) && (!qa.requiresManageStudents || canPerform('manage_students'))
  );

  return (
    <div className="space-y-6">
      {/* School Setup Checklist */}
      {!db.settings.checklistDismissed && (
        <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t(uiPrefs.language, 'setupTitle')}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {doneSteps} of {setupSteps.length} done · {t(uiPrefs.language, 'setupSub')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canVisitPage('classes') && (
                <button
                  type="button"
                  onClick={() => navigateTo('classes')}
                  className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Manage classes &amp; sections →
                </button>
              )}
              {canPerform('manage_settings') && (
                <button
                  type="button"
                  onClick={() => void mutate('/api/settings', 'PATCH', { checklistDismissed: true })}
                  aria-label="Dismiss setup checklist"
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-teal-700 rounded-full transition-all"
              style={{ width: `${(doneSteps / setupSteps.length) * 100}%` }}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {setupSteps.map((step) => (
              <button
                key={step.label}
                type="button"
                onClick={() => navigateTo(step.page)}
                className="flex items-center gap-2 text-left text-xs py-1 px-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {step.done ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                )}
                <span
                  className={
                    step.done
                      ? 'text-slate-700 dark:text-slate-300 font-medium'
                      : 'text-slate-800 dark:text-slate-100 font-semibold'
                  }
                >
                  {step.label}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Teal / Accent Hero Greeting Banner */}
      <section
        style={{
          backgroundImage:
            uiPrefs.accentColor && uiPrefs.accentColor.toLowerCase() !== '#0f766e'
              ? `linear-gradient(120deg, var(--accent-hover), var(--accent))`
              : undefined,
        }}
        className="rounded-2xl bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-800 text-white p-6 shadow-sm"
      >
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-teal-100/90 font-medium">
              <span>
                {formattedDate} · Session {db.settings.sessionName} · {campusName}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-400/20 border border-amber-300/30 text-amber-200 text-[10px] font-bold tracking-wider uppercase tabular-nums">
                DAYS LEFT: {db.settings.daysLeft ?? 3}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
              {(() => {
                const hr = new Date().getHours();
                const gKey = hr < 12 ? 'greetingMorning' : hr < 17 ? 'greetingAfternoon' : 'greetingEvening';
                return `${t(uiPrefs.language, gKey)}, ${user?.name || 'Zain'}`;
              })()}
            </h1>
            <p className="text-sm text-teal-100/90 mt-1">
              {t(uiPrefs.language, 'dashboardLead')}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="inline-flex flex-wrap items-center gap-0.5 p-1 rounded-xl bg-black/20 max-w-full">
                {(['today', 'week', 'month', 'session'] as DashboardPeriod[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setPeriod(p);
                      setPeriodMode(p);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      periodMode === p
                        ? 'bg-white text-teal-900 shadow-xs'
                        : 'text-teal-100 hover:text-white'
                    }`}
                  >
                    {t(uiPrefs.language, p)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setPeriod('session');
                    setPeriodMode('custom');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    periodMode === 'custom'
                      ? 'bg-white text-teal-900 shadow-xs'
                      : 'text-teal-100 hover:text-white'
                  }`}
                >
                  {t(uiPrefs.language, 'custom')}
                </button>
              </div>
              {periodMode === 'custom' && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/20 text-[11px]">
                  <input
                    type="date"
                    aria-label="Custom range start"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="bg-transparent text-white font-mono outline-none"
                  />
                  <span>–</span>
                  <input
                    type="date"
                    aria-label="Custom range end"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="bg-transparent text-white font-mono outline-none"
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => setDailySummaryOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white text-teal-900 hover:bg-teal-50 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Daily summary</span>
              </button>
            </div>
          </div>

          {/* Right 2x3 Subscription & Limit Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 xl:w-[460px] shrink-0">
            <div className="rounded-xl bg-white/10 border border-white/15 px-3.5 py-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-teal-100/80">
                Package
              </div>
              <div className="text-sm font-bold mt-0.5">{db.settings.packageName}</div>
            </div>
            <div className="rounded-xl bg-white/10 border border-white/15 px-3.5 py-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-teal-100/80 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Days Left</span>
              </div>
              <div className="text-sm font-bold mt-0.5 tabular-nums text-amber-200">
                {db.settings.daysLeft ?? 3} days
              </div>
            </div>
            <div className="rounded-xl bg-white/10 border border-white/15 px-3.5 py-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-teal-100/80">
                Student Limit
              </div>
              <div className="text-sm font-bold mt-0.5 tabular-nums">
                {summary.activeStudents}/{db.settings.studentLimit}
              </div>
            </div>
            <div className="rounded-xl bg-white/10 border border-white/15 px-3.5 py-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-teal-100/80">
                Users Limit
              </div>
              <div className="text-sm font-bold mt-0.5">Unlimited</div>
            </div>
            <div className="rounded-xl bg-white/10 border border-white/15 px-3.5 py-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-teal-100/80">
                WhatsApp Left
              </div>
              <div className="text-sm font-bold mt-0.5 tabular-nums">
                {db.settings.whatsappLeft.toLocaleString()}
              </div>
            </div>
            <div className="rounded-xl bg-white/10 border border-white/15 px-3.5 py-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-teal-100/80">
                Max Campuses
              </div>
              <div className="text-sm font-bold mt-0.5 tabular-nums">
                {db.campuses.length}/{db.settings.maxCampuses}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Action Bar */}
      <section aria-label="Quick Actions" className="relative flex items-center gap-2">
        <button
          type="button"
          onClick={() => quickActionsRef.current?.scrollBy({ left: -260, behavior: 'smooth' })}
          aria-label="Scroll quick actions left"
          className="hidden md:flex w-8 h-8 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white items-center justify-center shrink-0 shadow-2xs cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div
          ref={quickActionsRef}
          className="flex items-center gap-2 overflow-x-auto pb-1 flex-1 scroll-smooth"
        >
          {quickActions.map((qa) => {
            const Icon = qa.icon;
            return (
              <button
                key={qa.label}
                type="button"
                onClick={() => navigateTo(qa.page, qa.subTab, qa.navKey)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500 dark:hover:border-teal-500 text-xs font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${qa.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span>{qa.label}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => quickActionsRef.current?.scrollBy({ left: 260, behavior: 'smooth' })}
          aria-label="Scroll quick actions right"
          className="hidden md:flex w-8 h-8 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white items-center justify-center shrink-0 shadow-2xs cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </section>

      {/* Income and Expenses Gradient Row */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
            Income and Expenses
          </h2>
          <button
            type="button"
            onClick={toggleShowAmounts}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            {showAmounts ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showAmounts ? 'Hide amounts' : 'Show amounts'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5">
            <div className="pointer-events-none absolute -right-5 -bottom-5 w-24 h-24 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -right-1 -top-7 w-16 h-16 rounded-full bg-white/10" />
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mb-3 relative z-10">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums relative z-10">
              {formatCurrency(summary.incomeToday, currency, !showAmounts)}
            </div>
            <div className="text-sm font-semibold mt-1 relative z-10">Income today</div>
            <div className="text-xs text-emerald-100 mt-0.5 tabular-nums relative z-10">
              {periodMode === 'custom' ? `Range (${customFrom}–${customTo})` : `This ${period}`}:{' '}
              {formatCurrency(summary.incomePeriod, currency, !showAmounts)}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-600 to-red-700 text-white p-5">
            <div className="pointer-events-none absolute -right-5 -bottom-5 w-24 h-24 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -right-1 -top-7 w-16 h-16 rounded-full bg-white/10" />
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mb-3 relative z-10">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums relative z-10">
              {formatCurrency(summary.expenseToday, currency, !showAmounts)}
            </div>
            <div className="text-sm font-semibold mt-1 relative z-10">Expense today</div>
            <div className="text-xs text-rose-100 mt-0.5 tabular-nums relative z-10">
              {periodMode === 'custom' ? `Range (${customFrom}–${customTo})` : `This ${period}`}:{' '}
              {formatCurrency(summary.expensePeriod, currency, !showAmounts)}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5">
            <div className="pointer-events-none absolute -right-5 -bottom-5 w-24 h-24 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -right-1 -top-7 w-16 h-16 rounded-full bg-white/10" />
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mb-3 relative z-10">
              <Wallet className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums relative z-10">
              {formatCurrency(summary.balanceToday, currency, !showAmounts)}
            </div>
            <div className="text-sm font-semibold mt-1 relative z-10">Balance today</div>
            <div className="text-xs text-blue-100 mt-0.5 relative z-10">Net daily cashflow · {campusName}</div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white p-5">
            <div className="pointer-events-none absolute -right-5 -bottom-5 w-24 h-24 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -right-1 -top-7 w-16 h-16 rounded-full bg-white/10" />
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mb-3 relative z-10">
              <Scale className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums relative z-10">
              {formatCurrency(summary.balanceThisMonth, currency, !showAmounts)}
            </div>
            <div className="text-sm font-semibold mt-1 relative z-10">Balance this month</div>
            <div className="text-xs text-indigo-100 mt-0.5 relative z-10">Current billing cycle</div>
          </div>
        </div>

        {/* 4 White KPI Strip Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => navigateTo('attendance')}
            className="text-left rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3.5 hover:border-blue-400 transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Students present today</div>
              <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">
                {summary.studentsPresentToday}/{summary.activeStudents}
              </div>
              <div className="text-[11px] text-slate-400 tabular-nums">
                {summary.studentAttendancePercent}% attendance rate
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigateTo('staff-attendance')}
            className="text-left rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3.5 hover:border-emerald-400 transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Staff in today</div>
              <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">
                {summary.staffPresentToday}/{summary.activeStaff}
              </div>
              <div className="text-[11px] text-slate-400 tabular-nums">
                {summary.staffLateToday} late · {summary.staffAbsentToday} absent
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigateTo('fees')}
            className="text-left rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3.5 hover:border-teal-400 transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Collected today</div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {formatCurrency(summary.collectedToday, currency, !showAmounts)}
              </div>
              <div className="text-[11px] text-slate-400">Fee vouchers &amp; receipts</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigateTo('fees')}
            className="text-left rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3.5 hover:border-rose-400 transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Unpaid Fees</div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {formatCurrency(summary.unpaidFeesTotal, currency, !showAmounts)}
              </div>
              <div className="text-[11px] text-slate-400 tabular-nums">
                {summary.unpaidVoucherCount} invoices · {summary.unpaidStudentCount} students
              </div>
            </div>
          </button>
        </div>

        {/* Income and Expenses Toggle Bar Card */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Income and expenses
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Fees and other income, against your expenses
              </p>
            </div>
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
              {(
                [
                  { id: 'today', label: 'Today' },
                  { id: 'month', label: 'This month' },
                  { id: 'session', label: 'This year' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setIncomeTab(tab.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    incomeTab === tab.id
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
            <div>
              <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Income</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                {formatCurrency(incomeBoxSummary.income, currency, !showAmounts)}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-rose-700 dark:text-rose-400">Expense</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                {formatCurrency(incomeBoxSummary.expense, currency, !showAmounts)}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-teal-700 dark:text-teal-400">Net Profit</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                {formatCurrency(incomeBoxSummary.profit, currency, !showAmounts)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* People Summary 4-Card Row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => navigateTo('students')}
          className="text-left rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/60 p-5 hover:border-emerald-400 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <Users className="w-4 h-4" />
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-4">
            Active Students
          </div>
          <div className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400 mt-0.5">
            {summary.activeStudents}
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-emerald-200/60 dark:bg-emerald-900/50 overflow-hidden flex">
            <div
              className="bg-blue-600 h-full"
              style={{
                width: `${summary.activeStudents ? (summary.boysCount / summary.activeStudents) * 100 : 50}%`,
              }}
            />
            <div
              className="bg-rose-500 h-full"
              style={{
                width: `${summary.activeStudents ? (summary.girlsCount / summary.activeStudents) * 100 : 50}%`,
              }}
            />
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 tabular-nums">
            Boys {summary.boysCount} · Girls {summary.girlsCount}
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('attendance')}
          className="text-left rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/70 dark:border-sky-900/60 p-5 hover:border-sky-400 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-4">
            Present Students Today
          </div>
          <div className="text-2xl font-bold tabular-nums text-blue-700 dark:text-blue-400 mt-0.5">
            {summary.studentsPresentToday}
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-sky-200/70 dark:bg-sky-900/50 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full"
              style={{ width: `${summary.studentAttendancePercent}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 tabular-nums">
            {summary.studentAttendancePercent}% of active students
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('parents')}
          className="text-left rounded-2xl bg-violet-50/70 dark:bg-violet-950/30 border border-violet-200/70 dark:border-violet-900/60 p-5 hover:border-violet-400 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <Users className="w-4 h-4" />
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-4">Parents</div>
          <div className="text-2xl font-bold tabular-nums text-indigo-700 dark:text-indigo-400 mt-0.5">
            {summary.registeredParents}
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-violet-200/70 dark:bg-violet-900/50 overflow-hidden">
            <div className="bg-indigo-600 h-full w-4/5 rounded-full" />
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 tabular-nums">
            Registered families · {summary.withdrawnCount} withdrawn
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('staff')}
          className="text-left rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/60 p-5 hover:border-amber-400 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-4">Staff</div>
          <div className="text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-400 mt-0.5">
            {summary.activeStaff}
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-amber-200/70 dark:bg-amber-900/50 overflow-hidden flex">
            <div
              className="bg-amber-600 h-full"
              style={{
                width: `${summary.activeStaff ? (summary.maleStaff / summary.activeStaff) * 100 : 50}%`,
              }}
            />
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 tabular-nums">
            Male {summary.maleStaff} · Female {summary.femaleStaff}
          </div>
        </button>
      </section>

      {/* Donut Rings & Attendance Status Row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Student strength</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {summary.activeStudents} active students now
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              THIS MONTH
            </span>
          </div>

          <div className="my-4 flex items-center gap-6">
            <DonutRing
              percent={summary.activeStudents > 0 ? 85 : 0}
              centerTop={`+${summary.newAdmissionsThisMonth - summary.withdrawnCount}`}
              centerBottom="net change"
              strokeColor="#0f766e"
            />
            <div className="flex-1 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">New admissions</span>
                <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {summary.newAdmissionsThisMonth}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">Withdrawn</span>
                <span className="font-bold tabular-nums text-rose-600 dark:text-rose-400">
                  {summary.withdrawnCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">Deactivated</span>
                <span className="font-bold tabular-nums text-slate-700 dark:text-slate-200">
                  {summary.deactivatedCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Fee recovery</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Of the fees generated this month
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              THIS MONTH
            </span>
          </div>

          <div className="my-4 flex items-center gap-6">
            <DonutRing
              percent={summary.feeRecoveryPercent}
              centerTop={`${summary.feeRecoveryPercent}%`}
              centerBottom="recovered"
              strokeColor="#16a34a"
            />
            <div className="flex-1 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">Recovered</span>
                <span className="font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(summary.thisMonthCollected, currency, !showAmounts)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">Still due</span>
                <span className="font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
                  {formatCurrency(
                    Math.max(0, summary.thisMonthBilled - summary.thisMonthCollected),
                    currency,
                    !showAmounts
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-300 font-medium">Total receivable</span>
                <span className="font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  {formatCurrency(summary.unpaidFeesTotal, currency, !showAmounts)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/60 p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Attendance not marked
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Classes &amp; staff pending attendance today
              </p>
            </div>
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
              TODAY
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 my-4">
            <button
              type="button"
              onClick={() => navigateTo('attendance')}
              className="text-left rounded-xl bg-white dark:bg-slate-900 border border-amber-200/70 dark:border-slate-800 p-3 hover:border-amber-500 transition-colors cursor-pointer"
            >
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Classes not marked</div>
              <div className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">
                {summary.classesNotMarkedCount}
              </div>
              <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium mt-0.5">
                Mark attendance →
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigateTo('staff-attendance')}
              className="text-left rounded-xl bg-white dark:bg-slate-900 border border-amber-200/70 dark:border-slate-800 p-3 hover:border-amber-500 transition-colors cursor-pointer"
            >
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Staff not marked</div>
              <div className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">
                {summary.staffNotMarkedCount}
              </div>
              <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium mt-0.5">
                of {summary.activeStaff} staff →
              </div>
            </button>
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
            Present {summary.studentsPresentToday} · Absent {summary.studentsAbsentToday} · Leave{' '}
            {summary.studentsLeaveToday}
          </div>
        </div>
      </section>

      {/* Interactive Financial Charts Row */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* 12-Month Income & Expense Chart */}
        <div className="xl:col-span-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-700 to-teal-700 text-white px-5 py-3.5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold">Income &amp; Expense Overview</h3>
              <p className="text-xs text-emerald-100">
                {chartMode === 'yearly' ? 'Last 12 months cashflow' : 'Last 6 months detail'}
              </p>
            </div>
            <div className="inline-flex items-center p-0.5 rounded-lg bg-black/20">
              <button
                type="button"
                onClick={() => setChartMode('yearly')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                  chartMode === 'yearly' ? 'bg-white text-emerald-900' : 'text-emerald-100'
                }`}
              >
                12 Months
              </button>
              <button
                type="button"
                onClick={() => setChartMode('weekly')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                  chartMode === 'weekly' ? 'bg-white text-emerald-900' : 'text-emerald-100'
                }`}
              >
                6 Months
              </button>
            </div>
          </div>

          <div className="p-5">
            <div className="flex items-center justify-between mb-4 text-xs">
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600" />
                  Income
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" />
                  Expense
                </span>
              </div>
              {hoveredMonthIdx !== null && visibleLedgerChart[hoveredMonthIdx] && (
                <div className="text-xs font-mono tabular-nums text-slate-700 dark:text-slate-200">
                  {visibleLedgerChart[hoveredMonthIdx].label}: +
                  {formatCurrency(visibleLedgerChart[hoveredMonthIdx].income, currency, !showAmounts)} / -
                  {formatCurrency(visibleLedgerChart[hoveredMonthIdx].expense, currency, !showAmounts)}
                </div>
              )}
            </div>

            <div className="h-52 flex items-end gap-2 sm:gap-3 pt-4 border-b border-slate-200 dark:border-slate-800">
              {visibleLedgerChart.map((m, idx) => {
                const incPct = Math.round((m.income / maxChartVal) * 100);
                const expPct = Math.round((m.expense / maxChartVal) * 100);
                return (
                  <div
                    key={m.monthKey}
                    onMouseEnter={() => setHoveredMonthIdx(idx)}
                    onMouseLeave={() => setHoveredMonthIdx(null)}
                    className="flex-1 h-full flex flex-col justify-end items-center group"
                  >
                    <div className="w-full flex items-end justify-center gap-1 h-44">
                      <div
                        className="w-2.5 sm:w-3.5 rounded-t-sm bg-emerald-600 group-hover:bg-emerald-500 transition-all"
                        style={{ height: `${Math.max(4, incPct)}%` }}
                        title={`${m.label} Income: ${formatCurrency(m.income, currency)}`}
                      />
                      <div
                        className="w-2.5 sm:w-3.5 rounded-t-sm bg-rose-500 group-hover:bg-rose-400 transition-all"
                        style={{ height: `${Math.max(4, expPct)}%` }}
                        title={`${m.label} Expense: ${formatCurrency(m.expense, currency)}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2 sm:gap-3 pt-2">
              {visibleLedgerChart.map((m) => (
                <div
                  key={m.monthKey}
                  className="flex-1 text-center text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate"
                >
                  {m.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Month Wise Paid vs Unpaid Invoices */}
        <div className="xl:col-span-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="bg-gradient-to-r from-rose-700 to-rose-800 text-white px-5 py-3.5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold">Paid vs Unpaid Invoices</h3>
              <p className="text-xs text-rose-100">Vouchers of recent months</p>
            </div>
            <button
              type="button"
              onClick={() => navigateTo('fees')}
              className="text-xs font-semibold text-white hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              View All →
            </button>
          </div>

          <div className="p-5">
            <div className="h-52 flex items-end gap-3 pt-4 border-b border-slate-200 dark:border-slate-800">
              {summary.monthlyChart.slice(-6).map((m) => {
                const paidPct = Math.round((m.paidVouchers / maxInvoiceCount) * 100);
                const unpaidPct = Math.round((m.unpaidVouchers / maxInvoiceCount) * 100);
                return (
                  <div key={m.monthKey} className="flex-1 h-full flex flex-col justify-end items-center">
                    <div className="w-full flex items-end justify-center gap-1 h-44">
                      <div
                        className="w-3.5 rounded-t-sm bg-emerald-600"
                        style={{ height: `${Math.max(m.paidVouchers ? 8 : 2, paidPct)}%` }}
                        title={`${m.label} Paid: ${m.paidVouchers}`}
                      />
                      <div
                        className="w-3.5 rounded-t-sm bg-rose-400"
                        style={{ height: `${Math.max(m.unpaidVouchers ? 8 : 2, unpaidPct)}%` }}
                        title={`${m.label} Unpaid: ${m.unpaidVouchers}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-3 pt-2">
              {summary.monthlyChart.slice(-6).map((m) => (
                <div
                  key={m.monthKey}
                  className="flex-1 text-center text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate"
                >
                  {m.label}
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-center gap-5 text-xs text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600" />
                Paid
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-400" />
                Unpaid
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Attendance & Results at Risk Row */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="bg-emerald-700 text-white px-5 py-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold">Attendance today</h3>
              <p className="text-xs text-emerald-100">Session {db.settings.sessionName}</p>
            </div>
            <button
              type="button"
              onClick={() => navigateTo('attendance')}
              className="text-xs font-semibold hover:underline cursor-pointer"
            >
              Details →
            </button>
          </div>
          <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 p-3">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Marked</div>
              <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-white mt-0.5">
                {summary.studentsMarkedToday}
              </div>
            </div>
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3">
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400">Present</div>
              <div className="text-xl font-bold tabular-nums text-emerald-800 dark:text-emerald-300 mt-0.5">
                {summary.studentsPresentToday}
              </div>
            </div>
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 p-3">
              <div className="text-[11px] text-rose-700 dark:text-rose-400">Absent</div>
              <div className="text-xl font-bold tabular-nums text-rose-800 dark:text-rose-300 mt-0.5">
                {summary.studentsAbsentToday}
              </div>
            </div>
            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/40 p-3">
              <div className="text-[11px] text-blue-700 dark:text-blue-400">On Leave</div>
              <div className="text-xl font-bold tabular-nums text-blue-800 dark:text-blue-300 mt-0.5">
                {summary.studentsLeaveToday}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="bg-indigo-700 text-white px-5 py-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold">Results &amp; students at risk</h3>
              <p className="text-xs text-indigo-100">Latest term examination insights</p>
            </div>
            <button
              type="button"
              onClick={() => navigateTo('exams')}
              className="text-xs font-semibold hover:underline cursor-pointer"
            >
              Details →
            </button>
          </div>
          <div className="p-5 flex items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Published Exams: <strong className="text-slate-900 dark:text-white">{db.exams.length}</strong>
              </div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Students below 40% academic threshold:{' '}
                <span className="font-mono tabular-nums text-rose-600 dark:text-rose-400 font-bold">
                  {summary.studentsAtRiskCount}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Open Exam Management to enter marks, inspect tabulation sheets, or print marksheets.
              </p>
            </div>
            <FileSpreadsheet className="w-10 h-10 text-indigo-500/40 shrink-0" />
          </div>
        </div>
      </section>

      {/* Staff Overview, Syllabus Coverage & Birthdays Today */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="bg-amber-700 text-white px-5 py-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold">Staff overview</h3>
              <p className="text-xs text-amber-100 tabular-nums">{summary.activeStaff} active staff</p>
            </div>
            <button
              type="button"
              onClick={() => navigateTo('staff')}
              className="text-xs font-semibold hover:underline cursor-pointer"
            >
              Details →
            </button>
          </div>
          <div className="p-5 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 p-3">
              <div className="text-slate-500 dark:text-slate-400">Teachers</div>
              <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-white mt-0.5">
                {db.staff.filter((s) => s.role === 'Teacher' && (activeCampusId === 'all' || s.campusId === activeCampusId)).length}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 p-3">
              <div className="text-slate-500 dark:text-slate-400">Admin &amp; Support</div>
              <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-white mt-0.5">
                {db.staff.filter((s) => s.role !== 'Teacher' && (activeCampusId === 'all' || s.campusId === activeCampusId)).length}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="bg-teal-700 text-white px-5 py-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold">Syllabus coverage</h3>
              <p className="text-xs text-teal-100">Across active subjects</p>
            </div>
            <button
              type="button"
              onClick={() => navigateTo('subjects')}
              className="text-xs font-semibold hover:underline cursor-pointer"
            >
              Details →
            </button>
          </div>
          <div className="p-5 flex items-center justify-between gap-4">
            <div>
              <div className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {summary.avgSyllabusCoverage}%
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Average scheme of studies completion
              </div>
            </div>
            <BookOpen className="w-8 h-8 text-teal-600/40 shrink-0" />
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Birthdays Today</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
              {summary.birthdaysTodayCount} student{summary.birthdaysTodayCount === 1 ? '' : 's'} celebrating today
            </p>
            <button
              type="button"
              onClick={() => navigateTo('students', 'birthdays', 'students-birthdays')}
              className="mt-3 text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
            >
              View student birthdays →
            </button>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Cake className="w-6 h-6" />
          </div>
        </div>
      </section>

      {/* Admissions Overview, Admissions & Withdrawals, Staff Attendance Overview */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Admissions Overview</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">New admissions and pass-outs</p>
            </div>
            {canVisitPage('students') && (
              <button
                type="button"
                onClick={() => navigateTo('students', 'info', 'students-info')}
                className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline shrink-0 cursor-pointer"
              >
                View All →
              </button>
            )}
          </div>
          <div className="mt-4 flex items-center gap-4">
            <DonutRing
              percent={
                campusAllStudents.length > 0
                  ? Math.min(100, Math.round((admissionsYearCount / campusAllStudents.length) * 100))
                  : 0
              }
              centerTop={String(admissionsYearCount)}
              centerBottom="this year"
              strokeColor="#0f766e"
            />
            <div className="flex-1 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Admissions Today</span>
                <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {admissionsTodayCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Monthly Admissions</span>
                <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                  {summary.newAdmissionsThisMonth}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Yearly Admissions</span>
                <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                  {admissionsYearCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Withdrawn / passed out</span>
                <span className="font-bold tabular-nums text-rose-600 dark:text-rose-400">
                  {summary.withdrawnCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Admissions &amp; withdrawals
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Month by month this session</p>
            </div>
            {canVisitPage('students') && (
              <button
                type="button"
                onClick={() => navigateTo('students', 'reports', 'students-reports')}
                className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline shrink-0 cursor-pointer"
              >
                View All →
              </button>
            )}
          </div>
          <div className="mt-4">
            <div className="h-28 flex items-end justify-between gap-2 px-1">
              {admissionsSeries.map((bar) => (
                <div key={bar.monthKey} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full h-20 flex items-end justify-center gap-1">
                    <div
                      className="w-2.5 rounded-t bg-emerald-600 dark:bg-emerald-500 transition-all"
                      style={{
                        height: `${Math.max(bar.admissions > 0 ? 16 : 4, Math.round((bar.admissions / maxAdmissionsBar) * 76))}%`,
                      }}
                      title={`${bar.label}: ${bar.admissions} admissions`}
                    />
                    <div
                      className="w-2.5 rounded-t bg-rose-500 dark:bg-rose-400 transition-all"
                      style={{
                        height: `${Math.max(bar.withdrawn > 0 ? 16 : 4, Math.round((bar.withdrawn / maxAdmissionsBar) * 76))}%`,
                      }}
                      title={`${bar.label}: ${bar.withdrawn} withdrawn`}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                    {bar.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                Admissions
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" />
                Withdrawn
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Staff Attendance Overview
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {staffMarkedToday} staff · marked today
              </p>
            </div>
            {canVisitPage('staff-attendance') && (
              <button
                type="button"
                onClick={() => navigateTo('staff-attendance')}
                className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline shrink-0 cursor-pointer"
              >
                View All →
              </button>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs">
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2.5">
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400">Present</div>
              <div className="text-lg font-bold tabular-nums text-emerald-800 dark:text-emerald-300">
                {summary.staffPresentToday}
              </div>
            </div>
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 px-3 py-2.5">
              <div className="text-[11px] text-rose-700 dark:text-rose-400">Absent</div>
              <div className="text-lg font-bold tabular-nums text-rose-800 dark:text-rose-300">
                {summary.staffAbsentToday}
              </div>
            </div>
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 px-3 py-2.5">
              <div className="text-[11px] text-amber-700 dark:text-amber-400">Late</div>
              <div className="text-lg font-bold tabular-nums text-amber-800 dark:text-amber-300">
                {summary.staffLateToday}
              </div>
            </div>
            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/40 px-3 py-2.5">
              <div className="text-[11px] text-blue-700 dark:text-blue-400">On Leave</div>
              <div className="text-lg font-bold tabular-nums text-blue-800 dark:text-blue-300">
                {staffLeaveToday}
              </div>
            </div>
          </div>
          {canVisitPage('staff-attendance') && (
            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                {summary.staffNotMarkedCount} unmarked today
              </span>
              <button
                type="button"
                onClick={() => navigateTo('staff-attendance')}
                className="font-semibold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
              >
                Mark now →
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Admissions Funnel, Unpaid Fees By Age, Parents & Families */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="text-[10px] font-bold tracking-wider uppercase text-teal-700 dark:text-teal-400">
                This month
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Admissions funnel</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">From inquiry to admission</p>
            </div>
            {canVisitPage('admissions') && (
              <button
                type="button"
                onClick={() => navigateTo('admissions')}
                className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline shrink-0 cursor-pointer"
              >
                View All →
              </button>
            )}
          </div>
          <div className="mt-4 space-y-2.5 text-xs">
            {[
              {
                label: 'Inquiries received',
                count: funnelTotal,
                pct: funnelTotal > 0 ? 100 : 0,
                barClass: 'bg-sky-600',
              },
              {
                label: 'Contacted & toured',
                count: funnelContacted,
                pct: funnelTotal > 0 ? Math.round((funnelContacted / funnelTotal) * 100) : 0,
                barClass: 'bg-amber-500',
              },
              {
                label: 'Approved / Enrolled',
                count: funnelApproved,
                pct: funnelTotal > 0 ? Math.round((funnelApproved / funnelTotal) * 100) : 0,
                barClass: 'bg-emerald-600',
              },
              {
                label: 'Rejected / Closed',
                count: funnelRejected,
                pct: funnelTotal > 0 ? Math.round((funnelRejected / funnelTotal) * 100) : 0,
                barClass: 'bg-rose-500',
              },
            ].map((stage) => (
              <div key={stage.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-600 dark:text-slate-300">{stage.label}</span>
                  <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                    {stage.count}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${stage.barClass}`}
                    style={{ width: `${Math.max(stage.count > 0 ? 8 : 0, stage.pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="text-[10px] font-bold tracking-wider uppercase text-amber-700 dark:text-amber-400">
                Now
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Unpaid fees by age</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                How old the unpaid invoices are
              </p>
            </div>
            {canVisitPage('fees') && (
              <button
                type="button"
                onClick={() => navigateTo('fees')}
                className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline shrink-0 cursor-pointer"
              >
                View All →
              </button>
            )}
          </div>
          <div className="mt-4 space-y-2.5 text-xs">
            {[
              {
                label: '0–30 days',
                bucket: unpaidAging.d0_30,
                badge: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
              },
              {
                label: '31–60 days',
                bucket: unpaidAging.d31_60,
                badge: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300',
              },
              {
                label: '61+ days',
                bucket: unpaidAging.d61_plus,
                badge: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300',
              },
            ].map((row) => (
              <button
                key={row.label}
                type="button"
                disabled={!canVisitPage('fees')}
                onClick={() => navigateTo('fees')}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2.5 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer disabled:cursor-default"
              >
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold tabular-nums ${row.badge}`}>
                    {row.label}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                    {row.bucket.count} invoice{row.bucket.count === 1 ? '' : 's'}
                  </span>
                </div>
                <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                  {formatCurrency(row.bucket.amount, currency, !showAmounts)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="text-[10px] font-bold tracking-wider uppercase text-violet-700 dark:text-violet-400">
                Now
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Parents &amp; families</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Accounts and family links</p>
            </div>
            {canVisitPage('parents') && (
              <button
                type="button"
                onClick={() => navigateTo('parents')}
                className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline shrink-0 cursor-pointer"
              >
                View All →
              </button>
            )}
          </div>
          <div className="mt-4 space-y-2.5 text-xs">
            <div className="rounded-xl bg-violet-50/70 dark:bg-violet-950/30 px-3 py-2.5 flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-200 font-medium">
                Families linked to parent
              </span>
              <span className="text-base font-bold tabular-nums text-violet-700 dark:text-violet-300">
                {linkedFamiliesCount}
              </span>
            </div>
            <div className="rounded-xl bg-teal-50/70 dark:bg-teal-950/30 px-3 py-2.5 flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-200 font-medium">
                Multi-child families (2+ kids)
              </span>
              <span className="text-base font-bold tabular-nums text-teal-700 dark:text-teal-300">
                {multiChildFamiliesCount}
              </span>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 px-3 py-2.5 flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-200 font-medium">
                Students missing parent link
              </span>
              <span
                className={`text-base font-bold tabular-nums ${
                  unlinkedStudentsCount > 0
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-emerald-700 dark:text-emerald-400'
                }`}
              >
                {unlinkedStudentsCount}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Priority Attention + Latest Admissions & Tasks */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Priority attention</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              What is waiting, who acts and by when — click to act
            </p>
          </div>

          <ul className="divide-y divide-slate-100 dark:divide-slate-800 mt-1">
            {priorityItems.map((item) => (
              <li key={item.title}>
                <button
                  type="button"
                  onClick={() => navigateTo(item.page)}
                  className="w-full py-2.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between gap-4 text-left transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {item.owner} · {item.due}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-bold tabular-nums shrink-0 ${
                      item.count > 0
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {item.count > 0 ? `${item.count} pending` : 'Clear'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="xl:col-span-5 space-y-4">
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Latest Admissions</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  New admissions this month: {summary.newAdmissionsThisMonth}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigateTo('students')}
                className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800 mt-1">
              {latestStudents.map((stu) => (
                <li key={stu.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{stu.name}</div>
                    <div className="text-slate-500 dark:text-slate-400">
                      {stu.className} ({stu.sectionName}) · {stu.studentCode}
                    </div>
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    {stu.admissionDate}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tasks Overview</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Tasks of {campusName}</p>
              </div>
              <button
                type="button"
                onClick={() => navigateTo('tasks')}
                className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-3 text-center">
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-2.5">
                <div className="text-base font-bold tabular-nums text-amber-700 dark:text-amber-400">
                  {taskCounts.pending}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400">Pending</div>
              </div>
              <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 p-2.5">
                <div className="text-base font-bold tabular-nums text-blue-700 dark:text-blue-400">
                  {taskCounts.processing}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400">Processing</div>
              </div>
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-2.5">
                <div className="text-base font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {taskCounts.completed}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400">Completed</div>
              </div>
              <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 p-2.5">
                <div className="text-base font-bold tabular-nums text-rose-700 dark:text-rose-400">
                  {taskCounts.returned}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400">Returned</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Classes Today Section */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Classes today</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Strength, attendance and this month&apos;s fees per class
            </p>
          </div>
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setClassesView('cards')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                classesView === 'cards'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Cards
            </button>
            <button
              type="button"
              onClick={() => setClassesView('table')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                classesView === 'table'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Table
            </button>
          </div>
        </div>

        {classesView === 'cards' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {summary.classSummaries.map((cls) => (
              <div
                key={cls.classId}
                className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/40"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {cls.className} · {cls.sectionName}
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                    {cls.studentCount} students
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-slate-500 dark:text-slate-400">Attendance today</div>
                    <div className="font-bold tabular-nums text-slate-900 dark:text-white mt-0.5">
                      {cls.attendanceMarked
                        ? `${cls.presentToday}/${cls.studentCount} (${cls.attendancePercent}%)`
                        : 'Not marked'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-500 dark:text-slate-400">Fee collected</div>
                    <div className="font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 mt-0.5">
                      {formatCurrency(cls.monthlyCollected, currency, !showAmounts)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-3 font-semibold">Class &amp; Section</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Strength</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Present Today</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Billed (Month)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Collected (Month)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {summary.classSummaries.map((cls) => (
                  <tr key={cls.classId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      {cls.className} · {cls.sectionName}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{cls.studentCount}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      {cls.attendanceMarked ? `${cls.presentToday} (${cls.attendancePercent}%)` : 'Pending'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {formatCurrency(cls.monthlyBilled, currency, !showAmounts)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400 font-semibold">
                      {formatCurrency(cls.monthlyCollected, currency, !showAmounts)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Daily Summary Printable Modal */}
      {dailySummaryOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Owner Daily Summary · {db.settings.schoolName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formattedDate} · {campusName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDailySummaryOpen(false)}
                aria-label="Close summary"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Active Enrollment</span>
                <span className="font-bold tabular-nums">{summary.activeStudents} students</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Students Present Today</span>
                <span className="font-bold tabular-nums">
                  {summary.studentsPresentToday}/{summary.activeStudents} ({summary.studentAttendancePercent}%)
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Fee Collected Today</span>
                <span className="font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(summary.collectedToday, currency)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Total Income Today</span>
                <span className="font-bold font-mono tabular-nums">
                  {formatCurrency(summary.incomeToday, currency)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Total Expense Today</span>
                <span className="font-bold font-mono tabular-nums text-rose-600">
                  {formatCurrency(summary.expenseToday, currency)}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-600 dark:text-slate-400">Total Outstanding Receivables</span>
                <span className="font-bold font-mono tabular-nums">
                  {formatCurrency(summary.unpaidFeesTotal, currency)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDailySummaryOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
