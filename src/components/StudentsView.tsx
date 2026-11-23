import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  Cake,
  Camera,
  CheckCircle2,
  Download,
  FileText,
  GraduationCap,
  IdCard,
  Link2,
  Pencil,
  Printer,
  ScanFace,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import type { Gender, Student, StudentStatus } from '../types/erp';
import { buildCsvContent, calculateGrade, formatCurrency } from '../utils/erpLogic';
import { extractBiometricFromImageElement } from '../utils/faceRecognition';
import { exportAdmissionFormPdf, exportTableToPdf } from '../utils/pdfExport';

type StudentSubTab = 'info' | 'promotion' | 'transfer' | 'birthdays' | 'reports';

export const StudentsView: React.FC<{ initialMode?: 'students' | 'parents' }> = ({
  initialMode = 'students',
}) => {
  const { db, today, activeCampusId, activeSubTab, showAmounts, canPerform, mutate, notify, navigateTo } = useErp();
  const canManageStudents = canPerform('manage_students');
  const canManageParents = canPerform('manage_parents');

  const [subTab, setSubTab] = useState<StudentSubTab>('info');
  const [statusFilter, setStatusFilter] = useState<StudentStatus>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [admitModalOpen, setAdmitModalOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [recentAdmittedStudent, setRecentAdmittedStudent] = useState<Student | null>(null);

  // Edit Parent modal state
  const [editingParent, setEditingParent] = useState<{
    parentId?: string;
    oldPhone: string;
    oldName: string;
    fatherName: string;
    parentPhone: string;
    parentEmail: string;
    parentCnic: string;
    address: string;
    occupation: string;
  } | null>(null);

  // Add Parent modal & Link Child modal
  const [addParentModalOpen, setAddParentModalOpen] = useState(false);
  const [newParentName, setNewParentName] = useState('');
  const [newParentPhone, setNewParentPhone] = useState('');
  const [newParentEmail, setNewParentEmail] = useState('');
  const [newParentCnic, setNewParentCnic] = useState('');
  const [newParentAddress, setNewParentAddress] = useState('');
  const [newParentOccupation, setNewParentOccupation] = useState('');
  const [linkChildModal, setLinkChildModal] = useState<{ parentId: string; parentName: string } | null>(null);
  const [linkStudentId, setLinkStudentId] = useState('');

  // Promotion selection
  const [promoSelectedIds, setPromoSelectedIds] = useState<string[]>([]);
  const [promoTargetClassId, setPromoTargetClassId] = useState('');

  // Admit / Edit Student Form state
  const [formParentId, setFormParentId] = useState('');
  const [formName, setFormName] = useState('');
  const [formFather, setFormFather] = useState('');
  const [formGender, setFormGender] = useState<Gender>('male');
  const [formDob, setFormDob] = useState('2015-05-15');
  const [formClassId, setFormClassId] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCnic, setFormCnic] = useState('');
  const [formBForm, setFormBForm] = useState('');
  const [formBloodGroup, setFormBloodGroup] = useState('');
  const [formEmergencyPhone, setFormEmergencyPhone] = useState('');
  const [formPreviousSchool, setFormPreviousSchool] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formFee, setFormFee] = useState('');
  const [formDiscount, setFormDiscount] = useState('0');
  const [formFaceAvatar, setFormFaceAvatar] = useState('');
  const [formFaceDescriptor, setFormFaceDescriptor] = useState<number[]>([]);
  const [formGenerateInitialVoucher, setFormGenerateInitialVoucher] = useState(true);
  const [formAdmissionFeeAmount, setFormAdmissionFeeAmount] = useState('3000');
  const [submitting, setSubmitting] = useState(false);

  const campusClasses = useMemo(() => {
    if (!db) return [];
    return db.classes.filter((c) => activeCampusId === 'all' || c.campusId === activeCampusId);
  }, [db, activeCampusId]);

  useEffect(() => {
    if (activeSubTab === 'admit' && canManageStudents) {
      setSubTab('info');
      const defaultCls = (db?.classes || []).find(
        (c) => activeCampusId === 'all' || c.campusId === activeCampusId
      );
      setEditingStudentId(null);
      setFormParentId('');
      setFormClassId(defaultCls?.id || '');
      setFormFee(defaultCls ? String(defaultCls.monthlyFee) : '6500');
      setFormName('');
      setFormFather('');
      setFormGender('male');
      setFormDob('2015-05-15');
      setFormPhone('');
      setFormEmail('');
      setFormCnic('');
      setFormBForm('');
      setFormBloodGroup('');
      setFormEmergencyPhone('');
      setFormPreviousSchool('');
      setFormAddress('');
      setFormDiscount('0');
      setFormFaceAvatar('');
      setFormFaceDescriptor([]);
      setFormGenerateInitialVoucher(true);
      setFormAdmissionFeeAmount('3000');
      setAdmitModalOpen(true);
      return;
    }
    if (
      activeSubTab === 'info' ||
      activeSubTab === 'promotion' ||
      activeSubTab === 'transfer' ||
      activeSubTab === 'birthdays' ||
      activeSubTab === 'reports'
    ) {
      setSubTab(activeSubTab);
    }
  }, [activeSubTab, canManageStudents]);

  const campusStudents = useMemo(() => {
    if (!db) return [];
    return db.students.filter((s) => activeCampusId === 'all' || s.campusId === activeCampusId);
  }, [db, activeCampusId]);

  const counts = useMemo(
    () => ({
      active: campusStudents.filter((s) => s.status === 'active').length,
      deactivated: campusStudents.filter((s) => s.status === 'deactivated').length,
      withdrawn: campusStudents.filter((s) => s.status === 'withdrawn').length,
    }),
    [campusStudents]
  );

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return campusStudents.filter((s) => {
      if (s.status !== statusFilter) return false;
      if (classFilter !== 'all' && s.classId !== classFilter) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.fatherName.toLowerCase().includes(q) ||
        s.studentCode.toLowerCase().includes(q) ||
        s.parentPhone.includes(q)
      );
    });
  }, [campusStudents, statusFilter, classFilter, searchQuery]);

  const parentFamilies = useMemo(() => {
    if (!db) return [];
    const activeStudents = db.students.filter((st) => st.status === 'active');
    const matchedStudentIds = new Set<string>();
    const families: Array<{
      parentId?: string;
      parentName: string;
      phone: string;
      email: string;
      cnic: string;
      address: string;
      occupation: string;
      children: Student[];
      monthlyTotal: number;
      unpaidBalance: number;
    }> = [];

    for (const p of db.parents) {
      if (activeCampusId !== 'all' && p.campusId !== activeCampusId) continue;
      const children = activeStudents.filter((st) => {
        const matches =
          st.parentId === p.id ||
          (p.cnic && st.parentCnic === p.cnic) ||
          (st.parentPhone === p.phone && st.fatherName.toLowerCase() === p.name.toLowerCase());
        if (matches) matchedStudentIds.add(st.id);
        return matches;
      });
      const childIdSet = new Set(children.map((c) => c.id));
      const monthlyTotal = children.reduce(
        (sum, c) => sum + Math.round(c.monthlyFee * (1 - (c.discountPercent || 0) / 100)),
        0
      );
      const unpaidBalance = db.vouchers
        .filter((v) => childIdSet.has(v.studentId) && v.status !== 'paid')
        .reduce((sum, v) => sum + Math.max(0, v.totalAmount - v.paidAmount), 0);

      families.push({
        parentId: p.id,
        parentName: p.name,
        phone: p.phone,
        email: p.email,
        cnic: p.cnic,
        address: p.address,
        occupation: p.occupation || '',
        children,
        monthlyTotal,
        unpaidBalance,
      });
    }

    // Legacy fallback for any active students not linked to a db.parents row
    const legacyMap = new Map<string, Student[]>();
    for (const st of campusStudents.filter((s) => s.status === 'active')) {
      if (matchedStudentIds.has(st.id)) continue;
      const key = st.parentCnic || st.parentPhone || st.fatherName;
      const arr = legacyMap.get(key) || [];
      arr.push(st);
      legacyMap.set(key, arr);
    }
    for (const children of legacyMap.values()) {
      const first = children[0];
      const childIdSet = new Set(children.map((c) => c.id));
      families.push({
        parentName: first.fatherName,
        phone: first.parentPhone,
        email: first.parentEmail,
        cnic: first.parentCnic,
        address: first.address,
        occupation: '',
        children,
        monthlyTotal: children.reduce(
          (sum, c) => sum + Math.round(c.monthlyFee * (1 - (c.discountPercent || 0) / 100)),
          0
        ),
        unpaidBalance: db.vouchers
          .filter((v) => childIdSet.has(v.studentId) && v.status !== 'paid')
          .reduce((sum, v) => sum + Math.max(0, v.totalAmount - v.paidAmount), 0),
      });
    }

    const q = searchQuery.trim().toLowerCase();
    return families.filter(
      (p) =>
        !q ||
        p.parentName.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.children.some((c) => c.name.toLowerCase().includes(q) || c.studentCode.toLowerCase().includes(q))
    );
  }, [db, campusStudents, activeCampusId, searchQuery]);

  if (!db) return null;

  const currency = db.settings.currency || 'Rs';
  const campusName =
    activeCampusId === 'all'
      ? 'All Campuses'
      : db.campuses.find((c) => c.id === activeCampusId)?.name ?? 'Main Campus';

  const handleOpenAdmit = (preselectedParentId = '') => {
    const defaultCls = campusClasses[0];
    const matchedParent = preselectedParentId
      ? db.parents.find((p) => p.id === preselectedParentId)
      : undefined;
    setEditingStudentId(null);
    setFormParentId(matchedParent?.id || '');
    setFormClassId(defaultCls?.id || '');
    setFormFee(defaultCls ? String(defaultCls.monthlyFee) : '6500');
    setFormName('');
    setFormFather(matchedParent?.name || '');
    setFormGender('male');
    setFormDob('2015-05-15');
    setFormPhone(matchedParent?.phone || '');
    setFormEmail(matchedParent?.email || '');
    setFormCnic(matchedParent?.cnic || '');
    setFormBForm('');
    setFormBloodGroup('');
    setFormEmergencyPhone('');
    setFormPreviousSchool('');
    setFormAddress(matchedParent?.address || '');
    setFormDiscount('0');
    setFormFaceAvatar('');
    setFormFaceDescriptor([]);
    setFormGenerateInitialVoucher(true);
    setFormAdmissionFeeAmount('3000');
    setAdmitModalOpen(true);
  };

  const handleOpenEditStudent = (stu: Student) => {
    setEditingStudentId(stu.id);
    setFormParentId(stu.parentId || '');
    setFormName(stu.name);
    setFormFather(stu.fatherName);
    setFormGender(stu.gender);
    setFormDob(stu.dob);
    setFormClassId(stu.classId);
    setFormPhone(stu.parentPhone);
    setFormEmail(stu.parentEmail);
    setFormCnic(stu.parentCnic);
    setFormBForm(stu.bFormNo || '');
    setFormBloodGroup(stu.bloodGroup || '');
    setFormEmergencyPhone(stu.emergencyPhone || '');
    setFormPreviousSchool(stu.previousSchool || '');
    setFormAddress(stu.address);
    setFormFee(String(stu.monthlyFee));
    setFormDiscount(String(stu.discountPercent));
    setFormFaceAvatar(stu.faceAvatar || '');
    setFormFaceDescriptor(stu.faceDescriptor || []);
    setFormGenerateInitialVoucher(false);
    setSelectedStudent(null);
    setAdmitModalOpen(true);
  };

  const handleStudentPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const img = new Image();
      img.onload = () => {
        const bio = extractBiometricFromImageElement(img, formName || 'Student', formPhone || 'BIO');
        setFormFaceAvatar(bio.avatarDataUrl || dataUrl);
        setFormFaceDescriptor(bio.descriptor);
        notify('Extracted student photo & 64-point facial descriptor.', 'success');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSelectExistingParent = (parentId: string) => {
    setFormParentId(parentId);
    const parent = db.parents.find((p) => p.id === parentId);
    if (parent) {
      setFormFather(parent.name);
      setFormPhone(parent.phone);
      setFormEmail(parent.email);
      setFormCnic(parent.cnic);
      setFormAddress(parent.address);
    }
  };

  const handleDeleteStudent = async (stu: Student) => {
    const res = await mutate(`/api/students/${stu.id}`, 'DELETE', undefined, `Deleted student ${stu.name}.`);
    if (res.ok && selectedStudent?.id === stu.id) {
      setSelectedStudent(null);
    }
  };

  const handleAdmitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      parentId: formParentId || undefined,
      name: formName,
      fatherName: formFather,
      gender: formGender,
      dob: formDob,
      classId: formClassId,
      parentPhone: formPhone,
      parentEmail: formEmail,
      parentCnic: formCnic,
      bFormNo: formBForm,
      bloodGroup: formBloodGroup,
      emergencyPhone: formEmergencyPhone,
      previousSchool: formPreviousSchool,
      address: formAddress,
      monthlyFee: Number(formFee) || undefined,
      discountPercent: Number(formDiscount) || 0,
      faceAvatar: formFaceAvatar || undefined,
      faceDescriptor: formFaceDescriptor.length > 0 ? formFaceDescriptor : undefined,
      ...(editingStudentId
        ? {}
        : {
            generateInitialVoucher: formGenerateInitialVoucher,
            admissionFeeAmount: Number(formAdmissionFeeAmount) || 0,
          }),
    };
    const res = editingStudentId
      ? await mutate<{ student?: Student }>(`/api/students/${editingStudentId}`, 'PATCH', payload, `Updated ${formName} details.`)
      : await mutate<{ student?: Student }>('/api/students', 'POST', payload, `Admitted ${formName} successfully.`);
    setSubmitting(false);
    if (res.ok) {
      if (!editingStudentId && res.data?.student) {
        setRecentAdmittedStudent(res.data.student);
      }
      setAdmitModalOpen(false);
      setEditingStudentId(null);
    }
  };

  const handleExportCsv = () => {
    const csv = buildCsvContent(
      ['Student Code', 'Roll No', 'Name', 'Father Name', 'Class', 'Section', 'Phone', 'Monthly Fee', 'Status'],
      filteredStudents.map((s) => [
        s.studentCode,
        s.rollNo,
        s.name,
        s.fatherName,
        s.className,
        s.sectionName,
        s.parentPhone,
        s.monthlyFee,
        s.status,
      ])
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iqra-school-students-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Exported student list as CSV.', 'success');
  };

  const handleExportPdf = () => {
    const classLabel =
      classFilter === 'all'
        ? 'All Classes'
        : campusClasses.find((c) => c.id === classFilter)?.className || 'Selected Class';
    exportTableToPdf({
      title: 'Student Directory Report',
      subtitle: `View: ${statusFilter.toUpperCase()} · Class: ${classLabel}${searchQuery.trim() ? ` · Filter: "${searchQuery.trim()}"` : ''}`,
      filename: `students-${statusFilter}-${today}.pdf`,
      headers: ['Code', 'Roll', 'Student Name', 'Father Name', 'Class & Section', 'Gender', 'Parent Phone', 'Monthly Fee', 'Status'],
      rows: filteredStudents.map((s) => [
        s.studentCode,
        s.rollNo,
        s.name,
        s.fatherName,
        `${s.className} (${s.sectionName})`,
        s.gender === 'male' ? 'Boy' : 'Girl',
        s.parentPhone,
        formatCurrency(s.monthlyFee, currency, !showAmounts),
        s.status.toUpperCase(),
      ]),
      settings: db.settings,
      campusName,
      generatedDate: today,
      summaryCards: [
        { label: 'Exported Students', value: String(filteredStudents.length), tone: 'teal' },
        {
          label: 'Boys / Girls',
          value: `${filteredStudents.filter((s) => s.gender === 'male').length} / ${filteredStudents.filter((s) => s.gender === 'female').length}`,
          tone: 'slate',
        },
        {
          label: 'Monthly Tuition Sum',
          value: formatCurrency(
            filteredStudents.reduce((sum, s) => sum + s.monthlyFee, 0),
            currency,
            !showAmounts
          ),
          tone: 'emerald',
        },
      ],
      orientation: 'landscape',
    });
    notify(`Downloaded PDF for ${filteredStudents.length} student(s).`, 'success');
  };

  const handleExportParentsPdf = () => {
    exportTableToPdf({
      title: 'Parent & Family Accounts',
      subtitle: `Campus: ${campusName}${searchQuery.trim() ? ` · Filter: "${searchQuery.trim()}"` : ''}`,
      filename: `parents-families-${today}.pdf`,
      headers: ['Guardian Name', 'Phone', 'CNIC', 'Linked Children', 'Monthly Tuition', 'Unpaid Balance'],
      rows: parentFamilies.map((fam) => [
        fam.parentName,
        fam.phone,
        fam.cnic || '—',
        fam.children.map((c) => `${c.name} (${c.className})`).join(', ') || 'None',
        formatCurrency(fam.monthlyTotal, currency, !showAmounts),
        formatCurrency(fam.unpaidBalance, currency, !showAmounts),
      ]),
      settings: db.settings,
      campusName,
      generatedDate: today,
      summaryCards: [
        { label: 'Total Families', value: String(parentFamilies.length), tone: 'teal' },
        { label: 'Multi-Child Families', value: String(parentFamilies.filter((f) => f.children.length > 1).length), tone: 'emerald' },
        {
          label: 'Total Receivable',
          value: formatCurrency(
            parentFamilies.reduce((sum, f) => sum + f.unpaidBalance, 0),
            currency,
            !showAmounts
          ),
          tone: 'rose',
        },
      ],
      orientation: 'landscape',
    });
    notify(`Downloaded PDF for ${parentFamilies.length} family account(s).`, 'success');
  };

  const handleStatusChange = async (studentId: string, nextStatus: StudentStatus) => {
    await mutate(`/api/students/${studentId}`, 'PATCH', { status: nextStatus }, `Updated student status to ${nextStatus}.`);
    setSelectedStudent(null);
  };

  const handlePromoteSelected = async () => {
    if (promoSelectedIds.length === 0 || !promoTargetClassId) {
      notify('Select at least one student and a target class.', 'error');
      return;
    }
    const res = await mutate(
      '/api/students/promote',
      'POST',
      { studentIds: promoSelectedIds, targetClassId: promoTargetClassId },
      `Promoted ${promoSelectedIds.length} student(s).`
    );
    if (res.ok) setPromoSelectedIds([]);
  };

  if (initialMode === 'parents') {
    const multiChildCount = parentFamilies.filter((f) => f.children.length > 1).length;

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Parent &amp; Multi-Child Family Accounts
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Campus: {campusName} · {parentFamilies.length} families · {multiChildCount} multi-child household(s)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search parent, email, phone, child..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <button
              type="button"
              onClick={handleExportParentsPdf}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              <span>Export PDF</span>
            </button>
            {canManageParents && (
              <button
                type="button"
                onClick={() => {
                  setNewParentName('');
                  setNewParentPhone('');
                  setNewParentEmail('');
                  setNewParentCnic('');
                  setNewParentAddress('');
                  setNewParentOccupation('');
                  setAddParentModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add Parent Account</span>
              </button>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 font-semibold">Guardian / Login Email</th>
                <th className="py-3 px-4 font-semibold">Phone &amp; CNIC</th>
                <th className="py-3 px-4 font-semibold">Linked Children (Siblings)</th>
                <th className="py-3 px-4 font-semibold text-right">Family Dues</th>
                {canManageParents && <th className="py-3 px-4 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {parentFamilies.map((fam) => (
                <tr key={fam.parentId || fam.phone + fam.parentName} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{fam.parentName}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          fam.children.length > 1
                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {fam.children.length} {fam.children.length === 1 ? 'Child' : 'Children'}
                      </span>
                    </div>
                    {fam.email && <div className="text-[11px] text-slate-400">{fam.email}</div>}
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums">
                    <div>{fam.phone}</div>
                    <div className="text-[11px] text-slate-400">{fam.cnic || '—'}</div>
                  </td>
                  <td className="py-3 px-4">
                    {fam.children.length === 0 ? (
                      <span className="text-slate-400 italic">No children linked yet</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {fam.children.map((c) => (
                          <span
                            key={c.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50/80 dark:bg-teal-950/50 border border-teal-200/70 dark:border-teal-800/60 text-[11px] font-medium text-teal-800 dark:text-teal-300"
                          >
                            <span>{c.name}</span>
                            <span className="opacity-70">({c.className})</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {formatCurrency(fam.monthlyTotal, currency, !showAmounts)}/mo
                    </div>
                    {fam.unpaidBalance > 0 && (
                      <div className="text-[11px] font-bold text-rose-600">
                        Due {formatCurrency(fam.unpaidBalance, currency, !showAmounts)}
                      </div>
                    )}
                  </td>
                  {canManageParents && (
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {fam.parentId && (
                        <button
                          type="button"
                          onClick={() => {
                            setLinkStudentId(db.students[0]?.id || '');
                            setLinkChildModal({ parentId: fam.parentId!, parentName: fam.parentName });
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer"
                        >
                          <Link2 className="w-3 h-3" />
                          <span>Link Child</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setEditingParent({
                            parentId: fam.parentId,
                            oldPhone: fam.phone,
                            oldName: fam.parentName,
                            fatherName: fam.parentName,
                            parentPhone: fam.phone,
                            parentEmail: fam.email,
                            parentCnic: fam.cnic,
                            address: fam.address,
                            occupation: fam.occupation,
                          })
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>
                      {fam.parentId && (
                        <button
                          type="button"
                          aria-label={`Delete ${fam.parentName}`}
                          onClick={() =>
                            void mutate(`/api/parents/${fam.parentId}`, 'DELETE', undefined, `Removed parent account ${fam.parentName}.`)
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Parent Account Modal */}
        {addParentModalOpen && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-bold">Add Parent / Guardian Account</h3>
                <button type="button" onClick={() => setAddParentModalOpen(false)} aria-label="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await mutate(
                    '/api/parents',
                    'POST',
                    {
                      campusId: activeCampusId === 'all' ? 'campus-main' : activeCampusId,
                      name: newParentName,
                      phone: newParentPhone,
                      email: newParentEmail,
                      cnic: newParentCnic,
                      address: newParentAddress,
                      occupation: newParentOccupation,
                    },
                    `Created parent account for ${newParentName}.`
                  );
                  if (res.ok) setAddParentModalOpen(false);
                }}
                className="mt-4 space-y-3 text-xs"
              >
                <div>
                  <label className="block font-semibold mb-1">Guardian Full Name *</label>
                  <input
                    required
                    value={newParentName}
                    onChange={(e) => setNewParentName(e.target.value)}
                    placeholder="e.g. Tariq Aziz"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Phone *</label>
                    <input
                      required
                      value={newParentPhone}
                      onChange={(e) => setNewParentPhone(e.target.value)}
                      placeholder="0300-1234567"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">CNIC</label>
                    <input
                      value={newParentCnic}
                      onChange={(e) => setNewParentCnic(e.target.value)}
                      placeholder="42201-..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Portal Email</label>
                  <input
                    type="email"
                    value={newParentEmail}
                    onChange={(e) => setNewParentEmail(e.target.value)}
                    placeholder="parent@mail.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Occupation</label>
                    <input
                      value={newParentOccupation}
                      onChange={(e) => setNewParentOccupation(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Address</label>
                    <input
                      value={newParentAddress}
                      onChange={(e) => setNewParentAddress(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setAddParentModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold cursor-pointer">
                    Create Parent
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Link Existing Student / Sibling to Parent Modal */}
        {linkChildModal && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-bold">Link Student to {linkChildModal.parentName}</h3>
                <button type="button" onClick={() => setLinkChildModal(null)} aria-label="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!linkStudentId) return;
                  const res = await mutate(
                    `/api/parents/${linkChildModal.parentId}/link-student`,
                    'POST',
                    { studentId: linkStudentId },
                    `Linked student to ${linkChildModal.parentName}'s family account.`
                  );
                  if (res.ok) setLinkChildModal(null);
                }}
                className="space-y-3 text-xs"
              >
                <div>
                  <label className="block font-semibold mb-1">Select Existing Enrolled Student</label>
                  <select
                    value={linkStudentId}
                    onChange={(e) => setLinkStudentId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {db.students.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.studentCode} · {st.className}) — Guardian: {st.fatherName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setLinkChildModal(null)} className="px-4 py-2 rounded-xl border border-slate-200">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 rounded-xl bg-teal-700 text-white font-semibold cursor-pointer">
                    Link to Parent
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingParent && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-bold">Edit Parent Account</h3>
                <button type="button" onClick={() => setEditingParent(null)} aria-label="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await mutate('/api/parents', 'PATCH', editingParent, 'Updated parent account.');
                  if (res.ok) setEditingParent(null);
                }}
                className="mt-4 space-y-3 text-xs"
              >
                <div>
                  <label className="block font-semibold mb-1">Guardian / Father Name *</label>
                  <input
                    required
                    value={editingParent.fatherName}
                    onChange={(e) => setEditingParent({ ...editingParent, fatherName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Phone *</label>
                  <input
                    required
                    value={editingParent.parentPhone}
                    onChange={(e) => setEditingParent({ ...editingParent, parentPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">CNIC</label>
                  <input
                    value={editingParent.parentCnic}
                    onChange={(e) => setEditingParent({ ...editingParent, parentCnic: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={editingParent.parentEmail}
                    onChange={(e) => setEditingParent({ ...editingParent, parentEmail: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setEditingParent(null)} className="px-4 py-2 rounded-xl border border-slate-200">
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

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Students</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Campus: {campusName}</p>
          </div>
        </div>

        {canManageStudents && (
          <button
            type="button"
            onClick={() => handleOpenAdmit()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Admit student</span>
          </button>
        )}
      </div>

      {/* Sub-navigation Tabs matching EasySchoolin */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(
          [
            { id: 'info', label: 'Student Information', icon: Users, allowed: true },
            { id: 'promotion', label: 'Student Promotion', icon: GraduationCap, allowed: canManageStudents },
            { id: 'transfer', label: 'Student Transfer', icon: ArrowRightLeft, allowed: canManageStudents },
            { id: 'birthdays', label: 'Student Birthdays', icon: Cake, allowed: true },
            { id: 'reports', label: 'Student Info Reports', icon: Download, allowed: true },
          ] as const
        )
          .filter((tab) => tab.allowed)
          .map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  subTab === tab.id
                    ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'bg-white/60 dark:bg-slate-900/60 border-slate-200/70 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                <span>{tab.label}</span>
              </button>
            );
          })}
      </div>

      {recentAdmittedStudent && (
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <div className="font-bold text-slate-900 dark:text-white">
                {recentAdmittedStudent.name} admitted ({recentAdmittedStudent.studentCode} · {recentAdmittedStudent.className})
              </div>
              <div className="text-slate-600 dark:text-slate-300">
                Download official admission form PDF, print ID card, or open full student dossier.
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                void exportAdmissionFormPdf({
                  settings: db.settings,
                  campusName,
                  formTitle: 'Official Student Admission Form',
                  refCode: recentAdmittedStudent.studentCode,
                  appliedDate: recentAdmittedStudent.admissionDate,
                  statusLabel: recentAdmittedStudent.status,
                  studentName: recentAdmittedStudent.name,
                  fatherName: recentAdmittedStudent.fatherName,
                  gender: recentAdmittedStudent.gender,
                  dob: recentAdmittedStudent.dob,
                  classLabel: `${recentAdmittedStudent.className} (${recentAdmittedStudent.sectionName})`,
                  rollOrCode: `${recentAdmittedStudent.studentCode} / Roll #${recentAdmittedStudent.rollNo}`,
                  phone: recentAdmittedStudent.parentPhone,
                  email: recentAdmittedStudent.parentEmail,
                  cnic: recentAdmittedStudent.parentCnic,
                  bFormNo: recentAdmittedStudent.bFormNo,
                  bloodGroup: recentAdmittedStudent.bloodGroup,
                  address: recentAdmittedStudent.address,
                  previousSchool: recentAdmittedStudent.previousSchool,
                  monthlyFee: formatCurrency(recentAdmittedStudent.monthlyFee, currency),
                  filename: `admission-form-${recentAdmittedStudent.studentCode}.pdf`,
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-700 text-white text-xs font-semibold cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Admission Form PDF</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedStudent(recentAdmittedStudent)}
              className="px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 text-xs font-semibold cursor-pointer"
            >
              Open Dossier
            </button>
            <button
              type="button"
              onClick={() => setRecentAdmittedStudent(null)}
              aria-label="Dismiss admission banner"
              className="p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {subTab === 'info' && (
        <>
          {/* Status Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: 'active', label: 'Active', count: counts.active },
                { id: 'deactivated', label: 'Deactivated', count: counts.deactivated },
                { id: 'withdrawn', label: 'Withdrawn / passed out', count: counts.withdrawn },
              ] as const
            ).map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  statusFilter === st.id
                    ? 'bg-teal-700 border-teal-700 text-white'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <span>{st.label}</span>
                <span className="font-mono tabular-nums opacity-85">({st.count})</span>
              </button>
            ))}
          </div>

          {/* Filter Toolbar + Table Card */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, roll ID, parent, phone..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800"
                  />
                </div>
                <select
                  aria-label="Filter by class"
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="all">All Classes</option>
                  {campusClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.className} ({c.sectionName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 no-print">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100/70 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Export PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-600" />
                  <span>Print</span>
                </button>
              </div>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No students match the current filter.
                </p>
                {canManageStudents && (
                  <button
                    type="button"
                    onClick={() => handleOpenAdmit()}
                    className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
                  >
                    + Admit a new student
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                      <th className="py-2.5 px-3 font-semibold">Code</th>
                      <th className="py-2.5 px-3 font-semibold">Student Name</th>
                      <th className="py-2.5 px-3 font-semibold">Father Name</th>
                      <th className="py-2.5 px-3 font-semibold">Class &amp; Section</th>
                      <th className="py-2.5 px-3 font-semibold">Parent Phone</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Monthly Fee</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredStudents.map((stu) => (
                      <tr key={stu.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-2.5 px-3 font-mono font-semibold text-teal-700 dark:text-teal-400">
                          {stu.studentCode}
                        </td>
                        <td className="py-2.5 px-3">
                          <button
                            type="button"
                            onClick={() => setSelectedStudent(stu)}
                            className="flex items-center gap-2 text-left font-semibold text-slate-900 dark:text-white hover:text-teal-700 dark:hover:text-teal-400 cursor-pointer"
                          >
                            {stu.faceAvatar ? (
                              <img src={stu.faceAvatar} alt="" className="w-6 h-6 rounded-full object-cover border border-teal-300 shrink-0" />
                            ) : (
                              <span className="w-6 h-6 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                                {stu.name.charAt(0)}
                              </span>
                            )}
                            <span>{stu.name}</span>
                            {stu.faceEnrolled && (
                              <span title="Face Biometric Enrolled">
                                <ScanFace className="w-3.5 h-3.5 text-emerald-600" />
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                          {stu.fatherName}
                        </td>
                        <td className="py-2.5 px-3">
                          {stu.className} · {stu.sectionName}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                          {stu.parentPhone}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold">
                          {formatCurrency(stu.monthlyFee, currency, !showAmounts)}
                        </td>
                        <td className="py-2.5 px-3 text-right space-x-2 whitespace-nowrap">
                          {canManageStudents && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditStudent(stu)}
                              aria-label={`Edit ${stu.name}`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              <Pencil className="w-3 h-3" />
                              Edit
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedStudent(stu)}
                            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                          >
                            {canManageStudents ? 'Manage' : 'View'}
                          </button>
                          {canManageStudents && (
                            <button
                              type="button"
                              onClick={() => void handleDeleteStudent(stu)}
                              aria-label={`Delete ${stu.name}`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {subTab === 'promotion' && canManageStudents && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Batch Student Promotion
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select students and promote them to the next class section.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                aria-label="Target promotion class"
                value={promoTargetClassId}
                onChange={(e) => setPromoTargetClassId(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="">Select target class...</option>
                {campusClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.className} · {c.sectionName}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handlePromoteSelected}
                className="px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold cursor-pointer"
              >
                Promote ({promoSelectedIds.length})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-2 px-3">Select</th>
                  <th className="py-2 px-3">Code</th>
                  <th className="py-2 px-3">Student</th>
                  <th className="py-2 px-3">Current Class</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {campusStudents
                  .filter((s) => s.status === 'active')
                  .map((s) => {
                    const checked = promoSelectedIds.includes(s.id);
                    return (
                      <tr key={s.id}>
                        <td className="py-2 px-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setPromoSelectedIds((prev) =>
                                e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)
                              )
                            }
                          />
                        </td>
                        <td className="py-2 px-3 font-mono">{s.studentCode}</td>
                        <td className="py-2 px-3 font-semibold">{s.name}</td>
                        <td className="py-2 px-3">
                          {s.className} · {s.sectionName}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'transfer' && canManageStudents && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Student Campus Transfer &amp; Leaving Certificates
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Transfer active students between sections or mark withdrawn for school leaving certificates.
          </p>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {campusStudents.slice(0, 8).map((s) => (
              <div key={s.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">{s.name}</span>
                  <span className="text-slate-500 ml-2">
                    {s.studentCode} · {s.className} ({s.sectionName})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    aria-label={`Transfer ${s.name} to class`}
                    value={s.classId}
                    onChange={(e) =>
                      void mutate(`/api/students/${s.id}`, 'PATCH', { classId: e.target.value }, `Transferred ${s.name}.`)
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {db.classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.className} ({c.sectionName})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStudent(s);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-blue-600" />
                    <span>Print / TC</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === 'birthdays' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Student Birthdays Directory
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {campusStudents
              .filter((s) => s.status === 'active')
              .map((s) => {
                const isToday = s.dob.slice(5, 10) === today.slice(5, 10);
                return (
                  <div
                    key={s.id}
                    className={`p-3.5 rounded-xl border ${
                      isToday
                        ? 'border-rose-300 bg-rose-50/70 dark:bg-rose-950/30 dark:border-rose-900'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">{s.name}</span>
                      {isToday && (
                        <span className="font-semibold text-rose-600 dark:text-rose-400">Today</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      {s.className} · DOB: <span className="font-mono">{s.dob}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {subTab === 'reports' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Student Strength &amp; Gender Distribution Report
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Class-by-class breakdown for {campusName}
              </p>
            </div>
            <div className="flex items-center gap-2 no-print">
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  exportTableToPdf({
                    title: 'Class-Wise Student Strength Report',
                    subtitle: `Campus: ${campusName} · Gender & Monthly Fee Billing Distribution`,
                    filename: `student-strength-report-${today}.pdf`,
                    headers: ['Class & Section', 'Boys', 'Girls', 'Total Active', 'Monthly Fee Billing'],
                    rows: campusClasses.map((cls) => {
                      const list = campusStudents.filter((s) => s.classId === cls.id && s.status === 'active');
                      return [
                        `${cls.className} · ${cls.sectionName}`,
                        list.filter((s) => s.gender === 'male').length,
                        list.filter((s) => s.gender === 'female').length,
                        list.length,
                        formatCurrency(
                          list.reduce((sum, s) => sum + s.monthlyFee, 0),
                          currency,
                          !showAmounts
                        ),
                      ];
                    }),
                    settings: db.settings,
                    campusName,
                    generatedDate: today,
                    summaryCards: [
                      { label: 'Active Students', value: String(counts.active), tone: 'teal' },
                      { label: 'Withdrawn / Passed', value: String(counts.withdrawn), tone: 'rose' },
                      {
                        label: 'Total Classes',
                        value: String(campusClasses.length),
                        tone: 'slate',
                      },
                    ],
                  });
                  notify('Downloaded class strength PDF report.', 'success');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-2.5 px-3">Class</th>
                  <th className="py-2.5 px-3 text-right">Boys</th>
                  <th className="py-2.5 px-3 text-right">Girls</th>
                  <th className="py-2.5 px-3 text-right">Total Active</th>
                  <th className="py-2.5 px-3 text-right">Monthly Fee Billing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {campusClasses.map((cls) => {
                  const list = campusStudents.filter((s) => s.classId === cls.id && s.status === 'active');
                  const boys = list.filter((s) => s.gender === 'male').length;
                  const girls = list.filter((s) => s.gender === 'female').length;
                  const totalBilling = list.reduce((sum, s) => sum + s.monthlyFee, 0);
                  return (
                    <tr key={cls.id}>
                      <td className="py-2.5 px-3 font-semibold">
                        {cls.className} · {cls.sectionName}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{boys}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{girls}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-bold">{list.length}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        {formatCurrency(totalBilling, currency, !showAmounts)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admit Student Modal */}
      {admitModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Admit New Student"
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingStudentId ? 'Edit Student Profile' : 'Admit New Student'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setAdmitModalOpen(false);
                  setEditingStudentId(null);
                }}
                aria-label="Close admit student dialog"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdmitSubmit} className="mt-4 space-y-3">
              {/* Multi-Child Single-Parent Link Selector */}
              <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/50">
                <label htmlFor="admit-existing-parent" className="block text-xs font-bold text-indigo-800 dark:text-indigo-300 mb-1">
                  Link to Existing Parent Account (Multi-Child / Sibling)
                </label>
                <select
                  id="admit-existing-parent"
                  value={formParentId}
                  onChange={(e) => handleSelectExistingParent(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800"
                >
                  <option value="">Create / Enter New Parent Details Below</option>
                  {db.parents.map((p) => {
                    const siblingCount = db.students.filter((st) => st.parentId === p.id).length;
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.phone} ({siblingCount} linked child{siblingCount === 1 ? '' : 'ren'})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="admit-name" className="block text-xs font-semibold mb-1">
                    Student Full Name *
                  </label>
                  <input
                    id="admit-name"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Bilal Hassan"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label htmlFor="admit-father" className="block text-xs font-semibold mb-1">
                    Father Name *
                  </label>
                  <input
                    id="admit-father"
                    required
                    value={formFather}
                    onChange={(e) => setFormFather(e.target.value)}
                    placeholder="e.g. Hassan Raza"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="admit-class" className="block text-xs font-semibold mb-1">
                    Class &amp; Section *
                  </label>
                  <select
                    id="admit-class"
                    required
                    value={formClassId}
                    onChange={(e) => {
                      const cid = e.target.value;
                      setFormClassId(cid);
                      const cls = db.classes.find((c) => c.id === cid);
                      if (cls) setFormFee(String(cls.monthlyFee));
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {db.classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.className} ({c.sectionName})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="admit-gender" className="block text-xs font-semibold mb-1">
                    Gender
                  </label>
                  <select
                    id="admit-gender"
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as Gender)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="admit-dob" className="block text-xs font-semibold mb-1">
                    Date of Birth
                  </label>
                  <input
                    id="admit-dob"
                    type="date"
                    value={formDob}
                    onChange={(e) => setFormDob(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="admit-phone" className="block text-xs font-semibold mb-1">
                    Parent Mobile *
                  </label>
                  <input
                    id="admit-phone"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="0300-1234567"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label htmlFor="admit-cnic" className="block text-xs font-semibold mb-1">
                    Parent CNIC
                  </label>
                  <input
                    id="admit-cnic"
                    value={formCnic}
                    onChange={(e) => setFormCnic(e.target.value)}
                    placeholder="42201-1234567-1"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="admit-fee" className="block text-xs font-semibold mb-1">
                    Monthly Tuition ({currency})
                  </label>
                  <input
                    id="admit-fee"
                    type="number"
                    min={0}
                    value={formFee}
                    onChange={(e) => setFormFee(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label htmlFor="admit-discount" className="block text-xs font-semibold mb-1">
                    Discount (%)
                  </label>
                  <input
                    id="admit-discount"
                    type="number"
                    min={0}
                    max={100}
                    value={formDiscount}
                    onChange={(e) => setFormDiscount(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label htmlFor="admit-email" className="block text-xs font-semibold mb-1">
                    Parent Email
                  </label>
                  <input
                    id="admit-email"
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="admit-bform" className="block text-xs font-semibold mb-1">
                    Student B-Form #
                  </label>
                  <input
                    id="admit-bform"
                    value={formBForm}
                    onChange={(e) => setFormBForm(e.target.value)}
                    placeholder="42201-9988776-3"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="admit-blood" className="block text-xs font-semibold mb-1">
                    Blood Group
                  </label>
                  <select
                    id="admit-blood"
                    value={formBloodGroup}
                    onChange={(e) => setFormBloodGroup(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="">Not specified</option>
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="admit-emergency" className="block text-xs font-semibold mb-1">
                    Emergency Contact
                  </label>
                  <input
                    id="admit-emergency"
                    value={formEmergencyPhone}
                    onChange={(e) => setFormEmergencyPhone(e.target.value)}
                    placeholder="0301-..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="admit-prev-school" className="block text-xs font-semibold mb-1">
                    Previous School (if transfer)
                  </label>
                  <input
                    id="admit-prev-school"
                    value={formPreviousSchool}
                    onChange={(e) => setFormPreviousSchool(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label htmlFor="admit-address" className="block text-xs font-semibold mb-1">
                    Residential Address
                  </label>
                  <input
                    id="admit-address"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="Block / Street, Karachi"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              {/* Photo & Biometric Enrollment Box */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {formFaceAvatar ? (
                    <img src={formFaceAvatar} alt="Student preview" className="w-11 h-11 rounded-xl object-cover border border-teal-400" />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold">
                      <Camera className="w-5 h-5" />
                    </div>
                  )}
                  <div className="text-xs">
                    <div className="font-bold text-slate-900 dark:text-white">Student Photo &amp; Face Biometric</div>
                    <div className="text-[11px] text-slate-500">
                      {formFaceDescriptor.length > 0
                        ? '64-point facial descriptor ready for Face Attendance'
                        : 'Upload passport photo for ID Card & Face Gate scanner'}
                    </div>
                  </div>
                </div>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-600 text-teal-700 dark:text-teal-300 text-xs font-semibold hover:bg-teal-50 dark:hover:bg-teal-950/40 cursor-pointer">
                  <Camera className="w-3.5 h-3.5" />
                  <span>{formFaceAvatar ? 'Change Photo' : 'Upload Photo'}</span>
                  <input type="file" accept="image/*" onChange={handleStudentPhotoUpload} className="hidden" />
                </label>
              </div>

              {!editingStudentId && (
                <div className="p-3 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/70 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <label className="flex items-center gap-2 font-semibold text-teal-900 dark:text-teal-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formGenerateInitialVoucher}
                      onChange={(e) => setFormGenerateInitialVoucher(e.target.checked)}
                      className="rounded accent-teal-700"
                    />
                    <span>Generate Admission + First Month Fee Voucher immediately</span>
                  </label>
                  {formGenerateInitialVoucher && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-600 dark:text-slate-300">Admission Fee:</span>
                      <input
                        type="number"
                        min={0}
                        value={formAdmissionFeeAmount}
                        onChange={(e) => setFormAdmissionFeeAmount(e.target.value)}
                        className="w-24 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAdmitModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
                >
                  {submitting ? 'Saving...' : editingStudentId ? 'Save Changes' : 'Confirm Admission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rich Student Profile Dossier Modal */}
      {selectedStudent && (() => {
        const stuAtt = db.attendance.filter((a) => a.targetType === 'student' && a.targetId === selectedStudent.id);
        const stuPresent = stuAtt.filter((a) => a.status === 'present' || a.status === 'late').length;
        const stuAttPct = stuAtt.length > 0 ? Math.round((stuPresent / stuAtt.length) * 100) : 100;
        const stuVouchers = db.vouchers.filter((v) => v.studentId === selectedStudent.id);
        const stuPaid = stuVouchers.reduce((sum, v) => sum + v.paidAmount, 0);
        const stuDue = stuVouchers.reduce((sum, v) => sum + Math.max(0, v.totalAmount - v.paidAmount), 0);
        const stuMarks = db.marks.filter((m) => m.studentId === selectedStudent.id);
        const totalMarksObt = stuMarks.reduce((s, m) => s + m.obtainedMarks, 0);
        const totalMarksMax = stuMarks.reduce((s, m) => s + m.totalMarks, 0);
        const marksPct = totalMarksMax > 0 ? Math.round((totalMarksObt / totalMarksMax) * 100) : 0;
        const siblings = db.students.filter(
          (other) =>
            other.id !== selectedStudent.id &&
            other.status === 'active' &&
            ((selectedStudent.parentId && other.parentId === selectedStudent.parentId) ||
              (selectedStudent.parentCnic && other.parentCnic === selectedStudent.parentCnic))
        );

        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Student Profile Dossier ${selectedStudent.name}`}
            className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 max-h-[92vh] overflow-y-auto">
              {/* Top Dossier Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3.5">
                  {selectedStudent.faceAvatar ? (
                    <img
                      src={selectedStudent.faceAvatar}
                      alt={selectedStudent.name}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-teal-500 shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-teal-700 text-white font-bold text-2xl flex items-center justify-center shrink-0">
                      {selectedStudent.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {selectedStudent.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-mono text-[11px] font-bold">
                        {selectedStudent.studentCode}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          selectedStudent.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {selectedStudent.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {selectedStudent.className} ({selectedStudent.sectionName}) · Roll #{selectedStudent.rollNo} · Admitted {selectedStudent.admissionDate}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px]">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold ${
                          selectedStudent.faceEnrolled
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        <ScanFace className="w-3 h-3" />
                        {selectedStudent.faceEnrolled ? 'Face Biometric Enrolled' : 'Face Not Enrolled'}
                      </span>
                      {selectedStudent.bloodGroup && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-semibold">
                          Blood: {selectedStudent.bloodGroup}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  aria-label="Close student details"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 no-print"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 3 KPI Summary Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700">
                  <div className="text-slate-500">Attendance Rate</div>
                  <div className="text-base font-bold text-emerald-600 tabular-nums mt-0.5">
                    {stuAttPct}% ({stuPresent}/{stuAtt.length || 1} logs)
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700">
                  <div className="text-slate-500">Fee Ledger</div>
                  <div className="text-base font-bold font-mono tabular-nums mt-0.5">
                    <span className="text-teal-700 dark:text-teal-400">{formatCurrency(stuPaid, currency, !showAmounts)}</span>
                    {stuDue > 0 && (
                      <span className="text-xs text-rose-600 ml-1.5">
                        ({formatCurrency(stuDue, currency, !showAmounts)} due)
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700">
                  <div className="text-slate-500">Exam Standing</div>
                  <div className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {totalMarksMax > 0 ? `${marksPct}% (${calculateGrade(marksPct).grade})` : 'Pending Results'}
                  </div>
                </div>
              </div>

              {/* Bio & Guardian Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/70 dark:border-slate-800">
                <div><span className="text-slate-500">Father / Guardian:</span> <strong className="ml-1">{selectedStudent.fatherName}</strong></div>
                <div><span className="text-slate-500">Parent Phone:</span> <strong className="font-mono ml-1">{selectedStudent.parentPhone}</strong></div>
                <div><span className="text-slate-500">Guardian CNIC:</span> <strong className="font-mono ml-1">{selectedStudent.parentCnic || '—'}</strong></div>
                <div><span className="text-slate-500">Student B-Form:</span> <strong className="font-mono ml-1">{selectedStudent.bFormNo || '—'}</strong></div>
                <div><span className="text-slate-500">DOB / Gender:</span> <strong className="ml-1">{selectedStudent.dob} ({selectedStudent.gender})</strong></div>
                <div><span className="text-slate-500">Emergency Phone:</span> <strong className="font-mono ml-1">{selectedStudent.emergencyPhone || selectedStudent.parentPhone}</strong></div>
                <div><span className="text-slate-500">Monthly Fee:</span> <strong className="font-mono ml-1">{formatCurrency(selectedStudent.monthlyFee, currency, !showAmounts)} {selectedStudent.discountPercent > 0 ? `(-${selectedStudent.discountPercent}%)` : ''}</strong></div>
                <div><span className="text-slate-500">Previous School:</span> <strong className="ml-1">{selectedStudent.previousSchool || 'N/A'}</strong></div>
                <div className="sm:col-span-2"><span className="text-slate-500">Address:</span> <strong className="ml-1">{selectedStudent.address || 'Karachi'}</strong></div>
              </div>

              {/* Siblings / Family Link */}
              {siblings.length > 0 && (
                <div className="text-xs space-y-1.5">
                  <div className="font-bold text-slate-700 dark:text-slate-300">Linked Family Siblings ({siblings.length})</div>
                  <div className="flex flex-wrap gap-2">
                    {siblings.map((sib) => (
                      <button
                        key={sib.id}
                        type="button"
                        onClick={() => setSelectedStudent(sib)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold hover:bg-indigo-100 cursor-pointer"
                      >
                        {sib.name} ({sib.studentCode} · {sib.className})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions Bar */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2 no-print">
                <button
                  type="button"
                  onClick={() =>
                    void exportAdmissionFormPdf({
                      settings: db.settings,
                      campusName,
                      formTitle: 'Official Student Admission Form',
                      refCode: selectedStudent.studentCode,
                      appliedDate: selectedStudent.admissionDate,
                      statusLabel: selectedStudent.status,
                      studentName: selectedStudent.name,
                      fatherName: selectedStudent.fatherName,
                      gender: selectedStudent.gender,
                      dob: selectedStudent.dob,
                      classLabel: `${selectedStudent.className} (${selectedStudent.sectionName})`,
                      rollOrCode: `${selectedStudent.studentCode} / Roll #${selectedStudent.rollNo}`,
                      phone: selectedStudent.parentPhone,
                      email: selectedStudent.parentEmail,
                      cnic: selectedStudent.parentCnic,
                      bFormNo: selectedStudent.bFormNo,
                      bloodGroup: selectedStudent.bloodGroup,
                      address: selectedStudent.address,
                      previousSchool: selectedStudent.previousSchool,
                      monthlyFee: formatCurrency(selectedStudent.monthlyFee, currency),
                      filename: `admission-form-${selectedStudent.studentCode}.pdf`,
                    })
                  }
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Download Admission Form PDF
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
                >
                  <Printer className="w-3 h-3 text-blue-600" />
                  Print Dossier
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudent(null);
                    navigateTo('id-cards');
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
                >
                  <IdCard className="w-3.5 h-3.5 text-rose-600" />
                  ID Card
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudent(null);
                    navigateTo('face-attendance');
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
                >
                  <ScanFace className="w-3.5 h-3.5 text-emerald-600" />
                  Face Enroll
                </button>
                {canManageStudents && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenEditStudent(selectedStudent)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit Profile
                    </button>
                    {selectedStudent.status !== 'active' && (
                      <button
                        type="button"
                        onClick={() => void handleStatusChange(selectedStudent.id, 'active')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
                      >
                        Restore Active
                      </button>
                    )}
                    {selectedStudent.status === 'active' && (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleStatusChange(selectedStudent.id, 'deactivated')}
                          className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold cursor-pointer"
                        >
                          Deactivate
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleStatusChange(selectedStudent.id, 'withdrawn')}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold cursor-pointer"
                        >
                          Withdraw / TC
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleDeleteStudent(selectedStudent)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 text-xs font-semibold cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
