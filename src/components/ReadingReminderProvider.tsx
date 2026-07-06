'use client';

import { useEffect } from 'react';

export interface StudyPlan {
  enabled: boolean;
  goalBooksPerWeek: number;
  reminderTime: string; // "HH:MM" 24hr
  reminderDays: number[]; // 0=Sun..6=Sat
  focusCategory: string;
  booksInPlan: { id: string; title: string; author: string; slug: string }[];
  createdAt: string;
  lastNotifiedDate: string | null; // yyyy-mm-dd
}

export const STUDY_PLAN_KEY = 'afb_study_plan';

export function getStudyPlan(): StudyPlan | null {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem(STUDY_PLAN_KEY);
  return saved ? JSON.parse(saved) : null;
}

export function saveStudyPlan(plan: StudyPlan) {
  localStorage.setItem(STUDY_PLAN_KEY, JSON.stringify(plan));
}

function checkAndFireReminder() {
  const plan = getStudyPlan();
  if (!plan || !plan.enabled) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

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

  saveStudyPlan({ ...plan, lastNotifiedDate: today });
}

export function requestReminderPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return Promise.resolve('denied');
  return Notification.requestPermission();
}

export function ReadingReminderProvider() {
  useEffect(() => {
    checkAndFireReminder();
    const interval = setInterval(checkAndFireReminder, 20000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
