import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, List, Mail, Section } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Copyright Policy — ANYFREEBOOK',
  description: 'How to report copyright infringement on ANYFREEBOOK and how to respond.',
};

export default function CopyrightPage() {
  return (
    <LegalPage title="Copyright Policy" intro={<p>We respect authors’ rights. Only share work that you own, that is in the public domain, or that its licence or owner allows you to share.</p>}>
      <Section title="Report infringement">
        <p>Email <Mail to="legal@anyfreebook.com" /> with:</p>
        <List>
          <li>your name and contact details, and whether you are the owner or act for them;</li>
          <li>the work you own;</li>
          <li>the exact address or location of the material you are reporting;</li>
          <li>a statement that you believe in good faith the use isn’t authorised by the owner or the law;</li>
          <li>a statement that your notice is accurate, and your signature (a typed name is fine).</li>
        </List>
        <p>We may remove or restrict access to the material and share your notice with the person who posted it. False notices can have legal consequences.</p>
      </Section>
      <Section title="If your work was removed">
        <p>If you believe it was removed by mistake, send the same address with your details, what was removed, why you have the right to share it, a statement that this is accurate, and your signature. We may share your response with the person who complained. Putting material back depends on the law that applies.</p>
      </Section>
      <Section title="Repeat infringement">
        <p>We may end the accounts of people who repeatedly infringe copyright.</p>
      </Section>
    </LegalPage>
  );
}
