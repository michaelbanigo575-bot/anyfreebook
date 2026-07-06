'use client';

import { useState, useEffect } from 'react';
import {
  getStudyPlan,
  saveStudyPlan,
  requestReminderPermission,
  type StudyPlan,
} from '@/components/ReadingReminderProvider';

const DAYS = [
  { id: 0, label: 'Sun' },
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
];

const CATEGORIES = [
  'Technology', 'Engineering', 'Medicine', 'Business', 'Law',
  'Sciences', 'Mathematics', 'Arts & Humanities', 'Psychology', 'Education',
];

const DEFAULT_PLAN: StudyPlan = {
  enabled: false,
  goalBooksPerWeek: 2,
  reminderTime: '19:00',
  reminderDays: [1, 3, 5],
  focusCategory: '',
  booksInPlan: [],
  createdAt: new Date().toISOString(),
  lastNotifiedDate: null,
};

export default function StudyPlanPage() {
  const [plan, setPlan] = useState<StudyPlan>(DEFAULT_PLAN);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const existing = getStudyPlan();
    if (existing) setPlan(existing);
    if (typeof Notification !== 'undefined') setPermission(Notification.permission);
  }, []);

  const toggleDay = (day: number) => {
    setPlan(p => ({
      ...p,
      reminderDays: p.reminderDays.includes(day)
        ? p.reminderDays.filter(d => d !== day)
        : [...p.reminderDays, day].sort(),
    }));
  };

  const handleEnableNotifications = async () => {
    const result = await requestReminderPermission();
    setPermission(result);
    if (result === 'granted') {
      new Notification('📚 Reading reminders enabled!', {
        body: "You'll get a notification at your scheduled reading time.",
        icon: '/icon-192.png',
      });
    }
  };

  const handleSave = () => {
    const updated = { ...plan, enabled: true, createdAt: plan.createdAt || new Date().toISOString() };
    saveStudyPlan(updated);
    setPlan(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDisable = () => {
    const updated = { ...plan, enabled: false };
    saveStudyPlan(updated);
    setPlan(updated);
  };

  const nextReminder = () => {
    if (!plan.enabled || plan.reminderDays.length === 0) return null;
    const dayNames = plan.reminderDays.map(d => DAYS[d].label).join(', ');
    return `${plan.reminderTime} on ${dayNames}`;
  };

  return (
    <div className="content-wrapper py-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-[var(--text)]">
          📅 Study Plan & Reading Reminders
        </h1>
        <p className="text-[var(--text-muted)] mt-2">
          Set a reading goal and get notified — like an alarm, but for books.
        </p>
      </div>

      {/* Notification permission */}
      {permission !== 'granted' && (
        <div className="mb-6 p-5 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔔</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                {permission === 'denied' ? 'Notifications are blocked' : 'Enable notifications to get reminders'}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                {permission === 'denied'
                  ? 'Please enable notifications for this site in your browser settings.'
                  : 'Reminders only fire while ANYFREEBOOK is open in a browser tab, at your scheduled time.'}
              </p>
              {permission !== 'denied' && (
                <button
                  onClick={handleEnableNotifications}
                  className="mt-3 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors"
                >
                  Enable Notifications
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {permission === 'granted' && plan.enabled && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
          <span className="text-lg">✅</span>
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Active — next reminder: {nextReminder()}
          </span>
        </div>
      )}

      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] p-6 space-y-6">
        {/* Weekly goal */}
        <div>
          <label className="text-sm font-semibold text-[var(--text)] mb-2 block">
            Weekly reading goal
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={10}
              value={plan.goalBooksPerWeek}
              onChange={e => setPlan(p => ({ ...p, goalBooksPerWeek: parseInt(e.target.value) }))}
              className="flex-1 accent-[var(--primary)]"
            />
            <span className="text-lg font-bold text-[var(--primary)] w-24 text-right">
              {plan.goalBooksPerWeek} book{plan.goalBooksPerWeek !== 1 ? 's' : ''}/week
            </span>
          </div>
        </div>

        {/* Reminder time */}
        <div>
          <label className="text-sm font-semibold text-[var(--text)] mb-2 block">
            Reminder time
          </label>
          <input
            type="time"
            value={plan.reminderTime}
            onChange={e => setPlan(p => ({ ...p, reminderTime: e.target.value }))}
            className="px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm outline-none focus:border-[var(--primary)]"
          />
        </div>

        {/* Reminder days */}
        <div>
          <label className="text-sm font-semibold text-[var(--text)] mb-2 block">
            Reminder days
          </label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map(d => (
              <button
                key={d.id}
                onClick={() => toggleDay(d.id)}
                className={`w-11 h-11 rounded-full text-xs font-semibold transition-colors ${
                  plan.reminderDays.includes(d.id)
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Focus category */}
        <div>
          <label className="text-sm font-semibold text-[var(--text)] mb-2 block">
            Focus area (optional)
          </label>
          <select
            value={plan.focusCategory}
            onChange={e => setPlan(p => ({ ...p, focusCategory: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm outline-none focus:border-[var(--primary)]"
          >
            <option value="">No specific focus</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold hover:shadow-lg transition-all"
          >
            {saved ? '✓ Saved!' : plan.enabled ? 'Update Study Plan' : 'Activate Study Plan'}
          </button>
          {plan.enabled && (
            <button
              onClick={handleDisable}
              className="px-6 py-3 rounded-xl bg-[var(--bg-secondary)] text-[var(--text)] text-sm font-medium border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors"
            >
              Pause
            </button>
          )}
        </div>
      </div>

      {/* How it works */}
      <div className="mt-8 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] p-6">
        <h2 className="text-sm font-bold text-[var(--text)] mb-3">How reading reminders work</h2>
        <ul className="space-y-2 text-xs text-[var(--text-muted)]">
          <li>• Set your weekly book goal, preferred days, and a reminder time</li>
          <li>• Enable browser notifications so ANYFREEBOOK can alert you — like an alarm</li>
          <li>• Keep a tab open in the background; the reminder fires automatically at the scheduled time</li>
          <li>• Click the notification to jump straight back to your study plan</li>
          <li>• Pause anytime — your plan is saved locally in this browser</li>
        </ul>
      </div>

      <div className="mt-6 text-center">
        <a href="/search" className="text-sm font-medium text-[var(--primary)] hover:underline">
          Find books to add to your plan →
        </a>
      </div>
    </div>
  );
}
