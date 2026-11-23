import type { AppPageId, ErpDatabase, Student, UserRole } from '../types/erp';

export type ErpPermission =
  | 'manage_students'
  | 'manage_parents'
  | 'manage_admissions'
  | 'manage_classes'
  | 'manage_subjects'
  | 'update_syllabus'
  | 'mark_attendance'
  | 'manage_fees'
  | 'manage_ledger'
  | 'manage_staff'
  | 'manage_payroll'
  | 'enter_marks'
  | 'manage_exams'
  | 'manage_notices'
  | 'manage_settings'
  | 'submit_leave'
  | 'approve_leave'
  | 'submit_complaint'
  | 'manage_complaints'
  | 'manage_homework'
  | 'manage_ptm'
  | 'manage_library'
  | 'manage_transport'
  | 'manage_calendar'
  | 'manage_timetable'
  | 'manage_operations';

const ADMIN_PAGES: AppPageId[] = [
  'dashboard',
  'today-activity',
  'visitors',
  'admissions',
  'students',
  'parents',
  'staff',
  'accountants',
  'complaints',
  'leaves',
  'tasks',
  'health',
  'id-cards',
  'classes',
  'subjects',
  'ptm',
  'attendance',
  'face-attendance',
  'card-attendance',
  'staff-attendance',
  'timetable',
  'calendar',
  'homework',
  'fees',
  'accounting',
  'expenses',
  'reports',
  'inventory',
  'exams',
  'certification',
  'noticeboard',
  'messaging',
  'library',
  'transport',
  'hostel',
  'website',
  'system-tools',
  'settings',
];

const TEACHER_PAGES: AppPageId[] = [
  'dashboard',
  'today-activity',
  'students',
  'classes',
  'subjects',
  'attendance',
  'face-attendance',
  'card-attendance',
  'timetable',
  'calendar',
  'homework',
  'ptm',
  'exams',
  'leaves',
  'tasks',
  'health',
  'noticeboard',
  'library',
];

const ACCOUNTANT_PAGES: AppPageId[] = [
  'dashboard',
  'today-activity',
  'students',
  'parents',
  'fees',
  'accounting',
  'expenses',
  'reports',
  'inventory',
  'staff',
  'accountants',
  'leaves',
  'tasks',
  'noticeboard',
];

const PARENT_PAGES: AppPageId[] = [
  'dashboard',
  'homework',
  'timetable',
  'calendar',
  'exams',
  'leaves',
  'complaints',
  'ptm',
  'noticeboard',
];

const STUDENT_PAGES: AppPageId[] = [
  'dashboard',
  'homework',
  'timetable',
  'calendar',
  'exams',
  'certification',
  'leaves',
  'noticeboard',
  'library',
];

const FRONT_DESK_PAGES: AppPageId[] = [
  'dashboard',
  'today-activity',
  'visitors',
  'admissions',
  'students',
  'parents',
  'attendance',
  'face-attendance',
  'card-attendance',
  'id-cards',
  'certification',
  'complaints',
  'leaves',
  'noticeboard',
  'messaging',
];

const LIBRARIAN_PAGES: AppPageId[] = ['dashboard', 'library', 'students', 'calendar', 'noticeboard', 'leaves'];
const DRIVER_PAGES: AppPageId[] = ['dashboard', 'transport', 'calendar', 'noticeboard', 'leaves'];

export function getAllowedPagesForRole(role: UserRole): AppPageId[] {
  switch (role) {
    case 'Admin':
    case 'Coordinator':
      return ADMIN_PAGES;
    case 'Teacher':
      return TEACHER_PAGES;
    case 'Accountant':
      return ACCOUNTANT_PAGES;
    case 'Front Desk':
      return FRONT_DESK_PAGES;
    case 'Librarian':
      return LIBRARIAN_PAGES;
    case 'Driver':
      return DRIVER_PAGES;
    case 'Parent':
      return PARENT_PAGES;
    case 'Student':
      return STUDENT_PAGES;
    default:
      return ['dashboard'];
  }
}

export function canAccessPage(role: UserRole, page: AppPageId): boolean {
  return getAllowedPagesForRole(role).includes(page);
}

export const ROLE_PERMISSIONS: Record<UserRole, Set<ErpPermission>> = {
  Admin: new Set<ErpPermission>([
    'manage_students',
    'manage_parents',
    'manage_admissions',
    'manage_classes',
    'manage_subjects',
    'update_syllabus',
    'mark_attendance',
    'manage_fees',
    'manage_ledger',
    'manage_staff',
    'manage_payroll',
    'enter_marks',
    'manage_exams',
    'manage_notices',
    'manage_settings',
    'submit_leave',
    'approve_leave',
    'submit_complaint',
    'manage_complaints',
    'manage_homework',
    'manage_ptm',
    'manage_library',
    'manage_transport',
    'manage_calendar',
    'manage_timetable',
    'manage_operations',
  ]),
  Coordinator: new Set<ErpPermission>([
    'manage_students',
    'manage_parents',
    'manage_admissions',
    'manage_classes',
    'manage_subjects',
    'update_syllabus',
    'mark_attendance',
    'enter_marks',
    'manage_exams',
    'manage_notices',
    'submit_leave',
    'approve_leave',
    'manage_complaints',
    'manage_homework',
    'manage_ptm',
    'manage_library',
    'manage_transport',
    'manage_calendar',
    'manage_timetable',
    'manage_operations',
  ]),
  Teacher: new Set<ErpPermission>([
    'mark_attendance',
    'enter_marks',
    'update_syllabus',
    'submit_leave',
    'manage_homework',
    'manage_ptm',
    'manage_operations',
  ]),
  Accountant: new Set<ErpPermission>([
    'manage_fees',
    'manage_ledger',
    'manage_payroll',
    'submit_leave',
    'manage_operations',
  ]),
  'Front Desk': new Set<ErpPermission>([
    'manage_students',
    'manage_parents',
    'manage_admissions',
    'mark_attendance',
    'manage_notices',
    'submit_leave',
    'manage_complaints',
    'manage_ptm',
    'manage_calendar',
    'manage_operations',
  ]),
  Librarian: new Set<ErpPermission>(['submit_leave', 'manage_library']),
  Driver: new Set<ErpPermission>(['submit_leave', 'manage_transport']),
  Parent: new Set<ErpPermission>(['submit_leave', 'submit_complaint']),
  Student: new Set<ErpPermission>(['submit_leave']),
};

export function canPerformPermission(role: UserRole, permission: ErpPermission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

export function getParentChildren(
  db: ErpDatabase,
  opts: { parentId?: string; email?: string; phone?: string; cnic?: string }
): Student[] {
  const emailLower = opts.email?.trim().toLowerCase() || '';
  const phoneClean = opts.phone?.trim() || '';
  const cnicClean = opts.cnic?.trim() || '';

  return db.students.filter((s) => {
    if (opts.parentId && s.parentId === opts.parentId) return true;
    if (emailLower && s.parentEmail.toLowerCase() === emailLower) return true;
    if (phoneClean && s.parentPhone === phoneClean) return true;
    if (cnicClean && s.parentCnic === cnicClean) return true;
    return false;
  });
}

export interface FamilySummary {
  childrenCount: number;
  totalMonthlyFee: number;
  totalUnpaidFees: number;
  totalPaidFees: number;
  unpaidVouchersCount: number;
  presentTodayCount: number;
  absentTodayCount: number;
}

export function computeFamilySummary(
  db: ErpDatabase,
  children: Student[],
  todayStr: string
): FamilySummary {
  const childIds = new Set(children.map((c) => c.id));
  const vouchers = db.vouchers.filter((v) => childIds.has(v.studentId));
  const unpaid = vouchers.filter((v) => v.status !== 'paid');
  const todayAtt = db.attendance.filter(
    (a) => a.date === todayStr && a.targetType === 'student' && childIds.has(a.targetId)
  );

  return {
    childrenCount: children.length,
    totalMonthlyFee: children.reduce(
      (sum, c) => sum + Math.round(c.monthlyFee * (1 - (c.discountPercent || 0) / 100)),
      0
    ),
    totalUnpaidFees: unpaid.reduce((sum, v) => sum + Math.max(0, v.totalAmount - v.paidAmount), 0),
    totalPaidFees: vouchers.reduce((sum, v) => sum + v.paidAmount, 0),
    unpaidVouchersCount: unpaid.length,
    presentTodayCount: todayAtt.filter((a) => a.status === 'present' || a.status === 'late').length,
    absentTodayCount: todayAtt.filter((a) => a.status === 'absent').length,
  };
}

export interface ScopedSessionUser {
  role: UserRole;
  name: string;
  email: string;
  parentId?: string;
  studentId?: string;
  staffId?: string;
  linkedStudentIds?: string[];
}

export function scopeDatabaseForUser(db: ErpDatabase, user: ScopedSessionUser): ErpDatabase {
  if (user.role === 'Parent') {
    const parentRecord = db.parents.find(
      (p) =>
        (user.parentId && p.id === user.parentId) ||
        (user.email && p.email.toLowerCase() === user.email.toLowerCase())
    );
    const myChildren = getParentChildren(db, {
      parentId: parentRecord?.id || user.parentId,
      email: parentRecord?.email || user.email,
      phone: parentRecord?.phone,
      cnic: parentRecord?.cnic,
    });
    const childIds = new Set(myChildren.map((c) => c.id));
    const childClassIds = new Set(myChildren.map((c) => c.classId));
    const childClassNames = new Set(myChildren.map((c) => c.className));
    const childNames = new Set(myChildren.map((c) => c.name));

    return {
      ...db,
      parents: parentRecord ? [parentRecord] : [],
      students: myChildren,
      classes: db.classes.filter((c) => childClassIds.has(c.id)),
      subjects: db.subjects.filter((sub) => childClassNames.has(sub.className)),
      staff: db.staff.map((s) => ({
        ...s,
        salary: 0,
        cnic: '',
      })),
      attendance: db.attendance.filter((a) => a.targetType === 'student' && childIds.has(a.targetId)),
      vouchers: db.vouchers.filter((v) => childIds.has(v.studentId)),
      ledger: [],
      marks: db.marks.filter((m) => childIds.has(m.studentId)),
      inquiries: [],
      tasks: [],
      leaves: db.leaves.filter(
        (l) => l.applicantType === 'Student' && childNames.has(l.applicantName)
      ),
      complaints: db.complaints.filter(
        (c) =>
          c.parentName.toLowerCase() === (parentRecord?.name || user.name).toLowerCase() ||
          childNames.has(c.studentName)
      ),
      visitors: [],
      timetable: db.timetable.filter((t) =>
        myChildren.some((c) => t.className.startsWith(c.className))
      ),
      homework: db.homework.filter((h) =>
        myChildren.some((c) => h.className.startsWith(c.className))
      ),
      healthRecords: db.healthRecords.filter((hr) =>
        myChildren.some((c) => c.studentCode === hr.studentCode)
      ),
      inventory: [],
      libraryBooks: [],
      transportRoutes: [],
      hostelRooms: [],
      messageLogs: [],
    };
  }

  if (user.role === 'Student') {
    const me = db.students.find(
      (s) =>
        (user.studentId && s.id === user.studentId) ||
        (user.email && s.studentCode.toLowerCase() === user.email.toLowerCase())
    );
    const myStudents = me ? [me] : [];
    const myIds = new Set(myStudents.map((s) => s.id));

    return {
      ...db,
      parents: me?.parentId ? db.parents.filter((p) => p.id === me.parentId) : [],
      students: myStudents,
      classes: me ? db.classes.filter((c) => c.id === me.classId) : [],
      subjects: me ? db.subjects.filter((sub) => sub.className === me.className) : [],
      staff: db.staff.map((s) => ({
        ...s,
        salary: 0,
        cnic: '',
      })),
      attendance: db.attendance.filter((a) => a.targetType === 'student' && myIds.has(a.targetId)),
      vouchers: db.vouchers.filter((v) => myIds.has(v.studentId)),
      ledger: [],
      marks: db.marks.filter((m) => myIds.has(m.studentId)),
      inquiries: [],
      tasks: [],
      leaves: me ? db.leaves.filter((l) => l.applicantName === me.name) : [],
      complaints: [],
      visitors: [],
      timetable: me ? db.timetable.filter((t) => t.className.startsWith(me.className)) : [],
      homework: me ? db.homework.filter((h) => h.className.startsWith(me.className)) : [],
      healthRecords: me ? db.healthRecords.filter((hr) => hr.studentCode === me.studentCode) : [],
      inventory: [],
      libraryBooks: db.libraryBooks,
      transportRoutes: [],
      hostelRooms: [],
      messageLogs: [],
    };
  }

  if (user.role === 'Teacher') {
    return {
      ...db,
      ledger: [],
      vouchers: [],
      staff: db.staff.map((s) => ({
        ...s,
        salary: s.email.toLowerCase() === user.email.toLowerCase() ? s.salary : 0,
        cnic: '',
      })),
    };
  }

  return db;
}
