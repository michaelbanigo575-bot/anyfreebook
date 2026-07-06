'use client';

import { useState, useEffect } from 'react';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';

interface Settings {
  appearance: { animations: boolean; fontSize: 'small' | 'medium' | 'large' };
  reader: { defaultFont: string; lineSpacing: number; pageMode: 'scroll' | 'paginated'; keepScreenOn: boolean };
  audio: { defaultVoice: string; readingSpeed: number; autoPlayNext: boolean; backgroundPlay: boolean; sleepTimer: number | null };
  downloads: { wifiOnly: boolean; autoDownloadWishlist: boolean };
  notifications: { newBooks: boolean; weeklyDigest: boolean; trending: boolean; readingReminders: boolean };
  content: { language: string; enabledTypes: string[]; professions: string[] };
}

const DEFAULT_SETTINGS: Settings = {
  appearance: { animations: true, fontSize: 'medium' },
  reader: { defaultFont: 'serif', lineSpacing: 1.8, pageMode: 'scroll', keepScreenOn: false },
  audio: { defaultVoice: 'default', readingSpeed: 1, autoPlayNext: true, backgroundPlay: true, sleepTimer: null },
  downloads: { wifiOnly: false, autoDownloadWishlist: false },
  notifications: { newBooks: true, weeklyDigest: true, trending: false, readingReminders: false },
  content: { language: 'en', enabledTypes: ['BOOK', 'AUDIOBOOK', 'NOVEL', 'COMIC', 'MAGAZINE', 'RESEARCH_PAPER', 'MANUAL', 'NEWSLETTER'], professions: [] },
};

function loadSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const saved = JSON.parse(localStorage.getItem('anyfreebook-settings') || '{}');
    return {
      appearance: { ...DEFAULT_SETTINGS.appearance, ...saved.appearance },
      reader: { ...DEFAULT_SETTINGS.reader, ...saved.reader },
      audio: { ...DEFAULT_SETTINGS.audio, ...saved.audio },
      downloads: { ...DEFAULT_SETTINGS.downloads, ...saved.downloads },
      notifications: { ...DEFAULT_SETTINGS.notifications, ...saved.notifications },
      content: { ...DEFAULT_SETTINGS.content, ...saved.content },
    };
  } catch { return DEFAULT_SETTINGS; }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [activeSection, setActiveSection] = useState('appearance');

  useEffect(() => { setSettings(loadSettings()); }, []);

  const update = <S extends keyof Settings, K extends keyof Settings[S]>(section: S, key: K, value: Settings[S][K]) => {
    setSettings(prev => {
      const next = { ...prev, [section]: { ...prev[section], [key]: value } };
      localStorage.setItem('anyfreebook-settings', JSON.stringify(next));
      return next;
    });
  };

  const sections = [
    { id: 'appearance', label: 'Appearance', icon: '🎨' },
    { id: 'reader', label: 'Reader', icon: '📖' },
    { id: 'audio', label: 'Audio & TTS', icon: '🎧' },
    { id: 'downloads', label: 'Downloads', icon: '📥' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'content', label: 'Content', icon: '📚' },
    { id: 'account', label: 'Account', icon: '👤' },
    { id: 'about', label: 'About', icon: 'ℹ️' },
  ];

  const CONTENT_TYPES = [
    { id: 'BOOK', label: 'Books' }, { id: 'AUDIOBOOK', label: 'Audiobooks' },
    { id: 'NOVEL', label: 'Novels' }, { id: 'COMIC', label: 'Comics' },
    { id: 'MAGAZINE', label: 'Magazines' }, { id: 'NEWSLETTER', label: 'Newsletters' },
    { id: 'RESEARCH_PAPER', label: 'Research Papers' }, { id: 'MANUAL', label: 'Manuals' },
  ];

  return (
    <div className="content-wrapper py-8">
      <h1 className="text-2xl md:text-3xl font-display font-bold text-[var(--text)] mb-8">Settings</h1>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <nav className="md:w-48 flex-shrink-0">
          <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible scrollbar-none">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeSection === s.id
                    ? 'bg-[var(--primary-light)] text-[var(--primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                <span>{s.icon}</span> {s.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 max-w-2xl">
          {activeSection === 'appearance' && (
            <SettingsSection title="Appearance">
              <ThemeSwitcher />
              <ToggleSetting label="Enable animations" value={settings.appearance.animations}
                onChange={v => update('appearance', 'animations', v)} />
              <SelectSetting label="Font size" value={settings.appearance.fontSize}
                options={[{ value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' }]}
                onChange={v => update('appearance', 'fontSize', v as 'small' | 'medium' | 'large')} />
            </SettingsSection>
          )}

          {activeSection === 'reader' && (
            <SettingsSection title="Reader">
              <SelectSetting label="Default font" value={settings.reader.defaultFont}
                options={[
                  { value: 'serif', label: 'Serif (Georgia)' }, { value: 'sans', label: 'Sans-Serif (Inter)' },
                  { value: 'mono', label: 'Monospace' }, { value: 'palatino', label: 'Palatino' },
                  { value: 'dyslexic', label: 'OpenDyslexic' },
                ]}
                onChange={v => update('reader', 'defaultFont', v)} />
              <RangeSetting label="Line spacing" value={settings.reader.lineSpacing} min={1.2} max={2.4} step={0.1}
                display={v => v.toFixed(1)} onChange={v => update('reader', 'lineSpacing', v)} />
              <SelectSetting label="Page mode" value={settings.reader.pageMode}
                options={[{ value: 'scroll', label: 'Continuous scroll' }, { value: 'paginated', label: 'Paginated' }]}
                onChange={v => update('reader', 'pageMode', v as 'scroll' | 'paginated')} />
              <ToggleSetting label="Keep screen on while reading" value={settings.reader.keepScreenOn}
                onChange={v => update('reader', 'keepScreenOn', v)} />
            </SettingsSection>
          )}

          {activeSection === 'audio' && (
            <SettingsSection title="Audio & TTS">
              <RangeSetting label="Reading speed" value={settings.audio.readingSpeed} min={0.5} max={2} step={0.25}
                display={v => `${v}x`} onChange={v => update('audio', 'readingSpeed', v)} />
              <ToggleSetting label="Auto-play next chapter" value={settings.audio.autoPlayNext}
                onChange={v => update('audio', 'autoPlayNext', v)} />
              <ToggleSetting label="Background playback" value={settings.audio.backgroundPlay}
                onChange={v => update('audio', 'backgroundPlay', v)} />
            </SettingsSection>
          )}

          {activeSection === 'downloads' && (
            <SettingsSection title="Downloads">
              <ToggleSetting label="Download on Wi-Fi only" value={settings.downloads.wifiOnly}
                onChange={v => update('downloads', 'wifiOnly', v)} />
              <ToggleSetting label="Auto-download wishlist items" value={settings.downloads.autoDownloadWishlist}
                onChange={v => update('downloads', 'autoDownloadWishlist', v)} />
            </SettingsSection>
          )}

          {activeSection === 'notifications' && (
            <SettingsSection title="Notifications">
              <ToggleSetting label="New books in your categories" value={settings.notifications.newBooks}
                onChange={v => update('notifications', 'newBooks', v)} />
              <ToggleSetting label="Weekly reading digest" value={settings.notifications.weeklyDigest}
                onChange={v => update('notifications', 'weeklyDigest', v)} />
              <ToggleSetting label="Trending books" value={settings.notifications.trending}
                onChange={v => update('notifications', 'trending', v)} />
              <ToggleSetting label="Reading reminders" value={settings.notifications.readingReminders}
                onChange={v => update('notifications', 'readingReminders', v)} />
            </SettingsSection>
          )}

          {activeSection === 'content' && (
            <SettingsSection title="Content Preferences">
              <SelectSetting label="Language" value={settings.content.language}
                options={[{ value: 'en', label: 'English' }, { value: 'es', label: 'Spanish' }, { value: 'fr', label: 'French' }, { value: 'de', label: 'German' }, { value: 'zh', label: 'Chinese' }]}
                onChange={v => update('content', 'language', v)} />
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text)]">Enabled content types</label>
                {CONTENT_TYPES.map(ct => (
                  <ToggleSetting key={ct.id} label={ct.label}
                    value={settings.content.enabledTypes.includes(ct.id)}
                    onChange={v => {
                      const types = v
                        ? [...settings.content.enabledTypes, ct.id]
                        : settings.content.enabledTypes.filter(t => t !== ct.id);
                      update('content', 'enabledTypes', types);
                    }}
                  />
                ))}
              </div>
            </SettingsSection>
          )}

          {activeSection === 'account' && (
            <SettingsSection title="Account">
              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-center">
                <p className="text-sm text-[var(--text-secondary)] mb-3">Sign in to sync settings and reading progress across devices.</p>
                <a href="/login" className="inline-flex px-6 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all">
                  Sign in
                </a>
              </div>
              <div className="mt-4 space-y-2">
                <button className="w-full text-left px-4 py-3 rounded-xl border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors">
                  Export my data
                </button>
                <button className="w-full text-left px-4 py-3 rounded-xl border border-red-200 dark:border-red-900 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                  Delete account
                </button>
              </div>
            </SettingsSection>
          )}

          {activeSection === 'about' && (
            <SettingsSection title="About">
              <div className="space-y-3">
                <InfoRow label="Version" value="1.0.0" />
                <InfoRow label="Build" value="2026.07" />
                <a href="/about" className="block px-4 py-3 rounded-xl border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors">
                  About ANYFREEBOOK
                </a>
                <a href="/privacy" className="block px-4 py-3 rounded-xl border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors">
                  Privacy Policy
                </a>
                <a href="/terms" className="block px-4 py-3 rounded-xl border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors">
                  Terms of Service
                </a>
              </div>
            </SettingsSection>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-display font-bold text-[var(--text)] mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function ToggleSetting({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full transition-colors relative ${value ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`}
      >
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

function SelectSetting({ label, value, options, onChange }: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-sm px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function RangeSetting({ label, value, min, max, step, display, onChange }: {
  label: string; value: number; min: number; max: number; step?: number;
  display: (v: number) => string; onChange: (v: number) => void;
}) {
  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-[var(--text-secondary)]">{label}</span>
        <span className="text-sm font-mono text-[var(--text)]">{display(value)}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step || 1}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full accent-[var(--primary)]"
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      <span className="text-sm font-mono text-[var(--text)]">{value}</span>
    </div>
  );
}
