import type {
  UiBackgroundStyle,
  UiFontFamily,
  UiLanguage,
  UiPreferences,
  UiTextSize,
} from '../types/erp';

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
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

export const ACCENT_PALETTES: Array<{
  id: string;
  label: string;
  hex: string;
  hoverHex: string;
}> = [
  { id: 'teal', label: 'Teal', hex: '#0f766e', hoverHex: '#115e59' },
  { id: 'emerald', label: 'Emerald', hex: '#059669', hoverHex: '#047857' },
  { id: 'indigo', label: 'Indigo', hex: '#4f46e5', hoverHex: '#4338ca' },
  { id: 'blue', label: 'Royal Blue', hex: '#2563eb', hoverHex: '#1d4ed8' },
  { id: 'violet', label: 'Violet', hex: '#7c3aed', hoverHex: '#6d28d9' },
  { id: 'rose', label: 'Crimson', hex: '#e11d48', hoverHex: '#be123c' },
  { id: 'amber', label: 'Amber', hex: '#d97706', hoverHex: '#b45309' },
  { id: 'slate', label: 'Charcoal', hex: '#334155', hoverHex: '#1e293b' },
];

export const FONT_OPTIONS: Array<{
  id: UiFontFamily;
  label: string;
  tag: string;
  cssStack: string;
}> = [
  { id: 'poppins', label: 'Poppins', tag: 'Default', cssStack: "'Poppins', 'Plus Jakarta Sans', system-ui, sans-serif" },
  { id: 'jakarta', label: 'Plus Jakarta Sans', tag: 'Modern', cssStack: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" },
  { id: 'inter', label: 'Inter', tag: 'Crisp', cssStack: "'Inter', system-ui, sans-serif" },
  { id: 'nunito', label: 'Nunito', tag: 'Rounded', cssStack: "'Nunito', system-ui, sans-serif" },
  { id: 'dm-sans', label: 'DM Sans', tag: 'Clean', cssStack: "'DM Sans', system-ui, sans-serif" },
];

export const LANGUAGE_OPTIONS: Array<{
  id: UiLanguage;
  nativeLabel: string;
  englishLabel: string;
  rtl: boolean;
}> = [
  { id: 'en', nativeLabel: 'English', englishLabel: 'English', rtl: false },
  { id: 'ur', nativeLabel: 'اردو', englishLabel: 'Urdu', rtl: true },
  { id: 'ar', nativeLabel: 'العربية', englishLabel: 'Arabic', rtl: true },
  { id: 'fr', nativeLabel: 'Français', englishLabel: 'French', rtl: false },
  { id: 'es', nativeLabel: 'Español', englishLabel: 'Spanish', rtl: false },
  { id: 'id', nativeLabel: 'Bahasa Indonesia', englishLabel: 'Indonesian', rtl: false },
];

export const BACKGROUND_OPTIONS: Array<{
  id: UiBackgroundStyle;
  label: string;
  previewClass: string;
}> = [
  { id: 'soft', label: 'Soft', previewClass: 'bg-gradient-to-br from-amber-50 via-slate-50 to-teal-50' },
  { id: 'aurora', label: 'Aurora', previewClass: 'bg-gradient-to-br from-emerald-100 via-sky-50 to-purple-100' },
  { id: 'plain', label: 'Plain', previewClass: 'bg-slate-100' },
  { id: 'dotted', label: 'Dotted', previewClass: 'bg-slate-50' },
  { id: 'sunset', label: 'Sunset', previewClass: 'bg-gradient-to-br from-orange-100 via-rose-100 to-indigo-100' },
  { id: 'mint', label: 'Mint', previewClass: 'bg-gradient-to-br from-emerald-100 via-teal-50 to-sky-100' },
];

export function isRtlLanguage(lang: UiLanguage): boolean {
  return lang === 'ur' || lang === 'ar';
}

export function resolveEffectiveDark(mode: UiPreferences['themeMode'], systemPrefersDark: boolean): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return systemPrefersDark;
}

export function getTextSizePx(size: UiTextSize): number {
  switch (size) {
    case 'sm':
      return 14;
    case 'lg':
      return 17;
    case 'xl':
      return 18.5;
    case 'md':
    default:
      return 16;
  }
}

export function hexToSoftRgba(hex: string, alpha = 0.1): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(15, 118, 110, ${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return `rgba(15, 118, 110, ${alpha})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function applyUiPreferencesToDom(prefs: UiPreferences): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const systemDark =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = resolveEffectiveDark(prefs.themeMode, systemDark);

  root.classList.toggle('dark', isDark);
  root.setAttribute('lang', prefs.language);
  root.setAttribute('dir', isRtlLanguage(prefs.language) ? 'rtl' : 'ltr');

  const fontSpec = FONT_OPTIONS.find((f) => f.id === prefs.fontFamily) || FONT_OPTIONS[0];
  root.style.setProperty('--font-sans', fontSpec.cssStack);

  const palette = ACCENT_PALETTES.find((p) => p.hex.toLowerCase() === prefs.accentColor.toLowerCase());
  const accent = prefs.accentColor || '#0f766e';
  const hover = palette?.hoverHex || accent;
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--accent-hover', hover);
  root.style.setProperty('--accent-soft', hexToSoftRgba(accent, 0.11));
  root.style.setProperty('--accent-border', hexToSoftRgba(accent, 0.3));
  root.setAttribute('data-custom-accent', accent.toLowerCase() !== '#0f766e' ? 'true' : 'false');

  root.style.fontSize = `${getTextSizePx(prefs.textSize)}px`;

  const roundness = Math.min(50, Math.max(0, Number(prefs.cornerRoundness ?? 26)));
  // 26% maps to 16px cards and 12px controls; 0% -> 4px/3px; 50% -> 26px/20px
  const cardPx = Math.round(4 + (roundness / 50) * 22);
  const ctrlPx = Math.round(3 + (roundness / 50) * 17);
  root.style.setProperty('--radius-card', `${cardPx}px`);
  root.style.setProperty('--radius-control', `${ctrlPx}px`);
  root.setAttribute('data-custom-radius', roundness !== 26 ? 'true' : 'false');

  root.setAttribute('data-spacing', prefs.spacing || 'comfy');
  root.setAttribute('data-glass', prefs.glassEffect ? 'on' : 'off');
  root.setAttribute('data-bg', prefs.backgroundStyle || 'soft');
  root.setAttribute('data-nav', prefs.navColor || 'cream');
}

const TRANSLATIONS: Record<UiLanguage, Record<string, string>> = {
  en: {
    customize: 'Customize',
    customizeSub: 'Saved to your account and used on every device you sign in on.',
    searchPlaceholder: 'Search students, parents, staff or pages...',
    online: 'Online',
    offline: 'Offline',
    loadingWorkspace: 'Preparing campus workspace & live records...',
    loadingSyncing: 'Syncing modules, roles & theme preferences',
    navDashboard: 'Dashboard',
    navTodayActivity: "Today's Activity",
    navGateVisitors: 'Gate & Visitors',
    navAdmissions: 'Manage Admissions',
    navStudents: 'Student Management',
    navParents: 'Parent Accounts',
    navStaff: 'Staff Management',
    navAttendance: 'Manage Attendance',
    navFees: 'Fee Management',
    navAccounting: 'Accounting & Ledger',
    navExams: 'Exam Management',
    navNoticeboard: 'School Noticeboard',
    navMessaging: 'SMS & WhatsApp',
    navWebsite: 'Website Management',
    navSettings: 'Settings',
    greetingMorning: 'Good morning',
    greetingAfternoon: 'Good afternoon',
    greetingEvening: 'Good evening',
    dashboardLead: "Here is what's happening in your school today.",
    today: 'Today',
    week: 'Week',
    month: 'Month',
    session: 'Session',
    custom: 'Custom',
    dailySummary: 'Daily summary',
    incomeToday: 'Income today',
    expenseToday: 'Expense today',
    studentsPresentToday: 'Students present today',
    staffInToday: 'Staff in today',
    collectedToday: 'Collected today',
    unpaidFees: 'Unpaid Fees',
    setupTitle: 'Finish setting up your school',
    setupSub: 'Each step opens the right page.',
  },
  ur: {
    customize: 'کسٹمائز کریں',
    customizeSub: 'آپ کے اکاؤنٹ میں محفوظ اور ہر ڈیوائس پر دستیاب۔',
    searchPlaceholder: 'طلباء، والدین، عملہ یا صفحات تلاش کریں...',
    online: 'آن لائن',
    offline: 'آف لائن',
    loadingWorkspace: 'اسکول سسٹم اور ریکارڈز لوڈ ہو رہے ہیں...',
    loadingSyncing: 'تھیم، زبان اور کیمپس ڈیٹا ہم آہنگ ہو رہا ہے',
    navDashboard: 'ڈیش بورڈ',
    navTodayActivity: 'آج کی سرگرمیاں',
    navGateVisitors: 'گیٹ اور وزٹرز',
    navAdmissions: 'داخلے کا انتظام',
    navStudents: 'طلباء کا انتظام',
    navParents: 'والدین اکاؤنٹس',
    navStaff: 'عملے کا انتظام',
    navAttendance: 'حاضری کا نظام',
    navFees: 'فیس مینجمنٹ',
    navAccounting: 'اکاؤنٹنگ اور لیجر',
    navExams: 'امتحانات کا نظام',
    navNoticeboard: 'اسکول نوٹس بورڈ',
    navMessaging: 'ایس ایم ایس اور واٹس ایپ',
    navWebsite: 'ویب سائٹ مینجمنٹ',
    navSettings: 'سیٹنگز',
    greetingMorning: 'صبح بخیر',
    greetingAfternoon: 'سہ پہر بخیر',
    greetingEvening: 'شام بخیر',
    dashboardLead: 'آج آپ کے اسکول کی تازہ ترین صورتحال یہاں دیکھیں۔',
    today: 'آج',
    week: 'ہفتہ',
    month: 'مہینہ',
    session: 'سیشن',
    custom: 'کسٹم',
    dailySummary: 'روزانہ خلاصہ',
    incomeToday: 'آج کی آمدنی',
    expenseToday: 'آج کے اخراجات',
    studentsPresentToday: 'آج حاضر طلباء',
    staffInToday: 'آج حاضر عملہ',
    collectedToday: 'آج وصول شدہ فیس',
    unpaidFees: 'واجب الادا فیس',
    setupTitle: 'اپنے اسکول کا سیٹ اپ مکمل کریں',
    setupSub: 'ہر مرحلہ متعلقہ صفحے کو کھولتا ہے۔',
  },
  ar: {
    customize: 'تخصيص',
    customizeSub: 'محفوظ في حسابك ويعمل على كل جهاز تسجل الدخول منه.',
    searchPlaceholder: 'ابحث عن الطلاب أو أولياء الأمور أو الصفحات...',
    online: 'متصل',
    offline: 'غير متصل',
    loadingWorkspace: 'جاري تحميل لوحة المدرسة والبيانات الحية...',
    loadingSyncing: 'مزامنة السمة واللغة وبيانات الحرم',
    navDashboard: 'لوحة التحكم',
    navTodayActivity: 'نشاط اليوم',
    navGateVisitors: 'البوابة والزوار',
    navAdmissions: 'إدارة القبول',
    navStudents: 'إدارة الطلاب',
    navParents: 'حسابات أولياء الأمور',
    navStaff: 'إدارة الموظفين',
    navAttendance: 'إدارة الحضور',
    navFees: 'إدارة الرسوم',
    navAccounting: 'المحاسبة والدفتر',
    navExams: 'إدارة الامتحانات',
    navNoticeboard: 'لوحة الإعلانات',
    navMessaging: 'رسائل وواتساب',
    navWebsite: 'إدارة الموقع',
    navSettings: 'الإعدادات',
    greetingMorning: 'صباح الخير',
    greetingAfternoon: 'مساء الخير',
    greetingEvening: 'مساء النور',
    dashboardLead: 'إليك ما يحدث في مدرستك اليوم.',
    today: 'اليوم',
    week: 'أسبوع',
    month: 'شهر',
    session: 'السنة الدراسية',
    custom: 'مخصص',
    dailySummary: 'ملخص يومي',
    incomeToday: 'دخل اليوم',
    expenseToday: 'مصروفات اليوم',
    studentsPresentToday: 'الطلاب الحاضرون اليوم',
    staffInToday: 'الموظفون اليوم',
    collectedToday: 'المحصل اليوم',
    unpaidFees: 'الرسوم المستحقة',
    setupTitle: 'أكمل إعداد مدرستك',
    setupSub: 'كل خطوة تفتح الصفحة الصحيحة.',
  },
  fr: {
    customize: 'Personnaliser',
    customizeSub: 'Enregistré sur votre compte sur chaque appareil.',
    searchPlaceholder: 'Rechercher élèves, parents, personnel...',
    online: 'En ligne',
    offline: 'Hors ligne',
    loadingWorkspace: "Chargement de l'espace scolaire...",
    loadingSyncing: 'Synchronisation des préférences et modules',
    navDashboard: 'Tableau de bord',
    navTodayActivity: "Activité du jour",
    navGateVisitors: 'Portail & Visiteurs',
    navAdmissions: 'Admissions',
    navStudents: 'Gestion des élèves',
    navParents: 'Comptes parents',
    navStaff: 'Personnel & Paie',
    navAttendance: 'Présences',
    navFees: 'Frais scolaires',
    navAccounting: 'Comptabilité',
    navExams: 'Examens',
    navNoticeboard: "Tableau d'affichage",
    navMessaging: 'SMS & WhatsApp',
    navWebsite: 'Site web scolaire',
    navSettings: 'Paramètres',
    greetingMorning: 'Bonjour',
    greetingAfternoon: 'Bon après-midi',
    greetingEvening: 'Bonsoir',
    dashboardLead: "Voici ce qui se passe dans votre école aujourd'hui.",
    today: "Aujourd'hui",
    week: 'Semaine',
    month: 'Mois',
    session: 'Session',
    custom: 'Personnalisé',
    dailySummary: 'Résumé du jour',
    incomeToday: 'Revenus du jour',
    expenseToday: 'Dépenses du jour',
    studentsPresentToday: 'Élèves présents',
    staffInToday: 'Personnel présent',
    collectedToday: 'Encaissé ce jour',
    unpaidFees: 'Frais impayés',
    setupTitle: 'Terminez la configuration de votre école',
    setupSub: 'Chaque étape ouvre la bonne page.',
  },
  es: {
    customize: 'Personalizar',
    customizeSub: 'Guardado en tu cuenta para cada dispositivo.',
    searchPlaceholder: 'Buscar estudiantes, padres, personal...',
    online: 'En línea',
    offline: 'Sin conexión',
    loadingWorkspace: 'Cargando el panel escolar...',
    loadingSyncing: 'Sincronizando tema e idioma',
    navDashboard: 'Panel',
    navTodayActivity: 'Actividad de hoy',
    navGateVisitors: 'Puerta y Visitantes',
    navAdmissions: 'Admisiones',
    navStudents: 'Estudiantes',
    navParents: 'Padres de familia',
    navStaff: 'Personal',
    navAttendance: 'Asistencia',
    navFees: 'Pagos y Cuotas',
    navAccounting: 'Contabilidad',
    navExams: 'Exámenes',
    navNoticeboard: 'Tablón escolar',
    navMessaging: 'SMS y WhatsApp',
    navWebsite: 'Sitio Web',
    navSettings: 'Configuración',
    greetingMorning: 'Buenos días',
    greetingAfternoon: 'Buenas tardes',
    greetingEvening: 'Buenas noches',
    dashboardLead: 'Esto es lo que sucede hoy en tu escuela.',
    today: 'Hoy',
    week: 'Semana',
    month: 'Mes',
    session: 'Ciclo',
    custom: 'Personalizado',
    dailySummary: 'Resumen diario',
    incomeToday: 'Ingresos de hoy',
    expenseToday: 'Gastos de hoy',
    studentsPresentToday: 'Estudiantes presentes',
    staffInToday: 'Personal hoy',
    collectedToday: 'Recaudado hoy',
    unpaidFees: 'Cuotas pendientes',
    setupTitle: 'Completa la configuración escolar',
    setupSub: 'Cada paso abre la página correcta.',
  },
  id: {
    customize: 'Kustomisasi',
    customizeSub: 'Disimpan ke akun Anda dan dipakai di semua perangkat.',
    searchPlaceholder: 'Cari siswa, wali murid, staf, atau halaman...',
    online: 'Daring',
    offline: 'Luring',
    loadingWorkspace: 'Memuat sistem sekolah & data langsung...',
    loadingSyncing: 'Menyinkronkan tema & bahasa akun',
    navDashboard: 'Dasbor',
    navTodayActivity: 'Aktivitas Hari Ini',
    navGateVisitors: 'Gerbang & Tamu',
    navAdmissions: 'Penerimaan',
    navStudents: 'Manajemen Siswa',
    navParents: 'Akun Orang Tua',
    navStaff: 'Manajemen Staf',
    navAttendance: 'Absensi',
    navFees: 'Pembayaran SPP',
    navAccounting: 'Akuntansi',
    navExams: 'Ujian & Rapor',
    navNoticeboard: 'Pengumuman',
    navMessaging: 'SMS & WhatsApp',
    navWebsite: 'Manajemen Situs',
    navSettings: 'Pengaturan',
    greetingMorning: 'Selamat pagi',
    greetingAfternoon: 'Selamat siang',
    greetingEvening: 'Selamat malam',
    dashboardLead: 'Ringkasan aktivitas sekolah Anda hari ini.',
    today: 'Hari Ini',
    week: 'Minggu',
    month: 'Bulan',
    session: 'Tahun Ajaran',
    custom: 'Kustom',
    dailySummary: 'Ringkasan harian',
    incomeToday: 'Pemasukan hari ini',
    expenseToday: 'Pengeluaran hari ini',
    studentsPresentToday: 'Siswa hadir hari ini',
    staffInToday: 'Staf hadir',
    collectedToday: 'Terkumpul hari ini',
    unpaidFees: 'Tagihan belum lunas',
    setupTitle: 'Selesaikan pengaturan sekolah Anda',
    setupSub: 'Setiap langkah membuka halaman yang tepat.',
  },
};

export function t(lang: UiLanguage, key: string, fallback?: string): string {
  return TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.en[key] ?? fallback ?? key;
}
