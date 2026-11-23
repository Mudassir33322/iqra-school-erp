import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  Pencil,
  Plus,
  Printer,
  Receipt,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import type { FeeVoucher, LedgerEntry, PaymentMethod } from '../types/erp';
import { formatCurrency } from '../utils/erpLogic';
import { exportTableToPdf } from '../utils/pdfExport';

type FeeSubTab = 'payment' | 'slips' | 'monthly' | 'custom' | 'defaulters';

export const FeesAccountsView: React.FC<{ mode: 'fees' | 'accounting'; initialLedgerFilter?: 'all' | 'income' | 'expense' }> = ({ mode, initialLedgerFilter = 'all' }) => {
  const { db, today, activeCampusId, activeSubTab, showAmounts, mutate, notify, canPerform } = useErp();
  const canManageFees = canPerform('manage_fees');
  const canManageLedger = canPerform('manage_ledger');

  const [subTab, setSubTab] = useState<FeeSubTab>('payment');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'paid'>('all');

  useEffect(() => {
    if (
      activeSubTab === 'payment' ||
      activeSubTab === 'slips' ||
      activeSubTab === 'monthly' ||
      activeSubTab === 'custom' ||
      activeSubTab === 'defaulters'
    ) {
      setSubTab(activeSubTab);
    }
  }, [activeSubTab]);

  // Collect payment modal
  const [payVoucher, setPayVoucher] = useState<FeeVoucher | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('Cash');

  // Print slips state
  const [slipCopyMode, setSlipCopyMode] = useState<'three' | 'two' | 'one'>('three');
  const [slipClassId, setSlipClassId] = useState('all');
  const [previewVoucher, setPreviewVoucher] = useState<FeeVoucher | null>(null);

  // Generate Monthly Fee form
  const [genClassId, setGenClassId] = useState('all');
  const [genMonthKey, setGenMonthKey] = useState(today.slice(0, 7));
  const [genFeeType, setGenFeeType] = useState('Monthly Tuition');
  const [genOtherCharges, setGenOtherCharges] = useState('0');
  const [genDueDate, setGenDueDate] = useState(`${today.slice(0, 7)}-10`);

  // Generate Custom Fee form
  const [customStudentId, setCustomStudentId] = useState('');
  const [customTitle, setCustomTitle] = useState('Annual Exam & Paper Fee');
  const [customAmount, setCustomAmount] = useState('1500');

  // Edit voucher modal
  const [editVoucher, setEditVoucher] = useState<FeeVoucher | null>(null);

  // Accounting Ledger modal
  const [ledgerModal, setLedgerModal] = useState(false);
  const [editingLedgerId, setEditingLedgerId] = useState<string | null>(null);
  const [ledgerType, setLedgerType] = useState<'income' | 'expense'>('expense');
  const [ledgerCategory, setLedgerCategory] = useState('Utilities');
  const [ledgerDesc, setLedgerDesc] = useState('');
  const [ledgerAmount, setLedgerAmount] = useState('');
  const [ledgerMethod, setLedgerMethod] = useState<PaymentMethod>('Cash');
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'income' | 'expense'>(initialLedgerFilter);

  useEffect(() => {
    setLedgerFilter(initialLedgerFilter);
  }, [initialLedgerFilter]);

  const campusClasses = useMemo(() => {
    if (!db) return [];
    return db.classes.filter((c) => activeCampusId === 'all' || c.campusId === activeCampusId);
  }, [db, activeCampusId]);

  const campusStudents = useMemo(() => {
    if (!db) return [];
    return db.students.filter(
      (s) => s.status === 'active' && (activeCampusId === 'all' || s.campusId === activeCampusId)
    );
  }, [db, activeCampusId]);

  const campusVouchers = useMemo(() => {
    if (!db) return [];
    const q = searchQuery.trim().toLowerCase();
    return db.vouchers.filter((v) => {
      if (activeCampusId !== 'all' && v.campusId !== activeCampusId) return false;
      if (statusFilter === 'unpaid' && v.status === 'paid') return false;
      if (statusFilter === 'paid' && v.status !== 'paid') return false;
      if (!q) return true;
      return (
        v.studentName.toLowerCase().includes(q) ||
        v.studentCode.toLowerCase().includes(q) ||
        v.voucherNo.toLowerCase().includes(q)
      );
    });
  }, [db, activeCampusId, searchQuery, statusFilter]);

  const defaulters = useMemo(() => {
    if (!db) return [];
    const grouped = new Map<
      string,
      { studentName: string; studentCode: string; className: string; unpaidCount: number; totalDue: number }
    >();
    for (const v of db.vouchers) {
      if (v.status === 'paid') continue;
      if (activeCampusId !== 'all' && v.campusId !== activeCampusId) continue;
      const due = Math.max(0, v.totalAmount - v.paidAmount);
      const prev = grouped.get(v.studentId);
      if (prev) {
        prev.unpaidCount += 1;
        prev.totalDue += due;
      } else {
        grouped.set(v.studentId, {
          studentName: v.studentName,
          studentCode: v.studentCode,
          className: `${v.className} (${v.sectionName})`,
          unpaidCount: 1,
          totalDue: due,
        });
      }
    }
    return Array.from(grouped.values()).sort((a, b) => b.totalDue - a.totalDue);
  }, [db, activeCampusId]);

  if (!db) return null;

  const currency = db.settings.currency || 'Rs';
  const campusName =
    activeCampusId === 'all'
      ? 'All Campuses'
      : db.campuses.find((c) => c.id === activeCampusId)?.name ?? 'Main Campus';

  const handleCollectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payVoucher) return;
    const res = await mutate(
      `/api/fees/${payVoucher.id}/pay`,
      'POST',
      { amount: Number(payAmount), paymentMethod: payMethod },
      `Collected ${formatCurrency(Number(payAmount), currency)} for ${payVoucher.voucherNo}.`
    );
    if (res.ok) setPayVoucher(null);
  };

  const handleGenerateMonthly = async (e: React.FormEvent) => {
    e.preventDefault();
    const [yr, mo] = genMonthKey.split('-');
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const monthLabel = `${monthNames[Math.max(0, parseInt(mo, 10) - 1)]} ${yr}`;
    const res = await mutate<{ createdCount: number }>(
      '/api/fees/generate',
      'POST',
      {
        campusId: activeCampusId,
        classId: genClassId,
        monthKey: genMonthKey,
        monthLabel,
        feeType: genFeeType,
        otherCharges: Number(genOtherCharges) || 0,
        dueDate: genDueDate,
      }
    );
    if (res.ok && res.data) {
      notify(
        res.data.createdCount > 0
          ? `Generated ${res.data.createdCount} fee voucher(s) for ${monthLabel}.`
          : `All active students already have ${genFeeType} vouchers for ${monthLabel}.`,
        res.data.createdCount > 0 ? 'success' : 'info'
      );
      setSubTab('payment');
    }
  };

  const handleGenerateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    const stuId = customStudentId || campusStudents[0]?.id;
    if (!stuId) return;
    const res = await mutate(
      '/api/fees/custom',
      'POST',
      {
        studentId: stuId,
        feeType: customTitle,
        amount: Number(customAmount),
        monthKey: today.slice(0, 7),
        monthLabel: 'Custom Fee',
        dueDate: today,
      },
      `Created custom voucher for ${customTitle}.`
    );
    if (res.ok) setSubTab('payment');
  };

  const openNewLedger = () => {
    setEditingLedgerId(null);
    setLedgerType('expense');
    setLedgerCategory('Utilities');
    setLedgerDesc('');
    setLedgerAmount('');
    setLedgerMethod('Cash');
    setLedgerModal(true);
  };

  const openEditLedger = (entry: LedgerEntry) => {
    setEditingLedgerId(entry.id);
    setLedgerType(entry.type);
    setLedgerCategory(entry.category);
    setLedgerDesc(entry.description);
    setLedgerAmount(String(entry.amount));
    setLedgerMethod(entry.paymentMethod);
    setLedgerModal(true);
  };

  const handleSaveLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      campusId: activeCampusId === 'all' ? db.campuses[0]?.id : activeCampusId,
      date: today,
      type: ledgerType,
      category: ledgerCategory,
      description: ledgerDesc,
      amount: Number(ledgerAmount),
      paymentMethod: ledgerMethod,
    };
    const res = editingLedgerId
      ? await mutate(`/api/ledger/${editingLedgerId}`, 'PATCH', payload, 'Updated ledger entry.')
      : await mutate('/api/ledger', 'POST', payload, `Recorded ${ledgerType} entry.`);
    if (res.ok) {
      setLedgerModal(false);
      setEditingLedgerId(null);
      setLedgerDesc('');
      setLedgerAmount('');
    }
  };

  if (mode === 'accounting') {
    const entries = db.ledger.filter((l) => {
      if (activeCampusId !== 'all' && l.campusId !== activeCampusId) return false;
      if (ledgerFilter !== 'all' && l.type !== ledgerFilter) return false;
      return true;
    });
    const totalIncome = entries.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0);
    const totalExpense = entries.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0);

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 flex items-center justify-center">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {initialLedgerFilter === 'expense' ? 'Expense Management' : 'Accounting & Day Book'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Campus: {campusName} · Income, expenses &amp; profit statement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 no-print">
            <button
              type="button"
              onClick={() => {
                const header = 'Date,Type,Category,Description,Payment Method,Amount\n';
                const rows = entries
                  .map(
                    (e) =>
                      `${e.date},${e.type},"${e.category.replaceAll('"', '""')}","${e.description.replaceAll('"', '""')}",${e.paymentMethod},${e.amount}`
                  )
                  .join('\n');
                const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `iqra-ledger-${today}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => {
                exportTableToPdf({
                  title:
                    ledgerFilter === 'expense'
                      ? 'Expense Statement'
                      : ledgerFilter === 'income'
                        ? 'Income Statement'
                        : 'Accounting & Day Book Statement',
                  subtitle: `Campus: ${campusName} · Filter: ${ledgerFilter.toUpperCase()}`,
                  filename: `accounting-${ledgerFilter}-${today}.pdf`,
                  headers: ['Date', 'Type', 'Category', 'Description', 'Method', 'Amount'],
                  rows: entries.map((entry) => [
                    entry.date,
                    entry.type.toUpperCase(),
                    entry.category,
                    entry.description,
                    entry.paymentMethod,
                    `${entry.type === 'income' ? '+' : '-'}${formatCurrency(entry.amount, currency, !showAmounts)}`,
                  ]),
                  settings: db.settings,
                  campusName,
                  generatedDate: today,
                  summaryCards: [
                    {
                      label: 'Total Credits (Income)',
                      value: formatCurrency(totalIncome, currency, !showAmounts),
                      tone: 'emerald',
                    },
                    {
                      label: 'Total Debits (Expenses)',
                      value: formatCurrency(totalExpense, currency, !showAmounts),
                      tone: 'rose',
                    },
                    {
                      label: 'Net Balance',
                      value: formatCurrency(totalIncome - totalExpense, currency, !showAmounts),
                      tone: 'teal',
                    },
                  ],
                });
                notify(`Downloaded PDF statement (${entries.length} entries).`, 'success');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 text-xs font-semibold text-rose-700 dark:text-rose-300 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>Print Ledger Statement</span>
            </button>
            {canManageLedger && (
              <button
                type="button"
                onClick={openNewLedger}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Income / Expense</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-xs text-slate-500">Total Credits (Income)</div>
            <div className="text-xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">
              {formatCurrency(totalIncome, currency, !showAmounts)}
            </div>
          </div>
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-xs text-slate-500">Total Debits (Expenses)</div>
            <div className="text-xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400 mt-1">
              {formatCurrency(totalExpense, currency, !showAmounts)}
            </div>
          </div>
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-xs text-slate-500">Net Balance</div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
              {formatCurrency(totalIncome - totalExpense, currency, !showAmounts)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(['all', 'income', 'expense'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setLedgerFilter(f)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize border cursor-pointer ${
                ledgerFilter === f
                  ? 'bg-teal-700 text-white border-teal-700'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Type</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Description</th>
                <th className="py-3 px-4 font-semibold">Method</th>
                <th className="py-3 px-4 font-semibold text-right">Amount</th>
                {canManageLedger && <th className="py-3 px-4 font-semibold text-right no-print">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-3 px-4 font-mono tabular-nums">{entry.date}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`font-semibold capitalize ${
                        entry.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {entry.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium">{entry.category}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{entry.description}</td>
                  <td className="py-3 px-4 text-slate-500">{entry.paymentMethod}</td>
                  <td
                    className={`py-3 px-4 text-right font-mono tabular-nums font-bold ${
                      entry.type === 'income' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'
                    }`}
                  >
                    {entry.type === 'income' ? '+' : '-'}
                    {formatCurrency(entry.amount, currency, !showAmounts)}
                  </td>
                  {canManageLedger && (
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap no-print">
                      <button
                        type="button"
                        onClick={() => openEditLedger(entry)}
                        aria-label={`Edit entry ${entry.description}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void mutate(`/api/ledger/${entry.id}`, 'DELETE', undefined, 'Deleted ledger entry.')
                        }
                        aria-label={`Delete entry ${entry.description}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {ledgerModal && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-bold">
                  {editingLedgerId ? 'Edit Ledger Entry' : 'Record Income / Expense'}
                </h3>
                <button type="button" onClick={() => setLedgerModal(false)} aria-label="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSaveLedger} className="mt-4 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Entry Type</label>
                    <select
                      value={ledgerType}
                      onChange={(e) => setLedgerType(e.target.value as 'income' | 'expense')}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="expense">Expense (Debit)</option>
                      <option value="income">Income (Credit)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Method</label>
                    <select
                      value={ledgerMethod}
                      onChange={(e) => setLedgerMethod(e.target.value as PaymentMethod)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option>Cash</option>
                      <option>Bank Transfer</option>
                      <option>JazzCash</option>
                      <option>Easypaisa</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Category *</label>
                  <input
                    required
                    value={ledgerCategory}
                    onChange={(e) => setLedgerCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Description *</label>
                  <input
                    required
                    value={ledgerDesc}
                    onChange={(e) => setLedgerDesc(e.target.value)}
                    placeholder="e.g. Monthly K-Electric bill"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Amount ({currency}) *</label>
                  <input
                    required
                    type="number"
                    min={1}
                    value={ledgerAmount}
                    onChange={(e) => setLedgerAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setLedgerModal(false)} className="px-4 py-2 rounded-xl border border-slate-200">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 rounded-xl bg-teal-700 text-white font-semibold">
                    Save Entry
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // FEE MANAGEMENT MODE
  const slipVouchers = campusVouchers.filter((v) => {
    if (slipClassId === 'all') return true;
    const cls = db.classes.find((c) => c.id === slipClassId);
    return cls ? v.className === cls.className && v.sectionName === cls.sectionName : true;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Fee Management</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Campus: {campusName}</p>
          </div>
        </div>
      </div>

      {/* EasySchoolin Fee Sub-tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(
          [
            { id: 'payment', label: 'Fee payment', icon: CreditCard, visible: true },
            { id: 'slips', label: 'Print fee slips', icon: Printer, visible: true },
            { id: 'monthly', label: 'Generate Monthly Fee', icon: Receipt, visible: canManageFees },
            { id: 'custom', label: 'Generate Custom Fee', icon: Plus, visible: canManageFees },
            { id: 'defaulters', label: 'Fee Defaulters', icon: AlertCircle, visible: canManageFees },
          ] as const
        )
          .filter((tab) => tab.visible)
          .map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border whitespace-nowrap shrink-0 cursor-pointer ${
                subTab === tab.id
                  ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'bg-white/60 dark:bg-slate-900/60 border-slate-200/70 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Icon className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {subTab === 'payment' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search voucher no, student name or ST code..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div className="inline-flex items-center gap-1.5 no-print">
              {(['all', 'unpaid', 'paid'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize border cursor-pointer ${
                    statusFilter === st
                      ? 'bg-teal-700 border-teal-700 text-white'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {st}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  const header = 'Voucher No,Student Code,Student Name,Class,Month,Total,Paid,Status,Due Date\n';
                  const rows = campusVouchers
                    .map(
                      (v) =>
                        `${v.voucherNo},${v.studentCode},"${v.studentName.replaceAll('"', '""')}","${v.className} (${v.sectionName})","${v.monthLabel}",${v.totalAmount},${v.paidAmount},${v.status},${v.dueDate}`
                    )
                    .join('\n');
                  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `iqra-fee-vouchers-${today}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const totalBilled = campusVouchers.reduce((s, v) => s + v.totalAmount, 0);
                  const totalCollected = campusVouchers.reduce((s, v) => s + v.paidAmount, 0);
                  exportTableToPdf({
                    title: 'Fee Vouchers & Collection Register',
                    subtitle: `Campus: ${campusName} · Status: ${statusFilter.toUpperCase()}${searchQuery.trim() ? ` · Filter: "${searchQuery.trim()}"` : ''}`,
                    filename: `fee-vouchers-${statusFilter}-${today}.pdf`,
                    headers: ['Voucher #', 'Student Code', 'Student Name', 'Class', 'Month', 'Total', 'Paid', 'Status', 'Due Date'],
                    rows: campusVouchers.map((v) => [
                      v.voucherNo,
                      v.studentCode,
                      v.studentName,
                      `${v.className} (${v.sectionName})`,
                      v.monthLabel,
                      formatCurrency(v.totalAmount, currency, !showAmounts),
                      formatCurrency(v.paidAmount, currency, !showAmounts),
                      v.status.toUpperCase(),
                      v.dueDate,
                    ]),
                    settings: db.settings,
                    campusName,
                    generatedDate: today,
                    summaryCards: [
                      { label: 'Total Vouchers', value: String(campusVouchers.length), tone: 'teal' },
                      { label: 'Total Billed', value: formatCurrency(totalBilled, currency, !showAmounts), tone: 'slate' },
                      { label: 'Collected', value: formatCurrency(totalCollected, currency, !showAmounts), tone: 'emerald' },
                      { label: 'Pending Due', value: formatCurrency(Math.max(0, totalBilled - totalCollected), currency, !showAmounts), tone: 'rose' },
                    ],
                    orientation: 'landscape',
                  });
                  notify(`Downloaded PDF for ${campusVouchers.length} fee voucher(s).`, 'success');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 text-xs font-semibold text-rose-700 dark:text-rose-300 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-blue-600" />
                <span>Print Fee Register</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-2.5 px-3 font-semibold">Voucher #</th>
                  <th className="py-2.5 px-3 font-semibold">Student</th>
                  <th className="py-2.5 px-3 font-semibold">Class</th>
                  <th className="py-2.5 px-3 font-semibold">Billing Period</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Total</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Paid</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {campusVouchers.map((v) => {
                  const due = Math.max(0, v.totalAmount - v.paidAmount);
                  return (
                    <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-2.5 px-3 font-mono font-semibold text-teal-700 dark:text-teal-400">
                        {v.voucherNo}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white">{v.studentName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{v.studentCode}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        {v.className} · {v.sectionName}
                      </td>
                      <td className="py-2.5 px-3">
                        <div>{v.monthLabel}</div>
                        <div className="text-[11px] text-slate-400">{v.feeType}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold">
                        {formatCurrency(v.totalAmount, currency, !showAmounts)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        {formatCurrency(v.paidAmount, currency, !showAmounts)}
                      </td>
                      <td className="py-2.5 px-3">
                        {v.status === 'paid' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Paid
                          </span>
                        ) : (
                          <span className="text-rose-600 font-semibold capitalize">
                            {v.status} ({formatCurrency(due, currency)})
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                        {canManageFees && v.status !== 'paid' && (
                          <button
                            type="button"
                            onClick={() => {
                              setPayVoucher(v);
                              setPayAmount(String(due));
                            }}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
                          >
                            Collect Fee
                          </button>
                        )}
                        {canManageFees && (
                          <button
                            type="button"
                            onClick={() => setEditVoucher(v)}
                            aria-label={`Edit voucher ${v.voucherNo}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewVoucher(v);
                            setSubTab('slips');
                          }}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-medium cursor-pointer"
                        >
                          Slip
                        </button>
                        {canManageFees && (
                          <button
                            type="button"
                            onClick={() =>
                              void mutate(`/api/fees/${v.id}`, 'DELETE', undefined, `Deleted voucher ${v.voucherNo}.`)
                            }
                            aria-label={`Delete voucher ${v.voucherNo}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'slips' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 max-w-2xl mx-auto space-y-4 no-print">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Fee vouchers</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Print 3-copy bank/school/student challans for any class or student.
              </p>
            </div>
            <div>
              <div className="text-xs font-semibold mb-1.5">Type</div>
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-stone-100 dark:bg-slate-800">
                {(
                  [
                    { id: 'three', label: 'Three Copies' },
                    { id: 'two', label: 'Two Copies' },
                    { id: 'one', label: 'One Copy' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSlipCopyMode(t.id)}
                    className={`py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                      slipCopyMode === t.id
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Class</label>
                <select
                  value={slipClassId}
                  onChange={(e) => setSlipClassId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="all">All Classes</option>
                  {campusClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.className} ({c.sectionName})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Select Voucher</label>
                <select
                  value={previewVoucher?.id || slipVouchers[0]?.id || ''}
                  onChange={(e) =>
                    setPreviewVoucher(slipVouchers.find((v) => v.id === e.target.value) || null)
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {slipVouchers.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.voucherNo} · {v.studentName} ({v.monthLabel})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const v = previewVoucher || slipVouchers[0];
                  if (!v) return;
                  const due = Math.max(0, v.totalAmount - v.paidAmount);
                  exportTableToPdf({
                    title: `Fee Challan · ${v.voucherNo}`,
                    subtitle: `Student: ${v.studentName} (${v.studentCode}) · Class: ${v.className} (${v.sectionName}) · Month: ${v.monthLabel}`,
                    filename: `fee-challan-${v.voucherNo}.pdf`,
                    headers: ['Copy', 'Fee Component / Reference', `Amount (${currency})`],
                    rows: [
                      [slipCopyMode === 'three' ? 'Bank / School / Student' : slipCopyMode === 'two' ? 'School / Student' : 'Student Copy', `Tuition Fee (${v.monthLabel})`, formatCurrency(v.tuitionAmount, currency, false)],
                      ['Voucher Details', 'Other / Misc Charges', formatCurrency(v.otherCharges, currency, false)],
                      ['Discount / Concession', v.discountAmount > 0 ? 'Fee Concession Applied' : 'No Discount', `-${formatCurrency(v.discountAmount, currency, false)}`],
                      ['Late Fee / Fine', `Due Date: ${v.dueDate}`, formatCurrency(v.lateFine, currency, false)],
                      ['Total Payable', `Paid: ${formatCurrency(v.paidAmount, currency, false)}`, formatCurrency(v.totalAmount, currency, false)],
                      ['Net Balance Due', `Status: ${v.status.toUpperCase()}`, formatCurrency(due, currency, false)],
                    ],
                    settings: db.settings,
                    campusName,
                    generatedDate: today,
                    summaryCards: [
                      { label: 'Voucher No', value: v.voucherNo, tone: 'teal' },
                      { label: 'Total Billed', value: formatCurrency(v.totalAmount, currency, false), tone: 'slate' },
                      { label: 'Paid', value: formatCurrency(v.paidAmount, currency, false), tone: 'emerald' },
                      { label: 'Balance Due', value: formatCurrency(due, currency, false), tone: due > 0 ? 'rose' : 'emerald' },
                    ],
                  });
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Challan PDF</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Fee Challan</span>
              </button>
            </div>
          </div>

          {/* Printable Challan Copies */}
          {(previewVoucher || slipVouchers[0]) && (
            <div
              className={`grid gap-4 ${
                slipCopyMode === 'three'
                  ? 'grid-cols-1 md:grid-cols-3'
                  : slipCopyMode === 'two'
                    ? 'grid-cols-1 md:grid-cols-2'
                    : 'grid-cols-1 max-w-md mx-auto'
              }`}
            >
              {(slipCopyMode === 'three'
                ? ['Bank Copy', 'School Copy', 'Student Copy']
                : slipCopyMode === 'two'
                  ? ['School Copy', 'Student Copy']
                  : ['Student Copy']
              ).map((copyLabel) => {
                const v = previewVoucher || slipVouchers[0];
                return (
                  <div
                    key={copyLabel}
                    className="rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-4 text-xs space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">
                          {db.settings.schoolName}
                        </div>
                        <div className="text-[11px] text-slate-500">{campusName}</div>
                      </div>
                      <span className="font-semibold text-[11px] uppercase text-teal-700 dark:text-teal-400">
                        {copyLabel}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Voucher #</span>
                        <span className="font-mono font-bold">{v.voucherNo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Student</span>
                        <span className="font-semibold">
                          {v.studentName} ({v.studentCode})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Class</span>
                        <span>
                          {v.className} · {v.sectionName}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Month</span>
                        <span>{v.monthLabel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Due Date</span>
                        <span className="font-mono">{v.dueDate}</span>
                      </div>
                    </div>

                    <div className="border-t border-b border-slate-200 dark:border-slate-800 py-2 space-y-1">
                      <div className="flex justify-between">
                        <span>Tuition Fee</span>
                        <span className="font-mono tabular-nums">
                          {formatCurrency(v.tuitionAmount, currency)}
                        </span>
                      </div>
                      {v.otherCharges > 0 && (
                        <div className="flex justify-between">
                          <span>Other Charges</span>
                          <span className="font-mono tabular-nums">
                            {formatCurrency(v.otherCharges, currency)}
                          </span>
                        </div>
                      )}
                      {v.discountAmount > 0 && (
                        <div className="flex justify-between text-emerald-600">
                          <span>Discount</span>
                          <span className="font-mono tabular-nums">
                            -{formatCurrency(v.discountAmount, currency)}
                          </span>
                        </div>
                      )}
                      {v.lateFine > 0 && (
                        <div className="flex justify-between text-rose-600">
                          <span>Late Fine</span>
                          <span className="font-mono tabular-nums">
                            {formatCurrency(v.lateFine, currency)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between text-sm font-bold">
                      <span>Payable Total</span>
                      <span className="font-mono tabular-nums">
                        {formatCurrency(v.totalAmount, currency)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex justify-between pt-2">
                      <span>Status: {v.status.toUpperCase()}</span>
                      <span>Cashier Sign: ________</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {subTab === 'monthly' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 max-w-xl">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Generate Monthly Fee Vouchers
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Automatically bills active students using their configured tuition &amp; sibling discounts.
          </p>
          <form onSubmit={handleGenerateMonthly} className="mt-4 space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Target Class</label>
                <select
                  value={genClassId}
                  onChange={(e) => setGenClassId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="all">All Classes in Campus</option>
                  {campusClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.className} ({c.sectionName})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Billing Month</label>
                <input
                  type="month"
                  value={genMonthKey}
                  onChange={(e) => setGenMonthKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold mb-1">Fee Title</label>
                <input
                  value={genFeeType}
                  onChange={(e) => setGenFeeType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Extra Charges ({currency})</label>
                <input
                  type="number"
                  min={0}
                  value={genOtherCharges}
                  onChange={(e) => setGenOtherCharges(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Due Date</label>
                <input
                  type="date"
                  value={genDueDate}
                  onChange={(e) => setGenDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
            <div className="pt-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold cursor-pointer"
              >
                Generate Vouchers
              </button>
            </div>
          </form>
        </div>
      )}

      {subTab === 'custom' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 max-w-xl">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Generate Custom Student Fee
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Issue an individual voucher for exam fees, lab charges, books, or picnic trip.
          </p>
          <form onSubmit={handleGenerateCustom} className="mt-4 space-y-3 text-xs">
            <div>
              <label className="block font-semibold mb-1">Student</label>
              <select
                value={customStudentId || campusStudents[0]?.id || ''}
                onChange={(e) => setCustomStudentId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                {campusStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.studentCode} · {s.name} ({s.className})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Fee Description *</label>
                <input
                  required
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Amount ({currency}) *</label>
                <input
                  required
                  type="number"
                  min={1}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-700 text-white font-semibold cursor-pointer"
            >
              Issue Custom Voucher
            </button>
          </form>
        </div>
      )}

      {subTab === 'defaulters' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Fee Defaulters &amp; Receivables</h2>
              <p className="text-[11px] text-slate-500">{defaulters.length} student(s) with pending dues</p>
            </div>
            <div className="flex items-center gap-2 no-print">
              <button
                type="button"
                onClick={() => {
                  const header = 'Student Code,Student Name,Class,Unpaid Invoices,Total Receivable\n';
                  const rows = defaulters
                    .map(
                      (d) =>
                        `${d.studentCode},"${d.studentName.replaceAll('"', '""')}","${d.className}",${d.unpaidCount},${d.totalDue}`
                    )
                    .join('\n');
                  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `iqra-defaulters-${today}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  exportTableToPdf({
                    title: 'Fee Defaulters & Pending Receivables',
                    subtitle: `Campus: ${campusName} · Unpaid Balances Summary`,
                    filename: `fee-defaulters-${today}.pdf`,
                    headers: ['Student Code', 'Student Name', 'Class', 'Unpaid Invoices', 'Total Receivable'],
                    rows: defaulters.map((d) => [
                      d.studentCode,
                      d.studentName,
                      d.className,
                      `${d.unpaidCount} month(s)`,
                      formatCurrency(d.totalDue, currency, !showAmounts),
                    ]),
                    settings: db.settings,
                    campusName,
                    generatedDate: today,
                    summaryCards: [
                      { label: 'Defaulting Students', value: String(defaulters.length), tone: 'teal' },
                      {
                        label: 'Total Receivable',
                        value: formatCurrency(
                          defaulters.reduce((sum, d) => sum + d.totalDue, 0),
                          currency,
                          !showAmounts
                        ),
                        tone: 'rose',
                      },
                    ],
                  });
                  notify(`Downloaded Fee Defaulters PDF (${defaulters.length} students).`, 'success');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 text-xs font-semibold text-rose-700 dark:text-rose-300 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-blue-600" />
                <span>Print Defaulters</span>
              </button>
            </div>
          </div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <th className="py-3 px-4 font-semibold">Student Code</th>
                <th className="py-3 px-4 font-semibold">Student Name</th>
                <th className="py-3 px-4 font-semibold">Class</th>
                <th className="py-3 px-4 font-semibold text-right">Unpaid Invoices</th>
                <th className="py-3 px-4 font-semibold text-right">Total Receivable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {defaulters.map((d) => (
                <tr key={d.studentCode}>
                  <td className="py-3 px-4 font-mono">{d.studentCode}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                    {d.studentName}
                  </td>
                  <td className="py-3 px-4">{d.className}</td>
                  <td className="py-3 px-4 text-right tabular-nums">
                    <span className={d.unpaidCount >= 3 ? 'text-rose-600 font-bold' : ''}>
                      {d.unpaidCount} month(s)
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-rose-600">
                    {formatCurrency(d.totalDue, currency, !showAmounts)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Collect Payment Modal */}
      {payVoucher && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold">Collect Fee · {payVoucher.voucherNo}</h3>
              <button type="button" onClick={() => setPayVoucher(null)} aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCollectPayment} className="mt-4 space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 space-y-1">
                <div className="font-bold text-sm">{payVoucher.studentName}</div>
                <div className="text-slate-500">
                  {payVoucher.className} · {payVoucher.monthLabel}
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Amount Receiving ({currency})</label>
                <input
                  required
                  type="number"
                  min={1}
                  max={payVoucher.totalAmount - payVoucher.paidAmount}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option>Cash</option>
                  <option>Bank Transfer</option>
                  <option>JazzCash</option>
                  <option>Easypaisa</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setPayVoucher(null)} className="px-4 py-2 rounded-xl border border-slate-200">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold cursor-pointer">
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Fee Voucher Modal */}
      {editVoucher && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold">Edit Voucher · {editVoucher.voucherNo}</h3>
              <button type="button" onClick={() => setEditVoucher(null)} aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await mutate(
                  `/api/fees/${editVoucher.id}`,
                  'PATCH',
                  {
                    feeType: editVoucher.feeType,
                    dueDate: editVoucher.dueDate,
                    tuitionAmount: editVoucher.tuitionAmount,
                    otherCharges: editVoucher.otherCharges,
                    discountAmount: editVoucher.discountAmount,
                    lateFine: editVoucher.lateFine,
                  },
                  `Updated voucher ${editVoucher.voucherNo}.`
                );
                if (res.ok) setEditVoucher(null);
              }}
              className="mt-4 space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Fee Title</label>
                  <input
                    required
                    value={editVoucher.feeType}
                    onChange={(e) => setEditVoucher({ ...editVoucher, feeType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Due Date</label>
                  <input
                    type="date"
                    value={editVoucher.dueDate}
                    onChange={(e) => setEditVoucher({ ...editVoucher, dueDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Tuition ({currency})</label>
                  <input
                    type="number"
                    min={0}
                    value={editVoucher.tuitionAmount}
                    onChange={(e) => setEditVoucher({ ...editVoucher, tuitionAmount: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Other Charges ({currency})</label>
                  <input
                    type="number"
                    min={0}
                    value={editVoucher.otherCharges}
                    onChange={(e) => setEditVoucher({ ...editVoucher, otherCharges: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Discount ({currency})</label>
                  <input
                    type="number"
                    min={0}
                    value={editVoucher.discountAmount}
                    onChange={(e) => setEditVoucher({ ...editVoucher, discountAmount: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Late Fine ({currency})</label>
                  <input
                    type="number"
                    min={0}
                    value={editVoucher.lateFine}
                    onChange={(e) => setEditVoucher({ ...editVoucher, lateFine: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditVoucher(null)} className="px-4 py-2 rounded-xl border border-slate-200">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-teal-700 text-white font-semibold cursor-pointer">
                  Save Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
