import type { ChatApi } from './types';

/** The parts of the browser the watcher listens to. Passed in so the rules can be tested. */
export interface Surroundings {
  visible(): boolean;
  /** Calls back when the page comes back into view, the network returns, or this tab changes a chat. */
  onWake(callback: () => void): () => void;
}

/** Fired inside this tab when a screen changes something the unread badge counts. */
export const CHAT_CHANGED = 'afb-chat-changed';

export const browserSurroundings = (): Surroundings => ({
  visible: () => document.visibilityState === 'visible',
  onWake(callback) {
    document.addEventListener('visibilitychange', callback);
    window.addEventListener('online', callback);
    window.addEventListener(CHAT_CHANGED, callback);
    return () => {
      document.removeEventListener('visibilitychange', callback);
      window.removeEventListener('online', callback);
      window.removeEventListener(CHAT_CHANGED, callback);
    };
  },
});

export const TIMING = { settleMs: 300, livePollMs: 60_000, pollMs: 20_000 };

/**
 * Calls `onChange` when chat data may have changed.
 *
 * Live events do the work. A slower check keeps running behind them, because a live connection can
 * drop without saying so, and a faster one takes over while there is no connection. Several events
 * close together cause one call, and nothing is fetched while the page is hidden.
 */
export function watchChat(
  api: Pick<ChatApi, 'subscribe'>,
  onChange: () => void,
  around: Surroundings = browserSurroundings(),
  timing = TIMING,
): () => void {
  let stopped = false;
  let settle: ReturnType<typeof setTimeout> | undefined;
  let poll: ReturnType<typeof setInterval> | undefined;

  const changed = () => {
    if (stopped || settle !== undefined || !around.visible()) return;
    settle = setTimeout(() => {
      settle = undefined;
      if (!stopped && around.visible()) onChange();
    }, timing.settleMs);
  };
  const every = (ms: number) => {
    clearInterval(poll);
    poll = setInterval(changed, ms);
  };

  every(timing.pollMs);
  const unsubscribe = api.subscribe(changed, live => {
    if (stopped) return;
    every(live ? timing.livePollMs : timing.pollMs);
    // catch up on anything sent while the connection was being made
    if (live) changed();
  });
  // coming back to the page catches up on what happened while it was hidden
  const unwake = around.onWake(changed);

  return () => {
    stopped = true;
    clearTimeout(settle);
    clearInterval(poll);
    unwake();
    unsubscribe();
  };
}
