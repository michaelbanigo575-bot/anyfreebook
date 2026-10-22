'use client';

import { useState, useEffect } from 'react';
import { cardClass, primaryButtonClass } from '@/lib/ui';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa-dismissed';

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS 13+ reports itself as a Mac with touch points
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [showIOS, setShowIOS] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Service worker registration is deliberately independent of the install
    // banner. It used to sit behind the "pwa-dismissed" check, which meant a
    // single dismissal permanently disabled offline support (and installability)
    // for that browser.
    if ('serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'development') {
        // Dev: a caching SW serves stale chunks and breaks hot reload — keep it out
        navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
      } else {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      }
    }

    // Already installed — nothing to offer.
    if (isStandalone()) {
      setReady(true);
      return;
    }

    // The banner was dismissed before; leave it dismissed but keep the SW.
    if (localStorage.getItem(DISMISS_KEY)) {
      setDismissed(true);
      setReady(true);
      return;
    }

    // iOS Safari has no beforeinstallprompt — guide the user manually.
    if (isIOS()) {
      setShowIOS(true);
      setReady(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    setReady(true);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, '1');
  };

  const install = async () => {
    if (!deferredPrompt) return;
    const promptEvent = deferredPrompt;
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
    } catch {
      // prompt() may only be called once per event: if the user dismissed the
      // native dialog earlier, the second call rejects. Swallow it instead of
      // leaving an unhandled rejection behind.
    } finally {
      // The event is spent either way — never offer it again, so the button
      // can never be clicked into a dead state.
      setDeferredPrompt(null);
    }
  };

  if (!ready || dismissed) return null;
  if (!deferredPrompt && !showIOS) return null;

  return (
    <div className="fixed bottom-[var(--stack-3,9rem)] left-4 right-4 md:left-auto md:right-6 md:w-80 z-40 animate-slide-up">
      <div className={cardClass({ hover: false, padding: 'p-4' }) + ' shadow-2xl'}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 0 0 5H20" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text)]">Install ANYFREEBOOK</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {showIOS
                ? 'Add to your Home Screen for offline reading'
                : 'Quick access, offline reading, background audio'}
            </p>
          </div>
          <button onClick={dismiss} aria-label="Dismiss install prompt" className="text-[var(--text-muted)] hover:text-[var(--text)] p-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {showIOS ? (
          <ol className="mt-3 space-y-1.5 text-xs text-[var(--text-muted)] list-decimal list-inside">
            <li>Tap the <span className="font-semibold text-[var(--text)]">Share</span> button in Safari</li>
            <li>Choose <span className="font-semibold text-[var(--text)]">Add to Home Screen</span></li>
            <li>Tap <span className="font-semibold text-[var(--text)]">Add</span></li>
          </ol>
        ) : (
          <button onClick={install} className={primaryButtonClass() + ' w-full mt-3'}>
            Install App
          </button>
        )}
      </div>
    </div>
  );
}
