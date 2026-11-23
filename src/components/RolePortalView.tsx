import React, { useEffect, useState } from 'react';
import {
  Award,
  BookOpen,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  GraduationCap,
  Megaphone,
  MessageSquareWarning,
  Printer,
  QrCode,
  Receipt,
  ScanFace,
  Send,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import type { FeeVoucher } from '../types/erp';
import { calculateGrade, formatCurrency } from '../utils/erpLogic';
import { computeFamilySummary } from '../utils/rbac';

type ParentTab = 'overview' | 'attendance' | 'exams' | 'homework' | 'requests';
type StudentTab = 'overview' | 'homework' | 'attendance' | 'exams' | 'fees' | 'leave';

export const RolePortalView: React.FC = () => {
  const { user, db, today, showAmounts, navigateTo, mutate, notify, canVisitPage } = useErp();

  const [selectedChildId, setSelectedChildId] = useState<string>('all');
  const [parentTab, setParentTab] = useState<ParentTab>('overview');
  const [studentTab, setStudentTab] = useState<StudentTab>('overview');
  const [previewVoucher, setPreviewVoucher] = useState<FeeVoucher | null>(null);

  // Leave form state (Parent & Student)
  const [leaveStudentId, setLeaveStudentId] = useState<string>('');
  const [leaveFrom, setLeaveFrom] = useState<string>(today);
  const [leaveTo, setLeaveTo] = useState<string>(today);
  const [leaveReason, setLeaveReason] = useState<string>('');
  const [leaveBusy, setLeaveBusy] = useState(false);

  // Complaint form state (Parent)
  const [compStudentId, setCompStudentId] = useState<string>('');
  const [compSubject, setCompSubject] = useState<string>('');
  const [compDesc, setCompDesc] = useState<string>('');
  const [compBusy, setCompBusy] = useState(false);

  const [studentQrUrl, setStudentQrUrl] = useState<string>('');
  const studentPortalCode = user?.role === 'Student' ? db?.students[0]?.studentCode || user.studentCode || 'ST-1001' : '';

  useEffect(() => {
    if (!studentPortalCode) return;
    let active = true;
    void (async () => {
      try {
        const QRCode = (await import('qrcode')).default;
        const url = await QRCode.toDataURL(`QR:${studentPortalCode}`, { width: 120, margin: 1 });
        if (active) setStudentQrUrl(url);
      } catch {
        // ignore
      }
    })();
    return () => {
      active = false;
    };
  }, [studentPortalCode]);

  if (!user || !db) return null;

  const renderChallanModal = () =>
    previewVoucher && (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
      >
        <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="font-bold text-sm text-slate-900 dark:text-white capitalize">
                {db.settings.schoolName} · Fee Challan
              </div>
              <div className="text-[11px] text-slate-500">Student &amp; Parent Copy · Session {db.settings.sessionName}</div>
            </div>
            <button
              type="button"
              onClick={() => setPreviewVoucher(null)}
              aria-label="Close fee challan"
              className="p-1 text-slate-400 hover:text-slate-600 no-print"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl">
            <div className="flex justify-between">
              <span className="text-slate-500">Voucher #</span>
              <span className="font-mono font-bold text-teal-700 dark:text-teal-400">{previewVoucher.voucherNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Student</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {previewVoucher.studentName} ({previewVoucher.studentCode})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Class</span>
              <span>
                {previewVoucher.className} · {previewVoucher.sectionName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Billing Month</span>
              <span>{previewVoucher.monthLabel} ({previewVoucher.feeType})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Due Date</span>
              <span className="font-mono">{previewVoucher.dueDate}</span>
            </div>
          </div>

          <div className="border-t border-b border-slate-200 dark:border-slate-800 py-2.5 space-y-1.5">
            <div className="flex justify-between">
              <span>Tuition Fee</span>
              <span className="font-mono tabular-nums">{formatCurrency(previewVoucher.tuitionAmount, currency)}</span>
            </div>
            {previewVoucher.otherCharges > 0 && (
              <div className="flex justify-between">
                <span>Other Charges</span>
                <span className="font-mono tabular-nums">{formatCurrency(previewVoucher.otherCharges, currency)}</span>
              </div>
            )}
            {previewVoucher.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Sibling / Merit Discount</span>
                <span className="font-mono tabular-nums">-{formatCurrency(previewVoucher.discountAmount, currency)}</span>
              </div>
            )}
            {previewVoucher.lateFine > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Late Fine</span>
                <span className="font-mono tabular-nums">{formatCurrency(previewVoucher.lateFine, currency)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-sm font-bold">
            <span>Total Payable</span>
            <span className="font-mono tabular-nums">{formatCurrency(previewVoucher.totalAmount, currency)}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Paid: {formatCurrency(previewVoucher.paidAmount, currency)}</span>
            <span className="uppercase font-bold">Status: {previewVoucher.status}</span>
          </div>

          <div className="flex justify-end gap-2 pt-2 no-print">
            <button
              type="button"
              onClick={() => setPreviewVoucher(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Challan</span>
            </button>
          </div>
        </div>
      </div>
    );

  const currency = db.settings.currency || 'Rs';

  // ==============================
  // 1. PARENT PORTAL (Multi-Child)
  // ==============================
  if (user.role === 'Parent') {
    const parentInfo = db.parents[0];
    const children = db.students;
    const activeChild =
      selectedChildId === 'all' ? null : children.find((c) => c.id === selectedChildId) || null;
    const displayedChildren = activeChild ? [activeChild] : children;
    const displayedChildIds = new Set(displayedChildren.map((c) => c.id));
    const displayedClassNames = new Set(displayedChildren.map((c) => c.className));

    const summary = computeFamilySummary(db, displayedChildren, today);
    const vouchers = db.vouchers.filter((v) => displayedChildIds.has(v.studentId));
    const attendance = db.attendance.filter((a) => displayedChildIds.has(a.targetId));
    const marks = db.marks.filter((m) => displayedChildIds.has(m.studentId));
    const homework = db.homework.filter((h) =>
      Array.from(displayedClassNames).some((cls) => h.className.startsWith(cls))
    );
    const timetable = db.timetable.filter((t) =>
      Array.from(displayedClassNames).some((cls) => t.className.startsWith(cls))
    );
    const notices = db.notices.filter(
      (n) => n.audience === 'All' || n.audience === 'Parents'
    );

    const effectiveLeaveChildId =
      leaveStudentId || (activeChild ? activeChild.id : children[0]?.id || '');
    const effectiveCompChildId =
      compStudentId || (activeChild ? activeChild.id : children[0]?.id || '');

    const handleLeaveSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const target = children.find((c) => c.id === effectiveLeaveChildId) || children[0];
      if (!target) {
        notify('No enrolled child selected.', 'error');
        return;
      }
      setLeaveBusy(true);
      const res = await mutate(
        '/api/operations/leaves',
        'POST',
        {
          campusId: target.campusId,
          applicantName: target.name,
          applicantType: 'Student',
          classOrRole: `${target.className} - ${target.sectionName}`,
          fromDate: leaveFrom,
          toDate: leaveTo,
          reason: leaveReason,
        },
        `Leave application submitted for ${target.name}.`
      );
      setLeaveBusy(false);
      if (res.ok) {
        setLeaveReason('');
      }
    };

    const handleComplaintSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const target = children.find((c) => c.id === effectiveCompChildId) || children[0];
      setCompBusy(true);
      const res = await mutate(
        '/api/operations/complaints',
        'POST',
        {
          campusId: target?.campusId || 'campus-main',
          parentName: parentInfo?.name || user.name,
          studentName: target?.name || 'Family Inquiry',
          subject: compSubject,
          description: compDesc,
        },
        'Submitted parent feedback to Principal Office.'
      );
      setCompBusy(false);
      if (res.ok) {
        setCompSubject('');
        setCompDesc('');
      }
    };

    return (
      <div className="space-y-6">
        {/* Family Profile Header */}
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-700 text-white p-5 sm:p-6 shadow-md">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/15 text-[11px] font-semibold uppercase tracking-wider mb-2">
                <UserCheck className="w-3.5 h-3.5" />
                Parent Family Portal
              </span>
              <h1 className="text-xl sm:text-2xl font-bold">
                Welcome, {parentInfo?.name || user.name}
              </h1>
              <p className="text-xs text-blue-100 mt-1">
                {children.length} Enrolled {children.length === 1 ? 'Child' : 'Children'} ·{' '}
                {parentInfo?.phone || user.email}
                {parentInfo?.cnic ? ` · CNIC ${parentInfo.cnic}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-semibold cursor-pointer no-print"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Family Fee Slip</span>
            </button>
          </div>

          {/* Multi-Child Switcher */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedChildId('all')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                selectedChildId === 'all'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>All Children ({children.length})</span>
            </button>
            {children.map((child) => {
              const isSelected = selectedChildId === child.id;
              const childToday = db.attendance.find(
                (a) => a.date === today && a.targetId === child.id
              );
              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => setSelectedChildId(child.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'bg-white/15 text-white hover:bg-white/25'
                  }`}
                >
                  <span>{child.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      isSelected ? 'bg-indigo-50 text-indigo-700' : 'bg-black/20 text-blue-50'
                    }`}
                  >
                    {child.className}
                  </span>
                  {childToday && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        childToday.status === 'present' ? 'bg-emerald-400' : 'bg-amber-300'
                      }`}
                      title={`Today: ${childToday.status}`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Family / Child Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {activeChild ? 'Selected Child' : 'Enrolled Children'}
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {activeChild ? activeChild.name : `${summary.childrenCount} Students`}
            </div>
            <div className="text-[11px] text-teal-700 dark:text-teal-400 mt-1 font-medium">
              {activeChild
                ? `${activeChild.studentCode} · ${activeChild.className} (${activeChild.sectionName})`
                : children.map((c) => c.className).join(', ')}
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">Today&apos;s Attendance</div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
              {summary.presentTodayCount} / {displayedChildren.length} Present
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {summary.absentTodayCount > 0
                ? `${summary.absentTodayCount} marked absent today`
                : 'Checked in via Face / Card scanner'}
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">Pending Fee Dues</div>
            <div className="text-xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400 mt-1">
              {formatCurrency(summary.totalUnpaidFees, currency, !showAmounts)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {summary.unpaidVouchersCount} unpaid voucher(s)
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">Paid This Term</div>
            <div className="text-xl font-bold font-mono tabular-nums text-teal-700 dark:text-teal-400 mt-1">
              {formatCurrency(summary.totalPaidFees, currency, !showAmounts)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Monthly Tuition Total: {formatCurrency(summary.totalMonthlyFee, currency, !showAmounts)}
            </div>
          </div>
        </div>

        {/* Navigation Sub-tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-print">
          {(
            [
              { id: 'overview', label: 'Children & Fee Vouchers', icon: Receipt },
              { id: 'attendance', label: 'Attendance & Scans', icon: ScanFace },
              { id: 'exams', label: 'Exam Results', icon: FileSpreadsheet },
              { id: 'homework', label: 'Homework & Timetable', icon: BookOpen },
              { id: 'requests', label: 'Leave & Complaints', icon: MessageSquareWarning },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setParentTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border whitespace-nowrap shrink-0 cursor-pointer ${
                  parentTab === tab.id
                    ? 'bg-teal-700 border-teal-700 text-white'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {parentTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-5">
              {/* Linked Children Cards */}
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Enrolled Children ({displayedChildren.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {displayedChildren.map((child) => {
                    const todayAtt = db.attendance.find(
                      (a) => a.date === today && a.targetId === child.id
                    );
                    const childDue = db.vouchers
                      .filter((v) => v.studentId === child.id && v.status !== 'paid')
                      .reduce((s, v) => s + Math.max(0, v.totalAmount - v.paidAmount), 0);
                    return (
                      <div
                        key={child.id}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white">
                              {child.name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              <span className="font-mono">{child.studentCode}</span> · {child.className} ({child.sectionName}) · Roll #{child.rollNo}
                            </div>
                          </div>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                              todayAtt?.status === 'present'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : todayAtt?.status === 'absent'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {todayAtt ? `${todayAtt.status}${todayAtt.timeIn ? ` · ${todayAtt.timeIn}` : ''}` : 'Pending'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/70 dark:border-slate-700/70">
                          <span className="text-slate-500">
                            Monthly Fee:{' '}
                            <strong className="font-mono text-slate-800 dark:text-slate-200">
                              {formatCurrency(child.monthlyFee, currency, !showAmounts)}
                            </strong>
                          </span>
                          <span
                            className={`font-semibold ${
                              childDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'
                            }`}
                          >
                            {childDue > 0 ? `Due: ${formatCurrency(childDue, currency, !showAmounts)}` : 'Fees Cleared'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fee Vouchers Table */}
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Family Fee Vouchers
                  </h2>
                  <span className="text-xs text-slate-500">{vouchers.length} voucher(s)</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                        <th className="py-2 px-2">Voucher #</th>
                        <th className="py-2 px-2">Student</th>
                        <th className="py-2 px-2">Month</th>
                        <th className="py-2 px-2 text-right">Amount</th>
                        <th className="py-2 px-2 text-right">Status</th>
                        <th className="py-2 px-2 text-right no-print">Challan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {vouchers.map((v) => (
                        <tr key={v.id}>
                          <td className="py-2.5 px-2 font-mono font-semibold text-teal-700 dark:text-teal-400">
                            {v.voucherNo}
                          </td>
                          <td className="py-2.5 px-2">
                            <div className="font-semibold text-slate-900 dark:text-white">{v.studentName}</div>
                            <div className="text-[11px] text-slate-500">{v.className}</div>
                          </td>
                          <td className="py-2.5 px-2">{v.monthLabel}</td>
                          <td className="py-2.5 px-2 text-right font-mono tabular-nums font-semibold">
                            {formatCurrency(v.totalAmount, currency, !showAmounts)}
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold uppercase ${
                                v.status === 'paid'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                              }`}
                            >
                              {v.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-right no-print">
                            <button
                              type="button"
                              onClick={() => setPreviewVoucher(v)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              <Printer className="w-3 h-3 text-blue-600" />
                              <span>Slip</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Notices & PTM Column */}
            <div className="space-y-5">
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-rose-600" />
                    <span>School Notices</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => navigateTo('noticeboard')}
                    className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-2.5">
                  {notices.slice(0, 4).map((n) => (
                    <div key={n.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs space-y-1">
                      <div className="font-bold text-slate-900 dark:text-white">{n.title}</div>
                      <div className="text-slate-500 dark:text-slate-400 line-clamp-2">{n.body}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{n.date}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {parentTab === 'attendance' && (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Attendance &amp; Biometric / Card Scan Log
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Student</th>
                    <th className="py-2 px-3">Class</th>
                    <th className="py-2 px-3">Verification Method</th>
                    <th className="py-2 px-3">Check-In Time</th>
                    <th className="py-2 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {attendance.map((a) => {
                    const st = children.find((c) => c.id === a.targetId);
                    return (
                      <tr key={a.id}>
                        <td className="py-2.5 px-3 font-mono">{a.date}</td>
                        <td className="py-2.5 px-3 font-semibold">{st?.name || a.targetId}</td>
                        <td className="py-2.5 px-3">{st ? `${st.className} · ${st.sectionName}` : '—'}</td>
                        <td className="py-2.5 px-3 capitalize">{a.method || 'manual'}</td>
                        <td className="py-2.5 px-3 font-mono">{a.timeIn || '08:00 AM'}</td>
                        <td className="py-2.5 px-3 text-right capitalize font-bold text-emerald-600">
                          {a.status}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {parentTab === 'exams' && (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Exam Marks &amp; Report Summary
              </h2>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer no-print"
              >
                <Printer className="w-3.5 h-3.5 text-blue-600" />
                <span>Print Report Card</span>
              </button>
            </div>
            {marks.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                No published exam marks yet for the selected child(ren). Visit Exam Management once terms are published.
              </p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-2 px-3">Student</th>
                    <th className="py-2 px-3">Subject</th>
                    <th className="py-2 px-3 text-right">Obtained</th>
                    <th className="py-2 px-3 text-right">Total</th>
                    <th className="py-2 px-3 text-right">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {marks.map((m) => {
                    const st = children.find((c) => c.id === m.studentId);
                    const sub = db.subjects.find((sb) => sb.id === m.subjectId);
                    const pct = Math.round((m.obtainedMarks / Math.max(1, m.totalMarks)) * 100);
                    return (
                      <tr key={m.id}>
                        <td className="py-2.5 px-3 font-semibold">{st?.name}</td>
                        <td className="py-2.5 px-3">{sub?.name || m.subjectId}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{m.obtainedMarks}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{m.totalMarks}</td>
                        <td className="py-2.5 px-3 text-right font-bold">{calculateGrade(pct).grade}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {parentTab === 'homework' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Daily Homework Diary</h2>
              <div className="space-y-2.5">
                {homework.map((hw) => (
                  <div key={hw.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span>{hw.subject} · {hw.className}</span>
                      <span className="font-mono text-teal-700 dark:text-teal-400">Due {hw.dueDate}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">{hw.title}</p>
                    <div className="text-[11px] text-slate-400">Assigned by {hw.assignedBy}</div>
                  </div>
                ))}
                {homework.length === 0 && (
                  <p className="text-xs text-slate-500">No homework posted for the selected class yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Class Timetable</h2>
              <div className="space-y-2">
                {timetable.map((slot) => (
                  <div key={slot.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-bold">{slot.subject} · {slot.className}</div>
                      <div className="text-slate-500">{slot.day} · {slot.teacherName} · Room {slot.room}</div>
                    </div>
                    <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">{slot.timeSlot}</span>
                  </div>
                ))}
                {timetable.length === 0 && (
                  <p className="text-xs text-slate-500">No timetable slots configured for the selected class.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {parentTab === 'requests' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Apply Student Leave */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Apply Leave for Child
              </h2>
              <form onSubmit={handleLeaveSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Select Child *</label>
                  <select
                    value={effectiveLeaveChildId}
                    onChange={(e) => setLeaveStudentId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {children.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.className} - {c.sectionName})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">From Date</label>
                    <input
                      type="date"
                      value={leaveFrom}
                      onChange={(e) => setLeaveFrom(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">To Date</label>
                    <input
                      type="date"
                      value={leaveTo}
                      onChange={(e) => setLeaveTo(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Reason *</label>
                  <textarea
                    required
                    rows={2}
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    placeholder="Medical checkup / Family event..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <button
                  type="submit"
                  disabled={leaveBusy}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{leaveBusy ? 'Submitting...' : 'Submit Leave Application'}</span>
                </button>
              </form>

              {db.leaves.length > 0 && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Recent Leave Applications
                  </div>
                  {db.leaves.map((l) => (
                    <div key={l.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{l.applicantName} · {l.fromDate}</div>
                        <div className="text-slate-500">{l.reason}</div>
                      </div>
                      <span className="capitalize font-bold text-amber-600">{l.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Parent Complaint */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Submit Parent Feedback / Complaint
              </h2>
              <form onSubmit={handleComplaintSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Regarding Child</label>
                  <select
                    value={effectiveCompChildId}
                    onChange={(e) => setCompStudentId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {children.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.className})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Subject *</label>
                  <input
                    required
                    value={compSubject}
                    onChange={(e) => setCompSubject(e.target.value)}
                    placeholder="e.g. Transport timing or Tuition voucher question"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Details</label>
                  <textarea
                    rows={2}
                    value={compDesc}
                    onChange={(e) => setCompDesc(e.target.value)}
                    placeholder="Provide details for school admin..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <button
                  type="submit"
                  disabled={compBusy}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{compBusy ? 'Sending...' : 'Send to Principal Office'}</span>
                </button>
              </form>

              {db.complaints.length > 0 && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Your Submitted Tickets
                  </div>
                  {db.complaints.map((c) => (
                    <div key={c.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{c.subject} ({c.studentName})</div>
                        <div className="text-slate-500">{c.submittedDate}</div>
                      </div>
                      <span className="capitalize font-bold text-blue-600">{c.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {renderChallanModal()}
      </div>
    );
  }

  // ==============================
  // 2. STUDENT PORTAL
  // ==============================
  if (user.role === 'Student') {
    const me = db.students[0];
    const myAttendance = db.attendance;
    const todayAtt = myAttendance.find((a) => a.date === today);
    const unpaidDues = db.vouchers
      .filter((v) => v.status !== 'paid')
      .reduce((sum, v) => sum + Math.max(0, v.totalAmount - v.paidAmount), 0);

    const handleStudentLeave = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!me) return;
      setLeaveBusy(true);
      const res = await mutate(
        '/api/operations/leaves',
        'POST',
        {
          campusId: me.campusId,
          applicantName: me.name,
          applicantType: 'Student',
          classOrRole: `${me.className} - ${me.sectionName}`,
          fromDate: leaveFrom,
          toDate: leaveTo,
          reason: leaveReason,
        },
        'Submitted leave application for review.'
      );
      setLeaveBusy(false);
      if (res.ok) setLeaveReason('');
    };

    return (
      <div className="space-y-6">
        {/* Student Header */}
        <div className="rounded-2xl bg-gradient-to-r from-teal-700 via-emerald-700 to-sky-700 text-white p-5 sm:p-6 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/15 text-[11px] font-semibold uppercase tracking-wider mb-2">
                <GraduationCap className="w-3.5 h-3.5" />
                Student Portal
              </span>
              <h1 className="text-xl sm:text-2xl font-bold">{me?.name || user.name}</h1>
              <p className="text-xs text-teal-100 mt-1">
                {me
                  ? `${me.studentCode} · ${me.className} (${me.sectionName}) · Roll #${me.rollNo} · Guardian: ${me.fatherName}`
                  : user.email}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigateTo('certification')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-semibold cursor-pointer"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Admit Card &amp; Certificates</span>
            </button>
          </div>
        </div>

        {/* Student KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-xs text-slate-500">Today&apos;s Attendance</div>
            <div className="text-xl font-bold text-emerald-600 mt-1 capitalize">
              {todayAtt ? todayAtt.status : 'Pending'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {todayAtt?.method ? `${todayAtt.method.toUpperCase()} scan · ${todayAtt.timeIn || ''}` : 'Daily roll call'}
            </div>
          </div>
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-xs text-slate-500">Homework Tasks</div>
            <div className="text-xl font-bold text-indigo-600 mt-1 tabular-nums">{db.homework.length}</div>
            <div className="text-[11px] text-slate-500 mt-1">Assigned for {me?.className || 'your class'}</div>
          </div>
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-xs text-slate-500">Class Timetable Slots</div>
            <div className="text-xl font-bold text-sky-600 mt-1 tabular-nums">{db.timetable.length}</div>
            <div className="text-[11px] text-slate-500 mt-1">Weekly schedule</div>
          </div>
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-xs text-slate-500">Unpaid Fee Balance</div>
            <div className="text-xl font-bold font-mono tabular-nums text-rose-600 mt-1">
              {formatCurrency(unpaidDues, currency, !showAmounts)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">{db.vouchers.length} voucher(s) on record</div>
          </div>
        </div>

        {/* Student Portal Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(
            [
              { id: 'overview', label: 'Timetable & Notices', icon: CalendarClock },
              { id: 'homework', label: 'Homework Diary', icon: BookOpen },
              { id: 'attendance', label: 'Attendance Log', icon: ScanFace },
              { id: 'exams', label: 'Exam Marks', icon: FileSpreadsheet },
              { id: 'fees', label: 'Fee Vouchers', icon: Receipt },
              { id: 'leave', label: 'Apply Leave', icon: CalendarCheck },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setStudentTab(t.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border whitespace-nowrap shrink-0 cursor-pointer ${
                  studentTab === t.id
                    ? 'bg-teal-700 border-teal-700 text-white'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {studentTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Student Digital QR ID Card */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs flex flex-col justify-between">
              <div>
                <div className="bg-teal-800 text-white px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold capitalize">{db.settings.schoolName}</div>
                    <div className="text-[10px] text-teal-200">Digital Gate ID · {db.settings.sessionName}</div>
                  </div>
                  <span className="font-mono text-xs font-bold">{me?.studentCode || studentPortalCode}</span>
                </div>
                <div className="p-4 flex items-center gap-3 text-xs">
                  {me?.faceAvatar ? (
                    <img src={me.faceAvatar} alt={me.name} className="w-14 h-14 rounded-xl object-cover border border-teal-400 shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold text-xl flex items-center justify-center shrink-0">
                      {(me?.name || user.name).charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">{me?.name || user.name}</div>
                    <div className="text-slate-500">{me ? `${me.className} · ${me.sectionName} (Roll #${me.rollNo})` : ''}</div>
                    <div className="text-[11px] font-mono text-emerald-600 font-semibold mt-0.5">
                      {me?.faceEnrolled ? 'Face Biometric Ready' : 'QR / ID Card Active'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                {studentQrUrl ? (
                  <img
                    src={studentQrUrl}
                    alt={`Digital ID QR for ${me?.studentCode || studentPortalCode}`}
                    className="w-16 h-16 rounded-lg border border-slate-200 dark:border-slate-700 bg-white p-1"
                  />
                ) : (
                  <QrCode className="w-12 h-12 text-slate-400" />
                )}
                <div className="text-[11px] text-slate-600 dark:text-slate-300 flex-1">
                  <div className="font-bold text-slate-900 dark:text-white">Scan at Campus Gate</div>
                  <div>Show this QR badge or look at gate face camera to log arrival &amp; WhatsApp parent alert.</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <h2 className="text-sm font-bold">My Class Timetable</h2>
              <div className="space-y-2">
                {db.timetable.map((slot) => (
                  <div key={slot.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs flex justify-between">
                    <div>
                      <div className="font-bold">{slot.subject}</div>
                      <div className="text-slate-500">{slot.day} · {slot.teacherName} · Room {slot.room}</div>
                    </div>
                    <span className="font-mono font-semibold text-teal-700">{slot.timeSlot}</span>
                  </div>
                ))}
                {db.timetable.length === 0 && <p className="text-xs text-slate-500">No timetable periods assigned yet.</p>}
              </div>
            </div>
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <h2 className="text-sm font-bold">Noticeboard</h2>
              <div className="space-y-2">
                {db.notices
                  .filter((n) => n.audience === 'All' || n.audience === 'Students')
                  .map((n) => (
                    <div key={n.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                      <div className="font-bold">{n.title}</div>
                      <p className="text-slate-500 mt-1">{n.body}</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {studentTab === 'homework' && (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <h2 className="text-sm font-bold">Assigned Homework</h2>
            {db.homework.length === 0 ? (
              <p className="text-xs text-slate-500">No homework posted for {me?.className || 'your class'} yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {db.homework.map((hw) => (
                  <div key={hw.id} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                    <div className="flex justify-between font-bold">
                      <span>{hw.subject}</span>
                      <span className="font-mono text-teal-700">Due {hw.dueDate}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">{hw.title}</p>
                    <div className="text-[11px] text-slate-400">By {hw.assignedBy}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {studentTab === 'attendance' && (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <h2 className="text-sm font-bold">My Attendance History</h2>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Scan Mode</th>
                  <th className="py-2 px-3">Time</th>
                  <th className="py-2 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {myAttendance.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2.5 px-3 font-mono">{a.date}</td>
                    <td className="py-2.5 px-3 capitalize">{a.method || 'manual'}</td>
                    <td className="py-2.5 px-3 font-mono">{a.timeIn || '08:00 AM'}</td>
                    <td className="py-2.5 px-3 text-right capitalize font-bold text-emerald-600">{a.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {studentTab === 'exams' && (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">My Exam Results</h2>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold cursor-pointer no-print"
              >
                <Printer className="w-3.5 h-3.5 text-blue-600" />
                <span>Print Marksheet</span>
              </button>
            </div>
            {db.marks.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">No exam results published yet.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-2 px-3">Subject</th>
                    <th className="py-2 px-3 text-right">Obtained</th>
                    <th className="py-2 px-3 text-right">Total</th>
                    <th className="py-2 px-3 text-right">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {db.marks.map((m) => {
                    const sub = db.subjects.find((sb) => sb.id === m.subjectId);
                    const pct = Math.round((m.obtainedMarks / Math.max(1, m.totalMarks)) * 100);
                    return (
                      <tr key={m.id}>
                        <td className="py-2.5 px-3 font-semibold">{sub?.name || m.subjectId}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{m.obtainedMarks}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{m.totalMarks}</td>
                        <td className="py-2.5 px-3 text-right font-bold">{calculateGrade(pct).grade}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {studentTab === 'fees' && (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">My Fee Vouchers</h2>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer no-print"
              >
                <Printer className="w-3.5 h-3.5 text-blue-600" />
                <span>Print All</span>
              </button>
            </div>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-2 px-3">Voucher</th>
                  <th className="py-2 px-3">Month</th>
                  <th className="py-2 px-3 text-right">Total</th>
                  <th className="py-2 px-3 text-right">Status</th>
                  <th className="py-2 px-3 text-right no-print">Challan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {db.vouchers.map((v) => (
                  <tr key={v.id}>
                    <td className="py-2.5 px-3 font-mono font-semibold text-teal-700 dark:text-teal-400">{v.voucherNo}</td>
                    <td className="py-2.5 px-3">{v.monthLabel}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(v.totalAmount, currency)}</td>
                    <td className="py-2.5 px-3 text-right uppercase font-bold">{v.status}</td>
                    <td className="py-2.5 px-3 text-right no-print">
                      <button
                        type="button"
                        onClick={() => setPreviewVoucher(v)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold cursor-pointer"
                      >
                        <Printer className="w-3 h-3 text-blue-600" />
                        <span>Slip</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {studentTab === 'leave' && (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4 max-w-xl">
            <h2 className="text-sm font-bold">Request Student Leave</h2>
            <form onSubmit={handleStudentLeave} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">From</label>
                  <input
                    type="date"
                    value={leaveFrom}
                    onChange={(e) => setLeaveFrom(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">To</label>
                  <input
                    type="date"
                    value={leaveTo}
                    onChange={(e) => setLeaveTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Reason *</label>
                <textarea
                  required
                  rows={2}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Fever / Family function..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <button
                type="submit"
                disabled={leaveBusy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 text-white font-semibold cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{leaveBusy ? 'Submitting...' : 'Submit Leave'}</span>
              </button>
            </form>
          </div>
        )}
        {renderChallanModal()}
      </div>
    );
  }

  // ==============================
  // 3. TEACHER WORKSPACE DASHBOARD
  // ==============================
  const myStaff = db.staff.find(
    (s) => s.id === user.staffId || s.email.toLowerCase() === user.email.toLowerCase()
  );
  const activeStudentsCount = db.students.filter((s) => s.status === 'active').length;
  const todayPresentCount = db.attendance.filter(
    (a) => a.date === today && a.targetType === 'student' && (a.status === 'present' || a.status === 'late')
  ).length;
  const mySubjects = db.subjects.filter((sub) => !myStaff || sub.teacherId === myStaff.id);
  const displaySubjects = mySubjects.length > 0 ? mySubjects : db.subjects.slice(0, 4);

  const teacherQuickActions = [
    { label: 'Student Attendance', page: 'attendance' as const, icon: ClipboardCheck, color: 'text-teal-700 bg-teal-50 dark:bg-teal-950/60' },
    { label: 'Face Attendance', page: 'face-attendance' as const, icon: ScanFace, color: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60' },
    { label: 'Card / QR Attendance', page: 'card-attendance' as const, icon: CheckCircle2, color: 'text-sky-700 bg-sky-50 dark:bg-sky-950/60' },
    { label: 'Daily Homework', page: 'homework' as const, icon: BookOpen, color: 'text-violet-700 bg-violet-50 dark:bg-violet-950/60' },
    { label: 'Exam & Marks', page: 'exams' as const, icon: FileSpreadsheet, color: 'text-indigo-700 bg-indigo-50 dark:bg-indigo-950/60' },
    { label: 'Class Timetable', page: 'timetable' as const, icon: CalendarClock, color: 'text-amber-700 bg-amber-50 dark:bg-amber-950/60' },
    { label: 'Leave Requests', page: 'leaves' as const, icon: CalendarCheck, color: 'text-cyan-700 bg-cyan-50 dark:bg-cyan-950/60' },
    { label: 'Parent–Teacher Meetings', page: 'ptm' as const, icon: Users, color: 'text-rose-700 bg-rose-50 dark:bg-rose-950/60' },
  ].filter((act) => canVisitPage(act.page));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-sky-700 via-teal-700 to-emerald-700 text-white p-5 sm:p-6 shadow-md">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/15 text-[11px] font-semibold uppercase tracking-wider mb-2">
          <GraduationCap className="w-3.5 h-3.5" />
          Teacher Academic Workspace
        </span>
        <h1 className="text-xl sm:text-2xl font-bold">Welcome back, {user.name}</h1>
        <p className="text-xs text-sky-100 mt-1">
          {myStaff?.department || 'Academic Faculty'} · {myStaff?.employeeCode || 'Faculty'} · Session {db.settings.sessionName}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-slate-500">Active Campus Students</div>
          <div className="text-2xl font-bold tabular-nums mt-1">{activeStudentsCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Across {db.classes.length} class sections</div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-slate-500">Present Today</div>
          <div className="text-2xl font-bold text-emerald-600 tabular-nums mt-1">{todayPresentCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Manual, Face &amp; Card scans</div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-slate-500">Homework Entries</div>
          <div className="text-2xl font-bold text-indigo-600 tabular-nums mt-1">{db.homework.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Daily class diary</div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-slate-500">Pending Tasks &amp; Leaves</div>
          <div className="text-2xl font-bold text-amber-600 tabular-nums mt-1">
            {db.tasks.filter((t) => t.status !== 'completed').length + db.leaves.filter((l) => l.status === 'pending').length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Academic items queued</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">Teacher Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {teacherQuickActions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.page}
                type="button"
                onClick={() => navigateTo(act.page)}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-teal-500 dark:hover:border-teal-600 bg-slate-50/50 dark:bg-slate-800/40 text-left transition-colors cursor-pointer"
              >
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${act.color}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                  {act.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
          <h2 className="text-sm font-bold">Assigned Subjects &amp; Syllabus</h2>
          <div className="space-y-2.5">
            {displaySubjects.map((sub) => (
              <div key={sub.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs space-y-1.5">
                <div className="flex justify-between font-bold">
                  <span>{sub.name} · {sub.className}</span>
                  <span className="font-mono text-teal-700">{sub.syllabusProgress}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div className="h-full bg-teal-600 rounded-full" style={{ width: `${sub.syllabusProgress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
          <h2 className="text-sm font-bold">Campus Notices</h2>
          <div className="space-y-2">
            {db.notices
              .filter((n) => n.audience === 'All' || n.audience === 'Staff')
              .slice(0, 4)
              .map((n) => (
                <div key={n.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                  <div className="font-bold">{n.title}</div>
                  <p className="text-slate-500 mt-1">{n.body}</p>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
