'use client';

import { useState } from 'react';
import { SocialShareButtons } from './SocialShareButtons';
import { SavingsShareCard } from './SavingsShareCard';

interface BookDetailClientProps {
  bookTitle: string;
  bookAuthor: string;
}

export function BookDetailClient({ bookTitle, bookAuthor }: BookDetailClientProps) {
  const [showSavings, setShowSavings] = useState(false);

  return (
    <>
      <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <button
          onClick={() => setShowSavings(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 text-white shadow-md hover:shadow-lg hover:bg-emerald-600 transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          See How Much You Saved
        </button>
        <SocialShareButtons title={bookTitle} />
      </div>

      {showSavings && (
        <SavingsShareCard
          bookTitle={bookTitle}
          bookAuthor={bookAuthor}
          onClose={() => setShowSavings(false)}
        />
      )}
    </>
  );
}
