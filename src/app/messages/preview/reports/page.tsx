import { notFound } from 'next/navigation';
import { SampleReports } from './SampleReports';

export const metadata = { title: 'Report queue preview', robots: { index: false, follow: false } };

/** The admin report screen with made-up data, for checking the design on a developer's computer only. */
export default function ReportPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <SampleReports />;
}
