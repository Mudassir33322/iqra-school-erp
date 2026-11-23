import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCsvContent,
  calculateGrade,
  calculateVoucherTotal,
  computeDashboardSummary,
  formatCurrency,
  generateNextStudentCode,
  isDateInPeriod,
} from './erpLogic';
import { createSeedDatabase } from '../data/seedData';
import {
  canAccessPage,
  canPerformPermission,
  computeFamilySummary,
  getParentChildren,
  scopeDatabaseForUser,
} from './rbac';

test('formatCurrency respects hide toggle and formats numbers cleanly', () => {
  assert.equal(formatCurrency(125000, 'Rs', false), 'Rs 125,000');
  assert.equal(formatCurrency(125000, 'Rs', true), 'Rs •••••');
});

test('calculateVoucherTotal computes discount, extra charges, and late fine accurately', () => {
  const result = calculateVoucherTotal({
    tuitionAmount: 8000,
    otherCharges: 1500,
    discountPercent: 10,
    lateFine: 500,
  });
  assert.equal(result.discountAmount, 800);
  assert.equal(result.totalAmount, 9200);

  const clamped = calculateVoucherTotal({
    tuitionAmount: 5000,
    otherCharges: 0,
    discountPercent: 150,
    lateFine: -100,
  });
  assert.equal(clamped.discountAmount, 5000);
  assert.equal(clamped.totalAmount, 0);
});

test('calculateGrade returns proper letter grade and academic risk flag', () => {
  assert.deepEqual(calculateGrade(92), { grade: 'A+', remark: 'Outstanding', atRisk: false });
  assert.deepEqual(calculateGrade(74), { grade: 'B', remark: 'Very Good', atRisk: false });
  assert.deepEqual(calculateGrade(35), { grade: 'F', remark: 'At Academic Risk', atRisk: true });
});

test('generateNextStudentCode increments past highest ST code', () => {
  const db = createSeedDatabase('2026-11-21');
  const next = generateNextStudentCode(db.students);
  assert.match(next, /^ST-\d+$/);
  const maxExisting = Math.max(
    ...db.students.map((s) => parseInt(s.studentCode.replace('ST-', ''), 10))
  );
  assert.equal(next, `ST-${maxExisting + 1}`);
});

test('isDateInPeriod accurately filters today, week, month, and session', () => {
  assert.equal(isDateInPeriod('2026-11-21', 'today', '2026-11-21'), true);
  assert.equal(isDateInPeriod('2026-11-20', 'today', '2026-11-21'), false);
  assert.equal(isDateInPeriod('2026-11-16', 'week', '2026-11-21'), true);
  assert.equal(isDateInPeriod('2026-11-10', 'week', '2026-11-21'), false);
  assert.equal(isDateInPeriod('2026-11-01', 'month', '2026-11-21'), true);
  assert.equal(isDateInPeriod('2026-10-31', 'month', '2026-11-21'), false);
  assert.equal(isDateInPeriod('2026-01-15', 'session', '2026-11-21'), true);
});

test('computeDashboardSummary aggregates seed campus metrics and 12-month chart', () => {
  const today = '2026-11-21';
  const db = createSeedDatabase(today);
  const summary = computeDashboardSummary(db, 'campus-main', today, 'month');

  assert.ok(summary.activeStudents > 0);
  assert.equal(summary.boysCount + summary.girlsCount, summary.activeStudents);
  assert.equal(summary.monthlyChart.length, 12);
  assert.equal(summary.monthlyChart[11].monthKey, '2026-11');
  assert.ok(summary.thisMonthBilled > 0);
  assert.ok(summary.feeRecoveryPercent >= 0 && summary.feeRecoveryPercent <= 100);
});

test('buildCsvContent escapes commas and quotes properly', () => {
  const csv = buildCsvContent(['Name', 'Class'], [['Ali, Zain', 'Grade "9"']]);
  assert.equal(csv, 'Name,Class\n"Ali, Zain","Grade ""9"""');
});

test('multi-student single-parent resolves all siblings and computes combined family summary', () => {
  const today = '2026-11-21';
  const db = createSeedDatabase(today);
  const children = getParentChildren(db, { parentId: 'par-1' });
  assert.equal(children.length, 3);
  assert.deepEqual(
    children.map((c) => c.studentCode).sort(),
    ['ST-1001', 'ST-1021', 'ST-1022']
  );

  const family = computeFamilySummary(db, children, today);
  assert.equal(family.childrenCount, 3);
  assert.equal(family.presentTodayCount, 3);
  assert.equal(family.unpaidVouchersCount, 1);
  assert.equal(family.totalUnpaidFees, 7020);
  assert.equal(family.totalPaidFees, 14280);
});

test('role permissions enforce boundaries for Admin, Teacher, Parent, and Student', () => {
  assert.equal(canAccessPage('Admin', 'settings'), true);
  assert.equal(canAccessPage('Teacher', 'attendance'), true);
  assert.equal(canAccessPage('Teacher', 'settings'), false);
  assert.equal(canAccessPage('Parent', 'fees'), false);
  assert.equal(canAccessPage('Parent', 'leaves'), true);
  assert.equal(canAccessPage('Student', 'homework'), true);
  assert.equal(canAccessPage('Student', 'payroll' as never), false);

  assert.equal(canPerformPermission('Admin', 'manage_payroll'), true);
  assert.equal(canPerformPermission('Teacher', 'mark_attendance'), true);
  assert.equal(canPerformPermission('Teacher', 'manage_payroll'), false);
  assert.equal(canPerformPermission('Parent', 'submit_complaint'), true);
  assert.equal(canPerformPermission('Parent', 'manage_fees'), false);
  assert.equal(canPerformPermission('Student', 'submit_leave'), true);
  assert.equal(canPerformPermission('Student', 'enter_marks'), false);
});

test('scopeDatabaseForUser strips other families and sensitive ledger for Parent and Student', () => {
  const db = createSeedDatabase('2026-11-21');
  const parentScoped = scopeDatabaseForUser(db, {
    role: 'Parent',
    name: 'Tariq Aziz',
    email: 'tariq.aziz@mail.com',
    parentId: 'par-1',
  });
  assert.equal(parentScoped.students.length, 3);
  assert.equal(parentScoped.ledger.length, 0);
  assert.ok(parentScoped.vouchers.every((v) => ['stu-1', 'stu-21', 'stu-22'].includes(v.studentId)));

  const studentScoped = scopeDatabaseForUser(db, {
    role: 'Student',
    name: 'Hamza Tariq',
    email: 'ST-1001',
    studentId: 'stu-1',
  });
  assert.equal(studentScoped.students.length, 1);
  assert.equal(studentScoped.students[0].studentCode, 'ST-1001');
  assert.equal(studentScoped.ledger.length, 0);
});

test('custom date range filters dashboard income & expense accurately', () => {
  const today = '2026-11-21';
  const db = createSeedDatabase(today);
  const fullMonth = computeDashboardSummary(db, 'campus-main', today, 'month');
  const singleDayCustom = computeDashboardSummary(db, 'campus-main', today, 'custom', {
    from: today,
    to: today,
  });

  assert.equal(singleDayCustom.incomePeriod, singleDayCustom.incomeToday);
  assert.equal(singleDayCustom.expensePeriod, singleDayCustom.expenseToday);
  assert.ok(fullMonth.incomePeriod >= singleDayCustom.incomePeriod);
  assert.equal(
    isDateInPeriod('2026-11-15', 'custom', today, { from: '2026-11-10', to: '2026-11-20' }),
    true
  );
  assert.equal(
    isDateInPeriod('2026-11-25', 'custom', today, { from: '2026-11-10', to: '2026-11-20' }),
    false
  );
});

test('granular module permissions match Teacher, Librarian, Driver, Accountant, Parent, Student roles', () => {
  assert.equal(canPerformPermission('Teacher', 'manage_homework'), true);
  assert.equal(canPerformPermission('Teacher', 'manage_ptm'), true);
  assert.equal(canPerformPermission('Teacher', 'update_syllabus'), true);
  assert.equal(canPerformPermission('Teacher', 'manage_library'), false);
  assert.equal(canPerformPermission('Librarian', 'manage_library'), true);
  assert.equal(canPerformPermission('Librarian', 'manage_fees'), false);
  assert.equal(canPerformPermission('Driver', 'manage_transport'), true);
  assert.equal(canPerformPermission('Accountant', 'manage_operations'), true);
  assert.equal(canPerformPermission('Parent', 'manage_ptm'), false);
  assert.equal(canPerformPermission('Student', 'manage_homework'), false);
});

import {
  extractScanCode,
  interpolateMessageTemplate,
  resolveAttendanceScanStatus,
} from './erpLogic';

test('extractScanCode parses plain codes, QR/RFID prefixes, and JSON badges', () => {
  assert.equal(extractScanCode('  ST-1001  '), 'ST-1001');
  assert.equal(extractScanCode('QR:ST-1002'), 'ST-1002');
  assert.equal(extractScanCode('RFID:EMP-101'), 'EMP-101');
  assert.equal(extractScanCode('{"code":"ST-1005","campus":"main"}'), 'ST-1005');
  assert.equal(extractScanCode('{invalid-json'), '{invalid-json');
});

test('resolveAttendanceScanStatus applies school lateCutoffTime when set to auto', () => {
  assert.equal(resolveAttendanceScanStatus('auto', '08:05', '08:15'), 'present');
  assert.equal(resolveAttendanceScanStatus('auto', '08:15', '08:15'), 'present');
  assert.equal(resolveAttendanceScanStatus('auto', '08:16', '08:15'), 'late');
  assert.equal(resolveAttendanceScanStatus('present', '09:30', '08:15'), 'present');
});

test('interpolateMessageTemplate substitutes known placeholders cleanly', () => {
  const msg = interpolateMessageTemplate(
    'Dear Parent, {studentName} ({className}) paid {amount} on {date}.',
    { studentName: 'Hamza Tariq', className: 'Grade 9', amount: 'Rs 8,500', date: '2026-11-21' }
  );
  assert.equal(msg, 'Dear Parent, Hamza Tariq (Grade 9) paid Rs 8,500 on 2026-11-21.');
});

import { computeDescriptorFromPixels, cosineSimilarity, matchFaceDescriptor } from './faceRecognition';
import { applyOptimisticOfflineMutation, enqueueOfflineMutation, removeOfflineMutation } from './offlineSync';

test('faceRecognition computes distinct normalized pixel descriptors and matches highest similarity', () => {
  const w = 16;
  const h = 16;
  const makePattern = (topBright: boolean) => {
    const arr = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const val = (y < h / 2 ? topBright : !topBright) ? 220 : 40;
        const i = (y * w + x) * 4;
        arr[i] = val;
        arr[i + 1] = val;
        arr[i + 2] = val;
        arr[i + 3] = 255;
      }
    }
    return computeDescriptorFromPixels(arr, w, h);
  };

  const dA = makePattern(true);
  const dB = makePattern(false);
  assert.equal(dA.length, 64);
  assert.ok(cosineSimilarity(dA, dA) > 0.99);
  assert.ok(cosineSimilarity(dA, dB) < 0);

  const match = matchFaceDescriptor(dA, [
    { id: 'stu-2', code: 'ST-1002', name: 'Zoya', faceDescriptor: dB },
    { id: 'stu-1', code: 'ST-1001', name: 'Hamza', faceDescriptor: dA },
  ]);
  assert.equal(match.matched, true);
  assert.equal(match.candidate?.code, 'ST-1001');
});

test('offlineSync enqueues, removes, and optimistically applies attendance & fee mutations', () => {
  let queue = enqueueOfflineMutation([], {
    url: '/api/attendance/scan',
    method: 'POST',
    body: { codeOrId: 'ST-1001', targetType: 'student', method: 'face' },
    summary: 'Gate Face Scan',
  });
  assert.equal(queue.length, 1);
  assert.equal(queue[0].status, 'pending');

  const today = '2026-11-23';
  const db = createSeedDatabase(today);
  const scanRes = applyOptimisticOfflineMutation(
    db,
    'POST',
    '/api/attendance/scan',
    { codeOrId: 'ST-1005', targetType: 'student', method: 'card', scanAction: 'in' },
    today
  );
  assert.ok((scanRes.responseData as { matchedCode?: string })?.matchedCode === 'ST-1005');

  const unpaidVoucher = db.vouchers.find((v) => v.status !== 'paid')!;
  const payRes = applyOptimisticOfflineMutation(
    db,
    'POST',
    `/api/fees/${unpaidVoucher.id}/pay`,
    { amount: unpaidVoucher.totalAmount - unpaidVoucher.paidAmount, paymentMethod: 'Cash' },
    today
  );
  const updatedVoucher = payRes.db.vouchers.find((v) => v.id === unpaidVoucher.id)!;
  assert.equal(updatedVoucher.status, 'paid');

  queue = removeOfflineMutation(queue, queue[0].id);
  assert.equal(queue.length, 0);
});



