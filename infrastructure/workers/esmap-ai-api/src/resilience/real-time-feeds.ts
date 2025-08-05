/**
 * Real-Time Data Acquisition System
 * Handles RSS/Atom feeds, social media APIs, news aggregation, and streaming data
 */

import {
  RealTimeDataStream,
  StreamType,
  DataTransformation,
  JobStatus
} from './types';

export interface FeedItem {
  id: string;
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
  category?: string;
  tags: string[];
  content?: string;
  author?: string;
  guid?: string;
}

export interface StreamConfig {
  id: string;
  name: string;
  url: string;
  type: StreamType;
  pollInterval: number; // seconds
  timeout: number; // milliseconds
  userAgent: string;
  headers: Record<string, string>;
  filters: StreamFilter[];
  transformations: DataTransformation[];
  retryPolicy: {
    maxAttempts: number;
    backoffMs: number;
  };
}

export interface StreamFilter {
  type: 'keyword' | 'category' | 'date' | 'source' | 'custom';
  field: string;
  operator: 'contains' | 'equals' | 'regex' | 'greater_than' | 'less_than';
  value: any;
  caseSensitive?: boolean;
}

export interface StreamMetrics {
  streamId: string;
  totalItems: number;
  itemsToday: number;
  lastPoll: string;
  lastSuccess: string;
  errorCount: number;
  averageLatency: number;
  duplicateRate: number;
  qualityScore: number;
}

export class RealTimeFeedManager {
  private streams: Map<string, StreamConfig> = new Map();
  private streamMetrics: Map<string, StreamMetrics> = new Map();
  private activePollers: Map<string, NodeJS.Timeout> = new Map();
  private itemCache: Map<string, Set<string>> = new Map(); // For duplicate detection
  private feedParsers: Map<StreamType, (content: string) => FeedItem[]> = new Map();

  constructor() {
    this.initializeParsers();
  }

  /**
   * Initialize feed parsers for different stream types
   */
  private initializeParsers(): void {
    this.feedParsers.set(StreamType.RSS_FEED, this.parseRSSFeed.bind(this));
    this.feedParsers.set(StreamType.ATOM_FEED, this.parseAtomFeed.bind(this));
    this.feedParsers.set(StreamType.JSON_API, this.parseJsonFeed.bind(this));
    this.feedParsers.set(StreamType.NEWS_API, this.parseNewsAPI.bind(this));
  }

  /**
   * Register a new data stream
   */
  registerStream(config: StreamConfig): void {
    this.streams.set(config.id, config);
    
    // Initialize metrics
    this.streamMetrics.set(config.id, {
      streamId: config.id,
      totalItems: 0,
      itemsToday: 0,
      lastPoll: '',
      lastSuccess: '',
      errorCount: 0,
      averageLatency: 0,
      duplicateRate: 0,
      qualityScore: 0.8
    });

    // Initialize cache for duplicate detection
    this.itemCache.set(config.id, new Set());

    console.log(`Registered stream: ${config.name} (${config.id})`);
  }

  /**
   * Start polling a stream
   */
  startStream(streamId: string): void {
    const config = this.streams.get(streamId);
    if (!config) {
      throw new Error(`Stream ${streamId} not found`);
    }

    // Stop existing poller if running
    this.stopStream(streamId);

    // Start new poller
    const intervalMs = config.pollInterval * 1000;
    const pollerId = setInterval(() => {
      this.pollStream(streamId).catch(error => {
        console.error(`Polling error for stream ${streamId}:`, error);
      });
    }, intervalMs);

    this.activePollers.set(streamId, pollerId);
    
    // Do initial poll
    this.pollStream(streamId).catch(error => {
      console.error(`Initial poll error for stream ${streamId}:`, error);
    });

    console.log(`Started stream: ${config.name} (polling every ${config.pollInterval}s)`);
  }

  /**
   * Stop polling a stream
   */
  stopStream(streamId: string): void {
    const pollerId = this.activePollers.get(streamId);
    if (pollerId) {
      clearInterval(pollerId);
      this.activePollers.delete(streamId);
      
      const config = this.streams.get(streamId);
      console.log(`Stopped stream: ${config?.name || streamId}`);
    }
  }

  /**
   * Poll a single stream
   */
  private async pollStream(streamId: string): Promise<FeedItem[]> {
    const config = this.streams.get(streamId);
    const metrics = this.streamMetrics.get(streamId);
    
    if (!config || !metrics) {
      throw new Error(`Stream ${streamId} not properly configured`);
    }

    const startTime = Date.now();
    metrics.lastPoll = new Date().toISOString();

    try {
      // Fetch content
      const content = await this.fetchStreamContent(config);
      
      // Parse content
      const parser = this.feedParsers.get(config.type);
      if (!parser) {
        throw new Error(`No parser available for stream type: ${config.type}`);
      }

      let items = parser(content);

      // Apply filters
      items = this.applyFilters(items, config.filters);

      // Apply transformations
      items = await this.applyTransformations(items, config.transformations);

      // Detect duplicates
      const { newItems, duplicateCount } = this.filterDuplicates(streamId, items);

      // Update metrics
      const latency = Date.now() - startTime;
      this.updateMetrics(streamId, newItems.length, duplicateCount, latency, true);

      console.log(`Polled stream ${config.name}: ${newItems.length} new items (${duplicateCount} duplicates)`);

      return newItems;

    } catch (error) {
      const latency = Date.now() - startTime;
      this.updateMetrics(streamId, 0, 0, latency, false);
      
      console.error(`Error polling stream ${config.name}:`, error);
      throw error;
    }
  }

  /**
   * Fetch content from stream URL
   */
  private async fetchStreamContent(config: StreamConfig): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(config.url, {
        method: 'GET',
        headers: {
          'User-Agent': config.userAgent,
          'Accept': this.getAcceptHeader(config.type),
          ...config.headers
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const content = await response.text();
      return content;

    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get appropriate Accept header for stream type
   */
  private getAcceptHeader(type: StreamType): string {
    switch (type) {
      case StreamType.RSS_FEED:
        return 'application/rss+xml, application/xml, text/xml';
      case StreamType.ATOM_FEED:
        return 'application/atom+xml, application/xml, text/xml';
      case StreamType.JSON_API:
      case StreamType.NEWS_API:
        return 'application/json';
      default:
        return 'text/html, application/xhtml+xml, application/xml';
    }
  }

  /**
   * Parse RSS feed content
   */
  private parseRSSFeed(content: string): FeedItem[] {
    const items: FeedItem[] = [];
    
    try {
      // Simple XML parsing (in production, use a proper XML parser)
      const itemMatches = content.match(/<item[\s\S]*?<\/item>/gi) || [];
      
      for (const itemXml of itemMatches) {
        const item: FeedItem = {
          id: this.extractXmlTag(itemXml, 'guid') || this.extractXmlTag(itemXml, 'link') || '',
          title: this.extractXmlTag(itemXml, 'title') || '',
          description: this.extractXmlTag(itemXml, 'description') || '',
          link: this.extractXmlTag(itemXml, 'link') || '',
          pubDate: this.extractXmlTag(itemXml, 'pubDate') || new Date().toISOString(),
          source: 'rss',
          tags: this.extractCategories(itemXml),
          content: this.extractXmlTag(itemXml, 'content:encoded'),
          author: this.extractXmlTag(itemXml, 'author') || this.extractXmlTag(itemXml, 'dc:creator'),
          guid: this.extractXmlTag(itemXml, 'guid')
        };

        if (item.title && item.link) {
          items.push(item);
        }
      }
    } catch (error) {
      console.error('Error parsing RSS feed:', error);
    }

    return items;
  }

  /**
   * Parse Atom feed content
   */
  private parseAtomFeed(content: string): FeedItem[] {
    const items: FeedItem[] = [];
    
    try {
      const entryMatches = content.match(/<entry[\s\S]*?<\/entry>/gi) || [];
      
      for (const entryXml of entryMatches) {
        const item: FeedItem = {
          id: this.extractXmlTag(entryXml, 'id') || '',
          title: this.extractXmlTag(entryXml, 'title') || '',
          description: this.extractXmlTag(entryXml, 'summary') || '',
          link: this.extractAtomLink(entryXml),
          pubDate: this.extractXmlTag(entryXml, 'published') || this.extractXmlTag(entryXml, 'updated') || new Date().toISOString(),
          source: 'atom',
          tags: this.extractAtomCategories(entryXml),
          content: this.extractXmlTag(entryXml, 'content'),
          author: this.extractAtomAuthor(entryXml)
        };

        if (item.title && item.link) {
          items.push(item);
        }
      }
    } catch (error) {
      console.error('Error parsing Atom feed:', error);
    }

    return items;
  }

  /**
   * Parse JSON feed content
   */
  private parseJsonFeed(content: string): FeedItem[] {
    const items: FeedItem[] = [];
    
    try {
      const data = JSON.parse(content);
      
      if (data.items && Array.isArray(data.items)) {
        for (const jsonItem of data.items) {
          const item: FeedItem = {
            id: jsonItem.id || jsonItem.url || '',
            title: jsonItem.title || '',
            description: jsonItem.summary || jsonItem.content_text || '',
            link: jsonItem.url || '',
            pubDate: jsonItem.date_published || new Date().toISOString(),
            source: 'json',
            tags: jsonItem.tags || [],
            content: jsonItem.content_html || jsonItem.content_text,
            author: jsonItem.author?.name
          };

          if (item.title && item.link) {
            items.push(item);
          }
        }
      }
    } catch (error) {
      console.error('Error parsing JSON feed:', error);
    }

    return items;
  }

  /**
   * Parse News API content
   */
  private parseNewsAPI(content: string): FeedItem[] {
    const items: FeedItem[] = [];
    
    try {
      const data = JSON.parse(content);
      
      if (data.articles && Array.isArray(data.articles)) {
        for (const article of data.articles) {
          const item: FeedItem = {
            id: article.url || '',
            title: article.title || '',
            description: article.description || '',
            link: article.url || '',
            pubDate: article.publishedAt || new Date().toISOString(),
            source: article.source?.name || 'news-api',
            tags: [],
            content: article.content,
            author: article.author
          };

          if (item.title && item.link) {
            items.push(item);
          }
        }
      }
    } catch (error) {
      console.error('Error parsing News API response:', error);
    }

    return items;
  }

  /**
   * Helper methods for XML parsing
   */
  private extractXmlTag(xml: string, tagName: string): string {
    const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
  }

  private extractCategories(xml: string): string[] {
    const categories: string[] = [];
    const categoryMatches = xml.match(/<category[^>]*>([^<]*)<\/category>/gi) || [];
    
    for (const match of categoryMatches) {
      const category = this.extractXmlTag(match, 'category');
      if (category) categories.push(category);
    }
    
    return categories;
  }

  private extractAtomLink(xml: string): string {
    const linkMatch = xml.match(/<link\s+[^>]*href="([^"]*)"[^>]*>/i);
    return linkMatch ? linkMatch[1] : '';
  }

  private extractAtomCategories(xml: string): string[] {
    const categories: string[] = [];
    const categoryMatches = xml.match(/<category\s+[^>]*term="([^"]*)"[^>]*>/gi) || [];
    
    for (const match of categoryMatches) {
      const termMatch = match.match(/term="([^"]*)"/i);
      if (termMatch) categories.push(termMatch[1]);
    }
    
    return categories;
  }

  private extractAtomAuthor(xml: string): string {
    const authorXml = xml.match(/<author[\s\S]*?<\/author>/i);
    if (authorXml) {
      return this.extractXmlTag(authorXml[0], 'name');
    }
    return '';
  }

  /**
   * Apply filters to feed items
   */
  private applyFilters(items: FeedItem[], filters: StreamFilter[]): FeedItem[] {
    if (!filters || filters.length === 0) return items;

    return items.filter(item => {
      return filters.every(filter => this.matchesFilter(item, filter));
    });
  }

  /**
   * Check if item matches filter
   */
  private matchesFilter(item: FeedItem, filter: StreamFilter): boolean {
    const fieldValue = this.getFieldValue(item, filter.field);
    const filterValue = filter.value;

    if (fieldValue === undefined || fieldValue === null) return false;

    const itemValue = filter.caseSensitive !== false ? 
      String(fieldValue).toLowerCase() : String(fieldValue);
    const compareValue = filter.caseSensitive !== false ? 
      String(filterValue).toLowerCase() : String(filterValue);

    switch (filter.operator) {
      case 'contains':
        return itemValue.includes(compareValue);
      case 'equals':
        return itemValue === compareValue;
      case 'regex':
        const regex = new RegExp(filterValue, filter.caseSensitive ? 'g' : 'gi');
        return regex.test(itemValue);
      case 'greater_than':
        return Number(fieldValue) > Number(filterValue);
      case 'less_than':
        return Number(fieldValue) < Number(filterValue);
      default:
        return true;
    }
  }

  /**
   * Get field value from item
   */
  private getFieldValue(item: FeedItem, field: string): any {
    const fields = field.split('.');
    let value: any = item;
    
    for (const f of fields) {
      value = value?.[f];
    }
    
    return value;
  }

  /**
   * Apply transformations to items
   */
  private async applyTransformations(items: FeedItem[], transformations: DataTransformation[]): Promise<FeedItem[]> {
    if (!transformations || transformations.length === 0) return items;

    let transformedItems = [...items];

    // Sort transformations by order
    const sortedTransformations = transformations.sort((a, b) => a.order - b.order);

    for (const transformation of sortedTransformations) {
      switch (transformation.type) {
        case 'filter':
          transformedItems = this.applyFilterTransformation(transformedItems, transformation.config);
          break;
        case 'map':
          transformedItems = this.applyMapTransformation(transformedItems, transformation.config);
          break;
        case 'validate':
          transformedItems = this.applyValidationTransformation(transformedItems, transformation.config);
          break;
        case 'enrich':
          transformedItems = await this.applyEnrichmentTransformation(transformedItems, transformation.config);
          break;
      }
    }

    return transformedItems;
  }

  /**
   * Transformation implementations
   */
  private applyFilterTransformation(items: FeedItem[], config: any): FeedItem[] {
    // Apply additional filtering based on config
    return items; // Placeholder implementation
  }

  private applyMapTransformation(items: FeedItem[], config: any): FeedItem[] {
    // Transform item fields based on mapping config
    return items; // Placeholder implementation
  }

  private applyValidationTransformation(items: FeedItem[], config: any): FeedItem[] {
    // Validate items and remove invalid ones
    return items.filter(item => {
      return item.title && item.link && item.pubDate;
    });
  }

  private async applyEnrichmentTransformation(items: FeedItem[], config: any): Promise<FeedItem[]> {
    // Enrich items with additional data
    return items; // Placeholder implementation
  }

  /**
   * Filter duplicates based on cache
   */
  private filterDuplicates(streamId: string, items: FeedItem[]): { newItems: FeedItem[]; duplicateCount: number } {
    const cache = this.itemCache.get(streamId) || new Set();
    const newItems: FeedItem[] = [];
    let duplicateCount = 0;

    for (const item of items) {
      const itemKey = this.generateItemKey(item);
      
      if (!cache.has(itemKey)) {
        cache.add(itemKey);
        newItems.push(item);
      } else {
        duplicateCount++;
      }
    }

    // Limit cache size to prevent memory issues
    if (cache.size > 10000) {
      const cacheArray = Array.from(cache);
      const trimmedCache = new Set(cacheArray.slice(-5000)); // Keep last 5000
      this.itemCache.set(streamId, trimmedCache);
    }

    return { newItems, duplicateCount };
  }

  /**
   * Generate unique key for item
   */
  private generateItemKey(item: FeedItem): string {
    // Use multiple fields to create unique identifier
    const keyComponents = [
      item.id || item.guid,
      item.link,
      item.title,
      item.pubDate
    ].filter(Boolean);
    
    return keyComponents.join('|');
  }

  /**
   * Update stream metrics
   */
  private updateMetrics(
    streamId: string,
    newItems: number,
    duplicates: number,
    latency: number,
    success: boolean
  ): void {
    const metrics = this.streamMetrics.get(streamId);
    if (!metrics) return;

    metrics.totalItems += newItems;
    metrics.itemsToday += newItems;
    
    if (success) {
      metrics.lastSuccess = new Date().toISOString();
      // Update average latency (exponential moving average)
      metrics.averageLatency = metrics.averageLatency === 0 ? 
        latency : (metrics.averageLatency * 0.8 + latency * 0.2);
    } else {
      metrics.errorCount++;
    }

    // Update duplicate rate
    const totalProcessed = newItems + duplicates;
    if (totalProcessed > 0) {
      const currentDuplicateRate = duplicates / totalProcessed;
      metrics.duplicateRate = metrics.duplicateRate === 0 ?
        currentDuplicateRate : (metrics.duplicateRate * 0.9 + currentDuplicateRate * 0.1);
    }

    // Update quality score based on various factors
    metrics.qualityScore = this.calculateQualityScore(metrics);
  }

  /**
   * Calculate quality score for stream
   */
  private calculateQualityScore(metrics: StreamMetrics): number {
    let score = 0.8; // Base score

    // Factor in success rate
    const recentPolls = 24; // Assume 24 polls per day
    const successRate = (recentPolls - metrics.errorCount) / recentPolls;
    score *= successRate;

    // Factor in latency (lower is better)
    const latencyScore = Math.max(0, 1 - (metrics.averageLatency / 5000)); // 5s max
    score = (score * 0.7) + (latencyScore * 0.3);

    // Factor in duplicate rate (lower is better)
    const duplicateScore = Math.max(0, 1 - metrics.duplicateRate);
    score = (score * 0.8) + (duplicateScore * 0.2);

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Get stream metrics
   */
  getStreamMetrics(streamId?: string): StreamMetrics | StreamMetrics[] {
    if (streamId) {
      return this.streamMetrics.get(streamId) || null;
    }
    return Array.from(this.streamMetrics.values());
  }

  /**
   * Get all registered streams
   */
  getStreams(): StreamConfig[] {
    return Array.from(this.streams.values());
  }

  /**
   * Remove a stream
   */
  removeStream(streamId: string): boolean {
    this.stopStream(streamId);
    this.itemCache.delete(streamId);
    this.streamMetrics.delete(streamId);
    return this.streams.delete(streamId);
  }

  /**
   * Start all streams
   */
  startAllStreams(): void {
    for (const streamId of this.streams.keys()) {
      try {
        this.startStream(streamId);
      } catch (error) {
        console.error(`Failed to start stream ${streamId}:`, error);
      }
    }
  }

  /**
   * Stop all streams
   */
  stopAllStreams(): void {
    for (const streamId of this.activePollers.keys()) {
      this.stopStream(streamId);
    }
  }

  /**
   * Get active streams count
   */
  getActiveStreamsCount(): number {
    return this.activePollers.size;
  }

  /**
   * Clean up old cache entries
   */
  cleanup(): void {
    const maxCacheSize = 5000;
    
    for (const [streamId, cache] of this.itemCache) {
      if (cache.size > maxCacheSize) {
        const cacheArray = Array.from(cache);
        const trimmedCache = new Set(cacheArray.slice(-Math.floor(maxCacheSize * 0.8)));
        this.itemCache.set(streamId, trimmedCache);
      }
    }

    // Reset daily counters if it's a new day
    const now = new Date();
    const today = now.toDateString();
    
    for (const metrics of this.streamMetrics.values()) {
      const lastSuccessDate = new Date(metrics.lastSuccess).toDateString();
      if (lastSuccessDate !== today) {
        metrics.itemsToday = 0;
        metrics.errorCount = 0;
      }
    }
  }
}