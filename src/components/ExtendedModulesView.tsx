import React, { useEffect, useState } from 'react';
import {
  Activity,
  Award,
  BookMarked,
  BookOpen,
  Bus,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Download,
  FileDown,
  HeartPulse,
  Hotel,
  MessageSquare,
  Package,
  Pencil,
  Plus,
  Printer,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import type {
  CalendarEvent,
  CalendarEventCategory,
  HealthRecord,
  HomeworkItem,
  HostelRoom,
  InventoryItem,
  LibraryBook,
  MessageLog,
  PtmSchedule,
  TimetableSlot,
  TransportRoute,
} from '../types/erp';
import { computeDashboardSummary, formatCurrency, interpolateMessageTemplate } from '../utils/erpLogic';
import { exportCertificatePdf, exportTableToPdf } from '../utils/pdfExport';

type ExtendedPage =
  | 'timetable'
  | 'homework'
  | 'health'
  | 'inventory'
  | 'library'
  | 'transport'
  | 'hostel'
  | 'messaging'
  | 'ptm'
  | 'certification'
  | 'calendar'
  | 'reports';

export const ExtendedModulesView: React.FC<{ page: ExtendedPage }> = ({ page }) => {
  const { user, db, today, activeCampusId, activeSubTab, showAmounts, mutate, navigateTo, canPerform, canVisitPage } = useErp();

  const canTimetable = canPerform('manage_timetable');
  const canHomework = canPerform('manage_homework');
  const canOperations = canPerform('manage_operations');
  const canInventory = canPerform('manage_fees');
  const canLibrary = canPerform('manage_library');
  const canTransport = canPerform('manage_transport');
  const canPtm = canPerform('manage_ptm');
  const canCalendar = canPerform('manage_calendar');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [calendarCatFilter, setCalendarCatFilter] = useState<'all' | CalendarEventCategory>('all');

  // Shared flexible form fields
  const [f1, setF1] = useState('');
  const [f2, setF2] = useState('');
  const [f3, setF3] = useState('');
  const [f4, setF4] = useState('');
  const [f5, setF5] = useState('');
  const [f6, setF6] = useState('');
  const [f7, setF7] = useState('');

  // Certification state
  type CertTypeKey = 'tc' | 'character' | 'bonafide' | 'provisional' | 'merit' | 'clearance' | 'experience' | 'admit';
  const [certType, setCertType] = useState<CertTypeKey>('tc');
  const [certStudentId, setCertStudentId] = useState('');
  const [certStaffId, setCertStaffId] = useState('');
  const [certExamId, setCertExamId] = useState('');
  const [certMeritTitle, setCertMeritTitle] = useState('1st Position Holder — Annual Academic Excellence');
  const [certRemarks, setCertRemarks] = useState('Exemplary conduct, discipline, and satisfactory academic progress.');

  // Smart Messaging state
  const [msgAudiencePreset, setMsgAudiencePreset] = useState<'all_parents' | 'defaulters' | 'absent_today' | 'class' | 'all_staff' | 'custom'>('all_parents');
  const [msgClassId, setMsgClassId] = useState('');
  const [msgTemplateKey, setMsgTemplateKey] = useState<'custom' | 'feeReminder' | 'absentAlert' | 'gateCheckIn' | 'examPublished'>('custom');

  useEffect(() => {
    if (
      page === 'certification' &&
      (activeSubTab === 'admit' ||
        activeSubTab === 'tc' ||
        activeSubTab === 'character' ||
        activeSubTab === 'bonafide' ||
        activeSubTab === 'provisional' ||
        activeSubTab === 'merit' ||
        activeSubTab === 'clearance' ||
        activeSubTab === 'experience')
    ) {
      setCertType(activeSubTab);
    }
  }, [page, activeSubTab]);

  if (!db) return null;

  const currency = db.settings.currency || 'Rs';
  const campusMatch = (cid: string) => activeCampusId === 'all' || cid === activeCampusId;
  const campusName =
    activeCampusId === 'all'
      ? 'All Campuses'
      : db.campuses.find((c) => c.id === activeCampusId)?.name || 'Main Campus';
  const targetCampus = activeCampusId === 'all' ? 'campus-main' : activeCampusId;
  const q = search.trim().toLowerCase();

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  // ==================== 1. TIMETABLE ====================
  if (page === 'timetable') {
    const items = db.timetable.filter(
      (t) =>
        campusMatch(t.campusId) &&
        (!q ||
          t.className.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.teacherName.toLowerCase().includes(q) ||
          t.day.toLowerCase().includes(q))
    );

    const openNew = () => {
      setEditingId(null);
      setF1(db.classes[0] ? `${db.classes[0].className} (${db.classes[0].sectionName})` : 'Grade 9 (Science)');
      setF2('Monday');
      setF3('08:00 - 08:45');
      setF4('');
      setF5('');
      setF6('Room 101');
      setModalOpen(true);
    };

    const openEdit = (slot: TimetableSlot) => {
      setEditingId(slot.id);
      setF1(slot.className);
      setF2(slot.day);
      setF3(slot.timeSlot);
      setF4(slot.subject);
      setF5(slot.teacherName);
      setF6(slot.room);
      setModalOpen(true);
    };

    const save = async (e: React.FormEvent) => {
      e.preventDefault();
      const payload = {
        campusId: targetCampus,
        className: f1.trim(),
        day: f2.trim(),
        timeSlot: f3.trim(),
        subject: f4.trim(),
        teacherName: f5.trim(),
        room: f6.trim(),
      };
      const res = editingId
        ? await mutate(`/api/modules/timetable/${editingId}`, 'PATCH', payload, 'Timetable slot updated.')
        : await mutate('/api/modules/timetable', 'POST', payload, 'Timetable slot added.');
      if (res.ok) closeModal();
    };

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-teal-700 dark:text-teal-400" />
              <span>Timetable Management</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Weekly class periods, subject allocations, and assigned teachers.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Filter class, day or teacher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs w-52"
            />
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer no-print"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>Print Timetable</span>
            </button>
            {canTimetable && (
              <button
                type="button"
                onClick={openNew}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer no-print"
              >
                <Plus className="w-4 h-4" />
                <span>Add Timetable Slot</span>
              </button>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500">
                  <th className="py-3 px-4 font-semibold">Day</th>
                  <th className="py-3 px-4 font-semibold">Time Slot</th>
                  <th className="py-3 px-4 font-semibold">Class</th>
                  <th className="py-3 px-4 font-semibold">Subject</th>
                  <th className="py-3 px-4 font-semibold">Teacher</th>
                  <th className="py-3 px-4 font-semibold">Room</th>
                  {canTimetable && <th className="py-3 px-4 font-semibold text-right no-print">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-semibold text-teal-700 dark:text-teal-400">{item.day}</td>
                    <td className="py-3 px-4 font-mono tabular-nums">{item.timeSlot}</td>
                    <td className="py-3 px-4 font-semibold">{item.className}</td>
                    <td className="py-3 px-4">{item.subject}</td>
                    <td className="py-3 px-4">{item.teacherName}</td>
                    <td className="py-3 px-4 font-mono">{item.room}</td>
                    {canTimetable && (
                      <td className="py-3 px-4 text-right no-print">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            aria-label={`Edit ${item.subject} ${item.day}`}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void mutate(`/api/modules/timetable/${item.id}`, 'DELETE', undefined, 'Timetable slot deleted.')}
                            aria-label={`Delete ${item.subject} ${item.day}`}
                            className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      No timetable slots found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {modalOpen && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <form onSubmit={save} className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-bold">{editingId ? 'Edit Timetable Slot' : 'Add Timetable Slot'}</h2>
                <button type="button" onClick={closeModal} aria-label="Close modal" className="p-1 text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Class *</label>
                  <input required value={f1} onChange={(e) => setF1(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Day *</label>
                  <select value={f2} onChange={(e) => setF2(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Time Slot *</label>
                  <input required value={f3} onChange={(e) => setF3(e.target.value)} placeholder="08:00 - 08:45" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Room *</label>
                  <input required value={f6} onChange={(e) => setF6(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Subject *</label>
                  <input required value={f4} onChange={(e) => setF4(e.target.value)} placeholder="e.g. Mathematics" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Teacher *</label>
                  <input required value={f5} onChange={(e) => setF5(e.target.value)} placeholder="e.g. Tariq Mehmood" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold cursor-pointer">{editingId ? 'Save Changes' : 'Save Slot'}</button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // ==================== 2. HOMEWORK DIARY ====================
  if (page === 'homework') {
    const items = db.homework.filter(
      (h) =>
        campusMatch(h.campusId) &&
        (!q ||
          h.className.toLowerCase().includes(q) ||
          h.subject.toLowerCase().includes(q) ||
          h.title.toLowerCase().includes(q))
    );

    const openNew = () => {
      setEditingId(null);
      setF1(db.classes[0] ? `${db.classes[0].className} (${db.classes[0].sectionName})` : 'Grade 9 (Science)');
      setF2('');
      setF3('');
      setF4(today);
      setF5(db.staff.find((s) => s.role === 'Teacher')?.name || 'Tariq Mehmood');
      setModalOpen(true);
    };

    const openEdit = (hw: HomeworkItem) => {
      setEditingId(hw.id);
      setF1(hw.className);
      setF2(hw.subject);
      setF3(hw.title);
      setF4(hw.dueDate);
      setF5(hw.assignedBy);
      setModalOpen(true);
    };

    const save = async (e: React.FormEvent) => {
      e.preventDefault();
      const payload = {
        campusId: targetCampus,
        className: f1.trim(),
        subject: f2.trim(),
        title: f3.trim(),
        dueDate: f4 || today,
        assignedBy: f5.trim(),
      };
      const res = editingId
        ? await mutate(`/api/modules/homework/${editingId}`, 'PATCH', payload, 'Homework updated.')
        : await mutate('/api/modules/homework', 'POST', payload, 'Homework assigned.');
      if (res.ok) closeModal();
    };

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Daily Homework Diary</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Assign daily classwork and homework tasks visible to students and parents.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search subject or topic..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs w-48"
            />
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer no-print"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>Print Diary</span>
            </button>
            {canHomework && (
              <button
                type="button"
                onClick={openNew}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer no-print"
              >
                <Plus className="w-4 h-4" />
                <span>Assign Homework</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((hw) => (
            <div key={hw.id} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold">
                    {hw.className} · {hw.subject}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-2">{hw.title}</h3>
                </div>
                {canHomework && (
                  <div className="flex items-center gap-1 shrink-0 no-print">
                    <button
                      type="button"
                      onClick={() => openEdit(hw)}
                      aria-label={`Edit ${hw.title}`}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void mutate(`/api/modules/homework/${hw.id}`, 'DELETE', undefined, 'Homework deleted.')}
                      aria-label={`Delete ${hw.title}`}
                      className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span>Teacher: <strong className="text-slate-700 dark:text-slate-300">{hw.assignedBy}</strong></span>
                <span className="font-mono tabular-nums">Due: {hw.dueDate}</span>
              </div>
            </div>
          ))}
        </div>

        {modalOpen && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <form onSubmit={save} className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-bold">{editingId ? 'Edit Homework' : 'Assign Homework'}</h2>
                <button type="button" onClick={closeModal} aria-label="Close modal" className="p-1 text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Class *</label>
                    <input required value={f1} onChange={(e) => setF1(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Subject *</label>
                    <input required value={f2} onChange={(e) => setF2(e.target.value)} placeholder="e.g. Mathematics" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Homework Task *</label>
                  <textarea required rows={3} value={f3} onChange={(e) => setF3(e.target.value)} placeholder="Chapter or exercise details..." className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Due Date *</label>
                    <input type="date" required value={f4} onChange={(e) => setF4(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Assigned By *</label>
                    <input required value={f5} onChange={(e) => setF5(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold cursor-pointer">{editingId ? 'Save Changes' : 'Assign Task'}</button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // ==================== 3. STUDENT HEALTH ====================
  if (page === 'health') {
    const items = db.healthRecords.filter(
      (r) =>
        campusMatch(r.campusId) &&
        (!q ||
          r.studentName.toLowerCase().includes(q) ||
          r.studentCode.toLowerCase().includes(q) ||
          r.conditionOrAllergy.toLowerCase().includes(q))
    );

    const openNew = () => {
      setEditingId(null);
      const s = db.students[0];
      setF1(s?.name || '');
      setF2(s?.studentCode || '');
      setF3('O+');
      setF4('None (Healthy)');
      setF5(today);
      setF6('');
      setModalOpen(true);
    };

    const openEdit = (rec: HealthRecord) => {
      setEditingId(rec.id);
      setF1(rec.studentName);
      setF2(rec.studentCode);
      setF3(rec.bloodGroup);
      setF4(rec.conditionOrAllergy);
      setF5(rec.lastCheckup);
      setF6(rec.notes);
      setModalOpen(true);
    };

    const save = async (e: React.FormEvent) => {
      e.preventDefault();
      const payload = {
        campusId: targetCampus,
        studentName: f1.trim(),
        studentCode: f2.trim(),
        bloodGroup: f3.trim(),
        conditionOrAllergy: f4.trim(),
        lastCheckup: f5 || today,
        notes: f6.trim(),
      };
      const res = editingId
        ? await mutate(`/api/modules/healthRecords/${editingId}`, 'PATCH', payload, 'Health record updated.')
        : await mutate('/api/modules/healthRecords', 'POST', payload, 'Health record added.');
      if (res.ok) closeModal();
    };

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-rose-600" />
              <span>Student Health &amp; Infirmary</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Blood groups, allergies, medical alerts, and checkup logs.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search student or allergy..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs w-48"
            />
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer no-print"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>Print Records</span>
            </button>
            {canOperations && (
              <button
                type="button"
                onClick={openNew}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer no-print"
              >
                <Plus className="w-4 h-4" />
                <span>Add Health Record</span>
              </button>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500">
                  <th className="py-3 px-4 font-semibold">Student</th>
                  <th className="py-3 px-4 font-semibold">Blood Group</th>
                  <th className="py-3 px-4 font-semibold">Condition / Allergy</th>
                  <th className="py-3 px-4 font-semibold">Last Checkup</th>
                  <th className="py-3 px-4 font-semibold">Notes</th>
                  {canOperations && <th className="py-3 px-4 font-semibold text-right no-print">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{r.studentName}</div>
                      <div className="text-[11px] font-mono text-slate-500">{r.studentCode}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-rose-600">{r.bloodGroup}</td>
                    <td className="py-3 px-4 font-medium">{r.conditionOrAllergy}</td>
                    <td className="py-3 px-4 font-mono tabular-nums">{r.lastCheckup}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{r.notes}</td>
                    {canOperations && (
                      <td className="py-3 px-4 text-right no-print">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            aria-label={`Edit ${r.studentName} health record`}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void mutate(`/api/modules/healthRecords/${r.id}`, 'DELETE', undefined, 'Health record deleted.')}
                            aria-label={`Delete ${r.studentName} health record`}
                            className="p-1.5 rounded-lg border border-rose-200 text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {modalOpen && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <form onSubmit={save} className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-bold">{editingId ? 'Edit Health Record' : 'Add Health Record'}</h2>
                <button type="button" onClick={closeModal} aria-label="Close modal" className="p-1 text-slate-400"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Student Name *</label>
                  <input required value={f1} onChange={(e) => setF1(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Student ID *</label>
                  <input required value={f2} onChange={(e) => setF2(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Blood Group *</label>
                  <input required value={f3} onChange={(e) => setF3(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Checkup Date *</label>
                  <input type="date" required value={f5} onChange={(e) => setF5(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold mb-1">Condition / Allergy *</label>
                  <input required value={f4} onChange={(e) => setF4(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold mb-1">Doctor / Infirmary Notes</label>
                  <textarea rows={2} value={f6} onChange={(e) => setF6(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold cursor-pointer">{editingId ? 'Save Changes' : 'Save Record'}</button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // ==================== 4. STOCK & INVENTORY ====================
  if (page === 'inventory') {
    const items = db.inventory.filter(
      (i) =>
        campusMatch(i.campusId) &&
        (!q || i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q) || i.category.toLowerCase().includes(q))
    );

    const openNew = () => {
      setEditingId(null);
      setF1(`SKU-${100 + db.inventory.length + 1}`);
      setF2('');
      setF3('Books & Stationery');
      setF4('25');
      setF5('500');
      setModalOpen(true);
    };

    const openEdit = (item: InventoryItem) => {
      setEditingId(item.id);
      setF1(item.sku);
      setF2(item.name);
      setF3(item.category);
      setF4(String(item.stockQty));
      setF5(String(item.unitPrice));
      setModalOpen(true);
    };

    const save = async (e: React.FormEvent) => {
      e.preventDefault();
      const payload = {
        campusId: targetCampus,
        sku: f1.trim(),
        name: f2.trim(),
        category: f3.trim(),
        stockQty: Math.max(0, Number(f4) || 0),
        unitPrice: Math.max(0, Number(f5) || 0),
      };
      const res = editingId
        ? await mutate(`/api/modules/inventory/${editingId}`, 'PATCH', payload, 'Inventory item updated.')
        : await mutate('/api/modules/inventory', 'POST', payload, 'Inventory item added.');
      if (res.ok) closeModal();
    };

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-600" />
              <span>Stock &amp; Inventory</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Track school uniforms, workbooks, lab consumables, and office stock.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search item or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs w-48"
            />
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer no-print"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>Print Stock Sheet</span>
            </button>
            {canInventory && (
              <button
                type="button"
                onClick={openNew}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer no-print"
              >
                <Plus className="w-4 h-4" />
                <span>Add Stock Item</span>
              </button>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500">
                  <th className="py-3 px-4 font-semibold">SKU</th>
                  <th className="py-3 px-4 font-semibold">Item Name</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold text-right">Stock Qty</th>
                  <th className="py-3 px-4 font-semibold text-right">Unit Price</th>
                  <th className="py-3 px-4 font-semibold text-right">Total Value</th>
                  {canInventory && <th className="py-3 px-4 font-semibold text-right no-print">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 px-4 font-mono text-slate-500">{item.sku}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{item.name}</td>
                    <td className="py-3 px-4">{item.category}</td>
                    <td className="py-3 px-4 text-right font-bold tabular-nums">{item.stockQty}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">{formatCurrency(item.unitPrice, currency, !showAmounts)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(item.stockQty * item.unitPrice, currency, !showAmounts)}
                    </td>
                    {canInventory && (
                      <td className="py-3 px-4 text-right no-print">
                        <div className="inline-flex items-center gap-1">
                          <button type="button" onClick={() => openEdit(item)} aria-label={`Edit ${item.name}`} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => void mutate(`/api/modules/inventory/${item.id}`, 'DELETE', undefined, 'Item removed.')} aria-label={`Delete ${item.name}`} className="p-1.5 rounded-lg border border-rose-200 text-rose-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {modalOpen && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <form onSubmit={save} className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-bold">{editingId ? 'Edit Stock Item' : 'Add Stock Item'}</h2>
                <button type="button" onClick={closeModal} aria-label="Close modal" className="p-1 text-slate-400"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">SKU *</label>
                  <input required value={f1} onChange={(e) => setF1(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Category *</label>
                  <input required value={f3} onChange={(e) => setF3(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold mb-1">Item Name *</label>
                  <input required value={f2} onChange={(e) => setF2(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Quantity *</label>
                  <input type="number" min={0} required value={f4} onChange={(e) => setF4(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Unit Price ({currency}) *</label>
                  <input type="number" min={0} required value={f5} onChange={(e) => setF5(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold cursor-pointer">{editingId ? 'Save Changes' : 'Add Item'}</button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // ==================== 5. LIBRARY ====================
  if (page === 'library') {
    const items = db.libraryBooks.filter(
      (b) =>
        campusMatch(b.campusId) &&
        (!q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.isbn.toLowerCase().includes(q))
    );

    const openNew = () => {
      setEditingId(null);
      setF1('978-0190000');
      setF2('');
      setF3('');
      setF4('5');
      setF5('');
      setF6('available');
      setModalOpen(true);
    };

    const openEdit = (book: LibraryBook) => {
      setEditingId(book.id);
      setF1(book.isbn);
      setF2(book.title);
      setF3(book.author);
      setF4(String(book.copiesAvailable));
      setF5(book.issuedTo || '');
      setF6(book.status);
      setModalOpen(true);
    };

    const save = async (e: React.FormEvent) => {
      e.preventDefault();
      const payload = {
        campusId: targetCampus,
        isbn: f1.trim(),
        title: f2.trim(),
        author: f3.trim(),
        copiesAvailable: Math.max(0, Number(f4) || 0),
        issuedTo: f5.trim(),
        status: (f6 === 'issued' ? 'issued' : 'available') as LibraryBook['status'],
      };
      const res = editingId
        ? await mutate(`/api/modules/libraryBooks/${editingId}`, 'PATCH', payload, 'Book record updated.')
        : await mutate('/api/modules/libraryBooks', 'POST', payload, 'Book added to library.');
      if (res.ok) closeModal();
    };

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-emerald-700" />
              <span>Library Catalog &amp; Circulation</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage school library books, available copies, and student issues/returns.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input type="text" placeholder="Search title, author or ISBN..." value={search} onChange={(e) => setSearch(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs w-52" />
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer no-print">
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>Print Catalog</span>
            </button>
            {canLibrary && (
              <button type="button" onClick={openNew} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer no-print">
                <Plus className="w-4 h-4" />
                <span>Add Book</span>
              </button>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500">
                  <th className="py-3 px-4 font-semibold">ISBN</th>
                  <th className="py-3 px-4 font-semibold">Title</th>
                  <th className="py-3 px-4 font-semibold">Author</th>
                  <th className="py-3 px-4 font-semibold text-right">Copies</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  {canLibrary && <th className="py-3 px-4 font-semibold text-right no-print">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((b) => (
                  <tr key={b.id}>
                    <td className="py-3 px-4 font-mono text-slate-500">{b.isbn}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{b.title}</td>
                    <td className="py-3 px-4">{b.author}</td>
                    <td className="py-3 px-4 text-right font-bold tabular-nums">{b.copiesAvailable}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${b.status === 'available' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'}`}>
                        {b.status === 'issued' && b.issuedTo ? `Issued · ${b.issuedTo}` : b.status}
                      </span>
                    </td>
                    {canLibrary && (
                      <td className="py-3 px-4 text-right no-print">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              void mutate(
                                `/api/modules/libraryBooks/${b.id}`,
                                'PATCH',
                                { status: b.status === 'available' ? 'issued' : 'available', issuedTo: b.status === 'available' ? 'Checked Out' : '' },
                                b.status === 'available' ? 'Book marked issued.' : 'Book marked returned.'
                              )
                            }
                            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold cursor-pointer"
                          >
                            {b.status === 'available' ? 'Issue' : 'Return'}
                          </button>
                          <button type="button" onClick={() => openEdit(b)} aria-label={`Edit ${b.title}`} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => void mutate(`/api/modules/libraryBooks/${b.id}`, 'DELETE', undefined, 'Book deleted.')} aria-label={`Delete ${b.title}`} className="p-1.5 rounded-lg border border-rose-200 text-rose-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {modalOpen && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <form onSubmit={save} className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-bold">{editingId ? 'Edit Book' : 'Add Book to Catalog'}</h2>
                <button type="button" onClick={closeModal} aria-label="Close modal" className="p-1 text-slate-400"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold mb-1">Book Title *</label>
                  <input required value={f2} onChange={(e) => setF2(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Author *</label>
                  <input required value={f3} onChange={(e) => setF3(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">ISBN *</label>
                  <input required value={f1} onChange={(e) => setF1(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Copies *</label>
                  <input type="number" min={0} required value={f4} onChange={(e) => setF4(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Status</label>
                  <select value={f6} onChange={(e) => setF6(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs">
                    <option value="available">Available</option>
                    <option value="issued">Issued</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold mb-1">Issued To (Optional)</label>
                  <input value={f5} onChange={(e) => setF5(e.target.value)} placeholder="Student name & code" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold cursor-pointer">{editingId ? 'Save Changes' : 'Add Book'}</button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // ==================== 6. TRANSPORT ====================
  if (page === 'transport') {
    const items = db.transportRoutes.filter(
      (r) =>
        campusMatch(r.campusId) &&
        (!q || r.routeName.toLowerCase().includes(q) || r.vehicleNo.toLowerCase().includes(q) || r.driverName.toLowerCase().includes(q))
    );

    const openNew = () => {
      setEditingId(null);
      setF1('');
      setF2('');
      setF3('');
      setF4('');
      setF5('3500');
      setF6('15');
      setModalOpen(true);
    };

    const openEdit = (route: TransportRoute) => {
      setEditingId(route.id);
      setF1(route.vehicleNo);
      setF2(route.routeName);
      setF3(route.driverName);
      setF4(route.driverPhone);
      setF5(String(route.monthlyFare));
      setF6(String(route.ridersCount));
      setModalOpen(true);
    };

    const save = async (e: React.FormEvent) => {
      e.preventDefault();
      const payload = {
        campusId: targetCampus,
        vehicleNo: f1.trim(),
        routeName: f2.trim(),
        driverName: f3.trim(),
        driverPhone: f4.trim(),
        monthlyFare: Math.max(0, Number(f5) || 0),
        ridersCount: Math.max(0, Number(f6) || 0),
      };
      const res = editingId
        ? await mutate(`/api/modules/transportRoutes/${editingId}`, 'PATCH', payload, 'Transport route updated.')
        : await mutate('/api/modules/transportRoutes', 'POST', payload, 'Transport route added.');
      if (res.ok) closeModal();
    };

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bus className="w-5 h-5 text-blue-600" />
              <span>Transport &amp; Fleet Routes</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage school vans, routes, drivers, student riders, and monthly fares.
            </p>
          </div>
          <div className="flex items-center gap-2 no-print">
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer">
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>Print Routes</span>
            </button>
            {canTransport && (
              <button type="button" onClick={openNew} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer">
                <Plus className="w-4 h-4" />
                <span>Add Route</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((r) => (
            <div key={r.id} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400">{r.vehicleNo}</span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{r.routeName}</h3>
                </div>
                {canTransport && (
                  <div className="flex items-center gap-1 no-print">
                    <button type="button" onClick={() => openEdit(r)} aria-label={`Edit ${r.routeName}`} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => void mutate(`/api/modules/transportRoutes/${r.id}`, 'DELETE', undefined, 'Route removed.')} aria-label={`Delete ${r.routeName}`} className="p-1.5 rounded-lg border border-rose-200 text-rose-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <div className="text-slate-400">Driver</div>
                  <div className="font-semibold">{r.driverName}</div>
                  <div className="text-[11px] font-mono text-slate-500">{r.driverPhone}</div>
                </div>
                <div>
                  <div className="text-slate-400">Riders</div>
                  <div className="font-bold tabular-nums">{r.ridersCount} students</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-400">Monthly Fare</div>
                  <div className="font-mono font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(r.monthlyFare, currency, !showAmounts)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {modalOpen && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <form onSubmit={save} className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-bold">{editingId ? 'Edit Transport Route' : 'Add Transport Route'}</h2>
                <button type="button" onClick={closeModal} aria-label="Close modal" className="p-1 text-slate-400"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Vehicle No *</label>
                  <input required value={f1} onChange={(e) => setF1(e.target.value)} placeholder="KHI-4412 (HiAce)" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Driver Name *</label>
                  <input required value={f3} onChange={(e) => setF3(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold mb-1">Route Name *</label>
                  <input required value={f2} onChange={(e) => setF2(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Driver Phone *</label>
                  <input required value={f4} onChange={(e) => setF4(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Monthly Fare ({currency}) *</label>
                  <input type="number" min={0} required value={f5} onChange={(e) => setF5(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold mb-1">Riders Count</label>
                  <input type="number" min={0} value={f6} onChange={(e) => setF6(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold cursor-pointer">{editingId ? 'Save Changes' : 'Add Route'}</button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // ==================== 7. HOSTEL ====================
  if (page === 'hostel') {
    const items = db.hostelRooms.filter((r) => campusMatch(r.campusId));

    const openNew = () => {
      setEditingId(null);
      setF1('');
      setF2('Boys Wing');
      setF3('4');
      setF4('0');
      setF5('12000');
      setModalOpen(true);
    };

    const openEdit = (room: HostelRoom) => {
      setEditingId(room.id);
      setF1(room.roomNo);
      setF2(room.wing);
      setF3(String(room.capacity));
      setF4(String(room.occupied));
      setF5(String(room.monthlyFee));
      setModalOpen(true);
    };

    const save = async (e: React.FormEvent) => {
      e.preventDefault();
      const payload = {
        campusId: targetCampus,
        roomNo: f1.trim(),
        wing: f2.trim(),
        capacity: Math.max(1, Number(f3) || 4),
        occupied: Math.max(0, Number(f4) || 0),
        monthlyFee: Math.max(0, Number(f5) || 0),
      };
      const res = editingId
        ? await mutate(`/api/modules/hostelRooms/${editingId}`, 'PATCH', payload, 'Hostel room updated.')
        : await mutate('/api/modules/hostelRooms', 'POST', payload, 'Hostel room added.');
      if (res.ok) closeModal();
    };

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Hotel className="w-5 h-5 text-violet-600" />
              <span>Hostel &amp; Boarding Rooms</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage dormitory wings, bed capacity, occupancy, and boarding fees.
            </p>
          </div>
          <div className="flex items-center gap-2 no-print">
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer">
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>Print Hostel List</span>
            </button>
            {canOperations && (
              <button type="button" onClick={openNew} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer">
                <Plus className="w-4 h-4" />
                <span>Add Hostel Room</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((room) => (
            <div key={room.id} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400">{room.wing}</span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Room {room.roomNo}</h3>
                </div>
                {canOperations && (
                  <div className="flex items-center gap-1 no-print">
                    <button type="button" onClick={() => openEdit(room)} aria-label={`Edit room ${room.roomNo}`} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => void mutate(`/api/modules/hostelRooms/${room.id}`, 'DELETE', undefined, 'Hostel room removed.')} aria-label={`Delete room ${room.roomNo}`} className="p-1.5 rounded-lg border border-rose-200 text-rose-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="tabular-nums text-slate-600 dark:text-slate-400">
                  Beds: <strong className="text-slate-900 dark:text-white">{room.occupied}/{room.capacity}</strong>
                </span>
                <span className="font-mono font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(room.monthlyFee, currency, !showAmounts)}/mo
                </span>
              </div>
            </div>
          ))}
        </div>

        {modalOpen && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <form onSubmit={save} className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-bold">{editingId ? 'Edit Hostel Room' : 'Add Hostel Room'}</h2>
                <button type="button" onClick={closeModal} aria-label="Close modal" className="p-1 text-slate-400"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Room No *</label>
                  <input required value={f1} onChange={(e) => setF1(e.target.value)} placeholder="H-105" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Wing *</label>
                  <select value={f2} onChange={(e) => setF2(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs">
                    <option value="Boys Wing">Boys Wing</option>
                    <option value="Girls Wing">Girls Wing</option>
                    <option value="Faculty Wing">Faculty Wing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Capacity *</label>
                  <input type="number" min={1} required value={f3} onChange={(e) => setF3(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Occupied *</label>
                  <input type="number" min={0} required value={f4} onChange={(e) => setF4(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold mb-1">Monthly Fee ({currency}) *</label>
                  <input type="number" min={0} required value={f5} onChange={(e) => setF5(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold cursor-pointer">{editingId ? 'Save Changes' : 'Add Room'}</button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // ==================== 8. SMS / WHATSAPP ALERTS ====================
  if (page === 'messaging') {
    const items = db.messageLogs.filter(
      (m) =>
        campusMatch(m.campusId) &&
        (!q ||
          m.recipient.toLowerCase().includes(q) ||
          m.message.toLowerCase().includes(q) ||
          m.channel.toLowerCase().includes(q))
    );

    const campusStudents = db.students.filter((s) => s.status === 'active' && campusMatch(s.campusId));
    const campusStaff = db.staff.filter((s) => s.status === 'active' && campusMatch(s.campusId));
    const campusClasses = db.classes.filter((c) => campusMatch(c.campusId));
    const defaulterIds = new Set(db.vouchers.filter((v) => campusMatch(v.campusId) && v.status !== 'paid').map((v) => v.studentId));
    const absentTodayIds = new Set(
      db.attendance
        .filter((a) => a.date === today && a.targetType === 'student' && a.status === 'absent' && campusMatch(a.campusId))
        .map((a) => a.targetId)
    );

    const getAudienceMeta = (preset: typeof msgAudiencePreset, clsId: string, customTarget: string) => {
      if (preset === 'all_parents') {
        const count = new Set(campusStudents.map((s) => s.parentPhone || s.id)).size;
        return { label: `All Active Parents (${count} families)`, count };
      }
      if (preset === 'defaulters') {
        const count = campusStudents.filter((s) => defaulterIds.has(s.id)).length;
        return { label: `Fee Defaulter Parents (${count} students)`, count };
      }
      if (preset === 'absent_today') {
        const count = campusStudents.filter((s) => absentTodayIds.has(s.id)).length;
        return { label: `Today's Absent Students (${count} parents)`, count };
      }
      if (preset === 'class') {
        const cls = campusClasses.find((c) => c.id === clsId) || campusClasses[0];
        const count = cls ? campusStudents.filter((s) => s.classId === cls.id).length : 0;
        return {
          label: cls ? `${cls.className} (${cls.sectionName}) Parents (${count})` : 'Selected Class Parents',
          count,
        };
      }
      if (preset === 'all_staff') {
        return { label: `All Active Staff (${campusStaff.length} members)`, count: campusStaff.length };
      }
      return { label: customTarget.trim() || 'Custom Recipient(s)', count: customTarget.trim() ? 1 : 0 };
    };

    const applyTemplate = (key: typeof msgTemplateKey) => {
      setMsgTemplateKey(key);
      if (key === 'custom') return;
      const tpl = db.settings.messageTemplates?.[key] || '';
      const filled = interpolateMessageTemplate(tpl, {
        schoolName: db.settings.schoolName,
        studentName: 'Student',
        className: 'Enrolled Class',
        amount: `${currency} 8,500`,
        dueDate: `${today.slice(0, 8)}${String(db.settings.feeDueDay || 10).padStart(2, '0')}`,
        date: today,
        time: new Date().toTimeString().slice(0, 5),
        examTitle: db.exams[0]?.title || 'Term Examination',
      });
      setF3(filled);
    };

    const openNew = () => {
      setEditingId(null);
      setF1(db.settings.whatsappEnabled ? 'WhatsApp' : 'SMS');
      setMsgAudiencePreset('all_parents');
      setMsgClassId(campusClasses[0]?.id || '');
      setMsgTemplateKey('custom');
      setF2('');
      setF3('');
      setModalOpen(true);
    };

    const openEdit = (msg: MessageLog) => {
      setEditingId(msg.id);
      setF1(msg.channel);
      setMsgAudiencePreset('custom');
      setMsgTemplateKey('custom');
      setF2(msg.recipient);
      setF3(msg.message);
      setModalOpen(true);
    };

    const audiencePreview = getAudienceMeta(msgAudiencePreset, msgClassId, f2);

    const save = async (e: React.FormEvent) => {
      e.preventDefault();
      const recipientText = editingId ? f2.trim() : audiencePreview.label;
      const payload = {
        campusId: targetCampus,
        channel: (f1 === 'SMS' || f1 === 'Email' ? f1 : 'WhatsApp') as MessageLog['channel'],
        recipient: recipientText,
        message: f3.trim(),
        sentAt: today,
        status: 'Delivered' as const,
      };
      const res = editingId
        ? await mutate(`/api/modules/messageLogs/${editingId}`, 'PATCH', payload, 'Message log updated.')
        : await mutate('/api/modules/messageLogs', 'POST', payload, `Dispatched ${payload.channel} broadcast to ${audiencePreview.count || 1} recipient(s).`);
      if (res.ok) closeModal();
    };

    const handleExportMessagesPdf = () => {
      exportTableToPdf({
        title: 'WhatsApp & SMS Dispatch Register',
        subtitle: `WhatsApp Provider: ${db.settings.whatsappProvider || 'Cloud API'} · SMS Sender ID: ${db.settings.smsSenderId || 'SCHOOL-ERP'}`,
        filename: `message-dispatch-log-${today}.pdf`,
        headers: ['Date', 'Channel', 'Audience / Recipient', 'Message Body', 'Status'],
        rows: items.map((m) => [m.sentAt, m.channel, m.recipient, m.message, m.status]),
        settings: db.settings,
        campusName,
        generatedDate: today,
        summaryCards: [
          { label: 'Total Logs', value: String(items.length), tone: 'slate' },
          { label: 'WhatsApp', value: String(items.filter((m) => m.channel === 'WhatsApp').length), tone: 'emerald' },
          { label: 'SMS', value: String(items.filter((m) => m.channel === 'SMS').length), tone: 'teal' },
          { label: 'Credits Left', value: db.settings.whatsappLeft.toLocaleString(), tone: 'slate' },
        ],
        orientation: 'landscape',
      });
    };

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              <span>SMS &amp; WhatsApp Alerts</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Send parent broadcasts using configured templates &amp; smart audiences ({db.settings.whatsappLeft.toLocaleString()} credits left · Gateway:{' '}
              <strong className="text-emerald-700 dark:text-emerald-400">
                {db.settings.whatsappEnabled ? 'WhatsApp Active' : 'WhatsApp Paused'} / {db.settings.smsEnabled ? 'SMS Active' : 'SMS Paused'}
              </strong>
              ).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 no-print">
            <input
              type="text"
              placeholder="Search logs or channel..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs w-44"
            />
            <button
              type="button"
              onClick={handleExportMessagesPdf}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5 text-rose-600" />
              <span>Export PDF</span>
            </button>
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer">
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>Print Logs</span>
            </button>
            {canOperations && (
              <button type="button" onClick={openNew} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer">
                <Send className="w-4 h-4" />
                <span>Send Broadcast</span>
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {items.map((m) => (
            <div key={m.id} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      m.channel === 'WhatsApp'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        : m.channel === 'SMS'
                          ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {m.channel}
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{m.recipient}</span>
                  <span className="text-[11px] font-mono text-slate-400">{m.sentAt}</span>
                  <span className="text-[10px] font-bold uppercase text-emerald-600">{m.status}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5">{m.message}</p>
              </div>
              {canOperations && (
                <div className="flex items-center gap-1 shrink-0 no-print">
                  <button type="button" onClick={() => openEdit(m)} aria-label={`Edit message ${m.id}`} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => void mutate(`/api/modules/messageLogs/${m.id}`, 'DELETE', undefined, 'Message deleted.')} aria-label={`Delete message ${m.id}`} className="p-1.5 rounded-lg border border-rose-200 text-rose-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>
          ))}
        </div>

        {modalOpen && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <form onSubmit={save} className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-bold">{editingId ? 'Edit Broadcast' : 'Send SMS / WhatsApp Broadcast'}</h2>
                <button type="button" onClick={closeModal} aria-label="Close modal" className="p-1 text-slate-400"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="msg-channel" className="block font-semibold mb-1">Channel *</label>
                    <select id="msg-channel" value={f1} onChange={(e) => setF1(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                      <option value="WhatsApp">WhatsApp ({db.settings.whatsappSenderNumber || 'API'})</option>
                      <option value="SMS">Branded SMS ({db.settings.smsSenderId || 'IQRA-EDU'})</option>
                      <option value="Email">Official Email</option>
                    </select>
                  </div>
                  {!editingId && (
                    <div>
                      <label htmlFor="msg-template" className="block font-semibold mb-1">Quick Template</label>
                      <select
                        id="msg-template"
                        value={msgTemplateKey}
                        onChange={(e) => applyTemplate(e.target.value as typeof msgTemplateKey)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                      >
                        <option value="custom">Custom Message</option>
                        <option value="feeReminder">Fee Reminder Template</option>
                        <option value="absentAlert">Absentee Alert Template</option>
                        <option value="gateCheckIn">Gate Check-In Template</option>
                        <option value="examPublished">Exam Published Template</option>
                      </select>
                    </div>
                  )}
                </div>

                {!editingId ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="msg-audience-preset" className="block font-semibold mb-1">Target Audience *</label>
                      <select
                        id="msg-audience-preset"
                        value={msgAudiencePreset}
                        onChange={(e) => setMsgAudiencePreset(e.target.value as typeof msgAudiencePreset)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                      >
                        <option value="all_parents">All Active Parents</option>
                        <option value="defaulters">Fee Defaulters (Unpaid Invoices)</option>
                        <option value="absent_today">Absent Students Today</option>
                        <option value="class">Specific Class Parents</option>
                        <option value="all_staff">All Active Staff Members</option>
                        <option value="custom">Custom Phone / Label</option>
                      </select>
                    </div>
                    {msgAudiencePreset === 'class' ? (
                      <div>
                        <label htmlFor="msg-class-pick" className="block font-semibold mb-1">Select Class</label>
                        <select
                          id="msg-class-pick"
                          value={msgClassId}
                          onChange={(e) => setMsgClassId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        >
                          {campusClasses.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.className} ({c.sectionName})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : msgAudiencePreset === 'custom' ? (
                      <div>
                        <label htmlFor="msg-custom-recip" className="block font-semibold mb-1">Phone / Group *</label>
                        <input
                          id="msg-custom-recip"
                          required
                          value={f2}
                          onChange={(e) => setF2(e.target.value)}
                          placeholder="+92-300-XXXXXXX"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                    ) : (
                      <div className="flex items-end">
                        <div className="w-full px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold">
                          Matched: {audiencePreview.count} recipient(s)
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block font-semibold mb-1">Audience *</label>
                    <input required value={f2} onChange={(e) => setF2(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                  </div>
                )}

                <div>
                  <label htmlFor="msg-body-input" className="block font-semibold mb-1">Message Body *</label>
                  <textarea
                    id="msg-body-input"
                    required
                    rows={4}
                    value={f3}
                    onChange={(e) => setF3(e.target.value)}
                    placeholder="Type announcement or fee reminder..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                    <span>{f3.length} chars ({Math.max(1, Math.ceil(f3.length / 160))} segment)</span>
                    <span>Credits Remaining: {db.settings.whatsappLeft.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold cursor-pointer">{editingId ? 'Save Changes' : `Dispatch ${f1}`}</button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // ==================== 9. PARENT-TEACHER MEETINGS (PTM) ====================
  if (page === 'ptm') {
    const ptmItems = (db.ptmSchedules || []).filter(
      (p) =>
        campusMatch(p.campusId) &&
        (!q ||
          p.title.toLowerCase().includes(q) ||
          p.className.toLowerCase().includes(q) ||
          p.teacherName.toLowerCase().includes(q) ||
          p.venue.toLowerCase().includes(q))
    );

    const openNew = () => {
      setEditingId(null);
      setF1('Mid-Term Progress PTM');
      setF2(db.classes[0] ? `${db.classes[0].className} (${db.classes[0].sectionName})` : 'Grade 9 (Science)');
      setF3(db.staff.find((s) => s.role === 'Teacher')?.name || 'Ayesha Khan');
      setF4(today);
      setF5('09:00 AM - 01:00 PM');
      setF6('Main Assembly Hall');
      setF7('');
      setModalOpen(true);
    };

    const openEdit = (p: PtmSchedule) => {
      setEditingId(p.id);
      setF1(p.title);
      setF2(p.className);
      setF3(p.teacherName);
      setF4(p.date);
      setF5(p.timeSlot);
      setF6(p.venue);
      setF7(p.notes || '');
      setModalOpen(true);
    };

    const save = async (e: React.FormEvent) => {
      e.preventDefault();
      const payload = {
        campusId: targetCampus,
        title: f1.trim(),
        className: f2.trim(),
        teacherName: f3.trim(),
        date: f4 || today,
        timeSlot: f5.trim(),
        venue: f6.trim(),
        status: 'scheduled' as const,
        notes: f7.trim(),
      };
      const res = editingId
        ? await mutate(`/api/modules/ptmSchedules/${editingId}`, 'PATCH', payload, 'PTM schedule updated.')
        : await mutate('/api/modules/ptmSchedules', 'POST', payload, 'PTM session scheduled.');
      if (res.ok) closeModal();
    };

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-teal-700" />
              <span>Parent–Teacher Meetings (PTM)</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Schedule class-wise PTM slots, venues, teachers, and parent consultation hours.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 no-print">
            <input
              type="text"
              placeholder="Filter PTM, class or teacher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs w-48"
            />
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>Print PTM Schedule</span>
            </button>
            {canPtm && (
              <button
                type="button"
                onClick={openNew}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Schedule PTM</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ptmItems.map((p) => (
            <div key={p.id} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="inline-block px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-[11px] font-bold text-teal-700 dark:text-teal-300">
                    {p.date} · {p.timeSlot}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1.5">{p.title}</h3>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Class: <strong className="text-slate-700 dark:text-slate-300">{p.className}</strong> · Teacher: <strong>{p.teacherName}</strong>
                  </div>
                </div>
                {canPtm && (
                  <div className="flex items-center gap-1 no-print">
                    <button
                      type="button"
                      onClick={() =>
                        void mutate(
                          `/api/modules/ptmSchedules/${p.id}`,
                          'PATCH',
                          { status: p.status === 'completed' ? 'scheduled' : 'completed' },
                          p.status === 'completed' ? 'Marked scheduled.' : 'Marked completed.'
                        )
                      }
                      className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold cursor-pointer"
                    >
                      {p.status === 'completed' ? 'Reopen' : 'Complete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      aria-label={`Edit ${p.title}`}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void mutate(`/api/modules/ptmSchedules/${p.id}`, 'DELETE', undefined, 'PTM schedule deleted.')}
                      aria-label={`Delete ${p.title}`}
                      className="p-1.5 rounded-lg border border-rose-200 text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Venue: <strong className="text-slate-700 dark:text-slate-200">{p.venue}</strong></span>
                <span className={`capitalize font-bold ${p.status === 'completed' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {p.status}
                </span>
              </div>
              {p.notes && <p className="text-xs text-slate-600 dark:text-slate-300">{p.notes}</p>}
            </div>
          ))}
          {ptmItems.length === 0 && (
            <div className="md:col-span-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-400">
              No PTM sessions scheduled yet.
            </div>
          )}
        </div>

        {modalOpen && canPtm && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <form onSubmit={save} className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-bold">{editingId ? 'Edit PTM Schedule' : 'Schedule PTM'}</h2>
                <button type="button" onClick={closeModal} aria-label="Close modal" className="p-1 text-slate-400"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="col-span-2">
                  <label className="block font-semibold mb-1">Meeting Title *</label>
                  <input required value={f1} onChange={(e) => setF1(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Class *</label>
                  <input required value={f2} onChange={(e) => setF2(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Lead Teacher *</label>
                  <input required value={f3} onChange={(e) => setF3(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Date *</label>
                  <input type="date" required value={f4} onChange={(e) => setF4(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Time Slot *</label>
                  <input required value={f5} onChange={(e) => setF5(e.target.value)} placeholder="09:00 AM - 01:00 PM" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold mb-1">Venue / Room *</label>
                  <input required value={f6} onChange={(e) => setF6(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold mb-1">Instructions / Agenda</label>
                  <textarea rows={2} value={f7} onChange={(e) => setF7(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold cursor-pointer">{editingId ? 'Save Changes' : 'Publish PTM'}</button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // ==================== 10. CERTIFICATION & TRANSFER CERTIFICATES ====================
  if (page === 'certification') {
    const campusStudents = db.students.filter((s) => campusMatch(s.campusId));
    const campusStaff = db.staff.filter((s) => campusMatch(s.campusId));
    const selectedStudent =
      campusStudents.find((s) => s.id === certStudentId) || campusStudents[0] || null;
    const selectedStaff =
      campusStaff.find((s) => s.id === certStaffId) || campusStaff[0] || null;
    const campusExams = db.exams.filter((e) => campusMatch(e.campusId));
    const selectedExam =
      campusExams.find((e) => e.id === certExamId) || campusExams[0] || null;
    const certReadOnly = user?.role === 'Student' || user?.role === 'Parent';

    const certTitles: Record<typeof certType, string> = {
      tc: 'School Leaving / Transfer Certificate (TC)',
      character: 'Character & Conduct Certificate',
      bonafide: 'Bonafide Student Certificate',
      provisional: 'Provisional Passing Certificate',
      merit: 'Academic Merit & Distinction Certificate',
      clearance: 'Fee & Dues Clearance Certificate',
      experience: 'Staff Experience & Service Certificate',
      admit: 'Examination Admit Card / Roll No Slip',
    };

    const studentSubjects = selectedStudent
      ? db.subjects.filter(
          (sb) =>
            sb.className.toLowerCase() === selectedStudent.className.toLowerCase() &&
            campusMatch(sb.campusId)
        )
      : [];
    const examClass = selectedStudent
      ? db.classes.find((c) => c.id === selectedStudent.classId)
      : null;

    const studentUnpaidVouchers = selectedStudent
      ? db.vouchers.filter((v) => v.studentId === selectedStudent.id && v.status !== 'paid')
      : [];
    const studentUnpaidTotal = studentUnpaidVouchers.reduce(
      (sum, v) => sum + Math.max(0, v.totalAmount - v.paidAmount),
      0
    );

    const refCode =
      certType === 'experience' && selectedStaff
        ? `${db.settings.shortCode}-EXP-${selectedStaff.employeeCode}`
        : `${db.settings.shortCode}-${certType.toUpperCase()}-${selectedStudent?.studentCode || '000'}`;

    const handleDownloadCertificatePdf = () => {
      if (certType === 'experience') {
        if (!selectedStaff) return;
        exportCertificatePdf({
          settings: db.settings,
          certTitle: certTitles.experience,
          refCode,
          issuedDate: today,
          recipientHeading: `SERVICE CERTIFICATE — ${selectedStaff.name.toUpperCase()}`,
          bodyParagraphs: [
            `This is to certify that ${selectedStaff.name} (Employee Code: ${selectedStaff.employeeCode}) has served diligently as ${selectedStaff.role} in the ${selectedStaff.department} Department at ${db.settings.schoolName}.`,
            `During their tenure since ${selectedStaff.joiningDate}, they demonstrated exemplary professionalism, academic commitment, and ethical conduct.`,
          ],
          detailsGrid: [
            { label: 'Employee ID', value: selectedStaff.employeeCode },
            { label: 'Designation', value: selectedStaff.role },
            { label: 'Department', value: selectedStaff.department },
            { label: 'Joining Date', value: selectedStaff.joiningDate },
            { label: 'Status', value: selectedStaff.status.toUpperCase() },
            { label: 'Contact', value: selectedStaff.phone },
          ],
          remarks: certRemarks,
          leftSignLabel: 'HR & Admin Coordinator',
          rightSignLabel: db.settings.principalName || 'Principal & Stamp',
          filename: `experience-certificate-${selectedStaff.employeeCode}.pdf`,
        });
        return;
      }

      if (!selectedStudent) return;
      if (certType === 'admit') {
        const papers = (studentSubjects.length > 0 ? studentSubjects : db.subjects.slice(0, 4)).map((sub) => ({
          code: sub.code,
          subject: sub.name,
          maxMarks: sub.totalMarks,
        }));
        exportCertificatePdf({
          settings: db.settings,
          certTitle: certTitles.admit,
          refCode,
          issuedDate: today,
          recipientHeading: `${selectedExam?.title || 'Term Assessment'} — Roll No. ${selectedStudent.rollNo}`,
          bodyParagraphs: [
            `Candidate ${selectedStudent.name} (${selectedStudent.studentCode}), S/D of ${selectedStudent.fatherName}, is permitted to appear in ${selectedExam?.title || 'Term Assessment'} for ${selectedStudent.className} (${selectedStudent.sectionName}).`,
          ],
          detailsGrid: [
            { label: 'Roll Number', value: selectedStudent.rollNo },
            { label: 'Student ID', value: selectedStudent.studentCode },
            { label: 'Class & Sec', value: `${selectedStudent.className} (${selectedStudent.sectionName})` },
            { label: 'Exam Center', value: `Room ${examClass?.room || 'Main Hall'}` },
            { label: 'Exam Dates', value: selectedExam ? `${selectedExam.startDate} to ${selectedExam.endDate}` : today },
            { label: 'Reporting', value: '08:15 AM Sharp' },
          ],
          papersTable: papers,
          remarks: 'Bring this printed Admit Card and School ID Card daily. Electronic gadgets are prohibited.',
          leftSignLabel: 'Candidate Signature',
          rightSignLabel: 'Controller of Examinations',
          filename: `admit-card-${selectedStudent.studentCode}.pdf`,
        });
        return;
      }

      const bodyByType: Record<Exclude<CertTypeKey, 'admit' | 'experience'>, string[]> = {
        tc: [
          `This is to certify that ${selectedStudent.name}, Son/Daughter of ${selectedStudent.fatherName}, bearing Student Code ${selectedStudent.studentCode} and Roll No. ${selectedStudent.rollNo}, attended ${db.settings.schoolName} in ${selectedStudent.className} (${selectedStudent.sectionName}) during session ${db.settings.sessionName}.`,
          `Having cleared all academic and administrative obligations as of ${today}, this School Leaving / Transfer Certificate is hereby issued.`,
        ],
        character: [
          `This is to certify that ${selectedStudent.name}, Son/Daughter of ${selectedStudent.fatherName}, Student Code ${selectedStudent.studentCode}, has been a well-behaved and disciplined student of ${selectedStudent.className} (${selectedStudent.sectionName}).`,
          `Throughout their stay in session ${db.settings.sessionName}, they exhibited good moral character and active participation in co-curricular life.`,
        ],
        bonafide: [
          `This is to certify that ${selectedStudent.name}, Son/Daughter of ${selectedStudent.fatherName}, bearing Student Code ${selectedStudent.studentCode}, is a regular bonafide student enrolled in ${selectedStudent.className} (${selectedStudent.sectionName}) for academic session ${db.settings.sessionName}.`,
        ],
        provisional: [
          `This Provisional Passing Certificate confirms that ${selectedStudent.name} (Roll No. ${selectedStudent.rollNo}, Student ID ${selectedStudent.studentCode}) has successfully fulfilled all coursework and examination requirements for ${selectedStudent.className} (${selectedStudent.sectionName}).`,
        ],
        merit: [
          `The Board of Management and Faculty proudly confer this Academic Merit & Distinction Certificate upon ${selectedStudent.name} (${selectedStudent.studentCode}), S/D of ${selectedStudent.fatherName}, in recognition of: ${certMeritTitle}.`,
        ],
        clearance: [
          `This is to certify the Fee & Accounts status for ${selectedStudent.name} (${selectedStudent.studentCode}), ${selectedStudent.className} (${selectedStudent.sectionName}).`,
          studentUnpaidTotal === 0
            ? 'All tuition fees, lab charges, library dues, and school receivables stand 100% CLEARED up to date.'
            : `Pending unpaid voucher balance recorded: ${formatCurrency(studentUnpaidTotal, currency, false)} (${studentUnpaidVouchers.length} unpaid invoice(s)).`,
        ],
      };

      exportCertificatePdf({
        settings: db.settings,
        certTitle: certTitles[certType],
        refCode,
        issuedDate: today,
        recipientHeading: `${selectedStudent.name.toUpperCase()} (${selectedStudent.studentCode})`,
        bodyParagraphs: bodyByType[certType],
        detailsGrid: [
          { label: 'Father Name', value: selectedStudent.fatherName },
          { label: 'Class & Sec', value: `${selectedStudent.className} (${selectedStudent.sectionName})` },
          { label: 'Date of Birth', value: selectedStudent.dob },
          { label: 'Admission Date', value: selectedStudent.admissionDate },
          { label: 'Enrollment', value: selectedStudent.status.toUpperCase() },
          { label: 'Fee Clearance', value: studentUnpaidTotal === 0 ? 'CLEARED (0 DUE)' : formatCurrency(studentUnpaidTotal, currency, false) },
        ],
        remarks: certRemarks,
        leftSignLabel: 'Class Coordinator',
        rightSignLabel: db.settings.principalName || 'Principal Signature & Seal',
        filename: `${certType}-certificate-${selectedStudent.studentCode}.pdf`,
      });
    };

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              <span>Certification &amp; Admit Cards</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Generate, preview, and download formal double-bordered PDF Certificates, Clearance Letters, Staff Experience Letters &amp; Admit Cards.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadCertificatePdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>Download Styled PDF</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{certType === 'admit' ? 'Print Admit Card' : 'Print Certificate'}</span>
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs no-print">
          <div>
            <label htmlFor="cert-doc-type" className="block font-semibold mb-1">Certificate / Document Type</label>
            <select
              id="cert-doc-type"
              value={certType}
              onChange={(e) => setCertType(e.target.value as typeof certType)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              <option value="tc">Transfer / Leaving Certificate (TC)</option>
              <option value="character">Character &amp; Conduct Certificate</option>
              <option value="bonafide">Bonafide Student Certificate</option>
              <option value="provisional">Provisional Passing Certificate</option>
              <option value="merit">Academic Merit &amp; Distinction</option>
              <option value="clearance">Fee &amp; Dues Clearance Certificate</option>
              <option value="experience">Staff Experience Certificate</option>
              <option value="admit">Exam Admit Card / Roll No Slip</option>
            </select>
          </div>

          {certType === 'experience' ? (
            <div>
              <label htmlFor="cert-staff-select" className="block font-semibold mb-1">Select Staff Member</label>
              <select
                id="cert-staff-select"
                value={selectedStaff?.id || ''}
                onChange={(e) => setCertStaffId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                {campusStaff.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.employeeCode} · {st.name} ({st.role})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label htmlFor="cert-student-select" className="block font-semibold mb-1">Select Student</label>
              <select
                id="cert-student-select"
                value={selectedStudent?.id || ''}
                onChange={(e) => setCertStudentId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                {campusStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.studentCode} · {s.name} ({s.className})
                  </option>
                ))}
              </select>
            </div>
          )}

          {certType === 'admit' ? (
            <div>
              <label htmlFor="cert-exam-select" className="block font-semibold mb-1">Select Examination</label>
              <select
                id="cert-exam-select"
                value={selectedExam?.id || ''}
                onChange={(e) => setCertExamId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                {campusExams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title} ({ex.startDate})
                  </option>
                ))}
              </select>
            </div>
          ) : certType === 'merit' ? (
            <div>
              <label htmlFor="cert-merit-input" className="block font-semibold mb-1">Merit Distinction Citation</label>
              <input
                id="cert-merit-input"
                disabled={certReadOnly}
                value={certMeritTitle}
                onChange={(e) => setCertMeritTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60"
              />
            </div>
          ) : (
            <div>
              <label htmlFor="cert-remarks-input" className="block font-semibold mb-1">Principal Remarks / Conduct</label>
              <input
                id="cert-remarks-input"
                disabled={certReadOnly}
                value={certRemarks}
                onChange={(e) => setCertRemarks(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60"
              />
            </div>
          )}
        </div>

        {(selectedStudent || (certType === 'experience' && selectedStaff)) && (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border-4 border-teal-800 dark:border-teal-600 p-1.5 max-w-3xl mx-auto shadow-md">
            <div className="rounded-xl border-2 border-amber-500/70 p-4 sm:p-8 space-y-6">
              {/* Branded Letterhead */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-teal-800/20 pb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-teal-700 text-white font-bold text-lg flex items-center justify-center shrink-0">
                    {(db.settings.shortCode || 'IS').slice(0, 3)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                      {db.settings.schoolName}
                    </h2>
                    <p className="text-[11px] italic text-teal-700 dark:text-teal-400">
                      {db.settings.tagline || 'Excellence in Character & Modern Education'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {db.settings.address} · {db.settings.phone}
                    </p>
                  </div>
                </div>
                <div className="sm:text-right text-xs font-mono">
                  <div className="font-bold text-teal-700 dark:text-teal-400">REF: {refCode}</div>
                  <div className="text-slate-500">Issued: {today}</div>
                </div>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs sm:text-sm font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>{certTitles[certType]}</span>
                </div>
              </div>

              {certType === 'experience' && selectedStaff ? (
                <>
                  <div className="text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-200 space-y-3">
                    <p>
                      This is to certify that <strong>{selectedStaff.name}</strong> (Employee ID:{' '}
                      <strong className="font-mono">{selectedStaff.employeeCode}</strong>) has served in{' '}
                      <strong>{db.settings.schoolName}</strong> as <strong>{selectedStaff.role}</strong> in the{' '}
                      <strong>{selectedStaff.department} Department</strong> since{' '}
                      <strong className="font-mono">{selectedStaff.joiningDate}</strong>.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl text-xs">
                      <div>Employee Code: <strong className="font-mono">{selectedStaff.employeeCode}</strong></div>
                      <div>Designation: <strong>{selectedStaff.role}</strong></div>
                      <div>Department: <strong>{selectedStaff.department}</strong></div>
                      <div>Joining Date: <strong className="font-mono">{selectedStaff.joiningDate}</strong></div>
                      <div>Employment Status: <strong className="uppercase">{selectedStaff.status}</strong></div>
                      <div>Contact Phone: <strong className="font-mono">{selectedStaff.phone}</strong></div>
                    </div>
                    <p>
                      <strong>Service Remarks:</strong> {certRemarks}
                    </p>
                  </div>
                  <div className="pt-8 grid grid-cols-2 sm:grid-cols-3 items-end gap-4 text-xs text-slate-500 border-t border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="w-28 sm:w-36 border-b border-slate-400 mb-1" />
                      <span>HR &amp; Admin Coordinator</span>
                    </div>
                    <div className="hidden sm:block text-center">
                      <div className="inline-block px-3 py-1 rounded-full border border-teal-600/40 text-[10px] font-mono text-teal-700 dark:text-teal-400">
                        OFFICIAL VERIFIED SEAL
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="w-28 sm:w-36 border-b border-slate-400 mb-1 ml-auto" />
                      <span>{db.settings.principalName || 'Principal Signature & Seal'}</span>
                    </div>
                  </div>
                </>
              ) : certType === 'admit' && selectedStudent ? (
                <div className="space-y-5 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl">
                    <div>
                      Examination: <strong>{selectedExam?.title || 'Term Assessment'}</strong>
                    </div>
                    <div>
                      Roll Number: <strong className="font-mono text-teal-700 dark:text-teal-400">{selectedStudent.rollNo}</strong>
                    </div>
                    <div>
                      Candidate Name: <strong>{selectedStudent.name}</strong> ({selectedStudent.studentCode})
                    </div>
                    <div>
                      Father Name: <strong>{selectedStudent.fatherName}</strong>
                    </div>
                    <div>
                      Class &amp; Section: <strong>{selectedStudent.className} ({selectedStudent.sectionName})</strong>
                    </div>
                    <div>
                      Exam Center / Room: <strong>Room {examClass?.room || 'Main Hall'}</strong>
                    </div>
                    <div>
                      Exam Dates:{' '}
                      <strong className="font-mono">
                        {selectedExam ? `${selectedExam.startDate} to ${selectedExam.endDate}` : today}
                      </strong>
                    </div>
                    <div>
                      Reporting Time: <strong className="font-mono">08:15 AM Sharp</strong>
                    </div>
                  </div>

                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 mb-2">
                      Enrolled Examination Papers
                    </div>
                    <table className="w-full text-left border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                          <th className="py-2 px-3">Code</th>
                          <th className="py-2 px-3">Subject Paper</th>
                          <th className="py-2 px-3 text-right">Max Marks</th>
                          <th className="py-2 px-3 text-right">Invigilator Sign</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(studentSubjects.length > 0 ? studentSubjects : db.subjects.slice(0, 4)).map((sub) => (
                          <tr key={sub.id}>
                            <td className="py-2 px-3 font-mono">{sub.code}</td>
                            <td className="py-2 px-3 font-semibold">{sub.name}</td>
                            <td className="py-2 px-3 text-right font-mono">{sub.totalMarks}</td>
                            <td className="py-2 px-3 text-right text-slate-400">_________</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                    <div className="font-bold text-amber-800 dark:text-amber-300">Candidate Instructions:</div>
                    <p>1. Bring this printed Roll No Slip and School ID Card daily to the examination hall.</p>
                    <p>2. Electronic gadgets, calculators (unless permitted), and smartwatches are strictly prohibited.</p>
                  </div>

                  <div className="pt-6 grid grid-cols-2 sm:grid-cols-3 items-end gap-4 text-xs text-slate-500 border-t border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="w-28 sm:w-36 border-b border-slate-400 mb-1" />
                      <span>Candidate Signature</span>
                    </div>
                    <div className="hidden sm:block text-center">
                      <div className="inline-block px-3 py-1 rounded-full border border-teal-600/40 text-[10px] font-mono text-teal-700 dark:text-teal-400">
                        EXAM CELL VERIFIED
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="w-28 sm:w-36 border-b border-slate-400 mb-1 ml-auto" />
                      <span>Controller of Examinations</span>
                    </div>
                  </div>
                </div>
              ) : selectedStudent ? (
                <>
                  <div className="text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-200 space-y-3">
                    {certType === 'merit' ? (
                      <p>
                        Awarded proudly to <strong>{selectedStudent.name}</strong>, Son/Daughter of{' '}
                        <strong>{selectedStudent.fatherName}</strong> (Student ID{' '}
                        <strong className="font-mono">{selectedStudent.studentCode}</strong>,{' '}
                        <strong>
                          {selectedStudent.className} {selectedStudent.sectionName}
                        </strong>
                        ), for achieving: <strong className="text-teal-700 dark:text-teal-400">{certMeritTitle}</strong>.
                      </p>
                    ) : certType === 'clearance' ? (
                      <p>
                        This is to certify the Fee &amp; Financial Clearance Status for{' '}
                        <strong>{selectedStudent.name}</strong>, Son/Daughter of{' '}
                        <strong>{selectedStudent.fatherName}</strong> (Student ID{' '}
                        <strong className="font-mono">{selectedStudent.studentCode}</strong>), enrolled in{' '}
                        <strong>
                          {selectedStudent.className} ({selectedStudent.sectionName})
                        </strong>
                        .{' '}
                        {studentUnpaidTotal === 0 ? (
                          <strong className="text-emerald-700 dark:text-emerald-400">
                            All tuition fees and school dues stand 100% CLEARED as of {today}.
                          </strong>
                        ) : (
                          <strong className="text-rose-600">
                            Outstanding Dues Recorded: {formatCurrency(studentUnpaidTotal, currency, false)} ({studentUnpaidVouchers.length} unpaid invoice(s)).
                          </strong>
                        )}
                      </p>
                    ) : (
                      <p>
                        This is to certify that <strong>{selectedStudent.name}</strong>, Son/Daughter of{' '}
                        <strong>{selectedStudent.fatherName}</strong>, bearing Student Code{' '}
                        <strong className="font-mono">{selectedStudent.studentCode}</strong> and Roll No.{' '}
                        <strong className="font-mono">{selectedStudent.rollNo}</strong>, is/was a regular bonafide student of{' '}
                        <strong>
                          {selectedStudent.className} ({selectedStudent.sectionName})
                        </strong>{' '}
                        for academic session <strong>{db.settings.sessionName}</strong>.
                      </p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl text-xs">
                      <div>
                        Date of Birth: <strong className="font-mono">{selectedStudent.dob}</strong>
                      </div>
                      <div>
                        Admission Date: <strong className="font-mono">{selectedStudent.admissionDate}</strong>
                      </div>
                      <div>
                        Enrollment Status: <strong className="uppercase">{selectedStudent.status}</strong>
                      </div>
                      <div>
                        Fee Dues:{' '}
                        <strong className={studentUnpaidTotal === 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {studentUnpaidTotal === 0 ? 'CLEARED (0 DUE)' : formatCurrency(studentUnpaidTotal, currency, false)}
                        </strong>
                      </div>
                    </div>
                    <p>
                      <strong>Remarks / Conduct:</strong> {certRemarks}
                    </p>
                  </div>

                  <div className="pt-8 grid grid-cols-2 sm:grid-cols-3 items-end gap-4 text-xs text-slate-500 border-t border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="w-28 sm:w-36 border-b border-slate-400 mb-1" />
                      <span>Class Coordinator</span>
                    </div>
                    <div className="hidden sm:block text-center">
                      <div className="inline-block px-3 py-1 rounded-full border border-teal-600/40 text-[10px] font-mono text-teal-700 dark:text-teal-400">
                        OFFICIAL VERIFIED SEAL
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="w-28 sm:w-36 border-b border-slate-400 mb-1 ml-auto" />
                      <span>{db.settings.principalName || 'Principal Signature & Seal'}</span>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== 11. ACADEMIC CALENDAR ====================
  if (page === 'calendar') {
    const eventItems = (db.calendarEvents || []).filter((ev) => {
      if (!campusMatch(ev.campusId)) return false;
      if (calendarCatFilter !== 'all' && ev.category !== calendarCatFilter) return false;
      if (!q) return true;
      return (
        ev.title.toLowerCase().includes(q) ||
        ev.category.toLowerCase().includes(q) ||
        ev.description.toLowerCase().includes(q)
      );
    });

    const openNew = () => {
      setEditingId(null);
      setF1('Mid-Term Assessment Week');
      setF2('Exam');
      setF3(today);
      setF4(today);
      setF5('All');
      setF6('Scheduled across campuses from 08:30 AM.');
      setModalOpen(true);
    };

    const openEdit = (ev: CalendarEvent) => {
      setEditingId(ev.id);
      setF1(ev.title);
      setF2(ev.category);
      setF3(ev.startDate);
      setF4(ev.endDate);
      setF5(ev.audience);
      setF6(ev.description);
      setModalOpen(true);
    };

    const save = async (e: React.FormEvent) => {
      e.preventDefault();
      const validCats: CalendarEventCategory[] = ['Holiday', 'Exam', 'PTM', 'Event', 'Sports'];
      const category = validCats.includes(f2 as CalendarEventCategory)
        ? (f2 as CalendarEventCategory)
        : 'Event';
      const payload = {
        campusId: targetCampus,
        title: f1.trim(),
        category,
        startDate: f3 || today,
        endDate: f4 || f3 || today,
        audience: (['All', 'Parents', 'Staff', 'Students'].includes(f5) ? f5 : 'All') as CalendarEvent['audience'],
        description: f6.trim(),
      };
      const res = editingId
        ? await mutate(`/api/modules/calendarEvents/${editingId}`, 'PATCH', payload, 'Calendar event updated.')
        : await mutate('/api/modules/calendarEvents', 'POST', payload, 'Calendar event added.');
      if (res.ok) closeModal();
    };

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarRange className="w-5 h-5 text-teal-700" />
              <span>Academic Calendar ({db.settings.sessionName})</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Term schedules, examination weeks, public holidays, PTM dates &amp; campus events.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 no-print">
            <input
              type="text"
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs w-44"
            />
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>Print Calendar</span>
            </button>
            {canCalendar && (
              <button
                type="button"
                onClick={openNew}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Event</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 no-print">
          {(['all', 'Holiday', 'Exam', 'PTM', 'Event', 'Sports'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCalendarCatFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                calendarCatFilter === cat
                  ? 'bg-teal-700 border-teal-700 text-white'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {cat === 'all' ? 'All Events' : cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {db.exams.map((ex) => (
            <div key={ex.id} className="rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 p-4 space-y-1">
              <div className="text-[11px] font-bold uppercase text-indigo-700 dark:text-indigo-300">
                Exam · {ex.term}
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">{ex.title}</div>
              <div className="text-xs font-mono text-slate-500">
                {ex.startDate} to {ex.endDate}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
          {eventItems.map((ev) => (
            <div key={ev.id} className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold">
                    {ev.category}
                  </span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    {ev.startDate}{ev.endDate && ev.endDate !== ev.startDate ? ` → ${ev.endDate}` : ''}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="font-semibold text-slate-500">{ev.audience}</span>
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">{ev.title}</div>
                <p className="text-slate-600 dark:text-slate-300 mt-0.5">{ev.description}</p>
              </div>
              {canCalendar && (
                <div className="flex items-center gap-1 no-print">
                  <button
                    type="button"
                    onClick={() => openEdit(ev)}
                    aria-label={`Edit event ${ev.title}`}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void mutate(`/api/modules/calendarEvents/${ev.id}`, 'DELETE', undefined, 'Calendar event deleted.')}
                    aria-label={`Delete event ${ev.title}`}
                    className="p-1.5 rounded-lg border border-rose-200 text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
          {eventItems.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">
              No calendar events match the selected filter.
            </div>
          )}
        </div>

        {modalOpen && canCalendar && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <form onSubmit={save} className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-bold">{editingId ? 'Edit Calendar Event' : 'Add Calendar Event'}</h2>
                <button type="button" onClick={closeModal} aria-label="Close modal" className="p-1 text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="col-span-2">
                  <label className="block font-semibold mb-1">Event Title *</label>
                  <input required value={f1} onChange={(e) => setF1(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Category *</label>
                  <select value={f2} onChange={(e) => setF2(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <option value="Holiday">Holiday</option>
                    <option value="Exam">Exam</option>
                    <option value="PTM">PTM</option>
                    <option value="Event">Event</option>
                    <option value="Sports">Sports</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Audience</label>
                  <select value={f5} onChange={(e) => setF5(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <option value="All">All</option>
                    <option value="Parents">Parents</option>
                    <option value="Staff">Staff</option>
                    <option value="Students">Students</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Start Date *</label>
                  <input type="date" required value={f3} onChange={(e) => setF3(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">End Date *</label>
                  <input type="date" required value={f4} onChange={(e) => setF4(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold mb-1">Details *</label>
                  <textarea required rows={3} value={f6} onChange={(e) => setF6(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold cursor-pointer">Save Event</button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // ==================== 12. REPORTING AREA ====================
  const summary = computeDashboardSummary(db, activeCampusId, today, 'month');

  const downloadFinancialCsv = () => {
    const header = 'Month,Income,Expense,Paid Vouchers,Unpaid Vouchers\n';
    const rows = summary.monthlyChart
      .map((m) => `${m.label},${m.income},${m.expense},${m.paidVouchers},${m.unpaidVouchers}`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iqra-school-financial-report-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadFinancialPdf = () => {
    exportTableToPdf({
      title: '12-Month Institutional Financial & Recovery Summary',
      subtitle: `Academic Session ${db.settings.sessionName} · Monthly Cashflow & Voucher Collection`,
      filename: `financial-summary-${today}.pdf`,
      headers: ['Month', `Income (${currency})`, `Expense (${currency})`, `Net (${currency})`, 'Paid Vouchers', 'Unpaid Vouchers'],
      rows: summary.monthlyChart.map((m) => [
        m.label,
        formatCurrency(m.income, currency, false),
        formatCurrency(m.expense, currency, false),
        formatCurrency(m.income - m.expense, currency, false),
        m.paidVouchers,
        m.unpaidVouchers,
      ]),
      settings: db.settings,
      campusName,
      generatedDate: today,
      summaryCards: [
        { label: 'Monthly Income', value: formatCurrency(summary.incomePeriod, currency, false), tone: 'emerald' },
        { label: 'Monthly Expense', value: formatCurrency(summary.expensePeriod, currency, false), tone: 'rose' },
        { label: 'Fee Recovery', value: `${summary.feeRecoveryPercent}%`, tone: 'teal' },
        { label: 'Attendance Today', value: `${summary.studentAttendancePercent}%`, tone: 'slate' },
      ],
      orientation: 'landscape',
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-700" />
            <span>Reporting Area</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Consolidated financial, fee recovery, attendance, and academic performance exports.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 no-print">
          <button
            type="button"
            onClick={downloadFinancialCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Financial CSV</span>
          </button>
          <button
            type="button"
            onClick={downloadFinancialPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Export Financial PDF</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Summary</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-slate-500">Monthly Income</div>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">
            {formatCurrency(summary.incomePeriod, currency, !showAmounts)}
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-slate-500">Monthly Expense</div>
          <div className="text-xl font-bold font-mono tabular-nums text-rose-600 mt-1">
            {formatCurrency(summary.expensePeriod, currency, !showAmounts)}
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-slate-500">Fee Recovery Rate</div>
          <div className="text-xl font-bold tabular-nums text-teal-700 dark:text-teal-400 mt-1">
            {summary.feeRecoveryPercent}%
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-slate-500">Attendance Today</div>
          <div className="text-xl font-bold tabular-nums text-blue-700 dark:text-blue-400 mt-1">
            {summary.studentAttendancePercent}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {canVisitPage('students') && (
          <button type="button" onClick={() => navigateTo('students', 'reports')} className="text-left rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 hover:border-teal-500 transition-colors cursor-pointer">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <CheckCircle2 className="w-4 h-4 text-teal-700" />
              <span>Student Strength &amp; Directory Report</span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5">Class-wise enrollment, gender breakdown, and CSV export.</p>
          </button>
        )}
        {canVisitPage('fees') && (
          <button type="button" onClick={() => navigateTo('fees', 'defaulters')} className="text-left rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 hover:border-teal-500 transition-colors cursor-pointer">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <CheckCircle2 className="w-4 h-4 text-rose-600" />
              <span>Fee Defaulters &amp; Receivables</span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5">Inspect unpaid invoices and total family dues.</p>
          </button>
        )}
        {canVisitPage('exams') && (
          <button type="button" onClick={() => navigateTo('exams')} className="text-left rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 hover:border-teal-500 transition-colors cursor-pointer">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              <span>Exam Tabulation &amp; Risk Analysis</span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5">Class-wise term grades, positions, and printable marksheets.</p>
          </button>
        )}
      </div>
    </div>
  );
};
