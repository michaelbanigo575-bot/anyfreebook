import { notFound } from 'next/navigation';
import { GroupPreview } from './GroupPreview';

export const metadata = { title: 'Group preview', robots: { index: false, follow: false } };

/** The group screens with made-up data, for checking the design on a developer's computer only. */
export default function GroupPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <GroupPreview />;
}
