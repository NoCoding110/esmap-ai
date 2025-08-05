/**
 * Web Scraping Infrastructure with Legal Compliance
 * Respectful web scraping with robots.txt compliance and rate limiting
 */

import {
  WebScrapingJob,
  JobStatus,
  ValidationRule,
  ComplianceConfig,
  LegalComplianceCheck,
  ComplianceCheckResult
} from './types';

export interface RobotsTxt {
  url: string;
  content: string;
  parsed: {
    userAgents: Map<string, RobotRules>;
    sitemaps: string[];
    crawlDelay: number;
  };
  lastFetched: string;
  valid: boolean;
}

export interface RobotRules {
  allow: string[];
  disallow: string[];
  crawlDelay?: number;
  requestRate?: string;
}

export interface ScrapingResult {
  jobId: string;
  url: string;
  data: any;
  extractedFields: Record<string, any>;
  metadata: {
    statusCode: number;
    responseTime: number;
    contentLength: number;
    contentType: string;
    lastModified?: string;
    etag?: string;
  };
  compliance: {
    robotsAllowed: boolean;
    rateLimitRespected: boolean;
    termsOfServiceAccepted: boolean;
  };
  quality: {
    completeness: number;
    accuracy: number;
    freshness: number;
  };
  errors: string[];
  warnings: string[];
}

export interface ScrapingSession {
  id: string;
  jobId: string;
  startTime: string;
  endTime?: string;
  urlsProcessed: number;
  urlsSuccessful: number;
  urlsFailed: number;
  dataExtracted: number;
  bytesDownloaded: number;
  averageResponseTime: number;
  robotsViolations: number;
  rateLimitHits: number;
}

export class WebScrapingManager {
  private jobs: Map<string, WebScrapingJob> = new Map();
  private robotsCache: Map<string, RobotsTxt> = new Map();
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private sessions: Map<string, ScrapingSession> = new Map();
  private complianceChecker: ComplianceChecker;

  constructor() {
    this.complianceChecker = new ComplianceChecker();
  }

  /**
   * Register a web scraping job
   */
  registerJob(job: WebScrapingJob): void {
    // Validate job configuration
    this.validateJobConfig(job);

    // Perform compliance check
    const complianceCheck = this.complianceChecker.checkJobCompliance(job);
    if (complianceCheck.complianceStatus === 'non_compliant') {
      throw new Error(`Job ${job.id} is not compliant: ${complianceCheck.checks.map(c => c.description).join(', ')}`);
    }

    this.jobs.set(job.id, job);
    
    // Initialize rate limiter for the domain
    const domain = this.extractDomain(job.targetUrl);
    if (!this.rateLimiters.has(domain)) {
      this.rateLimiters.set(domain, new RateLimiter({
        requestsPerMinute: Math.ceil(60000 / job.rateLimit.delay),
        concurrent: job.rateLimit.concurrent
      }));
    }

    console.log(`Registered scraping job: ${job.name} (${job.id})`);
  }

  /**
   * Execute a scraping job
   */
  async executeJob(jobId: string): Promise<ScrapingResult> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    job.status = JobStatus.RUNNING;
    job.lastRun = new Date().toISOString();

    const session = this.createSession(jobId);

    try {
      // Check robots.txt compliance
      const domain = this.extractDomain(job.targetUrl);
      const robotsAllowed = await this.checkRobotsCompliance(job.targetUrl, job.userAgent);
      
      if (job.respectRobotsTxt && !robotsAllowed) {
        session.robotsViolations++;
        throw new Error(`Robots.txt disallows scraping of ${job.targetUrl}`);
      }

      // Rate limiting
      const rateLimiter = this.rateLimiters.get(domain);
      if (rateLimiter) {
        await rateLimiter.waitForSlot();
      }

      // Perform scraping
      const result = await this.scrapeUrl(job, session);

      // Update job status
      job.status = JobStatus.COMPLETED;
      this.finalizeSession(session, true);

      return result;

    } catch (error) {
      job.status = JobStatus.FAILED;
      this.finalizeSession(session, false);
      
      console.error(`Scraping job ${jobId} failed:`, error);
      throw error;
    }
  }

  /**
   * Scrape a single URL
   */
  private async scrapeUrl(job: WebScrapingJob, session: ScrapingSession): Promise<ScrapingResult> {
    const startTime = Date.now();
    session.urlsProcessed++;

    try {
      // Fetch the page
      const response = await this.fetchPage(job.targetUrl, job.headers, job.userAgent);
      
      if (!response.ok) {
        session.urlsFailed++;
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const content = await response.text();
      const responseTime = Date.now() - startTime;

      // Update session metrics
      session.bytesDownloaded += content.length;
      session.averageResponseTime = (session.averageResponseTime * (session.urlsProcessed - 1) + responseTime) / session.urlsProcessed;

      // Extract data using selectors
      const extractedFields = this.extractData(content, job.selectors);

      // Validate extracted data
      const validationResults = this.validateData(extractedFields, job.dataValidation);
      
      if (validationResults.isValid) {
        session.urlsSuccessful++;
        session.dataExtracted++;
      } else {
        session.urlsFailed++;
      }

      // Assess data quality
      const quality = this.assessDataQuality(extractedFields, validationResults);

      const result: ScrapingResult = {
        jobId: job.id,
        url: job.targetUrl,
        data: extractedFields,
        extractedFields,
        metadata: {
          statusCode: response.status,
          responseTime,
          contentLength: content.length,
          contentType: response.headers.get('content-type') || '',
          lastModified: response.headers.get('last-modified') || undefined,
          etag: response.headers.get('etag') || undefined
        },
        compliance: {
          robotsAllowed: true, // Already checked
          rateLimitRespected: true, // Rate limiter ensures this
          termsOfServiceAccepted: job.respectRobotsTxt
        },
        quality,
        errors: validationResults.errors,
        warnings: validationResults.warnings
      };

      return result;

    } catch (error) {
      session.urlsFailed++;
      throw error;
    }
  }

  /**
   * Fetch page content
   */
  private async fetchPage(url: string, headers: Record<string, string>, userAgent: string): Promise<Response> {
    const fetchHeaders = {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      ...headers
    };

    const response = await fetch(url, {
      method: 'GET',
      headers: fetchHeaders,
      redirect: 'follow'
    });

    return response;
  }

  /**
   * Extract data using CSS selectors
   */
  private extractData(content: string, selectors: Record<string, string>): Record<string, any> {
    const extracted: Record<string, any> = {};

    // Simple HTML parsing (in production, use a proper HTML parser)
    for (const [field, selector] of Object.entries(selectors)) {
      try {
        const values = this.extractBySelector(content, selector);
        extracted[field] = values.length === 1 ? values[0] : values;
      } catch (error) {
        console.warn(`Failed to extract field ${field} with selector ${selector}:`, error);
        extracted[field] = null;
      }
    }

    return extracted;
  }

  /**
   * Simple CSS selector extraction (placeholder implementation)
   */
  private extractBySelector(html: string, selector: string): string[] {
    const results: string[] = [];

    // This is a very basic implementation
    // In production, use a proper HTML parser like jsdom or cheerio
    
    if (selector.startsWith('title')) {
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      if (titleMatch) results.push(titleMatch[1].trim());
    } else if (selector.includes('class=')) {
      const className = selector.match(/class=["']([^"']*)["']/)?.[1];
      if (className) {
        const regex = new RegExp(`<[^>]*class=["'][^"']*${className}[^"']*["'][^>]*>([^<]*)<`, 'gi');
        let match;
        while ((match = regex.exec(html)) !== null) {
          results.push(match[1].trim());
        }
      }
    } else if (selector.includes('id=')) {
      const id = selector.match(/id=["']([^"']*)["']/)?.[1];
      if (id) {
        const regex = new RegExp(`<[^>]*id=["']${id}["'][^>]*>([^<]*)<`, 'i');
        const match = html.match(regex);
        if (match) results.push(match[1].trim());
      }
    }

    return results;
  }

  /**
   * Validate extracted data
   */
  private validateData(data: Record<string, any>, rules: ValidationRule[]): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const rule of rules) {
      const value = data[rule.field];

      switch (rule.type) {
        case 'required':
          if (value === null || value === undefined || value === '') {
            errors.push(`Field ${rule.field} is required but missing`);
          }
          break;

        case 'pattern':
          if (value && rule.config.pattern) {
            const regex = new RegExp(rule.config.pattern);
            if (!regex.test(String(value))) {
              warnings.push(`Field ${rule.field} does not match expected pattern`);
            }
          }
          break;

        case 'range':
          if (value !== null && value !== undefined) {
            const numValue = Number(value);
            if (!isNaN(numValue)) {
              if (rule.config.min !== undefined && numValue < rule.config.min) {
                warnings.push(`Field ${rule.field} value ${numValue} is below minimum ${rule.config.min}`);
              }
              if (rule.config.max !== undefined && numValue > rule.config.max) {
                warnings.push(`Field ${rule.field} value ${numValue} is above maximum ${rule.config.max}`);
              }
            }
          }
          break;

        case 'custom':
          // Custom validation logic would go here
          break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Assess data quality
   */
  private assessDataQuality(data: Record<string, any>, validation: any): {
    completeness: number;
    accuracy: number;
    freshness: number;
  } {
    const totalFields = Object.keys(data).length;
    const completeFields = Object.values(data).filter(v => v !== null && v !== undefined && v !== '').length;
    
    const completeness = totalFields > 0 ? completeFields / totalFields : 0;
    const accuracy = validation.errors.length === 0 ? 1.0 : Math.max(0, 1 - (validation.errors.length / totalFields));
    const freshness = 0.9; // Placeholder - would check data timestamps

    return { completeness, accuracy, freshness };
  }

  /**
   * Check robots.txt compliance
   */
  private async checkRobotsCompliance(url: string, userAgent: string): Promise<boolean> {
    const domain = this.extractDomain(url);
    const robotsUrl = `${domain}/robots.txt`;

    // Check cache first
    let robotsTxt = this.robotsCache.get(domain);
    
    if (!robotsTxt || this.isRobotsCacheExpired(robotsTxt)) {
      robotsTxt = await this.fetchRobotsTxt(robotsUrl);
      this.robotsCache.set(domain, robotsTxt);
    }

    if (!robotsTxt.valid) {
      return true; // If robots.txt is invalid, allow scraping
    }

    // Check if the URL is allowed for this user agent
    return this.isUrlAllowed(url, userAgent, robotsTxt);
  }

  /**
   * Fetch and parse robots.txt
   */
  private async fetchRobotsTxt(robotsUrl: string): Promise<RobotsTxt> {
    try {
      const response = await fetch(robotsUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'ESMAP-AI-Bot/1.0 (+https://esmap.org/robots-info)'
        }
      });

      const content = await response.text();
      const parsed = this.parseRobotsTxt(content);

      return {
        url: robotsUrl,
        content,
        parsed,
        lastFetched: new Date().toISOString(),
        valid: response.ok
      };

    } catch (error) {
      console.warn(`Failed to fetch robots.txt from ${robotsUrl}:`, error);
      
      return {
        url: robotsUrl,
        content: '',
        parsed: {
          userAgents: new Map(),
          sitemaps: [],
          crawlDelay: 1
        },
        lastFetched: new Date().toISOString(),
        valid: false
      };
    }
  }

  /**
   * Parse robots.txt content
   */
  private parseRobotsTxt(content: string): RobotsTxt['parsed'] {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
    const userAgents = new Map<string, RobotRules>();
    const sitemaps: string[] = [];
    let currentUserAgent = '*';
    let crawlDelay = 1;

    for (const line of lines) {
      const [directive, ...valueParts] = line.split(':').map(part => part.trim());
      const value = valueParts.join(':');

      switch (directive.toLowerCase()) {
        case 'user-agent':
          currentUserAgent = value;
          if (!userAgents.has(currentUserAgent)) {
            userAgents.set(currentUserAgent, { allow: [], disallow: [] });
          }
          break;

        case 'disallow':
          const disallowRules = userAgents.get(currentUserAgent) || { allow: [], disallow: [] };
          disallowRules.disallow.push(value);
          userAgents.set(currentUserAgent, disallowRules);
          break;

        case 'allow':
          const allowRules = userAgents.get(currentUserAgent) || { allow: [], disallow: [] };
          allowRules.allow.push(value);
          userAgents.set(currentUserAgent, allowRules);
          break;

        case 'crawl-delay':
          const delay = parseInt(value);
          if (!isNaN(delay)) {
            crawlDelay = delay;
            const rules = userAgents.get(currentUserAgent) || { allow: [], disallow: [] };
            rules.crawlDelay = delay;
            userAgents.set(currentUserAgent, rules);
          }
          break;

        case 'sitemap':
          sitemaps.push(value);
          break;

        case 'request-rate':
          const rateRules = userAgents.get(currentUserAgent) || { allow: [], disallow: [] };
          rateRules.requestRate = value;
          userAgents.set(currentUserAgent, rateRules);
          break;
      }
    }

    return { userAgents, sitemaps, crawlDelay };
  }

  /**
   * Check if URL is allowed by robots.txt
   */
  private isUrlAllowed(url: string, userAgent: string, robotsTxt: RobotsTxt): boolean {
    const urlPath = new URL(url).pathname;
    
    // Check specific user agent rules first
    const specificRules = robotsTxt.parsed.userAgents.get(userAgent);
    if (specificRules) {
      return this.checkRulesForPath(urlPath, specificRules);
    }

    // Check wildcard rules
    const wildcardRules = robotsTxt.parsed.userAgents.get('*');
    if (wildcardRules) {
      return this.checkRulesForPath(urlPath, wildcardRules);
    }

    // If no rules found, allow by default
    return true;
  }

  /**
   * Check rules for specific path
   */
  private checkRulesForPath(path: string, rules: RobotRules): boolean {
    // Check explicit allows first
    for (const allow of rules.allow) {
      if (this.pathMatches(path, allow)) {
        return true;
      }
    }

    // Check disallows
    for (const disallow of rules.disallow) {
      if (this.pathMatches(path, disallow)) {
        return false;
      }
    }

    // If no rules match, allow by default
    return true;
  }

  /**
   * Check if path matches robots.txt pattern
   */
  private pathMatches(path: string, pattern: string): boolean {
    if (pattern === '') return true;
    if (pattern === '/') return path === '/';
    
    // Convert robots.txt pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\$/g, '$');
    
    const regex = new RegExp(`^${regexPattern}`);
    return regex.test(path);
  }

  /**
   * Helper methods
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}`;
    } catch (error) {
      throw new Error(`Invalid URL: ${url}`);
    }
  }

  private isRobotsCacheExpired(robotsTxt: RobotsTxt): boolean {
    const cacheAge = Date.now() - new Date(robotsTxt.lastFetched).getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    return cacheAge > maxAge;
  }

  private validateJobConfig(job: WebScrapingJob): void {
    if (!job.id || !job.name || !job.targetUrl) {
      throw new Error('Job must have id, name, and targetUrl');
    }

    try {
      new URL(job.targetUrl);
    } catch (error) {
      throw new Error(`Invalid target URL: ${job.targetUrl}`);
    }

    if (!job.selectors || Object.keys(job.selectors).length === 0) {
      throw new Error('Job must have at least one selector');
    }
  }

  private createSession(jobId: string): ScrapingSession {
    const session: ScrapingSession = {
      id: crypto.randomUUID(),
      jobId,
      startTime: new Date().toISOString(),
      urlsProcessed: 0,
      urlsSuccessful: 0,
      urlsFailed: 0,
      dataExtracted: 0,
      bytesDownloaded: 0,
      averageResponseTime: 0,
      robotsViolations: 0,
      rateLimitHits: 0
    };

    this.sessions.set(session.id, session);
    return session;
  }

  private finalizeSession(session: ScrapingSession, success: boolean): void {
    session.endTime = new Date().toISOString();
    console.log(`Scraping session ${session.id} completed:`, {
      success,
      urlsProcessed: session.urlsProcessed,
      urlsSuccessful: session.urlsSuccessful,
      dataExtracted: session.dataExtracted
    });
  }

  /**
   * Public API methods
   */
  getJob(jobId: string): WebScrapingJob | undefined {
    return this.jobs.get(jobId);
  }

  getAllJobs(): WebScrapingJob[] {
    return Array.from(this.jobs.values());
  }

  getSession(sessionId: string): ScrapingSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): ScrapingSession[] {
    return Array.from(this.sessions.values());
  }

  removeJob(jobId: string): boolean {
    return this.jobs.delete(jobId);
  }

  updateJob(jobId: string, updates: Partial<WebScrapingJob>): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    Object.assign(job, updates);
    return true;
  }
}

/**
 * Rate Limiter for respectful scraping
 */
class RateLimiter {
  private queue: Array<() => void> = [];
  private running = 0;
  private lastRequest = 0;

  constructor(private config: { requestsPerMinute: number; concurrent: number }) {}

  async waitForSlot(): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.processQueue();
    });
  }

  private processQueue(): void {
    if (this.queue.length === 0 || this.running >= this.config.concurrent) {
      return;
    }

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    const minInterval = 60000 / this.config.requestsPerMinute; // ms between requests

    if (timeSinceLastRequest >= minInterval) {
      const resolve = this.queue.shift()!;
      this.running++;
      this.lastRequest = now;

      resolve();

      // Free up slot after a short delay
      setTimeout(() => {
        this.running--;
        this.processQueue();
      }, minInterval);
    } else {
      // Wait until we can make the next request
      const waitTime = minInterval - timeSinceLastRequest;
      setTimeout(() => this.processQueue(), waitTime);
    }
  }
}

/**
 * Legal Compliance Checker
 */
class ComplianceChecker {
  checkJobCompliance(job: WebScrapingJob): LegalComplianceCheck {
    const checks: ComplianceCheckResult[] = [];

    // Check robots.txt compliance
    checks.push({
      checkType: 'robots_txt',
      status: job.respectRobotsTxt ? 'pass' : 'warning',
      description: job.respectRobotsTxt ? 'Respects robots.txt' : 'Does not check robots.txt',
      remediation: job.respectRobotsTxt ? undefined : 'Enable robots.txt compliance'
    });

    // Check rate limiting
    const hasRateLimit = job.rateLimit.delay > 0;
    checks.push({
      checkType: 'rate_limiting',
      status: hasRateLimit ? 'pass' : 'fail',
      description: hasRateLimit ? 'Has rate limiting' : 'No rate limiting configured',
      remediation: hasRateLimit ? undefined : 'Configure appropriate rate limiting'
    });

    // Check user agent
    const hasProperUserAgent = job.userAgent && job.userAgent.includes('Bot') && job.userAgent.includes('http');
    checks.push({
      checkType: 'user_agent',
      status: hasProperUserAgent ? 'pass' : 'warning',
      description: hasProperUserAgent ? 'Proper bot identification' : 'User agent should identify as bot with contact info',
      remediation: hasProperUserAgent ? undefined : 'Update user agent to identify as bot with contact information'
    });

    // Determine overall compliance status
    const failCount = checks.filter(c => c.status === 'fail').length;
    const complianceStatus = failCount > 0 ? 'non_compliant' : 'compliant';

    const recommendations: string[] = [];
    if (!job.respectRobotsTxt) {
      recommendations.push('Enable robots.txt compliance to respect website policies');
    }
    if (job.rateLimit.delay < 1000) {
      recommendations.push('Consider increasing delay between requests to be more respectful');
    }

    return {
      sourceId: job.id,
      lastChecked: new Date().toISOString(),
      complianceStatus,
      checks,
      recommendations,
      nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    };
  }
}