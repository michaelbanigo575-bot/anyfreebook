'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SECTION_HOME, sectionOf, type Section } from '@/lib/sections';
import { storageGet, storageSet } from '@/lib/safeStorage';

const KEY = 'afb-section';

/**
 * The section to show navigation for. A section's own pages decide it; shared pages keep the one
 * the reader came from. First-time visitors are in Discover.
 */
export function useSection(): Section {
  const own = sectionOf(usePathname() || '/');
  const [last, setLast] = useState<Section>('discover');
  useEffect(() => {
    if (own) { storageSet(KEY, own); setLast(own); }
    else if (storageGet(KEY) === 'community') setLast('community');
  }, [own]);
  return own || last;
}

export function SectionSwitch({ section }: { section: Section }) {
  return (
    <nav aria-label="Sections" className="flex justify-center pb-2">
      <div className="grid grid-cols-2 w-full max-w-sm p-1 rounded-full bg-white/10 border border-white/15">
        {([['discover', 'Discover'], ['community', 'Community']] as const).map(([id, label]) => (
          <Link key={id} href={SECTION_HOME[id]} aria-current={section === id ? 'true' : undefined}
            className={`flex items-center justify-center h-8 rounded-full text-[13px] font-bold transition-colors ${section === id ? 'bg-white text-[#050F26] shadow' : 'text-[#D5E6F7] hover:text-white'}`}>
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
