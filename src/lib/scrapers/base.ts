export interface ScrapedBook {
  externalId: string;
  title: string;
  author: string;
  description: string;
  coverUrl?: string;
  contentType: 'BOOK' | 'AUDIOBOOK' | 'NOVEL' | 'COMIC' | 'MAGAZINE' | 'RESEARCH_PAPER' | 'MANUAL' | 'NEWSLETTER';
  language: string;
  isbn?: string;
  publisher?: string;
  publishYear?: number;
  pageCount?: number;
  narrator?: string;
  duration?: number;
  formats: { format: string; url: string; fileSize?: number }[];
  categories: string[];
  tags: string[];
}

export interface ScraperConfig {
  name: string;
  baseUrl: string;
  rateLimit: number;
  batchSize: number;
}

export abstract class BaseScraper {
  protected config: ScraperConfig;

  constructor(config: ScraperConfig) {
    this.config = config;
  }

  abstract fetchPage(page: number): Promise<ScrapedBook[]>;
  abstract fetchBook(externalId: string): Promise<ScrapedBook | null>;
  abstract getTotalCount(): Promise<number>;

  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async scrapeAll(onProgress?: (count: number) => void): Promise<ScrapedBook[]> {
    const total = await this.getTotalCount();
    const pages = Math.ceil(total / this.config.batchSize);
    const results: ScrapedBook[] = [];

    for (let page = 0; page < pages; page++) {
      const books = await this.fetchPage(page);
      results.push(...books);
      onProgress?.(results.length);
      await this.delay(this.config.rateLimit);
    }

    return results;
  }
}
