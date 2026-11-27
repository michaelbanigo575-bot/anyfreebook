/** Chat stays invisible until this is set to "true" at build time (after the database script is run). */
export const CHAT_ENABLED = process.env.NEXT_PUBLIC_CHAT_ENABLED === 'true';

export const REQUEST_LIMIT = 300;
export const MESSAGE_LIMIT = 2000;

export interface Thread {
  id: string;
  otherId: string;
  name: string;
  handle: string | null;
  status: 'pending' | 'active';
  /** A request waiting for me to accept or delete. */
  isRequest: boolean;
  lastBody: string;
  lastMine: boolean;
  lastAt: string;
  unread: number;
}

export interface Unread {
  messages: number;
  requests: number;
  /** Unread messages in groups that are not muted. */
  groupMessages?: number;
  /** People waiting to join groups where I can approve them. */
  joinRequests?: number;
}
export interface Message { id: number; mine: boolean; body: string; at: string }
export interface Person { id: string; name: string; handle: string | null }

export type ReportReason = 'spam' | 'harassment' | 'sexual' | 'scam' | 'underage' | 'other';

export const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: 'spam', label: 'Spam' },
  { id: 'harassment', label: 'Harassment or bullying' },
  { id: 'sexual', label: 'Sexual content' },
  { id: 'scam', label: 'Scam or fraud' },
  { id: 'underage', label: 'This person seems under 18' },
  { id: 'other', label: 'Something else' },
];

/** Everything the chat screens need. The screens do not know where the data comes from. */
export interface ChatApi {
  /** unavailable: the database is not set up. needs-setup: this person has not turned chat on. */
  state(): Promise<'ready' | 'needs-setup' | 'unavailable'>;
  enable(): Promise<void>;
  /** True while this person's chat is suspended. */
  suspended(): Promise<boolean>;
  inbox(): Promise<Thread[]>;
  unread(): Promise<Unread>;
  /** Calls onChange when something may be new. onLive says whether the live connection is up. Returns a way to stop. */
  subscribe(onChange: () => void, onLive: (live: boolean) => void): () => void;
  messages(threadId: string): Promise<Message[]>;
  send(threadId: string, body: string): Promise<void>;
  start(toId: string, body: string): Promise<string>;
  person(id: string): Promise<(Person & { mutual: boolean }) | null>;
  respond(threadId: string, accept: boolean): Promise<void>;
  markRead(threadId: string): Promise<void>;
  block(userId: string): Promise<void>;
  unblock(userId: string): Promise<void>;
  blocked(): Promise<Person[]>;
  report(threadId: string, reason: ReportReason, details: string): Promise<void>;
  allowsRequests(): Promise<boolean>;
  setAllowsRequests(allow: boolean): Promise<void>;
}

const MESSAGES: Record<string, string> = {
  'sign-in-required': 'Sign in to use messages.',
  'turn-on-chat': 'Turn on chat first.',
  'invite-only': 'Chat is in a small trial and isn’t open to your account yet.',
  suspended: 'Your chat is suspended, so you can’t send messages.',
  'adults-only': 'Messages are for people aged 18 or over.',
  unavailable: 'You can’t message this person right now.',
  'not-found': 'This chat is no longer available.',
  'waiting-for-reply': 'Your request is waiting. You can send more once it’s accepted.',
  'accept-first': 'Accept the request before you reply.',
  'empty-message': 'Write a message first.',
  'message-too-long': 'That message is too long.',
  'no-links-in-requests': 'Message requests can’t include links.',
  'too-many-requests': 'You’ve sent many requests today. Try again tomorrow.',
  'too-many-reports': 'You’ve sent many reports today. Try again tomorrow.',
  'slow-down': 'You’re sending messages quickly. Wait a minute.',
  'group-name': 'A group name needs 3 to 60 characters.',
  'no-links-in-group': 'A public group’s name and description can’t include links.',
  'group-full': 'This group is full.',
  'timed-out': 'The group has paused your posting for now.',
  'admins-only': 'Only the group admin and helpers can post right now.',
  'slow-mode': 'This group is in slow mode. Wait a little before posting again.',
  'too-many-pins': 'A group can pin 3 messages. Unpin one first.',
  'too-many-helpers': 'A group can have 5 helpers.',
  'too-many-sessions': 'A group can have 10 sessions planned.',
  'session-details': 'Give the session a title of 3 to 80 characters.',
  'session-time': 'Choose a time in the next 6 months.',
  'note-title': 'Give the notes a title of 3 to 120 characters.',
  'note-too-long': 'Those notes are too long. Split them into two.',
  'shelf-full': 'The study shelf holds 30 items. Remove one first.',
  'too-many-notes': 'You’ve added a lot today. Try again tomorrow.',
  'book-not-found': 'That book wasn’t found. Paste the address of a work published on ANYFREEBOOK.',
  'too-many-questions': 'You’ve posted a lot of questions and answers today. Try again tomorrow.',
  'someone-presenting': 'Someone else is presenting right now.',
  'too-many-groups': 'You’ve reached the group limit for now.',
};

const GROUP_MESSAGES: Record<string, string> = {
  unavailable: 'That isn’t available right now.',
  'not-found': 'This is no longer available to you.',
  'too-many-requests': 'There are too many join requests right now. Try again later.',
};

/** Turns a database error such as "chat:slow-down" into words for the reader. */
export function chatErrorText(error: unknown, where: 'chat' | 'group' = 'chat'): string {
  const code = String((error as { message?: string })?.message || error).match(/chat:([a-z-]+)/)?.[1];
  if (where === 'group' && code && GROUP_MESSAGES[code]) return GROUP_MESSAGES[code];
  return (code && MESSAGES[code]) || 'Something went wrong. Try again.';
}
