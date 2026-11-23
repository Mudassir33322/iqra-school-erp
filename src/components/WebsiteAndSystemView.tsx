import React, { useEffect, useState } from 'react';
import {
  Activity,
  ArchiveRestore,
  CheckCircle2,
  DatabaseBackup,
  Download,
  FileSpreadsheet,
  Globe,
  History,
  Image as ImageIcon,
  LayoutGrid,
  MapPin,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import type { WebsiteConfig, WebsiteGalleryItem } from '../types/erp';
import { formatCurrency } from '../utils/erpLogic';

const DEFAULT_WEBSITE_CONFIG: WebsiteConfig = {
  heroHeadline: 'Iqra School System · Excellence in Character & STEM',
  heroSubheadline: 'Admissions Open for Session 2026–2027 · Nursery to Matric',
  aboutSchool:
    'A modern multi-campus institution integrating STEM laboratories, Islamic character building, digital parent portals, and biometric campus safety.',
  admissionsOpenBanner: true,
  visibleClasses: ['Nursery', 'Prep', 'Grade 1', 'Grade 5', 'Grade 9'],
  mapAddressLabel: 'Plot 14-B, Gulshan-e-Iqbal Block 13-D, Karachi',
  mapCoordinates: '24.9204° N, 67.0942° E',
  visitingHours: 'Mon – Sat · 08:00 AM – 02:30 PM',
  galleryItems: [
    {
      id: 'gal-1',
      title: 'Annual Science & Robotics Expo',
      category: 'Academics',
      caption: 'Grade 6–9 STEM showcase with working Arduino and AI demos.',
      visible: true,
    },
    {
      id: 'gal-2',
      title: 'Main Campus Digital Library',
      category: 'Facilities',
      caption: 'Over 4,500 reference books and quiet study terminals.',
      visible: true,
    },
    {
      id: 'gal-3',
      title: 'Smart Gate & Biometric Turnstiles',
      category: 'Campus Safety',
      caption: 'Automated QR badge & facial attendance with WhatsApp parent alerts.',
      visible: true,
    },
  ],
};

export const WebsiteAndSystemView: React.FC<{ mode: 'website' | 'system-tools' }> = ({ mode }) => {
  const { db, today, activeSubTab, mutate, notify, canPerform } = useErp();
  const canManageSettings = canPerform('manage_settings');

  // Website Management state
  const [webTab, setWebTab] = useState<'general' | 'gallery' | 'classes' | 'map'>(
    (activeSubTab as 'general' | 'gallery' | 'classes' | 'map') || 'general'
  );
  const [webCfg, setWebCfg] = useState<WebsiteConfig>(
    () => db?.settings.websiteConfig || DEFAULT_WEBSITE_CONFIG
  );
  const [newGalTitle, setNewGalTitle] = useState('');
  const [newGalCat, setNewGalCat] = useState('Campus Life');
  const [newGalCaption, setNewGalCaption] = useState('');

  // System Tools state
  const [sysTab, setSysTab] = useState<'backups' | 'import' | 'owner-summary' | 'audit' | 'logins'>(
    (activeSubTab as 'backups' | 'import' | 'owner-summary' | 'audit' | 'logins') || 'backups'
  );
  const [csvText, setCsvText] = useState(
    'Name,Father Name,Phone,Class,Fee\nBilal Ahmed,Shakeel Ahmed,0300-8899112,Grade 5,7800\nSana Tariq,Tariq Mehmood,0321-4455667,Grade 1,6500'
  );
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (mode === 'website' && activeSubTab && ['general', 'gallery', 'classes', 'map'].includes(activeSubTab)) {
      setWebTab(activeSubTab as 'general' | 'gallery' | 'classes' | 'map');
    }
    if (mode === 'system-tools' && activeSubTab && ['backups', 'import', 'owner-summary', 'audit', 'logins'].includes(activeSubTab)) {
      setSysTab(activeSubTab as 'backups' | 'import' | 'owner-summary' | 'audit' | 'logins');
    }
  }, [mode, activeSubTab]);

  useEffect(() => {
    if (db?.settings.websiteConfig) {
      setWebCfg(db.settings.websiteConfig);
    }
  }, [db?.settings.websiteConfig]);

  if (!db) return null;

  const uniqueClassNames = Array.from(new Set(db.classes.map((c) => c.className)));

  const saveWebsiteConfig = async (next: WebsiteConfig = webCfg) => {
    await mutate(
      '/api/settings',
      'PATCH',
      { websiteConfig: next },
      'Saved public school website settings.'
    );
  };

  const handleAddGalleryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGalTitle.trim()) return;
    const item: WebsiteGalleryItem = {
      id: `gal-${Date.now()}`,
      title: newGalTitle.trim(),
      category: newGalCat.trim() || 'Campus Life',
      caption: newGalCaption.trim() || 'Campus activity highlight',
      visible: true,
    };
    const next = { ...webCfg, galleryItems: [item, ...webCfg.galleryItems] };
    setWebCfg(next);
    setNewGalTitle('');
    setNewGalCaption('');
    await saveWebsiteConfig(next);
  };

  const toggleClassVisible = (clsName: string) => {
    const exists = webCfg.visibleClasses.includes(clsName);
    const nextClasses = exists
      ? webCfg.visibleClasses.filter((c) => c !== clsName)
      : [...webCfg.visibleClasses, clsName];
    setWebCfg({ ...webCfg, visibleClasses: nextClasses });
  };

  const handleDownloadBackup = () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iqra-erp-backup-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Downloaded full JSON database backup.', 'success');
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canManageSettings) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const snapshot = JSON.parse(String(reader.result || '{}'));
        await mutate('/api/system/restore', 'POST', { snapshot }, 'Restored database from backup snapshot.');
      } catch {
        notify('Invalid JSON backup file selected.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const rows = lines
      .filter((l, idx) => !(idx === 0 && l.toLowerCase().startsWith('name,')))
      .map((line) => {
        const [name, fatherName, parentPhone, className, fee] = line.split(',').map((s) => s?.trim());
        return {
          name,
          fatherName,
          parentPhone,
          className,
          monthlyFee: Number(fee) || 0,
        };
      })
      .filter((r) => r.name && r.fatherName);

    if (rows.length === 0) {
      notify('No valid student rows found in CSV.', 'error');
      return;
    }
    setImporting(true);
    const res = await mutate<{ importedCount: number }>(
      '/api/system/import-students',
      'POST',
      { rows },
      `Imported ${rows.length} student record(s) cleanly.`
    );
    setImporting(false);
    if (res.ok) notify(`Imported ${res.data?.importedCount ?? rows.length} students into register.`, 'success');
  };

  if (mode === 'website') {
    const webTabs = [
      { id: 'general' as const, label: 'General Settings', icon: Globe },
      { id: 'gallery' as const, label: 'Gallery Settings', icon: ImageIcon },
      { id: 'classes' as const, label: 'Classes To Show', icon: LayoutGrid },
      { id: 'map' as const, label: 'Address & Map', icon: MapPin },
    ];

    return (
      <div className="space-y-5 max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Website Management</h1>
              <p className="text-xs text-slate-500">
                Customize your public school showcase, open admissions banner, photo gallery, and campus map.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void saveWebsiteConfig()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Website Changes</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {webTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setWebTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                  webTab === tab.id
                    ? 'bg-teal-700 text-white'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {webTab === 'general' && (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">Public Hero Headline</label>
                <input
                  type="text"
                  value={webCfg.heroHeadline}
                  onChange={(e) => setWebCfg({ ...webCfg, heroHeadline: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">Admissions Banner Sub-headline</label>
                <input
                  type="text"
                  value={webCfg.heroSubheadline}
                  onChange={(e) => setWebCfg({ ...webCfg, heroSubheadline: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">About School Overview</label>
                <textarea
                  rows={3}
                  value={webCfg.aboutSchool}
                  onChange={(e) => setWebCfg({ ...webCfg, aboutSchool: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 sm:col-span-2 cursor-pointer">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    Show &ldquo;Apply For Admission&rdquo; Banner on Portal
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Allows parents to submit online admission inquiries directly from the landing page.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={webCfg.admissionsOpenBanner}
                  onChange={(e) => setWebCfg({ ...webCfg, admissionsOpenBanner: e.target.checked })}
                  className="rounded accent-teal-700"
                />
              </label>
            </div>
          </div>
        )}

        {webTab === 'gallery' && (
          <div className="space-y-4 text-xs">
            <form
              onSubmit={handleAddGalleryItem}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 grid grid-cols-1 sm:grid-cols-4 gap-3"
            >
              <input
                type="text"
                required
                placeholder="Gallery Album Title"
                value={newGalTitle}
                onChange={(e) => setNewGalTitle(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                placeholder="Category (e.g. Sports Day)"
                value={newGalCat}
                onChange={(e) => setNewGalCat(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                placeholder="Short Caption"
                value={newGalCaption}
                onChange={(e) => setNewGalCaption(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 text-white font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Showcase Card</span>
              </button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {webCfg.galleryItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-semibold text-[11px]">
                        {item.category}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = {
                            ...webCfg,
                            galleryItems: webCfg.galleryItems.filter((g) => g.id !== item.id),
                          };
                          setWebCfg(next);
                        }}
                        aria-label={`Remove ${item.title}`}
                        className="text-rose-500 hover:bg-rose-50 p-1 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">{item.title}</h3>
                    <p className="text-slate-500 mt-1">{item.caption}</p>
                  </div>
                  <label className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 cursor-pointer">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">Visible on Website</span>
                    <input
                      type="checkbox"
                      checked={item.visible}
                      onChange={(e) =>
                        setWebCfg({
                          ...webCfg,
                          galleryItems: webCfg.galleryItems.map((g) =>
                            g.id === item.id ? { ...g, visible: e.target.checked } : g
                          ),
                        })
                      }
                      className="rounded accent-teal-700"
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {webTab === 'classes' && (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3 text-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Classes Displayed on Public Prospectus &amp; Admissions
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {uniqueClassNames.map((clsName) => {
                const checked = webCfg.visibleClasses.includes(clsName);
                return (
                  <label
                    key={clsName}
                    className={`flex items-center justify-between gap-2 p-3 rounded-xl border cursor-pointer ${
                      checked
                        ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <span>{clsName}</span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleClassVisible(clsName)}
                      className="rounded accent-teal-700"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {webTab === 'map' && (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-semibold mb-1">Public Campus Street Address</label>
              <input
                type="text"
                value={webCfg.mapAddressLabel}
                onChange={(e) => setWebCfg({ ...webCfg, mapAddressLabel: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">GPS Coordinates</label>
              <input
                type="text"
                value={webCfg.mapCoordinates}
                onChange={(e) => setWebCfg({ ...webCfg, mapCoordinates: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Campus Visiting Hours</label>
              <input
                type="text"
                value={webCfg.visitingHours}
                onChange={(e) => setWebCfg({ ...webCfg, visitingHours: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // System Tools (Backups, Import Data, Owner Daily Summary, Audit Log, Login Logs)
  const sysTabs = [
    { id: 'backups' as const, label: 'Backups & Restore', icon: DatabaseBackup },
    { id: 'import' as const, label: 'Import Data (CSV)', icon: FileSpreadsheet },
    { id: 'owner-summary' as const, label: 'Owner Daily Summary', icon: Activity },
    { id: 'audit' as const, label: 'Audit Log', icon: ShieldCheck },
    { id: 'logins' as const, label: 'Login Logs', icon: History },
  ];

  const todayIncome = db.ledger
    .filter((l) => l.date === today && l.type === 'income')
    .reduce((s, l) => s + l.amount, 0);
  const todayExpense = db.ledger
    .filter((l) => l.date === today && l.type === 'expense')
    .reduce((s, l) => s + l.amount, 0);
  const totalReceivable = db.vouchers
    .filter((v) => v.status !== 'paid')
    .reduce((s, v) => s + Math.max(0, v.totalAmount - v.paidAmount), 0);

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
          <ArchiveRestore className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">System Administration &amp; Logs</h1>
          <p className="text-xs text-slate-500">
            Database backups, bulk CSV student import, owner daily briefing, audit trail, and sign-in history.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {sysTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSysTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                sysTab === tab.id
                  ? 'bg-teal-700 text-white'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {sysTab === 'backups' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Download Full Campus Backup</h2>
            <p className="text-slate-500">
              Exports all students, parents, fee vouchers, attendance logs, marks, settings, and user preferences as a JSON archive.
            </p>
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-700 text-white font-semibold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download JSON Backup ({db.students.length} Students)</span>
            </button>
          </div>
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Restore Snapshot</h2>
            <p className="text-slate-500">
              Upload a previously exported ERP JSON backup file to restore records across campuses.
            </p>
            <label className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
              <Upload className="w-3.5 h-3.5 text-teal-700" />
              <span>Select Backup JSON File</span>
              <input type="file" accept=".json,application/json" onChange={handleRestoreFile} className="hidden" />
            </label>
          </div>
        </div>
      )}

      {sysTab === 'import' && (
        <form
          onSubmit={handleImportCsv}
          className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs"
        >
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Bulk Import Students (CSV)</h2>
            <p className="text-slate-500">
              Format: <code className="font-mono">Name,Father Name,Phone,Class,Fee</code> (one student per line)
            </p>
          </div>
          <textarea
            rows={6}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs"
          />
          <button
            type="submit"
            disabled={importing}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-700 text-white font-semibold cursor-pointer disabled:opacity-60"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{importing ? 'Importing...' : 'Run Bulk Student Import'}</span>
          </button>
        </form>
      )}

      {sysTab === 'owner-summary' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-slate-500">Today&apos;s Income</div>
            <div className="text-xl font-bold text-emerald-600 mt-1 tabular-nums">
              {formatCurrency(todayIncome, db.settings.currency, true)}
            </div>
          </div>
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-slate-500">Today&apos;s Expenses</div>
            <div className="text-xl font-bold text-rose-600 mt-1 tabular-nums">
              {formatCurrency(todayExpense, db.settings.currency, true)}
            </div>
          </div>
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-slate-500">Total Fee Receivable</div>
            <div className="text-xl font-bold text-amber-600 mt-1 tabular-nums">
              {formatCurrency(totalReceivable, db.settings.currency, true)}
            </div>
          </div>
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-slate-500">Active Students / Staff</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
              {db.students.filter((s) => s.status === 'active').length} / {db.staff.length}
            </div>
          </div>
        </div>
      )}

      {sysTab === 'audit' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500">
                <tr>
                  <th className="py-2.5 px-4 text-left">Timestamp</th>
                  <th className="py-2.5 px-4 text-left">Actor</th>
                  <th className="py-2.5 px-4 text-left">Role</th>
                  <th className="py-2.5 px-4 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(db.auditLogs || []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No API mutations recorded in this session yet.
                    </td>
                  </tr>
                ) : (
                  (db.auditLogs || []).map((a) => (
                    <tr key={a.id}>
                      <td className="py-2.5 px-4 font-mono text-slate-500">{a.timestamp}</td>
                      <td className="py-2.5 px-4 font-semibold">{a.actorName}</td>
                      <td className="py-2.5 px-4">{a.actorRole}</td>
                      <td className="py-2.5 px-4 font-mono text-teal-700 dark:text-teal-400">{a.summary}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sysTab === 'logins' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500">
                <tr>
                  <th className="py-2.5 px-4 text-left">Timestamp</th>
                  <th className="py-2.5 px-4 text-left">User</th>
                  <th className="py-2.5 px-4 text-left">Email / Code</th>
                  <th className="py-2.5 px-4 text-left">Role</th>
                  <th className="py-2.5 px-4 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(db.loginLogs || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      Sign-ins appear here automatically as portals are accessed.
                    </td>
                  </tr>
                ) : (
                  (db.loginLogs || []).map((l) => (
                    <tr key={l.id}>
                      <td className="py-2.5 px-4 font-mono text-slate-500">{l.timestamp}</td>
                      <td className="py-2.5 px-4 font-semibold">{l.userName}</td>
                      <td className="py-2.5 px-4 font-mono">{l.email}</td>
                      <td className="py-2.5 px-4">{l.role}</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold">
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
