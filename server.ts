import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createSeedDatabase } from './src/data/seedData';
import {
  calculateVoucherTotal,
  generateNextStudentCode,
  generateNextVoucherNo,
} from './src/utils/erpLogic';
import {
  canPerformPermission,
  getParentChildren,
  scopeDatabaseForUser,
  type ErpPermission,
  type ScopedSessionUser,
} from './src/utils/rbac';
import type {
  AdmissionInquiry,
  AttendanceRecord,
  AttendanceStatus,
  AuditLogEntry,
  ClassSection,
  ComplaintItem,
  ErpDatabase,
  Exam,
  ExamMark,
  FeeVoucher,
  LeaveRequest,
  LedgerEntry,
  LoginLogEntry,
  NoticeItem,
  ParentAccount,
  PaymentMethod,
  StaffMember,
  Student,
  StudentStatus,
  Subject,
  TaskItem,
  TaskStatus,
  UiPreferences,
  UserRole,
  VisitorLog,
} from './src/types/erp';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'school-erp.json');

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadDatabase(): ErpDatabase {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const seeded = createSeedDatabase(todayIso());
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(seeded, null, 2), 'utf8');
    return seeded;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<ErpDatabase>;
    const merged: ErpDatabase = {
      ...seeded,
      ...parsed,
      settings: {
        ...seeded.settings,
        ...(parsed.settings ?? {}),
      },
      userPreferences: parsed.userPreferences ?? {},
      auditLogs: parsed.auditLogs ?? [],
      loginLogs: parsed.loginLogs ?? [],
    };
    return merged;
  } catch {
    fs.writeFileSync(DB_FILE, JSON.stringify(seeded, null, 2), 'utf8');
    return seeded;
  }
}

function appendLoginLog(
  userName: string,
  email: string,
  role: UserRole,
  status: 'Success' | 'Failed',
  deviceLabel = 'Web Browser'
): void {
  try {
    const db = loadDatabase();
    const entry: LoginLogEntry = {
      id: makeId('lgn'),
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      userName,
      email,
      role,
      deviceLabel,
      status,
    };
    db.loginLogs = [entry, ...(db.loginLogs || [])].slice(0, 120);
    saveDatabase(db);
  } catch {
    // non-fatal
  }
}

function appendAuditEntry(
  db: ErpDatabase,
  actor: ServerSessionUser,
  method: string,
  reqPath: string,
  summary: string
): void {
  const entry: AuditLogEntry = {
    id: makeId('aud'),
    timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
    actorName: actor.name,
    actorRole: actor.role,
    method,
    path: reqPath,
    summary,
  };
  db.auditLogs = [entry, ...(db.auditLogs || [])].slice(0, 150);
}

function saveDatabase(db: ErpDatabase): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmpFile, DB_FILE);
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

interface ServerSessionUser extends ScopedSessionUser {
  avatarInitial: string;
  studentCode?: string;
}

function signSessionToken(user: ServerSessionUser): string {
  const payload = Buffer.from(
    JSON.stringify({ user, exp: Date.now() + 24 * 60 * 60 * 1000 }),
    'utf8'
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifySessionToken(token: string): ServerSessionUser | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      user: ServerSessionUser;
      exp: number;
    };
    if (!parsed.exp || Date.now() > parsed.exp || !parsed.user?.role) return null;
    return parsed.user;
  } catch {
    return null;
  }
}

function getRequiredPermission(method: string, reqPath: string): ErpPermission | null {
  if (method === 'GET') return null;
  if (reqPath === '/preferences') return null;
  if (reqPath === '/reset' || reqPath.startsWith('/system/restore')) return 'manage_settings';
  if (reqPath.startsWith('/system/import-students')) return 'manage_students';
  if (reqPath.startsWith('/students')) return 'manage_students';
  if (reqPath.startsWith('/parents')) return 'manage_parents';
  if (reqPath.startsWith('/admissions')) return 'manage_admissions';
  if (reqPath.startsWith('/classes')) return 'manage_classes';
  if (reqPath.startsWith('/subjects') && reqPath.endsWith('/progress')) return 'update_syllabus';
  if (reqPath.startsWith('/subjects')) return 'manage_subjects';
  if (reqPath.startsWith('/attendance')) return 'mark_attendance';
  if (reqPath.startsWith('/fees')) return 'manage_fees';
  if (reqPath.startsWith('/ledger')) return 'manage_ledger';
  if (reqPath.startsWith('/staff') && reqPath.endsWith('/pay')) return 'manage_payroll';
  if (reqPath.startsWith('/staff')) return 'manage_staff';
  if (reqPath.startsWith('/exams/marks')) return 'enter_marks';
  if (reqPath.startsWith('/exams')) return 'manage_exams';
  if (reqPath === '/operations/leaves' && method === 'POST') return 'submit_leave';
  if (reqPath.startsWith('/operations/leaves')) return 'approve_leave';
  if (reqPath === '/operations/complaints' && method === 'POST') return 'submit_complaint';
  if (reqPath.startsWith('/operations/complaints')) return 'manage_complaints';
  if (reqPath.startsWith('/operations/notices')) return 'manage_notices';
  if (reqPath.startsWith('/operations/')) return 'manage_operations';
  if (reqPath.startsWith('/modules/homework')) return 'manage_homework';
  if (reqPath.startsWith('/modules/ptmSchedules')) return 'manage_ptm';
  if (reqPath.startsWith('/modules/libraryBooks')) return 'manage_library';
  if (reqPath.startsWith('/modules/transportRoutes')) return 'manage_transport';
  if (reqPath.startsWith('/modules/calendarEvents')) return 'manage_calendar';
  if (reqPath.startsWith('/modules/timetable')) return 'manage_timetable';
  if (reqPath.startsWith('/modules/inventory')) return 'manage_fees';
  if (reqPath.startsWith('/modules/')) return 'manage_operations';
  if (reqPath.startsWith('/settings') || reqPath.startsWith('/campuses')) return 'manage_settings';
  return 'manage_settings';
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  const adminPasscode = (process.env.ADMIN_PASSCODE || 'Meao@123').trim();

  // Public & Auth routes
  app.post('/api/auth/login', (req, res) => {
    const { identifier, password } = req.body as { identifier?: string; password?: string };
    const cleanId = (identifier ?? '').trim().toLowerCase();
    const cleanPass = (password ?? '').trim();

    if (!cleanId || !cleanPass) {
      res.status(400).json({ error: 'Please enter both your email/code and password.' });
      return;
    }

    if (cleanPass !== adminPasscode) {
      res.status(401).json({ error: 'Invalid password. Use your assigned portal password.' });
      return;
    }

    // 1. Primary Admin account
    if (
      cleanId === 'muhammadmudassir33322@gmail.com' ||
      cleanId === 'admin' ||
      cleanId === 'zain'
    ) {
      const user: ServerSessionUser = {
        name: 'Zain',
        email: 'muhammadmudassir33322@gmail.com',
        role: 'Admin',
        avatarInitial: 'Z',
      };
      appendLoginLog(user.name, user.email, user.role, 'Success', req.headers['user-agent']?.slice(0, 42) || 'Web');
      res.json({ user, token: signSessionToken(user) });
      return;
    }

    const db = loadDatabase();

    // 2. Staff / Teacher / Accountant / Coordinator / Front Desk / Librarian / Driver
    const staffMatch = db.staff.find(
      (s) =>
        s.email.toLowerCase() === cleanId ||
        s.employeeCode.toLowerCase() === cleanId
    );
    if (staffMatch) {
      const user: ServerSessionUser = {
        name: staffMatch.name,
        email: staffMatch.email,
        role: staffMatch.role as UserRole,
        staffId: staffMatch.id,
        avatarInitial: staffMatch.name.charAt(0).toUpperCase(),
      };
      appendLoginLog(user.name, user.email, user.role, 'Success', req.headers['user-agent']?.slice(0, 42) || 'Web');
      res.json({ user, token: signSessionToken(user) });
      return;
    }

    // 3. Parent (supports email, phone, CNIC, or parent ID, linking ALL children)
    const parentMatch = db.parents.find(
      (p) =>
        p.email.toLowerCase() === cleanId ||
        p.phone.toLowerCase() === cleanId ||
        p.cnic.toLowerCase() === cleanId ||
        p.id.toLowerCase() === cleanId
    );
    if (parentMatch) {
      const children = getParentChildren(db, {
        parentId: parentMatch.id,
        email: parentMatch.email,
        phone: parentMatch.phone,
        cnic: parentMatch.cnic,
      });
      const user: ServerSessionUser = {
        name: parentMatch.name,
        email: parentMatch.email || parentMatch.phone,
        role: 'Parent',
        parentId: parentMatch.id,
        linkedStudentIds: children.map((c) => c.id),
        avatarInitial: parentMatch.name.charAt(0).toUpperCase(),
      };
      appendLoginLog(user.name, user.email, user.role, 'Success', req.headers['user-agent']?.slice(0, 42) || 'Web');
      res.json({ user, token: signSessionToken(user) });
      return;
    }

    // Fallback parent match directly from student guardian fields
    const guardianStudent = db.students.find(
      (s) =>
        (s.parentEmail && s.parentEmail.toLowerCase() === cleanId) ||
        s.parentPhone.toLowerCase() === cleanId ||
        (s.parentCnic && s.parentCnic.toLowerCase() === cleanId)
    );
    if (guardianStudent) {
      const children = getParentChildren(db, {
        parentId: guardianStudent.parentId,
        email: guardianStudent.parentEmail,
        phone: guardianStudent.parentPhone,
        cnic: guardianStudent.parentCnic,
      });
      const user: ServerSessionUser = {
        name: guardianStudent.fatherName,
        email: guardianStudent.parentEmail || guardianStudent.parentPhone,
        role: 'Parent',
        parentId: guardianStudent.parentId,
        linkedStudentIds: children.map((c) => c.id),
        avatarInitial: guardianStudent.fatherName.charAt(0).toUpperCase(),
      };
      appendLoginLog(user.name, user.email, user.role, 'Success', req.headers['user-agent']?.slice(0, 42) || 'Web');
      res.json({ user, token: signSessionToken(user) });
      return;
    }

    // 4. Student (by studentCode e.g. ST-1001)
    const studentMatch = db.students.find((s) => s.studentCode.toLowerCase() === cleanId);
    if (studentMatch) {
      const user: ServerSessionUser = {
        name: studentMatch.name,
        email: studentMatch.studentCode,
        role: 'Student',
        studentId: studentMatch.id,
        studentCode: studentMatch.studentCode,
        parentId: studentMatch.parentId,
        linkedStudentIds: [studentMatch.id],
        avatarInitial: studentMatch.name.charAt(0).toUpperCase(),
      };
      appendLoginLog(user.name, user.email, user.role, 'Success', req.headers['user-agent']?.slice(0, 42) || 'Web');
      res.json({ user, token: signSessionToken(user) });
      return;
    }

    res.status(401).json({
      error: 'Account not found. Try admin email, teacher email, parent email/phone, or student code (ST-1001).',
    });
  });

  // Preview autostart bootstrap (issues signed Admin session into React memory when ?autostart=1 is used)
  app.post('/api/auth/autostart', (_req, res) => {
    const user: ServerSessionUser = {
      name: 'Zain',
      email: 'muhammadmudassir33322@gmail.com',
      role: 'Admin',
      avatarInitial: 'Z',
    };
    res.json({ user, token: signSessionToken(user) });
  });

  // Public admission inquiry submission from login page
  app.post('/api/public/admission', (req, res) => {
    const body = req.body as Partial<AdmissionInquiry>;
    if (!body.applicantName?.trim() || !body.fatherName?.trim() || !body.phone?.trim() || !body.appliedClass?.trim()) {
      res.status(400).json({ error: 'Applicant name, father name, class, and phone are required.' });
      return;
    }
    const db = loadDatabase();
    const campusId = body.campusId || db.campuses[0]?.id || 'campus-main';
    const newInquiry: AdmissionInquiry = {
      id: makeId('inq'),
      campusId,
      applicantName: body.applicantName.trim(),
      fatherName: body.fatherName.trim(),
      appliedClass: body.appliedClass.trim(),
      gender: body.gender === 'female' ? 'female' : 'male',
      dob: body.dob || '2016-01-01',
      phone: body.phone.trim(),
      email: body.email?.trim() || '',
      parentCnic: body.parentCnic?.trim() || '',
      bFormNo: body.bFormNo?.trim() || '',
      address: body.address?.trim() || '',
      notes: body.notes?.trim() || '',
      previousSchool: body.previousSchool?.trim() || 'N/A',
      appliedDate: todayIso(),
      status: 'new',
    };
    db.inquiries.unshift(newInquiry);
    if (db.settings.smsEnabled !== false && db.settings.autoSmsOnInquiry !== false && newInquiry.phone) {
      appendAutoMessage(
        db,
        campusId,
        'SMS',
        `${newInquiry.fatherName} (${newInquiry.phone})`,
        `Admission Application Received: ${newInquiry.applicantName} for ${newInquiry.appliedClass}. Ref #${newInquiry.id.slice(-6).toUpperCase()}.`
      );
    }
    saveDatabase(db);
    res.status(201).json({ inquiry: newInquiry, school: db.settings });
  });

  // Public fee voucher lookup by student code
  app.get('/api/public/voucher', (req, res) => {
    const code = String(req.query.code ?? '').trim().toLowerCase();
    if (!code) {
      res.status(400).json({ error: 'Enter a student code (e.g. ST-1004) or voucher number.' });
      return;
    }
    const db = loadDatabase();
    const vouchers = db.vouchers.filter(
      (v) => v.studentCode.toLowerCase() === code || v.voucherNo.toLowerCase() === code
    );
    if (vouchers.length === 0) {
      res.status(404).json({ error: `No fee voucher found for "${req.query.code}".` });
      return;
    }
    res.json({ vouchers, school: db.settings });
  });

  // Biometric / RFID Hardware Push Webhook (accepts x-device-key or Admin/Staff Bearer JWT)
  app.post('/api/attendance/device-sync', (req, res, next) => {
    const deviceKeyHeader = String(req.headers['x-device-key'] || '').trim();
    const db = loadDatabase();
    const expectedKey = (db.settings.biometricDeviceKey || 'IQRA-GATE-KEY-2026').trim();
    if (deviceKeyHeader && deviceKeyHeader === expectedKey) {
      (req as express.Request & { authUser?: ServerSessionUser }).authUser = {
        name: 'Gate Hardware Terminal',
        email: 'device@iqraschool.edu.pk',
        role: 'Admin',
        avatarInitial: 'G',
      };
      next();
      return;
    }
    next();
  });

  // Server-side Auth & RBAC Guard + Scoped DB Projection for all remaining /api/* routes
  app.use('/api', (req, res, next) => {
    const preAuthUser = (req as express.Request & { authUser?: ServerSessionUser }).authUser;
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const authUser = preAuthUser || (token ? verifySessionToken(token) : null);
    if (!authUser) {
      res.status(401).json({ error: 'Authentication required. Please sign in.' });
      return;
    }

    const perm = getRequiredPermission(req.method, req.path);
    if (perm && !canPerformPermission(authUser.role, perm)) {
      res.status(403).json({
        error: `Access denied for ${authUser.role} role (${perm.replace('_', ' ')}).`,
      });
      return;
    }

    (req as express.Request & { authUser?: ServerSessionUser }).authUser = authUser;

    const origJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      if (body && typeof body === 'object' && 'db' in body && (body as { db?: ErpDatabase }).db) {
        const currentDb = (body as { db: ErpDatabase }).db;
        if (req.method !== 'GET' && req.path !== '/preferences') {
          appendAuditEntry(currentDb, authUser, req.method, req.path, `${req.method} ${req.path}`);
          saveDatabase(currentDb);
        }
        return origJson({
          ...(body as Record<string, unknown>),
          db: scopeDatabaseForUser(currentDb, authUser),
        });
      }
      return origJson(body);
    }) as typeof res.json;

    next();
  });

  // Full state fetch (automatically scoped by authenticated user's role)
  app.get('/api/state', (req, res) => {
    const authUser = (req as express.Request & { authUser: ServerSessionUser }).authUser;
    const db = loadDatabase();
    res.json({ db: scopeDatabaseForUser(db, authUser), today: todayIso() });
  });

  // Account-synced Customize UI preferences (Theme, Language, Accent, Font, Sizing, Glass, BG, Nav Color)
  app.patch('/api/preferences', (req, res) => {
    const authUser = (req as express.Request & { authUser: ServerSessionUser }).authUser;
    const body = req.body as Partial<UiPreferences>;
    const db = loadDatabase();
    db.userPreferences = db.userPreferences || {};
    const acctKey = authUser.email.toLowerCase();
    const existing = db.userPreferences[acctKey] || {
      themeMode: 'light',
      language: 'en',
      accentColor: '#0f766e',
      fontFamily: 'poppins',
      textSize: 'md',
      spacing: 'comfy',
      cornerRoundness: 26,
      glassEffect: true,
      backgroundStyle: 'soft',
      navColor: 'cream',
    };
    const updated: UiPreferences = {
      ...existing,
      ...body,
      updatedAt: new Date().toISOString(),
    };
    db.userPreferences[acctKey] = updated;
    saveDatabase(db);
    res.json({ preferences: updated });
  });

  // System Backup Restore (Admin only)
  app.post('/api/system/restore', (req, res) => {
    const incoming = req.body as { snapshot?: Partial<ErpDatabase> };
    if (!incoming?.snapshot || !Array.isArray(incoming.snapshot.students) || !incoming.snapshot.settings) {
      res.status(400).json({ error: 'Invalid backup snapshot JSON structure.' });
      return;
    }
    const seeded = createSeedDatabase(todayIso());
    const restored: ErpDatabase = {
      ...seeded,
      ...incoming.snapshot,
      settings: {
        ...seeded.settings,
        ...(incoming.snapshot.settings || {}),
      },
    };
    saveDatabase(restored);
    res.json({ db: restored });
  });

  // Bulk Import Students (CSV / JSON rows)
  app.post('/api/system/import-students', (req, res) => {
    const { rows } = req.body as {
      rows?: Array<{ name?: string; fatherName?: string; parentPhone?: string; className?: string; monthlyFee?: number }>;
    };
    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ error: 'Provide at least one student row to import.' });
      return;
    }
    const db = loadDatabase();
    let importedCount = 0;
    for (const r of rows.slice(0, 200)) {
      if (!r.name?.trim() || !r.fatherName?.trim()) continue;
      const cls =
        db.classes.find((c) => c.className.toLowerCase() === (r.className || '').trim().toLowerCase()) ||
        db.classes[0];
      if (!cls) continue;
      const studentCode = generateNextStudentCode(db.students);
      const classCount = db.students.filter((s) => s.classId === cls.id && s.status === 'active').length;
      const stu: Student = {
        id: makeId('stu'),
        campusId: cls.campusId,
        studentCode,
        rollNo: String(classCount + 1).padStart(2, '0'),
        name: r.name.trim(),
        fatherName: r.fatherName.trim(),
        gender: 'male',
        dob: '2016-01-01',
        classId: cls.id,
        className: cls.className,
        sectionName: cls.sectionName,
        parentPhone: (r.parentPhone || '0300-0000000').trim(),
        parentEmail: '',
        parentCnic: '',
        address: 'Imported Record',
        monthlyFee: Number(r.monthlyFee) > 0 ? Number(r.monthlyFee) : cls.monthlyFee,
        discountPercent: 0,
        admissionDate: todayIso(),
        status: 'active',
      };
      db.students.unshift(stu);
      importedCount += 1;
    }
    saveDatabase(db);
    res.status(201).json({ importedCount, db });
  });

  // Reset demo data (Admin only)
  app.post('/api/reset', (_req, res) => {
    const seeded = createSeedDatabase(todayIso());
    saveDatabase(seeded);
    res.json({ db: seeded, today: todayIso() });
  });

  // Students CRUD
  app.post('/api/students', (req, res) => {
    const body = req.body as Partial<Student>;
    const db = loadDatabase();
    const linkedParent = body.parentId
      ? db.parents.find((p) => p.id === body.parentId)
      : undefined;

    const resolvedFatherName = (body.fatherName?.trim() || linkedParent?.name || '').trim();
    const resolvedParentPhone = (body.parentPhone?.trim() || linkedParent?.phone || '').trim();
    const resolvedParentEmail = (body.parentEmail?.trim() || linkedParent?.email || '').trim();
    const resolvedParentCnic = (body.parentCnic?.trim() || linkedParent?.cnic || '').trim();
    const resolvedAddress = (body.address?.trim() || linkedParent?.address || 'Karachi').trim();

    if (!body.name?.trim() || !resolvedFatherName || !body.classId || !resolvedParentPhone) {
      res.status(400).json({ error: 'Student name, parent/guardian name, class, and parent phone are required.' });
      return;
    }
    const cls = db.classes.find((c) => c.id === body.classId);
    if (!cls) {
      res.status(400).json({ error: 'Selected class section was not found.' });
      return;
    }

    let resolvedParentId = linkedParent?.id;
    if (!resolvedParentId) {
      const existingParent = db.parents.find(
        (p) =>
          (resolvedParentCnic && p.cnic === resolvedParentCnic) ||
          (p.phone === resolvedParentPhone && p.name.toLowerCase() === resolvedFatherName.toLowerCase())
      );
      if (existingParent) {
        resolvedParentId = existingParent.id;
      } else {
        const newParent: ParentAccount = {
          id: makeId('par'),
          campusId: cls.campusId,
          name: resolvedFatherName,
          phone: resolvedParentPhone,
          email: resolvedParentEmail,
          cnic: resolvedParentCnic,
          address: resolvedAddress,
        };
        db.parents.unshift(newParent);
        resolvedParentId = newParent.id;
      }
    }

    const extBody = body as Partial<Student> & {
      generateInitialVoucher?: boolean;
      admissionFeeAmount?: number;
    };
    const classCount = db.students.filter((s) => s.classId === cls.id && s.status === 'active').length;
    const hasBio = Boolean(extBody.faceAvatar || (Array.isArray(extBody.faceDescriptor) && extBody.faceDescriptor.length > 0));
    const student: Student = {
      id: makeId('stu'),
      campusId: cls.campusId,
      parentId: resolvedParentId,
      studentCode: generateNextStudentCode(db.students),
      rollNo: String(classCount + 1).padStart(2, '0'),
      name: body.name.trim(),
      fatherName: resolvedFatherName,
      gender: body.gender === 'female' ? 'female' : 'male',
      dob: body.dob || '2015-05-01',
      classId: cls.id,
      className: cls.className,
      sectionName: cls.sectionName,
      parentPhone: resolvedParentPhone,
      parentEmail: resolvedParentEmail,
      parentCnic: resolvedParentCnic,
      bFormNo: extBody.bFormNo?.trim() || '',
      bloodGroup: extBody.bloodGroup?.trim() || '',
      emergencyPhone: extBody.emergencyPhone?.trim() || '',
      previousSchool: extBody.previousSchool?.trim() || '',
      address: resolvedAddress,
      monthlyFee: Number(body.monthlyFee) > 0 ? Number(body.monthlyFee) : cls.monthlyFee,
      discountPercent: Math.min(100, Math.max(0, Number(body.discountPercent) || 0)),
      admissionDate: body.admissionDate || todayIso(),
      status: 'active',
      ...(hasBio
        ? {
            faceEnrolled: true,
            faceEnrolledAt: todayIso(),
            ...(extBody.faceAvatar ? { faceAvatar: extBody.faceAvatar } : {}),
            ...(Array.isArray(extBody.faceDescriptor) ? { faceDescriptor: extBody.faceDescriptor } : {}),
          }
        : {}),
    };
    db.students.unshift(student);

    let initialVoucher: FeeVoucher | null = null;
    if (extBody.generateInitialVoucher) {
      const admFee = Math.max(0, Number(extBody.admissionFeeAmount) || 0);
      const calc = calculateVoucherTotal({
        tuitionAmount: student.monthlyFee,
        otherCharges: admFee,
        discountPercent: student.discountPercent,
        lateFine: 0,
      });
      const mk = todayIso().slice(0, 7);
      const mLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      initialVoucher = {
        id: makeId('vch'),
        campusId: student.campusId,
        voucherNo: generateNextVoucherNo(db.vouchers),
        studentId: student.id,
        studentName: student.name,
        studentCode: student.studentCode,
        className: student.className,
        sectionName: student.sectionName,
        monthLabel: mLabel,
        monthKey: mk,
        feeType: admFee > 0 ? 'Admission + Monthly Tuition' : 'Monthly Tuition',
        tuitionAmount: student.monthlyFee,
        otherCharges: admFee,
        discountAmount: calc.discountAmount,
        lateFine: 0,
        totalAmount: calc.totalAmount,
        paidAmount: 0,
        dueDate: todayIso(),
        status: 'unpaid',
      };
      db.vouchers.unshift(initialVoucher);
    }

    saveDatabase(db);
    res.status(201).json({ student, voucher: initialVoucher, db });
  });

  app.patch('/api/students/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body as Partial<Student> & { status?: StudentStatus };
    const db = loadDatabase();
    const idx = db.students.findIndex((s) => s.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Student not found.' });
      return;
    }
    const existing = db.students[idx];
    let nextClassName = existing.className;
    let nextSectionName = existing.sectionName;
    let nextCampusId = existing.campusId;
    if (updates.classId && updates.classId !== existing.classId) {
      const cls = db.classes.find((c) => c.id === updates.classId);
      if (cls) {
        nextClassName = cls.className;
        nextSectionName = cls.sectionName;
        nextCampusId = cls.campusId;
      }
    }
    const linkedParent =
      updates.parentId && updates.parentId !== existing.parentId
        ? db.parents.find((p) => p.id === updates.parentId)
        : undefined;

    db.students[idx] = {
      ...existing,
      ...updates,
      ...(linkedParent
        ? {
            parentId: linkedParent.id,
            fatherName: linkedParent.name,
            parentPhone: linkedParent.phone,
            parentEmail: linkedParent.email,
            parentCnic: linkedParent.cnic,
          }
        : {}),
      className: nextClassName,
      sectionName: nextSectionName,
      campusId: nextCampusId,
    };
    saveDatabase(db);
    res.json({ student: db.students[idx], db });
  });

  app.delete('/api/students/:id', (req, res) => {
    const { id } = req.params;
    const db = loadDatabase();
    const before = db.students.length;
    db.students = db.students.filter((s) => s.id !== id);
    if (db.students.length === before) {
      res.status(404).json({ error: 'Student not found.' });
      return;
    }
    saveDatabase(db);
    res.json({ db });
  });

  // Parents CRUD & Multi-Student Linking
  app.post('/api/parents', (req, res) => {
    const { campusId, name, phone, email, cnic, address, occupation, studentIds } = req.body as {
      campusId?: string;
      name?: string;
      phone?: string;
      email?: string;
      cnic?: string;
      address?: string;
      occupation?: string;
      studentIds?: string[];
    };
    if (!name?.trim() || !phone?.trim()) {
      res.status(400).json({ error: 'Parent name and phone are required.' });
      return;
    }
    const db = loadDatabase();
    const newParent: ParentAccount = {
      id: makeId('par'),
      campusId: campusId || db.campuses[0]?.id || 'campus-main',
      name: name.trim(),
      phone: phone.trim(),
      email: email?.trim() || '',
      cnic: cnic?.trim() || '',
      address: address?.trim() || 'Karachi',
      occupation: occupation?.trim() || '',
    };
    db.parents.unshift(newParent);
    if (Array.isArray(studentIds) && studentIds.length > 0) {
      db.students = db.students.map((s) =>
        studentIds.includes(s.id)
          ? {
              ...s,
              parentId: newParent.id,
              fatherName: newParent.name,
              parentPhone: newParent.phone,
              parentEmail: newParent.email,
              parentCnic: newParent.cnic,
            }
          : s
      );
    }
    saveDatabase(db);
    res.status(201).json({ parent: newParent, db });
  });

  app.post('/api/parents/:id/link-student', (req, res) => {
    const { id } = req.params;
    const { studentId } = req.body as { studentId?: string };
    const db = loadDatabase();
    const parent = db.parents.find((p) => p.id === id);
    if (!parent) {
      res.status(404).json({ error: 'Parent account not found.' });
      return;
    }
    const stuIdx = db.students.findIndex((s) => s.id === studentId || s.studentCode === studentId);
    if (stuIdx === -1) {
      res.status(404).json({ error: 'Student not found.' });
      return;
    }
    db.students[stuIdx] = {
      ...db.students[stuIdx],
      parentId: parent.id,
      fatherName: parent.name,
      parentPhone: parent.phone,
      parentEmail: parent.email,
      parentCnic: parent.cnic,
    };
    saveDatabase(db);
    res.json({ student: db.students[stuIdx], db });
  });

  app.delete('/api/parents/:id', (req, res) => {
    const { id } = req.params;
    const db = loadDatabase();
    const before = db.parents.length;
    db.parents = db.parents.filter((p) => p.id !== id);
    if (db.parents.length === before) {
      res.status(404).json({ error: 'Parent account not found.' });
      return;
    }
    db.students = db.students.map((s) => (s.parentId === id ? { ...s, parentId: undefined } : s));
    saveDatabase(db);
    res.json({ db });
  });

  app.patch('/api/parents', (req, res) => {
    const { parentId, oldPhone, oldName, fatherName, parentPhone, parentEmail, parentCnic, address, occupation } = req.body as {
      parentId?: string;
      oldPhone?: string;
      oldName?: string;
      fatherName: string;
      parentPhone: string;
      parentEmail?: string;
      parentCnic?: string;
      address?: string;
      occupation?: string;
    };
    if (!fatherName?.trim() || !parentPhone?.trim()) {
      res.status(400).json({ error: 'Guardian name and phone are required.' });
      return;
    }
    const db = loadDatabase();
    let matchedParentId = parentId;
    if (matchedParentId) {
      const pIdx = db.parents.findIndex((p) => p.id === matchedParentId);
      if (pIdx !== -1) {
        db.parents[pIdx] = {
          ...db.parents[pIdx],
          name: fatherName.trim(),
          phone: parentPhone.trim(),
          email: parentEmail?.trim() ?? db.parents[pIdx].email,
          cnic: parentCnic?.trim() ?? db.parents[pIdx].cnic,
          address: address?.trim() ?? db.parents[pIdx].address,
          occupation: occupation?.trim() ?? db.parents[pIdx].occupation,
        };
      }
    } else if (oldPhone && oldName) {
      const pIdx = db.parents.findIndex((p) => p.phone === oldPhone && p.name === oldName);
      if (pIdx !== -1) {
        matchedParentId = db.parents[pIdx].id;
        db.parents[pIdx] = {
          ...db.parents[pIdx],
          name: fatherName.trim(),
          phone: parentPhone.trim(),
          email: parentEmail?.trim() ?? db.parents[pIdx].email,
          cnic: parentCnic?.trim() ?? db.parents[pIdx].cnic,
          address: address?.trim() ?? db.parents[pIdx].address,
          occupation: occupation?.trim() ?? db.parents[pIdx].occupation,
        };
      }
    }

    let updatedCount = 0;
    db.students = db.students.map((s) => {
      const matchesById = Boolean(matchedParentId && s.parentId === matchedParentId);
      const matchesByLegacy = Boolean(oldPhone && oldName && s.parentPhone === oldPhone && s.fatherName === oldName);
      if (matchesById || matchesByLegacy) {
        updatedCount += 1;
        return {
          ...s,
          parentId: matchedParentId || s.parentId,
          fatherName: fatherName.trim(),
          parentPhone: parentPhone.trim(),
          parentEmail: parentEmail?.trim() ?? s.parentEmail,
          parentCnic: parentCnic?.trim() ?? s.parentCnic,
          address: address?.trim() ?? s.address,
        };
      }
      return s;
    });
    if (updatedCount === 0 && !matchedParentId) {
      res.status(404).json({ error: 'Parent record not found.' });
      return;
    }
    saveDatabase(db);
    res.json({ updatedCount, db });
  });

  app.post('/api/students/promote', (req, res) => {
    const { studentIds, targetClassId } = req.body as { studentIds: string[]; targetClassId: string };
    const db = loadDatabase();
    const targetCls = db.classes.find((c) => c.id === targetClassId);
    if (!targetCls || !Array.isArray(studentIds) || studentIds.length === 0) {
      res.status(400).json({ error: 'Select students and a target class.' });
      return;
    }
    let count = 0;
    db.students = db.students.map((s) => {
      if (studentIds.includes(s.id)) {
        count += 1;
        return {
          ...s,
          classId: targetCls.id,
          className: targetCls.className,
          sectionName: targetCls.sectionName,
          campusId: targetCls.campusId,
          monthlyFee: targetCls.monthlyFee,
        };
      }
      return s;
    });
    saveDatabase(db);
    res.json({ promotedCount: count, db });
  });

  // Admissions & Inquiries
  app.post('/api/admissions', (req, res) => {
    const body = req.body as Partial<AdmissionInquiry>;
    if (!body.applicantName?.trim() || !body.fatherName?.trim() || !body.phone?.trim() || !body.appliedClass?.trim()) {
      res.status(400).json({ error: 'Applicant name, father name, class, and phone are required.' });
      return;
    }
    const db = loadDatabase();
    const inquiry: AdmissionInquiry = {
      id: makeId('inq'),
      campusId: body.campusId || db.campuses[0]?.id || 'campus-main',
      applicantName: body.applicantName.trim(),
      fatherName: body.fatherName.trim(),
      appliedClass: body.appliedClass.trim(),
      gender: body.gender === 'female' ? 'female' : 'male',
      dob: body.dob || '2016-01-01',
      phone: body.phone.trim(),
      email: body.email?.trim() || '',
      parentCnic: body.parentCnic?.trim() || '',
      bFormNo: body.bFormNo?.trim() || '',
      address: body.address?.trim() || '',
      notes: body.notes?.trim() || '',
      previousSchool: body.previousSchool?.trim() || 'N/A',
      appliedDate: todayIso(),
      status: 'new',
    };
    db.inquiries.unshift(inquiry);
    saveDatabase(db);
    res.status(201).json({ inquiry, db });
  });

  app.post('/api/admissions/:id/decision', (req, res) => {
    const { id } = req.params;
    const {
      decision,
      classId,
      sectionName,
      generateInitialVoucher = true,
      admissionFeeAmount = 3000,
    } = req.body as {
      decision: 'approved' | 'rejected' | 'contacted';
      classId?: string;
      sectionName?: string;
      generateInitialVoucher?: boolean;
      admissionFeeAmount?: number;
    };
    const db = loadDatabase();
    const idx = db.inquiries.findIndex((i) => i.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Inquiry not found.' });
      return;
    }
    const inquiry = db.inquiries[idx];
    db.inquiries[idx] = { ...inquiry, status: decision };

    let enrolledStudent: Student | null = null;
    let initialVoucher: FeeVoucher | null = null;

    if (decision === 'approved') {
      const targetCls =
        (classId ? db.classes.find((c) => c.id === classId) : undefined) ||
        (sectionName
          ? db.classes.find(
              (c) =>
                c.campusId === inquiry.campusId &&
                c.className.toLowerCase() === inquiry.appliedClass.toLowerCase() &&
                c.sectionName.toLowerCase() === sectionName.toLowerCase()
            ) ||
            db.classes.find(
              (c) =>
                c.className.toLowerCase() === inquiry.appliedClass.toLowerCase() &&
                c.sectionName.toLowerCase() === sectionName.toLowerCase()
            )
          : undefined) ||
        db.classes.find(
          (c) =>
            c.campusId === inquiry.campusId &&
            c.className.toLowerCase() === inquiry.appliedClass.toLowerCase()
        ) ||
        db.classes.find((c) => c.campusId === inquiry.campusId) ||
        db.classes[0];

      if (targetCls) {
        // Find or create linked ParentAccount so siblings & parent portal work immediately
        let parentAcc = db.parents.find(
          (p) =>
            (inquiry.parentCnic && p.cnic === inquiry.parentCnic) ||
            (p.phone === inquiry.phone && p.name.toLowerCase() === inquiry.fatherName.toLowerCase()) ||
            (inquiry.email && p.email && p.email.toLowerCase() === inquiry.email.toLowerCase())
        );
        if (!parentAcc) {
          parentAcc = {
            id: makeId('par'),
            campusId: targetCls.campusId,
            name: inquiry.fatherName,
            phone: inquiry.phone,
            email: inquiry.email || '',
            cnic: inquiry.parentCnic || '',
            address: inquiry.address || 'Karachi',
          };
          db.parents.unshift(parentAcc);
        }

        const classCount = db.students.filter((s) => s.classId === targetCls.id && s.status === 'active').length;
        enrolledStudent = {
          id: makeId('stu'),
          campusId: targetCls.campusId,
          parentId: parentAcc.id,
          studentCode: generateNextStudentCode(db.students),
          rollNo: String(classCount + 1).padStart(2, '0'),
          name: inquiry.applicantName,
          fatherName: inquiry.fatherName,
          gender: inquiry.gender,
          dob: inquiry.dob,
          classId: targetCls.id,
          className: targetCls.className,
          sectionName: targetCls.sectionName,
          parentPhone: inquiry.phone,
          parentEmail: inquiry.email,
          parentCnic: inquiry.parentCnic || '',
          bFormNo: inquiry.bFormNo || '',
          previousSchool: inquiry.previousSchool || 'N/A',
          address: inquiry.address || 'Karachi',
          monthlyFee: targetCls.monthlyFee,
          discountPercent: 0,
          admissionDate: todayIso(),
          status: 'active',
        };
        db.students.unshift(enrolledStudent);
        db.inquiries[idx] = {
          ...db.inquiries[idx],
          enrolledStudentId: enrolledStudent.id,
          enrolledStudentCode: enrolledStudent.studentCode,
        };

        if (generateInitialVoucher) {
          const admCharge = Math.max(0, Number(admissionFeeAmount) || 0);
          const calc = calculateVoucherTotal({
            tuitionAmount: enrolledStudent.monthlyFee,
            otherCharges: admCharge,
            discountPercent: 0,
            lateFine: 0,
          });
          const mk = todayIso().slice(0, 7);
          const mLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          initialVoucher = {
            id: makeId('vch'),
            campusId: enrolledStudent.campusId,
            voucherNo: generateNextVoucherNo(db.vouchers),
            studentId: enrolledStudent.id,
            studentName: enrolledStudent.name,
            studentCode: enrolledStudent.studentCode,
            className: enrolledStudent.className,
            sectionName: enrolledStudent.sectionName,
            monthLabel: mLabel,
            monthKey: mk,
            feeType: admCharge > 0 ? 'Admission + Monthly Tuition' : 'Monthly Tuition',
            tuitionAmount: enrolledStudent.monthlyFee,
            otherCharges: admCharge,
            discountAmount: calc.discountAmount,
            lateFine: 0,
            totalAmount: calc.totalAmount,
            paidAmount: 0,
            dueDate: todayIso(),
            status: 'unpaid',
          };
          db.vouchers.unshift(initialVoucher);
        }

        if (db.settings.whatsappEnabled && enrolledStudent.parentPhone) {
          appendAutoMessage(
            db,
            enrolledStudent.campusId,
            'WhatsApp',
            `${enrolledStudent.fatherName} (${enrolledStudent.parentPhone})`,
            `Welcome to ${db.settings.schoolName}! ${enrolledStudent.name} is enrolled in ${enrolledStudent.className} (${enrolledStudent.sectionName}). Student ID: ${enrolledStudent.studentCode}.${initialVoucher ? ` Fee Voucher #${initialVoucher.voucherNo} (${db.settings.currency} ${initialVoucher.totalAmount.toLocaleString()}) issued.` : ''}`
          );
        }
      }
    }

    saveDatabase(db);
    res.json({ inquiry: db.inquiries[idx], student: enrolledStudent, voucher: initialVoucher, db });
  });

  app.patch('/api/admissions/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body as Partial<AdmissionInquiry>;
    const db = loadDatabase();
    const idx = db.inquiries.findIndex((i) => i.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Inquiry not found.' });
      return;
    }
    db.inquiries[idx] = { ...db.inquiries[idx], ...updates };
    saveDatabase(db);
    res.json({ inquiry: db.inquiries[idx], db });
  });

  app.delete('/api/admissions/:id', (req, res) => {
    const { id } = req.params;
    const db = loadDatabase();
    const before = db.inquiries.length;
    db.inquiries = db.inquiries.filter((i) => i.id !== id);
    if (db.inquiries.length === before) {
      res.status(404).json({ error: 'Inquiry not found.' });
      return;
    }
    saveDatabase(db);
    res.json({ db });
  });

  // Classes & Subjects
  app.post('/api/classes', (req, res) => {
    const body = req.body as Partial<ClassSection>;
    if (!body.className?.trim() || !body.sectionName?.trim()) {
      res.status(400).json({ error: 'Class name and section are required.' });
      return;
    }
    const db = loadDatabase();
    const cls: ClassSection = {
      id: makeId('cls'),
      campusId: body.campusId || 'campus-main',
      className: body.className.trim(),
      sectionName: body.sectionName.trim(),
      monthlyFee: Math.max(0, Number(body.monthlyFee) || 6000),
      classTeacherId: body.classTeacherId || '',
      room: body.room?.trim() || 'Room 101',
      capacity: Math.max(1, Number(body.capacity) || 35),
    };
    db.classes.push(cls);
    saveDatabase(db);
    res.status(201).json({ cls, db });
  });

  app.patch('/api/classes/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body as Partial<ClassSection>;
    const db = loadDatabase();
    const idx = db.classes.findIndex((c) => c.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Class section not found.' });
      return;
    }
    const updated: ClassSection = {
      ...db.classes[idx],
      ...updates,
      monthlyFee: updates.monthlyFee !== undefined ? Math.max(0, Number(updates.monthlyFee)) : db.classes[idx].monthlyFee,
      capacity: updates.capacity !== undefined ? Math.max(1, Number(updates.capacity)) : db.classes[idx].capacity,
    };
    db.classes[idx] = updated;
    db.students = db.students.map((s) =>
      s.classId === id ? { ...s, className: updated.className, sectionName: updated.sectionName } : s
    );
    saveDatabase(db);
    res.json({ cls: updated, db });
  });

  app.delete('/api/classes/:id', (req, res) => {
    const { id } = req.params;
    const db = loadDatabase();
    const before = db.classes.length;
    db.classes = db.classes.filter((c) => c.id !== id);
    if (db.classes.length === before) {
      res.status(404).json({ error: 'Class section not found.' });
      return;
    }
    saveDatabase(db);
    res.json({ db });
  });

  app.post('/api/subjects', (req, res) => {
    const body = req.body as Partial<Subject>;
    if (!body.name?.trim() || !body.className?.trim()) {
      res.status(400).json({ error: 'Subject name and class are required.' });
      return;
    }
    const db = loadDatabase();
    const subject: Subject = {
      id: makeId('sub'),
      campusId: body.campusId || 'campus-main',
      name: body.name.trim(),
      code: body.code?.trim() || `SUB-${db.subjects.length + 101}`,
      className: body.className.trim(),
      teacherId: body.teacherId || '',
      totalMarks: Math.max(10, Number(body.totalMarks) || 100),
      syllabusProgress: Math.min(100, Math.max(0, Number(body.syllabusProgress) || 0)),
    };
    db.subjects.push(subject);
    saveDatabase(db);
    res.status(201).json({ subject, db });
  });

  app.patch('/api/subjects/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body as Partial<Subject>;
    const db = loadDatabase();
    const idx = db.subjects.findIndex((s) => s.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Subject not found.' });
      return;
    }
    const existing = db.subjects[idx];
    db.subjects[idx] = {
      ...existing,
      ...updates,
      totalMarks: updates.totalMarks !== undefined ? Math.max(10, Number(updates.totalMarks)) : existing.totalMarks,
      syllabusProgress:
        updates.syllabusProgress !== undefined
          ? Math.min(100, Math.max(0, Number(updates.syllabusProgress)))
          : existing.syllabusProgress,
    };
    saveDatabase(db);
    res.json({ subject: db.subjects[idx], db });
  });

  app.patch('/api/subjects/:id/progress', (req, res) => {
    const { id } = req.params;
    const { syllabusProgress } = req.body as { syllabusProgress?: number };
    const db = loadDatabase();
    const idx = db.subjects.findIndex((s) => s.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Subject not found.' });
      return;
    }
    db.subjects[idx] = {
      ...db.subjects[idx],
      syllabusProgress: Math.min(100, Math.max(0, Number(syllabusProgress ?? db.subjects[idx].syllabusProgress))),
    };
    saveDatabase(db);
    res.json({ subject: db.subjects[idx], db });
  });

  app.delete('/api/subjects/:id', (req, res) => {
    const { id } = req.params;
    const db = loadDatabase();
    const before = db.subjects.length;
    db.subjects = db.subjects.filter((s) => s.id !== id);
    if (db.subjects.length === before) {
      res.status(404).json({ error: 'Subject not found.' });
      return;
    }
    saveDatabase(db);
    res.json({ db });
  });

  function appendAutoMessage(
    db: ErpDatabase,
    campusId: string,
    channel: 'WhatsApp' | 'SMS',
    recipient: string,
    message: string
  ) {
    if (channel === 'WhatsApp' && db.settings.whatsappLeft > 0) {
      db.settings.whatsappLeft = Math.max(0, db.settings.whatsappLeft - 1);
    }
    db.messageLogs.unshift({
      id: makeId('msg'),
      campusId,
      channel,
      recipient,
      message,
      sentAt: todayIso(),
      status: 'Delivered',
    });
  }

  function extractScanCode(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed) as { code?: string; id?: string; studentCode?: string; employeeCode?: string };
        return (parsed.code || parsed.studentCode || parsed.employeeCode || parsed.id || '').trim();
      } catch {
        // ignore invalid JSON
      }
    }
    if (trimmed.includes(':')) {
      const parts = trimmed.split(':');
      const tail = parts[parts.length - 1].trim();
      if (tail) return tail;
    }
    return trimmed;
  }

  // Attendance
  app.post('/api/attendance/batch', (req, res) => {
    const { campusId, date, targetType, classId, entries } = req.body as {
      campusId: string;
      date: string;
      targetType: 'student' | 'staff';
      classId?: string;
      entries: Array<{ targetId: string; status: AttendanceStatus }>;
    };
    if (!date || !Array.isArray(entries) || entries.length === 0) {
      res.status(400).json({ error: 'Date and attendance entries are required.' });
      return;
    }
    const db = loadDatabase();
    const targetIds = new Set(entries.map((e) => e.targetId));
    db.attendance = db.attendance.filter(
      (a) => !(a.date === date && a.targetType === targetType && targetIds.has(a.targetId))
    );
    let absentAlertsSent = 0;
    for (const entry of entries) {
      const record: AttendanceRecord = {
        id: makeId('att'),
        campusId,
        date,
        targetType,
        targetId: entry.targetId,
        classId,
        status: entry.status,
        method: 'manual',
      };
      db.attendance.push(record);

      if (
        entry.status === 'absent' &&
        targetType === 'student' &&
        db.settings.whatsappEnabled &&
        db.settings.autoWhatsappOnAbsent
      ) {
        const stu = db.students.find((s) => s.id === entry.targetId);
        if (stu && stu.parentPhone) {
          const tpl =
            db.settings.messageTemplates?.absentAlert ||
            'Attendance Alert: {student} ({code}) was marked ABSENT on {date}.';
          const text = tpl
            .replaceAll('{student}', stu.name)
            .replaceAll('{code}', stu.studentCode)
            .replaceAll('{date}', date);
          appendAutoMessage(db, stu.campusId, 'WhatsApp', `${stu.fatherName} (${stu.parentPhone})`, text);
          absentAlertsSent += 1;
        }
      }
    }
    saveDatabase(db);
    res.json({ absentAlertsSent, db });
  });

  app.post('/api/attendance/enroll-face', (req, res) => {
    const { targetType, targetId, faceAvatar, faceDescriptor } = req.body as {
      targetType: 'student' | 'staff';
      targetId: string;
      faceAvatar?: string;
      faceDescriptor?: number[];
    };
    if (!targetId) {
      res.status(400).json({ error: 'Target person ID is required.' });
      return;
    }
    const db = loadDatabase();
    const enrolledAt = todayIso();
    if (targetType === 'staff') {
      const idx = db.staff.findIndex((s) => s.id === targetId);
      if (idx === -1) {
        res.status(404).json({ error: 'Staff member not found.' });
        return;
      }
      db.staff[idx] = {
        ...db.staff[idx],
        faceEnrolled: true,
        faceEnrolledAt: enrolledAt,
        ...(faceAvatar ? { faceAvatar } : {}),
        ...(Array.isArray(faceDescriptor) && faceDescriptor.length > 0 ? { faceDescriptor } : {}),
      };
      saveDatabase(db);
      res.json({ person: db.staff[idx], db });
      return;
    }
    const idx = db.students.findIndex((s) => s.id === targetId);
    if (idx === -1) {
      res.status(404).json({ error: 'Student not found.' });
      return;
    }
    db.students[idx] = {
      ...db.students[idx],
      faceEnrolled: true,
      faceEnrolledAt: enrolledAt,
      ...(faceAvatar ? { faceAvatar } : {}),
      ...(Array.isArray(faceDescriptor) && faceDescriptor.length > 0 ? { faceDescriptor } : {}),
    };
    saveDatabase(db);
    res.json({ person: db.students[idx], db });
  });

  app.post('/api/attendance/device-sync', (req, res) => {
    const {
      deviceId,
      targetType = 'student',
      personCode,
      codeOrId,
      method = 'face',
      timestamp,
      scanAction = 'auto',
    } = req.body as {
      deviceId?: string;
      targetType?: 'student' | 'staff';
      personCode?: string;
      codeOrId?: string;
      method?: 'face' | 'card';
      timestamp?: string;
      scanAction?: 'in' | 'out' | 'auto';
    };
    const rawCode = personCode || codeOrId || '';
    const query = extractScanCode(rawCode).toLowerCase();
    if (!query) {
      res.status(400).json({ ok: false, error: 'personCode is required from biometric/RFID device.' });
      return;
    }
    const db = loadDatabase();
    const scanDate = timestamp && /^\d{4}-\d{2}-\d{2}/.test(timestamp) ? timestamp.slice(0, 10) : todayIso();
    const scanTime =
      timestamp && timestamp.includes('T')
        ? timestamp.slice(11, 16)
        : new Date().toTimeString().slice(0, 5);
    const lateCutoff = db.settings.lateCutoffTime || '08:15';
    const resolvedStatus: AttendanceStatus = scanTime > lateCutoff ? 'late' : 'present';
    const normalizedMethod: 'face' | 'card' = method === 'card' ? 'card' : 'face';

    if (targetType === 'staff') {
      const stf = db.staff.find(
        (s) => s.id.toLowerCase() === query || s.employeeCode.toLowerCase() === query || s.name.toLowerCase() === query
      );
      if (!stf) {
        res.status(404).json({ error: `Device push: staff "${personCode}" not found.` });
        return;
      }
      const existingIdx = db.attendance.findIndex(
        (a) => a.date === scanDate && a.targetType === 'staff' && a.targetId === stf.id
      );
      const existing = existingIdx >= 0 ? db.attendance[existingIdx] : null;
      const isCheckout = scanAction === 'out' || (scanAction === 'auto' && Boolean(existing?.timeIn) && !existing?.timeOut);
      let record: AttendanceRecord;
      if (isCheckout && existing) {
        record = { ...existing, method: normalizedMethod, timeOut: scanTime };
        db.attendance[existingIdx] = record;
      } else {
        db.attendance = db.attendance.filter(
          (a) => !(a.date === scanDate && a.targetType === 'staff' && a.targetId === stf.id)
        );
        record = {
          id: makeId('att'),
          campusId: stf.campusId,
          date: scanDate,
          targetType: 'staff',
          targetId: stf.id,
          status: resolvedStatus,
          method: normalizedMethod,
          timeIn: scanTime,
        };
        db.attendance.push(record);
      }
      saveDatabase(db);
      res.json({
        ok: true,
        deviceId: deviceId || 'ZK-GATE-01',
        matchedName: stf.name,
        matchedCode: stf.employeeCode,
        action: isCheckout ? 'out' : 'in',
        record,
      });
      return;
    }

    const stu = db.students.find(
      (s) => s.id.toLowerCase() === query || s.studentCode.toLowerCase() === query || s.name.toLowerCase() === query
    );
    if (!stu) {
      res.status(404).json({ error: `Device push: student "${personCode}" not found.` });
      return;
    }
    const existingIdx = db.attendance.findIndex(
      (a) => a.date === scanDate && a.targetType === 'student' && a.targetId === stu.id
    );
    const existing = existingIdx >= 0 ? db.attendance[existingIdx] : null;
    const isCheckout = scanAction === 'out' || (scanAction === 'auto' && Boolean(existing?.timeIn) && !existing?.timeOut);
    let record: AttendanceRecord;
    if (isCheckout && existing) {
      record = { ...existing, method: normalizedMethod, timeOut: scanTime };
      db.attendance[existingIdx] = record;
    } else {
      db.attendance = db.attendance.filter(
        (a) => !(a.date === scanDate && a.targetType === 'student' && a.targetId === stu.id)
      );
      record = {
        id: makeId('att'),
        campusId: stu.campusId,
        date: scanDate,
        targetType: 'student',
        targetId: stu.id,
        classId: stu.classId,
        status: resolvedStatus,
        method: normalizedMethod,
        timeIn: scanTime,
      };
      db.attendance.push(record);
    }

    if (db.settings.whatsappEnabled && db.settings.autoWhatsappOnCheckIn && stu.parentPhone) {
      const tpl =
        db.settings.messageTemplates?.gateCheckIn ||
        'Gate Scan Alert: {student} ({code}) checked {action} at {time} ({date}) via {method}.';
      const msgText = tpl
        .replaceAll('{student}', stu.name)
        .replaceAll('{code}', stu.studentCode)
        .replaceAll('{action}', isCheckout ? 'OUT' : 'IN')
        .replaceAll('{time}', scanTime)
        .replaceAll('{date}', scanDate)
        .replaceAll('{method}', normalizedMethod === 'face' ? `Face Terminal (${deviceId || 'Gate'})` : `RFID Card (${deviceId || 'Gate'})`);
      appendAutoMessage(db, stu.campusId, 'WhatsApp', `${stu.fatherName} (${stu.parentPhone})`, msgText);
    }

    saveDatabase(db);
    res.json({
      ok: true,
      deviceId: deviceId || 'ZK-GATE-01',
      matchedName: stu.name,
      matchedCode: stu.studentCode,
      action: isCheckout ? 'out' : 'in',
      record,
    });
  });

  app.post('/api/attendance/scan', (req, res) => {
    const { date, targetType, codeOrId, method, status, scanAction } = req.body as {
      date?: string;
      targetType: 'student' | 'staff';
      codeOrId: string;
      method: 'face' | 'card';
      status?: AttendanceStatus | 'auto';
      scanAction?: 'in' | 'out' | 'auto';
    };
    const scanDate = date || todayIso();
    const query = extractScanCode(codeOrId || '').toLowerCase();
    if (!query) {
      res.status(400).json({ error: 'Student or Staff ID / Code is required.' });
      return;
    }

    const db = loadDatabase();
    const scanTime = new Date().toTimeString().slice(0, 5);
    const lateCutoff = db.settings.lateCutoffTime || '08:15';
    const resolvedStatus: AttendanceStatus =
      !status || status === 'auto' ? (scanTime > lateCutoff ? 'late' : 'present') : status;
    const requestedAction = scanAction || 'auto';

    if (targetType === 'staff') {
      const stf = db.staff.find(
        (s) =>
          s.id.toLowerCase() === query ||
          s.employeeCode.toLowerCase() === query ||
          s.name.toLowerCase() === query
      );
      if (!stf) {
        res.status(404).json({ error: `No staff member found matching "${codeOrId}".` });
        return;
      }
      const existingIdx = db.attendance.findIndex(
        (a) => a.date === scanDate && a.targetType === 'staff' && a.targetId === stf.id
      );
      const existing = existingIdx >= 0 ? db.attendance[existingIdx] : null;
      const isCheckout =
        requestedAction === 'out' || (requestedAction === 'auto' && Boolean(existing?.timeIn) && !existing?.timeOut);

      let record: AttendanceRecord;
      if (isCheckout && existing) {
        record = {
          ...existing,
          method: method === 'face' ? 'face' : 'card',
          timeOut: scanTime,
        };
        db.attendance[existingIdx] = record;
      } else {
        db.attendance = db.attendance.filter(
          (a) => !(a.date === scanDate && a.targetType === 'staff' && a.targetId === stf.id)
        );
        record = {
          id: makeId('att'),
          campusId: stf.campusId,
          date: scanDate,
          targetType: 'staff',
          targetId: stf.id,
          status: resolvedStatus,
          method: method === 'face' ? 'face' : 'card',
          timeIn: scanTime,
          ...(isCheckout ? { timeOut: scanTime } : {}),
        };
        db.attendance.push(record);
      }

      const effectiveAction: 'in' | 'out' = isCheckout ? 'out' : 'in';
      saveDatabase(db);
      res.json({
        record,
        action: effectiveAction,
        scanType: effectiveAction,
        matchedName: stf.name,
        matchedCode: stf.employeeCode,
        roleOrClass: `${stf.role} · ${stf.department}`,
        db,
      });
      return;
    }

    const stu = db.students.find(
      (s) =>
        s.id.toLowerCase() === query ||
        s.studentCode.toLowerCase() === query ||
        s.name.toLowerCase() === query
    );
    if (!stu) {
      res.status(404).json({ error: `No student found matching "${codeOrId}".` });
      return;
    }
    const existingIdx = db.attendance.findIndex(
      (a) => a.date === scanDate && a.targetType === 'student' && a.targetId === stu.id
    );
    const existing = existingIdx >= 0 ? db.attendance[existingIdx] : null;
    const isCheckout =
      requestedAction === 'out' || (requestedAction === 'auto' && Boolean(existing?.timeIn) && !existing?.timeOut);

    let record: AttendanceRecord;
    if (isCheckout && existing) {
      record = {
        ...existing,
        method: method === 'face' ? 'face' : 'card',
        timeOut: scanTime,
      };
      db.attendance[existingIdx] = record;
    } else {
      db.attendance = db.attendance.filter(
        (a) => !(a.date === scanDate && a.targetType === 'student' && a.targetId === stu.id)
      );
      record = {
        id: makeId('att'),
        campusId: stu.campusId,
        date: scanDate,
        targetType: 'student',
        targetId: stu.id,
        classId: stu.classId,
        status: resolvedStatus,
        method: method === 'face' ? 'face' : 'card',
        timeIn: scanTime,
        ...(isCheckout ? { timeOut: scanTime } : {}),
      };
      db.attendance.push(record);
    }

    const effectiveAction: 'in' | 'out' = isCheckout ? 'out' : 'in';
    if (db.settings.whatsappEnabled && db.settings.autoWhatsappOnCheckIn && stu.parentPhone) {
      const tpl =
        db.settings.messageTemplates?.gateCheckIn ||
        'Gate Scan Alert: {student} ({code}) checked {action} at {time} ({date}) via {method}.';
      const msgText = tpl
        .replaceAll('{student}', stu.name)
        .replaceAll('{code}', stu.studentCode)
        .replaceAll('{action}', isCheckout ? 'OUT' : 'IN')
        .replaceAll('{time}', scanTime)
        .replaceAll('{date}', scanDate)
        .replaceAll('{method}', method === 'face' ? 'Face Scan' : 'ID Card');
      appendAutoMessage(db, stu.campusId, 'WhatsApp', `${stu.fatherName} (${stu.parentPhone})`, msgText);
    }

    saveDatabase(db);
    res.json({
      record,
      action: effectiveAction,
      scanType: effectiveAction,
      matchedName: stu.name,
      matchedCode: stu.studentCode,
      roleOrClass: `${stu.className} (${stu.sectionName})`,
      db,
    });
  });

  app.patch('/api/attendance/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body as Partial<AttendanceRecord>;
    const db = loadDatabase();
    const idx = db.attendance.findIndex((a) => a.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Attendance record not found.' });
      return;
    }
    db.attendance[idx] = {
      ...db.attendance[idx],
      ...(updates.status ? { status: updates.status } : {}),
      ...(updates.method ? { method: updates.method } : {}),
      ...(updates.timeIn !== undefined ? { timeIn: updates.timeIn } : {}),
      ...(updates.timeOut !== undefined ? { timeOut: updates.timeOut } : {}),
    };
    saveDatabase(db);
    res.json({ record: db.attendance[idx], db });
  });

  app.delete('/api/attendance/:id', (req, res) => {
    const { id } = req.params;
    const db = loadDatabase();
    const before = db.attendance.length;
    db.attendance = db.attendance.filter((a) => a.id !== id);
    if (db.attendance.length === before) {
      res.status(404).json({ error: 'Attendance record not found.' });
      return;
    }
    saveDatabase(db);
    res.json({ db });
  });

  // Fee Generation & Collection
  app.post('/api/fees/generate', (req, res) => {
    const { campusId, classId, monthKey, monthLabel, feeType, otherCharges, dueDate } = req.body as {
      campusId: string;
      classId: string;
      monthKey: string;
      monthLabel: string;
      feeType: string;
      otherCharges?: number;
      dueDate: string;
    };
    if (!classId || !monthKey || !monthLabel) {
      res.status(400).json({ error: 'Class and billing month are required.' });
      return;
    }
    const db = loadDatabase();
    const targetStudents = db.students.filter(
      (s) =>
        s.status === 'active' &&
        (campusId === 'all' || s.campusId === campusId) &&
        (classId === 'all' || s.classId === classId)
    );
    let createdCount = 0;
    for (const stu of targetStudents) {
      const exists = db.vouchers.some(
        (v) => v.studentId === stu.id && v.monthKey === monthKey && v.feeType === (feeType || 'Monthly Tuition')
      );
      if (exists) continue;
      const calc = calculateVoucherTotal({
        tuitionAmount: stu.monthlyFee,
        otherCharges: Number(otherCharges) || 0,
        discountPercent: stu.discountPercent,
        lateFine: 0,
      });
      const voucher: FeeVoucher = {
        id: makeId('vch'),
        campusId: stu.campusId,
        voucherNo: generateNextVoucherNo(db.vouchers),
        studentId: stu.id,
        studentName: stu.name,
        studentCode: stu.studentCode,
        className: stu.className,
        sectionName: stu.sectionName,
        monthLabel,
        monthKey,
        feeType: feeType || 'Monthly Tuition',
        tuitionAmount: stu.monthlyFee,
        otherCharges: Number(otherCharges) || 0,
        discountAmount: calc.discountAmount,
        lateFine: 0,
        totalAmount: calc.totalAmount,
        paidAmount: 0,
        dueDate: dueDate || `${monthKey}-10`,
        status: 'unpaid',
      };
      db.vouchers.unshift(voucher);
      createdCount += 1;
    }
    saveDatabase(db);
    res.json({ createdCount, db });
  });

  app.post('/api/fees/custom', (req, res) => {
    const { studentId, feeType, amount, monthKey, monthLabel, dueDate } = req.body as {
      studentId: string;
      feeType: string;
      amount: number;
      monthKey: string;
      monthLabel: string;
      dueDate: string;
    };
    const db = loadDatabase();
    const stu = db.students.find((s) => s.id === studentId);
    if (!stu || !feeType?.trim() || !(Number(amount) > 0)) {
      res.status(400).json({ error: 'Student, fee title, and positive amount are required.' });
      return;
    }
    const voucher: FeeVoucher = {
      id: makeId('vch'),
      campusId: stu.campusId,
      voucherNo: generateNextVoucherNo(db.vouchers),
      studentId: stu.id,
      studentName: stu.name,
      studentCode: stu.studentCode,
      className: stu.className,
      sectionName: stu.sectionName,
      monthLabel,
      monthKey,
      feeType: feeType.trim(),
      tuitionAmount: 0,
      otherCharges: Number(amount),
      discountAmount: 0,
      lateFine: 0,
      totalAmount: Number(amount),
      paidAmount: 0,
      dueDate: dueDate || todayIso(),
      status: 'unpaid',
    };
    db.vouchers.unshift(voucher);
    saveDatabase(db);
    res.status(201).json({ voucher, db });
  });

  app.post('/api/fees/:id/pay', (req, res) => {
    const { id } = req.params;
    const { amount, paymentMethod } = req.body as { amount: number; paymentMethod: PaymentMethod };
    const db = loadDatabase();
    const idx = db.vouchers.findIndex((v) => v.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Voucher not found.' });
      return;
    }
    const voucher = db.vouchers[idx];
    const remaining = Math.max(0, voucher.totalAmount - voucher.paidAmount);
    const payAmt = Math.min(remaining, Math.max(0, Number(amount) || remaining));
    if (payAmt <= 0) {
      res.status(400).json({ error: 'Payment amount must be greater than zero.' });
      return;
    }
    const nextPaid = voucher.paidAmount + payAmt;
    const nextStatus = nextPaid >= voucher.totalAmount ? 'paid' : 'partial';
    const paidDate = todayIso();

    db.vouchers[idx] = {
      ...voucher,
      paidAmount: nextPaid,
      paidDate,
      paymentMethod: paymentMethod || 'Cash',
      status: nextStatus,
    };

    const ledgerEntry: LedgerEntry = {
      id: makeId('ldg'),
      campusId: voucher.campusId,
      date: paidDate,
      type: 'income',
      category: 'Fee Collection',
      description: `${voucher.voucherNo} · ${voucher.studentName} (${voucher.feeType})`,
      amount: payAmt,
      paymentMethod: paymentMethod || 'Cash',
      referenceNo: voucher.voucherNo,
    };
    db.ledger.unshift(ledgerEntry);
    if (db.settings.whatsappEnabled && db.settings.autoWhatsappOnFeePaid) {
      const stu = db.students.find((s) => s.id === voucher.studentId);
      if (stu?.parentPhone) {
        appendAutoMessage(
          db,
          voucher.campusId,
          'WhatsApp',
          `${stu.fatherName} (${stu.parentPhone})`,
          `Fee Receipt: Received ${db.settings.currency} ${payAmt.toLocaleString()} against voucher #${voucher.voucherNo} (${voucher.feeType}) for ${voucher.studentName} via ${paymentMethod || 'Cash'}.`
        );
      }
    }
    saveDatabase(db);
    res.json({ voucher: db.vouchers[idx], db });
  });

  app.patch('/api/fees/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body as Partial<FeeVoucher>;
    const db = loadDatabase();
    const idx = db.vouchers.findIndex((v) => v.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Voucher not found.' });
      return;
    }
    const existing = db.vouchers[idx];
    const tuitionAmount = updates.tuitionAmount !== undefined ? Math.max(0, Number(updates.tuitionAmount)) : existing.tuitionAmount;
    const otherCharges = updates.otherCharges !== undefined ? Math.max(0, Number(updates.otherCharges)) : existing.otherCharges;
    const discountAmount = updates.discountAmount !== undefined ? Math.max(0, Number(updates.discountAmount)) : existing.discountAmount;
    const lateFine = updates.lateFine !== undefined ? Math.max(0, Number(updates.lateFine)) : existing.lateFine;
    const totalAmount = Math.max(0, tuitionAmount + otherCharges + lateFine - discountAmount);
    const paidAmount = Math.min(totalAmount, existing.paidAmount);
    const status = paidAmount >= totalAmount && totalAmount > 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';

    db.vouchers[idx] = {
      ...existing,
      feeType: updates.feeType?.trim() || existing.feeType,
      dueDate: updates.dueDate || existing.dueDate,
      tuitionAmount,
      otherCharges,
      discountAmount,
      lateFine,
      totalAmount,
      paidAmount,
      status,
    };
    saveDatabase(db);
    res.json({ voucher: db.vouchers[idx], db });
  });

  app.delete('/api/fees/:id', (req, res) => {
    const { id } = req.params;
    const db = loadDatabase();
    const before = db.vouchers.length;
    db.vouchers = db.vouchers.filter((v) => v.id !== id);
    if (db.vouchers.length === before) {
      res.status(404).json({ error: 'Voucher not found.' });
      return;
    }
    saveDatabase(db);
    res.json({ db });
  });

  // Accounting Ledger
  app.post('/api/ledger', (req, res) => {
    const body = req.body as Partial<LedgerEntry>;
    if (!body.category?.trim() || !body.description?.trim() || !(Number(body.amount) > 0)) {
      res.status(400).json({ error: 'Category, description, and positive amount are required.' });
      return;
    }
    const db = loadDatabase();
    const entry: LedgerEntry = {
      id: makeId('ldg'),
      campusId: body.campusId || 'campus-main',
      date: body.date || todayIso(),
      type: body.type === 'expense' ? 'expense' : 'income',
      category: body.category.trim(),
      description: body.description.trim(),
      amount: Number(body.amount),
      paymentMethod: body.paymentMethod || 'Cash',
      referenceNo: body.referenceNo?.trim() || `REF-${Math.floor(100 + Math.random() * 900)}`,
    };
    db.ledger.unshift(entry);
    saveDatabase(db);
    res.status(201).json({ entry, db });
  });

  app.patch('/api/ledger/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body as Partial<LedgerEntry>;
    const db = loadDatabase();
    const idx = db.ledger.findIndex((l) => l.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Ledger entry not found.' });
      return;
    }
    db.ledger[idx] = {
      ...db.ledger[idx],
      ...updates,
      amount: updates.amount !== undefined ? Math.max(1, Number(updates.amount)) : db.ledger[idx].amount,
    };
    saveDatabase(db);
    res.json({ entry: db.ledger[idx], db });
  });

  app.delete('/api/ledger/:id', (req, res) => {
    const { id } = req.params;
    const db = loadDatabase();
    const before = db.ledger.length;
    db.ledger = db.ledger.filter((l) => l.id !== id);
    if (db.ledger.length === before) {
      res.status(404).json({ error: 'Ledger entry not found.' });
      return;
    }
    saveDatabase(db);
    res.json({ db });
  });

  // Staff & Payroll
  app.post('/api/staff', (req, res) => {
    const body = req.body as Partial<StaffMember>;
    if (!body.name?.trim() || !body.phone?.trim() || !(Number(body.salary) > 0)) {
      res.status(400).json({ error: 'Staff name, phone, and monthly salary are required.' });
      return;
    }
    const db = loadDatabase();
    const staffMember: StaffMember = {
      id: makeId('stf'),
      campusId: body.campusId || 'campus-main',
      employeeCode: `EMP-${101 + db.staff.length}`,
      name: body.name.trim(),
      role: body.role || 'Teacher',
      department: body.department?.trim() || 'Academics',
      gender: body.gender === 'female' ? 'female' : 'male',
      phone: body.phone.trim(),
      email: body.email?.trim() || '',
      cnic: body.cnic?.trim() || '',
      salary: Number(body.salary),
      joiningDate: body.joiningDate || todayIso(),
      status: 'active',
    };
    db.staff.unshift(staffMember);
    saveDatabase(db);
    res.status(201).json({ staffMember, db });
  });

  app.patch('/api/staff/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body as Partial<StaffMember>;
    const db = loadDatabase();
    const idx = db.staff.findIndex((s) => s.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Staff member not found.' });
      return;
    }
    db.staff[idx] = {
      ...db.staff[idx],
      ...updates,
      salary: updates.salary !== undefined ? Math.max(0, Number(updates.salary)) : db.staff[idx].salary,
    };
    saveDatabase(db);
    res.json({ staffMember: db.staff[idx], db });
  });

  app.delete('/api/staff/:id', (req, res) => {
    const { id } = req.params;
    const db = loadDatabase();
    const before = db.staff.length;
    db.staff = db.staff.filter((s) => s.id !== id);
    if (db.staff.length === before) {
      res.status(404).json({ error: 'Staff member not found.' });
      return;
    }
    saveDatabase(db);
    res.json({ db });
  });

  app.post('/api/staff/:id/pay', (req, res) => {
    const { id } = req.params;
    const { monthKey, paymentMethod } = req.body as { monthKey: string; paymentMethod: PaymentMethod };
    const db = loadDatabase();
    const idx = db.staff.findIndex((s) => s.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Staff member not found.' });
      return;
    }
    const staffMember = db.staff[idx];
    db.staff[idx] = { ...staffMember, lastPaidMonth: monthKey };
    db.ledger.unshift({
      id: makeId('ldg'),
      campusId: staffMember.campusId,
      date: todayIso(),
      type: 'expense',
      category: 'Staff Salaries',
      description: `Salary ${monthKey} · ${staffMember.name} (${staffMember.employeeCode})`,
      amount: staffMember.salary,
      paymentMethod: paymentMethod || 'Bank Transfer',
      referenceNo: staffMember.employeeCode,
    });
    saveDatabase(db);
    res.json({ db });
  });

  // Exams & Marks
  app.post('/api/exams', (req, res) => {
    const body = req.body as Partial<Exam>;
    if (!body.title?.trim() || !body.term?.trim()) {
      res.status(400).json({ error: 'Exam title and term are required.' });
      return;
    }
    const db = loadDatabase();
    const exam: Exam = {
      id: makeId('exm'),
      campusId: body.campusId || 'campus-main',
      title: body.title.trim(),
      term: body.term.trim(),
      startDate: body.startDate || todayIso(),
      endDate: body.endDate || todayIso(),
      status: body.status || 'scheduled',
    };
    db.exams.unshift(exam);
    saveDatabase(db);
    res.status(201).json({ exam, db });
  });

  app.patch('/api/exams/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body as Partial<Exam>;
    const db = loadDatabase();
    const idx = db.exams.findIndex((e) => e.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Exam not found.' });
      return;
    }
    db.exams[idx] = { ...db.exams[idx], ...updates };
    saveDatabase(db);
    res.json({ exam: db.exams[idx], db });
  });

  app.delete('/api/exams/:id', (req, res) => {
    const { id } = req.params;
    const db = loadDatabase();
    const before = db.exams.length;
    db.exams = db.exams.filter((e) => e.id !== id);
    if (db.exams.length === before) {
      res.status(404).json({ error: 'Exam not found.' });
      return;
    }
    db.marks = db.marks.filter((m) => m.examId !== id);
    saveDatabase(db);
    res.json({ db });
  });

  app.post('/api/exams/marks', (req, res) => {
    const { examId, subjectId, totalMarks, entries } = req.body as {
      examId: string;
      subjectId: string;
      totalMarks: number;
      entries: Array<{ studentId: string; obtainedMarks: number }>;
    };
    if (!examId || !subjectId || !Array.isArray(entries)) {
      res.status(400).json({ error: 'Exam, subject, and marks entries are required.' });
      return;
    }
    const db = loadDatabase();
    const stuIds = new Set(entries.map((e) => e.studentId));
    db.marks = db.marks.filter(
      (m) => !(m.examId === examId && m.subjectId === subjectId && stuIds.has(m.studentId))
    );
    for (const entry of entries) {
      const mark: ExamMark = {
        id: makeId('mrk'),
        examId,
        subjectId,
        studentId: entry.studentId,
        obtainedMarks: Math.min(totalMarks, Math.max(0, Number(entry.obtainedMarks) || 0)),
        totalMarks,
      };
      db.marks.push(mark);
    }
    const examIdx = db.exams.findIndex((e) => e.id === examId);
    if (examIdx !== -1 && db.exams[examIdx].status === 'scheduled') {
      db.exams[examIdx].status = 'ongoing';
    }
    saveDatabase(db);
    res.json({ db });
  });

  // Operations: Tasks, Leaves, Complaints, Visitors, Notices
  app.post('/api/operations/tasks', (req, res) => {
    const body = req.body as Partial<TaskItem>;
    if (!body.title?.trim() || !body.assignee?.trim()) {
      res.status(400).json({ error: 'Task title and assignee are required.' });
      return;
    }
    const db = loadDatabase();
    const task: TaskItem = {
      id: makeId('tsk'),
      campusId: body.campusId || 'campus-main',
      title: body.title.trim(),
      assignee: body.assignee.trim(),
      dueDate: body.dueDate || todayIso(),
      priority: body.priority || 'medium',
      status: 'pending',
    };
    db.tasks.unshift(task);
    saveDatabase(db);
    res.status(201).json({ task, db });
  });

  app.patch('/api/operations/tasks/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body as Partial<TaskItem>;
    const db = loadDatabase();
    const idx = db.tasks.findIndex((t) => t.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }
    db.tasks[idx] = { ...db.tasks[idx], ...updates };
    saveDatabase(db);
    res.json({ db });
  });

  app.delete('/api/operations/tasks/:id', (req, res) => {
    const { id } = req.params;
    const db = loadDatabase();
    db.tasks = db.tasks.filter((t) => t.id !== id);
    saveDatabase(db);
    res.json({ db });
  });

  app.post('/api/operations/leaves', (req, res) => {
    const authUser = (req as express.Request & { authUser: ServerSessionUser }).authUser;
    const body = req.body as Partial<LeaveRequest>;
    if (!body.applicantName?.trim() || !body.reason?.trim()) {
      res.status(400).json({ error: 'Applicant name and reason are required.' });
      return;
    }
    const db = loadDatabase();
    let applicantName = body.applicantName.trim();
    let applicantType: 'Student' | 'Staff' = body.applicantType === 'Staff' ? 'Staff' : 'Student';
    let classOrRole = body.classOrRole?.trim() || 'General';

    if (authUser.role === 'Parent' || authUser.role === 'Student') {
      const allowedIds = new Set(authUser.linkedStudentIds || (authUser.studentId ? [authUser.studentId] : []));
      const matchedStudent = db.students.find(
        (s) => allowedIds.has(s.id) && s.name.toLowerCase() === applicantName.toLowerCase()
      ) || db.students.find((s) => allowedIds.has(s.id));
      if (!matchedStudent) {
        res.status(403).json({ error: 'You may only submit leave requests for your own enrolled student(s).' });
        return;
      }
      applicantName = matchedStudent.name;
      applicantType = 'Student';
      classOrRole = `${matchedStudent.className} - ${matchedStudent.sectionName}`;
    }

    const leave: LeaveRequest = {
      id: makeId('lev'),
      campusId: body.campusId || 'campus-main',
      applicantName,
      applicantType,
      classOrRole,
      fromDate: body.fromDate || todayIso(),
      toDate: body.toDate || todayIso(),
      reason: body.reason.trim(),
      status: 'pending',
    };
    db.leaves.unshift(leave);
    saveDatabase(db);
    res.status(201).json({ db });
  });

  app.patch('/api/operations/leaves/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body as Partial<LeaveRequest>;
    const db = loadDatabase();
    const idx = db.leaves.findIndex((l) => l.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Leave request not found.' });
      return;
    }
    db.leaves[idx] = { ...db.leaves[idx], ...updates };
    saveDatabase(db);
    res.json({ db });
  });

  app.delete('/api/operations/leaves/:id', (req, res) => {
    const { id } = req.params;
    const db = loadDatabase();
    db.leaves = db.leaves.filter((l) => l.id !== id);
    saveDatabase(db);
    res.json({ db });
  });

  app.post('/api/operations/complaints', (req, res) => {
    const authUser = (req as express.Request & { authUser: ServerSessionUser }).authUser;
    const body = req.body as Partial<ComplaintItem>;
    if (!body.parentName?.trim() || !body.subject?.trim()) {
      res.status(400).json({ error: 'Parent name and subject are required.' });
      return;
    }
    const db = loadDatabase();
    let parentName = body.parentName.trim();
    let studentName = body.studentName?.trim() || 'Student';
    if (authUser.role === 'Parent') {
      parentName = authUser.name;
      const allowedIds = new Set(authUser.linkedStudentIds || []);
      const matchedChild = db.students.find(
        (s) => allowedIds.has(s.id) && s.name.toLowerCase() === studentName.toLowerCase()
      ) || db.students.find((s) => allowedIds.has(s.id));
      if (matchedChild) studentName = matchedChild.name;
    }
    const complaint: ComplaintItem = {
      id: makeId('cmp'),
      campusId: body.campusId || 'campus-main',
      parentName,
      studentName,
      subject: body.subject.trim(),
      description: body.description?.trim() || '',
      submittedDate: todayIso(),
      status: 'open',
    };
    db.complaints.unshift(complaint);
    saveDatabase(db);
    res.status(201).json({ db });
  });

  app.patch('/api/operations/complaints/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body as Partial<ComplaintItem>;
    const db = loadDatabase();
    const idx = db.complaints.findIndex((c) => c.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Complaint not found.' });
      return;
    }
    db.complaints[idx] = { ...db.complaints[idx], ...updates };
    saveDatabase(db);
    res.json({ db });
  });

  app.delete('/api/operations/complaints/:id', (req, res) => {
    const { id } = req.params;
    const db = loadDatabase();
    db.complaints = db.complaints.filter((c) => c.id !== id);
    saveDatabase(db);
    res.json({ db });
  });

  app.post('/api/operations/visitors', (req, res) => {
    const body = req.body as Partial<VisitorLog>;
    if (!body.visitorName?.trim() || !body.purpose?.trim()) {
      res.status(400).json({ error: 'Visitor name and purpose are required.' });
      return;
    }
    const db = loadDatabase();
    const nowTime = new Date().toTimeString().slice(0, 5);
    const visitor: VisitorLog = {
      id: makeId('vis'),
      campusId: body.campusId || 'campus-main',
      visitorName: body.visitorName.trim(),
      phone: body.phone?.trim() || '',
      cnic: body.cnic?.trim() || '',
      purpose: body.purpose.trim(),
      meetingWith: body.meetingWith?.trim() || 'Admin Office',
      date: todayIso(),
      inTime: body.inTime || nowTime,
    };
    db.visitors.unshift(visitor);
    saveDatabase(db);
    res.status(201).json({ db });
  });

  app.patch('/api/operations/visitors/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body as Partial<VisitorLog>;
    const db = loadDatabase();
    const idx = db.visitors.findIndex((v) => v.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Visitor not found.' });
      return;
    }
    db.visitors[idx] = { ...db.visitors[idx], ...updates };
    saveDatabase(db);
    res.json({ db });
  });

  app.delete('/api/operations/visitors/:id', (req, res) => {
    const { id } = req.params;
    const db = loadDatabase();
    db.visitors = db.visitors.filter((v) => v.id !== id);
    saveDatabase(db);
    res.json({ db });
  });

  app.patch('/api/operations/visitors/:id/checkout', (req, res) => {
    const { id } = req.params;
    const db = loadDatabase();
    const idx = db.visitors.findIndex((v) => v.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Visitor not found.' });
      return;
    }
    db.visitors[idx].outTime = new Date().toTimeString().slice(0, 5);
    saveDatabase(db);
    res.json({ db });
  });

  app.post('/api/operations/notices', (req, res) => {
    const body = req.body as Partial<NoticeItem>;
    if (!body.title?.trim() || !body.body?.trim()) {
      res.status(400).json({ error: 'Notice title and message body are required.' });
      return;
    }
    const db = loadDatabase();
    const notice: NoticeItem = {
      id: makeId('not'),
      campusId: body.campusId || 'campus-main',
      title: body.title.trim(),
      audience: body.audience || 'All',
      date: todayIso(),
      body: body.body.trim(),
    };
    db.notices.unshift(notice);
    saveDatabase(db);
    res.status(201).json({ db });
  });

  app.patch('/api/operations/notices/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body as Partial<NoticeItem>;
    const db = loadDatabase();
    const idx = db.notices.findIndex((n) => n.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Notice not found.' });
      return;
    }
    db.notices[idx] = { ...db.notices[idx], ...updates };
    saveDatabase(db);
    res.json({ db });
  });

  app.delete('/api/operations/notices/:id', (req, res) => {
    const { id } = req.params;
    const db = loadDatabase();
    db.notices = db.notices.filter((n) => n.id !== id);
    saveDatabase(db);
    res.json({ db });
  });

  // Generic CRUD for Extended Modules (Timetable, Homework, Health, Inventory, Library, Transport, Hostel, Messaging, Calendar, PTM)
  const MODULE_COLLECTIONS = [
    'timetable',
    'homework',
    'healthRecords',
    'inventory',
    'libraryBooks',
    'transportRoutes',
    'hostelRooms',
    'messageLogs',
    'calendarEvents',
    'ptmSchedules',
  ] as const;

  type ModuleCollection = (typeof MODULE_COLLECTIONS)[number];

  function isModuleCollection(val: string): val is ModuleCollection {
    return (MODULE_COLLECTIONS as readonly string[]).includes(val);
  }

  app.post('/api/modules/:collection', (req, res) => {
    const { collection } = req.params;
    if (!isModuleCollection(collection)) {
      res.status(400).json({ error: 'Unsupported module collection.' });
      return;
    }
    const db = loadDatabase();
    const payload = (req.body || {}) as Record<string, unknown>;
    const item = {
      ...payload,
      id: makeId(collection.slice(0, 3)),
      campusId: typeof payload.campusId === 'string' && payload.campusId ? payload.campusId : 'campus-main',
    };
    (db[collection] as unknown as Array<Record<string, unknown>>).unshift(item);
    if (collection === 'messageLogs' && payload.channel === 'WhatsApp' && db.settings.whatsappLeft > 0) {
      db.settings.whatsappLeft = Math.max(0, db.settings.whatsappLeft - 1);
    }
    saveDatabase(db);
    res.status(201).json({ item, db });
  });

  app.patch('/api/modules/:collection/:id', (req, res) => {
    const { collection, id } = req.params;
    if (!isModuleCollection(collection)) {
      res.status(400).json({ error: 'Unsupported module collection.' });
      return;
    }
    const db = loadDatabase();
    const list = db[collection] as unknown as Array<Record<string, unknown> & { id: string }>;
    const idx = list.findIndex((item) => item.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Record not found.' });
      return;
    }
    list[idx] = { ...list[idx], ...(req.body as Record<string, unknown>), id };
    saveDatabase(db);
    res.json({ item: list[idx], db });
  });

  app.delete('/api/modules/:collection/:id', (req, res) => {
    const { collection, id } = req.params;
    if (!isModuleCollection(collection)) {
      res.status(400).json({ error: 'Unsupported module collection.' });
      return;
    }
    const db = loadDatabase();
    const list = db[collection] as Array<{ id: string }>;
    const filtered = list.filter((item) => item.id !== id);
    if (filtered.length === list.length) {
      res.status(404).json({ error: 'Record not found.' });
      return;
    }
    (db[collection] as Array<{ id: string }>) = filtered;
    saveDatabase(db);
    res.json({ db });
  });

  // Settings & Campuses
  app.patch('/api/settings', (req, res) => {
    const updates = req.body as Partial<ErpDatabase['settings']>;
    const db = loadDatabase();
    db.settings = {
      ...db.settings,
      ...updates,
      messageTemplates: updates.messageTemplates
        ? { ...(db.settings.messageTemplates ?? {}), ...updates.messageTemplates }
        : db.settings.messageTemplates,
    };
    saveDatabase(db);
    res.json({ db });
  });

  app.post('/api/settings/test-message', (req, res) => {
    const { channel, phone, message } = req.body as {
      channel?: 'WhatsApp' | 'SMS';
      phone?: string;
      message?: string;
    };
    const db = loadDatabase();
    const ch = channel === 'SMS' ? 'SMS' : 'WhatsApp';
    if (ch === 'WhatsApp' && db.settings.whatsappEnabled === false) {
      res.status(400).json({ error: 'WhatsApp Gateway is currently disabled in Settings.' });
      return;
    }
    if (ch === 'SMS' && db.settings.smsEnabled === false) {
      res.status(400).json({ error: 'SMS Gateway is currently disabled in Settings.' });
      return;
    }
    const targetPhone = (phone || db.settings.phone || '+92 300 0000000').trim();
    const msgText =
      (message || '').trim() ||
      `Gateway Test (${ch}) from ${db.settings.schoolName} via ${
        ch === 'WhatsApp' ? db.settings.whatsappProvider || 'Cloud API' : db.settings.smsSenderId || 'IQRA-SCH'
      } succeeded.`;
    appendAutoMessage(db, db.campuses[0]?.id || 'campus-main', ch, targetPhone, msgText);
    saveDatabase(db);
    res.json({ ok: true, db });
  });

  app.post('/api/campuses', (req, res) => {
    const { name, city, address, phone } = req.body as {
      name: string;
      city: string;
      address: string;
      phone: string;
    };
    if (!name?.trim()) {
      res.status(400).json({ error: 'Campus name is required.' });
      return;
    }
    const db = loadDatabase();
    db.campuses.push({
      id: makeId('campus'),
      name: name.trim(),
      code: `CMP-${db.campuses.length + 1}`,
      city: city?.trim() || 'Karachi',
      address: address?.trim() || '',
      phone: phone?.trim() || '',
      isMain: false,
    });
    saveDatabase(db);
    res.status(201).json({ db });
  });

  app.patch('/api/campuses/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body as Partial<{ name: string; city: string; address: string; phone: string }>;
    const db = loadDatabase();
    const idx = db.campuses.findIndex((c) => c.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Campus not found.' });
      return;
    }
    db.campuses[idx] = { ...db.campuses[idx], ...updates };
    saveDatabase(db);
    res.json({ campus: db.campuses[idx], db });
  });

  app.delete('/api/campuses/:id', (req, res) => {
    const { id } = req.params;
    const db = loadDatabase();
    const target = db.campuses.find((c) => c.id === id);
    if (!target) {
      res.status(404).json({ error: 'Campus not found.' });
      return;
    }
    if (target.isMain || db.campuses.length <= 1) {
      res.status(400).json({ error: 'Main campus cannot be deleted.' });
      return;
    }
    db.campuses = db.campuses.filter((c) => c.id !== id);
    saveDatabase(db);
    res.json({ db });
  });

  // Vite dev middleware or production static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`School ERP server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
