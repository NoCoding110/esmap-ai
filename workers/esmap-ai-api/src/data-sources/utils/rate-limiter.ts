import type { RateLimiter } from '../types/base';
import type { Env } from '../../types';

interface RateLimitEntry {
  requestCount: number;
  hourlyCount: number;
  dailyCount: number;
  lastRequest: number;
  lastHourReset: number;
  lastDayReset: number;
}

export class CloudflareRateLimiter implements RateLimiter {
  private env: Env;
  private keyPrefix: string = 'rate_limit:';

  constructor(env: Env) {
    this.env = env;
  }

  async checkLimit(sourceId: string): Promise<boolean> {
    if (!this.env.CACHE) {
      return true; // Allow requests if KV is not available
    }

    const key = `${this.keyPrefix}${sourceId}`;
    const entryJson = await this.env.CACHE.get(key);
    
    if (!entryJson) {
      return true; // First request
    }

    const entry: RateLimitEntry = JSON.parse(entryJson);
    const now = Date.now();
    
    // Reset counters if needed
    if (now - entry.lastHourReset > 3600000) { // 1 hour
      entry.hourlyCount = 0;
      entry.lastHourReset = now;
    }
    
    if (now - entry.lastDayReset > 86400000) { // 24 hours
      entry.dailyCount = 0;
      entry.lastDayReset = now;
    }

    // Check per-second limit (simplified to 1-second window)
    const timeSinceLastRequest = now - entry.lastRequest;
    if (timeSinceLastRequest < 1000) {
      const allowedPerSecond = this.getRateLimitConfig(sourceId).requestsPerSecond;
      if (entry.requestCount >= allowedPerSecond) {
        return false;
      }
    } else {
      entry.requestCount = 0; // Reset second counter
    }

    // Check hourly and daily limits
    const config = this.getRateLimitConfig(sourceId);
    return entry.hourlyCount < config.requestsPerHour && 
           entry.dailyCount < config.requestsPerDay;
  }

  async updateUsage(sourceId: string): Promise<void> {
    if (!this.env.CACHE) {
      return;
    }

    const key = `${this.keyPrefix}${sourceId}`;
    const entryJson = await this.env.CACHE.get(key);
    const now = Date.now();
    
    let entry: RateLimitEntry;
    if (entryJson) {
      entry = JSON.parse(entryJson);
    } else {
      entry = {
        requestCount: 0,
        hourlyCount: 0,
        dailyCount: 0,
        lastRequest: 0,
        lastHourReset: now,
        lastDayReset: now
      };
    }

    // Update counters
    const timeSinceLastRequest = now - entry.lastRequest;
    if (timeSinceLastRequest >= 1000) {
      entry.requestCount = 1;
    } else {
      entry.requestCount++;
    }
    
    entry.hourlyCount++;
    entry.dailyCount++;
    entry.lastRequest = now;

    // Store with TTL of 25 hours to handle daily resets
    await this.env.CACHE.put(key, JSON.stringify(entry), { expirationTtl: 90000 });
  }

  async getRemainingRequests(sourceId: string): Promise<number> {
    if (!this.env.CACHE) {
      return 1000; // Default high value if KV not available
    }

    const key = `${this.keyPrefix}${sourceId}`;
    const entryJson = await this.env.CACHE.get(key);
    
    if (!entryJson) {
      const config = this.getRateLimitConfig(sourceId);
      return Math.min(config.requestsPerHour, config.requestsPerDay);
    }

    const entry: RateLimitEntry = JSON.parse(entryJson);
    const config = this.getRateLimitConfig(sourceId);
    
    return Math.min(
      config.requestsPerHour - entry.hourlyCount,
      config.requestsPerDay - entry.dailyCount
    );
  }

  async getResetTime(sourceId: string): Promise<Date> {
    if (!this.env.CACHE) {
      return new Date(Date.now() + 3600000); // 1 hour from now
    }

    const key = `${this.keyPrefix}${sourceId}`;
    const entryJson = await this.env.CACHE.get(key);
    
    if (!entryJson) {
      return new Date(Date.now() + 1000); // 1 second from now
    }

    const entry: RateLimitEntry = JSON.parse(entryJson);
    const now = Date.now();
    
    // Return the earliest reset time
    const nextHourReset = entry.lastHourReset + 3600000;
    const nextDayReset = entry.lastDayReset + 86400000;
    const nextSecondReset = entry.lastRequest + 1000;
    
    return new Date(Math.min(nextHourReset, nextDayReset, nextSecondReset));
  }

  private getRateLimitConfig(sourceId: string): { requestsPerSecond: number; requestsPerHour: number; requestsPerDay: number } {
    // Default rate limits - can be configured per source
    const configs: Record<string, any> = {
      'world-bank': { requestsPerSecond: 5, requestsPerHour: 1000, requestsPerDay: 10000 },
      'nasa-power': { requestsPerSecond: 2, requestsPerHour: 500, requestsPerDay: 5000 },
      'openstreetmap': { requestsPerSecond: 1, requestsPerHour: 300, requestsPerDay: 1000 },
      'irena': { requestsPerSecond: 1, requestsPerHour: 100, requestsPerDay: 500 },
      'iea': { requestsPerSecond: 1, requestsPerHour: 100, requestsPerDay: 500 }
    };

    return configs[sourceId] || { requestsPerSecond: 1, requestsPerHour: 100, requestsPerDay: 1000 };
  }
}