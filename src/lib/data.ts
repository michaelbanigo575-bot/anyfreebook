export interface Book {
  id: string;
  title: string;
  author: string;
  slug: string;
  coverUrl: string | null;
  description: string;
  rating: number;
  ratingCount: number;
  contentType: 'BOOK' | 'AUDIOBOOK' | 'COMIC' | 'NOVEL' | 'MAGAZINE';
  formats: string[];
  viewCount: number;
  likeCount: number;
  pageCount?: number;
  publishYear?: number;
  isbn?: string;
  publisher?: string;
  language: string;
  category: { name: string; slug: string };
  narrator?: string;
  duration?: number;
  sourceUrl?: string;
  sourceType?: 'local' | 'openlibrary' | 'gutenberg' | 'googlebooks' | 'archive' | 'pubmed' | 'doaj';
  downloadLinks?: { label: string; url: string; source: string }[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  bookCount: number;
  icon: string;
  gradient: string;
}

export interface Collection {
  id: string;
  title: string;
  description: string;
  slug: string;
  bookCount: number;
  coverBooks: Book[];
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  ogImage: string;
  publishedAt: string;
  updatedAt: string;
}

const CATEGORIES: Category[] = [
  { id: '1', name: 'Technology', slug: 'free-technology-books', description: 'Programming, AI, cybersecurity, and software engineering books', bookCount: 34200, icon: '💻', gradient: 'from-blue-500/20 to-cyan-500/20' },
  { id: '2', name: 'Engineering', slug: 'free-engineering-books', description: 'Mechanical, civil, electrical, and chemical engineering textbooks', bookCount: 28100, icon: '⚙️', gradient: 'from-orange-500/20 to-amber-500/20' },
  { id: '3', name: 'Medicine', slug: 'free-medicine-books', description: 'Medical textbooks, clinical guides, and health sciences', bookCount: 22400, icon: '⚕️', gradient: 'from-red-500/20 to-rose-500/20' },
  { id: '4', name: 'Business', slug: 'free-business-books', description: 'MBA textbooks, finance, marketing, and entrepreneurship', bookCount: 19800, icon: '📊', gradient: 'from-emerald-500/20 to-green-500/20' },
  { id: '5', name: 'Law', slug: 'free-law-books', description: 'Legal textbooks, case studies, and constitutional law', bookCount: 15600, icon: '⚖️', gradient: 'from-indigo-500/20 to-violet-500/20' },
  { id: '6', name: 'Sciences', slug: 'free-science-books', description: 'Physics, chemistry, biology, and mathematics', bookCount: 31200, icon: '🔬', gradient: 'from-purple-500/20 to-fuchsia-500/20' },
  { id: '7', name: 'Arts & Humanities', slug: 'free-arts-books', description: 'Literature, philosophy, history, and fine arts', bookCount: 26700, icon: '🎨', gradient: 'from-pink-500/20 to-rose-500/20' },
  { id: '8', name: 'Maritime', slug: 'free-maritime-books', description: 'Navigation, marine engineering, and naval architecture', bookCount: 4200, icon: '🚢', gradient: 'from-teal-500/20 to-cyan-500/20' },
  { id: '9', name: 'Education', slug: 'free-education-books', description: 'Teaching methods, curriculum design, and pedagogy', bookCount: 18900, icon: '📚', gradient: 'from-yellow-500/20 to-amber-500/20' },
  { id: '10', name: 'Trades & Crafts', slug: 'free-trades-books', description: 'Woodworking, welding, HVAC, and skilled trades', bookCount: 8400, icon: '🔧', gradient: 'from-stone-500/20 to-zinc-500/20' },
  { id: '11', name: 'Psychology', slug: 'free-psychology-books', description: 'Clinical psychology, behavioral science, and counseling', bookCount: 12300, icon: '🧠', gradient: 'from-violet-500/20 to-purple-500/20' },
  { id: '12', name: 'Economics', slug: 'free-economics-books', description: 'Microeconomics, macroeconomics, and econometrics', bookCount: 9800, icon: '📈', gradient: 'from-green-500/20 to-emerald-500/20' },
  { id: '13', name: 'Architecture', slug: 'free-architecture-books', description: 'Building design, urban planning, and interior design', bookCount: 6700, icon: '🏛️', gradient: 'from-amber-500/20 to-orange-500/20' },
  { id: '14', name: 'Nursing', slug: 'free-nursing-books', description: 'Clinical nursing, pharmacology, and patient care', bookCount: 11200, icon: '💊', gradient: 'from-rose-500/20 to-pink-500/20' },
  { id: '15', name: 'Mathematics', slug: 'free-mathematics-books', description: 'Calculus, algebra, statistics, and discrete math', bookCount: 14500, icon: '🔢', gradient: 'from-cyan-500/20 to-blue-500/20' },
  { id: '16', name: 'Spiritual & Religious', slug: 'free-spiritual-religious-books', description: 'Scripture, theology, world religions, and spiritual growth', bookCount: 21000, icon: '🕊️', gradient: 'from-sky-500/20 to-indigo-500/20' },
  { id: '17', name: 'Inspirational & Motivational', slug: 'free-inspirational-motivational-books', description: 'Personal growth, self-improvement, and motivational classics', bookCount: 9600, icon: '✨', gradient: 'from-amber-500/20 to-yellow-500/20' },
  { id: '18', name: 'Political Magazines', slug: 'free-political-magazines', description: 'Political commentary, current affairs, and news magazines', bookCount: 5200, icon: '🗞️', gradient: 'from-red-500/20 to-slate-500/20' },
];

let _id = 0;
function makeBook(title: string, author: string, catIndex: number, opts: Partial<Book> = {}): Book {
  _id++;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const cat = CATEGORIES[catIndex];
  return {
    id: String(_id),
    title,
    author,
    slug,
    coverUrl: null,
    description: opts.description || `${title} by ${author}. A widely acclaimed resource in ${cat.name.toLowerCase()}. Available for free download in multiple formats from open-access sources.`,
    rating: opts.rating ?? +(3.8 + Math.random() * 1.2).toFixed(1),
    ratingCount: opts.ratingCount ?? Math.floor(500 + Math.random() * 15000),
    contentType: opts.contentType || 'BOOK',
    formats: opts.formats || ['PDF', 'EPUB'],
    viewCount: opts.viewCount ?? Math.floor(5000 + Math.random() * 150000),
    likeCount: opts.likeCount ?? Math.floor(100 + Math.random() * 8000),
    pageCount: opts.pageCount,
    publishYear: opts.publishYear,
    isbn: opts.isbn,
    publisher: opts.publisher,
    language: opts.language || 'en',
    category: { name: cat.name, slug: cat.slug },
    narrator: opts.narrator,
    duration: opts.duration,
  };
}

const BOOKS: Book[] = [
  // ============ TECHNOLOGY (index 0) ============
  makeBook('Clean Code', 'Robert C. Martin', 0, { rating: 4.7, ratingCount: 12400, viewCount: 189000, likeCount: 18200, formats: ['PDF', 'EPUB', 'MOBI'], publishYear: 2008, pageCount: 464, description: 'A handbook of agile software craftsmanship. Robert C. Martin presents a revolutionary paradigm with Clean Code, teaching developers how to write code that is readable, maintainable, and elegant.' }),
  makeBook('The Pragmatic Programmer', 'David Thomas & Andrew Hunt', 0, { rating: 4.8, ratingCount: 9800, viewCount: 167000, likeCount: 14500, formats: ['PDF', 'EPUB'], publishYear: 1999, pageCount: 352, description: 'From journeyman to master. This classic covers topics ranging from personal responsibility and career development to architectural techniques for keeping code flexible and easy to adapt.' }),
  makeBook('Structure and Interpretation of Computer Programs', 'Harold Abelson & Gerald Jay Sussman', 0, { rating: 4.6, ratingCount: 5600, viewCount: 145000, likeCount: 9770, formats: ['PDF', 'HTML'], publishYear: 1996, pageCount: 657 }),
  makeBook('Introduction to Algorithms', 'Thomas H. Cormen', 0, { rating: 4.5, ratingCount: 8900, viewCount: 172000, formats: ['PDF'], publishYear: 2009, pageCount: 1312 }),
  makeBook('Design Patterns', 'Gang of Four', 0, { rating: 4.4, ratingCount: 7200, viewCount: 156000, likeCount: 12700, formats: ['PDF', 'EPUB'], publishYear: 1994, pageCount: 395 }),
  makeBook('You Don\'t Know JS', 'Kyle Simpson', 0, { rating: 4.6, ratingCount: 11000, viewCount: 195000, likeCount: 18000, formats: ['PDF', 'EPUB', 'HTML'], publishYear: 2015 }),
  makeBook('Python Crash Course', 'Eric Matthes', 0, { rating: 4.7, ratingCount: 15000, viewCount: 210000, likeCount: 22000, formats: ['PDF', 'EPUB'], publishYear: 2019, pageCount: 544 }),
  makeBook('Automate the Boring Stuff with Python', 'Al Sweigart', 0, { rating: 4.8, ratingCount: 18000, viewCount: 230000, likeCount: 25000, formats: ['PDF', 'HTML'], publishYear: 2019, pageCount: 504 }),
  makeBook('The C Programming Language', 'Brian Kernighan & Dennis Ritchie', 0, { rating: 4.7, ratingCount: 8100, viewCount: 142000, formats: ['PDF'], publishYear: 1988, pageCount: 272 }),
  makeBook('Eloquent JavaScript', 'Marijn Haverbeke', 0, { rating: 4.5, ratingCount: 7600, viewCount: 178000, formats: ['PDF', 'HTML', 'EPUB'], publishYear: 2018, pageCount: 472 }),
  makeBook('Learn Python the Hard Way', 'Zed A. Shaw', 0, { rating: 4.3, ratingCount: 6200, viewCount: 134000, formats: ['PDF', 'HTML'], publishYear: 2017, pageCount: 320 }),
  makeBook('JavaScript: The Good Parts', 'Douglas Crockford', 0, { rating: 4.3, ratingCount: 5500, viewCount: 112000, formats: ['PDF', 'EPUB'], publishYear: 2008, pageCount: 176 }),
  makeBook('The Art of Computer Programming', 'Donald Knuth', 0, { rating: 4.9, ratingCount: 4200, viewCount: 98000, formats: ['PDF'], publishYear: 1968, pageCount: 3168 }),
  makeBook('Code Complete', 'Steve McConnell', 0, { rating: 4.6, ratingCount: 6800, viewCount: 125000, formats: ['PDF', 'EPUB'], publishYear: 2004, pageCount: 960 }),
  makeBook('Cracking the Coding Interview', 'Gayle Laakmann McDowell', 0, { rating: 4.5, ratingCount: 14000, viewCount: 245000, likeCount: 28000, formats: ['PDF'], publishYear: 2015, pageCount: 687 }),
  makeBook('Head First Design Patterns', 'Eric Freeman & Elisabeth Robson', 0, { rating: 4.5, ratingCount: 5900, viewCount: 108000, formats: ['PDF', 'EPUB'], publishYear: 2004, pageCount: 694 }),
  makeBook('Operating System Concepts', 'Abraham Silberschatz', 0, { rating: 4.3, ratingCount: 4800, viewCount: 95000, formats: ['PDF'], publishYear: 2018, pageCount: 921 }),
  makeBook('Computer Networking: A Top-Down Approach', 'James Kurose & Keith Ross', 0, { rating: 4.4, ratingCount: 5100, viewCount: 102000, formats: ['PDF', 'EPUB'], publishYear: 2016, pageCount: 864 }),
  makeBook('Artificial Intelligence: A Modern Approach', 'Stuart Russell & Peter Norvig', 0, { rating: 4.6, ratingCount: 7200, viewCount: 135000, formats: ['PDF'], publishYear: 2020, pageCount: 1136 }),
  makeBook('Deep Learning', 'Ian Goodfellow', 0, { rating: 4.5, ratingCount: 6400, viewCount: 128000, formats: ['PDF', 'HTML'], publishYear: 2016, pageCount: 800 }),
  makeBook('Hands-On Machine Learning', 'Aurélien Géron', 0, { rating: 4.7, ratingCount: 9800, viewCount: 168000, formats: ['PDF', 'EPUB'], publishYear: 2019, pageCount: 856 }),
  makeBook('The Linux Command Line', 'William Shotts', 0, { rating: 4.5, ratingCount: 4300, viewCount: 89000, formats: ['PDF', 'HTML'], publishYear: 2019, pageCount: 480 }),
  makeBook('Pro Git', 'Scott Chacon & Ben Straub', 0, { rating: 4.4, ratingCount: 6100, viewCount: 142000, formats: ['PDF', 'EPUB', 'HTML'], publishYear: 2014, pageCount: 456 }),
  makeBook('Learning React', 'Alex Banks & Eve Porcello', 0, { rating: 4.3, ratingCount: 3800, viewCount: 87000, formats: ['PDF', 'EPUB'], publishYear: 2020, pageCount: 310 }),
  makeBook('TypeScript Handbook', 'Microsoft', 0, { rating: 4.4, ratingCount: 5200, viewCount: 156000, formats: ['PDF', 'HTML'], publishYear: 2023 }),
  makeBook('Refactoring', 'Martin Fowler', 0, { rating: 4.6, ratingCount: 6700, viewCount: 118000, formats: ['PDF', 'EPUB'], publishYear: 2018, pageCount: 448 }),
  makeBook('The Mythical Man-Month', 'Frederick Brooks', 0, { rating: 4.5, ratingCount: 4900, viewCount: 92000, formats: ['PDF', 'EPUB'], publishYear: 1975, pageCount: 336 }),
  makeBook('Database System Concepts', 'Abraham Silberschatz', 0, { rating: 4.3, ratingCount: 3600, viewCount: 78000, formats: ['PDF'], publishYear: 2019, pageCount: 1376 }),
  makeBook('Grokking Algorithms', 'Aditya Bhargava', 0, { rating: 4.7, ratingCount: 7800, viewCount: 145000, formats: ['PDF', 'EPUB'], publishYear: 2016, pageCount: 256 }),
  makeBook('Computer Architecture', 'John Hennessy & David Patterson', 0, { rating: 4.4, ratingCount: 3100, viewCount: 67000, formats: ['PDF'], publishYear: 2017, pageCount: 936 }),
  makeBook('The Algorithm Design Manual', 'Steven Skiena', 0, { rating: 4.5, ratingCount: 4600, viewCount: 89000, formats: ['PDF', 'EPUB'], publishYear: 2020, pageCount: 810 }),
  makeBook('Practical Vim', 'Drew Neil', 0, { rating: 4.5, ratingCount: 2800, viewCount: 56000, formats: ['PDF', 'EPUB'], publishYear: 2015, pageCount: 354 }),
  makeBook('Docker Deep Dive', 'Nigel Poulton', 0, { rating: 4.4, ratingCount: 3900, viewCount: 72000, formats: ['PDF', 'EPUB'], publishYear: 2020, pageCount: 468 }),
  makeBook('Kubernetes in Action', 'Marko Lukša', 0, { rating: 4.5, ratingCount: 4200, viewCount: 85000, formats: ['PDF', 'EPUB'], publishYear: 2018, pageCount: 624 }),
  makeBook('Rust Programming Language', 'Steve Klabnik & Carol Nichols', 0, { rating: 4.6, ratingCount: 5800, viewCount: 118000, formats: ['PDF', 'HTML'], publishYear: 2019, pageCount: 560 }),
  makeBook('Go Programming Language', 'Alan Donovan & Brian Kernighan', 0, { rating: 4.5, ratingCount: 4700, viewCount: 94000, formats: ['PDF', 'EPUB'], publishYear: 2015, pageCount: 380 }),
  makeBook('Java: The Complete Reference', 'Herbert Schildt', 0, { rating: 4.3, ratingCount: 5400, viewCount: 108000, formats: ['PDF', 'EPUB'], publishYear: 2018, pageCount: 1248 }),
  makeBook('C++ Primer', 'Stanley Lippman', 0, { rating: 4.4, ratingCount: 4100, viewCount: 86000, formats: ['PDF'], publishYear: 2012, pageCount: 976 }),
  makeBook('Flask Web Development', 'Miguel Grinberg', 0, { rating: 4.4, ratingCount: 3200, viewCount: 67000, formats: ['PDF', 'EPUB'], publishYear: 2018, pageCount: 316 }),
  makeBook('Django for Beginners', 'William Vincent', 0, { rating: 4.3, ratingCount: 2900, viewCount: 58000, formats: ['PDF', 'EPUB'], publishYear: 2020, pageCount: 294 }),

  // ============ ENGINEERING (index 1) ============
  makeBook('Engineering Mechanics: Statics', 'J.L. Meriam', 1, { rating: 4.3, ratingCount: 3400, viewCount: 78000, formats: ['PDF'], publishYear: 2016, pageCount: 624 }),
  makeBook('Thermodynamics: An Engineering Approach', 'Yunus Cengel', 1, { rating: 4.4, ratingCount: 4100, viewCount: 95000, publishYear: 2014, pageCount: 1024 }),
  makeBook('Fundamentals of Electric Circuits', 'Charles Alexander', 1, { rating: 4.5, ratingCount: 5200, viewCount: 112000, publishYear: 2017, pageCount: 992 }),
  makeBook('Mechanics of Materials', 'Russell Hibbeler', 1, { rating: 4.3, ratingCount: 3800, viewCount: 81000, publishYear: 2016, pageCount: 896 }),
  makeBook('Fluid Mechanics', 'Frank White', 1, { rating: 4.4, ratingCount: 3600, viewCount: 72000, formats: ['PDF'], publishYear: 2015, pageCount: 864 }),
  makeBook('Signals and Systems', 'Alan Oppenheim', 1, { rating: 4.3, ratingCount: 2900, viewCount: 64000, formats: ['PDF'], publishYear: 1996, pageCount: 960 }),
  makeBook('Control Systems Engineering', 'Norman Nise', 1, { rating: 4.4, ratingCount: 3200, viewCount: 68000, publishYear: 2019, pageCount: 944 }),
  makeBook('Structural Analysis', 'Russell Hibbeler', 1, { rating: 4.3, ratingCount: 2800, viewCount: 58000, formats: ['PDF'], publishYear: 2017, pageCount: 720 }),
  makeBook('Engineering Mathematics', 'K.A. Stroud', 1, { rating: 4.5, ratingCount: 4500, viewCount: 98000, formats: ['PDF', 'EPUB'], publishYear: 2013, pageCount: 1130 }),
  makeBook('Introduction to Robotics', 'John Craig', 1, { rating: 4.3, ratingCount: 2400, viewCount: 52000, formats: ['PDF'], publishYear: 2017, pageCount: 408 }),
  makeBook('Materials Science and Engineering', 'William Callister', 1, { rating: 4.4, ratingCount: 3100, viewCount: 71000, formats: ['PDF'], publishYear: 2018, pageCount: 992 }),
  makeBook('Heat Transfer', 'J.P. Holman', 1, { rating: 4.2, ratingCount: 2600, viewCount: 54000, formats: ['PDF'], publishYear: 2009, pageCount: 752 }),
  makeBook('Machine Design', 'Robert Norton', 1, { rating: 4.3, ratingCount: 2200, viewCount: 48000, formats: ['PDF'], publishYear: 2019, pageCount: 1072 }),
  makeBook('Dynamics of Structures', 'Anil Chopra', 1, { rating: 4.4, ratingCount: 1800, viewCount: 38000, formats: ['PDF'], publishYear: 2017, pageCount: 992 }),
  makeBook('Chemical Engineering Design', 'Gavin Towler', 1, { rating: 4.3, ratingCount: 2100, viewCount: 45000, formats: ['PDF', 'EPUB'], publishYear: 2021, pageCount: 1288 }),
  makeBook('Digital Design', 'M. Morris Mano', 1, { rating: 4.3, ratingCount: 3500, viewCount: 74000, formats: ['PDF'], publishYear: 2017, pageCount: 720 }),
  makeBook('Microelectronic Circuits', 'Adel Sedra & Kenneth Smith', 1, { rating: 4.5, ratingCount: 3800, viewCount: 82000, formats: ['PDF'], publishYear: 2014, pageCount: 1488 }),
  makeBook('Power Systems Analysis', 'John Grainger', 1, { rating: 4.2, ratingCount: 1900, viewCount: 41000, formats: ['PDF'], publishYear: 2003, pageCount: 816 }),
  makeBook('Reinforced Concrete Design', 'James MacGregor', 1, { rating: 4.3, ratingCount: 2000, viewCount: 43000, formats: ['PDF'], publishYear: 2012, pageCount: 768 }),
  makeBook('Engineering Electromagnetics', 'William Hayt', 1, { rating: 4.3, ratingCount: 2700, viewCount: 58000, formats: ['PDF'], publishYear: 2018, pageCount: 608 }),

  // ============ MEDICINE (index 2) ============
  makeBook('Harrison\'s Principles of Internal Medicine', 'J. Larry Jameson', 2, { rating: 4.9, ratingCount: 6700, viewCount: 158000, formats: ['PDF'], publishYear: 2018, pageCount: 4096 }),
  makeBook('Gray\'s Anatomy', 'Susan Standring', 2, { rating: 4.8, ratingCount: 5400, viewCount: 149000, publishYear: 2020, pageCount: 1606 }),
  makeBook('Robbins Pathology', 'Vinay Kumar', 2, { rating: 4.7, ratingCount: 4800, viewCount: 121000, publishYear: 2020, pageCount: 1392 }),
  makeBook('Guyton Medical Physiology', 'John E. Hall', 2, { rating: 4.6, ratingCount: 4200, viewCount: 117000, publishYear: 2020, pageCount: 1152 }),
  makeBook('Netter\'s Atlas of Human Anatomy', 'Frank Netter', 2, { rating: 4.9, ratingCount: 8100, viewCount: 178000, likeCount: 19500, formats: ['PDF'], publishYear: 2018, pageCount: 672, description: 'The gold standard of anatomy atlases. Frank Netter\'s beautifully detailed anatomical illustrations have been used by medical students worldwide for over 25 years.' }),
  makeBook('Katzung Pharmacology', 'Bertram Katzung', 2, { rating: 4.5, ratingCount: 3900, viewCount: 89000, formats: ['PDF'], publishYear: 2020, pageCount: 1264 }),
  makeBook('Lehninger Principles of Biochemistry', 'David Nelson', 2, { rating: 4.6, ratingCount: 4500, viewCount: 98000, formats: ['PDF', 'EPUB'], publishYear: 2017, pageCount: 1328 }),
  makeBook('First Aid for the USMLE Step 1', 'Tao Le & Vikas Bhushan', 2, { rating: 4.7, ratingCount: 12000, viewCount: 210000, likeCount: 24000, formats: ['PDF'], publishYear: 2023, pageCount: 832 }),
  makeBook('Bates\' Guide to Physical Examination', 'Lynn Bickley', 2, { rating: 4.5, ratingCount: 3200, viewCount: 72000, formats: ['PDF', 'EPUB'], publishYear: 2017, pageCount: 1066 }),
  makeBook('Langman\'s Medical Embryology', 'T.W. Sadler', 2, { rating: 4.4, ratingCount: 2800, viewCount: 62000, formats: ['PDF'], publishYear: 2018, pageCount: 424 }),
  makeBook('Junqueira\'s Basic Histology', 'Anthony Mescher', 2, { rating: 4.3, ratingCount: 2400, viewCount: 54000, formats: ['PDF'], publishYear: 2018, pageCount: 576 }),
  makeBook('Clinical Microbiology Made Ridiculously Simple', 'Mark Gladwin', 2, { rating: 4.6, ratingCount: 5100, viewCount: 112000, formats: ['PDF'], publishYear: 2019, pageCount: 416 }),
  makeBook('Williams Obstetrics', 'F. Gary Cunningham', 2, { rating: 4.5, ratingCount: 2600, viewCount: 58000, formats: ['PDF'], publishYear: 2018, pageCount: 1344 }),
  makeBook('Schwartz\'s Principles of Surgery', 'F. Charles Brunicardi', 2, { rating: 4.6, ratingCount: 3100, viewCount: 68000, formats: ['PDF'], publishYear: 2019, pageCount: 2048 }),
  makeBook('Moore\'s Clinically Oriented Anatomy', 'Keith Moore', 2, { rating: 4.7, ratingCount: 4800, viewCount: 105000, formats: ['PDF', 'EPUB'], publishYear: 2017, pageCount: 1168 }),
  makeBook('Oxford Handbook of Clinical Medicine', 'Murray Longmore', 2, { rating: 4.6, ratingCount: 5600, viewCount: 128000, formats: ['PDF', 'EPUB'], publishYear: 2018, pageCount: 928 }),
  makeBook('Pocket Medicine', 'Marc Sabatine', 2, { rating: 4.7, ratingCount: 6200, viewCount: 138000, formats: ['PDF'], publishYear: 2019, pageCount: 320 }),
  makeBook('Davidson\'s Principles and Practice of Medicine', 'Stuart Ralston', 2, { rating: 4.5, ratingCount: 3800, viewCount: 84000, formats: ['PDF', 'EPUB'], publishYear: 2018, pageCount: 1440 }),

  // ============ BUSINESS (index 3) ============
  makeBook('The Lean Startup', 'Eric Ries', 3, { rating: 4.5, ratingCount: 8900, viewCount: 178000, formats: ['PDF', 'EPUB'], publishYear: 2011, pageCount: 336 }),
  makeBook('Zero to One', 'Peter Thiel', 3, { rating: 4.6, ratingCount: 11000, viewCount: 192000, formats: ['PDF', 'EPUB'], publishYear: 2014, pageCount: 224 }),
  makeBook('Good to Great', 'Jim Collins', 3, { rating: 4.4, ratingCount: 7600, viewCount: 165000, formats: ['PDF', 'EPUB'], publishYear: 2001, pageCount: 320 }),
  makeBook('Thinking, Fast and Slow', 'Daniel Kahneman', 3, { rating: 4.7, ratingCount: 13000, viewCount: 205000, formats: ['PDF', 'EPUB', 'MOBI'], publishYear: 2011, pageCount: 512 }),
  makeBook('The 7 Habits of Highly Effective People', 'Stephen Covey', 3, { rating: 4.5, ratingCount: 15000, viewCount: 225000, likeCount: 21000, formats: ['PDF', 'EPUB'], publishYear: 1989, pageCount: 381 }),
  makeBook('Rich Dad Poor Dad', 'Robert Kiyosaki', 3, { rating: 4.4, ratingCount: 18000, viewCount: 280000, likeCount: 32000, formats: ['PDF', 'EPUB'], publishYear: 1997, pageCount: 336 }),
  makeBook('The Intelligent Investor', 'Benjamin Graham', 3, { rating: 4.6, ratingCount: 9200, viewCount: 168000, formats: ['PDF', 'EPUB'], publishYear: 1949, pageCount: 640 }),
  makeBook('How to Win Friends and Influence People', 'Dale Carnegie', 3, { rating: 4.5, ratingCount: 16000, viewCount: 245000, likeCount: 28000, formats: ['PDF', 'EPUB', 'TXT'], publishYear: 1936, pageCount: 288 }),
  makeBook('The E-Myth Revisited', 'Michael Gerber', 3, { rating: 4.3, ratingCount: 5400, viewCount: 98000, formats: ['PDF', 'EPUB'], publishYear: 1995, pageCount: 269 }),
  makeBook('Built to Last', 'Jim Collins', 3, { rating: 4.3, ratingCount: 4100, viewCount: 82000, formats: ['PDF', 'EPUB'], publishYear: 1994, pageCount: 368 }),
  makeBook('The Personal MBA', 'Josh Kaufman', 3, { rating: 4.4, ratingCount: 6800, viewCount: 118000, formats: ['PDF', 'EPUB'], publishYear: 2010, pageCount: 464 }),
  makeBook('Principles', 'Ray Dalio', 3, { rating: 4.5, ratingCount: 8600, viewCount: 148000, formats: ['PDF', 'EPUB'], publishYear: 2017, pageCount: 592 }),
  makeBook('The Hard Thing About Hard Things', 'Ben Horowitz', 3, { rating: 4.4, ratingCount: 5900, viewCount: 108000, formats: ['PDF', 'EPUB'], publishYear: 2014, pageCount: 304 }),
  makeBook('Influence: The Psychology of Persuasion', 'Robert Cialdini', 3, { rating: 4.5, ratingCount: 7800, viewCount: 138000, formats: ['PDF', 'EPUB'], publishYear: 1984, pageCount: 336 }),
  makeBook('Start with Why', 'Simon Sinek', 3, { rating: 4.4, ratingCount: 9100, viewCount: 158000, formats: ['PDF', 'EPUB'], publishYear: 2009, pageCount: 256 }),
  makeBook('The $100 Startup', 'Chris Guillebeau', 3, { rating: 4.2, ratingCount: 4800, viewCount: 86000, formats: ['PDF', 'EPUB'], publishYear: 2012, pageCount: 304 }),
  makeBook('Competing Against Luck', 'Clayton Christensen', 3, { rating: 4.3, ratingCount: 3200, viewCount: 64000, formats: ['PDF', 'EPUB'], publishYear: 2016, pageCount: 288 }),
  makeBook('Blue Ocean Strategy', 'W. Chan Kim', 3, { rating: 4.3, ratingCount: 5600, viewCount: 102000, formats: ['PDF', 'EPUB'], publishYear: 2004, pageCount: 320 }),
  makeBook('The Innovator\'s Dilemma', 'Clayton Christensen', 3, { rating: 4.5, ratingCount: 6400, viewCount: 118000, formats: ['PDF', 'EPUB'], publishYear: 1997, pageCount: 286 }),
  makeBook('Rework', 'Jason Fried & David Heinemeier Hansson', 3, { rating: 4.3, ratingCount: 7200, viewCount: 128000, formats: ['PDF', 'EPUB'], publishYear: 2010, pageCount: 288 }),

  // ============ LAW (index 4) ============
  makeBook('Constitutional Law', 'Erwin Chemerinsky', 4, { rating: 4.3, ratingCount: 2100, viewCount: 48000, publishYear: 2019, pageCount: 1872 }),
  makeBook('Black\'s Law Dictionary', 'Bryan Garner', 4, { rating: 4.5, ratingCount: 3400, viewCount: 79000, publishYear: 2019, pageCount: 2058 }),
  makeBook('Criminal Law', 'Joshua Dressler', 4, { rating: 4.3, ratingCount: 1800, viewCount: 42000, formats: ['PDF'], publishYear: 2018, pageCount: 640 }),
  makeBook('Contracts: Cases and Doctrine', 'Randy Barnett', 4, { rating: 4.2, ratingCount: 1500, viewCount: 35000, formats: ['PDF'], publishYear: 2019, pageCount: 1104 }),
  makeBook('Civil Procedure', 'Richard Freer', 4, { rating: 4.3, ratingCount: 1600, viewCount: 38000, formats: ['PDF', 'EPUB'], publishYear: 2020, pageCount: 832 }),
  makeBook('Property Law', 'Thomas Merrill', 4, { rating: 4.1, ratingCount: 1200, viewCount: 28000, formats: ['PDF'], publishYear: 2017, pageCount: 1248 }),
  makeBook('Evidence: Cases and Materials', 'Ronald Allen', 4, { rating: 4.2, ratingCount: 1400, viewCount: 32000, formats: ['PDF'], publishYear: 2019, pageCount: 1072 }),
  makeBook('International Law', 'Malcolm Shaw', 4, { rating: 4.4, ratingCount: 2200, viewCount: 52000, formats: ['PDF', 'EPUB'], publishYear: 2017, pageCount: 1033 }),
  makeBook('Torts: Cases and Questions', 'Marshall Shapo', 4, { rating: 4.1, ratingCount: 1100, viewCount: 26000, formats: ['PDF'], publishYear: 2018, pageCount: 896 }),
  makeBook('Administrative Law', 'Peter Strauss', 4, { rating: 4.2, ratingCount: 1300, viewCount: 31000, formats: ['PDF'], publishYear: 2019, pageCount: 1280 }),
  makeBook('Legal Writing in Plain English', 'Bryan Garner', 4, { rating: 4.5, ratingCount: 2800, viewCount: 64000, formats: ['PDF', 'EPUB'], publishYear: 2013, pageCount: 248 }),
  makeBook('Getting to Yes', 'Roger Fisher & William Ury', 4, { rating: 4.5, ratingCount: 5200, viewCount: 112000, formats: ['PDF', 'EPUB'], publishYear: 1981, pageCount: 240 }),

  // ============ SCIENCES (index 5) ============
  makeBook('A Brief History of Time', 'Stephen Hawking', 5, { rating: 4.8, ratingCount: 16000, viewCount: 220000, likeCount: 22000, formats: ['PDF', 'EPUB'], publishYear: 1988, pageCount: 256 }),
  makeBook('The Feynman Lectures on Physics', 'Richard Feynman', 5, { rating: 4.9, ratingCount: 9200, viewCount: 185000, formats: ['PDF', 'HTML'], publishYear: 1964, pageCount: 1552 }),
  makeBook('Organic Chemistry', 'Jonathan Clayden', 5, { rating: 4.4, ratingCount: 3800, viewCount: 82000, formats: ['PDF'], publishYear: 2012, pageCount: 1264 }),
  makeBook('Campbell Biology', 'Lisa Urry', 5, { rating: 4.6, ratingCount: 7100, viewCount: 161000, formats: ['PDF'], publishYear: 2020, pageCount: 1488 }),
  makeBook('University Physics', 'Hugh Young & Roger Freedman', 5, { rating: 4.4, ratingCount: 5600, viewCount: 118000, formats: ['PDF'], publishYear: 2019, pageCount: 1600 }),
  makeBook('Molecular Biology of the Cell', 'Bruce Alberts', 5, { rating: 4.7, ratingCount: 4200, viewCount: 92000, formats: ['PDF'], publishYear: 2014, pageCount: 1464 }),
  makeBook('Concepts of Genetics', 'William Klug', 5, { rating: 4.3, ratingCount: 3100, viewCount: 68000, formats: ['PDF'], publishYear: 2018, pageCount: 896 }),
  makeBook('Chemistry: The Central Science', 'Theodore Brown', 5, { rating: 4.4, ratingCount: 4800, viewCount: 105000, formats: ['PDF'], publishYear: 2017, pageCount: 1248 }),
  makeBook('Cosmos', 'Carl Sagan', 5, { rating: 4.8, ratingCount: 11000, viewCount: 185000, likeCount: 18000, formats: ['PDF', 'EPUB'], publishYear: 1980, pageCount: 396 }),
  makeBook('The Selfish Gene', 'Richard Dawkins', 5, { rating: 4.5, ratingCount: 8200, viewCount: 145000, formats: ['PDF', 'EPUB'], publishYear: 1976, pageCount: 360 }),
  makeBook('A Short History of Nearly Everything', 'Bill Bryson', 5, { rating: 4.7, ratingCount: 12000, viewCount: 198000, likeCount: 21000, formats: ['PDF', 'EPUB'], publishYear: 2003, pageCount: 544 }),
  makeBook('The Origin of Species', 'Charles Darwin', 5, { rating: 4.5, ratingCount: 4500, viewCount: 98000, formats: ['PDF', 'EPUB', 'TXT', 'HTML'], publishYear: 1859, pageCount: 502 }),
  makeBook('Principles of Physics', 'David Halliday', 5, { rating: 4.4, ratingCount: 3900, viewCount: 82000, formats: ['PDF'], publishYear: 2013, pageCount: 1136 }),
  makeBook('Astrophysics for People in a Hurry', 'Neil deGrasse Tyson', 5, { rating: 4.4, ratingCount: 9800, viewCount: 172000, formats: ['PDF', 'EPUB'], publishYear: 2017, pageCount: 222 }),
  makeBook('The Gene: An Intimate History', 'Siddhartha Mukherjee', 5, { rating: 4.6, ratingCount: 5100, viewCount: 98000, formats: ['PDF', 'EPUB'], publishYear: 2016, pageCount: 608 }),
  makeBook('Silent Spring', 'Rachel Carson', 5, { rating: 4.4, ratingCount: 3800, viewCount: 78000, formats: ['PDF', 'EPUB', 'TXT'], publishYear: 1962, pageCount: 400 }),
  makeBook('The Elegant Universe', 'Brian Greene', 5, { rating: 4.5, ratingCount: 5400, viewCount: 102000, formats: ['PDF', 'EPUB'], publishYear: 1999, pageCount: 448 }),
  makeBook('What Is Life?', 'Erwin Schrödinger', 5, { rating: 4.4, ratingCount: 2800, viewCount: 62000, formats: ['PDF', 'TXT'], publishYear: 1944, pageCount: 194 }),

  // ============ ARTS & HUMANITIES (index 6) ============
  makeBook('Sapiens: A Brief History of Humankind', 'Yuval Noah Harari', 6, { rating: 4.7, ratingCount: 19000, viewCount: 240000, likeCount: 28000, formats: ['PDF', 'EPUB'], publishYear: 2015, pageCount: 464 }),
  makeBook('The Republic', 'Plato', 6, { rating: 4.5, ratingCount: 4500, viewCount: 98000, formats: ['PDF', 'HTML', 'TXT'], publishYear: -380, pageCount: 420 }),
  makeBook('The Art of War', 'Sun Tzu', 6, { rating: 4.6, ratingCount: 12000, viewCount: 198000, formats: ['PDF', 'EPUB', 'TXT'], publishYear: -500, pageCount: 68 }),
  makeBook('Meditations', 'Marcus Aurelius', 6, { rating: 4.8, ratingCount: 14000, viewCount: 215000, likeCount: 21000, formats: ['PDF', 'EPUB', 'TXT'], publishYear: 180, pageCount: 256 }),
  makeBook('Pride and Prejudice', 'Jane Austen', 6, { rating: 4.6, ratingCount: 15000, viewCount: 225000, formats: ['PDF', 'EPUB', 'TXT', 'HTML'], publishYear: 1813, pageCount: 432, contentType: 'NOVEL' }),
  makeBook('Crime and Punishment', 'Fyodor Dostoevsky', 6, { rating: 4.5, ratingCount: 8200, viewCount: 142000, formats: ['PDF', 'EPUB', 'TXT'], publishYear: 1866, pageCount: 671, contentType: 'NOVEL' }),
  makeBook('The Great Gatsby', 'F. Scott Fitzgerald', 6, { rating: 4.3, ratingCount: 12000, viewCount: 195000, formats: ['PDF', 'EPUB', 'TXT'], publishYear: 1925, pageCount: 180, contentType: 'NOVEL' }),
  makeBook('To Kill a Mockingbird', 'Harper Lee', 6, { rating: 4.7, ratingCount: 18000, viewCount: 278000, likeCount: 31000, formats: ['PDF', 'EPUB'], publishYear: 1960, pageCount: 336, contentType: 'NOVEL' }),
  makeBook('War and Peace', 'Leo Tolstoy', 6, { rating: 4.5, ratingCount: 6800, viewCount: 118000, formats: ['PDF', 'EPUB', 'TXT', 'HTML'], publishYear: 1869, pageCount: 1225, contentType: 'NOVEL' }),
  makeBook('Moby Dick', 'Herman Melville', 6, { rating: 4.2, ratingCount: 5400, viewCount: 92000, formats: ['PDF', 'EPUB', 'TXT'], publishYear: 1851, pageCount: 720, contentType: 'NOVEL' }),
  makeBook('The Odyssey', 'Homer', 6, { rating: 4.4, ratingCount: 6200, viewCount: 108000, formats: ['PDF', 'EPUB', 'TXT', 'HTML'], publishYear: -800, pageCount: 541 }),
  makeBook('Hamlet', 'William Shakespeare', 6, { rating: 4.5, ratingCount: 8900, viewCount: 145000, formats: ['PDF', 'TXT', 'HTML'], publishYear: 1603, pageCount: 289 }),
  makeBook('The Divine Comedy', 'Dante Alighieri', 6, { rating: 4.5, ratingCount: 5100, viewCount: 88000, formats: ['PDF', 'EPUB', 'TXT'], publishYear: 1320, pageCount: 798 }),
  makeBook('Don Quixote', 'Miguel de Cervantes', 6, { rating: 4.3, ratingCount: 4800, viewCount: 82000, formats: ['PDF', 'EPUB', 'TXT'], publishYear: 1605, pageCount: 1072, contentType: 'NOVEL' }),
  makeBook('Frankenstein', 'Mary Shelley', 6, { rating: 4.3, ratingCount: 7800, viewCount: 132000, formats: ['PDF', 'EPUB', 'TXT', 'HTML'], publishYear: 1818, pageCount: 280, contentType: 'NOVEL' }),
  makeBook('Jane Eyre', 'Charlotte Brontë', 6, { rating: 4.4, ratingCount: 8100, viewCount: 138000, formats: ['PDF', 'EPUB', 'TXT'], publishYear: 1847, pageCount: 507, contentType: 'NOVEL' }),
  makeBook('Wuthering Heights', 'Emily Brontë', 6, { rating: 4.2, ratingCount: 6500, viewCount: 108000, formats: ['PDF', 'EPUB', 'TXT'], publishYear: 1847, pageCount: 416, contentType: 'NOVEL' }),
  makeBook('The Count of Monte Cristo', 'Alexandre Dumas', 6, { rating: 4.7, ratingCount: 9200, viewCount: 158000, formats: ['PDF', 'EPUB', 'TXT'], publishYear: 1844, pageCount: 1276, contentType: 'NOVEL' }),
  makeBook('Les Misérables', 'Victor Hugo', 6, { rating: 4.5, ratingCount: 7200, viewCount: 128000, formats: ['PDF', 'EPUB', 'TXT'], publishYear: 1862, pageCount: 1463, contentType: 'NOVEL' }),
  makeBook('Anna Karenina', 'Leo Tolstoy', 6, { rating: 4.4, ratingCount: 5800, viewCount: 98000, formats: ['PDF', 'EPUB', 'TXT'], publishYear: 1877, pageCount: 864, contentType: 'NOVEL' }),
  makeBook('The Brothers Karamazov', 'Fyodor Dostoevsky', 6, { rating: 4.6, ratingCount: 5400, viewCount: 92000, formats: ['PDF', 'EPUB', 'TXT'], publishYear: 1880, pageCount: 796, contentType: 'NOVEL' }),
  makeBook('A Tale of Two Cities', 'Charles Dickens', 6, { rating: 4.3, ratingCount: 6100, viewCount: 105000, formats: ['PDF', 'EPUB', 'TXT', 'HTML'], publishYear: 1859, pageCount: 489, contentType: 'NOVEL' }),
  makeBook('Brave New World', 'Aldous Huxley', 6, { rating: 4.4, ratingCount: 9800, viewCount: 168000, formats: ['PDF', 'EPUB'], publishYear: 1932, pageCount: 311, contentType: 'NOVEL' }),
  makeBook('The Picture of Dorian Gray', 'Oscar Wilde', 6, { rating: 4.3, ratingCount: 7400, viewCount: 128000, formats: ['PDF', 'EPUB', 'TXT'], publishYear: 1890, pageCount: 254, contentType: 'NOVEL' }),
  makeBook('Nicomachean Ethics', 'Aristotle', 6, { rating: 4.3, ratingCount: 3200, viewCount: 68000, formats: ['PDF', 'TXT', 'HTML'], publishYear: -340, pageCount: 329 }),

  // ============ MARITIME (index 7) ============
  makeBook('The American Practical Navigator', 'Nathaniel Bowditch', 7, { rating: 4.6, ratingCount: 1800, viewCount: 38000, formats: ['PDF'], publishYear: 2019, pageCount: 1272 }),
  makeBook('Marine Engineering', 'Harrington Emerson', 7, { rating: 4.2, ratingCount: 890, viewCount: 18000, formats: ['PDF'], publishYear: 2015, pageCount: 648 }),
  makeBook('Naval Architecture for Marine Engineers', 'W. Muckle', 7, { rating: 4.3, ratingCount: 720, viewCount: 15000, formats: ['PDF'], publishYear: 2012, pageCount: 412 }),
  makeBook('Marine Diesel Engines', 'Deven Aranha', 7, { rating: 4.1, ratingCount: 560, viewCount: 12000, formats: ['PDF'], publishYear: 2018, pageCount: 286 }),
  makeBook('Ship Stability', 'Bryan Barrass', 7, { rating: 4.3, ratingCount: 680, viewCount: 14000, formats: ['PDF', 'EPUB'], publishYear: 2006, pageCount: 368 }),
  makeBook('Seamanship Techniques', 'David House', 7, { rating: 4.4, ratingCount: 950, viewCount: 21000, formats: ['PDF'], publishYear: 2014, pageCount: 624 }),

  // ============ EDUCATION (index 8) ============
  makeBook('The Art of Teaching', 'Jay Parini', 8, { rating: 4.3, ratingCount: 2100, viewCount: 42000, formats: ['PDF', 'EPUB'], publishYear: 2005, pageCount: 176 }),
  makeBook('Teaching to Transgress', 'bell hooks', 8, { rating: 4.5, ratingCount: 3200, viewCount: 68000, formats: ['PDF', 'EPUB'], publishYear: 1994, pageCount: 216 }),
  makeBook('Pedagogy of the Oppressed', 'Paulo Freire', 8, { rating: 4.5, ratingCount: 4800, viewCount: 92000, formats: ['PDF', 'EPUB', 'TXT'], publishYear: 1968, pageCount: 192 }),
  makeBook('How Children Learn', 'John Holt', 8, { rating: 4.4, ratingCount: 2600, viewCount: 52000, formats: ['PDF', 'EPUB'], publishYear: 1967, pageCount: 303 }),
  makeBook('Mindstorms', 'Seymour Papert', 8, { rating: 4.4, ratingCount: 1800, viewCount: 38000, formats: ['PDF'], publishYear: 1980, pageCount: 272 }),
  makeBook('Visible Learning', 'John Hattie', 8, { rating: 4.5, ratingCount: 3400, viewCount: 72000, formats: ['PDF', 'EPUB'], publishYear: 2008, pageCount: 392 }),
  makeBook('Understanding by Design', 'Grant Wiggins & Jay McTighe', 8, { rating: 4.4, ratingCount: 2800, viewCount: 58000, formats: ['PDF'], publishYear: 2005, pageCount: 370 }),
  makeBook('The First Days of School', 'Harry Wong', 8, { rating: 4.3, ratingCount: 3100, viewCount: 62000, formats: ['PDF', 'EPUB'], publishYear: 2009, pageCount: 352 }),

  // ============ TRADES & CRAFTS (index 9) ============
  makeBook('The Complete Woodworker', 'Chris Schwarz', 9, { rating: 4.5, ratingCount: 1800, viewCount: 35000, formats: ['PDF', 'EPUB'], publishYear: 2013, pageCount: 392 }),
  makeBook('Welding: Principles and Applications', 'Larry Jeffus', 9, { rating: 4.3, ratingCount: 1200, viewCount: 24000, formats: ['PDF'], publishYear: 2020, pageCount: 960 }),
  makeBook('Modern Refrigeration and Air Conditioning', 'Andrew Althouse', 9, { rating: 4.4, ratingCount: 1500, viewCount: 32000, formats: ['PDF'], publishYear: 2017, pageCount: 1760 }),
  makeBook('Residential Wiring', 'Ray Mullin', 9, { rating: 4.3, ratingCount: 1100, viewCount: 22000, formats: ['PDF'], publishYear: 2018, pageCount: 672 }),
  makeBook('Plumbing Design and Installation', 'L.V. Ripka', 9, { rating: 4.2, ratingCount: 890, viewCount: 18000, formats: ['PDF'], publishYear: 2016, pageCount: 528 }),
  makeBook('Auto Repair for Dummies', 'Deanna Sclar', 9, { rating: 4.3, ratingCount: 3200, viewCount: 68000, formats: ['PDF', 'EPUB'], publishYear: 2019, pageCount: 480 }),

  // ============ PSYCHOLOGY (index 10) ============
  makeBook('Psychology', 'David Myers', 10, { rating: 4.5, ratingCount: 5600, viewCount: 118000, formats: ['PDF'], publishYear: 2018, pageCount: 864 }),
  makeBook('Man\'s Search for Meaning', 'Viktor Frankl', 10, { rating: 4.7, ratingCount: 14000, viewCount: 225000, likeCount: 24000, formats: ['PDF', 'EPUB'], publishYear: 1946, pageCount: 184 }),
  makeBook('The Interpretation of Dreams', 'Sigmund Freud', 10, { rating: 4.2, ratingCount: 4200, viewCount: 82000, formats: ['PDF', 'EPUB', 'TXT'], publishYear: 1899, pageCount: 630 }),
  makeBook('Cognitive Behavioral Therapy', 'Judith Beck', 10, { rating: 4.5, ratingCount: 3800, viewCount: 78000, formats: ['PDF', 'EPUB'], publishYear: 2020, pageCount: 432 }),
  makeBook('The Body Keeps the Score', 'Bessel van der Kolk', 10, { rating: 4.7, ratingCount: 11000, viewCount: 192000, likeCount: 19000, formats: ['PDF', 'EPUB'], publishYear: 2014, pageCount: 464 }),
  makeBook('Quiet: The Power of Introverts', 'Susan Cain', 10, { rating: 4.4, ratingCount: 8200, viewCount: 145000, formats: ['PDF', 'EPUB'], publishYear: 2012, pageCount: 368 }),
  makeBook('Emotional Intelligence', 'Daniel Goleman', 10, { rating: 4.4, ratingCount: 7600, viewCount: 135000, formats: ['PDF', 'EPUB'], publishYear: 1995, pageCount: 384 }),
  makeBook('Flow: The Psychology of Optimal Experience', 'Mihaly Csikszentmihalyi', 10, { rating: 4.4, ratingCount: 5800, viewCount: 102000, formats: ['PDF', 'EPUB'], publishYear: 1990, pageCount: 336 }),
  makeBook('Stumbling on Happiness', 'Daniel Gilbert', 10, { rating: 4.2, ratingCount: 4100, viewCount: 78000, formats: ['PDF', 'EPUB'], publishYear: 2006, pageCount: 336 }),
  makeBook('Predictably Irrational', 'Dan Ariely', 10, { rating: 4.4, ratingCount: 5400, viewCount: 95000, formats: ['PDF', 'EPUB'], publishYear: 2008, pageCount: 384 }),
  makeBook('Attached', 'Amir Levine & Rachel Heller', 10, { rating: 4.3, ratingCount: 6200, viewCount: 108000, formats: ['PDF', 'EPUB'], publishYear: 2010, pageCount: 304 }),
  makeBook('Mindset: The New Psychology of Success', 'Carol Dweck', 10, { rating: 4.5, ratingCount: 9800, viewCount: 168000, formats: ['PDF', 'EPUB'], publishYear: 2006, pageCount: 320 }),

  // ============ ECONOMICS (index 11) ============
  makeBook('Principles of Economics', 'N. Gregory Mankiw', 11, { rating: 4.4, ratingCount: 5200, viewCount: 112000, formats: ['PDF'], publishYear: 2020, pageCount: 848 }),
  makeBook('Capital in the Twenty-First Century', 'Thomas Piketty', 11, { rating: 4.3, ratingCount: 4800, viewCount: 98000, formats: ['PDF', 'EPUB'], publishYear: 2013, pageCount: 816 }),
  makeBook('Freakonomics', 'Steven Levitt & Stephen Dubner', 11, { rating: 4.3, ratingCount: 8200, viewCount: 148000, formats: ['PDF', 'EPUB'], publishYear: 2005, pageCount: 336 }),
  makeBook('The Wealth of Nations', 'Adam Smith', 11, { rating: 4.4, ratingCount: 4100, viewCount: 92000, formats: ['PDF', 'EPUB', 'TXT', 'HTML'], publishYear: 1776, pageCount: 1264 }),
  makeBook('Nudge', 'Richard Thaler & Cass Sunstein', 11, { rating: 4.3, ratingCount: 5600, viewCount: 102000, formats: ['PDF', 'EPUB'], publishYear: 2008, pageCount: 312 }),
  makeBook('Economics in One Lesson', 'Henry Hazlitt', 11, { rating: 4.4, ratingCount: 3800, viewCount: 78000, formats: ['PDF', 'EPUB', 'TXT'], publishYear: 1946, pageCount: 218 }),
  makeBook('The General Theory of Employment, Interest and Money', 'John Maynard Keynes', 11, { rating: 4.3, ratingCount: 2800, viewCount: 62000, formats: ['PDF', 'TXT', 'HTML'], publishYear: 1936, pageCount: 472 }),
  makeBook('Thinking Strategically', 'Avinash Dixit & Barry Nalebuff', 11, { rating: 4.3, ratingCount: 2200, viewCount: 45000, formats: ['PDF', 'EPUB'], publishYear: 1991, pageCount: 416 }),
  makeBook('Poor Economics', 'Abhijit Banerjee & Esther Duflo', 11, { rating: 4.4, ratingCount: 4100, viewCount: 82000, formats: ['PDF', 'EPUB'], publishYear: 2011, pageCount: 320 }),
  makeBook('Misbehaving', 'Richard Thaler', 11, { rating: 4.3, ratingCount: 3400, viewCount: 68000, formats: ['PDF', 'EPUB'], publishYear: 2015, pageCount: 432 }),

  // ============ ARCHITECTURE (index 12) ============
  makeBook('A Pattern Language', 'Christopher Alexander', 12, { rating: 4.5, ratingCount: 3200, viewCount: 68000, formats: ['PDF', 'EPUB'], publishYear: 1977, pageCount: 1171 }),
  makeBook('Architecture: Form, Space, and Order', 'Francis Ching', 12, { rating: 4.6, ratingCount: 4100, viewCount: 88000, formats: ['PDF'], publishYear: 2014, pageCount: 464 }),
  makeBook('Towards a New Architecture', 'Le Corbusier', 12, { rating: 4.3, ratingCount: 2200, viewCount: 48000, formats: ['PDF', 'EPUB'], publishYear: 1923, pageCount: 289 }),
  makeBook('The Architecture of Happiness', 'Alain de Botton', 12, { rating: 4.2, ratingCount: 3800, viewCount: 72000, formats: ['PDF', 'EPUB'], publishYear: 2006, pageCount: 280 }),
  makeBook('Graphic Design Manual', 'Armin Hofmann', 12, { rating: 4.3, ratingCount: 1400, viewCount: 32000, formats: ['PDF'], publishYear: 1965, pageCount: 174 }),
  makeBook('The Death and Life of Great American Cities', 'Jane Jacobs', 12, { rating: 4.5, ratingCount: 4500, viewCount: 92000, formats: ['PDF', 'EPUB'], publishYear: 1961, pageCount: 458 }),
  makeBook('Complexity and Contradiction in Architecture', 'Robert Venturi', 12, { rating: 4.2, ratingCount: 1800, viewCount: 38000, formats: ['PDF'], publishYear: 1966, pageCount: 136 }),

  // ============ NURSING (index 13) ============
  makeBook('Brunner & Suddarth\'s Textbook of Medical-Surgical Nursing', 'Janice Hinkle', 13, { rating: 4.5, ratingCount: 3800, viewCount: 82000, formats: ['PDF'], publishYear: 2017, pageCount: 2272 }),
  makeBook('Fundamentals of Nursing', 'Patricia Potter', 13, { rating: 4.4, ratingCount: 4200, viewCount: 92000, formats: ['PDF', 'EPUB'], publishYear: 2020, pageCount: 1392 }),
  makeBook('Pharmacology for Nurses', 'Michael Adams', 13, { rating: 4.3, ratingCount: 2800, viewCount: 62000, formats: ['PDF'], publishYear: 2019, pageCount: 880 }),
  makeBook('Maternal & Child Nursing Care', 'Marcia London', 13, { rating: 4.3, ratingCount: 2100, viewCount: 48000, formats: ['PDF'], publishYear: 2016, pageCount: 1728 }),
  makeBook('Pediatric Nursing', 'Kathryn Rudd', 13, { rating: 4.3, ratingCount: 1900, viewCount: 42000, formats: ['PDF', 'EPUB'], publishYear: 2018, pageCount: 1152 }),
  makeBook('Psychiatric-Mental Health Nursing', 'Mary Townsend', 13, { rating: 4.4, ratingCount: 2400, viewCount: 52000, formats: ['PDF'], publishYear: 2018, pageCount: 896 }),
  makeBook('NCLEX-RN Review', 'Linda Silvestri', 13, { rating: 4.6, ratingCount: 5800, viewCount: 125000, likeCount: 14000, formats: ['PDF', 'EPUB'], publishYear: 2022, pageCount: 976 }),
  makeBook('Critical Care Nursing', 'Linda Urden', 13, { rating: 4.4, ratingCount: 2200, viewCount: 48000, formats: ['PDF'], publishYear: 2017, pageCount: 1168 }),

  // ============ MATHEMATICS (index 14) ============
  makeBook('Calculus', 'James Stewart', 14, { rating: 4.5, ratingCount: 6800, viewCount: 145000, formats: ['PDF'], publishYear: 2015, pageCount: 1368 }),
  makeBook('Linear Algebra Done Right', 'Sheldon Axler', 14, { rating: 4.6, ratingCount: 4200, viewCount: 92000, formats: ['PDF', 'EPUB'], publishYear: 2014, pageCount: 340 }),
  makeBook('Introduction to Probability', 'Joseph Blitzstein & Jessica Hwang', 14, { rating: 4.5, ratingCount: 3100, viewCount: 68000, formats: ['PDF'], publishYear: 2019, pageCount: 596 }),
  makeBook('Discrete Mathematics and Its Applications', 'Kenneth Rosen', 14, { rating: 4.3, ratingCount: 4500, viewCount: 98000, formats: ['PDF'], publishYear: 2018, pageCount: 1104 }),
  makeBook('Abstract Algebra', 'David Dummit & Richard Foote', 14, { rating: 4.4, ratingCount: 2800, viewCount: 58000, formats: ['PDF'], publishYear: 2003, pageCount: 944 }),
  makeBook('Probability and Statistics', 'Morris DeGroot', 14, { rating: 4.3, ratingCount: 3200, viewCount: 72000, formats: ['PDF'], publishYear: 2012, pageCount: 816 }),
  makeBook('Real Analysis', 'Walter Rudin', 14, { rating: 4.5, ratingCount: 3600, viewCount: 78000, formats: ['PDF'], publishYear: 1976, pageCount: 342 }),
  makeBook('How to Solve It', 'George Pólya', 14, { rating: 4.6, ratingCount: 5400, viewCount: 112000, formats: ['PDF', 'EPUB'], publishYear: 1945, pageCount: 253 }),
  makeBook('The Princeton Companion to Mathematics', 'Timothy Gowers', 14, { rating: 4.7, ratingCount: 2800, viewCount: 58000, formats: ['PDF'], publishYear: 2008, pageCount: 1034 }),
  makeBook('What Is Mathematics?', 'Richard Courant & Herbert Robbins', 14, { rating: 4.5, ratingCount: 3100, viewCount: 65000, formats: ['PDF', 'EPUB'], publishYear: 1941, pageCount: 566 }),

  // ============ AUDIOBOOKS ============
  makeBook('Atomic Habits', 'James Clear', 3, { rating: 4.9, ratingCount: 22000, viewCount: 380000, likeCount: 41000, contentType: 'AUDIOBOOK', formats: ['MP3'], narrator: 'James Clear', duration: 19200, publishYear: 2018, description: 'Tiny changes, remarkable results. James Clear reveals how small habits compound into life-changing outcomes. The #1 most-downloaded free audiobook on ANYFREEBOOK.' }),
  makeBook('Deep Work', 'Cal Newport', 3, { rating: 4.6, ratingCount: 8400, viewCount: 171000, contentType: 'AUDIOBOOK', formats: ['MP3'], narrator: 'Jeff Bottoms', duration: 28800, publishYear: 2016 }),
  makeBook('The 48 Laws of Power', 'Robert Greene', 3, { rating: 4.5, ratingCount: 11000, viewCount: 195000, contentType: 'AUDIOBOOK', formats: ['MP3'], narrator: 'Richard Poe', duration: 86400, publishYear: 1998 }),
  makeBook('Dune', 'Frank Herbert', 6, { rating: 4.8, ratingCount: 15000, viewCount: 225000, likeCount: 19550, contentType: 'AUDIOBOOK', formats: ['MP3'], narrator: 'Scott Brick', duration: 79200, publishYear: 1965 }),
  makeBook('1984', 'George Orwell', 6, { rating: 4.7, ratingCount: 18000, viewCount: 245000, likeCount: 22100, contentType: 'AUDIOBOOK', formats: ['MP3'], narrator: 'Stephen Fry', duration: 41400, publishYear: 1949 }),
  makeBook('The Hitchhiker\'s Guide to the Galaxy', 'Douglas Adams', 6, { rating: 4.8, ratingCount: 13000, viewCount: 208000, contentType: 'AUDIOBOOK', formats: ['MP3'], narrator: 'Stephen Fry', duration: 21600, publishYear: 1979 }),
  makeBook('Becoming', 'Michelle Obama', 3, { rating: 4.7, ratingCount: 16000, viewCount: 265000, likeCount: 28000, contentType: 'AUDIOBOOK', formats: ['MP3'], narrator: 'Michelle Obama', duration: 68400, publishYear: 2018 }),
  makeBook('Educated', 'Tara Westover', 6, { rating: 4.7, ratingCount: 14000, viewCount: 235000, likeCount: 24000, contentType: 'AUDIOBOOK', formats: ['MP3'], narrator: 'Julia Whelan', duration: 43200, publishYear: 2018 }),
  makeBook('The Alchemist', 'Paulo Coelho', 6, { rating: 4.5, ratingCount: 19000, viewCount: 298000, likeCount: 32000, contentType: 'AUDIOBOOK', formats: ['MP3'], narrator: 'Jeremy Irons', duration: 14400, publishYear: 1988, description: 'Paulo Coelho\'s masterpiece tells the mystical story of Santiago, an Andalusian shepherd boy who yearns to travel in search of a worldly treasure.' }),
  makeBook('Can\'t Hurt Me', 'David Goggins', 3, { rating: 4.8, ratingCount: 12000, viewCount: 218000, likeCount: 22000, contentType: 'AUDIOBOOK', formats: ['MP3'], narrator: 'David Goggins & Adam Skolnick', duration: 46800, publishYear: 2018 }),
  makeBook('Sapiens', 'Yuval Noah Harari', 6, { rating: 4.7, ratingCount: 15000, viewCount: 258000, likeCount: 26000, contentType: 'AUDIOBOOK', formats: ['MP3'], narrator: 'Derek Perkins', duration: 54000, publishYear: 2015 }),
  makeBook('Think and Grow Rich', 'Napoleon Hill', 3, { rating: 4.4, ratingCount: 11000, viewCount: 192000, contentType: 'AUDIOBOOK', formats: ['MP3'], narrator: 'Erik Synnestvedt', duration: 32400, publishYear: 1937 }),
  makeBook('The Power of Now', 'Eckhart Tolle', 10, { rating: 4.5, ratingCount: 9800, viewCount: 178000, contentType: 'AUDIOBOOK', formats: ['MP3'], narrator: 'Eckhart Tolle', duration: 25200, publishYear: 1997 }),
  makeBook('Shoe Dog', 'Phil Knight', 3, { rating: 4.7, ratingCount: 8400, viewCount: 152000, contentType: 'AUDIOBOOK', formats: ['MP3'], narrator: 'Norbert Leo Butz', duration: 46800, publishYear: 2016 }),
  makeBook('The Subtle Art of Not Giving a F*ck', 'Mark Manson', 10, { rating: 4.3, ratingCount: 14000, viewCount: 248000, likeCount: 25000, contentType: 'AUDIOBOOK', formats: ['MP3'], narrator: 'Roger Wayne', duration: 18000, publishYear: 2016 }),
  makeBook('Born a Crime', 'Trevor Noah', 6, { rating: 4.8, ratingCount: 11000, viewCount: 195000, contentType: 'AUDIOBOOK', formats: ['MP3'], narrator: 'Trevor Noah', duration: 32400, publishYear: 2016 }),
  makeBook('12 Rules for Life', 'Jordan Peterson', 10, { rating: 4.4, ratingCount: 9200, viewCount: 168000, contentType: 'AUDIOBOOK', formats: ['MP3'], narrator: 'Jordan Peterson', duration: 54000, publishYear: 2018 }),
  makeBook('Outliers', 'Malcolm Gladwell', 3, { rating: 4.4, ratingCount: 10000, viewCount: 182000, contentType: 'AUDIOBOOK', formats: ['MP3'], narrator: 'Malcolm Gladwell', duration: 25200, publishYear: 2008 }),
  makeBook('The Midnight Library', 'Matt Haig', 6, { rating: 4.3, ratingCount: 9800, viewCount: 172000, contentType: 'AUDIOBOOK', formats: ['MP3'], narrator: 'Carey Mulligan', duration: 25200, publishYear: 2020 }),
  makeBook('Project Hail Mary', 'Andy Weir', 5, { rating: 4.8, ratingCount: 12000, viewCount: 215000, likeCount: 22000, contentType: 'AUDIOBOOK', formats: ['MP3'], narrator: 'Ray Porter', duration: 57600, publishYear: 2021 }),
];

const COLLECTIONS: Collection[] = [
  { id: '1', title: 'Must-Read Programming Classics', description: 'The books every developer should read at least once', slug: 'must-read-programming-classics', bookCount: 25, coverBooks: BOOKS.filter(b => b.category.slug === 'free-technology-books' && b.contentType === 'BOOK').slice(0, 4) },
  { id: '2', title: 'Medical School Essentials', description: 'Core textbooks for first and second year medical students', slug: 'medical-school-essentials', bookCount: 30, coverBooks: BOOKS.filter(b => b.category.slug === 'free-medicine-books').slice(0, 4) },
  { id: '3', title: 'Startup Founder\'s Library', description: 'Every book a first-time founder needs', slug: 'startup-founders-library', bookCount: 20, coverBooks: BOOKS.filter(b => b.category.slug === 'free-business-books' && b.contentType === 'BOOK').slice(0, 4) },
  { id: '4', title: 'Philosophy for Beginners', description: 'Start your philosophy journey with these accessible classics', slug: 'philosophy-for-beginners', bookCount: 15, coverBooks: BOOKS.filter(b => b.category.slug === 'free-arts-books' && b.contentType === 'BOOK').slice(0, 4) },
  { id: '5', title: 'Free Audiobooks: Bestsellers', description: 'The most popular free audiobooks in our collection', slug: 'free-audiobooks-bestsellers', bookCount: 45, coverBooks: BOOKS.filter(b => b.contentType === 'AUDIOBOOK').slice(0, 4) },
  { id: '6', title: 'Science That Changed the World', description: 'Groundbreaking science books that shaped our understanding', slug: 'science-that-changed-the-world', bookCount: 18, coverBooks: BOOKS.filter(b => b.category.slug === 'free-science-books' && b.contentType === 'BOOK').slice(0, 4) },
  { id: '7', title: 'Classic Novels (Public Domain)', description: 'The greatest novels ever written — all free and legal', slug: 'classic-novels-public-domain', bookCount: 50, coverBooks: BOOKS.filter(b => b.contentType === 'NOVEL').slice(0, 4) },
  { id: '8', title: 'Engineering Fundamentals', description: 'Core engineering textbooks across all disciplines', slug: 'engineering-fundamentals', bookCount: 35, coverBooks: BOOKS.filter(b => b.category.slug === 'free-engineering-books').slice(0, 4) },
];

export function getAllCategories(): Category[] {
  return CATEGORIES;
}

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find(c => c.slug === slug);
}

export function getTrendingBooks(): Book[] {
  return [...BOOKS].sort((a, b) => b.viewCount - a.viewCount).slice(0, 20);
}

export function getNewBooks(): Book[] {
  const shuffled = [...BOOKS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, 20);
}

export function getAudiobooks(): Book[] {
  return BOOKS.filter(b => b.contentType === 'AUDIOBOOK');
}

export function getCollections(): Collection[] {
  return COLLECTIONS;
}

export function getCollectionBySlug(slug: string): Collection | undefined {
  return COLLECTIONS.find(c => c.slug === slug);
}

const COLLECTION_FILTERS: Record<string, (b: Book) => boolean> = {
  'must-read-programming-classics': b => b.category.slug === 'free-technology-books' && b.contentType === 'BOOK',
  'medical-school-essentials': b => b.category.slug === 'free-medicine-books',
  'startup-founders-library': b => b.category.slug === 'free-business-books' && b.contentType === 'BOOK',
  'philosophy-for-beginners': b => b.category.slug === 'free-arts-books' && b.contentType === 'BOOK',
  'free-audiobooks-bestsellers': b => b.contentType === 'AUDIOBOOK',
  'science-that-changed-the-world': b => b.category.slug === 'free-science-books' && b.contentType === 'BOOK',
  'classic-novels-public-domain': b => b.contentType === 'NOVEL',
  'engineering-fundamentals': b => b.category.slug === 'free-engineering-books',
};

export function getCollectionBooks(slug: string): Book[] {
  const filter = COLLECTION_FILTERS[slug];
  if (!filter) return [];
  return BOOKS.filter(filter);
}

export function getBookBySlug(slug: string): Book | undefined {
  return BOOKS.find(b => b.slug === slug);
}

export function getBooksByCategory(categorySlug: string): Book[] {
  return BOOKS.filter(b => b.category.slug === categorySlug);
}

export function getAllBooks(): Book[] {
  return BOOKS;
}

export function searchBooks(query: string): Book[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const words = q.split(/\s+/).filter(w => w.length > 1);

  return BOOKS
    .map(b => {
      const titleLower = b.title.toLowerCase();
      const authorLower = b.author.toLowerCase();
      const catLower = b.category.name.toLowerCase();
      const descLower = b.description.toLowerCase();

      let score = 0;

      if (titleLower === q) score += 100;
      if (titleLower.includes(q)) score += 50;
      if (authorLower.includes(q)) score += 40;
      if (catLower.includes(q)) score += 20;

      for (const word of words) {
        if (titleLower.includes(word)) score += 15;
        if (authorLower.includes(word)) score += 12;
        if (catLower.includes(word)) score += 5;
        if (descLower.includes(word)) score += 3;
        if (b.formats.some(f => f.toLowerCase() === word)) score += 2;
        if (b.contentType.toLowerCase().includes(word)) score += 5;
      }

      return { book: b, score };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(r => r.book);
}

export function formatCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}
