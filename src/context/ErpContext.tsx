import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { AppPageId, ErpDatabase, UiPreferences, UserRole } from '../types/erp';
import { canAccessPage, canPerformPermission, type ErpPermission } from '../utils/rbac';
import {
  applyUiPreferencesToDom,
  DEFAULT_UI_PREFERENCES,
  resolveEffectiveDark,
} from '../utils/i18n';
import {
  applyOptimisticOfflineMutation,
  describeMutationForQueue,
  enqueueOfflineMutation,
  loadOfflineDbSnapshot,
  loadOfflineQueue,
  removeOfflineMutation,
  saveOfflineDbSnapshot,
  saveOfflineQueue,
  type OfflineMutationItem,
} from '../utils/offlineSync';

export interface AuthUser {
  name: string;
  email: string;
  role: UserRole;
  avatarInitial: string;
  staffId?: string;
  parentId?: string;
  studentId?: string;
  studentCode?: string;
  linkedStudentIds?: string[];
}

export interface WorkspaceTab {
  id: AppPageId;
  label: string;
}

export const PAGE_LABELS: Record<AppPageId, string> = {
  dashboard: 'Dashboard',
  'today-activity': "Today's Activity",
  visitors: 'Gate & Visitors',
  admissions: 'Manage Admissions',
  students: 'Student Information',
  parents: 'Parent Accounts',
  staff: 'Staff Management',
  accountants: 'Accountants',
  complaints: 'Parent Complaints',
  leaves: 'Leave Management',
  tasks: 'Task Management',
  health: 'Student Health',
  'id-cards': 'ID Card Printing',
  classes: 'Classes & Sections',
  subjects: 'Manage Subjects',
  ptm: 'Parent–Teacher Meetings',
  attendance: 'Student Attendance',
  'face-attendance': 'Face Attendance',
  'card-attendance': 'Card / QR Attendance',
  'staff-attendance': 'Staff Attendance',
  timetable: 'Timetable Management',
  calendar: 'Academic Calendar',
  homework: 'Daily Homework Diary',
  fees: 'Fee Payment',
  accounting: 'Accounting',
  expenses: 'Expense Management',
  reports: 'Reporting Area',
  inventory: 'Stock & Inventory',
  exams: 'Exam Management',
  certification: 'Certification & TC',
  noticeboard: 'School Noticeboard',
  messaging: 'SMS & WhatsApp Alerts',
  library: 'Library',
  transport: 'Transport',
  hostel: 'Hostel',
  website: 'Website Management',
  'system-tools': 'System & Logs',
  settings: 'Settings',
};

interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error' | 'info';
}

interface ErpContextValue {
  user: AuthUser | null;
  db: ErpDatabase | null;
  today: string;
  loading: boolean;
  error: string | null;
  activeCampusId: string;
  setActiveCampusId: (id: string) => void;
  activePage: AppPageId;
  activeSubTab: string | null;
  activeNavKey: string;
  navigateTo: (page: AppPageId, subTab?: string, navKey?: string) => void;
  openTabs: WorkspaceTab[];
  closeTab: (page: AppPageId) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  uiPrefs: UiPreferences;
  updateUiPrefs: (partial: Partial<UiPreferences>) => void;
  resetUiPrefs: () => void;
  customizeOpen: boolean;
  setCustomizeOpen: (v: boolean) => void;
  showAmounts: boolean;
  toggleShowAmounts: () => void;
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
  canPerform: (perm: ErpPermission) => boolean;
  canVisitPage: (page: AppPageId) => boolean;
  login: (identifier: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  refreshState: () => Promise<void>;
  mutate: <T = unknown>(
    url: string,
    method: 'POST' | 'PATCH' | 'DELETE',
    body?: unknown,
    successMsg?: string
  ) => Promise<{ ok: boolean; data?: T; error?: string }>;
  isOnline: boolean;
  simulatedOffline: boolean;
  toggleSimulatedOffline: () => void;
  syncQueue: OfflineMutationItem[];
  syncing: boolean;
  lastSyncedAt: string | null;
  syncNow: () => Promise<void>;
  removeQueuedItem: (id: string) => void;
  clearSyncQueue: () => void;
  notify: (text: string, type?: 'success' | 'error' | 'info') => void;
  toasts: ToastMessage[];
  dismissToast: (id: number) => void;
}

const ErpContext = createContext<ErpContextValue | null>(null);

const PREFS_STORAGE_KEY = 'iqra_erp_ui_prefs_v1';

function loadLocalUiPrefs(): UiPreferences {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) {
      const legacyDark = localStorage.getItem('iqra_erp_dark') === 'true';
      return { ...DEFAULT_UI_PREFERENCES, themeMode: legacyDark ? 'dark' : 'light' };
    }
    return { ...DEFAULT_UI_PREFERENCES, ...(JSON.parse(raw) as Partial<UiPreferences>) };
  } catch {
    return DEFAULT_UI_PREFERENCES;
  }
}

export const ErpProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const tokenRef = useRef<string | null>(null);

  const [db, setDb] = useState<ErpDatabase | null>(null);
  const [today, setToday] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCampusId, setActiveCampusId] = useState<string>('campus-main');
  const [activePage, setActivePage] = useState<AppPageId>('dashboard');
  const [activeSubTab, setActiveSubTab] = useState<string | null>(null);
  const [activeNavKey, setActiveNavKey] = useState<string>('dashboard');
  const [openTabs, setOpenTabs] = useState<WorkspaceTab[]>([{ id: 'dashboard', label: 'Dashboard' }]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [showAmounts, setShowAmounts] = useState<boolean>(true);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [customizeOpen, setCustomizeOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [simulatedOffline, setSimulatedOffline] = useState<boolean>(false);
  const [syncQueue, setSyncQueue] = useState<OfflineMutationItem[]>(() => loadOfflineQueue());
  const [syncing, setSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const [uiPrefs, setUiPrefs] = useState<UiPreferences>(() => loadLocalUiPrefs());
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const darkMode = resolveEffectiveDark(uiPrefs.themeMode, systemPrefersDark);

  useEffect(() => {
    applyUiPreferencesToDom(uiPrefs);
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(uiPrefs));
    } catch {
      // ignore
    }
  }, [uiPrefs, systemPrefersDark]);

  // Hydrate user's saved account preferences across devices when DB loads for a signed-in user
  const hydratedAccountRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user || !db?.userPreferences) return;
    const acctKey = user.email.toLowerCase();
    if (hydratedAccountRef.current === acctKey) return;
    const savedForUser = db.userPreferences[acctKey];
    hydratedAccountRef.current = acctKey;
    if (savedForUser) {
      setUiPrefs((prev) => ({ ...prev, ...savedForUser }));
    }
  }, [user, db]);

  useEffect(() => {
    saveOfflineQueue(syncQueue);
  }, [syncQueue]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const persistPrefsToServer = useCallback((nextPrefs: UiPreferences) => {
    if (!tokenRef.current) return;
    void fetch('/api/preferences', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenRef.current}`,
      },
      body: JSON.stringify(nextPrefs),
    }).catch(() => {
      // keep local copy cleanly if temporarily offline
    });
  }, []);

  const updateUiPrefs = useCallback(
    (partial: Partial<UiPreferences>) => {
      setUiPrefs((prev) => {
        const next: UiPreferences = {
          ...prev,
          ...partial,
          updatedAt: new Date().toISOString(),
        };
        persistPrefsToServer(next);
        return next;
      });
    },
    [persistPrefsToServer]
  );

  const resetUiPrefs = useCallback(() => {
    const next: UiPreferences = {
      ...DEFAULT_UI_PREFERENCES,
      updatedAt: new Date().toISOString(),
    };
    setUiPrefs(next);
    persistPrefsToServer(next);
  }, [persistPrefsToServer]);

  const toggleDarkMode = useCallback(() => {
    updateUiPrefs({ themeMode: darkMode ? 'light' : 'dark' });
  }, [darkMode, updateUiPrefs]);

  const toggleShowAmounts = useCallback(() => {
    setShowAmounts((prev) => !prev);
  }, []);

  const toggleSimulatedOffline = useCallback(() => {
    setSimulatedOffline((prev) => !prev);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (text: string, type: 'success' | 'error' | 'info' = 'success') => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((prev) => [...prev.slice(-3), { id, text, type }]);
      setTimeout(() => {
        dismissToast(id);
      }, 3600);
    },
    [dismissToast]
  );

  const refreshState = useCallback(async (overrideToken?: string) => {
    const activeToken = overrideToken ?? tokenRef.current;
    if (!activeToken) return;
    try {
      setLoading(true);
      const res = await fetch('/api/state', {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (!res.ok) throw new Error('Unable to load school ERP data.');
      const payload = (await res.json()) as { db: ErpDatabase; today: string };
      setDb(payload.db);
      saveOfflineDbSnapshot(payload.db);
      setLastSyncedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setToday(payload.today);
      setError(null);
    } catch (err) {
      const cached = loadOfflineDbSnapshot();
      if (cached) {
        setDb(cached);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load data.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        void (async () => {
          setLoading(true);
          const res = await fetch('/api/auth/autostart', { method: 'POST' });
          if (res.ok) {
            const data = (await res.json()) as { user: AuthUser; token: string };
            tokenRef.current = data.token;
            setUser(data.user);
            await refreshState(data.token);
          } else {
            setLoading(false);
          }
        })();
      }
    } catch {
      // ignore
    }
  }, [refreshState]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const canPerform = useCallback(
    (perm: ErpPermission) => (user ? canPerformPermission(user.role, perm) : false),
    [user]
  );

  const canVisitPage = useCallback(
    (page: AppPageId) => (user ? canAccessPage(user.role, page) : false),
    [user]
  );

  const navigateTo = useCallback(
    (page: AppPageId, subTab?: string, navKey?: string) => {
      if (user && !canAccessPage(user.role, page)) {
        notify(`This module is restricted for ${user.role} role.`, 'info');
        return;
      }
      setActivePage(page);
      setActiveSubTab(subTab ?? null);
      setActiveNavKey(navKey ?? page);
      setMobileMenuOpen(false);
      setOpenTabs((prev) => {
        if (prev.some((t) => t.id === page)) return prev;
        return [...prev.slice(-6), { id: page, label: PAGE_LABELS[page] }];
      });
    },
    [user, notify]
  );

  const closeTab = useCallback(
    (page: AppPageId) => {
      if (page === 'dashboard') return;
      setOpenTabs((prev) => {
        const filtered = prev.filter((t) => t.id !== page);
        if (activePage === page) {
          const next = filtered[filtered.length - 1]?.id ?? 'dashboard';
          setActivePage(next);
        }
        return filtered.length > 0 ? filtered : [{ id: 'dashboard', label: 'Dashboard' }];
      });
    },
    [activePage]
  );

  const login = useCallback(
    async (identifier: string, password: string) => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password }),
        });
        const data = (await res.json()) as { user?: AuthUser; token?: string; error?: string };
        if (!res.ok || !data.user || !data.token) {
          return { ok: false, error: data.error || 'Sign in failed.' };
        }
        tokenRef.current = data.token;
        setUser(data.user);
        setActivePage('dashboard');
        setActiveSubTab(null);
        setActiveNavKey('dashboard');
        setOpenTabs([{ id: 'dashboard', label: 'Dashboard' }]);
        await refreshState(data.token);
        return { ok: true };
      } catch {
        return { ok: false, error: 'Network error while signing in.' };
      }
    },
    [refreshState]
  );

  const logout = useCallback(() => {
    tokenRef.current = null;
    hydratedAccountRef.current = null;
    setUser(null);
    setDb(null);
    setActivePage('dashboard');
    setActiveSubTab(null);
    setActiveNavKey('dashboard');
    setOpenTabs([{ id: 'dashboard', label: 'Dashboard' }]);
  }, []);

  const queueOfflineFallback = useCallback(
    <T,>(url: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown): { ok: boolean; data?: T; error?: string } => {
      let responseData: T | undefined;
      if (db) {
        const applied = applyOptimisticOfflineMutation(db, method, url, body, today);
        setDb(applied.db);
        saveOfflineDbSnapshot(applied.db);
        responseData = applied.responseData as T | undefined;
      }
      setSyncQueue((prev) =>
        enqueueOfflineMutation(prev, {
          url,
          method,
          body,
          summary: describeMutationForQueue(method, url),
        })
      );
      notify('Saved offline — queued for server sync.', 'info');
      return { ok: true, data: responseData };
    },
    [db, today, notify]
  );

  const mutate = useCallback(
    async <T = unknown>(
      url: string,
      method: 'POST' | 'PATCH' | 'DELETE',
      body?: unknown,
      successMsg?: string
    ): Promise<{ ok: boolean; data?: T; error?: string }> => {
      if (!isOnline || simulatedOffline) {
        return queueOfflineFallback<T>(url, method, body);
      }
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (tokenRef.current) {
          headers.Authorization = `Bearer ${tokenRef.current}`;
        }
        const res = await fetch(url, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        const data = (await res.json()) as T & { db?: ErpDatabase; error?: string };
        if (!res.ok) {
          const msg = data.error || 'Operation failed.';
          notify(msg, 'error');
          return { ok: false, error: msg };
        }
        if (data.db) {
          setDb(data.db);
          saveOfflineDbSnapshot(data.db);
          setLastSyncedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
        if (successMsg) {
          notify(successMsg, 'success');
        }
        return { ok: true, data };
      } catch {
        return queueOfflineFallback<T>(url, method, body);
      }
    },
    [isOnline, simulatedOffline, queueOfflineFallback, notify]
  );

  const syncNow = useCallback(async () => {
    if (syncing || !tokenRef.current) return;
    if (!isOnline || simulatedOffline) {
      notify('Reconnect to network or disable Offline Queue Mode before syncing.', 'info');
      return;
    }
    const items = loadOfflineQueue();
    if (items.length === 0) {
      await refreshState();
      return;
    }
    setSyncing(true);
    let syncedCount = 0;
    const remaining: OfflineMutationItem[] = [];
    for (const item of items) {
      try {
        const res = await fetch(item.url, {
          method: item.method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenRef.current}`,
          },
          body: item.body !== undefined ? JSON.stringify(item.body) : undefined,
        });
        if (!res.ok) {
          const d = (await res.json().catch(() => ({}))) as { error?: string };
          remaining.push({ ...item, status: 'failed', error: d.error || 'Server rejected mutation' });
        } else {
          syncedCount += 1;
          const d = (await res.json().catch(() => ({}))) as { db?: ErpDatabase };
          if (d.db) {
            setDb(d.db);
            saveOfflineDbSnapshot(d.db);
          }
        }
      } catch {
        remaining.push({ ...item, status: 'failed', error: 'Connection lost during sync' });
      }
    }
    setSyncQueue(remaining);
    setSyncing(false);
    if (syncedCount > 0) {
      setLastSyncedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      notify(`Synced ${syncedCount} offline operation(s) to server.`, 'success');
      await refreshState();
    } else if (remaining.length > 0) {
      notify('Some queued items failed to sync. Review Sync Center.', 'error');
    }
  }, [syncing, isOnline, simulatedOffline, refreshState, notify]);

  useEffect(() => {
    if (isOnline && !simulatedOffline && syncQueue.length > 0 && tokenRef.current) {
      void syncNow();
    }
  }, [isOnline, simulatedOffline, syncQueue.length, syncNow]);

  const removeQueuedItem = useCallback((id: string) => {
    setSyncQueue((prev) => removeOfflineMutation(prev, id));
  }, []);

  const clearSyncQueue = useCallback(() => {
    setSyncQueue([]);
  }, []);

  return (
    <ErpContext.Provider
      value={{
        user,
        db,
        today,
        loading,
        error,
        activeCampusId,
        setActiveCampusId,
        activePage,
        activeSubTab,
        activeNavKey,
        navigateTo,
        openTabs,
        closeTab,
        sidebarCollapsed,
        setSidebarCollapsed,
        mobileMenuOpen,
        setMobileMenuOpen,
        darkMode,
        toggleDarkMode,
        uiPrefs,
        updateUiPrefs,
        resetUiPrefs,
        customizeOpen,
        setCustomizeOpen,
        showAmounts,
        toggleShowAmounts,
        searchOpen,
        setSearchOpen,
        canPerform,
        canVisitPage,
        login,
        logout,
        refreshState,
        mutate,
        isOnline: isOnline && !simulatedOffline,
        simulatedOffline,
        toggleSimulatedOffline,
        syncQueue,
        syncing,
        lastSyncedAt,
        syncNow,
        removeQueuedItem,
        clearSyncQueue,
        notify,
        toasts,
        dismissToast,
      }}
    >
      {children}
    </ErpContext.Provider>
  );
};

export function useErp(): ErpContextValue {
  const ctx = useContext(ErpContext);
  if (!ctx) throw new Error('useErp must be used within ErpProvider');
  return ctx;
}
