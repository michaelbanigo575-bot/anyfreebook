/**
 * Curated, genuinely free & legally open resources to suggest instead of a
 * hard-to-get (borrow-only or unverified) in-copyright book. Only categories
 * with a specific, well-known, verifiably-open resource are listed here —
 * every book detail page always has a fallback (browse live results in its
 * own category), so an entry here is a bonus, not a requirement.
 */
export interface FreeAlternative {
  title: string;
  publisher: string;
  url: string;
  note: string;
}

const FREE_ALTERNATIVES: Record<string, FreeAlternative> = {
  'free-technology-books': {
    title: 'The Odin Project',
    publisher: 'Free, open-source curriculum',
    url: 'https://www.theodinproject.com/',
    note: 'A complete, free web development curriculum — project-based, community-maintained, no paywall.',
  },
  'free-science-books': {
    title: 'OpenStax Science Textbooks',
    publisher: 'Rice University (OpenStax)',
    url: 'https://openstax.org/subjects/science',
    note: 'Free, peer-reviewed, openly-licensed textbooks covering biology, chemistry, and physics — used by real university courses.',
  },
  'free-business-books': {
    title: 'OpenStax Business Textbooks',
    publisher: 'Rice University (OpenStax)',
    url: 'https://openstax.org/subjects/business',
    note: 'Free, peer-reviewed business and management textbooks, openly licensed for unrestricted reading.',
  },
  'free-economics-books': {
    title: 'OpenStax Principles of Economics',
    publisher: 'Rice University (OpenStax)',
    url: 'https://openstax.org/details/books/principles-economics-3e',
    note: 'A free, complete, current economics textbook covering both micro and macro fundamentals.',
  },
  'free-psychology-books': {
    title: 'OpenStax Psychology 2e',
    publisher: 'Rice University (OpenStax)',
    url: 'https://openstax.org/details/books/psychology-2e',
    note: 'A free, comprehensive introductory psychology textbook, openly licensed.',
  },
  'free-mathematics-books': {
    title: "Paul's Online Math Notes",
    publisher: 'Lamar University',
    url: 'https://tutorial.math.lamar.edu/',
    note: 'Free, thorough calculus/algebra/differential equations notes used by students worldwide — no signup.',
  },
  'free-medicine-books': {
    title: 'NCBI Bookshelf',
    publisher: 'U.S. National Library of Medicine',
    url: 'https://www.ncbi.nlm.nih.gov/books/',
    note: 'Free, full-text medical and life-science reference books and textbooks, hosted by the NIH.',
  },
  'free-nursing-books': {
    title: 'OpenStax Anatomy & Physiology',
    publisher: 'Rice University (OpenStax)',
    url: 'https://openstax.org/details/books/anatomy-and-physiology-2e',
    note: 'A free, complete anatomy and physiology textbook, openly licensed.',
  },
  'free-law-books': {
    title: 'Cornell Legal Information Institute',
    publisher: 'Cornell Law School',
    url: 'https://www.law.cornell.edu/',
    note: 'Free access to U.S. law, case law, and legal reference material, maintained by Cornell Law School.',
  },
  'free-engineering-books': {
    title: 'MIT OpenCourseWare — Engineering',
    publisher: 'MIT',
    url: 'https://ocw.mit.edu/search/?d=Engineering',
    note: 'Free MIT course materials, lecture notes, and textbooks across every engineering discipline.',
  },
  'free-education-books': {
    title: 'MIT OpenCourseWare',
    publisher: 'MIT',
    url: 'https://ocw.mit.edu/',
    note: 'Free course materials from real MIT classes, openly licensed for anyone to use.',
  },
  'free-philosophy-books': {
    title: 'Stanford Encyclopedia of Philosophy',
    publisher: 'Stanford University',
    url: 'https://plato.stanford.edu/',
    note: 'Free, rigorously peer-reviewed philosophy reference — every major topic and thinker, maintained by Stanford.',
  },
  'free-architecture-books': {
    title: 'Internet Archive — Architecture Collection',
    publisher: 'Internet Archive',
    url: 'https://archive.org/details/architecture',
    note: 'A large, genuinely free collection of scanned architecture and design texts, openly readable.',
  },
  'free-arts-books': {
    title: 'Project Gutenberg',
    publisher: 'Project Gutenberg',
    url: 'https://www.gutenberg.org/',
    note: 'Over 70,000 genuinely public-domain books — classic literature, history, philosophy, and the arts — free to read or download, no login.',
  },
  'free-maritime-books': {
    title: "Bowditch's American Practical Navigator",
    publisher: 'U.S. National Geospatial-Intelligence Agency',
    url: 'https://msi.nga.mil/Publications/APN',
    note: 'The authoritative navigation reference, published by the U.S. government and fully in the public domain — free, complete, no restrictions.',
  },
  'free-trades-books': {
    title: 'Instructables',
    publisher: 'Instructables (Autodesk)',
    url: 'https://www.instructables.com/',
    note: 'Thousands of free, real step-by-step trade and craft guides — woodworking, electrical, welding, HVAC, and more.',
  },
  'free-spiritual-religious-books': {
    title: 'Sacred Texts Archive',
    publisher: 'sacred-texts.com',
    url: 'https://www.sacred-texts.com/',
    note: 'A large, free archive of public-domain scripture and religious texts across every major world tradition.',
  },
  'free-history-books': {
    title: 'World History Encyclopedia',
    publisher: 'World History Encyclopedia (non-profit)',
    url: 'https://www.worldhistory.org/',
    note: 'A free, peer-reviewed, non-profit encyclopedia covering world history in real depth — no paywall.',
  },
  'free-literature-books': {
    title: 'Project Gutenberg',
    publisher: 'Project Gutenberg',
    url: 'https://www.gutenberg.org/',
    note: 'The largest collection of genuinely public-domain classic literature online — free to read or download.',
  },
  'free-poetry-rhymes-books': {
    title: 'Poetry Foundation',
    publisher: 'Poetry Foundation',
    url: 'https://www.poetryfoundation.org/poems',
    note: "A huge, free, freely-browsable archive of poetry old and new — no signup, no paywall.",
  },
  'free-fiction-novels': {
    title: 'Project Gutenberg',
    publisher: 'Project Gutenberg',
    url: 'https://www.gutenberg.org/',
    note: 'Tens of thousands of genuinely public-domain novels and stories — free to read or download.',
  },
  'free-childrens-books': {
    title: 'StoryWeaver',
    publisher: 'Pratham Books',
    url: 'https://storyweaver.org.in/',
    note: 'Thousands of openly-licensed children’s picture books, free to read online in dozens of languages.',
  },
  'free-drama-plays-books': {
    title: 'Project Gutenberg — Drama',
    publisher: 'Project Gutenberg',
    url: 'https://www.gutenberg.org/ebooks/bookshelf/56',
    note: 'A free collection of public-domain plays and dramatic literature, from Shakespeare onward.',
  },
  'free-short-stories': {
    title: 'American Literature — Short Stories',
    publisher: 'americanliterature.com',
    url: 'https://americanliterature.com/short-stories',
    note: 'A large, free archive of classic short stories, readable directly with no signup.',
  },
  'free-languages-grammar-books': {
    title: 'Duolingo',
    publisher: 'Duolingo',
    url: 'https://www.duolingo.com/',
    note: 'Free, structured language courses in dozens of languages — no textbook required to get started.',
  },
  'free-biography-memoir-books': {
    title: 'Project Gutenberg — Biography',
    publisher: 'Project Gutenberg',
    url: 'https://www.gutenberg.org/ebooks/bookshelf/86',
    note: 'A free collection of public-domain biographies and memoirs.',
  },
  'free-agriculture-books': {
    title: 'FAO Publications',
    publisher: 'UN Food and Agriculture Organization',
    url: 'https://www.fao.org/publications/en/',
    note: 'Free, authoritative agriculture and farming guides published by the UN’s Food and Agriculture Organization.',
  },
  'free-cooking-food-books': {
    title: 'Project Gutenberg — Cookery',
    publisher: 'Project Gutenberg',
    url: 'https://www.gutenberg.org/ebooks/bookshelf/72',
    note: 'A free collection of public-domain cookbooks and culinary classics.',
  },
  'free-music-books': {
    title: 'IMSLP / Petrucci Music Library',
    publisher: 'IMSLP',
    url: 'https://imslp.org/',
    note: 'The largest free public-domain sheet music library online — scores, not text, but genuinely free and comprehensive.',
  },
  'free-inspirational-motivational-books': {
    title: 'Project Gutenberg',
    publisher: 'Project Gutenberg',
    url: 'https://www.gutenberg.org/',
    note: 'Public-domain personal-development classics (As a Man Thinketh, Acres of Diamonds, and more) — free, no signup.',
  },
  'free-political-magazines': {
    title: 'The Conversation',
    publisher: 'The Conversation (nonprofit academic journalism)',
    url: 'https://theconversation.com/',
    note: 'Free political and current-affairs analysis written by academics and researchers, edited by journalists — no paywall.',
  },
  'free-idioms-proverbs-books': {
    title: 'Wiktionary',
    publisher: 'Wikimedia Foundation',
    url: 'https://en.wiktionary.org/wiki/Category:English_idioms',
    note: 'A free, openly-licensed reference of idioms, proverbs, and figures of speech across languages.',
  },
  'free-african-literature-books': {
    title: 'Brittle Paper',
    publisher: 'Brittle Paper',
    url: 'https://brittlepaper.com/',
    note: 'A well-known, genuinely free African literary magazine — fiction, poetry, and essays from African writers, no paywall.',
  },
  'free-sports-fitness-books': {
    title: 'ExRx.net',
    publisher: 'Exercise Prescription on Internet',
    url: 'https://exrx.net/',
    note: 'A free, comprehensive, evidence-based exercise and training reference — no signup, no paywall.',
  },
};

export function getFreeAlternative(categorySlug: string): FreeAlternative | null {
  return FREE_ALTERNATIVES[categorySlug] || null;
}

/** Book titles (lowercase) with a dedicated blog post naming real free alternatives — takes priority over the generic category pick. */
const BLOG_ALTERNATIVE_BY_TITLE: Record<string, string> = {
  'campbell biology': 'free-alternatives-campbell-biology',
  'principles of economics': 'free-alternatives-mankiw-economics',
  'calculus': 'free-alternative-stewart-calculus',
  'physical chemistry': 'free-alternative-atkins-physical-chemistry',
};

export function getBlogAlternativeSlug(title: string): string | null {
  return BLOG_ALTERNATIVE_BY_TITLE[title.toLowerCase().trim()] || null;
}
