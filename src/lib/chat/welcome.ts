import { MESSAGE_LIMIT } from './types';

export const WELCOME_LIMIT = MESSAGE_LIMIT;
/** The welcome always comes from the team, never from a person's own account. */
export const OFFICIAL_NAME = 'ANYFREEBOOK';
export const OFFICIAL_DOMAIN = '@anyfreebook.com';
export const isOfficialEmail = (email: string) => /^[a-z0-9._+-]+@anyfreebook\.com$/.test(email.trim().toLowerCase());

/** The starting wording. The admin can change it before switching the welcome on. */
export const DEFAULT_WELCOME = `📚 Welcome to ANYFREEBOOK: a place to read, learn and study together.

What you can do:
🔎 Find free books and academic papers from open-access sources
🎧 Explore audiobooks
🔖 Save books to your Library
✍️ Publish your own work as an author
🧠 Use AI summaries and quizzes on authors' publications. Check answers against the original
🎓 Explore live classes
👥 Join group discussions

📝 In our Study Room:
• Share notes and books published on ANYFREEBOOK
• Ask questions about what you're studying
• Tap "I'm stuck" to ask without showing your name to members or group admins
• Follow along when someone presents notes, or read at your own pace
• Use a focus timer if it helps

No question is too small. There are no rankings or study streaks.

🤝 Please:
• Be kind and respectful
• Share only material you're allowed to share
• Never share passwords, bank details or private information
• Don't share leaked exam papers or help others cheat
• Use Report or Block if something is wrong

💬 You can message us right here. Reply with a question, or tell us what works well and what we should improve.

Happy studying! 💙`;

export interface WelcomeState {
  enabled: boolean;
  body: string;
  /** The account it is sent from, if one is set. */
  senderName: string | null;
  senderEmail: string | null;
  /** True when that account is a team account. */
  senderIsOfficial: boolean;
  /** Members with chat on who have not had it yet. */
  waiting: number;
}
