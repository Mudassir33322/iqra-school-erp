export type StudentStatus = 'active' | 'deactivated' | 'withdrawn';
export type Gender = 'male' | 'female';
export type AttendanceStatus = 'present' | 'absent' | 'leave' | 'late';
export type VoucherStatus = 'paid' | 'unpaid' | 'partial';
export type PaymentMethod = 'Cash' | 'Bank Transfer' | 'JazzCash' | 'Easypaisa';
export type TaskStatus = 'pending' | 'processing' | 'completed' | 'returned';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';
export type ComplaintStatus = 'open' | 'in_review' | 'resolved';
export type InquiryStatus = 'new' | 'contacted' | 'approved' | 'rejected';
export type DashboardPeriod = 'today' | 'week' | 'month' | 'session' | 'custom';

export interface Campus {
  id: string;
  name: string;
  code: string;
  city: string;
  address: string;
  phone: string;
  isMain: boolean;
}

export interface ClassSection {
  id: string;
  campusId: string;
  className: string;
  sectionName: string;
  monthlyFee: number;
  classTeacherId: string;
  room: string;
  capacity: number;
}

export interface Subject {
  id: string;
  campusId: string;
  name: string;
  code: string;
  className: string;
  teacherId: string;
  totalMarks: number;
  syllabusProgress: number;
}

export type UserRole =
  | 'Admin'
  | 'Teacher'
  | 'Coordinator'
  | 'Accountant'
  | 'Front Desk'
  | 'Librarian'
  | 'Driver'
  | 'Parent'
  | 'Student';

export interface ParentAccount {
  id: string;
  campusId: string;
  name: string;
  phone: string;
  email: string;
  cnic: string;
  address: string;
  occupation?: string;
}

export interface Student {
  id: string;
  campusId: string;
  parentId?: string;
  studentCode: string;
  rollNo: string;
  name: string;
  fatherName: string;
  gender: Gender;
  dob: string;
  classId: string;
  className: string;
  sectionName: string;
  parentPhone: string;
  parentEmail: string;
  parentCnic: string;
  bFormNo?: string;
  bloodGroup?: string;
  emergencyPhone?: string;
  previousSchool?: string;
  address: string;
  monthlyFee: number;
  discountPercent: number;
  admissionDate: string;
  status: StudentStatus;
  faceEnrolled?: boolean;
  faceEnrolledAt?: string;
  faceAvatar?: string;
  faceDescriptor?: number[];
}

export interface StaffMember {
  id: string;
  campusId: string;
  employeeCode: string;
  name: string;
  role: 'Teacher' | 'Coordinator' | 'Accountant' | 'Front Desk' | 'Admin' | 'Librarian' | 'Driver';
  department: string;
  gender: Gender;
  phone: string;
  email: string;
  cnic: string;
  salary: number;
  joiningDate: string;
  status: 'active' | 'inactive';
  lastPaidMonth?: string;
  faceEnrolled?: boolean;
  faceEnrolledAt?: string;
  faceAvatar?: string;
  faceDescriptor?: number[];
}

export interface AttendanceRecord {
  id: string;
  campusId: string;
  date: string; // YYYY-MM-DD
  targetType: 'student' | 'staff';
  targetId: string;
  classId?: string;
  status: AttendanceStatus;
  method?: 'manual' | 'face' | 'card';
  timeIn?: string;
  timeOut?: string;
}

export interface FeeVoucher {
  id: string;
  campusId: string;
  voucherNo: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  className: string;
  sectionName: string;
  monthLabel: string;
  monthKey: string;
  feeType: string;
  tuitionAmount: number;
  otherCharges: number;
  discountAmount: number;
  lateFine: number;
  totalAmount: number;
  paidAmount: number;
  dueDate: string;
  paidDate?: string;
  paymentMethod?: PaymentMethod;
  status: VoucherStatus;
}

export interface LedgerEntry {
  id: string;
  campusId: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNo?: string;
}

export interface Exam {
  id: string;
  campusId: string;
  title: string;
  term: string;
  startDate: string;
  endDate: string;
  status: 'scheduled' | 'ongoing' | 'published';
}

export interface ExamMark {
  id: string;
  examId: string;
  studentId: string;
  subjectId: string;
  obtainedMarks: number;
  totalMarks: number;
}

export interface AdmissionInquiry {
  id: string;
  campusId: string;
  applicantName: string;
  fatherName: string;
  appliedClass: string;
  gender: Gender;
  dob: string;
  phone: string;
  email: string;
  parentCnic?: string;
  bFormNo?: string;
  address?: string;
  notes?: string;
  previousSchool: string;
  appliedDate: string;
  status: InquiryStatus;
  enrolledStudentId?: string;
  enrolledStudentCode?: string;
}

export interface TaskItem {
  id: string;
  campusId: string;
  title: string;
  assignee: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  status: TaskStatus;
}

export interface LeaveRequest {
  id: string;
  campusId: string;
  applicantName: string;
  applicantType: 'Student' | 'Staff';
  classOrRole: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: LeaveStatus;
}

export interface ComplaintItem {
  id: string;
  campusId: string;
  parentName: string;
  studentName: string;
  subject: string;
  description: string;
  submittedDate: string;
  status: ComplaintStatus;
}

export interface VisitorLog {
  id: string;
  campusId: string;
  visitorName: string;
  phone: string;
  cnic: string;
  purpose: string;
  meetingWith: string;
  date: string;
  inTime: string;
  outTime?: string;
}

export interface NoticeItem {
  id: string;
  campusId: string;
  title: string;
  audience: 'All' | 'Parents' | 'Staff' | 'Students';
  date: string;
  body: string;
}

export interface TimetableSlot {
  id: string;
  campusId: string;
  className: string;
  day: string;
  timeSlot: string;
  subject: string;
  teacherName: string;
  room: string;
}

export interface HomeworkItem {
  id: string;
  campusId: string;
  className: string;
  subject: string;
  title: string;
  dueDate: string;
  assignedBy: string;
}

export interface HealthRecord {
  id: string;
  campusId: string;
  studentName: string;
  studentCode: string;
  bloodGroup: string;
  conditionOrAllergy: string;
  lastCheckup: string;
  notes: string;
}

export interface InventoryItem {
  id: string;
  campusId: string;
  sku: string;
  name: string;
  category: string;
  stockQty: number;
  unitPrice: number;
}

export interface LibraryBook {
  id: string;
  campusId: string;
  isbn: string;
  title: string;
  author: string;
  copiesAvailable: number;
  issuedTo?: string;
  status: 'available' | 'issued';
}

export interface TransportRoute {
  id: string;
  campusId: string;
  vehicleNo: string;
  routeName: string;
  driverName: string;
  driverPhone: string;
  monthlyFare: number;
  ridersCount: number;
}

export interface HostelRoom {
  id: string;
  campusId: string;
  roomNo: string;
  wing: string;
  capacity: number;
  occupied: number;
  monthlyFee: number;
}

export interface MessageLog {
  id: string;
  campusId: string;
  channel: 'SMS' | 'WhatsApp' | 'Email';
  recipient: string;
  message: string;
  sentAt: string;
  status: 'Delivered' | 'Queued';
}

export type CalendarEventCategory = 'Holiday' | 'Exam' | 'PTM' | 'Event' | 'Sports';

export interface CalendarEvent {
  id: string;
  campusId: string;
  title: string;
  category: CalendarEventCategory;
  startDate: string;
  endDate: string;
  audience: 'All' | 'Students' | 'Parents' | 'Staff';
  description: string;
}

export interface PtmSchedule {
  id: string;
  campusId: string;
  title: string;
  className: string;
  teacherName: string;
  date: string;
  timeSlot: string;
  venue: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
}

export interface MessageTemplates {
  feeReminder: string;
  absentAlert: string;
  gateCheckIn: string;
  examPublished: string;
}

export type UiLanguage = 'en' | 'ur' | 'ar' | 'fr' | 'es' | 'id';
export type UiFontFamily = 'poppins' | 'jakarta' | 'inter' | 'nunito' | 'dm-sans';
export type UiThemeMode = 'light' | 'dark' | 'auto';
export type UiTextSize = 'sm' | 'md' | 'lg' | 'xl';
export type UiSpacing = 'compact' | 'comfy' | 'roomy';
export type UiBackgroundStyle = 'soft' | 'aurora' | 'plain' | 'dotted' | 'sunset' | 'mint';
export type UiNavColor = 'cream' | 'coloured';

export interface UiPreferences {
  themeMode: UiThemeMode;
  language: UiLanguage;
  accentColor: string;
  fontFamily: UiFontFamily;
  textSize: UiTextSize;
  spacing: UiSpacing;
  cornerRoundness: number;
  glassEffect: boolean;
  backgroundStyle: UiBackgroundStyle;
  navColor: UiNavColor;
  updatedAt?: string;
}

export interface WebsiteGalleryItem {
  id: string;
  title: string;
  category: string;
  caption: string;
  visible: boolean;
}

export interface WebsiteConfig {
  heroHeadline: string;
  heroSubheadline: string;
  aboutSchool: string;
  admissionsOpenBanner: boolean;
  visibleClasses: string[];
  mapAddressLabel: string;
  mapCoordinates: string;
  visitingHours: string;
  galleryItems: WebsiteGalleryItem[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  method: string;
  path: string;
  summary: string;
}

export interface LoginLogEntry {
  id: string;
  timestamp: string;
  userName: string;
  email: string;
  role: UserRole;
  deviceLabel: string;
  status: 'Success' | 'Failed';
}

export interface SchoolSettings {
  schoolName: string;
  shortCode: string;
  sessionName: string;
  packageName: string;
  daysLeft: number;
  studentLimit: number;
  maxCampuses: number;
  whatsappLeft: number;
  phone: string;
  email: string;
  address: string;
  currency: string;
  lateFeeAmount: number;
  checklistDismissed: boolean;
  renewalBannerDismissed?: boolean;
  principalName?: string;
  tagline?: string;
  website?: string;
  whatsappEnabled?: boolean;
  whatsappProvider?: 'EasySchoolin Cloud' | 'Meta Cloud API' | 'Twilio WhatsApp' | 'Custom Webhook';
  whatsappApiKey?: string;
  whatsappSenderNumber?: string;
  smsEnabled?: boolean;
  smsSenderId?: string;
  smsApiKey?: string;
  emailEnabled?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpFromEmail?: string;
  onlinePaymentsEnabled?: boolean;
  bankAccountTitle?: string;
  bankIban?: string;
  jazzcashMerchantId?: string;
  easypaisaStoreId?: string;
  examPassPercentage?: number;
  examGradingLabel?: string;
  thermalPrinterWidth?: '58mm' | '80mm';
  thermalAutoPrintReceipt?: boolean;
  thermalHeaderNote?: string;
  autoWhatsappOnFeePaid?: boolean;
  autoWhatsappOnAbsent?: boolean;
  autoWhatsappOnCheckIn?: boolean;
  autoSmsOnInquiry?: boolean;
  schoolStartTime?: string;
  lateCutoffTime?: string;
  feeDueDay?: number;
  receiptFooterNote?: string;
  biometricDeviceKey?: string;
  messageTemplates?: MessageTemplates;
  websiteConfig?: WebsiteConfig;
}

export interface ErpDatabase {
  settings: SchoolSettings;
  campuses: Campus[];
  classes: ClassSection[];
  subjects: Subject[];
  parents: ParentAccount[];
  students: Student[];
  staff: StaffMember[];
  attendance: AttendanceRecord[];
  vouchers: FeeVoucher[];
  ledger: LedgerEntry[];
  exams: Exam[];
  marks: ExamMark[];
  inquiries: AdmissionInquiry[];
  tasks: TaskItem[];
  leaves: LeaveRequest[];
  complaints: ComplaintItem[];
  visitors: VisitorLog[];
  notices: NoticeItem[];
  timetable: TimetableSlot[];
  homework: HomeworkItem[];
  healthRecords: HealthRecord[];
  inventory: InventoryItem[];
  libraryBooks: LibraryBook[];
  transportRoutes: TransportRoute[];
  hostelRooms: HostelRoom[];
  messageLogs: MessageLog[];
  calendarEvents: CalendarEvent[];
  ptmSchedules: PtmSchedule[];
  userPreferences?: Record<string, UiPreferences>;
  auditLogs?: AuditLogEntry[];
  loginLogs?: LoginLogEntry[];
}

export type AppPageId =
  | 'dashboard'
  | 'today-activity'
  | 'visitors'
  | 'admissions'
  | 'students'
  | 'parents'
  | 'staff'
  | 'accountants'
  | 'complaints'
  | 'leaves'
  | 'tasks'
  | 'health'
  | 'id-cards'
  | 'classes'
  | 'subjects'
  | 'ptm'
  | 'attendance'
  | 'face-attendance'
  | 'card-attendance'
  | 'staff-attendance'
  | 'timetable'
  | 'calendar'
  | 'homework'
  | 'fees'
  | 'accounting'
  | 'expenses'
  | 'reports'
  | 'inventory'
  | 'exams'
  | 'certification'
  | 'noticeboard'
  | 'messaging'
  | 'library'
  | 'transport'
  | 'hostel'
  | 'website'
  | 'system-tools'
  | 'settings';
