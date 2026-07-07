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

function getLocalStudyPlan(): StudyPlan | null {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem(STUDY_PLAN_KEY);
  return saved ? JSON.parse(saved) : null;
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
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const today = now.toISOString().slice(0, 10);

      if (!plan.reminderDays.includes(day)) return;
      if (hhmm !== plan.reminderTime) return;
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

    checkAndFireReminder();
    const interval = setInterval(checkAndFireReminder, 20000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
