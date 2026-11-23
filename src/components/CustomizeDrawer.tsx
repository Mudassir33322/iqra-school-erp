import React from 'react';
import {
  Check,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import {
  ACCENT_PALETTES,
  BACKGROUND_OPTIONS,
  FONT_OPTIONS,
  LANGUAGE_OPTIONS,
  t,
} from '../utils/i18n';
import type { UiSpacing, UiTextSize, UiThemeMode } from '../types/erp';

export const CustomizeDrawer: React.FC = () => {
  const { customizeOpen, setCustomizeOpen, uiPrefs, updateUiPrefs, resetUiPrefs, notify } = useErp();

  if (!customizeOpen) return null;

  const themeOptions: Array<{
    id: UiThemeMode;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'auto', label: 'Auto', icon: Monitor },
  ];

  const textSizeOptions: Array<{ id: UiTextSize; label: string }> = [
    { id: 'sm', label: 'Small' },
    { id: 'md', label: 'Normal' },
    { id: 'lg', label: 'Large' },
    { id: 'xl', label: 'X-Large' },
  ];

  const spacingOptions: Array<{ id: UiSpacing; label: string }> = [
    { id: 'compact', label: 'Compact' },
    { id: 'comfy', label: 'Comfy' },
    { id: 'roomy', label: 'Roomy' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/45 backdrop-blur-xs no-print"
      role="dialog"
      aria-modal="true"
      aria-label="Customize appearance and language"
      onClick={() => setCustomizeOpen(false)}
    >
      <div
        className="w-full max-w-md h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t(uiPrefs.language, 'customize')}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                {t(uiPrefs.language, 'customizeSub')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                resetUiPrefs();
                notify('Appearance restored to default preset.', 'info');
              }}
              aria-label="Reset appearance defaults"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={() => setCustomizeOpen(false)}
              aria-label="Close customize panel"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Customization Sections */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 text-xs">
          {/* Theme */}
          <section className="space-y-2">
            <div className="font-bold text-slate-800 dark:text-slate-200">Theme</div>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const active = uiPrefs.themeMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => updateUiPrefs({ themeMode: opt.id })}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border font-semibold cursor-pointer transition-all ${
                      active
                        ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Language */}
          <section className="space-y-2">
            <div className="font-bold text-slate-800 dark:text-slate-200">Language</div>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGE_OPTIONS.map((lang) => {
                const active = uiPrefs.language === lang.id;
                return (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => {
                      updateUiPrefs({ language: lang.id });
                      notify(`Language changed to ${lang.englishLabel} (${lang.nativeLabel}).`, 'info');
                    }}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between gap-2 ${
                      active
                        ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{lang.nativeLabel}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{lang.englishLabel}</div>
                    </div>
                    {active && <Check className="w-3.5 h-3.5 text-teal-700 dark:text-teal-300 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Accent Colour */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200">Accent colour</span>
              <span className="text-[11px] font-mono text-slate-500">
                {ACCENT_PALETTES.find((p) => p.hex.toLowerCase() === uiPrefs.accentColor.toLowerCase())?.label ||
                  uiPrefs.accentColor}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {ACCENT_PALETTES.map((pal) => {
                const active = uiPrefs.accentColor.toLowerCase() === pal.hex.toLowerCase();
                return (
                  <button
                    key={pal.id}
                    type="button"
                    onClick={() => updateUiPrefs({ accentColor: pal.hex })}
                    aria-label={`Select ${pal.label} accent colour`}
                    title={pal.label}
                    style={{ backgroundColor: pal.hex }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white cursor-pointer transition-transform ${
                      active ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-110' : 'hover:scale-105'
                    }`}
                  >
                    {active && <Check className="w-4 h-4" />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Font */}
          <section className="space-y-2">
            <div className="font-bold text-slate-800 dark:text-slate-200">Font</div>
            <div className="grid grid-cols-1 gap-1.5">
              {FONT_OPTIONS.map((font) => {
                const active = uiPrefs.fontFamily === font.id;
                return (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => updateUiPrefs({ fontFamily: font.id })}
                    style={{ fontFamily: font.cssStack }}
                    className={`px-3 py-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      active
                        ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">{font.label}</span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      {font.tag}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Text size */}
          <section className="space-y-2">
            <div className="font-bold text-slate-800 dark:text-slate-200">Text size</div>
            <div className="grid grid-cols-4 gap-1.5">
              {textSizeOptions.map((sz) => {
                const active = uiPrefs.textSize === sz.id;
                return (
                  <button
                    key={sz.id}
                    type="button"
                    onClick={() => updateUiPrefs({ textSize: sz.id })}
                    className={`py-2 px-2 rounded-xl border font-semibold cursor-pointer ${
                      active
                        ? 'border-teal-600 bg-teal-700 text-white'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {sz.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Spacing */}
          <section className="space-y-2">
            <div className="font-bold text-slate-800 dark:text-slate-200">Spacing</div>
            <div className="grid grid-cols-3 gap-2">
              {spacingOptions.map((sp) => {
                const active = uiPrefs.spacing === sp.id;
                return (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() => updateUiPrefs({ spacing: sp.id })}
                    className={`py-2 px-3 rounded-xl border font-semibold cursor-pointer ${
                      active
                        ? 'border-teal-600 bg-teal-700 text-white'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {sp.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Corner roundness */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200">Corner roundness</span>
              <span className="font-mono font-bold text-teal-700 dark:text-teal-400">
                {uiPrefs.cornerRoundness}%
              </span>
            </div>
            <input
              type="range"
              aria-label="Corner roundness percentage"
              min={0}
              max={50}
              step={2}
              value={uiPrefs.cornerRoundness}
              onChange={(e) => updateUiPrefs({ cornerRoundness: Number(e.target.value) })}
              className="w-full accent-teal-700 cursor-pointer"
            />
          </section>

          {/* Glass effect */}
          <section className="space-y-2">
            <div className="font-bold text-slate-800 dark:text-slate-200">Glass effect</div>
            <div className="grid grid-cols-2 gap-2">
              {([true, false] as const).map((val) => {
                const active = uiPrefs.glassEffect === val;
                return (
                  <button
                    key={String(val)}
                    type="button"
                    onClick={() => updateUiPrefs({ glassEffect: val })}
                    className={`py-2 px-3 rounded-xl border font-semibold cursor-pointer flex items-center justify-center gap-1.5 ${
                      active
                        ? 'border-teal-600 bg-teal-700 text-white'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {val && <Sparkles className="w-3.5 h-3.5" />}
                    <span>{val ? 'On' : 'Off'}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Background */}
          <section className="space-y-2">
            <div className="font-bold text-slate-800 dark:text-slate-200">Background</div>
            <div className="grid grid-cols-3 gap-2">
              {BACKGROUND_OPTIONS.map((bg) => {
                const active = uiPrefs.backgroundStyle === bg.id;
                return (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => updateUiPrefs({ backgroundStyle: bg.id })}
                    className={`p-2 rounded-xl border text-center cursor-pointer transition-all ${
                      active
                        ? 'border-teal-600 ring-2 ring-teal-500/25'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className={`h-8 rounded-lg mb-1.5 border border-slate-200/70 ${bg.previewClass}`} />
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{bg.label}</div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Navigation colour */}
          <section className="space-y-2">
            <div className="font-bold text-slate-800 dark:text-slate-200">Navigation colour</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateUiPrefs({ navColor: 'cream' })}
                className={`py-2.5 px-3 rounded-xl border font-semibold cursor-pointer ${
                  uiPrefs.navColor === 'cream'
                    ? 'border-teal-600 bg-amber-50 text-slate-900'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                Cream glass
              </button>
              <button
                type="button"
                onClick={() => updateUiPrefs({ navColor: 'coloured' })}
                className={`py-2.5 px-3 rounded-xl border font-semibold cursor-pointer ${
                  uiPrefs.navColor === 'coloured'
                    ? 'border-teal-600 bg-teal-700 text-white'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                Coloured glass
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Coloured navigation shows in light mode; dark mode keeps the standard look.
            </p>
          </section>
        </div>

        {/* Footer guidance */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          Sizes adapt to your screen automatically, so the app keeps the same proportions on a laptop or a large monitor. Text size adds on top of that.
        </div>
      </div>
    </div>
  );
};
