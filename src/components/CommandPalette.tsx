import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Search, Users, X } from 'lucide-react';
import { PAGE_LABELS, useErp } from '../context/ErpContext';
import type { AppPageId } from '../types/erp';

export const CommandPalette: React.FC = () => {
  const { db, searchOpen, setSearchOpen, navigateTo, canVisitPage } = useErp();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!searchOpen) setQuery('');
  }, [searchOpen]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pages = (Object.keys(PAGE_LABELS) as AppPageId[])
      .filter((id) => canVisitPage(id))
      .map((id) => ({ id, label: PAGE_LABELS[id] }))
      .filter((p) => !q || p.label.toLowerCase().includes(q));

    const students = canVisitPage('students')
      ? (db?.students ?? [])
          .filter(
            (s) =>
              !q ||
              s.name.toLowerCase().includes(q) ||
              s.studentCode.toLowerCase().includes(q) ||
              s.fatherName.toLowerCase().includes(q) ||
              s.parentPhone.includes(q)
          )
          .slice(0, 6)
      : [];

    const staff = canVisitPage('staff')
      ? (db?.staff ?? [])
          .filter(
            (s) =>
              !q ||
              s.name.toLowerCase().includes(q) ||
              s.employeeCode.toLowerCase().includes(q) ||
              s.role.toLowerCase().includes(q)
          )
          .slice(0, 4)
      : [];

    return { pages: pages.slice(0, 6), students, staff };
  }, [db, query, canVisitPage]);

  if (!searchOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global Command Search"
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-start justify-center pt-20 p-4"
      onClick={() => setSearchOpen(false)}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-4 h-4 text-teal-600 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search accessible pages, students, or staff..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setSearchOpen(false)}
            aria-label="Close search"
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-3 space-y-4">
          {results.pages.length > 0 && (
            <div>
              <div className="px-2 pb-1 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                Pages
              </div>
              <div className="space-y-0.5">
                {results.pages.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      navigateTo(p.id);
                      setSearchOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <span>{p.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.students.length > 0 && (
            <div>
              <div className="px-2 pb-1 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                Students
              </div>
              <div className="space-y-0.5">
                {results.students.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      navigateTo('students');
                      setSearchOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Users className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span className="truncate font-medium">{s.name}</span>
                      <span className="text-xs text-slate-400 font-mono">{s.studentCode}</span>
                    </span>
                    <span className="text-xs text-slate-500">
                      {s.className} · {s.sectionName}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.staff.length > 0 && (
            <div>
              <div className="px-2 pb-1 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                Staff
              </div>
              <div className="space-y-0.5">
                {results.staff.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      navigateTo('staff');
                      setSearchOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <span className="truncate font-medium">{st.name}</span>
                    <span className="text-xs text-slate-500">
                      {st.role} · {st.employeeCode}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
