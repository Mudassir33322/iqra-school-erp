import React, { useEffect, useState } from 'react';
import {
  Activity,
  CalendarCheck,
  Check,
  ClipboardCheck,
  FileDown,
  IdCard,
  Megaphone,
  MessageSquareWarning,
  Pencil,
  Printer,
  QrCode,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { exportIdCardsPdf } from '../utils/pdfExport';
import type {
  ComplaintItem,
  LeaveRequest,
  NoticeItem,
  TaskItem,
  TaskStatus,
  VisitorLog,
} from '../types/erp';

type OpsPage =
  | 'today-activity'
  | 'visitors'
  | 'complaints'
  | 'leaves'
  | 'tasks'
  | 'noticeboard'
  | 'id-cards';

export const OperationsView: React.FC<{ page: OpsPage }> = ({ page }) => {
  const { db, user, today, activeCampusId, canPerform, mutate, navigateTo, notify } = useErp();

  const canManageOps = canPerform('manage_operations');
  const canApproveLeave = canPerform('approve_leave');
  const canSubmitLeave = canPerform('submit_leave');
  const canManageComplaints = canPerform('manage_complaints');
  const canSubmitComplaint = canPerform('submit_complaint');
  const canManageNotices = canPerform('manage_notices');

  const isParent = user?.role === 'Parent';
  const isStudent = user?.role === 'Student';

  // Tasks state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('Salman Raza');
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  // Visitors state
  const [visitorName, setVisitorName] = useState('');
  const [visitorPurpose, setVisitorPurpose] = useState('');
  const [visitorMeeting, setVisitorMeeting] = useState('Admin Office');
  const [editingVisitor, setEditingVisitor] = useState<VisitorLog | null>(null);

  // Noticeboard state
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeBody, setNoticeBody] = useState('');
  const [noticeAudience, setNoticeAudience] = useState<'All' | 'Parents' | 'Staff' | 'Students'>('All');
  const [editingNotice, setEditingNotice] = useState<NoticeItem | null>(null);

  // Leaves state
  const [leaveName, setLeaveName] = useState('');
  const [leaveType, setLeaveType] = useState<'Student' | 'Staff'>('Student');
  const [leaveRole, setLeaveRole] = useState('Grade 9 - Science');
  const [leaveFrom, setLeaveFrom] = useState(today);
  const [leaveTo, setLeaveTo] = useState(today);
  const [leaveReason, setLeaveReason] = useState('');
  const [editingLeave, setEditingLeave] = useState<LeaveRequest | null>(null);

  // Complaints state
  const [cmpParent, setCmpParent] = useState('');
  const [cmpStudent, setCmpStudent] = useState('');
  const [cmpSubject, setCmpSubject] = useState('');
  const [cmpDesc, setCmpDesc] = useState('');
  const [editingComplaint, setEditingComplaint] = useState<ComplaintItem | null>(null);

  const [idCardType, setIdCardType] = useState<'student' | 'staff'>('student');
  const [idCardClassFilter, setIdCardClassFilter] = useState('all');
  const [idCardSearch, setIdCardSearch] = useState('');
  const [qrUrlMap, setQrUrlMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (page !== 'id-cards' || !db) return;
    let active = true;
    const codes = [
      ...db.students.filter((s) => s.status === 'active').map((s) => s.studentCode),
      ...db.staff.filter((s) => s.status === 'active').map((s) => s.employeeCode),
    ];
    void (async () => {
      try {
        const QRCode = (await import('qrcode')).default;
        const next: Record<string, string> = {};
        for (const code of codes) {
          next[code] = await QRCode.toDataURL(`QR:${code}`, { width: 96, margin: 1 });
        }
        if (active) setQrUrlMap(next);
      } catch {
        // Fallback icon displayed if QR lib unavailable
      }
    })();
    return () => {
      active = false;
    };
  }, [page, db]);

  if (!db) return null;

  const filterCampus = <T extends { campusId: string }>(arr: T[]) =>
    arr.filter((item) => activeCampusId === 'all' || item.campusId === activeCampusId);

  const campusIdForNew = activeCampusId === 'all' ? db.campuses[0]?.id : activeCampusId;

  if (page === 'today-activity') {
    const todayLedger = filterCampus(db.ledger).filter((l) => l.date === today);
    const todayVisitors = filterCampus(db.visitors).filter((v) => v.date === today);
    const todayAtt = filterCampus(db.attendance).filter((a) => a.date === today);

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Today&apos;s Activity</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Live log for {today}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer no-print"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            <span>Print Summary</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
            <h2 className="text-sm font-bold mb-3">Attendance Submissions Today</h2>
            <p className="text-2xl font-bold tabular-nums text-teal-700 dark:text-teal-400">
              {todayAtt.length} records
            </p>
          </div>
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
            <h2 className="text-sm font-bold mb-3">Gate Visitors Today</h2>
            <p className="text-2xl font-bold tabular-nums text-blue-700 dark:text-blue-400">
              {todayVisitors.length} check-ins
            </p>
          </div>
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
            <h2 className="text-sm font-bold mb-3">Financial Transactions Today</h2>
            <p className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
              {todayLedger.length} entries
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (page === 'visitors') {
    const visitors = filterCampus(db.visitors);
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Gate &amp; Visitors</h1>
              <p className="text-xs text-slate-500">Log campus visitors, edit entries, and track check-out times</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer no-print"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            <span>Print Visitor Log</span>
          </button>
        </div>

        {canManageOps && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await mutate(
                '/api/operations/visitors',
                'POST',
                {
                  campusId: campusIdForNew,
                  visitorName,
                  purpose: visitorPurpose,
                  meetingWith: visitorMeeting,
                },
                'Visitor checked in.'
              );
              if (res.ok) {
                setVisitorName('');
                setVisitorPurpose('');
              }
            }}
            className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs"
          >
            <input
              required
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
              placeholder="Visitor full name *"
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <input
              required
              value={visitorPurpose}
              onChange={(e) => setVisitorPurpose(e.target.value)}
              placeholder="Purpose of visit *"
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <input
              value={visitorMeeting}
              onChange={(e) => setVisitorMeeting(e.target.value)}
              placeholder="Meeting with"
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <button type="submit" className="px-4 py-2 rounded-xl bg-teal-700 text-white font-semibold cursor-pointer">
              + Check In Visitor
            </button>
          </form>
        )}

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <th className="py-3 px-4">Visitor</th>
                <th className="py-3 px-4">Purpose</th>
                <th className="py-3 px-4">Meeting With</th>
                <th className="py-3 px-4">In Time</th>
                <th className="py-3 px-4">Out Time</th>
                {canManageOps && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {visitors.map((v) => (
                <tr key={v.id}>
                  <td className="py-3 px-4 font-semibold">{v.visitorName}</td>
                  <td className="py-3 px-4">{v.purpose}</td>
                  <td className="py-3 px-4">{v.meetingWith}</td>
                  <td className="py-3 px-4 font-mono">{v.inTime}</td>
                  <td className="py-3 px-4 font-mono">
                    {v.outTime ||
                      (canManageOps ? (
                        <button
                          type="button"
                          onClick={() =>
                            void mutate(`/api/operations/visitors/${v.id}/checkout`, 'PATCH', {}, 'Visitor checked out.')
                          }
                          className="px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-slate-700 text-white text-[11px] font-semibold cursor-pointer"
                        >
                          Check Out
                        </button>
                      ) : (
                        'On Campus'
                      ))}
                  </td>
                  {canManageOps && (
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setEditingVisitor(v)}
                        aria-label={`Edit visitor ${v.visitorName}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void mutate(`/api/operations/visitors/${v.id}`, 'DELETE', undefined, 'Deleted visitor record.')
                        }
                        aria-label={`Delete visitor ${v.visitorName}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editingVisitor && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-bold">Edit Visitor Log</h3>
                <button type="button" onClick={() => setEditingVisitor(null)} aria-label="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await mutate(
                    `/api/operations/visitors/${editingVisitor.id}`,
                    'PATCH',
                    {
                      visitorName: editingVisitor.visitorName,
                      purpose: editingVisitor.purpose,
                      meetingWith: editingVisitor.meetingWith,
                    },
                    'Updated visitor record.'
                  );
                  if (res.ok) setEditingVisitor(null);
                }}
                className="mt-4 space-y-3 text-xs"
              >
                <div>
                  <label className="block font-semibold mb-1">Visitor Name *</label>
                  <input
                    required
                    value={editingVisitor.visitorName}
                    onChange={(e) => setEditingVisitor({ ...editingVisitor, visitorName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Purpose *</label>
                  <input
                    required
                    value={editingVisitor.purpose}
                    onChange={(e) => setEditingVisitor({ ...editingVisitor, purpose: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Meeting With</label>
                  <input
                    value={editingVisitor.meetingWith}
                    onChange={(e) => setEditingVisitor({ ...editingVisitor, meetingWith: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setEditingVisitor(null)} className="px-4 py-2 rounded-xl border border-slate-200">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 rounded-xl bg-teal-700 text-white font-semibold cursor-pointer">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (page === 'tasks') {
    const tasks = filterCampus(db.tasks);
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Task Management</h1>
              <p className="text-xs text-slate-500">Assign, edit, and track operational tasks across staff</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer no-print"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            <span>Print Tasks</span>
          </button>
        </div>

        {canManageOps && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await mutate(
                '/api/operations/tasks',
                'POST',
                { campusId: campusIdForNew, title: taskTitle, assignee: taskAssignee },
                'Task created.'
              );
              if (res.ok) setTaskTitle('');
            }}
            className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap gap-3 text-xs"
          >
            <input
              required
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Describe task..."
              className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <input
              required
              value={taskAssignee}
              onChange={(e) => setTaskAssignee(e.target.value)}
              placeholder="Assignee"
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <button type="submit" className="px-4 py-2 rounded-xl bg-teal-700 text-white font-semibold cursor-pointer">
              + Assign Task
            </button>
          </form>
        )}

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
          {tasks.map((t) => (
            <div key={t.id} className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <div className="font-bold text-slate-900 dark:text-white">{t.title}</div>
                <div className="text-slate-500 mt-0.5">
                  Assigned to {t.assignee} · Due {t.dueDate}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canManageOps ? (
                  <>
                    <select
                      aria-label={`Status for ${t.title}`}
                      value={t.status}
                      onChange={(e) =>
                        void mutate(
                          `/api/operations/tasks/${t.id}`,
                          'PATCH',
                          { status: e.target.value as TaskStatus },
                          'Updated task status.'
                        )
                      }
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                      <option value="returned">Returned</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setEditingTask(t)}
                      aria-label={`Edit task ${t.title}`}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void mutate(`/api/operations/tasks/${t.id}`, 'DELETE', undefined, 'Deleted task.')
                      }
                      aria-label={`Delete task ${t.title}`}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <span className="font-bold capitalize text-teal-700 dark:text-teal-400">{t.status}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {editingTask && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-bold">Edit Task</h3>
                <button type="button" onClick={() => setEditingTask(null)} aria-label="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await mutate(
                    `/api/operations/tasks/${editingTask.id}`,
                    'PATCH',
                    {
                      title: editingTask.title,
                      assignee: editingTask.assignee,
                      dueDate: editingTask.dueDate,
                      priority: editingTask.priority,
                    },
                    'Updated task.'
                  );
                  if (res.ok) setEditingTask(null);
                }}
                className="mt-4 space-y-3 text-xs"
              >
                <div>
                  <label className="block font-semibold mb-1">Task Title *</label>
                  <input
                    required
                    value={editingTask.title}
                    onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Assignee *</label>
                    <input
                      required
                      value={editingTask.assignee}
                      onChange={(e) => setEditingTask({ ...editingTask, assignee: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Due Date</label>
                    <input
                      type="date"
                      value={editingTask.dueDate}
                      onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setEditingTask(null)} className="px-4 py-2 rounded-xl border border-slate-200">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 rounded-xl bg-teal-700 text-white font-semibold cursor-pointer">
                    Save Task
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (page === 'leaves') {
    const leaves = filterCampus(db.leaves);
    const defaultChild = db.students[0];
    const effectiveLeaveName =
      isStudent
        ? defaultChild?.name || user?.name || ''
        : isParent
          ? leaveName || defaultChild?.name || ''
          : leaveName;
    const selectedChildObj = isParent
      ? db.students.find((s) => s.name === effectiveLeaveName) || defaultChild
      : defaultChild;

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-400 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Leave Management</h1>
              <p className="text-xs text-slate-500">
                {canApproveLeave
                  ? 'Submit, edit, approve, or delete student & staff leave requests'
                  : 'Apply for leave and track approval status'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer no-print"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            <span>Print Leave Log</span>
          </button>
        </div>

        {canSubmitLeave && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const resolvedName = isParent || isStudent ? effectiveLeaveName : leaveName;
              const resolvedType: 'Student' | 'Staff' = isParent || isStudent ? 'Student' : leaveType;
              const resolvedRole =
                isParent || isStudent
                  ? `${selectedChildObj?.className || 'Student'} - ${selectedChildObj?.sectionName || 'A'}`
                  : leaveRole;

              const res = await mutate(
                '/api/operations/leaves',
                'POST',
                {
                  campusId: selectedChildObj?.campusId || campusIdForNew,
                  applicantName: resolvedName,
                  applicantType: resolvedType,
                  classOrRole: resolvedRole,
                  fromDate: leaveFrom,
                  toDate: leaveTo,
                  reason: leaveReason,
                },
                'Leave request submitted.'
              );
              if (res.ok) {
                setLeaveName('');
                setLeaveReason('');
              }
            }}
            className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 grid grid-cols-1 sm:grid-cols-6 gap-2.5 text-xs"
          >
            {isParent ? (
              <select
                aria-label="Select Child"
                value={effectiveLeaveName}
                onChange={(e) => setLeaveName(e.target.value)}
                className="sm:col-span-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
              >
                {db.students.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} ({s.className} · {s.sectionName})
                  </option>
                ))}
              </select>
            ) : isStudent ? (
              <input
                readOnly
                value={`${effectiveLeaveName} (${selectedChildObj?.className || 'Student'})`}
                className="sm:col-span-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
              />
            ) : (
              <>
                <input
                  required
                  value={leaveName}
                  onChange={(e) => setLeaveName(e.target.value)}
                  placeholder="Applicant name *"
                  className="sm:col-span-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as 'Student' | 'Staff')}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="Student">Student</option>
                  <option value="Staff">Staff</option>
                </select>
                <input
                  value={leaveRole}
                  onChange={(e) => setLeaveRole(e.target.value)}
                  placeholder="Class / Role"
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </>
            )}
            {(isParent || isStudent) && (
              <>
                <input
                  type="date"
                  aria-label="Leave from date"
                  value={leaveFrom}
                  onChange={(e) => setLeaveFrom(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="date"
                  aria-label="Leave to date"
                  value={leaveTo}
                  onChange={(e) => setLeaveTo(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </>
            )}
            <input
              required
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              placeholder="Leave reason *"
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <button type="submit" className="px-4 py-2 rounded-xl bg-teal-700 text-white font-semibold cursor-pointer">
              + Apply Leave
            </button>
          </form>
        )}

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
          {leaves.map((l) => (
            <div key={l.id} className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <div className="font-bold text-slate-900 dark:text-white">
                  {l.applicantName} · {l.applicantType} ({l.classOrRole})
                </div>
                <div className="text-slate-500 mt-0.5">
                  {l.fromDate} to {l.toDate} — {l.reason}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {l.status === 'pending' && canApproveLeave ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        void mutate(`/api/operations/leaves/${l.id}`, 'PATCH', { status: 'approved' }, 'Leave approved.')
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void mutate(`/api/operations/leaves/${l.id}`, 'PATCH', { status: 'rejected' }, 'Leave rejected.')
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </>
                ) : (
                  <span
                    className={`font-bold capitalize ${
                      l.status === 'approved'
                        ? 'text-emerald-600'
                        : l.status === 'rejected'
                          ? 'text-rose-600'
                          : 'text-amber-600'
                    }`}
                  >
                    {l.status}
                  </span>
                )}
                {canApproveLeave && (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditingLeave(l)}
                      aria-label={`Edit leave ${l.applicantName}`}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void mutate(`/api/operations/leaves/${l.id}`, 'DELETE', undefined, 'Deleted leave request.')
                      }
                      aria-label={`Delete leave ${l.applicantName}`}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {editingLeave && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-bold">Edit Leave Request</h3>
                <button type="button" onClick={() => setEditingLeave(null)} aria-label="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await mutate(
                    `/api/operations/leaves/${editingLeave.id}`,
                    'PATCH',
                    {
                      applicantName: editingLeave.applicantName,
                      classOrRole: editingLeave.classOrRole,
                      fromDate: editingLeave.fromDate,
                      toDate: editingLeave.toDate,
                      reason: editingLeave.reason,
                    },
                    'Updated leave request.'
                  );
                  if (res.ok) setEditingLeave(null);
                }}
                className="mt-4 space-y-3 text-xs"
              >
                <div>
                  <label className="block font-semibold mb-1">Applicant *</label>
                  <input
                    required
                    value={editingLeave.applicantName}
                    onChange={(e) => setEditingLeave({ ...editingLeave, applicantName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Reason *</label>
                  <input
                    required
                    value={editingLeave.reason}
                    onChange={(e) => setEditingLeave({ ...editingLeave, reason: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setEditingLeave(null)} className="px-4 py-2 rounded-xl border border-slate-200">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 rounded-xl bg-teal-700 text-white font-semibold cursor-pointer">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (page === 'complaints') {
    const complaints = filterCampus(db.complaints);
    const effectiveCmpParent = isParent ? user?.name || '' : cmpParent;
    const effectiveCmpStudent = isParent
      ? cmpStudent || db.students[0]?.name || ''
      : cmpStudent;

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 flex items-center justify-center">
              <MessageSquareWarning className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Parent Complaints</h1>
              <p className="text-xs text-slate-500">
                {canManageComplaints
                  ? 'Log, update, and resolve parent concerns'
                  : 'Submit a concern or complaint to school administration'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer no-print"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            <span>Print Complaints</span>
          </button>
        </div>

        {(canSubmitComplaint || canManageComplaints) && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await mutate(
                '/api/operations/complaints',
                'POST',
                {
                  campusId: campusIdForNew,
                  parentName: effectiveCmpParent,
                  studentName: effectiveCmpStudent,
                  subject: cmpSubject,
                  description: cmpDesc,
                },
                'Logged parent complaint.'
              );
              if (res.ok) {
                if (!isParent) setCmpParent('');
                setCmpStudent('');
                setCmpSubject('');
                setCmpDesc('');
              }
            }}
            className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-xs"
          >
            <input
              required
              readOnly={isParent}
              value={effectiveCmpParent}
              onChange={(e) => setCmpParent(e.target.value)}
              placeholder="Parent name *"
              className={`px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 ${
                isParent ? 'bg-slate-50 dark:bg-slate-800 font-semibold' : 'bg-white dark:bg-slate-800'
              }`}
            />
            {isParent ? (
              <select
                aria-label="Select Child"
                value={effectiveCmpStudent}
                onChange={(e) => setCmpStudent(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                {db.students.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} ({s.className})
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={cmpStudent}
                onChange={(e) => setCmpStudent(e.target.value)}
                placeholder="Student name"
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            )}
            <input
              required
              value={cmpSubject}
              onChange={(e) => setCmpSubject(e.target.value)}
              placeholder="Complaint subject *"
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <input
              value={cmpDesc}
              onChange={(e) => setCmpDesc(e.target.value)}
              placeholder="Details"
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <button type="submit" className="px-4 py-2 rounded-xl bg-teal-700 text-white font-semibold cursor-pointer">
              + Log Complaint
            </button>
          </form>
        )}

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
          {complaints.map((c) => (
            <div key={c.id} className="p-4 flex flex-wrap items-start justify-between gap-4 text-xs">
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">{c.subject}</div>
                <div className="text-slate-500 mt-0.5">
                  From {c.parentName} (Parent of {c.studentName}) · {c.submittedDate}
                </div>
                <p className="text-slate-600 dark:text-slate-300 mt-2">{c.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {c.status !== 'resolved' && canManageComplaints ? (
                  <button
                    type="button"
                    onClick={() =>
                      void mutate(`/api/operations/complaints/${c.id}`, 'PATCH', { status: 'resolved' }, 'Complaint marked resolved.')
                    }
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold cursor-pointer"
                  >
                    Mark Resolved
                  </button>
                ) : (
                  <span
                    className={`font-bold capitalize ${
                      c.status === 'resolved' ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {c.status.replace('_', ' ')}
                  </span>
                )}
                {canManageComplaints && (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditingComplaint(c)}
                      aria-label={`Edit complaint ${c.subject}`}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void mutate(`/api/operations/complaints/${c.id}`, 'DELETE', undefined, 'Deleted complaint.')
                      }
                      aria-label={`Delete complaint ${c.subject}`}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {editingComplaint && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-bold">Edit Complaint</h3>
                <button type="button" onClick={() => setEditingComplaint(null)} aria-label="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await mutate(
                    `/api/operations/complaints/${editingComplaint.id}`,
                    'PATCH',
                    {
                      subject: editingComplaint.subject,
                      description: editingComplaint.description,
                      status: editingComplaint.status,
                    },
                    'Updated complaint.'
                  );
                  if (res.ok) setEditingComplaint(null);
                }}
                className="mt-4 space-y-3 text-xs"
              >
                <div>
                  <label className="block font-semibold mb-1">Subject *</label>
                  <input
                    required
                    value={editingComplaint.subject}
                    onChange={(e) => setEditingComplaint({ ...editingComplaint, subject: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={editingComplaint.description}
                    onChange={(e) => setEditingComplaint({ ...editingComplaint, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setEditingComplaint(null)} className="px-4 py-2 rounded-xl border border-slate-200">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 rounded-xl bg-teal-700 text-white font-semibold cursor-pointer">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (page === 'id-cards') {
    const q = idCardSearch.trim().toLowerCase();
    const students = filterCampus(db.students).filter(
      (s) =>
        s.status === 'active' &&
        (idCardClassFilter === 'all' || s.classId === idCardClassFilter) &&
        (!q || s.name.toLowerCase().includes(q) || s.studentCode.toLowerCase().includes(q) || s.className.toLowerCase().includes(q))
    );
    const staffMembers = filterCampus(db.staff).filter(
      (s) =>
        s.status === 'active' &&
        (!q || s.name.toLowerCase().includes(q) || s.employeeCode.toLowerCase().includes(q) || s.role.toLowerCase().includes(q))
    );
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 flex items-center justify-center">
              <IdCard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">ID Card Printing</h1>
              <p className="text-xs text-slate-500">
                Printable Student &amp; Staff ID Cards with Barcode / QR scan IDs ({idCardType === 'student' ? students.length : staffMembers.length} ready)
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 no-print">
            <input
              value={idCardSearch}
              onChange={(e) => setIdCardSearch(e.target.value)}
              placeholder="Search name or code..."
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
            {idCardType === 'student' && (
              <select
                aria-label="Filter ID cards by class"
                value={idCardClassFilter}
                onChange={(e) => setIdCardClassFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              >
                <option value="all">All Classes</option>
                {filterCampus(db.classes).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.className} ({c.sectionName})
                  </option>
                ))}
              </select>
            )}
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setIdCardType('student')}
                className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                  idCardType === 'student' ? 'bg-white dark:bg-slate-700 shadow-2xs' : 'text-slate-500'
                }`}
              >
                Student ID Cards
              </button>
              <button
                type="button"
                onClick={() => setIdCardType('staff')}
                className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                  idCardType === 'staff' ? 'bg-white dark:bg-slate-700 shadow-2xs' : 'text-slate-500'
                }`}
              >
                Staff ID Cards
              </button>
            </div>
            <button
              type="button"
              onClick={() => navigateTo('card-attendance')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-blue-600" />
              <span>Open Card Scanner</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                const cards =
                  idCardType === 'student'
                    ? students.map((s) => ({
                        code: s.studentCode,
                        name: s.name,
                        subLine: `S/D of ${s.fatherName}`,
                        secondaryLine: `${s.className} · ${s.sectionName}`,
                        phone: s.parentPhone,
                        roleLabel: 'Student Card',
                      }))
                    : staffMembers.map((stf) => ({
                        code: stf.employeeCode,
                        name: stf.name,
                        subLine: stf.department,
                        secondaryLine: stf.role,
                        phone: stf.phone,
                        roleLabel: 'Staff Card',
                      }));
                await exportIdCardsPdf({
                  settings: db.settings,
                  cards,
                  cardKind: idCardType === 'student' ? 'Student' : 'Staff',
                  filename: `id-cards-${idCardType}-${today}.pdf`,
                });
                notify(`Exported ${cards.length} scannable ID card(s) as PDF.`, 'success');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-semibold cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>Download ID Cards PDF</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print ID Cards</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {idCardType === 'student'
            ? students.map((stu) => (
                <div
                  key={stu.id}
                  className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs"
                >
                  <div className="bg-teal-800 text-white px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold capitalize">{db.settings.schoolName}</div>
                      <div className="text-[10px] text-teal-200">Student Card · {db.settings.sessionName}</div>
                    </div>
                    <span className="font-mono text-xs font-bold">{stu.studentCode}</span>
                  </div>
                  <div className="p-4 flex items-center gap-3.5 text-xs">
                    {stu.faceAvatar ? (
                      <img
                        src={stu.faceAvatar}
                        alt={stu.name}
                        className="w-14 h-16 rounded-xl object-cover border border-teal-300 shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-lg text-teal-700 dark:text-teal-400 shrink-0">
                        {stu.name.charAt(0)}
                      </div>
                    )}
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{stu.name}</div>
                      <div className="text-slate-500">S/D of {stu.fatherName}</div>
                      <div className="font-semibold text-teal-700 dark:text-teal-400">
                        {stu.className} · {stu.sectionName}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500">{stu.parentPhone}</div>
                    </div>
                  </div>
                  <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {qrUrlMap[stu.studentCode] ? (
                        <img
                          src={qrUrlMap[stu.studentCode]}
                          alt={`QR code for ${stu.studentCode}`}
                          className="w-11 h-11 rounded border border-slate-200 dark:border-slate-700 bg-white p-0.5"
                        />
                      ) : (
                        <QrCode className="w-8 h-8 text-slate-400" />
                      )}
                      <div className="text-[10px] text-slate-500 leading-tight">
                        <div className="font-bold text-slate-700 dark:text-slate-200">Scan Gate QR</div>
                        <div className="font-mono">QR:{stu.studentCode}</div>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] font-bold text-teal-700 dark:text-teal-400">{stu.studentCode}</span>
                  </div>
                </div>
              ))
            : staffMembers.map((stf) => (
                <div
                  key={stf.id}
                  className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs"
                >
                  <div className="bg-indigo-800 text-white px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold capitalize">{db.settings.schoolName}</div>
                      <div className="text-[10px] text-indigo-200">Staff Identity Card</div>
                    </div>
                    <span className="font-mono text-xs font-bold">{stf.employeeCode}</span>
                  </div>
                  <div className="p-4 flex items-center gap-3.5 text-xs">
                    {stf.faceAvatar ? (
                      <img
                        src={stf.faceAvatar}
                        alt={stf.name}
                        className="w-14 h-16 rounded-xl object-cover border border-indigo-300 shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-16 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center font-bold text-lg text-indigo-700 dark:text-indigo-300 shrink-0">
                        {stf.name.charAt(0)}
                      </div>
                    )}
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{stf.name}</div>
                      <div className="font-semibold text-indigo-700 dark:text-indigo-400">{stf.role}</div>
                      <div className="text-slate-500">{stf.department}</div>
                      <div className="font-mono text-[11px] text-slate-500">{stf.phone}</div>
                    </div>
                  </div>
                  <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {qrUrlMap[stf.employeeCode] ? (
                        <img
                          src={qrUrlMap[stf.employeeCode]}
                          alt={`QR code for ${stf.employeeCode}`}
                          className="w-11 h-11 rounded border border-slate-200 dark:border-slate-700 bg-white p-0.5"
                        />
                      ) : (
                        <QrCode className="w-8 h-8 text-slate-400" />
                      )}
                      <div className="text-[10px] text-slate-500 leading-tight">
                        <div className="font-bold text-slate-700 dark:text-slate-200">Scan Gate QR</div>
                        <div className="font-mono">QR:{stf.employeeCode}</div>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] font-bold text-indigo-700 dark:text-indigo-400">{stf.employeeCode}</span>
                  </div>
                </div>
              ))}
        </div>
      </div>
    );
  }

  // NOTICEBOARD
  const notices = filterCampus(db.notices);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 flex items-center justify-center">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">School Noticeboard</h1>
            <p className="text-xs text-slate-500">Publish, edit, and remove announcements for parents, teachers, and students</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer no-print"
        >
          <Printer className="w-3.5 h-3.5 text-blue-600" />
          <span>Print Notices</span>
        </button>
      </div>

      {canManageNotices && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await mutate(
              '/api/operations/notices',
              'POST',
              { campusId: campusIdForNew, title: noticeTitle, body: noticeBody, audience: noticeAudience },
              'Notice published.'
            );
            if (res.ok) {
              setNoticeTitle('');
              setNoticeBody('');
            }
          }}
          className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3 text-xs"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              required
              value={noticeTitle}
              onChange={(e) => setNoticeTitle(e.target.value)}
              placeholder="Announcement headline *"
              className="sm:col-span-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <select
              value={noticeAudience}
              onChange={(e) => setNoticeAudience(e.target.value as 'All' | 'Parents' | 'Staff' | 'Students')}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              <option>All</option>
              <option>Parents</option>
              <option>Staff</option>
              <option>Students</option>
            </select>
          </div>
          <textarea
            required
            rows={2}
            value={noticeBody}
            onChange={(e) => setNoticeBody(e.target.value)}
            placeholder="Announcement details..."
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
          <button type="submit" className="px-4 py-2 rounded-xl bg-teal-700 text-white font-semibold cursor-pointer">
            Publish Notice
          </button>
        </form>
      )}

      <div className="space-y-3">
        {notices.map((n) => (
          <div
            key={n.id}
            className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5"
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-teal-700 dark:text-teal-400">Audience: {n.audience}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono">{n.date}</span>
                {canManageNotices && (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditingNotice(n)}
                      aria-label={`Edit notice ${n.title}`}
                      className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void mutate(`/api/operations/notices/${n.id}`, 'DELETE', undefined, 'Deleted notice.')
                      }
                      aria-label={`Delete notice ${n.title}`}
                      className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mt-1">{n.title}</h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">{n.body}</p>
          </div>
        ))}
      </div>

      {editingNotice && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold">Edit Notice</h3>
              <button type="button" onClick={() => setEditingNotice(null)} aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await mutate(
                  `/api/operations/notices/${editingNotice.id}`,
                  'PATCH',
                  {
                    title: editingNotice.title,
                    audience: editingNotice.audience,
                    body: editingNotice.body,
                  },
                  'Updated notice.'
                );
                if (res.ok) setEditingNotice(null);
              }}
              className="mt-4 space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold mb-1">Headline *</label>
                <input
                  required
                  value={editingNotice.title}
                  onChange={(e) => setEditingNotice({ ...editingNotice, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Audience</label>
                <select
                  value={editingNotice.audience}
                  onChange={(e) =>
                    setEditingNotice({
                      ...editingNotice,
                      audience: e.target.value as 'All' | 'Parents' | 'Staff' | 'Students',
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option>All</option>
                  <option>Parents</option>
                  <option>Staff</option>
                  <option>Students</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Body *</label>
                <textarea
                  required
                  rows={3}
                  value={editingNotice.body}
                  onChange={(e) => setEditingNotice({ ...editingNotice, body: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingNotice(null)} className="px-4 py-2 rounded-xl border border-slate-200">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-teal-700 text-white font-semibold cursor-pointer">
                  Save Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
