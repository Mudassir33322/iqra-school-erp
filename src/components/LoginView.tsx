import React, { useState } from 'react';
import {
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  KeyRound,
  Moon,
  Printer,
  Smartphone,
  Sun,
  User,
  X,
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import type { AdmissionInquiry, FeeVoucher, Gender, SchoolSettings } from '../types/erp';
import { formatCurrency } from '../utils/erpLogic';
import { exportAdmissionFormPdf } from '../utils/pdfExport';

export const LoginView: React.FC = () => {
  const { login, darkMode, toggleDarkMode, notify } = useErp();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [modal, setModal] = useState<'admission' | 'voucher' | 'mobile' | null>(null);

  // Public Admission Inquiry Form state
  const [admName, setAdmName] = useState('');
  const [admFather, setAdmFather] = useState('');
  const [admClass, setAdmClass] = useState('Grade 1');
  const [admGender, setAdmGender] = useState<Gender>('male');
  const [admDob, setAdmDob] = useState('2016-05-10');
  const [admPhone, setAdmPhone] = useState('');
  const [admEmail, setAdmEmail] = useState('');
  const [admCnic, setAdmCnic] = useState('');
  const [admBForm, setAdmBForm] = useState('');
  const [admAddress, setAdmAddress] = useState('');
  const [admNotes, setAdmNotes] = useState('');
  const [admPrevSchool, setAdmPrevSchool] = useState('');
  const [admSuccess, setAdmSuccess] = useState(false);
  const [submittedInquiry, setSubmittedInquiry] = useState<{
    inquiry: AdmissionInquiry;
    school?: SchoolSettings;
  } | null>(null);

  // Public Fee Voucher Lookup state
  const [voucherQuery, setVoucherQuery] = useState('ST-1004');
  const [voucherResults, setVoucherResults] = useState<{
    vouchers: FeeVoucher[];
    school: SchoolSettings;
  } | null>(null);
  const [voucherErr, setVoucherErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    const res = await login(identifier, password);
    setSubmitting(false);
    if (!res.ok) {
      setErrorMsg(res.error || 'Invalid credentials.');
    }
  };

  const quickDemoLogin = async (demoIdentifier: string) => {
    setIdentifier(demoIdentifier);
    setPassword('Meao@123');
    setErrorMsg(null);
    setSubmitting(true);
    const res = await login(demoIdentifier, 'Meao@123');
    setSubmitting(false);
    if (!res.ok) {
      setErrorMsg(res.error || 'Invalid credentials.');
    }
  };

  const submitPublicAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/public/admission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicantName: admName,
          fatherName: admFather,
          appliedClass: admClass,
          gender: admGender,
          dob: admDob,
          phone: admPhone,
          email: admEmail,
          parentCnic: admCnic,
          bFormNo: admBForm,
          address: admAddress,
          notes: admNotes,
          previousSchool: admPrevSchool,
        }),
      });
      const d = (await res.json()) as { inquiry?: AdmissionInquiry; school?: SchoolSettings; error?: string };
      if (!res.ok || !d.inquiry) {
        notify(d.error || 'Please complete required fields.', 'error');
        return;
      }
      setSubmittedInquiry({ inquiry: d.inquiry, school: d.school });
      setAdmSuccess(true);
      notify('Admission application submitted & SMS receipt logged.', 'success');
    } catch {
      notify('Network error submitting inquiry.', 'error');
    }
  };

  const lookupVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setVoucherErr(null);
    setVoucherResults(null);
    try {
      const res = await fetch(`/api/public/voucher?code=${encodeURIComponent(voucherQuery)}`);
      const data = (await res.json()) as {
        vouchers?: FeeVoucher[];
        school?: SchoolSettings;
        error?: string;
      };
      if (!res.ok || !data.vouchers || !data.school) {
        setVoucherErr(data.error || 'No voucher found.');
        return;
      }
      setVoucherResults({ vouchers: data.vouchers, school: data.school });
    } catch {
      setVoucherErr('Failed to look up fee voucher.');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-slate-50 via-stone-50 to-blue-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors">
      <button
        type="button"
        onClick={toggleDarkMode}
        aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        className="fixed top-5 right-5 w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <main className="w-full max-w-[920px] rounded-2xl overflow-hidden shadow-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 grid grid-cols-1 md:grid-cols-2">
        {/* Left Royal Blue Brand Panel */}
        <div className="relative bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 text-white p-8 sm:p-10 flex flex-col items-center justify-center text-center overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-52 h-52 rounded-full bg-white/10 pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center w-full max-w-xs">
            <div className="w-24 h-24 rounded-2xl bg-white shadow-lg flex items-center justify-center mb-6">
              <GraduationCap className="w-11 h-11 text-blue-600" strokeWidth={1.8} />
            </div>

            <h1 className="text-2xl font-bold tracking-tight mb-2">iqra school</h1>
            <p className="text-xs font-medium text-blue-100 bg-white/15 px-4 py-1.5 rounded-full mb-8">
              Sign in to start your session
            </p>

            <div className="grid grid-cols-2 gap-2.5 w-full">
              <button
                type="button"
                onClick={() => {
                  setAdmSuccess(false);
                  setSubmittedInquiry(null);
                  setModal('admission');
                }}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-xs font-medium transition-colors text-left"
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span>Apply For Admission</span>
              </button>
              <button
                type="button"
                onClick={() => setModal('voucher')}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-xs font-medium transition-colors text-left"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>Download Fee Voucher</span>
              </button>
              <button
                type="button"
                onClick={() => setModal('mobile')}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-xs font-medium transition-colors"
              >
                <Smartphone className="w-3.5 h-3.5 shrink-0" />
                <span>Android App</span>
              </button>
              <button
                type="button"
                onClick={() => setModal('mobile')}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-xs font-medium transition-colors"
              >
                <Smartphone className="w-3.5 h-3.5 shrink-0" />
                <span>iOS App</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Sign-in Form */}
        <div className="p-8 sm:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Welcome back!
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Admins, accountants, teachers, parents and students all sign in here.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-identifier"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Email, CNIC or student code
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Email, CNIC or ST-1024"
                  autoComplete="username"
                  required
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition-colors"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="text-xs font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2"
              >
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold shadow-sm transition-colors cursor-pointer"
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-4 space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium">Quick Role Demo Access (Password: <code className="font-mono">Meao@123</code>)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {[
                { label: 'Admin', id: 'muhammadmudassir33322@gmail.com', accent: 'border-blue-200 bg-blue-50/70 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300' },
                { label: 'Teacher', id: 'ayesha@iqraschool.edu.pk', accent: 'border-teal-200 bg-teal-50/70 text-teal-700 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300' },
                { label: 'Parent (3 Kids)', id: 'tariq.aziz@mail.com', accent: 'border-indigo-200 bg-indigo-50/70 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300' },
                { label: 'Student (ST-1001)', id: 'ST-1001', accent: 'border-emerald-200 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300' },
                { label: 'Accountant', id: 'accounts@iqraschool.edu.pk', accent: 'border-amber-200 bg-amber-50/70 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300' },
              ].map((demo) => (
                <button
                  key={demo.label}
                  type="button"
                  disabled={submitting}
                  onClick={() => void quickDemoLogin(demo.id)}
                  className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold hover:opacity-90 transition-opacity cursor-pointer truncate ${demo.accent}`}
                >
                  {demo.label}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-5 text-[11px] text-center text-slate-500 dark:text-slate-400 leading-relaxed">
            By accessing or using our platform/services, you agree to our{' '}
            <button type="button" onClick={() => setModal('mobile')} className="text-blue-600 hover:underline">
              privacy policy
            </button>
            ,{' '}
            <button type="button" onClick={() => setModal('mobile')} className="text-blue-600 hover:underline">
              refund policy
            </button>{' '}
            and{' '}
            <button type="button" onClick={() => setModal('mobile')} className="text-blue-600 hover:underline">
              terms &amp; conditions
            </button>
            .
          </p>
          <p className="mt-3 text-[11px] text-center text-slate-400 dark:text-slate-500">
            Copyright © 2026 iqra school
          </p>
        </div>
      </main>

      {/* Public Modals */}
      {modal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {modal === 'admission' && 'Apply For Admission · Iqra School'}
                {modal === 'voucher' && 'Download Student Fee Voucher'}
                {modal === 'mobile' && 'Iqra School Companion Apps & Policies'}
              </h3>
              <button
                type="button"
                onClick={() => setModal(null)}
                aria-label="Close modal"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modal === 'admission' && (
              <div className="mt-4 max-h-[75vh] overflow-y-auto pr-1">
                {admSuccess && submittedInquiry ? (
                  <div className="text-center py-5 space-y-4">
                    <CheckCircle2 className="w-11 h-11 text-emerald-600 mx-auto" />
                    <div>
                      <p className="text-base font-bold text-slate-900 dark:text-white">
                        Application Submitted Successfully
                      </p>
                      <p className="text-xs font-mono font-bold text-teal-700 dark:text-teal-400 mt-1">
                        Tracking Ref: {submittedInquiry.inquiry.id.toUpperCase()}
                      </p>
                    </div>
                    <div className="text-left p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                      <div>
                        Applicant: <strong>{submittedInquiry.inquiry.applicantName}</strong> ({submittedInquiry.inquiry.appliedClass})
                      </div>
                      <div>
                        Guardian: <strong>{submittedInquiry.inquiry.fatherName}</strong> · {submittedInquiry.inquiry.phone}
                      </div>
                      <div className="text-slate-500">
                        SMS confirmation sent. Admins can review &amp; one-click enroll under Manage Admissions.
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const inq = submittedInquiry.inquiry;
                          const fallbackSchool: SchoolSettings = submittedInquiry.school || {
                            schoolName: 'Iqra School',
                            shortCode: 'IS',
                            sessionName: '2026-2027',
                            packageName: 'Advance',
                            daysLeft: 365,
                            studentLimit: 3000,
                            maxCampuses: 2,
                            whatsappLeft: 1000,
                            phone: '+92 21 3482 5826',
                            email: 'info@iqraschool.edu.pk',
                            address: 'Gulshan-e-Iqbal Block 13, Karachi',
                            currency: 'Rs',
                            lateFeeAmount: 500,
                            checklistDismissed: true,
                          };
                          void exportAdmissionFormPdf({
                            settings: fallbackSchool,
                            campusName: 'Main Campus',
                            formTitle: 'Admission Application Slip',
                            refCode: inq.id.slice(-8).toUpperCase(),
                            appliedDate: inq.appliedDate,
                            statusLabel: inq.status,
                            studentName: inq.applicantName,
                            fatherName: inq.fatherName,
                            gender: inq.gender,
                            dob: inq.dob,
                            classLabel: inq.appliedClass,
                            phone: inq.phone,
                            email: inq.email,
                            cnic: inq.parentCnic,
                            bFormNo: inq.bFormNo,
                            address: inq.address,
                            previousSchool: inq.previousSchool,
                            notes: inq.notes,
                            filename: `admission-slip-${inq.applicantName.toLowerCase().replaceAll(' ', '-')}.pdf`,
                          });
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Application Slip PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setModal(null)}
                        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={submitPublicAdmission} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Student Name *
                        </label>
                        <input
                          required
                          value={admName}
                          onChange={(e) => setAdmName(e.target.value)}
                          placeholder="e.g. Zainab Tariq"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Father / Guardian Name *
                        </label>
                        <input
                          required
                          value={admFather}
                          onChange={(e) => setAdmFather(e.target.value)}
                          placeholder="e.g. Tariq Mahmood"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Applying for Class *
                        </label>
                        <select
                          value={admClass}
                          onChange={(e) => setAdmClass(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        >
                          <option>Playgroup</option>
                          <option>Nursery</option>
                          <option>Prep</option>
                          <option>Grade 1</option>
                          <option>Grade 5</option>
                          <option>Grade 8</option>
                          <option>Grade 9</option>
                          <option>Grade 10</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Gender
                        </label>
                        <select
                          value={admGender}
                          onChange={(e) => setAdmGender(e.target.value as Gender)}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          value={admDob}
                          onChange={(e) => setAdmDob(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Parent Mobile *
                        </label>
                        <input
                          required
                          value={admPhone}
                          onChange={(e) => setAdmPhone(e.target.value)}
                          placeholder="0300-1234567"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Guardian CNIC
                        </label>
                        <input
                          value={admCnic}
                          onChange={(e) => setAdmCnic(e.target.value)}
                          placeholder="42201-1234567-1"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Student B-Form
                        </label>
                        <input
                          value={admBForm}
                          onChange={(e) => setAdmBForm(e.target.value)}
                          placeholder="Optional"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={admEmail}
                          onChange={(e) => setAdmEmail(e.target.value)}
                          placeholder="parent@example.com"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Previous School
                        </label>
                        <input
                          value={admPrevSchool}
                          onChange={(e) => setAdmPrevSchool(e.target.value)}
                          placeholder="Optional"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Residential Address
                        </label>
                        <input
                          value={admAddress}
                          onChange={(e) => setAdmAddress(e.target.value)}
                          placeholder="House / Street / Block"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Special Notes / Medical Info
                        </label>
                        <input
                          value={admNotes}
                          onChange={(e) => setAdmNotes(e.target.value)}
                          placeholder="Optional notes"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-3">
                      <button
                        type="button"
                        onClick={() => setModal(null)}
                        className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                      >
                        Submit Application
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {modal === 'voucher' && (
              <div className="mt-4 space-y-4">
                <form onSubmit={lookupVoucher} className="flex gap-2">
                  <input
                    value={voucherQuery}
                    onChange={(e) => setVoucherQuery(e.target.value)}
                    placeholder="Enter student code (e.g. ST-1004) or VCH-2004"
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold whitespace-nowrap"
                  >
                    Find Voucher
                  </button>
                </form>
                {voucherErr && <p className="text-xs text-red-600">{voucherErr}</p>}
                {voucherResults && (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {voucherResults.vouchers.map((v) => (
                      <div
                        key={v.id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4"
                      >
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">
                            {v.studentName} · {v.voucherNo}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {v.className} ({v.sectionName}) · {v.monthLabel} · Due {v.dueDate}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                            {formatCurrency(v.totalAmount, voucherResults.school.currency)}
                          </div>
                          <div
                            className={`text-[11px] font-semibold uppercase ${
                              v.status === 'paid' ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {v.status}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print Slip
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {modal === 'mobile' && (
              <div className="mt-4 space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  Parents and students of <strong>iqra school</strong> can sign in directly on this web portal using their Student Code (e.g., <code className="font-mono">ST-1001</code>) or registered Parent email, or install the companion mobile app from Google Play / Apple App Store.
                </p>
                <p>
                  For account setup or campus support, contact Gulshan-e-Iqbal Main Campus Office at <strong>+92 21 3482 5826</strong>.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
