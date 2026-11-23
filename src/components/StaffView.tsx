import React, { useEffect, useState } from 'react';
import { Banknote, CheckCircle2, CreditCard, Download, Pencil, Plus, Printer, Search, Trash2, X } from 'lucide-react';
import { useErp } from '../context/ErpContext';
import type { Gender, StaffMember } from '../types/erp';
import { formatCurrency, summarizeStaffPayroll } from '../utils/erpLogic';

export const StaffView: React.FC<{ initialRoleFilter?: 'all' | 'Accountant' }> = ({
  initialRoleFilter = 'all',
}) => {
  const { db, today, activeCampusId, showAmounts, mutate, canPerform } = useErp();
  const canManageStaff = canPerform('manage_staff');
  const canManagePayroll = canPerform('manage_payroll');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [slipStaff, setSlipStaff] = useState<StaffMember | null>(null);
  const [roleFilter, setRoleFilter] = useState<'all' | 'Accountant'>(initialRoleFilter);
  const [search, setSearch] = useState('');

  const [name, setName] = useState('');
  const [role, setRole] = useState<StaffMember['role']>('Teacher');
  const [department, setDepartment] = useState('Science');
  const [gender, setGender] = useState<Gender>('female');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [salary, setSalary] = useState('55000');

  useEffect(() => {
    setRoleFilter(initialRoleFilter);
  }, [initialRoleFilter]);

  if (!db) return null;

  const currency = db.settings.currency || 'Rs';
  const currentMonthKey = today.slice(0, 7);
  const q = search.trim().toLowerCase();
  const staffList = db.staff.filter(
    (s) =>
      (activeCampusId === 'all' || s.campusId === activeCampusId) &&
      (roleFilter === 'all' || s.role === roleFilter) &&
      (!q ||
        s.name.toLowerCase().includes(q) ||
        s.employeeCode.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q))
  );
  const payroll = summarizeStaffPayroll(staffList, currentMonthKey);

  const openNew = () => {
    setEditingId(null);
    setName('');
    setRole(roleFilter === 'Accountant' ? 'Accountant' : 'Teacher');
    setDepartment(roleFilter === 'Accountant' ? 'Finance & Accounts' : 'Science');
    setGender('female');
    setPhone('');
    setEmail('');
    setSalary('55000');
    setModalOpen(true);
  };

  const openEdit = (stf: StaffMember) => {
    setEditingId(stf.id);
    setName(stf.name);
    setRole(stf.role);
    setDepartment(stf.department);
    setGender(stf.gender);
    setPhone(stf.phone);
    setEmail(stf.email);
    setSalary(String(stf.salary));
    setModalOpen(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      campusId: activeCampusId === 'all' ? db.campuses[0]?.id : activeCampusId,
      name,
      role,
      department,
      gender,
      phone,
      email,
      salary: Number(salary) || 50000,
    };
    const res = editingId
      ? await mutate(`/api/staff/${editingId}`, 'PATCH', payload, `Updated ${name} profile.`)
      : await mutate('/api/staff', 'POST', payload, `Added ${name} to staff directory.`);
    if (res.ok) {
      setModalOpen(false);
      setEditingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {roleFilter === 'Accountant' ? 'Accountants & Finance Officers' : 'Staff Management & Payroll'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {staffList.length} staff members · Monthly Payroll:{' '}
              {formatCurrency(payroll.totalMonthlyPayroll, currency, !showAmounts)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, role or code..."
              className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs w-48"
            />
          </div>
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                roleFilter === 'all' ? 'bg-white dark:bg-slate-700 shadow-2xs' : 'text-slate-500'
              }`}
            >
              All Staff
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('Accountant')}
              className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                roleFilter === 'Accountant' ? 'bg-white dark:bg-slate-700 shadow-2xs' : 'text-slate-500'
              }`}
            >
              Accountants
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              const header = 'Employee Code,Name,Role,Department,Phone,Email,Salary,Last Paid Month\n';
              const rows = staffList
                .map(
                  (s) =>
                    `${s.employeeCode},"${s.name.replaceAll('"', '""')}",${s.role},"${s.department}",${s.phone},${s.email},${s.salary},${s.lastPaidMonth || 'Unpaid'}`
                )
                .join('\n');
              const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `iqra-staff-payroll-${today}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            <span>Print Directory</span>
          </button>
          {canManageStaff && (
            <button
              type="button"
              onClick={openNew}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Staff Member</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-slate-500">Monthly Payroll Budget</div>
          <div className="text-xl font-bold font-mono tabular-nums mt-1">
            {formatCurrency(payroll.totalMonthlyPayroll, currency, !showAmounts)}
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-slate-500">Salaries Paid ({currentMonthKey})</div>
          <div className="text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">
            {payroll.paidCount} staff
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-slate-500">Pending Disbursement</div>
          <div className="text-xl font-bold tabular-nums text-amber-700 dark:text-amber-400 mt-1">
            {payroll.pendingCount} staff
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
              <th className="py-3 px-4 font-semibold">Code</th>
              <th className="py-3 px-4 font-semibold">Name</th>
              <th className="py-3 px-4 font-semibold">Role &amp; Dept</th>
              <th className="py-3 px-4 font-semibold">Phone</th>
              <th className="py-3 px-4 font-semibold text-right">Salary</th>
              <th className="py-3 px-4 font-semibold text-right">Payroll ({currentMonthKey})</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {staffList.map((stf) => {
              const isPaid = stf.lastPaidMonth === currentMonthKey;
              return (
                <tr key={stf.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-3 px-4 font-mono font-semibold text-teal-700 dark:text-teal-400">
                    {stf.employeeCode}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                    {stf.name}
                  </td>
                  <td className="py-3 px-4">
                    {stf.role} · {stf.department}
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums">{stf.phone}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                    {formatCurrency(stf.salary, currency, !showAmounts)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {isPaid ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Paid
                      </span>
                    ) : canManagePayroll ? (
                      <button
                        type="button"
                        onClick={() =>
                          void mutate(
                            `/api/staff/${stf.id}/pay`,
                            'POST',
                            { monthKey: currentMonthKey, paymentMethod: 'Bank Transfer' },
                            `Paid ${stf.name}'s salary and logged expense.`
                          )
                        }
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer"
                      >
                        <Banknote className="w-3.5 h-3.5" />
                        Pay Salary
                      </button>
                    ) : (
                      <span className="text-amber-600 font-semibold">Pending</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap no-print">
                    <button
                      type="button"
                      onClick={() => setSlipStaff(stf)}
                      aria-label={`Salary slip ${stf.name}`}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
                    >
                      <Printer className="w-3 h-3 text-blue-600" />
                      Slip
                    </button>
                    {canManageStaff && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(stf)}
                          aria-label={`Edit staff ${stf.name}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void mutate(`/api/staff/${stf.id}`, 'DELETE', undefined, `Removed ${stf.name} from staff.`)
                          }
                          aria-label={`Delete staff ${stf.name}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold">
                {editingId ? 'Edit Staff Member' : 'Add Staff Member'}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveStaff} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Full Name *</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as StaffMember['role'])}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option>Teacher</option>
                    <option>Coordinator</option>
                    <option>Accountant</option>
                    <option>Front Desk</option>
                    <option>Admin</option>
                    <option>Librarian</option>
                    <option>Driver</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Department</label>
                  <input
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Monthly Salary ({currency}) *</label>
                  <input
                    required
                    type="number"
                    min={1000}
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Phone *</label>
                  <input
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0300-1234567"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-teal-700 text-white font-semibold cursor-pointer">
                  {editingId ? 'Save Changes' : 'Save Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {slipStaff && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold">{db.settings.schoolName} · Salary Slip</h3>
                <p className="text-xs text-slate-500">Pay Period: {currentMonthKey}</p>
              </div>
              <button type="button" onClick={() => setSlipStaff(null)} aria-label="Close salary slip" className="no-print">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Employee Name</span>
                <span className="font-bold">{slipStaff.name} ({slipStaff.employeeCode})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Designation</span>
                <span className="font-semibold">{slipStaff.role} · {slipStaff.department}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Basic Monthly Salary</span>
                <span className="font-mono font-bold">{formatCurrency(slipStaff.salary, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Deductions</span>
                <span className="font-mono">{formatCurrency(0, currency)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-200 dark:border-slate-700">
                <span>Net Payable</span>
                <span className="font-mono text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(slipStaff.salary, currency)}
                </span>
              </div>
              <div className="flex justify-between pt-4 text-[11px] text-slate-500">
                <span>Status: {slipStaff.lastPaidMonth === currentMonthKey ? 'PAID' : 'PENDING'}</span>
                <span>Accounts Sign: _________</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 no-print">
              <button type="button" onClick={() => setSlipStaff(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold">
                Close
              </button>
              <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold cursor-pointer">
                <Printer className="w-3.5 h-3.5" />
                Print Salary Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
