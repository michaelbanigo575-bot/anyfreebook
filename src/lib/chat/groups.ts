import type { ReportReason } from './types';
import type { StudyApi } from './study';

export const GROUP_NAME_LIMIT = 60;
export const GROUP_ABOUT_LIMIT = 300;
export const GROUP_SIZE = 50;
export const MESSAGE_PAGE = 100;
export const MAX_LOADED = 1000;
/** Must match the list the database accepts. */
export const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏'] as const;

export type Visibility = 'public' | 'private';

export type Permission = 'approve' | 'moderate' | 'announce';
export const PERMISSIONS: { id: Permission; label: string; text: string }[] = [
  { id: 'approve', label: 'Approve members', text: 'Answer requests to join.' },
  { id: 'moderate', label: 'Keep order', text: 'Delete members’ messages, give time-outs and remove members.' },
  { id: 'announce', label: 'Announce', text: 'Pin messages, plan study sessions and post when only staff may.' },
];
export const RULES_LIMIT = 1000;
export const SLOW_OPTIONS = [
  { seconds: 0, label: 'Off' }, { seconds: 10, label: 'One message every 10 seconds' }, { seconds: 30, label: 'One every 30 seconds' },
  { seconds: 60, label: 'One a minute' }, { seconds: 300, label: 'One every 5 minutes' },
];
export const TIMEOUT_OPTIONS = [{ minutes: 60, label: '1 hour' }, { minutes: 1440, label: '1 day' }, { minutes: 10080, label: '1 week' }];
export const SESSION_LENGTHS = [30, 45, 60, 90, 120, 180];

export interface GroupControls {
  rules: string;
  adminsOnly: boolean;
  slowSeconds: number;
  /** What I may do. The admin has everything. */
  can: Permission[];
  timedOutUntil: string | null;
}
export interface Role { id: string; permissions: Permission[]; timedOutUntil: string | null }
export interface PinnedMessage { id: number; body: string; sender: string }
export interface GroupSession { id: string; title: string; note: string; startsAt: string; minutes: number }
export interface NewSession { title: string; note: string; startsAt: string; minutes: number }

export interface GroupSummary {
  id: string;
  name: string;
  description: string;
  visibility: Visibility;
  /** I asked to join and the admin has not answered. */
  pending: boolean;
  isAdmin: boolean;
  muted: boolean;
  historyForNew: boolean;
  members: number;
  /** Join requests waiting for me, when I am the admin. */
  waiting: number;
  lastBody: string;
  lastSender: string;
  lastAt: string;
  unread: number;
}
export interface PublicGroup { id: string; name: string; description: string; members: number; isMember: boolean; historyForNew: boolean }
export interface InvitePreview { id: string; name: string; description: string; members: number; status: 'none' | 'pending' | 'member'; historyForNew: boolean }
export interface Reaction { emoji: string; total: number; mine: boolean }
export interface GroupMessage {
  id: number;
  senderId: string;
  sender: string;
  mine: boolean;
  body: string;
  at: string;
  replyTo: number | null;
  reactions: Reaction[];
}
export interface GroupMember { id: string; name: string; handle: string | null; isAdmin: boolean }
export interface Applicant { id: string; name: string; banned: boolean }
export interface NewGroup { name: string; description: string; visibility: Visibility; historyForNew: boolean }

/** Everything the group screens need. The screens do not know where the data comes from. */
export interface GroupApi {
  study: StudyApi;
  state(): Promise<'ready' | 'needs-setup' | 'unavailable'>;
  suspended(): Promise<boolean>;
  mine(): Promise<GroupSummary[]>;
  discover(search: string): Promise<PublicGroup[]>;
  create(input: NewGroup): Promise<string>;
  join(groupId: string): Promise<void>;
  invitePreview(token: string): Promise<InvitePreview | null>;
  requestToJoin(token: string): Promise<'pending' | 'member'>;
  /** The newest `limit` messages, oldest first. `more` says whether earlier ones exist. */
  messages(groupId: string, limit: number): Promise<{ messages: GroupMessage[]; more: boolean }>;
  send(groupId: string, body: string, replyTo: number | null): Promise<void>;
  react(groupId: string, messageId: number, emoji: string | null): Promise<void>;
  deleteMessage(groupId: string, messageId: number): Promise<void>;
  report(groupId: string, messageId: number, reason: ReportReason, details: string): Promise<void>;
  block(userId: string): Promise<void>;
  markRead(groupId: string): Promise<void>;
  mute(groupId: string, muted: boolean): Promise<void>;
  /** Also cancels a waiting join request. */
  leave(groupId: string): Promise<void>;
  members(groupId: string): Promise<GroupMember[]>;
  applicants(groupId: string): Promise<Applicant[]>;
  decide(groupId: string, userId: string, approve: boolean): Promise<void>;
  remove(groupId: string, userId: string, ban: boolean): Promise<void>;
  unban(groupId: string, userId: string): Promise<void>;
  transfer(groupId: string, userId: string): Promise<void>;
  update(groupId: string, name: string, description: string): Promise<void>;
  inviteToken(groupId: string, reset: boolean): Promise<string>;
  close(groupId: string): Promise<void>;
  controls(groupId: string): Promise<GroupControls>;
  roles(groupId: string): Promise<Role[]>;
  saveSettings(groupId: string, settings: { rules: string; adminsOnly: boolean; slowSeconds: number }): Promise<void>;
  setHelper(groupId: string, userId: string, permissions: Permission[]): Promise<void>;
  /** 0 minutes ends a time-out. */
  timeout(groupId: string, userId: string, minutes: number): Promise<void>;
  pinned(groupId: string): Promise<PinnedMessage[]>;
  pin(groupId: string, messageId: number, pinned: boolean): Promise<void>;
  upcoming(groupId: string): Promise<GroupSession[]>;
  schedule(groupId: string, session: NewSession): Promise<void>;
  cancelSession(groupId: string, sessionId: string): Promise<void>;
  subscribe(onChange: () => void, onLive: (live: boolean) => void): () => void;
}
