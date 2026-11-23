import React, { useState } from 'react';
import { BookOpen, LayoutGrid, Pencil, Plus, Printer, Trash2, X } from 'lucide-react';
import { useErp } from '../context/ErpContext';
import type { ClassSection, Subject } from '../types/erp';
import { formatCurrency } from '../utils/erpLogic';

export const AcademicsView: React.FC<{ mode: 'classes' | 'subjects' }> = ({ mode }) => {
  const { db, activeCampusId, showAmounts, mutate, canPerform } = useErp();
  const canManageClasses = canPerform('manage_classes');
  const canManageSubjects = canPerform('manage_subjects');
  const canUpdateSyllabus = canPerform('update_syllabus');

  const [classModal, setClassModal] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [className, setClassName] = useState('');
  const [sectionName, setSectionName] = useState('A');
  const [monthlyFee, setMonthlyFee] = useState('7500');
  const [room, setRoom] = useState('F-105');
  const [capacity, setCapacity] = useState('35');

  const [subModal, setSubModal] = useState(false);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [subName, setSubName] = useState('');
  const [subCode, setSubCode] = useState('');
  const [subClass, setSubClass] = useState('Grade 9');
  const [subMarks, setSubMarks] = useState('100');

  if (!db) return null;

  const currency = db.settings.currency || 'Rs';
  const classes = db.classes.filter((c) => activeCampusId === 'all' || c.campusId === activeCampusId);
  const subjects = db.subjects.filter((s) => activeCampusId === 'all' || s.campusId === activeCampusId);

  const openNewClass = () => {
    setEditingClassId(null);
    setClassName('');
    setSectionName('A');
    setMonthlyFee('7500');
    setRoom('F-105');
    setCapacity('35');
    setClassModal(true);
  };

  const openEditClass = (cls: ClassSection) => {
    setEditingClassId(cls.id);
    setClassName(cls.className);
    setSectionName(cls.sectionName);
    setMonthlyFee(String(cls.monthlyFee));
    setRoom(cls.room);
    setCapacity(String(cls.capacity));
    setClassModal(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      campusId: activeCampusId === 'all' ? db.campuses[0]?.id : activeCampusId,
      className,
      sectionName,
      monthlyFee: Number(monthlyFee) || 7000,
      room,
      capacity: Number(capacity) || 35,
    };
    const res = editingClassId
      ? await mutate(`/api/classes/${editingClassId}`, 'PATCH', payload, `Updated ${className} (${sectionName}).`)
      : await mutate('/api/classes', 'POST', payload, `Added ${className} (${sectionName}).`);
    if (res.ok) {
      setClassModal(false);
      setEditingClassId(null);
    }
  };

  const openNewSubject = () => {
    setEditingSubId(null);
    setSubName('');
    setSubCode('');
    setSubClass('Grade 9');
    setSubMarks('100');
    setSubModal(true);
  };

  const openEditSubject = (sub: Subject) => {
    setEditingSubId(sub.id);
    setSubName(sub.name);
    setSubCode(sub.code);
    setSubClass(sub.className);
    setSubMarks(String(sub.totalMarks));
    setSubModal(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      campusId: activeCampusId === 'all' ? db.campuses[0]?.id : activeCampusId,
      name: subName,
      code: subCode,
      className: subClass,
      totalMarks: Number(subMarks) || 100,
    };
    const res = editingSubId
      ? await mutate(`/api/subjects/${editingSubId}`, 'PATCH', payload, `Updated subject ${subName}.`)
      : await mutate('/api/subjects', 'POST', payload, `Added subject ${subName}.`);
    if (res.ok) {
      setSubModal(false);
      setEditingSubId(null);
    }
  };

  if (mode === 'subjects') {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Manage Subjects &amp; Syllabus
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track scheme of studies completion across classes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 no-print">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>Print Syllabus</span>
            </button>
            {canManageSubjects && (
              <button
                type="button"
                onClick={openNewSubject}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Subject</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((sub) => {
            const teacher = db.staff.find((t) => t.id === sub.teacherId);
            return (
              <div
                key={sub.id}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{sub.name}</div>
                    <div className="text-xs text-slate-500">
                      {sub.code} · {sub.className} · {sub.totalMarks} marks
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold tabular-nums text-teal-700 dark:text-teal-400">
                      {sub.syllabusProgress}%
                    </span>
                    {canManageSubjects && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditSubject(sub)}
                          aria-label={`Edit subject ${sub.name}`}
                          className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void mutate(`/api/subjects/${sub.id}`, 'DELETE', undefined, `Deleted subject ${sub.name}.`)
                          }
                          aria-label={`Delete subject ${sub.name}`}
                          className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-teal-600 rounded-full"
                    style={{ width: `${sub.syllabusProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>{teacher?.name || 'Assigned Teacher'}</span>
                  {canUpdateSyllabus && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          void mutate(`/api/subjects/${sub.id}/progress`, 'PATCH', {
                            syllabusProgress: Math.min(100, sub.syllabusProgress + 5),
                          }, `Updated ${sub.name} syllabus progress.`)
                        }
                        className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-semibold cursor-pointer"
                      >
                        +5% Progress
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {subModal && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-bold">{editingSubId ? 'Edit Subject' : 'Add Subject'}</h3>
                <button type="button" onClick={() => setSubModal(false)} aria-label="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSaveSubject} className="mt-4 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Subject Name *</label>
                  <input
                    required
                    value={subName}
                    onChange={(e) => setSubName(e.target.value)}
                    placeholder="e.g. Chemistry"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Code</label>
                    <input
                      value={subCode}
                      onChange={(e) => setSubCode(e.target.value)}
                      placeholder="CHM-101"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Class *</label>
                    <input
                      required
                      value={subClass}
                      onChange={(e) => setSubClass(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Max Marks</label>
                    <input
                      type="number"
                      min={10}
                      value={subMarks}
                      onChange={(e) => setSubMarks(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setSubModal(false)} className="px-4 py-2 rounded-xl border border-slate-200">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 rounded-xl bg-teal-700 text-white font-semibold cursor-pointer">
                    {editingSubId ? 'Save Changes' : 'Save Subject'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Classes &amp; Sections</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {classes.length} active class sections configured
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            <span>Print Classes</span>
          </button>
          {canManageClasses && (
            <button
              type="button"
              onClick={openNewClass}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Class Section</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((cls) => {
          const enrolled = db.students.filter((s) => s.classId === cls.id && s.status === 'active').length;
          const teacher = db.staff.find((t) => t.id === cls.classTeacherId);
          return (
            <div
              key={cls.id}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {cls.className} · {cls.sectionName}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Room {cls.room} · {teacher?.name || 'Class Teacher Unassigned'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-semibold text-teal-700 dark:text-teal-400 tabular-nums">
                    {enrolled}/{cls.capacity}
                  </span>
                  {canManageClasses && (
                    <>
                      <button
                        type="button"
                        onClick={() => openEditClass(cls)}
                        aria-label={`Edit ${cls.className} ${cls.sectionName}`}
                        className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void mutate(`/api/classes/${cls.id}`, 'DELETE', undefined, `Deleted ${cls.className} (${cls.sectionName}).`)
                        }
                        aria-label={`Delete ${cls.className} ${cls.sectionName}`}
                        className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full"
                  style={{ width: `${Math.min(100, (enrolled / cls.capacity) * 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Monthly Tuition</span>
                <span className="font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                  {formatCurrency(cls.monthlyFee, currency, !showAmounts)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {classModal && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold">
                {editingClassId ? 'Edit Class & Section' : 'Add Class & Section'}
              </h3>
              <button type="button" onClick={() => setClassModal(false)} aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveClass} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Class Name *</label>
                  <input
                    required
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="e.g. Grade 6"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Section *</label>
                  <input
                    required
                    value={sectionName}
                    onChange={(e) => setSectionName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Monthly Fee ({currency})</label>
                  <input
                    type="number"
                    value={monthlyFee}
                    onChange={(e) => setMonthlyFee(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Room</label>
                  <input
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Capacity</label>
                  <input
                    type="number"
                    min={1}
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setClassModal(false)} className="px-4 py-2 rounded-xl border border-slate-200">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-teal-700 text-white font-semibold cursor-pointer">
                  {editingClassId ? 'Save Changes' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
