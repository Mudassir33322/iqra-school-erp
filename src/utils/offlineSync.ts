import type { AttendanceRecord, ErpDatabase, FeeVoucher, AdmissionInquiry, VisitorLog } from '../types/erp';

export interface OfflineMutationItem {
  id: string;
  url: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  summary: string;
  createdAt: string;
  status: 'pending' | 'failed';
  error?: string;
}

const OFFLINE_DB_KEY = 'iqra_erp_offline_db_v1';
const OFFLINE_QUEUE_KEY = 'iqra_erp_sync_queue_v1';

export function saveOfflineDbSnapshot(db: ErpDatabase): void {
  try {
    localStorage.setItem(OFFLINE_DB_KEY, JSON.stringify(db));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function loadOfflineDbSnapshot(): ErpDatabase | null {
  try {
    const raw = localStorage.getItem(OFFLINE_DB_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ErpDatabase;
  } catch {
    return null;
  }
}

export function loadOfflineQueue(): OfflineMutationItem[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OfflineMutationItem[]) : [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue: OfflineMutationItem[]): void {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function enqueueOfflineMutation(
  queue: OfflineMutationItem[],
  item: Omit<OfflineMutationItem, 'id' | 'createdAt' | 'status'>
): OfflineMutationItem[] {
  const next: OfflineMutationItem = {
    ...item,
    id: `sync-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };
  return [...queue, next];
}

export function removeOfflineMutation(queue: OfflineMutationItem[], id: string): OfflineMutationItem[] {
  return queue.filter((q) => q.id !== id);
}

export function describeMutationForQueue(method: 'POST' | 'PATCH' | 'DELETE', url: string): string {
  if (url.includes('/api/attendance/scan')) return 'Gate Face / Card Attendance Scan';
  if (url.includes('/api/attendance/enroll-face')) return 'Face Biometric Enrollment';
  if (url.includes('/api/attendance/batch')) return 'Class Attendance Register Save';
  if (url.includes('/api/fees/') && url.endsWith('/pay')) return 'Fee Voucher Collection';
  if (url.includes('/api/admissions') && url.endsWith('/decision')) return 'Admission Approval & Enrollment';
  if (url.includes('/api/admissions')) return 'Admission Inquiry Update';
  if (url.includes('/api/students')) return 'Student Profile Update';
  if (url.includes('/api/operations/visitors')) return 'Visitor Gate Log';
  if (url.includes('/api/operations/leaves')) return 'Leave Request Update';
  if (url.includes('/api/operations/complaints')) return 'Parent Complaint Update';
  if (url.includes('/api/settings')) return 'School Settings Update';
  return `${method} ${url.replace('/api/', '')}`;
}

/**
 * Applies optimistic local state changes for key offline operations so users can continue
 * scanning attendance, collecting fees, logging visitors, and filing inquiries while offline.
 */
export function applyOptimisticOfflineMutation(
  db: ErpDatabase,
  method: 'POST' | 'PATCH' | 'DELETE',
  url: string,
  body: unknown,
  today: string
): { db: ErpDatabase; responseData?: unknown } {
  const cloned: ErpDatabase = JSON.parse(JSON.stringify(db)) as ErpDatabase;
  const payload = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;

  if (method === 'POST' && url === '/api/attendance/scan') {
    const codeOrId = String(payload.codeOrId || '').trim().toLowerCase();
    const targetType = payload.targetType === 'staff' ? 'staff' : 'student';
    const methodKind = payload.method === 'face' ? 'face' : 'card';
    const scanAction = payload.scanAction === 'in' || payload.scanAction === 'out' ? payload.scanAction : 'auto';
    const scanDate = String(payload.date || today);
    const nowTime = new Date().toTimeString().slice(0, 5);
    const lateCutoff = cloned.settings.lateCutoffTime || '08:15';
    const requestedStatus = String(payload.status || 'auto');
    const resolvedStatus: AttendanceRecord['status'] =
      requestedStatus === 'auto'
        ? nowTime > lateCutoff
          ? 'late'
          : 'present'
        : (requestedStatus as AttendanceRecord['status']);

    if (targetType === 'student') {
      const stu = cloned.students.find(
        (s) =>
          s.id.toLowerCase() === codeOrId ||
          s.studentCode.toLowerCase() === codeOrId ||
          s.name.toLowerCase() === codeOrId
      );
      if (stu) {
        const idx = cloned.attendance.findIndex(
          (a) => a.date === scanDate && a.targetType === 'student' && a.targetId === stu.id
        );
        const existing = idx >= 0 ? cloned.attendance[idx] : null;
        const isCheckout = scanAction === 'out' || (scanAction === 'auto' && Boolean(existing?.timeIn) && !existing?.timeOut);
        let rec: AttendanceRecord;
        if (isCheckout && existing) {
          rec = { ...existing, method: methodKind, timeOut: nowTime };
          cloned.attendance[idx] = rec;
        } else {
          cloned.attendance = cloned.attendance.filter(
            (a) => !(a.date === scanDate && a.targetType === 'student' && a.targetId === stu.id)
          );
          rec = {
            id: `att-off-${Date.now()}`,
            campusId: stu.campusId,
            date: scanDate,
            targetType: 'student',
            targetId: stu.id,
            classId: stu.classId,
            status: resolvedStatus,
            method: methodKind,
            timeIn: nowTime,
            ...(isCheckout ? { timeOut: nowTime } : {}),
          };
          cloned.attendance.push(rec);
        }
        return {
          db: cloned,
          responseData: {
            record: rec,
            action: isCheckout ? 'out' : 'in',
            scanType: isCheckout ? 'out' : 'in',
            matchedName: stu.name,
            matchedCode: stu.studentCode,
            roleOrClass: `${stu.className} (${stu.sectionName})`,
          },
        };
      }
    }
  }

  if (method === 'POST' && url.startsWith('/api/fees/') && url.endsWith('/pay')) {
    const voucherId = url.split('/')[3];
    const amt = Math.max(0, Number(payload.amount) || 0);
    const payMethod = (payload.paymentMethod as FeeVoucher['paymentMethod']) || 'Cash';
    const vIdx = cloned.vouchers.findIndex((v) => v.id === voucherId);
    if (vIdx !== -1) {
      const v = cloned.vouchers[vIdx];
      const nextPaid = Math.min(v.totalAmount, v.paidAmount + amt);
      cloned.vouchers[vIdx] = {
        ...v,
        paidAmount: nextPaid,
        status: nextPaid >= v.totalAmount ? 'paid' : 'partial',
        paidDate: today,
        paymentMethod: payMethod,
      };
      return { db: cloned, responseData: { voucher: cloned.vouchers[vIdx] } };
    }
  }

  if (method === 'POST' && url === '/api/admissions') {
    const inq: AdmissionInquiry = {
      id: `inq-off-${Date.now()}`,
      campusId: String(payload.campusId || cloned.campuses[0]?.id || 'campus-main'),
      applicantName: String(payload.applicantName || 'New Applicant'),
      fatherName: String(payload.fatherName || 'Guardian'),
      appliedClass: String(payload.appliedClass || 'Grade 1'),
      gender: payload.gender === 'female' ? 'female' : 'male',
      dob: String(payload.dob || '2016-01-01'),
      phone: String(payload.phone || ''),
      email: String(payload.email || ''),
      parentCnic: String(payload.parentCnic || ''),
      address: String(payload.address || ''),
      previousSchool: String(payload.previousSchool || 'N/A'),
      appliedDate: today,
      status: 'new',
    };
    cloned.inquiries.unshift(inq);
    return { db: cloned, responseData: { inquiry: inq } };
  }

  if (method === 'POST' && url === '/api/operations/visitors') {
    const v: VisitorLog = {
      id: `vis-off-${Date.now()}`,
      campusId: String(payload.campusId || cloned.campuses[0]?.id || 'campus-main'),
      visitorName: String(payload.visitorName || 'Visitor'),
      phone: String(payload.phone || ''),
      cnic: String(payload.cnic || ''),
      purpose: String(payload.purpose || 'Visit'),
      meetingWith: String(payload.meetingWith || 'Admin Office'),
      date: today,
      inTime: new Date().toTimeString().slice(0, 5),
    };
    cloned.visitors.unshift(v);
    return { db: cloned, responseData: { visitor: v } };
  }

  return { db: cloned };
}
