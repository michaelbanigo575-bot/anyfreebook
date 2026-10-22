'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from './AuthProvider';
import { createClient } from '@/lib/supabase/client';

export interface StudyPlan {
  enabled: boolean;
  goalBooksPerWeek: number;
  reminderTime: string; // "HH:MM" 24hr
  reminderDays: number[]; // 0=Sun..6=Sat
  focusCategory: string;
  lastNotifiedDate: string | null; // yyyy-mm-dd
}

const STUDY_PLAN_KEY = 'afb_study_plan';
/** How often we look for the reminder. Minute-level resolution is enough. */
const CHECK_INTERVAL_MS = 60_000;
/**
 * Fire within this many minutes AFTER the target time: background tabs
 * throttle timers, so landing exactly on the target minute is unlikely.
 */
const TOLERANCE_MINUTES = 10;

/** yyyy-mm-dd in LOCAL time — the time-of-day check is local, so the marker must be too. */
function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Minutes since local midnight for a "HH:MM" string; -1 when it can't be parsed. */
function minutesOfDay(hhmm: string): number {
  const [h, m] = (hhmm || '').split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return -1;
  return h * 60 + m;
}

function getLocalStudyPlan(): StudyPlan | null {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem(STUDY_PLAN_KEY);
  // A corrupted value would throw during render and blank the whole tree.
  try {
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function saveLocalStudyPlan(plan: StudyPlan) {
  localStorage.setItem(STUDY_PLAN_KEY, JSON.stringify(plan));
}

function rowToPlan(row: {
  enabled: boolean;
  goal_books_per_week: number;
  reminder_time: string;
  reminder_days: number[];
  focus_category: string | null;
  last_notified_date: string | null;
}): StudyPlan {
  return {
    enabled: row.enabled,
    goalBooksPerWeek: row.goal_books_per_week,
    reminderTime: row.reminder_time,
    reminderDays: row.reminder_days,
    focusCategory: row.focus_category || '',
    lastNotifiedDate: row.last_notified_date,
  };
}

/** Reads the current plan for either the logged-in user (Supabase) or a guest (localStorage). */
export async function getStudyPlan(userId?: string | null): Promise<StudyPlan | null> {
  if (!userId) return getLocalStudyPlan();
  const supabase = createClient();
  const { data } = await supabase.from('study_plans').select('*').eq('user_id', userId).single();
  return data ? rowToPlan(data) : null;
}

export async function saveStudyPlan(plan: StudyPlan, userId?: string | null) {
  if (!userId) {
    saveLocalStudyPlan(plan);
    return;
  }
  const supabase = createClient();
  await supabase.from('study_plans').upsert({
    user_id: userId,
    enabled: plan.enabled,
    goal_books_per_week: plan.goalBooksPerWeek,
    reminder_time: plan.reminderTime,
    reminder_days: plan.reminderDays,
    focus_category: plan.focusCategory || null,
    last_notified_date: plan.lastNotifiedDate,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
}

export function requestReminderPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return Promise.resolve('denied');
  return Notification.requestPermission();
}

export function ReadingReminderProvider() {
  const { user } = useAuth();
  const userIdRef = useRef<string | null | undefined>(undefined);
  userIdRef.current = user?.id ?? null;

  useEffect(() => {
    const checkAndFireReminder = async () => {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

      const plan = await getStudyPlan(userIdRef.current);
      if (!plan || !plan.enabled) return;

      const now = new Date();
      const day = now.getDay();
      const today = localDateKey(now);
      const minutesNow = now.getHours() * 60 + now.getMinutes();

      if (!plan.reminderDays.includes(day)) return;
      const target = minutesOfDay(plan.reminderTime);
      if (target < 0) return;
      // Fire any time inside the target minute plus the tolerance window.
      if (minutesNow < target || minutesNow > target + TOLERANCE_MINUTES) return;
      // Already fired today — the marker keeps it to one notification a day.
      if (plan.lastNotifiedDate === today) return;

      const notification = new Notification('📚 Time to read!', {
        body: plan.focusCategory
          ? `Your reading reminder: aim for ${plan.goalBooksPerWeek} books this week — focus: ${plan.focusCategory}`
          : `Your reading reminder: aim for ${plan.goalBooksPerWeek} books this week`,
        icon: '/icon-192.png',
        tag: 'afb-reading-reminder',
      });

      notification.onclick = () => {
        window.focus();
        window.location.href = '/study-plan';
      };

      await saveStudyPlan({ ...plan, lastNotifiedDate: today }, userIdRef.current);
    };

    checkAndFireReminder().catch(() => {});
    const interval = setInterval(() => { checkAndFireReminder().catch(() => {}); }, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return null;
}
