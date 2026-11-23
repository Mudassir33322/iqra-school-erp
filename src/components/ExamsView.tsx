import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, FileText, Pencil, Plus, Printer, Save, Trash2, X } from 'lucide-react';
import { useErp } from '../context/ErpContext';
import type { Exam, Student } from '../types/erp';
import { calculateGrade, computeStudentExamSummary } from '../utils/erpLogic';
import { exportMarksheetPdf } from '../utils/pdfExport';

export const ExamsView: React.FC = () => {
  const { db, today, activeCampusId, activeSubTab, mutate, canPerform } = useErp();
  const canEnterMarks = canPerform('enter_marks');
  const canManageExams = canPerform('manage_exams');

  const [tab, setTab] = useState<'marks' | 'tabulation' | 'exams'>(canEnterMarks ? 'marks' : 'tabulation');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [marksDraft, setMarksDraft] = useState<Record<string, string>>({});
  const [marksheetStudent, setMarksheetStudent] = useState<Student | null>(null);

  useEffect(() => {
    if (activeSubTab === 'exams' || activeSubTab === 'list') {
      setTab('exams');
    } else if (
      activeSubTab === 'tabulation' ||
      activeSubTab === 'positions' ||
      activeSubTab === 'marksheets'
    ) {
      setTab('tabulation');
    } else if (activeSubTab === 'marks' && canEnterMarks) {
      setTab('marks');
    }
  }, [activeSubTab, canEnterMarks]);

  useEffect(() => {
    if (!canEnterMarks && tab === 'marks') {
      setTab('tabulation');
    }
  }, [canEnterMarks, tab]);

  const [examModal, setExamModal] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [examTitle, setExamTitle] = useState('');
  const [examTerm, setExamTerm] = useState('Term 2');
  const [examStatus, setExamStatus] = useState<Exam['status']>('scheduled');

  const campusExams = useMemo(() => {
    if (!db) return [];
    return db.exams.filter((e) => activeCampusId === 'all' || e.campusId === activeCampusId);
  }, [db, activeCampusId]);

  const campusClasses = useMemo(() => {
    if (!db) return [];
    return db.classes.filter((c) => activeCampusId === 'all' || c.campusId === activeCampusId);
  }, [db, activeCampusId]);

  const campusSubjects = useMemo(() => {
    if (!db) return [];
    return db.subjects.filter((s) => activeCampusId === 'all' || s.campusId === activeCampusId);
  }, [db, activeCampusId]);

  useEffect(() => {
    if ((!selectedExamId || !campusExams.some((e) => e.id === selectedExamId)) && campusExams[0]) {
      setSelectedExamId(campusExams[0].id);
    }
    if (!selectedClassId && campusClasses.find((c) => c.className === 'Grade 9')) {
      setSelectedClassId(campusClasses.find((c) => c.className === 'Grade 9')!.id);
    } else if (!selectedClassId && campusClasses[0]) {
      setSelectedClassId(campusClasses[0].id);
    }
    if (!selectedSubjectId && campusSubjects[0]) setSelectedSubjectId(campusSubjects[0].id);
  }, [campusExams, campusClasses, campusSubjects, selectedExamId, selectedClassId, selectedSubjectId]);

  const targetStudents = useMemo(() => {
    if (!db) return [];
    return db.students.filter((s) => s.status === 'active' && s.classId === selectedClassId);
  }, [db, selectedClassId]);

  useEffect(() => {
    if (!db || !selectedExamId || !selectedSubjectId) return;
    const draft: Record<string, string> = {};
    for (const stu of targetStudents) {
      const m = db.marks.find(
        (mk) =>
          mk.examId === selectedExamId &&
          mk.subjectId === selectedSubjectId &&
          mk.studentId === stu.id
      );
      draft[stu.id] = m ? String(m.obtainedMarks) : '';
    }
    setMarksDraft(draft);
  }, [db, selectedExamId, selectedSubjectId, targetStudents]);

  if (!db) return null;

  const currentSub = db.subjects.find((s) => s.id === selectedSubjectId);
  const totalMarks = currentSub?.totalMarks || 100;

  const handleSaveMarks = async () => {
    const entries = targetStudents
      .filter((s) => marksDraft[s.id] !== '' && marksDraft[s.id] !== undefined)
      .map((s) => ({
        studentId: s.id,
        obtainedMarks: Number(marksDraft[s.id]) || 0,
      }));
    await mutate(
      '/api/exams/marks',
      'POST',
      {
        examId: selectedExamId,
        subjectId: selectedSubjectId,
        totalMarks,
        entries,
      },
      'Saved marks and updated exam tabulation.'
    );
  };

  const openNewExam = () => {
    setEditingExamId(null);
    setExamTitle('');
    setExamTerm('Term 2');
    setExamStatus('scheduled');
    setExamModal(true);
  };

  const openEditExam = (ex: Exam) => {
    setEditingExamId(ex.id);
    setExamTitle(ex.title);
    setExamTerm(ex.term);
    setExamStatus(ex.status);
    setExamModal(true);
  };

  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      campusId: activeCampusId === 'all' ? db.campuses[0]?.id : activeCampusId,
      title: examTitle,
      term: examTerm,
      status: examStatus,
      startDate: today,
      endDate: today,
    };
    const res = editingExamId
      ? await mutate(`/api/exams/${editingExamId}`, 'PATCH', payload, `Updated exam "${examTitle}".`)
      : await mutate('/api/exams', 'POST', payload, `Created exam "${examTitle}".`);
    if (res.ok) {
      setExamModal(false);
      setEditingExamId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Exam Management &amp; Tabulation
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Create/edit exams, enter subject marks, and print class tabulation sheets
            </p>
          </div>
        </div>

        {canManageExams && (
          <button
            type="button"
            onClick={openNewExam}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer no-print"
          >
            <Plus className="w-4 h-4" />
            <span>Create Exam</span>
          </button>
        )}
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
          {canEnterMarks && (
            <button
              type="button"
              onClick={() => setTab('marks')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                tab === 'marks' ? 'bg-white dark:bg-slate-700 shadow-2xs' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Marks Entry
            </button>
          )}
          <button
            type="button"
            onClick={() => setTab('tabulation')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              tab === 'tabulation' ? 'bg-white dark:bg-slate-700 shadow-2xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Tabulation Sheet
          </button>
          <button
            type="button"
            onClick={() => setTab('exams')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              tab === 'exams' ? 'bg-white dark:bg-slate-700 shadow-2xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            All Exams ({campusExams.length})
          </button>
        </div>

        {tab !== 'exams' && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              aria-label="Select Exam"
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              {campusExams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title} ({ex.status})
                </option>
              ))}
            </select>

            <select
              aria-label="Select Class"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              {campusClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.className} · {c.sectionName}
                </option>
              ))}
            </select>

            {tab === 'marks' && (
              <select
                aria-label="Select Subject"
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                {campusSubjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({sub.className})
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {tab === 'exams' ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold">Examination Schedule &amp; Date Sheets</h2>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer no-print"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>Print Date Sheet</span>
            </button>
          </div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <th className="py-3 px-4">Exam Title</th>
                <th className="py-3 px-4">Term</th>
                <th className="py-3 px-4">Dates</th>
                <th className="py-3 px-4">Status</th>
                {canManageExams && <th className="py-3 px-4 text-right no-print">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {campusExams.map((ex) => (
                <tr key={ex.id}>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{ex.title}</td>
                  <td className="py-3 px-4">{ex.term}</td>
                  <td className="py-3 px-4 font-mono text-slate-500">
                    {ex.startDate} → {ex.endDate}
                  </td>
                  <td className="py-3 px-4 capitalize font-semibold">{ex.status}</td>
                  {canManageExams && (
                    <td className="py-3 px-4 text-right space-x-1.5 no-print">
                      <button
                        type="button"
                        onClick={() => openEditExam(ex)}
                        aria-label={`Edit exam ${ex.title}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void mutate(`/api/exams/${ex.id}`, 'DELETE', undefined, `Deleted exam "${ex.title}".`)
                        }
                        aria-label={`Delete exam ${ex.title}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold cursor-pointer"
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
      ) : tab === 'marks' && canEnterMarks ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Max Marks: <strong className="font-mono text-slate-900 dark:text-white">{totalMarks}</strong>
            </div>
            <button
              type="button"
              onClick={handleSaveMarks}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Marks</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Obtained Marks</th>
                  <th className="py-2.5 px-3">Percentage</th>
                  <th className="py-2.5 px-3">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {targetStudents.map((stu) => {
                  const val = marksDraft[stu.id] ?? '';
                  const pct = val !== '' ? Math.round(((Number(val) || 0) / totalMarks) * 100) : null;
                  const gradeInfo = pct !== null ? calculateGrade(pct) : null;
                  return (
                    <tr key={stu.id}>
                      <td className="py-2.5 px-3 font-mono">{stu.studentCode}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                        {stu.name}
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min={0}
                          max={totalMarks}
                          disabled={!canEnterMarks}
                          value={val}
                          onChange={(e) =>
                            setMarksDraft((prev) => ({ ...prev, [stu.id]: e.target.value }))
                          }
                          placeholder="0 - 100"
                          className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono tabular-nums disabled:opacity-60"
                        />
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums">
                        {pct !== null ? `${pct}%` : '—'}
                      </td>
                      <td className="py-2.5 px-3 font-bold">
                        {gradeInfo ? (
                          <span className={gradeInfo.atRisk ? 'text-rose-600' : 'text-emerald-700 dark:text-emerald-400'}>
                            {gradeInfo.grade} · {gradeInfo.remark}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Class Tabulation Sheet</h2>
            <div className="flex items-center gap-2 no-print">
              <button
                type="button"
                onClick={() => {
                  const header = 'Code,Student Name,Obtained,Total,Percentage,Grade\n';
                  const rows = targetStudents
                    .map((stu) => {
                      const res = computeStudentExamSummary(stu, db.marks, selectedExamId);
                      return `${stu.studentCode},"${stu.name.replaceAll('"', '""')}",${res.obtained},${res.total},${res.total > 0 ? `${res.percentage}%` : 'N/A'},${res.total > 0 ? res.grade : 'N/A'}`;
                    })
                    .join('\n');
                  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `iqra-tabulation-${today}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-blue-600" />
                <span>Print Sheet</span>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Student</th>
                  <th className="py-2.5 px-3 text-right">Obtained</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                  <th className="py-2.5 px-3 text-right">Percentage</th>
                  <th className="py-2.5 px-3">Grade &amp; Standing</th>
                  <th className="py-2.5 px-3 text-right">Result Card</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {targetStudents.map((stu) => {
                  const res = computeStudentExamSummary(stu, db.marks, selectedExamId);
                  return (
                    <tr key={stu.id}>
                      <td className="py-2.5 px-3 font-mono">{stu.studentCode}</td>
                      <td className="py-2.5 px-3 font-semibold">{stu.name}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">{res.obtained}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">{res.total}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold">
                        {res.total > 0 ? `${res.percentage}%` : '—'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold">
                        {res.total > 0 ? (
                          <span className={res.atRisk ? 'text-rose-600' : 'text-emerald-700 dark:text-emerald-400'}>
                            {res.grade} {res.atRisk ? '(At Risk)' : ''}
                          </span>
                        ) : (
                          'No Marks'
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setMarksheetStudent(stu)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
                        >
                          <Printer className="w-3 h-3 text-blue-600" />
                          <span>Marksheet</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {examModal && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold">{editingExamId ? 'Edit Exam' : 'Create New Exam'}</h3>
              <button type="button" onClick={() => setExamModal(false)} aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveExam} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Exam Title *</label>
                <input
                  required
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder="e.g. Final Term Examination 2027"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Term</label>
                  <input
                    value={examTerm}
                    onChange={(e) => setExamTerm(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Status</label>
                  <select
                    value={examStatus}
                    onChange={(e) => setExamStatus(e.target.value as Exam['status'])}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setExamModal(false)} className="px-4 py-2 rounded-xl border border-slate-200">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-teal-700 text-white font-semibold cursor-pointer">
                  {editingExamId ? 'Save Changes' : 'Create Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {marksheetStudent && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold">{db.settings.schoolName} · Official Result Card</h3>
                <p className="text-xs text-slate-500">
                  {campusExams.find((e) => e.id === selectedExamId)?.title || 'Term Exam'} · Session {db.settings.sessionName}
                </p>
              </div>
              <button type="button" onClick={() => setMarksheetStudent(null)} aria-label="Close marksheet" className="no-print">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
              <div>Student: <strong>{marksheetStudent.name}</strong> ({marksheetStudent.studentCode})</div>
              <div>Father: <strong>{marksheetStudent.fatherName}</strong></div>
              <div>Class: <strong>{marksheetStudent.className} · {marksheetStudent.sectionName}</strong></div>
              <div>Roll No: <strong className="font-mono">{marksheetStudent.rollNo}</strong></div>
            </div>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-2">Subject</th>
                  <th className="py-2 text-right">Obtained</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {db.marks
                  .filter((m) => m.examId === selectedExamId && m.studentId === marksheetStudent.id)
                  .map((m) => {
                    const subName = db.subjects.find((s) => s.id === m.subjectId)?.name || m.subjectId;
                    return (
                      <tr key={m.id}>
                        <td className="py-2 font-medium">{subName}</td>
                        <td className="py-2 text-right font-mono tabular-nums font-bold">{m.obtainedMarks}</td>
                        <td className="py-2 text-right font-mono tabular-nums">{m.totalMarks}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            {(() => {
              const summary = computeStudentExamSummary(marksheetStudent, db.marks, selectedExamId);
              return (
                <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 text-xs font-bold">
                  <span>Total: {summary.obtained}/{summary.total} ({summary.percentage}%)</span>
                  <span className={summary.atRisk ? 'text-rose-600' : 'text-emerald-700'}>
                    Grade: {summary.grade}
                  </span>
                </div>
              );
            })()}
            <div className="flex flex-wrap justify-end gap-2 pt-2 no-print">
              <button type="button" onClick={() => setMarksheetStudent(null)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const summary = computeStudentExamSummary(marksheetStudent, db.marks, selectedExamId);
                  const examTitle = campusExams.find((e) => e.id === selectedExamId)?.title || 'Term Exam';
                  const rows = db.marks
                    .filter((m) => m.examId === selectedExamId && m.studentId === marksheetStudent.id)
                    .map((m) => {
                      const pct = m.totalMarks > 0 ? Math.round((m.obtainedMarks / m.totalMarks) * 100) : 0;
                      return {
                        subject: db.subjects.find((s) => s.id === m.subjectId)?.name || m.subjectId,
                        obtained: m.obtainedMarks,
                        total: m.totalMarks,
                        grade: calculateGrade(pct).grade,
                      };
                    });
                  exportMarksheetPdf({
                    settings: db.settings,
                    examTitle,
                    studentName: marksheetStudent.name,
                    studentCode: marksheetStudent.studentCode,
                    fatherName: marksheetStudent.fatherName,
                    className: `${marksheetStudent.className} · ${marksheetStudent.sectionName}`,
                    rollNo: marksheetStudent.rollNo,
                    rows,
                    totalObtained: summary.obtained,
                    totalMax: summary.total,
                    percentage: summary.percentage,
                    overallGrade: summary.grade,
                    remark: calculateGrade(summary.percentage).remark,
                    issuedDate: today,
                    filename: `result-card-${marksheetStudent.studentCode}.pdf`,
                  });
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                Download Result Card PDF
              </button>
              <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold cursor-pointer">
                <Printer className="w-3.5 h-3.5" />
                Print Result Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
