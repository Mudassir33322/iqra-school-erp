import React, { useEffect, useState } from 'react';
import {
  Building2,
  Clock,
  CreditCard,
  FileSpreadsheet,
  KeyRound,
  Mail,
  MessageSquare,
  Pencil,
  Printer,
  RotateCcw,
  Save,
  ScanFace,
  Send,
  Settings,
  ShieldCheck,
  Sliders,
  Trash2,
  X,
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import type { Campus, SchoolSettings, UserRole } from '../types/erp';
import { ROLE_PERMISSIONS } from '../utils/rbac';

const ALL_PORTAL_ROLES: Array<{
  role: UserRole;
  identifier: string;
  scope: string;
}> = [
  { role: 'Admin', identifier: 'muhammadmudassir33322@gmail.com', scope: 'Full multi-campus ERP control, setup & reset' },
  { role: 'Coordinator', identifier: 'zoya.coord@iqraschool.edu.pk', scope: 'Admissions, students, academics, exams & operations' },
  { role: 'Teacher', identifier: 'ayesha@iqraschool.edu.pk', scope: 'Assigned classes, attendance, syllabus, homework & marks' },
  { role: 'Accountant', identifier: 'accounts@iqraschool.edu.pk', scope: 'Fee vouchers, collections, ledger, payroll & inventory' },
  { role: 'Front Desk', identifier: 'frontdesk@iqraschool.edu.pk', scope: 'Admissions, visitors, notices, PTM & calendar' },
  { role: 'Librarian', identifier: 'library@iqraschool.edu.pk', scope: 'Library catalog, ISBN tracking & book issue/return' },
  { role: 'Driver', identifier: 'driver@iqraschool.edu.pk', scope: 'Assigned transport routes, riders & van schedules' },
  { role: 'Parent', identifier: 'tariq.aziz@mail.com', scope: 'Multi-child switcher, family challans, marks, attendance & leave' },
  { role: 'Student', identifier: 'ST-1001', scope: 'Own timetable, homework, marksheets, attendance & admit card' },
];

type SettingsTab =
  | 'profile'
  | 'messaging'
  | 'email'
  | 'rules'
  | 'payments'
  | 'exams'
  | 'printer'
  | 'campuses'
  | 'rbac';

export const SettingsView: React.FC = () => {
  const { db, mutate, notify, canPerform, activeSubTab } = useErp();
  const canManageSettings = canPerform('manage_settings');

  const resolveTabFromSub = (sub: string | null): SettingsTab => {
    if (!sub) return 'profile';
    if (sub === 'whatsapp' || sub === 'sms' || sub === 'messaging') return 'messaging';
    if (sub === 'email') return 'email';
    if (sub === 'automation' || sub === 'biometric' || sub === 'rules') return 'rules';
    if (sub === 'payments') return 'payments';
    if (sub === 'exams') return 'exams';
    if (sub === 'printer') return 'printer';
    if (sub === 'campuses') return 'campuses';
    if (sub === 'rbac') return 'rbac';
    return 'profile';
  };

  const [activeTab, setActiveTab] = useState<SettingsTab>(() => resolveTabFromSub(activeSubTab));

  useEffect(() => {
    if (activeSubTab) {
      setActiveTab(resolveTabFromSub(activeSubTab));
    }
  }, [activeSubTab]);

  // Institution & Letterhead
  const [schoolName, setSchoolName] = useState(db?.settings.schoolName || 'iqra school');
  const [shortCode, setShortCode] = useState(db?.settings.shortCode || 'IS');
  const [sessionName, setSessionName] = useState(db?.settings.sessionName || '2026-2027');
  const [principalName, setPrincipalName] = useState(db?.settings.principalName || '');
  const [tagline, setTagline] = useState(db?.settings.tagline || '');
  const [phone, setPhone] = useState(db?.settings.phone || '');
  const [email, setEmail] = useState(db?.settings.email || '');
  const [website, setWebsite] = useState(db?.settings.website || '');
  const [address, setAddress] = useState(db?.settings.address || '');
  const [receiptFooterNote, setReceiptFooterNote] = useState(db?.settings.receiptFooterNote || '');

  // WhatsApp & SMS Gateway
  const [whatsappEnabled, setWhatsappEnabled] = useState(db?.settings.whatsappEnabled ?? true);
  const [whatsappProvider, setWhatsappProvider] = useState<NonNullable<SchoolSettings['whatsappProvider']>>(
    db?.settings.whatsappProvider || 'EasySchoolin Cloud'
  );
  const [whatsappApiKey, setWhatsappApiKey] = useState(db?.settings.whatsappApiKey || '');
  const [whatsappSenderNumber, setWhatsappSenderNumber] = useState(db?.settings.whatsappSenderNumber || '');
  const [smsEnabled, setSmsEnabled] = useState(db?.settings.smsEnabled ?? true);
  const [smsSenderId, setSmsSenderId] = useState(db?.settings.smsSenderId || 'IQRA-SCH');
  const [smsApiKey, setSmsApiKey] = useState(db?.settings.smsApiKey || '');
  const [autoWhatsappOnFeePaid, setAutoWhatsappOnFeePaid] = useState(db?.settings.autoWhatsappOnFeePaid ?? true);
  const [autoWhatsappOnAbsent, setAutoWhatsappOnAbsent] = useState(db?.settings.autoWhatsappOnAbsent ?? true);
  const [autoWhatsappOnCheckIn, setAutoWhatsappOnCheckIn] = useState(db?.settings.autoWhatsappOnCheckIn ?? true);
  const [autoSmsOnInquiry, setAutoSmsOnInquiry] = useState(db?.settings.autoSmsOnInquiry ?? true);

  const [tplFeeReminder, setTplFeeReminder] = useState(db?.settings.messageTemplates?.feeReminder || '');
  const [tplAbsentAlert, setTplAbsentAlert] = useState(db?.settings.messageTemplates?.absentAlert || '');
  const [tplGateCheckIn, setTplGateCheckIn] = useState(db?.settings.messageTemplates?.gateCheckIn || '');
  const [tplExamPublished, setTplExamPublished] = useState(db?.settings.messageTemplates?.examPublished || '');

  // Test Gateway state
  const [testChannel, setTestChannel] = useState<'WhatsApp' | 'SMS'>('WhatsApp');
  const [testPhone, setTestPhone] = useState(db?.settings.phone || '+92 300 3451209');
  const [testBody, setTestBody] = useState('');

  // Attendance & Fee Rules
  const [schoolStartTime, setSchoolStartTime] = useState(db?.settings.schoolStartTime || '08:00');
  const [lateCutoffTime, setLateCutoffTime] = useState(db?.settings.lateCutoffTime || '08:15');
  const [feeDueDay, setFeeDueDay] = useState(String(db?.settings.feeDueDay ?? 10));
  const [lateFeeAmount, setLateFeeAmount] = useState(String(db?.settings.lateFeeAmount ?? 500));
  const [currency, setCurrency] = useState(db?.settings.currency || 'Rs');
  const [biometricDeviceKey, setBiometricDeviceKey] = useState(db?.settings.biometricDeviceKey || 'IQRA-GATE-KEY-2026');

  // Email SMTP, Online Payments, Exam Grading & Thermal Printer
  const [emailEnabled, setEmailEnabled] = useState(db?.settings.emailEnabled ?? true);
  const [smtpHost, setSmtpHost] = useState(db?.settings.smtpHost || 'smtp.iqraschool.edu.pk');
  const [smtpPort, setSmtpPort] = useState(String(db?.settings.smtpPort ?? 587));
  const [smtpFromEmail, setSmtpFromEmail] = useState(db?.settings.smtpFromEmail || 'noreply@iqraschool.edu.pk');

  const [onlinePaymentsEnabled, setOnlinePaymentsEnabled] = useState(db?.settings.onlinePaymentsEnabled ?? true);
  const [bankAccountTitle, setBankAccountTitle] = useState(db?.settings.bankAccountTitle || 'Iqra School System');
  const [bankIban, setBankIban] = useState(db?.settings.bankIban || 'PK36MEZN0002140104558891');
  const [jazzcashMerchantId, setJazzcashMerchantId] = useState(db?.settings.jazzcashMerchantId || 'MC-IQRA-4410');
  const [easypaisaStoreId, setEasypaisaStoreId] = useState(db?.settings.easypaisaStoreId || 'EP-IQRA-8821');

  const [examPassPercentage, setExamPassPercentage] = useState(String(db?.settings.examPassPercentage ?? 40));
  const [examGradingLabel, setExamGradingLabel] = useState(
    db?.settings.examGradingLabel || 'A+ (>=90%), A (>=80%), B (>=70%), C (>=60%), D (>=40%), F (<40%)'
  );

  const [thermalPrinterWidth, setThermalPrinterWidth] = useState<'58mm' | '80mm'>(
    db?.settings.thermalPrinterWidth || '80mm'
  );
  const [thermalAutoPrintReceipt, setThermalAutoPrintReceipt] = useState(
    db?.settings.thermalAutoPrintReceipt ?? false
  );
  const [thermalHeaderNote, setThermalHeaderNote] = useState(
    db?.settings.thermalHeaderNote || 'Paid Fee Receipt — Non-Refundable'
  );

  // Campuses
  const [campusName, setCampusName] = useState('');
  const [campusAddress, setCampusAddress] = useState('');
  const [editingCampus, setEditingCampus] = useState<Campus | null>(null);

  useEffect(() => {
    if (!db) return;
    const s = db.settings;
    setSchoolName(s.schoolName || '');
    setShortCode(s.shortCode || 'IS');
    setSessionName(s.sessionName || '');
    setPrincipalName(s.principalName || '');
    setTagline(s.tagline || '');
    setPhone(s.phone || '');
    setEmail(s.email || '');
    setWebsite(s.website || '');
    setAddress(s.address || '');
    setReceiptFooterNote(s.receiptFooterNote || '');
    setWhatsappEnabled(s.whatsappEnabled ?? true);
    setWhatsappProvider(s.whatsappProvider || 'EasySchoolin Cloud');
    setWhatsappApiKey(s.whatsappApiKey || '');
    setWhatsappSenderNumber(s.whatsappSenderNumber || '');
    setSmsEnabled(s.smsEnabled ?? true);
    setSmsSenderId(s.smsSenderId || 'IQRA-SCH');
    setSmsApiKey(s.smsApiKey || '');
    setAutoWhatsappOnFeePaid(s.autoWhatsappOnFeePaid ?? true);
    setAutoWhatsappOnAbsent(s.autoWhatsappOnAbsent ?? true);
    setAutoWhatsappOnCheckIn(s.autoWhatsappOnCheckIn ?? true);
    setAutoSmsOnInquiry(s.autoSmsOnInquiry ?? true);
    setTplFeeReminder(s.messageTemplates?.feeReminder || '');
    setTplAbsentAlert(s.messageTemplates?.absentAlert || '');
    setTplGateCheckIn(s.messageTemplates?.gateCheckIn || '');
    setTplExamPublished(s.messageTemplates?.examPublished || '');
    setSchoolStartTime(s.schoolStartTime || '08:00');
    setLateCutoffTime(s.lateCutoffTime || '08:15');
    setFeeDueDay(String(s.feeDueDay ?? 10));
    setLateFeeAmount(String(s.lateFeeAmount ?? 500));
    setCurrency(s.currency || 'Rs');
    setBiometricDeviceKey(s.biometricDeviceKey || 'IQRA-GATE-KEY-2026');
    setEmailEnabled(s.emailEnabled ?? true);
    setSmtpHost(s.smtpHost || 'smtp.iqraschool.edu.pk');
    setSmtpPort(String(s.smtpPort ?? 587));
    setSmtpFromEmail(s.smtpFromEmail || 'noreply@iqraschool.edu.pk');
    setOnlinePaymentsEnabled(s.onlinePaymentsEnabled ?? true);
    setBankAccountTitle(s.bankAccountTitle || 'Iqra School System');
    setBankIban(s.bankIban || 'PK36MEZN0002140104558891');
    setJazzcashMerchantId(s.jazzcashMerchantId || 'MC-IQRA-4410');
    setEasypaisaStoreId(s.easypaisaStoreId || 'EP-IQRA-8821');
    setExamPassPercentage(String(s.examPassPercentage ?? 40));
    setExamGradingLabel(
      s.examGradingLabel || 'A+ (>=90%), A (>=80%), B (>=70%), C (>=60%), D (>=40%), F (<40%)'
    );
    setThermalPrinterWidth(s.thermalPrinterWidth || '80mm');
    setThermalAutoPrintReceipt(s.thermalAutoPrintReceipt ?? false);
    setThermalHeaderNote(s.thermalHeaderNote || 'Paid Fee Receipt — Non-Refundable');
  }, [db]);

  if (!db) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageSettings) return;
    await mutate(
      '/api/settings',
      'PATCH',
      {
        schoolName,
        shortCode,
        sessionName,
        principalName,
        tagline,
        phone,
        email,
        website,
        address,
        receiptFooterNote,
      },
      'Saved school profile & print letterhead settings.'
    );
  };

  const handleSaveMessaging = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageSettings) return;
    await mutate(
      '/api/settings',
      'PATCH',
      {
        whatsappEnabled,
        whatsappProvider,
        whatsappApiKey,
        whatsappSenderNumber,
        smsEnabled,
        smsSenderId,
        smsApiKey,
        autoWhatsappOnFeePaid,
        autoWhatsappOnAbsent,
        autoWhatsappOnCheckIn,
        autoSmsOnInquiry,
        messageTemplates: {
          feeReminder: tplFeeReminder,
          absentAlert: tplAbsentAlert,
          gateCheckIn: tplGateCheckIn,
          examPublished: tplExamPublished,
        },
      },
      'Saved WhatsApp, SMS Gateway & automation rules.'
    );
  };

  const handleSendTestGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageSettings) return;
    const res = await mutate(
      '/api/settings/test-message',
      'POST',
      { channel: testChannel, phone: testPhone, message: testBody },
      `Test ${testChannel} message dispatched & logged.`
    );
    if (res.ok) setTestBody('');
  };

  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageSettings) return;
    await mutate(
      '/api/settings',
      'PATCH',
      {
        schoolStartTime,
        lateCutoffTime,
        feeDueDay: Math.min(28, Math.max(1, Number(feeDueDay) || 10)),
        lateFeeAmount: Math.max(0, Number(lateFeeAmount) || 0),
        currency: currency.trim() || 'Rs',
        biometricDeviceKey: biometricDeviceKey.trim() || 'IQRA-GATE-KEY-2026',
      },
      'Saved attendance cutoff, hardware webhook key & fee billing rules.'
    );
  };

  const handleAddCampus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageSettings) return;
    const res = await mutate(
      '/api/campuses',
      'POST',
      { name: campusName, city: 'Karachi', address: campusAddress, phone: db.settings.phone },
      `Added campus "${campusName}".`
    );
    if (res.ok) {
      setCampusName('');
      setCampusAddress('');
    }
  };

  const handleResetDemo = async () => {
    if (!canManageSettings) return;
    const res = await mutate('/api/reset', 'POST', {});
    if (res.ok) notify('Demo school data reset to initial state.', 'info');
  };

  const tabs: Array<{ id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'profile', label: 'General Settings', icon: Settings },
    { id: 'messaging', label: 'WhatsApp & SMS API', icon: MessageSquare },
    { id: 'email', label: 'Email Settings', icon: Mail },
    { id: 'rules', label: 'Biometric & Automation', icon: ScanFace },
    { id: 'payments', label: 'Payment Settings', icon: CreditCard },
    { id: 'exams', label: 'Exam Settings', icon: FileSpreadsheet },
    { id: 'printer', label: 'Thermal Printer', icon: Printer },
    { id: 'campuses', label: 'Campuses', icon: Building2 },
    { id: 'rbac', label: 'Admin Roles & RBAC', icon: ShieldCheck },
  ];

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              System Settings &amp; Integrations
            </h1>
            <p className="text-xs text-slate-500">
              Configure school profile, WhatsApp &amp; SMS gateway, attendance cutoff, fees, campuses &amp; RBAC
            </p>
          </div>
        </div>

        {canManageSettings && (
          <button
            type="button"
            onClick={handleResetDemo}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>
        )}
      </div>

      {/* Settings Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                active
                  ? 'bg-teal-700 border-teal-700 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: INSTITUTION & PRINT LETTERHEAD */}
      {activeTab === 'profile' && (
        <form
          onSubmit={handleSaveProfile}
          className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 text-xs"
        >
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Institution Profile &amp; Official Print/PDF Letterhead
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold mb-1">School Name</label>
              <input
                disabled={!canManageSettings}
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Short Monogram / Prefix</label>
              <input
                disabled={!canManageSettings}
                maxLength={5}
                value={shortCode}
                onChange={(e) => setShortCode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Active Academic Session</label>
              <input
                disabled={!canManageSettings}
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Principal / Director Name</label>
              <input
                disabled={!canManageSettings}
                value={principalName}
                onChange={(e) => setPrincipalName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Contact Phone</label>
              <input
                disabled={!canManageSettings}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Official Email</label>
              <input
                type="email"
                disabled={!canManageSettings}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Website URL</label>
              <input
                disabled={!canManageSettings}
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold mb-1">School Motto / Certificate Tagline</label>
              <input
                disabled={!canManageSettings}
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block font-semibold mb-1">Head Office Address</label>
              <input
                disabled={!canManageSettings}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block font-semibold mb-1">PDF &amp; Print Footer Note</label>
              <input
                disabled={!canManageSettings}
                value={receiptFooterNote}
                onChange={(e) => setReceiptFooterNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60"
              />
            </div>
          </div>
          {canManageSettings && (
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Profile &amp; Letterhead</span>
            </button>
          )}
        </form>
      )}

      {/* TAB 2: WHATSAPP & SMS GATEWAY */}
      {activeTab === 'messaging' && (
        <div className="space-y-5">
          <form
            onSubmit={handleSaveMessaging}
            className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 text-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  WhatsApp Cloud &amp; Branded SMS Gateway
                </h2>
                <p className="text-slate-500">
                  Remaining WhatsApp Credits:{' '}
                  <strong className="font-mono text-emerald-700 dark:text-emerald-400">
                    {db.settings.whatsappLeft.toLocaleString()}
                  </strong>
                </p>
              </div>
              {canManageSettings && (
                <button
                  type="button"
                  onClick={() =>
                    void mutate(
                      '/api/settings',
                      'PATCH',
                      { whatsappLeft: (db.settings.whatsappLeft || 0) + 1000 },
                      'Added +1,000 WhatsApp credits.'
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold cursor-pointer"
                >
                  + Top-Up 1,000 Credits
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* WhatsApp Box */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">WhatsApp Business API</span>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={!canManageSettings}
                      checked={whatsappEnabled}
                      onChange={(e) => setWhatsappEnabled(e.target.checked)}
                      className="rounded accent-teal-700"
                    />
                    <span className="font-semibold">{whatsappEnabled ? 'Enabled' : 'Disabled'}</span>
                  </label>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Provider</label>
                  <select
                    disabled={!canManageSettings}
                    value={whatsappProvider}
                    onChange={(e) => setWhatsappProvider(e.target.value as NonNullable<SchoolSettings['whatsappProvider']>)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="EasySchoolin Cloud">EasySchoolin Cloud WhatsApp</option>
                    <option value="Meta Cloud API">Meta Official Cloud API</option>
                    <option value="Twilio WhatsApp">Twilio WhatsApp</option>
                    <option value="Custom Webhook">Custom HTTP Webhook</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">WhatsApp Sender Number</label>
                  <input
                    disabled={!canManageSettings}
                    value={whatsappSenderNumber}
                    onChange={(e) => setWhatsappSenderNumber(e.target.value)}
                    placeholder="+92 300 0000000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">API Access Token</label>
                  <input
                    type="password"
                    disabled={!canManageSettings}
                    value={whatsappApiKey}
                    onChange={(e) => setWhatsappApiKey(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              {/* SMS Box */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">Branded SMS Gateway</span>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={!canManageSettings}
                      checked={smsEnabled}
                      onChange={(e) => setSmsEnabled(e.target.checked)}
                      className="rounded accent-teal-700"
                    />
                    <span className="font-semibold">{smsEnabled ? 'Enabled' : 'Disabled'}</span>
                  </label>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Masking Sender ID</label>
                  <input
                    disabled={!canManageSettings}
                    value={smsSenderId}
                    onChange={(e) => setSmsSenderId(e.target.value)}
                    placeholder="IQRA-SCH"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">SMS Gateway API Key</label>
                  <input
                    type="password"
                    disabled={!canManageSettings}
                    value={smsApiKey}
                    onChange={(e) => setSmsApiKey(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div className="pt-1 space-y-2">
                  <div className="font-bold text-slate-700 dark:text-slate-200">Automated Triggers</div>
                  {[
                    { label: 'Auto WhatsApp on Fee Receipt Payment', checked: autoWhatsappOnFeePaid, set: setAutoWhatsappOnFeePaid },
                    { label: 'Auto WhatsApp on Student Marked Absent', checked: autoWhatsappOnAbsent, set: setAutoWhatsappOnAbsent },
                    { label: 'Auto WhatsApp on Face / ID Card Gate Scan', checked: autoWhatsappOnCheckIn, set: setAutoWhatsappOnCheckIn },
                    { label: 'Auto SMS on New Admission Inquiry', checked: autoSmsOnInquiry, set: setAutoSmsOnInquiry },
                  ].map((t) => (
                    <label key={t.label} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={!canManageSettings}
                        checked={t.checked}
                        onChange={(e) => t.set(e.target.checked)}
                        className="rounded accent-teal-700"
                      />
                      <span>{t.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Templates */}
            <div className="space-y-3 pt-2">
              <h3 className="font-bold text-slate-900 dark:text-white">
                Message Templates (Variables: {'{student}'}, {'{code}'}, {'{amount}'}, {'{voucher}'}, {'{date}'}, {'{time}'})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Fee Reminder Template</label>
                  <textarea rows={2} disabled={!canManageSettings} value={tplFeeReminder} onChange={(e) => setTplFeeReminder(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Absentee Alert Template</label>
                  <textarea rows={2} disabled={!canManageSettings} value={tplAbsentAlert} onChange={(e) => setTplAbsentAlert(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Gate Face/Card Check-In Alert Template</label>
                  <textarea rows={2} disabled={!canManageSettings} value={tplGateCheckIn} onChange={(e) => setTplGateCheckIn(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Exam Result Published Template</label>
                  <textarea rows={2} disabled={!canManageSettings} value={tplExamPublished} onChange={(e) => setTplExamPublished(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                </div>
              </div>
            </div>

            {canManageSettings && (
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save WhatsApp &amp; SMS Settings</span>
              </button>
            )}
          </form>

          {/* Live Test Dispatch Box */}
          {canManageSettings && (
            <form
              onSubmit={handleSendTestGateway}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3 text-xs"
            >
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-600" />
                <span>Test Live WhatsApp / SMS Delivery</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <select
                  value={testChannel}
                  onChange={(e) => setTestChannel(e.target.value as 'WhatsApp' | 'SMS')}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="SMS">SMS</option>
                </select>
                <input
                  required
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+92 300 1234567"
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
                <input
                  value={testBody}
                  onChange={(e) => setTestBody(e.target.value)}
                  placeholder="Optional custom test text..."
                  className="sm:col-span-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Dispatch Test Message</span>
              </button>
            </form>
          )}
        </div>
      )}

      {/* TAB 3: ATTENDANCE & FEE RULES */}
      {activeTab === 'rules' && (
        <form
          onSubmit={handleSaveRules}
          className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 text-xs"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-700" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Attendance Cutoff &amp; Fee Billing Rules
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold mb-1">Morning Gate Start Time</label>
              <input
                type="time"
                disabled={!canManageSettings}
                value={schoolStartTime}
                onChange={(e) => setSchoolStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Late Arrival Grace Cutoff</label>
              <input
                type="time"
                disabled={!canManageSettings}
                value={lateCutoffTime}
                onChange={(e) => setLateCutoffTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Face/Card scans after this time auto-mark Late when Auto-Detect is on.
              </p>
            </div>
            <div>
              <label className="block font-semibold mb-1">Currency Symbol</label>
              <input
                disabled={!canManageSettings}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Monthly Fee Due Day (1–28)</label>
              <input
                type="number"
                min={1}
                max={28}
                disabled={!canManageSettings}
                value={feeDueDay}
                onChange={(e) => setFeeDueDay(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Default Late Fee Fine ({currency})</label>
              <input
                type="number"
                min={0}
                disabled={!canManageSettings}
                value={lateFeeAmount}
                onChange={(e) => setLateFeeAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Biometric Device Webhook Key (x-device-key)</label>
              <input
                disabled={!canManageSettings}
                value={biometricDeviceKey}
                onChange={(e) => setBiometricDeviceKey(e.target.value)}
                placeholder="IQRA-GATE-KEY-2026"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Used by ZKTeco / Hikvision bridge scripts pushing to /api/attendance/device-sync.
              </p>
            </div>
          </div>
          {canManageSettings && (
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Biometric &amp; Automation Rules</span>
            </button>
          )}
        </form>
      )}

      {/* TAB: EMAIL SETTINGS */}
      {activeTab === 'email' && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!canManageSettings) return;
            await mutate(
              '/api/settings',
              'PATCH',
              { emailEnabled, smtpHost, smtpPort: Number(smtpPort) || 587, smtpFromEmail },
              'Saved Email SMTP settings.'
            );
          }}
          className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 text-xs"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Email Alerts &amp; SMTP Server</h2>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(e) => setEmailEnabled(e.target.checked)}
                className="rounded accent-teal-700"
              />
              <span className="font-semibold">{emailEnabled ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold mb-1">SMTP Host</label>
              <input
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">SMTP Port</label>
              <input
                type="number"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Sender Email Address</label>
              <input
                type="email"
                value={smtpFromEmail}
                onChange={(e) => setSmtpFromEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 text-white font-semibold cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Email Settings</span>
          </button>
        </form>
      )}

      {/* TAB: PAYMENT SETTINGS */}
      {activeTab === 'payments' && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!canManageSettings) return;
            await mutate(
              '/api/settings',
              'PATCH',
              {
                onlinePaymentsEnabled,
                bankAccountTitle,
                bankIban,
                jazzcashMerchantId,
                easypaisaStoreId,
              },
              'Saved Online Payment & Bank IBAN settings.'
            );
          }}
          className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 text-xs"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Online Payments, Bank IBAN &amp; Mobile Wallets
            </h2>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={onlinePaymentsEnabled}
                onChange={(e) => setOnlinePaymentsEnabled(e.target.checked)}
                className="rounded accent-teal-700"
              />
              <span className="font-semibold">{onlinePaymentsEnabled ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Bank Account Title</label>
              <input
                value={bankAccountTitle}
                onChange={(e) => setBankAccountTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Bank IBAN (Printed on Fee Challans)</label>
              <input
                value={bankIban}
                onChange={(e) => setBankIban(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">JazzCash Merchant ID</label>
              <input
                value={jazzcashMerchantId}
                onChange={(e) => setJazzcashMerchantId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Easypaisa Store ID</label>
              <input
                value={easypaisaStoreId}
                onChange={(e) => setEasypaisaStoreId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 text-white font-semibold cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Payment Settings</span>
          </button>
        </form>
      )}

      {/* TAB: EXAM SETTINGS */}
      {activeTab === 'exams' && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!canManageSettings) return;
            await mutate(
              '/api/settings',
              'PATCH',
              {
                examPassPercentage: Math.min(90, Math.max(20, Number(examPassPercentage) || 40)),
                examGradingLabel,
              },
              'Saved Exam & Grading settings.'
            );
          }}
          className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 text-xs"
        >
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Exam Pass Threshold &amp; Result Card Grading Scale
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold mb-1">Minimum Pass Percentage (%)</label>
              <input
                type="number"
                min={20}
                max={90}
                value={examPassPercentage}
                onChange={(e) => setExamPassPercentage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold mb-1">Printed Grading Legend on Result Cards</label>
              <input
                value={examGradingLabel}
                onChange={(e) => setExamGradingLabel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 text-white font-semibold cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Exam Settings</span>
          </button>
        </form>
      )}

      {/* TAB: THERMAL PRINTER SETTINGS */}
      {activeTab === 'printer' && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!canManageSettings) return;
            await mutate(
              '/api/settings',
              'PATCH',
              {
                thermalPrinterWidth,
                thermalAutoPrintReceipt,
                thermalHeaderNote,
              },
              'Saved Thermal POS Printer settings.'
            );
          }}
          className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 text-xs"
        >
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Thermal Receipt Printer (POS Fee Slips)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold mb-1">Paper Roll Width</label>
              <select
                value={thermalPrinterWidth}
                onChange={(e) => setThermalPrinterWidth(e.target.value as '58mm' | '80mm')}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              >
                <option value="80mm">80mm (Standard POS)</option>
                <option value="58mm">58mm (Compact Bluetooth)</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold mb-1">Thermal Slip Header / Warranty Note</label>
              <input
                value={thermalHeaderNote}
                onChange={(e) => setThermalHeaderNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <label className="flex items-center gap-2 sm:col-span-3 cursor-pointer">
              <input
                type="checkbox"
                checked={thermalAutoPrintReceipt}
                onChange={(e) => setThermalAutoPrintReceipt(e.target.checked)}
                className="rounded accent-teal-700"
              />
              <span>Auto-open Thermal Print dialog immediately after fee payment collection</span>
            </label>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 text-white font-semibold cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Printer Settings</span>
          </button>
        </form>
      )}

      {/* TAB 4: CAMPUSES */}
      {activeTab === 'campuses' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Configured Campuses</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {db.campuses.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex items-start justify-between gap-2"
              >
                <div className="space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white">
                    {c.name} · {c.code}
                  </div>
                  <div className="text-slate-500">{c.address || c.city}</div>
                  <div className="font-mono text-slate-500">{c.phone}</div>
                </div>
                {canManageSettings && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingCampus(c)}
                      aria-label={`Edit campus ${c.name}`}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    {!c.isMain && (
                      <button
                        type="button"
                        onClick={() =>
                          void mutate(`/api/campuses/${c.id}`, 'DELETE', undefined, `Deleted campus "${c.name}".`)
                        }
                        aria-label={`Delete campus ${c.name}`}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {canManageSettings && (
            <form onSubmit={handleAddCampus} className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-3 text-xs">
              <input
                required
                value={campusName}
                onChange={(e) => setCampusName(e.target.value)}
                placeholder="New campus name (e.g. Clifton Campus)"
                className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                value={campusAddress}
                onChange={(e) => setCampusAddress(e.target.value)}
                placeholder="Address"
                className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <button type="submit" className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 text-white font-semibold cursor-pointer">
                + Add Campus
              </button>
            </form>
          )}
        </div>
      )}

      {/* TAB 5: MULTI-ROLE RBAC DIRECTORY */}
      {activeTab === 'rbac' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-700 dark:text-teal-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Multi-Role Portal Accounts &amp; RBAC Matrix (9 Roles)
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
              <KeyRound className="w-3.5 h-3.5" />
              Portal Password: <strong>Meao@123</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-2.5 px-3 font-semibold">Role</th>
                  <th className="py-2.5 px-3 font-semibold">Login Email / Code</th>
                  <th className="py-2.5 px-3 font-semibold">Access Scope</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Permissions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {ALL_PORTAL_ROLES.map((item) => {
                  const count = ROLE_PERMISSIONS[item.role]?.size ?? 0;
                  return (
                    <tr key={item.role} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{item.role}</td>
                      <td className="py-2.5 px-3 font-mono text-teal-700 dark:text-teal-400">{item.identifier}</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{item.scope}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold">
                        {count} cap(s)
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingCampus && canManageSettings && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold">Edit Campus</h3>
              <button type="button" onClick={() => setEditingCampus(null)} aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await mutate(
                  `/api/campuses/${editingCampus.id}`,
                  'PATCH',
                  {
                    name: editingCampus.name,
                    city: editingCampus.city,
                    address: editingCampus.address,
                    phone: editingCampus.phone,
                  },
                  `Updated ${editingCampus.name}.`
                );
                if (res.ok) setEditingCampus(null);
              }}
              className="mt-4 space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold mb-1">Campus Name *</label>
                <input
                  required
                  value={editingCampus.name}
                  onChange={(e) => setEditingCampus({ ...editingCampus, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Address</label>
                <input
                  value={editingCampus.address}
                  onChange={(e) => setEditingCampus({ ...editingCampus, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Phone</label>
                <input
                  value={editingCampus.phone}
                  onChange={(e) => setEditingCampus({ ...editingCampus, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingCampus(null)} className="px-4 py-2 rounded-xl border border-slate-200">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-teal-700 text-white font-semibold cursor-pointer">
                  Save Campus
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
