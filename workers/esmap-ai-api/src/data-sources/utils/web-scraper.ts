export interface ScrapingResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  url: string;
  timestamp: string;
  statusCode?: number;
}

export interface ScrapingOptions {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  waitTime?: number; // Time to wait between requests
  userAgent?: string;
}

export class WebScraper {
  private defaultOptions: ScrapingOptions = {
    timeout: 30000,
    retries: 3,
    waitTime: 1000,
    userAgent: 'ESMAP-AI-Platform/1.0.0 (https://esmap-ai.pages.dev)',
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    }
  };

  async fetchPage(url: string, options: ScrapingOptions = {}): Promise<ScrapingResult<string>> {
    const config = { ...this.defaultOptions, ...options };
    const timestamp = new Date().toISOString();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': config.userAgent!,
          ...config.headers
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();

      return {
        success: true,
        data: html,
        url,
        timestamp,
        statusCode: response.status
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown scraping error',
        url,
        timestamp
      };
    }
  }

  // Extract data using simple regex patterns (in production, use a proper HTML parser)
  extractTableData(html: string, tableSelector?: string): string[][] {
    try {
      // Very basic table extraction - in production, use proper HTML parsing
      const tableRegex = /<table[^>]*>(.*?)<\/table>/gis;
      const rowRegex = /<tr[^>]*>(.*?)<\/tr>/gis;
      const cellRegex = /<t[dh][^>]*>(.*?)<\/t[dh]>/gis;
      
      const tables = [...html.matchAll(tableRegex)];
      if (tables.length === 0) return [];
      
      // Use first table or specific table if selector provided
      const tableHtml = tables[0][1];
      const rows = [...tableHtml.matchAll(rowRegex)];
      
      return rows.map(row => {
        const cells = [...row[1].matchAll(cellRegex)];
        return cells.map(cell => this.cleanHtmlText(cell[1]));
      });
    } catch {
      return [];
    }
  }

  extractLinks(html: string, pattern?: RegExp): string[] {
    try {
      const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>/gis;
      const links = [...html.matchAll(linkRegex)];
      
      let urls = links.map(link => link[1]);
      
      if (pattern) {
        urls = urls.filter(url => pattern.test(url));
      }
      
      return [...new Set(urls)]; // Remove duplicates
    } catch {
      return [];
    }
  }

  extractText(html: string, selector?: string): string[] {
    try {
      // Simple text extraction - remove HTML tags
      const text = this.cleanHtmlText(html);
      return text.split('\n').filter(line => line.trim().length > 0);
    } catch {
      return [];
    }
  }

  private cleanHtmlText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&')  // Replace &amp; with &
      .replace(/&lt;/g, '<')   // Replace &lt; with <
      .replace(/&gt;/g, '>')   // Replace &gt; with >
      .replace(/&quot;/g, '"') // Replace &quot; with "
      .replace(/&#39;/g, "'")  // Replace &#39; with '
      .replace(/\s+/g, ' ')    // Replace multiple spaces with single space
      .trim();
  }

  // Method to check robots.txt compliance
  async checkRobotsTxt(baseUrl: string, userAgent: string = '*'): Promise<boolean> {
    try {
      const robotsUrl = new URL('/robots.txt', baseUrl).toString();
      const result = await this.fetchPage(robotsUrl);
      
      if (!result.success || !result.data) {
        return true; // If robots.txt doesn't exist, assume allowed
      }

      const robotsText = result.data;
      const lines = robotsText.split('\n');
      let currentUserAgent = '';
      let disallowed: string[] = [];
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('User-agent:')) {
          if (currentUserAgent === userAgent || currentUserAgent === '*') {
            break; // Found rules for our user agent
          }
          currentUserAgent = trimmed.split(':')[1].trim();
          disallowed = [];
        } else if (trimmed.startsWith('Disallow:') && (currentUserAgent === userAgent || currentUserAgent === '*')) {
          const path = trimmed.split(':')[1].trim();
          if (path) disallowed.push(path);
        }
      }
      
      // Check if our scraping path is disallowed
      const url = new URL(baseUrl);
      return !disallowed.some(path => url.pathname.startsWith(path));
      
    } catch {
      return true; // If we can't check robots.txt, assume allowed
    }
  }
}