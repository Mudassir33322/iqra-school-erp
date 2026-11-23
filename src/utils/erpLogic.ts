import type {
  AttendanceRecord,
  ClassSection,
  DashboardPeriod,
  ErpDatabase,
  ExamMark,
  FeeVoucher,
  LedgerEntry,
  StaffMember,
  Student,
} from '../types/erp';

export function formatCurrency(amount: number, currency = 'Rs', hide = false): string {
  if (hide) return `${currency} •••••`;
  const rounded = Math.round(amount);
  return `${currency} ${rounded.toLocaleString('en-US')}`;
}

export function calculateVoucherTotal(params: {
  tuitionAmount: number;
  otherCharges: number;
  discountPercent: number;
  lateFine: number;
}): { discountAmount: number; totalAmount: number } {
  const safeTuition = Math.max(0, params.tuitionAmount);
  const safeOther = Math.max(0, params.otherCharges);
  const safeFine = Math.max(0, params.lateFine);
  const clampedDiscount = Math.min(100, Math.max(0, params.discountPercent));
  const discountAmount = Math.round((safeTuition * clampedDiscount) / 100);
  const totalAmount = Math.max(0, safeTuition - discountAmount + safeOther + safeFine);
  return { discountAmount, totalAmount };
}

export function calculateGrade(percentage: number): {
  grade: string;
  remark: string;
  atRisk: boolean;
} {
  if (percentage >= 90) return { grade: 'A+', remark: 'Outstanding', atRisk: false };
  if (percentage >= 80) return { grade: 'A', remark: 'Excellent', atRisk: false };
  if (percentage >= 70) return { grade: 'B', remark: 'Very Good', atRisk: false };
  if (percentage >= 60) return { grade: 'C', remark: 'Good', atRisk: false };
  if (percentage >= 50) return { grade: 'D', remark: 'Satisfactory', atRisk: false };
  if (percentage >= 40) return { grade: 'E', remark: 'Needs Improvement', atRisk: false };
  return { grade: 'F', remark: 'At Academic Risk', atRisk: true };
}

export function generateNextStudentCode(students: Student[]): string {
  const maxNum = students.reduce((max, s) => {
    const match = s.studentCode.match(/(\d+)$/);
    const num = match ? parseInt(match[1], 10) : 1000;
    return Math.max(max, num);
  }, 1000);
  return `ST-${maxNum + 1}`;
}

export function generateNextVoucherNo(vouchers: FeeVoucher[]): string {
  const maxNum = vouchers.reduce((max, v) => {
    const match = v.voucherNo.match(/(\d+)$/);
    const num = match ? parseInt(match[1], 10) : 2000;
    return Math.max(max, num);
  }, 2000);
  return `VCH-${maxNum + 1}`;
}

export function isDateInPeriod(
  dateStr: string,
  period: DashboardPeriod,
  referenceDate: string,
  customRange?: { from?: string; to?: string }
): boolean {
  if (!dateStr) return false;
  if (period === 'session') return true;
  if (period === 'today') return dateStr === referenceDate;
  if (period === 'month') return dateStr.slice(0, 7) === referenceDate.slice(0, 7);
  if (period === 'custom') {
    const from = customRange?.from?.trim();
    const to = customRange?.to?.trim();
    if (from && dateStr < from) return false;
    if (to && dateStr > to) return false;
    return true;
  }

  // week: within 7 days inclusive ending on referenceDate
  const refTime = new Date(`${referenceDate}T00:00:00Z`).getTime();
  const targetTime = new Date(`${dateStr}T00:00:00Z`).getTime();
  if (Number.isNaN(refTime) || Number.isNaN(targetTime)) return false;
  const diffDays = (refTime - targetTime) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 6;
}

export interface CampusDashboardSummary {
  activeStudents: number;
  boysCount: number;
  girlsCount: number;
  withdrawnCount: number;
  deactivatedCount: number;
  registeredParents: number;
  activeStaff: number;
  maleStaff: number;
  femaleStaff: number;
  studentsPresentToday: number;
  studentsAbsentToday: number;
  studentsLeaveToday: number;
  studentsMarkedToday: number;
  studentAttendancePercent: number;
  staffPresentToday: number;
  staffAbsentToday: number;
  staffLateToday: number;
  classesNotMarkedCount: number;
  staffNotMarkedCount: number;
  incomeToday: number;
  expenseToday: number;
  balanceToday: number;
  incomePeriod: number;
  expensePeriod: number;
  profitPeriod: number;
  balanceThisMonth: number;
  collectedToday: number;
  unpaidFeesTotal: number;
  unpaidVoucherCount: number;
  unpaidStudentCount: number;
  thisMonthBilled: number;
  thisMonthCollected: number;
  feeRecoveryPercent: number;
  studentsAtRiskCount: number;
  avgSyllabusCoverage: number;
  birthdaysTodayCount: number;
  newAdmissionsThisMonth: number;
  monthlyChart: Array<{
    monthKey: string;
    label: string;
    income: number;
    expense: number;
    paidVouchers: number;
    unpaidVouchers: number;
  }>;
  classSummaries: Array<{
    classId: string;
    className: string;
    sectionName: string;
    studentCount: number;
    presentToday: number;
    attendanceMarked: boolean;
    attendancePercent: number;
    monthlyBilled: number;
    monthlyCollected: number;
  }>;
}

export function computeDashboardSummary(
  db: ErpDatabase,
  campusId: string,
  todayStr: string,
  period: DashboardPeriod = 'month',
  customRange?: { from?: string; to?: string }
): CampusDashboardSummary {
  const campusFilter = <T extends { campusId: string }>(items: T[]) =>
    campusId === 'all' ? items : items.filter((item) => item.campusId === campusId);

  const students = campusFilter(db.students);
  const staff = campusFilter(db.staff);
  const classes = campusFilter(db.classes);
  const subjects = campusFilter(db.subjects);
  const attendance = campusFilter(db.attendance);
  const vouchers = campusFilter(db.vouchers);
  const ledger = campusFilter(db.ledger);

  const activeStudentsList = students.filter((s) => s.status === 'active');
  const activeStudents = activeStudentsList.length;
  const boysCount = activeStudentsList.filter((s) => s.gender === 'male').length;
  const girlsCount = activeStudentsList.filter((s) => s.gender === 'female').length;
  const withdrawnCount = students.filter((s) => s.status === 'withdrawn').length;
  const deactivatedCount = students.filter((s) => s.status === 'deactivated').length;
  const registeredParents = new Set(activeStudentsList.map((s) => s.parentCnic || s.parentPhone)).size;

  const activeStaffList = staff.filter((s) => s.status === 'active');
  const activeStaff = activeStaffList.length;
  const maleStaff = activeStaffList.filter((s) => s.gender === 'male').length;
  const femaleStaff = activeStaffList.filter((s) => s.gender === 'female').length;

  const todayStudentAtt = attendance.filter((a) => a.date === todayStr && a.targetType === 'student');
  const studentsPresentToday = todayStudentAtt.filter((a) => a.status === 'present' || a.status === 'late').length;
  const studentsAbsentToday = todayStudentAtt.filter((a) => a.status === 'absent').length;
  const studentsLeaveToday = todayStudentAtt.filter((a) => a.status === 'leave').length;
  const studentsMarkedToday = todayStudentAtt.length;
  const studentAttendancePercent =
    activeStudents > 0 ? Math.round((studentsPresentToday / activeStudents) * 100) : 0;

  const todayStaffAtt = attendance.filter((a) => a.date === todayStr && a.targetType === 'staff');
  const staffPresentToday = todayStaffAtt.filter((a) => a.status === 'present' || a.status === 'late').length;
  const staffAbsentToday = todayStaffAtt.filter((a) => a.status === 'absent').length;
  const staffLateToday = todayStaffAtt.filter((a) => a.status === 'late').length;

  const markedClassIds = new Set(todayStudentAtt.map((a) => a.classId).filter(Boolean));
  const classesWithStudents = classes.filter((c) => activeStudentsList.some((s) => s.classId === c.id));
  const classesNotMarkedCount = classesWithStudents.filter((c) => !markedClassIds.has(c.id)).length;
  const markedStaffIds = new Set(todayStaffAtt.map((a) => a.targetId));
  const staffNotMarkedCount = activeStaffList.filter((s) => !markedStaffIds.has(s.id)).length;

  const incomeToday = ledger
    .filter((l) => l.date === todayStr && l.type === 'income')
    .reduce((sum, l) => sum + l.amount, 0);
  const expenseToday = ledger
    .filter((l) => l.date === todayStr && l.type === 'expense')
    .reduce((sum, l) => sum + l.amount, 0);
  const balanceToday = incomeToday - expenseToday;

  const incomePeriod = ledger
    .filter((l) => l.type === 'income' && isDateInPeriod(l.date, period, todayStr, customRange))
    .reduce((sum, l) => sum + l.amount, 0);
  const expensePeriod = ledger
    .filter((l) => l.type === 'expense' && isDateInPeriod(l.date, period, todayStr, customRange))
    .reduce((sum, l) => sum + l.amount, 0);
  const profitPeriod = incomePeriod - expensePeriod;

  const monthKey = todayStr.slice(0, 7);
  const incomeThisMonth = ledger
    .filter((l) => l.type === 'income' && l.date.slice(0, 7) === monthKey)
    .reduce((sum, l) => sum + l.amount, 0);
  const expenseThisMonth = ledger
    .filter((l) => l.type === 'expense' && l.date.slice(0, 7) === monthKey)
    .reduce((sum, l) => sum + l.amount, 0);
  const balanceThisMonth = incomeThisMonth - expenseThisMonth;

  const collectedToday = vouchers
    .filter((v) => v.paidDate === todayStr)
    .reduce((sum, v) => sum + v.paidAmount, 0);

  const unpaidVouchers = vouchers.filter((v) => v.status !== 'paid');
  const unpaidFeesTotal = unpaidVouchers.reduce((sum, v) => sum + Math.max(0, v.totalAmount - v.paidAmount), 0);
  const unpaidVoucherCount = unpaidVouchers.length;
  const unpaidStudentCount = new Set(unpaidVouchers.map((v) => v.studentId)).size;

  const thisMonthVouchers = vouchers.filter((v) => v.monthKey === monthKey);
  const thisMonthBilled = thisMonthVouchers.reduce((sum, v) => sum + v.totalAmount, 0);
  const thisMonthCollected = thisMonthVouchers.reduce((sum, v) => sum + v.paidAmount, 0);
  const feeRecoveryPercent =
    thisMonthBilled > 0 ? Math.round((thisMonthCollected / thisMonthBilled) * 100) : 0;

  // Students at academic risk (<40% average in marks or <75% attendance)
  const marksByStudent = new Map<string, { obtained: number; total: number }>();
  for (const m of db.marks) {
    const prev = marksByStudent.get(m.studentId) ?? { obtained: 0, total: 0 };
    marksByStudent.set(m.studentId, {
      obtained: prev.obtained + m.obtainedMarks,
      total: prev.total + m.totalMarks,
    });
  }
  const studentsAtRiskCount = activeStudentsList.filter((s) => {
    const score = marksByStudent.get(s.id);
    if (!score || score.total === 0) return false;
    return (score.obtained / score.total) * 100 < 40;
  }).length;

  const avgSyllabusCoverage =
    subjects.length > 0
      ? Math.round(subjects.reduce((sum, sub) => sum + sub.syllabusProgress, 0) / subjects.length)
      : 0;

  const todayMonthDay = todayStr.slice(5, 10);
  const birthdaysTodayCount = activeStudentsList.filter((s) => s.dob.slice(5, 10) === todayMonthDay).length;
  const newAdmissionsThisMonth = activeStudentsList.filter(
    (s) => s.admissionDate.slice(0, 7) === monthKey
  ).length;

  // Build 12-month rolling chart ending at todayStr's month
  const [refYearStr, refMonthStr] = todayStr.split('-');
  const refYear = parseInt(refYearStr, 10);
  const refMonth = parseInt(refMonthStr, 10);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyChart: CampusDashboardSummary['monthlyChart'] = [];
  for (let offset = 11; offset >= 0; offset -= 1) {
    const d = new Date(Date.UTC(refYear, refMonth - 1 - offset, 1));
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const key = `${y}-${String(m).padStart(2, '0')}`;
    const label = `${monthNames[m - 1]} ${String(y).slice(-2)}`;
    const mIncome = ledger
      .filter((l) => l.type === 'income' && l.date.slice(0, 7) === key)
      .reduce((sum, l) => sum + l.amount, 0);
    const mExpense = ledger
      .filter((l) => l.type === 'expense' && l.date.slice(0, 7) === key)
      .reduce((sum, l) => sum + l.amount, 0);
    const mVouchers = vouchers.filter((v) => v.monthKey === key);
    const paidVouchers = mVouchers.filter((v) => v.status === 'paid').length;
    const unpaidVouchersCount = mVouchers.filter((v) => v.status !== 'paid').length;
    monthlyChart.push({
      monthKey: key,
      label,
      income: mIncome,
      expense: mExpense,
      paidVouchers,
      unpaidVouchers: unpaidVouchersCount,
    });
  }

  const classSummaries = classes.map((cls: ClassSection) => {
    const clsStudents = activeStudentsList.filter((s) => s.classId === cls.id);
    const clsStudentIds = new Set(clsStudents.map((s) => s.id));
    const clsAtt = todayStudentAtt.filter((a) => a.classId === cls.id || clsStudentIds.has(a.targetId));
    const presentToday = clsAtt.filter((a) => a.status === 'present' || a.status === 'late').length;
    const attendanceMarked = clsAtt.length > 0;
    const attendancePercent =
      clsStudents.length > 0 ? Math.round((presentToday / clsStudents.length) * 100) : 0;
    const clsVouchers = thisMonthVouchers.filter((v) => clsStudentIds.has(v.studentId));
    const monthlyBilled = clsVouchers.reduce((sum, v) => sum + v.totalAmount, 0);
    const monthlyCollected = clsVouchers.reduce((sum, v) => sum + v.paidAmount, 0);

    return {
      classId: cls.id,
      className: cls.className,
      sectionName: cls.sectionName,
      studentCount: clsStudents.length,
      presentToday,
      attendanceMarked,
      attendancePercent,
      monthlyBilled,
      monthlyCollected,
    };
  });

  return {
    activeStudents,
    boysCount,
    girlsCount,
    withdrawnCount,
    deactivatedCount,
    registeredParents,
    activeStaff,
    maleStaff,
    femaleStaff,
    studentsPresentToday,
    studentsAbsentToday,
    studentsLeaveToday,
    studentsMarkedToday,
    studentAttendancePercent,
    staffPresentToday,
    staffAbsentToday,
    staffLateToday,
    classesNotMarkedCount,
    staffNotMarkedCount,
    incomeToday,
    expenseToday,
    balanceToday,
    incomePeriod,
    expensePeriod,
    profitPeriod,
    balanceThisMonth,
    collectedToday,
    unpaidFeesTotal,
    unpaidVoucherCount,
    unpaidStudentCount,
    thisMonthBilled,
    thisMonthCollected,
    feeRecoveryPercent,
    studentsAtRiskCount,
    avgSyllabusCoverage,
    birthdaysTodayCount,
    newAdmissionsThisMonth,
    monthlyChart,
    classSummaries,
  };
}

export function computeStudentExamSummary(
  student: Student,
  marks: ExamMark[],
  examId: string
): { obtained: number; total: number; percentage: number; grade: string; atRisk: boolean } {
  const relevant = marks.filter((m) => m.studentId === student.id && m.examId === examId);
  const obtained = relevant.reduce((sum, m) => sum + m.obtainedMarks, 0);
  const total = relevant.reduce((sum, m) => sum + m.totalMarks, 0);
  const percentage = total > 0 ? Math.round((obtained / total) * 1000) / 10 : 0;
  const { grade, atRisk } = calculateGrade(percentage);
  return { obtained, total, percentage, grade, atRisk };
}

export function buildCsvContent(headers: string[], rows: Array<Array<string | number>>): string {
  const escapeCell = (cell: string | number) => {
    const str = String(cell ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  return [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');
}

export function filterLedgerByPeriod(
  entries: LedgerEntry[],
  period: DashboardPeriod,
  referenceDate: string,
  customRange?: { from?: string; to?: string }
): LedgerEntry[] {
  return entries.filter((entry) => isDateInPeriod(entry.date, period, referenceDate, customRange));
}

export function summarizeStaffPayroll(staff: StaffMember[], currentMonthKey: string) {
  const active = staff.filter((s) => s.status === 'active');
  const totalMonthlyPayroll = active.reduce((sum, s) => sum + s.salary, 0);
  const paidCount = active.filter((s) => s.lastPaidMonth === currentMonthKey).length;
  const pendingCount = active.length - paidCount;
  return { totalMonthlyPayroll, paidCount, pendingCount };
}

export function extractScanCode(rawInput: string): string {
  const trimmed = String(rawInput || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as { code?: string; studentCode?: string; employeeCode?: string };
      return String(parsed.code || parsed.studentCode || parsed.employeeCode || trimmed).trim();
    } catch {
      return trimmed;
    }
  }
  if (/^(QR|RFID|ID):/i.test(trimmed)) {
    return trimmed.replace(/^(QR|RFID|ID):/i, '').trim();
  }
  return trimmed;
}

export function resolveAttendanceScanStatus(
  requested: 'present' | 'late' | 'auto',
  currentTimeHHMM: string,
  cutoffTimeHHMM: string = '08:15'
): 'present' | 'late' {
  if (requested === 'present' || requested === 'late') return requested;
  return currentTimeHHMM > cutoffTimeHHMM ? 'late' : 'present';
}

export function interpolateMessageTemplate(
  template: string,
  vars: Record<string, string | number | undefined>
): string {
  return String(template || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key: string) => {
    const val = vars[key];
    return val !== undefined && val !== null ? String(val) : `{${key}}`;
  });
}
