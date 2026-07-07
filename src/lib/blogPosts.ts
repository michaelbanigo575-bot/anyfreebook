export interface BlogBlock {
  type: 'p' | 'h2' | 'ul' | 'book' | 'tip';
  text?: string;
  items?: string[];
  title?: string;
  author?: string;
  note?: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  category: string;
  readTime: string;
  date: string;
  content: BlogBlock[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'top-25-free-programming-books-2026',
    title: 'Top 25 Free Programming Books in 2026',
    description: 'The best free programming books for every language and skill level — from Python beginners to systems programming, all legally free to read and download.',
    category: 'Technology',
    readTime: '12 min',
    date: 'Jan 15, 2026',
    content: [
      { type: 'p', text: 'Programming books are expensive — a single new O\'Reilly title often costs $40–60, and a full learning path can run past $300. The good news: some of the most respected programming books ever written are completely free, released by their authors under open licenses or published openly on the web. This list collects 25 of the best, organized by where you are in your journey.' },
      { type: 'h2', text: 'For complete beginners' },
      { type: 'book', title: 'Automate the Boring Stuff with Python', author: 'Al Sweigart', note: 'The single best first programming book. Free to read online, teaches Python through practical tasks — renaming files, filling forms, scraping websites — instead of abstract theory.' },
      { type: 'book', title: 'Python Crash Course', author: 'Eric Matthes', note: 'A structured, project-driven introduction. Pairs well with Automate the Boring Stuff: read this for foundations, that for practical wins.' },
      { type: 'book', title: 'Eloquent JavaScript', author: 'Marijn Haverbeke', note: 'The classic free introduction to JavaScript and programming in general, with interactive exercises built into the online edition.' },
      { type: 'p', text: 'Start with exactly one of these, finish it, and build something small before adding more books. Collecting books is not the same as learning.' },
      { type: 'h2', text: 'Leveling up: intermediate essentials' },
      { type: 'book', title: 'You Don\'t Know JS', author: 'Kyle Simpson', note: 'A free book series that goes deep on how JavaScript actually works — scope, closures, prototypes, async. Read after your first project, not before.' },
      { type: 'book', title: 'The Linux Command Line', author: 'William Shotts', note: 'Free from the author. Every developer eventually needs the terminal; this is the gentlest thorough introduction.' },
      { type: 'book', title: 'Pro Git', author: 'Scott Chacon & Ben Straub', note: 'The official Git book, free forever. Chapters 1–3 cover 90% of what you\'ll use daily.' },
      { type: 'book', title: 'Structure and Interpretation of Computer Programs', author: 'Abelson & Sussman', note: 'MIT\'s legendary text, free online. Harder than everything above, and worth it — it changes how you think about programs.' },
      { type: 'h2', text: 'Specialization: data, ML, and systems' },
      { type: 'book', title: 'Deep Learning', author: 'Ian Goodfellow, Yoshua Bengio & Aaron Courville', note: 'The standard deep learning reference, free on the authors\' site. Requires linear algebra and calculus.' },
      { type: 'book', title: 'The TypeScript Handbook', author: 'Microsoft', note: 'The official, always-current way to learn TypeScript, maintained free by the language team itself.' },
      { type: 'ul', items: [
        'Operating Systems: Three Easy Pieces — the free OS textbook used by dozens of universities',
        'High Performance Browser Networking (Ilya Grigorik) — free from O\'Reilly, essential for web performance',
        'The Rust Book — the official free way to learn Rust',
        'Dive Into Deep Learning — free, code-first ML with runnable notebooks',
        'Crafting Interpreters (Robert Nystrom) — free online; build two programming languages from scratch',
      ] },
      { type: 'h2', text: 'How to actually find these' },
      { type: 'p', text: 'Every book above is searchable on ANYFREEBOOK — we aggregate Open Library, Project Gutenberg, Internet Archive, Google Books, and open-access repositories in one search. Type the title, check the source badge, and read online or download in the formats the source offers. No sign-up needed.' },
      { type: 'tip', text: 'Pick one book. Finish it. Build a small project with what you learned. Then come back for the next one — that loop beats any 25-book reading marathon.' },
    ],
  },
  {
    slug: 'free-alternatives-campbell-biology',
    title: 'Free Alternatives to Campbell Biology (Save $189)',
    description: 'Campbell Biology costs $189 new. These free, legal alternatives cover the same introductory biology material — used by real universities.',
    category: 'Sciences',
    readTime: '8 min',
    date: 'Jan 10, 2026',
    content: [
      { type: 'p', text: 'Campbell Biology is the standard first-year biology text at hundreds of universities, and a new copy costs about $189 — more than many students\' weekly budget. If your course follows the standard intro-biology sequence (cell biology, genetics, evolution, physiology, ecology), openly licensed textbooks cover the same ground for free.' },
      { type: 'h2', text: 'The best free replacement' },
      { type: 'book', title: 'Biology 2e (OpenStax)', author: 'Rice University', note: 'A complete, peer-reviewed intro biology textbook written specifically to match courses that use Campbell. Free PDF and web versions, professionally edited, with review questions per chapter. This is the one to get.' },
      { type: 'p', text: 'OpenStax is published by Rice University and funded by foundations precisely so students don\'t have to buy $200 textbooks. Their books are not scans or summaries — they are complete textbooks used officially at thousands of institutions.' },
      { type: 'h2', text: 'Free books for specific units' },
      { type: 'ul', items: [
        'Concepts of Biology (OpenStax) — a lighter one-semester version for non-majors',
        'Microbiology (OpenStax) — if your course leans micro',
        'Anatomy and Physiology (OpenStax) — for the physiology units',
        'On the Origin of Species (Darwin) — public domain on Project Gutenberg; still remarkably readable for the evolution unit',
      ] },
      { type: 'h2', text: 'How to study from a free textbook when your class uses Campbell' },
      { type: 'p', text: 'Chapter numbers won\'t match, so navigate by topic instead: your syllabus says "cell respiration," you read the cell respiration chapter. Free texts include the same figures-first explanations, and end-of-chapter questions map closely. For the handful of topics where your professor references specific Campbell figures, a library reserve copy fills the gap — most university libraries keep one.' },
      { type: 'tip', text: 'Search any of these titles on ANYFREEBOOK to get the direct source link — we aggregate OpenStax mirrors, Internet Archive, and Open Library in one search.' },
    ],
  },
  {
    slug: 'learn-machine-learning-free-reading-list',
    title: 'Learn Machine Learning for Free — Complete Reading List',
    description: 'A free, ordered reading path from ML beginner to practitioner: 15 books with estimated study times, all legally free.',
    category: 'Technology',
    readTime: '10 min',
    date: 'Jan 5, 2026',
    content: [
      { type: 'p', text: 'Machine learning has the best free literature of any technical field — the standard references are free because the researchers who wrote them wanted them read. The problem isn\'t finding free ML books; it\'s reading them in an order that doesn\'t crush you. Here\'s a path that works, with honest time estimates.' },
      { type: 'h2', text: 'Stage 1: Foundations (4–8 weeks)' },
      { type: 'book', title: 'Python Crash Course', author: 'Eric Matthes', note: 'Skip if you already write Python comfortably. Otherwise, everything downstream depends on this.' },
      { type: 'book', title: 'Mathematics for Machine Learning', author: 'Deisenroth, Faisal & Ong', note: 'Free from Cambridge University Press. Linear algebra, calculus, and probability — exactly the subset ML needs, no more.' },
      { type: 'h2', text: 'Stage 2: Core ML (6–10 weeks)' },
      { type: 'book', title: 'An Introduction to Statistical Learning', author: 'James, Witten, Hastie & Tibshirani', note: 'The most recommended first ML book on earth, free from the authors. Concepts first, math second, with labs in Python or R.' },
      { type: 'book', title: 'Dive Into Deep Learning', author: 'Zhang, Lipton, Li & Smola', note: 'Free and interactive — every concept comes with runnable code. The fastest route from "I know Python" to "I trained a network."' },
      { type: 'h2', text: 'Stage 3: Depth (ongoing)' },
      { type: 'book', title: 'Deep Learning', author: 'Goodfellow, Bengio & Courville', note: 'The reference text, free online. Read chapters as you need them rather than front to back.' },
      { type: 'book', title: 'The Elements of Statistical Learning', author: 'Hastie, Tibshirani & Friedman', note: 'The heavyweight older sibling of ISL, also free. Graduate level; treat it as an encyclopedia.' },
      { type: 'ul', items: [
        'Pattern Recognition and Machine Learning (Bishop) — free PDF released by Microsoft Research',
        'Reinforcement Learning: An Introduction (Sutton & Barto) — the standard RL text, free from the authors',
        'Speech and Language Processing (Jurafsky & Martin) — free drafts; the NLP standard',
        'Probabilistic Machine Learning (Murphy) — modern, comprehensive, free drafts online',
      ] },
      { type: 'h2', text: 'The honest advice' },
      { type: 'p', text: 'Most people fail this path by reading Stage 3 books first. ISL plus Dive Into Deep Learning, actually completed with the exercises, puts you ahead of the majority of self-taught ML learners. Total cost of the entire path above: $0.' },
      { type: 'tip', text: 'All of these are findable through ANYFREEBOOK search — we link you to the official free versions hosted by the authors and open repositories.' },
    ],
  },
  {
    slug: 'where-to-download-free-medical-textbooks',
    title: 'Where to Download Free Medical Textbooks Online',
    description: 'A complete guide to finding free, legal medical textbooks and references: anatomy, pharmacology, pathology, and the open-access sources that host them.',
    category: 'Medicine',
    readTime: '9 min',
    date: 'Dec 28, 2025',
    content: [
      { type: 'p', text: 'Medical textbooks are the most expensive books in education — $100–350 each, with a preclinical shelf easily passing $1,500. There is a real, legal free ecosystem, but you need to know which sources are legitimate. Everything below is legal and openly licensed or public access.' },
      { type: 'h2', text: 'The legitimate free sources' },
      { type: 'ul', items: [
        'OpenStax Anatomy & Physiology — a complete, peer-reviewed A&P textbook, free from Rice University',
        'NCBI Bookshelf — the U.S. National Library of Medicine hosts full free books including StatPearls, essentially a free encyclopedic clinical reference',
        'PubMed Central — millions of free full-text biomedical research articles (searchable directly through ANYFREEBOOK)',
        'Internet Archive\'s lending library — borrowable digital copies of many classic medical texts',
        'WHO and CDC publications — free, authoritative clinical guidelines and epidemiology references',
      ] },
      { type: 'h2', text: 'What to use for each preclinical subject' },
      { type: 'book', title: 'Anatomy & Physiology (OpenStax)', author: 'Rice University', note: 'Covers the standard two-semester A&P sequence. Not Gray\'s Anatomy — but for coursework, it\'s complete and free.' },
      { type: 'book', title: 'StatPearls', author: 'NCBI Bookshelf', note: 'Thousands of free, constantly updated clinical review articles. Widely used for board prep — think of it as a free reference shelf.' },
      { type: 'book', title: 'Gray\'s Anatomy (1918 edition)', author: 'Henry Gray', note: 'The classic edition is public domain on Project Gutenberg and Internet Archive. Anatomical fundamentals haven\'t changed; terminology sometimes has — use it alongside a modern atlas.' },
      { type: 'h2', text: 'A word of caution' },
      { type: 'p', text: 'Sites offering free downloads of current copyrighted editions (the newest Robbins, Katzung, or Harrison\'s) are piracy sites — they carry malware risk and legal risk, and we don\'t index them. The legal ecosystem above genuinely covers preclinical coursework; where it can\'t replace a current clinical text, your institution\'s library almost always provides electronic access for enrolled students — ask, because most students never do.' },
      { type: 'tip', text: 'ANYFREEBOOK searches PubMed Central, Internet Archive, and Open Library simultaneously — one search across the whole legal free-medical ecosystem.' },
    ],
  },
  {
    slug: '15-best-free-audiobooks-all-time',
    title: 'The 15 Best Free Audiobooks of All Time',
    description: 'The best legally free audiobooks — public domain classics with outstanding narrations, and where to listen to them.',
    category: 'Collections',
    readTime: '7 min',
    date: 'Dec 20, 2025',
    content: [
      { type: 'p', text: 'Audible costs $14.95 a month. But the public domain contains many of the greatest books ever written, and volunteer and archival projects have recorded them all. Here are fifteen that are genuinely excellent as listening experiences, not just famous titles.' },
      { type: 'h2', text: 'Fiction that works brilliantly as audio' },
      { type: 'ul', items: [
        'Pride and Prejudice (Jane Austen) — dialogue-driven and witty; Austen was practically writing for audio',
        'The Adventures of Sherlock Holmes (Arthur Conan Doyle) — short, self-contained mysteries, perfect for commutes',
        'Dracula (Bram Stoker) — written as letters and diary entries, so multi-reader recordings feel like radio drama',
        'The Count of Monte Cristo (Alexandre Dumas) — the greatest revenge plot ever, and long enough to last months',
        'Frankenstein (Mary Shelley) — short, atmospheric, and far better than any film version',
        'Treasure Island (Robert Louis Stevenson) — the ideal family listen',
        'A Christmas Carol (Charles Dickens) — Dickens performed it aloud himself on tour; it was built for the ear',
      ] },
      { type: 'h2', text: 'Nonfiction and ideas' },
      { type: 'ul', items: [
        'Meditations (Marcus Aurelius) — short, calming, and endlessly re-listenable',
        'The Art of War (Sun Tzu) — under two hours; the most quoted strategy text in history',
        'Walden (Henry David Thoreau) — slow listening in the best sense',
        'The Autobiography of Benjamin Franklin — surprisingly funny and modern',
        'On the Origin of Species (Charles Darwin) — clearer aloud than on the page',
      ] },
      { type: 'h2', text: 'Where the free recordings live' },
      { type: 'p', text: 'LibriVox coordinates volunteers who have recorded tens of thousands of public domain books — quality varies by narrator, so sample the first chapter and switch versions freely; popular titles have several. Internet Archive hosts and streams these plus archival recordings. ANYFREEBOOK\'s audiobooks section links directly to the source recordings, and the built-in reader can also read any public domain text aloud with text-to-speech.' },
      { type: 'tip', text: 'For multi-narrator LibriVox recordings, check the "dramatic reading" versions — Dracula and A Christmas Carol both have excellent ones.' },
    ],
  },
  {
    slug: 'free-alternatives-mankiw-economics',
    title: "Free Alternatives to Mankiw's Principles of Economics (Save $170)",
    description: "Mankiw's Principles of Economics costs about $170. These free, openly licensed alternatives teach the same intro micro and macro — used at real universities.",
    category: 'Economics',
    readTime: '8 min',
    date: 'Dec 15, 2025',
    content: [
      { type: 'p', text: 'Mankiw\'s Principles of Economics is the best-selling economics textbook in the world, and it costs about $170 new. Intro economics, however, is one of the best-covered subjects in open publishing — several complete, peer-reviewed, free textbooks teach the same ten principles, supply and demand, elasticity, market structures, and macro fundamentals.' },
      { type: 'h2', text: 'The direct replacements' },
      { type: 'book', title: 'Principles of Economics 3e (OpenStax)', author: 'Rice University', note: 'A complete micro + macro intro text, free as PDF or web. Chapter coverage maps closely to Mankiw — this is the default choice.' },
      { type: 'book', title: 'The Economy (CORE Econ)', author: 'CORE Team', note: 'A genuinely modern free textbook built by an international consortium — teaches economics through real data, inequality, and climate questions. Used at UCL and dozens of universities. Choose this if Mankiw bores you.' },
      { type: 'book', title: 'Principles of Microeconomics / Macroeconomics (OpenStax)', author: 'Rice University', note: 'The same OpenStax material split into single-semester volumes, matching how most courses are structured.' },
      { type: 'h2', text: 'Classic texts worth reading alongside' },
      { type: 'ul', items: [
        'The Wealth of Nations (Adam Smith) — public domain; read selectively, Book I especially',
        'Essays in Persuasion (John Maynard Keynes) — public domain in many countries; Keynes was a superb writer',
        'Economic Sophisms (Frédéric Bastiat) — free, short, and the wittiest defense of free trade ever written',
      ] },
      { type: 'h2', text: 'Making a free text work for a Mankiw course' },
      { type: 'p', text: 'Match by topic, not chapter number. Every intro course covers the same sequence: scarcity and trade-offs, supply and demand, elasticity, consumer/producer surplus, market failures, then GDP, inflation, unemployment, and monetary policy. OpenStax covers each with the same graphs. The end-of-chapter problems differ from your problem sets, but the concepts tested are identical — and CORE\'s interactive charts often explain them better than static textbook figures.' },
      { type: 'tip', text: 'Search "OpenStax economics" or any classic title on ANYFREEBOOK to jump straight to the legitimate free source.' },
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find(p => p.slug === slug);
}
