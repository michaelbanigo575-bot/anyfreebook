'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('pwa-dismissed')) return;

    if ('serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'development') {
        // Dev: a caching SW serves stale chunks and breaks hot reload — keep it out
        navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
      } else {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      }
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const install = async () => {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  const dismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-dismissed', '1');
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-80 z-40 animate-slide-up">
      <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text)]">Install ANYFREEBOOK</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Quick access, offline reading, background audio</p>
          </div>
          <button onClick={dismiss} className="text-[var(--text-muted)] hover:text-[var(--text)] p-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <button
          onClick={install}
          className="w-full mt-3 py-2 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all"
        >
          Install App
        </button>
      </div>
    </div>
  );
}
