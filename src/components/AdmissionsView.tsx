import React, { useMemo, useState } from 'react';
import { Check, CheckCircle2, Download, FileText, Pencil, Phone, Printer, Search, Trash2, UserPlus, Users, X } from 'lucide-react';
import { useErp } from '../context/ErpContext';
import type { AdmissionInquiry, FeeVoucher, Gender, Student } from '../types/erp';
import { exportAdmissionFormPdf } from '../utils/pdfExport';

const FALLBACK_CLASSES = [
  'Playgroup',
  'Nursery',
  'Prep',
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
];

export const AdmissionsView: React.FC = () => {
  const { db, activeCampusId, mutate, canPerform, navigateTo, today } = useErp();
  const canManage = canPerform('manage_admissions');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [applicantName, setApplicantName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [appliedClass, setAppliedClass] = useState('Grade 5');
  const [gender, setGender] = useState<Gender>('male');
  const [dob, setDob] = useState('2016-05-10');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [parentCnic, setParentCnic] = useState('');
  const [bFormNo, setBFormNo] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [previousSchool, setPreviousSchool] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'contacted' | 'approved' | 'rejected'>('all');

  // Approve & Enroll modal (with section picker & optional admission challan)
  const [approveTarget, setApproveTarget] = useState<AdmissionInquiry | null>(null);
  const [approveClassId, setApproveClassId] = useState('');
  const [approveSection, setApproveSection] = useState('A');
  const [generateVoucher, setGenerateVoucher] = useState(true);
  const [admissionFeeAmount, setAdmissionFeeAmount] = useState('3000');
  const [recentEnrollment, setRecentEnrollment] = useState<{
    inquiry: AdmissionInquiry;
    student: Student;
    voucher: FeeVoucher | null;
  } | null>(null);

  const classOptions = useMemo(() => {
    if (!db) return FALLBACK_CLASSES;
    const names = Array.from(new Set([...db.classes.map((c) => c.className), ...FALLBACK_CLASSES]));
    return names;
  }, [db]);

  if (!db) return null;

  const q = search.trim().toLowerCase();
  const inquiries = db.inquiries.filter((i) => {
    if (activeCampusId !== 'all' && i.campusId !== activeCampusId) return false;
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    if (!q) return true;
    return (
      i.applicantName.toLowerCase().includes(q) ||
      i.fatherName.toLowerCase().includes(q) ||
      i.appliedClass.toLowerCase().includes(q) ||
      i.phone.toLowerCase().includes(q)
    );
  });

  const openNew = () => {
    if (!canManage) return;
    setEditingId(null);
    setApplicantName('');
    setFatherName('');
    setAppliedClass(classOptions[0] || 'Grade 5');
    setGender('male');
    setDob('2016-05-10');
    setPhone('');
    setEmail('');
    setParentCnic('');
    setBFormNo('');
    setAddress('');
    setNotes('');
    setPreviousSchool('');
    setModalOpen(true);
  };

  const openEdit = (inq: AdmissionInquiry) => {
    if (!canManage) return;
    setEditingId(inq.id);
    setApplicantName(inq.applicantName);
    setFatherName(inq.fatherName);
    setAppliedClass(inq.appliedClass);
    setGender(inq.gender);
    setDob(inq.dob || '2016-05-10');
    setPhone(inq.phone);
    setEmail(inq.email || '');
    setParentCnic(inq.parentCnic || '');
    setBFormNo(inq.bFormNo || '');
    setAddress(inq.address || '');
    setNotes(inq.notes || '');
    setPreviousSchool(inq.previousSchool);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    const payload = {
      campusId: activeCampusId === 'all' ? db.campuses[0]?.id : activeCampusId,
      applicantName,
      fatherName,
      appliedClass,
      gender,
      dob,
      phone,
      email,
      parentCnic,
      bFormNo,
      address,
      notes,
      previousSchool,
    };
    const res = editingId
      ? await mutate(`/api/admissions/${editingId}`, 'PATCH', payload, `Updated inquiry for ${applicantName}.`)
      : await mutate('/api/admissions', 'POST', payload, `Added admission inquiry for ${applicantName}.`);
    if (res.ok) {
      setModalOpen(false);
      setEditingId(null);
    }
  };

  const handleDownloadInquiryPdf = (inq: AdmissionInquiry) => {
    const campusName = db.campuses.find((c) => c.id === inq.campusId)?.name || 'Main Campus';
    const enrolledStu = inq.enrolledStudentId
      ? db.students.find((s) => s.id === inq.enrolledStudentId)
      : undefined;
    void exportAdmissionFormPdf({
      settings: db.settings,
      campusName,
      formTitle: inq.status === 'approved' ? 'Official Student Admission Form' : 'Admission Inquiry & Assessment Form',
      refCode: inq.enrolledStudentCode || inq.id.slice(-8).toUpperCase(),
      appliedDate: inq.appliedDate,
      statusLabel: inq.status,
      studentName: inq.applicantName,
      fatherName: inq.fatherName,
      gender: inq.gender,
      dob: inq.dob,
      classLabel: enrolledStu ? `${enrolledStu.className} (${enrolledStu.sectionName})` : inq.appliedClass,
      rollOrCode: enrolledStu?.studentCode || inq.enrolledStudentCode,
      phone: inq.phone,
      email: inq.email,
      cnic: inq.parentCnic,
      bFormNo: inq.bFormNo,
      bloodGroup: enrolledStu?.bloodGroup,
      address: inq.address,
      previousSchool: inq.previousSchool,
      monthlyFee: enrolledStu ? `${db.settings.currency} ${enrolledStu.monthlyFee.toLocaleString()}` : undefined,
      notes: inq.notes,
      filename: `admission-form-${(enrolledStu?.studentCode || inq.applicantName).toLowerCase().replaceAll(' ', '-')}.pdf`,
    });
  };

  const confirmApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveTarget) return;
    const res = await mutate<{
      inquiry: AdmissionInquiry;
      student: Student | null;
      voucher: FeeVoucher | null;
    }>(
      `/api/admissions/${approveTarget.id}/decision`,
      'POST',
      {
        decision: 'approved',
        classId: approveClassId || undefined,
        sectionName: approveSection,
        generateInitialVoucher: generateVoucher,
        admissionFeeAmount: Number(admissionFeeAmount) || 0,
      },
      `Approved & enrolled ${approveTarget.applicantName} into ${approveTarget.appliedClass} (${approveSection})!`
    );
    if (res.ok) {
      if (res.data?.student) {
        setRecentEnrollment({
          inquiry: res.data.inquiry,
          student: res.data.student,
          voucher: res.data.voucher || null,
        });
      }
      setApproveTarget(null);
    }
  };

  const downloadCsv = () => {
    const header = 'Applicant Name,Father Name,Applied Class,Gender,Phone,Previous School,Status,Inquiry Date\n';
    const rows = inquiries
      .map(
        (i) =>
          `"${i.applicantName.replaceAll('"', '""')}","${i.fatherName.replaceAll('"', '""')}","${i.appliedClass}",${i.gender},"${i.phone}","${i.previousSchool.replaceAll('"', '""')}",${i.status},${i.appliedDate}`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iqra-admissions-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const matchingSections = approveTarget
    ? Array.from(
        new Set(
          db.classes
            .filter((c) => c.className.toLowerCase() === approveTarget.appliedClass.toLowerCase())
            .map((c) => c.sectionName)
        )
      )
    : [];
  const availableSections = matchingSections.length > 0 ? matchingSections : ['A', 'B', 'Science', 'Blue'];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Admissions &amp; Inquiries
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Approve applications to automatically enroll students into classes
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 no-print">
          <button
            type="button"
            onClick={downloadCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            <span>Print Register</span>
          </button>
          {canManage && (
            <button
              type="button"
              onClick={openNew}
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
            >
              + New Inquiry
            </button>
          )}
        </div>
      </div>

      {recentEnrollment && (
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-slate-900 dark:text-white">
                Admission Completed: {recentEnrollment.student.name} ({recentEnrollment.student.studentCode})
              </div>
              <div className="text-slate-600 dark:text-slate-300 mt-0.5">
                Enrolled in {recentEnrollment.student.className} ({recentEnrollment.student.sectionName}) · Roll #{recentEnrollment.student.rollNo}
                {recentEnrollment.voucher
                  ? ` · Voucher #${recentEnrollment.voucher.voucherNo} (${db.settings.currency} ${recentEnrollment.voucher.totalAmount.toLocaleString()}) issued`
                  : ''}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleDownloadInquiryPdf(recentEnrollment.inquiry)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-700 text-white font-semibold cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Admission Form PDF</span>
            </button>
            <button
              type="button"
              onClick={() => navigateTo('students')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-teal-700" />
              <span>View Student Profile</span>
            </button>
            <button
              type="button"
              onClick={() => setRecentEnrollment(null)}
              aria-label="Dismiss enrollment confirmation"
              className="p-1 text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search applicant, father, class or phone..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(['all', 'new', 'contacted', 'approved', 'rejected'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize border cursor-pointer ${
                statusFilter === st
                  ? 'bg-teal-700 border-teal-700 text-white'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
              <th className="py-3 px-4 font-semibold">Applicant</th>
              <th className="py-3 px-4 font-semibold">Father Name</th>
              <th className="py-3 px-4 font-semibold">Applied Class</th>
              <th className="py-3 px-4 font-semibold">Contact</th>
              <th className="py-3 px-4 font-semibold">Previous School</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              {canManage && <th className="py-3 px-4 font-semibold text-right no-print">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {inquiries.map((inq) => (
              <tr key={inq.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                  {inq.applicantName}
                </td>
                <td className="py-3 px-4">{inq.fatherName}</td>
                <td className="py-3 px-4">{inq.appliedClass}</td>
                <td className="py-3 px-4 font-mono tabular-nums">{inq.phone}</td>
                <td className="py-3 px-4 text-slate-500">{inq.previousSchool}</td>
                <td className="py-3 px-4 capitalize font-semibold">
                  <span
                    className={
                      inq.status === 'approved'
                        ? 'text-emerald-600'
                        : inq.status === 'rejected'
                          ? 'text-rose-600'
                          : 'text-amber-600'
                    }
                  >
                    {inq.status}
                  </span>
                </td>
                {canManage && (
                  <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap no-print">
                    {inq.status !== 'approved' && inq.status !== 'rejected' && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            void mutate(
                              `/api/admissions/${inq.id}/decision`,
                              'POST',
                              { decision: 'contacted' },
                              `Marked ${inq.applicantName} as contacted.`
                            )
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer"
                        >
                          <Phone className="w-3 h-3" />
                          Contacted
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const matched = db.classes.find(
                              (c) => c.className.toLowerCase() === inq.appliedClass.toLowerCase()
                            );
                            setApproveClassId(matched?.id || '');
                            setApproveSection(matched?.sectionName || 'A');
                            setGenerateVoucher(true);
                            setApproveTarget(inq);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          Approve &amp; Enroll
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void mutate(
                              `/api/admissions/${inq.id}/decision`,
                              'POST',
                              { decision: 'rejected' },
                              `Marked inquiry rejected.`
                            )
                          }
                          aria-label={`Reject ${inq.applicantName}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-600 text-white text-xs font-semibold cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDownloadInquiryPdf(inq)}
                      aria-label={`Download admission form PDF for ${inq.applicantName}`}
                      title="Download Admission Form PDF"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold cursor-pointer"
                    >
                      <FileText className="w-3 h-3" />
                      Form PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(inq)}
                      aria-label={`Edit inquiry ${inq.applicantName}`}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void mutate(`/api/admissions/${inq.id}`, 'DELETE', undefined, `Deleted inquiry for ${inq.applicantName}.`)
                      }
                      aria-label={`Delete inquiry ${inq.applicantName}`}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {inquiries.length === 0 && (
              <tr>
                <td colSpan={canManage ? 7 : 6} className="py-10 text-center text-slate-400">
                  No admission inquiries match your filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {approveTarget && canManage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <form
            onSubmit={confirmApprove}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold">Enroll {approveTarget.applicantName}</h3>
              <button type="button" onClick={() => setApproveTarget(null)} aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              Confirm enrollment for <strong>{approveTarget.appliedClass}</strong>. This creates the Student Record, links/creates a Parent Account, and optionally issues the Admission Fee Challan.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Assign Class &amp; Section</label>
                <select
                  value={approveClassId}
                  onChange={(e) => {
                    setApproveClassId(e.target.value);
                    const cls = db.classes.find((c) => c.id === e.target.value);
                    if (cls) setApproveSection(cls.sectionName);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="">Auto-Match ({approveTarget.appliedClass})</option>
                  {db.classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.className} · {cls.sectionName} ({db.settings.currency} {cls.monthlyFee})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Section Tag</label>
                <select
                  value={approveSection}
                  onChange={(e) => setApproveSection(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {availableSections.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <label className="flex items-center gap-2 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={generateVoucher}
                  onChange={(e) => setGenerateVoucher(e.target.checked)}
                  className="rounded accent-teal-700"
                />
                <span>Generate Admission + First Month Fee Voucher</span>
              </label>
              {generateVoucher && (
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    One-Time Admission / Registration Fee ({db.settings.currency})
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={admissionFeeAmount}
                    onChange={(e) => setAdmissionFeeAmount(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setApproveTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
              >
                Confirm &amp; Enroll
              </button>
            </div>
          </form>
        </div>
      )}

      {modalOpen && canManage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold">
                {editingId ? 'Edit Admission Inquiry' : 'New Admission Inquiry'}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} aria-label="Close modal">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Applicant Name *</label>
                  <input
                    required
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Father / Guardian Name *</label>
                  <input
                    required
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Applied Class *</label>
                  <select
                    value={appliedClass}
                    onChange={(e) => setAppliedClass(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {classOptions.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Parent Phone *</label>
                  <input
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0300-1234567"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Guardian CNIC</label>
                  <input
                    value={parentCnic}
                    onChange={(e) => setParentCnic(e.target.value)}
                    placeholder="42201-1234567-1"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Student B-Form</label>
                  <input
                    value={bFormNo}
                    onChange={(e) => setBFormNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Previous School</label>
                  <input
                    value={previousSchool}
                    onChange={(e) => setPreviousSchool(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Address</label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Notes</label>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-700 text-white font-semibold cursor-pointer"
                >
                  {editingId ? 'Save Changes' : 'Save Inquiry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

