import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, List, Mail, Section } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Terms of Service — ANYFREEBOOK',
  description: 'The terms for using ANYFREEBOOK.',
};

const link = 'text-[var(--primary)] hover:underline';

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" intro={<p>These terms are an agreement between you and ANYFREEBOOK (“we”, “us”). By using the service you agree to them, to the <Link href="/community-rules" className={link}>Community Rules</Link> and to the <Link href="/copyright" className={link}>Copyright Policy</Link>. Our <Link href="/privacy" className={link}>Privacy Policy</Link> explains how we handle personal data. If you don’t agree, please don’t use ANYFREEBOOK.</p>}>
      <Section title="1. The service">
        <p>ANYFREEBOOK helps people find books and papers from open-access and public-domain sources, and lets users publish their own work and take part in community features such as posts, comments, classrooms and, where available, messages, groups and Study Rooms. Some features are tests and may change, pause or end.</p>
        <p>Much of the catalogue is provided by other organisations. We link to or show it but don’t control it. A listing doesn’t guarantee that a work is free to use in your country or for your purpose; check its licence. Works and messages posted by users are hosted by us on their behalf.</p>
      </Section>
      <Section title="2. Who may use it">
        <p>If you are under 18, use ANYFREEBOOK only with the permission of a parent or guardian who accepts these terms for you. Messages, groups and Study Rooms are only for people aged 18 or over. You must be able to use the service lawfully where you live.</p>
      </Section>
      <Section title="3. Your account">
        <p>Give accurate information, keep your sign-in details private and tell us if you think someone else is using your account. You are responsible for activity you allow on your account.</p>
      </Section>
      <Section title="4. Your content">
        <p>You keep ownership of what you post, upload or send. You give us a worldwide, non-exclusive, royalty-free permission to store, copy, format, convert, display and share it only as needed to run, protect and promote the service, including making previews, summaries and quizzes of published works. For private messages and group content, we don’t use this permission to promote the service. The permission ends when the content is deleted, except for copies we need for safety reports, legal duties, disputes or backups, and copies others were already allowed to keep.</p>
        <p>You promise that you have the right to share your content and that it doesn’t break the law or anyone else’s rights. Content from users is their own. It isn’t our advice or opinion, and we don’t check all of it before it appears.</p>
      </Section>
      <Section title="5. Rules and moderation">
        <p>You must follow the Community Rules. We may review reported content, and may remove content, limit features, suspend chat, close groups or end accounts when we believe it is needed to apply these terms, protect people or follow the law. We aren’t able to promise that we will find or remove every harmful item. Group admins and their helpers are users, not our staff or agents.</p>
      </Section>
      <Section title="6. Publishing and earnings">
        <p>You are responsible for the works you publish. Any creator earnings, rewards or payment programme is subject to its published conditions, checks for fraud and the money actually available. Showing a programme or a view count doesn’t promise any payment. We may change a programme for the future; this doesn’t cancel an amount already confirmed as owed to you.</p>
      </Section>
      <Section title="7. Study tools and AI">
        <p>Summaries, quizzes, translations and other automated results can be incomplete or wrong. Check them against the original. They aren’t professional, medical, legal or financial advice, and they don’t guarantee any exam or study result. Nothing on ANYFREEBOOK is an emergency service. If someone is in danger, contact local emergency services.</p>
      </Section>
      <Section title="8. Acceptable use">
        <p>Don’t break the law, attack or overload the service, get around access limits or security, collect data from the service by automated means without our written permission, or pretend to be someone else.</p>
      </Section>
      <Section title="9. Advertisers and other services">
        <p>Adverts, sponsors, links and outside services (for example video calls or sign-in providers) have their own terms. We aren’t responsible for what they offer or do, except where the law says otherwise.</p>
      </Section>
      <Section title="10. No warranties">
        <p>To the fullest extent the law allows, ANYFREEBOOK is provided “as is” and “as available”, without warranties of any kind. We don’t promise that it will always work, be secure or error-free, or that content is accurate, lawful or suitable for you. Keep your own copies of anything important.</p>
      </Section>
      <Section title="11. Limit of our liability">
        <p>To the fullest extent the law allows, we and the people who work on ANYFREEBOOK aren’t liable for indirect or consequential loss, or for loss of profit, data, goodwill or opportunity, arising from the service, user content, outside content, or the conduct of users or others. Our total liability for all claims about the service is limited to what you paid us for it in the 12 months before the claim, or any higher minimum the law requires.</p>
        <p><strong className="text-[var(--text)]">Nothing in these terms excludes or limits any right or liability that the law doesn’t allow to be excluded or limited</strong>, including your mandatory rights as a consumer, or liability for fraud, or for death or personal injury caused by negligence where that applies.</p>
      </Section>
      <Section title="12. Claims caused by your actions">
        <p>To the extent the law allows, if someone makes a claim against us because of your content, your unlawful use of the service or your breaking these terms or another person’s rights, you agree to cover our reasonable losses and costs caused by it. This doesn’t cover loss caused by our own wrongdoing.</p>
      </Section>
      <Section title="13. Ending and changes">
        <p>You can stop using ANYFREEBOOK at any time and ask us to delete your account. We may suspend or end access as described above. We may update these terms; we will change the date above and, for important changes, give a notice in the service. If you keep using it after a change takes effect, the new terms apply to your later use. If one part of these terms can’t be enforced, the rest still applies.</p>
      </Section>
      <Section title="14. Contact">
        <p>Legal and copyright: <Mail to="legal@anyfreebook.com" /></p>
      </Section>
    </LegalPage>
  );
}
