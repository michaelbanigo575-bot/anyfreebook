import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, List, Mail, Section } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy — ANYFREEBOOK',
  description: 'What ANYFREEBOOK collects, why, who can see it and your choices.',
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" intro={<p>This explains what ANYFREEBOOK (“we”) collects, why, who can see it and what you can ask us to do. Messages, groups and Study Room parts apply where those features are available to you.</p>}>
      <Section title="What we collect">
        <List>
          <li><strong>Account and profile:</strong> email address, sign-in details handled by our sign-in provider, name, picture and any author details you add.</li>
          <li><strong>Reading and activity:</strong> saved books, collections, reading progress, study plans, follows, likes, comments, referrals, notifications and views of published works.</li>
          <li><strong>What you share:</strong> publications, files, posts, classroom messages and attendance, and institution membership.</li>
          <li><strong>Messages and groups:</strong> messages, message requests, group membership and roles, reactions, blocks, time-outs, study notes, questions, answers and sessions. We also record that you confirmed you are 18 or over and which rules you agreed to.</li>
          <li><strong>Safety:</strong> reports, a copy of the content reported, suspensions, group closures and administrators’ notes.</li>
          <li><strong>Creator payments:</strong> payout details you give us.</li>
          <li><strong>Technical:</strong> error reports (including the page address and browser type), and information such as your IP address that our systems and providers process to deliver the site and limit abuse.</li>
        </List>
      </Section>
      <Section title="Why we use it">
        <p>To run the features you use, keep your account and library, show your content to the audience you choose, prevent abuse, investigate reports, fix faults, measure use, handle creator programmes, show adverts and meet legal duties. Depending on where you live, we rely on our agreement with you, your consent, our legitimate interest in running a safe service, or a legal duty.</p>
      </Section>
      <Section title="Who can see your content">
        <List>
          <li>Profiles, published works, public posts and comments can be seen by other people, including search engines where applicable. A public group’s name and description are listed to people using chat.</li>
          <li>Direct messages are meant for the two people in the chat. Group messages are for members. If a group shares its history, people who join later can read earlier messages. The Study Room shelf and its questions can be seen by current and later members.</li>
          <li>Anyone who can see something can copy or screenshot it.</li>
          <li><strong>Messages are not end-to-end encrypted.</strong> When something is reported, our administrators see the reported content and, for chats, up to 20 recent messages. People with technical access may access stored content when needed for safety, fault-fixing or legal reasons.</li>
          <li><strong>“No name” study questions</strong> hide your name from other members and the group admin. The account is still stored, and our safety team can see it if the question is reported. The wording of a question may itself reveal who wrote it.</li>
        </List>
      </Section>
      <Section title="Services that process data for us or with us">
        <List>
          <li>Supabase: sign-in, database, file storage and live updates.</li>
          <li>Cloudflare: hosting, delivery, security and call connections.</li>
          <li>Google: sign-in if you choose it, fonts, translation of text you ask to translate, and advertising (AdSense) where shown.</li>
          <li>Google Gemini: makes summaries and quizzes from the text or file of a published work. Google handles it under its own terms, which for some service levels may allow using submitted material to improve its products. Don’t publish confidential material.</li>
          <li>CloudConvert: converts files that need conversion.</li>
          <li>Video providers such as Daily or Jitsi, if a classroom uses them.</li>
          <li>Email delivery providers, for account and service email.</li>
        </List>
        <p>Searches and books from outside libraries involve requests to those sources, and opening their sites is covered by their policies. These services may process data in countries other than yours.</p>
        <p>We don’t sell your personal data. Advertising partners may collect information through cookies as described below. We may disclose information when the law requires it, to protect someone from serious harm, to deal with fraud or legal claims, or if the service is transferred to a new operator who must respect this policy.</p>
      </Section>
      <Section title="Cookies and storage on your device">
        <p>We use cookies to keep you signed in, and your browser’s storage for settings such as theme, reading progress and recent activity. Where adverts are shown, Google and its partners may use cookies to show and measure them. You can block or delete cookies in your browser and manage ad choices in Google’s ad settings; some features may then stop working.</p>
      </Section>
      <Section title="How long we keep it">
        <p>We keep account data and content while your account is open or as long as needed for the purposes above. There is currently no automatic expiry for messages. A message or study item you delete may be hidden rather than erased, so that safety reports can be checked. When an account is deleted, its chats and messages are removed from the working database, but copies saved with safety reports, moderation records, and data we must keep for legal, security or payment reasons can remain. Backups are replaced over time.</p>
      </Section>
      <Section title="Your choices and rights">
        <p>You can edit your profile and much of your content, block people, leave groups and turn off message requests. <strong>Export my data</strong> in Settings downloads only the data this site stores on that device, not your whole account.</p>
        <p>To ask for a copy of your account data, a correction, deletion of your account or data, or to object to or limit a use, email <Mail to="privacy@anyfreebook.com" />. We may need to confirm it is you, and some data may have to be kept as explained above. Depending on where you live, you may also complain to your data protection authority.</p>
      </Section>
      <Section title="Children">
        <p>Messages, groups and Study Rooms are for adults. We rely on people’s own confirmation of age and can’t verify it. People under 18 should use other features only with a parent or guardian’s permission. If you believe a child has given us data without it, or is using chat, contact us.</p>
      </Section>
      <Section title="Security and changes">
        <p>We use access controls and other measures to protect data, but no online service can promise complete security. If we change this policy, we will update the date above and give notice of important changes. See also our <Link href="/terms" className="text-[var(--primary)] hover:underline">Terms of Service</Link>.</p>
      </Section>
    </LegalPage>
  );
}
