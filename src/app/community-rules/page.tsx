import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, List, Mail, Section } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Community Rules — ANYFREEBOOK',
  description: 'How to behave in posts, comments, classrooms, messages, groups and Study Rooms.',
};

export default function CommunityRulesPage() {
  return (
    <LegalPage title="Community Rules" intro={<p>These rules apply to publications, posts, comments, classrooms, messages, groups and Study Rooms. They are part of our <Link href="/terms" className="text-[var(--primary)] hover:underline">Terms of Service</Link>.</p>}>
      <Section title="Don’t">
        <List>
          <li>Share any sexual content involving a child, or contact or try to attract children for sexual or harmful purposes.</li>
          <li>Harass, bully, threaten or encourage harm to anyone, or attack people for who they are.</li>
          <li>Send sexual content or sexual requests.</li>
          <li>Run scams, ask for passwords, bank details or codes, or send spam or unwanted advertising.</li>
          <li>Share someone’s private information or images without permission, or pretend to be someone else.</li>
          <li>Share books, notes, slides or other work you don’t have the right to share.</li>
          <li>Use study spaces to cheat in exams or to share leaked papers.</li>
          <li>Promote violence or other illegal activity, or share harmful files or links.</li>
          <li>Use messages, groups or Study Rooms if you are under 18.</li>
          <li>Get around a block, ban, time-out or suspension.</li>
        </List>
      </Section>
      <Section title="Stay safe">
        <List>
          <li>Be careful with people you don’t know. Don’t send money or private details.</li>
          <li>Use <strong>Report</strong> and <strong>Block</strong>. In an emergency or if someone is in danger, contact local emergency services first. Reports aren’t watched around the clock.</li>
          <li>Everyone is free to study at their own pace. Joining a session or timer is optional.</li>
        </List>
      </Section>
      <Section title="Group admins and helpers">
        <p>If you run a group, set clear rules, treat members fairly, invite only adults and act on problems. Group powers don’t allow anyone to break these rules.</p>
      </Section>
      <Section title="What can happen">
        <p>We may remove content, suspend chat, close a group or end an account, and may report serious matters to the authorities. A group admin may also delete messages, pause, remove or ban members of that group. If you think we made a mistake, write to <Mail to="legal@anyfreebook.com" />.</p>
      </Section>
    </LegalPage>
  );
}
